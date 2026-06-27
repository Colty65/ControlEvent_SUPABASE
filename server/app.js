import 'dotenv/config';
import express from 'express';
import fsSync from 'fs';
import path from 'path';
import accessRoutes from '../routes/access.routes.js';
import authRoutes from '../routes/auth.routes.js';
import healthRoutes from '../routes/health.routes.js';
import stateRoutes from '../routes/state.routes.js';
import ticketImagesRoutes from '../routes/ticket-images.routes.js';
import eventDocumentsRoutes from '../routes/event-documents.routes.js';
import exportRoutes from '../routes/export.routes.js';
import crudRoutes from '../routes/crud.routes.js';
import receiptAiRoutes from '../routes/receipt-ai.routes.js';
import eventAiRoutes from '../routes/event-ai.routes.js';
import { BACKEND_NAME, NODE_MODULES_DIR, PUBLIC_DIR, ROOT } from './paths.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '35mb' }));
  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.get('/vendor/exceljs.min.js', async (req, res) => {
    const candidates = [
      path.join(PUBLIC_DIR, 'vendor', 'exceljs.min.js'),
      path.join(NODE_MODULES_DIR, 'exceljs', 'dist', 'exceljs.min.js')
    ];
    const file = candidates.find(candidate => fsSync.existsSync(candidate));
    if (!file) {
      return res.status(404).type('text/plain').send('Falta ExcelJS. Ejecuta npm install y reinicia.');
    }
    res.type('application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(file);
  });

  app.use('/uploads', express.static(path.join(ROOT, 'uploads'), { etag: false, maxAge: 0 }));
  app.use(express.static(PUBLIC_DIR, { etag: false, maxAge: 0 }));

  // FIX23: cortafuegos de servidor antes de cualquier ruta de datos.
  // La BBDD no se actualiza por navegación, render, refresco ni estado completo.
  app.use((req, res, next) => {
    const method = String(req.method || 'GET').toUpperCase();
    const url = String(req.originalUrl || req.url || '');
    if(method === 'PUT' && /^\/api\/state(?:$|\?)/i.test(url)){
      const body = req.body || {};
      const restore = body.__forceReplaceAll === true && String(req.get('X-ControlEvent-Backup-Restore') || '') === '1';
      if(!restore) return res.status(409).json({ok:false, blocked:true, fix:'FIX23', error:'PUT /api/state bloqueado por cortafuegos de servidor'});
    }
    if(method === 'POST' && /^\/api\/crud-deltas(?:$|\?)/i.test(url)){
      return res.status(410).json({ok:false, blocked:true, fix:'FIX23', error:'/api/crud-deltas eliminado'});
    }
    next();
  });

  app.get('/api/bootstrap.js', (req, res) => {
    res.type('application/javascript; charset=utf-8');
    res.send(`window.__CONTROL_EVENT_STATE__ = {};\nwindow.__CONTROL_EVENT_USER__ = null;\nwindow.__CONTROL_EVENT_BACKEND__ = "${BACKEND_NAME}";\n`);
  });

  app.use('/api', stateRoutes);
  app.use('/api', authRoutes);
  app.use('/api', accessRoutes);
  app.use('/api', ticketImagesRoutes);
  app.use('/api', eventDocumentsRoutes);
  app.use('/api', receiptAiRoutes);
  app.use('/api', eventAiRoutes);
  app.use('/api', crudRoutes);
  app.use('/api', exportRoutes);
  app.use('/api', healthRoutes);

  app.get('*', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

  app.use((err, req, res, next) => {
    const status = err?.status || (/clave/i.test(err?.message || '') ? 401 : 500);
    if (status >= 500) console.error(`[${req.method} ${req.originalUrl}]`, err);
    res.status(status).json({ ok: false, error: err?.message || 'Error interno' });
  });

  return app;
}

const app = createApp();
export default app;
