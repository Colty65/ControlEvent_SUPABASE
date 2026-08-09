import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const read=relative=>fs.readFileSync(new URL(relative,root),'utf8');

const fix=read('public/app/features/v26-prod-fix1-conciliacion-backup.js');
assert.doesNotMatch(fix,/new\s+MutationObserver/, 'El parche posterior no debe reintroducir el observador que bloqueaba la botonera');
assert.doesNotMatch(fix,/setInterval\s*\(\s*keepCsvAvailable/, 'CSV no debe sincronizarse mediante intervalos');
assert.doesNotMatch(fix,/keepCsvAvailableInCurrentEvent/, 'El parche posterior no debe gobernar el estado de CSV');
assert.doesNotMatch(fix,/function\s+showPinned\s*\(/, 'No debe volver el globo oscuro duplicado');
assert.match(fix,/#ceTooltipV21\[data-ce-pinned="1"\]/, 'El globo canónico debe tener estilo persistente');

const bank=read('public/app/features/v24-cuadre-banco.js');
assert.match(bank,/store\.readOnly && store\.filter==='TODOS'\) store\.filter='INCLUIDOS'/);
assert.match(bank,/const orderedLinks=displayLinks\.slice\(\)\.sort/, 'Los TKxx deben ordenarse numéricamente');
assert.match(bank,/Movimientos bancarios/);
assert.match(bank,/Tickets justificantes del mvto bancario/);
assert.match(bank,/id="ceBankCsvFile" class="ce-bank-file-native" type="file"/, 'La carga CSV debe usar el input nativo del navegador');
assert.doesNotMatch(bank,/showPicker\(|triggerCsvPicker/, 'No debe haber apertura programática del selector CSV');
assert.doesNotMatch(bank,/root\.addEventListener\(type,shield/, 'No debe interceptarse pointerdown en window/capture');

const service=read('services/bank-reconciliation.service.js');
assert.match(service,/displayLinksByMovement/);
assert.match(service,/linkedToOtherEvent/);
assert.match(service,/if\(linkedToOtherEvent\) included=false/);

const info=read('public/app/legacy/legacy-bundle-after-modules-v30.7.js');
assert.match(info,/filter\(movement=>movement\?\.included===true\)/, 'INFOEVENTO debe exigir En saldo=true');
assert.match(info,/const fill=\(positive\|\|justified\)\?'ok':'bad'/, 'Pendientes rojos; abonos y justificados verdes');
assert.match(info,/CUADRADO_FORZADO/);
assert.match(info,/Movimiento positivo conciliado/);

const css=read('public/app/styles/cuadre-banco.css');
assert.match(css,/ControlEvent v26_prod_1.0 FIX4|body\.ce-bank-open > :not\(#ceBankOverlay\)/, 'Debe existir el aislamiento real de la ventana bancaria');
assert.match(css,/grid-template-columns:minmax\(560px,1\.03fr\) minmax\(500px,\.97fr\)/, 'En PC: movimiento izquierda y conciliación derecha');
assert.match(css,/\.ce-bank-ticket-chip\.foreign>span\{display:inline-flex!important/);
assert.match(css,/@media \(max-width:700px\)/, 'Debe existir diseño específico para teléfono');

const index=read('public/index.html');
assert.match(index,/20260730-V26-PROD-FIX4-REAL/);
console.log('OK v26_prod_1.0 FIX4: controles nativos, En saldo exacto, fichas PC/móvil y globo canónico.');
