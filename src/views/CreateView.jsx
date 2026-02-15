import { useState, useRef } from 'react';
import { T, glass } from '../styles/tokens';
import { Card } from '../components/ui';

const fieldStyle = {
  width: '100%', padding: '12px 16px',
  background: 'rgba(255, 255, 255, 0.03)',
  border: `1px solid ${T.border}`, borderRadius: T.radius,
  color: T.text, fontSize: '13px', fontFamily: T.fontSans, outline: 'none',
  boxSizing: 'border-box', transition: `all 0.25s ${T.ease}`,
};

const labelStyle = {
  fontSize: '11px', fontWeight: 500, color: T.textDim,
  fontFamily: T.fontSans, textTransform: 'uppercase', letterSpacing: '1px',
  marginBottom: 8, display: 'block',
};

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder }) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...fieldStyle, cursor: 'pointer' }}>
        <option value="">{placeholder || `Select ${label}...`}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
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
    ...fieldStyle,
    width: 'auto', textAlign: 'center', padding: '12px 8px',
  };

  const numOnly = (v) => v.replace(/\D/g, '');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <input ref={yRef} value={yyyy} placeholder="YYYY" maxLength={4} inputMode="numeric"
        style={{ ...segStyle, flex: '0 0 60px' }}
        onChange={(e) => { const v = numOnly(e.target.value); setYyyy(v); emit(v, mm, dd); if (v.length === 4) mRef.current?.focus(); }}
      />
      <span style={{ color: T.textDim, fontSize: '14px' }}>/</span>
      <input ref={mRef} value={mm} placeholder="MM" maxLength={2} inputMode="numeric"
        style={{ ...segStyle, flex: '0 0 44px' }}
        onChange={(e) => { const v = numOnly(e.target.value); setMm(v); emit(yyyy, v, dd); if (v.length === 2) dRef.current?.focus(); }}
        onKeyDown={(e) => { if (e.key === 'Backspace' && !mm) yRef.current?.focus(); }}
      />
      <span style={{ color: T.textDim, fontSize: '14px' }}>/</span>
      <input ref={dRef} value={dd} placeholder="DD" maxLength={2} inputMode="numeric"
        style={{ ...segStyle, flex: '0 0 44px' }}
        onChange={(e) => { const v = numOnly(e.target.value); setDd(v); emit(yyyy, mm, v); }}
        onKeyDown={(e) => { if (e.key === 'Backspace' && !dd) mRef.current?.focus(); }}
      />
    </div>
  );
}

const INITIAL = {
  title: '', status: '', priority: '', type: '', scope: '',
  size: '', sprint: '', points: '', due: '', assignee: '',
  project: '', tags: [],
};

export default function CreateView({ meta, onCreate, onCancel }) {
  const [form, setForm] = useState(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const data = { ...form };
      if (data.points !== '') data.points = Number(data.points);
      else delete data.points;
      Object.keys(data).forEach((k) => { if (data[k] === '' || (Array.isArray(data[k]) && data[k].length === 0)) delete data[k]; });
      await onCreate(data);
      onCancel();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const hasStatuses = meta.statuses?.length > 0;
  const hasPriorities = meta.priorities?.length > 0;
  const hasTypes = meta.types?.length > 0;
  const hasScopes = meta.scopes?.length > 0;
  const hasSizes = meta.sizes?.length > 0;
  const hasSprints = meta.sprints?.length > 0;
  const hasMembers = meta.members?.length > 0;
  const hasProjects = meta.projects?.length > 0;

  return (
    <div className="fade-in" style={{ padding: '32px', maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, fontFamily: T.fontSans, color: T.text, margin: 0, letterSpacing: '-0.5px' }}>
          New Bug
        </h2>
        <button onClick={onCancel} style={{
          padding: '7px 16px', borderRadius: T.radiusSm, border: `1px solid ${T.border}`,
          background: 'transparent', color: T.textDim, fontSize: '13px',
          cursor: 'pointer', fontFamily: T.fontSans, fontWeight: 500,
          transition: `all 0.25s ${T.ease}`,
        }}>Cancel</button>
      </div>

      <Card style={{ padding: 28 }}>
        <form onSubmit={handleSubmit}>
          <Field label="Title">
            <input value={form.title} onChange={(e) => set('title')(e.target.value)}
              placeholder="Describe the bug..." style={fieldStyle} autoFocus />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {hasStatuses && <SelectField label="Status" value={form.status} onChange={set('status')} options={meta.statuses} />}
            {hasPriorities && <SelectField label="Priority" value={form.priority} onChange={set('priority')} options={meta.priorities} />}
            {hasTypes && <SelectField label="Type" value={form.type} onChange={set('type')} options={meta.types} />}
            {hasScopes && <SelectField label="Scope" value={form.scope} onChange={set('scope')} options={meta.scopes} />}
            {hasSizes && <SelectField label="Size" value={form.size} onChange={set('size')} options={meta.sizes} />}
            {hasSprints && <SelectField label="Sprint" value={form.sprint} onChange={set('sprint')} options={meta.sprints} />}
            {hasMembers && <SelectField label="Assignee" value={form.assignee} onChange={set('assignee')} options={meta.members} />}
            {hasProjects && <SelectField label="Project" value={form.project} onChange={set('project')} options={meta.projects} />}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Due Date">
              <DateInput value={form.due} onChange={set('due')} />
            </Field>
            <Field label="Points">
              <input type="number" min="0" value={form.points} onChange={(e) => set('points')(e.target.value)}
                placeholder="0" style={fieldStyle} />
            </Field>
          </div>

          {error && (
            <div style={{ color: T.critical, fontSize: '13px', marginBottom: 16, fontFamily: T.fontSans }}>{error}</div>
          )}

          <button type="submit" disabled={submitting} style={{
            width: '100%', padding: '13px', borderRadius: T.radius, border: 'none',
            background: submitting ? T.border : `linear-gradient(135deg, ${T.accent}, #6366f1)`,
            color: '#fff', fontSize: '14px', fontWeight: 600,
            cursor: submitting ? 'default' : 'pointer', fontFamily: T.fontSans,
            boxShadow: submitting ? 'none' : T.accentGlow,
            transition: `all 0.25s ${T.ease}`,
          }}>{submitting ? 'Creating...' : 'Create Bug'}</button>
        </form>
      </Card>
    </div>
  );
}
