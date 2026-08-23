import fs from 'node:fs';
const src=fs.readFileSync('services/event-ai.service.js','utf8');
const tests=[
 ['Damerau transposición',/transposición adyacente cuenta como UN error/],
 ['candidate match_kind exact',/match_kind:exact\?'exact'/],
 ['exact suprime parciales mismo tipo',/exactMatched=new Set[\s\S]*!exactMatched\.has/],
 ['regla exact fuzzy contexto aclaración',/exacto tipado > candidato fuzzy claro > contexto reciente del MISMO tipo > aclaración/],
 ['person multientidad sin forzar comparison',/domain=person \+ query\.people con TODAS/],
 ['canonizador tipado fuzzy post-Gemini',/function v73CertifyTypedEntities[\s\S]*ENTIDAD TIPADA[\s\S]*variante\/fuzzy/],
 ['segunda llamada Gemini permitida',/Gemini redacta pantalla \+ voz'[\s\S]{0,300}maxCalls:2/],
 ['weather supplement prioridad gráfica',/weatherSupplement=arr\(normalizedPlan\?\.query\?\.supplements\)[\s\S]*weatherCharts=weatherSupplement/],
 ['RAW6 identificado',/RAW6 · ENTIDADES ROBUSTAS \+ MULTIENTIDAD \+ METEO/]
];
let ko=0;for(const [n,re] of tests){if(re.test(src))console.log('OK · '+n);else{ko++;console.error('KO · '+n)}}
if(ko){console.error(`RAW6 REGRESSION: ${ko} KO`);process.exit(1)}console.log('RAW6 REGRESSION: OK');
