"use client";
import Editor from "@monaco-editor/react";
import React, { useEffect, useState, useRef, use } from "react";
import debounce from "lodash/debounce";
import { bootSandbox, getPreviewUrl, writeFile } from "../../../lib/sandbox";
import { SyncEngine } from "../../../lib/syncEngine";
let sandboxBootPromise: Promise<void> | null = null;



export default function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
const syncRef = useRef<SyncEngine | null>(null);
const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [files, setFiles] = useState<Record<string, string>>({
  "/index.html": `<!DOCTYPE html>
<html>
  <body>
    <h1>Ready</h1>
  </body>
</html>`
});

const syncVersionRef = useRef(0);

  const [ready, setReady] = useState(false);
  const [url, setUrl] = useState<string>("");


  const [input, setInput] = useState("");
  const [prompt, setPrompt] = useState<string | null>(null);

  const [messages, setMessages] = useState<
    { role: "user" | "ai"; content: string }[]
  >([]);


  const [tab, setTab] = useState<"preview" | "code" | "logs">("preview");

// LINE ~60 (after iframeRef)
const triggerPreviewSync = () => {
  syncVersionRef.current += 1;

  if (!iframeRef.current) return;

  iframeRef.current.contentWindow?.postMessage(
    {
      type: "SYNC_UPDATE",
      version: syncVersionRef.current,
    },
    "*"
  );
};


const executeActions = async (actions: any[]) => {
  for (const action of actions) {
    switch (action.type) {
      case "write_file": {
        const { path, content } = action;

        setActiveFile(path);

        await syncRef.current?.apply({
  type: "create_file",
  path,
  content,
});

triggerPreviewSync();
break;
      }
case "delete_file": {
  setFiles((prev) => {
    const copy = { ...prev };
    delete copy[action.path];
    return copy;
  });

  await syncRef.current?.apply({
    type: "delete_file",
    path: action.path,
  });

  break;
}

      case "console_log": {
        console.log("[ACOS]", action.message);
        break;
      }
    }
  }
};

useEffect(() => {
  const handler = (event: MessageEvent) => {
    if (event.data?.type === "PREVIEW_READY") {
      console.log("Preview runtime ready");
    }

    if (event.data?.type === "SYNC_ACK") {
      console.log("Preview synced:", event.data.version);
    }
  };

  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}, []);

  useEffect(() => {
    const stored = localStorage.getItem("cloudearc-project-" + projectId);
    setPrompt(stored);
  }, [projectId]);
  
  

 useEffect(() => {
  let alive = true;

  const init = async () => {
  try {
    console.log("STARTING SANDBOX");

    setReady(false);

    if (!sandboxBootPromise) {
  sandboxBootPromise = bootSandbox().then(() => {
    console.log("Sandbox boot completed");
  });
}

await sandboxBootPromise;
console.log("SANDBOX READY");
if (!syncRef.current) {
  syncRef.current = new SyncEngine(setFiles);
} 

    const preview = await getPreviewUrl();

    console.log("PREVIEW URL:", preview);

    

    if (!alive) return;

    if (!preview) {
      throw new Error("No preview URL returned");
    }

    setUrl(preview);
    setReady(true);

  } catch (err) {
    console.error("SANDBOX FAILED:", err);

    if (!alive) return;

    setReady(false);

  }
};

  init();

  return () => {
    alive = false;
  };
}, []);

useEffect(() => {
  if (!url) return;


  return () => {};
}, [url]);

  const [filePanelOpen, setFilePanelOpen] = useState(false);

const [activeFile, setActiveFile] = useState("/index.html");
const debouncedWrite = useRef(
  debounce(async (path: string, content: string) => {
    try {
      await writeFile(path, content);
    } catch (err) {
      console.error("WRITE FAILED:", err);
    }
  }, 300)
).current;

useEffect(() => {
  console.log("URL STATE:", url);
}, [url]);

const sendMessage = async () => {
  if (!input.trim()) return;

  const userMessage = input;

  setMessages((prev) => [
    ...prev,
    { role: "user", content: userMessage },
  ]);

  setInput("");

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: userMessage,
        context: {
          projectId,
          files: Object.keys(files),
        },
      }),
    });

    const actions = await res.json();

    if (!Array.isArray(actions) || actions.length === 0) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "No actions returned." },
      ]);
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        role: "ai",
        content: `Executing: ${actions[0]?.type ?? "unknown"}`,
      },
    ]);

    await executeActions(actions);

    setMessages((prev) => [
      ...prev,
      {
        role: "ai",
        content: `Completed: ${actions[0]?.type ?? "unknown"}`,
      },
    ]);

  } catch (err) {
    console.error("SEND MESSAGE FAILED:", err);

    setMessages((prev) => [
      ...prev,
      {
        role: "ai",
        content: "Execution failed.",
      },
    ]);
  }
};

  return (
    <div className="h-screen flex bg-[#0A0A0A] text-white overflow-hidden">


      {/* ICON SIDEBAR */}
      <aside className="w-14 bg-[#0C0C0C] flex flex-col items-center py-3">
        <div className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center text-sm font-semibold">
          C
        </div>

        <div className="mt-6 flex flex-col gap-3 text-zinc-500 text-sm">
          <button className="w-9 h-9 rounded-lg bg-white/10 text-white">⌂</button>
          <button className="w-9 h-9 rounded-lg hover:bg-white/5 transition">✦</button>
          <button className="w-9 h-9 rounded-lg hover:bg-white/5 transition">⌘</button>
        </div>

        <div className="mt-auto">
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs">
            N
          </div>
        </div>
      </aside>

      {/* AI PANEL */}
      <aside className="w-80 bg-[#111111] flex flex-col border-r border-white/5">

        <div className="p-4 border-b border-white/5">
          <div className="text-sm font-medium">Build Assistant</div>
          <div className="text-xs text-zinc-500 mt-1">
            Describe changes to your app
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {messages.length === 0 ? (
            <>
              <div className="bg-white/[0.03] rounded-xl p-3 text-sm text-zinc-300">
                Project initialized successfully.
              </div>
              <div className="bg-white/[0.03] rounded-xl p-3 text-sm text-zinc-300">
                Waiting for instructions...
              </div>
            </>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-xl p-3 text-sm ${
                  m.role === "user"
                    ? "bg-white text-black ml-auto w-fit"
                    : "bg-white/[0.03] text-zinc-300"
                }`}
              >
                {m.content}
              </div>
            ))
          )}

        </div>

        <div className="p-3 border-t border-white/5">

          <div className="bg-white/[0.04] rounded-xl p-3">

            <textarea
  value={input}
  onChange={(e) => setInput(e.target.value)}
  placeholder="Ask CloudeArc to build..."
  className="w-full h-5 bg-transparent resize-none outline-none text-sm placeholder:text-zinc-600"
  onKeyDown={(e) => {
    
    if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
      
    }
  }}
/>

            <div className="flex justify-end mt-3">
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition
                  ${
                    input.trim()
                      ? "bg-white text-black hover:scale-105"
                      : "bg-white/10 text-zinc-600"
                  }
                `}
              >
                ↑
              </button>
            </div>

          </div>

        </div>

      </aside>

      

      {/* MAIN WORKSPACE */}
<main className="flex-1 flex flex-col bg-[#0B0B0B]">
  

  {/* TOP BAR (PROJECT + DOMAIN) */}
  <div className="h-14 border-b border-white/5 flex items-center px-4 relative">

  {/* LEFT - Project */}
  <div className="flex items-center gap-2 min-w-[180px]">
    <div className="text-sm font-medium">
  ACOS Workspace
</div>
  </div>

  {/* CENTER DOMAIN */}
  <div className="flex-1 flex justify-center">
    <div className="flex items-center gap-5 bg-white/5 px-3 py-1.5 rounded-lg w-[480px]">

     <span className="text-white opacity-70">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M2 12h20"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M12 2c2.5 2.7 4 6.6 4 10s-1.5 7.3-4 10c-2.5-2.7-4-6.6-4-10s1.5-7.3 4-10Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
</span>

      <input
        value={url || ""}
        readOnly
        placeholder="Starting preview..."
        className="bg-transparent text-xs text-zinc-300 w-full outline-none"
      />

      <button
  onClick={() => url && window.open(url, "_blank")}
  className="
    w-4 h-4
    rounded-lg
    border border-white/10
    bg-white/[0.03]
    hover:bg-white/[0.08]
    transition
    flex items-center justify-center
    text-white/70 hover:text-white
    shrink-0
  "
>
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
  >
    <path
      d="M14 5h5v5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 14L19 5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M19 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
</button>

    </div>
  </div>



  {/* RIGHT - Actions */}
  <div className="ml-auto mr-14 flex items-center gap-2 min-w-[180px] justify-end">

    <button className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 transition">
      Share
    </button>

    <button className="px-3 py-1.5 text-xs rounded-lg bg-white text-black hover:bg-zinc-200 transition">
      Deploy
    </button>

  </div>

</div>

  {/* TABS */}
  <div className="h-11 border-b border-white/5 flex items-center px-4 gap-2">

    <button
      onClick={() => setTab("preview")}
      className={`px-3 py-1.5 rounded-lg text-xs ${
        tab === "preview"
          ? "bg-white/10 text-white"
          : "text-zinc-500 hover:bg-white/5"
      }`}
    >
      Preview
    </button>

    <button
      onClick={() => setTab("code")}
      className={`px-3 py-1.5 rounded-lg text-xs ${
        tab === "code"
          ? "bg-white/10 text-white"
          : "text-zinc-500 hover:bg-white/5"
      }`}
    >
      Code
    </button>

    <button
      onClick={() => setTab("logs")}
      className={`px-3 py-1.5 rounded-lg text-xs ${
        tab === "logs"
          ? "bg-white/10 text-white"
          : "text-zinc-500 hover:bg-white/5"
      }`}
    >
      Logs
    </button>

  </div>

  {/* CONTENT AREA */}
  <div className="h-[calc(100vh-112px)] flex flex-col">

    {/* PREVIEW TAB */}
{tab === "preview" && (
  <div className="flex-1 bg-[#0F0F0F] p-5 overflow-hidden">
    <div className="w-full h-full rounded-2xl border border-white/5 bg-[#151515] overflow-hidden">

      {!ready ? (
        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500">

          <div className="w-10 h-10 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center mb-4 animate-pulse">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="text-white/70"
            >
              <path d="M12 3V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M12 17V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M3 12H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M17 12H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>

          <div className="text-sm text-white/70">
            Initializing Runtime
          </div>

          <div className="text-xs text-white/30 mt-1">
            Preparing isolated development environment
          </div>

        </div>
      ) : url ? (
        <iframe
  ref={iframeRef}
  src={url || undefined}
  className="w-full h-full border-0"
/>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm">
          Failed to load preview
        </div>
      )}

    </div>
  </div>
)}

    {/* CODE TAB */}
{tab === "code" && (
  <div className="flex-1 flex bg-[#0F0F0F] overflow-hidden">

    {/* FILE SIDEBAR */}
    <div className="w-64 border-r border-white/5 bg-[#111111] overflow-y-auto">

      <div className="p-3 border-b border-white/5 text-xs text-zinc-500 uppercase tracking-wide">
        Files
      </div>

      <div className="p-2 space-y-1">
        {Object.keys(files).map((file) => (
          <button
            key={file}
            onClick={() => setActiveFile(file)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
              activeFile === file
                ? "bg-white/10 text-white"
                : "text-zinc-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {file.replace("/", "")}
          </button>
        ))}
      </div>

    </div>

    {/* EDITOR */}
    <div className="flex-1 overflow-hidden">

      <Editor
        height="100%"
        theme="vs-dark"
        path={activeFile}
        defaultLanguage="javascript"
        value={files[activeFile] || ""}

        onChange={(value) => {
  const updated = value || "";

  setFiles((prev) => ({
    ...prev,
    [activeFile]: updated,
  }));

  debouncedWrite(activeFile, updated);
}}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          smoothScrolling: true,
          automaticLayout: true,
          padding: {
            top: 16,
          },
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
        }}
      />

    </div>

  </div>
)}

    {/* LOGS TAB */}
    {tab === "logs" && (
      <div className="flex-1 p-5 text-zinc-400 text-sm">
        Logs coming next...
      </div>
    )}

  </div>


{filePanelOpen && (
  <div className="absolute top-0 right-0 h-full w-72 bg-[#0B0B0B] border-l border-white/10 z-50 flex flex-col">

    {/* header */}
    <div className="h-12 flex items-center justify-between px-3 border-b border-white/5">
      <div className="text-xs text-white/60">Explorer</div>

      <button
        onClick={() => setFilePanelOpen(false)}
        className="w-7 h-7 flex items-center justify-center hover:bg-white/5 rounded"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M6 6l12 12M18 6L6 18" stroke="white" strokeWidth="1.5"/>
        </svg>
      </button>
    </div>

    {/* files */}
    <div className="p-3 text-xs text-white/60 space-y-2">
      {Object.keys(files).map((file) => (
        <div
          key={file.replace("/", "")}
          onClick={() => setActiveFile(file)}
          className={`cursor-pointer hover:text-white ${
            activeFile === file ? "text-white" : ""
          }`}
        >
          {file}
        </div>
      ))}
    </div>

  </div>
)}
<button
  onClick={() => setFilePanelOpen(true)}
  className="absolute top-4 right-4 group"
>
  <div className="relative w-10 h-10 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md overflow-hidden transition-all duration-200 hover:bg-white/[0.06] hover:border-white/20">

    {/* subtle glow */}
    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent opacity-60" />

    {/* icon */}
    <div className="relative z-10 w-full h-full flex items-center justify-center">
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        className="text-white/80 group-hover:text-white transition"
      >
        <path
          d="M4 6.5C4 5.67 4.67 5 5.5 5H9L10.5 7H18.5C19.33 7 20 7.67 20 8.5V17.5C20 18.33 19.33 19 18.5 19H5.5C4.67 19 4 18.33 4 17.5V6.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M8 11H16"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M8 14H13"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>

  </div>
</button>

</main>
    </div>
  );
}