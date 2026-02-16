import { useState, useEffect } from 'react';
import { T, glass } from './styles/tokens';
import { useBugs } from './hooks/useBugs';
import { fetchAuthStatus } from './lib/api';
import Header from './components/Header';
import BugDetail from './components/BugDetail';
import QuickCreate from './components/QuickCreate';
import SummaryView from './views/SummaryView';
import KanbanView from './views/KanbanView';
import MemberView from './views/MemberView';
import ListView from './views/ListView';
import RoadmapView from './views/RoadmapView';
import UnlinkedView from './views/UnlinkedView';
import GraphView from './views/GraphView';
import StructureView from './views/StructureView';
import AdminView from './views/AdminView';

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
    width: '100%', padding: '12px 16px', borderRadius: T.radius,
    border: `1px solid ${T.border}`,
    background: 'rgba(255, 255, 255, 0.03)', color: T.text,
    fontSize: '14px', fontFamily: T.fontSans, outline: 'none',
    boxSizing: 'border-box', transition: `all 0.25s ${T.ease}`,
  };

  return (
    <div style={{
      minHeight: '100vh', background: T.bg, display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: T.fontSans,
    }}>
      <form onSubmit={handleSubmit} style={{
        ...glass, borderRadius: T.radiusXl,
        padding: '52px 44px', maxWidth: 400, width: '100%',
        boxShadow: `${T.accentGlow}, ${T.shadowLg}`,
      }}>
        <img src="/nobugs-icon.png" alt="nobugs" style={{
          width: 52, height: 52, borderRadius: T.radiusLg,
          margin: '0 auto 24px', display: 'block',
          boxShadow: T.accentGlow,
        }} />
        <h1 style={{
          fontSize: '24px', fontWeight: 700, color: T.text,
          margin: '0 0 8px', fontFamily: T.fontSans, textAlign: 'center',
          letterSpacing: '-0.5px',
        }}>nobugs</h1>
        <p style={{
          fontSize: '14px', color: T.textDim, margin: '0 0 32px',
          lineHeight: 1.6, textAlign: 'center', fontFamily: T.fontSans,
        }}>
          Enter your email and invite code to sign in.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input type="email" placeholder="Email" required value={email}
            onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          <input type="password" placeholder="Invite code" required value={code}
            onChange={(e) => setCode(e.target.value)} style={inputStyle} />
          {err && <div style={{ fontSize: '13px', color: T.critical, fontFamily: T.fontSans }}>{err}</div>}
          <button type="submit" disabled={submitting} style={{
            padding: '12px 24px', borderRadius: T.radius, border: 'none',
            background: `linear-gradient(135deg, ${T.accent}, #6366f1)`,
            color: '#fff', fontSize: '14px', fontWeight: 600,
            cursor: submitting ? 'wait' : 'pointer', fontFamily: T.fontSans,
            opacity: submitting ? 0.7 : 1,
            boxShadow: T.accentGlow, transition: `all 0.25s ${T.ease}`,
          }}>{submitting ? 'Signing in...' : 'Sign in'}</button>
        </div>
      </form>
    </div>
  );
}

export default function App() {
  const [view, setViewState] = useState(() => {
    const hash = window.location.hash.slice(1);
    const valid = ['summary', 'kanban', 'member', 'list', 'roadmap', 'unlinked', 'graph', 'structure', 'admin'];
    return valid.includes(hash) ? hash : 'summary';
  });
  const setView = (v) => {
    setViewState(v);
    window.location.hash = v;
  };
  const [detailBug, setDetailBug] = useState(null);
  const [authState, setAuthState] = useState({ loading: true, authEnabled: false, authenticated: false, user: null });
  const { bugs, allBugs, meta, loading, error, filters, updateBug, createBug, reload } = useBugs();
  const unlinkedCount = allBugs.filter((b) => !b.parentNotionId).length;

  const handleSelect = (bug) => setDetailBug(bug);

  useEffect(() => {
    fetchAuthStatus()
      .then((data) => setAuthState({ loading: false, authEnabled: data.authEnabled, authenticated: data.authenticated, user: data.user || null }))
      .catch(() => setAuthState({ loading: false, authEnabled: false, authenticated: false, user: null }));
  }, []);

  if (authState.loading) {
    return (
      <div style={{
        minHeight: '100vh', background: T.bg, display: 'flex',
        alignItems: 'center', justifyContent: 'center', color: T.textDim, fontFamily: T.fontSans,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: T.accent,
            boxShadow: `0 0 12px ${T.accent}`,
            animation: 'glowPulse 2s ease-in-out infinite',
          }} />
          Loading...
        </div>
      </div>
    );
  }

  if (authState.authEnabled && !authState.authenticated) {
    return <LoginPage onLogin={(user) => { setAuthState({ loading: false, authEnabled: true, authenticated: true, user }); reload(); }} />;
  }

  if (view !== 'admin') {
    if (loading) {
      return (
        <div style={{
          minHeight: '100vh', background: T.bg, display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: T.textDim, fontFamily: T.fontSans,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: T.accent,
              boxShadow: `0 0 12px ${T.accent}`,
              animation: 'glowPulse 2s ease-in-out infinite',
            }} />
            Loading bugs...
          </div>
        </div>
      );
    }

    if (error && !(authState.authEnabled && error === 'Not authenticated')) {
      return (
        <div style={{
          minHeight: '100vh', background: T.bg, display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: T.critical,
          fontFamily: T.fontSans, flexDirection: 'column', gap: 12,
        }}>
          <div style={{ fontWeight: 600 }}>Error: {error}</div>
          <div style={{ fontSize: '13px', color: T.textDim }}>Check your .env configuration and server connection.</div>
        </div>
      );
    }
  }

  if (detailBug) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg }}>
        <BugDetail
          bug={detailBug}
          onBack={() => setDetailBug(null)}
          updateBug={updateBug}
          meta={meta}
          onBugUpdated={(updated) => setDetailBug(updated)}
          allBugs={allBugs}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg }}>
      <Header view={view} onViewChange={setView} filters={filters} meta={meta} user={authState.user} unlinkedCount={unlinkedCount} />
      <QuickCreate meta={meta} createBug={createBug} />
      {view === 'admin' && authState.user?.isAdmin && <AdminView user={authState.user} />}
      {view === 'summary' && <SummaryView bugs={bugs} allBugs={allBugs} meta={meta} onSelect={handleSelect} />}
      {view === 'kanban' && <KanbanView bugs={bugs} meta={meta} onSelect={handleSelect} />}
      {view === 'member' && <MemberView bugs={bugs} meta={meta} onSelect={handleSelect} />}
      {view === 'list' && <ListView bugs={bugs} meta={meta} onSelect={handleSelect} />}
      {view === 'roadmap' && <RoadmapView bugs={bugs} meta={meta} onSelect={handleSelect} />}
      {view === 'unlinked' && <UnlinkedView bugs={bugs} allBugs={allBugs} meta={meta} onSelect={handleSelect} updateBug={updateBug} />}
      {view === 'graph' && <GraphView allBugs={allBugs} updateBug={updateBug} />}
      {view === 'structure' && <StructureView allBugs={allBugs} updateBug={updateBug} />}
      <div style={{
        padding: '14px 32px', borderTop: `1px solid ${T.border}`,
        fontSize: '11px', color: T.textDim, fontFamily: T.fontSans,
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>nobugs — {bugs.length} bugs shown</span>
        <span>Data source: {import.meta.env.VITE_DATA_SOURCE === 'notion' ? 'Notion' : 'Mock'}</span>
      </div>
    </div>
  );
}
