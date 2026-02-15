import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;

// ─── Property name mapping ──────────────────────────────────────────────────
// Customized to match the "Product Backlog - Test for NoBugs" database.
const PROP_MAP = {
  title: 'Item',
  status: 'Status',       // multi_select
  priority: 'Priority',   // select
  assignee: 'Engineers',   // people
  sprint: 'Sprint',       // multi_select
  due: 'Due',             // date
  type: 'Type',           // select: Bug, Improve, Feature
  scope: 'Scope',         // select: Epic, Story, Task
  size: 'Size',           // select: XL, L, M, S
  points: 'Points',       // number
};

// ─── Property extractors ────────────────────────────────────────────────────

function extractTitle(prop) {
  if (!prop || prop.type !== 'title') return '';
  return prop.title.map((t) => t.plain_text).join('');
}

function extractSelect(prop) {
  if (!prop) return '';
  if (prop.type === 'select') return prop.select?.name || '';
  if (prop.type === 'status') return prop.status?.name || '';
  return '';
}

function extractMultiSelect(prop) {
  if (!prop || prop.type !== 'multi_select') return [];
  return prop.multi_select.map((s) => s.name);
}

function extractFirstMultiSelect(prop) {
  const arr = extractMultiSelect(prop);
  return arr.length > 0 ? arr[0] : '';
}

function extractDate(prop) {
  if (!prop || prop.type !== 'date' || !prop.date) return null;
  return prop.date.start || null;
}

function extractPerson(prop) {
  if (!prop) return '';
  if (prop.type === 'people' && prop.people.length > 0) return prop.people[0].name || prop.people[0].id;
  return '';
}

function extractNumber(prop) {
  if (!prop || prop.type !== 'number') return null;
  return prop.number;
}

// ─── Notion page → nobugs bug object ───────────────────────────────────────

function mapPageToBug(page) {
  const p = page.properties;
  return {
    id: `NB-${page.id.replace(/-/g, '').slice(-6).toUpperCase()}`,
    notionId: page.id,
    title: extractTitle(p[PROP_MAP.title]),
    status: extractFirstMultiSelect(p[PROP_MAP.status]) || 'To do',
    priority: extractSelect(p[PROP_MAP.priority]) || 'P4',
    assignee: extractPerson(p[PROP_MAP.assignee]) || 'Unassigned',
    type: extractSelect(p[PROP_MAP.type]) || '',
    scope: extractSelect(p[PROP_MAP.scope]) || '',
    size: extractSelect(p[PROP_MAP.size]) || '',
    points: extractNumber(p[PROP_MAP.points]),
    sprint: extractFirstMultiSelect(p[PROP_MAP.sprint]) || '',
    due: extractDate(p[PROP_MAP.due]),
    created: page.created_time.slice(0, 10),
  };
}

// ─── CRUD operations ────────────────────────────────────────────────────────

export async function getAllBugs() {
  const results = [];
  let cursor = undefined;
  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });
    results.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);
  return results.map(mapPageToBug);
}

async function fetchPageDescription(pageId) {
  try {
    const blocks = await notion.blocks.children.list({ block_id: pageId, page_size: 100 });
    return blocks.results.map((b) => {
      if (b.type === 'heading_2') return `## ${b.heading_2.rich_text.map((t) => t.plain_text).join('')}`;
      if (b.type === 'paragraph') return b.paragraph.rich_text.map((t) => t.plain_text).join('');
      return '';
    }).join('\n');
  } catch { return ''; }
}

export async function getBug(pageId) {
  const page = await notion.pages.retrieve({ page_id: pageId });
  const bug = mapPageToBug(page);
  bug.description = await fetchPageDescription(pageId);
  return bug;
}

export async function updateBugInNotion(pageId, updates) {
  const properties = {};
  if (updates.status) properties[PROP_MAP.status] = { multi_select: [{ name: updates.status }] };
  if (updates.priority) properties[PROP_MAP.priority] = { select: { name: updates.priority } };
  if (updates.type) properties[PROP_MAP.type] = { select: { name: updates.type } };
  if (updates.scope) properties[PROP_MAP.scope] = { select: { name: updates.scope } };
  if (updates.size) properties[PROP_MAP.size] = { select: { name: updates.size } };
  if (updates.sprint) properties[PROP_MAP.sprint] = { multi_select: [{ name: updates.sprint }] };
  if (updates.points !== undefined) properties[PROP_MAP.points] = { number: updates.points };
  if (updates.due !== undefined) {
    properties[PROP_MAP.due] = updates.due ? { date: { start: updates.due } } : { date: null };
  }
  const page = await notion.pages.update({ page_id: pageId, properties });
  return mapPageToBug(page);
}

export async function createBugInNotion(bugData) {
  const properties = {
    [PROP_MAP.title]: { title: [{ text: { content: bugData.title } }] },
  };
  if (bugData.status) properties[PROP_MAP.status] = { multi_select: [{ name: bugData.status }] };
  if (bugData.priority) properties[PROP_MAP.priority] = { select: { name: bugData.priority } };
  if (bugData.type) properties[PROP_MAP.type] = { select: { name: bugData.type } };
  if (bugData.scope) properties[PROP_MAP.scope] = { select: { name: bugData.scope } };
  if (bugData.size) properties[PROP_MAP.size] = { select: { name: bugData.size } };
  if (bugData.sprint) properties[PROP_MAP.sprint] = { multi_select: [{ name: bugData.sprint }] };
  if (bugData.points !== undefined && bugData.points !== null) properties[PROP_MAP.points] = { number: bugData.points };
  if (bugData.due) properties[PROP_MAP.due] = { date: { start: bugData.due } };

  const createOpts = { parent: { database_id: databaseId }, properties };

  // Add description as page content blocks
  if (bugData.description) {
    createOpts.children = bugData.description.split('\n').map((line) => {
      if (line.startsWith('## ')) {
        return { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: line.slice(3) } }] } };
      }
      return { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: line } }] } };
    });
  }

  const page = await notion.pages.create(createOpts);
  const bug = mapPageToBug(page);
  bug.description = bugData.description || '';
  return bug;
}

export async function getMeta() {
  const db = await notion.databases.retrieve({ database_id: databaseId });
  const props = db.properties;
  const getOpts = (name) => {
    const prop = props[name];
    if (!prop) return [];
    if (prop.type === 'select') return prop.select.options.map((o) => o.name);
    if (prop.type === 'status') return prop.status.options.map((o) => o.name);
    if (prop.type === 'multi_select') return prop.multi_select.options.map((o) => o.name);
    return [];
  };
  return {
    statuses: getOpts(PROP_MAP.status),
    priorities: getOpts(PROP_MAP.priority),
    types: getOpts(PROP_MAP.type),
    scopes: getOpts(PROP_MAP.scope),
    sizes: getOpts(PROP_MAP.size),
    sprints: getOpts(PROP_MAP.sprint),
  };
}
