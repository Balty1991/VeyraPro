import type { OddsMarket, PerformanceRecord, PerformanceSummary } from "./index";

/**
 * Pure grading logic — no DB/network dependency — so both the settlement
 * worker and the web app's read paths derive results the same way.
 *
 * `selection` conventions per market:
 *  - 1x2 / draw_no_bet: "home" | "draw" | "away"
 *  - over_under_*:      "over" | "under"
 *  - btts:               "yes" | "no"
 *  - double_chance:      "home_draw" | "home_away" | "draw_away"
 */
export function gradeMarketSelection(
  market: OddsMarket,
  selection: string,
  finalScoreHome: number,
  finalScoreAway: number,
): "won" | "lost" | "void" {
  const totalGoals = finalScoreHome + finalScoreAway;
  const winner: "home" | "draw" | "away" = finalScoreHome === finalScoreAway ? "draw" : finalScoreHome > finalScoreAway ? "home" : "away";

  switch (market) {
    case "1x2":
      return selection === winner ? "won" : "lost";

    case "draw_no_bet":
      if (winner === "draw") return "void";
      return selection === winner ? "won" : "lost";

    case "double_chance": {
      const covers =
        (selection === "home_draw" && winner !== "away") ||
        (selection === "home_away" && winner !== "draw") ||
        (selection === "draw_away" && winner !== "home");
      return covers ? "won" : "lost";
    }

    case "over_under_15":
    case "over_under_25":
    case "over_under_35": {
      const line = Number(market.split("_")[2]) / 10; // "over_under_25" -> 2.5
      const isOver = totalGoals > line;
      return selection === "over" ? (isOver ? "won" : "lost") : isOver ? "lost" : "won";
    }

    case "btts": {
      const bothScored = finalScoreHome > 0 && finalScoreAway > 0;
      return selection === "yes" ? (bothScored ? "won" : "lost") : bothScored ? "lost" : "won";
    }

    default:
      return "void";
  }
}

/** Flat 1-unit-stake ROI/hit-rate aggregation for the Performance page. */
export function summarizePerformance(records: PerformanceRecord[], periodFrom: string, periodTo: string): PerformanceSummary {
  const settled = records.filter((r) => r.actualOutcome === "won" || r.actualOutcome === "lost");
  const won = settled.filter((r) => r.actualOutcome === "won");

  const totalStaked = settled.length;
  const totalReturn = won.reduce((sum, r) => sum + r.odds, 0);
  const roiPct = totalStaked > 0 ? ((totalReturn - totalStaked) / totalStaked) * 100 : 0;
  const avgOdds = settled.length > 0 ? settled.reduce((s, r) => s + r.odds, 0) / settled.length : 0;

  const byMarket: PerformanceSummary["byMarket"] = {};
  for (const r of settled) {
    const bucket = (byMarket[r.market] ??= { total: 0, won: 0, hitRatePct: 0 });
    bucket.total += 1;
    if (r.actualOutcome === "won") bucket.won += 1;
  }
  for (const bucket of Object.values(byMarket)) {
    bucket.hitRatePct = bucket.total > 0 ? (bucket.won / bucket.total) * 100 : 0;
  }

  return {
    periodFrom,
    periodTo,
    totalPredictions: records.length,
    settled: settled.length,
    won: won.length,
    lost: settled.length - won.length,
    hitRatePct: settled.length > 0 ? (won.length / settled.length) * 100 : 0,
    avgOdds,
    roiPct,
    byMarket,
  };
}
