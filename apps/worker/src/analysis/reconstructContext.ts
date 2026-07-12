import type { Match, OddsSnapshot, Team, League } from "@veyrapro/database";
import type { MarketOddsSnapshot, MatchContext } from "@veyrapro/domain";

type MatchWithRelations = Match & { league: League; homeTeam: Team; awayTeam: Team; oddsSnapshots: OddsSnapshot[] };

/** Inverse of ingestion's `toJson` — Prisma's `JsonValue` union and our precise domain interfaces never structurally overlap, so this is the one place that bridges them. */
function fromJson<T>(value: unknown): T | undefined {
  return value == null ? undefined : (value as T);
}

/** Rebuilds a `MatchContext` from persisted rows — the inverse of ingestion's `persistMatchContext`. */
export function reconstructContext(row: MatchWithRelations): MatchContext {
  // Keep only the most recent snapshot per market for the analysis prompt.
  const latestByMarket = new Map<string, OddsSnapshot>();
  for (const snap of row.oddsSnapshots) {
    const existing = latestByMarket.get(snap.market);
    if (!existing || snap.capturedAt > existing.capturedAt) latestByMarket.set(snap.market, snap);
  }

  const odds: MarketOddsSnapshot[] = Array.from(latestByMarket.values()).map((snap) => ({
    market: snap.market as MarketOddsSnapshot["market"],
    capturedAt: snap.capturedAt.toISOString(),
    rows: fromJson<MarketOddsSnapshot["rows"]>(snap.rows) ?? [],
    bestByOutcome: fromJson<MarketOddsSnapshot["bestByOutcome"]>(snap.bestByOutcome) ?? {},
  }));

  return {
    matchId: row.id,
    externalEventId: row.externalEventId,
    league: { id: row.league.id, externalId: row.league.externalId, name: row.league.name, country: row.league.country },
    kickoffAt: row.kickoffAt.toISOString(),
    status: row.status.toLowerCase() as MatchContext["status"],
    homeTeam: { id: row.homeTeam.id, externalId: row.homeTeam.externalId, name: row.homeTeam.name, country: row.homeTeam.country ?? undefined, logoUrl: row.homeTeam.logoUrl ?? undefined },
    awayTeam: { id: row.awayTeam.id, externalId: row.awayTeam.externalId, name: row.awayTeam.name, country: row.awayTeam.country ?? undefined, logoUrl: row.awayTeam.logoUrl ?? undefined },
    venue: fromJson<MatchContext["venue"]>(row.venue),
    referee: fromJson<MatchContext["referee"]>(row.referee),
    homeCoach: fromJson<MatchContext["homeCoach"]>(row.homeCoach),
    awayCoach: fromJson<MatchContext["awayCoach"]>(row.awayCoach),
    weather: fromJson<MatchContext["weather"]>(row.weather),
    homeForm: fromJson<MatchContext["homeForm"]>(row.homeForm),
    awayForm: fromJson<MatchContext["awayForm"]>(row.awayForm),
    h2h: fromJson<MatchContext["h2h"]>(row.h2h),
    odds,
    nativeMlPrediction: fromJson<MatchContext["nativeMlPrediction"]>(row.nativeMlPrediction),
    finalScore: row.finalScoreHome != null && row.finalScoreAway != null ? { home: row.finalScoreHome, away: row.finalScoreAway } : undefined,
  };
}
