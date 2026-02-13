import { Pill } from './ui';
import { T, PRIORITIES, STATUSES } from '../styles/tokens';

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

export default function Header({ view, onViewChange, filters, meta, onNewBug }) {
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
      </div>
    </div>
  );
}
