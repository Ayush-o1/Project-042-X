# Project 042-X — Verified Metrics

All figures verified directly against the repository (commit `8f9345f`) via `git ls-files`, `wc -l`, `grep`, `npm test`, `npm run build`, and `npx oxlint`. Nothing estimated.

## Tech Stack

- **Frontend:** React 19, TypeScript, Zustand, `@xyflow/react` (React Flow), Dagre, `react-virtuoso`, `highlight.js`, `jspdf`, `html-to-image`, `idb-keyval` — 11 runtime dependencies (`frontend/package.json`)
- **Backend:** Node.js, Express 5, TypeScript, `@swc/core` (Rust-based AST parser), `simple-git`, Zod, `express-rate-limit` — 9 runtime dependencies (`backend/package.json`)
- **Build:** Vite (frontend), `tsc` (backend), Vitest (both), `oxlint`

## Architecture

- Two-service architecture: stateless Express API (no database, in-memory analysis cache) + React SPA (Zustand state)
- Analysis cache holds the **3** most recent analyses, keyed by `randomUUID()`, oldest evicted (`backend/src/api/services/repository.service.ts`, `MAX_CACHED_ANALYSES`)
- AST parsing runs at a bounded concurrency of **50** files at a time (`p-limit`, `DependencyExtractionEngine.ts`)
- File-content reads are checked against a scanner-built allowlist and `fs.realpath`-verified against the repo root (path-traversal / symlink protection) — `repository.service.ts:getFileContent`
- Remote analysis: validates a GitHub URL by regex, shallow-clones it (`--depth 500 --single-branch`, configurable), enforces a clone timeout and a post-clone disk-size cap, deletes the clone once evicted from cache (`backend/src/core/scanner/RemoteRepositoryFetcher.ts`)
- Single `PUBLIC_DEMO_MODE` env flag switches both the Host-header guard and local-path analysis together for public deployment (`hostGuard.ts`, `repository.service.ts`)

## REST API — 8 endpoints

| Method | Route |
|---|---|
| POST | `/api/v1/repository/analyze` |
| GET | `/api/v1/repository/summary` |
| GET | `/api/v1/repository/files` |
| GET | `/api/v1/repository/dependencies` |
| GET | `/api/v1/repository/git` |
| GET | `/api/v1/repository/statistics` |
| GET | `/api/v1/repository/file-content` |
| GET | `/api/v1/health` |

`POST /analyze` is rate-limited per IP (`express-rate-limit`); requests are validated with Zod schemas (`repository.dto.ts`).

## Frontend

- **24 React components** (26 `.tsx` files minus `App.tsx`/`main.tsx` entry points)
- **6 custom hooks:** `useDelayedFocus`, `useElementSize`, `useFocusTrap`, `useMediaQuery`, `usePersistedState`, `useToast`
- **7 components memoized** with `React.memo` (`FileNode`, `CustomEdge`, `DayHeaderRow`, `ActivityHistogram`, `LaneGutter`, `AuthorFilterStack`, `CommitRow`)
- Single Zustand store (`useRepositoryStore.ts`, 368 lines) covering analysis lifecycle, cancellation (`AbortController`), and navigation state
- **62 exported TypeScript interfaces/types** across both services
- **13 distinct keyboard bindings** implemented (`Escape`, `Enter`, arrow keys, `Home`/`End`, `1`–`4`, `⌘K`, `⌘S`)

## Algorithms Implemented

| Algorithm | Location | Purpose |
|---|---|---|
| Tarjan's SCC | `frontend/src/lib/insightsEngine.ts` | Circular dependency detection, O(V+E) |
| Martin's Instability (I = Ce/(Ca+Ce)) | `frontend/src/lib/insightsEngine.ts` | Per-module coupling score |
| Squarified treemap (Bruls et al.) | `frontend/src/components/graph/treemapLayout.ts` | Architecture overview layout |
| Bidirectional BFS + anchored dual-DAG layout | `frontend/src/components/graph/layoutUtils.ts` | Depth-limited dependency-neighborhood layout |
| Git branch-lane assignment | `frontend/src/components/timeline/commitLanes.ts` | Branch/merge topology (same technique as `git log --graph`) |
| Subsequence fuzzy-match scoring | `frontend/src/lib/fuzzyMatch.ts` | Ranked file search |

## Performance

- Dagre graph layout runs in a dedicated Web Worker, off the main thread (`dagreLayout.worker.ts`)
- Git Timeline and file explorer are both virtualized with `react-virtuoso` — no rendered-item cap
- Route-level code splitting: 4 views lazy-loaded (`React.lazy` in `AppShell.tsx`) + PDF/image export engine dynamically imported on demand
- Measured production bundle chunks (`npm run build`): main entry **307.61 kB / 93.88 kB gzip**; Architecture view **292.51 kB / 92.71 kB gzip**; Git Timeline **21.01 kB / 7.22 kB gzip**; export engine **415.45 kB / 135.73 kB gzip** (loaded only on export)

## Security

- Backend binds to `127.0.0.1` only in local mode; Host-header guard blocks non-local requests (DNS-rebinding protection)
- Public deployment mode disables local filesystem-path analysis entirely — only GitHub URLs accepted
- Cloned repositories: URL regex validation, shallow clone, clone timeout, disk-size cap, automatic cleanup on cache eviction
- **11 typed error classes**, each mapped to a specific HTTP status in `errorHandler.ts` (403 / 404 / 413 / 422 / 429 / 504)

## Testing — 129/129 passing

| | Test files | Tests |
|---|---|---|
| Backend | 11 | 49 |
| Frontend | 8 | 80 |
| **Total** | **19** | **129** |

Covers: AST parsing, path resolution, git log parsing, GitHub URL validation/clone lifecycle, API routes (Supertest), Zustand store, Tarjan's SCC / instability / health-score logic, treemap and graph-layout algorithms, fuzzy match.

`npx oxlint`: 0 warnings across the codebase.

## Accessibility

- 58 `aria-label` attributes across 15 components
- 15 distinct ARIA roles in use (`tree`, `treeitem`, `dialog`, `tab`, `tablist`, `tabpanel`, `combobox`, `listbox`, `option`, `group`, `switch`, `region`, `button`, `presentation`, `application`)
- Reusable focus-trap hook (`useFocusTrap.ts`) applied to every modal; each closes on `Escape` and restores focus to its trigger
- `prefers-reduced-motion: reduce` respected globally

## Codebase Size

| Area | Lines |
|---|---|
| Backend source | 1,673 |
| Backend tests | 801 |
| Frontend source | 8,833 |
| Frontend tests | 902 |
| CSS | 2,394 |
| **Total** | **14,610** |

## Self-Analysis Verification

The tool successfully analyzed its own repository end-to-end (scan → AST → git log → API response): **120 files, 59 commits, 3 branches**, predominant language TypeScript.

## Do Not Claim

- Any percentage performance/bundle-size improvement — no stored before/after benchmark in the repo
- "Supports N programming languages" without qualification — file scanner recognizes 16 language labels, but only JS/TS/JSX/TSX/CJS/MJS are AST-parsed into the dependency graph
- "Production-grade" / "enterprise-scale" — single-process, 3-analysis in-memory cache, by design
- "WCAG-compliant" / "fully accessible" — real ARIA/focus-trap work exists, but no accessibility audit was performed
- Any velocity claim from commit timestamps
