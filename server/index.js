import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getAllBugs, getBug, updateBugInNotion, createBugInNotion, getMeta, updatePageDescription, fetchDatabaseProperties } from './notion.js';
import { createAuthRouter, requireAuth, requireAdmin, isAuthEnabled } from './auth.js';
import { getMemberMappings, saveMemberMappings, cacheDiscoveredNames, getDiscoveredNames } from './members.js';
import { getDatabases, saveDatabase, deleteDatabase, getDatabasePropMap, getDatabaseValueMap, DEFAULT_PROP_MAP } from './databases.js';
import { getRoadmaps, createRoadmap, updateRoadmap, deleteRoadmap, createMilestone, updateMilestone, deleteMilestone } from './roadmaps.js';

const app = express();
app.set('trust proxy', 1); // Trust Cloudflare Tunnel proxy
const PORT = process.env.PORT || 4993;

const allowedOrigins = [
  'https://nobugs.max-the-solution.com',
  'http://localhost:4973',
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Rate limiting — strict on login, lighter on API
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 login attempts per window
  message: { error: 'Too many login attempts, try again in 15 minutes' },
});
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minute
  max: 100,                  // 100 API requests per minute
  message: { error: 'Too many requests, slow down' },
});

// Auth routes (unprotected, rate-limited)
app.use('/auth', authLimiter, createAuthRouter());

// Health check (unprotected)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'nobugs', dataSource: 'notion', authEnabled: isAuthEnabled(), timestamp: new Date().toISOString() });
});

// Protect all other API routes
app.use('/api', apiLimiter, requireAuth);

// ─── Database context middleware ────────────────────────────────────────────
// Extracts X-Database-ID header and loads the correct propMap for the request
app.use('/api', (req, res, next) => {
  const dbId = req.headers['x-database-id'] || process.env.NOTION_DATABASE_ID;
  req.dbId = dbId;
  req.propMap = getDatabasePropMap(dbId);
  req.valueMap = getDatabaseValueMap(dbId);
  next();
});

// ─── Database management routes ─────────────────────────────────────────────

app.get('/api/databases', (req, res) => {
  try {
    const databases = getDatabases();
    res.json({ databases });
  } catch (err) { console.error('Failed to fetch databases:', err.message); res.status(500).json({ error: err.message }); }
});

app.post('/api/databases', requireAdmin, async (req, res) => {
  try {
    const { id, name, propMap, valueMap } = req.body;
    if (!id) return res.status(400).json({ error: 'Database ID is required' });
    if (!name) return res.status(400).json({ error: 'Database name is required' });
    const entry = saveDatabase({ id, name, propMap: propMap || { ...DEFAULT_PROP_MAP }, valueMap: valueMap || {} }, req.user?.email);
    res.status(201).json(entry);
  } catch (err) { console.error('Failed to add database:', err.message); res.status(500).json({ error: err.message }); }
});

app.put('/api/databases/:id', requireAdmin, (req, res) => {
  try {
    const { name, propMap, valueMap } = req.body;
    const entry = saveDatabase({ id: req.params.id, name, propMap, valueMap: valueMap || {} }, req.user?.email);
    res.json(entry);
  } catch (err) { console.error('Failed to update database:', err.message); res.status(500).json({ error: err.message }); }
});

app.delete('/api/databases/:id', requireAdmin, (req, res) => {
  try {
    deleteDatabase(req.params.id);
    res.json({ ok: true });
  } catch (err) { console.error('Failed to delete database:', err.message); res.status(500).json({ error: err.message }); }
});

app.get('/api/databases/:id/properties', requireAdmin, async (req, res) => {
  try {
    const result = await fetchDatabaseProperties(req.params.id);
    res.json(result);
  } catch (err) { console.error('Failed to fetch database properties:', err.message); res.status(500).json({ error: err.message }); }
});

// ─── Bug routes (now use dynamic dbId + propMap) ────────────────────────────

app.get('/api/bugs', async (req, res) => {
  try {
    const bugs = await getAllBugs(req.dbId, req.propMap, req.valueMap);
    cacheDiscoveredNames(bugs);
    res.json({ bugs });
  } catch (err) { console.error('Failed to fetch bugs:', err.message); res.status(500).json({ error: err.message }); }
});

app.get('/api/bugs/:id', async (req, res) => {
  try { res.json(await getBug(req.params.id, req.propMap, req.valueMap)); }
  catch (err) { console.error('Failed to fetch bug:', err.message); res.status(500).json({ error: err.message }); }
});

app.patch('/api/bugs/:id', async (req, res) => {
  try { res.json(await updateBugInNotion(req.params.id, req.body, req.propMap, req.valueMap)); }
  catch (err) { console.error('Failed to update bug:', err.message); res.status(500).json({ error: err.message }); }
});

app.put('/api/bugs/:id/description', async (req, res) => {
  try {
    await updatePageDescription(req.params.id, req.body.description);
    res.json({ ok: true });
  } catch (err) { console.error('Failed to update description:', err.message); res.status(500).json({ error: err.message }); }
});

app.post('/api/bugs', async (req, res) => {
  try { res.status(201).json(await createBugInNotion(req.dbId, req.propMap, req.body, req.valueMap)); }
  catch (err) { console.error('Failed to create bug:', err.message); res.status(500).json({ error: err.message }); }
});

app.get('/api/meta', async (req, res) => {
  try {
    const meta = await getMeta(req.dbId, req.propMap, req.valueMap);
    // Include members from mappings + discovered names
    const { mappings } = getMemberMappings();
    const discovered = getDiscoveredNames();
    const nameSet = new Set(discovered);
    (mappings || []).forEach((m) => nameSet.add(m.notionName));
    meta.members = [...nameSet].sort();
    meta.memberMappings = (mappings || []).map((m) => ({ name: m.notionName, email: m.email }));
    res.json(meta);
  } catch (err) { console.error('Failed to fetch meta:', err.message); res.status(500).json({ error: err.message }); }
});

app.get('/api/members', (req, res) => {
  try {
    const saved = getMemberMappings();
    res.json({ ...saved, discoveredNames: getDiscoveredNames() });
  } catch (err) { console.error('Failed to fetch members:', err.message); res.status(500).json({ error: err.message }); }
});

app.put('/api/members', requireAdmin, (req, res) => {
  try {
    const { mappings, discoveredNames } = req.body;
    if (!Array.isArray(mappings)) return res.status(400).json({ error: 'mappings must be an array' });
    const result = saveMemberMappings(mappings, req.user?.email || 'unknown', discoveredNames);
    res.json(result);
  } catch (err) { console.error('Failed to save members:', err.message); res.status(500).json({ error: err.message }); }
});

// Roadmap CRUD
app.get('/api/roadmaps', (req, res) => {
  try { res.json(getRoadmaps()); }
  catch (err) { console.error('Failed to fetch roadmaps:', err.message); res.status(500).json({ error: err.message }); }
});

app.post('/api/roadmaps', (req, res) => {
  try { res.status(201).json(createRoadmap(req.body)); }
  catch (err) { console.error('Failed to create roadmap:', err.message); res.status(500).json({ error: err.message }); }
});

app.patch('/api/roadmaps/:id', (req, res) => {
  try { res.json(updateRoadmap(req.params.id, req.body)); }
  catch (err) { console.error('Failed to update roadmap:', err.message); res.status(500).json({ error: err.message }); }
});

app.delete('/api/roadmaps/:id', (req, res) => {
  try { deleteRoadmap(req.params.id); res.json({ ok: true }); }
  catch (err) { console.error('Failed to delete roadmap:', err.message); res.status(500).json({ error: err.message }); }
});

app.post('/api/roadmaps/:id/milestones', (req, res) => {
  try { res.status(201).json(createMilestone(req.params.id, req.body)); }
  catch (err) { console.error('Failed to create milestone:', err.message); res.status(500).json({ error: err.message }); }
});

app.patch('/api/roadmaps/:roadmapId/milestones/:milestoneId', (req, res) => {
  try { res.json(updateMilestone(req.params.roadmapId, req.params.milestoneId, req.body)); }
  catch (err) { console.error('Failed to update milestone:', err.message); res.status(500).json({ error: err.message }); }
});

app.delete('/api/roadmaps/:roadmapId/milestones/:milestoneId', (req, res) => {
  try { deleteMilestone(req.params.roadmapId, req.params.milestoneId); res.json({ ok: true }); }
  catch (err) { console.error('Failed to delete milestone:', err.message); res.status(500).json({ error: err.message }); }
});

// Production: serve static frontend build
const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => res.sendFile(join(distPath, 'index.html')));

app.listen(PORT, () => {
  console.log(`🛡️  nobugs running on http://localhost:${PORT}`);
  console.log(`   Database ID: ${process.env.NOTION_DATABASE_ID?.slice(0, 8)}...`);
  console.log(`   Auth: ${isAuthEnabled() ? 'enabled (Notion OAuth)' : 'disabled (open access)'}`);
});
