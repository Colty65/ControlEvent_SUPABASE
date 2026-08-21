import { GoogleGenAI } from '@google/genai';
import { supabase } from '../lib/supabase.js';

// Inicializamos el SDK moderno unificado de Google
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const EventAIService = {
  /**
   * Procesa la consulta usando RAG Semántico y Gemini 1.5 Flash-lite
   * @param {string} query - Pregunta del usuario
   */
  async converseAboutEvents(query) {
    try {
      // 1. Generar el embedding de la pregunta
      const embeddingResponse = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: query,
      });

      const queryEmbedding = embeddingResponse.embedding.values;

      // 2. Ejecutar la búsqueda de similitud en Supabase (RPC corregido sin user_id)
      const { data: matchedEvents, error } = await supabase.rpc('match_events', {
        query_embedding: queryEmbedding,
        match_threshold: 0.20,
        match_count: 5
      });

      if (error) throw new Error(`Error en Supabase RPC: ${error.message}`);

      // 3. Construir el contexto adaptado a los campos reales de ce_eventos
      let contextText = "No se encontraron eventos relevantes en la base de datos para esta consulta.";
      if (matchedEvents && matchedEvents.length > 0) {
        contextText = matchedEvents.map(event => 
          `- Evento: ${event.titulo} | Precio: ${event.precio || 0}€ | Fecha Inicio: ${event.fecha_ini} | Fecha Fin: ${event.fecha_fin}`
        ).join('
');
      }

      // 4. Configurar el System Prompt e invocar a Gemini 1.5 Flash-lite
      const systemInstruction = 
        `Eres el asistente inteligente de la app CE. Tu objetivo es conversar con el usuario ` +
        `basándote única y exclusivamente en la lista de eventos proporcionada en el contexto. ` +
        `Si la información provista no responde la duda, indícalo amablemente sin inventar datos. ` +
        `Responde siempre de manera concisa y en español de España de forma profesional.`;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash-lite',
        contents: `Contexto (Eventos Encontrados):\n${contextText}\n\nPregunta del usuario: ${query}`,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.3
        }
      });

      return response.text;

    } catch (error) {
      console.error('Error en EventAIService:', error);
      throw new Error('Hubo un problema al procesar la solicitud con el asistente virtual.');
    }
  },

  /**
   * Método auxiliar para actualizar el embedding de un evento específico cuando se crea o edita
   */
  async updateEventEmbedding(eventId, eventData) {
    try {
      const textToEmbed = `Evento: ${eventData.titulo}. Precio: ${eventData.precio || 0}. Inicio: ${eventData.fecha_ini}. Fin: ${eventData.fecha_fin}.`;
      
      const embeddingResponse = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: textToEmbed,
      });

      const vector = embeddingResponse.embedding.values;

      const { error } = await supabase
        .from('ce_eventos')
        .update({ embedding: vector })
        .eq('id', eventId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error(`Error guardando embedding para el evento ${eventId}:`, err);
      return false;
    }
  }
};
