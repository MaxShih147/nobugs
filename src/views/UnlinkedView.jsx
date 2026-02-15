import { useState, useMemo } from 'react';
import { T, glass, statusColor, priorityColor, typeColor, scopeColor } from '../styles/tokens';
import { StatCard, Card, Badge } from '../components/ui';
import { suggest } from '../lib/suggestions';

function ScopeLabel({ scope }) {
  if (!scope) return null;
  const display = scope.charAt(0).toUpperCase() + scope.slice(1).toLowerCase();
  return <Badge color={scopeColor(scope)} bg={`${scopeColor(scope)}18`}>{display}</Badge>;
}

function TypeLabel({ type }) {
  if (!type) return null;
  const display = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  return <Badge color={typeColor(type)} bg={`${typeColor(type)}18`}>{display}</Badge>;
}

function SuggestionChip({ suggestion, onAttach }) {
  const [hover, setHover] = useState(false);
  const scopeDisplay = suggestion.targetScope
    ? suggestion.targetScope.charAt(0).toUpperCase() + suggestion.targetScope.slice(1).toLowerCase()
    : '';
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onAttach(suggestion); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: T.radiusSm,
        border: `1px solid ${hover ? T.accent + '60' : T.border}`,
        background: hover ? T.accentSoft : 'rgba(255,255,255,0.02)',
        color: hover ? T.accent : T.textDim, fontSize: '11px',
        fontFamily: T.fontSans, cursor: 'pointer', fontWeight: 500,
        transition: `all 0.2s ${T.ease}`, maxWidth: 200,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}
    >
      {scopeDisplay && <span style={{ color: scopeColor(suggestion.targetScope), fontSize: '10px', fontWeight: 600 }}>{scopeDisplay}</span>}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{suggestion.targetTitle}</span>
      <span style={{ color: T.accent, flexShrink: 0 }}>+</span>
    </button>
  );
}

function AttachPickerModal({ allBugs, onAttach, onClose }) {
  const [search, setSearch] = useState('');
  const candidates = useMemo(() => {
    const parents = allBugs.filter((b) => ['epic', 'story'].includes((b.scope || '').toLowerCase()));
    if (!search) return parents.slice(0, 20);
    const q = search.toLowerCase();
    return parents.filter((b) => b.title.toLowerCase().includes(q) || b.id.toLowerCase().includes(q)).slice(0, 20);
  }, [allBugs, search]);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      backdropFilter: 'blur(4px)',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        ...glass, borderRadius: T.radiusLg, padding: '24px',
        width: 480, maxHeight: '70vh', display: 'flex', flexDirection: 'column',
        background: T.surfaceSolid, boxShadow: T.shadowLg,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: '15px', fontWeight: 600, fontFamily: T.fontSans, color: T.text }}>Link to Parent</span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: T.textDim, cursor: 'pointer',
            fontSize: '18px', fontFamily: T.fontSans, padding: '4px 8px',
          }}>x</button>
        </div>
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search epics & stories..." autoFocus
          style={{
            background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`,
            borderRadius: T.radiusSm, padding: '10px 14px', color: T.text,
            fontSize: '13px', fontFamily: T.fontSans, outline: 'none',
            marginBottom: 12, transition: `all 0.25s ${T.ease}`,
          }}
        />
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {candidates.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: T.textDim, fontSize: '13px', fontFamily: T.fontSans }}>
              No matching epics or stories found
            </div>
          )}
          {candidates.map((c) => (
            <CandidateRow key={c.id} bug={c} onSelect={() => onAttach(c)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CandidateRow({ bug, onSelect }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
        borderRadius: T.radiusSm, cursor: 'pointer',
        background: hover ? 'rgba(139,124,246,0.06)' : 'transparent',
        transition: `all 0.2s ${T.ease}`,
      }}
    >
      <span style={{ fontFamily: T.font, fontSize: '11px', color: T.textDim, flexShrink: 0 }}>{bug.id}</span>
      <ScopeLabel scope={bug.scope} />
      <span style={{ fontSize: '13px', fontFamily: T.fontSans, fontWeight: 500, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bug.title}</span>
    </div>
  );
}

function LocalSelect({ value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{
      background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`,
      borderRadius: T.radiusSm, padding: '6px 10px', color: T.text,
      fontSize: '12px', fontFamily: T.fontSans, outline: 'none', cursor: 'pointer',
    }}>
      <option value="All">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export default function UnlinkedView({ bugs, allBugs, meta, onSelect, updateBug }) {
  const [filterType, setFilterType] = useState('All');
  const [filterScope, setFilterScope] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortBy, setSortBy] = useState('priority');
  const [pickerBug, setPickerBug] = useState(null);
  const [linking, setLinking] = useState({});

  const unlinkedBugs = useMemo(
    () => allBugs.filter((b) => !b.parentNotionId),
    [allBugs]
  );

  const types = useMemo(() => [...new Set(unlinkedBugs.map((b) => b.type).filter(Boolean))], [unlinkedBugs]);
  const scopes = useMemo(() => [...new Set(unlinkedBugs.map((b) => b.scope).filter(Boolean))], [unlinkedBugs]);
  const statuses = useMemo(() => [...new Set(unlinkedBugs.map((b) => b.status).filter(Boolean))], [unlinkedBugs]);

  const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
  const filtered = useMemo(() => {
    let result = unlinkedBugs;
    if (filterType !== 'All') result = result.filter((b) => b.type === filterType);
    if (filterScope !== 'All') result = result.filter((b) => b.scope === filterScope);
    if (filterStatus !== 'All') result = result.filter((b) => b.status === filterStatus);
    if (sortBy === 'priority') {
      result = [...result].sort((a, b) => (PRIORITY_ORDER[a.priority?.toLowerCase()] ?? 9) - (PRIORITY_ORDER[b.priority?.toLowerCase()] ?? 9));
    } else if (sortBy === 'created') {
      result = [...result].sort((a, b) => (b.created || '').localeCompare(a.created || ''));
    }
    return result;
  }, [unlinkedBugs, filterType, filterScope, filterStatus, sortBy]);

  const bugCount = unlinkedBugs.filter((b) => (b.type || '').toLowerCase() === 'bug').length;
  const featureCount = unlinkedBugs.filter((b) => (b.type || '').toLowerCase() === 'feature').length;
  const improveCount = unlinkedBugs.filter((b) => (b.type || '').toLowerCase() === 'improve').length;

  const handleAttach = async (bug, parentId, parentNotionId) => {
    setLinking((prev) => ({ ...prev, [bug.id]: true }));
    try {
      await updateBug(bug.notionId || bug.id, { parentNotionId: parentNotionId || parentId });
    } catch (err) {
      console.error('Failed to link:', err);
    } finally {
      setLinking((prev) => { const next = { ...prev }; delete next[bug.id]; return next; });
    }
  };

  const handleSuggestionAttach = (bug, suggestion) => {
    handleAttach(bug, suggestion.targetId, suggestion.targetNotionId);
  };

  const handlePickerAttach = (parent) => {
    if (pickerBug) {
      handleAttach(pickerBug, parent.id, parent.notionId || parent.id);
      setPickerBug(null);
    }
  };

  return (
    <div className="fade-in" style={{ padding: 32 }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <StatCard label="Unlinked" value={unlinkedBugs.length} color={T.accent} sub="items without parent" />
        <StatCard label="Bug" value={bugCount} color={typeColor('bug')} />
        <StatCard label="Feature" value={featureCount} color={typeColor('feature')} />
        <StatCard label="Improve" value={improveCount} color={typeColor('improve')} />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <LocalSelect value={filterType} onChange={setFilterType} options={types} placeholder="All Types" />
        <LocalSelect value={filterScope} onChange={setFilterScope} options={scopes} placeholder="All Scopes" />
        <LocalSelect value={filterStatus} onChange={setFilterStatus} options={statuses} placeholder="All Statuses" />
        <LocalSelect value={sortBy} onChange={setSortBy}
          options={['priority', 'created']}
          placeholder="Sort by" />
        <span style={{ fontSize: '12px', color: T.textDim, fontFamily: T.fontSans, marginLeft: 8 }}>
          {filtered.length} item{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <Card style={{ overflow: 'hidden' }}>
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: T.textDim, fontSize: '14px', fontFamily: T.fontSans }}>
            No unlinked items found
          </div>
        )}
        {filtered.map((bug) => (
          <UnlinkedRow
            key={bug.id}
            bug={bug}
            allBugs={allBugs}
            linking={!!linking[bug.id]}
            onSelect={onSelect}
            onSuggestionAttach={(s) => handleSuggestionAttach(bug, s)}
            onOpenPicker={() => setPickerBug(bug)}
          />
        ))}
      </Card>

      {pickerBug && (
        <AttachPickerModal
          allBugs={allBugs}
          onAttach={handlePickerAttach}
          onClose={() => setPickerBug(null)}
        />
      )}
    </div>
  );
}

function UnlinkedRow({ bug, allBugs, linking, onSelect, onSuggestionAttach, onOpenPicker }) {
  const [hover, setHover] = useState(false);
  const suggestions = useMemo(() => suggest(bug, allBugs), [bug, allBugs]);

  if (linking) {
    return (
      <div style={{
        padding: '14px 20px', borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 10, opacity: 0.5,
      }}>
        <span style={{ fontSize: '12px', color: T.accent, fontFamily: T.fontSans }}>Linking...</span>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '14px 20px', borderBottom: `1px solid ${T.border}`,
        background: hover ? 'rgba(139,124,246,0.03)' : 'transparent',
        transition: `all 0.2s ${T.ease}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: suggestions.length > 0 ? 8 : 0 }}>
        <span
          onClick={() => onSelect(bug)}
          style={{ fontFamily: T.font, fontSize: '12px', color: T.accent, cursor: 'pointer', flexShrink: 0 }}
        >{bug.id}</span>
        <span
          onClick={() => onSelect(bug)}
          style={{
            fontSize: '13px', fontWeight: 500, fontFamily: T.fontSans, color: T.text,
            cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex: 1,
          }}
        >{bug.title}</span>
        <TypeLabel type={bug.type} />
        <Badge color={priorityColor(bug.priority)} bg={`${priorityColor(bug.priority)}18`}>{bug.priority}</Badge>
        <Badge color={statusColor(bug.status)} bg={`${statusColor(bug.status)}18`}>{bug.status}</Badge>
        <ScopeLabel scope={bug.scope} />
        <button
          onClick={(e) => { e.stopPropagation(); onOpenPicker(); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: T.radiusSm,
            border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.03)',
            color: T.textDim, fontSize: '11px', fontFamily: T.fontSans,
            cursor: 'pointer', fontWeight: 500, flexShrink: 0,
            transition: `all 0.2s ${T.ease}`,
          }}
        >Link</button>
      </div>
      {suggestions.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 2 }}>
          <span style={{ fontSize: '10px', color: T.textDim, fontFamily: T.fontSans, textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>Suggestions:</span>
          {suggestions.map((s) => (
            <SuggestionChip key={s.targetId} suggestion={s} onAttach={() => onSuggestionAttach(s)} />
          ))}
        </div>
      )}
    </div>
  );
}
