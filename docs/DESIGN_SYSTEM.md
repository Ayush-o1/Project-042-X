# Project 042-X Design System

## Design Philosophy
The UI must feel like a native, premium macOS/desktop developer tool (inspired by Linear, Raycast, and Warp). This means:
- Deep, rich dark mode by default.
- Subtle, glassmorphic elevations.
- Crisp, monospaced data rendering.
- Snappy, 150ms transitions.

## 1. Color Palette (CSS Variables)

```css
:root {
  /* Backgrounds */
  --bg-app: #000000;          /* Deepest black for application shell */
  --bg-panel: #0A0A0A;        /* Slightly elevated for sidebar/panels */
  --bg-surface: #141414;      /* Elevated surface for cards/nodes */
  --bg-hover: #1F1F1F;        /* Subtle hover state */
  --bg-active: #292929;       /* Active selected state */

  /* Borders */
  --border-subtle: rgba(255, 255, 255, 0.05);
  --border-default: rgba(255, 255, 255, 0.1);
  --border-focus: rgba(255, 255, 255, 0.2);

  /* Typography */
  --text-primary: #EDEDED;
  --text-secondary: #A1A1AA;
  --text-tertiary: #52525B;

  /* Accents */
  --accent-blue: #3B82F6;
  --accent-blue-hover: #2563EB;
  --accent-blue-bg: rgba(59, 130, 246, 0.1);
  
  /* Semantic */
  --color-danger: #EF4444;
  --color-success: #10B981;
  --color-warning: #F59E0B;
}
```

## 2. Typography
- **Sans-serif**: `Inter, system-ui, sans-serif`
- **Monospace**: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- **Scale**:
  - `text-xs`: 12px
  - `text-sm`: 13px
  - `text-base`: 14px
  - `text-lg`: 16px
  - `text-xl`: 20px

## 3. Spacing & Layout
- **Grid**: 4px base unit.
- **Padding**: 
  - Buttons: `6px 12px`
  - Panels: `16px`
  - Nodes: `12px 16px`
- **Radius**:
  - Subtle (Buttons, Inputs): `6px`
  - Cards (Nodes, Panels): `8px`
  - Windows/Modals: `12px`

## 4. Components Standardization
- **Segmented Controls (Tabs)**: Replace bottom-border tabs with a pill-shaped segmented control background.
- **Inputs**: Remove harsh borders, use subtle `var(--bg-surface)` with a 1px ring on focus.
- **Scrollbars**: Make them extremely thin (4px) and transparent until hovered.
- **Nodes**: Add `box-shadow: 0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.25)` to elevate them above the grid.

## 5. Animations
- **Durations**: Fast (`150ms` or `200ms`).
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` (Tailwind's 'ease-out').
- **Properties**: Only animate `opacity`, `transform`, and `background-color` to prevent layout thrashing.
