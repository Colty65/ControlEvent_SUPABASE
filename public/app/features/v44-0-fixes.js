/* ControlEvent v44.7.1 - corrección mínima sobre v44.0:
   - navegación de Planificación inicial sin contaminar el resto de pestañas;
   - entrada desde login siempre con selección de evento pendiente;
   - pantalla limpia con icono mientras se selecciona evento.
   No toca COMPRAS, DONACIONES, INFOEVENTO, BACKUP ni GRAFICAS. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v44.7.1';
  const VERSION_FILE = 'ControlEvent_v44_7_1';
  const CHOSEN_KEY = 'controlevent_v44_event_chosen_after_login';
  const OLD_CHOSEN_KEY = 'ControlEvent_v25_event_chosen';
  const WELCOME_ICON = './assets/icons/controlevent-welcome-v44.png';
  const WORK_PANELS = ['tabIngresos','tabDonaciones','tabCompras','tabMapaProductos','tabPlanificacionInicial','tabResumen','tabGraficas'];
  const TAB_BY_BUTTON = {
    tabIngresosBtn: 'ingresos',
    tabDonacionesBtn: 'donaciones',
    tabComprasBtn: 'compras',
    tabMapaBtn: 'mapa',
    tabPlanificacionBtn: 'planificacion',
    tabResumenBtn: 'resumen',
    tabGraficasBtn: 'graficas'
  };
  const $ = id => document.getElementById(id);

  function stateRef(){ try{ if(typeof state !== 'undefined') return state || {}; }catch(_){ } return window.state || window.ControlEventApp?.state || {}; }
  function authRef(){ try{ if(typeof authUser !== 'undefined') return authUser || null; }catch(_){ } return window.authUser || window.ControlEventApp?.authUser || null; }
  function events(){ const s = stateRef(); return Array.isArray(s.eventos) ? s.eventos : []; }
  function hasValidEvent(){ const s = stateRef(); const id = String(s.selectedEventId || ''); return !!id && events().some(e => String(e.id) === id); }
  function chosen(){ try{ return sessionStorage.getItem(CHOSEN_KEY) === '1'; }catch(_){ return false; } }
  function markChosen(){ try{ sessionStorage.setItem(CHOSEN_KEY, '1'); sessionStorage.setItem(OLD_CHOSEN_KEY, '1'); }catch(_){ } }
  function clearChosen(){ try{ sessionStorage.removeItem(CHOSEN_KEY); sessionStorage.removeItem(OLD_CHOSEN_KEY); }catch(_){ } }
  function setTab(tab){ if(!tab) return; try{ currentMainTab = tab; }catch(_){ } try{ if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab = tab; }catch(_){ } }
  function clearPlanStickyFlag(){ try{ if(window.__ceCurrentMainTab === 'planificacion') window.__ceCurrentMainTab = ''; }catch(_){ } }

  function applyVersion(){
    try{ document.title = VERSION; }catch(_){ }
    try{ window.__ceVersion = VERSION; if(document.body) document.body.dataset.ceVersion = VERSION; }catch(_){ }
    try{
      document.querySelectorAll('.appname span,.appname-stack span').forEach(el => {
        if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION;
      });
    }catch(_){ }
    try{
      const proto = HTMLAnchorElement.prototype;
      if(!proto.click.__ceV440VersionFile){
        const old = proto.click;
        const wrapped = function(){
          try{ if(this.download) this.download = String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }catch(_){ }
          return old.apply(this, arguments);
        };
        wrapped.__ceV440VersionFile = true;
        proto.click = wrapped;
      }
    }catch(_){ }
  }

  function injectCss(){
    if($('ceV440Style')) return;
    const style = document.createElement('style');
    style.id = 'ceV440Style';
    style.textContent = `
      #noEventMessage.ce-v44-welcome-card{display:flex;align-items:center;justify-content:center;min-height:46vh;background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important;}
      #noEventMessage.ce-v44-welcome-card.hidden{display:none!important;}
      .ce-v44-welcome{width:min(560px,92vw);margin:22px auto;text-align:center;padding:30px 22px;border-radius:28px;background:rgba(255,255,255,.88);box-shadow:0 20px 50px rgba(15,23,42,.12);border:1px solid rgba(148,163,184,.22);}
      .ce-v44-welcome img{display:block;width:min(210px,48vw);height:auto;margin:0 auto 18px auto;border-radius:34px;filter:drop-shadow(0 16px 28px rgba(15,23,42,.24));}
      .ce-v44-welcome h2{margin:0 0 8px 0;font-size:clamp(21px,3.2vw,31px);letter-spacing:-.02em;color:#0f172a;}
      .ce-v44-welcome p{margin:0;color:#475569;font-size:15px;line-height:1.45;}
      body.ce-v44-awaiting-event #tabIngresos,
      body.ce-v44-awaiting-event #tabDonaciones,
      body.ce-v44-awaiting-event #tabCompras,
      body.ce-v44-awaiting-event #tabMapaProductos,
      body.ce-v44-awaiting-event #tabPlanificacionInicial,
      body.ce-v44-awaiting-event #tabResumen,
      body.ce-v44-awaiting-event #tabGraficas{display:none!important;}
      body.ce-v44-awaiting-event #maintenanceWrapper{display:none!important;}
      #selectedEvent.ce-v44-awaiting{outline:2px solid rgba(245,158,11,.75);box-shadow:0 0 0 4px rgba(245,158,11,.18);}
      @media(max-width:760px){.ce-v44-welcome{padding:24px 16px;border-radius:24px}.ce-v44-welcome img{width:min(170px,54vw);border-radius:28px}}
    `;
    document.head.appendChild(style);
  }

  function ensureSelectPlaceholder(){
    const sel = $('selectedEvent');
    if(!sel) return;
    let opt = sel.querySelector('option[value=""]');
    if(!opt){
      opt = document.createElement('option');
      opt.value = '';
      sel.insertBefore(opt, sel.firstChild);
    }
    opt.textContent = events().length ? 'Selecciona evento...' : 'Sin eventos';
    if(!hasValidEvent()) sel.value = '';
    sel.classList.toggle('ce-v44-awaiting', !!authRef() && !hasValidEvent());
  }

  function renderWelcome(){
    const waiting = !!authRef() && !hasValidEvent();
    try{ document.body.classList.toggle('ce-v44-awaiting-event', waiting); }catch(_){ }
    const msg = $('noEventMessage');
    if(msg){
      msg.classList.toggle('hidden', !waiting);
      msg.classList.toggle('ce-v44-welcome-card', waiting);
      if(waiting){
        msg.innerHTML = `<div class="ce-v44-welcome"><img src="${WELCOME_ICON}" alt="ControlEvent" /><h2>Selecciona un evento para trabajar</h2><p>Elige el evento en el desplegable superior. Hasta entonces la pantalla de trabajo queda limpia.</p></div>`;
      }
    }
    if(waiting){
      WORK_PANELS.forEach(id => $(id)?.classList.add('hidden'));
      $('maintenanceWrapper')?.classList.add('hidden');
    }
    ensureSelectPlaceholder();
    applyVersion();
  }

  function forceEventPickerAfterLogin(){
    const s = stateRef();
    if(!authRef() || !Array.isArray(s.eventos) || chosen()) return;
    if(s.selectedEventId) s.__ceV440PreviousEventId = s.selectedEventId;
    s.selectedEventId = '';
    clearPlanStickyFlag();
  }

  function patchRender(){
    const old = (typeof render === 'function') ? render : window.render;
    if(typeof old !== 'function' || old.__ceV440Wrapped) return;
    const wrapped = function(){
      forceEventPickerAfterLogin();
      const result = old.apply(this, arguments);
      setTimeout(renderWelcome, 20);
      return result;
    };
    wrapped.__ceV440Wrapped = true;
    try{ render = wrapped; }catch(_){ }
    window.render = wrapped;
  }

  function patchLogin(){
    const old = (typeof doLogin === 'function') ? doLogin : window.doLogin;
    if(typeof old !== 'function' || old.__ceV440LoginWrapped) return;
    const wrapped = async function(){
      clearChosen();
      const result = await old.apply(this, arguments);
      try{
        if(authRef()){
          const s = stateRef();
          if(Array.isArray(s.eventos)) s.selectedEventId = '';
          clearPlanStickyFlag();
          setTab('graficas');
          if(typeof render === 'function') render(); else window.render?.();
        }
      }catch(_){ }
      setTimeout(renderWelcome, 30);
      return result;
    };
    wrapped.__ceV440LoginWrapped = true;
    try{ doLogin = wrapped; }catch(_){ }
    window.doLogin = wrapped;
  }

  function patchChangeSelectedEvent(){
    const old = window.changeSelectedEvent || (typeof changeSelectedEvent === 'function' ? changeSelectedEvent : null);
    if(typeof old !== 'function' || old.__ceV440ChangeWrapped) return;
    const wrapped = async function(value){
      const id = String(value || '');
      if(id){ markChosen(); clearPlanStickyFlag(); }
      else { clearChosen(); }
      const result = await old.apply(this, arguments);
      setTimeout(renderWelcome, 30);
      return result;
    };
    wrapped.__ceV440ChangeWrapped = true;
    wrapped.__ceV440Original = old;
    window.changeSelectedEvent = wrapped;
    try{ changeSelectedEvent = wrapped; }catch(_){ }
  }

  function patchNavigationCleanup(){
    if(document.__ceV440NavigationCleanup) return;
    document.__ceV440NavigationCleanup = true;
    document.addEventListener('click', event => {
      const trigger = event.target?.closest?.('button[id], .mobile-menu-action[data-target]');
      if(!trigger) return;
      const id = trigger.id || trigger.dataset?.target || '';
      const tab = TAB_BY_BUTTON[id] || '';
      if(!tab) return;
      if(tab !== 'planificacion'){
        clearPlanStickyFlag();
        const plan = $('tabPlanificacionInicial');
        if(plan) plan.classList.add('hidden');
        $('tabPlanificacionBtn')?.classList.remove('active');
        document.querySelectorAll('.mobile-menu-action[data-target="tabPlanificacionBtn"]').forEach(el => el.classList.remove('primary'));
      }
    }, true);
  }

  function install(){
    injectCss();
    applyVersion();
    patchRender();
    patchLogin();
    patchChangeSelectedEvent();
    patchNavigationCleanup();
    forceEventPickerAfterLogin();
    renderWelcome();
  }

  window.ControlEventV440 = {version: VERSION, install, renderWelcome};
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
  ['load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 30)));
  [80, 300, 900, 1600].forEach(ms => setTimeout(install, ms));
})();
