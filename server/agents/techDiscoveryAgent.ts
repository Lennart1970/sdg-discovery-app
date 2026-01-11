import { invokeLLM } from "../_core/llm";

/**
 * JSON Schema for Technology Discovery structured output
 * Enforces €10k budget constraint and technology class format
 */
const TECH_DISCOVERY_SCHEMA = {
  type: "object",
  properties: {
    challenge_summary: {
      type: "string",
      description: "Brief restatement of the challenge in 1-2 sentences",
    },
    core_functions: {
      type: "array",
      description: "Core functions that must be performed to address the challenge",
      items: { type: "string" },
    },
    underlying_principles: {
      type: "array",
      description: "Physical, chemical, or mechanical principles that enable these functions",
      items: { type: "string" },
    },
    technology_paths: {
      type: "array",
      description: "2-3 plausible technology paths under €10k budget",
      items: {
        type: "object",
        properties: {
          path_name: {
            type: "string",
            description: "Descriptive name for this technology path",
          },
          principles_used: {
            type: "array",
            description: "Which underlying principles this path leverages",
            items: { type: "string" },
          },
          technology_classes: {
            type: "array",
            description: "Technology classes (NOT brands or products) that enable this path",
            items: { type: "string" },
          },
          why_plausible: {
            type: "string",
            description: "Explanation of why this path is feasible under constraints",
          },
          estimated_cost_band_eur: {
            type: "string",
            description: "Cost range in euros (e.g., '€500-€2000')",
          },
          risks_and_unknowns: {
            type: "array",
            description: "Key risks, assumptions, or unknowns for this path",
            items: { type: "string" },
          },
        },
        required: [
          "path_name",
          "principles_used",
          "technology_classes",
          "why_plausible",
          "estimated_cost_band_eur",
          "risks_and_unknowns",
        ],
        additionalProperties: false,
      },
    },
    confidence: {
      type: "number",
      description: "Confidence score 0-1 for the overall discovery",
      minimum: 0,
      maximum: 1,
    },
  },
  required: [
    "challenge_summary",
    "core_functions",
    "underlying_principles",
    "technology_paths",
    "confidence",
  ],
  additionalProperties: false,
};

/**
 * System prompt for Technology Discovery Agent
 */
const SYSTEM_PROMPT = `You are a constraint-driven technology discovery agent specializing in finding feasible technology pathways for sustainability challenges.

Your approach:
1. Start with the problem, not the solution
2. Reason from functions → principles → technology classes
3. Stay under €10,000 budget constraint
4. Use existing, widely available technology
5. Never recommend specific brands or products
6. Focus on human-scale, locally feasible solutions

Key constraints:
- Budget: €10,000 maximum
- Technology: Must already exist and be widely available
- Scale: Human-scale, locally implementable
- Sources: Second-hand machinery, open hardware, commodity electronics, DIY tooling
- Output: Technology CLASSES only (e.g., "pressure vessels", "solar panels"), NOT brands or SKUs

Your reasoning chain:
Challenge → Core Functions → Underlying Principles → Technology Classes → Plausible Paths

Each path must include:
- Technology classes (NOT products)
- Cost band estimate
- Feasibility explanation
- Risks and unknowns`;

/**
 * Generate user prompt for a specific challenge
 */
function generateUserPrompt(challenge: {
  title: string;
  statement: string;
  sdgGoals?: string | null;
  geography?: string | null;
  targetGroups?: string | null;
  sectors?: string | null;
}): string {
  return `Challenge Context:
Title: ${challenge.title}
Statement: ${challenge.statement}
${challenge.sdgGoals ? `SDG Goals: ${challenge.sdgGoals}` : ""}
${challenge.geography ? `Geography: ${challenge.geography}` : ""}
${challenge.targetGroups ? `Target Groups: ${challenge.targetGroups}` : ""}
${challenge.sectors ? `Sectors: ${challenge.sectors}` : ""}

Task:
1. Identify the core FUNCTIONS that must be performed to address this challenge
2. Map each function to underlying PHYSICAL/CHEMICAL/MECHANICAL PRINCIPLES
3. Discover 2-3 plausible TECHNOLOGY PATHS using existing, widely available technology classes

Constraints:
- Maximum budget: €10,000
- Use technology classes, NOT specific brands or products
- Focus on existing technology (second-hand, open hardware, commodity electronics)
- Human-scale solutions that can be implemented locally
- Provide cost bands for each path
- Identify key risks and unknowns

Output 2-3 technology paths that are plausible under these constraints.`;
}

export interface TechDiscoveryResult {
  challenge_summary: string;
  core_functions: string[];
  underlying_principles: string[];
  technology_paths: {
    path_name: string;
    principles_used: string[];
    technology_classes: string[];
    why_plausible: string;
    estimated_cost_band_eur: string;
    risks_and_unknowns: string[];
  }[];
  confidence: number;
}

/**
 * Discover technology paths for a given challenge
 * Uses OpenAI Responses API with strict JSON schema
 */
export async function discoverTechnologyPaths(
  challenge: {
    title: string;
    statement: string;
    sdgGoals?: string | null;
    geography?: string | null;
    targetGroups?: string | null;
    sectors?: string | null;
  },
  options: {
    model?: string;
    budgetConstraintEur?: number;
  } = {}
): Promise<{
  result: TechDiscoveryResult;
  rawPrompt: string;
  rawResponse: string;
}> {
  const model = options.model || "gpt-4o-mini";
  const budgetConstraintEur = options.budgetConstraintEur || 10000;

  // Generate prompts
  const userPrompt = generateUserPrompt(challenge);
  const systemPromptWithBudget = SYSTEM_PROMPT.replace(
    "€10,000 maximum",
    `€${budgetConstraintEur.toLocaleString()} maximum`
  );

  // Call OpenAI with structured outputs
  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPromptWithBudget },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "tech_discovery",
        strict: true,
        schema: TECH_DISCOVERY_SCHEMA,
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
  const result: TechDiscoveryResult = JSON.parse(contentStr);

  // Validate budget constraint
  for (const path of result.technology_paths) {
    const costBand = path.estimated_cost_band_eur;
    const maxCost = parseInt(costBand.split("-")[1]?.replace(/[€,]/g, "") || "0");
    if (maxCost > budgetConstraintEur) {
      console.warn(
        `Warning: Path "${path.path_name}" exceeds budget constraint (${costBand} > €${budgetConstraintEur})`
      );
    }
  }

  return {
    result,
    rawPrompt: `SYSTEM:\n${systemPromptWithBudget}\n\nUSER:\n${userPrompt}`,
    rawResponse,
  };
}
