import { useState } from 'react';
import { T, PRIORITIES } from '../styles/tokens';
import { Badge, Avatar, BugRow, TableHeader, Card } from '../components/ui';

export default function MemberView({ bugs, meta, onSelect }) {
  const [selected, setSelected] = useState(null);

  const members = meta.members.map((m) => ({
    name: m,
    bugs: bugs.filter((b) => b.assignee === m),
    active: bugs.filter((b) => b.assignee === m && b.status !== 'Done').length,
    critical: bugs.filter((b) => b.assignee === m && b.priority === 'Critical' && b.status !== 'Done').length,
  }));

  const displayBugs = bugs
    .filter((b) => !selected || b.assignee === selected)
    .sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority));

  return (
    <div className="fade-in" style={{ padding: 32 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {members.map((m) => (
          <div key={m.name} onClick={() => setSelected(selected === m.name ? null : m.name)} style={{
            background: selected === m.name ? T.accentSoft : T.surface,
            border: `1px solid ${selected === m.name ? T.accent : T.border}`,
            borderRadius: T.radiusLg, padding: '16px 20px', cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { if (selected !== m.name) e.currentTarget.style.borderColor = T.textDim; }}
          onMouseLeave={(e) => { if (selected !== m.name) e.currentTarget.style.borderColor = T.border; }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Avatar name={m.name} size={36} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: '11px', color: T.textDim }}>{m.active} active</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {m.critical > 0 && <Badge color={T.critical} bg={T.criticalSoft}>{m.critical} critical</Badge>}
              <Badge color={T.textDim} bg={T.bg}>{m.bugs.length} total</Badge>
            </div>
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
