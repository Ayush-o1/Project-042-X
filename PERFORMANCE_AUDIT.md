# Performance Audit

## Bottlenecks Identified

### 1. Frontend Rendering (Repository Tree)
- **Bottleneck**: `FileTree.tsx` recursively renders the entire directory structure into the DOM. For repositories with 10,000+ files, this creates a massive DOM tree that freezes the browser and eats memory.
- **Solution**: Flatten the tree structure into a 1D array of visible nodes and use a virtualization library (`react-virtuoso`) to render only what is in the viewport.

### 2. State & Data Fetching (API Latency & Startup)
- **Bottleneck**: `useRepositoryStore.ts` uses `Promise.all` to fetch files, dependencies, and git data simultaneously before showing anything to the user. This causes a huge latency spike. There is no way to cancel the analysis.
- **Solution**: Implement incremental loading. Fetch metadata first, display the skeleton UI, then fetch files, dependencies, and git data sequentially or in the background, updating a progress indicator. Use `AbortController` to cancel.

### 3. Component Loading (Bundle Size)
- **Bottleneck**: The React Flow dependencies and complex viewer components are all bundled into a single chunk, delaying initial startup time.
- **Solution**: Use `React.lazy` and `<Suspense>` to code-split `DependencyGraphView`, `GitGraphView`, and `CodeViewer`.

### 4. Memory Usage (Cache)
- **Bottleneck**: Large dependency arrays and git commits can consume significant RAM if kept indefinitely. 
- **Solution**: In this phase, ensuring nodes are not re-rendering unnecessarily via `React.memo` handles the CPU bottleneck, and virtualization handles the DOM memory bottleneck.
