# ControlEvent v19_prod - Zuzu planificador de módulos

Base: CE_v17_PROD_FIX50_ZUZU_CALIDAD_ANALITICA.

Cambios principales:

- Versión funcional actualizada a `v19_prod` en cabecera, versión visible, service worker, integridad, rutas de servidor, exportaciones, INFOEVENTO y BACKUP.
- Zuzu deja de recibir contexto masivo de entrada en la primera fase.
- Nueva fase 1: Zuzu lee solo el prompt del usuario y devuelve qué módulos necesita y con qué filtros humanos.
- Nueva fase 2: ControlEvent extrae solo los datos solicitados de EVENTOS, COMPRAS, DONACIONES, INGRESOS, PRODUCTOS, TIENDAS, PERSONAS, TICKETS o DOCUMENTOS.
- Nueva fase 3: Zuzu recibe el paquete filtrado y redacta/prepara la respuesta final.
- Corregido el fallo `rowsOut is not defined`.
- Se sustituyen referencias visibles a Gemini por Zuzu.

Notas:
- Se mantienen nombres históricos de algunos scripts `v17-fix...` como rutas internas de compatibilidad, pero la versión visible, exportada y declarada es `v19_prod`.
- No se han tocado los cálculos de planificación inicial, saldo, resumen, globos, fotos ni compras normales salvo actualización de versión.
