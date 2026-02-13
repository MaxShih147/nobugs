import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getAllBugs, getBug, updateBugInNotion, createBugInNotion, getMeta } from './notion.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'nobugs', dataSource: 'notion', timestamp: new Date().toISOString() });
});

app.get('/api/bugs', async (req, res) => {
  try { res.json({ bugs: await getAllBugs() }); }
  catch (err) { console.error('Failed to fetch bugs:', err.message); res.status(500).json({ error: err.message }); }
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

app.listen(PORT, () => {
  console.log(`🛡️  nobugs API running on http://localhost:${PORT}`);
  console.log(`   Database ID: ${process.env.NOTION_DATABASE_ID?.slice(0, 8)}...`);
});
