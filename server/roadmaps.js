import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const ROADMAPS_FILE = join(DATA_DIR, 'roadmaps.json');

const EMPTY = { roadmaps: [] };

function readData() {
  try {
    const raw = readFileSync(ROADMAPS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { ...EMPTY, roadmaps: [] };
  }
}

function writeData(data) {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  writeFileSync(ROADMAPS_FILE, JSON.stringify(data, null, 2) + '\n');
}

export function getRoadmaps() {
  return readData().roadmaps;
}

export function createRoadmap({ name, description }) {
  const data = readData();
  const roadmap = {
    id: `r-${randomUUID().slice(0, 8)}`,
    name: name || 'Untitled Roadmap',
    description: description || '',
    milestones: [],
  };
  data.roadmaps.push(roadmap);
  writeData(data);
  return roadmap;
}

export function updateRoadmap(id, updates) {
  const data = readData();
  const idx = data.roadmaps.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error('Roadmap not found');
  const allowed = ['name', 'description', 'milestones'];
  for (const key of allowed) {
    if (updates[key] !== undefined) data.roadmaps[idx][key] = updates[key];
  }
  writeData(data);
  return data.roadmaps[idx];
}

export function deleteRoadmap(id) {
  const data = readData();
  const idx = data.roadmaps.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error('Roadmap not found');
  data.roadmaps.splice(idx, 1);
  writeData(data);
}

export function createMilestone(roadmapId, { name, description, targetDate }) {
  const data = readData();
  const roadmap = data.roadmaps.find((r) => r.id === roadmapId);
  if (!roadmap) throw new Error('Roadmap not found');
  const milestone = {
    id: `m-${randomUUID().slice(0, 8)}`,
    name: name || 'Untitled Milestone',
    description: description || '',
    targetDate: targetDate || null,
    epicIds: [],
  };
  roadmap.milestones.push(milestone);
  writeData(data);
  return milestone;
}

export function updateMilestone(roadmapId, milestoneId, updates) {
  const data = readData();
  const roadmap = data.roadmaps.find((r) => r.id === roadmapId);
  if (!roadmap) throw new Error('Roadmap not found');
  const idx = roadmap.milestones.findIndex((m) => m.id === milestoneId);
  if (idx === -1) throw new Error('Milestone not found');
  const allowed = ['name', 'description', 'targetDate', 'epicIds'];
  for (const key of allowed) {
    if (updates[key] !== undefined) roadmap.milestones[idx][key] = updates[key];
  }
  writeData(data);
  return roadmap.milestones[idx];
}

export function deleteMilestone(roadmapId, milestoneId) {
  const data = readData();
  const roadmap = data.roadmaps.find((r) => r.id === roadmapId);
  if (!roadmap) throw new Error('Roadmap not found');
  const idx = roadmap.milestones.findIndex((m) => m.id === milestoneId);
  if (idx === -1) throw new Error('Milestone not found');
  roadmap.milestones.splice(idx, 1);
  writeData(data);
}
