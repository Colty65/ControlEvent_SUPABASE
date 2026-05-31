import express from 'express';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(ROOT, 'uploads', 'ticket-images');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const ACCESS_FILE = path.join(DATA_DIR, 'access-users.json');
const NODE_MODULES_DIR = path.join(ROOT, 'node_modules');
const PORT = Number(process.env.PORT || 3030);

await fs.mkdir(DATA_DIR, { recursive: true });
await fs.mkdir(UPLOAD_DIR, { recursive: true });

async function ensureFile(file, fallback) {
  try { await fs.access(file); }
  catch { await fs.writeFile(file, JSON.stringify(fallback, null, 2), 'utf8'); }
}
await ensureFile(STATE_FILE, {});
await ensureFile(ACCESS_FILE, [
  { identificacion: 'admin', nombre: 'Administrador', clave: 'admin', nivel: 'GD' },
  { identificacion: 'rw', nombre: 'Usuario RW', clave: 'rw', nivel: 'RW' },
  { identificacion: 'ro', nombre: 'Usuario RO', clave: 'ro', nivel: 'RO' }
]);

async function readJson(file, fallback) {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return raw.trim() ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error('[readJson]', file, err.message);
    return fallback;
  }
}
async function writeJsonAtomic(file, value) {
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), 'utf8');
  await fs.rename(tmp, file);
}
function safeEventId(value) {
  return String(value || 'sin_evento').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}
function safeFilePart(value) {
  return Buffer.from(String(value || ''), 'utf8').toString('base64url');
}
function decodeFilePart(value) {
  try { return Buffer.from(String(value || ''), 'base64url').toString('utf8'); }
  catch { return ''; }
}
function parseDataUrl(dataUrl) {
  const s = String(dataUrl || '');
  const m = s.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) throw new Error('Imagen base64 no válida');
  const contentType = m[1];
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  return { contentType, ext, buffer: Buffer.from(m[2], 'base64') };
}
function publicPath(eventId, filename) {
  return `/uploads/ticket-images/${encodeURIComponent(eventId)}/${encodeURIComponent(filename)}`;
}
function imageUrlFor(req, eventId, filename) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers.host;
  return `${proto}://${host}${publicPath(eventId, filename)}`;
}
function publicUser(u) {
  return { identificacion: u.identificacion, nombre: u.nombre, nivel: u.nivel, clave: u.clave || '' };
}
function isDataUrl(v) { return /^data:image\//.test(String(v || '')); }
function eventIdFromTicketKey(fullKey) {
  const p = String(fullKey || '').split('|');
  return safeEventId(p[0] || 'sin_evento');
}
async function saveImageDataUrl(req, eventIdRaw, key, dataUrl) {
  const eventId = safeEventId(eventIdRaw);
  const img = parseDataUrl(dataUrl);
  const dir = path.join(UPLOAD_DIR, eventId);
  await fs.mkdir(dir, { recursive: true });
  const encoded = safeFilePart(key);
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    await fs.unlink(path.join(dir, `${encoded}.${ext}`)).catch(() => {});
  }
  const filename = `${encoded}.${img.ext}`;
  await fs.writeFile(path.join(dir, filename), img.buffer);
  return {
    key,
    url: imageUrlFor(req, eventId, filename),
    pathname: publicPath(eventId, filename),
    size: img.buffer.length,
    contentType: img.contentType,
    storedAt: new Date().toISOString()
  };
}
async function sanitizeState(req, rawState, { persist = false } = {}) {
  const state = rawState && typeof rawState === 'object' ? structuredClone(rawState) : {};
  const imgs = state.ticketImages && typeof state.ticketImages === 'object' ? state.ticketImages : {};
  let changed = false;
  const clean = {};
  for (const [key, value] of Object.entries(imgs)) {
    if (!value) continue;
    if (typeof value === 'string' && isDataUrl(value)) {
      try {
        const eventId = eventIdFromTicketKey(key);
        const saved = await saveImageDataUrl(req, eventId, key, value);
        clean[key] = saved.pathname;
        changed = true;
      } catch (err) {
        console.error('[sanitizeState] no se pudo migrar foto', key, err.message);
      }
    } else if (typeof value === 'string') {
      clean[key] = value;
    } else if (value && typeof value === 'object') {
      clean[key] = value.pathname || value.url || value.href || '';
    }
  }
  state.ticketImages = clean;
  delete state.__photoCache;
  delete state.ticketImagesBackup;
  delete state.ticketImageBackup;
  delete state.ticketImagesLocal;
  if (persist && changed) await writeJsonAtomic(STATE_FILE, state);
  return state;
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
  if (!fsSync.existsSync(file)) return res.status(404).type('text/plain').send('Falta ExcelJS. Ejecuta npm install y reinicia npm run dev.');
  res.type('application/javascript; charset=utf-8');
  res.sendFile(file);
});
app.use('/uploads', express.static(path.join(ROOT, 'uploads'), {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => res.setHeader('Cache-Control', 'no-store')
}));
app.use(express.static(PUBLIC_DIR, { etag: false, maxAge: 0 }));

app.get('/api/bootstrap.js', async (req, res) => {
  // Punto clave: NO cargar state.json antes del login.
  // Si enviamos {}, el frontend no tira de localStorage antiguo y el login queda ligero.
  res.type('application/javascript; charset=utf-8');
  res.send(`window.__CONTROL_EVENT_STATE__ = {};\nwindow.__CONTROL_EVENT_USER__ = null;\n`);
});

app.get('/api/state', async (req, res) => {
  const state = await sanitizeState(req, await readJson(STATE_FILE, {}), { persist: true });
  res.json(state);
});

app.put('/api/state', async (req, res) => {
  const incoming = req.body && typeof req.body === 'object' ? req.body : {};
  const state = await sanitizeState(req, incoming, { persist: false });
  await writeJsonAtomic(STATE_FILE, state);
  res.json({ ok: true, savedAt: new Date().toISOString() });
});

app.post('/api/login', async (req, res) => {
  const { identificacion, clave } = req.body || {};
  const users = await readJson(ACCESS_FILE, []);
  const user = users.find(u => String(u.identificacion || '') === String(identificacion || ''));
  if (!user || String(user.clave || '') !== String(clave || '')) {
    return res.status(401).json({ ok: false, error: 'Identificación o clave no válidos.' });
  }
  res.json({ ok: true, user: publicUser(user) });
});

app.post('/api/change-password', async (req, res) => {
  const { identificacion, claveActual, claveNueva, nuevaClave } = req.body || {};
  const newPass = claveNueva ?? nuevaClave;
  const users = await readJson(ACCESS_FILE, []);
  const user = users.find(u => String(u.identificacion || '') === String(identificacion || ''));
  if (!user || String(user.clave || '') !== String(claveActual || '')) return res.status(401).json({ ok: false, error: 'Clave actual no válida.' });
  if (!newPass) return res.status(400).json({ ok: false, error: 'La nueva clave es obligatoria.' });
  user.clave = String(newPass);
  await writeJsonAtomic(ACCESS_FILE, users);
  res.json({ ok: true });
});

app.get('/api/access-users', async (req, res) => {
  const users = await readJson(ACCESS_FILE, []);
  res.json({ ok: true, items: users.map(publicUser) });
});
app.post('/api/access-users', async (req, res) => {
  const { existingId, identificacion, nombre, clave, nivel } = req.body || {};
  const id = String(identificacion || '').trim();
  if (!id || !String(nombre || '').trim()) return res.status(400).json({ ok: false, error: 'Identificación y nombre son obligatorios.' });
  const users = await readJson(ACCESS_FILE, []);
  const oldId = String(existingId || '').trim();
  let user = users.find(u => String(u.identificacion || '') === (oldId || id));
  if (!user) {
    if (!clave) return res.status(400).json({ ok: false, error: 'La clave es obligatoria para nuevos usuarios.' });
    user = { identificacion: id, nombre: String(nombre).trim(), clave: String(clave), nivel: String(nivel || 'RO') };
    users.push(user);
  } else {
    user.identificacion = id;
    user.nombre = String(nombre).trim();
    user.nivel = String(nivel || user.nivel || 'RO');
    if (typeof clave === 'string' && clave.length > 0) user.clave = clave;
  }
  await writeJsonAtomic(ACCESS_FILE, users);
  res.json({ ok: true, item: publicUser(user) });
});
app.delete('/api/access-users/:identificacion', async (req, res) => {
  const id = String(req.params.identificacion || '');
  const users = await readJson(ACCESS_FILE, []);
  await writeJsonAtomic(ACCESS_FILE, users.filter(u => String(u.identificacion || '') !== id));
  res.json({ ok: true });
});

app.get('/api/ticket-images', async (req, res) => {
  const eventId = safeEventId(req.query.eventId);
  const dir = path.join(UPLOAD_DIR, eventId);
  const images = {};
  try {
    const files = await fs.readdir(dir);
    for (const file of files) {
      const ext = path.extname(file).slice(1).toLowerCase();
      if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) continue;
      const base = path.basename(file, path.extname(file));
      const key = decodeFilePart(base);
      if (!key) continue;
      images[key] = { key, url: imageUrlFor(req, eventId, file), pathname: publicPath(eventId, file) };
    }
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('[ticket-images GET]', err);
  }
  res.json({ ok: true, images });
});

app.post('/api/ticket-images', async (req, res) => {
  try {
    const eventId = safeEventId(req.body?.eventId);
    const key = String(req.body?.key || '').trim();
    if (!key) return res.status(400).json({ ok: false, error: 'Falta key de foto.' });
    const saved = await saveImageDataUrl(req, eventId, key, req.body?.dataUrl);
    res.json({ ok: true, image: saved });
  } catch (err) {
    console.error('[ticket-images POST]', err);
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

app.delete('/api/ticket-images', async (req, res) => {
  const eventId = safeEventId(req.query.eventId);
  const key = String(req.query.key || '').trim();
  if (!key) return res.status(400).json({ ok: false, error: 'Falta key de foto.' });
  const encoded = safeFilePart(key);
  const dir = path.join(UPLOAD_DIR, eventId);
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) await fs.unlink(path.join(dir, `${encoded}.${ext}`)).catch(() => {});
  res.json({ ok: true });
});

app.get('/api/diagnostics', async (req, res) => {
  const raw = await fs.readFile(STATE_FILE, 'utf8').catch(() => '{}');
  const state = await readJson(STATE_FILE, {});
  const imgLen = JSON.stringify(state.ticketImages || {}).length;
  res.json({ ok: true, stateBytes: Buffer.byteLength(raw), ticketImagesBytes: imgLen, ticketImages: Object.keys(state.ticketImages || {}).length });
});

app.get('*', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

app.listen(PORT, () => {
  console.log('ControlEvent v3.0_prod localhost JSON local');
  console.log(`Abre: http://localhost:${PORT}`);
  console.log('Usuarios: admin/admin, rw/rw, ro/ro');
  console.log(`Datos: ${DATA_DIR}`);
  console.log(`Fotos: ${UPLOAD_DIR}`);
});
