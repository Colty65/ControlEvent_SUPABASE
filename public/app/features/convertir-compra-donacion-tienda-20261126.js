/* CE v6.1 - Conversión explícita de compra a DONADO TIENDA.
   Se actualiza la MISMA fila por RPC (sin DELETE+POST) para evitar duplicados y
   conservar evento/producto/unidades/precio. Solo actúa con casilla marcada. */
(function(){
  'use strict';
  if (window.__ceCompraADonacionTienda20261126) return;
  window.__ceCompraADonacionTienda20261126 = true;
  const SCOPE = 'row-crud-v8-5-compras-directo';
  const pending = new Set();
  const txt = v => String(v ?? '').trim();
  function appState(){
    try { if (typeof state !== 'undefined' && state) return state; } catch (_) {}
    return window.state || {};
  }
  function buildPayload(row){
    const tiendaId = txt(row.tiendaId || row.tienda_id);
    return {
      id: txt(row.id), eventId: txt(row.eventId || row.event_id),
      productoId: txt(row.productoId || row.producto_id),
      unidades: Number(row.unidades) || 0,
      precio: Number(row.precio) || 0,
      ticketDonacion: 'DONADO TIENDA',
      donorRef: tiendaId ? 'T:' + tiendaId : '',
      tiendaId: '',
      responsableId: txt(row.responsableId || row.responsable_id),
      // La BBDD aplica su situación predeterminada (Comprometida).
      // El usuario podrá cambiarla a Entregada o Supuesta en Donaciones.
      __crudRowOnly: true
    };
  }
  function decorate(){
    const list = document.getElementById('comprasList');
    if (!list) return;
    for (const btn of list.querySelectorAll('button[data-action="delete-compra"]')){
      if (btn.closest('.ce-convert-controls')) continue;
      const holder = document.createElement('div');
      holder.className = 'ce-convert-controls';
      const label = document.createElement('label');
      label.className = 'ce-convert-choice';
      const check = document.createElement('input');
      check.type = 'checkbox';
      check.className = 'ce-convert-checkbox';
      check.setAttribute('aria-label', 'Eliminar de Compras y pasar a Donaciones de tienda');
      const caption = document.createElement('span');
      caption.textContent = 'Pasar a donaciones';
      label.append(check, caption);
      holder.append(label);
      btn.parentNode.insertBefore(holder, btn);
      holder.append(btn);
      check.addEventListener('change', () => {
        btn.textContent = check.checked ? 'Traspasar' : 'Eliminar';
        btn.title = check.checked ? 'Actualizar la compra como DONADO TIENDA' : 'Eliminar compra';
      });
    }
  }
  function install(){
    const list=document.getElementById('comprasList');
    if(!list) return;
    decorate();
    const observer = new MutationObserver(() => decorate());
    observer.observe(list,{childList:true}); // Solo reemplazos de filas, no scroll ni atributos.
  }
  // Captura anterior a la del CRUD HEAD. Sin marcar, se respeta el borrado de siempre.
  window.addEventListener('click', async function(event){
    const btn = event.target?.closest?.('#comprasList button[data-action="delete-compra"]');
    const box = btn?.closest('.ce-convert-controls')?.querySelector('input.ce-convert-checkbox');
    if (!btn || !box?.checked) return;
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
    const id = txt(btn.dataset.id);
    if (!id || pending.has(id)) return;
    const s = appState();
    const row = Array.isArray(s.compras) ? s.compras.find(r => txt(r.id)===id) : null;
    if(!row){ window.alert('No encuentro la compra en memoria. Refresca los datos antes de continuar.'); return; }
    const eventId = txt(row.eventId || row.event_id);
    if(eventId !== txt(s.selectedEventId)){
      window.alert('El evento activo no coincide con el de la compra. Operación cancelada.'); return;
    }
    const ev = (s.eventos||[]).find(r => txt(r.id)===eventId);
    if(txt(ev?.situacion).toLowerCase()==='finalizado'){
      window.alert('El evento está finalizado. No se puede modificar la compra.'); return;
    }
    if(!txt(row.productoId || row.producto_id)){
      window.alert('Falta el producto de la compra. No se puede traspasar.'); return;
    }
    if(['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'].includes(txt(row.ticketDonacion).toUpperCase())){
      window.alert('Esta línea ya está clasificada como donación.'); return;
    }
    const p = (s.productos||[]).find(r=>txt(r.id)===txt(row.productoId || row.producto_id));
    const tiendaId = txt(row.tiendaId || row.tienda_id);
    const tienda = (s.tiendas||[]).find(r=>txt(r.id)===tiendaId);
    const ticket = txt(row.ticketDonacion || row.ticket_donacion);
    const warning = ticket && /^(TK\d+|TK\s*\d+)/i.test(ticket)
      ? '\nATENCIÓN: esta compra tiene ticket '+ticket+'. Revisa después sus vinculaciones contables.' : '';
    const msg = `¿Traspasar «${txt(p?.nombre)||'Producto'}» de Compras a Donaciones?\n\nTipo: DONADO TIENDA\nDonante: ${txt(tienda?.nombre)||'Pendiente de informar'}\nSe conservarán las unidades, el precio, el responsable y el evento.\nNo se creará ningún registro duplicado.${warning}`;
    if (!window.confirm(msg)) return;
    pending.add(id); btn.disabled=true; btn.textContent='Traspasando…';
    try{
      const payload = buildPayload(row);
      const res=await fetch('/api/crud/compras/'+encodeURIComponent(id), {
        method:'PUT', cache:'no-store',
        headers:{'Content-Type':'application/json','X-ControlEvent-Write-Scope':SCOPE,'X-ControlEvent-Row-Only':'1'},
        body:JSON.stringify(payload)
      });
      const body=await res.json().catch(()=>({}));
      if (!res.ok || body.ok === false) throw new Error(body.error || body.message || 'HTTP '+res.status);
      const latest = body.item || payload;
      const index=s.compras.findIndex(r=>txt(r.id)===id);
      if(index>=0) s.compras[index]={...s.compras[index], ...latest, ticketDonacion:'DONADO TIENDA', donorRef:payload.donorRef, tiendaId:'', donacionSituacion:txt(latest.donacionSituacion || latest.donacion_situacion || 'Comprometida')};
      try{ if(typeof saveState==='function') saveState(); }catch(_){}
      try{ if(typeof render==='function') render(); else { window.renderCompras?.(); window.renderDonaciones?.(); } }catch(err){console.warn('CE conversión: refresco de interfaz',err);}
      window.alert('Compra traspasada a DONADO TIENDA. Revisa y completa los datos pendientes en Donaciones.');
    }catch(err){
      console.error('CE: traspaso compra → donación',err);
      window.alert('No se ha realizado el traspaso: '+(err?.message||String(err)));
      btn.disabled=false; btn.textContent='Traspasar';
    }finally{pending.delete(id);}
  },true);
  const style=document.createElement('style');
  style.textContent='.ce-convert-controls{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:5px;min-width:112px}.ce-convert-choice{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:700;line-height:1.2;color:#344054;cursor:pointer;white-space:nowrap}.ce-convert-checkbox{width:16px;height:16px;accent-color:#08796e;cursor:pointer}.ce-convert-controls .danger{width:100%;max-width:112px}';
  document.head.appendChild(style);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
})();
