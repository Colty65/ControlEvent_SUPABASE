import express from 'express';
import { asyncHandler } from './_async.js';
import { deleteHito, deleteLg, listHitos, saveHito, saveLg, toggleLg } from '../services/hitos.service.js';

const router = express.Router();

function actorFromRequest(req){
  const raw = String(req.get('X-ControlEvent-Actor') || '').trim();
  if(!raw) return {};
  try{ return JSON.parse(decodeURIComponent(raw)); }catch(_){ return {}; }
}

router.get('/hitos', asyncHandler(async (req, res) => {
  res.json(await listHitos(req.query.eventId || req.query.event_id));
}));

router.post('/hitos', asyncHandler(async (req, res) => {
  res.json(await saveHito(null, req.body || {}, actorFromRequest(req)));
}));

router.put('/hitos/:id', asyncHandler(async (req, res) => {
  res.json(await saveHito(req.params.id, req.body || {}, actorFromRequest(req)));
}));

router.delete('/hitos/:id', asyncHandler(async (req, res) => {
  res.json(await deleteHito(req.params.id, actorFromRequest(req)));
}));

router.post('/lg', asyncHandler(async (req, res) => {
  res.json(await saveLg(null, req.body || {}, actorFromRequest(req)));
}));

router.put('/lg/:id', asyncHandler(async (req, res) => {
  res.json(await saveLg(req.params.id, req.body || {}, actorFromRequest(req)));
}));

router.patch('/lg/:id/cumplida', asyncHandler(async (req, res) => {
  res.json(await toggleLg(req.params.id, req.body?.cumplida, actorFromRequest(req)));
}));

router.delete('/lg/:id', asyncHandler(async (req, res) => {
  res.json(await deleteLg(req.params.id, actorFromRequest(req)));
}));

export default router;
