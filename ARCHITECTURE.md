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
- Provides the raw data required for the frontend to calculate file modification hotspots and activity timelines.

---

## Frontend Engine

The frontend is built with React 19, Vite, and Zustand. It receives the raw analysis data and computes the presentation layer.

### 1. State Management (Zustand)
The `useRepositoryStore` acts as the single source of truth.
- Normalizes backend DTOs into strongly-typed frontend models.
- Manages the active tab state, open files array, and modal visibility.
- Handles the `AbortController` for graceful cancellation of heavy API requests.

### 2. Insights Engine
A purely mathematical module that calculates derived metrics from the dependency graph and Git history.
- **Circular Dependencies**: Implements Tarjan's Strongly Connected Components (SCC) algorithm to detect cycles in the dependency DAG.
- **Dependency Chains**: Uses memoized Depth-First Search (DFS) to identify the maximum import depth.
- **Fan-In / Hotspots**: Calculates the in-degree of all nodes to flag over-coupled files.
- **Git Activity**: Aggregates file modification frequencies to determine the most active modules.

### 3. Graph Engine (React Flow + Dagre)
Separates topological data from spatial data.
- The backend provides nodes and edges without X/Y coordinates.
- The frontend uses `dagre` to execute a directed graph layout algorithm (Top-to-Bottom for Git, Left-to-Right for Dependencies).
- Coordinates are passed to `@xyflow/react` (React Flow), which renders nodes as DOM elements and edges as SVG, and handles zooming, panning, and viewport virtualization.

### 4. Export & Session Engine
Provides zero-configuration persistence.
- **Sessions**: Dumps the entire Zustand store (including AST models) into `idb-keyval` (IndexedDB). Allows instant restoration of massive repositories without re-running the backend analysis.
- **Exports**: Converts the active React Flow canvas to high-resolution PNG/SVG using `html-to-image`, or generates paginated PDF reports using `jspdf`.

---

## Data Flow & Request Lifecycle

1. **Initialization**: User submits an absolute filesystem path in the UI.
2. **Analysis Request**: Frontend issues a `POST /api/v1/repository/analyze` request.
3. **Backend Orchestration**: `RepositoryIntelligenceEngine` runs the Scanner→AST pipeline and the Git engine as concurrent async operations, then merges the results into a `UnifiedRepositoryModel` held in memory. The API serves one analyzed repository at a time; a new analysis replaces the previous one.
4. **Staged Transfer**: The frontend then fetches files, dependencies, and git data via three sequential `GET` requests so the UI can populate incrementally.
5. **Normalization**: `useRepositoryStore` normalizes the incoming payloads into frontend models (e.g., serialized dates to timestamp strings).
6. **Metric Computation**: `computeInsights` calculates Tarjan's SCC, memoized-DFS depth, coupling, and health metrics.
7. **Layout Calculation**: `getDagreLayout` computes X/Y coordinates for the graph nodes.
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
│   │   │   ├── middlewares/      # Error boundaries and validation
│   │   │   └── routes/           # Express router definitions
│   │   ├── core/
│   │   │   ├── ast/              # SWC parsing and path resolution
│   │   │   ├── engine/           # Intelligence orchestration
│   │   │   ├── git/              # simple-git wrapper
│   │   │   └── scanner/          # Filesystem traversal
│   │   └── server.ts             # Application entry point
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── graph/            # React Flow and Dagre implementations
│   │   │   ├── insights/         # Dashboard and metric KPI components
│   │   │   ├── layout/           # AppShell, Sidebar, Header, Modals
│   │   │   └── viewer/           # Code Viewer implementation
│   │   ├── lib/                  # Export, Session, and Insight algorithms
│   │   ├── store/                # Zustand global state
│   │   ├── types/                # Strict TypeScript interfaces
│   │   └── index.css             # Vanilla CSS design system
```
