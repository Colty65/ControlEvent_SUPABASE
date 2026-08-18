-- ControlEvent · Zuzu · normalización aprendida de nombres oídos/escritos
-- Ejecutar UNA vez en Supabase SQL Editor antes de usar el aprendizaje automático.

create table if not exists public.ce_zuzu_normalizaciones (
  id uuid primary key default gen_random_uuid(),
  datos text not null check (datos in ('EVENTOS','PERSONAS','PRODUCTOS','TIENDAS','OTROS')),
  texto text not null,
  texto_norm text not null,
  dato_bueno text not null,
  dato_id text null,
  origen text not null default 'voz-aprendizaje',
  confianza numeric(5,4) not null default 1.0000 check (confianza >= 0 and confianza <= 1),
  usos integer not null default 1 check (usos >= 0),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint ce_zuzu_normalizaciones_tipo_texto_uq unique (datos, texto_norm)
);

create index if not exists ce_zuzu_normalizaciones_lookup_idx
  on public.ce_zuzu_normalizaciones (datos, texto_norm)
  where activo = true;

create index if not exists ce_zuzu_normalizaciones_destino_idx
  on public.ce_zuzu_normalizaciones (datos, dato_bueno)
  where activo = true;

alter table public.ce_zuzu_normalizaciones enable row level security;

comment on table public.ce_zuzu_normalizaciones is
  'Diccionario aprendido por Zuzu: texto oído/escrito -> nombre canónico de ControlEvent.';
comment on column public.ce_zuzu_normalizaciones.datos is
  'EVENTOS, PERSONAS, PRODUCTOS, TIENDAS u OTROS.';
comment on column public.ce_zuzu_normalizaciones.texto is
  'Texto tal como llegó de voz/conversación.';
comment on column public.ce_zuzu_normalizaciones.dato_bueno is
  'Nombre canónico real usado por ControlEvent.';

-- No se crean políticas para anon/authenticated: el navegador no debe escribir aquí.
-- El backend de ControlEvent usa la service role y puede leer/aprender sin exponer la tabla al cliente.
