/* ControlEvent v14_prod hotfix - mantenimiento EVENTOS robusto y planificación socios obligatorios.
   - Guarda todos los campos de EVENTOS con CRUD fila-a-fila, aunque el evento activo esté Finalizado.
   - Captura click/pointer/touch sobre Modificar para evitar que otros bloqueos de Finalizado lo anulen.
*/
(function(){
  'use strict';
  const VERSION = 'v14_prod_hotfix_evento_precio_socios_robusto';
  const $ = id => document.getElementById(id);
  function st(){ return window.ControlEventApp?.state || window.state || {}; }
  function auth(){ return window.ControlEventApp?.authUser || window.authUser || {}; }
  function isGD(){ return String(auth()?.nivel || '').toUpperCase() === 'GD'; }
  function css(v){ try{ return CSS.escape(String(v || '')); }catch(_){ return String(v || '').replace(/"/g,'\\"'); } }
  function parseEuro(value){
    if(typeof value === 'number') return Number.isFinite(value) ? value : 0;
    let s = String(value ?? '').replace(/€/g,'').replace(/\s/g,'').trim();
    if(!s) return 0;
    const c = s.lastIndexOf(','), d = s.lastIndexOf('.');
    if(c !== -1 && d !== -1) s = c > d ? s.replace(/\./g,'').replace(',', '.') : s.replace(/,/g,'');
    else if(c !== -1) s = s.replace(/\./g,'').replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  function eventById(id){ return (Array.isArray(st().eventos) ? st().eventos : []).find(e => String(e.id || '') === String(id || '')) || null; }
  function setEnabled(el){
    if(!el) return;
    el.disabled = false; el.readOnly = false;
    el.removeAttribute('disabled'); el.removeAttribute('readonly'); el.removeAttribute('aria-disabled');
    el.classList.remove('locked','disabled','app-disabled','is-locked','ce-v225-ro-disabled','soft-disabled');
    el.style.pointerEvents = 'auto'; el.style.opacity = '1';
  }
  function unlockEventosMaintenance(){
    if(!isGD()) return;
    document.querySelectorAll('#mtEventos input,#mtEventos select,#mtEventos textarea,#mtEventos button,[data-action^="edit-evento"],button[data-action="save-evento"],button[data-action="delete-evento"],#btnAddEvento,#mtEventosBtn,#newEventoTitulo,#newEventoPrecio,#newEventoFechaIni,#newEventoFechaFin,#newEventoSituacion,#newEventoDescripcion').forEach(setEnabled);
  }
  function closestEventoContainer(el){
    return el?.closest?.('[data-id], .item, .row, .maint-row, .maintenance-row, .event-card, .card, li, tr, #mtEventos') || document.getElementById('mtEventos');
  }
  function findIdFromButton(btn){
    let id = btn?.dataset?.id || '';
    if(id) return id;
    const holder = closestEventoContainer(btn);
    id = holder?.dataset?.id || '';
    if(id) return id;
    const inHolder = holder?.querySelector?.('[data-action^="edit-evento-"][data-id],button[data-action="save-evento"][data-id]');
    if(inHolder?.dataset?.id) return inHolder.dataset.id;
    const any = document.querySelector('#mtEventos [data-action^="edit-evento-"][data-id]');
    return any?.dataset?.id || '';
  }
  function fieldValue(action, id, fallback, root){
    const selectors = [
      `[data-action="${action}"][data-id="${css(id)}"]`,
      `[data-action="${action}"]`
    ];
    for(const sel of selectors){
      const el = (root && root !== document ? root.querySelector(sel) : null) || document.querySelector(sel);
      if(el) return el.value;
    }
    return fallback ?? '';
  }
  async function persistEvento(ev){
    const res = await fetch('/api/crud/eventos/' + encodeURIComponent(ev.id), {
      method: 'PUT',
      headers: {'Content-Type':'application/json','X-ControlEvent-Write-Scope':'row-crud-v8-5-fix28','X-ControlEvent-Row-Only':'1'},
      cache: 'no-store',
      body: JSON.stringify({...ev, __crudRowOnly:true})
    });
    if(!res.ok){
      let msg = await res.text().catch(() => '');
      try{ const j = JSON.parse(msg); msg = j.error || j.message || msg; }catch(_){ }
      throw new Error(msg || ('HTTP ' + res.status + ' guardando evento'));
    }
    return res.json().catch(() => ({ok:true}));
  }
  async function saveEventRecord(id, btn){
    if(!isGD()) return false;
    const ev = eventById(id);
    if(!ev){ try{ alert('No se ha localizado el evento a modificar.'); }catch(_){ } return false; }
    const root = closestEventoContainer(btn || document.querySelector(`[data-action="save-evento"][data-id="${css(id)}"]`));
    const updated = {
      ...ev,
      id:String(id),
      titulo:String(fieldValue('edit-evento-titulo', id, ev.titulo || '', root)).trim(),
      precio:parseEuro(fieldValue('edit-evento-precio', id, ev.precio || 0, root)),
      fechaIni:String(fieldValue('edit-evento-fechaini', id, ev.fechaIni || '', root)).trim(),
      fechaFin:String(fieldValue('edit-evento-fechafin', id, ev.fechaFin || '', root)).trim(),
      descripcion:String(fieldValue('edit-evento-descripcion', id, ev.descripcion || '', root)).trim(),
      situacion:String(fieldValue('edit-evento-situacion', id, ev.situacion || 'En curso', root) || 'En curso').trim()
    };
    const oldText = btn?.textContent;
    if(btn){ btn.disabled = true; btn.textContent = 'Guardando...'; }
    try{
      await persistEvento(updated);
      Object.assign(ev, updated);
      try{ window.ControlEventApp?.state && (window.ControlEventApp.state.eventos = st().eventos); }catch(_){ }
      try{ if(typeof window.render === 'function') window.render(); else if(typeof render === 'function') render(); }catch(_){ }
      try{ if(typeof window.fetchState === 'function') setTimeout(() => window.fetchState().catch?.(()=>{}), 250); }catch(_){ }
      setTimeout(unlockEventosMaintenance, 80);
      return false;
    }catch(error){
      console.error('[ControlEvent '+VERSION+'] No se pudo guardar EVENTO por CRUD:', error);
      try{ alert('No se pudo guardar el evento: ' + (error?.message || error)); }catch(_){ }
      return false;
    }finally{
      if(btn){ btn.disabled = false; btn.textContent = oldText || 'Modificar'; }
    }
  }
  window.saveEventRecord = saveEventRecord;
  function isSaveEventoButton(target){
    const btn = target?.closest?.('button[data-action="save-evento"],button');
    if(!btn) return null;
    if(btn.dataset?.action === 'save-evento') return btn;
    if(!btn.closest?.('#mtEventos')) return null;
    const txt = String(btn.textContent || '').trim().toUpperCase();
    return /^(MODIFICAR|GUARDAR)$/.test(txt) ? btn : null;
  }
  function captureSave(event){
    const btn = isSaveEventoButton(event.target);
    if(!btn) return;
    const id = findIdFromButton(btn);
    if(!id) return;
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
    if(btn.__ceSavingEvento) return false;
    btn.__ceSavingEvento = true;
    Promise.resolve(saveEventRecord(id, btn)).finally(() => { setTimeout(() => { btn.__ceSavingEvento = false; }, 300); });
    return false;
  }
  ['pointerup','touchend','click'].forEach(ev => document.addEventListener(ev, captureSave, true));
  document.addEventListener('click', function(event){ if(event.target?.closest?.('#mtEventosBtn,#maintenanceWrapper,#mtEventos')) setTimeout(unlockEventosMaintenance, 60); }, true);
  window.addEventListener('controlevent:app-ready', unlockEventosMaintenance);
  window.addEventListener('controlevent:runtime-ready', unlockEventosMaintenance);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', unlockEventosMaintenance, {once:true});
  else setTimeout(unlockEventosMaintenance, 0);
})();
