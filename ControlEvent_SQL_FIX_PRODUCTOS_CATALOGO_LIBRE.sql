-- ControlEvent v21_prod - FIX PRODUCTOS CATALOGO LIBRE
-- Ejecutar UNA VEZ en Supabase SQL Editor.
-- Objetivo: permitir actualizar el precio/tienda/segmento/destino general del CATALOGO de PRODUCTOS
-- aunque el producto ya haya sido usado en compras/donaciones de eventos finalizados.
-- No modifica compras históricas: esas líneas conservan su precio usado en su evento.

CREATE OR REPLACE FUNCTION public.ce_update_producto_catalogo_libre(
  p_id text,
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

  -- El bloqueo de evento finalizado NO debe aplicarse al precio maestro del catálogo.
  -- Se desactivan brevemente triggers USER de ce_productos solo dentro de esta actualización controlada.
  ALTER TABLE public.ce_productos DISABLE TRIGGER USER;

  UPDATE public.ce_productos
     SET default_precio = CASE WHEN p_set_precio THEN coalesce(p_default_precio, 0) ELSE default_precio END,
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

GRANT EXECUTE ON FUNCTION public.ce_update_producto_catalogo_libre(text, boolean, numeric, boolean, text, boolean, text, boolean, text) TO anon, authenticated, service_role;
