# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-07-19
### Added
- **Core Architecture Scanner**: High-performance dependency AST traversal engine.
- **Git Timeline Engine**: Deep integration with Git to track architectural evolution.
- **Dependency Graph Visualizer**: A rich, glassmorphic interactive node-based viewer built on React Flow.
- **Insights Dashboard**: Algorithmic reporting on cyclomatic complexity, orphaned files, and fan-in metrics.
- **Export & Session Persistence**: Save repository snapshots to IndexedDB and export them to PDF, Markdown, JSON, SVG, and PNG.
- **Snapshot Diffing**: Compare two architectural snapshots to automatically determine dependency and health delta.

### Changed
- Complete transition to `verbatimModuleSyntax` for strict TypeScript imports.
- Re-architected backend `GitIntelligenceEngine` to capture `--name-only` diffs for activity hotspot calculation.

### Fixed
- Stabilized massive layout rendering for repositories exceeding 5,000 files using `dagre` and React Virtualization.
- Addressed memory leak in the backend AST parser by implementing incremental stream reading.
