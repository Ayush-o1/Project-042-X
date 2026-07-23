import React, { useEffect, useRef, useState } from 'react';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import {
  FolderGit2, Search, XCircle, Settings, Save,
  Download, Clock, GitCompare, ChevronDown, Menu,
  FileImage, FileCode2, FileText, FileJson, Loader2
} from 'lucide-react';
import { saveSession } from '../../lib/sessionEngine';
import {
  exportGraphToPng, exportGraphToSvg,
  exportReportMarkdown, exportReportJson, exportReportPdf
} from '../../lib/exportEngine';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '../ui/Toast';

/* ── Export menu items ──────────────────────────────────────── */
interface ExportItem {
  label: string;
  format: string;
  icon: React.ReactNode;
  description: string;
}

const EXPORT_ITEMS: ExportItem[] = [
  { label: 'Graph PNG',         format: 'png', icon: <FileImage  size={14} />, description: 'High-res 2x image' },
  { label: 'Graph SVG',         format: 'svg', icon: <FileCode2  size={14} />, description: 'Vector graphic' },
  { label: 'Report Markdown',   format: 'md',  icon: <FileText   size={14} />, description: 'Formatted summary' },
  { label: 'Report PDF',        format: 'pdf', icon: <FileText   size={14} />, description: 'Printable document' },
  { label: 'Report JSON',       format: 'json',icon: <FileJson   size={14} />, description: 'Machine-readable' },
];

/* ── Component ──────────────────────────────────────────────── */
interface HeaderProps {
  /** Whether the viewport is narrow enough that the sidebar is an overlay. */
  showSidebarToggle: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ showSidebarToggle, sidebarOpen, onToggleSidebar }) => {
  const {
    analyze, isAnalyzing, metadata,
    cancelAnalysis, analysisProgress,
    setSettingsOpen, setSessionHistoryOpen, setCompareModalOpen,
    activeTab,
  } = useRepositoryStore(
    useShallow(s => ({
      analyze: s.analyze,
      isAnalyzing: s.isAnalyzing,
      metadata: s.metadata,
      cancelAnalysis: s.cancelAnalysis,
      analysisProgress: s.analysisProgress,
      setSettingsOpen: s.setSettingsOpen,
      setSessionHistoryOpen: s.setSessionHistoryOpen,
      setCompareModalOpen: s.setCompareModalOpen,
      activeTab: s.activeTab,
    })),
  );

  const toast = useToast();
  const [pathInput, setPathInput] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close export dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pathInput.trim()) {
      analyze(pathInput.trim());
      inputRef.current?.blur();
    }
  };

  const handleSaveSession = async () => {
    const { metadata, files, dependencies, git, insights } = useRepositoryStore.getState();
    if (!metadata) return;
    try {
      await saveSession(metadata.name, metadata, files, dependencies, git, insights);
      toast.success('Session saved', `Snapshot of "${metadata.name}" stored locally.`);
    } catch {
      toast.error('Save failed', 'Could not write to IndexedDB. Check browser storage settings.');
    }
  };

  const handleExport = async (format: string) => {
    setExportOpen(false);
    const { metadata, files, insights } = useRepositoryStore.getState();
    if (!metadata || !insights) return;

    // Graph image exports capture the live DOM of the Architecture view —
    // it must be the active (mounted) tab, otherwise there is nothing to render.
    if ((format === 'png' || format === 'svg') && activeTab !== 'dependencies') {
      toast.warning('Open the Architecture tab', 'Graph image exports capture the visible dependency graph. Switch to the Architecture tab first.');
      return;
    }

    setIsExporting(true);
    try {
      if (format === 'png') {
        await exportGraphToPng('architecture-graph-container');
        toast.success('PNG exported', 'High-resolution graph image downloaded.');
      } else if (format === 'svg') {
        await exportGraphToSvg('architecture-graph-container');
        toast.success('SVG exported', 'Vector graph image downloaded.');
      } else if (format === 'md') {
        exportReportMarkdown(metadata, insights);
        toast.success('Markdown exported', 'Architecture report downloaded.');
      } else if (format === 'json') {
        exportReportJson(metadata, insights, files);
        toast.success('JSON exported', 'Machine-readable report downloaded.');
      } else if (format === 'pdf') {
        exportReportPdf(metadata, insights);
        toast.success('PDF exported', 'Printable report downloaded.');
      }
    } catch {
      toast.error('Export failed', 'Could not generate the export file.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-8)',
        height: 'var(--header-height)',
        backgroundColor: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border-default)',
        position: 'relative',
        zIndex: 10,
        gap: 'var(--space-6)',
        flexShrink: 0,
      }}
    >
      {/* Progress Bar */}
      {isAnalyzing && (
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${analysisProgress}%` }} />
        </div>
      )}

      {/* ── Left: Sidebar Toggle, Logo & Repo Name ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexShrink: 0, minWidth: 0 }}>
        {showSidebarToggle && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="btn-icon btn-icon-lg"
            title={sidebarOpen ? 'Hide file explorer' : 'Show file explorer'}
            aria-label={sidebarOpen ? 'Hide file explorer' : 'Show file explorer'}
            aria-expanded={sidebarOpen}
          >
            <Menu size={16} />
          </button>
        )}
        <div
          style={{
            width: 30, height: 30,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
            flexShrink: 0,
          }}
        >
          <FolderGit2 size={16} />
        </div>
        <span
          className="header-wordmark"
          style={{
            fontWeight: 'var(--weight-semibold)',
            fontSize: 'var(--text-base)',
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap',
          }}
        >
          042-X
        </span>

        {metadata && (
          <span
            className="badge badge-default"
            style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={metadata.name}
          >
            {metadata.name}
          </span>
        )}
      </div>

      {/* ── Center: Path Input ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-3)', maxWidth: 560 }}>
        <form onSubmit={handleSubmit} style={{ flex: 1, position: 'relative' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: inputFocused ? 'var(--accent-hover)' : 'var(--text-tertiary)',
              transition: 'color var(--duration-fast)',
              pointerEvents: 'none',
            }}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Enter absolute path to repository…"
            value={pathInput}
            onChange={e => setPathInput(e.target.value)}
            disabled={isAnalyzing}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            aria-label="Repository path"
            style={{
              width: '100%',
              padding: '6px 14px 6px 34px',
              backgroundColor: 'var(--bg-surface)',
              border: `1px solid ${inputFocused ? 'var(--border-focus)' : 'var(--border-default)'}`,
              borderRadius: 'var(--radius-lg)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-mono)',
              transition: 'border-color var(--duration-fast), box-shadow var(--duration-fast)',
              boxShadow: inputFocused ? 'var(--shadow-focus)' : 'none',
              opacity: isAnalyzing ? 0.5 : 1,
            }}
          />
        </form>

        {isAnalyzing && (
          <button
            type="button"
            onClick={cancelAnalysis}
            className="btn btn-sm btn-danger"
            aria-label="Cancel analysis"
          >
            <XCircle size={13} />
            Cancel
          </button>
        )}
      </div>

      {/* ── Right: Action Buttons ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>

        {metadata && !isAnalyzing && (
          <>
            {/* Compare */}
            <button
              type="button"
              onClick={() => setCompareModalOpen(true)}
              className="btn btn-ghost btn-sm"
              title="Compare snapshots"
              aria-label="Compare snapshots"
              style={{ gap: 'var(--space-2)' }}
            >
              <GitCompare size={14} />
              <span className="header-action-label" style={{ fontSize: 'var(--text-xs)' }}>Compare</span>
            </button>

            {/* History */}
            <button
              type="button"
              onClick={() => setSessionHistoryOpen(true)}
              className="btn btn-ghost btn-sm"
              title="Session history"
              aria-label="Session history"
              style={{ gap: 'var(--space-2)' }}
            >
              <Clock size={14} />
              <span className="header-action-label" style={{ fontSize: 'var(--text-xs)' }}>History</span>
            </button>

            {/* Save */}
            <button
              type="button"
              onClick={handleSaveSession}
              className="btn btn-ghost btn-sm"
              title="Save session (Cmd+S)"
              aria-label="Save session"
              style={{ gap: 'var(--space-2)' }}
            >
              <Save size={14} />
              <span className="header-action-label" style={{ fontSize: 'var(--text-xs)' }}>Save</span>
            </button>

            {/* Export Dropdown */}
            <div ref={exportRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setExportOpen(v => !v)}
                className="btn btn-secondary btn-sm"
                title="Export"
                aria-label="Export report"
                aria-expanded={exportOpen}
                style={{ gap: 'var(--space-2)' }}
                disabled={isExporting}
              >
                {isExporting
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Download size={13} />
                }
                <span className="header-action-label" style={{ fontSize: 'var(--text-xs)' }}>Export</span>
                <ChevronDown
                  size={11}
                  style={{
                    transform: exportOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform var(--duration-fast)',
                    marginLeft: -2,
                  }}
                />
              </button>

              {exportOpen && (
                <div
                  className="animate-slide-up dropdown-panel"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    zIndex: 'var(--z-dropdown)',
                    minWidth: 200,
                  }}
                >
                  {EXPORT_ITEMS.map(item => (
                    <button
                      key={item.format}
                      type="button"
                      onClick={() => handleExport(item.format)}
                      className="menu-item"
                    >
                      <span className="menu-item-icon">{item.icon}</span>
                      <div>
                        <div className="menu-item-title">
                          {item.label}
                        </div>
                        <div className="menu-item-subtitle">
                          {item.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="divider-v-sm" />
          </>
        )}

        {/* Settings */}
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="btn-icon btn-icon-lg"
          title="Preferences"
          aria-label="Open preferences"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
};
