/* ControlEvent v8.3.2_prod - guarda de recuperacion de INGRESOS sin escrituras destructivas. */
(function(){
  'use strict';

  const VERSION = 'ControlEvent v8.3.2_prod';
  const VERSION_FILE = 'ControlEvent_v8_3_2_prod';
  const INSTALLED = '__ceV350DataRecoveryGuard';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const GUARDED_COLLECTIONS = ['eventos','personas','tiendas','productos','colaboradores','compras'];
  let serverStateCache = null;
  let serverLoad = null;
  let lastRecoverAt = 0;
  let recoverBusy = false;

  const $ = id => document.getElementById(id);
  const norm = value => String(value ?? '').trim();
  const same = (a,b) => norm(a) === norm(b);
  const num = value => {
    if(typeof value === 'number') return Number.isFinite(value) ? value : 0;
    let s = norm(value).replace(/\s/g,'').replace(/€/g,'');
    if(!s) return 0;
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',', '.');
    else if(s.includes(',')) s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  function st(){
    try{ if(typeof state !== 'undefined' && state) return state; }catch(_){ }
    return window.state || window.ControlEventApp?.state || {};
  }
  function arr(source, key){
    const s = source || st();
    return Array.isArray(s[key]) ? s[key] : [];
  }
  function getFn(name){
    try{ if(typeof window[name] === 'function') return window[name]; }catch(_){ }
    try{ return Function('return (typeof '+name+' === "function") ? '+name+' : null;')(); }catch(_){ return null; }
  }
  function setFn(name, fn){
    try{ Function('fn', name + ' = fn;')(fn); }catch(_){ }
    try{ window[name] = fn; }catch(_){ }
  }
  function call(name, ...args){
    const fn = getFn(name);
    if(typeof fn !== 'function') return undefined;
    try{ return fn(...args); }catch(error){ console.warn('[ControlEvent v8.3.2_prod]', name, error); return undefined; }
  }
  function selectedId(source){
    try{
      const ev = getFn('selectedEvent')?.();
      if(ev?.id) return norm(ev.id);
    }catch(_){ }
    const selectValue = $('selectedEvent')?.value || '';
    if(selectValue) return norm(selectValue);
    const s = source || st();
    return norm(s.selectedEventId || '');
  }
  function persona(source, id){
    return arr(source, 'personas').find(p => same(p.id, id)) || {};
  }
  function selectedEvent(source){
    const id = selectedId(source);
    return arr(source, 'eventos').find(ev => same(ev.id, id)) || {};
  }
  function eventIdOf(row){
    return norm(row?.eventId || row?.event_id || row?.eventoId || row?.EVENTO_ID || '');
  }
  function personaIdOf(row){
    return norm(row?.personaId || row?.persona_id || row?.PERSONA_ID || '');
  }
  function ingresoOf(row){
    return norm(row?.situacion || row?.ingreso || row?.formaPago || 'Pendiente') || 'Pendiente';
  }
  function enrich(source, row){
    const eventId = eventIdOf(row);
    const personaId = personaIdOf(row);
    const p = row?.persona || persona(source, personaId);
    const ev = selectedEvent(source);
    const numero = num(row?.numero);
    const isSocio = norm(p.rango || row?.rango || row?.personaRango).toUpperCase() === 'SOCIO';
    const base = isSocio ? numero * num(ev.precio) : 0;
    const donation = num(row?.importeVoluntario ?? row?.voluntario ?? row?.donation ?? row?.importe ?? 0);
    return Object.assign({}, row, {
      eventId,
      personaId,
      situacion: ingresoOf(row),
      persona: p,
      base,
      donation,
      importe: donation,
      total: base + donation
    });
  }
  function directRows(source){
    const s = source || st();
    const id = selectedId(s);
    if(!id) return [];
    return arr(s, 'colaboradores')
      .filter(row => same(eventIdOf(row), id))
      .map(row => enrich(s, row))
      .sort((a,b) => norm(a.persona?.nombre || a.nombre).localeCompare(norm(b.persona?.nombre || b.nombre), 'es'));
  }
  function localLooksEmptyForIngresos(){
    return arr(st(), 'colaboradores').length === 0 || (selectedId() && directRows(st()).length === 0);
  }
  function clone(value){
    try{ return JSON.parse(JSON.stringify(value)); }catch(_){ return value; }
  }

  async function loadServerState(){
    if(serverLoad) return serverLoad;
    serverLoad = fetch('/api/state', {cache:'no-store'})
      .then(res => {
        if(!res.ok) throw new Error('GET /api/state ' + res.status);
        return res.json();
      })
      .then(data => {
        serverStateCache = data && typeof data === 'object' ? data : {};
        return serverStateCache;
      })
      .finally(() => { serverLoad = null; });
    return serverLoad;
  }
  function mergeFromServer(server, reason){
    const target = st();
    if(!target || typeof target !== 'object') return false;
    let changed = false;

    GUARDED_COLLECTIONS.forEach(key => {
      const localRows = arr(target, key);
      const serverRows = arr(server, key);
      if(!localRows.length && serverRows.length){
        target[key] = clone(serverRows);
        changed = true;
      }
    });

    const serverRows = arr(server, 'colaboradores');
    if(serverRows.length){
      const id = selectedId(target) || selectedId(server);
      const localRows = arr(target, 'colaboradores');
      const localSelected = localRows.filter(row => same(eventIdOf(row), id));
      const serverSelected = serverRows.filter(row => same(eventIdOf(row), id));
      if(id && !localSelected.length && serverSelected.length){
        const byId = new Map(localRows.map(row => [norm(row.id), row]).filter(pair => pair[0]));
        serverRows.forEach(row => {
          const key = norm(row.id);
          if(key && !byId.has(key)) byId.set(key, clone(row));
        });
        target.colaboradores = Array.from(byId.values());
        changed = true;
      }
    }

    if(!norm(target.selectedEventId) && norm(server.selectedEventId)){
      target.selectedEventId = norm(server.selectedEventId);
      changed = true;
    }
    ['ticketImages','ticketImageRefs'].forEach(key => {
      const local = target[key] && typeof target[key] === 'object' ? target[key] : {};
      const remote = server[key] && typeof server[key] === 'object' ? server[key] : {};
      if(Object.keys(remote).length){
        target[key] = Object.assign({}, remote, local);
        changed = true;
      }
    });

    if(changed){
      console.warn('[ControlEvent v8.3.2_prod] Recuperados datos desde /api/state:', reason);
    }
    return changed;
  }
  async function recover(reason){
    if(recoverBusy) return false;
    recoverBusy = true;
    try{
      const server = await loadServerState();
      const changed = mergeFromServer(server, reason || 'recover');
      if(changed){
        call('renderHeader');
        call('renderSelectors');
        call('renderIngresosSummary');
        call('renderColabs');
        call('renderBudget');
        call('renderGraficas');
        setTimeout(() => {
          call('renderIngresosSummary');
          call('renderColabs');
          try{ window.ControlEventV509?.normalizeReceiptFields?.(); }catch(_){ }
        }, 180);
      }
      return changed;
    }catch(error){
      console.warn('[ControlEvent v8.3.2_prod] No se pudo recuperar /api/state.', error);
      return false;
    }finally{
      recoverBusy = false;
    }
  }
  function maybeRecover(reason){
    if(!localLooksEmptyForIngresos()) return;
    const now = Date.now();
    if(now - lastRecoverAt < 3500) return;
    lastRecoverAt = now;
    recover(reason);
  }

  function patchStatePutGuard(){
    if(typeof window.fetch !== 'function' || window.fetch.__ceV350StateGuard) return;
    const oldFetch = window.fetch.bind(window);
    const wrapped = function(input, init){
      const url = String(typeof input === 'string' ? input : (input && input.url) || '');
      const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      let nextInit = init;
      if(method === 'PUT' && /\/api\/state(?:$|\?)/.test(url) && init && typeof init.body === 'string'){
        try{
          const payload = JSON.parse(init.body);
          let blocked = false;
          GUARDED_COLLECTIONS.forEach(key => {
            if(Array.isArray(payload[key]) && payload[key].length === 0){
              const serverCount = arr(serverStateCache, key).length;
              const localCount = arr(st(), key).length;
              if(serverCount > 0 || localCount === 0){
                delete payload[key];
                blocked = true;
              }
            }
          });
          if(blocked){
            console.warn('[ControlEvent v8.3.2_prod] Bloqueado guardado de colecciones vacias en /api/state.');
            nextInit = Object.assign({}, init, {body:JSON.stringify(payload)});
            setTimeout(() => recover('blocked-empty-put'), 80);
          }
        }catch(_){ }
      }
      return oldFetch(input, nextInit);
    };
    wrapped.__ceV350StateGuard = true;
    window.fetch = wrapped;
  }

  function patchCollabsForEvent(){
    const old = getFn('collabsForEvent');
    if(typeof old !== 'function' || old.__ceV350Recovery) return;
    const wrapped = function(){
      let rows = [];
      try{ rows = old.apply(this, arguments) || []; }catch(error){ console.warn('[ControlEvent v8.3.2_prod] collabsForEvent original fallo.', error); }
      if(Array.isArray(rows) && rows.length) return rows;
      const fallback = directRows(st());
      if(fallback.length) return fallback;
      maybeRecover('collabs-empty');
      return Array.isArray(rows) ? rows : [];
    };
    wrapped.__ceV350Recovery = true;
    setFn('collabsForEvent', wrapped);
  }
  function patchRenderer(name){
    const old = getFn(name);
    if(typeof old !== 'function' || old.__ceV350Recovery) return;
    const wrapped = function(){
      maybeRecover(name + ':before');
      const ret = old.apply(this, arguments);
      setTimeout(() => maybeRecover(name + ':after'), 80);
      return ret;
    };
    wrapped.__ceV350Recovery = true;
    setFn(name, wrapped);
  }
  function applyVersion(){
    try{
      document.title = VERSION;
      window.__ceVersion = VERSION;
      window.VERSION = VERSION;
      window.VERSION_FILE = VERSION_FILE;
      window.ControlEventVersion = {version:VERSION, versionFile:VERSION_FILE};
      document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => {
        const text = el.textContent || '';
        if(/ControlEvent\s+v[0-9][0-9A-Za-z._\/-]*/i.test(text)) el.textContent = text.replace(/ControlEvent\s+v[0-9][0-9A-Za-z._\/-]*/ig, VERSION);
      });
    }catch(_){ }
  }
  function install(){
    applyVersion();
    patchStatePutGuard();
    patchCollabsForEvent();
    ['render','renderColabs','renderIngresosSummary','renderBudget'].forEach(patchRenderer);
    maybeRecover('install');
  }

  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted','controlevent:modules-ready'].forEach(evt => {
    window.addEventListener(evt, () => setTimeout(install, 30), false);
  });
  document.addEventListener('change', event => {
    if(event.target?.id === 'selectedEvent') setTimeout(() => recover('event-change'), 160);
  }, true);
  [0,120,500,1500].forEach(ms => setTimeout(install, ms));

  window.ControlEventV350Recovery = {version:VERSION, versionFile:VERSION_FILE, install, recover, directRows};
})();
