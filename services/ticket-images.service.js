import {
  deleteTicketImage as deleteTicketImageDb,
  deleteTicketImagesForEvent as deleteTicketImagesForEventDb,
  imagesForEvent,
  uploadTicketImage as uploadTicketImageDb,
  cleanupStaleIngresoImages as cleanupStaleIngresoImagesDb
} from '../lib/supabase-normalized.js';

export function listImages(eventId) {
  return imagesForEvent(eventId || '');
}

export async function uploadImage({ eventId, key, dataUrl, eventSnapshot } = {}) {
  if (!eventId || !key || !dataUrl) {
    const err = new Error('Faltan eventId, key o dataUrl.');
    err.status = 400;
    throw err;
  }
  return uploadTicketImageDb({ eventId, key, dataUrl, eventSnapshot });
}

export async function deleteImage({ eventId, key } = {}) {
  const result = await deleteTicketImageDb({ eventId: eventId || '', key: key || '' });
  return { ok: true, ...(result || {}) };
}

export async function deleteEventImages({ eventId } = {}) {
  if (!eventId) {
    const err = new Error('Falta eventId para eliminar fotos del evento.');
    err.status = 400;
    throw err;
  }
  const result = await deleteTicketImagesForEventDb(eventId);
  return { ok: true, ...result };
}

export async function cleanupStaleIngresoImages({ dryRun = false } = {}) {
  return cleanupStaleIngresoImagesDb({ dryRun });
}
