import { useState, useEffect, useRef } from 'react';
import { T, glass, typeColor, scopeColor, stripEmoji, formatDate } from '../styles/tokens';
import { PriorityBadge, StatusBadge } from './ui';
import { fetchBug, updateDescription } from '../lib/api';

function EditableDate({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const parts = (value || '').split('-');
  const [yyyy, setYyyy] = useState(parts[0] || '');
  const [mm, setMm] = useState(parts[1] || '');
  const [dd, setDd] = useState(parts[2] || '');
  const yRef = useRef(null);
  const mRef = useRef(null);
  const dRef = useRef(null);

  useEffect(() => {
    const p = (value || '').split('-');
    setYyyy(p[0] || ''); setMm(p[1] || ''); setDd(p[2] || '');
  }, [value]);

  const save = (yOverride, mOverride, dOverride) => {
    setEditing(false);
    const y = yOverride ?? yyyy, m = mOverride ?? mm, d = dOverride ?? dd;
    if (y && m && d) {
      const iso = `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      const parsed = new Date(iso);
      if (isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== iso) {
        // Invalid date — reset to original
        const p = (value || '').split('-');
        setYyyy(p[0] || ''); setMm(p[1] || ''); setDd(p[2] || '');
        return;
      }
      if (iso !== value) onSave(iso);
    } else if (!y && !m && !d && value) {
      onSave(null);
    }
  };

  const segStyle = {
    background: T.bgSubtle, color: T.text, border: `1px solid ${T.borderActive}`,
    borderRadius: T.radiusSm, padding: '4px 6px', fontSize: '14px',
    fontFamily: T.fontSans, fontWeight: 500, outline: 'none',
    textAlign: 'center', boxSizing: 'border-box',
  };

  const numOnly = (v) => v.replace(/\D/g, '');

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) save(); }}
      >
        <input ref={yRef} autoFocus value={yyyy} placeholder="YYYY" maxLength={4} inputMode="numeric"
          style={{ ...segStyle, width: 52 }}
          onChange={(e) => { const v = numOnly(e.target.value); setYyyy(v); if (v.length === 4) mRef.current?.focus(); }}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
        />
        <span style={{ color: T.textDim }}>/</span>
        <input ref={mRef} value={mm} placeholder="MM" maxLength={2} inputMode="numeric"
          style={{ ...segStyle, width: 36 }}
          onChange={(e) => { const v = numOnly(e.target.value); setMm(v); if (v.length === 2) dRef.current?.focus(); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') setEditing(false);
            if (e.key === 'Backspace' && !mm) yRef.current?.focus();
          }}
        />
        <span style={{ color: T.textDim }}>/</span>
        <input ref={dRef} value={dd} placeholder="DD" maxLength={2} inputMode="numeric"
          style={{ ...segStyle, width: 36 }}
          onChange={(e) => { const v = numOnly(e.target.value); setDd(v); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') setEditing(false);
            if (e.key === 'Backspace' && !dd) mRef.current?.focus();
          }}
        />
      </div>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      style={{
        fontSize: '14px', fontWeight: 500, color: T.text, fontFamily: T.fontSans,
        cursor: 'pointer', borderRadius: T.radiusSm, padding: '2px 0',
      }}
      title="Click to edit"
    >
      {formatDate(value) || 'No due date'}
    </div>
  );
}

function EditableSelect({ value, options, onSave, renderValue }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <select
        autoFocus
        value={value}
        onChange={(e) => { onSave(e.target.value); setEditing(false); }}
        onBlur={() => setEditing(false)}
        style={{
          background: T.bgSubtle, color: T.text, border: `1px solid ${T.borderActive}`,
          borderRadius: T.radiusSm, padding: '4px 8px', fontSize: '14px',
          fontFamily: T.fontSans, fontWeight: 500, outline: 'none', width: '100%',
          cursor: 'pointer',
        }}
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      style={{
        fontSize: '14px', fontWeight: 500, fontFamily: T.fontSans,
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        borderRadius: T.radiusSm, padding: '2px 0',
        transition: `all 0.2s ${T.ease}`,
      }}
      title="Click to edit"
    >
      {renderValue ? renderValue(value) : <span style={{ color: T.text }}>{value || '\u2014'}</span>}
    </div>
  );
}

function EditableInput({ value, onSave, type = 'text', placeholder }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const inputRef = useRef(null);

  useEffect(() => { setDraft(value ?? ''); }, [value]);

  const save = () => {
    setEditing(false);
    const parsed = type === 'number' ? (draft === '' ? null : Number(draft)) : draft || null;
    if (parsed !== value) onSave(parsed);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        type={type}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
        style={{
          background: T.bgSubtle, color: T.text, border: `1px solid ${T.borderActive}`,
          borderRadius: T.radiusSm, padding: '4px 8px', fontSize: '14px',
          fontFamily: T.fontSans, fontWeight: 500, outline: 'none', width: '100%',
          boxSizing: 'border-box',
        }}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      style={{
        fontSize: '14px', fontWeight: 500, color: T.text, fontFamily: T.fontSans,
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        borderRadius: T.radiusSm, padding: '2px 0',
      }}
      title="Click to edit"
    >
      <span>{value ?? placeholder ?? '\u2014'}</span>
    </div>
  );
}

export default function BugDetail({ bug, onBack, updateBug, meta, onBugUpdated }) {
  const [description, setDescription] = useState(bug?.description || '');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [saving, setSaving] = useState(null); // field name being saved
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(bug?.title || '');
  const titleRef = useRef(null);

  useEffect(() => {
    if (!bug) return;
    setTitleDraft(bug.title || '');
    if (bug.description) { setDescription(bug.description); return; }
    const id = bug.notionId || bug.id;
    fetchBug(id)
      .then((full) => { if (full?.description) setDescription(full.description); })
      .catch(() => {});
  }, [bug?.id]);

  if (!bug) return null;

  const bugId = bug.notionId || bug.id;

  const handleFieldSave = async (field, value) => {
    if (!updateBug) return;
    if (onBugUpdated) onBugUpdated({ ...bug, [field]: value });
    setSaving(field);
    try {
      const updated = await updateBug(bugId, { [field]: value });
      if (onBugUpdated) onBugUpdated({ ...bug, ...updated, description });
    } catch { /* error handled in useBugs */ }
    setSaving(null);
  };

  const handleTitleSave = () => {
    setEditingTitle(false);
    if (titleDraft !== bug.title && titleDraft.trim()) {
      handleFieldSave('title', titleDraft.trim());
    }
  };

  const handleDescSave = async () => {
    setSaving('description');
    try {
      await updateDescription(bugId, descDraft);
      setDescription(descDraft);
      setEditingDesc(false);
      if (onBugUpdated) onBugUpdated({ ...bug, description: descDraft });
    } catch { /* */ }
    setSaving(null);
  };

  const fieldLabel = (label, fieldName) => (
    <div style={{
      fontSize: '11px', color: T.textDim, fontFamily: T.fontSans,
      textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6, fontWeight: 500,
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {label}
      {saving === fieldName && <span style={{ fontSize: '10px', color: T.accent, fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}>saving...</span>}
    </div>
  );

  const readOnlyCard = (label, val) => (
    <div style={{ ...glass, borderRadius: T.radius, padding: '14px 18px' }}>
      {fieldLabel(label)}
      <div style={{ fontSize: '14px', fontWeight: 500, color: T.text, fontFamily: T.fontSans }}>{val}</div>
    </div>
  );

  return (
    <div className="slide-in" style={{ padding: 32, maxWidth: 800 }}>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', color: T.accent, cursor: 'pointer',
        fontFamily: T.fontSans, fontSize: '13px', fontWeight: 500, marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 8,
        transition: `all 0.25s ${T.ease}`,
      }}>
        <span style={{ fontSize: '16px' }}>{'\u2190'}</span> Back to list
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <span style={{ fontFamily: T.font, fontSize: '14px', color: T.textDim }}>{bug.id}</span>
        {meta && meta.priorities?.length > 0 ? (
          <EditableSelect
            value={bug.priority}
            options={meta.priorities}
            onSave={(v) => handleFieldSave('priority', v)}
            renderValue={(v) => <PriorityBadge priority={v} />}
          />
        ) : (
          <PriorityBadge priority={bug.priority} />
        )}
        {meta && meta.statuses?.length > 0 ? (
          <EditableSelect
            value={bug.status}
            options={meta.statuses}
            onSave={(v) => handleFieldSave('status', v)}
            renderValue={(v) => <StatusBadge status={v} />}
          />
        ) : (
          <StatusBadge status={bug.status} />
        )}
        {saving === 'priority' || saving === 'status' ? (
          <span style={{ fontSize: '11px', color: T.accent, fontFamily: T.fontSans, fontStyle: 'italic' }}>saving...</span>
        ) : null}
      </div>

      {/* Editable title */}
      {editingTitle ? (
        <input
          ref={titleRef}
          autoFocus
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={handleTitleSave}
          onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') { setEditingTitle(false); setTitleDraft(bug.title); } }}
          style={{
            fontSize: '24px', fontWeight: 700, fontFamily: T.fontSans,
            background: T.bgSubtle, color: T.text, border: `1px solid ${T.borderActive}`,
            borderRadius: T.radiusSm, padding: '6px 12px', width: '100%',
            boxSizing: 'border-box', marginBottom: 28, lineHeight: 1.3, outline: 'none',
          }}
        />
      ) : (
        <h2
          onClick={() => { if (updateBug) setEditingTitle(true); }}
          style={{
            fontSize: '24px', fontWeight: 700, marginBottom: 28, lineHeight: 1.3,
            fontFamily: T.fontSans, cursor: updateBug ? 'pointer' : 'default',
            display: 'flex', alignItems: 'baseline', gap: 8,
          }}
        >
          {bug.title}
          {saving === 'title' && <span style={{ fontSize: '12px', color: T.accent, fontStyle: 'italic', fontWeight: 400 }}>saving...</span>}
        </h2>
      )}

      {/* Property grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
        {/* Assignee — read-only */}
        {readOnlyCard('Assignee', bug.assignee)}

        {/* Type */}
        <div style={{ ...glass, borderRadius: T.radius, padding: '14px 18px' }}>
          {fieldLabel('Type', 'type')}
          {meta?.types?.length > 0 ? (
            <EditableSelect
              value={bug.type || ''}
              options={meta.types}
              onSave={(v) => handleFieldSave('type', v)}
              renderValue={(v) => <span style={{ color: typeColor(v) }}>{stripEmoji(v) || '\u2014'}</span>}
            />
          ) : (
            <div style={{ fontSize: '14px', fontWeight: 500, color: typeColor(bug.type || ''), fontFamily: T.fontSans }}>{stripEmoji(bug.type || '') || '\u2014'}</div>
          )}
        </div>

        {/* Scope */}
        <div style={{ ...glass, borderRadius: T.radius, padding: '14px 18px' }}>
          {fieldLabel('Scope', 'scope')}
          {meta?.scopes?.length > 0 ? (
            <EditableSelect
              value={bug.scope || ''}
              options={meta.scopes}
              onSave={(v) => handleFieldSave('scope', v)}
              renderValue={(v) => <span style={{ color: scopeColor(v) }}>{stripEmoji(v) || '\u2014'}</span>}
            />
          ) : (
            <div style={{ fontSize: '14px', fontWeight: 500, color: scopeColor(bug.scope || ''), fontFamily: T.fontSans }}>{stripEmoji(bug.scope || '') || '\u2014'}</div>
          )}
        </div>

        {/* Size */}
        <div style={{ ...glass, borderRadius: T.radius, padding: '14px 18px' }}>
          {fieldLabel('Size', 'size')}
          {meta?.sizes?.length > 0 ? (
            <EditableSelect
              value={bug.size || ''}
              options={meta.sizes}
              onSave={(v) => handleFieldSave('size', v)}
            />
          ) : (
            <div style={{ fontSize: '14px', fontWeight: 500, color: T.text, fontFamily: T.fontSans }}>{bug.size || '\u2014'}</div>
          )}
        </div>

        {/* Sprint */}
        <div style={{ ...glass, borderRadius: T.radius, padding: '14px 18px' }}>
          {fieldLabel('Sprint', 'sprint')}
          {meta?.sprints?.length > 0 ? (
            <EditableSelect
              value={bug.sprint || ''}
              options={meta.sprints}
              onSave={(v) => handleFieldSave('sprint', v)}
            />
          ) : (
            <div style={{ fontSize: '14px', fontWeight: 500, color: T.text, fontFamily: T.fontSans }}>{bug.sprint || '\u2014'}</div>
          )}
        </div>

        {/* Points */}
        <div style={{ ...glass, borderRadius: T.radius, padding: '14px 18px' }}>
          {fieldLabel('Points', 'points')}
          <EditableInput
            value={bug.points}
            type="number"
            placeholder="\u2014"
            onSave={(v) => handleFieldSave('points', v)}
          />
        </div>

        {/* Due Date */}
        <div style={{ ...glass, borderRadius: T.radius, padding: '14px 18px' }}>
          {fieldLabel('Due Date', 'due')}
          <EditableDate
            value={bug.due || ''}
            onSave={(v) => handleFieldSave('due', v)}
          />
        </div>

        {/* Created — read-only */}
        {readOnlyCard('Created', formatDate(bug.created) || bug.created)}
      </div>

      {/* Description */}
      <div style={{ ...glass, borderRadius: T.radiusLg, padding: '22px 26px' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
        }}>
          <div style={{
            fontSize: '11px', color: T.textDim, fontFamily: T.fontSans,
            textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            Description
            {saving === 'description' && <span style={{ fontSize: '10px', color: T.accent, fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}>saving...</span>}
          </div>
          {!editingDesc ? (
            <button
              onClick={() => { setDescDraft(description); setEditingDesc(true); }}
              style={{
                background: 'none', border: `1px solid ${T.border}`, color: T.textDim,
                borderRadius: T.radiusSm, padding: '4px 12px', fontSize: '12px',
                fontFamily: T.fontSans, cursor: 'pointer', transition: `all 0.2s ${T.ease}`,
              }}
            >Edit</button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleDescSave}
                disabled={saving === 'description'}
                style={{
                  background: T.accent, border: 'none', color: '#fff',
                  borderRadius: T.radiusSm, padding: '4px 12px', fontSize: '12px',
                  fontFamily: T.fontSans, fontWeight: 600, cursor: 'pointer',
                }}
              >Save</button>
              <button
                onClick={() => setEditingDesc(false)}
                style={{
                  background: 'none', border: `1px solid ${T.border}`, color: T.textDim,
                  borderRadius: T.radiusSm, padding: '4px 12px', fontSize: '12px',
                  fontFamily: T.fontSans, cursor: 'pointer',
                }}
              >Cancel</button>
            </div>
          )}
        </div>
        {editingDesc ? (
          <textarea
            autoFocus
            value={descDraft}
            onChange={(e) => setDescDraft(e.target.value)}
            style={{
              width: '100%', minHeight: 200, background: T.bgSubtle,
              color: T.text, border: `1px solid ${T.borderActive}`,
              borderRadius: T.radiusSm, padding: '12px 14px',
              fontSize: '13px', fontFamily: T.font, lineHeight: 1.8,
              resize: 'vertical', outline: 'none', boxSizing: 'border-box',
            }}
          />
        ) : description ? (
          <pre style={{ fontFamily: T.font, fontSize: '13px', color: T.text, lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>{description}</pre>
        ) : (
          <span style={{ fontSize: '13px', color: T.textDim, fontFamily: T.fontSans, fontStyle: 'italic' }}>No description</span>
        )}
      </div>
    </div>
  );
}
