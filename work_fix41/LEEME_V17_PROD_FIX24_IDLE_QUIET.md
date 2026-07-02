# CE v17_prod FIX24 - reposo real / ventilador / longtasks

Partiendo de FIX23.

Cambios:
- Modo estable global también en PC: los setInterval legacy cortos pasan a vigilancia espaciada.
- MutationObserver legacy coalescido: agrupa callbacks y filtra mutaciones del panel PERF.
- PERF deja de repintarse automáticamente mientras está abierto; queda manual con Actualizar/Copiar.
- Eliminado barrido continuo de v15-hotfix20 cada 1,2s.
- No se tocan datos, fotos, miniaturas, permisos, cálculos ni versión visible.

Objetivo: mantener DOM bajo y evitar que, sin tocar nada, sigan subiendo mutaciones/longtasks y el ventilador.
