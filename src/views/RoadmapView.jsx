import { useState, useMemo } from 'react';
import { T, glass, typeColor, priorityColor, statusColor, statusSoft, stripEmoji } from '../styles/tokens';
import { Badge, ProgressBar } from '../components/ui';

const TYPE_ORDER = ['Bug', 'Feature', 'Improve'];
const SHOW_OPTIONS = [1, 3, 5, 'All'];

function sprintTypeSummary(bugs) {
  const counts = {};
  TYPE_ORDER.forEach((t) => { counts[t] = 0; });
  bugs.forEach((b) => {
    const type = b.type || 'Bug';
    if (counts[type] !== undefined) counts[type]++;
    else counts[type] = 1;
  });
  return TYPE_ORDER
    .filter((t) => counts[t] > 0)
    .map((t) => ({ type: t, count: counts[t], abbr: t[0] }));
}

// --- Compact bug card ---

function RoadmapCard({ bug, onSelect }) {
  return (
    <div
      onClick={() => onSelect(bug)}
      style={{
        ...glass, borderRadius: T.radius,
        padding: '8px 12px', cursor: 'pointer',
        transition: `all 0.3s ${T.ease}`,
        borderLeft: `3px solid ${priorityColor(bug.priority || '')}`,
        opacity: bug.status === 'Done' ? 0.5 : 1,
        maxWidth: 280,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = T.surfaceHover;
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = T.surface;
        e.currentTarget.style.transform = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontFamily: T.font, fontSize: '10px', color: T.textDim }}>{bug.id}</span>
        <Badge color={statusColor(bug.status)} bg={statusSoft(bug.status)} style={{ fontSize: '9px', padding: '1px 6px' }}>{bug.status}</Badge>
      </div>
      <div style={{
        fontSize: '12px', fontWeight: 500, lineHeight: 1.3, marginBottom: 4,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: T.fontSans,
      }}>{bug.title}</div>
      <div style={{ fontSize: '10px', color: T.textDim, fontFamily: T.fontSans }}>
        {bug.assignee ? bug.assignee.split(' ')[0] : ''}
      </div>
    </div>
  );
}

// --- Single sprint section ---

function SprintSection({ name, bugs, types, onSelect }) {
  const done = bugs.filter((b) => b.status === 'Done').length;
  const pct = bugs.length > 0 ? Math.round((done / bugs.length) * 100) : 0;
  const summary = sprintTypeSummary(bugs);

  // Group bugs by type
  const bugsByType = useMemo(() => {
    const map = {};
    TYPE_ORDER.forEach((t) => { map[t] = []; });
    bugs.forEach((b) => {
      const type = b.type || 'Bug';
      if (!map[type]) map[type] = [];
      map[type].push(b);
    });
    return map;
  }, [bugs]);

  return (
    <div style={{
      ...glass, borderRadius: T.radiusLg, overflow: 'hidden', marginBottom: 20,
    }}>
      {/* Sprint header */}
      <div style={{
        padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: T.fontSans }}>{name}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {summary.map((s) => (
              <span key={s.type} style={{ fontSize: '11px', fontFamily: T.font, color: typeColor(s.type) }}>
                {s.count}{s.abbr}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: '12px', color: T.textDim, fontFamily: T.fontSans }}>{done}/{bugs.length} done</span>
          <div style={{ width: 120 }}><ProgressBar value={done} max={bugs.length} color={T.done} /></div>
          <span style={{ fontFamily: T.font, fontSize: '12px', color: T.textDim }}>{pct}%</span>
        </div>
      </div>

      {/* Type rows */}
      {types.map((type, ti) => {
        const typeBugs = bugsByType[type] || [];
        return (
          <div key={type} style={{
            display: 'flex', alignItems: 'flex-start',
            borderBottom: ti < types.length - 1 ? `1px solid ${T.border}` : 'none',
            minHeight: 56,
          }}>
            {/* Type label */}
            <div style={{
              width: 120, flexShrink: 0, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 8,
              borderRight: `1px solid ${T.border}`,
              alignSelf: 'stretch',
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: typeColor(type), flexShrink: 0,
              }} />
              <span style={{
                fontSize: '13px', fontWeight: 600, fontFamily: T.fontSans,
                color: typeColor(type),
              }}>
                {type}
              </span>
            </div>

            {/* Bug cards */}
            <div style={{
              flex: 1, padding: '10px 16px',
              display: 'flex', flexWrap: 'wrap', gap: 8,
            }}>
              {typeBugs.map((bug) => (
                <RoadmapCard key={bug.id} bug={bug} onSelect={onSelect} />
              ))}
            </div>
          </div>
        );
      })}

      {bugs.length === 0 && (
        <div style={{ padding: '20px 24px', color: T.textDim, fontSize: '13px', fontFamily: T.fontSans }}>
          No bugs in this sprint matching filters.
        </div>
      )}
    </div>
  );
}

// --- Main View ---

export default function RoadmapView({ bugs, meta, onSelect }) {
  const allSprints = meta.sprints || [];
  const [showCount, setShowCount] = useState(3);

  // Visible sprints (last N, most recent last)
  const visibleSprints = useMemo(() => {
    if (showCount === 'All') return allSprints;
    return allSprints.slice(-showCount);
  }, [allSprints, showCount]);

  // Types present across all visible bugs
  const types = useMemo(() => {
    const visibleBugs = bugs.filter((b) => visibleSprints.includes(b.sprint));
    const present = new Set(visibleBugs.map((b) => b.type || 'Bug'));
    return TYPE_ORDER.filter((t) => present.has(t));
  }, [bugs, visibleSprints]);

  return (
    <div className="fade-in" style={{ padding: 32 }}>
      {/* Show selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: '12px', color: T.textDim, fontFamily: T.fontSans, textTransform: 'uppercase', letterSpacing: '1px' }}>
          Show
        </span>
        {SHOW_OPTIONS.map((opt) => {
          const active = showCount === opt;
          const label = opt === 'All' ? 'All' : `Last ${opt}`;
          return (
            <button
              key={opt}
              onClick={() => setShowCount(opt)}
              style={{
                padding: '5px 12px', borderRadius: T.radiusSm,
                border: `1px solid ${active ? T.accent : T.border}`,
                background: active ? T.accentSoft : 'transparent',
                color: active ? T.accent : T.textDim,
                fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                fontFamily: T.fontSans, transition: `all 0.2s ${T.ease}`,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Sprint sections */}
      {visibleSprints.length === 0 ? (
        <div style={{ color: T.textDim, fontFamily: T.fontSans, fontSize: '14px', textAlign: 'center', padding: 40 }}>
          No sprints found.
        </div>
      ) : visibleSprints.map((sprint) => (
        <SprintSection
          key={sprint}
          name={sprint}
          bugs={bugs.filter((b) => b.sprint === sprint)}
          types={types}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
