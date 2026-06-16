/* ControlEvent v9.2_prod - ajuste minimo sobre v50.9.
   - Salir: evita que quede la app borrosa si el overlay de login no termina de pintar.
   - INGRESOS: recoloca justificante / adjuntar / borrar al extremo derecho del registro.
*/
(function(){
  'use strict';

  const VERSION = 'ControlEvent v9.2_prod';
  const VERSION_FILE = 'ControlEvent_v9_2_prod';
  const INSTALLED = '__ceV5010FinalFixes';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const SESSION_KEYS = ['ControlEvent_v9_2_prod_session'];
  const LOGOUT_KEYS = ['ControlEvent_v9_2_prod_logout_at','ControlEvent_v9_2_prod_logout_at','ControlEvent_v9_2_prod_logout_at'];
  const $ = id => document.getElementById(id);
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const isMobile = () => safe(() => window.matchMedia('(max-width: 900px)').matches, innerWidth <= 900);

  function stop(ev){ try{ ev?.preventDefault?.(); ev?.stopPropagation?.(); ev?.stopImmediatePropagation?.(); }catch(_){ } return false; }
  function setLexical(name, value){ try{ Function('v', name + ' = v;')(value); }catch(_){ } }
  function getFn(name){ return safe(() => (typeof window[name] === 'function') ? window[name] : Function('return (typeof '+name+' === "function") ? '+name+' : null;')(), null); }

  function injectStyle(){
    if($('ceV5010FinalStyle')) return;
    const style = document.createElement('style');
    style.id = 'ceV5010FinalStyle';
    style.textContent = `
      body.ce-v5010-logged-out .app,body.ce-v5010-logged-out .footer{filter:none!important;pointer-events:none!important;user-select:none!important;}
      body.ce-v5010-logged-out #authOverlay{display:flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;z-index:300000!important;}
      body.ce-v5010-logged-out #ceMobileActionDockV508{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      #collabList .rowline.collab > .ce-v509-receipt-field{order:98!important;justify-self:end!important;margin-left:auto!important;align-items:flex-end!important;text-align:right!important;}
      #collabList .rowline.collab > .ce-v509-receipt-field .ce-v509-receipt-strip{justify-content:flex-end!important;}
      @media(max-width:900px){
        #collabList .rowline.collab > .ce-v509-receipt-field{width:100%!important;align-items:flex-end!important;text-align:right!important;}
        #collabList .rowline.collab > .ce-v509-receipt-field .ce-v509-receipt-strip{width:auto!important;align-self:flex-end!important;justify-content:flex-end!important;}
      }
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
      window.ControlEventVersion = {version:VERSION, versionFile:VERSION_FILE};
      document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => {
        const t = el.textContent || '';
        if(/ControlEvent\s+v[0-9][0-9A-Za-z._\/-]*/i.test(t)) el.textContent = t.replace(/ControlEvent\s+v[0-9][0-9A-Za-z._\/-]*/ig, VERSION);
      });
    }catch(_){ }
  }

  function moveIngresoReceiptFields(){
    const wrap = $('collabList');
    if(!wrap) return;
    wrap.querySelectorAll('.rowline.collab').forEach(row => {
      const field = row.querySelector(':scope > .ce-v509-receipt-field');
      if(!field) return;
      const actions = row.querySelector(':scope > * button[data-action="save-collab"]')?.parentElement
        || row.querySelector(':scope > * button[data-action="delete-collab"]')?.parentElement;
      if(actions && actions.parentNode === row && actions.nextSibling !== field){
        actions.insertAdjacentElement('afterend', field);
      }else if(field.parentNode === row && field !== row.lastElementChild && (!actions || actions.nextSibling !== field)){
        row.appendChild(field);
      }
      field.style.setProperty('order','98','important');
      field.style.setProperty('justify-self','end','important');
      field.style.setProperty('margin-left','auto','important');
      field.style.setProperty('align-items','flex-end','important');
      const strip = field.querySelector('.ce-v509-receipt-strip');
      if(strip) strip.style.setProperty('justify-content','flex-end','important');
    });
  }

  function showLoginClean(){
    document.body.classList.remove('auth-locked','ce-authenticated-v508','ce-v509-authenticated','ce-authenticated-v504','ce-role-ro-v508','ce-role-rw-v508','ce-role-gd-v508','ce-role-ro-v504','ce-role-rw-v504','ce-role-gd-v504','mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open');
    document.documentElement.classList.remove('mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open');
    document.body.classList.add('ce-logged-out-v508','ce-v5010-logged-out');
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
    const app = document.querySelector('.app');
    const footer = document.querySelector('.footer');
    [app,footer].forEach(el => { if(el){ el.style.setProperty('filter','none','important'); } });
    ['btnLogout','btnSoftRefresh'].forEach(id => { const btn=$(id); if(btn){ btn.classList.add('hidden'); btn.setAttribute('hidden',''); } });
    const dock = $('ceMobileActionDockV508');
    if(dock){ dock.style.setProperty('display','none','important'); dock.style.setProperty('visibility','hidden','important'); }
    ['brandCurrentUserName','currentUserName'].forEach(id => { const el=$(id); if(el) el.textContent='Sin acceso'; });
    ['brandCurrentUserMeta','currentUserLevel'].forEach(id => { const el=$(id); if(el) el.textContent=''; });
    ['loginIdentificacion','loginClave','changeNewPassword1','changeNewPassword2'].forEach(id => { const el=$(id); if(el) el.value=''; });
  }

  function cleanLogout(ev){
    stop(ev || window.event || {});
    LOGOUT_KEYS.forEach(k => safe(() => sessionStorage.setItem(k, String(Date.now())), null));
    SESSION_KEYS.forEach(k => safe(() => localStorage.removeItem(k), null));
    safe(() => sessionStorage.removeItem('ce_v250_event_chosen'), null);
    setLexical('authUser', null);
    try{ window.authUser = null; }catch(_){ }
    try{ window.__CONTROL_EVENT_USER__ = null; }catch(_){ }
    try{ if(window.ControlEventApp) window.ControlEventApp.authUser = null; }catch(_){ }
    try{ document.querySelectorAll('#ceTooltipV21,#ceBudgetLiteTooltipV307,#ceV462Tooltip,.ce-v21-tooltip,.ce-budget-tooltip,.ce-tooltip').forEach(el => { el.classList.remove('open','show','visible','ce-v462-tip-open'); el.setAttribute('aria-hidden','true'); el.style.setProperty('display','none','important'); }); }catch(_){ }
    showLoginClean();
    [30,120,350].forEach(ms => setTimeout(showLoginClean, ms));
    try{ fetch('/api/logout', {method:'POST', cache:'no-store'}).catch(() => {}); }catch(_){ }
    return false;
  }

  function patchLogoutFunction(){
    const logout = function(ev){ return cleanLogout(ev || window.event); };
    logout.__ceV5010Wrapped = true;
    try{ doLogout = logout; }catch(_){ }
    window.doLogout = logout;
  }

  function patchRenders(){
    const oldRender = getFn('render');
    if(typeof oldRender === 'function' && !oldRender.__ceV5010Wrapped){
      const wrapped = function(){
        const ret = oldRender.apply(this, arguments);
        [30,160,420].forEach(ms => setTimeout(() => { applyVersion(); moveIngresoReceiptFields(); }, ms));
        return ret;
      };
      wrapped.__ceV5010Wrapped = true;
      try{ render = wrapped; }catch(_){ }
      window.render = wrapped;
    }
    const oldColabs = getFn('renderColabs');
    if(typeof oldColabs === 'function' && !oldColabs.__ceV5010Wrapped){
      const wrapped = function(){
        const ret = oldColabs.apply(this, arguments);
        [40,180,440].forEach(ms => setTimeout(moveIngresoReceiptFields, ms));
        return ret;
      };
      wrapped.__ceV5010Wrapped = true;
      try{ renderColabs = wrapped; }catch(_){ }
      window.renderColabs = wrapped;
    }
  }

  function install(){
    injectStyle();
    applyVersion();
    patchLogoutFunction();
    patchRenders();
    moveIngresoReceiptFields();
    if(!isMobile()) return;
    // En movil, si quedaron estilos inline del dock anterior tras salir, se limpiarán al salir con showLoginClean.
  }

  // Captura temprana: el listener de v50.19 puede dispararse antes; por eso tambien se ha corregido directamente v50-8-final-fixes.js.
  window.addEventListener('click', ev => { if(ev.target?.closest?.('#btnLogout')) return cleanLogout(ev); }, {capture:true, passive:false});
  window.addEventListener('touchend', ev => { if(ev.target?.closest?.('#btnLogout')) return cleanLogout(ev); }, {capture:true, passive:false});
  window.addEventListener('click', () => setTimeout(moveIngresoReceiptFields, 30), true);
  window.addEventListener('change', () => setTimeout(moveIngresoReceiptFields, 120), true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted','controlevent:modules-ready'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 20)));
  [0,120,500,1400].forEach(ms => setTimeout(install, ms));

  window.ControlEventV5010 = {version:VERSION, versionFile:VERSION_FILE, install, logout:cleanLogout, moveIngresoReceiptFields};
})();
