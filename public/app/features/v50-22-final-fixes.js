/* ControlEvent v13.0_prod - correccion minima sobre la base estable v50.20.
   - No carga la capa v50.21 que bloqueaba la seleccion de evento.
   - Salir limpia el evento anterior antes de volver a Login.
   - Tras login queda CE + Selecciona evento; al elegir evento no se vuelve a bloquear.
   - La version visible y exportada queda unificada mediante constantes actualizadas en bundles. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v13.0_prod';
  const VERSION_FILE = 'ControlEvent_v13.0_prod';
  const INSTALLED = '__ceV5022FinalFixes';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const WELCOME_FLAG = 'controlevent_v5022_force_welcome_after_login';
  const USER_PICKED_FLAG = 'controlevent_v5022_user_picked_event';
  const SESSION_KEYS = ['ControlEvent_v13.0_prod_session','ControlEvent_v13.0_prod_session'];
  const SELECT_KEYS = ['controlevent_v229_selected_event_id','ControlEvent_v13.0_prod_selected_event','ControlEvent_v13.0_prod_selected_event'];
  const CHOSEN_KEYS = [
    'ce_v250_event_chosen','controlevent_v44_event_chosen_after_login','ControlEvent_v13.0_prod_event_chosen','ControlEvent_v13.0_prod_event_chosen','ControlEvent_v13.0_prod_event_chosen',
    'ce_v5017_event_chosen','ce_v5016_event_chosen','ce_v5015_event_chosen','ce_v5013_user_picked_event',
    USER_PICKED_FLAG
  ];
  const PANEL_IDS = ['tabIngresos','tabDonaciones','tabCompras','tabMapaProductos','tabPlanificacionInicial','tabResumen','tabGraficas'];
  const HAS_CLASSES = ['ce-v5019-has-event','ce-v5020-has-event','ce-v5021-has-event','ce-v5022-has-event'];
  const AWAIT_CLASSES = ['ce-v44-awaiting-event','ce-v5019-awaiting-event','ce-v5021-awaiting-event','ce-v5022-awaiting-event'];

  const $ = id => document.getElementById(id);
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const stop = ev => { try{ ev?.preventDefault?.(); ev?.stopPropagation?.(); ev?.stopImmediatePropagation?.(); }catch(_){ } return false; };
  const getLexical = name => safe(() => Function('return (typeof '+name+' !== "undefined") ? '+name+' : undefined;')(), undefined);
  const setLexical = (name, value) => safe(() => Function('value', name + ' = value;')(value), undefined);
  const getFn = name => safe(() => (typeof window[name] === 'function') ? window[name] : Function('return (typeof '+name+' === "function") ? '+name+' : null;')(), null);
  const st = () => getLexical('state') || window.state || window.ControlEventApp?.state || {};
  const auth = () => getLexical('authUser') || window.authUser || window.ControlEventApp?.authUser || null;
  const arr = key => Array.isArray(st()[key]) ? st()[key] : [];
  const eventById = id => arr('eventos').find(ev => String(ev?.id || '') === String(id || '')) || null;
  const hasValidEvent = id => !!eventById(id == null ? st().selectedEventId : id);

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
        const txt = el.textContent || '';
        if(/ControlEvent\s+v[0-9][0-9A-Za-z._\/-]*/i.test(txt)) el.textContent = txt.replace(/ControlEvent\s+v[0-9][0-9A-Za-z._\/-]*/ig, VERSION);
      });
    }catch(_){ }
  }

  function removeKeys(keys){
    keys.forEach(k => { safe(() => localStorage.removeItem(k), null); safe(() => sessionStorage.removeItem(k), null); });
  }

  function clearEventSelection(){
    try{ const s = st(); if(s) s.selectedEventId = ''; }catch(_){ }
    try{ if(window.ControlEventApp?.state) window.ControlEventApp.state.selectedEventId = ''; }catch(_){ }
    try{ const sel = $('selectedEvent'); if(sel) sel.value = ''; }catch(_){ }
    removeKeys(SELECT_KEYS);
    removeKeys(CHOSEN_KEYS);
  }

  function ensurePlaceholder(){
    const sel = $('selectedEvent');
    if(!sel) return;
    let opt = sel.querySelector('option[value=""]');
    if(!opt){ opt = document.createElement('option'); opt.value = ''; sel.insertBefore(opt, sel.firstChild); }
    opt.textContent = arr('eventos').length ? 'Selecciona evento...' : 'Cargando eventos...';
    if(!hasValidEvent()) sel.value = '';
    sel.disabled = false;
    sel.style.pointerEvents = 'auto';
    sel.style.opacity = '1';
  }

  function hidePanels(){
    PANEL_IDS.forEach(id => { const el = $(id); if(el) el.classList.add('hidden'); });
  }

  function showLoginClean(){
    removeKeys(SESSION_KEYS);
    clearEventSelection();
    safe(() => sessionStorage.removeItem(WELCOME_FLAG), null);
    hidePanels();
    try{ setLexical('authUser', null); setLexical('authBusy', false); }catch(_){ }
    try{ window.authUser = null; }catch(_){ }
    try{ if(window.ControlEventApp) window.ControlEventApp.authUser = null; }catch(_){ }
    try{
      document.body.classList.remove(...HAS_CLASSES, ...AWAIT_CLASSES, 'ce-v5019-authenticated','ce-v5020-authenticated','ce-v5021-logged-out');
      document.body.classList.add('auth-locked','ce-v5022-logged-out');
    }catch(_){ }
    const msg = $('noEventMessage');
    if(msg){ msg.classList.add('hidden'); msg.style.removeProperty('display'); }
    const ov = $('authOverlay');
    if(ov){
      ov.classList.remove('hidden'); ov.removeAttribute('hidden'); ov.setAttribute('aria-hidden','false');
      ov.style.setProperty('display','flex','important');
      ov.style.setProperty('visibility','visible','important');
      ov.style.setProperty('opacity','1','important');
      ov.style.setProperty('pointer-events','auto','important');
      ov.style.setProperty('z-index','300000','important');
    }
    ['brandCurrentUserName','currentUserName'].forEach(id => { const el=$(id); if(el) el.textContent='Sin acceso'; });
    ['brandCurrentUserMeta','currentUserLevel'].forEach(id => { const el=$(id); if(el) el.textContent=''; });
    ['loginClave','changeNewPassword1','changeNewPassword2'].forEach(id => { const el=$(id); if(el) el.value=''; });
    const err = $('authError'); if(err) err.textContent = '';
    const dock = $('ceMobileActionDockV518'); if(dock){ dock.style.setProperty('display','none','important'); dock.style.setProperty('visibility','hidden','important'); }
    applyVersion();
  }

  function showWelcomeAfterLogin(reason){
    if(!auth()) return false;
    if(sessionStorage.getItem(USER_PICKED_FLAG) === '1') return false;
    clearEventSelection();
    ensurePlaceholder();
    hidePanels();
    try{ document.body.classList.remove('auth-locked', ...HAS_CLASSES, 'ce-v5022-logged-out'); document.body.classList.add('ce-v5019-authenticated','ce-v44-awaiting-event','ce-v5019-awaiting-event','ce-v5022-awaiting-event'); }catch(_){ }
    const ov = $('authOverlay');
    if(ov){
      ov.classList.add('hidden'); ov.setAttribute('aria-hidden','true');
      ov.style.setProperty('display','none','important');
      ov.style.setProperty('visibility','hidden','important');
      ov.style.setProperty('opacity','0','important');
      ov.style.setProperty('pointer-events','none','important');
    }
    const msg = $('noEventMessage');
    if(msg){
      msg.classList.remove('hidden'); msg.removeAttribute('aria-hidden');
      msg.style.removeProperty('display'); msg.style.removeProperty('visibility'); msg.style.removeProperty('max-height');
      if(!msg.querySelector('.ce-v5019-welcome,.ce-v5022-welcome')){
        msg.innerHTML = '<div class="ce-v5019-welcome ce-v5022-welcome"><img src="./assets/icons/controlevent-welcome-v44.png" alt="ControlEvent"><h2>Selecciona un evento para trabajar</h2><p>Elige el evento en el desplegable superior para cargar todos los datos y activar los globos.</p></div>';
      }
    }
    try{ setLexical('currentMainTab','graficas'); window.__ceCurrentMainTab = 'graficas'; }catch(_){ }
    try{ window.ControlEventV5019?.ensureMobileDock?.(); }catch(_){ }
    applyVersion();
    return true;
  }

  function finalizeEventPick(id){
    if(!id || !eventById(id)) return;
    safe(() => sessionStorage.setItem(USER_PICKED_FLAG,'1'), null);
    CHOSEN_KEYS.forEach(k => safe(() => sessionStorage.setItem(k, '1'), null));
    safe(() => sessionStorage.removeItem(WELCOME_FLAG), null);
    try{ const s = st(); if(s) s.selectedEventId = String(id); }catch(_){ }
    try{ const sel = $('selectedEvent'); if(sel) sel.value = String(id); }catch(_){ }
    try{ document.body.classList.remove(...AWAIT_CLASSES, 'auth-locked','ce-v5022-logged-out'); document.body.classList.add('ce-v5022-has-event'); }catch(_){ }
    const msg = $('noEventMessage');
    if(msg){ msg.classList.add('hidden'); msg.setAttribute('aria-hidden','true'); msg.style.setProperty('display','none','important'); }
    applyVersion();
  }

  function patchLogout(){
    if(window.__ceV5022LogoutPatched) return;
    window.__ceV5022LogoutPatched = true;
    const hardLogout = function(ev){
      if(ev) stop(ev);
      try{ fetch('/api/logout', {method:'POST', cache:'no-store'}).catch(()=>{}); }catch(_){ }
      showLoginClean();
      return false;
    };
    window.ControlEventV5022Logout = hardLogout;
    window.doLogout = hardLogout;
    try{ doLogout = hardLogout; }catch(_){ }
    try{ if(window.ControlEventApp?.actions) window.ControlEventApp.actions.doLogout = hardLogout; }catch(_){ }
    document.addEventListener('click', ev => {
      if(ev.target?.closest?.('#btnLogout,#ceBtnSalirV518')) return hardLogout(ev);
    }, true);
    ['touchend','pointerup'].forEach(type => document.addEventListener(type, ev => {
      if(ev.target?.closest?.('#ceBtnSalirV518')) return hardLogout(ev);
    }, {capture:true, passive:false}));
  }

  function patchLoginWelcome(){
    if(window.__ceV5022FetchPatched || typeof window.fetch !== 'function') return;
    window.__ceV5022FetchPatched = true;
    const oldFetch = window.fetch.bind(window);
    window.fetch = function(input, init){
      const url = String((input && input.url) || input || '');
      const p = oldFetch(input, init);
      if(/\/api\/login(?:\?|$)/.test(url)){
        return p.then(res => {
          try{
            res.clone().json().then(data => {
              if(res.ok && data && data.ok && data.user){
                safe(() => sessionStorage.setItem(WELCOME_FLAG, String(Date.now())), null);
                safe(() => sessionStorage.removeItem(USER_PICKED_FLAG), null);
                removeKeys(SELECT_KEYS);
                [180,420,900,1600,2600].forEach(ms => setTimeout(() => {
                  if(sessionStorage.getItem(WELCOME_FLAG)) showWelcomeAfterLogin('login');
                }, ms));
              }
            }).catch(()=>{});
          }catch(_){ }
          return res;
        });
      }
      return p;
    };
  }

  function patchEventPick(){
    if(window.__ceV5022EventPickPatched) return;
    window.__ceV5022EventPickPatched = true;
    document.addEventListener('change', ev => {
      if(ev.target?.id !== 'selectedEvent') return;
      const id = String(ev.target.value || '');
      if(id && eventById(id)){
        finalizeEventPick(id);
        [120,360,850,1600].forEach(ms => setTimeout(() => {
          if(hasValidEvent(id)){
            finalizeEventPick(id);
            try{ window.ControlEventV5019?.afterEventSelected?.(id,'v50.22-select'); }catch(_){ }
            try{ window.ControlEventV5020?.renderActiveOnly?.('graficas','v50.22-select'); }catch(_){ }
          }
        }, ms));
      }else if(auth()){
        safe(() => sessionStorage.setItem(WELCOME_FLAG, String(Date.now())), null);
        setTimeout(() => showWelcomeAfterLogin('empty-event'), 80);
      }
    }, true);

    const oldChange = getFn('changeSelectedEvent') || window.changeSelectedEvent;
    if(typeof oldChange === 'function' && !oldChange.__ceV5022Wrapped){
      const wrapped = function(value){
        const id = String(value || '');
        if(id && eventById(id)) finalizeEventPick(id);
        const ret = oldChange.apply(this, arguments);
        if(id && eventById(id)) [120,360,850,1600].forEach(ms => setTimeout(() => finalizeEventPick(id), ms));
        return ret;
      };
      wrapped.__ceV5022Wrapped = true;
      window.changeSelectedEvent = wrapped;
      try{ changeSelectedEvent = wrapped; }catch(_){ }
    }
  }

  function install(){
    applyVersion();
    patchLogout();
    patchLoginWelcome();
    patchEventPick();
    ensurePlaceholder();
    if(auth() && sessionStorage.getItem(WELCOME_FLAG) && !sessionStorage.getItem(USER_PICKED_FLAG)) showWelcomeAfterLogin('install');
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true}); else install();
  ['load','controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 30)));
  window.ControlEventV5022 = {version:VERSION, versionFile:VERSION_FILE, install, showLoginClean, showWelcomeAfterLogin, applyVersion};
})();
