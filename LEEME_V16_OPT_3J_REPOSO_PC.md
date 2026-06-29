# ControlEvent v16_prod - OPT3J Reposo de PC

Mantiene versión visible v16_prod.

Base: v16_prod OPT3I.

Objetivo:
- Conservar la fluidez conseguida en Resumen presupuestario.
- Evitar que, una vez pintada la ventana y disponibles los globos/fotos, el PC siga acelerado por barridos legacy repetitivos.

Cambios:
- No toca login.
- No toca selector de evento.
- No toca /api/state.
- No toca datos, cálculos ni importes.
- No toca compras, ingresos, donaciones, documentos, tickets, gráficas ni AVANCE.
- Ajusta el motor de rendimiento para que también en PC normal los intervalos legacy cortos pasen a modo vigilancia lenta.
- Los barridos heredados de 900/1200/1500/1800/2200 ms se espacian a unos 45 segundos, sin activar el modo LITE visual completo.

Prueba:
1. Entrar en Resumen presupuestario.
2. Cambiar de evento.
3. Esperar sin tocar la app.
4. La ventana debe quedar disponible rápido y el PC debe calmarse antes.
