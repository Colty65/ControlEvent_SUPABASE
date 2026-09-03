-- ControlEvent v4_1_exp · LIQUIDACIONES DE COMPRAS · V1
-- Ejecutar una vez en Supabase SQL Editor. Es idempotente y puede repetirse.
-- No crea ningún vínculo de conciliación bancaria: solo consulta ce_bank_ticket_links desde la aplicación.

create table if not exists public.ce_purchase_settlements (
  id text primary key,
  settlement_code text not null unique,
  event_id text not null references public.ce_eventos(id) on delete cascade,
  cash_person_id text not null references public.ce_personas(id) on delete restrict,
  counterparty_person_id text not null references public.ce_personas(id) on delete restrict,
  cash_person_name_snapshot text,
  counterparty_person_name_snapshot text,
  description text,
  status text not null default 'ABIERTA' check (status in ('ABIERTA','CERRADA')),
  total_debe numeric(14,2) not null default 0,
  total_haber numeric(14,2) not null default 0,
  total_tickets numeric(14,2) not null default 0,
  result_balance numeric(14,2) not null default 0,
  closed_at timestamptz,
  closed_by text,
  reopened_at timestamptz,
  reopened_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ce_purchase_cash_movements (
  id text primary key,
  settlement_id text references public.ce_purchase_settlements(id) on delete set null,
  event_id text not null references public.ce_eventos(id) on delete cascade,
  cash_person_id text not null references public.ce_personas(id) on delete restrict,
  counterparty_person_id text not null references public.ce_personas(id) on delete restrict,
  cash_person_name_snapshot text,
  counterparty_person_name_snapshot text,
  movement_date date not null,
  description text not null,
  direction text not null check (direction in ('DEBE','HABER')),
  amount numeric(14,2) not null check (amount > 0),
  observations text,
  status text not null default 'ABIERTA' check (status in ('ABIERTA','CERRADA')),
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ce_purchase_settlement_tickets (
  id text primary key,
  settlement_id text not null references public.ce_purchase_settlements(id) on delete cascade,
  event_id text not null references public.ce_eventos(id) on delete cascade,
  ticket_code text not null,
  ticket_amount_snapshot numeric(14,2) not null default 0,
  responsible_person_id text references public.ce_personas(id) on delete restrict,
  responsible_person_name_snapshot text,
  purchase_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Un TKxx solo puede formar parte de una liquidación de compras dentro de su evento.
create unique index if not exists uq_ce_purchase_settlement_ticket_event_code
  on public.ce_purchase_settlement_tickets(event_id, ticket_code);

create index if not exists idx_ce_purchase_settlements_event_status
  on public.ce_purchase_settlements(event_id, status, created_at desc);
create index if not exists idx_ce_purchase_settlements_pair
  on public.ce_purchase_settlements(event_id, cash_person_id, counterparty_person_id);
create index if not exists idx_ce_purchase_cash_movements_event_status
  on public.ce_purchase_cash_movements(event_id, status, movement_date, created_at);
create index if not exists idx_ce_purchase_cash_movements_settlement
  on public.ce_purchase_cash_movements(settlement_id);
create index if not exists idx_ce_purchase_settlement_tickets_settlement
  on public.ce_purchase_settlement_tickets(settlement_id);

comment on table public.ce_purchase_settlements is
'ControlEvent: cabecera histórica de liquidaciones de compras entre responsable de caja de la Peña y persona encargada de compras.';
comment on table public.ce_purchase_cash_movements is
'ControlEvent: movimientos de efectivo Debe/Haber desde el punto de vista de la caja de la Peña. DEBE=sale dinero; HABER=entra dinero.';
comment on table public.ce_purchase_settlement_tickets is
'ControlEvent: TKxx incluidos en una liquidación. Guarda importe y responsable como snapshot. No crea conciliación bancaria.';
comment on column public.ce_purchase_settlements.result_balance is
'DEBE - HABER - TKxx. 0=cuadrada; positivo=la persona debe devolver a la Peña; negativo=la Peña debe abonar a la persona.';
