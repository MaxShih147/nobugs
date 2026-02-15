import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { T, glass, typeColor, scopeColor, statusColor, priorityColor } from '../styles/tokens';
import { Badge, Card } from '../components/ui';
import { buildTree, flattenTree, validateDrop, getAncestors } from '../lib/hierarchy';

// ── localStorage helpers ─────────────────────────────────────────────

const LS_COLLAPSE = 'structure.collapsed';
const LS_SELECTED = 'structure.selected';

function loadCollapsed() {
  try { return new Set(JSON.parse(localStorage.getItem(LS_COLLAPSE) || '[]')); }
  catch { return new Set(); }
}
function saveCollapsed(set) {
  localStorage.setItem(LS_COLLAPSE, JSON.stringify([...set]));
}
function loadSelected() {
  try { return localStorage.getItem(LS_SELECTED) || null; }
  catch { return null; }
}
function saveSelected(id) {
  if (id) localStorage.setItem(LS_SELECTED, id);
  else localStorage.removeItem(LS_SELECTED);
}

// ── Scope / Type display ─────────────────────────────────────────────

function titleCase(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

function ScopeBadge({ scope }) {
  if (!scope) return null;
  return <Badge color={scopeColor(scope)} bg={`${scopeColor(scope)}18`} style={{ fontSize: '10px', padding: '2px 6px' }}>{titleCase(scope)}</Badge>;
}
function TypeBadge({ type }) {
  if (!type) return null;
  return <Badge color={typeColor(type)} bg={`${typeColor(type)}18`} style={{ fontSize: '10px', padding: '2px 6px' }}>{titleCase(type)}</Badge>;
}
function StatusDot({ status }) {
  const c = statusColor(status);
  return <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, boxShadow: `0 0 6px ${c}`, display: 'inline-block', flexShrink: 0 }} />;
}

// ── Toast ────────────────────────────────────────────────────────────

function Toast({ message, type }) {
  if (!message) return null;
  const bg = type === 'error' ? 'rgba(244,113,113,0.15)' : 'rgba(125,216,149,0.15)';
  const color = type === 'error' ? T.critical : T.done;
  return (
    <div style={{
      position: 'fixed', top: 76, left: '50%', transform: 'translateX(-50%)',
      zIndex: 30, padding: '8px 20px', borderRadius: T.radiusSm,
      background: bg, border: `1px solid ${color}30`,
      fontSize: '12px', fontFamily: T.fontSans, color, fontWeight: 500,
      pointerEvents: 'none',
    }}>{message}</div>
  );
}

// ── Search results dropdown ──────────────────────────────────────────

function SearchDropdown({ results, onSelect }) {
  if (results.length === 0) return null;
  return (
    <div style={{
      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
      ...glass, borderRadius: T.radiusSm, background: T.surfaceSolid,
      maxHeight: 220, overflowY: 'auto', marginTop: 4,
    }}>
      {results.map((n) => (
        <div key={n.id} onClick={() => onSelect(n)} style={{
          padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          fontSize: '12px', fontFamily: T.fontSans, color: T.text,
          borderBottom: `1px solid ${T.border}`,
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(139,124,246,0.06)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <span style={{ fontFamily: T.font, fontSize: '10px', color: T.textDim, flexShrink: 0 }}>{n.shortId}</span>
          <ScopeBadge scope={n.scope} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
        </div>
      ))}
    </div>
  );
}

// ── Tree Row ─────────────────────────────────────────────────────────

function TreeRow({
  node, depth, hasChildren, isCollapsed, isSelected, isHighlighted,
  isDragOver, isDragInvalid,
  onToggle, onSelect, onDragStart, onDragOver, onDragLeave, onDrop,
}) {
  const indent = 20 + depth * 24;
  const [hover, setHover] = useState(false);

  let bg = 'transparent';
  if (isDragOver && !isDragInvalid) bg = 'rgba(139,124,246,0.10)';
  else if (isDragOver && isDragInvalid) bg = 'rgba(244,113,113,0.08)';
  else if (isSelected) bg = 'rgba(139,124,246,0.06)';
  else if (isHighlighted) bg = 'rgba(232,211,116,0.06)';
  else if (hover) bg = 'rgba(255,255,255,0.02)';

  let borderLeft = 'none';
  if (isDragOver && !isDragInvalid) borderLeft = `2px solid ${T.accent}`;
  else if (isDragOver && isDragInvalid) borderLeft = `2px solid ${T.critical}`;
  else if (isSelected) borderLeft = `2px solid ${T.accent}`;

  return (
    <div
      draggable={node.scope !== 'epic'}
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', node.id); onDragStart(node); }}
      onDragOver={(e) => { e.preventDefault(); onDragOver(node); }}
      onDragLeave={onDragLeave}
      onDrop={(e) => { e.preventDefault(); onDrop(node); }}
      onClick={() => onSelect(node)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: `7px 12px 7px ${indent}px`,
        borderBottom: `1px solid ${T.border}`,
        background: bg, borderLeft,
        cursor: 'pointer', transition: `background 0.15s ${T.ease}`,
        minHeight: 36,
      }}
    >
      {/* Caret */}
      <span
        onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggle(node.id); }}
        style={{
          width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '10px', color: hasChildren ? T.textDim : 'transparent',
          cursor: hasChildren ? 'pointer' : 'default', flexShrink: 0,
          transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
          transition: `transform 0.15s ${T.ease}`,
        }}
      >
        {hasChildren ? '\u25B6' : '\u2022'}
      </span>

      {/* Scope dot */}
      <span style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: scopeColor(node.scope),
        boxShadow: node.scope === 'epic' ? `0 0 8px ${scopeColor(node.scope)}40` : 'none',
      }} />

      {/* ShortId */}
      <span style={{
        fontFamily: T.font, fontSize: '10px', color: T.textDim, flexShrink: 0, width: 50,
      }}>{node.shortId}</span>

      {/* Title */}
      <span style={{
        fontSize: '12px', fontFamily: T.fontSans, color: T.text,
        fontWeight: node.scope === 'epic' ? 600 : 400,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
      }}>{node.title}</span>

      {/* Badges */}
      <TypeBadge type={node.type} />
      <StatusDot status={node.status} />

      {/* Child count for epic/story */}
      {node.childCountDirect > 0 && (
        <span style={{
          fontSize: '10px', fontFamily: T.font, color: T.textDim,
          background: 'rgba(255,255,255,0.04)', padding: '1px 6px', borderRadius: T.radiusSm,
        }}>{node.childCountDirect}</span>
      )}
    </div>
  );
}

// ── Orphan Row (compact, for center pane) ────────────────────────────

function OrphanRow({ node, isSelected, isHighlighted, onSelect, onDragStart }) {
  const [hover, setHover] = useState(false);

  let bg = 'transparent';
  if (isSelected) bg = 'rgba(139,124,246,0.06)';
  else if (isHighlighted) bg = 'rgba(232,211,116,0.06)';
  else if (hover) bg = 'rgba(255,255,255,0.02)';

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', node.id); onDragStart(node); }}
      onClick={() => onSelect(node)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 12px', borderBottom: `1px solid ${T.border}`,
        background: bg, cursor: 'grab',
        transition: `background 0.15s ${T.ease}`, minHeight: 34,
      }}
    >
      <span style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: scopeColor(node.scope),
      }} />
      <span style={{ fontFamily: T.font, fontSize: '10px', color: T.textDim, flexShrink: 0, width: 50 }}>{node.shortId}</span>
      <span style={{
        fontSize: '12px', fontFamily: T.fontSans, color: T.text,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
      }}>{node.title}</span>
      <TypeBadge type={node.type} />
      <ScopeBadge scope={node.scope} />
      <StatusDot status={node.status} />
    </div>
  );
}

// ── Unlinked Pane (center column) ────────────────────────────────────

function UnlinkedPane({ orphanNodes, selectedId, highlightedId, onSelect, onDragStart, filterScope, setFilterScope }) {
  const scopes = useMemo(() => [...new Set(orphanNodes.map((n) => n.scope).filter(Boolean))], [orphanNodes]);
  const filtered = useMemo(() => {
    if (filterScope === 'all') return orphanNodes;
    return orphanNodes.filter((n) => n.scope === filterScope);
  }, [orphanNodes, filterScope]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      borderRight: `1px solid ${T.border}`,
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px', borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(244,113,113,0.03)',
      }}>
        <span style={{
          fontSize: '11px', fontFamily: T.fontSans, color: T.critical,
          textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600,
        }}>Unlinked</span>
        <span style={{
          fontSize: '11px', fontFamily: T.font, color: T.textDim,
          background: 'rgba(244,113,113,0.10)', padding: '1px 8px', borderRadius: T.radiusSm,
        }}>{filtered.length}</span>
        <div style={{ flex: 1 }} />
        <select value={filterScope} onChange={(e) => setFilterScope(e.target.value)} style={{
          background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`,
          borderRadius: T.radiusSm, padding: '3px 8px', color: T.text,
          fontSize: '10px', fontFamily: T.fontSans, outline: 'none', cursor: 'pointer',
        }}>
          <option value="all">All scopes</option>
          {scopes.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
        </select>
      </div>

      {/* Hint */}
      <div style={{
        padding: '6px 12px', borderBottom: `1px solid ${T.border}`,
        fontSize: '10px', fontFamily: T.fontSans, color: T.textDim,
        background: 'rgba(10,11,16,0.3)', display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <span style={{ fontSize: '12px' }}>{'\u2190'}</span> Drag items to the tree
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{ padding: 30, textAlign: 'center', color: T.textDim, fontSize: '12px', fontFamily: T.fontSans }}>
            {orphanNodes.length === 0 ? 'All items are linked!' : 'No items match filter'}
          </div>
        )}
        {filtered.map((node) => (
          <OrphanRow
            key={node.id} node={node}
            isSelected={selectedId === node.id}
            isHighlighted={highlightedId === node.id}
            onSelect={onSelect}
            onDragStart={onDragStart}
          />
        ))}
      </div>
    </div>
  );
}

// ── Detail Panel ─────────────────────────────────────────────────────

function DetailPanel({ node, tree, allBugs, onJumpTo, onChangeParent, onUnlink }) {
  const [parentSearch, setParentSearch] = useState('');
  const [showParentPicker, setShowParentPicker] = useState(false);

  if (!node) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', color: T.textDim, fontFamily: T.fontSans, fontSize: '13px',
      }}>
        Select a node to view details
      </div>
    );
  }

  const parent = node.parentNotionId ? tree.nodesById[node.parentNotionId] : null;
  const children = (tree.childrenById[node.id] || []).map((cid) => tree.nodesById[cid]).filter(Boolean);

  // Compute valid parents for picker
  const validParentScope = node.scope === 'story' ? 'epic' : node.scope === 'task' ? 'story' : null;
  const candidateParents = validParentScope
    ? Object.values(tree.nodesById).filter((n) => n.scope === validParentScope && n.id !== node.id)
    : [];
  const filteredParents = parentSearch
    ? candidateParents.filter((n) => n.title.toLowerCase().includes(parentSearch.toLowerCase()) || n.shortId.toLowerCase().includes(parentSearch.toLowerCase()))
    : candidateParents;

  return (
    <div style={{ padding: '20px 18px', overflowY: 'auto', height: '100%' }}>
      {/* Title */}
      <div style={{ fontSize: '15px', fontWeight: 600, fontFamily: T.fontSans, color: T.text, marginBottom: 12, lineHeight: 1.4 }}>
        {node.title}
      </div>

      {/* Badges row */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        <span style={{ fontFamily: T.font, fontSize: '11px', color: T.textDim }}>{node.shortId}</span>
        <ScopeBadge scope={node.scope} />
        <TypeBadge type={node.type} />
        <Badge color={statusColor(node.status)} bg={`${statusColor(node.status)}18`} style={{ fontSize: '10px', padding: '2px 6px' }}>{node.status}</Badge>
        <Badge color={priorityColor(node.priority)} bg={`${priorityColor(node.priority)}18`} style={{ fontSize: '10px', padding: '2px 6px' }}>{node.priority}</Badge>
      </div>

      {/* Info rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        <InfoRow label="Assignee" value={node.assignee} />
        <InfoRow label="Project" value={node.project} />
        <InfoRow label="Sprint" value={node.sprint} />
        <InfoRow label="Due" value={node.due || '\u2014'} />
        <InfoRow label="Children" value={`${node.childCountDirect} direct / ${node.childCountTotal} total`} />
      </div>

      {/* Parent section */}
      <div style={{
        padding: '12px', borderRadius: T.radiusSm, border: `1px solid ${T.border}`,
        background: 'rgba(255,255,255,0.02)', marginBottom: 12,
      }}>
        <div style={{ fontSize: '10px', fontFamily: T.fontSans, color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8, fontWeight: 600 }}>
          Parent
        </div>
        {parent ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ScopeBadge scope={parent.scope} />
            <span onClick={() => onJumpTo(parent.id)} style={{
              fontSize: '12px', fontFamily: T.fontSans, color: T.accent, cursor: 'pointer',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
            }}>{parent.title}</span>
          </div>
        ) : (
          <span style={{ fontSize: '12px', fontFamily: T.fontSans, color: T.textDim }}>None (unlinked)</span>
        )}

        {/* Actions */}
        {node.scope !== 'epic' && (
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <button onClick={() => setShowParentPicker(!showParentPicker)} style={actionBtn}>
              {showParentPicker ? 'Cancel' : 'Change parent'}
            </button>
            {parent && <button onClick={() => onUnlink(node)} style={{ ...actionBtn, borderColor: `${T.critical}30`, color: T.critical }}>Unlink</button>}
          </div>
        )}

        {/* Parent picker */}
        {showParentPicker && (
          <div style={{ marginTop: 10 }}>
            <input
              value={parentSearch} onChange={(e) => setParentSearch(e.target.value)}
              placeholder={`Search ${validParentScope}s...`} autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`,
                borderRadius: T.radiusSm, padding: '7px 10px', color: T.text,
                fontSize: '12px', fontFamily: T.fontSans, outline: 'none', marginBottom: 6,
              }}
            />
            <div style={{ maxHeight: 160, overflowY: 'auto' }}>
              {filteredParents.slice(0, 20).map((p) => (
                <div key={p.id} onClick={() => { onChangeParent(node, p); setShowParentPicker(false); setParentSearch(''); }}
                  style={{
                    padding: '6px 8px', cursor: 'pointer', fontSize: '12px',
                    fontFamily: T.fontSans, color: T.text, borderRadius: T.radiusSm,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(139,124,246,0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ fontFamily: T.font, fontSize: '10px', color: T.textDim }}>{p.shortId}</span>
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

      {/* Children list */}
      {children.length > 0 && (
        <div style={{
          padding: '12px', borderRadius: T.radiusSm, border: `1px solid ${T.border}`,
          background: 'rgba(255,255,255,0.02)',
        }}>
          <div style={{ fontSize: '10px', fontFamily: T.fontSans, color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8, fontWeight: 600 }}>
            Children ({children.length})
          </div>
          {children.map((c) => (
            <div key={c.id} onClick={() => onJumpTo(c.id)} style={{
              padding: '5px 8px', cursor: 'pointer', fontSize: '12px',
              fontFamily: T.fontSans, color: T.text, display: 'flex', alignItems: 'center', gap: 6,
              borderRadius: T.radiusSm,
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(139,124,246,0.06)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <ScopeBadge scope={c.scope} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {node.isOrphan && (
        <div style={{
          marginTop: 12, padding: '8px 12px', borderRadius: T.radiusSm,
          background: 'rgba(232,211,116,0.08)', border: `1px solid rgba(232,211,116,0.2)`,
          fontSize: '11px', fontFamily: T.fontSans, color: T.medium,
        }}>
          This item has no parent. Drag it onto a {node.scope === 'story' ? 'epic' : 'story'} in the tree, or use "Change parent" above.
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: '11px', fontFamily: T.fontSans, color: T.textDim, width: 70, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '12px', fontFamily: T.fontSans, color: T.text }}>{value || '\u2014'}</span>
    </div>
  );
}

const actionBtn = {
  padding: '5px 10px', borderRadius: T.radiusSm, border: `1px solid ${T.border}`,
  background: 'rgba(255,255,255,0.03)', color: T.textDim, fontSize: '11px',
  fontFamily: T.fontSans, cursor: 'pointer', fontWeight: 500,
};

// ── Unlink drop zone ─────────────────────────────────────────────────

function UnlinkZone({ isDragActive, onDrop }) {
  const [over, setOver] = useState(false);
  if (!isDragActive) return null;
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onDrop(); }}
      style={{
        padding: '10px 12px', textAlign: 'center',
        background: over ? 'rgba(244,113,113,0.10)' : 'rgba(244,113,113,0.04)',
        border: `1px dashed ${over ? T.critical : T.border}`,
        borderRadius: T.radiusSm, marginTop: 4,
        fontSize: '11px', fontFamily: T.fontSans, color: over ? T.critical : T.textDim,
        transition: `all 0.15s ${T.ease}`,
      }}
    >
      Drop here to unlink
    </div>
  );
}

// ── Main StructureView ───────────────────────────────────────────────

export default function StructureView({ allBugs, updateBug }) {
  const [collapsed, setCollapsed] = useState(loadCollapsed);
  const [selectedId, setSelectedId] = useState(loadSelected);
  const [orphanFilterScope, setOrphanFilterScope] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [highlightedId, setHighlightedId] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const treeRef = useRef();
  const searchInputRef = useRef();

  // DnD state
  const [dragNode, setDragNode] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [dropValid, setDropValid] = useState(null);

  // Build hierarchy
  const tree = useMemo(() => buildTree(allBugs), [allBugs]);

  // Flatten for display
  const rows = useMemo(() => flattenTree(tree, collapsed), [tree, collapsed]);

  const orphanNodes = useMemo(
    () => tree.orphans.map((id) => tree.nodesById[id]).filter(Boolean),
    [tree]
  );

  // Selected node
  const selectedNode = selectedId ? tree.nodesById[selectedId] : null;

  // Persist collapsed state
  useEffect(() => { saveCollapsed(collapsed); }, [collapsed]);
  useEffect(() => { saveSelected(selectedId); }, [selectedId]);

  // Keyboard: / to search, Esc to clear
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setSearchQuery('');
        setSearchResults([]);
        setHighlightedId(null);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Search
  useEffect(() => {
    if (!searchQuery) { setSearchResults([]); return; }
    const q = searchQuery.toLowerCase();
    const matches = Object.values(tree.nodesById)
      .filter((n) => n.title.toLowerCase().includes(q) || n.shortId.toLowerCase().includes(q))
      .slice(0, 10);
    setSearchResults(matches);
  }, [searchQuery, tree]);

  // Jump to node (expand ancestors + select + scroll)
  const jumpToNode = useCallback((nodeId) => {
    const ancestors = getAncestors(nodeId, tree.parentById);
    setCollapsed((prev) => {
      const next = new Set(prev);
      for (const aid of ancestors) next.delete(aid);
      return next;
    });
    setSelectedId(nodeId);
    setHighlightedId(nodeId);
    setSearchQuery('');
    setSearchResults([]);
    // Clear highlight after 2s
    setTimeout(() => setHighlightedId(null), 2000);
    // Scroll into view
    setTimeout(() => {
      const el = document.getElementById(`tree-row-${nodeId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, [tree]);

  // Toggle collapse
  const toggleCollapse = useCallback((nodeId) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    const ids = Object.keys(tree.nodesById).filter((id) => (tree.childrenById[id] || []).length > 0);
    setCollapsed(new Set(ids));
  }, [tree]);

  const expandAll = useCallback(() => {
    setCollapsed(new Set());
  }, []);

  // Toast helper
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 2500);
  }, []);

  // DnD handlers
  const handleDragStart = useCallback((node) => {
    setDragNode(node);
  }, []);

  const handleDragOver = useCallback((targetNode) => {
    if (!dragNode || targetNode.id === dragNode.id) {
      setDropTarget(null);
      setDropValid(null);
      return;
    }
    const v = validateDrop(dragNode.id, targetNode.id, tree);
    setDropTarget(targetNode.id);
    setDropValid(v);
  }, [dragNode, tree]);

  const handleDragLeave = useCallback(() => {
    setDropTarget(null);
    setDropValid(null);
  }, []);

  const handleDrop = useCallback(async (targetNode) => {
    if (!dragNode) return;
    const v = validateDrop(dragNode.id, targetNode.id, tree);
    setDropTarget(null);
    setDropValid(null);
    setDragNode(null);

    if (!v.valid) {
      showToast(v.reason, 'error');
      return;
    }

    try {
      await updateBug(dragNode.id, { parentNotionId: targetNode.id });
      showToast(`Moved ${dragNode.shortId} under ${targetNode.shortId}`);
      // Expand target so the moved node is visible
      setCollapsed((prev) => { const next = new Set(prev); next.delete(targetNode.id); return next; });
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
    }
  }, [dragNode, tree, updateBug, showToast]);

  // Unlink via drop zone
  const handleUnlinkDrop = useCallback(async () => {
    if (!dragNode) return;
    setDropTarget(null);
    setDropValid(null);
    const node = dragNode;
    setDragNode(null);

    if (node.scope === 'epic') { showToast('Epics are always root', 'error'); return; }
    if (!node.parentNotionId) { showToast('Already unlinked', 'error'); return; }

    try {
      await updateBug(node.id, { parentNotionId: null });
      showToast(`Unlinked ${node.shortId}`);
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
    }
  }, [dragNode, updateBug, showToast]);

  // Unlink via detail panel button
  const handleUnlink = useCallback(async (node) => {
    if (!node.parentNotionId) return;
    try {
      await updateBug(node.id, { parentNotionId: null });
      showToast(`Unlinked ${node.shortId}`);
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
    }
  }, [updateBug, showToast]);

  // Change parent via detail panel picker
  const handleChangeParent = useCallback(async (child, newParent) => {
    const v = validateDrop(child.id, newParent.id, tree);
    if (!v.valid) { showToast(v.reason, 'error'); return; }
    try {
      await updateBug(child.id, { parentNotionId: newParent.id });
      showToast(`Moved ${child.shortId} under ${newParent.shortId}`);
      setCollapsed((prev) => { const next = new Set(prev); next.delete(newParent.id); return next; });
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
    }
  }, [tree, updateBug, showToast]);

  // DragEnd cleanup (fires when drag is canceled)
  useEffect(() => {
    const handler = () => { setDragNode(null); setDropTarget(null); setDropValid(null); };
    window.addEventListener('dragend', handler);
    return () => window.removeEventListener('dragend', handler);
  }, []);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
      {/* Left pane: Hierarchy tree (drop target) */}
      <div style={{
        flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column',
        borderRight: `1px solid ${T.border}`,
      }}>
        {/* Toolbar */}
        <div style={{
          padding: '10px 12px', borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          background: 'rgba(10,11,16,0.5)',
        }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 150 }}>
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchResults.length > 0) {
                  jumpToNode(searchResults[0].id);
                }
              }}
              placeholder="Search... ( / )"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`,
                borderRadius: T.radiusSm, padding: '6px 10px', color: T.text,
                fontSize: '12px', fontFamily: T.fontSans, outline: 'none',
              }}
            />
            <SearchDropdown results={searchResults} onSelect={(n) => jumpToNode(n.id)} />
          </div>
          <button onClick={expandAll} style={toolBtn}>Expand</button>
          <button onClick={collapseAll} style={toolBtn}>Collapse</button>
        </div>

        {/* Stats bar */}
        <div style={{
          padding: '6px 12px', borderBottom: `1px solid ${T.border}`,
          display: 'flex', gap: 14, fontSize: '10px', fontFamily: T.fontSans, color: T.textDim,
          background: 'rgba(10,11,16,0.3)',
        }}>
          <span>{tree.stats.total} total</span>
          <span style={{ color: scopeColor('epic') }}>{tree.stats.epics} epics</span>
          <span style={{ color: scopeColor('story') }}>{tree.stats.stories} stories</span>
          <span style={{ color: scopeColor('task') }}>{tree.stats.tasks} tasks</span>
        </div>

        {/* Tree rows */}
        <div ref={treeRef} style={{ flex: 1, overflowY: 'auto' }}>
          {rows.map(({ node, depth, hasChildren }) => (
            <div key={node.id} id={`tree-row-${node.id}`}>
              <TreeRow
                node={node} depth={depth} hasChildren={hasChildren}
                isCollapsed={collapsed.has(node.id)}
                isSelected={selectedId === node.id}
                isHighlighted={highlightedId === node.id}
                isDragOver={dropTarget === node.id}
                isDragInvalid={dropTarget === node.id && dropValid && !dropValid.valid}
                onToggle={toggleCollapse}
                onSelect={(n) => setSelectedId(n.id)}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              />
            </div>
          ))}

          {/* Unlink drop zone — appears at bottom of tree when dragging */}
          <UnlinkZone isDragActive={!!dragNode} onDrop={handleUnlinkDrop} />

          {rows.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: T.textDim, fontSize: '13px', fontFamily: T.fontSans }}>
              No linked items yet
            </div>
          )}
        </div>
      </div>

      {/* Center pane: Unlinked items (drag source) */}
      <div style={{ width: 320, flexShrink: 0 }}>
        <UnlinkedPane
          orphanNodes={orphanNodes}
          selectedId={selectedId}
          highlightedId={highlightedId}
          onSelect={(n) => setSelectedId(n.id)}
          onDragStart={handleDragStart}
          filterScope={orphanFilterScope}
          setFilterScope={setOrphanFilterScope}
        />
      </div>

      {/* Right pane: Detail */}
      <div style={{ width: 300, flexShrink: 0, overflowY: 'auto', background: 'rgba(10,11,16,0.3)', borderLeft: `1px solid ${T.border}` }}>
        <DetailPanel
          node={selectedNode}
          tree={tree}
          allBugs={allBugs}
          onJumpTo={jumpToNode}
          onChangeParent={handleChangeParent}
          onUnlink={handleUnlink}
        />
      </div>

      <Toast message={toast.message} type={toast.type} />
    </div>
  );
}

const toolBtn = {
  padding: '5px 10px', borderRadius: T.radiusSm, border: `1px solid ${T.border}`,
  background: 'rgba(255,255,255,0.03)', color: T.textDim, fontSize: '11px',
  fontFamily: T.fontSans, cursor: 'pointer', fontWeight: 500,
};
