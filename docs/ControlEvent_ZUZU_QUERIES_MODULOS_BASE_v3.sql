/*
  ControlEvent / Zuzu - Querys base de módulos de extracción v2
  Objetivo: devolver registros completos y legibles, sin exponer ids técnicos.

  Cambios v2:
  - INGRESOS/COLABORADORES, COMPRAS y DONACIONES anteponen siempre "Evento" como primer dato.
  - DONACIONES resuelve "Donante" según el tipo:
      DONADO TIENDA -> busca primero en ce_tiendas y después en ce_personas/texto libre.
      DONADO SOCIO / DONADO OTROS -> busca primero en ce_personas y después en ce_tiendas/texto libre.
  - EVENTOS incluye "Precio" justo después de "Titulo del evento".

  Cambios v3:
  - DONACIONES normaliza donor_ref cuando viene con prefijo de la app, por ejemplo P:id-xxxx o T:id-xxxx.
    Antes no coincidía con ce_personas.id / ce_tiendas.id y por eso se veía el código.
  - Si donor_ref es un id técnico que no encuentra maestro, NO se devuelve el código; se muestra "Donante no encontrado en maestro".
  - Si donor_ref es texto libre real, se conserva como Donante.

  Uso:
  - Sustituir los valores NULL de params por filtros reales cuando proceda.
  - Para extraer TODO un evento: poner p_event_id = '<id_evento>' y dejar los demás filtros en NULL.
  - Para extraer una persona/tienda/producto concreta: rellenar el filtro correspondiente.
  - Si se ejecuta desde app con Supabase/PostgREST, paginar siempre si se consulta tabla directa.
*/

/* =========================================================
   1) INGRESOS / COLABORADORES
   Registro: Evento; Nombre; Numero; Importe obligatorio; Importe voluntario; Ingreso
   Base: ce_colaboradores + ce_personas + ce_eventos
   ========================================================= */
WITH params AS (
  SELECT
    NULL::text AS p_event_id,        -- ejemplo: 'id-xxxx'
    NULL::text AS p_nombre_persona   -- ejemplo: 'Pocholo'
)
SELECT
  coalesce(nullif(e.titulo, ''), 'Sin evento') AS "Evento",
  coalesce(nullif(pe.nombre, ''), 'Sin nombre') AS "Nombre",
  c.numero AS "Numero",
  CASE
    WHEN upper(coalesce(pe.rango, '')) = 'SOCIO'
      THEN round((coalesce(c.numero, 0) * coalesce(e.precio, 0))::numeric, 2)
    ELSE 0::numeric
  END AS "Importe obligatorio",
  round(coalesce(c.importe, 0)::numeric, 2) AS "Importe voluntario",
  CASE
    WHEN upper(coalesce(c.situacion, '')) LIKE '%BANCO%' THEN 'BANCO'
    WHEN upper(coalesce(c.situacion, '')) LIKE '%BIZUM%' THEN 'BIZUM'
    WHEN upper(coalesce(c.situacion, '')) LIKE '%EFECTIVO%' THEN 'EFECTIVO'
    WHEN upper(coalesce(c.situacion, '')) LIKE '%PEND%' THEN 'PENDIENTE'
    ELSE upper(coalesce(nullif(c.situacion, ''), 'PENDIENTE'))
  END AS "Ingreso"
FROM public.ce_colaboradores c
JOIN public.ce_eventos e ON e.id::text = c.event_id::text
LEFT JOIN public.ce_personas pe ON pe.id::text = c.persona_id::text
CROSS JOIN params p
WHERE (p.p_event_id IS NULL OR c.event_id::text = p.p_event_id)
  AND (p.p_nombre_persona IS NULL OR pe.nombre ILIKE '%' || p.p_nombre_persona || '%')
ORDER BY e.fecha_fin DESC NULLS LAST, e.fecha_ini DESC NULLS LAST, pe.nombre NULLS LAST, c.id;


/* =========================================================
   2A) COMPRAS PROPIAMENTE DICHAS
   Registro: Evento; Producto; Unidades; Precio; Importe; Ticket u otros gastos; Tienda; Responsable
   Base: ce_compras + ce_eventos + ce_productos + ce_tiendas + ce_personas
   Excluye DONADO SOCIO / DONADO TIENDA / DONADO OTROS
   ========================================================= */
WITH params AS (
  SELECT
    NULL::text AS p_event_id,
    NULL::text AS p_producto,
    NULL::text AS p_tienda,
    NULL::text AS p_responsable,
    NULL::text AS p_ticket
), base AS (
  SELECT
    c.*,
    e.titulo AS evento_titulo,
    e.fecha_ini AS evento_fecha_ini,
    e.fecha_fin AS evento_fecha_fin,
    pr.nombre AS producto_nombre,
    t.nombre AS tienda_nombre,
    r.nombre AS responsable_nombre,
    CASE
      WHEN coalesce(c.ticket_donacion, '') ~* 'PTE\.?[[:space:]]*COMPRA|PENDIENTE'
        THEN 'Pte. Compra'
      WHEN coalesce(c.ticket_donacion, '') ~* 'TK[[:space:]]*[0-9]'
        THEN regexp_replace(substring(upper(c.ticket_donacion) from 'TK[[:space:]]*[0-9][0-9A-Z_-]*'), '[[:space:]]+', '', 'g')
      WHEN nullif(c.ticket_donacion, '') IS NOT NULL
        THEN c.ticket_donacion
      ELSE 'GASTOS CORRIENTES'
    END AS etiqueta_ticket_gasto
  FROM public.ce_compras c
  JOIN public.ce_eventos e ON e.id::text = c.event_id::text
  LEFT JOIN public.ce_productos pr ON pr.id::text = c.producto_id::text
  LEFT JOIN public.ce_tiendas t ON t.id::text = c.tienda_id::text
  LEFT JOIN public.ce_personas r ON r.id::text = c.responsable_id::text
  WHERE upper(coalesce(c.ticket_donacion, '')) NOT IN ('DONADO SOCIO', 'DONADO TIENDA', 'DONADO OTROS')
)
SELECT
  coalesce(nullif(evento_titulo, ''), 'Sin evento') AS "Evento",
  coalesce(nullif(producto_nombre, ''), 'Sin producto') AS "Producto",
  coalesce(unidades, 0) AS "Unidades",
  coalesce(precio, 0) AS "Precio",
  round((coalesce(unidades, 0) * coalesce(precio, 0))::numeric, 2) AS "Importe",
  etiqueta_ticket_gasto AS "Ticket u otros gastos",
  coalesce(nullif(tienda_nombre, ''), 'Sin tienda') AS "Tienda",
  coalesce(nullif(responsable_nombre, ''), 'Sin responsable') AS "Responsable"
FROM base b
CROSS JOIN params p
WHERE (p.p_event_id IS NULL OR b.event_id::text = p.p_event_id)
  AND (p.p_producto IS NULL OR b.producto_nombre ILIKE '%' || p.p_producto || '%')
  AND (p.p_tienda IS NULL OR b.tienda_nombre ILIKE '%' || p.p_tienda || '%')
  AND (p.p_responsable IS NULL OR b.responsable_nombre ILIKE '%' || p.p_responsable || '%')
  AND (p.p_ticket IS NULL OR b.etiqueta_ticket_gasto ILIKE '%' || p.p_ticket || '%')
ORDER BY evento_fecha_fin DESC NULLS LAST, evento_fecha_ini DESC NULLS LAST, etiqueta_ticket_gasto, producto_nombre NULLS LAST, b.id;


/* =========================================================
   2B) DONACIONES DE PRODUCTO
   Registro: Evento; Producto; Unidades; Precio; Valor; Tipo de donación; Donante; Responsable
   Base: ce_compras + ce_eventos + ce_productos + ce_personas/ce_tiendas para donante y responsable
   Solo DONADO SOCIO / DONADO TIENDA / DONADO OTROS

   NOTA IMPORTANTE:
   En la app donor_ref puede venir como:
     - id-xxxx       -> id directo
     - P:id-xxxx     -> persona
     - T:id-xxxx     -> tienda
     - texto libre   -> donante sin maestro
   Por eso se crea donor_ref_limpio quitando el prefijo antes de hacer JOIN.
   ========================================================= */
WITH params AS (
  SELECT
    NULL::text AS p_event_id,
    NULL::text AS p_producto,
    NULL::text AS p_donante,
    NULL::text AS p_responsable,
    NULL::text AS p_tipo_donacion
), base AS (
  SELECT
    c.*,
    e.titulo AS evento_titulo,
    e.fecha_ini AS evento_fecha_ini,
    e.fecha_fin AS evento_fecha_fin,
    pr.nombre AS producto_nombre,
    r.nombre AS responsable_nombre,
    upper(coalesce(c.ticket_donacion, '')) AS tipo_donacion,
    coalesce(c.donor_ref::text, '') AS donor_ref_original,
    regexp_replace(coalesce(c.donor_ref::text, ''), '^[A-Za-z]+:', '', 'i') AS donor_ref_limpio
  FROM public.ce_compras c
  JOIN public.ce_eventos e ON e.id::text = c.event_id::text
  LEFT JOIN public.ce_productos pr ON pr.id::text = c.producto_id::text
  LEFT JOIN public.ce_personas r ON r.id::text = c.responsable_id::text
  WHERE upper(coalesce(c.ticket_donacion, '')) IN ('DONADO SOCIO', 'DONADO TIENDA', 'DONADO OTROS')
), resuelta AS (
  SELECT
    b.*,
    dp.nombre AS donante_persona,
    dt.nombre AS donante_tienda,
    CASE
      WHEN nullif(b.donor_ref_original, '') IS NULL THEN NULL
      WHEN b.donor_ref_original ~* '^[A-Za-z]+:id-' THEN NULL
      WHEN b.donor_ref_original ~* '^id-' THEN NULL
      ELSE b.donor_ref_original
    END AS donor_ref_texto_libre
  FROM base b
  LEFT JOIN public.ce_personas dp ON dp.id::text = b.donor_ref_limpio
  LEFT JOIN public.ce_tiendas dt ON dt.id::text = b.donor_ref_limpio
), final AS (
  SELECT
    r.*,
    CASE
      WHEN r.tipo_donacion = 'DONADO TIENDA'
        THEN coalesce(nullif(r.donante_tienda, ''), nullif(r.donante_persona, ''), nullif(r.donor_ref_texto_libre, ''), 'Donante no encontrado en maestro')
      WHEN r.tipo_donacion IN ('DONADO SOCIO', 'DONADO OTROS')
        THEN coalesce(nullif(r.donante_persona, ''), nullif(r.donante_tienda, ''), nullif(r.donor_ref_texto_libre, ''), 'Donante no encontrado en maestro')
      ELSE coalesce(nullif(r.donante_persona, ''), nullif(r.donante_tienda, ''), nullif(r.donor_ref_texto_libre, ''), 'Donante no encontrado en maestro')
    END AS donante_claro
  FROM resuelta r
)
SELECT
  coalesce(nullif(evento_titulo, ''), 'Sin evento') AS "Evento",
  coalesce(nullif(producto_nombre, ''), 'Sin producto') AS "Producto",
  coalesce(unidades, 0) AS "Unidades",
  coalesce(precio, 0) AS "Precio",
  round((coalesce(unidades, 0) * coalesce(precio, 0))::numeric, 2) AS "Valor",
  tipo_donacion AS "Tipo de donación",
  donante_claro AS "Donante",
  coalesce(nullif(responsable_nombre, ''), 'Sin responsable') AS "Responsable"
FROM final f
CROSS JOIN params p
WHERE (p.p_event_id IS NULL OR f.event_id::text = p.p_event_id)
  AND (p.p_producto IS NULL OR f.producto_nombre ILIKE '%' || p.p_producto || '%')
  AND (p.p_donante IS NULL OR f.donante_claro ILIKE '%' || p.p_donante || '%')
  AND (p.p_responsable IS NULL OR f.responsable_nombre ILIKE '%' || p.p_responsable || '%')
  AND (p.p_tipo_donacion IS NULL OR f.tipo_donacion ILIKE '%' || p.p_tipo_donacion || '%')
ORDER BY evento_fecha_fin DESC NULLS LAST, evento_fecha_ini DESC NULLS LAST, donante_claro, producto_nombre NULLS LAST, f.id;


/* =========================================================
   3) EVENTOS
   Registro: Titulo del evento; Precio; fecha ini; fecha fin; Estado
   Base: ce_eventos
   ========================================================= */
WITH params AS (
  SELECT
    NULL::text AS p_event_id,
    NULL::text AS p_titulo
)
SELECT
  titulo AS "Titulo del evento",
  coalesce(precio, 0) AS "Precio",
  fecha_ini AS "fecha ini",
  fecha_fin AS "fecha fin",
  situacion AS "Estado"
FROM public.ce_eventos e
CROSS JOIN params p
WHERE (p.p_event_id IS NULL OR e.id::text = p.p_event_id)
  AND (p.p_titulo IS NULL OR e.titulo ILIKE '%' || p.p_titulo || '%')
ORDER BY e.fecha_fin DESC NULLS LAST, e.fecha_ini DESC NULLS LAST, e.titulo;


/* =========================================================
   4) PERSONAS
   Registro: Nombre persona; Rango
   Base: ce_personas
   ========================================================= */
WITH params AS (
  SELECT
    NULL::text AS p_nombre_persona,
    NULL::text AS p_rango
)
SELECT
  nombre AS "Nombre persona",
  upper(coalesce(rango, '')) AS "Rango"
FROM public.ce_personas pna
CROSS JOIN params p
WHERE (p.p_nombre_persona IS NULL OR pna.nombre ILIKE '%' || p.p_nombre_persona || '%')
  AND (p.p_rango IS NULL OR pna.rango ILIKE '%' || p.p_rango || '%')
ORDER BY pna.nombre;


/* =========================================================
   5) PRODUCTOS
   Registro: Nombre producto; Segmento; Destino; Precio rfa.
   Base: ce_productos
   ========================================================= */
WITH params AS (
  SELECT
    NULL::text AS p_producto,
    NULL::text AS p_segmento,
    NULL::text AS p_destino
)
SELECT
  nombre AS "Nombre producto",
  segmento AS "Segmento",
  destino AS "Destino",
  coalesce(default_precio, 0) AS "Precio rfa."
FROM public.ce_productos pr
CROSS JOIN params p
WHERE (p.p_producto IS NULL OR pr.nombre ILIKE '%' || p.p_producto || '%')
  AND (p.p_segmento IS NULL OR pr.segmento ILIKE '%' || p.p_segmento || '%')
  AND (p.p_destino IS NULL OR pr.destino ILIKE '%' || p.p_destino || '%')
ORDER BY pr.nombre;


/* =========================================================
   6) TIENDAS
   Registro: Nombre tienda
   Base: ce_tiendas
   ========================================================= */
WITH params AS (
  SELECT NULL::text AS p_tienda
)
SELECT
  nombre AS "Nombre tienda"
FROM public.ce_tiendas t
CROSS JOIN params p
WHERE (p.p_tienda IS NULL OR t.nombre ILIKE '%' || p.p_tienda || '%')
ORDER BY t.nombre;
