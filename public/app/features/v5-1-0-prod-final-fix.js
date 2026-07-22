/* ControlEvent v23_prod - cierre final de versión, Excel y visores sin bucles periódicos.
   Alcance: no cambia datos, Supabase ni render general. Evita setInterval y sólo actúa por eventos reales. */
(function(){
  'use strict';

  const VERSION = 'ControlEvent v23_prod';
  const VERSION_FILE = 'ControlEvent_v23_prod';
  const INSTALLED = '__ceV510ProdFinalFix';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const MODAL_SELECTORS = [
    '#ceV401PcPhotoModal','#ceV40TicketPhotoModal','#ceV310PhotoViewer','#ceV509ReceiptModal','#ceV504ReceiptModal','#ceV502ReceiptModal','#ceV468ReceiptModal','#ceV465ReceiptModal','#ceTicketModalV234','#ceTicketImageModalV225',
    '.ce-v5017-budget-modal','.ce-v512-budget-photo-modal','.ce-v504-modal','.ce-v505-photo-modal','.ce-v506-photo-modal','.ce-v508-photo-modal','.ce-v465-modal','.ce-v468-modal','.ce-receipt-modal-v463'
  ];
  const CLOSE_SELECTORS = '[data-close],.ce-v401-pc-modal-close,.ce-v40-modal-close,.ce-v310-photo-close,.ce-v468-modal-head button,.ce-v465-modal-head button';

  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const pad = v => String(v).padStart(2, '0');
  function ymd(d){ return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`; }
  function hms(d){ return `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`; }
  function clean(v){ return String(v || 'EVENTO').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._ -]+/g,'_').trim().replace(/\s+/g,'_').replace(/_+/g,'_').slice(0,95) || 'EVENTO'; }
  function stop(ev){ try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ } return false; }

  function normalizeText(value){
    return String(value == null ? '' : value)
      .replace(/ControlEvent_v\d+(?:_\d+){1,4}(?:_prod)?/ig, VERSION_FILE)
      .replace(/ControlEvent\s+v\d+(?:\.\d+){1,4}(?:_prod)?/ig, VERSION);
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

  function currentEventTitle(){
    const sel = document.getElementById('selectedEvent');
    const raw = sel?.selectedOptions?.[0]?.textContent || sel?.options?.[sel.selectedIndex]?.textContent || '';
    return clean(raw.replace(/^\s*(FINALIZADO|EN CURSO)\s*[-–:]?\s*/i,''));
  }

  function normalizeDownloadName(name){
    let n = normalizeText(name || '');
    if(!n) return n;
    const now = new Date();
    n = n.replace(/[\\/:*?"<>|]+/g, '_').replace(/__+/g,'_');

    if(/INFOEVENTO/i.test(n)){
      const after = n.split(/INFOEVENTO[-_]/i)[1] || '';
      let base = after.replace(/\.xlsx$/i,'');
      base = base.replace(/(?:_\d{8}(?:_\d{6})?)+$/g, '');
      base = base.replace(/(?:_\d{8})+$/g, '');
      const date = (n.match(/_(\d{8})(?:_\d{6})?(?:_\d{8}(?:_\d{6})?)*\.xlsx$/i) || [])[1] || ymd(now);
      n = `${VERSION_FILE}_INFOEVENTO-${clean(base || currentEventTitle())}_${date}.xlsx`;
    }else if(/BACKUP/i.test(n) || /descarga_datos\.xlsx$/i.test(n)){
      if(/descarga_datos\.xlsx$/i.test(n)) n = `${VERSION_FILE}_BACKUP_TODOS_${ymd(now)}_${hms(now)}.xlsx`;
      else {
        const tail = (n.split(/_BACKUP_/i)[1] || `TODOS_${ymd(now)}_${hms(now)}.xlsx`).replace(/\.xlsx$/i,'');
        n = `${VERSION_FILE}_BACKUP_${tail}.xlsx`;
      }
    }
    return n.replace(/_+\.xlsx$/i,'.xlsx').replace(/__+/g,'_');
  }

  function patchAnchorDownloads(){
    const proto = window.HTMLAnchorElement && HTMLAnchorElement.prototype;
    const nativeClick = window.HTMLElement && HTMLElement.prototype && HTMLElement.prototype.click;
    if(!proto || !nativeClick || proto.__ceV510DownloadPatched) return;
    proto.__ceV510DownloadPatched = true;
    const oldSetAttribute = proto.setAttribute;
    proto.setAttribute = function(name, value){
      if(String(name || '').toLowerCase() === 'download') value = normalizeDownloadName(value);
      return oldSetAttribute.call(this, name, value);
    };
    proto.click = function(){
      try{ if(this && this.download) this.download = normalizeDownloadName(this.download); }catch(_){ }
      return nativeClick.call(this);
    };
  }

  function scrubValue(value){
    if(typeof value === 'string') return normalizeText(value);
    if(value && typeof value === 'object'){
      if(Array.isArray(value.richText)){
        return {...value, richText:value.richText.map(part => ({...part, text:normalizeText(part.text || '')}))};
      }
      if(typeof value.text === 'string') return {...value, text:normalizeText(value.text)};
      if(typeof value.result === 'string') return {...value, result:normalizeText(value.result)};
    }
    return value;
  }
  function scrubWorkbook(wb){
    if(!wb || wb.__ceV510Scrubbed) return wb;
    wb.__ceV510Scrubbed = true;
    safe(() => { wb.creator = normalizeText(wb.creator || `${VERSION} - ©oltyLAB '26`); }, null);
    safe(() => { wb.lastModifiedBy = VERSION; }, null);
    safe(() => {
      (wb.worksheets || []).forEach(ws => {
        ws.eachRow(row => row.eachCell(cell => { cell.value = scrubValue(cell.value); }));
      });
    }, null);
    return wb;
  }
  function patchWorkbookInstance(wb){
    if(!wb || wb.__ceV510WritePatched || !wb.xlsx || typeof wb.xlsx.writeBuffer !== 'function') return wb;
    wb.__ceV510WritePatched = true;
    const oldWriteBuffer = wb.xlsx.writeBuffer.bind(wb.xlsx);
    wb.xlsx.writeBuffer = function(){ scrubWorkbook(wb); return oldWriteBuffer.apply(this, arguments); };
    return wb;
  }
  function patchExcelJS(){
    const X = window.ExcelJS;
    if(!X || !X.Workbook || X.__ceV510WorkbookPatched) return false;
    const Original = X.Workbook;
    function WorkbookPatched(){
      const wb = new Original(...arguments);
      return patchWorkbookInstance(wb);
    }
    try{ WorkbookPatched.prototype = Original.prototype; Object.setPrototypeOf(WorkbookPatched, Original); }catch(_){ }
    X.Workbook = WorkbookPatched;
    X.__ceV510WorkbookPatched = true;
    return true;
  }
  function wrapEnsureExcelJS(){
    const fn = window.ensureExcelJS;
    if(typeof fn !== 'function' || fn.__ceV510EnsureWrapped) return;
    const wrapped = async function(){
      const res = await fn.apply(this, arguments);
      patchExcelJS();
      return res;
    };
    wrapped.__ceV510EnsureWrapped = true;
    window.ensureExcelJS = wrapped;
  }

  function closeModalFrom(target, ev){
    const modal = target?.closest?.(MODAL_SELECTORS.join(','));
    if(!modal) return undefined;
    const close = target.closest?.(CLOSE_SELECTORS);
    if(close || target === modal){
      stop(ev);
      safe(() => modal.remove(), null);
      return false;
    }
    return undefined;
  }
  function installCloseRescue(){
    ['pointerdown','click','touchstart'].forEach(type => document.addEventListener(type, ev => closeModalFrom(ev.target, ev), {capture:true, passive:false}));
  }
  function injectStyle(){
    if(document.getElementById('ceV510FinalStyle')) return;
    const style = document.createElement('style');
    style.id = 'ceV510FinalStyle';
    style.textContent = `
      #ceV401PcPhotoModal .ce-v401-pc-modal-close,
      #ceV40TicketPhotoModal .ce-v40-modal-close,
      #ceV310PhotoViewer .ce-v310-photo-close,
      #ceV502ReceiptModal [data-close],#ceV468ReceiptModal [data-close],#ceV465ReceiptModal [data-close],.ce-v468-modal [data-close],.ce-v465-modal [data-close]{background:#fff!important;color:#000!important;border:1px solid #111827!important;z-index:10000090!important;pointer-events:auto!important;touch-action:manipulation!important;}
      @media (max-width: 760px){.ce-v468-modal-card,.ce-v465-modal-card,.ce-v310-photo-box,.ce-v40-modal-box{position:relative!important;padding-bottom:58px!important;} .ce-v468-modal [data-close],.ce-v465-modal [data-close],#ceV310PhotoViewer .ce-v310-photo-close,#ceV40TicketPhotoModal .ce-v40-modal-close{position:sticky!important;bottom:8px!important;float:right!important;}}
    `;
    document.head.appendChild(style);
  }

  function install(){
    applyVersion();
    patchAnchorDownloads();
    wrapEnsureExcelJS();
    patchExcelJS();
    injectStyle();
    safe(() => document.querySelectorAll('a[download]').forEach(a => { a.download = normalizeDownloadName(a.download); }), null);
  }

  installCloseRescue();
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready','controlevent:module-mounted','controlevent:event-loaded','controlevent:excel-before-run'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 20)));
  document.addEventListener('click', ev => { if(ev.target?.closest?.('#btnExportExcel,#btnExportSeed,a[download]')) install(); }, true);
  document.addEventListener('change', ev => { if(ev.target?.id === 'selectedEvent') setTimeout(install, 20); }, true);
  [0,100,500,1200,3000].forEach(ms => setTimeout(install, ms));
  safe(() => {
    const header = document.querySelector('.appname,.appname-stack') || document.body;
    if(header){
      const mo = new MutationObserver(() => { clearTimeout(mo.__ceV510t); mo.__ceV510t = setTimeout(applyVersion, 40); });
      mo.observe(header, {childList:true, characterData:true, subtree:true});
    }
  }, null);

  window.ControlEventV510ProdFinalFix = {version:VERSION, versionFile:VERSION_FILE, install, normalizeDownloadName, patchExcelJS};
})();
