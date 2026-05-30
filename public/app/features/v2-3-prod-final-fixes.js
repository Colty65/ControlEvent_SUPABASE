/* ControlEvent v2.3_prod - nombres de exportacion y BACKUP con contenido real.
   Base: v2.3_prod estable. No toca login, fotos, globos ni render operativo. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v2.3_prod';
  const VERSION_FILE = 'ControlEvent_v2_3_prod';
  const PATCH_ID = 'ce-v2-3-prod-final-fixes';
  if(window.__ceV23ProdFinalInstalled) return;
  window.__ceV23ProdFinalInstalled = true;

  function safe(fn, fallback){ try{ return fn(); }catch(_){ return fallback; } }
  function pad(n){ return String(n).padStart(2, '0'); }
  function stamp(){ const d = new Date(); return {yyyy:d.getFullYear(), mm:pad(d.getMonth()+1), dd:pad(d.getDate()), hh:pad(d.getHours()), mi:pad(d.getMinutes()), ss:pad(d.getSeconds())}; }
  function clean(value, fallback){
    return String(value || fallback || 'SIN_TITULO')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[\\/:*?"<>|]+/g, ' ')
      .replace(/\s+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || (fallback || 'SIN_TITULO');
  }
  function currentEventTitle(){
    const app = window.ControlEventApp || {};
    const state = app.state || window.state || {};
    const id = app.state?.selectedEventId || state.selectedEventId || '';
    const evs = Array.isArray(state.eventos) ? state.eventos : [];
    const ev = evs.find(e => String(e.id) === String(id));
    return ev?.titulo || document.querySelector('#eventSelect option:checked')?.textContent || 'evento';
  }
  function applyVersion(){
    safe(() => { document.title = VERSION; });
    safe(() => { window.__ceVersion = VERSION; });
    safe(() => { window.ControlEventVersion = {version: VERSION, versionFile: VERSION_FILE}; });
    document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => {
      const text = String(el.textContent || '');
      if(/ControlEvent\s+v/i.test(text) || el.matches('[data-ce-version-label]')) el.textContent = VERSION;
    });
  }
  function normalizeDownloadName(name){
    const raw = String(name || '');
    const s = stamp();
    if(/INFOEVENTO/i.test(raw)){
      return `${VERSION_FILE}_INFOEVENTO-${clean(currentEventTitle(), 'evento')}_${s.yyyy}${s.mm}${s.dd}.xlsx`;
    }
    if(/BACKUP|descarga[_ -]?datos|seed/i.test(raw)){
      let label = 'TODOS';
      const match = raw.match(/BACKUP[_ -]([^_.]+(?:_[^_.]+)*)[_ -]\d{6,8}/i);
      if(match && match[1]) label = clean(match[1], 'TODOS');
      return `${VERSION_FILE}_BACKUP_${label}_${s.yyyy}${s.mm}${s.dd}_${s.hh}${s.mi}${s.ss}.xlsx`;
    }
    return raw.replace(/ControlEvent_v[0-9A-Za-z_.-]+/g, VERSION_FILE).replace(/ControlEvent\s+v[0-9A-Za-z_.-]+/g, VERSION);
  }
  function installDownloadNameGuard(){
    if(window.__ceV23ProdDownloadGuard) return;
    window.__ceV23ProdDownloadGuard = true;
    const proto = window.HTMLAnchorElement && window.HTMLAnchorElement.prototype;
    if(!proto || !proto.click) return;
    const original = proto.click;
    Object.defineProperty(proto, 'click', { configurable:true, writable:true, value:function(){
      try{ if(this && this.download) this.download = normalizeDownloadName(this.download); }catch(_){ }
      return original.apply(this, arguments);
    }});
  }
  async function runBackup(){
    const excel = window.ControlEventExcel;
    if(excel && typeof excel.run === 'function'){
      return excel.run('backup', {source: PATCH_ID, preferServerBackup:false, calledAt:new Date().toISOString()});
    }
    const fn = window.exportSeedWorkbook;
    if(typeof fn === 'function') return fn();
    throw new Error('No se ha encontrado el motor de BACKUP.');
  }
  function installBackupClickGuard(){
    if(window.__ceV23ProdBackupClickGuard) return;
    window.__ceV23ProdBackupClickGuard = true;
    document.addEventListener('click', ev => {
      const btn = ev.target?.closest?.('#btnExportSeed,.mobile-menu-action[data-target="btnExportSeed"]');
      if(!btn) return;
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      Promise.resolve(runBackup()).catch(error => {
        console.error('[ControlEvent v2.3_prod] BACKUP', error);
        alert(`No se pudo descargar BACKUP.\n\n${error?.name || 'Error'}: ${error?.message || error}`);
      });
      return false;
    }, true);
  }
  function installPublicBackupFacade(){
    const backupWrapper = function(){ return runBackup(); };
    try{ Object.defineProperty(backupWrapper, '__ceExcelFacade', {value:true}); Object.defineProperty(backupWrapper, '__ceExcelFacadeName', {value:'exportSeedWorkbook'}); }catch(_){ }
    window.exportSeedWorkbook = backupWrapper;
    safe(() => { exportSeedWorkbook = backupWrapper; });
  }
  function install(){
    applyVersion();
    installDownloadNameGuard();
    installBackupClickGuard();
    installPublicBackupFacade();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
  window.addEventListener('controlevent:excel-before-run', applyVersion);
  window.addEventListener('controlevent:excel-after-run', applyVersion);
  window.ControlEventV23Prod = {version: VERSION, versionFile: VERSION_FILE, runBackup, normalizeDownloadName};
})();
