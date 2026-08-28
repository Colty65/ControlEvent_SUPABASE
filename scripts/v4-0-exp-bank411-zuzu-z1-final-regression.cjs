const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('services/event-ai.service.js','utf8');
const lab=fs.readFileSync('services/zuzu-test-lab.service.js','utf8');
const ledger=fs.readFileSync('services/zuzu-conversation-ledger.service.js','utf8');
const ui=fs.readFileSync('public/app/features/zuzu-test-console-gd.js','utf8');
const html=fs.readFileSync('public/index.html','utf8');

function extractFunction(name){
  const start=src.indexOf(`function ${name}(`); if(start<0)throw new Error(`No encuentro ${name}`);
  const p0=src.indexOf('(',start); let pd=0,quote='',esc=false,close=-1;
  for(let i=p0;i<src.length;i++){const c=src[i];if(quote){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===quote)quote='';continue;}if(c==='"'||c==="'"||c==='`'){quote=c;continue;}if(c==='(')pd++;else if(c===')'&&--pd===0){close=i;break;}}
  const brace=src.indexOf('{',close); let depth=0; quote=''; esc=false;
  for(let i=brace;i<src.length;i++){const c=src[i];if(quote){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===quote)quote='';continue;}if(c==='"'||c==="'"||c==='`'){quote=c;continue;}if(c==='{')depth++;else if(c==='}'&&--depth===0)return src.slice(start,i+1);}
  throw new Error(`Función incompleta ${name}`);
}
const helpers=`
const text=v=>v==null?'':String(v);const trim=v=>text(v).trim();const arr=v=>Array.isArray(v)?v:[];
const norm=v=>{const s=text(v);return (s.normalize?s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,''):s).toLowerCase().trim();};
const zuzuTracePush=()=>{};const escapeRegexText=s=>text(s);
const v73PrimaryDomain=q=>trim(q?.targets?.[0]?.domain);const v410BestExactTypedCandidate=(c,t)=>arr(c?.typed?.[t]).find(x=>['exact','strong'].includes(trim(x?.match_type)))||null;
const v73NormalizeOperations=x=>arr(x).map(y=>({...y}));
`;
const code=[helpers,
  extractFunction('v26ParseLocalizedDisplayNumber'),extractFunction('v26FormatEuro'),extractFunction('v26FormatNarrativeMoney'),
  extractFunction('v73NormalizeScope'),extractFunction('v79RecoverCanonicalId'),extractFunction('v79RepairComparisonFollowup'),
  extractFunction('v411RepairExactEventBroadQuery'),extractFunction('v411RepairSpecificTicketLiteral'),extractFunction('v411RepairMasterCatalogIntent'),
  extractFunction('v411DonationStatusOperation'),extractFunction('v411RepairDonationDeliveryContract'),extractFunction('v411InheritCurrentSubset'),
  extractFunction('v411MemoryOrdinalIntent'),extractFunction('v411MemoryFollowupIntent'),extractFunction('v411MemoryExpandedDetailIntent'),
  'return {v26FormatNarrativeMoney,v73NormalizeScope,v79RecoverCanonicalId,v79RepairComparisonFollowup,v411RepairExactEventBroadQuery,v411RepairSpecificTicketLiteral,v411RepairMasterCatalogIntent,v411RepairDonationDeliveryContract,v411InheritCurrentSubset,v411MemoryOrdinalIntent,v411MemoryFollowupIntent,v411MemoryExpandedDetailIntent};'
].join('\n');
const F=new Function(code)();
let n=0;function ok(cond,msg){assert.ok(cond,msg);n++;console.log(`OK ${n}: ${msg}`);}function eq(a,b,msg){assert.deepStrictEqual(a,b,msg);n++;console.log(`OK ${n}: ${msg}`);}

ok(src.includes("minScore=type==='event'?0.88:0.72"),'EVENT exige umbral semántico fuerte; no nearest-match permisivo');
const rows=[{id:'id-abcdefghijklmnop',titulo:'Evento A'},{id:'id-zzzzzzzzzzzzzzzz',titulo:'Evento B'}];
eq(F.v79RecoverCanonicalId(rows,'id-abcdefghijklmnop').id,'id-abcdefghijklmnop','ID canónico exacto se conserva');
eq(F.v79RecoverCanonicalId(rows,'id-abcdefghijklmnopXXXX').id,'id-abcdefghijklmnop','ID Gemini con sufijo solo recupera prefijo único literal');
eq(F.v79RecoverCanonicalId(rows,'id-noexiste-123456789'),null,'ID inexistente no se convierte en otro evento');

eq(F.v73NormalizeScope({kind:'events',year:2026}),{kind:'year',year:2026},'events+year normaliza a scope temporal year');

const cmp=F.v79RepairComparisonFollowup({action:'query',response_kind:'compare',query:{targets:[{domain:'purchases'}],scope:{kind:'named_events',events:['A','B']},operations:[{type:'sort',field:'Importe',direction:'desc'}]}},{last_intent:{domains:[]}},[]);
eq(cmp.query.targets,[{domain:'comparison'}],'comparación de compras multievento usa dominio comparison');
eq(cmp.query.comparison_metric,'purchases','comparación de compras fija métrica monetaria purchases');
eq(cmp.query.operations,[],'comparación elimina sort de filas crudas antes del agregado por evento');

const exactCandidates={typed:{EVENT:[{match_type:'exact',matched_text:'Ingresos y Gastos extraordinarios 2026',canonical_name:'Ingresos y Gastos extraordinarios 2026'}]}};
const broad=F.v411RepairExactEventBroadQuery({action:'query',response_kind:'table',query:{targets:[{domain:'purchases'}],scope:{kind:'named_event',event:'Ingresos y Gastos extraordinarios 2026'}}},'Háblame de Ingresos y Gastos extraordinarios 2026.',exactCandidates,[]);
eq(broad.query.targets,[{domain:'event_summary'}],'palabras Ingresos/Gastos dentro del título no secuestran el dominio');
eq(broad.response_kind,'summary','pregunta general de evento vuelve a resumen');
const modular=F.v411RepairExactEventBroadQuery({action:'query',query:{targets:[{domain:'purchases'}],scope:{kind:'named_event',event:'Ingresos y Gastos extraordinarios 2026'}}},'¿Qué compras hubo en Ingresos y Gastos extraordinarios 2026?',exactCandidates,[]);
eq(modular.query.targets,[{domain:'purchases'}],'petición modular explícita de compras no se convierte en dossier general');

const tk=F.v411RepairSpecificTicketLiteral({action:'query',query:{targets:[{domain:'event_summary'}],scope:{kind:'named_event',event:'FUNCION 2025'}}},'Háblame del TK21 de FUNCION 2025.',[]);
eq(tk.query.targets,[{domain:'documentation'}],'TKxx literal fuerza dominio documentation');
eq(tk.query.ticket,'TK21','TKxx literal conserva ticket concreto');
eq(tk.query.documentation_metric,'ticket_detail','TKxx concreto usa métrica ticket_detail');
ok(tk.query.operations.some(x=>x.field==='TKxx'&&x.value==='TK21'),'TKxx concreto añade filtro exacto al dataset documental');

const cat=F.v411RepairMasterCatalogIntent({action:'query',query:{targets:[{domain:'products'}],scope:{kind:'all_events'}}},'Repasa la tabla general de productos.',{typed:{EVENT:[]}},[]);
eq(cat.query.targets,[{domain:'catalog_products'}],'tabla general de productos usa maestro catalog_products');
eq(cat.query.operations,[],'catálogo maestro elimina transformaciones operativas residuales');

const donated=F.v411RepairDonationDeliveryContract({action:'query',query:{targets:[{domain:'donations'}],scope:{kind:'named_event',event:'X'}}},'¿Qué productos donados tenemos ya físicamente?',{},[]);
eq(donated.query.donation_delivery_statuses,['Entregada'],'físicamente disponible = Entregada');
const missing=F.v411RepairDonationDeliveryContract({action:'query',query:{targets:[{domain:'donations'}],scope:{kind:'named_event',event:'X'}}},'¿Qué donaciones faltan por llegar físicamente?',{},[]);
eq(missing.query.donation_delivery_statuses,['Supuesta','Comprometida'],'no recibido físicamente = Supuesta+Comprometida');
const inherited=F.v411RepairDonationDeliveryContract({action:'query',query:{targets:[{domain:'donations'}],scope:{kind:'named_event',event:'X'}}},'¿Quién se encarga de esas?',{dataset:{domain:'donations'},view:{rowFilters:[{field:'Situación entrega',operator:'one_of',values:['Supuesta','Comprometida']}]}},[]);
eq(inherited.query.donation_delivery_statuses,['Supuesta','Comprometida'],'«esas» hereda subconjunto físico vivo de donaciones');

const subset=F.v411InheritCurrentSubset({action:'query',query:{targets:[{domain:'purchases'}],scope:{kind:'named_event',event:'X'},operations:[{type:'sort',field:'Importe',direction:'desc'},{type:'limit',limit:1}]}},{dataset:{domain:'purchases',scope:{kind:'named_event',event:'X'},provenance:{source_args:{frame:{filters:{purchase_status:'pending',purchase_statuses:['pending']}}}}}},[]);
eq(subset.query.purchase_statuses,['pending'],'máximo/ranking hereda compras pendientes del DATASET actual');

const narrative='La FUNCION 2026 está En curso. El precio por socio es de 180. Los ingresos totales son de 6410, con 4290 recibidos y 2120 pendientes. Los gastos previstos son de 5892.23, de los cuales se han realizado 81.38 y quedan 5810.85 pendientes. El valor de las donaciones es de 820.88. El saldo operativo es de 517.77 y la valoración del evento es de 6713.11. Hay 34 asistentes canónicos.';
const eur=F.v26FormatNarrativeMoney(narrative,[]);
for(const money of ['180,00 €','6.410,00 €','4.290,00 €','2.120,00 €','5.892,23 €','81,38 €','5.810,85 €','820,88 €','517,77 €','6.713,11 €'])ok(eur.includes(money),`formato EUR tipado incluye ${money}`);
ok(eur.includes('34 asistentes')&&!eur.includes('34,00 € asistentes'),'asistentes siguen siendo recuento, no euros');
eq(F.v26FormatNarrativeMoney('Ingresos 7941 EUR; saldo 5565 €.',[]),'Ingresos 7.941,00 €; saldo 5.565,00 €.','importe ya marcado no se procesa dos veces');

ok(src.includes("response_mode:'local_authoritative_fallback'")&&src.includes('FALLBACK AUTORITATIVO'),'JSON Gemini inválido conserva respuesta canónica local');
ok(src.includes('v411RepairSpecificTicketLiteral(normalizedPlan,userPrompt,flowTrace)'),'reparación TKxx está en la tubería activa');
ok(src.includes('v411RepairMasterCatalogIntent(normalizedPlan,userPrompt,entityCandidates,flowTrace)'),'reparación catálogo maestro está en la tubería activa');
ok(src.includes('v411RepairDonationDeliveryContract(normalizedPlan,userPrompt,session,flowTrace)'),'contrato físico de donaciones está en la tubería activa');
ok(src.includes('v411InheritCurrentSubset(normalizedPlan,session,flowTrace)'),'subconjunto vivo está en la tubería activa');

eq(F.v411MemoryOrdinalIntent('Recuérdame nuestra primera conversación.'),{order:'oldest',index:1,label:'primera'},'memoria entiende primera conversación como episodio más antiguo');
eq(F.v411MemoryOrdinalIntent('¿Cuál fue nuestra penúltima charla?'),{order:'newest',index:2,label:'penúltima'},'memoria entiende penúltima conversación desde el extremo reciente');
ok(F.v411MemoryFollowupIntent('Y DE QUÉ HABLAMOS?'),'follow-up «de qué hablamos» permanece en el episodio histórico activo');
ok(F.v411MemoryFollowupIntent('JODER, PUES DÁMELOS'),'follow-up coloquial «dámelos» permanece en el episodio histórico activo');
ok(F.v411MemoryExpandedDetailIntent('JODER, PUES DÁMELOS'),'«dámelos» pide expansión literal/completa del episodio');
ok(F.v411MemoryExpandedDetailIntent('Y de qué hablamos? Estírate un poquito, Zuzu.'),'«estírate» amplía el recuerdo a conversación sustancial completa');
ok(ledger.includes('memoryConversationOrdinalIntent')&&ledger.includes('memoryOrdinalConversationItems'),'ledger ordena episodios por ordinal temporal real');
ok(ledger.includes("cid===trim(conversationId)")&&ledger.includes('ordinal_rank:i+1'),'la memoria ordinal excluye la conversación actual y etiqueta el rango');
ok(src.includes('MEMORIA ORDINAL DIRECTA')&&src.includes("v411LocalCompiledReference(ordinalMemoryCandidate.ref,'recall_episode'"),'primera/segunda/última conversación evita recompilación Gemini insegura');
ok(src.includes('FOLLOW-UP DE RECUERDO')&&src.includes("v411LocalCompiledReference('CURRENT','recall_episode'"),'los follow-ups del recuerdo se anclan a CURRENT como envoltorio histórico');
ok(src.includes("nested?.action||nested?.reference_action||a?.reference_action"),'ce_reference acepta compatibilidad action/reference_action anidada sin perder la acción');
ok(src.includes("data_provenance:'HISTORICAL_EPISODE'")&&src.includes('v75MemoryEpisodeOutline(episode,{full:false})'),'recall_episode devuelve el episodio sustancial, no un resumen vacío de la charla actual');

ok(lab.includes('promptNorm=norm(caseDef?.prompt)')&&!lab.includes('promptNorm=norm(c?.prompt)'),'oráculo Banco elimina ReferenceError c is not defined');
ok(lab.includes("oracle.kind==='event-summary'")&&lab.includes('afirma ausencia de datos canónicos'),'oráculo evento convierte falsos OK «no hay datos» en KO');
ok(lab.includes("oracle.kind==='purchase-presence'")&&lab.includes('no materializa el conjunto canónico'),'Z1 TODOS comprueba que compras reales no desaparezcan');
ok(lab.includes("oracle.kind==='donation-status'")&&lab.includes('no conserva filtro físico'),'oráculo donaciones valida estados físicos, no solo evento');
ok(lab.includes('requireResponsible')&&lab.includes('subconjunto «esas»'),'oráculo valida responsable/donante del subconjunto referido');
ok(lab.includes('tienda sin compras: se ha desviado al dominio persona'),'oráculo tienda cero rechaza desvío a PERSON');
ok(lab.includes('donations_supposed_count')&&lab.includes("toolTable(r,'donation_lines')"),'donationOracle usa contadores físicos y filas canónicas');

ok(ui.includes("ITV_BUILD='20260828-BANK411-Z1-FINAL-ORACLE-EUR-FAILSAFE'"),'UI exporta build BANK4_11');
ok(html.includes('controlevent-build" content="20260828-V4_0_EXP-BANK411-Z1-FINAL-ORACLE-EUR-FAILSAFE'),'build general BANK4_11');
ok(html.includes('zuzu-test-console-gd.js?v=20260828-BANK411-Z1-FINAL-ORACLE-EUR-FAILSAFE'),'cache-bust BANK4_11');
ok(!ui.includes('20260828-BANK410-Z1-CLOSURE-SAFEFASTLOCAL-EUR')&&!html.includes('20260828-BANK410-Z1-CLOSURE-SAFEFASTLOCAL-EUR'),'BANK410 no queda activo en UI/index');
console.log(`BANK4_11 Z1 FINAL / ORACLE / EUR / FAILSAFE: ${n}/${n} OK`);
