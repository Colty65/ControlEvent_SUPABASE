/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #3. */
/* ==== FIX FINAL V14.3 TIENDA EN COMPRAS ==== */
(function(){
  const byId = (id) => document.getElementById(id);
  const esc = (v) => typeof escapeHtml === 'function' ? escapeHtml(v) : String(v ?? '');
  const euro = (v) => typeof euroInputValue === 'function' ? euroInputValue(v) : String(v ?? 0);
  const moneyV = (v) => typeof moneyText === 'function' ? moneyText(v) : (typeof money === 'function' ? money(v) : String(v ?? 0));
  const allTiendas = () => (typeof tiendasGenerales === 'function' ? tiendasGenerales() : (state.tiendas || [])).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
  const allProductos = () => (typeof productosGenerales === 'function' ? productosGenerales() : (state.productos || [])).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
  const allSocios = () => (typeof sociosOnly === 'function' ? sociosOnly() : (state.personas || []).filter(p => p.rango === 'SOCIO')).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));

  renderMainSelectors = function(){
    const productos = allProductos();
    const tiendas = allTiendas();
    const socios = allSocios();

    if(byId('buyProducto')) byId('buyProducto').innerHTML =
      '<option value="" selected>Busca un producto....</option>' +
      productos.map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('');

    if(byId('buyTicket')) byId('buyTicket').innerHTML =
      PURCHASE_TICKET_OPTIONS.map(v => `<option value="${v}">${v === '' ? '-- Pte.Compra u otros gastos --' : esc(v)}</option>`).join('');

    if(byId('buyTienda')) byId('buyTienda').innerHTML =
      '<option value="" selected>Busca tienda.....</option>' +
      tiendas.map(t => `<option value="${t.id}">${esc(t.nombre)}</option>`).join('');

    if(byId('buyResponsable')) byId('buyResponsable').innerHTML =
      '<option value="">-- sin responsable --</option>' +
      socios.map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('');

    if(byId('donProducto')) byId('donProducto').innerHTML =
      '<option value="" selected>Busca un producto....</option>' +
      productos.map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('');

    if(byId('donTicket')) byId('donTicket').innerHTML =
      (typeof DONATION_TICKET_OPTIONS !== 'undefined' ? DONATION_TICKET_OPTIONS : []).map(v => `<option value="${v}">${esc(v)}</option>`).join('');

    if(byId('donDonante') && typeof donorOptions === 'function') byId('donDonante').innerHTML =
      '<option value="" selected>Busca donante.....</option>' +
      donorOptions().map(d => `<option value="${d.value}">${esc(d.label)}</option>`).join('');

    if(byId('donResponsable')) byId('donResponsable').innerHTML =
      '<option value="">-- sin responsable --</option>' +
      socios.map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('');
  };

  updateBuyPreview = function(forceReference=false){
    const producto = typeof productoById === 'function' ? productoById(byId('buyProducto')?.value || '') : null;
    const unidades = Number(byId('buyUnidades')?.value || 0);
    const precioEl = byId('buyPrecio');
    const ref = Number((producto && (producto.defaultPrecio ?? producto.precio)) || 0);
    const precio = forceReference ? ref : (typeof parseEuroInput === 'function' ? parseEuroInput(precioEl?.value || ref) : ref);
    const importe = precio * unidades;
    if(precioEl) precioEl.value = euro(precio);
    if(byId('buyImporte')) byId('buyImporte').value = moneyV(importe);
  };

  addCompra = function(){
    if(typeof selectedEvent === 'function' && !selectedEvent()) return;
    const productoId = byId('buyProducto')?.value || '';
    if(!productoId) return;
    const precio = typeof parseEuroInput === 'function' ? parseEuroInput(byId('buyPrecio')?.value || 0) : Number(byId('buyPrecio')?.value || 0);
    state.compras.push({
      id: typeof uid === 'function' ? uid() : String(Date.now()),
      eventId: state.selectedEventId,
      productoId,
      unidades: Number(byId('buyUnidades')?.value || 0),
      precio,
      ticketDonacion: byId('buyTicket')?.value || '',
      tiendaId: byId('buyTienda')?.value || '',
      responsableId: byId('buyResponsable')?.value || ''
    });
    if(byId('buyProducto')) byId('buyProducto').value = '';
    if(byId('buyUnidades')) byId('buyUnidades').value = '1.00';
    if(byId('buyPrecio')) byId('buyPrecio').value = '0,00 €';
    if(byId('buyImporte')) byId('buyImporte').value = '';
    if(byId('buyTicket')) byId('buyTicket').value = '';
    if(byId('buyTienda')) byId('buyTienda').value = '';
    if(byId('buyResponsable')) byId('buyResponsable').value = '';
    if(typeof render === 'function') render();
  };

  renderCompras = function(){
    const wrap = byId('comprasList');
    if(!wrap) return;
    let rows = (typeof comprasForEvent === 'function' ? comprasForEvent() : []).filter(r => !(typeof isDonationTicket === 'function' && isDonationTicket(r.ticketDonacion))).slice();
    const sorts = {
      producto:(a,b)=> (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es') || String(a.ticketDonacion||'').localeCompare(String(b.ticketDonacion||''),'es'),
      ticket:(a,b)=> String(a.ticketDonacion||'').localeCompare(String(b.ticketDonacion||''),'es') || (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es'),
      tienda:(a,b)=> ((a.tienda?.nombre || '')).localeCompare((b.tienda?.nombre || ''),'es') || (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es'),
      responsable:(a,b)=> ((a.responsable?.nombre || '')).localeCompare((b.responsable?.nombre || ''),'es') || (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es'),
    };
    rows.sort(sorts[state.comprasSort] || sorts.producto);
    if(!rows.length){
      wrap.innerHTML = '<div class="empty">Todavía no hay compras u otros gastos para este evento.</div>';
      return;
    }
    const socios = allSocios();
    const tiendas = allTiendas();
    const productos = allProductos();
    wrap.innerHTML = '<div class="hint">Ordenar por: <a href="#" onclick="state.comprasSort=\'producto\'; renderCompras(); return false;">Producto</a> · <a href="#" onclick="state.comprasSort=\'ticket\'; renderCompras(); return false;">Ticket</a> · <a href="#" onclick="state.comprasSort=\'tienda\'; renderCompras(); return false;">Tienda</a> · <a href="#" onclick="state.comprasSort=\'responsable\'; renderCompras(); return false;">Responsable</a></div>';

    rows.forEach(r => {
      const pending = String(r.ticketDonacion || '').trim() === '';
      const row = document.createElement('div');
      row.className = 'itemcard' + (pending ? ' red-row' : '');
      row.innerHTML = `
        <div class="rowline compra">
          <div class="field"><label>Producto</label><select data-action="edit-compra-producto" data-id="${r.id}">${productos.map(p => `<option value="${p.id}" ${p.id===r.productoId?'selected':''}>${esc(p.nombre)}</option>`).join('')}</select></div>
          <div class="field"><label>Unidades</label><input type="number" min="0" step="0.01" value="${Number(r.unidades||0)}" data-action="edit-compra-unidades" data-id="${r.id}" /></div>
          <div class="field"><label>Precio</label><input class="money-text" type="text" value="${euro(r.precioCalc != null ? r.precioCalc : (r.producto?.precio || 0))}" data-action="edit-compra-precio" data-id="${r.id}" /></div>
          <div class="field"><label>Importe</label><input class="soft-readonly" readonly value="${moneyV(r.importe || 0)}" /></div>
          <div class="field"><label>Ticket u Otros gastos</label><select data-action="edit-compra-ticket" data-id="${r.id}">${PURCHASE_TICKET_OPTIONS.map(v => `<option value="${v}" ${v===r.ticketDonacion?'selected':''}>${v === '' ? '-- Pte.Compra u otros gastos --' : esc(v)}</option>`).join('')}</select></div>
          <div class="field"><label>Tienda</label><select data-action="edit-compra-tienda" data-id="${r.id}"><option value="" ${!r.tiendaId?'selected':''}>-- elige tienda --</option>${tiendas.map(t => `<option value="${t.id}" ${t.id===r.tiendaId?'selected':''}>${esc(t.nombre)}</option>`).join('')}</select></div>
          <div class="field"><label>Responsable</label><select data-action="edit-compra-responsable" data-id="${r.id}"><option value="" ${!r.responsableId?'selected':''}>-- sin responsable --</option>${socios.map(p => `<option value="${p.id}" ${p.id===r.responsableId?'selected':''}>${esc(p.nombre)}</option>`).join('')}</select></div>
          <div style="display:flex;gap:8px;align-items:end"><button type="button" class="modify small" data-action="save-compra" data-id="${r.id}">Modificar</button><button type="button" class="danger small" data-action="delete-compra" data-id="${r.id}">Eliminar</button></div>
        </div>`;
      wrap.appendChild(row);
    });
  };

  // Refresca visualmente cuando se abra la pestaña de compras o tras cargar
  const rerenderComprasIfVisible = () => {
    try{
      if(byId('tabCompras') && !byId('tabCompras').classList.contains('hidden')) renderCompras();
    }catch(_){}
  };
  document.addEventListener('click', function(e){
    const btn = e.target.closest('button');
    if(!btn) return;
    const action = btn.dataset.action || btn.id;
    if(action === 'tabComprasBtn' || action === 'btnAddCompra' || action === 'save-compra' || action === 'delete-compra'){
      setTimeout(rerenderComprasIfVisible, 0);
    }
  }, true);
  window.addEventListener('load', function(){
    try{ renderMainSelectors(); }catch(_){}
    setTimeout(rerenderComprasIfVisible, 0);
  });
})();
