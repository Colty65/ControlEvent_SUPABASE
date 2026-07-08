# ControlEvent v19_prod FIX41 - Zuzu compras + UI compras/donaciones

Cambios:

1. Planificación inicial
- Donaciones locales: Zuzu no repite donaciones.
- Prompt a Zuzu recortado: brief + momentos + resumen de donaciones + catálogo reducido útil.
- Se prioriza gemini-2.5-flash antes de flash-lite.
- Timeout de planificación ampliado y prompt final trazado con `promptCharsFinal`.

2. Ajuste automático de saldo
- Mantiene prioridad, pero ahora por proporción: pack de Coca-Cola acompaña ron + whisky; pack de tónica acompaña 2 ginebras; los ciclos añaden saco de hielo de 5 bolsas de 2 kg.
- Conserva topes para evitar inflados absurdos.

3. Compras / Donaciones
- Vista ligera vuelve a mostrar Unidades y Precio además del Total.
- Compras: tienda verde, ticket/gastos negro negrilla, Pte.Compra rojo, responsable azul negrilla.
- Donaciones: donante verde, responsable negro, tipo azul.
- Evita repetir donante en donaciones como tienda + donorRef.

No tocado: gráficas, resumen presupuestario, globos, fotos ni documentos.
