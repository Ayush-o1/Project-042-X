import { GraphNode, GraphEdge } from './types';

export class DependencyGraph {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge[]> = new Map();

  public addNode(node: GraphNode): void {
    if (!this.nodes.has(node.id)) {
      this.nodes.set(node.id, node);
      this.edges.set(node.id, []);
    }
  }

  public addEdge(edge: GraphEdge): void {
    // If the target node doesn't exist (e.g., an external module like 'react'),
    // we might choose to skip it or add a dummy external node.
    // For now, we only care about internal edges where both nodes are in the graph.
    // However, we record all edges that are resolved to absolute paths.
    
    let sourceEdges = this.edges.get(edge.sourceId);
    if (!sourceEdges) {
      sourceEdges = [];
      this.edges.set(edge.sourceId, sourceEdges);
    }
    
    // Prevent duplicate edges
    const exists = sourceEdges.some(e => e.targetId === edge.targetId && e.isDynamic === edge.isDynamic && e.isTypeOnly === edge.isTypeOnly);
    if (!exists) {
      sourceEdges.push(edge);
    }
  }

  public getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  public getOutgoingEdges(nodeId: string): GraphEdge[] {
    return this.edges.get(nodeId) || [];
  }

  public getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  public getAllEdges(): GraphEdge[] {
    const allEdges: GraphEdge[] = [];
    for (const edges of this.edges.values()) {
      allEdges.push(...edges);
    }
    return allEdges;
  }
}
