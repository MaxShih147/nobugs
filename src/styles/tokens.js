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

export const priorityColor = (p) =>
  ({ Critical: T.critical, High: T.high, Medium: T.medium, Low: T.low }[p] || T.textDim);

export const prioritySoft = (p) =>
  ({ Critical: T.criticalSoft, High: T.highSoft, Medium: T.mediumSoft, Low: T.lowSoft }[p] || 'transparent');

export const statusColor = (s) =>
  ({ Open: T.open, 'In Progress': T.inProgress, 'In Review': T.inReview, Done: T.done }[s] || T.textDim);

export const statusSoft = (s) =>
  ({ Open: T.openSoft, 'In Progress': T.inProgressSoft, 'In Review': T.inReviewSoft, Done: T.doneSoft }[s] || 'transparent');

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
