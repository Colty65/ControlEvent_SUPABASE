const fs=require('fs');const file=process.argv[2];if(!file||!fs.existsSync(file)){console.error('Uso: node scripts/v4-1-exp-zuzu-diagnostic-replay-audit.cjs <diagnostico.json>');process.exit(2)}
const j=JSON.parse(fs.readFileSync(file,'utf8')),ev=Array.isArray(j.events)?j.events:[];const failures=[],warn=[];
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const brain=ev.filter(e=>e.type==='brain'&&/Respuesta VNext recibida/.test(e.message||''));
const recoveries=ev.filter(e=>e.type==='recovery');
const texts=ev.filter(e=>e.type==='turn'&&/transcrito/.test(e.message||'')).map(e=>({turnId:e.data?.turnId,text:e.data?.text||''}));
const byTurn=new Map();for(const x of texts)byTurn.set(x.turnId,x.text);for(const e of brain){const d=e.data||{},u=byTurn.get(d.turnId)||'',a=String(d.spokenAnswer||d.answer||d.writtenAnswer||''),n=norm(u),an=norm(a),auth=d.authority||{};
  if(/tiempo|meteorolog/.test(n)&&/manana/.test(n)){if(/2026-08-2[1-9]/.test(a))failures.push({turn:d.turnId,code:'WEATHER_STALE_DATE',user:u,answer:a.slice(0,220)});if(auth.operation==='event_weather'&&!Array.isArray(d.executedOperations)||auth.operation==='event_weather'&&!(d.executedOperations||[]).includes('event_weather')&&!d.recovery)warn.push({turn:d.turnId,code:'WEATHER_NOT_EXECUTED',user:u});}
  if(/vuelve a intentarlo|intentalo otra vez/.test(n)&&an.includes('vuelve a intentarlo'))failures.push({turn:d.turnId,code:'RETRY_ECHOED',user:u,answer:a});
  if(/vicios imposibles|no sabes ni|por que mientes|me mientes/.test(n)&&!d.recovery)failures.push({turn:d.turnId,code:'COMPLAINT_NO_RECOVERY',user:u,answer:a});
  if(/cuantos dias han pasado/.test(n)&&/^hoy es /.test(an))failures.push({turn:d.turnId,code:'DATE_FASTPATH_HIJACK',user:u,answer:a});
  if(/tiempo/.test(an)&&/para manana/.test(an)&&/21 de agosto/.test(an))failures.push({turn:d.turnId,code:'TEMPORAL_SELF_CONTRADICTION',user:u,answer:a});
}
for(const e of ev.filter(e=>e.type==='turn'&&e.message==='Respuesta local inmediata')){const d=e.data||{},n=norm(d.text),an=norm(d.reply);if(/cuantos dias han pasado/.test(n)&&/^hoy es /.test(an))failures.push({turn:d.turnId,code:'DATE_FASTPATH_HIJACK',user:d.text,answer:d.reply});}
console.log(`DIAGNÓSTICO ${j.build||''}`);console.log(`Eventos=${ev.length} · respuestas=${brain.length} · recuperaciones=${recoveries.length}`);for(const f of failures)console.log(`KO  T${f.turn||'?'} ${f.code} · ${f.user||''} => ${f.answer||''}`);for(const w of warn)console.log(`WARN T${w.turn||'?'} ${w.code} · ${w.user||''}`);console.log(`\nAUDITORÍA: ${failures.length} fallo(s) objetivo(s) · ${warn.length} aviso(s)`);process.exit(failures.length?1:0);
