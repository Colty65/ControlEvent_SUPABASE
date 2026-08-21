import { Router } from 'express';
import { EventAIService } from '../services/event-ai.service.js';
import { requireAuth } from '../services/auth.service.js'; // Ajusta el paso de tu middleware según corresponda

const router = Router();

/**
 * @route POST /api/event-ai/ask
 * @desc Consulta conversacional sobre los eventos propios del usuario logueado usando RAG
 */
router.post('/ask', requireAuth, async (req, res) => {
  const { query } = req.body;
  const userId = req.user?.id || req.userId; // Extrae de forma segura el ID inyectado por tu middleware auth

  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'La consulta (query) no puede estar vacía.' });
  }

  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado o sesión inválida.' });
  }

  try {
    const aiResponse = await EventAIService.converseAboutEvents(query, userId);
    return res.status(200).json({ response: aiResponse });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
