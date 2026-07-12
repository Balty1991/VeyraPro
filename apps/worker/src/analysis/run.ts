import "dotenv/config";
import { analyzeQueuedMatches } from "./analyzeQueuedMatches.js";

analyzeQueuedMatches({ concurrency: Number(process.env.AI_ANALYSIS_CONCURRENCY ?? 5) })
  .then((result) => {
    console.log("Analysis result:", result);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Analysis failed:", err);
    process.exit(1);
  });
