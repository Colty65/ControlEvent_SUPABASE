/* ControlEvent v1.0.1/pr - recuperacion estable sobre v50.4.
   Objetivo: NO sustituir los visores que ya funcionaban.
   - Retira de la carga efectiva los visores interceptores v50.5/v50.6 desde index.html.
   - Mantiene salida limpia sin reentrada automatica.
   - Mantiene menu RO estable.
   - Botones Salir/Refrescar visibles en movil sin tapar cabecera: dock flotante pequeno y semitransparente.
   - Respeta los visores originales de justificantes y tickets, con texto asociado.
   - Al cerrar una foto, conserva/restaura el globo de origen en la misma posicion.
*/
(function(){
  'use strict';

  const VERSION = 'ControlEvent v1.0.1/pr';
  const VERSION_FILE = 'ControlEvent_v1_0_1_pr';
  const INSTALLED = '__ceV507FinalFixes';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const SESSION_KEY = 'ControlEvent_v50_24_session';
  const LOGOUT_KEY = 'ControlEvent_v50_24_logout_at';
  const TABS = ['ingresos','donaciones','compras','mapa','planificacion','resumen','graficas'];
  const PANEL = {ingresos:'tabIngresos',donaciones:'tabDonaciones',compras:'tabCompras',mapa:'tabMapaProductos',planificacion:'tabPlanificacionInicial',resumen:'tabResumen',graficas:'tabGraficas'};
  const BTN = {ingresos:'tabIngresosBtn',donaciones:'tabDonacionesBtn',compras:'tabComprasBtn',mapa:'tabMapaBtn',planificacion:'tabPlanificacionBtn',resumen:'tabResumenBtn',graficas:'tabGraficasBtn'};
  const TAB_BY_BTN = Object.entries(BTN).reduce((acc,[tab,id]) => (acc[id]=tab, acc), {});

  const $ = id => document.getElementById(id);
  const safe = (fn, fallback) => { try{ const v = fn(); return v === undefined ? fallback : v; }catch(_){ return fallback; } };
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();

  function stop(ev){
    try{ ev?.preventDefault?.(); ev?.stopPropagation?.(); ev?.stopImmediatePropagation?.(); }catch(_){ }
    return false;
  }
  function getFn(name){
    return safe(() => (typeof window[name] === 'function') ? window[name] : Function('return (typeof '+name+' === "function") ? '+name+' : null')(), null);
  }
  function setLexical(name, expr){ try{ Function(name + ' = ' + expr)(); }catch(_){ } }
  function auth(){
    return safe(() => (typeof authUser !== 'undefined' && authUser) ? authUser : null, null)
      || window.authUser
      || window.ControlEventApp?.authUser
      || window.__CONTROL_EVENT_USER__
      || null;
  }
  function role(){ return up(auth()?.nivel || ''); }
  function isGD(){ return role() === 'GD'; }
  function isRO(){ return role() === 'RO'; }
  function hasStoredSession(){
    const raw = safe(() => localStorage.getItem(SESSION_KEY), '');
    if(!raw) return false;
    const obj = safe(() => JSON.parse(raw), null);
    return !!(obj && typeof obj === 'object' && (obj.identificacion || obj.nombre || obj.nivel));
  }
  function explicitLogoutActive(){
    const t = Number(safe(() => sessionStorage.getItem(LOGOUT_KEY), 0) || 0);
    return t > 0 && (Date.now() - t) < 12 * 60 * 60 * 1000;
  }
  function markExplicitLogout(){ safe(() => sessionStorage.setItem(LOGOUT_KEY, String(Date.now())), null); }
  function clearExplicitLogout(){ safe(() => sessionStorage.removeItem(LOGOUT_KEY), null); }
  function authenticated(){ return !!auth() || (!explicitLogoutActive() && hasStoredSession()); }

  function currentTab(){
    const lexical = safe(() => (typeof currentMainTab !== 'undefined' ? String(currentMainTab || '') : ''), '');
    if(TABS.includes(lexical)) return lexical;
    const appTab = String(window.ControlEventApp?.navigation?.currentMainTab || window.__ceCurrentMainTab || '');
    if(TABS.includes(appTab)) return appTab;
    const visible = TABS.find(tab => {
      const p = $(PANEL[tab]);
      return p && !p.classList.contains('hidden') && safe(() => getComputedStyle(p).display !== 'none', true);
    });
    return visible || (isRO() ? 'resumen' : 'ingresos');
  }
  function roleAllows(tab){
    if(!authenticated()) return false;
    const t = String(tab || '');
    if(isRO()) return ['resumen','mapa','graficas'].includes(t);
    if(t === 'planificacion') return isGD();
    return TABS.includes(t);
  }
  function defaultTab(prefer){ const p = String(prefer || ''); return roleAllows(p) ? p : (isRO() ? 'resumen' : 'ingresos'); }
  function setCurrentTab(tab){
    const next = defaultTab(tab || currentTab());
    try{ currentMainTab = next; }catch(_){ }
    try{ if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab = next; }catch(_){ }
    window.__ceCurrentMainTab = next;
    return next;
  }

  function injectStyle(){
    if($('ceV507FinalStyle')) return;
    const style = document.createElement('style');
    style.id = 'ceV507FinalStyle';
    style.textContent = `
      body.ce-authenticated-v507 #authOverlay{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}
      body.ce-logged-out-v507 #authOverlay{display:flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;z-index:200000!important;}
      .ce-v507-hidden-role{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      body.ce-role-ro-v507 #tabIngresosBtn,body.ce-role-ro-v507 #tabDonacionesBtn,body.ce-role-ro-v507 #tabComprasBtn,body.ce-role-ro-v507 #tabPlanificacionBtn{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      body.ce-role-ro-v507 #btnExportExcel,body.ce-role-ro-v507 #btnOpenImport,body.ce-role-ro-v507 #btnExportSeed,body.ce-role-ro-v507 #btnToggleMaintenance{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      body.ce-role-ro-v507 #mainTabs.tabs{display:grid!important;grid-template-columns:repeat(3,48px)!important;justify-content:center!important;justify-items:center!important;gap:10px!important;overflow:visible!important;transition:none!important;animation:none!important;}
      body.ce-role-ro-v507 #tabResumenBtn{order:1!important;}body.ce-role-ro-v507 #tabMapaBtn{order:2!important;}body.ce-role-ro-v507 #tabGraficasBtn{order:3!important;}
      body.ce-role-ro-v507 #mainTabs .tab,body.ce-role-ro-v507 #mainTabs .tab *{transition:none!important;animation:none!important;}
      body.ce-role-ro-v507 .mobile-menu-action[data-target="tabIngresosBtn"],body.ce-role-ro-v507 .mobile-menu-action[data-target="tabDonacionesBtn"],body.ce-role-ro-v507 .mobile-menu-action[data-target="tabComprasBtn"],body.ce-role-ro-v507 .mobile-menu-action[data-target="tabPlanificacionBtn"],body.ce-role-ro-v507 .mobile-menu-action[data-target="btnExportExcel"],body.ce-role-ro-v507 .mobile-menu-action[data-target="btnOpenImport"],body.ce-role-ro-v507 .mobile-menu-action[data-target="btnExportSeed"],body.ce-role-ro-v507 .mobile-menu-action[data-target="btnToggleMaintenance"]{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      #ceTooltipV21 .ce-v507-tooltip-header-row td,#ceBudgetLiteTooltipV307 .ce-v507-tooltip-header-row th,#ceBudgetLiteTooltipV307 .ce-v507-tooltip-header-row td,.ce-v507-tooltip-header-row td,.ce-v507-tooltip-header-row th{font-weight:950!important;background:rgba(15,23,42,.08)!important;}
      #ceV505PhotoModal,#ceV506PhotoModal{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      #ceV504ReceiptModal.ce-v504-modal{display:flex!important;visibility:visible!important;pointer-events:auto!important;z-index:1000001!important;}
      #ceV504ReceiptModal .ce-v504-modal-card{overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important;}
      #ceTicketModalV234.visible,#ceTicketImageModalV225.visible,.ce-ticket-modal-v234.visible,.ce-ticket-modal-v225.visible{display:flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;z-index:1000001!important;}
      #ceTicketModalV234 .ce-ticket-modal-v234-info,.ce-ticket-modal-v234 .ce-ticket-modal-v234-info{max-height:34vh!important;overflow:auto!important;-webkit-overflow-scrolling:touch!important;}
      @media(max-width:900px){
        body .appname .user-actions{display:flex!important;position:fixed!important;top:auto!important;left:calc(env(safe-area-inset-left,0px) + 6px)!important;right:auto!important;bottom:calc(env(safe-area-inset-bottom,0px) + 84px)!important;z-index:9600!important;flex-direction:column!important;gap:4px!important;align-items:flex-start!important;justify-content:flex-end!important;margin:0!important;padding:0!important;height:auto!important;min-height:0!important;pointer-events:none!important;opacity:.34!important;transition:opacity .15s ease!important;}
        body .appname .user-actions:hover,body .appname .user-actions:focus-within,body .appname .user-actions:active{opacity:.92!important;}
        body #btnLogout:not(.hidden),body #btnSoftRefresh:not(.hidden){position:static!important;display:inline-flex!important;visibility:visible!important;align-items:center!important;justify-content:center!important;height:29px!important;min-height:29px!important;min-width:50px!important;border-radius:11px!important;background:rgba(255,255,255,.46)!important;color:#111827!important;border:1px solid rgba(15,23,42,.14)!important;box-shadow:0 5px 14px rgba(15,23,42,.10)!important;font-size:10px!important;font-weight:950!important;line-height:1!important;pointer-events:auto!important;touch-action:manipulation!important;padding:0 7px!important;margin:0!important;backdrop-filter:blur(4px)!important;-webkit-backdrop-filter:blur(4px)!important;}
        body #btnSoftRefresh:not(.hidden){min-width:64px!important;}
      }
      @media(max-width:420px){body .appname .user-actions{bottom:calc(env(safe-area-inset-bottom,0px) + 78px)!important;left:calc(env(safe-area-inset-left,0px) + 4px)!important;opacity:.28!important;}}
    `;
    document.head.appendChild(style);
  }

  function applyVersion(){
    try{
      document.title = VERSION;
      document.body.dataset.ceVersion = VERSION;
      window.__ceVersion = VERSION;
      window.VERSION = VERSION;
      window.VERSION_FILE = VERSION_FILE;
      window.ControlEventVersion = {version: VERSION, versionFile: VERSION_FILE};
      document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => {
        const text = el.textContent || '';
        if(/ControlEvent\s+v\d+(?:\.\d+)*/i.test(text)) el.textContent = text.replace(/ControlEvent\s+v\d+(?:\.\d+)*/ig, VERSION);
      });
    }catch(_){ }
  }

  function setVisible(el, visible){
    if(!el) return;
    if(visible){
      el.classList.remove('hidden','hidden-by-role-v228','ce-v452-hidden-role','ce-v502-hidden-role','ce-v504-hidden-role','ce-v505-hidden-role','ce-v507-hidden-role');
      el.removeAttribute('hidden'); el.removeAttribute('aria-hidden'); el.removeAttribute('aria-disabled');
      if('disabled' in el) el.disabled = false;
      el.style.removeProperty('display'); el.style.removeProperty('visibility'); el.style.removeProperty('opacity'); el.style.removeProperty('pointer-events');
    }else{
      el.classList.add('hidden','ce-v507-hidden-role');
      el.setAttribute('aria-hidden','true'); el.setAttribute('aria-disabled','true');
      if('disabled' in el) el.disabled = true;
      el.style.setProperty('display','none','important');
    }
  }
  function stabilizeRoleMenu(){
    injectStyle();
    const ok = authenticated();
    document.body.classList.toggle('ce-authenticated-v507', ok);
    document.body.classList.toggle('ce-logged-out-v507', !ok && explicitLogoutActive());
    document.body.classList.toggle('ce-role-gd-v507', ok && role() === 'GD');
    document.body.classList.toggle('ce-role-rw-v507', ok && role() === 'RW');
    document.body.classList.toggle('ce-role-ro-v507', ok && role() === 'RO');
    const active = setCurrentTab(currentTab());
    Object.entries(BTN).forEach(([tab,id]) => setVisible($(id), roleAllows(tab)));
    Object.entries(PANEL).forEach(([tab,id]) => {
      const panel = $(id); if(!panel) return;
      const visible = roleAllows(tab) && tab === active;
      panel.classList.toggle('hidden', !visible);
      if(visible){ panel.removeAttribute('hidden'); panel.removeAttribute('aria-hidden'); panel.style.removeProperty('display'); }
      else{ panel.style.setProperty('display','none','important'); panel.setAttribute('aria-hidden','true'); }
    });
    Object.entries(BTN).forEach(([tab,id]) => { const btn = $(id); if(btn) btn.classList.toggle('active', roleAllows(tab) && tab === active); });
    ['btnLogout','btnSoftRefresh'].forEach(id => { const btn = $(id); if(btn && ok){ btn.classList.remove('hidden'); btn.disabled = false; } });
    if(!ok){ ['btnLogout','btnSoftRefresh'].forEach(id => $(id)?.classList.add('hidden')); }
  }

  function syncAuthUi(){
    injectStyle(); applyVersion();
    const ok = authenticated();
    document.body.classList.toggle('ce-authenticated-v507', ok);
    document.body.classList.toggle('auth-locked', !ok);
    const overlay = $('authOverlay');
    if(ok && overlay){
      overlay.classList.add('hidden');
      overlay.style.setProperty('display','none','important');
      overlay.style.setProperty('visibility','hidden','important');
      overlay.style.setProperty('pointer-events','none','important');
    }else if(!ok && explicitLogoutActive() && overlay){
      overlay.classList.remove('hidden'); overlay.removeAttribute('hidden');
      overlay.style.removeProperty('display'); overlay.style.removeProperty('visibility'); overlay.style.removeProperty('pointer-events');
    }
    stabilizeRoleMenu();
  }

  function hardLoggedOutUi(){
    markExplicitLogout();
    try{ localStorage.removeItem(SESSION_KEY); }catch(_){ }
    try{ sessionStorage.removeItem('ce_v250_event_chosen'); }catch(_){ }
    setLexical('authUser','null');
    try{ window.authUser = null; }catch(_){ }
    try{ window.__CONTROL_EVENT_USER__ = null; }catch(_){ }
    try{ if(window.ControlEventApp) window.ControlEventApp.authUser = null; }catch(_){ }
    document.body.classList.remove('ce-authenticated-v507','ce-authenticated-v505','ce-authenticated-v504','ce-role-ro-v507','ce-role-rw-v507','ce-role-gd-v507','ce-role-ro-v505','ce-role-rw-v505','ce-role-gd-v505','ce-role-ro-v504','ce-role-rw-v504','ce-role-gd-v504','mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open');
    document.documentElement.classList.remove('mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open');
    document.body.classList.add('auth-locked','ce-logged-out-v507');
    ['brandCurrentUserName','currentUserName'].forEach(id => { const el=$(id); if(el) el.textContent='Sin acceso'; });
    ['brandCurrentUserMeta','currentUserLevel'].forEach(id => { const el=$(id); if(el) el.textContent=''; });
    ['loginIdentificacion','loginClave','changeNewPassword1','changeNewPassword2'].forEach(id => { const el=$(id); if(el) el.value=''; });
    ['ceV505PhotoModal','ceV506PhotoModal','ceV504ReceiptModal','ceTicketModalV234','ceTicketImageModalV225'].forEach(id => { const el=$(id); if(el){ try{ el.remove(); }catch(_){ el.classList.remove('visible','open','show'); } } });
    const overlay = $('authOverlay');
    if(overlay){ overlay.classList.remove('hidden'); overlay.removeAttribute('hidden'); overlay.style.removeProperty('display'); overlay.style.removeProperty('visibility'); overlay.style.removeProperty('pointer-events'); }
    ['btnLogout','btnSoftRefresh'].forEach(id => $(id)?.classList.add('hidden'));
  }
  function logoutV507(ev){
    stop(ev || window.event || {});
    hardLoggedOutUi();
    try{ fetch('/api/logout', {method:'POST', cache:'no-store'}).catch(() => {}); }catch(_){ }
    setTimeout(hardLoggedOutUi, 80);
    setTimeout(hardLoggedOutUi, 380);
    return false;
  }

  function patchLoginLogout(){
    const oldLogin = getFn('doLogin');
    if(typeof oldLogin === 'function' && !oldLogin.__ceV507Wrapped){
      const wrappedLogin = async function(){
        clearExplicitLogout();
        document.body.classList.remove('ce-logged-out-v507');
        const ret = await oldLogin.apply(this, arguments);
        [20,120,320,900].forEach(ms => setTimeout(syncAuthUi, ms));
        return ret;
      };
      wrappedLogin.__ceV507Wrapped = true;
      try{ doLogin = wrappedLogin; }catch(_){ }
      window.doLogin = wrappedLogin;
    }
    const replacedLogout = function(ev){ return logoutV507(ev || window.event); };
    replacedLogout.__ceV507Wrapped = true;
    try{ doLogout = replacedLogout; }catch(_){ }
    window.doLogout = replacedLogout;

    const oldAuth = getFn('renderAuthUI');
    if(typeof oldAuth === 'function' && !oldAuth.__ceV507Wrapped){
      const wrappedAuth = function(){
        const ret = oldAuth.apply(this, arguments);
        setTimeout(syncAuthUi, 0);
        return ret;
      };
      wrappedAuth.__ceV507Wrapped = true;
      try{ renderAuthUI = wrappedAuth; }catch(_){ }
      window.renderAuthUI = wrappedAuth;
    }
  }

  function isHeaderLine(line){
    const t = up(line).replace(/\s*\|\s*/g,'|');
    return /^(DONANTE|TIENDA|TICKET|TICKET\/OTROS GASTOS|TICKET U OTROS GASTOS|NOMBRE)\|/.test(t) && /\|/.test(t) && /(PRODUCTO|INGRESO|IMPORTE|UDS|CANT|TOTAL)/.test(t);
  }
  function normalizeTipText(text){
    const raw = String(text || '');
    if(!raw.includes('|')) return raw;
    const lines = raw.split(/\r?\n/);
    let i = 0;
    while(i < lines.length){
      if(!lines[i].includes('|')){ i++; continue; }
      const start = i;
      while(i < lines.length && lines[i].includes('|')) i++;
      const block = lines.slice(start, i);
      const headerIdx = block.findIndex(isHeaderLine);
      if(headerIdx > 0){
        const [header] = block.splice(headerIdx, 1);
        block.unshift(header);
        lines.splice(start, i - start, ...block);
        i = start + block.length;
      }
    }
    return lines.join('\n');
  }
  function sanitizeTipAttributes(){
    document.querySelectorAll('[data-ce-tip-v21]').forEach(el => {
      const old = el.getAttribute('data-ce-tip-v21') || '';
      const fixed = normalizeTipText(old);
      if(fixed !== old) el.setAttribute('data-ce-tip-v21', fixed);
    });
  }
  function normalizeOpenTooltipTables(){
    const boxes = ['ceTooltipV21','ceBudgetLiteTooltipV307','ceV462Tooltip'].map($).filter(Boolean).concat(Array.from(document.querySelectorAll('.ce-v21-tooltip,.ce-budget-tooltip,.ce-tooltip')));
    boxes.forEach(box => {
      box.querySelectorAll('table').forEach(table => {
        const rows = Array.from(table.querySelectorAll('tr'));
        if(rows.length < 2) return;
        const idx = rows.findIndex(tr => isHeaderLine(Array.from(tr.children).map(td => td.textContent || '').join(' | ')));
        if(idx > 0){
          const tr = rows[idx];
          try{ tr.parentNode.insertBefore(tr, rows[0]); tr.classList.add('ce-v507-tooltip-header-row'); }catch(_){ }
        }else if(idx === 0){ rows[0].classList.add('ce-v507-tooltip-header-row'); }
      });
    });
  }

  let lastTooltipSnapshot = null;
  let photoLifecyclePatched = false;
  function visibleTooltipRoots(){
    const roots = ['ceTooltipV21','ceBudgetLiteTooltipV307','ceV462Tooltip'].map($).filter(Boolean).concat(Array.from(document.querySelectorAll('.ce-v21-tooltip,.ce-budget-tooltip,.ce-tooltip')));
    return roots.filter(el => safe(() => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity || 1) !== 0 && r.width > 0 && r.height > 0;
    }, false));
  }
  function captureTooltipSnapshot(){
    const roots = visibleTooltipRoots();
    if(!roots.length) return null;
    return roots.map(el => ({
      el,
      id: el.id || '',
      className: el.className || '',
      style: el.getAttribute('style') || '',
      scrollTop: el.scrollTop || 0,
      scrollLeft: el.scrollLeft || 0,
      html: el.innerHTML,
      rect: safe(() => el.getBoundingClientRect(), null)
    }));
  }
  function rememberTooltip(){ lastTooltipSnapshot = captureTooltipSnapshot() || lastTooltipSnapshot; }
  function restoreTooltip(){
    const snap = lastTooltipSnapshot;
    if(!snap || !snap.length) return;
    snap.forEach(item => {
      let el = item.el && document.contains(item.el) ? item.el : (item.id ? $(item.id) : null);
      if(!el) return;
      try{
        if(!el.innerHTML && item.html) el.innerHTML = item.html;
        el.className = item.className;
        el.setAttribute('style', item.style || '');
        el.style.setProperty('display', el.style.display && el.style.display !== 'none' ? el.style.display : 'block', 'important');
        el.style.setProperty('visibility','visible','important');
        el.style.setProperty('opacity','1','important');
        el.style.setProperty('pointer-events','auto','important');
        if(item.rect && (!el.style.left || !el.style.top)){
          el.style.position = el.style.position || 'fixed';
          el.style.left = Math.max(4, Math.round(item.rect.left)) + 'px';
          el.style.top = Math.max(4, Math.round(item.rect.top)) + 'px';
        }
        el.scrollTop = item.scrollTop || 0;
        el.scrollLeft = item.scrollLeft || 0;
      }catch(_){ }
    });
    normalizeOpenTooltipTables();
  }
  function modalIsPhoto(el){
    return !!el && (el.id === 'ceV504ReceiptModal' || el.id === 'ceTicketModalV234' || el.id === 'ceTicketImageModalV225' || el.classList?.contains('ce-v504-modal') || el.classList?.contains('ce-ticket-modal-v234') || el.classList?.contains('ce-ticket-modal-v225'));
  }
  function patchPhotoModalLifecycle(){
    if(photoLifecyclePatched) return;
    photoLifecyclePatched = true;
    document.addEventListener('pointerdown', ev => {
      if(ev.target?.closest?.('.ce-v504-receipt-thumb,.ce-v465-tip-thumb,img.ticket-thumb,#ceV504ReceiptModal,#ceTicketModalV234,#ceTicketImageModalV225,.ce-ticket-modal-v234,.ce-ticket-modal-v225')) rememberTooltip();
    }, true);
    document.addEventListener('click', ev => {
      const photoTrigger = ev.target?.closest?.('.ce-v504-receipt-thumb,.ce-v465-tip-thumb,img.ticket-thumb');
      if(photoTrigger) rememberTooltip();
      const closing = ev.target?.closest?.('[data-close],.ce-ticket-modal-v234-close,.ce-ticket-modal-v225-close,.ce-v504-modal,[id="ceV504ReceiptModal"],[id="ceTicketModalV234"],[id="ceTicketImageModalV225"]');
      if(closing){ [40,120,260].forEach(ms => setTimeout(restoreTooltip, ms)); }
    }, true);
    const mo = new MutationObserver(muts => {
      muts.forEach(m => Array.from(m.addedNodes || []).forEach(node => {
        if(node?.nodeType === 1 && modalIsPhoto(node)){
          rememberTooltip();
          try{ node.setAttribute('data-ce-preserve-tooltip','1'); }catch(_){ }
        }
      }));
      normalizeOpenTooltipTables();
    });
    try{ mo.observe(document.documentElement, {childList:true, subtree:true}); }catch(_){ }
  }

  function patchRender(){
    const old = getFn('render');
    if(typeof old !== 'function' || old.__ceV507Wrapped) return;
    const wrapped = function(){
      const ret = old.apply(this, arguments);
      [20,80,220,520,1000].forEach(ms => setTimeout(() => { syncAuthUi(); sanitizeTipAttributes(); normalizeOpenTooltipTables(); applyVersion(); }, ms));
      return ret;
    };
    wrapped.__ceV507Wrapped = true;
    try{ render = wrapped; }catch(_){ }
    window.render = wrapped;
    try{ if(window.ControlEventApp?.actions) window.ControlEventApp.actions.render = (...args) => wrapped(...args); }catch(_){ }
  }

  function handleNav(ev){
    const trg = ev.target?.closest?.('button[id],.mobile-menu-action[data-target]');
    if(!trg || !authenticated()) return;
    const id = trg.dataset?.target || trg.id || '';
    const tab = TAB_BY_BTN[id] || '';
    if(tab && !roleAllows(tab)){ stop(ev); stabilizeRoleMenu(); return false; }
    if(tab){ setCurrentTab(tab); setTimeout(stabilizeRoleMenu, 40); }
  }

  function install(){
    injectStyle(); applyVersion(); patchLoginLogout(); patchRender(); patchPhotoModalLifecycle(); sanitizeTipAttributes(); normalizeOpenTooltipTables(); syncAuthUi();
  }

  window.addEventListener('click', ev => {
    if(ev.target?.closest?.('#btnLogout')) return logoutV507(ev);
    if(ev.target?.closest?.('#btnLogin')){ clearExplicitLogout(); document.body.classList.remove('ce-logged-out-v507'); setTimeout(syncAuthUi, 80); }
  }, true);
  window.addEventListener('click', handleNav, true);
  window.addEventListener('change', ev => { if(ev.target?.id === 'selectedEvent') setTimeout(() => { stabilizeRoleMenu(); sanitizeTipAttributes(); normalizeOpenTooltipTables(); }, 100); }, true);
  document.addEventListener('click', () => setTimeout(() => { sanitizeTipAttributes(); normalizeOpenTooltipTables(); applyVersion(); }, 30), true);
  document.addEventListener('keydown', ev => { if(ev.key === 'Escape') [40,120,260].forEach(ms => setTimeout(restoreTooltip, ms)); }, true);

  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted','controlevent:modules-ready'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 20)));
  [0,60,180,500,1200,2500,5000].forEach(ms => setTimeout(install, ms));
  setInterval(() => { syncAuthUi(); sanitizeTipAttributes(); normalizeOpenTooltipTables(); applyVersion(); }, window.ControlEventLowResource?.interval?.(1200) || 1200);

  window.ControlEventV507 = {version: VERSION, versionFile: VERSION_FILE, install, syncAuthUi, stabilizeRoleMenu, logout: logoutV507, restoreTooltip};
})();
