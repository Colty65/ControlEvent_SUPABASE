import express from 'express';
import { asyncHandler } from './_async.js';
import { deleteImage, listImages, uploadImage } from '../services/ticket-images.service.js';

const router = express.Router();

router.get('/ticket-images', asyncHandler(async (req, res) => {
  res.json({ ok: true, images: await listImages(req.query.eventId || '') });
}));

router.post('/ticket-images', asyncHandler(async (req, res) => {
  res.json({ ok: true, image: await uploadImage(req.body || {}) });
}));

router.delete('/ticket-images', asyncHandler(async (req, res) => {
  res.json(await deleteImage({ eventId: req.query.eventId || '', key: req.query.key || '' }));
}));

export default router;
