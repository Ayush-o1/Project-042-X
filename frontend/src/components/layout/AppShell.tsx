import React, { Suspense } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { CommandPalette } from './CommandPalette';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { Loader2, AlertCircle, LayoutDashboard } from 'lucide-react';

import { SettingsModal } from './SettingsModal';
import { SessionHistory } from './SessionHistory';
import { CompareSnapshots } from '../insights/CompareSnapshots';
import { saveSession } from '../../lib/sessionEngine';
import { exportReportPdf } from '../../lib/exportEngine';
import { computeInsights } from '../../lib/insightsEngine';

const CodeViewer = React.lazy(() => import('../viewer/CodeViewer').then(m => ({ default: m.CodeViewer })));
const DependencyGraphView = React.lazy(() => import('../graph/DependencyGraphView').then(m => ({ default: m.DependencyGraphView })));
const GitGraphView = React.lazy(() => import('../graph/GitGraphView').then(m => ({ default: m.GitGraphView })));
const InsightsDashboard = React.lazy(() => import('../insights/InsightsDashboard').then(m => ({ default: m.InsightsDashboard })));

export const AppShell: React.FC = () => {
  const store = useRepositoryStore();
  const { isAnalyzing, error, metadata, activeTab, setActiveTab, setCommandPaletteOpen, activeFile, closeFile, files, dependencies, git } = store;

  React.useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'p')) {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault();
        if (activeFile) closeFile(activeFile.path);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (metadata) {
          const insights = computeInsights(files, dependencies, git);
          saveSession(metadata.name, metadata, files, dependencies, git, insights).then(() => {
            alert('Session saved via shortcut!');
          }).catch(console.error);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        if (metadata) {
          const insights = computeInsights(files, dependencies, git);
          exportReportPdf(metadata, insights);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [setCommandPaletteOpen, activeFile, closeFile, metadata, files, dependencies, git]);

  return (
    <div style={{ display: 'grid', gridTemplateRows: '60px 1fr', height: '100vh', width: '100vw' }}>
      <Header />
      
      <div style={{ display: 'flex', overflow: 'hidden' }}>
        <Sidebar />
        
        <main style={{ flex: 1, backgroundColor: 'var(--bg-app)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          
          <div className="flex-center" style={{ 
            padding: '12px 20px', 
            backgroundColor: 'var(--bg-panel)',
            borderBottom: '1px solid var(--border-default)' 
          }}>
            <div style={{ 
              display: 'flex', 
              backgroundColor: 'var(--bg-app)', 
              padding: '4px', 
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)'
            }}>
              <button 
                onClick={() => setActiveTab('code')}
                className="text-sm"
                style={{ 
                  padding: '6px 16px', 
                  borderRadius: '6px',
                  background: activeTab === 'code' ? 'var(--bg-active)' : 'transparent', 
                  color: activeTab === 'code' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: activeTab === 'code' ? 500 : 400,
                  cursor: 'pointer',
                  transition: 'all 150ms ease-out'
                }}
              >
                Code Viewer
              </button>
              <button 
                onClick={() => setActiveTab('dependencies')}
                className="text-sm"
                style={{ 
                  padding: '6px 16px', 
                  borderRadius: '6px',
                  background: activeTab === 'dependencies' ? 'var(--bg-active)' : 'transparent', 
                  color: activeTab === 'dependencies' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: activeTab === 'dependencies' ? 500 : 400,
                  cursor: 'pointer',
                  transition: 'all 150ms ease-out'
                }}
              >
                Architecture Graph
              </button>
              <button 
                onClick={() => setActiveTab('git')}
                className="text-sm"
                style={{ 
                  padding: '6px 16px', 
                  borderRadius: '6px',
                  background: activeTab === 'git' ? 'var(--bg-active)' : 'transparent', 
                  color: activeTab === 'git' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: activeTab === 'git' ? 500 : 400,
                  cursor: 'pointer',
                  transition: 'all 150ms ease-out'
                }}
              >
                Git Timeline
              </button>
              <button 
                onClick={() => setActiveTab('insights')}
                className="text-sm"
                style={{ 
                  padding: '6px 16px', 
                  borderRadius: '6px',
                  background: activeTab === 'insights' ? 'var(--bg-active)' : 'transparent', 
                  color: activeTab === 'insights' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: activeTab === 'insights' ? 500 : 400,
                  cursor: 'pointer',
                  transition: 'all 150ms ease-out'
                }}
              >
                Insights
              </button>
            </div>
          </div>

          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {!metadata && !isAnalyzing && !error && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                <div style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}>
                  <LayoutDashboard size={48} style={{ marginBottom: '16px', opacity: 0.5, color: 'var(--text-secondary)' }} />
                  <h2 className="text-lg" style={{ color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 500 }}>No Repository Loaded</h2>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Enter an absolute path in the top bar to begin analysis.</p>
                </div>
              </div>
            )}

            {isAnalyzing ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                <Loader2 size={24} className="animate-spin" style={{ marginBottom: '12px', color: 'var(--accent-blue)' }} />
                <p className="text-sm">Analyzing Architecture...</p>
              </div>
            ) : error ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-danger)' }}>
                <div style={{ padding: '24px', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <AlertCircle size={32} style={{ marginBottom: '12px' }} />
                  <p className="text-base" style={{ fontWeight: 500, marginBottom: '4px' }}>Analysis Failed</p>
                  <p className="text-sm" style={{ opacity: 0.8 }}>{error}</p>
                </div>
              </div>
            ) : metadata ? (
              <Suspense fallback={
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                  <Loader2 size={24} className="animate-spin" style={{ marginBottom: '12px', color: 'var(--accent-blue)' }} />
                  <p className="text-sm">Loading Module...</p>
                </div>
              }>
                {activeTab === 'code' && <CodeViewer />}
                {activeTab === 'dependencies' && <DependencyGraphView />}
                {activeTab === 'git' && <GitGraphView />}
                {activeTab === 'insights' && <InsightsDashboard />}
              </Suspense>
            ) : null}
          </div>
        </main>
      </div>
      <CommandPalette />
      <SettingsModal />
      <SessionHistory />
      <CompareSnapshots />
    </div>
  );
};
