import { Router, type Request, type Response } from "express";
import { buildEditStyleContext, type StyleProfile } from "../lib/styleMemory";

const router = Router();

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

// ── Agent model assignments ───────────────────────────────────────────────────
// Triage: fast model — cheap, quick, just needs to identify files
const FAST_MODEL = process.env.MODEL_FAST ?? "bytedance/seed-oss-36b-instruct";
// Edit apply: dedicated coder — produces highest quality diffs
const CODER_MODEL = process.env.MODEL_CODER ?? "qwen/qwen3-coder-480b-a35b-instruct";

const TRIAGE_TIMEOUT_MS = 20_000;
const EDIT_TIMEOUT_MS = 90_000;
const MAX_FILE_CHARS = 12_000;
const MAX_AFFECTED_FILES = 3;

// ── SSE helpers ──────────────────────────────────────────────────────────────

function sseSetup(res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
}

function sseSend(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function sseStage(res: Response, message: string) {
  sseSend(res, "stage", { message });
}

function sseFile(res: Response, path: string, content: string) {
  sseSend(res, "file", { type: "write_file", path, content });
}

function sseDone(res: Response, fileCount: number) {
  sseSend(res, "done", { templateType: "edit", fileCount });
  res.end();
}

function sseError(res: Response, message: string) {
  sseSend(res, "error", { message });
  res.end();
}

// ── JSON helpers ─────────────────────────────────────────────────────────────

function cleanJson(text: string): string {
  return text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
}

function parseJson(text: string): any {
  try { return JSON.parse(text); } catch { /* */ }
  const noEsc = text.replace(/\\([^"\\/bfnrtu\r\n])/g, (_, c: string) => c);
  try { return JSON.parse(noEsc); } catch { /* */ }
  return JSON.parse(text.replace(/[\u0000-\u001F]/g, (c) => {
    const code = c.charCodeAt(0);
    return `\\u${code.toString(16).padStart(4, "0")}`;
  }));
}

// Strip <think>...</think> reasoning tokens from model responses
function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

// ── Content extraction ────────────────────────────────────────────────────────

function extractContent(raw: string): string {
  const cleaned = stripThinking(raw);
  const fileMatch = cleaned.match(/^===FILE:[^\n]*===?\s*\n([\s\S]+?)(?:===FILE:|$)/m);
  if (fileMatch) return fileMatch[1].trimEnd();
  const mdMatch = cleaned.match(/^```[a-z]*\n([\s\S]+?)```\s*$/);
  if (mdMatch) return mdMatch[1].trimEnd();
  return cleaned.trim();
}

// ── LLM call ─────────────────────────────────────────────────────────────────

async function callModel(
  modelName: string,
  system: string,
  prompt: string,
  apiKey: string,
  timeoutMs: number,
  maxTokens = 4096,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(NVIDIA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: modelName,
        temperature: 0.2,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content ?? "";
    return stripThinking(raw);
  } finally {
    clearTimeout(timer);
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────

router.post("/", async (req: Request, res: Response) => {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    sseSetup(res);
    sseError(res, "NVIDIA_API_KEY not set");
    return;
  }

  const { prompt, files, styleProfile } = req.body as {
    prompt: string;
    files: Record<string, string>;
    styleProfile?: StyleProfile;
  };

  if (!prompt || typeof prompt !== "string") {
    sseSetup(res);
    sseError(res, "Missing prompt");
    return;
  }

  const fileMap: Record<string, string> = files ?? {};
  const fileList = Object.keys(fileMap);
  const log = req.log;

  sseSetup(res);
  sseStage(res, "Analyzing your app...");

  // ── Stage 1: Triage (Fast agent) ──────────────────────────────────────────
  let triage: {
    affectedFiles: string[];
    taskLabel: string;
    editInstructions: string;
  };

  try {
    const triageRaw = await callModel(
      FAST_MODEL,
      `You are an edit triage agent for a React app. Determine which files need to change.
Return ONLY valid JSON (no markdown, no explanation, no <think> tags):
{
  "affectedFiles": ["/src/components/Hero.jsx"],
  "taskLabel": "Updating hero section",
  "editInstructions": "precise description of what to change and how"
}
Rules:
- affectedFiles: max ${MAX_AFFECTED_FILES} paths chosen from the provided file list
- taskLabel: short, present-participle phrase for UI (e.g. "Adjusting navbar spacing", "Darkening hero background", "Rounding button corners")
- editInstructions: clear, specific instructions preserving the existing component structure
- Only include files that genuinely need to change for this request`,
      `User edit request: "${prompt}"\n\nExisting project files:\n${fileList.join("\n")}`,
      apiKey,
      TRIAGE_TIMEOUT_MS,
      512,
    );

    triage = parseJson(cleanJson(triageRaw));
    if (!Array.isArray(triage.affectedFiles) || triage.affectedFiles.length === 0) {
      throw new Error("No affected files identified");
    }
    triage.affectedFiles = triage.affectedFiles
      .filter((f) => fileList.includes(f))
      .slice(0, MAX_AFFECTED_FILES);
    if (triage.affectedFiles.length === 0) {
      throw new Error("Identified files not found in project");
    }
  } catch (err: any) {
    log.warn({ err: err.message }, "Triage failed — falling back to App component");
    const fallback =
      fileList.find((f) => /App\.(jsx|tsx)$/i.test(f)) ??
      fileList.find((f) => /Hero\.(jsx|tsx)$/i.test(f)) ??
      fileList[0];
    triage = {
      affectedFiles: fallback ? [fallback] : [],
      taskLabel: "Applying edit",
      editInstructions: prompt,
    };
  }

  if (triage.affectedFiles.length === 0) {
    sseError(res, "Could not determine which files to edit. Try being more specific.");
    return;
  }

  sseStage(res, triage.taskLabel ?? "Applying edits...");
  log.info({ affected: triage.affectedFiles, label: triage.taskLabel }, "Edit triage done");

  // ── Stage 2: Edit each affected file (Coder agent) ────────────────────────
  let editCount = 0;

  for (const filePath of triage.affectedFiles) {
    const currentContent = (fileMap[filePath] ?? "").slice(0, MAX_FILE_CHARS);
    sseStage(res, `Updating ${filePath.split("/").pop()}...`);

    try {
      const styleContext = styleProfile
        ? `\n\n${buildEditStyleContext(styleProfile)}\n`
        : "";

      const editRaw = await callModel(
        CODER_MODEL,
        `You are an expert senior frontend engineer making a precise, targeted edit to a React file.

EDIT INSTRUCTIONS: ${triage.editInstructions}
${styleContext}
RULES:
- Return ONLY the complete updated file using the delimiter format below — nothing else
- Modify ONLY what the edit instructions require; preserve all unrelated code exactly
- Keep all imports, exports, prop names, component names, and file structure intact
- No placeholder comments, no TODOs, no truncation — complete working code only
- No <think> tags in output

OUTPUT FORMAT (use exactly this structure):
===FILE: ${filePath}===
(complete updated file content)`,
        `File to edit: ${filePath}\n\nCurrent content:\n${currentContent}`,
        apiKey,
        EDIT_TIMEOUT_MS,
        8192,
      );

      const updatedContent = extractContent(editRaw);
      if (updatedContent.length < 20) throw new Error("Empty response");

      sseFile(res, filePath, updatedContent);
      editCount++;
      log.info({ filePath, chars: updatedContent.length }, "File edited ok");
    } catch (err: any) {
      log.warn({ filePath, err: err.message }, "Edit failed for file — skipping");
    }
  }

  if (editCount === 0) {
    sseError(res, "Could not apply edits. Try rephrasing your request.");
    return;
  }

  sseDone(res, editCount);
});

export default router;
