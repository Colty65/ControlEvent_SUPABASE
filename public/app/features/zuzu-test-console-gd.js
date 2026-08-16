/* ControlEvent v1.0_exp · PRUEBAS ZUZU · Consola GD.
   Batería autogenerada desde datos reales. Solo lectura. */
(function(){
  'use strict';
  if(window.__ceZuzuTestConsoleGd) return;
  window.__ceZuzuTestConsoleGd=true;

  const $=id=>document.getElementById(id);
  const text=v=>v==null?'':String(v);
  const trim=v=>text(v).trim();
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0;};
  const esc=v=>text(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fmtN=n=>new Intl.NumberFormat('es-ES').format(num(n));
  const fmtE=n=>new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:4}).format(num(n))+' €';
  const MODES=['FAST','AI-SMOKE','FULL-CERT'];
  const HISTORY_KEY='controlevent_v1_0_exp_zuzu_test_history';
  const modeCache={FAST:{rows:[],summary:null},'AI-SMOKE':{rows:[],summary:null},'FULL-CERT':{rows:[],summary:null}};

  let currentAbort=null,currentFetchAbort=null,currentCaseCancel=null,currentReader=null,preview=null,rows=[],lastSummary=null,activeFilter='TODOS',lastMode='FAST';
  let streamWatchdog=null,lastStreamAt=0,currentCase=null,stopRequested=false,uiRunning=false,controlGuard=null;
  let batterySeed=0,batteryClock='',currentRunKey='',historyRuns=[],historyStorage='',historicReplayKey='';
  let authEventUser=null;

  function renewBatterySeed(){
    const d=new Date(),sec=d.getSeconds(),slot=d.getHours()*3600+d.getMinutes()*60+sec;
    // El segundo local pesa de forma explícita en la semilla. Después se mezcla con hora/minuto/día
    // para obtener siempre un entero reproducible que sirve para escoger índices dentro de cada tabla.
    let seed=(Math.imul(sec+1,2654435761)^Math.imul(slot+17,2246822519)^Math.imul(d.getDate()+31,3266489917))>>>0;
    batterySeed=seed||0x6d2b79f5;batteryClock=d.toLocaleTimeString('es-ES');return batterySeed;
  }


  function startControlGuard(){
    stopControlGuard();
    controlGuard=setInterval(()=>{
      if(!$('ceZuzuTestOverlay'))return;
      for(const id of ['ztStart','ztGenerate','ztStop','ztNext','ztRetry','ztDownload','ztPrint','ztClose','ztHistoryView','ztHistoryReplay','ztReplaySeed']){const b=$(id);if(b){b.disabled=false;b.style.pointerEvents='auto';}}
      document.querySelectorAll('#ceZuzuTestOverlay .zt-mode').forEach(b=>{b.disabled=false;b.style.pointerEvents='auto';});
    },500);
  }
  function stopControlGuard(){if(controlGuard)clearInterval(controlGuard);controlGuard=null;}

  function auth(){
    // Fuente principal: la fachada estable de CE, que expone el authUser léxico real.
    // El usuario recibido por controlevent:auth-changed se conserva además como respaldo inmediato.
    try{
      const appUser=window.ControlEventApp?.authUser||window.ControlEventRuntime?.app?.authUser||null;
      if(authEventUser||appUser||window.authUser||window.__CONTROL_EVENT_USER__) return authEventUser||appUser||window.authUser||window.__CONTROL_EVENT_USER__;
      return Function('return (typeof authUser!=="undefined" && authUser) ? authUser : null')();
    }catch(_){return authEventUser||window.ControlEventApp?.authUser||window.authUser||window.__CONTROL_EVENT_USER__||null;}
  }
  function role(){const u=auth()||{};return text(u.nivel||u.Nivel).trim().toUpperCase();}
  function isGD(){return role()==='GD';}
  function actorHeader(){const u=auth()||{};return encodeURIComponent(JSON.stringify({nivel:role(),identificacion:text(u.identificacion||u.Identificacion),nombre:text(u.nombre||u.Nombre)}));}
  function apiHeaders(extra={}){return {'Content-Type':'application/json','X-ControlEvent-Feature':'zuzu-test-console-v2','X-ControlEvent-Actor':actorHeader(),...extra};}

  function style(){
    if($('ceZuzuTestConsoleStyle'))return;
    const s=document.createElement('style');s.id='ceZuzuTestConsoleStyle';s.textContent=`
      #ceZuzuTestBtn.ce-zuzu-test-tab{border-color:#7dd3fc!important;background:#eff6ff!important;color:#075985!important}
      #ceZuzuTestOverlay{position:fixed;inset:0;width:100vw;height:100vh;max-width:none;max-height:none;margin:0;border:0;padding:12px;background:transparent;overflow:hidden}#ceZuzuTestOverlay[open]{display:flex;align-items:center;justify-content:center}#ceZuzuTestOverlay::backdrop{background:rgba(15,23,42,.62)}
      #ceZuzuTestOverlay *{box-sizing:border-box}
      #ceZuzuTestOverlay .zt-modal{width:min(1500px,98vw);height:min(940px,96vh);background:#fff;border:2px solid #0ea5e9;border-radius:20px;box-shadow:0 26px 90px rgba(15,23,42,.42);display:flex;flex-direction:column;overflow:hidden;color:#0f172a}
      #ceZuzuTestOverlay button{font-family:inherit;color:#0f172a!important;-webkit-text-fill-color:currentColor!important;opacity:1;filter:none!important;pointer-events:auto!important}
      #ceZuzuTestOverlay button:disabled{opacity:.48!important;cursor:not-allowed!important}
      .zt-head{display:flex;align-items:center;gap:10px;padding:11px 14px;background:linear-gradient(90deg,#eff6ff,#fff);border-bottom:1px solid #bae6fd;min-height:58px}
      .zt-head h2{margin:0;color:#075985;font-size:22px}.zt-head .zt-sub{color:#475569;font-size:12px;font-weight:800}.zt-spacer{flex:1}.zt-head-actions{display:flex;gap:7px;align-items:center}
      .zt-action{border:1px solid #94a3b8!important;background:#fff!important;border-radius:10px!important;padding:8px 11px!important;font-weight:950!important;cursor:pointer!important;min-width:108px!important;white-space:nowrap!important}
      .zt-action.report{background:#0f766e!important;border-color:#0f766e!important;color:#fff!important;-webkit-text-fill-color:#fff!important}.zt-action.print{background:#475569!important;border-color:#475569!important;color:#fff!important;-webkit-text-fill-color:#fff!important}.zt-action.close{min-width:92px!important;color:#991b1b!important;border-color:#fecaca!important}
      .zt-top{display:grid;grid-template-columns:minmax(360px,1.03fr) minmax(520px,1.55fr);gap:9px;padding:9px 11px;border-bottom:1px solid #e2e8f0;background:#f8fafc}
      .zt-panel{background:#fff;border:1px solid #dbeafe;border-radius:13px;padding:9px}.zt-panel h3{margin:0 0 7px;color:#075985;font-size:13px}
      .zt-data{display:flex;gap:5px;flex-wrap:wrap}.zt-pill{border-radius:999px;background:#f1f5f9;border:1px solid #cbd5e1;padding:4px 8px;font-size:11px;font-weight:850;color:#334155}.zt-pill strong{color:#0f172a}
      .zt-modes{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.zt-mode{position:relative;border:1px solid #cbd5e1!important;background:#fff!important;border-radius:12px!important;padding:8px 9px!important;cursor:pointer!important;text-align:left!important;min-height:66px}.zt-mode.active{border-color:#0ea5e9!important;background:#eff6ff!important;box-shadow:0 0 0 2px rgba(14,165,233,.12)}.zt-mode b{display:block;font-size:12px}.zt-mode small{display:block;color:#64748b;margin-top:3px;line-height:1.2}.zt-mode .free{color:#15803d}.zt-mode .paid{color:#b45309}.zt-mode-status{position:absolute;right:7px;top:6px;font-style:normal;font-size:9px;font-weight:950;padding:2px 5px;border-radius:999px;background:#e2e8f0;color:#475569}.zt-mode-status.good{background:#dcfce7;color:#166534}.zt-mode-status.warn{background:#fef3c7;color:#92400e}.zt-mode-status.bad{background:#fee2e2;color:#991b1b}
      .zt-controls{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:7px}.zt-controls button{border:1px solid #94a3b8!important;background:#fff!important;border-radius:9px!important;padding:7px 10px!important;font-weight:950!important;cursor:pointer!important;white-space:nowrap!important}.zt-controls .primary{background:#0284c7!important;color:#fff!important;border-color:#0284c7!important}.zt-controls .danger{background:#fff7f7!important;color:#b91c1c!important;border-color:#fca5a5!important}.zt-controls .danger.running{background:#dc2626!important;color:#fff!important;-webkit-text-fill-color:#fff!important;border-color:#dc2626!important;box-shadow:0 0 0 2px rgba(220,38,38,.12)!important}.zt-controls .next{background:#eef2ff!important;color:#3730a3!important;border-color:#a5b4fc!important}.zt-controls label{font-size:11px;font-weight:850;color:#475569}.zt-controls input,.zt-controls select{border:1px solid #cbd5e1;border-radius:8px;padding:6px;font-weight:850;background:#fff;color:#0f172a}.zt-controls input{width:78px}.zt-controls .grow{margin-left:auto}
      .zt-progress-area{padding:8px 11px;border-bottom:1px solid #e2e8f0;background:#fff}.zt-progress-head{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center}.zt-progress{height:11px;background:#e2e8f0;border-radius:999px;overflow:hidden}.zt-progress>div{height:100%;width:0;background:linear-gradient(90deg,#0284c7,#22c55e);transition:width .15s}.zt-phase{font-size:12px;font-weight:900;color:#334155;min-height:18px}.zt-live{font-size:10px;color:#64748b;font-weight:850;margin-top:3px;min-height:14px}.zt-stats{display:flex;gap:7px;flex-wrap:wrap;margin-top:7px}.zt-stat{min-width:110px;border:1px solid #e2e8f0;border-radius:10px;padding:6px 9px;background:#f8fafc}.zt-stat b{display:block;font-size:17px}.zt-stat span{font-size:10px;color:#64748b;font-weight:850}.zt-stat.ok b{color:#15803d}.zt-stat.ko b{color:#b91c1c}.zt-stat.warn b{color:#c2410c}.zt-stat.cost b{color:#7c3aed}
      .zt-filters{display:flex;gap:5px;flex-wrap:wrap;padding:6px 11px;background:#f8fafc;border-bottom:1px solid #e2e8f0}.zt-filter{border:1px solid #cbd5e1!important;background:#fff!important;border-radius:999px!important;padding:4px 9px!important;font-size:10px!important;font-weight:900!important;cursor:pointer!important}.zt-filter.active{background:#0f172a!important;color:#fff!important;border-color:#0f172a!important}
      .zt-results{flex:1;min-height:180px;overflow:auto;padding:7px 11px;background:#f8fafc}.zt-row{display:grid;grid-template-columns:58px 116px minmax(220px,1.05fr) minmax(220px,.95fr) minmax(280px,1.45fr) 78px;gap:7px;align-items:start;border:1px solid #e2e8f0;border-left:5px solid #94a3b8;border-radius:10px;background:#fff;padding:7px 8px;margin-bottom:6px;font-size:11px}.zt-row.OK{border-left-color:#22c55e}.zt-row.KO{border-left-color:#ef4444;background:#fff7f7}.zt-row.WARN{border-left-color:#f59e0b;background:#fffaf0}.zt-status{font-weight:950}.zt-row.OK .zt-status{color:#15803d}.zt-row.KO .zt-status{color:#b91c1c}.zt-row.WARN .zt-status{color:#b45309}.zt-cell b{display:block;margin-bottom:2px}.zt-cell span{color:#475569;white-space:pre-wrap;overflow-wrap:anywhere}.zt-ms{text-align:right;color:#64748b;font-weight:800;white-space:pre-line}.zt-empty{padding:34px;text-align:center;color:#64748b;font-weight:850}
      .zt-foot{display:flex;align-items:center;gap:8px;padding:8px 11px;border-top:1px solid #e2e8f0;background:#fff}.zt-cert{font-weight:950}.zt-cert.good{color:#15803d}.zt-cert.warn{color:#b45309}.zt-cert.bad{color:#b91c1c}.zt-history{margin-left:auto;font-size:10px;color:#64748b;font-weight:800}.zt-history-box{margin-top:7px;padding-top:7px;border-top:1px dashed #cbd5e1}.zt-history-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.zt-history-row select{min-width:260px;max-width:460px}.zt-history-note{font-size:10px;color:#64748b;font-weight:750;margin-top:4px}
      @media(max-width:980px){.zt-top{grid-template-columns:1fr}.zt-row{grid-template-columns:55px 90px 1fr}.zt-row .zt-expected,.zt-row .zt-actual{grid-column:3}.zt-ms{grid-column:1}.zt-modes{grid-template-columns:1fr}.zt-head .zt-sub{display:none}}
    `;document.head.appendChild(s);
  }

  function injectButton(){
    const b=$('ceZuzuTestBtn');if(!b)return;
    const visible=isGD();
    b.classList.toggle('hidden',!visible);
    // IMPORTANTE: varios estilos legacy de CE fuerzan #mainTabs .tab {display:flex!important}.
    // La visibilidad GD debe ganar con un inline !important; de lo contrario el icono puede verse
    // aunque el rol aún no esté resuelto y al pulsarlo open() se niega correctamente a abrir.
    b.style.setProperty('display',visible?'flex':'none','important');
    b.style.setProperty('pointer-events',visible?'auto':'none','important');
    b.setAttribute('aria-hidden',visible?'false':'true');
    if(visible){
      b.disabled=false;b.removeAttribute('disabled');b.setAttribute('aria-disabled','false');b.tabIndex=0;
      if(!b.__ztBound){b.__ztBound=true;b.onclick=e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();open();return false;};}
    }else{
      b.setAttribute('aria-disabled','true');b.tabIndex=-1;
    }
  }
  window.ceRefreshZuzuTestButton=injectButton;
  window.ceOpenZuzuTest=()=>{injectButton();if(!isGD())return false;open();return false;};

  // Delegación en captura: aunque algún render legacy reemplace/neutralice onclick de las pestañas,
  // PRUEBAS ZUZU sigue abriendo. Se intercepta antes que la navegación genérica de #mainTabs.
  document.addEventListener('click',e=>{
    const b=e.target?.closest?.('#ceZuzuTestBtn');if(!b)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
    injectButton();if(isGD())open();
  },true);


  function modal(){return `<dialog id="ceZuzuTestOverlay"><div class="zt-modal">
    <div class="zt-head"><h2>🧪 ITV de Zuzu</h2><span class="zt-sub">Batería autogenerada desde tablas reales · SOLO LECTURA · solo GD</span><div class="zt-spacer"></div><div class="zt-head-actions"><button class="zt-action report" id="ztDownload">⬇ INFORME</button><button class="zt-action print" id="ztPrint">🖨 PDF</button><button class="zt-action close" id="ztClose">✕ CERRAR</button></div></div>
    <div class="zt-top">
      <div class="zt-panel"><h3>Datos reales detectados</h3><div id="ztData" class="zt-data"><span class="zt-pill">Cargando datos…</span></div><div id="ztSeedInfo" class="zt-live" style="margin:6px 0 0"></div><div class="zt-controls"><button id="ztGenerate">↻ NUEVA BATERÍA / ACTUALIZAR DATOS</button></div>
        <div class="zt-history-box"><h3 style="margin-top:0">Histórico reproducible</h3><div class="zt-history-row"><select id="ztHistorySelect"><option value="">Cargando baterías guardadas…</option></select><button id="ztHistoryView">VER RESULTADOS</button><button id="ztHistoryReplay">▶ REPETIR BATERÍA EXACTA</button></div><div class="zt-history-row" style="margin-top:6px"><label style="font-size:10px;font-weight:900;color:#475569">Semilla exacta <input id="ztSeedReplayInput" inputmode="numeric" placeholder="p.ej. 974813527" style="width:140px;border:1px solid #cbd5e1;border-radius:8px;padding:6px;font-weight:850"></label><button id="ztReplaySeed">↻ REGENERAR SEMILLA</button></div><div id="ztHistoryStorage" class="zt-history-note"></div></div>
      </div>
      <div class="zt-panel"><h3>Modo de prueba</h3><div class="zt-modes">
        <button class="zt-mode active" data-mode="FAST"><em id="ztModeStatusFAST" class="zt-mode-status">Pendiente</em><b>FAST · CE</b><small class="free">0 € · comprobaciones reales sin IA.</small></button>
        <button class="zt-mode" data-mode="AI-SMOKE"><em id="ztModeStatusAI-SMOKE" class="zt-mode-status">Pendiente</em><b>AI-SMOKE</b><small class="paid">Interpretación y herramientas de todos los ámbitos.</small></button>
        <button class="zt-mode" data-mode="FULL-CERT"><em id="ztModeStatusFULL-CERT" class="zt-mode-status">Pendiente</em><b>FULL-CERT</b><small class="paid">Conversaciones + ORÁCULO FUERTE.</small></button>
      </div><div class="zt-controls"><label>Máx. coste <input id="ztMaxCost" type="number" min="0.02" max="5" step="0.05" value="0.25"> €</label><label>Casos IA <select id="ztMaxCases"><option>24</option><option selected>36</option><option>48</option></select></label><button class="primary" id="ztStart">▶ INICIAR</button><button class="danger" id="ztStop">■ DETENER</button><button id="ztRetry">↻ REPETIR KO/AVISOS</button><button class="next grow" id="ztNext">SIGUIENTE CHEQUEO →</button></div></div>
    </div>
    <div class="zt-progress-area"><div class="zt-progress-head"><div class="zt-phase" id="ztPhase">Preparado.</div><b id="ztPct">0%</b></div><div class="zt-progress"><div id="ztBar"></div></div><div class="zt-live" id="ztLive"></div><div class="zt-stats"><div class="zt-stat"><b id="ztDone">0/0</b><span>PROGRESO</span></div><div class="zt-stat ok"><b id="ztOk">0</b><span>OK</span></div><div class="zt-stat warn"><b id="ztWarn">0</b><span>AVISOS</span></div><div class="zt-stat ko"><b id="ztKo">0</b><span>KO</span></div><div class="zt-stat"><b id="ztCalls">0</b><span>LLAMADAS IA</span></div><div class="zt-stat"><b id="ztTokens">0</b><span>TOKENS</span></div><div class="zt-stat cost"><b id="ztCost">0,00 €</b><span>COSTE</span></div></div></div>
    <div class="zt-filters" id="ztFilters"></div><div class="zt-results" id="ztResults"><div class="zt-empty">Pulsa INICIAR. Al terminar puedes pasar al siguiente chequeo sin cerrar esta ventana.</div></div>
    <div class="zt-foot"><span id="ztCert" class="zt-cert">Sin ejecutar.</span><span class="zt-history" id="ztHistory"></span></div>
  </div></dialog>`;}


  async function open(){
    if(!isGD())return;style();$('ceZuzuTestOverlay')?.remove();document.body.insertAdjacentHTML('beforeend',modal());const dlg=$('ceZuzuTestOverlay');try{dlg?.showModal?.();}catch(_){dlg?.setAttribute('open','');}
    bind();startControlGuard();restoreMode(lastMode);
    // Si el usuario cierra y vuelve a abrir la ITV en la misma sesión, NO regeneramos ni
    // borramos la batería/resultados. Solo sincronizamos el histórico. La primera entrada sí
    // crea una batería si todavía no existe ninguna en memoria.
    if(preview){renderPreview();renderModeStatuses();restoreMode(lastMode);await loadServerHistory();setPhase(`Batería actual recuperada · semilla ${batterySeed}.`);}
    else await Promise.all([loadPreview(),loadServerHistory()]);
  }
  function close(){stopStreamWatchdog();stopControlGuard();stopRequested=true;try{currentCaseCancel?.();}catch(_){}try{currentFetchAbort?.abort();}catch(_){}try{currentReader?.cancel();}catch(_){}try{currentAbort?.abort();}catch(_){}currentAbort=null;currentFetchAbort=null;currentCaseCancel=null;currentReader=null;const dlg=$('ceZuzuTestOverlay');try{dlg?.close?.();}catch(_){}dlg?.remove();}

  function bind(){
    $('ztClose').onclick=close;$('ceZuzuTestOverlay').addEventListener('click',e=>{if(e.target.id==='ceZuzuTestOverlay')close();});
    document.querySelectorAll('.zt-mode').forEach(b=>b.onclick=()=>selectMode(b.dataset.mode));
    $('ztGenerate').onclick=()=>loadPreview(true);$('ztStart').onclick=()=>run(false);$('ztRetry').onclick=()=>run(true);$('ztNext').onclick=nextMode;$('ztDownload').onclick=downloadReport;$('ztPrint').onclick=printReport;$('ztHistoryView').onclick=loadHistoricalRun;$('ztHistoryReplay').onclick=replayHistoricalRun;$('ztReplaySeed').onclick=replayManualSeed;
    // DETENER se escucha en captura y nunca depende del estado disabled de un botón.
    $('ceZuzuTestOverlay').addEventListener('pointerdown',e=>{const b=e.target?.closest?.('#ztStop');if(!b)return;e.preventDefault();e.stopPropagation();stop();},{capture:true});
    renderFilters();renderHistory();renderModeStatuses();
  }

  function selectMode(mode){
    if(uiRunning){setPhase('Hay una ejecución en curso. Pulsa DETENER antes de cambiar de chequeo.');return;}lastMode=MODES.includes(mode)?mode:'FAST';document.querySelectorAll('.zt-mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===lastMode));
    $('ztMaxCost').readOnly=lastMode==='FAST';$('ztMaxCases').setAttribute('aria-disabled',lastMode==='FAST'?'true':'false');
    if(lastMode==='FULL-CERT'&&num($('ztMaxCost').value)<.5)$('ztMaxCost').value='0.50';
    if(lastMode==='AI-SMOKE'&&num($('ztMaxCost').value)>.5)$('ztMaxCost').value='0.25';
    restoreMode(lastMode);
  }
  function nextMode(){if(uiRunning){setPhase('La prueba sigue ejecutándose. Pulsa DETENER antes de pasar al siguiente chequeo.');return;}const i=MODES.indexOf(lastMode);selectMode(MODES[(i+1)%MODES.length]);}

  async function fetchJson(url,options={},timeoutMs=30000){
    const c=new AbortController(),t=setTimeout(()=>c.abort(),timeoutMs);try{const r=await fetch(url,{...options,signal:c.signal});const d=await r.json();if(!r.ok)throw new Error(d.error||`HTTP ${r.status}`);return d;}finally{clearTimeout(t);}
  }
  async function loadPreview(forceNew=false){
    if(uiRunning){setPhase('Hay una ejecución en curso. Pulsa DETENER antes de generar otra batería.');return;}
    if(forceNew||!batterySeed)renewBatterySeed();setPhase('Leyendo tablas reales y generando una batería nueva…');
    try{historicReplayKey='';preview=await fetchJson(`/api/zuzu-tests/preview?seed=${encodeURIComponent(batterySeed)}`,{cache:'no-store',headers:apiHeaders()},45000);batterySeed=num(preview?.seed)||batterySeed;currentRunKey=`seed-${batterySeed}-${Date.now()}`;for(const mode of MODES)modeCache[mode]={rows:[],summary:null};rows=[];lastSummary=null;renderPreview();renderModeStatuses();restoreMode(lastMode);await saveServerRun();await loadServerHistory();setPhase('Batería nueva preparada y guardada. La semilla permite regenerar la selección; el histórico guarda además la batería exacta para repetir literalmente sus preguntas aunque cambien las plantillas.');}
    catch(e){setPhase(e.name==='AbortError'?'La lectura de datos tardó demasiado. Vuelve a pulsar NUEVA BATERÍA.':'No se pudo generar la batería: '+(e.message||e),true);}
  }
  function renderPreview(){const c=preview?.dataCounts||{},t=preview?.tests||{};$('ztData').innerHTML=[['Eventos',c.events],['Personas',c.people],['Productos',c.products],['Tiendas',c.stores],['Compras',c.purchases],['Ingresos',c.incomes],['DOC',c.documents],['Fototickets',c.ticketImages],['Donaciones',c.donationLines],['Hitos',c.hitos],['LG',c.lgs],['FAST',t.FAST],['AI-SMOKE',t['AI-SMOKE']],['FULL-CERT',t['FULL-CERT']]].map(x=>`<span class="zt-pill">${esc(x[0])}: <strong>${fmtN(x[1])}</strong></span>`).join('');if($('ztSeedInfo'))$('ztSeedInfo').textContent=`Batería ${batteryClock||'reloj local'} · semilla ${batterySeed} · eventos/personas elegidos por índices reproducibles.`;}

  function setPhase(t,err=false){const e=$('ztPhase');if(e){e.textContent=t;e.style.color=err?'#b91c1c':'#334155';}}
  function setLive(t=''){if($('ztLive'))$('ztLive').textContent=t;}
  function setRunning(on){
    uiRunning=!!on;
    // Ningún botón principal se deshabilita físicamente. Los handlers deciden qué hacer según uiRunning.
    // Esto evita que un error o una respuesta tardía deje la ITV con disabled=true hasta cerrar la ventana.
    for(const id of ['ztStart','ztGenerate','ztStop','ztNext','ztRetry']){const b=$(id);if(b){b.disabled=false;b.style.pointerEvents='auto';}}
    document.querySelectorAll('.zt-mode').forEach(b=>{b.disabled=false;b.style.pointerEvents='auto';b.setAttribute('aria-busy',on?'true':'false');});
    const st=$('ztStop');if(st){st.classList.toggle('running',!!on);st.style.opacity=on?'1':'.72';st.setAttribute('aria-disabled','false');}
    const start=$('ztStart');if(start){start.style.opacity=on?'.62':'1';start.setAttribute('aria-busy',on?'true':'false');}
  }
  function releaseControls(reason=''){
    // Liberación idempotente: se llama también desde finish/summary para que ningún error de postproceso deje la ITV bloqueada.
    uiRunning=false;
    setRunning(false);
    if(reason)setLive(reason);
  }
  function clearCurrentView(){rows=[];lastSummary=null;activeFilter='TODOS';renderFilters();$('ztResults').innerHTML='<div class="zt-empty">Sin resultados todavía para este modo.</div>';updateProgress({done:0,total:0,ok:0,warn:0,ko:0,percent:0,costEur:0,calls:0,tokens:0});setRetryState();$('ztCert').textContent='Sin ejecutar.';$('ztCert').className='zt-cert';setLive('');}
  function resetRun(){clearCurrentView();$('ztResults').innerHTML='';$('ztCert').textContent='Ejecutando…';currentCase=null;}
  function cacheCurrent(){modeCache[lastMode]={rows:rows.slice(),summary:lastSummary?{...lastSummary}:null};renderModeStatuses();}
  function restoreMode(mode){
    const c=modeCache[mode]||{rows:[],summary:null};rows=c.rows.slice();lastSummary=c.summary?{...c.summary}:null;activeFilter='TODOS';renderFilters();
    const box=$('ztResults');if(!box)return;if(rows.length)box.innerHTML=rows.map(rowHtml).join('');else box.innerHTML='<div class="zt-empty">Sin resultados todavía para este modo. Pulsa INICIAR.</div>';
    applyFilter();if(lastSummary){updateProgress(lastSummary);renderFinishState(lastSummary,false);}else{updateProgress({done:0,total:0,ok:0,warn:0,ko:0,percent:0,costEur:0,calls:0,tokens:0});$('ztCert').textContent='Sin ejecutar.';$('ztCert').className='zt-cert';setPhase('Modo '+mode+' preparado.');}
    setRetryState();setLive('');
  }

  function stop(){
    if(!uiRunning&&!currentAbort&&!currentFetchAbort&&!currentCaseCancel){setPhase('No hay ninguna ejecución activa que detener.');setLive('');return;}
    stopRequested=true;
    try{currentCaseCancel?.();}catch(_){}
    try{currentFetchAbort?.abort();}catch(_){}
    try{currentReader?.cancel();}catch(_){}
    try{currentAbort?.abort();}catch(_){}
    setPhase('Detención solicitada. El caso actual queda cancelado y no se lanzarán más pruebas.');setLive('Cancelando el caso actual…');
  }
  function startStreamWatchdog(){stopStreamWatchdog();lastStreamAt=Date.now();streamWatchdog=setInterval(()=>{if(!currentAbort)return;const silent=Date.now()-lastStreamAt;if(silent>35000){currentAbort.abort();setPhase('La conexión de la ITV dejó de enviar señal durante 35 s. Se ha cortado para que la ventana no quede bloqueada.',true);setLive('Puedes volver a ejecutar este modo sin cerrar la ITV.');}},5000);}
  function stopStreamWatchdog(){if(streamWatchdog)clearInterval(streamWatchdog);streamWatchdog=null;}

  async function run(onlyIssues){
    if(uiRunning){setPhase('Ya hay una ejecución en curso. Usa DETENER si quieres interrumpirla.');return;}if(!preview)await loadPreview();if(!preview)return;
    lastMode=document.querySelector('.zt-mode.active')?.dataset.mode||lastMode;
    if(lastMode==='FAST') return runFastStream(onlyIssues);
    return runPaidCases(onlyIssues);
  }

  async function runFastStream(onlyIssues){
    const ids=onlyIssues?rows.filter(r=>r.status==='KO'||r.status==='WARN').map(r=>r.id):[];if(onlyIssues&&!ids.length)return;
    resetRun();stopRequested=false;currentAbort=new AbortController();setRunning(true);setPhase(historicReplayKey?'FAST: recalculando invariantes actuales con la semilla histórica (las preguntas literales se aplican en AI-SMOKE/FULL-CERT)…':'FAST: preparando ejecución…');startStreamWatchdog();
    try{
      const res=await fetch('/api/zuzu-tests/run-stream',{method:'POST',headers:apiHeaders(),signal:currentAbort.signal,body:JSON.stringify({mode:'FAST',caseIds:ids,seed:batterySeed})});
      if(!res.ok){let d={};try{d=await res.json();}catch(_){}throw new Error(d.error||`HTTP ${res.status}`);}if(!res.body)throw new Error('El navegador no soporta salida progresiva.');
      const reader=res.body.getReader();currentReader=reader;const decoder=new TextDecoder();let buf='';
      while(true){const {done,value}=await reader.read();lastStreamAt=Date.now();if(done)break;buf+=decoder.decode(value,{stream:true});let p;while((p=buf.indexOf('\n'))>=0){const line=buf.slice(0,p).trim();buf=buf.slice(p+1);if(line){try{handle(JSON.parse(line));}catch(err){console.warn('ITV línea no analizable',err,line);}}}}
      if(buf.trim())handle(JSON.parse(buf.trim()));
    }catch(e){if(e.name==='AbortError'||stopRequested){setPhase('Prueba detenida. Puedes reanudar o cambiar de chequeo sin cerrar la ventana.');}else setPhase('Error de ejecución: '+(e.message||e),true);}
    finally{stopStreamWatchdog();currentReader=null;currentAbort=null;releaseControls();cacheCurrent();saveServerRun();}
  }

  function issueIds(){return new Set(rows.filter(r=>r.status==='KO'||r.status==='WARN').map(r=>String(r.id)));}
  function paidCases(onlyIssues){
    let list=Array.isArray(preview?.cases?.[lastMode])?preview.cases[lastMode].slice():[];
    if(onlyIssues){const ids=issueIds();list=list.filter(c=>ids.has(String(c.id)));}
    const max=Math.max(1,num($('ztMaxCases').value)||24);return list.slice(0,max);
  }
  function localCaseOutcome(c,status,actual,usage={}){return{id:c.id,group:c.group||'IA',label:c.label||c.prompt,prompt:c.prompt||'',expected:c.expected||'Regla/invariante satisfecha',actual,status,usage,durationMs:0};}

  async function fetchPaidCase(caseDef,conversationState,timeoutMs){
    const child=new AbortController();currentFetchAbort=child;
    const masterAbort=()=>child.abort();currentAbort?.signal?.addEventListener?.('abort',masterAbort,{once:true});
    let timeoutId=null,cancelResolve=null;
    const cancelPromise=new Promise(resolve=>{cancelResolve=()=>resolve({kind:'stopped'});currentCaseCancel=cancelResolve;});
    const endpoint=historicReplayKey?`/api/zuzu-tests/history/${encodeURIComponent(historicReplayKey)}/run-case`:'/api/zuzu-tests/run-case';
    const networkPromise=fetch(endpoint,{method:'POST',headers:apiHeaders(),signal:child.signal,body:JSON.stringify({mode:lastMode,caseId:caseDef.id,conversationState:conversationState||{},seed:batterySeed})})
      .then(async res=>{let d={};try{d=await res.json();}catch(_){}if(!res.ok)throw new Error(d.error||`HTTP ${res.status}`);return{kind:'ok',data:d};})
      .catch(error=>({kind:'error',error}));
    const timeoutPromise=new Promise(resolve=>{timeoutId=setTimeout(()=>resolve({kind:'timeout'}),timeoutMs);});
    const winner=await Promise.race([networkPromise,timeoutPromise,cancelPromise]);
    if(winner.kind==='timeout'||winner.kind==='stopped')try{child.abort();}catch(_){}
    if(timeoutId)clearTimeout(timeoutId);currentAbort?.signal?.removeEventListener?.('abort',masterAbort);currentFetchAbort=null;currentCaseCancel=null;
    return winner;
  }

  async function runPaidCases(onlyIssues){
    const cases=paidCases(onlyIssues);if(!cases.length){setPhase(onlyIssues?'No hay KO/avisos que repetir.':'No hay casos generados para este modo.',true);return;}
    resetRun();stopRequested=false;currentAbort=new AbortController();setRunning(true);
    const total=cases.length,maxCost=Math.max(.02,num($('ztMaxCost').value)||.25),reserve=lastMode==='AI-SMOKE'?.012:.015,clientTimeout=lastMode==='AI-SMOKE'?46000:50000;
    let ok=0,warn=0,ko=0,done=0,costEur=0,calls=0,tokens=0,budgetStopped=false,conversationState={previousInteractionId:'',history:[],scenario:''};
    setPhase(`${lastMode}: ${fmtN(total)} casos · ejecución troceada, una petición corta por caso. Presupuesto máximo ${fmtE(maxCost)}.`);
    try{
      for(let i=0;i<cases.length;i++){
        if(stopRequested||currentAbort.signal.aborted)break;
        if(costEur>0&&costEur+reserve>maxCost){budgetStopped=true;setPhase(`Presupuesto protegido: no se inicia el caso ${i+1}. Coste acumulado ${fmtE(costEur)}.`);break;}
        const c=cases[i];currentCase=c;
        if(lastMode==='FULL-CERT'&&conversationState.scenario&&conversationState.scenario!==c.scenario)conversationState={previousInteractionId:'',history:[],scenario:c.scenario||''};
        const started=Date.now();let elapsed=0;setLive(`Procesando ${i+1}/${total} · ${c.group||''} · ${c.label||c.prompt||''} · 0 s`);
        const ticker=setInterval(()=>{elapsed=Math.round((Date.now()-started)/1000);setLive(`Procesando ${i+1}/${total} · ${c.group||''} · ${c.label||c.prompt||''} · ${elapsed} s · DETENER está disponible`);},1000);
        const got=await fetchPaidCase(c,conversationState,clientTimeout);clearInterval(ticker);
        if(got.kind==='stopped'||stopRequested||currentAbort.signal.aborted)break;
        let r;
        if(got.kind==='timeout'){
          r=localCaseOutcome(c,'WARN',`TIMEOUT CLIENTE: la petición no terminó en ${Math.round(clientTimeout/1000)} s. Se abandona solo este caso y se continúa con el siguiente.`,{calls:1,tokens:0,costEur:reserve});r.timeout=true;
        }else if(got.kind==='error'){
          if(got.error?.name==='AbortError'){r=localCaseOutcome(c,'WARN','Petición cancelada por el navegador. Se continúa con el siguiente caso.',{calls:0,tokens:0,costEur:0});}
          else r=localCaseOutcome(c,'KO',got.error?.message||String(got.error),{calls:0,tokens:0,costEur:0});
        }else{
          r=got.data?.case||localCaseOutcome(c,'KO','Respuesta del servidor sin resultado de prueba.',{});
          if(lastMode==='FULL-CERT')conversationState=got.data?.conversationState||{previousInteractionId:'',history:[],scenario:c.scenario||''};
        }
        r.durationMs=num(r.durationMs)||Date.now()-started;const u=r.usage||{};costEur=Number((costEur+num(u.costEur)).toFixed(6));calls+=num(u.calls);tokens+=num(u.tokens);done++;
        if(r.status==='OK')ok++;else if(r.status==='WARN')warn++;else ko++;
        rows.push(r);appendRow(r);updateProgress({done,total,ok,warn,ko,percent:Math.round(done*100/total),costEur,calls,tokens});renderFilters();cacheCurrent();currentCase=null;setLive('');
      }
      const aborted=stopRequested||currentAbort.signal.aborted,incomplete=done<total;
      lastSummary={type:'summary',mode:lastMode,done,total,ok,warn,ko,costEur,calls,tokens,aborted,incomplete,budgetStopped,finishedAt:new Date().toISOString(),certified:ko===0&&!aborted&&!incomplete&&done>0};
      updateProgress(lastSummary);releaseControls();finish(lastSummary);
    }catch(e){if(stopRequested||e.name==='AbortError')setPhase('Prueba detenida. Puedes continuar con otro chequeo sin cerrar la ventana.');else setPhase('Error de ejecución: '+(e.message||e),true);}
    finally{currentFetchAbort=null;currentCaseCancel=null;currentAbort=null;releaseControls();cacheCurrent();currentCase=null;saveServerRun();}
  }

  function handle(msg){
    lastStreamAt=Date.now();
    if(msg.type==='start'){setPhase(`${msg.mode}: ${fmtN(msg.total)} pruebas desde datos reales. ${msg.mode==='FAST'?'Coste IA = 0 €':'Presupuesto máximo '+fmtE(msg.maxCostEur)}`);return;}
    if(msg.type==='case_start'){currentCase=msg.case;setLive(`Procesando ${msg.index}/${msg.total} · ${msg.case?.group||''} · ${msg.case?.label||msg.case?.prompt||''}`);return;}
    if(msg.type==='heartbeat'){const sec=Math.max(0,Math.round(num(msg.elapsedMs)/1000));setLive(`Procesando ${msg.index}/${msg.total} · ${currentCase?.group||''} · ${currentCase?.label||currentCase?.prompt||''} · ${sec} s`);return;}
    if(msg.type==='case'){rows.push(msg.case);appendRow(msg.case);updateProgress(msg.progress||{});renderFilters();cacheCurrent();currentCase=null;setLive('');return;}
    if(msg.type==='budget'){setPhase(msg.message||'Presupuesto máximo alcanzado.');return;}
    if(msg.type==='summary'){lastSummary=msg;updateProgress(msg);releaseControls();finish(msg);return;}
    if(msg.type==='error'){setPhase(msg.error||'Error en la prueba',true);}
  }

  function updateProgress(p){const total=num(p.total),done=num(p.done),pct=total?Math.round(done*100/total):num(p.percent);if($('ztBar'))$('ztBar').style.width=Math.max(0,Math.min(100,pct))+'%';if($('ztPct'))$('ztPct').textContent=pct+'%';if($('ztDone'))$('ztDone').textContent=`${fmtN(done)}/${fmtN(total)}`;if($('ztOk'))$('ztOk').textContent=fmtN(p.ok);if($('ztWarn'))$('ztWarn').textContent=fmtN(p.warn);if($('ztKo'))$('ztKo').textContent=fmtN(p.ko);if($('ztCalls'))$('ztCalls').textContent=fmtN(p.calls);if($('ztTokens'))$('ztTokens').textContent=fmtN(p.tokens);if($('ztCost'))$('ztCost').textContent=fmtE(p.costEur);}
  function renderFinishState(s,updatePhase=true){const incomplete=num(s.done)<num(s.total),good=s.ko===0&&!s.aborted&&!incomplete&&s.done>0,warnings=num(s.warn);if(updatePhase)setPhase(s.aborted?'Ejecución detenida.':s.ko?'Ejecución terminada con KO.':incomplete?(s.budgetStopped?'Ejecución incompleta por límite de presupuesto.':'Ejecución incompleta; no se han recorrido todos los casos.'):warnings?'Ejecución terminada sin KO, pero con avisos de tiempo/servicio.':'Ejecución terminada sin incidencias.');const cert=$('ztCert');if(!cert)return;if(s.aborted){cert.textContent='⏹ PRUEBA DETENIDA';cert.className='zt-cert bad';}else if(s.ko){cert.textContent=`🔴 ${fmtN(s.ko)} KO · REVISAR`;cert.className='zt-cert bad';}else if(incomplete){cert.textContent=`🟠 INCOMPLETA · ${fmtN(s.done)}/${fmtN(s.total)}`;cert.className='zt-cert warn';}else if(warnings){cert.textContent=`🟠 SUPERADA CON ${fmtN(warnings)} AVISO${warnings===1?'':'S'}`;cert.className='zt-cert warn';}else if(good){cert.textContent='🟢 CERTIFICACIÓN DEL MODO SUPERADA';cert.className='zt-cert good';}}
  function setRetryState(){const has=rows.some(r=>r.status==='KO'||r.status==='WARN'),b=$('ztRetry');if(!b)return;b.disabled=false;b.style.opacity=has?'1':'.58';b.setAttribute('aria-disabled',has?'false':'true');}
  function finish(s){releaseControls();renderFinishState(s,true);setRetryState();saveHistory(s);cacheCurrent();renderHistory();renderModeStatuses();saveServerRun();setLive('Puedes pasar al SIGUIENTE CHEQUEO sin cerrar esta ventana.');}

  function rowHtml(r){return `<div class="zt-row ${esc(r.status)}" data-status="${esc(r.status)}" data-group="${esc(r.group)}"><div class="zt-status">${esc(r.status)}</div><div class="zt-cell"><b>${esc(r.group)}</b><span>${esc(r.id)}</span></div><div class="zt-cell"><b>${esc(r.label)}</b><span>${esc(r.prompt||'')}</span></div><div class="zt-cell zt-expected"><b>Esperado</b><span>${esc(r.expected||'Regla/invariante satisfecha')}</span></div><div class="zt-cell zt-actual"><b>Obtenido</b><span>${esc(r.actual||'')}</span>${r.tools?.length?`<span>\nHerramientas: ${esc(r.tools.join(', '))}</span>`:''}</div><div class="zt-ms">${fmtN(r.durationMs)} ms${r.usage?`\n${fmtE(r.usage.costEur)}`:''}</div></div>`;}
  function appendRow(r){const box=$('ztResults');if(rows.length===1)box.innerHTML='';box.insertAdjacentHTML('beforeend',rowHtml(r));applyFilter();box.scrollTop=box.scrollHeight;}
  function groups(){return ['TODOS','KO','WARN',...Array.from(new Set(rows.map(r=>r.group).filter(Boolean)))];}
  function renderFilters(){if(!$('ztFilters'))return;$('ztFilters').innerHTML=groups().map(g=>`<button class="zt-filter ${activeFilter===g?'active':''}" data-f="${esc(g)}">${esc(g)}${g==='KO'?` (${rows.filter(r=>r.status==='KO').length})`:g==='WARN'?` (${rows.filter(r=>r.status==='WARN').length})`:''}</button>`).join('');$('ztFilters').querySelectorAll('button').forEach(b=>b.onclick=()=>{activeFilter=b.dataset.f;renderFilters();applyFilter();});}
  function applyFilter(){document.querySelectorAll('#ztResults .zt-row').forEach(el=>{const show=activeFilter==='TODOS'||(activeFilter==='KO'&&el.dataset.status==='KO')||(activeFilter==='WARN'&&el.dataset.status==='WARN')||el.dataset.group===activeFilter;el.style.display=show?'grid':'none';});}

  async function saveServerRun(){
    if(!preview||!batterySeed||!currentRunKey||!isGD())return;
    try{
      const summary=Object.fromEntries(MODES.map(m=>[m,modeCache[m]?.summary||null]));
      const payload={runKey:currentRunKey,seed:batterySeed,batteryClock,appVersion:'v1.0_exp',generatedAt:preview?.generatedAt,dataCounts:preview?.dataCounts||{},generatedBattery:preview,report:reportPayload(),summary};
      const d=await fetchJson('/api/zuzu-tests/history',{method:'POST',headers:apiHeaders(),body:JSON.stringify(payload)},30000);
      historyStorage=d?.storage||historyStorage;if($('ztHistoryStorage'))$('ztHistoryStorage').textContent=`Histórico persistente: ${historyStorage||'guardado'} · clave ${currentRunKey}`;
    }catch(e){if($('ztHistoryStorage'))$('ztHistoryStorage').textContent=`Histórico: no se pudo guardar (${e.message||e}). La prueba actual sigue disponible en esta sesión.`;}
  }
  async function loadServerHistory(){
    if(!isGD())return;
    try{const d=await fetchJson('/api/zuzu-tests/history?limit=40',{cache:'no-store',headers:apiHeaders()},30000);historyRuns=Array.isArray(d?.runs)?d.runs:[];historyStorage=d?.storage||'';renderServerHistory();}
    catch(e){historyRuns=[];renderServerHistory();if($('ztHistoryStorage'))$('ztHistoryStorage').textContent=`No se pudo leer el histórico persistente: ${e.message||e}`;}
  }
  function renderServerHistory(){
    const sel=$('ztHistorySelect');if(!sel)return;const current=sel.value;
    sel.innerHTML='<option value="">— Elige una batería histórica —</option>'+historyRuns.map(r=>{const dt=r.updatedAt||r.generatedAt;let when='';try{when=new Date(dt).toLocaleString('es-ES');}catch(_){}const sums=r.summary||{},ko=Object.values(sums).reduce((a,x)=>a+num(x?.ko),0);return `<option value="${esc(r.runKey)}">${esc(when)} · seed ${esc(r.seed)} · ${ko?ko+' KO':'sin KO'} · ${esc(r.createdBy||'GD')}</option>`;}).join('');
    if(historyRuns.some(r=>r.runKey===current))sel.value=current;
    if($('ztHistoryStorage'))$('ztHistoryStorage').textContent=`${historyRuns.length} batería${historyRuns.length===1?'':'s'} guardada${historyRuns.length===1?'':'s'} · ${historyStorage||'almacenamiento persistente'}. Puedes VER el resultado antiguo o REPETIR la batería exacta (mismas preguntas/esperados).`;
  }
  async function selectedHistorical(){const key=trim($('ztHistorySelect')?.value);if(!key){setPhase('Elige primero una batería histórica del desplegable.');return null;}try{return await fetchJson(`/api/zuzu-tests/history/${encodeURIComponent(key)}`,{cache:'no-store',headers:apiHeaders()},30000);}catch(e){setPhase('No se pudo recuperar la batería histórica: '+(e.message||e),true);return null;}}
  function countsChanged(a={},b={}){const keys=['events','people','products','stores','purchases','incomes','documents','ticketImages','donationLines','hitos','lgs'];return keys.some(k=>a?.[k]!=null&&b?.[k]!=null&&num(a[k])!==num(b[k]));}
  async function loadHistoricalRun(){
    if(uiRunning){setPhase('Detén la ejecución antes de cargar un histórico.');return;}const d=await selectedHistorical();const run=d?.run;if(!run)return;
    historicReplayKey='';currentRunKey=run.runKey;batterySeed=num(run.seed);batteryClock=run.batteryClock||'';preview=run.generatedBattery||null;
    const rep=run.report||{};for(const mode of MODES){modeCache[mode]={rows:Array.isArray(rep?.modes?.[mode]?.results)?rep.modes[mode].results:[],summary:rep?.modes?.[mode]?.summary||null};}
    renderPreview();renderModeStatuses();restoreMode(lastMode);setPhase(`Histórico cargado · semilla ${batterySeed}. Estás viendo sus preguntas, esperados y respuestas originales; no se ha vuelto a ejecutar nada.`);
  }
  async function replayHistoricalRun(){
    if(uiRunning){setPhase('Detén la ejecución antes de repetir una batería histórica.');return;}const d=await selectedHistorical();const run=d?.run;if(!run)return;
    const saved=run.generatedBattery||null;if(!saved?.cases||num(saved?.replayContractVersion)<2){setPhase('Esta batería histórica es anterior al contrato reproducible exacto v2. Puedes REGENERAR su semilla manualmente; las baterías creadas con esta versión sí podrán repetirse literalmente.',true);return;}
    historicReplayKey=run.runKey;batterySeed=num(run.seed);batteryClock=`repetición exacta · ${run.batteryClock||run.seed}`;preview=saved;currentRunKey=`exact-${batterySeed}-${Date.now()}`;
    for(const mode of MODES)modeCache[mode]={rows:[],summary:null};rows=[];lastSummary=null;renderPreview();renderModeStatuses();restoreMode(lastMode);await saveServerRun();await loadServerHistory();
    setPhase(`Batería histórica ${batterySeed} cargada para REPETICIÓN EXACTA. AI-SMOKE y FULL-CERT usarán literalmente las preguntas y esperados guardados; FAST vuelve a comprobar la estructura actual con la misma semilla.`);
  }
  async function replayManualSeed(){
    if(uiRunning){setPhase('Detén la ejecución antes de regenerar una semilla.');return;}
    const raw=trim($('ztSeedReplayInput')?.value),seed=Math.abs(Math.trunc(Number(raw)||0))>>>0;if(!raw||!seed){setPhase('Introduce una semilla numérica válida.');return;}
    setPhase(`Regenerando exactamente la semilla ${seed} contra el código y datos actuales…`);
    try{
      historicReplayKey='';
      const fresh=await fetchJson(`/api/zuzu-tests/preview?seed=${encodeURIComponent(seed)}`,{cache:'no-store',headers:apiHeaders()},45000);
      batterySeed=seed;batteryClock=`semilla manual ${seed}`;preview=fresh;currentRunKey=`manual-${seed}-${Date.now()}`;
      for(const mode of MODES)modeCache[mode]={rows:[],summary:null};rows=[];lastSummary=null;renderPreview();renderModeStatuses();restoreMode(lastMode);await saveServerRun();await loadServerHistory();
      setPhase(`Semilla ${seed} regenerada contra los datos actuales. Para una regresión literal de una batería antigua usa el desplegable y REPETIR BATERÍA EXACTA.`);
    }catch(e){setPhase('No se pudo regenerar la semilla: '+(e.message||e),true);}
  }
  function history(){try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');}catch(_){return[];}}
  function saveHistory(s){const h=history();h.unshift({at:new Date().toISOString(),mode:lastMode,done:s.done,total:s.total,ok:s.ok,warn:s.warn,ko:s.ko,costEur:s.costEur,calls:s.calls,tokens:s.tokens});localStorage.setItem(HISTORY_KEY,JSON.stringify(h.slice(0,30)));}
  function renderHistory(){const h=history();if($('ztHistory'))$('ztHistory').textContent=h.length?`Última: ${new Date(h[0].at).toLocaleString('es-ES')} · ${h[0].mode} · ${h[0].ko?`${h[0].ko} KO`:'0 KO'} · ${fmtE(h[0].costEur)}`:'Sin certificaciones guardadas en este navegador.';}
  function renderModeStatuses(){for(const mode of MODES){const el=$('ztModeStatus'+mode),s=modeCache[mode]?.summary;if(!el)continue;el.className='zt-mode-status';if(!s){el.textContent='Pendiente';continue;}if(s.ko){el.textContent=`${s.ko} KO`;el.classList.add('bad');}else if(num(s.done)<num(s.total)){el.textContent=`${s.done}/${s.total}`;el.classList.add('warn');}else if(s.warn){el.textContent=`${s.warn} aviso${s.warn===1?'':'s'}`;el.classList.add('warn');}else{el.textContent='✓ OK';el.classList.add('good');}}}

  function reportPayload(){
    const modes={};for(const mode of MODES){modes[mode]={summary:modeCache[mode].summary||null,results:modeCache[mode].rows||[]};}
    return{type:'ControlEvent Zuzu ITV',version:'v1.0_exp',exportedAt:new Date().toISOString(),batterySeed,batteryClock,historicReplayKey:historicReplayKey||'',generatedBattery:preview||null,dataCounts:preview?.dataCounts||{},modes,history:history().slice(0,10)};
  }
  function downloadReport(){const payload=reportPayload(),has=MODES.some(m=>modeCache[m].rows.length||modeCache[m].summary);if(!has){alert('Todavía no hay resultados que exportar.');return;}const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`ControlEvent_v1.0_exp_ITV_Zuzu_${new Date().toISOString().replace(/[:.]/g,'-')}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);setPhase('Informe descargado. Puedes adjuntarlo directamente para analizar los tres chequeos.');}
  function printReport(){const mode=lastMode,c=modeCache[mode],s=c.summary||{},date=new Date().toLocaleString('es-ES'),body=c.rows.map(r=>`<tr><td class="${esc(r.status)}">${esc(r.status)}</td><td>${esc(r.group)}</td><td>${esc(r.label)}</td><td>${esc(r.prompt||'')}</td><td>${esc(r.expected||'')}</td><td>${esc(r.actual||'')}</td></tr>`).join('');if(!c.rows.length){alert('Este modo todavía no tiene resultados.');return;}const w=window.open('','_blank');if(!w){setPhase('El navegador ha bloqueado la ventana de impresión. Usa ⬇ INFORME para descargar el JSON.',true);return;}w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>ControlEvent - ITV Zuzu</title><style>@page{size:A4 landscape;margin:10mm}body{font-family:Arial,sans-serif;margin:16px;color:#0f172a}h1{color:#075985}table{width:100%;border-collapse:collapse;font-size:8.5px;table-layout:fixed}th,td{border:1px solid #cbd5e1;padding:4px;vertical-align:top;overflow-wrap:anywhere}th:nth-child(1){width:5%}th:nth-child(2){width:8%}th:nth-child(3){width:13%}th:nth-child(4){width:22%}th:nth-child(5){width:20%}th:nth-child(6){width:32%}.OK{color:#15803d;font-weight:bold}.KO{color:#b91c1c;font-weight:bold}.WARN{color:#b45309;font-weight:bold}.summary{display:flex;gap:18px;flex-wrap:wrap;margin:8px 0 12px}.summary b{font-size:16px}</style></head><body><h1>🧪 ITV de Zuzu · ${esc(mode)}</h1><p>${esc(date)} · semilla <b>${esc(batterySeed)}</b> · tablas reales · solo lectura</p><div class="summary"><span>OK <b>${fmtN(s.ok)}</b></span><span>AVISOS <b>${fmtN(s.warn)}</b></span><span>KO <b>${fmtN(s.ko)}</b></span><span>Llamadas IA <b>${fmtN(s.calls)}</b></span><span>Tokens <b>${fmtN(s.tokens)}</b></span><span>Coste <b>${fmtE(s.costEur)}</b></span></div><table><thead><tr><th>Estado</th><th>Grupo</th><th>Prueba</th><th>Pregunta realizada</th><th>Esperado</th><th>Respuesta Zuzu / Obtenido</th></tr></thead><tbody>${body}</tbody></table><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);w.document.close();}


  style();window.addEventListener('controlevent:auth-changed',e=>{authEventUser=e?.detail?.user||null;injectButton();});window.addEventListener('controlevent:app-ready',injectButton);document.addEventListener('DOMContentLoaded',injectButton);setInterval(injectButton,500);injectButton();
})();
