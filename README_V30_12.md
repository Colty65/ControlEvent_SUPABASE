# ControlEvent v31.2

Base: V30.10_RESCATE estable.

Objetivo de esta versión:
- No tocar login ni globos.
- Mantener la fluidez de la rama de rescate.
- Incorporar en Mapa de recursos:
  - filtro/desplegable por responsables SOCIO;
  - selección de todos, uno o varios responsables;
  - ordenación por Tienda, Pte. Comprar u otros gastos / TKxx, Producto;
  - fichas TKxx en verde Excel transparente;
  - donaciones filtradas por responsable elegido.

Corrección crítica frente a V30.11:
- El observador del Mapa se ha hecho seguro y con debounce.
- No escribe continuamente el menú móvil.
- No actúa mientras está visible la pantalla de login.
