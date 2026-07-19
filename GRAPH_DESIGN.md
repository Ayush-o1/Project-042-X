# Graph Visualization Design System

## Core Aesthetics
- **Canvas Background**: Deep black (`var(--bg-app)`) with subtle dot patterns (`var(--border-subtle)`).
- **Node Cards**: Glassmorphic panels with `var(--bg-surface)`. Will now include language colors for the left border to quickly identify file types (e.g., TS is blue, JS is yellow).
- **Folder Groups (New)**: Translucent, border-dashed containers (`rgba(255, 255, 255, 0.05)`) that encapsulate file nodes, representing directory structure.

## Edge Design
- **Default Edge**: Bezier curve, color `var(--border-focus)`, width `1px`.
- **Outgoing Edge (Active)**: Color `var(--accent-blue)`, width `2px`, animated dashed line. Represents files the focused node depends on.
- **Incoming Edge (Active)**: Color `var(--color-success)`, width `2px`, animated dashed line. Represents files that depend on the focused node.
- **Dimmed Edge**: Opacity `0.1`.

## Graph Inspector (New)
- **Position**: Right side absolute overlay, glassmorphic panel.
- **Content**: 
  - File Name & Path
  - Dependencies (outgoing) list
  - Dependents (incoming) list
  - Quick action to open file.

## Git Timeline
- **Hover Cards**: Floating tooltip using absolute positioning, showing Author, Full Hash, relative time, and full commit message.
- **Edges**: Smoothstep for branches.

## Smooth Animations
- **Camera Pans**: All zooming uses `duration: 800`.
- **Performance**: Use React's `memo` on custom node types to prevent 60fps drops during hover states.
