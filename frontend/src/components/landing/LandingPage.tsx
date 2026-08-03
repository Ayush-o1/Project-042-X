import React, { useEffect, useRef, useState } from 'react';
import {
  GitBranch,
  Network,
  BarChart2,
  FileCode,
  Search,
  Zap,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  FolderGit2,
  Clock,
  Shield,
  Layers,
  Cpu,
  GitCommit,
} from 'lucide-react';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { useShallow } from 'zustand/react/shallow';
import './LandingPage.css';

/* ── Intersection observer hook for scroll reveals ────────── */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

/* ── Animated SVG hero graph mockup ──────────────────────── */
const HeroGraphMockup: React.FC = () => (
  <div className="landing-hero-visual-frame">
    {/* Window chrome */}
    <div className="landing-hero-visual-titlebar">
      <div className="landing-hero-visual-dot" style={{ background: '#ff5f57' }} />
      <div className="landing-hero-visual-dot" style={{ background: '#ffbd2e' }} />
      <div className="landing-hero-visual-dot" style={{ background: '#28ca41' }} />
    </div>

    <div className="landing-hero-visual-content">
      {/* CSS-only animated SVG dependency graph */}
      <svg
        viewBox="0 0 800 400"
        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
        aria-hidden="true"
      >
        {/* Grid background */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
          </pattern>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="rgba(99,102,241,0.4)" />
          </marker>
          <marker id="arrow-dim" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="rgba(255,255,255,0.12)" />
          </marker>
        </defs>
        <rect width="800" height="400" fill="url(#grid)" />

        {/* Edges — drawn before nodes so nodes sit on top */}
        <line x1="400" y1="200" x2="200" y2="100" stroke="rgba(99,102,241,0.35)" strokeWidth="1.5" markerEnd="url(#arrow)" />
        <line x1="400" y1="200" x2="600" y2="100" stroke="rgba(99,102,241,0.35)" strokeWidth="1.5" markerEnd="url(#arrow)" />
        <line x1="400" y1="200" x2="580" y2="280" stroke="rgba(99,102,241,0.35)" strokeWidth="1.5" markerEnd="url(#arrow)" />
        <line x1="400" y1="200" x2="220" y2="280" stroke="rgba(99,102,241,0.35)" strokeWidth="1.5" markerEnd="url(#arrow)" />
        <line x1="200" y1="100" x2="80" y2="60" stroke="rgba(255,255,255,0.1)" strokeWidth="1" markerEnd="url(#arrow-dim)" />
        <line x1="600" y1="100" x2="720" y2="60" stroke="rgba(255,255,255,0.1)" strokeWidth="1" markerEnd="url(#arrow-dim)" />
        <line x1="580" y1="280" x2="700" y2="320" stroke="rgba(255,255,255,0.1)" strokeWidth="1" markerEnd="url(#arrow-dim)" />
        <line x1="220" y1="280" x2="100" y2="340" stroke="rgba(255,255,255,0.1)" strokeWidth="1" markerEnd="url(#arrow-dim)" />
        <line x1="220" y1="280" x2="320" y2="350" stroke="rgba(255,255,255,0.1)" strokeWidth="1" markerEnd="url(#arrow-dim)" />

        {/* Center node — glow ring */}
        <circle cx="400" cy="200" r="52" fill="rgba(99,102,241,0.06)" stroke="rgba(99,102,241,0.4)" strokeWidth="1">
          <animate attributeName="r" values="50;54;50" dur="3s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.4;0.6;0.4" dur="3s" repeatCount="indefinite" />
        </circle>

        {/* Center node */}
        <rect x="360" y="178" width="80" height="44" rx="8" fill="#191919" stroke="rgba(99,102,241,0.5)" strokeWidth="1.5" />
        <text x="400" y="196" textAnchor="middle" fill="#818cf8" fontSize="10" fontFamily="JetBrains Mono,monospace" fontWeight="600">App.tsx</text>
        <text x="400" y="210" textAnchor="middle" fill="rgba(129,140,248,0.6)" fontSize="9" fontFamily="JetBrains Mono,monospace">entry</text>

        {/* Top-left node */}
        <rect x="142" y="78" width="116" height="42" rx="8" fill="#161616" stroke="rgba(255,255,255,0.1)" strokeWidth="1">
          <animate attributeName="y" values="78;74;78" dur="4s" repeatCount="indefinite" />
        </rect>
        <text x="200" y="96" textAnchor="middle" fill="#f0f0f0" fontSize="10" fontFamily="JetBrains Mono,monospace">useStore.ts</text>
        <text x="200" y="109" textAnchor="middle" fill="rgba(240,240,240,0.4)" fontSize="9" fontFamily="JetBrains Mono,monospace">zustand</text>

        {/* Top-right node */}
        <rect x="534" y="78" width="132" height="42" rx="8" fill="#161616" stroke="rgba(255,255,255,0.1)" strokeWidth="1">
          <animate attributeName="y" values="78;82;78" dur="3.5s" repeatCount="indefinite" />
        </rect>
        <text x="600" y="96" textAnchor="middle" fill="#f0f0f0" fontSize="10" fontFamily="JetBrains Mono,monospace">AppShell.tsx</text>
        <text x="600" y="109" textAnchor="middle" fill="rgba(240,240,240,0.4)" fontSize="9" fontFamily="JetBrains Mono,monospace">layout</text>

        {/* Bottom-right node */}
        <rect x="510" y="258" width="140" height="42" rx="8" fill="rgba(52,211,153,0.06)" stroke="rgba(52,211,153,0.25)" strokeWidth="1">
          <animate attributeName="y" values="258;262;258" dur="5s" repeatCount="indefinite" />
        </rect>
        <text x="580" y="276" textAnchor="middle" fill="#34d399" fontSize="10" fontFamily="JetBrains Mono,monospace">insightsEngine</text>
        <text x="580" y="289" textAnchor="middle" fill="rgba(52,211,153,0.6)" fontSize="9" fontFamily="JetBrains Mono,monospace">healthy</text>

        {/* Bottom-left node */}
        <rect x="138" y="258" width="164" height="42" rx="8" fill="rgba(251,191,36,0.06)" stroke="rgba(251,191,36,0.25)" strokeWidth="1">
          <animate attributeName="y" values="258;254;258" dur="4.5s" repeatCount="indefinite" />
        </rect>
        <text x="220" y="276" textAnchor="middle" fill="#fbbf24" fontSize="10" fontFamily="JetBrains Mono,monospace">DependencyGraph</text>
        <text x="220" y="289" textAnchor="middle" fill="rgba(251,191,36,0.6)" fontSize="9" fontFamily="JetBrains Mono,monospace">fan-out: 12</text>

        {/* Leaf nodes */}
        <rect x="30" y="42" width="100" height="36" rx="6" fill="#111" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <text x="80" y="64" textAnchor="middle" fill="rgba(240,240,240,0.3)" fontSize="9" fontFamily="JetBrains Mono,monospace">client.ts</text>

        <rect x="668" y="42" width="104" height="36" rx="6" fill="#111" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <text x="720" y="64" textAnchor="middle" fill="rgba(240,240,240,0.3)" fontSize="9" fontFamily="JetBrains Mono,monospace">types/index.ts</text>

        <rect x="650" y="304" width="112" height="36" rx="6" fill="#111" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <text x="706" y="326" textAnchor="middle" fill="rgba(240,240,240,0.3)" fontSize="9" fontFamily="JetBrains Mono,monospace">sessionEngine</text>

        <rect x="40" y="322" width="112" height="36" rx="6" fill="#111" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <text x="96" y="344" textAnchor="middle" fill="rgba(240,240,240,0.3)" fontSize="9" fontFamily="JetBrains Mono,monospace">fuzzyMatch.ts</text>

        <rect x="250" y="340" width="120" height="36" rx="6" fill="#111" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <text x="310" y="362" textAnchor="middle" fill="rgba(240,240,240,0.3)" fontSize="9" fontFamily="JetBrains Mono,monospace">exportEngine.ts</text>

        {/* Health badge top-right */}
        <rect x="680" y="16" width="94" height="22" rx="11" fill="rgba(52,211,153,0.1)" stroke="rgba(52,211,153,0.2)" strokeWidth="1" />
        <text x="727" y="31" textAnchor="middle" fill="#34d399" fontSize="9" fontFamily="JetBrains Mono,monospace">● healthy</text>

        {/* Circular dep badge */}
        <rect x="20" y="380" width="130" height="18" rx="9" fill="rgba(248,113,113,0.08)" stroke="rgba(248,113,113,0.2)" strokeWidth="1" />
        <text x="85" y="392" textAnchor="middle" fill="#f87171" fontSize="9" fontFamily="JetBrains Mono,monospace">0 circular deps</text>
      </svg>
    </div>
  </div>
);

/* ── Feature cards data ───────────────────────────────────── */
const FEATURES = [
  {
    icon: <Network size={20} />,
    title: 'Architecture Graph',
    description: 'Treemap overview and an interactive focus canvas. Select any file to explore its full dependency neighborhood at 1–4 hops, without rendering the entire graph.',
    iconBg: 'rgba(99,102,241,0.1)',
    iconColor: '#818cf8',
    iconBorder: 'rgba(99,102,241,0.2)',
  },
  {
    icon: <GitBranch size={20} />,
    title: 'Git Timeline',
    description: 'Virtualized commit list with branch-lane gutter, author filtering, fuzzy search, and an activity histogram. No commit limit — works on histories with 20,000+ commits.',
    iconBg: 'rgba(52,211,153,0.08)',
    iconColor: '#34d399',
    iconBorder: 'rgba(52,211,153,0.2)',
  },
  {
    icon: <BarChart2 size={20} />,
    title: 'Insights Engine',
    description: 'Deterministic metrics: Tarjan\'s SCC cycle detection, orphaned files, longest dependency chains, Martin instability, and per-module health scores.',
    iconBg: 'rgba(251,191,36,0.08)',
    iconColor: '#fbbf24',
    iconBorder: 'rgba(251,191,36,0.2)',
  },
  {
    icon: <FileCode size={20} />,
    title: 'Integrated Code Viewer',
    description: 'Jump from any graph node to syntax-highlighted source. A Related Files panel lists every file\'s imports and importers as clickable links.',
    iconBg: 'rgba(56,189,248,0.08)',
    iconColor: '#38bdf8',
    iconBorder: 'rgba(56,189,248,0.2)',
  },
  {
    icon: <Search size={20} />,
    title: 'Fuzzy Command Palette',
    description: 'Cmd+K fuzzy-matches every file by name or path. Non-contiguous queries work. Filename matches rank above path matches. Recent files appear first when idle.',
    iconBg: 'rgba(167,139,250,0.08)',
    iconColor: '#a78bfa',
    iconBorder: 'rgba(167,139,250,0.2)',
  },
  {
    icon: <Zap size={20} />,
    title: 'Fast Analysis',
    description: 'SWC (Rust-based) parses ASTs significantly faster than JS parsers. Graph layout runs in a dedicated Web Worker. Git Timeline is fully virtualized.',
    iconBg: 'rgba(99,102,241,0.08)',
    iconColor: '#6366f1',
    iconBorder: 'rgba(99,102,241,0.2)',
  },
] as const;

/* ── How-it-works steps ──────────────────────────────────── */
const HOW_STEPS = [
  {
    num: '01',
    title: 'Point at a repository',
    desc: 'Paste a local path or a public GitHub URL. The analyzer accepts both — no setup, no config, no installation beyond Node.js.',
  },
  {
    num: '02',
    title: 'Deep analysis runs',
    desc: 'Every file is parsed into an AST. Imports and exports are extracted to build the dependency graph. Git history is read in full, in parallel.',
  },
  {
    num: '03',
    title: 'Explore the architecture',
    desc: 'Navigate the treemap, focus any file in the dependency canvas, browse the full commit history, or read the Insights dashboard.',
  },
  {
    num: '04',
    title: 'Understand the codebase',
    desc: 'Export a PDF or Markdown architecture report. Save the session to IndexedDB and restore it instantly next time.',
  },
] as const;

/* ── FAQ data ─────────────────────────────────────────────── */
const FAQ = [
  {
    q: 'Does it work with private repositories?',
    a: 'Yes — run 042-X locally and point it at any path on your filesystem. The local backend never connects to GitHub at all; it reads files directly. The public demo deployment only accepts public GitHub URLs.',
  },
  {
    q: 'What languages and file types are supported?',
    a: 'The AST engine supports TypeScript and JavaScript (ESM import/export syntax). Other file types — JSON, Markdown, CSS, etc. — are indexed and browsable in the Code Viewer but do not produce graph edges.',
  },
  {
    q: 'How large a repository can it handle?',
    a: 'The architecture graph renders only the focused neighborhood (not the whole graph), so there\'s no practical ceiling. The Git Timeline is virtualized. The only hard limit is 5 MB per individual file, which is skipped.',
  },
  {
    q: 'Is my code sent to any external service?',
    a: 'Never. Everything runs locally: the Node.js backend and the React frontend are both on your machine. No telemetry, no analytics, no third-party data processors.',
  },
  {
    q: 'Can I export the analysis results?',
    a: 'Yes — PDF, Markdown, and JSON reports; PNG and SVG captures of the dependency graph. Export from the menu in the header, or use Cmd+Shift+E for PDF.',
  },
] as const;

/* ── Tech stack data ──────────────────────────────────────── */
const FRONTEND_STACK = [
  { label: 'React 19', color: '#61dafb' },
  { label: 'TypeScript', color: '#3178c6' },
  { label: 'Vite', color: '#646cff' },
  { label: 'Zustand', color: '#f97316' },
  { label: 'React Flow', color: '#818cf8' },
  { label: 'Dagre', color: '#34d399' },
  { label: 'Lucide', color: '#9b9ba8' },
];

const BACKEND_STACK = [
  { label: 'Node.js', color: '#68a063' },
  { label: 'Express 5', color: '#9b9ba8' },
  { label: '@swc/core', color: '#f97316' },
  { label: 'simple-git', color: '#f87171' },
  { label: 'Zod', color: '#818cf8' },
  { label: 'TypeScript', color: '#3178c6' },
];

/* ── Landing page ─────────────────────────────────────────── */
export const LandingPage: React.FC = () => {
  const { enterApp } = useRepositoryStore(
    useShallow(s => ({ enterApp: s.enterApp })),
  );

  const [navScrolled, setNavScrolled] = useState(false);

  // Nav scroll effect
  useEffect(() => {
    const handler = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Section reveal hooks
  const problemRef = useReveal();
  const featuresRef = useReveal();
  const howRef = useReveal();
  const stackRef = useReveal();
  const faqRef = useReveal();
  const ctaRef = useReveal();

  return (
    <div className="landing">
      {/* ── Navigation ─────────────────────────────────────── */}
      <nav className={`landing-nav${navScrolled ? ' scrolled' : ''}`} aria-label="Main navigation">
        <div className="landing-nav-inner">
          {/* Logo */}
          <button
            type="button"
            className="landing-nav-logo"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="042-X — back to top"
          >
            <div className="landing-nav-logo-mark">
              <FolderGit2 size={17} />
            </div>
            <span className="landing-nav-wordmark">042-X</span>
          </button>

          {/* Actions */}
          <div className="landing-nav-actions">
            <a
              href="https://github.com/ayushpai/project-042-x"
              target="_blank"
              rel="noopener noreferrer"
              className="landing-nav-link"
              aria-label="View source on GitHub"
            >
              <ExternalLink size={14} />
              GitHub
            </a>
            <button
              id="nav-cta"
              type="button"
              className="landing-nav-cta"
              onClick={() => enterApp()}
              aria-label="Open the analyzer"
            >
              Analyze Repository
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="landing-hero landing-section" aria-label="Hero">
        <div className="landing-hero-content">
          {/* Badge */}
          <div className="landing-hero-badge" role="note">
            <span className="landing-hero-badge-dot" aria-hidden="true" />
            Repository Intelligence Engine
          </div>

          {/* Headline */}
          <h1 className="landing-hero-headline">
            Understand any{' '}
            <span className="landing-hero-headline-accent">codebase</span>
            <br />
            in seconds
          </h1>

          {/* Sub-headline */}
          <p className="landing-hero-sub">
            Point 042-X at any repository. Get a full architecture graph, Git timeline,
            dependency analysis, and health metrics — instantly, locally, with no data leaving your machine.
          </p>

          {/* CTAs */}
          <div className="landing-hero-ctas">
            <button
              id="hero-cta-primary"
              type="button"
              className="landing-hero-primary"
              onClick={() => enterApp()}
              aria-label="Open the repository analyzer"
            >
              Analyze Repository
              <ArrowRight size={16} className="landing-hero-primary-arrow" />
            </button>
            <a
              id="hero-cta-secondary"
              href="https://github.com/ayushpai/project-042-x"
              target="_blank"
              rel="noopener noreferrer"
              className="landing-hero-secondary"
              aria-label="View source on GitHub"
            >
              <ExternalLink size={16} />
              View Source
            </a>
          </div>
        </div>

        {/* Hero visual */}
        <div className="landing-hero-visual" aria-hidden="true">
          <HeroGraphMockup />
        </div>
      </section>

      {/* ── Tech strip ─────────────────────────────────────── */}
      <div className="landing-tech-strip landing-section" aria-label="Technologies used">
        <div className="landing-tech-strip-inner">
          <span className="landing-tech-strip-label">Built on</span>
          <div className="landing-tech-strip-divider" aria-hidden="true" />
          <div className="landing-tech-list">
            {[
              { label: 'React 19', color: '#61dafb' },
              { label: 'SWC / Rust', color: '#f97316' },
              { label: 'TypeScript', color: '#3178c6' },
              { label: 'Node.js', color: '#68a063' },
              { label: 'React Flow', color: '#818cf8' },
              { label: 'Dagre', color: '#34d399' },
            ].map(t => (
              <div key={t.label} className="landing-tech-item">
                <span className="landing-tech-dot" style={{ background: t.color }} aria-hidden="true" />
                {t.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Problem section ────────────────────────────────── */}
      <section
        ref={problemRef.ref as React.RefObject<HTMLElement>}
        className={`landing-problem landing-section landing-reveal${problemRef.visible ? ' visible' : ''}`}
        aria-label="Problem"
      >
        <div className="landing-container">
          <div className="landing-problem-header">
            <div className="landing-section-eyebrow">
              <Shield size={12} aria-hidden="true" />
              The Problem
            </div>
            <h2 className="landing-section-title">
              Unfamiliar codebases are hard to read
            </h2>
            <p className="landing-section-sub">
              Manual import tracing, fragmented documentation, and third-party SaaS tools that require uploading your code.
              There's a better way.
            </p>
          </div>

          <div className={`landing-problem-grid landing-reveal-stagger${problemRef.visible ? ' visible' : ''}`}>
            <div className="landing-problem-card">
              <div className="landing-problem-icon" aria-hidden="true">
                <Layers size={18} />
              </div>
              <h3>Invisible dependencies</h3>
              <p>Import chains are invisible without tooling. Circular dependencies silently bloat your bundle and break tree-shaking — you don't know they exist until production breaks.</p>
            </div>
            <div className="landing-problem-card">
              <div className="landing-problem-icon" aria-hidden="true">
                <Clock size={18} />
              </div>
              <h3>Git history is opaque</h3>
              <p>Understanding why a file changed — and who's been touching it most — requires piecing together <code>git log</code> and <code>git blame</code> by hand, across hundreds of commits.</p>
            </div>
            <div className="landing-problem-card">
              <div className="landing-problem-icon" aria-hidden="true">
                <Shield size={18} />
              </div>
              <h3>SaaS tools see your code</h3>
              <p>Existing analysis tools require uploading your source. Every file leaves your machine, passes through someone else's infrastructure, and hits their rate limits and privacy policies.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features section ───────────────────────────────── */}
      <section
        ref={featuresRef.ref as React.RefObject<HTMLElement>}
        className={`landing-features landing-section${featuresRef.visible ? '' : ''}`}
        aria-label="Features"
      >
        <div className="landing-container">
          <div className={`landing-features-header landing-reveal${featuresRef.visible ? ' visible' : ''}`}>
            <div className="landing-section-eyebrow">
              <Cpu size={12} aria-hidden="true" />
              Features
            </div>
            <h2 className="landing-section-title">
              Everything you need to read a codebase
            </h2>
            <p className="landing-section-sub">
              Every view is interactive. Every metric is deterministic. Everything runs locally.
            </p>
          </div>

          <div className={`landing-features-grid landing-reveal-stagger${featuresRef.visible ? ' visible' : ''}`}>
            {FEATURES.map(f => (
              <div key={f.title} className="landing-feature-card">
                <div
                  className="landing-feature-icon"
                  aria-hidden="true"
                  style={{
                    background: f.iconBg,
                    border: `1px solid ${f.iconBorder}`,
                    color: f.iconColor,
                  }}
                >
                  {f.icon}
                </div>
                <h3>{f.title}</h3>
                <p>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────── */}
      <section
        ref={howRef.ref as React.RefObject<HTMLElement>}
        className={`landing-how landing-section landing-reveal${howRef.visible ? ' visible' : ''}`}
        aria-label="How it works"
      >
        <div className="landing-container">
          <div className="landing-how-header">
            <div className="landing-section-eyebrow">
              <GitCommit size={12} aria-hidden="true" />
              How it works
            </div>
            <h2 className="landing-section-title">From URL to insight in one step</h2>
          </div>

          <div className="landing-how-steps">
            {HOW_STEPS.map(step => (
              <div key={step.num} className="landing-how-step">
                <div className="landing-how-step-number" aria-hidden="true">{step.num}</div>
                <div className="landing-how-step-text">
                  <div className="landing-how-step-title">{step.title}</div>
                  <p className="landing-how-step-desc">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech stack section ─────────────────────────────── */}
      <section
        ref={stackRef.ref as React.RefObject<HTMLElement>}
        className={`landing-stack landing-section landing-reveal${stackRef.visible ? ' visible' : ''}`}
        aria-label="Technology stack"
      >
        <div className="landing-container">
          <div className="landing-stack-header">
            <div className="landing-section-eyebrow">
              <Cpu size={12} aria-hidden="true" />
              Technology
            </div>
            <h2 className="landing-section-title">Open, transparent, fast</h2>
            <p className="landing-section-sub">
              Built on proven, composable open-source tools. No black-box SaaS, no vendor lock-in.
            </p>
          </div>

          <div className="landing-stack-groups">
            <div className="landing-stack-group">
              <div className="landing-stack-group-label">Frontend</div>
              <div className="landing-stack-pills">
                {FRONTEND_STACK.map(t => (
                  <span key={t.label} className="landing-stack-pill">
                    <span className="landing-stack-pill-dot" style={{ background: t.color }} aria-hidden="true" />
                    {t.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="landing-stack-group">
              <div className="landing-stack-group-label">Backend</div>
              <div className="landing-stack-pills">
                {BACKEND_STACK.map(t => (
                  <span key={t.label} className="landing-stack-pill">
                    <span className="landing-stack-pill-dot" style={{ background: t.color }} aria-hidden="true" />
                    {t.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────── */}
      <section
        ref={faqRef.ref as React.RefObject<HTMLElement>}
        className={`landing-faq landing-section landing-reveal${faqRef.visible ? ' visible' : ''}`}
        aria-label="Frequently asked questions"
      >
        <div className="landing-container">
          <div className="landing-faq-header">
            <div className="landing-section-eyebrow">FAQ</div>
            <h2 className="landing-section-title">Common questions</h2>
          </div>

          <div className="landing-faq-list" role="list">
            {FAQ.map(item => (
              <details key={item.q} className="landing-faq-item" role="listitem">
                <summary className="landing-faq-summary">
                  <span>{item.q}</span>
                  <ChevronDown size={16} className="landing-faq-chevron" aria-hidden="true" />
                </summary>
                <div className="landing-faq-body">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────── */}
      <section
        ref={ctaRef.ref as React.RefObject<HTMLElement>}
        className={`landing-cta-section landing-section landing-reveal${ctaRef.visible ? ' visible' : ''}`}
        aria-label="Get started"
      >
        <div className="landing-container">
          <div className="landing-cta-box">
            <h2 className="landing-cta-title">
              Start understanding your codebase
            </h2>
            <p className="landing-cta-sub">
              Paste a GitHub URL or a local path. No account. No upload. No waiting.
            </p>
            <div className="landing-cta-buttons">
              <button
                id="footer-cta-primary"
                type="button"
                className="landing-hero-primary"
                onClick={() => enterApp()}
                aria-label="Open the repository analyzer"
              >
                Analyze Repository
                <ArrowRight size={16} className="landing-hero-primary-arrow" />
              </button>
              <a
                id="footer-cta-secondary"
                href="https://github.com/ayushpai/project-042-x"
                target="_blank"
                rel="noopener noreferrer"
                className="landing-hero-secondary"
                aria-label="View source code on GitHub"
              >
                <ExternalLink size={16} />
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="landing-footer landing-section" aria-label="Site footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <FolderGit2 size={14} style={{ color: 'var(--accent)' }} aria-hidden="true" />
            <span className="landing-footer-wordmark">042-X</span>
          </div>

          <div className="landing-footer-links">
            <a
              href="https://github.com/ayushpai/project-042-x"
              target="_blank"
              rel="noopener noreferrer"
              className="landing-footer-link"
              aria-label="GitHub repository"
            >
              GitHub
            </a>
            <a
              href="https://github.com/ayushpai/project-042-x/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="landing-footer-link"
              aria-label="MIT License"
            >
              MIT License
            </a>
          </div>

          <p className="landing-footer-copy">
            Repository Intelligence Engine · Local-first · Open source
          </p>
        </div>
      </footer>
    </div>
  );
};
