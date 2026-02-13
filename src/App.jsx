import { useState } from 'react';
import { T } from './styles/tokens';
import { useBugs } from './hooks/useBugs';
import Header from './components/Header';
import BugDetail from './components/BugDetail';
import SummaryView from './views/SummaryView';
import KanbanView from './views/KanbanView';
import MemberView from './views/MemberView';
import ProjectView from './views/ProjectView';
import RoadmapView from './views/RoadmapView';
import CreateView from './views/CreateView';

export default function App() {
  const [view, setView] = useState('summary');
  const [detailBug, setDetailBug] = useState(null);
  const { bugs, meta, loading, error, filters, createBug } = useBugs();

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
      <Header view={view} onViewChange={setView} filters={filters} meta={meta} onNewBug={() => setView('create')} />
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
