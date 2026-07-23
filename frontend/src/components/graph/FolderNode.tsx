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
          border: `1px dashed ${selected ? 'var(--accent)' : 'var(--border-default)'}`,
          borderRadius: 'var(--radius-2xl)',
          padding: 'var(--space-8)',
          display: 'flex',
          flexDirection: 'column',
          transition: `background var(--duration-normal) var(--ease-default), border-color var(--duration-normal) var(--ease-default)`,
          pointerEvents: 'none', // let clicks pass through to child nodes if needed, or handle explicitly
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-4)', color: 'var(--text-secondary)' }}>
          <Folder size={16} />
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {data?.label as string}
          </span>
        </div>
      </div>
    </>
  );
});

FolderNode.displayName = 'FolderNode';
