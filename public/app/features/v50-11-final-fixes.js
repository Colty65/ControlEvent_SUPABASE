/* ControlEvent v8.3.2_prod - ajuste quirurgico sobre v50.19.
   - Salir: muestra siempre la ventana de login real y limpia cualquier estado autenticado.
   - Version: fija una unica version visible sin cargar v50.19.
   - INGRESOS/COMPRAS: filas pendientes en rojo; el resto queda en negro.
   - No toca el visor ni el flujo de fotos de INGRESOS/tickets.
*/
(function(){
  'use strict';

  const VERSION = 'ControlEvent v8.3.2_prod';
  const VERSION_FILE = 'ControlEvent_v8_3_2_prod';
  const INSTALLED = '__ceV5011FinalFixes';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const SESSION_KEYS = ['ControlEvent_v8_3_2_prod_session'];
  const LOGOUT_KEYS = [
    'ControlEvent_v8_3_2_prod_logout_at',
    'ControlEvent_v8_3_2_prod_logout_at',
    'ControlEvent_v8_3_2_prod_logout_at',
    'ControlEvent_v8_3_2_prod_logout_at'
  ];
  const $ = id => document.getElementById(id);
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();

  function stop(ev){ try{ ev?.preventDefault?.(); ev?.stopPropagation?.(); ev?.stopImmediatePropagation?.(); }catch(_){ } return false; }
  function setLexical(name, value){ try{ Function('v', name + ' = v;')(value); }catch(_){ } }
  function getLexical(name){ return safe(() => Function('return (typeof '+name+' !== "undefined") ? '+name+' : undefined;')(), undefined); }
  function getFn(name){ return safe(() => (typeof window[name] === 'function') ? window[name] : Function('return (typeof '+name+' === "function") ? '+name+' : null;')(), null); }
  function auth(){ return getLexical('authUser') || window.authUser || window.ControlEventApp?.authUser || window.__CONTROL_EVENT_USER__ || null; }
  function isAuthenticated(){ return !!auth(); }

  function injectStyle(){
    if($('ceV5011FinalStyle')) return;
    const style = document.createElement('style');
    style.id = 'ceV5011FinalStyle';
    style.textContent = `
      body.ce-v5011-logged-out #authOverlay{display:flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;z-index:300000!important;}
      body.ce-v5011-logged-out .app,body.ce-v5011-logged-out .footer{filter:none!important;pointer-events:none!important;user-select:none!important;}
      body.ce-v5011-logged-out #btnLogout,body.ce-v5011-logged-out #btnSoftRefresh,body.ce-v5011-logged-out #ceMobileActionDockV508{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      body.ce-v5011-authenticated #authOverlay{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}
      #collabList .rowline.collab.ce-v5011-pending-row,
      #collabList .rowline.collab.ce-v5011-pending-row label,
      #collabList .rowline.collab.ce-v5011-pending-row input,
      #collabList .rowline.collab.ce-v5011-pending-row select,
      #collabList .rowline.collab.ce-v5011-pending-row textarea,
      #collabList .itemcard.ce-v5011-pending-row,
      #collabList .itemcard.ce-v5011-pending-row label,
      #collabList .itemcard.ce-v5011-pending-row input,
      #collabList .itemcard.ce-v5011-pending-row select,
      #collabList .itemcard.ce-v5011-pending-row textarea,
      #comprasList .rowline.ce-v5011-pending-row,
      #comprasList .rowline.ce-v5011-pending-row label,
      #comprasList .rowline.ce-v5011-pending-row input,
      #comprasList .rowline.ce-v5011-pending-row select,
      #comprasList .rowline.ce-v5011-pending-row textarea,
      #comprasList .itemcard.ce-v5011-pending-row,
      #comprasList .itemcard.ce-v5011-pending-row label,
      #comprasList .itemcard.ce-v5011-pending-row input,
      #comprasList .itemcard.ce-v5011-pending-row select,
      #comprasList .itemcard.ce-v5011-pending-row textarea{color:#b91c1c!important;}
      #collabList .rowline.collab.ce-v5011-ok-row,
      #collabList .rowline.collab.ce-v5011-ok-row label,
      #collabList .rowline.collab.ce-v5011-ok-row input,
      #collabList .rowline.collab.ce-v5011-ok-row select,
      #collabList .rowline.collab.ce-v5011-ok-row textarea,
      #collabList .itemcard.ce-v5011-ok-row,
      #collabList .itemcard.ce-v5011-ok-row label,
      #collabList .itemcard.ce-v5011-ok-row input,
      #collabList .itemcard.ce-v5011-ok-row select,
      #collabList .itemcard.ce-v5011-ok-row textarea,
      #comprasList .rowline.ce-v5011-ok-row,
      #comprasList .rowline.ce-v5011-ok-row label,
      #comprasList .rowline.ce-v5011-ok-row input,
      #comprasList .rowline.ce-v5011-ok-row select,
      #comprasList .rowline.ce-v5011-ok-row textarea,
      #comprasList .itemcard.ce-v5011-ok-row,
      #comprasList .itemcard.ce-v5011-ok-row label,
      #comprasList .itemcard.ce-v5011-ok-row input,
      #comprasList .itemcard.ce-v5011-ok-row select,
      #comprasList .itemcard.ce-v5011-ok-row textarea{color:#111827!important;}
      #collabList .ce-v5011-pending-row button,#comprasList .ce-v5011-pending-row button{color:inherit;}
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
      window.ControlEventVersion = {version: VERSION, versionFile: VERSION_FILE};
      document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => {
        const text = el.textContent || '';
        if(/ControlEvent\s+v[0-9][0-9A-Za-z._\/-]*/i.test(text)) el.textContent = text.replace(/ControlEvent\s+v[0-9][0-9A-Za-z._\/-]*/ig, VERSION);
      });
    }catch(_){ }
  }

  function clearAuthState(){
    LOGOUT_KEYS.forEach(k => safe(() => sessionStorage.setItem(k, String(Date.now())), null));
    SESSION_KEYS.forEach(k => safe(() => localStorage.removeItem(k), null));
    safe(() => sessionStorage.removeItem('ce_v250_event_chosen'), null);
    safe(() => sessionStorage.removeItem('ce_event_chosen'), null);
    setLexical('authUser', null);
    setLexical('accessUsers', []);
    setLexical('authBusy', false);
    try{ window.authUser = null; }catch(_){ }
    try{ window.__CONTROL_EVENT_USER__ = null; }catch(_){ }
    try{ if(window.ControlEventApp) window.ControlEventApp.authUser = null; }catch(_){ }
  }

  function hideTransientLayers(){
    try{
      document.querySelectorAll('#ceTooltipV21,#ceBudgetLiteTooltipV307,#ceV462Tooltip,.ce-v21-tooltip,.ce-budget-tooltip,.ce-tooltip,.ce-v509-modal,.ce-v505-photo-modal,.ce-v506-photo-modal,.ce-v508-photo-modal').forEach(el => {
        if(el.classList){ el.classList.remove('open','show','visible','ce-v462-tip-open'); }
        el.setAttribute?.('aria-hidden','true');
        el.style?.setProperty?.('display','none','important');
      });
    }catch(_){ }
  }

  function showLogin(){
    injectStyle();
    document.body.classList.remove(
      'ce-v5011-authenticated','ce-v509-authenticated','ce-authenticated-v508','ce-authenticated-v504',
      'ce-role-ro-v508','ce-role-rw-v508','ce-role-gd-v508','ce-role-ro-v504','ce-role-rw-v504','ce-role-gd-v504',
      'mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open'
    );
    document.documentElement.classList.remove('mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open');
    document.body.classList.add('ce-v5011-logged-out','ce-logged-out-v508','ce-logged-out-v509');
    document.body.classList.remove('auth-locked');

    const overlay = $('authOverlay');
    if(overlay){
      overlay.classList.remove('hidden');
      overlay.removeAttribute('hidden');
      overlay.setAttribute('aria-hidden','false');
      overlay.style.setProperty('display','flex','important');
      overlay.style.setProperty('visibility','visible','important');
      overlay.style.setProperty('opacity','1','important');
      overlay.style.setProperty('pointer-events','auto','important');
      overlay.style.setProperty('z-index','300000','important');
    }
    const authCard = document.querySelector('#authOverlay .auth-card');
    if(authCard){
      authCard.style.removeProperty('display');
      authCard.style.setProperty('visibility','visible','important');
      authCard.style.setProperty('opacity','1','important');
    }
    [document.querySelector('.app'), document.querySelector('.footer')].forEach(el => {
      if(el){ el.style.setProperty('filter','none','important'); el.style.setProperty('pointer-events','none','important'); }
    });
    ['btnLogout','btnSoftRefresh'].forEach(id => { const btn=$(id); if(btn){ btn.classList.add('hidden'); btn.setAttribute('hidden',''); btn.style.setProperty('display','none','important'); } });
    const dock = $('ceMobileActionDockV508');
    if(dock){ dock.style.setProperty('display','none','important'); dock.style.setProperty('visibility','hidden','important'); dock.style.setProperty('pointer-events','none','important'); }
    ['brandCurrentUserName','currentUserName'].forEach(id => { const el=$(id); if(el) el.textContent='Sin acceso'; });
    ['brandCurrentUserMeta','currentUserLevel'].forEach(id => { const el=$(id); if(el) el.textContent=''; });
    ['loginIdentificacion','loginClave','changeNewPassword1','changeNewPassword2'].forEach(id => { const el=$(id); if(el) el.value=''; });
    const err = $('authError'); if(err) err.textContent = '';
    const panel = $('changePasswordPanel'); if(panel) panel.classList.add('hidden');
    applyVersion();
  }

  function hideLoginIfAuthenticated(){
    injectStyle();
    applyVersion();
    if(!isAuthenticated()) return;
    document.body.classList.remove('ce-v5011-logged-out','ce-logged-out-v508','ce-logged-out-v509','auth-locked');
    document.body.classList.add('ce-v5011-authenticated');
    const overlay = $('authOverlay');
    if(overlay){
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden','true');
      overlay.style.setProperty('display','none','important');
      overlay.style.setProperty('visibility','hidden','important');
      overlay.style.setProperty('opacity','0','important');
      overlay.style.setProperty('pointer-events','none','important');
    }
    [document.querySelector('.app'), document.querySelector('.footer')].forEach(el => {
      if(el){ el.style.removeProperty('filter'); el.style.removeProperty('pointer-events'); }
    });
    ['btnLogout','btnSoftRefresh'].forEach(id => { const btn=$(id); if(btn){ btn.classList.remove('hidden'); btn.removeAttribute('hidden'); btn.style.removeProperty('display'); } });
  }

  function hardLogout(ev){
    stop(ev || window.event || {});
    clearAuthState();
    hideTransientLayers();
    showLogin();
    // Una sola confirmacion tardia para imponerse a manejadores inline antiguos que pudieran ejecutarse despues.
    setTimeout(() => { clearAuthState(); showLogin(); }, 80);
    try{ fetch('/api/logout', {method:'POST', cache:'no-store'}).catch(() => {}); }catch(_){ }
    return false;
  }

  function patchLogout(){
    const logout = function(ev){ return hardLogout(ev || window.event); };
    logout.__ceV5011Wrapped = true;
    try{ doLogout = logout; }catch(_){ }
    window.doLogout = logout;
  }

  function isIngresoPendingFromValue(value){
    const s = up(value || '');
    return !s || s.includes('PTE') || s.includes('PENDIENT');
  }
  function isCompraPendingFromValue(value){
    const s = up(value || '');
    if(!s) return true;
    if(s.includes('PTE') || s.includes('PENDIENT')) return true;
    return false;
  }
  function cardForControl(el, rootSelector){
    return el?.closest?.(`${rootSelector} .rowline,${rootSelector} .itemcard,${rootSelector} .card`);
  }
  function setRowPending(row, pending){
    if(!row) return;
    row.classList.toggle('ce-v5011-pending-row', !!pending);
    row.classList.toggle('ce-v5011-ok-row', !pending);
    row.dataset.cePending = pending ? '1' : '0';
  }
  function markPendingRows(){
    try{
      const ingresos = $('collabList');
      if(ingresos){
        ingresos.querySelectorAll('[data-action="edit-collab-situacion"]').forEach(ctrl => {
          const row = cardForControl(ctrl, '#collabList');
          setRowPending(row, isIngresoPendingFromValue(ctrl.value || ctrl.textContent || ''));
        });
      }
      const compras = $('comprasList');
      if(compras){
        compras.querySelectorAll('[data-action="edit-compra-ticket"]').forEach(ctrl => {
          const row = cardForControl(ctrl, '#comprasList');
          setRowPending(row, isCompraPendingFromValue(ctrl.value || ctrl.textContent || ''));
        });
      }
    }catch(_){ }
  }

  function patchRenderers(){
    const wrapNames = ['render','renderColabs','renderCompras'];
    wrapNames.forEach(name => {
      const old = getFn(name);
      if(typeof old !== 'function' || old.__ceV5011Wrapped) return;
      const wrapped = function(){
        const ret = old.apply(this, arguments);
        setTimeout(() => { applyVersion(); hideLoginIfAuthenticated(); markPendingRows(); }, 45);
        setTimeout(() => { applyVersion(); markPendingRows(); }, 180);
        return ret;
      };
      wrapped.__ceV5011Wrapped = true;
      try{ Function('fn', name + ' = fn;')(wrapped); }catch(_){ }
      window[name] = wrapped;
    });
  }

  function install(){
    injectStyle();
    applyVersion();
    patchLogout();
    patchRenderers();
    if(isAuthenticated()) hideLoginIfAuthenticated();
    markPendingRows();
  }

  window.addEventListener('click', ev => {
    if(ev.target?.closest?.('#btnLogout')) return hardLogout(ev);
    if(ev.target?.closest?.('#btnLogin')){
      setTimeout(hideLoginIfAuthenticated, 160);
      setTimeout(hideLoginIfAuthenticated, 520);
      setTimeout(() => { applyVersion(); markPendingRows(); }, 700);
    }
    return undefined;
  }, {capture:true, passive:false});
  window.addEventListener('touchend', ev => { if(ev.target?.closest?.('#btnLogout')) return hardLogout(ev); return undefined; }, {capture:true, passive:false});
  document.addEventListener('change', ev => {
    const a = ev.target?.dataset?.action || '';
    if(a === 'edit-collab-situacion' || a === 'edit-compra-ticket') setTimeout(markPendingRows, 20);
  }, true);
  document.addEventListener('input', ev => {
    const a = ev.target?.dataset?.action || '';
    if(a === 'edit-collab-situacion' || a === 'edit-compra-ticket') setTimeout(markPendingRows, 20);
  }, true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted','controlevent:modules-ready'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 20)));
  [0,100,450,1100].forEach(ms => setTimeout(install, ms));

  window.ControlEventV5011 = {version:VERSION, versionFile:VERSION_FILE, install, logout:hardLogout, markPendingRows, applyVersion};
})();
