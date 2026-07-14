# FIX25 PARTE 3 aplicado

Base: CE_v21_PROD_BASE_FIX24_PARTE2.zip

Cambios pequeños, centrados en informe Zuzu:

1. Alcance del informe
   - Si el contexto viene de plantillas cerradas / alcance estricto, la cabecera multi-evento pasa a "Consulta restringida · N eventos".
   - No cambia la resolución de eventos ni el selector.

2. Módulos accesorios
   - TICKETS solo se extrae si el prompt pide ticket/fototicket/TK.
   - DOCUMENTOS solo se extrae si el prompt pide documentos/DOC/adjuntos.
   - Evita anexos y tablas que no venían a cuento en comparativas de producto disponible.

3. Socios / asistencia canónica en informes Zuzu
   - Se replica el criterio visual de ASISTENCIA:
     * censo: PERSONAS con rango SOCIO;
     * excluye Grupo..., Peña..., Personas..., z_de... y z_DEV...;
     * parejas con " y " cuentan como 2 y sustituyen a individuales duplicados;
     * asistentes = colaboradores SOCIO del evento con Numero > 0, aunque estén Pendiente;
     * no asistentes = censo canónico menos asistentes canónicos.
   - Nuevas tablas: resumen canónico y detalle canónico de socios asistentes/no asistentes.
   - Resumen operativo incluye columnas canónicas: socios canónicos, socios asistentes y socios no asistentes.

4. Redacción Zuzu
   - Se eliminan ejemplos sueltos de productos/compras en el contexto narrativo para informes operativos.
   - Zuzu recibe instrucción explícita de no meter listas de ejemplos salvo que el usuario pida ranking/top/ejemplos.

Archivos tocados:
- services/event-ai.service.js
