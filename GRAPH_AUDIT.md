# Graph Visualization UX Audit

## Current Weaknesses

### 1. Interactivity & Feedback
- **Flat Dependency Highlighting**: While basic hovering highlights immediate connections, it lacks differentiation between incoming and outgoing dependencies, making it hard to see what depends on the current node vs what it depends on.
- **No Path Tracing**: Complex dependency chains (A -> B -> C) cannot be visualized. Hovering only shows immediate neighbors.
- **Node Cards**: Node cards are too basic. They lack metadata like file size or language-specific badges which reduces information density.

### 2. Navigation & Wayfinding
- **Minimap Design**: The minimap is functional but lacks semantic coloring. All nodes look the same, and folder structures are completely lost in the minimap.
- **No Inspector Panel**: Clicking a node selects it as the active file, but there is no dedicated graph inspector for viewing node metadata, full dependency list, or dependents list within the graph view.
- **Folder Structure Lost**: The graph is completely flat. Large repositories will be overwhelming without folder clustering or expand/collapse groups to hide complexity.

### 3. Aesthetics & Animations
- **Edges**: Edges lack directional flow indicators (e.g., labels or gradient coloring) and rely only on basic stroke color changes.
- **Animations**: While React Flow supports basic transitions, coordinate changes (if layout updates) are abrupt.
- **Empty States**: Loading and empty states are unstyled text strings.

### 4. Git Timeline Context
- **Information Density**: Commit nodes are visually large but lack interactive hover cards. The timeline view doesn't handle branching visually well.

### 5. Performance
- **Re-renders**: Current `DependencyGraphView` updates all nodes/edges on hover. This scales poorly in large repos. Nodes should use memoization and pure components.
