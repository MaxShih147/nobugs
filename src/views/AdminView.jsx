import { useState, useEffect } from 'react';
import { T } from '../styles/tokens';
import { Card } from '../components/ui';
import { fetchMembers, saveMembers } from '../lib/api';

const fieldStyle = {
  width: '100%', padding: '10px 12px', background: T.bg,
  border: `1px solid ${T.border}`, borderRadius: T.radius,
  color: T.text, fontSize: '13px', fontFamily: T.fontSans, outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  fontSize: '12px', fontWeight: 600, color: T.textDim,
  fontFamily: T.font, textTransform: 'uppercase', letterSpacing: '0.5px',
};

export default function AdminView({ user }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);

  useEffect(() => {
    fetchMembers()
      .then((data) => {
        const saved = data.mappings || [];
        const discovered = data.discoveredNames || [];
        // Merge: start with discovered names, fill in saved emails
        const merged = discovered.map((name) => {
          const existing = saved.find(
            (m) => m.notionName.toLowerCase() === name.toLowerCase()
          );
          return { notionName: name, email: existing?.email || '' };
        });
        // Add any saved mappings for names not in discovered (edge case)
        saved.forEach((m) => {
          if (!merged.some((r) => r.notionName.toLowerCase() === m.notionName.toLowerCase())) {
            merged.push({ notionName: m.notionName, email: m.email || '' });
          }
        });
        setRows(merged);
        if (data.updatedAt) setLastSaved({ at: data.updatedAt, by: data.updatedBy });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const updateEmail = (idx, email) => {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, email } : r));
    setSuccess(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const mappings = rows
        .filter((r) => r.email.trim())
        .map((r) => ({ notionName: r.notionName, email: r.email.trim() }));
      const result = await saveMembers(mappings);
      setSuccess('Mappings saved successfully');
      setLastSaved({ at: result.updatedAt, by: result.updatedBy });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const mappedCount = rows.filter((r) => r.email.trim()).length;

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: T.textDim, fontFamily: T.font }}>
        Loading members...
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, fontFamily: T.font, color: T.text, margin: '0 0 4px' }}>
            Admin Panel
          </h2>
          <p style={{ fontSize: '13px', color: T.textDim, fontFamily: T.fontSans, margin: 0 }}>
            Map team member emails to their Notion display names.
          </p>
        </div>
        <button onClick={handleSave} disabled={saving} style={{
          padding: '8px 20px', borderRadius: '6px', border: 'none',
          background: saving ? T.border : T.accent, color: '#fff',
          fontSize: '13px', fontWeight: 600, cursor: saving ? 'default' : 'pointer',
          fontFamily: T.fontSans,
        }}>{saving ? 'Saving...' : 'Save Mappings'}</button>
      </div>

      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: T.radius, marginBottom: 16,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: T.critical, fontSize: '13px', fontFamily: T.fontSans,
        }}>{error}</div>
      )}
      {success && (
        <div style={{
          padding: '10px 14px', borderRadius: T.radius, marginBottom: 16,
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
          color: '#22c55e', fontSize: '13px', fontFamily: T.fontSans,
        }}>{success}</div>
      )}

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 80px',
          padding: '12px 20px', borderBottom: `1px solid ${T.border}`,
          background: T.bg,
        }}>
          <span style={labelStyle}>Notion Name</span>
          <span style={labelStyle}>Email</span>
          <span style={{ ...labelStyle, textAlign: 'center' }}>Status</span>
        </div>

        {rows.length === 0 && (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: T.textDim, fontSize: '13px', fontFamily: T.fontSans }}>
            No member names discovered yet. Bug data will populate this list.
          </div>
        )}

        {rows.map((row, idx) => (
          <div key={row.notionName} style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 80px', alignItems: 'center',
            padding: '10px 20px',
            borderBottom: idx < rows.length - 1 ? `1px solid ${T.border}` : 'none',
          }}>
            <span style={{ fontSize: '14px', color: T.text, fontFamily: T.fontSans }}>{row.notionName}</span>
            <input
              type="email"
              value={row.email}
              onChange={(e) => updateEmail(idx, e.target.value)}
              placeholder="email@example.com"
              style={{ ...fieldStyle, padding: '8px 10px' }}
            />
            <div style={{ textAlign: 'center' }}>
              {row.email.trim() ? (
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: '10px',
                  fontSize: '11px', fontFamily: T.fontSans, fontWeight: 600,
                  background: 'rgba(34,197,94,0.15)', color: '#22c55e',
                }}>Mapped</span>
              ) : (
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: '10px',
                  fontSize: '11px', fontFamily: T.fontSans,
                  background: 'rgba(255,255,255,0.05)', color: T.textDim,
                }}>--</span>
              )}
            </div>
          </div>
        ))}
      </Card>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 16, fontSize: '12px', color: T.textDim, fontFamily: T.fontSans,
      }}>
        <span>{mappedCount} of {rows.length} members mapped</span>
        {lastSaved && (
          <span>Last saved: {new Date(lastSaved.at).toLocaleString()} by {lastSaved.by}</span>
        )}
      </div>
    </div>
  );
}
