-- 1. Habilitar la extensión de vectores en Postgres
create extension if not exists vector;

-- 2. Añadir la columna de embeddings a tu tabla existente de 'eventos'
alter table public.eventos 
add column if not exists embedding vector(768);

-- 3. Crear un índice de similitud (opcional, acelera búsquedas con gran volumen de datos)
create index if not exists eventos_embedding_idx 
on public.eventos using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- 4. Crear la función RPC que llamaremos desde Node.js con filtro de seguridad por usuario
create or replace function match_events (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
returns table (
  id uuid,
  nombre text,
  descripcion text,
  fecha timestamp with time zone,
  tipo text,
  ubicacion text,
  similarity float
)
language sql stable
as $$
  select
    eventos.id,
    eventos.nombre,
    eventos.descripcion,
    eventos.fecha,
    eventos.tipo,
    eventos.ubicacion,
    1 - (eventos.embedding <=> query_embedding) as similarity
  from eventos
  where eventos.user_id = p_user_id  -- Barrera crítica: Solo devuelve datos del usuario logueado
    and 1 - (eventos.embedding <=> query_embedding) > match_threshold
  order by eventos.embedding <=> query_embedding
  limit match_count;
$$;
