/* ControlEvent v50.24 - entrada limpia tras login y proteccion de globos.
   - Tras /api/login, el primer /api/state se entrega con selectedEventId='' para obligar a elegir evento.
   - Pantalla neutra con logo CE y selector EVENTO en "Selecciona evento..." hasta que el usuario elija.
   - Evita que en iPhone/iPad el toque que abre el globo de Resumen dispare automaticamente la primera foto.
   - No toca la gestion de justificantes dentro de INGRESOS ni tickets.
*/
(function(){
  'use strict';
  const VERSION = 'ControlEvent v50.24';
  const VERSION_FILE = 'ControlEvent_v50_24';
  const INSTALLED = '__ceV5015FinalFixes';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const FORCE_KEY = 'ce_v5015_force_event_picker_after_login';
  const SELECT_KEYS = [
    'controlevent_v229_selected_event_id',
    'controlevent_v44_event_chosen_after_login',
    'ControlEvent_v50_24_event_chosen',
    'ce_v250_event_chosen',
    'ce_event_chosen'
  ];
  const PANEL_IDS = ['tabIngresos','tabDonaciones','tabCompras','tabMapaProductos','tabPlanificacionInicial','tabResumen','tabGraficas','maintenanceWrapper'];
  const DYNAMIC_IDS = ['ingresosSummaryGrid','collabList','donacionesList','comprasList','mapaProductosSummary','mapaProductosList','planificacionInicialBody','planificacionInicialList','planificacionInicialSummary','budgetLayout','summarySegmento','summaryDestino','summaryTiendaTicket','eventChartWrap'];
  const WELCOME_ICON = './assets/icons/controlevent-welcome-v44.png';

  const $ = id => document.getElementById(id);
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const now = () => Date.now();
  let loginStateWindowUntil = 0;
  let stateForcedOnce = false;
  let forcing = false;

  function stateRef(){ return safe(() => (typeof state !== 'undefined' && state) || window.state || window.ControlEventApp?.state || {}, window.state || window.ControlEventApp?.state || {}); }
  function authRef(){ return safe(() => (typeof authUser !== 'undefined' && authUser) || window.authUser || window.ControlEventApp?.authUser || null, window.authUser || window.ControlEventApp?.authUser || null); }
  function events(){ const s = stateRef(); return Array.isArray(s.eventos) ? s.eventos : []; }
  function hasValidEvent(id){ const sid = String(id == null ? stateRef().selectedEventId : id || ''); return !!sid && events().some(e => String(e.id || '') === sid); }
  function isMobileLike(){ return safe(() => window.matchMedia('(max-width: 900px)').matches, window.innerWidth <= 900) || /iPad|iPhone|Android/i.test(navigator.userAgent || ''); }

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

  function clearEventMemory(){
    SELECT_KEYS.forEach(key => {
      safe(() => sessionStorage.removeItem(key), null);
      safe(() => localStorage.removeItem(key), null);
    });
  }
  function markForcePicker(){
    clearEventMemory();
    stateForcedOnce = false;
    loginStateWindowUntil = now() + 12000;
    safe(() => sessionStorage.setItem(FORCE_KEY, String(now())), null);
  }
  function clearForcePicker(){
    safe(() => sessionStorage.removeItem(FORCE_KEY), null);
    stateForcedOnce = true;
    loginStateWindowUntil = 0;
  }
  function mustForcePicker(){
    if(!authRef()) return false;
    // v50.19: si el usuario ya ha elegido un evento valido, no seguir forzando selectedEventId=''
    // en futuras llamadas a /api/state. Esto evitaba que Refres volviera a la pantalla inicial
    // y podia dejar los globos sin inicializar tras elegir evento.
    const selected = String(stateRef().selectedEventId || document.getElementById('selectedEvent')?.value || '');
    if(selected && hasValidEvent(selected)){ clearForcePicker(); return false; }
    if(safe(() => sessionStorage.getItem(FORCE_KEY), '')) return true;
    return !stateForcedOnce && loginStateWindowUntil && now() < loginStateWindowUntil;
  }

  function injectStyle(){
    if($('ceV5015FinalStyle')) return;
    const style = document.createElement('style');
    style.id = 'ceV5015FinalStyle';
    style.textContent = `
      body.ce-v5015-awaiting-event #tabIngresos,
      body.ce-v5015-awaiting-event #tabDonaciones,
      body.ce-v5015-awaiting-event #tabCompras,
      body.ce-v5015-awaiting-event #tabMapaProductos,
      body.ce-v5015-awaiting-event #tabPlanificacionInicial,
      body.ce-v5015-awaiting-event #tabResumen,
      body.ce-v5015-awaiting-event #tabGraficas,
      body.ce-v5015-awaiting-event #maintenanceWrapper{display:none!important;}
      body.ce-v5015-awaiting-event #noEventMessage{display:flex!important;align-items:center!important;justify-content:center!important;min-height:48vh!important;background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important;}
      body.ce-v5015-awaiting-event #selectedEvent{outline:2px solid rgba(245,158,11,.75)!important;box-shadow:0 0 0 4px rgba(245,158,11,.18)!important;}
      .ce-v5015-welcome{width:min(560px,92vw);margin:22px auto;text-align:center;padding:30px 22px;border-radius:28px;background:rgba(255,255,255,.90);box-shadow:0 20px 50px rgba(15,23,42,.12);border:1px solid rgba(148,163,184,.22);}
      .ce-v5015-welcome img{display:block;width:min(220px,52vw);height:auto;margin:0 auto 18px auto;border-radius:34px;filter:drop-shadow(0 16px 28px rgba(15,23,42,.24));}
      .ce-v5015-welcome h2{margin:0 0 8px 0;font-size:clamp(21px,3.2vw,31px);letter-spacing:-.02em;color:#0f172a;}
      .ce-v5015-welcome p{margin:0;color:#475569;font-size:15px;line-height:1.45;}
      @media(max-width:760px){.ce-v5015-welcome{padding:24px 16px;border-radius:24px}.ce-v5015-welcome img{width:min(172px,54vw);border-radius:28px}}
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
    sel.disabled = false;
    sel.classList.add('ce-v5015-awaiting');
    sel.style.pointerEvents = 'auto';
    sel.style.opacity = '1';
  }

  function clearDynamicWorkAreas(){
    DYNAMIC_IDS.forEach(id => {
      const el = $(id);
      if(!el) return;
      if(id === 'budgetLayout') return;
      try{ el.replaceChildren(); }catch(_){ el.innerHTML = ''; }
    });
  }

  function renderAwaitingShell(){
    injectStyle();
    applyVersion();
    try{ document.body.classList.add('ce-v5015-awaiting-event','ce-v44-awaiting-event'); }catch(_){ }
    PANEL_IDS.forEach(id => $(id)?.classList.add('hidden'));
    const msg = $('noEventMessage');
    if(msg){
      msg.classList.remove('hidden');
      msg.classList.add('ce-v44-welcome-card');
      msg.innerHTML = `<div class="ce-v5015-welcome"><img src="${WELCOME_ICON}" alt="ControlEvent"><h2>Selecciona un evento para trabajar</h2><p>Elige el evento en el desplegable superior. Hasta entonces la pantalla queda limpia y no se inicializan globos a medias.</p></div>`;
    }
    ensureSelectPlaceholder();
    clearDynamicWorkAreas();
  }

  function forcePickerAfterLogin(reason){
    if(forcing || !mustForcePicker()) return false;
    const s = stateRef();
    if(!s || !Array.isArray(s.eventos)) return false;
    forcing = true;
    try{
      clearEventMemory();
      if(s.selectedEventId) s.__ceV5015PreviousEventId = s.selectedEventId;
      s.selectedEventId = '';
      try{ currentMainTab = 'graficas'; }catch(_){ }
      try{ window.__ceCurrentMainTab = 'graficas'; }catch(_){ }
      try{ if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab = 'graficas'; }catch(_){ }
      renderAwaitingShell();
      setTimeout(renderAwaitingShell, 50);
      setTimeout(() => { renderAwaitingShell(); applyVersion(); }, 220);
      return true;
    }finally{
      forcing = false;
    }
  }

  function patchFetchForLoginState(){
    if(window.fetch?.__ceV5015Patched) return;
    const nativeFetch = window.fetch.bind(window);
    const patched = async function(input, init){
      const url = String((input && input.url) || input || '');
      const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      const isLogin = /\/api\/login(?:\?|$)/.test(url) && method === 'POST';
      const isState = /\/api\/state(?:\?|$)/.test(url) && method === 'GET';
      if(isLogin) markForcePicker();
      const response = await nativeFetch(input, init);
      if(isState && mustForcePicker() && response && response.ok){
        try{
          const data = await response.clone().json();
          if(data && typeof data === 'object' && Array.isArray(data.eventos)){
            data.__ceV5015PreviousEventId = data.selectedEventId || '';
            data.selectedEventId = '';
            const headers = new Headers(response.headers);
            headers.set('content-type','application/json; charset=utf-8');
            setTimeout(() => { forcePickerAfterLogin('api-state'); }, 60);
            setTimeout(() => { forcePickerAfterLogin('api-state-late'); }, 360);
            return new Response(JSON.stringify(data), {status:response.status, statusText:response.statusText, headers});
          }
        }catch(_){ }
      }
      return response;
    };
    patched.__ceV5015Patched = true;
    patched.__ceV5015Native = nativeFetch;
    window.fetch = patched;
  }

  function patchSelectedEventChange(){
    if(document.__ceV5015SelectedPatch) return;
    document.__ceV5015SelectedPatch = true;
    document.addEventListener('change', ev => {
      if(ev.target?.id !== 'selectedEvent') return;
      const id = String(ev.target.value || '');
      if(id){
        clearForcePicker();
        try{ sessionStorage.setItem('controlevent_v44_event_chosen_after_login','1'); sessionStorage.setItem('ControlEvent_v50_24_event_chosen','1'); sessionStorage.setItem('ce_v250_event_chosen','1'); }catch(_){ }
        try{ document.body.classList.remove('ce-v5015-awaiting-event','ce-v44-awaiting-event'); }catch(_){ }
      }else{
        markForcePicker();
        setTimeout(() => forcePickerAfterLogin('selector-empty'), 0);
      }
    }, true);
  }

  function patchBudgetPhotoAutoOpen(){
    if(window.__ceV5015BudgetPhotoGuard) return;
    window.__ceV5015BudgetPhotoGuard = true;
    ['pointerup','touchend','click'].forEach(type => {
      window.addEventListener(type, ev => {
        const thumb = ev.target?.closest?.('#ceBudgetLiteTooltipV307 .ce-v465-tip-thumb');
        if(!thumb) return;
        const box = $('ceBudgetLiteTooltipV307');
        const openedAt = Number(box?.dataset?.ceBudgetOpenedAt || 0);
        if(openedAt && now() - openedAt < 700){
          try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ }
          return false;
        }
        return undefined;
      }, {capture:true, passive:false});
    });
  }

  function install(){
    injectStyle();
    applyVersion();
    patchFetchForLoginState();
    patchSelectedEventChange();
    patchBudgetPhotoAutoOpen();
    if(mustForcePicker()) forcePickerAfterLogin('install');
  }

  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 20)));
  [0,120,500,1200].forEach(ms => setTimeout(install, ms));

  window.ControlEventV5015 = {version:VERSION, versionFile:VERSION_FILE, install, forcePickerAfterLogin, renderAwaitingShell, clearEventMemory};
})();
