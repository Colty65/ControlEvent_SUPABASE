-- ControlEvent v8.5_prod FIX39
-- DECISION DRASTICA: los eventos que alguna vez estuvieron FINALIZADOS no se editan
-- por el simple hecho de pasarlos a "En curso". Requieren autorización temporal
-- explícita de corrección para COMPRAS.
-- Mantener global_write_lock = ON.

create table if not exists public.ce_event_edit_control (
  event_id text primary key references public.ce_eventos(id) on delete cascade,
  allow_compras boolean not null default false,
  allow_colaboradores boolean not null default false,
  allow_images boolean not null default false,
  reason text,
  opened_at timestamptz,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

create or replace function public.ce_event_ever_finalizado(p_event_id text)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.ce_eventos e
    where e.id = p_event_id
      and coalesce(e.situacion,'') = 'Finalizado'
  )
  or exists (
    select 1
    from public.ce_audit_log a
    where a.table_name = 'ce_eventos'
      and a.row_id = p_event_id
      and (
        coalesce(a.old_data->>'situacion','') = 'Finalizado'
        or coalesce(a.new_data->>'situacion','') = 'Finalizado'
      )
  );
$$;

create or replace function public.ce_crud_open_compras_correction(
  p_event_id text,
  p_minutes integer default 30,
  p_reason text default 'Corrección manual de COMPRAS'
)
returns public.ce_event_edit_control
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.ce_eventos%rowtype;
  v_row public.ce_event_edit_control%rowtype;
begin
  if coalesce(trim(p_event_id), '') = '' then
    raise exception 'CE_CORRECCION: falta event_id';
  end if;

  select * into v_event
  from public.ce_eventos
  where id = p_event_id;

  if not found then
    raise exception 'CE_CORRECCION: evento inexistente: %', p_event_id;
  end if;

  if coalesce(v_event.situacion,'') = 'Finalizado' then
    raise exception 'CE_CORRECCION: no se abre corrección sobre evento Finalizado. Pásalo antes a En curso. Evento: % - %', v_event.id, coalesce(v_event.titulo,'');
  end if;

  perform set_config('app.ce_bypass_write_lock', 'on', true);

  insert into public.ce_event_edit_control (
    event_id, allow_compras, allow_colaboradores, allow_images,
    reason, opened_at, expires_at, updated_at
  ) values (
    p_event_id,
    true,
    false,
    false,
    coalesce(nullif(trim(p_reason),''), 'Corrección manual de COMPRAS'),
    now(),
    now() + make_interval(mins => greatest(coalesce(p_minutes,30), 1)),
    now()
  )
  on conflict (event_id) do update
     set allow_compras = true,
         reason = excluded.reason,
         opened_at = now(),
         expires_at = now() + make_interval(mins => greatest(coalesce(p_minutes,30), 1)),
         updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.ce_crud_close_event_correction(p_event_id text)
returns public.ce_event_edit_control
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.ce_event_edit_control%rowtype;
begin
  if coalesce(trim(p_event_id), '') = '' then
    raise exception 'CE_CORRECCION: falta event_id para cerrar corrección';
  end if;

  perform set_config('app.ce_bypass_write_lock', 'on', true);

  insert into public.ce_event_edit_control (
    event_id, allow_compras, allow_colaboradores, allow_images,
    reason, opened_at, expires_at, updated_at
  ) values (
    p_event_id, false, false, false, 'Corrección cerrada', null, null, now()
  )
  on conflict (event_id) do update
     set allow_compras = false,
         allow_colaboradores = false,
         allow_images = false,
         reason = 'Corrección cerrada',
         expires_at = null,
         updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.ce_crud_assert_event_en_curso(p_event_id text, p_action text default 'modificar')
returns public.ce_eventos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.ce_eventos%rowtype;
  v_requires_correction boolean;
  v_ok boolean;
begin
  if coalesce(trim(p_event_id), '') = '' then
    raise exception 'CE_CRUD: falta event_id para %', p_action;
  end if;

  select * into v_event
  from public.ce_eventos
  where id = p_event_id;

  if not found then
    raise exception 'CE_CRUD: evento inexistente para %: %', p_action, p_event_id;
  end if;

  if coalesce(v_event.situacion, '') = 'Finalizado' then
    raise exception 'CE_CRUD: evento Finalizado bloqueado para %. Evento: % - %',
      p_action, v_event.id, coalesce(v_event.titulo, '');
  end if;

  v_requires_correction := public.ce_event_ever_finalizado(p_event_id);

  if v_requires_correction then
    select exists (
      select 1
      from public.ce_event_edit_control c
      where c.event_id = p_event_id
        and c.allow_compras = true
        and coalesce(c.expires_at, '-infinity'::timestamptz) > now()
    ) into v_ok;

    if not v_ok then
      raise exception 'CE_CORRECCION_REQUERIDA: evento previamente Finalizado. Para % en COMPRAS debes autorizar corrección temporal. Evento: % - %',
        p_action, v_event.id, coalesce(v_event.titulo, '');
    end if;
  end if;

  return v_event;
end;
$$;

create or replace function public.ce_crud_eventos_situacion(p_id text, p_situacion text)
returns public.ce_eventos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next text;
  v_row public.ce_eventos%rowtype;
begin
  if coalesce(trim(p_id), '') = '' then
    raise exception 'CE_CRUD: falta id para cambiar situación';
  end if;

  v_next := case when coalesce(trim(p_situacion), '') = 'Finalizado' then 'Finalizado' else 'En curso' end;

  if not exists (select 1 from public.ce_eventos where id = p_id) then
    raise exception 'CE_CRUD: evento inexistente para cambiar situación: %', p_id;
  end if;

  perform set_config('app.ce_bypass_write_lock', 'on', true);

  -- Cierre drástico: al Finalizar se revoca antes cualquier permiso temporal.
  if v_next = 'Finalizado' then
    insert into public.ce_event_edit_control (
      event_id, allow_compras, allow_colaboradores, allow_images,
      reason, opened_at, expires_at, updated_at
    ) values (
      p_id, false, false, false, 'Cerrado automáticamente al Finalizar evento', null, null, now()
    )
    on conflict (event_id) do update
       set allow_compras = false,
           allow_colaboradores = false,
           allow_images = false,
           reason = 'Cerrado automáticamente al Finalizar evento',
           expires_at = null,
           updated_at = now();
  end if;

  update public.ce_eventos
     set situacion = v_next
   where id = p_id
  returning * into v_row;

  if not found then
    raise exception 'CE_CRUD: no se pudo cambiar situación del evento: %', p_id;
  end if;

  return v_row;
end;
$$;

grant execute on function public.ce_event_ever_finalizado(text) to anon, authenticated, service_role;
grant execute on function public.ce_crud_open_compras_correction(text, integer, text) to anon, authenticated, service_role;
grant execute on function public.ce_crud_close_event_correction(text) to anon, authenticated, service_role;
grant execute on function public.ce_crud_assert_event_en_curso(text, text) to anon, authenticated, service_role;
grant execute on function public.ce_crud_eventos_situacion(text, text) to anon, authenticated, service_role;

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'ce_event_ever_finalizado',
    'ce_crud_open_compras_correction',
    'ce_crud_close_event_correction',
    'ce_crud_assert_event_en_curso',
    'ce_crud_eventos_situacion'
  )
order by routine_name;
