import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { CodeViewer } from '../viewer/CodeViewer';
import { DependencyGraphView } from '../graph/DependencyGraphView';
import { GitGraphView } from '../graph/GitGraphView';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { Loader2, AlertCircle, LayoutDashboard } from 'lucide-react';

export const AppShell: React.FC = () => {
  const { isAnalyzing, error, metadata, activeTab, setActiveTab } = useRepositoryStore();

  return (
    <div style={{ display: 'grid', gridTemplateRows: '60px 1fr', height: '100vh', width: '100vw' }}>
      <Header />
      
      <div style={{ display: 'flex', overflow: 'hidden' }}>
        <Sidebar />
        
        <main style={{ flex: 1, backgroundColor: 'var(--bg-primary)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
            <button 
              onClick={() => setActiveTab('code')}
              style={{ padding: '8px 16px', background: activeTab === 'code' ? 'var(--bg-primary)' : 'transparent', color: activeTab === 'code' ? 'var(--accent)' : 'var(--text-secondary)', borderBottom: activeTab === 'code' ? '2px solid var(--accent)' : '2px solid transparent', cursor: 'pointer' }}
            >
              Code Viewer
            </button>
            <button 
              onClick={() => setActiveTab('dependencies')}
              style={{ padding: '8px 16px', background: activeTab === 'dependencies' ? 'var(--bg-primary)' : 'transparent', color: activeTab === 'dependencies' ? 'var(--accent)' : 'var(--text-secondary)', borderBottom: activeTab === 'dependencies' ? '2px solid var(--accent)' : '2px solid transparent', cursor: 'pointer' }}
            >
              Architecture Graph
            </button>
            <button 
              onClick={() => setActiveTab('git')}
              style={{ padding: '8px 16px', background: activeTab === 'git' ? 'var(--bg-primary)' : 'transparent', color: activeTab === 'git' ? 'var(--accent)' : 'var(--text-secondary)', borderBottom: activeTab === 'git' ? '2px solid var(--accent)' : '2px solid transparent', cursor: 'pointer' }}
            >
              Git Timeline
            </button>
          </div>

          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {!metadata && !isAnalyzing && !error && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                <LayoutDashboard size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <h2 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>No Repository Loaded</h2>
                <p style={{ fontSize: '14px' }}>Enter an absolute path to a local Git repository in the top bar to begin.</p>
              </div>
            )}

            {isAnalyzing ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                <Loader2 size={32} className="animate-spin" style={{ marginBottom: '16px', color: 'var(--accent)' }} />
                <p>Analyzing Repository Architecture...</p>
              </div>
            ) : error ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--danger)' }}>
                <AlertCircle size={48} style={{ marginBottom: '16px' }} />
                <p style={{ fontWeight: 500, marginBottom: '4px' }}>Analysis Failed</p>
                <p style={{ fontSize: '13px', opacity: 0.8 }}>{error}</p>
              </div>
            ) : metadata ? (
              <>
                {activeTab === 'code' && <CodeViewer />}
                {activeTab === 'dependencies' && <DependencyGraphView />}
                {activeTab === 'git' && <GitGraphView />}
              </>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
};
