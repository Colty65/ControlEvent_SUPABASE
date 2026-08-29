-- ControlEvent v4_0_exp · BANK4_23
-- Nombre específico de cada evento para respuesta hablada de Zuzu.
-- El título canónico no cambia y sigue usándose para BBDD, tablas, búsquedas y pantalla.

alter table public.ce_eventos
  add column if not exists nombre_hablado text;

comment on column public.ce_eventos.nombre_hablado is
  'Nombre/frase que Zuzu debe usar al pronunciar el evento. Si está vacío, se conserva el comportamiento oral anterior.';

-- Ejemplos de uso (NO se ejecutan automáticamente):
-- update public.ce_eventos set nombre_hablado='Santiago y Santa Ana de este año' where titulo='SySA 2026';
-- update public.ce_eventos set nombre_hablado='Hermandad Santísimo Cristo de las Angustias' where titulo='Hdad. Stmo. Cristo de la Angustias';
-- update public.ce_eventos set nombre_hablado='Fiesta del Olivo' where titulo='FdO';

select id, titulo, nombre_hablado, situacion
from public.ce_eventos
order by fecha_ini desc nulls last, titulo;
