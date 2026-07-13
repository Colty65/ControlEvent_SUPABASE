-- ControlEvent v21_prod - FIX MAESTROS CATALOGO LIBRE SIN CAMBIO DE VERSION
-- Ejecutar UNA VEZ en Supabase SQL Editor antes de probar los mantenimientos.
-- Objetivo: permitir guardar PERSONAS, TIENDAS y PRODUCTOS existentes desde MANTO aunque
-- aparezcan usados en eventos Finalizados. No modifica COMPRAS/DONACIONES historicas;
-- solo actualiza las tablas maestras de catalogo.

CREATE OR REPLACE FUNCTION public.ce_update_persona_catalogo_libre(
  p_id text,
  p_nombre text,
  p_rango text DEFAULT 'SOCIO'
)
RETURNS SETOF public.ce_personas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.ce_personas;
BEGIN
  IF coalesce(trim(p_id), '') = '' THEN
    RAISE EXCEPTION 'Falta id de persona para actualizar catalogo';
  END IF;
  IF coalesce(trim(p_nombre), '') = '' THEN
    RAISE EXCEPTION 'Falta nombre de persona para actualizar catalogo';
  END IF;

  ALTER TABLE public.ce_personas DISABLE TRIGGER USER;

  UPDATE public.ce_personas
     SET nombre = trim(p_nombre),
         rango = upper(trim(coalesce(p_rango, 'SOCIO'))),
         updated_at = now()
   WHERE id = p_id
   RETURNING * INTO v_row;

  ALTER TABLE public.ce_personas ENABLE TRIGGER USER;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'No existe persona para actualizar catalogo: %', p_id;
  END IF;

  RETURN NEXT v_row;
  RETURN;
EXCEPTION WHEN OTHERS THEN
  BEGIN
    ALTER TABLE public.ce_personas ENABLE TRIGGER USER;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION public.ce_update_tienda_catalogo_libre(
  p_id text,
  p_nombre text
)
RETURNS SETOF public.ce_tiendas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.ce_tiendas;
BEGIN
  IF coalesce(trim(p_id), '') = '' THEN
    RAISE EXCEPTION 'Falta id de tienda para actualizar catalogo';
  END IF;
  IF coalesce(trim(p_nombre), '') = '' THEN
    RAISE EXCEPTION 'Falta nombre de tienda para actualizar catalogo';
  END IF;

  ALTER TABLE public.ce_tiendas DISABLE TRIGGER USER;

  UPDATE public.ce_tiendas
     SET nombre = trim(p_nombre),
         updated_at = now()
   WHERE id = p_id
   RETURNING * INTO v_row;

  ALTER TABLE public.ce_tiendas ENABLE TRIGGER USER;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'No existe tienda para actualizar catalogo: %', p_id;
  END IF;

  RETURN NEXT v_row;
  RETURN;
EXCEPTION WHEN OTHERS THEN
  BEGIN
    ALTER TABLE public.ce_tiendas ENABLE TRIGGER USER;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION public.ce_update_producto_catalogo_libre_v2(
  p_id text,
  p_set_nombre boolean DEFAULT false,
  p_nombre text DEFAULT null,
  p_set_precio boolean DEFAULT false,
  p_default_precio numeric DEFAULT null,
  p_set_tienda boolean DEFAULT false,
  p_default_tienda_id text DEFAULT null,
  p_set_segmento boolean DEFAULT false,
  p_segmento text DEFAULT null,
  p_set_destino boolean DEFAULT false,
  p_destino text DEFAULT null
)
RETURNS SETOF public.ce_productos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.ce_productos;
BEGIN
  IF coalesce(trim(p_id), '') = '' THEN
    RAISE EXCEPTION 'Falta id de producto para actualizar catalogo';
  END IF;

  IF p_set_nombre AND coalesce(trim(p_nombre), '') = '' THEN
    RAISE EXCEPTION 'Falta nombre de producto para actualizar catalogo';
  END IF;

  ALTER TABLE public.ce_productos DISABLE TRIGGER USER;

  UPDATE public.ce_productos
     SET nombre = CASE WHEN p_set_nombre THEN trim(p_nombre) ELSE nombre END,
         default_precio = CASE WHEN p_set_precio THEN coalesce(p_default_precio, 0) ELSE default_precio END,
         default_tienda_id = CASE WHEN p_set_tienda THEN nullif(trim(coalesce(p_default_tienda_id, '')), '') ELSE default_tienda_id END,
         segmento = CASE WHEN p_set_segmento THEN trim(coalesce(p_segmento, '')) ELSE segmento END,
         destino = CASE WHEN p_set_destino THEN trim(coalesce(p_destino, '')) ELSE destino END,
         updated_at = now()
   WHERE id = p_id
   RETURNING * INTO v_row;

  ALTER TABLE public.ce_productos ENABLE TRIGGER USER;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'No existe producto para actualizar catalogo: %', p_id;
  END IF;

  RETURN NEXT v_row;
  RETURN;
EXCEPTION WHEN OTHERS THEN
  BEGIN
    ALTER TABLE public.ce_productos ENABLE TRIGGER USER;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ce_update_persona_catalogo_libre(text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ce_update_tienda_catalogo_libre(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ce_update_producto_catalogo_libre_v2(text, boolean, text, boolean, numeric, boolean, text, boolean, text, boolean, text) TO anon, authenticated, service_role;
