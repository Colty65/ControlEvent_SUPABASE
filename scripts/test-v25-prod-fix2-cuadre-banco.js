import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const read=relative=>fs.readFileSync(new URL(relative,root),'utf8');

const fix=read('public/app/features/v25-prod-fix1-conciliacion-backup.js');
assert.doesNotMatch(fix,/new\s+MutationObserver/, 'No debe reintroducirse el observador que bloqueaba la botonera');
assert.doesNotMatch(fix,/setInterval\s*\(\s*keepCsvAvailable/, 'CSV no debe sincronizarse mediante intervalos');
assert.match(fix,/button\.disabled!==shouldDisable/, 'Solo se cambia disabled cuando cambia el estado');
assert.match(fix,/#eventChartWrap \.chart-seg/, 'Los sectores reales de GRAFICAS deben fijar su globo');
assert.match(fix,/requestAnimationFrame\(\(\)=>showPinned/, 'El globo se fija después de leer el tooltip heredado');
assert.doesNotMatch(fix,/event-loaded[^\n]*removePinned/, 'Un rerender del evento no debe borrar el globo fijado');

const bank=read('public/app/features/v24-cuadre-banco.js');
assert.match(bank,/store\.readOnly && store\.filter==='TODOS'\) store\.filter='INCLUIDOS'/);
assert.match(bank,/const orderedLinks=arr\(row\.links\)\.slice\(\)\.sort/, 'Los TKxx deben ordenarse numéricamente');
assert.match(bank,/ce-bank-command-deck/);
assert.match(bank,/pointer-events','auto','important'/);

const service=read('services/bank-reconciliation.service.js');
assert.match(service,/listBankReconciliation\(\{accountId:text\(accountId\)\|\|'TODOS',eventId:selectedEvent\}\)/);
assert.match(service,/filter\(row=>row\.included===true\)/, 'La exportación del evento debe devolver solo En saldo');

const info=read('public/app/legacy/legacy-bundle-after-modules-v30.7.js');
assert.match(info,/filter\(movement=>movement\?\.included===true\)/, 'INFOEVENTO debe exigir En saldo=true');
assert.match(info,/const fill=\(positive\|\|justified\)\?'ok':'bad'/, 'Pendientes rojos; abonos y justificados verdes');
assert.match(info,/CUADRADO_FORZADO/);
assert.match(info,/Movimiento positivo conciliado/);

const css=read('public/app/styles/cuadre-banco.css');
assert.match(css,/@media \(min-width:1200px\)[\s\S]*grid-template-columns:minmax\(560px,1\.03fr\) minmax\(500px,\.97fr\)/, 'En PC: movimiento izquierda y conciliación derecha');
assert.match(css,/@media \(max-width:700px\)/, 'Debe existir diseño específico para teléfono');
assert.match(css,/FIX2B · zona fija legible/);
assert.match(css,/\.ce-bank-command-fields select,\.ce-bank-command-fields input\{height:35px!important;font-size:13px!important\}/);

const index=read('public/index.html');
assert.match(index,/20260730-V25-PROD-FIX2-BANK/);
console.log('OK v25_prod FIX2: controles desbloqueados, En saldo exacto, fichas PC/móvil y globos persistentes.');
