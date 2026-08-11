# ControlEvent v28.5.1_prod · corrección canónica Pte.Compra

Esta revisión parte de `v28.5_prod` y es deliberadamente quirúrgica. No cambia la arquitectura conversacional ni vuelve a ampliar la libertad de Gemini. Corrige un error de clasificación en la capa de datos que hacía que Zuzu interpretase como compras realizadas registros que la propia interfaz de ControlEvent muestra como `Pte.Compra`.

## Semántica canónica de compras

La clasificación queda unificada en un único criterio de dominio, coherente con la interfaz de CE:

- **DONACIÓN**: registros `DONADO SOCIO`, `DONADO TIENDA`, `DONADO OTROS` y equivalentes de donación.
- **COMPRA REALIZADA**: registros con `TKxx` o `GASTOS CORRIENTES`.
- **PTE.COMPRA**: registros de compra cuyo campo `Ticket / otros gastos` está vacío. También se reconocen literalmente `Pte.Compra` o `Pendiente` si aparecen en datos heredados.

El criterio es genérico: no contiene nombres de eventos, tiendas, productos, tickets, importes ni fechas de las pruebas.

## Efectos de la corrección

`Pte.Compra` pasa a viajar correctamente por las fuentes canónicas que utiliza Zuzu:

- `event_dossier`: compras realizadas, compras pendientes, gastos previstos y saldo operativo.
- `event_breakdowns`: separación Comprado / Donado / Pte.Compra por tienda, segmento y destino.
- `event_purchase_lines`: `status=pending` devuelve los registros pendientes producto a producto; los tickets vacíos se presentan humanamente como `Pte.Compra`.
- `events_overview` y `compare_events`: incorporan compras pendientes como magnitud separada.
- comparativas gráficas: `Compras pendientes` es una métrica homogénea disponible.
- rutas de informe antiguas/fallback: ticket vacío se clasifica también como pendiente para que no exista una segunda semántica paralela.

Una consulta inequívoca como «dame la relación de cosas pendientes de compra» se resuelve directamente en ControlEvent, sin necesidad de Gemini.

## Fórmulas coherentes con la interfaz

- **Gastos previstos = Compras realizadas + Pte.Compra**.
- **Saldo operativo = Ingresos - Gastos previstos**.
- **Valoración del evento = Gastos previstos + valor del producto donado**.

Las reglas narrativas entregadas a Gemini, los esquemas de herramientas y los auditores usan la misma fórmula; no queda una instrucción antigua que ordene excluir `Pte.Compra` de la valoración.

En la gráfica económica de un evento, `Pte.Compra` aparece como indicador separado cuando su importe es distinto de cero. En eventos sin compras pendientes no se añade una barra innecesaria.

## Versión, INFOEVENTO y BACKUP

La identidad activa es `v28.5.1_prod` en aplicación, cliente/servidor, INFOEVENTO y BACKUP interno/externo. `v28.5_prod` se conserva únicamente en la lista de migración de claves antiguas para no perder preferencias/sesión al actualizar.

## Regresiones

Se incluyen pruebas específicas de:

- ticket vacío = Pte.Compra en IA y contexto;
- separación DONACIÓN / REALIZADA / PENDIENTE;
- detalle `status=pending`;
- dossier y comparativas con Pte.Compra;
- fórmula de valoración coherente con la interfaz;
- instrucciones narrativas de Gemini sin la regla antigua;
- fallback de informes con ticket vacío;
- ruta directa de lista de pendientes sin Gemini;
- ausencia de hardcode de los casos reales usados para detectar el fallo.

No se instalaron dependencias ni se levantó el servidor completo en el entorno de construcción; las verificaciones realizadas son de regresión estática/funcional de los módulos incluidos, sintaxis JavaScript e integridad del ZIP.
