import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { CodeViewer } from '../viewer/CodeViewer';
import { useRepositoryStore } from '../../store/useRepositoryStore';

export const AppShell: React.FC = () => {
  const { isAnalyzing, error } = useRepositoryStore();

  return (
    <div style={{ display: 'grid', gridTemplateRows: '60px 1fr', height: '100vh', width: '100vw' }}>
      <Header />
      
      <div style={{ display: 'flex', overflow: 'hidden' }}>
        <Sidebar />
        
        <main style={{ flex: 1, backgroundColor: 'var(--bg-primary)', position: 'relative', overflow: 'hidden' }}>
          {isAnalyzing ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
              <div className="loader">Analyzing Repository...</div>
            </div>
          ) : error ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--danger)' }}>
              Error: {error}
            </div>
          ) : (
            <CodeViewer />
          )}
        </main>
      </div>
    </div>
  );
};
