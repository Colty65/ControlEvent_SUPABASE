import 'dotenv/config';
import express from 'express';
import fsSync from 'fs';
import path from 'path';
import accessRoutes from '../routes/access.routes.js';
import authRoutes from '../routes/auth.routes.js';
import healthRoutes from '../routes/health.routes.js';
import stateRoutes from '../routes/state.routes.js';
import ticketImagesRoutes from '../routes/ticket-images.routes.js';
import exportRoutes from '../routes/export.routes.js';
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

  app.get('/api/bootstrap.js', (req, res) => {
    res.type('application/javascript; charset=utf-8');
    res.send(`window.__CONTROL_EVENT_STATE__ = {};\nwindow.__CONTROL_EVENT_USER__ = null;\nwindow.__CONTROL_EVENT_BACKEND__ = "${BACKEND_NAME}";\n`);
  });

  app.use('/api', stateRoutes);
  app.use('/api', authRoutes);
  app.use('/api', accessRoutes);
  app.use('/api', ticketImagesRoutes);
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
