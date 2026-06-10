import express from 'express';
import { asyncHandler } from './_async.js';
import { deleteEventImages, deleteImage, listImages, uploadImage } from '../services/ticket-images.service.js';

const router = express.Router();

router.get('/ticket-images', asyncHandler(async (req, res) => {
  res.json({ ok: true, images: await listImages(req.query.eventId || '') });
}));

router.post('/ticket-images', asyncHandler(async (req, res) => {
  res.json({ ok: true, image: await uploadImage(req.body || {}) });
}));

router.delete('/ticket-images', asyncHandler(async (req, res) => {
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
