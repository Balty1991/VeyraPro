import type {
  FormGuide,
  H2HRecord,
  MarketOddsSnapshot,
  MatchContext,
  NativeMLPrediction,
  OddsMarket,
  RecentResult,
} from "@veyrapro/domain";
import { ODDS_MARKETS } from "@veyrapro/domain";
import type {
  RawEvent,
  RawFormGuide,
  RawH2H,
  RawMLPrediction,
  RawOddsMarket,
  RawRecentResult,
} from "./raw-types";

function mapRecent(r: RawRecentResult): RecentResult {
  return {
    date: r.date,
    opponent: r.opponent,
    venue: r.venue,
    goalsFor: r.goals_for,
    goalsAgainst: r.goals_against,
    result: r.result,
  };
}

export function mapFormGuide(raw: RawFormGuide): FormGuide {
  return {
    teamId: String(raw.team_id),
    matchesConsidered: raw.matches_considered,
    wins: raw.wins,
    draws: raw.draws,
    losses: raw.losses,
    goalsFor: raw.goals_for,
    goalsAgainst: raw.goals_against,
    avgXgFor: raw.avg_xg_for,
    avgXgAgainst: raw.avg_xg_against,
    streak: raw.streak,
    recent: raw.recent.map(mapRecent),
  };
}

export function mapH2H(raw: RawH2H): H2HRecord {
  const total = raw.total_meetings || 1;
  return {
    totalMeetings: raw.total_meetings,
    homeTeamWins: raw.home_team_wins,
    awayTeamWins: raw.away_team_wins,
    draws: raw.draws,
    homeTeamWinRate: raw.home_team_wins / total,
    awayTeamWinRate: raw.away_team_wins / total,
    avgTotalGoals: raw.avg_total_goals,
    recent: raw.recent.map(mapRecent),
  };
}

function isKnownMarket(market: string): market is OddsMarket {
  return (ODDS_MARKETS as readonly string[]).includes(market);
}

export function mapOddsMarket(raw: RawOddsMarket): MarketOddsSnapshot | null {
  if (!isKnownMarket(raw.market)) return null;

  const bestByOutcome: MarketOddsSnapshot["bestByOutcome"] = {};
  for (const row of raw.rows) {
    const current = bestByOutcome[row.outcome];
    if (!current || row.decimal_odds > current.decimalOdds) {
      bestByOutcome[row.outcome] = { bookmaker: row.bookmaker, decimalOdds: row.decimal_odds };
    }
  }

  return {
    market: raw.market,
    capturedAt: raw.captured_at,
    rows: raw.rows.map((r) => ({
      bookmaker: r.bookmaker,
      outcome: r.outcome,
      decimalOdds: r.decimal_odds,
      previousDecimalOdds: r.previous_decimal_odds,
      impliedProbability: r.implied_probability,
      isMaxQuote: r.is_max_quote,
      movement: r.movement,
    })),
    bestByOutcome,
  };
}

export function mapMLPrediction(raw: RawMLPrediction): NativeMLPrediction {
  const overUnder: NativeMLPrediction["overUnder"] = {};
  for (const [line, probs] of Object.entries(raw.over_under ?? {})) {
    if (line === "1.5" || line === "2.5" || line === "3.5") {
      overUnder[line] = { overProbability: probs.over_probability, underProbability: probs.under_probability };
    }
  }

  return {
    model: raw.model,
    homeWinProbability: raw.home_win_probability,
    drawProbability: raw.draw_probability,
    awayWinProbability: raw.away_win_probability,
    expectedGoalsHome: raw.expected_goals_home,
    expectedGoalsAway: raw.expected_goals_away,
    bttsYesProbability: raw.btts_yes_probability,
    overUnder,
    recommendedBets: (raw.recommended_bets ?? [])
      .filter((b) => isKnownMarket(b.market))
      .map((b) => ({ market: b.market as OddsMarket, selection: b.selection, confidence: b.confidence })),
    confidence: raw.confidence,
  };
}

export interface MatchContextParts {
  event: RawEvent;
  h2h?: RawH2H;
  homeForm?: RawFormGuide;
  awayForm?: RawFormGuide;
  oddsMarkets: RawOddsMarket[];
  mlPrediction?: RawMLPrediction;
}

export function buildMatchContext(parts: MatchContextParts): MatchContext {
  const { event } = parts;

  return {
    matchId: String(event.id),
    externalEventId: event.id,
    league: {
      id: String(event.league.id),
      externalId: event.league.id,
      name: event.league.name,
      country: event.league.country,
    },
    kickoffAt: event.kickoff_at,
    status: event.status,
    homeTeam: { id: String(event.home_team.id), externalId: event.home_team.id, name: event.home_team.name, country: event.home_team.country, logoUrl: event.home_team.logo },
    awayTeam: { id: String(event.away_team.id), externalId: event.away_team.id, name: event.away_team.name, country: event.away_team.country, logoUrl: event.away_team.logo },
    venue: event.venue
      ? { id: String(event.venue.id), externalId: event.venue.id, name: event.venue.name, city: event.venue.city, country: event.venue.country, capacity: event.venue.capacity }
      : undefined,
    referee: event.referee
      ? {
          id: String(event.referee.id),
          externalId: event.referee.id,
          name: event.referee.name,
          avgCardsPerGame: event.referee.avg_cards_per_game,
          avgFoulsPerGame: event.referee.avg_fouls_per_game,
          avgGoalsPerGame: event.referee.avg_goals_per_game,
        }
      : undefined,
    homeCoach: event.home_manager
      ? {
          id: String(event.home_manager.id),
          externalId: event.home_manager.id,
          name: event.home_manager.name,
          preferredFormation: event.home_manager.preferred_formation,
          pressingIntensity: event.home_manager.pressing_intensity,
          defensiveLine: event.home_manager.defensive_line,
          tacticalStyles: event.home_manager.tactical_styles,
          winRate: event.home_manager.win_rate,
          avgGoalsFor: event.home_manager.avg_goals_for,
          avgXgFor: event.home_manager.avg_xg_for,
        }
      : undefined,
    awayCoach: event.away_manager
      ? {
          id: String(event.away_manager.id),
          externalId: event.away_manager.id,
          name: event.away_manager.name,
          preferredFormation: event.away_manager.preferred_formation,
          pressingIntensity: event.away_manager.pressing_intensity,
          defensiveLine: event.away_manager.defensive_line,
          tacticalStyles: event.away_manager.tactical_styles,
          winRate: event.away_manager.win_rate,
          avgGoalsFor: event.away_manager.avg_goals_for,
          avgXgFor: event.away_manager.avg_xg_for,
        }
      : undefined,
    weather: event.weather
      ? {
          temperatureC: event.weather.temperature_c,
          condition: event.weather.condition,
          windSpeedKph: event.weather.wind_speed_kph,
          humidityPct: event.weather.humidity_pct,
          precipitationProbabilityPct: event.weather.precipitation_probability_pct,
        }
      : undefined,
    homeForm: parts.homeForm ? mapFormGuide(parts.homeForm) : undefined,
    awayForm: parts.awayForm ? mapFormGuide(parts.awayForm) : undefined,
    h2h: parts.h2h ? mapH2H(parts.h2h) : undefined,
    odds: parts.oddsMarkets.map(mapOddsMarket).filter((m): m is MarketOddsSnapshot => m !== null),
    nativeMlPrediction: parts.mlPrediction ? mapMLPrediction(parts.mlPrediction) : undefined,
    finalScore: event.final_score,
  };
}
