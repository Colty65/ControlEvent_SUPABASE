-- ControlEvent v4_1_exp · DONACIONES PENDIENTES · BANK4.3
-- Migración idempotente. Puede ejecutarse aunque una versión anterior se quedara a medias.
-- Regla histórica:
--   Evento Finalizado -> donación registrada = Entregada.
--   Evento En curso   -> donación existente = Comprometida.
-- Las nuevas donaciones nacen Comprometidas salvo que CE envíe expresamente otro estado.

begin;

alter table public.ce_compras
  add column if not exists donacion_situacion text;

-- Regularización histórica única. La protección de eventos finalizados debe seguir existiendo,
-- pero durante esta migración necesitamos actualizar esas filas antiguas de forma controlada.
-- DISABLE TRIGGER USER se revierte dentro de la misma transacción si algo falla.
alter table public.ce_compras disable trigger user;

update public.ce_compras c
set donacion_situacion = 'Entregada'
from public.ce_eventos e
where e.id = c.event_id
  and lower(trim(coalesce(e.situacion,''))) = 'finalizado'
  and upper(trim(coalesce(c.ticket_donacion,''))) in ('DONADO TIENDA','DONADO SOCIO','DONADO OTROS');

update public.ce_compras c
set donacion_situacion = 'Comprometida'
from public.ce_eventos e
where e.id = c.event_id
  and lower(trim(coalesce(e.situacion,''))) = 'en curso'
  and upper(trim(coalesce(c.ticket_donacion,''))) in ('DONADO TIENDA','DONADO SOCIO','DONADO OTROS')
  and (c.donacion_situacion is null or trim(c.donacion_situacion) = '' or c.donacion_situacion not in ('Supuesta','Comprometida','Entregada'));

update public.ce_compras
set donacion_situacion = null
where upper(trim(coalesce(ticket_donacion,''))) not in ('DONADO TIENDA','DONADO SOCIO','DONADO OTROS')
  and donacion_situacion is not null;

alter table public.ce_compras enable trigger user;

-- Restricción e índice.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.ce_compras'::regclass
      and conname = 'ce_compras_donacion_situacion_chk'
  ) then
    alter table public.ce_compras
      add constraint ce_compras_donacion_situacion_chk
      check (donacion_situacion is null or donacion_situacion in ('Supuesta','Comprometida','Entregada'));
  end if;
end $$;

create index if not exists idx_ce_compras_event_donacion_situacion
  on public.ce_compras(event_id, donacion_situacion)
  where donacion_situacion is not null;

comment on column public.ce_compras.donacion_situacion is
'Situación real de entrega del producto donado: Supuesta, Comprometida o Entregada. NULL para compras normales.';

-- Coherencia de nuevas filas y de cambios compra <-> donación.
create or replace function public.ce_sync_donacion_situacion()
returns trigger
language plpgsql
as $$
begin
  if upper(trim(coalesce(new.ticket_donacion,''))) in ('DONADO TIENDA','DONADO SOCIO','DONADO OTROS') then
    if new.donacion_situacion is null or trim(new.donacion_situacion) = '' then
      new.donacion_situacion := 'Comprometida';
    end if;
  else
    new.donacion_situacion := null;
  end if;
  return new;
end;
$$;

drop trigger if exists ce_sync_donacion_situacion_trg on public.ce_compras;
create trigger ce_sync_donacion_situacion_trg
before insert or update of ticket_donacion on public.ce_compras
for each row execute function public.ce_sync_donacion_situacion();

-- Compatibilidad con despliegues BANK4.2 que aún llamen a esta RPC.
-- BANK4.3 ya no depende de ella: el backend actualiza directamente la columna tras validar
-- que el registro es una donación y que el evento no está Finalizado.
create or replace function public.ce_crud_donacion_situacion(
  p_id text,
  p_situacion text
)
returns public.ce_compras
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.ce_compras%rowtype;
  s text := initcap(lower(trim(coalesce(p_situacion,''))));
begin
  select * into v
  from public.ce_compras
  where id::text = trim(p_id)
  for update;

  if v.id is null then
    raise exception 'No existe la donación %', p_id;
  end if;

  if upper(trim(coalesce(v.ticket_donacion,''))) not in ('DONADO TIENDA','DONADO SOCIO','DONADO OTROS') then
    raise exception 'El registro % no es una donación de producto', p_id;
  end if;

  if s not in ('Supuesta','Comprometida','Entregada') then
    raise exception 'Situación de donación no válida: %', p_situacion;
  end if;

  update public.ce_compras
  set donacion_situacion = s
  where id = v.id
  returning * into v;

  return v;
end;
$$;

grant execute on function public.ce_crud_donacion_situacion(text,text) to service_role;

commit;

-- Comprobación opcional:
-- select e.titulo, e.situacion, c.ticket_donacion, c.donacion_situacion, count(*)
-- from public.ce_compras c
-- join public.ce_eventos e on e.id = c.event_id
-- where upper(trim(coalesce(c.ticket_donacion,''))) in ('DONADO TIENDA','DONADO SOCIO','DONADO OTROS')
-- group by e.titulo, e.situacion, c.ticket_donacion, c.donacion_situacion
-- order by e.situacion, e.titulo, c.donacion_situacion;
