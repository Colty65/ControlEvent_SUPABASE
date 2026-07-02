import 'dotenv/config';
import { health } from '../lib/supabase-normalized.js';

async function main() {
  const result = await health();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    console.log('\nEjecuta sql/001_create_real_tables.sql en Supabase SQL Editor y vuelve a probar.');
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error('[check-supabase-schema] ERROR:', err.message || err);
  process.exit(1);
});
