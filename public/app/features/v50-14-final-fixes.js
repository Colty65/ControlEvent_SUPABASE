/* ControlEvent v1.0/pr - correccion conservadora sobre v50.19.
   - Retira efectos de v50.19: no fuerza seleccion de evento tras login para no dejar datos a medias.
   - Recupera globos de Resumen Presupuestario con tabla + columna final Just. del sistema v46.9.
   - Evita apertura automatica de la primera foto en moviles/iPad: solo se abre justificante al tocar la miniatura Just.
   - Dock movil Refres/Salir, uno encima de otro, abajo derecha pegado al margen.
   - Limpieza visual de PRODUCTOS sin observadores ni bucles.
   - Version: ControlEvent v1.0/pr.
*/
(function(){
  'use strict';
  const VERSION = 'ControlEvent v1.0/pr';
  const VERSION_FILE = 'ControlEvent_v1_0_pr';
  const INSTALLED = '__ceV5014FinalFixes';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const DOCK_ID = 'ceMobileActionDockV514';
  const STYLE_ID = 'ceV5014FinalStyle';
  const BUDGET_TIP_ID = 'ceBudgetLiteTooltipV307';
  const V5013_KEYS = ['ce_v5013_require_event_choice','ce_v5013_user_picked_event'];
  const PRODUCT_BOLD_KEYS = [
    'ControlEvent_productos_modificados_v469',
    'ControlEvent_productos_modificados_v500',
    'ControlEvent_productos_modificados_v501',
    'ControlEvent_productos_modificados_v502'
  ];
  const PRODUCT_BOLD_CLASSES = [
    'ce-v468-modified-product','ce-v500-product-modified','ce-v501-product-modified','ce-v502-product-modified',
    'ce-v46-modified','ce-v464-modified'
  ];

  const $ = id => document.getElementById(id);
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const stop = ev => { try{ ev?.preventDefault?.(); ev?.stopPropagation?.(); ev?.stopImmediatePropagation?.(); }catch(_){ } return false; };
  const getLexical = name => safe(() => Function('return (typeof '+name+' !== "undefined") ? '+name+' : undefined;')(), undefined);
  const getFn = name => safe(() => (typeof window[name] === 'function') ? window[name] : Function('return (typeof '+name+' === "function") ? '+name+' : null;')(), null);
  const auth = () => getLexical('authUser') || window.authUser || window.ControlEventApp?.authUser || window.__CONTROL_EVENT_USER__ || null;
  const isMobile = () => safe(() => window.matchMedia('(max-width: 900px)').matches, window.innerWidth <= 900);

  function overlayVisible(){
    const ov = $('authOverlay');
    if(!ov) return false;
    return safe(() => {
      const cs = getComputedStyle(ov);
      if(ov.classList.contains('hidden')) return false;
      if(cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity || 1) === 0) return false;
      return !!(ov.offsetWidth || ov.offsetHeight || ov.getClientRects().length);
    }, false);
  }
  function authenticated(){
    if(auth()) return true;
    const body = document.body;
    if(!body) return false;
    if(body.classList.contains('auth-locked') || body.classList.contains('ce-v5013-force-event-choice')) return false;
    return !overlayVisible();
  }

  function injectStyle(){
    if($(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      body.ce-v5014-clean #selectedEvent{pointer-events:auto!important;}
      body.ce-v5014-clean.ce-v5014-authenticated #${DOCK_ID}{display:flex!important;visibility:visible!important;}
      #${DOCK_ID}{display:none;visibility:hidden;position:fixed!important;right:calc(env(safe-area-inset-right,0px) + 1px)!important;bottom:calc(env(safe-area-inset-bottom,0px) + 2px)!important;left:auto!important;top:auto!important;z-index:180000!important;flex-direction:column!important;gap:2px!important;align-items:flex-end!important;justify-content:flex-end!important;opacity:.50!important;pointer-events:none!important;}
      #${DOCK_ID}:active,#${DOCK_ID}:focus-within{opacity:.98!important;}
      #${DOCK_ID} button{pointer-events:auto!important;touch-action:manipulation!important;appearance:none!important;-webkit-appearance:none!important;width:52px!important;min-width:52px!important;height:27px!important;min-height:27px!important;border-radius:999px!important;border:1px solid rgba(15,23,42,.16)!important;background:rgba(255,255,255,.66)!important;color:#111827!important;box-shadow:0 4px 12px rgba(15,23,42,.14)!important;font-size:10px!important;font-weight:900!important;line-height:1!important;margin:0!important;padding:0 5px!important;backdrop-filter:blur(4px)!important;-webkit-backdrop-filter:blur(4px)!important;}
      body:not(.ce-v5014-authenticated) #${DOCK_ID},body.auth-locked #${DOCK_ID}{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      @media(min-width:901px){#${DOCK_ID}{display:none!important;visibility:hidden!important;}}
      #${BUDGET_TIP_ID}.open{pointer-events:auto!important;z-index:4200!important;}
      #${BUDGET_TIP_ID} .ce-budget-lite-close{position:sticky!important;top:0!important;float:right!important;z-index:12!important;min-width:40px!important;min-height:40px!important;font-size:24px!important;line-height:1!important;touch-action:manipulation!important;}
      #${BUDGET_TIP_ID} .ce-budget-lite-table-wrap{overflow:auto!important;-webkit-overflow-scrolling:touch!important;max-width:100%!important;}
      #${BUDGET_TIP_ID} .ce-v465-tip-thumb{touch-action:manipulation!important;pointer-events:auto!important;}
      #productosList .ce-v468-modified-product,#productosList .ce-v468-modified-product *,
      #productosList .ce-v500-product-modified,#productosList .ce-v500-product-modified *,
      #productosList .ce-v501-product-modified,#productosList .ce-v501-product-modified *,
      #productosList .ce-v502-product-modified,#productosList .ce-v502-product-modified *,
      #productosList .ce-v46-modified,#productosList .ce-v46-modified *,
      #productosList .ce-v464-modified,#productosList .ce-v464-modified *{font-weight:400!important;animation:none!important;transition:none!important;filter:none!important;}
      #productosList .rowline,#productosList .itemcard,#productosList .card,#productosList [class*="product"]{animation:none!important;transition:none!important;filter:none!important;}
      #productosList button[data-action="save-producto"],#productosList button.modify{font-weight:800!important;}
    `;
    document.head.appendChild(style);
  }

  function applyVersion(){
    try{
      document.title = VERSION;
      document.documentElement.dataset.ceVersion = VERSION;
      if(document.body) document.body.dataset.ceVersion = VERSION;
      window.__ceVersion = VERSION;
      window.VERSION = VERSION;
      window.VERSION_FILE = VERSION_FILE;
      window.ControlEventVersion = {version:VERSION, versionFile:VERSION_FILE};
      document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => {
        const t = el.textContent || '';
        if(/ControlEvent\s+v\d+(?:\.\d+)*/i.test(t)) el.textContent = t.replace(/ControlEvent\s+v\d+(?:\.\d+)*/ig, VERSION);
      });
    }catch(_){ }
  }

  function clearV5013EventChoiceState(){
    try{ document.body?.classList.remove('ce-v5013-force-event-choice'); }catch(_){ }
    V5013_KEYS.forEach(k => safe(() => sessionStorage.removeItem(k), null));
  }

  function syncAuthClasses(){
    clearV5013EventChoiceState();
    const ok = authenticated();
    try{
      document.body.classList.add('ce-v5014-clean');
      document.body.classList.toggle('ce-v5014-authenticated', ok);
      document.body.classList.toggle('ce-v5014-logged-out', !ok);
    }catch(_){ }
    return ok;
  }

  function ensureMobileDock(){
    injectStyle();
    let dock = $(DOCK_ID);
    if(!dock){
      dock = document.createElement('div');
      dock.id = DOCK_ID;
      dock.setAttribute('aria-label','Acciones rápidas');
      dock.innerHTML = '<button type="button" id="ceBtnRefresV514" aria-label="Refrescar">Refres</button><button type="button" id="ceBtnSalirV514" aria-label="Salir">Salir</button>';
      document.body.appendChild(dock);
    }
    const visible = isMobile() && syncAuthClasses();
    dock.style.setProperty('display', visible ? 'flex' : 'none', 'important');
    dock.style.setProperty('visibility', visible ? 'visible' : 'hidden', 'important');
    dock.style.setProperty('pointer-events', visible ? 'none' : 'none', 'important');
  }

  function refreshApp(ev){
    stop(ev);
    const btn = $('btnSoftRefresh');
    if(btn && !btn.disabled){ try{ btn.click(); return false; }catch(_){ } }
    const fn = getFn('softRefresh') || window.ControlEventApp?.actions?.softRefresh;
    if(typeof fn === 'function'){ try{ fn(); return false; }catch(_){ } }
    try{ location.reload(); }catch(_){ }
    return false;
  }
  function logoutApp(ev){
    stop(ev);
    const fn = getFn('doLogout') || window.doLogout || window.ControlEventApp?.actions?.doLogout;
    if(typeof fn === 'function'){
      try{ fn(ev); }catch(_){ }
    }else{
      const btn = $('btnLogout');
      if(btn){ try{ btn.click(); }catch(_){ } }
    }
    setTimeout(() => { syncAuthClasses(); ensureMobileDock(); }, 120);
    return false;
  }

  function installDockHandlers(){
    if(window.__ceV5014DockHandlers) return;
    window.__ceV5014DockHandlers = true;
    ['click','touchend','pointerup'].forEach(type => {
      document.addEventListener(type, ev => {
        if(ev.target?.closest?.('#ceBtnRefresV514')) return refreshApp(ev);
        if(ev.target?.closest?.('#ceBtnSalirV514')) return logoutApp(ev);
      }, {capture:true, passive:false});
    });
  }

  function closeBudgetTooltip(ev){
    if(ev) stop(ev);
    const box = $(BUDGET_TIP_ID);
    if(box){
      box.classList.remove('open');
      box.setAttribute('aria-hidden','true');
    }
    return false;
  }
  function installBudgetGuard(){
    if(window.__ceV5014BudgetGuard) return;
    window.__ceV5014BudgetGuard = true;
    ['click','touchend','pointerup'].forEach(type => {
      window.addEventListener(type, ev => {
        const target = ev.target;
        if(!target) return;
        // Solo abrir justificante si se toca expresamente la miniatura Just. ya creada por v46.9.
        const thumb = target.closest?.(`#${BUDGET_TIP_ID} .ce-v465-tip-thumb`);
        if(thumb){
          const box = $(BUDGET_TIP_ID);
          const openedAt = Number(box?.dataset?.ceBudgetOpenedAt || 0);
          // En iPhone/iPad el mismo toque que abre el globo puede caer sobre la primera miniatura.
          // Bloqueamos solo esa pulsacion sintetica inicial; despues la miniatura abre normal.
          if(openedAt && Date.now() - openedAt < 700) return stop(ev);
          const id = thumb.dataset.id || '';
          const api = window.ControlEventV469 || window.ControlEventV467 || window.ControlEventV465;
          if(id && api && typeof api.showReceiptModal === 'function'){
            return api.showReceiptModal(id, ev);
          }
          return undefined;
        }
        const close = target.closest?.(`#${BUDGET_TIP_ID} .ce-budget-lite-close`);
        if(close) return closeBudgetTooltip(ev);
        const box = $(BUDGET_TIP_ID);
        if(box && box.classList.contains('open')){
          if(box.contains(target)) return;
          if(target.closest?.('#budgetLayout .ce-v306-budget-lite-row,#budgetLayout .budget-subrow,#budgetLayout .budget-row')) return;
          return closeBudgetTooltip(ev);
        }
      }, {capture:true, passive:false});
    });
  }

  function clearProductBoldStorage(){
    PRODUCT_BOLD_KEYS.forEach(k => safe(() => localStorage.removeItem(k), null));
    const s = getLexical('state') || window.state || window.ControlEventApp?.state || {};
    if(Array.isArray(s.productos)) s.productos.forEach(p => { if(p){ delete p.__ceModified; delete p._ceModified; delete p.modified; delete p.modificado; } });
  }
  function normalizeProductVisuals(){
    clearProductBoldStorage();
    const root = $('productosList');
    if(!root) return;
    root.querySelectorAll(PRODUCT_BOLD_CLASSES.map(c => '.' + c).join(',')).forEach(el => PRODUCT_BOLD_CLASSES.forEach(c => el.classList.remove(c)));
    root.querySelectorAll('[style*="font-weight"]').forEach(el => safe(() => el.style.removeProperty('font-weight'), null));
  }

  function patchProductBoldApi(){
    try{ if(window.ControlEventV469) window.ControlEventV469.applyProductBold = function(){}; }catch(_){ }
    try{ if(window.ControlEventV468) window.ControlEventV468.applyProductBold = function(){}; }catch(_){ }
  }

  function patchRenderers(){
    ['render','renderProductos','renderMaintenance','renderMantenimiento','renderBudget'].forEach(name => {
      const old = getFn(name);
      if(typeof old !== 'function' || old.__ceV5014Wrapped) return;
      const wrapped = function(){
        const ret = old.apply(this, arguments);
        [40,180,420].forEach(ms => setTimeout(() => { clearV5013EventChoiceState(); applyVersion(); syncAuthClasses(); ensureMobileDock(); patchProductBoldApi(); normalizeProductVisuals(); }, ms));
        return ret;
      };
      wrapped.__ceV5014Wrapped = true;
      try{ Function('fn', name + ' = fn;')(wrapped); }catch(_){ }
      window[name] = wrapped;
    });
  }

  function install(){
    injectStyle();
    clearV5013EventChoiceState();
    applyVersion();
    syncAuthClasses();
    ensureMobileDock();
    installDockHandlers();
    installBudgetGuard();
    patchProductBoldApi();
    normalizeProductVisuals();
    patchRenderers();
  }

  window.addEventListener('click', ev => {
    if(ev.target?.closest?.('#btnLogin')) [160,500,1000,1800].forEach(ms => setTimeout(() => { clearV5013EventChoiceState(); applyVersion(); syncAuthClasses(); ensureMobileDock(); }, ms));
    if(ev.target?.closest?.('button[data-action="save-producto"]')) [20,140,360,800].forEach(ms => setTimeout(normalizeProductVisuals, ms));
  }, {capture:true, passive:false});
  window.addEventListener('touchend', ev => {
    if(ev.target?.closest?.('button[data-action="save-producto"]')) [40,220,600].forEach(ms => setTimeout(normalizeProductVisuals, ms));
  }, {capture:true, passive:false});
  ['resize','orientationchange'].forEach(evt => window.addEventListener(evt, () => setTimeout(() => { syncAuthClasses(); ensureMobileDock(); }, 80), true));
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted','controlevent:modules-ready'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 30)));
  [0,120,420,1000,2000,3500].forEach(ms => setTimeout(install, ms));

  window.ControlEventV5014 = {version:VERSION, versionFile:VERSION_FILE, install, applyVersion, ensureMobileDock, normalizeProductVisuals};
})();
