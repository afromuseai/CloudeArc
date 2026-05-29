export async function mergeAgentResults(agents: any) {
  /**
   * This is your "decision brain"
   * It converts multiple models → one executable action
   */

  // TEMP deterministic merge (you can upgrade later)
  const text = agents.reasoning;

  // VERY IMPORTANT: must return JSON string
  return JSON.stringify({
    type: "write_file",
    path: "/main.js",
    content: `
export default function App() {
  return <h1>${text}</h1>;
}
    `,
  });
}