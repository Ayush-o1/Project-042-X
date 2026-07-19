import { toPng, toSvg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import type { InsightsResult } from './insightsEngine';
import type { RepositoryMetadata, FileModel } from '../types';

/**
 * Downloads a data URI or Blob to the user's filesystem.
 */
function downloadFile(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports a DOM node (like the React Flow graph) to a PNG image.
 */
export async function exportGraphToPng(elementId: string, filename: string = 'architecture-graph.png') {
  const node = document.getElementById(elementId);
  if (!node) throw new Error(`Element ${elementId} not found`);
  
  const dataUrl = await toPng(node, { 
    backgroundColor: '#0a0a0a',
    pixelRatio: 2 // High Res
  });
  downloadFile(dataUrl, filename);
}

/**
 * Exports a DOM node to an SVG image.
 */
export async function exportGraphToSvg(elementId: string, filename: string = 'architecture-graph.svg') {
  const node = document.getElementById(elementId);
  if (!node) throw new Error(`Element ${elementId} not found`);
  
  const dataUrl = await toSvg(node, { 
    backgroundColor: '#0a0a0a'
  });
  downloadFile(dataUrl, filename);
}

/**
 * Exports a comprehensive Markdown report.
 */
export function exportReportMarkdown(
  metadata: RepositoryMetadata,
  insights: InsightsResult,
  filename: string = 'architecture-report.md'
) {
  const timestamp = new Date().toISOString();
  
  let md = `# Architecture Report: ${metadata.name}\n\n`;
  md += `**Generated:** ${timestamp}\n`;
  md += `**Repository Path:** \`${metadata.path}\`\n\n`;

  md += `## Overview\n`;
  md += `- **Total Files:** ${metadata.statistics.totalFiles}\n`;
  md += `- **Total Commits:** ${metadata.statistics.totalCommits}\n`;
  md += `- **Total Branches:** ${metadata.statistics.totalBranches}\n`;
  md += `- **Predominant Language:** ${metadata.statistics.predominantLanguage}\n\n`;

  md += `## Architecture Insights\n`;
  md += `- **Circular Dependencies:** ${insights.circularDependencies.length}\n`;
  md += `- **Orphan Files:** ${insights.orphanFiles.length}\n`;
  md += `- **Average Fan-In:** ${insights.averageFanIn.toFixed(2)}\n`;
  md += `- **Max Dependency Depth:** ${insights.longestDependencyChain}\n\n`;

  md += `## Dependency Hotspots (Top 10)\n`;
  insights.hotspots.slice(0, 10).forEach(h => {
    md += `- \`${h.id}\` (Fan-In: ${h.inDegree})\n`;
  });
  md += `\n`;

  md += `## Most Active Git Files (Top 10)\n`;
  insights.mostActiveGitFiles.slice(0, 10).forEach(f => {
    md += `- \`${f.path}\` (${f.count} commits)\n`;
  });
  md += `\n`;

  md += `## File Type Distribution\n`;
  insights.fileTypeDistribution.forEach(f => {
    md += `- **${f.extension}**: ${f.count}\n`;
  });

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  downloadFile(url, filename);
  URL.revokeObjectURL(url);
}

/**
 * Exports a comprehensive JSON dump.
 */
export function exportReportJson(
  metadata: RepositoryMetadata,
  insights: InsightsResult,
  files: FileModel[],
  filename: string = 'architecture-report.json'
) {
  const payload = {
    timestamp: new Date().toISOString(),
    metadata,
    insights,
    fileCount: files.length
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  downloadFile(url, filename);
  URL.revokeObjectURL(url);
}

/**
 * Exports a basic multi-page PDF report.
 */
export function exportReportPdf(
  metadata: RepositoryMetadata,
  insights: InsightsResult,
  filename: string = 'architecture-report.pdf'
) {
  const doc = new jsPDF();
  const margin = 14;
  let cursorY = 20;

  const checkPage = (addedHeight: number) => {
    if (cursorY + addedHeight > 280) {
      doc.addPage();
      cursorY = 20;
    }
  };

  // Title
  doc.setFontSize(22);
  doc.text(`Architecture Report: ${metadata.name}`, margin, cursorY);
  cursorY += 10;
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toISOString()}`, margin, cursorY);
  cursorY += 15;

  doc.setTextColor(0);
  doc.setFontSize(16);
  doc.text('Overview', margin, cursorY);
  cursorY += 10;
  doc.setFontSize(12);
  doc.text(`Total Files: ${metadata.statistics.totalFiles}`, margin, cursorY); cursorY += 8;
  doc.text(`Total Commits: ${metadata.statistics.totalCommits}`, margin, cursorY); cursorY += 8;
  doc.text(`Predominant Language: ${metadata.statistics.predominantLanguage}`, margin, cursorY); cursorY += 15;

  checkPage(40);
  doc.setFontSize(16);
  doc.text('Architecture Insights', margin, cursorY);
  cursorY += 10;
  doc.setFontSize(12);
  doc.text(`Circular Dependencies: ${insights.circularDependencies.length}`, margin, cursorY); cursorY += 8;
  doc.text(`Orphan Files: ${insights.orphanFiles.length}`, margin, cursorY); cursorY += 8;
  doc.text(`Average Fan-In: ${insights.averageFanIn.toFixed(2)}`, margin, cursorY); cursorY += 8;
  doc.text(`Max Dependency Depth: ${insights.longestDependencyChain}`, margin, cursorY); cursorY += 15;

  checkPage(60);
  doc.setFontSize(16);
  doc.text('Dependency Hotspots', margin, cursorY);
  cursorY += 10;
  doc.setFontSize(10);
  insights.hotspots.slice(0, 10).forEach(h => {
    checkPage(10);
    // truncate long paths
    const text = `${h.id.substring(h.id.lastIndexOf('/') + 1)} (Fan-In: ${h.inDegree})`;
    doc.text(text, margin, cursorY);
    cursorY += 8;
  });
  cursorY += 10;

  checkPage(60);
  doc.setFontSize(16);
  doc.text('Most Active Git Files', margin, cursorY);
  cursorY += 10;
  doc.setFontSize(10);
  insights.mostActiveGitFiles.slice(0, 10).forEach(f => {
    checkPage(10);
    const text = `${f.path.substring(f.path.lastIndexOf('/') + 1)} (${f.count} commits)`;
    doc.text(text, margin, cursorY);
    cursorY += 8;
  });

  doc.save(filename);
}
