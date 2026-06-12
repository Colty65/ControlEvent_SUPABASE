import express from 'express';
import { asyncHandler } from './_async.js';
import { cleanupStaleIngresoImages, deleteEventImages, deleteImage, listImages, uploadImage } from '../services/ticket-images.service.js';

const router = express.Router();
const IMAGE_SCOPE = 'ticket-image-v8-5-fix23';

function requireFix23ImageWrite(req){
  if(String(req.get('X-ControlEvent-Write-Scope') || '') === IMAGE_SCOPE) return;
  const err = new Error('FIX23: escritura de imagen bloqueada. Solo se admite desde acción explícita de foto.');
  err.status = 409;
  throw err;
}
function requireManualCleanup(req){
  if(String(req.get('X-ControlEvent-Admin-Cleanup') || '') === '1' || String(req.query.manual || '') === '1') return;
  const err = new Error('FIX23: limpieza de imágenes bloqueada salvo ejecución manual marcada.');
  err.status = 409;
  throw err;
}

router.get('/ticket-images/cleanup-stale-ingresos', asyncHandler(async (req, res) => {
  requireManualCleanup(req);
  const dryRun = String(req.query.dryRun || '').toLowerCase();
  res.json(await cleanupStaleIngresoImages({ dryRun: dryRun === '1' || dryRun === 'true' || dryRun === 'yes' }));
}));

router.post('/ticket-images/cleanup-stale-ingresos', asyncHandler(async (req, res) => {
  requireManualCleanup(req);
  const body = req.body || {};
  const dryRun = String(req.query.dryRun || body.dryRun || '').toLowerCase();
  res.json(await cleanupStaleIngresoImages({ dryRun: dryRun === '1' || dryRun === 'true' || dryRun === 'yes' }));
}));

router.get('/ticket-images', asyncHandler(async (req, res) => {
  res.json({ ok: true, images: await listImages(req.query.eventId || '') });
}));

router.post('/ticket-images', asyncHandler(async (req, res) => {
  requireFix23ImageWrite(req);
  res.json({ ok: true, image: await uploadImage(req.body || {}) });
}));

router.delete('/ticket-images', asyncHandler(async (req, res) => {
  requireFix23ImageWrite(req);
  const body = req.body || {};
  const eventId = req.query.eventId || body.eventId || '';
  const key = req.query.key || body.key || '';
  const all = String(req.query.all || body.all || '').toLowerCase();
  if (eventId && (all === '1' || all === 'true' || all === 'event')) {
    res.json(await deleteEventImages({ eventId }));
    return;
  }
  res.json(await deleteImage({ eventId, key }));
}));

export default router;
