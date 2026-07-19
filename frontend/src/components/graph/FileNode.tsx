import { Handle, Position } from '@xyflow/react';
import { FileCode2, FileJson, Image as ImageIcon, File } from 'lucide-react';

interface FileNodeData {
  label: string;
  type: string;
  path: string;
}

export const FileNode = ({ data, selected }: { data: FileNodeData, selected?: boolean }) => {
  const getIcon = () => {
    if (!data?.label) return <File size={16} color="var(--text-secondary)" />;
    const ext = data.label.substring(data.label.lastIndexOf('.'));
    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) return <FileCode2 size={16} color="#3b82f6" />;
    if (['.json', '.md'].includes(ext)) return <FileJson size={16} color="#10b981" />;
    if (['.png', '.jpg', '.svg'].includes(ext)) return <ImageIcon size={16} color="#8b5cf6" />;
    return <File size={16} color="var(--text-secondary)" />;
  };

  return (
    <div style={{
      padding: '10px 16px',
      borderRadius: '8px',
      backgroundColor: 'var(--bg-secondary)',
      border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
      boxShadow: selected ? '0 0 0 1px var(--accent)' : 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      width: '250px',
      color: 'var(--text-primary)',
      transition: 'all 0.2s ease',
    }}>
      <Handle type="target" position={Position.Left} style={{ background: 'var(--border)' }} />
      {getIcon()}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <span style={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {data?.label || 'Unknown'}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {data?.path ? data.path.substring(data.path.lastIndexOf('/') + 1) : 'Unknown Path'}
        </span>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: 'var(--accent)' }} />
    </div>
  );
};
