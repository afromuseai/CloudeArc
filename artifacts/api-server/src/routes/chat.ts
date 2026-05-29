import { Router, type Request, type Response } from "express";
import { detectTemplate, getTemplateConfig } from "../lib/templates";
import {
  detectStyleMode,
  detectInspiration,
  buildStyleBrief,
  buildStyleProfile,
  type StyleProfile,
} from "../lib/styleMemory";
import {
  buildPlannerSystemPrompt,
  buildArchitectSystemPrompt,
  buildNarrativeFromSteps,
  buildArchNarrative,
  fallbackPlanningThought,
  fallbackArchThought,
  type ThoughtBlock,
} from "../lib/promptOrchestrator";

const router = Router();

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

// ── Agent model assignments ───────────────────────────────────────────────────
// Plan + Architect: reasoning model (great at structured thinking/JSON)
const REASONER_MODEL = process.env.MODEL_REASONER ?? "stepfun-ai/step-3.5-flash";
// Code generation: dedicated coding giant (480B parameters)
const CODER_MODEL = process.env.MODEL_CODER ?? "qwen/qwen3-coder-480b-a35b-instruct";
// Fallback for any stage if primary fails
const FALLBACK_MODEL = process.env.MODEL_GENERAL ?? "mistralai/mistral-large-3-675b-instruct-2512";

const PLAN_TIMEOUT_MS = 30_000;
const ARCH_TIMEOUT_MS = 30_000;
const CODE_TIMEOUT_MS = 180_000;
const MAX_RETRIES = 1;

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

function sseDone(res: Response, templateType: string, fileCount: number, styleProfile?: StyleProfile) {
  sseSend(res, "done", { templateType, fileCount, styleProfile });
  res.end();
}

function sseError(res: Response, message: string) {
  sseSend(res, "error", { message });
  res.end();
}

function sseNarrative(res: Response, text: string, stage: "understanding" | "planning" | "building" | "done") {
  sseSend(res, "narrative", { text, stage });
}

function sseThought(res: Response, thought: ThoughtBlock) {
  sseSend(res, "thought", thought);
}

function sseMomentum(res: Response, currentTask: string, subtask: string | null) {
  sseSend(res, "momentum", { currentTask, subtask });
}

// ── JSON / parsing helpers ───────────────────────────────────────────────────

function cleanJson(text: string): string {
  return text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
}

function fixControlCharsInStrings(text: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const code = text.charCodeAt(i);
    if (escaped) { out += ch; escaped = false; continue; }
    if (ch === "\\" && inString) { out += ch; escaped = true; continue; }
    if (ch === '"') { inString = !inString; out += ch; continue; }
    if (inString && code < 0x20) {
      if (ch === "\n") out += "\\n";
      else if (ch === "\r") out += "\\r";
      else if (ch === "\t") out += "\\t";
      else out += `\\u${code.toString(16).padStart(4, "0")}`;
      continue;
    }
    out += ch;
  }
  return out;
}

function parseJson(text: string): any {
  try { return JSON.parse(text); } catch { /* */ }
  const noEsc = text.replace(/\\([^"\\/bfnrtu\r\n])/g, (_, c: string) => c);
  try { return JSON.parse(noEsc); } catch { /* */ }
  const fixed = fixControlCharsInStrings(text).replace(/\\([^"\\/bfnrtu\r\n])/g, (_, c: string) => c);
  return JSON.parse(fixed);
}

function parseDelimitedFiles(text: string): Array<{ path: string; content: string }> {
  const results: Array<{ path: string; content: string }> = [];
  const sections = text.split(/^===FILE:\s*/m);
  for (const section of sections) {
    if (!section.trim()) continue;
    const newlineIdx = section.indexOf("\n");
    if (newlineIdx === -1) continue;
    const path = section.slice(0, newlineIdx).replace(/={0,3}\s*$/, "").trim();
    const content = section.slice(newlineIdx + 1).trimEnd();
    if (path.startsWith("/") && !path.includes("..") && content.length > 0) {
      results.push({ path, content });
    }
  }
  return results;
}

function parseMarkdownFiles(text: string): Array<{ path: string; content: string }> {
  const results: Array<{ path: string; content: string }> = [];
  const seen = new Set<string>();

  const add = (path: string, content: string) => {
    path = path.trim();
    content = content.trimEnd();
    if (path.startsWith("/") && !path.includes("..") && content.length > 10 && !seen.has(path)) {
      seen.add(path);
      results.push({ path, content });
    }
  };

  const fenceWithPath = /^```[a-z]*:(\S+)\n([\s\S]*?)^```/gm;
  let m: RegExpExecArray | null;
  while ((m = fenceWithPath.exec(text)) !== null) add(m[1], m[2]);

  if (results.length > 0) return results;

  const PATH_RE = /(\/[\w./\-]+\.\w{1,6})/;
  const lines = text.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const stripped = line.replace(/^[#*`>_\s]+|[#*`>_\s]+$/g, "").replace(/^[Ff]ile:?\s*/, "");
    const pathMatch = PATH_RE.exec(stripped);
    if (pathMatch) {
      const path = pathMatch[1];
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === "") j++;
      if (j < lines.length && lines[j].startsWith("```")) {
        const contentLines: string[] = [];
        j++;
        while (j < lines.length && !lines[j].startsWith("```")) {
          contentLines.push(lines[j]);
          j++;
        }
        add(path, contentLines.join("\n"));
        i = j + 1;
        continue;
      }
    }
    i++;
  }

  return results;
}

// ── Strip <think> blocks from reasoning model responses ──────────────────────
// Reasoning models (Qwen3, Step) wrap chain-of-thought in <think>...</think>.
// These must be removed before parsing JSON or code.

function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

// ── LLM call ─────────────────────────────────────────────────────────────────

async function callModelOnce(
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
        temperature: 0.25,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content ?? "";
    return stripThinking(raw);
  } finally {
    clearTimeout(timer);
  }
}

function is429(err: any): boolean {
  return err.message?.includes("429") || err.message?.includes("Too Many Requests");
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Calls a specific model with a fallback to FALLBACK_MODEL on hard failure
async function callModel(
  primaryModel: string,
  system: string,
  prompt: string,
  apiKey: string,
  logger: any,
  stage: string,
  timeoutMs = PLAN_TIMEOUT_MS,
  maxTokens = 4096,
): Promise<string> {
  const models = [primaryModel, FALLBACK_MODEL].filter((m, i, a) => a.indexOf(m) === i);
  for (const model of models) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.info({ stage, model, attempt }, "LLM request");
        const result = await callModelOnce(model, system, prompt, apiKey, timeoutMs, maxTokens);
        logger.info({ stage, model, attempt, chars: result.length }, "LLM ok");
        return result;
      } catch (err: any) {
        const isTimeout = err.name === "AbortError" || err.message?.includes("abort");
        const isRateLimit = is429(err);
        logger.warn({ stage, model, attempt, err: err.message, isTimeout, isRateLimit }, "LLM failed");
        const hasRetry = attempt < MAX_RETRIES;
        const hasFallback = model !== models[models.length - 1];
        if (!hasRetry && !hasFallback) throw err;
        if (isRateLimit && hasRetry) {
          const backoff = 3000 * (attempt + 1);
          logger.info({ stage, backoff }, "Rate limited — backing off");
          await sleep(backoff);
        }
        if (!hasRetry) break;
      }
    }
  }
  throw new Error(`All models failed for stage: ${stage}`);
}

// ── Streaming code generation ─────────────────────────────────────────────────
// Uses CODER_MODEL exclusively — streams token-by-token, detects ===FILE: blocks,
// skips <think>...</think> reasoning tokens inline, and emits each file via SSE.

async function streamCodeGen(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  sseRes: Response,
  logger: any,
): Promise<{ emitted: number; accumulated: string }> {
  const controller = new AbortController();
  const codeTimer = setTimeout(() => controller.abort(), CODE_TIMEOUT_MS);

  const keepalive = setInterval(() => {
    sseRes.write(": ka\n\n");
  }, 5000);

  let accumulated = "";
  let emitted = 0;
  let pendingPath: string | null = null;
  let pendingContentStart = 0;
  let searchFrom = 0;

  // Track <think>...</think> blocks in the stream — skip their content
  let inThinking = false;
  let thinkBuf = "";

  const fileMarkerRe = /===FILE:\s*([^\n=]+?)=*\r?\n/g;

  const tryEmitPending = (endPos: number) => {
    if (!pendingPath) return;
    const content = accumulated.slice(pendingContentStart, endPos).trimEnd();
    const path = pendingPath;
    pendingPath = null;
    if (content.length > 10 && path.startsWith("/") && !path.includes("..")) {
      sseSend(sseRes, "file", { type: "write_file", path, content });
      logger.info({ path, chars: content.length }, "Streamed file");
      emitted++;
    }
  };

  // Try CODER_MODEL first; fall back to FALLBACK_MODEL on 5xx or rate limit exhaustion
  const streamModels = [CODER_MODEL, FALLBACK_MODEL].filter((m, i, a) => a.indexOf(m) === i);
  let apiRes: globalThis.Response | null = null;
  let usedModel = streamModels[0];

  outer:
  for (const model of streamModels) {
    usedModel = model;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const r = await fetch(NVIDIA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 16384,
          stream: true,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
        signal: controller.signal,
      });
      if (r.status === 429 && attempt < MAX_RETRIES) {
        const backoff = 4000 * (attempt + 1);
        logger.warn({ model, attempt, backoff }, "Code gen rate limited — backing off");
        await sleep(backoff);
        continue;
      }
      if (r.status === 429) {
        // Rate limit exhausted on this model — try next
        logger.warn({ model }, "Code gen rate limit exhausted — trying fallback model");
        break;
      }
      if (!r.ok && r.status >= 500) {
        const body = await r.text().catch(() => "");
        logger.warn({ model, status: r.status, body: body.slice(0, 200) }, "Code gen 5xx — trying fallback model");
        break; // try next model
      }
      apiRes = r;
      break outer;
    }
  }
  logger.info({ model: usedModel }, "Code gen using model");

  try {
    if (!apiRes || !apiRes.ok || !apiRes.body) {
      throw new Error(`HTTP ${apiRes?.status ?? "unknown"}`);
    }

    const reader = apiRes.body.getReader();
    const decoder = new TextDecoder();
    let inBuf = "";
    let done = false;

    while (!done) {
      let chunk: { done: boolean; value?: Uint8Array };
      try {
        chunk = await reader.read();
      } catch {
        break;
      }

      if (chunk.done) break;

      inBuf += decoder.decode(chunk.value, { stream: true });
      const lines = inBuf.split("\n");
      inBuf = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") { done = true; break; }
        try {
          const parsed = JSON.parse(raw);
          let delta: string = parsed.choices?.[0]?.delta?.content ?? "";
          if (!delta) continue;

          // ── Strip <think> blocks inline ────────────────────────────────────
          // Buffer delta chars, toggling inThinking on tag boundaries.
          let filtered = "";
          let pos = 0;
          while (pos < delta.length) {
            if (!inThinking) {
              const openIdx = (thinkBuf + delta.slice(pos)).indexOf("<think>");
              if (openIdx !== -1) {
                // Emit everything before the tag
                const beforeTag = (thinkBuf + delta.slice(pos)).slice(0, openIdx);
                filtered += beforeTag.slice(thinkBuf.length);
                thinkBuf = "";
                pos = delta.length - ((thinkBuf + delta.slice(pos)).length - openIdx - 7);
                if (pos < 0) pos = 0;
                inThinking = true;
              } else {
                // No open tag — check for partial tag at end
                const tail = delta.slice(pos);
                const partialMatch = tail.match(/<t?h?i?n?k?>?$/);
                if (partialMatch) {
                  filtered += tail.slice(0, partialMatch.index);
                  thinkBuf = partialMatch[0];
                } else {
                  filtered += thinkBuf + tail;
                  thinkBuf = "";
                }
                pos = delta.length;
              }
            } else {
              // Inside think block — look for </think>
              const closeTag = "</think>";
              const combined = thinkBuf + delta.slice(pos);
              const closeIdx = combined.indexOf(closeTag);
              if (closeIdx !== -1) {
                thinkBuf = "";
                pos = delta.length - (combined.length - closeIdx - closeTag.length);
                if (pos < 0) pos = 0;
                inThinking = false;
              } else {
                // Still inside think — consume entire remaining delta
                thinkBuf = combined.slice(-closeTag.length);
                pos = delta.length;
              }
            }
          }
          delta = filtered;
          // ──────────────────────────────────────────────────────────────────

          if (!delta) continue;
          accumulated += delta;

          fileMarkerRe.lastIndex = searchFrom;
          let m: RegExpExecArray | null;
          while ((m = fileMarkerRe.exec(accumulated)) !== null) {
            tryEmitPending(m.index);
            pendingPath = m[1].trim();
            pendingContentStart = m.index + m[0].length;
            searchFrom = pendingContentStart;
          }
        } catch { /* malformed chunk — skip */ }
      }
    }
  } finally {
    clearTimeout(codeTimer);
    clearInterval(keepalive);
  }

  tryEmitPending(accumulated.length);

  logger.info({ emitted, accumulatedChars: accumulated.length }, "streamCodeGen done");
  return { emitted, accumulated };
}

// ── Prompt builders ──────────────────────────────────────────────────────────

function buildCodeSystemPrompt(templateType: string, templateConfig: ReturnType<typeof getTemplateConfig>, styleBrief?: string): string {
  return `You are an elite senior frontend engineer. Output complete React files using ONLY the format below.

▼▼▼ OUTPUT FORMAT — MANDATORY, NO EXCEPTIONS ▼▼▼
Each file starts with this exact line: ===FILE: /path/to/file===
Content follows immediately (no blank line between marker and content).
One blank line separates each file block.
NO markdown fences. NO backticks. NO explanation. NO <think> blocks. Start with ===FILE: immediately.
▲▲▲ END FORMAT RULES ▲▲▲

⚠️ CRITICAL FILE ORDER — follow this EXACTLY:
1. /index.html  2. /src/styles/globals.css  3. /src/main.jsx  4. /src/App.jsx  5. /src/components/*.jsx
App.jsx MUST be written BEFORE any component file. If you must truncate due to token budget, shorten the LAST component — never skip or truncate App.jsx or main.jsx.

TECH STACK:
- React 18 with hooks (useState, useEffect, useRef, useCallback)
- Tailwind CSS for ALL styling — className with utility classes only
- Google Fonts via <link> tags in /index.html
- No external UI libraries. No custom CSS classes (no .btn, .container, .grid-* etc.)
- For gradients/glows not in Tailwind: use inline style={{}} only

QUALITY BAR: Awwwards-worthy. Think Linear, Vercel, Arc, Raycast. Every pixel matters.
- Real marketing copy everywhere — no Lorem ipsum, no "placeholder text"
- Real prices, real feature names, real testimonials with full names + companies
- All sections must be fully filled with content, not empty or sparse
${styleBrief ? `\n${styleBrief}\n` : ""}
TEMPLATE: ${templateType.toUpperCase()}
Personality: ${templateConfig.personality}
${templateConfig.colorNote}

${templateConfig.tailwindConfig}

FILE STRUCTURE:
- /index.html — charset, viewport, Google Fonts <link> tags, title, meta description
- /src/styles/globals.css — ONLY: @font-face or font imports if needed + body { font-family } + minimal resets. Keep it tiny.
- /src/main.jsx — imports './styles/globals.css', mounts <App /> with ReactDOM.createRoot
- /src/App.jsx — imports all components + adds IntersectionObserver for .reveal class (adds 'opacity-100 translate-y-0' when visible, initial classes are 'opacity-0 translate-y-8 transition-all duration-700')
- /src/components/Navbar.jsx — sticky navbar
- /src/components/Hero.jsx — hero section
- /src/components/*.jsx — one file per section

TAILWIND RULES:
□ Use responsive prefixes: sm: md: lg: xl: on all layout-critical classes
□ Hover states on every interactive element: hover:scale-105, hover:-translate-y-1, hover:opacity-90, hover:shadow-lg etc.
□ Buttons must have: font-weight, letter-spacing, transition-all, cursor-pointer, focus:outline-none
□ Cards must have: rounded-xl or rounded-2xl, border, overflow-hidden where needed, transition-all
□ Sections must have generous padding: py-20 md:py-32 minimum
□ Typography scale: hero h1 = text-5xl md:text-7xl font-bold leading-tight; section h2 = text-3xl md:text-5xl; card h3 = text-xl font-semibold
□ All text must be visible: never put light text on light bg or dark text on dark bg
□ Navbar: sticky top-0 z-50 with backdrop-blur-md and semi-transparent bg
□ Mobile menu: useState toggle, shows/hides nav links on small screens
□ Alternating section backgrounds using the palette above
□ NEVER use className="" — every element needs proper Tailwind styling

SECTIONS TO BUILD: ${templateConfig.sections}

TOKEN BUDGET — CRITICAL:
□ Keep className strings concise — don't repeat the same utility multiple times
□ Avoid over-engineering: simple clear Tailwind, no clever abstractions
□ EVERY file must be complete and syntactically valid — unterminated strings/JSX will break the preview
□ If running low on tokens, simplify the LAST component rather than truncating it mid-file

REMINDER: Output ONLY ===FILE: /path=== blocks. No prose. Start with ===FILE: immediately.`;
}

// ── Route ────────────────────────────────────────────────────────────────────

router.post("/", async (req: Request, res: Response) => {
  const startMs = Date.now();
  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiKey) {
    sseSetup(res);
    sseError(res, "NVIDIA_API_KEY not set");
    return;
  }

  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string") {
    sseSetup(res);
    sseError(res, "Missing prompt");
    return;
  }

  const log = req.log;

  sseSetup(res);

  const templateType = detectTemplate(prompt);
  const templateConfig = getTemplateConfig(templateType);
  log.info({ templateType }, "Template detected");

  const styleMode = detectStyleMode(prompt);
  const inspiration = detectInspiration(prompt);
  const styleProfile = buildStyleProfile(templateType, styleMode, inspiration);
  log.info({ styleMode, hasInspiration: !!inspiration }, "Style profile detected");

  const inspirationNote = inspiration ? ` Channeling ${inspiration.split(" — ")[0]} as a reference.` : "";
  sseNarrative(res,
    `On it — I'll build a ${templateType} for you with the ${styleProfile.label} aesthetic.${inspirationNote} Let me think through the structure before I start writing anything.`,
    "understanding"
  );
  sseMomentum(res, `Building ${templateType}`, "Understanding requirements");
  sseStage(res, `Thinking through the ${templateType} structure...`);

  // ── Stage 1: Plan + thought blocks (Reasoner agent) ──────────────────────
  let steps: string[] = [];
  let planningThought: ThoughtBlock | null = null;

  try {
    sseStage(res, "Mapping component hierarchy and data flow...");
    sseMomentum(res, `Building ${templateType}`, "Decomposing into implementation steps");

    const planRaw = await callModel(
      REASONER_MODEL,
      buildPlannerSystemPrompt(),
      `Build this app: ${prompt}\nTemplate type: ${templateType}\nStyle: ${styleProfile.label}`,
      apiKey,
      log,
      "plan",
      PLAN_TIMEOUT_MS,
      6000,
    );

    try {
      const parsed = parseJson(cleanJson(planRaw));
      steps = parsed.steps ?? [];

      // Extract planning thought block
      if (parsed.planningThought) {
        planningThought = {
          title: parsed.planningThought.title ?? `Planning ${templateType} architecture`,
          estimatedDuration: parsed.planningThought.estimatedDuration ?? "—",
          reasoning: parsed.planningThought.reasoning ?? "",
          strategy: parsed.planningThought.strategy ?? "",
          insights: parsed.planningThought.insights ?? [],
          phase: "planning",
        };
      }
    } catch (parseErr: any) {
      log.warn({ parseErr: parseErr.message }, "Failed to parse enriched plan — falling back");
      // Try to extract just steps from raw text
      try {
        const fallback = parseJson(cleanJson(planRaw));
        steps = fallback.steps ?? [];
      } catch { /* use empty steps */ }
    }

    if (!planningThought) {
      planningThought = fallbackPlanningThought(templateType, steps);
    }

    // Emit thought block BEFORE the plan narrative
    sseThought(res, planningThought);

    if (steps.length) {
      const planText = buildNarrativeFromSteps(steps);
      sseNarrative(res, planText, "planning");
    }
  } catch (err: any) {
    log.error({ err: err.message }, "Plan stage failed");
    sseError(res, `Planning failed: ${err.message}`);
    return;
  }

  // ── Stage 2: Architect + thought blocks (Reasoner agent) ──────────────────
  const coreFiles = [
    "/index.html",
    "/src/styles/globals.css",
    "/src/main.jsx",
    "/src/App.jsx",
  ];

  let sectionComponents: string[] = [];
  let archThought: ThoughtBlock | null = null;

  try {
    sseStage(res, "Resolving component list...");
    sseMomentum(res, `Building ${templateType}`, "Mapping component architecture");

    const archRaw = await callModel(
      REASONER_MODEL,
      buildArchitectSystemPrompt(templateType),
      JSON.stringify({ steps, templateType, sections: templateConfig.sections, userRequest: prompt }),
      apiKey,
      log,
      "architect",
      ARCH_TIMEOUT_MS,
      4096,
    );

    try {
      const parsed = parseJson(cleanJson(archRaw));
      sectionComponents = (parsed.components ?? []).filter(
        (f: string) => f.startsWith("/src/components/") && f.endsWith(".jsx"),
      );

      if (parsed.architecturalThought) {
        archThought = {
          title: parsed.architecturalThought.title ?? "Component structure resolved",
          estimatedDuration: parsed.architecturalThought.estimatedDuration ?? "—",
          reasoning: parsed.architecturalThought.reasoning ?? "",
          strategy: parsed.architecturalThought.strategy ?? "",
          insights: parsed.architecturalThought.insights ?? [],
          phase: "architecture",
        };
      }
    } catch (parseErr: any) {
      log.warn({ parseErr: parseErr.message }, "Architect parse failed — using defaults");
    }
  } catch (err: any) {
    log.warn({ err: err.message }, "Architect stage failed — using defaults");
  }

  if (!sectionComponents.length) {
    sectionComponents = [
      "/src/components/Navbar.jsx",
      "/src/components/Hero.jsx",
      "/src/components/Features.jsx",
      "/src/components/CTA.jsx",
      "/src/components/Footer.jsx",
    ];
  }
  if (!archThought) {
    archThought = fallbackArchThought(sectionComponents);
  }

  const allFiles = [...coreFiles, ...sectionComponents];
  log.info({ files: allFiles }, "Architecture resolved");

  // Emit architectural thought block + narrative
  sseThought(res, archThought);

  const archNarrative = buildArchNarrative(coreFiles, sectionComponents, allFiles);
  sseNarrative(res, archNarrative, "building");
  sseMomentum(res, `Building ${templateType}`, `Writing ${allFiles.length} files`);
  sseStage(res, `Writing ${allFiles.length} files...`);

  // ── Stage 3: Code generation (Coder agent — streaming) ─────────────────────
  const codeSystemPrompt = buildCodeSystemPrompt(templateType, templateConfig, styleProfile.brief);
  const userCodePrompt = `Build this app: ${prompt}

Files to write: ${allFiles.join(", ")}

Add these Google Fonts <link> tags in /index.html <head>:
${templateConfig.fonts}

EXECUTION CHECKLIST — every item is required:
□ /index.html — proper <title>, meta description matching the app, Google Fonts links
□ /src/styles/globals.css — body font-family only, tiny file
□ /src/main.jsx — import globals.css, ReactDOM.createRoot mount
□ /src/App.jsx — compose all sections + IntersectionObserver for elements with class "reveal"
□ Navbar — sticky top-0 z-50 backdrop-blur, logo + nav links + CTA button, useState mobile menu toggle that works
□ Hero — eyebrow badge pill, large headline (text-5xl md:text-7xl) with gradient on 1-2 words using bg-clip-text, subtitle, 2 CTA buttons, visual element (SVG illustration or mockup)
□ Every section: generous py-20 md:py-32 padding, add "reveal" class for scroll animation
□ Feature cards: rounded-2xl border, icon, title, description, hover:-translate-y-1 hover:shadow-xl transition-all
□ Pricing: 3 tiers, middle has "Most Popular" badge and featured border/glow, real prices
□ Testimonials: ★★★★★ stars, specific meaningful quote, initials circle avatar, full name + role + company
□ CTA section: large bold heading, urgency subtext, 2 buttons, gradient/glow background
□ Footer: 4-col flex/grid layout (brand col + 3 link groups), copyright bar below
□ All text is readable: correct contrast for each background color
□ Real marketing copy: specific feature names, real-sounding testimonials, real prices — NO Lorem ipsum`;

  sseStage(res, "Coding with Qwen3 Coder...");

  let streamEmitted = 0;
  let accumulated = "";

  try {
    const result = await streamCodeGen(codeSystemPrompt, userCodePrompt, apiKey, res, log);
    streamEmitted = result.emitted;
    accumulated = result.accumulated;
  } catch (err: any) {
    log.error({ err: err.message }, "Code stage failed");
    sseError(res, `Code generation failed: ${err.message}`);
    return;
  }

  // ── Fallback: re-parse accumulated text if streaming emitted nothing ───────
  if (streamEmitted === 0) {
    log.warn({
      chars: accumulated.length,
      sample_start: accumulated.slice(0, 400),
      sample_end: accumulated.slice(-200),
    }, "Stream emitted 0 files — attempting fallback parse");

    let fallbackFiles: Array<{ path: string; content: string }> = parseDelimitedFiles(accumulated);
    log.info({ count: fallbackFiles.length }, "Delimited parse result");

    if (fallbackFiles.length === 0) {
      fallbackFiles = parseMarkdownFiles(accumulated);
      log.info({ count: fallbackFiles.length }, "Markdown parse result");
    }

    if (fallbackFiles.length === 0) {
      try {
        const arr: any[] = parseJson(cleanJson(accumulated));
        fallbackFiles = (Array.isArray(arr) ? arr : []).filter(
          (a) => typeof a.path === "string" && typeof a.content === "string" && a.content.length > 0,
        );
        log.info({ count: fallbackFiles.length }, "JSON parse result");
      } catch { /* give up */ }
    }

    const safeFiles = fallbackFiles.filter((f) => f.path.startsWith("/") && f.content.length > 0);

    if (!safeFiles.length) {
      log.warn({ chars: accumulated.length }, "No valid files after all fallback parsers");
      sseError(res, "No files were generated. Try rephrasing your prompt.");
      return;
    }

    for (const file of safeFiles) {
      sseFile(res, file.path, file.content);
      streamEmitted++;
    }
  }

  const duration_ms = Date.now() - startMs;
  log.info({ duration_ms, file_count: streamEmitted, template: templateType }, "Generation complete");

  const doneNarratives = [
    `That's everything — ${streamEmitted} files in ${Math.round(duration_ms / 1000)}s. Bundling the preview now.`,
    `All ${streamEmitted} files are done in ${Math.round(duration_ms / 1000)}s. Preview should be ready in a moment.`,
    `Build complete — ${streamEmitted} files, ${Math.round(duration_ms / 1000)}s. Running the bundler now.`,
  ];
  sseNarrative(res, doneNarratives[streamEmitted % doneNarratives.length], "done");

  sseDone(res, templateType, streamEmitted, styleProfile);
});

export default router;
