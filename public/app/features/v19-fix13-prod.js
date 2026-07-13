// ControlEvent v21_prod · FIX13 base + FIX14 login guard
// Refuerzos: desplegable eventos completo, refresco real de INGRESOS/fotos, Vista aérea legible y estados activos.
(function(){
  'use strict';
  if(window.__CE_V19_FIX13_APPLIED__) return;
  window.__CE_V19_FIX13_APPLIED__ = true;
  const VERSION_TAG = 'v21_prod_FIX13';
  const $ = id => document.getElementById(id);
  const trim = v => String(v == null ? '' : v).trim();
  const arr = v => Array.isArray(v) ? v : [];
  const text = v => String(v == null ? '' : v);
  const now = () => Date.now();
  const state = () => window.state || window.ControlEventApp?.state || window.AppState || window.ControlEventState || {};
  const cssEsc = v => { try{ return CSS && CSS.escape ? CSS.escape(String(v)) : String(v).replace(/[^a-zA-Z0-9_-]/g, '\\$&'); }catch(_){ return String(v).replace(/[^a-zA-Z0-9_-]/g, '\\$&'); } };
  const setState = st => { try{ if(window.state && st) Object.assign(window.state, st); }catch(_){ } try{ if(window.ControlEventApp && st) window.ControlEventApp.state = window.state || st; }catch(_){ } };
  const selectedEventId = () => trim(state().selectedEventId || $('selectedEvent')?.value || (typeof window.selectedEventId === 'function' ? window.selectedEventId() : '') || window.selectedEventId || '');
  function isAuthOverlayVisible(){ const o=$('authOverlay'); return !!(o && !o.classList.contains('hidden') && getComputedStyle(o).display !== 'none' && getComputedStyle(o).visibility !== 'hidden'); }
  function isLoggedIn(){ return !!(window.authUser || window.ControlEventLoginUser || window.__CONTROL_EVENT_LOGIN_USER__ || window.ControlEventApp?.authUser) && !isAuthOverlayVisible(); }
  function isExampleEvent(ev){ const t=up(eventTitle(ev)); return t==='CENA VERANO' || t==='COMIDA PRIMAVERA'; }
  const eventRows = () => arr(state().eventos || window.eventos || window.CE_EVENTOS).filter(ev => !isExampleEvent(ev));
  const eventTitle = ev => trim(ev?.titulo || ev?.nombre || ev?.Evento || ev?.title || 'Evento');
  const eventDate = ev => trim(ev?.fechaIni || ev?.fecha_ini || ev?.fechaInicio || ev?.Fecha || ev?.startDate || ev?.fecha || '');
  const up = v => trim(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  function parseDateKey(value){
    const raw = trim(value);
    if(!raw) return 99999999;
    let m = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if(m){
      let y = Number(m[3]); if(y < 100) y += (y >= 70 ? 1900 : 2000);
      return Number(String(y).padStart(4,'0') + String(Number(m[2])).padStart(2,'0') + String(Number(m[1])).padStart(2,'0')) || 99999999;
    }
    m = raw.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
    if(m) return Number(m[1] + String(Number(m[2])).padStart(2,'0') + String(Number(m[3])).padStart(2,'0')) || 99999999;
    const d = new Date(raw);
    if(!Number.isNaN(d.getTime())) return Number(String(d.getFullYear()) + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0'));
    return 99999999;
  }
  function isFinal(ev){ return up(ev?.situacion || ev?.estado || ev?.status || '').includes('FINAL'); }
  function isCurso(ev){ return up(ev?.situacion || ev?.estado || ev?.status || '').includes('EN CURSO'); }
  const eventMetaCache = new Map();
  function rememberEventMeta(rows){
    arr(rows).forEach(ev => {
      const id = trim(ev?.id); if(!id) return;
      const old = eventMetaCache.get(id) || {};
      eventMetaCache.set(id, {
        ...old,
        id,
        titulo: eventTitle(ev) || old.titulo || '',
        fecha: eventDate(ev) || old.fecha || '',
        situacion: trim(ev?.situacion || ev?.estado || ev?.status || '') || old.situacion || ''
      });
    });
  }
  function hydratedEvent(ev){
    const id = trim(ev?.id);
    const cached = id ? eventMetaCache.get(id) : null;
    if(!cached) return ev || {};
    return { ...cached, ...(ev || {}), fechaIni: eventDate(ev) || cached.fecha, situacion: trim(ev?.situacion || ev?.estado || ev?.status || '') || cached.situacion };
  }
  function callName(name, arg){
    try{ const fn = window[name]; if(typeof fn === 'function') return fn(arg); }catch(_){ }
    try{ const fn = Function('return (typeof '+name+'==="function") ? '+name+' : null')(); if(typeof fn === 'function') return fn(arg); }catch(_){ }
  }
  function renderSoon(reason){
    [0,80,220,520].forEach(ms => setTimeout(() => {
      try{ window.ControlEventV120EventScopedLoader?.renderActive?.('fix13-'+reason); }catch(_){ }
      callName('renderHeader');
      callName('renderActiveTab');
      callName('renderIngresos');
      callName('renderGraficas');
      callName('renderBudget');
      callName('render');
      try{ window.ControlEventViewRefreshStabilizer?.hydrate?.('ingresos','fix13-'+reason); }catch(_){ }
      try{ window.ControlEventV469?.hydrateEventReceipts?.(false); }catch(_){ }
      try{ window.ControlEventV469?.compactIngresoReceipts?.(); }catch(_){ }
      try{ window.ControlEventV467?.enrichOpenTooltips?.(); }catch(_){ }
      try{ window.ControlEventV469?.enrichOpenTooltips?.(); }catch(_){ }
    }, ms));
  }

  function injectCss(){
    if($('ce-v19-fix13-style')) return;
    const css = `
      #ceMapaGlobalOverlay .ce-v19-metric{filter:saturate(1.26)!important;border-color:rgba(100,116,139,.22)!important;box-shadow:0 5px 15px rgba(15,23,42,.055)!important;}
      #ceMapaGlobalOverlay .ce-v19-metric[data-v19-metric-label="INGRESOS"]{background:rgba(37,99,235,.145)!important;}
      #ceMapaGlobalOverlay .ce-v19-metric[data-v19-metric-label="COMPRAS"]{background:rgba(220,38,38,.13)!important;}
      #ceMapaGlobalOverlay .ce-v19-metric[data-v19-metric-label="DONACIONES"]{background:rgba(245,158,11,.16)!important;}
      #ceMapaGlobalOverlay .ce-v19-metric[data-v19-metric-label="PRODUCTO DISPONIBLE"]{background:rgba(15,118,110,.145)!important;}
      #ceMapaGlobalOverlay .ce-v19-metric[data-v19-metric-label="SALDO ACTUAL"]{background:rgba(22,163,74,.145)!important;}
      #ceMapaGlobalOverlay .ce-v19-metric[data-v19-metric-label="SALDO OPERATIVO"]{background:rgba(8,145,178,.145)!important;}
      #ceMapaGlobalOverlay .ce-v19-income-head,
      #ceMapaGlobalOverlay .ce-v19-products-head.compact{background:#dbe2ea!important;border-color:#cbd5e1!important;color:#0f172a!important;font-size:13px!important;font-weight:1000!important;letter-spacing:.01em!important;}
      #ceMapaGlobalOverlay .ce-v19-income-row.compact{font-size:12.1px!important;line-height:1.14!important;padding:6px 7px!important;}
      #ceMapaGlobalOverlay .ce-v19-products-head.compact,
      #ceMapaGlobalOverlay .ce-v19-product-line.compact{grid-template-columns:minmax(156px,1.18fr) minmax(124px,.90fr) minmax(92px,.66fr) minmax(96px,.70fr) minmax(112px,.78fr) minmax(98px,.70fr) minmax(124px,.86fr) minmax(78px,.54fr) minmax(100px,.68fr) minmax(70px,.48fr)!important;min-width:1088px!important;}
      #ceMapaGlobalOverlay .ce-v19-product-line.compact{font-size:11.35px!important;line-height:1.13!important;padding:4px 5px!important;}
      #ceMapaGlobalOverlay .ce-v19-products-head.compact>*:nth-child(2),
      #ceMapaGlobalOverlay .ce-v19-product-line.compact>*:nth-child(2){transform:translateX(6ch)!important;width:calc(100% - 6ch)!important;}
      #ceMapaGlobalOverlay .ce-v19-product-line.compact span,
      #ceMapaGlobalOverlay .ce-v19-product-line.compact strong{letter-spacing:-.01em!important;}
      #ceMapaGlobalOverlay .ce-v19-detail-head h3{font-size:20px!important;}
      #ceMapaGlobalOverlay .ce-v19-clear-filter.is-active,
      #ceMapaGlobalOverlay .ce-v19-income-all.is-active,
      #ceMapaGlobalOverlay .ce-v19-clear-filter.ce-fix13-active,
      #ceMapaGlobalOverlay .ce-v19-income-all.ce-fix13-active{border-color:#2563eb!important;box-shadow:0 0 0 3px rgba(37,99,235,.24)!important;background:#eff6ff!important;color:#1d4ed8!important;}
      #ceMapaGlobalOverlay .ce-v19-resource-bar.is-selected,
      #ceMapaGlobalOverlay .ce-v19-resource-bar.ce-fix13-active{background:#dbeafe!important;border-color:#2563eb!important;box-shadow:0 0 0 3px rgba(37,99,235,.22),0 10px 22px rgba(37,99,235,.16)!important;}
      #ceMapaGlobalOverlay .ce-v19-resource-bar.is-selected .ce-v19-bar-top strong,
      #ceMapaGlobalOverlay .ce-v19-resource-bar.ce-fix13-active .ce-v19-bar-top strong{color:#1d4ed8!important;}
      .ce-fix13-recent-collab{background:#fff7ed!important;border-color:#fb923c!important;box-shadow:0 0 0 3px rgba(249,115,22,.30),0 8px 24px rgba(15,23,42,.12)!important;transition:all .25s ease!important;}
      .ce-fix13-saving-pulse{outline:3px solid rgba(37,99,235,.22)!important;}
      #selectedEvent option.ce-event-finalizado,#selectedEvent option[data-finalizado="1"]{color:#b91c1c!important;font-weight:900!important;}
      #selectedEvent option.ce-event-curso,#selectedEvent option[data-curso="1"]{color:#16a34a!important;font-weight:900!important;}
      @media(max-width:720px){#ceMapaGlobalOverlay .ce-v19-products-head.compact,#ceMapaGlobalOverlay .ce-v19-product-line.compact{min-width:0!important;grid-template-columns:1fr!important;}#ceMapaGlobalOverlay .ce-v19-products-head.compact>*:nth-child(2),#ceMapaGlobalOverlay .ce-v19-product-line.compact>*:nth-child(2){transform:none!important;width:auto!important;}}
    `;
    const st = document.createElement('style'); st.id = 'ce-v19-fix13-style'; st.textContent = css; document.head.appendChild(st);
  }

  function syncEventDropdownFromState(){
    const sel = $('selectedEvent'); if(!sel) return false;
    const rows = eventRows().filter(ev => trim(ev?.id) && eventTitle(ev));
    if(!rows.length) return false;
    rememberEventMeta(rows);
    const oldValue = trim(sel.value || state().selectedEventId || '');
    const rowsSorted = rows.map(hydratedEvent).slice().sort((a,b) => {
      const da = parseDateKey(eventDate(a));
      const db = parseDateKey(eventDate(b));
      if(da !== db) return db - da;
      return eventTitle(a).localeCompare(eventTitle(b),'es',{numeric:true,sensitivity:'base'});
    });
    const wanted = rowsSorted.map(ev => trim(ev.id));
    const currentOrder = Array.from(sel.options || []).map(o => trim(o.value)).filter(Boolean);
    const alreadyOrdered = currentOrder.length === wanted.length && wanted.every((id,idx) => currentOrder[idx] === id);
    const currentColorsOk = Array.from(sel.options || []).every(o => {
      const id = trim(o.value); if(!id) return true;
      const ev = rowsSorted.find(r => trim(r.id) === id) || {};
      if(isFinal(ev)) return o.classList.contains('ce-event-finalizado') && o.dataset.finalizado === '1';
      if(isCurso(ev)) return o.classList.contains('ce-event-curso') && o.dataset.curso === '1';
      return !o.classList.contains('ce-event-finalizado') && !o.classList.contains('ce-event-curso');
    });
    if(alreadyOrdered && currentColorsOk && sel.querySelector('option[value=""]')){
      const finalValue = oldValue && wanted.includes(oldValue) ? oldValue : '';
      if(sel.value !== finalValue) sel.value = finalValue;
      sel.disabled = false;
      return true;
    }
    const frag = document.createDocumentFragment();
    const ph = document.createElement('option'); ph.value=''; ph.textContent='Selecciona evento...'; frag.appendChild(ph);
    rowsSorted.forEach(ev => {
      const opt=document.createElement('option');
      opt.value=trim(ev.id);
      opt.textContent=eventTitle(ev);
      if(isFinal(ev)){ opt.className='ce-event-finalizado'; opt.dataset.finalizado='1'; opt.style.color='#b91c1c'; opt.style.fontWeight='900'; }
      else if(isCurso(ev)){ opt.className='ce-event-curso'; opt.dataset.curso='1'; opt.style.color='#16a34a'; opt.style.fontWeight='900'; }
      frag.appendChild(opt);
    });
    sel.innerHTML=''; sel.appendChild(frag);
    const finalValue = oldValue && wanted.includes(oldValue) ? oldValue : '';
    sel.value = finalValue;
    sel.disabled = false;
    if(finalValue) { try{ state().selectedEventId = finalValue; }catch(_){ } }
    return true;
  }
  let bootPromise = null;
  async function ensureBootEventsLoaded(reason){
    // FIX14: no hacer /api/state?boot=1 mientras la pantalla de login está abierta.
    // En FIX13 esa precarga podía dejar el flujo de acceso atrapado en algunos despliegues.
    if(!isLoggedIn()) return false;
    if(bootPromise) return bootPromise;
    const before = eventRows().length;
    bootPromise = fetch('/api/state?boot=1&fix13=' + encodeURIComponent(reason || '') + '&ts=' + Date.now(), {cache:'no-store',headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}})
      .then(r => r.ok ? r.json() : Promise.reject(new Error('boot '+r.status)))
      .then(data => {
        const s = state();
        const oldSelected = selectedEventId();
        ['eventos','personas','tiendas','productos','eventCodeMap','entityCodeMaps'].forEach(k => { if(data && data[k] !== undefined) s[k] = data[k]; });
        if(oldSelected) s.selectedEventId = oldSelected;
        setState(s);
        syncEventDropdownFromState();
        return true;
      })
      .catch(err => { console.warn('[FIX13] No se pudo recargar catálogo de eventos:', err && err.message || err); return false; })
      .finally(() => { setTimeout(() => { bootPromise=null; }, 500); });
    if(before) syncEventDropdownFromState();
    return bootPromise;
  }
  function installDropdownFix(){
    // FIX16: selector ligero. No hacemos precargas repetidas /api/state?boot=1 al abrir el desplegable.
    // El estado ya se carga en el login y en el cambio de evento; aquí solo reconstruimos opciones locales.
    syncEventDropdownFromState();
    [180,900].forEach(ms => setTimeout(() => { syncEventDropdownFromState(); }, ms));
    ['pointerdown','mousedown','focus','click'].forEach(evt => document.addEventListener(evt, ev => {
      if(ev.target && ev.target.id === 'selectedEvent') syncEventDropdownFromState();
    }, true));
    window.addEventListener('controlevent:app-ready', () => syncEventDropdownFromState(), true);
    window.addEventListener('controlevent:login-ok', () => syncEventDropdownFromState(), true);
  }

  function mergeEventState(fresh, evId){
    if(!fresh || typeof fresh !== 'object') return;
    const s = state();
    const id = trim(evId || selectedEventId() || fresh.selectedEventId || fresh.__eventScopedId || '');
    ['eventos','personas','tiendas','productos','eventCodeMap','entityCodeMaps','eventDocuments','eventDocumentMeta'].forEach(k => { if(fresh[k] !== undefined) s[k]=fresh[k]; });
    ['colaboradores','compras'].forEach(k => {
      if(Array.isArray(fresh[k])){
        const kept = arr(s[k]).filter(r => trim(r?.eventId || r?.eventoId || r?.event_id) !== id);
        s[k] = kept.concat(fresh[k]);
      }
    });
    if(fresh.ticketImages){
      s.ticketImages = s.ticketImages || {};
      Object.keys(s.ticketImages).forEach(k => { if(!id || k.indexOf(id+'|')===0) delete s.ticketImages[k]; });
      Object.assign(s.ticketImages, fresh.ticketImages || {});
    }
    if(fresh.ticketImageRefs){
      s.ticketImageRefs = s.ticketImageRefs || {};
      Object.keys(s.ticketImageRefs).forEach(k => { if(!id || k.indexOf(id+'|')===0) delete s.ticketImageRefs[k]; });
      Object.assign(s.ticketImageRefs, fresh.ticketImageRefs || {});
    }
    if(id) s.selectedEventId = id;
    setState(s);
    syncEventDropdownFromState();
  }
  async function refreshEventNow(reason, delay){
    const evId = selectedEventId(); if(!evId) return false;
    if(delay) await new Promise(r => setTimeout(r, delay));
    try{
      const res = await fetch('/api/state?eventId=' + encodeURIComponent(evId) + '&fix13=' + encodeURIComponent(reason || '') + '&ts=' + Date.now(), {cache:'no-store',headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}});
      if(!res.ok) throw new Error('state '+res.status);
      const data = await res.json();
      mergeEventState(data, evId);
      renderSoon(reason || 'refresh-event');
      return true;
    }catch(err){ console.warn('[FIX13] Refresco de evento fallido:', err && err.message || err); return false; }
  }
  function markRecentCollab(id){
    if(!id) return;
    const cssId = String(id).replace(/"/g,'\\"');
    const nodes = Array.from(document.querySelectorAll('[data-id="'+cssId+'"],button[data-action="save-collab"][data-id="'+cssId+'"]'));
    nodes.forEach(el => {
      const card = el.closest?.('.ce-v5011-pending-row,.rowline,.itemcard,.card,tr,.red-row') || el;
      card.classList.add('ce-fix13-recent-collab');
      setTimeout(() => { try{ card.classList.remove('ce-fix13-recent-collab'); }catch(_){ } }, 7000);
    });
  }
  function rowFromSaveButton(btn){
    const id = trim(btn?.dataset?.id || btn?.getAttribute?.('data-id') || '');
    if(!id) return null;
    const s = state();
    const old = arr(s.colaboradores || s.ingresos).find(r => trim(r?.id)===id) || {id};
    const root = btn.closest?.('.ce-v5011-pending-row,.rowline,.itemcard,.card,tr,.modal,.dialog') || document;
    function val(names){
      for(const name of names){
        const safeName = String(name).replace(/"/g,'\\"');
        const el = root.querySelector?.('[name="'+safeName+'"],#'+cssEsc(safeName)+',[data-field="'+safeName+'"]');
        if(el) return trim(el.value != null ? el.value : el.textContent);
      }
      return '';
    }
    const row = Object.assign({}, old, {id, eventId: trim(old.eventId || selectedEventId())});
    const map = {
      personaId:['personaId','persona','colaborador','edit-collab-persona-'+id,'edit-collab-persona'],
      numero:['numero','Numero','cantidad','edit-collab-numero-'+id,'edit-collab-numero'],
      situacion:['situacion','formaPago','ingreso','edit-collab-situacion-'+id,'edit-collab-situacion'],
      importe:['importe','importeVoluntario','voluntario','edit-collab-importe-'+id,'edit-collab-importe'],
      rango:['rango','Rango']
    };
    Object.keys(map).forEach(k => { const v = val(map[k]); if(v !== '') row[k]=v; });
    return row;
  }
  function mergePendingCollab(row){
    if(!row?.id) return;
    const s = state();
    s.colaboradores = arr(s.colaboradores || s.ingresos).map(r => trim(r?.id)===trim(row.id) ? Object.assign({}, r, row) : r);
    if(!s.colaboradores.some(r => trim(r?.id)===trim(row.id))) s.colaboradores.push(row);
    setState(s);
    window.__ceFix13PendingCollab = {row, until:now()+30000};
    window.__ceFix12PendingCollabSave = {row, until:now()+30000};
    markRecentCollab(row.id);
  }
  let lastImageDelete = null;
  function removeImageFromState(eventId, key){
    const ev = trim(eventId || selectedEventId());
    const raw = trim(key);
    if(!ev && !raw) return;
    const candidates = new Set([raw, ev && raw ? ev+'|'+raw : '', raw.startsWith(ev+'|') ? raw : ''].filter(Boolean));
    const s = state();
    ['ticketImages','ticketImageRefs'].forEach(bagName => {
      const bag = s[bagName] || {}; s[bagName] = bag;
      Object.keys(bag).forEach(k => {
        if(candidates.has(k) || (raw && k.includes(raw)) || (ev && raw && k.includes(ev) && k.includes(raw))) delete bag[k];
      });
    });
    setState(s);
  }
  function removeClickedImageDom(){
    const ctx = lastImageDelete;
    if(!ctx || now() - ctx.t > 6000) return;
    const holder = ctx.el?.closest?.('.ce-v509-receipt-thumb,.ce-v504-receipt-strip,.ce-v502-receipt-strip,.ce-v465-receipt-strip,.ce-v19-receipt-thumb,.ce-doc-media,.ce-doc-target-imgwrap-v85,.itemcard,.rowline,.card');
    if(holder){
      holder.querySelectorAll?.('img').forEach(img => img.remove());
      holder.classList.add('ce-fix13-saving-pulse');
      setTimeout(()=>holder.classList.remove('ce-fix13-saving-pulse'),2500);
    }
  }
  function parseJsonBody(init){ try{ return init?.body && typeof init.body === 'string' ? JSON.parse(init.body) : (init?.body || {}); }catch(_){ return {}; } }
  function installFetchFix(){
    if(!window.fetch || window.fetch.__ceFix13Wrapped) return;
    const oldFetch = window.fetch;
    const wrapped = function(input, init){
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      const method = trim(init?.method || (input && input.method) || 'GET').toUpperCase();
      let collabRow = null;
      let isCollabCrud = false; // FIX15: INGRESOS los gestiona v8-5 directamente, sin refrescos repetidos.
      let isImageWrite = /\/api\/ticket-images(?:\?|$)/i.test(url) && /^(POST|DELETE)$/i.test(method);
      if(isCollabCrud && method !== 'DELETE'){
        try{ const body = parseJsonBody(init); collabRow = body && typeof body === 'object' ? Object.assign({}, body, {id: trim(body.id || (url.match(/\/colaboradores\/([^/?#]+)/)||[])[1] || '')}) : null; if(collabRow && collabRow.id){ collabRow.eventId = collabRow.eventId || selectedEventId(); mergePendingCollab(collabRow); } }catch(_){ }
      }
      if(isImageWrite && method === 'DELETE'){
        const body = parseJsonBody(init);
        const u = new URL(url, location.origin);
        const evId = trim(body.eventId || u.searchParams.get('eventId') || selectedEventId());
        const key = trim(body.key || u.searchParams.get('key') || '');
        removeImageFromState(evId, key);
      }
      return oldFetch.call(this, input, init).then(resp => {
        try{
          if(isCollabCrud){
            if(collabRow?.id) mergePendingCollab(collabRow);
            [0,450,1200].forEach(ms => refreshEventNow('crud-colaboradores', ms));
          }
          if(isImageWrite){
            const body = parseJsonBody(init);
            const u = new URL(url, location.origin);
            removeImageFromState(trim(body.eventId || u.searchParams.get('eventId') || selectedEventId()), trim(body.key || u.searchParams.get('key') || ''));
            removeClickedImageDom();
            [0,400,1000].forEach(ms => refreshEventNow('ticket-images', ms));
          }
          if(/\/api\/state(?:\?|$)/i.test(url) && method === 'GET'){
            const pending = window.__ceFix13PendingCollab;
            if(pending?.row && now() < pending.until){
              return resp.clone().json().then(data => {
                ['colaboradores','ingresos'].forEach(k => {
                  if(Array.isArray(data[k])) data[k] = data[k].map(r => trim(r?.id)===trim(pending.row.id) ? Object.assign({}, r, pending.row) : r);
                });
                const headers = new Headers(resp.headers); headers.set('content-type','application/json;charset=utf-8');
                return new Response(JSON.stringify(data), {status:resp.status,statusText:resp.statusText,headers});
              }).catch(()=>resp);
            }
          }
        }catch(_){ }
        return resp;
      });
    };
    wrapped.__ceFix13Wrapped = true;
    window.fetch = wrapped;
  }
  function installActionCapture(){
    document.addEventListener('click', ev => {
      const save = ev.target?.closest?.('button[data-action="save-collab"],button.save-collab,.save-collab');
      if(save){ const row = rowFromSaveButton(save); if(row) mergePendingCollab(row); }
      const delImg = ev.target?.closest?.('button,[role="button"],[data-action]');
      if(delImg){
        const label = trim((delImg.getAttribute?.('title')||'')+' '+(delImg.getAttribute?.('aria-label')||'')+' '+(delImg.dataset?.action||'')+' '+delImg.textContent);
        if(/eliminar|borrar|papelera|delete/i.test(label)) lastImageDelete = {t:now(), el:delImg};
      }
    }, true);
  }
  function applyVistaSelectionState(kind){
    const root = $('ceMapaGlobalOverlay'); if(!root) return;
    root.querySelectorAll('.ce-v19-income-all,.ce-v19-clear-filter').forEach(b => b.classList.remove('is-active','ce-fix13-active'));
    if(kind === 'income-all') root.querySelector('.ce-v19-income-all')?.classList.add('is-active','ce-fix13-active');
    if(kind === 'products-all') root.querySelector('.ce-v19-clear-filter')?.classList.add('is-active','ce-fix13-active');
  }
  function installVistaActions(){
    document.addEventListener('click', ev => {
      if(ev.target?.closest?.('#ceMapaGlobalOverlay [data-v19-income-all]')) setTimeout(()=>applyVistaSelectionState('income-all'), 30);
      if(ev.target?.closest?.('#ceMapaGlobalOverlay [data-v19-clear-filter]')) setTimeout(()=>applyVistaSelectionState('products-all'), 30);
      const bar = ev.target?.closest?.('#ceMapaGlobalOverlay .ce-v19-resource-bar[data-v19-filter-kind]');
      if(bar){
        setTimeout(()=>{
          const root=$('ceMapaGlobalOverlay'); if(!root) return;
          root.querySelectorAll('.ce-v19-income-all,.ce-v19-clear-filter').forEach(b => b.classList.remove('is-active','ce-fix13-active'));
          root.querySelectorAll('.ce-v19-resource-bar.ce-fix13-active').forEach(b => b.classList.remove('ce-fix13-active'));
          bar.classList.add('ce-fix13-active');
        }, 30);
      }
    }, true);
    const mo = new MutationObserver(() => {
      const root = $('ceMapaGlobalOverlay'); if(!root) return;
      const h=(root.querySelector('.ce-v19-detail-head h3')?.textContent||'').toLowerCase(); if(h.includes('todos los productos')) applyVistaSelectionState('products-all'); else if(h.includes('ingresos')) applyVistaSelectionState('income-all');
    });
    try{ mo.observe(document.body, {childList:true,subtree:true}); }catch(_){ }
  }
  function install(){
    injectCss();
    installDropdownFix();
    installFetchFix();
    installActionCapture();
    installVistaActions();
    window.ControlEventV19Fix13 = {syncEventDropdownFromState, ensureBootEventsLoaded, refreshEventNow, version: VERSION_TAG};
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true}); else install();
})();
