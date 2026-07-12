import "dotenv/config";
import { settleFinishedMatches } from "./settleFinishedMatches.js";

settleFinishedMatches()
  .then((result) => {
    console.log("Settlement result:", result);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Settlement failed:", err);
    process.exit(1);
  });
