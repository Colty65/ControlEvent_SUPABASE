import express from 'express';
import { asyncHandler } from './_async.js';
import { transcribeZuzuVoice, synthesizeZuzuSpeech, streamZuzuSpeech } from '../services/zuzu-voice.service.js';

const router = express.Router();

router.post('/zuzu-voice/transcribe', asyncHandler(async (req, res) => {
  res.json(await transcribeZuzuVoice(req.body || {}));
}));

router.post('/zuzu-voice/speak', asyncHandler(async (req, res) => {
  res.json(await synthesizeZuzuSpeech(req.body || {}));
}));

router.post('/zuzu-voice/speak-stream', async (req, res, next) => {
  try {
    await streamZuzuSpeech(req.body || {}, req, res);
  } catch (error) {
    if (!res.headersSent) return next(error);
    try { res.end(); } catch (_) {}
  }
});

export default router;
