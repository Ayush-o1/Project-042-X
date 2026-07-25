# Project 042-X Architecture

## High-Level Architecture

Project 042-X employs a localized Backend-for-Frontend (BFF) architecture designed for high-performance, synchronous data processing. It is composed of a Node.js API backend and a React-based Single Page Application (SPA) frontend.

The application does not use a traditional database. Instead, the backend reads raw file bytes, parses ASTs, and interacts with the `.git` binary natively to construct a unified intelligence model in-memory. This model is served to the frontend, which handles complex mathematical graph layouts, calculates derived insight metrics, and renders the interactive UI. Data persistence is handled client-side via IndexedDB.

---

## Backend Engine

The backend is a pipeline of independent analytical engines orchestrated by the `RepositoryIntelligenceEngine`.

### 1. Repository Scanner
Performs a recursive, depth-first traversal of the specified filesystem path.
- Resolves absolute vs relative paths.
- Tracks file sizes and language classifications.
- Explicitly ignores heavy directories (`node_modules`, `dist`, `build`, `.git`) to minimize I/O overhead.

### 2. AST Engine
Responsible for semantic code understanding.
- Utilizes `@swc/core` (Rust-based) to parse TypeScript and JavaScript files into Abstract Syntax Trees (AST).
- The `SwcParser` walks the AST to extract ES module `import` and `export` statements (including dynamic imports and re-exports).
- A `PathResolver` transforms relative import specifiers into absolute workspace paths (probing extensions and `index.*` files) to build a deterministic static dependency graph. Bare-module imports (`react`, `express`) and tsconfig path aliases are not resolved.

### 3. Git Engine
Extracts version control metadata using a `simple-git` wrapper.
- Parses the Git commit tree to identify parent-child topologies (including merge commits).
- Captures `--name-only` diffs for every commit.
- Accepts a `maxCommits` cap (default 20,000, newest first) so history on very large repositories doesn't grow unbounded in memory.
- Provides the raw data required for the frontend to calculate file modification hotspots and activity timelines.

### 4. Analysis Registry
`RepositoryService` holds completed analyses as addressable, in-memory resources rather than a single global "current repository."
- Each `POST /analyze` returns an `analysisId`; every other endpoint accepts it as a query parameter and resolves strictly to that analysis, so two analyses running close together (or in different browser tabs) can never serve each other's data.
- Requests without an id fall back to the most recently completed analysis.
- The three most recent analyses are kept; older ones are evicted to bound memory.
- `GET /repository/git`, `GET /repository/files`, and `GET /repository/dependencies` all accept `offset`/`limit` for paged reads (omitting both still returns everything, unchanged, for any caller that doesn't opt in). The frontend always pages through these in fixed-size chunks rather than requesting one unbounded payload. `dependencies` pages by node; each page's edges are that page's nodes' own outgoing edges, so concatenating every page reconstructs the exact same graph as an unpaginated fetch.
- Per-analysis results that are expensive to rebuild and don't change for the lifetime of the entry are cached on it: the repo root's resolved real path (used by every Code Viewer file-content read's path-traversal check) and the git commit history flattened to an array (used by every `/git` read).

---

## Frontend Engine

The frontend is built with React 19, Vite, and Zustand. It receives the raw analysis data and computes the presentation layer.

### 1. API Client (`src/api`)
`contracts.ts` describes the backend's exact wire shapes; `client.ts` is the only place that calls `fetch` and converts those shapes into the frontend's domain models. Components and the store never see raw backend JSON.

### 2. State Management (Zustand)
The `useRepositoryStore` acts as the single source of truth.
- Carries the `analysisId` returned by `/analyze` and passes it to every subsequent request.
- Computes `insights` exactly once per completed analysis (or loaded session) and exposes it as state, rather than each consumer recomputing it.
- Manages the active tab state, open files array, and modal visibility.
- Handles the `AbortController` for graceful cancellation of heavy API requests.
- Components subscribe with field-level or shallow selectors so unrelated state changes (e.g. a progress tick) don't re-render the whole tree.

### 3. Insights Engine
A purely mathematical module that calculates derived metrics from the dependency graph and Git history.
- **Circular Dependencies**: Implements Tarjan's Strongly Connected Components (SCC) algorithm to detect cycles in the dependency DAG.
- **Dependency Chains**: Uses memoized Depth-First Search (DFS) to identify the maximum import depth.
- **Fan-In / Hotspots**: Calculates the in-degree of all nodes to flag over-coupled files.
- **Git Activity**: Aggregates file modification frequencies to determine the most active modules.

### 4. Graph Engine (Architecture: React Flow + Dagre; Git Timeline: virtualized list)
Architecture and Git Timeline solve different rendering problems and use different techniques — neither is a whole-graph dagre layout anymore.

**Architecture** — a treemap overview plus a focused-neighborhood canvas, not a single whole-repository graph:
- `ModuleTreemap` renders one cell per top-level folder using a squarified treemap algorithm (`treemapLayout.ts`), colorable by health score, hotspot (fan-in), or dominant file type.
- Selecting a file or folder computes a depth-limited neighborhood (`getFocusedLayout` in `layoutUtils.ts`): a bidirectional BFS out to a configurable hop depth (1 / 2 / 3 / all), laid out with two independent `dagre` passes (dependencies to one side, dependents to the other, Left-to-Right) sharing the selected node(s) as a common anchor. Nothing outside the requested depth is computed or rendered.
- This layout pass runs in a dedicated Web Worker (`dagreLayout.worker.ts`) so it never blocks the main thread, and the canvas stays mounted (hidden, not unmounted) when switching to another tab and back, so returning to Architecture reuses the existing layout instead of recomputing it against unchanged input.
- Coordinates are passed to `@xyflow/react` (React Flow), which renders nodes as DOM elements and edges as SVG, and handles zooming, panning, and viewport virtualization.
- Forward/reverse adjacency indexes are built once per loaded graph; hover highlighting walks these indexes (O(V+E) per hover) instead of rescanning the edge list at every traversal step.

**Git Timeline** — a virtualized list, not a graph layout, since mounting tens of thousands of commit nodes as DOM/SVG elements is unusable regardless of layout correctness:
- `assignCommitLanes` (`commitLanes.ts`) assigns each commit a lane number from its parent/child topology (the same technique `git log --graph` uses) — this is the only "layout" step, and it's a plain synchronous pass over the commit list, not dagre.
- Rendering uses `react-virtuoso`'s `GroupedVirtuoso` (grouped by calendar day) to virtualize the row list — only on-screen rows exist as DOM nodes, with no cap on how many commits can be analyzed or scrolled through.
- Commits can be grouped/collapsed by calendar day (opt-in); the pinned/selected commit and day-grouping state live in the Zustand store so they survive switching tabs and coming back.

### 5. Export & Session Engine
Provides zero-configuration persistence.
- **Sessions**: Dumps the entire Zustand store (including AST models) into `idb-keyval` (IndexedDB). Allows instant restoration of massive repositories without re-running the backend analysis.
- **Exports**: Converts the active React Flow canvas to high-resolution PNG/SVG using `html-to-image`, or generates paginated PDF reports using `jspdf`. Both libraries are dynamically imported only when an export action actually runs, instead of bloating the app's initial bundle.
- **Preferences**: `usePersistedState` mirrors a small, explicit set of durable UI preferences (sidebar collapse, graph filter defaults) to `localStorage` — a lighter-weight sibling to the session engine's full-analysis IndexedDB snapshots, not a replacement for them.

---

## Data Flow & Request Lifecycle

1. **Initialization**: User submits an absolute filesystem path in the UI.
2. **Analysis Request**: Frontend issues a `POST /api/v1/repository/analyze` request.
3. **Backend Orchestration**: `RepositoryIntelligenceEngine` runs the Scanner→AST pipeline and the Git engine as concurrent async operations, then merges the results into a `UnifiedRepositoryModel` held by `RepositoryService` under a fresh `analysisId`.
4. **Staged Transfer**: The frontend fetches files, dependencies, and git data via three sequential resource fetches (each carrying `analysisId`), so the UI can populate incrementally. Each of the three pages through the underlying endpoint in fixed-size chunks (`offset`/`limit`) rather than one unbounded request, then assembles the full result before handing it to the store.
5. **Normalization**: `src/api/client.ts` converts backend wire shapes into frontend domain models (e.g., serialized dates to timestamp strings) before the data ever reaches the store.
6. **Metric Computation**: `computeInsights` (Tarjan's SCC, memoized-DFS depth, coupling, and health metrics) runs once per completed analysis, offloaded to a dedicated Web Worker so this doesn't block the main thread right as results are about to render; the result is cached in the store.
7. **Layout Calculation**: when a file or folder is focused in Architecture, `getFocusedLayout` computes X/Y coordinates for that depth-limited neighborhood only, running inside a Web Worker so layout never blocks the main thread; an adjacency index is built alongside for O(V+E) hover highlighting. The Git Timeline doesn't have a layout step — commit lanes are assigned synchronously and rows are virtualized (see Graph Engine above).
8. **Rendering**: React Flow renders the Architecture canvas's nodes (DOM) and edges (SVG); the Git Timeline renders as a `react-virtuoso`-virtualized row list. Both virtualize offscreen elements.

---

## Directory Structure

```text
Project 042-X/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── controllers/      # Route handlers
│   │   │   ├── dtos/             # Data Transfer Objects & Zod Schemas
│   │   │   ├── middlewares/      # Error boundaries, host guard, and validation
│   │   │   ├── routes/           # Express router definitions
│   │   │   ├── services/         # RepositoryService — the in-memory analysis registry
│   │   │   └── types/            # Backend-internal TypeScript interfaces
│   │   ├── core/
│   │   │   ├── ast/              # SWC parsing and path resolution
│   │   │   ├── engine/           # Intelligence orchestration
│   │   │   ├── errors/           # Typed domain errors
│   │   │   ├── git/              # simple-git wrapper
│   │   │   └── scanner/          # Filesystem traversal
│   │   └── server.ts             # Application entry point
├── frontend/
│   ├── src/
│   │   ├── api/                  # Wire contracts and the typed fetch client
│   │   ├── components/
│   │   │   ├── graph/            # React Flow and Dagre implementations
│   │   │   ├── insights/         # Dashboard and metric KPI components
│   │   │   ├── layout/           # AppShell, Sidebar (file explorer), Header, Modals
│   │   │   ├── timeline/         # Git Timeline: lane assignment and the virtualized row list
│   │   │   ├── ui/               # Shared primitives (Toast)
│   │   │   └── viewer/           # Code Viewer implementation
│   │   ├── hooks/                # useMediaQuery, useFocusTrap, useDelayedFocus, usePersistedState, useToast
│   │   ├── lib/                  # Export, Session, Insight, and fuzzy-match algorithms
│   │   ├── store/                # Zustand global state
│   │   ├── types/                # Strict TypeScript interfaces
│   │   └── index.css             # Vanilla CSS design system
```
