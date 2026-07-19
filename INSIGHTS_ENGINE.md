# Insights Engine

The Insights Engine represents the intelligence layer of Project 042-X. Instead of relying on unreliable and opaque external LLMs or arbitrary scoring metrics, the Insights Engine computes hard, deterministic engineering facts about a repository's health directly from its dependency AST and Git history.

## Architecture

The engine is primarily housed in the frontend to leverage the already-fetched repository payload, saving significant redundant parsing time and backend compute.

### Backend Responsibilities
The `GitIntelligenceEngine` in the backend was extended with a `--name-only` log flag. This is the only backend modification. By shipping file-level changes to the frontend alongside the commit hashes, the backend provides the raw ingredients necessary for historical frequency analysis without performing the aggregation itself.

### Frontend Responsibilities
The `insightsEngine.ts` file acts as the algorithmic core. When the `useRepositoryStore` state updates, the engine recalculates:
1. **Graph Metrics**: Using the D3/Dagre graph nodes/edges to construct an adjacency matrix. It runs Tarjan's SCC to detect cycles and DFS for depth calculations.
2. **Git Aggregations**: Grouping `--name-only` arrays across all commits to find the absolute most active files (churn hotspots).
3. **File System Aggregations**: Summing file sizes grouped by their nested directory paths to discover the largest sub-modules.

## Performance Considerations
- **In-Memory Graphs**: Graph traversal is extremely fast (milliseconds for thousands of nodes) since it's operating on raw Javascript objects, not DOM nodes.
- **Lazy Evaluation**: The engine only computes insights when the "Insights" tab is loaded, saving main-thread blocking time during initial load.
