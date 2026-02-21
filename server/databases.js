import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const DB_FILE = join(DATA_DIR, 'databases.json');

// Default PROP_MAP matching the original hardcoded values in notion.js
const DEFAULT_PROP_MAP = {
  title: 'Item',
  status: 'Status',
  priority: 'Priority',
  assignee: 'Engineers',
  sprint: 'Sprint',
  due: 'Due',
  type: 'Type',
  scope: 'Scope',
  size: 'Size',
  points: 'Points',
  parent: 'Parent item',
};

function readDatabasesFile() {
  try {
    const raw = readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeDatabasesFile(data) {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  data.updatedAt = new Date().toISOString();
  writeFileSync(DB_FILE, JSON.stringify(data, null, 2) + '\n');
  return data;
}

// Auto-migrate: if databases.json doesn't exist but NOTION_DATABASE_ID is set, create default entry
function ensureMigrated() {
  const existing = readDatabasesFile();
  if (existing) return existing;

  const envDbId = process.env.NOTION_DATABASE_ID;
  if (!envDbId) return { databases: [], updatedAt: new Date().toISOString() };

  const data = {
    databases: [
      {
        id: envDbId,
        name: 'Default',
        propMap: { ...DEFAULT_PROP_MAP },
        addedAt: new Date().toISOString(),
        addedBy: 'system (migrated from .env)',
      },
    ],
    updatedAt: new Date().toISOString(),
  };
  return writeDatabasesFile(data);
}

export function getDatabases() {
  const data = ensureMigrated();
  return data.databases || [];
}

export function saveDatabase(db, userEmail) {
  const data = ensureMigrated();
  const idx = data.databases.findIndex((d) => d.id === db.id);
  const entry = {
    id: db.id,
    name: db.name || 'Untitled',
    propMap: db.propMap || { ...DEFAULT_PROP_MAP },
    addedAt: idx >= 0 ? data.databases[idx].addedAt : new Date().toISOString(),
    addedBy: idx >= 0 ? data.databases[idx].addedBy : (userEmail || 'unknown'),
  };
  if (idx >= 0) {
    data.databases[idx] = entry;
  } else {
    data.databases.push(entry);
  }
  writeDatabasesFile(data);
  return entry;
}

export function deleteDatabase(dbId) {
  const data = ensureMigrated();
  data.databases = data.databases.filter((d) => d.id !== dbId);
  writeDatabasesFile(data);
}

export function getDatabasePropMap(dbId) {
  const databases = getDatabases();
  const db = databases.find((d) => d.id === dbId);
  if (db) return db.propMap;
  // Fallback to default if no mapping found
  return { ...DEFAULT_PROP_MAP };
}

export { DEFAULT_PROP_MAP };
