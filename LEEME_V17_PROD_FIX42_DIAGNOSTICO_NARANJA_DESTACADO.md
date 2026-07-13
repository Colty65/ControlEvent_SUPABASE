# ControlEvent v19_prod - FIX42 Diagnóstico naranja destacado

## Cambios realizados
- Los productos/líneas que en el diagnóstico HF27/HF28 aparecen en color naranja (`REVISAR`) ahora se arrastran visualmente a:
  - **PROPUESTA DETALLADA DEL EVENTO**
  - **Detalle avanzado de líneas que se crearán**
- En **PROPUESTA DETALLADA DEL EVENTO**:
  - la ficha completa del producto queda resaltada con borde naranja,
  - aparece un aviso de atención en la propia ficha,
  - la sublínea concreta de donación marcada como `REVISAR` queda todavía más destacada.
- En **Detalle avanzado de líneas**:
  - la tarjeta de la línea queda resaltada,
  - aparece una banda `⚠ REVISAR` indicando que viene del diagnóstico naranja y sigue pendiente de decisión.
- Si en **PROPUESTA DETALLADA DEL EVENTO** se toma una decisión explícita:
  - cambiando el producto del desplegable, o
  - excluyendo la línea,
  el resaltado de revisión se considera atendido y desaparece.

## Objetivo
Que los casos naranjas no se pierdan al pasar del diagnóstico a las pantallas de trabajo posteriores, obligando visualmente a revisarlos antes de generar el evento real.
