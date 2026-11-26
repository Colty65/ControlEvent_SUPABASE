# Control Event v6.1 — Traspaso de compra a donación de tienda (26/11/2026)

Base: ControlEvent_v6_1_COMPLETO_CARGOS_DONACIONES_CPU_20261125.zip.

## Uso
En Compras, encima del botón Eliminar, marcar «Pasar a donaciones». El botón cambia a «Traspasar». Al pulsarlo se muestra confirmación y la fila existente pasa a DONADO TIENDA mediante PUT /api/crud/compras/:id. Si no se marca, Eliminar conserva su comportamiento anterior.

Se conserva el mismo ID, evento, producto, unidades, precio y responsable. La tienda de la compra pasa a donante con `donorRef=T:<id>` cuando se conoce. Si no hay tienda no se inventa. El campo de tienda de compra queda vacío. El estado de entrega predeterminado de la BBDD es «Comprometida»; debe revisarse en Donaciones, especialmente cuando se entregó realmente el producto.

No se crea un segundo registro y no se ejecuta DELETE. La transacción de actualización se delega a la RPC existente de Supabase. Ante error HTTP el registro no se modifica localmente.

## Precauciones
- Si la compra tenía un ticket TK, aparece aviso porque pueden existir vínculos contables anteriores que hay que revisar manualmente.
- Solo se ofrece sobre la lista de Compras; no se altera la Vista aérea.
- Es necesario comprobar en producción los indicadores y la persistencia tras refrescar la página.
- No se incluye ni necesita ningún .env; las variables siguen en Vercel.

## Instalación
Descomprimir el ZIP PARCHE y copiar **public/index.html** y **public/app/features/convertir-compra-donacion-tienda-20261126.js** en el repositorio ControlEvent_SUPABASE. Comprobar en GitHub Desktop que aparecen esos dos archivos, sin .env, antes de hacer commit y push. El ZIP COMPLETO ya contiene las modificaciones.

## Verificaciones locales
- Sintaxis JS verificada con node --check.
- Integridad del ZIP verificada.
- No se han ejecutado pruebas reales contra Supabase ni pruebas de interfaz en navegador. No se ha desplegado a Vercel.
