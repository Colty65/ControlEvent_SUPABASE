# ControlEvent v29_prod · retoque final y congelación

Cambios finales, sin cambio de versión:

- Banco + ingresos: se conserva la conciliación detallada y el resumen por forma de pago; los ingresos añaden barras nominales por persona/pareja, importe y forma registrada. El detalle se divide en bloques de 8 para PDF.
- Continuidad personal: seguimientos como «estos datos», «pásalo a gráficas», «vuelve a dármelo en tabla» o una reclamación de detalle conservan la persona del hilo antes que los nombres incidentales de eventos.
- Transformaciones locales: detalle, tabla y gráficas de una persona se materializan desde `person_dossier` sin nuevas llamadas Gemini cuando el sujeto ya está resuelto.
- Presentación segura: si Zuzu promete detalle/tabla de una persona, ControlEvent materializa la tabla canónica. El HTML de tabla nunca se muestra como texto crudo.
- Se mantiene `v29_prod` en aplicación, INFOEVENTO, BACKUP y PDF de Zuzu.

Validación: `npm run test:v29` → 11/11 pruebas OK; `node --check services/event-ai.service.js` → OK.
