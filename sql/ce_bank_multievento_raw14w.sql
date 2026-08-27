-- ControlEvent v4_0_exp · RAW14W
-- Cuadre Banco multievento: un movimiento bancario único puede quedar justificado
-- por TKxx de varios eventos. La diferencia residual, si existe, se acepta de forma
-- explícita y GLOBAL; nunca se reparte artificialmente entre eventos.

create table if not exists public.ce_bank_movement_settlements (
  movement_id uuid primary key references public.ce_bank_movements(id) on delete cascade,
  accepted_difference numeric(14,2) not null check (accepted_difference >= 0),
  note text,
  accepted_by text,
  accepted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ce_bank_movement_settlements_accepted_at
  on public.ce_bank_movement_settlements (accepted_at desc);

-- RAW14W usa movement_id + event_id + ticket_code. En algunas instalaciones históricas
-- puede existir una restricción UNIQUE antigua sobre movement_id/event_id que impide
-- varios TKxx del mismo evento. v4.0_exp BANK2 la elimina de forma idempotente mediante
-- sql/ce_bank_ticket_links_multi_v4.sql.

comment on table public.ce_bank_movement_settlements is
'RAW14W: cierre global de movimientos bancarios con diferencia residual aceptada. La parte imputable a cada evento se deriva exclusivamente de sus ce_bank_ticket_links.';
comment on column public.ce_bank_movement_settlements.accepted_difference is
'Diferencia entre importe bancario y suma global de justificantes, aceptada expresamente por un usuario autorizado.';
