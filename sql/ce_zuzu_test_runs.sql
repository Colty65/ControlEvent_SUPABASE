-- ControlEvent v1.0_exp · Histórico de ITV Zuzu.
-- Ejecutar una sola vez en Supabase SQL Editor. La app funciona mientras tanto con ce_meta fallback.
create table if not exists public.ce_zuzu_test_runs (
  run_key text primary key,
  seed bigint not null,
  battery_clock text not null default '',
  app_version text not null default 'v1.0_exp',
  created_by text not null default '',
  generated_at timestamptz not null default now(),
  data_counts jsonb not null default '{}'::jsonb,
  generated_battery jsonb not null default '{}'::jsonb,
  report jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ce_zuzu_test_runs_seed_idx on public.ce_zuzu_test_runs(seed);
create index if not exists ce_zuzu_test_runs_updated_idx on public.ce_zuzu_test_runs(updated_at desc);
comment on table public.ce_zuzu_test_runs is 'Histórico GD de baterías ITV Zuzu: preguntas, esperado, respuesta y resultados por semilla.';
