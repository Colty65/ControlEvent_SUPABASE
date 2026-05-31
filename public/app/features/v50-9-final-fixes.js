/* ControlEvent v3.3_prod - correccion puntual sobre v50.19.
   - Login: intercepta el boton antes de los manejadores antiguos para que el panel de acceso no quede delante.
   - INGRESOS movil: muestra un bloque unico y visible de justificante en cada ficha usando las mismas fotos que los globos.
   - No usa temporizadores permanentes de version.
*/
(function(){
  'use strict';

  const VERSION = 'ControlEvent v3.3_prod';
  const VERSION_FILE = 'ControlEvent_v3_3_prod';
  const INSTALLED = '__ceV509FinalFixes';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const SESSION_KEY = 'ControlEvent_v3_3_prod_session';
  const LOGOUT_KEY_508 = 'ControlEvent_v3_3_prod_logout_at';
  const BACKUP_KEYS = ['ControlEvent_ingreso_receipts_v502','ControlEvent_ingreso_receipts_v468'];
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const same = (a,b) => String(a ?? '') === String(b ?? '');
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };

  let loginBusy = false;
  let hydrationBusy = false;
  let lastHydrateEvent = '';
  let lastHydrateAt = 0;

  function st(){
    return safe(() => (typeof state !== 'undefined' && state) ? state : null, null)
      || window.state
      || window.ControlEventApp?.state
      || {};
  }
  function arr(k){ const s = st(); return Array.isArray(s[k]) ? s[k] : []; }
  function setLexical(name, value){ try{ Function('v', name + ' = v;')(value); }catch(_){ } }
  function getLexical(name){ return safe(() => Function('return (typeof '+name+' !== "undefined") ? '+name+' : undefined;')(), undefined); }
  function getFn(name){ return safe(() => (typeof window[name] === 'function') ? window[name] : Function('return (typeof '+name+' === "function") ? '+name+' : null;')(), null); }
  function call(name, ...args){ const fn=getFn(name); if(typeof fn !== 'function') return undefined; try{ return fn(...args); }catch(error){ console.warn('[v50.9] '+name, error); return undefined; } }
  function auth(){ return getLexical('authUser') || window.authUser || window.ControlEventApp?.authUser || window.__CONTROL_EVENT_USER__ || null; }
  function role(){ return up(auth()?.nivel || ''); }
  function canWrite(){ const r=role(); return r === 'GD' || r === 'RW'; }
  function selectedId(){
    const ev = safe(() => (typeof selectedEvent === 'function') ? selectedEvent() : null, null);
    if(ev?.id) return String(ev.id);
    return String(st().selectedEventId || '');
  }
  function selectedEv(){ const id=selectedId(); return arr('eventos').find(e => same(e?.id,id)) || null; }
  function isFinalizado(){ return up(selectedEv()?.situacion || '') === 'FINALIZADO'; }
  function stop(ev){ try{ ev?.preventDefault?.(); ev?.stopPropagation?.(); ev?.stopImmediatePropagation?.(); }catch(_){ } return false; }
  function srcOf(v){
    if(!v) return '';
    if(typeof v === 'string') return v;
    if(typeof v === 'object') return v.url || v.public_url || v.publicUrl || v.pathname || v.path || v.storage_path || v.dataUrl || v.base64 || '';
    return '';
  }
  function dataUrl(v){ return /^data:image\//i.test(String(v || '')); }
  function jsonGet(key){ try{ return JSON.parse(localStorage.getItem(key) || '{}') || {}; }catch(_){ return {}; } }
  function stateStores(){
    const s = st();
    if(!s.ticketImages || typeof s.ticketImages !== 'object') s.ticketImages = {};
    if(!s.ticketImageRefs || typeof s.ticketImageRefs !== 'object') s.ticketImageRefs = {};
    return {store:s.ticketImages, refs:s.ticketImageRefs};
  }
  function keyOnly(id){ return `INGRESO:${String(id || '')}`; }
  function fullKey(id){ return `${selectedId()}|${keyOnly(id)}`; }
  function legacyKeys(id){
    const ev=selectedId(), sid=String(id || '');
    return [
      `${ev}|INGRESO:${sid}`,
      `${ev}|INGRESO|${sid}`,
      `INGRESO:${ev}|${sid}`,
      `INGRESO:${sid}`,
      `INGRESO|${sid}`,
      sid
    ];
  }
  function receiptSrc(id){
    const {store, refs} = stateStores();
    const keys = legacyKeys(id);
    for(const k of keys){ const src=srcOf(store[k]); if(src) return src; }
    for(const k of keys){ const src=srcOf(refs[k]); if(src) return src; }
    for(const bkey of BACKUP_KEYS){ const b=jsonGet(bkey); for(const k of keys){ const src=srcOf(b[k]); if(src) return src; } }
    return '';
  }
  function setReceiptLocal(id, src, ref){
    if(!id || !src) return;
    const k = fullKey(id);
    const {store, refs} = stateStores();
    store[k] = src;
    refs[k] = ref && typeof ref === 'object' ? {...ref, key:k, url:src, pathname:ref.pathname || src} : {key:k, url:src, pathname:src};
    if(dataUrl(src)){
      BACKUP_KEYS.forEach(bkey => { const b=jsonGet(bkey); b[k]=src; try{ localStorage.setItem(bkey, JSON.stringify(b)); }catch(_){ } });
    }
  }
  function deleteReceiptLocal(id){
    const {store, refs} = stateStores();
    legacyKeys(id).forEach(k => { try{ delete store[k]; delete refs[k]; }catch(_){ } });
    BACKUP_KEYS.forEach(bkey => { const b=jsonGet(bkey); legacyKeys(id).forEach(k => delete b[k]); try{ localStorage.setItem(bkey, JSON.stringify(b)); }catch(_){ } });
  }

  function injectStyle(){
    if($('ceV509FinalStyle')) return;
    const style=document.createElement('style');
    style.id='ceV509FinalStyle';
    style.textContent = `
      body.ce-v509-authenticated #authOverlay{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}
      body.ce-v509-authenticated{filter:none!important;}
      body.ce-v509-authenticated .auth-overlay{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      #collabList .ce-v504-receipt-strip,#collabList .ce-v502-receipt-strip,#collabList .ce-v501-receipt-strip,#collabList .ce-v465-receipt-strip,#collabList .ce-v464-receipt-tools,#collabList .ce-ingreso-receipt-tools-v463{display:none!important;visibility:hidden!important;width:0!important;height:0!important;overflow:hidden!important;margin:0!important;padding:0!important;pointer-events:none!important;}
      #collabList .ce-v509-receipt-field{display:flex!important;flex-direction:column!important;gap:4px!important;align-items:flex-end!important;justify-content:flex-end!important;justify-self:end!important;min-width:118px!important;position:relative!important;z-index:20!important;order:98!important;margin-left:auto!important;text-align:right!important;}
      #collabList .ce-v509-receipt-field>label{font-size:11px!important;font-weight:800!important;color:#475569!important;line-height:1.15!important;}
      #collabList .ce-v509-receipt-strip{display:inline-flex!important;align-items:center!important;justify-content:flex-end!important;gap:6px!important;min-height:36px!important;white-space:nowrap!important;pointer-events:auto!important;touch-action:manipulation!important;}
      #collabList .ce-v509-receipt-thumb,#collabList .ce-v509-receipt-btn{appearance:none!important;-webkit-appearance:none!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;width:36px!important;height:36px!important;min-width:36px!important;min-height:36px!important;border-radius:10px!important;border:1px solid #cbd5e1!important;background:#fff!important;color:#0f172a!important;padding:0!important;margin:0!important;cursor:pointer!important;box-shadow:0 1px 3px rgba(15,23,42,.12)!important;position:relative!important;z-index:22!important;pointer-events:auto!important;touch-action:manipulation!important;font-size:18px!important;line-height:1!important;}
      #collabList .ce-v509-receipt-thumb img{width:32px!important;height:32px!important;display:block!important;object-fit:cover!important;border-radius:8px!important;pointer-events:none!important;}
      #collabList .ce-v509-receipt-btn.danger{background:#fee2e2!important;border-color:#fecaca!important;color:#991b1b!important;}
      #collabList .ce-v509-receipt-empty{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:36px!important;height:36px!important;min-width:36px!important;border:1px dashed #cbd5e1!important;border-radius:10px!important;background:#f8fafc!important;color:#64748b!important;font-size:18px!important;}
      .ce-v509-modal{position:fixed!important;inset:0!important;background:rgba(15,23,42,.76)!important;z-index:1000002!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:16px!important;touch-action:auto!important;}
      .ce-v509-modal-card{width:min(1080px,96vw)!important;max-height:94vh!important;background:#fff!important;color:#0f172a!important;border-radius:18px!important;box-shadow:0 26px 86px rgba(0,0,0,.44)!important;padding:13px!important;display:grid!important;grid-template-columns:minmax(260px,360px) minmax(320px,1fr)!important;gap:12px!important;overflow:auto!important;}
      .ce-v509-modal-head{grid-column:1/-1!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;font-weight:950!important;}
      .ce-v509-modal-info{background:#f8fafc!important;border:1px solid #e2e8f0!important;border-radius:14px!important;padding:10px!important;align-self:start!important;}
      .ce-v509-modal-info h3{margin:0 0 8px!important;font-size:16px!important;}
      .ce-v509-modal-info table{width:100%!important;border-collapse:separate!important;border-spacing:0 5px!important;font-size:13px!important;}
      .ce-v509-modal-info td:first-child{font-weight:900!important;color:#475569!important;padding-right:8px!important;}
      .ce-v509-modal-info td:last-child{text-align:right!important;font-weight:850!important;}
      .ce-v509-modal-img{max-width:100%!important;max-height:78vh!important;object-fit:contain!important;border-radius:13px!important;background:#f1f5f9!important;justify-self:center!important;align-self:center!important;}
      @media(max-width:900px){
        #collabList .rowline.collab{grid-template-columns:1fr!important;}
        #collabList .ce-v509-receipt-field{min-width:0!important;width:100%!important;padding:6px 0 2px!important;align-items:flex-end!important;text-align:right!important;}
        #collabList .ce-v509-receipt-strip{width:auto!important;max-width:100%!important;align-self:flex-end!important;justify-content:flex-end!important;}
        .ce-v509-modal-card{grid-template-columns:1fr!important;width:calc(100vw - 18px)!important;max-height:92vh!important;padding:10px!important;}
        .ce-v509-modal-img{max-height:58vh!important;}
      }
    `;
    document.head.appendChild(style);
  }

  function hasSession(){
    const a = auth();
    if(a) return true;
    const raw = safe(() => localStorage.getItem(SESSION_KEY), '');
    if(!raw) return false;
    const obj = safe(() => JSON.parse(raw), null);
    return !!(obj && (obj.identificacion || obj.nombre || obj.nivel));
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
        const t=el.textContent || '';
        if(/ControlEvent\s+v[0-9][0-9A-Za-z._\/-]*/i.test(t)) el.textContent = t.replace(/ControlEvent\s+v[0-9][0-9A-Za-z._\/-]*/ig, VERSION);
      });
    }catch(_){ }
  }
  function forceAuthenticatedUI(user){
    const ok = !!(user || auth() || hasSession());
    document.body.classList.toggle('ce-v509-authenticated', ok);
    if(ok){
      document.body.classList.remove('auth-locked','ce-logged-out-v508','ce-logged-out-v509');
      const overlay = $('authOverlay');
      if(overlay){
        overlay.classList.add('hidden');
        overlay.setAttribute('aria-hidden','true');
        overlay.style.setProperty('display','none','important');
        overlay.style.setProperty('visibility','hidden','important');
        overlay.style.setProperty('pointer-events','none','important');
        overlay.style.setProperty('opacity','0','important');
      }
      const u = user || auth();
      if(u){
        ['brandCurrentUserName','currentUserName'].forEach(id => { const el=$(id); if(el) el.textContent = u.nombre || u.identificacion || 'Usuario'; });
        ['brandCurrentUserMeta','currentUserLevel'].forEach(id => { const el=$(id); if(el) el.textContent = `${u.identificacion || ''}${u.nivel ? ' ('+u.nivel+')' : ''}`.trim(); });
      }
      ['btnLogout','btnSoftRefresh'].forEach(id => { const btn=$(id); if(btn){ btn.classList.remove('hidden'); btn.removeAttribute('hidden'); btn.disabled=false; } });
    }
  }

  async function loadFreshState(){
    const res = await fetch('/api/state', {cache:'no-store'});
    if(!res.ok) throw new Error('No se pudo cargar /api/state');
    const serverState = await res.json();
    const merged = safe(() => Function('serverState','return (typeof mergeLoadedState === "function" && typeof defaultState === "function") ? mergeLoadedState(serverState, defaultState()) : serverState;')(serverState), serverState);
    const target = st();
    Object.keys(target).forEach(k => { delete target[k]; });
    Object.assign(target, merged || serverState || {});
    return target;
  }
  async function loginV509(ev){
    stop(ev || window.event || {});
    if(loginBusy) return false;
    const ident = norm($('loginIdentificacion')?.value || '');
    const clave = String($('loginClave')?.value || '');
    const error = $('authError');
    if(error) error.textContent = '';
    if(!ident || !clave){ if(error) error.textContent = 'Introduce identificación y clave.'; return false; }
    loginBusy = true;
    try{
      const res = await fetch('/api/login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({identificacion:ident, clave})});
      const data = await res.json().catch(() => ({}));
      if(!res.ok || !data.ok || !data.user) throw new Error(data.error || 'Acceso no válido');
      safe(() => sessionStorage.removeItem(LOGOUT_KEY_508), null);
      safe(() => sessionStorage.removeItem('ControlEvent_v3_3_prod_logout_at'), null);
      await loadFreshState();
      setLexical('authUser', data.user);
      window.authUser = data.user;
      window.__CONTROL_EVENT_USER__ = data.user;
      if(window.ControlEventApp) window.ControlEventApp.authUser = data.user;
      safe(() => localStorage.setItem(SESSION_KEY, JSON.stringify(data.user || null)), null);
      const claveEl = $('loginClave'); if(claveEl) claveEl.value = '';
      forceAuthenticatedUI(data.user);
      call('renderAuthUI');
      call('render');
      forceAuthenticatedUI(data.user);
      applyVersion();
      await hydrateReceipts(true);
      normalizeReceiptFields();
      // Dos pasadas concretas tras el render, no vigilancia permanente.
      [80,260].forEach(ms => setTimeout(() => { forceAuthenticatedUI(data.user); applyVersion(); normalizeReceiptFields(); }, ms));
    }catch(error2){
      console.error('[v50.9] login', error2);
      if(error) error.textContent = error2?.message || String(error2);
    }finally{
      loginBusy = false;
    }
    return false;
  }

  function readRawImage(file){ return new Promise((resolve,reject) => { const r=new FileReader(); r.onload=()=>resolve(String(r.result||'')); r.onerror=()=>reject(r.error || new Error('No se pudo leer la imagen.')); r.readAsDataURL(file); }); }
  async function readImage(file){
    const raw = await readRawImage(file);
    if(!dataUrl(raw)) return raw;
    return await new Promise(resolve => {
      try{
        const img = new Image();
        img.onload = () => {
          try{
            const w = img.naturalWidth || img.width || 0;
            const h = img.naturalHeight || img.height || 0;
            if(!w || !h) return resolve(raw);
            const maxSide = 1200;
            const maxPixels = 1200 * 900;
            const ratio = Math.min(1, maxSide / Math.max(w, h), Math.sqrt(maxPixels / Math.max(1, w * h)));
            if(ratio >= 0.98 && raw.length < 900000) return resolve(raw);
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(w * ratio));
            canvas.height = Math.max(1, Math.round(h * ratio));
            const ctx = canvas.getContext('2d');
            if(!ctx) return resolve(raw);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.78));
          }catch(_){ resolve(raw); }
        };
        img.onerror = () => resolve(raw);
        img.src = raw;
      }catch(_){ resolve(raw); }
    });
  }
  async function uploadReceipt(id, src){
    if(!id || !selectedId() || !dataUrl(src)) return src;
    const res = await fetch('/api/ticket-images', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({eventId:selectedId(), key:keyOnly(id), dataUrl:src})});
    const payload = await res.json().catch(() => ({}));
    if(!res.ok || !payload.ok) throw new Error(payload.error || payload.message || 'No se pudo guardar la imagen.');
    const img = payload.image || {};
    const url = img.url || img.public_url || img.pathname || src;
    setReceiptLocal(id, url, {key:img.key || fullKey(id), url, pathname:img.pathname || url, contentType:img.contentType || img.content_type || '', size:img.size || img.size_bytes || 0});
    return url;
  }
  async function hydrateReceipts(force){
    const ev = selectedId(); if(!ev) return;
    const now = Date.now();
    if(!force && ev === lastHydrateEvent && now - lastHydrateAt < 9000) return;
    if(hydrationBusy) return;
    hydrationBusy = true; lastHydrateEvent = ev; lastHydrateAt = now;
    try{
      const res = await fetch(`/api/ticket-images?eventId=${encodeURIComponent(ev)}`, {cache:'no-store'});
      const payload = await res.json().catch(() => ({}));
      if(!res.ok || !payload.ok || !payload.images) return;
      const {store, refs} = stateStores();
      Object.entries(payload.images || {}).forEach(([raw, val]) => {
        const rawKey = String(raw || '');
        const k = rawKey.includes('|') ? rawKey : `${ev}|${rawKey}`;
        if(!/\|INGRESO[:|]/i.test(k) && !/^INGRESO[:|]/i.test(rawKey)) return;
        const src = srcOf(val); if(!src) return;
        const ref = typeof val === 'object' ? {...val, key:k, url:src, pathname:val.pathname || src} : {key:k, url:src, pathname:src};
        store[k] = src; refs[k] = ref;
        if(/^INGRESO[:|]/i.test(rawKey)){ store[rawKey] = src; refs[rawKey] = ref; }
        const id = rawKey.replace(/^.*?INGRESO[:|]/i, '').replace(/^INGRESO[:|]/i, '');
        if(id){ store[`${ev}|INGRESO:${id}`] = src; refs[`${ev}|INGRESO:${id}`] = {...ref, key:`${ev}|INGRESO:${id}`}; }
      });
    }catch(error){ console.warn('[v50.9] hydrate justificantes ingresos', error); }
    finally{ hydrationBusy = false; }
  }

  function parseEuro(value){
    if(typeof value === 'number') return Number.isFinite(value) ? value : 0;
    let s = String(value ?? '').trim().replace(/\s/g,'').replace(/€/g,'');
    if(!s) return 0;
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',', '.');
    else if(s.includes(',')) s = s.replace(',', '.');
    const n = Number(s); return Number.isFinite(n) ? n : 0;
  }
  function money(v){ try{ return (typeof window.money === 'function') ? window.money(Number(v || 0)) : new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0)); }catch(_){ return `${Number(v||0).toFixed(2)} €`; } }
  function receiptInfo(id){
    const raw = arr('colaboradores').find(r => same(r.id,id)) || {};
    const persona = arr('personas').find(p => same(p.id, raw.personaId)) || {};
    const ev = selectedEv() || {};
    const socio = up(persona.rango) === 'SOCIO';
    const precio = parseEuro(ev.precio || 0);
    const obligatorio = socio ? precio * Number(raw.numero || 0) : 0;
    const voluntario = parseEuro(raw.importe || raw.importeVoluntario || 0);
    return {nombre:persona.nombre || 'Sin nombre', rango:persona.rango || '-', situacion:raw.situacion || raw.ingreso || 'Pendiente', numero:Number(raw.numero || 0), obligatorio, voluntario, total:obligatorio + voluntario};
  }
  function collabIdFromCard(card){
    return card?.querySelector?.('button[data-action="save-collab"][data-id],button[data-action="delete-collab"][data-id],select[data-action="edit-collab-persona"][data-id],input[data-action="edit-collab-numero"][data-id],[data-action="edit-collab-situacion"][data-id]')?.dataset?.id || '';
  }
  function ensureReceiptField(card){
    let field = card.querySelector(':scope .ce-v509-receipt-field');
    if(field) return field;
    field = document.createElement('div');
    field.className = 'field ce-v509-receipt-field';
    field.innerHTML = '<label>Justificante</label><div class="ce-v509-receipt-strip"></div>';
    const row = card.querySelector('.rowline.collab') || card.querySelector('.rowline') || card;
    const actions = row.querySelector('button[data-action="save-collab"]')?.parentElement || row.querySelector('button[data-action="delete-collab"]')?.parentElement;
    // v50.19: el justificante debe quedar al extremo derecho del registro, no en mitad de la ficha.
    if(actions && actions.parentNode === row) actions.insertAdjacentElement('afterend', field);
    else row.appendChild(field);
    return field;
  }
  function normalizeReceiptFields(){
    injectStyle();
    const wrap = $('collabList'); if(!wrap) return;
    wrap.querySelectorAll('.itemcard,.rowline,.card').forEach(card => {
      const id = collabIdFromCard(card); if(!id) return;
      const src = receiptSrc(id);
      const writable = canWrite() && !isFinalizado();
      const field = ensureReceiptField(card);
      const strip = field.querySelector('.ce-v509-receipt-strip') || field;
      const html = `${src ? `<button type="button" class="ce-v509-receipt-thumb" data-ce-v509-receipt="view" data-id="${esc(id)}" title="Ver justificante"><img alt="Justificante" src="${esc(src)}"></button>` : `<span class="ce-v509-receipt-empty" title="Sin justificante">📷</span>`}${writable ? `<button type="button" class="ce-v509-receipt-btn" data-ce-v509-receipt="add" data-id="${esc(id)}" title="${src ? 'Cambiar justificante' : 'Adjuntar justificante'}">📎</button>${src ? `<button type="button" class="ce-v509-receipt-btn danger" data-ce-v509-receipt="delete" data-id="${esc(id)}" title="Eliminar justificante">🗑</button>` : ''}` : ''}`;
      const sig = JSON.stringify({html, src:!!src, writable, locked:isFinalizado(), role:role()});
      if(strip.dataset.sig !== sig){ strip.innerHTML = html; strip.dataset.sig = sig; }
      field.dataset.receiptHas = String(!!src);
    });
  }
  function showReceipt(id, ev){
    stop(ev || window.event || {});
    const src = receiptSrc(id);
    if(!src){ alert('Este ingreso no tiene justificante adjunto.'); return false; }
    const info = receiptInfo(id);
    let ov = $('ceV509ReceiptModal'); if(ov) ov.remove();
    ov = document.createElement('div'); ov.id='ceV509ReceiptModal'; ov.className='ce-v509-modal';
    ov.innerHTML = `<div class="ce-v509-modal-card" role="dialog" aria-modal="true"><div class="ce-v509-modal-head"><span>Justificante de ingreso</span><button type="button" class="outline small" data-close="1">Cerrar</button></div><div class="ce-v509-modal-info"><h3>${esc(info.nombre)}</h3><table><tbody><tr><td>Situación</td><td>${esc(info.situacion)}</td></tr><tr><td>Rango</td><td>${esc(info.rango)}</td></tr><tr><td>Nº personas</td><td>${esc(info.numero)}</td></tr><tr><td>Importe obligatorio</td><td>${esc(money(info.obligatorio))}</td></tr><tr><td>Importe voluntario</td><td>${esc(money(info.voluntario))}</td></tr><tr><td>Total ingreso</td><td>${esc(money(info.total))}</td></tr></tbody></table></div><img class="ce-v509-modal-img" alt="Justificante de ingreso" src="${esc(src)}"></div>`;
    document.body.appendChild(ov);
    const close = e => { stop(e || {}); try{ ov.remove(); }catch(_){ } setTimeout(normalizeReceiptFields, 40); return false; };
    ov.addEventListener('click', e => { if(e.target === ov || e.target?.closest?.('[data-close]')) return close(e); try{ e.stopPropagation(); }catch(_){ } }, true);
    ov.addEventListener('touchend', e => { if(e.target === ov || e.target?.closest?.('[data-close]')) return close(e); try{ e.stopPropagation(); }catch(_){ } }, {capture:true, passive:false});
    return false;
  }
  async function attachReceipt(id, ev){
    stop(ev || window.event || {});
    const now = Date.now();
    const busy = attachReceipt._busy || {};
    if(busy.id === String(id || '') && now - (busy.at || 0) < 1800) return false;
    attachReceipt._busy = {id:String(id || ''), at:now};
    if(!canWrite()){ alert('No autorizado para modificar justificantes.'); attachReceipt._busy = null; return false; }
    if(isFinalizado()){ alert('Evento finalizado. Solo se puede ver el justificante.'); attachReceipt._busy = null; return false; }
    const input=document.createElement('input'); input.type='file'; input.accept='image/*'; input.style.position='fixed'; input.style.left='-9999px'; input.style.top='-9999px'; document.body.appendChild(input);
    input.addEventListener('change', async () => {
      try{
        const file = input.files && input.files[0]; if(!file) return;
        if(!/^image\//i.test(file.type || '')){ alert('Selecciona una imagen.'); return; }
        const src = await readImage(file);
        const url = await uploadReceipt(id, src);
        if(url) setReceiptLocal(id, url);
        normalizeReceiptFields();
        call('saveState');
        await hydrateReceipts(true);
        normalizeReceiptFields();
      }catch(error){ alert('No se pudo adjuntar el justificante en servidor. No se deja copia solo local. ' + (error?.message || error)); }
      finally{ try{ input.remove(); }catch(_){ } setTimeout(() => { attachReceipt._busy = null; }, 350); }
    }, {once:true});
    input.click();
    setTimeout(() => { if(attachReceipt._busy && attachReceipt._busy.id === String(id || '')) attachReceipt._busy = null; }, 8000);
    return false;
  }
  async function removeReceipt(id, ev){
    stop(ev || window.event || {});
    if(!canWrite()){ alert('No autorizado para modificar justificantes.'); return false; }
    if(isFinalizado()){ alert('Evento finalizado. No se puede eliminar el justificante.'); return false; }
    if(!confirm('¿Eliminar el justificante de este ingreso?')) return false;
    try{ deleteReceiptLocal(id); await fetch(`/api/ticket-images?eventId=${encodeURIComponent(selectedId())}&key=${encodeURIComponent(keyOnly(id))}`, {method:'DELETE'}); }catch(_){ }
    call('saveState'); normalizeReceiptFields();
    return false;
  }
  function handleReceipt(ev){
    const btn = ev.target?.closest?.('[data-ce-v509-receipt]');
    if(!btn) return;
    const id = btn.dataset.id || ''; if(!id) return;
    const action = btn.getAttribute('data-ce-v509-receipt');
    const sig = `${action}|${id}`;
    const now = Date.now();
    const last = handleReceipt._last || {};
    if(last.sig === sig && now - (last.at || 0) < 900) return stop(ev || {});
    handleReceipt._last = {sig, at:now};
    if(action === 'view') return showReceipt(id, ev);
    if(action === 'add') return attachReceipt(id, ev);
    if(action === 'delete') return removeReceipt(id, ev);
  }

  function patchRender(){
    const old = getFn('render');
    if(typeof old !== 'function' || old.__ceV509Wrapped) return;
    const wrapped = function(){
      const ret = old.apply(this, arguments);
      [50,220].forEach(ms => setTimeout(() => { forceAuthenticatedUI(); applyVersion(); normalizeReceiptFields(); }, ms));
      return ret;
    };
    wrapped.__ceV509Wrapped = true;
    try{ render = wrapped; }catch(_){ }
    window.render = wrapped;
  }
  function patchRenderColabs(){
    const old = getFn('renderColabs');
    if(typeof old !== 'function' || old.__ceV509Wrapped) return;
    const wrapped = function(){
      const ret = old.apply(this, arguments);
      setTimeout(() => { hydrateReceipts(false).then(() => normalizeReceiptFields()); }, 30);
      return ret;
    };
    wrapped.__ceV509Wrapped = true;
    try{ renderColabs = wrapped; }catch(_){ }
    window.renderColabs = wrapped;
  }

  function install(){
    injectStyle(); applyVersion(); forceAuthenticatedUI(); patchRender(); patchRenderColabs();
    hydrateReceipts(false).then(() => normalizeReceiptFields());
  }

  // Login se captura en window para adelantarse a manejadores document antiguos que dejaban el overlay encima.
  window.addEventListener('click', ev => { if(ev.target?.closest?.('#btnLogin')) return loginV509(ev); }, {capture:true, passive:false});
  window.addEventListener('keydown', ev => { if(ev.key === 'Enter' && ev.target?.closest?.('#authOverlay') && ($('loginIdentificacion') === ev.target || $('loginClave') === ev.target)) return loginV509(ev); }, {capture:true, passive:false});
  ['click','touchend'].forEach(type => window.addEventListener(type, ev => { if(ev.target?.closest?.('[data-ce-v509-receipt]')) return handleReceipt(ev); }, {capture:true, passive:false}));
  window.addEventListener('change', ev => { if(ev.target?.id === 'selectedEvent') setTimeout(() => hydrateReceipts(true).then(() => normalizeReceiptFields()), 180); }, true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted','controlevent:modules-ready'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 20)));
  [0,100,400,1200].forEach(ms => setTimeout(install, ms));

  window.ControlEventV509 = {version:VERSION, versionFile:VERSION_FILE, install, login:loginV509, hydrateReceipts, normalizeReceiptFields, forceAuthenticatedUI};
})();
