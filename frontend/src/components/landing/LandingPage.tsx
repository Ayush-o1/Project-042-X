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
  Shield,
  Layers,
  Clock,
  Cpu,
  GitCommit,
  Terminal,
} from 'lucide-react';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { useShallow } from 'zustand/react/shallow';
import './LandingPage.css';

const GITHUB_REPO = 'https://github.com/Ayush-o1/Project-042-X';

function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

const HeroGraphMockup: React.FC = () => (
  <div className="lp-mockup-frame">
    <div className="lp-mockup-titlebar">
      <div className="lp-mockup-dots">
        <span className="lp-mockup-dot lp-mockup-dot--red" />
        <span className="lp-mockup-dot lp-mockup-dot--yellow" />
        <span className="lp-mockup-dot lp-mockup-dot--green" />
      </div>
      <span className="lp-mockup-title">042-X — Architecture Graph</span>
      <span className="lp-mockup-badge">● healthy</span>
    </div>
    <div className="lp-mockup-body">
      <svg viewBox="0 0 760 380" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} aria-hidden="true">
        <defs>
          <pattern id="lp-dots" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.8" fill="rgba(255,255,255,0.04)" />
          </pattern>
          <marker id="lp-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L0,7 L7,3.5 z" fill="rgba(99,102,241,0.4)" />
          </marker>
          <marker id="lp-arrow-dim" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L0,7 L7,3.5 z" fill="rgba(255,255,255,0.08)" />
          </marker>
        </defs>
        <rect width="760" height="380" fill="url(#lp-dots)" />
        <line x1="380" y1="190" x2="190" y2="95" stroke="rgba(99,102,241,0.3)" strokeWidth="1.5" markerEnd="url(#lp-arrow)" />
        <line x1="380" y1="190" x2="570" y2="95" stroke="rgba(99,102,241,0.3)" strokeWidth="1.5" markerEnd="url(#lp-arrow)" />
        <line x1="380" y1="190" x2="560" y2="268" stroke="rgba(99,102,241,0.3)" strokeWidth="1.5" markerEnd="url(#lp-arrow)" />
        <line x1="380" y1="190" x2="200" y2="268" stroke="rgba(99,102,241,0.3)" strokeWidth="1.5" markerEnd="url(#lp-arrow)" />
        <line x1="190" y1="95" x2="70" y2="52" stroke="rgba(255,255,255,0.07)" strokeWidth="1" markerEnd="url(#lp-arrow-dim)" />
        <line x1="570" y1="95" x2="690" y2="52" stroke="rgba(255,255,255,0.07)" strokeWidth="1" markerEnd="url(#lp-arrow-dim)" />
        <line x1="560" y1="268" x2="680" y2="310" stroke="rgba(255,255,255,0.07)" strokeWidth="1" markerEnd="url(#lp-arrow-dim)" />
        <line x1="200" y1="268" x2="80" y2="328" stroke="rgba(255,255,255,0.07)" strokeWidth="1" markerEnd="url(#lp-arrow-dim)" />
        <line x1="200" y1="268" x2="308" y2="338" stroke="rgba(255,255,255,0.07)" strokeWidth="1" markerEnd="url(#lp-arrow-dim)" />
        <circle cx="380" cy="190" r="52" fill="rgba(99,102,241,0.04)" stroke="rgba(99,102,241,0.35)" strokeWidth="1">
          <animate attributeName="r" values="50;54;50" dur="3.5s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.35;0.55;0.35" dur="3.5s" repeatCount="indefinite" />
        </circle>
        <rect x="342" y="168" width="76" height="44" rx="8" fill="#141414" stroke="rgba(99,102,241,0.55)" strokeWidth="1.5" />
        <text x="380" y="187" textAnchor="middle" fill="#818cf8" fontSize="9.5" fontFamily="JetBrains Mono,monospace" fontWeight="600">App.tsx</text>
        <text x="380" y="201" textAnchor="middle" fill="rgba(129,140,248,0.5)" fontSize="8.5" fontFamily="JetBrains Mono,monospace">entry · 42 deps</text>
        <rect x="132" y="73" width="116" height="42" rx="8" fill="#0f0f0f" stroke="rgba(255,255,255,0.09)" strokeWidth="1">
          <animate attributeName="y" values="73;69;73" dur="4.2s" repeatCount="indefinite" />
        </rect>
        <text x="190" y="91" textAnchor="middle" fill="#eeeeee" fontSize="9.5" fontFamily="JetBrains Mono,monospace">useStore.ts</text>
        <text x="190" y="105" textAnchor="middle" fill="rgba(238,238,238,0.35)" fontSize="8.5" fontFamily="JetBrains Mono,monospace">zustand</text>
        <rect x="510" y="73" width="120" height="42" rx="8" fill="#0f0f0f" stroke="rgba(255,255,255,0.09)" strokeWidth="1">
          <animate attributeName="y" values="73;77;73" dur="3.8s" repeatCount="indefinite" />
        </rect>
        <text x="570" y="91" textAnchor="middle" fill="#eeeeee" fontSize="9.5" fontFamily="JetBrains Mono,monospace">AppShell.tsx</text>
        <text x="570" y="105" textAnchor="middle" fill="rgba(238,238,238,0.35)" fontSize="8.5" fontFamily="JetBrains Mono,monospace">layout</text>
        <rect x="488" y="248" width="144" height="40" rx="8" fill="rgba(52,211,153,0.05)" stroke="rgba(52,211,153,0.22)" strokeWidth="1">
          <animate attributeName="y" values="248;252;248" dur="5.1s" repeatCount="indefinite" />
        </rect>
        <text x="560" y="265" textAnchor="middle" fill="#34d399" fontSize="9.5" fontFamily="JetBrains Mono,monospace">insightsEngine</text>
        <text x="560" y="279" textAnchor="middle" fill="rgba(52,211,153,0.55)" fontSize="8.5" fontFamily="JetBrains Mono,monospace">healthy · 0 cycles</text>
        <rect x="118" y="248" width="164" height="40" rx="8" fill="rgba(251,191,36,0.05)" stroke="rgba(251,191,36,0.22)" strokeWidth="1">
          <animate attributeName="y" values="248;244;248" dur="4.6s" repeatCount="indefinite" />
        </rect>
        <text x="200" y="265" textAnchor="middle" fill="#fbbf24" fontSize="9.5" fontFamily="JetBrains Mono,monospace">DependencyGraph</text>
        <text x="200" y="279" textAnchor="middle" fill="rgba(251,191,36,0.55)" fontSize="8.5" fontFamily="JetBrains Mono,monospace">fan-out: 12</text>
        <rect x="28" y="34" width="88" height="34" rx="6" fill="#0a0a0a" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        <text x="72" y="54" textAnchor="middle" fill="rgba(238,238,238,0.25)" fontSize="8.5" fontFamily="JetBrains Mono,monospace">client.ts</text>
        <rect x="644" y="34" width="96" height="34" rx="6" fill="#0a0a0a" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        <text x="692" y="54" textAnchor="middle" fill="rgba(238,238,238,0.25)" fontSize="8.5" fontFamily="JetBrains Mono,monospace">types/index.ts</text>
        <rect x="638" y="294" width="104" height="34" rx="6" fill="#0a0a0a" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        <text x="690" y="314" textAnchor="middle" fill="rgba(238,238,238,0.25)" fontSize="8.5" fontFamily="JetBrains Mono,monospace">sessionEngine</text>
        <rect x="34" y="310" width="102" height="34" rx="6" fill="#0a0a0a" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        <text x="85" y="330" textAnchor="middle" fill="rgba(238,238,238,0.25)" fontSize="8.5" fontFamily="JetBrains Mono,monospace">fuzzyMatch.ts</text>
        <rect x="242" y="322" width="116" height="34" rx="6" fill="#0a0a0a" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        <text x="300" y="342" textAnchor="middle" fill="rgba(238,238,238,0.25)" fontSize="8.5" fontFamily="JetBrains Mono,monospace">exportEngine.ts</text>
        <rect x="0" y="360" width="760" height="20" fill="rgba(0,0,0,0.3)" />
        <text x="12" y="373" fill="rgba(238,238,238,0.3)" fontSize="8" fontFamily="JetBrains Mono,monospace">42 files · 186 edges · 0 cycles · parsed in 340ms</text>
        <circle cx="738" cy="370" r="3.5" fill="#34d399" opacity="0.8" />
        <text x="748" y="373.5" fill="rgba(52,211,153,0.7)" fontSize="7.5" fontFamily="JetBrains Mono,monospace">live</text>
      </svg>
    </div>
  </div>
);

const TerminalMini: React.FC = () => (
  <div className="lp-bento-visual lp-bento-visual--terminal">
    <div className="lp-bento-terminal-line">
      <span className="lp-bento-terminal-prompt">$</span>
      <span className="lp-bento-terminal-cmd"> 042-x analyze ./my-project</span>
    </div>
    <div className="lp-bento-terminal-line lp-bento-terminal-line--dim">
      <span>  Parsing 847 files with SWC…</span>
    </div>
    <div className="lp-bento-terminal-line lp-bento-terminal-line--dim">
      <span>  Reading git history (24,891 commits)…</span>
    </div>
    <div className="lp-bento-terminal-line">
      <span className="lp-bento-terminal-success">✓</span>
      <span className="lp-bento-terminal-success"> Done in 1.2s</span>
    </div>
  </div>
);

const GraphMini: React.FC = () => (
  <div className="lp-bento-visual lp-bento-visual--graph">
    <svg viewBox="0 0 200 100" aria-hidden="true" style={{ width: '100%', height: '100%' }}>
      <defs>
        <marker id="bm-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <path d="M0,0 L0,5 L5,2.5 z" fill="rgba(99,102,241,0.45)" />
        </marker>
      </defs>
      <line x1="100" y1="50" x2="50" y2="25" stroke="rgba(99,102,241,0.3)" strokeWidth="1" markerEnd="url(#bm-arrow)" />
      <line x1="100" y1="50" x2="150" y2="25" stroke="rgba(99,102,241,0.3)" strokeWidth="1" markerEnd="url(#bm-arrow)" />
      <line x1="100" y1="50" x2="140" y2="75" stroke="rgba(99,102,241,0.3)" strokeWidth="1" markerEnd="url(#bm-arrow)" />
      <line x1="100" y1="50" x2="60" y2="75" stroke="rgba(99,102,241,0.3)" strokeWidth="1" markerEnd="url(#bm-arrow)" />
      <circle cx="100" cy="50" r="14" fill="rgba(99,102,241,0.08)" stroke="rgba(99,102,241,0.45)" strokeWidth="1">
        <animate attributeName="r" values="13;15;13" dur="3s" repeatCount="indefinite" />
      </circle>
      <rect x="27" y="14" width="46" height="22" rx="5" fill="#111" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      <rect x="127" y="14" width="46" height="22" rx="5" fill="#111" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      <rect x="115" y="64" width="46" height="22" rx="5" fill="rgba(52,211,153,0.05)" stroke="rgba(52,211,153,0.2)" strokeWidth="1" />
      <rect x="39" y="64" width="46" height="22" rx="5" fill="rgba(251,191,36,0.05)" stroke="rgba(251,191,36,0.2)" strokeWidth="1" />
      <text x="100" y="54" textAnchor="middle" fill="#818cf8" fontSize="7" fontFamily="JetBrains Mono,monospace">root</text>
    </svg>
  </div>
);

const GitMini: React.FC = () => (
  <div className="lp-bento-visual lp-bento-visual--git">
    {[
      { hash: 'a3f8c1', msg: 'feat: add cycle detection', time: '2h', color: '#818cf8' },
      { hash: 'b29e4d', msg: 'fix: edge rendering bug', time: '1d', color: '#34d399' },
      { hash: 'c10f7a', msg: 'perf: lazy load panels', time: '3d', color: '#fbbf24' },
    ].map((c, i) => (
      <div key={i} className="lp-bento-git-row">
        <span className="lp-bento-git-dot" style={{ background: c.color }} />
        <span className="lp-bento-git-hash">{c.hash}</span>
        <span className="lp-bento-git-msg">{c.msg}</span>
        <span className="lp-bento-git-time">{c.time}</span>
      </div>
    ))}
  </div>
);

const InsightsMini: React.FC = () => (
  <div className="lp-bento-visual lp-bento-visual--insights">
    {[
      { label: 'Architecture Score', value: '94', color: '#34d399' },
      { label: 'Circular Deps', value: '0', color: '#34d399' },
      { label: 'Orphaned Files', value: '3', color: '#fbbf24' },
      { label: 'Max Fan-out', value: '12', color: '#818cf8' },
    ].map((m, i) => (
      <div key={i} className="lp-bento-metric">
        <span className="lp-bento-metric-label">{m.label}</span>
        <span className="lp-bento-metric-value" style={{ color: m.color }}>{m.value}</span>
      </div>
    ))}
  </div>
);

const CodeMini: React.FC = () => (
  <div className="lp-bento-visual lp-bento-visual--code">
    <div className="lp-bento-code-line"><span className="lp-bento-code-kw">import</span><span className="lp-bento-code-str">{' { useStore } '}</span><span className="lp-bento-code-kw">from</span><span className="lp-bento-code-str"> './store'</span></div>
    <div className="lp-bento-code-line"><span className="lp-bento-code-kw">import</span><span className="lp-bento-code-str">{' { Graph } '}</span><span className="lp-bento-code-kw">from</span><span className="lp-bento-code-str"> './graph'</span></div>
    <div className="lp-bento-code-line lp-bento-code-line--dim"></div>
    <div className="lp-bento-code-line"><span className="lp-bento-code-kw">export </span><span className="lp-bento-code-fn">function</span><span className="lp-bento-code-text"> App() {'{'}</span></div>
    <div className="lp-bento-code-line lp-bento-code-line--indent"><span className="lp-bento-code-kw">return</span><span className="lp-bento-code-text"> &lt;</span><span className="lp-bento-code-tag">Graph</span><span className="lp-bento-code-text"> /&gt;</span></div>
    <div className="lp-bento-code-line"><span className="lp-bento-code-text">{'}'}</span></div>
  </div>
);

const PaletteMini: React.FC = () => (
  <div className="lp-bento-visual lp-bento-visual--palette">
    <div className="lp-bento-palette-search">
      <Search size={11} />
      <span>DependencyGraph.tsx</span>
    </div>
    {['DependencyGraph.tsx', 'insightsEngine.ts', 'useStore.ts'].map((f, i) => (
      <div key={i} className={`lp-bento-palette-item${i === 0 ? ' lp-bento-palette-item--active' : ''}`}>
        <FileCode size={11} />
        <span>{f}</span>
      </div>
    ))}
  </div>
);

const BENTO = [
  {
    id: 'graph', icon: <Network size={16} />, title: 'Architecture Graph',
    description: 'Treemap overview and interactive focus canvas. Select any file to explore its full dependency neighborhood at 1–4 hops.',
    iconColor: '#818cf8', accentBorder: 'rgba(99,102,241,0.15)', visual: <GraphMini />, wide: true,
  },
  {
    id: 'fast', icon: <Zap size={16} />, title: 'Fast Analysis',
    description: 'SWC (Rust) parses ASTs significantly faster than JS parsers. Graph layout runs in a dedicated Web Worker.',
    iconColor: '#6366f1', accentBorder: 'rgba(99,102,241,0.1)', visual: <TerminalMini />, wide: false,
  },
  {
    id: 'git', icon: <GitBranch size={16} />, title: 'Git Timeline',
    description: 'Virtualized commit list with branch-lane gutter, author filtering, fuzzy search, and an activity histogram.',
    iconColor: '#34d399', accentBorder: 'rgba(52,211,153,0.12)', visual: <GitMini />, wide: false,
  },
  {
    id: 'code', icon: <FileCode size={16} />, title: 'Integrated Code Viewer',
    description: 'Jump from any graph node to syntax-highlighted source. A Related Files panel lists every import and importer.',
    iconColor: '#38bdf8', accentBorder: 'rgba(56,189,248,0.12)', visual: <CodeMini />, wide: false,
  },
  {
    id: 'palette', icon: <Search size={16} />, title: 'Command Palette',
    description: 'Cmd+K fuzzy-matches every file by name or path. Non-contiguous queries work. Recent files appear first.',
    iconColor: '#a78bfa', accentBorder: 'rgba(167,139,250,0.12)', visual: <PaletteMini />, wide: false,
  },
  {
    id: 'insights', icon: <BarChart2 size={16} />, title: 'Insights Engine',
    description: "Deterministic metrics: Tarjan's SCC cycle detection, orphaned files, longest dependency chains, and per-module health scores.",
    iconColor: '#fbbf24', accentBorder: 'rgba(251,191,36,0.12)', visual: <InsightsMini />, wide: true,
  },
] as const;

const HOW_STEPS = [
  { num: '01', title: 'Point at a repository', desc: 'Paste a local path or a public GitHub URL. No setup, no config, no installation beyond Node.js.' },
  { num: '02', title: 'Deep analysis runs', desc: 'Every file is parsed into an AST. Imports and exports are extracted to build the dependency graph. Git history is read in full.' },
  { num: '03', title: 'Explore the architecture', desc: 'Navigate the treemap, focus any file in the dependency canvas, browse commit history, or read the Insights dashboard.' },
  { num: '04', title: 'Understand the codebase', desc: 'Export a PDF or Markdown architecture report. Save the session to IndexedDB and restore it instantly next time.' },
] as const;

const FAQ = [
  { q: 'Does it work with private repositories?', a: 'Yes — run 042-X locally and point it at any path on your filesystem. The local backend never connects to GitHub. The public demo only accepts public GitHub URLs.' },
  { q: 'What languages and file types are supported?', a: 'The AST engine supports TypeScript and JavaScript (ESM import/export syntax). Other file types — JSON, Markdown, CSS — are indexed and browsable in the Code Viewer but do not produce graph edges.' },
  { q: 'How large a repository can it handle?', a: "The architecture graph renders only the focused neighborhood, not the whole graph, so there's no practical ceiling. The Git Timeline is virtualized. The only hard limit is 5 MB per individual file, which is skipped." },
  { q: 'Is my code sent to any external service?', a: 'Never. Everything runs locally: the Node.js backend and the React frontend are both on your machine. No telemetry, no analytics, no third-party data processors.' },
  { q: 'Can I export the analysis results?', a: 'Yes — PDF, Markdown, and JSON reports; PNG and SVG captures of the dependency graph. Export from the header menu, or use Cmd+Shift+E for PDF.' },
] as const;

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

const FaqItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`lp-faq-item${open ? ' open' : ''}`}>
      <button type="button" className="lp-faq-btn" onClick={() => setOpen(v => !v)} aria-expanded={open}>
        <span>{q}</span>
        <ChevronDown size={15} className="lp-faq-chevron" aria-hidden="true" />
      </button>
      <div className="lp-faq-body" style={{ maxHeight: open ? '300px' : '0' }}>
        <div className="lp-faq-body-inner">{a}</div>
      </div>
    </div>
  );
};

export const LandingPage: React.FC = () => {
  const { enterApp } = useRepositoryStore(useShallow(s => ({ enterApp: s.enterApp })));
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setNavScrolled(window.scrollY > 32);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const problemRef = useReveal();
  const featuresRef = useReveal();
  const howRef = useReveal();
  const stackRef = useReveal();
  const faqRef = useReveal();
  const ctaRef = useReveal();

  return (
    <div className="lp">
      {/* Nav */}
      <nav className={`lp-nav${navScrolled ? ' lp-nav--scrolled' : ''}`} aria-label="Main navigation">
        <div className="lp-nav-inner">
          <button type="button" className="lp-nav-wordmark" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="042-X — back to top">
            <div className="lp-nav-mark" aria-hidden="true"><Terminal size={14} /></div>
            <span className="lp-nav-name">042-X</span>
          </button>
          <div className="lp-nav-actions">
            <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" className="lp-nav-link" aria-label="View source on GitHub">
              <ExternalLink size={13} aria-hidden="true" />GitHub
            </a>
            <button id="nav-cta" type="button" className="lp-nav-cta" onClick={() => enterApp()} aria-label="Open the analyzer">
              Launch App<ArrowRight size={13} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="lp-hero lp-section" aria-label="Hero">
        <div className="lp-hero-glow lp-hero-glow--1" aria-hidden="true" />
        <div className="lp-hero-glow lp-hero-glow--2" aria-hidden="true" />
        <div className="lp-hero-inner">
          <div className="lp-hero-copy">
            <div className="lp-hero-badge" role="note">
              <span className="lp-hero-badge-dot" aria-hidden="true" />
              Repository Intelligence Engine
            </div>
            <h1 className="lp-hero-h1">
              Understand any<br />
              <span className="lp-hero-h1-accent">codebase</span>{' '}instantly.
            </h1>
            <p className="lp-hero-sub">
              Point 042-X at any repository. Get a full architecture graph,
              Git timeline, dependency analysis, and health metrics —
              instantly, locally, with zero data leaving your machine.
            </p>
            <div className="lp-hero-ctas">
              <button id="hero-cta-primary" type="button" className="lp-btn-primary" onClick={() => enterApp()} aria-label="Open the repository analyzer">
                Analyze Repository<ArrowRight size={15} className="lp-btn-arrow" />
              </button>
              <a id="hero-cta-secondary" href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" className="lp-btn-ghost" aria-label="View source code on GitHub">
                <ExternalLink size={15} />View on GitHub
              </a>
            </div>
            <div className="lp-hero-proof">
              <span className="lp-hero-proof-label">Built with</span>
              {['React 19', 'SWC / Rust', 'TypeScript', 'Node.js'].map(t => (
                <span key={t} className="lp-hero-proof-item">{t}</span>
              ))}
            </div>
          </div>
          <div className="lp-hero-visual" aria-hidden="true">
            <HeroGraphMockup />
          </div>
        </div>
      </section>

      {/* Problem */}
      <section ref={problemRef.ref as React.RefObject<HTMLElement>} className={`lp-problem lp-section lp-reveal${problemRef.visible ? ' lp-reveal--in' : ''}`} aria-label="Problem">
        <div className="lp-container">
          <div className="lp-problem-header">
            <div className="lp-eyebrow"><Shield size={11} aria-hidden="true" />The Problem</div>
            <h2 className="lp-section-h2">Codebases are harder<br />to read than they should be</h2>
          </div>
          <div className={`lp-problem-grid lp-stagger${problemRef.visible ? ' lp-stagger--in' : ''}`}>
            <div className="lp-problem-item">
              <div className="lp-problem-icon"><Layers size={16} /></div>
              <h3>Invisible dependencies</h3>
              <p>Import chains are invisible without tooling. Circular dependencies silently bloat your bundle — you don't know they exist until production breaks.</p>
            </div>
            <div className="lp-problem-item">
              <div className="lp-problem-icon"><Clock size={16} /></div>
              <h3>Git history is opaque</h3>
              <p>Understanding why a file changed requires piecing together <code>git log</code> and <code>git blame</code> by hand, across hundreds of commits.</p>
            </div>
            <div className="lp-problem-item">
              <div className="lp-problem-icon"><Shield size={16} /></div>
              <h3>SaaS tools see your code</h3>
              <p>Existing analysis tools require uploading your source. Every file leaves your machine and passes through someone else's infrastructure.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section ref={featuresRef.ref as React.RefObject<HTMLElement>} className="lp-features lp-section" aria-label="Features">
        <div className="lp-container">
          <div className={`lp-features-header lp-reveal${featuresRef.visible ? ' lp-reveal--in' : ''}`}>
            <div className="lp-eyebrow"><Cpu size={11} aria-hidden="true" />Features</div>
            <h2 className="lp-section-h2">Everything you need to<br />navigate a codebase</h2>
            <p className="lp-section-sub">Every view is interactive. Every metric is deterministic. Everything runs locally.</p>
          </div>
          <div className={`lp-bento lp-stagger${featuresRef.visible ? ' lp-stagger--in' : ''}`}>
            {BENTO.map(card => (
              <div key={card.id} className={`lp-bento-card${card.wide ? ' lp-bento-card--wide' : ''}`} style={{ '--card-border': card.accentBorder } as React.CSSProperties}>
                <div className="lp-bento-card-content">
                  <div className="lp-bento-icon" aria-hidden="true" style={{ color: card.iconColor }}>{card.icon}</div>
                  <h3 className="lp-bento-title">{card.title}</h3>
                  <p className="lp-bento-desc">{card.description}</p>
                </div>
                <div className="lp-bento-card-visual">{card.visual}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section ref={howRef.ref as React.RefObject<HTMLElement>} className={`lp-how lp-section lp-reveal${howRef.visible ? ' lp-reveal--in' : ''}`} aria-label="How it works">
        <div className="lp-container">
          <div className="lp-how-header">
            <div className="lp-eyebrow"><GitCommit size={11} aria-hidden="true" />How it works</div>
            <h2 className="lp-section-h2">From URL to insight in one step</h2>
          </div>
          <div className={`lp-how-grid lp-stagger${howRef.visible ? ' lp-stagger--in' : ''}`}>
            {HOW_STEPS.map(step => (
              <div key={step.num} className="lp-how-step">
                <div className="lp-how-step-num" aria-hidden="true">{step.num}</div>
                <div className="lp-how-step-body">
                  <h3 className="lp-how-step-title">{step.title}</h3>
                  <p className="lp-how-step-desc">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stack */}
      <section ref={stackRef.ref as React.RefObject<HTMLElement>} className={`lp-stack lp-section lp-reveal${stackRef.visible ? ' lp-reveal--in' : ''}`} aria-label="Technology stack">
        <div className="lp-container">
          <div className="lp-stack-header">
            <div className="lp-eyebrow"><Cpu size={11} aria-hidden="true" />Technology</div>
            <h2 className="lp-section-h2">Open, transparent, fast</h2>
            <p className="lp-section-sub">Built on proven, composable open-source tools. No black-box SaaS, no vendor lock-in.</p>
          </div>
          <div className="lp-stack-panels">
            <div className="lp-stack-panel">
              <div className="lp-stack-panel-label">Frontend</div>
              <div className="lp-stack-pills">
                {FRONTEND_STACK.map(t => (
                  <span key={t.label} className="lp-stack-pill">
                    <span className="lp-stack-pill-dot" style={{ background: t.color }} aria-hidden="true" />{t.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="lp-stack-panel">
              <div className="lp-stack-panel-label">Backend</div>
              <div className="lp-stack-pills">
                {BACKEND_STACK.map(t => (
                  <span key={t.label} className="lp-stack-pill">
                    <span className="lp-stack-pill-dot" style={{ background: t.color }} aria-hidden="true" />{t.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section ref={faqRef.ref as React.RefObject<HTMLElement>} className={`lp-faq lp-section lp-reveal${faqRef.visible ? ' lp-reveal--in' : ''}`} aria-label="Frequently asked questions">
        <div className="lp-container">
          <div className="lp-faq-header">
            <div className="lp-eyebrow">FAQ</div>
            <h2 className="lp-section-h2">Common questions</h2>
          </div>
          <div className="lp-faq-list">
            {FAQ.map(item => <FaqItem key={item.q} q={item.q} a={item.a} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section ref={ctaRef.ref as React.RefObject<HTMLElement>} className={`lp-cta lp-section lp-reveal${ctaRef.visible ? ' lp-reveal--in' : ''}`} aria-label="Get started">
        <div className="lp-container">
          <div className="lp-cta-box">
            <div className="lp-cta-glow" aria-hidden="true" />
            <h2 className="lp-cta-title">Start understanding<br />your codebase</h2>
            <p className="lp-cta-sub">Paste a GitHub URL or a local path.<br />No account. No upload. No waiting.</p>
            <div className="lp-cta-actions">
              <button id="footer-cta-primary" type="button" className="lp-btn-primary lp-btn-primary--lg" onClick={() => enterApp()} aria-label="Open the repository analyzer">
                Analyze Repository<ArrowRight size={16} className="lp-btn-arrow" />
              </button>
              <a id="footer-cta-secondary" href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" className="lp-btn-ghost" aria-label="View source on GitHub">
                <ExternalLink size={15} />View on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer lp-section" aria-label="Site footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <div className="lp-footer-mark" aria-hidden="true"><Terminal size={13} /></div>
            <div>
              <span className="lp-footer-name">042-X</span>
              <span className="lp-footer-tagline">Repository Intelligence Engine</span>
            </div>
          </div>
          <div className="lp-footer-links">
            <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" className="lp-footer-link">GitHub</a>
            <a href={`${GITHUB_REPO}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer" className="lp-footer-link">MIT License</a>
            <a href={`${GITHUB_REPO}/blob/main/README.md`} target="_blank" rel="noopener noreferrer" className="lp-footer-link">Docs</a>
          </div>
          <p className="lp-footer-copy">Local-first · Open source · No telemetry</p>
        </div>
      </footer>
    </div>
  );
};
