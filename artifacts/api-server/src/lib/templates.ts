export type TemplateType =
  | "saas"
  | "ai"
  | "dashboard"
  | "fitness"
  | "portfolio"
  | "agency"
  | "ecommerce"
  | "generic";

export function detectTemplate(prompt: string): TemplateType {
  const p = prompt.toLowerCase();
  if (/\b(dashboard|analytics|admin|metrics|chart|graph|crm|erp|saas app|management)\b/.test(p)) return "dashboard";
  if (/\b(ai|llm|gpt|claude|artificial intelligence|machine learning|ml|nlp|neural|copilot|chatbot)\b/.test(p)) return "ai";
  if (/\b(fitness|gym|workout|training|health|wellness|nutrition|yoga|sport|exercise)\b/.test(p)) return "fitness";
  if (/\b(portfolio|personal|resume|about me|creative|photographer|designer|freelance|showcase)\b/.test(p)) return "portfolio";
  if (/\b(agency|studio|creative agency|marketing|digital agency|branding|consulting|enterprise)\b/.test(p)) return "agency";
  if (/\b(shop|store|ecommerce|e-commerce|product|buy|sell|cart|checkout)\b/.test(p)) return "ecommerce";
  if (/\b(saas|software|platform|tool|productivity|app|startup|launch|beta)\b/.test(p)) return "saas";
  return "generic";
}

interface TemplateConfig {
  tailwindConfig: string;
  fonts: string;
  sections: string;
  personality: string;
  colorNote: string;
}

export function getTemplateConfig(type: TemplateType): TemplateConfig {
  const configs: Record<TemplateType, TemplateConfig> = {
    saas: {
      tailwindConfig: `TAILWIND COLOR PALETTE — use these exact classes:
- Page bg: bg-[#0A0A0F]  |  Alt section bg: bg-[#0F0F1A]
- Card/surface bg: bg-[#141428]  |  Card hover: hover:bg-[#1A1A35]
- Borders: border-white/[0.07]  |  Hover borders: hover:border-white/[0.14]
- Headings: text-[#F0F0FF]  |  Body text: text-[#C4C4D8]  |  Muted: text-[#7A7A9D]
- Accent color: text-violet-500  bg-violet-600  hover:bg-violet-500  border-violet-500/30
- Primary button: bg-violet-600 hover:bg-violet-500 text-white rounded-full px-6 py-3 font-semibold
- Ghost button: border border-white/20 text-white hover:bg-white/10 rounded-full px-6 py-3
- Gradient text: bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent
- Hero glow: style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(108,99,255,0.18) 0%, transparent 70%)' }}
FONTS: font-['Inter'] for all text (loaded via Google Fonts)`,
      fonts: `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">`,
      sections: "sticky navbar (logo + 3 links + 'Get started' CTA + mobile hamburger), hero (centered, radial glow bg, eyebrow badge, large headline with gradient on 1-2 words, subtitle, 2 CTA buttons, app mockup SVG below), features (section label + h2 + 3-col card grid, icon+title+description per card, hover effects), pricing (3 tiers, middle featured with 'Most Popular' badge + violet border glow, real prices, feature lists), testimonials (3 cards, ★★★★★, real quote, initials avatar, name+role), CTA banner (large heading, urgency line, 2 buttons, gradient bg), footer (4-col: brand + 3 link groups + copyright bar)",
      personality: "dark, minimal, developer-focused, premium — like Linear, Vercel, or Raycast",
      colorNote: "violet/purple accent on near-black; gradient text on 1-2 hero headline words; featured pricing card has a violet border glow",
    },

    ai: {
      tailwindConfig: `TAILWIND COLOR PALETTE — use these exact classes:
- Page bg: bg-[#05050A]  |  Alt section bg: bg-[#0A0A14]
- Card/surface bg: bg-[#0F0F1E]  |  Card hover: hover:bg-[#141428]
- Borders: border-blue-400/[0.08]  |  Hover borders: hover:border-blue-400/20
- Headings: text-[#EEF2FF]  |  Body text: text-[#B8C4E0]  |  Muted: text-[#6A7898]
- Accent: text-blue-400  bg-blue-500  hover:bg-blue-400  border-blue-500/30
- Primary button: bg-blue-500 hover:bg-blue-400 text-white rounded-full px-6 py-3 font-semibold
- Ghost button: border border-blue-400/30 text-blue-300 hover:bg-blue-500/10 rounded-full px-6 py-3
- Gradient text: bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent
- Hero glow: style={{ background: 'radial-gradient(ellipse 90% 70% at 50% 0%, rgba(59,142,255,0.15) 0%, rgba(0,212,255,0.05) 40%, transparent 70%)' }}
FONTS: font-['Inter'] for all text`,
      fonts: `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">`,
      sections: "sticky navbar (logo + 3 links + 'Try free' CTA + mobile toggle), hero (centered, blue radial glow bg, eyebrow badge, large gradient headline, subtitle, 2 CTA buttons, animated SVG visualization below), features (1 large hero card + 2 side cards in a grid, each with big icon + title + description), how-it-works (3 numbered steps alternating bg), pricing (3 tiers, middle featured with blue border glow, real prices), testimonials (3 cards, ★★★★★, quotes, name+company), CTA section (large heading + 2 buttons, gradient bg), footer (4-col)",
      personality: "serious, sophisticated, trustworthy AI — like Anthropic, Cohere, or Perplexity. Confident and precise, not sci-fi",
      colorNote: "electric blue accent on near-black; cyan-to-blue gradient text on 1-2 headline words",
    },

    dashboard: {
      tailwindConfig: `TAILWIND COLOR PALETTE — use these exact classes:
- Page bg: bg-slate-50  |  Sidebar bg: bg-white  |  Main area bg: bg-slate-50/80
- Card bg: bg-white  |  Card border: border border-slate-200
- Headings: text-slate-900  |  Body: text-slate-600  |  Muted: text-slate-400
- Accent: text-indigo-600  bg-indigo-600  hover:bg-indigo-700  border-indigo-200
- Active nav item: bg-indigo-50 text-indigo-700 font-semibold
- Sidebar nav item: text-slate-600 hover:bg-slate-100 hover:text-slate-900
- Primary button: bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 font-medium
- Metric up: text-emerald-600 bg-emerald-50  |  Metric down: text-red-500 bg-red-50
FONTS: font-['Inter'] for all text`,
      fonts: `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">`,
      sections: "full-height flex layout: sidebar (w-60, logo+vertical nav with icons+active highlight+user avatar at bottom); main area: sticky header (search+bell+avatar); 4-col metrics grid (label+large value+trend badge each); large SVG bar chart with grid lines; 2-col below: data table (5 rows+header) left + activity feed (timestamped items) right",
      personality: "clean, data-rich, professional app UI — like Linear, Notion, or Vercel dashboard. Light background, crisp borders, clear hierarchy",
      colorNote: "indigo accent on white/light-gray; sidebar uses white bg; metric up = emerald, down = red",
    },

    fitness: {
      tailwindConfig: `TAILWIND COLOR PALETTE — use these exact classes:
- Page bg: bg-[#080C0A]  |  Alt section bg: bg-[#0D1209]
- Card/surface bg: bg-[#111A0F]  |  Card hover: hover:bg-[#162114]
- Borders: border-green-500/[0.1]  |  Hover borders: hover:border-green-400/25
- Headings: text-[#F0FFF4]  |  Body text: text-[#A8D5B5]  |  Muted: text-[#5A8A66]
- Accent: text-green-400  bg-green-500  hover:bg-green-400  border-green-500/30
- Primary button: bg-green-500 hover:bg-green-400 text-black font-bold rounded-full px-8 py-4 uppercase tracking-wide shadow-[0_0_24px_rgba(34,197,94,0.35)]
- Ghost button: border border-green-500/40 text-green-400 hover:bg-green-500/10 rounded-full px-8 py-4 uppercase tracking-wide
- Gradient text: bg-gradient-to-r from-green-400 to-lime-300 bg-clip-text text-transparent
- Hero glow: style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(34,197,94,0.16) 0%, transparent 70%)' }}
FONTS: font-['Syne'] for ALL headings (font-bold uppercase tracking-tight), font-['Inter'] for body`,
      fonts: `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet">`,
      sections: "sticky navbar (logo + 3 links + 'Start Training' CTA), hero (split: left=Syne ALL-CAPS bold headline + 3 stats + CTA pair, right=athlete SVG with green glow), programs (3 cards with intensity badge+name+description), features (3 alternating split rows: app/nutrition/community), testimonials (3 cards, before/after stat+quote+name), pricing (3 tiers: $15/$49/$299, middle featured green border), footer (4-col)",
      personality: "powerful, energetic, athletic — like Whoop or Nike Training. Bold ALL-CAPS headings, strong contrast, urgency",
      colorNote: "electric green on near-black; Syne font for all headings; green glow shadow on primary CTA; uppercase tracking on all labels",
    },

    portfolio: {
      tailwindConfig: `TAILWIND COLOR PALETTE — use these exact classes:
- Page bg: bg-[#FAFAF8]  |  Alt section bg: bg-[#F2F0EC]
- Card bg: bg-white  |  Card border: border-[#E8E4DC]
- Headings: text-[#1A1915] font-['Playfair_Display']  |  Body: text-[#3D3A30]  |  Muted: text-[#8A8578]
- Accent: text-[#C17B2F]  bg-[#C17B2F]  hover:bg-[#D08A3A]
- Primary button: border border-[#C17B2F] text-[#C17B2F] hover:bg-[#C17B2F] hover:text-white rounded-full px-8 py-3 font-medium transition-all
- Gradient text: bg-gradient-to-r from-[#C17B2F] to-[#E8A84A] bg-clip-text text-transparent
FONTS: font-['Playfair_Display'] for h1 ONLY (very large editorial), font-['DM_Sans'] for everything else`,
      fonts: `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet">`,
      sections: "minimal navbar (name as logo, Work/About/Contact links, 'Hire me' ghost CTA), hero (large Playfair Display headline 3 lines, amber gradient on name, pure typography no image, scroll arrow), work grid (2-col project cards, 4/3 aspect ratio colored placeholders, title+category pill), about (split: amber-border avatar + bio + skills pills), contact (large centered email link + social links, amber glow), minimal footer",
      personality: "editorial, warm, tasteful — like an Awwwards finalist portfolio. Refined serif headings, generous whitespace, amber warmth",
      colorNote: "warm amber accent on warm off-white; Playfair Display for h1 ONLY; DM Sans for body; very generous whitespace throughout",
    },

    agency: {
      tailwindConfig: `TAILWIND COLOR PALETTE — use these exact classes:
- Page bg: bg-[#080810]  |  Alt section bg: bg-[#0C0C18]
- Card bg: bg-[#111122]  |  Card hover: hover:bg-[#16162A]
- Borders: border-white/[0.06]  |  Hover borders: hover:border-white/[0.12]
- Headings: text-white font-['Syne']  |  Body: text-[#B0B0C8]  |  Muted: text-[#68688A]
- Accent: text-[#FF4D6D]  bg-[#FF4D6D]  hover:bg-[#FF6680]  border-[#FF4D6D]/30
- Primary button: bg-[#FF4D6D] hover:bg-[#FF6680] text-white rounded-full px-8 py-4 font-semibold
- Ghost button: border border-white/20 text-white hover:bg-white/10 rounded-full px-8 py-4
- Gradient text: bg-gradient-to-r from-[#FF4D6D] to-[#FF8C42] bg-clip-text text-transparent
- Hero glow: style={{ background: 'radial-gradient(ellipse 90% 60% at 50% -5%, rgba(255,77,109,0.14) 0%, transparent 65%)' }}
FONTS: font-['Syne'] for ALL headings (large, bold, dramatic), font-['Inter'] for body`,
      fonts: `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Syne:wght@700;800&display=swap" rel="stylesheet">`,
      sections: "navbar (logo + 3 links + 'Let's talk' CTA), hero (centered, Syne oversized headline 2 lines + gradient on last word, strapline, 2 CTAs, '50+ brands' row), services (3 large cards with hover gradient border, name+description), selected work (2x2 grid of project placeholders with client+category overlay), CTA banner (full-width Syne heading + 'Start a project' CTA), footer (4-col)",
      personality: "bold, opinionated creative agency — like Huge, Fantasy, or Instrument. Maximum confidence, dramatic typographic scale",
      colorNote: "coral/red accent on near-black; Syne for ALL headings; gradient text on key headline words",
    },

    ecommerce: {
      tailwindConfig: `TAILWIND COLOR PALETTE — use these exact classes:
- Page bg: bg-white  |  Alt section bg: bg-[#F7F7F5]
- Card bg: bg-white  |  Card border: border border-[#E5E5E0]
- Headings: text-[#111110]  |  Body: text-[#3A3A38]  |  Muted: text-[#7A7A75]
- Accent (primary): bg-[#1A1A1A] hover:bg-[#333] text-white  (near-black buttons)
- Sale accent: text-[#E63946] bg-[#E63946] (only for sale badges)
- Primary button: bg-[#1A1A1A] hover:bg-[#333] text-white rounded-none px-8 py-4 uppercase tracking-widest text-sm font-semibold
- Secondary button: border border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white rounded-none px-8 py-4
FONTS: font-['DM_Sans'] for everything`,
      fonts: `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">`,
      sections: "minimal sticky navbar (logo center, links left, cart+account icons right), hero (full-width colored bg placeholder + tagline + 'Shop now' CTA), category grid (3 tall-aspect-ratio category cards with overlay label), featured products (4 product cards: image+name+price+hover add button), reviews (3 cards: ★★★★★+quote+name+location), newsletter (centered heading + email input), footer (4-col)",
      personality: "clean, premium retail — like Aesop, Allbirds, or Cos. Minimalist, product-first, generous whitespace",
      colorNote: "near-black on pure white; DM Sans throughout; red only for sale badges; black primary button; square/no-radius buttons for editorial feel",
    },

    generic: {
      tailwindConfig: `TAILWIND COLOR PALETTE — use these exact classes:
- Page bg: bg-[#09090D]  |  Alt section bg: bg-[#0E0E14]
- Card/surface bg: bg-[#141420]  |  Card hover: hover:bg-[#1A1A28]
- Borders: border-white/[0.07]  |  Hover borders: hover:border-white/[0.14]
- Headings: text-[#F2F2FF]  |  Body text: text-[#BEBECE]  |  Muted: text-[#767690]
- Accent: text-violet-400  bg-violet-600  hover:bg-violet-500  border-violet-500/30
- Primary button: bg-violet-600 hover:bg-violet-500 text-white rounded-full px-6 py-3 font-semibold
- Ghost button: border border-white/20 text-white hover:bg-white/10 rounded-full px-6 py-3
- Gradient text: bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent
- Hero glow: style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(139,92,246,0.16) 0%, transparent 70%)' }}
FONTS: font-['Inter'] for all text`,
      fonts: `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">`,
      sections: "sticky navbar (logo + 3 links + CTA + mobile toggle), hero (centered, radial glow, eyebrow badge, large headline gradient on 1-2 words, subtitle, 2 CTAs, mockup SVG below), features (3-col card grid, icon+title+description each, hover effects), testimonials (3 cards, ★★★★★+quote+name+role), CTA (large heading+urgency+2 buttons+gradient bg), footer (4-col: brand + 3 link groups + copyright)",
      personality: "modern, premium, startup-quality — confident and polished. Like a well-funded seed-stage startup landing page",
      colorNote: "violet/purple accent on near-black; pink-to-purple gradient text on 1 hero headline word; subtle glow on featured card hover",
    },
  };

  return configs[type];
}
