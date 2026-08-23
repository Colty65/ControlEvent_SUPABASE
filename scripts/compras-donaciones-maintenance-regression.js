import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const active=fs.readFileSync(path.join(root,'public/app/features/v17-fix23-performance-dom-event-scope.js'),'utf8');
const rpc=fs.readFileSync(path.join(root,'public/app/features/v8-5-compras-rpc-head-fix40.js'),'utf8');
const legacy=fs.readFileSync(path.join(root,'public/app/legacy/legacy-bundle-before-modules-v30.7.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');

const tests=[];
function check(name,cond){tests.push([name,!!cond]);console.log(`${cond?'OK':'KO'} ${name}`);}

check('Responsable mantenimiento reutiliza socioResponsableOptions de alta', /typeof window\.socioResponsableOptions === 'function'/.test(active));
check('socioResponsableOptions global usa personas generales SOCIO', /window\.socioResponsableOptions\s*=\s*function\(\)\{[\s\S]*personasGenerales[\s\S]*rango[^\n]*SOCIO/.test(legacy));
check('Responsable edit compra/donación usa lista completa socios()', /<label>Responsable<\/label>[\s\S]*optionsHtml\(socios\(\), responsableId/.test(active));
check('Valor persistido ausente del catálogo se conserva como option selected', /if\(sel&&!seen\.has\(sel\)\)out\.unshift\([^\n]*selected/.test(active));
check('Ticket/tipo persistido fuera de lista actual se conserva', /opts\.includes\(sel\)\?opts:\[sel,\.\.\.opts\]/.test(active));
check('Donación usa acciones edit-donacion', /prefix=kind==='donacion'\?'edit-donacion':'edit-compra'/.test(active));
check('Donación usa save-donacion y delete-donacion', /saveAction=kind==='donacion'\?'save-donacion':'save-compra'/.test(active) && /deleteAction=kind==='donacion'\?'delete-donacion':'delete-compra'/.test(active));
check('RPC espera exactamente edit-donacion-responsable', /edit-donacion-responsable/.test(rpc));
check('RPC procesa save-donacion', /save-donacion/.test(rpc));
check('Renderer activo carga después del RPC', html.indexOf('v8-5-compras-rpc-head-fix40.js')>=0 && html.indexOf('v17-fix23-performance-dom-event-scope.js')>html.indexOf('v8-5-compras-rpc-head-fix40.js'));

const ko=tests.filter(([,ok])=>!ok);
if(ko.length){console.error(`COMPRAS/DONACIONES MAINTENANCE: ${ko.length} KO`);process.exit(1);}
console.log('COMPRAS/DONACIONES MAINTENANCE: OK');
