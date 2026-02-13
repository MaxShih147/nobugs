import { T, STATUSES, statusColor, priorityColor, projectColor } from '../styles/tokens';
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
        return (
          <div key={status} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '0 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(status) }} />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{status}</span>
              </div>
              <span style={{ fontFamily: T.font, fontSize: '12px', color: T.textDim, fontWeight: 600 }}>{col.length}</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {col.map((bug) => (
                <div key={bug.id} onClick={() => onSelect(bug)} style={{
                  background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius,
                  padding: '12px 14px', cursor: 'pointer', transition: 'all 0.15s',
                  borderLeft: `3px solid ${priorityColor(bug.priority)}`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = T.surfaceHover; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = T.surface; e.currentTarget.style.transform = 'none'; }}>
                  <div style={{ fontSize: '11px', fontFamily: T.font, color: T.textDim, marginBottom: 6 }}>{bug.id}</div>
                  <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: 8, lineHeight: 1.4 }}>{bug.title}</div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                    {(bug.tags || []).map((tag) => (
                      <span key={tag} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '3px', background: T.bg, color: T.textDim, fontFamily: T.font }}>{tag}</span>
                    ))}
                    {bug.type && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '3px', background: T.bg, color: T.textDim, fontFamily: T.font }}>{bug.type}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: projectColor(bug.project || bug.scope || ''), fontWeight: 500 }}>{bug.project || bug.scope || ''}</span>
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
