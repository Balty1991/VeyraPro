import type { AccumulatorConstraints, AccumulatorLeg, AccumulatorTicket } from "@veyrapro/domain";
import { scoreTicket } from "./scoring";

const DEFAULT_CONSTRAINTS: Required<Pick<AccumulatorConstraints, "minLegs" | "maxLegs" | "maxTickets">> = {
  minLegs: 2,
  maxLegs: 6,
  maxTickets: 10,
};

/** Candidate pool is capped so backtracking stays fast even with hundreds of analyzed matches. */
const MAX_POOL_SIZE = 25;
/** Safety valve against pathological combinatorics (e.g. very loose constraints on a large pool). */
const MAX_SEARCH_NODES = 400_000;

function eligibleLegs(legs: AccumulatorLeg[], constraints: AccumulatorConstraints): AccumulatorLeg[] {
  return legs.filter((leg) => {
    if (constraints.minLegOdds != null && leg.odds < constraints.minLegOdds) return false;
    if (constraints.maxLegOdds != null && leg.odds > constraints.maxLegOdds) return false;
    if (constraints.minLegConfidence != null && leg.confidence < constraints.minLegConfidence) return false;
    return true;
  });
}

/**
 * Builds every viable leg combination via bounded backtracking, one leg per
 * match, respecting odds/confidence/league constraints, then returns the
 * top-scoring tickets. Since decimal odds are always > 1, combined odds
 * grow monotonically as legs are added — that lets us prune a branch the
 * moment it exceeds `maxCombinedOdds` instead of exploring it further.
 */
export function generateAccumulatorTickets(legs: AccumulatorLeg[], constraints: AccumulatorConstraints = DEFAULT_CONSTRAINTS): AccumulatorTicket[] {
  const merged = { ...DEFAULT_CONSTRAINTS, ...constraints };
  const pool = eligibleLegs(legs, merged)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_POOL_SIZE);

  const candidates: AccumulatorTicket[] = [];
  let nodesVisited = 0;

  function backtrack(startIndex: number, combo: AccumulatorLeg[], usedMatchIds: Set<string>, leagueCounts: Map<string, number>, combinedOdds: number) {
    if (nodesVisited++ > MAX_SEARCH_NODES) return;

    if (combo.length >= merged.minLegs) {
      const withinRange = (merged.minCombinedOdds == null || combinedOdds >= merged.minCombinedOdds) && (merged.maxCombinedOdds == null || combinedOdds <= merged.maxCombinedOdds);
      if (withinRange) {
        const averageConfidence = combo.reduce((s, l) => s + l.confidence, 0) / combo.length;
        candidates.push({
          id: crypto.randomUUID(),
          legs: [...combo],
          combinedOdds: Number(combinedOdds.toFixed(3)),
          averageConfidence: Number(averageConfidence.toFixed(3)),
          score: scoreTicket(combo, combinedOdds, averageConfidence),
          generatedAt: new Date().toISOString(),
        });
      }
    }

    if (combo.length >= merged.maxLegs) return;
    if (merged.maxCombinedOdds != null && combinedOdds > merged.maxCombinedOdds) return;

    for (let i = startIndex; i < pool.length; i++) {
      const leg = pool[i]!;
      if (usedMatchIds.has(leg.matchId)) continue;

      const leagueCount = leagueCounts.get(leg.league) ?? 0;
      if (merged.maxLegsPerLeague != null && leagueCount >= merged.maxLegsPerLeague) continue;

      const nextOdds = combinedOdds * leg.odds;

      usedMatchIds.add(leg.matchId);
      leagueCounts.set(leg.league, leagueCount + 1);
      combo.push(leg);

      backtrack(i + 1, combo, usedMatchIds, leagueCounts, nextOdds);

      combo.pop();
      leagueCounts.set(leg.league, leagueCount);
      usedMatchIds.delete(leg.matchId);
    }
  }

  backtrack(0, [], new Set(), new Map(), 1);

  return candidates.sort((a, b) => b.score - a.score).slice(0, merged.maxTickets);
}
