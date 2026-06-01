/* ControlEvent v7.3.2_prod - GD: carga/BACKUP permitidos aunque el evento esté Finalizado.
   No genera BACKUP, no toca datos, no usa setInterval. Solo desbloquea botones/inputs de carga y descarga para GD. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v7.3.2_prod';
  const VERSION_FILE = 'ControlEvent_v7_3_2_prod';
  if(window.__ceV732GdToolsFinalizado) return;
  window.__ceV732GdToolsFinalizado = true;
  const IDS = ['btnOpenImport','btnExportSeed','btnStartImport','importWorkbookFile','importTicketFiles','importMode','btnClearImportStatus'];
  const $ = id => document.getElementById(id);
  const safe = fn => { try{ return fn(); }catch(_){ return undefined; } };
  function role(){ return String(safe(() => authUser?.nivel) || window.authUser?.nivel || window.ControlEventApp?.authUser?.nivel || window.__CONTROL_EVENT_USER__?.nivel || '').toUpperCase(); }
  function isGD(){ return role() === 'GD'; }
  function enable(el){
    if(!el) return;
    el.disabled = false;
    el.readOnly = false;
    el.classList.remove('locked','app-disabled','disabled','is-locked','ce-v225-ro-disabled');
    el.removeAttribute('disabled');
    el.removeAttribute('aria-disabled');
    el.style.pointerEvents = 'auto';
    el.style.opacity = '1';
    el.style.filter = 'none';
  }
  function unlock(){
    if(!isGD()) return;
    IDS.forEach(id => enable($(id)));
    document.querySelectorAll('.mobile-menu-action[data-target="btnOpenImport"],.mobile-menu-action[data-target="btnExportSeed"]').forEach(enable);
    const panel = $('mtImportar');
    if(panel) panel.querySelectorAll('input,select,button').forEach(enable);
  }
  function applyVersion(){
    safe(() => { document.title = VERSION; });
    safe(() => { window.__ceVersion = VERSION; window.VERSION = VERSION; window.VERSION_FILE = VERSION_FILE; window.ControlEventVersion = {version:VERSION, versionFile:VERSION_FILE}; });
    safe(() => document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => { if(/ControlEvent\s+v/i.test(el.textContent || '') || el.hasAttribute('data-ce-version-label')) el.textContent = VERSION; }));
  }
  function install(){ applyVersion(); unlock(); }
  const oldRenderLock = safe(() => renderLockState) || window.renderLockState;
  if(typeof oldRenderLock === 'function' && !oldRenderLock.__ceV732GdTools){
    const wrapped = function(){ const ret = oldRenderLock.apply(this, arguments); setTimeout(unlock, 0); setTimeout(unlock, 80); return ret; };
    wrapped.__ceV732GdTools = true;
    safe(() => { renderLockState = wrapped; });
    window.renderLockState = wrapped;
  }
  ['pointerdown','touchstart','click','change'].forEach(type => document.addEventListener(type, ev => {
    if(ev.target?.closest?.('#btnOpenImport,#btnExportSeed,#mtImportar,.mobile-menu-action[data-target="btnOpenImport"],.mobile-menu-action[data-target="btnExportSeed"]')) setTimeout(unlock, 0);
  }, {capture:true, passive:true}));
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready','controlevent:module-mounted','controlevent:event-loaded'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 30)));
  [0,120,600].forEach(ms => setTimeout(install, ms));
  window.ControlEventV732GdToolsFinalizado = {version:VERSION, versionFile:VERSION_FILE, unlock};
})();
