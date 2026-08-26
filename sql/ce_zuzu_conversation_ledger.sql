-- ControlEvent v3_0_exp · Zuzu Ledger Inmutable v1
-- Ejecutar una vez en Supabase. Es idempotente.
-- El backend usa la conexión administrativa de ControlEvent; la app cliente no accede directamente a estas tablas.

create table if not exists public.ce_zuzu_conversations (
  conversation_id text primary key,
  user_id text not null,
  user_name text not null default '',
  title text not null default 'Conversación Zuzu',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  current_seq integer not null default 0,
  current_turn_id text not null default '',
  selected_event_id text not null default '',
  status text not null default 'active'
);

create table if not exists public.ce_zuzu_turns (
  turn_id text primary key,
  conversation_id text not null,
  seq integer not null,
  user_prompt text not null default '',
  action_type text not null default '',
  gemini_plan jsonb not null default '{}'::jsonb,
  normalized_plan jsonb not null default '{}'::jsonb,
  execution jsonb not null default '{}'::jsonb,
  dataset_id text not null default '',
  view_id text not null default '',
  parent_turn_id text not null default '',
  referenced_turn_id text not null default '',
  status text not null default 'OK',
  title text not null default '',
  answer text not null default '',
  created_at timestamptz not null default now(),
  unique (conversation_id, seq)
);

create table if not exists public.ce_zuzu_datasets (
  dataset_id text primary key,
  conversation_id text not null,
  source_turn_id text not null,
  domain text not null default '',
  scope jsonb not null default '{}'::jsonb,
  row_count integer not null default 0,
  columns jsonb not null default '[]'::jsonb,
  rows jsonb not null default '[]'::jsonb,
  facts jsonb not null default '{}'::jsonb,
  provenance jsonb not null default '{}'::jsonb,
  fingerprint text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.ce_zuzu_views (
  view_id text primary key,
  conversation_id text not null,
  dataset_id text not null,
  source_turn_id text not null,
  visible_fields jsonb not null default '[]'::jsonb,
  sort jsonb not null default '[]'::jsonb,
  row_filters jsonb not null default '[]'::jsonb,
  group_by jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '[]'::jsonb,
  row_limit integer,
  presentation jsonb not null default '{}'::jsonb,
  title text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists ce_zuzu_conversations_user_updated_idx
  on public.ce_zuzu_conversations (user_id, updated_at desc);
create index if not exists ce_zuzu_turns_conversation_seq_idx
  on public.ce_zuzu_turns (conversation_id, seq);
create index if not exists ce_zuzu_turns_created_idx
  on public.ce_zuzu_turns (created_at desc);
create index if not exists ce_zuzu_datasets_conversation_idx
  on public.ce_zuzu_datasets (conversation_id, created_at desc);
create index if not exists ce_zuzu_views_conversation_idx
  on public.ce_zuzu_views (conversation_id, created_at desc);
create index if not exists ce_zuzu_views_dataset_idx
  on public.ce_zuzu_views (dataset_id);

comment on table public.ce_zuzu_turns is 'Ledger inmutable de turnos Zuzu: plan Gemini bruto/normalizado y ejecución CE.';
comment on table public.ce_zuzu_datasets is 'Snapshots de datos producidos por consultas Zuzu. Una VIEW nueva reutiliza el dataset sin duplicar filas.';
comment on table public.ce_zuzu_views is 'Presentaciones/transformaciones locales sobre datasets Zuzu.';

-- RAW14Q · MEMORIA EPISÓDICA ZUZU
-- El ledger técnico sigue conservando todos los turnos; estas columnas marcan únicamente
-- los que tienen sustancia suficiente para ser recordados por Zuzu.
alter table public.ce_zuzu_conversations
  add column if not exists memory_summary text not null default '',
  add column if not exists memory_main_topics jsonb not null default '[]'::jsonb,
  add column if not exists memory_main_entities jsonb not null default '[]'::jsonb,
  add column if not exists memory_recallable_turns integer not null default 0;

alter table public.ce_zuzu_turns
  add column if not exists memory_recallable boolean not null default false,
  add column if not exists memory_quality smallint not null default 0,
  add column if not exists memory_summary text not null default '',
  add column if not exists memory_entities jsonb not null default '[]'::jsonb,
  add column if not exists memory_plan_signature jsonb not null default '{}'::jsonb,
  add column if not exists memory_kind text not null default '';

create index if not exists ce_zuzu_turns_memory_recall_idx
  on public.ce_zuzu_turns (conversation_id, created_at asc)
  where memory_recallable = true;
create index if not exists ce_zuzu_turns_memory_user_time_idx
  on public.ce_zuzu_turns (created_at desc)
  where memory_recallable = true;

comment on column public.ce_zuzu_turns.memory_recallable is 'TRUE solo para turnos con sustancia aptos para memoria episódica; errores, ruido, aclaraciones y respuestas técnicas quedan fuera.';
comment on column public.ce_zuzu_turns.memory_summary is 'Resumen temático compacto (máximo 5 líneas) usado para localizar recuerdos sin reinyectar la respuesta completa.';
comment on column public.ce_zuzu_turns.memory_plan_signature is 'Firma operativa del PLAN original para poder reejecutar hoy la misma consulta con datos actuales.';

-- RAW14T · MEMORY CORE DB + SEMILLA DE EXPERIENCIA CE
alter table public.ce_zuzu_conversations
  add column if not exists memory_visibility text not null default 'private';

alter table public.ce_zuzu_turns
  add column if not exists memory_visibility text not null default 'private',
  add column if not exists memory_experience_signature jsonb not null default '{}'::jsonb;

create index if not exists ce_zuzu_turns_memory_visibility_time_idx
  on public.ce_zuzu_turns (memory_visibility, created_at desc)
  where memory_recallable = true;

comment on column public.ce_zuzu_turns.memory_experience_signature is
  'Huella operativa anónima NHC para la futura capa Experiencia CE; no contiene identidad ni valores literales de entidades.';
