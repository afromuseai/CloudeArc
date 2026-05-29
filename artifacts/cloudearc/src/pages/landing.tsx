import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";

const NAV_LINKS = ["Features", "Templates", "Pricing", "Docs"];

const APP_TYPES = [
  {
    label: "Website",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
    ),
  },
  {
    label: "Mobile",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M12 18h.01" />
      </svg>
    ),
  },
  {
    label: "Dashboard",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: "SaaS",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    label: "API",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
];

const EXAMPLE_PROMPTS = [
  "Fitness app onboarding",
  "SaaS pricing page",
  "Portfolio with case studies",
  "Analytics dashboard",
  "E-commerce storefront",
];

const LOGOS = [
  "Stripe",
  "Linear",
  "Vercel",
  "Notion",
  "Figma",
  "Framer",
  "Loom",
];

const TEMPLATES = [
  { label: "SaaS Landing Page",      category: "Marketing",  prompt: "A SaaS landing page with hero, features grid, pricing table, and CTA section" },
  { label: "Portfolio",              category: "Personal",   prompt: "A minimal portfolio site with about, projects gallery, and contact form" },
  { label: "E-commerce Store",       category: "Commerce",   prompt: "An e-commerce storefront with product grid, cart, and checkout flow" },
  { label: "Analytics Dashboard",    category: "Dashboard",  prompt: "An analytics dashboard with charts, KPI cards, and data table" },
  { label: "Blog",                   category: "Content",    prompt: "A clean blog with article list, featured post, and category filters" },
  { label: "App Onboarding",         category: "Mobile",     prompt: "A mobile app onboarding flow with three feature screens and sign-up" },
  { label: "Admin Panel",            category: "Dashboard",  prompt: "An admin panel with sidebar navigation, user table, and settings page" },
  { label: "Waitlist Page",          category: "Marketing",  prompt: "A startup waitlist page with email capture, social proof, and countdown" },
  { label: "Pricing Page",           category: "Marketing",  prompt: "A pricing page with three plan tiers, feature comparison table, and FAQ" },
  { label: "Restaurant Site",        category: "Business",   prompt: "A restaurant website with menu, gallery, reservations, and location" },
  { label: "Job Board",              category: "Platform",   prompt: "A job board with listing cards, search filters, and job detail view" },
  { label: "Event Page",             category: "Marketing",  prompt: "An event landing page with schedule, speakers, and ticket registration" },
];

const CAT_COLORS: Record<string, { light: string; dark: string }> = {
  Marketing:  { light: "bg-indigo-100 text-indigo-600",  dark: "bg-indigo-900/40 text-indigo-400" },
  Personal:   { light: "bg-emerald-100 text-emerald-600", dark: "bg-emerald-900/40 text-emerald-400" },
  Commerce:   { light: "bg-amber-100 text-amber-600",    dark: "bg-amber-900/40 text-amber-400" },
  Dashboard:  { light: "bg-violet-100 text-violet-600",  dark: "bg-violet-900/40 text-violet-400" },
  Content:    { light: "bg-sky-100 text-sky-600",        dark: "bg-sky-900/40 text-sky-400" },
  Mobile:     { light: "bg-pink-100 text-pink-600",      dark: "bg-pink-900/40 text-pink-400" },
  Business:   { light: "bg-orange-100 text-orange-600",  dark: "bg-orange-900/40 text-orange-400" },
  Platform:   { light: "bg-teal-100 text-teal-600",      dark: "bg-teal-900/40 text-teal-400" },
};

// ─── Gradient glow background ─────────────────────────────────────────────────

function GlowBackground({ isDark }: { isDark: boolean }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-[120px] transition-all duration-700"
        style={{
          background: isDark
            ? "radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.10) 50%, transparent 80%)"
            : "radial-gradient(ellipse, rgba(99,102,241,0.10) 0%, rgba(168,162,158,0.08) 50%, transparent 80%)",
        }}
      />
      <div
        className="absolute top-20 -left-20 w-[400px] h-[400px] rounded-full blur-[100px] transition-all duration-700"
        style={{
          background: isDark
            ? "radial-gradient(ellipse, rgba(20,184,166,0.10) 0%, transparent 70%)"
            : "radial-gradient(ellipse, rgba(20,184,166,0.07) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute top-10 -right-20 w-[350px] h-[350px] rounded-full blur-[100px] transition-all duration-700"
        style={{
          background: isDark
            ? "radial-gradient(ellipse, rgba(236,72,153,0.08) 0%, transparent 70%)"
            : "radial-gradient(ellipse, rgba(236,72,153,0.05) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}

// ─── Animated card hook ───────────────────────────────────────────────────────

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── Mini illustrations ───────────────────────────────────────────────────────

function AIIllustration() {
  const [step, setStep] = useState(0);
  const lines = [
    "Analysing prompt…",
    "Scaffolding components…",
    "Writing styles…",
    "Wiring interactions…",
    "✓ App ready",
  ];
  useEffect(() => {
    if (step >= lines.length - 1) return;
    const t = setTimeout(() => setStep((s) => s + 1), 900);
    return () => clearTimeout(t);
  }, [step]);
  return (
    <div className="rounded-xl bg-stone-900 p-4 font-mono text-[11px] space-y-1.5 select-none">
      {lines.slice(0, step + 1).map((l, i) => (
        <div
          key={i}
          className={`flex items-center gap-2 transition-opacity duration-300 ${i === step ? "opacity-100" : "opacity-50"}`}
        >
          <span
            className={
              i === lines.length - 1 ? "text-emerald-400" : "text-stone-500"
            }
          >
            {i === step && i < lines.length - 1 ? "▶" : "·"}
          </span>
          <span
            className={
              i === lines.length - 1 ? "text-emerald-300" : "text-stone-300"
            }
          >
            {l}
          </span>
        </div>
      ))}
      {step === lines.length - 1 && (
        <button
          onClick={() => setStep(0)}
          className="mt-2 text-[10px] text-stone-600 hover:text-stone-400 transition"
        >
          replay ↺
        </button>
      )}
    </div>
  );
}

function PreviewIllustration() {
  return (
    <div className="rounded-xl overflow-hidden border border-stone-200 shadow-sm bg-white select-none">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-stone-50 border-b border-stone-100">
        <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-300" />
        <div className="flex-1 mx-2 bg-stone-100 rounded-md h-4 flex items-center px-2">
          <span className="text-[9px] text-stone-400">localhost:3000</span>
        </div>
      </div>
      <div className="p-4 space-y-2">
        <div className="h-5 w-2/3 bg-stone-800 rounded-md" />
        <div className="h-3 w-full bg-stone-100 rounded" />
        <div className="h-3 w-4/5 bg-stone-100 rounded" />
        <div className="flex gap-2 mt-3">
          <div className="h-7 w-20 bg-stone-800 rounded-lg" />
          <div className="h-7 w-20 bg-stone-100 rounded-lg border border-stone-200" />
        </div>
      </div>
    </div>
  );
}

function CollabIllustration() {
  const users = [
    { name: "Alex", color: "#6366f1", char: "A" },
    { name: "Sam", color: "#f59e0b", char: "S" },
    { name: "Mia", color: "#10b981", char: "M" },
  ];
  return (
    <div className="space-y-3 select-none">
      <div className="flex items-center gap-2">
        {users.map((u) => (
          <div
            key={u.name}
            className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-full pl-1 pr-3 py-1 shadow-sm"
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
              style={{ backgroundColor: u.color }}
            >
              {u.char}
            </div>
            <span className="text-[11px] text-stone-600 font-medium">
              {u.name}
            </span>
          </div>
        ))}
      </div>
      <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-sm space-y-1.5">
        <div className="flex gap-2 items-start">
          <div
            className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-white mt-0.5"
            style={{ backgroundColor: "#6366f1" }}
          >
            A
          </div>
          <div className="bg-indigo-50 rounded-lg px-2.5 py-1.5 text-[11px] text-stone-700 max-w-[160px]">
            Can we add dark mode?
          </div>
        </div>
        <div className="flex gap-2 items-start justify-end">
          <div className="bg-stone-100 rounded-lg px-2.5 py-1.5 text-[11px] text-stone-700 max-w-[160px]">
            On it! Give me 10s 🚀
          </div>
          <div
            className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-white mt-0.5"
            style={{ backgroundColor: "#10b981" }}
          >
            M
          </div>
        </div>
      </div>
    </div>
  );
}

function DeployIllustration() {
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          setDone(true);
          clearInterval(t);
          return 100;
        }
        return p + 4;
      });
    }, 80);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="space-y-3 select-none">
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] font-semibold text-stone-700">
            Deploying to production
          </span>
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${done ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}
          >
            {done ? "Live ✓" : "Building…"}
          </span>
        </div>
        <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{
              width: `${progress}%`,
              background: done ? "#10b981" : "#6366f1",
            }}
          />
        </div>
        {done && (
          <div className="mt-3 flex items-center gap-2 text-[11px] text-stone-500">
            <span className="text-emerald-500">●</span>
            myapp.cloude.arc · 98ms
          </div>
        )}
      </div>
    </div>
  );
}

function FileIllustration() {
  const files = [
    "index.html",
    "styles.css",
    "app.js",
    "components/Hero.jsx",
    "components/Nav.jsx",
  ];
  return (
    <div className="bg-stone-900 rounded-xl overflow-hidden select-none">
      <div className="flex items-center gap-2 px-3 py-2 bg-stone-800/60 border-b border-white/[0.06]">
        <span className="text-[10px] text-stone-400 font-medium">Files</span>
      </div>
      <div className="p-2 space-y-0.5">
        {files.map((f, i) => (
          <div
            key={f}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] transition ${i === 0 ? "bg-white/[0.08] text-white" : "text-stone-500 hover:text-stone-300"}`}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({
  stat,
  label,
  delay,
  isDark,
}: {
  stat: string;
  label: string;
  delay: number;
  isDark?: boolean;
}) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={`rounded-2xl p-6 flex flex-col justify-between transition-all duration-700 ease-out ${isDark ? "bg-stone-800 border border-stone-700" : "bg-white border border-stone-200"}`}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(28px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      <div
        className={`text-[42px] font-bold tracking-tighter leading-none mb-3 ${isDark ? "text-stone-100" : "text-stone-800"}`}
      >
        {stat}
      </div>
      <p
        className={`text-[13px] leading-snug ${isDark ? "text-stone-400" : "text-stone-500"}`}
      >
        {label}
      </p>
    </div>
  );
}

// ─── Testimonials ────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    quote:
      "I shipped a full SaaS landing page in under 20 minutes. CloudeArc is the closest thing to having a developer on demand.",
    name: "Priya Nair",
    role: "Founder, Folio",
    avatar: "PN",
    color: "#6366f1",
  },
  {
    quote:
      "The live preview is a game-changer. I can iterate on designs with clients in real time — no back and forth, no waiting.",
    name: "Marcus Webb",
    role: "Product Designer, Meridian",
    avatar: "MW",
    color: "#f59e0b",
  },
  {
    quote:
      "We replaced a two-week sprint with a single CloudeArc session. Our team uses it every week now for prototypes and internal tools.",
    name: "Soo-Jin Park",
    role: "Engineering Lead, Lumio",
    avatar: "SJ",
    color: "#10b981",
  },
  {
    quote:
      "I've tried every AI builder out there. CloudeArc is the only one that actually generates clean, editable code I'm not embarrassed by.",
    name: "Tom Reeves",
    role: "Indie developer",
    avatar: "TR",
    color: "#ec4899",
  },
  {
    quote:
      "Went from napkin sketch to a deployed analytics dashboard in an afternoon. My stakeholders thought I had a whole team behind it.",
    name: "Amara Osei",
    role: "Head of Product, Stackly",
    avatar: "AO",
    color: "#14b8a6",
  },
  {
    quote:
      "CloudeArc handles the scaffolding so I can focus on what matters — the product logic and the user experience.",
    name: "Diego Fuentes",
    role: "CTO, Hatch Labs",
    avatar: "DF",
    color: "#f97316",
  },
];

function TestimonialCard({
  t,
  delay,
  isDark,
}: {
  t: (typeof TESTIMONIALS)[number];
  delay: number;
  isDark?: boolean;
}) {
  const { ref, inView } = useInView(0.1);
  return (
    <div
      ref={ref}
      className={`rounded-2xl p-6 flex flex-col gap-4 transition-all duration-700 ease-out ${isDark ? "bg-stone-800 border border-stone-700" : "bg-white border border-stone-200"}`}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(24px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg
            key={i}
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="#fbbf24"
            stroke="none"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ))}
      </div>
      <p
        className={`text-[14px] leading-relaxed flex-1 ${isDark ? "text-stone-400" : "text-stone-600"}`}
      >
        "{t.quote}"
      </p>
      <div
        className={`flex items-center gap-3 pt-2 border-t ${isDark ? "border-stone-700" : "border-stone-100"}`}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
          style={{ backgroundColor: t.color }}
        >
          {t.avatar}
        </div>
        <div>
          <div
            className={`text-[13px] font-semibold ${isDark ? "text-stone-200" : "text-stone-800"}`}
          >
            {t.name}
          </div>
          <div
            className={`text-[11px] ${isDark ? "text-stone-500" : "text-stone-400"}`}
          >
            {t.role}
          </div>
        </div>
      </div>
    </div>
  );
}

function TestimonialsSection({ isDark }: { isDark?: boolean }) {
  const { ref, inView } = useInView(0.1);
  return (
    <div className="max-w-6xl mx-auto">
      <div
        ref={ref}
        className="text-center mb-14 transition-all duration-700"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(20px)",
        }}
      >
        <div
          className={`inline-flex items-center gap-2 border rounded-full px-3.5 py-1 mb-4 ${isDark ? "bg-stone-800 border-stone-700" : "bg-stone-100 border-stone-200"}`}
        >
          <span
            className={`text-[12px] font-medium ${isDark ? "text-stone-400" : "text-stone-500"}`}
          >
            What people are saying
          </span>
        </div>
        <h2
          className={`text-[38px] font-bold tracking-tight leading-tight mb-3 ${isDark ? "text-stone-100" : "text-stone-800"}`}
        >
          Loved by builders worldwide
        </h2>
        <p
          className={`text-[16px] max-w-lg mx-auto leading-relaxed ${isDark ? "text-stone-400" : "text-stone-500"}`}
        >
          From indie hackers to startup teams — here's what they're saying.
        </p>
      </div>

      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
        {TESTIMONIALS.map((t, i) => (
          <div key={t.name} className="break-inside-avoid">
            <TestimonialCard t={t} delay={i * 60} isDark={isDark} />
          </div>
        ))}
      </div>

      <div
        className={`mt-14 flex flex-col sm:flex-row items-center justify-center gap-8 py-6 border-t ${isDark ? "border-stone-700" : "border-stone-200"}`}
      >
        {[
          { value: "12,000+", label: "apps built" },
          { value: "4.9 / 5", label: "average rating" },
          { value: "140+", label: "countries" },
        ].map(({ value, label }) => (
          <div key={label} className="text-center">
            <div
              className={`text-[26px] font-bold tracking-tight ${isDark ? "text-stone-100" : "text-stone-800"}`}
            >
              {value}
            </div>
            <div
              className={`text-[12px] mt-0.5 ${isDark ? "text-stone-500" : "text-stone-400"}`}
            >
              {label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for personal projects and exploring CloudeArc.",
    cta: "Start for free",
    ctaStyle: "border",
    highlighted: false,
    features: [
      "3 projects",
      "AI generation (50 requests/mo)",
      "Live preview",
      "Community templates",
      "Subdomain hosting",
    ],
  },
  {
    name: "Pro",
    price: "$19",
    period: "per month",
    description: "For individuals who ship fast and need unlimited power.",
    cta: "Get started",
    ctaStyle: "filled",
    highlighted: true,
    features: [
      "Unlimited projects",
      "AI generation (unlimited)",
      "Custom domain",
      "Priority builds",
      "Full file editor",
      "Version history",
      "Remove CloudeArc badge",
    ],
  },
  {
    name: "Team",
    price: "$49",
    period: "per month",
    description: "Collaborate and ship together with your whole team.",
    cta: "Contact sales",
    ctaStyle: "border",
    highlighted: false,
    features: [
      "Everything in Pro",
      "Up to 10 seats",
      "Real-time collaboration",
      "Shared project library",
      "Admin controls",
      "SSO / SAML",
      "Dedicated support",
    ],
  },
];

function PricingCard({
  plan,
  delay,
  onStart,
  isDark,
}: {
  plan: (typeof PLANS)[number];
  delay: number;
  onStart: () => void;
  isDark?: boolean;
}) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={`relative rounded-2xl p-7 flex flex-col transition-all duration-700 ease-out ${
        plan.highlighted
          ? "bg-stone-800 text-white ring-2 ring-stone-700 shadow-2xl shadow-stone-900/20 scale-[1.02]"
          : isDark
            ? "bg-stone-800 border border-stone-700"
            : "bg-white border border-stone-200"
      }`}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView
          ? `translateY(0) ${plan.highlighted ? "scale(1.02)" : ""}`
          : "translateY(32px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {plan.highlighted && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="bg-indigo-500 text-white text-[11px] font-semibold px-3 py-1 rounded-full shadow-sm">
            Most popular
          </span>
        </div>
      )}

      <div className="mb-6">
        <div
          className={`text-[13px] font-semibold mb-1 ${plan.highlighted ? "text-stone-400" : isDark ? "text-stone-400" : "text-stone-500"}`}
        >
          {plan.name}
        </div>
        <div className="flex items-end gap-1.5 mb-2">
          <span
            className={`text-[40px] font-bold tracking-tighter leading-none ${plan.highlighted ? "text-white" : isDark ? "text-stone-100" : "text-stone-800"}`}
          >
            {plan.price}
          </span>
          <span
            className={`text-[13px] pb-1 ${plan.highlighted ? "text-stone-500" : isDark ? "text-stone-500" : "text-stone-400"}`}
          >
            / {plan.period}
          </span>
        </div>
        <p
          className={`text-[13px] leading-relaxed ${plan.highlighted ? "text-stone-400" : isDark ? "text-stone-400" : "text-stone-500"}`}
        >
          {plan.description}
        </p>
      </div>

      <ul className="space-y-2.5 mb-8 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-2.5">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              className={
                plan.highlighted ? "text-emerald-400" : "text-emerald-500"
              }
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span
              className={`text-[13px] ${plan.highlighted ? "text-stone-300" : isDark ? "text-stone-300" : "text-stone-600"}`}
            >
              {f}
            </span>
          </li>
        ))}
      </ul>

      <button
        onClick={onStart}
        className={`w-full py-2.5 rounded-xl text-[14px] font-semibold transition-all active:scale-[0.98] ${
          plan.ctaStyle === "filled"
            ? "bg-white text-stone-800 hover:bg-stone-100"
            : plan.highlighted
              ? "border border-stone-600 text-stone-300 hover:border-stone-400 hover:text-white"
              : isDark
                ? "border border-stone-600 text-stone-300 hover:border-stone-500 hover:text-stone-100"
                : "border border-stone-200 text-stone-700 hover:border-stone-300 hover:bg-stone-50"
        }`}
      >
        {plan.cta}
      </button>
    </div>
  );
}

function PricingSection({
  onStart,
  isDark,
}: {
  onStart: () => void;
  isDark?: boolean;
}) {
  const { ref, inView } = useInView(0.1);
  const [annual, setAnnual] = useState(false);

  return (
    <div className="max-w-5xl mx-auto">
      <div
        ref={ref}
        className="text-center mb-14 transition-all duration-700"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(20px)",
        }}
      >
        <div
          className={`inline-flex items-center gap-2 border rounded-full px-3.5 py-1 mb-4 ${isDark ? "bg-stone-800 border-stone-700" : "bg-stone-100 border-stone-200"}`}
        >
          <span
            className={`text-[12px] font-medium ${isDark ? "text-stone-400" : "text-stone-500"}`}
          >
            Pricing
          </span>
        </div>
        <h2
          className={`text-[38px] font-bold tracking-tight leading-tight mb-3 ${isDark ? "text-stone-100" : "text-stone-800"}`}
        >
          Simple, transparent pricing
        </h2>
        <p
          className={`text-[16px] max-w-lg mx-auto leading-relaxed mb-8 ${isDark ? "text-stone-400" : "text-stone-500"}`}
        >
          Start free. Scale as you grow. No surprise fees.
        </p>

        <div
          className={`inline-flex items-center gap-3 rounded-full p-1 ${isDark ? "bg-stone-800" : "bg-stone-100"}`}
        >
          <button
            onClick={() => setAnnual(false)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${!annual ? (isDark ? "bg-stone-700 text-stone-100 shadow-sm" : "bg-white text-stone-800 shadow-sm") : isDark ? "text-stone-500 hover:text-stone-300" : "text-stone-500 hover:text-stone-700"}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all flex items-center gap-2 ${annual ? (isDark ? "bg-stone-700 text-stone-100 shadow-sm" : "bg-white text-stone-800 shadow-sm") : isDark ? "text-stone-500 hover:text-stone-300" : "text-stone-500 hover:text-stone-700"}`}
          >
            Annual
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">
              −20%
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {PLANS.map((plan, i) => (
          <PricingCard
            key={plan.name}
            plan={
              annual && plan.price !== "$0"
                ? {
                    ...plan,
                    price: `$${Math.round(parseInt(plan.price.slice(1)) * 0.8)}`,
                    period: "per month, billed annually",
                  }
                : plan
            }
            delay={i * 80}
            onStart={onStart}
            isDark={isDark}
          />
        ))}
      </div>

      <p
        className={`text-center text-[12px] mt-8 ${isDark ? "text-stone-600" : "text-stone-400"}`}
      >
        All plans include SSL, global CDN, and 99.9% uptime SLA. Cancel anytime.
      </p>
    </div>
  );
}

// ─── CTA card ────────────────────────────────────────────────────────────────

function CTACard({ onStart }: { onStart: () => void }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className="lg:col-span-3 bg-stone-800 rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6 transition-all duration-700 ease-out"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(28px)",
        transitionDelay: "450ms",
      }}
    >
      <div>
        <h3 className="text-[22px] font-bold text-white tracking-tight mb-1">
          Ready to build your first app?
        </h3>
        <p className="text-[14px] text-stone-400">
          No credit card required. Start free, upgrade when you're ready.
        </p>
      </div>
      <button
        onClick={onStart}
        className="flex-shrink-0 bg-white text-stone-800 text-[14px] font-semibold px-6 py-3 rounded-full hover:bg-stone-100 transition active:scale-95 whitespace-nowrap"
      >
        Start building →
      </button>
    </div>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────

function FeatureCard({
  title,
  description,
  illustration,
  delay = 0,
  large = false,
  dark = false,
}: {
  title: string;
  description: string;
  illustration: React.ReactNode;
  delay?: number;
  large?: boolean;
  dark?: boolean;
}) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={`rounded-2xl p-6 flex flex-col transition-all duration-700 ease-out ${large ? "col-span-2" : ""} ${dark ? "bg-stone-800 text-white" : "bg-white border border-stone-200"}`}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(28px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      <div className="mb-5">{illustration}</div>
      <div className="mt-auto">
        <h3
          className={`text-[15px] font-semibold tracking-tight mb-1 ${dark ? "text-white" : "text-stone-800"}`}
        >
          {title}
        </h3>
        <p
          className={`text-[13px] leading-relaxed ${dark ? "text-stone-400" : "text-stone-500"}`}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

// ─── Templates dropdown ───────────────────────────────────────────────────────

function TemplatesDropdown({
  isDark,
  onSelect,
  onClose,
}: {
  isDark: boolean;
  onSelect: (prompt: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={`absolute left-0 right-0 top-full z-40 border-b shadow-xl transition-colors duration-300 ${isDark ? "bg-stone-900 border-stone-700" : "bg-white border-stone-200"}`}
    >
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`text-[14px] font-semibold ${isDark ? "text-stone-100" : "text-stone-800"}`}>Templates</h3>
            <p className={`text-[12px] mt-0.5 ${isDark ? "text-stone-500" : "text-stone-400"}`}>Pick a starting point — it will pre-fill your prompt</p>
          </div>
          <button onClick={onClose} className={`w-7 h-7 rounded-full flex items-center justify-center transition ${isDark ? "text-stone-500 hover:bg-stone-800 hover:text-stone-300" : "text-stone-400 hover:bg-stone-100 hover:text-stone-600"}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {TEMPLATES.map((t) => {
            const color = CAT_COLORS[t.category];
            return (
              <button
                key={t.label}
                onClick={() => { onSelect(t.prompt); onClose(); }}
                className={`group text-left rounded-xl p-3 border transition-all hover:scale-[1.02] active:scale-[0.98] ${isDark ? "bg-stone-800 border-stone-700 hover:border-stone-500 hover:bg-stone-750" : "bg-stone-50 border-stone-200 hover:border-stone-300 hover:bg-white hover:shadow-sm"}`}
              >
                <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mb-2 ${isDark ? color.dark : color.light}`}>
                  {t.category}
                </span>
                <p className={`text-[12px] font-medium leading-snug ${isDark ? "text-stone-200" : "text-stone-700"}`}>{t.label}</p>
                <p className={`text-[10px] mt-1 leading-relaxed line-clamp-2 ${isDark ? "text-stone-500" : "text-stone-400"}`}>{t.prompt}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Landing ──────────────────────────────────────────────────────────────────

export default function Landing() {
  const [input, setInput] = useState("");
  const [activeType, setActiveType] = useState("Website");
  const [showTemplates, setShowTemplates] = useState(false);
  const [, navigate] = useLocation();
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem("cloudearc-theme") === "dark";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem("cloudearc-theme", isDark ? "dark" : "light");
  }, [isDark]);

  const handleCreate = (prompt?: string) => {
    const text = (prompt ?? input).trim();
    if (!text) return;
    const projectId = Date.now().toString();
    localStorage.setItem("cloudearc-project-" + projectId, text);
    const existing = (() => {
      try {
        return JSON.parse(localStorage.getItem("cloudearc-recent") ?? "[]");
      } catch {
        return [];
      }
    })();
    const updated = [
      { id: projectId, prompt: text, createdAt: Date.now() },
      ...existing.filter((p: { id: string }) => p.id !== projectId),
    ].slice(0, 20);
    localStorage.setItem("cloudearc-recent", JSON.stringify(updated));
    navigate(`/workspace/${projectId}`);
  };

  const { ref: featuresRef, inView: featuresInView } = useInView(0.05);

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-300 ${isDark ? "dark bg-stone-900 text-stone-100" : "bg-[#F7F5F2] text-stone-800"}`}
    >
      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <header
        className={`relative sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-300 ${isDark ? "bg-stone-900/80 border-stone-700/60" : "bg-[#F7F5F2]/80 border-stone-200/60"}`}
      >
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="/" className="flex items-center gap-2">
              <img
                src={isDark ? "/logo-dark.png" : "/logo-light.png"}
                className="w-9 h-9 rounded-md select-none object-contain transition-all duration-300"
                alt=""
              />
              <span
                className={`text-sm font-semibold tracking-tight ${isDark ? "text-stone-100" : "text-stone-800"}`}
              >
                CloudeArc
              </span>
            </a>
            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <button
                  key={link}
                  onClick={() => link === "Templates" ? setShowTemplates((v) => !v) : undefined}
                  className={`px-3 py-1.5 text-[13px] rounded-md transition flex items-center gap-1 ${
                    link === "Templates" && showTemplates
                      ? isDark ? "bg-stone-800 text-stone-100" : "bg-stone-100 text-stone-800"
                      : isDark ? "text-stone-400 hover:text-stone-100 hover:bg-stone-800" : "text-stone-500 hover:text-stone-800 hover:bg-stone-100"
                  }`}
                >
                  {link}
                  {link === "Templates" && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${showTemplates ? "rotate-180" : ""}`}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  )}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDark((d) => !d)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition ${isDark ? "bg-stone-800 text-stone-300 hover:bg-stone-700" : "bg-stone-100 text-stone-500 hover:bg-stone-200"}`}
              aria-label="Toggle dark mode"
            >
              {isDark ? (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <button
              onClick={() => navigate("/auth")}
              className={`text-[13px] px-3 py-1.5 rounded-md transition ${isDark ? "text-stone-400 hover:text-stone-100 hover:bg-stone-800" : "text-stone-500 hover:text-stone-800 hover:bg-stone-100"}`}
            >
              Log in
            </button>
            <button
              onClick={() => navigate("/auth")}
              className={`text-[13px] font-medium px-4 py-1.5 rounded-full transition ${isDark ? "bg-white text-stone-900 hover:bg-stone-200" : "bg-stone-800 text-white hover:bg-stone-700"}`}
            >
              Get started
            </button>
          </div>
        </div>
        {showTemplates && (
          <TemplatesDropdown
            isDark={isDark}
            onSelect={(prompt) => setInput(prompt)}
            onClose={() => setShowTemplates(false)}
          />
        )}
      </header>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center px-6 pt-20 pb-16 overflow-hidden">
        <GlowBackground isDark={isDark} />
        <div className="w-full max-w-2xl flex flex-col items-center">
          <div
            className={`mb-6 inline-flex items-center gap-2 border rounded-full px-3.5 py-1 shadow-sm ${isDark ? "bg-stone-800 border-stone-700" : "bg-white border-stone-200"}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span
              className={`text-[12px] font-medium ${isDark ? "text-stone-400" : "text-stone-500"}`}
            >
              AI-powered app builder
            </span>
          </div>
          <h1
            className={`text-[52px] leading-[1.08] font-bold tracking-tight text-center mb-4 ${isDark ? "text-stone-100" : "text-stone-800"}`}
          >
            What will you build?
          </h1>
          <p
            className={`text-[16px] text-center mb-10 leading-relaxed ${isDark ? "text-stone-400" : "text-stone-500"}`}
          >
            Turn ideas into production-ready apps in minutes —
            <br className="hidden sm:block" /> no coding needed.
          </p>

          <div
            className={`w-full border rounded-2xl shadow-sm overflow-hidden transition-all duration-200 ${isDark ? "bg-stone-800 border-stone-700 focus-within:border-stone-500" : "bg-white border-stone-200 focus-within:border-stone-400 focus-within:shadow-md"}`}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={3}
              className={`w-full px-5 pt-4 pb-2 text-[15px] outline-none resize-none bg-transparent leading-relaxed ${isDark ? "text-stone-200 placeholder:text-stone-600" : "text-stone-700 placeholder:text-stone-400"}`}
              placeholder="Describe your app — e.g. 'A SaaS landing page for a deployment tool...'"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
            <div className="flex items-center justify-between px-4 pb-3 pt-1">
              <span
                className={`text-xs ${isDark ? "text-stone-600" : "text-stone-400"}`}
              >
                Press Enter to generate
              </span>
              <button
                onClick={() => handleCreate()}
                disabled={!input.trim()}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${input.trim() ? (isDark ? "bg-white text-stone-900 hover:bg-stone-200 hover:scale-105 active:scale-95" : "bg-stone-800 text-white hover:bg-stone-700 hover:scale-105 active:scale-95") : isDark ? "bg-stone-700 text-stone-600 cursor-not-allowed" : "bg-stone-100 text-stone-300 cursor-not-allowed"}`}
              >
                ↑
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 mt-5">
            {APP_TYPES.map((type) => (
              <button
                key={type.label}
                onClick={() => setActiveType(type.label)}
                className={`flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all text-[11px] font-medium ${
                  activeType === type.label
                    ? isDark
                      ? "bg-stone-800 border border-stone-700 text-stone-200 shadow-sm"
                      : "bg-white border border-stone-200 text-stone-700 shadow-sm"
                    : isDark
                      ? "text-stone-600 hover:text-stone-400 hover:bg-stone-800/60"
                      : "text-stone-400 hover:text-stone-600 hover:bg-white/60"
                }`}
              >
                <span
                  className={
                    activeType === type.label
                      ? isDark
                        ? "text-stone-200"
                        : "text-stone-700"
                      : isDark
                        ? "text-stone-600"
                        : "text-stone-400"
                  }
                >
                  {type.icon}
                </span>
                {type.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-5 flex-wrap justify-center">
            <span
              className={`text-[12px] ${isDark ? "text-stone-600" : "text-stone-400"}`}
            >
              Try an example:
            </span>
            {EXAMPLE_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => handleCreate(p)}
                className={`text-[12px] border px-3 py-1 rounded-full transition ${isDark ? "text-stone-400 border-stone-700 bg-stone-800 hover:border-stone-600 hover:text-stone-200" : "text-stone-500 border-stone-200 bg-white hover:border-stone-300 hover:text-stone-700"}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── LOGO BAR ─────────────────────────────────────────────────────── */}
      <section
        className={`border-y py-8 px-6 ${isDark ? "border-stone-700/80 bg-stone-800/40" : "border-stone-200/80 bg-white/40"}`}
      >
        <p
          className={`text-center text-[11px] uppercase tracking-[0.14em] font-semibold mb-6 ${isDark ? "text-stone-600" : "text-stone-400"}`}
        >
          Trusted by teams at
        </p>
        <div className="max-w-4xl mx-auto flex items-center justify-center flex-wrap gap-x-12 gap-y-4">
          {LOGOS.map((name) => (
            <span
              key={name}
              className={`text-[15px] font-semibold tracking-tight select-none ${isDark ? "text-stone-600" : "text-stone-400"}`}
            >
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="features" className="px-6 py-24 max-w-6xl mx-auto w-full">
        <div
          ref={featuresRef}
          className="text-center mb-16 transition-all duration-700"
          style={{
            opacity: featuresInView ? 1 : 0,
            transform: featuresInView ? "translateY(0)" : "translateY(20px)",
          }}
        >
          <div
            className={`inline-flex items-center gap-2 border rounded-full px-3.5 py-1 mb-4 ${isDark ? "bg-stone-800/40 border-stone-700" : "bg-stone-800/5 border-stone-200"}`}
          >
            <span
              className={`text-[12px] font-medium ${isDark ? "text-stone-400" : "text-stone-500"}`}
            >
              Everything you need
            </span>
          </div>
          <h2
            className={`text-[38px] font-bold tracking-tight leading-tight mb-3 ${isDark ? "text-stone-100" : "text-stone-800"}`}
          >
            Build faster. Ship confidently.
          </h2>
          <p
            className={`text-[16px] max-w-xl mx-auto leading-relaxed ${isDark ? "text-stone-400" : "text-stone-500"}`}
          >
            CloudeArc gives you a complete environment — from idea to deployed
            app — with AI handling the heavy lifting.
          </p>
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Row 1 — large AI card + preview card */}
          <div className="lg:col-span-2">
            <FeatureCard
              delay={0}
              dark
              title="AI that actually builds"
              description="Describe any app in plain English. CloudeArc's AI generates production-quality HTML, CSS, and JavaScript — files, structure, and all."
              illustration={
                <div className="space-y-3">
                  <AIIllustration />
                  <div className="flex gap-2">
                    {["index.html", "styles.css", "app.js"].map((f) => (
                      <div
                        key={f}
                        className="flex items-center gap-1.5 bg-white/[0.06] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[10px] text-stone-400"
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              }
            />
          </div>

          <FeatureCard
            delay={100}
            title="Instant live preview"
            description="Every change renders in a real browser preview — no build step, no waiting. See your app as you build it."
            illustration={<PreviewIllustration />}
          />

          {/* Row 2 */}
          <FeatureCard
            delay={150}
            title="Full file workspace"
            description="Browse and edit every generated file. A full Monaco editor with syntax highlighting for when you want control."
            illustration={<FileIllustration />}
          />

          <FeatureCard
            delay={200}
            title="Real-time collaboration"
            description="Invite your team and build together. See who's online, chat in context, and iterate without leaving the workspace."
            illustration={<CollabIllustration />}
          />

          <FeatureCard
            delay={250}
            title="One-click deploy"
            description="Ship to a live URL in seconds. CloudeArc handles the build, hosting, and TLS certificate automatically."
            illustration={<DeployIllustration />}
          />

          {/* Row 3 — stat cards */}
          <StatCard
            stat="< 30s"
            label="Average time from prompt to preview"
            delay={300}
            isDark={isDark}
          />
          <StatCard
            stat="100+"
            label="Templates ready to customise"
            delay={350}
            isDark={isDark}
          />
          <StatCard
            stat="99.9%"
            label="Uptime SLA for deployed apps"
            delay={400}
            isDark={isDark}
          />

          {/* Full-width CTA card */}
          <CTACard onStart={() => navigate("/app")} />
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section
        id="testimonials"
        className={`px-6 py-24 border-t ${isDark ? "bg-stone-900 border-stone-700/60" : "bg-[#F7F5F2] border-stone-200/60"}`}
      >
        <TestimonialsSection isDark={isDark} />
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <section
        id="pricing"
        className={`px-6 py-24 border-t ${isDark ? "bg-stone-950 border-stone-700/60" : "bg-white border-stone-200/60"}`}
      >
        <PricingSection onStart={() => navigate("/app")} isDark={isDark} />
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer
        className={`border-t py-6 px-6 mt-auto ${isDark ? "border-stone-700/60" : "border-stone-200/60"}`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span
            className={`text-[12px] ${isDark ? "text-stone-600" : "text-stone-400"}`}
          >
            © 2026 CloudeArc
          </span>
          <div className="flex items-center gap-5">
            {["Privacy", "Terms", "Status"].map((item) => (
              <span
                key={item}
                className={`text-[12px] cursor-pointer transition ${isDark ? "text-stone-600 hover:text-stone-400" : "text-stone-400 hover:text-stone-600"}`}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
