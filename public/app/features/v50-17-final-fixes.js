/* ControlEvent v1.0/pr - flujo único login/evento y globos estables.
   - Retira la dependencia de los parches v50.15/v50.19: no intercepta /api/state.
   - Tras login: estado neutro con CE grande y selector "Selecciona evento...".
   - Tras elegir evento: limpia marcas de espera, carga/rehidrata ventanas y globos.
   - Refres: actualiza en el mismo evento y pestaña.
   - Globos de Resumen: retagia las miniaturas Just. para usar un visor ligero propio y no bloquear iPad.
   - No toca el bloque de justificantes dentro de INGRESOS. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v1.0/pr';
  const VERSION_FILE = 'ControlEvent_v1_0_pr';
  const INSTALLED = '__ceV5017FinalFixes';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const DOCK_ID = 'ceMobileActionDockV517';
  const OLD_DOCK_ID = 'ceMobileActionDockV514';
  const STYLE_ID = 'ceV5017FinalStyle';
  const BUDGET_TIP_ID = 'ceBudgetLiteTooltipV307';
  const SELECT_KEY = 'controlevent_v229_selected_event_id';
  const CHOSEN_KEYS = ['controlevent_v44_event_chosen_after_login','ControlEvent_v50_24_event_chosen','ce_v5017_event_chosen'];
  const FORCE_KEYS = ['ce_v5015_force_event_picker_after_login','ce_v5013_require_event_choice','ce_v5013_user_picked_event'];
  const STORAGE_SESSION_KEY = 'ControlEvent_v50_24_session';
  const TABS = ['ingresos','donaciones','compras','mapa','planificacion','resumen','graficas'];
  const PANEL_BY_TAB = {ingresos:'tabIngresos',donaciones:'tabDonaciones',compras:'tabCompras',mapa:'tabMapaProductos',planificacion:'tabPlanificacionInicial',resumen:'tabResumen',graficas:'tabGraficas'};
  const BUTTON_BY_TAB = {ingresos:'tabIngresosBtn',donaciones:'tabDonacionesBtn',compras:'tabComprasBtn',mapa:'tabMapaBtn',planificacion:'tabPlanificacionBtn',resumen:'tabResumenBtn',graficas:'tabGraficasBtn'};

  const $ = id => document.getElementById(id);
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const stop = ev => { try{ ev?.preventDefault?.(); ev?.stopPropagation?.(); ev?.stopImmediatePropagation?.(); }catch(_){ } return false; };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const money = v => { try{ return (typeof window.money === 'function') ? window.money(Number(v || 0)) : new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0)); }catch(_){ return `${Number(v||0).toFixed(2)} €`; } };
  const getLexical = name => safe(() => Function('return (typeof '+name+' !== "undefined") ? '+name+' : undefined;')(), undefined);
  const setLexical = (name, value) => safe(() => Function('value', name + ' = value;')(value), undefined);
  const getFn = name => safe(() => (typeof window[name] === 'function') ? window[name] : Function('return (typeof '+name+' === "function") ? '+name+' : null;')(), null);
  const call = (name, args) => { const fn = getFn(name); if(typeof fn !== 'function') return undefined; try{ return fn.apply(window, args || []); }catch(error){ console.warn('[v50.19] Error en '+name, error); return undefined; } };
  const st = () => getLexical('state') || window.state || window.ControlEventApp?.state || {};
  const auth = () => getLexical('authUser') || window.authUser || window.ControlEventApp?.authUser || null;
  const arr = k => Array.isArray(st()[k]) ? st()[k] : [];
  const currentEventId = () => String(st().selectedEventId || $('selectedEvent')?.value || '');
  const eventById = id => arr('eventos').find(e => String(e.id || '') === String(id || '')) || null;
  const hasValidEvent = id => !!eventById(id == null ? st().selectedEventId : id);
  const role = () => up(auth()?.nivel || '');
  const isRO = () => role() === 'RO';
  const isMobileLike = () => safe(() => window.matchMedia('(max-width: 900px)').matches, window.innerWidth <= 900) || /iPad|iPhone|Android/i.test(navigator.userAgent || '');

  function roleAllowsTab(tab){
    if(!auth()) return false;
    if(isRO()) return ['resumen','mapa','graficas'].includes(String(tab || ''));
    if(String(tab || '') === 'planificacion') return role() === 'GD';
    return TABS.includes(String(tab || ''));
  }
  function currentTab(){
    const lexical = safe(() => (typeof currentMainTab !== 'undefined' ? currentMainTab : ''), '');
    if(TABS.includes(String(lexical))) return String(lexical);
    const appTab = safe(() => window.ControlEventApp?.navigation?.currentMainTab || '', '');
    if(TABS.includes(String(appTab))) return String(appTab);
    const visible = TABS.find(tab => { const p = $(PANEL_BY_TAB[tab]); return p && !p.classList.contains('hidden'); });
    return visible || (isRO() ? 'resumen' : 'graficas');
  }
  function setTab(tab){
    let next = TABS.includes(String(tab)) ? String(tab) : (isRO() ? 'resumen' : 'graficas');
    if(auth() && !roleAllowsTab(next)) next = isRO() ? 'resumen' : 'graficas';
    setLexical('currentMainTab', next);
    try{ if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab = next; }catch(_){ }
    try{ window.__ceCurrentMainTab = next; }catch(_){ }
    return next;
  }
  function chosen(){ return CHOSEN_KEYS.some(k => safe(() => sessionStorage.getItem(k) === '1', false)); }
  function markChosen(){ CHOSEN_KEYS.forEach(k => safe(() => sessionStorage.setItem(k, '1'), null)); }
  function clearChosen(){ CHOSEN_KEYS.forEach(k => safe(() => sessionStorage.removeItem(k), null)); }
  function rememberEvent(id){ if(!hasValidEvent(id)) return; safe(() => sessionStorage.setItem(SELECT_KEY, String(id)), null); safe(() => localStorage.setItem(SELECT_KEY, String(id)), null); }
  function forgetEvent(){ safe(() => sessionStorage.removeItem(SELECT_KEY), null); safe(() => localStorage.removeItem(SELECT_KEY), null); }
  function clearForceMarkers(){ FORCE_KEYS.forEach(k => safe(() => sessionStorage.removeItem(k), null)); }

  function injectStyle(){
    if($(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${OLD_DOCK_ID}{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      #${DOCK_ID}{display:none;visibility:hidden;position:fixed!important;right:calc(env(safe-area-inset-right,0px) + 1px)!important;bottom:calc(env(safe-area-inset-bottom,0px) + 2px)!important;left:auto!important;top:auto!important;z-index:190000!important;flex-direction:column!important;gap:2px!important;align-items:flex-end!important;justify-content:flex-end!important;opacity:.54!important;pointer-events:none!important;}
      #${DOCK_ID}:active,#${DOCK_ID}:focus-within{opacity:.98!important;}
      #${DOCK_ID} button{pointer-events:auto!important;touch-action:manipulation!important;appearance:none!important;-webkit-appearance:none!important;width:52px!important;min-width:52px!important;height:27px!important;min-height:27px!important;border-radius:999px!important;border:1px solid rgba(15,23,42,.16)!important;background:rgba(255,255,255,.70)!important;color:#111827!important;box-shadow:0 4px 12px rgba(15,23,42,.14)!important;font-size:10px!important;font-weight:900!important;line-height:1!important;margin:0!important;padding:0 5px!important;backdrop-filter:blur(4px)!important;-webkit-backdrop-filter:blur(4px)!important;}
      body.auth-locked #${DOCK_ID},body:not(.ce-v5017-authenticated) #${DOCK_ID}{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      @media(min-width:901px){#${DOCK_ID}{display:none!important;visibility:hidden!important;}}
      body.ce-v5017-awaiting-event #noEventMessage{display:flex!important;align-items:center!important;justify-content:center!important;min-height:48vh!important;background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important;}
      body.ce-v5017-awaiting-event #selectedEvent{outline:2px solid rgba(245,158,11,.72)!important;box-shadow:0 0 0 4px rgba(245,158,11,.14)!important;}
      .ce-v5017-welcome{width:min(560px,92vw);margin:22px auto;text-align:center;padding:30px 22px;border-radius:28px;background:rgba(255,255,255,.92);box-shadow:0 20px 50px rgba(15,23,42,.12);border:1px solid rgba(148,163,184,.22);}
      .ce-v5017-welcome img{display:block;width:min(220px,52vw);height:auto;margin:0 auto 18px auto;border-radius:34px;filter:drop-shadow(0 16px 28px rgba(15,23,42,.24));}
      .ce-v5017-welcome h2{margin:0 0 8px 0;font-size:clamp(21px,3.2vw,31px);letter-spacing:-.02em;color:#0f172a;}
      .ce-v5017-welcome p{margin:0;color:#475569;font-size:15px;line-height:1.45;}
      #${BUDGET_TIP_ID}.open{pointer-events:auto!important;z-index:4200!important;}
      #${BUDGET_TIP_ID} .ce-budget-lite-close{position:sticky!important;top:0!important;float:right!important;z-index:12!important;min-width:42px!important;min-height:42px!important;font-size:25px!important;line-height:1!important;touch-action:manipulation!important;}
      #${BUDGET_TIP_ID} .ce-budget-lite-table-wrap{overflow:auto!important;-webkit-overflow-scrolling:touch!important;max-width:100%!important;}
      #${BUDGET_TIP_ID} .ce-v5017-budget-thumb{appearance:none!important;-webkit-appearance:none!important;width:34px!important;height:34px!important;min-width:34px!important;border:1px solid #cbd5e1!important;background:#fff!important;border-radius:8px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;padding:0!important;overflow:hidden!important;touch-action:manipulation!important;cursor:pointer!important;}
      #${BUDGET_TIP_ID} .ce-v5017-budget-thumb img{width:100%!important;height:100%!important;display:block!important;object-fit:cover!important;pointer-events:none!important;}
      .ce-v5017-budget-modal{position:fixed!important;inset:0!important;z-index:210000!important;background:rgba(15,23,42,.62)!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:14px!important;overscroll-behavior:contain!important;touch-action:none!important;}
      .ce-v5017-budget-modal-card{width:min(760px,96vw)!important;max-height:92vh!important;overflow:auto!important;-webkit-overflow-scrolling:touch!important;background:#fff!important;border-radius:22px!important;box-shadow:0 24px 80px rgba(15,23,42,.36)!important;padding:12px!important;touch-action:auto!important;}
      .ce-v5017-budget-modal-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;padding:4px 4px 10px!important;font-weight:900!important;color:#0f172a!important;}
      .ce-v5017-budget-modal-close{min-width:44px!important;min-height:38px!important;border-radius:12px!important;border:1px solid #cbd5e1!important;background:#fff!important;font-weight:900!important;}
      .ce-v5017-budget-modal-info{margin:0 0 10px 0!important;padding:9px 10px!important;border:1px solid #e2e8f0!important;border-radius:14px!important;background:#f8fafc!important;color:#334155!important;font-size:13px!important;line-height:1.35!important;}
      .ce-v5017-budget-modal-info strong{display:block!important;font-size:15px!important;color:#0f172a!important;margin-bottom:4px!important;}
      .ce-v5017-budget-modal-img{display:block!important;max-width:100%!important;max-height:62vh!important;width:auto!important;height:auto!important;margin:0 auto!important;border-radius:14px!important;object-fit:contain!important;background:#f8fafc!important;}
      @media(max-width:760px){.ce-v5017-welcome{padding:24px 16px;border-radius:24px}.ce-v5017-welcome img{width:min(172px,54vw);border-radius:28px}.ce-v5017-budget-modal{padding:7px!important}.ce-v5017-budget-modal-card{max-height:94vh!important;border-radius:18px!important}.ce-v5017-budget-modal-img{max-height:58vh!important}}
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

  function ensureEventPlaceholder(){
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
  function clearDynamicPanels(){
    ['ingresosSummaryGrid','collabList','donacionesList','comprasList','mapaProductosSummary','mapaProductosList','budgetLayout','summarySegmento','summaryDestino','summaryTiendaTicket','eventChartWrap'].forEach(id => {
      const el = $(id); if(!el) return; try{ el.replaceChildren(); }catch(_){ el.innerHTML = ''; }
    });
  }
  function renderAwaitingShell(){
    if(!auth() || hasValidEvent()) return false;
    injectStyle(); applyVersion(); clearForceMarkers(); forgetEvent(); clearChosen();
    try{ document.body.classList.add('ce-v5017-authenticated','ce-v5017-awaiting-event','ce-v44-awaiting-event'); document.body.classList.remove('ce-v5016-has-event','ce-v5015-awaiting-event'); }catch(_){ }
    Object.values(PANEL_BY_TAB).forEach(id => $(id)?.classList.add('hidden'));
    const msg = $('noEventMessage');
    if(msg){
      msg.classList.remove('hidden');
      msg.innerHTML = '<div class="ce-v5017-welcome"><img src="./assets/icons/controlevent-welcome-v44.png" alt="ControlEvent"><h2>Selecciona un evento para trabajar</h2><p>Elige el evento en el desplegable superior para cargar todos los datos y activar los globos.</p></div>';
    }
    ensureEventPlaceholder();
    clearDynamicPanels();
    ensureMobileDock();
    return true;
  }
  function forceAwaitingShell(){
    if(!auth()) return false;
    const s = st();
    if(s) s.selectedEventId = '';
    const sel = $('selectedEvent'); if(sel) sel.value = '';
    clearChosen(); forgetEvent(); clearForceMarkers();
    return renderAwaitingShell();
  }
  function finalizeEventVisuals(id){
    if(!hasValidEvent(id)) return;
    try{ document.body.classList.remove('ce-v5017-awaiting-event','ce-v5015-awaiting-event','ce-v44-awaiting-event'); document.body.classList.add('ce-v5017-authenticated','ce-v5017-has-event'); }catch(_){ }
    const msg = $('noEventMessage'); if(msg) msg.classList.add('hidden');
    const sel = $('selectedEvent'); if(sel) sel.value = String(id);
    markChosen(); rememberEvent(id); clearForceMarkers();
  }

  function renderTabContents(tab){
    if(!hasValidEvent()) return;
    const active = setTab(tab || currentTab());
    try{ window.ControlEventModules?.activate?.(active, {reason:'v50.19-render-tab'}); }catch(_){ }
    call('renderHeader'); call('renderMainSelectors');
    switch(active){
      case 'ingresos': call('renderIngresosSummary'); call('renderColabs'); break;
      case 'donaciones': call('renderDonaciones'); break;
      case 'compras': call('renderCompras'); break;
      case 'mapa': call('renderMapaProductos'); break;
      case 'planificacion': if(typeof window.showPlanificacionInicial === 'function') safe(() => window.showPlanificacionInicial(), null); else safe(() => window.ControlEventPlanificacion?.show?.(), null); break;
      case 'resumen': call('renderBudget'); safe(() => window.ControlEventBudgetLiteTips?.sanitize?.(), null); retagBudgetThumbs(); break;
      case 'graficas': call('renderGraficas', [{force:true, reason:'v50.19'}]); break;
    }
    call('renderPermissions'); call('renderLockState'); applyVersion(); ensureMobileDock();
  }
  function warmAllData(reason){
    if(!hasValidEvent()) return;
    const id = currentEventId();
    const originalTab = currentTab();
    finalizeEventVisuals(id);
    // Render de datos de gestión sin cambiar la pestaña visible: deja listas disponibles al entrar en ellas.
    call('renderHeader'); call('renderMainSelectors'); call('renderIngresosSummary'); call('renderColabs'); call('renderDonaciones'); call('renderCompras');
    if(originalTab === 'resumen') { call('renderBudget'); safe(() => window.ControlEventBudgetLiteTips?.sanitize?.(), null); }
    if(originalTab === 'mapa') call('renderMapaProductos');
    if(originalTab === 'graficas') call('renderGraficas', [{force:true, reason:'v50.19-warm'}]);
    setTab(originalTab);
    try{ window.ControlEventV447?.renderActive?.(originalTab); }catch(_){ }
    hydrateAfterRender(reason || 'warm');
  }
  function hydrateAfterRender(reason){
    if(!hasValidEvent()) return;
    safe(() => window.ControlEventBudgetLiteTips?.sanitize?.(), null);
    safe(() => window.ControlEventV469?.enrichOpenTooltips?.(), null);
    safe(() => window.ControlEventV467?.enrichOpenTooltips?.(), null);
    retagBudgetThumbs();
    applyVersion(); ensureMobileDock();
  }
  function scheduleFullEventReady(id, reason){
    if(!hasValidEvent(id)) return;
    finalizeEventVisuals(id);
    [80,240,620,1200,2200].forEach(ms => setTimeout(() => { if(hasValidEvent(id)) warmAllData(reason); }, ms));
  }

  function patchChangeSelected(){
    const old = getFn('changeSelectedEvent') || window.changeSelectedEvent;
    if(typeof old !== 'function' || old.__ceV5017Wrapped) return;
    const wrapped = function(value){
      const id = String(value || '');
      if(!id || !eventById(id)){
        clearChosen(); forgetEvent();
        const ret = old.apply(this, arguments);
        setTimeout(renderAwaitingShell, 60);
        return ret;
      }
      clearForceMarkers(); markChosen(); rememberEvent(id);
      let ret;
      try{ ret = old.apply(this, arguments); }
      catch(error){ console.warn('[v50.19] changeSelectedEvent original falló; uso selectEvent directo', error); ret = undefined; }
      try{
        if(String(currentEventId()) !== id && window.ControlEventV447?.selectEvent){
          window.ControlEventV447.selectEvent(id, {force:true, delay:isMobileLike()?160:40});
        }
      }catch(_){ }
      scheduleFullEventReady(id, 'event-selected');
      return ret;
    };
    wrapped.__ceV5017Wrapped = true;
    setLexical('changeSelectedEvent', wrapped);
    window.changeSelectedEvent = wrapped;
    try{ if(window.ControlEventApp?.actions) window.ControlEventApp.actions.changeSelectedEvent = wrapped; }catch(_){ }
  }

  function mergeFreshStatePreserving(fresh, eventId){
    const target = st();
    let merged = fresh || {};
    try{ if(typeof mergeLoadedState === 'function' && typeof defaultState === 'function') merged = mergeLoadedState(fresh, defaultState()); }catch(_){ }
    try{ Object.keys(target).forEach(k => delete target[k]); }catch(_){ }
    Object.assign(target, merged || {});
    if(eventId && arr('eventos').some(e => String(e.id || '') === String(eventId))) target.selectedEventId = String(eventId);
    try{ if(window.ControlEventApp) window.ControlEventApp.state = target; }catch(_){ }
    return target;
  }
  async function refreshInPlace(ev){
    stop(ev);
    const eventId = currentEventId();
    const tab = currentTab();
    if(!eventId || !hasValidEvent(eventId)){ renderAwaitingShell(); return false; }
    markChosen(); rememberEvent(eventId); clearForceMarkers();
    try{
      const res = await fetch('/api/state', {cache:'no-store'});
      if(res.ok){ const data = await res.json(); mergeFreshStatePreserving(data, eventId); }
    }catch(error){ console.warn('[v50.19] Refres no pudo leer /api/state', error); }
    finalizeEventVisuals(eventId);
    setTab(tab);
    renderTabContents(tab);
    scheduleFullEventReady(eventId, 'refresh-in-place');
    return false;
  }
  function logout(ev){
    stop(ev);
    clearChosen(); forgetEvent(); clearForceMarkers();
    try{ localStorage.removeItem(STORAGE_SESSION_KEY); }catch(_){ }
    const fn = getFn('doLogout') || window.doLogout || window.ControlEventApp?.actions?.doLogout;
    try{ if(typeof fn === 'function') fn(ev); else $('btnLogout')?.click(); }catch(_){ }
    setTimeout(() => { try{ document.body.classList.remove('ce-v5017-authenticated','ce-v5017-has-event','ce-v5017-awaiting-event'); }catch(_){ } ensureMobileDock(); applyVersion(); }, 120);
    return false;
  }
  function ensureMobileDock(){
    injectStyle();
    const old = $(OLD_DOCK_ID); if(old){ old.style.setProperty('display','none','important'); old.style.setProperty('visibility','hidden','important'); }
    let dock = $(DOCK_ID);
    if(!dock){
      dock = document.createElement('div');
      dock.id = DOCK_ID;
      dock.setAttribute('aria-label','Acciones rápidas');
      dock.innerHTML = '<button type="button" id="ceBtnRefresV517" aria-label="Refrescar">Refres</button><button type="button" id="ceBtnSalirV517" aria-label="Salir">Salir</button>';
      document.body.appendChild(dock);
    }
    const show = isMobileLike() && !!auth() && !document.body?.classList.contains('auth-locked');
    try{ document.body.classList.toggle('ce-v5017-authenticated', !!auth() && !document.body?.classList.contains('auth-locked')); }catch(_){ }
    dock.style.setProperty('display', show ? 'flex' : 'none', 'important');
    dock.style.setProperty('visibility', show ? 'visible' : 'hidden', 'important');
  }

  function receiptKeys(id){ const ev = currentEventId(); const sid = String(id || ''); return [`${ev}|INGRESO:${sid}`, `${ev}|INGRESO|${sid}`, `INGRESO:${ev}|${sid}`]; }
  function jsonGet(key){ try{ return JSON.parse(localStorage.getItem(key) || '{}') || {}; }catch(_){ return {}; } }
  function valueToSrc(v){ if(!v) return ''; if(typeof v === 'string') return v; if(typeof v === 'object') return v.url || v.public_url || v.publicUrl || v.pathname || v.path || v.storage_path || ''; return ''; }
  function receiptSrc(id){
    const keys = receiptKeys(id);
    const store = st().ticketImages || {};
    const refs = st().ticketImageRefs || {};
    for(const k of keys){ const s = valueToSrc(store[k]); if(s) return s; }
    for(const k of keys){ const s = valueToSrc(refs[k]); if(s) return s; }
    const b1 = jsonGet('ControlEvent_ingreso_receipts_v468');
    const b2 = jsonGet('ControlEvent_ingreso_receipts_v502');
    for(const k of keys){ const s = valueToSrc(b1[k] || b2[k]); if(s) return s; }
    return '';
  }
  function persona(id){ return arr('personas').find(p => String(p.id || '') === String(id || '')) || {}; }
  function selectedEvent(){ return arr('eventos').find(e => String(e.id || '') === currentEventId()) || {}; }
  function ingresoRow(id){ return arr('colaboradores').find(c => String(c.id || '') === String(id || '')) || {}; }
  function ingresoInfo(id){
    const row = ingresoRow(id); const p = row.persona || persona(row.personaId); const n = Number(row.numero || 0); const precio = Number(selectedEvent().precio || 0);
    const obligatorio = up(p.rango || row.rango || '') === 'SOCIO' ? n * precio : 0;
    const voluntario = Number(row.donation ?? row.importeVoluntario ?? row.importe ?? row.voluntario ?? 0) || 0;
    const total = Number(row.total ?? row.totalIngreso ?? (obligatorio + voluntario)) || 0;
    return {nombre:norm(p.nombre || row.nombre || 'Ingreso'), situacion:norm(row.situacion || row.formaPago || 'Pendiente'), rango:norm(p.rango || row.rango || ''), numero:n, obligatorio, voluntario, total};
  }
  function retagBudgetThumbs(){
    const box = $(BUDGET_TIP_ID); if(!box || !box.classList.contains('open')) return;
    box.querySelectorAll('.ce-v465-tip-thumb').forEach(btn => {
      try{
        btn.classList.remove('ce-v465-tip-thumb');
        btn.classList.add('ce-v5017-budget-thumb');
        btn.setAttribute('data-ce-v5017-budget-thumb','1');
        btn.setAttribute('title','Ver justificante');
      }catch(_){ }
    });
  }
  function showBudgetReceipt(id, ev){
    const src = receiptSrc(id);
    if(!src){ alert('Este ingreso no tiene justificante adjunto.'); return stop(ev); }
    const info = ingresoInfo(id);
    document.querySelectorAll('.ce-v5017-budget-modal').forEach(el => safe(() => el.remove(), null));
    const ov = document.createElement('div');
    ov.className = 'ce-v5017-budget-modal';
    ov.setAttribute('data-ce-preserve-tooltip','1');
    ov.innerHTML = `<div class="ce-v5017-budget-modal-card" role="dialog" aria-modal="true">
      <div class="ce-v5017-budget-modal-head"><span>Justificante de ingreso</span><button type="button" class="ce-v5017-budget-modal-close" data-close="1">Cerrar</button></div>
      <div class="ce-v5017-budget-modal-info"><strong>${esc(info.nombre)}</strong>Situación: ${esc(info.situacion)} · Rango: ${esc(info.rango || '-')} · Nº: ${esc(info.numero)}<br>Obligatorio: ${esc(money(info.obligatorio))} · Voluntario: ${esc(money(info.voluntario))} · Total: ${esc(money(info.total))}</div>
      <img class="ce-v5017-budget-modal-img" alt="Justificante de ingreso" src="${esc(src)}">
    </div>`;
    document.body.appendChild(ov);
    const close = e => { stop(e); safe(() => ov.remove(), null); retagBudgetThumbs(); return false; };
    ov.addEventListener('click', e => { if(e.target === ov || e.target?.closest?.('[data-close]')) return close(e); try{ e.stopPropagation(); }catch(_){ } }, true);
    ov.addEventListener('touchend', e => { if(e.target === ov || e.target?.closest?.('[data-close]')) return close(e); try{ e.stopPropagation(); }catch(_){ } }, {capture:true, passive:false});
    ov.addEventListener('pointerdown', e => { try{ e.stopPropagation(); }catch(_){ } }, true);
    try{ ov.querySelector('[data-close]')?.focus({preventScroll:true}); }catch(_){ }
    return stop(ev);
  }

  function installHandlers(){
    if(window.__ceV5017Handlers) return;
    window.__ceV5017Handlers = true;
    ['click','touchend','pointerup'].forEach(type => {
      window.addEventListener(type, ev => {
        if(ev.target?.closest?.('#ceBtnRefresV517')) return refreshInPlace(ev);
        if(ev.target?.closest?.('#ceBtnSalirV517')) return logout(ev);
        const thumb = ev.target?.closest?.(`#${BUDGET_TIP_ID} .ce-v5017-budget-thumb`);
        if(thumb){ const id = thumb.dataset.id || ''; if(id) return showBudgetReceipt(id, ev); }
        const close = ev.target?.closest?.(`#${BUDGET_TIP_ID} .ce-budget-lite-close`);
        if(close){ const box=$(BUDGET_TIP_ID); if(box){ box.classList.remove('open'); box.setAttribute('aria-hidden','true'); } return stop(ev); }
      }, {capture:true, passive:false});
    });
    document.addEventListener('change', ev => {
      if(ev.target?.id === 'selectedEvent'){
        const id = String(ev.target.value || '');
        if(id && eventById(id)){ markChosen(); rememberEvent(id); clearForceMarkers(); scheduleFullEventReady(id, 'selectedEvent-change'); }
        else setTimeout(renderAwaitingShell, 40);
      }
    }, true);
    document.addEventListener('click', ev => {
      if(ev.target?.closest?.('#tabIngresosBtn')) setTimeout(() => renderTabContents('ingresos'), 90);
      if(ev.target?.closest?.('#tabDonacionesBtn')) setTimeout(() => renderTabContents('donaciones'), 90);
      if(ev.target?.closest?.('#tabComprasBtn')) setTimeout(() => renderTabContents('compras'), 90);
      if(ev.target?.closest?.('#tabResumenBtn,#budgetLayout')) [80,240,520].forEach(ms => setTimeout(() => { if(currentTab()==='resumen') renderTabContents('resumen'); else hydrateAfterRender('resumen-click'); }, ms));
    }, true);
    ['controlevent:module-mounted','controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready'].forEach(evt => window.addEventListener(evt, () => setTimeout(() => { if(hasValidEvent()) hydrateAfterRender(evt); else renderAwaitingShell(); }, 80)));
    document.addEventListener('keydown', ev => { if(ev.key === 'Escape'){ const m=document.querySelector('.ce-v5017-budget-modal'); if(m) return stop(ev) || safe(() => m.remove(), null); } }, true);
  }
  function installObserver(){
    if(window.__ceV5017Observer) return;
    window.__ceV5017Observer = true;
    try{
      const mo = new MutationObserver(() => { clearTimeout(mo.__t); mo.__t = setTimeout(() => { retagBudgetThumbs(); applyVersion(); ensureMobileDock(); }, 40); });
      mo.observe(document.documentElement, {childList:true, subtree:true});
    }catch(_){ }
  }
  function install(){
    injectStyle(); applyVersion(); clearForceMarkers(); patchChangeSelected(); installHandlers(); installObserver(); ensureMobileDock();
    if(auth() && !hasValidEvent()) renderAwaitingShell();
    else if(auth() && hasValidEvent() && !chosen()) forceAwaitingShell();
    else if(auth() && hasValidEvent()) { finalizeEventVisuals(currentEventId()); hydrateAfterRender('install'); }
  }

  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 40)));
  [0,160,520,1200,2500].forEach(ms => setTimeout(install, ms));
  window.ControlEventV5017 = {version:VERSION, versionFile:VERSION_FILE, install, renderAwaitingShell, forceAwaitingShell, scheduleFullEventReady, refreshInPlace, retagBudgetThumbs};
})();
