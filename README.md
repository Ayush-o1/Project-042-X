# Project 042-X

## Live Demo

A hosted demo (backend on Render, frontend on Vercel) analyzes public GitHub repository URLs — see [Deployment](#deployment) for how it's configured and how to stand up your own instance. Running locally instead is unrestricted: any local Git repository, no URL required.

## Project Overview

Understanding an unfamiliar codebase usually means manually tracing imports, guessing at coupling between modules, and cross-referencing `git log` and `git blame` by hand — or sending the source to a third-party SaaS tool to get that analysis done for you. Project 042-X does the analysis itself: point it at a repository — a local path, or a public GitHub URL — and it parses every file's AST, builds the dependency graph, reads the full commit history, and computes deterministic architecture metrics — circular dependencies, coupling, hotspots, module health.

Parsing uses SWC (Rust-based) for speed; graph layout is computed with Dagre and rendered interactively with React Flow.

## Key Features

- **Architecture Graph**: A treemap overview (folders sized by file count, colored by health/hotspot/file-type) paired with a focused dependency canvas — select a file or folder and explore its dependencies and dependents at a chosen depth (1/2/3/all hops), without ever laying out the whole codebase at once.
- **Git Timeline**: A virtualized, densely-scannable commit list with a branch-lane gutter, sticky day headers, an activity histogram, author filtering, and fuzzy commit search — no artificial commit limit.
- **Insights Dashboard**: Deterministic metrics — circular dependencies (Tarjan's SCC), orphaned source files, longest dependency chains, fan-in/fan-out, instability, and per-module health scores — organized into Overview, Architecture Signals, and Git Activity sections.
- **Integrated Code Viewer**: Jump from any graph node straight to syntax-highlighted source, with a Related Files panel that lists the active file's imports and importers as clickable rows.
- **Session Persistence**: Snapshot an analysis to the browser's IndexedDB and restore it instantly, plus JSON export/import and snapshot comparison.
- **Export Engine**: PDF, Markdown, and JSON reports; PNG/SVG captures of the graph view.
- **Fuzzy Command Palette**: `Cmd+K` fuzzy-matches every file by name or path (non-contiguous queries work, filename matches rank above path matches) and leads with recently-opened files when the query is empty.
- **Saved Preferences**: Sidebar collapse state and graph filter defaults persist across sessions in `localStorage`.
- **Responsive Layout**: Adapts from ultrawide desktops down to tablets — the sidebar becomes a dismissible overlay, dashboard/graph panels reflow instead of overflowing.
- **Accessible by Default**: Every modal traps focus and returns it on close; the file explorer, tab bar, and both graph views are fully keyboard-operable; reduced-motion is respected.

## Architecture Overview

Project 042-X runs as two processes: a Node.js backend and a React frontend, deployable together (see [Deployment](#deployment)) or run entirely on one machine for local use.

The **Node.js backend** is a data-processing pipeline: it scans the filesystem (respecting `.gitignore`), parses TypeScript/JavaScript ASTs with `@swc/core`, and reads git history via `simple-git`. Everything is held in memory — there is no database. For a repository given as a GitHub URL, it shallow-clones to a temp directory first and analyzes the clone. Locally, the API binds to `127.0.0.1` only and rejects non-local origins and hosts; see [Security Model](#security-model) for how that changes on a public deployment.

The **React frontend** (Zustand for state) fetches the analysis in stages, computes derived metrics in its Insights Engine (Tarjan's SCC, memoized DFS), lays out graphs with `dagre`, and renders them with `@xyflow/react` (React Flow, SVG/DOM-based).

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
2. Enter either the **absolute path** to a local Git repository, or a **public GitHub URL** (`https://github.com/owner/repo`), in the top bar and press **Enter**.
3. Explore the **Code**, **Architecture**, **Git Timeline**, and **Insights** tabs.

## Usage

- **Navigation**: Click a folder in the Architecture treemap, or a file anywhere in the app, to focus it in the dependency canvas and open the Node Inspector, which links directly to the Code Viewer. Use the depth stepper (`1`–`4` keys, or the toolbar) to control how many hops of dependencies/dependents render. In the Code Viewer, toggle the Related Files panel to browse a file's imports and importers without leaving the editor.
- **Dense histories**: In the Git Timeline, toggle "Group by day" to collapse commits into per-day summaries — click a summary to expand it back to individual commits — and use "Jump to latest commit" to snap to the newest activity. Click a bar in the activity histogram to jump to that period.
- **Search**: Use the Command Palette (`Cmd+K` / `Ctrl+K`) to fuzzy-search any file by name or path; with nothing typed, it shows your recently-opened files.
- **Sidebar**: Toggle the file explorer with the menu icon in the header — collapsed on wide viewports, it stays collapsed; below the tablet-landscape breakpoint the same button opens/closes it as a dismissible overlay instead.
- **Persistence**: Press `Cmd+S` (or click **Save**) to snapshot the analysis into IndexedDB; restore it from **History**. Sidebar collapse state and the Architecture graph's filter toggles are remembered across reloads automatically.
- **Exporting**: Use the **Export** menu. PNG/SVG capture the currently visible Architecture graph, so open that tab and frame the view first.
- **Keyboard shortcuts**: `Cmd+K` jump to a file · `Cmd+S` save session · `Cmd+Shift+E` export PDF · `Esc` closes any open modal/overlay · `←`/`→` switch tabs when the tab bar is focused. Full reference in **Keyboard Shortcuts** (the keyboard icon in the header).

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
│   │   ├── hooks/         # useMediaQuery, useFocusTrap, useDelayedFocus, usePersistedState, useToast
│   │   ├── lib/           # Insights, Export, Session, and fuzzy-match engines
│   │   └── store/         # Zustand state management
│   └── package.json
└── docs/                  # Metric definitions and export specifications
```

## Security Model

**Local development** (default — `PUBLIC_DEMO_MODE` unset): the backend reads local files on behalf of the frontend, so it is deliberately locked down.

- Binds to `127.0.0.1` only (never reachable from the network).
- Rejects requests whose `Host` header is not local (DNS-rebinding protection).
- CORS restricted to localhost origins.
- File content is only served for files discovered by the scanner, verified against the repository root via `realpath` (symlink-safe).

**Public demo deployment** (`PUBLIC_DEMO_MODE=true`): a different threat model applies — the server is reachable by anyone, so it must never expose its own filesystem.

- Local filesystem-path analysis is rejected outright; only public GitHub URLs are accepted.
- The Host-header guard is a no-op (meaningless once the server intentionally accepts public traffic) — CORS's `ALLOWED_ORIGINS` is what restricts who can read a response.
- A repository URL is shallow-cloned into a temp directory with a bounded depth, a wall-clock clone timeout, and a post-clone disk-size check that rejects (and deletes) anything oversized before it reaches the scanner.
- `POST /analyze` — the one endpoint that clones and runs the full analysis pipeline — is rate-limited per IP.
- Cloned directories are deleted once evicted from the in-memory analysis cache, with an opportunistic sweep of any orphaned clones on every new request.

## Performance Notes

- **Parsing**: SWC (Rust-based) parses ASTs significantly faster than JavaScript-based parsers.
- **Layout**: The Architecture graph lays out only the focused neighborhood (not the whole codebase) in a dedicated Web Worker, off the main thread — re-centering recomputes just the new neighborhood. The Git Timeline is a virtualized list (`react-virtuoso`), so it has no rendered-node ceiling at all.
- **Rendering**: React Flow virtualizes offscreen nodes; the file explorer and Git Timeline are both virtualized with `react-virtuoso`. The dependency graph's hover highlighting uses a prebuilt adjacency index (O(V+E) per hover, not a rescan of every edge).
- **Git history**: analysis caps history at 20,000 commits (newest first) by default; a cloned GitHub URL is additionally shallow-cloned to a bounded depth (`CLONE_DEPTH`, default 500).
- **Bundle size**: the Code Viewer imports only the 14 language grammars it actually uses from `highlight.js/lib/core` (not the ~190-language default bundle), and `jsPDF`/`html-to-image` are dynamically imported only when an export action runs. Net effect: the main entry chunk is ~325 KB (~100 KB gzip) instead of ~740 KB (~235 KB gzip).

## Deployment

The demo deployment is backend on **Render** (free tier) and frontend on **Vercel** — no database, no separate job queue, nothing beyond what the free tiers of both already provide. This is a portfolio/demo deployment, not a production one: it's sized for occasional recruiter/interview traffic, not concurrent users at scale.

### Backend — Render

1. Push this repository to GitHub (already done if you're reading it there).
2. In Render, **New → Blueprint**, point it at the repo — [render.yaml](render.yaml) at the repository root defines the service (root directory `backend`, build `npm install && npm run build`, start `npm start`, health check `/api/v1/health`).
3. Render prompts for the one variable marked `sync: false` in the blueprint — `ALLOWED_ORIGINS` — leave it blank for now; you'll set it after the frontend is deployed (step 3 below).
4. Deploy. Render injects `PORT` automatically; `render.yaml` already sets `HOST=0.0.0.0` and `PUBLIC_DEMO_MODE=true`.

Without a Blueprint, configure a Web Service manually with the same root directory, build/start commands, and environment variables from [.env.example](.env.example)'s public-deployment section.

### Frontend — Vercel

1. **New Project** → import this repository, with **Root Directory** set to `frontend` (Vercel auto-detects the Vite framework preset; [frontend/vercel.json](frontend/vercel.json) pins the build/output settings explicitly).
2. Set environment variables:
   - `VITE_API_URL` → your Render backend's URL plus `/api/v1`, e.g. `https://project-042x-backend.onrender.com/api/v1`
   - `VITE_PUBLIC_DEMO_MODE` → `true`
3. Deploy. Copy the resulting `https://<project>.vercel.app` URL back into the Render backend's `ALLOWED_ORIGINS` variable and redeploy the backend so CORS allows it.

### Environment variables reference

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `PORT` | Backend | `5001` | Set automatically by Render; only needed locally if the default port is taken. |
| `HOST` | Backend | `127.0.0.1` | Set to `0.0.0.0` for any networked deployment (already set in `render.yaml`). |
| `ALLOWED_ORIGINS` | Backend | localhost only | Comma-separated CORS allowlist — set to the deployed frontend's origin. |
| `PUBLIC_DEMO_MODE` | Backend | unset | `true` disables local-path analysis and the Host guard; only public GitHub URLs are analyzed. |
| `CLONE_DEPTH` | Backend | `500` | Commit depth for a shallow GitHub clone. |
| `CLONE_TIMEOUT_MS` | Backend | `45000` | Hard timeout on the clone step. |
| `MAX_CLONE_SIZE_MB` | Backend | `300` | Clone is rejected and deleted past this on-disk size. |
| `ANALYZE_RATE_LIMIT` | Backend | `30` | Max `POST /analyze` requests per IP per 15-minute window. |
| `VITE_API_URL` | Frontend | `http://localhost:5001/api/v1` | Base URL of the backend API. |
| `VITE_PUBLIC_DEMO_MODE` | Frontend | unset | Cosmetic — matches the backend so the UI only ever suggests GitHub URLs. |

## Testing

```bash
npm test          # backend + frontend
npm run typecheck # backend + frontend, strict mode
```

Backend tests (Vitest + Supertest) cover the AST parser, path resolution, filesystem scanner, git engine, GitHub URL validation and the shallow-clone lifecycle, the `PUBLIC_DEMO_MODE` access policy, the analysis registry's id isolation and eviction behavior, and the API routes. Frontend tests (Vitest) cover the Insights Engine (cycle detection, orphan/source filtering, Martin instability, deterministic git joins), the Architecture graph's focused-neighborhood layout and treemap algorithms, the Git Timeline's row/lane/virtualization logic, fuzzy matching, and the Zustand store (analysis lifecycle, cancellation, navigation state).

## Accessibility

- Every modal (Keyboard Shortcuts, Session History, Compare Snapshots, Command Palette) traps `Tab` navigation with a shared `useFocusTrap` hook and returns focus to the trigger element on close.
- The main view switcher uses the ARIA tabs pattern (roving tabindex, arrow-key navigation); the file explorer uses `tree`/`treeitem` semantics and is fully keyboard-operable.
- Toast notifications are announced via `aria-live`.
- `prefers-reduced-motion: reduce` is respected globally.
- Text color tokens are set to meet WCAG AA contrast against the app background.

## Known Limitations

- The AST engine resolves ES module `import`/`export` syntax (plus `import x = require(...)`). Bare CommonJS `require()` calls are not extracted.
- `tsconfig.json` path aliases (e.g. `@/components/...`) are not resolved, so alias imports do not appear as graph edges.
- The backend keeps the 3 most recently completed analyses addressable by id (older ones are evicted); it is not a general-purpose multi-tenant service.
- Git worktrees and submodules (where `.git` is a file, not a directory) are not supported.
- Symbolic links are not followed during scanning.
- Files larger than 5 MB are skipped.
- The Code Viewer is not virtualized; very large individual files (tens of thousands of lines) can be slow to syntax-highlight.
- A GitHub-URL analysis is a shallow, single-branch clone (`CLONE_DEPTH` commits, default 500) — older history and other branches aren't available for a cloned repository the way they are for a local one with full history on disk.
- The demo deployment's free-tier backend spins down after inactivity; the first request after a period of idleness can take up to a minute while it restarts.

## Future Improvements

- `tsconfig.json` path-alias and monorepo workspace resolution.
- Virtualized Code Viewer for very large individual files.
- Real-time file watching with incremental graph updates.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
