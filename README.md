# Project 042-X

## Project Overview

Project 042-X is a local-first repository intelligence tool. It analyzes local Git repositories, builds an AST-derived dependency graph, parses the full commit history, and computes deterministic architecture metrics — circular dependencies, coupling, hotspots, and module health — entirely on your machine. No data ever leaves your computer.

Parsing uses SWC (Rust-based) for speed; graph layout is computed with Dagre and rendered interactively with React Flow.

## Key Features

- **AST-Driven Architecture Graph**: Maps ES module imports/exports into an interactive dependency graph with folder clustering, filters, and a per-node inspector.
- **Git Timeline**: Visualizes commit history and branch/merge topology, with author and date filtering.
- **Insights Dashboard**: Deterministic metrics — circular dependencies (Tarjan's SCC), orphaned source files, longest dependency chains, fan-in/fan-out, instability, and per-module health scores.
- **Integrated Code Viewer**: Jump from any graph node straight to syntax-highlighted source.
- **Session Persistence**: Snapshot an analysis to the browser's IndexedDB and restore it instantly, plus JSON export/import and snapshot comparison.
- **Export Engine**: PDF, Markdown, and JSON reports; PNG/SVG captures of the graph view.
- **Fuzzy Command Palette**: `Cmd+K` fuzzy-matches every file by name or path (non-contiguous queries work, filename matches rank above path matches) and leads with recently-opened files when the query is empty.
- **Saved Preferences**: Sidebar collapse state and the Architecture graph's filter defaults persist across sessions in `localStorage`.
- **Responsive Layout**: Adapts from ultrawide desktops down to tablets — the sidebar becomes a dismissible overlay, dashboard/graph panels reflow instead of overflowing.
- **Accessible by Default**: Every modal traps focus and returns it on close; the file explorer and tab bar are fully keyboard-operable; reduced-motion is respected.

## Architecture Overview

Project 042-X runs as two local processes:

The **Node.js backend** is a data-processing pipeline: it scans the filesystem (respecting `.gitignore`), parses TypeScript/JavaScript ASTs with `@swc/core`, and reads git history via `simple-git`. Everything is held in memory — there is no database. The API binds to `127.0.0.1` only and rejects non-local origins and hosts.

The **React frontend** (Zustand for state) fetches the analysis in stages, computes derived metrics in its Insights Engine (Tarjan's SCC, memoized DFS), lays out graphs with `dagre`, and renders them with `@xyflow/react` (React Flow, SVG/DOM-based).

## Screenshots

### Landing Page
![Landing Page](docs/images/landing.png)

### Repository Analysis & Code Viewer
![Code Viewer](docs/images/code-viewer.png)

### Dependency Graph (Architecture View)
![Dependency Graph](docs/images/dependency-graph.png)

### Git Timeline
![Git Timeline](docs/images/git-timeline.png)

### Insights Dashboard
![Insights Dashboard](docs/images/insights-dashboard.png)

### Session History
![Session History](docs/images/session-history.png)

### Export System
![Export System](docs/images/export-system.png)

## Installation

Requires **Node.js 20.19+**.

```bash
# From the repository root
npm run install:all

# Terminal 1 — backend (http://127.0.0.1:5001)
npm run dev:backend

# Terminal 2 — frontend (http://localhost:5173)
npm run dev:frontend
```

No `.env` files are required — sensible defaults are built in. To change the backend port or CORS allowlist, copy the values from [.env.example](.env.example) into `backend/.env` and `frontend/.env`.

For a production-style build: `npm run build`, then `npm start --prefix backend` and `npm run preview --prefix frontend`.

## Quick Start

1. Start both servers (above) and open the frontend URL.
2. Enter the **absolute path** to a local Git repository in the top bar and press **Enter**.
3. Explore the **Code**, **Architecture**, **Git Timeline**, and **Insights** tabs.

## Usage

- **Navigation**: Click any node in the Architecture Graph to open the Node Inspector, which links directly to the Code Viewer.
- **Search**: Use the Command Palette (`Cmd+K` / `Ctrl+K`) to fuzzy-search any file by name or path; with nothing typed, it shows your recently-opened files.
- **Sidebar**: Toggle the file explorer with the menu icon in the header — collapsed on wide viewports, it stays collapsed; below the tablet-landscape breakpoint the same button opens/closes it as a dismissible overlay instead.
- **Persistence**: Press `Cmd+S` (or click **Save**) to snapshot the analysis into IndexedDB; restore it from **History**. Sidebar collapse state and the Architecture graph's filter toggles are remembered across reloads automatically.
- **Exporting**: Use the **Export** menu. PNG/SVG capture the currently visible Architecture graph, so open that tab and frame the view first.
- **Keyboard shortcuts**: `Cmd+K` Command Palette · `Cmd+S` Save session · `Cmd+Shift+E` Export PDF · `Esc` closes any open modal/overlay · `←`/`→` switch tabs when the tab bar is focused. Full reference in **Settings** (gear icon).

## Technology Stack

- **Frontend**: React 19, Vite, TypeScript, Zustand, React Flow (`@xyflow/react`), Dagre, `highlight.js`, `html-to-image`, `jspdf`, `idb-keyval`, Lucide React
- **Backend**: Node.js, Express 5, TypeScript, SWC (`@swc/core`), `simple-git`, Zod

## Project Structure

```text
Project 042-X/
├── backend/
│   ├── src/
│   │   ├── api/           # Express routes, controllers, middlewares, Zod validators
│   │   └── core/          # Scanner, AST, Git, and orchestration engines
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    # React components (Graph, Insights, Layout, Viewer)
│   │   ├── hooks/         # useMediaQuery, useFocusTrap, usePersistedState, useToast
│   │   ├── lib/           # Insights, Export, Session, and fuzzy-match engines
│   │   └── store/         # Zustand state management
│   └── package.json
└── docs/                  # Metric definitions and export specifications
```

## Security Model

The backend reads local files on behalf of the frontend, so it is deliberately locked down:

- Binds to `127.0.0.1` only (never reachable from the network).
- Rejects requests whose `Host` header is not local (DNS-rebinding protection).
- CORS restricted to localhost origins.
- File content is only served for files discovered by the scanner, verified against the repository root via `realpath` (symlink-safe).

## Performance Notes

- **Parsing**: SWC (Rust-based) parses ASTs significantly faster than JavaScript-based parsers.
- **Layout**: The Architecture graph's `dagre` layout pass runs in a dedicated Web Worker, off the main thread. The Git Timeline's layout stays synchronous — it's already capped at 500 rendered nodes, where a worker's message-passing overhead would outweigh any benefit.
- **Rendering**: React Flow virtualizes offscreen nodes; the file explorer is virtualized with `react-virtuoso`. The dependency graph's hover highlighting uses a prebuilt adjacency index (O(V+E) per hover, not a rescan of every edge).
- **Git history**: analysis caps history at 20,000 commits (newest first) by default, and the Git Timeline additionally renders at most the 500 most recent matching commits — enough to be useful, not enough to freeze dagre layout or the DOM on very large histories.
- **Bundle size**: the Code Viewer imports only the 14 language grammars it actually uses from `highlight.js/lib/core` (not the ~190-language default bundle), and `jsPDF`/`html-to-image` are dynamically imported only when an export action runs. Net effect: the main entry chunk is ~325 KB (~100 KB gzip) instead of ~740 KB (~235 KB gzip).

## Known Limitations

- The AST engine resolves ES module `import`/`export` syntax (plus `import x = require(...)`). Bare CommonJS `require()` calls are not extracted.
- `tsconfig.json` path aliases (e.g. `@/components/...`) are not resolved, so alias imports do not appear as graph edges.
- The backend keeps the 3 most recently completed analyses addressable by id (older ones are evicted); it is not a general-purpose multi-tenant service.
- Git worktrees and submodules (where `.git` is a file, not a directory) are not supported.
- Symbolic links are not followed during scanning.
- Files larger than 5 MB are skipped.
- The Code Viewer is not virtualized; very large individual files (tens of thousands of lines) can be slow to syntax-highlight.

## Future Improvements

- `tsconfig.json` path-alias and monorepo workspace resolution.
- Virtualized Code Viewer for very large individual files.
- Real-time file watching with incremental graph updates.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
