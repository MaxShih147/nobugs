/**
 * Graph data model for the hierarchical network view.
 *
 * buildHierarchy(items) takes the flat bug list and returns:
 *   { nodesById, childrenById, rootIds, links, stats }
 *
 * Edge kind is always "parent" for now; designed to support
 * "related" | "blocks" later without rewriting.
 */

// ── helpers ──────────────────────────────────────────────────────────

function normalizeScope(s) {
  return (s || '').toLowerCase();
}

function normalizeType(t) {
  return (t || '').toLowerCase();
}

/** Count all visible descendants (recursive). */
function countDescendants(nodeId, childrenById) {
  const kids = childrenById[nodeId] || [];
  let count = kids.length;
  for (const kid of kids) count += countDescendants(kid, childrenById);
  return count;
}

/** Detect if adding parentId → childId creates a cycle. */
function wouldCycle(childId, parentId, childrenById) {
  // Walk ancestors of parentId; if we find childId, it's a cycle.
  const visited = new Set();
  let cur = parentId;
  while (cur) {
    if (cur === childId) return true;
    if (visited.has(cur)) return false; // already a cycle elsewhere
    visited.add(cur);
    // find parent of cur — we need reverse lookup
    // Since childrenById maps parent→children, we need parentById
    // This is handled at build time, so this function takes parentById too.
    break;
  }
  return false;
}

// ── main builder ─────────────────────────────────────────────────────

export function buildHierarchy(items) {
  const nodesById = {};
  const childrenById = {};
  const parentById = {};
  const links = [];

  // Pass 1: create nodes
  for (const item of items) {
    const nodeId = item.notionId || item.id;
    nodesById[nodeId] = {
      id: nodeId,
      shortId: item.id,
      title: item.title || '',
      scope: normalizeScope(item.scope),
      type: normalizeType(item.type),
      status: item.status || '',
      priority: item.priority || '',
      project: item.project || '',
      assignee: item.assignee || '',
      tags: item.tags || [],
      parentNotionId: item.parentNotionId || null,
      // graph state (defaults)
      visible: true,
      collapsed: false,
      childCount: 0,
      descendantCount: 0,
    };
    childrenById[nodeId] = [];
  }

  // Pass 2: build parent→child edges, detect cycles
  const warned = new Set();
  for (const id of Object.keys(nodesById)) {
    const node = nodesById[id];
    const pid = node.parentNotionId;
    if (!pid) continue;
    if (!nodesById[pid]) {
      // Parent not in dataset — treat as root
      node.parentNotionId = null;
      continue;
    }
    // Cycle detection: walk from pid up to root; if we hit id, it's a cycle
    if (detectCycle(id, pid, nodesById)) {
      if (!warned.has(id)) {
        console.warn(`[graphModel] Cycle detected: ${id} → ${pid}. Breaking link.`);
        warned.add(id);
      }
      node.parentNotionId = null;
      continue;
    }
    childrenById[pid].push(id);
    parentById[id] = pid;
    links.push({
      source: pid,
      target: id,
      kind: 'parent',
      level: edgeLevel(nodesById[pid], nodesById[id]),
    });
  }

  // Pass 3: compute child/descendant counts
  for (const id of Object.keys(nodesById)) {
    nodesById[id].childCount = (childrenById[id] || []).length;
    nodesById[id].descendantCount = countDescendants(id, childrenById);
  }

  // Root nodes = no parent
  const rootIds = Object.keys(nodesById).filter((id) => !nodesById[id].parentNotionId);

  // Stats
  const all = Object.values(nodesById);
  const stats = {
    total: all.length,
    epics: all.filter((n) => n.scope === 'epic').length,
    stories: all.filter((n) => n.scope === 'story').length,
    tasks: all.filter((n) => n.scope === 'task').length,
    unlinked: rootIds.filter((id) => nodesById[id].scope !== 'epic').length,
  };

  return { nodesById, childrenById, parentById, rootIds, links, stats };
}

// ── cycle detection ──────────────────────────────────────────────────

function detectCycle(childId, parentId, nodesById) {
  const visited = new Set();
  let cur = parentId;
  while (cur) {
    if (cur === childId) return true;
    if (visited.has(cur)) return false;
    visited.add(cur);
    cur = nodesById[cur]?.parentNotionId || null;
  }
  return false;
}

// ── edge helpers ─────────────────────────────────────────────────────

function edgeLevel(sourceNode, targetNode) {
  const ss = sourceNode.scope;
  const ts = targetNode.scope;
  if (ss === 'epic' && ts === 'story') return 'epic-story';
  if (ss === 'story' && ts === 'task') return 'story-task';
  if (ss === 'epic' && ts === 'task') return 'epic-task';
  return 'other';
}

// ── visible subgraph (used by Phases 2+3) ────────────────────────────

/**
 * Compute visible nodes and links given:
 *   - hierarchy from buildHierarchy
 *   - visibleEpics: Set of epic nodeIds to show (null = show all)
 *   - collapsedNodes: Set of nodeIds that are collapsed
 */
export function computeVisibleGraph(hierarchy, visibleEpics, collapsedNodes) {
  const { nodesById, childrenById, rootIds, links } = hierarchy;
  const visible = new Set();

  function walk(nodeId) {
    visible.add(nodeId);
    if (collapsedNodes.has(nodeId)) return; // children hidden
    for (const childId of (childrenById[nodeId] || [])) {
      walk(childId);
    }
  }

  for (const rootId of rootIds) {
    const node = nodesById[rootId];
    if (node.scope === 'epic') {
      if (visibleEpics && !visibleEpics.has(rootId)) continue;
      walk(rootId);
    } else {
      // Non-epic roots: show if their parent epic is visible, or if they're unlinked
      walk(rootId);
    }
  }

  // Compute hidden descendant counts for collapsed nodes
  const hiddenCounts = {};
  for (const nodeId of collapsedNodes) {
    if (visible.has(nodeId)) {
      hiddenCounts[nodeId] = countDescendants(nodeId, childrenById);
    }
  }

  const visibleNodes = [...visible].map((id) => ({
    ...nodesById[id],
    hiddenCount: hiddenCounts[id] || 0,
  }));

  const visibleSet = visible;
  const visibleLinks = links.filter(
    (l) => visibleSet.has(l.source) && visibleSet.has(l.target)
  );

  return { visibleNodes, visibleLinks, hiddenCounts };
}

// ── node radius helper ───────────────────────────────────────────────

const BASE_RADIUS = { epic: 24, story: 16, task: 10 };

export function nodeRadius(node) {
  const base = BASE_RADIUS[node.scope] || 10;
  const boost = 2 * Math.sqrt(node.descendantCount || node.childCount || 0);
  return Math.min(base + boost, 48);
}

// ── link styling helpers ─────────────────────────────────────────────

export function linkWidth(link) {
  if (link.level === 'epic-story') return 4;
  if (link.level === 'story-task') return 2;
  if (link.level === 'epic-task') return 3;
  return 1.5;
}

export function linkColor(link) {
  return 'rgba(139, 124, 246, 0.35)';
}

// ── validation for parent assignment (Phase 4) ───────────────────────

export function validateParentAssignment(childNode, parentNode, hierarchy) {
  if (!childNode || !parentNode) return { valid: false, reason: 'Missing node' };
  if (childNode.id === parentNode.id) return { valid: false, reason: 'Cannot parent to self' };

  const ps = parentNode.scope;
  const cs = childNode.scope;

  // Epics cannot have parents
  if (cs === 'epic') return { valid: false, reason: 'Epics cannot have a parent' };
  // Story parent must be epic
  if (cs === 'story' && ps !== 'epic') return { valid: false, reason: 'Story parent must be an epic' };
  // Task parent must be story or epic
  if (cs === 'task' && ps !== 'story' && ps !== 'epic') return { valid: false, reason: 'Task parent must be a story or epic' };

  // Cycle check
  if (detectCycle(parentNode.id, childNode.id, hierarchy.nodesById)) {
    return { valid: false, reason: 'Would create a cycle' };
  }

  return { valid: true, reason: null };
}
