import {
  deleteTicketImage as deleteTicketImageDb,
  imagesForEvent,
  uploadTicketImage as uploadTicketImageDb
} from '../lib/supabase-normalized.js';

export function listImages(eventId) {
  return imagesForEvent(eventId || '');
}

export async function uploadImage({ eventId, key, dataUrl } = {}) {
  if (!eventId || !key || !dataUrl) {
    const err = new Error('Faltan eventId, key o dataUrl.');
    err.status = 400;
    throw err;
  }
  return uploadTicketImageDb({ eventId, key, dataUrl });
}

export async function deleteImage({ eventId, key } = {}) {
  await deleteTicketImageDb({ eventId: eventId || '', key: key || '' });
  return { ok: true };
}
