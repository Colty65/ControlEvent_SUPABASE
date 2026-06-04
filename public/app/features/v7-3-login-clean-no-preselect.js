/* ControlEvent v8.2.2_prod - login limpio sin preselección y salida sin recarga pesada.
   Alcance: tras Salir/Login, fuerza selector en "Selecciona evento..." hasta que el usuario elija evento. Sin bucles ni MutationObserver. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v8.2.2_prod';
  const VERSION_FILE = 'ControlEvent_v8_2_2_prod';
  if(window.__ceV73LoginCleanNoPreselect) return;
  window.__ceV73LoginCleanNoPreselect = true;

  const FORCE_KEY = 'ce_v73_force_no_event_after_login_until';
  const PICKED_KEY = 'ce_v73_user_picked_event';
  const LOGOUT_AT_KEY = 'ControlEvent_v8_2_2_prod_soft_logout_at';
  const CHOSEN_KEYS = [
    'ce_v250_event_chosen','ce_event_chosen','controlevent_v44_event_chosen_after_login',
    'ce_v5017_event_chosen','ce_v5016_event_chosen','ce_v5015_event_chosen','ce_v5013_user_picked_event',
    'controlevent_v5022_user_picked_event','ControlEvent_v8_2_2_prod_event_chosen','ControlEvent_v8_2_2_prod_selected_event',
    'ControlEvent_v8_2_2_prod_event_chosen','ControlEvent_v8_2_2_prod_selected_event','controlevent_v229_selected_event_id'
  ];
  const $ = id => document.getElementById(id);
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const now = () => Date.now();
  const st = () => safe(() => (typeof state !== 'undefined' && state) ? state : null, null) || window.state || window.ControlEventApp?.state || {};
  const arr = name => Array.isArray(st()[name]) ? st()[name] : [];
  const hasEvent = id => !!id && arr('eventos').some(e => String(e?.id || '') === String(id));
  const auth = () => !!(safe(() => (typeof authUser !== 'undefined' && authUser), null) || window.authUser || window.ControlEventApp?.authUser || window.__CONTROL_EVENT_USER__);

  function clearChosen(){ CHOSEN_KEYS.forEach(k => { safe(() => sessionStorage.removeItem(k)); safe(() => localStorage.removeItem(k)); }); }
  function forceActive(){ return Number(sessionStorage.getItem(FORCE_KEY) || '0') > now() && sessionStorage.getItem(PICKED_KEY) !== '1'; }
  function beginForce(ms){ sessionStorage.setItem(FORCE_KEY, String(now() + (ms || 16000))); sessionStorage.removeItem(PICKED_KEY); clearChosen(); }
  function endForce(){ sessionStorage.removeItem(FORCE_KEY); sessionStorage.setItem(PICKED_KEY, '1'); }

  function ensurePlaceholder(sel){
    if(!sel) return;
    let opt = Array.from(sel.options || []).find(o => String(o.value || '') === '');
    if(!opt){ opt = document.createElement('option'); opt.value = ''; sel.insertBefore(opt, sel.firstChild || null); }
    opt.textContent = arr('eventos').length ? 'Selecciona evento...' : 'Cargando eventos...';
    opt.disabled = false;
    opt.hidden = false;
  }
  function clearPanels(){
    ['ingresosSummaryGrid','collabList','donacionesList','comprasList','mapaProductosSummary','mapaProductosList','budgetLayout','summarySegmento','summaryDestino','summaryTiendaTicket','eventChartWrap'].forEach(id => {
      const el=$(id); if(el) el.innerHTML='';
    });
  }
  function setNoEvent(reason){
    const s = st(); if(s) s.selectedEventId = '';
    safe(() => { if(window.ControlEventApp?.state) window.ControlEventApp.state.selectedEventId = ''; });
    const sel = $('selectedEvent');
    if(sel){ ensurePlaceholder(sel); if(sel.value !== '') sel.value = ''; sel.selectedIndex = 0; }
    clearChosen();
    try{ document.body.classList.remove('ce-v5019-has-event','ce-v5020-has-event','ce-v5022-has-event','ce-v5025-has-event','ce-v5026-has-event'); document.body.classList.add('ce-v5019-authenticated','ce-v5019-awaiting-event','ce-v44-awaiting-event'); }catch(_){ }
    const msg = $('noEventMessage');
    if(msg){
      msg.classList.remove('hidden');
      msg.removeAttribute('aria-hidden');
      msg.style.removeProperty('display'); msg.style.removeProperty('visibility'); msg.style.removeProperty('pointer-events');
      if(!msg.innerHTML || !/Selecciona un evento/i.test(msg.textContent || '')){
        msg.innerHTML = '<div class="ce-v73-welcome"><img src="./assets/icons/controlevent-welcome-v44.png" alt="ControlEvent"><h2>Selecciona un evento para trabajar</h2><p>Elige el evento en el desplegable superior para cargar los datos.</p></div>';
      }
    }
    clearPanels();
  }
  function enforceSeries(reason){
    [0,80,220,520,1000,1800,3200].forEach(ms => setTimeout(() => { if(auth() && forceActive()) setNoEvent(reason); }, ms));
  }
  function patchFetch(){
    if(window.__ceV73LoginFetchPatched || typeof window.fetch !== 'function') return;
    window.__ceV73LoginFetchPatched = true;
    const oldFetch = window.fetch.bind(window);
    window.fetch = function(input, init){
      const url = String((input && input.url) || input || '');
      const promise = oldFetch(input, init);
      if(/\/api\/login(?:\?|$)/.test(url)){
        return promise.then(res => {
          try{
            res.clone().json().then(data => {
              if(res.ok && data && data.ok && data.user){ beginForce(18000); enforceSeries('login'); }
            }).catch(()=>{});
          }catch(_){ }
          return res;
        });
      }
      if(forceActive() && /\/api\/state(?:\?|$)/.test(url)){
        return promise.then(async res => {
          try{
            const data = await res.clone().json();
            if(data && typeof data === 'object') data.selectedEventId = '';
            const headers = new Headers(res.headers || {}); headers.set('Content-Type','application/json');
            return new Response(JSON.stringify(data), {status:res.status, statusText:res.statusText, headers});
          }catch(_){ return res; }
        });
      }
      return promise;
    };
  }
  function softLogout(ev){
    if(ev){ try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ } }
    beginForce(24000);
    clearChosen();
    sessionStorage.setItem(LOGOUT_AT_KEY, String(now()));
    safe(() => fetch('/api/logout', {method:'POST', cache:'no-store', keepalive:true}).catch(()=>{}));
    safe(() => { if(typeof authUser !== 'undefined') authUser = null; });
    window.authUser = null; window.__CONTROL_EVENT_USER__ = null;
    safe(() => { if(window.ControlEventApp) window.ControlEventApp.authUser = null; });
    setNoEvent('logout');
    const ov = $('authOverlay');
    if(ov){ ov.classList.remove('hidden'); ov.removeAttribute('hidden'); ov.setAttribute('aria-hidden','false'); ov.style.setProperty('display','flex','important'); ov.style.setProperty('visibility','visible','important'); ov.style.setProperty('opacity','1','important'); ov.style.setProperty('pointer-events','auto','important'); }
    try{ document.body.classList.remove('ce-v5019-authenticated'); document.body.classList.add('auth-locked','ce-v5019-logged-out'); }catch(_){ }
    ['loginClave','changeNewPassword1','changeNewPassword2'].forEach(id => { const el=$(id); if(el) el.value=''; });
    setTimeout(() => { window.__ceV5027LogoutRunning = false; }, 200);
    return false;
  }
  function patchHardLogout(){
    // Sobrescribe la salida dura v50.27 para evitar recargar toda la app y disparar trabajo extra al volver a entrar.
    window.ControlEventV73SoftLogout = softLogout;
    if(window.ControlEventV5027) window.ControlEventV5027.hardLogout = softLogout;
    try{ window.ControlEventV5019 && (window.ControlEventV5019.logout = softLogout); }catch(_){ }
    try{ window.ControlEventV5022Logout = softLogout; window.doLogout = softLogout; }catch(_){ }
  }
  function install(){ patchFetch(); patchHardLogout(); if(auth() && forceActive()) setNoEvent('install'); }

  ['pointerdown','touchstart','click'].forEach(type => {
    window.addEventListener(type, ev => {
      const logout = ev.target?.closest?.('#btnLogout,#ceBtnSalirV518,[data-ce-action="logout"],[data-action="logout"]');
      if(logout) return softLogout(ev);
      const sel = ev.target?.closest?.('#selectedEvent');
      if(sel && sel.value && hasEvent(sel.value)) endForce();
    }, {capture:true, passive:false});
  });
  document.addEventListener('change', ev => {
    if(ev.target?.id !== 'selectedEvent') return;
    const id = String(ev.target.value || '');
    if(id && hasEvent(id)) endForce(); else if(forceActive()) setNoEvent('empty-change');
  }, true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 20)));
  [0,120,420,1100].forEach(ms => setTimeout(install, ms));

  window.ControlEventV73LoginCleanNoPreselect = {version:VERSION, versionFile:VERSION_FILE, beginForce, setNoEvent, softLogout};
})();
