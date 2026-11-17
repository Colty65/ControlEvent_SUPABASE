/* ControlEvent v6_1-exp · FIX21
   Evento FINALIZADO = SOLO LECTURA, no interfaz congelada.
   IMPORTANTE: esta capa NO parchea prototypes, setAttribute, disabled/readOnly ni instala
   capturadores globales por cada click/tecla. Las mutaciones siguen bloqueadas por los módulos
   y por backend; aquí solo mantenemos navegables las herramientas de consulta. */
(function(){
  'use strict';
  if(window.__ceV121FinalReadOnly)return;
  window.__ceV121FinalReadOnly=true;
  const $=id=>document.getElementById(id), text=v=>v==null?'':String(v);
  const STYLE_ID='ce-v121-final-readonly-style';
  const SAFE_BUTTONS=[
    'selectedEvent','btnLogout','tabIngresosBtn','tabComprasBtn','tabDonacionesBtn','tabMapaBtn','tabResumenBtn','tabGraficasBtn',
    'btnToggleMaintenance','mtPersonasBtn','mtEventosBtn','mtTiendasBtn','mtProductosBtn','mtAccesoBtn','mtImportBtn',
    'ceGeminiLibreBtn','ceZuzuTestBtn','btnOpenBankReconciliation','btnInfoEvento','btnDownloadInfoEvento','btnExportSeed','btnExportExcel','ceMapaGlobalBtn'
  ];
  const QUERY_ROOTS=['#ceGeminiLibreOverlay','#ceZuzuTestOverlay','#ceAntonioLabOverlay','#ceBankOverlay','#ceBankBalanceChartOverlay','#ceBankHistoryOverlay','#ceBankTicketPhoto','#ceBankBalanceInspector','#ceMapaGlobalOverlay','#ceV19ImageViewer'];
  function state(){try{return window.state||window.ControlEventApp?.state||window.appState||{};}catch(_){return{};}}
  function selectedId(){try{if(typeof window.selectedEventId==='function')return text(window.selectedEventId()).trim();}catch(_){}return text(state().selectedEventId||$('selectedEvent')?.value).trim();}
  function selectedEvent(){const id=selectedId(),evs=Array.isArray(state().eventos)?state().eventos:[];return evs.find(e=>text(e?.id).trim()===id)||null;}
  function finalized(){return /^finalizado$/i.test(text(selectedEvent()?.situacion).trim());}
  function injectStyle(){if($(STYLE_ID))return;const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
    body.ce-v121-final-readonly .app-lockable.locked{opacity:1!important;filter:none!important;user-select:auto!important;}
    body.ce-v121-final-readonly #mainTabs,
    body.ce-v121-final-readonly #mainTabs *{pointer-events:auto!important;opacity:1!important;filter:none!important;}
    body.ce-v121-final-readonly ${QUERY_ROOTS.join(',body.ce-v121-final-readonly ')}{pointer-events:auto!important;opacity:1!important;filter:none!important;visibility:visible!important;}
    body.ce-v121-final-readonly ${QUERY_ROOTS.map(x=>x+' *').join(',body.ce-v121-final-readonly ')}{pointer-events:auto!important;}
    body.ce-v121-final-readonly #ceBankSearch,
    body.ce-v121-final-readonly #ceBankAccount,
    body.ce-v121-final-readonly #ceBankSort{pointer-events:auto!important;opacity:1!important;filter:none!important;user-select:text!important;-webkit-user-select:text!important;}
  `;document.head.appendChild(s);}
  function enableSafeNav(){
    if(!finalized())return;
    for(const id of SAFE_BUTTONS){const el=$(id);if(!el)continue;try{el.disabled=false;el.removeAttribute('disabled');el.removeAttribute('inert');el.setAttribute('aria-disabled','false');el.classList.remove('locked','ce-v225-ro-disabled');}catch(_){}}
    // Los módulos bancario y Zuzu gestionan internamente qué acciones escriben. No se tocan
    // sus controles de modificación ni se recorren sus cientos de nodos.
  }
  function apply(){injectStyle();const fin=finalized();document.body?.classList.toggle('ce-v121-final-readonly',fin);if(fin)enableSafeNav();}
  function wrapRenderLockOnce(){
    try{const old=window.renderLockState||(typeof renderLockState==='function'?renderLockState:null);if(!old||old.__ceV121)return;const w=function(){const r=old.apply(this,arguments);queueMicrotask(enableSafeNav);return r;};w.__ceV121=true;w.__ceOriginal=old;window.renderLockState=w;try{renderLockState=w;}catch(_){}}catch(_){}
  }
  ['DOMContentLoaded','load','ce:state-loaded','ce:event-selected','controlevent:event-loaded','controlevent:event-ready','controlevent:module-mounted'].forEach(name=>{
    document.addEventListener(name,()=>{wrapRenderLockOnce();apply();},{capture:false});
    window.addEventListener(name,()=>{wrapRenderLockOnce();apply();},{capture:false});
  });
  wrapRenderLockOnce();
  [0,120,700].forEach(ms=>setTimeout(apply,ms));
  window.ControlEventV120FinalizadoTools={apply,isFinalizado:finalized};
})();
