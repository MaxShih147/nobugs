import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { T, glass, priorityColor, statusColor } from '../styles/tokens';
import { parseCommand } from '../lib/commandParser';

const fieldStyle = {
  width: '100%', padding: '10px 14px',
  background: 'rgba(255, 255, 255, 0.03)',
  border: `1px solid ${T.border}`, borderRadius: T.radiusSm,
  color: T.text, fontSize: '13px', fontFamily: T.fontSans, outline: 'none',
  boxSizing: 'border-box', transition: `all 0.25s ${T.ease}`,
};

const labelStyle = {
  fontSize: '10px', fontWeight: 500, color: T.textDim,
  fontFamily: T.fontSans, textTransform: 'uppercase', letterSpacing: '1px',
  marginBottom: 6, display: 'block',
};

function SelectField({ label, value, onChange, options, placeholder }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...fieldStyle, cursor: 'pointer' }}>
        <option value="">{placeholder || `Select...`}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
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
    ['/p 0-4 or urgent/high/low', 'Priority'],
    ['/s <status>', 'Status (fuzzy match)'],
    ['/who <name>', 'Assignee (fuzzy match)'],
    ['/when 2/20 or 2026-02-20', 'Due date'],
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

  const handleSubmit = useCallback(async () => {
    const title = parsed.title;
    if (!title.trim()) { setError('Type a title to create a bug'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const data = { title, ...mergedFields };
      // Clean empty values
      Object.keys(data).forEach((k) => {
        if (data[k] === '' || data[k] === undefined) delete data[k];
      });
      const created = await createBug(data);
      setToast({ title: created.title, id: created.id });
      setInput('');
      setFormOverrides({});
      setExpanded(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }, [parsed.title, mergedFields, createBug]);

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
            placeholder="/b slicer crash on import /p 1 #story /who chloe /when 2/20"
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
        {hasContent && hasChips && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 6,
            padding: '6px 0 2px 18px',
          }}>
            {mergedFields.type && (
              <Chip label="type" value={mergedFields.type} color={T.accent} bg={T.accentSoft} />
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
            {mergedFields.scope && <Chip label="scope" value={mergedFields.scope} />}
            {mergedFields.assignee && <Chip label="who" value={mergedFields.assignee} />}
            {mergedFields.due && <Chip label="due" value={mergedFields.due} />}
            {mergedFields.sprint && <Chip label="sprint" value={mergedFields.sprint} />}
            {mergedFields.points !== undefined && <Chip label="pts" value={String(mergedFields.points)} />}
            {mergedFields.size && <Chip label="size" value={mergedFields.size} />}
            {mergedFields.project && <Chip label="proj" value={mergedFields.project} />}
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
              {hasStatuses && (
                <SelectField label="Status" value={mergedFields.status || ''}
                  onChange={(v) => handleFormChange('status', v)} options={meta.statuses} />
              )}
              {hasPriorities && (
                <SelectField label="Priority" value={mergedFields.priority || ''}
                  onChange={(v) => handleFormChange('priority', v)} options={meta.priorities} />
              )}
              {hasTypes && (
                <SelectField label="Type" value={mergedFields.type || ''}
                  onChange={(v) => handleFormChange('type', v)} options={meta.types} />
              )}
              {hasScopes && (
                <SelectField label="Scope" value={mergedFields.scope || ''}
                  onChange={(v) => handleFormChange('scope', v)} options={meta.scopes} />
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
              <div>
                <label style={labelStyle}>Due Date</label>
                <input type="date" value={mergedFields.due || ''}
                  onChange={(e) => handleFormChange('due', e.target.value)} style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Points</label>
                <input type="number" min="0" value={mergedFields.points ?? ''}
                  onChange={(e) => handleFormChange('points', e.target.value === '' ? undefined : Number(e.target.value))}
                  placeholder="0" style={fieldStyle} />
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
