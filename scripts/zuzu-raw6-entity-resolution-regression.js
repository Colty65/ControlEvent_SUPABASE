import fs from 'node:fs';const s=fs.readFileSync(new URL('../services/event-ai.service.js',import.meta.url),'utf8');
const tests=[
 ['Damerau transposición',/function semanticEditDistance[\s\S]*Damerau-Levenshtein[\s\S]*transposición adyacente/i.test(s)],
 ['candidate match exact/strong/fuzzy',/match_kind[\s\S]*exact[\s\S]*strong[\s\S]*fuzzy/.test(s)],
 ['canonizador tipado post-Gemini',/function v73CertifyTypedEntities[\s\S]*semanticResolveEntity/.test(s)],
 ['persona multientidad preservada',/people:stringList[\s\S]*responsibles:stringList[\s\S]*donors:stringList/.test(s)],
 ['segunda llamada Gemini permitida',/v73RawFinalWithGemini/.test(s)],
 ['weather supplement soportado',/function v73ExecuteSupplement[\s\S]*domain\)!=='weather'/.test(s)],
 ['set_context se resuelve dentro del tipo',/function v73CertifyContext[\s\S]*semanticType/.test(s)],
 ['RAW11 evolución identificada',/RAW11 · CONTRATO GEMINI↔CE CERRADO/.test(s)]
];let bad=0;for(const [n,ok] of tests){console.log((ok?'OK':'KO')+' · '+n);if(!ok)bad++;}if(bad)process.exit(1);console.log('ENTITY RESOLUTION REGRESSION: OK');
