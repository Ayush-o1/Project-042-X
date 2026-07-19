import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Folder } from 'lucide-react';

export const FolderNode = memo(({ data, selected }: NodeProps) => {
  return (
    <>
      <div 
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: selected ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
          border: `1px dashed ${selected ? 'var(--accent-blue)' : 'var(--border-default)'}`,
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 200ms ease',
          pointerEvents: 'none', // let clicks pass through to child nodes if needed, or handle explicitly
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
          <Folder size={16} />
          <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {data?.label as string}
          </span>
        </div>
      </div>
    </>
  );
});

FolderNode.displayName = 'FolderNode';
