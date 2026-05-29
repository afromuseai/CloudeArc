export const DESIGN_INTELLIGENCE = `
╔══════════════════════════════════════════════════════════════════╗
║            CLOUDEARC DESIGN INTELLIGENCE LAYER                   ║
║   Rules for generating premium, startup-quality websites         ║
╚══════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LAYOUT SELECTION GUIDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HERO LAYOUT DECISION:
  • Product is a SaaS/tool with a UI to show → use .hero--split (text left, product screenshot right)
  • Brand statement or broad market → use centered .hero with .gradient-hero background
  • Portfolio or creative → use .hero--left with large editorial type, no product visual
  • Agency or bold brand → use centered with oversized display text spanning 2 lines

FEATURE SECTION DECISION:
  • 3 equal features → .grid-3 cards with .card--feature
  • 4–8 features of varying importance → .bento grid (mix --span6 hero cell + --span3 small cells)
  • 1 hero feature + 2 supporting → .feature-spotlight layout
  • Sequential process → .steps with numbered CSS counters

CONTENT SECTION DECISION:
  • Showing product detail or benefit → .split or .split--60 (alternate with .split--reverse)
  • Social proof → .grid-3 testimonial cards with star ratings
  • "Works with" or "trusted by" → .logos-bar with .marquee for variety
  • "How it works" → always 3 steps, never 2 or 4

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VISUAL HIERARCHY RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TYPOGRAPHIC SCALE (strictly enforce):
  Hero title:       clamp(2.8rem, 6vw, 4.5rem) — always .animate-fade-up
  Section heading:  clamp(2rem, 4vw, 3rem)
  Card title:       var(--text-xl) or var(--text-2xl)
  Body text:        var(--text-base) with var(--leading-relaxed)
  Muted/label:      var(--text-sm) with var(--color-text-muted)
  Eyebrow/badge:    var(--text-xs) uppercase tracked — use .badge--accent

CONTRAST HIERARCHY:
  Level 1 (headings):  var(--color-heading) — maximum contrast
  Level 2 (body):      var(--color-text) — readable
  Level 3 (secondary): var(--color-text-muted) — supporting
  NEVER use more than 3 text colors in a single section.

SECTION RHYTHM (strictly enforce):
  1. Section label (.section-label with line)
  2. Section heading (H2)
  3. Section subheading (optional, 1-2 sentences, muted)
  4. Content (grid/bento/split)
  Keep header block centered for feature/pricing/testimonial sections.
  Keep header left-aligned for split-layout sections.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPACING PHILOSOPHY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Sections breathe: always .section (96px) or .section--lg (128px)
• Sections alternate: var(--color-bg) and var(--color-bg-alt)
• Cards: gap of var(--sp-6) minimum, var(--sp-8) preferred
• Text inside cards: padding var(--sp-6) to var(--sp-8)
• Hero CTA buttons: margin-top var(--sp-8), gap var(--sp-4)
• AVOID: cramped gap: 8px or 12px on sections — it looks amateur

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INTERACTION PATTERNS (implement all of these)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. SCROLL REVEAL: Add IntersectionObserver in App.jsx useEffect:
   \`\`\`
   useEffect(() => {
     const obs = new IntersectionObserver(
       (entries) => entries.forEach(e => {
         if (e.isIntersecting) { e.target.classList.add('is-visible'); obs.unobserve(e.target); }
       }),
       { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
     );
     document.querySelectorAll('.reveal, .reveal-scale').forEach(el => obs.observe(el));
     return () => obs.disconnect();
   }, []);
   \`\`\`

2. CARD STAGGER: Apply reveal with delays on grid children:
   <div className="grid-3">
     <div className="card--feature reveal">...</div>
     <div className="card--feature reveal reveal-delay-1">...</div>
     <div className="card--feature reveal reveal-delay-2">...</div>
   </div>

3. HERO: Apply .animate-fade-up to title, subtitle with inline animationDelay style:
   <h1 className="hero__title animate-fade-up">...</h1>
   <p className="hero__sub animate-fade-up" style={{animationDelay:'120ms'}}>...</p>
   <div className="hero__actions animate-fade-up" style={{animationDelay:'240ms'}}>...</div>

4. SECTION HEADERS: Apply .reveal to h2 and .reveal.reveal-delay-1 to the subhead paragraph.

5. NAVBAR: Add scroll shadow on scroll. Use useState for shadow:
   const [scrolled, setScrolled] = useState(false);
   useEffect(() => {
     const fn = () => setScrolled(window.scrollY > 8);
     window.addEventListener('scroll', fn);
     return () => window.removeEventListener('scroll', fn);
   }, []);
   Apply: style={{ boxShadow: scrolled ? 'var(--shadow-md)' : 'none' }}

6. MOBILE MENU: Always implement a working mobile nav toggle with useState:
   const [menuOpen, setMenuOpen] = useState(false);
   Show/hide .mobile-menu div based on menuOpen state.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPONENT COMPOSITION PATTERNS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PREMIUM NAVBAR:
  <nav className="navbar" style={{ boxShadow: scrolled ? '...' : 'none' }}>
    <div className="navbar__inner">
      <a className="navbar__logo">Brand</a>
      <ul className="navbar__links"> 4–5 links </ul>
      <div className="navbar__actions">
        <a className="btn btn--ghost btn--sm">Sign in</a>
        <a className="btn btn--primary btn--sm">Get started →</a>
      </div>
      <button className="nav-toggle" onClick={toggle}>☰</button>
    </div>
    {menuOpen && <div className="mobile-menu">...</div>}
  </nav>

PREMIUM HERO (centered):
  <section className="hero gradient-hero">
    <div className="container">
      <div className="hero__eyebrow"><span className="badge badge--accent">✦ Tagline</span></div>
      <h1 className="hero__title animate-fade-up">
        The <span className="gradient-text">Specific Benefit</span> for Target Audience
      </h1>
      <p className="hero__sub animate-fade-up" style={{animationDelay:'120ms'}}>
        One or two sentences explaining the core value. Benefit-first. Specific.
      </p>
      <div className="hero__actions animate-fade-up" style={{animationDelay:'240ms'}}>
        <a className="btn btn--primary btn--lg btn--pill">Primary CTA →</a>
        <a className="btn btn--ghost btn--lg">Secondary CTA</a>
      </div>
      <div className="hero__preview animate-scale-in" style={{animationDelay:'400ms'}}>
        <div className="img-placeholder" style={{aspectRatio:'16/9'}}>
          [Meaningful SVG illustration of the product]
        </div>
      </div>
    </div>
  </section>

PREMIUM FEATURE CARD:
  <div className="card--feature reveal">
    <div className="icon-box">⚡</div>
    <h3 className="feature__title">Specific Feature Name</h3>
    <p className="feature__desc">
      Two specific sentences explaining the concrete benefit. 
      Mention a quantified result if possible.
    </p>
  </div>

PREMIUM PRICING CARD (featured):
  <div className="pricing-card pricing-card--featured" data-badge="Most Popular">
    <span className="label">Pro</span>
    <div className="pricing__amount">$29<span className="pricing__period">/mo</span></div>
    <p className="text-muted" style={{marginTop:'var(--sp-2)',fontSize:'var(--text-sm)'}}>
      Per seat, billed annually
    </p>
    <ul className="pricing__features">
      <li>Specific feature one</li>
      <li>Specific feature two</li>
      <li>Specific feature three</li>
      <li>Specific feature four</li>
      <li>Specific feature five</li>
    </ul>
    <a className="btn btn--primary" style={{marginTop:'var(--sp-6)',width:'100%'}}>Start free trial →</a>
  </div>

PREMIUM TESTIMONIAL:
  <div className="testimonial reveal">
    <div style={{color:'#F59E0B',marginBottom:'var(--sp-4)',fontSize:'var(--text-sm)'}}>★★★★★</div>
    <p className="testimonial__quote">
      "Specific outcome achieved. Specific number or timeframe. Why it mattered."
    </p>
    <div className="testimonial__author">
      <div className="testimonial__avatar">JD</div>
      <div>
        <div className="testimonial__name">Jane Doe</div>
        <div className="testimonial__role">Head of Engineering, Acme Corp</div>
      </div>
    </div>
  </div>

PREMIUM CTA SECTION:
  <section className="cta-section section">
    <div className="container--narrow" style={{textAlign:'center'}}>
      <span className="section-label">Get Started</span>
      <h2 className="reveal" style={{fontSize:'clamp(2rem,5vw,3.5rem)',marginBottom:'var(--sp-5)'}}>
        Ready to <span className="gradient-text">transform</span> how you work?
      </h2>
      <p className="text-muted reveal reveal-delay-1" style={{maxWidth:'480px',margin:'0 auto var(--sp-8)'}}>
        Join thousands of teams shipping faster. No credit card required.
      </p>
      <div className="hero__actions reveal reveal-delay-2">
        <a className="btn btn--primary btn--lg btn--pill">Start for free →</a>
        <a className="btn btn--ghost btn--lg">Talk to sales</a>
      </div>
    </div>
  </section>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUALITY GATES — REJECT if any of these exist
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "Lorem ipsum" anywhere
❌ Empty icon boxes (no emoji or symbol)
❌ Generic headlines ("Welcome to our website", "Our Features", "About Us")
❌ Random gradients not from the design system
❌ Section padding below 64px (var(--sp-16))
❌ More than 3 text hierarchy levels in one section
❌ Buttons without .btn base class
❌ Hard-coded pixel colors (#3B82F6 etc.) — use CSS vars
❌ Missing mobile menu toggle implementation
❌ Missing IntersectionObserver scroll animation setup
❌ Testimonials without a specific company name
❌ Pricing without 3 tiers and real prices
❌ Hero without a product visual or placeholder
❌ Footer with fewer than 3 link columns
❌ Cards with no hover effect
❌ Grids with only 1 or 2 items (minimum 3)
`;
