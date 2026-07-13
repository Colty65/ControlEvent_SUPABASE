// ControlEvent v20_prod · FIX28: login rescue mínimo y prioritario.
// Objetivo: entrar sin quedarse pillado, sin reconstruir selector ni tocar Vista/Ingresos en tiempo de logon.
(function(){
  'use strict';
  if(window.__CE_V20_FIX28_LOGIN_RESCUE__) return;
  window.__CE_V20_FIX28_LOGIN_RESCUE__ = true;
  const $ = id => document.getElementById(id);
  const txt = v => String(v == null ? '' : v).trim();
  let busy = false;

  function stop(ev){ try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){} }
  function setBusy(on){
    const btn = $('btnLogin');
    if(btn){ btn.disabled = !!on; btn.textContent = on ? 'Entrando...' : 'Entrar'; }
    try{ document.body.classList.toggle('ce-fix28-login-busy', !!on); }catch(_){}
  }
  function gcall(name, ...args){
    try{ const fn = window[name] || Function('return (typeof '+name+'==="function")?'+name+':null')(); if(typeof fn === 'function') return fn(...args); }catch(_){}
  }
  function setLexical(name, value){ try{ Function('v', name+' = v;')(value); }catch(_){} }
  function stateRef(){
    try{ return Function('return (typeof state!=="undefined")?state:null')() || window.state || (window.state={}); }catch(_){ return window.state || (window.state={}); }
  }
  function mergeState(serverState){
    let merged = serverState || {};
    try{ merged = Function('s','return (typeof mergeLoadedState==="function" && typeof defaultState==="function") ? mergeLoadedState(s, defaultState()) : s;')(serverState || {}); }catch(_){}
    const s = stateRef();
    try{ Object.keys(s).forEach(k => delete s[k]); Object.assign(s, merged || {}); }catch(_){ window.state = merged || {}; }
    try{ stateRef().selectedEventId = ''; }catch(_){}
    try{ if(window.ControlEventApp) window.ControlEventApp.state = stateRef(); }catch(_){}
    return stateRef();
  }
  async function fetchJson(url, options, ms){
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms || 12000);
    try{
      const res = await fetch(url, Object.assign({cache:'no-store', signal:ctrl.signal}, options || {}));
      const text = await res.text();
      let data = {}; try{ data = text ? JSON.parse(text) : {}; }catch(_){ data = {error:text}; }
      if(!res.ok) throw new Error(data.error || text || ('HTTP '+res.status));
      return data;
    }finally{ clearTimeout(t); }
  }
  async function loadBootState(){
    try{ return await fetchJson('/api/state?boot=1', {}, 12000); }
    catch(_){ return await fetchJson('/api/state', {}, 18000); }
  }
  function forceAuthenticatedUI(user){
    try{ document.body.classList.remove('auth-locked','ce-v447-login-loading','ce-crud-ui-busy'); }catch(_){}
    const overlay = $('authOverlay');
    if(overlay){ overlay.classList.add('hidden'); overlay.style.display='none'; overlay.style.visibility='hidden'; }
    const logout = $('btnLogout'); if(logout){ logout.classList.remove('hidden'); logout.removeAttribute('hidden'); logout.disabled=false; }
    const nombre = txt(user?.nombre || user?.Nombre || user?.name || user?.identificacion || user?.Identificacion || 'Usuario');
    const ident = txt(user?.identificacion || user?.Identificacion || '');
    const nivel = txt(user?.nivel || user?.Nivel || '');
    [['brandCurrentUserName', nombre], ['currentUserName', nombre]].forEach(([id,v])=>{ const el=$(id); if(el) el.textContent=v; });
    [['brandCurrentUserMeta', (ident||'') + (nivel?` (${nivel})`:'' )], ['currentUserLevel', nivel]].forEach(([id,v])=>{ const el=$(id); if(el) el.textContent=v; });
  }

  function ensureNoEventSelected(){
    try{
      const sel=$('selectedEvent'); const s=stateRef();
      if(s) s.selectedEventId='';
      if(sel){
        const hasBlank=[...sel.options].some(o=>!txt(o.value));
        if(!hasBlank){ const opt=document.createElement('option'); opt.value=''; opt.textContent='Selecciona evento...'; sel.insertBefore(opt, sel.firstChild); }
        sel.value='';
      }
      const d=$('eventDates'); if(d) d.textContent='(del --/--/-- al --/--/--)';
    }catch(_){}
  }
  async function login(ev){
    stop(ev || window.event || {});
    if(busy) return false;
    const ident = txt($('loginIdentificacion')?.value || '');
    const clave = String($('loginClave')?.value || '');
    const error = $('authError'); if(error) error.textContent = '';
    if(!ident || !clave){ if(error) error.textContent='Introduce identificación y clave.'; return false; }
    busy = true; setBusy(true);
    try{
      const data = await fetchJson('/api/login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({identificacion:ident, clave})}, 12000);
      if(!data || !data.ok || !data.user) throw new Error(data?.error || 'Acceso no válido');
      setLexical('authUser', data.user); window.authUser = data.user; window.__CONTROL_EVENT_USER__ = data.user;
      try{ if(window.ControlEventApp) window.ControlEventApp.authUser = data.user; }catch(_){}
      try{ localStorage.setItem('ControlEvent_v20_prod_session', JSON.stringify(data.user || null)); }catch(_){}
      const serverState = await loadBootState();
      mergeState(serverState);
      try{ const p=$('loginClave'); if(p) p.value=''; }catch(_){}
      forceAuthenticatedUI(data.user);
      gcall('renderAuthUI');
      gcall('render');
      ensureNoEventSelected();
      forceAuthenticatedUI(data.user);
      setTimeout(()=>{ forceAuthenticatedUI(data.user); ensureNoEventSelected(); window.dispatchEvent(new CustomEvent('controlevent:login-ready',{detail:{user:data.user}})); }, 60);
      setTimeout(()=>{ forceAuthenticatedUI(data.user); window.dispatchEvent(new CustomEvent('controlevent:login-ready',{detail:{user:data.user}})); }, 240);
      try{ if(String(data.user?.nivel||'')==='GD') setTimeout(()=>gcall('fetchAccessUsers'), 100); }catch(_){}
    }catch(err){
      console.error('[FIX28 login rescue]', err);
      if(error) error.textContent = err?.message || String(err);
      setLexical('authUser', null); window.authUser = null;
    }finally{ busy = false; setBusy(false); }
    return false;
  }
  window.doLogin = login;
  document.addEventListener('click', ev => { if(ev.target?.closest?.('#btnLogin')) return login(ev); }, {capture:true, passive:false});
  document.addEventListener('keydown', ev => { if(ev.key==='Enter' && ev.target?.closest?.('#authOverlay') && (ev.target?.id==='loginIdentificacion' || ev.target?.id==='loginClave')) return login(ev); }, {capture:true, passive:false});
})();
