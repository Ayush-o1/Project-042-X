# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-07-23

### Performance
- Code Viewer's syntax highlighter now imports `highlight.js/lib/core` plus only the 14 language grammars the app actually requests, instead of the default entry that registers all ~190 bundled languages. The Code Viewer chunk drops from 921.9 KB to 77.3 KB (306.8 KB → 25.5 KB gzip).
- `lib/exportEngine` (jsPDF + html-to-image) is now dynamically imported at the point each export action runs, instead of being statically bundled into the app's initial chunk. It ships as its own ~415 KB chunk that only downloads when a user actually exports something; the main entry chunk drops from 739.2 KB to ~325 KB (234.9 KB → ~100 KB gzip).
- The Architecture graph's Dagre layout pass now runs in a Web Worker (`dagreLayout.worker.ts`) instead of blocking the main thread — the noticeable pause on repos with a few thousand files (previously called out in this file's Performance Notes) is gone. The Git Timeline's layout intentionally stays synchronous, since it's already capped at 500 rendered commits and finishes in single-digit milliseconds.

### Added
- **Saved preferences**: the sidebar can now be manually collapsed on wide viewports (previously only collapsible as an overlay on narrow ones), and the Architecture graph's filter toggles persist as defaults across sessions — both via a new localStorage-backed `usePersistedState` hook.
- **Fuzzy Command Palette search**: replaced substring-only file matching with subsequence fuzzy matching (`lib/fuzzyMatch.ts`, unit tested) — non-contiguous queries like "cvtr" now match "CommandPalette.tsx", consecutive runs and word-boundary starts score higher, and filename matches outrank path-only matches. An empty query now leads with recently-opened files instead of an arbitrary slice of the full file list.
- Retry action on the Code Viewer's file-load error state.

## [1.3.0] - 2026-07-23

### Added
- **Responsive layout system**: a documented breakpoint scale (1440/1280/1024/768/480px) shared between CSS and a new `useMediaQuery` hook. The sidebar becomes a dismissible slide-in overlay below the tablet-landscape breakpoint; the header collapses action-button labels and the wordmark at narrower widths; dashboard KPI/2-up grids and the Dependency Graph's Node Inspector/filter panels all reflow instead of overflowing.
- **Accessibility**: a reusable `useFocusTrap` hook wired into every modal (Settings, Session History, Compare Snapshots, Command Palette) traps Tab navigation and returns focus to the trigger element on close. The main view switcher now uses the ARIA tabs pattern (roving tabindex, arrow-key navigation). Toast notifications are announced via `aria-live`. The file explorer's folders — previously unreachable by keyboard entirely — now use proper `tree`/`treeitem` semantics.
- Global `prefers-reduced-motion: reduce` support.

### Fixed
- The Dependency Graph's Node Inspector and its toolbar/filter/legend column occupied the exact same top-right corner, so opening the inspector visually buried the search/zoom/filter controls underneath it. The toolbar now shifts to make room when both are open.
- `var(--accent-blue)`, referenced in three places (`FolderNode`, `CustomEdge`, `layoutUtils`) but never defined anywhere in the stylesheet, silently rendered selected-folder borders and outgoing git-edge highlights with an invalid color. Replaced with the actual `var(--accent)` token.
- `--text-tertiary` failed WCAG AA contrast (~2.6:1 against the app background) for the small secondary/caption text it's used for everywhere; lightened to ~5:1 on the same hue.

### Changed
- Design system consistency pass: inline styles and ad-hoc `onMouseEnter`/`onMouseLeave` DOM-mutation hover handlers across the layout, insights, viewer, and graph components were replaced with the existing (and newly extended) CSS design-system class vocabulary, so equivalent UI elements now share the same spacing, radius, shadow, and transition tokens.

## [1.2.0] - 2026-07-22

### Changed
- **Analysis lifecycle**: `RepositoryService` no longer caches a single global "current repository." Each analysis is now an addressable resource keyed by an `analysisId` returned from `POST /analyze`; every other endpoint accepts it and resolves strictly to that analysis. Requests without an id fall back to the most recent analysis, so existing clients are unaffected. The 3 most recent analyses are kept in memory; older ones are evicted.
- **Typed API boundary**: added `frontend/src/api/{contracts,client}.ts`. Backend wire shapes are described once and converted to frontend domain models in a single place, removing the `as any[]` normalization that previously lived inline in the store.
- **Insights computed once**: `computeInsights` now runs a single time per completed analysis (or loaded session) and is stored as `state.insights`; the graph view, dashboard, header exports, and keyboard-shortcut handlers all read the same cached result instead of each recomputing Tarjan's SCC and DFS independently.
- **Zustand selectors**: every component previously called `useRepositoryStore()` with no selector, subscribing to the entire store. All consumers now use field-level or shallow selectors; the sidebar's per-row component now reads only its own expanded/selected/favorite state, so toggling one folder no longer re-renders the whole (virtualized) file list.

### Performance
- Dependency-graph hover highlighting rebuilt on a prebuilt forward/reverse adjacency index, replacing an O(V·E) full edge-list rescan per hover with O(V+E). The Node Inspector's dependents/dependencies lists use the same index instead of filtering all edges on every render.
- Git Timeline now caps rendered commits at the 500 most recent (of whatever matches the active filters); analysis itself caps git history at 20,000 commits by default via a newly-wired `maxCommits` option. Both are configurable server-side; neither existed before, so very large repositories could previously exhaust memory during analysis or freeze the tab during layout.
- `GET /repository/git` accepts `offset`/`limit` for paged history reads and reports `totalCommits`.

### Added
- Frontend test suite (Vitest): 37 tests covering `computeInsights` (cycle detection, orphan/source filtering, Martin instability, deterministic git joins, Map/Set serialization), dagre layout utilities, and the Zustand store (analysis lifecycle, cancellation, folder toggling, tab/file navigation).
- Backend tests for the analysis registry: id isolation under concurrent analyses, 404 on unknown/evicted ids, eviction bound, and scanner-membership file access.

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
