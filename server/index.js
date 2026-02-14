import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { getAllBugs, getBug, updateBugInNotion, createBugInNotion, getMeta } from './notion.js';
import { createAuthRouter, requireAuth, requireAdmin, isAuthEnabled } from './auth.js';
import { getMemberMappings, saveMemberMappings, cacheDiscoveredNames, getDiscoveredNames } from './members.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Auth routes (unprotected)
app.use('/auth', createAuthRouter());

// Health check (unprotected)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'nobugs', dataSource: 'notion', authEnabled: isAuthEnabled(), timestamp: new Date().toISOString() });
});

// Protect all other API routes
app.use('/api', requireAuth);

app.get('/api/bugs', async (req, res) => {
  try {
    const bugs = await getAllBugs();
    cacheDiscoveredNames(bugs);
    res.json({ bugs });
  } catch (err) { console.error('Failed to fetch bugs:', err.message); res.status(500).json({ error: err.message }); }
});

app.get('/api/bugs/:id', async (req, res) => {
  try { res.json(await getBug(req.params.id)); }
  catch (err) { console.error('Failed to fetch bug:', err.message); res.status(500).json({ error: err.message }); }
});

app.patch('/api/bugs/:id', async (req, res) => {
  try { res.json(await updateBugInNotion(req.params.id, req.body)); }
  catch (err) { console.error('Failed to update bug:', err.message); res.status(500).json({ error: err.message }); }
});

app.post('/api/bugs', async (req, res) => {
  try { res.status(201).json(await createBugInNotion(req.body)); }
  catch (err) { console.error('Failed to create bug:', err.message); res.status(500).json({ error: err.message }); }
});

app.get('/api/meta', async (req, res) => {
  try { res.json(await getMeta()); }
  catch (err) { console.error('Failed to fetch meta:', err.message); res.status(500).json({ error: err.message }); }
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

app.listen(PORT, () => {
  console.log(`🛡️  nobugs API running on http://localhost:${PORT}`);
  console.log(`   Database ID: ${process.env.NOTION_DATABASE_ID?.slice(0, 8)}...`);
  console.log(`   Auth: ${isAuthEnabled() ? 'enabled (Notion OAuth)' : 'disabled (open access)'}`);
});
