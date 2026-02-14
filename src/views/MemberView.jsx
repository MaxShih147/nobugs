import { useState } from 'react';
import { T, glass, PRIORITIES } from '../styles/tokens';
import { Badge, Avatar, BugRow, TableHeader, Card } from '../components/ui';

export default function MemberView({ bugs, meta, onSelect }) {
  const [selected, setSelected] = useState(null);

  const memberNames = meta.members?.length > 0
    ? meta.members
    : [...new Set(bugs.map((b) => b.assignee).filter((a) => a && a !== 'Unassigned'))];
  const members = memberNames.map((m) => ({
    name: m,
    bugs: bugs.filter((b) => b.assignee === m),
    active: bugs.filter((b) => b.assignee === m && b.status !== 'Done').length,
    critical: bugs.filter((b) => b.assignee === m && (b.priority === 'Critical' || b.priority.startsWith('P1')) && b.status !== 'Done').length,
  }));

  const displayBugs = bugs
    .filter((b) => !selected || b.assignee === selected)
    .sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority));

  return (
    <div className="fade-in" style={{ padding: 32 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {members.map((m) => (
          <div key={m.name} onClick={() => setSelected(selected === m.name ? null : m.name)} style={{
            ...glass,
            background: selected === m.name ? T.accentSoft : T.surface,
            border: `1px solid ${selected === m.name ? T.accent : T.border}`,
            boxShadow: selected === m.name ? `${T.accentGlow}, ${T.shadow}` : T.shadow,
            borderRadius: T.radiusLg, padding: '18px 22px', cursor: 'pointer',
            transition: `all 0.3s ${T.ease}`,
          }}
          onMouseEnter={(e) => {
            if (selected !== m.name) {
              e.currentTarget.style.borderColor = 'rgba(139, 124, 246, 0.15)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            if (selected !== m.name) {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.transform = 'none';
            }
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Avatar name={m.name} size={38} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: T.fontSans }}>{m.name}</div>
                <div style={{ fontSize: '11px', color: T.textDim, fontFamily: T.fontSans, marginTop: 2 }}>{m.active} active</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {m.critical > 0 && <Badge color={T.critical} bg={T.criticalSoft}>{m.critical} critical</Badge>}
              <Badge color={T.textDim} bg="rgba(255, 255, 255, 0.04)">{m.bugs.length} total</Badge>
            </div>
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
