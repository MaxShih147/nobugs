/**
 * Hierarchy builder for the Structure View.
 *
 * buildTree(items) => { nodesById, childrenById, parentById, roots, orphans, warnings, stats }
 *
 * Enforces:
 *  - epic: no parent allowed
 *  - story: parent must be epic
 *  - task (bug/improve at task level): parent must be story
 *  - no cycles
 */

function norm(s) { return (s || '').toLowerCase(); }

function countDescendants(id, childrenById) {
  const kids = childrenById[id] || [];
  let n = kids.length;
  for (const k of kids) n += countDescendants(k, childrenById);
  return n;
}

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

export function buildTree(items) {
  const nodesById = {};
  const childrenById = {};
  const parentById = {};
  const warnings = [];

  // Pass 1: create nodes
  for (const item of items) {
    const nodeId = item.notionId || item.id;
    if (!nodeId) continue;
    nodesById[nodeId] = {
      id: nodeId,
      shortId: item.id || nodeId,
      title: item.title || '',
      scope: norm(item.scope),
      type: norm(item.type),
      status: item.status || '',
      priority: item.priority || '',
      project: item.project || '',
      assignee: item.assignee || '',
      tags: item.tags || [],
      sprint: item.sprint || '',
      due: item.due || null,
      created: item.created || '',
      parentNotionId: item.parentNotionId || null,
      // derived (filled in pass 3)
      childCountDirect: 0,
      childCountTotal: 0,
      depth: 0,
      isOrphan: false,
    };
    childrenById[nodeId] = [];
  }

  // Pass 2: validate + build edges
  for (const id of Object.keys(nodesById)) {
    const node = nodesById[id];
    let pid = node.parentNotionId;

    // Epic: force no parent
    if (node.scope === 'epic' && pid) {
      warnings.push({ id, msg: `Epic "${node.title}" had a parent — removed` });
      node.parentNotionId = null;
      pid = null;
    }

    if (!pid) continue;

    // Parent missing from dataset
    if (!nodesById[pid]) {
      warnings.push({ id, msg: `Parent ${pid} not found for "${node.title}" — orphaned` });
      node.parentNotionId = null;
      continue;
    }

    // Cycle check
    if (detectCycle(id, pid, nodesById)) {
      warnings.push({ id, msg: `Cycle detected for "${node.title}" — link broken` });
      node.parentNotionId = null;
      continue;
    }

    const parentScope = nodesById[pid].scope;

    // Story must have epic parent
    if (node.scope === 'story' && parentScope !== 'epic') {
      warnings.push({ id, msg: `Story "${node.title}" parent is ${parentScope}, not epic — orphaned` });
      node.parentNotionId = null;
      continue;
    }

    // Task must have story parent (strict MVP)
    if (node.scope === 'task' && parentScope !== 'story') {
      warnings.push({ id, msg: `Task "${node.title}" parent is ${parentScope}, not story — orphaned` });
      node.parentNotionId = null;
      continue;
    }

    // Valid link
    childrenById[pid].push(id);
    parentById[id] = pid;
  }

  // Pass 3: compute derived fields
  const depthMap = { epic: 0, story: 1, task: 2 };
  for (const id of Object.keys(nodesById)) {
    const node = nodesById[id];
    node.childCountDirect = (childrenById[id] || []).length;
    node.childCountTotal = countDescendants(id, childrenById);
    node.depth = depthMap[node.scope] ?? 2;
    node.isOrphan = !node.parentNotionId && node.scope !== 'epic';
  }

  // Roots = epics (top-level)
  const roots = Object.keys(nodesById).filter((id) => nodesById[id].scope === 'epic');
  // Orphans = non-epic with no valid parent
  const orphans = Object.keys(nodesById).filter((id) => nodesById[id].isOrphan);

  const all = Object.values(nodesById);
  const stats = {
    total: all.length,
    epics: roots.length,
    stories: all.filter((n) => n.scope === 'story').length,
    tasks: all.filter((n) => n.scope === 'task').length,
    orphans: orphans.length,
  };

  return { nodesById, childrenById, parentById, roots, orphans, warnings, stats };
}

/**
 * Flatten tree into a display-order list (DFS), respecting collapsed state.
 * Returns [{ node, depth, hasChildren, isLast }]
 */
export function flattenTree(tree, collapsedSet) {
  const { nodesById, childrenById, roots, orphans } = tree;
  const rows = [];

  function walk(id, depth) {
    const node = nodesById[id];
    if (!node) return;
    const children = childrenById[id] || [];
    rows.push({ node, depth, hasChildren: children.length > 0 });
    if (!collapsedSet.has(id)) {
      for (const childId of children) walk(childId, depth + 1);
    }
  }

  // Epics first (sorted by title)
  const sortedRoots = [...roots].sort((a, b) =>
    (nodesById[a]?.title || '').localeCompare(nodesById[b]?.title || '')
  );
  for (const rootId of sortedRoots) walk(rootId, 0);

  return rows;
}

/**
 * Validate whether dragging `childId` onto `targetId` as new parent is allowed.
 */
export function validateDrop(childId, targetId, tree) {
  const { nodesById, childrenById } = tree;
  const child = nodesById[childId];
  const target = nodesById[targetId];
  if (!child || !target) return { valid: false, reason: 'Unknown node' };
  if (childId === targetId) return { valid: false, reason: 'Cannot parent to self' };

  // Scope rules
  if (child.scope === 'epic') return { valid: false, reason: 'Epics cannot have a parent' };
  if (child.scope === 'story' && target.scope !== 'epic') return { valid: false, reason: 'Story must be under an epic' };
  if (child.scope === 'task' && target.scope !== 'story') return { valid: false, reason: 'Task must be under a story' };

  // Cycle: target cannot be a descendant of child
  function isDescendant(ancestorId, candidateId) {
    for (const kid of (childrenById[ancestorId] || [])) {
      if (kid === candidateId) return true;
      if (isDescendant(kid, candidateId)) return true;
    }
    return false;
  }
  if (isDescendant(childId, targetId)) return { valid: false, reason: 'Would create a cycle' };

  // Already this parent
  if (child.parentNotionId === targetId) return { valid: false, reason: 'Already under this parent' };

  return { valid: true, reason: null };
}

/**
 * Get ancestor chain for a node (for search → expand-to-node).
 */
export function getAncestors(nodeId, parentById) {
  const chain = [];
  let cur = parentById[nodeId];
  while (cur) {
    chain.push(cur);
    cur = parentById[cur];
  }
  return chain;
}
