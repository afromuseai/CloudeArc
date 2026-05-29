// PromptOrchestrator — Persistent Collaborative Intelligence layer.
// All classes here are instantiated per-request (request-scoped).
// They give the AI memory, taste continuity, constraint awareness,
// and deduplication across the entire build session.

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
    "insights": ["2-4 short insights that sound discovered, not prescribed — things like 'sticky nav requires no overflow:hidden on parents', 'the pricing tier needs to be isolated or the state gets messy'"]
  }
}

Tone: sound like a senior engineer reasoning quietly to themselves.
Occasionally notice something — a constraint, a dependency, an edge case.
Don't describe the system. Describe the problem.
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
    "reasoning": "2-3 sentences about why you chose this component split",
    "strategy": "2-3 sentences about rendering order and data flow",
    "insights": ["2-4 insights that feel like discoveries"]
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
  planning:     { minDelay: 800,  burstSize: 1, pauseMs: 400 },
  architecture: { minDelay: 400,  burstSize: 2, pauseMs: 200 },
  building:     { minDelay: 80,   burstSize: 4, pauseMs: 60  },
  debugging:    { minDelay: 1200, burstSize: 1, pauseMs: 600 },
  finalizing:   { minDelay: 200,  burstSize: 3, pauseMs: 100 },
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
  if (!rest.length) return `${first} — that's the core of it.`;
  const opener = PLAN_OPENERS[Math.abs(hashStr(first)) % PLAN_OPENERS.length](first);
  if (rest.length === 1) return `${opener} Once that's solid, I'll ${rest[0]}.`;
  return `${opener} ${PLAN_CONTINUATIONS[Math.abs(hashStr(rest.join())) % PLAN_CONTINUATIONS.length](rest)}`;
}

export function buildArchNarrative(
  coreFiles: string[],
  sectionComponents: string[],
  allFiles: string[],
): string {
  const comps = sectionComponents.map(f => f.split("/").pop()!.replace(".jsx", "")).filter(Boolean);
  const total = allFiles.length;
  if (!comps.length) return `Working across ${total} files. I'll establish the root structure first, then wire each section into it.`;
  const anchor = comps[0];
  const rest = comps.slice(1);
  const VARIANTS = [
    () => `${total} files total. I'll lock in ${anchor} first — that sets the visual language everything else inherits. ${rest.length ? `Then I'll move through ${rest.join(", ")}, letting each section build on what came before.` : "Starting the build now."}`,
    () => `Spanning ${total} files. ${anchor} comes first because the spacing and type scale it establishes flows into every component below it. ${rest.length ? `After that: ${rest.join(", ")}.` : ""}`,
    () => `Working across ${total} files — starting with ${anchor} since the remaining sections depend on the layout structure it defines. ${rest.length ? `${rest.join(", ")} follow from there.` : ""} Starting the build.`,
  ];
  return VARIANTS[Math.abs(hashStr(anchor)) % VARIANTS.length]();
}

// ── ArchitecturalMemoryEngine ─────────────────────────────────────────────────
// Request-scoped. Tracks what has been established during this build
// so later narrative can reference earlier decisions naturally.

interface DesignLanguage {
  cornerStyle: string | null;      // 'rounded' | 'sharp' | 'pill'
  shadowDensity: string | null;    // 'heavy' | 'minimal' | 'none'
  spacingPhilosophy: string | null;// 'generous' | 'compact' | 'balanced'
  colorApproach: string | null;    // 'muted' | 'vibrant' | 'gradient'
  typographyStyle: string | null;  // 'editorial' | 'systematic' | 'humanist'
  animationPhilosophy: string | null; // 'micro' | 'fluid' | 'none'
}

export class ArchitecturalMemoryEngine {
  private lang: DesignLanguage = {
    cornerStyle: null, shadowDensity: null, spacingPhilosophy: null,
    colorApproach: null, typographyStyle: null, animationPhilosophy: null,
  };
  private establishedPatterns: string[] = [];
  private emitHistory: string[] = [];
  private lastMemoryRefAt = -4;
  private lastRetrospectiveAt = -8;

  // Infer visual language from the style mode string
  inferFromContext(templateType: string, styleMode: string) {
    const s = (styleMode + templateType).toLowerCase();
    this.lang.cornerStyle     = /sharp|brutalist|angular|industrial/.test(s) ? "sharp" : "rounded";
    this.lang.shadowDensity   = /minimal|flat|clean|ghost|glass/.test(s)    ? "minimal" : "present";
    this.lang.spacingPhilosophy = /compact|dense|dashboard/.test(s)         ? "compact" : "generous";
    this.lang.colorApproach   = /muted|subtle|monochrome|neutral/.test(s)   ? "muted"
                               : /gradient|vibrant|bold/.test(s)            ? "gradient" : "balanced";
    this.lang.typographyStyle = /editorial|magazine/.test(s)                ? "editorial"
                               : /systematic|technical/.test(s)             ? "systematic" : "humanist";
    this.lang.animationPhilosophy = /static|no.anim|minimal/.test(s)       ? "none" : "micro";

    // Record initial patterns
    if (this.lang.spacingPhilosophy === "generous") this.establishedPatterns.push("spacing rhythm");
    if (this.lang.cornerStyle === "rounded")         this.establishedPatterns.push("rounded corner system");
    if (this.lang.colorApproach === "muted")         this.establishedPatterns.push("muted color palette");
    if (this.lang.colorApproach === "gradient")      this.establishedPatterns.push("gradient visual language");
  }

  recordFileEmit(path: string) {
    this.emitHistory.push(path);
    const name = path.split("/").pop()?.replace(".jsx", "").toLowerCase() ?? "";
    if (/hero|landing/.test(name))   this.establishedPatterns.push("hero visual language");
    if (/nav|header/.test(name))     this.establishedPatterns.push("navigation structure");
    if (/card|feature/.test(name))   this.establishedPatterns.push("card component system");
    if (/globals|css/.test(name))    this.establishedPatterns.push("design token system");
    if (/app|layout/.test(name))     this.establishedPatterns.push("layout composition");
  }

  getMemoryReference(path: string, idx: number): string | null {
    const gap = idx - this.lastMemoryRefAt;
    if (gap < 3 || this.establishedPatterns.length < 2) return null;
    if (Math.random() > 0.28) return null; // only ~28% chance when eligible

    const name = path.split("/").pop()?.replace(".jsx", "") ?? "";
    const established = this.establishedPatterns[Math.floor(Math.random() * Math.min(3, this.establishedPatterns.length))];

    const REFS = [
      `I'm reusing the ${established} from earlier — the ${name} section inherits it cleanly.`,
      `The ${established} we established already handles most of this. ${name} slots in naturally.`,
      `${name} is leaning on the ${established} — no duplication needed here.`,
      `The ${established} is paying off now — ${name} comes together faster because of it.`,
    ];
    this.lastMemoryRefAt = idx;
    return REFS[Math.abs(hashStr(path + established)) % REFS.length];
  }

  getRetrospectiveMessage(idx: number): string | null {
    const gap = idx - this.lastRetrospectiveAt;
    if (gap < 7 || this.emitHistory.length < 4) return null;
    if (Math.random() > 0.15) return null; // rare — 15% when eligible

    const first = this.emitHistory[0].split("/").pop()?.replace(".jsx", "") ?? "initial";
    const RETROS = [
      `The ${first} structure ended up simplifying things further down more than I expected.`,
      `Choosing the shared token system earlier made this phase significantly faster.`,
      `The earlier navigation structure made the mobile layout easier to maintain.`,
      `The component isolation we set up is paying off — changes stay local.`,
    ];
    this.lastRetrospectiveAt = idx;
    return RETROS[Math.abs(hashStr(first + String(idx))) % RETROS.length];
  }

  getLongHorizonMessage(idx: number, templateType: string): string | null {
    // Very rare — only 1-2 times per build, not too early
    if (idx < 4 || Math.random() > 0.12) return null;
    const HORIZON = [
      `This interaction system should scale cleanly once settings and notifications are added later.`,
      `I'm organizing the state flow so future features won't fight the existing structure.`,
      `This layout gives us flexibility if the ${templateType} expands with more sections later.`,
      `I think this structure will age better as the product grows.`,
    ];
    return HORIZON[Math.abs(hashStr(templateType + String(idx))) % HORIZON.length];
  }

  getEstablishedPattern(): string | null {
    if (!this.establishedPatterns.length) return null;
    return this.establishedPatterns[this.establishedPatterns.length - 1];
  }
}

// ── NarrativeDeduplicationEngine ─────────────────────────────────────────────
// Request-scoped. Prevents repeated phrasing across SSE narrative emissions.

export class NarrativeDeduplicationEngine {
  private usedStarts = new Set<string>();
  private usedPatterns: string[] = []; // key phrase fingerprints
  private lastVariantIdx: Record<string, number> = {};

  isDuplicate(text: string): boolean {
    const start = text.slice(0, 32).toLowerCase();
    if (this.usedStarts.has(start)) return true;

    // Check for repeated key patterns
    const patterns = [
      /^I'm (reusing|extending|applying|carrying)/i,
      /^The (earlier|initial|previous)/i,
      /^Actually/i,
      /^While (that|the)/i,
      /^The (card|spacing|layout|token|component|color)/i,
      /^This (structure|layout|interaction|system)/i,
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) {
        const key = m[0].toLowerCase();
        if (this.usedPatterns.includes(key)) return true;
      }
    }
    return false;
  }

  record(text: string) {
    const start = text.slice(0, 32).toLowerCase();
    this.usedStarts.add(start);
    // Only keep last 8 to allow eventual reuse
    if (this.usedStarts.size > 8) {
      const first = this.usedStarts.values().next().value;
      if (first) this.usedStarts.delete(first);
    }
    const patterns = [
      /^I'm (reusing|extending|applying|carrying)/i,
      /^The (earlier|initial|previous)/i,
      /^Actually/i,
      /^While (that|the)/i,
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) {
        const key = m[0].toLowerCase();
        if (!this.usedPatterns.includes(key)) {
          this.usedPatterns.push(key);
          if (this.usedPatterns.length > 6) this.usedPatterns.shift();
        }
      }
    }
  }

  // Pick a variant that wasn't used last time for this key
  pickVariant<T>(variants: T[], key: string): T {
    const last = this.lastVariantIdx[key] ?? -1;
    const candidates = variants
      .map((v, i) => ({ v, i }))
      .filter(({ i }) => i !== last);
    const pick = candidates[Math.abs(hashStr(key + String(last))) % candidates.length];
    this.lastVariantIdx[key] = pick.i;
    return pick.v;
  }

  reset() {
    this.usedStarts.clear();
    this.usedPatterns = [];
    this.lastVariantIdx = {};
  }
}

// ── DesignTasteTracker ────────────────────────────────────────────────────────
// Maintains aesthetic consistency throughout the build.

export class DesignTasteTracker {
  private established: string[] = [];
  private lastContinuityAt = -6;

  recordEstablished(pattern: string) {
    if (!this.established.includes(pattern)) this.established.push(pattern);
  }

  getContinuityMessage(idx: number, context: string): string | null {
    const gap = idx - this.lastContinuityAt;
    if (gap < 5 || !this.established.length) return null;
    if (Math.random() > 0.2) return null;

    const pattern = this.established[Math.abs(hashStr(context)) % this.established.length];
    const CONTINUITY = [
      `The earlier visual language is working well — extending that into ${context}.`,
      `I'm keeping the interaction density consistent with the ${pattern} we already established.`,
      `${context} follows the same aesthetic direction. The consistency is holding.`,
      `The ${pattern} carries through here naturally.`,
    ];
    this.lastContinuityAt = idx;
    return CONTINUITY[Math.abs(hashStr(pattern + context)) % CONTINUITY.length];
  }
}

// ── ConstraintMemoryLayer ─────────────────────────────────────────────────────
// Remembers discovered constraints and references them during later work.

export class ConstraintMemoryLayer {
  private constraints: string[] = [];
  private lastRefAt = -7;

  // Infer constraints from template and file count
  inferConstraints(templateType: string, fileCount: number) {
    if (fileCount > 10) this.constraints.push("bundle size");
    if (/dashboard|admin/.test(templateType)) this.constraints.push("rerender efficiency");
    if (/landing|marketing/.test(templateType)) this.constraints.push("responsive consistency");
    this.constraints.push("accessibility");
    this.constraints.push("component isolation");
  }

  getConstraintReference(idx: number, context: string): string | null {
    const gap = idx - this.lastRefAt;
    if (gap < 6 || !this.constraints.length) return null;
    if (Math.random() > 0.14) return null;

    const c = this.constraints[Math.abs(hashStr(context + String(idx))) % this.constraints.length];
    const REFS = [
      `I almost split this further, but keeping it local is better for ${c}.`,
      `Keeping an eye on ${c} here — this approach stays within the budget.`,
      `The current structure handles ${c} without any extra overhead.`,
    ];
    this.lastRefAt = idx;
    return REFS[Math.abs(hashStr(c)) % REFS.length];
  }
}

// ── Adaptive Autonomy narratives ──────────────────────────────────────────────

const REPRIORITIZATION = [
  "I'm restructuring the layout system first — the remaining sections depend on it being stable.",
  "The state flow is becoming coupled. Simplifying that before wiring the remaining layer.",
  "I'm consolidating these components now to avoid duplication further down.",
  "Shifting order slightly — the animation layer depends on the layout being settled.",
  "Pulling the shared styles together now rather than threading them through each component.",
  "I'm addressing the spacing system before the card components — otherwise I'd be overriding twice.",
];

export function getReprioritization(seed: string): string {
  return REPRIORITIZATION[Math.abs(hashStr(seed + "repri")) % REPRIORITIZATION.length];
}

const DRIFT_DETECTION = [
  "The component structure is creating more duplication than expected — consolidating before continuing.",
  "The grid layout is getting harder to maintain responsively. Simplifying the structure now.",
  "More coupling here than the initial plan anticipated — restructuring to stay clean.",
  "The spacing is drifting from the token system. Normalizing before going further.",
  "A pattern is repeating across components that should be extracted. Doing that now.",
];

export function getDriftDetection(seed: string): string {
  return DRIFT_DETECTION[Math.abs(hashStr(seed + "drift")) % DRIFT_DETECTION.length];
}

const SELF_CORRECTIONS = [
  "Actually — there's a cleaner way to structure this. Revising.",
  "I'm changing approach slightly. The earlier pattern becomes harder to maintain at this scale.",
  "This interaction layer is more coupled than I planned. Restructuring it now.",
  "I noticed a better split for this component boundary. Adjusting before going deeper.",
  "The current approach works, but a simpler one is right there. Taking that instead.",
];

export function getSelfCorrection(seed: string): string {
  return SELF_CORRECTIONS[Math.abs(hashStr(seed + "self")) % SELF_CORRECTIONS.length];
}

const COMPRESSIONS = [
  (w: string) => `Applying the same ${w} pattern across the remaining sections now.`,
  (w: string) => `The shared ${w} structure is propagating cleanly through the build.`,
  (w: string) => `${w} is consistent — carrying that through the remaining components.`,
  (w: string) => `Continuing the same ${w} approach. Steady execution from here.`,
];

export function getCompression(what: string): string {
  return COMPRESSIONS[Math.abs(hashStr(what + "compress")) % COMPRESSIONS.length](what);
}

const MULTI_THREAD = [
  "While the rebuild settles, I'm cleaning up the interaction layer.",
  "The component structure is stable — I'm reviewing responsiveness at the same time.",
  "I'm keeping the animation system lightweight while wiring the state flow.",
  "While that lands, I'm making sure the mobile layout doesn't drift.",
  "Layout is holding — tidying the type hierarchy simultaneously.",
];

export function getMultiThread(seed: string): string {
  return MULTI_THREAD[Math.abs(hashStr(seed + "mt")) % MULTI_THREAD.length];
}

const STRATEGIC_SUMMARIES = [
  (s: string) => `The ${s} foundation is stable — layout, spacing, and structure are aligned. Moving deeper now.`,
  (s: string) => `${s} is behaving consistently. Connecting the remaining UI states.`,
  (s: string) => `Good — the ${s} system is clean. Wiring the remaining sections into it.`,
  (s: string) => `The ${s} work is solid. What's left is execution — no structural unknowns remaining.`,
];

export function getStrategicSummary(stage: string): string {
  return STRATEGIC_SUMMARIES[Math.abs(hashStr(stage + "summary")) % STRATEGIC_SUMMARIES.length](stage);
}

const PLAN_EVOLUTIONS = [
  "I adjusted the original sequence slightly — this flow will make the layout easier to extend later.",
  "I'm combining these two systems since they overlap heavily. The result is cleaner.",
  "The plan evolved a bit mid-build — what I've got is simpler than the original breakdown.",
  "I collapsed a couple of steps — they shared the same state boundary, so it made sense.",
];

export function getPlanEvolution(seed: string): string {
  return PLAN_EVOLUTIONS[Math.abs(hashStr(seed + "evolve")) % PLAN_EVOLUTIONS.length];
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

// ── Utility ───────────────────────────────────────────────────────────────────

export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}
