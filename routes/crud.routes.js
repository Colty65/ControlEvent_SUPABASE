import express from 'express';
import { asyncHandler } from './_async.js';
import { upsertRecord } from '../services/crud.service.js';

const router = express.Router();

function hasExplicitWrite(req){
  return String(req.get('X-ControlEvent-Explicit-Write') || '') === '1' || req.body?.__explicitWrite === true || req.query?.explicit === '1';
}
function requireExplicitWrite(req){
  if(hasExplicitWrite(req)) return;
  const err = new Error('FIX22: escritura CRUD sin accion explicita bloqueada.');
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
  // FIX22: por contencion, ninguna baja se acepta desde CRUD generico hasta reimplantar
  // bajas boton-a-boton y verificadas. Esto impide perdidas por renders/caches/handlers viejos.
  const err = new Error('FIX22: bajas CRUD bloqueadas temporalmente por seguridad.');
  err.status = 409;
  throw err;
}));

router.post('/crud-deltas', asyncHandler(async (req, res) => {
  const err = new Error('FIX22: /api/crud-deltas bloqueado. No se admiten deltas automaticos.');
  err.status = 409;
  throw err;
}));

export default router;
