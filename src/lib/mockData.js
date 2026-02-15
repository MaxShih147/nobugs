export const MOCK_MEMBERS = [
  'Alice Chen', 'Bob Kim', 'Carol Wu', 'David Lin',
  'Eva Park', 'Frank Hsu', 'Grace Liu', 'Henry Chang',
];

export const MOCK_PROJECTS = [
  'PayFlow', 'MobileApp', 'AdminPortal', 'DataPipeline',
  'AuthService', 'ChatBot', 'Analytics', 'DevTools',
];

export const MOCK_SPRINTS = [
  'Sprint 23 (Jan 20–Feb 2)',
  'Sprint 24 (Feb 3–Feb 16)',
  'Sprint 25 (Feb 17–Mar 2)',
  'Sprint 26 (Mar 3–Mar 16)',
];

export const MOCK_TAGS = ['UI', 'Backend', 'API', 'Performance', 'Security', 'Database', 'Auth', 'UX', 'Infra', 'Mobile'];
const STATUSES = ['Open', 'In Progress', 'In Review', 'Done'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const TYPES = ['Bug', 'Feature', 'Improve'];

const TITLES = [
  'Login button unresponsive on mobile Safari',
  'Payment fails with 3D Secure cards',
  'Dashboard charts not loading for admin users',
  'Memory leak in WebSocket connection handler',
  'JWT token refresh race condition',
  'Search results pagination offset error',
  'File upload crashes on files > 50MB',
  'Dark mode colors incorrect on settings page',
  'API rate limiter blocks legitimate requests',
  'Push notifications not delivered on Android 14',
  'CSV export includes deleted records',
  'Password reset email sent to wrong address',
  'Chatbot response timeout after 30 seconds',
  'Analytics event tracking missing user_id',
  'Database connection pool exhaustion under load',
  'OAuth callback URL mismatch in production',
  'Image thumbnails not generated for WEBP format',
  'Sidebar navigation state lost on page refresh',
  'Batch processing job fails silently on error',
  'Date picker shows wrong timezone for UTC users',
  'Form validation bypassed with special characters',
  'Slow query on user search (>5s response)',
  'Email template rendering broken in Outlook',
  'WebRTC connection drops after 10 minutes',
  'Role-based access control not enforced on API',
  'Cache invalidation missing for updated profiles',
  'Scroll position jumps on infinite scroll load',
  'Two-factor auth backup codes not generating',
  'Report generation OOM on large datasets',
  'Drag-and-drop reorder not persisting to DB',
  'SSO login loop with expired SAML assertion',
  'Webhook retry logic causes duplicate events',
  'Mobile keyboard covers input fields on iOS',
  'GraphQL N+1 query on nested comments',
  'Stripe webhook signature validation failing',
  'User avatar upload returns 413 in production',
  'Accessibility: screen reader skips modal content',
  'Cron job overlap causes double billing',
  'Real-time sync conflict resolution broken',
  'API docs swagger UI returns 404',
  'Log aggregation missing container metadata',
  'Feature flag evaluation inconsistent across pods',
  'Browser back button breaks checkout flow',
];

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateMockBugs() {
  const rand = seededRandom(42);
  return TITLES.map((title, i) => {
    const status = STATUSES[Math.floor(rand() * STATUSES.length)];
    const dueBase = new Date(2025, 1, 1 + Math.floor(rand() * 60));
    const createdBase = new Date(2025, 0, 10 + Math.floor(rand() * 30));

    return {
      id: `NB-${String(i + 1).padStart(3, '0')}`,
      title,
      status,
      priority: PRIORITIES[Math.floor(rand() * PRIORITIES.length)],
      assignee: MOCK_MEMBERS[Math.floor(rand() * MOCK_MEMBERS.length)],
      project: MOCK_PROJECTS[Math.floor(rand() * MOCK_PROJECTS.length)],
      tags: [
        MOCK_TAGS[Math.floor(rand() * MOCK_TAGS.length)],
        MOCK_TAGS[Math.floor(rand() * MOCK_TAGS.length)],
      ].filter((v, j, a) => a.indexOf(v) === j),
      type: TYPES[Math.floor(rand() * TYPES.length)],
      sprint: MOCK_SPRINTS[Math.floor(rand() * MOCK_SPRINTS.length)],
      created: createdBase.toISOString().slice(0, 10),
      due: status === 'Done' ? null : dueBase.toISOString().slice(0, 10),
      description: [
        'Steps to reproduce:',
        '1. Navigate to the relevant feature',
        '2. Perform the action described',
        '3. Observe the unexpected behavior',
        '',
        `Expected: Normal operation`,
        `Actual: ${title}`,
        '',
        'Environment: Production / Chrome 121',
      ].join('\n'),
    };
  });
}
