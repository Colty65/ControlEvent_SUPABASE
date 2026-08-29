-- ControlEvent v4_0_exp · BANK4_20
-- Identidad social persistente de PERSONAS.
-- Ejecutar UNA vez en Supabase > SQL Editor antes de probar la versión BANK4_20.
-- NHC: los motes dejan de vivir en JavaScript y pasan a datos mantenibles.

begin;

alter table public.ce_personas
  add column if not exists nombre_amigo text;

create table if not exists public.ce_persona_aliases (
  persona_id text not null,
  alias text not null,
  prioridad integer not null default 50,
  es_preferido boolean not null default false,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ce_persona_aliases_pk primary key (persona_id, alias),
  constraint ce_persona_aliases_alias_no_vacio check (length(btrim(alias)) > 0)
);

create index if not exists ce_persona_aliases_alias_lower_idx
  on public.ce_persona_aliases (lower(alias))
  where activo = true;
create index if not exists ce_persona_aliases_persona_idx
  on public.ce_persona_aliases (persona_id)
  where activo = true;

create or replace function public.ce_persona_aliases_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists ce_persona_aliases_touch_updated_at on public.ce_persona_aliases;
create trigger ce_persona_aliases_touch_updated_at
before update on public.ce_persona_aliases
for each row execute function public.ce_persona_aliases_touch_updated_at();

-- El backend es quien accede a esta tabla con service_role.
grant select, insert, update, delete on public.ce_persona_aliases to service_role;

-- Normalización sencilla para la semilla inicial. El motor de CE hace después
-- la resolución social en JS con normalización Unicode y prioridad exacta.
create or replace function public.ce_social_norm(v text)
returns text
language sql
immutable
as $$
  select btrim(regexp_replace(
    translate(lower(coalesce(v,'')), 'áéíóúüñ', 'aeiouun'),
    '[^a-z0-9]+', ' ', 'g'
  ));
$$;

-- Tabla temporal de semilla confirmada por el usuario el 29/08/2026.
create temp table ce_social_seed(
  match_re text,
  nombre_amigo text,
  alias text,
  prioridad integer,
  preferido boolean
) on commit drop;

insert into ce_social_seed(match_re,nombre_amigo,alias,prioridad,preferido) values
('^(jesus alvarez seguido|colty)( |$)',                 'Colty',          'Colty',          10,true),
('^carmelo( |$)',                                       'Car',            'Car',            10,true),
('^carmelo( |$)',                                       'Car',            'Carmelera',      40,false),
('^pablo( |$)',                                         'Pablito',        'Pablito',        10,true),
('^(vicente|vivente)( |$)',                             'Vicentito',      'Vicentito',      10,true),
('^javier( |$)',                                        'Porreta',        'Porreta',        10,true),
('^juan carlos garcia( |$)',                            'García',         'García',         10,true),
('^tita( |$)',                                          'Paulita',        'Paulita',        10,true),
('^gema( |$)',                                          'Gemita',         'Gemita',         10,true),
('^cordo( |$)',                                         'Cordo',          'Paco',           50,false),
('^sierra( |$)',                                        'Sierri',         'Sierri',         10,true),
('^maria jose fuentes( |$)',                            'la Membrillera', 'la Membrillera', 10,true),
('^angeles( |$)',                                       'la rubia',       'la rubia',       10,true),
('^nines( |$)',                                         'Angelines',      'Angelines',      10,true),
('^lucia( |$)',                                         'La Luci',        'La Luci',        10,true),
('^esther( |$)',                                        'La Estercita',   'La Estercita',   10,true),
('^(curvas|paco curvas|francisco garcia donaire)( |$)','Curvas',         'Paco',           50,false),
('^gonzalo( |$)',                                       'Gonzalito',      'Gonzalito',      10,true),
('^jose manuel( |$)',                                   'el primo',       'el primo',       10,true),
('^(pocholo|manuel barrios arrondo)( |$)',              'Pocholo',        'Manolo',         40,false),
('^(varito|eduardo donaire gutierrez)( |$)',            'Varito',         'Eduardo',        40,false),
('^juli( |$)',                                          'Julita',         'Julita',         10,true),
('^(rafa|rafita)( |$)',                                 'Rafa',           'Rafa',           10,true),
('^(rafa|rafita)( |$)',                                 'Rafa',           'Pipitilla',      40,false),
('^victor cuervo( |$)',                                 'Cuervito',       'Cuervito',       10,true),
('^(placidin|placido|placido jimenez)( |$)',            'Placi',          'Placi',          10,true),
('^(placidin|placido|placido jimenez)( |$)',            'Placi',          'el gordo',       40,false),
('^(celes|celeste)( |$)',                               'La Celes',       'La Celes',       10,true),
('^(celes|celeste)( |$)',                               'La Celes',       'Celeste',        90,false),
('^miguel angel( |$)',                                  'Veinticinco',    'Veinticinco',    10,true);

-- Resuelve como máximo una fila de PERSONAS por patrón. Si un patrón no existe
-- en la BBDD actual, simplemente no se crea ese alias: podrá añadirse después
-- desde MANTENIMIENTOS > PERSONAS.
with candidatos as (
  select
    s.*,
    p.id::text as persona_id,
    row_number() over(partition by s.match_re, s.alias order by length(p.nombre), p.nombre) as rn
  from ce_social_seed s
  join public.ce_personas p on public.ce_social_norm(p.nombre) ~ s.match_re
), elegidos as (
  select * from candidatos where rn=1
)
insert into public.ce_persona_aliases(persona_id,alias,prioridad,es_preferido,activo)
select persona_id, alias, prioridad, preferido, true
from elegidos
on conflict (persona_id,alias) do update set
  prioridad=excluded.prioridad,
  es_preferido=excluded.es_preferido,
  activo=true,
  updated_at=now();

-- Refleja el alias preferido también en ce_personas.nombre_amigo. Se desactivan
-- temporalmente triggers de usuario SOLO durante esta migración para no confundir
-- una mejora del catálogo social con una modificación histórica de eventos cerrados.
alter table public.ce_personas disable trigger user;
with preferidos as (
  select distinct on (a.persona_id) a.persona_id, a.alias
  from public.ce_persona_aliases a
  where a.activo=true and a.es_preferido=true
  order by a.persona_id, a.prioridad asc, a.alias
)
update public.ce_personas p
set nombre_amigo = pr.alias
from preferidos pr
where p.id::text = pr.persona_id;
alter table public.ce_personas enable trigger user;

commit;

-- COMPROBACIÓN opcional:
-- select p.nombre, p.nombre_amigo, a.alias, a.prioridad, a.es_preferido
-- from ce_personas p
-- left join ce_persona_aliases a on a.persona_id=p.id::text and a.activo=true
-- order by p.nombre, a.prioridad, a.alias;
