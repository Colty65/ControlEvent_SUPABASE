const { GoogleGenAI } = require('@google/genai');
const { supabase } = require('../lib/supabase.js');
let ai;
try { if (process.env.GEMINI_API_KEY) { ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); } } catch (e) { console.error(e); }
const EventAIService = {
  async converseAboutEvents(query) {
    try {
      if (!ai) return 'Falta la variable GEMINI_API_KEY en Vercel.';
      const res = await ai.models.embedContent({ model: 'text-embedding-004', contents: query });
      const { data, error } = await supabase.rpc('match_events', { query_embedding: res.embedding.values, match_threshold: 0.15, match_count: 5 });
      if (error) throw error;
      let ctx = 'No hay eventos.';
      if (data && data.length > 0) { ctx = data.map(e => `- ${e.titulo} | ${e.precio}€ | ${e.fecha_ini}`).join('\n'); }
      const gen = await ai.models.generateContent({
        model: 'gemini-1.5-flash-lite',
        contents: `Contexto:\n${ctx}\n\nPregunta: ${query}`,
        config: { systemInstruction: 'Eres el asistente de la app CE. Responde en español usando solo el contexto.', temperature: 0.2 }
      });
      return gen.text;
    } catch (err) { return 'Error: ' + err.message; }
  }
};
module.exports = { EventAIService };