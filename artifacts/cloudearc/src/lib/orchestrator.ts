// ── ExecutionEventBus + AIOrchestrator + Adaptive Autonomy ────────────────────
// Central runtime for all AI activity.

import type { ExecutionStage } from "../components/AgentLivenessIndicator";

// ── Event types ───────────────────────────────────────────────────────────────

export type OrchestratorEventType =
  | "intent_detected"
  | "planning_started"
  | "thought_generated"
  | "narrative_generated"
  | "file_opened"
  | "file_edited"
  | "operation_started"
  | "operation_completed"
  | "stage_changed"
  | "validation_started"
  | "build_completed"
  | "task_finished"
  | "momentum_updated"
  | "reprioritization"
  | "drift_detected"
  | "self_correction"
  | "silent_window_start"
  | "silent_window_end"
  | "compression_active";

export interface ThoughtBlockData {
  title: string;
  estimatedDuration: string;
  reasoning: string;
  strategy: string;
  insights: string[];
  phase: "planning" | "architecture" | "building";
}

export interface OrchestratorEvent {
  type: OrchestratorEventType;
  payload?: Record<string, unknown>;
  timestamp: number;
}

// ── Orchestrator state ────────────────────────────────────────────────────────

export interface OrchestratorState {
  phase: ExecutionStage;
  currentTask: string | null;
  activeSubtask: string | null;
  completedOps: number;
  pendingOps: string[];
  discoveries: string[];
  architectureDecisions: string[];
  isActive: boolean;
  sessionFileCount: number;
  lastCompletedAt: number | null;
}

const DEFAULT_STATE: OrchestratorState = {
  phase: "idle",
  currentTask: null,
  activeSubtask: null,
  completedOps: 0,
  pendingOps: [],
  discoveries: [],
  architectureDecisions: [],
  isActive: false,
  sessionFileCount: 0,
  lastCompletedAt: null,
};

// ── ExecutionEventBus ─────────────────────────────────────────────────────────

type Handler<T = OrchestratorEvent> = (event: T) => void;

class ExecutionEventBus {
  private listeners = new Map<OrchestratorEventType, Set<Handler>>();
  private wildcardListeners = new Set<Handler>();

  on(type: OrchestratorEventType, handler: Handler): () => void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(handler);
    return () => this.listeners.get(type)?.delete(handler);
  }

  onAny(handler: Handler): () => void {
    this.wildcardListeners.add(handler);
    return () => this.wildcardListeners.delete(handler);
  }

  emit(type: OrchestratorEventType, payload?: Record<string, unknown>) {
    const event: OrchestratorEvent = { type, payload, timestamp: Date.now() };
    this.listeners.get(type)?.forEach(h => h(event));
    this.wildcardListeners.forEach(h => h(event));
  }

  clear() {
    this.listeners.clear();
    this.wildcardListeners.clear();
  }
}

// ── AIOrchestrator ────────────────────────────────────────────────────────────

class AIOrchestrator {
  readonly bus = new ExecutionEventBus();
  private state: OrchestratorState = { ...DEFAULT_STATE };

  getState(): Readonly<OrchestratorState> {
    return { ...this.state };
  }

  private patch(updates: Partial<OrchestratorState>) {
    this.state = { ...this.state, ...updates };
    this.bus.emit("momentum_updated", { state: this.state as unknown as Record<string, unknown> });
  }

  startTask(task: string, phase: ExecutionStage = "thinking") {
    this.patch({
      isActive: true,
      currentTask: task,
      activeSubtask: null,
      phase,
      completedOps: 0,
      pendingOps: [],
    });
    this.bus.emit("intent_detected", { task });
    this.bus.emit("planning_started", { task });
  }

  setSubtask(subtask: string) {
    this.patch({ activeSubtask: subtask });
  }

  setPhase(phase: ExecutionStage) {
    const prev = this.state.phase;
    if (prev !== phase) {
      this.patch({ phase });
      this.bus.emit("stage_changed", { from: prev, to: phase });
    }
  }

  recordThought(thought: ThoughtBlockData) {
    if (thought.insights.length) {
      this.patch({
        discoveries: [...this.state.discoveries, ...thought.insights].slice(-10),
      });
    }
    this.bus.emit("thought_generated", { thought: thought as unknown as Record<string, unknown> });
  }

  recordNarrative(text: string, stage: string) {
    this.bus.emit("narrative_generated", { text, stage });
  }

  startOperation(description: string) {
    this.patch({ pendingOps: [...this.state.pendingOps, description] });
    this.bus.emit("operation_started", { description });
  }

  completeOperation(description?: string) {
    const pending = this.state.pendingOps.slice(1);
    this.patch({
      completedOps: this.state.completedOps + 1,
      pendingOps: pending,
    });
    this.bus.emit("operation_completed", { description });
  }

  fileEdited(path: string) {
    this.patch({ sessionFileCount: this.state.sessionFileCount + 1 });
    this.bus.emit("file_edited", { path });
  }

  finishTask(summary: string) {
    this.patch({
      isActive: false,
      phase: "idle",
      activeSubtask: null,
      pendingOps: [],
      lastCompletedAt: Date.now(),
    });
    this.bus.emit("task_finished", { summary });
    this.bus.emit("build_completed", { summary });
  }

  reset() {
    this.state = { ...DEFAULT_STATE };
    this.bus.emit("momentum_updated", { state: this.state as unknown as Record<string, unknown> });
  }
}

// ── AdaptiveExecutionEngine ───────────────────────────────────────────────────
// The AI's sense of self-direction. Controls when and how the AI adapts
// its execution strategy, detects drift, and self-corrects.

const REPRIORITIZATION_MESSAGES = [
  "I'm restructuring the layout system first — the remaining sections depend on it being stable.",
  "The state flow is becoming coupled. Simplifying that before wiring the remaining layer.",
  "I'm consolidating these components now to avoid duplication further down.",
  "Shifting the order slightly — the animation layer depends on the layout being settled.",
  "Pulling the shared styles together now rather than threading them through each component.",
  "I'm addressing the spacing system before the card components — otherwise I'd be overriding twice.",
];

const DRIFT_MESSAGES = [
  "The component structure is creating more duplication than expected. Consolidating before continuing.",
  "The grid layout is getting harder to maintain responsively. Simplifying the structure now.",
  "More coupling here than the initial plan anticipated — restructuring to stay clean.",
  "The spacing is drifting from the token system. Normalizing before going further.",
  "A pattern is repeating across components that should be extracted. Doing that now.",
];

const SELF_CORRECTION_MESSAGES = [
  "Actually — there's a cleaner way to structure this.",
  "I'm changing approach slightly. The earlier pattern becomes harder to maintain at this scale.",
  "This interaction layer is more coupled than I planned. Restructuring it now.",
  "I noticed a better split for this component boundary. Adjusting before going deeper.",
];

const COMPRESSION_MESSAGES = [
  (ctx: string) => `Applying the same ${ctx} pattern across the remaining sections.`,
  (ctx: string) => `The shared ${ctx} structure is propagating cleanly through the build.`,
  (ctx: string) => `${ctx} is consistent now — carrying that through the remaining components.`,
  (ctx: string) => `Continuing the same ${ctx} approach. Steady execution from here.`,
];

const MULTITHREAD_MESSAGES = [
  "While the rebuild settles, I'm cleaning up the interaction layer.",
  "The component structure is stable — I'm reviewing responsiveness simultaneously.",
  "I'm keeping the animation system lightweight while wiring the state flow.",
  "While that lands, I'm ensuring the mobile layout stays consistent with the desktop spec.",
  "Layout is holding — tidying the type hierarchy at the same time.",
];

const STRATEGIC_SUMMARIES = [
  (ctx: string) => `The ${ctx} foundation is stable — layout, spacing, and structure are aligned. Moving deeper now.`,
  (ctx: string) => `${ctx} is behaving consistently. Connecting the remaining UI states.`,
  (ctx: string) => `Good — the ${ctx} system is clean. Wiring the remaining sections into it.`,
  (ctx: string) => `The ${ctx} work is solid. What's left is execution — no structural unknowns remaining.`,
];

export class AdaptiveExecutionEngine {
  private opCount = 0;
  private lastReprioritizationAt = -99;
  private lastSelfCorrectionAt = -99;
  private lastDriftAt = -99;
  private driftCounter = 0;
  private inSilentWindow = false;
  private silentWindowStartOp = 0;

  // Scoring: how complex is this task?
  scoreComplexity(fileCount: number, isDebug: boolean): number {
    if (isDebug) return 0.9;
    if (fileCount > 10) return 0.8;
    if (fileCount > 6)  return 0.6;
    return 0.4;
  }

  tick(): number {
    return ++this.opCount;
  }

  // Should the AI reprioritize right now?
  shouldReprioritize(): boolean {
    const gap = this.opCount - this.lastReprioritizationAt;
    // Only if 6+ ops have passed and not too recently
    if (gap < 6) return false;
    // Stochastic: ~1 in 7 ticks beyond the gap threshold
    const triggers = Math.random() < 0.14;
    if (triggers) {
      this.lastReprioritizationAt = this.opCount;
      return true;
    }
    return false;
  }

  getReprioritizationMessage(seed = ""): string {
    const idx = Math.abs(hashStr(seed + String(this.opCount))) % REPRIORITIZATION_MESSAGES.length;
    return REPRIORITIZATION_MESSAGES[idx];
  }

  // Drift detection: track complexity growth
  recordComplexitySignal() {
    this.driftCounter++;
  }

  shouldDetectDrift(): boolean {
    const gap = this.opCount - this.lastDriftAt;
    if (gap < 8 || this.driftCounter < 3) return false;
    if (Math.random() < 0.18) {
      this.lastDriftAt = this.opCount;
      this.driftCounter = 0;
      return true;
    }
    return false;
  }

  getDriftMessage(seed = ""): string {
    const idx = Math.abs(hashStr(seed + "d" + String(this.opCount))) % DRIFT_MESSAGES.length;
    return DRIFT_MESSAGES[idx];
  }

  // Self-correction: rare, high-impact moments
  shouldSelfCorrect(): boolean {
    const gap = this.opCount - this.lastSelfCorrectionAt;
    if (gap < 12) return false;
    if (Math.random() < 0.08) {
      this.lastSelfCorrectionAt = this.opCount;
      return true;
    }
    return false;
  }

  getSelfCorrectionMessage(seed = ""): string {
    const idx = Math.abs(hashStr(seed + "sc")) % SELF_CORRECTION_MESSAGES.length;
    return SELF_CORRECTION_MESSAGES[idx];
  }

  // Task compression: are we in repetitive territory?
  getCompressionMessage(context: string): string {
    const idx = Math.abs(hashStr(context + "comp")) % COMPRESSION_MESSAGES.length;
    return COMPRESSION_MESSAGES[idx](context);
  }

  // Multi-thread cognition
  getMultiThreadMessage(seed = ""): string {
    const idx = Math.abs(hashStr(seed + "mt")) % MULTITHREAD_MESSAGES.length;
    return MULTITHREAD_MESSAGES[idx];
  }

  // Strategic summary at checkpoints
  getStrategicSummary(context: string): string {
    const idx = Math.abs(hashStr(context + "summary")) % STRATEGIC_SUMMARIES.length;
    return STRATEGIC_SUMMARIES[idx](context);
  }

  // Silent window management
  enterSilentWindow() {
    this.inSilentWindow = true;
    this.silentWindowStartOp = this.opCount;
  }

  exitSilentWindow(): { opsDone: number } {
    this.inSilentWindow = false;
    return { opsDone: this.opCount - this.silentWindowStartOp };
  }

  isSilent(): boolean {
    return this.inSilentWindow;
  }

  // Micro-discovery: emergent intelligence during execution
  tryMicroDiscovery(seed = ""): string | null {
    if (this.opCount % 5 !== 0) return null;
    const DISCOVERIES = [
      "The component structure is slightly more coupled than expected — restructuring the state flow.",
      "The mobile spacing drifts below the md breakpoint. Correcting that now.",
      "Found a cleaner animation timing approach across sections.",
      "The prop pattern would create duplication later — consolidating it now.",
      "Section order works better reversed here. Adjusting.",
      "The token system from earlier is making this part significantly simpler.",
    ];
    const idx = Math.abs(hashStr(seed + String(this.opCount))) % DISCOVERIES.length;
    return DISCOVERIES[idx];
  }

  reset() {
    this.opCount = 0;
    this.lastReprioritizationAt = -99;
    this.lastSelfCorrectionAt = -99;
    this.lastDriftAt = -99;
    this.driftCounter = 0;
    this.inSilentWindow = false;
    this.silentWindowStartOp = 0;
  }
}

// ── CognitiveBandwidthManager ─────────────────────────────────────────────────
// Controls thought visibility, narration density, and pacing
// based on task complexity and execution context.

export type NarrationDensity = "full" | "compressed" | "silent";
export type ReflectionDepth  = "deep"  | "medium"    | "minimal";

export interface BandwidthAllocation {
  thoughtBlocks: boolean;
  narrationDensity: NarrationDensity;
  reflectionDepth: ReflectionDepth;
  paceMultiplier: number; // 1.0 = normal, <1 = slower, >1 = faster
}

export class CognitiveBandwidthManager {
  // Score the current task: returns 0.0 (trivial) to 1.0 (very complex)
  score(opts: {
    fileCount: number;
    isDebug: boolean;
    hasArchitecturalChange: boolean;
    isRepetitive: boolean;
  }): number {
    if (opts.isDebug && opts.hasArchitecturalChange) return 1.0;
    if (opts.isDebug) return 0.85;
    if (opts.hasArchitecturalChange) return 0.75;
    if (opts.fileCount > 10) return 0.65;
    if (opts.isRepetitive) return 0.2;
    if (opts.fileCount > 5) return 0.5;
    return 0.4;
  }

  // Return the bandwidth allocation for a given complexity score
  allocate(complexity: number): BandwidthAllocation {
    if (complexity >= 0.8) {
      return {
        thoughtBlocks: true,
        narrationDensity: "full",
        reflectionDepth: "deep",
        paceMultiplier: 0.7, // slower, more deliberate
      };
    }
    if (complexity >= 0.5) {
      return {
        thoughtBlocks: Math.random() > 0.4, // sometimes
        narrationDensity: "full",
        reflectionDepth: "medium",
        paceMultiplier: 1.0,
      };
    }
    if (complexity >= 0.25) {
      return {
        thoughtBlocks: false,
        narrationDensity: "compressed",
        reflectionDepth: "minimal",
        paceMultiplier: 1.3,
      };
    }
    return {
      thoughtBlocks: false,
      narrationDensity: "silent",
      reflectionDepth: "minimal",
      paceMultiplier: 1.8, // fast, quiet
    };
  }
}

// ── CadenceEngine ─────────────────────────────────────────────────────────────

export class CadenceEngine {
  private completedPhases: string[] = [];
  private discoveryCount = 0;
  private readonly discoveryFrequency: number;

  constructor(frequency = 4) {
    this.discoveryFrequency = frequency;
  }

  recordPhase(label: string) {
    this.completedPhases.push(label);
  }

  tryMicroDiscovery(currentOp: number, seed = ""): string | null {
    this.discoveryCount++;
    if (this.discoveryCount % this.discoveryFrequency !== 0) return null;
    const DISCOVERIES = [
      "The component structure ended up slightly more coupled than expected — restructuring to keep things clean.",
      "Noticed the mobile spacing becomes inconsistent below the md breakpoint — correcting that now.",
      "Found a cleaner pattern for the animation timing across sections.",
      "The current prop shape would create duplication further down — consolidating it while it's easy.",
      "Interesting — the section order works better inverted here.",
      "The token system from earlier is making this part significantly simpler.",
    ];
    const h = Math.abs(hashStr(seed + String(currentOp)));
    return DISCOVERIES[h % DISCOVERIES.length];
  }

  getContinuityBridge(): string | null {
    if (this.completedPhases.length === 0) return null;
    const prev = this.completedPhases[this.completedPhases.length - 1];
    const BRIDGES = [
      (p: string) => `Building on the ${p} structure from earlier —`,
      (p: string) => `Now that ${p} is settled —`,
      (p: string) => `With ${p} stable, moving to`,
      (p: string) => `The earlier ${p} work sets this up cleanly —`,
    ];
    const idx = this.completedPhases.length % BRIDGES.length;
    return BRIDGES[idx](prev);
  }

  getDelay(phase: string): number {
    const base: Record<string, number> = {
      planning:     900,
      architecture: 450,
      building:     80,
      debugging:    1200,
      finalizing:   200,
      idle:         0,
    };
    const b = base[phase] ?? 400;
    return b + Math.random() * (b * 0.3);
  }

  reset() {
    this.completedPhases = [];
    this.discoveryCount = 0;
  }
}

// ── Internal utilities ────────────────────────────────────────────────────────

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

// ── NarrativeDeduplicationEngine (frontend) ───────────────────────────────────
// Prevents repeated phrasing across thinking-phase messages within a session.
// Simpler than the server-side version — just tracks recent starters and
// provides variant rotation for the workspace UI.

export class NarrativeDeduplicationEngine {
  private usedStarts: string[] = [];
  private lastVariantIdx: Record<string, number> = {};
  private maxHistory = 10;

  isDuplicate(text: string): boolean {
    const start = text.slice(0, 28).toLowerCase();
    return this.usedStarts.includes(start);
  }

  record(text: string) {
    const start = text.slice(0, 28).toLowerCase();
    if (!this.usedStarts.includes(start)) {
      this.usedStarts.push(start);
      if (this.usedStarts.length > this.maxHistory) this.usedStarts.shift();
    }
  }

  // Pick a variant that wasn't used last time for this key.
  // Guarantees rotation — never repeats the same index twice in a row.
  pickNext<T>(variants: T[], key: string): T {
    if (!variants.length) throw new Error("Empty variants array");
    const last = this.lastVariantIdx[key] ?? -1;
    // Prefer indices other than last; rotate deterministically
    const nextIdx = (last + 1) % variants.length;
    this.lastVariantIdx[key] = nextIdx;
    return variants[nextIdx];
  }

  // Use when a fresh session starts (new prompt submitted)
  reset() {
    this.usedStarts = [];
    // Keep lastVariantIdx so rotation continues across sessions
  }
}

// ── DesignTasteTracker (frontend) ─────────────────────────────────────────────
// Client-side aesthetic continuity tracker — generates taste-continuity
// messages for thinking-phase transitions.

export class DesignTasteTrackerFE {
  private established: string[] = [];
  private lastContinuityIdx = -1;

  record(pattern: string) {
    if (!this.established.includes(pattern)) this.established.push(pattern);
  }

  getContinuityHint(): string | null {
    if (this.established.length < 2) return null;
    const CONTINUITY = [
      "Carrying the same visual rhythm through the remaining sections.",
      "The spacing and type scale established earlier is propagating cleanly.",
      "Aesthetic consistency is holding — no overrides needed downstream.",
      "The visual system from earlier sections is making this faster.",
    ];
    this.lastContinuityIdx = (this.lastContinuityIdx + 1) % CONTINUITY.length;
    return CONTINUITY[this.lastContinuityIdx];
  }

  reset() {
    this.established = [];
    this.lastContinuityIdx = -1;
  }
}

// ── Singleton exports ─────────────────────────────────────────────────────────

export const orchestrator = new AIOrchestrator();
export const cadence      = new CadenceEngine();
export const adaptive     = new AdaptiveExecutionEngine();
export const bandwidth    = new CognitiveBandwidthManager();
export const dedup        = new NarrativeDeduplicationEngine();
export const tasteTracker = new DesignTasteTrackerFE();
export { ExecutionEventBus };
