import { Pill, Avatar } from './ui';
import { T, glass, PRIORITIES, STATUSES } from '../styles/tokens';
import { logout } from '../lib/api';

const VIEWS = [
  { id: 'summary', label: 'Summary' },
  { id: 'kanban', label: 'Kanban' },
  { id: 'member', label: 'Members' },
  { id: 'project', label: 'Projects' },
  { id: 'roadmap', label: 'Roadmap' },
];

function Select({ value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{
      background: 'rgba(255, 255, 255, 0.04)', border: `1px solid ${T.border}`,
      borderRadius: T.radiusSm, padding: '7px 12px', color: T.text,
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

export default function Header({ view, onViewChange, filters, meta, onNewBug, user }) {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: T.radiusSm,
            background: `linear-gradient(135deg, ${T.accent}, #6366f1)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', boxShadow: T.accentGlow,
          }}>🛡️</div>
          <span style={{
            fontSize: '17px', fontWeight: 700, fontFamily: T.fontSans,
            letterSpacing: '-0.5px',
            background: `linear-gradient(135deg, ${T.text}, ${T.textDim})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>nobugs</span>
        </div>
        <div style={{ height: 20, width: 1, background: T.border }} />
        <div style={{ display: 'flex', gap: 4 }}>
          {views.map((v) => (
            <Pill key={v.id} active={view === v.id} onClick={() => onViewChange(v.id)}>{v.label}</Pill>
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
        <Select value={filters.priority} onChange={filters.setPriority} options={meta.priorities?.length > 0 ? meta.priorities : PRIORITIES} placeholder="All Priorities" />
        <Select value={filters.status} onChange={filters.setStatus} options={meta.statuses?.length > 0 ? meta.statuses : STATUSES} placeholder="All Statuses" />
        <button onClick={onNewBug} style={{
          padding: '7px 16px', borderRadius: T.radiusSm, border: 'none',
          background: `linear-gradient(135deg, ${T.accent}, #6366f1)`,
          color: '#fff', fontSize: '13px', fontWeight: 600,
          cursor: 'pointer', fontFamily: T.fontSans, whiteSpace: 'nowrap',
          boxShadow: T.accentGlow, transition: `all 0.25s ${T.ease}`,
        }}>+ New Bug</button>
        {user && <>
          <div style={{ height: 20, width: 1, background: T.border }} />
          <UserMenu user={user} />
        </>}
      </div>
    </div>
  );
}
