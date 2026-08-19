import express from 'express';
import { asyncHandler } from './_async.js';
import { transcribeZuzuVoice } from '../services/zuzu-voice.service.js';

const router = express.Router();

router.post('/zuzu-voice/transcribe', asyncHandler(async (req, res) => {
  res.json(await transcribeZuzuVoice(req.body || {}));
}));

export default router;
