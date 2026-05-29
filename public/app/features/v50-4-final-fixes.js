/* ControlEvent v1.0/pr - estabilizacion final de menus por rol, justificantes de ingresos y refresco.
   - Un solo conjunto visible de controles de justificante en INGRESOS.
   - iPad: controles de justificante tratados como boton tactil propio, igual que tickets.
   - Salir/Refrescar visibles en movil vertical.
   - RO/RW: menu estable sin enseñar opciones no permitidas durante repintados.
   - Rehidratacion de INGRESOS/DONACIONES/COMPRAS si alguna lista queda vacia tras elegir evento.
   - Cabeceras de globos: si una cabecera aparece al final, se recoloca al principio.
*/
(function(){
  'use strict';
  const VERSION = 'ControlEvent v1.0/pr';
  const VERSION_FILE = 'ControlEvent_v1_0_pr';
  const INSTALLED = '__ceV504FinalFixes';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const same = (a,b) => String(a ?? '') === String(b ?? '');
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cssEsc = v => { try{ return window.CSS?.escape ? CSS.escape(String(v ?? '')) : String(v ?? '').replace(/[^a-zA-Z0-9_-]/g, '\\$&'); }catch(_){ return String(v ?? '').replace(/"/g,'\\"'); } };

  const TABS = ['ingresos','donaciones','compras','mapa','planificacion','resumen','graficas'];
  const PANEL = {ingresos:'tabIngresos',donaciones:'tabDonaciones',compras:'tabCompras',mapa:'tabMapaProductos',planificacion:'tabPlanificacionInicial',resumen:'tabResumen',graficas:'tabGraficas'};
  const BTN = {ingresos:'tabIngresosBtn',donaciones:'tabDonacionesBtn',compras:'tabComprasBtn',mapa:'tabMapaBtn',planificacion:'tabPlanificacionBtn',resumen:'tabResumenBtn',graficas:'tabGraficasBtn'};
  const TAB_BY_BTN = Object.entries(BTN).reduce((a,[t,id]) => (a[id]=t,a),{});

  function st(){ try{ if(typeof state !== 'undefined') return state || {}; }catch(_){ } try{ return window.state || window.ControlEventApp?.state || {}; }catch(_){ return {}; } }
  function auth(){ try{ if(typeof authUser !== 'undefined' && authUser) return authUser; }catch(_){ } return window.authUser || window.ControlEventApp?.authUser || null; }
  function role(){ return up(auth()?.nivel || ''); }
  function isGD(){ return role()==='GD'; }
  function isRW(){ return role()==='RW'; }
  function isRO(){ return role()==='RO'; }
  function canWrite(){ return isGD() || isRW(); }
  function arr(k){ const s=st(); return Array.isArray(s[k]) ? s[k] : []; }
  function selectedId(){ try{ const ev = typeof selectedEvent === 'function' ? selectedEvent() : null; if(ev?.id) return String(ev.id); }catch(_){ } return String(st().selectedEventId || ''); }
  function selectedEv(){ const id=selectedId(); return arr('eventos').find(e => same(e.id,id)) || null; }
  function isFinalizado(){ return up(selectedEv()?.situacion || '') === 'FINALIZADO'; }
  function getFn(name){ try{ if(typeof window[name] === 'function') return window[name]; }catch(_){ } try{ return Function('return (typeof '+name+' === "function") ? '+name+' : null')(); }catch(_){ return null; } }
  function call(name){ const fn=getFn(name); if(typeof fn !== 'function') return undefined; try{ return fn(); }catch(error){ console.warn('[v50.4] '+name, error); return undefined; } }
  function currentTab(){
    let v=''; try{ if(typeof currentMainTab !== 'undefined') v=String(currentMainTab||''); }catch(_){ }
    if(TABS.includes(v)) return v;
    v=String(window.ControlEventApp?.navigation?.currentMainTab || window.__ceCurrentMainTab || ''); if(TABS.includes(v)) return v;
    const visible=TABS.find(t => { const p=$(PANEL[t]); return p && !p.classList.contains('hidden') && getComputedStyle(p).display !== 'none'; });
    return visible || 'ingresos';
  }
  function roleAllows(tab){
    if(!auth()) return false;
    tab=String(tab || '');
    if(isRO()) return ['resumen','mapa','graficas'].includes(tab);
    if(tab === 'planificacion') return isGD();
    return TABS.includes(tab);
  }
  function defaultTab(prefer){ const p=String(prefer || ''); if(roleAllows(p)) return p; return isRO() ? 'resumen' : 'ingresos'; }
  function setCurrentTab(tab){ const t=defaultTab(tab || currentTab()); try{ currentMainTab=t; }catch(_){ } try{ if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab=t; }catch(_){ } window.__ceCurrentMainTab=t; return t; }
  function show(el, yes){
    if(!el) return;
    if(yes){
      el.classList.remove('hidden','ce-v452-hidden-role','ce-v502-hidden-role','ce-v504-hidden-role');
      el.removeAttribute('hidden'); el.removeAttribute('aria-hidden'); el.removeAttribute('aria-disabled');
      if('disabled' in el) el.disabled=false;
      el.style.removeProperty('display'); el.style.removeProperty('visibility'); el.style.removeProperty('opacity'); el.style.removeProperty('pointer-events');
    }else{
      el.classList.add('hidden','ce-v504-hidden-role'); el.setAttribute('aria-hidden','true'); el.setAttribute('aria-disabled','true');
      if('disabled' in el) el.disabled=true; el.style.setProperty('display','none','important');
    }
  }

  function injectStyle(){
    if($('ceV504FinalStyle')) return;
    const style=document.createElement('style'); style.id='ceV504FinalStyle';
    style.textContent = `
      body.ce-authenticated-v504 #authOverlay{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      .ce-v504-hidden-role{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      body.ce-role-rw-v504 #tabPlanificacionBtn,body.ce-role-ro-v504 #tabPlanificacionBtn,body:not(.ce-role-gd-v504) #tabPlanificacionBtn{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      body.ce-role-ro-v504 #tabIngresosBtn,body.ce-role-ro-v504 #tabDonacionesBtn,body.ce-role-ro-v504 #tabComprasBtn,body.ce-role-ro-v504 #tabPlanificacionBtn{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      body.ce-role-ro-v504 #btnExportExcel,body.ce-role-ro-v504 #btnOpenImport,body.ce-role-ro-v504 #btnExportSeed,body.ce-role-ro-v504 #btnToggleMaintenance{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      .ce-ingreso-receipt-tools-v463,.ce-v464-receipt-tools,.ce-v465-receipt-strip,.ce-v501-receipt-strip,.ce-v502-receipt-strip{display:none!important;visibility:hidden!important;pointer-events:none!important;width:0!important;height:0!important;overflow:hidden!important;margin:0!important;padding:0!important;}
      .ce-v504-receipt-strip{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:5px!important;margin-left:6px!important;vertical-align:middle!important;white-space:nowrap!important;max-width:120px!important;}
      .ce-v504-receipt-thumb,.ce-v504-receipt-btn{appearance:none!important;-webkit-appearance:none!important;border:0!important;background:transparent!important;box-shadow:none!important;padding:1px!important;margin:0!important;border-radius:8px!important;cursor:pointer!important;touch-action:manipulation!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;min-width:26px!important;min-height:26px!important;pointer-events:auto!important;position:relative!important;z-index:5!important;}
      .ce-v504-receipt-thumb img{width:30px!important;height:24px!important;object-fit:cover!important;border-radius:6px!important;border:1px solid rgba(15,23,42,.20)!important;display:block!important;pointer-events:none!important;}
      .ce-v504-receipt-empty{font-size:18px!important;opacity:.58!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;min-width:22px!important;min-height:22px!important;}
      .ce-v504-receipt-btn{font-size:18px!important;line-height:1!important;background:rgba(255,255,255,.82)!important;border:1px solid rgba(15,23,42,.10)!important;}
      .ce-v504-receipt-btn.danger{background:rgba(254,226,226,.86)!important;}
      .ce-v504-modal{position:fixed!important;inset:0!important;background:rgba(15,23,42,.76)!important;z-index:999999!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:16px!important;animation:ceV504ModalIn .16s ease-out both!important;touch-action:auto!important;}
      .ce-v504-modal-card{width:min(980px,96vw)!important;max-height:92vh!important;background:#fff!important;border-radius:20px!important;box-shadow:0 24px 80px rgba(0,0,0,.42)!important;padding:12px!important;display:flex!important;flex-direction:column!important;gap:10px!important;overflow:auto!important;}
      .ce-v504-modal-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;font-weight:950!important;color:#0f172a!important;}
      .ce-v504-modal-info h3{margin:0 0 8px!important;font-size:16px!important;}
      .ce-v504-modal-info table{width:100%!important;border-collapse:collapse!important;font-size:12px!important;margin-bottom:6px!important;}
      .ce-v504-modal-info td{padding:3px 6px!important;border-bottom:1px solid #e5e7eb!important;}
      .ce-v504-modal-info td:first-child{font-weight:850!important;color:#334155!important;width:40%!important;}
      .ce-v504-modal-img{max-width:100%!important;max-height:64vh!important;object-fit:contain!important;border-radius:13px!important;background:#f8fafc!important;}
      @keyframes ceV504ModalIn{from{opacity:0;transform:scale(.985)}to{opacity:1;transform:scale(1)}}
      @media(max-width:760px){
        #btnLogout:not(.hidden),#btnSoftRefresh:not(.hidden){position:fixed!important;top:calc(env(safe-area-inset-top,0px) + 8px)!important;z-index:7500!important;height:34px!important;border-radius:12px!important;background:rgba(255,255,255,.98)!important;color:#111827!important;box-shadow:0 8px 24px rgba(15,23,42,.18)!important;font-size:12px!important;font-weight:900!important;pointer-events:auto!important;touch-action:manipulation!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;padding:0 9px!important;}
        #btnLogout:not(.hidden){left:calc(env(safe-area-inset-left,0px) + 8px)!important;right:auto!important;min-width:56px!important;}
        #btnSoftRefresh:not(.hidden){left:calc(env(safe-area-inset-left,0px) + 72px)!important;right:auto!important;min-width:78px!important;}
        .appname{padding-left:154px!important;}
      }
    `;
    document.head.appendChild(style);
  }

  function applyVersion(){
    try{ document.title=VERSION; document.body.dataset.ceVersion=VERSION; window.__ceVersion=VERSION; window.VERSION=VERSION; window.VERSION_FILE=VERSION_FILE; window.ControlEventVersion={version:VERSION,versionFile:VERSION_FILE}; }catch(_){ }
    try{ document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => { const t=el.textContent||''; if(/ControlEvent\s+v\d+(?:\.\d+)*/i.test(t)) el.textContent=t.replace(/ControlEvent\s+v\d+(?:\.\d+)*/ig, VERSION); }); }catch(_){ }
  }

  function applyRoleMenu(){
    const r=role();
    document.body.classList.toggle('ce-authenticated-v504', !!auth());
    document.body.classList.toggle('ce-role-gd-v504', r==='GD');
    document.body.classList.toggle('ce-role-rw-v504', r==='RW');
    document.body.classList.toggle('ce-role-ro-v504', r==='RO');
    if(!auth()) return;
    const active=setCurrentTab(currentTab());
    Object.entries(BTN).forEach(([tab,id]) => show($(id), roleAllows(tab)));
    if(isRO()) ['btnExportExcel','btnOpenImport','btnExportSeed','btnToggleMaintenance'].forEach(id => show($(id), false));
    else ['btnExportExcel','btnOpenImport','btnExportSeed','btnToggleMaintenance'].forEach(id => show($(id), true));
    TABS.forEach(tab => {
      const p=$(PANEL[tab]); if(!p) return;
      const visible = roleAllows(tab) && tab === active;
      p.classList.toggle('hidden', !visible);
      if(visible) p.style.removeProperty('display');
      else if(!roleAllows(tab)) p.style.setProperty('display','none','important');
    });
    Object.entries(BTN).forEach(([tab,id]) => { const b=$(id); if(b) b.classList.toggle('active', roleAllows(tab) && tab===active); });
  }

  function stop(ev){ try{ ev?.preventDefault?.(); ev?.stopPropagation?.(); ev?.stopImmediatePropagation?.(); }catch(_){ } return false; }
  function srcOf(v){ if(!v) return ''; if(typeof v === 'string') return v; if(typeof v === 'object') return v.url || v.public_url || v.publicUrl || v.pathname || v.path || v.storage_path || v.dataUrl || v.base64 || ''; return ''; }
  function dataUrl(v){ return /^data:image\//i.test(String(v||'')); }
  function imageStore(){ const s=st(); if(!s.ticketImages || typeof s.ticketImages !== 'object') s.ticketImages={}; if(!s.ticketImageRefs || typeof s.ticketImageRefs !== 'object') s.ticketImageRefs={}; return s.ticketImages; }
  function fullKey(id){ return `${selectedId()}|INGRESO:${String(id||'')}`; }
  function keyOnly(id){ return `INGRESO:${String(id||'')}`; }
  function legacyKeys(id){ const ev=selectedId(), sid=String(id||''); return [`${ev}|INGRESO:${sid}`,`${ev}|INGRESO|${sid}`,`INGRESO:${ev}|${sid}`]; }
  function jsonGet(k){ try{ return JSON.parse(localStorage.getItem(k)||'{}') || {}; }catch(_){ return {}; } }
  const BACKUP_KEYS=['ControlEvent_ingreso_receipts_v502','ControlEvent_ingreso_receipts_v468'];
  function backupPut(k,src){ if(!k || !src || !dataUrl(src)) return; BACKUP_KEYS.forEach(key => { const b=jsonGet(key); b[k]=src; try{ localStorage.setItem(key, JSON.stringify(b)); }catch(_){ } }); }
  function backupDelete(id){ BACKUP_KEYS.forEach(key => { const b=jsonGet(key); legacyKeys(id).forEach(k => delete b[k]); try{ localStorage.setItem(key, JSON.stringify(b)); }catch(_){ } }); }
  function receiptSrc(id){
    const store=imageStore(), refs=st().ticketImageRefs || {};
    for(const k of legacyKeys(id)){ const s=srcOf(store[k]); if(s) return s; }
    for(const k of legacyKeys(id)){ const s=srcOf(refs[k]); if(s) return s; }
    for(const key of BACKUP_KEYS){ const b=jsonGet(key); for(const k of legacyKeys(id)){ const s=srcOf(b[k]); if(s) return s; } }
    return '';
  }
  function setReceiptLocal(id, src, ref){ if(!id || !src) return; const k=fullKey(id); const store=imageStore(), refs=st().ticketImageRefs || {}; store[k]=src; refs[k]=ref && typeof ref === 'object' ? {...ref,key:k,url:src,pathname:ref.pathname||src} : {key:k,url:src,pathname:src}; backupPut(k,src); }
  function deleteReceiptLocal(id){ const store=imageStore(), refs=st().ticketImageRefs || {}; legacyKeys(id).forEach(k => { try{ delete store[k]; delete refs[k]; }catch(_){ } }); backupDelete(id); }
  function readImage(file){ return new Promise((resolve,reject) => { const r=new FileReader(); r.onload=()=>resolve(String(r.result||'')); r.onerror=()=>reject(r.error || new Error('No se pudo leer la imagen.')); r.readAsDataURL(file); }); }
  async function uploadReceipt(id,src){
    if(!id || !selectedId() || !dataUrl(src)) return src;
    const res=await fetch('/api/ticket-images',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId:selectedId(),key:keyOnly(id),dataUrl:src})});
    const payload=await res.json().catch(() => ({})); if(!res.ok || !payload.ok) throw new Error(payload.error || payload.message || 'No se pudo guardar la imagen.');
    const img=payload.image || {}, url=img.url || img.public_url || img.pathname || src; setReceiptLocal(id,url,{key:img.key||fullKey(id),url,pathname:img.pathname||url,contentType:img.contentType||img.content_type||'',size:img.size||img.size_bytes||0}); return url;
  }
  async function hydrateReceipts(force){
    const ev=selectedId(); if(!ev) return; hydrateReceipts._last=hydrateReceipts._last||new Map(); const last=hydrateReceipts._last.get(ev)||0; if(!force && Date.now()-last<7000) return; hydrateReceipts._last.set(ev,Date.now());
    try{
      const res=await fetch(`/api/ticket-images?eventId=${encodeURIComponent(ev)}`,{cache:'no-store'}); const payload=await res.json().catch(() => ({})); if(!res.ok || !payload.ok || !payload.images) return;
      const store=imageStore(), refs=st().ticketImageRefs || {};
      Object.entries(payload.images).forEach(([raw,val]) => { const k=String(raw).includes('|') ? String(raw) : `${ev}|${String(raw)}`; if(!/\|INGRESO[:|]/i.test(k)) return; const src=srcOf(val); if(!src) return; if(!srcOf(store[k])) store[k]=src; if(!srcOf(refs[k])) refs[k]=typeof val==='object' ? {...val,key:k,url:src,pathname:val.pathname||src} : {key:k,url:src,pathname:src}; });
      normalizeReceipts();
    }catch(error){ console.warn('[v50.4] hydrate justificantes', error); }
  }
  function saveNow(){ try{ if(typeof saveState === 'function') return saveState(); }catch(_){ } try{ return window.saveState?.(); }catch(_){ } }
  function money(v){ try{ return (typeof window.money === 'function') ? window.money(Number(v||0)) : new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0)); }catch(_){ return `${Number(v||0).toFixed(2)} €`; } }
  function parseEuro(v){ if(typeof v==='number') return Number.isFinite(v)?v:0; let s=String(v??'').replace(/\s/g,'').replace(/€/g,''); if(s.includes(',')&&s.includes('.')) s=s.replace(/\./g,'').replace(',','.'); else if(s.includes(',')) s=s.replace(',','.'); const n=Number(s); return Number.isFinite(n)?n:0; }
  function receiptInfo(id){ const row=arr('colaboradores').find(r => same(r.id,id)) || {}; const p=arr('personas').find(x => same(x.id,row.personaId)) || {}; const ev=selectedEv() || {}; const socio=up(p.rango)==='SOCIO'; const precio=parseEuro(ev.precio); const obligatorio=socio ? precio * Number(row.numero || 0) : 0; const voluntario=parseEuro(row.importe); return {nombre:p.nombre||'-',rango:p.rango||'-',situacion:row.situacion||row.ingreso||'Pendiente',numero:Number(row.numero||0),obligatorio,voluntario,total:obligatorio+voluntario}; }
  function showReceipt(id,ev){
    const src=receiptSrc(id); if(!src){ alert('Este ingreso no tiene justificante adjunto.'); return stop(ev); }
    const info=receiptInfo(id); let ov=$('ceV504ReceiptModal'); if(ov) ov.remove(); ov=document.createElement('div'); ov.id='ceV504ReceiptModal'; ov.className='ce-v504-modal';
    ov.innerHTML=`<div class="ce-v504-modal-card"><div class="ce-v504-modal-head"><span>Justificante de ingreso</span><button type="button" class="outline small" data-close="1">Cerrar</button></div><div class="ce-v504-modal-info"><h3>${esc(info.nombre)}</h3><table><tbody><tr><td>Rango</td><td>${esc(info.rango)}</td></tr><tr><td>Situación</td><td>${esc(info.situacion)}</td></tr><tr><td>Nº personas</td><td>${esc(info.numero)}</td></tr><tr><td>Importe obligatorio</td><td>${esc(money(info.obligatorio))}</td></tr><tr><td>Importe voluntario</td><td>${esc(money(info.voluntario))}</td></tr><tr><td>Total ingreso</td><td>${esc(money(info.total))}</td></tr></tbody></table></div><img class="ce-v504-modal-img" alt="Justificante de ingreso" src="${esc(src)}"></div>`;
    document.body.appendChild(ov);
    const close=e => { stop(e); try{ ov.remove(); }catch(_){ } setTimeout(() => { normalizeReceipts(); normalizeTooltips(); }, 30); return false; };
    ov.addEventListener('click', e => { if(e.target===ov || e.target?.closest?.('[data-close]')) return close(e); try{ e.stopPropagation(); }catch(_){ } }, true);
    return stop(ev);
  }
  async function attachReceipt(id,ev){
    if(!canWrite()){ alert('No autorizado para modificar justificantes.'); return stop(ev); }
    if(isFinalizado()){ alert('Evento finalizado. Solo se puede ver el justificante.'); return stop(ev); }
    const input=document.createElement('input'); input.type='file'; input.accept='image/*'; input.style.position='fixed'; input.style.left='-9999px'; input.style.top='-9999px'; document.body.appendChild(input);
    input.addEventListener('change', async () => { try{ const f=input.files && input.files[0]; if(!f) return; if(!/^image\//i.test(f.type||'')){ alert('Selecciona una imagen.'); return; } const src=await readImage(f); setReceiptLocal(id,src); normalizeReceipts(); try{ await uploadReceipt(id,src); }catch(error){ console.warn('[v50.4] justificante queda local hasta poder subir', error); } saveNow(); normalizeReceipts(); hydrateReceipts(true); }catch(error){ alert('No se pudo adjuntar el justificante. '+(error?.message || error)); } finally{ try{ input.remove(); }catch(_){ } } }, {once:true});
    input.click(); return stop(ev);
  }
  async function removeReceipt(id,ev){
    if(!canWrite()){ alert('No autorizado para modificar justificantes.'); return stop(ev); }
    if(isFinalizado()){ alert('Evento finalizado. No se puede eliminar el justificante.'); return stop(ev); }
    if(!confirm('¿Eliminar el justificante de este ingreso?')) return stop(ev);
    try{ deleteReceiptLocal(id); await fetch(`/api/ticket-images?eventId=${encodeURIComponent(selectedId())}&key=${encodeURIComponent(keyOnly(id))}`,{method:'DELETE'}); }catch(_){ }
    saveNow(); normalizeReceipts(); return stop(ev);
  }
  function collabIdFromCard(card){ return card?.querySelector?.('button[data-action="save-collab"][data-id],button[data-action="delete-collab"][data-id],select[data-action="edit-collab-persona"][data-id],input[data-action="edit-collab-numero"][data-id],[data-action="edit-collab-situacion"][data-id]')?.dataset?.id || ''; }
  function normalizeReceipts(){
    const wrap=$('collabList'); if(!wrap) return; injectStyle();
    wrap.querySelectorAll('.ce-ingreso-receipt-tools-v463,.ce-v464-receipt-tools,.ce-v465-receipt-strip,.ce-v501-receipt-strip,.ce-v502-receipt-strip').forEach(el => { try{ el.remove(); }catch(_){ } });
    wrap.querySelectorAll('.itemcard,.rowline,.card').forEach(card => {
      const id=collabIdFromCard(card); if(!id) return;
      const src=receiptSrc(id); const writable=canWrite() && !isFinalizado();
      const html=`${src ? `<button type="button" class="ce-v504-receipt-thumb" data-ce-v504-receipt="view" data-id="${esc(id)}" title="Ver justificante"><img alt="Justificante" src="${esc(src)}"></button>` : `<span class="ce-v504-receipt-empty" title="Sin justificante">📷</span>`}${writable ? `<button type="button" class="ce-v504-receipt-btn" data-ce-v504-receipt="add" data-id="${esc(id)}" title="${src?'Cambiar justificante':'Adjuntar justificante'}">📎</button>${src ? `<button type="button" class="ce-v504-receipt-btn danger" data-ce-v504-receipt="delete" data-id="${esc(id)}" title="Eliminar justificante">🗑</button>` : ''}` : ''}`;
      let boxes=Array.from(card.querySelectorAll('.ce-v504-receipt-strip')); let box=boxes.shift(); boxes.forEach(x => { try{ x.remove(); }catch(_){ } });
      if(!box){ box=document.createElement('div'); box.className='ce-v504-receipt-strip'; const target=card.querySelector('button[data-action="save-collab"]')?.parentElement || card.querySelector('button[data-action="delete-collab"]')?.parentElement || card; try{ target.appendChild(box); }catch(_){ card.appendChild(box); } }
      if(box.dataset.sig !== html){ box.innerHTML=html; box.dataset.sig=html; }
    });
  }
  function handleReceipt(ev){
    const btn=ev.target?.closest?.('[data-ce-v504-receipt]'); if(!btn) return;
    const id=btn.dataset.id || ''; if(!id) return;
    const action=btn.dataset.ceV504Receipt || btn.getAttribute('data-ce-v504-receipt');
    if(action==='view') return showReceipt(id,ev);
    if(action==='add') return attachReceipt(id,ev);
    if(action==='delete') return removeReceipt(id,ev);
  }

  async function softRefresh(reason){
    if(softRefresh.busy) return false; softRefresh.busy=true;
    const btn=$('btnSoftRefresh'), prev=btn?.textContent || 'Refrescar'; if(btn){ btn.textContent='Refrescando...'; btn.disabled=true; }
    const evBefore=selectedId(); const tabBefore=defaultTab(currentTab());
    try{
      const res=await fetch('/api/state',{cache:'no-store'}); if(!res.ok) throw new Error('No se pudo cargar /api/state');
      const serverState=await res.json(); const target=st(); Object.keys(target).forEach(k => delete target[k]); Object.assign(target, serverState || {}); if(evBefore) target.selectedEventId=evBefore;
      setCurrentTab(tabBefore); applyRoleMenu(); call('renderAuthUI'); call('renderHeader'); call('render');
      setTimeout(() => { applyRoleMenu(); ensureCriticalData('soft-refresh'); hydrateReceipts(true); normalizeReceipts(); }, 120);
      return true;
    }catch(error){ console.warn('[v50.4] refrescar', error); alert('No se pudo refrescar. Prueba cambiar de evento o salir/entrar si continúa.'); return false; }
    finally{ softRefresh.busy=false; if(btn){ btn.textContent=prev; btn.disabled=false; } }
  }
  function handleRefresh(ev){ const btn=ev.target?.closest?.('#btnSoftRefresh'); if(!btn) return; stop(ev); const r=window.ControlEventV452?.refreshActive; if(typeof r==='function'){ try{ r('v50.4-direct'); }catch(_){ softRefresh('v50.4-fallback'); } } else softRefresh('v50.4-direct'); return false; }

  function ensureCriticalData(reason){
    const ev=selectedId(); if(!ev) return;
    const specs=[
      {tab:'ingresos', list:'collabList', rows:arr('colaboradores').filter(r=>same(r.eventId,ev)), render:() => { call('renderIngresosSummary'); call('renderColabs'); normalizeReceipts(); }},
      {tab:'donaciones', list:'donacionesList', rows:arr('compras').filter(r=>same(r.eventId,ev) && ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'].includes(up(r.ticketDonacion))), render:() => call('renderDonaciones')},
      {tab:'compras', list:'comprasList', rows:arr('compras').filter(r=>same(r.eventId,ev) && !['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'].includes(up(r.ticketDonacion))), render:() => call('renderCompras')}
    ];
    specs.forEach(s => {
      const list=$(s.list); if(!list || !s.rows.length) return;
      const text=up(list.textContent || '');
      const hasRecords=list.querySelector('[data-id],button[data-action],input[data-action],select[data-action],.itemcard,.rowline');
      if(!hasRecords || /NO HAY|SIN DATOS|SIN REGISTROS/.test(text)){ setTimeout(s.render, 10); setTimeout(s.render, 220); }
    });
  }
  function handleNav(ev){
    const trg=ev.target?.closest?.('button[id],.tab[id]'); if(!trg) return;
    const tab=TAB_BY_BTN[trg.id] || '';
    if(tab && !roleAllows(tab)){ stop(ev); applyRoleMenu(); return false; }
    if(tab){ setCurrentTab(tab); setTimeout(() => { applyRoleMenu(); ensureCriticalData('nav'); normalizeReceipts(); }, 90); }
  }
  function handleEventChange(){ setTimeout(() => { applyRoleMenu(); ensureCriticalData('event-change'); hydrateReceipts(true); normalizeReceipts(); }, 160); [500,1200,2400].forEach(ms => setTimeout(() => ensureCriticalData('event-change-late'), ms)); }

  function normalizeTooltips(){
    const roots=['ceTooltipV21','ceBudgetLiteTooltipV307','ceV462Tooltip'].map($).filter(Boolean).concat(Array.from(document.querySelectorAll('.ce-v21-tooltip,.ce-budget-tooltip,.ce-tooltip')));
    roots.forEach(root => {
      root.querySelectorAll('table').forEach(tbl => {
        const rows=Array.from(tbl.querySelectorAll('tr')); if(rows.length<2) return;
        const isHeader = tr => {
          const t=up(Array.from(tr.children).map(td=>td.textContent).join(' | '));
          return /(DONANTE\s*\|\s*PRODUCTO\s*\|\s*CANT|TICKET\s*\|\s*TIENDA\s*\|\s*PRODUCTO|TIENDA\s*\|\s*TICKET\s*\|\s*PRODUCTO|NOMBRE\s*\|\s*INGRESO\s*\|\s*IMPORTE)/.test(t);
        };
        const idx=rows.findIndex(isHeader);
        if(idx>0){ const tr=rows[idx]; tr.parentNode.insertBefore(tr, rows[0]); tr.classList.add('ce-v504-tooltip-header-row'); }
        const first=tbl.querySelector('tr'); if(first && isHeader(first)) first.classList.add('ce-v504-tooltip-header-row');
      });
    });
  }

  function wrapRender(){ const old=getFn('render'); if(!old || old.__ceV504Wrapped) return; const wrapped=function(){ const ret=old.apply(this, arguments); [30,180,550].forEach(ms => setTimeout(() => { applyVersion(); applyRoleMenu(); ensureCriticalData('render'); normalizeReceipts(); normalizeTooltips(); }, ms)); return ret; }; wrapped.__ceV504Wrapped=true; try{ render=wrapped; }catch(_){ } window.render=wrapped; }
  function install(){ injectStyle(); applyVersion(); applyRoleMenu(); hydrateReceipts(false); normalizeReceipts(); normalizeTooltips(); wrapRender(); ensureCriticalData('install'); }

  ['click','pointerup','touchend'].forEach(evt => { window.addEventListener(evt, handleReceipt, {capture:true, passive:false}); document.addEventListener(evt, handleReceipt, {capture:true, passive:false}); window.addEventListener(evt, handleRefresh, {capture:true, passive:false}); });
  window.addEventListener('click', handleNav, true);
  window.addEventListener('change', ev => { if(ev.target?.id === 'selectedEvent') handleEventChange(); }, true);
  document.addEventListener('click', () => setTimeout(normalizeTooltips, 30), true);
  document.addEventListener('wheel', ev => { if(ev.target?.closest?.('#ceTooltipV21,#ceBudgetLiteTooltipV307,.ce-v21-tooltip,.ce-budget-tooltip')) try{ ev.stopPropagation(); }catch(_){ } }, true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 25)));
  [0,80,250,700,1500,3000].forEach(ms => setTimeout(install, ms));
  setInterval(() => { applyRoleMenu(); ensureCriticalData('timer'); normalizeTooltips(); }, window.ControlEventLowResource?.interval?.(12000) || 12000);

  window.ControlEventV504 = {version:VERSION, versionFile:VERSION_FILE, install, applyRoleMenu, normalizeReceipts, hydrateReceipts, softRefresh, ensureCriticalData};
})();
