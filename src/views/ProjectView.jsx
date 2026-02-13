import { useState } from 'react';
import { T, PRIORITIES, projectColor } from '../styles/tokens';
import { Badge, BugRow, TableHeader, Card, ProgressBar } from '../components/ui';

export default function ProjectView({ bugs, meta, onSelect }) {
  const [selected, setSelected] = useState(null);

  const projects = meta.projects.map((p) => {
    const pBugs = bugs.filter((b) => b.project === p);
    return {
      name: p, total: pBugs.length,
      open: pBugs.filter((b) => b.status !== 'Done').length,
      critical: pBugs.filter((b) => b.priority === 'Critical' && b.status !== 'Done').length,
      done: pBugs.filter((b) => b.status === 'Done').length,
      color: projectColor(p),
    };
  }).filter((p) => p.total > 0);

  const displayBugs = bugs
    .filter((b) => !selected || b.project === selected)
    .sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority));

  return (
    <div className="fade-in" style={{ padding: 32 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {projects.map((p) => (
          <div key={p.name} onClick={() => setSelected(selected === p.name ? null : p.name)} style={{
            background: selected === p.name ? `${p.color}11` : T.surface,
            border: `1px solid ${selected === p.name ? p.color : T.border}`,
            borderRadius: T.radiusLg, padding: '16px 20px', cursor: 'pointer', transition: 'all 0.15s',
            borderTop: `3px solid ${p.color}`,
          }}>
            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: 8, color: p.color }}>{p.name}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Badge color={T.text} bg={T.bg}>{p.open} open</Badge>
              <Badge color={T.done} bg={T.doneSoft}>{p.done} done</Badge>
              {p.critical > 0 && <Badge color={T.critical} bg={T.criticalSoft}>{p.critical} crit</Badge>}
            </div>
            <div style={{ marginTop: 10 }}><ProgressBar value={p.done} max={p.total} color={T.done} height={4} /></div>
            <div style={{ fontSize: '11px', color: T.textDim, marginTop: 4 }}>{p.total > 0 ? ((p.done / p.total) * 100).toFixed(0) : 0}% resolved</div>
          </div>
        ))}
      </div>
      <Card style={{ overflow: 'hidden' }}>
        <TableHeader />
        {displayBugs.length === 0
          ? <div style={{ padding: 32, textAlign: 'center', color: T.textDim }}>No bugs found for the current filters.</div>
          : displayBugs.map((bug) => <BugRow key={bug.id} bug={bug} onClick={onSelect} />)}
      </Card>
    </div>
  );
}
