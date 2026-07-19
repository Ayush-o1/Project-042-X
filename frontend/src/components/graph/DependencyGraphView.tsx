import { useEffect } from 'react';
import { 
  ReactFlow, 
  Controls, 
  Background, 
  MiniMap, 
  useNodesState, 
  useEdgesState
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { getDagreLayout } from './layoutUtils';
import { FileNode } from './FileNode';

const nodeTypes = {
  fileNode: FileNode,
};

export const DependencyGraphView: React.FC = () => {
  const { dependencies, files, setActiveFile } = useRepositoryStore();
  
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (dependencies) {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getDagreLayout(dependencies, 'LR');
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    }
  }, [dependencies, setNodes, setEdges]);

  const onNodeClick = (_event: React.MouseEvent, node: Node) => {
    const filePath = node.id;
    const fileModel = files.find(f => f.path === filePath);
    if (fileModel) {
      setActiveFile(fileModel);
    }
  };

  if (!dependencies) {
    return <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>No dependency graph available.</div>;
  }

  return (
    <div style={{ height: '100%', width: '100%', backgroundColor: 'var(--bg-primary)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
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
