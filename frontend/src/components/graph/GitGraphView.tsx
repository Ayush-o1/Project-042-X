import React, { useEffect, useState } from 'react';
import { 
  ReactFlow, 
  ReactFlowProvider,
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
import { getGitDagreLayout } from './layoutUtils';
import { CommitNode } from './CommitNode';
import { Search, ZoomIn, ZoomOut, Maximize, Target } from 'lucide-react';

const nodeTypes = {
  commitNode: CommitNode,
};

const CustomToolbar = ({ nodes, onSearch }: { nodes: Node[], onSearch: (id: string) => void }) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const found = nodes.find(n => 
      n.id.toLowerCase().includes(query.toLowerCase()) || 
      (n.data.message as string).toLowerCase().includes(query.toLowerCase())
    );
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
          placeholder="Find commit..." 
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

const FlowWrapper: React.FC = () => {
  const { git } = useRepositoryStore();
  const { setCenter } = useReactFlow();
  
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    if (git && git.commits) {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getGitDagreLayout(git, 'TB');
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    }
  }, [git, setNodes, setEdges]);

  // Compute highlighting logic
  // CRITICAL: Do NOT include `edges` (local state) in deps — that causes an infinite loop
  // because the effect mutates edges via setEdges, which would re-trigger the effect.
  // Instead, compute connectivity from the stable `git` store data.
  useEffect(() => {
    if (!hoveredNode) {
      setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, dimmed: false } })));
      setEdges(eds => eds.map(e => ({ 
        ...e, 
        style: { stroke: 'var(--border-focus)', strokeWidth: 1.5, opacity: 1 },
        animated: false
      })));
      return;
    }

    // Build connected set from the stable git store data (not the local edges state)
    const connectedNodeIds = new Set<string>([hoveredNode]);
    if (git) {
      git.commits.forEach(commit => {
        // A commit is "connected" to hoveredNode if it is a direct parent or child
        if (commit.hash === hoveredNode) {
          commit.parents.forEach(p => connectedNodeIds.add(p));
        }
        if (commit.parents.includes(hoveredNode)) {
          connectedNodeIds.add(commit.hash);
        }
      });
    }

    setNodes(nds => nds.map(n => ({
      ...n,
      data: { ...n.data, dimmed: !connectedNodeIds.has(n.id) && n.id !== hoveredNode }
    })));

    setEdges(eds => eds.map(e => {
      const isConnected = e.source === hoveredNode || e.target === hoveredNode;
      return {
        ...e,
        animated: isConnected,
        style: {
          stroke: isConnected ? 'var(--accent-blue)' : 'var(--border-focus)',
          strokeWidth: isConnected ? 2 : 1.5,
          opacity: isConnected ? 1 : 0.1,
          transition: 'all 300ms ease'
        }
      };
    }));
  }, [hoveredNode, git, setNodes, setEdges]);

  const handleSearchFocus = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setCenter(node.position.x + 150, node.position.y + 40, { zoom: 1.2, duration: 800 });
      setHoveredNode(nodeId);
    }
  };

  if (!git) {
    return (
      <div className="flex-center" style={{ height: '100%', flexDirection: 'column', gap: '16px' }}>
        <div style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '12px', textAlign: 'center' }}>
          <Target size={32} color="var(--text-tertiary)" style={{ margin: '0 auto 12px' }} />
          <h3 className="text-primary font-semibold">No Git Data</h3>
          <p className="text-secondary text-sm mt-2">Analyze a repository to view its Git history.</p>
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
        onNodeMouseEnter={(_, node) => setHoveredNode(node.id)}
        onNodeMouseLeave={() => setHoveredNode(null)}
        onPaneClick={() => setHoveredNode(null)}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ duration: 800 }}
        attributionPosition="bottom-right"
        minZoom={0.05}
        maxZoom={2}
      >
        <Background color="var(--border-focus)" gap={24} />
        <CustomToolbar nodes={nodes} onSearch={handleSearchFocus} />
        <MiniMap 
          nodeColor="var(--border-focus)" 
          maskColor="rgba(0, 0, 0, 0.7)" 
          style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-default)', borderRadius: '8px' }} 
        />
      </ReactFlow>
    </>
  );
};

export const GitGraphView: React.FC = () => {
  return (
    <div style={{ height: '100%', width: '100%', backgroundColor: 'var(--bg-app)' }}>
      <ReactFlowProvider>
        <FlowWrapper />
      </ReactFlowProvider>
    </div>
  );
};
