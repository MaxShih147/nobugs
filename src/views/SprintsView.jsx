import { useState, useMemo } from 'react';
import { T, glass, typeColor, priorityColor, statusColor, statusSoft, scopeColor, stripEmoji } from '../styles/tokens';
import { Badge, ProgressBar } from '../components/ui';

const TYPE_ORDER = ['Bug', 'Feature', 'Improve'];
const SHOW_OPTIONS = [1, 3, 5, 'All'];
const VIEW_MODES = [
  { key: 'type', label: 'By Type' },
  { key: 'hierarchy', label: 'By Hierarchy' },
];

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

// --- Scope badge for hierarchy mode ---

function ScopeBadge({ scope }) {
  const s = scope?.charAt(0).toUpperCase() + scope?.slice(1);
  return <Badge color={scopeColor(scope)} bg={`${scopeColor(scope)}18`} style={{ fontSize: '10px', padding: '2px 8px' }}>{s}</Badge>;
}

// --- Caret icon for expand/collapse ---

function Caret({ expanded }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{
        transition: 'transform 0.15s',
        transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
        flexShrink: 0,
      }}
    >
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
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

// --- Sprint header (shared between type and hierarchy modes) ---

function SprintHeader({ name, bugs }) {
  const done = bugs.filter((b) => b.status === 'Done').length;
  const pct = bugs.length > 0 ? Math.round((done / bugs.length) * 100) : 0;
  const summary = sprintTypeSummary(bugs);

  return (
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
  );
}

// --- Single sprint section (By Type mode) ---

function SprintSection({ name, bugs, types, onSelect }) {
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
      <SprintHeader name={name} bugs={bugs} />

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

// --- Build hierarchy groups from sprint bugs ---

function buildHierarchyGroups(sprintBugs, allBugs) {
  // Build lookup by notionId and by id
  const byNotionId = {};
  const byId = {};
  allBugs.forEach((b) => {
    if (b.notionId) byNotionId[b.notionId] = b;
    byId[b.id] = b;
  });

  function lookup(idOrNotionId) {
    return byNotionId[idOrNotionId] || byId[idOrNotionId] || null;
  }

  // Walk up parent chain to find root epic
  function findEpicAncestor(bug) {
    const visited = new Set();
    let current = bug;
    while (current) {
      if (visited.has(current.id)) break;
      visited.add(current.id);
      if (current.scope === 'epic') return current;
      if (!current.parentNotionId) break;
      current = lookup(current.parentNotionId);
    }
    return null;
  }

  // Find direct parent
  function findParent(bug) {
    if (!bug.parentNotionId) return null;
    return lookup(bug.parentNotionId);
  }

  // epicId -> { epic, stories: Map<storyId, { story, tasks }>, directTasks }
  const epicGroups = new Map();
  const UNLINKED = '__unlinked__';

  function ensureEpicGroup(epicId, epicBug) {
    if (!epicGroups.has(epicId)) {
      epicGroups.set(epicId, { epic: epicBug, stories: new Map(), directTasks: [] });
    }
    return epicGroups.get(epicId);
  }

  function ensureStoryGroup(epicGroup, storyId, storyBug) {
    if (!epicGroup.stories.has(storyId)) {
      epicGroup.stories.set(storyId, { story: storyBug, tasks: [] });
    }
    return epicGroup.stories.get(storyId);
  }

  sprintBugs.forEach((bug) => {
    const scope = bug.scope || 'task';

    if (scope === 'epic') {
      // Epic in the sprint — ensure group exists
      const key = bug.notionId || bug.id;
      ensureEpicGroup(key, bug);
      return;
    }

    if (scope === 'story') {
      // Story — find its parent epic
      const epic = findEpicAncestor(bug);
      if (epic) {
        const epicKey = epic.notionId || epic.id;
        const group = ensureEpicGroup(epicKey, epic);
        ensureStoryGroup(group, bug.notionId || bug.id, bug);
      } else {
        const group = ensureEpicGroup(UNLINKED, null);
        ensureStoryGroup(group, bug.notionId || bug.id, bug);
      }
      return;
    }

    // Task scope (or unknown) — find parent story or epic
    const parent = findParent(bug);
    if (parent && parent.scope === 'story') {
      // Parent is a story — find the story's epic
      const epic = findEpicAncestor(parent);
      if (epic) {
        const epicKey = epic.notionId || epic.id;
        const group = ensureEpicGroup(epicKey, epic);
        const storyGroup = ensureStoryGroup(group, parent.notionId || parent.id, parent);
        storyGroup.tasks.push(bug);
      } else {
        const group = ensureEpicGroup(UNLINKED, null);
        const storyGroup = ensureStoryGroup(group, parent.notionId || parent.id, parent);
        storyGroup.tasks.push(bug);
      }
    } else if (parent && parent.scope === 'epic') {
      // Direct child of epic (no story)
      const epicKey = parent.notionId || parent.id;
      const group = ensureEpicGroup(epicKey, parent);
      group.directTasks.push(bug);
    } else {
      // Walk up to find any epic
      const epic = findEpicAncestor(bug);
      if (epic) {
        const epicKey = epic.notionId || epic.id;
        const group = ensureEpicGroup(epicKey, epic);
        group.directTasks.push(bug);
      } else {
        const group = ensureEpicGroup(UNLINKED, null);
        group.directTasks.push(bug);
      }
    }
  });

  // Convert to array, real epics first, unlinked last
  const result = [];
  const entries = [...epicGroups.entries()];
  entries.forEach(([key, group]) => {
    if (key !== UNLINKED) result.push({ key, ...group });
  });
  if (epicGroups.has(UNLINKED)) {
    const ug = epicGroups.get(UNLINKED);
    result.push({ key: UNLINKED, ...ug });
  }
  return result;
}

// --- Hierarchy sprint section ---

function HierarchySprintSection({ name, bugs, allBugs, onSelect }) {
  const [collapsed, setCollapsed] = useState(() => new Set());

  const groups = useMemo(() => buildHierarchyGroups(bugs, allBugs), [bugs, allBugs]);

  const toggleCollapse = (key) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Count children for a group
  function epicChildCount(group) {
    let count = group.directTasks.length;
    group.stories.forEach((sg) => { count += 1 + sg.tasks.length; }); // story + its tasks
    return count;
  }

  function storyChildCount(storyGroup) {
    return storyGroup.tasks.length;
  }

  return (
    <div style={{
      ...glass, borderRadius: T.radiusLg, overflow: 'hidden', marginBottom: 20,
    }}>
      <SprintHeader name={name} bugs={bugs} />

      {groups.length === 0 && (
        <div style={{ padding: '20px 24px', color: T.textDim, fontSize: '13px', fontFamily: T.fontSans }}>
          No bugs in this sprint matching filters.
        </div>
      )}

      {groups.map((group, gi) => {
        const epicKey = `epic:${group.key}`;
        const epicExpanded = !collapsed.has(epicKey);
        const isUnlinked = group.key === '__unlinked__';
        const childCount = epicChildCount(group);

        return (
          <div key={group.key}>
            {/* Epic row */}
            <div
              onClick={() => toggleCollapse(epicKey)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 16px', cursor: 'pointer',
                borderBottom: `1px solid ${T.border}`,
                background: 'rgba(255, 255, 255, 0.015)',
                transition: `background 0.15s ${T.ease}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.015)'; }}
            >
              <Caret expanded={epicExpanded} />
              {isUnlinked ? (
                <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: T.fontSans, color: T.textDim, fontStyle: 'italic' }}>
                  Unlinked
                </span>
              ) : (
                <>
                  <ScopeBadge scope="epic" />
                  <span
                    style={{
                      fontSize: '13px', fontWeight: 600, fontFamily: T.fontSans,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                    }}
                    onClick={(e) => { if (group.epic) { e.stopPropagation(); onSelect(group.epic); } }}
                  >
                    {group.epic?.title || 'Unknown Epic'}
                  </span>
                </>
              )}
              <span style={{
                fontSize: '11px', fontFamily: T.font, color: T.textDim,
                background: 'rgba(255, 255, 255, 0.04)', padding: '2px 8px',
                borderRadius: T.radiusSm, flexShrink: 0,
              }}>
                {childCount}
              </span>
            </div>

            {/* Epic children */}
            {epicExpanded && (
              <>
                {/* Stories */}
                {[...group.stories.entries()].map(([storyId, storyGroup]) => {
                  const storyKey = `story:${storyId}`;
                  const storyExpanded = !collapsed.has(storyKey);
                  const taskCount = storyChildCount(storyGroup);

                  return (
                    <div key={storyId}>
                      {/* Story row */}
                      <div
                        onClick={() => taskCount > 0 && toggleCollapse(storyKey)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 16px 8px 36px',
                          cursor: taskCount > 0 ? 'pointer' : 'default',
                          borderBottom: `1px solid ${T.border}`,
                          transition: `background 0.15s ${T.ease}`,
                        }}
                        onMouseEnter={(e) => { if (taskCount > 0) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        {taskCount > 0 ? <Caret expanded={storyExpanded} /> : <span style={{ width: 15 }} />}
                        <ScopeBadge scope="story" />
                        <span
                          style={{
                            fontSize: '12px', fontWeight: 500, fontFamily: T.fontSans,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                          }}
                          onClick={(e) => { e.stopPropagation(); onSelect(storyGroup.story); }}
                        >
                          {storyGroup.story.title}
                        </span>
                        {taskCount > 0 && (
                          <span style={{
                            fontSize: '11px', fontFamily: T.font, color: T.textDim,
                            background: 'rgba(255, 255, 255, 0.04)', padding: '2px 8px',
                            borderRadius: T.radiusSm, flexShrink: 0,
                          }}>
                            {taskCount}
                          </span>
                        )}
                      </div>

                      {/* Story's tasks */}
                      {storyExpanded && taskCount > 0 && (
                        <div style={{ padding: '8px 16px 8px 56px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {storyGroup.tasks.map((task) => (
                            <RoadmapCard key={task.id} bug={task} onSelect={onSelect} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Direct tasks (no story parent) */}
                {group.directTasks.length > 0 && (
                  <div style={{ padding: '8px 16px 8px 36px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {group.directTasks.map((task) => (
                      <RoadmapCard key={task.id} bug={task} onSelect={onSelect} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- Main View ---

export default function SprintsView({ bugs, allBugs = [], meta, onSelect }) {
  const allSprints = meta.sprints || [];
  const [showCount, setShowCount] = useState(3);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('sprints.viewMode') || 'type');

  const handleViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('sprints.viewMode', mode);
  };

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

  const toggleBtnStyle = (active) => ({
    padding: '5px 12px', borderRadius: T.radiusSm,
    border: `1px solid ${active ? T.accent : T.border}`,
    background: active ? T.accentSoft : 'transparent',
    color: active ? T.accent : T.textDim,
    fontSize: '12px', fontWeight: 500, cursor: 'pointer',
    fontFamily: T.fontSans, transition: `all 0.2s ${T.ease}`,
  });

  return (
    <div className="fade-in" style={{ padding: 32 }}>
      {/* Controls bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', color: T.textDim, fontFamily: T.fontSans, textTransform: 'uppercase', letterSpacing: '1px' }}>
          Show
        </span>
        {SHOW_OPTIONS.map((opt) => {
          const active = showCount === opt;
          const label = opt === 'All' ? 'All' : `Last ${opt}`;
          return (
            <button key={opt} onClick={() => setShowCount(opt)} style={toggleBtnStyle(active)}>
              {label}
            </button>
          );
        })}

        <span style={{ width: 1, height: 20, background: T.border, margin: '0 6px' }} />

        <span style={{ fontSize: '12px', color: T.textDim, fontFamily: T.fontSans, textTransform: 'uppercase', letterSpacing: '1px' }}>
          View
        </span>
        {VIEW_MODES.map((mode) => (
          <button key={mode.key} onClick={() => handleViewMode(mode.key)} style={toggleBtnStyle(viewMode === mode.key)}>
            {mode.label}
          </button>
        ))}
      </div>

      {/* Sprint sections */}
      {visibleSprints.length === 0 ? (
        <div style={{ color: T.textDim, fontFamily: T.fontSans, fontSize: '14px', textAlign: 'center', padding: 40 }}>
          No sprints found.
        </div>
      ) : visibleSprints.map((sprint) => {
        const sprintBugs = bugs.filter((b) => b.sprint === sprint);
        return viewMode === 'hierarchy' ? (
          <HierarchySprintSection
            key={sprint}
            name={sprint}
            bugs={sprintBugs}
            allBugs={allBugs}
            onSelect={onSelect}
          />
        ) : (
          <SprintSection
            key={sprint}
            name={sprint}
            bugs={sprintBugs}
            types={types}
            onSelect={onSelect}
          />
        );
      })}
    </div>
  );
}
