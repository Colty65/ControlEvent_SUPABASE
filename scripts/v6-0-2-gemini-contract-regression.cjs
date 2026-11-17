const fs=require('fs');
const svc=fs.readFileSync(require('path').join(__dirname,'..','services','event-ai.service.js'),'utf8');
const lab=fs.readFileSync(require('path').join(__dirname,'..','services','zuzu-test-lab.service.js'),'utf8');
const ver=fs.readFileSync(require('path').join(__dirname,'..','public','app','version.js'),'utf8');
const checks=[
 ['version v6.0.4',/VERSION = 'v6\.0\.4_exp'/.test(ver)],
 ['contract function exists',/name:'emit_ce_contract'/.test(svc)],
 ['Gemini contract uses forced tool',/tools:\[tool\][\s\S]{0,500}emit_ce_contract/.test(svc)],
 ['no text-json v6 decision path',/function v6ContractFromPayload/.test(svc)&&/v261FunctionCalls\(payload\)/.test(svc)],
 ['one structural Gemini retry',/V6 · REINTENTO DE CONTRATO/.test(svc)],
 ['no cognitive legacy fallback',/V6 · FALLO SIN FALLBACK/.test(svc)],
 ['failure usage accounted',/geminiUsageEstimate:usage/.test(svc)&&/interactionCalls:num\(usage\?\.calls\)/.test(svc)],
 ['sovereign battery v6 code',/ITV-SOVEREIGN-V6\.0\.4-SEMANTIC-30/.test(lab)],
 ['sovereign scenario v6',/ITV v6\.0\.4_exp CLEAN CANONICAL COGNITIVE COMPILER 30/.test(lab)],
 ['sovereign not Brain Lite',/sovereign30:true,v6:true/.test(lab)&&/brainLite:false/.test(lab)],
 ['v6 sovereign validator',/ITV SOBERANA v6:/.test(lab)],
 ['migration includes v6.0.1',/ControlEvent_v6\.0\.1_exp/.test(ver)],
];
let ok=0;for(const [n,v] of checks){console.log(`${v?'OK':'KO'} ${n}`);if(v)ok++;}
console.log(`TOTAL ${ok}/${checks.length}`);process.exit(ok===checks.length?0:1);
