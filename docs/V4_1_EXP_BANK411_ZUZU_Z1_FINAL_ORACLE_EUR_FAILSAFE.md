# ControlEvent v4_1_exp · BANK4_11 · cierre final Z1

BANK4_11 parte de BANK4_10 y endurece el cierre Z1 tras la ITV ORACLE_ACTIVE del 28/08/2026.

## Cambios

- Resolución EVENT conservadora: un evento inexistente no se convierte en el más parecido.
- Evento explícito + pregunta general fuerza `event_summary`, aunque el título contenga Ingresos/Gastos/Cuotas.
- Comparaciones multientidad por métrica tipada; compras/donaciones monetarias se comparan por importe, no por unidades.
- Follow-up de ranking conserva el subconjunto vivo (p. ej. compras pendientes).
- Referencia temporal `año anterior/posterior` conserva la familia del evento.
- TKxx concreto materializa el ticket concreto.
- Catálogo maestro de productos separado de filas de producto de eventos.
- Donaciones físicas: Supuesta/Comprometida no disponibles; Entregada disponible físicamente.
- Oráculo ITV reforzado para detectar falsos OK de evento, compras, donaciones y tienda.
- Fallback local autoritativo si la presentación Gemini devuelve JSON inválido.
- Formato monetario tipado: precios/importes/totales/saldos y derivados se muestran con `€`; conteos/unidades/personas no.
- Memory Gate 2 se conserva.

Build ITV: `20260828-BANK411-Z1-FINAL-ORACLE-EUR-FAILSAFE`

No requiere SQL.
