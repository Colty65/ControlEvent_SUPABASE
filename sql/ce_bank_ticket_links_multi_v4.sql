-- ControlEvent v4_1_exp · BANK2
-- Permite varios TKxx del MISMO evento sobre un mismo movimiento bancario
-- y mantiene la unicidad correcta: un TKxx (event_id + ticket_code) no puede
-- quedar asociado a dos movimientos distintos.
-- Idempotente: ejecutar una sola vez es suficiente, pero puede repetirse sin daño.

DO $$
DECLARE
  r record;
  cols text[];
BEGIN
  -- Elimina únicamente restricciones UNIQUE antiguas que limitaban artificialmente
  -- un movimiento a un solo TKxx del evento. No toca PK ni restricciones correctas
  -- que incluyan ticket_code.
  FOR r IN
    SELECT c.conname,
           array_agg(a.attname ORDER BY u.ord) AS cols
    FROM pg_constraint c
    JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS u(attnum, ord) ON true
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = u.attnum
    WHERE c.conrelid = 'public.ce_bank_ticket_links'::regclass
      AND c.contype = 'u'
    GROUP BY c.conname
  LOOP
    cols := r.cols;
    IF cols = ARRAY['movement_id']::text[]
       OR cols = ARRAY['movement_id','event_id']::text[]
       OR cols = ARRAY['event_id','movement_id']::text[] THEN
      EXECUTE format('ALTER TABLE public.ce_bank_ticket_links DROP CONSTRAINT %I', r.conname);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  r record;
BEGIN
  -- Por si la restricción antigua se creó como índice UNIQUE suelto y no como constraint.
  FOR r IN
    SELECT i.indexrelid::regclass::text AS index_name,
           array_agg(a.attname ORDER BY u.ord) AS cols
    FROM pg_index i
    JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS u(attnum, ord) ON u.attnum > 0
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = u.attnum
    WHERE i.indrelid = 'public.ce_bank_ticket_links'::regclass
      AND i.indisunique = true
      AND i.indisprimary = false
    GROUP BY i.indexrelid
  LOOP
    IF r.cols = ARRAY['movement_id']::text[]
       OR r.cols = ARRAY['movement_id','event_id']::text[]
       OR r.cols = ARRAY['event_id','movement_id']::text[] THEN
      EXECUTE format('DROP INDEX IF EXISTS %s', r.index_name);
    END IF;
  END LOOP;
END $$;

-- Regla correcta: el mismo TKxx no puede pagarse/conciliarse dos veces.
-- Sí se permiten muchos TKxx para un movimiento y el mismo movimiento puede
-- contener TKxx de uno o de varios eventos.
CREATE UNIQUE INDEX IF NOT EXISTS uq_ce_bank_ticket_links_event_ticket
  ON public.ce_bank_ticket_links (event_id, ticket_code);

CREATE INDEX IF NOT EXISTS idx_ce_bank_ticket_links_movement
  ON public.ce_bank_ticket_links (movement_id);

COMMENT ON INDEX public.uq_ce_bank_ticket_links_event_ticket IS
'v4_1_exp BANK2: un TKxx es único dentro de su evento, pero un movimiento bancario puede enlazar múltiples TKxx del mismo o de distintos eventos.';
