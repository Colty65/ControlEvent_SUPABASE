/* ControlEvent v2.2_prod - nombres INFOEVENTO/BACKUP y carga BACKUP limpia.
   Base: v50.27/v2.1_prod estable. No toca fotos ni flujo Salir/Login. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v2.2_prod';
  const VERSION_FILE = 'ControlEvent_v2_2_prod';
  const CACHE_SUFFIX = 'v2-2-prod';
  const $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2,'0');
  const stamp = (d=new Date()) => ({
    ymd: `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`,
    hms: `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  });
  function cleanFilePart(value){
    return String(value || 'SIN_TITULO')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[\\/:*?"<>|]+/g,' ')
      .replace(/\s+/g,'_')
      .replace(/_+/g,'_')
      .replace(/^_+|_+$/g,'')
      .slice(0,90) || 'SIN_TITULO';
  }
  function selectedEventTitle(){
    try{
      const ev = typeof selectedEvent === 'function' ? selectedEvent() : null;
      if(ev && ev.titulo) return ev.titulo;
    }catch(_){ }
    try{
      const st = typeof state !== 'undefined' ? state : (window.state || {});
      const id = String(st.selectedEventId || '');
      const ev = (Array.isArray(st.eventos) ? st.eventos : []).find(e => String(e.id) === id);
      if(ev && ev.titulo) return ev.titulo;
    }catch(_){ }
    return 'EVENTO';
  }
  function setVersionVisible(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version]').forEach(el => {
      const txt = String(el.textContent || '');
      if(/ControlEvent\s+v/i.test(txt) || el.matches?.('[data-ce-version]')) el.textContent = VERSION;
    });
    try{ window.ControlEventVersion = {version: VERSION, versionFile: VERSION_FILE}; }catch(_){ }
  }
  function normalizeDownloadName(name){
    let n = String(name || '');
    if(!n) return n;
    const now = stamp();
    n = n.replace(/ControlEvent_v2_1_prod/g, VERSION_FILE)
         .replace(/ControlEvent_v50_27/g, VERSION_FILE)
         .replace(/ControlEvent_v50_24/g, VERSION_FILE);
    if(/INFOEVENTO/i.test(n)){
      const m = n.match(/INFOEVENTO[-_]?(.+?)_(\d{8})(?:\.xlsx)?$/i);
      const title = cleanFilePart(m ? m[1] : selectedEventTitle());
      const ymd = m ? m[2] : now.ymd;
      return `${VERSION_FILE}_INFOEVENTO-${title}_${ymd}.xlsx`;
    }
    if(/_BACKUP_/i.test(n) || /descarga_datos/i.test(n)){
      let label = 'TODOS';
      let ymd = now.ymd;
      let hms = now.hms;
      const m = n.match(/_BACKUP_(.+?)_(\d{8})[-_](\d{2})[:_]?(\d{2})[:_]?(\d{2})\.xlsx$/i);
      if(m){ label = cleanFilePart(m[1] || 'TODOS'); ymd = m[2]; hms = `${m[3]}${m[4]}${m[5]}`; }
      else if(!/TODOS|descarga_datos/i.test(n)) label = cleanFilePart(selectedEventTitle());
      return `${VERSION_FILE}_BACKUP_${label}_${ymd}_${hms}.xlsx`;
    }
    return n;
  }
  function patchAnchorDownloads(){
    try{
      const proto = HTMLAnchorElement.prototype;
      if(proto.click && !proto.click.__ce_v22_download_names){
        const oldClick = proto.click;
        const wrapped = function(){
          try{ if(this.download) this.download = normalizeDownloadName(this.download); }catch(_){ }
          return oldClick.apply(this, arguments);
        };
        wrapped.__ce_v22_download_names = true;
        proto.click = wrapped;
      }
    }catch(_){ }
  }
  function patchInfoFilename(){
    try{
      window.makeInfoEventoFilename = function(title){
        const s = stamp();
        return `${VERSION_FILE}_INFOEVENTO-${cleanFilePart(title || selectedEventTitle())}_${s.ymd}.xlsx`;
      };
    }catch(_){ }
  }
  function importStatus(msg,type){
    try{
      if(typeof setImportStatus === 'function') return setImportStatus(msg,type||'');
    }catch(_){ }
    const box = $('importStatus');
    if(box){ box.textContent = msg; box.className = 'import-status' + (type ? ' ' + type : ''); box.classList.remove('hidden'); }
  }
  function stateRef(){ try{ return typeof state !== 'undefined' ? state : (window.state || {}); }catch(_){ return window.state || {}; } }
  function arr(x){ return Array.isArray(x) ? x : []; }
  function cloneForServer(){
    const src = stateRef() || {};
    const out = {
      eventos: arr(src.eventos).map(x => ({...x})),
      personas: arr(src.personas).map(x => ({...x})),
      tiendas: arr(src.tiendas).map(x => ({...x})),
      productos: arr(src.productos).map(x => ({...x})),
      colaboradores: arr(src.colaboradores).map(x => ({...x})),
      compras: arr(src.compras).map(x => ({...x})),
      ticketImages: {...(src.ticketImages || {})},
      ticketImageRefs: {...(src.ticketImageRefs || {})},
      selectedEventId: src.selectedEventId || '',
      comprasSort: src.comprasSort,
      summaryTiendaSort: src.summaryTiendaSort,
      __forceReplaceAll: true,
      __allowEmptyReplace: true,
      __allowEmptyCollections: ['eventos','personas','tiendas','productos','colaboradores','compras']
    };
    return out;
  }
  async function persistImportedState(){
    const res = await fetch('/api/state', {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(cloneForServer())
    });
    if(!res.ok) throw new Error((await res.text().catch(()=>'')) || `HTTP ${res.status}`);
    return res.json().catch(()=>({ok:true}));
  }
  function countsText(){
    const s = stateRef();
    return `EVENTOS: ${arr(s.eventos).length}\nPERSONAS: ${arr(s.personas).length}\nTIENDAS: ${arr(s.tiendas).length}\nPRODUCTOS: ${arr(s.productos).length}\nINGRESOS: ${arr(s.colaboradores).length}\nCOMPRAS/DONACIONES: ${arr(s.compras).length}`;
  }
  async function wait(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }
  function statusIsBad(){
    const box = $('importStatus');
    const txt = String(box?.textContent || '');
    return !!(box?.classList?.contains('bad') || /Error en la importaci[oó]n|Faltan hojas|Selecciona primero/i.test(txt));
  }
  function patchBackupImport(){
    const old = window.importInitialWorkbook || (typeof importInitialWorkbook === 'function' ? importInitialWorkbook : null);
    if(typeof old !== 'function' || old.__ce_v22_import_clean) return;
    const wrapped = async function(){
      const btn = $('btnStartImport');
      try{
        if(btn){ btn.disabled = true; btn.dataset.ceOldText = btn.textContent || ''; btn.textContent = 'Importando...'; }
        importStatus('Cargando backup. Espera a que termine...', '');
        await old.apply(this, arguments);
        await wait(1000);
        if(statusIsBad()) return false;
        importStatus('Guardando backup en base de datos...', '');
        await persistImportedState();
        try{ if(typeof saveState === 'function') saveState(); }catch(_){ }
        try{ if(typeof render === 'function') render(); }catch(_){ }
        setVersionVisible();
        importStatus('Carga de backup finalizada correctamente.\n' + countsText(), 'ok');
        return false;
      }catch(error){
        console.error('[v2.2_prod] carga backup', error);
        importStatus('Error en la carga de backup: ' + (error?.message || error), 'bad');
        return false;
      }finally{
        if(btn){ btn.disabled = false; btn.textContent = btn.dataset.ceOldText || 'Importar datos'; delete btn.dataset.ceOldText; }
      }
    };
    wrapped.__ce_v22_import_clean = true;
    try{ window.importInitialWorkbook = wrapped; }catch(_){ }
    try{ importInitialWorkbook = wrapped; }catch(_){ }
  }
  function patchImportButton(){
    if(document.__ce_v22_import_click) return;
    document.__ce_v22_import_click = true;
    document.addEventListener('click', function(ev){
      const btn = ev.target && ev.target.closest && ev.target.closest('#btnStartImport');
      if(!btn) return;
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      try{ (window.importInitialWorkbook || importInitialWorkbook)(); }catch(error){ console.error(error); importStatus('Error iniciando carga: ' + (error?.message || error), 'bad'); }
      return false;
    }, true);
  }
  function install(){
    setVersionVisible();
    patchAnchorDownloads();
    patchInfoFilename();
    patchBackupImport();
    patchImportButton();
  }
  install();
  ['DOMContentLoaded','load'].forEach(evt => window.addEventListener(evt, () => setTimeout(install,80), false));
  setTimeout(install,500);
  window.ControlEventV22Prod = {version: VERSION, versionFile: VERSION_FILE, normalizeDownloadName, install};
})();
