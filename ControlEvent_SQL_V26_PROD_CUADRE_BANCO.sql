-- ============================================================================
-- ControlEvent v26_prod FIX8 · CUADRE BANCO, TRAZABILIDAD DE COMPRAS E INGRESOS
-- Ejecutar completo en Supabase > SQL Editor antes de utilizar la nueva ventana.
-- Crea movimientos, lotes CSV, vínculos con TKxx y asociaciones corregibles con ingresos.
-- ============================================================================

begin;

create extension if not exists pgcrypto;

create table if not exists public.ce_bank_import_batches (
  id uuid primary key default gen_random_uuid(),
  source_filename text,
  account_id text not null default 'SIN_CUENTA',
  account_label text,
  date_from date,
  date_to date,
  parsed_count integer not null default 0,
  inserted_count integer not null default 0,
  duplicate_count integer not null default 0,
  warning_count integer not null default 0,
  imported_by text,
  imported_at timestamptz not null default now()
);

create table if not exists public.ce_bank_movements (
  id uuid primary key default gen_random_uuid(),
  account_id text not null default 'SIN_CUENTA',
  account_label text,
  executed_at timestamp not null,
  value_date date not null,
  description text not null,
  amount numeric(14,2) not null default 0,
  bank_balance numeric(14,2) not null default 0,
  included boolean not null default true,
  source_hash text not null unique,
  import_batch_id uuid references public.ce_bank_import_batches(id) on update cascade on delete set null,
  source_filename text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ce_bank_description_not_empty check (length(btrim(description)) > 0)
);

create table if not exists public.ce_bank_ticket_links (
  id uuid primary key default gen_random_uuid(),
  movement_id uuid not null references public.ce_bank_movements(id) on update cascade on delete cascade,
  event_id text not null references public.ce_eventos(id) on update cascade on delete cascade,
  ticket_code text not null,
  ticket_amount_snapshot numeric(14,2) not null default 0,
  forced_square boolean not null default false,
  created_by text,
  created_at timestamptz not null default now(),
  constraint ce_bank_ticket_code_valid check (ticket_code ~ '^TK[0-9]{2,}$'),
  constraint ce_bank_ticket_one_use unique (event_id, ticket_code),
  constraint ce_bank_ticket_no_duplicate unique (movement_id, event_id, ticket_code)
);


-- FIX8: asociación manual y corregible de abonos con ingresos del evento.
create table if not exists public.ce_bank_income_links (
  id uuid primary key default gen_random_uuid(),
  movement_id uuid not null references public.ce_bank_movements(id) on update cascade on delete cascade,
  event_id text not null references public.ce_eventos(id) on update cascade on delete cascade,
  income_id text not null,
  income_amount_snapshot numeric(14,2) not null default 0,
  created_by text,
  created_at timestamptz not null default now(),
  constraint ce_bank_income_one_use unique (event_id, income_id),
  constraint ce_bank_income_no_duplicate unique (movement_id, event_id, income_id)
);

create table if not exists public.ce_bank_event_settings (
  event_id text primary key references public.ce_eventos(id) on update cascade on delete cascade,
  date_from date not null,
  date_to date not null,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ce_bank_event_period_valid check (date_from <= date_to)
);

create table if not exists public.ce_bank_event_movement_state (
  event_id text not null references public.ce_eventos(id) on update cascade on delete cascade,
  movement_id uuid not null references public.ce_bank_movements(id) on update cascade on delete cascade,
  included boolean not null default true,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, movement_id)
);

-- Actualización segura para instalaciones que ya tenían la versión v26_prod-02.
alter table public.ce_bank_ticket_links
  add column if not exists forced_square boolean not null default false;

create index if not exists ce_bank_movements_account_date_idx on public.ce_bank_movements(account_id, executed_at desc);
create index if not exists ce_bank_movements_included_idx on public.ce_bank_movements(account_id, included, executed_at desc);
create index if not exists ce_bank_movements_batch_idx on public.ce_bank_movements(import_batch_id);
create index if not exists ce_bank_ticket_links_movement_idx on public.ce_bank_ticket_links(movement_id);
create index if not exists ce_bank_ticket_links_event_idx on public.ce_bank_ticket_links(event_id, ticket_code);
create index if not exists ce_bank_income_links_movement_idx on public.ce_bank_income_links(movement_id);
create index if not exists ce_bank_income_links_event_idx on public.ce_bank_income_links(event_id, income_id);
create index if not exists ce_bank_event_settings_dates_idx on public.ce_bank_event_settings(date_from, date_to);
create index if not exists ce_bank_event_movement_state_event_idx on public.ce_bank_event_movement_state(event_id, included);
create index if not exists ce_bank_event_movement_state_movement_idx on public.ce_bank_event_movement_state(movement_id);

create or replace function public.ce_bank_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists ce_bank_movements_updated_at_trg on public.ce_bank_movements;
create trigger ce_bank_movements_updated_at_trg
before update on public.ce_bank_movements
for each row execute function public.ce_bank_set_updated_at();

drop trigger if exists ce_bank_event_settings_updated_at_trg on public.ce_bank_event_settings;
create trigger ce_bank_event_settings_updated_at_trg
before update on public.ce_bank_event_settings
for each row execute function public.ce_bank_set_updated_at();

drop trigger if exists ce_bank_event_movement_state_updated_at_trg on public.ce_bank_event_movement_state;
create trigger ce_bank_event_movement_state_updated_at_trg
before update on public.ce_bank_event_movement_state
for each row execute function public.ce_bank_set_updated_at();

comment on table public.ce_bank_movements is 'Movimientos importados de CSV bancario para el Cuadre Banco de ControlEvent.';
comment on column public.ce_bank_movements.included is 'Valor inicial heredado. Desde v26_prod-04 la inclusión efectiva se guarda por evento en ce_bank_event_movement_state.';
comment on table public.ce_bank_ticket_links is 'Vinculación de movimientos bancarios negativos con TKxx pagados. Un TKxx solo puede justificar un movimiento.';
comment on column public.ce_bank_ticket_links.forced_square is 'Permite aceptar manualmente diferencias entre el movimiento y la suma de TKxx para un evento.';
comment on table public.ce_bank_income_links is 'Asociación manual y corregible entre abonos bancarios e ingresos registrados del evento.';
comment on column public.ce_bank_income_links.income_id is 'Identificador del registro de ce_colaboradores que justifica el abono.';
comment on table public.ce_bank_event_settings is 'Periodo bancario editable de cada evento. Define qué movimientos se muestran, incluidos los abonos.';
comment on table public.ce_bank_event_movement_state is 'Inclusión o exclusión de un movimiento en el cálculo del saldo de un evento concreto.';
comment on column public.ce_bank_event_movement_state.included is 'Si es false, el movimiento se ve pero no altera el saldo inicial/final calculado del evento.';

commit;
