const { Router } = require('express');
const { EventAIService } = require('../services/event-ai.service.js');
const router = Router();
router.post('/ask', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Query vacía' });
  try { const response = await EventAIService.converseAboutEvents(query); return res.status(200).json({ response }); }
  catch (error) { return res.status(500).json({ error: error.message }); }
});
module.exports = router;