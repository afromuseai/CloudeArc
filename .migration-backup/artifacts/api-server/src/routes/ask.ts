import { Router, type Request, type Response } from "express";

const router = Router();

const NVIDIA_URL       = "https://integrate.api.nvidia.com/v1/chat/completions";
const FAST_MODEL       = process.env.MODEL_FAST    ?? "bytedance/seed-oss-36b-instruct";
const ASK_TIMEOUT_MS   = 22_000;

function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

router.post("/", async (req: Request, res: Response) => {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) { res.status(500).json({ error: "API key not set" }); return; }

  const { prompt, fileList, intent } = req.body as {
    prompt: string;
    fileList?: string[];
    intent?: "question" | "debug";
  };

  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "Missing prompt" }); return;
  }

  const log = req.log;

  const appCtx = fileList && fileList.length > 0
    ? `\n\nThe user's app currently contains these files: ${fileList.slice(0, 20).join(", ")}.`
    : "";

  const system = intent === "debug"
    ? `You are CloudeArc, an AI software engineer helping debug a React app. The user has reported an issue. Diagnose it clearly and concisely. State the likely cause, then suggest a specific fix in 2-4 sentences. Be technical and direct. No markdown headers. Plain text with line breaks where needed.${appCtx}`
    : `You are CloudeArc, an AI app builder assistant. Answer the user's technical question concisely and helpfully. You're expert in React, TypeScript, Tailwind CSS, and modern web architecture. Be direct and specific — max 4 sentences unless depth is clearly needed. No markdown headers. Plain text only.${appCtx}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ASK_TIMEOUT_MS);

  try {
    const upstream = await fetch(NVIDIA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: FAST_MODEL,
        temperature: 0.3,
        max_tokens: 400,
        messages: [
          { role: "system", content: system },
          { role: "user",   content: prompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!upstream.ok) throw new Error(`HTTP ${upstream.status}`);

    const data = await upstream.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw   = data.choices?.[0]?.message?.content ?? "";
    const reply = stripThinking(raw).trim() || "I couldn't get a response — try rephrasing.";

    log.info({ chars: reply.length, intent }, "Ask ok");
    res.json({ reply });
  } catch (err: any) {
    const isTimeout = err.name === "AbortError";
    log.error({ err: err.message, isTimeout }, "Ask failed");
    res.status(500).json({ error: isTimeout ? "Timed out." : "Could not respond. Try again." });
  } finally {
    clearTimeout(timer);
  }
});

export default router;
