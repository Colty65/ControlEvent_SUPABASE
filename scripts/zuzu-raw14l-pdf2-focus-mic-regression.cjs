const fs=require('fs');
const svc=fs.readFileSync('services/event-ai.service.js','utf8');
const voice=fs.readFileSync('public/app/features/v22-voz3-zuzu.js','utf8');
let pass=0,fail=0;function t(name,ok){if(ok){console.log('OK · '+name);pass++;}else{console.error('KO · '+name);fail++;}}

// PDF 25/08/2026 22:40 · multi-entidad y asistencia por subpoblación.
t('personas exactas múltiples no pueden fusionarse en un único people',/function v73MultiPersonCandidateViolation[\s\S]{0,1600}PERSON exactas[\s\S]{0,500}no las fusiones/.test(svc));
t('people_mode distingue socios asistentes y no socios asistentes',/enum:\['attendance_full','attendees','attending_members','attending_non_members','non_attending_members','canonical_members','income'\]/.test(svc));
t('asistencia materializa filas separadas para socios y no socios',/mode==='attending_members'\?memberAttendees:mode==='attending_non_members'\?nonmemberAttendees/.test(svc));
t('facts conservan listas completas de las tres poblaciones',/member_attendee_names:memberAttendees\.map/.test(svc)&&/nonmember_attendee_names:nonmemberAttendees\.map/.test(svc)&&/nonattending_member_names:absents\.map/.test(svc));
t('redacción final prohíbe truncar listas pedidas por rows_sample',/LISTAS DE ASISTENCIA COMPLETAS:[\s\S]{0,700}enumera TODOS los nombres[\s\S]{0,300}no cortes la lista por rows_sample/.test(svc));


// La segunda prueba también detectó un total de compras global mezclado con la VIEW de Esther.
t('compras filtradas declaran la VIEW como única autoridad de totales',/COMPRAS FILTRADAS:[\s\S]{0,650}única autoridad[\s\S]{0,350}vista actual/.test(svc));
t('fase final detecta importes en euros no sustentados por RESULTADO_CE',/function v73FinalSemanticIssues[\s\S]{0,900}no aparece en el resultado CE autoritativo/.test(svc));
t('una incoherencia factual provoca una sola reparación de presentación',/PRESENTACIÓN · REPARACIÓN FÁCTICA[\s\S]{0,900}RECHAZO_FÁCTICO_CE/.test(svc));
t('la reparación puede exigir cobertura completa de asistencia',svc.includes('La lista de asistencia está incompleta:')&&svc.includes('enumera todos los nombres canónicos exigidos por facts'));

// Cambio de evento y continuidad: el guard debe dejar pasar una entidad resoluble por SCC del mismo tipo.
t('cambio explícito de evento puede certificarse con el resolver canónico',/const target=semanticResolveEntity\(state,'event',s\.event\),current=semanticResolveEntity\(state,'event',cs\.event\)/.test(svc));
t('CURRENT_CONTEXT prefiere scope canónico ejecutado al alias bruto',svc.includes("const rs=rt?.execution?.scope||rp?.query?.scope")&&svc.includes("opScope=oper?.execution?.scope||oq?.scope||{}"));

// Avisos de En curso: solo eventos presentes físicamente en el resultado filtrado.
t('aviso En curso usa filas reales de la VIEW en ámbitos amplios',/const resultRows=v73RowsForStored\(dataset,view\|\|\{\}\),eventField=v70FieldKey\(resultRows,'Evento'\)/.test(svc));
t('aviso no confunde ámbito all_events con eventos realmente devueltos',/all_events','year','named_events','latest_events','event_series'[\s\S]{0,500}resultRows/.test(svc));

// Presentación: no se inventan gráficas decorativas.
t('la fase final no puede añadir gráfica si el plan no la pidió',/return\{table:base\.table\|\|fp\.table===true,chart:base\.chart,chart_type:/.test(svc));
t('prompt final dice explícitamente no añadir gráfica decorativa',/NO añadas una gráfica si plan_executed no la pidió/.test(svc));

// Voz: el micrófono deja de quedar abierto indefinidamente tras cada respuesta.
t('voz incorpora ventana de réplica finita',/replyWindowMs:12000/.test(voice)&&/function armReplyWindow/.test(voice));
t('al vencer la ventana se aparca la conversación y vuelve Hola Zuzu',/Conversación en espera\. Di «Hola Zuzu» para seguir\.[\s\S]{0,160}parkConversation\(\)/.test(voice));
t('parcar o terminar detiene también Voz CE cloud',/function parkConversation\(\)[^\n]*pauseCloudListening\(\)/.test(voice)&&/function endConversation\(\)[^\n]*pauseCloudListening\(\)/.test(voice));
t('voz detectada en cloud prolonga la ventana mientras el usuario está hablando',/if\(state\.cloudKind==='user'\)touchReplyWindow\(\)/.test(voice));
t('fuzzy débil no se inyecta al compilador como candidato autoritativo',/filter\(x=>trim\(x\?\.match_type\)!=='fuzzy'\|\|Number\(x\?\.score\)>=0\.90\)/.test(svc));

// Meta-correcciones y despedidas no deben abrir consultas nuevas por inercia.
t('conversation conserva correction/feedback/farewell/incoherent',/\['general','greeting','farewell','feedback','correction'[\s\S]{0,220}'incoherent_input'/.test(svc));
t('meta-procedencia se resuelve conversacionalmente',/REGLA DE META-PROCEDENCIA:[\s\S]{0,500}No conviertas esa pregunta meta en una consulta nueva de events/.test(svc));
t('despedida ignora un candidato fuzzy aislado',/REGLA DE DESPEDIDA:[\s\S]{0,360}candidato fuzzy aislado/.test(svc));

console.log(`\nRAW14L · ${pass}/${pass+fail} comprobaciones OK`);process.exit(fail?1:0);
