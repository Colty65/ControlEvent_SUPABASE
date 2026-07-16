# V22_prod FIX2 · SQL humano + ficha ColtyLAB

Base: CE_v22_PROD_SQL_SELECT_REAL_FIX1_COLTYLAB.zip

Cambios:
- Los resultados de SELECTs de Zuzu se presentan humanizados: se ocultan códigos internos tipo id/persona_id/event_id/producto_id/tienda_id y se resuelve donor_ref P:/T: cuando hay nombre disponible.
- Se refuerza el prompt del planificador para que Gemini use alias humanos y JOINs para nombres de personas, productos, tiendas, responsables y donantes.
- Se refuerza el prompt de redacción para que Zuzu no mencione códigos técnicos internos.
- La ficha ColtyLAB se abre también al pulsar sobre todo el bloque ColtyLAB/usuario cuando no hay evento seleccionado, no solo tras login.
- Cache bust de los scripts tocados.

No se toca logon, selector, módulos de negocio, resumen, gráficas ni vista aérea.
