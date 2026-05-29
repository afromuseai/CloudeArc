// PromptOrchestrator — humanized + adaptive narrative layer.
// Designed to feel like a senior engineer thinking out loud,
// adapting priorities, noticing drift, and self-correcting.

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

// ── Prompt builders ───────────────────────────────────────────────────────────

export function buildPlannerSystemPrompt(): string {
  return `You are a senior engineer thinking through a build before touching any code.
Your job is to reason about the implementation deeply — discovering constraints,
noticing dependencies, and sequencing work so later stages stay clean.

Return ONLY valid JSON in this exact format:
{
  "steps": ["step 1", "step 2", "step 3"],
  "rewrittenPrompt": "A precise engineering spec of what to build (2-4 sentences)",
  "planningThought": {
    "title": "Short title for this thinking phase (5-8 words, no verbs like 'Analyzing')",
    "estimatedDuration": "e.g. 38s",
    "reasoning": "2-3 sentences of genuine engineering reasoning — what tradeoffs matter, what you noticed, what constraints exist",
    "strategy": "2-3 sentences about implementation order and WHY — what depends on what, what must come first",
    "insights": ["2-4 short insights that sound discovered, not prescribed — things like 'sticky nav requires no overflow:hidden on parents', 'the pricing tier needs to be isolated or the state gets messy', 'starting with the token system prevents cascade conflicts across 7+ components'"]
  }
}

Tone: sound like a senior engineer reasoning quietly to themselves.
Occasionally notice something — a constraint, a dependency, an edge case.
Don't describe the system. Describe the problem.

Good insight phrasing:
- "The pricing section needs its own component — otherwise toggling a tier changes too much parent state"
- "Sticky nav at z-50 requires every parent to have no overflow:hidden, so I'm checking that before writing anything"
- "With this many components, the coder must write App.jsx first — otherwise imports break mid-stream"
- "The mobile menu needs useState before the scroll behavior, or the layout shifts on first paint"

No <think> blocks. No markdown. Output only the JSON object.`;
}

export function buildArchitectSystemPrompt(templateType: string): string {
  return `You are working through component boundaries for a React app.
Think about where state lives, what depends on what, and where isolation matters.

Return ONLY valid JSON:
{
  "components": ["/src/components/Navbar.jsx", "/src/components/Hero.jsx"],
  "architecturalThought": {
    "title": "Short description of this component decision (5-8 words)",
    "estimatedDuration": "e.g. 14s",
    "reasoning": "2-3 sentences about why you chose this component split — what isolation buys you, what was discovered",
    "strategy": "2-3 sentences about rendering order and data flow — what depends on what, what sets up what",
    "insights": ["2-4 insights that feel like discoveries — constraints noticed, dependencies seen, edge cases caught"]
  }
}

Template: ${templateType}
Components go under /src/components/ as .jsx files.
No markdown. No <think> tags. Output only JSON.`;
}

// ── CadenceConfig ─────────────────────────────────────────────────────────────

export interface CadenceConfig {
  minDelay: number;
  burstSize: number;
  pauseMs: number;
}

export const CADENCE: Record<string, CadenceConfig> = {
  planning:     { minDelay: 800,  burstSize: 1, pauseMs: 400  },
  architecture: { minDelay: 400,  burstSize: 2, pauseMs: 200  },
  building:     { minDelay: 80,   burstSize: 4, pauseMs: 60   },
  debugging:    { minDelay: 1200, burstSize: 1, pauseMs: 600  },
  finalizing:   { minDelay: 200,  burstSize: 3, pauseMs: 100  },
};

// ── Dependency-aware narrative ────────────────────────────────────────────────

const PLAN_OPENERS = [
  (f: string) => `I want to get the ${f} locked in before anything else — the rest of the layout depends on that foundation.`,
  (f: string) => `Starting with ${f} because that decision propagates everywhere downstream.`,
  (f: string) => `The ${f} needs to come first — once that's stable, the remaining components slot in cleanly.`,
  (f: string) => `I'm prioritizing ${f} up front since changing it later means touching multiple layers.`,
];

const PLAN_CONTINUATIONS = [
  (r: string[]) => `Then I'll move through ${r.slice(0, -1).join(", ")}, finishing with ${r[r.length - 1]}. Each stage builds on the one before.`,
  (r: string[]) => `After that: ${r.join(" → ")}. The sequencing matters here — I don't want to wire things together before the structure is stable.`,
  (r: string[]) => `From there I'll work through ${r.slice(0, -1).join(", ")} — wrapping up with ${r[r.length - 1]} once the shape is clear.`,
];

export function buildNarrativeFromSteps(steps: string[]): string {
  if (!steps.length) return "Working through the shape of this before committing to anything.";
  const clean = (s: string) =>
    s.replace(/^(step \d+:?\s*|first[,:]?\s*|then[,:]?\s*)/i, "")
     .replace(/^\w/, c => c.toLowerCase())
     .replace(/\.$/, "");
  const first = clean(steps[0]);
  const rest  = steps.slice(1).map(clean);
  if (rest.length === 0) return `${first} — that's the core of it.`;
  const openerIdx = Math.abs(hashStr(first)) % PLAN_OPENERS.length;
  const contIdx   = Math.abs(hashStr(rest.join())) % PLAN_CONTINUATIONS.length;
  const opener = PLAN_OPENERS[openerIdx](first);
  if (rest.length === 1) return `${opener} Once that's solid, I'll ${rest[0]}.`;
  return `${opener} ${PLAN_CONTINUATIONS[contIdx](rest)}`;
}

export function buildArchNarrative(
  coreFiles: string[],
  sectionComponents: string[],
  allFiles: string[],
): string {
  const compNames = sectionComponents
    .map(f => f.split("/").pop()!.replace(".jsx", ""))
    .filter(Boolean);
  const total = allFiles.length;
  if (compNames.length === 0) {
    return `Working across ${total} files. I'll establish the root structure first, then wire each section into it.`;
  }
  const anchor = compNames[0];
  const remaining = compNames.slice(1);
  const VARIANTS = [
    () => `${total} files total. I'll lock in ${anchor} first — that sets the visual language everything else inherits. ${remaining.length > 0 ? `Then I'll move through ${remaining.join(", ")}, letting each section build on what came before.` : "Starting the build now."}`,
    () => `Spanning ${total} files. ${anchor} comes first because the spacing and type scale it establishes flows into every component below it. ${remaining.length > 0 ? `After that: ${remaining.join(", ")}.` : ""}`,
    () => `Working across ${total} files — starting with ${anchor} since the remaining sections depend on the layout structure it defines. ${remaining.length > 0 ? `${remaining.join(", ")} follow from there.` : ""} Starting the build.`,
  ];
  return VARIANTS[Math.abs(hashStr(anchor)) % VARIANTS.length]();
}

// ── Adaptive Autonomy narratives ──────────────────────────────────────────────
// All strings are written to feel discovered, not scripted.

// Reprioritization — the AI decides to change execution order
const REPRIORITIZATION = [
  "I'm restructuring the layout system first — the remaining sections depend on it being stable.",
  "The state flow is becoming coupled, so I'm simplifying that before wiring the API layer.",
  "I'm consolidating these components now to avoid duplication further down.",
  "The spacing system needs to land before the card components — otherwise I'm overriding twice.",
  "Shifting order slightly — the animation layer depends on the layout being settled first.",
  "I'm pulling the shared styles together now rather than threading them through each component.",
];

export function getReprioritization(seed: string): string {
  return REPRIORITIZATION[Math.abs(hashStr(seed + "repri")) % REPRIORITIZATION.length];
}

// Drift detection — AI notices the current path is becoming inefficient
const DRIFT_DETECTION = [
  "The component structure is creating more duplication than expected — consolidating before continuing.",
  "The dashboard grid is getting harder to maintain responsively. Simplifying the layout system now.",
  "There's more coupling here than the initial plan anticipated — restructuring to keep things clean.",
  "The spacing is drifting from the token system. Normalizing before going further.",
  "The animation layer is conflicting with the sticky positioning. Sorting that out now.",
  "A pattern is repeating across components that should be extracted. Doing that now.",
];

export function getDriftDetection(seed: string): string {
  return DRIFT_DETECTION[Math.abs(hashStr(seed + "drift")) % DRIFT_DETECTION.length];
}

// Self-correction — the AI catches itself and changes approach
const SELF_CORRECTIONS = [
  "Actually — there's a cleaner way to structure this. Revising.",
  "I'm changing approach slightly here. The earlier pattern becomes harder to maintain at this scale.",
  "This interaction layer is more coupled than I planned. Restructuring it now.",
  "I noticed a better split for this. Adjusting the component boundary before going deeper.",
  "The current approach works, but a simpler one is right there. Taking that instead.",
];

export function getSelfCorrection(seed: string): string {
  return SELF_CORRECTIONS[Math.abs(hashStr(seed + "self")) % SELF_CORRECTIONS.length];
}

// Task compression — summarizing repetitive work
const COMPRESSIONS = [
  (what: string) => `Applying the same ${what} pattern across the remaining sections now.`,
  (what: string) => `The shared ${what} structure is propagating cleanly through the build.`,
  (what: string) => `${what} is consistent now — carrying that through the remaining components.`,
  (what: string) => `Continuing with the same ${what} approach. Nothing novel here, just steady work.`,
];

export function getCompression(what: string): string {
  const idx = Math.abs(hashStr(what + "compress")) % COMPRESSIONS.length;
  return COMPRESSIONS[idx](what);
}

// Multi-thread cognition — awareness of parallel concerns
const MULTI_THREAD = [
  "While the rebuild settles, I'm cleaning up the interaction layer.",
  "The component structure is stable — I'm reviewing responsiveness at the same time.",
  "I'm keeping the animation system lightweight while wiring the state flow.",
  "While that lands, I'm making sure the mobile layout doesn't drift from the desktop spec.",
  "The layout is holding — simultaneously tidying the type hierarchy.",
];

export function getMultiThread(seed: string): string {
  return MULTI_THREAD[Math.abs(hashStr(seed + "mt")) % MULTI_THREAD.length];
}

// Strategic summaries — checkpoint narration
const STRATEGIC_SUMMARIES = [
  (stage: string) => `The ${stage} foundation is stable now — layout, spacing, and structure are aligned. Moving deeper.`,
  (stage: string) => `${stage} is behaving consistently. Connecting the remaining UI states now.`,
  (stage: string) => `Good — the ${stage} system is clean. I'm wiring the remaining sections into it.`,
  (stage: string) => `The ${stage} work is solid. What's left is mostly execution — no structural unknowns.`,
];

export function getStrategicSummary(stage: string): string {
  const idx = Math.abs(hashStr(stage + "summary")) % STRATEGIC_SUMMARIES.length;
  return STRATEGIC_SUMMARIES[idx](stage);
}

// Plan evolution — AI acknowledges plan has evolved
const PLAN_EVOLUTIONS = [
  "I adjusted the original sequence slightly — this flow will make the layout easier to extend later.",
  "I'm combining these two systems since they overlap heavily. The result is cleaner.",
  "The plan evolved a bit mid-build — what I've got is simpler than the original breakdown.",
  "I collapsed a couple of steps — they shared the same state boundary, so it made sense.",
];

export function getPlanEvolution(seed: string): string {
  return PLAN_EVOLUTIONS[Math.abs(hashStr(seed + "evolve")) % PLAN_EVOLUTIONS.length];
}

// Micro-discoveries — occasional emergent intelligence moments
const MICRO_DISCOVERIES = [
  "The component structure is slightly more coupled than expected — restructuring the state flow to stay clean.",
  "Noticed the mobile spacing becomes inconsistent below the md breakpoint, fixing that now.",
  "Found a cleaner way to handle the animation timing across sections.",
  "The current prop pattern would create duplication later — consolidating it while I still can.",
  "Interesting — the section order works better reversed here. Adjusting.",
  "The token system I set up earlier is making this part significantly cleaner.",
  "Caught a z-index conflict between the navbar and the modal layer — sorting that out.",
  "The layout is more flexible than expected, which actually simplifies the responsive behavior.",
];

export function getMicroDiscovery(seed: string): string {
  return MICRO_DISCOVERIES[Math.abs(hashStr(seed + "micro")) % MICRO_DISCOVERIES.length];
}

// Background cognition — brief parallel awareness messages
const BACKGROUND_COGNITION = [
  "While that compiles, I'm tidying up the component boundaries.",
  "The animation system is staying lightweight — keeping it clean as I add interactions.",
  "Layout is holding up well at this scale.",
  "The earlier structure decisions are paying off here.",
];

export function getBackgroundCognition(seed: string): string {
  return BACKGROUND_COGNITION[Math.abs(hashStr(seed + "bg")) % BACKGROUND_COGNITION.length];
}

// ── Fallback thought blocks ───────────────────────────────────────────────────

export function fallbackPlanningThought(templateType: string, steps: string[]): ThoughtBlock {
  return {
    title: `${templateType} — sequencing the build`,
    estimatedDuration: "—",
    reasoning: `I want to sequence this so each piece builds cleanly on the one before. The main risk with ${steps.length > 3 ? "this many components" : "this layout"} is writing things in the wrong order — so I'm thinking about dependencies before touching anything.`,
    strategy: `Global tokens and root layout first — once the design system is stable, every component inherits it without needing overrides. Then sections top-to-bottom, matching the visual reading order.`,
    insights: [
      "The color and spacing system needs to land before any component file — otherwise I'm overriding cascade twice",
      "Navbar isolation matters early: its z-index behavior is a dependency for anything that needs to layer above it",
      steps.length > 3
        ? `${steps.length} stages means I can validate structure at each boundary before going deeper`
        : "Keeping the scope tight reduces the chance of structural rewrites midway through",
    ],
    phase: "planning",
  };
}

export function fallbackArchThought(sectionComponents: string[]): ThoughtBlock {
  return {
    title: "Component boundaries settled",
    estimatedDuration: "—",
    reasoning: `Isolated ${sectionComponents.length} sections. Each one is self-contained so any section can be modified later without touching App.jsx state or sibling components.`,
    strategy: "App.jsx is the composition root — it imports and sequences all sections, and it's the only file that needs the IntersectionObserver. No prop drilling between siblings means changes stay local.",
    insights: [
      "One component per visual section: the mental model maps directly to the file tree",
      "Single IntersectionObserver in App.jsx is cheaper than per-component observers at this scale",
      sectionComponents.length > 4
        ? "With this component count, App.jsx must be written before any section file — import order matters"
        : "Small component count leaves comfortable token headroom for detail work",
    ],
    phase: "architecture",
  };
}

// ── Utilities ─────────────────────────────────────────────────────────────────

export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}
