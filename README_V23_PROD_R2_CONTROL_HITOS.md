# ControlEvent v23_prod_r2 · Control de Hitos 1

Primera versión funcional del módulo **Control de Hitos y Líneas de Gestión (LG)**, construida sobre `v23_prod_r1`.

## Orden de instalación

1. Abrir **Supabase → SQL Editor**.
2. Ejecutar completo `ControlEvent_SQL_V23_R2_HITOS.sql`.
3. Desplegar el contenido de `CE_v23_PROD_R2_CONTROL_HITOS_2_MENU_FIX.zip` en GitHub/Vercel.
4. Seleccionar un evento y pulsar el nuevo icono del cronómetro verde en el pie de ControlEvent.

Si las tablas aún no existen, la propia ventana muestra un aviso indicando qué SQL debe ejecutarse.

## Nuevo módulo

La opción **Control de Hitos** aparece junto a Excel, carga inicial, descarga/backup y mantenimiento. Abre una ventana independiente, válida en PC, iPad, iPhone y Android.

### Hitos

Cada Hito permite registrar, consultar, modificar y eliminar:

- NombreHito.
- Descripción.
- Responsable general, elegido entre los socios canónicos individuales.
- Orden de presentación.
- Fecha mínima y fecha máxima calculadas automáticamente con las LG hijas.

La fecha mínima del Hito es la menor fecha mínima de sus LG. La fecha máxima es la mayor fecha máxima de sus LG. Por ello no se editan manualmente.

### Líneas de Gestión

Cada LG permite registrar, consultar, modificar y eliminar:

- Hito al que pertenece.
- Descripción de la gestión.
- Fecha mínima.
- Fecha máxima.
- Notas.
- Responsable individual.
- Orden dentro del Hito.
- Tipo de dependencia: una o varias LG, o Hito completo.
- Una o varias dependencias previas.
- Una o varias dependencias posteriores.
- Estado cumplida/no cumplida.

## Reglas de control

- Una LG no puede depender de sí misma.
- Una LG no puede depender de su propio Hito completo.
- Todas las dependencias deben pertenecer al mismo evento.
- Se impiden las dependencias circulares.
- No puede cerrarse una LG mientras alguna dependencia previa esté pendiente.
- No puede cerrarse antes de su fecha mínima.
- No puede cerrarse después de su fecha máxima; para continuar una gestión vencida debe modificarse primero su plazo.
- Al definir una dependencia posterior, ControlEvent registra automáticamente en la LG de destino la dependencia previa recíproca.
- Al cerrar una LG, las posteriores quedan desbloqueadas cuando ya no tienen otras previas pendientes.
- Si se reabre una LG o se añade una nueva dependencia pendiente, las LG posteriores que ya no cumplan sus requisitos se reabren automáticamente.
- Al eliminar una LG o un Hito se limpian las referencias cruzadas relacionadas.

Las comprobaciones importantes se realizan tanto en la interfaz como en el servidor. El SQL añade además controles de integridad para impedir cierres inválidos en la base de datos.

## Colores

- **Hito:** cabecera negra y texto en negrita.
- **LG gris claro:** todavía no ha llegado su fecha mínima.
- **LG roja:** está dentro de plazo o vencida y continúa pendiente.
- **LG verde:** está cumplida.

Las LG bloqueadas muestran las dependencias previas pendientes y las vencidas muestran un aviso específico.

## Responsables canónicos

Los desplegables no muestran registros técnicos, grupos ni “Peña”. Las parejas guardadas en un único registro se separan en personas individuales. Cuando existe una ficha individual exacta se conserva su identificador; en otro caso se guarda el nombre canónico como instantánea.

## Tablas creadas

### `ce_hitos`

Contiene el Hito, su evento, descripción, responsable general, fechas calculadas, orden y auditoría temporal.

### `ce_lg`

Contiene la LG, su Hito, plazos, notas, responsable, estado, dependencias previas/posteriores en JSONB, orden y auditoría temporal.

El SQL incluye claves externas, borrado en cascada, restricciones, índices de evento/Hito/responsable/estado/fechas, índices GIN para dependencias y triggers de fechas y validación.

## Alcance de esta primera versión

El módulo es independiente del estado general para evitar parches sobre pantallas antiguas. En esta entrega los Hitos se gestionan desde su propia ventana y sus dos tablas. La incorporación de Hitos a Zuzu, INFOEVENTO y al ciclo completo BACKUP/RESTORE se deja para una segunda iteración después de validar el funcionamiento y la forma de trabajo real con los usuarios.

## Versión

- Aplicación: `v23_prod_r2`
- Build: `20260723-V23-PROD-R2-HITOS2-MENU`
- ZIP: `CE_v23_PROD_R2_CONTROL_HITOS_2_MENU_FIX.zip`
