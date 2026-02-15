export const T = {
  // Backgrounds — layered depth
  bg: '#0a0b10',
  bgSubtle: '#0e1018',
  surface: 'rgba(18, 20, 31, 0.6)',
  surfaceSolid: '#12141f',
  surfaceHover: 'rgba(26, 29, 46, 0.8)',
  border: 'rgba(255, 255, 255, 0.06)',
  borderActive: 'rgba(139, 124, 246, 0.3)',

  // Text
  text: '#e8e9ed',
  textDim: '#6b7084',

  // Accent — soft violet
  accent: '#8b7cf6',
  accentHover: '#9d90f8',
  accentSoft: 'rgba(139, 124, 246, 0.1)',
  accentGlow: '0 0 40px rgba(139, 124, 246, 0.12)',

  // Priority
  critical: '#f47171',
  criticalSoft: 'rgba(244, 113, 113, 0.1)',
  high: '#f0a86e',
  highSoft: 'rgba(240, 168, 110, 0.1)',
  medium: '#e8d374',
  mediumSoft: 'rgba(232, 211, 116, 0.1)',
  low: '#7dd895',
  lowSoft: 'rgba(125, 216, 149, 0.1)',

  // Status
  open: '#7eb8f0',
  openSoft: 'rgba(126, 184, 240, 0.1)',
  inProgress: '#c48df0',
  inProgressSoft: 'rgba(196, 141, 240, 0.1)',
  inReview: '#f0a86e',
  inReviewSoft: 'rgba(240, 168, 110, 0.1)',
  done: '#7dd895',
  doneSoft: 'rgba(125, 216, 149, 0.1)',

  // Radii
  radius: '12px',
  radiusSm: '8px',
  radiusLg: '16px',
  radiusXl: '20px',
  radiusFull: '9999px',

  // Fonts
  font: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
  fontSans: "'Outfit', sans-serif",

  // Shadows & glows
  shadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
  shadowLg: '0 8px 40px rgba(0, 0, 0, 0.3)',

  // Transition curves
  ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};

// Glass effect mixin for inline styles
export const glass = {
  background: T.surface,
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: `1px solid ${T.border}`,
  boxShadow: T.shadow,
};

export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
export const STATUSES = ['Open', 'In Progress', 'In Review', 'Done'];

// Strip emojis and whitespace to get clean priority label
export function stripEmoji(p) {
  return p.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
}

function matchPriority(p) {
  const c = stripEmoji(p).toLowerCase();
  if (c === 'critical' || c === 'p1' || c === '1') return 'critical';
  if (c === 'high' || c === 'p2' || c === '2') return 'high';
  if (c === 'medium' || c === 'p3' || c === '3') return 'medium';
  if (c === 'low' || c === 'p4' || c === '4') return 'low';
  return null;
}

export const priorityColor = (p) =>
  ({ critical: T.critical, high: T.high, medium: T.medium, low: T.low }[matchPriority(p)] || T.textDim);

export const prioritySoft = (p) =>
  ({ critical: T.criticalSoft, high: T.highSoft, medium: T.mediumSoft, low: T.lowSoft }[matchPriority(p)] || 'transparent');

export const priorityDots = (p) =>
  ({ critical: 5, high: 4, medium: 3, low: 2 }[matchPriority(p)] || 1);

function matchStatus(s) {
  const c = s.toLowerCase().trim();
  if (c === 'done' || c === 'complete' || c === 'completed' || c === 'closed' || c === 'resolved') return 'done';
  if (c.includes('progress') || c === 'doing' || c === 'active' || c === 'started') return 'inProgress';
  if (c.includes('review') || c === 'qa' || c === 'testing') return 'inReview';
  if (c === 'open' || c === 'to do' || c === 'todo' || c === 'not started' || c === 'backlog' || c === 'new' || c === 'pending') return 'open';
  return null;
}

export const statusColor = (s) =>
  ({ done: T.done, inProgress: T.inProgress, inReview: T.inReview, open: T.open }[matchStatus(s)] || T.textDim);

export const statusSoft = (s) =>
  ({ done: T.doneSoft, inProgress: T.inProgressSoft, inReview: T.inReviewSoft, open: T.openSoft }[matchStatus(s)] || 'transparent');

const TYPE_COLORS = { bug: '#f47171', feature: '#8b7cf6', improve: '#5ec4ab' };
const SCOPE_COLORS = { epic: '#7dd895', story: '#6aabde', task: '#e8d374' };

export function typeColor(t) {
  if (!t) return T.textDim;
  return TYPE_COLORS[t.toLowerCase()] || T.textDim;
}

export function scopeColor(s) {
  if (!s) return T.textDim;
  return SCOPE_COLORS[s.toLowerCase()] || T.textDim;
}

export function formatDate(d) {
  if (!d) return null;
  return d.replace(/-/g, '/');
}

const PROJECT_PALETTE = ['#8b7cf6', '#5ec4ab', '#e09b6e', '#6aabde', '#dcc96e', '#c97ba5', '#5ec4bc', '#8894a0'];
const projectColorCache = {};
let colorIdx = 0;

export function projectColor(name) {
  if (!projectColorCache[name]) {
    projectColorCache[name] = PROJECT_PALETTE[colorIdx % PROJECT_PALETTE.length];
    colorIdx++;
  }
  return projectColorCache[name];
}
