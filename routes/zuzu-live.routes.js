import express from 'express';
import { asyncHandler } from './_async.js';
import { createZuzuLiveToken } from '../services/zuzu-live.service.js';

const router = express.Router();

router.post('/zuzu-live/token', asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(await createZuzuLiveToken());
}));

export default router;
