/* ControlEvent v13.0_prod hotfix - mantenimiento EVENTOS y planificación socios obligatorios.
   - Guarda todos los campos de EVENTOS con CRUD fila-a-fila, aunque el evento activo esté Finalizado.
   - Evita que el bloqueo global permita solo cambiar Situación y descarte Precio/Título/Fechas.
*/
(function(){
  'use strict';
  const VERSION = 'v13.0_prod_hotfix_evento_precio_socios';
  const $ = id => document.getElementById(id);
  function st(){ return window.ControlEventApp?.state || window.state || {}; }
  function auth(){ return window.ControlEventApp?.authUser || window.authUser || {}; }
  function isGD(){ return String(auth()?.nivel || '').toUpperCase() === 'GD'; }
  function escSel(v){ try{ return CSS.escape(String(v || '')); }catch(_){ return String(v || '').replace(/"/g,'\\"'); } }
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
  function val(action, id, fallback){
    const el = document.querySelector(`[data-action="${action}"][data-id="${escSel(id)}"]`);
    return el ? el.value : (fallback ?? '');
  }
  function eventById(id){ return (Array.isArray(st().eventos) ? st().eventos : []).find(e => String(e.id || '') === String(id || '')) || null; }
  function setEnabled(el){
    if(!el) return;
    el.disabled = false;
    el.readOnly = false;
    el.removeAttribute('disabled');
    el.removeAttribute('readonly');
    el.removeAttribute('aria-disabled');
    el.classList.remove('locked','disabled','app-disabled','is-locked','ce-v225-ro-disabled');
    el.style.pointerEvents = 'auto';
    el.style.opacity = '1';
  }
  function unlockEventosMaintenance(){
    if(!isGD()) return;
    document.querySelectorAll('#mtEventos input,#mtEventos select,#mtEventos textarea,#mtEventos button,[data-action^="edit-evento-"],button[data-action="save-evento"],button[data-action="delete-evento"],#btnAddEvento,#mtEventosBtn').forEach(setEnabled);
  }
  async function persistEvento(ev){
    const res = await fetch('/api/crud/eventos/' + encodeURIComponent(ev.id), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-ControlEvent-Write-Scope': 'row-crud-v8-5-fix28',
        'X-ControlEvent-Row-Only': '1'
      },
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
  window.saveEventRecord = async function(id){
    if(!isGD()) return false;
    const ev = eventById(id);
    if(!ev) return false;
    const updated = {
      ...ev,
      titulo: String(val('edit-evento-titulo', id, ev.titulo || '')).trim(),
      precio: parseEuro(val('edit-evento-precio', id, ev.precio || 0)),
      fechaIni: String(val('edit-evento-fechaini', id, ev.fechaIni || '')).trim(),
      fechaFin: String(val('edit-evento-fechafin', id, ev.fechaFin || '')).trim(),
      descripcion: String(val('edit-evento-descripcion', id, ev.descripcion || '')).trim(),
      situacion: String(val('edit-evento-situacion', id, ev.situacion || 'En curso') || 'En curso').trim()
    };
    Object.assign(ev, updated);
    try{
      await persistEvento(updated);
    }catch(error){
      console.error('[ControlEvent '+VERSION+'] No se pudo guardar EVENTO por CRUD:', error);
      try{ alert('No se pudo guardar el evento: ' + (error?.message || error)); }catch(_){ }
      return false;
    }
    try{ if(typeof window.render === 'function') window.render(); else if(typeof render === 'function') render(); }catch(_){ }
    try{ if(typeof window.fetchState === 'function') setTimeout(() => window.fetchState().catch?.(()=>{}), 250); }catch(_){ }
    setTimeout(unlockEventosMaintenance, 80);
    return false;
  };
  document.addEventListener('click', function(event){
    const btn = event.target?.closest?.('button[data-action="save-evento"]');
    if(!btn) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    window.saveEventRecord(btn.dataset.id || '');
    return false;
  }, true);
  document.addEventListener('click', function(event){
    if(event.target?.closest?.('#mtEventosBtn,#maintenanceWrapper,#mtEventos')) setTimeout(unlockEventosMaintenance, 60);
  }, true);
  window.addEventListener('controlevent:app-ready', unlockEventosMaintenance);
  window.addEventListener('controlevent:runtime-ready', unlockEventosMaintenance);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', unlockEventosMaintenance, {once:true});
  else setTimeout(unlockEventosMaintenance, 0);
})();
