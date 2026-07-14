# CE_v21_PROD_BASE_FIX20

Base: CE_v21_PROD_BASE_FIX19.

Cambios aplicados:

1. Alcance Zuzu / ControlEvent
- En prompts con alcance cerrado (SOLO, exactos, no consulta global, no analizar otros), ControlEvent fuerza `ALCANCE_CERRADO_SOLO_EVENTOS_SOLICITADOS`.
- Si hay lista numerada o eventos exactos, la extracción se restringe estrictamente a esos eventos.
- No se aplica fallback a evento activo ni a todos los eventos.
- No se aplican filtros por años deducidos si ya hay títulos exactos.
- La cabecera multi-evento de alcance cerrado aparece como `Consulta restringida · N eventos`, no `Consulta global`.

2. Asistencia canónica en informe
- Asistentes: colaboradores del evento con rango SOCIO y Numero > 0, aunque el ingreso esté Pendiente.
- No asistentes: censo canónico de socios menos asistentes canónicos.
- Censo canónico: SOCIO, excluye z_*/z_DEV, Grupo*, Peña*, y parejas con y/e cuentan como 2 y sustituyen a individuales duplicados.
- Se sustituyen las tablas antiguas de “Socios de PERSONAS que NO figuran...” por tablas canónicas de asistencia.

3. Ficha ColtyLAB sin evento
- Si no hay evento real seleccionado, el logo/ficha no abre AVANCE vacío.
- Abre ficha de presentación/version.

No tocado:
- logon
- selector de eventos
- resumen/gráficas/vista aérea/donaciones visuales
- rendimiento
