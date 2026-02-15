import { useState, useEffect } from 'react';
import { T, glass, projectColor, stripEmoji } from '../styles/tokens';
import { PriorityBadge, StatusBadge } from './ui';
import { fetchBug } from '../lib/api';

export default function BugDetail({ bug, onBack }) {
  const [description, setDescription] = useState(bug?.description || '');

  useEffect(() => {
    if (!bug) return;
    // If bug already has description (e.g. freshly created), use it
    if (bug.description) { setDescription(bug.description); return; }
    // Otherwise fetch full bug to get page content
    const id = bug.notionId || bug.id;
    fetchBug(id)
      .then((full) => { if (full?.description) setDescription(full.description); })
      .catch(() => {});
  }, [bug?.id]);

  if (!bug) return null;

  const fields = [
    ['Assignee', bug.assignee, null],
    bug.project ? ['Project', stripEmoji(bug.project), projectColor(bug.project)] : ['Type', stripEmoji(bug.type || '') || '\u2014', null],
    ['Sprint', bug.sprint || '\u2014', null],
    ['Due Date', bug.due || 'No due date', null],
    ['Created', bug.created, null],
    bug.tags ? ['Tags', bug.tags.join(', ') || '\u2014', null] : ['Scope', stripEmoji(bug.scope || '') || '\u2014', null],
  ];

  return (
    <div className="slide-in" style={{ padding: 32, maxWidth: 800 }}>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', color: T.accent, cursor: 'pointer',
        fontFamily: T.fontSans, fontSize: '13px', fontWeight: 500, marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 8,
        transition: `all 0.25s ${T.ease}`,
      }}>
        <span style={{ fontSize: '16px' }}>{'\u2190'}</span> Back to list
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <span style={{ fontFamily: T.font, fontSize: '14px', color: T.textDim }}>{bug.id}</span>
        <PriorityBadge priority={bug.priority} />
        <StatusBadge status={bug.status} />
      </div>

      <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: 28, lineHeight: 1.3, fontFamily: T.fontSans }}>{bug.title}</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
        {fields.map(([label, val, color]) => (
          <div key={label} style={{ ...glass, borderRadius: T.radius, padding: '14px 18px' }}>
            <div style={{
              fontSize: '11px', color: T.textDim, fontFamily: T.fontSans,
              textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6, fontWeight: 500,
            }}>{label}</div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: color || T.text, fontFamily: T.fontSans }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ ...glass, borderRadius: T.radiusLg, padding: '22px 26px' }}>
        <div style={{
          fontSize: '11px', color: T.textDim, fontFamily: T.fontSans,
          textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14, fontWeight: 500,
        }}>Description</div>
        {description ? (
          <pre style={{ fontFamily: T.font, fontSize: '13px', color: T.text, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{description}</pre>
        ) : (
          <span style={{ fontSize: '13px', color: T.textDim, fontFamily: T.fontSans, fontStyle: 'italic' }}>No description</span>
        )}
      </div>
    </div>
  );
}
