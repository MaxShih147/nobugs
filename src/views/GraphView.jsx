import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { forceCollide, forceY, forceCenter } from 'd3-force';
import { T, glass, typeColor, scopeColor, statusColor, priorityColor } from '../styles/tokens';
import { Card, Badge } from '../components/ui';
import {
  buildHierarchy,
  computeVisibleGraph,
  nodeRadius,
  linkWidth,
  linkColor,
  validateParentAssignment,
} from '../lib/graphModel';

// ── constants ────────────────────────────────────────────────────────

const SCOPE_COLORS = { epic: '#7dd895', story: '#6aabde', task: '#e8d374' };
const LINK_COLOR = 'rgba(139, 124, 246, 0.30)';
const LINK_HIGHLIGHT = 'rgba(139, 124, 246, 0.7)';
const NODE_BORDER_DEFAULT = 'rgba(255,255,255,0.15)';
const NODE_BORDER_HOVER = 'rgba(139, 124, 246, 0.8)';

const LAYER_Y = { epic: 0, story: 180, task: 360 };
const LINK_DISTANCE = { 'epic-story': 110, 'story-task': 80, 'epic-task': 100, other: 90 };

// ── Legend ────────────────────────────────────────────────────────────

function Legend() {
  const items = [
    { label: 'Epic', color: SCOPE_COLORS.epic, r: 12 },
    { label: 'Story', color: SCOPE_COLORS.story, r: 8 },
    { label: 'Task', color: SCOPE_COLORS.task, r: 6 },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 16, left: 16, ...glass,
      borderRadius: T.radiusSm, padding: '10px 14px', zIndex: 5,
      display: 'flex', gap: 14, alignItems: 'center',
    }}>
      {items.map((it) => (
        <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: it.r * 2, height: it.r * 2, borderRadius: '50%',
            background: `${it.color}30`, border: `2px solid ${it.color}`,
          }} />
          <span style={{ fontSize: '11px', fontFamily: T.fontSans, color: T.textDim }}>{it.label}</span>
        </div>
      ))}
      <div style={{ width: 1, height: 16, background: T.border }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 24, height: 4, borderRadius: 2, background: LINK_COLOR }} />
        <span style={{ fontSize: '11px', fontFamily: T.fontSans, color: T.textDim }}>Parent</span>
      </div>
    </div>
  );
}

// ── Search box ───────────────────────────────────────────────────────

function SearchBox({ onSearch, searchRef }) {
  const [query, setQuery] = useState('');
  return (
    <input
      ref={searchRef}
      value={query}
      onChange={(e) => { setQuery(e.target.value); onSearch(e.target.value); }}
      placeholder="Search nodes... ( / )"
      style={{
        position: 'absolute', top: 16, left: 16, zIndex: 5,
        background: 'rgba(10,11,16,0.85)', border: `1px solid ${T.border}`,
        borderRadius: T.radiusSm, padding: '8px 14px', color: T.text,
        fontSize: '13px', fontFamily: T.fontSans, width: 220, outline: 'none',
        backdropFilter: 'blur(8px)',
      }}
    />
  );
}

// ── Epic toggles panel ───────────────────────────────────────────────

function EpicPanel({ epics, visibleEpics, setVisibleEpics, collapsed, allCollapsed, onToggleAll }) {
  const allVisible = epics.every((e) => visibleEpics.has(e.id));

  const toggleEpic = (id) => {
    setVisibleEpics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAllEpics = () => {
    if (allVisible) setVisibleEpics(new Set());
    else setVisibleEpics(new Set(epics.map((e) => e.id)));
  };

  return (
    <div style={{
      position: 'absolute', top: 16, right: 16, zIndex: 5,
      ...glass, borderRadius: T.radiusSm, padding: '12px 14px',
      maxHeight: 'calc(100% - 80px)', overflowY: 'auto', width: 220,
      background: 'rgba(10,11,16,0.88)', backdropFilter: 'blur(12px)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: '11px', fontFamily: T.fontSans, color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>Epics</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={onToggleAll} style={miniBtn} title={allCollapsed ? 'Expand all' : 'Collapse all'}>
            {allCollapsed ? '+' : '-'}
          </button>
          <button onClick={toggleAllEpics} style={miniBtn}>
            {allVisible ? 'Hide all' : 'Show all'}
          </button>
        </div>
      </div>
      {epics.map((epic) => (
        <label key={epic.id} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0',
          cursor: 'pointer', fontSize: '12px', fontFamily: T.fontSans, color: T.text,
        }}>
          <input
            type="checkbox" checked={visibleEpics.has(epic.id)}
            onChange={() => toggleEpic(epic.id)}
            style={{ accentColor: T.accent }}
          />
          <span style={{
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            opacity: visibleEpics.has(epic.id) ? 1 : 0.4,
          }}>{epic.title}</span>
          <span style={{ marginLeft: 'auto', fontSize: '10px', color: T.textDim, fontFamily: T.font, flexShrink: 0 }}>
            {epic.descendantCount}
          </span>
        </label>
      ))}
    </div>
  );
}

const miniBtn = {
  padding: '2px 8px', borderRadius: T.radiusSm, border: `1px solid ${T.border}`,
  background: 'rgba(255,255,255,0.04)', color: T.textDim, fontSize: '11px',
  fontFamily: T.fontSans, cursor: 'pointer',
};

// ── Tooltip ──────────────────────────────────────────────────────────

function Tooltip({ node, x, y }) {
  if (!node) return null;
  const scope = node.scope ? node.scope.charAt(0).toUpperCase() + node.scope.slice(1) : '';
  const type = node.type ? node.type.charAt(0).toUpperCase() + node.type.slice(1) : '';
  return (
    <div style={{
      position: 'fixed', left: x + 14, top: y - 10, zIndex: 20,
      ...glass, borderRadius: T.radiusSm, padding: '10px 14px',
      background: 'rgba(10,11,16,0.92)', backdropFilter: 'blur(12px)',
      maxWidth: 280, pointerEvents: 'none',
    }}>
      <div style={{ fontSize: '12px', fontWeight: 600, fontFamily: T.fontSans, color: T.text, marginBottom: 4 }}>{node.title}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '10px', fontFamily: T.font, color: T.textDim }}>{node.shortId}</span>
        {scope && <span style={{ fontSize: '10px', fontFamily: T.fontSans, color: scopeColor(node.scope) }}>{scope}</span>}
        {type && <span style={{ fontSize: '10px', fontFamily: T.fontSans, color: typeColor(node.type) }}>{type}</span>}
        {node.status && <span style={{ fontSize: '10px', fontFamily: T.fontSans, color: statusColor(node.status) }}>{node.status}</span>}
        {node.priority && <span style={{ fontSize: '10px', fontFamily: T.fontSans, color: priorityColor(node.priority) }}>{node.priority}</span>}
      </div>
      {node.hiddenCount > 0 && (
        <div style={{ fontSize: '10px', color: T.accent, fontFamily: T.fontSans, marginTop: 4 }}>+{node.hiddenCount} collapsed</div>
      )}
    </div>
  );
}

// ── Link Parent mode bar ─────────────────────────────────────────────

function LinkModeBar({ active, selectedChild, onCancel }) {
  if (!active) return null;
  return (
    <div style={{
      position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
      zIndex: 10, ...glass, borderRadius: T.radiusSm, padding: '10px 20px',
      background: 'rgba(139,124,246,0.12)', borderColor: T.accent + '40',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span style={{ fontSize: '12px', fontFamily: T.fontSans, color: T.accent, fontWeight: 600 }}>Link Parent Mode</span>
      {selectedChild
        ? <span style={{ fontSize: '12px', fontFamily: T.fontSans, color: T.text }}>
            Now click a parent for <strong>{selectedChild.title?.slice(0, 30)}</strong>
          </span>
        : <span style={{ fontSize: '12px', fontFamily: T.fontSans, color: T.textDim }}>Click a child node to start</span>
      }
      <button onClick={onCancel} style={{
        padding: '4px 12px', borderRadius: T.radiusSm, border: `1px solid ${T.border}`,
        background: 'rgba(255,255,255,0.06)', color: T.textDim, fontSize: '11px',
        fontFamily: T.fontSans, cursor: 'pointer',
      }}>Cancel (Esc)</button>
    </div>
  );
}

// ── Toast ────────────────────────────────────────────────────────────

function Toast({ message, type }) {
  if (!message) return null;
  const bg = type === 'error' ? 'rgba(244,113,113,0.15)' : 'rgba(125,216,149,0.15)';
  const color = type === 'error' ? T.critical : T.done;
  return (
    <div style={{
      position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)',
      zIndex: 20, padding: '8px 20px', borderRadius: T.radiusSm,
      background: bg, border: `1px solid ${color}30`,
      fontSize: '12px', fontFamily: T.fontSans, color, fontWeight: 500,
    }}>{message}</div>
  );
}

// ── Stats bar ────────────────────────────────────────────────────────

function StatsBar({ stats, visibleCount }) {
  return (
    <div style={{
      position: 'absolute', bottom: 16, right: 16, zIndex: 5,
      ...glass, borderRadius: T.radiusSm, padding: '8px 14px',
      display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(10,11,16,0.85)',
    }}>
      <Stat label="Visible" value={visibleCount} />
      <Stat label="Total" value={stats.total} />
      <Stat label="Epics" value={stats.epics} color={SCOPE_COLORS.epic} />
      <Stat label="Stories" value={stats.stories} color={SCOPE_COLORS.story} />
      <Stat label="Tasks" value={stats.tasks} color={SCOPE_COLORS.task} />
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: T.fontSans, color: color || T.text }}>{value}</div>
      <div style={{ fontSize: '9px', fontFamily: T.fontSans, color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
    </div>
  );
}

// ── Main GraphView ───────────────────────────────────────────────────

export default function GraphView({ allBugs, updateBug }) {
  const fgRef = useRef();
  const searchRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Graph data
  const hierarchy = useMemo(() => buildHierarchy(allBugs), [allBugs]);
  const epics = useMemo(() =>
    hierarchy.rootIds
      .map((id) => hierarchy.nodesById[id])
      .filter((n) => n.scope === 'epic')
      .sort((a, b) => b.descendantCount - a.descendantCount),
    [hierarchy]
  );

  // State
  const [visibleEpics, setVisibleEpics] = useState(() => new Set(epics.map((e) => e.id)));
  const [collapsedNodes, setCollapsedNodes] = useState(() => {
    // Auto-collapse stories with >12 children
    const auto = new Set();
    for (const id of Object.keys(hierarchy.nodesById)) {
      const node = hierarchy.nodesById[id];
      if (node.scope === 'story' && node.childCount > 12) auto.add(id);
    }
    return auto;
  });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchMatch, setSearchMatch] = useState(null);

  // Link Parent mode (Phase 4)
  const [linkMode, setLinkMode] = useState(false);
  const [linkChild, setLinkChild] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Track mouse for tooltip
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e) => setTooltipPos({ x: e.clientX, y: e.clientY });
    el.addEventListener('mousemove', handler);
    return () => el.removeEventListener('mousemove', handler);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (linkMode) { setLinkMode(false); setLinkChild(null); }
        setSelectedNode(null);
        searchRef.current?.blur();
      }
      if (e.key === ' ' && selectedNode && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        toggleCollapse(selectedNode.id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [linkMode, selectedNode]);

  // Compute visible graph
  const { visibleNodes, visibleLinks } = useMemo(
    () => computeVisibleGraph(hierarchy, visibleEpics, collapsedNodes),
    [hierarchy, visibleEpics, collapsedNodes]
  );

  // Graph data for react-force-graph
  const graphData = useMemo(() => ({
    nodes: visibleNodes.map((n) => ({ ...n })),
    links: visibleLinks.map((l) => ({ ...l })),
  }), [visibleNodes, visibleLinks]);

  // Zoom
  const currentZoom = useRef(1);

  // Toggle collapse
  const toggleCollapse = useCallback((nodeId) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
      return next;
    });
    setTimeout(() => fgRef.current?.d3ReheatSimulation(), 50);
  }, []);

  // Toggle all collapse
  const allCollapsed = useMemo(() => {
    const expandable = Object.values(hierarchy.nodesById).filter((n) => n.childCount > 0);
    return expandable.length > 0 && expandable.every((n) => collapsedNodes.has(n.id));
  }, [hierarchy, collapsedNodes]);

  const handleToggleAll = useCallback(() => {
    if (allCollapsed) {
      setCollapsedNodes(new Set());
    } else {
      const ids = Object.values(hierarchy.nodesById).filter((n) => n.childCount > 0).map((n) => n.id);
      setCollapsedNodes(new Set(ids));
    }
    setTimeout(() => fgRef.current?.d3ReheatSimulation(), 50);
  }, [allCollapsed, hierarchy]);

  // Zoom to fit
  const zoomToFit = useCallback(() => {
    setTimeout(() => fgRef.current?.zoomToFit(400, 60), 100);
  }, []);

  // Zoom to fit when epic visibility changes
  useEffect(() => { zoomToFit(); }, [visibleEpics]);

  // Search
  const handleSearch = useCallback((query) => {
    if (!query) { setSearchMatch(null); return; }
    const q = query.toLowerCase();
    const match = visibleNodes.find(
      (n) => n.title.toLowerCase().includes(q) || n.shortId?.toLowerCase().includes(q)
    );
    if (match) {
      setSearchMatch(match.id);
      setSelectedNode(match);
      fgRef.current?.centerAt(match.x, match.y, 600);
      fgRef.current?.zoom(2.5, 600);
    } else {
      setSearchMatch(null);
    }
  }, [visibleNodes]);

  // Node click
  const handleNodeClick = useCallback((node, event) => {
    if (linkMode) {
      handleLinkModeClick(node);
      return;
    }
    // Right-click or ctrl-click = toggle collapse
    if (event.ctrlKey || event.metaKey) {
      toggleCollapse(node.id);
      return;
    }
    // Single click = select + toggle collapse if has children
    setSelectedNode(node);
    if (node.childCount > 0) {
      toggleCollapse(node.id);
    }
  }, [linkMode, toggleCollapse]);

  // Link parent mode logic
  const handleLinkModeClick = useCallback(async (node) => {
    if (!linkChild) {
      // First click: select child
      if (node.scope === 'epic') {
        showToast('Epics cannot have a parent', 'error');
        return;
      }
      setLinkChild(node);
      return;
    }
    // Second click: select parent
    const validation = validateParentAssignment(linkChild, node, hierarchy);
    if (!validation.valid) {
      showToast(validation.reason, 'error');
      return;
    }
    try {
      await updateBug(linkChild.id, { parentNotionId: node.id });
      showToast(`Linked ${linkChild.shortId} → ${node.shortId}`, 'success');
      setLinkChild(null);
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
    }
  }, [linkChild, hierarchy, updateBug]);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3000);
  };

  // Canvas node paint
  const paintNode = useCallback((node, ctx, globalScale) => {
    const r = nodeRadius(node);
    const isHovered = hoveredNode?.id === node.id;
    const isSelected = selectedNode?.id === node.id;
    const isSearchMatch = searchMatch === node.id;
    const isLinkChild = linkChild?.id === node.id;
    const scopeCol = SCOPE_COLORS[node.scope] || '#888';

    // Glow for special states
    if (isSelected || isSearchMatch || isLinkChild) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 6, 0, 2 * Math.PI);
      ctx.fillStyle = `${T.accent}20`;
      ctx.fill();
    }

    // Node fill
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fillStyle = `${scopeCol}25`;
    ctx.fill();

    // Node border
    ctx.strokeStyle = isHovered ? NODE_BORDER_HOVER : isSelected ? T.accent : `${scopeCol}60`;
    ctx.lineWidth = isHovered || isSelected ? 2 : 1.2;
    ctx.stroke();

    // Collapsed badge
    if (node.hiddenCount > 0) {
      const badgeR = Math.max(6, r * 0.35);
      const bx = node.x + r * 0.7;
      const by = node.y - r * 0.7;
      ctx.beginPath();
      ctx.arc(bx, by, badgeR, 0, 2 * Math.PI);
      ctx.fillStyle = T.accent;
      ctx.fill();
      ctx.font = `bold ${Math.max(7, badgeR * 1.2)}px ${T.fontSans}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText(`+${node.hiddenCount}`, bx, by);
    }

    // Labels — LOD by zoom
    const zoom = currentZoom.current;
    let showLabel = false;
    if (node.scope === 'epic') showLabel = true;
    else if (node.scope === 'story' && zoom >= 1.2) showLabel = true;
    else if (zoom >= 2.2) showLabel = true;
    if (isHovered || isSelected || isSearchMatch) showLabel = true;

    if (showLabel) {
      const fontSize = Math.max(10, 12 / Math.sqrt(zoom));
      ctx.font = `500 ${fontSize}px ${T.fontSans}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = isHovered || isSelected ? T.text : `${T.text}aa`;
      const label = node.title.length > 28 ? node.title.slice(0, 26) + '..' : node.title;
      ctx.fillText(label, node.x, node.y + r + 4);
    }
  }, [hoveredNode, selectedNode, searchMatch, linkChild]);

  // Canvas link paint
  const paintLink = useCallback((link, ctx) => {
    const src = link.source;
    const tgt = link.target;
    if (!src.x || !tgt.x) return;

    ctx.beginPath();
    ctx.moveTo(src.x, src.y);
    ctx.lineTo(tgt.x, tgt.y);
    ctx.strokeStyle = (hoveredNode && (hoveredNode.id === src.id || hoveredNode.id === tgt.id))
      ? LINK_HIGHLIGHT : LINK_COLOR;
    ctx.lineWidth = linkWidth(link);
    ctx.stroke();
  }, [hoveredNode]);

  // d3 force config
  const configForces = useCallback((fg) => {
    // Link force with distance by level
    fg.d3Force('link')
      ?.distance((link) => LINK_DISTANCE[link.level] || 90)
      .strength(0.7);

    // Repulsion
    fg.d3Force('charge')?.strength(-120).distanceMax(400);

    // Collision
    fg.d3Force('collide', null); // remove default
    fg.d3Force('collide', forceCollide()
      .radius((node) => nodeRadius(node) + 8)
      .strength(0.8)
      .iterations(2)
    );

    // Hierarchical Y layers
    fg.d3Force('y', forceY()
      .y((node) => LAYER_Y[node.scope] ?? 200)
      .strength(0.1)
    );

    // Gentle center
    fg.d3Force('center', forceCenter(0, 180).strength(0.03));
  }, []);

  // Apply force config when ref ready
  useEffect(() => {
    if (fgRef.current) {
      configForces(fgRef.current);
      // Initial zoom to fit
      setTimeout(() => fgRef.current?.zoomToFit(600, 60), 500);
    }
  }, [configForces, graphData]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: 'calc(100vh - 60px)', background: T.bg }}>
      <SearchBox onSearch={handleSearch} searchRef={searchRef} />

      <EpicPanel
        epics={epics}
        visibleEpics={visibleEpics}
        setVisibleEpics={setVisibleEpics}
        collapsed={collapsedNodes}
        allCollapsed={allCollapsed}
        onToggleAll={handleToggleAll}
      />

      {/* Toolbar */}
      <div style={{
        position: 'absolute', top: 16, left: 260, zIndex: 5,
        display: 'flex', gap: 6,
      }}>
        <button onClick={zoomToFit} style={toolBtn} title="Zoom to fit">Fit</button>
        <button
          onClick={() => { setLinkMode(!linkMode); setLinkChild(null); }}
          style={{ ...toolBtn, ...(linkMode ? { background: T.accentSoft, borderColor: T.accent + '40', color: T.accent } : {}) }}
          title="Link Parent mode"
        >Link</button>
      </div>

      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        nodeRelSize={1}
        nodeVal={(n) => nodeRadius(n) * nodeRadius(n)}
        nodeCanvasObject={paintNode}
        nodePointerAreaPaint={(node, color, ctx) => {
          const r = nodeRadius(node);
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + 4, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        linkCanvasObject={paintLink}
        linkDirectionalParticles={0}
        onNodeClick={handleNodeClick}
        onNodeHover={(node, prevNode) => {
          setHoveredNode(node || null);
          containerRef.current.style.cursor = node ? 'pointer' : 'default';
        }}
        onNodeDrag={(node) => { setHoveredNode(node); }}
        onNodeDragEnd={() => {}}
        onZoom={({ k }) => { currentZoom.current = k; }}
        cooldownTicks={80}
        d3AlphaDecay={0.03}
        d3VelocityDecay={0.35}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        backgroundColor={T.bg}
      />

      <Legend />
      <StatsBar stats={hierarchy.stats} visibleCount={visibleNodes.length} />
      <LinkModeBar active={linkMode} selectedChild={linkChild} onCancel={() => { setLinkMode(false); setLinkChild(null); }} />
      <Toast message={toast.message} type={toast.type} />

      {hoveredNode && (
        <Tooltip node={hoveredNode} x={tooltipPos.x} y={tooltipPos.y} />
      )}
    </div>
  );
}

const toolBtn = {
  padding: '6px 14px', borderRadius: T.radiusSm, border: `1px solid ${T.border}`,
  background: 'rgba(10,11,16,0.85)', color: T.textDim, fontSize: '12px',
  fontFamily: T.fontSans, cursor: 'pointer', fontWeight: 500,
  backdropFilter: 'blur(8px)',
};
