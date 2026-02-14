import { T, glass, priorityColor, prioritySoft, priorityDots, cleanPriority, statusColor, statusSoft, projectColor } from '../styles/tokens';

export function Badge({ children, color, bg, style = {} }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
      borderRadius: T.radiusSm, fontSize: '11px', fontWeight: 600,
      fontFamily: T.font, color, background: bg, letterSpacing: '0.3px', ...style,
    }}>{children}</span>
  );
}

export function PriorityBadge({ priority }) {
  return <Badge color={priorityColor(priority)} bg={prioritySoft(priority)}>{cleanPriority(priority)}</Badge>;
}

export function StatusBadge({ status }) {
  const color = statusColor(status);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px',
      borderRadius: T.radiusSm, fontSize: '11px', fontWeight: 600,
      fontFamily: T.font, color, background: statusSoft(status), letterSpacing: '0.3px',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: color,
        boxShadow: `0 0 8px ${color}`,
      }} />
      {status}
    </span>
  );
}

export function Pill({ children, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 16px', borderRadius: '10px', border: 'none',
      background: active ? T.accent : 'rgba(255, 255, 255, 0.04)',
      color: active ? '#fff' : T.textDim,
      fontSize: '13px', fontWeight: 500, cursor: 'pointer',
      fontFamily: T.fontSans, transition: `all 0.3s ${T.ease}`,
      boxShadow: active ? T.accentGlow : 'none',
    }}>{children}</button>
  );
}

export function StatCard({ label, value, sub, color }) {
  return (
    <div className="fade-in" style={{
      ...glass, borderRadius: T.radiusLg, padding: '22px 26px', flex: 1, minWidth: 160,
      boxShadow: color ? `0 0 40px ${color}15, ${T.shadow}` : T.shadow,
    }}>
      <div style={{
        fontSize: '11px', color: T.textDim, fontWeight: 500, marginBottom: 10,
        textTransform: 'uppercase', letterSpacing: '1px', fontFamily: T.fontSans,
      }}>{label}</div>
      <div style={{
        fontSize: '36px', fontWeight: 700, color: color || T.text,
        fontFamily: T.fontSans, lineHeight: 1, letterSpacing: '-1px',
      }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: T.textDim, marginTop: 8, fontFamily: T.fontSans }}>{sub}</div>}
    </div>
  );
}

export function Avatar({ name, size = 22 }) {
  const initials = name.split(' ').map((n) => n[0]).join('');
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${T.accentSoft}, rgba(139, 124, 246, 0.2))`,
      border: '1px solid rgba(139, 124, 246, 0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 600, color: T.accent,
      fontFamily: T.fontSans, flexShrink: 0,
    }}>{initials}</div>
  );
}

export function BugRow({ bug, onClick }) {
  return (
    <div onClick={() => onClick(bug)} style={{
      display: 'grid', gridTemplateColumns: '80px 1fr 100px 110px 120px 120px 100px',
      alignItems: 'center', padding: '12px 20px', gap: 8,
      borderBottom: `1px solid ${T.border}`, cursor: 'pointer',
      transition: `all 0.25s ${T.ease}`,
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(139, 124, 246, 0.04)')}
    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
      <span style={{ fontFamily: T.font, fontSize: '12px', color: T.textDim }}>{bug.id}</span>
      <span style={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: T.fontSans }}>{bug.title}</span>
      <PriorityBadge priority={bug.priority} />
      <StatusBadge status={bug.status} />
      <span style={{ fontSize: '12px', color: T.textDim, fontFamily: T.fontSans }}>{bug.assignee.split(' ')[0]}</span>
      <span style={{ fontSize: '12px', color: projectColor(bug.project || bug.type || ''), fontFamily: T.fontSans }}>{bug.project || bug.type || ''}</span>
      <span style={{ fontSize: '11px', color: T.textDim, fontFamily: T.font }}>{bug.due || '\u2014'}</span>
    </div>
  );
}

export function TableHeader() {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '80px 1fr 100px 110px 120px 120px 100px',
      padding: '12px 20px', gap: 8, borderBottom: `1px solid ${T.border}`,
      fontSize: '11px', fontFamily: T.fontSans, color: T.textDim,
      textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 500,
    }}>
      <span>ID</span><span>Title</span><span>Priority</span><span>Status</span><span>Assignee</span><span>Type</span><span>Due</span>
    </div>
  );
}

export function ProgressBar({ value, max, color, height = 6 }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const barColor = color || T.accent;
  return (
    <div style={{ height, background: 'rgba(255, 255, 255, 0.04)', borderRadius: T.radiusFull, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${pct}%`, borderRadius: T.radiusFull,
        background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
        boxShadow: `0 0 12px ${barColor}30`,
        transition: `width 0.6s ${T.ease}`,
      }} />
    </div>
  );
}

export function Card({ children, style = {}, ...props }) {
  return (
    <div style={{ ...glass, borderRadius: T.radiusLg, ...style }} {...props}>
      {children}
    </div>
  );
}

export function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: '11px', color: T.textDim, fontFamily: T.fontSans,
      textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14, fontWeight: 500,
    }}>
      {children}
    </div>
  );
}
