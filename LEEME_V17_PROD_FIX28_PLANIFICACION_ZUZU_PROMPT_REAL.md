# ControlEvent v19_prod_FIX28 - Planificación Zuzu interpreta prompt real

Base: v19_prod_FIX27_WELCOME_INFO_GENERAL recuperada.

Cambio aplicado SOLO en Planificación inicial / Encargo total a Zuzu:

- Las donaciones/existencias explícitas del prompt se siguen cargando directamente para no depender de Zuzu.
- Ahora, aunque el prompt tenga donaciones confirmadas o sea largo, se llama a Zuzu para interpretar también el concepto del evento, duración/días, comidas, preferencias y detalles de compra.
- Se elimina para Encargo total el menú local automático de seguridad que acababa metiendo siempre paella/barbacoa cuando Zuzu no devolvía compras.
- Si Zuzu falla o no devuelve compras utilizables, la app no inventa compra: deja las donaciones/existencias y añade nota para que el usuario complete/acorte el prompt o añada la información que falte.
- Se refuerza el prompt enviado a Zuzu: prohibido usar paella/barbacoa por defecto; solo debe proponerlo si el usuario lo pide o encaja claramente.

No tocado:

- RESUMEN PRESUPUESTARIO / globos.
- GRAFICAS / saldos / render.
- Login, bienvenida, ColtyLAB, móviles, permisos, fotos, compras, donaciones o backend de datos.
