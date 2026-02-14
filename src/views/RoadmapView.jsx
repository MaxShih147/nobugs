import { T, glass, priorityColor, statusColor, statusSoft, projectColor, stripEmoji } from '../styles/tokens';
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
            marginBottom: 20, ...glass,
            border: `1px solid ${isCurrent ? T.borderActive : T.border}`,
            boxShadow: isCurrent ? `${T.accentGlow}, ${T.shadow}` : T.shadow,
            borderRadius: T.radiusLg, overflow: 'hidden',
          }}>
            <div style={{
              padding: '18px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: `1px solid ${T.border}`,
              background: isCurrent ? T.accentSoft : 'transparent',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: T.fontSans }}>{sprint}</span>
                {isCurrent && <Badge color={T.accent} bg={T.accentSoft}>CURRENT</Badge>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: '12px', color: T.textDim, fontFamily: T.fontSans }}>{done}/{sBugs.length} done</span>
                <div style={{ width: 120 }}><ProgressBar value={done} max={sBugs.length} color={T.done} /></div>
                <span style={{ fontFamily: T.font, fontSize: '12px', color: T.textDim }}>{pct}%</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '18px 26px' }}>
              {sBugs.length === 0
                ? <div style={{ padding: 20, color: T.textDim, fontSize: '13px', fontFamily: T.fontSans }}>No bugs in this sprint matching filters.</div>
                : sBugs.map((bug) => (
                  <div key={bug.id} onClick={() => onSelect(bug)} style={{
                    ...glass, borderRadius: T.radius,
                    padding: '10px 14px', cursor: 'pointer', maxWidth: 280,
                    transition: `all 0.3s ${T.ease}`,
                    borderLeft: `3px solid ${priorityColor(bug.priority)}`,
                    opacity: bug.status === 'Done' ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = T.surfaceHover;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = T.surface;
                    e.currentTarget.style.transform = 'none';
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontFamily: T.font, fontSize: '10px', color: T.textDim }}>{bug.id}</span>
                      <Badge color={statusColor(bug.status)} bg={statusSoft(bug.status)} style={{ fontSize: '9px', padding: '1px 6px' }}>{bug.status}</Badge>
                    </div>
                    <div style={{
                      fontSize: '12px', fontWeight: 500, lineHeight: 1.3, marginBottom: 6,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: T.fontSans,
                    }}>{bug.title}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: projectColor(bug.project || bug.type || ''), fontFamily: T.fontSans }}>{stripEmoji(bug.project || bug.type || '')}</span>
                      <span style={{ fontSize: '10px', color: T.textDim, fontFamily: T.fontSans }}>{bug.assignee.split(' ')[0]}</span>
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
