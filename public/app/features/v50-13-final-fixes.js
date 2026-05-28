/* ControlEvent v50.13 - correccion puntual sobre la version anterior.
   - No toca los justificantes del listado de INGRESOS, que ya funcionan en iPad/moviles.
   - RESUMEN PRESUPUESTARIO: vuelve a usar columna final "Just." y refuerza ampliar/cerrar en tactil.
   - Dock movil independiente Salir / Refres abajo derecha, pegado al margen.
   - PRODUCTOS: elimina negrita/parpadeo sin observadores permanentes.
   - Login: obliga a elegir evento tras entrar, sin restaurar automaticamente el ultimo.
   - Version: ControlEvent v50.13.
*/
(function(){
  'use strict';

  const VERSION = 'ControlEvent v50.13';
  const VERSION_FILE = 'ControlEvent_v50_13';
  const INSTALLED = '__ceV5013FinalFixes';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const DOCK_ID = 'ceMobileActionDockV513';
  const BUDGET_TIP_ID = 'ceBudgetLiteTooltipV307';
  const FORCE_PICK_KEY = 'ce_v5013_require_event_choice';
  const USER_PICKED_KEY = 'ce_v5013_user_picked_event';
  const SELECT_KEYS = [
    'controlevent_v229_selected_event_id',
    'controlevent_v44_event_chosen_after_login',
    'ControlEvent_v25_event_chosen',
    'ce_v250_event_chosen',
    'ce_event_chosen'
  ];
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
  const st = () => getLexical('state') || window.state || window.ControlEventApp?.state || {};
  const auth = () => getLexical('authUser') || window.authUser || window.ControlEventApp?.authUser || window.__CONTROL_EVENT_USER__ || null;
  const authenticated = () => !!auth() || safe(() => {
    const ov = $('authOverlay');
    if(!ov) return false;
    const cs = getComputedStyle(ov);
    return ov.classList.contains('hidden') || cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity || 1) === 0;
  }, false);
  const isMobile = () => safe(() => window.matchMedia('(max-width: 900px)').matches, window.innerWidth <= 900);
  const events = () => Array.isArray(st().eventos) ? st().eventos : [];
  const hasValidEvent = id => {
    const sid = String(id == null ? (st().selectedEventId || '') : id || '');
    return !!sid && events().some(e => String(e.id || '') === sid);
  };

  function injectStyle(){
    if($('ceV5013FinalStyle')) return;
    const style = document.createElement('style');
    style.id = 'ceV5013FinalStyle';
    style.textContent = `
      #${DOCK_ID}{display:none;}
      @media(max-width:900px){
        body.ce-v5013-authenticated #${DOCK_ID}{display:flex!important;position:fixed!important;right:calc(env(safe-area-inset-right,0px) + 2px)!important;bottom:calc(env(safe-area-inset-bottom,0px) + 3px)!important;left:auto!important;top:auto!important;z-index:120000!important;flex-direction:column!important;gap:3px!important;align-items:flex-end!important;justify-content:flex-end!important;opacity:.46!important;pointer-events:none!important;}
        body.ce-v5013-authenticated #${DOCK_ID}:active,body.ce-v5013-authenticated #${DOCK_ID}:focus-within{opacity:.96!important;}
        body.ce-v5013-authenticated #${DOCK_ID} button{pointer-events:auto!important;touch-action:manipulation!important;appearance:none!important;-webkit-appearance:none!important;width:54px!important;min-width:54px!important;height:27px!important;min-height:27px!important;border-radius:999px!important;border:1px solid rgba(15,23,42,.18)!important;background:rgba(255,255,255,.68)!important;color:#111827!important;box-shadow:0 4px 12px rgba(15,23,42,.14)!important;font-size:10px!important;font-weight:900!important;line-height:1!important;margin:0!important;padding:0 5px!important;backdrop-filter:blur(5px)!important;-webkit-backdrop-filter:blur(5px)!important;}
      }
      body:not(.ce-v5013-authenticated) #${DOCK_ID},body.ce-v5013-logged-out #${DOCK_ID}{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      #${BUDGET_TIP_ID}.open{pointer-events:auto!important;z-index:4100!important;}
      #${BUDGET_TIP_ID} .ce-budget-lite-close{position:sticky!important;top:0!important;float:right!important;z-index:10!important;min-width:38px!important;min-height:38px!important;font-size:24px!important;line-height:1!important;touch-action:manipulation!important;}
      #${BUDGET_TIP_ID} .ce-budget-lite-table-wrap{overflow:auto!important;-webkit-overflow-scrolling:touch!important;max-width:100%!important;}
      #${BUDGET_TIP_ID} .ce-budget-lite-table th:last-child,#${BUDGET_TIP_ID} .ce-budget-lite-table td:last-child{text-align:center!important;}
      #productosList .ce-v468-modified-product,#productosList .ce-v468-modified-product *,
      #productosList .ce-v500-product-modified,#productosList .ce-v500-product-modified *,
      #productosList .ce-v501-product-modified,#productosList .ce-v501-product-modified *,
      #productosList .ce-v502-product-modified,#productosList .ce-v502-product-modified *,
      #productosList .ce-v46-modified,#productosList .ce-v46-modified *,
      #productosList .ce-v464-modified,#productosList .ce-v464-modified *{font-weight:400!important;animation:none!important;transition:none!important;filter:none!important;}
      #productosList .rowline,#productosList .itemcard,#productosList .card{animation:none!important;transition:none!important;filter:none!important;}
      #productosList button.modify,#productosList button[data-action="save-producto"]{font-weight:800!important;}
      body.ce-v5013-force-event-choice #tabIngresos,body.ce-v5013-force-event-choice #tabDonaciones,body.ce-v5013-force-event-choice #tabCompras,body.ce-v5013-force-event-choice #tabMapaProductos,body.ce-v5013-force-event-choice #tabPlanificacionInicial,body.ce-v5013-force-event-choice #tabResumen,body.ce-v5013-force-event-choice #tabGraficas{display:none!important;}
      body.ce-v5013-force-event-choice #noEventMessage{display:block!important;}
    `;
    document.head.appendChild(style);
  }

  function applyVersion(){
    try{
      document.title = VERSION;
      document.documentElement.dataset.ceVersion = VERSION;
      document.body.dataset.ceVersion = VERSION;
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

  function syncAuthClasses(){
    const ok = authenticated();
    document.body.classList.toggle('ce-v5013-authenticated', ok);
    document.body.classList.toggle('ce-v5013-logged-out', !ok);
  }

  function ensureMobileDock(){
    injectStyle();
    syncAuthClasses();
    let dock = $(DOCK_ID);
    if(!dock){
      dock = document.createElement('div');
      dock.id = DOCK_ID;
      dock.setAttribute('aria-label','Acciones rápidas');
      dock.innerHTML = '<button type="button" id="ceBtnRefresV513" aria-label="Refrescar">Refres</button><button type="button" id="ceBtnSalirV513" aria-label="Salir">Salir</button>';
      document.body.appendChild(dock);
    }
    const visible = isMobile() && authenticated();
    dock.style.setProperty('display', visible ? 'flex' : 'none', 'important');
    dock.style.setProperty('visibility', visible ? 'visible' : 'hidden', 'important');
  }

  function hardRefresh(ev){
    stop(ev);
    const btn = $('btnSoftRefresh');
    if(btn && !btn.disabled){ try{ btn.click(); return false; }catch(_){ } }
    const fn = getFn('softRefresh') || window.ControlEventApp?.actions?.softRefresh;
    if(typeof fn === 'function'){ try{ fn(); return false; }catch(_){ } }
    try{ location.reload(); }catch(_){ }
    return false;
  }
  function hardLogout(ev){
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
    if(window.__ceV5013DockHandlers) return;
    window.__ceV5013DockHandlers = true;
    document.addEventListener('click', ev => {
      if(ev.target?.closest?.('#ceBtnRefresV513')) return hardRefresh(ev);
      if(ev.target?.closest?.('#ceBtnSalirV513')) return hardLogout(ev);
    }, {capture:true, passive:false});
    document.addEventListener('touchend', ev => {
      if(ev.target?.closest?.('#ceBtnRefresV513')) return hardRefresh(ev);
      if(ev.target?.closest?.('#ceBtnSalirV513')) return hardLogout(ev);
    }, {capture:true, passive:false});
  }

  function closeBudgetTooltip(ev){
    if(ev) stop(ev);
    const box = $(BUDGET_TIP_ID);
    if(!box) return false;
    box.classList.remove('open');
    box.setAttribute('aria-hidden','true');
    return false;
  }

  function openBudgetReceipt(btn, ev){
    const id = btn?.dataset?.id || '';
    if(!id) return undefined;
    stop(ev);
    const modalApi = window.ControlEventV469 || window.ControlEventV467 || window.ControlEventV465;
    if(modalApi && typeof modalApi.showReceiptModal === 'function'){
      try{ modalApi.showReceiptModal(id, ev); return false; }catch(_){ }
    }
    // Respaldo mínimo: si por cualquier motivo el API anterior no está disponible, al menos no bloquear el globo.
    const img = btn.querySelector('img');
    if(img?.src){
      const ov = document.createElement('div');
      ov.className = 'ce-v465-modal';
      ov.setAttribute('data-ce-preserve-tooltip','1');
      ov.innerHTML = `<div class="ce-v465-modal-card" role="dialog" aria-modal="true"><div class="ce-v465-modal-head"><span>Justificante de ingreso</span><button type="button" class="outline small" data-close="1">Cerrar</button></div><img class="ce-v465-modal-img" alt="Justificante de ingreso" src="${img.src}"></div>`;
      document.body.appendChild(ov);
      ov.addEventListener('click', e => { if(e.target === ov || e.target?.closest?.('[data-close]')){ stop(e); ov.remove(); } }, true);
    }
    return false;
  }

  function handleBudgetTouch(ev){
    const target = ev.target;
    if(!target) return undefined;
    const modal = target.closest?.('.ce-v465-modal,[data-ce-preserve-tooltip]');
    if(modal) return undefined;
    const close = target.closest?.(`#${BUDGET_TIP_ID} .ce-budget-lite-close`);
    if(close) return closeBudgetTooltip(ev);
    const thumb = target.closest?.(`#${BUDGET_TIP_ID} .ce-v465-tip-thumb`);
    if(thumb) return openBudgetReceipt(thumb, ev);
    const box = $(BUDGET_TIP_ID);
    if(box && box.classList.contains('open')){
      if(box.contains(target)) return undefined;
      if(target.closest?.('#budgetLayout .ce-v306-budget-lite-row,#budgetLayout .budget-subrow,#budgetLayout .budget-row')) return undefined;
      return closeBudgetTooltip(ev);
    }
    return undefined;
  }

  function installBudgetHandlers(){
    if(window.__ceV5013BudgetHandlers) return;
    window.__ceV5013BudgetHandlers = true;
    ['click','touchend','pointerup'].forEach(type => {
      window.addEventListener(type, ev => handleBudgetTouch(ev), {capture:true, passive:false});
    });
  }

  function disableV512ProductObserver(){
    const root = $('productosList');
    if(!root) return;
    try{ root.__ceV512MutationObserver?.disconnect?.(); }catch(_){ }
    try{ root.__ceV512MutationObserver = null; root.__ceV512Observer = false; }catch(_){ }
  }
  function clearProductBoldStorage(){
    PRODUCT_BOLD_KEYS.forEach(k => safe(() => localStorage.removeItem(k), null));
    const s = st();
    if(Array.isArray(s.productos)) s.productos.forEach(p => { if(p){ delete p.__ceModified; delete p._ceModified; delete p.modified; delete p.modificado; } });
  }
  function normalizeProductVisuals(){
    disableV512ProductObserver();
    clearProductBoldStorage();
    const root = $('productosList');
    if(!root) return;
    root.querySelectorAll(PRODUCT_BOLD_CLASSES.map(c => '.' + c).join(',')).forEach(el => PRODUCT_BOLD_CLASSES.forEach(c => el.classList.remove(c)));
    root.querySelectorAll('[style*="font-weight"]').forEach(el => safe(() => el.style.removeProperty('font-weight'), null));
  }

  function markRequireEventChoice(){
    safe(() => sessionStorage.setItem(FORCE_PICK_KEY, '1'), null);
    safe(() => sessionStorage.removeItem(USER_PICKED_KEY), null);
    SELECT_KEYS.forEach(k => { safe(() => sessionStorage.removeItem(k), null); safe(() => localStorage.removeItem(k), null); });
  }
  function releaseRequireEventChoice(){
    safe(() => sessionStorage.removeItem(FORCE_PICK_KEY), null);
    safe(() => sessionStorage.setItem(USER_PICKED_KEY, '1'), null);
    document.body.classList.remove('ce-v5013-force-event-choice');
  }
  function isForceEventChoice(){ return safe(() => sessionStorage.getItem(FORCE_PICK_KEY) === '1' && sessionStorage.getItem(USER_PICKED_KEY) !== '1', false); }
  function ensureEventPlaceholder(){
    const sel = $('selectedEvent');
    if(!sel) return;
    let opt = sel.querySelector('option[value=""]');
    if(!opt){
      opt = document.createElement('option');
      opt.value = '';
      sel.insertBefore(opt, sel.firstChild);
    }
    opt.textContent = events().length ? 'Selecciona evento...' : 'Cargando eventos...';
    sel.value = '';
  }
  function forceEventChoice(reason){
    if(!authenticated() || !isForceEventChoice()) return;
    const s = st();
    if(s) s.selectedEventId = '';
    ensureEventPlaceholder();
    document.body.classList.add('ce-v5013-force-event-choice');
    const msg = $('noEventMessage');
    if(msg){
      msg.classList.remove('hidden');
      if(!msg.querySelector('.ce-v5013-welcome')){
        msg.innerHTML = '<div class="ce-v5013-welcome"><h2>Selecciona un evento para trabajar</h2><p>Elige el evento en el desplegable superior.</p></div>';
      }
    }
    try{ window.ControlEventV447?.render?.({force:true, delay:0, reason:reason || 'v50.13-login-event-choice'}); }catch(_){ }
  }
  function scheduleForceEventChoice(){ [80,220,520,1000,1700,2600].forEach(ms => setTimeout(() => forceEventChoice('login'), ms)); }

  function installEventChoiceHandlers(){
    if(window.__ceV5013EventChoiceHandlers) return;
    window.__ceV5013EventChoiceHandlers = true;
    window.addEventListener('click', ev => { if(ev.target?.closest?.('#btnLogin')){ markRequireEventChoice(); scheduleForceEventChoice(); } }, {capture:true, passive:false});
    window.addEventListener('keydown', ev => {
      const id = ev.target?.id || '';
      if(ev.key === 'Enter' && (id === 'loginIdentificacion' || id === 'loginClave')){ markRequireEventChoice(); scheduleForceEventChoice(); }
    }, {capture:true, passive:false});
    window.addEventListener('change', ev => {
      const sel = ev.target?.closest?.('#selectedEvent');
      if(!sel) return;
      if(String(sel.value || '')) releaseRequireEventChoice();
    }, {capture:true, passive:false});
    window.addEventListener('click', ev => {
      if(ev.target?.closest?.('#btnLogout')){ safe(() => sessionStorage.removeItem(FORCE_PICK_KEY), null); safe(() => sessionStorage.removeItem(USER_PICKED_KEY), null); document.body.classList.remove('ce-v5013-force-event-choice'); }
    }, {capture:true, passive:false});
  }

  function patchRenderers(){
    ['render','renderProductos','renderMaintenance','renderMantenimiento','renderBudget'].forEach(name => {
      const old = getFn(name);
      if(typeof old !== 'function' || old.__ceV5013Wrapped) return;
      const wrapped = function(){
        const ret = old.apply(this, arguments);
        [30,180].forEach(ms => setTimeout(() => { applyVersion(); syncAuthClasses(); ensureMobileDock(); normalizeProductVisuals(); if(isForceEventChoice()) forceEventChoice('render'); }, ms));
        return ret;
      };
      wrapped.__ceV5013Wrapped = true;
      try{ Function('fn', name + ' = fn;')(wrapped); }catch(_){ }
      window[name] = wrapped;
    });
  }


  function patchEventSelectionFunctions(){
    const oldChange = getFn('changeSelectedEvent') || window.changeSelectedEvent;
    if(typeof oldChange === 'function' && !oldChange.__ceV5013ReleaseChoice){
      const wrapped = function(value){
        if(String(value || '')) releaseRequireEventChoice();
        return oldChange.apply(this, arguments);
      };
      wrapped.__ceV5013ReleaseChoice = true;
      try{ Function('fn','changeSelectedEvent = fn;')(wrapped); }catch(_){ }
      window.changeSelectedEvent = wrapped;
      try{ if(window.ControlEventApp?.actions) window.ControlEventApp.actions.changeSelectedEvent = wrapped; }catch(_){ }
    }
    const api = window.ControlEventV447;
    if(api && typeof api.selectEvent === 'function' && !api.selectEvent.__ceV5013ReleaseChoice){
      const oldSelect = api.selectEvent.bind(api);
      api.selectEvent = function(value){
        if(String(value || '')) releaseRequireEventChoice();
        return oldSelect.apply(this, arguments);
      };
      api.selectEvent.__ceV5013ReleaseChoice = true;
    }
  }

  function install(){
    injectStyle();
    applyVersion();
    syncAuthClasses();
    ensureMobileDock();
    installDockHandlers();
    installBudgetHandlers();
    installEventChoiceHandlers();
    patchEventSelectionFunctions();
    disableV512ProductObserver();
    normalizeProductVisuals();
    patchRenderers();
    if(isForceEventChoice()) forceEventChoice('install');
  }

  window.addEventListener('click', ev => {
    if(ev.target?.closest?.('button[data-action="save-producto"]')) [20,160,420].forEach(ms => setTimeout(normalizeProductVisuals, ms));
    if(ev.target?.closest?.('#btnLogin')) [160,500,1000,1800].forEach(ms => setTimeout(() => { applyVersion(); syncAuthClasses(); ensureMobileDock(); }, ms));
  }, {capture:true, passive:false});
  window.addEventListener('touchend', ev => {
    if(ev.target?.closest?.('button[data-action="save-producto"]')) [30,220,600].forEach(ms => setTimeout(normalizeProductVisuals, ms));
  }, {capture:true, passive:false});
  ['resize','orientationchange'].forEach(evt => window.addEventListener(evt, () => setTimeout(() => { syncAuthClasses(); ensureMobileDock(); }, 80), true));
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted','controlevent:modules-ready'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 30)));
  [0,140,520,1200].forEach(ms => setTimeout(install, ms));

  window.ControlEventV5013 = {version:VERSION, versionFile:VERSION_FILE, install, applyVersion, ensureMobileDock, normalizeProductVisuals, forceEventChoice};
})();
