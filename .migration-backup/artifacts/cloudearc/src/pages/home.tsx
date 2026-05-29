import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { loadChats, type StoredConversation } from "./chat";

// ─── Recent projects ─────────────────────────────────────────────────────────

interface RecentProject {
  id: string;
  prompt: string;
  name?: string;
  createdAt: number;
}

function loadRecent(): RecentProject[] {
  try {
    return JSON.parse(localStorage.getItem("cloudearc-recent") ?? "[]");
  } catch {
    return [];
  }
}

function saveToRecent(id: string, prompt: string) {
  const existing = loadRecent().filter((p) => p.id !== id);
  const updated: RecentProject[] = [
    { id, prompt, createdAt: Date.now() },
    ...existing,
  ].slice(0, 20);
  localStorage.setItem("cloudearc-recent", JSON.stringify(updated));
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Gallery examples ────────────────────────────────────────────────────────

const EXAMPLES = [
  {
    category: "SaaS",
    emoji: "⚡",
    title: "Dev deployment tool",
    description: "Dark, minimal SaaS like Linear or Vercel",
    prompt:
      "Build a SaaS landing page for a developer deployment platform called 'Launchpad'. Features: one-click deploys, GitHub integration, instant rollbacks, global CDN. Dark minimal style like Vercel. Include pricing at $9/$29/$79.",
  },
  {
    category: "AI Tool",
    emoji: "✦",
    title: "AI writing assistant",
    description: "Futuristic, electric-blue like Anthropic",
    prompt:
      "Build a landing page for an AI writing assistant called 'Prose' that helps teams write faster with AI autocomplete, tone matching, and brand voice training. Electric blue, sophisticated, like Anthropic or Cohere.",
  },
  {
    category: "Portfolio",
    emoji: "◈",
    title: "Designer portfolio",
    description: "Editorial, warm serif — Awwwards style",
    prompt:
      "Build a personal portfolio for a senior product designer named Alex Chen. Show 4 case studies, an about section, skills in Figma/Framer/React, and a contact section. Warm editorial style with serif headings.",
  },
  {
    category: "Agency",
    emoji: "▲",
    title: "Creative agency",
    description: "Bold, dramatic — like Huge or Fantasy",
    prompt:
      "Build a creative agency website for 'Studio Arc', a brand and digital product agency. Services: brand identity, web design, product strategy. Bold coral accent, Syne display font, dramatic typographic scale.",
  },
  {
    category: "Dashboard",
    emoji: "◻",
    title: "Analytics dashboard",
    description: "Clean, data-rich — like Linear analytics",
    prompt:
      "Build an analytics dashboard for a SaaS product called 'Metrics'. Show sidebar nav, metric cards (MRR, DAU, Churn, NPS), a main revenue chart, a user table, and an activity feed. Clean light UI like Notion or Linear.",
  },
  {
    category: "Fitness",
    emoji: "◉",
    title: "Fitness app",
    description: "Athletic, energetic — like Whoop or Nike",
    prompt:
      "Build a fitness training app landing page called 'Apex'. Features: personalized workout plans, live coaching, nutrition tracking, wearable sync. Dark with electric green accent, bold Syne display font, athletic energy.",
  },
];

const QUICK_PROMPTS = [
  "A productivity app for remote teams",
  "A crypto portfolio tracker",
  "A recipe sharing community",
  "A freelancer invoicing tool",
  "An online learning platform",
  "A travel booking startup",
];

const EXAMPLE_CATEGORIES = ["All", ...Array.from(new Set(EXAMPLES.map((e) => e.category)))];

type View = "home" | "projects" | "chats" | "files" | "deploy" | "settings";

// ─── Chats View ───────────────────────────────────────────────────────────────

function deleteChat(id: string) {
  try {
    const all = JSON.parse(localStorage.getItem("cloudearc-chats") ?? "[]");
    localStorage.setItem("cloudearc-chats", JSON.stringify(all.filter((c: StoredConversation) => c.id !== id)));
  } catch {}
}

function ChatsView({ chats, onOpen, onDelete }: {
  chats: StoredConversation[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? chats.filter((c) =>
        c.title.toLowerCase().includes(query.trim().toLowerCase())
      )
    : chats;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="flex-1 flex flex-col px-8 pt-10 pb-16 max-w-4xl w-full mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white/90">Conversations</h1>
            <p className="text-xs text-zinc-500 mt-1">Past chats with the AI before projects were started</p>
          </div>
          {chats.length > 0 && (
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none"
                width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations…"
                className="bg-white/[0.04] border border-white/[0.07] rounded-lg pl-8 pr-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition w-52"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition text-sm leading-none"
                >
                  ×
                </button>
              )}
            </div>
          )}
        </div>

        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center py-24">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4 text-lg text-zinc-500">
              ✦
            </div>
            <div className="text-sm text-zinc-400 font-medium mb-1">No conversations yet</div>
            <div className="text-xs text-zinc-600">Start a chat from Home and it will appear here.</div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_140px_56px] gap-4 px-4 pb-2 border-b border-white/[0.05]">
              <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-600 font-semibold">Message</span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-600 font-semibold">Date</span>
              <span />
            </div>

            {filtered.length === 0 && (
              <div className="py-12 text-center text-xs text-zinc-600">
                No conversations match "<span className="text-zinc-400">{query}</span>"
              </div>
            )}

            {filtered.map((chat) => (
              <div
                key={chat.id}
                className="grid grid-cols-[1fr_140px_56px] gap-4 px-4 py-3 rounded-xl hover:bg-white/[0.04] transition group items-center cursor-pointer"
                onMouseEnter={() => setHoveredId(chat.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onOpen(chat.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 flex-shrink-0 rounded-lg bg-white/[0.05] border border-white/[0.06] flex items-center justify-center text-[11px] text-zinc-500 group-hover:border-white/[0.10] transition">
                    ✦
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-zinc-300 group-hover:text-white truncate transition">
                      {chat.title}
                    </div>
                    {chat.projectId && (
                      <div className="text-[10px] text-emerald-700 mt-0.5 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-emerald-600 inline-block" />
                        Led to a project
                      </div>
                    )}
                    <div className="text-[11px] text-zinc-600 mt-0.5">
                      {chat.messages.length} message{chat.messages.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                <span className="text-xs text-zinc-500">
                  {new Date(chat.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>

                <div className={`flex items-center gap-1 transition-opacity ${hoveredId === chat.id ? "opacity-100" : "opacity-0"}`}>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(chat.id); }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
                    title="Delete conversation"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Projects View ────────────────────────────────────────────────────────────

function deleteProject(id: string) {
  const updated = loadRecent().filter((p) => p.id !== id);
  localStorage.setItem("cloudearc-recent", JSON.stringify(updated));
  localStorage.removeItem("cloudearc-project-" + id);
}

function renameProject(id: string, name: string) {
  const updated = loadRecent().map((p) =>
    p.id === id ? { ...p, name: name.trim() || undefined } : p
  );
  localStorage.setItem("cloudearc-recent", JSON.stringify(updated));
}

function ProjectsView({
  recent,
  onOpen,
  onDelete,
  onRename,
}: {
  recent: RecentProject[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? recent.filter((p) => {
        const q = query.trim().toLowerCase();
        return (
          p.prompt.toLowerCase().includes(q) ||
          (p.name ?? "").toLowerCase().includes(q)
        );
      })
    : recent;

  const startEdit = (proj: RecentProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(proj.id);
    setEditValue(proj.name ?? "");
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const commitEdit = (id: string) => {
    onRename(id, editValue);
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="flex-1 flex flex-col px-8 pt-10 pb-16 max-w-4xl w-full mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white/90">Projects</h1>
            <p className="text-xs text-zinc-500 mt-1">Your project history</p>
          </div>
          {recent.length > 0 && (
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects…"
                className="bg-white/[0.04] border border-white/[0.07] rounded-lg pl-8 pr-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition w-52"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition text-sm leading-none"
                >
                  ×
                </button>
              )}
            </div>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center py-24">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4 text-xl">
              ◻
            </div>
            <div className="text-sm text-zinc-400 font-medium mb-1">No projects yet</div>
            <div className="text-xs text-zinc-600">
              Go to Home and create your first project to see it here.
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_120px_80px_68px] gap-4 px-4 pb-2 border-b border-white/[0.05]">
              <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-600 font-semibold">Name</span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-600 font-semibold">Created</span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-600 font-semibold">Age</span>
              <span />
            </div>

            {filtered.length === 0 && (
              <div className="py-12 text-center text-xs text-zinc-600">
                No projects match "<span className="text-zinc-400">{query}</span>"
              </div>
            )}

            {filtered.map((proj) => (
              <div
                key={proj.id}
                className="grid grid-cols-[1fr_120px_80px_68px] gap-4 px-4 py-3 rounded-xl hover:bg-white/[0.04] transition group items-center"
                onMouseEnter={() => setHoveredId(proj.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Name / inline editor */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 flex-shrink-0 rounded-lg bg-white/[0.05] border border-white/[0.06] flex items-center justify-center text-[11px] text-zinc-500 group-hover:border-white/[0.10] transition">
                    ◻
                  </div>
                  {editingId === proj.id ? (
                    <input
                      ref={editInputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit(proj.id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      onBlur={() => commitEdit(proj.id)}
                      placeholder={proj.prompt.slice(0, 40) + "…"}
                      className="flex-1 bg-white/[0.06] border border-white/[0.15] rounded-md px-2 py-0.5 text-sm text-white outline-none min-w-0"
                    />
                  ) : (
                    <button
                      onClick={() => onOpen(proj.id)}
                      className="min-w-0 text-left"
                    >
                      {proj.name ? (
                        <div>
                          <div className="text-sm text-zinc-200 group-hover:text-white truncate leading-tight transition font-medium">
                            {proj.name}
                          </div>
                          <div className="text-[11px] text-zinc-600 truncate mt-0.5">
                            {proj.prompt.length > 60 ? proj.prompt.slice(0, 60) + "…" : proj.prompt}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-zinc-300 group-hover:text-white truncate leading-tight transition block">
                          {proj.prompt.length > 80 ? proj.prompt.slice(0, 80) + "…" : proj.prompt}
                        </span>
                      )}
                    </button>
                  )}
                </div>

                <span className="text-xs text-zinc-500">{formatDate(proj.createdAt)}</span>
                <span className="text-xs text-zinc-600">{timeAgo(proj.createdAt)}</span>

                {/* Action buttons */}
                <div className={`flex items-center gap-1 transition-opacity duration-150 ${hoveredId === proj.id && editingId !== proj.id ? "opacity-100" : "opacity-0"}`}>
                  <button
                    onClick={(e) => startEdit(proj, e)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06] transition-all duration-150"
                    title="Rename project"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete(proj.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-all duration-150"
                    title="Delete project"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const [input, setInput] = useState("");
  const [, navigate] = useLocation();
  const [recent, setRecent] = useState<RecentProject[]>([]);
  const [chats, setChats] = useState<StoredConversation[]>([]);
  const [activeView, setActiveView] = useState<View>("home");
  const [categoryFilter, setCategoryFilter] = useState("All");

  useEffect(() => {
    setRecent(loadRecent());
    setChats(loadChats());
  }, []);

  const isConversational = (text: string): boolean => {
    const t = text.trim().toLowerCase();
    if (/^(hi|hello|hey|sup|yo|howdy|hiya|helo)\b/.test(t)) return true;
    if (t.endsWith("?")) return true;
    if (/^(what|how|can you|could you|do you|help me|not sure|any ideas|i don't know|i don't have|i have no|tell me|show me|i want to chat|let's talk|talk to me)\b/.test(t)) return true;
    if (t.split(/\s+/).length < 4 && !/\b(app|site|page|tool|dashboard|landing|portfolio|shop|store|game|form|calculator|blog|chat|timer|tracker|builder)\b/.test(t)) return true;
    return false;
  };

  const handleCreate = (prompt?: string) => {
    const text = (prompt ?? input).trim();
    if (!text) return;
    if (isConversational(text)) {
      navigate(`/chat?msg=${encodeURIComponent(text)}`);
      return;
    }
    const projectId = Date.now().toString();
    localStorage.setItem("cloudearc-project-" + projectId, text);
    saveToRecent(projectId, text);
    navigate(`/workspace/${projectId}`);
  };

  const fillPrompt = (prompt: string) => {
    setInput(prompt);
    setActiveView("home");
    setTimeout(() => {
      const ta = document.getElementById("main-input") as HTMLTextAreaElement;
      ta?.focus();
      ta?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const NAV_ITEMS: { label: string; view: View }[] = [
    { label: "Projects", view: "projects" },
    { label: "Conversations", view: "chats" },
    { label: "Files", view: "files" },
    { label: "Deploy", view: "deploy" },
    { label: "Settings", view: "settings" },
  ];

  return (
    <div className="h-screen w-full flex bg-[#090909] text-white overflow-hidden">
      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside className="w-60 bg-[#0C0C0C] flex flex-col flex-shrink-0 border-r border-white/[0.04]">
        <div className="p-4">
          <button onClick={() => navigate("/")} className="text-left hover:opacity-80 transition">
            <div className="text-sm font-semibold tracking-tight">CloudeArc</div>
            <div className="text-xs text-zinc-500 mt-0.5">Workspace</div>
          </button>
        </div>

        <div className="p-3 space-y-2">
          <button
            onClick={() => handleCreate(input)}
            className="w-full text-xs bg-white text-black py-2 rounded-lg hover:opacity-90 transition font-medium"
          >
            Create new
          </button>
          <button className="w-full text-xs bg-white/[0.04] text-zinc-300 py-2 rounded-lg hover:bg-white/[0.07] transition">
            Import
          </button>
        </div>

        <nav className="px-2 space-y-0.5 text-sm mt-1">
          <div
            onClick={() => setActiveView("home")}
            className={`px-3 py-2 rounded-lg text-xs cursor-pointer transition-all duration-150 ${
              activeView === "home"
                ? "bg-white/10 text-white"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Home
          </div>
          {NAV_ITEMS.map(({ label, view }) => (
            <div
              key={label}
              onClick={() => setActiveView(view)}
              className={`px-3 py-2 rounded-lg text-xs cursor-pointer transition-all duration-150 ${
                activeView === view
                  ? "bg-white/10 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {label}
            </div>
          ))}
        </nav>

        <div className="mt-auto p-3 text-xs text-zinc-600">Pro workspace</div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────────────────────── */}
      {activeView === "projects" ? (
        <ProjectsView
          recent={recent}
          onOpen={(id) => navigate(`/workspace/${id}`)}
          onDelete={(id) => {
            deleteProject(id);
            setRecent(loadRecent());
          }}
          onRename={(id, name) => {
            renameProject(id, name);
            setRecent(loadRecent());
          }}
        />
      ) : activeView === "chats" ? (
        <ChatsView
          chats={chats}
          onOpen={(id) => navigate(`/chat/${id}`)}
          onDelete={(id) => {
            deleteChat(id);
            setChats(loadChats());
          }}
        />
      ) : (
        <main className="flex-1 flex flex-col overflow-y-auto">
          <div className="flex-1 flex flex-col items-center justify-start pt-16 pb-16 px-6">
            <div className="w-full max-w-3xl">
              {/* Heading */}
              <div className="text-center mb-6">
                <div className="text-xs text-zinc-500 mb-1 tracking-wide uppercase">CloudeArc</div>
                <h1 className="text-2xl font-semibold tracking-tight text-white/90">
                  What do you want to build?
                </h1>
                <p className="text-xs text-zinc-600 mt-1.5">
                  Describe your app or pick a starting point below
                </p>
              </div>

              {/* ── Input Card ─────────────────────────────────────────── */}
              <div
                className={`
                  bg-white/[0.03] hover:bg-white/[0.05]
                  border border-white/[0.06] hover:border-white/[0.10]
                  transition-all duration-300 rounded-xl p-3 relative overflow-hidden
                  ${input.length > 0 ? "-translate-y-[2px] shadow-[0_20px_40px_rgba(0,0,0,0.4)]" : ""}
                `}
              >
                <div
                  className={`absolute inset-0 pointer-events-none rounded-xl bg-gradient-to-r from-transparent via-white/[0.03] to-transparent blur-2xl transition-opacity duration-700 ${input.length > 0 ? "opacity-60" : "opacity-0"}`}
                />
                <div className="flex items-end gap-2 relative">
                  <textarea
                    id="main-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    rows={3}
                    className="flex-1 bg-transparent outline-none text-sm resize-none placeholder:text-zinc-600 text-zinc-200 leading-5 tracking-tight"
                    placeholder="Describe your app — e.g. 'A dark SaaS landing page for a developer tool...'"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleCreate();
                      }
                    }}
                  />
                  <button
                    onClick={() => handleCreate()}
                    disabled={!input.trim()}
                    className={`w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl transition-all
                      ${input.trim()
                        ? "bg-white text-black hover:scale-105 active:scale-95"
                        : "bg-white/10 text-zinc-600 cursor-not-allowed"
                      }`}
                  >
                    ↑
                  </button>
                </div>
              </div>

              {/* ── Quick Prompts ───────────────────────────────────────── */}
              <div className="flex flex-wrap gap-2 mt-3 justify-center">
                {QUICK_PROMPTS.map((qp) => (
                  <button
                    key={qp}
                    onClick={() => handleCreate(qp)}
                    className="text-xs text-zinc-500 hover:text-zinc-200 border border-white/[0.06] hover:border-white/[0.14] bg-white/[0.02] hover:bg-white/[0.05] px-3 py-1.5 rounded-full transition-all duration-200"
                  >
                    {qp}
                  </button>
                ))}
              </div>

              {/* ── Gallery ────────────────────────────────────────────── */}
              <div className="flex items-center gap-3 mt-10 mb-4">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600 font-medium">
                  Start from a template
                </span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              {/* Category filter pills */}
              <div className="flex flex-wrap gap-1.5 mb-4 justify-center">
                {EXAMPLE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`text-[10px] font-medium px-3 py-1 rounded-full border transition-all duration-150 ${
                      categoryFilter === cat
                        ? "bg-white text-black border-white"
                        : "border-white/[0.08] text-zinc-500 hover:text-zinc-300 hover:border-white/[0.15] bg-white/[0.02] hover:bg-white/[0.05]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {EXAMPLES.filter((ex) => categoryFilter === "All" || ex.category === categoryFilter).map((ex) => (
                  <button
                    key={ex.title}
                    onClick={() => fillPrompt(ex.prompt)}
                    className="group text-left rounded-xl p-4 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.10] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-white/[0.06] text-zinc-300">
                        {ex.emoji}
                      </span>
                      <span className="text-[9px] font-semibold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-500">
                        {ex.category}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-white/90 tracking-tight leading-tight mb-1">
                      {ex.title}
                    </div>
                    <div className="text-[11px] text-zinc-500 leading-relaxed">
                      {ex.description}
                    </div>
                    <div className="mt-3 text-[10px] font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-zinc-400">
                      Use this template
                      <span className="group-hover:translate-x-0.5 transition-transform duration-200">→</span>
                    </div>
                  </button>
                ))}
              </div>

              <p className="text-center text-[10px] text-zinc-700 mt-6">
                Click a template to pre-fill the prompt, or type your own above
              </p>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
