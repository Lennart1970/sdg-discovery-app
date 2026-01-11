import { invokeLLM } from "../_core/llm";

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
 * System prompt for Challenge Extractor Agent
 */
const SYSTEM_PROMPT = `You are a challenge extraction agent specializing in identifying solution-free sustainability challenges from SDG-related documents.

Your task:
1. Extract clear, actionable challenges from the provided text
2. Focus on PROBLEMS, not solutions
3. Filter out marketing, proposals, and vaporware
4. Identify SDG goals, geography, target groups, and sectors

Key rules:
- Extract challenges that are solution-free (no proposed technologies or products)
- Avoid challenges that are too vague or too specific
- Focus on challenges that could benefit from technology solutions under €10k
- Each challenge should be independently understandable
- Confidence score reflects how well-defined and actionable the challenge is

Output format:
- Title: Concise summary (max 100 chars)
- Statement: Clear problem description (2-3 sentences)
- SDG Goals: Relevant goals (comma-separated numbers)
- Geography: Location or region
- Target Groups: Affected populations
- Sectors: Relevant sectors
- Confidence: 0-100 score`;

/**
 * Generate user prompt for challenge extraction
 */
function generateUserPrompt(text: string, sourceOrg?: string, sourceUrl?: string): string {
  return `Extract sustainability challenges from the following document:

${sourceOrg ? `Source Organization: ${sourceOrg}` : ""}
${sourceUrl ? `Source URL: ${sourceUrl}` : ""}

Document Text:
${text}

Task:
1. Identify all clear, actionable sustainability challenges
2. Extract only solution-free problem statements
3. Filter out marketing content, proposals, and vague statements
4. Provide SDG goals, geography, target groups, and sectors where identifiable
5. Assign confidence scores based on clarity and actionability

Extract all relevant challenges from this document.`;
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
}> {
  const model = options.model || "gpt-4o-mini";

  // Generate prompts
  const userPrompt = generateUserPrompt(text, options.sourceOrg, options.sourceUrl);

  // Call OpenAI with structured outputs
  const response = await invokeLLM({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
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
    rawPrompt: `SYSTEM:\n${SYSTEM_PROMPT}\n\nUSER:\n${userPrompt}`,
    rawResponse,
  };
}
