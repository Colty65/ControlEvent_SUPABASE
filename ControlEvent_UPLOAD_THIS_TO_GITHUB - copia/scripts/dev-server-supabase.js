import 'dotenv/config';
import express from 'express';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  changePassword,
  deleteAccessUser,
  deleteTicketImage,
  getUsers,
  health,
  imagesForEvent,
  saveAccessUser,
  saveStateToDb,
  stateFromDb,
  uploadTicketImage
} from '../lib/supabase-normalized.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const ACCESS_FILE = path.join(DATA_DIR, 'access-users.json');
const NODE_MODULES_DIR = path.join(ROOT, 'node_modules');
const PORT = Number(process.env.PORT || 3030);

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return fallback; }
}
async function fallbackUsers() {
  return readJson(ACCESS_FILE, [
    { identificacion: 'admin', nombre: 'Administrador', clave: 'admin', nivel: 'GD' },
    { identificacion: 'rw', nombre: 'Usuario RW', clave: 'rw', nivel: 'RW' },
    { identificacion: 'ro', nombre: 'Usuario RO', clave: 'ro', nivel: 'RO' }
  ]);
}
function publicUser(user) {
  return { identificacion: user.identificacion, nombre: user.nombre, nivel: user.nivel, clave: user.clave || '' };
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '35mb' }));
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.get('/vendor/exceljs.min.js', async (req, res) => {
  const file = path.join(NODE_MODULES_DIR, 'exceljs', 'dist', 'exceljs.min.js');
  if (!fsSync.existsSync(file)) return res.status(404).type('text/plain').send('Falta ExcelJS. Ejecuta npm install y reinicia.');
  res.type('application/javascript; charset=utf-8');
  res.sendFile(file);
});
app.use('/uploads', express.static(path.join(ROOT, 'uploads'), { etag: false, maxAge: 0 }));
app.use(express.static(PUBLIC_DIR, { etag: false, maxAge: 0 }));

app.get('/api/bootstrap.js', (req, res) => {
  res.type('application/javascript; charset=utf-8');
  res.send('window.__CONTROL_EVENT_STATE__ = {};\nwindow.__CONTROL_EVENT_USER__ = null;\nwindow.__CONTROL_EVENT_BACKEND__ = "supabase-real-tables";\n');
});

app.get('/api/state', async (req, res) => {
  try { res.json(await stateFromDb()); }
  catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});
app.put('/api/state', async (req, res) => {
  try {
    await saveStateToDb(req.body || {});
    res.json({ ok: true, savedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[PUT /api/state]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { identificacion, clave } = req.body || {};
    const users = await getUsers(await fallbackUsers());
    const user = users.find(item => String(item.identificacion) === String(identificacion || ''));
    if (!user || String(user.clave || '') !== String(clave || '')) {
      return res.status(401).json({ ok: false, error: 'Identificacion o clave no validos.' });
    }
    res.json({ ok: true, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});
app.post('/api/change-password', async (req, res) => {
  try {
    await changePassword(req.body || {});
    res.json({ ok: true });
  } catch (err) {
    res.status(/clave/i.test(err.message) ? 401 : 500).json({ ok: false, error: err.message });
  }
});
app.get('/api/access-users', async (req, res) => {
  try { res.json({ ok: true, items: (await getUsers(await fallbackUsers())).map(publicUser) }); }
  catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});
app.post('/api/access-users', async (req, res) => {
  try { res.json({ ok: true, item: publicUser(await saveAccessUser(req.body || {})) }); }
  catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});
app.delete('/api/access-users/:identificacion', async (req, res) => {
  try {
    await deleteAccessUser(req.params.identificacion);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/ticket-images', async (req, res) => {
  try { res.json({ ok: true, images: await imagesForEvent(req.query.eventId || '') }); }
  catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});
app.post('/api/ticket-images', async (req, res) => {
  try {
    const { eventId, key, dataUrl } = req.body || {};
    if (!eventId || !key || !dataUrl) return res.status(400).json({ ok: false, error: 'Faltan eventId, key o dataUrl.' });
    res.json({ ok: true, image: await uploadTicketImage({ eventId, key, dataUrl }) });
  } catch (err) {
    console.error('[POST /api/ticket-images]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});
app.delete('/api/ticket-images', async (req, res) => {
  try {
    await deleteTicketImage({ eventId: req.query.eventId || '', key: req.query.key || '' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    const result = await health();
    res.status(result.ok ? 200 : 500).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, backend: 'supabase-real-tables', error: err.message });
  }
});
app.get('/api/diagnostics', async (req, res) => {
  try {
    const state = await stateFromDb();
    res.json({
      ok: true,
      backend: 'supabase-real-tables',
      stateBytes: Buffer.byteLength(JSON.stringify(state)),
      ticketImages: Object.keys(state.ticketImages || {}).length,
      collections: Object.fromEntries(['eventos', 'personas', 'tiendas', 'productos', 'colaboradores', 'compras'].map(key => [key, (state[key] || []).length]))
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('*', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

export default app;

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isDirectRun) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('ControlEvent v23.6.7 localhost + Supabase real tables');
    console.log(`Abre: http://localhost:${PORT}`);
    console.log(`Red local: http://TU_IP_LOCAL:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
  });
}
