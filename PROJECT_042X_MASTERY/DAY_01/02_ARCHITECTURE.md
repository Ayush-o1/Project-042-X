# DAY 1 — Topic 2: High-Level Architecture

---

## Learning Objectives

- Understand the BFF (Backend for Frontend) architecture pattern
- Be able to draw the architecture diagram from memory
- Explain what each layer does and why it exists
- Understand how the 3 backend engines compose into a unified model

---

## Why This Matters

Architecture questions are the most common senior-level interview questions.
Even at campus level, interviewers ask: _"Walk me through your system design."_

If you can draw this confidently, you demonstrate **systems thinking** — a rare skill among freshers.

---

## Architecture Pattern: Backend for Frontend (BFF)

### What is BFF?

A BFF is a server that exists **specifically to serve one frontend** — unlike a general-purpose microservice API. The backend is not a shared platform. It's a dedicated processing pipeline that exists to feed exactly what the React frontend needs.

### Why BFF for this project?

| Concern | Solution |
|---------|----------|
| Frontend needs aggregated data (AST + Git + Filesystem) | Backend aggregates all 3 in one call |
| Frontend needs specific DTO shapes | Backend shapes data to frontend's exact needs |
| No other consumers of this API | No need for a general-purpose REST API |
| Minimize frontend complexity | Heavy computation (AST parsing) stays on backend |

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER MACHINE                              │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    REACT FRONTEND (Vite SPA)               │  │
│  │                                                            │  │
│  │  ┌──────────────┐  ┌───────────────┐  ┌────────────────┐  │  │
│  │  │ Zustand Store│  │ InsightsEngine│  │  ExportEngine  │  │  │
│  │  │(global state)│  │ (Tarjan's SCC)│  │ (PNG/PDF/JSON) │  │  │
│  │  └──────────────┘  └───────────────┘  └────────────────┘  │  │
│  │                                                            │  │
│  │  ┌──────────────┐  ┌───────────────┐  ┌────────────────┐  │  │
│  │  │  React Flow  │  │    Dagre      │  │   IndexedDB    │  │  │
│  │  │  (renderer)  │  │  (layout)     │  │  (sessions)    │  │  │
│  │  └──────────────┘  └───────────────┘  └────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                            │ HTTP                                 │
│                            ▼                                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │             NODE.JS BACKEND (Express + TypeScript)         │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │           RepositoryIntelligenceEngine               │  │  │
│  │  │                 (Orchestrator)                       │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │         │                    │                    │          │  │
│  │         ▼                    ▼                    ▼          │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │  │
│  │  │  Repository  │  │     AST      │  │      Git         │  │  │
│  │  │  Scanner     │  │   Engine     │  │    Engine        │  │  │
│  │  │ (FS traversal│  │  (SWC parser)│  │ (simple-git)     │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                            │                                      │
│                            ▼                                      │
│           ┌────────────────────────────┐                          │
│           │   LOCAL GIT REPOSITORY     │                          │
│           │   (Filesystem + .git dir)  │                          │
│           └────────────────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Backend Engine Architecture

The backend is structured as a **pipeline of independent analytical engines** coordinated by `RepositoryIntelligenceEngine`.

### Engine 1: RepositoryScanner
**File:** [`backend/src/core/scanner/RepositoryScanner.ts`](file:///Users/ayush/Desktop/Project%20042-X/backend/src/core/scanner/RepositoryScanner.ts)

**Responsibility:** Recursively traverses the filesystem starting from the repo root.

**What it produces:**
```typescript
interface RepositoryModel {
  path: string;      // absolute path
  name: string;      // basename
  totalFiles: number;
  totalSize: number;
  files: FileModel[];
}
```

**Key behaviors:**
- Verifies the path contains a `.git` directory (validates it's a Git repo)
- Reads `.gitignore` and applies those rules using the `ignore` npm package
- Also hardcodes ignores for `node_modules`, `dist`, `build`, `.git`, `.cache`, etc.
- Skips files over 5MB (configurable constant)
- Classifies each file by language using `ExtensionRegistry`

### Engine 2: DependencyExtractionEngine (AST Engine)
**File:** [`backend/src/core/ast/DependencyExtractionEngine.ts`](file:///Users/ayush/Desktop/Project%20042-X/backend/src/core/ast/DependencyExtractionEngine.ts)

**Responsibility:** Parses every JS/TS file and builds a dependency graph.

**Processing pipeline:**
1. Creates empty `DependencyGraph` with all files as nodes
2. For each `.ts/.tsx/.js/.jsx/.cjs/.mjs` file: reads content → passes to `SwcParser`
3. `SwcParser` produces `ParsedDependencies` (list of import specifiers)
4. `PathResolver` resolves each specifier to an absolute filesystem path
5. Creates edges in the `DependencyGraph`

**Concurrency:** Uses `p-limit` to process up to 50 files simultaneously (configurable).

### Engine 3: GitIntelligenceEngine
**File:** [`backend/src/core/git/GitIntelligenceEngine.ts`](file:///Users/ayush/Desktop/Project%20042-X/backend/src/core/git/GitIntelligenceEngine.ts)

**Responsibility:** Extracts complete Git history as a typed in-memory graph.

**Key implementation:**
- Uses a custom delimiter (`@@__042X__@@`) to safely parse multi-field log lines
- Git log format: `%H@@P@@%an@@%ae@@%aI@@%s@@%D` (hash, parents, author, email, date, message, refs)
- `--name-only` flag attaches changed file paths to each commit
- `--all` flag ensures all branches are captured

---

## Frontend Architecture

### State Management (Zustand)
**File:** [`frontend/src/store/useRepositoryStore.ts`](file:///Users/ayush/Desktop/Project%20042-X/frontend/src/store/useRepositoryStore.ts)

The single source of truth. It:
- Holds `metadata`, `files`, `dependencies`, `git` state
- Manages incremental fetch progress (0–100%)
- Handles `AbortController` for cancellable requests
- Manages tab state, open files, favorites, modals

### Insights Engine (Frontend-side computation)
**File:** [`frontend/src/lib/insightsEngine.ts`](file:///Users/ayush/Desktop/Project%20042-X/frontend/src/lib/insightsEngine.ts)

All the algorithmic heavy lifting happens **in the browser**, not on the backend. This design decision:
- Avoids re-serializing large data back to backend
- Makes insights computation lazy (only when user opens Insights tab)
- Keeps backend stateless and simple

### Graph Engine (Dagre + React Flow)
**File:** [`frontend/src/components/graph/layoutUtils.ts`](file:///Users/ayush/Desktop/Project%20042-X/frontend/src/components/graph/layoutUtils.ts)

1. `getDagreLayout()` — converts `DependencyGraphData` to positioned React Flow nodes
2. `getGitDagreLayout()` — converts Git commits to a topological layout

---

## Why No Database?

This is one of the most important design decisions. The interviewer **will** ask this.

> "The backend operates entirely in memory. It reads raw file bytes, parses ASTs, and interacts with the `.git` binary natively to construct a unified intelligence model. This model is served to the frontend, which handles persistence client-side via IndexedDB."

**Reasons:**
| Reason | Detail |
|--------|--------|
| **Data is ephemeral** | Repository analysis is always recalculated from source — storing it in DB would go stale |
| **Local-first** | Storing source code in an external DB would be a privacy violation |
| **Simpler deployment** | No database = no migration, no schema, no connection pooling |
| **Performance** | In-memory maps are faster than any DB round-trip for this use case |

**Tradeoff acknowledged:** If two users want to analyze the same repo simultaneously, they'd conflict (the backend only holds one `cachedModel`). This is an acceptable tradeoff for a single-user local tool.

---

## Common Interview Questions

**Q: Explain your system architecture.**
> "It's a Backend for Frontend architecture. The Node.js backend acts as a high-speed data processing pipeline — it takes a filesystem path, runs AST parsing via SWC, Git history extraction via simple-git, and filesystem traversal concurrently, then merges all results into a unified in-memory model. The React frontend fetches this data incrementally, normalizes it, and computes graph layouts and insights client-side using Dagre and Tarjan's algorithm. Session persistence happens entirely client-side via IndexedDB."

**Q: Why didn't you use a database?**
> "The repository data is derived from source files — storing it in a database would just create a stale cache with no clear invalidation strategy. The backend holds one analysis in memory at a time. Persistence is handled client-side in IndexedDB, which is appropriate because it's a single-user local tool and source code shouldn't leave the machine."

**Q: What if two people try to use it simultaneously?**
> "Currently, the backend is a singleton service — the `RepositoryService` uses a static `getInstance()` pattern and only holds one `cachedModel`. Simultaneous users would overwrite each other's analysis. For a production multi-user tool, you'd namespace sessions by user ID and store models keyed by session, or move to a microservice that spawns isolated worker processes per analysis job."

---

## Revision Notes

| Concept | Key Point |
|---------|-----------|
| Architecture | BFF — backend serves only this frontend |
| Backend | 3 engines: Scanner + AST + Git → merged by RepositoryIntelligenceEngine |
| Frontend | Zustand state → Insights computation → Dagre layout → React Flow render |
| No DB | Ephemeral in-memory model, client-side IndexedDB for sessions |
| Concurrency | Scanner + Git run in parallel via `Promise.all` |
| AST parsing | SWC (Rust-based), 20-100x faster than Babel |

---

## Key Takeaways

1. BFF = backend exists to serve one frontend. Not a general API.
2. Three backend engines run concurrently: Scanner feeds AST engine; Git engine runs separately.
3. All algorithmic insights (Tarjan's SCC, DFS) run client-side — backend stays simple.
4. No database is a **deliberate design decision** — not an oversight.
5. IndexedDB is used for persistence because it has no 5MB limit unlike localStorage.
