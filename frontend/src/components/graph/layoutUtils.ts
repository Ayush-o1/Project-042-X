import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import type { DependencyGraphData } from '../../types';

export const getDagreLayout = (data: DependencyGraphData, direction: 'TB' | 'LR' = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph({ compound: true });
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  // Set layout options
  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 100 });

  const xyNodes: Node[] = [];
  const folders = new Set<string>();

  // Identify folders
  data.nodes.forEach(node => {
    const parts = node.path.split('/');
    if (parts.length > 1) {
      const folderPath = parts.slice(0, -1).join('/');
      folders.add(folderPath);
    }
  });

  // Add folder nodes to xyNodes
  folders.forEach(folder => {
    xyNodes.push({
      id: folder,
      type: 'folderNode',
      position: { x: 0, y: 0 },
      data: { label: folder.split('/').pop() },
      style: { zIndex: -1 }
    });
    dagreGraph.setNode(folder, { label: folder, clusterLabelPos: 'top' });
  });

  // Map to xyflow format and add to dagre
  data.nodes.forEach(node => {
    const parts = node.path.split('/');
    let parentId = undefined;
    if (parts.length > 1) {
      parentId = parts.slice(0, -1).join('/');
    }

    const xyNode: Node = {
      id: node.id,
      type: 'fileNode',
      position: { x: 0, y: 0 },
      data: { label: node.name, type: node.type, path: node.path },
      parentId,
      extent: parentId ? 'parent' : undefined,
    };
    xyNodes.push(xyNode);
    dagreGraph.setNode(node.id, { width: 250, height: 60 });
    if (parentId) {
      dagreGraph.setParent(node.id, parentId);
    }
  });

  const xyEdges: Edge[] = data.edges.map((edge) => ({
    id: `${edge.sourceId}-${edge.targetId}`,
    source: edge.sourceId,
    target: edge.targetId,
    type: 'custom',
    animated: true,
    data: {},
  }));

  // Add edges to dagre
  xyEdges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Execute algorithm
  dagre.layout(dagreGraph);

  // Read back coordinates
  xyNodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    if (!nodeWithPosition) return;
    
    // Shift coordinate system from center to top-left for xyflow
    if (node.type === 'folderNode') {
      node.position = {
        x: nodeWithPosition.x - nodeWithPosition.width / 2,
        y: nodeWithPosition.y - nodeWithPosition.height / 2,
      };
      node.style = { ...node.style, width: nodeWithPosition.width, height: nodeWithPosition.height };
    } else {
      let absoluteX = nodeWithPosition.x - 125;
      let absoluteY = nodeWithPosition.y - 30;

      if (node.parentId) {
        const parentWithPosition = dagreGraph.node(node.parentId);
        const parentAbsoluteX = parentWithPosition.x - parentWithPosition.width / 2;
        const parentAbsoluteY = parentWithPosition.y - parentWithPosition.height / 2;
        node.position = {
          x: absoluteX - parentAbsoluteX,
          y: absoluteY - parentAbsoluteY,
        };
      } else {
        node.position = { x: absoluteX, y: absoluteY };
      }
    }
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
