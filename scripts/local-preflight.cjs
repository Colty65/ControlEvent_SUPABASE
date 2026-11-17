const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');
function fail(msg){ console.error('\n[KO] ' + msg + '\n'); process.exitCode = 2; }
if (!fs.existsSync(envPath)) {
  fail('No existe .env. Ejecuta primero 00_CONFIGURAR_LOCAL.bat');
  process.exit();
}
const raw = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of raw.split(/\r?\n/)) {
  const t=line.trim(); if(!t || t.startsWith('#')) continue;
  const i=t.indexOf('='); if(i<1) continue;
  const k=t.slice(0,i).trim(); let v=t.slice(i+1).trim();
  if ((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1);
  env[k]=v;
}
const required=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','GEMINI_API_KEY'];
const missing=required.filter(k=>!env[k] || /PEGA_AQUI|TU_PROYECTO|TU_SERVICE_ROLE_KEY|TU_GEMINI/i.test(env[k]));
if(missing.length){ fail('Faltan variables en .env: '+missing.join(', ')); process.exit(); }
if(!/^https:\/\//i.test(env.SUPABASE_URL)) { fail('SUPABASE_URL no parece una URL https válida.'); process.exit(); }
console.log('[OK] Configuración local mínima presente.');
console.log('[OK] Supabase URL: ' + env.SUPABASE_URL.replace(/^(https:\/\/[^.]{3})[^.]*/, '$1…'));
console.log('[OK] SUPABASE_SERVICE_ROLE_KEY: configurada (oculta)');
console.log('[OK] GEMINI_API_KEY: configurada (oculta)');
console.log('[OK] Puerto local: ' + (env.PORT || '3030'));
