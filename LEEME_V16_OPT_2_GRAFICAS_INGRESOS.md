# ControlEvent v16_prod - v16_opt_2

Base: v16_opt_1.

Alcance cerrado:

- No cambia version visible: sigue siendo v16_prod.
- No toca planificación inicial, compras extra, documentos, tickets, donaciones ni mapa.
- Solo optimiza el primer pintado de GRAFICAS y la carga de justificantes de ingresos al cambiar de evento.

Cambios:

1. GRAFICAS
   - Añade un esqueleto breve "Calculando gráficas del evento…" durante el cambio de evento.
   - Debounce/dedupe del render de gráficas para evitar repintados sucesivos y retemblores.
   - Fuerza render estable una vez asentado el evento activo.

2. Justificantes de ingresos
   - Al asentarse el evento, fuerza hidratación de justificantes desde /api/ticket-images.
   - Actualiza miniaturas de ingresos sin depender del botón Refrescar.

3. Diagnóstico
   - Añade window.ControlEventOpt2 con contadores de renders, skips e hidrataciones.

Pruebas recomendadas:

- Cambiar entre evento pequeño, medio y potente desde GRAFICAS.
- Confirmar que no se ven quesos vacíos, solo esqueleto breve.
- Entrar en INGRESOS tras cambiar de evento y comprobar justificantes sin pulsar Refrescar.
