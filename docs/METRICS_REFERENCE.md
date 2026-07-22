# Metrics Reference

This document outlines the architectural and git metrics calculated by the Insights Engine. All metrics are derived deterministically from existing file sizes, dependency graph edges, and git commit history without relying on external AI APIs.

## 1. Circular Dependencies
**Definition:** Strongly connected components (cycles) within the repository graph where module A depends on B, and B depends on A.
**Algorithm:** Computed using Tarjan's Strongly Connected Components algorithm over the directed dependency graph constructed from the `DependencyGraphData`.

## 2. Orphan Files
**Definition:** Parseable source files (`.ts`, `.tsx`, `.js`, `.jsx`, `.cjs`, `.mjs`) that have neither incoming dependencies (fan-in = 0) nor outgoing dependencies (fan-out = 0). Non-source files (Markdown, JSON, images, other languages) are excluded, since the parser never produces edges for them.
**Use Case:** Identifying dead code or standalone scripts that might need integration or removal. Note that legitimate entry points (e.g. a CLI script) also appear here.

## 3. Dependency Hotspots (Top Fan-In)
**Definition:** The files with the highest number of incoming dependencies. These are core modules deeply integrated into the system.
**Algorithm:** Count of incoming edges (`targetId`) mapped by node.

## 4. Fan-In / Fan-Out Metrics
- **Fan-In:** The number of modules that import a given module.
- **Fan-Out:** The number of external modules a given module imports.
- **Average Fan-In:** Total incoming edges divided by the number of parseable source files in the graph.

## 5. Longest Dependency Chain (Max Depth)
**Definition:** The longest sequence of continuous imports. High values indicate complex nesting that can slow down build times or increase mental overhead.
**Algorithm:** Depth-First Search (DFS) with memoization starting from nodes with an in-degree of 0.

## 6. Largest Modules
**Definition:** Directories (modules) ranked by the aggregate size of all files contained within them (including sub-directories).

## 7. Most Active Git Files
**Definition:** The files modified most frequently across the repository's git commit history.
**Algorithm:** Counting the frequency of file occurrences in the `--name-only` payload appended to the git log output. Repo-relative git paths are joined to absolute file paths deterministically via the repository root.

## 8. File Type Distribution
**Definition:** Total count of files grouped by their file extension.

## 9. Instability (Robert Martin's I)
**Definition:** I = Ce / (Ca + Ce), where Ce (efferent coupling) = fan-out and Ca (afferent coupling) = fan-in. Ranges from 0 (maximally stable: many dependents, few dependencies) to 1 (maximally unstable). Defined as 0 for uncoupled modules, where the ratio is mathematically undefined.

## 10. Module Health Score
**Definition:** A composite heuristic from 0 (critical) to 100 (healthy):
`100 − 40·I − 30·(fanIn / maxFanIn) − 20·(commits / maxCommits) − 10·[in cycle]`
The weights are heuristic (not derived from an external standard) and are intended for relative ranking within a repository, not cross-repository comparison.

## 11. Average Dependencies / Graph Density
**Definition:** Average out-degree = E / N (imports per source file), and directed edge density = E / (N·(N−1)) expressed as a percentage, where N counts parseable source files. Real dependency graphs are sparse, so density values are typically far below 1%.

## 12. Package Cohesion
**Definition:** Per directory: internal edges / (internal + boundary-crossing edges). 1 means the package is fully self-contained; 0 means every dependency crosses the package boundary. This is a cohesion measure — it is *not* Robert Martin's "Abstractness" metric, which requires type-level analysis.
