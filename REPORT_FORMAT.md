# Report Format Specification

Project 042-X exports data in deterministic formats. This specification outlines exactly what is included in the exported Markdown, PDF, and JSON reports to ensure consistent tooling.

## Common Data Fields

### 1. Repository Overview
- **Name:** Derived from the root directory.
- **Path:** Absolute local path.
- **Timestamp:** ISO 8601 UTC execution timestamp.
- **Total Files:** Count of non-ignored files.
- **Predominant Language:** Auto-detected by maximum file extension incidence.

### 2. Architecture Insights
- **Circular Dependencies:** A simple integer count of independent cyclical dependency groups.
- **Orphan Files:** Total integer count of isolated files with degree = 0.
- **Average Fan-In:** A floating-point number representing total connections divided by total nodes.
- **Max Depth:** Integer. The longest recursive import chain path found via DFS.

### 3. Dependency Hotspots
A ranked list (descending) of the top 10 files with the highest number of incoming imports. This indicates the most central systems in the codebase.

### 4. Git Activity Summary
A ranked list (descending) of the top 10 most frequently changed files based on `git log --name-only`.

## Export Modalities
- **Markdown**: Formatted sequentially with H1 and H2 headers. Designed for readability inside GitHub issues or READMEs.
- **PDF**: Generated via `jsPDF`. The report is programmatically paginated. Font sizes are strictly standardized.
- **JSON**: The raw, unadulterated payload containing `metadata`, `insights`, and raw file counts. Safe for ingestion by CI pipelines.
