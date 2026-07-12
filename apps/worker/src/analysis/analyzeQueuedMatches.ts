import { analyzeMatchesInParallel } from "@veyrapro/ai-engine";
import { prisma } from "@veyrapro/database";
import { logger } from "../lib/logger.js";
import { reconstructContext } from "./reconstructContext.js";

/**
 * Finds ingested matches with complete stats that have not been analyzed
 * yet, sends them to Claude in parallel, and persists the primary/secondary
 * picks as `AIAnalysis` plus pending `PerformanceRecord` rows (graded later
 * by the settlement job).
 */
export async function analyzeQueuedMatches(options: { concurrency?: number; limit?: number } = {}): Promise<{ analyzed: number; failed: number }> {
  const rows = await prisma.match.findMany({
    where: { dataComplete: true, status: "NOTSTARTED", aiAnalysis: null },
    include: { league: true, homeTeam: true, awayTeam: true, oddsSnapshots: true },
    orderBy: { kickoffAt: "asc" },
    take: options.limit ?? 100,
  });

  if (rows.length === 0) {
    logger.info("No matches queued for analysis");
    return { analyzed: 0, failed: 0 };
  }

  logger.info(`Analyzing ${rows.length} matches in parallel`, { concurrency: options.concurrency ?? 5 });
  const contexts = rows.map(reconstructContext);
  const results = await analyzeMatchesInParallel(contexts, { concurrency: options.concurrency ?? 5 });

  let analyzed = 0;
  let failed = 0;

  for (const outcome of results) {
    if (!outcome.result) {
      failed++;
      logger.error(`Analysis failed for match ${outcome.matchId}`, { error: outcome.error });
      continue;
    }

    const { result, matchId } = outcome;
    await prisma.aIAnalysis.create({
      data: {
        matchId,
        modelUsed: result.modelUsed,
        generatedAt: new Date(result.generatedAt),
        dataQualityScore: result.dataQualityScore,
        primaryPick: result.primaryPick,
        secondaryPick: result.secondaryPick ?? undefined,
        riskNotes: result.riskNotes,
      },
    });

    const picks = [
      { type: "PRIMARY" as const, pick: result.primaryPick },
      ...(result.secondaryPick ? [{ type: "SECONDARY" as const, pick: result.secondaryPick }] : []),
    ];

    await prisma.performanceRecord.createMany({
      data: picks.map(({ type, pick }) => ({
        matchId,
        pickType: type,
        market: pick.market,
        selection: pick.selection,
        odds: pick.odds,
        confidence: pick.confidence,
      })),
    });

    analyzed++;
  }

  logger.info("Analysis pass complete", { analyzed, failed });
  return { analyzed, failed };
}
