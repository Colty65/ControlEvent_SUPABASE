/* ControlEvent v4_0_exp · PRUEBAS ZUZU · Consola GD.
   Batería autogenerada desde datos reales. Solo lectura. */
(function(){
  'use strict';
  if(window.__ceZuzuTestConsoleGd) return;
  window.__ceZuzuTestConsoleGd=true;

  const ITV_CONTRACT_VERSION=4;
  const ITV_BUILD='20260828-BANK49-CANONICAL-ID-MULTIENTITY-FASTLOCAL-MEMORY2';
  const ITV_OBSERVATION_MODE=false;
  window.__CE_ZUZU_ITV_BUILD__=ITV_BUILD;
  window.__CE_ZUZU_ITV_CONTRACT_VERSION__=ITV_CONTRACT_VERSION;

  const $=id=>document.getElementById(id);
  const text=v=>v==null?'':String(v);
  const trim=v=>text(v).trim();
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0;};
  const esc=v=>text(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fmtN=n=>new Intl.NumberFormat('es-ES').format(num(n));
  const fmtE=n=>new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:4}).format(num(n))+' €';
  function percentile(values,p){const a=values.map(num).filter(v=>v>0).sort((x,y)=>x-y);if(!a.length)return 0;const i=(a.length-1)*p,lo=Math.floor(i),hi=Math.min(a.length-1,lo+1),f=i-lo;return Math.round(a[lo]*(1-f)+a[hi]*f);}
  function performanceSummary(list=[]){const a=list.filter(r=>num(r?.durationMs)>0),dur=a.map(r=>num(r.durationMs)),calls=a.map(r=>num(r?.usage?.calls)),tokens=a.map(r=>num(r?.usage?.tokens)),cost=a.map(r=>num(r?.usage?.costEur));const avg=x=>x.length?x.reduce((m,v)=>m+v,0)/x.length:0;return{cases:a.length,medianMs:percentile(dur,.5),p90Ms:percentile(dur,.9),p95Ms:percentile(dur,.95),maxMs:dur.length?Math.max(...dur):0,avgCalls:Number(avg(calls).toFixed(2)),avgTokens:Math.round(avg(tokens)),avgCostEur:Number(avg(cost).toFixed(6)),over12s:dur.filter(x=>x>12000).length,over18s:dur.filter(x=>x>18000).length};}
  const MODES=['FAST','AI-SMOKE','FULL-CERT'];
  const HISTORY_KEY='controlevent_v1_0_exp_zuzu_test_history';
  const modeCache={FAST:{rows:[],summary:null},'AI-SMOKE':{rows:[],summary:null},'FULL-CERT':{rows:[],summary:null}};

  let currentAbort=null,currentFetchAbort=null,currentCaseCancel=null,currentReader=null,preview=null,rows=[],lastSummary=null,activeFilter='TODOS',lastMode='FAST';
  let streamWatchdog=null,lastStreamAt=0,currentCase=null,stopRequested=false,uiRunning=false;
  let batterySeed=0,batteryClock='',currentRunKey='',historyRuns=[],historyStorage='',historicReplayKey='',batterySource='generated',batteryCode='';
  let authEventUser=null;

  function renewBatterySeed(){
    const d=new Date(),sec=d.getSeconds(),slot=d.getHours()*3600+d.getMinutes()*60+sec;
    // El segundo local pesa de forma explícita en la semilla. Después se mezcla con hora/minuto/día
    // para obtener siempre un entero reproducible que sirve para escoger índices dentro de cada tabla.
    let seed=(Math.imul(sec+1,2654435761)^Math.imul(slot+17,2246822519)^Math.imul(d.getDate()+31,3266489917))>>>0;
    batterySeed=seed||0x6d2b79f5;batteryClock=d.toLocaleTimeString('es-ES');return batterySeed;
  }


  function normalizeOverlayControls(){
    // La ITV ya no pelea continuamente con los estados de los controles. Solo saneamos
    // el contenedor una vez al abrir: un MutationObserver sobre disabled/inert podía
    // provocar bucles con los observadores legacy de ControlEvent y dejar la ventana torpe.
    const root=$('ceZuzuTestOverlay');if(!root)return;
    try{
      root.removeAttribute('inert');
      root.style.setProperty('opacity','1','important');
      root.style.setProperty('filter','none','important');
      root.style.setProperty('pointer-events','auto','important');
    }catch(_){ }
  }
  function startOverlayGuard(){normalizeOverlayControls();}
  function stopOverlayGuard(){}

  function storedAuth(){
    const direct=window.ControlEventLoginUser||window.__CONTROL_EVENT_LOGIN_USER__||window.__CONTROL_EVENT_CE_ACCESO__||null;
    if(direct)return direct;
    for(const key of ['ControlEvent_v4_0_exp_login_user','ControlEvent_ce_acceso_usuario','ControlEvent_auth_user_v509']){
      try{const raw=sessionStorage.getItem(key)||localStorage.getItem(key);if(raw){const u=JSON.parse(raw);if(u)return u;}}catch(_){ }
    }
    return null;
  }
  function auth(){
    // La ITV no depende del momento en que termine de construirse la fachada general de CE.
    // Primero usa el usuario capturado directamente del login y después todas las fuentes de respaldo.
    try{
      const appUser=window.ControlEventApp?.authUser||window.ControlEventRuntime?.app?.authUser||null;
      if(authEventUser||window.__CE_ZUZU_ITV_LOGIN_USER__||appUser||window.authUser||window.__CONTROL_EVENT_USER__||storedAuth())
        return authEventUser||window.__CE_ZUZU_ITV_LOGIN_USER__||appUser||window.authUser||window.__CONTROL_EVENT_USER__||storedAuth();
      return Function('return (typeof authUser!=="undefined" && authUser) ? authUser : null')();
    }catch(_){return authEventUser||window.__CE_ZUZU_ITV_LOGIN_USER__||window.ControlEventApp?.authUser||window.authUser||window.__CONTROL_EVENT_USER__||storedAuth()||null;}
  }
  function uiRole(){
    const raw=[$('brandCurrentUserMeta')?.textContent,$('currentUserLevel')?.textContent,document.body?.dataset?.role].filter(Boolean).join(' ').toUpperCase();
    if(/(^|[^A-Z])GD([^A-Z]|$)/.test(raw))return 'GD';
    if(/(^|[^A-Z])RW([^A-Z]|$)/.test(raw))return 'RW';
    if(/(^|[^A-Z])RO([^A-Z]|$)/.test(raw))return 'RO';
    return '';
  }
  function role(){const u=auth()||{};return text(u.nivel||u.Nivel||u.NIVEL||u.rol||u.Rol).trim().toUpperCase()||uiRole();}
  function isGD(){return role()==='GD';}
  function actorHeader(){const u=auth()||{};return encodeURIComponent(JSON.stringify({nivel:role(),identificacion:text(u.identificacion||u.Identificacion),nombre:text(u.nombre||u.Nombre)}));}
  function apiHeaders(extra={}){return {'Content-Type':'application/json','X-ControlEvent-Feature':'zuzu-test-console-v2','X-ControlEvent-Actor':actorHeader(),...extra};}

  function style(){
    if($('ceZuzuTestConsoleStyle'))return;
    const s=document.createElement('style');s.id='ceZuzuTestConsoleStyle';s.textContent=`
      #ceZuzuTestBtn.ce-zuzu-test-tab{border-color:#7dd3fc!important;background:#eff6ff!important;color:#075985!important}
      body.ce-zuzu-itv-open{overflow:hidden!important}
      #ceZuzuTestOverlay{position:fixed!important;inset:0!important;z-index:2147483647!important;width:100vw!important;height:100vh!important;margin:0!important;border:0!important;padding:10px!important;background:rgba(15,23,42,.24)!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important;opacity:1!important;filter:none!important;visibility:visible!important;pointer-events:auto!important;isolation:isolate!important}
      #ceZuzuTestOverlay *{box-sizing:border-box}
      #ceZuzuTestOverlay .zt-modal{width:min(1580px,calc(100vw - 20px));height:min(960px,calc(100vh - 20px));min-height:0!important;background:#fff!important;border:2px solid #0ea5e9;border-radius:18px;box-shadow:0 22px 70px rgba(15,23,42,.34);display:flex;flex-direction:column;overflow:hidden;color:#0f172a;opacity:1!important;filter:none!important;visibility:visible!important;pointer-events:auto!important}
      #ceZuzuTestOverlay button{appearance:none!important;-webkit-appearance:none!important;font-family:inherit!important;position:relative!important;inset:auto!important;transform:none!important;float:none!important;margin:0!important;opacity:1!important;filter:none!important;visibility:visible!important;pointer-events:auto!important;cursor:pointer!important;line-height:1.2!important}
      #ceZuzuTestOverlay button:disabled{opacity:.5!important;pointer-events:none!important;cursor:not-allowed!important}
      #ceZuzuTestOverlay input,#ceZuzuTestOverlay select{position:relative!important;inset:auto!important;transform:none!important;float:none!important;margin:0!important;opacity:1!important;filter:none!important;visibility:visible!important;pointer-events:auto!important;color:#0f172a!important;-webkit-text-fill-color:#0f172a!important;background:#fff!important}
      .zt-head{display:flex;align-items:center;gap:9px;padding:8px 12px;background:linear-gradient(90deg,#eff6ff,#fff);border-bottom:1px solid #bae6fd;min-height:50px;flex:0 0 auto}
      .zt-head h2{margin:0;color:#075985;font-size:20px}.zt-head .zt-sub{color:#475569;font-size:10px;font-weight:800}.zt-spacer{flex:1}.zt-head-actions{display:flex;gap:6px;align-items:center}
      .zt-action{border:1px solid #94a3b8!important;background:#fff!important;color:#0f172a!important;-webkit-text-fill-color:#0f172a!important;border-radius:9px!important;padding:7px 10px!important;font-weight:950!important;cursor:pointer!important;min-width:98px!important;white-space:nowrap!important;font-size:11px!important;height:34px!important}
      .zt-action.report{background:#0f766e!important;border-color:#0f766e!important;color:#fff!important;-webkit-text-fill-color:#fff!important}.zt-action.print{background:#475569!important;border-color:#475569!important;color:#fff!important;-webkit-text-fill-color:#fff!important}.zt-action.close{min-width:92px!important;color:#991b1b!important;border-color:#fecaca!important}
      .zt-top{display:grid;grid-template-columns:minmax(0,43fr) minmax(0,57fr);gap:8px;padding:7px 9px;border-bottom:1px solid #e2e8f0;background:#f8fafc;flex:0 0 auto;overflow:visible!important}
      .zt-panel{background:#fff;border:1px solid #dbeafe;border-radius:12px;padding:8px 9px;min-width:0;overflow:visible!important}.zt-panel h3{margin:0;color:#075985;font-size:12px}.zt-panel-head{display:flex;align-items:center;gap:7px;margin-bottom:6px}.zt-panel-head .zt-history-note{margin-left:auto;max-width:62%;text-align:right}.zt-mini-primary{margin-left:auto!important;background:#eff6ff!important;border:1px solid #7dd3fc!important;color:#075985!important;-webkit-text-fill-color:#075985!important;padding:5px 9px!important;font-size:10px!important;border-radius:8px!important;height:30px!important;white-space:nowrap!important}
      .zt-data{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}.zt-pill{border-radius:7px;background:#f8fafc;border:1px solid #dbe4ee;padding:4px 5px;font-size:9px;font-weight:800;color:#475569;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.zt-pill strong{color:#0f172a;font-size:10px}.zt-seed-strip{margin-top:5px!important;padding:4px 6px;border-radius:7px;background:#f8fafc;border:1px solid #e2e8f0;min-height:0!important;font-size:9px!important;line-height:1.2}
      .zt-history-box{margin-top:6px;padding-top:6px;border-top:1px dashed #cbd5e1;overflow:visible!important}.zt-history-box .zt-panel-head{margin-bottom:5px}.zt-history-grid{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:6px;align-items:center;overflow:visible!important;position:relative!important;z-index:10!important}.zt-history-grid select{grid-column:1;min-width:0!important;width:100%!important;height:36px!important;min-height:36px!important;border:1px solid #cbd5e1!important;border-radius:8px!important;padding:0 10px!important;font-size:10px!important;font-weight:800!important;z-index:12!important}.zt-history-grid button{position:relative!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;width:auto!important;min-width:0!important;max-width:none!important;height:36px!important;min-height:36px!important;max-height:36px!important;padding:0 10px!important;border:1px solid #94a3b8!important;border-radius:8px!important;background:#fff!important;color:#334155!important;-webkit-text-fill-color:#334155!important;font-size:10px!important;font-weight:900!important;white-space:nowrap!important;box-shadow:none!important;z-index:11!important}.zt-history-grid #ztHistoryView{min-width:56px!important}.zt-history-grid #ztHistoryReplay{min-width:92px!important}.zt-history-grid #ztHistoryDelete{min-width:74px!important;border-color:#fecaca!important;background:#fff7f7!important;color:#b91c1c!important;-webkit-text-fill-color:#b91c1c!important}.zt-seed-label{grid-column:1/4;display:flex;align-items:center;gap:6px;font-size:9px;font-weight:900;color:#475569;white-space:nowrap;min-width:0}.zt-seed-label input{width:128px!important;height:32px!important;border:1px solid #cbd5e1!important;border-radius:7px!important;padding:0 8px!important;font-weight:850!important;font-size:10px!important}.zt-history-grid #ztReplaySeed{grid-column:4;justify-self:stretch!important}.zt-history-note{font-size:8.5px;color:#64748b;font-weight:750;margin-top:0;line-height:1.1;overflow-wrap:anywhere}
      .zt-modes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.zt-mode{position:relative!important;border:1px solid #cbd5e1!important;border-top:3px solid #cbd5e1!important;background:#fff!important;color:#0f172a!important;-webkit-text-fill-color:#0f172a!important;border-radius:10px!important;padding:7px 8px!important;cursor:pointer!important;text-align:left!important;min-height:56px!important;height:auto!important;overflow:hidden!important}.zt-mode.active{border-color:#0ea5e9!important;border-top-color:#0284c7!important;background:#eff6ff!important;box-shadow:0 0 0 1px rgba(14,165,233,.10)}.zt-mode b{display:block;font-size:11px}.zt-mode small{display:block;color:#64748b;-webkit-text-fill-color:#64748b!important;margin-top:2px;line-height:1.15;font-size:9px}.zt-mode .free{color:#15803d!important;-webkit-text-fill-color:#15803d!important}.zt-mode .paid{color:#b45309!important;-webkit-text-fill-color:#b45309!important}.zt-mode-status{position:absolute;right:7px;top:6px;font-style:normal;font-size:9px;font-weight:950;padding:2px 5px;border-radius:999px;background:#e2e8f0;color:#475569}.zt-mode-status.good{background:#dcfce7;color:#166534}.zt-mode-status.warn{background:#fef3c7;color:#92400e}.zt-mode-status.bad{background:#fee2e2;color:#991b1b}
      .zt-controls{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:6px}.zt-run-controls{display:grid;grid-template-columns:94px 94px 108px 108px minmax(165px,1fr) 116px;align-items:end;gap:6px;margin-top:7px;padding-top:6px;border-top:1px solid #e2e8f0;overflow:visible!important}.zt-controls button{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:auto!important;height:36px!important;min-height:36px!important;border:1px solid #94a3b8!important;background:#fff!important;color:#0f172a!important;-webkit-text-fill-color:#0f172a!important;border-radius:8px!important;padding:0 9px!important;font-weight:950!important;cursor:pointer!important;white-space:nowrap!important;font-size:10px!important;box-shadow:none!important}.zt-controls .primary{background:#0284c7!important;color:#fff!important;-webkit-text-fill-color:#fff!important;border-color:#0284c7!important}.zt-controls .danger{background:#fff7f7!important;color:#b91c1c!important;-webkit-text-fill-color:#b91c1c!important;border-color:#fca5a5!important}.zt-controls .danger.running{background:#dc2626!important;color:#fff!important;-webkit-text-fill-color:#fff!important;border-color:#dc2626!important;box-shadow:0 0 0 2px rgba(220,38,38,.12)!important}.zt-controls .next{background:#eef2ff!important;color:#3730a3!important;-webkit-text-fill-color:#3730a3!important;border-color:#a5b4fc!important}.zt-controls label{font-size:10px;font-weight:850;color:#475569;line-height:1.1}.zt-controls input,.zt-controls select{height:34px!important;border:1px solid #cbd5e1!important;border-radius:8px!important;padding:0 7px!important;font-weight:850!important;background:#fff!important;color:#0f172a!important;font-size:10px!important}.zt-controls input{width:76px!important}.zt-controls select{width:72px!important}.zt-controls .grow{margin-left:auto}
      .zt-progress-area{padding:6px 9px;border-bottom:1px solid #e2e8f0;background:#fff;flex:0 0 auto}.zt-progress-head{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center}.zt-progress{height:8px;background:#e2e8f0;border-radius:999px;overflow:hidden}.zt-progress>div{height:100%;width:0;background:linear-gradient(90deg,#0284c7,#22c55e);transition:width .15s}.zt-phase{font-size:10px;font-weight:900;color:#334155;min-height:14px}.zt-live{font-size:9px;color:#64748b;font-weight:850;margin-top:2px;min-height:11px}.zt-stats{display:grid;grid-template-columns:repeat(7,minmax(72px,1fr));gap:5px;margin-top:5px}.zt-stat{min-width:0;border:1px solid #e2e8f0;border-radius:8px;padding:4px 6px;background:#f8fafc;display:flex;align-items:baseline;gap:5px}.zt-stat b{display:block;font-size:13px}.zt-stat span{font-size:8px;color:#64748b;font-weight:850;white-space:nowrap}.zt-stat.ok b{color:#15803d}.zt-stat.ko b{color:#b91c1c}.zt-stat.warn b{color:#c2410c}.zt-stat.cost b{color:#7c3aed}
      .zt-filters{display:flex;gap:4px;flex-wrap:wrap;padding:4px 9px;background:#f8fafc;border-bottom:1px solid #e2e8f0;flex:0 0 auto}.zt-filter{height:24px!important;min-height:24px!important;border:1px solid #cbd5e1!important;background:#fff!important;color:#0f172a!important;-webkit-text-fill-color:#0f172a!important;border-radius:999px!important;padding:0 8px!important;font-size:9px!important;font-weight:900!important;cursor:pointer!important}.zt-filter.active{background:#0f172a!important;color:#fff!important;-webkit-text-fill-color:#fff!important;border-color:#0f172a!important}
      .zt-results{flex:1 1 auto;min-height:0!important;overflow:auto!important;padding:6px 9px;background:#f8fafc;position:relative!important;z-index:1!important}.zt-row{display:grid;grid-template-columns:58px 116px minmax(220px,1.05fr) minmax(220px,.95fr) minmax(280px,1.45fr) 78px;gap:7px;align-items:start;border:1px solid #e2e8f0;border-left:5px solid #94a3b8;border-radius:10px;background:#fff;padding:7px 8px;margin-bottom:6px;font-size:11px}.zt-row.OK{border-left-color:#22c55e}.zt-row.KO{border-left-color:#ef4444;background:#fff7f7}.zt-row.WARN{border-left-color:#f59e0b;background:#fffaf0}.zt-status{font-weight:950}.zt-row.OK .zt-status{color:#15803d}.zt-row.KO .zt-status{color:#b91c1c}.zt-row.WARN .zt-status{color:#b45309}.zt-cell b{display:block;margin-bottom:2px}.zt-cell span{color:#475569;white-space:pre-wrap;overflow-wrap:anywhere}.zt-ms{text-align:right;color:#64748b;font-weight:800;white-space:pre-line}.zt-empty{padding:34px;text-align:center;color:#64748b;font-weight:850}
      .zt-foot{display:flex;align-items:center;gap:8px;padding:5px 9px;border-top:1px solid #e2e8f0;background:#fff;flex:0 0 auto}.zt-cert{font-weight:950}.zt-cert.good{color:#15803d}.zt-cert.warn{color:#b45309}.zt-cert.bad{color:#b91c1c}.zt-history{margin-left:auto;font-size:10px;color:#64748b;font-weight:800}
      @media(max-width:1180px){#ceZuzuTestOverlay{padding:6px!important}#ceZuzuTestOverlay .zt-modal{width:calc(100vw - 12px);height:calc(100vh - 12px)}.zt-top{grid-template-columns:1fr;max-height:46vh;overflow:auto!important}.zt-data{grid-template-columns:repeat(5,minmax(0,1fr))}.zt-history-grid{grid-template-columns:minmax(0,1fr) auto auto auto}.zt-run-controls{grid-template-columns:repeat(3,minmax(0,1fr))}.zt-row{grid-template-columns:55px 90px 1fr}.zt-row .zt-expected,.zt-row .zt-actual{grid-column:3}.zt-ms{grid-column:1}.zt-modes{grid-template-columns:1fr}.zt-head .zt-sub{display:none}}
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


  function modal(){return `<div id="ceZuzuTestOverlay" role="dialog" aria-modal="true" aria-label="ITV de Zuzu"><div class="zt-modal">
    <div class="zt-head"><h2>🧪 ITV de Zuzu</h2><span class="zt-sub">Baterías autogeneradas o Excel · ORÁCULO ACTIVO · misma tubería que Zuzu · build ${ITV_BUILD} · SOLO LECTURA · solo GD</span><div class="zt-spacer"></div><div class="zt-head-actions"><button class="zt-action report" id="ztDownload">⬇ INFORME</button><button class="zt-action print" id="ztPrint">🖨 PDF</button><button class="zt-action close" id="ztClose">✕ CERRAR</button></div></div>
    <div class="zt-top">
      <div class="zt-panel"><div class="zt-panel-head"><h3>Datos reales · batería</h3><button id="ztImportExcel" class="zt-mini-primary">📥 CARGAR EXCEL</button><button id="ztGenerate" class="zt-mini-primary">↻ NUEVA BATERÍA</button><input id="ztExcelFile" type="file" accept=".xlsx,.xlsm" style="display:none!important"></div><div id="ztData" class="zt-data"><span class="zt-pill">Cargando datos…</span></div><div id="ztSeedInfo" class="zt-live zt-seed-strip"></div>
        <div class="zt-history-box"><div class="zt-panel-head"><h3>Histórico reproducible</h3><div id="ztHistoryStorage" class="zt-history-note"></div></div><div class="zt-history-grid"><select id="ztHistorySelect"><option value="">Cargando baterías guardadas…</option></select><button id="ztHistoryView">VER</button><button id="ztHistoryReplay">▶ REPETIR</button><button id="ztHistoryDelete" title="Eliminar definitivamente la batería seleccionada">✕ ELIMINAR</button><label class="zt-seed-label">Semilla <input id="ztSeedReplayInput" inputmode="numeric" placeholder="974813527"></label><button id="ztReplaySeed">↻ REGENERAR</button></div></div>
      </div>
      <div class="zt-panel"><div class="zt-panel-head"><h3>Modo de prueba · ejecución</h3></div><div class="zt-modes">
        <button class="zt-mode active" data-mode="FAST"><em id="ztModeStatusFAST" class="zt-mode-status">Pendiente</em><b>FAST · CE</b><small class="free">0 € · comprobaciones reales sin IA.</small></button>
        <button class="zt-mode" data-mode="AI-SMOKE"><em id="ztModeStatusAI-SMOKE" class="zt-mode-status">Pendiente</em><b>AI-SMOKE</b><small class="paid">Interpretación y herramientas de todos los ámbitos.</small></button>
        <button class="zt-mode" data-mode="FULL-CERT"><em id="ztModeStatusFULL-CERT" class="zt-mode-status">Pendiente</em><b>FULL-CERT</b><small class="paid">Z1 · conversación real · continuidad/humanidad · todos los registros.</small></button>
      </div><div class="zt-controls zt-run-controls"><label>Máx. coste<br><input id="ztMaxCost" type="number" min="0.02" max="5" step="0.05" value="0.25"> €</label><label title="Máximo de preguntas de IA que se ejecutarán en AI-SMOKE o FULL-CERT. No crea casos nuevos; si pones más que los disponibles, se ejecutan todos.">Máx. casos IA<br><input id="ztMaxCases" type="number" min="1" max="100" step="1" value="100"></label><button class="primary" id="ztStart">▶ INICIAR</button><button class="danger" id="ztStop">■ DETENER</button><button id="ztRetry" style="display:none!important">↻ REPETIR INCIDENCIAS</button><button class="next" id="ztNext">SIGUIENTE →</button></div></div>
    </div>
    <div class="zt-progress-area"><div class="zt-progress-head"><div class="zt-phase" id="ztPhase">Preparado.</div><b id="ztPct">0%</b></div><div class="zt-progress"><div id="ztBar"></div></div><div class="zt-live" id="ztLive"></div><div class="zt-stats"><div class="zt-stat"><b id="ztDone">0/0</b><span>PROGRESO</span></div><div class="zt-stat ok"><b id="ztOk">0</b><span>OK</span></div><div class="zt-stat warn"><b id="ztWarn">0</b><span>AVISOS</span></div><div class="zt-stat ko"><b id="ztKo">0</b><span>KO</span></div><div class="zt-stat"><b id="ztCalls">0</b><span>LLAMADAS IA</span></div><div class="zt-stat"><b id="ztTokens">0</b><span>TOKENS</span></div><div class="zt-stat cost"><b id="ztCost">0,00 €</b><span>COSTE</span></div></div></div>
    <div class="zt-filters" id="ztFilters"></div><div class="zt-results" id="ztResults"><div class="zt-empty">Pulsa INICIAR. Al terminar puedes pasar al siguiente chequeo sin cerrar esta ventana.</div></div>
    <div class="zt-foot"><span id="ztCert" class="zt-cert">Sin ejecutar.</span><span class="zt-history" id="ztHistory"></span></div>
  </div></div>`;}


  async function open(){
    if(!isGD())return;style();$('ceZuzuTestOverlay')?.remove();document.body.classList.add('ce-zuzu-itv-open');document.body.insertAdjacentHTML('beforeend',modal());
    bind();startOverlayGuard();restoreMode(lastMode);
    // Si el usuario cierra y vuelve a abrir la ITV en la misma sesión, NO regeneramos ni
    // borramos la batería/resultados. Solo sincronizamos el histórico. La primera entrada sí
    // crea una batería si todavía no existe ninguna en memoria.
    if(preview){renderPreview();renderModeStatuses();restoreMode(lastMode);await loadServerHistory();setPhase(`Batería actual recuperada · semilla ${batterySeed}.`);}
    else await Promise.all([loadPreview(),loadServerHistory()]);
  }
  function close(){stopStreamWatchdog();stopOverlayGuard();stopRequested=true;try{currentCaseCancel?.();}catch(_){}try{currentFetchAbort?.abort();}catch(_){}try{currentReader?.cancel();}catch(_){}try{currentAbort?.abort();}catch(_){}currentAbort=null;currentFetchAbort=null;currentCaseCancel=null;currentReader=null;$('ceZuzuTestOverlay')?.remove();document.body.classList.remove('ce-zuzu-itv-open');}

  function bind(){
    $('ztClose').onclick=close;$('ceZuzuTestOverlay').addEventListener('click',e=>{if(e.target.id==='ceZuzuTestOverlay')close();});
    document.querySelectorAll('.zt-mode').forEach(b=>b.onclick=()=>selectMode(b.dataset.mode));
    $('ztGenerate').onclick=()=>loadPreview(true);$('ztImportExcel').onclick=()=>{if(uiRunning){setPhase('Detén la ejecución antes de cargar otro Excel.');return;}$('ztExcelFile').value='';$('ztExcelFile').click();};$('ztExcelFile').onchange=()=>{const f=$('ztExcelFile').files&&$('ztExcelFile').files[0];if(f)importBatteryExcel(f);};$('ztStart').onclick=()=>run(false);$('ztRetry').onclick=()=>{};$('ztNext').onclick=nextMode;$('ztDownload').onclick=downloadReport;$('ztPrint').onclick=printReport;$('ztHistoryView').onclick=loadHistoricalRun;$('ztHistoryReplay').onclick=replayHistoricalRun;$('ztHistoryDelete').onclick=deleteHistoricalRun;$('ztReplaySeed').onclick=replayManualSeed;
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
  function itvNormHeader(v){return trim(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,'');}
  function itvHash(textValue=''){let h=2166136261>>>0;for(let i=0;i<textValue.length;i++){h^=textValue.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
  async function fileToBase64(file){
    if(!file)throw new Error('No se ha seleccionado ningún Excel.');
    if(num(file.size)>8*1024*1024)throw new Error('El Excel supera el máximo de 8 MB permitido para una batería ITV.');
    return await new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>{const value=text(reader.result),comma=value.indexOf(',');resolve(comma>=0?value.slice(comma+1):value);};
      reader.onerror=()=>reject(reader.error||new Error('No se pudo leer el Excel seleccionado.'));
      reader.readAsDataURL(file);
    });
  }
  async function importBatteryExcel(file){
    if(uiRunning){setPhase('Detén la ejecución antes de cargar otro Excel.');return;}
    setPhase('Leyendo preguntas del Excel en el servidor…');
    try{
      const dataBase64=await fileToBase64(file);
      const imported=await fetchJson('/api/zuzu-tests/import-excel',{method:'POST',headers:apiHeaders(),body:JSON.stringify({fileName:file.name,dataBase64})},45000);
      const raw=(Array.isArray(imported?.questions)?imported.questions:[]).map((x,i)=>({seq:num(x?.seq)||i+1,prompt:trim(x?.prompt),group:trim(x?.group)||'EXCEL',label:trim(x?.label),expected:trim(x?.expected),scenario:trim(x?.scenario),oracle:x?.oracle&&typeof x.oracle==='object'?x.oracle:null})).filter(x=>x.prompt);
      raw.sort((a,b)=>a.seq-b.seq);
      if(!raw.length)throw new Error('No se han encontrado preguntas debajo de la cabecera PREGUNTA.');
      const signature=raw.map(x=>`${x.seq}|${x.prompt}|${x.expected}`).join('\n'),hash=itvHash(signature)||0x6d2b79f5,binary=hash.toString(36).toUpperCase();batterySeed=hash;batteryCode=`XLS-${binary.slice(0,9)}`;batteryClock=`Excel · ${file.name}`;const defaultScenario=`EXCEL-${batteryCode}`;
      const cases=raw.map((x,i)=>({id:`excel-${String(i+1).padStart(3,'0')}`,group:x.group||'EXCEL',label:x.label||`Pregunta ${i+1}`,prompt:x.prompt,expected:x.expected||'Respuesta coherente con los datos reales y el hilo conversacional.',scenario:x.scenario||defaultScenario,mode:'FULL-CERT',oracle:x.oracle&&typeof x.oracle==='object'?x.oracle:null,requireAnswer:true,validationRule:'',meta:{excelRow:x.seq}}));
      preview={ok:true,source:'excel',batteryCode,replayContractVersion:ITV_CONTRACT_VERSION,seed:batterySeed,generatedAt:new Date().toISOString(),fileName:file.name,sheetName:trim(imported?.sheetName),dataCounts:{},tests:{FAST:0,'AI-SMOKE':cases.length,'FULL-CERT':cases.length},cases:{FAST:[],'AI-SMOKE':cases.map(x=>({...x,scenario:''})),'FULL-CERT':cases}};batterySource='excel';historicReplayKey='';currentRunKey=`excel-${batteryCode}-${Date.now()}`;for(const mode of MODES)modeCache[mode]={rows:[],summary:null};rows=[];lastSummary=null;lastMode='FULL-CERT';renderPreview();renderModeStatuses();selectMode('FULL-CERT');setPhase(`Excel cargado · ${cases.length} preguntas · código ${batteryCode}. La semilla depende del contenido: si vuelves a cargar el mismo Excel obtendrás la misma semilla.`);
    }catch(e){setPhase('No se pudo cargar el Excel: '+(e.message||e),true);}
  }

  async function loadPreview(forceNew=false){
    if(uiRunning){setPhase('Hay una ejecución en curso. Pulsa DETENER antes de generar otra batería.');return;}
    if(forceNew||!batterySeed)renewBatterySeed();setPhase('Leyendo tablas reales y generando una batería nueva…');
    try{historicReplayKey='';batterySource='generated';batteryCode='';preview=await fetchJson(`/api/zuzu-tests/preview?seed=${encodeURIComponent(batterySeed)}`,{cache:'no-store',headers:apiHeaders()},45000);batterySeed=num(preview?.seed)||batterySeed;currentRunKey=`seed-${batterySeed}-${Date.now()}`;for(const mode of MODES)modeCache[mode]={rows:[],summary:null};rows=[];lastSummary=null;renderPreview();renderModeStatuses();restoreMode(lastMode);setPhase('Batería nueva preparada. Todavía NO se guarda en el histórico: se guardará automáticamente cuando termines de procesar al menos un modo con esta semilla.');}
    catch(e){setPhase(e.name==='AbortError'?'La lectura de datos tardó demasiado. Vuelve a pulsar NUEVA BATERÍA.':'No se pudo generar la batería: '+(e.message||e),true);}
  }
  function renderPreview(){const c=preview?.dataCounts||{},t=preview?.tests||{},isExcel=(preview?.source==='excel'||batterySource==='excel');$('ztData').innerHTML=(isExcel?[['Origen','Excel'],['Código',preview?.batteryCode||batteryCode],['Preguntas',t['FULL-CERT']||t['AI-SMOKE']],['AI-SMOKE',t['AI-SMOKE']],['FULL-CERT',t['FULL-CERT']]]:[['Eventos',c.events],['Personas',c.people],['Productos',c.products],['Tiendas',c.stores],['Compras',c.purchases],['Ingresos',c.incomes],['DOC',c.documents],['Fototickets',c.ticketImages],['Donaciones',c.donationLines],['Hitos',c.hitos],['LG',c.lgs],['FAST',t.FAST],['AI-SMOKE',t['AI-SMOKE']],['FULL-CERT',t['FULL-CERT']]]).map(x=>`<span class="zt-pill">${esc(x[0])}: <strong>${typeof x[1]==='number'?fmtN(x[1]):esc(x[1]||'—')}</strong></span>`).join('');if($('ztSeedInfo'))$('ztSeedInfo').textContent=isExcel?`Batería Excel ${preview?.batteryCode||batteryCode} · semilla estable ${batterySeed} · ${t['FULL-CERT']||0} preguntas · FULL-CERT conserva toda la conversación en el mismo ledger.`:`Batería ${batteryClock||'reloj local'} · semilla ${batterySeed} · FAST recorre todos los registros estructurales y FULL-CERT incluye continuidad Z1 sobre todos los eventos reales.`;}

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
    if(lastMode==='FAST'){if(preview?.source==='excel'||batterySource==='excel'){setPhase('Las baterías Excel son conversaciones literales: ejecútalas con FULL-CERT (recomendado) o AI-SMOKE. FAST sigue reservado a invariantes autogeneradas de CE.');return;}return runFastStream(onlyIssues);}
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
    finally{stopStreamWatchdog();currentReader=null;currentAbort=null;releaseControls();cacheCurrent();}
  }

  function issueIds(){return new Set(rows.filter(r=>r.status==='KO'||r.status==='WARN').map(r=>String(r.id)));}
  function paidCases(onlyIssues){
    let list=Array.isArray(preview?.cases?.[lastMode])?preview.cases[lastMode].slice():[];
    if(onlyIssues){const ids=issueIds();list=list.filter(c=>ids.has(String(c.id)));}
    const max=Math.max(1,num($('ztMaxCases').value)||24);return list.slice(0,max);
  }
  function fullCertScenarioStart(list,index){
    if(!Array.isArray(list)||index<0||index>=list.length)return index;
    const scenario=trim(list[index]?.scenario);let start=index;
    while(start>0&&trim(list[start-1]?.scenario)===scenario)start--;
    return start;
  }
  function localCaseOutcome(c,status,actual,usage={}){return{id:c.id,group:c.group||'IA',label:c.label||c.prompt,prompt:c.prompt||'',expected:c.expected||'Regla/invariante satisfecha',actual,status,usage,durationMs:0};}

  async function fetchPaidCase(caseDef,conversationState,timeoutMs){
    const child=new AbortController();currentFetchAbort=child;
    const masterAbort=()=>child.abort();currentAbort?.signal?.addEventListener?.('abort',masterAbort,{once:true});
    let timeoutId=null,cancelResolve=null;
    const cancelPromise=new Promise(resolve=>{cancelResolve=()=>resolve({kind:'stopped'});currentCaseCancel=cancelResolve;});
    const imported=!historicReplayKey&&(preview?.source==='excel'||batterySource==='excel'),endpoint=historicReplayKey?`/api/zuzu-tests/history/${encodeURIComponent(historicReplayKey)}/run-case`:imported?'/api/zuzu-tests/run-custom-case':'/api/zuzu-tests/run-case';
    const payload=imported?{mode:lastMode,savedCase:caseDef,conversationState:conversationState||{}}:{mode:lastMode,caseId:caseDef.id,conversationState:conversationState||{},seed:batterySeed};
    const networkPromise=fetch(endpoint,{method:'POST',headers:apiHeaders(),signal:child.signal,body:JSON.stringify(payload)})
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
    const fullCases=lastMode==='FULL-CERT'&&onlyIssues&&Array.isArray(preview?.cases?.['FULL-CERT'])?preview.cases['FULL-CERT'].slice():[];
    const fullIndex=new Map(fullCases.map((c,i)=>[String(c?.id||''),i]));
    let fullBlockStart=-1,fullThrough=-1,contextWarmups=0,contextWarmupFailures=0;
    let ok=0,warn=0,ko=0,done=0,costEur=0,calls=0,tokens=0,budgetStopped=false,conversationState={conversationId:'',previousInteractionId:'',history:[],scenario:''};
    setPhase(`${lastMode}: ${fmtN(total)} preguntas · ORÁCULO ACTIVO · evaluación factual y conversacional. Presupuesto máximo ${fmtE(maxCost)}.`);
    let stopLoop=false;
    try{
      for(let i=0;i<cases.length;i++){
        if(stopRequested||currentAbort.signal.aborted||stopLoop)break;
        const c=cases[i];currentCase=c;

        // FULL-CERT es conversacional. Al repetir solo KO/avisos, una pregunta como
        // «¿Y el impacto neto?» no puede ejecutarse aislada. Reproducimos en silencio
        // todos los turnos anteriores del mismo bloque de escenario y solo puntuamos
        // el caso que el usuario pidió repetir. Los turnos de preparación sí suman su
        // coste/llamadas/tokens reales, pero no alteran OK/KO ni el total visible.
        if(lastMode==='FULL-CERT'&&onlyIssues&&fullCases.length){
          const targetIdx=fullIndex.has(String(c.id))?fullIndex.get(String(c.id)):-1;
          if(targetIdx>=0){
            const blockStart=fullCertScenarioStart(fullCases,targetIdx);
            if(blockStart!==fullBlockStart){
              conversationState={conversationId:'',previousInteractionId:'',history:[],scenario:trim(c.scenario)};
              fullBlockStart=blockStart;fullThrough=blockStart-1;
            }
            let contextFailed=false;
            for(let j=Math.max(blockStart,fullThrough+1);j<targetIdx;j++){
              if(stopRequested||currentAbort.signal.aborted){stopLoop=true;break;}
              if(costEur>0&&costEur+reserve>maxCost){budgetStopped=true;setPhase(`Presupuesto protegido durante la reconstrucción del contexto. Coste acumulado ${fmtE(costEur)}.`);stopLoop=true;break;}
              const prep=fullCases[j],prepStarted=Date.now();
              setLive(`Preparando contexto de ${c.label||c.prompt||'KO'} · turno ${j-blockStart+1}/${targetIdx-blockStart} · ${prep.prompt||prep.label||''}`);
              const prepGot=await fetchPaidCase(prep,conversationState,clientTimeout);
              if(prepGot.kind==='stopped'||stopRequested||currentAbort.signal.aborted){stopLoop=true;break;}
              if(prepGot.kind==='timeout'){
                costEur=Number((costEur+reserve).toFixed(6));calls+=1;contextWarmupFailures++;contextFailed=true;
                setPhase(`No se pudo reconstruir el contexto previo de «${c.prompt||c.label}»: un turno preparatorio agotó el tiempo.`,true);
                break;
              }
              if(prepGot.kind==='error'){
                contextWarmupFailures++;contextFailed=true;
                setPhase(`No se pudo reconstruir el contexto previo de «${c.prompt||c.label}»: ${prepGot.error?.message||prepGot.error}.`,true);
                break;
              }
              const prepResult=prepGot.data?.case||{};const pu=prepResult.usage||{};
              costEur=Number((costEur+num(pu.costEur)).toFixed(6));calls+=num(pu.calls);tokens+=num(pu.tokens);
              conversationState=prepGot.data?.conversationState||conversationState;fullThrough=j;contextWarmups++;
              setLive(`Contexto reconstruido · ${Math.round((Date.now()-prepStarted)/1000)} s · preparando el KO solicitado…`);
            }
            if(stopLoop)break;
            if(contextFailed){
              const r=localCaseOutcome(c,'WARN','ITV: no se ha evaluado este KO porque no fue posible reconstruir de forma fiable los turnos conversacionales anteriores.',{calls:0,tokens:0,costEur:0});
              r.contextReplay=true;r.contextWarmupFailed=true;rows.push(r);appendRow(r);done++;warn++;updateProgress({done,total,ok,warn,ko,percent:Math.round(done*100/total),costEur,calls,tokens});renderFilters();cacheCurrent();currentCase=null;setLive('');
              continue;
            }
          }
        }else if(lastMode==='FULL-CERT'&&conversationState.scenario&&conversationState.scenario!==c.scenario){
          conversationState={conversationId:'',previousInteractionId:'',history:[],scenario:c.scenario||''};
        }

        if(costEur>0&&costEur+reserve>maxCost){budgetStopped=true;setPhase(`Presupuesto protegido: no se inicia el caso ${i+1}. Coste acumulado ${fmtE(costEur)}.`);break;}
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
          if(lastMode==='FULL-CERT')conversationState=got.data?.conversationState||{conversationId:'',previousInteractionId:'',history:[],scenario:c.scenario||''};
        }
        if(lastMode==='FULL-CERT'&&onlyIssues){const idx=fullIndex.has(String(c.id))?fullIndex.get(String(c.id)):-1;if(idx>=0){fullThrough=idx;r.contextReplay=true;}}
        r.durationMs=num(r.durationMs)||Date.now()-started;const u=r.usage||{};costEur=Number((costEur+num(u.costEur)).toFixed(6));calls+=num(u.calls);tokens+=num(u.tokens);done++;
        if(r.status==='OBSERVED'||r.status==='OK')ok++;else if(r.status==='WARN')warn++;else ko++;
        rows.push(r);appendRow(r);updateProgress({done,total,ok,warn,ko,percent:Math.round(done*100/total),costEur,calls,tokens});renderFilters();cacheCurrent();currentCase=null;setLive('');
      }
      const aborted=stopRequested||currentAbort.signal.aborted,incomplete=done<total;
      lastSummary={type:'summary',mode:lastMode,done,total,ok,warn,ko,costEur,calls,tokens,aborted,incomplete,budgetStopped,contextWarmups,contextWarmupFailures,finishedAt:new Date().toISOString(),certified:!aborted&&!incomplete&&ko===0,observationMode:'ORACLE_ACTIVE',oracleEnabled:true,performance:performanceSummary(rows)};
      updateProgress(lastSummary);releaseControls();finish(lastSummary);
    }catch(e){if(stopRequested||e.name==='AbortError')setPhase('Prueba detenida. Puedes continuar con otro chequeo sin cerrar la ventana.');else setPhase('Error de ejecución: '+(e.message||e),true);}
    finally{currentFetchAbort=null;currentCaseCancel=null;currentAbort=null;releaseControls();cacheCurrent();currentCase=null;}
  }

  function handle(msg){
    lastStreamAt=Date.now();
    if(msg.type==='preparing'){setPhase(msg.message||`${msg.mode||'ITV'}: preparando ejecución…`);setLive('Preparando preguntas y contexto de conversación…');return;}
    if(msg.type==='start'){setPhase(`${msg.mode}: ${fmtN(msg.total)} pruebas desde datos reales. ${msg.mode==='FAST'?'Coste IA = 0 €':'Presupuesto máximo '+fmtE(msg.maxCostEur)}`);setLive('');return;}
    if(msg.type==='case_start'){currentCase=msg.case;setLive(`Procesando ${msg.index}/${msg.total} · ${msg.case?.group||''} · ${msg.case?.label||msg.case?.prompt||''}`);return;}
    if(msg.type==='heartbeat'){const sec=Math.max(0,Math.round(num(msg.elapsedMs)/1000));setLive(`Procesando ${msg.index}/${msg.total} · ${currentCase?.group||''} · ${currentCase?.label||currentCase?.prompt||''} · ${sec} s`);return;}
    if(msg.type==='case'){rows.push(msg.case);appendRow(msg.case);updateProgress(msg.progress||{});renderFilters();cacheCurrent();currentCase=null;setLive('');return;}
    if(msg.type==='budget'){setPhase(msg.message||'Presupuesto máximo alcanzado.');return;}
    if(msg.type==='summary'){lastSummary=msg;updateProgress(msg);releaseControls();finish(msg);return;}
    if(msg.type==='error'){setPhase(msg.error||'Error en la prueba',true);}
  }

  function updateProgress(p){const total=num(p.total),done=num(p.done),pct=total?Math.round(done*100/total):num(p.percent);if($('ztBar'))$('ztBar').style.width=Math.max(0,Math.min(100,pct))+'%';if($('ztPct'))$('ztPct').textContent=pct+'%';if($('ztDone'))$('ztDone').textContent=`${fmtN(done)}/${fmtN(total)}`;if($('ztOk'))$('ztOk').textContent=fmtN(p.ok);if($('ztWarn'))$('ztWarn').textContent=fmtN(p.warn);if($('ztKo'))$('ztKo').textContent=fmtN(p.ko);if($('ztCalls'))$('ztCalls').textContent=fmtN(p.calls);if($('ztTokens'))$('ztTokens').textContent=fmtN(p.tokens);if($('ztCost'))$('ztCost').textContent=fmtE(p.costEur);}
  function renderFinishState(s,updatePhase=true){const incomplete=num(s.done)<num(s.total),errors=num(s.ko),warns=num(s.warn),pf=s.performance||performanceSummary(rows),perfText=lastMode==='FAST'?'':` · mediana ${(num(pf.medianMs)/1000).toFixed(1)} s · P90 ${(num(pf.p90Ms)/1000).toFixed(1)} s · ${num(pf.over12s)} >12 s`;if(updatePhase)setPhase(s.aborted?'Ejecución detenida.':errors?`ITV terminada con ${fmtN(errors)} KO y ${fmtN(warns)} avisos.${perfText}`:incomplete?`ITV incompleta.${perfText}`:`ITV completa: ${fmtN(s.ok)} OK, ${fmtN(warns)} avisos, 0 KO.${perfText}`);const cert=$('ztCert');if(!cert)return;if(s.aborted){cert.textContent='⏹ ITV DETENIDA';cert.className='zt-cert bad';}else if(errors){cert.textContent=`🔴 ${fmtN(errors)} KO · ORÁCULO ACTIVO`;cert.className='zt-cert bad';}else if(incomplete){cert.textContent=`🟠 ITV INCOMPLETA · ${fmtN(s.done)}/${fmtN(s.total)} · ORÁCULO ACTIVO`;cert.className='zt-cert warn';}else if(warns){cert.textContent=`🟠 SIN KO · ${fmtN(warns)} AVISOS · ORÁCULO ACTIVO`;cert.className='zt-cert warn';}else{cert.textContent=`🟢 CERTIFICADA · ${fmtN(s.done)} CASOS · ORÁCULO ACTIVO`;cert.className='zt-cert good';}}

  function setRetryState(){const b=$('ztRetry');if(b)b.style.display='none';}
  function finish(s){releaseControls();renderFinishState(s,true);setRetryState();saveHistory(s);cacheCurrent();renderHistory();renderModeStatuses();saveServerRun();setLive('Puedes pasar al SIGUIENTE CHEQUEO sin cerrar esta ventana.');}

  function modelBadge(u={}){const models=Array.isArray(u.models)?u.models:[],attempted=Array.isArray(u.attemptedModels)?u.attemptedModels:[];const actual=models.length?models:attempted.slice(-1);if(!actual.length)return'';const short=m=>/flash-lite/i.test(m)?'LITE':/(?:^|-)flash(?:$|-)/i.test(m)?'FLASH':m;const label=[...new Set(actual.map(short))].join(' + ');const route=attempted.length>1?` · intentos ${attempted.map(short).join(' → ')}`:'';return`Modelo IA: ${label}${route}`;}
  function rowHtml(r){const mb=r.usage?modelBadge(r.usage):'',reasons=Array.isArray(r.validationReasons)&&r.validationReasons.length?`<span>
Oráculo: ${esc(r.validationReasons.join(' | '))}</span>`:'',pf=r.performance||{},phase=(num(pf.compileMs)||num(pf.executeMs)||num(pf.presentMs))?`
C/E/P ${fmtN(pf.compileMs||0)}/${fmtN(pf.executeMs||0)}/${fmtN(pf.presentMs||0)} ms${pf.fastLocal?' · cierre local':''}`:'';return `<div class="zt-row ${esc(r.status)}" data-status="${esc(r.status)}" data-group="${esc(r.group)}"><div class="zt-status">${esc(r.status)}</div><div class="zt-cell"><b>${esc(r.group)}</b><span>${esc(r.id)}</span></div><div class="zt-cell"><b>${esc(r.label)}</b><span>${esc(r.prompt||'')}</span></div><div class="zt-cell zt-expected"><b>Oráculo / referencia esperada</b><span>${esc(r.expected||'')}</span>${reasons}</div><div class="zt-cell zt-actual"><b>Obtenido</b><span>${esc(r.actual||'')}</span>${r.tools?.length?`<span>
Herramientas: ${esc(r.tools.join(', '))}</span>`:''}${mb?`<span>
${esc(mb)}</span>`:''}${r.usage?.fallbackReason?`<span>
Fallback: ${esc(r.usage.fallbackReason)}</span>`:''}</div><div class="zt-ms">${fmtN(r.durationMs)} ms${r.usage?`
${fmtE(r.usage.costEur)} · ${fmtN(r.usage.calls)} IA · ${fmtN(r.usage.tokens)} tok`:''}${phase}</div></div>`;}

  function appendRow(r){const box=$('ztResults');if(rows.length===1)box.innerHTML='';box.insertAdjacentHTML('beforeend',rowHtml(r));applyFilter();box.scrollTop=box.scrollHeight;}
  function groups(){return ['TODOS','OK','WARN','KO',...Array.from(new Set(rows.map(r=>r.group).filter(Boolean)))];}
  function renderFilters(){if(!$('ztFilters'))return;$('ztFilters').innerHTML=groups().map(g=>`<button class="zt-filter ${activeFilter===g?'active':''}" data-f="${esc(g)}">${esc(g)}${['OK','WARN','KO'].includes(g)?` (${rows.filter(r=>r.status===g).length})`:''}</button>`).join('');$('ztFilters').querySelectorAll('button').forEach(b=>b.onclick=()=>{activeFilter=b.dataset.f;renderFilters();applyFilter();});}
  function applyFilter(){document.querySelectorAll('#ztResults .zt-row').forEach(el=>{const show=activeFilter==='TODOS'||(['OK','WARN','KO'].includes(activeFilter)&&el.dataset.status===activeFilter)||el.dataset.group===activeFilter;el.style.display=show?'grid':'none';});}

  async function saveServerRun(){
    if(!preview||!batterySeed||!currentRunKey||!isGD())return;
    const processed=MODES.some(m=>modeCache[m]?.summary&&num(modeCache[m].summary.done)>0);
    if(!processed)return;
    try{
      const summary=Object.fromEntries(MODES.map(m=>[m,modeCache[m]?.summary||null]));
      const payload={runKey:currentRunKey,seed:batterySeed,batteryClock,appVersion:'v4_0_exp',generatedAt:preview?.generatedAt,dataCounts:preview?.dataCounts||{},generatedBattery:preview,report:reportPayload(),summary};
      const d=await fetchJson('/api/zuzu-tests/history',{method:'POST',headers:apiHeaders(),body:JSON.stringify(payload)},30000);
      historyStorage=d?.storage||historyStorage;if($('ztHistoryStorage'))$('ztHistoryStorage').textContent=`Histórico persistente: ${historyStorage||'guardado'} · clave ${currentRunKey}`;await loadServerHistory();
    }catch(e){if($('ztHistoryStorage'))$('ztHistoryStorage').textContent=`Histórico: no se pudo guardar (${e.message||e}). La prueba actual sigue disponible en esta sesión.`;}
  }
  async function loadServerHistory(){
    if(!isGD())return;
    try{const d=await fetchJson('/api/zuzu-tests/history?limit=40',{cache:'no-store',headers:apiHeaders()},30000);historyRuns=Array.isArray(d?.runs)?d.runs:[];historyStorage=d?.storage||'';renderServerHistory();}
    catch(e){historyRuns=[];renderServerHistory();if($('ztHistoryStorage'))$('ztHistoryStorage').textContent=`No se pudo leer el histórico persistente: ${e.message||e}`;}
  }
  function renderServerHistory(){
    const sel=$('ztHistorySelect');if(!sel)return;const current=sel.value;
    sel.innerHTML='<option value="">— Elige una batería histórica —</option>'+historyRuns.map(r=>{const dt=r.updatedAt||r.generatedAt;let when='';try{when=new Date(dt).toLocaleString('es-ES');}catch(_){}const sums=r.summary||{},executed=Object.values(sums).some(x=>num(x?.done)>0),ko=Object.values(sums).reduce((a,x)=>a+num(x?.ko),0),state=executed?(ko?ko+' KO':'sin KO'):'SIN EJECUTAR';return `<option value="${esc(r.runKey)}">${esc(when)} · seed ${esc(r.seed)} · ${state} · ${esc(r.createdBy||'GD')}</option>`;}).join('');
    if(historyRuns.some(r=>r.runKey===current))sel.value=current;
    if($('ztHistoryStorage'))$('ztHistoryStorage').textContent=`${historyRuns.length} batería${historyRuns.length===1?'':'s'} guardada${historyRuns.length===1?'':'s'} · ${historyStorage||'almacenamiento persistente'}. Puedes VER el resultado antiguo o REPETIR la batería exacta (mismas preguntas/esperados).`;
  }
  async function selectedHistorical(){const key=trim($('ztHistorySelect')?.value);if(!key){setPhase('Elige primero una batería histórica del desplegable.');return null;}try{return await fetchJson(`/api/zuzu-tests/history/${encodeURIComponent(key)}`,{cache:'no-store',headers:apiHeaders()},30000);}catch(e){setPhase('No se pudo recuperar la batería histórica: '+(e.message||e),true);return null;}}
  async function deleteHistoricalRun(){
    if(uiRunning){setPhase('Detén la ejecución antes de eliminar una batería histórica.');return;}
    const key=trim($('ztHistorySelect')?.value);if(!key){setPhase('Elige primero la batería que quieres eliminar.');return;}
    const row=historyRuns.find(r=>r.runKey===key),label=row?`seed ${row.seed}`:key;
    if(!window.confirm(`¿Eliminar definitivamente del histórico la batería ${label}?`))return;
    try{
      await fetchJson(`/api/zuzu-tests/history/${encodeURIComponent(key)}`,{method:'DELETE',headers:apiHeaders()},30000);
      if(currentRunKey===key)currentRunKey=`seed-${batterySeed||renewBatterySeed()}-${Date.now()}`;
      await loadServerHistory();setPhase(`Batería ${label} eliminada del histórico.`);
    }catch(e){setPhase('No se pudo eliminar la batería: '+(e.message||e),true);}
  }
  function countsChanged(a={},b={}){const keys=['events','people','products','stores','purchases','incomes','documents','ticketImages','donationLines','hitos','lgs'];return keys.some(k=>a?.[k]!=null&&b?.[k]!=null&&num(a[k])!==num(b[k]));}
  async function loadHistoricalRun(){
    if(uiRunning){setPhase('Detén la ejecución antes de cargar un histórico.');return;}const d=await selectedHistorical();const run=d?.run;if(!run)return;
    historicReplayKey='';currentRunKey=run.runKey;batterySeed=num(run.seed);batteryClock=run.batteryClock||'';preview=run.generatedBattery||null;batterySource=preview?.source==='excel'?'excel':'generated';batteryCode=preview?.batteryCode||'';
    const rep=run.report||{};for(const mode of MODES){modeCache[mode]={rows:Array.isArray(rep?.modes?.[mode]?.results)?rep.modes[mode].results:[],summary:rep?.modes?.[mode]?.summary||null};}
    renderPreview();renderModeStatuses();restoreMode(lastMode);setPhase(`Histórico cargado · semilla ${batterySeed}. Estás viendo sus preguntas, esperados y respuestas originales; no se ha vuelto a ejecutar nada.`);
  }
  async function replayHistoricalRun(){
    if(uiRunning){setPhase('Detén la ejecución antes de repetir una batería histórica.');return;}const d=await selectedHistorical();const run=d?.run;if(!run)return;
    const saved=run.generatedBattery||null;const savedContract=num(saved?.replayContractVersion);if(!saved?.cases||savedContract!==ITV_CONTRACT_VERSION){setPhase(`Esta batería histórica usa contrato v${savedContract||'?'}, pero la ITV actual exige v${ITV_CONTRACT_VERSION}. No se permite certificar una repetición exacta con un contrato distinto: vuelve a cargar el Excel actual y ejecútalo de nuevo. El histórico sigue disponible solo para consulta.`,true);return;}
    historicReplayKey=run.runKey;batterySeed=num(run.seed);batterySource=saved?.source==='excel'?'excel':'generated';batteryCode=saved?.batteryCode||'';{const baseClock=text(run.batteryClock||run.seed).replace(/^(?:repetición exacta\s*·\s*)+/i,'');batteryClock=`repetición exacta · ${baseClock||run.seed}`;}preview=saved;currentRunKey=`exact-${batterySeed}-${Date.now()}`;
    for(const mode of MODES)modeCache[mode]={rows:[],summary:null};rows=[];lastSummary=null;renderPreview();renderModeStatuses();restoreMode(lastMode);
    setPhase(`Batería histórica ${batterySeed} cargada para REPETICIÓN EXACTA. AI-SMOKE y FULL-CERT usarán literalmente las preguntas y esperados guardados; FAST vuelve a comprobar la estructura actual con la misma semilla.`);
  }
  async function replayManualSeed(){
    if(uiRunning){setPhase('Detén la ejecución antes de regenerar una semilla.');return;}
    const raw=trim($('ztSeedReplayInput')?.value),seed=Math.abs(Math.trunc(Number(raw)||0))>>>0;if(!raw||!seed){setPhase('Introduce una semilla numérica válida.');return;}
    setPhase(`Regenerando exactamente la semilla ${seed} contra el código y datos actuales…`);
    try{
      historicReplayKey='';batterySource='generated';batteryCode='';
      const fresh=await fetchJson(`/api/zuzu-tests/preview?seed=${encodeURIComponent(seed)}`,{cache:'no-store',headers:apiHeaders()},45000);
      batterySeed=seed;batteryClock=`semilla manual ${seed}`;preview=fresh;currentRunKey=`manual-${seed}-${Date.now()}`;
      for(const mode of MODES)modeCache[mode]={rows:[],summary:null};rows=[];lastSummary=null;renderPreview();renderModeStatuses();restoreMode(lastMode);
      setPhase(`Semilla ${seed} regenerada contra los datos actuales. Para una regresión literal de una batería antigua usa el desplegable y REPETIR BATERÍA EXACTA.`);
    }catch(e){setPhase('No se pudo regenerar la semilla: '+(e.message||e),true);}
  }
  function history(){try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');}catch(_){return[];}}
  function saveHistory(s){const h=history();h.unshift({at:new Date().toISOString(),mode:lastMode,done:s.done,total:s.total,observed:s.ok,errors:s.ko,costEur:s.costEur,calls:s.calls,tokens:s.tokens,observationMode:lastMode==='FAST'?false:'ORACLE_ACTIVE'});localStorage.setItem(HISTORY_KEY,JSON.stringify(h.slice(0,30)));}
  function renderHistory(){const h=history();if($('ztHistory'))$('ztHistory').textContent=h.length?`Última: ${new Date(h[0].at).toLocaleString('es-ES')} · ${h[0].mode} · ${h[0].observed||0} observadas · ${h[0].errors||0} errores técnicos · ${fmtE(h[0].costEur)}`:'Sin observaciones guardadas en este navegador.';}
  function renderModeStatuses(){for(const mode of MODES){const el=$('ztModeStatus'+mode),s=modeCache[mode]?.summary;if(!el)continue;el.className='zt-mode-status';if(!s){el.textContent='Pendiente';continue;}if(mode==='FAST'){if(s.ko){el.textContent=`${s.ko} KO`;el.classList.add('bad');}else if(num(s.done)<num(s.total)){el.textContent=`${s.done}/${s.total}`;el.classList.add('warn');}else{el.textContent='✓ OK';el.classList.add('good');}continue;}if(s.ko){el.textContent=`${s.ko} KO`;el.classList.add('bad');}else if(num(s.done)<num(s.total)){el.textContent=`${s.done}/${s.total}`;el.classList.add('warn');}else{el.textContent=s.warn?`✓ ${s.done} · ${s.warn} avisos`:`✓ ${s.done}`;el.classList.add('good');}}}



  function itvVersionToken(){
    const candidates=[window.ControlEventVersion?.version,window.ControlEventVersion?.versionFile,window.__ceVersion,document.querySelector?.('[data-ce-version-label]')?.textContent,'v4_0_exp'];
    for(const candidate of candidates){
      let raw=trim(candidate);if(!raw)continue;
      raw=raw.replace(/^ControlEvent[\s_-]+/i,'').replace(/\s+/g,'_');
      const match=raw.match(/v\d+(?:[._]\d+)*(?:(?:_exp)+)?/i);if(!match)continue;
      return match[0].replace(/\./g,'_').replace(/(?:_exp){2,}/ig,'_exp');
    }
    return 'v4_0_exp';
  }
  function itvFilePrefix(){return `ControlEvent_${itvVersionToken()}`;}
  function reportPayload(){
    const modes={};for(const mode of MODES){modes[mode]={summary:modeCache[mode].summary||null,results:modeCache[mode].rows||[]};}
    return{type:'ControlEvent Zuzu ITV',version:itvVersionToken(),itvContractVersion:ITV_CONTRACT_VERSION,itvBuild:ITV_BUILD,itvObservationMode:'ORACLE_ACTIVE',oracleEnabled:true,batteryReplayContractVersion:num(preview?.replayContractVersion)||0,exportedAt:new Date().toISOString(),batterySeed,batteryClock,batterySource,batteryCode,historicReplayKey:historicReplayKey||'',generatedBattery:preview||null,dataCounts:preview?.dataCounts||{},modes,history:history().slice(0,10)};
  }
  function modeFileSuffix(mode=lastMode){return mode==='FAST'?'FAST_CE':mode==='AI-SMOKE'?'AI_SMOKE':'FULL_CERT';}
  function downloadReport(){const payload=reportPayload(),has=MODES.some(m=>modeCache[m].rows.length||modeCache[m].summary);if(!has){alert('Todavía no hay resultados que exportar.');return;}const suffix=modeFileSuffix(lastMode),downloadName=`${itvFilePrefix()}_ITV_Zuzu_${new Date().toISOString().replace(/[:.]/g,'-')}-${suffix}.json`;payload.intendedDownloadName=downloadName;const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=downloadName;document.body.appendChild(a);const nativeClick=window.__CE_NATIVE_ANCHOR_CLICK__;if(typeof nativeClick==='function')nativeClick.call(a);else a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);setPhase(`Informe ${suffix} descargado como ${downloadName}. Puedes adjuntarlo directamente para analizar este chequeo.`);}
  function printReport(){const mode=lastMode,c=modeCache[mode],s=c.summary||{},date=new Date().toLocaleString('es-ES'),suffix=modeFileSuffix(mode),body=c.rows.map(r=>`<tr><td class="${esc(r.status)}">${esc(r.status)}</td><td>${esc(r.group)}</td><td>${esc(r.label)}</td><td>${esc(r.prompt||'')}</td><td>${esc(r.expected||'')}</td><td>${esc(r.actual||'')}</td></tr>`).join('');if(!c.rows.length){alert('Este modo todavía no tiene resultados.');return;}const w=window.open('','_blank');if(!w){setPhase('El navegador ha bloqueado la ventana de impresión. Usa ⬇ INFORME para descargar el JSON.',true);return;}w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${itvFilePrefix()}_ITV_Zuzu_${suffix}</title><style>@page{size:A4 landscape;margin:10mm}body{font-family:Arial,sans-serif;margin:16px;color:#0f172a}h1{color:#075985}table{width:100%;border-collapse:collapse;font-size:8.5px;table-layout:fixed}th,td{border:1px solid #cbd5e1;padding:4px;vertical-align:top;overflow-wrap:anywhere}th:nth-child(1){width:5%}th:nth-child(2){width:8%}th:nth-child(3){width:13%}th:nth-child(4){width:22%}th:nth-child(5){width:20%}th:nth-child(6){width:32%}.OK{color:#15803d;font-weight:bold}.KO{color:#b91c1c;font-weight:bold}.WARN{color:#b45309;font-weight:bold}.summary{display:flex;gap:18px;flex-wrap:wrap;margin:8px 0 12px}.summary b{font-size:16px}</style></head><body><h1>🧪 ITV de Zuzu · ${esc(mode)}</h1><p>${esc(date)} · semilla <b>${esc(batterySeed)}</b> · tablas reales · solo lectura</p><div class="summary"><span>OK <b>${fmtN(s.ok)}</b></span><span>AVISOS <b>${fmtN(s.warn)}</b></span><span>KO <b>${fmtN(s.ko)}</b></span><span>Llamadas IA <b>${fmtN(s.calls)}</b></span><span>Tokens <b>${fmtN(s.tokens)}</b></span><span>Coste <b>${fmtE(s.costEur)}</b></span></div><table><thead><tr><th>Estado</th><th>Grupo</th><th>Prueba</th><th>Pregunta realizada</th><th>Oráculo / referencia</th><th>Respuesta literal de Zuzu</th></tr></thead><tbody>${body}</tbody></table><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);w.document.close();}


  function captureLoginUser(user){
    if(user&&typeof user==='object'){authEventUser=user;window.__CE_ZUZU_ITV_LOGIN_USER__=user;}
    else if(!uiRole()){authEventUser=null;window.__CE_ZUZU_ITV_LOGIN_USER__=null;}
    injectButton();
  }
  function installAuthUiObserver(){
    if(window.__ceZuzuItvAuthUiObserver||typeof MutationObserver!=='function')return;
    const targets=[$('brandCurrentUserMeta'),$('currentUserLevel'),$('brandCurrentUserName'),$('currentUserName')].filter(Boolean);
    if(!targets.length)return;
    const mo=new MutationObserver(()=>injectButton());
    targets.forEach(el=>mo.observe(el,{childList:true,subtree:true,characterData:true,attributes:true}));
    window.__ceZuzuItvAuthUiObserver=mo;
  }

  // Arranque temprano y no intrusivo: no se parchea fetch ni se espera a temporizadores.
  // El botón reacciona al evento real de autenticación y, como respaldo, al texto de usuario de la cabecera.
  style();installAuthUiObserver();
  window.addEventListener('controlevent:auth-changed',e=>captureLoginUser(e?.detail?.user||null));
  window.addEventListener('controlevent:app-ready',()=>{installAuthUiObserver();injectButton();});
  document.addEventListener('DOMContentLoaded',()=>{installAuthUiObserver();injectButton();});
  injectButton();
})();
