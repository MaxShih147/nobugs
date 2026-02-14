import { T, glass, STATUSES, statusColor, priorityColor, projectColor, stripEmoji } from '../styles/tokens';
import { Avatar } from '../components/ui';

export default function KanbanView({ bugs, meta, onSelect }) {
  const columns = meta?.statuses?.length > 0 ? meta.statuses : STATUSES;
  return (
    <div className="fade-in" style={{
      padding: 32, display: 'grid', gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
      gap: 16, height: 'calc(100vh - 120px)', overflow: 'hidden',
    }}>
      {columns.map((status) => {
        const col = bugs.filter((b) => b.status === status);
        const color = statusColor(status);
        return (
          <div key={status} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 14, padding: '0 4px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', background: color,
                  boxShadow: `0 0 10px ${color}60`,
                }} />
                <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: T.fontSans }}>{status}</span>
              </div>
              <span style={{
                fontFamily: T.font, fontSize: '12px', color: T.textDim, fontWeight: 600,
                background: 'rgba(255, 255, 255, 0.04)', padding: '2px 8px', borderRadius: T.radiusSm,
              }}>{col.length}</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {col.map((bug) => (
                <div key={bug.id} onClick={() => onSelect(bug)} style={{
                  ...glass, borderRadius: T.radius,
                  padding: '14px 16px', cursor: 'pointer',
                  transition: `all 0.3s ${T.ease}`,
                  borderLeft: `3px solid ${priorityColor(bug.priority)}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = T.surfaceHover;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(139, 124, 246, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = T.surface;
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = T.shadow;
                }}>
                  <div style={{ fontSize: '11px', fontFamily: T.font, color: T.textDim, marginBottom: 8 }}>{bug.id}</div>
                  <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: 10, lineHeight: 1.4, fontFamily: T.fontSans }}>{bug.title}</div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
                    {(bug.tags || []).map((tag) => (
                      <span key={tag} style={{
                        fontSize: '10px', padding: '2px 8px', borderRadius: T.radiusSm,
                        background: 'rgba(255, 255, 255, 0.04)', color: T.textDim,
                        fontFamily: T.fontSans, fontWeight: 500,
                      }}>{tag}</span>
                    ))}
                    {bug.type && <span style={{
                      fontSize: '10px', padding: '2px 8px', borderRadius: T.radiusSm,
                      background: 'rgba(255, 255, 255, 0.04)', color: T.textDim,
                      fontFamily: T.fontSans, fontWeight: 500,
                    }}>{stripEmoji(bug.type)}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: projectColor(bug.project || bug.scope || ''), fontWeight: 500, fontFamily: T.fontSans }}>{stripEmoji(bug.project || bug.scope || '')}</span>
                    <Avatar name={bug.assignee} />
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
