import { useState } from "react";
import { useLocation } from "wouter";

export default function AuthPage() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [, navigate] = useLocation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/app");
  };

  return (
    <div className="min-h-screen flex">
      {/* ── LEFT: Auth form ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12 bg-[#F7F5F2]">
        <div className="w-full max-w-sm">
          {/* Logo mark + brand */}
          <a href="/" className="flex items-center gap-2 mb-10">
            <img src="/logo-light.png" className="w-8 h-8 object-contain" alt="" />
            <span className="text-sm font-semibold tracking-tight text-stone-800">CloudeArc</span>
          </a>

          {/* Heading */}
          <h1 className="text-[26px] font-bold tracking-tight text-stone-800 mb-1">
            {tab === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-[13px] text-stone-400 mb-8">
            {tab === "login"
              ? "Sign in to continue building."
              : "Start building for free — no credit card needed."}
          </p>

          {/* Tab switcher */}
          <div className="flex bg-stone-100 rounded-xl p-1 mb-6 gap-1">
            {(["login", "signup"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-all ${
                  tab === t
                    ? "bg-white text-stone-800 shadow-sm"
                    : "text-stone-400 hover:text-stone-600"
                }`}
              >
                {t === "login" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>

          {/* Social auth */}
          <button className="w-full flex items-center justify-center gap-2.5 border border-stone-200 bg-white rounded-xl py-2.5 text-[13px] font-medium text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition mb-4">
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-stone-200" />
            <span className="text-[11px] text-stone-400 font-medium">or</span>
            <div className="flex-1 h-px bg-stone-200" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {tab === "signup" && (
              <div>
                <label className="block text-[12px] font-medium text-stone-600 mb-1.5">Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full px-3.5 py-2.5 text-[13px] border border-stone-200 rounded-xl bg-white text-stone-800 placeholder:text-stone-300 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200 transition"
                />
              </div>
            )}
            <div>
              <label className="block text-[12px] font-medium text-stone-600 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-3.5 py-2.5 text-[13px] border border-stone-200 rounded-xl bg-white text-stone-800 placeholder:text-stone-300 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200 transition"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[12px] font-medium text-stone-600">Password</label>
                {tab === "login" && (
                  <button type="button" className="text-[11px] text-stone-400 hover:text-stone-600 transition">
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 text-[13px] border border-stone-200 rounded-xl bg-white text-stone-800 placeholder:text-stone-400 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200 transition"
              />
            </div>

            {tab === "signup" && (
              <p className="text-[11px] text-stone-400 leading-relaxed">
                By signing up you agree to our{" "}
                <span className="text-stone-600 underline underline-offset-2 cursor-pointer">Terms</span> and{" "}
                <span className="text-stone-600 underline underline-offset-2 cursor-pointer">Privacy Policy</span>.
              </p>
            )}

            <button
              type="submit"
              className="w-full mt-1 py-2.5 rounded-xl bg-stone-800 text-white text-[13px] font-semibold hover:bg-stone-700 active:scale-[0.98] transition-all"
            >
              {tab === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="text-center text-[12px] text-stone-400 mt-6">
            {tab === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setTab(tab === "login" ? "signup" : "login")}
              className="text-stone-700 font-medium hover:underline"
            >
              {tab === "login" ? "Sign up" : "Log in"}
            </button>
          </p>
        </div>
      </div>

      {/* ── RIGHT: Black brand panel ─────────────────────────────────────── */}
      <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-black relative overflow-hidden">
        {/* Subtle glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[140px]" style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.08) 50%, transparent 80%)" }} />
        </div>

        {/* Logo */}
        <div className="relative flex flex-col items-center gap-6 select-none">
          <img
            src="/logo-dark.png"
            alt="CloudeArc"
            className="w-100 h-100 object-contain"
          />
          <div className="text-center">
            <p className="text-white text-[22px] font-bold tracking-tight">CloudeArc</p>
            <p className="text-stone-500 text-[13px] mt-1">Build apps with AI — fast.</p>
          </div>
        </div>

        {/* Bottom quote */}
        <div className="absolute bottom-10 left-0 right-0 px-10 text-center">
          <p className="text-stone-600 text-[12px] leading-relaxed italic">
            "From idea to deployed app in under 30 seconds."
          </p>
        </div>
      </div>
    </div>
  );
}
