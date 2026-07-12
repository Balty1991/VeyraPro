import { z } from "zod";

export * from "./grading";

/**
 * Shared domain model for VeyraPro. This is the contract between the sports
 * data provider, the AI analysis engine, the database, the worker pipelines
 * and the web app. Everything downstream is typed against this file.
 */

// ---------------------------------------------------------------------------
// Core reference entities
// ---------------------------------------------------------------------------

export interface LeagueRef {
  id: string;
  externalId: number;
  name: string;
  country: string;
}

export interface TeamRef {
  id: string;
  externalId: number;
  name: string;
  country?: string;
  logoUrl?: string;
}

export interface VenueRef {
  id: string;
  externalId: number;
  name: string;
  city?: string;
  country?: string;
  capacity?: number;
}

export interface RefereeRef {
  id: string;
  externalId: number;
  name: string;
  avgCardsPerGame?: number;
  avgFoulsPerGame?: number;
  avgGoalsPerGame?: number;
}

export interface CoachProfile {
  id: string;
  externalId: number;
  name: string;
  preferredFormation?: string;
  pressingIntensity?: number; // 0-1
  defensiveLine?: "low" | "mid" | "high";
  tacticalStyles?: string[]; // ranked
  winRate?: number;
  avgGoalsFor?: number;
  avgXgFor?: number;
}

// ---------------------------------------------------------------------------
// Context data — everything the provider gives us for one fixture
// ---------------------------------------------------------------------------

export interface WeatherConditions {
  temperatureC?: number;
  condition?: string; // e.g. "clear", "rain", "snow", "windy"
  windSpeedKph?: number;
  humidityPct?: number;
  precipitationProbabilityPct?: number;
}

export interface RecentResult {
  date: string; // ISO
  opponent: string;
  venue: "home" | "away" | "neutral";
  goalsFor: number;
  goalsAgainst: number;
  result: "W" | "D" | "L";
}

export interface FormGuide {
  teamId: string;
  matchesConsidered: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  avgXgFor?: number;
  avgXgAgainst?: number;
  streak: string; // e.g. "WWDLW", most recent last
  recent: RecentResult[];
}

export interface H2HRecord {
  totalMeetings: number;
  homeTeamWins: number;
  awayTeamWins: number;
  draws: number;
  homeTeamWinRate: number;
  awayTeamWinRate: number;
  avgTotalGoals: number;
  recent: RecentResult[];
}

export const ODDS_MARKETS = [
  "1x2",
  "over_under_15",
  "over_under_25",
  "over_under_35",
  "btts",
  "double_chance",
  "draw_no_bet",
] as const;
export type OddsMarket = (typeof ODDS_MARKETS)[number];

export type OddsMovement = "SHORTENING" | "DRIFTING" | "";

export interface BookmakerOddsRow {
  bookmaker: string;
  outcome: string; // e.g. "home" | "draw" | "away" | "over" | "under" | "yes" | "no"
  decimalOdds: number;
  previousDecimalOdds?: number;
  impliedProbability: number;
  isMaxQuote: boolean;
  movement: OddsMovement;
}

export interface MarketOddsSnapshot {
  market: OddsMarket;
  capturedAt: string; // ISO
  rows: BookmakerOddsRow[];
  bestByOutcome: Record<string, { bookmaker: string; decimalOdds: number }>;
}

/** Native ML prediction produced by the sports-data provider (not our AI). */
export interface NativeMLPrediction {
  model: string; // e.g. "catboost-v3"
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  expectedGoalsHome: number;
  expectedGoalsAway: number;
  bttsYesProbability?: number;
  overUnder?: Partial<Record<"1.5" | "2.5" | "3.5", { overProbability: number; underProbability: number }>>;
  recommendedBets?: { market: OddsMarket; selection: string; confidence: number }[];
  confidence: number; // overall model confidence 0-1
}

/** Everything gathered about one fixture before it is handed to the AI engine. */
export interface MatchContext {
  matchId: string;
  externalEventId: number;
  league: LeagueRef;
  kickoffAt: string; // ISO
  status: "notstarted" | "inprogress" | "finished";
  homeTeam: TeamRef;
  awayTeam: TeamRef;
  venue?: VenueRef;
  referee?: RefereeRef;
  homeCoach?: CoachProfile;
  awayCoach?: CoachProfile;
  weather?: WeatherConditions;
  homeForm?: FormGuide;
  awayForm?: FormGuide;
  h2h?: H2HRecord;
  odds: MarketOddsSnapshot[];
  nativeMlPrediction?: NativeMLPrediction;
  finalScore?: { home: number; away: number };
}

/** Which fields are mandatory for a match to be eligible for AI analysis. */
export function hasCompleteStats(ctx: MatchContext): boolean {
  const hasH2h = !!ctx.h2h && ctx.h2h.totalMeetings >= 0;
  const hasForm = !!ctx.homeForm && !!ctx.awayForm;
  const has1x2Odds = ctx.odds.some((o) => o.market === "1x2" && o.rows.length > 0);
  const hasMl = !!ctx.nativeMlPrediction;
  return hasH2h && hasForm && has1x2Odds && hasMl;
}

// ---------------------------------------------------------------------------
// AI analysis output
// ---------------------------------------------------------------------------

export const safeAccumulatorOddsRange = { min: 1.2, max: 1.4 } as const;

export const aiPickSchema = z.object({
  market: z.enum(ODDS_MARKETS),
  selection: z.string().min(1),
  bookmaker: z.string().min(1),
  odds: z.number().positive(),
  impliedProbability: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  edge: z.number(), // AI probability - implied probability
  reasoning: z.string().min(1),
  accumulatorSafe: z.boolean(),
});
export type AIPick = z.infer<typeof aiPickSchema>;

export const aiAnalysisResultSchema = z.object({
  matchId: z.string(),
  modelUsed: z.string(),
  generatedAt: z.string(),
  dataQualityScore: z.number().min(0).max(1),
  primaryPick: aiPickSchema,
  secondaryPick: aiPickSchema.nullable(),
  riskNotes: z.string().optional(),
});
export type AIAnalysisResult = z.infer<typeof aiAnalysisResultSchema>;

// ---------------------------------------------------------------------------
// Accumulator generator
// ---------------------------------------------------------------------------

export interface AccumulatorLeg {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoffAt: string;
  market: OddsMarket;
  selection: string;
  odds: number;
  confidence: number;
}

export interface AccumulatorTicket {
  id: string;
  legs: AccumulatorLeg[];
  combinedOdds: number;
  averageConfidence: number;
  score: number;
  generatedAt: string;
}

export interface AccumulatorConstraints {
  minLegs: number;
  maxLegs: number;
  minCombinedOdds?: number;
  maxCombinedOdds?: number;
  minLegConfidence?: number; // e.g. 0.75
  maxLegOdds?: number; // e.g. 1.4 for "safe" picks
  minLegOdds?: number; // e.g. 1.2
  maxLegsPerLeague?: number;
  maxTickets?: number;
}

// ---------------------------------------------------------------------------
// Performance tracking
// ---------------------------------------------------------------------------

export interface PerformanceRecord {
  id: string;
  matchId: string;
  pickType: "primary" | "secondary";
  market: OddsMarket;
  selection: string;
  odds: number;
  confidence: number;
  actualOutcome: "won" | "lost" | "void" | "pending";
  settledAt?: string;
}

export interface PerformanceSummary {
  periodFrom: string;
  periodTo: string;
  totalPredictions: number;
  settled: number;
  won: number;
  lost: number;
  hitRatePct: number;
  avgOdds: number;
  roiPct: number;
  byMarket: Record<string, { total: number; won: number; hitRatePct: number }>;
}
