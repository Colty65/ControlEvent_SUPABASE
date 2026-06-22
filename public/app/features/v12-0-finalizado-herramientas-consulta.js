/* ControlEvent v12.0_prod - desbloqueo real de herramientas de consulta con evento Finalizado.
   Permite Zuzu, mantenimientos generales, BACKUP/Excel/importación/descarga. No cambia reglas backend de datos del evento finalizado. */
(function(){
  'use strict';
  if (window.__ceV120FinalizadoHerramientasConsulta) return;
  window.__ceV120FinalizadoHerramientasConsulta = true;

  const STYLE_ID = 'ce-v120-finalizado-tools-style';
  const SAFE_ROOT_SEL = [
    '#ceGeminiLibreOverlay',
    '#maintenanceWrapper', '#maintenancePanel', '#mtPersonas', '#mtEventos', '#mtTiendas', '#mtProductos', '#mtAcceso', '#mtImportar',
    '#backupPanel', '#excelPanel', '#importPanel', '#downloadPanel'
  ].join(',');
  const SAFE_BUTTON_SEL = [
    '#ceGeminiLibreBtn', '.ce-zuzu-open', '#btnToggleMaintenance', '#btnExportSeed', '#btnExportExcel', '#btnOpenImport',
    '#btnStartImport', '#btnClearImportStatus', '#mtPersonasBtn', '#mtEventosBtn', '#mtTiendasBtn', '#mtProductosBtn', '#mtAccesoBtn',
    '#btnBackup', '#btnDownloadBackup', '#btnDownloadInfoEvento', '#btnInfoEvento', '#btnExportData', '#btnImportData'
  ].join(',');
  const SAFE_SEL = SAFE_ROOT_SEL + ',' + SAFE_BUTTON_SEL;
  function $(id){ return document.getElementById(id); }
  function text(v){ return v == null ? '' : String(v); }
  function st(){ try { return window.state || window.ControlEventApp?.state || window.appState || {}; } catch(_) { return {}; } }
  function eventId(){
    try { if (typeof window.selectedEventId === 'function') return text(window.selectedEventId()).trim(); } catch(_) {}
    return text(st().selectedEventId || $('selectedEvent')?.value || '').trim();
  }
  function selectedEvent(){
    const id = eventId();
    const evs = Array.isArray(st().eventos) ? st().eventos : [];
    return evs.find(e => text(e?.id).trim() === id) || null;
  }
  function isFinalizado(){ return /^finalizado$/i.test(text(selectedEvent()?.situacion).trim()); }
  function isSafeElement(el){
    try { return !!(el && el.closest && el.closest(SAFE_SEL)); } catch(_) { return false; }
  }
  function unlock(el){
    if(!el) return;
    try{ el.disabled = false; }catch(_){}
    try{ el.readOnly = false; }catch(_){}
    try{ el.inert = false; }catch(_){}
    try{ el.removeAttribute('disabled'); el.removeAttribute('readonly'); el.removeAttribute('aria-disabled'); el.removeAttribute('inert'); }catch(_){}
    try{ el.classList.remove('locked','app-disabled','disabled','is-locked','ce-v225-ro-disabled','hidden-by-role-v228','readonly','read-only'); }catch(_){}
    try{
      el.style.setProperty('pointer-events','auto','important');
      el.style.setProperty('opacity','1','important');
      el.style.setProperty('filter','none','important');
      el.style.setProperty('visibility','visible','important');
      if(/INPUT|TEXTAREA|SELECT/.test(el.tagName||'')){
        el.style.setProperty('user-select','text','important');
        el.style.setProperty('-webkit-user-select','text','important');
        el.style.setProperty('caret-color','auto','important');
      }
    }catch(_){}
  }
  function unlockRoot(root){
    if(!root) return;
    unlock(root);
    try{ root.querySelectorAll('button,input,select,textarea,[contenteditable],a,[role="button"]').forEach(unlock); }catch(_){}
  }
  function apply(){
    injectStyle();
    patchLockFunctions();
    const fin = isFinalizado();
    document.body.classList.toggle('ce-v120-finalizado-tools', fin);
    if(!fin) return;
    try{ document.querySelectorAll(SAFE_SEL).forEach(unlockRoot); }catch(_){}
    try{ document.querySelectorAll(SAFE_ROOT_SEL).forEach(unlockRoot); }catch(_){}
  }
  function injectStyle(){
    if($(STYLE_ID)) return;
    const style=document.createElement('style'); style.id=STYLE_ID;
    style.textContent = `
      body.ce-v120-finalizado-tools ${SAFE_BUTTON_SEL},
      body.ce-v120-finalizado-tools ${SAFE_ROOT_SEL}{pointer-events:auto!important;opacity:1!important;filter:none!important;visibility:visible!important;}
      body.ce-v120-finalizado-tools ${SAFE_ROOT_SEL} *{pointer-events:auto!important;opacity:1!important;filter:none!important;visibility:visible!important;}
      body.ce-v120-finalizado-tools ${SAFE_ROOT_SEL} input,
      body.ce-v120-finalizado-tools ${SAFE_ROOT_SEL} textarea,
      body.ce-v120-finalizado-tools ${SAFE_ROOT_SEL} select{user-select:text!important;-webkit-user-select:text!important;caret-color:auto!important;background:#fff!important;color:#111827!important;}
      body.ce-v120-finalizado-tools #ceGeminiLibreOverlay textarea{min-height:110px!important;}
    `;
    document.head.appendChild(style);
  }
  let safeUntil = 0;
  function mark(ev){ if(isSafeElement(ev && ev.target)){ safeUntil = Date.now() + 2500; } }
  function safeContext(){ return Date.now() < safeUntil || isSafeElement(document.activeElement); }
  function patchLockFunctions(){
    try{
      const old = (typeof window.isLocked === 'function') ? window.isLocked : (typeof isLocked === 'function' ? isLocked : null);
      if(old && !old.__ceV120FinalTools){
        const w=function(){ if(isFinalizado() && safeContext()) return false; return old.apply(this, arguments); };
        w.__ceV120FinalTools=true; w.__ceOriginal=old;
        window.isLocked=w; try{ isLocked=w; }catch(_){}
      }
    }catch(_){}
    try{
      const old = window.renderLockState || (typeof renderLockState === 'function' ? renderLockState : null);
      if(old && !old.__ceV120FinalTools){
        const w=function(){ const r=old.apply(this, arguments); setTimeout(apply,0); setTimeout(apply,80); return r; };
        w.__ceV120FinalTools=true; window.renderLockState=w; try{ renderLockState=w; }catch(_){}
      }
    }catch(_){}
  }
  function patchProperty(proto, prop){
    try{
      const flag='__ceV120Patched_'+prop;
      if(proto[flag]) return;
      const d=Object.getOwnPropertyDescriptor(proto, prop);
      if(!d || !d.configurable) return;
      Object.defineProperty(proto, prop, {
        configurable:true,
        enumerable:d.enumerable,
        get:function(){ return d.get ? d.get.call(this) : false; },
        set:function(v){
          if(v && isFinalizado() && isSafeElement(this)) v=false;
          if(d.set) return d.set.call(this, v);
        }
      });
      try{ Object.defineProperty(proto, flag, {value:true, configurable:false}); }catch(_){}
    }catch(_){}
  }
  function patchSetAttribute(){
    try{
      const old = Element.prototype.setAttribute;
      if(old.__ceV120FinalTools) return;
      const w=function(name, value){
        const n=text(name).toLowerCase();
        if(isFinalizado() && isSafeElement(this) && (n==='disabled' || n==='readonly' || n==='inert' || n==='aria-disabled')) return;
        return old.apply(this, arguments);
      };
      w.__ceV120FinalTools=true;
      Element.prototype.setAttribute=w;
    }catch(_){}
  }
  function installPatches(){
    patchSetAttribute();
    [HTMLInputElement.prototype, HTMLTextAreaElement.prototype, HTMLSelectElement.prototype, HTMLButtonElement.prototype].forEach(p => patchProperty(p, 'disabled'));
    [HTMLInputElement.prototype, HTMLTextAreaElement.prototype].forEach(p => patchProperty(p, 'readOnly'));
    try{ patchProperty(HTMLElement.prototype, 'inert'); }catch(_){}
    patchLockFunctions();
  }
  function around(ev){
    if(!isFinalizado()) return;
    mark(ev); installPatches();
    const root = ev?.target?.closest?.(SAFE_ROOT_SEL);
    if(root) unlockRoot(root);
    if(isSafeElement(ev?.target)) unlock(ev.target);
    setTimeout(apply,0);
  }
  ['focusin','pointerdown','mousedown','click','touchstart','touchend','pointerup','keydown','keypress','keyup','beforeinput','input','change'].forEach(name=>{
    try{ document.addEventListener(name, around, {capture:true, passive:false}); }catch(_){}
    try{ window.addEventListener(name, around, {capture:true, passive:false}); }catch(_){}
  });
  ['DOMContentLoaded','load','ce:state-loaded','ce:event-selected','controlevent:event-loaded','controlevent:event-ready','controlevent:module-mounted','visibilitychange'].forEach(name=>{
    try{ window.addEventListener(name, () => { installPatches(); setTimeout(apply,0); setTimeout(apply,120); }, true); }catch(_){}
    try{ document.addEventListener(name, () => { installPatches(); setTimeout(apply,0); setTimeout(apply,120); }, true); }catch(_){}
  });
  installPatches();
  [60,180,450,900,1600,2600,4200].forEach(ms=>setTimeout(apply,ms));
  setInterval(function(){ if(isFinalizado()) apply(); }, 1200);
  window.ControlEventV120FinalizadoTools = { apply, isFinalizado };
})();
