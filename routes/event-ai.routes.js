import express from 'express';
import { asyncHandler } from './_async.js';
import { analyzeEventPrompt, planificacionInicialZuzu } from '../services/event-ai.service.js';

const router = express.Router();

router.post('/event-ai/analyze', asyncHandler(async (req, res) => {
  res.json(await analyzeEventPrompt(req.body || {}));
}));

router.post('/event-ai/planificacion-propuesta', asyncHandler(async (req, res) => {
  res.json(await planificacionInicialZuzu(req.body || {}));
}));

export default router;
