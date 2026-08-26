-- ControlEvent v3_0_exp · RAW14T · Memory Core DB + semilla de Experiencia CE
-- Ejecutar UNA vez en Supabase después de RAW14Q. Idempotente.
-- Objetivo: memoria histórica con fuente única en tablas persistentes y dejar preparada
-- una huella operativa ANÓNIMA para aprendizaje futuro sin compartir conversaciones.

alter table public.ce_zuzu_conversations
  add column if not exists memory_visibility text not null default 'private';

alter table public.ce_zuzu_turns
  add column if not exists memory_visibility text not null default 'private',
  add column if not exists memory_experience_signature jsonb not null default '{}'::jsonb;

create index if not exists ce_zuzu_turns_memory_visibility_time_idx
  on public.ce_zuzu_turns (memory_visibility, created_at desc)
  where memory_recallable = true;

comment on column public.ce_zuzu_conversations.memory_visibility is
  'Visibilidad futura del episodio. RAW14T crea y recupera memoria personal como private; no habilita lectura cruzada entre usuarios.';

comment on column public.ce_zuzu_turns.memory_visibility is
  'Visibilidad futura del recuerdo. Por defecto private. No implica compartir conversación ni datos históricos con otros usuarios.';

comment on column public.ce_zuzu_turns.memory_experience_signature is
  'Huella operativa anónima y NHC del turno: acción, dominios, tipo de scope, roles de entidad, operaciones y forma del resultado. No contiene usuario, pregunta/respuesta literal ni valores de PERSON/EVENT/STORE/PRODUCT.';
