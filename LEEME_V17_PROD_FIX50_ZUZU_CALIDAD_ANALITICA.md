# ControlEvent v21_prod FIX50 - Zuzu calidad analítica

Base: FIX49.

Cambios:
- La ventana libre de Zuzu deja de convertir peticiones analíticas/gráficas en una auditoría técnica de módulos.
- Si el usuario pide productos consumidos, coste por producto o unidades por producto, ControlEvent entrega a Zuzu COMPRAS + DONACIONES + PRODUCTOS y, si Zuzu falla/rompe JSON, genera un respaldo analítico útil: rankings por coste/valor y por unidades, tablas y CSV.
- Se añade regla explícita al prompt de Zuzu para que agrupe productos consumidos por Producto y cree dos salidas cuando proceda: coste/valor y unidades.
- El fallback genérico de “EVENTOS extraído por ControlEvent” ya no se usa para consultas de análisis/gráficas.
- Se limita la espera de la llamada final a Zuzu para evitar esperas largas sin resultado útil.

No toca Planificación inicial, saldo, resumen, compras, donaciones, fotos ni gráficas internas del evento.
