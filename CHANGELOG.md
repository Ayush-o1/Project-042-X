# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-07-22

### Security
- Backend now binds to `127.0.0.1` only and rejects requests with non-local `Host` headers (DNS-rebinding protection).
- CORS restricted to localhost origins (configurable via `ALLOWED_ORIGINS`).
- File-content endpoint now serves only files discovered by the scanner and verifies physical location with `realpath` (symlink-safe path-traversal protection).
- Path traversal attempts now return `403` with a typed error instead of `500`; unexpected errors no longer leak internal messages.
- Request validation requires absolute, length-bounded paths.

### Fixed
- **Largest Modules** aggregated sizes over absolute path ancestors, ranking `/Users`-style directories above real modules; sizes are now computed over repo-relative folders.
- **Orphan detection** flagged every non-JavaScript/TypeScript file as a dead-code candidate; it now considers only parseable source files, and average fan-in / graph density use the source-file count.
- Per-file **commit counts** were joined by filename suffix, causing files with common names (e.g. `index.ts`) to share counts; the join is now deterministic via the repository root.
- Exported JSON reports and session files silently dropped `Map`/`Set` data (`moduleMetrics`, cycle/hotspot sets); they are now serialized explicitly, and imported sessions recompute insights from raw data.
- First click on a sidebar folder did nothing due to inconsistent expand defaults.
- Removed the `Cmd+W` shortcut — browsers do not allow intercepting it, so it closed the browser tab and destroyed the session.
- Graph PNG/SVG export from a non-Architecture tab failed with a generic error; it now explains that the Architecture tab must be open.
- "Navigate to graph" from Insights could silently fail while the lazy-loaded graph view was mounting; the highlight now persists until the graph consumes it.
- The "Unstable Modules" KPI was capped at 10 by an upstream slice; it now counts all source modules with instability > 0.7. The "Hotspot Files" KPI (which always displayed 10) was replaced by "Max Fan-In".
- Fixed the `isTypeOnly` flag on `import x = require(...)` declarations in the SWC parser.

### Changed
- The edge-density KPI was renamed from "Architecture Complexity" to average dependencies per source file with the exact density shown alongside; the package-level "abstractness" field was renamed to "cohesion" to match what it actually measures.
- Documentation audited against the implementation (rendering technology, data-transfer model, supported syntax, Node/React versions, metric names).
- Onboarding: root-level install/dev scripts, corrected `.env.example` (port 5001, `/api/v1`), and a built-in API URL default so a clean clone runs without any `.env` files.
- Removed internal preparation notes and OS artifacts from the repository.

## [1.0.0] - 2026-07-19

### Added
- **Core Architecture Scanner**: High-performance dependency AST traversal engine utilizing SWC.
- **Git Timeline Engine**: Deep integration with Git to track architectural evolution and commit history.
- **Dependency Graph Visualizer**: A rich, glassmorphic interactive node-based viewer built on React Flow and Dagre.
- **Insights Dashboard**: Algorithmic reporting on circular dependencies, orphaned files, maximum dependency chains, and fan-in metrics.
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
