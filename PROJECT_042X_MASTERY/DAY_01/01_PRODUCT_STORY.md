# DAY 1 — Topic 1: Project Story & Problem Statement

---

## Learning Objectives

- Understand *why* this project exists
- Be able to explain the problem space in plain English
- Identify the target users
- Know the 6 key features and explain each clearly

---

## Why This Matters for Interviews

Interviewers always open with: _"Tell me about your project."_

If you stammer here, the interview is effectively over.

You need a **crystal clear story** that takes 60–90 seconds and leaves the interviewer wanting to know more.

---

## The Product Story

### The Problem

Imagine you join a large engineering team. The codebase has 500+ TypeScript files. No one has written architecture documentation in years. You have a bug report that says "something in the authentication module is breaking" — but you don't know:
- Which files form the authentication module
- Which other modules depend on it
- When it was last modified and by whom

You could spend hours grepping through files, reading git logs manually, and trying to mentally map dependencies. This is exhausting, error-prone, and slow.

### The Solution

**Project 042-X** is a **local-first repository intelligence engine** that takes *any* Git repository on your machine and instantly gives you:

1. A visual, interactive map of every file and every dependency between them
2. A full Git history visualization — who changed what, when, and on which branch
3. Algorithmic insights about architectural health — circular dependencies, orphaned files, most coupled modules
4. Direct source code inspection without leaving the tool
5. Persistent sessions so you don't re-analyze the same repo every time
6. Export-quality reports in PDF, Markdown, JSON, PNG, and SVG

### Who Uses It

- **New engineers onboarding** to a large codebase they've never seen
- **Senior engineers** reviewing architectural health before a major refactor
- **Tech leads** preparing architecture diagrams for team discussions
- **Developers** debugging import cycles that cause circular dependency issues

---

## Key Features (Memorize All 6)

| # | Feature | One-Line Explanation |
|---|---------|---------------------|
| 1 | **AST-Driven Dependency Graph** | Parses every `.ts`/`.js` file using SWC (Rust-based), extracts ES6 imports, and draws a directed graph |
| 2 | **Git Timeline Integration** | Reads `.git` directly via `simple-git`, visualizes commit history, branch topology, and file change hotspots |
| 3 | **Insights Dashboard** | Runs Tarjan's SCC algorithm to detect circular dependencies, DFS to find max dependency depth, fan-in calculation to flag over-coupled files |
| 4 | **Integrated Code Viewer** | Click any node in the graph → opens the actual source file in a read-only code viewer — no context switching |
| 5 | **Zero-Config Session Persistence** | Saves entire analysis snapshots (AST + Git data) to **IndexedDB** in the browser — bypasses 5MB localStorage limits |
| 6 | **Comprehensive Export Engine** | Exports to PDF (jsPDF), Markdown, JSON, PNG (html-to-image), SVG — one-click snapshot sharing |

---

## The 90-Second Pitch (Memorize This)

> "Project 042-X is a local-first repository intelligence engine built with a Node.js backend and React frontend. The backend takes any absolute path to a local Git repository, uses SWC — a Rust-based compiler — to parse every TypeScript and JavaScript file into an Abstract Syntax Tree, and extracts all ES6 import statements to build a dependency graph. Simultaneously, it uses simple-git to extract the entire Git commit history. This data is served to the React frontend, which uses Dagre to compute graph coordinates and React Flow to render an interactive visualization. The frontend also runs Tarjan's Strongly Connected Components algorithm locally to detect circular dependencies, and memoized DFS to find the maximum dependency chain. Analysis sessions are persisted to IndexedDB so the user never has to re-analyze. You can export everything — graphs, reports, and raw data — in multiple formats."

**That's your pitch. Practice it until you can say it in under 90 seconds without notes.**

---

## The Business Problem (For "Why Did You Build This?" Questions)

| Aspect | Details |
|--------|---------|
| **Problem domain** | Developer tooling / codebase understanding |
| **Real pain point** | Large codebases are opaque to new developers |
| **Existing alternatives** | Manual grep, IDEs (limited visual), paid tools like Mend or Madge |
| **Key differentiator** | Local-first (privacy), no database needed, multi-format export, Git history integrated |
| **Target scale** | Works on codebases from 50 to 5000+ files |

---

## Important Files Referenced Here

| File | What It Does |
|------|-------------|
| [`README.md`](file:///Users/ayush/Desktop/Project%20042-X/README.md) | Product overview and quick start |
| [`ARCHITECTURE.md`](file:///Users/ayush/Desktop/Project%20042-X/ARCHITECTURE.md) | Technical architecture deep dive |

---

## Common Interview Questions (Day 1 Level)

**Q: What does your project do?**
> It's a repository intelligence engine. You give it a path to any local Git repository, and it analyzes the entire codebase — parsing TypeScript/JavaScript ASTs for dependencies, reading Git history, computing architectural health metrics, and displaying everything through an interactive visualization.

**Q: Who would use this?**
> Primarily developers onboarding to large codebases, tech leads preparing architecture reviews, or anyone debugging complex dependency issues. It's local-first, so it's private by design — no code ever leaves the machine.

**Q: Why local-first? Why not cloud?**
> For developer tooling, sending source code to a remote server is a major privacy concern — most enterprise codebases can't be uploaded. Running locally means zero latency on data transfer, no rate limits, and complete privacy. The tradeoff is it only works if the repository is on the user's machine.

**Q: How is this different from just using an IDE?**
> IDEs focus on *editing* code. This tool focuses on *understanding structure at scale*. It gives you multi-format export, cross-repository snapshot comparison, algorithmic health metrics (Tarjan's SCC, DFS depth), and a Git topology view — things no standard IDE provides in this combination.

---

## Follow-up Questions

**Q: What's the biggest limitation?**
> Only supports ES6 `import`/`export` syntax currently. CommonJS `require()` is not parsed for the dependency graph. Also only works on local repositories — no GitHub integration yet.

**Q: If you had more time, what would you add?**
> A WebWorker thread for Dagre layout calculations (currently blocking the main thread on very large repos), Python/Go AST parsing via language server protocol, and real-time file watching to incrementally update the graph when files change.

---

## Key Takeaways

- This is a **developer tooling project** — position it that way in interviews
- The key technical differentiators are: **SWC for AST**, **Tarjan's SCC**, **IndexedDB persistence**, **BFF architecture**
- It is **local-first by design** — privacy is a feature, not a limitation
- No external database, no authentication — stateless backend that serves one analyzed repo at a time
