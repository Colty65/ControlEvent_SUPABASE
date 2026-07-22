# ControlEvent v23_prod_r1

Revisión estructural de Zuzu para corregir informes inexactos, redundantes e incompletos sin añadir parches específicos para una sola pregunta.

## Motor de informes

- Política única de alcance: una petición general de informe o de «detalles de todo tipo» activa descripción del evento, ingresos, asistencia, compras, donaciones, tickets/facturas, documentos y saldos. La meteorología se incorpora cuando se solicita.
- Niveles diferenciados: ejecutivo, resumen, detallado y exhaustivo.
- El informe ejecutivo de una página usa una tabla compacta y no añade anexos o gráficas que lo lleven a una segunda página.
- Las gráficas solo se generan cuando el usuario las pide expresamente.
- En modo detallado se muestran resúmenes útiles y una selección limitada de productos; el listado completo queda reservado al modo exhaustivo.
- Control de cobertura antes de cerrar la respuesta: Zuzu comprueba que todos los apartados pedidos estén presentes.
- Control de redundancia: el nombre del evento se presenta al inicio y las personas o parejas no se enumeran varias veces en el mismo informe.
- La redacción no copia JSON ni tablas crudas y debe interpretar tickets, facturas y documentos.

## Asistencia canónica

- Una sola regla compartida por backend, PDF y ficha AVANCE DEL EVENTO.
- Las parejas cuentan por personas, no por filas administrativas.
- Los registros técnicos, grupos y Peña se excluyen del censo de socios.
- Un registro con `Numero = 0` solo cuenta como asistente si tiene confirmación explícita; un estado pendiente no confirma asistencia.
- Caso de prueba SySA 2026: 21 socios asistentes + 2 no socios asistentes = 23 personas.

## Contexto privado de personas

- Los perfiles facilitados para la Peña se guardan únicamente en un módulo del servidor.
- No se exportan al navegador, BACKUP o INFOEVENTO.
- Zuzu recibe solo los perfiles relevantes para la pregunta y con minimización de datos.
- Edades, salud, peso, consumo de alcohol y rasgos delicados no aparecen en informes generales.
- Las alertas de seguridad alimentaria sí se aplican cuando proceden; por ejemplo, la alergia al marisco de Gema en planificación de menús.
- Los parentescos, apodos y notas personales se usan solo cuando aportan contexto o se solicitan.

## Versión y exportaciones

- Versión centralizada: `v23_prod_r1`.
- BACKUP e INFOEVENTO usan la nueva versión interna y externamente.
- La versión se actualiza en interfaz, backend, nombres de PDF, nombres de descarga y ficha AVANCE DEL EVENTO.

## Validación incluida

Ejecutar:

```bash
npm run test:zuzu
```

La prueba estructural verifica la política de informes, la asistencia canónica 21 + 2 = 23, la privacidad selectiva de perfiles, la cobertura de módulos, la ausencia de columnas redundantes de evento y el comportamiento de una página.
