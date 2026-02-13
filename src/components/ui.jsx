import { T, priorityColor, prioritySoft, statusColor, statusSoft, projectColor } from '../styles/tokens';

export function Badge({ children, color, bg, style = {} }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
      borderRadius: '4px', fontSize: '11px', fontWeight: 600,
      fontFamily: T.font, color, background: bg, letterSpacing: '0.3px', ...style,
    }}>{children}</span>
  );
}

export function PriorityBadge({ priority }) {
  return <Badge color={priorityColor(priority)} bg={prioritySoft(priority)}>{priority}</Badge>;
}

export function StatusBadge({ status }) {
  return <Badge color={statusColor(status)} bg={statusSoft(status)}>{status}</Badge>;
}

export function Pill({ children, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', borderRadius: '6px', border: 'none',
      background: active ? T.accent : 'transparent',
      color: active ? '#fff' : T.textDim,
      fontSize: '13px', fontWeight: 500, cursor: 'pointer',
      fontFamily: T.fontSans, transition: 'all 0.15s',
    }}>{children}</button>
  );
}

export function StatCard({ label, value, sub, color }) {
  return (
    <div className="fade-in" style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: T.radiusLg, padding: '20px 24px', flex: 1, minWidth: 160,
    }}>
      <div style={{ fontSize: '12px', color: T.textDim, fontWeight: 500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: T.font }}>{label}</div>
      <div style={{ fontSize: '32px', fontWeight: 700, color: color || T.text, fontFamily: T.font, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: T.textDim, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

export function Avatar({ name, size = 22 }) {
  const initials = name.split(' ').map((n) => n[0]).join('');
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: T.accentSoft,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, color: T.accent, fontFamily: T.font, flexShrink: 0,
    }}>{initials}</div>
  );
}

export function BugRow({ bug, onClick }) {
  return (
    <div onClick={() => onClick(bug)} style={{
      display: 'grid', gridTemplateColumns: '80px 1fr 100px 90px 120px 120px 100px',
      alignItems: 'center', padding: '10px 16px', gap: 8,
      borderBottom: `1px solid ${T.border}`, cursor: 'pointer', transition: 'background 0.1s',
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = T.surfaceHover)}
    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
      <span style={{ fontFamily: T.font, fontSize: '12px', color: T.textDim }}>{bug.id}</span>
      <span style={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bug.title}</span>
      <PriorityBadge priority={bug.priority} />
      <StatusBadge status={bug.status} />
      <span style={{ fontSize: '12px', color: T.textDim }}>{bug.assignee.split(' ')[0]}</span>
      <span style={{ fontSize: '12px', color: projectColor(bug.project || bug.type || '') }}>{bug.project || bug.type || ''}</span>
      <span style={{ fontSize: '11px', color: T.textDim, fontFamily: T.font }}>{bug.due || '—'}</span>
    </div>
  );
}

export function TableHeader() {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '80px 1fr 100px 90px 120px 120px 100px',
      padding: '10px 16px', gap: 8, borderBottom: `1px solid ${T.border}`,
      fontSize: '11px', fontFamily: T.font, color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.5px',
    }}>
      <span>ID</span><span>Title</span><span>Priority</span><span>Status</span><span>Assignee</span><span>Type</span><span>Due</span>
    </div>
  );
}

export function ProgressBar({ value, max, color, height = 6 }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ height, background: T.bg, borderRadius: height / 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color || T.accent, borderRadius: height / 2, transition: 'width 0.5s ease' }} />
    </div>
  );
}

export function Card({ children, style = {}, ...props }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, ...style }} {...props}>
      {children}
    </div>
  );
}

export function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: '12px', color: T.textDim, fontFamily: T.font, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
      {children}
    </div>
  );
}
