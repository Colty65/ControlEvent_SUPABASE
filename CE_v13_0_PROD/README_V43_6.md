# ControlEvent v5.1.0_prod

Corrección específica de GRAFICAS para eliminar el parpadeo y el consumo innecesario de recursos.

## Cambios

- Se desactiva el render legacy de barras que seguía repintando encima del gráfico de queso.
- Se elimina el observador que provocaba el ciclo barras -> queso -> barras -> queso.
- GRAFICAS queda con un único render estable: diagramas de queso + Por destino.
- Se añaden marcadores internos de compatibilidad para que los scripts legacy no intenten reconstruir las barras antiguas.
- Las barras de Por destino se hacen más anchas para facilitar la pulsación.
- Versión actualizada a ControlEvent v5.1.0_prod.

## Aplicación

Subir el ZIP completo o copiar el parche encima de la v43.5, sustituyendo archivos.
