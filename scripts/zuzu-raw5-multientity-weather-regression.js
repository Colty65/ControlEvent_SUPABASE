import fs from 'node:fs';const s=fs.readFileSync(new URL('../services/event-ai.service.js',import.meta.url),'utf8');
const tests=[
 ['contrato plural products',/products:productList/.test(s)],['contrato plural people',/people:stringList/.test(s)],['contrato plural responsibles',/responsibles:stringList/.test(s)],['contrato plural donors',/donors:stringList/.test(s)],['contrato plural stores',/stores:stringList/.test(s)],['contrato plural tickets',/tickets:stringList/.test(s)],
 ['un solo comando multientidad',/Gemini debe emitir exactamente UN comando CE/.test(s)],
 ['consulta compuesta targets',/targets:\{type:'array',items:target\}/.test(s)],
 ['filtro ANY-OF multientidad',/filters\.responsibles=[\s\S]*filters\.people/.test(s)],
 ['dossier multi persona',/function v73ExecuteMultiPersonDossier/.test(s)],
 ['meteorología Open-Meteo disponible',/Open-Meteo/.test(s)],
 ['meteorología como suplemento',/supplement=.*weather|const supplement=.*weather|supplements/si.test(s)],
 ['ejecutor suplemento weather',/function v73ExecuteSupplement/.test(s)],
 ['gráfica meteorológica dos series',/function v73WeatherChartFromDataset[\s\S]*Temp\. máx[\s\S]*Temp\. mín/.test(s)],
 ['CURRENT_USER máxima prioridad',/CURRENT_USER tiene autoridad absoluta/.test(s)],
 ['salida final estructurada',/zuzu_final_presentation/.test(s)],
 ['arquitectura RAW11 identificada',/RAW11 · CONTRATO GEMINI↔CE CERRADO/.test(s)]
];let bad=0;for(const [n,ok] of tests){console.log((ok?'OK':'KO')+' · '+n);if(!ok)bad++;}if(bad)process.exit(1);console.log('MULTIENTITY WEATHER REGRESSION: OK');
