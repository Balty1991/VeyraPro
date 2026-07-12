import { prisma } from "@veyrapro/database";
import { summarizePerformance, type AIPick } from "@veyrapro/domain";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getDashboardStats() {
  const since = new Date(Date.now() - 30 * DAY_MS);
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));

  const [analyzedToday, pendingPredictions, recentRecords] = await Promise.all([
    prisma.aIAnalysis.count({ where: { generatedAt: { gte: startOfToday } } }),
    prisma.performanceRecord.count({ where: { actualOutcome: "PENDING" } }),
    prisma.performanceRecord.findMany({ where: { settledAt: { gte: since } } }),
  ]);

  const summary = summarizePerformance(
    recentRecords.map((r) => ({
      id: r.id,
      matchId: r.matchId,
      pickType: r.pickType.toLowerCase() as "primary" | "secondary",
      market: r.market as never,
      selection: r.selection,
      odds: r.odds,
      confidence: r.confidence,
      actualOutcome: r.actualOutcome.toLowerCase() as never,
      settledAt: r.settledAt?.toISOString(),
    })),
    since.toISOString(),
    new Date().toISOString(),
  );

  return { analyzedToday, pendingPredictions, hitRatePct30d: summary.hitRatePct, roiPct30d: summary.roiPct, settled30d: summary.settled };
}

export async function getTopPredictions(limit = 6) {
  const rows = await prisma.aIAnalysis.findMany({
    where: { match: { status: "NOTSTARTED" } },
    include: { match: { include: { homeTeam: true, awayTeam: true, league: true } } },
    orderBy: [{ dataQualityScore: "desc" }],
    take: 50,
  });

  return rows
    .map((row) => ({
      matchId: row.matchId,
      league: row.match.league.name,
      homeTeam: row.match.homeTeam.name,
      awayTeam: row.match.awayTeam.name,
      kickoffAt: row.match.kickoffAt.toISOString(),
      pick: row.primaryPick as unknown as AIPick,
      dataQualityScore: row.dataQualityScore,
    }))
    .sort((a, b) => b.pick.confidence - a.pick.confidence)
    .slice(0, limit);
}

export async function getTopRecommendations(limit = 5) {
  const tickets = await prisma.accumulatorTicket.findMany({
    where: { status: "PENDING" },
    include: { legs: { include: { match: { include: { homeTeam: true, awayTeam: true } } } } },
    orderBy: { score: "desc" },
    take: limit,
  });

  return tickets.map((t) => ({
    id: t.id,
    combinedOdds: t.combinedOdds,
    averageConfidence: t.averageConfidence,
    legCount: t.legs.length,
    legs: t.legs.map((leg) => ({
      match: `${leg.match.homeTeam.name} - ${leg.match.awayTeam.name}`,
      market: leg.market,
      selection: leg.selection,
      odds: leg.odds,
    })),
  }));
}

export interface MatchFilters {
  dateFrom?: string;
  dateTo?: string;
  market?: string;
  minConfidence?: number;
  minEdge?: number;
}

export async function getAnalyzedMatches(filters: MatchFilters = {}) {
  const rows = await prisma.match.findMany({
    where: {
      status: "NOTSTARTED",
      aiAnalysis: { isNot: null },
      ...(filters.dateFrom || filters.dateTo
        ? { kickoffAt: { gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined, lte: filters.dateTo ? new Date(filters.dateTo) : undefined } }
        : {}),
    },
    include: { homeTeam: true, awayTeam: true, league: true, aiAnalysis: true },
    orderBy: { kickoffAt: "asc" },
    take: 200,
  });

  return rows
    .map((row) => ({
      matchId: row.id,
      league: row.league.name,
      homeTeam: row.homeTeam.name,
      awayTeam: row.awayTeam.name,
      kickoffAt: row.kickoffAt.toISOString(),
      primaryPick: row.aiAnalysis!.primaryPick as unknown as AIPick,
      secondaryPick: row.aiAnalysis!.secondaryPick as unknown as AIPick | null,
      dataQualityScore: row.aiAnalysis!.dataQualityScore,
    }))
    .filter((m) => {
      if (filters.market && m.primaryPick.market !== filters.market) return false;
      if (filters.minConfidence && m.primaryPick.confidence < filters.minConfidence) return false;
      if (filters.minEdge && m.primaryPick.edge < filters.minEdge) return false;
      return true;
    });
}

export async function getPerformanceSummaryAndTrend(days = 30) {
  const since = new Date(Date.now() - days * DAY_MS);
  const records = await prisma.performanceRecord.findMany({ where: { settledAt: { gte: since } } });

  const mapped = records.map((r) => ({
    id: r.id,
    matchId: r.matchId,
    pickType: r.pickType.toLowerCase() as "primary" | "secondary",
    market: r.market as never,
    selection: r.selection,
    odds: r.odds,
    confidence: r.confidence,
    actualOutcome: r.actualOutcome.toLowerCase() as never,
    settledAt: r.settledAt?.toISOString(),
  }));

  const summary = summarizePerformance(mapped, since.toISOString(), new Date().toISOString());

  const byDay = new Map<string, { won: number; total: number }>();
  for (const r of records) {
    if (!r.settledAt || r.actualOutcome === "VOID" || r.actualOutcome === "PENDING") continue;
    const day = r.settledAt.toISOString().slice(0, 10);
    const bucket = byDay.get(day) ?? { won: 0, total: 0 };
    bucket.total += 1;
    if (r.actualOutcome === "WON") bucket.won += 1;
    byDay.set(day, bucket);
  }

  const trend = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { won, total }]) => ({ date, hitRatePct: total > 0 ? (won / total) * 100 : 0, total }));

  return { summary, trend };
}
