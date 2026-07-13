# ControlEvent v21_prod FIX49 - Zuzu tareas reales y Zuzu más independiente

Cambios:

- Ventana libre de Zuzu: mientras piensa ya no muestra un texto fijo.
- La tarjeta de espera cambia cada 3 segundos indicando la fase real del flujo: lectura del prompt, planificación de módulos, localización de eventos, extracción de datos, preparación de gráficas/tablas, respuesta final de Zuzu y validación de salida.
- Se limpia el temporizador al cerrar la ventana, si hay error o cuando llega la respuesta.
- Backend: se refuerza que Zuzu no debe completar por intuición si falta contexto; debe pedir módulos/eventos/datos concretos a ControlEvent en warnings/answer.
- Planificador de módulos: para peticiones de dispersión, tendencias, año 2025, celebraciones o productos consumidos se fuerza una extracción más completa: EVENTOS, COMPRAS, DONACIONES y PRODUCTOS.
- Se mantiene el modo solo lectura: Zuzu no toca base de datos ni ejecuta SQL.

No se han tocado Planificación inicial, compras, donaciones, resumen, gráficas de la app, fotos ni el cálculo de saldo.
