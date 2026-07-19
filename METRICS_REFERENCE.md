# Metrics Reference

This document outlines the architectural and git metrics calculated by the Insights Engine. All metrics are derived deterministically from existing file sizes, dependency graph edges, and git commit history without relying on external AI APIs.

## 1. Circular Dependencies
**Definition:** Strongly connected components (cycles) within the repository graph where module A depends on B, and B depends on A.
**Algorithm:** Computed using Tarjan's Strongly Connected Components algorithm across the directed acyclic graph constructed from the `DependencyGraphData`.

## 2. Orphan Files
**Definition:** Files that have neither incoming dependencies (fan-in = 0) nor outgoing dependencies (fan-out = 0).
**Use Case:** Identifying dead code or standalone scripts that might need integration or removal.

## 3. Dependency Hotspots (Top Fan-In)
**Definition:** The files with the highest number of incoming dependencies. These are core modules deeply integrated into the system.
**Algorithm:** Count of incoming edges (`targetId`) mapped by node.

## 4. Fan-In / Fan-Out Metrics
- **Fan-In:** The number of modules that import a given module.
- **Fan-Out:** The number of external modules a given module imports.
- **Average Fan-In:** Total incoming edges divided by the total number of files in the graph.

## 5. Longest Dependency Chain (Max Depth)
**Definition:** The longest sequence of continuous imports. High values indicate complex nesting that can slow down build times or increase mental overhead.
**Algorithm:** Depth-First Search (DFS) with memoization starting from nodes with an in-degree of 0.

## 6. Largest Modules
**Definition:** Directories (modules) ranked by the aggregate size of all files contained within them (including sub-directories).

## 7. Most Active Git Files
**Definition:** The files modified most frequently across the repository's git commit history.
**Algorithm:** Counting the frequency of file occurrences in the `--name-only` payload appended to the git log output.

## 8. File Type Distribution
**Definition:** Total count of files grouped by their file extension.
