import express from 'express';
import { asyncHandler } from './_async.js';
import { analyzeReceiptImage } from '../services/receipt-ai.service.js';

const router = express.Router();

router.post('/receipt-ai/analyze', asyncHandler(async (req, res) => {
  res.json(await analyzeReceiptImage(req.body || {}));
}));

export default router;
