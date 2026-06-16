import { applyCrudDeltas, closeEventCorrectionCrud, deleteCrudRecord, openComprasCorrectionCrud, updateEventSituationCrud, upsertCrudRecord } from '../lib/supabase-normalized.js';

export function upsertRecord(collection, payload) {
  return upsertCrudRecord(collection, payload || {});
}

export function deleteRecord(collection, id, payload = {}) {
  return deleteCrudRecord(collection, id, payload || {});
}

export function applyDeltas(payload) {
  return applyCrudDeltas(payload || {});
}

export function updateEventSituation(id, situacion) {
  return updateEventSituationCrud(id, situacion);
}


export function openComprasCorrection(id, minutes, reason) {
  return openComprasCorrectionCrud(id, minutes, reason);
}

export function closeEventCorrection(id) {
  return closeEventCorrectionCrud(id);
}
