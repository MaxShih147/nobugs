import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;

// ─── Property name mapping ──────────────────────────────────────────────────
// Customize these to match YOUR Notion database property names.
const PROP_MAP = {
  title: 'Title',
  status: 'Status',
  priority: 'Priority',
  assignee: 'Assignee',
  project: 'Project',
  tags: 'Tags',
  sprint: 'Sprint',
  due: 'Due Date',
  description: 'Description',
};

// ─── Property extractors ────────────────────────────────────────────────────

function extractTitle(prop) {
  if (!prop || prop.type !== 'title') return '';
  return prop.title.map((t) => t.plain_text).join('');
}

function extractRichText(prop) {
  if (!prop || prop.type !== 'rich_text') return '';
  return prop.rich_text.map((t) => t.plain_text).join('');
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

function extractDate(prop) {
  if (!prop || prop.type !== 'date' || !prop.date) return null;
  return prop.date.start || null;
}

function extractPerson(prop) {
  if (!prop) return '';
  if (prop.type === 'people' && prop.people.length > 0) return prop.people[0].name || prop.people[0].id;
  if (prop.type === 'select') return prop.select?.name || '';
  return '';
}

// ─── Notion page → nobugs bug object ───────────────────────────────────────

function mapPageToBug(page) {
  const p = page.properties;
  return {
    id: `NB-${page.id.slice(0, 6).toUpperCase()}`,
    notionId: page.id,
    title: extractTitle(p[PROP_MAP.title]),
    status: extractSelect(p[PROP_MAP.status]) || 'Open',
    priority: extractSelect(p[PROP_MAP.priority]) || 'Medium',
    assignee: extractPerson(p[PROP_MAP.assignee]) || 'Unassigned',
    project: extractSelect(p[PROP_MAP.project]) || 'Uncategorized',
    tags: extractMultiSelect(p[PROP_MAP.tags]),
    sprint: extractSelect(p[PROP_MAP.sprint]) || '',
    due: extractDate(p[PROP_MAP.due]),
    description: extractRichText(p[PROP_MAP.description]),
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

export async function getBug(pageId) {
  const page = await notion.pages.retrieve({ page_id: pageId });
  return mapPageToBug(page);
}

export async function updateBugInNotion(pageId, updates) {
  const properties = {};
  if (updates.status) properties[PROP_MAP.status] = { select: { name: updates.status } };
  if (updates.priority) properties[PROP_MAP.priority] = { select: { name: updates.priority } };
  if (updates.assignee) properties[PROP_MAP.assignee] = { select: { name: updates.assignee } };
  if (updates.project) properties[PROP_MAP.project] = { select: { name: updates.project } };
  if (updates.sprint) properties[PROP_MAP.sprint] = { select: { name: updates.sprint } };
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
  if (bugData.status) properties[PROP_MAP.status] = { select: { name: bugData.status } };
  if (bugData.priority) properties[PROP_MAP.priority] = { select: { name: bugData.priority } };
  if (bugData.assignee) properties[PROP_MAP.assignee] = { select: { name: bugData.assignee } };
  if (bugData.project) properties[PROP_MAP.project] = { select: { name: bugData.project } };
  if (bugData.tags?.length) properties[PROP_MAP.tags] = { multi_select: bugData.tags.map((t) => ({ name: t })) };
  if (bugData.sprint) properties[PROP_MAP.sprint] = { select: { name: bugData.sprint } };
  if (bugData.due) properties[PROP_MAP.due] = { date: { start: bugData.due } };
  if (bugData.description) properties[PROP_MAP.description] = { rich_text: [{ text: { content: bugData.description } }] };

  const page = await notion.pages.create({ parent: { database_id: databaseId }, properties });
  return mapPageToBug(page);
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
    members: getOpts(PROP_MAP.assignee),
    projects: getOpts(PROP_MAP.project),
    sprints: getOpts(PROP_MAP.sprint),
    statuses: getOpts(PROP_MAP.status),
    priorities: getOpts(PROP_MAP.priority),
    tags: getOpts(PROP_MAP.tags),
  };
}
