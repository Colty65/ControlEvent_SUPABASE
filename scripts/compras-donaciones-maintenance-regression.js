import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const active=fs.readFileSync(path.join(root,'public/app/features/v17-fix23-performance-dom-event-scope.js'),'utf8');
const rpc=fs.readFileSync(path.join(root,'public/app/features/v8-5-compras-rpc-head-fix40.js'),'utf8');
const legacy=fs.readFileSync(path.join(root,'public/app/legacy/legacy-bundle-before-modules-v30.7.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'public/app/styles/app.css'),'utf8');
const v412=fs.readFileSync(path.join(root,'public/app/features/v41-2-fixes.js'),'utf8');
const v413=fs.readFileSync(path.join(root,'public/app/features/v41-3-fixes.js'),'utf8');

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

check('Donante mantenimiento reutiliza exactamente window.donorOptions de alta', /typeof window\.donorOptions === 'function'/.test(active));
check('DONACIONES edit muestra Donante y no Tienda', /kind==='donacion'[\s\S]*edit-donacion-donante/.test(active) && !/data-action="edit-donacion-tienda"/.test(active));
check('COMPRAS edit muestra Tienda y no Donante', /edit-compra-tienda/.test(active) && !/data-action="edit-compra-donante"/.test(active));
check('RPC donación persiste donorRef y limpia tiendaId', /function donationRowPayload[\s\S]*donorRef:[\s\S]*tiendaId:''/.test(rpc));
check('RPC compra persiste tiendaId y limpia donorRef en alta', /function addPayload[\s\S]*donorRef:''[\s\S]*tiendaId:/.test(rpc));
check('RPC compra en mantenimiento limpia donorRef y solo persiste Tienda', /function rowPayload[\s\S]*donorRef:''[\s\S]*tiendaId:/.test(rpc));
check('Fallback v41 limpia Tienda al guardar donación', /c\.donorRef = donorRef;\s*c\.tiendaId = '';/.test(v412) && /row\.donorRef = donorRef;\s*row\.tiendaId = '';/.test(v413));
check('Fallback v41 limpia Donante al guardar compra', /c\.tiendaId = tiendaId;\s*c\.donorRef = '';/.test(v412) && /row\.tiendaId = tiendaId;\s*row\.donorRef = '';/.test(v413));
check('Renderer activo carga después del RPC', html.indexOf('v8-5-compras-rpc-head-fix40.js')>=0 && html.indexOf('v17-fix23-performance-dom-event-scope.js')>html.indexOf('v8-5-compras-rpc-head-fix40.js'));
check('Compras/Donaciones usan columnas proporcionales en escritorio', /row-purchase-form,[\s\S]*rowline\.compra[\s\S]*grid-template-columns:minmax\(220px,1\.75fr\)[\s\S]*minmax\(210px,1\.32fr\)/.test(css));
check('Responsable edición baja a fila inferior y queda ancho', /ce-maint-responsable/.test(active) && /grid-column:1 \/ span 3/.test(css) && /min-width:360px/.test(css) && /ce-maint-actions/.test(active));

const ko=tests.filter(([,ok])=>!ok);
if(ko.length){console.error(`COMPRAS/DONACIONES MAINTENANCE: ${ko.length} KO`);process.exit(1);}
console.log('COMPRAS/DONACIONES MAINTENANCE: OK');
