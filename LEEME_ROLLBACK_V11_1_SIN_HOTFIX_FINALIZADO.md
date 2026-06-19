# ControlEvent v11.1_prod - rollback estable

Este ZIP restaura la v11.1_prod con Gemini libre + modo Comparativa, eliminando por completo el hotfix posterior `v11-1-hotfix-finalizado-herramientas-analisis.js`, que podía provocar pantalla en blanco y consumo alto de CPU/memoria.

## Qué conserva
- Gemini libre del evento.
- Motor de contexto seguro.
- Modo Comparativa con selector de evento.
- Correcciones previas de CSS de Gemini/Ticket Auto incluidas en la línea v11.1.

## Qué se retira
- El hotfix de permisos/navegación en Finalizado que causaba bucle o pantalla en blanco.

## Recomendación
Instalar este ZIP para recuperar estabilidad. Después se puede resolver el acceso a herramientas en eventos finalizados con un cambio interno específico, no con parches globales de navegación.
