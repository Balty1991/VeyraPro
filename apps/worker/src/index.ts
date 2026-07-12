import "dotenv/config";
import cron from "node-cron";
import { ingestUpcomingMatches } from "./ingestion/ingestUpcomingMatches.js";
import { analyzeQueuedMatches } from "./analysis/analyzeQueuedMatches.js";
import { settleFinishedMatches } from "./settlement/settleFinishedMatches.js";
import { logger } from "./lib/logger.js";

const leagueIds = process.env.LEAGUE_IDS?.split(",").map(Number).filter(Boolean);

async function runPipeline(stage: string, fn: () => Promise<unknown>) {
  try {
    logger.info(`Starting ${stage}`);
    const result = await fn();
    logger.info(`Finished ${stage}`, result as Record<string, unknown>);
  } catch (err) {
    logger.error(`${stage} crashed`, { error: String(err) });
  }
}

// Every 30 min: pull new fixtures with complete stats.
cron.schedule(process.env.INGEST_CRON ?? "*/30 * * * *", () => runPipeline("ingestion", () => ingestUpcomingMatches({ leagueIds })));

// Every 15 min: analyze anything newly ingested.
cron.schedule(process.env.ANALYSIS_CRON ?? "*/15 * * * *", () =>
  runPipeline("analysis", () => analyzeQueuedMatches({ concurrency: Number(process.env.AI_ANALYSIS_CONCURRENCY ?? 5) })),
);

// Every hour: settle matches that have finished and grade predictions.
cron.schedule(process.env.SETTLEMENT_CRON ?? "0 * * * *", () => runPipeline("settlement", () => settleFinishedMatches()));

logger.info("VeyraPro worker scheduler started", {
  ingestCron: process.env.INGEST_CRON ?? "*/30 * * * *",
  analysisCron: process.env.ANALYSIS_CRON ?? "*/15 * * * *",
  settlementCron: process.env.SETTLEMENT_CRON ?? "0 * * * *",
});

// Kick off an initial pass immediately on boot instead of waiting for the first cron tick.
void runPipeline("ingestion", () => ingestUpcomingMatches({ leagueIds }));
