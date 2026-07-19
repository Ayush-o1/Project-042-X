# Developer Experience (DX) Audit

## Current Friction Points

### 1. Navigation & State
- **Single File Limitation**: The `CodeViewer` currently only holds one `activeFile`. Switching files loses the previous file's context. Professional environments require multiple open tabs.
- **Amnesia**: The `FileTree` forgets which folders were expanded if the component re-renders or the repository is re-analyzed.
- **No History**: There is no "Recent Files" or "Favorites" functionality, making navigating large 1,000+ file repositories tedious.

### 2. Keyboard Accessibility
- **Mouse Dependency**: Everything requires a mouse click. Opening a file, analyzing a repository, and switching tabs have no keyboard shortcuts.
- **No Command Palette**: Lacking an omnibox (Cmd+K) prevents power users from rapidly executing actions or navigating without the mouse.
- **Focus Trap**: No explicit focus management for modal overlays or graph controls.

### 3. Context & Wayfinding
- **Lost Context**: When viewing a file deeply nested in `src/components/graph/nodes/FileNode.tsx`, the only indicator of location is a flat path string. There are no interactive breadcrumbs.
- **No Context Menus**: Right-clicking files in the explorer yields the default browser menu, missing application-specific actions like "Add to Favorites" or "Copy Path".

### 4. Search & Discovery
- **Missing File Search**: Finding a specific file requires expanding folders manually. A "Quick Open" (Cmd+P) fuzzy search is entirely missing.
