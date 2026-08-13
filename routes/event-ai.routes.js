import express from 'express';
import { asyncHandler } from './_async.js';
import { analyzeEventPrompt, planificacionInicialZuzu } from '../services/event-ai.service.js';
import { classifyZuzuShadow } from '../services/zuzu-router-shadow.service.js';

const router = express.Router();

router.post('/event-ai/analyze', asyncHandler(async (req, res) => {
  res.json(await analyzeEventPrompt(req.body || {}));
}));

// v30_prod · nueva arquitectura en SOMBRA: clasifica la misma pregunta, pero NO interviene
// en la respuesta actual ni consulta/modifica datos de ControlEvent. La UI la ejecuta después
// de recibir la respuesta principal para no añadir latencia ni riesgo al Zuzu vigente.
router.post('/event-ai/router-shadow', asyncHandler(async (req, res) => {
  res.json(await classifyZuzuShadow(req.body || {}));
}));

router.post('/event-ai/planificacion-propuesta', asyncHandler(async (req, res) => {
  res.json(await planificacionInicialZuzu(req.body || {}));
}));

export default router;
