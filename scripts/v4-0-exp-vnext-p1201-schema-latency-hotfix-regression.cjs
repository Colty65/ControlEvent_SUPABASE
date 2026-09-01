const fs=require('fs'),vm=require('vm');
const path=require('path');
const root=path.resolve(__dirname,'..');
const regPath=path.join(root,'services/zuzu-capability-registry.service.js');
const eventPath=path.join(root,'services/event-ai.service.js');
const reg=fs.readFileSync(regPath,'utf8'), event=fs.readFileSync(eventPath,'utf8');
let ok=0,total=0; function check(name,cond){total++; if(!cond){console.error('KO',name);process.exitCode=1;}else{ok++;console.log('OK',name)}}
check('envelope runtime sigue presente',/capabilityEnvelopeFromArgs/.test(reg));
check('Gemini common queda limitado a PRESENT + META',/const GEMINI_COMMON=\[\.\.\.new Set\(\[\.\.\.PRESENT,\.\.\.META\]\)\]/.test(reg));
check('runtime universal separado del schema Gemini',/const RUNTIME_UNIVERSAL=/.test(reg)&&/schemaOptional/.test(reg));
check('event_purchases conserva claves de vista explicitas',/event_purchases:def\([^\n]+view_filters[^\n]+view_sort[^\n]+/.test(reg));
check('derive conserva source_args explicito',/derive:def\([^\n]+source_args/.test(reg));
check('compare_events conserva derive_operation explicito',/compare_events:def\([^\n]+derive_operation/.test(reg));
check('build P1.20.1 identificable',/p1201-schema-latency-hotfix/.test(event));
check('NHC: hotfix solo cambia exposicion del schema',/Cada operación expone solo sus claves empresariales/.test(reg));
console.log(`P1.20.1 SCHEMA LATENCY HOTFIX: ${ok}/${total}`); if(ok!==total)process.exit(1);
