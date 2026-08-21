import { Router } from 'express';
import { EventAIService } from '../services/event-ai.service.js';

const router = Router();

/**
 * @route POST /api/event-ai/ask
 * @desc Consulta conversacional sobre la tabla ce_eventos
 */
router.post('/ask', async (req, res) => {
  const { query } = req.body;

  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'La consulta (query) no puede estar vacía.' });
  }

  try {
    const aiResponse = await EventAIService.converseAboutEvents(query);
    return res.status(200).json({ response: aiResponse });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
