/* ControlEvent v50.13 - estabilización rol/menús, estado de evento, justificantes de ingresos en iPad/móvil y negrita PRODUCTOS.
   - RW no ve Planificación inicial ni hay parpadeo de menú.
   - En móvil/iPhone/Android las opciones disponibles quedan siempre visibles; se oculta el botón Menú.
   - Botones inferiores visibles también en móvil para GD/RW, compactos y solo pulsables en el icono.
   - Estado En curso/Finalizado siempre con color coherente y opciones finalizadas en rojo/negrita.
   - INGRESOS/DONACIONES/COMPRAS se rehidratan si quedan vacíos tras login/cambio de evento.
   - Justificantes de ingresos usan mecánica no destructiva similar a tickets.
   - PRODUCTOS queda en negrita al modificar.
*/
(function(){
  'use strict';
  const VERSION = 'ControlEvent v50.13';
  const VERSION_FILE = 'ControlEvent_v50_13';
  const INSTALLED = '__ceV502FinalFixes';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const same = (a,b) => String(a ?? '') === String(b ?? '');
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cssEsc = v => { try{ return window.CSS?.escape ? CSS.escape(String(v ?? '')) : String(v ?? '').replace(/[^a-zA-Z0-9_-]/g, '\\$&'); }catch(_){ return String(v ?? '').replace(/"/g,'\\"'); } };

  const TABS = ['ingresos','donaciones','compras','mapa','planificacion','resumen','graficas'];
  const PANEL_BY_TAB = {ingresos:'tabIngresos',donaciones:'tabDonaciones',compras:'tabCompras',mapa:'tabMapaProductos',planificacion:'tabPlanificacionInicial',resumen:'tabResumen',graficas:'tabGraficas'};
  const BUTTON_BY_TAB = {ingresos:'tabIngresosBtn',donaciones:'tabDonacionesBtn',compras:'tabComprasBtn',mapa:'tabMapaBtn',planificacion:'tabPlanificacionBtn',resumen:'tabResumenBtn',graficas:'tabGraficasBtn'};
  const TAB_BY_BUTTON = Object.entries(BUTTON_BY_TAB).reduce((a,[k,v]) => (a[v]=k,a), {});
  const REPAIR_TABS = ['ingresos','donaciones','compras'];
  const PRODUCT_MOD_KEY = 'ControlEvent_productos_modificados_v502';
  const RECEIPT_BACKUP_KEY = 'ControlEvent_ingreso_receipts_v502';
  const RECEIPT_DELETED_KEY = 'ControlEvent_ingreso_receipts_deleted_v502';

  function st(){
    try{ if(typeof state !== 'undefined') return state || {}; }catch(_){ }
    try{ if(window.state) return window.state; }catch(_){ }
    try{ if(window.ControlEventApp?.state) return window.ControlEventApp.state; }catch(_){ }
    return {};
  }
  function auth(){
    try{ if(typeof authUser !== 'undefined' && authUser) return authUser; }catch(_){ }
    return window.authUser || window.ControlEventApp?.authUser || null;
  }
  function role(){ return up(auth()?.nivel || ''); }
  function isGD(){ return role() === 'GD'; }
  function isRW(){ return role() === 'RW'; }
  function isRO(){ return role() === 'RO'; }
  function canWrite(){ return isGD() || isRW(); }
  function arr(k){ const s=st(); return Array.isArray(s[k]) ? s[k] : []; }
  function selectedId(){ try{ const ev = typeof selectedEvent === 'function' ? selectedEvent() : null; if(ev?.id) return String(ev.id); }catch(_){ } return String(st().selectedEventId || ''); }
  function eventById(id){ const sid=String(id ?? selectedId()); return arr('eventos').find(e => same(e?.id, sid)) || null; }
  function selectedEv(){ return eventById(selectedId()); }
  function isFinalizado(ev){ return up((ev || selectedEv())?.situacion || '') === 'FINALIZADO'; }
  function hasEvent(){ return !!selectedId() && !!selectedEv(); }
  function getFn(name){ try{ if(typeof window[name] === 'function') return window[name]; }catch(_){ } try{ return Function('return (typeof '+name+' === "function") ? '+name+' : null')(); }catch(_){ return null; } }
  function call(name){ const fn=getFn(name); if(typeof fn !== 'function') return undefined; try{ return fn(); }catch(error){ console.warn('[v50.3] '+name, error); return undefined; } }
  function setCurrentTab(tab){
    const next = defaultTabForRole(tab);
    try{ currentMainTab = next; }catch(_){ }
    try{ if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab = next; }catch(_){ }
    try{ window.__ceCurrentMainTab = next; }catch(_){ }
    return next;
  }
  function currentTab(){
    const v1 = (() => { try{ return typeof currentMainTab !== 'undefined' ? String(currentMainTab || '') : ''; }catch(_){ return ''; } })();
    if(TABS.includes(v1)) return v1;
    const v2 = String(window.ControlEventApp?.navigation?.currentMainTab || window.__ceCurrentMainTab || '');
    if(TABS.includes(v2)) return v2;
    const visible = TABS.find(t => { const p=$(PANEL_BY_TAB[t]); return p && !p.classList.contains('hidden') && getComputedStyle(p).display !== 'none'; });
    return visible || 'ingresos';
  }
  function roleAllowsTab(tab){
    if(!auth()) return false;
    if(isRO()) return ['resumen','mapa','graficas'].includes(String(tab));
    if(String(tab) === 'planificacion') return isGD();
    return TABS.includes(String(tab));
  }
  function defaultTabForRole(prefer){
    const p=String(prefer || '');
    if(roleAllowsTab(p)) return p;
    if(isRO()) return 'resumen';
    return 'ingresos';
  }
  function setVisible(el, visible){
    if(!el) return;
    if(visible){
      el.classList.remove('hidden','ce-v452-hidden-role','ce-v502-hidden-role');
      el.removeAttribute('hidden'); el.removeAttribute('aria-hidden'); el.removeAttribute('aria-disabled');
      if('disabled' in el) el.disabled = false;
      el.style.removeProperty('display'); el.style.removeProperty('visibility'); el.style.removeProperty('opacity'); el.style.removeProperty('pointer-events');
    }else{
      el.classList.add('hidden','ce-v502-hidden-role');
      el.setAttribute('aria-hidden','true'); el.setAttribute('aria-disabled','true');
      if('disabled' in el) el.disabled = true;
      el.style.setProperty('display','none','important');
    }
  }

  function applyVersion(){
    try{ document.title = VERSION; document.body.dataset.ceVersion = VERSION; window.__ceVersion = VERSION; window.VERSION = VERSION; window.VERSION_FILE = VERSION_FILE; window.ControlEventVersion = {version:VERSION, versionFile:VERSION_FILE}; }catch(_){ }
    try{ document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => { const t=el.textContent || ''; if(/ControlEvent\s+v\d+(?:\.\d+)*/i.test(t)) el.textContent = t.replace(/ControlEvent\s+v\d+(?:\.\d+)*/ig, VERSION); }); }catch(_){ }
  }

  function injectStyle(){
    if($('ceV502FinalStyle')) return;
    const style=document.createElement('style');
    style.id='ceV502FinalStyle';
    style.textContent = `
      body.ce-v502-ready #ceMobileMenuBtn,body.ce-v502-ready #ceMobileDrawer,body.ce-v502-ready #ceMobileDrawerBackdrop{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      body.ce-v502-ready #mainTabs.tabs{display:flex!important;align-items:center!important;justify-content:center!important;gap:10px!important;flex-wrap:nowrap!important;background:transparent!important;border:0!important;box-shadow:none!important;padding:2px 6px!important;margin:0 0 8px!important;overflow-x:auto!important;scrollbar-width:none!important;}
      body.ce-v502-ready #mainTabs.tabs::-webkit-scrollbar{display:none!important;}
      body.ce-v502-ready #mainTabs .tab{display:flex!important;align-items:center!important;justify-content:center!important;width:48px!important;height:48px!important;min-width:48px!important;min-height:48px!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;border-radius:16px!important;line-height:1!important;}
      body.ce-v502-ready #mainTabs .tab.active{background:rgba(17,24,39,.09)!important;outline:2px solid rgba(17,24,39,.10)!important;}
      body.ce-v502-ready #mainTabs .tab .tabicon{font-size:32px!important;line-height:1!important;pointer-events:none!important;}
      body.ce-role-rw-v502 #tabPlanificacionBtn,body.ce-role-ro-v502 #tabPlanificacionBtn,body:not(.ce-role-gd-v502) #tabPlanificacionBtn{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      body.ce-role-ro-v502 #tabIngresosBtn,body.ce-role-ro-v502 #tabDonacionesBtn,body.ce-role-ro-v502 #tabComprasBtn,body.ce-role-ro-v502 #tabPlanificacionBtn{display:none!important;}
      body.ce-v502-ready .footer{display:block!important;position:fixed!important;left:0!important;right:0!important;bottom:calc(env(safe-area-inset-bottom,0px) + 4px)!important;z-index:2280!important;background:transparent!important;border:0!important;box-shadow:none!important;backdrop-filter:none!important;pointer-events:none!important;}
      body.ce-v502-ready.ce-role-ro-v502 .footer{display:none!important;}
      body.ce-v502-ready .footer-inner{display:flex!important;align-items:center!important;justify-content:center!important;gap:24px!important;max-width:none!important;margin:0 auto!important;padding:6px 10px!important;background:transparent!important;border:0!important;box-shadow:none!important;pointer-events:none!important;}
      body.ce-v502-ready .footer .iconbtn{display:flex!important;align-items:center!important;justify-content:center!important;width:58px!important;height:58px!important;min-width:58px!important;min-height:58px!important;padding:0!important;margin:0!important;border:0!important;background:transparent!important;box-shadow:none!important;border-radius:14px!important;pointer-events:auto!important;touch-action:manipulation!important;}
      body.ce-v502-ready .footer .iconbtn:hover{background:rgba(255,255,255,.78)!important;box-shadow:0 6px 20px rgba(15,23,42,.12)!important;}
      body.ce-v502-ready .footer-img,body.ce-v502-ready .maint-footer-img{width:54px!important;height:54px!important;object-fit:contain!important;display:block!important;pointer-events:none!important;}
      @media(max-width:760px){body.ce-v502-ready .main{padding-bottom:82px!important;}body.ce-v502-ready #mainTabs.tabs{gap:6px!important;justify-content:space-around!important;margin-bottom:6px!important;}body.ce-v502-ready #mainTabs .tab{width:41px!important;height:41px!important;min-width:41px!important;min-height:41px!important;}body.ce-v502-ready #mainTabs .tab .tabicon{font-size:28px!important;}body.ce-v502-ready .footer-inner{gap:18px!important;padding:5px 8px!important;}body.ce-v502-ready .footer .iconbtn{width:54px!important;height:54px!important;min-width:54px!important;min-height:54px!important;}body.ce-v502-ready .footer-img,body.ce-v502-ready .maint-footer-img{width:50px!important;height:50px!important;}}
      #eventStatus.status-finalizado{background:#ef4444!important;color:#111827!important;border-color:#b91c1c!important;font-weight:950!important;}
      #eventStatus.status-curso{background:#16a34a!important;color:#fff!important;border-color:#15803d!important;font-weight:950!important;}
      #selectedEvent option.ce-event-finalizado,#selectedEvent option[data-finalizado="1"]{color:#b91c1c!important;font-weight:950!important;}
      .ce-v502-product-modified,.ce-v502-product-modified *,#productosList .ce-v502-product-modified input,#productosList .ce-v502-product-modified select,#productosList .ce-v502-product-modified button{font-weight:950!important;}
      .ce-v502-receipt-strip{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:4px!important;margin:3px 0 0 4px!important;vertical-align:middle!important;position:relative!important;z-index:5!important;pointer-events:auto!important;touch-action:manipulation!important;}
      .ce-v502-receipt-thumb,.ce-v502-receipt-btn{width:34px!important;height:34px!important;min-width:34px!important;min-height:34px!important;border-radius:9px!important;padding:0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border:1px solid #cbd5e1!important;background:#fff!important;cursor:pointer!important;pointer-events:auto!important;touch-action:manipulation!important;position:relative!important;z-index:6!important;font-size:18px!important;}
      .ce-v502-receipt-thumb img{width:30px!important;height:30px!important;object-fit:cover!important;border-radius:7px!important;pointer-events:none!important;}
      .ce-v502-receipt-btn.danger{background:#fee2e2!important;color:#991b1b!important;border-color:#fecaca!important;}
      .ce-v502-receipt-empty{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:34px!important;height:34px!important;min-width:34px!important;border-radius:9px!important;background:#f8fafc!important;border:1px dashed #cbd5e1!important;color:#64748b!important;}
      .ce-v502-hidden-role{display:none!important;}
      /* v50.3: menú estable por rol. Planificación queda oculta por defecto y solo se muestra para GD. */
      body.ce-v502-ready #tabPlanificacionBtn{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      body.ce-v502-ready.ce-role-gd-v502 #tabPlanificacionBtn{display:flex!important;visibility:visible!important;pointer-events:auto!important;}
      body.ce-v502-ready.ce-role-rw-v502 #tabPlanificacionBtn,body.ce-v502-ready.ce-role-ro-v502 #tabPlanificacionBtn{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      /* v50.3: salida cómoda en móvil sin depender de giro horizontal. */
      @media(max-width:760px){body.ce-v502-ready #btnLogout:not(.hidden){position:fixed!important;right:calc(env(safe-area-inset-right,0px) + 6px)!important;top:calc(env(safe-area-inset-top,0px) + 6px)!important;z-index:6200!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;min-width:54px!important;height:34px!important;padding:0 9px!important;border-radius:12px!important;background:rgba(255,255,255,.96)!important;box-shadow:0 8px 24px rgba(15,23,42,.18)!important;font-size:12px!important;font-weight:900!important;pointer-events:auto!important;}body.ce-v502-ready #btnSoftRefresh:not(.hidden){position:fixed!important;right:calc(env(safe-area-inset-right,0px) + 66px)!important;top:calc(env(safe-area-inset-top,0px) + 6px)!important;z-index:6199!important;height:34px!important;min-width:72px!important;padding:0 8px!important;border-radius:12px!important;background:rgba(255,255,255,.96)!important;box-shadow:0 8px 24px rgba(15,23,42,.14)!important;font-size:11px!important;font-weight:850!important;pointer-events:auto!important;}}
    `;
    document.head.appendChild(style);
  }

  function applyRoleMenu(){
    injectStyle(); applyVersion();
    try{ document.body.classList.add('ce-v502-ready'); document.body.classList.remove('mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open'); document.documentElement.classList.remove('mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open'); }catch(_){ }
    try{ document.body.classList.toggle('ce-role-gd-v502', isGD()); document.body.classList.toggle('ce-role-rw-v502', isRW()); document.body.classList.toggle('ce-role-ro-v502', isRO()); }catch(_){ }
    Object.entries(BUTTON_BY_TAB).forEach(([tab,id]) => setVisible($(id), roleAllowsTab(tab)));
    document.querySelectorAll('.mobile-menu-action[data-target]').forEach(el => {
      const tab=TAB_BY_BUTTON[el.dataset?.target || ''];
      if(tab) setVisible(el, roleAllowsTab(tab));
    });
    const footerAllowed = isGD() || isRW();
    ['btnExportExcel','btnOpenImport','btnExportSeed','btnToggleMaintenance'].forEach(id => setVisible($(id), footerAllowed));
    document.querySelectorAll('.mobile-menu-action[data-target="btnExportExcel"],.mobile-menu-action[data-target="btnOpenImport"],.mobile-menu-action[data-target="btnExportSeed"],.mobile-menu-action[data-target="btnToggleMaintenance"]').forEach(el => setVisible(el, footerAllowed));
    if(auth() && !roleAllowsTab(currentTab())) setCurrentTab(defaultTabForRole(currentTab()));
  }

  function applyEventStatus(){
    const ev = selectedEv();
    const status = $('eventStatus');
    if(status && ev){
      const fin = isFinalizado(ev);
      status.textContent = fin ? 'Finalizado' : 'En curso';
      status.classList.toggle('status-finalizado', fin);
      status.classList.toggle('status-curso', !fin);
      status.style.setProperty('background', fin ? '#ef4444' : '#16a34a', 'important');
      status.style.setProperty('color', fin ? '#111827' : '#ffffff', 'important');
      status.style.setProperty('border-color', fin ? '#b91c1c' : '#15803d', 'important');
      status.style.setProperty('font-weight', '950', 'important');
    }
    const sel=$('selectedEvent');
    if(sel){
      Array.from(sel.options || []).forEach(opt => {
        const optEv = eventById(opt.value);
        const fin = !!optEv && isFinalizado(optEv);
        opt.classList.toggle('ce-event-finalizado', fin);
        opt.dataset.finalizado = fin ? '1' : '0';
        if(fin){ opt.style.setProperty('color','#b91c1c','important'); opt.style.setProperty('font-weight','950','important'); }
        else { opt.style.removeProperty('color'); opt.style.removeProperty('font-weight'); }
      });
    }
  }

  function visiblePanel(tab){ const p=$(PANEL_BY_TAB[tab]); return !!p && !p.classList.contains('hidden') && getComputedStyle(p).display !== 'none'; }
  function hasCards(id){ const el=$(id); return !!el && !!el.querySelector('.itemcard,.rowline,.card:not(.empty)'); }
  function repairVisibleData(tab, reason){
    if(!auth() || !hasEvent()) return;
    tab = tab || currentTab();
    if(!REPAIR_TABS.includes(tab) || !roleAllowsTab(tab) || !visiblePanel(tab)) return;
    const rows = arr(tab === 'ingresos' ? 'colaboradores' : 'compras').filter(r => same(r.eventId, selectedId()));
    const shouldHave = rows.length > 0;
    const listId = tab === 'ingresos' ? 'collabList' : (tab === 'donaciones' ? 'donacionesList' : 'comprasList');
    const list = $(listId);
    const looksEmpty = !!list && (!list.textContent.trim() || /Preparando|Cargando/i.test(list.textContent) || (shouldHave && !list.querySelector('.itemcard')));
    if(!looksEmpty && hasCards(listId)) return;
    try{ call('renderHeader'); call('renderMainSelectors'); }catch(_){ }
    if(tab === 'ingresos'){ call('renderIngresosSummary'); call('renderColabs'); }
    if(tab === 'donaciones') call('renderDonaciones');
    if(tab === 'compras') call('renderCompras');
    try{ call('renderPermissions'); call('renderLockState'); }catch(_){ }
    setTimeout(() => { compactReceipts(); applyProductBold(); applyRoleMenu(); applyEventStatus(); }, 60);
  }
  function scheduleRepair(tab, reason){ [80,240,620,1200,2200].forEach(ms => setTimeout(() => repairVisibleData(tab || currentTab(), reason), ms)); }

  const modifiedProducts = new Set();
  function loadProductModified(){ try{ JSON.parse(localStorage.getItem(PRODUCT_MOD_KEY) || '[]').forEach(id => modifiedProducts.add(String(id))); }catch(_){ } try{ JSON.parse(localStorage.getItem('ControlEvent_productos_modificados_v501') || '[]').forEach(id => modifiedProducts.add(String(id))); }catch(_){ } try{ JSON.parse(localStorage.getItem('ControlEvent_productos_modificados_v500') || '[]').forEach(id => modifiedProducts.add(String(id))); }catch(_){ } try{ arr('productos').forEach(p => { if(p && (p.__ceModified || p._ceModified || p.modified || p.modificado)) modifiedProducts.add(String(p.id)); }); }catch(_){ } }
  function storeProductModified(){ try{ localStorage.setItem(PRODUCT_MOD_KEY, JSON.stringify(Array.from(modifiedProducts))); }catch(_){ } }
  function productCardById(id){
    const wrap=$('productosList') || document; const safe=cssEsc(id);
    const selectors=[`button[data-action="save-producto"][data-id="${safe}"]`,`button[data-action="delete-producto"][data-id="${safe}"]`,`input[data-action="edit-producto-nombre"][data-id="${safe}"]`,`select[data-action="edit-producto-segmento"][data-id="${safe}"]`,`select[data-action="edit-producto-destino"][data-id="${safe}"]`,`input[data-action="edit-producto-precio"][data-id="${safe}"]`,`select[data-action="edit-producto-tienda"][data-id="${safe}"]`];
    for(const sel of selectors){ try{ const el=wrap.querySelector(sel); if(el) return el.closest('.itemcard') || el.closest('.rowline') || el.closest('.card') || el.parentElement || el; }catch(_){ } }
    return null;
  }
  function markBold(el){ if(!el) return; try{ el.classList.add('ce-v502-product-modified','ce-v501-product-modified','ce-v500-product-modified','ce-v468-modified-product'); }catch(_){ } try{ el.style.setProperty('font-weight','950','important'); el.querySelectorAll('input,select,textarea,button,label,span,div').forEach(x => x.style.setProperty('font-weight','950','important')); }catch(_){ } }
  function applyProductBold(){ loadProductModified(); modifiedProducts.forEach(id => markBold(productCardById(id))); }
  function rememberProduct(id){ if(!id) return; modifiedProducts.add(String(id)); storeProductModified(); const p=arr('productos').find(x => same(x.id,id)); if(p){ p.__ceModified = true; p._ceModified = true; p.modified = true; } [0,50,160,360,800,1600,3200,6000].forEach(ms => setTimeout(applyProductBold, ms)); }

  function dataUrl(v){ return /^data:image\//i.test(String(v || '')); }
  function srcOf(value){ if(!value) return ''; if(typeof value === 'string') return value; if(typeof value === 'object') return value.url || value.public_url || value.publicUrl || value.pathname || value.path || value.storage_path || value.dataUrl || value.base64 || ''; return ''; }
  function imageStore(){ const s=st(); if(!s.ticketImages || typeof s.ticketImages !== 'object') s.ticketImages = {}; if(!s.ticketImageRefs || typeof s.ticketImageRefs !== 'object') s.ticketImageRefs = {}; return s.ticketImages; }
  function keyOnly(id){ return `INGRESO:${String(id || '')}`; }
  function fullKey(id){ return `${selectedId()}|${keyOnly(id)}`; }
  function legacyKeys(id){ const ev=selectedId(), sid=String(id || ''); return [`${ev}|INGRESO:${sid}`,`${ev}|INGRESO|${sid}`,`INGRESO:${ev}|${sid}`]; }
  function jsonGet(key){ try{ return JSON.parse(localStorage.getItem(key) || '{}') || {}; }catch(_){ return {}; } }
  function jsonSet(key,obj){ try{ localStorage.setItem(key, JSON.stringify(obj || {})); }catch(_){ } }
  function deletedMap(){ return jsonGet(RECEIPT_DELETED_KEY); }
  function isDeletedKey(key){ return !!deletedMap()[key]; }
  function markDeleted(id){ const m=deletedMap(); legacyKeys(id).forEach(k => m[k]=Date.now()); jsonSet(RECEIPT_DELETED_KEY,m); }
  function backupPut(key, src){ if(!key || !src || !dataUrl(src)) return; const b=jsonGet(RECEIPT_BACKUP_KEY); b[key]=src; jsonSet(RECEIPT_BACKUP_KEY,b); }
  function backupDelete(id){ const b=jsonGet(RECEIPT_BACKUP_KEY); legacyKeys(id).forEach(k => delete b[k]); jsonSet(RECEIPT_BACKUP_KEY,b); }
  function receiptSrc(id){
    const store=imageStore(), refs=st().ticketImageRefs || {}, bak=jsonGet(RECEIPT_BACKUP_KEY);
    for(const k of legacyKeys(id)){ const s=srcOf(store[k]); if(s && !isDeletedKey(k)) return s; }
    for(const k of legacyKeys(id)){ const s=srcOf(refs[k]); if(s && !isDeletedKey(k)) return s; }
    for(const k of legacyKeys(id)){ const s=srcOf(bak[k]); if(s && !isDeletedKey(k)) return s; }
    return '';
  }
  function setReceiptLocal(id, src, ref){
    if(!id || !src) return; const key=fullKey(id); const store=imageStore(); const refs=st().ticketImageRefs || {};
    store[key]=src; refs[key]=ref && typeof ref === 'object' ? {...ref, key, url:src, pathname:ref.pathname || src} : {key, url:src, pathname:src};
    if(dataUrl(src)) backupPut(key, src);
  }
  function deleteReceiptLocal(id){ const store=imageStore(), refs=st().ticketImageRefs || {}; legacyKeys(id).forEach(k => { try{ delete store[k]; delete refs[k]; }catch(_){ } }); backupDelete(id); markDeleted(id); }
  function readImage(file){ return new Promise((resolve,reject) => { const r=new FileReader(); r.onload=()=>resolve(String(r.result || '')); r.onerror=()=>reject(r.error || new Error('No se pudo leer la imagen.')); r.readAsDataURL(file); }); }
  async function uploadReceipt(id, src){
    if(!id || !selectedId() || !dataUrl(src)) return '';
    const res = await fetch('/api/ticket-images', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({eventId:selectedId(), key:keyOnly(id), dataUrl:src})});
    const payload = await res.json().catch(() => ({}));
    if(!res.ok || !payload.ok) throw new Error(payload.error || payload.message || 'No se pudo guardar la imagen.');
    const img=payload.image || {}; const url=img.url || img.public_url || img.pathname || src; setReceiptLocal(id, url, {key:img.key || fullKey(id), url, pathname:img.pathname || url, contentType:img.contentType || img.content_type || '', size:img.size || img.size_bytes || 0}); return url;
  }
  async function hydrateReceipts(force){
    const ev=selectedId(); if(!ev) return;
    hydrateReceipts._last = hydrateReceipts._last || new Map(); const last=hydrateReceipts._last.get(ev) || 0;
    if(!force && Date.now()-last < 4500) return; hydrateReceipts._last.set(ev, Date.now());
    try{
      const res=await fetch(`/api/ticket-images?eventId=${encodeURIComponent(ev)}`, {cache:'no-store'});
      const payload=await res.json().catch(() => ({})); if(!res.ok || !payload.ok || !payload.images) return;
      const store=imageStore(), refs=st().ticketImageRefs || {};
      Object.entries(payload.images).forEach(([k,v]) => { const fk = String(k).includes('|') ? String(k) : `${ev}|${String(k)}`; if(!/\|INGRESO[:|]/i.test(fk) || isDeletedKey(fk)) return; const src=srcOf(v); if(!src) return; if(!srcOf(store[fk])) store[fk]=src; if(!srcOf(refs[fk])) refs[fk]=typeof v === 'object' ? {...v, key:fk, url:src, pathname:v.pathname || src} : {key:fk, url:src, pathname:src}; });
      compactReceipts();
    }catch(_){ }
  }
  function preserveReceiptsBeforeSave(){
    const store=imageStore(), refs=st().ticketImageRefs || {}, bak=jsonGet(RECEIPT_BACKUP_KEY);
    Object.entries(store).forEach(([k,v]) => { const src=srcOf(v); if(/\|INGRESO[:|]/i.test(k) && dataUrl(src)) backupPut(k,src); });
    Object.entries(bak).forEach(([k,src]) => { if(/\|INGRESO[:|]/i.test(k) && src && !srcOf(store[k]) && !isDeletedKey(k)) store[k]=src; });
    Object.keys({...store, ...refs}).forEach(k => { if(!/\|INGRESO[:|]/i.test(k) && !/^INGRESO[:|]/i.test(k)) return; const src=srcOf(store[k]) || srcOf(refs[k]); if(!src && bak[k] && !isDeletedKey(k)){ store[k]=bak[k]; refs[k]={key:k,url:bak[k],pathname:bak[k]}; } });
  }
  function wrapSaveState(){ const old=getFn('saveState'); if(!old || old.__ceV502Receipts) return; const wrapped=function(){ preserveReceiptsBeforeSave(); return old.apply(this, arguments); }; wrapped.__ceV502Receipts=true; try{ saveState=wrapped; }catch(_){ } window.saveState=wrapped; }
  function saveNow(){ try{ preserveReceiptsBeforeSave(); if(typeof saveState === 'function') return saveState(); }catch(_){ } try{ preserveReceiptsBeforeSave(); return window.saveState?.(); }catch(_){ } }

  function collabIdFromCard(card){ return card?.querySelector?.('button[data-action="save-collab"][data-id],button[data-action="delete-collab"][data-id],select[data-action="edit-collab-persona"][data-id],input[data-action="edit-collab-numero"][data-id],[data-action="edit-collab-situacion"][data-id]')?.dataset?.id || ''; }
  function compactReceipts(){
    const wrap=$('collabList'); if(!wrap) return; injectStyle();
    // Retirar herramientas antiguas sin tocar la ficha si ya está estable.
    wrap.querySelectorAll('.ce-ingreso-receipt-tools-v463,.ce-v464-receipt-tools,.ce-v465-receipt-strip:not(.ce-v502-receipt-strip),.ce-v501-receipt-strip').forEach(el => { try{ el.remove(); }catch(_){ } });
    wrap.querySelectorAll('.itemcard,.rowline,.card').forEach(card => {
      const id=collabIdFromCard(card); if(!id) return; const src=receiptSrc(id); const locked=isFinalizado(); const writable=canWrite() && !locked;
      const html = `${src ? `<button type="button" class="ce-v502-receipt-thumb" title="Ver justificante" data-action="ingreso-receipt-view-v502" data-id="${esc(id)}"><img alt="Justificante" src="${esc(src)}"></button>` : `<span class="ce-v502-receipt-empty" title="Sin justificante">📷</span>`}${writable ? `<button type="button" class="ce-v502-receipt-btn" title="${src ? 'Cambiar justificante' : 'Adjuntar justificante'}" data-action="ingreso-receipt-add-v502" data-id="${esc(id)}">📎</button>${src ? `<button type="button" class="ce-v502-receipt-btn danger" title="Eliminar justificante" data-action="ingreso-receipt-delete-v502" data-id="${esc(id)}">🗑</button>` : ''}` : ''}`;
      let boxes=Array.from(card.querySelectorAll('.ce-v502-receipt-strip'));
      let box=boxes.shift();
      boxes.forEach(x => { try{ x.remove(); }catch(_){ } });
      if(!box){ box=document.createElement('div'); box.className='ce-v502-receipt-strip'; const actions=card.querySelector('button[data-action="save-collab"]')?.parentElement || card.querySelector('button[data-action="delete-collab"]')?.parentElement || card; try{ actions.appendChild(box); }catch(_){ card.appendChild(box); } }
      const nextSig = JSON.stringify({html, src:!!src, locked, writable, role:role()});
      if(box.dataset.sig !== nextSig){ box.innerHTML=html; box.dataset.sig=nextSig; }
      box.dataset.receiptHas=String(!!src); box.dataset.locked=String(locked); box.dataset.role=role();
    });
  }
  function receiptInfo(id){
    const row = arr('colaboradores').find(r => same(r.id,id)) || {}; const persona=arr('personas').find(p => same(p.id,row.personaId)) || {}; const ev=selectedEv() || {}; const socio=up(persona.rango)==='SOCIO'; const precio=Number(ev.precio || 0); const obligatorio=socio ? precio * Number(row.numero || 0) : 0; const voluntario=Number(String(row.importe || 0).replace(',','.')) || 0; return {nombre:persona.nombre || '-', rango:persona.rango || '-', situacion:row.situacion || 'Pendiente', numero:Number(row.numero || 0), obligatorio, voluntario, total:obligatorio+voluntario};
  }
  function money(v){ try{ return (typeof window.money === 'function') ? window.money(Number(v || 0)) : new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0)); }catch(_){ return `${Number(v||0).toFixed(2)} €`; } }
  function showReceipt(id, ev){
    const src=receiptSrc(id); if(!src){ alert('Este ingreso no tiene justificante adjunto.'); return stop(ev); }
    const info=receiptInfo(id); let ov=$('ceV502ReceiptModal'); if(ov) ov.remove(); ov=document.createElement('div'); ov.id='ceV502ReceiptModal'; ov.className='ce-v468-modal';
    ov.innerHTML = `<div class="ce-v468-modal-card"><div class="ce-v468-modal-head"><span>Justificante de ingreso</span><button type="button" class="outline small" data-close="1">Cerrar</button></div><div class="ce-v468-modal-info"><h3>${esc(info.nombre)}</h3><table><tbody><tr><td>Rango</td><td>${esc(info.rango)}</td></tr><tr><td>Situación</td><td>${esc(info.situacion)}</td></tr><tr><td>Nº personas</td><td>${esc(info.numero)}</td></tr><tr><td>Importe obligatorio</td><td>${esc(money(info.obligatorio))}</td></tr><tr><td>Importe voluntario</td><td>${esc(money(info.voluntario))}</td></tr><tr><td>Total ingreso</td><td>${esc(money(info.total))}</td></tr></tbody></table></div><img class="ce-v468-modal-img" alt="Justificante de ingreso" src="${esc(src)}"></div>`;
    document.body.appendChild(ov); ov.addEventListener('click', e => { if(e.target===ov || e.target?.closest?.('[data-close]')){ stop(e); ov.remove(); return false; } try{ e.stopPropagation(); }catch(_){ } }, true); return stop(ev);
  }
  async function attachReceipt(id, ev){
    if(!canWrite()){ alert('No autorizado para modificar justificantes.'); return stop(ev); }
    if(isFinalizado()){ alert('Evento finalizado. Solo se puede ver el justificante.'); return stop(ev); }
    const input=document.createElement('input'); input.type='file'; input.accept='image/*'; input.style.position='fixed'; input.style.left='-9999px'; document.body.appendChild(input);
    input.addEventListener('change', async () => { try{ const f=input.files && input.files[0]; if(!f) return; if(!/^image\//i.test(f.type || '')){ alert('Selecciona una imagen.'); return; } const src=await readImage(f); setReceiptLocal(id,src); compactReceipts(); try{ await uploadReceipt(id,src); }catch(error){ console.warn('[v50.3] Justificante no subido aún, queda protegido localmente.', error); } saveNow(); compactReceipts(); hydrateReceipts(true); }catch(error){ alert('No se pudo adjuntar el justificante. '+(error?.message || error)); } finally{ try{ input.remove(); }catch(_){ } } }, {once:true});
    input.click(); return stop(ev);
  }
  async function removeReceipt(id, ev){
    if(!canWrite()){ alert('No autorizado para modificar justificantes.'); return stop(ev); }
    if(isFinalizado()){ alert('Evento finalizado. No se puede eliminar el justificante.'); return stop(ev); }
    if(!confirm('¿Eliminar el justificante de este ingreso?')) return stop(ev);
    try{ deleteReceiptLocal(id); await fetch(`/api/ticket-images?eventId=${encodeURIComponent(selectedId())}&key=${encodeURIComponent(keyOnly(id))}`, {method:'DELETE'}); }catch(_){ }
    saveNow(); compactReceipts(); return stop(ev);
  }
  function stop(ev){ try{ ev?.preventDefault?.(); ev?.stopPropagation?.(); ev?.stopImmediatePropagation?.(); }catch(_){ } return false; }

  function handlePointerDown(ev){ const btn=ev.target?.closest?.('button[data-action="save-producto"]'); if(btn) rememberProduct(btn.dataset.id || ''); }
  function handleReceiptEvent(ev){
    const btn=ev.target?.closest?.('[data-action="ingreso-receipt-view-v502"],[data-action="ingreso-receipt-add-v502"],[data-action="ingreso-receipt-delete-v502"],.ce-v502-receipt-thumb,.ce-v502-receipt-btn');
    if(!btn) return; const id=btn.dataset.id || ''; if(!id) return;
    if(btn.dataset.action === 'ingreso-receipt-view-v502' || btn.classList.contains('ce-v502-receipt-thumb')) return showReceipt(id, ev);
    if(btn.dataset.action === 'ingreso-receipt-add-v502') return attachReceipt(id, ev);
    if(btn.dataset.action === 'ingreso-receipt-delete-v502') return removeReceipt(id, ev);
  }
  function handleNav(ev){
    const trg=ev.target?.closest?.('button[id],.mobile-menu-action[data-target]'); if(!trg) return;
    const id=trg.dataset?.target || trg.id || ''; const tab=TAB_BY_BUTTON[id] || '';
    if(tab){
      if(!roleAllowsTab(tab)){ stop(ev); applyRoleMenu(); return false; }
      setCurrentTab(tab); scheduleRepair(tab, 'nav');
    }
  }
  function handleEventChange(){ applyEventStatus(); hydrateReceipts(true); scheduleRepair(currentTab(), 'event-change'); [120,500,1200,2500].forEach(ms => setTimeout(() => { applyRoleMenu(); applyEventStatus(); compactReceipts(); }, ms)); }

  // v50.3: se elimina el observador global de todo el DOM porque reescribía controles de justificante y provocaba temblores en RW/RO.
  let mo=null;
  function installObserver(){ return; }
  function wrapRender(){ const old=getFn('render'); if(!old || old.__ceV502Wrapped) return; const wrapped=function(){ const ret=old.apply(this, arguments); [40,180,650].forEach(ms => setTimeout(() => { applyRoleMenu(); applyEventStatus(); compactReceipts(); applyProductBold(); hydrateReceipts(false); }, ms)); setTimeout(() => scheduleRepair(currentTab(),'after-render'), 260); return ret; }; wrapped.__ceV502Wrapped=true; try{ render=wrapped; }catch(_){ } window.render=wrapped; }
  function install(){ injectStyle(); applyVersion(); applyRoleMenu(); applyEventStatus(); preserveReceiptsBeforeSave(); hydrateReceipts(false); compactReceipts(); applyProductBold(); wrapSaveState(); wrapRender(); installObserver(); }

  window.addEventListener('pointerdown', handlePointerDown, true);
  window.addEventListener('mousedown', handlePointerDown, true);
  window.addEventListener('touchstart', handlePointerDown, {capture:true, passive:true});
  function isReceiptTarget(ev){ return ev.target?.closest?.('[data-action="ingreso-receipt-view-v502"],[data-action="ingreso-receipt-add-v502"],[data-action="ingreso-receipt-delete-v502"],.ce-v502-receipt-thumb,.ce-v502-receipt-btn'); }
  function stopReceiptOnly(ev){ if(isReceiptTarget(ev)){ try{ ev.stopPropagation(); ev.stopImmediatePropagation?.(); }catch(_){ } } }
  window.addEventListener('pointerdown', stopReceiptOnly, true);
  window.addEventListener('touchstart', stopReceiptOnly, {capture:true, passive:false});
  window.addEventListener('pointerup', function(ev){ if(isReceiptTarget(ev)) return handleReceiptEvent(ev); }, true);
  window.addEventListener('click', handleReceiptEvent, true);
  window.addEventListener('touchend', function(ev){ if(isReceiptTarget(ev)) return handleReceiptEvent(ev); }, {capture:true, passive:false});
  window.addEventListener('click', handleNav, true);
  window.addEventListener('change', ev => { if(ev.target?.id === 'selectedEvent') handleEventChange(); }, true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 30)));
  [0,80,240,700,1500,3000,6000].forEach(ms => setTimeout(install, ms));
  // v50.3: sin watchdog visual cada 1,8s. Solo sincronización ligera y espaciada para no provocar temblores ni duplicar controles.
  setInterval(() => { hydrateReceipts(false); applyEventStatus(); }, window.ControlEventLowResource?.interval?.(15000) || 15000);
  window.ControlEventV502 = {version:VERSION, versionFile:VERSION_FILE, applyRoleMenu, applyEventStatus, repairVisibleData, hydrateReceipts, compactReceipts, applyProductBold};
  window.ControlEventV503 = window.ControlEventV502;
})();
