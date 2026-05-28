/* ControlEvent v50.17 - ajustes visuales PRODUCTOS, eventos finalizados y navegación compacta.
   - PRODUCTOS usa una mecánica propia y temprana de Modificar para no saltar al inicio.
   - La fila modificada queda en negrita como en el resto de mantenimientos.
   - Los justificantes de ingresos se sincronizan con /api/ticket-images con criterio servidor-no-destructivo.
*/
(function(){
  'use strict';
  const VERSION = 'ControlEvent v50.17';
  const VERSION_FILE = 'ControlEvent_v50_17';
  const INSTALLED = '__ceV501FinalFixes';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const same = (a,b) => String(a ?? '') === String(b ?? '');
  const cssEsc = v => { try{ return window.CSS?.escape ? CSS.escape(String(v ?? '')) : String(v ?? '').replace(/[^a-zA-Z0-9_-]/g, '\\$&'); }catch(_){ return String(v ?? '').replace(/"/g,'\\"'); } };

  function st(){
    try{ if(typeof state !== 'undefined') return state || {}; }catch(_){ }
    try{ if(window.state) return window.state; }catch(_){ }
    try{ if(window.ControlEventApp?.state) return window.ControlEventApp.state; }catch(_){ }
    return {};
  }
  const arr = k => Array.isArray(st()[k]) ? st()[k] : [];
  function role(){ try{ if(typeof authUser !== 'undefined' && authUser) return up(authUser.nivel); }catch(_){ } return up(window.authUser?.nivel || window.ControlEventApp?.authUser?.nivel || ''); }
  const canWrite = () => role() === 'GD' || role() === 'RW';
  function parseEuro(value){
    if(typeof value === 'number') return Number.isFinite(value) ? value : 0;
    let s = String(value ?? '').trim().replace(/\s/g,'').replace(/€/g,'');
    if(!s) return 0;
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',', '.');
    else if(s.includes(',')) s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  function byId(list,id){ return arr(list).find(x => same(x?.id, id)) || null; }
  function getVal(action,id){ const el = document.querySelector(`[data-action="${cssEsc(action)}"][data-id="${cssEsc(id)}"]`); return el ? el.value : ''; }
  function stop(ev){ try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ } return false; }
  function saveNow(){ try{ if(typeof saveState === 'function') return saveState(); }catch(_){ } try{ return window.saveState?.(); }catch(_){ } }
  function renderNow(){ try{ if(typeof render === 'function') return render(); }catch(_){ } try{ return window.render?.(); }catch(_){ } }
  function applyVersion(){
    try{ document.title = VERSION; document.body.dataset.ceVersion = VERSION; window.__ceVersion = VERSION; window.ControlEventVersion = {version:VERSION, versionFile:VERSION_FILE}; }catch(_){ }
    try{ document.querySelectorAll('.appname span,.appname-stack span').forEach(el => { if(/ControlEvent\s+v\d+(?:\.\d+){1,2}/i.test(el.textContent || '')) el.textContent = VERSION; }); }catch(_){ }
  }

  function scrollableElements(){
    const out = [];
    ['mainTabs','collabList','comprasList','donacionesList','personasList','eventosList','tiendasList','productosList','accesoList','maintenanceWrapper','mtProductos'].forEach(id => { const el=$(id); if(el) out.push(el); });
    try{
      document.querySelectorAll('.card,.table-wrap,.modal,.panel,.main,.app,[data-scroll-root]').forEach(el => {
        if(out.includes(el)) return;
        if((el.scrollHeight > el.clientHeight + 4) || (el.scrollWidth > el.clientWidth + 4)) out.push(el);
      });
    }catch(_){ }
    return out;
  }
  function captureScroll(btn){
    const data = {x:window.scrollX || 0, y:window.scrollY || 0, docTop:document.scrollingElement?.scrollTop || 0, els:[], activeId:btn?.dataset?.id || ''};
    scrollableElements().forEach((el, idx) => {
      try{ data.els.push({id:el.id || '', idx, ref:el, left:el.scrollLeft || 0, top:el.scrollTop || 0}); }catch(_){ }
    });
    const list = $('productosList');
    const card = btn?.closest?.('.itemcard,.rowline,.card,tr,li') || null;
    if(list && card){
      try{ data.productOffset = card.getBoundingClientRect().top - list.getBoundingClientRect().top; data.listTop = list.scrollTop || 0; }catch(_){ }
    }
    return data;
  }
  function restoreScroll(data){
    if(!data) return;
    const run = () => {
      try{ window.scrollTo(data.x || 0, data.y || 0); }catch(_){ }
      try{ if(document.scrollingElement) document.scrollingElement.scrollTop = data.docTop || data.y || 0; }catch(_){ }
      (data.els || []).forEach(item => {
        let el = item.ref;
        if(item.id) el = $(item.id) || el;
        if(el){ try{ el.scrollLeft = item.left || 0; el.scrollTop = item.top || 0; }catch(_){ } }
      });
    };
    run();
  }
  function restoreScrollLong(data){ [0,20,60,120,240,420,700,1100,1700,2600,4200].forEach(ms => setTimeout(() => restoreScroll(data), ms)); }

  const modifiedProducts = new Set();
  try{ JSON.parse(localStorage.getItem('ControlEvent_productos_modificados_v500') || '[]').forEach(id => modifiedProducts.add(String(id))); }catch(_){ }
  function storeModifiedProducts(){ try{ localStorage.setItem('ControlEvent_productos_modificados_v500', JSON.stringify(Array.from(modifiedProducts))); }catch(_){ } }
  function productCard(id){
    const safe = cssEsc(id);
    const root = $('productosList') || document;
    let best = null;
    try{
      const btn = root.querySelector(`button[data-action="save-producto"][data-id="${safe}"]`);
      if(btn) best = btn.closest('.itemcard') || btn.closest('.rowline') || btn.parentElement || btn;
    }catch(_){ }
    if(best) return best;
    try{
      const nodes = Array.from(root.querySelectorAll(`[data-id="${safe}"]`));
      for(const node of nodes){
        const card = node.closest('.itemcard') || node.closest('.rowline') || node.closest('.card');
        if(card && card.querySelector('button[data-action="save-producto"]')) return card;
      }
      for(const node of nodes){
        const card = node.closest('.itemcard') || node.closest('.rowline') || node.closest('.card');
        if(card) return card;
      }
    }catch(_){ }
    return null;
  }
  function markBold(el){
    if(!el) return;
    try{ el.classList.add('ce-v500-product-modified','ce-v501-product-modified','ce-v46-modified','ce-v464-modified'); }catch(_){ }
    try{ el.style.setProperty('font-weight','900','important'); }catch(_){ }
    try{ el.querySelectorAll('input,select,textarea,button,label,span,strong,td,th,div').forEach(child => child.style.setProperty('font-weight','900','important')); }catch(_){ }
  }
  function collectModifiedProductIds(){
    const ids = new Set(Array.from(modifiedProducts));
    try{ JSON.parse(localStorage.getItem('ControlEvent_productos_modificados_v500') || '[]').forEach(id => ids.add(String(id))); }catch(_){ }
    try{ JSON.parse(localStorage.getItem('ControlEvent_productos_modificados_v501') || '[]').forEach(id => ids.add(String(id))); }catch(_){ }
    try{ arr('productos').forEach(p => { if(p && (p.__ceModified || p._ceModified || p.modificado || p.modified)) ids.add(String(p.id)); }); }catch(_){ }
    return ids;
  }
  function applyProductBold(){ collectModifiedProductIds().forEach(id => markBold(productCard(id))); }
  function rememberProduct(id){
    if(!id) return;
    modifiedProducts.add(String(id)); storeModifiedProducts();
    try{ localStorage.setItem('ControlEvent_productos_modificados_v501', JSON.stringify(Array.from(collectModifiedProductIds()))); }catch(_){ }
    [0,10,30,80,160,320,700,1300,2500,5000,8000].forEach(ms => setTimeout(applyProductBold, ms));
  }

  function saveProducto(btn, ev){
    if(!btn || btn.dataset.action !== 'save-producto') return;
    stop(ev);
    if(!canWrite()){ alert('No autorizado para modificar.'); return false; }
    const id = btn.dataset.id || '';
    const p = byId('productos', id);
    if(!p){ alert('No se encuentra el producto.'); return false; }
    const nombre = norm(getVal('edit-producto-nombre', id));
    if(!nombre){ alert('El nombre no puede estar vacío.'); return false; }
    const scroll = captureScroll(btn);
    p.nombre = nombre;
    try{ p.__ceModified = true; p._ceModified = true; p.modified = true; }catch(_){}
    const segmento = getVal('edit-producto-segmento', id); if(segmento !== '') p.segmento = segmento;
    const destino = getVal('edit-producto-destino', id); if(destino !== '') p.destino = destino;
    const priceVal = getVal('edit-producto-precio', id);
    if(priceVal !== ''){ const price = parseEuro(priceVal); p.precio = price; p.defaultPrecio = price; }
    const tiendaVal = getVal('edit-producto-tienda', id);
    if(tiendaVal !== ''){ p.tiendaId = tiendaVal || ''; p.defaultTiendaId = tiendaVal || ''; }
    rememberProduct(id);
    try{ saveNow(); }catch(_){ }
    try{ renderNow(); }catch(_){ }
    applyVersion();
    applyProductBold();
    restoreScrollLong(scroll);
    return false;
  }

  // Se registra antes de los parches v46 cuando este archivo se carga antes: así PRODUCTOS no cae en el manejador antiguo que saltaba al inicio.
  window.addEventListener('click', function(ev){
    const btn = ev.target?.closest?.('button[data-action="save-producto"]');
    if(btn) return saveProducto(btn, ev);
  }, true);

  function injectStyle(){
    if($('ceV501Style')) return;
    const style = document.createElement('style');
    style.id = 'ceV501Style';
    style.textContent = `
      .ce-v500-product-modified,.ce-v500-product-modified *,
      .ce-v501-product-modified,.ce-v501-product-modified *{font-weight:900!important;}
      #eventStatus.status-finalizado,.status-pill.status-finalizado{background:#ef4444!important;color:#111827!important;border-color:#b91c1c!important;font-weight:900!important;}
      #selectedEvent option.ce-event-finalizado{color:#b91c1c!important;font-weight:900!important;}
      #selectedEvent option[data-finalizado="1"]{color:#b91c1c!important;font-weight:900!important;}
      #mainTabs.tabs{display:flex!important;align-items:center!important;justify-content:center!important;gap:12px!important;background:transparent!important;border:0!important;box-shadow:none!important;padding:2px 6px!important;margin-bottom:8px!important;border-radius:0!important;}
      #mainTabs .tab{width:50px!important;height:50px!important;min-width:50px!important;min-height:50px!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;border-radius:16px!important;display:flex!important;align-items:center!important;justify-content:center!important;}
      #mainTabs .tab.active{background:rgba(17,24,39,.08)!important;color:#111827!important;outline:2px solid rgba(17,24,39,.10)!important;}
      #mainTabs .tab .tabicon{font-size:34px!important;line-height:1!important;pointer-events:none!important;}
      .footer{background:transparent!important;border-top:0!important;backdrop-filter:none!important;pointer-events:none!important;}
      .footer-inner{display:flex!important;justify-content:center!important;align-items:center!important;gap:30px!important;max-width:none!important;margin:0 auto!important;padding:8px 14px!important;background:transparent!important;border:0!important;box-shadow:none!important;}
      .footer .iconbtn{width:60px!important;height:60px!important;min-width:60px!important;min-height:60px!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;border-radius:12px!important;pointer-events:auto!important;display:flex!important;align-items:center!important;justify-content:center!important;}
      .footer .iconbtn:hover{background:rgba(255,255,255,.72)!important;box-shadow:0 6px 20px rgba(15,23,42,.10)!important;}
      .footer-img,.maint-footer-img{width:54px!important;height:54px!important;object-fit:contain!important;display:block!important;}
      @media (max-width:760px){#mainTabs.tabs{gap:8px!important;justify-content:space-around!important;}#mainTabs .tab{width:42px!important;height:42px!important;min-width:42px!important;min-height:42px!important;}#mainTabs .tab .tabicon{font-size:29px!important}.footer-inner{gap:18px!important;padding:6px 10px!important}.footer .iconbtn{width:56px!important;height:56px!important;min-width:56px!important;min-height:56px!important}.footer-img,.maint-footer-img{width:52px!important;height:52px!important;}}
    `;
    document.head.appendChild(style);
  }

  // Justificantes de ingresos: servidor como fuente segura, sin machacar una imagen existente con referencias vacías.
  const receiptCache = new Map();
  const deletedKey = 'ControlEvent_ingreso_receipts_deleted_v500';
  function selectedId(){ try{ const ev = typeof selectedEvent === 'function' ? selectedEvent() : null; if(ev?.id) return String(ev.id); }catch(_){ } return String(st().selectedEventId || ''); }
  function dataUrl(v){ return /^data:image\//i.test(String(v || '')); }
  function srcOf(v){ if(!v) return ''; if(typeof v === 'string') return v; if(typeof v === 'object') return v.url || v.public_url || v.publicUrl || v.pathname || v.path || v.storage_path || v.dataUrl || v.base64 || ''; return ''; }
  function imageStore(){ const s=st(); if(!s.ticketImages || typeof s.ticketImages !== 'object') s.ticketImages = {}; if(!s.ticketImageRefs || typeof s.ticketImageRefs !== 'object') s.ticketImageRefs = {}; return s.ticketImages; }
  function receiptKeysFor(id){ const ev=selectedId(); const sid=String(id || ''); return [`${ev}|INGRESO:${sid}`, `${ev}|INGRESO|${sid}`, `INGRESO:${ev}|${sid}`]; }
  function serverKeyFromImageKey(key){ const ev=selectedId(); const s=String(key || ''); if(s.includes('|')) return s; return `${ev}|${s}`; }
  function deletedMap(){ try{ return JSON.parse(localStorage.getItem(deletedKey) || '{}') || {}; }catch(_){ return {}; } }
  function setDeleted(fullKey){ const m=deletedMap(); m[fullKey]=Date.now(); try{ localStorage.setItem(deletedKey, JSON.stringify(m)); }catch(_){ } }
  function isDeleted(fullKey){ const m=deletedMap(); return !!m[fullKey]; }
  function cachePut(key, value){ const src=srcOf(value); if(!src || isDeleted(key)) return; receiptCache.set(key, value); }
  async function hydrateIngresoReceipts(force){
    const ev = selectedId(); if(!ev) return;
    hydrateIngresoReceipts._last = hydrateIngresoReceipts._last || new Map();
    const last = hydrateIngresoReceipts._last.get(ev) || 0;
    if(!force && Date.now() - last < 6000) return;
    hydrateIngresoReceipts._last.set(ev, Date.now());
    try{
      const res = await fetch(`/api/ticket-images?eventId=${encodeURIComponent(ev)}`, {cache:'no-store'});
      const payload = await res.json().catch(() => ({}));
      if(!res.ok || !payload.ok || !payload.images) return;
      const store = imageStore(); const refs = st().ticketImageRefs || {};
      Object.entries(payload.images || {}).forEach(([rawKey, value]) => {
        const fullKey = serverKeyFromImageKey(rawKey);
        if(!/\|INGRESO[:|]/i.test(fullKey)) return;
        const src = srcOf(value);
        if(!src || isDeleted(fullKey)) return;
        cachePut(fullKey, value);
        if(!srcOf(store[fullKey])) store[fullKey] = src;
        if(!srcOf(refs[fullKey])) refs[fullKey] = typeof value === 'object' ? {...value, key:fullKey, url:src, pathname:value.pathname || src} : {key:fullKey, url:src, pathname:src};
      });
    }catch(_){ }
  }
  function protectReceiptImagesBeforeSave(){
    const store = imageStore(); const refs = st().ticketImageRefs || {};
    // Nunca se guarda una referencia vacía de INGRESO sobre una imagen existente.
    Object.keys({...store, ...refs}).forEach(key => {
      if(!/\|INGRESO[:|]/i.test(key) && !/^INGRESO[:|]/i.test(key)) return;
      const fullKey = key.includes('|') && !key.startsWith('INGRESO:') ? key : key;
      const localSrc = srcOf(store[key]) || srcOf(refs[key]);
      const cached = receiptCache.get(fullKey) || receiptCache.get(key);
      const cachedSrc = srcOf(cached);
      if(!localSrc && cachedSrc && !isDeleted(fullKey)){ store[key] = cachedSrc; refs[key] = typeof cached === 'object' ? {...cached, key, url:cachedSrc, pathname:cached.pathname || cachedSrc} : {key, url:cachedSrc, pathname:cachedSrc}; return; }
      if(!localSrc){ try{ delete store[key]; delete refs[key]; }catch(_){ } return; }
      cachePut(fullKey, store[key] || refs[key]);
    });
  }
  async function uploadLocalReceiptDataUrls(){
    const ev=selectedId(); if(!ev) return;
    const store = imageStore();
    for(const [key, value] of Object.entries(store)){
      if(!/\|INGRESO[:|]/i.test(key) || !dataUrl(srcOf(value)) || isDeleted(key)) continue;
      const label = String(key).split('|').slice(1).join('|');
      if(!label) continue;
      try{
        const res = await fetch('/api/ticket-images', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({eventId:ev, key:label, dataUrl:srcOf(value)})});
        const payload = await res.json().catch(() => ({}));
        if(res.ok && payload.ok && payload.image){ const img=payload.image; const full=img.key || key; const src=img.url || img.public_url || img.pathname || srcOf(value); store[full]=src; st().ticketImageRefs[full]={key:full, url:src, pathname:img.pathname || src}; cachePut(full, st().ticketImageRefs[full]); }
      }catch(_){ }
    }
  }
  function wrapSaveState(){
    const old = (typeof saveState === 'function') ? saveState : window.saveState;
    if(!old || old.__ceV500Wrapped) return;
    const wrapped = function(){ protectReceiptImagesBeforeSave(); return old.apply(this, arguments); };
    wrapped.__ceV500Wrapped = true;
    try{ saveState = wrapped; }catch(_){ }
    window.saveState = wrapped;
  }
  function wrapRender(){
    const old = (typeof render === 'function') ? render : window.render;
    if(!old || old.__ceV500Wrapped) return;
    const wrapped = function(){ const ret = old.apply(this, arguments); [40,160,500,1200].forEach(ms => setTimeout(() => { applyVersion(); applyCompactUi(); applyFinalizadoOptions(); applyProductBold(); hydrateIngresoReceipts(false); }, ms)); return ret; };
    wrapped.__ceV500Wrapped = true;
    try{ render = wrapped; }catch(_){ }
    window.render = wrapped;
  }
  function wrapFetchForReceiptDelete(){
    if(!window.fetch || window.fetch.__ceV500Wrapped) return;
    const oldFetch = window.fetch.bind(window);
    const wrapped = function(input, init){
      try{
        const url = typeof input === 'string' ? input : (input?.url || '');
        const method = String((init && init.method) || input?.method || 'GET').toUpperCase();
        if(method === 'DELETE' && /\/api\/ticket-images/i.test(url)){
          const u = new URL(url, window.location.origin);
          const ev = u.searchParams.get('eventId') || selectedId();
          const key = u.searchParams.get('key') || '';
          if(ev && key){
            const full = key.includes('|') ? key : `${ev}|${key}`;
            if(/\|INGRESO[:|]/i.test(full)){ setDeleted(full); receiptCache.delete(full); }
          }
        }
      }catch(_){ }
      return oldFetch(input, init);
    };
    wrapped.__ceV500Wrapped = true;
    window.fetch = wrapped;
  }

  function applyFinalizadoOptions(){
    const sel = $('selectedEvent');
    if(!sel) return;
    const events = arr('eventos');
    Array.from(sel.options || []).forEach(opt => {
      const ev = events.find(e => same(e?.id, opt.value));
      const fin = up(ev?.situacion) === 'FINALIZADO';
      opt.classList.toggle('ce-event-finalizado', fin);
      opt.dataset.finalizado = fin ? '1' : '0';
      if(fin){
        opt.style.color = '#b91c1c';
        opt.style.fontWeight = '900';
      }else{
        opt.style.color = '';
        opt.style.fontWeight = '';
      }
    });
    const status = $('eventStatus');
    if(status && /FINALIZADO/i.test(status.textContent || '')){
      status.classList.add('status-finalizado');
      status.style.background = '#ef4444';
      status.style.color = '#111827';
      status.style.fontWeight = '900';
    }
  }
  function applyCompactUi(){
    try{ document.body.classList.add('ce-v501-compact-icons'); }catch(_){ }
    try{ document.querySelectorAll('#mainTabs .tab').forEach(btn => { btn.setAttribute('aria-label', btn.title || btn.getAttribute('aria-label') || (btn.textContent||'').trim() || 'Opción'); }); }catch(_){ }
    try{ document.querySelectorAll('.footer .iconbtn').forEach(btn => { btn.setAttribute('aria-label', btn.title || 'Opción'); }); }catch(_){ }
  }
  function install(){
    injectStyle(); applyVersion(); applyCompactUi(); applyFinalizadoOptions(); wrapFetchForReceiptDelete(); wrapSaveState(); wrapRender(); applyProductBold(); hydrateIngresoReceipts(false); setTimeout(uploadLocalReceiptDataUrls, 1500);
  }
  let mo = null;
  function installObserver(){
    if(mo) return;
    mo = new MutationObserver(() => { if(installObserver._t) clearTimeout(installObserver._t); installObserver._t = setTimeout(() => { applyVersion(); applyCompactUi(); applyFinalizadoOptions(); applyProductBold(); protectReceiptImagesBeforeSave(); }, 90); });
    try{ mo.observe(document.body, {childList:true, subtree:true}); }catch(_){ }
  }
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(() => { install(); installObserver(); }, 20)));
  [0,80,260,700,1500,3000,6500].forEach(ms => setTimeout(() => { install(); installObserver(); }, ms));
})();
