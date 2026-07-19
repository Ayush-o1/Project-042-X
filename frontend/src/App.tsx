import './index.css';

function App() {
  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: 'hsl(var(--primary))' }}>
          Project 042-X
        </h1>
        <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '1.25rem' }}>
          Interactive Git Repository Intelligence
        </p>
      </div>
    </div>
  );
}

export default App;
