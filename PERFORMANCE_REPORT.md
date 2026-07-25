# Performance & Architecture Analysis

Analysis-only — no code changed. All findings verified by reading the actual current source (not `ARCHITECTURE.md`, which is stale — see note at bottom).

**Path correction:** the AST engine lives at `backend/src/core/ast/DependencyExtractionEngine.ts`, not `backend/src/core/scanner/` as referenced in the request.

## Summary Table

| File | Issue | Severity | Estimated Impact |
|---|---|---|---|
| `frontend/src/components/graph/DependencyGraphView.tsx` (`FocusCanvas`, ~L60-108) | Component fully unmounts on tab switch (`AppShell.tsx` L328-331 conditionally renders, no keep-alive); remounting re-runs the full dagre worker layout even when `architectureFocusId`/`architectureDepth`/`dependencies` are unchanged | **High** | Every return visit to Architecture re-triggers "Laying out neighborhood…" and a full worker round-trip for identical input — the most likely cause of "projection not working properly" |
| `frontend/src/store/useRepositoryStore.ts` (`analyze`, L219-221) | `computeInsights()` (Tarjan's SCC + DFS longest-path + multiple O(N+E) passes) runs synchronously on the main thread, not in a worker, right as analysis completes | **High** | Blocks the main thread / freezes the UI on large repos at the exact moment results should render |
| `backend/src/core/ast/PathResolver.ts` (`resolve`, L11-33) + `DependencyExtractionEngine.ts` (L61-62) | Import resolution is sequential per file (`for...of` + `await`), and each unresolved-extension specifier costs up to ~13 sequential `fs.access`/`fs.stat` calls | **High** | Directly slows `POST /analyze` for any repo with many extensionless relative imports (very common in TS/JS); compounds on Render free-tier disk/CPU |
| `backend/src/api/controllers/repository.controller.ts` (`getFiles`/`getDependencies`/`getStatistics`, L47-63) | Full in-memory model returned unpaginated — no size cap, no streaming | **Medium** | Large repos ship a large single JSON payload; frontend can't render anything until it fully downloads + parses |
| `backend/src/api/services/repository.service.ts` (`getGitData`, ~L, `Array.from(model.git.commits.values())`) | Commit Map rebuilt into a fresh array on every single `GET /git` call, not cached per analysis | **Low** | Repeated, avoidable allocation on repos with thousands of commits; call is cheap relative to the above but adds up under repeated polling |
| `backend/src/api/services/repository.service.ts` (`getFileContent`, ~L) | `fs.realpath(repoPath)` recomputed on every file-open request instead of once per analysis | **Low** | Small but real per-request overhead in the Code Viewer, unrelated to the graph issue |
| `backend/src/core/ast/DependencyExtractionEngine.ts` (L38) | Regex literal evaluated per file callback | **Checked — not an issue** | V8 caches compiled literal regexes at their source location; negligible |
| `backend/src/api/services/repository.service.ts` (`evictOldest`) | O(n) linear scan for cache eviction | **Checked — not an issue** | Bounded to n≤4 entries |
| `backend/src/api/services/repository.service.ts` (`getGitData`) | Missing pagination | **Checked — not an issue** | Already implements `offset`/`limit` |
| `frontend/src/components/graph/*`, `useRepositoryStore.ts` | Re-layout on every render / missing memoization / unnecessary Zustand re-renders | **Checked — not an issue** | Layout effect is correctly scoped to `[dependencies, centerKey, architectureDepth]`; `dependencies` reference is stable across unrelated store updates; `FileNode`/`CustomEdge` are `React.memo`; selectors use `useShallow` |
| `frontend/vite.config.ts`, `tsconfig.app.json`, `backend/tsconfig.json` | Dev-only slowness leaking into prod | **Checked — not an issue** | Standard `tsc -b && vite build`; no debug flags, unminified output, or dev-only settings present |

## Root Cause: Why the "Projection" (Graph View) Is Slow

Two independent, compounding issues — not one bug:

1. **No render persistence across tab switches.** `AppShell.tsx` renders each tab's view conditionally (`activeTab === 'dependencies' && <DependencyGraphView .../>`) with no keep-alive, so navigating away and back **unmounts and remounts `DependencyGraphView`/`FocusCanvas` from scratch**. `FocusCanvas`'s layout effect (`DependencyGraphView.tsx` L60-108) fires again on mount, creating a new worker and re-running `getFocusedLayout` (dagre, in `layoutUtils.ts`) even though `architectureFocusId` and `architectureDepth` are preserved in the Zustand store and the dependency graph hasn't changed. On a large repo, every single visit to Architecture pays the full layout cost and shows the "Laying out neighborhood…" spinner again — this reads exactly like "projection not working properly": it never seems to finish being fast.

2. **Main-thread blocking before the graph can even paint.** `computeInsights()` runs synchronously in the `analyze()` store action immediately after the dependency graph is fetched (`useRepositoryStore.ts` L219-221) — it's not wrapped in a worker, unlike the dagre layout. For a large graph this is a nontrivial synchronous computation (Tarjan's SCC, memoized DFS for longest path, several full node/edge passes) that blocks the UI thread right as the app transitions into rendering results, which matches the user's report of slowness "rendering the results in the frontend."

These are compounded by the backend side: `PathResolver.resolve()`'s sequential per-import filesystem probing (up to ~13 sequential syscalls for a single unresolved-extension specifier, `PathResolver.ts` L11-33) slows down `POST /analyze` itself for any repo with many relative imports lacking extensions — common in this exact codebase's own style. And because `getFiles`/`getDependencies` return the full model with no pagination, the frontend must wait for one large JSON payload to fully arrive before it can render anything, adding to the "analysis feels slow" impression before the graph view is even reached.

## Prioritized Fixes

### Quick wins
- **Cache the focused layout result** keyed by `(centerIds, depth, dependencies reference)` — e.g. lift it into the Zustand store or a `useRef`/`useMemo` at a level that survives `DependencyGraphView` unmounting, so returning to Architecture with the same focus/depth reuses the prior layout instead of re-running the worker.
- **Move `computeInsights()` off the main thread** — it's pure computation (like dagre already is), so the same Web Worker pattern used for layout applies directly.
- **Cache `realpath(repoPath)` once per `AnalysisEntry`** in `repository.service.ts` instead of recomputing it on every `getFileContent` call.
- **Cache the commits array per analysis** in `getGitData` instead of calling `Array.from(model.git.commits.values())` on every request.

### Bigger refactors
- **Parallelize import resolution within a file** in `DependencyExtractionEngine.extract()` — replace the sequential `for (const imp of parsedDeps.imports) { await resolve(...) }` with `Promise.all(parsedDeps.imports.map(...))`, and/or have `PathResolver.resolve()` check extension candidates concurrently (`Promise.any`/`Promise.all` instead of a sequential loop) rather than serially probing up to 13 paths.
- **Paginate or lazily stream `getFiles`/`getDependencies`** for large repos, or at minimum add a size-based warning/threshold so the frontend can progressively render instead of waiting on one large payload.

## Documentation Note

`ARCHITECTURE.md` is out of date relative to the current codebase: it still describes the old whole-graph `getDagreLayout` and folder Collapse-All/Expand-All controls, and an old "500 rendered nodes" cap on Git Timeline. Both were replaced by the current focused-neighborhood canvas (`getFocusedLayout`) and the virtualized `react-virtuoso` timeline. Not in scope to fix here, but worth flagging since it could mislead future debugging.
