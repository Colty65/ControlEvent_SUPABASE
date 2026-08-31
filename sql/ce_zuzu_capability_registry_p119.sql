-- ControlEvent v4_0_exp · VNext P1.19
-- Registro/canonizador auditable de capacidades y observaciones JSON. NHC: NO contiene frases del usuario como reglas.

create table if not exists public.ce_zuzu_capabilities (
  operation text primary key,
  module text not null,
  registry_version text not null,
  required_keys jsonb not null default '[]'::jsonb,
  optional_keys jsonb not null default '[]'::jsonb,
  guarded_keys jsonb not null default '[]'::jsonb,
  defaults jsonb not null default '{}'::jsonb,
  result_contract text,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.ce_zuzu_capability_observations (
  id bigint generated always as identity primary key,
  registry_version text not null,
  operation text,
  module text,
  signature text not null,
  signature_hash text not null,
  status text not null default 'PENDING' check (status in ('KNOWN','PENDING','REJECTED','PROMOTED','INVALID','SANITIZED')),
  classification text,
  prompt text,
  raw_args jsonb not null default '{}'::jsonb,
  sanitized_args jsonb not null default '{}'::jsonb,
  issues jsonb not null default '[]'::jsonb,
  repairs jsonb not null default '[]'::jsonb,
  scenario text,
  observed_at timestamptz not null default now()
);
create index if not exists ce_zuzu_cap_obs_signature_idx on public.ce_zuzu_capability_observations(signature_hash, observed_at desc);
create index if not exists ce_zuzu_cap_obs_operation_idx on public.ce_zuzu_capability_observations(operation, observed_at desc);

comment on table public.ce_zuzu_capabilities is 'Espejo auditable del registro/canonizador JSON VNext. No contiene reglas lingüísticas.';
comment on table public.ce_zuzu_capability_observations is 'Firmas JSON observadas. CANONICAL/COMPATIBLE/NORMALIZED describen la forma; una observación nunca promueve por sí sola un contrato.';

-- Fuente de verdad: services/zuzu-capability-registry.service.js · 20260831-P119.
-- P1.19 tolera formas estructurales equivalentes y las canoniza antes de ejecutar.
insert into public.ce_zuzu_capabilities(operation,module,registry_version,required_keys,optional_keys,guarded_keys,defaults,result_contract,enabled,updated_at) values
  ('people_catalog','PERSONAS','20260831-P119','[]'::jsonb,'["population","detail","tone","register","tease","narrate","requested_fields","focus_mode","focus_type","focus_entities"]'::jsonb,'[]'::jsonb,'{}'::jsonb,'people_catalog',true,now()),
  ('events_catalog','EVENTOS','20260831-P119','[]'::jsonb,'["detail","tone","register","tease","narrate","requested_fields","focus_mode","focus_type","focus_entities"]'::jsonb,'[]'::jsonb,'{}'::jsonb,'events_catalog',true,now()),
  ('person_profile','PERSONAS','20260831-P119','["person"]'::jsonb,'["event","detail","tone","register","tease","narrate","requested_fields","focus_mode","focus_type","focus_entities"]'::jsonb,'[]'::jsonb,'{}'::jsonb,'person_dossier',true,now()),
  ('person_events','PERSONAS','20260831-P119','["person"]'::jsonb,'["detail","tone","register","tease","narrate","requested_fields","focus_mode","focus_type","focus_entities"]'::jsonb,'[]'::jsonb,'{}'::jsonb,'person_events',true,now()),
  ('person_income_status','INGRESOS','20260831-P119','["person","event"]'::jsonb,'["detail","tone","register","tease","narrate","requested_fields","focus_mode","focus_type","focus_entities"]'::jsonb,'[]'::jsonb,'{}'::jsonb,'person_income_status',true,now()),
  ('person_event_status','PERSONAS','20260831-P119','["person","event"]'::jsonb,'["detail","tone","register","tease","narrate","requested_fields","focus_mode","focus_type","focus_entities"]'::jsonb,'[]'::jsonb,'{}'::jsonb,'person_event_status',true,now()),
  ('event_income_status','INGRESOS','20260831-P119','["event"]'::jsonb,'["status","population","detail","tone","register","tease","narrate","requested_fields","focus_mode","focus_type","focus_entities"]'::jsonb,'[]'::jsonb,'{"status":"pending","population":"all"}'::jsonb,'income_status',true,now()),
  ('event_income_lines','INGRESOS','20260831-P119','["event"]'::jsonb,'["detail","tone","register","tease","narrate","requested_fields","focus_mode","focus_type","focus_entities"]'::jsonb,'[]'::jsonb,'{}'::jsonb,'income_lines',true,now()),
  ('event_attendance','ASISTENCIA','20260831-P119','["event"]'::jsonb,'["attendance_mode","scope","detail","tone","register","tease","narrate","requested_fields","focus_mode","focus_type","focus_entities"]'::jsonb,'[]'::jsonb,'{"attendance_mode":"attendees"}'::jsonb,'attendance',true,now()),
  ('event_summary','EVENTO','20260831-P119','["event"]'::jsonb,'["scope","detail","tone","register","tease","narrate","requested_fields","focus_mode","focus_type","focus_entities"]'::jsonb,'[]'::jsonb,'{}'::jsonb,'event_dossier',true,now()),
  ('event_scenario','ESCENARIOS','20260831-P119','["event"]'::jsonb,'["income_delta","scenario_people","plan","plan_detail","plan_focus","plan_target","chart","chart_type","detail","tone","register","tease","narrate","requested_fields","focus_mode","focus_type","focus_entities"]'::jsonb,'[]'::jsonb,'{}'::jsonb,'scenario',true,now()),
  ('event_purchases','COMPRAS','20260831-P119','["event"]'::jsonb,'["purchase_status","status","responsible","mine","order_by","store_filter_mode","include_stores","exclude_stores","exclude_products","visible_columns","hidden_columns","view_filters","view_sort","reset_table","top_n","derive_operation","derive_field","field","label_field","detail","tone","register","tease","narrate","requested_fields","focus_mode","focus_type","focus_entities"]'::jsonb,'[]'::jsonb,'{"purchase_status":"realized","store_filter_mode":"all"}'::jsonb,'purchase_dataset',true,now()),
  ('event_donations','DONACIONES','20260831-P119','["event"]'::jsonb,'["scope","detail","tone","register","tease","narrate","requested_fields","focus_mode","focus_type","focus_entities"]'::jsonb,'[]'::jsonb,'{}'::jsonb,'donation_dataset',true,now()),
  ('event_bank','BANCO','20260831-P119','["event"]'::jsonb,'["scope","detail","tone","register","tease","narrate","requested_fields","focus_mode","focus_type","focus_entities"]'::jsonb,'[]'::jsonb,'{}'::jsonb,'bank_summary',true,now()),
  ('event_weather','TIEMPO','20260831-P119','["event"]'::jsonb,'["start_date","end_date","chart","chart_type","detail","tone","register","tease","narrate","requested_fields","focus_mode","focus_type","focus_entities"]'::jsonb,'[]'::jsonb,'{}'::jsonb,'weather',true,now()),
  ('event_stores_used','TIENDAS','20260831-P119','["event"]'::jsonb,'["detail","tone","register","tease","narrate","requested_fields","focus_mode","focus_type","focus_entities"]'::jsonb,'[]'::jsonb,'{}'::jsonb,'event_stores',true,now()),
  ('event_products','PRODUCTOS','20260831-P119','["event"]'::jsonb,'["detail","tone","register","tease","narrate","requested_fields","focus_mode","focus_type","focus_entities"]'::jsonb,'[]'::jsonb,'{}'::jsonb,'event_products',true,now()),
  ('compare_events','COMPARACION','20260831-P119','["events"]'::jsonb,'["metric","chart","chart_type","detail","tone","register","tease","narrate","requested_fields","focus_mode","focus_type","focus_entities"]'::jsonb,'[]'::jsonb,'{"metric":"all"}'::jsonb,'comparison',true,now()),
  ('event_documentation','DOCUMENTOS','20260831-P119','["event"]'::jsonb,'["scope","detail","tone","register","tease","narrate","requested_fields","focus_mode","focus_type","focus_entities"]'::jsonb,'[]'::jsonb,'{}'::jsonb,'event_documentation',true,now()),
  ('event_management','GESTION','20260831-P119','["event"]'::jsonb,'["scope","detail","tone","register","tease","narrate","requested_fields","focus_mode","focus_type","focus_entities"]'::jsonb,'[]'::jsonb,'{}'::jsonb,'event_management',true,now()),
  ('store_purchases','TIENDAS','20260831-P119','["store"]'::jsonb,'["event","scope","status","include_empty","detail","tone","register","tease","narrate","requested_fields","focus_mode","focus_type","focus_entities"]'::jsonb,'[]'::jsonb,'{"scope":"all_events","status":"realized"}'::jsonb,'store_purchases',true,now()),
  ('events_overview','EVENTOS','20260831-P119','[]'::jsonb,'["scope","metric","chart","chart_type","detail","tone","register","tease","narrate","requested_fields","focus_mode","focus_type","focus_entities"]'::jsonb,'[]'::jsonb,'{"metric":"all"}'::jsonb,'events_overview',true,now()),
  ('derive','DERIVACION','20260831-P119','["derive_operation"]'::jsonb,'["field","derive_field","label_field","table_key","top_n","source_operation","source_args","detail","tone","register","tease","narrate","requested_fields","focus_mode","focus_type","focus_entities"]'::jsonb,'[]'::jsonb,'{}'::jsonb,'derived_dataset',true,now())
on conflict (operation) do update set module=excluded.module, registry_version=excluded.registry_version, required_keys=excluded.required_keys, optional_keys=excluded.optional_keys, guarded_keys=excluded.guarded_keys, defaults=excluded.defaults, result_contract=excluded.result_contract, enabled=excluded.enabled, updated_at=now();

create or replace view public.ce_zuzu_capability_signature_summary as
select signature_hash, operation, module, min(observed_at) as first_seen, max(observed_at) as last_seen, count(*)::bigint as times_seen,
       (array_agg(status order by observed_at desc))[1] as latest_status,
       (array_agg(classification order by observed_at desc))[1] as latest_classification
from public.ce_zuzu_capability_observations
group by signature_hash, operation, module;

comment on view public.ce_zuzu_capability_signature_summary is 'Firmas JSON observadas agrupadas. Sirve para revisar compatibilidades/canonizaciones; no aprende reglas lingüísticas ni promueve automáticamente.';
