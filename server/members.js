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

export function saveMemberMappings(mappings, updatedBy) {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  const data = {
    mappings,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  writeFileSync(MEMBERS_FILE, JSON.stringify(data, null, 2) + '\n');
  return data;
}

export function findMemberByEmail(email) {
  if (!email) return null;
  const { mappings } = getMemberMappings();
  const match = mappings.find(
    (m) => m.email && m.email.toLowerCase() === email.toLowerCase()
  );
  return match ? match.notionName : null;
}
