import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { findLocalUpload, localFileToDataUrl, saveStateToDb, upsertUsersFromArray } from '../lib/supabase-normalized.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const STATE_FILE = process.env.MIGRATE_STATE_FILE || path.join(ROOT, 'data', 'state.json');
const ACCESS_FILE = process.env.MIGRATE_ACCESS_FILE || path.join(ROOT, 'data', 'access-users.json');

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return fallback; }
}

async function inlineLocalTicketImages(state) {
  const refs = state.ticketImageRefs || {};
  state.ticketImages = { ...(state.ticketImages || {}) };
  const report = { found: 0, missing: [] };

  for (const [key, ref] of Object.entries(refs)) {
    if (state.ticketImages[key] && /^data:image\//.test(String(state.ticketImages[key]))) continue;
    const localFile = findLocalUpload(ROOT, ref);
    if (!localFile) {
      report.missing.push(key);
      continue;
    }
    state.ticketImages[key] = await localFileToDataUrl(localFile);
    report.found++;
  }
  return report;
}

async function main() {
  const state = await readJson(STATE_FILE, {});
  const users = await readJson(ACCESS_FILE, []);
  const imageReport = await inlineLocalTicketImages(state);
  const userCount = await upsertUsersFromArray(users);
  await saveStateToDb(state);

  console.log('Migracion v23.6.7 local -> Supabase real tables completada:');
  console.log(JSON.stringify({
    users: userCount,
    eventos: state.eventos?.length || 0,
    personas: state.personas?.length || 0,
    tiendas: state.tiendas?.length || 0,
    productos: state.productos?.length || 0,
    colaboradores: state.colaboradores?.length || 0,
    compras: state.compras?.length || 0,
    ticketImagesUploaded: imageReport.found,
    ticketImagesMissing: imageReport.missing
  }, null, 2));
}

main().catch(err => {
  console.error('[migrate-v23-local-to-supabase] ERROR:', err.message || err);
  process.exit(1);
});
