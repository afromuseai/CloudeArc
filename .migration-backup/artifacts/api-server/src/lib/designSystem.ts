export const DESIGN_SYSTEM_CSS = `
/* ============================================================
   CLOUDEARC DESIGN SYSTEM — inject as /src/styles/design.css
   ============================================================ */

/* ── Reset ─────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-font-smoothing: antialiased; scroll-behavior: smooth; }

/* ── Tokens ─────────────────────────────────────────────────── */
:root {
  /* Spacing scale (4-pt grid) */
  --sp-1:  4px;
  --sp-2:  8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-5: 20px;
  --sp-6: 24px;
  --sp-8: 32px;
  --sp-10: 40px;
  --sp-12: 48px;
  --sp-16: 64px;
  --sp-20: 80px;
  --sp-24: 96px;
  --sp-32: 128px;

  /* Type scale */
  --text-xs:   0.75rem;
  --text-sm:   0.875rem;
  --text-base: 1rem;
  --text-lg:   1.125rem;
  --text-xl:   1.25rem;
  --text-2xl:  1.5rem;
  --text-3xl:  1.875rem;
  --text-4xl:  2.25rem;
  --text-5xl:  3rem;
  --text-6xl:  3.75rem;
  --text-7xl:  4.5rem;

  /* Font weights */
  --weight-normal:   400;
  --weight-medium:   500;
  --weight-semibold: 600;
  --weight-bold:     700;
  --weight-extrabold:800;

  /* Line heights */
  --leading-tight:  1.2;
  --leading-snug:   1.375;
  --leading-normal: 1.5;
  --leading-relaxed:1.625;

  /* Border radii */
  --radius-sm:  6px;
  --radius-md:  10px;
  --radius-lg:  16px;
  --radius-xl:  24px;
  --radius-2xl: 32px;
  --radius-full:9999px;

  /* Shadows */
  --shadow-sm:  0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
  --shadow-md:  0 4px 12px rgba(0,0,0,.08), 0 2px 6px rgba(0,0,0,.06);
  --shadow-lg:  0 8px 32px rgba(0,0,0,.10), 0 4px 12px rgba(0,0,0,.07);
  --shadow-xl:  0 20px 48px rgba(0,0,0,.14), 0 8px 24px rgba(0,0,0,.09);
  --shadow-glow:0 0 40px rgba(var(--accent-rgb), 0.25);

  /* Container widths */
  --container-xs:  480px;
  --container-sm:  640px;
  --container-md:  768px;
  --container-lg:  1024px;
  --container-xl:  1280px;
  --container-2xl: 1440px;

  /* Transitions */
  --ease-out:   cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out:cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast:  150ms;
  --duration-base:  250ms;
  --duration-slow:  400ms;
  --duration-slower:600ms;
}

/* ── Typography ──────────────────────────────────────────────── */
body {
  font-family: var(--font-sans, 'Inter', system-ui, -apple-system, sans-serif);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  color: var(--color-text);
  background: var(--color-bg);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display, var(--font-sans));
  font-weight: var(--weight-bold);
  line-height: var(--leading-tight);
  letter-spacing: -0.02em;
  color: var(--color-heading);
}

/* ── Layout ──────────────────────────────────────────────────── */
.container {
  width: 100%;
  max-width: var(--container-xl);
  margin-inline: auto;
  padding-inline: var(--sp-6);
}
.container--narrow { max-width: var(--container-lg); }
.container--wide   { max-width: var(--container-2xl); }

/* ── Section spacing ─────────────────────────────────────────── */
.section        { padding-block: var(--sp-24); }
.section--lg    { padding-block: var(--sp-32); }
.section--sm    { padding-block: var(--sp-16); }

/* ── Grid ────────────────────────────────────────────────────── */
.grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--sp-8); }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-8); }
.grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp-6); }
@media (max-width: 1024px) {
  .grid-4 { grid-template-columns: repeat(2, 1fr); }
  .grid-3 { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
}

/* ── Buttons ─────────────────────────────────────────────────── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  padding: 0 var(--sp-6);
  height: 48px;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  font-family: inherit;
  letter-spacing: 0.01em;
  cursor: pointer;
  border: none;
  outline: none;
  text-decoration: none;
  white-space: nowrap;
  transition: all var(--duration-base) var(--ease-out);
  position: relative;
  overflow: hidden;
}
.btn:active { transform: scale(0.97); }

.btn--primary {
  background: var(--color-accent);
  color: var(--color-accent-fg, #fff);
  box-shadow: 0 1px 2px rgba(0,0,0,.15), 0 0 0 0 rgba(var(--accent-rgb), 0);
}
.btn--primary:hover {
  background: var(--color-accent-hover, var(--color-accent));
  box-shadow: 0 4px 16px rgba(var(--accent-rgb), 0.35);
  transform: translateY(-1px);
}

.btn--secondary {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}
.btn--secondary:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-border-hover);
  transform: translateY(-1px);
}

.btn--ghost {
  background: transparent;
  color: var(--color-text-muted);
  border: 1px solid transparent;
}
.btn--ghost:hover {
  background: var(--color-surface);
  color: var(--color-text);
}

.btn--lg {
  height: 56px;
  padding: 0 var(--sp-8);
  font-size: var(--text-base);
  border-radius: var(--radius-lg);
}
.btn--sm {
  height: 36px;
  padding: 0 var(--sp-4);
  font-size: var(--text-xs);
  border-radius: var(--radius-sm);
}
.btn--pill { border-radius: var(--radius-full); }

/* ── Cards ───────────────────────────────────────────────────── */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--sp-6);
  transition: all var(--duration-base) var(--ease-out);
}
.card:hover {
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
.card--elevated {
  box-shadow: var(--shadow-sm);
}
.card--feature {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--sp-8);
}
.card--feature:hover {
  border-color: rgba(var(--accent-rgb), 0.4);
  box-shadow: 0 0 0 1px rgba(var(--accent-rgb), 0.1), var(--shadow-lg);
  transform: translateY(-3px);
}

/* ── Badges / Tags ───────────────────────────────────────────── */
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.badge--accent {
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--color-accent);
  border: 1px solid rgba(var(--accent-rgb), 0.2);
}

/* ── Feature icon box ────────────────────────────────────────── */
.icon-box {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--color-accent);
  font-size: 22px;
  margin-bottom: var(--sp-4);
  flex-shrink: 0;
}

/* ── Text utilities ──────────────────────────────────────────── */
.text-balance  { text-wrap: balance; }
.text-muted    { color: var(--color-text-muted); }
.text-accent   { color: var(--color-accent); }
.label {
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-accent);
}

/* ── Dividers ────────────────────────────────────────────────── */
.divider {
  height: 1px;
  background: var(--color-border);
  border: none;
}

/* ── Gradient text ───────────────────────────────────────────── */
.gradient-text {
  background: var(--gradient-accent, linear-gradient(135deg, var(--color-accent), var(--color-accent-2, var(--color-accent))));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ── Gradient backgrounds ────────────────────────────────────── */
.gradient-hero {
  background: var(--gradient-hero,
    radial-gradient(ellipse 80% 60% at 50% -10%, rgba(var(--accent-rgb), 0.15) 0%, transparent 70%),
    var(--color-bg)
  );
}
.gradient-section {
  background: var(--gradient-section,
    radial-gradient(ellipse 60% 80% at 80% 50%, rgba(var(--accent-rgb), 0.08) 0%, transparent 60%),
    var(--color-bg-alt)
  );
}

/* ── Glass card ──────────────────────────────────────────────── */
.glass {
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.08);
}

/* ── Navbar ──────────────────────────────────────────────────── */
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
  height: 64px;
  display: flex;
  align-items: center;
  background: rgba(var(--bg-rgb, 255,255,255), 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--color-border);
}
.navbar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: var(--container-xl);
  margin-inline: auto;
  padding-inline: var(--sp-6);
}
.navbar__logo {
  font-size: var(--text-lg);
  font-weight: var(--weight-bold);
  color: var(--color-heading);
  text-decoration: none;
  letter-spacing: -0.02em;
}
.navbar__links {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  list-style: none;
}
.navbar__links a {
  padding: var(--sp-2) var(--sp-3);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-muted);
  text-decoration: none;
  border-radius: var(--radius-sm);
  transition: color var(--duration-fast), background var(--duration-fast);
}
.navbar__links a:hover {
  color: var(--color-heading);
  background: var(--color-surface);
}
.navbar__actions { display: flex; align-items: center; gap: var(--sp-3); }
@media (max-width: 768px) {
  .navbar__links { display: none; }
}

/* ── Hero ────────────────────────────────────────────────────── */
.hero {
  padding-block: var(--sp-32) var(--sp-24);
  text-align: center;
  position: relative;
  overflow: hidden;
}
.hero__eyebrow {
  display: inline-flex;
  margin-bottom: var(--sp-5);
}
.hero__title {
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  font-weight: var(--weight-extrabold);
  line-height: 1.05;
  letter-spacing: -0.03em;
  color: var(--color-heading);
  max-width: 820px;
  margin-inline: auto;
  text-wrap: balance;
}
.hero__sub {
  font-size: clamp(1rem, 2vw, 1.25rem);
  color: var(--color-text-muted);
  max-width: 560px;
  margin-inline: auto;
  margin-top: var(--sp-5);
  line-height: var(--leading-relaxed);
  text-wrap: balance;
}
.hero__actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-4);
  margin-top: var(--sp-8);
  flex-wrap: wrap;
}
.hero__preview {
  margin-top: var(--sp-16);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--color-border);
}

/* ── Features ────────────────────────────────────────────────── */
.features__header {
  text-align: center;
  max-width: 640px;
  margin-inline: auto;
  margin-bottom: var(--sp-16);
}
.feature__title {
  font-size: var(--text-xl);
  font-weight: var(--weight-semibold);
  color: var(--color-heading);
  margin-bottom: var(--sp-2);
}
.feature__desc {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  line-height: var(--leading-relaxed);
}

/* ── Pricing ─────────────────────────────────────────────────── */
.pricing-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--sp-8);
  display: flex;
  flex-direction: column;
  transition: all var(--duration-base) var(--ease-out);
}
.pricing-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-4px);
}
.pricing-card--featured {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 1px var(--color-accent), var(--shadow-glow);
  position: relative;
}
.pricing-card--featured::before {
  content: attr(data-badge);
  position: absolute;
  top: -13px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-accent);
  color: #fff;
  padding: 2px 14px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.pricing__amount {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: var(--weight-extrabold);
  letter-spacing: -0.03em;
  color: var(--color-heading);
  line-height: 1;
}
.pricing__period {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  margin-left: var(--sp-1);
}
.pricing__features {
  list-style: none;
  margin-top: var(--sp-6);
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  flex: 1;
}
.pricing__features li {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
.pricing__features li::before {
  content: '✓';
  color: var(--color-accent);
  font-weight: var(--weight-bold);
  flex-shrink: 0;
}

/* ── Testimonials ────────────────────────────────────────────── */
.testimonial {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--sp-8);
  transition: all var(--duration-base) var(--ease-out);
}
.testimonial:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
.testimonial__quote {
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--color-text);
  font-style: italic;
  margin-bottom: var(--sp-6);
}
.testimonial__author {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}
.testimonial__avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: rgba(var(--accent-rgb), 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--weight-semibold);
  color: var(--color-accent);
  font-size: var(--text-sm);
  flex-shrink: 0;
}
.testimonial__name {
  font-weight: var(--weight-semibold);
  color: var(--color-heading);
  font-size: var(--text-sm);
}
.testimonial__role {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

/* ── CTA section ─────────────────────────────────────────────── */
.cta-section {
  text-align: center;
  padding: var(--sp-20) var(--sp-6);
  background: var(--gradient-cta,
    radial-gradient(ellipse 80% 100% at 50% 100%, rgba(var(--accent-rgb), 0.15) 0%, transparent 70%),
    var(--color-bg-alt));
}
.cta-section h2 {
  font-size: clamp(2rem, 5vw, 3.5rem);
  margin-bottom: var(--sp-5);
}

/* ── Footer ──────────────────────────────────────────────────── */
.footer {
  border-top: 1px solid var(--color-border);
  padding-block: var(--sp-16);
  color: var(--color-text-muted);
}
.footer__inner {
  display: grid;
  grid-template-columns: 2fr repeat(3, 1fr);
  gap: var(--sp-12);
  max-width: var(--container-xl);
  margin-inline: auto;
  padding-inline: var(--sp-6);
}
.footer__brand p {
  font-size: var(--text-sm);
  margin-top: var(--sp-3);
  max-width: 240px;
  line-height: var(--leading-relaxed);
}
.footer__col h4 {
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: var(--color-heading);
  margin-bottom: var(--sp-4);
}
.footer__col ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.footer__col ul a {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  text-decoration: none;
  transition: color var(--duration-fast);
}
.footer__col ul a:hover { color: var(--color-heading); }
.footer__bottom {
  margin-top: var(--sp-12);
  padding-top: var(--sp-6);
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: var(--container-xl);
  margin-inline: auto;
  padding-inline: var(--sp-6);
  font-size: var(--text-xs);
}
@media (max-width: 768px) {
  .footer__inner { grid-template-columns: 1fr 1fr; }
  .footer__bottom { flex-direction: column; gap: var(--sp-3); }
}
@media (max-width: 480px) {
  .footer__inner { grid-template-columns: 1fr; }
}

/* ── Stats / numbers ─────────────────────────────────────────── */
.stat__value {
  font-size: clamp(2rem, 4vw, 3.5rem);
  font-weight: var(--weight-extrabold);
  letter-spacing: -0.03em;
  color: var(--color-heading);
  line-height: 1;
}
.stat__label {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  margin-top: var(--sp-2);
}

/* ── Logos / social proof bar ────────────────────────────────── */
.logos-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-10);
  flex-wrap: wrap;
  opacity: 0.5;
  filter: grayscale(1);
  transition: opacity var(--duration-base);
}
.logos-bar:hover { opacity: 0.7; }

/* ── Animations ──────────────────────────────────────────────── */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes slideRight {
  from { opacity: 0; transform: translateX(-20px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-10px); }
}
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.3); }
  50%       { box-shadow: 0 0 40px rgba(var(--accent-rgb), 0.6); }
}
@keyframes shimmer {
  from { background-position: -200% center; }
  to   { background-position:  200% center; }
}

.animate-fade-up {
  animation: fadeUp var(--duration-slower) var(--ease-out) both;
}
.animate-fade-in {
  animation: fadeIn var(--duration-slower) var(--ease-out) both;
}
.animate-scale-in {
  animation: scaleIn var(--duration-slow) var(--ease-out) both;
}
.animate-float {
  animation: float 4s ease-in-out infinite;
}
.animate-pulse-glow {
  animation: pulse-glow 2.5s ease-in-out infinite;
}

/* Stagger helpers (apply delay per child index in JSX style) */
.stagger > * { animation: fadeUp var(--duration-slower) var(--ease-out) both; }
.stagger > *:nth-child(1) { animation-delay: 0ms; }
.stagger > *:nth-child(2) { animation-delay: 80ms; }
.stagger > *:nth-child(3) { animation-delay: 160ms; }
.stagger > *:nth-child(4) { animation-delay: 240ms; }
.stagger > *:nth-child(5) { animation-delay: 320ms; }
.stagger > *:nth-child(6) { animation-delay: 400ms; }

/* ── Image placeholders ──────────────────────────────────────── */
.img-placeholder {
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: var(--radius-lg);
  background: linear-gradient(
    135deg,
    rgba(var(--accent-rgb), 0.08) 0%,
    rgba(var(--accent-rgb), 0.04) 50%,
    rgba(var(--accent-rgb), 0.10) 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  position: relative;
  overflow: hidden;
}
.img-placeholder::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%);
  background-size: 200% 100%;
  animation: shimmer 2.5s linear infinite;
}
.avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.2), rgba(var(--accent-rgb), 0.05));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25em;
  font-weight: var(--weight-bold);
  color: var(--color-accent);
}

/* ── Dashboard-specific ──────────────────────────────────────── */
.sidebar {
  width: 240px;
  flex-shrink: 0;
  border-right: 1px solid var(--color-border);
  height: 100vh;
  background: var(--color-bg-alt);
  padding: var(--sp-6);
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}
.sidebar__item {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-muted);
  text-decoration: none;
  transition: all var(--duration-fast);
  cursor: pointer;
}
.sidebar__item:hover, .sidebar__item.active {
  background: var(--color-surface);
  color: var(--color-heading);
}
.sidebar__item.active { color: var(--color-accent); }
.metric-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--sp-5) var(--sp-6);
}
.metric-card__value {
  font-size: var(--text-3xl);
  font-weight: var(--weight-extrabold);
  letter-spacing: -0.03em;
  color: var(--color-heading);
}
.metric-card__label {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: var(--weight-semibold);
  margin-bottom: var(--sp-2);
}
.metric-card__trend {
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  margin-top: var(--sp-2);
}
.trend--up   { color: #22c55e; }
.trend--down { color: #ef4444; }

/* ── Responsive nav toggle ───────────────────────────────────── */
.nav-toggle {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-heading);
  font-size: 1.5rem;
}
@media (max-width: 768px) {
  .nav-toggle { display: flex; }
  .mobile-menu {
    position: fixed;
    inset: 64px 0 0 0;
    background: var(--color-bg);
    border-top: 1px solid var(--color-border);
    z-index: 99;
    padding: var(--sp-6);
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }
  .mobile-menu a {
    display: block;
    padding: var(--sp-3) var(--sp-4);
    font-size: var(--text-base);
    font-weight: var(--weight-medium);
    color: var(--color-text);
    text-decoration: none;
    border-radius: var(--radius-sm);
  }
  .mobile-menu a:hover { background: var(--color-surface); }
  .hero__title { font-size: clamp(2rem, 8vw, 3rem); }
  .hero { padding-block: var(--sp-20) var(--sp-16); }
  .section { padding-block: var(--sp-16); }
}

/* ── Bento Grid ──────────────────────────────────────────────── */
.bento {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-auto-rows: minmax(120px, auto);
  gap: var(--sp-4);
}
.bento__cell {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--sp-6);
  transition: all var(--duration-base) var(--ease-out);
  overflow: hidden;
}
.bento__cell:hover {
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
.bento__cell--span2  { grid-column: span 2; }
.bento__cell--span3  { grid-column: span 3; }
.bento__cell--span4  { grid-column: span 4; }
.bento__cell--span6  { grid-column: span 6; }
.bento__cell--span8  { grid-column: span 8; }
.bento__cell--span12 { grid-column: span 12; }
.bento__cell--row2   { grid-row: span 2; }
.bento__cell--accent {
  background: rgba(var(--accent-rgb), 0.08);
  border-color: rgba(var(--accent-rgb), 0.2);
}
@media (max-width: 768px) {
  .bento__cell--span2,.bento__cell--span3,.bento__cell--span4,
  .bento__cell--span6,.bento__cell--span8 { grid-column: span 12; }
  .bento__cell--row2 { grid-row: span 1; }
}

/* ── Split Layout ────────────────────────────────────────────── */
.split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-16);
  align-items: center;
}
.split--60 { grid-template-columns: 3fr 2fr; }
.split--40 { grid-template-columns: 2fr 3fr; }
.split--reverse > :first-child { order: 2; }
.split--reverse > :last-child  { order: 1; }
@media (max-width: 768px) {
  .split, .split--60, .split--40 {
    grid-template-columns: 1fr;
    gap: var(--sp-10);
  }
  .split--reverse > :first-child { order: unset; }
  .split--reverse > :last-child  { order: unset; }
}

/* ── Hero variants ───────────────────────────────────────────── */
.hero--left { text-align: left; }
.hero--left .hero__sub { margin-inline: 0; }
.hero--left .hero__actions { justify-content: flex-start; }
.hero--split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-16);
  align-items: center;
  text-align: left;
  padding-block: var(--sp-24);
}
@media (max-width: 768px) {
  .hero--split {
    grid-template-columns: 1fr;
    gap: var(--sp-10);
    text-align: center;
  }
  .hero--split .hero__actions { justify-content: center; }
}

/* ── Scroll-reveal (JS adds .is-visible via IntersectionObserver) */
.reveal {
  opacity: 0;
  transform: translateY(28px);
  transition: opacity var(--duration-slower) var(--ease-out),
              transform var(--duration-slower) var(--ease-out);
}
.reveal.is-visible { opacity: 1; transform: translateY(0); }
.reveal-delay-1 { transition-delay: 80ms; }
.reveal-delay-2 { transition-delay: 160ms; }
.reveal-delay-3 { transition-delay: 240ms; }
.reveal-delay-4 { transition-delay: 320ms; }
.reveal-scale {
  opacity: 0;
  transform: scale(0.96);
  transition: opacity var(--duration-slower) var(--ease-out),
              transform var(--duration-slower) var(--ease-out);
}
.reveal-scale.is-visible { opacity: 1; transform: scale(1); }

/* ── Number steps ────────────────────────────────────────────── */
.steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--sp-8);
  counter-reset: steps;
}
.step {
  counter-increment: steps;
  position: relative;
  padding-top: var(--sp-10);
}
.step::before {
  content: counter(steps, decimal-leading-zero);
  position: absolute;
  top: 0; left: 0;
  font-size: var(--text-4xl);
  font-weight: var(--weight-extrabold);
  letter-spacing: -0.05em;
  color: rgba(var(--accent-rgb), 0.15);
  line-height: 1;
}
.step__title {
  font-size: var(--text-lg);
  font-weight: var(--weight-semibold);
  color: var(--color-heading);
  margin-bottom: var(--sp-3);
}
.step__desc {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  line-height: var(--leading-relaxed);
}

/* ── Feature spotlight (large + small bento cards) ───────────── */
.feature-spotlight {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-5);
  margin-bottom: var(--sp-5);
}
.feature-spotlight__main {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-2xl);
  padding: var(--sp-10);
  overflow: hidden;
  transition: all var(--duration-base) var(--ease-out);
}
.feature-spotlight__main:hover {
  border-color: rgba(var(--accent-rgb), 0.3);
  box-shadow: var(--shadow-xl);
}
.feature-spotlight__side {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
}
@media (max-width: 768px) {
  .feature-spotlight { grid-template-columns: 1fr; }
}

/* ── Marquee strip ───────────────────────────────────────────── */
@keyframes marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
.marquee { overflow: hidden; }
.marquee__track {
  display: flex;
  width: max-content;
  animation: marquee 28s linear infinite;
}
.marquee__track:hover { animation-play-state: paused; }
.marquee__item { flex-shrink: 0; padding-inline: var(--sp-8); }

/* ── Pill list ───────────────────────────────────────────────── */
.pill-list { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
.pill {
  padding: var(--sp-2) var(--sp-4);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  transition: all var(--duration-fast);
}
.pill:hover { border-color: rgba(var(--accent-rgb), 0.4); color: var(--color-accent); }

/* ── Comparison table ────────────────────────────────────────── */
.compare-table { width: 100%; border-collapse: collapse; }
.compare-table th, .compare-table td {
  padding: var(--sp-4) var(--sp-5);
  text-align: left;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--text-sm);
}
.compare-table th {
  font-weight: var(--weight-semibold);
  color: var(--color-heading);
  background: var(--color-surface);
}
.compare-table td { color: var(--color-text-muted); }
.compare-table .check { color: var(--color-accent); font-weight: var(--weight-bold); }
.compare-table .cross { color: var(--color-text-muted); opacity: 0.4; }

/* ── Scroll row ──────────────────────────────────────────────── */
.scroll-row {
  display: flex;
  gap: var(--sp-6);
  overflow-x: auto;
  padding-bottom: var(--sp-4);
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.scroll-row::-webkit-scrollbar { display: none; }
.scroll-row > * { flex-shrink: 0; }

/* ── Accent line decoration ──────────────────────────────────── */
.section-label {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-3);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-accent);
  margin-bottom: var(--sp-5);
}
.section-label::before {
  content: '';
  display: block;
  width: 20px;
  height: 2px;
  background: var(--color-accent);
  border-radius: 2px;
}

/* ── Gradient border card ────────────────────────────────────── */
.card--gradient-border {
  position: relative;
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--sp-8);
}
.card--gradient-border::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.5), transparent, rgba(var(--accent-rgb), 0.2));
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
`;

export const DESIGN_SYSTEM_RULES = `
DESIGN SYSTEM RULES (follow exactly):

FOUNDATION
1. ALWAYS include /src/styles/design.css with the full design system CSS above — copy it verbatim.
2. ALWAYS import both CSS files in /src/main.jsx: import './styles/design.css'; import './styles/theme.css'
3. ALWAYS add Google Fonts in /index.html <head> matching the template fonts.
4. ALWAYS set the full :root token block in /src/styles/theme.css.
5. Use className with design system classes — never inline styles for layout or spacing.
6. DO NOT use Tailwind classes. Use only the classes defined in the design system above.
7. No generic color names ("blue", "green") — use CSS custom properties only.

SCROLL ANIMATIONS (mandatory)
8. Add an IntersectionObserver in /src/main.jsx or App.jsx after mount:
   useEffect(() => {
     const obs = new IntersectionObserver((entries) => {
       entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); obs.unobserve(e.target); } });
     }, { threshold: 0.12 });
     document.querySelectorAll('.reveal, .reveal-scale').forEach(el => obs.observe(el));
     return () => obs.disconnect();
   }, []);
9. Apply className="reveal" to section headers, feature cards, and testimonial cards.
10. Apply className="reveal reveal-delay-1/2/3/4" to stagger grid children (use different delays per card).
11. Keep animate-fade-up on the hero title (it fires immediately on load, no observer needed).

LAYOUT SELECTION (use design judgment)
12. CENTERED HERO: use when product has a single clear CTA and wide brand statement. Add .gradient-hero background.
13. SPLIT HERO (.hero--split): use for SaaS, AI tools, portfolios where showing the product/visual matters.
14. BENTO GRID (.bento): use for feature sections with 4-8 features of varying importance. Mix .bento__cell--span6 (large) and .bento__cell--span3 (small).
15. FEATURE SPOTLIGHT (.feature-spotlight): use for 1 hero feature + 2 supporting features side-by-side.
16. SPLIT LAYOUT (.split / .split--60): use for alternating content+visual sections. Alternate .split and .split--reverse.
17. STEPS (.steps): use for "how it works" — always 3 steps with numbered CSS counters.
18. CARDS (.grid-3): use for equal-weight features, testimonials, pricing tiers.

VISUAL HIERARCHY (mandatory)
19. Every section must start with a .section-label (e.g. "Features", "Pricing") above the heading.
20. Section headings: max 10 words. Use clamp() for fluid sizing. Use .gradient-text on 1-2 key words only.
21. Hero title: 6-12 words. Bold, large, with a specific value proposition. Not generic.
22. Hero subtitle: 1-2 sentences max. Benefit-focused, not feature-list.
23. No more than 3 levels of text hierarchy per section: heading → subheading → body.

SPACING & RHYTHM
24. Every section: .section or .section--lg padding. Never collapse sections together.
25. Between sections, alternate backgrounds: var(--color-bg) and var(--color-bg-alt).
26. Cards in a grid: min 3, max 6. Never have orphaned single cards on a row.
27. Feature icons: always use .icon-box. Pick a relevant emoji or Unicode symbol. Never leave it blank.

COMPONENT QUALITY
28. Navbar: logo left, nav links center (hide on mobile), CTA button right. Always sticky.
29. Hero: eyebrow badge → title → subtitle → CTA pair → product visual/preview placeholder.
30. Features: section-label → headline → subhead → grid (bento or 3-col). Each feature: icon, title, 2-sentence description.
31. Pricing: always 3 tiers. Middle card gets .pricing-card--featured with data-badge="Most Popular". Real prices ($9/$29/$79 or similar).
32. Testimonials: 3 cards in .grid-3. Each: star rating (★★★★★), quote, avatar initials, name, title, company.
33. CTA section: .cta-section class. Large heading, 1-sentence urgency line, primary + ghost button pair.
34. Footer: .footer with 4 columns (brand + 3 link groups). Real link labels relevant to the product.

INTERACTION PATTERNS
35. All .card, .card--feature, .bento__cell get :hover via the design system — do NOT override.
36. Buttons: always .btn + modifier (.btn--primary, .btn--secondary, .btn--ghost). Add .btn--lg on hero CTAs.
37. Add tabIndex={0} and onKeyDown for keyboard accessibility on interactive non-button elements.

COPY QUALITY
38. Never use "Lorem ipsum". Write real, specific marketing copy relevant to the product.
39. Feature names: specific and concrete. Not "Easy to use" — instead "Zero-config setup in 30 seconds".
40. Pricing plan names: meaningful (not "Basic/Standard/Premium") — e.g. "Starter/Growth/Scale".
41. Testimonials: first-person, specific outcome. "We cut deploy time by 60%" not "Great product".

RESPONSIVE
42. Test at 320px, 640px, 768px, 1024px, 1280px. Use the responsive overrides in the design system.
43. Mobile hero: stack vertically, keep CTA buttons full-width on small screens.
44. Mobile navbar: hide .navbar__links, show .nav-toggle button that toggles a mobile menu state.
45. Mobile footer: collapse to 2 columns at 768px, 1 column at 480px (handled by design system).
`;
