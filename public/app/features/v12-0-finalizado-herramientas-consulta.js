/* ControlEvent v17_prod - desbloqueo real de herramientas de consulta con evento Finalizado.
   Permite Zuzu, mantenimientos generales, BACKUP/Excel/importación/descarga. No cambia reglas backend de datos del evento finalizado. */
(function(){
  'use strict';
  if (window.__ceV120FinalizadoHerramientasConsulta) return;
  window.__ceV120FinalizadoHerramientasConsulta = true;

  const STYLE_ID = 'ce-v120-finalizado-tools-style';
  const SAFE_ROOT_SEL = [
    '#ceGeminiLibreOverlay', '#tabPlanificacionInicial', '.planificacion-card', '#planificacionResultado',
    '#maintenanceWrapper', '#maintenancePanel', '#mtPersonas', '#mtEventos', '#mtTiendas', '#mtProductos', '#mtAcceso', '#mtImportar',
    '#backupPanel', '#excelPanel', '#importPanel', '#downloadPanel', '.ce-backup-overlay-v181', '.ce-backup-modal-v181', '#ceV120BackupScopeFix', '#ceBackupScopeV40', '#ceBackupScopeV257', '#ceBackupScopeSelectV841Id'
  ].join(',');
  const SAFE_BUTTON_SEL = [
    '#ceGeminiLibreBtn', '#tabPlanificacionBtn', '#btnGenerarPlanificacion', '#btnPlanApplyReplica', '.ce-zuzu-open', '#btnToggleMaintenance', '#btnExportSeed', '#btnExportExcel', '#btnOpenImport',
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
  let applyTimer = 0;
  function scheduleApply(delay){
    clearTimeout(applyTimer);
    applyTimer = setTimeout(apply, delay == null ? 40 : delay);
  }
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
        const w=function(){ const r=old.apply(this, arguments); scheduleApply(40); return r; };
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
    // v12.0 hotfix: no recorrer DOM en cada tecla/click de toda la app; solo en zonas de consulta permitidas.
    if(!isSafeElement(ev && ev.target)) return;
    mark(ev); installPatches();
    const root = ev?.target?.closest?.(SAFE_ROOT_SEL);
    if(root) unlockRoot(root);
    if(isSafeElement(ev?.target)) unlock(ev.target);
    scheduleApply(30);
  }

  function fileNameFromDisposition(value){
    const s = text(value);
    const m = /filename\*?=(?:UTF-8''|\")?([^";]+)/i.exec(s);
    return m ? decodeURIComponent(m[1].replace(/"/g,'')) : '';
  }
  function downloadBlob(blob, filename){
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename || ('ControlEvent_v17_prod_BACKUP_' + Date.now() + '.xlsx');
    a.style.display='none'; document.body.appendChild(a); a.click();
    setTimeout(()=>{ try{ a.remove(); URL.revokeObjectURL(url); }catch(_){} }, 1500);
  }
  function backupEvents(){
    const evs = Array.isArray(st().eventos) ? st().eventos.slice() : [];
    const seen = new Set();
    return evs.filter(e => { const id=text(e&&e.id).trim(); if(!id || seen.has(id)) return false; seen.add(id); return true; });
  }
  function escHtml(v){ return text(v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
  async function runBackupDownload(scope){
    const params = new URLSearchParams();
    if(scope === 'TODOS') params.set('scope','all');
    else { params.set('scope','event'); params.set('eventId', scope); }
    const res = await fetch('/api/export/backup?' + params.toString() + '&ts=' + Date.now(), {cache:'no-store'});
    if(!res.ok) throw new Error('Servidor no generó BACKUP (' + res.status + ')');
    const blob = await res.blob();
    if(!blob || !blob.size) throw new Error('El BACKUP descargado está vacío.');
    downloadBlob(blob, fileNameFromDisposition(res.headers.get('content-disposition')) || 'ControlEvent_v17_prod_BACKUP.xlsx');
  }
  function openBackupDialogFinalizado(){
    const existing = document.getElementById('ceV120BackupOverlayFix'); if(existing) existing.remove();
    const evs = backupEvents();
    const cur = eventId();
    const opts = ['<option value="TODOS">TODOS los eventos</option>'].concat(evs.map(e => '<option value="'+escHtml(e.id)+'" '+(text(e.id)===cur?'selected':'')+'>'+escHtml(e.titulo || e.id)+'</option>')).join('');
    const overlay=document.createElement('div'); overlay.id='ceV120BackupOverlayFix'; overlay.className='ce-backup-overlay-v181';
    overlay.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:16px;';
    overlay.innerHTML='<div class="ce-backup-modal-v181" style="max-width:520px;width:100%;background:#fff;border-radius:20px;padding:18px;box-shadow:0 24px 70px rgba(15,23,42,.35);font-family:system-ui,-apple-system,Segoe UI,sans-serif;">'+
      '<h3 style="margin:0 0 8px;color:#0f172a;">Descarga de datos</h3><p style="margin:0 0 14px;color:#475569;font-size:14px;">Elige si quieres descargar todos los datos o solo los vinculados a un evento concreto.</p>'+
      '<div class="field" style="display:grid;gap:6px;margin-bottom:14px;"><label style="font-weight:900;color:#334155;">Evento a descargar</label><select id="ceV120BackupScopeFix" style="padding:10px;border:1px solid #cbd5e1;border-radius:12px;font-weight:800;">'+opts+'</select></div>'+
      '<div style="display:flex;gap:10px;justify-content:flex-end;"><button type="button" id="ceV120BackupCancelFix" class="outline" style="padding:10px 14px;border-radius:12px;border:1px solid #cbd5e1;background:#fff;font-weight:900;">Cancelar</button><button type="button" id="ceV120BackupOkFix" style="padding:10px 14px;border-radius:12px;border:0;background:#f97316;color:#fff;font-weight:900;">Descargar</button></div><div id="ceV120BackupMsgFix" style="margin-top:10px;font-weight:800;color:#475569;"></div></div>';
    document.body.appendChild(overlay); unlockRoot(overlay);
    overlay.addEventListener('click', ev => { if(ev.target===overlay) overlay.remove(); }, true);
    overlay.querySelector('#ceV120BackupCancelFix').addEventListener('click', () => overlay.remove(), true);
    overlay.querySelector('#ceV120BackupOkFix').addEventListener('click', async ev => {
      ev.preventDefault(); ev.stopPropagation();
      const msg=overlay.querySelector('#ceV120BackupMsgFix'); const btn=overlay.querySelector('#ceV120BackupOkFix');
      try{ btn.disabled=true; if(msg) msg.textContent='Preparando BACKUP...'; await runBackupDownload(overlay.querySelector('#ceV120BackupScopeFix')?.value || 'TODOS'); overlay.remove(); }
      catch(err){ if(msg) msg.textContent='No se pudo descargar: '+(err && err.message || err); btn.disabled=false; }
    }, true);
  }
  function interceptBackupFinalizado(ev){
    const b = ev && ev.target && ev.target.closest && ev.target.closest('#btnExportSeed,.mobile-menu-action[data-target="btnExportSeed"]');
    if(!b || !isFinalizado()) return;
    ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    installPatches(); openBackupDialogFinalizado();
    return false;
  }
  document.addEventListener('click', interceptBackupFinalizado, true);
  document.addEventListener('touchend', interceptBackupFinalizado, {capture:true, passive:false});

  ['focusin','pointerdown','mousedown','click','touchstart','touchend','pointerup','keydown','keypress','keyup','beforeinput','input','change'].forEach(name=>{
    try{ document.addEventListener(name, around, {capture:true, passive:false}); }catch(_){}
    try{ window.addEventListener(name, around, {capture:true, passive:false}); }catch(_){}
  });
  ['DOMContentLoaded','load','ce:state-loaded','ce:event-selected','controlevent:event-loaded','controlevent:event-ready','controlevent:module-mounted','visibilitychange'].forEach(name=>{
    try{ window.addEventListener(name, () => { installPatches(); setTimeout(apply,0); setTimeout(apply,120); }, true); }catch(_){}
    try{ document.addEventListener(name, () => { installPatches(); setTimeout(apply,0); setTimeout(apply,120); }, true); }catch(_){}
  });
  installPatches();
  [80,500,1400].forEach(ms=>setTimeout(apply,ms));
  window.ControlEventV120FinalizadoTools = { apply, isFinalizado };
})();
