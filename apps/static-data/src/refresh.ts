import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeMatchesInParallel } from "@veyrapro/ai-engine";
import { gradeMarketSelection, hasCompleteStats, summarizePerformance, type AIPick, type MatchContext, type OddsMarket, type PerformanceRecord, type PerformanceSummary } from "@veyrapro/domain";
import { SportsApiClient } from "@veyrapro/sports-api-client";

/**
 * "Git as a database" refresh job — runs on a GitHub Actions schedule.
 * Reads/writes JSON files under /data at the repo root, which GitHub Pages
 * then serves as static files for the client-side dashboard in index.html.
 * No server, no Postgres — the repo itself is the datastore.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../../data");

export interface StoredMatch {
  matchId: string;
  externalEventId: number;
  league: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  primaryPick: AIPick;
  secondaryPick: AIPick | null;
  dataQualityScore: number;
  analyzedAt: string;
}

export interface StoredPerformanceRecord extends PerformanceRecord {
  externalEventId: number;
  kickoffAt: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function toStoredMatch(ctx: MatchContext, pick: { primaryPick: AIPick; secondaryPick: AIPick | null; dataQualityScore: number }): StoredMatch {
  return {
    matchId: ctx.matchId,
    externalEventId: ctx.externalEventId,
    league: ctx.league.name,
    homeTeam: ctx.homeTeam.name,
    awayTeam: ctx.awayTeam.name,
    kickoffAt: ctx.kickoffAt,
    primaryPick: pick.primaryPick,
    secondaryPick: pick.secondaryPick,
    dataQualityScore: pick.dataQualityScore,
    analyzedAt: new Date().toISOString(),
  };
}

async function main() {
  const client = new SportsApiClient();
  const now = Date.now();

  const matchesPath = join(DATA_DIR, "matches.json");
  const performancePath = join(DATA_DIR, "performance.json");

  const existingMatches = await readJson<StoredMatch[]>(matchesPath, []);
  const existingRecords = await readJson<StoredPerformanceRecord[]>(performancePath.replace(".json", ".records.json"), []);

  // 1) Settle any pending records whose match kicked off 2h+ ago.
  const settledRecords: StoredPerformanceRecord[] = [];
  for (const record of existingRecords) {
    if (record.actualOutcome !== "pending" || new Date(record.kickoffAt).getTime() > now - 2 * 60 * 60 * 1000) {
      settledRecords.push(record);
      continue;
    }
    const finalScore = await client.getFinishedResult(record.externalEventId).catch(() => null);
    if (!finalScore) {
      settledRecords.push(record); // not finished yet per provider — retry next run
      continue;
    }
    const outcome = gradeMarketSelection(record.market, record.selection, finalScore.home, finalScore.away);
    settledRecords.push({ ...record, actualOutcome: outcome, settledAt: new Date().toISOString() });
  }

  // 2) Drop matches that have already kicked off from the live list; keep already-analyzed
  //    upcoming ones as-is (no re-spend on the AI) and analyze newly eligible ones.
  const stillUpcoming = existingMatches.filter((m) => new Date(m.kickoffAt).getTime() > now);
  const analyzedIds = new Set(stillUpcoming.map((m) => m.externalEventId));

  const eligible = await client.getEligibleUpcomingMatches({ dateFrom: new Date(now).toISOString(), dateTo: new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString() });
  const toAnalyze = eligible.filter((ctx) => hasCompleteStats(ctx) && !analyzedIds.has(ctx.externalEventId));

  console.log(`Matches still tracked: ${stillUpcoming.length}, newly eligible for analysis: ${toAnalyze.length}`);

  const analysisResults = toAnalyze.length > 0 ? await analyzeMatchesInParallel(toAnalyze, { concurrency: 4 }) : [];

  const newlyAnalyzed: StoredMatch[] = [];
  for (const outcome of analysisResults) {
    if (!outcome.result) {
      console.error(`Analysis failed for match ${outcome.matchId}: ${outcome.error}`);
      continue;
    }
    const ctx = toAnalyze.find((c) => c.matchId === outcome.matchId)!;
    newlyAnalyzed.push(toStoredMatch(ctx, outcome.result));
  }

  const liveMatches = [...stillUpcoming, ...newlyAnalyzed].sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt));

  // 3) Track new pending performance records for anything newly analyzed.
  const existingRecordKeys = new Set(settledRecords.map((r) => `${r.matchId}:${r.pickType}`));
  for (const m of newlyAnalyzed) {
    const picks: { type: "primary" | "secondary"; pick: AIPick }[] = [
      { type: "primary", pick: m.primaryPick },
      ...(m.secondaryPick ? [{ type: "secondary" as const, pick: m.secondaryPick }] : []),
    ];
    for (const { type, pick } of picks) {
      const key = `${m.matchId}:${type}`;
      if (existingRecordKeys.has(key)) continue;
      settledRecords.push({
        id: key,
        matchId: m.matchId,
        externalEventId: m.externalEventId,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        league: m.league,
        kickoffAt: m.kickoffAt,
        pickType: type,
        market: pick.market,
        selection: pick.selection,
        odds: pick.odds,
        confidence: pick.confidence,
        actualOutcome: "pending",
      });
    }
  }

  // 4) Compute summary + trend over the last 90 days for the dashboard.
  const since = new Date(now - 90 * 24 * 60 * 60 * 1000);
  const summary: PerformanceSummary = summarizePerformance(settledRecords, since.toISOString(), new Date(now).toISOString());

  const byDay = new Map<string, { won: number; total: number }>();
  for (const r of settledRecords) {
    if (!r.settledAt || r.actualOutcome === "void" || r.actualOutcome === "pending") continue;
    const day = r.settledAt.slice(0, 10);
    const bucket = byDay.get(day) ?? { won: 0, total: 0 };
    bucket.total += 1;
    if (r.actualOutcome === "won") bucket.won += 1;
    byDay.set(day, bucket);
  }
  const trend = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { won, total }]) => ({ date, hitRatePct: total > 0 ? (won / total) * 100 : 0, total }));

  await writeJson(matchesPath, liveMatches);
  await writeJson(performancePath.replace(".json", ".records.json"), settledRecords);
  await writeJson(performancePath, { summary, trend, records: settledRecords, generatedAt: new Date().toISOString() });

  console.log("Refresh complete:", { liveMatches: liveMatches.length, records: settledRecords.length, hitRatePct: summary.hitRatePct.toFixed(1) });
}

main().catch((err) => {
  console.error("Refresh failed:", err);
  process.exit(1);
});
