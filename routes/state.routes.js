import express from 'express';
import { asyncHandler } from './_async.js';
import { getState, saveState } from '../services/state.service.js';

const router = express.Router();

router.get('/state', asyncHandler(async (req, res) => {
  res.json(await getState());
}));

router.put('/state', asyncHandler(async (req, res) => {
  const body = req.body || {};
  // FIX22: /api/state queda cerrado para guardados normales.
  // Motivo: cualquier estado parcial del navegador podia terminar alterando tablas.
  // Solo se admite restauracion total controlada con doble marca.
  const restore = body.__forceReplaceAll === true && String(req.get('X-ControlEvent-Backup-Restore') || '') === '1';
  if (!restore) {
    console.warn('[FIX22] PUT /api/state BLOQUEADO. No se escribe nada en BBDD.');
    return res.json({ ok: true, ignored: true, blocked: true, fix: 'FIX22', reason: 'state-put-disabled' });
  }
  delete body.__cleanupStaleIngresoImages;
  delete body.__cleanupOrphanTicketImages;
  res.json(await saveState(body));
}));

export default router;
