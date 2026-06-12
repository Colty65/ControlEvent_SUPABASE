import express from 'express';
import { asyncHandler } from './_async.js';
import { getState, saveState } from '../services/state.service.js';

const router = express.Router();

router.get('/state', asyncHandler(async (req, res) => {
  res.json(await getState());
}));

router.put('/state', asyncHandler(async (req, res) => {
  const body = req.body || {};
  // FIX21: /api/state deja de ser una puerta de guardado automatico.
  // Solo se acepta restauracion total o una escritura marcada explicitamente por accion de usuario.
  if (String(req.query.imagePreflight || '') === '1') {
    return res.json({ ok: true, ignored: true, reason: 'image-preflight-disabled' });
  }
  const explicit = body.__explicitWrite === true || String(req.get('X-ControlEvent-Explicit-Write') || '') === '1';
  const restore = body.__forceReplaceAll === true || body.__allowEmptyReplace === true;
  if (!explicit && !restore) {
    console.warn('[FIX21] PUT /api/state ignorado: sin marca de escritura explicita.');
    return res.json({ ok: true, ignored: true, reason: 'automatic-state-put-blocked' });
  }
  delete body.__cleanupStaleIngresoImages;
  delete body.__cleanupOrphanTicketImages;
  res.json(await saveState(body));
}));

export default router;
