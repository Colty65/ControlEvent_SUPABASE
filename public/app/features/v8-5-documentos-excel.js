/* ControlEvent v10.0_prod - DOCUMENTOS en BACKUP/INFOEVENTO y restauracion desde BACKUP.
   Parche aislado: no cambia la mecanica de mantenimiento DOCXX; solo extiende Excel. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v10.0_prod';
  const INSTALLED = '__ceV85DocumentosExcel';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const norm = value => String(value ?? '').trim();
  const upper = value => norm(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const docToken = value => {
    const match = upper(value).match(/\bDOC\s*(\d+)\b/);
    return match ? 'DOC' + String(Number(match[1])).padStart(2, '0') : '';
  };
  const appState = () => window.ControlEventApp?.state || window.ControlEventRuntime?.app?.state || window.state || window.__CONTROL_EVENT_STATE__ || {};
  const selectedEventId = () => norm(appState().selectedEventId || document.getElementById('selectedEvent')?.value || '');
  const currentEvent = () => (Array.isArray(appState().eventos) ? appState().eventos : []).find(e => norm(e?.id) === selectedEventId()) || null;

  function imageText(value){
    if(!value) return '';
    if(typeof value === 'string') return norm(value);
    if(typeof value === 'object') return norm(value.url || value.public_url || value.publicUrl || value.pathname || value.path || value.storage_path || value.dataUrl || value.base64 || value.src || '');
    return norm(value);
  }
  function imageExtension(dataUrl){
    const m = String(dataUrl || '').match(/^data:image\/(png|jpe?g|webp);/i);
    const ext = m ? m[1].toLowerCase().replace('jpg','jpeg') : 'jpeg';
    return ext === 'webp' ? 'png' : ext;
  }
  async function toDataUrl(source){
    const src = imageText(source);
    if(!src) return '';
    if(/^data:image\//i.test(src)) return src;
    if(!/^(https?:\/\/|\/|\.\/|\.\.\/)/i.test(src)) return '';
    try{
      const res = await fetch(src, {cache:'no-store'});
      if(!res.ok) return '';
      const blob = await res.blob();
      if(!/^image\//i.test(blob.type || '') || blob.size > 5 * 1024 * 1024) return '';
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('No se pudo leer imagen de documento'));
        reader.readAsDataURL(blob);
      });
    }catch(_){ return ''; }
  }
  function docsForSelectedEvent(){
    const s = appState();
    const eventId = selectedEventId();
    if(!eventId) return [];
    const byCode = new Map();
    (Array.isArray(s.eventDocuments) ? s.eventDocuments : []).forEach(doc => {
      if(norm(doc?.eventId) !== eventId) return;
      const code = docToken(doc?.codigo || doc?.imageKey || doc?.id);
      if(!code) return;
      const key = `${eventId}|${code}`;
      byCode.set(code, {
        eventId,
        code,
        id: doc?.id || key,
        fecha: norm(doc?.fecha),
        descripcion: norm(doc?.descripcion),
        imageKey: code,
        image: imageText((s.ticketImages || {})[key] || (s.ticketImageRefs || {})[key] || doc?.imageUrl || '')
      });
    });
    Object.entries(s.ticketImages || {}).forEach(([key, value]) => {
      const parts = norm(key).split('|');
      if(parts[0] !== eventId) return;
      const code = docToken(parts.slice(1).join('|'));
      if(!code || byCode.has(code)) return;
      byCode.set(code, {eventId, code, id:key, fecha:'', descripcion:'', imageKey:code, image:imageText(value)});
    });
    return Array.from(byCode.values()).sort((a,b) => a.code.localeCompare(b.code, 'es', {numeric:true}));
  }

  async function addDocumentosWorksheet(wb){
    if(!wb || wb.__ceV85DocsInfoAdded) return;
    wb.__ceV85DocsInfoAdded = true;
    const ev = currentEvent();
    const docs = docsForSelectedEvent();
    if(!ev || !docs.length) return;
    const existing = (wb.worksheets || []).find(ws => upper(ws?.name) === 'DOCUMENTOS DEL EVENTO');
    if(existing) return;
    const ws = wb.addWorksheet('DOCUMENTOS DEL EVENTO');
    ws.properties.defaultRowHeight = 21;
    ws.columns = [
      {width:14}, {width:14}, {width:56}, {width:34}, {width:24}
    ];
    const border = {top:{style:'thin', color:{argb:'FFDDE2EA'}},left:{style:'thin', color:{argb:'FFDDE2EA'}},bottom:{style:'thin', color:{argb:'FFDDE2EA'}},right:{style:'thin', color:{argb:'FFDDE2EA'}}};
    const paint = (cell, fill='FFFFFFFF', bold=false, color='FF111827') => {
      cell.font = {bold, color:{argb:color}};
      cell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:fill}};
      cell.border = border;
      cell.alignment = {vertical:'middle', horizontal:'left', wrapText:true};
    };
    ws.mergeCells(1,1,1,5);
    ws.getCell(1,1).value = 'DOCUMENTOS DEL EVENTO';
    paint(ws.getCell(1,1), 'FF111827', true, 'FFFFFFFF');
    ws.getRow(1).height = 30;
    ws.mergeCells(2,1,2,5);
    ws.getCell(2,1).value = ev.titulo || ev.id || '';
    paint(ws.getCell(2,1), 'FFF8FAFC', true);
    ['Código','Fecha','Descripción','Foto/URL','Imagen'].forEach((h, idx) => {
      const c = ws.getCell(4, idx + 1);
      c.value = h;
      paint(c, 'FF111827', true, 'FFFFFFFF');
      c.alignment = {vertical:'middle', horizontal:'center', wrapText:true};
    });
    ws.views = [{state:'frozen', ySplit:4}];
    let row = 5;
    for(const doc of docs.slice(0, 80)){
      const url = imageText(doc.image);
      ws.getCell(row,1).value = doc.code;
      ws.getCell(row,2).value = doc.fecha || '';
      ws.getCell(row,3).value = doc.descripcion || '';
      ws.getCell(row,4).value = url;
      ws.getCell(row,5).value = url ? 'Imagen adjunta' : '';
      [1,2,3,4,5].forEach(col => paint(ws.getCell(row,col), col === 3 ? 'FFFFFFFF' : 'FFF8FAFC', false));
      ws.getRow(row).height = url ? 76 : 28;
      const data = row < 35 ? await toDataUrl(url) : '';
      if(data){
        try{
          const imageId = wb.addImage({base64:data, extension:imageExtension(data)});
          ws.addImage(imageId, {tl:{col:4.08,row:row-0.86}, ext:{width:132,height:82}});
          ws.getCell(row,5).value = '';
        }catch(_){ }
      }
      row++;
    }
    try{ ws.autoFilter = {from:'A4', to:'E4'}; }catch(_){ }
    try{
      ws.eachRow(r => r.eachCell(cell => { cell.protection = {...(cell.protection || {}), locked:true}; }));
      await ws.protect('open_excel_arrastre', {selectLockedCells:true, selectUnlockedCells:true, formatCells:false, formatColumns:false, formatRows:false, insertColumns:false, insertRows:false, deleteColumns:false, deleteRows:false, autoFilter:false});
    }catch(_){ }
  }

  async function ensureExcelJSReady(){
    if(window.ExcelJS?.Workbook) return window.ExcelJS;
    if(window.ControlEventExcel?.ensureExcelJS){
      await window.ControlEventExcel.ensureExcelJS();
      if(window.ExcelJS?.Workbook) return window.ExcelJS;
    }
    if(typeof window.ensureExcelJS === 'function'){
      await window.ensureExcelJS();
      if(window.ExcelJS?.Workbook) return window.ExcelJS;
    }
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = './vendor/exceljs.min.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('No se pudo cargar ExcelJS para DOCUMENTOS.'));
      document.head.appendChild(script);
    });
    if(!window.ExcelJS?.Workbook) throw new Error('ExcelJS no quedó disponible para DOCUMENTOS.');
    return window.ExcelJS;
  }
  function hookWorkbook(ExcelJS){
    if(!ExcelJS?.Workbook) return () => {};
    if(ExcelJS.Workbook.__ceV85DocsCtor) return () => {};
    const Original = ExcelJS.Workbook;
    function WrappedWorkbook(){
      const wb = new Original(...arguments);
      try{
        const xlsx = wb.xlsx;
        const oldWrite = xlsx?.writeBuffer;
        if(typeof oldWrite === 'function' && !oldWrite.__ceV85DocsWrapped){
          const wrappedWrite = async function(){
            if(window.__ceV85InfoEventoDocsActive) await addDocumentosWorksheet(wb);
            return oldWrite.apply(this, arguments);
          };
          wrappedWrite.__ceV85DocsWrapped = true;
          xlsx.writeBuffer = wrappedWrite;
        }
      }catch(_){ }
      return wb;
    }
    try{ Object.setPrototypeOf(WrappedWorkbook, Original); }catch(_){ }
    WrappedWorkbook.prototype = Original.prototype;
    WrappedWorkbook.__ceV85DocsCtor = true;
    ExcelJS.Workbook = WrappedWorkbook;
    return () => { try{ if(ExcelJS.Workbook === WrappedWorkbook) ExcelJS.Workbook = Original; }catch(_){ } };
  }
  async function withInfoDocuments(fn, thisArg, args){
    const ExcelJS = await ensureExcelJSReady();
    const restore = hookWorkbook(ExcelJS);
    window.__ceV85InfoEventoDocsActive = true;
    try{ return await fn.apply(thisArg || window, args || []); }
    finally{ window.__ceV85InfoEventoDocsActive = false; restore(); }
  }
  function wrapInfoEvento(){
    const bridge = window.__ceV257;
    if(bridge && typeof bridge.exportExcel === 'function' && !bridge.exportExcel.__ceV85DocsInfoWrapped){
      const prev = bridge.exportExcel;
      const wrapped = function(){ return withInfoDocuments(prev, this, Array.from(arguments)); };
      wrapped.__ceV85DocsInfoWrapped = true;
      bridge.exportExcel = wrapped;
    }
    const direct = window.exportExcel;
    if(typeof direct === 'function' && direct.__ceExcelFacade !== true && !direct.__ceV85DocsInfoWrapped){
      const prev = direct;
      const wrapped = function(){ return withInfoDocuments(prev, this, Array.from(arguments)); };
      wrapped.__ceV85DocsInfoWrapped = true;
      try{ window.exportExcel = wrapped; exportExcel = wrapped; }catch(_){ window.exportExcel = wrapped; }
    }
  }

  async function ensureSheetJSReady(){
    if(window.XLSX) return window.XLSX;
    if(typeof window.ensureSheetJS === 'function'){
      await window.ensureSheetJS();
      if(window.XLSX) return window.XLSX;
    }
    try{ if(typeof ensureSheetJS === 'function'){ await ensureSheetJS(); if(window.XLSX) return window.XLSX; } }catch(_){ }
    return null;
  }
  function pick(row, names, fallback=''){
    for(const name of names){
      if(Object.prototype.hasOwnProperty.call(row || {}, name)) return row[name];
      const found = Object.keys(row || {}).find(k => upper(k) === upper(name));
      if(found) return row[found];
    }
    return fallback;
  }
  function sheetRows(workbook, name){
    const XLSX = window.XLSX;
    if(!XLSX || !workbook) return [];
    const sheetName = (workbook.SheetNames || []).find(n => upper(n) === upper(name));
    return sheetName ? (XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {defval:''}) || []) : [];
  }
  async function readImportContext(){
    const input = document.getElementById('importWorkbookFile');
    const file = input?.files?.[0];
    const XLSX = await ensureSheetJSReady();
    if(!file || !XLSX) return null;
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, {type:'array'});
    const documentos = sheetRows(wb, 'DOCUMENTOS');
    if(!documentos.length) return null;
    return {documentos, eventos: sheetRows(wb, 'EVENTOS')};
  }
  function resolveImportedEventId(token, eventRows){
    const s = appState();
    const events = Array.isArray(s.eventos) ? s.eventos : [];
    const direct = events.find(e => norm(e?.id) === token);
    if(direct) return norm(direct.id);
    const wbEvent = (eventRows || []).find(row => [
      pick(row, ['EVENTO_ID','EVENTO_CODIGO','CODIGO','ID'])
    ].map(norm).includes(token));
    if(wbEvent){
      const title = norm(pick(wbEvent, ['EVENTO_TITULO','TITULO']));
      const ini = norm(pick(wbEvent, ['EVENTO_FECHAINI','FECHAINI','FECHA_INI']));
      const fin = norm(pick(wbEvent, ['EVENTO_FECHAFIN','FECHAFIN','FECHA_FIN']));
      const byMeta = events.find(e => norm(e?.titulo) === title && (!ini || norm(e?.fechaIni) === ini) && (!fin || norm(e?.fechaFin) === fin));
      if(byMeta) return norm(byMeta.id);
      const byTitle = events.find(e => norm(e?.titulo) === title);
      if(byTitle) return norm(byTitle.id);
    }
    return '';
  }
  function importDocumentosIntoState(ctx){
    if(!ctx?.documentos?.length) return 0;
    const s = appState();
    if(!Array.isArray(s.eventDocuments)) s.eventDocuments = [];
    if(!s.ticketImages || typeof s.ticketImages !== 'object') s.ticketImages = {};
    const existing = new Map(s.eventDocuments.map(doc => [norm(doc?.id), doc]).filter(([id]) => id));
    let count = 0;
    ctx.documentos.forEach(row => {
      const eventToken = norm(pick(row, ['EVENTO_CODIGO','EVENTO_ID','EVENTO']));
      const eventId = resolveImportedEventId(eventToken, ctx.eventos);
      const code = docToken(pick(row, ['DOC_CODIGO','CLAVE_IMAGEN','CLAVE_RESUMEN','DOC_ID','CODIGO']));
      if(!eventId || !code) return;
      const id = `${eventId}|${code}`;
      const image = imageText(pick(row, ['FOTO_URL','IMAGEN_BASE64','IMAGEN','URL'], ''));
      const doc = existing.get(id) || {id, eventId, codigo:code, imageKey:code, createdAt:new Date().toISOString()};
      doc.eventId = eventId;
      doc.codigo = code;
      doc.imageKey = code;
      doc.fecha = norm(pick(row, ['FECHA','DOC_FECHA'], doc.fecha || ''));
      doc.descripcion = norm(pick(row, ['DESCRIPCION','DOC_DESCRIPCION','TEXTO'], doc.descripcion || ''));
      doc.imageUrl = image || doc.imageUrl || '';
      doc.updatedAt = new Date().toISOString();
      if(!existing.has(id)){ s.eventDocuments.push(doc); existing.set(id, doc); }
      if(image && !s.ticketImages[id]) s.ticketImages[id] = image;
      count++;
    });
    if(count){
      try{ if(typeof saveState === 'function') saveState(); else if(window.saveState) window.saveState(); }catch(_){ }
      try{ if(typeof render === 'function') render(); else if(window.render) window.render(); }catch(_){ }
      try{ window.ControlEventDocumentsV85?.render?.(); }catch(_){ }
    }
    return count;
  }
  function wrapImport(){
    const old = window.importInitialWorkbook || (typeof importInitialWorkbook === 'function' ? importInitialWorkbook : null);
    if(!old || old.__ceV85DocsImportWrapped) return;
    const wrapped = async function(){
      let ctx = null;
      try{ ctx = await readImportContext(); }catch(err){ console.warn('[ControlEvent/v8.5] No se pudo leer hoja DOCUMENTOS antes de importar.', err); }
      const ret = await old.apply(this, arguments);
      try{ importDocumentosIntoState(ctx); }catch(err){ console.warn('[ControlEvent/v8.5] No se pudo restaurar DOCUMENTOS del BACKUP.', err); }
      return ret;
    };
    wrapped.__ceV85DocsImportWrapped = true;
    try{ window.importInitialWorkbook = wrapped; importInitialWorkbook = wrapped; }catch(_){ window.importInitialWorkbook = wrapped; }
  }
  function install(){
    wrapInfoEvento();
    wrapImport();
    try{ window.__ceVersion = VERSION; window.VERSION = VERSION; }catch(_){ }
  }
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready','controlevent:excel-before-run'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 40), true));
  document.addEventListener('click', ev => {
    if(ev.target?.closest?.('#btnExportExcel,#btnStartImport,.mobile-menu-action[data-target="btnExportExcel"]')) setTimeout(install, 0);
  }, true);
  document.addEventListener('change', ev => { if(ev.target?.id === 'importWorkbookFile') setTimeout(install, 0); }, true);
  [0,180,800,1800].forEach(ms => setTimeout(install, ms));
  window.ControlEventDocumentosExcelV85 = {version:VERSION, install, docsForSelectedEvent, addDocumentosWorksheet, importDocumentosIntoState};
})();
