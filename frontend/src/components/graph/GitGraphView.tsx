import { useEffect } from 'react';
import { 
  ReactFlow, 
  Controls, 
  Background, 
  MiniMap, 
  useNodesState, 
  useEdgesState,
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { getGitDagreLayout } from './layoutUtils';
import { CommitNode } from './CommitNode';

const nodeTypes = {
  commitNode: CommitNode,
};

export const GitGraphView: React.FC = () => {
  const { git } = useRepositoryStore();
  
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (git && git.commits) {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getGitDagreLayout(git, 'TB');
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    }
  }, [git, setNodes, setEdges]);

  if (!git) {
    return <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>No Git history available.</div>;
  }

  return (
    <div style={{ height: '100%', width: '100%', backgroundColor: 'var(--bg-primary)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
      >
        <Background color="var(--border)" gap={24} />
        <Controls style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', fill: 'var(--text-primary)' }} />
        <MiniMap 
          nodeColor="var(--bg-tertiary)" 
          maskColor="rgba(10, 10, 10, 0.7)" 
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }} 
        />
      </ReactFlow>
    </div>
  );
};
