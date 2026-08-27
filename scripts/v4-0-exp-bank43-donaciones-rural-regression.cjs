const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const db=read('lib/supabase-normalized.js');
const mapa=read('public/app/features/mapa-productos.js');
const resp=read('public/app/features/v4-0-exp-responsables-pdf.js');
const bank=read('public/app/features/v24-cuadre-banco.js');
const html=read('public/index.html');
const sql=read('sql/ce_donaciones_situacion_v4.sql');
let ok=0,ko=0;function t(n,c){if(c){ok++;console.log('OK · '+n)}else{ko++;console.error('KO · '+n)}}

t('backend ya no llama a RPC de situación',!/.rpc\('ce_crud_donacion_situacion'/.test(db));
t('backend actualiza directamente donacion_situacion',/.from\('ce_compras'\)[\s\S]*\.update\(\{ donacion_situacion: value \}\)/.test(db));
t('backend valida que la fila sea donación',/isDonationTicket\(existing\.ticket_donacion\)/.test(db));
t('backend conserva bloqueo de Finalizado',/assertEventNotFinalized\(existing\.event_id, 'cambiar la situación de una donación'\)/.test(db));
t('Mapa tiene fallback directo para Marcar entregada',/toggleDonationDelivered\('\$\{esc\(id\)\}'\)/.test(mapa));
t('Mapa sigue persistiendo por endpoint CRUD',/donacion-situacion/.test(mapa)&&/method:'PUT'/.test(mapa));
t('Responsables permite título completo',/white-space:normal;overflow:visible;text-overflow:clip/.test(resp));
t('Responsables reserva ancho al título',/min-width:360px;flex:1 1 640px/.test(resp));
t('Cuadre Banco usa imagen Eurocaja Rural en cabecera',/ce-bank-brand-orbit[^\n]*eurocaja-rural-user\.png/.test(bank));
t('Acceso lateral a Cuadre Banco usa Eurocaja Rural',/desktop\.innerHTML=[^\n]*eurocaja-rural-user\.png/.test(bank)&&/btnOpenBankReconciliation[\s\S]*eurocaja-rural-user\.png/.test(html));
t('Menú móvil bancario usa Eurocaja Rural',/ceOpenBank='1';[^\n]*eurocaja-rural-user\.png/.test(bank));
t('Migración histórica marca Finalizados Entregada',/set donacion_situacion = 'Entregada'[\s\S]*finalizado/.test(sql));
t('Migración mantiene En curso Comprometida',/set donacion_situacion = 'Comprometida'[\s\S]*en curso/.test(sql));
t('Migración puentea solo temporalmente triggers de usuario',/disable trigger user/.test(sql)&&/enable trigger user/.test(sql));
t('cache bust BANK4.3 aplicado',/BANK43/.test(html));
console.log(`\nV4.0_exp BANK4.3 · ${ok}/${ok+ko} comprobaciones OK`);if(ko)process.exit(1);
