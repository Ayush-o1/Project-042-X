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
- `GET /repository/git` additionally accepts `offset`/`limit` for paged history reads.

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

### 4. Graph Engine (React Flow + Dagre)
Separates topological data from spatial data.
- The backend provides nodes and edges without X/Y coordinates.
- The frontend uses `dagre` to execute a directed graph layout algorithm (Top-to-Bottom for Git, Left-to-Right for Dependencies). The Architecture graph's layout pass runs in a dedicated Web Worker so it never blocks the main thread; the Git Timeline's layout stays synchronous since it's already capped at 500 rendered nodes.
- Coordinates are passed to `@xyflow/react` (React Flow), which renders nodes as DOM elements and edges as SVG, and handles zooming, panning, and viewport virtualization.
- Forward/reverse adjacency indexes are built once per loaded graph; hover highlighting walks these indexes (O(V+E) per hover) instead of rescanning the edge list at every traversal step.
- The Git Timeline caps rendered commits (most recent 500) independently of how many were analyzed, since dagre-laying-out and mounting tens of thousands of commit nodes is unusable regardless of correctness.
- Both graphs support collapsing groups of nodes into a single summary node — folders in the Architecture graph (collapsed by default, with Collapse All / Expand All controls), commits by calendar day in the Git Timeline (opt-in). Both reuse the same technique: hidden member nodes redirect their edges to the summary node's id, parallel redirected edges are deduplicated with a count, and edges that become internal to one summary node are dropped.

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
4. **Staged Transfer**: The frontend fetches files, dependencies, and git data via three sequential `GET` requests (each carrying `analysisId`) so the UI can populate incrementally.
5. **Normalization**: `src/api/client.ts` converts backend wire shapes into frontend domain models (e.g., serialized dates to timestamp strings) before the data ever reaches the store.
6. **Metric Computation**: `computeInsights` runs once, calculating Tarjan's SCC, memoized-DFS depth, coupling, and health metrics; the result is cached in the store.
7. **Layout Calculation**: `getDagreLayout` computes X/Y coordinates for the graph nodes, running inside a Web Worker for the Architecture graph so layout never blocks the main thread; an adjacency index is built alongside for O(V+E) hover highlighting.
8. **Rendering**: React Flow renders the nodes (DOM) and edges (SVG), virtualizing offscreen elements.

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
│   │   │   ├── ui/               # Shared primitives (Toast)
│   │   │   └── viewer/           # Code Viewer implementation
│   │   ├── hooks/                # useMediaQuery, useFocusTrap, usePersistedState, useToast
│   │   ├── lib/                  # Export, Session, Insight, and fuzzy-match algorithms
│   │   ├── store/                # Zustand global state
│   │   ├── types/                # Strict TypeScript interfaces
│   │   └── index.css             # Vanilla CSS design system
```
