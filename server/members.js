import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const MEMBERS_FILE = join(DATA_DIR, 'members.json');

const EMPTY = { mappings: [], updatedAt: null, updatedBy: null };

export function getMemberMappings() {
  try {
    const raw = readFileSync(MEMBERS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { ...EMPTY };
  }
}

export function saveMemberMappings(mappings, updatedBy, discoveredNames) {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  const data = {
    mappings,
    discoveredNames: discoveredNames || [],
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  writeFileSync(MEMBERS_FILE, JSON.stringify(data, null, 2) + '\n');
  return data;
}

// In-memory cache of names discovered from bug assignees
let discoveredNamesCache = [];

export function cacheDiscoveredNames(bugs) {
  const nameSet = new Set();
  (bugs || []).forEach((b) => { if (b.assignee) nameSet.add(b.assignee); });
  discoveredNamesCache = [...nameSet].sort();
}

export function getDiscoveredNames() {
  // Return in-memory cache first, fall back to file cache
  if (discoveredNamesCache.length > 0) return discoveredNamesCache;
  const { discoveredNames } = getMemberMappings();
  return discoveredNames || [];
}

export function findMemberByEmail(email) {
  if (!email) return null;
  const { mappings } = getMemberMappings();
  const match = mappings.find(
    (m) => m.email && m.email.toLowerCase() === email.toLowerCase()
  );
  return match ? match.notionName : null;
}
