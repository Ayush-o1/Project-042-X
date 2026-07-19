import { Handle, Position } from '@xyflow/react';
import { FileCode2, FileJson, Image as ImageIcon, File } from 'lucide-react';

interface FileNodeData {
  label: string;
  type: string;
  path: string;
}

export const FileNode = ({ data, selected }: { data: FileNodeData, selected?: boolean }) => {
  const getIcon = () => {
    if (!data?.label) return <File size={16} color="var(--text-tertiary)" />;
    const ext = data.label.substring(data.label.lastIndexOf('.'));
    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) return <FileCode2 size={16} color="var(--accent-blue)" />;
    if (['.json', '.md'].includes(ext)) return <FileJson size={16} color="var(--color-success)" />;
    if (['.png', '.jpg', '.svg'].includes(ext)) return <ImageIcon size={16} color="#8b5cf6" />;
    return <File size={16} color="var(--text-secondary)" />;
  };

  return (
    <div 
      className="glass-panel"
      style={{
      padding: '12px 16px',
      backgroundColor: selected ? 'var(--bg-active)' : 'var(--bg-surface)',
      border: `1px solid ${selected ? 'var(--accent-blue)' : 'var(--border-default)'}`,
      boxShadow: selected ? '0 0 0 1px var(--accent-blue), 0 4px 6px -1px rgba(0,0,0,0.5)' : '0 4px 6px -1px rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      width: '250px',
      color: 'var(--text-primary)',
      transition: 'transform 150ms ease, border-color 150ms ease, box-shadow 150ms ease',
      transform: selected ? 'scale(1.02)' : 'scale(1)',
    }}
      onMouseEnter={(e) => { if(!selected) e.currentTarget.style.transform = 'scale(1.02)'; }}
      onMouseLeave={(e) => { if(!selected) e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <Handle type="target" position={Position.Left} style={{ background: 'var(--border-focus)', border: 'none' }} />
      {getIcon()}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <span style={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {data?.label || 'Unknown'}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {data?.path ? data.path.substring(data.path.lastIndexOf('/') + 1) : 'Unknown Path'}
        </span>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: 'var(--accent-blue)', border: 'none' }} />
    </div>
  );
};
