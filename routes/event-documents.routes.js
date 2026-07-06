import express from 'express';
import { asyncHandler } from './_async.js';
import { saveEventDocumentsForEvent } from '../lib/supabase-normalized.js';

const router = express.Router();
const WRITE_SCOPE = 'event-documents-v8-5-hf45';

function requireDocumentWrite(req) {
  if (String(req.get('X-ControlEvent-Write-Scope') || '') === WRITE_SCOPE) return;
  const err = new Error('FIX45: escritura de documentos bloqueada. Solo se admite desde acción explícita de Documentos.');
  err.status = 409;
  throw err;
}

router.put('/event-documents/state', asyncHandler(async (req, res) => {
  requireDocumentWrite(req);
  const body = req.body || {};
  const eventId = body.eventId || body.event_id || req.query.eventId || '';
  res.json(await saveEventDocumentsForEvent(eventId, body.eventDocuments || body.documents || [], body.eventDocumentMeta || body.meta || {}));
}));

export default router;
