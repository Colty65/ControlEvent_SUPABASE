import express from 'express';
import { asyncHandler } from './_async.js';
import { analyzeEventPrompt } from '../services/event-ai.service.js';

const router = express.Router();

router.post('/event-ai/analyze', asyncHandler(async (req, res) => {
  res.json(await analyzeEventPrompt(req.body || {}));
}));

export default router;
