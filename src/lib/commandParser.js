const TYPE_SHORTCUTS = {
  '/b': 'Bug', '/bug': 'Bug',
  '/f': 'Feature', '/feature': 'Feature',
  '/i': 'Improve', '/improve': 'Improve',
};

const SCOPE_SHORTCUTS = {
  '#epic': 'Epic',
  '#story': 'Story',
  '#task': 'Task',
};

const PRIORITY_MAP = {
  'urgent': 'Critical', '0': 'Critical', 'p0': 'Critical', 'critical': 'Critical',
  'high': 'High', '1': 'High', 'p1': 'High',
  '2': 'Medium', 'medium': 'Medium', 'p2': 'Medium',
  'low': 'Low', '3': 'Low', 'p3': 'Low',
  '4': 'Low', 'p4': 'Low',
};

function fuzzyMatch(input, options) {
  if (!options || options.length === 0) return null;
  const lower = input.toLowerCase();
  const exact = options.find((o) => o.toLowerCase() === lower);
  if (exact) return exact;
  const starts = options.find((o) => o.toLowerCase().startsWith(lower));
  if (starts) return starts;
  const includes = options.find((o) => o.toLowerCase().includes(lower));
  return includes || null;
}

function parseDate(val) {
  // Full ISO date passthrough
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  // M/D format → current year
  const mdMatch = val.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (mdMatch) {
    const month = mdMatch[1].padStart(2, '0');
    const day = mdMatch[2].padStart(2, '0');
    return `2026-${month}-${day}`;
  }
  return null;
}

export function parseCommand(input, meta = {}) {
  const fields = {};
  const warnings = [];
  const titleParts = [];

  const tokens = input.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];
    const lower = token.toLowerCase();

    // Type shortcuts: /b, /f, /i, /bug, /feature, /improve
    if (TYPE_SHORTCUTS[lower]) {
      fields.type = TYPE_SHORTCUTS[lower];
      i++;
      continue;
    }

    // Scope shortcuts: #epic, #story, #task
    if (SCOPE_SHORTCUTS[lower]) {
      fields.scope = SCOPE_SHORTCUTS[lower];
      i++;
      continue;
    }

    // Slash commands that take a value
    if (token.startsWith('/') && token.length > 1) {
      const cmd = lower.slice(1);
      const val = tokens[i + 1];

      if (cmd === 'type' && val) {
        const matched = fuzzyMatch(val, meta.types);
        if (matched) { fields.type = matched; i += 2; continue; }
        // Try common types
        const common = fuzzyMatch(val, ['Bug', 'Feature', 'Improve']);
        if (common) { fields.type = common; i += 2; continue; }
        warnings.push(`Unknown type: ${val}`);
        i += 2; continue;
      }

      if (cmd === 'scope' && val) {
        const matched = fuzzyMatch(val, meta.scopes);
        if (matched) { fields.scope = matched; i += 2; continue; }
        const common = fuzzyMatch(val, ['Epic', 'Story', 'Task']);
        if (common) { fields.scope = common; i += 2; continue; }
        warnings.push(`Unknown scope: ${val}`);
        i += 2; continue;
      }

      if (cmd === 'p' && val) {
        const mapped = PRIORITY_MAP[val.toLowerCase()];
        if (mapped) { fields.priority = mapped; i += 2; continue; }
        // Try fuzzy against meta priorities
        const metaMatch = fuzzyMatch(val, meta.priorities);
        if (metaMatch) { fields.priority = metaMatch; i += 2; continue; }
        warnings.push(`Unknown priority: ${val}`);
        i += 2; continue;
      }

      if (cmd === 's' && val) {
        const matched = fuzzyMatch(val, meta.statuses);
        if (matched) { fields.status = matched; i += 2; continue; }
        warnings.push(`Unknown status: ${val}`);
        i += 2; continue;
      }

      if (cmd === 'who' && val) {
        const matched = fuzzyMatch(val, meta.members);
        if (matched) { fields.assignee = matched; i += 2; continue; }
        // Try matching against emails from admin mappings, resolve to notionName
        if (meta.memberMappings?.length > 0) {
          const lower = val.toLowerCase();
          const emailMatch = meta.memberMappings.find((m) =>
            m.email && m.email.toLowerCase().includes(lower)
          );
          if (emailMatch) { fields.assignee = emailMatch.name; i += 2; continue; }
        }
        warnings.push(`Unknown member: ${val}`);
        i += 2; continue;
      }

      if ((cmd === 'when' || cmd === 'due') && val) {
        const parsed = parseDate(val);
        if (parsed) { fields.due = parsed; i += 2; continue; }
        warnings.push(`Invalid date: ${val}`);
        i += 2; continue;
      }

      if (cmd === 'sprint' && val) {
        const matched = fuzzyMatch(val, meta.sprints);
        if (matched) { fields.sprint = matched; i += 2; continue; }
        warnings.push(`Unknown sprint: ${val}`);
        i += 2; continue;
      }

      if (cmd === 'pts' && val) {
        const num = Number(val);
        if (!isNaN(num) && num >= 0) { fields.points = num; i += 2; continue; }
        warnings.push(`Invalid points: ${val}`);
        i += 2; continue;
      }

      if (cmd === 'size' && val) {
        const matched = fuzzyMatch(val, meta.sizes);
        if (matched) { fields.size = matched; i += 2; continue; }
        warnings.push(`Unknown size: ${val}`);
        i += 2; continue;
      }

      if (cmd === 'project' && val) {
        const matched = fuzzyMatch(val, meta.projects);
        if (matched) { fields.project = matched; i += 2; continue; }
        warnings.push(`Unknown project: ${val}`);
        i += 2; continue;
      }

      // Unrecognized slash command — warning but keep in title
      warnings.push(`Unknown command: ${token}`);
      titleParts.push(token);
      i++;
      continue;
    }

    // Hash tags that aren't scope shortcuts — keep in title
    titleParts.push(token);
    i++;
  }

  const title = titleParts.join(' ').replace(/^"|"$/g, '').trim();

  return { title, fields, warnings };
}
