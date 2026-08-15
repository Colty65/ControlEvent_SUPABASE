/* ControlEvent v1.0_exp · PRUEBAS ZUZU · Consola GD.
   La batería se genera desde las tablas reales; no modifica datos de producción. */
(function(){
  'use strict';
  if(window.__ceZuzuTestConsoleGd) return; window.__ceZuzuTestConsoleGd=true;
  const $=id=>document.getElementById(id), text=v=>v==null?'':String(v), num=v=>{const n=Number(v);return Number.isFinite(n)?n:0;};
  const esc=v=>text(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fmtN=n=>new Intl.NumberFormat('es-ES').format(num(n));
  const fmtE=n=>new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:4}).format(num(n))+' €';
  function auth(){try{return window.authUser||window.__CONTROL_EVENT_USER__||window.ControlEventApp?.authUser||null;}catch(_){return null;}}
  function role(){const u=auth()||{};return text(u.nivel||u.Nivel).trim().toUpperCase();}
  function isGD(){return role()==='GD';}
  function actorHeader(){const u=auth()||{};return encodeURIComponent(JSON.stringify({nivel:role(),identificacion:text(u.identificacion||u.Identificacion),nombre:text(u.nombre||u.Nombre)}));}
  function apiHeaders(extra={}){return {'Content-Type':'application/json','X-ControlEvent-Feature':'zuzu-test-console-v1','X-ControlEvent-Actor':actorHeader(),...extra};}
  let currentAbort=null, preview=null, rows=[], lastSummary=null, activeFilter='TODOS', lastMode='FAST';
  const HISTORY_KEY='controlevent_v1_0_exp_zuzu_test_history';

  function style(){
    if($('ceZuzuTestConsoleStyle')) return;
    const s=document.createElement('style');s.id='ceZuzuTestConsoleStyle';s.textContent=`
      #ceZuzuTestBtn.ce-zuzu-test-tab{border-color:#7dd3fc!important;background:#eff6ff!important;color:#075985!important}#ceZuzuTestBtn.ce-zuzu-test-tab .tabicon{filter:none!important}#ceZuzuTestBtn.ce-zuzu-test-tab:hover{box-shadow:0 0 0 2px rgba(14,165,233,.14)!important}
      #ceZuzuTestOverlay{position:fixed;inset:0;z-index:100120;background:rgba(15,23,42,.62);display:flex;align-items:center;justify-content:center;padding:14px}
      #ceZuzuTestOverlay .zt-modal{width:min(1440px,98vw);height:min(930px,96vh);background:#fff;border:2px solid #0ea5e9;border-radius:22px;box-shadow:0 26px 90px rgba(15,23,42,.42);display:flex;flex-direction:column;overflow:hidden}
      .zt-head{display:flex;align-items:center;gap:12px;padding:13px 16px;background:linear-gradient(90deg,#eff6ff,#fff);border-bottom:1px solid #bae6fd}.zt-head h2{margin:0;color:#075985;font-size:22px}.zt-head .zt-sub{color:#475569;font-size:12px;font-weight:800}.zt-spacer{flex:1}.zt-close{border:1px solid #cbd5e1;background:#fff;border-radius:11px;padding:8px 12px;font-weight:900;cursor:pointer}
      .zt-top{display:grid;grid-template-columns:minmax(340px,1.1fr) minmax(390px,1.4fr);gap:10px;padding:10px 12px;border-bottom:1px solid #e2e8f0;background:#f8fafc}.zt-panel{background:#fff;border:1px solid #dbeafe;border-radius:14px;padding:10px}.zt-panel h3{margin:0 0 8px;color:#075985;font-size:13px}.zt-data{display:flex;gap:6px;flex-wrap:wrap}.zt-pill{border-radius:999px;background:#f1f5f9;border:1px solid #cbd5e1;padding:4px 8px;font-size:11px;font-weight:850;color:#334155}.zt-pill strong{color:#0f172a}.zt-modes{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.zt-mode{border:1px solid #cbd5e1;background:#fff;border-radius:12px;padding:8px;cursor:pointer;text-align:left}.zt-mode.active{border-color:#0ea5e9;background:#eff6ff;box-shadow:0 0 0 2px rgba(14,165,233,.12)}.zt-mode b{display:block;color:#0f172a;font-size:12px}.zt-mode small{display:block;color:#64748b;margin-top:3px;line-height:1.25}.zt-mode .free{color:#15803d}.zt-mode .paid{color:#b45309}
      .zt-controls{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:8px}.zt-controls button{border:1px solid #cbd5e1;background:#fff;border-radius:10px;padding:7px 10px;font-weight:900;cursor:pointer}.zt-controls .primary{background:#0284c7;color:#fff;border-color:#0284c7}.zt-controls .danger{color:#b91c1c;border-color:#fecaca}.zt-controls label{font-size:11px;font-weight:850;color:#475569}.zt-controls input{width:74px;border:1px solid #cbd5e1;border-radius:8px;padding:6px;font-weight:850}.zt-controls select{border:1px solid #cbd5e1;border-radius:8px;padding:6px;font-weight:850}
      .zt-progress-area{padding:9px 12px;border-bottom:1px solid #e2e8f0;background:#fff}.zt-progress-head{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center}.zt-progress{height:11px;background:#e2e8f0;border-radius:999px;overflow:hidden}.zt-progress>div{height:100%;width:0;background:linear-gradient(90deg,#0284c7,#22c55e);transition:width .15s}.zt-phase{font-size:12px;font-weight:900;color:#334155}.zt-stats{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.zt-stat{min-width:115px;border:1px solid #e2e8f0;border-radius:10px;padding:6px 9px;background:#f8fafc}.zt-stat b{display:block;font-size:17px;color:#0f172a}.zt-stat span{font-size:10px;color:#64748b;font-weight:850}.zt-stat.ok b{color:#15803d}.zt-stat.ko b{color:#b91c1c}.zt-stat.warn b{color:#c2410c}.zt-stat.cost b{color:#7c3aed}
      .zt-filters{display:flex;gap:5px;flex-wrap:wrap;padding:7px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0}.zt-filter{border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:4px 9px;font-size:10px;font-weight:900;cursor:pointer}.zt-filter.active{background:#0f172a;color:#fff;border-color:#0f172a}
      .zt-results{flex:1;min-height:180px;overflow:auto;padding:7px 12px;background:#f8fafc}.zt-row{display:grid;grid-template-columns:64px 126px minmax(220px,1.1fr) minmax(230px,1fr) minmax(260px,1.4fr) 80px;gap:7px;align-items:start;border:1px solid #e2e8f0;border-left:5px solid #94a3b8;border-radius:10px;background:#fff;padding:7px 8px;margin-bottom:6px;font-size:11px}.zt-row.OK{border-left-color:#22c55e}.zt-row.KO{border-left-color:#ef4444;background:#fff7f7}.zt-row.WARN{border-left-color:#f59e0b;background:#fffaf0}.zt-status{font-weight:950}.zt-row.OK .zt-status{color:#15803d}.zt-row.KO .zt-status{color:#b91c1c}.zt-row.WARN .zt-status{color:#b45309}.zt-cell b{display:block;color:#0f172a;margin-bottom:2px}.zt-cell span{color:#475569;white-space:pre-wrap;overflow-wrap:anywhere}.zt-ms{text-align:right;color:#64748b;font-weight:800}.zt-empty{padding:34px;text-align:center;color:#64748b;font-weight:850}
      .zt-foot{display:flex;align-items:center;gap:8px;padding:8px 12px;border-top:1px solid #e2e8f0;background:#fff}.zt-foot .zt-cert{font-weight:950}.zt-cert.good{color:#15803d}.zt-cert.bad{color:#b91c1c}.zt-history{margin-left:auto;font-size:10px;color:#64748b;font-weight:800}
      @media(max-width:900px){.zt-top{grid-template-columns:1fr}.zt-row{grid-template-columns:55px 90px 1fr}.zt-row .zt-expected,.zt-row .zt-actual{grid-column:3}.zt-ms{grid-column:1}.zt-modes{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }
  function injectButton(){
    if(!isGD()){ $('ceZuzuTestBtn')?.remove(); return; }
    if($('ceZuzuTestBtn')) return;
    const tabs=$('mainTabs'); if(!tabs)return;
    const b=document.createElement('button');b.type='button';b.id='ceZuzuTestBtn';b.className='tab ce-zuzu-test-tab';b.innerHTML='<span class="tabicon">🧪</span>';b.title='PRUEBAS ZUZU · ITV automática · solo GD';b.setAttribute('aria-label','PRUEBAS ZUZU');b.onclick=function(ev){ev.preventDefault();ev.stopPropagation();open();return false;};tabs.appendChild(b);
  }
  function modal(){return `<div id="ceZuzuTestOverlay"><div class="zt-modal">
    <div class="zt-head"><h2>🧪 ITV de Zuzu</h2><span class="zt-sub">Batería autogenerada desde las tablas reales · SOLO LECTURA · solo GD</span><div class="zt-spacer"></div><button class="zt-close" id="ztClose">Cerrar</button></div>
    <div class="zt-top">
      <div class="zt-panel"><h3>Datos reales detectados</h3><div id="ztData" class="zt-data"><span class="zt-pill">Cargando catálogo…</span></div><div class="zt-controls"><button id="ztGenerate">↻ GENERAR NUEVA BATERÍA</button><button id="ztReport">🖨 INFORME</button></div></div>
      <div class="zt-panel"><h3>Modo de prueba</h3><div class="zt-modes">
        <button class="zt-mode active" data-mode="FAST"><b>FAST · CE</b><small class="free">0 € · cientos de comprobaciones reales sin IA.</small></button>
        <button class="zt-mode" data-mode="AI-SMOKE"><b>AI-SMOKE</b><small class="paid">Muestra pagada: interpretación y herramientas.</small></button>
        <button class="zt-mode" data-mode="FULL-CERT"><b>FULL-CERT</b><small class="paid">Conversaciones reales multiturmo.</small></button>
      </div><div class="zt-controls"><label>Máx. coste <input id="ztMaxCost" type="number" min="0.02" max="5" step="0.05" value="0.25"> €</label><label>Casos IA <select id="ztMaxCases"><option>12</option><option selected>24</option><option>36</option><option>48</option></select></label><button class="primary" id="ztStart">▶ INICIAR PRUEBAS</button><button class="danger" id="ztStop" disabled>■ DETENER</button><button id="ztRetryKo" disabled>↻ SOLO KO</button></div></div>
    </div>
    <div class="zt-progress-area"><div class="zt-progress-head"><div class="zt-phase" id="ztPhase">Preparado.</div><b id="ztPct">0%</b></div><div class="zt-progress"><div id="ztBar"></div></div><div class="zt-stats"><div class="zt-stat"><b id="ztDone">0/0</b><span>PROGRESO</span></div><div class="zt-stat ok"><b id="ztOk">0</b><span>OK</span></div><div class="zt-stat warn"><b id="ztWarn">0</b><span>AVISOS</span></div><div class="zt-stat ko"><b id="ztKo">0</b><span>KO</span></div><div class="zt-stat"><b id="ztCalls">0</b><span>LLAMADAS IA</span></div><div class="zt-stat"><b id="ztTokens">0</b><span>TOKENS</span></div><div class="zt-stat cost"><b id="ztCost">0,00 €</b><span>COSTE</span></div></div></div>
    <div class="zt-filters" id="ztFilters"></div><div class="zt-results" id="ztResults"><div class="zt-empty">Genera la batería y pulsa INICIAR PRUEBAS. FAST puede ejecutar cientos de comprobaciones sin gastar IA.</div></div>
    <div class="zt-foot"><span id="ztCert" class="zt-cert">Sin ejecutar.</span><span class="zt-history" id="ztHistory"></span></div>
  </div></div>`;}

  async function open(){if(!isGD())return;style();$('ceZuzuTestOverlay')?.remove();document.body.insertAdjacentHTML('beforeend',modal());bind();await loadPreview();}
  function close(){if(currentAbort)currentAbort.abort();currentAbort=null;$('ceZuzuTestOverlay')?.remove();}
  function bind(){
    $('ztClose').onclick=close;$('ceZuzuTestOverlay').addEventListener('click',e=>{if(e.target.id==='ceZuzuTestOverlay')close();});
    document.querySelectorAll('.zt-mode').forEach(b=>b.onclick=()=>selectMode(b.dataset.mode));
    $('ztGenerate').onclick=loadPreview;$('ztStart').onclick=()=>run(false);$('ztStop').onclick=stop;$('ztRetryKo').onclick=()=>run(true);$('ztReport').onclick=printReport;
    renderFilters();renderHistory();
  }
  function selectMode(mode){lastMode=mode;document.querySelectorAll('.zt-mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));$('ztMaxCost').disabled=mode==='FAST';$('ztMaxCases').disabled=mode==='FAST';if(mode==='FULL-CERT'&&num($('ztMaxCost').value)<.5)$('ztMaxCost').value='0.50';if(mode==='AI-SMOKE'&&num($('ztMaxCost').value)>.5)$('ztMaxCost').value='0.25';}
  async function loadPreview(){
    setPhase('Leyendo las tablas reales de ControlEvent y generando escenarios…');
    try{const r=await fetch('/api/zuzu-tests/preview',{cache:'no-store',headers:apiHeaders()});const d=await r.json();if(!r.ok)throw new Error(d.error||`HTTP ${r.status}`);preview=d;renderPreview();setPhase('Batería generada. Lista para ejecutar.');}
    catch(e){setPhase('No se pudo generar la batería: '+(e.message||e),true);}
  }
  function renderPreview(){const c=preview?.dataCounts||{},t=preview?.tests||{};$('ztData').innerHTML=[['Eventos',c.events],['Personas',c.people],['Productos',c.products],['Tiendas',c.stores],['Compras',c.purchases],['Ingresos',c.incomes],['FAST',t.FAST],['AI-SMOKE',t['AI-SMOKE']],['FULL-CERT',t['FULL-CERT']]].map(x=>`<span class="zt-pill">${esc(x[0])}: <strong>${fmtN(x[1])}</strong></span>`).join('');}
  function setPhase(t,err=false){const e=$('ztPhase');if(e){e.textContent=t;e.style.color=err?'#b91c1c':'#334155';}}
  function setRunning(on){$('ztStart').disabled=on;$('ztGenerate').disabled=on;$('ztStop').disabled=!on;document.querySelectorAll('.zt-mode').forEach(b=>b.disabled=on);}
  function resetRun(){rows=[];lastSummary=null;activeFilter='TODOS';renderFilters();$('ztResults').innerHTML='';updateProgress({done:0,total:0,ok:0,warn:0,ko:0,percent:0,costEur:0,calls:0,tokens:0});$('ztRetryKo').disabled=true;$('ztCert').textContent='Ejecutando…';$('ztCert').className='zt-cert';}
  function stop(){currentAbort?.abort();setPhase('Detención solicitada. No se lanzarán más pruebas.');}
  async function run(onlyKo){
    if(currentAbort)return; if(!preview)await loadPreview();
    const ids=onlyKo?rows.filter(r=>r.status==='KO').map(r=>r.id):[];if(onlyKo&&!ids.length)return;
    resetRun();lastMode=document.querySelector('.zt-mode.active')?.dataset.mode||lastMode;currentAbort=new AbortController();setRunning(true);setPhase(`${lastMode}: preparando ejecución…`);
    try{
      const res=await fetch('/api/zuzu-tests/run-stream',{method:'POST',headers:apiHeaders(),signal:currentAbort.signal,body:JSON.stringify({mode:lastMode,maxCostEur:num($('ztMaxCost').value)||.25,maxCases:num($('ztMaxCases').value)||24,caseIds:ids})});
      if(!res.ok){let d={};try{d=await res.json();}catch(_){}throw new Error(d.error||`HTTP ${res.status}`);}
      if(!res.body)throw new Error('El navegador no soporta la salida progresiva de la prueba.');
      const reader=res.body.getReader(),decoder=new TextDecoder();let buf='';
      while(true){const {done,value}=await reader.read();if(done)break;buf+=decoder.decode(value,{stream:true});let p;while((p=buf.indexOf('\n'))>=0){const line=buf.slice(0,p).trim();buf=buf.slice(p+1);if(line)handle(JSON.parse(line));}}
      if(buf.trim())handle(JSON.parse(buf.trim()));
    }catch(e){if(e.name==='AbortError')setPhase('Prueba detenida por el usuario.');else setPhase('Error de ejecución: '+(e.message||e),true);}
    finally{currentAbort=null;setRunning(false);}
  }
  function handle(msg){
    if(msg.type==='start'){setPhase(`${msg.mode}: ${fmtN(msg.total)} pruebas generadas desde datos reales. ${msg.mode==='FAST'?'Coste IA = 0 €':'Presupuesto máximo '+fmtE(msg.maxCostEur)}`);return;}
    if(msg.type==='case'){rows.push(msg.case);appendRow(msg.case);updateProgress(msg.progress||{});renderFilters();return;}
    if(msg.type==='budget'){setPhase(msg.message||'Presupuesto máximo alcanzado.');return;}
    if(msg.type==='summary'){lastSummary=msg;updateProgress(msg);finish(msg);return;}
    if(msg.type==='error'){setPhase(msg.error||'Error en la prueba',true);}
  }
  function updateProgress(p){const total=num(p.total),done=num(p.done),pct=total?Math.round(done*100/total):num(p.percent);$('ztBar').style.width=Math.max(0,Math.min(100,pct))+'%';$('ztPct').textContent=pct+'%';$('ztDone').textContent=`${fmtN(done)}/${fmtN(total)}`;$('ztOk').textContent=fmtN(p.ok);$('ztWarn').textContent=fmtN(p.warn);$('ztKo').textContent=fmtN(p.ko);$('ztCalls').textContent=fmtN(p.calls);$('ztTokens').textContent=fmtN(p.tokens);$('ztCost').textContent=fmtE(p.costEur);}
  function finish(s){const good=s.ko===0&&!s.aborted&&s.done>0;setPhase(s.aborted?'Ejecución detenida.':good?'Ejecución terminada sin KO.':'Ejecución terminada con incidencias.');$('ztCert').textContent=s.aborted?'⏹ PRUEBA DETENIDA':good?'🟢 CERTIFICACIÓN DEL MODO SUPERADA':`🔴 ${fmtN(s.ko)} KO · REVISAR`;$('ztCert').className='zt-cert '+(good?'good':'bad');$('ztRetryKo').disabled=!rows.some(r=>r.status==='KO');saveHistory(s);renderHistory();}
  function rowHtml(r){return `<div class="zt-row ${esc(r.status)}" data-status="${esc(r.status)}" data-group="${esc(r.group)}"><div class="zt-status">${esc(r.status)}</div><div class="zt-cell"><b>${esc(r.group)}</b><span>${esc(r.id)}</span></div><div class="zt-cell"><b>${esc(r.label)}</b><span>${esc(r.prompt||'')}</span></div><div class="zt-cell zt-expected"><b>Esperado</b><span>${esc(r.expected||'Regla/invariante satisfecha')}</span></div><div class="zt-cell zt-actual"><b>Obtenido</b><span>${esc(r.actual||'')}</span>${r.tools?.length?`<span>\nHerramientas: ${esc(r.tools.join(', '))}</span>`:''}</div><div class="zt-ms">${fmtN(r.durationMs)} ms${r.usage?`\n${fmtE(r.usage.costEur)}`:''}</div></div>`;}
  function appendRow(r){const box=$('ztResults');if(rows.length===1)box.innerHTML='';box.insertAdjacentHTML('beforeend',rowHtml(r));applyFilter();box.scrollTop=box.scrollHeight;}
  function groups(){return ['TODOS','KO','WARN',...Array.from(new Set(rows.map(r=>r.group).filter(Boolean)))];}
  function renderFilters(){$('ztFilters').innerHTML=groups().map(g=>`<button class="zt-filter ${activeFilter===g?'active':''}" data-f="${esc(g)}">${esc(g)}${g==='KO'?` (${rows.filter(r=>r.status==='KO').length})`:''}</button>`).join('');$('ztFilters').querySelectorAll('button').forEach(b=>b.onclick=()=>{activeFilter=b.dataset.f;renderFilters();applyFilter();});}
  function applyFilter(){document.querySelectorAll('#ztResults .zt-row').forEach(el=>{const show=activeFilter==='TODOS'||(activeFilter==='KO'&&el.dataset.status==='KO')||(activeFilter==='WARN'&&el.dataset.status==='WARN')||el.dataset.group===activeFilter;el.style.display=show?'grid':'none';});}
  function history(){try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');}catch(_){return[];}}
  function saveHistory(s){const h=history();h.unshift({at:new Date().toISOString(),mode:lastMode,done:s.done,total:s.total,ok:s.ok,warn:s.warn,ko:s.ko,costEur:s.costEur,calls:s.calls,tokens:s.tokens});localStorage.setItem(HISTORY_KEY,JSON.stringify(h.slice(0,20)));}
  function renderHistory(){const h=history();$('ztHistory').textContent=h.length?`Última: ${new Date(h[0].at).toLocaleString('es-ES')} · ${h[0].mode} · ${h[0].ko?`${h[0].ko} KO`:'0 KO'} · ${fmtE(h[0].costEur)}`:'Sin certificaciones guardadas en este navegador.';}
  function printReport(){
    const w=window.open('','_blank');if(!w)return;const s=lastSummary||{},date=new Date().toLocaleString('es-ES');const body=rows.map(r=>`<tr><td class="${esc(r.status)}">${esc(r.status)}</td><td>${esc(r.group)}</td><td>${esc(r.label)}</td><td>${esc(r.expected||'')}</td><td>${esc(r.actual||'')}</td></tr>`).join('');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>ControlEvent - ITV Zuzu</title><style>body{font-family:Arial,sans-serif;margin:28px;color:#0f172a}h1{color:#075985}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #cbd5e1;padding:5px;vertical-align:top}.OK{color:#15803d;font-weight:bold}.KO{color:#b91c1c;font-weight:bold}.WARN{color:#b45309;font-weight:bold}.summary{display:flex;gap:18px;flex-wrap:wrap;margin:12px 0 20px}.summary b{font-size:18px}@media print{button{display:none}}</style></head><body><h1>🧪 ITV de Zuzu · ${esc(lastMode)}</h1><p>${esc(date)} · Batería generada desde las tablas reales de ControlEvent · solo lectura</p><div class="summary"><span>OK <b>${fmtN(s.ok)}</b></span><span>AVISOS <b>${fmtN(s.warn)}</b></span><span>KO <b>${fmtN(s.ko)}</b></span><span>Llamadas IA <b>${fmtN(s.calls)}</b></span><span>Tokens <b>${fmtN(s.tokens)}</b></span><span>Coste <b>${fmtE(s.costEur)}</b></span></div><table><thead><tr><th>Estado</th><th>Grupo</th><th>Prueba</th><th>Esperado</th><th>Obtenido</th></tr></thead><tbody>${body}</tbody></table><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);w.document.close();
  }

  style(); setInterval(injectButton,1200); document.addEventListener('DOMContentLoaded',injectButton); injectButton();
})();
