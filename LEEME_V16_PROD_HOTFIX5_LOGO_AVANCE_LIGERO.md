# ControlEvent v16_prod - HOTFIX5 Logo AVANCE ligero

Solo corrige el acceso a AVANCE DEL EVENTO desde el icono ColtyLAB.

Cambios:
- Se evita que los handlers antiguos del logo vuelvan a abrir el globo pesado anterior.
- El logo se reengancha con un handler limpio, sin MutationObserver pesado.
- El globo de AVANCE se crea como capa propia y efímera.
- Cierra con clic fuera, botón X, Escape, scroll o autocierre.
- No cambia versión y no toca planificación, compras, documentos, justificantes ni tickets.
