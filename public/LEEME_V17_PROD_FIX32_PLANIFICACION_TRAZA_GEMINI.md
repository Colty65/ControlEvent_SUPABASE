# CE v19_prod FIX32 - Planificación con traza Zuzu

Base: CE_v17_PROD_FIX31_PLANIFICACION_BRIEF_GEMINI.

Objetivo de esta versión: no seguir tocando a ciegas la propuesta final. Se abre la caja negra de Planificación inicial / Encargo total a Zuzu para ver dónde se pierde la inteligencia:

1. Prompt original recibido por ControlEvent.
2. Brief estructurado extraído.
3. Contexto/prompt compacto enviado a Zuzu.
4. Modelo Zuzu usado y tiempo real de llamada.
5. Respuesta bruta de Zuzu.
6. Filas devueltas por Zuzu.
7. Filas interpretadas por ControlEvent.
8. Compras/donaciones finales que llegan a pantalla.

Cambios principales:

- El diagnóstico ya lee tanto `Información de construcción` como `Descripción`, para no perder donaciones si el usuario pega todo el prompt en una zona distinta.
- El backend también extrae donaciones desde el prompt completo, no solo desde `info`.
- Las donaciones no encontradas exactamente en PRODUCTOS ya no desaparecen de la traza: se conservan como revisables.
- El parser de momentos por día detecta correctamente líneas con varios momentos mezclados, por ejemplo `aperitivo, comida, tardeo, cena, cubatas noche`.
- Se añade panel visible `Trazabilidad FIX32` con botón `Copiar traza completa`.
- Planificación prioriza modelos Zuzu rápidos para reducir espera.
- El catálogo enviado a Zuzu en Encargo total se compacta a productos relevantes para comida, bebida, hielo, menaje, limpieza, carne, aperitivos, pan, etc.
- El prompt interno respeta reglas como `cubatas: 6 por persona` y `cerveza: máximo 5 latas/botellines` si vienen en el prompt.

No se ha tocado:

- Gráficas.
- Resumen presupuestario.
- Globos.
- Fotos.
- Login.
- Mantenimientos.
