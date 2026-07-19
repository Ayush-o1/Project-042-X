# Project 042-X Architecture

## Overall Architecture

Project 042-X uses a localized Backend-for-Frontend (BFF) architecture. It is divided into a Node.js backend and a React frontend. The backend acts as a data processing engine, reading files and Git objects directly from the local disk. The frontend acts as a presentation layer, managing application state and rendering graphical data. 

The system does not utilize an external database. All repository data is processed synchronously during the initial analysis request and cached in the application's memory heap.

## Data Flow

1. The user inputs an absolute filesystem path in the frontend UI.
2. The frontend sends a `POST /analyze` request containing the path to the backend.
3. The backend validates the path and initializes the `RepositoryIntelligenceEngine`.
4. The engine orchestrates the `RepositoryScanner`, `ASTEngine`, and `GitEngine` to extract data.
5. The extracted data is merged into a single `UnifiedRepositoryModel` and cached in memory by the `RepositoryService`.
6. The frontend issues subsequent `GET` requests to retrieve specific subsets of this model (Files, Dependencies, Git history).
7. For graphical views, the frontend applies the `dagre` layout algorithm to calculate spatial coordinates for nodes.
8. The frontend renders the calculated graph using React Flow.

## Backend Sub-Engines

### Repository Scanner
The `RepositoryScanner` performs a recursive, depth-first traversal of the target directory.
- **Function**: It catalogs files, directories, and metadata (file size, extension).
- **Constraints**: It explicitly ignores common dependency directories (e.g., `node_modules`, `.git`, `dist`, `build`) to minimize processing overhead.

### AST Engine
The AST (Abstract Syntax Tree) engine analyzes file dependencies.
- **Technology**: It utilizes `@swc/core`.
- **Function**: It parses TypeScript and JavaScript source files to generate ASTs. A custom `PathResolver` traverses these trees to identify ES6 import and export statements, resolving relative paths to absolute filesystem paths.
- **Output**: A collection of nodes (files) and directed edges (import relationships).

### Git Engine
The Git Engine extracts version control history.
- **Technology**: Native Node.js `fs` module and `zlib`.
- **Function**: It bypasses the standard `git` CLI entirely. Instead, it directly reads binary files within the `.git/objects` and `.git/refs` directories. It decompresses commit objects, parses the text to find parent hashes, authors, and messages, and correlates them with branch and tag references.
- **Output**: A directed acyclic graph (DAG) representing the commit timeline.

### Repository Intelligence Engine
This is the primary orchestration class. It acts as a facade, providing a single interface for the API controllers to trigger the underlying sub-engines in sequence. It is responsible for handling execution failures (e.g., missing `.git` directories) and unifying the results into a consistent TypeScript interface.

## REST API

The API layer is built with Express.js.
- **Routing**: Routes are mounted under `/api/v1/repository`.
- **Validation**: Incoming requests are validated using `zod` schemas via middleware. This ensures that only well-formed requests reach the controllers.
- **Caching**: The `RepositoryService` implements a Singleton pattern, holding the most recently analyzed repository in an instance variable.

## Frontend

### State Management
The frontend uses `zustand` to manage application state outside the React component tree.
- **Function**: `useRepositoryStore` handles API fetch logic, tracks loading/error states, and manages the `activeFile` and `activeTab` properties. This eliminates the need to pass callbacks and data through multiple levels of component props.

### Graph Rendering
Visualizing the architecture requires mapping conceptual relationships into a 2D coordinate space.
- **Layout Algorithm**: The backend returns topological data (nodes and connections) without spatial coordinates. The frontend uses `dagre` to perform mathematical graph layouts (e.g., Left-to-Right for dependencies, Top-to-Bottom for Git history).
- **Rendering**: `@xyflow/react` is used to draw the calculated nodes and edges on an HTML5 Canvas/DOM overlay. React Flow was chosen for its performance optimizations, specifically its ability to virtualize nodes outside the current viewport.

## Technology Decisions & Trade-offs

- **No Database**: By maintaining data in memory rather than a database (e.g., PostgreSQL), the application achieves significantly lower latency during read operations. The trade-off is higher RAM consumption and the loss of data persistence between server restarts.
- **SWC vs. Babel**: `@swc/core` is written in Rust and compiles to WebAssembly/Native modules, offering parse times faster than Babel. This is required to process large repositories without triggering HTTP timeouts.
- **Native Git Parsing**: Reading `.git` objects directly rather than spawning child processes for the `git` CLI reduces process overhead and operating system dependencies. However, it increases the complexity of the parsing logic and may not support newer Git features (like sparse-checkout objects) without explicit implementation.
