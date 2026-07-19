import { Handle, Position } from '@xyflow/react';
import { GitCommit, GitBranch, Tag } from 'lucide-react';

export const CommitNode = ({ data, selected }: { data: any, selected?: boolean }) => {
  return (
    <div 
      className="glass-panel"
      style={{
      padding: '12px 16px',
      backgroundColor: selected ? 'var(--bg-active)' : 'var(--bg-surface)',
      border: `1px solid ${selected ? 'var(--accent-blue)' : 'var(--border-default)'}`,
      boxShadow: selected ? '0 0 0 1px var(--accent-blue), 0 4px 6px -1px rgba(0,0,0,0.5)' : '0 4px 6px -1px rgba(0,0,0,0.5)',
      width: '300px',
      color: 'var(--text-primary)',
      transition: 'transform 150ms ease, border-color 150ms ease, box-shadow 150ms ease',
      transform: selected ? 'scale(1.02)' : 'scale(1)',
    }}
      onMouseEnter={(e) => { if(!selected) e.currentTarget.style.transform = 'scale(1.02)'; }}
      onMouseLeave={(e) => { if(!selected) e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <Handle type="target" position={Position.Top} style={{ background: 'var(--border-focus)', border: 'none' }} />
      
      <div className="flex-between" style={{ alignItems: 'flex-start', marginBottom: '8px' }}>
        <div className="flex-center" style={{ gap: '6px', color: 'var(--text-secondary)' }}>
          <GitCommit size={14} />
          <span className="font-mono text-xs">{data.hash.substring(0, 7)}</span>
        </div>
        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {new Date(data.timestamp).toLocaleDateString()}
        </div>
      </div>

      <div className="text-sm" style={{ fontWeight: 500, marginBottom: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {data.message}
      </div>

      <div className="flex-between">
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{data.author}</span>
        
        <div style={{ display: 'flex', gap: '4px' }}>
          {data.refs.map((ref: string, idx: number) => {
            const isTag = ref.startsWith('tag: ');
            const label = isTag ? ref.substring(5) : (ref.startsWith('HEAD -> ') ? ref.substring(8) : ref);
            if (label === 'HEAD') return null;

            return (
              <span key={idx} className="flex-center font-mono text-xs" style={{ 
                gap: '4px',
                padding: '2px 6px', 
                borderRadius: '4px', 
                backgroundColor: isTag ? 'var(--color-success)' : 'var(--accent-blue-bg)',
                color: isTag ? '#fff' : 'var(--accent-blue)',
                border: `1px solid ${isTag ? 'var(--color-success)' : 'var(--border-default)'}`
              }}>
                {isTag ? <Tag size={10} /> : <GitBranch size={10} />}
                {label}
              </span>
            )
          })}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: 'var(--accent-blue)', border: 'none' }} />
    </div>
  );
};
