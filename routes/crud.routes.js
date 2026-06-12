import express from 'express';
import { asyncHandler } from './_async.js';
import { applyDeltas, deleteRecord, upsertRecord } from '../services/crud.service.js';

const router = express.Router();

router.post('/crud/:collection', asyncHandler(async (req, res) => {
  res.json(await upsertRecord(req.params.collection, req.body || {}));
}));

router.put('/crud/:collection/:id', asyncHandler(async (req, res) => {
  res.json(await upsertRecord(req.params.collection, { ...(req.body || {}), id: req.params.id }));
}));

router.delete('/crud/:collection/:id', asyncHandler(async (req, res) => {
  res.json(await deleteRecord(req.params.collection, req.params.id));
}));

router.post('/crud-deltas', asyncHandler(async (req, res) => {
  res.json(await applyDeltas(req.body || {}));
}));

export default router;
