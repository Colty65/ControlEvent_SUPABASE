# ControlEvent v16_prod - OPT3K Resumen fotos y reposo

Base: v16_prod OPT3J.

Alcance cerrado:
- Resumen presupuestario / Cálculos por tienda y ticket.
- Acciones de foto TKxx en ese bloque.
- Visor ampliado de ticket.
- Vuelta desde otra tarea/ventana Windows estando en Resumen.

No toca:
- Login.
- Selector de eventos.
- /api/state.
- Importes, cálculos o datos contables.
- Compras, Ingresos, Donaciones como módulo, Documentos, Gráficas ni AVANCE.

Cambios:
1. Se incluye el hardlock de Resumen también en `public/index.html`, no solo en `index.html`.
2. Las acciones de foto en TKxx se gestionan por un controlador directo `v16-opt3k-resumen-fotos-y-reposo.js`.
3. Eliminar foto envía `DELETE /api/ticket-images` con cabecera `X-ControlEvent-Write-Scope`.
4. Adjuntar/sustituir foto envía `POST /api/ticket-images` con la misma cabecera de escritura explícita.
5. Se limpian las cachés locales de imágenes para que no reaparezca la miniatura antigua.
6. Se fuerza repintado local del bloque de Resumen, no un refresco general de app.
7. El botón cerrar de foto ampliada queda abajo a la derecha.
8. Al volver desde otra tarea Windows, se bloquea el render heredado si Resumen ya está estable para evitar parpadeos de fichas y textos internos.
