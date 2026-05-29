import { runAgents } from "./runAgents";
import { mergeAgentResults } from "./merge";

export async function runOrchestrator(prompt: string) {
  // 1. Run parallel agents
  const agents = await runAgents(prompt);

  // 2. Merge reasoning into structured action
  const merged = await mergeAgentResults(agents);

  /**
   * FORCE OUTPUT FORMAT
   * (THIS IS IMPORTANT)
   */
  return JSON.parse(merged);
}