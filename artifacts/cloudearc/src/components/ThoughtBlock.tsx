import { useState } from "react";

export interface ThoughtBlockData {
  title: string;
  estimatedDuration: string;
  reasoning: string;
  strategy: string;
  insights: string[];
  phase: "planning" | "architecture" | "building";
}

const PHASE_COLOR: Record<ThoughtBlockData["phase"], string> = {
  planning:     "#a78bfa",
  architecture: "#38bdf8",
  building:     "#34d399",
};

const PHASE_ICON: Record<ThoughtBlockData["phase"], string> = {
  planning:     "◈",
  architecture: "⬡",
  building:     "⬟",
};

interface ThoughtBlockProps {
  data: ThoughtBlockData;
  defaultCollapsed?: boolean;
}

export function ThoughtBlock({ data, defaultCollapsed = false }: ThoughtBlockProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const color = PHASE_COLOR[data.phase];
  const icon  = PHASE_ICON[data.phase];

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${color}08, transparent)`,
        border: `1px solid ${color}18`,
      }}
    >
      {/* Header */}
      <button
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
        onClick={() => setCollapsed(c => !c)}
      >
        {/* Phase icon */}
        <span
          className="shrink-0 text-[11px] select-none"
          style={{ color, opacity: 0.85 }}
        >
          {icon}
        </span>

        {/* Title */}
        <span
          className="flex-1 text-[11.5px] font-medium leading-snug truncate"
          style={{ color: "rgba(228,228,231,0.9)" }}
        >
          {data.title}
        </span>

        {/* Duration badge */}
        {data.estimatedDuration && data.estimatedDuration !== "—" && (
          <span
            className="shrink-0 text-[9px] font-mono tabular-nums px-1.5 py-0.5 rounded-md"
            style={{
              color,
              background: `${color}14`,
              opacity: 0.85,
            }}
          >
            {data.estimatedDuration}
          </span>
        )}

        {/* Toggle */}
        <span
          className="shrink-0 text-[9px] ml-0.5 transition-transform duration-200"
          style={{
            color: "rgba(113,113,122,0.7)",
            transform: collapsed ? "rotate(0deg)" : "rotate(90deg)",
          }}
        >
          ▶
        </span>
      </button>

      {/* Body — expanded */}
      {!collapsed && (
        <div className="px-3 pb-3 border-t space-y-2.5" style={{ borderColor: `${color}12` }}>
          {/* Reasoning */}
          <div className="pt-2.5">
            <div
              className="text-[9px] uppercase tracking-[0.12em] font-semibold mb-1"
              style={{ color, opacity: 0.6 }}
            >
              Reasoning
            </div>
            <p className="text-[11.5px] leading-[1.7] text-zinc-400">
              {data.reasoning}
            </p>
          </div>

          {/* Strategy */}
          <div>
            <div
              className="text-[9px] uppercase tracking-[0.12em] font-semibold mb-1"
              style={{ color, opacity: 0.6 }}
            >
              Strategy
            </div>
            <p className="text-[11.5px] leading-[1.7] text-zinc-400">
              {data.strategy}
            </p>
          </div>

          {/* Insights */}
          {data.insights.length > 0 && (
            <div>
              <div
                className="text-[9px] uppercase tracking-[0.12em] font-semibold mb-1.5"
                style={{ color, opacity: 0.6 }}
              >
                Insights
              </div>
              <ul className="space-y-1">
                {data.insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span
                      className="shrink-0 mt-[4px] text-[6px]"
                      style={{ color, opacity: 0.7 }}
                    >
                      ●
                    </span>
                    <span className="text-[11px] leading-[1.65] text-zinc-500">
                      {insight}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
