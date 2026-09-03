const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const ai=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8');
let ok=0,bad=0;const t=(n,c,d='')=>{if(c){ok++;console.log('OK ',n)}else{bad++;console.error('KO ',n,d)}};
function slice(src,a,b){const i=src.indexOf(a),j=src.indexOf(b,i+a.length);if(i<0||j<0)throw Error(`slice ${a} -> ${b}`);return src.slice(i,j)}
const fallback=slice(ai,'function vnextP2RPlanJsonSchema','async function runZuzuVNextP2Agent');
const run=slice(ai,'async function runZuzuVNextP2Agent','async function runZuzuVNextP13Agent');

t('schema fallback conserva seis intents',fallback.includes("enum:['DATA','VIEW','CALCULATE','MEMORY','PERSON','CHAT']"));
t('schema fallback exige intent',fallback.includes("required:['intent']"));
t('fallback solo devuelve JSON',fallback.includes("responseMimeType:'application/json'"));
t('fallback usa responseSchema',fallback.includes('responseSchema:vnextP2RPlanJsonSchema()'));
t('fallback usa generateContent',fallback.includes(':generateContent`'));
t('fallback no contiene contratos CE',!fallback.includes('query_ce')&&!fallback.includes('event_summary')&&!fallback.includes('event_purchases'));
t('fallback declara misma semántica plan_turn',fallback.includes('objeto JSON equivalente a plan_turn con exactamente los mismos campos y significado'));
t('canal primario sigue siendo Interactions',run.includes("stage:'VNEXT P2-R · planificador mínimo'"));
t('canal primario exige function_call',run.includes("toolChoice:'required'"));
t('solo cae a fallback si falta plan_turn o falla primario',run.includes("if(!rawCalls.some(x=>trim(x?.name)==='plan_turn'))")&&run.includes('catch(error)'));
t('sin segundo plan tras plan válido',!run.includes('semanticRetry')&&!run.includes('DIALOGUE_STATE_AUTHORITY_RETRY'));
t('fallback sintetiza exactamente plan_turn',run.includes("name:'plan_turn',arguments:fb.plan"));
t('mismo normalizador después de ambos transportes',run.includes('vnextP2NormalizeCalls(rawCalls,conversationHistory,flowTrace)'));
t('mismo traductor determinista CE',run.includes('vnextP2RPlanToCalls(plan,history,flowTrace)')||ai.includes('function vnextP2RPlanToCalls'));
t('telemetría marca fallback',run.includes('plannerFallbackUsed'));
t('telemetría conserva error primario',run.includes('plannerPrimaryError'));
t('guard deja rastro explícito',run.includes('VNEXT P2-R · PLAN TRANSPORT GUARD'));
t('soft failure exterior permanece si fallan ambos',ai.includes("provider:'zuzu-vnext-p2-soft-failure'"));
console.log(`VNEXT P2-R RUNTIME TRANSPORT GUARD: ${ok} OK · ${bad} KO`);process.exitCode=bad?1:0;
