import { health as dbHealth, saveStateToDb, stateFromDb } from '../lib/supabase-normalized.js';

export async function readState() {
  return stateFromDb();
}

export async function writeState(state) {
  await saveStateToDb(state || {});
  return { ok: true, savedAt: new Date().toISOString() };
}

export async function health() {
  return dbHealth();
}

export async function diagnostics() {
  const state = await readState();
  return {
    ok: true,
    backend: 'supabase-real-tables',
    stateBytes: Buffer.byteLength(JSON.stringify(state)),
    ticketImages: Object.keys(state.ticketImages || {}).length,
    collections: Object.fromEntries(
      ['eventos', 'personas', 'tiendas', 'productos', 'colaboradores', 'compras']
        .map(key => [key, (state[key] || []).length])
    )
  };
}
