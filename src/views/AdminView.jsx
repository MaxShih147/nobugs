import { useState, useEffect, useRef, useCallback } from 'react';
import { T, glass } from '../styles/tokens';
import { Card } from '../components/ui';
import { fetchMembers, saveMembers } from '../lib/api';

const fieldStyle = {
  width: '100%', padding: '10px 14px',
  background: 'rgba(255, 255, 255, 0.03)',
  border: `1px solid ${T.border}`, borderRadius: T.radius,
  color: T.text, fontSize: '13px', fontFamily: T.fontSans, outline: 'none',
  boxSizing: 'border-box', transition: `all 0.25s ${T.ease}`,
};

const labelStyle = {
  fontSize: '11px', fontWeight: 500, color: T.textDim,
  fontFamily: T.fontSans, textTransform: 'uppercase', letterSpacing: '1px',
};

function MemberRow({ name, initialEmail, idx, total, onEmailChange }) {
  const [email, setEmail] = useState(initialEmail);
  const [focused, setFocused] = useState(false);

  const handleChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    onEmailChange(name, val);
  };

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr 80px', alignItems: 'center',
      padding: '12px 22px',
      borderBottom: idx < total - 1 ? `1px solid ${T.border}` : 'none',
      transition: `background 0.25s ${T.ease}`,
    }}>
      <span style={{ fontSize: '14px', color: T.text, fontFamily: T.fontSans, fontWeight: 500 }}>{name}</span>
      <input
        type="text"
        autoComplete="one-time-code"
        readOnly={!focused}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        value={email}
        onChange={handleChange}
        placeholder="email@example.com"
        style={{ ...fieldStyle, padding: '8px 12px', cursor: focused ? 'text' : 'pointer' }}
      />
      <div style={{ textAlign: 'center' }}>
        {email.trim() ? (
          <span style={{
            display: 'inline-block', padding: '3px 10px', borderRadius: T.radiusSm,
            fontSize: '11px', fontFamily: T.fontSans, fontWeight: 600,
            background: T.doneSoft, color: T.done,
          }}>Mapped</span>
        ) : (
          <span style={{
            display: 'inline-block', padding: '3px 10px', borderRadius: T.radiusSm,
            fontSize: '11px', fontFamily: T.fontSans,
            background: 'rgba(255, 255, 255, 0.03)', color: T.textDim,
          }}>--</span>
        )}
      </div>
    </div>
  );
}

export default function AdminView({ user }) {
  const emailsRef = useRef({});
  const [names, setNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [mappedCount, setMappedCount] = useState(0);

  useEffect(() => {
    fetchMembers()
      .then((data) => {
        const saved = data.mappings || [];
        const discovered = data.discoveredNames || [];
        const nameSet = new Set(discovered);
        const emailMap = {};
        saved.forEach((m) => {
          emailMap[m.notionName] = m.email || '';
          nameSet.add(m.notionName);
        });
        emailsRef.current = emailMap;
        setNames([...nameSet].sort());
        setMappedCount(Object.values(emailMap).filter((e) => e.trim()).length);
        if (data.updatedAt) setLastSaved({ at: data.updatedAt, by: data.updatedBy });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleEmailChange = useCallback((name, email) => {
    emailsRef.current[name] = email;
    setMappedCount(Object.values(emailsRef.current).filter((e) => e.trim()).length);
    setSuccess(null);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const mappings = Object.entries(emailsRef.current)
        .filter(([, email]) => email.trim())
        .map(([notionName, email]) => ({ notionName, email: email.trim() }));
      const result = await saveMembers(mappings, names);
      setSuccess('Mappings saved successfully');
      setLastSaved({ at: result.updatedAt, by: result.updatedBy });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: T.textDim, fontFamily: T.fontSans }}>
        Loading members...
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ padding: '32px', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, fontFamily: T.fontSans, color: T.text, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
            Admin Panel
          </h2>
          <p style={{ fontSize: '13px', color: T.textDim, fontFamily: T.fontSans, margin: 0 }}>
            Map team member emails to their Notion display names.
          </p>
        </div>
        <button onClick={handleSave} disabled={saving} style={{
          padding: '9px 22px', borderRadius: T.radiusSm, border: 'none',
          background: saving ? T.border : `linear-gradient(135deg, ${T.accent}, #6366f1)`,
          color: '#fff', fontSize: '13px', fontWeight: 600,
          cursor: saving ? 'default' : 'pointer', fontFamily: T.fontSans,
          boxShadow: saving ? 'none' : T.accentGlow,
          transition: `all 0.25s ${T.ease}`,
        }}>{saving ? 'Saving...' : 'Save Mappings'}</button>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: T.radius, marginBottom: 16,
          background: T.criticalSoft, border: '1px solid rgba(244, 113, 113, 0.2)',
          color: T.critical, fontSize: '13px', fontFamily: T.fontSans,
        }}>{error}</div>
      )}
      {success && (
        <div style={{
          padding: '12px 16px', borderRadius: T.radius, marginBottom: 16,
          background: T.doneSoft, border: '1px solid rgba(125, 216, 149, 0.2)',
          color: T.done, fontSize: '13px', fontFamily: T.fontSans,
        }}>{success}</div>
      )}

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 80px',
          padding: '14px 22px', borderBottom: `1px solid ${T.border}`,
          background: 'rgba(255, 255, 255, 0.02)',
        }}>
          <span style={labelStyle}>Notion Name</span>
          <span style={labelStyle}>Email</span>
          <span style={{ ...labelStyle, textAlign: 'center' }}>Status</span>
        </div>

        {names.length === 0 && (
          <div style={{ padding: '40px 22px', textAlign: 'center', color: T.textDim, fontSize: '13px', fontFamily: T.fontSans }}>
            No member names discovered yet. Bug data will populate this list.
          </div>
        )}

        {names.map((name, idx) => (
          <MemberRow
            key={name}
            name={name}
            initialEmail={emailsRef.current[name] || ''}
            idx={idx}
            total={names.length}
            onEmailChange={handleEmailChange}
          />
        ))}
      </Card>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 16, fontSize: '12px', color: T.textDim, fontFamily: T.fontSans,
      }}>
        <span>{mappedCount} of {names.length} members mapped</span>
        {lastSaved && (
          <span>Last saved: {new Date(lastSaved.at).toLocaleString()} by {lastSaved.by}</span>
        )}
      </div>
    </div>
  );
}
