import "dotenv/config";
import { ingestUpcomingMatches } from "./ingestUpcomingMatches.js";

const leagueIds = process.env.LEAGUE_IDS?.split(",").map(Number).filter(Boolean);

ingestUpcomingMatches({ leagueIds })
  .then((result) => {
    console.log("Ingestion result:", result);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Ingestion failed:", err);
    process.exit(1);
  });
