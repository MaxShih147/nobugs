import { useState } from 'react';
import { T, glass, PRIORITIES, projectColor, typeColor, stripEmoji } from '../styles/tokens';
import { Badge, BugRow, TableHeader, Card, ProgressBar } from '../components/ui';

export default function ListView({ bugs, meta, onSelect }) {
  const [selected, setSelected] = useState(null);

  const projectNames = meta.projects?.length > 0
    ? meta.projects
    : [...new Set(bugs.map((b) => b.project || b.type || '').filter(Boolean))];
  const projects = projectNames.map((p) => {
    const pBugs = bugs.filter((b) => (b.project || b.type || '') === p);
    return {
      name: p, total: pBugs.length,
      open: pBugs.filter((b) => b.status !== 'Done').length,
      critical: pBugs.filter((b) => b.priority === 'Critical' && b.status !== 'Done').length,
      done: pBugs.filter((b) => b.status === 'Done').length,
      color: meta.projects?.length > 0 ? projectColor(p) : typeColor(p),
    };
  }).filter((p) => p.total > 0);

  const displayBugs = bugs
    .filter((b) => !selected || (b.project || b.type || '') === selected)
    .sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority));

  return (
    <div className="fade-in" style={{ padding: 32 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {projects.map((p) => (
          <div key={p.name} onClick={() => setSelected(selected === p.name ? null : p.name)} style={{
            ...glass,
            background: selected === p.name ? `${p.color}11` : T.surface,
            borderWidth: '3px 1px 1px 1px',
            borderStyle: 'solid',
            borderColor: `${p.color} ${selected === p.name ? `${p.color}40` : T.border} ${selected === p.name ? `${p.color}40` : T.border}`,
            boxShadow: selected === p.name ? `0 0 40px ${p.color}15, ${T.shadow}` : T.shadow,
            borderRadius: T.radiusLg, padding: '18px 22px', cursor: 'pointer',
            transition: `all 0.3s ${T.ease}`,
          }}>
            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: 10, color: p.color, fontFamily: T.fontSans }}>{stripEmoji(p.name)}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Badge color={T.text} bg="rgba(255, 255, 255, 0.04)">{p.open} open</Badge>
              <Badge color={T.done} bg={T.doneSoft}>{p.done} done</Badge>
              {p.critical > 0 && <Badge color={T.critical} bg={T.criticalSoft}>{p.critical} crit</Badge>}
            </div>
            <div style={{ marginTop: 12 }}><ProgressBar value={p.done} max={p.total} color={T.done} height={4} /></div>
            <div style={{ fontSize: '11px', color: T.textDim, marginTop: 6, fontFamily: T.fontSans }}>{p.total > 0 ? ((p.done / p.total) * 100).toFixed(0) : 0}% resolved</div>
          </div>
        ))}
      </div>
      <Card style={{ overflow: 'hidden' }}>
        <TableHeader />
        {displayBugs.length === 0
          ? <div style={{ padding: 40, textAlign: 'center', color: T.textDim, fontFamily: T.fontSans }}>No bugs found for the current filters.</div>
          : displayBugs.map((bug) => <BugRow key={bug.id} bug={bug} onClick={onSelect} />)}
      </Card>
    </div>
  );
}
