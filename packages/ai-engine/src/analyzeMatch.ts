import Anthropic from "@anthropic-ai/sdk";
import { aiAnalysisResultSchema, type AIAnalysisResult, type MatchContext } from "@veyrapro/domain";
import { buildMatchAnalysisPrompt } from "./prompt";
import { matchAnalysisTool } from "./tool-schema";

export interface AnalyzeMatchOptions {
  anthropic?: Anthropic;
  model?: string;
  language?: string;
  maxTokens?: number;
}

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

let sharedClient: Anthropic | undefined;
function getClient(provided?: Anthropic): Anthropic {
  if (provided) return provided;
  if (!sharedClient) sharedClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return sharedClient;
}

/**
 * Sends one match's full data bundle to Claude and returns a validated,
 * structured primary/secondary pick. Throws if the model fails to return
 * a schema-conformant tool call after retries.
 */
export async function analyzeMatch(ctx: MatchContext, options: AnalyzeMatchOptions = {}): Promise<AIAnalysisResult> {
  const client = getClient(options.anthropic);
  const model = options.model ?? DEFAULT_MODEL;
  const language = options.language ?? process.env.ANALYSIS_LANGUAGE ?? "română";

  const message = await client.messages.create({
    model,
    max_tokens: options.maxTokens ?? 2000,
    temperature: 0.2,
    system:
      "Ești un motor de analiză predictivă pentru pariuri sportive, riguros și conservator. " +
      "Folosești exclusiv datele furnizate. Nu oferi niciodată garanții de câștig.",
    tools: [matchAnalysisTool],
    tool_choice: { type: "tool", name: matchAnalysisTool.name },
    messages: [{ role: "user", content: buildMatchAnalysisPrompt(ctx, language) }],
  });

  const toolUse = message.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
  if (!toolUse) {
    throw new Error(`AI analysis for match ${ctx.matchId} did not return a tool_use block`);
  }

  const parsed = aiAnalysisResultSchema.safeParse({
    matchId: ctx.matchId,
    modelUsed: model,
    generatedAt: new Date().toISOString(),
    ...(toolUse.input as object),
  });

  if (!parsed.success) {
    throw new Error(`AI analysis for match ${ctx.matchId} failed schema validation: ${parsed.error.message}`);
  }

  return parsed.data;
}

/**
 * Analyzes many matches concurrently with a bounded worker pool so a large
 * slate of fixtures doesn't blow past API rate limits.
 */
export async function analyzeMatchesInParallel(
  contexts: MatchContext[],
  options: AnalyzeMatchOptions & { concurrency?: number } = {},
): Promise<{ matchId: string; result?: AIAnalysisResult; error?: string }[]> {
  const concurrency = options.concurrency ?? 5;
  const results: { matchId: string; result?: AIAnalysisResult; error?: string }[] = new Array(contexts.length);

  let cursor = 0;
  async function worker() {
    while (cursor < contexts.length) {
      const index = cursor++;
      const ctx = contexts[index]!;
      try {
        results[index] = { matchId: ctx.matchId, result: await analyzeMatch(ctx, options) };
      } catch (err) {
        results[index] = { matchId: ctx.matchId, error: err instanceof Error ? err.message : String(err) };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, contexts.length) }, worker));
  return results;
}
