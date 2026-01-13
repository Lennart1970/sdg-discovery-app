import { invokeLLM } from "../_core/llm";
import {
  getPromptRegistryEntry,
  getPromptTemplateSha256,
} from "../_core/prompts/registry";

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => vars[key] ?? "");
}

/**
 * JSON Schema for Challenge Extraction structured output
 */
const CHALLENGE_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    challenges: {
      type: "array",
      description: "Extracted challenges from the document",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Concise title for the challenge (max 100 chars)",
          },
          statement: {
            type: "string",
            description: "Clear problem statement without solutions",
          },
          sdg_goals: {
            type: "string",
            description: "Relevant SDG goals (comma-separated numbers, e.g., '6,13')",
          },
          geography: {
            type: "string",
            description: "Geographic location or region",
          },
          target_groups: {
            type: "string",
            description: "Target populations or groups affected",
          },
          sectors: {
            type: "string",
            description: "Relevant sectors (e.g., 'Water', 'Agriculture')",
          },
          confidence: {
            type: "number",
            description: "Confidence score 0-100 for this extraction",
            minimum: 0,
            maximum: 100,
          },
        },
        required: ["title", "statement", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["challenges"],
  additionalProperties: false,
};

/**
 * Generate user prompt for challenge extraction (from versioned registry template)
 */
function generateUserPrompt(text: string, sourceOrg?: string, sourceUrl?: string): string {
  // Fallback is kept to avoid runtime crashes if registry.json is misconfigured.
  // Prefer using the `userTemplate` from the prompt registry entry (version controlled).
  return `Extract sustainability challenges from the following document:

${sourceOrg ? `Source Organization: ${sourceOrg}` : ""}
${sourceUrl ? `Source URL: ${sourceUrl}` : ""}

Document Text:
${text}`;
}

export interface ExtractedChallenge {
  title: string;
  statement: string;
  sdg_goals?: string;
  geography?: string;
  target_groups?: string;
  sectors?: string;
  confidence: number;
}

export interface ChallengeExtractionResult {
  challenges: ExtractedChallenge[];
}

/**
 * Extract challenges from document text
 * Uses OpenAI with structured outputs
 */
export async function extractChallenges(
  text: string,
  options: {
    sourceOrg?: string;
    sourceUrl?: string;
    model?: string;
  } = {}
): Promise<{
  result: ChallengeExtractionResult;
  rawPrompt: string;
  rawResponse: string;
  promptKey: string;
  promptVersion: number;
  promptSha256: string;
}> {
  const model = options.model || "gpt-4o-mini";

  const promptKey = "challenge_extractor.extract_challenges";
  const promptEntry = await getPromptRegistryEntry(promptKey);
  const promptSha256 = getPromptTemplateSha256(promptEntry);

  // Generate prompts
  const userPrompt =
    promptEntry.userTemplate?.length
      ? renderTemplate(promptEntry.userTemplate, {
          text,
          sourceOrgLine: options.sourceOrg ? `Source Organization: ${options.sourceOrg}` : "",
          sourceUrlLine: options.sourceUrl ? `Source URL: ${options.sourceUrl}` : "",
        })
      : generateUserPrompt(text, options.sourceOrg, options.sourceUrl);

  // Call OpenAI with structured outputs
  const response = await invokeLLM({
    messages: [
      { role: "system", content: promptEntry.systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "challenge_extraction",
        strict: true,
        schema: CHALLENGE_EXTRACTION_SCHEMA,
      },
    },
  });

  const rawResponse = JSON.stringify(response);
  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("No content in LLM response");
  }

  // Ensure content is a string
  const contentStr = typeof content === "string" ? content : JSON.stringify(content);
  const result: ChallengeExtractionResult = JSON.parse(contentStr);

  // Filter out low-confidence challenges
  result.challenges = result.challenges.filter((c) => c.confidence >= 60);

  return {
    result,
    rawPrompt: `SYSTEM:\n${promptEntry.systemPrompt}\n\nUSER:\n${userPrompt}`,
    rawResponse,
    promptKey,
    promptVersion: promptEntry.version,
    promptSha256,
  };
}
