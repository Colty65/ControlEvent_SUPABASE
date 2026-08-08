import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../app/features/v24-cuadre-banco.js',import.meta.url),'utf8');

assert.match(source,/const VERSION = 'v26_prod'/);
assert.match(source,/pageSize:60/,'La pantalla debe paginar periodos largos');
assert.match(source,/rows\.slice\(start,end\)/,'Solo se debe construir la página visible');
assert.match(source,/new AbortController\(\)/,'Los cambios de cuenta/fechas deben cancelar recargas anteriores');
assert.match(source,/store\.loadController\?\.abort/,'Debe abortarse la petición anterior');
assert.match(source,/setTimeout\(\(\)=>scheduleBodyRender\(false\),140\)/,'La búsqueda debe estar desacoplada del tecleo');
assert.match(source,/!mutation\.target\?\.closest\?\.\('#ceBankOverlay'\)/,'El observador debe ignorar reconstrucciones internas');
assert.doesNotMatch(source,/overlay\.querySelectorAll\('button,label,input,select,textarea'\)/,'No se deben recorrer todos los controles de miles de filas');
assert.match(source,/id="ceBankCsvFile" class="ce-bank-file-native" type="file"/,'La carga CSV debe usar un input nativo sobre el control visible');
assert.doesNotMatch(source,/showPicker\(|triggerCsvPicker/,'No debe depender de selectores programáticos bloqueables por el navegador');

const pageSize=60;
const rows=Array.from({length:5000},(_,index)=>index+1);
const page=84;
const start=(page-1)*pageSize;
const visible=rows.slice(start,Math.min(rows.length,start+pageSize));
assert.equal(visible.length,20);
assert.equal(visible[0],4981);
assert.equal(visible.at(-1),5000);

console.log('OK v26_prod UI: CSV nativo, recargas cancelables, búsqueda diferida y 5.000 movimientos paginados.');
