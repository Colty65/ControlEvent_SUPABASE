const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const ai=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'public/app/features/zuzu-test-console-gd.js'),'utf8');
const lab=fs.readFileSync(path.join(root,'services/zuzu-test-lab.service.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
let ok=0,bad=0; function t(n,c,d=''){if(c){ok++;console.log('OK ',n)}else{bad++;console.error('KO ',n,d)}}
const arr=v=>Array.isArray(v)?v:[],trim=v=>v==null?'':String(v).trim(),norm=v=>trim(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
function extractFunction(src,name){const re=new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`),m=re.exec(src);if(!m)throw Error('missing '+name);const i=m.index;let p=src.indexOf('(',i),pd=0,q='',esc=false,body=-1;for(let j=p;j<src.length;j++){const c=src[j];if(q){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===q)q='';continue;}if(c==='"'||c==="'"||c==='`'){q=c;continue;}if(c==='(')pd++;else if(c===')'&&--pd===0){body=src.indexOf('{',j);break;}}let dep=0;q='';esc=false;for(let j=body;j<src.length;j++){const c=src[j];if(q){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===q)q='';continue;}if(c==='"'||c==="'"||c==='`'){q=c;continue;}if(c==='{')dep++;else if(c==='}'&&--dep===0)return src.slice(i,j+1);}throw Error('incomplete '+name)}
function runFns(names,extra={}){const ctx={arr,trim,vnextP17LooseNorm:norm,...extra};vm.createContext(ctx);for(const n of names)vm.runInContext(extractFunction(ai,n),ctx);return ctx;}
function sliceFn(src,name,next){const a=src.indexOf(`function ${name}`),b=src.indexOf(`function ${next}`,a+1);if(a<0||b<0)throw Error(`slice missing ${name} -> ${next}`);return src.slice(a,b).trim();}

t('provider P1.27',ai.includes("provider:'zuzu-vnext-p127-natural-visible-content-dialogue'"));
t('arquitectura P1.27',ai.includes('VNext P1.27 · contenido visible narrable'));
t('JSON LIGHT P1.27',ui.includes("reportFormat:'LIGHT-P127'"));
t('language build P1.27',ui.includes("20260902-P127-NATURAL-VISIBLE-CONTENT-DIALOGUE-NHC"));
t('cache bust P1.27',html.includes('20260902-VNEXT-P127-NATURAL-VISIBLE-CONTENT-DIALOGUE-NHC'));
t('batería dialogue P1.27',lab.includes("batteryCode:golden?'GOLDEN-P117-110':dialogue?'DIALOGUE-P127-24'"));

// Naming: the battery identity must beat the internal FULL-CERT execution bucket.
t('export naming tiene batteryFileSuffix',ui.includes('function batteryFileSuffix(mode=lastMode)'));
t('DIALOGUE produce dialog-N',ui.includes("return`dialog-${count}`"));
t('PDF usa batteryFileSuffix',/printReport\(\).*suffix=batteryFileSuffix\(mode\)/s.test(ui));
t('JSON usa batteryFileSuffix',/downloadReport\(full=false\).*suffix=batteryFileSuffix\(lastMode\)/s.test(ui));
t('FULL-CERT fallback conserva full-cert',ui.includes("mode==='AI-SMOKE'?'ai-smoke':'full-cert'"));

// Content questions over an already filtered view must narrate visible rows, not answer only presence.
{
 const c=runFns(['vnextP127PresenceQuestion','vnextP126NeedsViewNarration']);
 t('que pone en el resumen NO es presencia',c.vnextP127PresenceQuestion('¿Qué pone exactamente en el resumen de esas dos filas?')===false);
 t('que pone en el resumen exige narración',c.vnextP126NeedsViewNarration('¿Qué pone exactamente en el resumen de esas dos filas?')===true);
 t('pregunta sí/no de presencia sigue siendo presencia',c.vnextP127PresenceQuestion('¿Hay alguna fila que contenga Donación?')===true);
 t('orden mecánico no fuerza narración',c.vnextP126NeedsViewNarration('¿Puedes ordenar la tabla por Fecha?')===false);
}

// Wildcard requested_fields means all columns; it must never become Referencia="*".
{
 const extra={
   vnextP110ResolveColumn:(cols,q)=>cols.find(c=>norm(c)===norm(q))||'',
   vnextP116DefaultLabelField:({columns})=>columns[0]||'',
   vnextP110NormalizeViewFilters:v=>arr(v)
 };
 const c=runFns(['vnextP125RepairRowValueRequests'],extra);
 const got=c.vnextP125RepairRowValueRequests({base_columns:['Referencia','Fecha','Título','Resumen'],base_rows:[],source_operation:'search'},{requested_fields:['*']});
 t('requested_fields=* abre todas las columnas',got.visible_columns?.length===4,JSON.stringify(got));
 t('requested_fields=* no crea filtro artificial',!arr(got.view_filters).length,JSON.stringify(got));
}

// "tabla completa" restores real columns and filters invalid invented columns.
{
 const extra={
   vnextP110MentionedColumns:(p,cols)=>cols.filter(c=>norm(p).includes(norm(c))),
   vnextP110ResolveColumn:(cols,q)=>cols.find(c=>norm(c)===norm(q))||'',
   vnextP16MergeUniqueText:(a,b)=>[...new Set([...a,...b])],
   vnextP1223ColumnLabels:(ws,ids)=>ids.map(id=>ws.column_catalog?.find(c=>c.id===id)?.label||id)
 };
 const c={arr,trim,vnextP17LooseNorm:norm,...extra}; vm.createContext(c); vm.runInContext(sliceFn(ai,'vnextP126RequestedColumnRefs','vnextP126RepairExplicitViewIntent'),c); vm.runInContext(sliceFn(ai,'vnextP126RepairExplicitViewIntent','vnextP127PresenceQuestion'),c);
 const cols=['Referencia','Fecha','Título','Resumen','Mención visible','Conversation ID','Turn ID','Puntuación'];
 const ws={base_columns:cols,view_state:{visible_columns:['fecha','resumen']},column_catalog:cols.map(x=>({id:norm(x).replace(/ /g,'_'),label:x}))};
 let got=c.vnextP126RepairExplicitViewIntent(ws,{operation:'view_current',visible_columns:['Fecha','Resumen','Donación','Asociación']},'Enséñame la tabla completa con TODAS las columnas que tenga.');
 t('tabla completa recupera catálogo real completo',got.visible_columns.length===cols.length&&got.visible_columns.includes('Conversation ID'),JSON.stringify(got));
 t('columnas inventadas se marcan como no disponibles',got._unavailable_columns.includes('Donación')&&got._unavailable_columns.includes('Asociación'),JSON.stringify(got));
 got=c.vnextP126RepairExplicitViewIntent(ws,{operation:'view_current',view_filters:[{field:'Resumen',operator:'contains',value:'Donación'}]},'Olvida lo de antes y enséñame de nuevo la tabla completa; vamos a empezar de cero.');
 t('volver a tabla completa desde cero resetea filtros',got.reset_filters===true,JSON.stringify(got));
}

// Local final should only collapse to "valor: sí/no" for genuine presence questions.
t('local final condiciona presence_checks a pregunta de presencia',ai.includes('checks.length&&presenceOnly'));

console.log(`P1.27 NATURAL VISIBLE CONTENT + ITV NAMES: ${ok} OK · ${bad} KO`); process.exitCode=bad?1:0;
