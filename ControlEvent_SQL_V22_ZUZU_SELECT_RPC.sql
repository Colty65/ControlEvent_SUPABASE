-- ControlEvent v22_prod · RPC experimental para ejecutar SELECTS_PROPUESTOS por Zuzu
-- Ejecutar UNA VEZ en Supabase SQL Editor si la traza indica que falta ce_zuzu_select.
-- Solo permite SELECT de lectura. No concede permisos de escritura.

create or replace function public.ce_zuzu_select(p_sql text, p_max_rows integer default 300)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sql text;
  v_limited_sql text;
  v_rows jsonb;
  v_count integer := 0;
  v_max integer := greatest(1, least(coalesce(p_max_rows, 300), 1000));
begin
  v_sql := trim(coalesce(p_sql, ''));
  v_sql := regexp_replace(v_sql, ';\s*$', '', 'g');

  if v_sql = '' or v_sql !~* '^\s*select\s' then
    return jsonb_build_object('ok', false, 'error', 'Solo se permite SELECT.', 'rows', '[]'::jsonb, 'row_count', 0);
  end if;

  if v_sql ~ ';\s*\S' then
    return jsonb_build_object('ok', false, 'error', 'Solo se permite una sentencia SELECT.', 'rows', '[]'::jsonb, 'row_count', 0);
  end if;

  if v_sql ~* '\b(insert|update|delete|drop|alter|create|truncate|merge|upsert|call|execute|exec|do|copy|grant|revoke|vacuum|analyze|refresh)\b' then
    return jsonb_build_object('ok', false, 'error', 'La SELECT contiene palabras no permitidas.', 'rows', '[]'::jsonb, 'row_count', 0);
  end if;

  if v_sql ~* '(--|/\*|\*/|#)' then
    return jsonb_build_object('ok', false, 'error', 'La SELECT contiene comentarios no permitidos.', 'rows', '[]'::jsonb, 'row_count', 0);
  end if;

  if v_sql ~* '\b(auth|storage|vault|information_schema|pg_catalog|pg_|extensions|secrets?)\b' then
    return jsonb_build_object('ok', false, 'error', 'La SELECT referencia esquemas o tablas no permitidas.', 'rows', '[]'::jsonb, 'row_count', 0);
  end if;

  perform set_config('statement_timeout', '4000', true);

  v_limited_sql := 'select coalesce(jsonb_agg(to_jsonb(q)), ''[]''::jsonb) from (select * from (' || v_sql || ') zuzu_sql_subquery limit ' || v_max || ') q';
  execute v_limited_sql into v_rows;
  v_count := coalesce(jsonb_array_length(v_rows), 0);

  return jsonb_build_object(
    'ok', true,
    'rows', coalesce(v_rows, '[]'::jsonb),
    'row_count', v_count,
    'truncated', v_count >= v_max,
    'max_rows', v_max
  );
exception when others then
  return jsonb_build_object('ok', false, 'error', SQLERRM, 'rows', '[]'::jsonb, 'row_count', 0);
end;
$$;

grant execute on function public.ce_zuzu_select(text, integer) to anon, authenticated, service_role;
