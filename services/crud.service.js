import { applyCrudDeltas, deleteCrudRecord, upsertCrudRecord } from '../lib/supabase-normalized.js';

export function upsertRecord(collection, payload) {
  return upsertCrudRecord(collection, payload || {});
}

export function deleteRecord(collection, id) {
  return deleteCrudRecord(collection, id);
}

export function applyDeltas(payload) {
  return applyCrudDeltas(payload || {});
}
