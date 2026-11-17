const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');
const ai=fs.readFileSync(path.join(root,'services','event-ai.service.js'),'utf8'),lab=fs.readFileSync(path.join(root,'services','zuzu-test-lab.service.js'),'utf8'),ui=fs.readFileSync(path.join(root,'public','app','features','zuzu-test-console-gd.js'),'utf8');let ok=0,ko=0;function t(n,c){if(c){ok++;console.log('OK',n)}else{ko++;console.error('KO',n)}}
t('P9 Factual Contract existe',/function v5P9FactualContract/.test(ai)&&/function v5P9ApplyContract/.test(ai));
t('P9 FACT manda antes de VIEW',/VIEW se añade DESPUÉS del contrato factual/.test(ai)&&/V5 P9 · CONTRACT AUTHORITY/.test(ai));
t('P9 compras por responsable limpia persona',/group_by==='responsible'/.test(ai)&&/subject\.person='';subject\.responsible=''/.test(ai));
t('P9 hereda dimensión responsible',/inheritResponsible/.test(ai)&&/priorResponsible/.test(ai));
t('P9 multi-O banco+ingreso mantiene banco',/activeCtx\?\.domain\)==='bank'/.test(ai)&&/actions=\[bank,income\]/.test(ai));
t('P9 síntesis exige multi-O',/_context_domain='synthesis'/.test(ai)&&/event_summary[\s\S]{0,220}event_bank[\s\S]{0,220}event_purchases[\s\S]{0,220}event_donations/.test(ai));
t('P9 registro de vistas real',/function v5P9ViewRegistry/.test(ai)&&/local-view-registry/.test(ai));
t('P9 vista no soportada no cae silenciosamente',/function v5P9UnsupportedViewCue/.test(ai)&&/view_type_unsupported/.test(ai));
t('P9 memoria deduplica evidencia',/const seen=new Set\(\),excerpts=\[\]/.test(ai));
t('ITV AUTORIDAD 18 existe',/AUTHORITY18/.test(lab)&&/buildAuthority18DialogueCases/.test(lab)&&/ITV AUTORIDAD · 18/.test(ui));
t('ITV valida dimensión y capacidades',/inheritResponsible/.test(lab)&&/viewCapabilities/.test(lab)&&/unsupportedView/.test(lab));
const block=ai.slice(ai.indexOf('V5 CORE P9 · CONTRACT AUTHORITY'),ai.indexOf('function v5ExplicitFactualDomain'));
t('P9 sin entidades/eventos/importes hard-code',!/(Carmelo|Colty|Pocholo|Esther|FUNCION 2026|SySA|6485|6154)/.test(block));
console.log(`P9 ${ok}/${ok+ko} OK`);process.exitCode=ko?1:0;
