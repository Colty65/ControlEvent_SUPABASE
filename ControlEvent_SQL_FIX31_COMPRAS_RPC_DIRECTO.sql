-- ControlEvent v8.5_prod FIX31
-- COMPRAS con CRUD directo en BBDD mediante RPC.
-- Mantiene global_write_lock = ON. Solo estas funciones hacen bypass interno
-- y únicamente después de validar que el evento está En curso.

create or replace function public.ce_crud_assert_event_en_curso(p_event_id text, p_action text default 'modificar')
returns public.ce_eventos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.ce_eventos%rowtype;
begin
  if coalesce(trim(p_event_id), '') = '' then
    raise exception 'CE_CRUD: falta event_id para %', p_action;
  end if;

  select *
    into v_event
  from public.ce_eventos
  where id = p_event_id;

  if not found then
    raise exception 'CE_CRUD: evento inexistente para %: %', p_action, p_event_id;
  end if;

  if coalesce(v_event.situacion, '') = 'Finalizado' then
    raise exception 'CE_CRUD: evento Finalizado bloqueado para %. Evento: % - %',
      p_action,
      v_event.id,
      coalesce(v_event.titulo, '');
  end if;

  return v_event;
end;
$$;

create or replace function public.ce_crud_compras_insert(
  p_id text,
  p_event_id text,
  p_producto_id text,
  p_unidades numeric,
  p_precio numeric,
  p_ticket_donacion text,
  p_donor_ref text,
  p_responsable_id text,
  p_tienda_id text
)
returns public.ce_compras
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.ce_compras%rowtype;
begin
  perform public.ce_crud_assert_event_en_curso(p_event_id, 'insertar compra');

  if coalesce(trim(p_id), '') = '' then
    raise exception 'CE_CRUD: falta id para insertar compra';
  end if;
  if coalesce(trim(p_producto_id), '') = '' then
    raise exception 'CE_CRUD: falta producto_id para insertar compra';
  end if;

  if exists (select 1 from public.ce_compras where id = p_id) then
    raise exception 'CE_CRUD: ya existe compra con id %, no se inserta de nuevo', p_id;
  end if;

  perform set_config('app.ce_bypass_write_lock', 'on', true);

  insert into public.ce_compras (
    id, event_id, producto_id, unidades, precio, ticket_donacion,
    donor_ref, responsable_id, tienda_id
  ) values (
    p_id,
    p_event_id,
    p_producto_id,
    coalesce(p_unidades, 0),
    coalesce(p_precio, 0),
    coalesce(p_ticket_donacion, ''),
    nullif(trim(coalesce(p_donor_ref, '')), ''),
    nullif(trim(coalesce(p_responsable_id, '')), ''),
    nullif(trim(coalesce(p_tienda_id, '')), '')
  )
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.ce_crud_compras_update(
  p_id text,
  p_event_id text,
  p_producto_id text,
  p_unidades numeric,
  p_precio numeric,
  p_ticket_donacion text,
  p_donor_ref text,
  p_responsable_id text,
  p_tienda_id text
)
returns public.ce_compras
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.ce_compras%rowtype;
  v_row public.ce_compras%rowtype;
begin
  if coalesce(trim(p_id), '') = '' then
    raise exception 'CE_CRUD: falta id para modificar compra';
  end if;

  select *
    into v_old
  from public.ce_compras
  where id = p_id;

  if not found then
    raise exception 'CE_CRUD: no existe compra para modificar: %', p_id;
  end if;

  perform public.ce_crud_assert_event_en_curso(v_old.event_id, 'modificar compra');

  if coalesce(trim(p_event_id), '') <> '' and trim(p_event_id) <> v_old.event_id then
    raise exception 'CE_CRUD: no se permite mover una compra de evento. Compra %, evento original %, evento recibido %',
      p_id,
      v_old.event_id,
      p_event_id;
  end if;

  if coalesce(trim(p_producto_id), '') = '' then
    raise exception 'CE_CRUD: falta producto_id para modificar compra';
  end if;

  perform set_config('app.ce_bypass_write_lock', 'on', true);

  update public.ce_compras
     set producto_id = p_producto_id,
         unidades = coalesce(p_unidades, 0),
         precio = coalesce(p_precio, 0),
         ticket_donacion = coalesce(p_ticket_donacion, ''),
         donor_ref = nullif(trim(coalesce(p_donor_ref, '')), ''),
         responsable_id = nullif(trim(coalesce(p_responsable_id, '')), ''),
         tienda_id = nullif(trim(coalesce(p_tienda_id, '')), '')
   where id = p_id
  returning * into v_row;

  if not found then
    raise exception 'CE_CRUD: no se pudo modificar compra: %', p_id;
  end if;

  return v_row;
end;
$$;

create or replace function public.ce_crud_compras_delete(p_id text)
returns public.ce_compras
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.ce_compras%rowtype;
begin
  if coalesce(trim(p_id), '') = '' then
    raise exception 'CE_CRUD: falta id para borrar compra';
  end if;

  select *
    into v_old
  from public.ce_compras
  where id = p_id;

  if not found then
    raise exception 'CE_CRUD: no existe compra para borrar: %', p_id;
  end if;

  perform public.ce_crud_assert_event_en_curso(v_old.event_id, 'borrar compra');

  perform set_config('app.ce_bypass_write_lock', 'on', true);

  delete from public.ce_compras
  where id = p_id;

  if not found then
    raise exception 'CE_CRUD: no se pudo borrar compra: %', p_id;
  end if;

  return v_old;
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

grant execute on function public.ce_crud_assert_event_en_curso(text, text) to anon, authenticated, service_role;
grant execute on function public.ce_crud_compras_insert(text, text, text, numeric, numeric, text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.ce_crud_compras_update(text, text, text, numeric, numeric, text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.ce_crud_compras_delete(text) to anon, authenticated, service_role;
grant execute on function public.ce_crud_eventos_situacion(text, text) to anon, authenticated, service_role;

-- Prueba de instalación: deben aparecer 5 funciones.
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'ce_crud_assert_event_en_curso',
    'ce_crud_compras_insert',
    'ce_crud_compras_update',
    'ce_crud_compras_delete',
    'ce_crud_eventos_situacion'
  )
order by routine_name;
