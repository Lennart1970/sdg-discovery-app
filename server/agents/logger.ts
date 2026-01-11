/**
 * Structured logging utility for agent requests and responses
 * Provides auditability for all LLM interactions
 */

export interface AgentLogEntry {
  timestamp: string;
  agent: "challenge_extractor" | "technology_discovery";
  operation: string;
  userId?: number;
  challengeId?: number;
  model: string;
  rawPrompt: string;
  rawResponse: string;
  status: "success" | "error";
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log agent request/response in structured JSON format
 */
export function logAgentInteraction(entry: AgentLogEntry): void {
  const logEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  // Log to console in JSON format for structured logging systems
  console.log(JSON.stringify(logEntry));
}

/**
 * Create a log entry for successful agent execution
 */
export function createSuccessLog(
  agent: AgentLogEntry["agent"],
  operation: string,
  model: string,
  rawPrompt: string,
  rawResponse: string,
  metadata?: Record<string, unknown>
): AgentLogEntry {
  return {
    timestamp: new Date().toISOString(),
    agent,
    operation,
    model,
    rawPrompt,
    rawResponse,
    status: "success",
    metadata,
  };
}

/**
 * Create a log entry for failed agent execution
 */
export function createErrorLog(
  agent: AgentLogEntry["agent"],
  operation: string,
  model: string,
  rawPrompt: string,
  errorMessage: string,
  metadata?: Record<string, unknown>
): AgentLogEntry {
  return {
    timestamp: new Date().toISOString(),
    agent,
    operation,
    model,
    rawPrompt,
    rawResponse: "",
    status: "error",
    errorMessage,
    metadata,
  };
}
