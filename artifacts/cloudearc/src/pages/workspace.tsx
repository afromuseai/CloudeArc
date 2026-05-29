import Editor from "@monaco-editor/react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { AgentLivenessIndicator, type ExecutionStage } from "../components/AgentLivenessIndicator";
import { ThoughtBlock, type ThoughtBlockData } from "../components/ThoughtBlock";
import { orchestrator } from "../lib/orchestrator";
import debounce from "lodash/debounce";
import { zipSync, strToU8 } from "fflate";
import {
  connectCollab,
  disconnectCollab,
  emitFileWrite,
  emitFileDelete,
  emitChatMessage,
  emitBuildStarted,
  getMyUser,
  type CollabUser,
} from "../lib/collab";

// ─── helpers ────────────────────────────────────────────────────────────────

let _id = 0;
const uid = () => ++_id;

function describePrompt(p: string): string {
  const s = p.toLowerCase();
  if (s.includes("landing")) return "landing page";
  if (s.includes("dashboard")) return "dashboard";
  if (s.includes("portfolio")) return "portfolio";
  if (s.includes("blog")) return "blog";
  if (s.includes("login") || s.includes("auth")) return "auth flow";
  if (s.includes("form")) return "form";
  if (s.includes("calculator")) return "calculator";
  if (s.includes("todo") || s.includes("to-do") || s.includes("task")) return "task manager";
  if (s.includes("chat")) return "chat UI";
  if (s.includes("weather")) return "weather app";
  if (s.includes("shop") || s.includes("store") || s.includes("product")) return "storefront";
  if (s.includes("game")) return "game";
  return "app";
}

function fileLabel(path: string): string {
  if (path.endsWith(".tsx") || path.endsWith(".jsx")) return "component";
  if (path.endsWith(".ts") || path.endsWith(".js")) return "script";
  if (path.endsWith(".css")) return "stylesheet";
  if (path.endsWith(".html")) return "page";
  if (path.endsWith(".json")) return "config";
  return "file";
}

function shortPath(path: string): string {
  return path.replace(/^\//, "").split("/").slice(-2).join("/");
}

function fileStepMessage(path: string): string {
  const name = (path.split("/").pop() ?? "").toLowerCase();
  if (name === "design.css") return "Establishing design token system";
  if (name === "theme.css") return "Applying color palette and typography scale";
  if (name.includes("main.")) return "Bootstrapping React render tree";
  if (name.includes("app.")) return "Composing top-level component layout";
  if (/navbar|nav\.|header/.test(name)) return "Wiring sticky navigation with mobile toggle";
  if (/hero/.test(name)) return "Composing hero with gradient headline and CTA";
  if (/feature/.test(name)) return "Building feature grid with hover cards";
  if (/pricing|plan/.test(name)) return "Generating pricing tiers with comparison table";
  if (/testimonial|review/.test(name)) return "Populating social proof section";
  if (/cta|callto/.test(name)) return "Constructing conversion-focused CTA block";
  if (/footer/.test(name)) return "Assembling footer with link columns";
  if (/sidebar/.test(name)) return "Building collapsible sidebar navigation";
  if (/dashboard/.test(name)) return "Laying out analytics dashboard grid";
  if (/metric|stat/.test(name)) return "Rendering KPI metrics with live data";
  if (/chart|graph/.test(name)) return "Drawing chart components with data bindings";
  if (/modal|dialog/.test(name)) return "Creating modal overlay with focus trap";
  if (/table|list/.test(name)) return "Generating sortable data table";
  if (/about/.test(name)) return "Crafting about section with team grid";
  if (/contact/.test(name)) return "Building contact form with validation";
  if (path.endsWith(".css")) return "Applying responsive utility styles";
  if (path.endsWith(".html")) return "Scaffolding HTML shell with meta tags";
  return `Writing ${fileLabel(path)}`;
}

function fileTypeColor(path: string): string {
  if (path.endsWith(".jsx") || path.endsWith(".tsx")) return "#a78bfa";
  if (path.endsWith(".css")) return "#38bdf8";
  if (path.endsWith(".html")) return "#fb923c";
  if (path.endsWith(".ts") || path.endsWith(".js")) return "#facc15";
  if (path.endsWith(".json")) return "#4ade80";
  return "#94a3b8";
}

function editStepMessage(path: string): string {
  const name = (path.split("/").pop() ?? "").toLowerCase();
  if (/navbar|nav\.|header/.test(name)) return "Refactoring navigation layout";
  if (/hero/.test(name)) return "Patching hero section";
  if (/feature/.test(name)) return "Adjusting feature grid markup";
  if (/pricing|plan/.test(name)) return "Updating pricing tier configuration";
  if (/testimonial|review/.test(name)) return "Refreshing testimonial content";
  if (/cta|callto/.test(name)) return "Tuning CTA copy and styling";
  if (/footer/.test(name)) return "Revising footer structure";
  if (/sidebar/.test(name)) return "Updating sidebar state logic";
  if (/dashboard/.test(name)) return "Patching dashboard layout";
  if (/metric|stat/.test(name)) return "Updating metric bindings";
  if (/about/.test(name)) return "Revising about section content";
  if (/contact/.test(name)) return "Patching contact form logic";
  if (name === "design.css") return "Revising design token values";
  if (name === "theme.css") return "Updating color and spacing scale";
  if (name.includes("app.")) return "Adjusting root component structure";
  if (path.endsWith(".css")) return "Patching utility class overrides";
  return `Refactoring ${fileLabel(path)}`;
}

function describeEditPrompt(p: string): string {
  const s = p.toLowerCase();
  if (/navbar|nav\b|navigation/.test(s)) return "navbar";
  if (/hero/.test(s)) return "hero section";
  if (/footer/.test(s)) return "footer";
  if (/pricing/.test(s)) return "pricing";
  if (/button/.test(s)) return "buttons";
  if (/color|dark|light|theme/.test(s)) return "colors";
  if (/spacing|padding|margin/.test(s)) return "spacing";
  if (/font|text|typography/.test(s)) return "typography";
  if (/mobile|responsive/.test(s)) return "mobile layout";
  if (/animation|transition/.test(s)) return "animations";
  if (/gradient/.test(s)) return "gradients";
  if (/background|bg/.test(s)) return "background";
  return "design";
}

function isEditIntent(prompt: string, files: Record<string, string>): boolean {
  if (Object.keys(files).length <= 1) return false;
  const p = prompt.toLowerCase().trim();
  const buildTriggers = [
    /^build\s/i, /^create\s+a\s/i, /^create\s+me\s/i, /^generate\s/i,
    /^make\s+a\s/i, /^make\s+me\s+a\s/i, /^start\s+a\s/i,
    /^build\s+me\s/i, /^i\s+want\s+a\s/i,
  ];
  if (buildTriggers.some((r) => r.test(p))) return false;
  const editKeywords = [
    "make", "change", "update", "add", "remove", "fix", "improve", "adjust",
    "move", "increase", "decrease", "make it", "make the", "make them",
    "darker", "lighter", "bigger", "smaller", "more", "less",
    "better", "premium", "rounded", "gradient", "spacing", "color", "font",
    "background", "padding", "margin", "size", "style", "layout",
    "animation", "transition", "hover", "mobile", "responsive", "glowing",
    "navbar", "hero", "footer", "button", "section", "header", "pricing",
    "text", "heading", "typography", "redesign", "tweak", "shift",
  ];
  return editKeywords.some((kw) => p.includes(kw));
}

// ─── intent classification ────────────────────────────────────────────────────

type MessageIntent = "question" | "build" | "modify" | "debug";

function classifyIntent(prompt: string, files: Record<string, string>): MessageIntent {
  const p     = prompt.toLowerCase().trim();
  const hasApp = Object.keys(files).length > 1;

  // Pure question starters — no build action
  if (/^(how does|how do|how can|how would|how should|how is)\b/.test(p))  return "question";
  if (/^(what is|what are|what does|what's|what was|what will)\b/.test(p)) return "question";
  if (/^(why (does|is|isn'?t|would|should|can'?t|won'?t))\b/.test(p))     return "question";
  if (/^(can you explain|explain |tell me (about|how|what|why)|help me understand)\b/.test(p)) return "question";
  if (/^(is (it|there|this|that)|are (there|these|those)|does (it|this))\b/.test(p)) return "question";
  if (/\?$/.test(p) && !/^(can you|could you|would you|please)\s+(build|create|make|add|implement|generate|write)/i.test(p)) return "question";

  // Debug / investigation
  if (/\b(debug|broken|there'?s (a|an) (bug|error|issue)|crashing|crash)\b/.test(p))   return "debug";
  if (/\b(fix (this|the|a |my )(error|bug|issue|problem)|not working)\b/.test(p))       return "debug";
  if (/\b(why (is it|is this|isn'?t|doesn'?t|won'?t|can'?t)|what'?s wrong)\b/.test(p)) return "debug";

  // Explicit fresh build
  if (/^(build |create (a|an|me|my|new) |generate (a|an) |make (a|an|me|my) |start (a|an) |write (a|an) |i want (a|an) |give me (a|an) |i need (a|an) )/i.test(p)) return "build";

  if (!hasApp) return "build";
  return "modify";
}

// ─── feed types ─────────────────────────────────────────────────────────────

type StepState = "running" | "done" | "error";

type Step = {
  id: number;
  text: string;
  path?: string;
  state: StepState;
  enteredAt: number;
};

type TaskCard = {
  kind: "task";
  id: number;
  label: string;
  steps: Step[];
  state: "thinking" | "running" | "done" | "error";
  summary: string;
  collapsed: boolean;
  fileCount: number;
  executionStage: ExecutionStage;
};

type UserBubble = {
  kind: "user";
  id: number;
  content: string;
};

type NarrativeMessage = {
  kind: "narrative";
  id: number;
  text: string;
  stage: "understanding" | "planning" | "building" | "done";
};

type ConverseBubble = {
  kind: "converse";
  id: number;
  text: string;
  intent: "question" | "debug";
  loading: boolean;
};

type ThoughtBlockItem = {
  kind: "thought";
  id: number;
  data: ThoughtBlockData;
};

type FeedItem = UserBubble | TaskCard | NarrativeMessage | ConverseBubble | ThoughtBlockItem;

// ─── inline styles injected once ────────────────────────────────────────────

const GLOBAL_STYLES = `
@keyframes ca-slide-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ca-shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
@keyframes ca-blink {
  0%, 80%, 100% { opacity: 0.2; }
  40%            { opacity: 1; }
}
@keyframes ca-cursor {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
.ca-step-row { animation: ca-slide-in 200ms ease-out both; }
.ca-shimmer-bar::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
  animation: ca-shimmer 1.6s ease-in-out infinite;
}
.ca-dot { animation: ca-blink 1.4s ease-in-out infinite; }
.ca-dot:nth-child(2) { animation-delay: 0.2s; }
.ca-dot:nth-child(3) { animation-delay: 0.4s; }
.ca-cursor { animation: ca-cursor 600ms steps(1) infinite; }

`;

// ─── execution phase + operation metadata ────────────────────────────────────

const PHASE_META: Record<ExecutionStage, { label: string; color: string; dot: string }> = {
  thinking:   { label: "UNDERSTANDING", color: "#a78bfa", dot: "#a78bfa" },
  planning:   { label: "PLANNING",      color: "#38bdf8", dot: "#38bdf8" },
  building:   { label: "BUILDING",      color: "#34d399", dot: "#34d399" },
  debugging:  { label: "INVESTIGATING", color: "#fb923c", dot: "#fb923c" },
  finalizing: { label: "FINALIZING",    color: "#f472b6", dot: "#f472b6" },
  idle:       { label: "READY",         color: "#52525b", dot: "#52525b" },
};

type OpType = "create" | "update" | "analyze" | "style" | "validate" | "fix";

const OP_META: Record<OpType, { label: string; color: string }> = {
  create:   { label: "create",   color: "#34d399" },
  update:   { label: "update",   color: "#60a5fa" },
  analyze:  { label: "scan",     color: "#fb923c" },
  style:    { label: "style",    color: "#f472b6" },
  validate: { label: "run",      color: "#a78bfa" },
  fix:      { label: "fix",      color: "#fb923c" },
};

function inferOpType(text: string, path?: string): OpType {
  const t = text.toLowerCase();
  if (/analyz|scanning|inspect|review|identify|interpret|understand/.test(t)) return "analyze";
  if (/bundl|preview|validat|compil/.test(t)) return "validate";
  if (/fixing|correcting|resolv|debug/.test(t)) return "fix";
  if (/updating|adjusting|changing|modif/.test(t)) return "update";
  if (/styling|color|theme|palette/.test(t) || path?.endsWith(".css")) return "style";
  return "create";
}

// ─── sub-components ──────────────────────────────────────────────────────────

function Spinner({ size = 14, dim = false }: { size?: number; dim?: boolean }) {
  return (
    <span
      style={{ width: size, height: size }}
      className={`inline-block shrink-0 rounded-full border-[1.5px] animate-spin
        ${dim ? "border-zinc-700 border-t-zinc-500" : "border-zinc-600 border-t-zinc-200"}`}
    />
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-[3px] ml-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="ca-dot w-[3px] h-[3px] rounded-full bg-zinc-400 inline-block"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </span>
  );
}

function StepRow({ step }: { step: Step }) {
  const color = step.path ? fileTypeColor(step.path) : "#94a3b8";
  return (
    <div
      className="ca-step-row flex items-start gap-2 text-xs py-[3px]"
      style={{ animationDelay: "0ms" }}
    >
      <span className="mt-[1px] shrink-0 w-3.5 flex justify-center">
        {step.state === "running" && <Spinner size={10} dim />}
        {step.state === "done" && <span className="text-zinc-600 text-[10px] leading-none">✓</span>}
        {step.state === "error" && <span className="text-red-500 text-[10px] leading-none">✗</span>}
      </span>

      <span className={`flex-1 leading-relaxed ${
        step.state === "running" ? "text-zinc-300" :
        step.state === "done"    ? "text-zinc-600" :
        "text-red-400"
      }`}>
        {step.text}
        {step.path && (
          <span
            className="ml-1.5 font-mono text-[10px] opacity-60"
            style={{ color }}
          >
            {shortPath(step.path)}
          </span>
        )}
      </span>
    </div>
  );
}

function TaskCardView({
  task,
  onToggle,
}: {
  task: TaskCard;
  onToggle: (id: number) => void;
}) {
  const canCollapse = task.state === "done" || task.state === "error";
  const showSteps = !task.collapsed && task.steps.length > 0;
  const isActive = task.state === "thinking" || task.state === "running";

  return (
    <div
      className="rounded-xl border border-white/[0.07] bg-white/[0.025] overflow-hidden transition-all duration-300"
      style={{
        boxShadow: isActive ? "0 0 0 1px rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.3)" : "none",
      }}
    >
      {/* Progress bar */}
      {isActive && (
        <div className="h-[2px] w-full bg-white/[0.06] relative overflow-hidden ca-shimmer-bar" />
      )}
      {task.state === "done" && (
        <div className="h-[2px] w-full bg-white/[0.1]" />
      )}

      {/* Header */}
      <button
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
        onClick={() => canCollapse && onToggle(task.id)}
      >
        <span className="shrink-0">
          {task.state === "thinking" && <Spinner size={13} />}
          {task.state === "running"  && <Spinner size={13} />}
          {task.state === "done" && (
            <span className="inline-flex w-[13px] h-[13px] items-center justify-center rounded-full bg-white/10">
              <span className="text-[9px] text-zinc-300">✓</span>
            </span>
          )}
          {task.state === "error" && (
            <span className="inline-flex w-[13px] h-[13px] items-center justify-center rounded-full bg-red-500/20">
              <span className="text-[9px] text-red-400">✗</span>
            </span>
          )}
        </span>

        <span className={`flex-1 text-sm font-medium leading-snug min-w-0 ${
          task.state === "done" ? "text-zinc-400" : "text-zinc-200"
        }`}>
          {task.label}
          {task.state === "thinking" && <ThinkingDots />}
        </span>

        {task.fileCount > 0 && (
          <span className="shrink-0 text-[10px] text-zinc-600 tabular-nums mr-0.5">
            {task.fileCount} file{task.fileCount !== 1 ? "s" : ""}
          </span>
        )}

        {canCollapse && (
          <span className="text-zinc-600 text-xs shrink-0">
            {task.collapsed ? "▸" : "▾"}
          </span>
        )}
      </button>

      {/* Steps */}
      {showSteps && (
        <div className="px-3 pb-2.5 border-t border-white/[0.04] pt-2 space-y-[1px]">
          {task.steps.map((s) => <StepRow key={s.id} step={s} />)}
        </div>
      )}

      {/* Summary */}
      {task.summary && !task.collapsed && (
        <div className={`px-3 pb-3 text-xs leading-relaxed ${
          task.state === "error" ? "text-red-400" : "text-zinc-500"
        }`}>
          {task.summary}
        </div>
      )}
    </div>
  );
}

// ─── AI narrative — primary conversational voice ──────────────────────────────

function AgentBubble({ msg }: { msg: NarrativeMessage }) {
  const [displayed, setDisplayed] = useState("");
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    if (!msg.text) return;
    setDisplayed("");
    setTyping(true);
    let i = 0;
    const MS_PER_CHAR = 18;
    const timer = setInterval(() => {
      i += Math.random() < 0.15 ? 2 : 1;
      if (i >= msg.text.length) {
        setDisplayed(msg.text);
        setTyping(false);
        clearInterval(timer);
      } else {
        setDisplayed(msg.text.slice(0, i));
      }
    }, MS_PER_CHAR);
    return () => clearInterval(timer);
  }, [msg.text]);

  return (
    <div className="ca-step-row py-0.5 pl-1">
      <p
        className="text-[12.5px] leading-[1.75] whitespace-pre-line"
        style={{ color: "rgba(212,212,216,0.9)" }}
      >
        {displayed}
        {typing && (
          <span
            className="ca-cursor inline-block w-[1.5px] h-[12px] ml-[1px] rounded-sm bg-zinc-400"
            style={{ verticalAlign: "text-bottom" }}
          />
        )}
      </p>
    </div>
  );
}

// ─── conversational answer bubble ─────────────────────────────────────────────

function ConverseAnswer({ msg }: { msg: ConverseBubble }) {
  const [displayed, setDisplayed] = useState("");
  const [typing, setTyping]       = useState(false);

  useEffect(() => {
    if (msg.loading || !msg.text) return;
    setDisplayed("");
    setTyping(true);
    let i = 0;
    const MS = 6;
    const t = setInterval(() => {
      i++;
      if (i >= msg.text.length) {
        setDisplayed(msg.text);
        setTyping(false);
        clearInterval(t);
      } else {
        setDisplayed(msg.text.slice(0, i));
      }
    }, MS);
    return () => clearInterval(t);
  }, [msg.text, msg.loading]);

  const isDebug = msg.intent === "debug";

  return (
    <div className="ca-step-row flex items-start gap-2.5">
      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-[1px] ${
        isDebug
          ? "text-orange-400 bg-orange-400/10 border-orange-400/15"
          : "text-sky-400 bg-sky-400/10 border-sky-400/15"
      }`}>
        {isDebug ? (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        ) : (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 2a7 7 0 0 1 7 7c0 3.5-2 5.5-4 7v1a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-1c-2-1.5-4-3.5-4-7a7 7 0 0 1 7-7z" /><line x1="9" y1="21" x2="15" y2="21" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {msg.loading ? (
          <div className="flex items-center gap-1.5 py-0.5">
            <span className="text-[12px] text-zinc-500">{isDebug ? "Let me look into this…" : "Thinking…"}</span>
            <ThinkingDots />
          </div>
        ) : (
          <p className="text-[12.5px] leading-[1.75] whitespace-pre-line" style={{ color: "rgba(212,212,216,0.9)" }}>
            {displayed}
            {typing && (
              <span
                className="ca-cursor inline-block w-[1.5px] h-[12px] bg-zinc-400 ml-[1px] rounded-sm"
                style={{ verticalAlign: "text-bottom" }}
              />
            )}
          </p>
        )}
      </div>
    </div>
  );
}


// ─── operation trace row ─────────────────────────────────────────────────────

function OperationRow({ step, active }: { step: Step; active: boolean }) {
  const op = inferOpType(step.text, step.path ?? undefined);
  const { label: opLabel, color: opColor } = OP_META[op];
  const isDone   = step.state === "done";
  const isRun    = step.state === "running";
  const filename = step.path ? step.path.split("/").pop()! : null;
  const fileColor = step.path ? fileTypeColor(step.path) : "#71717a";

  return (
    <div
      className="flex items-center gap-2 py-[2px] transition-opacity duration-300"
      style={{ opacity: isDone ? 0.45 : 1 }}
    >
      {/* State glyph */}
      {isDone ? (
        <span className="shrink-0 text-[8px]" style={{ color: "#34d399" }}>✓</span>
      ) : isRun ? (
        <span className="shrink-0 text-[8px] animate-pulse" style={{ color: opColor }}>▶</span>
      ) : (
        <span className="shrink-0 text-[8px] text-zinc-700">○</span>
      )}
      {/* op type label */}
      <span
        className="shrink-0 font-mono text-[9px] w-[42px] text-right"
        style={{ color: opColor }}
      >
        {opLabel}
      </span>
      {/* step text */}
      <span className="flex-1 min-w-0 text-[10px] truncate text-zinc-400">
        {step.text}
      </span>
      {/* filename chip */}
      {filename && (
        <span
          className="shrink-0 font-mono text-[9px] truncate"
          style={{ color: fileColor, maxWidth: 80 }}
        >
          {filename}
        </span>
      )}
    </div>
  );
}

// ─── task status — compact secondary metadata ────────────────────────────────

function BuildStatusLine({ task }: { task: TaskCard }) {
  const isActive = task.state === "thinking" || task.state === "running";
  const isDone   = task.state === "done";
  const isError  = task.state === "error";
  const phase    = PHASE_META[task.executionStage] ?? PHASE_META.thinking;

  if (isDone) {
    return (
      <div className="ca-step-row flex items-center gap-2 py-0.5 opacity-50">
        <span className="text-[8px]" style={{ color: "#34d399" }}>✓</span>
        <span className="text-[10px] text-zinc-600 truncate">{task.label}</span>
        {task.fileCount > 0 && (
          <span className="ml-auto shrink-0 text-[9px] text-zinc-700 tabular-nums font-mono">
            {task.fileCount}f
          </span>
        )}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="ca-step-row flex items-center gap-2 py-0.5">
        <span className="text-[8px] text-red-500">✗</span>
        <span className="text-[10px] text-red-400 truncate">{task.label}</span>
      </div>
    );
  }

  // Active — liveness animation + phase badge + last few file ops as subtle metadata
  const recentFileSteps = task.steps.filter((s) => s.path).slice(-4);

  return (
    <div className="ca-step-row space-y-1">
      {/* Compact status row */}
      <div className="flex items-center gap-2">
        <AgentLivenessIndicator active={true} size={18} stage={task.executionStage} />
        <span
          className="text-[9px] uppercase tracking-[0.1em] font-semibold select-none"
          style={{ color: phase.color, opacity: 0.8 }}
        >
          {phase.label}
        </span>
        {task.fileCount > 0 && (
          <span className="ml-auto shrink-0 text-[9px] text-zinc-700 tabular-nums font-mono">
            {task.fileCount}f
          </span>
        )}
      </div>

      {/* File operations — secondary, very subtle */}
      {recentFileSteps.length > 0 && (
        <div className="pl-5 space-y-0 opacity-60">
          {recentFileSteps.map((s) => {
            const isDone = s.state === "done";
            const fileColor = s.path ? fileTypeColor(s.path) : "#71717a";
            const filename = s.path ? s.path.split("/").pop()! : s.text;
            return (
              <div key={s.id} className="flex items-center gap-1.5 py-[1px]">
                <span className="text-[7px]" style={{ color: isDone ? "#34d399" : fileColor }}>
                  {isDone ? "✓" : "▸"}
                </span>
                <span className="font-mono text-[9px] truncate text-zinc-600">{filename}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── preview flash overlay ───────────────────────────────────────────────────

function PreviewFlash({ active }: { active: boolean }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-300"
      style={{
        background: "rgba(255,255,255,0.06)",
        opacity: active ? 1 : 0,
      }}
    />
  );
}

// ─── premium preview skeleton ─────────────────────────────────────────────────

function Bone({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`preview-shimmer rounded-lg ${className}`}
      style={style}
    />
  );
}

function PreviewSkeleton() {
  return (
    <div className="w-full h-full flex flex-col bg-[#0A0A0A] overflow-hidden relative">
      {/* Ambient glow */}
      <div
        className="preview-glow-pulse absolute pointer-events-none"
        style={{
          top: "-80px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "360px",
          background: "radial-gradient(ellipse at center, rgba(255,255,255,0.055) 0%, transparent 70%)",
          filter: "blur(24px)",
        }}
      />

      {/* Navbar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/[0.04] shrink-0 relative">
        <div className="flex items-center gap-6">
          <Bone className="h-5 w-24" />
          <div className="flex items-center gap-4">
            <Bone className="h-3 w-14" />
            <Bone className="h-3 w-16" />
            <Bone className="h-3 w-12" />
            <Bone className="h-3 w-18" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Bone className="h-3 w-16" />
          <Bone className="h-8 w-24 rounded-full" />
        </div>
      </div>

      {/* Hero */}
      <div className="flex flex-col items-center pt-16 pb-10 px-8 relative shrink-0">
        <Bone className="h-3 w-20 rounded-full mb-5" />
        <Bone className="h-9 w-[480px] max-w-full mb-3" />
        <Bone className="h-9 w-[360px] max-w-full mb-6" />
        <div className="flex flex-col items-center gap-2 mb-8 w-full">
          <Bone className="h-3 w-[400px] max-w-full" />
          <Bone className="h-3 w-[340px] max-w-full" />
          <Bone className="h-3 w-[280px] max-w-full" />
        </div>
        <div className="flex items-center gap-3">
          <Bone className="h-10 w-36 rounded-full" />
          <Bone className="h-10 w-28 rounded-full" />
        </div>
      </div>

      {/* Card grid */}
      <div className="px-8 pb-8 flex-1 overflow-hidden">
        <div className="flex items-center gap-3 mb-6">
          <Bone className="h-px flex-1" style={{ borderRadius: 0 }} />
          <Bone className="h-2.5 w-28" />
          <Bone className="h-px flex-1" style={{ borderRadius: 0 }} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-white/[0.05] overflow-hidden"
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              <Bone className="h-36 w-full rounded-none rounded-t-xl" />
              <div className="p-4 space-y-2.5">
                <Bone className="h-3.5 w-3/4" />
                <Bone className="h-3 w-full" />
                <Bone className="h-3 w-5/6" />
                <div className="flex items-center gap-2 pt-1">
                  <Bone className="h-2.5 w-16" />
                  <Bone className="h-2.5 w-10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status label */}
      <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center gap-2 pointer-events-none">
        <div
          className="w-1.5 h-1.5 rounded-full bg-white/30"
          style={{ animation: "preview-shimmer 1.5s ease-in-out infinite", backgroundSize: "200% 100%" }}
        />
        <span className="text-[11px] text-white/25 tracking-wide font-medium">
          Bundling preview…
        </span>
      </div>
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

type DeviceMode = "desktop" | "tablet" | "mobile";

const DEVICE_SIZES: Record<DeviceMode, { w: string; h: string; label: string }> = {
  desktop: { w: "100%",   h: "100%",   label: "Desktop" },
  tablet:  { w: "768px",  h: "1024px", label: "Tablet"  },
  mobile:  { w: "390px",  h: "844px",  label: "Mobile"  },
};


export default function WorkspacePage({ params }: { params: { id: string } }) {
  const projectId = params.id;
  const [, navigate] = useLocation();
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [copied, setCopied] = useState(false);

  const [files, setFiles] = useState<Record<string, string>>({
    "/index.html": `<!DOCTYPE html>\n<html>\n  <body>\n    <h1>Ready</h1>\n  </body>\n</html>`,
  });
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewBuilding, setPreviewBuilding] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const filesRef = useRef<Record<string, string>>({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [tab, setTab] = useState<"preview" | "code" | "logs">("preview");
  const [activeFile, setActiveFile] = useState("/index.html");
  const [filePanelOpen, setFilePanelOpen] = useState(false);
  const [collabUsers, setCollabUsers] = useState<CollabUser[]>([]);
  const [previewFlash, setPreviewFlash] = useState(false);
  const [newFiles, setNewFiles] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [newFileName, setNewFileName] = useState<string | null>(null);
  const newFileInputRef = useRef<HTMLInputElement | null>(null);
  const myUser = useRef<CollabUser>(getMyUser());
  const [momentum, setMomentum] = useState<{ currentTask: string | null; subtask: string | null }>({
    currentTask: null,
    subtask: null,
  });
  const [styleProfile, setStyleProfile] = useState<{
    mode: string;
    label: string;
    templateType: string;
    inspiration: string | null;
    brief: string;
  } | null>(null);

  const projectName = (() => {
    try {
      const recent = JSON.parse(localStorage.getItem("cloudearc-recent") ?? "[]");
      const entry = recent.find((p: { id: string; name?: string; prompt: string }) => p.id === projectId);
      if (entry?.name) return entry.name;
      const raw = localStorage.getItem("cloudearc-project-" + projectId) ?? "";
      return raw.length > 40 ? raw.slice(0, 40) + "…" : raw || "Untitled project";
    } catch {
      return "Untitled project";
    }
  })();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const thinkTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const genRef = useRef(0);

  // Inject global keyframe styles once
  useEffect(() => {
    if (document.getElementById("ca-styles")) return;
    const el = document.createElement("style");
    el.id = "ca-styles";
    el.textContent = GLOBAL_STYLES;
    document.head.appendChild(el);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [feed]);

  // ── collab ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const socket = connectCollab(projectId);

    socket.on("room-state", ({ users }: { users: CollabUser[] }) => {
      setCollabUsers(users.filter((u) => u.id !== myUser.current.id));
    });
    socket.on("user-joined", ({ user }: { user: CollabUser }) => {
      if (user.id === myUser.current.id) return;
      setCollabUsers((prev) => prev.find((u) => u.id === user.id) ? prev : [...prev, user]);
    });
    socket.on("user-left", ({ userId }: { userId: string }) => {
      setCollabUsers((prev) => prev.filter((u) => u.id !== userId));
    });
    socket.on("file-write", ({ path, content }: { path: string; content: string }) => {
      setFiles((prev) => ({ ...prev, [path]: content }));
    });
    socket.on("file-delete", ({ path }: { path: string }) => {
      setFiles((prev) => { const c = { ...prev }; delete c[path]; return c; });
    });
    socket.on("chat-message", (msg: { kind: string; content: string; id: number }) => {
      if (msg.kind === "user")
        setFeed((prev) => [...prev, { kind: "user", id: uid(), content: msg.content } as UserBubble]);
    });
    socket.on("build-started", ({ label, user }: { label: string; user: CollabUser }) => {
      setFeed((prev) => [...prev, { kind: "user", id: uid(), content: `${user.name} is building: ${label}` } as UserBubble]);
    });

    return () => { disconnectCollab(); };
  }, [projectId]);

  // Keep filesRef in sync so callbacks always see latest files
  useEffect(() => { filesRef.current = files; }, [files]);

  const flashPreview = useCallback(() => {
    setPreviewFlash(true);
    setTimeout(() => setPreviewFlash(false), 500);
  }, []);

  const buildPreview = useCallback(async (currentFiles: Record<string, string>): Promise<boolean> => {
    setPreviewBuilding(true);
    setPreviewError(null);
    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: currentFiles }),
      });

      let data: { html?: string; error?: string } = {};
      try { data = await res.json(); } catch { data = {}; }

      if (!res.ok) {
        const msg = data.error ?? `Server error ${res.status}`;
        console.error("[preview] server error:", msg);
        setPreviewError(msg);
        return false;
      }

      if (data.error || !data.html) {
        const msg = data.error ?? "Build returned empty output";
        console.error("[preview] build error:", msg);
        setPreviewError(msg);
        return false;
      }

      setPreviewHtml(data.html);
      flashPreview();
      return true;
    } catch (err: any) {
      const msg = err.message ?? "Network error";
      console.error("[preview] build failed:", msg);
      setPreviewError(msg);
      return false;
    } finally {
      setPreviewBuilding(false);
    }
  }, [flashPreview]);

  const reloadPreview = useCallback(() => {
    buildPreview(filesRef.current);
  }, [buildPreview]);

  // ── feed mutations ───────────────────────────────────────────────────────

  const updateTask = useCallback(
    (taskId: number, updater: (t: TaskCard) => TaskCard) => {
      setFeed((prev) =>
        prev.map((item) =>
          item.kind === "task" && item.id === taskId ? updater(item) : item
        )
      );
    },
    []
  );

  const addStep = useCallback(
    (taskId: number, text: string, state: StepState = "running", path?: string): number => {
      const stepId = uid();
      updateTask(taskId, (t) => ({
        ...t,
        steps: [...t.steps, { id: stepId, text, state, path, enteredAt: Date.now() }],
      }));
      return stepId;
    },
    [updateTask]
  );

  const resolveStep = useCallback(
    (taskId: number, stepId: number, state: StepState, newText?: string) => {
      updateTask(taskId, (t) => ({
        ...t,
        steps: t.steps.map((s) =>
          s.id === stepId ? { ...s, state, text: newText ?? s.text } : s
        ),
      }));
    },
    [updateTask]
  );

  const finishTask = useCallback(
    (taskId: number, state: "done" | "error", summary: string) => {
      updateTask(taskId, (t) => ({ ...t, state, summary, collapsed: state === "done" }));
    },
    [updateTask]
  );

  // ── thinking timers ─────────────────────────────────────────────────────

  const stopThinkTimers = () => {
    thinkTimers.current.forEach(clearTimeout);
    thinkTimers.current = [];
  };

  const startEditThinkingPhase = (taskId: number) => {
    const s1 = addStep(taskId, "Looking at what's currently there...");

    const t1 = setTimeout(() => {
      resolveStep(taskId, s1, "done");
      addStep(taskId, "Found exactly where to make this change.");
    }, 1800);

    const t2 = setTimeout(() => {
      updateTask(taskId, (t) => ({
        ...t,
        state: "running",
        executionStage: "planning" as ExecutionStage,
        steps: t.steps.map((s) =>
          s.state === "running" ? { ...s, text: "Keeping it targeted — editing only what needs to move." } : s
        ),
      }));
    }, 5500);

    thinkTimers.current = [t1, t2];
  };

  const startDebugThinkingPhase = (taskId: number) => {
    const s1 = addStep(taskId, "Let me trace through what's happening here...");

    const t1 = setTimeout(() => {
      resolveStep(taskId, s1, "done");
      addStep(taskId, "Interesting — I see something worth looking at.");
    }, 2000);

    const t2 = setTimeout(() => {
      updateTask(taskId, (t) => ({
        ...t,
        state: "running",
        executionStage: "debugging" as ExecutionStage,
        steps: t.steps.map((s) =>
          s.state === "running" ? { ...s, text: "Found it — I know what needs to change." } : s
        ),
      }));
    }, 5500);

    const t3 = setTimeout(() => {
      updateTask(taskId, (t) => ({
        ...t,
        steps: t.steps.map((s) =>
          s.state === "running" ? { ...s, text: "Applying the correction now." } : s
        ),
      }));
    }, 16000);

    thinkTimers.current = [t1, t2, t3];
  };

  const startThinkingPhase = (taskId: number, userPrompt: string, intent: MessageIntent) => {
    const what = describePrompt(userPrompt);

    const s1 = addStep(taskId, "Let me think through the structure for this...");

    const t1 = setTimeout(() => {
      resolveStep(taskId, s1, "done");
      addStep(taskId, `I'll start with ${what} — getting that right sets the foundation.`);
    }, 2800);

    const t2 = setTimeout(() => {
      updateTask(taskId, (t) => ({
        ...t,
        state: "running",
        executionStage: "planning" as ExecutionStage,
        steps: t.steps.map((s) =>
          s.state === "running" ? { ...s, text: "Working through the component layout now..." } : s
        ),
      }));
    }, 9000);

    const t3 = setTimeout(() => {
      updateTask(taskId, (t) => ({
        ...t,
        executionStage: "building" as ExecutionStage,
        steps: t.steps.map((s) =>
          s.state === "running" ? { ...s, text: `Writing ${what} — almost through the main sections.` } : s
        ),
      }));
    }, 22000);

    const t4 = setTimeout(() => {
      updateTask(taskId, (t) => ({
        ...t,
        executionStage: "finalizing" as ExecutionStage,
        steps: t.steps.map((s) =>
          s.state === "running" ? { ...s, text: "Wrapping up — final files coming in." } : s
        ),
      }));
    }, 38000);

    void intent;
    thinkTimers.current = [t1, t2, t3, t4];
  };

  // ── sandbox ──────────────────────────────────────────────────────────────

  const autoSentRef = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem("cloudearc-project-" + projectId);
    setPrompt(stored);
  }, [projectId]);

  // Auto-send the initial prompt exactly once when navigating from the home page.
  // Uses sessionStorage so a page refresh does NOT re-trigger generation.
  useEffect(() => {
    if (!prompt || autoSentRef.current) return;
    const sessionKey = `ca-autosent-${projectId}`;
    if (sessionStorage.getItem(sessionKey)) return;
    autoSentRef.current = true;
    sessionStorage.setItem(sessionKey, "1");
    sendMessage(prompt);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt]);

  const debouncedWriteRef = useRef(debounce((_path: string, _content: string) => {}, 600));
  const debouncedWrite = debouncedWriteRef.current;

  useEffect(() => {
    return () => { debouncedWriteRef.current.cancel(); };
  }, []);

  // ── file delete ──────────────────────────────────────────────────────────

  const handleFileDelete = useCallback(async (path: string) => {
    setFiles((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
    setActiveFile((cur) => {
      if (cur !== path) return cur;
      const remaining = Object.keys(files).filter((f) => f !== path);
      return remaining[0] ?? "/index.html";
    });
    emitFileDelete(path);
  }, [files]);

  // ── download project ─────────────────────────────────────────────────────

  const handleDownload = useCallback(async () => {
    if (Object.keys(files).length === 0) return;
    setDownloading(true);
    try {
      const zipEntries: Record<string, Uint8Array> = {};
      for (const [path, content] of Object.entries(files)) {
        const normalised = path.replace(/^\//, "");
        zipEntries[normalised] = strToU8(content);
      }
      const zipped = zipSync(zipEntries, { level: 6 });
      const blob = new Blob([zipped], { type: "application/zip" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      const slug = projectName.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40) || "cloudearc-project";
      link.download = `${slug}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
    } finally {
      setDownloading(false);
    }
  }, [files, projectName]);

  // ── send ─────────────────────────────────────────────────────────────────

  const sendMessage = async (overrideText?: string) => {
    const userPrompt = overrideText ?? input.trim();
    if (!userPrompt || sending) return;

    const intent      = classifyIntent(userPrompt, files);
    const useEditMode = intent === "modify" || intent === "debug";
    setInput("");
    setSending(true);
    stopThinkTimers();
    debouncedWrite.cancel();

    const userBubble: UserBubble = { kind: "user", id: uid(), content: userPrompt };
    emitChatMessage({ kind: "user", content: userPrompt, id: userBubble.id });

    // ── QUESTION / INFORMATIONAL ─────────────────────────────────────────────
    if (intent === "question" || (intent === "debug" && Object.keys(files).length <= 1)) {
      const converseId = uid();
      const bubble: ConverseBubble = {
        kind: "converse",
        id: converseId,
        text: "",
        intent: intent === "debug" ? "debug" : "question",
        loading: true,
      };
      setFeed((prev) => [...prev, userBubble, bubble]);
      try {
        const r = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: userPrompt,
            fileList: Object.keys(files).filter((f) => f !== "/index.html"),
            intent: intent === "debug" ? "debug" : "question",
          }),
        });
        const data = await r.json() as { reply?: string; error?: string };
        const reply = data.reply ?? data.error ?? "I couldn't get a response — try again.";
        setFeed((prev) =>
          prev.map((item) =>
            item.kind === "converse" && item.id === converseId
              ? { ...item, text: reply, loading: false }
              : item
          )
        );
      } catch {
        setFeed((prev) =>
          prev.map((item) =>
            item.kind === "converse" && item.id === converseId
              ? { ...item, text: "Something went wrong — try again.", loading: false }
              : item
          )
        );
      } finally {
        setSending(false);
      }
      return;
    }

    // ── BUILD / MODIFY / DEBUG ───────────────────────────────────────────────
    const myGen = ++genRef.current;
    setNewFiles(new Set());
    if (intent === "build") setStyleProfile(null);

    const localFiles: Record<string, string> = { ...files };

    const initStage: ExecutionStage =
      intent === "debug" ? "debugging" : "thinking";

    const taskLabel =
      intent === "debug"   ? `Investigating ${describeEditPrompt(userPrompt)}` :
      intent === "modify"  ? `Editing your ${describeEditPrompt(userPrompt)}` :
                             `Building your ${describePrompt(userPrompt)}`;

    const taskCard: TaskCard = {
      kind: "task",
      id: uid(),
      label: taskLabel,
      steps: [],
      state: "thinking",
      summary: "",
      collapsed: false,
      fileCount: 0,
      executionStage: initStage,
    };
    emitBuildStarted(useEditMode ? describeEditPrompt(userPrompt) : describePrompt(userPrompt));

    setFeed((prev) => [...prev, userBubble, taskCard]);
    const taskId = taskCard.id;

    // Wire orchestrator — single source of truth for all AI activity
    orchestrator.startTask(taskLabel, initStage);
    setMomentum({ currentTask: taskLabel, subtask: null });

    if (intent === "debug") {
      startDebugThinkingPhase(taskId);
    } else if (intent === "modify") {
      startEditThinkingPhase(taskId);
    } else {
      startThinkingPhase(taskId, userPrompt, intent);
    }

    try {
      const controller = new AbortController();
      const hardTimeout = setTimeout(() => controller.abort(), 120_000);

      let res: Response;
      try {
        res = await fetch(useEditMode ? "/api/edit" : "/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            useEditMode
              ? { prompt: userPrompt, files, styleProfile }
              : { prompt: userPrompt, context: { projectId, files: Object.keys(files) } }
          ),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(hardTimeout);
      }

      if (!res.ok || !res.body) {
        stopThinkTimers();
        let msg = "Request failed.";
        try {
          const errText = await res.text();
          msg = JSON.parse(errText)?.message ?? msg;
        } catch { /* ignore */ }
        updateTask(taskId, (t) => ({
          ...t,
          steps: t.steps.map((s) => s.state === "running" ? { ...s, state: "error" } : s),
        }));
        finishTask(taskId, "error", msg);
        return;
      }

      // ── SSE stream ────────────────────────────────────────────────────
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let written = 0;
      const failed: string[] = [];
      let realEventsStarted = false;

      const activateRealMode = () => {
        if (!realEventsStarted) {
          realEventsStarted = true;
          stopThinkTimers();
          setTab("preview");
          setPreviewError(null);
          if (!previewHtml) setPreviewBuilding(true);
          updateTask(taskId, (t) => ({
            ...t,
            state: "running",
            executionStage: intent === "debug" ? "debugging" : "planning",
            steps: t.steps.map((s) =>
              s.state === "running" ? { ...s, state: "done" } : s
            ),
          }));
        }
      };

      outer: while (true) {
        let chunk: ReadableStreamReadResult<Uint8Array>;
        try { chunk = await reader.read(); } catch { break; }
        if (chunk.done) break;

        sseBuffer += decoder.decode(chunk.value, { stream: true });
        const parts = sseBuffer.split("\n\n");
        sseBuffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.trim()) continue;

          let eventType = "message";
          let rawData = "";
          for (const line of part.split("\n")) {
            if (line.startsWith("event: ")) eventType = line.slice(7).trim();
            if (line.startsWith("data: ")) rawData = line.slice(6).trim();
          }
          if (!rawData) continue;
          if (genRef.current !== myGen) { reader.cancel(); return; }

          let payload: any;
          try { payload = JSON.parse(rawData); } catch { continue; }

          // ── thought block ────────────────────────────────────────
          if (eventType === "thought") {
            activateRealMode();
            const thoughtItem: ThoughtBlockItem = {
              kind: "thought",
              id: uid(),
              data: {
                title:             payload.title             ?? "Planning",
                estimatedDuration: payload.estimatedDuration ?? "—",
                reasoning:         payload.reasoning         ?? "",
                strategy:          payload.strategy          ?? "",
                insights:          Array.isArray(payload.insights) ? payload.insights as string[] : [],
                phase:             (payload.phase as ThoughtBlockData["phase"]) ?? "planning",
              },
            };
            setFeed((prev) => [...prev, thoughtItem]);
            orchestrator.recordThought(thoughtItem.data);
          }

          // ── momentum ─────────────────────────────────────────────
          if (eventType === "momentum") {
            const ct = payload.currentTask as string | null ?? null;
            const st = payload.subtask as string | null ?? null;
            setMomentum({ currentTask: ct, subtask: st });
            orchestrator.setSubtask(st ?? "");
          }

          // ── narrative ────────────────────────────────────────────────
          if (eventType === "narrative") {
            activateRealMode();
            const narrativeMsg: NarrativeMessage = {
              kind: "narrative",
              id: uid(),
              text: payload.text ?? "",
              stage: payload.stage ?? "understanding",
            };
            setFeed((prev) => [...prev, narrativeMsg]);
            orchestrator.recordNarrative(payload.text ?? "", payload.stage ?? "understanding");
          }

          // ── stage ────────────────────────────────────────────────────
          if (eventType === "stage") {
            activateRealMode();
            // Infer execution stage from stage message content
            const stageText = (payload.message ?? "").toLowerCase();
            let inferredStage: ExecutionStage | null = null;
            if (/plan|architect|design|structur|analyz/.test(stageText) && intent !== "debug") inferredStage = "planning";
            else if (/cod|generat|writing|creat|component|implement/.test(stageText)) inferredStage = "building";
            else if (/analyz|inspect|triage|review|debug/.test(stageText) && intent === "debug") inferredStage = "debugging";

            const hasRunning = (() => {
              let found = false;
              updateTask(taskId, (t) => {
                found = t.steps.some((s) => s.state === "running");
                if (found) {
                  return {
                    ...t,
                    ...(inferredStage ? { executionStage: inferredStage } : {}),
                    steps: t.steps.map((s) =>
                      s.state === "running" ? { ...s, text: payload.message } : s
                    ),
                  };
                }
                if (inferredStage) return { ...t, executionStage: inferredStage };
                return t;
              });
              return found;
            })();
            if (!hasRunning) addStep(taskId, payload.message, "running");
          }

          // ── file ─────────────────────────────────────────────────────
          if (eventType === "file") {
            activateRealMode();
            const { path, content } = payload as { path: string; content: string };

            updateTask(taskId, (t) => ({
              ...t,
              executionStage: "building",
              steps: t.steps.map((s) =>
                s.state === "running" ? { ...s, state: "done" } : s
              ),
            }));

            const label = useEditMode ? editStepMessage(path) : fileStepMessage(path);
            const sid = addStep(taskId, label, "running", path);

            emitFileWrite(path, content);
            localFiles[path] = content;
            setFiles((prev) => ({ ...prev, [path]: content }));
            setActiveFile(path);
            setNewFiles((prev) => new Set([...prev, path]));
            setTimeout(() => {
              setNewFiles((prev) => {
                const n = new Set(prev);
                n.delete(path);
                return n;
              });
            }, 2000);

            resolveStep(taskId, sid, "done");
            orchestrator.fileEdited(path);
            written++;
            const finalWritten = written;
            updateTask(taskId, (t) => ({ ...t, fileCount: finalWritten }));
          }

          // ── done ─────────────────────────────────────────────────────
          if (eventType === "done") {
            if (payload.styleProfile && intent === "build") {
              setStyleProfile(payload.styleProfile);
            }
            updateTask(taskId, (t) => ({
              ...t,
              executionStage: "finalizing",
              steps: t.steps.map((s) =>
                s.state === "running" ? { ...s, state: "done" } : s
              ),
            }));

            const previewSid = addStep(taskId, "Bundling preview", "running");
            const previewOk = await buildPreview(localFiles);
            resolveStep(taskId, previewSid, previewOk ? "done" : "error");

            const failNote = failed.length
              ? ` (${failed.length} file${failed.length !== 1 ? "s" : ""} failed)`
              : "";
            if (previewOk) {
              const doneMsg =
                intent === "debug"  ? `Fix applied — preview updated.${failNote}` :
                intent === "modify" ? `Edits applied — preview updated.${failNote}` :
                `Your ${describePrompt(userPrompt)} is live in the preview.${failNote}`;
              finishTask(taskId, "done", doneMsg);
              orchestrator.finishTask(doneMsg);
            } else {
              const noPreviewMsg = `Generation complete${failNote}. Preview failed to bundle — check the Logs tab.`;
              finishTask(taskId, "done", noPreviewMsg);
              orchestrator.finishTask(noPreviewMsg);
            }
            setMomentum({ currentTask: null, subtask: null });
            break outer;
          }

          // ── error ─────────────────────────────────────────────────────
          if (eventType === "error") {
            stopThinkTimers();
            updateTask(taskId, (t) => ({
              ...t,
              steps: t.steps.map((s) =>
                s.state === "running" ? { ...s, state: "error" } : s
              ),
            }));
            const errMsg = payload.message ?? "Generation failed.";
            finishTask(taskId, "error", errMsg);
            orchestrator.finishTask(errMsg);
            setMomentum({ currentTask: null, subtask: null });
            break outer;
          }
        }
      }

      if (written === 0 && !failed.length && genRef.current === myGen) {
        stopThinkTimers();
        finishTask(taskId, "error", "No files were generated. Try rephrasing your prompt.");
      }

    } catch (err: any) {
      stopThinkTimers();
      const isTimeout = err.name === "AbortError";
      updateTask(taskId, (t) => ({
        ...t,
        steps: t.steps.map((s) => s.state === "running" ? { ...s, state: "error" } : s),
      }));
      finishTask(
        taskId,
        "error",
        isTimeout ? "Request timed out. Try a simpler prompt." : err.message ?? "Something went wrong."
      );
    } finally {
      setSending(false);
    }
  };

  const toggleCollapse = (taskId: number) => {
    updateTask(taskId, (t) => ({ ...t, collapsed: !t.collapsed }));
  };


  // ─────────────────────────────────────────────────────────────────────────
  // render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex bg-[#0A0A0A] text-white overflow-hidden">

      {/* ICON SIDEBAR */}
      <aside className="w-14 bg-[#0C0C0C] flex flex-col items-center py-3 shrink-0 border-r border-white/[0.04]">
        <img src="/logo-icon.png" className="w-8 h-8 rounded-xl select-none object-cover" alt="CloudeArc" />
        <div className="mt-6 flex flex-col gap-2 text-zinc-500">
          <button
            onClick={() => navigate("/app")}
            className="w-9 h-9 rounded-lg hover:bg-white/[0.06] text-zinc-400 hover:text-white flex items-center justify-center transition"
            title="Home"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </button>
          <button
            onClick={() => setTab("code")}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition ${tab === "code" ? "bg-white/10 text-white" : "hover:bg-white/[0.06] text-zinc-500 hover:text-white"}`}
            title="Code editor"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </button>
          <button
            onClick={() => setTab("logs")}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition ${tab === "logs" ? "bg-white/10 text-white" : "hover:bg-white/[0.06] text-zinc-500 hover:text-white"}`}
            title="Activity logs"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </button>
        </div>
        <div className="mt-auto">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ backgroundColor: "#6366f1" }}
          >
            {myUser.current.name[0]}
          </div>
        </div>
      </aside>

      {/* AI PANEL */}
      <aside className="w-80 bg-[#111111] flex flex-col border-r border-white/[0.04] shrink-0">
        {/* Live phase header — execution-aware with momentum continuity */}
        {(() => {
          const activeTask = [...feed].reverse().find(
            (i): i is TaskCard =>
              i.kind === "task" && (i.state === "thinking" || i.state === "running")
          );
          if (activeTask) {
            const phase = PHASE_META[activeTask.executionStage] ?? PHASE_META.thinking;
            const runningStep = activeTask.steps.find((s) => s.state === "running");
            // Show momentum subtask when available, otherwise fall back to running step
            const subtaskLabel = momentum.subtask || runningStep?.text || activeTask.label;
            return (
              <div className="p-3 border-b border-white/[0.04]" style={{ background: `linear-gradient(135deg, ${phase.color}08, transparent)` }}>
                <div className="flex items-center gap-2.5">
                  <AgentLivenessIndicator active={true} size={26} stage={activeTask.executionStage} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="text-[9px] uppercase tracking-[0.14em] font-bold select-none"
                        style={{ color: phase.color }}
                      >
                        {phase.label}
                      </div>
                      {activeTask.fileCount > 0 && (
                        <span className="text-[8px] font-mono text-zinc-700 tabular-nums">
                          {activeTask.fileCount}f
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate mt-[1px]">
                      {subtaskLabel}
                    </div>
                    {/* Momentum sub-line: shows current task continuity */}
                    {momentum.currentTask && momentum.currentTask !== subtaskLabel && (
                      <div className="text-[9px] text-zinc-600 truncate mt-0.5 font-mono">
                        {momentum.currentTask}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          }
          // Idle — show session continuity if we've completed work before
          const lastTask = [...feed].reverse().find((i): i is TaskCard => i.kind === "task" && i.state === "done");
          return (
            <div className="p-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-zinc-600 select-none">◈</span>
                <div className="text-sm font-medium">Build Agent</div>
              </div>
              {lastTask ? (
                <div className="text-[10px] text-zinc-600 mt-0.5 pl-4 truncate">
                  Last: {lastTask.label} · {lastTask.fileCount > 0 ? `${lastTask.fileCount} files` : "done"}
                </div>
              ) : (
                <div className="text-xs text-zinc-600 mt-0.5 pl-4">Describe what to build or change</div>
              )}
            </div>
          );
        })()}

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {feed.length === 0 && (
            <div className="flex flex-col gap-2 mt-1">
              <div className="rounded-lg p-3 border border-white/[0.04] bg-white/[0.02]">
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  {prompt
                    ? <>Ready to build <span className="text-zinc-300 font-medium">"{prompt.length > 55 ? prompt.slice(0, 55) + "…" : prompt}"</span>. Describe what you want below.</>
                    : "Describe your app below and I'll generate the full code."}
                </p>
              </div>
            </div>
          )}

          {feed.map((item) =>
            item.kind === "user" ? (
              <div key={item.id} className="flex items-start gap-2 justify-end py-0.5">
                <div className="max-w-[85%] bg-white/[0.06] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-300 leading-relaxed">
                  {item.content}
                </div>
                <span className="shrink-0 mt-[3px] text-[7px] text-zinc-700 select-none">›</span>
              </div>
            ) : item.kind === "narrative" ? (
              <AgentBubble key={item.id} msg={item} />
            ) : item.kind === "thought" ? (
              <ThoughtBlock key={item.id} data={item.data} defaultCollapsed={false} />
            ) : item.kind === "converse" ? (
              <ConverseAnswer key={item.id} msg={item} />
            ) : (
              <BuildStatusLine key={item.id} task={item} />
            )
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* input */}
        <div className="p-3 border-t border-white/[0.04]">
          <div className={`bg-white/[0.04] rounded-xl p-3 transition-all ${sending ? "opacity-75" : ""}`}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={sending ? "Building your app..." : "Ask CloudeArc to build or change..."}
              disabled={sending}
              rows={2}
              className="w-full bg-transparent resize-none outline-none text-sm placeholder:text-zinc-600 disabled:opacity-40 leading-5"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-zinc-700">↵ to send · ⇧↵ for newline</span>
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all
                  ${input.trim() && !sending
                    ? "bg-white text-black hover:scale-105 active:scale-95"
                    : "bg-white/10 text-zinc-600 cursor-not-allowed"
                  }`}
              >
                {sending ? <Spinner size={13} /> : <span className="text-sm">↑</span>}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN WORKSPACE */}
      <main className="flex-1 flex flex-col bg-[#0B0B0B] relative overflow-hidden">

        {/* TOP BAR */}
        <div className="h-14 border-b border-white/[0.04] flex items-center px-4 shrink-0 gap-3">
          <button
            onClick={() => navigate("/app")}
            className="flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white transition shrink-0 group"
            title="Back to home"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-zinc-600 group-hover:text-zinc-400 transition -mr-0.5"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            CloudeArc
          </button>

          {/* Divider + project name */}
          <span className="text-zinc-700 shrink-0">/</span>
          <span className="text-sm text-zinc-400 truncate max-w-[260px] shrink-0" title={projectName}>
            {projectName}
          </span>

          {/* Style mode badge */}
          {styleProfile && (
            <span
              title={styleProfile.inspiration ? `Style: ${styleProfile.label} · Inspired by ${styleProfile.inspiration.split(" — ")[0]}` : `Style: ${styleProfile.label}`}
              className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium tracking-wide border border-white/[0.08] bg-white/[0.04] text-zinc-400 select-none cursor-default"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400/70 shrink-0" />
              {styleProfile.label}
            </span>
          )}

          {/* Status bar */}
          <div className="flex-1 flex justify-center">
            {(() => {
              const activeTask = [...feed].reverse().find(
                (i): i is TaskCard => i.kind === "task" && (i.state === "thinking" || i.state === "running")
              );
              const activeStep = activeTask?.steps.find((s) => s.state === "running")?.text;
              const statusText =
                sending && activeStep    ? activeStep :
                sending                  ? "Starting…" :
                previewBuilding          ? "Bundling preview…" :
                previewHtml              ? "Preview ready" :
                                           "Generate an app to see a preview";
              const isWorking = sending || previewBuilding;
              return (
                <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] px-3 py-1.5 rounded-lg w-full max-w-[480px]">
                  {isWorking ? (
                    <AgentLivenessIndicator
                      active={true}
                      size={14}
                      stage={activeTask?.executionStage ?? "building"}
                      className="shrink-0"
                    />
                  ) : (
                    <span className="text-white/30 shrink-0">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </span>
                  )}
                  <span className="text-xs text-zinc-400 truncate">{statusText}</span>
                </div>
              );
            })()}
          </div>

          {/* Presence + actions + tabs */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {/* Refresh preview */}
            <button
              onClick={reloadPreview}
              disabled={Object.keys(files).length <= 1 || tab !== "preview" || previewBuilding}
              title="Refresh preview"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </button>

            {/* Download project */}
            <button
              onClick={handleDownload}
              disabled={Object.keys(files).length === 0 || downloading}
              title="Download project as zip"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                  <path d="M12 3V7M12 17V21M3 12H7M17 12H21" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              )}
            </button>
          </div>

          {/* Presence + tabs */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center mr-1">
              <div
                title={`You (${myUser.current.name})`}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ring-2 ring-[#0B0B0B]"
                style={{ backgroundColor: myUser.current.color }}
              >
                {myUser.current.name[0]}
              </div>
              {collabUsers.map((u, i) => (
                <div
                  key={u.id}
                  title={u.name}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ring-2 ring-[#0B0B0B] -ml-1.5"
                  style={{ backgroundColor: u.color, zIndex: 9 - i }}
                >
                  {u.name[0]}
                </div>
              ))}
            </div>

            {(["preview", "code", "logs"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-2.5 py-1.5 rounded-lg text-xs transition capitalize ${
                  tab === t
                    ? "bg-white/10 text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-hidden relative">

          {/* PREVIEW TAB */}
          {tab === "preview" && (
            <div className="w-full h-full flex flex-col relative bg-[#0A0A0A]">
              <PreviewFlash active={previewFlash} />

              {previewHtml ? (
                /* fall through to iframe below */
                null
              ) : previewBuilding ? (
                <div className="flex-1 overflow-hidden">
                  <PreviewSkeleton />
                </div>
              ) : previewError ? (
                /* Bundling failed — show the error so user can diagnose */
                <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
                  <div className="w-12 h-12 rounded-2xl border border-red-500/20 bg-red-500/[0.06] flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400/70">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4M12 16h.01" />
                    </svg>
                  </div>
                  <div className="text-center max-w-sm">
                    <div className="text-sm text-white/60 font-medium mb-1">Preview failed to build</div>
                    <div className="text-xs text-white/30 font-mono break-all leading-relaxed">{previewError.slice(0, 200)}</div>
                  </div>
                  <button
                    onClick={reloadPreview}
                    className="text-xs text-white/40 hover:text-white/70 border border-white/[0.08] hover:border-white/20 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Retry bundle
                  </button>
                </div>
              ) : (
                /* No app generated yet */
                <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
                  <div className="w-12 h-12 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/30">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18M9 21V9" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-white/50">No preview yet</div>
                    <div className="text-xs text-white/25 mt-1">Generate an app to see the live preview here</div>
                  </div>
                </div>
              )}
              {previewHtml && (
                /* Server-built preview in iframe */
                <>
                  {/* Device mode toolbar */}
                  <div className="flex items-center justify-center gap-1 py-2 border-b border-white/[0.04] shrink-0">
                    {(["desktop", "tablet", "mobile"] as DeviceMode[]).map((mode) => {
                      const icons: Record<DeviceMode, React.ReactElement> = {
                        desktop: (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2" />
                            <path d="M8 21h8M12 17v4" />
                          </svg>
                        ),
                        tablet: (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="4" y="2" width="16" height="20" rx="2" />
                            <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
                          </svg>
                        ),
                        mobile: (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="5" y="2" width="14" height="20" rx="2" />
                            <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
                          </svg>
                        ),
                      };
                      return (
                        <button
                          key={mode}
                          onClick={() => setDeviceMode(mode)}
                          title={DEVICE_SIZES[mode].label}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition ${
                            deviceMode === mode
                              ? "bg-white/10 text-white"
                              : "text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.04]"
                          }`}
                        >
                          {icons[mode]}
                          <span>{DEVICE_SIZES[mode].label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Preview iframe */}
                  <div className="flex-1 flex items-center justify-center overflow-auto">
                    <div
                      className="transition-all duration-300 ease-in-out overflow-hidden shadow-2xl"
                      style={{
                        width: DEVICE_SIZES[deviceMode].w,
                        height: DEVICE_SIZES[deviceMode].h,
                        maxWidth: "100%",
                        maxHeight: "100%",
                        borderRadius: deviceMode !== "desktop" ? "16px" : "0",
                        border: deviceMode !== "desktop" ? "1px solid rgba(255,255,255,0.08)" : "none",
                      }}
                    >
                      <iframe
                        ref={iframeRef}
                        srcDoc={previewHtml ?? ""}
                        className="w-full h-full border-0"
                        title="App Preview"
                        sandbox="allow-scripts allow-same-origin"
                        style={{ borderRadius: deviceMode !== "desktop" ? "15px" : "0" }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* CODE TAB */}
          {tab === "code" && (
            <div className="flex h-full bg-[#0F0F0F]">
              {/* File tree */}
              <div className="w-56 border-r border-white/[0.04] bg-[#111111] overflow-y-auto shrink-0 flex flex-col">
                <div className="px-3 py-2.5 border-b border-white/[0.04] flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.1em] text-zinc-600 font-semibold">Files</span>
                  <button
                    onClick={() => {
                      setNewFileName("");
                      setTimeout(() => newFileInputRef.current?.focus(), 50);
                    }}
                    title="New file"
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-zinc-600 hover:text-zinc-300 transition"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>
                {newFileName !== null && (
                  <div className="px-2 pt-2">
                    <input
                      ref={newFileInputRef}
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      placeholder="/newfile.js"
                      className="w-full bg-white/[0.06] border border-white/10 rounded-md px-2 py-1 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-white/20"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const name = newFileName.trim();
                          if (name) {
                            const path = name.startsWith("/") ? name : `/${name}`;
                            setFiles((prev) => ({ ...prev, [path]: "" }));
                            setActiveFile(path);
                            setNewFiles((prev) => new Set([...prev, path]));
                          }
                          setNewFileName(null);
                        } else if (e.key === "Escape") {
                          setNewFileName(null);
                        }
                      }}
                      onBlur={() => setNewFileName(null)}
                    />
                    <div className="text-[10px] text-zinc-700 mt-1 px-0.5">↵ confirm · Esc cancel</div>
                  </div>
                )}
                <div className="p-2 space-y-0.5 flex-1 overflow-y-auto">
                  {Object.keys(files).sort().map((file) => {
                    const isNew = newFiles.has(file);
                    const color = fileTypeColor(file);
                    return (
                      <div key={file} className="group relative flex items-center">
                        <button
                          onClick={() => setActiveFile(file)}
                          className={`flex-1 min-w-0 text-left px-2.5 py-1.5 rounded-lg text-xs transition-all duration-200 flex items-center gap-2 ${
                            activeFile === file
                              ? "bg-white/10 text-white"
                              : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
                          } ${isNew ? "ring-1" : ""}`}
                          style={isNew ? { outline: `1px solid ${color}50` } : {}}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="truncate font-mono">
                            {file.split("/").pop()}
                          </span>
                          {isNew && (
                            <span
                              className="ml-auto text-[8px] font-semibold uppercase tracking-wide shrink-0"
                              style={{ color }}
                            >
                              new
                            </span>
                          )}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleFileDelete(file); }}
                          title={`Delete ${file}`}
                          className="absolute right-1 opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/20 text-zinc-600 hover:text-red-400 transition-all text-[11px] shrink-0"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Editor */}
              <div className="flex-1 overflow-hidden">
                <Editor
                  height="100%"
                  theme="vs-dark"
                  path={activeFile}
                  defaultLanguage="javascript"
                  value={files[activeFile] || ""}
                  onChange={(value) => {
                    const updated = value || "";
                    setFiles((prev) => ({ ...prev, [activeFile]: updated }));
                    debouncedWrite(activeFile, updated);
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    smoothScrolling: true,
                    automaticLayout: true,
                    padding: { top: 16 },
                    scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                    lineNumbers: "on",
                    renderLineHighlight: "line",
                    overviewRulerLanes: 0,
                  }}
                />
              </div>
            </div>
          )}

          {/* LOGS TAB */}
          {tab === "logs" && (
            <div className="h-full overflow-y-auto bg-[#0A0A0A]">
              <div className="p-4 border-b border-white/[0.04] flex items-center justify-between">
                <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-widest">Activity Log</span>
                <span className="text-[11px] text-zinc-700">
                  {feed.flatMap((i) => i.kind === "task" ? i.steps : []).length} events
                </span>
              </div>
              <div className="p-4 space-y-px font-mono">
                {feed.flatMap((item, taskIdx) =>
                  item.kind === "task"
                    ? [
                        <div key={`task-${item.id}`} className="flex items-center gap-2 py-1.5 mt-2 first:mt-0">
                          <span className="text-[10px] text-zinc-700 uppercase tracking-widest shrink-0">Task {taskIdx + 1}</span>
                          <div className="flex-1 h-px bg-white/[0.04]" />
                          <span className={`text-[10px] shrink-0 ${
                            item.state === "done" ? "text-emerald-600" :
                            item.state === "error" ? "text-red-500" :
                            "text-zinc-600"
                          }`}>
                            {item.state === "done" ? "completed" : item.state === "error" ? "failed" : "running"}
                          </span>
                        </div>,
                        ...item.steps.map((s) => (
                          <div
                            key={s.id}
                            className={`flex items-start gap-3 text-xs py-[3px] pl-3 rounded ${
                              s.state === "running" ? "bg-white/[0.02]" : ""
                            }`}
                          >
                            <span className={`shrink-0 w-3 text-center mt-px ${
                              s.state === "done"    ? "text-emerald-700" :
                              s.state === "error"   ? "text-red-500" :
                              "text-zinc-600"
                            }`}>
                              {s.state === "done" ? "✓" : s.state === "error" ? "✗" : "›"}
                            </span>
                            <span className={
                              s.state === "running" ? "text-zinc-300" :
                              s.state === "done"    ? "text-zinc-600" :
                              "text-red-400"
                            }>
                              {s.text}
                              {s.path && (
                                <span className="ml-2 opacity-50" style={{ color: fileTypeColor(s.path) }}>
                                  {s.path}
                                </span>
                              )}
                              {s.state === "running" && (
                                <span className="ml-1.5 inline-flex gap-[2px]">
                                  <span className="ca-dot w-1 h-1 rounded-full bg-zinc-500 inline-block" />
                                  <span className="ca-dot w-1 h-1 rounded-full bg-zinc-500 inline-block" style={{ animationDelay: "0.2s" }} />
                                  <span className="ca-dot w-1 h-1 rounded-full bg-zinc-500 inline-block" style={{ animationDelay: "0.4s" }} />
                                </span>
                              )}
                            </span>
                          </div>
                        )),
                      ]
                    : []
                )}
                {feed.flatMap((i) => i.kind === "task" ? i.steps : []).length === 0 && (
                  <div className="text-zinc-700 text-xs py-4 text-center">No activity yet. Send a message to get started.</div>
                )}
              </div>
            </div>
          )}

          {/* FILE PANEL OVERLAY */}
          {filePanelOpen && (
            <div className="absolute top-0 right-0 h-full w-64 bg-[#0D0D0D] border-l border-white/[0.06] z-50 flex flex-col">
              <div className="h-12 flex items-center justify-between px-3 border-b border-white/[0.04]">
                <span className="text-xs text-white/50 uppercase tracking-wide font-semibold">Explorer</span>
                <button
                  onClick={() => setFilePanelOpen(false)}
                  className="w-7 h-7 flex items-center justify-center hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition"
                >
                  ✕
                </button>
              </div>
              <div className="p-2 text-xs text-white/50 space-y-0.5 overflow-y-auto flex-1">
                {Object.keys(files).sort().map((file) => (
                  <div
                    key={file}
                    className="group relative flex items-center"
                  >
                    <div
                      onClick={() => { setActiveFile(file); setTab("code"); setFilePanelOpen(false); }}
                      className={`flex-1 min-w-0 cursor-pointer hover:text-white hover:bg-white/[0.04] px-2 py-1.5 rounded font-mono truncate transition ${activeFile === file ? "text-white" : ""}`}
                    >
                      {file}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleFileDelete(file); }}
                      title={`Delete ${file}`}
                      className="absolute right-1 opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/20 text-zinc-600 hover:text-red-400 transition-all text-[11px] shrink-0"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FILE PANEL BUTTON */}
          <button
            onClick={() => setFilePanelOpen((v) => !v)}
            className="absolute top-4 right-4 group z-10"
            title="File explorer"
          >
            <div className="relative w-9 h-9 rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md overflow-hidden transition-all hover:bg-white/[0.06] hover:border-white/[0.16]">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-white/60 group-hover:text-white transition">
                  <path d="M4 6.5C4 5.67 4.67 5 5.5 5H9L10.5 7H18.5C19.33 7 20 7.67 20 8.5V17.5C20 18.33 19.33 19 18.5 19H5.5C4.67 19 4 18.33 4 17.5V6.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M8 11H16M8 14H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
}
