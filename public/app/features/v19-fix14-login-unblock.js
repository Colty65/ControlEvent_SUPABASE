// ControlEvent v23_prod · FIX14
// Desbloqueo de login: evita que los parches de selector/boot intercepten la entrada antes de autenticar.
(function(){
  'use strict';
  if(window.__CE_V19_FIX14_LOGIN_UNBLOCK__) return;
  window.__CE_V19_FIX14_LOGIN_UNBLOCK__ = true;
  const VERSION = 'v23_prod_FIX14_login_unblock';
  const $ = id => document.getElementById(id);
  const trim = v => String(v == null ? '' : v).trim();
  const arr = v => Array.isArray(v) ? v : [];
  let busy = false;

  function setText(id, txt){ const el=$(id); if(el) el.textContent = txt || ''; }
  function userName(u){ return trim(u?.nombre || u?.Nombre || u?.identificacion || u?.Identificacion || 'Usuario'); }
  function userLevel(u){ return trim(u?.nivel || u?.Nivel || ''); }
  function normalUser(u){
    if(!u || typeof u !== 'object') return null;
    const identificacion = trim(u.Identificacion || u.identificacion || u.IDENTIFICACION || u.usuario || u.user);
    const nombre = trim(u.Nombre || u.nombre || u.NOMBRE || u.name || identificacion);
    const nivel = trim(u.Nivel || u.nivel || u.NIVEL || u.rol || u.Rol || 'RO');
    if(!identificacion && !nombre) return null;
    return { ...u, identificacion, nombre, nivel, Identificacion:identificacion, Nombre:nombre, Nivel:nivel, ce_acceso:{Identificacion:identificacion, Nombre:nombre, Nivel:nivel} };
  }
  function storeUser(u0){
    const u = normalUser(u0); if(!u) return null;
    try{ window.authUser = u; }catch(_){ }
    try{ Function('u','authUser=u;')(u); }catch(_){ }
    window.ControlEventLoginUser = u;
    window.__CONTROL_EVENT_LOGIN_USER__ = u;
    window.__CONTROL_EVENT_CE_ACCESO__ = u.ce_acceso;
    try{ if(window.ControlEventApp){ window.ControlEventApp.authUser = u; window.ControlEventApp.ceAccesoUsuario = u.ce_acceso; } }catch(_){ }
    try{ sessionStorage.setItem('ControlEvent_v23_prod_login_user', JSON.stringify(u)); sessionStorage.setItem('ControlEvent_ce_acceso_usuario', JSON.stringify(u.ce_acceso)); }catch(_){ }
    try{ localStorage.setItem('ControlEvent_v23_prod_login_user', JSON.stringify(u)); localStorage.setItem('ControlEvent_ce_acceso_usuario', JSON.stringify(u.ce_acceso)); }catch(_){ }
    setText('currentUserName', userName(u));
    setText('brandCurrentUserName', userName(u));
    setText('currentUserLevel', userLevel(u) ? '('+userLevel(u)+')' : '');
    setText('brandCurrentUserMeta', userLevel(u));
    return u;
  }
  function stateObj(){
    let s = window.state || window.ControlEventApp?.state || window.ControlEventState || window.AppState;
    if(!s || typeof s !== 'object'){
      s = {};
      try{ window.state = s; }catch(_){ }
    }
    return s;
  }
  function mergeState(serverState){
    const base = serverState && typeof serverState === 'object' ? serverState : {};
    let merged = base;
    try{ if(typeof window.mergeLoadedState === 'function' && typeof window.defaultState === 'function') merged = window.mergeLoadedState(base, window.defaultState()); }catch(_){ }
    const s = stateObj();
    try{ Object.keys(s).forEach(k => delete s[k]); }catch(_){ }
    Object.assign(s, merged || {});
    s.selectedEventId = '';
    try{ window.state = s; }catch(_){ }
    try{ if(window.ControlEventApp) window.ControlEventApp.state = s; }catch(_){ }
    try{ if(window.ControlEventState) Object.assign(window.ControlEventState, s); }catch(_){ }
    return s;
  }
  function fillEventSelect(s){
    const sel = $('selectedEvent'); if(!sel) return;
    const eventos = arr(s?.eventos || window.state?.eventos || []);
    const old = '';
    const frag = document.createDocumentFragment();
    const ph = document.createElement('option'); ph.value=''; ph.textContent = eventos.length ? 'Selecciona evento...' : 'Sin eventos'; frag.appendChild(ph);
    eventos.slice().sort((a,b)=>String(a.fechaIni||a.fecha_ini||'').localeCompare(String(b.fechaIni||b.fecha_ini||'')) || String(a.titulo||a.nombre||'').localeCompare(String(b.titulo||b.nombre||''),'es',{numeric:true,sensitivity:'base'})).forEach(ev => {
      if(!trim(ev?.id)) return;
      const opt=document.createElement('option'); opt.value=trim(ev.id); opt.textContent=trim(ev.titulo || ev.nombre || ev.Evento || ev.title || 'Evento'); frag.appendChild(opt);
    });
    sel.innerHTML=''; sel.appendChild(frag); sel.value=old; sel.disabled=false; sel.style.pointerEvents='auto'; sel.style.opacity='1';
  }
  function showAwaitingEvent(){
    try{ document.body.classList.remove('auth-locked','ce-v447-login-loading','ce-v5019-logged-out','ce-v5022-logged-out','ce-v17-has-event','ce-v17-fix25-has-event'); }catch(_){ }
    try{ document.body.classList.add('ce-v5015-awaiting-event','ce-v44-awaiting-event'); }catch(_){ }
    ['tabIngresos','tabDonaciones','tabCompras','tabMapaProductos','tabPlanificacionInicial','tabResumen','tabGraficas','maintenanceWrapper','tabDocumentos'].forEach(id => $(id)?.classList.add('hidden'));
    const msg = $('noEventMessage');
    if(msg){ msg.classList.remove('hidden'); msg.style.display='flex'; }
    try{ if(typeof window.setCurrentTab === 'function') window.setCurrentTab('graficas'); }catch(_){ }
    try{ window.currentMainTab = 'graficas'; window.__ceCurrentMainTab = 'graficas'; }catch(_){ }
  }
  function hideAuth(){
    const o = $('authOverlay');
    if(o){ o.classList.add('hidden'); o.style.display='none'; o.style.visibility='hidden'; o.setAttribute('aria-hidden','true'); }
    const c = $('loginClave'); if(c) c.value='';
    setText('authError','');
  }
  function callRenders(){
    ['renderHeader','renderActiveTab','render','renderGraficas'].forEach(name => { try{ if(typeof window[name] === 'function') window[name](); }catch(_){ } });
    try{ window.ControlEventV447?.render?.({force:true, delay:0, reason:'fix14-login'}); }catch(_){ }
    try{ window.ControlEventV19Fix13?.syncEventDropdownFromState?.(); }catch(_){ }
    try{ window.ControlEventV19Fix13?.ensureBootEventsLoaded?.('fix14-login-ok'); }catch(_){ }
    try{ window.dispatchEvent(new CustomEvent('controlevent:login-ok', {detail:{source:VERSION}})); }catch(_){ }
  }
  async function fix14Login(){
    if(busy) return false;
    const ident = trim($('loginIdentificacion')?.value || '');
    const clave = String($('loginClave')?.value || '');
    const btn = $('btnLogin');
    if(!ident || !clave){ setText('authError','Introduce identificación y clave.'); return false; }
    busy = true;
    const oldTxt = btn?.textContent;
    if(btn){ btn.disabled=true; btn.textContent='Entrando...'; }
    setText('authError','');
    try{
      const res = await fetch('/api/login?fix14=1&ts='+Date.now(), {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({identificacion:ident, clave})});
      const data = await res.json().catch(() => ({}));
      if(!res.ok || !data.ok || !data.user) throw new Error(data.error || 'Identificación o clave no válidos.');
      const user = storeUser(data.user);
      const stRes = await fetch('/api/state?boot=1&fix14=login&ts='+Date.now(), {cache:'no-store', headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}});
      if(!stRes.ok) throw new Error('Acceso correcto, pero no se pudo cargar el catálogo de eventos.');
      const serverState = await stRes.json();
      const s = mergeState({...serverState, usuarioLogado:user, ce_acceso_usuario_logado:user?.ce_acceso});
      fillEventSelect(s);
      hideAuth();
      showAwaitingEvent();
      callRenders();
      [80,250,700,1400].forEach(ms => setTimeout(() => { fillEventSelect(stateObj()); callRenders(); }, ms));
      return false;
    }catch(err){
      console.error('[FIX14] Login desbloqueado falló', err);
      setText('authError', err?.message || String(err));
      return false;
    }finally{
      busy = false;
      if(btn){ btn.disabled=false; btn.textContent=oldTxt || 'Entrar'; }
    }
  }
  function onLoginEvent(ev){
    const target = ev.target?.closest?.('#btnLogin');
    if(!target) return;
    ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
    fix14Login();
    return false;
  }
  function onLoginEnter(ev){
    if(ev.key !== 'Enter') return;
    const id = ev.target?.id || '';
    if(id !== 'loginIdentificacion' && id !== 'loginClave') return;
    ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
    fix14Login();
    return false;
  }
  // Se registra antes de v44-7 para ganar prioridad al capturador antiguo.
  window.addEventListener('click', onLoginEvent, true);
  window.addEventListener('keydown', onLoginEnter, true);
  window.ControlEventV19Fix14Login = {login:fix14Login, version:VERSION};
})();
