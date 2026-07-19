# Optimization Guide

## Best Practices

### 1. Virtualization is Mandatory for Lists
Never map over an unbounded array of DOM nodes (like files or commits). Always use `react-virtuoso` or a flattened array windowing approach to keep DOM node count constant.

### 2. Incremental Data Loading
When dealing with massive payloads (like graph data):
- Don't block the UI with `Promise.all`.
- Show progress to the user immediately.
- Allow the user to cancel long-running operations using `AbortController`.

### 3. Lazy Component Loading
Heavy libraries (like `@xyflow/react` and `dagre`) should be code-split. Only load them when the user navigates to the specific tab. Use:
```tsx
const DependencyGraphView = React.lazy(() => import('./DependencyGraphView'));
```

### 4. Strict React.memo
For components rendered inside lists or graphs (e.g., `FileNode`, `CommitNode`), always wrap them in `React.memo` to prevent re-renders when parent states (like hovered nodes) change, except for the specific nodes being targeted.
