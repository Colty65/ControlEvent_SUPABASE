-- ControlEvent v4_0_exp · DONACIONES PENDIENTES
-- Ejecutar UNA vez en Supabase SQL Editor antes de probar esta versión.
-- Añade el estado operativo de entrega al registro canónico ce_compras usado también por DONACIONES.

alter table public.ce_compras
  add column if not exists donacion_situacion text;

-- La versión anterior daba por hecha la donación. Para que los registros históricos
-- puedan revisarse de forma natural, las donaciones sin estado arrancan como Comprometida.
update public.ce_compras
set donacion_situacion = 'Comprometida'
where upper(trim(coalesce(ticket_donacion,''))) in ('DONADO TIENDA','DONADO SOCIO','DONADO OTROS')
  and (donacion_situacion is null or trim(donacion_situacion) = '');

-- Las compras normales no deben llevar situación de donación.
update public.ce_compras
set donacion_situacion = null
where upper(trim(coalesce(ticket_donacion,''))) not in ('DONADO TIENDA','DONADO SOCIO','DONADO OTROS')
  and donacion_situacion is not null;

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

-- Garantiza la coherencia aunque una línea cambie entre COMPRA y DONACIÓN por las RPC ya existentes.
-- Al crear una donación sin estado explícito arranca de forma natural como Comprometida;
-- al convertirla de nuevo en compra se limpia el estado de entrega.
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

-- RPC específica. Reutiliza primero la RPC canónica de COMPRAS ya instalada para conservar
-- sus validaciones/autorización interna (evento En curso y write-lock) y, dentro de la misma
-- transacción, actualiza exclusivamente el nuevo estado de la donación.
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

  -- Activa el mismo camino canónico/guardas que ya usa CE para modificar ce_compras.
  perform public.ce_crud_compras_update(
    p_id := v.id::text,
    p_event_id := v.event_id::text,
    p_producto_id := v.producto_id::text,
    p_unidades := v.unidades,
    p_precio := v.precio,
    p_ticket_donacion := v.ticket_donacion,
    p_donor_ref := v.donor_ref,
    p_responsable_id := v.responsable_id,
    p_tienda_id := v.tienda_id
  );

  update public.ce_compras
  set donacion_situacion = s
  where id = v.id
  returning * into v;

  return v;
end;
$$;

grant execute on function public.ce_crud_donacion_situacion(text,text) to service_role;

-- Comprobación rápida opcional:
-- select id, ticket_donacion, donacion_situacion
-- from public.ce_compras
-- where upper(trim(coalesce(ticket_donacion,''))) like 'DONADO%'
-- order by event_id, donacion_situacion, id;
