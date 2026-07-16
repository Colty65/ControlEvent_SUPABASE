import express from 'express';
import { asyncHandler } from './_async.js';
import { APP_VERSION, APP_VERSION_LABEL, APP_VERSION_FILE, BACKEND_NAME, BUILD_ID, ZIP_NAME } from '../server/paths.js';
import { health } from '../repositories/supabase-state.repository.js';
import { getDiagnostics } from '../services/state.service.js';

const router = express.Router();

router.get('/health', asyncHandler(async (req, res) => {
  const result = await health();
  res.status(result.ok ? 200 : 500).json(result);
}));

router.get('/diagnostics', asyncHandler(async (req, res) => {
  res.json(await getDiagnostics());
}));

router.get('/version', (req, res) => {
  res.json({ ok: true, backend: BACKEND_NAME, version: APP_VERSION, label: APP_VERSION_LABEL, versionFile: APP_VERSION_FILE, build: BUILD_ID, zip: ZIP_NAME, modularization: 'v30.7-legacy-weight-diagnostics' });
});

export default router;
