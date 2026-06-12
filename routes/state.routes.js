import express from 'express';
import { asyncHandler } from './_async.js';
import { getState, saveState } from '../services/state.service.js';

const router = express.Router();

router.get('/state', asyncHandler(async (req, res) => {
  res.json(await getState());
}));

router.put('/state', asyncHandler(async (req, res) => {
  const body = req.body || {};
  // FIX23: /api/state queda cerrado de raiz. No se admite como mecanismo de mantenimiento.
  // Solo se permite restaurar BACKUP total con doble marca, porque ese sí es reemplazo consciente.
  const restore = body.__forceReplaceAll === true && String(req.get('X-ControlEvent-Backup-Restore') || '') === '1';
  if (!restore) {
    const err = new Error('FIX23: PUT /api/state bloqueado. No se permite guardar estado completo ni por refrescos ni por pantallas.');
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
