/* ControlEvent v8.5_prod - códigos estables EV/PE/TI/PR y carga sin regenerar identidades.
   Sin intervalos: actúa al cargar, al importar, al crear evento y antes de backup. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v8.5_prod';
  const VERSION_FILE = 'ControlEvent_v8_5_prod';
  if(window.__ceV832StableIds) return;
  window.__ceV832StableIds = true;
  const norm = v => String(v ?? '').trim();
  const appState = () => window.ControlEventApp?.state || window.state || {};
  const padCode = (prefix, n) => prefix + String(n).padStart(prefix === 'EV' ? 3 : 4, '0');
  const codeRe = prefix => new RegExp('^' + prefix + '\\d+$','i');
  const codeProps = {
    EV:['eventoCodigo','codigoEvento','eventCode','EVENTO_CODIGO'],
    PE:['personaCodigo','codigoPersona','personCode','PERSONA_CODIGO'],
    TI:['tiendaCodigo','codigoTienda','storeCode','TIENDA_CODIGO'],
    PR:['productoCodigo','codigoProducto','productCode','PRODUCTO_CODIGO']
  };
  function getMap(prefix){
    const s = appState();
    if(prefix === 'EV'){
      if(!s.eventCodeMap || typeof s.eventCodeMap !== 'object') s.eventCodeMap = {};
      return s.eventCodeMap;
    }
    if(!s.entityCodeMaps || typeof s.entityCodeMaps !== 'object') s.entityCodeMaps = {};
    const key = prefix === 'PE' ? 'personas' : prefix === 'TI' ? 'tiendas' : 'productos';
    if(!s.entityCodeMaps[key] || typeof s.entityCodeMaps[key] !== 'object') s.entityCodeMaps[key] = {};
    return s.entityCodeMaps[key];
  }
  function getCode(item, prefix, map){
    const props = codeProps[prefix] || [];
    for(const prop of props){ const c = norm(item?.[prop]); if(codeRe(prefix).test(c)) return c.toUpperCase(); }
    const fromMap = norm(map?.[norm(item?.id)]);
    if(codeRe(prefix).test(fromMap)) return fromMap.toUpperCase();
    return '';
  }
  function ensureCodesFor(listName, prefix){
    const s = appState();
    const list = Array.isArray(s[listName]) ? s[listName] : [];
    const map = getMap(prefix);
    const used = new Set();
    list.forEach(item => {
      const c = getCode(item, prefix, map);
      if(c && !used.has(c)){
        used.add(c); map[norm(item.id)] = c;
        if(prefix === 'EV') item.eventoCodigo = c;
        else if(prefix === 'PE') item.personaCodigo = c;
        else if(prefix === 'TI') item.tiendaCodigo = c;
        else if(prefix === 'PR') item.productoCodigo = c;
      }
    });
    let n = 1;
    list.forEach(item => {
      const id = norm(item?.id); if(!id || map[id]) return;
      while(used.has(padCode(prefix,n))) n++;
      const c = padCode(prefix,n++);
      used.add(c); map[id] = c;
      if(prefix === 'EV') item.eventoCodigo = c;
      else if(prefix === 'PE') item.personaCodigo = c;
      else if(prefix === 'TI') item.tiendaCodigo = c;
      else if(prefix === 'PR') item.productoCodigo = c;
    });
  }
  function ensureStableCodes(){
    const s = appState();
    if(!s || typeof s !== 'object') return false;
    ensureCodesFor('eventos','EV');
    ensureCodesFor('personas','PE');
    ensureCodesFor('tiendas','TI');
    ensureCodesFor('productos','PR');
    return true;
  }
  function applyVersion(){
    try{ document.title = VERSION; }catch(_){ }
    try{ window.__ceVersion = VERSION; window.VERSION = VERSION; window.VERSION_FILE = VERSION_FILE; window.ControlEventVersion = {version:VERSION, versionFile:VERSION_FILE}; }catch(_){ }
    try{ document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => { if(/ControlEvent\s+v/i.test(el.textContent || '') || el.matches('[data-ce-version-label]')) el.textContent = VERSION; }); }catch(_){ }
  }
  function readRows(workbook, sheetName){
    const XLSX = window.XLSX;
    if(!XLSX || !workbook) return [];
    const name = (workbook.SheetNames || []).find(n => String(n).trim().toUpperCase() === sheetName.toUpperCase());
    if(!name) return [];
    return XLSX.utils.sheet_to_json(workbook.Sheets[name], {defval:''}) || [];
  }
  function pick(row, names, fallback=''){
    for(const name of names){
      if(Object.prototype.hasOwnProperty.call(row, name)) return row[name];
      const found = Object.keys(row || {}).find(k => String(k).trim().toUpperCase() === String(name).trim().toUpperCase());
      if(found) return row[found];
    }
    return fallback;
  }
  async function readWorkbookCodeMaps(){
    const input = document.getElementById('importWorkbookFile');
    const file = input?.files?.[0];
    if(!file || !window.XLSX) return null;
    const buffer = await file.arrayBuffer();
    const wb = window.XLSX.read(buffer, {type:'array'});
    const out = {eventCodeMap:{}, entityCodeMaps:{personas:{}, tiendas:{}, productos:{}}};
    readRows(wb,'EVENTOS').forEach(row => {
      const code = norm(pick(row,['EVENTO_CODIGO','CODIGO']));
      const id = norm(pick(row,['EVENTO_ID','ID_EVENTO','EVENT_ID','ID']));
      if(id && /^EV\d+$/i.test(code)) out.eventCodeMap[id] = code.toUpperCase();
    });
    readRows(wb,'PERSONAS').forEach(row => {
      const code = norm(pick(row,['PERSONA_CODIGO','CODIGO']));
      const id = norm(pick(row,['PERSONA_ID','ID_PERSONA','PERSON_ID','ID']));
      if(id && /^PE\d+$/i.test(code)) out.entityCodeMaps.personas[id] = code.toUpperCase();
    });
    readRows(wb,'TIENDAS').forEach(row => {
      const code = norm(pick(row,['TIENDA_CODIGO','CODIGO']));
      const id = norm(pick(row,['TIENDA_ID','ID_TIENDA','STORE_ID','ID']));
      if(id && /^TI\d+$/i.test(code)) out.entityCodeMaps.tiendas[id] = code.toUpperCase();
    });
    readRows(wb,'PRODUCTOS').forEach(row => {
      const code = norm(pick(row,['PRODUCTO_CODIGO','CODIGO']));
      const id = norm(pick(row,['PRODUCTO_ID','ID_PRODUCTO','PRODUCT_ID','ID']));
      if(id && /^PR\d+$/i.test(code)) out.entityCodeMaps.productos[id] = code.toUpperCase();
    });
    return out;
  }
  function mergeCodeMaps(maps){
    if(!maps) return;
    const s = appState();
    if(!s.eventCodeMap || typeof s.eventCodeMap !== 'object') s.eventCodeMap = {};
    Object.assign(s.eventCodeMap, maps.eventCodeMap || {});
    if(!s.entityCodeMaps || typeof s.entityCodeMaps !== 'object') s.entityCodeMaps = {};
    ['personas','tiendas','productos'].forEach(k => {
      if(!s.entityCodeMaps[k] || typeof s.entityCodeMaps[k] !== 'object') s.entityCodeMaps[k] = {};
      Object.assign(s.entityCodeMaps[k], maps.entityCodeMaps?.[k] || {});
    });
    ensureStableCodes();
  }
  function wrapImport(){
    const old = window.importInitialWorkbook || (typeof importInitialWorkbook === 'function' ? importInitialWorkbook : null);
    if(!old || old.__ceV832StableIds) return;
    const wrapped = async function(){
      let maps = null;
      try{
        if(typeof window.ensureSheetJS === 'function') await window.ensureSheetJS();
        else if(typeof ensureSheetJS === 'function') await ensureSheetJS();
        maps = await readWorkbookCodeMaps();
      }catch(err){ console.warn('[ControlEvent v8.5_prod] No se pudieron leer códigos estables del Excel antes de importar.', err); }
      const ret = await old.apply(this, arguments);
      try{ mergeCodeMaps(maps); applyVersion(); }catch(err){ console.warn('[ControlEvent v8.5_prod] No se pudieron aplicar códigos estables tras importar.', err); }
      return ret;
    };
    wrapped.__ceV832StableIds = true;
    try{ window.importInitialWorkbook = wrapped; importInitialWorkbook = wrapped; }catch(_){ window.importInitialWorkbook = wrapped; }
  }
  function wrapAddEvento(){
    const old = window.addEvento || (typeof addEvento === 'function' ? addEvento : null);
    if(!old || old.__ceV832StableIds) return;
    const wrapped = function(){
      const before = new Set((appState().eventos || []).map(e => String(e.id)));
      const ret = old.apply(this, arguments);
      try{
        ensureStableCodes();
        const s = appState();
        (s.eventos || []).forEach(e => { if(!before.has(String(e.id)) && !e.eventoCodigo){ ensureStableCodes(); } });
      }catch(_){ }
      return ret;
    };
    wrapped.__ceV832StableIds = true;
    try{ window.addEvento = wrapped; addEvento = wrapped; }catch(_){ window.addEvento = wrapped; }
  }
  function install(){ applyVersion(); ensureStableCodes(); wrapImport(); wrapAddEvento(); }
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready','controlevent:excel-before-run'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 20)));
  document.addEventListener('click', ev => { if(ev.target?.closest?.('#btnExportSeed,#btnStartImport,#btnAddEvento,#btnExportExcel')) setTimeout(install, 0); }, true);
  document.addEventListener('change', ev => { if(ev.target?.id === 'importWorkbookFile') setTimeout(install, 0); }, true);
  [0,150,700].forEach(ms => setTimeout(install, ms));
  window.ControlEventV832StableIds = {ensureStableCodes, mergeCodeMaps, version:VERSION, versionFile:VERSION_FILE};
})();
