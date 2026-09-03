const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const ai=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
let ok=0,bad=0;const t=(n,c,d='')=>{if(c){ok++;console.log('OK ',n)}else{bad++;console.error('KO ',n,d)}};
function slice(src,a,b){const i=src.indexOf(a),j=src.indexOf(b,i+a.length);if(i<0||j<0)throw Error(`slice ${a} -> ${b}`);return src.slice(i,j)}

// Contratos añadidos a raíz de la conversación real 03/09/2026.
t('compras publica agrupación completa por Responsable',ai.includes("v26Table('by_responsible',`Compras por Responsable"));
t('compras expone responsable principal certificado',ai.includes('top_responsible:trim(topResponsible.Responsable)')&&ai.includes('top_responsible_amount:v26Money(topResponsible.Importe)'));
t('dataset responsable evita derivar desde muestra',ai.includes('by_responsible agrega el conjunto completo por Responsable'));
t('memoria read sin índice selecciona primer candidato',ai.includes("if(!idx&&action==='read'&&candidates.length)idx=1"));
t('memoria summarize conserva episodio seleccionado',ai.includes("action==='summarize'&&trim(selected?.conversation_id)"));
t('instrucción distingue personas de compare_events',ai.includes('Comparar PERSONAS no es compare_events'));
t('instrucción exige dos eventos en compare_events',ai.includes('compare_events necesita dos eventos'));
t('instrucción manda analizar dataset, no charla libre',ai.includes('usa VIEW operation=analyze sobre ese dataset'));
t('seguimiento CALCULATE conserva operador y cambia campo',ai.includes('conserva last_action.derive_operation')&&ai.includes('no pongas el nombre del campo en operation'));
t('narración protege relaciones aritméticas',ai.includes('Toda comparación mayor/menor debe ser aritméticamente compatible')&&ai.includes('REGLA ARITMÉTICA'));
t('instrucción liquidaciones full para tickets/productos',ai.includes('añade detail=full; CE cruza los TKxx'));
t('instrucción reabre último hecho ante corrección factual',ai.includes('reutiliza last_action y su sujeto'));
t('contexto limpia persona al cambiar a evento/dataset',ai.includes("else if(['event','dataset'].includes(trim(out.focus_type)))out.current_entities=[]"));

// Evalúa el planificador mínimo y el guard estructural con catálogos/historial sintéticos.
try{
  const code=slice(ai,'function vnextP2Workspace','function vnextP2NormalizeCalls');
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const state={
    eventos:[
      {id:'ss',titulo:'Semana Santa 2026 (Resurrección)'},
      {id:'f25',titulo:'FUNCION 2025'},
      {id:'f26',titulo:'FUNCION 2026'}
    ],
    personas:[
      {id:'colty',nombre:'Colty'},
      {id:'cito',nombre:'Cito'},
      {id:'curvas',nombre:'Curvas'},
      {id:'pocholo',nombre:'Pocholo'}
    ]
  };
  const lastFocus=history=>{for(let i=(history||[]).length-1;i>=0;i--){const rc=history[i]?.resultContext||{},entities=Array.isArray(rc.focus_entities)?rc.focus_entities.filter(Boolean):[],type=String(rc.focus_type||'').trim();if(type&&entities.length)return{type,entities,mode:rc.focus_mode||'replace',event:rc.event||'',person:rc.person||''};}return{type:'',entities:[]}};
  const resolveEvent=(st,value,selected='')=>{const q=norm(value);if(!q&&selected){const e=st.eventos.find(x=>x.id===selected);if(e)return e.titulo;}const hits=st.eventos.filter(e=>{const full=norm(e.titulo),short=norm(e.titulo.replace(/\s*\([^)]*\)\s*$/,''));return q&&(full===q||short===q||full.includes(q)||q.includes(short));});if(hits.length===1)return hits[0].titulo;if(!q&&st.eventos.find(x=>x.id===selected))return st.eventos.find(x=>x.id===selected).titulo;throw Error('evento ambiguo');};
  const uniq=calls=>{const out=[],seen=new Set();for(const c of calls||[]){const s=JSON.stringify([c?.name,c?.arguments]);if(!seen.has(s)){seen.add(s);out.push(c)}}return out};
  const ctx={console,Date,Math,JSON,Set,Map,
    trim:v=>v==null?'':String(v).trim(),arr:v=>Array.isArray(v)?v:[],num:v=>Number.isFinite(Number(v))?Number(v):0,
    vnextP17LooseNorm:norm,vnextNorm:norm,
    vnextP1223WorkspaceHint:()=>({current_dataset:{dataset_id:'purchases',key:'purchase_lines',title:'Compras producto a producto · Semana Santa 2026 (Resurrección)',columns:['Producto','Importe','Responsable'],hidden_columns:[],source_operation:'event_purchases',complete:true},visible_datasets:[{dataset_id:'responsables',key:'by_responsible',title:'Compras por Responsable · Semana Santa 2026 (Resurrección)',columns:['Responsable','Importe'],row_count:3,complete:true}]}),
    vnextP119LastStructuredFocus:lastFocus,
    vnextP125ResolveWorkingSet:()=>({dataset_id:'responsables',key:'by_responsible',title:'Compras por Responsable · Semana Santa 2026 (Resurrección)'}),
    vnextP1222LastWorkingSet:()=>({dataset_id:'responsables',key:'by_responsible',title:'Compras por Responsable · Semana Santa 2026 (Resurrección)'}),
    vnextP122NormalizeMemoryCalls:x=>x,
    vnextP13UniqueCalls:uniq,
    vnextP1ResolveEventName:resolveEvent,
    vnextPersonAliasRows:()=>[],
    zuzuTracePush:()=>{},
    capabilityCatalogTextCompact:()=>'',zuzuLoggedUserDisplayName:()=> 'Colty'
  };
  vm.createContext(ctx);vm.runInContext(code+'\nthis.W=vnextP2Workspace;this.T=vnextP2RPlanToCalls;this.R=vnextP2RepairTranslatedCalls;',ctx);

  const hEvent=[{resultContext:{focus_type:'event',focus_entities:['FUNCION 2026'],event:'FUNCION 2026',operation:'event_summary'}}];
  const personClarify=ctx.T({intent:'PERSON',operation:'person_events'},hEvent,[]);
  t('PERSON nunca convierte foco evento en persona',personClarify[0]?.name==='local_response'&&/quién|quien/i.test(personClarify[0]?.arguments?.response||''));

  const memSearch=ctx.T({intent:'MEMORY',operation:'search',entities:['Pocholo']},[],[]);
  t('MEMORY search usa entities cuando target falta',memSearch[0]?.arguments?.query==='Pocholo');

  const session=ctx.T({intent:'CHAT',operation:'session_summary'},[],[]);
  t('session_summary abre memoria de sesión completa',session[0]?.name==='recall_memory'&&session[0]?.arguments?.action==='current');

  const analyze=ctx.T({intent:'VIEW',operation:'analyze'},[],[]);
  t('analyze se traduce a summarize_current narrado',analyze[0]?.arguments?.operation==='summarize_current'&&analyze[0]?.arguments?.narrate===true);

  const hCalc=[{resultContext:{focus_type:'dataset',focus_entities:['Comparativa canónica de eventos'],derive_operation:'MAX',derive_field:'Ingresos'}}];
  const calc=ctx.T({intent:'CALCULATE',operation:'gastos'},hCalc,[]);
  t('seguimiento cálculo inválido hereda operador anterior',calc[0]?.arguments?.derive_operation==='MAX'&&calc[0]?.arguments?.field==='gastos');

  const wrongEvent=[{id:'x',name:'query_ce',arguments:{operation:'event_summary',event:'FUNCION 2026'}}];
  const fixedEvent=ctx.R(wrongEvent,state,'Ponme al día con Semana Santa 2026, sin enrollarte','f26',hEvent,[]);
  t('evento nombrado vence al evento de pantalla',fixedEvent[0]?.arguments?.event==='Semana Santa 2026 (Resurrección)');

  const wrongPerson=[{id:'x',name:'query_ce',arguments:{operation:'event_summary',event:'FUNCION 2026'}}];
  const fixedPerson=ctx.R(wrongPerson,state,'Háblame un poco de Colty','f26',hEvent,[]);
  t('persona explícita corrige event_summary a person_profile',fixedPerson[0]?.arguments?.operation==='person_profile'&&fixedPerson[0]?.arguments?.person==='Colty');

  const hCompareEvents=[
    {resultContext:{focus_type:'event',focus_entities:['Semana Santa 2026 (Resurrección)'],event:'Semana Santa 2026 (Resurrección)',operation:'event_summary'}},
    {resultContext:{focus_type:'event',focus_entities:['FUNCION 2025'],event:'FUNCION 2025',operation:'event_summary'}}
  ];
  const comp=ctx.R([{id:'c',name:'query_ce',arguments:{operation:'compare_events',events:[]}}],state,'Compárala con Semana Santa, pero solo lo importante','f25',hCompareEvents,[]);
  t('compare_events reconstruye dos eventos',comp[0]?.arguments?.events?.length===2&&comp[0].arguments.events.includes('Semana Santa 2026 (Resurrección)')&&comp[0].arguments.events.includes('FUNCION 2025'),JSON.stringify(comp[0]?.arguments));

  const hPeople=[
    {resultContext:{focus_type:'person',focus_entities:['Colty'],current_entities:['Colty'],person:'Colty',operation:'person_profile'}},
    {resultContext:{focus_type:'person',focus_entities:['Cito'],current_entities:['Cito'],person:'Cito',operation:'person_profile'}}
  ];
  const personCompare=ctx.R([{id:'p',name:'query_ce',arguments:{operation:'compare_events'}}],state,'Compárame un poco a los dos', 'f26',hPeople,[]);
  t('comparación de personas se convierte en dos dossiers',personCompare.length===2&&personCompare.every(x=>x.arguments?.operation==='person_profile'&&x.arguments?.narrate===true)&&new Set(personCompare.map(x=>x.arguments.person)).size===2,JSON.stringify(personCompare));

  const hCurvas=[{resultContext:{focus_type:'event',focus_entities:['Semana Santa 2026 (Resurrección)'],event:'Semana Santa 2026 (Resurrección)',operation:'event_summary'}}];
  const curvas=ctx.R([{id:'u',name:'query_ce',arguments:{operation:'person_event_status',person:''}}],state,'Participó Curvas?','f26',hCurvas,[]);
  t('persona en evento toma persona explícita y evento reciente',curvas[0]?.arguments?.person==='Curvas'&&curvas[0]?.arguments?.event==='Semana Santa 2026 (Resurrección)',JSON.stringify(curvas[0]?.arguments));

  const wh=[
    {resultContext:{focus_type:'event',focus_entities:['Semana Santa 2026 (Resurrección)'],event:'Semana Santa 2026 (Resurrección)',operation:'event_summary'}},
    {resultContext:{focus_type:'person',focus_entities:['Colty'],current_entities:['Colty'],person:'Colty',operation:'person_profile'}},
    {resultContext:{focus_type:'event',focus_entities:['FUNCION 2025'],event:'FUNCION 2025',operation:'event_summary'}}
  ];
  const ws=ctx.W(wh,'FUNCION 2026');
  t('workspace expone eventos recientes newest-first',ws.recent_events?.[0]==='FUNCION 2025'&&ws.recent_events?.includes('Semana Santa 2026 (Resurrección)'),JSON.stringify(ws.recent_events));
  t('workspace conserva personas recientes separadas',ws.recent_people?.includes('Colty')&&!ws.recent_people.includes('FUNCION 2025'),JSON.stringify(ws.recent_people));
  t('workspace expone last_action factual',ws.last_action?.operation==='event_summary'&&ws.last_action?.event==='FUNCION 2025',JSON.stringify(ws.last_action));
  t('workspace marca completitud datasets',ws.current_dataset?.complete===true&&ws.visible_datasets?.[0]?.complete===true);
}catch(e){t('ejecución aislada continuidad P2-R',false,e.stack||String(e));}

// Normalizador de memoria aislado.
try{
  const code=slice(ai,'function vnextP122LastMemoryContext','function vnextP126LabelMemoryResult');
  const norm=v=>String(v??'').toLowerCase();
  const ctx={trim:v=>v==null?'':String(v).trim(),arr:v=>Array.isArray(v)?v:[],vnextP1223LastSelectedMemoryEpisode:history=>history?.selected||{},zuzuTracePush:()=>{},Number,Math};
  vm.createContext(ctx);vm.runInContext(code+'\nthis.M=vnextP122NormalizeMemoryCalls;',ctx);
  const hist=[{resultContext:{kind:'memory',memory_candidates:[{conversation_id:'conv-1',turn_id:'t-1',title:'Información de Pocholo'},{conversation_id:'conv-2',turn_id:'t-2',title:'Otro'}]}}];
  const opened=ctx.M([{name:'recall_memory',arguments:{action:'read'}}],hist,[]);
  t('abrir recuerdo sin índice abre el primer match materializado',opened[0]?.arguments?.conversation_id==='conv-1'&&opened[0]?.arguments?.matched_turn_id==='t-1',JSON.stringify(opened));
}catch(e){t('normalizador memoria aislado',false,e.stack||String(e));}

t('package registra FIX8',pkg.scripts?.['test:fix8-dialogue']==='node scripts/v4-1-exp-fix8-natural-dialogue-continuity-regression.cjs');
console.log(`FIX8 NATURAL DIALOGUE CONTINUITY: ${ok} OK · ${bad} KO`);process.exitCode=bad?1:0;
