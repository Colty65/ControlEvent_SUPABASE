const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const ai=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8');
const lab=fs.readFileSync(path.join(root,'services/zuzu-test-lab.service.js'),'utf8');
const reg=fs.readFileSync(path.join(root,'services/zuzu-capability-registry.service.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'public/app/features/zuzu-test-console-gd.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
let ok=0,bad=0; function t(n,c,d=''){if(c){ok++;console.log('OK ',n)}else{bad++;console.error('KO ',n,d)}}
function sliceFn(src,name,next){const a=src.indexOf('function '+name);if(a<0)throw Error('missing '+name);const b=src.indexOf('\nfunction '+next,a+1);if(b<0)throw Error('missing next '+next);return src.slice(a,b);}
function extractFunction(src,name){const re=new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`),m=re.exec(src);if(!m)throw Error('missing '+name);const i=m.index;let p=src.indexOf('(',i),pd=0,q='',esc=false,body=-1;for(let j=p;j<src.length;j++){const c=src[j];if(q){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===q)q='';continue;}if(c==='"'||c==="'"||c==='`'){q=c;continue;}if(c==='(')pd++;else if(c===')'&&--pd===0){body=src.indexOf('{',j);break;}}let dep=0;q='';esc=false;for(let j=body;j<src.length;j++){const c=src[j];if(q){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===q)q='';continue;}if(c==='"'||c==="'"||c==='`'){q=c;continue;}if(c==='{')dep++;else if(c==='}'&&--dep===0)return src.slice(i,j+1);}throw Error('incomplete '+name)}
const arr=v=>Array.isArray(v)?v:[],trim=v=>v==null?'':String(v).trim(),norm=v=>trim(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();

t('provider P1.26',ai.includes("provider:'zuzu-vnext-p126-natural-compound-dialogue'"));
t('arquitectura P1.26',ai.includes('VNext P1.26 · datasets visibles múltiples'));
t('JSON LIGHT P1.26',ui.includes("reportFormat:'LIGHT-P126'"));
t('cache bust P1.26',html.includes('20260902-VNEXT-P126-NATURAL-COMPOUND-DIALOGUE-NHC'));
t('registry vista ya no publica order_by',!reg.match(/const VIEW=\[[^\]]*order_by/));
t('event_purchases conserva order_by',/event_purchases:def\([^\n]+order_by/.test(reg));

// Legacy order_by is repaired to canonical view_sort before audit.
{
 const s={arr,trim,vnextP110ResolveColumn:(cols,q)=>cols.find(c=>norm(c)===norm(q))||'',vnextP110NormalizeViewFilters:v=>arr(v),vnextP110NormalizeViewSort:v=>arr(v).map(x=>({field:x.field,direction:x.direction==='desc'?'desc':'asc'}))}; vm.createContext(s); vm.runInContext(extractFunction(ai,'vnextP125CanonicalDecisionForWorkingSet'),s);
 const got=s.vnextP125CanonicalDecisionForWorkingSet({base_columns:['Fecha','Resumen']},{operation:'view_current',order_by:'Fecha:desc'});
 t('order_by Fecha:desc se repara a view_sort',!('order_by' in got)&&got.view_sort?.[0]?.field==='Fecha'&&got.view_sort[0].direction==='desc',JSON.stringify(got));
}

// Explicit mixed prompt repairs omitted model mechanics and detects unavailable columns.
{
 const s={arr,trim,vnextP17LooseNorm:norm,vnextP110MentionedColumns:(p,cols)=>cols.filter(c=>norm(p).includes(norm(c))),vnextP110ResolveColumn:(cols,q)=>cols.find(c=>norm(c)===norm(q))||'',vnextP16MergeUniqueText:(a,b)=>[...new Set([...a,...b])],vnextP1223ColumnLabels:(ws,ids)=>ids.map(id=>ws.column_catalog?.find(c=>c.id===id)?.label||id)}; vm.createContext(s); vm.runInContext(sliceFn(ai,'vnextP126RequestedColumnRefs','vnextP126RepairExplicitViewIntent'),s); vm.runInContext(sliceFn(ai,'vnextP126RepairExplicitViewIntent','vnextP126NeedsViewNarration'),s); vm.runInContext(sliceFn(ai,'vnextP126NeedsViewNarration','vnextP125RepairRowValueRequests'),s);
 const ws={base_columns:['Fecha','Pregunta','Respuesta','Resumen','Coincidencia'],view_state:{visible_columns:['resumen']},column_catalog:[{id:'resumen',label:'Resumen'}]};
 const prompt="Me gustaría ver las otras columnas también, las de 'fecha' y 'Conversación ID'. Y ordena las filas por fecha, de más reciente a más antigua. ¿Qué pasó al final con Manolo?";
 const got=s.vnextP126RepairExplicitViewIntent(ws,{operation:'view_current',visible_columns:['Resumen']},prompt);
 t('petición explícita recupera Fecha aunque Gemini la omita',got.visible_columns.includes('Fecha')&&got.visible_columns.includes('Resumen'),JSON.stringify(got));
 t('columna inexistente se detecta sin romper el resto',got._unavailable_columns.includes('Conversación ID'),JSON.stringify(got));
 t('orden reciente→antigua queda desc',got.view_sort?.[0]?.field==='Fecha'&&got.view_sort[0].direction==='desc',JSON.stringify(got));
 t('pregunta factual mezclada exige narración',s.vnextP126NeedsViewNarration(prompt)===true);
 t('pregunta puramente mecánica no exige narración',s.vnextP126NeedsViewNarration('¿Puedes ordenar la tabla por Fecha?')===false);
}

t('view_current no recibe segunda aplicación de vista',ai.includes("if(!['view_current','summarize_current'].includes(trim(args?.operation)))result=vnextP110ApplyTableView"));
t('view_current mixto activa narrate internamente',ai.includes("trim(args?.operation)==='view_current'&&vnextP126NeedsViewNarration(userPrompt)"));
t('vista limpia args de memoria heredados',ai.includes("const allowed=op==='view_current'?")&&ai.includes("'dataset_id','table_key','visible_columns'"));
t('memoria etiqueta cada episodio con título candidato',ai.includes('a._memory_title=trim(c?.title)')&&ai.includes("Conversación recordada'} · ${trim(args._memory_title)}`"));
t('contexto conserva datasets de todos los resultados del turno',/for\(const x of good\).*vnextP125WorkingSetsFromResult/s.test(extractFunction(ai,'vnextP1222ContextFromResults')));
t('simulador conoce orden materializado',lab.includes('viewSort:sort')&&ai.includes('orden=${sort.join'));
t('simulador no inventa columnas',ai.includes('pide columnas que aparezcan en la PRESENTACIÓN REAL'));
t('table_action fuerza requiresTool',ai.includes("['table_action','memory_action'].includes(move)"));

console.log(`P1.26 NATURAL COMPOUND DIALOGUE: ${ok} OK · ${bad} KO`); process.exitCode=bad?1:0;
