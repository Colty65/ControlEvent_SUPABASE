import express from 'express';
import { asyncHandler } from './_async.js';
import { getState, saveState } from '../services/state.service.js';

const router = express.Router();

router.get('/state', asyncHandler(async (req, res) => {
  res.json(await getState());
}));

router.put('/state', asyncHandler(async (req, res) => {
  // v8.5 FIX17: los preflight de imagen de FIX15/FIX16 no deben guardar estado completo.
  // Si queda un cliente viejo en cache llamando a /api/state?imagePreflight=1, se ignora para
  // evitar reemplazos destructivos de INGRESOS/COMPRAS en eventos finalizados.
  if (String(req.query.imagePreflight || '') === '1') {
    res.json({ ok: true, ignored: true, reason: 'imagePreflight-disabled-fix17' });
    return;
  }
  res.json(await saveState(req.body || {}));
}));

export default router;
