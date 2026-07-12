import { prisma, type Prisma } from "@veyrapro/database";
import type { MatchContext } from "@veyrapro/domain";
import { hasCompleteStats } from "@veyrapro/domain";
import { SportsApiClient } from "@veyrapro/sports-api-client";
import { logger } from "../lib/logger.js";

const STATUS_MAP = { notstarted: "NOTSTARTED", inprogress: "INPROGRESS", finished: "FINISHED" } as const;

/** Domain types are precise interfaces (no index signature), Prisma's Json input wants `InputJsonValue` — this boundary cast is the only place the two need to meet. */
function toJson<T>(value: T | undefined): Prisma.InputJsonValue | undefined {
  return value === undefined ? undefined : (value as unknown as Prisma.InputJsonValue);
}

async function persistMatchContext(ctx: MatchContext) {
  const league = await prisma.league.upsert({
    where: { externalId: ctx.league.externalId },
    create: { externalId: ctx.league.externalId, name: ctx.league.name, country: ctx.league.country },
    update: { name: ctx.league.name, country: ctx.league.country },
  });

  const [homeTeam, awayTeam] = await Promise.all([
    prisma.team.upsert({
      where: { externalId: ctx.homeTeam.externalId },
      create: { externalId: ctx.homeTeam.externalId, name: ctx.homeTeam.name, country: ctx.homeTeam.country, logoUrl: ctx.homeTeam.logoUrl },
      update: { name: ctx.homeTeam.name },
    }),
    prisma.team.upsert({
      where: { externalId: ctx.awayTeam.externalId },
      create: { externalId: ctx.awayTeam.externalId, name: ctx.awayTeam.name, country: ctx.awayTeam.country, logoUrl: ctx.awayTeam.logoUrl },
      update: { name: ctx.awayTeam.name },
    }),
  ]);

  const match = await prisma.match.upsert({
    where: { externalEventId: ctx.externalEventId },
    create: {
      externalEventId: ctx.externalEventId,
      leagueId: league.id,
      kickoffAt: new Date(ctx.kickoffAt),
      status: STATUS_MAP[ctx.status],
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      venue: toJson(ctx.venue),
      referee: toJson(ctx.referee),
      homeCoach: toJson(ctx.homeCoach),
      awayCoach: toJson(ctx.awayCoach),
      weather: toJson(ctx.weather),
      homeForm: toJson(ctx.homeForm),
      awayForm: toJson(ctx.awayForm),
      h2h: toJson(ctx.h2h),
      nativeMlPrediction: toJson(ctx.nativeMlPrediction),
      dataComplete: hasCompleteStats(ctx),
    },
    update: {
      status: STATUS_MAP[ctx.status],
      homeForm: toJson(ctx.homeForm),
      awayForm: toJson(ctx.awayForm),
      h2h: toJson(ctx.h2h),
      nativeMlPrediction: toJson(ctx.nativeMlPrediction),
      weather: toJson(ctx.weather),
      dataComplete: hasCompleteStats(ctx),
    },
  });

  await Promise.all(
    ctx.odds.map((snapshot) =>
      prisma.oddsSnapshot.create({
        data: {
          matchId: match.id,
          market: snapshot.market,
          capturedAt: new Date(snapshot.capturedAt),
          rows: toJson(snapshot.rows)!,
          bestByOutcome: toJson(snapshot.bestByOutcome)!,
        },
      }),
    ),
  );

  return match;
}

export interface IngestOptions {
  leagueIds?: number[];
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Pulls upcoming fixtures from the sports feed, keeps only matches with
 * complete statistics (H2H, form, 1x2 odds, native ML prediction), and
 * upserts them + their odds snapshots into the database so the analysis
 * stage can pick them up.
 */
export async function ingestUpcomingMatches(options: IngestOptions = {}): Promise<{ ingested: number; skippedIncomplete: number }> {
  const client = new SportsApiClient();
  const leagueIds = options.leagueIds ?? [];
  const targets = leagueIds.length > 0 ? leagueIds : [undefined];

  let ingested = 0;
  let skippedIncomplete = 0;

  for (const leagueId of targets) {
    const events = await client.searchUpcomingEvents({ leagueId, dateFrom: options.dateFrom, dateTo: options.dateTo });
    logger.info(`Found ${events.length} upcoming events`, { leagueId });

    for (const event of events) {
      try {
        const ctx = await client.getMatchContext(event.id);
        if (!hasCompleteStats(ctx)) {
          skippedIncomplete++;
          continue;
        }
        await persistMatchContext(ctx);
        ingested++;
      } catch (err) {
        logger.error(`Failed to ingest event ${event.id}`, { error: String(err) });
      }
    }
  }

  logger.info("Ingestion complete", { ingested, skippedIncomplete });
  return { ingested, skippedIncomplete };
}
