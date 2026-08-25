const fs=require('fs'),vm=require('vm');
const svc=fs.readFileSync('services/event-ai.service.js','utf8');
const ui=fs.readFileSync('public/app/features/v11-3-zuzu-analitica-libre.js','utf8');
let pass=0,fail=0;function t(name,ok){if(ok){console.log('OK · '+name);pass++;}else{console.error('KO · '+name);fail++;}}
const trim=v=>String(v==null?'':v).trim();
const arr=v=>Array.isArray(v)?v:[];
const norm=v=>trim(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

// PDF 25/08/2026: En curso no equivale a hecho celebrado/cerrado.
t('En curso se declara estado administrativo, no prueba de celebración',/En curso es un estado ADMINISTRATIVO y NO demuestra que la celebración haya sucedido/.test(svc));
t('solo Finalizado autoriza pasado consumado para asistencia/participación',/Solo Finalizado\/past autoriza a convertir asistencia\/participación prevista en un hecho consumado/.test(svc));
t('En curso prohíbe han asistido/no pudieron/finalmente/ha participado',/mientras el evento siga En curso está prohibido afirmar[^\n]*han asistido[^\n]*no pudieron asistir[^\n]*finalmente no asistieron[^\n]*ha participado/.test(svc));
t('asistencia canónica En curso se define como estado previsto, no hecho pasado',/attendance_semantics:[^\n]*estado registrado o previsto[^\n]*NO prueba que la asistencia ya haya ocurrido/.test(svc));
t('persona all_events expone eventos reales para contexto temporal',/event_count:uniqueEvents\.size,events:\[\.\.\.uniqueEvents\]/.test(svc));

// El error 429 del PDF aparecía cuando la compilación necesitaba reparación y la fase final era la 3ª llamada.
t('fase final admite hasta 4 llamadas del turno para sobrevivir a una recompilación',/PRESENTACIÓN[\s\S]{0,6500}maxCalls:4,maxOutputTokens:1800/.test(svc));
t('reparación estructural sigue acotada a 2 llamadas y no crea bucles',/repairInput[\s\S]{0,1200}maxCalls:2,maxOutputTokens:1500/.test(svc));

// Turnos compuestos de personas: no perder donaciones/compras ni atribuir pareja completa a una persona.
t('person no admite people_mode que colapse el dossier transversal',/QUERY person no admite people_mode/.test(svc));
t('dossier multientidad conserva ingresos, compras, donaciones e imputación individual',/Ingreso imputado persona/.test(svc)&&/Compras bajo responsabilidad/.test(svc)&&/Donaciones vinculadas/.test(svc)&&/Ingresos del registro/.test(svc));
t('registro compartido reparte informativamente Importe entre Número',/personShare=v26Money\(num\(inc\.total\)\/shareDivisor\)/.test(svc));
t('redactor recibe regla explícita persona-pareja',/PERSONAS\/PAREJAS E INGRESOS:[^\n]*NO digas que el importe completo del registro/.test(svc));
t('corrección semántica no se resuelve con mero ce_local',/corrección explícita:[^\n]*Si la corrección cambia[^\n]*cifra[^\n]*atribuye[^\n]*granularidad persona\/pareja[^\n]*vuelve a ce_query/i.test(svc));

// Conversación/meta y meteorología.
t('dónde estamos se interpreta como foco conversacional salvo petición explícita de lugar/tiempo',/REGLA DE INSPECCIÓN DE FOCO:[^\n]*dónde estamos[^\n]*current_context[^\n]*No las conviertas en meteorología ni ubicación geográfica/.test(svc));
t('comentario sobre respuesta previa recibe procedencia del dataset anterior',/conversation_context:action==='conversation'[^\n]*v73ConversationMetaContext/.test(svc)&&/previous_result:\{domain:/.test(svc));
t('meteorología conserva la fuente Open-Meteo',/weather_source_context/.test(svc)&&/provider:trim\(f\?\.provider\)\|\|'Open-Meteo'/.test(svc));
t('aviso genérico de En curso no se añade al tiempo',/if\(!dataset\|\|trim\(dataset\?\.domain\)==='weather'\)return null/.test(svc));

// Turno 16: hacer campos más pequeños es presentación, no selección de columnas.
t('compact_table existe como operación local de presentación',/enum:\['show_table','compact_table'/.test(svc)&&/type==='compact_table'[^\n]*table_density:'compact'/.test(svc));
t('compact_table llega al objeto tabla',/table_density\)==='compact'\?tables\.map\(t=>\(\{\.\.\.t,density:'compact'\}\)\)/.test(svc));
t('UI aplica densidad compacta real sin eliminar campos',/ce-ai-table-user-compact/.test(ui)&&/table-layout:fixed!important/.test(ui)&&/font-size:9\.5px!important/.test(ui));

// Ejecuta físicamente el clasificador temporal aislado: un En curso nunca se convierte en pasado por fechas.
const a=svc.indexOf('function v73EventTemporalContext');
const b=svc.indexOf('function v73EnsureInProgressNotice',a);
if(a>=0&&b>a){
  const code=svc.slice(a,b);
  const parse=v=>{const m=trim(v).match(/^(\d{4}-\d{2}-\d{2})/);return m?m[1]:'';};
  const box={trim,arr,norm,Date,parseCeDateToIso:parse,isEventInProgressValue:v=>norm(v)==='en curso',v26EventById:(state,id)=>arr(state.eventos).find(e=>trim(e.id)===trim(id)),v70EventLookup:state=>new Map(arr(state.eventos).map(e=>[norm(e.titulo),e]))};
  vm.createContext(box);vm.runInContext(code+'\nthis.temporal=v73EventTemporalContext;',box);
  const state={eventos:[
    {id:'eOpenPastDates',titulo:'EVENTO ABIERTO',situacion:'En curso',fechaIni:'2026-08-01',fechaFin:'2026-08-02'},
    {id:'eFinal',titulo:'EVENTO FINAL',situacion:'Finalizado',fechaIni:'2026-08-01',fechaFin:'2026-08-02'}
  ]};
  const open=box.temporal(state,{scope:{kind:'named_event',event:'EVENTO ABIERTO'}},'',{local:'2026-08-25T21:30:00+02:00'}).events[0];
  const closed=box.temporal(state,{scope:{kind:'named_event',event:'EVENTO FINAL'}},'',{local:'2026-08-25T21:30:00+02:00'}).events[0];
  t('En curso con fechas ya vencidas queda open_after_window, no past',open?.phase==='open_after_window'&&open?.attendance_language==='current_open_status');
  t('Finalizado sí queda past_result',closed?.phase==='past'&&closed?.attendance_language==='past_result');
}else t('se localiza clasificador temporal',false);

console.log(`\nRAW14K · ${pass}/${pass+fail} comprobaciones OK`);process.exit(fail?1:0);
