# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.0] - 2026-08-03

### Added
- **Architecture Explorer redesign** — the dependency-graph tab, taken from "works" to a full architecture-exploration surface across nine incremental, independently-verified phases:
  - **Visual signal clarity**: a legend reconciling node size (structural importance), left-border color (health score), and icon badges (cycle/hotspot/syntax-error) — previously three independent, unexplained encodings. Edge highlight arrowheads now recolor with the highlighted stroke instead of staying a static dim color (React Flow resolves the arrowhead from a separate marker definition, kept in sync on every highlight-state change). Outgoing/incoming highlight contrast widened from a 0.5px stroke difference to 1px. Dashed strokes distinguish dynamic (`import()`) and type-only (`import type`) edges — data the AST parser already produced but the canvas never rendered. A numeric health value now appears on-node (not just border color), and a `hasSyntaxError` badge surfaces files the parser couldn't fully analyze.
  - **Node Inspector enrichment**: the "in a cycle" badge expands into the actual SCC chain(s) a file participates in; a folder-level view surfaces cohesion/internal/external edge counts as first-class UI instead of a hover-tooltip-only value; the language badge reads the already-computed `FileModel.language` field instead of re-deriving it from the extension.
  - **Navigation**: React Flow's built-in `MiniMap` and `Controls` (previously unused); a textual breadcrumb for the current folder-focus path; back/forward history reusing the existing layout LRU cache for instant revisits.
  - **Accessibility**: `:focus-visible` styling on graph nodes (previously none existed on the canvas or its nodes at all); a non-color health signal alongside the color one; a dismissible on-canvas shortcuts panel surfacing ⌘K, the 1–4 depth keys, arrow traversal, Enter/⌘Enter, Escape, and pin — none of which had any onboarding surface before.
  - **Interaction correctness**: single click now selects/previews a node without forcing a recenter+relayout; double-click recenters. Fixed a real bug where keyboard arrow-traversal could select a node outside the currently-rendered depth-limited neighborhood, dimming the entire visible canvas to near-invisible with no recovery — traversal now recenters on every step. Keyboard-selected nodes get the same visual treatment as a mouse click. The canvas now receives programmatic focus after search/treemap/shortcut selection, so arrow keys work immediately instead of requiring a manual click first. New shift/ctrl/cmd-click multi-select opens a side-by-side comparison panel (health/fan-in/fan-out/instability) instead of the single-file Inspector.
  - **Hierarchical treemap**: the Modules panel previously rendered every leaf directory as a flat, unrelated sibling rectangle. It now builds a real parent/child tree and shows one level at a time — folders with subfolders aggregate their descendants' metrics and support click-to-drill/double-click-to-select; a breadcrumb supports jumping back to any ancestor level; the panel auto-navigates to follow the graph's own focus (search, a risk shortcut, keyboard traversal).
  - **Layout engine**: nodes previously rendered exactly one fixed connection point per side, so every edge into/out of a hub converged on the same pixel — a visual starburst instead of a fanned-out set of connections. Edges now attach to one of several handles distributed along the node's height/width, assigned per-node from the actually-rendered edge set. Multi-file folder-focus (many simultaneous BFS centers) could previously leave unrelated disconnected components silently overlapping — components are now detected and stacked with a guaranteed non-overlapping gap. A new orientation toggle switches dagre's layout direction (left-right / top-bottom); an edge-visibility toggle declutters a dense hub down to "what files are here"; labels now hide below ~35% zoom instead of rendering as illegible sub-pixel text.
  - **Small/large-repo tuning**: the "nothing focused yet" prompt now falls back to the most-connected files, and finally to a plain file-count message, instead of degrading to a bare icon when there are no health-risk files to suggest. The large-neighborhood reduction notice now explains when a folder-focus (many simultaneous centers) is why depth had to be reduced, rather than using identical wording for both causes. A folder with no further subfolders no longer fills the entire treemap panel with one giant, information-free rectangle.
  - Performance foundation: the hover-driven dependency-highlight recompute (a full adjacency walk plus a remap of every rendered node/edge) is now debounced instead of re-running on every single `mouseenter`/`mouseleave`; cycle/hotspot/orphan id sets are memoized on `insights` instead of rebuilt inside the render-overlay effect on every filter tweak.
  - 21 layoutUtils tests (5 new — handle fan-out, disconnected-component separation, orientation), full frontend/backend suites green throughout. Verified at every phase via Playwright against this repository, a constructed all-orphan repo, and a constructed tiny two-file repo, with zero console/page errors.

## [1.6.4] - 2026-08-02

### Fixed
- **Architecture page crashing with "Uncaught ReferenceError: window is not defined" in production**: the depth-limited layout worker (`dagreLayout.worker.ts`) threw this the instant `dagre.layout()` first needed one of its internal lodash-backed helpers, on every repository dense enough to reach that code path — reproduced against the exact repo/folder from the report. Root cause: `dagre` and its own dependency `graphlib` are legacy CommonJS packages; three of their internal files (`dagre/lib/lodash.js`, `dagre/lib/graphlib.js`, `graphlib/lib/lodash.js`) each contain an ambient-environment-detection pattern — "if a real CommonJS `require` exists, use it; otherwise fall back to a `window.*` global set by an old-style `<script>` tag." Vite's dev server (esbuild dependency pre-bundling) resolves the `require` branch ahead of time, so this never showed up locally; the production build's worker-chunk bundling does not reliably do the same, so at runtime `typeof require` evaluated to `"undefined"`, all three files fell through to the `window` branch, and a Web Worker's global scope has no `window` at all — not even `undefined`, the bare identifier itself is undeclared, so merely referencing it throws. (A `MarkerType` value import from `@xyflow/react` was also removed from this same file during investigation — an unrelated, unnecessary dependency on a DOM UI library from worker-reachable code, not itself the cause, but a real cleanup regardless.) Fixed by providing dagre/graphlib with a real, synchronous `require()` on the global scope for exactly the specifiers they ask for (`dagreCjsShim.ts` / `dagreCjsShim.lodash.ts`, imported before `dagre` — ES module import ordering guarantees the shim finishes registering first), so their own intended code path runs instead of ever reaching the `window` fallback. Verified against a production build (`npm run build` + `vite preview`, not just dev) across a local repository and two remote GitHub repositories of different sizes, clicking through multiple Architecture folders in each with zero console or page errors.

## [1.6.3] - 2026-08-02

### Changed
- **Onboarding redesigned around one primary action**: the repository path input is now the hero itself — a large, centered control on the landing page — instead of a button that pointed a first-time visitor's attention up at an always-visible header bar. The header's search bar no longer renders at all until there's something to do with it: hidden entirely before a repository is analyzed, replaced with a non-editable "Analyzing repository…" status during analysis, and only reappearing afterward, repurposed as a quick-switch to open a different repository (distinct placeholder copy, distinct element id, so it reads as a different control with a different job). The landing page's 6-item feature grid — marketing copy competing with the one thing a visitor needs to find — was replaced with a single quiet capability line at the very bottom of the page, well below the fold of the input.
- Added example-input chips (a local path and a GitHub URL, or two GitHub URLs under `PUBLIC_DEMO_MODE`) that fill the hero input on click, and drag-and-drop onto it: dropping a link (e.g. from a GitHub tab) fills the complete URL; dropping a local folder fills its name with the cursor parked at the start, since the browser's File/DataTransfer APIs never expose an absolute filesystem path — a platform security boundary, not a gap in this integration — surfaced to the user via an inline toast rather than silently only-half-working.
- The "Analysis Failed" screen now has a **Try Again** button (backed by a new `clearError` store action) that returns to the onboarding hero instead of being a dead end — previously the only way back after a failed analysis was a full page reload, since the header's input (the only other path input in the app) is now intentionally hidden in that state too.

## [1.6.2] - 2026-08-02

### Fixed
- **Architecture page hanging on "Laying out neighborhood…"**: focusing a file or folder in a densely-connected neighborhood (common on real-world cloned repos with hub/barrel files) could leave the spinner running for tens of seconds or, if the layout worker threw or failed to load, indefinitely with no recovery. Root-caused by benchmarking the installed `dagre@0.8.5` directly: `dagre.layout()` is severely superlinear in edge count (~1.2s at 700 edges, ~37s at 2800), and `getFocusedLayout` calls it twice per request with no cap on how many edges a neighborhood could include. Fixed with four changes: (1) a cheap pre-check (BFS + edge count, no dagre) that auto-steps the requested depth down — and, for a genuine mega-hub where even depth 1 is too dense, truncates to the highest in-degree files — before ever reaching dagre, surfaced to the user via an inline notice with a "Load full anyway" override rather than silently rendering something other than what the depth stepper claims; (2) a `worker.onerror` handler, previously entirely absent, so a worker failure resolves the spinner into a Retry state instead of hanging forever; (3) a timeout safety net with Cancel, in case an unanticipated case still slips past the budget; (4) a small LRU layout cache so revisiting a recently-viewed neighborhood is instant. Verified against the exact remote-repo/folder combination from the original report (a clean re-layout in ~560ms where it previously hung).

## [1.6.1] - 2026-08-02

### Fixed
- **Mobile header layout**: below the tablet-portrait breakpoint (768px), the header's single-row layout left the repository path input — the app's primary entry point — squeezed to just a few pixels wide once the logo, repo-name badge, and every action icon were accounted for, even with their text labels already hidden. The header now wraps onto two rows below that breakpoint (icons on row one, a full-width path input on row two) instead of letting the input get crushed. Verified from 375px through 1024px, including the sidebar overlay's position under the now-taller header.
- **Opaque 500 on a nonexistent analysis path**: analyzing a local path that doesn't exist returned a generic "An unexpected error occurred" instead of the app's own typed, specific error. Root cause: `simple-git`'s constructor validates its target directory synchronously and throws its own raw Error outside of `GitIntelligenceEngine`'s existing `verifyRepository` try/catch, so it reached the API unwrapped and fell through to the catch-all 500 handler instead of the existing `GitRepositoryError` → 422 mapping. Added a regression test.

### Changed
- Renamed the Keyboard Shortcuts modal's internal `aria-labelledby` id from the stale `settings-title` (left over from before 1.6.0's "Preferences" → "Keyboard Shortcuts" relabel) to `keyboard-shortcuts-title`. No user-facing effect; a maintainability cleanup only.

## [1.6.0] - 2026-07-23

### Fixed
- Architecture graph folder-collapse state, the pinned/selected node, and Git Timeline day-grouping now live in the Zustand store instead of local component state, so they survive switching tabs and coming back instead of silently resetting.
- The header's gear icon was labeled "Preferences" but opened a read-only keyboard-shortcut list; relabeled to match. The Command Palette's in-app copy no longer implies it runs arbitrary commands — it's a file switcher, and now says so.

### Changed
- Insights Dashboard panels are now grouped into three labeled sections (Overview, Architecture Signals, Git Activity) instead of one flat 12-panel stack.
- Added a skip-to-content link for keyboard and screen-reader users.

### Refactored
- Deduplicated the fuzzy-search ranking logic that was independently reimplemented in the Sidebar filter, Command Palette, and both graph toolbars into one shared `rankByFuzzyMatch` utility in `lib/fuzzyMatch.ts` (unit tested).
- Split `DependencyGraphView.tsx` (1,187 lines) into `DependencyGraphView.tsx`, `ArchitectureToolbar.tsx`, and `NodeInspector.tsx`; split `GitGraphView.tsx` into `GitGraphView.tsx` and `GitToolbar.tsx`; split `AppShell.tsx` into `AppShell.tsx` and `EmptyHero.tsx`.
- Extracted the "focus a ref shortly after a modal opens" pattern — previously hand-copied in four modals — into a `useDelayedFocus` hook.
- Backend: enabled `noUnusedLocals`/`noUnusedParameters` in `tsconfig.json` and removed the dead code it caught (an unused constructor parameter, an unused type import, unused test bindings).

## [1.5.0] - 2026-07-23

### Added
- **Git Timeline day grouping**: an opt-in toolbar toggle collapses commit history into one summary node per calendar day (author avatars, commit count, branch-lane color), with click-to-expand back to individual commits. Off by default — the individual-commit view already reads fine for small and medium histories, and this only reduces density when a user asks for it. Redirects and deduplicates edges into the collapsed day using the same technique as the Architecture graph's folder collapse.
- **Jump to latest commit**: a Git Timeline toolbar action that centers and highlights the most recent commit (or its day-group summary, if grouping is on).
- **Collapse All / Expand All** toolbar controls for the Architecture graph, replacing folder-by-folder clicking when a user wants to bulk-expand or re-collapse the whole tree.
- **Related Files panel** in the Code Viewer: a toggleable side panel listing every file that imports, and is imported by, the active file, each a clickable row that opens the file in place.

### Changed
- Graph nodes now animate to their new position when a re-layout occurs (folder collapse, day-group toggle, filter changes) instead of snapping instantly; disabled while a node is being dragged so manual dragging stays 1:1 with the pointer.

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
