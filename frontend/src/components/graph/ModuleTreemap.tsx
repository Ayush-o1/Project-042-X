import { useMemo, useRef, useState } from 'react';
import { Folder, HeartPulse, Flame, FileType2 } from 'lucide-react';
import { computeTreemap } from './treemapLayout';
import { getFolderPath } from './layoutUtils';
import { healthToColor } from '../../lib/health';
import type { PackageMetrics } from '../../lib/insightsEngine';
import type { DependencyGraphData } from '../../types';
import { useElementSize } from '../../hooks/useElementSize';

export type TreemapColorMode = 'health' | 'hotspot' | 'type';

const LANG_COLOR: Record<string, string> = {
  TypeScript: 'var(--lang-ts)',
  JavaScript: 'var(--lang-js)',
  JSON: 'var(--lang-json)',
};

function hotspotToColor(fanIn: number, maxFanIn: number): string {
  if (maxFanIn <= 0) return 'var(--bg-elevated)';
  const t = Math.min(1, fanIn / maxFanIn);
  // Amber (low) -> red (high); a distinct scale from health's green-anchored
  // one so "hotspot" mode never gets mistaken for "everything is healthy".
  const r = Math.round(251 - t * 12);
  const g = Math.round(191 - t * 175);
  const b = Math.round(36 - t * 20);
  return `rgb(${r}, ${g}, ${Math.max(0, b)})`;
}

interface FolderCell extends PackageMetrics {
  dominantType: string;
}

export const ModuleTreemap = ({
  dependencies,
  packageMetrics,
  colorMode,
  onColorModeChange,
  focusedFolder,
  onSelectFolder,
}: {
  dependencies: DependencyGraphData;
  packageMetrics: PackageMetrics[];
  colorMode: TreemapColorMode;
  onColorModeChange: (mode: TreemapColorMode) => void;
  focusedFolder: string | null;
  onSelectFolder: (folderPath: string) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(containerRef);
  const [hovered, setHovered] = useState<string | null>(null);

  const cells: FolderCell[] = useMemo(() => {
    const typeCounts = new Map<string, Map<string, number>>();
    for (const node of dependencies.nodes) {
      const folder = getFolderPath(node.path);
      if (!folder) continue;
      if (!typeCounts.has(folder)) typeCounts.set(folder, new Map());
      const counts = typeCounts.get(folder)!;
      counts.set(node.type, (counts.get(node.type) ?? 0) + 1);
    }
    return packageMetrics.map(pkg => {
      const counts = typeCounts.get(pkg.path);
      let dominantType = 'Other';
      let max = 0;
      counts?.forEach((count, type) => { if (count > max) { max = count; dominantType = type; } });
      return { ...pkg, dominantType };
    });
  }, [dependencies, packageMetrics]);

  const maxFanIn = useMemo(() => Math.max(1, ...cells.map(c => c.totalFanIn)), [cells]);

  const rects = useMemo(
    () => computeTreemap(cells.map(c => ({ value: c.fileCount })), width, height),
    [cells, width, height],
  );

  const colorFor = (cell: FolderCell): string => {
    if (colorMode === 'health') return healthToColor(cell.avgHealthScore);
    if (colorMode === 'hotspot') return hotspotToColor(cell.totalFanIn, maxFanIn);
    return LANG_COLOR[cell.dominantType] ?? 'var(--text-tertiary)';
  };

  const MODES: { key: TreemapColorMode; icon: React.ReactNode; label: string }[] = [
    { key: 'health', icon: <HeartPulse size={12} />, label: 'Health' },
    { key: 'hotspot', icon: <Flame size={12} />, label: 'Hotspot' },
    { key: 'type', icon: <FileType2 size={12} />, label: 'Type' },
  ];

  return (
    <div className="treemap-panel">
      <div className="treemap-panel-header">
        <div className="treemap-panel-title">
          <Folder size={13} />
          <span>Modules</span>
        </div>
        <div className="treemap-mode-toggle" role="group" aria-label="Treemap color mode">
          {MODES.map(m => (
            <button
              key={m.key}
              type="button"
              className={`treemap-mode-btn${colorMode === m.key ? ' active' : ''}`}
              onClick={() => onColorModeChange(m.key)}
              title={`Color by ${m.label}`}
              aria-label={`Color by ${m.label}`}
              aria-pressed={colorMode === m.key}
            >
              {m.icon}
            </button>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="treemap-canvas">
        {cells.length === 0 && (
          <div className="treemap-empty">No folders to show.</div>
        )}
        {cells.map((cell, i) => {
          const rect = rects[i];
          if (!rect || rect.width < 1 || rect.height < 1) return null;
          const label = cell.path.split('/').pop() || cell.path;
          const isFocused = focusedFolder === cell.path;
          const isHovered = hovered === cell.path;
          const showLabel = rect.width > 46 && rect.height > 24;
          return (
            <button
              key={cell.path}
              type="button"
              className={`treemap-cell${isFocused ? ' focused' : ''}${isHovered ? ' hovered' : ''}`}
              style={{
                left: rect.x, top: rect.y, width: rect.width, height: rect.height,
                background: colorFor(cell),
              }}
              onMouseEnter={() => setHovered(cell.path)}
              onMouseLeave={() => setHovered(h => (h === cell.path ? null : h))}
              onClick={() => onSelectFolder(cell.path)}
              title={`${cell.path} — ${cell.fileCount} file${cell.fileCount === 1 ? '' : 's'}, health ${Math.round(cell.avgHealthScore)}, ${cell.internalEdges + cell.externalEdges === 0 ? 0 : Math.round(cell.cohesion * 100)}% cohesion`}
              aria-label={`${label} — ${cell.fileCount} file${cell.fileCount === 1 ? '' : 's'}, health ${Math.round(cell.avgHealthScore)}`}
            >
              {showLabel && (
                <span className="treemap-cell-label">
                  {label}
                  <span className="treemap-cell-count">{cell.fileCount}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
