import express from 'express';
import { asyncHandler } from './_async.js';
import { transcribeZuzuVoice, synthesizeZuzuSpeech } from '../services/zuzu-voice.service.js';

const router = express.Router();

router.post('/zuzu-voice/transcribe', asyncHandler(async (req, res) => {
  res.json(await transcribeZuzuVoice(req.body || {}));
}));

router.post('/zuzu-voice/speak', asyncHandler(async (req, res) => {
  res.json(await synthesizeZuzuSpeech(req.body || {}));
}));

export default router;
