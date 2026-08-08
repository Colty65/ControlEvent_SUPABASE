# ControlEvent v24_prod-02 · Cuadre Banco operativo

## Corrección principal

La ventana se mostraba correctamente, pero quedaba por debajo de algunas capas flotantes antiguas de ControlEvent. Esas capas transparentes podían recibir la pulsación antes que los controles de Cuadre Banco, por eso el aspa y **Cargar CSV** parecían bloqueados.

Esta revisión:

- Sitúa Cuadre Banco por encima de todos los modales, botones flotantes y capas heredadas de la aplicación.
- Fuerza la interacción de botones, campos, listas y controles táctiles.
- Cierra mediante el aspa con ratón, puntero o pantalla táctil; también mantiene la tecla `Esc` y la pulsación fuera de la ventana.
- Abre el selector de archivos con un control nativo asociado al botón **Cargar CSV**, más una captura temprana de seguridad para navegadores o módulos que intercepten eventos.
- Mantiene operativos **Actualizar**, cuenta bancaria, filtros, buscador, casillas de inclusión y vinculación de TKxx.
- Oculta temporalmente el botón flotante de inicio y el indicador PERF mientras la ventana bancaria está abierta.

## Uso

1. Entrar como usuario GD y abrir **Cuadre Banco**.
2. Pulsar **Cargar CSV** y seleccionar el fichero bancario.
3. La importación añade únicamente los movimientos que todavía no existan.
4. Cada movimiento puede incluirse o excluirse del saldo y las salidas pueden justificarse con uno o varios TKxx pagados.

La estructura SQL continúa siendo la definida en `ControlEvent_SQL_V26_PROD_CUADRE_BANCO.sql`.
