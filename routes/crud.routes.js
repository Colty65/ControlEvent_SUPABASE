import express from 'express';
import { asyncHandler } from './_async.js';
import { deleteRecord, updateEventSituation, upsertRecord } from '../services/crud.service.js';

const router = express.Router();

const WRITE_SCOPES = new Set(['row-crud-v8-5-fix28', 'row-crud-v8-5-fix27', 'row-crud-v8-5-fix26', 'row-crud-v8-5-fix23']);
const COLLECTIONS = new Set(['eventos','personas','tiendas','productos','colaboradores','compras']);

function requireRowWrite(req){
  const scope = String(req.get('X-ControlEvent-Write-Scope') || '');
  const rowOnly = req.body?.__crudRowOnly === true || String(req.get('X-ControlEvent-Row-Only') || '') === '1';
  if(WRITE_SCOPES.has(scope) && rowOnly) return;
  const err = new Error('FIX28: escritura bloqueada. Solo se admite CRUD explícito fila-a-fila.');
  err.status = 409;
  throw err;
}
function cleanBody(body){
  const out = {...(body || {})};
  delete out.__crudRowOnly;
  delete out.__explicitWrite;
  delete out.__explicitWriteReason;
  return out;
}
function collection(req){
  const c = String(req.params.collection || '').trim();
  if(!COLLECTIONS.has(c)){
    const err = new Error('FIX28: colección CRUD no permitida: ' + c);
    err.status = 400;
    throw err;
  }
  return c;
}

router.put('/crud/eventos/:id/situacion', asyncHandler(async (req, res) => {
  requireRowWrite(req);
  res.json(await updateEventSituation(req.params.id, req.body?.situacion));
}));

router.post('/crud/:collection', asyncHandler(async (req, res) => {
  requireRowWrite(req);
  res.json(await upsertRecord(collection(req), cleanBody(req.body)));
}));

router.put('/crud/:collection/:id', asyncHandler(async (req, res) => {
  requireRowWrite(req);
  res.json(await upsertRecord(collection(req), { ...cleanBody(req.body), id: req.params.id }));
}));

router.delete('/crud/:collection/:id', asyncHandler(async (req, res) => {
  requireRowWrite(req);
  res.json(await deleteRecord(collection(req), req.params.id));
}));

router.post('/crud-deltas', asyncHandler(async (_req, _res) => {
  const err = new Error('FIX28: /api/crud-deltas eliminado. Prohibidas altas/bajas deducidas por navegador.');
  err.status = 410;
  throw err;
}));

export default router;
