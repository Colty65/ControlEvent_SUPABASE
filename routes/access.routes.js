import express from 'express';
import { asyncHandler } from './_async.js';
import { deleteAccessUser, listUsers, saveAccessUser } from '../services/auth.service.js';

const router = express.Router();

router.get('/access-users', asyncHandler(async (req, res) => {
  res.json({ ok: true, items: await listUsers() });
}));

router.post('/access-users', asyncHandler(async (req, res) => {
  res.json({ ok: true, item: await saveAccessUser(req.body || {}) });
}));

router.delete('/access-users/:identificacion', asyncHandler(async (req, res) => {
  res.json(await deleteAccessUser(req.params.identificacion));
}));

export default router;
