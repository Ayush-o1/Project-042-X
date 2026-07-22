# Export and Workflow Guide

Project 042-X now acts as a fully-featured persistence and reporting platform. This guide explains how to use the new session and export features.

## Managing Sessions
Because repositories contain massive dependency ASTs and Git history, re-analyzing them from scratch wastes time and CPU cycles.

- **Save Session**: Click the disk icon (`Save`) or press `Cmd+S` while a repository is analyzed. This dumps the entire AST, Git timeline, and metadata into a local IndexedDB store.
- **Session History**: Click the clock icon. Here you can load any previously saved session instantly. You can also export sessions to disk as raw JSON files and import them later or share them with teammates.

## Exporting Architecture Graphs
You can export the dependency graph to an image. The **Architecture tab must be open**: the export captures the graph as it is currently rendered on screen, so frame the view (e.g. Fit View) before exporting.
- **PNG**: Best for quickly pasting into Slack or presentations. Uses a high-density pixel ratio to avoid blurring.
- **SVG**: Best for printing or zooming in infinitely without loss of resolution.

## Generating Reports
Click the download icon (`Export`) and choose:
- **Markdown (`.md`)**: A deterministic document containing textual KPIs (Hotspots, Circular Dependencies, Orphan files). Excellent for appending to PRs.
- **JSON (`.json`)**: Raw payload for external scripting or CI tools.
- **PDF (`.pdf`)**: A clean, multi-page document formatted perfectly for stakeholder meetings. You can quickly generate this via the global keyboard shortcut: `Cmd+Shift+E`.

## Snapshot Comparison
To track architecture drift over time, save a session on branch A. Switch to branch B, run an analysis, and save another session. Click the `Compare` icon (two diverging arrows).
Select the two sessions to calculate the drift in metrics: total files, total commits, dependency edges, circular dependencies, orphan files, average fan-in, and maximum dependency depth.
