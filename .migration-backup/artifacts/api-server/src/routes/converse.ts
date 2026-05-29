import { Router, type Request, type Response } from "express";

const router = Router();

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

// General conversational model — fast, articulate, great at back-and-forth
const MODEL = process.env.MODEL_GENERAL ?? "mistralai/mistral-large-3-675b-instruct-2512";

const SYSTEM_PROMPT = `You are CloudeArc's AI assistant — friendly, concise, and focused on helping users figure out what to build.

Your role: have a short, natural conversation to understand what the user wants to build. Keep responses short (2–4 sentences). Be encouraging and enthusiastic.

When you have enough confidence about what to build (a clear app/site/tool idea), end your response with this on its own line:
<READY>{"prompt":"<full build description here>"}

Rules for the prompt inside <READY>:
- Write it as a detailed build instruction (e.g. "Build a dark SaaS landing page for a project management tool called Orbit. Features: drag-and-drop boards, team workspaces, time tracking, Gantt charts. Dark UI with indigo accents.")
- Only emit <READY> once you're confident — not on greetings, vague messages, or unfinished ideas
- Do NOT include <READY> if the user is still exploring or hasn't committed to an idea

Never mention the <READY> syntax to the user. Just have a natural conversation.`;

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

type Message = { role: "user" | "assistant" | "system"; content: string };

router.post("/", async (req: Request, res: Response) => {
  const { messages } = req.body as { messages: Message[] };
  if (!messages?.length) {
    res.status(400).json({ error: "messages required" });
    return;
  }

  sseSetup(res);

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    sseSend(res, "error", { message: "API key not configured" });
    res.end();
    return;
  }

  const payload = {
    model: MODEL,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    temperature: 0.7,
    max_tokens: 512,
    stream: true,
  };

  try {
    const upstream = await fetch(NVIDIA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      sseSend(res, "error", { message: `API error: ${upstream.status} ${text.slice(0, 200)}` });
      res.end();
      return;
    }

    const reader = upstream.body?.getReader();
    if (!reader) {
      sseSend(res, "error", { message: "No response body" });
      res.end();
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") continue;
        try {
          const chunk = JSON.parse(raw);
          const delta = chunk.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            fullText += delta;
            // Don't stream <think> tokens to the client
            if (!/<think>/i.test(delta) && !fullText.includes("<think>")) {
              sseSend(res, "token", { text: delta });
            }
          }
        } catch {}
      }
    }

    const readyMatch = fullText.match(/<READY>(\{.*?\})/);
    if (readyMatch) {
      try {
        const parsed = JSON.parse(readyMatch[1]);
        sseSend(res, "build_intent", { prompt: parsed.prompt });
      } catch {}
    }

    sseSend(res, "done", {});
    res.end();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    sseSend(res, "error", { message: msg });
    res.end();
  }
});

export default router;
