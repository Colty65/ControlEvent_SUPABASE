import express from 'express';
import { asyncHandler } from './_async.js';
import { applyDeltas, deleteRecord, upsertRecord } from '../services/crud.service.js';

const router = express.Router();

function hasExplicitWrite(req){
  return String(req.get('X-ControlEvent-Explicit-Write') || '') === '1' || req.body?.__explicitWrite === true || req.query?.explicit === '1';
}
function requireExplicitWrite(req){
  if(hasExplicitWrite(req)) return;
  const err = new Error('FIX21: escritura CRUD sin accion explicita bloqueada.');
  err.status = 409;
  throw err;
}

router.post('/crud/:collection', asyncHandler(async (req, res) => {
  requireExplicitWrite(req);
  res.json(await upsertRecord(req.params.collection, req.body || {}));
}));

router.put('/crud/:collection/:id', asyncHandler(async (req, res) => {
  requireExplicitWrite(req);
  res.json(await upsertRecord(req.params.collection, { ...(req.body || {}), id: req.params.id }));
}));

router.delete('/crud/:collection/:id', asyncHandler(async (req, res) => {
  requireExplicitWrite(req);
  res.json(await deleteRecord(req.params.collection, req.params.id));
}));

router.post('/crud-deltas', asyncHandler(async (req, res) => {
  const err = new Error('FIX21: /api/crud-deltas bloqueado. No se admiten deltas automaticos.');
  err.status = 409;
  throw err;
}));

export default router;
