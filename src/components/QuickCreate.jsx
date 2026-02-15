import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { T, glass, priorityColor, statusColor, typeColor, scopeColor, formatDate } from '../styles/tokens';
import { parseCommand } from '../lib/commandParser';

const BASE_STATUSES = ['To do', 'Pending', 'In progress', 'Reviewing', 'Done', "Can't reproduce"];
const BASE_PRIORITIES = ['P1', 'P2', 'P3', 'P4'];

function mergeOptions(base, meta) {
  const seen = new Set(base.map((b) => b.toLowerCase()));
  const extra = (meta || []).filter((o) => o && !seen.has(o.toLowerCase()));
  return [...base, ...extra];
}

const fieldStyle = {
  width: '100%', padding: '10px 14px',
  background: 'rgba(255, 255, 255, 0.03)',
  border: `1px solid ${T.border}`, borderRadius: T.radiusSm,
  color: T.text, fontSize: '12px', fontFamily: T.fontSans, outline: 'none',
  boxSizing: 'border-box', transition: `all 0.25s ${T.ease}`,
  WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none',
};

const selectStyle = {
  ...fieldStyle,
  cursor: 'pointer',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b7084'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  paddingRight: 28,
};

const numberStyle = {
  ...fieldStyle,
  MozAppearance: 'textfield',
};

const labelStyle = {
  fontSize: '10px', fontWeight: 500, color: T.textDim,
  fontFamily: T.fontSans, textTransform: 'uppercase', letterSpacing: '1px',
  marginBottom: 6, display: 'block',
};

function SelectField({ label, value, onChange, options, placeholder, colorFn }) {
  const color = colorFn && value ? colorFn(value) : undefined;
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ ...selectStyle, ...(color ? { color, borderColor: `${color}40` } : {}) }}>
        <option value="">{placeholder || `Select...`}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function DateInput({ value, onChange }) {
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

  const emit = (y, m, d) => {
    if (y && m && d) {
      const iso = `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      const parsed = new Date(iso);
      if (!isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso) {
        onChange(iso);
      }
    } else if (!y && !m && !d) {
      onChange('');
    }
  };

  const segStyle = {
    background: 'rgba(255, 255, 255, 0.03)',
    border: `1px solid ${T.border}`, borderRadius: T.radiusSm,
    color: T.text, fontSize: '12px', fontFamily: T.fontSans, outline: 'none',
    boxSizing: 'border-box', textAlign: 'center', padding: '10px 0',
    minWidth: 0, width: 0,
  };

  const numOnly = (v) => v.replace(/\D/g, '');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', minWidth: 0 }}>
      <input ref={yRef} value={yyyy} placeholder="YYYY" maxLength={4} inputMode="numeric"
        style={{ ...segStyle, flex: '1 1 0' }}
        onChange={(e) => { const v = numOnly(e.target.value); setYyyy(v); emit(v, mm, dd); if (v.length === 4) mRef.current?.focus(); }}
      />
      <span style={{ color: T.textDim, fontSize: '11px', flexShrink: 0 }}>/</span>
      <input ref={mRef} value={mm} placeholder="MM" maxLength={2} inputMode="numeric"
        style={{ ...segStyle, flex: '1 1 0' }}
        onChange={(e) => { const v = numOnly(e.target.value); setMm(v); emit(yyyy, v, dd); if (v.length === 2) dRef.current?.focus(); }}
        onKeyDown={(e) => { if (e.key === 'Backspace' && !mm) yRef.current?.focus(); }}
      />
      <span style={{ color: T.textDim, fontSize: '11px', flexShrink: 0 }}>/</span>
      <input ref={dRef} value={dd} placeholder="DD" maxLength={2} inputMode="numeric"
        style={{ ...segStyle, flex: '1 1 0' }}
        onChange={(e) => { const v = numOnly(e.target.value); setDd(v); emit(yyyy, mm, v); }}
        onKeyDown={(e) => { if (e.key === 'Backspace' && !dd) mRef.current?.focus(); }}
      />
    </div>
  );
}

function Chip({ label, value, color, bg }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: T.radiusSm,
      fontSize: '11px', fontWeight: 600, fontFamily: T.font,
      color: color || T.text, background: bg || 'rgba(255, 255, 255, 0.06)',
      letterSpacing: '0.3px', whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: '9px', color: T.textDim, fontWeight: 400 }}>{label}</span>
      {value}
    </span>
  );
}

function WarningChip({ text }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: T.radiusSm,
      fontSize: '11px', fontWeight: 500, fontFamily: T.font,
      color: T.critical, background: 'rgba(244, 113, 113, 0.1)',
    }}>
      <span style={{ fontSize: '12px' }}>!</span>
      {text}
    </span>
  );
}

function HelpTip() {
  const [show, setShow] = useState(false);
  const lines = [
    ['/b, /f, /i', 'Type: Bug, Feature, Improve'],
    ['#epic, #story, #task', 'Scope shortcut'],
    ['/p 1-4 or urgent/high/low', 'Priority (P1-P4)'],
    ['/s <status>', 'Status (fuzzy match)'],
    ['/who or @<name>', 'Assignee (fuzzy match)'],
    ['/due 2/20 or 2026-02-20', 'Due date'],
    ['/sprint <name>', 'Sprint (fuzzy match)'],
    ['/pts <number>', 'Story points'],
    ['/size <value>', 'Size (fuzzy match)'],
    ['/project <name>', 'Project (fuzzy match)'],
    ['Enter', 'Create bug'],
  ];
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 18, height: 18, borderRadius: '50%',
        fontSize: '11px', fontWeight: 600, fontFamily: T.font,
        color: T.textDim, border: `1px solid ${T.border}`,
        cursor: 'help', userSelect: 'none',
        transition: `all 0.25s ${T.ease}`,
        background: show ? 'rgba(139, 124, 246, 0.1)' : 'transparent',
      }}>?</span>
      {show && (
        <div style={{
          position: 'fixed', top: 100, left: '50%', transform: 'translateX(-50%)',
          ...glass, borderRadius: T.radiusSm, padding: '12px 16px',
          zIndex: 50, width: 300, boxShadow: T.shadowLg,
          animation: 'fadeIn 0.15s ease-out',
        }}>
          <div style={{
            fontSize: '11px', fontWeight: 600, color: T.accent,
            fontFamily: T.fontSans, marginBottom: 8, textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>Command Cheat Sheet</div>
          <table style={{ width: '100%', borderSpacing: '0 3px' }}>
            <tbody>
              {lines.map(([cmd, desc], i) => (
                <tr key={i}>
                  <td style={{
                    fontSize: '11px', fontFamily: T.font, color: T.text,
                    padding: '2px 8px 2px 0', whiteSpace: 'nowrap', verticalAlign: 'top',
                  }}>{cmd}</td>
                  <td style={{
                    fontSize: '11px', fontFamily: T.fontSans, color: T.textDim,
                    padding: '2px 0', verticalAlign: 'top',
                  }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const DESC_SECTIONS = [
  { key: 'summary', label: 'Summary', placeholder: 'Brief overview of the issue', rows: 2 },
  { key: 'steps', label: 'Steps to Reproduce', placeholder: '1. Go to...\n2. Click on...\n3. Observe...', rows: 3 },
  { key: 'expected', label: 'Expected', placeholder: 'What should happen', rows: 2 },
  { key: 'actual', label: 'Actual', placeholder: 'What actually happens', rows: 2 },
];

function buildDescription(sections) {
  return DESC_SECTIONS
    .filter((sec) => sections[sec.key]?.trim())
    .map((sec) => `## ${sec.label}\n${sections[sec.key].trim()}`)
    .join('\n\n');
}

function Toast({ title, id, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 100,
      ...glass, borderRadius: T.radius, padding: '14px 20px',
      display: 'flex', alignItems: 'center', gap: 12,
      borderLeft: `3px solid ${T.accent}`,
      boxShadow: `${T.accentGlow}, ${T.shadowLg}`,
      animation: 'slideIn 0.3s ease-out',
    }}>
      <span style={{ fontSize: '13px', fontFamily: T.fontSans, color: T.text, fontWeight: 500 }}>
        Created <span style={{ color: T.accent, fontFamily: T.font }}>{id}</span>
      </span>
      <span style={{ fontSize: '12px', fontFamily: T.fontSans, color: T.textDim, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {title}
      </span>
    </div>
  );
}

export default function QuickCreate({ meta, createBug }) {
  const [input, setInput] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [formOverrides, setFormOverrides] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);
  const [descSections, setDescSections] = useState({ summary: '', steps: '', expected: '', actual: '' });
  const inputRef = useRef(null);

  const parsed = useMemo(() => parseCommand(input, meta), [input, meta]);

  // Merge parsed fields with form overrides (form overrides win)
  const mergedFields = useMemo(() => ({
    ...parsed.fields,
    ...formOverrides,
  }), [parsed.fields, formOverrides]);

  const handleFormChange = useCallback((key, val) => {
    setFormOverrides((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleDescChange = useCallback((key, val) => {
    setDescSections((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleSubmit = useCallback(async () => {
    const title = parsed.title;
    if (!title.trim()) { setError('Type a title to create a bug'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const data = { title, ...mergedFields };
      if (!data.priority) data.priority = 'P1';
      if (!data.status) data.status = 'To do';
      // Combine description sections
      const desc = buildDescription(descSections);
      if (desc) data.description = desc;
      // Clean empty values
      Object.keys(data).forEach((k) => {
        if (data[k] === '' || data[k] === undefined) delete data[k];
      });
      const created = await createBug(data);
      setToast({ title: created.title, id: created.id });
      setInput('');
      setFormOverrides({});
      setDescSections({ summary: '', steps: '', expected: '', actual: '' });
      setExpanded(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }, [parsed.title, mergedFields, createBug, descSections]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const hasContent = input.trim().length > 0;
  const hasChips = Object.keys(mergedFields).length > 0 || parsed.warnings.length > 0;

  const hasStatuses = meta.statuses?.length > 0;
  const hasPriorities = meta.priorities?.length > 0;
  const hasTypes = meta.types?.length > 0;
  const hasScopes = meta.scopes?.length > 0;
  const hasSizes = meta.sizes?.length > 0;
  const hasSprints = meta.sprints?.length > 0;
  const hasMembers = meta.members?.length > 0;
  const hasProjects = meta.projects?.length > 0;

  return (
    <>
      <div style={{
        padding: '10px 32px', borderBottom: `1px solid ${T.border}`,
        background: 'rgba(10, 11, 16, 0.5)',
      }}>
        {/* Input row */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            fontSize: '13px', color: T.textDim, fontFamily: T.font,
            flexShrink: 0, userSelect: 'none',
          }}>&gt;</span>
          <HelpTip />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(null); }}
            onKeyDown={handleKeyDown}
            placeholder="/b slicer crash on import /p 1 #story @chloe /due 2/20"
            style={{
              flex: 1, padding: '8px 0', border: 'none',
              background: 'transparent', color: T.text,
              fontSize: '13px', fontFamily: T.font, outline: 'none',
              caretColor: T.accent,
            }}
          />
          <button
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? 'Collapse form' : 'Expand form'}
            style={{
              padding: '5px 8px', borderRadius: T.radiusSm,
              border: `1px solid ${T.border}`,
              background: expanded ? 'rgba(139, 124, 246, 0.1)' : 'transparent',
              color: expanded ? T.accent : T.textDim,
              fontSize: '12px', cursor: 'pointer', fontFamily: T.font,
              transition: `all 0.25s ${T.ease}`, flexShrink: 0,
              transform: expanded ? 'rotate(180deg)' : 'none',
            }}
          >{'\u25BC'}</button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !hasContent}
            style={{
              padding: '6px 16px', borderRadius: T.radiusSm, border: 'none',
              background: hasContent
                ? `linear-gradient(135deg, ${T.accent}, #6366f1)`
                : 'rgba(255, 255, 255, 0.04)',
              color: hasContent ? '#fff' : T.textDim,
              fontSize: '12px', fontWeight: 600, cursor: hasContent ? 'pointer' : 'default',
              fontFamily: T.fontSans, whiteSpace: 'nowrap', flexShrink: 0,
              boxShadow: hasContent ? T.accentGlow : 'none',
              opacity: submitting ? 0.6 : 1,
              transition: `all 0.25s ${T.ease}`,
            }}
          >{submitting ? '...' : 'Create'}</button>
        </div>

        {/* Preview chips */}
        {hasChips && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 6,
            padding: '6px 0 2px 18px',
          }}>
            {mergedFields.type && (
              <Chip label="type" value={mergedFields.type}
                color={typeColor(mergedFields.type)}
                bg={`${typeColor(mergedFields.type)}18`} />
            )}
            {mergedFields.priority && (
              <Chip label="pri" value={mergedFields.priority}
                color={priorityColor(mergedFields.priority)}
                bg={`${priorityColor(mergedFields.priority)}18`} />
            )}
            {mergedFields.status && (
              <Chip label="status" value={mergedFields.status}
                color={statusColor(mergedFields.status)}
                bg={`${statusColor(mergedFields.status)}18`} />
            )}
            {mergedFields.scope && <Chip label="scope" value={mergedFields.scope}
                color={scopeColor(mergedFields.scope)}
                bg={`${scopeColor(mergedFields.scope)}18`} />}
            {mergedFields.assignee && <Chip label="who" value={mergedFields.assignee} />}
            {mergedFields.due && <Chip label="due" value={formatDate(mergedFields.due) || mergedFields.due} />}
            {mergedFields.sprint && <Chip label="sprint" value={mergedFields.sprint} />}
            {mergedFields.points !== undefined && <Chip label="pts" value={String(mergedFields.points)} />}
            {mergedFields.size && <Chip label="size" value={mergedFields.size} />}
            {mergedFields.project && <Chip label="proj" value={mergedFields.project} />}
            {Object.values(descSections).some((v) => v.trim()) && (
              <Chip label="desc" value={`${DESC_SECTIONS.filter((s) => descSections[s.key]?.trim()).length}/${DESC_SECTIONS.length} sections`} />
            )}
            {parsed.warnings.map((w, i) => <WarningChip key={i} text={w} />)}
            {parsed.title && (
              <span style={{
                fontSize: '11px', color: T.textDim, fontFamily: T.fontSans,
                padding: '2px 4px', alignSelf: 'center', fontStyle: 'italic',
                maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{parsed.title}</span>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            fontSize: '12px', color: T.critical, fontFamily: T.fontSans,
            padding: '4px 0 2px 18px',
          }}>{error}</div>
        )}

        {/* Expanded form */}
        {expanded && (
          <div style={{
            padding: '12px 0 4px 18px',
            borderTop: `1px solid ${T.border}`, marginTop: 8,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <SelectField label="Status" value={mergedFields.status || 'To do'}
                onChange={(v) => handleFormChange('status', v)}
                options={mergeOptions(BASE_STATUSES, meta.statuses)}
                colorFn={statusColor} />
              <SelectField label="Priority" value={mergedFields.priority || 'P1'}
                onChange={(v) => handleFormChange('priority', v)}
                options={mergeOptions(BASE_PRIORITIES, meta.priorities)}
                colorFn={priorityColor} />
              {hasTypes && (
                <SelectField label="Type" value={mergedFields.type || ''}
                  onChange={(v) => handleFormChange('type', v)} options={meta.types}
                  colorFn={typeColor} />
              )}
              {hasScopes && (
                <SelectField label="Scope" value={mergedFields.scope || ''}
                  onChange={(v) => handleFormChange('scope', v)} options={meta.scopes}
                  colorFn={scopeColor} />
              )}
              {hasSizes && (
                <SelectField label="Size" value={mergedFields.size || ''}
                  onChange={(v) => handleFormChange('size', v)} options={meta.sizes} />
              )}
              {hasSprints && (
                <SelectField label="Sprint" value={mergedFields.sprint || ''}
                  onChange={(v) => handleFormChange('sprint', v)} options={meta.sprints} />
              )}
              {hasMembers && (
                <SelectField label="Assignee" value={mergedFields.assignee || ''}
                  onChange={(v) => handleFormChange('assignee', v)} options={meta.members} />
              )}
              {hasProjects && (
                <SelectField label="Project" value={mergedFields.project || ''}
                  onChange={(v) => handleFormChange('project', v)} options={meta.projects} />
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 10 }}>
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <label style={labelStyle}>Due Date</label>
                <DateInput value={mergedFields.due || ''} onChange={(v) => handleFormChange('due', v)} />
              </div>
              <div>
                <label style={labelStyle}>Points</label>
                <input type="number" min="0" value={mergedFields.points ?? ''}
                  onChange={(e) => handleFormChange('points', e.target.value === '' ? undefined : Number(e.target.value))}
                  placeholder="0" style={numberStyle} />
              </div>
            </div>

            {/* Description sections */}
            <div style={{ marginTop: 12 }}>
              <label style={labelStyle}>Description</label>
              <div style={{
                ...fieldStyle, padding: 0, overflow: 'hidden',
                display: 'flex', flexDirection: 'column', gap: 0,
              }}>
                {DESC_SECTIONS.map((sec, idx) => {
                  const val = descSections[sec.key] || '';
                  const hasText = val.trim().length > 0;
                  return (
                    <div key={sec.key} style={{
                      borderBottom: idx < DESC_SECTIONS.length - 1 ? `1px solid ${T.border}` : 'none',
                    }}>
                      <div style={{
                        padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8,
                        background: hasText ? 'rgba(139, 124, 246, 0.04)' : 'transparent',
                      }}>
                        <span style={{
                          fontSize: '10px', fontWeight: 600, fontFamily: T.fontSans,
                          textTransform: 'uppercase', letterSpacing: '0.5px',
                          color: hasText ? T.accent : T.textDim,
                        }}>{sec.label}</span>
                        {hasText && <span style={{
                          width: 5, height: 5, borderRadius: '50%', background: T.accent,
                          flexShrink: 0,
                        }} />}
                      </div>
                      <textarea
                        value={val}
                        onChange={(e) => handleDescChange(sec.key, e.target.value)}
                        placeholder={sec.placeholder}
                        rows={sec.rows}
                        style={{
                          width: '100%', padding: '4px 14px 8px',
                          background: 'transparent', border: 'none',
                          color: T.text, fontSize: '12px', fontFamily: T.font,
                          lineHeight: 1.7, outline: 'none', resize: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <Toast title={toast.title} id={toast.id} onDismiss={() => setToast(null)} />
      )}
    </>
  );
}
