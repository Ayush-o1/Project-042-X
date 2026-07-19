import { Handle, Position } from '@xyflow/react';
import { GitCommit, GitBranch, Tag } from 'lucide-react';

export const CommitNode = ({ data, selected }: { data: any, selected?: boolean }) => {
  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: '8px',
      backgroundColor: 'var(--bg-secondary)',
      border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
      boxShadow: selected ? '0 0 0 1px var(--accent)' : 'none',
      width: '300px',
      color: 'var(--text-primary)',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: 'var(--border)' }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
          <GitCommit size={14} />
          <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>{data.hash.substring(0, 7)}</span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          {new Date(data.timestamp).toLocaleDateString()}
        </div>
      </div>

      <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {data.message}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{data.author}</span>
        
        <div style={{ display: 'flex', gap: '4px' }}>
          {data.refs.map((ref: string, idx: number) => {
            const isTag = ref.startsWith('tag: ');
            const label = isTag ? ref.substring(5) : (ref.startsWith('HEAD -> ') ? ref.substring(8) : ref);
            if (label === 'HEAD') return null;

            return (
              <span key={idx} style={{ 
                display: 'flex', alignItems: 'center', gap: '2px',
                padding: '2px 6px', borderRadius: '4px', fontSize: '10px', 
                backgroundColor: isTag ? '#10b98120' : '#3b82f620',
                color: isTag ? '#10b981' : '#3b82f6',
                border: `1px solid ${isTag ? '#10b98140' : '#3b82f640'}`
              }}>
                {isTag ? <Tag size={10} /> : <GitBranch size={10} />}
                {label}
              </span>
            )
          })}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: 'var(--accent)' }} />
    </div>
  );
};
