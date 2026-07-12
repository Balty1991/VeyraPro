import { ODDS_MARKETS } from "@veyrapro/domain";
import type Anthropic from "@anthropic-ai/sdk";

const pickJsonSchema = {
  type: "object",
  properties: {
    market: { type: "string", enum: [...ODDS_MARKETS] },
    selection: { type: "string", description: "e.g. 'home', 'away', 'draw', 'over', 'under', 'yes', 'no'" },
    bookmaker: { type: "string", description: "Bookmaker offering the odds used for this pick" },
    odds: { type: "number" },
    impliedProbability: { type: "number", description: "1 / odds" },
    confidence: { type: "number", description: "AI-estimated probability the pick wins, 0-1" },
    edge: { type: "number", description: "confidence - impliedProbability" },
    reasoning: { type: "string" },
    accumulatorSafe: { type: "boolean", description: "true if odds are in the 1.20-1.40 safe range and confidence is high" },
  },
  required: ["market", "selection", "bookmaker", "odds", "impliedProbability", "confidence", "edge", "reasoning", "accumulatorSafe"],
} as const;

/** Tool definition used to force Claude to return structured match analysis. */
export const matchAnalysisTool: Anthropic.Tool = {
  name: "submit_match_analysis",
  description: "Submit the structured analysis result for a single football match.",
  input_schema: {
    type: "object",
    properties: {
      dataQualityScore: { type: "number", description: "0-1, how complete/reliable the input data was" },
      primaryPick: pickJsonSchema,
      secondaryPick: {
        anyOf: [pickJsonSchema, { type: "null" }],
      },
      riskNotes: { type: "string" },
    },
    required: ["dataQualityScore", "primaryPick", "secondaryPick"],
  },
};
