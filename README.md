# Project 042-X: Repository Intelligence Engine

> Interactive Git Repository Intelligence & Architecture Visualization Platform

Project 042-X is a high-performance developer tool designed to solve a critical engineering problem: **Understanding unfamiliar codebases.** 

Instead of manually tracing imports across hundreds of files or wrestling with obscure Git histories, Project 042-X acts as a visual "Google Maps for your Git Repository." Point it at any local Git repository, and it immediately generates a 2D interactive architectural map of dependencies, alongside a chronological DAG of your Git history.

## ✨ Features

- **Blazing Fast AST Parsing**: Leverages the SWC Rust-based compiler to parse thousands of TypeScript/JavaScript files in milliseconds.
- **Topological Dependency Graphing**: Automatically maps the exact import/export relationships between every file in the project.
- **Interactive Visualization**: Powered by `reactflow` and `dagre` mathematics, instantly mapping complex code architectures into a frictionless, zooming, panning 2D canvas.
- **Git Intelligence Engine**: Natively reads `.git` directories directly from the file system without requiring a host environment, visualizing branches, merges, and tags.
- **Code Viewer Integration**: Click any architectural node to instantly view its raw source code in an integrated IDE-like side panel.
- **Premium Desktop UX**: Modeled after modern tools like Linear and Raycast, providing a native, zero-latency stateful experience powered by `zustand`.

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Zustand, Lucide React, React Flow (`@xyflow/react`)
- **Backend**: Node.js, Express, TypeScript, Zod, SWC (`@swc/core`)
- **Algorithms**: topological DAG sorting, DAGRE auto-layout routing
- **Testing**: Vitest, Supertest

## 🚀 Installation & Usage

Project 042-X runs completely locally. It requires zero cloud configuration and does not rely on any database, protecting your proprietary code.

### 1. Setup Backend
```bash
cd backend
npm install
npm run build
npm start
```
*Backend runs on http://localhost:5001*

### 2. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on http://localhost:5173*

### 3. Analyze a Repository
1. Open the Frontend UI in your browser.
2. In the top search bar, enter the **Absolute Path** to any local Git repository on your machine.
3. Click **Analyze**.
4. Use the Tabs to switch between the Code Viewer, Architecture Graph, and Git Timeline.

## 🧠 Future Roadmap

- **WebAssembly Engine**: Moving the entire backend Git parsing logic into WASM to allow the app to run completely offline in the browser without a Node server.
- **Semantic Analysis**: Integrating local LLMs to automatically cluster related files into "Bounded Contexts" based on variable naming conventions.
- **Electron Packaging**: Wrapping the monolithic engine into a 1-click executable application for macOS/Windows.

---
*Developed as a showcase of Advanced Architectural Design, Full-Stack Typescript, and Complex Data Visualization.*
