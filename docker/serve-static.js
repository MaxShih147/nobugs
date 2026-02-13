import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getAllBugs, getBug, updateBugInNotion, createBugInNotion, getMeta } from './server/notion.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API
app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'nobugs' }));
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

// Static frontend
app.use(express.static(join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(join(__dirname, 'dist', 'index.html')));

app.listen(PORT, '0.0.0.0', () => console.log(`🛡️  nobugs running on http://localhost:${PORT}`));
