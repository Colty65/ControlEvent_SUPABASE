/* ControlEvent v50.14 - ajuste puntual sobre v50.14.
   - No toca el bloque de justificantes de INGRESOS, que queda funcionando en iPad/móvil.
   - Resumen Presupuestario: cierre táctil fiable de globos y ampliación de fotos anexas.
   - Móvil: vuelve a crear el dock inferior Salir / Refrescar fuera de cabecera y selector de evento.
   - Mantenimiento de PRODUCTOS: elimina la negrita/parpadeo visual al modificar, sin cambiar el guardado.
   - Versión: rótulo único v50.14.
*/
(function(){
  'use strict';

  const VERSION = 'ControlEvent v50.14';
  const VERSION_FILE = 'ControlEvent_v50_14';
  const INSTALLED = '__ceV5012FinalFixes';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const DOCK_ID = 'ceMobileActionDockV512';
  const OLD_DOCK_ID = 'ceMobileActionDockV508';
  const BUDGET_TIP_ID = 'ceBudgetLiteTooltipV307';
  const BUDGET_PHOTO_MODAL_ID = 'ceV512BudgetPhotoModal';
  const PRODUCT_BOLD_KEYS = [
    'ControlEvent_productos_modificados_v469',
    'ControlEvent_productos_modificados_v500',
    'ControlEvent_productos_modificados_v501',
    'ControlEvent_productos_modificados_v502'
  ];

  const $ = id => document.getElementById(id);
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const isMobile = () => safe(() => window.matchMedia('(max-width: 900px)').matches, window.innerWidth <= 900);

  function stop(ev){ try{ ev?.preventDefault?.(); ev?.stopPropagation?.(); ev?.stopImmediatePropagation?.(); }catch(_){ } return false; }
  function getLexical(name){ return safe(() => Function('return (typeof '+name+' !== "undefined") ? '+name+' : undefined;')(), undefined); }
  function getFn(name){ return safe(() => (typeof window[name] === 'function') ? window[name] : Function('return (typeof '+name+' === "function") ? '+name+' : null;')(), null); }
  function stateRef(){ return getLexical('state') || window.state || window.ControlEventApp?.state || {}; }
  function auth(){ return getLexical('authUser') || window.authUser || window.ControlEventApp?.authUser || window.__CONTROL_EVENT_USER__ || null; }
  function authenticated(){ return !!auth(); }

  function injectStyle(){
    if($('ceV5012FinalStyle')) return;
    const style = document.createElement('style');
    style.id = 'ceV5012FinalStyle';
    style.textContent = `
      body.ce-v5012-authenticated #authOverlay{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}
      body.ce-v5012-logged-out #${DOCK_ID},body.ce-v5012-logged-out #${OLD_DOCK_ID}{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      #${DOCK_ID}{display:none;}
      @media(max-width:900px){
        body.ce-v5012-authenticated #${DOCK_ID}{display:flex!important;position:fixed!important;right:calc(env(safe-area-inset-right,0px) + 8px)!important;bottom:calc(env(safe-area-inset-bottom,0px) + 10px)!important;left:auto!important;top:auto!important;z-index:2300!important;flex-direction:column!important;gap:5px!important;align-items:flex-end!important;justify-content:flex-end!important;opacity:.42!important;pointer-events:none!important;transition:opacity .12s ease!important;}
        body.ce-v5012-authenticated #${DOCK_ID}:active,body.ce-v5012-authenticated #${DOCK_ID}:focus-within{opacity:.96!important;}
        body.ce-v5012-authenticated #${DOCK_ID} #btnLogout:not(.hidden),body.ce-v5012-authenticated #${DOCK_ID} #btnSoftRefresh:not(.hidden){position:static!important;display:inline-flex!important;visibility:visible!important;top:auto!important;left:auto!important;right:auto!important;bottom:auto!important;transform:none!important;align-items:center!important;justify-content:center!important;height:30px!important;min-height:30px!important;min-width:55px!important;border-radius:999px!important;background:rgba(255,255,255,.66)!important;color:#111827!important;border:1px solid rgba(15,23,42,.18)!important;box-shadow:0 5px 14px rgba(15,23,42,.12)!important;font-size:10px!important;font-weight:900!important;line-height:1!important;pointer-events:auto!important;touch-action:manipulation!important;padding:0 8px!important;margin:0!important;backdrop-filter:blur(5px)!important;-webkit-backdrop-filter:blur(5px)!important;}
        body.ce-v5012-authenticated #${DOCK_ID} #btnSoftRefresh:not(.hidden){min-width:68px!important;}
      }
      #${BUDGET_TIP_ID}.open{pointer-events:auto!important;z-index:4100!important;}
      #${BUDGET_TIP_ID} .ce-budget-lite-close{position:sticky!important;top:0!important;float:right!important;z-index:2!important;min-width:34px!important;min-height:34px!important;font-size:22px!important;line-height:1!important;touch-action:manipulation!important;}
      #${BUDGET_TIP_ID} .ce-budget-lite-photo-btn{appearance:none!important;-webkit-appearance:none!important;width:38px!important;height:38px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border:1px solid #cbd5e1!important;border-radius:10px!important;background:#fff!important;padding:2px!important;margin:0!important;box-shadow:0 1px 3px rgba(15,23,42,.12)!important;cursor:pointer!important;touch-action:manipulation!important;}
      #${BUDGET_TIP_ID} .ce-budget-lite-photo-btn img{width:32px!important;height:32px!important;border-radius:8px!important;display:block!important;object-fit:cover!important;pointer-events:none!important;}
      #${BUDGET_TIP_ID} .ce-budget-lite-no-photo{color:#94a3b8!important;font-weight:700!important;}
      #${BUDGET_PHOTO_MODAL_ID}{position:fixed!important;inset:0!important;background:rgba(15,23,42,.78)!important;z-index:1000003!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:14px!important;}
      #${BUDGET_PHOTO_MODAL_ID} .ce-v512-budget-photo-card{width:min(980px,96vw)!important;max-height:94vh!important;background:#fff!important;color:#0f172a!important;border-radius:18px!important;box-shadow:0 26px 86px rgba(0,0,0,.44)!important;padding:12px!important;display:flex!important;flex-direction:column!important;gap:10px!important;overflow:auto!important;}
      #${BUDGET_PHOTO_MODAL_ID} .ce-v512-budget-photo-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;font-weight:900!important;}
      #${BUDGET_PHOTO_MODAL_ID} .ce-v512-budget-photo-head button{min-height:34px!important;touch-action:manipulation!important;}
      #${BUDGET_PHOTO_MODAL_ID} img{max-width:100%!important;max-height:78vh!important;object-fit:contain!important;border-radius:12px!important;background:#f8fafc!important;}
      #productosList .ce-v468-modified-product,#productosList .ce-v468-modified-product *,
      #productosList .ce-v500-product-modified,#productosList .ce-v500-product-modified *,
      #productosList .ce-v501-product-modified,#productosList .ce-v501-product-modified *,
      #productosList .ce-v502-product-modified,#productosList .ce-v502-product-modified *,
      #productosList .ce-v46-modified,#productosList .ce-v46-modified *,
      #productosList .ce-v464-modified,#productosList .ce-v464-modified *{font-weight:400!important;animation:none!important;transition:none!important;filter:none!important;}
      #productosList button.modify,#productosList button[data-action="save-producto"]{font-weight:800!important;}
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
        const text = el.textContent || '';
        if(/ControlEvent\s+v\d+(?:\.\d+)*/i.test(text)) el.textContent = text.replace(/ControlEvent\s+v\d+(?:\.\d+)*/ig, VERSION);
      });
    }catch(_){ }
  }

  function syncAuthClasses(){
    const ok = authenticated();
    document.body.classList.toggle('ce-v5012-authenticated', ok);
    document.body.classList.toggle('ce-v5012-logged-out', !ok);
    if(ok){
      const overlay = $('authOverlay');
      if(overlay){
        overlay.classList.add('hidden');
        overlay.setAttribute('aria-hidden','true');
        overlay.style.setProperty('display','none','important');
        overlay.style.setProperty('visibility','hidden','important');
        overlay.style.setProperty('opacity','0','important');
        overlay.style.setProperty('pointer-events','none','important');
      }
    }
  }

  function ensureMobileDock(){
    injectStyle();
    syncAuthClasses();
    const oldDock = $(OLD_DOCK_ID);
    if(oldDock){ oldDock.style.setProperty('display','none','important'); oldDock.style.setProperty('visibility','hidden','important'); }
    let dock = $(DOCK_ID);
    if(!dock){
      dock = document.createElement('div');
      dock.id = DOCK_ID;
      dock.setAttribute('aria-label','Acciones de sesión');
      document.body.appendChild(dock);
    }
    const logout = $('btnLogout');
    const refresh = $('btnSoftRefresh');
    [refresh, logout].forEach(btn => {
      if(!btn) return;
      if(!btn.__ceV512Home) btn.__ceV512Home = {parent: btn.parentNode, next: btn.nextSibling};
    });
    if(isMobile() && authenticated()){
      [refresh, logout].forEach(btn => {
        if(!btn) return;
        if(btn.parentNode !== dock) dock.appendChild(btn);
        btn.classList.remove('hidden');
        btn.removeAttribute('hidden');
        btn.disabled = false;
        btn.style.removeProperty('display');
        btn.style.removeProperty('visibility');
      });
      dock.style.removeProperty('display');
      dock.style.removeProperty('visibility');
    }else{
      [refresh, logout].forEach(btn => {
        if(!btn || !btn.__ceV512Home?.parent || btn.parentNode !== dock) return;
        try{ btn.__ceV512Home.parent.insertBefore(btn, btn.__ceV512Home.next || null); }catch(_){ try{ btn.__ceV512Home.parent.appendChild(btn); }catch(__){ } }
      });
      if(!authenticated()){
        dock.style.setProperty('display','none','important');
        dock.style.setProperty('visibility','hidden','important');
      }
    }
  }

  function closeBudgetTooltip(){
    const box = $(BUDGET_TIP_ID);
    if(!box) return false;
    box.classList.remove('open');
    box.setAttribute('aria-hidden','true');
    return true;
  }

  function showBudgetPhoto(btn, ev){
    stop(ev || window.event || {});
    const src = btn?.dataset?.src || btn?.querySelector?.('img')?.src || '';
    if(!src) return false;
    const name = btn?.dataset?.name || 'Justificante de ingreso';
    let modal = $(BUDGET_PHOTO_MODAL_ID);
    if(modal) modal.remove();
    modal = document.createElement('div');
    modal.id = BUDGET_PHOTO_MODAL_ID;
    modal.setAttribute('data-ce-preserve-tooltip','1');
    modal.innerHTML = `<div class="ce-v512-budget-photo-card" role="dialog" aria-modal="true"><div class="ce-v512-budget-photo-head"><span>${esc(name)}</span><button type="button" class="outline small" data-ce-v512-budget-photo-close="1">Cerrar</button></div><img src="${esc(src)}" alt="Justificante de ingreso" /></div>`;
    document.body.appendChild(modal);
    return false;
  }

  function closeBudgetPhoto(ev){
    const modal = $(BUDGET_PHOTO_MODAL_ID);
    if(!modal) return false;
    if(ev) stop(ev);
    modal.remove();
    return false;
  }

  function handleBudgetPointer(ev){
    const target = ev.target;
    if(!target) return undefined;
    const photoClose = target.closest?.('[data-ce-v512-budget-photo-close]');
    if(photoClose) return closeBudgetPhoto(ev);
    const modal = $(BUDGET_PHOTO_MODAL_ID);
    if(modal && target === modal) return closeBudgetPhoto(ev);
    const photoBtn = target.closest?.('[data-ce-v512-budget-photo]');
    if(photoBtn) return showBudgetPhoto(photoBtn, ev);
    const close = target.closest?.(`#${BUDGET_TIP_ID} .ce-budget-lite-close`);
    if(close){ stop(ev); closeBudgetTooltip(); return false; }
    const box = $(BUDGET_TIP_ID);
    if(box && box.classList.contains('open')){
      if(box.contains(target)) return undefined;
      if(target.closest?.('#budgetLayout .ce-v306-budget-lite-row,#budgetLayout .budget-subrow,#budgetLayout .budget-row')) return undefined;
      if(target.closest?.('[data-ce-preserve-tooltip],.ce-v465-modal')) return undefined;
      closeBudgetTooltip();
    }
    return undefined;
  }

  function clearProductBoldStorage(){
    PRODUCT_BOLD_KEYS.forEach(k => safe(() => localStorage.removeItem(k), null));
    try{
      const products = stateRef().productos;
      if(Array.isArray(products)) products.forEach(p => { if(p){ delete p.__ceModified; delete p._ceModified; delete p.modified; delete p.modificado; } });
    }catch(_){ }
  }
  function normalizeProductMaintenanceVisuals(){
    const root = $('productosList');
    if(!root) return;
    clearProductBoldStorage();
    const classes = ['ce-v468-modified-product','ce-v500-product-modified','ce-v501-product-modified','ce-v502-product-modified','ce-v46-modified','ce-v464-modified'];
    root.querySelectorAll(classes.map(c => '.' + c).join(',')).forEach(el => {
      classes.forEach(c => el.classList.remove(c));
    });
    root.querySelectorAll('[style*="font-weight"]').forEach(el => {
      try{ el.style.removeProperty('font-weight'); }catch(_){ }
    });
  }

  function installProductObserver(){
    const root = $('productosList');
    if(!root || root.__ceV512Observer) return;
    root.__ceV512Observer = true;
    let timer = 0;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(normalizeProductMaintenanceVisuals, 25);
    };
    try{
      const observer = new MutationObserver(schedule);
      observer.observe(root, {childList:true, subtree:true, attributes:true, attributeFilter:['class','style']});
      root.__ceV512MutationObserver = observer;
    }catch(_){ }
  }

  function patchRenderers(){
    ['render','renderProductos','renderMaintenance','renderMantenimiento'].forEach(name => {
      const old = getFn(name);
      if(typeof old !== 'function' || old.__ceV5012Wrapped) return;
      const wrapped = function(){
        const ret = old.apply(this, arguments);
        [40,180].forEach(ms => setTimeout(() => { applyVersion(); syncAuthClasses(); ensureMobileDock(); normalizeProductMaintenanceVisuals(); installProductObserver(); }, ms));
        return ret;
      };
      wrapped.__ceV5012Wrapped = true;
      try{ Function('fn', name + ' = fn;')(wrapped); }catch(_){ }
      window[name] = wrapped;
    });
  }

  function install(){
    injectStyle();
    applyVersion();
    syncAuthClasses();
    ensureMobileDock();
    normalizeProductMaintenanceVisuals();
    installProductObserver();
    patchRenderers();
  }

  ['click','pointerup','touchend'].forEach(type => {
    window.addEventListener(type, handleBudgetPointer, {capture:true, passive:false});
  });
  window.addEventListener('click', ev => {
    if(ev.target?.closest?.('#btnLogin')) [120,420,900].forEach(ms => setTimeout(() => { syncAuthClasses(); ensureMobileDock(); applyVersion(); }, ms));
    if(ev.target?.closest?.('#btnLogout')) setTimeout(() => { syncAuthClasses(); ensureMobileDock(); applyVersion(); }, 80);
    if(ev.target?.closest?.('button[data-action="save-producto"]')) [20,120,420,1000].forEach(ms => setTimeout(() => { normalizeProductMaintenanceVisuals(); applyVersion(); }, ms));
  }, {capture:true, passive:false});
  window.addEventListener('touchend', ev => {
    if(ev.target?.closest?.('#btnLogin')) [160,520,900].forEach(ms => setTimeout(() => { syncAuthClasses(); ensureMobileDock(); applyVersion(); }, ms));
    if(ev.target?.closest?.('button[data-action="save-producto"]')) [20,160,520].forEach(ms => setTimeout(normalizeProductMaintenanceVisuals, ms));
  }, {capture:true, passive:false});
  ['resize','orientationchange'].forEach(evt => window.addEventListener(evt, () => setTimeout(ensureMobileDock, 80), true));
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted','controlevent:modules-ready'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 20)));
  [0,120,500,1200].forEach(ms => setTimeout(install, ms));

  window.ControlEventV5012 = {version:VERSION, versionFile:VERSION_FILE, install, applyVersion, ensureMobileDock, closeBudgetTooltip, normalizeProductMaintenanceVisuals};
})();
