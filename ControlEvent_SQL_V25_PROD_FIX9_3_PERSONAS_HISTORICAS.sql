-- ControlEvent v25_prod · FIX9.3
-- Fotografía histórica de PERSONAS por EVENTO.
-- Ejecutar una sola vez en Supabase > SQL Editor antes de desplegar la FIX9.3.

begin;

create table if not exists public.ce_event_person_snapshots (
  event_id text not null references public.ce_eventos(id) on update cascade on delete cascade,
  persona_id text not null references public.ce_personas(id) on update cascade on delete cascade,
  nombre_snapshot text not null,
  rango_snapshot text not null default 'SOCIO',
  captured_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, persona_id)
);

create index if not exists ce_event_person_snapshots_event_idx
  on public.ce_event_person_snapshots(event_id);
create index if not exists ce_event_person_snapshots_person_idx
  on public.ce_event_person_snapshots(persona_id);

comment on table public.ce_event_person_snapshots is
  'FIX9.3: nombre y rango que tenía cada persona dentro de cada evento. Los eventos Finalizados quedan congelados.';

-- Situación inicial: todavía no se han producido cambios de rango, por lo que la
-- situación actual de PERSONAS es válida para alimentar todos los eventos existentes.
insert into public.ce_event_person_snapshots
  (event_id, persona_id, nombre_snapshot, rango_snapshot, captured_at, updated_at)
select
  e.id,
  p.id,
  coalesce(nullif(trim(p.nombre), ''), p.id),
  upper(coalesce(nullif(trim(p.rango), ''), 'SOCIO')),
  now(),
  now()
from public.ce_eventos e
cross join public.ce_personas p
on conflict (event_id, persona_id) do nothing;

create or replace function public.ce_snapshot_persona_en_evento(
  p_event_id text,
  p_persona_id text,
  p_force boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_persona public.ce_personas%rowtype;
  v_situacion text;
begin
  if coalesce(trim(p_event_id), '') = '' or coalesce(trim(p_persona_id), '') = '' then
    return;
  end if;

  select * into v_persona
  from public.ce_personas
  where id = p_persona_id;

  if not found then
    return;
  end if;

  select upper(coalesce(nullif(trim(situacion), ''), 'EN CURSO'))
    into v_situacion
  from public.ce_eventos
  where id = p_event_id;

  if not found then
    return;
  end if;

  insert into public.ce_event_person_snapshots
    (event_id, persona_id, nombre_snapshot, rango_snapshot, captured_at, updated_at)
  values
    (p_event_id, p_persona_id,
     coalesce(nullif(trim(v_persona.nombre), ''), v_persona.id),
     upper(coalesce(nullif(trim(v_persona.rango), ''), 'SOCIO')),
     now(), now())
  on conflict (event_id, persona_id) do update
  set nombre_snapshot = excluded.nombre_snapshot,
      rango_snapshot = excluded.rango_snapshot,
      updated_at = now()
  where p_force
     or v_situacion <> 'FINALIZADO';
end;
$$;

create or replace function public.ce_snapshot_nuevo_evento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ce_event_person_snapshots
    (event_id, persona_id, nombre_snapshot, rango_snapshot, captured_at, updated_at)
  select
    new.id,
    p.id,
    coalesce(nullif(trim(p.nombre), ''), p.id),
    upper(coalesce(nullif(trim(p.rango), ''), 'SOCIO')),
    now(),
    now()
  from public.ce_personas p
  on conflict (event_id, persona_id) do nothing;
  return new;
end;
$$;

drop trigger if exists ce_trg_snapshot_nuevo_evento on public.ce_eventos;
create trigger ce_trg_snapshot_nuevo_evento
after insert on public.ce_eventos
for each row execute function public.ce_snapshot_nuevo_evento();

create or replace function public.ce_snapshot_persona_activa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Una persona nueva o modificada se actualiza solo en eventos En curso.
  -- Los eventos Finalizados conservan su fotografía histórica.
  insert into public.ce_event_person_snapshots
    (event_id, persona_id, nombre_snapshot, rango_snapshot, captured_at, updated_at)
  select
    e.id,
    new.id,
    coalesce(nullif(trim(new.nombre), ''), new.id),
    upper(coalesce(nullif(trim(new.rango), ''), 'SOCIO')),
    now(),
    now()
  from public.ce_eventos e
  where upper(coalesce(nullif(trim(e.situacion), ''), 'EN CURSO')) <> 'FINALIZADO'
  on conflict (event_id, persona_id) do update
  set nombre_snapshot = excluded.nombre_snapshot,
      rango_snapshot = excluded.rango_snapshot,
      updated_at = now();
  return new;
end;
$$;

drop trigger if exists ce_trg_snapshot_persona_activa on public.ce_personas;
create trigger ce_trg_snapshot_persona_activa
after insert or update of nombre, rango on public.ce_personas
for each row execute function public.ce_snapshot_persona_activa();

create or replace function public.ce_snapshot_colaborador_evento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ce_snapshot_persona_en_evento(new.event_id, new.persona_id, false);
  return new;
end;
$$;

drop trigger if exists ce_trg_snapshot_colaborador_evento on public.ce_colaboradores;
create trigger ce_trg_snapshot_colaborador_evento
after insert or update of event_id, persona_id on public.ce_colaboradores
for each row execute function public.ce_snapshot_colaborador_evento();

commit;
