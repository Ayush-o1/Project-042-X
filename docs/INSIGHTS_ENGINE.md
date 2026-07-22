# Insights Engine

The Insights Engine represents the intelligence layer of Project 042-X. Instead of relying on unreliable and opaque external LLMs or arbitrary scoring metrics, the Insights Engine computes hard, deterministic engineering facts about a repository's health directly from its dependency AST and Git history.

## Architecture

The engine is primarily housed in the frontend to leverage the already-fetched repository payload, saving significant redundant parsing time and backend compute.

### Backend Responsibilities
The `GitIntelligenceEngine` in the backend was extended with a `--name-only` log flag. This is the only backend modification. By shipping file-level changes to the frontend alongside the commit hashes, the backend provides the raw ingredients necessary for historical frequency analysis without performing the aggregation itself.

### Frontend Responsibilities
The `insightsEngine.ts` file acts as the algorithmic core. `computeInsights` runs once, inside the `useRepositoryStore.analyze()` action (or when a saved session is loaded), and the result is cached as `state.insights`:
1. **Graph Metrics**: Builds adjacency lists from the dependency nodes/edges, runs Tarjan's SCC to detect cycles, and memoized DFS for maximum-depth calculations. Coupling metrics (orphans, average fan-in, graph density) are computed over parseable source files only, since only those can carry edges.
2. **Git Aggregations**: Grouping `--name-only` arrays across all commits to find the absolute most active files (churn hotspots).
3. **File System Aggregations**: Summing file sizes grouped by repo-relative directory paths to discover the largest sub-modules.

## Performance Considerations
- **In-Memory Graphs**: Graph traversal is extremely fast (milliseconds for thousands of nodes) since it's operating on raw Javascript objects, not DOM nodes.
- **Computed once, shared everywhere**: the Insights dashboard, the Architecture graph overlays, header exports, and the keyboard-shortcut handlers all read the same `state.insights` rather than each recomputing it — earlier versions recomputed insights independently in every consumer.
