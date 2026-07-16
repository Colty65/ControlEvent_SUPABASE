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
  const identificacion = user?.Identificacion ?? user?.identificacion ?? user?.IDENTIFICACION ?? '';
  const nombre = user?.Nombre ?? user?.nombre ?? user?.NOMBRE ?? '';
  const nivel = user?.Nivel ?? user?.nivel ?? user?.NIVEL ?? 'RO';
  const clave = user?.Clave ?? user?.clave ?? user?.CLAVE ?? '';
  return {
    identificacion,
    nombre,
    nivel,
    clave,
    // FIX10: conservar también los nombres reales de ce_acceso para Zuzu y Planificación Inicial.
    Identificacion: identificacion,
    Nombre: nombre,
    Nivel: nivel,
    ce_acceso: { Identificacion: identificacion, Nombre: nombre, Nivel: nivel }
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
