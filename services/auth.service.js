import fs from 'fs/promises';
import { ACCESS_FILE } from '../server/paths.js';
import {
  changePassword as changePasswordDb,
  deleteAccessUser as deleteAccessUserDb,
  getUsers,
  saveAccessUser as saveAccessUserDb
} from '../lib/supabase-normalized.js';

async function readJson(file, fallback) {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return raw.trim() ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export async function fallbackUsers() {
  return readJson(ACCESS_FILE, [
    { identificacion: 'admin', nombre: 'Administrador', clave: 'admin', nivel: 'GD' },
    { identificacion: 'rw', nombre: 'Usuario RW', clave: 'rw', nivel: 'RW' },
    { identificacion: 'ro', nombre: 'Usuario RO', clave: 'ro', nivel: 'RO' }
  ]);
}

export function publicUser(user) {
  return {
    identificacion: user?.identificacion || '',
    nombre: user?.nombre || '',
    nivel: user?.nivel || 'RO',
    clave: user?.clave || ''
  };
}

export async function listUsers() {
  return (await getUsers(await fallbackUsers())).map(publicUser);
}

function normalizeIdent(value) {
  return String(value || '')
    .trim()
    .normalize('NFKC')
    .toUpperCase();
}

function normalizeClave(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\r?\n/g, '')
    .trim();
}

function sameIdent(a, b) {
  return normalizeIdent(a) === normalizeIdent(b);
}

function sameClave(stored, provided) {
  const rawStored = String(stored ?? '');
  const rawProvided = String(provided ?? '');
  return rawStored === rawProvided || normalizeClave(rawStored) === normalizeClave(rawProvided);
}

export async function login({ identificacion, clave } = {}) {
  const users = await getUsers(await fallbackUsers());
  const user = users.find(item => sameIdent(item.identificacion, identificacion));
  if (!user || !sameClave(user.clave, clave)) {
    const err = new Error('Identificacion o clave no validos.');
    err.status = 401;
    throw err;
  }
  return publicUser(user);
}

export async function changePassword(payload) {
  await changePasswordDb(payload || {});
  return { ok: true };
}

export async function saveAccessUser(payload) {
  return publicUser(await saveAccessUserDb(payload || {}));
}

export async function deleteAccessUser(identificacion) {
  await deleteAccessUserDb(identificacion);
  return { ok: true };
}
