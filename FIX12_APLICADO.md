# ControlEvent v21_prod · FIX12 aplicado

Cambios aplicados sobre FIX11:

1. Descargas:
   - INGRESOS se mantiene como `ING-Evento-Colaborador.jpg`.
   - DOCUMENTOS DEL EVENTO pasa a `DOC-DD-MM-AAAA-Evento-texto20.jpg`.
   - TICKET/FOTOTICKET fuerza `TKxx-Evento-Tienda.jpg` y extensión `.jpg`.
   - Refuerzo global de captura de descargas DOC/TK en `v19-fix12-prod.js`.

2. INGRESOS / COLABORADORES:
   - Refuerzo de guardado pendiente para que `/api/state` no repinte temporalmente el dato antiguo.
   - Merge visual inmediato del colaborador modificado.
   - Sombreado temporal del registro recién guardado.

3. Vista aérea:
   - Fichas superiores con color menos translúcido.
   - PRODUCTO DISPONIBLE: letra de registros ampliada.
   - Columna SEGMENTO desplazada hacia la izquierda y ajustada para ganar espacio.

4. Zuzu:
   - Preguntas de identidad/persona tipo “quién es X”, “sabes quién es X”, “dime sus datos” solicitan PERSONAS + INGRESOS + COMPRAS + DONACIONES.
   - Búsqueda transversal por persona cuando no se limita a “este evento”.
   - Respuesta local directa para datos de persona incluyendo PERSONAS, usuario logado, ingresos, compras y donaciones.
   - Instrucciones añadidas para usar `Identificacion` en contexto informal y `Nombre` en informes serios/formales.

5. Carga:
   - `index.html` carga `v19-fix12-prod.js` al final con cache busting FIX12.

Comprobaciones:
- `node --check` aplicado a servicios y scripts modificados.
- ZIP validado con `unzip -t`.
