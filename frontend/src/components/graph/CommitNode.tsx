import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitCommit, GitBranch, Tag, Clock, FileCode, ChevronDown, ChevronUp } from 'lucide-react';

// Deterministic author color from name
const AUTHOR_PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6'
];

function hashAuthor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AUTHOR_PALETTE[Math.abs(h) % AUTHOR_PALETTE.length];
}

interface CommitNodeData {
  hash: string;
  message: string;
  author: string;
  timestamp: string;
  refs: string[];
  filesChanged?: string[];
  dimmed?: boolean;
  authorColor?: string; // Injected by GitGraphView for coloring
}

export const CommitNode = memo(({
  data,
  selected,
  onOpenFile,
}: {
  data: CommitNodeData;
  selected?: boolean;
  onOpenFile?: (path: string) => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showFiles, setShowFiles] = useState(false);

  const shortHash = (data.hash || '').substring(0, 7);
  const date = data.timestamp
    ? new Date(data.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : '';
  const datetime = data.timestamp ? new Date(data.timestamp).toLocaleString() : '';

  const authorColor = data.authorColor || hashAuthor(data.author || '');
  const filesChanged = data.filesChanged || [];

  return (
    <div
      style={{
        position: 'relative',
        padding: 'var(--space-4) var(--space-5)',
        backgroundColor: selected ? 'var(--bg-active)' : 'var(--bg-surface)',
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border-default)'}`,
        borderLeft: `3px solid ${authorColor}`,
        boxShadow: selected ? 'var(--shadow-accent)' : 'var(--shadow-sm)',
        borderRadius: 'var(--radius-lg)',
        width: 300,
        color: 'var(--text-primary)',
        transition: 'transform var(--duration-fast) var(--ease-default), border-color var(--duration-fast), box-shadow var(--duration-fast), opacity 300ms ease',
        transform: selected ? 'scale(1.03)' : 'scale(1)',
        opacity: data.dimmed ? 0.12 : 1,
        zIndex: isHovered ? 100 : 1,
      }}
      onMouseEnter={e => {
        setIsHovered(true);
        if (!selected && !data.dimmed) (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)';
      }}
      onMouseLeave={e => {
        setIsHovered(false);
        if (!selected) (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: 'var(--accent)', border: 'none', width: 6, height: 6 }} />

      {/* Hash + Date row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <GitCommit size={12} color="var(--text-tertiary)" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--accent-hover)', fontWeight: 'var(--weight-medium)' }}>
            {shortHash}
          </span>
        </div>
        <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)' }}>{date}</span>
      </div>

      {/* Commit message */}
      <div
        style={{
          fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)',
          marginBottom: 'var(--space-3)', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: 'var(--text-primary)', lineHeight: 'var(--leading-tight)',
        }}
      >
        {data.message}
      </div>

      {/* Author + Refs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', overflow: 'hidden' }}>
          {/* Author avatar */}
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: authorColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'white' }}>
              {(data.author || '?').charAt(0).toUpperCase()}
            </span>
          </div>
          <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {data.author}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-1)', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {(data.refs || []).map((ref, idx) => {
            const isTag = ref.startsWith('tag: ');
            const isHead = ref === 'HEAD' || ref.startsWith('HEAD ->');
            const label = isTag ? ref.substring(5) : ref.startsWith('HEAD -> ') ? ref.substring(8) : ref;
            if (label === 'HEAD') return null;
            return (
              <span
                key={idx}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)',
                  padding: '1px 5px', borderRadius: 'var(--radius-sm)',
                  backgroundColor: isTag ? 'var(--color-success-subtle)' : isHead ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
                  color: isTag ? 'var(--color-success)' : isHead ? 'var(--accent-hover)' : 'var(--text-secondary)',
                  border: `1px solid ${isTag ? 'var(--color-success-border)' : isHead ? 'rgba(99,102,241,0.2)' : 'var(--border-subtle)'}`,
                }}
              >
                {isTag ? <Tag size={9} /> : <GitBranch size={9} />}
                {label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Files changed toggle */}
      {filesChanged.length > 0 && (
        <div style={{ marginTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-3)' }}>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); setShowFiles(v => !v); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)',
              background: 'transparent', cursor: 'pointer',
              width: '100%',
            }}
          >
            <FileCode size={10} />
            <span>{filesChanged.length} file{filesChanged.length !== 1 ? 's' : ''} changed</span>
            {showFiles ? <ChevronUp size={10} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={10} style={{ marginLeft: 'auto' }} />}
          </button>

          {showFiles && (
            <div style={{ marginTop: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 120, overflowY: 'auto' }}>
              {filesChanged.slice(0, 12).map((file, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={e => { e.stopPropagation(); onOpenFile?.(file); }}
                  style={{
                    fontSize: 'var(--text-2xs)', color: 'var(--accent)', fontFamily: 'var(--font-mono)',
                    padding: '1px 4px', borderRadius: 3, textAlign: 'left',
                    background: 'transparent', cursor: 'pointer',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    transition: 'background var(--duration-fast)',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--accent-subtle)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  title={file}
                >
                  {file.split('/').pop()}
                </button>
              ))}
              {filesChanged.length > 12 && (
                <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', padding: '1px 4px' }}>
                  +{filesChanged.length - 12} more
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Rich hover tooltip */}
      {isHovered && !showFiles && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: '50%',
            transform: 'translateX(-50%)', width: 320,
            backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-focus)',
            borderRadius: 'var(--radius-2xl)', padding: 'var(--space-6)',
            boxShadow: 'var(--shadow-2xl)', zIndex: 999,
            display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
            pointerEvents: 'none',
            animation: 'slide-up var(--duration-fast) var(--ease-default)',
          }}
        >
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--accent-hover)', background: 'var(--accent-muted)', borderRadius: 'var(--radius-md)', padding: 'var(--space-1) var(--space-3)', display: 'inline-block' }}>
            {data.hash}
          </div>
          <p style={{ fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-relaxed)', color: 'var(--text-primary)', margin: 0 }}>
            {data.message}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', color: 'var(--text-secondary)' }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: authorColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: 'white' }}>{(data.author || '?').charAt(0).toUpperCase()}</span>
              </div>
              <span style={{ fontSize: 'var(--text-xs)' }}>{data.author}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', color: 'var(--text-secondary)' }}>
              <Clock size={12} />
              <span style={{ fontSize: 'var(--text-xs)' }}>{datetime}</span>
            </div>
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: 'var(--accent)', border: 'none', width: 6, height: 6 }} />
    </div>
  );
});

CommitNode.displayName = 'CommitNode';
