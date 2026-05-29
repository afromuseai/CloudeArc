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

// ── Singleton export ──────────────────────────────────────────────────────────
// One orchestrator instance for the entire app session.

export const orchestrator = new AIOrchestrator();
export { ExecutionEventBus };
