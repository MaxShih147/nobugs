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

// Maps input → P-number prefix to fuzzy match against meta.priorities
const PRIORITY_NUM_MAP = {
  'urgent': 'P1', '0': 'P1', 'p0': 'P1', 'critical': 'P1',
  '1': 'P1', 'p1': 'P1', 'high': 'P1',
  '2': 'P2', 'p2': 'P2',
  '3': 'P3', 'p3': 'P3', 'medium': 'P3',
  '4': 'P4', 'p4': 'P4', 'low': 'P4',
};

function stripEmoji(s) {
  return s.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE0F}]/gu, '').trim();
}

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

    // @name shortcut for /who
    if (token.startsWith('@') && token.length > 1) {
      const name = token.slice(1);
      const matched = fuzzyMatch(name, meta.members);
      if (matched) { fields.assignee = matched; i++; continue; }
      if (meta.memberMappings?.length > 0) {
        const lw = name.toLowerCase();
        const emailMatch = meta.memberMappings.find((m) =>
          m.email && m.email.toLowerCase().includes(lw)
        );
        if (emailMatch) { fields.assignee = emailMatch.name; i++; continue; }
      }
      warnings.push(`Unknown member: ${name}`);
      i++; continue;
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
        if (matched) { fields.scope = stripEmoji(matched); i += 2; continue; }
        const common = fuzzyMatch(val, ['Epic', 'Story', 'Task']);
        if (common) { fields.scope = common; i += 2; continue; }
        warnings.push(`Unknown scope: ${val}`);
        i += 2; continue;
      }

      if (cmd === 'p' && val) {
        const prefix = PRIORITY_NUM_MAP[val.toLowerCase()];
        if (prefix && meta.priorities?.length > 0) {
          // Find the meta priority that starts with the P-number prefix
          const match = meta.priorities.find((p) => p.toUpperCase().startsWith(prefix));
          if (match) { fields.priority = stripEmoji(match); i += 2; continue; }
        }
        // Fallback: fuzzy match directly against meta priorities
        const metaMatch = fuzzyMatch(val, meta.priorities);
        if (metaMatch) { fields.priority = stripEmoji(metaMatch); i += 2; continue; }
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

      if (cmd === 'due' && val) {
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
