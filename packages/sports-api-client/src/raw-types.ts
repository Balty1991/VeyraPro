/**
 * Loosely-typed shapes for the sports data provider's raw JSON responses.
 *
 * The provider (referred to internally as the "Veyra sports feed") exposes
 * REST endpoints covering: fixtures/events, 1x2 + goal-line + BTTS odds
 * across ~14 bookmakers with line-movement, native ML (CatBoost) match
 * predictions, head-to-head history, team form, coach/manager tactical
 * profiles, referees, venues, and optional weather.
 *
 * These interfaces intentionally use `unknown`/optional fields wherever the
 * provider's exact contract is not pinned down — adjust field names in
 * `mapper.ts` to match the real payload once `SPORTS_API_BASE_URL` /
 * `SPORTS_API_KEY` point at a live account. Keeping the raw shapes isolated
 * here means the rest of the codebase only ever depends on the stable
 * `@veyrapro/domain` types.
 */

export interface RawTeam {
  id: number;
  name: string;
  country?: string;
  logo?: string;
}

export interface RawLeague {
  id: number;
  name: string;
  country: string;
  season_id?: number;
}

export interface RawVenue {
  id: number;
  name: string;
  city?: string;
  country?: string;
  capacity?: number;
}

export interface RawReferee {
  id: number;
  name: string;
  avg_cards_per_game?: number;
  avg_fouls_per_game?: number;
  avg_goals_per_game?: number;
}

export interface RawManager {
  id: number;
  name: string;
  preferred_formation?: string;
  pressing_intensity?: number;
  defensive_line?: "low" | "mid" | "high";
  tactical_styles?: string[];
  win_rate?: number;
  avg_goals_for?: number;
  avg_xg_for?: number;
}

export interface RawWeather {
  temperature_c?: number;
  condition?: string;
  wind_speed_kph?: number;
  humidity_pct?: number;
  precipitation_probability_pct?: number;
}

export interface RawRecentResult {
  date: string;
  opponent: string;
  venue: "home" | "away" | "neutral";
  goals_for: number;
  goals_against: number;
  result: "W" | "D" | "L";
}

export interface RawFormGuide {
  team_id: number;
  matches_considered: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  avg_xg_for?: number;
  avg_xg_against?: number;
  streak: string;
  recent: RawRecentResult[];
}

export interface RawH2H {
  total_meetings: number;
  home_team_wins: number;
  away_team_wins: number;
  draws: number;
  avg_total_goals: number;
  recent: RawRecentResult[];
}

export interface RawOddsRow {
  bookmaker: string;
  outcome: string;
  decimal_odds: number;
  previous_decimal_odds?: number;
  implied_probability: number;
  is_max_quote: boolean;
  movement: "SHORTENING" | "DRIFTING" | "";
}

export interface RawOddsMarket {
  market: string;
  captured_at: string;
  rows: RawOddsRow[];
}

export interface RawMLPrediction {
  model: string;
  home_win_probability: number;
  draw_probability: number;
  away_win_probability: number;
  expected_goals_home: number;
  expected_goals_away: number;
  btts_yes_probability?: number;
  over_under?: Record<string, { over_probability: number; under_probability: number }>;
  recommended_bets?: { market: string; selection: string; confidence: number }[];
  confidence: number;
}

export interface RawEvent {
  id: number;
  league: RawLeague;
  kickoff_at: string;
  status: "notstarted" | "inprogress" | "finished";
  home_team: RawTeam;
  away_team: RawTeam;
  venue?: RawVenue;
  referee?: RawReferee;
  home_manager?: RawManager;
  away_manager?: RawManager;
  weather?: RawWeather;
  final_score?: { home: number; away: number };
}
