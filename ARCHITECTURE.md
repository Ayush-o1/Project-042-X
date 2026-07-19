# Project 042-X Architecture

## Overview
Project 042-X utilizes a strict **Backend-for-Frontend (BFF)** monolithic service architecture. The core principle is that the backend acts as a high-speed data cruncher, reading the user's local disk, while the frontend acts as a thin, highly interactive presentation layer.

## Backend: Unified Repository Engine
The backend is split into independent sub-engines that are orchestrated by a central `RepositoryIntelligenceEngine`.

1. **Repository Scanner**: A recursive filesystem traversal engine that locates files, categorizes them by language extension, and calculates size metrics.
2. **AST Dependency Engine**: Uses `@swc/core` (a Rust-based WebAssembly parser) to parse source code into an Abstract Syntax Tree. A custom `PathResolver` traverses the tree to extract module imports/exports, mapping out file relationships as a Directed Graph (Edges and Nodes).
3. **Git Intelligence Engine**: Bypasses the `git` CLI entirely. It reads the `.git/objects` and `.git/refs` directories directly, parsing binary Zlib-compressed commits and trees to reconstruct the repository's history as a Directed Acyclic Graph (DAG).
4. **API Layer**: An Express.js REST API wrapped with `Zod` for strict runtime schema validation. A Singleton `RepositoryService` caches the massive JSON graphs in-memory to ensure subsequent frontend tab-switches respond in <10ms.

## Frontend: Visualization Engine
The frontend completely bypasses traditional React prop-drilling by utilizing `zustand` as a global state management layer.

1. **State Store (`useRepositoryStore`)**: Natively manages API fetching, error boundary states, and the currently active file/graph.
2. **Layout Shell**: A CSS-Grid powered responsive container split into a Sidebar (File Tree) and a Main Canvas (Tabs).
3. **Dagre Mathematics (`layoutUtils.ts`)**: Because backend files have no inherent X/Y spatial coordinates, the frontend runs `dagre` (a directed graph layout algorithm) to mathematically assign optimal spatial positioning to nodes before rendering.
4. **XYFlow Engine**: `@xyflow/react` leverages WebGL and optimized DOM recycling to render thousands of architectural nodes. It supports native panning, zooming, and a minimap out-of-the-box.

## Data Flow
1. User inputs absolute path in Frontend.
2. Frontend POSTs path to Backend API.
3. Backend validates path, spawns Git Engine + AST Engine.
4. Backend unifies data into a massive JSON Graph Model and caches it in RAM.
5. Frontend fetches JSON via `GET` endpoints.
6. Frontend executes `dagre` to calculate X/Y coordinates.
7. Frontend renders the React Flow interactive canvas.
