import { generateMockBugs, getMockRoadmaps, MOCK_MEMBERS, MOCK_PROJECTS, MOCK_SPRINTS, MOCK_TAGS } from './mockData';

const USE_MOCK = import.meta.env.VITE_DATA_SOURCE !== 'notion';
const API_BASE = '/api';

let mockBugs = null;

function getMockBugs() {
  if (!mockBugs) mockBugs = generateMockBugs();
  return mockBugs;
}

async function authFetch(url, options) {
  const res = await fetch(url, options);
  if (res.status === 401) {
    throw new Error('Not authenticated');
  }
  return res;
}

export async function fetchAuthStatus() {
  const res = await fetch('/auth/me');
  return res.json();
}

export async function logout() {
  await fetch('/auth/logout', { method: 'POST' });
  window.location.href = '/';
}

export async function fetchBugs() {
  if (USE_MOCK) return { bugs: getMockBugs() };
  const res = await authFetch(`${API_BASE}/bugs`);
  if (!res.ok) throw new Error(`Failed to fetch bugs: ${res.statusText}`);
  return res.json();
}

export async function fetchBug(id) {
  if (USE_MOCK) return getMockBugs().find((b) => b.id === id) || null;
  const res = await authFetch(`${API_BASE}/bugs/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch bug: ${res.statusText}`);
  return res.json();
}

export async function updateBug(id, updates) {
  if (USE_MOCK) {
    const bugs = getMockBugs();
    const idx = bugs.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error('Bug not found');
    bugs[idx] = { ...bugs[idx], ...updates };
    return bugs[idx];
  }
  const res = await authFetch(`${API_BASE}/bugs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Failed to update bug: ${res.statusText}`);
  return res.json();
}

export async function createBug(bug) {
  if (USE_MOCK) {
    const bugs = getMockBugs();
    const newBug = {
      ...bug,
      id: `NB-${String(bugs.length + 1).padStart(3, '0')}`,
      created: new Date().toISOString().slice(0, 10),
    };
    bugs.unshift(newBug);
    return newBug;
  }
  const res = await authFetch(`${API_BASE}/bugs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bug),
  });
  if (!res.ok) throw new Error(`Failed to create bug: ${res.statusText}`);
  return res.json();
}

export async function updateDescription(id, text) {
  if (USE_MOCK) {
    const bugs = getMockBugs();
    const bug = bugs.find((b) => b.id === id || b.notionId === id);
    if (bug) bug.description = text;
    return { ok: true };
  }
  const res = await authFetch(`${API_BASE}/bugs/${id}/description`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: text }),
  });
  if (!res.ok) throw new Error('Failed to update description');
  return res.json();
}

export async function fetchMembers() {
  if (USE_MOCK) {
    return { mappings: [], updatedAt: null, updatedBy: null };
  }
  const res = await authFetch(`${API_BASE}/members`);
  if (!res.ok) throw new Error(`Failed to fetch members: ${res.statusText}`);
  return res.json();
}

export async function saveMembers(mappings, discoveredNames) {
  if (USE_MOCK) {
    return { mappings, discoveredNames, updatedAt: new Date().toISOString(), updatedBy: 'mock' };
  }
  const res = await authFetch(`${API_BASE}/members`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mappings, discoveredNames }),
  });
  if (!res.ok) throw new Error(`Failed to save members: ${res.statusText}`);
  return res.json();
}

// --- Roadmap CRUD ---

export async function fetchRoadmaps() {
  if (USE_MOCK) return getMockRoadmaps();
  const res = await authFetch(`${API_BASE}/roadmaps`);
  if (!res.ok) throw new Error(`Failed to fetch roadmaps: ${res.statusText}`);
  return res.json();
}

export async function createRoadmapApi(data) {
  if (USE_MOCK) return { id: `r-mock${Date.now()}`, name: data.name || 'Untitled', description: data.description || '', milestones: [] };
  const res = await authFetch(`${API_BASE}/roadmaps`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create roadmap: ${res.statusText}`);
  return res.json();
}

export async function updateRoadmapApi(id, updates) {
  if (USE_MOCK) return { id, ...updates };
  const res = await authFetch(`${API_BASE}/roadmaps/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Failed to update roadmap: ${res.statusText}`);
  return res.json();
}

export async function deleteRoadmapApi(id) {
  if (USE_MOCK) return { ok: true };
  const res = await authFetch(`${API_BASE}/roadmaps/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete roadmap: ${res.statusText}`);
  return res.json();
}

export async function createMilestoneApi(roadmapId, data) {
  if (USE_MOCK) return { id: `m-mock${Date.now()}`, name: data.name || 'Untitled', description: data.description || '', targetDate: data.targetDate || null, epicIds: [] };
  const res = await authFetch(`${API_BASE}/roadmaps/${roadmapId}/milestones`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create milestone: ${res.statusText}`);
  return res.json();
}

export async function updateMilestoneApi(roadmapId, milestoneId, updates) {
  if (USE_MOCK) return { id: milestoneId, ...updates };
  const res = await authFetch(`${API_BASE}/roadmaps/${roadmapId}/milestones/${milestoneId}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Failed to update milestone: ${res.statusText}`);
  return res.json();
}

export async function deleteMilestoneApi(roadmapId, milestoneId) {
  if (USE_MOCK) return { ok: true };
  const res = await authFetch(`${API_BASE}/roadmaps/${roadmapId}/milestones/${milestoneId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete milestone: ${res.statusText}`);
  return res.json();
}

export async function fetchMeta() {
  if (USE_MOCK) {
    return {
      members: MOCK_MEMBERS,
      projects: MOCK_PROJECTS,
      sprints: MOCK_SPRINTS,
      statuses: ['Open', 'In Progress', 'In Review', 'Done'],
      priorities: ['Critical', 'High', 'Medium', 'Low'],
      tags: MOCK_TAGS,
    };
  }
  const res = await authFetch(`${API_BASE}/meta`);
  if (!res.ok) throw new Error(`Failed to fetch meta: ${res.statusText}`);
  return res.json();
}
