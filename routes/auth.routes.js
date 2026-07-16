import express from 'express';
import { asyncHandler } from './_async.js';
import { changePassword, login } from '../services/auth.service.js';

const router = express.Router();

router.post('/login', asyncHandler(async (req, res) => {
  res.json({ ok: true, user: await login(req.body || {}) });
}));

router.post('/change-password', asyncHandler(async (req, res) => {
  res.json(await changePassword(req.body || {}));
}));

export default router;
