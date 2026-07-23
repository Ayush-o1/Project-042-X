import React, { useMemo, useState } from 'react';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { useShallow } from 'zustand/react/shallow';
import hljs from 'highlight.js';
import {
  FileCode, Copy, Check, ChevronRight,
  FileText, FileJson, Image as ImageIcon,
  File, X, AlertCircle, RefreshCw
} from 'lucide-react';

/* ── Language detection from extension ─────────────────────── */
const EXT_TO_HLJS: Record<string, string> = {
  '.ts':    'typescript',
  '.tsx':   'typescript',
  '.js':    'javascript',
  '.jsx':   'javascript',
  '.json':  'json',
  '.md':    'markdown',
  '.mdx':   'markdown',
  '.css':   'css',
  '.html':  'html',
  '.sh':    'bash',
  '.yaml':  'yaml',
  '.yml':   'yaml',
  '.toml':  'ini',
  '.env':   'bash',
  '.py':    'python',
  '.go':    'go',
  '.rs':    'rust',
  '.sql':   'sql',
  '.graphql': 'graphql',
};

/* ── File tab icon ──────────────────────────────────────────── */
const getIcon = (ext?: string): React.ReactNode => {
  if (['.ts', '.tsx', '.js', '.jsx'].includes(ext || ''))
    return <FileCode size={12} color="var(--lang-ts)" />;
  if (['.json'].includes(ext || ''))
    return <FileJson size={12} color="var(--lang-json)" />;
  if (['.md', '.mdx'].includes(ext || ''))
    return <FileText size={12} color="var(--text-tertiary)" />;
  if (['.png', '.jpg', '.svg', '.webp'].includes(ext || ''))
    return <ImageIcon size={12} color="var(--lang-image)" />;
  return <File size={12} color="var(--text-tertiary)" />;
};

/* ── Format file size ───────────────────────────────────────── */
const formatSize = (bytes: number): string => {
  if (bytes === 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

/* ── Copy button ─────────────────────────────────────────────── */
const CopyButton: React.FC<{ content: string }> = ({ content }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="btn btn-ghost btn-sm"
      aria-label="Copy file contents"
      title="Copy to clipboard"
      style={{ gap: 'var(--space-2)' }}
    >
      {copied
        ? <Check size={13} color="var(--color-success)" />
        : <Copy size={13} />
      }
      <span style={{ fontSize: 'var(--text-xs)' }}>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
};

/* ── Syntax-highlighted code block ──────────────────────────── */
const HighlightedCode: React.FC<{ content: string; ext?: string }> = ({ content, ext }) => {
  const highlighted = useMemo(() => {
    const lang = EXT_TO_HLJS[ext || ''];
    try {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(content, { language: lang }).value;
      }
      return hljs.highlightAuto(content).value;
    } catch {
      return content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  }, [content, ext]);

  const lines = content.split('\n');
  const lineCount = lines.length;

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Line numbers */}
      <div
        className="code-line-numbers"
        aria-hidden="true"
        style={{
          padding: 'var(--space-8) 0 var(--space-8) var(--space-6)',
          borderRight: '1px solid var(--border-subtle)',
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i} style={{ height: '1.7em', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            {i + 1}
          </div>
        ))}
      </div>

      {/* Code */}
      <pre
        style={{
          flex: 1,
          margin: 0,
          padding: 'var(--space-8) var(--space-10)',
          overflow: 'auto',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-sm)',
          lineHeight: 'var(--leading-code)',
          color: 'var(--text-primary)',
          background: 'transparent',
          tabSize: 2,
        }}
      >
        <code
          className="hljs"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
    </div>
  );
};

/* ── Main Code Viewer ───────────────────────────────────────── */
export const CodeViewer: React.FC = () => {
  const {
    activeFile, activeFileContent, isFileLoading, fileError,
    openFiles, setActiveFile, closeFile,
  } = useRepositoryStore(
    useShallow(s => ({
      activeFile: s.activeFile,
      activeFileContent: s.activeFileContent,
      isFileLoading: s.isFileLoading,
      fileError: s.fileError,
      openFiles: s.openFiles,
      setActiveFile: s.setActiveFile,
      closeFile: s.closeFile,
    })),
  );

  // Removed unused hover state — close button visibility handled purely via CSS

  if (!activeFile) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: 'var(--space-4)',
          color: 'var(--text-tertiary)',
          animation: 'fade-in 300ms ease-out',
        }}
      >
        <div className="empty-state-icon">
          <FileCode size={22} style={{ opacity: 0.4 }} />
        </div>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
          Select a file to view its contents
        </p>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
          Use the sidebar or press <kbd className="kbd" style={{ margin: '0 4px' }}>⌘K</kbd> to search
        </p>
      </div>
    );
  }

  const pathParts = activeFile.path.split('/');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-app)' }}>

      {/* ── File Tabs ── */}
      {openFiles.length > 0 && (
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--bg-panel)',
            borderBottom: '1px solid var(--border-default)',
            overflowX: 'auto',
            padding: 'var(--space-3) var(--space-4) 0',
            gap: 'var(--space-1)',
            flexShrink: 0,
          }}
        >
          {openFiles.map(f => {
            const isActive = activeFile?.path === f.path;
            return (
              <div
                key={f.path}
                onClick={() => setActiveFile(f)}
                role="tab"
                aria-selected={isActive}
                aria-label={`Switch to ${f.name}`}
                className={`code-editor-tab${isActive ? ' code-editor-tab-active' : ''}`}
                title={f.path}
              >
                {getIcon(f.extension)}
                <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.name}
                </span>
                <button
                  type="button"
                  className="code-editor-tab-close"
                  onClick={e => { e.stopPropagation(); closeFile(f.path); }}
                  aria-label={`Close ${f.name}`}
                >
                  <X size={10} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Breadcrumb Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-3) var(--space-6)',
          borderBottom: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-panel)',
          flexShrink: 0,
          gap: 'var(--space-4)',
        }}
      >
        {/* Breadcrumb path */}
        <nav aria-label="File path" style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
          {pathParts.map((part, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <ChevronRight size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
              )}
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  color: i === pathParts.length - 1 ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  fontWeight: i === pathParts.length - 1 ? 'var(--weight-medium)' : 'var(--weight-normal)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: i === pathParts.length - 1 ? 240 : 100,
                }}
              >
                {part}
              </span>
            </React.Fragment>
          ))}
        </nav>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexShrink: 0 }}>
          {activeFile.language && activeFile.language !== 'Unknown' && (
            <span className="badge badge-default">{activeFile.language}</span>
          )}
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            {formatSize(activeFile.size)}
          </span>
          {activeFileContent && !isFileLoading && (
            <>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                {activeFileContent.split('\n').length} lines
              </span>
              <CopyButton content={activeFileContent} />
            </>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {isFileLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-8)' }}>
            {/* Skeleton lines */}
            {[80, 60, 90, 40, 70, 55, 85].map((w, i) => (
              <div
                key={i}
                className="skeleton"
                style={{ height: 14, width: `${w}%`, borderRadius: 4 }}
              />
            ))}
          </div>
        ) : fileError ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 'var(--space-3)',
              padding: 'var(--space-10)',
              textAlign: 'center',
            }}
          >
            <AlertCircle size={22} color="var(--color-danger)" />
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--color-danger)' }}>
              Couldn't load this file
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', maxWidth: 420, lineHeight: 'var(--leading-relaxed)' }}>
              {fileError}
            </p>
            <button
              type="button"
              onClick={() => setActiveFile(activeFile)}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 'var(--space-2)' }}
            >
              <RefreshCw size={12} />
              Retry
            </button>
          </div>
        ) : activeFileContent ? (
          <div style={{ flex: 1, overflow: 'auto' }}>
            <HighlightedCode content={activeFileContent} ext={activeFile.extension} />
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-tertiary)',
              fontSize: 'var(--text-sm)',
            }}
          >
            Empty file
          </div>
        )}
      </div>
    </div>
  );
};
