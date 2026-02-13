export const T = {
  bg: '#0f1117',
  surface: '#181b24',
  surfaceHover: '#1e2230',
  border: '#272c3a',
  text: '#e2e4ea',
  textDim: '#8b90a0',
  accent: '#6c5ce7',
  accentSoft: 'rgba(108,92,231,0.12)',
  critical: '#ff6b6b',
  criticalSoft: 'rgba(255,107,107,0.12)',
  high: '#ffa94d',
  highSoft: 'rgba(255,169,77,0.12)',
  medium: '#ffd43b',
  mediumSoft: 'rgba(255,212,59,0.12)',
  low: '#69db7c',
  lowSoft: 'rgba(105,219,124,0.12)',
  open: '#74c0fc',
  openSoft: 'rgba(116,192,252,0.12)',
  inProgress: '#da77f2',
  inProgressSoft: 'rgba(218,119,242,0.12)',
  inReview: '#ffa94d',
  inReviewSoft: 'rgba(255,169,77,0.12)',
  done: '#69db7c',
  doneSoft: 'rgba(105,219,124,0.12)',
  radius: '8px',
  radiusLg: '12px',
  font: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
  fontSans: "'DM Sans', 'Segoe UI', sans-serif",
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

const PROJECT_PALETTE = ['#6c5ce7', '#00b894', '#e17055', '#0984e3', '#fdcb6e', '#e84393', '#00cec9', '#636e72'];
const projectColorCache = {};
let colorIdx = 0;

export function projectColor(name) {
  if (!projectColorCache[name]) {
    projectColorCache[name] = PROJECT_PALETTE[colorIdx % PROJECT_PALETTE.length];
    colorIdx++;
  }
  return projectColorCache[name];
}
