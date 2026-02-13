import { useState, useEffect } from 'react';
import { T } from './styles/tokens';
import { useBugs } from './hooks/useBugs';
import { fetchAuthStatus } from './lib/api';
import Header from './components/Header';
import BugDetail from './components/BugDetail';
import SummaryView from './views/SummaryView';
import KanbanView from './views/KanbanView';
import MemberView from './views/MemberView';
import ProjectView from './views/ProjectView';
import RoadmapView from './views/RoadmapView';
import CreateView from './views/CreateView';

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error); setSubmitting(false); return; }
      onLogin(data.user);
    } catch { setErr('Connection failed'); setSubmitting(false); }
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${T.border}`,
    background: T.bg, color: T.text, fontSize: '14px', fontFamily: T.fontSans, outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      minHeight: '100vh', background: T.bg, display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: T.fontSans,
    }}>
      <form onSubmit={handleSubmit} style={{
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusLg,
        padding: '48px 40px', maxWidth: 380, width: '100%',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '12px', background: T.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px', margin: '0 auto 20px',
        }}>🛡️</div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: T.text, margin: '0 0 8px', fontFamily: T.font, textAlign: 'center' }}>nobugs</h1>
        <p style={{ fontSize: '14px', color: T.textDim, margin: '0 0 28px', lineHeight: 1.5, textAlign: 'center' }}>
          Enter your email and invite code to sign in.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input type="email" placeholder="Email" required value={email}
            onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          <input type="password" placeholder="Invite code" required value={code}
            onChange={(e) => setCode(e.target.value)} style={inputStyle} />
          {err && <div style={{ fontSize: '13px', color: T.critical }}>{err}</div>}
          <button type="submit" disabled={submitting} style={{
            padding: '10px 24px', borderRadius: '8px', border: 'none',
            background: T.accent, color: '#fff', fontSize: '14px', fontWeight: 600,
            cursor: submitting ? 'wait' : 'pointer', fontFamily: T.fontSans,
            opacity: submitting ? 0.7 : 1,
          }}>{submitting ? 'Signing in...' : 'Sign in'}</button>
        </div>
      </form>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState('summary');
  const [detailBug, setDetailBug] = useState(null);
  const [authState, setAuthState] = useState({ loading: true, authEnabled: false, authenticated: false, user: null });
  const { bugs, meta, loading, error, filters, createBug } = useBugs();

  useEffect(() => {
    fetchAuthStatus()
      .then((data) => setAuthState({ loading: false, authEnabled: data.authEnabled, authenticated: data.authenticated, user: data.user || null }))
      .catch(() => setAuthState({ loading: false, authEnabled: false, authenticated: false, user: null }));
  }, []);

  if (authState.loading) {
    return (
      <div style={{
        minHeight: '100vh', background: T.bg, display: 'flex',
        alignItems: 'center', justifyContent: 'center', color: T.textDim, fontFamily: T.font,
      }}>Loading...</div>
    );
  }

  if (authState.authEnabled && !authState.authenticated) {
    return <LoginPage onLogin={(user) => setAuthState({ loading: false, authEnabled: true, authenticated: true, user })} />;
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: T.bg, display: 'flex',
        alignItems: 'center', justifyContent: 'center', color: T.textDim, fontFamily: T.font,
      }}>Loading bugs...</div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh', background: T.bg, display: 'flex',
        alignItems: 'center', justifyContent: 'center', color: T.critical,
        fontFamily: T.font, flexDirection: 'column', gap: 12,
      }}>
        <div>Error: {error}</div>
        <div style={{ fontSize: '13px', color: T.textDim }}>Check your .env configuration and server connection.</div>
      </div>
    );
  }

  if (detailBug) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg }}>
        <BugDetail bug={detailBug} onBack={() => setDetailBug(null)} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg }}>
      <Header view={view} onViewChange={setView} filters={filters} meta={meta} onNewBug={() => setView('create')} user={authState.user} />
      {view === 'create' && <CreateView meta={meta} onCreate={createBug} onCancel={() => setView('summary')} />}
      {view === 'summary' && <SummaryView bugs={bugs} meta={meta} onSelect={setDetailBug} />}
      {view === 'kanban' && <KanbanView bugs={bugs} meta={meta} onSelect={setDetailBug} />}
      {view === 'member' && <MemberView bugs={bugs} meta={meta} onSelect={setDetailBug} />}
      {view === 'project' && <ProjectView bugs={bugs} meta={meta} onSelect={setDetailBug} />}
      {view === 'roadmap' && <RoadmapView bugs={bugs} meta={meta} onSelect={setDetailBug} />}
      <div style={{
        padding: '12px 32px', borderTop: `1px solid ${T.border}`,
        fontSize: '11px', color: T.textDim, fontFamily: T.font,
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>nobugs — {bugs.length} bugs shown</span>
        <span>Data source: {import.meta.env.VITE_DATA_SOURCE === 'notion' ? 'Notion' : 'Mock'}</span>
      </div>
    </div>
  );
}
