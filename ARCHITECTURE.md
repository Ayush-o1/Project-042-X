# Project 042-X Architecture

## Overall Architecture

Project 042-X uses a localized Backend-for-Frontend (BFF) architecture. It is divided into a Node.js backend and a React frontend. The backend acts as a high-performance data processing engine, reading files and Git objects directly from the local disk. The frontend acts as a presentation and analytics layer, managing application state, calculating complex insights, and rendering graphical data.

The system does not utilize an external database for raw processing. All repository data is processed synchronously during the initial analysis request and cached in the application's memory heap, then streamed to the browser where it can be persistently stored in IndexedDB.

## Data Flow

1. The user inputs an absolute filesystem path in the frontend UI.
2. The frontend sends a `POST /analyze` request to the backend.
3. The backend validates the path and initializes the `RepositoryIntelligenceEngine`.
4. The engine orchestrates the `RepositoryScanner`, `ASTEngine`, and `GitEngine` to extract data.
5. The extracted data is merged into a single `UnifiedRepositoryModel` and streamed sequentially to the frontend to prevent UI freezing.
6. The frontend calculates structural KPIs (Circular Dependencies, Fan-In, Max Depth) via the `insightsEngine`.
7. For graphical views, the frontend applies the `dagre` layout algorithm to calculate spatial coordinates for nodes.
8. The frontend renders the calculated graph using React Flow.
9. (Optional) The user dumps the entire calculated AST and metrics payload into the browser's IndexedDB via `sessionEngine` for zero-cost subsequent loads.

## Backend Sub-Engines

### Repository Scanner
The `RepositoryScanner` performs a recursive, depth-first traversal of the target directory. It catalog files, directories, and metadata while explicitly ignoring `node_modules`, `.git`, `dist`, and `build` to minimize processing overhead.

### AST Engine
The AST (Abstract Syntax Tree) engine analyzes file dependencies using `@swc/core`. It parses TypeScript and JavaScript source files to generate ASTs. A custom `PathResolver` traverses these trees to identify ES6 import and export statements, resolving relative paths to absolute filesystem paths.

### Git Engine
The Git Engine extracts version control history using a `simple-git` wrapper. It parses commit histories, authors, branch topologies, and utilizes `--name-only` diffs to calculate file modification heatmaps across the repository's lifespan.

## Frontend Sub-Engines

### Insights Engine
The frontend calculates complex graph metrics mathematically. It implements Tarjan's Strongly Connected Components algorithm to detect circular dependency loops and Depth-First Search (DFS) to identify the longest import chain.

### Export Engine
The system generates deterministic reports. It captures high-res PNG/SVG representations of the DOM using `html-to-image` and programmatically paginates PDF documents using `jspdf`.

## REST API
The API layer is built with Express.js. Routes are mounted under `/api/v1/repository`. Incoming requests are validated using `zod` schemas via middleware.

## Frontend State Management
The frontend uses `zustand` to manage application state outside the React component tree. `useRepositoryStore` handles API fetch logic, manages the active file viewers, and coordinates UI Modals (Settings, Compare, History).

## Technology Decisions & Trade-offs

- **IndexedDB over PostgreSQL**: By dumping session payloads into IndexedDB rather than a traditional backend database, the application achieves absolute zero-configuration for end users while bypassing standard 5MB local storage caps.
- **SWC vs. Babel**: `@swc/core` is written in Rust and compiles to WebAssembly/Native modules, offering parse times exponentially faster than Babel. This is required to process large enterprise repositories without triggering HTTP timeouts.
- **Frontend Graph Layout**: The backend returns topological data (nodes and connections) without spatial coordinates. The frontend uses `dagre` to perform mathematical graph layouts. This separates data processing from presentation logic.
