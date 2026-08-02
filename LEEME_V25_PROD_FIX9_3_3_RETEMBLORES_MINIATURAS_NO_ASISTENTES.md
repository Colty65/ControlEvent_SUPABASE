# ControlEvent V25_PROD-FIX9-3-3

Base: `CE_V25_PROD_FIX9_3_2_RESUMEN_GLOBOS_AISLADOS(1).zip`

## Cambios incluidos

1. **Ingresos SOCIOS / NO SOCIOS sin retemblor**
   - Se eliminan repintados periódicos de 2,5 segundos.
   - El bloque de avance solo cambia el DOM cuando cambian realmente sus datos.
   - Se bloquean los globos y flechas heredados durante el paso del puntero.

2. **Por tienda y ticket estable**
   - El renderizador final V17 queda como único propietario de esas filas.
   - Los hotfix antiguos dejan de truncarlas y añadir iconos/atributos de tooltip.
   - Se neutralizan animaciones, transformaciones y pseudoiconos heredados.

3. **Miniatura en GASTOS REALIZADOS**
   - Cada fila `Total tienda TKxx` incluye una miniatura a la derecha del total.
   - Al pulsarla se abre el mismo visor ampliado de GRÁFICAS, con descarga.

4. **SOCIOS no asistentes en ColtyLAB**
   - El censo se construye desde todas las PERSONAS.
   - Los snapshots del evento sobrescriben nombre/rango histórico solo cuando existen.
   - Así, un snapshot parcial ya no elimina del cálculo a los socios sin ingreso/asistencia.

## Comprobación recomendada

- Abrir RESUMEN PRESUPUESTARIO y mantener el puntero sobre SOCIOS, NO SOCIOS y filas de Por tienda y ticket.
- Abrir GASTOS REALIZADOS y comprobar miniatura en `Total tienda TKxx`.
- Abrir ColtyLAB en un evento con socios sin registro de ingreso y verificar la lista roja de no asistentes.

Cache-buster: `20260802-V25-PROD-FIX9-3-3-RETEMBLORES-MINIATURAS-NO-ASISTENTES`

## Validaciones realizadas

- Sintaxis correcta en los **122 scripts activos** referenciados por `public/index.html`.
- Prueba navegador/servidor de asistencia canónica: snapshot parcial + socio sin registro devuelve correctamente al socio en `sociosNoAsistentes`.
- Prueba aislada de GASTOS REALIZADOS: subtotal `Total Tienda Uno TK01`, 7 columnas, miniatura encontrada y atributo `data-ce-g92-photo="1"` para reutilizar el visor de GRÁFICAS.
- Confirmado que los sondeos de 2,5 segundos de HF6/HF7 han sido retirados.

El ZIP original no incluye el archivo que declara el script npm `test:v25-fix3`, por lo que esa orden heredada no puede ejecutarse; las comprobaciones anteriores se realizaron directamente sobre los módulos modificados y sobre todos los scripts activos.
