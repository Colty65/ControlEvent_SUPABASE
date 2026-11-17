const fs=require('fs'),path=require('path'),vm=require('vm');
const R=path.resolve(__dirname,'..'),ai=fs.readFileSync(path.join(R,'services/event-ai.service.js'),'utf8'),lab=fs.readFileSync(path.join(R,'public/app/features/antonio-lab-v3.js'),'utf8');
let ok=0,ko=0;function t(n,c,detail=''){if(c){ok++;console.log('OK ',n)}else{ko++;console.error('KO ',n,detail||'')}}
function extract(src,name){const start=src.indexOf(`function ${name}`);if(start<0)throw new Error(`No encuentro ${name}`);const next=src.indexOf('\nfunction ',start+10);return src.slice(start,next<0?src.length:next).trim()}
const names=['vnextP2IsoDateParts','vnextP2AddDaysIso','vnextP2DateRangeFromPrompt','v3130ResponseLevel','v3130RecoveryFeedbackCue','v3130RecoveryHasNewOrder','v3140RetryCue','v3140RecoveryRetrySeed','v3140ContextualDateRange','v3140ApplyTemporalContract','v3140WeatherTemporalMismatch','v3140ContextualCurrentDateCue','v3140CleanProductSpeech'];
const ctx={console};vm.createContext(ctx);vm.runInContext(`
const trim=v=>String(v==null?'':v).trim(); const arr=v=>Array.isArray(v)?v:[]; const vnextNorm=v=>trim(v).normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\\s+/g,' ').trim(); const vnextP17LooseNorm=v=>vnextNorm(v); const vnextP2RecentEvents=h=>{const out=[];for(let i=arr(h).length-1;i>=0;i--){const rc=arr(h)[i]?.resultContext||{};for(const x of [rc.event,...arr(rc.events),...arr(rc.focus_entities)])if(trim(x)&&!out.some(y=>vnextNorm(y)===vnextNorm(x)))out.push(trim(x));}return out}; const vnextP1ResolveEventName=(s,c)=>{const n=vnextNorm(c);const e=arr(s?.eventos).find(x=>vnextNorm(x?.titulo||x?.nombre)===n);return e?(e.titulo||e.nombre):''}; const vnextP2CatalogMentions=(s,p)=>{const pn=vnextNorm(p),hits=[];for(const e of arr(s?.eventos)){const n=trim(e?.titulo||e?.nombre);if(n&&pn.includes(vnextNorm(n)))hits.push(n)}return hits}; const v26EventById=(s,id)=>arr(s?.eventos).find(e=>String(e?.id)===String(id)); const zuzuTracePush=()=>{}; const vnextP1Table=(r,key)=>arr(r?.tables).find(t=>trim(t?.key)===key)||null;
${names.map(n=>extract(ai,n)).join('\n')}
this.F={${names.join(',')}};`,ctx);
const F=ctx.F;
const state={eventos:[{id:'e1',titulo:'FUNCION 2026'},{id:'e2',titulo:'SySA 2026'}]};
// Tiempo: lo pedido manda sobre las fechas históricas del evento.
t('mañana resuelve 2026-09-08',JSON.stringify(F.vnextP2DateRangeFromPrompt('Dame el tiempo de mañana','2026-09-07T11:00:00+02:00'))===JSON.stringify({start_date:'2026-09-08',end_date:'2026-09-08'}));
const histTomorrow=[{resultContext:{operation:'tomorrow_date',date:'2026-09-08'}}];
t('ese día hereda 2026-09-08',F.v3140ContextualDateRange('Dame el tiempo de ese día',histTomorrow,'2026-09-07').start_date==='2026-09-08');
const fixed=F.v3140ApplyTemporalContract([{name:'query_ce',arguments:{operation:'event_weather',event:'mañana'}}],state,'Dame el tiempo de mañana','e1',[],[],'2026-09-07T11:00:00+02:00')[0].arguments;
t('temporal contract elimina mañana como evento',fixed.event==='FUNCION 2026',JSON.stringify(fixed));
t('temporal contract impone fecha de mañana',fixed.start_date==='2026-09-08'&&fixed.end_date==='2026-09-08',JSON.stringify(fixed));
const badWeather=[{args:{operation:'event_weather'},result:{_vnext_operation:'event_weather',facts:{start_date:'2026-08-21',end_date:'2026-08-21'},tables:[{key:'weather',rows:[{Fecha:'2026-08-21'}]}]}}];
const goodWeather=[{args:{operation:'event_weather'},result:{_vnext_operation:'event_weather',facts:{start_date:'2026-09-08',end_date:'2026-09-08'},tables:[{key:'weather',rows:[{Fecha:'2026-09-08'}]}]}}];
t('oráculo rechaza meteo vieja presentada como mañana',!!F.v3140WeatherTemporalMismatch('tiempo mañana',badWeather,[],'2026-09-07'));
t('oráculo acepta meteo del día correcto',!F.v3140WeatherTemporalMismatch('tiempo mañana',goodWeather,[],'2026-09-07'));
// Reintento limpio.
const recHist=[{recovery:{cleanRestart:true,retryRequest:'Dame el tiempo que va a hacer mañana.',reason:'all_contracts_failed',attemptedOperations:['event_weather']},resultContext:{operation:'recovery_reset',retry_request:'Dame el tiempo que va a hacer mañana.',retry_reason:'all_contracts_failed',retry_operations:['event_weather']}}];
t('Vuelve a intentarlo se reconoce como retry',F.v3140RetryCue('Vuelve a intentarlo.'));
t('retry recupera la petición fallida, no el texto de retry',F.v3140RecoveryRetrySeed(recHist)?.request==='Dame el tiempo que va a hacer mañana.');
// Quejas reales del JSON deben activar recuperación.
for(const q of ['No sabes ni en qué día vives','¿Por qué mientes?','Tienes unos vicios imposibles de corregir y no somos capaces de hacerlo','Te lías otra vez','Fatal'])t(`queja recovery: ${q}`,F.v3130RecoveryFeedbackCue(q));
// Niveles de detalle.
t('nivel BASIC por defecto',F.v3130ResponseLevel('Dame las compras')==='BASIC');
t('nivel MEDIUM con más detalle',F.v3130ResponseLevel('Dame más detalle de esas compras')==='MEDIUM');
t('nivel HIGH con listado completo',F.v3130ResponseLevel('Quiero todas las compras, una por una')==='HIGH');
// Locución limpia.
const cleaned=F.v3140CleanProductSpeech('TK123 · 2026-08-21 · Cerveza MAHOU, 54,94 €; temperatura 31.2 °C; probabilidad 15,5 %','Dime los productos');
t('voz elimina TK no pedido',! /TK123/i.test(cleaned),cleaned);
t('voz elimina fecha ISO no pedida',! /2026-08-21/.test(cleaned),cleaned);
t('voz elimina decimales monetarios/meteo',! /54,94|31\.2|15,5/.test(cleaned),cleaned);
t('voz conserva ticket si se pide',/TK123/i.test(F.v3140CleanProductSpeech('TK123, cerveza','Dime el ticket TK123')));
// Contexto fecha tras hora.
t('¿de qué día? tras current_time es contextual',F.v3140ContextualCurrentDateCue('¿De qué día?',[{resultContext:{operation:'current_time'}}]));
t('¿de qué día? sin hora previa no inventa',!F.v3140ContextualCurrentDateCue('¿De qué día?',[{resultContext:{operation:'event_summary'}}]));
// Frontend: fastpaths solo para peticiones completas, nunca por contener "día de hoy".
const fctx={};vm.createContext(fctx);vm.runInContext(`const clean=(v,m=1200)=>String(v==null?'':v).slice(0,m); ${extract(lab,'normal')} ${extract(lab,'isCurrentDateCue')} ${extract(lab,'isTomorrowDateCue')} ${extract(lab,'isCurrentTimeCue')} this.G={normal,isCurrentDateCue,isTomorrowDateCue,isCurrentTimeCue};`,fctx);const G=fctx.G;
t('fastpath fecha acepta pregunta simple',G.isCurrentDateCue('¿Qué día es hoy?'));
t('fastpath fecha NO secuestra cálculo compuesto',!G.isCurrentDateCue('Saber cuántos días han pasado desde las fechas del tiempo hasta el día de hoy.'));
t('fastpath hora NO secuestra una frase más larga',!G.isCurrentTimeCue('Dime qué hora es y luego el tiempo de mañana'));
console.log(`\nBATERÍA V3.14 COMPORTAMIENTO: ${ok} OK · ${ko} KO`);process.exit(ko?1:0);
