import { Pill, Avatar } from './ui';
import { T, glass, PRIORITIES, STATUSES, priorityColor, statusColor } from '../styles/tokens';
import { logout } from '../lib/api';

const VIEWS = [
  { id: 'summary', label: 'Summary' },
  { id: 'kanban', label: 'Kanban' },
  { id: 'member', label: 'Members' },
  { id: 'list', label: 'List' },
  { id: 'sprints', label: 'Sprints' },
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'unlinked', label: 'Unlinked' },
  { id: 'graph', label: 'Graph' },
  { id: 'structure', label: 'Structure' },
];

function Select({ value, onChange, options, placeholder, colorFn }) {
  const active = value && value !== 'All';
  const color = active && colorFn ? colorFn(value) : undefined;
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{
      background: 'rgba(255, 255, 255, 0.04)', border: `1px solid ${color ? `${color}40` : T.border}`,
      borderRadius: T.radiusSm, padding: '7px 12px', color: color || T.text,
      fontSize: '12px', fontFamily: T.fontSans, outline: 'none', cursor: 'pointer',
      transition: `all 0.25s ${T.ease}`,
    }}>
      <option value="All">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function UserMenu({ user }) {
  const displayName = user.memberName || user.name || user.email;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {user.avatar
        ? <img src={user.avatar} alt={displayName} style={{ width: 26, height: 26, borderRadius: '50%', border: `1px solid ${T.border}` }} />
        : <Avatar name={displayName} size={26} />
      }
      <span style={{ fontSize: '13px', color: T.textDim, fontFamily: T.fontSans, fontWeight: 500 }}>{displayName}</span>
      <button onClick={logout} style={{
        padding: '5px 12px', borderRadius: T.radiusSm, border: `1px solid ${T.border}`,
        background: 'transparent', color: T.textDim, fontSize: '11px',
        cursor: 'pointer', fontFamily: T.fontSans, fontWeight: 500,
        transition: `all 0.25s ${T.ease}`,
      }}>Logout</button>
    </div>
  );
}

export default function Header({ view, onViewChange, filters, meta, user, unlinkedCount }) {
  const views = user?.isAdmin
    ? [...VIEWS, { id: 'admin', label: 'Admin' }]
    : VIEWS;

  return (
    <div style={{
      padding: '14px 32px', borderBottom: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      ...glass, background: 'rgba(10, 11, 16, 0.8)',
      position: 'sticky', top: 0, zIndex: 10, flexWrap: 'wrap', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{
          fontSize: '18px', fontWeight: 700, fontFamily: T.fontSans,
          letterSpacing: '-0.5px',
          background: `linear-gradient(135deg, #c4b5fd, ${T.accent})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>nobugs</span>
        <div style={{ height: 20, width: 1, background: T.border }} />
        <div style={{ display: 'flex', gap: 4 }}>
          {views.map((v) => (
            <Pill key={v.id} active={view === v.id} onClick={() => onViewChange(v.id)}>
              {v.id === 'unlinked' && unlinkedCount != null ? `${v.label} (${unlinkedCount})` : v.label}
            </Pill>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <input value={filters.search} onChange={(e) => filters.setSearch(e.target.value)}
          placeholder="Search bugs..." style={{
            background: 'rgba(255, 255, 255, 0.04)', border: `1px solid ${T.border}`,
            borderRadius: T.radiusSm, padding: '7px 14px', color: T.text,
            fontSize: '13px', fontFamily: T.fontSans, width: 200, outline: 'none',
            transition: `all 0.25s ${T.ease}`,
          }} />
        {meta.projects?.length > 0 && <Select value={filters.project} onChange={filters.setProject} options={meta.projects} placeholder="All Projects" />}
        <Select value={filters.priority} onChange={filters.setPriority} options={meta.priorities?.length > 0 ? meta.priorities : PRIORITIES} placeholder="All Priorities" colorFn={priorityColor} />
        <Select value={filters.status} onChange={filters.setStatus} options={meta.statuses?.length > 0 ? meta.statuses : STATUSES} placeholder="All Statuses" colorFn={statusColor} />
        {user && <>
          <div style={{ height: 20, width: 1, background: T.border }} />
          <UserMenu user={user} />
        </>}
      </div>
    </div>
  );
}
