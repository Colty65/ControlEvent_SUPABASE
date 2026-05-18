-- ControlEvent v23.6.7 - tablas reales para Supabase
-- Ejecutar en Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.ce_users (
  identificacion text primary key,
  nombre text not null,
  clave text not null default '',
  nivel text not null default 'RO' check (nivel in ('GD', 'RW', 'RO')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ce_eventos (
  id text primary key,
  titulo text not null default '',
  precio numeric(12,2) not null default 0,
  fecha_ini text not null default '',
  fecha_fin text not null default '',
  situacion text not null default 'En curso',
  descripcion text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ce_personas (
  id text primary key,
  nombre text not null default '',
  rango text not null default 'SOCIO',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ce_tiendas (
  id text primary key,
  nombre text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ce_productos (
  id text primary key,
  nombre text not null default '',
  segmento text not null default '',
  destino text not null default '',
  default_precio numeric(12,2) not null default 0,
  default_tienda_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ce_colaboradores (
  id text primary key,
  event_id text not null,
  persona_id text not null,
  numero numeric(12,2) not null default 0,
  situacion text not null default 'Pendiente',
  importe numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ce_compras (
  id text primary key,
  event_id text not null,
  producto_id text not null,
  unidades numeric(12,2) not null default 0,
  precio numeric(12,2) not null default 0,
  ticket_donacion text not null default '',
  donor_ref text,
  responsable_id text,
  tienda_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ce_ticket_images (
  image_key text primary key,
  event_id text not null,
  label text not null default '',
  storage_path text,
  public_url text,
  pathname text,
  content_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ce_meta (
  key text primary key,
  value jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists ce_colaboradores_event_idx on public.ce_colaboradores(event_id);
create index if not exists ce_colaboradores_persona_idx on public.ce_colaboradores(persona_id);
create index if not exists ce_compras_event_idx on public.ce_compras(event_id);
create index if not exists ce_compras_producto_idx on public.ce_compras(producto_id);
create index if not exists ce_compras_tienda_idx on public.ce_compras(tienda_id);
create index if not exists ce_ticket_images_event_idx on public.ce_ticket_images(event_id);

create or replace function public.ce_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ce_users_updated_at on public.ce_users;
create trigger ce_users_updated_at before update on public.ce_users
for each row execute function public.ce_set_updated_at();

drop trigger if exists ce_eventos_updated_at on public.ce_eventos;
create trigger ce_eventos_updated_at before update on public.ce_eventos
for each row execute function public.ce_set_updated_at();

drop trigger if exists ce_personas_updated_at on public.ce_personas;
create trigger ce_personas_updated_at before update on public.ce_personas
for each row execute function public.ce_set_updated_at();

drop trigger if exists ce_tiendas_updated_at on public.ce_tiendas;
create trigger ce_tiendas_updated_at before update on public.ce_tiendas
for each row execute function public.ce_set_updated_at();

drop trigger if exists ce_productos_updated_at on public.ce_productos;
create trigger ce_productos_updated_at before update on public.ce_productos
for each row execute function public.ce_set_updated_at();

drop trigger if exists ce_colaboradores_updated_at on public.ce_colaboradores;
create trigger ce_colaboradores_updated_at before update on public.ce_colaboradores
for each row execute function public.ce_set_updated_at();

drop trigger if exists ce_compras_updated_at on public.ce_compras;
create trigger ce_compras_updated_at before update on public.ce_compras
for each row execute function public.ce_set_updated_at();

drop trigger if exists ce_ticket_images_updated_at on public.ce_ticket_images;
create trigger ce_ticket_images_updated_at before update on public.ce_ticket_images
for each row execute function public.ce_set_updated_at();

drop trigger if exists ce_meta_updated_at on public.ce_meta;
create trigger ce_meta_updated_at before update on public.ce_meta
for each row execute function public.ce_set_updated_at();

insert into public.ce_users (identificacion, nombre, clave, nivel) values
  ('admin', 'Administrador', 'admin', 'GD'),
  ('rw', 'Usuario RW', 'rw', 'RW'),
  ('ro', 'Usuario RO', 'ro', 'RO')
on conflict (identificacion) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ticket-images',
  'ticket-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
