import { createClient } from '@supabase/supabase-js';

export const BUCKET = process.env.SUPABASE_TICKET_BUCKET || 'ticket-images';

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key || /TU_PROYECTO|TU_SERVICE_ROLE_KEY/i.test(`${url} ${key}`)) {
    throw new Error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-Client-Info': 'controlevent-v26.5-real-tables' } }
  });
}
