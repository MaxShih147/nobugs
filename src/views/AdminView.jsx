import { useState, useEffect, useRef, useCallback } from 'react';
import { T, glass } from '../styles/tokens';
import { Card } from '../components/ui';
import { fetchMembers, saveMembers, fetchDatabases, addDatabase, updateDatabase, removeDatabaseApi, fetchDatabaseProperties } from '../lib/api';

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

const APP_FIELDS = [
  { key: 'title', label: 'Title', required: true },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'sprint', label: 'Sprint' },
  { key: 'due', label: 'Due Date' },
  { key: 'type', label: 'Type' },
  { key: 'scope', label: 'Scope' },
  { key: 'size', label: 'Size' },
  { key: 'points', label: 'Points' },
  { key: 'parent', label: 'Parent Item' },
];

// ─── Database Management ────────────────────────────────────────────────────

function DatabaseSection({ user, onDatabasesChanged }) {
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const loadDatabases = useCallback(async () => {
    try {
      const result = await fetchDatabases();
      setDatabases(result.databases || []);
    } catch (err) {
      console.error('[AdminView] fetchDatabases error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDatabases(); }, [loadDatabases]);

  const handleDelete = async (dbId) => {
    if (!confirm('Remove this database configuration?')) return;
    try {
      await removeDatabaseApi(dbId);
      setDatabases((prev) => prev.filter((d) => d.id !== dbId));
      setSuccess('Database removed');
      if (onDatabasesChanged) onDatabasesChanged();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaved = (entry) => {
    setDatabases((prev) => {
      const idx = prev.findIndex((d) => d.id === entry.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = entry;
        return next;
      }
      return [...prev, entry];
    });
    setShowAdd(false);
    setEditingId(null);
    setSuccess('Database saved');
    if (onDatabasesChanged) onDatabasesChanged();
    setTimeout(() => setSuccess(null), 3000);
  };

  if (loading) {
    return <div style={{ padding: 16, color: T.textDim, fontSize: '13px', fontFamily: T.fontSans }}>Loading databases...</div>;
  }

  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, fontFamily: T.fontSans, color: T.text, margin: '0 0 4px' }}>
            Databases
          </h3>
          <p style={{ fontSize: '12px', color: T.textDim, fontFamily: T.fontSans, margin: 0 }}>
            Connect multiple Notion databases and map their properties.
          </p>
        </div>
        {!showAdd && (
          <button onClick={() => setShowAdd(true)} style={{
            padding: '7px 16px', borderRadius: T.radiusSm, border: 'none',
            background: `linear-gradient(135deg, ${T.accent}, #6366f1)`,
            color: '#fff', fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', fontFamily: T.fontSans,
            boxShadow: T.accentGlow, transition: `all 0.25s ${T.ease}`,
          }}>Add Database</button>
        )}
      </div>

      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: T.radius, marginBottom: 12,
          background: T.criticalSoft, border: '1px solid rgba(244, 113, 113, 0.2)',
          color: T.critical, fontSize: '12px', fontFamily: T.fontSans,
        }}>{error}</div>
      )}
      {success && (
        <div style={{
          padding: '10px 14px', borderRadius: T.radius, marginBottom: 12,
          background: T.doneSoft, border: '1px solid rgba(125, 216, 149, 0.2)',
          color: T.done, fontSize: '12px', fontFamily: T.fontSans,
        }}>{success}</div>
      )}

      {showAdd && (
        <Card style={{ marginBottom: 16, padding: 20 }}>
          <DatabaseForm onSave={handleSaved} onCancel={() => setShowAdd(false)} user={user} />
        </Card>
      )}

      {databases.map((db) => (
        <Card key={db.id} style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}>
          {editingId === db.id ? (
            <div style={{ padding: 20 }}>
              <DatabaseForm db={db} onSave={handleSaved} onCancel={() => setEditingId(null)} user={user} />
            </div>
          ) : (
            <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: T.text, fontFamily: T.fontSans }}>{db.name}</div>
                <div style={{ fontSize: '11px', color: T.textDim, fontFamily: T.fontSans, marginTop: 2 }}>
                  {db.id.slice(0, 8)}... · {Object.values(db.propMap || {}).filter(Boolean).length} fields mapped
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEditingId(db.id)} style={{
                  padding: '5px 12px', borderRadius: T.radiusSm, border: `1px solid ${T.border}`,
                  background: 'transparent', color: T.textDim, fontSize: '11px',
                  cursor: 'pointer', fontFamily: T.fontSans, fontWeight: 500,
                  transition: `all 0.25s ${T.ease}`,
                }}>Edit Mapping</button>
                <button onClick={() => handleDelete(db.id)} style={{
                  padding: '5px 12px', borderRadius: T.radiusSm, border: `1px solid rgba(244, 113, 113, 0.2)`,
                  background: 'transparent', color: T.critical, fontSize: '11px',
                  cursor: 'pointer', fontFamily: T.fontSans, fontWeight: 500,
                  transition: `all 0.25s ${T.ease}`,
                }}>Remove</button>
              </div>
            </div>
          )}
        </Card>
      ))}

      {databases.length === 0 && !showAdd && (
        <Card style={{ padding: '32px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: T.textDim, fontFamily: T.fontSans }}>
            No databases configured. Click "Add Database" to connect a Notion database.
          </div>
        </Card>
      )}
    </div>
  );
}

function DatabaseForm({ db, onSave, onCancel, user }) {
  const [name, setName] = useState(db?.name || '');
  const [dbId, setDbId] = useState(db?.id || '');
  const [propMap, setPropMap] = useState(db?.propMap || {});
  const [notionProps, setNotionProps] = useState(null);
  const [fetchingProps, setFetchingProps] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const isEdit = !!db;

  const handleFetchProps = async () => {
    if (!dbId.trim()) return;
    setFetchingProps(true);
    setError(null);
    try {
      const result = await fetchDatabaseProperties(dbId.trim());
      setNotionProps(result.properties);
      if (!name && result.title) setName(result.title);
    } catch (err) {
      setError(err.message);
    } finally {
      setFetchingProps(false);
    }
  };

  // Auto-fetch properties for existing databases
  useEffect(() => {
    if (isEdit && dbId) handleFetchProps();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!dbId.trim() || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      let entry;
      if (isEdit) {
        entry = await updateDatabase(dbId, { name, propMap });
      } else {
        entry = await addDatabase({ id: dbId.trim(), name, propMap });
      }
      onSave(entry);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePropChange = (fieldKey, notionPropName) => {
    setPropMap((prev) => ({ ...prev, [fieldKey]: notionPropName }));
  };

  const propNames = notionProps ? Object.keys(notionProps).sort() : [];

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={{ ...labelStyle, display: 'block', marginBottom: 6 }}>Database Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Product Backlog" style={fieldStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ ...labelStyle, display: 'block', marginBottom: 6 }}>Notion Database ID</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={dbId}
              onChange={(e) => setDbId(e.target.value)}
              placeholder="3066cb2b963780aa..."
              disabled={isEdit}
              style={{ ...fieldStyle, flex: 1, opacity: isEdit ? 0.5 : 1 }}
            />
            {!isEdit && (
              <button onClick={handleFetchProps} disabled={fetchingProps || !dbId.trim()} style={{
                padding: '10px 14px', borderRadius: T.radius, border: `1px solid ${T.border}`,
                background: 'rgba(255, 255, 255, 0.04)', color: T.text, fontSize: '12px',
                cursor: fetchingProps ? 'wait' : 'pointer', fontFamily: T.fontSans,
                whiteSpace: 'nowrap', transition: `all 0.25s ${T.ease}`,
              }}>{fetchingProps ? 'Fetching...' : 'Fetch Properties'}</button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: T.radius, marginBottom: 12,
          background: T.criticalSoft, border: '1px solid rgba(244, 113, 113, 0.2)',
          color: T.critical, fontSize: '12px', fontFamily: T.fontSans,
        }}>{error}</div>
      )}

      {notionProps && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ ...labelStyle, display: 'block', marginBottom: 10 }}>Property Mapping</label>
          <div style={{
            ...glass, borderRadius: T.radius, overflow: 'hidden',
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '140px 1fr 120px',
              padding: '10px 16px', borderBottom: `1px solid ${T.border}`,
              background: 'rgba(255, 255, 255, 0.02)',
            }}>
              <span style={labelStyle}>App Field</span>
              <span style={labelStyle}>Notion Property</span>
              <span style={{ ...labelStyle, textAlign: 'center' }}>Type</span>
            </div>
            {APP_FIELDS.map((field) => {
              const selectedProp = propMap[field.key] || '';
              const propInfo = selectedProp && notionProps[selectedProp];
              return (
                <div key={field.key} style={{
                  display: 'grid', gridTemplateColumns: '140px 1fr 120px', alignItems: 'center',
                  padding: '10px 16px', borderBottom: `1px solid ${T.border}`,
                }}>
                  <span style={{ fontSize: '13px', color: T.text, fontFamily: T.fontSans, fontWeight: 500 }}>
                    {field.label}{field.required ? ' *' : ''}
                  </span>
                  <select
                    value={selectedProp}
                    onChange={(e) => handlePropChange(field.key, e.target.value)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)', border: `1px solid ${T.border}`,
                      borderRadius: T.radiusSm, padding: '7px 10px', color: selectedProp ? T.text : T.textDim,
                      fontSize: '12px', fontFamily: T.fontSans, outline: 'none', cursor: 'pointer',
                    }}
                  >
                    <option value="">-- not mapped --</option>
                    {propNames.map((pn) => (
                      <option key={pn} value={pn}>{pn}</option>
                    ))}
                  </select>
                  <span style={{ textAlign: 'center', fontSize: '11px', color: T.textDim, fontFamily: T.fontSans }}>
                    {propInfo ? propInfo.type : '--'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{
          padding: '8px 18px', borderRadius: T.radiusSm, border: `1px solid ${T.border}`,
          background: 'transparent', color: T.textDim, fontSize: '12px',
          cursor: 'pointer', fontFamily: T.fontSans, fontWeight: 500,
        }}>Cancel</button>
        <button onClick={handleSave} disabled={saving || !name.trim() || !dbId.trim()} style={{
          padding: '8px 18px', borderRadius: T.radiusSm, border: 'none',
          background: saving ? T.border : `linear-gradient(135deg, ${T.accent}, #6366f1)`,
          color: '#fff', fontSize: '12px', fontWeight: 600,
          cursor: saving ? 'default' : 'pointer', fontFamily: T.fontSans,
          boxShadow: saving ? 'none' : T.accentGlow,
          transition: `all 0.25s ${T.ease}`,
        }}>{saving ? 'Saving...' : (isEdit ? 'Update Mapping' : 'Add Database')}</button>
      </div>
    </div>
  );
}

// ─── Member Mappings ────────────────────────────────────────────────────────

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

function MemberSection({ user }) {
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
    return <div style={{ padding: 16, color: T.textDim, fontSize: '13px', fontFamily: T.fontSans }}>Loading members...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, fontFamily: T.fontSans, color: T.text, margin: '0 0 4px' }}>
            Member Mappings
          </h3>
          <p style={{ fontSize: '12px', color: T.textDim, fontFamily: T.fontSans, margin: 0 }}>
            Map team member emails to their Notion display names.
          </p>
        </div>
        <button onClick={handleSave} disabled={saving} style={{
          padding: '7px 16px', borderRadius: T.radiusSm, border: 'none',
          background: saving ? T.border : `linear-gradient(135deg, ${T.accent}, #6366f1)`,
          color: '#fff', fontSize: '12px', fontWeight: 600,
          cursor: saving ? 'default' : 'pointer', fontFamily: T.fontSans,
          boxShadow: saving ? 'none' : T.accentGlow,
          transition: `all 0.25s ${T.ease}`,
        }}>{saving ? 'Saving...' : 'Save Mappings'}</button>
      </div>

      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: T.radius, marginBottom: 12,
          background: T.criticalSoft, border: '1px solid rgba(244, 113, 113, 0.2)',
          color: T.critical, fontSize: '12px', fontFamily: T.fontSans,
        }}>{error}</div>
      )}
      {success && (
        <div style={{
          padding: '10px 14px', borderRadius: T.radius, marginBottom: 12,
          background: T.doneSoft, border: '1px solid rgba(125, 216, 149, 0.2)',
          color: T.done, fontSize: '12px', fontFamily: T.fontSans,
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
        marginTop: 12, fontSize: '11px', color: T.textDim, fontFamily: T.fontSans,
      }}>
        <span>{mappedCount} of {names.length} members mapped</span>
        {lastSaved && (
          <span>Last saved: {new Date(lastSaved.at).toLocaleString()} by {lastSaved.by}</span>
        )}
      </div>
    </div>
  );
}

// ─── Admin View ─────────────────────────────────────────────────────────────

export default function AdminView({ user, onDatabasesChanged }) {
  return (
    <div className="fade-in" style={{ padding: '32px', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, fontFamily: T.fontSans, color: T.text, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
          Admin Panel
        </h2>
        <p style={{ fontSize: '13px', color: T.textDim, fontFamily: T.fontSans, margin: 0 }}>
          Manage databases, property mappings, and team members.
        </p>
      </div>

      <DatabaseSection user={user} onDatabasesChanged={onDatabasesChanged} />
      <MemberSection user={user} />
    </div>
  );
}
