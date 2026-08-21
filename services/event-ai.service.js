import { GoogleGenAI } from '@google/genai';
import { supabase } from '../lib/supabase.js';

// Inicializamos el SDK moderno de Gemini unificado de Google
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const EventAIService = {
  /**
   * Procesa la consulta usando RAG Semántico y Gemini Flash-lite
   * @param {string} query - Pregunta o consulta conversacional del usuario
   * @param {string} userId - ID del usuario autenticado extraído del token/sesión
   */
  async converseAboutEvents(query, userId) {
    try {
      // 1. Generar el embedding de la pregunta usando el modelo oficial text-embedding-004
      const embeddingResponse = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: query,
      });

      const queryEmbedding = embeddingResponse.embedding.values;

      // 2. Ejecutar la búsqueda de similitud en Supabase a través del RPC 'match_events'
      const { data: matchedEvents, error } = await supabase.rpc('match_events', {
        query_embedding: queryEmbedding,
        match_threshold: 0.25, // Umbral de coincidencia mínima semántica
        match_count: 4,        // Traer máximo 4 eventos para optimizar rendimiento y tokens
        p_user_id: userId      // Filtro estricto por usuario autenticado
      });

      if (error) throw new Error(`Error en Supabase RPC: ${error.message}`);

      // 3. Estructurar el bloque de contexto mínimo en formato legible
      let contextText = "No se encontraron eventos relevantes en tu agenda para esta consulta.";
      if (matchedEvents && matchedEvents.length > 0) {
        contextText = matchedEvents.map(event => 
          `- Evento: ${event.nombre} | Fecha: ${event.fecha} | Tipo: ${event.tipo} | Ubicación: ${event.ubicacion} | Descripción: ${event.descripcion || 'N/A'}`
        ).join('\n');
      }

      // 4. Configurar el System Prompt y llamar a Gemini 1.5 Flash-lite
      const systemInstruction = 
        `Eres el asistente inteligente de la app CE. Tu objetivo es conversar con el usuario ` +
        `basándote única y exclusivamente en la lista de eventos proporcionada en el contexto. ` +
        `Si la información provista no responde la duda, indícalo amablemente sin inventar datos. ` +
        `Responde siempre de manera concisa y en español de España de forma profesional y atenta.`;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash-lite',
        contents: `Contexto (Mis Eventos):\n${contextText}\n\nPregunta del usuario: ${query}`,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.3 // Temperatura baja para evitar alucinaciones creativas
        }
      });

      return response.text;

    } catch (error) {
      console.error('Error en EventAIService:', error);
      throw new Error('Hubo un problema al procesar la solicitud con el asistente virtual.');
    }
  },

  /**
   * Genera y actualiza el embedding de un evento (Útil para llamar al crear o actualizar un evento)
   * @param {string} eventId - ID del evento en Supabase
   * @param {Object} eventData - Objeto con datos del evento (nombre, descripcion, tipo, ubicacion)
   */
  async updateEventEmbedding(eventId, eventData) {
    try {
      const textToEmbed = `Evento: ${eventData.nombre} | Tipo: ${eventData.tipo} | Ubicación: ${eventData.ubicacion} | Descripción: ${eventData.descripcion || ''}`;
      
      const embeddingResponse = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: textToEmbed,
      });

      const embeddingValues = embeddingResponse.embedding.values;

      const { error } = await supabase
        .from('eventos')
        .update({ embedding: embeddingValues })
        .eq('id', eventId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error generando embedding para el evento:', error);
      return false;
    }
  }
};
