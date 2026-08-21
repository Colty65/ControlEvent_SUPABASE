create extension if not exists vector;
alter table public.ce_eventos add column if not exists embedding vector(768);
create or replace function match_events (query_embedding vector(768), match_threshold float, match_count int)
returns table (id text, titulo text, precio numeric, fecha_ini text, fecha_fin text, similarity float) language sql stable as $$
select id, titulo, precio, fecha_ini, fecha_fin, 1 - (embedding <=> query_embedding) as similarity from public.ce_eventos
where embedding is not null and 1 - (embedding <=> query_embedding) > match_threshold order by embedding <=> query_embedding limit match_count; $$;