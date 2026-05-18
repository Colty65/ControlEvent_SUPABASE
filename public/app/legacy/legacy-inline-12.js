/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #12. */
/* ==== V15.3: GRAFICAS EXCEL + NOMBRE DESCARGA + PRECIO COMPRAS ==== */
(function(){
  const $ = (id) => document.getElementById(id);
  const esc = (v) => typeof escapeHtml === 'function' ? escapeHtml(v) : String(v ?? '');
  const moneyTxt = (v) => typeof moneyText === 'function' ? moneyText(v) : (typeof moneyTextV === 'function' ? moneyTextV(v) : (typeof money === 'function' ? money(v) : String(v)));
  const euroTxt = (v) => typeof euroInputValue === 'function' ? euroInputValue(v) : moneyTxt(v);
  const parseEuro = (v) => typeof parseEuroInput === 'function' ? parseEuroInput(v) : Number(v || 0);

  function filenameV153(ev){
    const title = String(ev?.titulo || 'evento')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/[^A-Za-z0-9]+/g,'_')
      .replace(/^_+|_+$/g,'')
      .replace(/_+/g,'_') || 'evento';
    const now = new Date();
    const dd = String(now.getDate()).padStart(2,'0');
    const mm = String(now.getMonth()+1).padStart(2,'0');
    const yyyy = String(now.getFullYear());
    return `ControlEvent_v26_6_INFOEVENTO-${title}_${yyyy}${mm}${dd}.xlsx`;
  }
  window.xlsxFilename = filenameV153;

  // Nombre del archivo de descarga de datos con versión correcta
  const prevExportSeedWorkbook = typeof exportSeedWorkbook === 'function' ? exportSeedWorkbook : null;
  if(prevExportSeedWorkbook){
    exportSeedWorkbook = async function(){
      if(typeof isLocked === 'function' && isLocked()) return;
      try{
        await ensureExcelJS();
      }catch(err){
        alert('No se pudo cargar el motor de Excel. Coloca exceljs.min.js en la carpeta vendor o usa conexión a internet.');
        return;
      }
      const wb = new ExcelJS.Workbook();
      wb.creator = 'ControlEvent v26.6 - ©oltyLAB ’26';
      wb.created = new Date();

      const border = {top:{style:'thin', color:{argb:'FFDDE2EA'}},left:{style:'thin', color:{argb:'FFDDE2EA'}},bottom:{style:'thin', color:{argb:'FFDDE2EA'}},right:{style:'thin', color:{argb:'FFDDE2EA'}}};
      const headFill = {type:'pattern', pattern:'solid', fgColor:{argb:'FF111827'}};

      function makeSheet(name, headers, rows){
        const ws = wb.addWorksheet(name);
        ws.columns = headers.map(h => ({width: Math.max(14, String(h).length + 2)}));
        headers.forEach((h, i) => {
          const c = ws.getCell(1, i+1);
          c.value = h;
          c.font = {bold:true, color:{argb:'FFFFFFFF'}};
          c.fill = headFill;
          c.border = border;
          c.alignment = {horizontal:'center', vertical:'middle'};
        });
        let r = 2;
        rows.forEach(row => {
          row.forEach((v, i) => {
            const c = ws.getCell(r, i+1);
            c.value = v == null ? '' : v;
            c.border = border;
          });
          r += 1;
        });
      }

      const personasRows = (state.personas || []).map(p => [p.id, p.nombre || '', p.rango || '']);
      const eventosRows = (state.eventos || []).map(e => [e.id, e.titulo || '', e.precio || 0, e.fechaIni || '', e.fechaFin || '', e.descripcion || '', e.situacion || '']);
      const tiendasRows = (state.tiendas || []).map(t => [t.id, t.nombre || '']);
      const productosRows = (state.productos || []).map(p => [p.id, p.nombre || '', p.segmento || '', p.destino || '', Number((p.defaultPrecio ?? p.precio) || 0)]);
      const ingresosRows = (state.colaboradores || []).map(c => [c.id, c.eventId || '', c.personaId || '', c.numero || 0, c.situacion || '', c.importe || 0]);
      const comprasRows = (state.compras || []).filter(c => !(typeof isDonationTicket === 'function' && isDonationTicket(c.ticketDonacion))).map(c => [c.id, c.eventId || '', c.productoId || '', c.unidades || 0, c.precio || 0, c.ticketDonacion || '', c.tiendaId || '', c.responsableId || '']);
      const donacionesRows = (state.compras || []).filter(c => (typeof isDonationTicket === 'function' && isDonationTicket(c.ticketDonacion))).map(c => [c.id, c.eventId || '', c.productoId || '', c.unidades || 0, c.precio || 0, c.ticketDonacion || '', c.donorRef || '', c.responsableId || '']);
      const ticketRows = Object.entries(state.ticketImages || {}).map(([k,v]) => [k, v]);

      makeSheet('PERSONAS', ['ID','NOMBRE','RANGO'], personasRows);
      makeSheet('EVENTOS', ['ID','TITULO','PRECIO','FECHA_INI','FECHA_FIN','DESCRIPCION','SITUACION'], eventosRows);
      makeSheet('TIENDAS', ['ID','NOMBRE'], tiendasRows);
      makeSheet('PRODUCTOS', ['ID','NOMBRE','SEGMENTO','DESTINO','PRECIO_REFERENCIA'], productosRows);
      makeSheet('INGRESOS', ['ID','EVENTO_ID','PERSONA_ID','NUMERO','TIPO_INGRESO','IMPORTE_VOLUNTARIO'], ingresosRows);
      makeSheet('COMPRAS', ['ID','EVENTO_ID','PRODUCTO_ID','UNIDADES','PRECIO','TICKET','TIENDA_ID','RESPONSABLE_ID'], comprasRows);
      makeSheet('DONACIONES', ['ID','EVENTO_ID','PRODUCTO_ID','UNIDADES','PRECIO','TIPO_DONACION','DONANTE','RESPONSABLE_ID'], donacionesRows);
      makeSheet('TICKET_IMAGES', ['KEY','DATA_URL'], ticketRows);

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'ControlEvent_v26_6_descarga_datos.xlsx';
      a.click();
      URL.revokeObjectURL(a.href);
    };
  }

  // Permitir poner el precio correctamente en Compras y otros gastos
  function allTiendas(){
    return (typeof tiendasGenerales === 'function' ? tiendasGenerales() : (state.tiendas || []))
      .slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
  }
  function allProductos(){
    return (typeof productosGenerales === 'function' ? productosGenerales() : (state.productos || []))
      .slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
  }
  function allSocios(){
    return (typeof sociosOnly === 'function' ? sociosOnly() : (state.personas || []).filter(p => String(p.rango||'').toUpperCase() === 'SOCIO'))
      .slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
  }

  updateBuyPreview = function(forceReference=false){
    const producto = typeof productoById === 'function' ? productoById($('buyProducto')?.value || '') : null;
    const unidades = Number($('buyUnidades')?.value || 0);
    const precioEl = $('buyPrecio');
    const ref = Number((producto && (producto.defaultPrecio ?? producto.precio)) || 0);
    const precio = forceReference ? ref : parseEuro(precioEl?.value || ref);
    const importe = precio * unidades;
    if(precioEl) precioEl.value = euroTxt(precio);
    if($('buyImporte')) $('buyImporte').value = moneyTxt(importe);
  };

  addCompra = function(){
    if(typeof selectedEvent === 'function' && !selectedEvent()) return;
    const productoId = $('buyProducto')?.value || '';
    if(!productoId) return;
    const precio = parseEuro($('buyPrecio')?.value || 0);
    state.compras.push({
      id: typeof uid === 'function' ? uid() : String(Date.now()),
      eventId: state.selectedEventId,
      productoId,
      unidades: Number($('buyUnidades')?.value || 0),
      precio,
      ticketDonacion: $('buyTicket')?.value || '',
      tiendaId: $('buyTienda')?.value || '',
      responsableId: $('buyResponsable')?.value || ''
    });
    const prod = typeof productoById === 'function' ? productoById(productoId) : null;
    if(prod){
      prod.defaultPrecio = precio;
      prod.precio = precio;
    }
    if($('buyProducto')) $('buyProducto').value = '';
    if($('buyUnidades')) $('buyUnidades').value = '1.00';
    if($('buyPrecio')) $('buyPrecio').value = '0,00 €';
    if($('buyImporte')) $('buyImporte').value = '';
    if($('buyTicket')) $('buyTicket').value = '';
    if($('buyTienda')) $('buyTienda').value = '';
    if($('buyResponsable')) $('buyResponsable').value = '';
    if(typeof render === 'function') render();
  };

  renderCompras = function(){
    const wrap = $('comprasList');
    if(!wrap) return;
    let rows = (typeof comprasForEvent === 'function' ? comprasForEvent() : []).filter(r => !(typeof isDonationTicket === 'function' && isDonationTicket(r.ticketDonacion))).slice();

    const sorts = {
      producto:(a,b)=> (a.producto?.nombre || '').localeCompare((b.producto?.nombre || ''), 'es') || String(a.ticketDonacion || '').localeCompare(String(b.ticketDonacion || ''), 'es'),
      ticket:(a,b)=> String(a.ticketDonacion || '').localeCompare(String(b.ticketDonacion || ''), 'es') || (a.producto?.nombre || '').localeCompare((b.producto?.nombre || ''), 'es'),
      responsable:(a,b)=> ((a.responsable?.nombre || '')).localeCompare((b.responsable?.nombre || ''),'es') || (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es')
    };
    rows.sort(sorts[state.comprasSort] || sorts.producto);

    if(!rows.length){
      wrap.innerHTML = '<div class="empty">Todavía no hay compras u otros gastos para este evento.</div>';
      return;
    }

    const productos = allProductos();
    const tiendas = allTiendas();
    const socios = allSocios();

    wrap.innerHTML = '<div class="hint">Ordenar por: <a href="#" onclick="state.comprasSort=\'producto\'; renderCompras(); return false;">Producto</a> · <a href="#" onclick="state.comprasSort=\'ticket\'; renderCompras(); return false;">Ticket</a> · <a href="#" onclick="state.comprasSort=\'responsable\'; renderCompras(); return false;">Responsable</a></div>';

    rows.forEach(r => {
      const pending = String(r.ticketDonacion || '').trim() === '';
      const row = document.createElement('div');
      row.className = 'itemcard' + (pending ? ' red-row' : '');
      row.innerHTML = `
        <div class="rowline compra">
          <div class="field"><label>Producto</label><select data-action="edit-compra-producto" data-id="${r.id}">${productos.map(p => `<option value="${p.id}" ${p.id===r.productoId?'selected':''}>${esc(p.nombre)}</option>`).join('')}</select></div>
          <div class="field"><label>Unidades</label><input type="number" min="0" step="0.01" value="${Number(r.unidades||0)}" data-action="edit-compra-unidades" data-id="${r.id}" /></div>
          <div class="field"><label>Precio</label><input class="money-text" type="text" value="${euroTxt(r.precio != null ? r.precio : (r.precioCalc != null ? r.precioCalc : (r.producto?.precio || 0)))}" data-action="edit-compra-precio" data-id="${r.id}" /></div>
          <div class="field"><label>Importe</label><input class="soft-readonly" readonly value="${moneyTxt((Number(r.precio != null ? r.precio : (r.precioCalc || r.producto?.precio || 0)) * Number(r.unidades||0)))}" /></div>
          <div class="field"><label>Ticket u Otros gastos</label><select data-action="edit-compra-ticket" data-id="${r.id}">${PURCHASE_TICKET_OPTIONS.map(v => `<option value="${v}" ${v===r.ticketDonacion?'selected':''}>${v === '' ? '-- Pte.Compra u otros gastos --' : esc(v)}</option>`).join('')}</select></div>
          <div class="field"><label>Tienda</label><select data-action="edit-compra-tienda" data-id="${r.id}"><option value="" ${!r.tiendaId?'selected':''}>-- elige tienda --</option>${tiendas.map(t => `<option value="${t.id}" ${t.id===r.tiendaId?'selected':''}>${esc(t.nombre)}</option>`).join('')}</select></div>
          <div class="field"><label>Responsable</label><select data-action="edit-compra-responsable" data-id="${r.id}"><option value="" ${!r.responsableId?'selected':''}>-- sin responsable --</option>${socios.map(p => `<option value="${p.id}" ${p.id===r.responsableId?'selected':''}>${esc(p.nombre)}</option>`).join('')}</select></div>
          <div style="display:flex;gap:8px;align-items:end"><button type="button" class="modify small" data-action="save-compra" data-id="${r.id}">Modificar</button><button type="button" class="danger small" data-action="delete-compra" data-id="${r.id}">Eliminar</button></div>
        </div>`;
      wrap.appendChild(row);
    });
  };

  document.addEventListener('click', function(e){
    const btn = e.target.closest('button');
    if(!btn) return;
    const action = btn.dataset.action || btn.id;

    if(action === 'save-compra'){
      e.preventDefault();
      e.stopImmediatePropagation();
      const id = btn.dataset.id;
      const c = (state.compras || []).find(x => x.id === id);
      if(c){
        c.productoId = currentValuesByAction('edit-compra-producto', id);
        c.unidades = Number(currentValuesByAction('edit-compra-unidades', id) || 0);
        c.precio = parseEuro(currentValuesByAction('edit-compra-precio', id) || 0);
        c.ticketDonacion = currentValuesByAction('edit-compra-ticket', id);
        c.tiendaId = currentValuesByAction('edit-compra-tienda', id);
        c.responsableId = currentValuesByAction('edit-compra-responsable', id);
        const prod = typeof productoById === 'function' ? productoById(c.productoId) : null;
        if(prod){
          prod.defaultPrecio = c.precio;
          prod.precio = c.precio;
        }
        if(typeof render === 'function') render();
      }
      return;
    }
  }, true);

  document.addEventListener('change', function(e){
    const id = e.target?.id || '';
    if(['buyProducto','buyUnidades','buyTicket','buyPrecio'].includes(id)){
      e.stopImmediatePropagation();
      updateBuyPreview(id === 'buyProducto');
    }
  }, true);

  // Hoja GRAFICAS exactamente como pantalla y barras más a la derecha
  makeChartImageDataUrl = async function(){
    const canvas = document.createElement('canvas');
    canvas.width = 1500;
    canvas.height = 860;
    const ctx = canvas.getContext('2d');

    const g = (typeof graphDataV143 === 'function')
      ? graphDataV143()
      : (typeof graphData === 'function' ? graphData() : {incomes:{total:0},donations:{total:0},expenses:{total:0},saldo:{total:0,realizado:0}});

    const incomeItems = [
      {label:'Socios Banco', value:g.incomes?.socioBanco || 0, color:'#2563eb'},
      {label:'Socios Bizum', value:g.incomes?.socioBizum || 0, color:'#16a34a'},
      {label:'Socios Efectivo', value:g.incomes?.socioEfectivo || 0, color:'#84cc16'},
      {label:'No socios Banco', value:g.incomes?.noSocioBanco || 0, color:'#60a5fa'},
      {label:'No socios Bizum', value:g.incomes?.noSocioBizum || 0, color:'#34d399'},
      {label:'No socios Efectivo', value:g.incomes?.noSocioEfectivo || 0, color:'#bef264'},
      {label:'Pendiente de ingresar', value:g.incomes?.pendiente || 0, color:'#f59e0b'}
    ];
    const donationItems = [
      {label:'Donado por socios', value:g.donations?.socios || 0, color:'#f59e0b'},
      {label:'Donado por no socios', value:g.donations?.noSocios || 0, color:'#b45309'},
      {label:'Donado por tiendas', value:g.donations?.tiendas || 0, color:'#fcd34d'}
    ];
    const expenseItems = [
      {label:'Gastado en TKxx', value:g.expenses?.tk || 0, color:'#dc2626'},
      {label:'Gastos corrientes', value:g.expenses?.corrientes || 0, color:'#ef4444'},
      {label:'Pendiente de comprar', value:g.expenses?.pendiente || 0, color:'#fb7185'}
    ];
    const saldoItems = [
      {label:'Saldo realizado (ingresos realizados – gastos realizados)', value:Math.abs(g.saldo?.realizado || 0), color:(g.saldo?.realizado || 0) >= 0 ? '#0f766e' : '#b91c1c'}
    ];

    const maxVal = Math.max(
      1,
      Number(g.incomes?.total || 0),
      Number(g.donations?.total || 0),
      Number(g.expenses?.total || 0),
      Math.abs(Number(g.saldo?.realizado || 0))
    );

    const fmt = v => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0));
    const barX = 700, barW = 720, barH = 40;

    function rr(x,y,w,h,r,color){
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x+r,y);
      ctx.arcTo(x+w,y,x+w,y+h,r);
      ctx.arcTo(x+w,y+h,x,y+h,r);
      ctx.arcTo(x,y+h,x,y,r);
      ctx.arcTo(x,y,x+w,y,r);
      ctx.closePath();
      ctx.fill();
    }

    function drawLegend(items, startX, startY, maxWidth){
      ctx.font = '15px Arial';
      let x = startX, y = startY, rowH = 24;
      items.filter(it => Number(it.value || 0) !== 0).forEach(it => {
        const text = `${it.label}: ${fmt(it.value)}`;
        const textW = ctx.measureText(text).width;
        const itemW = 20 + textW + 26;
        if(x + itemW > startX + maxWidth){
          x = startX;
          y += rowH;
        }
        ctx.fillStyle = it.color;
        ctx.fillRect(x, y-11, 12, 12);
        ctx.fillStyle = '#334155';
        ctx.fillText(text, x + 20, y);
        x += itemW;
      });
      return y;
    }

    function drawRow(y, label, total, items){
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 20px Arial';
      ctx.fillText(`${label}: ${fmt(total)}`, 40, y + 24);

      rr(barX, y, barW, barH, 20, '#f3f4f6');
      let x = barX;
      items.forEach(it => {
        const w = (Math.max(0, Number(it.value || 0)) / maxVal) * barW;
        if(w <= 0) return;
        rr(x, y, w, barH, 20, it.color);
        x += w;
      });

      return drawLegend(items, barX, y + 66, barW) + 36;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 28px Arial';
    ctx.fillText('GRÁFICAS DEL EVENTO', 40, 44);

    let y = 88;
    y = drawRow(y, 'INGRESOS EN DINERO', Number(g.incomes?.total || 0), incomeItems);
    y = drawRow(y, 'DONACIÓN DE PRODUCTO', Number(g.donations?.total || 0), donationItems);
    y = drawRow(y, 'GASTOS', Number(g.expenses?.total || 0), expenseItems);
    y = drawRow(y, 'SALDO OPERATIVO', Number(g.saldo?.total || 0), saldoItems);

    return canvas.toDataURL('image/png');
  };
})();
