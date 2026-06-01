/* ControlEvent v7.3.1_prod - ajuste mínimo:
   1) INFOEVENTO interno con versión v7.3.1_prod.
   2) Carga inicial y BACKUP disponibles aunque el evento seleccionado esté FINALIZADO.
   Sin setInterval ni bucles periódicos. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v7.3.1_prod';
  const VERSION_FILE = 'ControlEvent_v7_3_1_prod';
  const INSTALLED = '__ceV731ImportBackupInfoeventoFix';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const GLOBAL_IDS = ['btnOpenImport','btnExportSeed','btnStartImport','importWorkbookFile','importTicketFiles','importMode','btnClearImportStatus','ceBackupOkV181','ceBackupCancelV181'];
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const up = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  function role(){ return up(safe(() => window.authUser && (window.authUser.nivel || window.authUser.role), '')); }
  function isGD(){ return role() === 'GD'; }
  function normalizeText(value){
    return String(value == null ? '' : value)
      .replace(/ControlEvent_v\d+(?:_\d+){1,5}(?:_prod)?/ig, VERSION_FILE)
      .replace(/ControlEvent\s+v\d+(?:\.\d+){1,5}(?:_prod)?/ig, VERSION)
      .replace(/v\d+(?:\.\d+){1,5}_prod/ig, 'v7.3.1_prod');
  }
  function applyVersion(){
    safe(() => { document.title = VERSION; }, null);
    safe(() => {
      window.__ceVersion = VERSION;
      window.VERSION = VERSION;
      window.VERSION_FILE = VERSION_FILE;
      window.ControlEventVersion = {version:VERSION, versionFile:VERSION_FILE};
      if(document.body) document.body.dataset.ceVersion = VERSION;
    }, null);
    safe(() => {
      document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => {
        const txt = el.textContent || '';
        if(/ControlEvent\s+v/i.test(txt) || el.matches('[data-ce-version-label]')) el.textContent = VERSION;
      });
    }, null);
  }
  function unlockGlobalImportBackupControls(){
    // Mantener la restricción de rol: no se habilita para RO/RW si los parches previos lo ocultan.
    if(!isGD()) return;
    for(const id of GLOBAL_IDS){
      const el = document.getElementById(id);
      if(!el) continue;
      el.disabled = false;
      el.readOnly = false;
      el.removeAttribute('disabled');
      el.removeAttribute('readonly');
      el.removeAttribute('aria-disabled');
      el.classList.remove('locked','app-disabled','disabled','is-locked','ce-v225-ro-disabled');
      el.style.pointerEvents = 'auto';
      el.style.opacity = '1';
      el.style.filter = 'none';
    }
    document.querySelectorAll('.mobile-menu-action[data-target="btnOpenImport"],.mobile-menu-action[data-target="btnExportSeed"]').forEach(el => {
      el.disabled = false;
      el.removeAttribute('disabled');
      el.removeAttribute('aria-disabled');
      el.classList.remove('locked','app-disabled','disabled','is-locked','ce-v225-ro-disabled');
      el.style.pointerEvents = 'auto';
      el.style.opacity = '1';
      el.style.filter = 'none';
    });
  }
  function scrubValue(value){
    if(typeof value === 'string') return normalizeText(value);
    if(value && typeof value === 'object'){
      if(Array.isArray(value.richText)) return {...value, richText:value.richText.map(part => ({...part, text:normalizeText(part.text || '')}))};
      if(typeof value.text === 'string') return {...value, text:normalizeText(value.text)};
      if(typeof value.result === 'string') return {...value, result:normalizeText(value.result)};
    }
    return value;
  }
  function scrubWorkbook(wb){
    if(!wb) return wb;
    // Evita que el wrapper v7.3 antiguo vuelva a reescribir la versión después de este scrub.
    try{ wb.__ceV73Scrubbed = true; }catch(_){ }
    try{ wb.__ceV731Scrubbed = true; }catch(_){ }
    safe(() => { wb.creator = `${VERSION} - ©oltyLAB ’26`; }, null);
    safe(() => { wb.lastModifiedBy = VERSION; }, null);
    safe(() => { (wb.worksheets || []).forEach(ws => { ws.eachRow(row => row.eachCell(cell => { cell.value = scrubValue(cell.value); })); }); }, null);
    return wb;
  }
  function patchWorkbookInstance(wb){
    if(!wb || !wb.xlsx || typeof wb.xlsx.writeBuffer !== 'function' || wb.__ceV731WritePatched) return wb;
    wb.__ceV731WritePatched = true;
    const oldWriteBuffer = wb.xlsx.writeBuffer.bind(wb.xlsx);
    wb.xlsx.writeBuffer = function(){ scrubWorkbook(wb); return oldWriteBuffer.apply(this, arguments); };
    return wb;
  }
  function patchExcelJS(){
    const X = window.ExcelJS;
    if(!X || !X.Workbook || X.__ceV731WorkbookPatched) return false;
    const Original = X.Workbook;
    function WorkbookPatched(){ return patchWorkbookInstance(new Original(...arguments)); }
    try{ WorkbookPatched.prototype = Original.prototype; Object.setPrototypeOf(WorkbookPatched, Original); }catch(_){ }
    X.Workbook = WorkbookPatched;
    X.__ceV731WorkbookPatched = true;
    return true;
  }
  function wrapEnsureExcelJS(){
    const fn = window.ensureExcelJS;
    if(typeof fn !== 'function' || fn.__ceV731EnsureWrapped) return;
    const wrapped = async function(){ const res = await fn.apply(this, arguments); patchExcelJS(); return res; };
    wrapped.__ceV731EnsureWrapped = true;
    window.ensureExcelJS = wrapped;
  }
  function install(){ applyVersion(); unlockGlobalImportBackupControls(); wrapEnsureExcelJS(); patchExcelJS(); }

  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready','controlevent:module-mounted','controlevent:event-loaded','controlevent:excel-before-run'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 10)));
  document.addEventListener('change', ev => { if(ev.target && (ev.target.id === 'selectedEvent' || GLOBAL_IDS.includes(ev.target.id))) setTimeout(install, 10); }, true);
  document.addEventListener('click', ev => { if(ev.target?.closest?.('#btnOpenImport,#btnExportSeed,#btnStartImport,#btnExportExcel,#ceBackupOkV181,a[download],.mobile-menu-action[data-target="btnOpenImport"],.mobile-menu-action[data-target="btnExportSeed"]')) install(); }, true);
  [0,80,300,900].forEach(ms => setTimeout(install, ms));

  window.ControlEventV731ImportBackupInfoeventoFix = {version:VERSION, versionFile:VERSION_FILE, install, patchExcelJS, scrubWorkbook};
})();
