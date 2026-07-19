import React, { useState } from 'react';
import { useRepositoryStore } from '../../store/useRepositoryStore';
import { FolderGit2, Search, XCircle, Settings, Save, Download, Clock, GitCompare } from 'lucide-react';
import { saveSession } from '../../lib/sessionEngine';
import { exportGraphToPng, exportGraphToSvg, exportReportMarkdown, exportReportJson, exportReportPdf } from '../../lib/exportEngine';
import { computeInsights } from '../../lib/insightsEngine';

export const Header: React.FC = () => {
  const { 
    analyze, isAnalyzing, metadata, 
    cancelAnalysis, analysisProgress,
    setSettingsOpen, setSessionHistoryOpen, setCompareModalOpen,
    files, dependencies, git
  } = useRepositoryStore();
  
  const [pathInput, setPathInput] = useState('');
  const [exportOpen, setExportOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pathInput.trim()) {
      analyze(pathInput.trim());
    }
  };

  const handleSaveSession = async () => {
    if (!metadata) return;
    const insights = computeInsights(files, dependencies, git);
    try {
      await saveSession(metadata.name, metadata, files, dependencies, git, insights);
      alert('Session saved successfully!');
    } catch (err) {
      alert('Failed to save session');
    }
  };

  const handleExport = (format: string) => {
    setExportOpen(false);
    if (!metadata) return;
    const insights = computeInsights(files, dependencies, git);
    
    if (format === 'png') exportGraphToPng('architecture-graph-container');
    if (format === 'svg') exportGraphToSvg('architecture-graph-container');
    if (format === 'md') exportReportMarkdown(metadata, insights);
    if (format === 'json') exportReportJson(metadata, insights, files);
    if (format === 'pdf') exportReportPdf(metadata, insights);
  };

  return (
    <header style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      padding: '0 20px', 
      backgroundColor: 'var(--bg-panel)',
      borderBottom: '1px solid var(--border-default)',
      position: 'relative',
      zIndex: 10
    }}>
      {/* Progress Bar Overlay */}
      {isAnalyzing && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '2px', backgroundColor: 'var(--accent-blue)', width: `${analysisProgress}%`, transition: 'width 200ms ease-out' }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        <div className="flex-center" style={{ width: '32px', height: '32px', backgroundColor: 'var(--accent-blue)', borderRadius: '8px', color: '#fff' }}>
          <FolderGit2 size={20} />
        </div>
        <h1 className="text-base" style={{ fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Project 042-X
        </h1>
        {metadata && (
          <span className="text-xs" style={{ marginLeft: '12px', padding: '4px 10px', backgroundColor: 'var(--bg-surface)', borderRadius: '12px', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
            {metadata.name}
          </span>
        )}
      </div>

      <div style={{ flex: 2, display: 'flex', justifyContent: 'center' }}>
        <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '500px', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>
            <Search size={16} />
          </div>
          <input 
            type="text" 
            placeholder="Enter absolute path to local repository... (e.g. /Users/dev/project)"
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            disabled={isAnalyzing}
            className="text-sm"
            style={{
              width: '100%',
              padding: '8px 16px 8px 36px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              outline: 'none',
              transition: 'all 0.2s ease',
              opacity: isAnalyzing ? 0.6 : 1
            }}
          />
        </form>
        {isAnalyzing && (
          <button 
            type="button"
            onClick={cancelAnalysis} 
            title="Cancel Analysis"
            style={{ marginLeft: '12px', padding: '8px 12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500 }}
          >
            <XCircle size={14} /> Cancel
          </button>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
        
        {metadata && !isAnalyzing && (
          <>
            <button type="button" onClick={() => setCompareModalOpen(true)} title="Compare Snapshots" style={{ color: 'var(--text-secondary)', background: 'transparent' }}>
              <GitCompare size={18} />
            </button>
            <button type="button" onClick={() => setSessionHistoryOpen(true)} title="Session History" style={{ color: 'var(--text-secondary)', background: 'transparent' }}>
              <Clock size={18} />
            </button>
            <button type="button" onClick={handleSaveSession} title="Save Session" style={{ color: 'var(--text-secondary)', background: 'transparent' }}>
              <Save size={18} />
            </button>
            <div style={{ position: 'relative' }}>
              <button type="button" onClick={() => setExportOpen(!exportOpen)} title="Export Report" style={{ color: 'var(--text-secondary)', background: 'transparent' }}>
                <Download size={18} />
              </button>
              {exportOpen && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 100, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}>
                  <button type="button" onClick={() => handleExport('png')} className="text-sm" style={{ padding: '6px 12px', textAlign: 'left', borderRadius: '4px' }}>Graph PNG</button>
                  <button type="button" onClick={() => handleExport('svg')} className="text-sm" style={{ padding: '6px 12px', textAlign: 'left', borderRadius: '4px' }}>Graph SVG</button>
                  <button type="button" onClick={() => handleExport('md')} className="text-sm" style={{ padding: '6px 12px', textAlign: 'left', borderRadius: '4px' }}>Report Markdown</button>
                  <button type="button" onClick={() => handleExport('pdf')} className="text-sm" style={{ padding: '6px 12px', textAlign: 'left', borderRadius: '4px' }}>Report PDF</button>
                  <button type="button" onClick={() => handleExport('json')} className="text-sm" style={{ padding: '6px 12px', textAlign: 'left', borderRadius: '4px' }}>Report JSON</button>
                </div>
              )}
            </div>
            <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-default)' }} />
          </>
        )}

        <button type="button" onClick={() => setSettingsOpen(true)} title="Settings" style={{ color: 'var(--text-secondary)', background: 'transparent' }}>
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
};
