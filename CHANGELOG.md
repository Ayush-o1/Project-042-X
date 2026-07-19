# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-07-19

### Added
- **Core Architecture Scanner**: High-performance dependency AST traversal engine utilizing SWC.
- **Git Timeline Engine**: Deep integration with Git to track architectural evolution and commit history.
- **Dependency Graph Visualizer**: A rich, glassmorphic interactive node-based viewer built on React Flow and Dagre.
- **Insights Dashboard**: Algorithmic reporting on cyclomatic complexity, orphaned files, maximum dependency chains, and fan-in metrics.
- **Export & Session Persistence**: Save repository snapshots seamlessly to IndexedDB and export them to PDF, Markdown, JSON, SVG, and PNG.
- **Code Viewer**: Integrated source code inspection directly linked to the architecture nodes.
- **Command Palette**: Rapid navigation and search for files across the workspace.

### Changed
- Standardized data schemas across frontend and backend, resulting in a robust, type-safe API boundary.
- Refactored `insightsEngine` to incorporate defensive checks and memoization, significantly improving rendering performance.

### Fixed
- Resolved a critical infinite re-render loop within `GitGraphView` by decoupling local state from layout effect dependencies.
- Normalized backend API contracts for Git commits and repository files to ensure the frontend successfully renders Insights without runtime crashes.
- Added missing CSS utility classes (`fixed`, `inset-0`, `z-50`, `font-semibold`) to the design system to ensure modal components overlay correctly.
- Corrected invalid `cors` middleware import within the backend `app.ts` to ensure cross-origin resource sharing functions securely.
