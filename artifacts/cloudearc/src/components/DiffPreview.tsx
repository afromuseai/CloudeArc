// DiffPreview — compact file diff viewer
// Shows only modified/replaced/inserted lines, not entire files.

interface DiffLine {
  type: "added" | "removed" | "context";
  content: string;
  lineNo?: number;
}

interface DiffPreviewProps {
  path: string;
  oldContent?: string;
  newContent: string;
  maxLines?: number;
}

function getExtColor(path: string): string {
  if (path.endsWith(".tsx") || path.endsWith(".jsx")) return "#a78bfa";
  if (path.endsWith(".css")) return "#38bdf8";
  if (path.endsWith(".html")) return "#fb923c";
  if (path.endsWith(".ts") || path.endsWith(".js")) return "#facc15";
  if (path.endsWith(".json")) return "#4ade80";
  return "#94a3b8";
}

function shortPath(path: string): string {
  return path.replace(/^\//, "").split("/").slice(-2).join("/");
}

function computeDiff(oldLines: string[], newLines: string[], maxLines: number): DiffLine[] {
  // Simple LCS-based diff (trimmed for display)
  const result: DiffLine[] = [];
  const added:   Set<number> = new Set();
  const removed: Set<number> = new Set();

  // Find changed regions using a sliding window comparison
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  // Collect additions and removals
  for (let i = 0; i < newLines.length; i++) {
    if (!oldSet.has(newLines[i])) added.add(i);
  }
  for (let i = 0; i < oldLines.length; i++) {
    if (!newSet.has(oldLines[i])) removed.add(i);
  }

  // Show only changed lines with 1-line context
  const shown = new Set<number>();
  const changedNew = [...added];
  for (const idx of changedNew) {
    for (let c = Math.max(0, idx - 1); c <= Math.min(newLines.length - 1, idx + 1); c++) {
      shown.add(c);
    }
  }

  const sortedShown = [...shown].sort((a, b) => a - b);
  let prevIdx = -2;
  for (const idx of sortedShown) {
    if (idx > prevIdx + 1 && result.length > 0) {
      result.push({ type: "context", content: "···" });
    }
    const line = newLines[idx];
    result.push({
      type: added.has(idx) ? "added" : "context",
      content: line,
      lineNo: idx + 1,
    });
    prevIdx = idx;
  }

  // Prefix with removed lines that have no match
  const removedLines: DiffLine[] = [];
  for (const idx of removed) {
    const line = oldLines[idx];
    if (!newSet.has(line)) {
      removedLines.push({ type: "removed", content: line, lineNo: idx + 1 });
    }
  }

  const combined = [...removedLines.slice(0, 3), ...result].slice(0, maxLines);
  return combined;
}

export function DiffPreview({ path, oldContent, newContent, maxLines = 12 }: DiffPreviewProps) {
  const color = getExtColor(path);
  const filename = path.split("/").pop() ?? path;

  let lines: DiffLine[];

  if (!oldContent) {
    // New file — show first N lines as additions
    const newLines = newContent.split("\n").slice(0, maxLines);
    lines = newLines.map((content, i) => ({ type: "added" as const, content, lineNo: i + 1 }));
    if (newContent.split("\n").length > maxLines) {
      lines.push({ type: "context", content: `··· ${newContent.split("\n").length - maxLines} more lines` });
    }
  } else {
    lines = computeDiff(oldContent.split("\n"), newContent.split("\n"), maxLines);
  }

  const addedCount   = lines.filter(l => l.type === "added").length;
  const removedCount = lines.filter(l => l.type === "removed").length;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-2.5 py-1.5"
        style={{ background: "rgba(255,255,255,0.03)" }}
      >
        <span className="font-mono text-[10px]" style={{ color }}>
          {filename}
        </span>
        <span className="text-[9px] text-zinc-600 flex-1 truncate">
          {shortPath(path)}
        </span>
        <div className="flex items-center gap-1.5">
          {addedCount > 0 && (
            <span className="text-[9px] font-mono text-emerald-500">+{addedCount}</span>
          )}
          {removedCount > 0 && (
            <span className="text-[9px] font-mono text-red-500">−{removedCount}</span>
          )}
        </div>
      </div>

      {/* Diff lines */}
      {lines.length > 0 && (
        <div className="px-0 py-0.5" style={{ background: "rgba(0,0,0,0.2)" }}>
          {lines.map((line, i) => {
            const isAdded   = line.type === "added";
            const isRemoved = line.type === "removed";
            const isCtx     = line.type === "context";
            return (
              <div
                key={i}
                className="flex items-start gap-1.5 px-2.5 py-[1px] font-mono"
                style={{
                  background: isAdded
                    ? "rgba(52,211,153,0.07)"
                    : isRemoved
                    ? "rgba(248,113,113,0.07)"
                    : "transparent",
                }}
              >
                {/* Gutter */}
                <span
                  className="shrink-0 text-[9px] select-none w-3 text-right"
                  style={{
                    color: isAdded ? "#34d399" : isRemoved ? "#f87171" : "rgba(113,113,122,0.3)",
                  }}
                >
                  {isAdded ? "+" : isRemoved ? "−" : isCtx ? "" : " "}
                </span>
                {/* Line number */}
                {line.lineNo && (
                  <span className="shrink-0 text-[9px] text-zinc-700 w-6 text-right select-none">
                    {line.lineNo}
                  </span>
                )}
                {/* Content */}
                <span
                  className="text-[10px] leading-[1.6] truncate"
                  style={{
                    color: isAdded
                      ? "rgba(52,211,153,0.85)"
                      : isRemoved
                      ? "rgba(248,113,113,0.7)"
                      : isCtx && line.content.startsWith("···")
                      ? "rgba(113,113,122,0.5)"
                      : "rgba(161,161,170,0.7)",
                  }}
                >
                  {line.content}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
