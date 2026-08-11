# ControlEvent v28.5.3_prod

## Objetivo
Corregir la regresión de UX de v28.5.2 sin perder el ahorro de tokens conseguido.

## Cambios
- Opinión, análisis, ingresos+banco e informe ejecutivo con fuentes previsibles usan: CE preconsulta hechos -> 1 llamada Gemini de texto plano -> CE presenta.
- La llamada de razonamiento ya no exige JSON estructurado, charts ni show_tables.
- Si Gemini falla o no devuelve texto utilizable, CE responde con hechos canónicos disponibles; no muestra una página roja al usuario.
- El límite económico ya no bloquea la primera llamada. Solo puede impedir una segunda llamada interna cara.
- Los mensajes de control de coste quedan fuera de la respuesta visible.
- Peticiones de presentación bancaria (añadir movimientos con fecha/importe/concepto/saldo/justificación) se resuelven directamente en CE con 0 Gemini.
- Se mantienen las rutas deterministas de Pte.Compra, comparativas multievento y gráficas banco+ingresos.
- Pte.Compra conserva la clasificación canónica corregida en v28.5.1.
- Identidad actualizada a v28.5.3_prod en aplicación, INFOEVENTO y BACKUP. v28.5.2_prod permanece solo como origen de migración de claves locales.

## Criterio de coste
- Objetivo habitual cuando Gemini razona: 0,003-0,004 € o menos.
- 0 € en consultas deterministas/presentación.
- 0,010 € sigue como referencia máxima interna, pero no se usa para dejar al usuario sin respuesta.

## Pruebas recomendadas
1. ¿Qué opinión te merece este evento?
2. Profundiza en los ingresos y en el cuadre bancario.
3. Dame una gráfica del cuadre bancario y otra de los ingresos.
4. Añade debajo de la gráfica bancaria el detalle de los movimientos con fecha, importe, concepto, saldo y justificación.
5. Dime cinco cosas realmente curiosas o relevantes que detectes en este evento y explica por qué.
6. Analiza en profundidad la economía, ingresos, compras, Pte.Compra, asistencia, gestión, documentación y banco de este evento. Prioriza únicamente conclusiones respaldadas.
7. Quiero un informe ejecutivo para Dirección sobre FUNCION 2025 como base de planificación de FUNCION 2026. Sé riguroso, distingue hechos de inferencias y no añadas conclusiones no respaldadas.

## Validación de construcción
- 12/12 pruebas específicas v28.5.3_prod.
- Sintaxis verificada en services/, routes/ y app/: 59 archivos JS/CJS/MJS, 0 errores.
- No se han hecho llamadas reales a Gemini durante la construcción; el consumo real debe verificarse desplegando con la configuración habitual.
