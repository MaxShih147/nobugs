import { useState } from 'react';
import { T } from '../styles/tokens';
import { Card } from '../components/ui';

const fieldStyle = {
  width: '100%', padding: '10px 12px', background: T.bg,
  border: `1px solid ${T.border}`, borderRadius: T.radius,
  color: T.text, fontSize: '13px', fontFamily: T.fontSans, outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  fontSize: '12px', fontWeight: 600, color: T.textDim,
  fontFamily: T.font, textTransform: 'uppercase', letterSpacing: '0.5px',
  marginBottom: 6, display: 'block',
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

const INITIAL = {
  title: '',
  status: '',
  priority: '',
  type: '',
  scope: '',
  size: '',
  sprint: '',
  points: '',
  due: '',
  assignee: '',
  project: '',
  tags: [],
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
    <div style={{ padding: '32px', maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, fontFamily: T.font, color: T.text, margin: 0 }}>
          New Bug
        </h2>
        <button onClick={onCancel} style={{
          padding: '6px 14px', borderRadius: '6px', border: `1px solid ${T.border}`,
          background: 'transparent', color: T.textDim, fontSize: '13px',
          cursor: 'pointer', fontFamily: T.fontSans,
        }}>Cancel</button>
      </div>

      <Card style={{ padding: 24 }}>
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
              <input type="date" value={form.due} onChange={(e) => set('due')(e.target.value)} style={fieldStyle} />
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
            width: '100%', padding: '12px', borderRadius: T.radius, border: 'none',
            background: submitting ? T.border : T.accent, color: '#fff',
            fontSize: '14px', fontWeight: 600, cursor: submitting ? 'default' : 'pointer',
            fontFamily: T.fontSans,
          }}>{submitting ? 'Creating...' : 'Create Bug'}</button>
        </form>
      </Card>
    </div>
  );
}
