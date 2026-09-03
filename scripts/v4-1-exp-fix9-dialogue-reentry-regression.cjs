const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),ai=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8'),pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
let ok=0,bad=0;const t=(n,c,d='')=>{if(c){ok++;console.log('OK ',n)}else{bad++;console.error('KO ',n,d)}};
const cut=(a,b)=>{const i=ai.indexOf(a),j=ai.indexOf(b,i+a.length);if(i<0||j<0)throw Error(`${a} -> ${b}`);return ai.slice(i,j)};

t('derive reconoce gastos como Compras realizadas',ai.includes("gastos:['Compras realizadas'"));
t('derive reconoce aliases españoles de métricas',ai.includes("ingresos:['Ingresos'")&&ai.includes("donaciones:['Donaciones valoradas'")&&ai.includes("saldo:['Saldo operativo'"));
t('P2 parser acepta fields=requested_fields',ai.includes("if(['fields','requested_fields'].includes(key))"));
t('PERSON person_purchases se canoniza a person_profile',ai.includes("requestedOp==='person_purchases'?'person_profile'"));
t('person_purchases proyecta solo purchases',ai.includes("extra.requested_fields=['purchases']"));
t('person_profile puede responder solo compras',ai.includes("rf.length===1&&['purchases','compras','gastos'].includes(rf[0])"));
t('memoria read puede reabrir episodio seleccionado',ai.includes("action==='read'&&trim(selected?.conversation_id)")&&ai.includes('MEMORY REOPEN SOURCE'));
t('working set conserva evento/persona de procedencia',ai.includes('event:trim(f?.event||f?.source_event||args?.event)')&&ai.includes('person:trim(f?.person||f?.source_person||args?.person)'));
t('working set marca tabla primaria',ai.includes('primary:i===0'));
t('selector desempata por tabla primaria del mismo origen',ai.includes('source_ref?.primary===true')&&ai.includes('peer.find'));
t('workspace publica last_by_operation',ai.includes('compact.last_by_operation=byOperation'));
t('workspace publica last_comparison',ai.includes("compact.last_comparison&&op==='compare_events'")||ai.includes("!compact.last_comparison&&op==='compare_events'"));
t('planner documenta repeat=true',ai.includes("repeat:{type:'boolean'}")&&ai.includes('pon repeat=true')&&ai.includes('último sujeto de ESA operación'));
t('comparación de personas tiene cierre local certificado',ai.includes('function vnextP2LocalPersonComparison')&&ai.includes('Comparando solo magnitudes equivalentes'));
t('comparación personal evita segunda IA obligatoria',ai.includes('if(vnextP2LocalPersonComparison(results))return false'));
t('repair usa último contexto por operación',ai.includes('vnextP2LastOperationContext(history,op)')&&ai.includes('if(a.repeat===true)'));
t('event malformado separa key=value',ai.includes('function vnextP2ExtractEmbeddedArgs')&&ai.includes('Object.assign(a,embedded.args)'));
t('P2 activa narración factual de preguntas sobre VIEW',ai.includes("trim(args.operation)==='view_current'&&vnextP126NeedsViewNarration(userPrompt)"));
t('liquidaciones closed usan totales closed',ai.includes("if(st==='closed')answer=")&&ai.includes('closed_debe')&&ai.includes('closed_tickets'));

try{
  const src=cut('function vnextP2RScalar','function vnextP2RepairTranslatedCalls');
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const hist=[{resultContext:{focus_type:'person',focus_entities:['Colty'],person:'Colty',operation:'person_profile'}}];
  const ctx={trim:v=>v==null?'':String(v).trim(),arr:v=>Array.isArray(v)?v:[],num:v=>Number.isFinite(Number(v))?Number(v):0,vnextP17LooseNorm:norm,vnextNorm:norm,Date,Math,Set,Map,JSON,
    vnextP119LastStructuredFocus:()=>({type:'person',entities:['Colty']}),vnextP125ResolveWorkingSet:()=>null,vnextP1222LastWorkingSet:()=>null,vnextP122NormalizeMemoryCalls:x=>x,vnextP13UniqueCalls:x=>x,zuzuTracePush:()=>{}};
  vm.createContext(ctx);vm.runInContext(src+'\nthis.P=vnextP2RParseArgs;this.T=vnextP2RPlanToCalls;this.E=vnextP2ExtractEmbeddedArgs;',ctx);
  const args=ctx.P('fields=purchases; repeat=true; detail=full');
  t('parser runtime fields→requested_fields',JSON.stringify(args.requested_fields)==='["purchases"]'&&args.repeat===true&&args.detail==='full',JSON.stringify(args));
  const pp=ctx.T({intent:'PERSON',operation:'person_purchases',entities:['Colty']},hist,[]);
  t('runtime person_purchases→person_profile',pp[0]?.arguments?.operation==='person_profile'&&pp[0]?.arguments?.person==='Colty'&&pp[0]?.arguments?.requested_fields?.[0]==='purchases',JSON.stringify(pp));
  const emb=ctx.E('Semana Santa 2026 (Resurrección) - detail=full');
  t('runtime separa detail=full del nombre evento',emb.text==='Semana Santa 2026 (Resurrección)'&&emb.args.detail==='full',JSON.stringify(emb));
}catch(e){t('runtime parser/translator FIX9',false,e.stack||String(e));}

try{
  const src=cut('function vnextP2RecentEvents','function vnextP2NormalizeCalls');
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const state={eventos:[{id:'ss',titulo:'Semana Santa 2026 (Resurrección)'},{id:'f25',titulo:'FUNCION 2025'},{id:'f26',titulo:'FUNCION 2026'}],personas:[{id:'c',nombre:'Colty'}]};
  const hist=[
    {resultContext:{focus_type:'event',focus_entities:['Semana Santa 2026 (Resurrección)'],event:'Semana Santa 2026 (Resurrección)',operation:'event_bank'}},
    {resultContext:{focus_type:'event',focus_entities:['FUNCION 2026'],event:'FUNCION 2026',operation:'event_summary'}}
  ];
  const resolve=(st,v)=>{const q=norm(v),h=st.eventos.find(e=>norm(e.titulo)===q||norm(e.titulo.replace(/\s*\([^)]*\)\s*$/,''))===q);if(!h)throw Error('bad event');return h.titulo};
  const ctx={trim:v=>v==null?'':String(v).trim(),arr:v=>Array.isArray(v)?v:[],vnextNorm:norm,vnextP17LooseNorm:norm,vnextP1ResolveEventName:resolve,vnextP119LastStructuredFocus:()=>({type:'event',entities:['FUNCION 2026']}),vnextP2CatalogMentions:()=>[],vnextPersonAliasRows:()=>[],vnextP13UniqueCalls:x=>x,zuzuTracePush:()=>{},vnextP2RScalar:v=>{const x=String(v??'').trim();if(/^(true|false)$/i.test(x))return x.toLowerCase()==='true';if(/^-?\d+(?:\.\d+)?$/.test(x))return Number(x);return x;},Number,Math,Set,Map,JSON};
  vm.createContext(ctx);vm.runInContext(src+'\nthis.R=vnextP2RepairTranslatedCalls;',ctx);
  const badEvent=ctx.R([{name:'query_ce',arguments:{operation:'event_liquidations',event:'Semana Santa 2026 (Resurrección) - detail=full'}}],state,'Si la hubiera, dime tickets y productos','f26',hist,[]);
  t('repair runtime recupera evento y detail full',badEvent[0]?.arguments?.event==='Semana Santa 2026 (Resurrección)'&&badEvent[0]?.arguments?.detail==='full',JSON.stringify(badEvent));
  const repeat=ctx.R([{name:'query_ce',arguments:{operation:'event_bank',event:'FUNCION 2026',repeat:true}}],state,'dime otra vez cómo quedó el banco','f26',hist,[]);
  t('repeat runtime vuelve al último banco, no al evento reciente',repeat[0]?.arguments?.event==='Semana Santa 2026 (Resurrección)'&&!('repeat' in repeat[0].arguments),JSON.stringify(repeat));
}catch(e){t('runtime repair FIX9',false,e.stack||String(e));}

try{
  const src=cut('function vnextP1223EditSimilarity','function vnextP125MentionedWorkingSets');
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const list=[
    {dataset_id:'d:purchase_lines',key:'purchase_lines',title:'Compras producto a producto · Semana Santa 2026 (Resurrección)',base_columns:['Producto','Importe'],source_operation:'event_purchases',source_ref:{event:'Semana Santa 2026 (Resurrección)',primary:true}},
    {dataset_id:'d:by_product',key:'by_product',title:'Compras agrupadas por producto · Semana Santa 2026 (Resurrección)',base_columns:['Producto','Importe'],source_operation:'event_purchases',source_ref:{event:'Semana Santa 2026 (Resurrección)',primary:false}},
    {dataset_id:'d:by_responsible',key:'by_responsible',title:'Compras por Responsable · Semana Santa 2026 (Resurrección)',base_columns:['Responsable','Importe'],source_operation:'event_purchases',source_ref:{event:'Semana Santa 2026 (Resurrección)',primary:false}}
  ];
  const ctx={trim:v=>v==null?'':String(v).trim(),arr:v=>Array.isArray(v)?v:[],vnextP17LooseNorm:norm,vnextNorm:norm,vnextP125RecentWorkingSets:()=>list,Math};
  vm.createContext(ctx);vm.runInContext(src+'\nthis.R=vnextP125ResolveWorkingSet;',ctx);ctx.vnextP125RecentWorkingSets=()=>list;
  const got=ctx.R([],{},'Vuelve a las compras de Semana Santa 2026 que vimos antes');
  t('reentrada dataset amplia elige tabla primaria',got?.key==='purchase_lines',JSON.stringify(got));
}catch(e){t('runtime reentrada dataset FIX9',false,e.stack||String(e));}

try{
  const src=cut('function vnextP122LastMemoryContext','function vnextP126LabelMemoryResult');
  const ctx={trim:v=>v==null?'':String(v).trim(),arr:v=>Array.isArray(v)?v:[],vnextP1223LastSelectedMemoryEpisode:()=>({conversation_id:'conv-pocholo',matched_turn_id:'t1',title:'Información de Pocholo'}),zuzuTracePush:()=>{},Number,Math};
  vm.createContext(ctx);vm.runInContext(src+'\nthis.M=vnextP122NormalizeMemoryCalls;',ctx);
  const out=ctx.M([{name:'recall_memory',arguments:{action:'read'}}],[{resultContext:{kind:'data',operation:'event_summary'}}],[]);
  t('reabrir Pocholo tras cambiar de tema reutiliza selección',out[0]?.arguments?.conversation_id==='conv-pocholo'&&out[0]?.arguments?.matched_turn_id==='t1',JSON.stringify(out));
}catch(e){t('runtime memory reentry FIX9',false,e.stack||String(e));}

t('package registra FIX9',pkg.scripts?.['test:fix9-dialogue']==='node scripts/v4-1-exp-fix9-dialogue-reentry-regression.cjs');
console.log(`FIX9 DIALOGUE REENTRY: ${ok} OK · ${bad} KO`);process.exitCode=bad?1:0;
