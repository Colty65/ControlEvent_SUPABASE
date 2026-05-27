/* ControlEvent v50.0 - justificantes de INGRESOS y marca negrita post-modificación.
   Carga antes del parche final para poder capturar el click de Modificar antes de que los manejadores legacy lo intercepten.
*/
(function(){
  'use strict';
  const VERSION = 'ControlEvent v50.0';
  const VERSION_FILE = 'ControlEvent_v50_0';
  const INSTALLED = '__ceV464JustificantesNegrita';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const same = (a,b) => String(a ?? '') === String(b ?? '');
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cssEsc = v => { try{ return window.CSS?.escape ? CSS.escape(String(v ?? '')) : String(v ?? '').replace(/[^a-zA-Z0-9_-]/g, '\\$&'); }catch(_){ return String(v ?? '').replace(/"/g,'\\"'); } };
  function st(){ try{ if(typeof state !== 'undefined') return state || {}; }catch(_){ } return window.state || window.ControlEventApp?.state || {}; }
  function role(){ try{ if(typeof authUser !== 'undefined' && authUser) return norm(authUser.nivel).toUpperCase(); }catch(_){ } return norm(window.authUser?.nivel || window.ControlEventApp?.authUser?.nivel || '').toUpperCase(); }
  function canWrite(){ const r = role(); return r === 'GD' || r === 'RW'; }
  function selectedId(){ try{ const ev = typeof selectedEvent === 'function' ? selectedEvent() : null; if(ev?.id) return String(ev.id); }catch(_){ } return String(st().selectedEventId || ''); }
  function selectedEv(){ const id = selectedId(); try{ const ev = typeof selectedEvent === 'function' ? selectedEvent() : null; if(ev?.id) return ev; }catch(_){ } return (Array.isArray(st().eventos)?st().eventos:[]).find(e => same(e.id, id)) || null; }
  function locked(){ try{ return typeof isLocked === 'function' ? !!isLocked() : norm(selectedEv()?.situacion).toUpperCase() === 'FINALIZADO'; }catch(_){ return false; } }
  function saveNow(){ try{ if(typeof saveState === 'function') return saveState(); }catch(_){ } try{ return window.saveState?.(); }catch(_){ } }
  function renderNow(){ try{ if(typeof render === 'function') return render(); }catch(_){ } try{ return window.render?.(); }catch(_){ } }
  function stop(ev){ try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ } return false; }

  function injectStyle(){
    if($('ceV464JustificanteStyle')) return;
    const style = document.createElement('style');
    style.id = 'ceV464JustificanteStyle';
    style.textContent = `
      .ce-v464-modified,.ce-v464-modified *{font-weight:900!important;}
      .ce-v464-modified input,.ce-v464-modified select,.ce-v464-modified textarea,.ce-v464-modified button{font-weight:900!important;}
      .ce-v464-receipt-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px;grid-column:1/-1;width:100%;}
      .ce-v464-receipt-tools .ce-v464-receipt-ok{font-weight:900;color:#065f46;background:#d1fae5;border:1px solid #34d399;border-radius:999px;padding:4px 9px;font-size:12px;}
      .ce-v464-receipt-tools button{min-height:30px;cursor:pointer;}
      .ce-v464-receipt-modal{position:fixed;inset:0;background:rgba(15,23,42,.74);z-index:999999;display:flex;align-items:center;justify-content:center;padding:18px;animation:ceV464FadeIn .18s ease-out both;}
      .ce-v464-receipt-card{max-width:min(980px,96vw);max-height:92vh;background:#fff;border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.42);padding:12px;display:flex;flex-direction:column;gap:10px;}
      .ce-v464-receipt-head{display:flex;align-items:center;justify-content:space-between;gap:12px;font-weight:950;color:#0f172a;}
      .ce-v464-receipt-card img{max-width:100%;max-height:78vh;object-fit:contain;border-radius:12px;background:#f8fafc;}
      @keyframes ceV464FadeIn{from{opacity:0;transform:scale(.985)}to{opacity:1;transform:scale(1)}}
    `;
    document.head.appendChild(style);
  }

  const modified = new Map();
  const saveActions = new Set(['save-producto','save-evento','save-tienda','save-persona','save-acceso','save-collab','save-donacion','save-compra']);
  function cardFor(id, action){
    const safe = cssEsc(id);
    const selectors = [
      `button[data-action="${cssEsc(action)}"][data-id="${safe}"]`,
      `[data-action][data-id="${safe}"]`,
      `[data-record-id="${safe}"]`,
      `[data-id="${safe}"]`
    ];
    for(const sel of selectors){
      try{
        const el = document.querySelector(sel);
        const card = el?.closest?.('.itemcard,.rowline,.card,tr,li,[data-record-id],.access-user-card,.maintenance-card,.summary-card') || el;
        if(card) return card;
      }catch(_){ }
    }
    return null;
  }
  function applyModifiedMarks(){
    modified.forEach((action,id) => {
      const card = cardFor(id, action);
      if(!card) return;
      card.classList.add('ce-v464-modified','ce-v46-modified');
      card.querySelectorAll('input,select,textarea,button,label,span,strong,td,th,div').forEach(el => { try{ el.style.fontWeight = '900'; }catch(_){ } });
    });
  }
  function rememberModified(btn){
    const action = btn?.dataset?.action || '';
    const id = btn?.dataset?.id || '';
    if(!id || !saveActions.has(action)) return;
    modified.set(String(id), action);
    [30,90,180,420,850,1500,2600].forEach(ms => setTimeout(applyModifiedMarks, ms));
  }
  window.addEventListener('click', function(ev){
    const btn = ev.target?.closest?.('button[data-action]');
    if(btn && saveActions.has(btn.dataset.action || '')) rememberModified(btn);
  }, true);

  function receiptStore(){ const s = st(); if(!s.ticketImages || typeof s.ticketImages !== 'object') s.ticketImages = {}; return s.ticketImages; }
  function receiptKey(id){ return `${selectedId()}|INGRESO:${String(id || '')}`; }
  function receiptKeys(id){
    const ev = selectedId();
    const sid = String(id || '');
    return [`${ev}|INGRESO:${sid}`, `${ev}|INGRESO|${sid}`, `INGRESO:${ev}|${sid}`];
  }
  function receiptData(id){ const store = receiptStore(); for(const k of receiptKeys(id)){ if(store[k]) return store[k]; } return ''; }
  function setReceipt(id, data){ receiptStore()[receiptKey(id)] = data; }
  function deleteReceipt(id){ const store = receiptStore(); receiptKeys(id).forEach(k => { try{ delete store[k]; }catch(_){ } }); }
  function readFileAsDataUrl(file){
    return new Promise((resolve,reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('No se pudo leer la imagen.'));
      reader.readAsDataURL(file);
    });
  }
  function showReceipt(id){
    const data = receiptData(id);
    if(!data){ alert('Este ingreso no tiene justificante adjunto.'); return; }
    const ov = document.createElement('div');
    ov.className = 'ce-v464-receipt-modal';
    ov.innerHTML = `<div class="ce-v464-receipt-card"><div class="ce-v464-receipt-head"><span>Justificante de ingreso</span><button type="button" class="outline small" data-close="1">Cerrar</button></div><img alt="Justificante de ingreso" src="${esc(data)}"></div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if(e.target === ov || e.target?.closest?.('[data-close]')) ov.remove(); });
  }
  async function attachReceipt(id){
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.position = 'fixed'; input.style.left = '-9999px'; input.style.top = '-9999px';
    document.body.appendChild(input);
    input.addEventListener('change', async () => {
      try{
        const file = input.files && input.files[0];
        if(!file) return;
        if(!/^image\//i.test(file.type || '')){ alert('Selecciona una imagen para el justificante.'); return; }
        const data = await readFileAsDataUrl(file);
        setReceipt(id, data);
        saveNow();
        renderNow();
        modified.set(String(id), 'save-collab');
        [60,180,500].forEach(ms => setTimeout(() => { injectReceiptTools(); applyModifiedMarks(); }, ms));
      }catch(error){ alert('No se pudo adjuntar el justificante. ' + (error?.message || error)); }
      finally{ try{ input.remove(); }catch(_){ } }
    }, {once:true});
    input.click();
  }
  function collabCardId(card){
    return card?.querySelector?.('button[data-action="save-collab"][data-id],button[data-action="delete-collab"][data-id],select[data-action="edit-collab-persona"][data-id],input[data-action="edit-collab-numero"][data-id],[data-action="edit-collab-situacion"][data-id]')?.dataset?.id || '';
  }
  function injectReceiptTools(){
    injectStyle();
    const wrap = $('collabList'); if(!wrap) return;
    wrap.querySelectorAll('.ce-ingreso-receipt-tools-v463').forEach(el => { try{ el.remove(); }catch(_){ } });
    wrap.querySelectorAll('.itemcard,.rowline,.card').forEach(card => {
      const id = collabCardId(card);
      if(!id || card.querySelector('.ce-v464-receipt-tools')) return;
      const has = !!receiptData(id);
      const box = document.createElement('div');
      box.className = 'ce-v464-receipt-tools';
      box.innerHTML = `${has ? '<span class="ce-v464-receipt-ok">📎 Justificante adjunto</span>' : ''}<button type="button" class="outline small" data-action="ingreso-receipt-add-v464" data-id="${esc(id)}">${has ? 'Cambiar justificante' : 'Adjuntar justificante'}</button>${has ? `<button type="button" class="outline small" data-action="ingreso-receipt-view-v464" data-id="${esc(id)}">Ver justificante</button><button type="button" class="danger small" data-action="ingreso-receipt-delete-v464" data-id="${esc(id)}">Eliminar justificante</button>` : ''}`;
      const actions = card.querySelector('button[data-action="save-collab"]')?.parentElement || card.querySelector('.rowline') || card;
      try{ actions.appendChild(box); }catch(_){ card.appendChild(box); }
    });
  }
  window.addEventListener('click', function(ev){
    const btn = ev.target?.closest?.('[data-action="ingreso-receipt-add-v464"],[data-action="ingreso-receipt-view-v464"],[data-action="ingreso-receipt-delete-v464"]');
    if(!btn) return;
    const id = btn.dataset.id || '';
    const action = btn.dataset.action || '';
    if(action === 'ingreso-receipt-view-v464'){ stop(ev); showReceipt(id); return false; }
    if(!canWrite()){ stop(ev); alert('No autorizado para modificar justificantes.'); return false; }
    if(locked()){ stop(ev); alert('Evento finalizado. No se puede modificar.'); return false; }
    if(action === 'ingreso-receipt-add-v464'){ stop(ev); attachReceipt(id); return false; }
    if(action === 'ingreso-receipt-delete-v464'){
      stop(ev);
      if(confirm('¿Eliminar el justificante de este ingreso?')){
        deleteReceipt(id); saveNow(); renderNow();
        [60,180,500].forEach(ms => setTimeout(injectReceiptTools, ms));
      }
      return false;
    }
  }, true);

  let mo = null;
  function installObserver(){
    if(mo) return;
    mo = new MutationObserver(() => {
      if(installObserver._t) clearTimeout(installObserver._t);
      installObserver._t = setTimeout(() => { injectReceiptTools(); applyModifiedMarks(); }, 80);
    });
    try{ mo.observe(document.body, {childList:true, subtree:true}); }catch(_){ }
  }
  function applyVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span,.appname-stack span').forEach(el => { if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION; });
    try{ window.ControlEventV464 = Object.assign(window.ControlEventV464 || {}, {version:VERSION, versionFile:VERSION_FILE, injectReceiptTools, applyModifiedMarks}); }catch(_){ }
  }
  function install(){ injectStyle(); applyVersion(); injectReceiptTools(); applyModifiedMarks(); installObserver(); }
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 30)));
  [0,80,250,700,1500,3000].forEach(ms => setTimeout(install, ms));
})();
