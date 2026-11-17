const fs=require('fs');const p='services/event-ai.service.js';const s=fs.readFileSync(p,'utf8');let ok=0,ko=0;function t(n,c){console.log((c?'OK ':'KO ')+n);c?ok++:ko++;}
t('ce_execute_data exige fetch',/name:'ce_execute_data'[\s\S]{0,900}required:\['thread_mutation','fetch'\]/.test(s));
t('fetch exige entity_name y projections',/function v6FetchToolSchema\(\)[\s\S]{0,500}required:\['entity_name','projections'\]/.test(s));
t('entity_name usa enum ontológico',/entity_name:\{type:'string',enum:entityNames\}/.test(s));
t('projections minItems 1',/projections:\{type:'array',minItems:1/.test(s));
t('pipeline canónico reconstruye FETCH',/pipeline:\[\{primitive:'FETCH',params:a\.fetch\|\|\{\}\},\.\.\.arr\(a\.steps\)\]/.test(s));
t('steps excluye FETCH',/enum:\['FILTER','JOIN','AGGREGATE','DERIVE','SORT_LIMIT','VISUALIZE'\]/.test(s));
t('validador mantiene bloqueo FETCH vacío',/FETCH requiere entity_name lógico válido/.test(s));
t('traza visible v6.0.7',/v6\.0\.7_exp · /.test(s)&&!s.includes("'v5.1_exp · '"));
t('sin fallback legacy en ruta v6',/V6 · FALLO SIN FALLBACK/.test(s));
console.log(`\nV6.0.7 FETCH TOOL: ${ok} OK · ${ko} KO`);process.exitCode=ko?1:0;