import express from 'express';
import { asyncHandler } from './_async.js';
import { deleteRecord, upsertRecord } from '../services/crud.service.js';

const router = express.Router();

const WRITE_SCOPE = 'row-crud-v8-5-fix23';
const COLLECTIONS = new Set(['eventos','personas','tiendas','productos','colaboradores','compras']);

function requireFix23RowWrite(req){
  const scope = String(req.get('X-ControlEvent-Write-Scope') || '');
  const rowOnly = req.body?.__crudRowOnly === true || String(req.get('X-ControlEvent-Row-Only') || '') === '1';
  if(scope === WRITE_SCOPE && rowOnly) return;
  const err = new Error('FIX23: escritura CRUD bloqueada. Solo se admite CRUD fila-a-fila con cabecera FIX23.');
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
    const err = new Error('FIX23: colección CRUD no permitida: ' + c);
    err.status = 400;
    throw err;
  }
  return c;
}

router.post('/crud/:collection', asyncHandler(async (req, res) => {
  requireFix23RowWrite(req);
  res.json(await upsertRecord(collection(req), cleanBody(req.body)));
}));

router.put('/crud/:collection/:id', asyncHandler(async (req, res) => {
  requireFix23RowWrite(req);
  res.json(await upsertRecord(collection(req), { ...cleanBody(req.body), id: req.params.id }));
}));

router.delete('/crud/:collection/:id', asyncHandler(async (req, res) => {
  requireFix23RowWrite(req);
  res.json(await deleteRecord(collection(req), req.params.id));
}));

router.post('/crud-deltas', asyncHandler(async (_req, _res) => {
  const err = new Error('FIX23: /api/crud-deltas eliminado. Prohibidas bajas/altas deducidas por diferencias de navegador.');
  err.status = 410;
  throw err;
}));

export default router;
