import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import type { DependencyGraphData } from '../../types';

export const getDagreLayout = (data: DependencyGraphData, direction: 'TB' | 'LR' = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  // Set layout options
  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 100 });

  // Map to xyflow format
  const xyNodes: Node[] = data.nodes.map((node) => ({
    id: node.id,
    type: 'fileNode',
    position: { x: 0, y: 0 },
    data: { label: node.name, type: node.type, path: node.path },
  }));

  const xyEdges: Edge[] = data.edges.map((edge) => ({
    id: `${edge.sourceId}-${edge.targetId}`,
    source: edge.sourceId,
    target: edge.targetId,
    type: 'smoothstep',
    animated: true,
    style: { stroke: 'var(--border)' }
  }));

  // Add nodes to dagre
  xyNodes.forEach((node) => {
    // Width and height of our custom FileNode
    dagreGraph.setNode(node.id, { width: 250, height: 60 });
  });

  // Add edges to dagre
  xyEdges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Execute algorithm
  dagre.layout(dagreGraph);

  // Read back coordinates
  xyNodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    // Shift coordinate system from center to top-left for xyflow
    node.position = {
      x: nodeWithPosition.x - 125,
      y: nodeWithPosition.y - 30,
    };
  });

  return { nodes: xyNodes, edges: xyEdges };
};

export const getGitDagreLayout = (data: { commits: any[] }, direction: 'TB' | 'LR' = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  // TB (top-to-bottom) makes git timelines look correct
  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 60 });

  const xyNodes: Node[] = data.commits.map((commit) => ({
    id: commit.hash,
    type: 'commitNode',
    position: { x: 0, y: 0 },
    data: { hash: commit.hash, message: commit.message, author: commit.author, refs: commit.refs, timestamp: commit.timestamp },
  }));

  const xyEdges: Edge[] = [];
  data.commits.forEach(commit => {
    commit.parents.forEach((parentHash: string) => {
      xyEdges.push({
        id: `${commit.hash}-${parentHash}`,
        source: commit.hash,
        target: parentHash,
        type: 'straight',
        style: { stroke: 'var(--accent)', strokeWidth: 2 }
      });
    });
  });

  xyNodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 300, height: 80 });
  });

  xyEdges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  xyNodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.position = {
      x: nodeWithPosition.x - 150,
      y: nodeWithPosition.y - 40,
    };
  });

  return { nodes: xyNodes, edges: xyEdges };
};
