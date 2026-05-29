"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [input, setInput] = useState("");

  const router = useRouter();

  const handleCreate = () => {
  console.log("HANDLE CREATE FIRED");

  if (!input.trim()) {
    console.log("EMPTY INPUT BLOCKED");
    return;
  }

  const projectId = Date.now().toString();

  console.log("PROJECT ID:", projectId);

  localStorage.setItem(
    "cloudearc-project-" + projectId,
    input
  );

  console.log("ABOUT TO ROUTE");

  router.push(`/workspace/${projectId}`);
};


  return (
    
    <div className="h-screen w-full flex bg-[#090909] text-white">

      {/* SIDEBAR */}
      <aside className="w-60 bg-[#0C0C0C] flex flex-col backdrop-blur-xl">

        <div className="p-4">
          <div className="text-sm font-semibold tracking-tight">CloudeArc</div>
          <div className="text-xs text-zinc-500 mt-0.5">Workspace</div>
        </div>

        <div className="p-3 space-y-2">
          <button className="w-full text-xs bg-white text-black py-2 rounded-lg hover:opacity-90 transition">
            Create new
          </button>

          <button className="w-full text-xs bg-white/[0.04] text-zinc-300 py-2 rounded-lg hover:bg-white/[0.07] transition">
            Import
          </button>
        </div>

        <nav className="px-2 space-y-1 text-sm mt-2">
          <div className="px-3 py-2 rounded-lg bg-white/10 text-white">
            Home
            
          </div>

          {["Projects", "Files", "Deploy", "Settings"].map((item) => (
  <div
    key={item}
    className="px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 active:bg-white/10 transition-all duration-150 cursor-pointer"
  >
    {item}
  </div>
))}
        </nav>

        <div className="mt-auto p-3 text-xs text-zinc-600">
          Pro workspace
        </div>
      </aside>

      {/* MAIN */}
     <main className="flex-1 flex items-center justify-center relative">

  {/* CLEAN AMBIENT BACKGROUND (VALID) */}
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.1),transparent_50%)] pointer-events-none" />

  <div className="w-full max-w-3xl px-6">

    <div className="text-center text-xs text-zinc-500 mb-3">
      What do you want to build?
    </div>

    {/* INPUT CARD */}
    <div className={`
      bg-white/[0.03]
      hover:bg-white/[0.06]
      transition
      rounded-xl
      p-3
      relative
      overflow-hidden
      ${input.length > 0 ? "-translate-y-[2px] shadow-[0_20px_40px_rgba(0,0,0,0.35)]" : ""}
    `}>

      {/* SUBTLE ACTIVE GLOW LAYER */}
      <div
  className={`
    absolute inset-0 pointer-events-none rounded-xl
    bg-gradient-to-r from-transparent via-white/[0.03] to-transparent
    blur-2xl
    transition-opacity duration-700 ease-out
    ${input.length > 0 ? "opacity-40" : "opacity-0"}
  `}
/>

      {/* INPUT + BUTTON */}
      <div className="flex items-center justify-between gap-2 relative">

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          
          className="flex-1 h-15 bg-transparent outline-none text-sm resize-none placeholder:text-zinc-600 text-zinc-200 leading-5 tracking-tight"
          placeholder="Describe your app..."
          onKeyDown={(e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleCreate();
  }
}}
        />
      

        <button
  onClick={handleCreate}
  disabled={!input.trim()}
  className={`w-9 h-9 flex items-center justify-center rounded-xl transition
    ${input.trim()
      ? "bg-white text-black hover:scale-105 active:scale-95"
      : "bg-white/10 text-zinc-600 cursor-not-allowed"
    }`}
>
  ↑
</button>

      </div>

    </div>

  </div>
</main>

    </div>
  );
}