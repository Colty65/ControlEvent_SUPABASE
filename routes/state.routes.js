import express from 'express';
import { asyncHandler } from './_async.js';
import { getState, saveState } from '../services/state.service.js';

const router = express.Router();

router.get('/state', asyncHandler(async (req, res) => {
  const eventId = String(req.query.eventId || req.query.event_id || '').trim();
  const boot = String(req.query.boot || req.query.bootstrap || '').trim() === '1';
  res.json(await getState(eventId ? { eventId } : (boot ? { boot: true } : {})));
}));

router.put('/state', asyncHandler(async (req, res) => {
  const body = req.body || {};
  // FIX26: /api/state queda cerrado de raiz. No se admite como mecanismo de mantenimiento.
  // Solo se permite restaurar BACKUP total con doble marca, porque ese sí es reemplazo consciente.
  const restore = body.__forceReplaceAll === true && String(req.get('X-ControlEvent-Backup-Restore') || '') === '1';
  if (!restore) {
    const err = new Error('FIX26: PUT /api/state bloqueado. No se permite guardar estado completo ni por refrescos, pantallas ni navegación.');
    err.status = 409;
    throw err;
  }
  delete body.__cleanupStaleIngresoImages;
  delete body.__cleanupOrphanTicketImages;
  delete body.__explicitWrite;
  delete body.__explicitWriteReason;
  res.json(await saveState(body));
}));

export default router;
