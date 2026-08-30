const fs=require('fs'),path=require('path');const root=path.join(__dirname,'..');let ok=0,ko=0;function t(n,c,d=''){if(c){ok++;console.log('OK ',n)}else{ko++;console.error('KO ',n,d)}}
(async()=>{const svc=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8'),route=fs.readFileSync(path.join(root,'routes/event-ai.routes.js'),'utf8'),ui=fs.readFileSync(path.join(root,'public/app/features/v11-3-zuzu-analitica-libre.js'),'utf8');
t('endpoint VNext paralelo',/analyze-vnext/.test(route)&&/runZuzuVNextUserTurn/.test(route));
t('exactamente 4 tools VNext',/function vnextTools\(\)[\s\S]*resolve_entity[\s\S]*query_ce[\s\S]*search_documents[\s\S]*recall_memory/.test(svc));
t('open-world explícito',/TODO mensaje humano es conversable/.test(svc)&&/NO es un error de protocolo/.test(svc));
t('sin memory gate en agente VNext',/runZuzuVNextOpenAgent[\s\S]*VNEXT P0 · OPEN WORLD/.test(svc)&&!/runZuzuVNextOpenAgent[\s\S]{0,5000}MEMORY EVIDENCE GATE/.test(svc));
t('alias exacto es persona atómica',/alias social exacto[\s\S]{0,180}persona individual/.test(svc));
t('pago no se confunde con donación',/ha pagado el importe del evento[\s\S]{0,180}NO de donaciones/.test(svc));
t('catálogo personas incluye Nombre hablado',/people_catalog[\s\S]{0,1200}Nombre hablado/.test(svc));
t('catálogo eventos incluye Nombre hablado',/events_catalog[\s\S]{0,1200}Nombre hablado/.test(svc));
t('previous interaction se usa en VNext',/previousInteractionId:vnext\?loadZuzuInteractionId\(\):''/.test(ui));
t('historia solo como fallback VNext',/conversationHistory:vnext\?history:\[\]/.test(ui));
t('toggle A\/B en UI',/ceAiVNextMode/.test(ui)&&/VNext ACTIVO/.test(ui));
t('soft failure conversa y no registro no ejecutable',/Zuzu VNext sigue contigo/.test(svc)&&!/ControlEvent no pudo ejecutar este registro/.test(svc.slice(svc.indexOf('runZuzuVNextOpenAgent'),svc.indexOf('async function runZuzuV62NativeToolAgent'))));
console.log(`TOTAL ${ok+ko} · OK ${ok} · KO ${ko}`);process.exit(ko?1:0);})().catch(e=>{console.error(e);process.exit(1)});