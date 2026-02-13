import { T, projectColor } from '../styles/tokens';
import { PriorityBadge, StatusBadge } from './ui';

export default function BugDetail({ bug, onBack }) {
  if (!bug) return null;

  const fields = [
    ['Assignee', bug.assignee, null],
    bug.project ? ['Project', bug.project, projectColor(bug.project)] : ['Type', bug.type || '—', null],
    ['Sprint', bug.sprint || '—', null],
    ['Due Date', bug.due || 'No due date', null],
    ['Created', bug.created, null],
    bug.tags ? ['Tags', bug.tags.join(', ') || '—', null] : ['Scope', bug.scope || '—', null],
  ];

  return (
    <div className="slide-in" style={{ padding: 32, maxWidth: 800 }}>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', color: T.accent, cursor: 'pointer',
        fontFamily: T.fontSans, fontSize: '13px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6,
      }}>← Back to list</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <span style={{ fontFamily: T.font, fontSize: '14px', color: T.textDim }}>{bug.id}</span>
        <PriorityBadge priority={bug.priority} />
        <StatusBadge status={bug.status} />
      </div>

      <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: 24, lineHeight: 1.3 }}>{bug.title}</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        {fields.map(([label, val, color]) => (
          <div key={label} style={{
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '12px 16px',
          }}>
            <div style={{ fontSize: '11px', color: T.textDim, fontFamily: T.font, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: color || T.text }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, padding: '20px 24px' }}>
        <div style={{ fontSize: '11px', color: T.textDim, fontFamily: T.font, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Description</div>
        <pre style={{ fontFamily: T.font, fontSize: '13px', color: T.text, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{bug.description}</pre>
      </div>
    </div>
  );
}
