-- ControlEvent v4_1_exp · RAW14Q · Memoria episódica Zuzu
-- Ejecutar una sola vez en Supabase. Es idempotente y también está incluido al final de ce_zuzu_conversation_ledger.sql.
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
