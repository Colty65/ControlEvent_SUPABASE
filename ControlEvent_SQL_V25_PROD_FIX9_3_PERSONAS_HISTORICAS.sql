-- ControlEvent v25_prod · FIX9.3.1
-- Fotografías históricas corregidas de PERSONAS por EVENTO.
--
-- Ejecutar en Supabase > SQL Editor tanto en una instalación nueva como si ya se ejecutó la FIX9.3 original.
-- Esta versión:
--   1) elimina las combinaciones falsas EVENTO x PERSONA creadas por CROSS JOIN;
--   2) conserva solo personas realmente vinculadas al evento en ce_colaboradores;
--   3) permite cambios sucesivos NO SOCIO <-> SOCIO entre eventos;
--   4) actualiza solo snapshots YA EXISTENTES de eventos En curso;
--   5) congela los snapshots de eventos Finalizados.

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
  'Nombre y rango históricos de una persona dentro de un evento real. Una fila por EVENTO + PERSONA vinculados en ce_colaboradores.';

-- Retirar primero los disparadores incorrectos de FIX9.3.
drop trigger if exists ce_trg_snapshot_nuevo_evento on public.ce_eventos;
drop trigger if exists ce_trg_snapshot_persona_activa on public.ce_personas;
drop trigger if exists ce_trg_snapshot_colaborador_evento on public.ce_colaboradores;
drop trigger if exists ce_trg_snapshot_colaborador_eliminado on public.ce_colaboradores;

-- La FIX9.3 original insertó todas las combinaciones EVENTO x PERSONA.
-- Se eliminan únicamente las filas que no tienen una relación real en ce_colaboradores.
delete from public.ce_event_person_snapshots s
where not exists (
  select 1
  from public.ce_colaboradores c
  where c.event_id = s.event_id
    and c.persona_id = s.persona_id
);

-- Crear las fotografías que falten para relaciones reales.
insert into public.ce_event_person_snapshots
  (event_id, persona_id, nombre_snapshot, rango_snapshot, captured_at, updated_at)
select distinct
  c.event_id,
  c.persona_id,
  coalesce(nullif(trim(p.nombre), ''), p.id),
  upper(coalesce(nullif(trim(p.rango), ''), 'SOCIO')),
  coalesce(c.created_at, now()),
  now()
from public.ce_colaboradores c
join public.ce_eventos e on e.id = c.event_id
join public.ce_personas p on p.id = c.persona_id
where coalesce(trim(c.event_id), '') <> ''
  and coalesce(trim(c.persona_id), '') <> ''
on conflict (event_id, persona_id) do nothing;

-- Como todavía no se han producido cambios históricos de rango, las relaciones
-- reales existentes se pueden normalizar con el valor actual de ce_personas.
update public.ce_event_person_snapshots s
set nombre_snapshot = coalesce(nullif(trim(p.nombre), ''), p.id),
    rango_snapshot = upper(coalesce(nullif(trim(p.rango), ''), 'SOCIO')),
    updated_at = now()
from public.ce_personas p
where p.id = s.persona_id
  and exists (
    select 1
    from public.ce_colaboradores c
    where c.event_id = s.event_id
      and c.persona_id = s.persona_id
  );

-- Crear o refrescar la fotografía de UNA persona dentro de UN evento.
-- En eventos En curso puede refrescarse; en Finalizados queda congelada.
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
  v_nombre text;
  v_rango text;
  v_situacion text;
begin
  if coalesce(trim(p_event_id), '') = ''
     or coalesce(trim(p_persona_id), '') = '' then
    return;
  end if;

  select
    coalesce(nullif(trim(p.nombre), ''), p.id),
    upper(coalesce(nullif(trim(p.rango), ''), 'SOCIO'))
  into v_nombre, v_rango
  from public.ce_personas p
  where p.id = p_persona_id;

  if not found then
    return;
  end if;

  select upper(coalesce(nullif(trim(e.situacion), ''), 'EN CURSO'))
  into v_situacion
  from public.ce_eventos e
  where e.id = p_event_id;

  if not found then
    return;
  end if;

  insert into public.ce_event_person_snapshots
    (event_id, persona_id, nombre_snapshot, rango_snapshot, captured_at, updated_at)
  values
    (p_event_id, p_persona_id, v_nombre, v_rango, now(), now())
  on conflict (event_id, persona_id) do update
  set nombre_snapshot = excluded.nombre_snapshot,
      rango_snapshot = excluded.rango_snapshot,
      updated_at = now()
  where p_force
     or v_situacion <> 'FINALIZADO';
end;
$$;

-- Una persona se incorpora al histórico únicamente cuando existe una relación
-- real con el evento en ce_colaboradores.
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

create trigger ce_trg_snapshot_colaborador_evento
after insert or update of event_id, persona_id on public.ce_colaboradores
for each row execute function public.ce_snapshot_colaborador_evento();

-- Si cambia nombre o rango, solo se actualizan snapshots que YA EXISTEN en
-- eventos En curso. Nunca se inserta a la persona en eventos donde no participa.
-- Los eventos Finalizados permanecen congelados.
create or replace function public.ce_snapshot_persona_activa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ce_event_person_snapshots s
  set nombre_snapshot = coalesce(nullif(trim(new.nombre), ''), new.id),
      rango_snapshot = upper(coalesce(nullif(trim(new.rango), ''), 'SOCIO')),
      updated_at = now()
  from public.ce_eventos e
  where s.persona_id = new.id
    and e.id = s.event_id
    and upper(coalesce(nullif(trim(e.situacion), ''), 'EN CURSO')) <> 'FINALIZADO';

  return new;
end;
$$;

create trigger ce_trg_snapshot_persona_activa
after update of nombre, rango on public.ce_personas
for each row execute function public.ce_snapshot_persona_activa();

-- Si se elimina la última relación de una persona con un evento En curso,
-- también se elimina su snapshot. En eventos Finalizados no se altera el histórico.
create or replace function public.ce_snapshot_colaborador_eliminado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_situacion text;
begin
  select upper(coalesce(nullif(trim(e.situacion), ''), 'EN CURSO'))
  into v_situacion
  from public.ce_eventos e
  where e.id = old.event_id;

  if coalesce(v_situacion, 'EN CURSO') <> 'FINALIZADO'
     and not exists (
       select 1
       from public.ce_colaboradores c
       where c.event_id = old.event_id
         and c.persona_id = old.persona_id
     ) then
    delete from public.ce_event_person_snapshots s
    where s.event_id = old.event_id
      and s.persona_id = old.persona_id;
  end if;

  return old;
end;
$$;

create trigger ce_trg_snapshot_colaborador_eliminado
after delete on public.ce_colaboradores
for each row execute function public.ce_snapshot_colaborador_eliminado();

-- Ya no se utiliza ninguna función que copie todas las personas al crear eventos.
drop function if exists public.ce_snapshot_nuevo_evento();

commit;

-- Comprobación final: "filas_huerfanas" debe devolver 0.
select
  (select count(*) from public.ce_event_person_snapshots) as snapshots_reales,
  (select count(*) from (
     select distinct event_id, persona_id
     from public.ce_colaboradores
     where coalesce(trim(event_id), '') <> ''
       and coalesce(trim(persona_id), '') <> ''
   ) relaciones) as relaciones_evento_persona,
  (select count(*)
   from public.ce_event_person_snapshots s
   where not exists (
     select 1 from public.ce_colaboradores c
     where c.event_id = s.event_id
       and c.persona_id = s.persona_id
   )) as filas_huerfanas;
