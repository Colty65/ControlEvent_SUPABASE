import express from 'express';
import { asyncHandler } from './_async.js';
import { authorizationContract, authorizeZis } from '../services/zis-authorization.service.js';

const router = express.Router();

router.get('/zis/authorization-contract', (req, res) => {
  res.json(authorizationContract());
});

router.post('/zis/authorize', asyncHandler(async (req, res) => {
  res.json(await authorizeZis(req.body || {}));
}));

export default router;
