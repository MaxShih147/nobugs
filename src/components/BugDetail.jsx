import { useState, useEffect, useRef, useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { T, glass, typeColor, scopeColor, stripEmoji, formatDate } from '../styles/tokens';
import { Badge, PriorityBadge, StatusBadge } from './ui';
import { fetchBug, updateDescription } from '../lib/api';

marked.setOptions({ gfm: true, breaks: true });

function MarkdownRenderer({ content }) {
  const html = useMemo(
    () => DOMPurify.sanitize(marked.parse(content || '')),
    [content]
  );
  return <div className="md-rendered" dangerouslySetInnerHTML={{ __html: html }} />;
}

function insertMarkdown(textareaRef, value, onChange, before, after, placeholder) {
  const ta = textareaRef.current;
  if (!ta) return;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = value.slice(start, end);
  const insert = selected || placeholder;
  const newValue = value.slice(0, start) + before + insert + after + value.slice(end);
  onChange(newValue);
  requestAnimationFrame(() => {
    ta.focus();
    const cursorStart = start + before.length;
    const cursorEnd = cursorStart + insert.length;
    ta.setSelectionRange(cursorStart, cursorEnd);
  });
}

function handleListContinue(e, textareaRef, value, onChange) {
  if (e.key !== 'Enter') return;
  const ta = textareaRef.current;
  if (!ta) return;
  const pos = ta.selectionStart;
  const before = value.slice(0, pos);
  const lineStart = before.lastIndexOf('\n') + 1;
  const line = before.slice(lineStart);

  let match;
  if ((match = line.match(/^(\s*- \[[ x]\] )(.*)$/))) {
    // Checklist
    if (!match[2]) { // empty item — clear prefix
      e.preventDefault();
      const newValue = value.slice(0, lineStart) + value.slice(pos);
      onChange(newValue);
      requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(lineStart, lineStart); });
    } else {
      e.preventDefault();
      const prefix = match[1].replace(/\[x\]/, '[ ]');
      const insert = '\n' + prefix;
      const newValue = value.slice(0, pos) + insert + value.slice(pos);
      onChange(newValue);
      const cur = pos + insert.length;
      requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(cur, cur); });
    }
  } else if ((match = line.match(/^(\s*- )(.*)$/))) {
    // Bullet
    if (!match[2]) {
      e.preventDefault();
      const newValue = value.slice(0, lineStart) + value.slice(pos);
      onChange(newValue);
      requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(lineStart, lineStart); });
    } else {
      e.preventDefault();
      const insert = '\n' + match[1];
      const newValue = value.slice(0, pos) + insert + value.slice(pos);
      onChange(newValue);
      const cur = pos + insert.length;
      requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(cur, cur); });
    }
  } else if ((match = line.match(/^(\s*)(\d+)\. (.*)$/))) {
    // Numbered
    if (!match[3]) {
      e.preventDefault();
      const newValue = value.slice(0, lineStart) + value.slice(pos);
      onChange(newValue);
      requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(lineStart, lineStart); });
    } else {
      e.preventDefault();
      const next = Number(match[2]) + 1;
      const insert = '\n' + match[1] + next + '. ';
      const newValue = value.slice(0, pos) + insert + value.slice(pos);
      onChange(newValue);
      const cur = pos + insert.length;
      requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(cur, cur); });
    }
  }
}

function MarkdownToolbar({ textareaRef, value, onChange }) {
  const ic = (children) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      {children}
    </svg>
  );
  const btnStyle = {
    background: 'none', border: `1px solid ${T.border}`, color: T.textDim,
    borderRadius: T.radiusSm, width: 28, height: 26, padding: 0,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: `all 0.15s ${T.ease}`,
  };
  const btn = (icon, title, before, after, placeholder) => (
    <button key={title} title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => insertMarkdown(textareaRef, value, onChange, before, after, placeholder)}
      style={btnStyle}
    >{icon}</button>
  );
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {btn(ic(<path d="M7 5h6.5a3.5 3.5 0 0 1 0 7H7zm0 7h7.5a3.5 3.5 0 0 1 0 7H7z" />), 'Bold', '**', '**', 'bold')}
      {btn(ic(<path d="M19 4h-9M14 20H5M15 4L9 20" />), 'Italic', '_', '_', 'italic')}
      {btn(ic(<path d="M6 4v16M18 4v16M6 12h12" />), 'Heading', '## ', '', 'heading')}
      {btn(ic(
        <>
          <path d="M9 6h12M9 12h12M9 18h12" />
          <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
        </>
      ), 'Bullet list', '- ', '', 'item')}
      {btn(ic(
        <>
          <path d="M11 6h10M11 12h10M11 18h10" />
          <text x="1" y="9" fill="currentColor" stroke="none" fontSize="10" fontWeight="700" fontFamily="sans-serif">1</text>
          <text x="1" y="15" fill="currentColor" stroke="none" fontSize="10" fontWeight="700" fontFamily="sans-serif">2</text>
          <text x="1" y="21" fill="currentColor" stroke="none" fontSize="10" fontWeight="700" fontFamily="sans-serif">3</text>
        </>
      ), 'Numbered list', '1. ', '', 'item')}
      {btn(ic(
        <>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 12l2 2 4-4" />
        </>
      ), 'Checklist', '- [ ] ', '', 'task')}
      {btn(ic(<path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />), 'Code', '`', '`', 'code')}
      {btn(ic(
        <>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </>
      ), 'Link', '[', '](url)', 'text')}
      {btn(ic(
        <>
          <path d="M6 21V3" strokeWidth="3" opacity="0.4" />
          <path d="M11 6h10M11 12h10M11 18h8" />
        </>
      ), 'Quote', '> ', '', 'quote')}
      {btn(ic(<path d="M3 12h18" />), 'Divider', '\n---\n', '', '')}
    </div>
  );
}

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

function titleCase(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

function ScopeBadge({ scope }) {
  if (!scope) return null;
  return <Badge color={scopeColor(scope)} bg={`${scopeColor(scope)}18`} style={{ fontSize: '10px', padding: '2px 6px' }}>{titleCase(scope)}</Badge>;
}

function ParentChooser({ bug, allBugs, updateBug, onBugUpdated }) {
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const bugScope = (bug.scope || '').toLowerCase();
  const validParentScope = bugScope === 'story' ? 'epic' : bugScope === 'task' ? 'story' : null;
  const bugNotionId = bug.notionId || bug.id;

  const candidateParents = useMemo(() => {
    if (!validParentScope) return [];
    return allBugs.filter((b) => {
      const s = (b.scope || '').toLowerCase();
      return s === validParentScope && (b.notionId || b.id) !== bugNotionId;
    });
  }, [allBugs, validParentScope, bugNotionId]);

  const filteredParents = useMemo(() => {
    if (!search) return candidateParents;
    const q = search.toLowerCase();
    return candidateParents.filter((b) =>
      b.title.toLowerCase().includes(q) || b.id.toLowerCase().includes(q)
    );
  }, [candidateParents, search]);

  const currentParent = useMemo(() => {
    if (!bug.parentNotionId) return null;
    return allBugs.find((b) => (b.notionId || b.id) === bug.parentNotionId) || null;
  }, [allBugs, bug.parentNotionId]);

  const children = useMemo(() => {
    return allBugs.filter((b) => b.parentNotionId === bugNotionId);
  }, [allBugs, bugNotionId]);

  const handleSelectParent = async (parent) => {
    setShowPicker(false);
    setSearch('');
    setSaving(true);
    try {
      const parentId = parent.notionId || parent.id;
      const updated = await updateBug(bugNotionId, { parentNotionId: parentId });
      if (onBugUpdated) onBugUpdated({ ...bug, ...updated, parentNotionId: parentId });
    } catch { /* handled in useBugs */ }
    setSaving(false);
  };

  const handleUnlink = async () => {
    setSaving(true);
    try {
      const updated = await updateBug(bugNotionId, { parentNotionId: null });
      if (onBugUpdated) onBugUpdated({ ...bug, ...updated, parentNotionId: null });
    } catch { /* handled in useBugs */ }
    setSaving(false);
  };

  const sectionStyle = {
    padding: '14px', borderRadius: T.radiusSm, border: `1px solid ${T.border}`,
    background: 'rgba(255,255,255,0.02)', marginBottom: 14,
  };
  const sectionLabel = {
    fontSize: '10px', fontFamily: T.fontSans, color: T.textDim,
    textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8, fontWeight: 600,
    display: 'flex', alignItems: 'center', gap: 6,
  };
  const btnStyle = {
    padding: '5px 10px', borderRadius: T.radiusSm, border: `1px solid ${T.border}`,
    background: 'rgba(255,255,255,0.03)', color: T.textDim, fontSize: '11px',
    fontFamily: T.fontSans, cursor: 'pointer', fontWeight: 500,
  };

  return (
    <div>
      <div style={{ ...sectionLabel, marginBottom: 14, fontSize: '11px', letterSpacing: '1px' }}>
        Hierarchy
        {saving && <span style={{ fontSize: '10px', color: T.accent, fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}>saving...</span>}
      </div>

      {/* Parent section — hidden for epics */}
      {validParentScope && (
        <div style={sectionStyle}>
          <div style={sectionLabel}>Parent</div>
          {currentParent ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ScopeBadge scope={currentParent.scope} />
              <span style={{
                fontSize: '12px', fontFamily: T.fontSans, color: T.text,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
              }}>{currentParent.title}</span>
            </div>
          ) : (
            <span style={{ fontSize: '12px', fontFamily: T.fontSans, color: T.textDim }}>None (unlinked)</span>
          )}

          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <button onClick={() => { setShowPicker(!showPicker); setSearch(''); }} style={btnStyle}>
              {showPicker ? 'Cancel' : 'Change parent'}
            </button>
            {currentParent && (
              <button onClick={handleUnlink} style={{ ...btnStyle, borderColor: `${T.critical}30`, color: T.critical }}>
                Unlink
              </button>
            )}
          </div>

          {showPicker && (
            <div style={{ marginTop: 10 }}>
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${validParentScope}s...`} autoFocus
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`,
                  borderRadius: T.radiusSm, padding: '7px 10px', color: T.text,
                  fontSize: '12px', fontFamily: T.fontSans, outline: 'none', marginBottom: 6,
                }}
              />
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {filteredParents.slice(0, 30).map((p) => (
                  <div key={p.notionId || p.id} onClick={() => handleSelectParent(p)}
                    style={{
                      padding: '6px 8px', cursor: 'pointer', fontSize: '12px',
                      fontFamily: T.fontSans, color: T.text, borderRadius: T.radiusSm,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(139,124,246,0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <span style={{ fontFamily: T.font, fontSize: '10px', color: T.textDim, flexShrink: 0 }}>{p.id}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                  </div>
                ))}
                {filteredParents.length === 0 && (
                  <div style={{ padding: 8, fontSize: '12px', color: T.textDim, fontFamily: T.fontSans }}>No matches</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Children section */}
      {children.length > 0 && (
        <div style={sectionStyle}>
          <div style={sectionLabel}>Children ({children.length})</div>
          {children.map((c) => (
            <div key={c.notionId || c.id} style={{
              padding: '5px 8px', fontSize: '12px',
              fontFamily: T.fontSans, color: T.text, display: 'flex', alignItems: 'center', gap: 6,
              borderRadius: T.radiusSm,
            }}>
              <ScopeBadge scope={c.scope} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Empty state for epics with no children */}
      {!validParentScope && children.length === 0 && (
        <div style={{ fontSize: '12px', fontFamily: T.fontSans, color: T.textDim, fontStyle: 'italic' }}>
          No hierarchy links
        </div>
      )}
    </div>
  );
}

export default function BugDetail({ bug, onBack, updateBug, meta, onBugUpdated, allBugs }) {
  const [description, setDescription] = useState(bug?.description || '');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [saving, setSaving] = useState(null); // field name being saved
  const [editorTab, setEditorTab] = useState('write');
  const descTextareaRef = useRef(null);
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
    <div className="slide-in" style={{ padding: 32, maxWidth: 1100 }}>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', color: T.accent, cursor: 'pointer',
        fontFamily: T.fontSans, fontSize: '13px', fontWeight: 500, marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 8,
        transition: `all 0.25s ${T.ease}`,
      }}>
        <span style={{ fontSize: '16px' }}>{'\u2190'}</span> Back to list
      </button>

      <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>
        {/* Left column — page info + body */}
        <div style={{ flex: 1, minWidth: 0 }}>

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
              onClick={() => { setDescDraft(description); setEditingDesc(true); setEditorTab('write'); }}
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
          <>
            {/* Write / Preview tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 10, borderBottom: `1px solid ${T.border}` }}>
              {['write', 'preview'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setEditorTab(tab)}
                  style={{
                    background: 'none', border: 'none', borderBottom: editorTab === tab ? `2px solid ${T.accent}` : '2px solid transparent',
                    color: editorTab === tab ? T.text : T.textDim,
                    padding: '6px 14px', fontSize: '12px', fontFamily: T.fontSans,
                    fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize',
                    transition: `all 0.15s ${T.ease}`, marginBottom: -1,
                  }}
                >{tab}</button>
              ))}
            </div>
            {editorTab === 'write' ? (
              <>
                <MarkdownToolbar textareaRef={descTextareaRef} value={descDraft} onChange={setDescDraft} />
                <textarea
                  ref={descTextareaRef}
                  autoFocus
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  onKeyDown={(e) => handleListContinue(e, descTextareaRef, descDraft, setDescDraft)}
                  style={{
                    width: '100%', minHeight: 200, marginTop: 8, background: T.bgSubtle,
                    color: T.text, border: `1px solid ${T.borderActive}`,
                    borderRadius: T.radiusSm, padding: '12px 14px',
                    fontSize: '13px', fontFamily: T.font, lineHeight: 1.8,
                    resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </>
            ) : (
              <div style={{
                minHeight: 200, background: T.bgSubtle,
                border: `1px solid ${T.border}`, borderRadius: T.radiusSm,
                padding: '12px 14px',
              }}>
                {descDraft ? <MarkdownRenderer content={descDraft} /> : (
                  <span style={{ fontSize: '13px', color: T.textDim, fontFamily: T.fontSans, fontStyle: 'italic' }}>Nothing to preview</span>
                )}
              </div>
            )}
          </>
        ) : description ? (
          <MarkdownRenderer content={description} />
        ) : (
          <span style={{ fontSize: '13px', color: T.textDim, fontFamily: T.fontSans, fontStyle: 'italic' }}>No description</span>
        )}
      </div>
        </div>

        {/* Right column — parent chooser sidebar */}
        {allBugs && (
          <div style={{ width: 280, flexShrink: 0 }}>
            <ParentChooser bug={bug} allBugs={allBugs} updateBug={updateBug} onBugUpdated={onBugUpdated} />
          </div>
        )}
      </div>
    </div>
  );
}
