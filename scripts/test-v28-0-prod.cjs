const fs=require('fs');const path=require('path');const vm=require('vm');const assert=require('assert');
const root=path.join(__dirname,'..');
function read(rel){return fs.readFileSync(path.join(root,rel),'utf8');}
let n=0;function test(name,fn){fn();n++;console.log('OK · '+name);}

test('versión central exacta v28.0_prod',()=>{
  const v=read('public/app/version.js');
  assert(v.includes("VERSION = 'v28.0_prod'"));assert(v.includes("VERSION_TEXT = 'ControlEvent v28.0_prod'"));assert(v.includes("VERSION_FILE = 'ControlEvent_v28.0_prod'"));
  const paths=read('server/paths.js');assert(paths.includes("APP_VERSION_LABEL = 'v28.0_prod'"));assert(paths.includes("ZIP_NAME = 'ControlEvent_v28.0_prod.zip'"));
});

test('INFOEVENTO y BACKUP externos usan v28.0_prod',()=>{
  const legacy=read('public/app/legacy/legacy-bundle-before-modules-v30.7.js');
  assert(legacy.includes('ControlEvent_v28.0_prod_INFOEVENTO-'));
  const backup=read('public/modules/excel/backup.js');assert(backup.includes("BACKUP_VERSION_FILE = 'ControlEvent_v28.0_prod'"));
  const routes=read('routes/export.routes.js');assert(routes.includes("BACKUP_VERSION_FILE = 'ControlEvent_v28.0_prod'"));
});

test('identidad interna de Excel usa v28.0_prod',()=>{
  for(const rel of ['public/modules/excel/backup.js','public/modules/excel/graficas-sheet.js','public/modules/excel/resumen-sheet.js','routes/export.routes.js']){
    const s=read(rel);assert(s.includes('v28.0_prod')||s.includes('ControlEvent_v28.0_prod'),rel);
  }
});

test('hardlock final de versión se carga al final',()=>{
  const html=read('public/index.html');const detail=html.lastIndexOf('v28-0-prod-detail-globes.js'),hard=html.lastIndexOf('v28-0-prod-version-hardlock.js');assert(detail>0&&hard>detail);
});

test('globo comprado expande ticket completo aunque cruce destinos',()=>{
  const code=read('public/app/features/v28-0-prod-detail-globes.js');
  const sandbox={window:{addEventListener(){},ControlEventApp:{}},document:{readyState:'loading',addEventListener(){},getElementById(){return null;}},MutationObserver:function(){this.disconnect=()=>{};this.observe=()=>{};},Intl,console,setTimeout,clearTimeout};
  sandbox.window.window=sandbox.window;sandbox.window.document=sandbox.document;sandbox.window.MutationObserver=sandbox.MutationObserver;sandbox.window.setTimeout=setTimeout;sandbox.window.clearTimeout=clearTimeout;
  vm.createContext(sandbox);vm.runInContext(code,sandbox);
  const api=sandbox.window.ControlEventV280CompleteTicketGraphDetails;assert(api);
  const all=[
    {kind:'comprado',tienda:'ALMACEN',ticket:'TK05',destino:'CUBATAS',total:90},
    {kind:'comprado',tienda:'ALMACEN',ticket:'TK05',destino:'COMIDA',total:20},
    {kind:'comprado',tienda:'ALMACEN',ticket:'TK06',destino:'CUBATAS',total:10},
    {kind:'comprado',tienda:'OTRA',ticket:'TK05',destino:'CUBATAS',total:7}
  ];
  const seed=all.filter(r=>r.destino==='CUBATAS'&&r.tienda==='ALMACEN');
  const expanded=api.expandCompletePurchasedTickets(seed,all);
  assert.equal(expanded.length,3);assert.equal(expanded.reduce((s,r)=>s+r.total,0),120);assert(expanded.some(r=>r.destino==='COMIDA'));
});

test('Zuzu tiene timeline bancario exacto de fechas del evento',()=>{
  const s=read('services/event-ai.service.js');
  assert(s.includes("v26Table('event_window_timeline'"));assert(s.includes('event_window_movement_count'));assert(s.includes('v280BankEventWindowRequest'));
  assert(s.includes("if(trim(t?.key)==='kpis')continue"));
});

test('petición gráfica completa obliga dossier + banco',()=>{
  const s=read('services/event-ai.service.js');assert(s.includes('v280BroadGraphicalEventRequest'));assert(s.includes("missing.push('event_dossier')"));assert(s.includes("missing.push('event_bank')"));
});

test('no quedan versiones activas 1.1/1.4/1.5 en public salvo migración histórica',()=>{
  const bad=[];
  function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory()){if(ent.name==='node_modules')continue;walk(p);}else if(/\.(js|html|json|css)$/.test(ent.name)){const rel=path.relative(root,p).replace(/\\/g,'/');if(rel==='public/app/version.js')continue;const s=fs.readFileSync(p,'utf8');if(/v27_prod_1\.(1|4|5)|ControlEvent[_ ]v27_prod_1\.(1|4|5)/.test(s))bad.push(rel);}}}
  walk(path.join(root,'public'));assert.deepEqual(bad,[]);
});
console.log(`OK ${n} pruebas v28.0_prod`);
