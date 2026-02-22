import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Default database ID from .env (used as fallback)
const defaultDatabaseId = process.env.NOTION_DATABASE_ID;

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

function extractRelation(prop) {
  if (!prop || prop.type !== 'relation' || !prop.relation?.length) return null;
  return prop.relation[0].id;
}

// ─── Value translation helpers ──────────────────────────────────────────────

// Notion → app (on read): translate raw Notion value to app display value
function translateValue(field, rawValue, valueMap) {
  if (!valueMap || !valueMap[field]) return rawValue;
  return valueMap[field][rawValue] || rawValue;
}

// App → Notion (on write): reverse-translate app display value to Notion value
function reverseTranslateValue(field, appValue, valueMap) {
  if (!valueMap || !valueMap[field]) return appValue;
  const fieldMap = valueMap[field];
  for (const [notionVal, appVal] of Object.entries(fieldMap)) {
    if (appVal === appValue) return notionVal;
  }
  return appValue;
}

// ─── Notion page → nobugs bug object ───────────────────────────────────────

function mapPageToBug(page, propMap, valueMap) {
  const p = page.properties;
  const vm = valueMap || {};
  return {
    id: `NB-${page.id.replace(/-/g, '').slice(-6).toUpperCase()}`,
    notionId: page.id,
    title: extractTitle(p[propMap.title]),
    status: translateValue('status', extractFirstMultiSelect(p[propMap.status]) || extractSelect(p[propMap.status]) || 'To do', vm),
    priority: translateValue('priority', extractSelect(p[propMap.priority]) || 'P4', vm),
    assignee: extractPerson(p[propMap.assignee]) || 'Unassigned',
    type: translateValue('type', extractSelect(p[propMap.type]) || '', vm),
    scope: translateValue('scope', extractSelect(p[propMap.scope]) || '', vm),
    size: translateValue('size', extractSelect(p[propMap.size]) || '', vm),
    points: extractNumber(p[propMap.points]),
    sprint: translateValue('sprint', extractFirstMultiSelect(p[propMap.sprint]) || extractSelect(p[propMap.sprint]) || '', vm),
    due: extractDate(p[propMap.due]),
    created: page.created_time.slice(0, 10),
    parentNotionId: extractRelation(p[propMap.parent]),
  };
}

// ─── CRUD operations ────────────────────────────────────────────────────────

export async function getAllBugs(dbId, propMap, valueMap) {
  const databaseId = dbId || defaultDatabaseId;
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
  return results.map((page) => mapPageToBug(page, propMap, valueMap));
}

function blockToText(block, depth) {
  const indent = '  '.repeat(depth);
  const rt = block[block.type]?.rich_text;
  const text = rt ? rt.map((t) => t.plain_text).join('') : '';

  switch (block.type) {
    case 'heading_1': return `# ${text}`;
    case 'heading_2': return `## ${text}`;
    case 'heading_3': return `### ${text}`;
    case 'paragraph': return text;
    case 'bulleted_list_item': return `${indent}- ${text}`;
    case 'numbered_list_item': return `${indent}1. ${text}`;
    case 'to_do': {
      const checked = block.to_do?.checked ? 'x' : ' ';
      return `${indent}- [${checked}] ${text}`;
    }
    case 'toggle': return `${indent}> ${text}`;
    case 'quote': return `> ${text}`;
    case 'callout': return `> ${text}`;
    case 'code': return `\`\`\`\n${text}\n\`\`\``;
    case 'divider': return '---';
    default: return text;
  }
}

async function fetchBlocksRecursive(blockId, depth = 0, maxDepth = 5) {
  const lines = [];
  let cursor;
  do {
    const res = await notion.blocks.children.list({
      block_id: blockId, page_size: 100, start_cursor: cursor,
    });
    for (const block of res.results) {
      const line = blockToText(block, depth);
      if (line) lines.push(line);
      if (block.has_children && depth < maxDepth) {
        const childLines = await fetchBlocksRecursive(block.id, depth + 1, maxDepth);
        lines.push(...childLines);
      }
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return lines;
}

async function fetchPageDescription(pageId) {
  try {
    const lines = await fetchBlocksRecursive(pageId);
    return lines.join('\n');
  } catch { return ''; }
}

export async function getBug(pageId, propMap, valueMap) {
  const page = await notion.pages.retrieve({ page_id: pageId });
  const bug = mapPageToBug(page, propMap, valueMap);
  bug.description = await fetchPageDescription(pageId);
  return bug;
}

export async function updateBugInNotion(pageId, updates, propMap, valueMap) {
  const vm = valueMap || {};
  const properties = {};
  if (updates.status) properties[propMap.status] = { multi_select: [{ name: reverseTranslateValue('status', updates.status, vm) }] };
  if (updates.priority) properties[propMap.priority] = { select: { name: reverseTranslateValue('priority', updates.priority, vm) } };
  if (updates.type) properties[propMap.type] = { select: { name: reverseTranslateValue('type', updates.type, vm) } };
  if (updates.scope) properties[propMap.scope] = { select: { name: reverseTranslateValue('scope', updates.scope, vm) } };
  if (updates.size) properties[propMap.size] = { select: { name: reverseTranslateValue('size', updates.size, vm) } };
  if (updates.sprint) properties[propMap.sprint] = { multi_select: [{ name: reverseTranslateValue('sprint', updates.sprint, vm) }] };
  if (updates.points !== undefined) properties[propMap.points] = { number: updates.points };
  if (updates.due !== undefined) {
    properties[propMap.due] = updates.due ? { date: { start: updates.due } } : { date: null };
  }
  if (updates.title) {
    properties[propMap.title] = { title: [{ text: { content: updates.title } }] };
  }
  if (updates.parentNotionId !== undefined) {
    properties[propMap.parent] = updates.parentNotionId
      ? { relation: [{ id: updates.parentNotionId }] }
      : { relation: [] };
  }
  const page = await notion.pages.update({ page_id: pageId, properties });
  return mapPageToBug(page, propMap, valueMap);
}

export async function createBugInNotion(dbId, propMap, bugData, valueMap) {
  const databaseId = dbId || defaultDatabaseId;
  const vm = valueMap || {};
  const properties = {
    [propMap.title]: { title: [{ text: { content: bugData.title } }] },
  };
  if (bugData.status) properties[propMap.status] = { multi_select: [{ name: reverseTranslateValue('status', bugData.status, vm) }] };
  if (bugData.priority) properties[propMap.priority] = { select: { name: reverseTranslateValue('priority', bugData.priority, vm) } };
  if (bugData.type) properties[propMap.type] = { select: { name: reverseTranslateValue('type', bugData.type, vm) } };
  if (bugData.scope) properties[propMap.scope] = { select: { name: reverseTranslateValue('scope', bugData.scope, vm) } };
  if (bugData.size) properties[propMap.size] = { select: { name: reverseTranslateValue('size', bugData.size, vm) } };
  if (bugData.sprint) properties[propMap.sprint] = { multi_select: [{ name: reverseTranslateValue('sprint', bugData.sprint, vm) }] };
  if (bugData.points !== undefined && bugData.points !== null) properties[propMap.points] = { number: bugData.points };
  if (bugData.due) properties[propMap.due] = { date: { start: bugData.due } };

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
  const bug = mapPageToBug(page, propMap, valueMap);
  bug.description = bugData.description || '';
  return bug;
}

export async function updatePageDescription(pageId, text) {
  // 1. Fetch existing blocks
  const existing = [];
  let cursor;
  do {
    const res = await notion.blocks.children.list({ block_id: pageId, page_size: 100, start_cursor: cursor });
    existing.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  // 2. Delete each block
  for (const block of existing) {
    await notion.blocks.delete({ block_id: block.id });
  }

  // 3. Create new blocks from text
  if (text && text.trim()) {
    const children = text.split('\n').map((line) => {
      if (line.startsWith('## ')) {
        return { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: line.slice(3) } }] } };
      }
      return { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: line } }] } };
    });
    // Notion limits append to 100 blocks at a time
    for (let i = 0; i < children.length; i += 100) {
      await notion.blocks.children.append({ block_id: pageId, children: children.slice(i, i + 100) });
    }
  }
}

export async function getMeta(dbId, propMap, valueMap) {
  const databaseId = dbId || defaultDatabaseId;
  const vm = valueMap || {};
  const db = await notion.databases.retrieve({ database_id: databaseId });
  const props = db.properties;
  const getOpts = (name, field) => {
    const prop = props[name];
    if (!prop) return [];
    let opts = [];
    if (prop.type === 'select') opts = prop.select.options.map((o) => o.name);
    else if (prop.type === 'status') opts = prop.status.options.map((o) => o.name);
    else if (prop.type === 'multi_select') opts = prop.multi_select.options.map((o) => o.name);
    return opts.map((v) => translateValue(field, v, vm));
  };
  return {
    statuses: getOpts(propMap.status, 'status'),
    priorities: getOpts(propMap.priority, 'priority'),
    types: getOpts(propMap.type, 'type'),
    scopes: getOpts(propMap.scope, 'scope'),
    sizes: getOpts(propMap.size, 'size'),
    sprints: getOpts(propMap.sprint, 'sprint'),
  };
}

export async function fetchDatabaseProperties(dbId) {
  const databaseId = dbId || defaultDatabaseId;
  const db = await notion.databases.retrieve({ database_id: databaseId });
  // Return property names with their types and options (for select-type fields)
  const properties = {};
  for (const [name, prop] of Object.entries(db.properties)) {
    const entry = { type: prop.type, name };
    if (prop.type === 'select') entry.options = prop.select.options.map((o) => o.name);
    else if (prop.type === 'status') entry.options = prop.status.options.map((o) => o.name);
    else if (prop.type === 'multi_select') entry.options = prop.multi_select.options.map((o) => o.name);
    properties[name] = entry;
  }
  return { title: db.title.map((t) => t.plain_text).join(''), properties };
}
