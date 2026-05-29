// ── ExecutionEventBus + AIOrchestrator ────────────────────────────────────────
// Central runtime for all AI activity. The UI subscribes to this bus
// instead of managing isolated local state.

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
  | "momentum_updated";

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

  // ── Lifecycle methods ───────────────────────────────────────────────────────

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

// ── CadenceEngine ─────────────────────────────────────────────────────────────
// Controls narrative rhythm and micro-discovery generation.
// The goal: feel like emergent intelligence, not a progress dashboard.

const MICRO_DISCOVERIES = [
  "The component structure ended up slightly more coupled than expected — restructuring to keep things clean.",
  "Noticed the mobile spacing becomes inconsistent below the md breakpoint — correcting that now.",
  "Found a cleaner pattern for the animation timing across sections.",
  "The current prop shape would create duplication further down — consolidating it while it's easy.",
  "Interesting — the section order works better inverted here.",
  "The token system from earlier is making this part significantly simpler.",
  "Caught a z-index conflict between the navbar and modal layer — resolving that now.",
];

const CONTINUITY_BRIDGES = [
  (prev: string) => `Building on the ${prev} structure from earlier —`,
  (prev: string) => `Now that ${prev} is settled —`,
  (prev: string) => `With ${prev} stable, moving to`,
  (prev: string) => `The earlier ${prev} work sets this up cleanly —`,
];

export class CadenceEngine {
  private completedPhases: string[] = [];
  private discoveryCount = 0;
  private readonly discoveryFrequency: number; // emit a discovery every N operations

  constructor(frequency = 4) {
    this.discoveryFrequency = frequency;
  }

  // Record a completed phase so we can build continuity bridges
  recordPhase(label: string) {
    this.completedPhases.push(label);
  }

  // Get a micro-discovery if the cadence calls for it
  tryMicroDiscovery(currentOp: number, seed = ""): string | null {
    this.discoveryCount++;
    if (this.discoveryCount % this.discoveryFrequency !== 0) return null;
    const h = Math.abs(hashStr(seed + String(currentOp)));
    return MICRO_DISCOVERIES[h % MICRO_DISCOVERIES.length];
  }

  // Build a continuity bridge from the last completed phase
  getContinuityBridge(): string | null {
    if (this.completedPhases.length === 0) return null;
    const prev = this.completedPhases[this.completedPhases.length - 1];
    const idx = this.completedPhases.length % CONTINUITY_BRIDGES.length;
    return CONTINUITY_BRIDGES[idx](prev);
  }

  // Compute a natural delay for the current phase
  // Planning = slower/reflective, building = faster/momentum
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

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

// ── Singleton export ──────────────────────────────────────────────────────────
// One orchestrator instance for the entire app session.

export const orchestrator = new AIOrchestrator();
export const cadence = new CadenceEngine();
export { ExecutionEventBus };
