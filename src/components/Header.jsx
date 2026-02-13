import { Pill, Avatar } from './ui';
import { T, PRIORITIES, STATUSES } from '../styles/tokens';
import { logout } from '../lib/api';

const VIEWS = [
  { id: 'summary', label: '📊 Summary' },
  { id: 'kanban', label: '⬜ Kanban' },
  { id: 'member', label: '👤 Members' },
  { id: 'project', label: '📁 Projects' },
  { id: 'roadmap', label: '🗓️ Roadmap' },
];

function Select({ value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{
      background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radius,
      padding: '6px 10px', color: T.text, fontSize: '12px', fontFamily: T.font, outline: 'none', cursor: 'pointer',
    }}>
      <option value="All">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function UserMenu({ user }) {
  const displayName = user.name || user.email;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {user.avatar
        ? <img src={user.avatar} alt={displayName} style={{ width: 24, height: 24, borderRadius: '50%' }} />
        : <Avatar name={displayName} size={24} />
      }
      <span style={{ fontSize: '12px', color: T.textDim, fontFamily: T.fontSans }}>{displayName}</span>
      <button onClick={logout} style={{
        padding: '4px 10px', borderRadius: '4px', border: `1px solid ${T.border}`,
        background: 'transparent', color: T.textDim, fontSize: '11px',
        cursor: 'pointer', fontFamily: T.fontSans,
      }}>Logout</button>
    </div>
  );
}

export default function Header({ view, onViewChange, filters, meta, onNewBug, user }) {
  return (
    <div style={{
      padding: '16px 32px', borderBottom: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: T.surface, position: 'sticky', top: 0, zIndex: 10, flexWrap: 'wrap', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '6px', background: T.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
          }}>🛡️</div>
          <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: T.font, letterSpacing: '-0.5px' }}>nobugs</span>
        </div>
        <div style={{ height: 20, width: 1, background: T.border }} />
        <div style={{ display: 'flex', gap: 2 }}>
          {VIEWS.map((v) => (
            <Pill key={v.id} active={view === v.id} onClick={() => onViewChange(v.id)}>{v.label}</Pill>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <input value={filters.search} onChange={(e) => filters.setSearch(e.target.value)}
          placeholder="Search bugs..." style={{
            background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radius,
            padding: '6px 12px', color: T.text, fontSize: '13px', fontFamily: T.fontSans, width: 180, outline: 'none',
          }} />
        {meta.projects?.length > 0 && <Select value={filters.project} onChange={filters.setProject} options={meta.projects} placeholder="All Projects" />}
        <Select value={filters.priority} onChange={filters.setPriority} options={meta.priorities?.length > 0 ? meta.priorities : PRIORITIES} placeholder="All Priorities" />
        <Select value={filters.status} onChange={filters.setStatus} options={meta.statuses?.length > 0 ? meta.statuses : STATUSES} placeholder="All Statuses" />
        <button onClick={onNewBug} style={{
          padding: '6px 14px', borderRadius: '6px', border: 'none',
          background: T.accent, color: '#fff', fontSize: '13px', fontWeight: 600,
          cursor: 'pointer', fontFamily: T.fontSans, whiteSpace: 'nowrap',
        }}>+ New Bug</button>
        {user && <>
          <div style={{ height: 20, width: 1, background: T.border }} />
          <UserMenu user={user} />
        </>}
      </div>
    </div>
  );
}
