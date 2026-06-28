# ControlEvent v16_prod - OPT3C Entrada estable

Base: v16_prod + OPT3B.

Objetivo:
- Corregir estrés/refrescos en pantalla de entrada/login.
- Dejar la pantalla de presentación posterior al login fija, con solo el icono ControlEvent centrado y tamaño medio.
- Mantener intactas las optimizaciones de Resumen presupuestario OPT3/OPT3B para probarlas después.

Cambios:
1. Estabiliza `authOverlay` para que el login quede fijo y centrado.
2. Oculta el texto huérfano “Sin acceso” que aparecía detrás del login.
3. Bloquea renders pesados de la app mientras el usuario todavía está en login sin autenticar.
4. Evita llamadas prematuras a `/api/state` mientras el login está visible y no hay usuario autenticado.
5. Protege el botón Entrar contra dobles ejecuciones.
6. Simplifica la pantalla de presentación sin evento: solo imagen central mediana, sin textos de sugerencia.
7. Añade diagnóstico `window.ControlEventOpt3C`.

No toca:
- Compras
- Donaciones
- Ingresos
- Documentos
- Tickets
- Planificación
- Gráficas OPT2 validada
- AVANCE DEL EVENTO
- Versión visible, que sigue siendo v16_prod

Prueba recomendada:
1. Abrir la app desde cero.
2. Elegir usuario sugerido por Windows/autocompletado.
3. Comprobar que el login no refresca ni deja textos detrás.
4. Entrar.
5. Comprobar que la pantalla de presentación sale con solo el icono central.
6. Elegir evento y probar Resumen presupuestario + globos de Cálculos por tienda y ticket.
