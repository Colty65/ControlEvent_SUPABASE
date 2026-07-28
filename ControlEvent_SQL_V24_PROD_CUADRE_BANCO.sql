-- ============================================================================
-- ControlEvent v24_prod · CUADRE BANCO
-- Ejecutar completo en Supabase > SQL Editor antes de utilizar la nueva ventana.
-- Crea movimientos bancarios, lotes de importación CSV y vínculos con TKxx pagados.
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
  created_by text,
  created_at timestamptz not null default now(),
  constraint ce_bank_ticket_code_valid check (ticket_code ~ '^TK[0-9]{2,}$'),
  constraint ce_bank_ticket_one_use unique (event_id, ticket_code),
  constraint ce_bank_ticket_no_duplicate unique (movement_id, event_id, ticket_code)
);

create index if not exists ce_bank_movements_account_date_idx on public.ce_bank_movements(account_id, executed_at desc);
create index if not exists ce_bank_movements_included_idx on public.ce_bank_movements(account_id, included, executed_at desc);
create index if not exists ce_bank_movements_batch_idx on public.ce_bank_movements(import_batch_id);
create index if not exists ce_bank_ticket_links_movement_idx on public.ce_bank_ticket_links(movement_id);
create index if not exists ce_bank_ticket_links_event_idx on public.ce_bank_ticket_links(event_id, ticket_code);

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

comment on table public.ce_bank_movements is 'Movimientos importados de CSV bancario para el Cuadre Banco de ControlEvent.';
comment on column public.ce_bank_movements.included is 'Si es false, el movimiento no participa en el saldo calculado.';
comment on table public.ce_bank_ticket_links is 'Vinculación de movimientos bancarios negativos con TKxx pagados. Un TKxx solo puede justificar un movimiento.';

commit;
