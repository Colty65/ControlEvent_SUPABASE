import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const read=relative=>fs.readFileSync(new URL(relative,root),'utf8');

const bank=read('public/app/features/v24-cuadre-banco.js');
assert.match(bank,/function installCommandFirewall\(\)[\s\S]*no se interceptan eventos en window\/capture/);
assert.doesNotMatch(bank,/\['pointerdown','mousedown','touchstart'/, 'No deben detenerse los eventos antes de llegar al select/input');
assert.match(bank,/if\(typeof input\.showPicker==='function'\) input\.showPicker\(\)/);
assert.match(bank,/row\.displayLinks\|\|row\.links/);
assert.match(bank,/link\.isActiveEvent===false\?'foreign'/);
assert.match(bank,/row\.inclusionLocked\?'Otro evento'/);
assert.match(bank,/Conciliado en otro evento/);
assert.match(bank,/String\(a\.eventTitle\|\|''\)\.localeCompare/);

const service=read('services/bank-reconciliation.service.js');
assert.match(service,/selectPaged\(LINKS_TABLE, \{order:'created_at', ascending:true\}\)/, 'La consulta debe leer vínculos de todos los eventos');
assert.match(service,/eventTitleById/);
assert.match(service,/displayLinks/);
assert.match(service,/inclusionLocked:linkedToOtherEvent/);
assert.match(service,/if\(linkedToOtherEvent\) included=false/);
assert.match(service,/BANK_MOVEMENT_OTHER_EVENT/);

const legacy=read('public/app/legacy/legacy-bundle-before-modules-v30.7.js');
assert.match(legacy,/tip\.dataset\.cePinned='1'/);
assert.match(legacy,/ce-v21-tip-close/);
assert.match(legacy,/const el=ev\.target\.closest\?\.\('\[data-ce-tip-v21\]'\);[\s\S]*if\(!el\)return;/);
assert.match(legacy,/if\(!force&&tip\.dataset\.cePinned==='1'\)return/);
assert.match(legacy,/cabecera, detalle y total al final/);
assert.match(legacy,/output\.push\(\[\.\.\.header,\.\.\.detail,'',\.\.\.totals\]/);
const manager=legacy.slice(legacy.indexOf('let activeOwner=null, closeTimer=null, tipObserver=null'),legacy.indexOf('function afterRender(){refreshVersion()',legacy.indexOf('let activeOwner=null, closeTimer=null, tipObserver=null')));
assert.doesNotMatch(manager,/block\.sort\(/, 'El detalle no debe reordenarse separando cabeceras y totales');

const fix=read('public/app/features/v25-prod-fix1-conciliacion-backup.js');
assert.doesNotMatch(fix,/box\.id='ceV25PinnedGraphTip'/, 'No debe crearse el globo oscuro duplicado');
assert.match(fix,/#ceV25PinnedGraphTip\{display:none!important\}/);
assert.match(fix,/#ceTooltipV21\[data-ce-pinned="1"\]/);

const css=read('public/app/styles/cuadre-banco.css');
assert.match(css,/Tickets justificantes del mvto bancario|v25_prod FIX3/);
assert.match(css,/\.ce-bank-amount small,\.ce-bank-amount strong,\.ce-bank-amount>span\{position:static!important/);
assert.match(css,/\.ce-bank-movement\.negative \.ce-bank-ticket-list\{grid-column:2!important/);
assert.match(css,/\.ce-bank-ticket-chip\.foreign>span\{display:inline-flex!important/);

console.log('OK v25_prod FIX3: controles sin captura, globo único persistente, orden cabecera-detalle-total y movimientos de otros eventos.');
