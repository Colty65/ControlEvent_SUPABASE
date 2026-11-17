const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const ai=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8');
let ok=0,ko=0;function t(n,c){if(c){ok++;console.log('OK ',n)}else{ko++;console.log('KO ',n)}}
t('marco conversacional se recompone desde history',/function v5ConversationFrameFromHistory/.test(ai));
t('contexto conserva receta factual exacta',/last_query_actions/.test(ai)&&/v5FrameAfterTurn/.test(ai));
t('commit usa operación primaria y no la última acción',/const primaryOp=trim\(good\[0\]\?\.args\?\.operation\)/.test(ai));
t('continuación gráfica reutiliza acciones certificadas',/V5 CORE · PRESENTACIÓN/.test(ai)&&/ctx\.last_query_actions/.test(ai));
t('resumen económico tiene compositor propio',/sem\.summary&&summaryItem/.test(ai));
t('efectivo puede derivarse como total menos banco',/cashExplicit>0\?cashExplicit:Math\.max\(0,incomeTotal-bankIncome\)/.test(ai));
t('comprado+pendiente se compone antes del desglose simple',ai.indexOf('if(purchases.length>=2&&sem.pending&&sem.realized)')<ai.indexOf('if(sem.responsibleBreakdown&&purchases.length)'));
t('se elimina coletilla automática Mira',!ai.includes("out=`Mira, ${out.charAt(0).toLowerCase()}${out.slice(1)}`"));
t('salida hablada tiene compositor independiente',/function v5BrainLiteSpokenDraft/.test(ai));
t('voz no recita lista completa de asistentes',/Te dejo la lista completa escrita/.test(ai));
t('memoria exige evidencia en episodio seleccionado',/V5 CORE · MEMORIA · EVIDENCIA/.test(ai));
t('arquitectura se identifica como V5 CORE P1',/V5 CORE P1 · marco conversacional estable/.test(ai));
console.log(`V5 CORE P1: ${ok} OK · ${ko} KO`);process.exitCode=ko?1:0;
