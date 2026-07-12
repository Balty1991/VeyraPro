import { hasCompleteStats, type MatchContext } from "@veyrapro/domain";
import { HttpClient, type SportsApiClientOptions } from "./http";
import { buildMatchContext } from "./mapper";
import type { RawEvent, RawFormGuide, RawH2H, RawMLPrediction, RawOddsMarket } from "./raw-types";

const ODDS_MARKET_NAMES = ["1x2", "over_under_15", "over_under_25", "over_under_35", "btts", "double_chance", "draw_no_bet"] as const;

/**
 * Client for the "Veyra" sports data feed. Wraps fixtures, odds (with line
 * movement across ~14 bookmakers), native ML predictions, head-to-head
 * history, team form, coach tactical profiles, referees, venues and
 * (where available) weather — everything needed to build a full
 * `MatchContext` for AI analysis.
 */
export class SportsApiClient {
  private readonly http: HttpClient;

  constructor(options: SportsApiClientOptions = {}) {
    this.http = new HttpClient(options);
  }

  async searchUpcomingEvents(params: { leagueId?: number; dateFrom?: string; dateTo?: string } = {}): Promise<RawEvent[]> {
    const { events } = await this.http.get<{ events: RawEvent[] }>("/events/search", {
      league: params.leagueId,
      date_from: params.dateFrom,
      date_to: params.dateTo,
      status: "notstarted",
    });
    return events;
  }

  async getEvent(eventId: number): Promise<RawEvent> {
    return this.http.get<RawEvent>(`/events/${eventId}`);
  }

  async getH2H(eventId: number): Promise<RawH2H> {
    return this.http.get<RawH2H>(`/events/${eventId}/h2h`);
  }

  async getTeamForm(teamId: number): Promise<RawFormGuide> {
    return this.http.get<RawFormGuide>(`/teams/${teamId}/form`);
  }

  async getOddsMarket(eventId: number, market: (typeof ODDS_MARKET_NAMES)[number]): Promise<RawOddsMarket> {
    return this.http.get<RawOddsMarket>(`/events/${eventId}/odds`, { market });
  }

  async getAllOddsMarkets(eventId: number): Promise<RawOddsMarket[]> {
    const markets = await Promise.all(ODDS_MARKET_NAMES.map((m) => this.getOddsMarket(eventId, m).catch(() => null)));
    return markets.filter((m): m is RawOddsMarket => m !== null);
  }

  async getMlPrediction(eventId: number): Promise<RawMLPrediction> {
    return this.http.get<RawMLPrediction>(`/events/${eventId}/predictions`);
  }

  async getFinishedResult(eventId: number): Promise<{ home: number; away: number } | null> {
    const event = await this.getEvent(eventId);
    return event.final_score ?? null;
  }

  /**
   * Composes every available endpoint for one fixture into a single
   * `MatchContext`. This is the "extract absolutely everything" entry
   * point used by the ingestion worker.
   */
  async getMatchContext(eventId: number): Promise<MatchContext> {
    const event = await this.getEvent(eventId);

    const [h2h, homeForm, awayForm, oddsMarkets, mlPrediction] = await Promise.all([
      this.getH2H(eventId).catch(() => undefined),
      this.getTeamForm(event.home_team.id).catch(() => undefined),
      this.getTeamForm(event.away_team.id).catch(() => undefined),
      this.getAllOddsMarkets(eventId),
      this.getMlPrediction(eventId).catch(() => undefined),
    ]);

    return buildMatchContext({ event, h2h, homeForm, awayForm, oddsMarkets, mlPrediction });
  }

  /**
   * Fetches upcoming fixtures in the window and returns only those with
   * complete statistics (H2H, form, 1x2 odds, native ML prediction) —
   * per the requirement to only analyze matches with full data available.
   */
  async getEligibleUpcomingMatches(params: { leagueId?: number; dateFrom?: string; dateTo?: string } = {}): Promise<MatchContext[]> {
    const events = await this.searchUpcomingEvents(params);
    const contexts = await Promise.all(events.map((e) => this.getMatchContext(e.id)));
    return contexts.filter(hasCompleteStats);
  }
}
