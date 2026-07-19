# Project 042-X

Project 042-X is a local developer tool for visualizing software architecture and version control history. It processes a local Git repository and generates an interactive, two-dimensional map of file dependencies and Git history.

The goal of this tool is to assist developers in understanding unfamiliar codebases by providing a visual representation of how components interact and how the repository evolved over time.

## Features

- **Dependency Graph**: Parses TypeScript and JavaScript files to map exact module imports and exports into a directed graph.
- **Git History Graph**: Reads native `.git` objects to reconstruct the commit timeline, branches, and tags as a directed acyclic graph (DAG).
- **Interactive Visualization**: Renders graphs on an interactive canvas supporting panning, zooming, and node selection.
- **Integrated Code Viewer**: Links architecture nodes to the physical file system, allowing users to view the raw source code of selected files without leaving the context of the graph.
- **Local First**: Runs entirely on the local machine without requiring external databases or cloud synchronization.

## Screenshots

*(Placeholder for screenshots of the Dependency Graph, Git Graph, and Code Viewer)*

## Architecture Overview

The system follows a Backend-for-Frontend (BFF) pattern:

1. **Backend (Node.js/Express)**: Operates as a local daemon. It utilizes `@swc/core` for Abstract Syntax Tree (AST) parsing and custom logic for reading binary Git object files. It combines this data into a unified JSON structure and serves it via a REST API.
2. **Frontend (React/Vite)**: Consumes the API using `zustand` for state management. It calculates graph coordinates using `dagre` and renders the UI using `@xyflow/react`.

For an in-depth breakdown of the internal engines, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Technology Stack

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **State Management**: Zustand
- **Graph Engine**: React Flow (`@xyflow/react`)
- **Layout Algorithm**: Dagre

### Backend
- **Runtime**: Node.js
- **Server**: Express
- **Language**: TypeScript
- **AST Parser**: SWC (`@swc/core`)
- **Validation**: Zod
- **Testing**: Vitest, Supertest

## Folder Structure

```text
Project 042-X/
├── backend/                  # Node.js backend application
│   ├── src/
│   │   ├── api/              # Express routes, controllers, services
│   │   ├── core/
│   │   │   ├── ast/          # SWC parsing and dependency resolution
│   │   │   ├── engine/       # Orchestration layer
│   │   │   ├── git/          # Native Git object parsing
│   │   │   └── scanner/      # Filesystem traversal
│   │   └── utils/            # Helper functions
│   ├── package.json
│   └── tsconfig.json
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # React components (layout, graph, viewer)
│   │   ├── store/            # Zustand state store
│   │   ├── types/            # TypeScript interfaces
│   │   ├── App.tsx           # Entry component
│   │   └── index.css         # Global styles
│   ├── package.json
│   └── vite.config.ts
├── ARCHITECTURE.md           # Detailed system design
└── README.md                 # Project overview
```

## Installation

Ensure you have Node.js (v18 or higher) installed on your system.

### 1. Setup Backend

Navigate to the backend directory, install dependencies, compile the TypeScript source, and start the server.

```bash
cd backend
npm install
npm run build
npm start
```
The backend server will run on `http://localhost:5001`.

### 2. Setup Frontend

Open a new terminal window. Navigate to the frontend directory, install dependencies, and start the development server.

```bash
cd frontend
npm install
npm run dev
```
The frontend application will run on `http://localhost:5173`.

## Running Locally

1. Open a web browser and navigate to `http://localhost:5173`.
2. In the top navigation bar, enter the absolute path to a local Git repository on your machine.
3. Click **Analyze**.
4. Use the tab switcher to navigate between the **Code Viewer**, **Architecture Graph**, and **Git Timeline**.

## API Overview

The backend exposes the following REST endpoints:

- `POST /api/v1/repository/analyze`: Initiates scanning of the provided repository path.
- `GET /api/v1/repository/files`: Returns a flat array of file models.
- `GET /api/v1/repository/dependencies`: Returns nodes and edges representing AST imports.
- `GET /api/v1/repository/git`: Returns nodes and edges representing the Git commit history.
- `GET /api/v1/repository/statistics`: Returns numerical metrics (total files, commits, predominant language).
- `GET /api/v1/repository/file-content?path=<string>`: Returns the raw text content of a specified file.

## Design Decisions

- **In-Memory Caching**: To prioritize response times when switching between frontend views, the backend caches the unified repository model in memory rather than writing it to a persistent database.
- **WASM Parsing**: `@swc/core` was selected over Babel for AST generation due to its Rust-based execution speed, which is necessary for parsing large repositories efficiently.
- **Frontend Graph Layout**: The backend returns raw topological relationships. The frontend calculates X/Y spatial coordinates using `dagre` prior to rendering with React Flow. This separates data processing from presentation logic.

## Limitations

- **Memory Constraints**: Repositories with high file counts (e.g., >10,000 files) may exceed the Node.js V8 heap limit during the AST parsing phase.
- **Layout Blocking**: The `dagre` layout algorithm executes synchronously on the main frontend thread. Large graphs may cause a brief UI freeze during calculation.
- **Language Support**: AST dependency parsing is currently limited to TypeScript and JavaScript (`.ts`, `.tsx`, `.js`, `.jsx`).

## Roadmap

- **Web Worker Integration**: Offload `dagre` layout calculations to a background Web Worker to prevent UI blocking.
- **Expanded Language Support**: Add AST parsing engines for Python and Go.
- **Desktop Application Packaging**: Bundle the backend and frontend into an Electron or Tauri executable to simplify installation.

## License

MIT License
