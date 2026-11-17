const fs=require('fs'); const ai=fs.readFileSync('services/event-ai.service.js','utf8'); let ok=0,ko=0;
function t(n,c){if(c){ok++;console.log('OK',n)}else{ko++;console.error('KO',n)}}
t('P4 declarado',/V5 CORE P4 · SOBERANIA C\/S/.test(ai));
t('dominio S gobernado por operación principal',/primaryDomain=v5ContextDomainFromOperation/.test(ai)&&/domain=trim\(plan\?\._context_domain\)\|\|route\.anchor_domain\|\|primaryDomain/.test(ai));
t('snapshot id incluye contexto secuencia ordinal',/snapshot_id:`s_\$\{v5ContextHash\(target\.context_id\|\|subject\.context_id\)/.test(ai));
t('evidencia compacta por operación',/function v5CompactEvidence/.test(ai)&&/evidenceBySig/.test(ai));
t('view engine local',/V5 P4 · VIEW_ONLY/.test(ai)&&/provider:'zuzu-v5-view-engine-local'/.test(ai));
t('view only sin CE/IA',/VIEW_ONLY \$\{chartType\}: 0 Gemini · 0 CE/.test(ai)&&/executedOperations:\[\],capabilityCalls:\[\],tools:\[\]/.test(ai));
t('context paging compacto',/function v5PlannerContextPage/.test(ai)&&/const ctx=v5PlannerContextPage/.test(ai));
t('weather rango explícito genérico',/function v5RequestedWeatherRange/.test(ai)&&/vnextP2AddDaysIso\(base,2\)/.test(ai));
t('sin entidades hardcode en P4',!/Carmelo|Colty|Pocholo|FUNCION 2026/.test(ai.slice(ai.indexOf('V5 CORE P4'),ai.indexOf('async function v4BrainLitePlan'))));
console.log(`TOTAL ${ok} OK / ${ko} KO`); process.exitCode=ko?1:0;
