# Project 042-X

Project 042-X is a professional, local-first engineering tool for visualizing software architecture, analyzing version control history, and extracting actionable architectural insights. 

It processes local Git repositories and generates interactive, two-dimensional maps of file dependencies and Git history. By preserving absolute data privacy (it runs entirely locally without external databases), it serves as a secure platform for auditing enterprise codebases.

## Features

- **Dependency Graph**: Parses TypeScript and JavaScript files to map exact module imports and exports into a directed graph. Handles thousands of nodes using React Virtualization and Web Worker debouncing.
- **Git History Graph**: Deep integration with Git to track architectural evolution, mapping branch topologies and file-level commit activity.
- **Architecture Insights Dashboard**: Algorithmic reporting on cyclomatic complexity, orphaned files, maximum dependency depth, and component fan-in metrics.
- **Snapshot Diffing**: Compare two architectural snapshots to mathematically calculate the structural delta (e.g., `-2 circular dependencies`, `+5 orphaned files`).
- **Session Persistence**: Dumps raw AST payloads and Git objects directly into the browser's IndexedDB, allowing instant reloads of massive repositories without re-scanning.
- **Export Engine**: Export precise High-Res PNGs/SVGs of dependency graphs, or generate deterministic Markdown, JSON, and PDF reports for stakeholder review.
- **Interactive Visualization**: Renders graphs on an interactive canvas supporting panning, zooming, and node selection.
- **Integrated Code Viewer**: Links architecture nodes to the physical file system, allowing users to view the raw source code of selected files without leaving the context of the graph.

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Export & Workflow Guide](docs/EXPORT_GUIDE.md)
- [Metrics & Insights Reference](docs/METRICS_REFERENCE.md)
- [Report Format Specification](docs/REPORT_FORMAT.md)

## Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Zustand, React Flow (`@xyflow/react`), Dagre, `html-to-image`, `jspdf`, `idb-keyval`
- **Backend**: Node.js, Express, TypeScript, SWC (`@swc/core`), `simple-git`, Zod

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
The backend server will run on `http://localhost:4000`. Ensure you have an `.env` file with `PORT=4000` (see `.env.example`).

### 2. Setup Frontend

Open a new terminal window. Navigate to the frontend directory, install dependencies, and start the application.

```bash
cd frontend
npm install
npm run build
npm run preview
```
The frontend application will run on `http://localhost:4173`. (You may also run `npm run dev` for the development server on `5173`).

## Usage

1. Open a web browser and navigate to the frontend URL.
2. In the top navigation bar, enter the absolute path to a local Git repository on your machine.
3. Click **Analyze** (or press Enter).
4. Use the top right toolbar to **Save Session** (Cmd+S) or **Export** reports (Cmd+Shift+E for PDF).
5. Use the tab switcher to navigate between **Code Viewer**, **Architecture Graph**, **Git Timeline**, and **Insights**.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
