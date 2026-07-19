# UI/UX Audit Report

## 1. Global Issues
- **Inline Styles**: The entire application relies on inline React styles (e.g., `style={{ display: 'flex' }}`). This causes severe inconsistency, bloated component files, and makes global theme updates nearly impossible.
- **Color Consistency**: While some CSS variables exist (`var(--bg-primary)`), raw hex codes are sprinkled throughout the codebase (e.g., `#1e1e1e` in CodeViewer, `#3b82f6` in FileNode).
- **Typography Hierarchy**: Font sizes are arbitrary (`11px`, `13px`, `14px`, `1.2rem`) rather than following a standardized modular scale (e.g., `text-sm`, `text-base`).
- **Transitions & Micro-interactions**: Missing almost entirely. Buttons and tabs lack hover backgrounds, active scales, and smooth color transitions.

## 2. Component-Level Issues

### AppShell (Layout & Navigation)
- **Tabs**: The view switcher (Code / Architecture / Git) uses harsh bottom borders. It feels like an old web app rather than a modern desktop tool (which typically uses segmented controls or subtle pill backgrounds).
- **Loading State**: The spinner is acceptable, but the transition from empty state -> loading state -> graph state is abrupt and causes layout shift.

### Header & Toolbar
- **Search Bar**: The input is excessively large and feels misaligned with the visual weight of the "Analyze" button.
- **Status Indicators**: Statistics (Files, Commits) are floating randomly on the right with low contrast (`var(--text-secondary)`). They lack visual structure.

### Sidebar (Repository Tree)
- **Spacing**: The folder depth indentation is functional but visually cramped.
- **Hover States**: No subtle background highlight when hovering over files.
- **Active State**: Selected files do not clearly stand out from unselected files in the tree.

### Code Viewer
- **Syntax Highlighting**: Completely missing. Code renders as plain text.
- **Typography**: The font family relies on system fallbacks (`"Fira Code", "JetBrains Mono", monospace`). If the user doesn't have these installed, it falls back to basic `monospace`, looking unprofessional.
- **Background Contrast**: The viewer background is hardcoded to `#1e1e1e`, clashing with the `var(--bg-primary)` black theme.

### Architecture & Git Graphs
- **Nodes**: `FileNode` and `CommitNode` lack elevation (box-shadow) and have harsh borders. 
- **Controls**: The React Flow minimap and controls use default styling which does not match the dark mode aesthetic.
