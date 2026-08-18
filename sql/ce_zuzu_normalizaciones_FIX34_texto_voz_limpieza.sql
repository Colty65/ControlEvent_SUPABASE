-- ControlEvent v2.0_exp · FIX34
-- Migración del diccionario de normalización aprendido.
-- 1) añade texto_voz;
-- 2) desactiva SOLO el aprendizaje de la primera versión, que podía guardar conjeturas del planner.
-- No toca eventos, personas, productos, tiendas, compras, ingresos ni ninguna otra tabla.

alter table public.ce_zuzu_normalizaciones
  add column if not exists texto_voz text null;

comment on column public.ce_zuzu_normalizaciones.texto_norm is
  'Clave interna de búsqueda: versión normalizada de texto para comparar y evitar duplicados.';
comment on column public.ce_zuzu_normalizaciones.texto_voz is
  'Forma opcional/natural que Zuzu usará únicamente al hablar dato_bueno; pantalla y PDF conservan el dato canónico.';

update public.ce_zuzu_normalizaciones
set activo = false,
    updated_at = now()
where origen = 'voz-aprendizaje';

-- Comprobación:
select id, datos, texto, texto_norm, dato_bueno, texto_voz, origen, confianza, usos, activo
from public.ce_zuzu_normalizaciones
order by created_at desc;
