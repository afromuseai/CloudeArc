import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useSearch } from "wouter";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Persistence ──────────────────────────────────────────────────────────────

export interface StoredConversation {
  id: string;
  title: string;
  messages: StoredMsg[];
  createdAt: number;
  updatedAt: number;
  projectId?: string;
}

export interface StoredMsg {
  role: "user" | "assistant";
  content: string;
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function loadChats(): StoredConversation[] {
  try {
    return JSON.parse(localStorage.getItem("cloudearc-chats") ?? "[]");
  } catch {
    return [];
  }
}

function saveChat(conv: StoredConversation) {
  const all = loadChats().filter((c) => c.id !== conv.id);
  const updated = [conv, ...all].slice(0, 50);
  localStorage.setItem("cloudearc-chats", JSON.stringify(updated));
}

function saveProjectToRecent(id: string, prompt: string) {
  try {
    const raw = localStorage.getItem("cloudearc-recent") ?? "[]";
    const existing = JSON.parse(raw).filter((p: { id: string }) => p.id !== id);
    const updated = [{ id, prompt, createdAt: Date.now() }, ...existing].slice(0, 20);
    localStorage.setItem("cloudearc-recent", JSON.stringify(updated));
  } catch {}
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Msg = { role: "user" | "assistant"; content: string; thinking?: boolean };

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-[5px] px-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[5px] h-[5px] rounded-full bg-zinc-600 inline-block animate-pulse"
          style={{ animationDelay: `${i * 0.18}s`, animationDuration: "1.1s" }}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ChatPage({ params }: { params?: { id?: string } }) {
  const [, navigate] = useLocation();
  const search = useSearch();
  const urlParams = new URLSearchParams(search);
  const initialMsg = urlParams.get("msg") ?? "";

  // Conversation ID — use URL param if present, else generate a new one
  const convIdRef = useRef<string>(params?.id ?? genId());
  const convId = convIdRef.current;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [urlUpdated, setUrlUpdated] = useState(!!params?.id);

  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pendingProjectId = useRef<string | null>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (feedRef.current) {
        feedRef.current.scrollTop = feedRef.current.scrollHeight;
      }
    });
  }, []);

  // Persist current messages to localStorage
  const persist = useCallback(
    (msgs: Msg[], projectId?: string) => {
      const stored: StoredMsg[] = msgs
        .filter((m) => !m.thinking && m.content)
        .map(({ role, content }) => ({ role, content }));

      const existing = loadChats().find((c) => c.id === convId);
      const title =
        stored.find((m) => m.role === "user")?.content.slice(0, 60) ?? "Conversation";

      const conv: StoredConversation = {
        id: convId,
        title,
        messages: stored,
        createdAt: existing?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
        projectId: projectId ?? existing?.projectId,
      };
      saveChat(conv);
    },
    [convId]
  );

  // Load from localStorage if we have an ID
  useEffect(() => {
    if (params?.id) {
      const existing = loadChats().find((c) => c.id === params.id);
      if (existing?.messages.length) {
        setMessages(existing.messages);
        scrollToBottom();
        return;
      }
    }
    if (initialMsg) {
      startWithMessage(initialMsg);
    } else {
      streamReply([]);
    }
  }, []);

  const startWithMessage = async (text: string) => {
    const userMsg: Msg = { role: "user", content: text };
    setMessages([userMsg, { role: "assistant", content: "", thinking: true }]);
    scrollToBottom();
    pushUrl();
    await streamReply([userMsg]);
  };

  const pushUrl = useCallback(() => {
    if (!urlUpdated) {
      window.history.replaceState(null, "", `${import.meta.env.BASE_URL}chat/${convId}`);
      setUrlUpdated(true);
    }
  }, [urlUpdated, convId]);

  const streamReply = useCallback(
    async (history: Msg[]) => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setStreaming(true);

      // Add thinking bubble if not already present
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.thinking) return prev;
        return [...prev, { role: "assistant", content: "", thinking: true }];
      });
      scrollToBottom();

      try {
        const res = await fetch(`${API_BASE}/api/converse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history
              .filter((m) => !m.thinking)
              .map(({ role, content }) => ({ role, content })),
          }),
          signal: ctrl.signal,
        });

        if (!res.ok || !res.body) throw new Error("API error");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let fullText = "";

        // Replace thinking bubble with empty content
        setMessages((prev) =>
          prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, thinking: false, content: "" } : m
          )
        );

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;
            try {
              const ev = JSON.parse(raw);
              if (ev.text) {
                fullText += ev.text;
                const display = fullText.replace(/<READY>\{.*?\}/s, "").trimEnd();
                setMessages((prev) =>
                  prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: display } : m
                  )
                );
                scrollToBottom();
              }
              if (ev.prompt) {
                const buildPrompt = ev.prompt as string;
                const projectId = Date.now().toString();
                pendingProjectId.current = projectId;
                localStorage.setItem("cloudearc-project-" + projectId, buildPrompt);
                saveProjectToRecent(projectId, buildPrompt);
                setNavigating(true);
                setTimeout(() => navigate(`/workspace/${projectId}`), 1100);
              }
            } catch {}
          }
        }

        // Persist after reply is complete
        setMessages((prev) => {
          persist(prev, pendingProjectId.current ?? undefined);
          return prev;
        });
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") return;
        setMessages((prev) => {
          const updated = prev.map((m, i) =>
            i === prev.length - 1
              ? { ...m, thinking: false, content: "Something went wrong. Please try again." }
              : m
          );
          persist(updated);
          return updated;
        });
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [persist, scrollToBottom, navigate]
  );

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    pushUrl();

    const newMsg: Msg = { role: "user", content: text };
    const history = [...messages.filter((m) => !m.thinking), newMsg];
    setMessages(history);
    persist(history);
    scrollToBottom();

    await streamReply(history);
  };

  const visibleMessages = messages.filter(
    (m) => m.role !== "assistant" || m.content || m.thinking
  );

  const isRestoredSession = !!params?.id && messages.length > 0 && !streaming;

  return (
    <div className="h-screen flex flex-col bg-[#0C0C0C] text-white overflow-hidden">
      {/* Top bar */}
      <div className="h-12 border-b border-white/[0.04] flex items-center justify-between px-4 shrink-0">
        <button
          onClick={() => navigate("/app")}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition"
        >
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          CloudeArc
        </button>

        <div className="flex items-center gap-3">
          {isRestoredSession && (
            <button
              onClick={() => {
                const id = genId();
                convIdRef.current = id;
                navigate("/chat");
              }}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 transition px-2.5 py-1 rounded-lg hover:bg-white/[0.05] border border-white/[0.06]"
            >
              + New chat
            </button>
          )}
          <div className="w-7 h-7 rounded-full bg-[#5865F2] flex items-center justify-center text-[10px] font-bold">
            A
          </div>
        </div>
      </div>

      {/* Feed */}
      <div
        ref={feedRef}
        className="flex-1 overflow-y-auto px-4 py-8"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.06) transparent" }}
      >
        <div className="max-w-2xl mx-auto space-y-6">
          {visibleMessages.length === 0 && !streaming && (
            <div className="text-center text-zinc-700 text-sm py-12">
              Connecting…
            </div>
          )}

          {visibleMessages.map((msg, idx) =>
            msg.role === "user" ? (
              <div key={idx} className="flex justify-end">
                <div className="max-w-[80%] bg-[#1C1C1C] border border-white/[0.07] rounded-2xl px-4 py-2.5 text-sm text-zinc-200 leading-relaxed">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div key={idx} className="flex flex-col gap-1.5">
                {msg.thinking ? (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[9px] shrink-0 text-zinc-400">
                      ✦
                    </div>
                    <TypingIndicator />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-600">
                      <div className="w-5 h-5 rounded-full bg-white/[0.05] border border-white/[0.06] flex items-center justify-center text-[8px] shrink-0 text-zinc-500">
                        ✦
                      </div>
                      CloudeArc
                    </div>
                    <div className="pl-7 text-[15px] text-zinc-200 leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </>
                )}
              </div>
            )
          )}

          {navigating && (
            <div className="flex items-center gap-2 pl-7 text-[13px] text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              Opening workspace…
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="px-4 pb-5 shrink-0">
        <div className="max-w-2xl mx-auto">
          <div
            className={`bg-[#161616] border rounded-2xl transition-all duration-200 ${
              streaming
                ? "border-white/[0.05]"
                : "border-white/[0.09] hover:border-white/[0.15] focus-within:border-white/[0.18]"
            }`}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={streaming ? "Thinking…" : "Make, test, iterate…"}
              disabled={streaming || navigating}
              rows={2}
              className="w-full bg-transparent resize-none outline-none text-sm text-zinc-200 placeholder:text-zinc-600 px-4 pt-3.5 pb-1 disabled:opacity-40 leading-relaxed"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <div className="flex items-center justify-between px-3 pb-3 pt-1">
              <div className="text-[11px] text-zinc-700">↵ send · ⇧↵ newline</div>
              <button
                onClick={send}
                disabled={!input.trim() || streaming || navigating}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  input.trim() && !streaming && !navigating
                    ? "bg-white text-black hover:scale-105 active:scale-95"
                    : "bg-white/[0.06] text-zinc-600 cursor-not-allowed"
                }`}
              >
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                >
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
