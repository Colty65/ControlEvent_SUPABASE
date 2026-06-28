# ControlEvent v16_opt_1 - Optimización 1: carga y cambio de evento

Base: v16_prod + HOTFIX5 funcional.

## Objetivo
Optimizar únicamente la carga general y el cambio de evento, sin tocar cálculos, planificación, documentos, tickets, ingresos, donaciones ni compras.

## Cambios incluidos

1. **Cambio de evento unificado**
   - El selector principal de evento queda gobernado por un único manejador final.
   - Se intercepta el `change` del desplegable en fase temprana para evitar que listeners antiguos disparen varios cambios/renderizados.
   - Se ignoran dobles disparos del mismo evento en menos de medio segundo.

2. **Menos estrés al cambiar de evento**
   - Cierra globos y restos visuales antes de cambiar.
   - Evita guardados globales por el simple hecho de cambiar el evento activo.
   - Muestra aviso ligero “Cargando evento…” sin bloquear la pantalla.
   - Mantiene el evento elegido en `sessionStorage/localStorage` como preferencia local.

3. **Protección del desplegable principal**
   - Refuerzo para que `#selectedEvent` no quede deshabilitado, sin puntero o en blanco por efectos de bloqueos antiguos.
   - Se evita que clics/punteros sobre el desplegable propaguen a listeners globales que podían cerrarlo o interferir.

4. **Dedupe de `/api/state`**
   - Si en un cambio rápido se disparan 2 o más lecturas GET iguales contra `/api/state`, se reutiliza la primera respuesta durante una ventana corta.
   - Solo aplica a lecturas GET de estado; no toca POST, guardados, compras, donaciones ni subida de fotos.

5. **Diagnóstico mínimo**
   - Se expone `window.ControlEventOpt1` con contador de cambios, duplicados ignorados y peticiones de estado deduplicadas.

## Archivos modificados

- `public/index.html`
- `index.html`
- `public/app/features/v16-opt1-event-load-stabilizer.js` nuevo

## Pruebas recomendadas

1. Entrar con GD.
2. Cambiar de un evento pequeño a uno grande.
3. Cambiar rápido 3 veces entre eventos.
4. Comprobar que compras/donaciones no quedan vacías.
5. Comprobar que el desplegable no queda en blanco ni bloqueado.
6. Probar con evento finalizado y en curso.
7. Abrir Resumen, Gráficas y Compras después de cambiar de evento.

La versión visible se mantiene como `v16_prod`.
