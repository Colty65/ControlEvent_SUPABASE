# Auditoría v4_0_exp · Ledger físico + analítica + COMPRAS/DONACIONES proporcionales

Cambios aplicados sobre `ControlEvent_v4_0_exp_ZUZU_ITV_ORACULO_EJECUCION_CAPABILITIES_COMPRAS_DONACIONES_AUDITED.zip`.

## Zuzu / ITV
- Los IDs de evento ya certificados por SCC/ledger se resuelven directamente contra `state.eventos`; no vuelven a certificarse como texto.
- `rank`/`compare` no usan la entidad de referencia como filtro previo de la consulta: la referencia se aplica tras agrupar.
- Roles analíticos por dominio: compras→responsable/importe, donaciones→donante/valor, personas→persona/conteo, productos→producto/importe, comparaciones→evento/importe.
- Cuando Gemini ya ha elegido `compare` y no materializa dos valores, CE puede recuperar dos focos homogéneos recientes del ledger.
- `ledgerAudit.execution` registra el resultado físico: dominio, scope, filas materializadas, columnas visibles/disponibles, recuentos de tablas y gráficas, dataset/view id.
- El oráculo ITV prioriza esos datos físicos y contrasta también el número de filas de la presentación. Un PLAN correcto con DATASET/evento equivocado da KO.
- Se refuerza el contrato de `reference + changes`: un `replace_scope` solo cambia scope; el resto del plan base permanece inmutable.

## COMPRAS / DONACIONES
- Se mantiene la corrección previa de Responsable con todos los SOCIO individuales/parejas y preservación de valores ya grabados al editar.
- Se ajustan las proporciones del formulario de alta y de las filas de mantenimiento en escritorio: Producto y Responsable más anchos; Unidades/Precio/Importe más compactos; Tienda/Donante y Ticket con ancho intermedio.
- En móvil permanece la composición vertical existente.

## Pruebas ejecutadas
- Sintaxis JavaScript: 238 ficheros, 0 KO.
- `node scripts/zuzu-itv-oracle-regression.js`: OK.
- `node scripts/compras-donaciones-maintenance-regression.js`: OK.
- `node scripts/zuzu-ledger-fixes-regression.js`: OK.
- La suite estructural completa que importa Supabase no puede ejecutarse en este entorno porque el ZIP no incluye `node_modules`; las regresiones anteriores no requieren dependencias externas.
