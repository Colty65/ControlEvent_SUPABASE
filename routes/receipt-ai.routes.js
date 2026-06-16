import express from 'express';
import { analyzeReceiptImage } from '../services/receipt-ai.service.js';

const router = express.Router();

router.post('/receipt-ai/analyze', async (req, res) => {
  try {
    res.json(await analyzeReceiptImage(req.body || {}));
  } catch (error) {
    const status = error?.status || (/clave/i.test(error?.message || '') ? 401 : 500);
    res.status(status).json({
      ok: false,
      error: error?.message || 'Error interno IA',
      proveedorIa: error?.proveedorIa || error?.provider || '',
      modelo: error?.modelo || error?.model || '',
      code: error?.details?.error?.code || error?.code || '',
      status: error?.details?.error?.status || '',
      hint: 'Si aparece RESOURCE_EXHAUSTED/quota con Gemini, la llamada ya está yendo a Gemini; revisa cuota/billing/límites del proyecto o cambia de modelo.'
    });
  }
});

export default router;
