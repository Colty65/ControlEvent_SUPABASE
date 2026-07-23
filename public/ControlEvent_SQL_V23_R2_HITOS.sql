-- ============================================================================
-- ControlEvent v23_prod_r2 · CONTROL DE HITOS (primera versión)
-- Ejecutar completo en Supabase > SQL Editor.
-- Crea únicamente las tablas ce_hitos y ce_lg, sus índices y automatismos.
-- ============================================================================

begin;

create extension if not exists pgcrypto;

create table if not exists public.ce_hitos (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.ce_eventos(id) on update cascade on delete cascade,
  nombre_hito text not null,
  descripcion text,

  -- Las fechas se recalculan automáticamente desde las LG hijas.
  fecha_minima date,
  fecha_maxima date,

  -- responsable_id se usa cuando existe una fila individual en ce_personas.
  -- responsable_nombre conserva la presentación canónica individual elegida.
  responsable_id text references public.ce_personas(id) on update cascade on delete set null,
  responsable_nombre text,

  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ce_hitos_nombre_no_vacio check (length(btrim(nombre_hito)) > 0),
  constraint ce_hitos_fechas_validas check (
    fecha_minima is null or fecha_maxima is null or fecha_minima <= fecha_maxima
  )
);

create table if not exists public.ce_lg (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.ce_eventos(id) on update cascade on delete cascade,
  hito_id uuid not null references public.ce_hitos(id) on update cascade on delete cascade,

  descripcion text not null,
  fecha_minima date,
  fecha_maxima date,
  notas text,

  -- LG: una o varias LG. HITO_COMPLETO: uno o varios Hitos completos.
  dependencia_tipo text not null default 'LG',

  -- Formato de cada elemento:
  --   {"tipo":"LG",   "id":"uuid-de-la-lg"}
  --   {"tipo":"HITO", "id":"uuid-del-hito"}
  dependencias_previas jsonb not null default '[]'::jsonb,
  dependencias_posteriores jsonb not null default '[]'::jsonb,

  responsable_id text references public.ce_personas(id) on update cascade on delete set null,
  responsable_nombre text,

  cumplida boolean not null default false,
  cumplida_at timestamptz,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ce_lg_descripcion_no_vacia check (length(btrim(descripcion)) > 0),
  constraint ce_lg_fechas_validas check (
    fecha_minima is null or fecha_maxima is null or fecha_minima <= fecha_maxima
  ),
  constraint ce_lg_dependencia_tipo_valida check (
    dependencia_tipo in ('LG', 'HITO_COMPLETO')
  ),
  constraint ce_lg_previas_array check (jsonb_typeof(dependencias_previas) = 'array'),
  constraint ce_lg_posteriores_array check (jsonb_typeof(dependencias_posteriores) = 'array'),
  constraint ce_lg_cumplida_fecha check (
    (cumplida = false and cumplida_at is null) or cumplida = true
  )
);

-- Índices de navegación y ordenación por evento.
create index if not exists ce_hitos_event_id_idx on public.ce_hitos(event_id);
create index if not exists ce_hitos_event_orden_idx on public.ce_hitos(event_id, orden, created_at);
create index if not exists ce_hitos_responsable_idx on public.ce_hitos(responsable_id);
create index if not exists ce_hitos_responsable_nombre_idx on public.ce_hitos(responsable_nombre);

create index if not exists ce_lg_event_id_idx on public.ce_lg(event_id);
create index if not exists ce_lg_hito_id_idx on public.ce_lg(hito_id);
create index if not exists ce_lg_event_hito_orden_idx on public.ce_lg(event_id, hito_id, orden, created_at);
create index if not exists ce_lg_responsable_idx on public.ce_lg(responsable_id);
create index if not exists ce_lg_cumplida_idx on public.ce_lg(event_id, cumplida);
create index if not exists ce_lg_fecha_minima_idx on public.ce_lg(event_id, fecha_minima);
create index if not exists ce_lg_fecha_maxima_idx on public.ce_lg(event_id, fecha_maxima);
create index if not exists ce_lg_previas_gin_idx on public.ce_lg using gin(dependencias_previas);
create index if not exists ce_lg_posteriores_gin_idx on public.ce_lg using gin(dependencias_posteriores);

-- --------------------------------------------------------------------------
-- updated_at automático.
-- --------------------------------------------------------------------------
create or replace function public.ce_hitos_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists ce_hitos_updated_at_trg on public.ce_hitos;
create trigger ce_hitos_updated_at_trg
before update on public.ce_hitos
for each row execute function public.ce_hitos_set_updated_at();

drop trigger if exists ce_lg_updated_at_trg on public.ce_lg;
create trigger ce_lg_updated_at_trg
before update on public.ce_lg
for each row execute function public.ce_hitos_set_updated_at();

-- --------------------------------------------------------------------------
-- Recalcula fecha mínima/máxima de un Hito con las fechas de sus LG.
-- --------------------------------------------------------------------------
create or replace function public.ce_recalcular_fechas_hito(p_hito_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_hito_id is null then
    return;
  end if;

  update public.ce_hitos h
     set fecha_minima = x.fecha_minima,
         fecha_maxima = x.fecha_maxima,
         updated_at = now()
    from (
      select
        min(fecha_minima) filter (where fecha_minima is not null) as fecha_minima,
        max(fecha_maxima) filter (where fecha_maxima is not null) as fecha_maxima
      from public.ce_lg
      where hito_id = p_hito_id
    ) x
   where h.id = p_hito_id;
end;
$$;

create or replace function public.ce_lg_sincronizar_fechas_hito()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.ce_recalcular_fechas_hito(old.hito_id);
    return old;
  end if;

  perform public.ce_recalcular_fechas_hito(new.hito_id);
  if tg_op = 'UPDATE' and old.hito_id is distinct from new.hito_id then
    perform public.ce_recalcular_fechas_hito(old.hito_id);
  end if;
  return new;
end;
$$;

drop trigger if exists ce_lg_fechas_hito_trg on public.ce_lg;
create trigger ce_lg_fechas_hito_trg
after insert or delete or update of fecha_minima, fecha_maxima, hito_id
on public.ce_lg
for each row execute function public.ce_lg_sincronizar_fechas_hito();

-- --------------------------------------------------------------------------
-- Validación de referencias y cierre de una LG.
-- La aplicación también valida ciclos y sincroniza previas/posteriores.
-- Este trigger impide cerrar una LG si una dependencia previa no está cumplida.
-- --------------------------------------------------------------------------
create or replace function public.ce_lg_validar_dependencias()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dep jsonb;
  dep_tipo text;
  dep_id uuid;
  dep_event_id text;
  dep_ok boolean;
begin
  if new.cumplida = false then
    new.cumplida_at := null;
  else
    if new.fecha_minima is not null and current_date < new.fecha_minima then
      raise exception 'No se puede cumplir la LG antes de su fecha mínima (%)', new.fecha_minima;
    end if;
    if new.fecha_maxima is not null and current_date > new.fecha_maxima then
      raise exception 'No se puede cumplir la LG después de su fecha máxima (%). Modifique primero el plazo', new.fecha_maxima;
    end if;
    if new.cumplida_at is null then
      new.cumplida_at := now();
    end if;
  end if;

  -- Una LG siempre pertenece al mismo evento que su Hito.
  select event_id into dep_event_id from public.ce_hitos where id = new.hito_id;
  if dep_event_id is null then
    raise exception 'El Hito indicado no existe';
  end if;
  if dep_event_id <> new.event_id then
    raise exception 'La LG y su Hito pertenecen a eventos diferentes';
  end if;

  for dep in select value from jsonb_array_elements(coalesce(new.dependencias_previas, '[]'::jsonb))
  loop
    dep_tipo := upper(coalesce(dep->>'tipo', 'LG'));
    begin
      dep_id := (dep->>'id')::uuid;
    exception when others then
      raise exception 'Identificador de dependencia no válido: %', dep->>'id';
    end;

    if dep_tipo = 'LG' then
      if dep_id = new.id then
        raise exception 'Una LG no puede depender de sí misma';
      end if;
      select event_id, cumplida into dep_event_id, dep_ok
        from public.ce_lg where id = dep_id;
      if dep_event_id is null then
        raise exception 'La LG previa % no existe', dep_id;
      end if;
      if dep_event_id <> new.event_id then
        raise exception 'La LG previa pertenece a otro evento';
      end if;

    elsif dep_tipo = 'HITO' then
      if dep_id = new.hito_id then
        raise exception 'Una LG no puede depender de su propio Hito completo';
      end if;
      select event_id into dep_event_id from public.ce_hitos where id = dep_id;
      if dep_event_id is null then
        raise exception 'El Hito previo % no existe', dep_id;
      end if;
      if dep_event_id <> new.event_id then
        raise exception 'El Hito previo pertenece a otro evento';
      end if;
      select coalesce(count(*) > 0 and bool_and(cumplida), false)
        into dep_ok
        from public.ce_lg
       where hito_id = dep_id;
    else
      raise exception 'Tipo de dependencia no válido: %', dep_tipo;
    end if;

    if new.cumplida = true and coalesce(dep_ok, false) = false then
      raise exception 'No se puede cumplir la LG: queda pendiente la dependencia %:%', dep_tipo, dep_id;
    end if;
  end loop;

  -- Las posteriores también deben existir y pertenecer al mismo evento.
  for dep in select value from jsonb_array_elements(coalesce(new.dependencias_posteriores, '[]'::jsonb))
  loop
    dep_tipo := upper(coalesce(dep->>'tipo', 'LG'));
    begin
      dep_id := (dep->>'id')::uuid;
    exception when others then
      raise exception 'Identificador de dependencia posterior no válido: %', dep->>'id';
    end;

    if dep_tipo = 'LG' then
      if dep_id = new.id then
        raise exception 'Una LG no puede tenerse a sí misma como dependencia posterior';
      end if;
      select event_id into dep_event_id from public.ce_lg where id = dep_id;
      if dep_event_id is null then
        raise exception 'La LG posterior % no existe', dep_id;
      end if;
      if dep_event_id <> new.event_id then
        raise exception 'La LG posterior pertenece a otro evento';
      end if;
    elsif dep_tipo = 'HITO' then
      if dep_id = new.hito_id then
        raise exception 'Una LG no puede tener su propio Hito como dependencia posterior';
      end if;
      select event_id into dep_event_id from public.ce_hitos where id = dep_id;
      if dep_event_id is null then
        raise exception 'El Hito posterior % no existe', dep_id;
      end if;
      if dep_event_id <> new.event_id then
        raise exception 'El Hito posterior pertenece a otro evento';
      end if;
    else
      raise exception 'Tipo de dependencia posterior no válido: %', dep_tipo;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists ce_lg_validar_dependencias_trg on public.ce_lg;
create trigger ce_lg_validar_dependencias_trg
before insert or update
on public.ce_lg
for each row execute function public.ce_lg_validar_dependencias();

comment on table public.ce_hitos is 'Hitos de gestión por evento. Sus fechas se calculan con las LG hijas.';
comment on table public.ce_lg is 'Líneas de Gestión asociadas a Hitos, con responsables, plazos, notas, dependencias y estado.';
comment on column public.ce_lg.dependencias_previas is 'Array JSON de referencias {tipo: LG|HITO, id: uuid} que deben estar cumplidas antes de cerrar la LG.';
comment on column public.ce_lg.dependencias_posteriores is 'Array JSON de referencias posteriores sincronizadas por ControlEvent.';

commit;

-- Comprobación opcional tras ejecutar:
-- select table_name from information_schema.tables
-- where table_schema='public' and table_name in ('ce_hitos','ce_lg');
