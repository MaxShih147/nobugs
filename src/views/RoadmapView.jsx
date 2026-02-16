import { useState, useEffect, useMemo, useCallback } from 'react';
import { T, glass, scopeColor, statusColor, statusSoft } from '../styles/tokens';
import { Badge } from '../components/ui';
import { fetchRoadmaps, createRoadmapApi, updateRoadmapApi, deleteRoadmapApi, createMilestoneApi, updateMilestoneApi, deleteMilestoneApi } from '../lib/api';
import RoadmapJourneyHeader from '../components/RoadmapJourneyHeader';

// --- Derive milestone status from its epics ---

function deriveMilestoneStatus(milestone, epicLookup) {
  const epics = (milestone.epicIds || []).map((id) => epicLookup.get(id)).filter(Boolean);
  if (epics.length === 0) return 'planned';
  const statuses = epics.map((e) => (e.status || '').toLowerCase().trim());
  const isDone = (s) => ['done', 'complete', 'completed', 'closed', 'resolved'].includes(s);
  const isActive = (s) => s.includes('progress') || s.includes('review') || ['active', 'started', 'doing', 'qa', 'testing'].includes(s);
  if (statuses.every(isDone)) return 'done';
  if (statuses.some(isActive)) return 'active';
  return 'planned';
}

function ScopeBadge({ scope }) {
  const s = scope?.charAt(0).toUpperCase() + scope?.slice(1);
  return <Badge color={scopeColor(scope)} bg={`${scopeColor(scope)}18`} style={{ fontSize: '10px', padding: '2px 8px' }}>{s}</Badge>;
}

// --- Drag handle icon ---

function DragHandle() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, cursor: 'grab', opacity: 0.4 }}
    >
      <circle cx="9" cy="6" r="1" fill="currentColor" /><circle cx="15" cy="6" r="1" fill="currentColor" />
      <circle cx="9" cy="12" r="1" fill="currentColor" /><circle cx="15" cy="12" r="1" fill="currentColor" />
      <circle cx="9" cy="18" r="1" fill="currentColor" /><circle cx="15" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}

// --- Roadmap selector dropdown + new/delete ---

function RoadmapSelector({ roadmaps, selectedId, onSelect, onCreate, onDelete }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      <select
        value={selectedId || ''}
        onChange={(e) => onSelect(e.target.value)}
        style={{
          background: 'rgba(255, 255, 255, 0.04)', border: `1px solid ${T.border}`,
          borderRadius: T.radiusSm, padding: '7px 12px', color: T.text,
          fontSize: '13px', fontFamily: T.fontSans, outline: 'none', cursor: 'pointer',
          minWidth: 200,
        }}
      >
        {roadmaps.map((r) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
      <button onClick={onCreate} style={{
        padding: '6px 14px', borderRadius: T.radiusSm,
        border: `1px solid ${T.accent}40`, background: T.accentSoft,
        color: T.accent, fontSize: '12px', fontWeight: 500, cursor: 'pointer',
        fontFamily: T.fontSans, transition: `all 0.2s ${T.ease}`,
      }}>
        + New Roadmap
      </button>
      {selectedId && (
        <button onClick={() => onDelete(selectedId)} style={{
          padding: '6px 14px', borderRadius: T.radiusSm,
          border: `1px solid ${T.critical}30`, background: `${T.critical}10`,
          color: T.critical, fontSize: '12px', fontWeight: 500, cursor: 'pointer',
          fontFamily: T.fontSans, transition: `all 0.2s ${T.ease}`,
        }}>
          Delete
        </button>
      )}
    </div>
  );
}

// --- Draggable epic row (shared between milestone and unassigned) ---

function DraggableEpicRow({ bug, sourceMilestoneId, onSelect, onUnassign }) {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('application/x-epic-id', bug.id);
    e.dataTransfer.setData('application/x-source-milestone', sourceMilestoneId || '');
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.4';
  };
  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{
        ...glass, borderRadius: T.radiusSm, padding: '8px 12px',
        display: 'flex', alignItems: 'center', gap: 8,
        transition: `all 0.2s ${T.ease}`, cursor: 'grab',
      }}
    >
      <DragHandle />
      <ScopeBadge scope="epic" />
      <span
        onClick={() => onSelect(bug)}
        style={{
          fontSize: '12px', fontWeight: 500, fontFamily: T.fontSans,
          cursor: 'pointer', flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = T.accent; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = T.text; }}
      >
        {bug.title}
      </span>
      <Badge color={statusColor(bug.status)} bg={statusSoft(bug.status)} style={{ fontSize: '9px', padding: '1px 6px', flexShrink: 0 }}>{bug.status}</Badge>
      {onUnassign && (
        <button onClick={onUnassign} title="Unassign from milestone" style={{
          width: 20, height: 20, borderRadius: '50%', border: 'none',
          background: 'rgba(255, 255, 255, 0.04)', color: T.textDim,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', lineHeight: 1, flexShrink: 0,
          transition: `all 0.15s ${T.ease}`,
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = `${T.critical}20`; e.currentTarget.style.color = T.critical; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'; e.currentTarget.style.color = T.textDim; }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

// --- Milestone section (drop target) ---

function MilestoneSection({ milestone, roadmapId, epicLookup, onSelect, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast, onDrop, isSelected, onSelectMilestone }) {
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(milestone.name);
  const [editingDate, setEditingDate] = useState(false);
  const [dateVal, setDateVal] = useState(milestone.targetDate || '');
  const [dragOver, setDragOver] = useState(false);

  const epics = (milestone.epicIds || []).map((eid) => epicLookup.get(eid)).filter(Boolean);

  const handleNameSave = () => {
    setEditingName(false);
    if (nameVal !== milestone.name) {
      onUpdate(roadmapId, milestone.id, { name: nameVal });
    }
  };

  const handleDateSave = () => {
    setEditingDate(false);
    if (dateVal !== (milestone.targetDate || '')) {
      onUpdate(roadmapId, milestone.id, { targetDate: dateVal || null });
    }
  };

  const handleUnassign = (epicId) => {
    const newIds = (milestone.epicIds || []).filter((id) => id !== epicId);
    onUpdate(roadmapId, milestone.id, { epicIds: newIds });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };
  const handleDragLeave = (e) => {
    // Only clear if leaving the container, not entering a child
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOver(false);
    }
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const epicId = e.dataTransfer.getData('application/x-epic-id');
    const sourceMilestone = e.dataTransfer.getData('application/x-source-milestone');
    if (epicId && sourceMilestone !== milestone.id) {
      onDrop(epicId, sourceMilestone, milestone.id);
    }
  };

  const btnStyle = {
    width: 28, height: 26, borderRadius: T.radiusSm, border: `1px solid ${T.border}`,
    background: 'transparent', color: T.textDim, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: `all 0.15s ${T.ease}`, flexShrink: 0,
  };

  return (
    <div
      data-milestone-id={milestone.id}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        ...glass, borderRadius: T.radiusLg, overflow: 'hidden', marginBottom: 16,
        border: dragOver ? `1px solid ${T.accent}` : isSelected ? `1px solid ${T.accent}60` : `1px solid ${T.border}`,
        boxShadow: dragOver ? `0 0 16px ${T.accent}20, ${T.shadow}` : isSelected ? `0 0 12px ${T.accent}15, ${T.shadow}` : T.shadow,
        transition: `border 0.15s ${T.ease}, box-shadow 0.15s ${T.ease}`,
      }}
    >
      {/* Header */}
      <div
        onClick={() => onSelectMilestone?.(milestone.id)}
        style={{
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: `1px solid ${T.border}`, cursor: 'pointer',
        }}
      >
        {/* Name */}
        {editingName ? (
          <input
            autoFocus
            value={nameVal}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') { setNameVal(milestone.name); setEditingName(false); } }}
            style={{
              background: 'rgba(255, 255, 255, 0.06)', border: `1px solid ${T.borderActive}`,
              borderRadius: T.radiusSm, padding: '4px 8px', color: T.text,
              fontSize: '14px', fontWeight: 600, fontFamily: T.fontSans, outline: 'none',
              flex: 1, maxWidth: 300,
            }}
          />
        ) : (
          <span
            onClick={(e) => { e.stopPropagation(); setEditingName(true); }}
            style={{
              fontSize: '14px', fontWeight: 600, fontFamily: T.fontSans, cursor: 'pointer',
              flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
            title="Click to edit name"
          >
            {milestone.name}
          </span>
        )}

        {/* Target date */}
        {editingDate ? (
          <input
            type="date"
            autoFocus
            value={dateVal}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setDateVal(e.target.value)}
            onBlur={handleDateSave}
            onKeyDown={(e) => { if (e.key === 'Enter') handleDateSave(); if (e.key === 'Escape') { setDateVal(milestone.targetDate || ''); setEditingDate(false); } }}
            style={{
              background: 'rgba(255, 255, 255, 0.06)', border: `1px solid ${T.borderActive}`,
              borderRadius: T.radiusSm, padding: '4px 8px', color: T.text,
              fontSize: '11px', fontFamily: T.font, outline: 'none',
            }}
          />
        ) : (
          <span
            onClick={(e) => { e.stopPropagation(); setEditingDate(true); }}
            style={{
              fontSize: '11px', fontFamily: T.font, color: T.textDim,
              background: 'rgba(255, 255, 255, 0.04)', padding: '3px 10px',
              borderRadius: T.radiusSm, cursor: 'pointer', flexShrink: 0,
            }}
            title="Click to edit target date"
          >
            {milestone.targetDate || 'No date'}
          </span>
        )}

        <span style={{ fontSize: '11px', fontFamily: T.font, color: T.textDim, flexShrink: 0 }}>
          {epics.length} epic{epics.length !== 1 ? 's' : ''}
        </span>

        {/* Reorder buttons */}
        <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={isFirst} style={{ ...btnStyle, opacity: isFirst ? 0.3 : 1 }} title="Move up">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
        <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={isLast} style={{ ...btnStyle, opacity: isLast ? 0.3 : 1 }} title="Move down">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Delete */}
        <button onClick={(e) => { e.stopPropagation(); onDelete(roadmapId, milestone.id); }} style={btnStyle} title="Delete milestone"
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${T.critical}40`; e.currentTarget.style.color = T.critical; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textDim; }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>

      {/* Epic cards */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 48 }}>
        {epics.length === 0 && (
          <div style={{ padding: '8px 0', color: T.textDim, fontSize: '12px', fontFamily: T.fontSans, fontStyle: 'italic' }}>
            {dragOver ? 'Drop epic here' : 'Drag epics here to assign them.'}
          </div>
        )}
        {epics.map((bug) => (
          <DraggableEpicRow
            key={bug.id || bug.notionId}
            bug={bug}
            sourceMilestoneId={milestone.id}
            onSelect={onSelect}
            onUnassign={() => handleUnassign(bug.id)}
          />
        ))}
      </div>
    </div>
  );
}

// --- Unassigned epics section (drop target to unassign) ---

function UnassignedEpicsSection({ epics, onSelect, onDropToUnassign }) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };
  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOver(false);
    }
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const epicId = e.dataTransfer.getData('application/x-epic-id');
    const sourceMilestone = e.dataTransfer.getData('application/x-source-milestone');
    if (epicId && sourceMilestone) {
      onDropToUnassign(epicId, sourceMilestone);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        ...glass, borderRadius: T.radiusLg, overflow: 'hidden', marginTop: 24,
        border: dragOver ? `1px solid ${T.accent}` : `1px solid ${T.border}`,
        boxShadow: dragOver ? `0 0 16px ${T.accent}20, ${T.shadow}` : T.shadow,
        transition: `border 0.15s ${T.ease}, box-shadow 0.15s ${T.ease}`,
      }}
    >
      <div style={{
        padding: '12px 16px', borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: T.fontSans, color: T.textDim }}>
          Unassigned Epics
        </span>
        <span style={{
          fontSize: '11px', fontFamily: T.font, color: T.textDim,
          background: 'rgba(255, 255, 255, 0.04)', padding: '2px 8px',
          borderRadius: T.radiusSm,
        }}>
          {epics.length}
        </span>
      </div>
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 48 }}>
        {epics.length === 0 && (
          <div style={{ padding: '8px 0', color: T.textDim, fontSize: '12px', fontFamily: T.fontSans, fontStyle: 'italic' }}>
            {dragOver ? 'Drop here to unassign' : 'All epics are assigned to milestones.'}
          </div>
        )}
        {epics.map((bug) => (
          <DraggableEpicRow
            key={bug.id || bug.notionId}
            bug={bug}
            sourceMilestoneId=""
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

// --- Main View ---

export default function RoadmapView({ allBugs, meta, onSelect }) {
  const [roadmaps, setRoadmaps] = useState([]);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState(() => localStorage.getItem('roadmap.selectedId') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(null);

  const loadRoadmaps = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchRoadmaps();
      setRoadmaps(data);
      // Auto-select first if current selection is invalid
      if (data.length > 0) {
        const ids = data.map((r) => r.id);
        if (!ids.includes(selectedRoadmapId)) {
          setSelectedRoadmapId(data[0].id);
          localStorage.setItem('roadmap.selectedId', data[0].id);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRoadmaps(); }, [loadRoadmaps]);

  const handleSelectRoadmap = (id) => {
    setSelectedRoadmapId(id);
    setSelectedMilestoneId(null);
    localStorage.setItem('roadmap.selectedId', id);
  };

  // Build epic lookup from allBugs — index by both id and notionId
  const isEpic = (b) => b.scope && b.scope.toLowerCase() === 'epic';

  const epicLookup = useMemo(() => {
    const map = new Map();
    (allBugs || []).forEach((b) => {
      if (isEpic(b)) {
        map.set(b.id, b);
        if (b.notionId) map.set(b.notionId, b);
      }
    });
    return map;
  }, [allBugs]);

  const allEpics = useMemo(() => {
    return (allBugs || []).filter(isEpic);
  }, [allBugs]);

  const selectedRoadmap = roadmaps.find((r) => r.id === selectedRoadmapId) || null;

  // Epics not in any milestone of the current roadmap
  const unassignedEpics = useMemo(() => {
    if (!selectedRoadmap) return allEpics;
    const assignedIds = new Set();
    selectedRoadmap.milestones.forEach((m) => {
      (m.epicIds || []).forEach((eid) => {
        assignedIds.add(eid);
        const bug = epicLookup.get(eid);
        if (bug) {
          assignedIds.add(bug.id);
          if (bug.notionId) assignedIds.add(bug.notionId);
        }
      });
    });
    return allEpics.filter((e) => !assignedIds.has(e.id) && (!e.notionId || !assignedIds.has(e.notionId)));
  }, [selectedRoadmap, allEpics, epicLookup]);

  // --- CRUD handlers ---

  const handleCreateRoadmap = async () => {
    const r = await createRoadmapApi({ name: 'New Roadmap', description: '' });
    await loadRoadmaps();
    setSelectedRoadmapId(r.id);
    localStorage.setItem('roadmap.selectedId', r.id);
  };

  const handleDeleteRoadmap = async (id) => {
    await deleteRoadmapApi(id);
    await loadRoadmaps();
  };

  const handleCreateMilestone = async () => {
    if (!selectedRoadmapId) return;
    await createMilestoneApi(selectedRoadmapId, { name: 'New Milestone', description: '', targetDate: '' });
    await loadRoadmaps();
  };

  const handleUpdateMilestone = async (roadmapId, milestoneId, updates) => {
    await updateMilestoneApi(roadmapId, milestoneId, updates);
    await loadRoadmaps();
  };

  const handleDeleteMilestone = async (roadmapId, milestoneId) => {
    await deleteMilestoneApi(roadmapId, milestoneId);
    await loadRoadmaps();
  };

  const handleMoveMilestone = async (index, direction) => {
    if (!selectedRoadmap) return;
    const milestones = [...selectedRoadmap.milestones];
    const target = index + direction;
    if (target < 0 || target >= milestones.length) return;
    [milestones[index], milestones[target]] = [milestones[target], milestones[index]];
    await updateRoadmapApi(selectedRoadmapId, { milestones });
    await loadRoadmaps();
  };

  // --- Journey header milestones ---

  const headerMilestones = useMemo(() => {
    if (!selectedRoadmap) return [];
    return selectedRoadmap.milestones.filter((ms) => ms.targetDate).map((ms) => ({
      id: ms.id,
      title: ms.name,
      date: ms.targetDate,
      status: deriveMilestoneStatus(ms, epicLookup),
      description: ms.description || '',
    }));
  }, [selectedRoadmap, epicLookup]);

  const handleSelectMilestone = useCallback((id) => {
    setSelectedMilestoneId((prev) => prev === id ? null : id);
    const el = document.querySelector(`[data-milestone-id="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.boxShadow = `0 0 24px ${T.accent}30, ${T.shadow}`;
      setTimeout(() => { el.style.boxShadow = ''; }, 1500);
    }
  }, []);

  // --- Drag-and-drop handler ---

  const handleEpicDrop = async (epicId, sourceMilestoneId, targetMilestoneId) => {
    if (!selectedRoadmap) return;
    // Remove from source milestone (if any)
    if (sourceMilestoneId) {
      const src = selectedRoadmap.milestones.find((m) => m.id === sourceMilestoneId);
      if (src) {
        const newIds = (src.epicIds || []).filter((id) => id !== epicId);
        await updateMilestoneApi(selectedRoadmapId, sourceMilestoneId, { epicIds: newIds });
      }
    }
    // Add to target milestone
    const tgt = selectedRoadmap.milestones.find((m) => m.id === targetMilestoneId);
    if (tgt) {
      const newIds = [...(tgt.epicIds || []), epicId];
      await updateMilestoneApi(selectedRoadmapId, targetMilestoneId, { epicIds: newIds });
    }
    await loadRoadmaps();
  };

  const handleDropToUnassign = async (epicId, sourceMilestoneId) => {
    if (!selectedRoadmap || !sourceMilestoneId) return;
    const src = selectedRoadmap.milestones.find((m) => m.id === sourceMilestoneId);
    if (src) {
      const newIds = (src.epicIds || []).filter((id) => id !== epicId);
      await updateMilestoneApi(selectedRoadmapId, sourceMilestoneId, { epicIds: newIds });
    }
    await loadRoadmaps();
  };

  if (loading) {
    return (
      <div className="fade-in" style={{ padding: 32, color: T.textDim, fontFamily: T.fontSans, fontSize: '14px' }}>
        Loading roadmaps...
      </div>
    );
  }

  if (error) {
    return (
      <div className="fade-in" style={{ padding: 32, color: T.critical, fontFamily: T.fontSans, fontSize: '14px' }}>
        Error: {error}
      </div>
    );
  }

  if (roadmaps.length === 0) {
    return (
      <div className="fade-in" style={{ padding: 32 }}>
        <div style={{ color: T.textDim, fontFamily: T.fontSans, fontSize: '14px', textAlign: 'center', padding: 40 }}>
          No roadmaps yet.
          <div style={{ marginTop: 16 }}>
            <button onClick={handleCreateRoadmap} style={{
              padding: '8px 20px', borderRadius: T.radiusSm,
              border: `1px solid ${T.accent}40`, background: T.accentSoft,
              color: T.accent, fontSize: '13px', fontWeight: 500, cursor: 'pointer',
              fontFamily: T.fontSans,
            }}>
              Create First Roadmap
            </button>
          </div>
        </div>
        <UnassignedEpicsSection
          epics={allEpics}
          onSelect={onSelect}
          onDropToUnassign={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ padding: 32 }}>
      <RoadmapSelector
        roadmaps={roadmaps}
        selectedId={selectedRoadmapId}
        onSelect={handleSelectRoadmap}
        onCreate={handleCreateRoadmap}
        onDelete={handleDeleteRoadmap}
      />

      {headerMilestones.length > 0 && (
        <RoadmapJourneyHeader
          milestones={headerMilestones}
          onSelectMilestone={handleSelectMilestone}
          selectedId={selectedMilestoneId}
        />
      )}

      {selectedRoadmap && selectedRoadmap.milestones.map((ms, idx) => (
        <MilestoneSection
          key={ms.id}
          milestone={ms}
          roadmapId={selectedRoadmapId}
          epicLookup={epicLookup}
          onSelect={onSelect}
          onUpdate={handleUpdateMilestone}
          onDelete={handleDeleteMilestone}
          onMoveUp={() => handleMoveMilestone(idx, -1)}
          onMoveDown={() => handleMoveMilestone(idx, 1)}
          isFirst={idx === 0}
          isLast={idx === selectedRoadmap.milestones.length - 1}
          onDrop={handleEpicDrop}
          isSelected={selectedMilestoneId === ms.id}
          onSelectMilestone={setSelectedMilestoneId}
        />
      ))}

      {selectedRoadmap && (
        <button onClick={handleCreateMilestone} style={{
          padding: '8px 20px', borderRadius: T.radiusSm,
          border: `1px solid ${T.border}`, background: 'transparent',
          color: T.textDim, fontSize: '12px', fontWeight: 500, cursor: 'pointer',
          fontFamily: T.fontSans, transition: `all 0.2s ${T.ease}`,
          marginBottom: 8,
        }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${T.accent}40`; e.currentTarget.style.color = T.accent; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textDim; }}
        >
          + Add Milestone
        </button>
      )}

      <UnassignedEpicsSection
        epics={unassignedEpics}
        onSelect={onSelect}
        onDropToUnassign={handleDropToUnassign}
      />
    </div>
  );
}
