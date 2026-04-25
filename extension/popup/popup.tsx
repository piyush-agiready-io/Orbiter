import React from 'react';
import { createRoot } from 'react-dom/client';
import './popup.css';
import { LoginForm } from './components/LoginForm';
import { BugCapture } from './components/BugCapture';
import { useExtAuth } from './hooks/useExtAuth';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, color: '#C93B3B' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>Extension Error</h3>
          <p style={{ fontSize: 12, margin: 0, lineHeight: 1.5 }}>
            {this.state.error.message}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              marginTop: 16,
              padding: '6px 16px',
              fontSize: 12,
              background: '#5B5FC7',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const { user, isLoading, error, login, logout } = useExtAuth();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#5B5FC7] border-t-transparent" />
        <p className="text-xs" style={{ color: '#8B8B9A' }}>Connecting to Orbiter...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLogin={login} error={error} />;
  }

  return <BugCapture user={user} onLogout={logout} />;
}

const root = createRoot(document.getElementById('root')!);
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
