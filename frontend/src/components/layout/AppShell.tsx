import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { CodeViewer } from '../viewer/CodeViewer';
import { DependencyGraphView } from '../graph/DependencyGraphView';
import { GitGraphView } from '../graph/GitGraphView';
import { useRepositoryStore } from '../../store/useRepositoryStore';

export const AppShell: React.FC = () => {
  const { isAnalyzing, error, activeTab, setActiveTab } = useRepositoryStore();

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
            {isAnalyzing ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                Analyzing Repository...
              </div>
            ) : error ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--danger)' }}>
                Error: {error}
              </div>
            ) : (
              <>
                {activeTab === 'code' && <CodeViewer />}
                {activeTab === 'dependencies' && <DependencyGraphView />}
                {activeTab === 'git' && <GitGraphView />}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
