const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'in', 'on', 'for', 'to', 'of', 'and', 'or', 'not',
  'with', 'from', 'by', 'at', 'it', 'its', 'be', 'as', 'has', 'was', 'are',
  'after', 'before', 'no', 'up', 'out',
]);

function tokenize(text) {
  return text.toLowerCase().split(/[\s\-_/,.;:!?()]+/).filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function jaccard(a, b) {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const t of setA) if (setB.has(t)) intersection++;
  return intersection / (setA.size + setB.size - intersection);
}

const RuleBasedProvider = {
  name: 'rule-based',
  suggest(item, candidates) {
    const itemTokens = tokenize(item.title);
    const itemTags = (item.tags || []).map((t) => t.toLowerCase());
    const itemScope = (item.scope || '').toLowerCase();

    return candidates.map((c) => {
      let score = 0;
      const reasons = [];

      // Token overlap
      const overlap = jaccard(itemTokens, tokenize(c.title));
      if (overlap > 0) {
        score += overlap;
        reasons.push('title match');
      }

      // Project match
      if (item.project && c.project && item.project === c.project) {
        score += 0.2;
        reasons.push('same project');
      }

      // Tag overlap
      const cTags = (c.tags || []).map((t) => t.toLowerCase());
      let tagOverlap = 0;
      for (const t of itemTags) if (cTags.includes(t)) tagOverlap++;
      if (tagOverlap > 0) {
        score += tagOverlap * 0.1;
        reasons.push('shared tags');
      }

      // Scope affinity: task → epic gets a boost
      if (itemScope === 'task' && (c.scope || '').toLowerCase() === 'epic') {
        score += 0.1;
        reasons.push('scope fit');
      }

      return {
        targetId: c.id,
        targetNotionId: c.notionId || c.id,
        targetTitle: c.title,
        targetScope: c.scope || '',
        score,
        reason: reasons.join(', ') || 'candidate',
      };
    });
  },
};

export function suggest(item, allBugs) {
  const candidates = allBugs.filter(
    (b) => b.id !== item.id && ['epic', 'story'].includes((b.scope || '').toLowerCase())
  );
  if (candidates.length === 0) return [];

  const results = RuleBasedProvider.suggest(item, candidates);
  return results
    .filter((s) => s.score >= 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
