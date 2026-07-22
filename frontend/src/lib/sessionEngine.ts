import { get, set, keys, del } from 'idb-keyval';
import type { DependencyGraphData, FileModel, GitGraphData, RepositoryMetadata } from '../types';
import { computeInsights, serializeInsights } from './insightsEngine';
import type { InsightsResult } from './insightsEngine';

export interface AnalysisSession {
  id: string;
  timestamp: string;
  name: string;
  path: string;
  metadata: RepositoryMetadata;
  files: FileModel[];
  dependencies: DependencyGraphData | null;
  git: GitGraphData | null;
  insights?: InsightsResult | null;
}

export async function saveSession(
  name: string,
  metadata: RepositoryMetadata,
  files: FileModel[],
  dependencies: DependencyGraphData | null,
  git: GitGraphData | null,
  insights?: InsightsResult | null
): Promise<string> {
  const id = `session_${Date.now()}`;
  const session: AnalysisSession = {
    id,
    timestamp: new Date().toISOString(),
    name: name || metadata.name,
    path: metadata.path,
    metadata,
    files,
    dependencies,
    git,
    insights
  };
  
  await set(id, session);
  return id;
}

export async function listSessions(): Promise<Omit<AnalysisSession, 'files' | 'dependencies' | 'git' | 'insights'>[]> {
  const allKeys = await keys();
  const sessionKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith('session_')) as string[];
  
  const summaries: Omit<AnalysisSession, 'files' | 'dependencies' | 'git' | 'insights'>[] = [];
  for (const k of sessionKeys) {
    const session = await get<AnalysisSession>(k);
    if (session) {
      summaries.push({
        id: session.id,
        timestamp: session.timestamp,
        name: session.name,
        path: session.path,
        metadata: session.metadata
      });
    }
  }
  
  return summaries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function loadSession(id: string): Promise<AnalysisSession | undefined> {
  return await get<AnalysisSession>(id);
}

export async function deleteSession(id: string): Promise<void> {
  await del(id);
}

export async function exportSessionToFile(id: string) {
  const session = await loadSession(id);
  if (!session) throw new Error("Session not found");

  // insights contains Maps/Sets, which IndexedDB stores fine (structured clone)
  // but JSON.stringify silently turns into {} — serialize explicitly.
  const payload = {
    ...session,
    insights: session.insights ? serializeInsights(session.insights) : null,
  };
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `session-${session.name}-${new Date().getTime()}.json`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function importSessionFromFile(file: File): Promise<string> {
  const text = await file.text();
  const session: AnalysisSession = JSON.parse(text);
  if (!session.id || !session.metadata) {
    throw new Error("Invalid session file");
  }
  
  // Assign new ID to avoid collisions
  session.id = `session_${Date.now()}`;
  session.timestamp = new Date().toISOString();

  // Recompute insights from the raw data: the exported JSON stores a
  // serialized (Map/Set-free) form that in-app consumers can't use directly.
  session.insights = computeInsights(session.files || [], session.dependencies, session.git);

  await set(session.id, session);
  return session.id;
}
