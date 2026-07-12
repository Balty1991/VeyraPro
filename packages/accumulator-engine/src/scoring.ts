import type { AccumulatorLeg } from "@veyrapro/domain";

/**
 * Ranks candidate tickets. Confidence is squared so the ranking strongly
 * favors combinations built from the AI's highest-conviction picks — for
 * an accumulator, one weak leg sinks the whole ticket, so average
 * confidence matters more than raw combined odds.
 */
export function scoreTicket(legs: AccumulatorLeg[], combinedOdds: number, averageConfidence: number): number {
  const leagueDiversity = new Set(legs.map((l) => l.league)).size / legs.length;
  return combinedOdds * averageConfidence ** 2 * (0.85 + 0.15 * leagueDiversity);
}
