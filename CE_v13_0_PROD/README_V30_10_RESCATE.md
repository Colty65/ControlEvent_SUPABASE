# ControlEvent v5.1.0_prod RESCATE ESTABLE

Versión generada desde la base estable v30.7 para salir del bloqueo de login de las v30.9.x.

Objetivo:
- recuperar login funcional;
- eliminar la ruta de scripts v30.8/v30.9 que bloqueaba inputs y consumía CPU;
- conservar la fluidez móvil de la línea v29.4/v30.7;
- no añadir cambios nuevos de Mapa de recursos hasta recuperar estabilidad.

Subir todo el contenido del ZIP SOLO_SUBIR_GITHUB sustituyendo archivos existentes.

Después de desplegar en Vercel: cerrar pestañas abiertas y forzar recarga/borrar datos del sitio si el service worker anterior sigue sirviendo caché vieja.
