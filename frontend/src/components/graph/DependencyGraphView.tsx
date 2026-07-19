import React, { useEffect, useState, useCallback } from 'react';
import { 
  ReactFlow, 
  Background, 
  MiniMap, 
  useNodesState, 
  useEdgesState,
  useReactFlow,
  Panel
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { getDagreLayout } from './layoutUtils';
import { FileNode } from './FileNode';
import { FolderNode } from './FolderNode';
import { CustomEdge } from './CustomEdge';
import { Search, ZoomIn, ZoomOut, Maximize, Target, X, ExternalLink } from 'lucide-react';

const nodeTypes = {
  fileNode: FileNode,
  folderNode: FolderNode
};

const edgeTypes = {
  custom: CustomEdge
};

const CustomToolbar = ({ nodes, onSearch }: { nodes: Node[], onSearch: (id: string) => void }) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const found = nodes.find(n => n.data.path && (n.data.path as string).toLowerCase().includes(query.toLowerCase()));
    if (found) {
      onSearch(found.id);
    }
  };

  return (
    <Panel position="top-right" className="glass-panel" style={{ 
      display: 'flex', gap: '8px', padding: '8px', borderRadius: '8px', 
      backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-default)',
      margin: '16px'
    }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-app)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
        <Search size={14} color="var(--text-tertiary)" style={{ marginRight: '6px' }} />
        <input 
          type="text" 
          placeholder="Find node..." 
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="text-xs"
          style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', width: '120px' }}
        />
      </form>
      <div style={{ width: '1px', backgroundColor: 'var(--border-default)', margin: '0 4px' }} />
      <button onClick={() => zoomIn({ duration: 800 })} style={{ padding: '6px', cursor: 'pointer', color: 'var(--text-secondary)', background: 'transparent' }}><ZoomIn size={16} /></button>
      <button onClick={() => zoomOut({ duration: 800 })} style={{ padding: '6px', cursor: 'pointer', color: 'var(--text-secondary)', background: 'transparent' }}><ZoomOut size={16} /></button>
      <button onClick={() => fitView({ duration: 800 })} style={{ padding: '6px', cursor: 'pointer', color: 'var(--text-secondary)', background: 'transparent' }}><Maximize size={16} /></button>
    </Panel>
  );
};

const Inspector = ({ node, onClose, onOpen }: { node: Node, onClose: () => void, onOpen: (path: string) => void }) => {
  return (
    <div className="glass-panel" style={{
      position: 'absolute',
      right: '16px',
      top: '16px',
      bottom: '16px',
      width: '320px',
      backgroundColor: 'var(--bg-panel)',
      border: '1px solid var(--border-focus)',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.8)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 10
    }}>
      <div className="flex-between" style={{ marginBottom: '20px' }}>
        <h3 className="text-sm font-semibold text-primary">Node Details</h3>
        <button onClick={onClose} style={{ background: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <span className="text-xs text-tertiary uppercase" style={{ letterSpacing: '0.05em' }}>File</span>
          <div className="text-sm text-primary font-mono mt-1" style={{ wordBreak: 'break-all' }}>{node.data.label as string}</div>
        </div>
        
        <div>
          <span className="text-xs text-tertiary uppercase" style={{ letterSpacing: '0.05em' }}>Path</span>
          <div className="text-xs text-secondary font-mono mt-1" style={{ wordBreak: 'break-all' }}>{node.data.path as string}</div>
        </div>
        
        <div>
          <span className="text-xs text-tertiary uppercase" style={{ letterSpacing: '0.05em' }}>Type</span>
          <div className="text-sm text-primary mt-1">{node.data.type as string}</div>
        </div>

        <button 
          onClick={() => onOpen(node.data.path as string)}
          className="flex-center"
          style={{
            marginTop: 'auto',
            padding: '10px 16px',
            backgroundColor: 'var(--accent-blue)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            gap: '8px'
          }}
        >
          <ExternalLink size={14} /> Open File
        </button>
      </div>
    </div>
  );
};

const FlowWrapper: React.FC = () => {
  const { dependencies, files, setActiveFile } = useRepositoryStore();
  const { setCenter } = useReactFlow();
  
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  useEffect(() => {
    if (dependencies) {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getDagreLayout(dependencies, 'LR');
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    }
  }, [dependencies, setNodes, setEdges]);

  // Compute highlighting logic via BFS
  useEffect(() => {
    if (!hoveredNode) {
      setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, dimmed: false } })));
      setEdges(eds => eds.map(e => ({ 
        ...e, 
        data: { ...e.data, isIncoming: false, isOutgoing: false, isDimmed: false }
      })));
      return;
    }

    const incomingIds = new Set<string>();
    const outgoingIds = new Set<string>();
    const incomingEdges = new Set<string>();
    const outgoingEdges = new Set<string>();

    const traverse = (nodeId: string, direction: 'in' | 'out', visitedNodes: Set<string>, visitedEdges: Set<string>) => {
      if (visitedNodes.has(nodeId)) return;
      visitedNodes.add(nodeId);
      
      edges.forEach(e => {
        if (direction === 'out' && e.source === nodeId) {
          visitedEdges.add(e.id);
          traverse(e.target, direction, visitedNodes, visitedEdges);
        }
        if (direction === 'in' && e.target === nodeId) {
          visitedEdges.add(e.id);
          traverse(e.source, direction, visitedNodes, visitedEdges);
        }
      });
    };

    traverse(hoveredNode, 'in', incomingIds, incomingEdges);
    traverse(hoveredNode, 'out', outgoingIds, outgoingEdges);

    setNodes(nds => nds.map(n => {
      if (n.type === 'folderNode') return n;
      const isConnected = incomingIds.has(n.id) || outgoingIds.has(n.id);
      return {
        ...n,
        data: { ...n.data, dimmed: !isConnected }
      };
    }));

    setEdges(eds => eds.map(e => {
      const isIncoming = incomingEdges.has(e.id);
      const isOutgoing = outgoingEdges.has(e.id);
      const isConnected = isIncoming || isOutgoing;
      
      return {
        ...e,
        data: {
          ...e.data,
          isIncoming,
          isOutgoing,
          isDimmed: !isConnected
        },
      };
    }));
  }, [hoveredNode, edges, setNodes, setEdges]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type === 'folderNode') return;
    setSelectedNode(node);
  }, []);

  const handleOpenFile = (path: string) => {
    const fileModel = files.find(f => f.path === path);
    if (fileModel) {
      setActiveFile(fileModel);
    }
  };

  const handleSearchFocus = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      // Calculate absolute center for focus (especially if node is in a parent)
      let absoluteX = node.position.x;
      let absoluteY = node.position.y;
      if (node.parentId) {
        const parent = nodes.find(p => p.id === node.parentId);
        if (parent) {
          absoluteX += parent.position.x;
          absoluteY += parent.position.y;
        }
      }
      setCenter(absoluteX + 125, absoluteY + 40, { zoom: 1.2, duration: 800 });
      setHoveredNode(nodeId);
      setSelectedNode(node);
    }
  };

  if (!dependencies) {
    return (
      <div className="flex-center" style={{ height: '100%', flexDirection: 'column', gap: '16px' }}>
        <div style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '12px', textAlign: 'center' }}>
          <Target size={32} color="var(--text-tertiary)" style={{ margin: '0 auto 12px' }} />
          <h3 className="text-primary font-semibold">No Graph Data</h3>
          <p className="text-secondary text-sm mt-2">Analyze a repository to view its dependency graph.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={(_, node) => {
          if (node.type !== 'folderNode') setHoveredNode(node.id);
        }}
        onNodeMouseLeave={() => setHoveredNode(null)}
        onPaneClick={() => { setHoveredNode(null); setSelectedNode(null); }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ duration: 800 }}
        attributionPosition="bottom-right"
        minZoom={0.05}
        maxZoom={2}
      >
        <Background color="var(--border-focus)" gap={24} />
        <CustomToolbar nodes={nodes} onSearch={handleSearchFocus} />
        <MiniMap 
          nodeColor={(n) => {
            if (n.type === 'folderNode') return 'transparent';
            if (n.data.type === 'TypeScript') return '#3178c6';
            if (n.data.type === 'JavaScript') return '#f7df1e';
            return 'var(--border-focus)';
          }} 
          nodeStrokeColor={(n) => n.type === 'folderNode' ? 'var(--border-focus)' : 'transparent'}
          nodeStrokeWidth={3}
          maskColor="rgba(0, 0, 0, 0.7)" 
          style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-default)', borderRadius: '8px' }} 
        />
      </ReactFlow>
      
      {selectedNode && (
        <Inspector node={selectedNode} onClose={() => setSelectedNode(null)} onOpen={handleOpenFile} />
      )}
    </>
  );
};

export const DependencyGraphView: React.FC = () => {
  return (
    <div style={{ height: '100%', width: '100%', backgroundColor: 'var(--bg-app)', position: 'relative' }}>
      <FlowWrapper />
    </div>
  );
};
