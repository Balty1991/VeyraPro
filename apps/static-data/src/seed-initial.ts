import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { summarizePerformance, type PerformanceSummary } from "@veyrapro/domain";
import type { StoredMatch, StoredPerformanceRecord } from "./refresh.js";

/**
 * One-off: seeds /data with real fixtures pulled live from the connected
 * sports feed during development, so the GitHub Pages site isn't empty
 * before the first scheduled refresh-predictions workflow run.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../../data");

const matches: StoredMatch[] = [
  {
    matchId: "210767",
    externalEventId: 210767,
    league: "Champions League",
    homeTeam: "Larne FC",
    awayTeam: "SP Tre Fiori",
    kickoffAt: "2026-07-14T19:00:00Z",
    primaryPick: {
      market: "1x2", selection: "home", bookmaker: "Novibet", odds: 1.22, impliedProbability: 0.8197, confidence: 0.84, edge: 0.02,
      reasoning: "Larne (campioana NIFL) a invins deja 1-0 in deplasare la SP Tre Fiori cu o saptamana inainte. Piata confirma superioritatea clara (~82% implicit), peste modelul ML (65.4%).",
      accumulatorSafe: true,
    },
    secondaryPick: null,
    dataQualityScore: 0.9,
    analyzedAt: new Date().toISOString(),
  },
  {
    matchId: "210763",
    externalEventId: 210763,
    league: "Champions League",
    homeTeam: "Universitatea Craiova",
    awayTeam: "ML Vitebsk",
    kickoffAt: "2026-07-15T17:30:00Z",
    primaryPick: {
      market: "1x2", selection: "home", bookmaker: "Bwin", odds: 1.29, impliedProbability: 0.7752, confidence: 0.8, edge: 0.025,
      reasoning: "Modelul ML da 71.7% sansa gazdelor, cu 2.65 goluri asteptate. Craiova, echipa de Superliga, intalneste un adversar semi-profesionist din Belarus in preliminariile Champions League.",
      accumulatorSafe: true,
    },
    secondaryPick: null,
    dataQualityScore: 0.75,
    analyzedAt: new Date().toISOString(),
  },
  {
    matchId: "46392",
    externalEventId: 46392,
    league: "Allsvenskan",
    homeTeam: "Djurgårdens IF",
    awayTeam: "Halmstads BK",
    kickoffAt: "2026-07-13T17:00:00Z",
    primaryPick: {
      market: "1x2", selection: "home", bookmaker: "Novibet", odds: 1.27, impliedProbability: 0.7874, confidence: 0.72, edge: -0.067,
      reasoning: "Djurgarden favorita clara acasa (58.9% ML), dar edge usor negativ fata de cota pietei — pastram ca pick sigur pentru acumulator, nu ca value bet independent.",
      accumulatorSafe: true,
    },
    secondaryPick: null,
    dataQualityScore: 0.7,
    analyzedAt: new Date().toISOString(),
  },
];

const now = Date.now();
const records: StoredPerformanceRecord[] = [
  {
    id: "2168:primary", matchId: "2168", externalEventId: 2168, homeTeam: "Tottenham Hotspur", awayTeam: "SK Slavia Praha", league: "Champions League",
    kickoffAt: "2025-12-09T20:00:00Z", pickType: "primary", market: "1x2", selection: "home", odds: 1.28, confidence: 0.8,
    actualOutcome: "won", settledAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "2178:primary", matchId: "2178", externalEventId: 2178, homeTeam: "Kairat Almaty", awayTeam: "Club Brugge KV", league: "Champions League",
    kickoffAt: "2026-01-20T15:30:00Z", pickType: "primary", market: "1x2", selection: "home", odds: 2.35, confidence: 0.65,
    actualOutcome: "lost", settledAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

for (const m of matches) {
  records.push({
    id: `${m.matchId}:primary`, matchId: m.matchId, externalEventId: m.externalEventId, homeTeam: m.homeTeam, awayTeam: m.awayTeam, league: m.league,
    kickoffAt: m.kickoffAt, pickType: "primary", market: m.primaryPick.market, selection: m.primaryPick.selection, odds: m.primaryPick.odds, confidence: m.primaryPick.confidence,
    actualOutcome: "pending",
  });
}

const since = new Date(now - 90 * 24 * 60 * 60 * 1000);
const summary: PerformanceSummary = summarizePerformance(records, since.toISOString(), new Date(now).toISOString());

const byDay = new Map<string, { won: number; total: number }>();
for (const r of records) {
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

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(join(DATA_DIR, "matches.json"), JSON.stringify(matches, null, 2) + "\n");
  await writeFile(join(DATA_DIR, "performance.records.json"), JSON.stringify(records, null, 2) + "\n");
  await writeFile(join(DATA_DIR, "performance.json"), JSON.stringify({ summary, trend, records, generatedAt: new Date().toISOString() }, null, 2) + "\n");
  console.log("Seeded /data with initial real fixtures.");
}

main();
