import fs from 'node:fs';
const s=fs.readFileSync(new URL('../services/event-ai.service.js',import.meta.url),'utf8');
const tests=[
 ['catálogo de comandos separado',/ce_query[\s\S]*ce_local[\s\S]*ce_set_context[\s\S]*ce_reference[\s\S]*ce_conversation[\s\S]*ce_clarify/.test(s)],
 ['Gemini debe elegir exactamente un comando',/Gemini debe emitir exactamente UN comando CE/.test(s)],
 ['compilador expone tools tipadas',/tools=v73CommandTools\(\)[\s\S]*allowed=tools\.map/.test(s)],
 ['set_context normalizado',/action==='set_context'[\s\S]*out\.context=\{clear_all/.test(s)],
 ['set_context ejecuta sin consulta',/Cambio de contexto sin consulta/.test(s)],
 ['mensaje actual manda',/CURRENT_USER tiene autoridad absoluta/.test(s)],
 ['meta conversación no repite consulta',/ce_conversation:[\s\S]*No repitas una consulta anterior por inercia/.test(s)],
 ['tabla vigente usa local',/Resultado ya materializado \+ «tabla\/lista» => ce_local \+ show_table/.test(s)],
 ['gráfica vigente usa local',/Gráfica del resultado actual => ce_local \+ chart/.test(s)],
 ['cantidad física usa units',/cantidad física[\s\S]*units/.test(s)],
 ['dinero usa amount',/magnitud económica\/monetaria/.test(s)],
 ['group_field se conserva y ejecuta',/requestedGroup=trim\(op\.group_field\)/.test(s)],
 ['chart admite series y x_field',/series:\{type:'array'[\s\S]*x_field:\{type:'string'\}/.test(s)],
 ['arquitectura RAW12 identificada',/RAW12 · CONTRATO ÚNICO \+ OBEDECER ARTEFACTOS/.test(s)]
];
let bad=0;for(const [n,ok] of tests){console.log((ok?'OK':'KO')+' - '+n);if(!ok)bad++;}if(bad)process.exit(1);console.log('ZUZU COMMAND CATALOG COMPAT: OK');
