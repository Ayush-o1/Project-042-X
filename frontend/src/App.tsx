import { useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './components/landing/LandingPage';
import { useRepositoryStore } from './store/useRepositoryStore';
import { useShallow } from 'zustand/react/shallow';
import './index.css';

function App() {
  const { showLanding, isAnalyzing, metadata } = useRepositoryStore(
    useShallow(s => ({
      showLanding: s.showLanding,
      isAnalyzing: s.isAnalyzing,
      metadata: s.metadata,
    })),
  );

  // Once analysis starts or metadata is loaded, lock body to prevent scroll
  // on the app shell (the landing page needs overflow: auto to scroll).
  useEffect(() => {
    if (!showLanding) {
      document.body.classList.add('app-mode');
    } else {
      document.body.classList.remove('app-mode');
    }
    return () => {
      document.body.classList.remove('app-mode');
    };
  }, [showLanding]);

  // If a repo is already loaded (e.g. session restored), never show landing
  const shouldShowLanding = showLanding && !metadata && !isAnalyzing;

  return shouldShowLanding ? <LandingPage /> : <AppShell />;
}

export default App;
