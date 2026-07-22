# ControlEvent v23_prod

## Objetivo

Versión de producción centrada en coherencia de asistencia, identidad de Zuzu, meteorología y versionado integral.

## Cambios aplicados

- **Asistencia canónica única** en Zuzu, informes, tablas y ficha **AVANCE DEL EVENTO**.
  - Se distinguen siempre **registros de ingreso** y **personas asistentes**.
  - Las parejas registradas en una sola fila cuentan por las personas asociadas.
  - Se separan **socios asistentes**, **no socios asistentes**, **total de asistentes** y **socios no asistentes**.
  - Se excluyen del censo/listados técnicos `Grupo...`, `Peña...`, `Personas...`, `z_DEV...` y equivalentes.
  - El listado de socios no asistentes se obtiene únicamente del cálculo canónico; nunca del catálogo bruto de personas.
- **Zuzu masculino**: se presenta como buen amigo, cercano y locuaz; evita formas femeninas y termina las respuestas útiles con **«Pregúntame lo que quieras»**.
- **Meteorología**:
  - El día de la semana se calcula determinísticamente desde la fecha ISO.
  - 24/07/2026 = Viernes, 25/07/2026 = Sábado y 26/07/2026 = Domingo.
  - Las tablas y tarjetas incluyen día y fecha.
  - La gráfica de máximas/mínimas incorpora ejes, escala, fechas, leyenda, dos series y valores visibles.
- **Informe ejecutivo de una página**:
  - Si se pide `1 pag`, se eliminan anexos extensos.
  - Se presenta un resumen compacto con semáforos y una tabla meteorológica reducida.
- **Versionado integral v23_prod**:
  - Interfaz, metadatos, backend, trazas y descargas.
  - INFOEVENTO y BACKUP, tanto en nombre externo del fichero como en metadatos y celdas internas.
  - Ficha AVANCE DEL EVENTO y etiqueta visible de Zuzu.

## Validación específica

Se probó el cálculo con un escenario de 14 registros administrativos formado por 12 registros de socios y 2 de no socios. El resultado canónico fue:

- 21 socios asistentes.
- 2 no socios asistentes.
- 23 asistentes totales.
- 14 registros de ingreso, mostrados como dato administrativo separado.
