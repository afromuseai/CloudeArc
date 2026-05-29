// PromptOrchestrator — enhances the plan stage with curated thought blocks,
// prompt rewriting, and structured narrative checkpoints.

export interface ThoughtBlock {
  title: string;
  estimatedDuration: string;
  reasoning: string;
  strategy: string;
  insights: string[];
  phase: "planning" | "architecture" | "building";
}

export interface OrchestratedPlan {
  steps: string[];
  rewrittenPrompt: string;
  planningThought: ThoughtBlock;
  architecturalThought?: ThoughtBlock;
}

// ── Prompt rewriting ──────────────────────────────────────────────────────────
// Converts a vague user request into an implementation-ready orchestration brief.

export function buildPlannerSystemPrompt(): string {
  return `You are a lead engineer and orchestration planner. Your job is to:
1. Understand the user's intent deeply
2. Rewrite their request into a precise engineering spec
3. Break it into concrete implementation steps
4. Generate a planning thought block that sounds like an experienced engineer reasoning through the problem

Return ONLY valid JSON in this exact format:
{
  "steps": ["step 1", "step 2", "step 3"],
  "rewrittenPrompt": "A precise engineering spec of what to build (2-4 sentences)",
  "planningThought": {
    "title": "Short title for this planning phase (5-8 words)",
    "estimatedDuration": "e.g. 42s",
    "reasoning": "2-3 sentences: why you're structuring it this way, what tradeoffs you're considering",
    "strategy": "2-3 sentences: your implementation order and why",
    "insights": ["2-4 short bullet insights about architecture decisions, discovered constraints, or key design choices"]
  }
}

Tone for reasoning/strategy/insights: engineering-oriented, collaborative, thoughtful.
Sound like a senior engineer thinking out loud — not a chatbot.
Examples of good insight phrasing:
- "Starting with globals.css before components prevents style cascade conflicts later"
- "The pricing section needs to be a standalone component so it can be toggled independently"
- "Using sticky positioning on the navbar requires overflow:hidden to be absent on parent containers"

No <think> blocks. No markdown. Output only the JSON object.`;
}

export function buildArchitectSystemPrompt(templateType: string): string {
  return `You are a component architecture agent. Given implementation steps and a template type, design the React component structure.

Return ONLY valid JSON:
{
  "components": ["/src/components/Navbar.jsx", "/src/components/Hero.jsx"],
  "architecturalThought": {
    "title": "Short title for architecture decision (5-8 words)",
    "estimatedDuration": "e.g. 12s",
    "reasoning": "2-3 sentences about why you chose this component split",
    "strategy": "2-3 sentences about the rendering order and data flow",
    "insights": ["2-4 insights about component boundaries, shared state, performance implications"]
  }
}

Template: ${templateType}
Components go under /src/components/ as .jsx files.
No markdown. No <think> tags. Output only JSON.`;
}

// ── Narrative helpers ──────────────────────────────────────────────────────────

export function buildNarrativeFromSteps(steps: string[]): string {
  if (!steps.length) return "Working through the implementation now.";
  const first = steps[0]
    .replace(/^(step \d+:?\s*|first[,:]?\s*)/i, "")
    .replace(/^\w/, c => c.toLowerCase());
  const rest = steps.slice(1).map(s =>
    s.replace(/^(step \d+:?\s*|then[,:]?\s*)/i, "").replace(/^\w/, c => c.toLowerCase())
  );
  if (rest.length === 0) return `My plan: ${first}.`;
  if (rest.length === 1) return `I'll start by ${first}, then ${rest[0]}.`;
  return `I'll start by ${first}, then ${rest.slice(0, -1).join(", ")} — finishing with ${rest[rest.length - 1]}.`;
}

export function buildArchNarrative(
  coreFiles: string[],
  sectionComponents: string[],
  allFiles: string[],
): string {
  const compNames = sectionComponents.map(f => f.split("/").pop()!.replace(".jsx", ""));
  const firstTwo  = compNames.slice(0, 2).join(" and ");
  const remaining = compNames.slice(2);
  if (compNames.length === 0) {
    return `I'm working with ${allFiles.length} files total. Kicking off the build now.`;
  }
  if (remaining.length === 0) {
    return `I'm working with ${allFiles.length} files. I'll nail ${firstTwo} first to establish the visual direction, then fill in the rest.`;
  }
  return `Working across ${allFiles.length} files. I'll lock in ${firstTwo} first — that sets the visual language — then move through ${remaining.join(", ")}. Starting the build.`;
}

// ── Fallback thought blocks ───────────────────────────────────────────────────
// Used when the LLM fails to return thought blocks.

export function fallbackPlanningThought(templateType: string, steps: string[]): ThoughtBlock {
  return {
    title: `Planning ${templateType} architecture`,
    estimatedDuration: "—",
    reasoning: `Breaking the request into ${steps.length} implementation phases. I'm thinking about component boundaries before writing any code — it prevents rewrites later.`,
    strategy: `Starting with the global design tokens and root layout, then building sections top-to-bottom as they appear in the viewport. This keeps the mental model aligned with the visual structure.`,
    insights: [
      "Establishing the color system and typography scale first prevents cascading style overrides",
      "Navbar needs to be isolated early — its z-index and backdrop behavior affects everything above it",
      steps.length > 2 ? `${steps.length} discrete stages means I can checkpoint quality at each boundary` : "Keeping the component split tight to avoid unnecessary re-renders",
    ],
    phase: "planning",
  };
}

export function fallbackArchThought(sectionComponents: string[]): ThoughtBlock {
  return {
    title: "Component structure resolved",
    estimatedDuration: "—",
    reasoning: `Mapped ${sectionComponents.length} section components. Each section is isolated so they can be modified independently without touching root App state.`,
    strategy: "App.jsx acts as the composition root — it imports all sections and wires the IntersectionObserver for scroll animations. No prop drilling needed between sibling sections.",
    insights: [
      "One component per visual section keeps the mental model clean",
      "The IntersectionObserver approach in App.jsx is cheaper than per-component observers",
      sectionComponents.length > 4 ? "With this many components, file order matters — coder must write App.jsx before any section file" : "Small component count means token budget is comfortable",
    ],
    phase: "architecture",
  };
}
