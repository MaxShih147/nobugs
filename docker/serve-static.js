import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getAllBugs, getBug, updateBugInNotion, createBugInNotion, getMeta } from './server/notion.js';
import { createAuthRouter, requireAuth, isAuthEnabled } from './server/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Auth routes (unprotected)
app.use('/auth', createAuthRouter());

// API
app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'nobugs', authEnabled: isAuthEnabled() }));

// Protect all other API routes
app.use('/api', requireAuth);

app.get('/api/bugs', async (req, res) => {
  try { res.json({ bugs: await getAllBugs() }); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/bugs/:id', async (req, res) => {
  try { res.json(await getBug(req.params.id)); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.patch('/api/bugs/:id', async (req, res) => {
  try { res.json(await updateBugInNotion(req.params.id, req.body)); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/bugs', async (req, res) => {
  try { res.status(201).json(await createBugInNotion(req.body)); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/meta', async (req, res) => {
  try { res.json(await getMeta()); } catch (err) { res.status(500).json({ error: err.message }); }
});

// Static frontend — assets served without auth so login page renders
app.use(express.static(join(__dirname, 'dist')));

// SPA catch-all — protected so unauthenticated users get redirected
app.get('*', requireAuth, (req, res) => res.sendFile(join(__dirname, 'dist', 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🛡️  nobugs running on http://localhost:${PORT}`);
  console.log(`   Auth: ${isAuthEnabled() ? 'enabled (Notion OAuth)' : 'disabled (open access)'}`);
});
