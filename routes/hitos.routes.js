import express from 'express';
import { asyncHandler } from './_async.js';
import { deleteHito, deleteLg, listHitos, saveHito, saveLg, toggleLg } from '../services/hitos.service.js';

const router = express.Router();

router.get('/hitos', asyncHandler(async (req, res) => {
  res.json(await listHitos(req.query.eventId || req.query.event_id));
}));

router.post('/hitos', asyncHandler(async (req, res) => {
  res.json(await saveHito(null, req.body || {}));
}));

router.put('/hitos/:id', asyncHandler(async (req, res) => {
  res.json(await saveHito(req.params.id, req.body || {}));
}));

router.delete('/hitos/:id', asyncHandler(async (req, res) => {
  res.json(await deleteHito(req.params.id));
}));

router.post('/lg', asyncHandler(async (req, res) => {
  res.json(await saveLg(null, req.body || {}));
}));

router.put('/lg/:id', asyncHandler(async (req, res) => {
  res.json(await saveLg(req.params.id, req.body || {}));
}));

router.patch('/lg/:id/cumplida', asyncHandler(async (req, res) => {
  res.json(await toggleLg(req.params.id, req.body?.cumplida));
}));

router.delete('/lg/:id', asyncHandler(async (req, res) => {
  res.json(await deleteLg(req.params.id));
}));

export default router;
