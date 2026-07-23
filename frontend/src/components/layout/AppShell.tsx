import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { CommandPalette } from './CommandPalette';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { useMediaQuery, BREAKPOINTS } from '../../hooks/useMediaQuery';
import {
  Loader2, AlertCircle,
  Network, GitBranch, BarChart2, FileCode,
  FolderGit2, ArrowRight, Terminal, Zap
} from 'lucide-react';
import { SettingsModal } from './SettingsModal';
import { SessionHistory } from './SessionHistory';
import { CompareSnapshots } from '../insights/CompareSnapshots';
import { saveSession } from '../../lib/sessionEngine';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '../ui/Toast';

/* ── Lazy views ─────────────────────────────────────────────── */
const CodeViewer = React.lazy(() =>
  import('../viewer/CodeViewer').then(m => ({ default: m.CodeViewer }))
);
const DependencyGraphView = React.lazy(() =>
  import('../graph/DependencyGraphView').then(m => ({ default: m.DependencyGraphView }))
);
const GitGraphView = React.lazy(() =>
  import('../graph/GitGraphView').then(m => ({ default: m.GitGraphView }))
);
const InsightsDashboard = React.lazy(() =>
  import('../insights/InsightsDashboard').then(m => ({ default: m.InsightsDashboard }))
);

/* ── Tab config ─────────────────────────────────────────────── */
type Tab = 'code' | 'dependencies' | 'git' | 'insights';

const TABS: { id: Tab; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'code',         label: 'Code',          icon: <FileCode   size={13} />, description: 'Browse source files' },
  { id: 'dependencies', label: 'Architecture',   icon: <Network    size={13} />, description: 'Dependency graph' },
  { id: 'git',          label: 'Git Timeline',   icon: <GitBranch  size={13} />, description: 'Commit history' },
  { id: 'insights',     label: 'Insights',       icon: <BarChart2  size={13} />, description: 'Health metrics' },
];

/* ── Loading spinner ─────────────────────────────────────────── */
const LoadingView: React.FC<{ message?: string }> = ({ message = 'Loading…' }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: 'var(--space-4)',
    }}
  >
    <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent)' }} />
    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>{message}</span>
  </div>
);

/* ── Empty state hero ────────────────────────────────────────── */
const EmptyHero: React.FC = () => {
  const FEATURE_ITEMS = [
    { icon: <Network  size={16} />, title: 'AST Dependency Graph', desc: 'Interactive visualization of every import' },
    { icon: <GitBranch size={16} />, title: 'Git Timeline',         desc: 'Full commit history with branch topology' },
    { icon: <BarChart2 size={16} />, title: 'Insights Engine',      desc: 'Circular deps, hotspots, fan-in metrics' },
    { icon: <FileCode  size={16} />, title: 'Code Viewer',          desc: 'Syntax-highlighted source exploration' },
    { icon: <Zap       size={16} />, title: 'Session Persistence',  desc: 'IndexedDB snapshots, no re-analysis' },
    { icon: <Terminal  size={16} />, title: 'Export Engine',        desc: 'PDF, Markdown, JSON, PNG, SVG' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: 'var(--space-20)',
        gap: 'var(--space-16)',
        animation: 'fade-in 400ms ease-out',
      }}
    >
      {/* Hero */}
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div
          style={{
            width: 64, height: 64,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(129,140,248,0.08))',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: 'var(--radius-3xl)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto var(--space-8)',
            boxShadow: '0 0 40px rgba(99,102,241,0.12)',
          }}
        >
          <FolderGit2 size={28} color="var(--accent)" />
        </div>

        <h1
          style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 'var(--weight-bold)',
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
            marginBottom: 'var(--space-4)',
            lineHeight: 'var(--leading-tight)',
          }}
        >
          Repository Intelligence
        </h1>
        <p style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--text-tertiary)',
          lineHeight: 'var(--leading-relaxed)',
          marginBottom: 'var(--space-8)',
        }}>
          Enter an absolute path to any local Git repository in the bar above.
          042-X will parse every file, extract dependencies, and reveal
          the full structure of your codebase.
        </p>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-5)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <ArrowRight size={12} color="var(--accent)" />
          /Users/your-username/your-project
        </div>
      </div>

      {/* Feature grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 'var(--space-4)',
          maxWidth: 600,
          width: '100%',
        }}
      >
        {FEATURE_ITEMS.map(item => (
          <div key={item.title} className="feature-card">
            <span style={{ color: 'var(--accent)' }}>{item.icon}</span>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', marginBottom: 2 }}>
                {item.title}
              </div>
              <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', lineHeight: 'var(--leading-relaxed)' }}>
                {item.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── AppShell ───────────────────────────────────────────────── */
export const AppShell: React.FC = () => {
  const {
    isAnalyzing, error, metadata, activeTab, setActiveTab,
    setCommandPaletteOpen, graphHighlightNode,
  } = useRepositoryStore(
    useShallow(s => ({
      isAnalyzing: s.isAnalyzing,
      error: s.error,
      metadata: s.metadata,
      activeTab: s.activeTab,
      setActiveTab: s.setActiveTab,
      setCommandPaletteOpen: s.setCommandPaletteOpen,
      graphHighlightNode: s.graphHighlightNode,
    })),
  );

  const toast = useToast();

  // Below the tablet-landscape breakpoint the sidebar can no longer sit
  // inline without crowding the content — it becomes a slide-in overlay.
  const isSidebarOverlay = useMediaQuery(`(max-width: ${BREAKPOINTS.tabletLandscape - 1}px)`);
  const [sidebarOpen, setSidebarOpen] = useState(() => !isSidebarOverlay);
  const wasOverlay = useRef(isSidebarOverlay);

  useEffect(() => {
    if (isSidebarOverlay !== wasOverlay.current) {
      // Entering overlay mode: start closed so it doesn't cover the content
      // on a resize. Leaving overlay mode: always show the now-inline sidebar.
      setSidebarOpen(!isSidebarOverlay);
      wasOverlay.current = isSidebarOverlay;
    }
  }, [isSidebarOverlay]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd+K / Ctrl+K — Command Palette
      // (Cmd+W is deliberately NOT bound: browsers do not allow intercepting
      // it, so a "close tab" shortcut would close the browser tab instead and
      // destroy the un-persisted session.)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      // Cmd+S — Save session
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        const { metadata, files, dependencies, git, insights } = useRepositoryStore.getState();
        if (metadata) {
          saveSession(metadata.name, metadata, files, dependencies, git, insights)
            .then(() => toast.success('Session saved', `"${metadata.name}" snapshot stored locally.`))
            .catch(() => toast.error('Save failed', 'Could not write to IndexedDB.'));
        }
      }
      // Cmd+Shift+E — Export PDF
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        const { metadata, insights } = useRepositoryStore.getState();
        if (metadata && insights) {
          import('../../lib/exportEngine').then(({ exportReportPdf }) => {
            exportReportPdf(metadata, insights);
            toast.success('PDF exported', 'Architecture report downloaded.');
          });
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setCommandPaletteOpen, toast]);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: 'var(--header-height) 1fr',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
      }}
    >
      <Header
        showSidebarToggle={isSidebarOverlay}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(v => !v)}
      />

      <div style={{ display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {isSidebarOverlay && sidebarOpen && (
          <div
            className="sidebar-overlay-backdrop"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        <Sidebar
          isOverlay={isSidebarOverlay}
          isOpen={sidebarOpen}
          onRequestClose={() => setSidebarOpen(false)}
        />

        <main
          style={{
            flex: 1,
            backgroundColor: 'var(--bg-app)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* ── Tab Bar ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--space-3) var(--space-8)',
              backgroundColor: 'var(--bg-panel)',
              borderBottom: '1px solid var(--border-default)',
              flexShrink: 0,
            }}
          >
            <div
              className="tab-bar"
              role="tablist"
              aria-label="Views"
              onKeyDown={e => {
                if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
                if (!metadata && !isAnalyzing) return;
                const currentIndex = TABS.findIndex(t => t.id === activeTab);
                const delta = e.key === 'ArrowRight' ? 1 : -1;
                const nextIndex = (currentIndex + delta + TABS.length) % TABS.length;
                const nextTab = TABS[nextIndex];
                e.preventDefault();
                setActiveTab(nextTab.id);
                (e.currentTarget.querySelector(`#tab-trigger-${nextTab.id}`) as HTMLElement | null)?.focus();
              }}
            >
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  id={`tab-trigger-${tab.id}`}
                  type="button"
                  role="tab"
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab-btn${activeTab === tab.id ? ' tab-btn-active' : ''}`}
                  title={tab.description}
                  aria-label={tab.label}
                  aria-selected={activeTab === tab.id}
                  aria-controls="view-panel"
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  disabled={!metadata && !isAnalyzing}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Content Area ── */}
          <div
            id="view-panel"
            role="tabpanel"
            aria-labelledby={`tab-trigger-${activeTab}`}
            tabIndex={0}
            style={{ flex: 1, position: 'relative', overflow: 'hidden', outline: 'none' }}
          >

            {/* Empty state — no repo loaded */}
            {!metadata && !isAnalyzing && !error && <EmptyHero />}

            {/* Analyzing */}
            {isAnalyzing && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  gap: 'var(--space-6)',
                  animation: 'fade-in 200ms ease-out',
                }}
              >
                <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                    Analyzing Repository…
                  </p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                    Parsing ASTs and reading git history in parallel
                  </p>
                </div>
              </div>
            )}

            {/* Error state */}
            {error && !isAnalyzing && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  padding: 'var(--space-20)',
                }}
              >
                <div
                  style={{
                    background: 'var(--color-danger-subtle)',
                    border: '1px solid var(--color-danger-border)',
                    borderRadius: 'var(--radius-2xl)',
                    padding: 'var(--space-10) var(--space-12)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 'var(--space-4)',
                    maxWidth: 400,
                    textAlign: 'center',
                  }}
                >
                  <AlertCircle size={28} color="var(--color-danger)" />
                  <div>
                    <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-danger)', marginBottom: 'var(--space-2)' }}>
                      Analysis Failed
                    </p>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Main views */}
            {!isAnalyzing && !error && metadata && (
              <Suspense fallback={<LoadingView message="Loading module…" />}>
                {activeTab === 'code'         && <CodeViewer />}
                {activeTab === 'dependencies' && <DependencyGraphView externalHighlight={graphHighlightNode} />}
                {activeTab === 'git'          && <GitGraphView />}
                {activeTab === 'insights'     && <InsightsDashboard />}
              </Suspense>
            )}
          </div>
        </main>
      </div>

      {/* ── Global Modals ── */}
      <CommandPalette />
      <SettingsModal />
      <SessionHistory />
      <CompareSnapshots />
    </div>
  );
};
