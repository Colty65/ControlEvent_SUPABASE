import express from 'express';
import { asyncHandler } from './_async.js';
import { getState, saveState } from '../services/state.service.js';

const router = express.Router();

router.get('/state', asyncHandler(async (req, res) => {
  res.json(await getState());
}));

router.put('/state', asyncHandler(async (req, res) => {
  res.json(await saveState(req.body || {}));
}));

export default router;
