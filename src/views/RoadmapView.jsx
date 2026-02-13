import { T, priorityColor, statusColor, statusSoft, projectColor } from '../styles/tokens';
import { Badge, ProgressBar } from '../components/ui';

export default function RoadmapView({ bugs, meta, onSelect }) {
  const sprints = meta.sprints || [];

  return (
    <div className="fade-in" style={{ padding: 32 }}>
      {sprints.map((sprint, si) => {
        const sBugs = bugs.filter((b) => b.sprint === sprint);
        const done = sBugs.filter((b) => b.status === 'Done').length;
        const pct = sBugs.length > 0 ? ((done / sBugs.length) * 100).toFixed(0) : 0;
        const isCurrent = si === 1;

        return (
          <div key={sprint} style={{
            marginBottom: 24, background: T.surface,
            border: `1px solid ${isCurrent ? T.accent : T.border}`,
            borderRadius: T.radiusLg, overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: `1px solid ${T.border}`, background: isCurrent ? T.accentSoft : 'transparent',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '15px', fontWeight: 700 }}>{sprint}</span>
                {isCurrent && <Badge color={T.accent} bg={T.accentSoft}>CURRENT</Badge>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: '12px', color: T.textDim }}>{done}/{sBugs.length} done</span>
                <div style={{ width: 120 }}><ProgressBar value={done} max={sBugs.length} color={T.done} /></div>
                <span style={{ fontFamily: T.font, fontSize: '12px', color: T.textDim }}>{pct}%</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '16px 24px' }}>
              {sBugs.length === 0
                ? <div style={{ padding: 16, color: T.textDim, fontSize: '13px' }}>No bugs in this sprint matching filters.</div>
                : sBugs.map((bug) => (
                  <div key={bug.id} onClick={() => onSelect(bug)} style={{
                    background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radius,
                    padding: '8px 12px', cursor: 'pointer', maxWidth: 280, transition: 'all 0.15s',
                    borderLeft: `3px solid ${priorityColor(bug.priority)}`,
                    opacity: bug.status === 'Done' ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.textDim)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.border)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontFamily: T.font, fontSize: '10px', color: T.textDim }}>{bug.id}</span>
                      <Badge color={statusColor(bug.status)} bg={statusSoft(bug.status)} style={{ fontSize: '9px', padding: '1px 5px' }}>{bug.status}</Badge>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 500, lineHeight: 1.3, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bug.title}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: projectColor(bug.project || bug.type || '') }}>{bug.project || bug.type || ''}</span>
                      <span style={{ fontSize: '10px', color: T.textDim }}>{bug.assignee.split(' ')[0]}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
