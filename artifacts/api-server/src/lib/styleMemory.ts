export type StyleMode =
  | "modern-saas"
  | "minimal"
  | "futuristic"
  | "luxury"
  | "bold-startup"
  | "glassmorphism"
  | "ai-native"
  | "editorial";

export interface StyleProfile {
  mode: StyleMode;
  label: string;
  templateType: string;
  inspiration: string | null;
  brief: string;
}

const MODE_LABELS: Record<StyleMode, string> = {
  "modern-saas":   "Modern SaaS",
  "minimal":       "Minimal",
  "futuristic":    "Futuristic",
  "luxury":        "Luxury",
  "bold-startup":  "Bold Startup",
  "glassmorphism": "Glassmorphism",
  "ai-native":     "AI Native",
  "editorial":     "Editorial",
};

const MODE_GUIDES: Record<StyleMode, string> = {
  "modern-saas":
    "Clean dark SaaS aesthetic. Tight typography, clear visual hierarchy. Accent-colored CTAs on near-black. Subtle glass/border effects. Developer-trusted feel like Linear or Vercel.",
  "minimal":
    "Ultra-minimal. Extremely generous whitespace. Single accent used very sparingly — typography does all the work. No decorative elements. Think Notion, Craft, or A24.",
  "futuristic":
    "High-contrast dark. Glowing neon accents. Technical mono hints. Grid aesthetic. Motion-forward. Cyberpunk-adjacent but still readable and premium.",
  "luxury":
    "Premium and restrained. Serif display font. Gold, amber, or deep jewel accent. Never flashy — understated wealth. Ultra-generous spacing. Think Chanel or Aesop digital.",
  "bold-startup":
    "High energy. Large, bold sans-serif type. Strong accent at full saturation. Fast-feel, confident, no hedging. Think Superhuman or Pitch.",
  "glassmorphism":
    "Layered glass surfaces. backdrop-filter blur everywhere. Soft gradient backgrounds. Translucent cards with white borders at low opacity. Depth through layers, not shadows.",
  "ai-native":
    "Intelligent and precise. Cool blue or teal accent. Structured layouts that suggest data and intelligence. Dense but airy. Trust signals prominent. Think Perplexity or Runway.",
  "editorial":
    "Typography-first. Serif display + humanist sans body. Column-based layout with strong baseline grid. Limited palette (black + one warm accent). Like a premium magazine or newspaper.",
};

const INSPIRATION_MAP: Record<string, string> = {
  linear:     "Linear — dark, minimal, pixel-precise. Fast feel, dense layouts, kanban-native. Subtle purple, tight spacing. Developer-trusted without being flashy.",
  vercel:     "Vercel — near-black with white text, zero decoration. Sharp edges, monochrome, technical. Typography does all the work.",
  stripe:     "Stripe — light and clean. Gradient accents on white. Enterprise-grade polish, premium trust. Wide content, gentle color.",
  notion:     "Notion — light editorial. Clean sans-serif typography, minimal color, document-like calm. Generous line height and whitespace.",
  apple:      "Apple — ultra-premium, light or dark. Generous whitespace, restrained color, product-photo-first. Every detail crafted.",
  figma:      "Figma — dark UI, purple accent, geometric and modern. Tool-native feel with strong grid.",
  raycast:    "Raycast — dark, compact, keyboard-native. Metallic accents. Developer-tool precision. High information density.",
  arc:        "Arc Browser — soft gradients, editorial feel, gentle curves. Modern browser with emotional warmth.",
  loom:       "Loom — light, friendly, approachable purple SaaS. Warm and human, not cold.",
  intercom:   "Intercom — dark navy, rounded corners, professional but conversational. Trust + friendliness.",
  framer:     "Framer — dark, dramatic, motion-first. Gradient typography. Creative tool with maximum confidence.",
  anthropic:  "Anthropic — light, minimal, academic-premium. Warm neutrals, trustworthy, scholarly restraint.",
  openai:     "OpenAI — dark, clean, minimal. High-trust AI platform feel. Functional without decoration.",
  perplexity: "Perplexity — dark, search-native. Focused, minimal chrome. Information-first, fast.",
  superhuman: "Superhuman — dark, keyboard-native, gold accent. Ultra-premium email client. Elite feel.",
  craft:      "Craft — light, paper-like warmth. Document-first, editorial. Warm off-whites and soft shadows.",
  pitch:      "Pitch — dark, bold, confident. Strong typographic hierarchy. Presentation-native, modern.",
  liveblocks: "Liveblocks — dark, technical, clean. Developer-platform precision with a warm touch.",
  resend:     "Resend — dark minimal, monospace hints, email-native. Technical trust, zero fluff.",
};

export function detectStyleMode(prompt: string): StyleMode {
  const p = prompt.toLowerCase();
  if (/\b(glass|glassmorphism|frosted|blur card|blurred)\b/.test(p))  return "glassmorphism";
  if (/\b(luxury|premium|high.?end|exclusive|boutique|elegant|sophisticated)\b/.test(p)) return "luxury";
  if (/\b(futuristic|sci.?fi|cyberpunk|neon|glow|matrix|hacker)\b/.test(p)) return "futuristic";
  if (/\b(editorial|magazine|newspaper|literary|serif.heavy|typographic)\b/.test(p)) return "editorial";
  if (/\b(minimal|minimalist|clean.simple|zen|whitespace|ultra.clean|stripped)\b/.test(p)) return "minimal";
  if (/\b(bold|energetic|punchy|loud|high.energy|vibrant startup)\b/.test(p)) return "bold-startup";
  if (/\b(ai.tool|neural|machine learning|intelligent platform|smart tool)\b/.test(p)) return "ai-native";
  return "modern-saas";
}

export function detectInspiration(prompt: string): string | null {
  const p = prompt.toLowerCase();
  for (const [key, description] of Object.entries(INSPIRATION_MAP)) {
    const re = new RegExp(`\\b(like ${key}|inspired by ${key}|similar to ${key}|feel like ${key}|${key}.?style|${key}.?inspired)\\b`);
    if (re.test(p)) return description;
  }
  return null;
}

function describeTemplateStyle(templateType: string): string {
  const map: Record<string, string> = {
    saas:       "dark near-black background, violet/purple accent, Inter font, rounded cards, pill buttons, subtle glow effects",
    fitness:    "near-black background, electric green accent, Syne bold uppercase headings + Inter body, high contrast, athletic energy",
    portfolio:  "warm off-white background, amber/gold accent, Playfair Display h1 + DM Sans body, editorial warmth",
    agency:     "near-black (#080810) background, coral/red accent, Syne headings + Inter body, dramatic typographic scale",
    ecommerce:  "white background, near-black accent buttons, DM Sans throughout, square/no-radius buttons, product-first minimal",
    generic:    "dark near-black, violet-to-pink gradient accent, Inter font, rounded-full pills, subtle glow",
  };
  return map[templateType] ?? "dark background, accent-colored CTAs, rounded cards, clean modern typography";
}

export function buildStyleBrief(mode: StyleMode, inspiration: string | null, templateType: string): string {
  const lines: string[] = [
    `STYLE MODE: ${MODE_LABELS[mode].toUpperCase()}`,
    MODE_GUIDES[mode],
    "",
    `ESTABLISHED DESIGN LANGUAGE:`,
    `- Template aesthetic: ${describeTemplateStyle(templateType)}`,
    `- Spacing: generous section padding (py-20 md:py-32 minimum), section-level breathing room`,
    `- Motion: smooth scroll-reveal animations on section entry, fade-up on hero`,
    `- Border style: rounded-xl / rounded-2xl for cards; rounded-full for pills and icon badges`,
    `- Quality bar: Awwwards-level execution — every pixel considered`,
  ];

  if (inspiration) {
    lines.push("", `INSPIRATION REFERENCE:`, inspiration);
    lines.push("Adopt ONLY the spacing philosophy, motion feel, hierarchy, and layout composition — do NOT copy or clone.");
  }

  return lines.join("\n");
}

export function buildEditStyleContext(profile: StyleProfile): string {
  const lines: string[] = [
    "╔══════════════════════════════════════════════════════",
    "║  DESIGN MEMORY — preserve these decisions exactly   ",
    "╚══════════════════════════════════════════════════════",
    "",
    `Style Mode:   ${profile.label}`,
    `Template:     ${profile.templateType}`,
    `Established:  ${describeTemplateStyle(profile.templateType)}`,
    "",
    "Rules for this edit:",
    "• Keep ALL existing colors, fonts, spacing scale, and border-radius choices",
    "• New elements must feel visually identical to the existing components",
    "• Do NOT introduce new color families or font faces",
    "• Do NOT tighten section padding — maintain the generous spacing rhythm",
    "• Hover effects, transitions, and animations must match the existing motion style",
    "• New cards must use the same rounded-xl / rounded-2xl pattern as existing cards",
  ];

  if (profile.inspiration) {
    lines.push("", `Inspiration: ${profile.inspiration.split(" — ")[0]}`);
    lines.push("Continue channeling this aesthetic in new elements.");
  }

  return lines.join("\n");
}

export function buildStyleProfile(
  templateType: string,
  mode: StyleMode,
  inspiration: string | null,
): StyleProfile {
  const brief = buildStyleBrief(mode, inspiration, templateType);
  return {
    mode,
    label: MODE_LABELS[mode],
    templateType,
    inspiration,
    brief,
  };
}
