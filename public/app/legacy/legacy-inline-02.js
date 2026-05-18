/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #2. */
(function(){
  const $ = id => document.getElementById(id);

  function productRefPrice(p){
    return Number((p && (p.defaultPrecio ?? p.precio)) || 0);
  }
  function ensureProductRefPrices(){
    (state.productos || []).forEach(p => {
      if(p.defaultPrecio == null) p.defaultPrecio = Number(p.precio || 0);
    });
  }
  function moneyTextV(v){
    return typeof moneyText === 'function' ? moneyText(v) : money(v);
  }
  function euroText(v){
    return typeof euroInputValue === 'function' ? euroInputValue(v) : moneyTextV(v);
  }
  function cleanFilePart(v){
    return String(v || 'evento')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^A-Za-z0-9]+/g,'_')
      .replace(/^_+|_+$/g,'')
      .replace(/_+/g,'_') || 'evento';
  }
  function excelFileName(ev){
    const d = new Date();
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yyyy = String(d.getFullYear());
    return `ControlEvent_v26_6-${cleanFilePart(ev?.titulo || 'evento')}_${dd}${mm}${yyyy}.xlsx`;
  }
  function graphData(){
    const b = budgetSummary();
    const byType = b.ingresosDinero.porTipo || {};
    const banco = Number(byType.Banco || 0);
    const bizum = Number(byType.Bizum || 0);
    const efectivo = Number(byType.Efectivo || 0);
    const pendienteIngreso = Number(byType.Pendiente || 0);
    const donado = Number(b.donacionProducto.valorDonado || 0);
    const pendienteDonar = Number(b.donacionProducto.pendienteDonar || 0);
    const gastado = Number(b.operativa.gastoCompras || 0) + Number(b.operativa.gastosOrganizacion || 0);
    const pendienteCompra = Number(b.operativa.pendiente || 0);
    const saldoReal = Number(b.operativa.saldoOperativo || 0);
    const saldoConPendienteIngreso = saldoReal + pendienteIngreso;
    return {
      banco,bizum,efectivo,pendienteIngreso,
      donado,pendienteDonar,
      gastado,pendienteCompra,
      saldoReal,saldoConPendienteIngreso
    };
  }
  function renderGraphOnly(){
    const wrap = $('eventChartWrap');
    if(!wrap) return;
    const g = graphData();
    const maxVal = Math.max(
      1,
      g.banco + g.bizum + g.efectivo + g.pendienteIngreso,
      g.donado + g.pendienteDonar,
      g.gastado + g.pendienteCompra,
      Math.abs(g.saldoReal) + Math.abs(g.pendienteIngreso),
      Math.abs(g.saldoConPendienteIngreso)
    );
    const seg = (value, color, title) => {
      const w = (Math.max(0, Number(value || 0)) / maxVal) * 100;
      return `<div class="chart-seg" title="${escapeHtml(title)}" style="width:${w}%;background:${color};"></div>`;
    };
    wrap.innerHTML = `
      <div class="chart-shell">
        <div class="chart-bars">
          <div class="chart-row">
            <div class="chart-label">INGRESOS EN DINERO</div>
            <div class="chart-track">
              ${seg(g.banco,'#2563eb','Banco: ' + moneyTextV(g.banco))}
              ${seg(g.bizum,'#16a34a','Bizum: ' + moneyTextV(g.bizum))}
              ${seg(g.efectivo,'#84cc16','Efectivo: ' + moneyTextV(g.efectivo))}
              ${seg(g.pendienteIngreso,'#f59e0b','Pendiente de ingreso: ' + moneyTextV(g.pendienteIngreso))}
              <div class="chart-center-value">${escapeHtml(moneyTextV(g.banco + g.bizum + g.efectivo + g.pendienteIngreso))}</div>
            </div>
          </div>
          <div class="chart-row">
            <div class="chart-label">DONACIÓN DE PRODUCTO</div>
            <div class="chart-track">
              ${seg(g.donado,'#f59e0b','Donado: ' + moneyTextV(g.donado))}
              ${seg(g.pendienteDonar,'#9ca3af','Pendiente de donar: ' + moneyTextV(g.pendienteDonar))}
              <div class="chart-center-value">${escapeHtml(moneyTextV(g.donado + g.pendienteDonar))}</div>
            </div>
          </div>
          <div class="chart-row">
            <div class="chart-label">GASTOS</div>
            <div class="chart-track">
              ${seg(g.gastado,'#dc2626','Comprado / gastado: ' + moneyTextV(g.gastado))}
              ${seg(g.pendienteCompra,'#fb7185','Pendiente de comprar: ' + moneyTextV(g.pendienteCompra))}
              <div class="chart-center-value">${escapeHtml(moneyTextV(g.gastado + g.pendienteCompra))}</div>
            </div>
          </div>
          <div class="chart-row">
            <div class="chart-label">SALDO OPERATIVO</div>
            <div class="chart-track">
              ${seg(Math.abs(g.saldoReal), g.saldoReal >= 0 ? '#0f766e' : '#b91c1c', 'Saldo operativo actual: ' + moneyTextV(g.saldoReal))}
              ${seg(g.pendienteIngreso,'#f59e0b','Pendiente de ingreso incorporado: ' + moneyTextV(g.pendienteIngreso))}
              <div class="chart-center-value">${escapeHtml(moneyTextV(g.saldoConPendienteIngreso))}</div>
            </div>
          </div>
        </div>
      </div>`;
  }

  async function makeChartImageDataUrl(){
    const canvas = document.createElement('canvas');
    canvas.width = 1180;
    canvas.height = 520;
    const ctx = canvas.getContext('2d');
    const g = graphData();
    const maxVal = Math.max(
      1,
      g.banco + g.bizum + g.efectivo + g.pendienteIngreso,
      g.donado + g.pendienteDonar,
      g.gastado + g.pendienteCompra,
      Math.abs(g.saldoReal) + Math.abs(g.pendienteIngreso),
      Math.abs(g.saldoConPendienteIngreso)
    );
    const fmt = v => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(v);
    function rr(x,y,w,h,r,color){
      ctx.fillStyle=color;
      ctx.beginPath();
      ctx.moveTo(x+r,y);
      ctx.arcTo(x+w,y,x+w,y+h,r);
      ctx.arcTo(x+w,y+h,x,y+h,r);
      ctx.arcTo(x,y+h,x,y,r);
      ctx.arcTo(x,y,x+w,y,r);
      ctx.closePath();
      ctx.fill();
    }
    function drawBar(y,label,segments,total){
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 20px Arial';
      ctx.fillText(label, 40, y + 25);
      rr(320,y,800,40,20,'#f3f4f6');
      let x = 320;
      segments.forEach(s => {
        const w = (Math.max(0, Number(s.value || 0)) / maxVal) * 800;
        if(w <= 0) return;
        rr(x,y,w,40,20,s.color);
        x += w;
      });
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(total, 720, y + 26);
      ctx.textAlign = 'left';
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 28px Arial';
    ctx.fillText('GRÁFICAS DEL EVENTO', 40, 42);

    let y = 80;
    drawBar(y,'INGRESOS EN DINERO',[
      {value:g.banco, color:'#2563eb'},
      {value:g.bizum, color:'#16a34a'},
      {value:g.efectivo, color:'#84cc16'},
      {value:g.pendienteIngreso, color:'#f59e0b'}
    ], fmt(g.banco + g.bizum + g.efectivo + g.pendienteIngreso));
    y += 100;
    drawBar(y,'DONACIÓN DE PRODUCTO',[
      {value:g.donado, color:'#f59e0b'},
      {value:g.pendienteDonar, color:'#9ca3af'}
    ], fmt(g.donado + g.pendienteDonar));
    y += 100;
    drawBar(y,'GASTOS',[
      {value:g.gastado, color:'#dc2626'},
      {value:g.pendienteCompra, color:'#fb7185'}
    ], fmt(g.gastado + g.pendienteCompra));
    y += 100;
    drawBar(y,'SALDO OPERATIVO',[
      {value:Math.abs(g.saldoReal), color:g.saldoReal >= 0 ? '#0f766e' : '#b91c1c'},
      {value:g.pendienteIngreso, color:'#f59e0b'}
    ], fmt(g.saldoConPendienteIngreso));

    return canvas.toDataURL('image/png');
  }

  ensureProductRefPrices();

  // Override helpers to support reference price
  window.comprasForEvent = function(){
    ensureProductRefPrices();
    return state.compras
      .filter(c => c.eventId === state.selectedEventId)
      .map(c => {
        const productoBase = productoById(c.productoId) || {};
        const precio = Number(c.precio != null ? c.precio : productRefPrice(productoBase));
        const unidades = Number(c.unidades || 0);
        const valor = precio * unidades;
        const donation = isDonationTicket(c.ticketDonacion);
        const importe = donation ? 0 : valor;
        const tienda = donation
          ? {id: c.donorRef || '', nombre: (typeof donorLabel === 'function' ? donorLabel(c.donorRef) : '')}
          : tiendaById(c.tiendaId || '') || {id:'', nombre:''};
        const producto = {...productoBase, precio, defaultPrecio: productRefPrice(productoBase)};
        return {
          ...c,
          producto,
          precioCalc: precio,
          tienda,
          valor,
          importe,
          responsable: personaById(c.responsableId || ''),
          donorLabel: typeof donorLabel === 'function' ? donorLabel(c.donorRef || '') : ''
        };
      });
  };

  window.budgetSummary = function(){
    const rows = collabsForEvent();
    const compras = comprasForEvent();

    const sociosRows = rows.filter(r => r.persona?.rango === 'SOCIO');
    const noSociosRows = rows.filter(r => r.persona?.rango !== 'SOCIO');

    const sumNum = arr => arr.reduce((a,b) => a + Number(b.numero || 0), 0);
    const sumTotal = arr => arr.reduce((a,b) => a + Number(b.total || 0), 0);
    const paidTotal = arr => arr.filter(r => r.situacion !== 'Pendiente').reduce((a,b) => a + Number(b.total || 0), 0);
    const pendingTotal = arr => arr.filter(r => r.situacion === 'Pendiente').reduce((a,b) => a + Number(b.total || 0), 0);

    const sociosCount = sumNum(sociosRows);
    const noSociosCount = sumNum(noSociosRows);
    const sociosImporte = sumTotal(sociosRows);
    const sociosIngresado = paidTotal(sociosRows);
    const sociosPendiente = pendingTotal(sociosRows);
    const noSociosImporte = sumTotal(noSociosRows);
    const noSociosIngresado = paidTotal(noSociosRows);
    const noSociosPendiente = pendingTotal(noSociosRows);

    const porTipo = PAYMENT_OPTIONS.reduce((acc, tipo) => {
      acc[tipo] = rows.filter(r => r.situacion === tipo).reduce((a,b) => a + Number(b.total || 0), 0);
      return acc;
    }, {});

    const dineroIngresado = sociosIngresado + noSociosIngresado;
    const dineroPendiente = sociosPendiente + noSociosPendiente;
    const dineroComprometido = dineroIngresado + dineroPendiente;

    const gastadoCompras = compras.filter(c => !isDonationTicket(c.ticketDonacion) && !isCurrentExpenseTicket(c.ticketDonacion) && String(c.ticketDonacion || '').trim() !== '').reduce((a,b)=>a+b.valor,0);
    const gastosOrganizacion = compras.filter(c => isCurrentExpenseTicket(c.ticketDonacion)).reduce((a,b)=>a+b.valor,0);
    const pendienteCompra = compras.filter(c => !isDonationTicket(c.ticketDonacion) && String(c.ticketDonacion || '').trim() === '').reduce((a,b)=>a+b.valor,0);

    const donadoTienda = compras.filter(c => c.ticketDonacion === 'DONADO TIENDA').reduce((a,b)=>a+b.valor,0);
    const donadoSocio = compras.filter(c => c.ticketDonacion === 'DONADO SOCIO').reduce((a,b)=>a+b.valor,0);
    const donadoOtros = compras.filter(c => c.ticketDonacion === 'DONADO OTROS').reduce((a,b)=>a+b.valor,0);
    const valorDonado = donadoTienda + donadoSocio + donadoOtros;
    const pendienteDonar = 0;

    const saldoOperativo = dineroIngresado - gastadoCompras - gastosOrganizacion;
    const saldoOperativoConPendienteIngreso = saldoOperativo + dineroPendiente;

    return {
      ingresosDinero: {
        socios: {count:sociosCount, importe:sociosImporte, ingresado:sociosIngresado, pendiente:sociosPendiente},
        noSocios: {count:noSociosCount, importe:noSociosImporte, ingresado:noSociosIngresado, pendiente:noSociosPendiente},
        donantes: {count:noSociosCount, importe:noSociosImporte, ingresado:noSociosIngresado, pendiente:noSociosPendiente},
        totalIngresado: dineroIngresado,
        totalComprometido: dineroComprometido,
        pendiente: dineroPendiente,
        porTipo
      },
      donacionProducto: {
        donado: valorDonado,
        donadoTienda,
        donadoSocio,
        donadoOtros,
        valorDonado,
        pendienteDonar
      },
      operativa: {
        ingresoDinero: dineroIngresado,
        ingresoComprometido: dineroComprometido,
        gastoCompras: gastadoCompras,
        gastosOrganizacion,
        pendiente: pendienteCompra,
        saldoOperativo,
        saldoOperativoConPendienteIngreso
      },
      compras: {
        total: gastadoCompras + gastosOrganizacion + valorDonado + pendienteCompra,
        resueltas: gastadoCompras + gastosOrganizacion,
        pendientes: pendienteCompra,
        valorDonado,
        gastosCorrientes: gastosOrganizacion,
        saldoReal: saldoOperativo
      }
    };
  };

  window.renderBudget = function(){
    const wrap = $('budgetLayout');
    const b = budgetSummary();
    if(wrap){
      wrap.innerHTML = `
        <div class="budget-panel socios">
          <h3>INGRESOS EN DINERO</h3>
          <div class="budget-rows">
            <div class="budget-row budget-subgroup"><strong>SOCIOS</strong><span>${escapeHtml(money(b.ingresosDinero.socios.ingresado))}</span></div>
            <div class="budget-subrows">
              <div class="budget-subrow"><span>Personas</span><span>${escapeHtml(String(b.ingresosDinero.socios.count))}</span></div>
              <div class="budget-subrow"><span>Importe socios</span><span>${escapeHtml(money(b.ingresosDinero.socios.importe))}</span></div>
              <div class="budget-subrow"><span>Ingresado socios</span><span>${escapeHtml(money(b.ingresosDinero.socios.ingresado))}</span></div>
              <div class="budget-subrow"><span>Pendiente socios</span><span>${escapeHtml(money(b.ingresosDinero.socios.pendiente))}</span></div>
            </div>
            <div class="budget-row budget-subgroup"><strong>NO SOCIOS</strong><span>${escapeHtml(money(b.ingresosDinero.noSocios.ingresado))}</span></div>
            <div class="budget-subrows">
              <div class="budget-subrow"><span>Personas</span><span>${escapeHtml(String(b.ingresosDinero.noSocios.count))}</span></div>
              <div class="budget-subrow"><span>Importe no socios</span><span>${escapeHtml(money(b.ingresosDinero.noSocios.importe))}</span></div>
              <div class="budget-subrow"><span>Ingresado no socios</span><span>${escapeHtml(money(b.ingresosDinero.noSocios.ingresado))}</span></div>
              <div class="budget-subrow"><span>Pendiente no socios</span><span>${escapeHtml(money(b.ingresosDinero.noSocios.pendiente))}</span></div>
            </div>
          </div>
        </div>
        <div class="budget-panel donantes">
          <h3>DONACIÓN DE PRODUCTO</h3>
          <div class="budget-rows">
            <div class="budget-subrows">
              <div class="budget-subrow"><span>Donación de producto tiendas</span><span>${escapeHtml(money(b.donacionProducto.donadoTienda))}</span></div>
              <div class="budget-subrow"><span>Donación de producto socios</span><span>${escapeHtml(money(b.donacionProducto.donadoSocio))}</span></div>
              <div class="budget-subrow"><span>Donación de producto no socios</span><span>${escapeHtml(money(b.donacionProducto.donadoOtros))}</span></div>
            </div>
            <div class="budget-row budget-subgroup"><strong>Valor producto donado</strong><span>${escapeHtml(money(b.donacionProducto.valorDonado))}</span></div>
          </div>
        </div>
        <div class="budget-panel operativo">
          <h3>OPERATIVA</h3>
          <div class="budget-rows">
            <div class="budget-row"><strong>INGRESO DINERO</strong><span>${escapeHtml(money(b.operativa.ingresoDinero))}</span></div>
            <div class="budget-row"><strong>GASTO POR COMPRAS</strong><span>${escapeHtml(money(b.operativa.gastoCompras))}</span></div>
            <div class="budget-row"><strong>GASTOS DE ORGANIZACIÓN</strong><span>${escapeHtml(money(b.operativa.gastosOrganizacion))}</span></div>
            <div class="budget-row"><strong>PTE. DE COMPRAS Y/O GASTOS DE ORGANIZACIÓN</strong><span style="color:#c2410c">${escapeHtml(money(b.operativa.pendiente))}</span></div>
            <div class="budget-row"><strong>SALDO OPERATIVO</strong><span style="color:${b.operativa.saldoOperativo >= 0 ? '#047857' : '#b91c1c'}">${escapeHtml(money(b.operativa.saldoOperativo))}</span></div>
          </div>
        </div>`;
    }
    renderSummaryList('summarySegmento', summaryBySegmento());
    renderSummaryList('summaryDestino', summaryByDestino());
    renderSummaryList('summaryTiendaTicket', summaryByTiendaTicket());
    renderGraficas();
  };

  window.renderGraficas = function(){ renderGraphOnly(); };

  window.renderProductos = function(){
    ensureProductRefPrices();
    $('newProductoSegmento').innerHTML = SEGMENT_OPTIONS.map(v => `<option value="${v}">${v}</option>`).join('');
    $('newProductoDestino').innerHTML = DESTINO_OPTIONS.map(v => `<option value="${v}">${v}</option>`).join('');
    if($('newProductoPrecio') && !$('newProductoPrecio').value) $('newProductoPrecio').value = '0,00 €';
    const wrap = $('productosList');
    const list = (state.productos || []).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
    if(!list.length){ wrap.innerHTML = '<div class="empty">No hay productos.</div>'; return; }
    wrap.innerHTML = '<div class="hint">Ordenar por: <a href="#" onclick="currentProductSort=\'nombre\'; renderProductos(); return false;">Nombre</a> · <a href="#" onclick="currentProductSort=\'segmento\'; renderProductos(); return false;">Segmento</a> · <a href="#" onclick="currentProductSort=\'destino\'; renderProductos(); return false;">Destino</a> · <a href="#" onclick="currentProductSort=\'precio\'; renderProductos(); return false;">Precio referencia</a></div>';
    const sorted = list.sort((a,b)=>{
      const sort = currentProductSort || 'nombre';
      if(sort === 'precio') return productRefPrice(a) - productRefPrice(b) || (a.nombre||'').localeCompare((b.nombre||''),'es');
      return String(a[sort] || '').localeCompare(String(b[sort] || ''),'es');
    });
    sorted.forEach(p => {
      const row = document.createElement('div');
      row.className = 'itemcard maint-soft';
      row.innerHTML = `
        <div class="rowline producto">
          <div class="field"><label>Nombre</label><input value="${escapeHtml(p.nombre)}" data-action="edit-producto-nombre" data-id="${p.id}" /></div>
          <div class="field"><label>Segmento</label><select data-action="edit-producto-segmento" data-id="${p.id}">${SEGMENT_OPTIONS.map(v => `<option value="${v}" ${v===p.segmento?'selected':''}>${v}</option>`).join('')}</select></div>
          <div class="field"><label>Destino</label><select data-action="edit-producto-destino" data-id="${p.id}">${DESTINO_OPTIONS.map(v => `<option value="${v}" ${v===p.destino?'selected':''}>${v}</option>`).join('')}</select></div>
          <div class="field"><label>Precio referencia</label><input class="money-text" type="text" value="${euroText(productRefPrice(p))}" data-action="edit-producto-precio" data-id="${p.id}" /></div>
          <button type="button" class="modify small" data-action="save-producto" data-id="${p.id}">Modificar</button>
          <button type="button" class="danger small" data-action="delete-producto" data-id="${p.id}">Eliminar</button>
        </div>`;
      wrap.appendChild(row);
    });
  };

  window.addProducto = function(){
    const nombre = ($('newProductoNombre').value || '').trim();
    if(!nombre) return;
    const precioRef = parseEuroInput($('newProductoPrecio')?.value || 0);
    state.productos.push({
      id: uid(),
      nombre,
      segmento: $('newProductoSegmento').value,
      destino: $('newProductoDestino').value,
      defaultPrecio: precioRef
    });
    $('newProductoNombre').value = '';
    if($('newProductoPrecio')) $('newProductoPrecio').value = '0,00 €';
    render();
  };

  window.renderMainSelectors = function(){
    ensureProductRefPrices();
    const personas = (typeof personasGenerales === 'function' ? personasGenerales() : (state.personas||[])).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
    const productos = (typeof productosGenerales === 'function' ? productosGenerales() : (state.productos||[])).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
    const tiendas = (typeof tiendasGenerales === 'function' ? tiendasGenerales() : (state.tiendas||[])).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
    const socios = (typeof socioResponsableOptions === 'function' ? socioResponsableOptions() : []).slice();
    const donors = (typeof donorOptions === 'function' ? donorOptions() : []).slice();

    $('collabPersona').innerHTML = '<option value="" selected>Busca colaborador/a.....</option>' + personas.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)} (${escapeHtml(p.rango)})</option>`).join('');
    $('collabSituacion').innerHTML = PAYMENT_OPTIONS.map(v => `<option value="${v}">${v}</option>`).join('');

    $('buyProducto').innerHTML = '<option value="" selected>Busca un producto....</option>' + productos.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`).join('');
    $('buyTicket').innerHTML = PURCHASE_TICKET_OPTIONS.map(v => `<option value="${v}">${v === '' ? '-- Pte.Compra u otros gastos --' : escapeHtml(v)}</option>`).join('');
    $('buyResponsable').innerHTML = '<option value="">-- sin responsable --</option>' + socios.map(p => `<option value="${p.value}">${escapeHtml(p.label)}</option>`).join('');
    $('buyTienda').innerHTML = '<option value="">-- elige tienda --</option>' + tiendas.map(t => `<option value="${t.id}">${escapeHtml(t.nombre)}</option>`).join('');

    $('donProducto').innerHTML = '<option value="" selected>Busca un producto....</option>' + productos.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`).join('');
    $('donTicket').innerHTML = DONATION_TICKET_OPTIONS.map(v => `<option value="${v}">${escapeHtml(v)}</option>`).join('');
    $('donResponsable').innerHTML = '<option value="">-- sin responsable --</option>' + socios.map(p => `<option value="${p.value}">${escapeHtml(p.label)}</option>`).join('');
    $('donDonante').innerHTML = '<option value="">-- elige donante --</option>' + donors.map(d => `<option value="${d.value}">${escapeHtml(d.label)}</option>`).join('');

    updateBuyPreview(true);
    updateDonationPreview(true);
  };

  window.updateBuyPreview = function(forceReference=false){
    ensureProductRefPrices();
    const productId = $('buyProducto')?.value || '';
    const producto = productoById(productId);
    const precioEl = $('buyPrecio');
    const ref = productRefPrice(producto);
    const last = precioEl?.dataset?.lastProductId || '';
    let precio = parseEuroInput(precioEl?.value || 0);
    if(forceReference || productId !== last){
      precio = ref;
      if(precioEl){
        precioEl.value = euroText(ref);
        precioEl.dataset.lastProductId = productId;
      }
    }
    const unidades = Number($('buyUnidades')?.value || 0);
    const importe = precio * unidades;
    if($('buyImporte')) $('buyImporte').value = moneyTextV(importe);
  };

  window.updateDonationPreview = function(forceReference=false){
    ensureProductRefPrices();
    const productId = $('donProducto')?.value || '';
    const producto = productoById(productId);
    const precioEl = $('donPrecio');
    const ref = productRefPrice(producto);
    const last = precioEl?.dataset?.lastProductId || '';
    let precio = parseEuroInput(precioEl?.value || 0);
    if(forceReference || productId !== last){
      precio = ref;
      if(precioEl){
        precioEl.value = euroText(ref);
        precioEl.dataset.lastProductId = productId;
      }
    }
    const unidades = Number($('donUnidades')?.value || 0);
    const valor = precio * unidades;
    if($('donImporte')) $('donImporte').value = moneyTextV(valor);
  };

  window.addCompra = function(){
    if(!selectedEvent()) return;
    const productoId = $('buyProducto').value;
    if(!productoId) return;
    const precio = parseEuroInput($('buyPrecio').value || 0);
    state.compras.push({
      id: uid(),
      eventId: state.selectedEventId,
      productoId,
      unidades: Number($('buyUnidades').value || 0),
      precio,
      ticketDonacion: $('buyTicket').value,
      tiendaId: $('buyTienda').value || '',
      responsableId: $('buyResponsable').value || ''
    });
    const p = productoById(productoId);
    if(p) p.defaultPrecio = precio;
    $('buyProducto').value = '';
    $('buyUnidades').value = '1.00';
    $('buyPrecio').value = '0,00 €';
    $('buyTicket').value = '';
    $('buyTienda').value = '';
    $('buyResponsable').value = '';
    render();
  };

  window.addDonation = function(){
    if(!selectedEvent()) return;
    const productoId = $('donProducto').value;
    if(!productoId) return;
    const precio = parseEuroInput($('donPrecio').value || 0);
    state.compras.push({
      id: uid(),
      eventId: state.selectedEventId,
      productoId,
      unidades: Number($('donUnidades').value || 0),
      precio,
      ticketDonacion: $('donTicket').value,
      donorRef: $('donDonante').value || '',
      responsableId: $('donResponsable').value || ''
    });
    $('donProducto').value = '';
    $('donUnidades').value = '1.00';
    $('donPrecio').value = '0,00 €';
    $('donTicket').value = DONATION_TICKET_OPTIONS[0];
    $('donDonante').value = '';
    $('donResponsable').value = '';
    render();
  };

  window.renderCompras = function(){
    const wrap = $('comprasList');
    let rows = comprasForEvent().filter(r => !isDonationTicket(r.ticketDonacion)).slice();
    const sorts = {
      producto:(a,b)=> (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es') || String(a.ticketDonacion||'').localeCompare(String(b.ticketDonacion||''),'es'),
      ticket:(a,b)=> String(a.ticketDonacion||'').localeCompare(String(b.ticketDonacion||''),'es') || (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es'),
      tienda:(a,b)=> (a.tienda?.nombre||'').localeCompare((b.tienda?.nombre||''),'es') || (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es'),
      responsable:(a,b)=> (a.responsable?.nombre||'').localeCompare((b.responsable?.nombre||''),'es') || (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es'),
    };
    rows.sort(sorts[state.comprasSort] || sorts.producto);
    if(!rows.length){ wrap.innerHTML = '<div class="empty">Todavía no hay compras u otros gastos para este evento.</div>'; return; }
    const socios = (typeof socioResponsableOptions === 'function' ? socioResponsableOptions() : []).slice();
    const tiendas = (typeof tiendasGenerales === 'function' ? tiendasGenerales() : []).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
    wrap.innerHTML = '<div class="hint">Ordenar por: <a href="#" onclick="state.comprasSort=\'producto\'; renderCompras(); return false;">Producto</a> · <a href="#" onclick="state.comprasSort=\'ticket\'; renderCompras(); return false;">Ticket</a> · <a href="#" onclick="state.comprasSort=\'tienda\'; renderCompras(); return false;">Tienda</a> · <a href="#" onclick="state.comprasSort=\'responsable\'; renderCompras(); return false;">Responsable</a></div>';
    rows.forEach(r => {
      const pending = String(r.ticketDonacion || '').trim() === '';
      const row = document.createElement('div');
      row.className = 'itemcard' + (pending ? ' red-row' : '');
      row.innerHTML = `
        <div class="rowline compra">
          <div class="field"><label>Producto</label><select data-action="edit-compra-producto" data-id="${r.id}">${(state.productos||[]).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es')).map(p => `<option value="${p.id}" ${p.id===r.productoId?'selected':''}>${escapeHtml(p.nombre)}</option>`).join('')}</select></div>
          <div class="field"><label>Unidades</label><input type="number" min="0" step="0.01" value="${Number(r.unidades||0)}" data-action="edit-compra-unidades" data-id="${r.id}" /></div>
          <div class="field"><label>Precio</label><input class="money-text" type="text" value="${euroText(r.precioCalc || 0)}" data-action="edit-compra-precio" data-id="${r.id}" /></div>
          <div class="field"><label>Importe</label><input class="soft-readonly" readonly value="${moneyTextV(r.importe)}" /></div>
          <div class="field"><label>Ticket u Otros gastos</label><select data-action="edit-compra-ticket" data-id="${r.id}">${PURCHASE_TICKET_OPTIONS.map(v => `<option value="${v}" ${v===r.ticketDonacion?'selected':''}>${v === '' ? '-- Pte.Compra u otros gastos --' : escapeHtml(v)}</option>`).join('')}</select></div>
          <div class="field"><label>Tienda</label><select data-action="edit-compra-tienda" data-id="${r.id}"><option value="" ${!r.tiendaId?'selected':''}>-- elige tienda --</option>${tiendas.map(t => `<option value="${t.id}" ${t.id===r.tiendaId?'selected':''}>${escapeHtml(t.nombre)}</option>`).join('')}</select></div>
          <div class="field"><label>Responsable</label><select data-action="edit-compra-responsable" data-id="${r.id}"><option value="" ${!r.responsableId?'selected':''}>-- sin responsable --</option>${socios.map(p => `<option value="${p.value}" ${p.value===r.responsableId?'selected':''}>${escapeHtml(p.label)}</option>`).join('')}</select></div>
          <div style="display:flex;gap:8px;align-items:end"><button type="button" class="modify small" data-action="save-compra" data-id="${r.id}">Modificar</button><button type="button" class="danger small" data-action="delete-compra" data-id="${r.id}">Eliminar</button></div>
        </div>`;
      wrap.appendChild(row);
    });
  };

  window.renderDonaciones = function(){
    const wrap = $('donacionesList');
    let rows = comprasForEvent().filter(r => isDonationTicket(r.ticketDonacion)).slice();
    const sorts = {
      producto:(a,b)=> (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es'),
      ticket:(a,b)=> String(a.ticketDonacion||'').localeCompare(String(b.ticketDonacion||''),'es'),
      donante:(a,b)=> (a.donorLabel||'').localeCompare((b.donorLabel||''),'es'),
      responsable:(a,b)=> (a.responsable?.nombre||'').localeCompare((b.responsable?.nombre||''),'es')
    };
    rows.sort((a,b)=>{
      const order = sorts[state.donacionesSort] || sorts.producto;
      const p = order(a,b);
      if(p !== 0) return p;
      return (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es');
    });
    if(!rows.length){ wrap.innerHTML = '<div class="empty">Todavía no hay donaciones de producto para este evento.</div>'; return; }
    const socios = (typeof socioResponsableOptions === 'function' ? socioResponsableOptions() : []).slice();
    const donors = (typeof donorOptions === 'function' ? donorOptions() : []).slice();
    wrap.innerHTML = '<div class="hint">Ordenar por: <a href="#" onclick="state.donacionesSort=\'producto\'; renderDonaciones(); return false;">Producto</a> · <a href="#" onclick="state.donacionesSort=\'ticket\'; renderDonaciones(); return false;">Tipo de donación</a> · <a href="#" onclick="state.donacionesSort=\'donante\'; renderDonaciones(); return false;">Donante</a> · <a href="#" onclick="state.donacionesSort=\'responsable\'; renderDonaciones(); return false;">Responsable</a></div>';
    rows.forEach(r => {
      const row = document.createElement('div');
      row.className = 'itemcard';
      row.innerHTML = `
        <div class="rowline compra">
          <div class="field"><label>Producto</label><select data-action="edit-donacion-producto" data-id="${r.id}">${(state.productos||[]).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es')).map(p => `<option value="${p.id}" ${p.id===r.productoId?'selected':''}>${escapeHtml(p.nombre)}</option>`).join('')}</select></div>
          <div class="field"><label>Unidades</label><input type="number" min="0" step="0.01" value="${Number(r.unidades||0)}" data-action="edit-donacion-unidades" data-id="${r.id}" /></div>
          <div class="field"><label>Precio</label><input class="money-text" type="text" value="${euroText(r.precioCalc || 0)}" data-action="edit-donacion-precio" data-id="${r.id}" /></div>
          <div class="field"><label>Valor</label><input class="soft-readonly" readonly value="${moneyTextV(r.valor)}" /></div>
          <div class="field"><label>Tipo de donación</label><select data-action="edit-donacion-ticket" data-id="${r.id}">${DONATION_TICKET_OPTIONS.map(v => `<option value="${v}" ${v===r.ticketDonacion?'selected':''}>${escapeHtml(v)}</option>`).join('')}</select></div>
          <div class="field"><label>Donante</label><select data-action="edit-donacion-donante" data-id="${r.id}"><option value="" ${!r.donorRef?'selected':''}>-- elige donante --</option>${donors.map(d => `<option value="${d.value}" ${d.value===r.donorRef?'selected':''}>${escapeHtml(d.label)}</option>`).join('')}</select></div>
          <div class="field"><label>Responsable</label><select data-action="edit-donacion-responsable" data-id="${r.id}"><option value="" ${!r.responsableId?'selected':''}>-- sin responsable --</option>${socios.map(p => `<option value="${p.value}" ${p.value===r.responsableId?'selected':''}>${escapeHtml(p.label)}</option>`).join('')}</select></div>
          <div style="display:flex;gap:8px;align-items:end"><button type="button" class="modify small" data-action="save-donacion" data-id="${r.id}">Modificar</button><button type="button" class="danger small" data-action="delete-donacion" data-id="${r.id}">Eliminar</button></div>
        </div>`;
      wrap.appendChild(row);
    });
  };

  window.exportExcel = async function(){
    if(isLocked() && !isGodRole()) return;
    const ev = selectedEvent();
    if(!ev) return;

    try{
      await ensureExcelJS();
    }catch(err){
      alert('No se pudo cargar el motor de Excel. Coloca exceljs.min.js en la carpeta vendor o usa conexión a internet.');
      return;
    }

    ensureProductRefPrices();

    const collabs = collabsForEvent();
    const compras = comprasForEvent();
    const comprasSolo = compras.filter(x => !isDonationTicket(x.ticketDonacion));
    const donacionesSolo = compras.filter(x => isDonationTicket(x.ticketDonacion));
    const budget = budgetSummary();
    const segRows = summaryBySegmento();
    const destRows = summaryByDestino();
    const tiendaRows = summaryByTiendaTicket();

    const wb = new ExcelJS.Workbook();
    wb.creator = 'ControlEvent v26.6 - ©oltyLAB ’26';
    wb.created = new Date();

    const border = {top:{style:'thin', color:{argb:'FFDDE2EA'}},left:{style:'thin', color:{argb:'FFDDE2EA'}},bottom:{style:'thin', color:{argb:'FFDDE2EA'}},right:{style:'thin', color:{argb:'FFDDE2EA'}}};
    const fills = { title:'FF111827', ok:'FFECFDF5', bad:'FFFEF2F2', warn:'FFFFF7ED', white:'FFFFFFFF' };
    const moneyFmt = '#,##0.00 [$€-C0A]';
    const numFmt = '0.00';

    function baseSheet(name, widths){
      const ws = wb.addWorksheet(name);
      ws.properties.defaultRowHeight = 20;
      ws.columns = widths.map(w => ({width:w}));
      return ws;
    }
    function paint(cell, fill='white'){
      cell.border = border;
      cell.alignment = {vertical:'middle', wrapText:true};
      if(fill && fills[fill]){
        cell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:fills[fill]}};
      }
    }
    function titleRow(ws, rowNum, headers){
      headers.forEach((h, i) => {
        const c = ws.getCell(rowNum, i+1);
        c.value = h;
        c.font = {bold:true, color:{argb:'FFFFFFFF'}};
        c.fill = {type:'pattern', pattern:'solid', fgColor:{argb:fills.title}};
        c.border = border;
        c.alignment = {vertical:'middle', horizontal:'center'};
      });
      ws.getRow(rowNum).height = 20;
    }
    function putText(ws, r, c, v, fill='white'){
      const cell = ws.getCell(r,c);
      cell.value = v == null ? '' : String(v);
      paint(cell, fill);
      return cell;
    }
    function putNum(ws, r, c, v, fill='white'){
      const cell = ws.getCell(r,c);
      cell.value = Number(v || 0);
      cell.numFmt = numFmt;
      paint(cell, fill);
      return cell;
    }
    function putMoney(ws, r, c, v, fill='white'){
      const cell = ws.getCell(r,c);
      cell.value = Number(v || 0);
      cell.numFmt = moneyFmt;
      paint(cell, fill);
      return cell;
    }
    function addTotalRow(ws, rowNum, labelCol, valueCol, total){
      putText(ws, rowNum, labelCol, 'TOTAL', 'ok');
      putMoney(ws, rowNum, valueCol, total, 'ok');
    }
    function mergeTitle(ws, row, text, cols){
      ws.mergeCells(row,1,row,cols);
      const cell = ws.getCell(row,1);
      cell.value = text;
      cell.font = {bold:true, color:{argb:'FFFFFFFF'}};
      cell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:fills.title}};
      cell.border = border;
      cell.alignment = {vertical:'middle', horizontal:'center'};
      ws.getRow(row).height = 20;
    }
    function addImageToCell(ws, dataUrl, row, col){
      if(!dataUrl) return;
      const m = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
      if(!m) return;
      const ext = m[1].includes('png') ? 'png' : 'jpeg';
      const id = wb.addImage({base64:dataUrl, extension:ext});
      ws.getRow(row).height = 320;
      paint(ws.getCell(row,col), 'white');
      ws.addImage(id, { tl: {col: col-1 + 0.05, row: row-1 + 0.05}, ext: {width: 1040, height: 420} });
    }

    // RESUMEN
    const wsRes = baseSheet('RESUMEN', [34, 26, 16, 16, 16, 16, 16, 16, 16]);
    let r = 1;
    mergeTitle(wsRes, r++, 'RESUMEN DEL EVENTO', 4);
    putText(wsRes,r,1,'Generado por'); putText(wsRes,r++,2,'ControlEvent v26.6 - ©oltyLAB ’26');
    putText(wsRes,r,1,'Evento'); putText(wsRes,r++,2,ev.titulo);
    putText(wsRes,r,1,'Fechas'); putText(wsRes,r++,2,`(del ${ev.fechaIni || ''} al ${ev.fechaFin || ''})`);
    wsRes.mergeCells(r,2,r,6); putText(wsRes,r,1,'Descripción del evento'); putText(wsRes,r,2,ev.descripcion || ''); wsRes.getCell(r,2).alignment = {vertical:'middle', wrapText:true}; wsRes.getRow(r).height = Math.max(22, Math.min(120, 20 + Math.ceil(String(ev.descripcion||'').length / 55) * 16)); r++;
    putText(wsRes,r,1,'Situación'); putText(wsRes,r++,2,ev.situacion || 'En curso', (ev.situacion === 'Finalizado' ? 'bad' : 'ok'));
    putText(wsRes,r,1,'Precio evento'); putMoney(wsRes,r++,2,ev.precio);
    putText(wsRes,r,1,'Ingreso dinero'); putMoney(wsRes,r++,2,budget.ingresosDinero.totalIngresado);
    putText(wsRes,r,1,'Gasto por compras'); putMoney(wsRes,r++,2,budget.operativa.gastoCompras);
    putText(wsRes,r,1,'Gastos de organización'); putMoney(wsRes,r++,2,budget.operativa.gastosOrganizacion);
    putText(wsRes,r,1,'Valor producto donado'); putMoney(wsRes,r++,2,budget.donacionProducto.valorDonado);
    putText(wsRes,r,1,'Donación de producto tiendas'); putMoney(wsRes,r++,2,budget.donacionProducto.donadoTienda);
    putText(wsRes,r,1,'Donación de producto socios'); putMoney(wsRes,r++,2,budget.donacionProducto.donadoSocio);
    putText(wsRes,r,1,'Donación de producto no socios'); putMoney(wsRes,r++,2,budget.donacionProducto.donadoOtros);
    putText(wsRes,r,1,'Saldo operativo'); putMoney(wsRes,r++,2,budget.operativa.saldoOperativo, budget.operativa.saldoOperativo >= 0 ? 'ok' : 'bad');
    putText(wsRes,r,1,'Fecha y hora emisión'); putText(wsRes,r++,2,new Date().toLocaleString('es-ES'));

    // INGRESOS
    const wsIng = baseSheet('INGRESOS', [34, 9, 16, 18, 18, 18]);
    r = 1;
    mergeTitle(wsIng, r++, 'INGRESOS', 6);
    titleRow(wsIng, r++, ['Colaborador/a','Número','Tipo ingreso','Importe SOCIO','Importe NO SOCIO','TOTAL']);
    collabs.forEach(item => {
      putText(wsIng,r,1,`${item.persona?.nombre || ''} (${item.persona?.rango || ''})`);
      putNum(wsIng,r,2,item.numero);
      putText(wsIng,r,3,item.situacion);
      putMoney(wsIng,r,4,item.base);
      putMoney(wsIng,r,5,item.donation);
      putMoney(wsIng,r,6,item.total);
      if(item.situacion === 'Pendiente') for(let c=1;c<=6;c++) paint(wsIng.getCell(r,c),'bad');
      r++;
    });
    addTotalRow(wsIng, r, 5, 6, collabs.reduce((a,b)=>a+Number(b.total||0),0));

    // COMPRAS Y OTROS GASTOS
    const wsCom = baseSheet('COMPRAS Y OTROS GASTOS', [28, 16, 16, 10, 14, 14, 20, 24, 22]);
    r = 1;
    mergeTitle(wsCom, r++, 'COMPRAS Y OTROS GASTOS', 9);
    titleRow(wsCom, r++, ['Producto','Segmento','Destino','ud','Precio','Importe','Tienda','Ticket u Otros gastos','Responsable']);
    comprasSolo.forEach(item => {
      putText(wsCom,r,1,item.producto?.nombre || '');
      putText(wsCom,r,2,item.producto?.segmento || '');
      putText(wsCom,r,3,item.producto?.destino || '');
      putNum(wsCom,r,4,item.unidades);
      putMoney(wsCom,r,5,item.precioCalc || item.precio || 0);
      putMoney(wsCom,r,6,item.importe);
      putText(wsCom,r,7,item.tienda?.nombre || '');
      putText(wsCom,r,8,item.ticketDonacion || 'Pte.Compra u otros gastos');
      putText(wsCom,r,9,item.responsable?.nombre || '');
      if(String(item.ticketDonacion || '').trim() === '') for(let c=1;c<=9;c++) paint(wsCom.getCell(r,c),'bad');
      r++;
    });
    addTotalRow(wsCom, r, 5, 6, comprasSolo.reduce((a,b)=>a+Number(b.importe||0),0));

    // DONACIONES DE PRODUCTO
    const wsDon = baseSheet('DONACIONES DE PRODUCTO', [28, 16, 16, 10, 14, 14, 20, 24, 22]);
    r = 1;
    mergeTitle(wsDon, r++, 'DONACIONES DE PRODUCTO', 9);
    titleRow(wsDon, r++, ['Producto','Segmento','Destino','ud','Precio','Valor','Donante','Tipo de donación','Responsable']);
    donacionesSolo.forEach(item => {
      putText(wsDon,r,1,item.producto?.nombre || '');
      putText(wsDon,r,2,item.producto?.segmento || '');
      putText(wsDon,r,3,item.producto?.destino || '');
      putNum(wsDon,r,4,item.unidades);
      putMoney(wsDon,r,5,item.precioCalc || item.precio || 0);
      putMoney(wsDon,r,6,item.valor);
      putText(wsDon,r,7,item.donorLabel || item.tienda?.nombre || '');
      putText(wsDon,r,8,item.ticketDonacion || '');
      putText(wsDon,r,9,item.responsable?.nombre || '');
      r++;
    });
    addTotalRow(wsDon, r, 5, 6, donacionesSolo.reduce((a,b)=>a+Number(b.valor||0),0));

    // AGR. SEGMENTO
    const wsSeg = baseSheet('AGR. SEGMENTO', [40, 18]);
    r = 1;
    mergeTitle(wsSeg, r++, 'CÁLCULOS POR AGRUPACIÓN - SEGMENTO', 2);
    titleRow(wsSeg, r++, ['Segmento','Importe']);
    segRows.forEach(item => {
      putText(wsSeg,r,1,item.k);
      putMoney(wsSeg,r,2,item.v);
      if(item.pending){ paint(wsSeg.getCell(r,1),'bad'); paint(wsSeg.getCell(r,2),'bad'); }
      r++;
    });
    addTotalRow(wsSeg, r, 1, 2, segRows.reduce((a,b)=>a+Number(b.v||0),0));

    // AGR. DESTINO
    const wsDest = baseSheet('AGR. DESTINO', [40, 18]);
    r = 1;
    mergeTitle(wsDest, r++, 'CÁLCULOS POR AGRUPACIÓN - DESTINO', 2);
    titleRow(wsDest, r++, ['Destino','Importe']);
    destRows.forEach(item => {
      putText(wsDest,r,1,item.k);
      putMoney(wsDest,r,2,item.v);
      if(item.pending){ paint(wsDest.getCell(r,1),'bad'); paint(wsDest.getCell(r,2),'bad'); }
      r++;
    });
    addTotalRow(wsDest, r, 1, 2, destRows.reduce((a,b)=>a+Number(b.v||0),0));

    // AGR. TIENDA-TICKET
    const wsTT = baseSheet('AGR.TIENDA-TICKET', [44, 18, 20]);
    r = 1;
    mergeTitle(wsTT, r++, 'CÁLCULOS POR AGRUPACIÓN - TIENDA Y TICKET/DONACIÓN/OTROS GASTOS', 3);
    titleRow(wsTT, r++, ['Tienda y Ticket u Otros gastos','Importe','Ticket']);
    tiendaRows.forEach(item => {
      putText(wsTT,r,1,item.k);
      putMoney(wsTT,r,2,item.v);
      putText(wsTT,r,3,'N/A');
      if(item.pending){
        for(let c=1;c<=3;c++) paint(wsTT.getCell(r,c),'bad');
      } else if(!item.donated && item.image){
        putText(wsTT,r,3,'');
        addImageToCell(wsTT, item.image || '', r, 3);
      }
      r++;
    });
    addTotalRow(wsTT, r, 1, 2, tiendaRows.reduce((a,b)=>a+Number(b.v||0),0));

    // GRAFICAS
    const wsGraf = baseSheet('GRAFICAS', [24,24,24,24]);
    mergeTitle(wsGraf, 1, 'GRÁFICAS DEL EVENTO', 4);
    addImageToCell(wsGraf, await makeChartImageDataUrl(), 3, 1);

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = excelFileName(ev);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Intercept saves that old click-handler hardcodes
  document.addEventListener('click', function(e){
    const btn = e.target.closest('button');
    if(!btn) return;
    const action = btn.dataset.action || btn.id;

    if(action === 'save-producto'){
      e.preventDefault();
      e.stopImmediatePropagation();
      const id = btn.dataset.id;
      const p = productoById(id);
      if(p){
        p.nombre = currentValuesByAction('edit-producto-nombre', id).trim();
        p.segmento = currentValuesByAction('edit-producto-segmento', id);
        p.destino = currentValuesByAction('edit-producto-destino', id);
        p.defaultPrecio = parseEuroInput(currentValuesByAction('edit-producto-precio', id) || 0);
        render();
      }
      return;
    }

    if(action === 'save-compra'){
      e.preventDefault();
      e.stopImmediatePropagation();
      const id = btn.dataset.id;
      const c = state.compras.find(x => x.id === id);
      if(c){
        c.productoId = currentValuesByAction('edit-compra-producto', id);
        c.unidades = Number(currentValuesByAction('edit-compra-unidades', id) || 0);
        c.precio = parseEuroInput(currentValuesByAction('edit-compra-precio', id) || 0);
        c.ticketDonacion = currentValuesByAction('edit-compra-ticket', id);
        c.tiendaId = currentValuesByAction('edit-compra-tienda', id);
        c.responsableId = currentValuesByAction('edit-compra-responsable', id);
        const p = productoById(c.productoId);
        if(p) p.defaultPrecio = c.precio;
        render();
      }
      return;
    }

    if(action === 'save-donacion'){
      e.preventDefault();
      e.stopImmediatePropagation();
      const id = btn.dataset.id;
      const c = state.compras.find(x => x.id === id);
      if(c){
        c.productoId = currentValuesByAction('edit-donacion-producto', id);
        c.unidades = Number(currentValuesByAction('edit-donacion-unidades', id) || 0);
        c.precio = parseEuroInput(currentValuesByAction('edit-donacion-precio', id) || 0);
        c.ticketDonacion = currentValuesByAction('edit-donacion-ticket', id);
        c.donorRef = currentValuesByAction('edit-donacion-donante', id);
        c.responsableId = currentValuesByAction('edit-donacion-responsable', id);
        render();
      }
      return;
    }
  }, true);

  // Live recalculation on add forms
  document.addEventListener('change', function(e){
    const id = e.target && e.target.id;
    if(['buyProducto','buyUnidades','buyTicket','buyPrecio'].includes(id)){
      if(isLocked()) return;
      updateBuyPreview(id === 'buyProducto');
    }
    if(['donProducto','donUnidades','donTicket','donPrecio'].includes(id)){
      if(isLocked()) return;
      updateDonationPreview(id === 'donProducto');
    }
  }, true);
  document.addEventListener('input', function(e){
    const id = e.target && e.target.id;
    if(['buyUnidades','buyPrecio'].includes(id)){
      if(isLocked()) return;
      updateBuyPreview(false);
    }
    if(['donUnidades','donPrecio'].includes(id)){
      if(isLocked()) return;
      updateDonationPreview(false);
    }
  }, true);

  ensureProductRefPrices();
  if(typeof render === 'function') render();
})();

/* ==== PATCH V14.3 ==== */
(function(){
  const $ = id => document.getElementById(id);
  const fmtMoney = v => (typeof money === 'function' ? money(Number(v||0)) : new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0)));
  const esc = v => (typeof escapeHtml === 'function' ? escapeHtml(v) : String(v??''));

  window.excelFileName = function(ev){
    const title = String(ev?.titulo || 'evento')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'').replace(/_+/g,'_') || 'evento';
    const d = new Date();
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yyyy = String(d.getFullYear());
    return `ControlEvent_v26_6_INFOEVENTO-${title}_${yyyy}${mm}${dd}.xlsx`;
  };

  window.socioResponsableOptions = function(){
    return (typeof personasGenerales === 'function' ? personasGenerales() : (state.personas||[]))
      .filter(p => String(p.rango||'').trim().toUpperCase() === 'SOCIO')
      .slice()
      .sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'))
      .map(p => ({value:p.id, label:p.nombre || ''}));
  };

  window.donorOptions = function(){
    const people = (typeof personasGenerales === 'function' ? personasGenerales() : (state.personas||[]))
      .slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'))
      .map(p => ({value:'P:'+p.id, label:p.nombre || '', kind:'persona'}));
    const stores = (typeof tiendasGenerales === 'function' ? tiendasGenerales() : (state.tiendas||[]))
      .slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'))
      .map(t => ({value:'T:'+t.id, label:t.nombre || '', kind:'tienda'}));
    return people.concat(stores);
  };

  function graphBreakdown(){
    const rows = typeof collabsForEvent === 'function' ? collabsForEvent() : [];
    const compras = typeof comprasForEvent === 'function' ? comprasForEvent() : [];
    const sum = arr => arr.reduce((a,b)=>a+Number(b||0),0);
    const incomeRows = rows.filter(r => ['Banco','Bizum','Efectivo','Pendiente'].includes(String(r.situacion||'')));
    const byGroupType = (group, type) => incomeRows
      .filter(r => (group === 'SOCIO' ? String(r.persona?.rango||'').toUpperCase()==='SOCIO' : String(r.persona?.rango||'').toUpperCase()!=='SOCIO') && String(r.situacion||'')===type)
      .reduce((a,b)=>a+Number(b.total||0),0);

    const ingSocBanco = byGroupType('SOCIO','Banco');
    const ingSocBizum = byGroupType('SOCIO','Bizum');
    const ingSocEfectivo = byGroupType('SOCIO','Efectivo');
    const ingNoSocBanco = byGroupType('NOSOCIO','Banco');
    const ingNoSocBizum = byGroupType('NOSOCIO','Bizum');
    const ingNoSocEfectivo = byGroupType('NOSOCIO','Efectivo');
    const ingPendiente = incomeRows.filter(r => String(r.situacion||'')==='Pendiente').reduce((a,b)=>a+Number(b.total||0),0);
    const ingRealizados = ingSocBanco + ingSocBizum + ingSocEfectivo + ingNoSocBanco + ingNoSocBizum + ingNoSocEfectivo;
    const ingTotal = ingRealizados + ingPendiente;

    const donSocios = compras.filter(c => String(c.ticketDonacion||'') === 'DONADO SOCIO').reduce((a,b)=>a+Number(b.valor||0),0);
    const donNoSocios = compras.filter(c => String(c.ticketDonacion||'') === 'DONADO OTROS').reduce((a,b)=>a+Number(b.valor||0),0);
    const donTiendas = compras.filter(c => String(c.ticketDonacion||'') === 'DONADO TIENDA').reduce((a,b)=>a+Number(b.valor||0),0);
    const donTotal = donSocios + donNoSocios + donTiendas;

    const gastosTk = compras.filter(c => !isDonationTicket(c.ticketDonacion) && !isCurrentExpenseTicket(c.ticketDonacion) && String(c.ticketDonacion||'').trim() !== '').reduce((a,b)=>a+Number(b.valor||0),0);
    const gastosCorr = compras.filter(c => isCurrentExpenseTicket(c.ticketDonacion)).reduce((a,b)=>a+Number(b.valor||0),0);
    const gastosPend = compras.filter(c => !isDonationTicket(c.ticketDonacion) && String(c.ticketDonacion||'').trim() === '').reduce((a,b)=>a+Number(b.valor||0),0);
    const gastosReal = gastosTk + gastosCorr;
    const gastosTotal = gastosReal + gastosPend;

    const saldoTotal = ingTotal - gastosTotal;
    const saldoReal = ingRealizados - gastosReal;

    return {
      ingresos:{
        total: ingTotal,
        realizados: ingRealizados,
        pendiente: ingPendiente,
        segs:[
          {key:'soc_banco', label:'Ingresado SOCIOS - Banco', value:ingSocBanco, color:'#2563eb'},
          {key:'soc_bizum', label:'Ingresado SOCIOS - Bizum', value:ingSocBizum, color:'#60a5fa'},
          {key:'soc_efectivo', label:'Ingresado SOCIOS - Efectivo', value:ingSocEfectivo, color:'#93c5fd'},
          {key:'nosoc_banco', label:'Ingresado NO SOCIOS - Banco', value:ingNoSocBanco, color:'#16a34a'},
          {key:'nosoc_bizum', label:'Ingresado NO SOCIOS - Bizum', value:ingNoSocBizum, color:'#4ade80'},
          {key:'nosoc_efectivo', label:'Ingresado NO SOCIOS - Efectivo', value:ingNoSocEfectivo, color:'#86efac'},
          {key:'pendiente', label:'Pendiente de ingresar', value:ingPendiente, color:'#f59e0b'}
        ]
      },
      donaciones:{
        total: donTotal,
        segs:[
          {key:'socios', label:'Donado por SOCIOS', value:donSocios, color:'#f59e0b'},
          {key:'nosocios', label:'Donado por NO SOCIOS', value:donNoSocios, color:'#fbbf24'},
          {key:'tiendas', label:'Donado por TIENDAS', value:donTiendas, color:'#fcd34d'}
        ]
      },
      gastos:{
        total: gastosTotal,
        realizados: gastosReal,
        pendiente: gastosPend,
        segs:[
          {key:'tk', label:'Gastado en TKxx', value:gastosTk, color:'#dc2626'},
          {key:'corr', label:'GASTOS CORRIENTES', value:gastosCorr, color:'#f87171'},
          {key:'pend', label:'Pendiente de comprar', value:gastosPend, color:'#fb7185'}
        ]
      },
      saldo:{
        total: saldoTotal,
        realizado: saldoReal,
        segs:[
          {key:'saldo_real', label:'Saldo realizado (ingresos realizados - gastos realizados)', value:Math.abs(saldoReal), color:saldoReal>=0 ? '#0f766e' : '#7f1d1d'}
        ]
      }
    };
  }

  function graphMax(g){
    return Math.max(1,
      g.ingresos.total,
      g.donaciones.total,
      g.gastos.total,
      Math.abs(g.saldo.total),
      Math.abs(g.saldo.realizado)
    );
  }

  function labelHtml(text, total){
    return `<div class="chart-label" style="display:flex;justify-content:space-between;gap:10px;align-items:center"><span>${esc(text)}</span><strong>${esc(fmtMoney(total))}</strong></div>`;
  }

  window.renderGraficas = function(){
    const wrap = $('eventChartWrap');
    if(!wrap) return;
    const g = graphBreakdown();
    const maxVal = graphMax(g);
    const seg = (item) => {
      const w = (Math.max(0, Number(item.value || 0)) / maxVal) * 100;
      return `<div class="chart-seg" title="${esc(item.label + ': ' + fmtMoney(item.value))}" style="width:${w}%;background:${item.color};"></div>`;
    };
    const row = (title, total, segs, center) => `
      <div class="chart-row">
        ${labelHtml(title,total)}
        <div class="chart-track">
          ${segs.filter(s => Number(s.value||0) > 0).map(seg).join('')}
          <div class="chart-center-value">${esc(fmtMoney(center))}</div>
        </div>
      </div>`;
    wrap.innerHTML = `<div class="chart-shell"><div class="chart-bars">
      ${row('INGRESOS EN DINERO', g.ingresos.total, g.ingresos.segs, g.ingresos.total)}
      ${row('DONACIÓN DE PRODUCTO', g.donaciones.total, g.donaciones.segs, g.donaciones.total)}
      ${row('GASTOS', g.gastos.total, g.gastos.segs, g.gastos.total)}
      ${row('SALDO OPERATIVO', g.saldo.total, g.saldo.segs, g.saldo.realizado)}
    </div></div>`;
  };

  window.makeChartImageDataUrl = async function(){
    const g = graphBreakdown();
    const maxVal = graphMax(g);
    const canvas = document.createElement('canvas');
    canvas.width = 1220; canvas.height = 560;
    const ctx = canvas.getContext('2d');
    const fmt = v => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0));
    const rr = (x,y,w,h,r,color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x+r,y);
      ctx.arcTo(x+w,y,x+w,y+h,r);
      ctx.arcTo(x+w,y+h,x,y+h,r);
      ctx.arcTo(x,y+h,x,y,r);
      ctx.arcTo(x,y,x+w,y,r);
      ctx.closePath();
      ctx.fill();
    };
    const drawRow = (y,title,total,segs,center) => {
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 20px Arial';
      ctx.fillText(title, 40, y+24);
      ctx.textAlign = 'right';
      ctx.fillText(fmt(total), 335, y+24);
      ctx.textAlign = 'left';
      rr(360,y,820,38,19,'#f3f4f6');
      let x = 360;
      segs.filter(s => Number(s.value||0) > 0).forEach(s => {
        const w = (Math.max(0, Number(s.value||0)) / maxVal) * 820;
        if(w <= 0) return;
        rr(x,y,w,38,19,s.color);
        x += w;
      });
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 17px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(fmt(center), 770, y+25);
      ctx.textAlign = 'left';
    };
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 28px Arial';
    ctx.fillText('GRÁFICAS DEL EVENTO', 40, 42);
    let y = 92;
    drawRow(y,'INGRESOS EN DINERO',g.ingresos.total,g.ingresos.segs,g.ingresos.total); y += 108;
    drawRow(y,'DONACIÓN DE PRODUCTO',g.donaciones.total,g.donaciones.segs,g.donaciones.total); y += 108;
    drawRow(y,'GASTOS',g.gastos.total,g.gastos.segs,g.gastos.total); y += 108;
    drawRow(y,'SALDO OPERATIVO',g.saldo.total,g.saldo.segs,g.saldo.realizado);
    return canvas.toDataURL('image/png');
  };

  document.addEventListener('click', function(e){
    const btn = e.target.closest('button');
    if(!btn) return;
    const action = btn.dataset.action || btn.id;
    if(action === 'save-compra'){
      const id = btn.dataset.id, c = (state.compras||[]).find(x => x.id === id);
      if(c){
        c.productoId = currentValuesByAction('edit-compra-producto', id);
        c.unidades = Number(currentValuesByAction('edit-compra-unidades', id) || 0);
        c.precio = parseEuroInput(currentValuesByAction('edit-compra-precio', id) || 0);
        c.ticketDonacion = currentValuesByAction('edit-compra-ticket', id);
        c.tiendaId = currentValuesByAction('edit-compra-tienda', id);
        c.responsableId = currentValuesByAction('edit-compra-responsable', id);
        const p = typeof productoById === 'function' ? productoById(c.productoId) : null;
        if(p) p.defaultPrecio = c.precio;
        if(typeof render === 'function') render();
      }
    }
  }, true);

  if(typeof render === 'function') render();
})();


/* ==== PATCH V14.3 CORREGIDA ==== */
(function(){
  const moneyFmt = (v) => (typeof moneyTextV === 'function' ? moneyTextV(v) : (typeof money === 'function' ? money(v) : String(v)));
  const esc = (v) => (typeof escapeHtml === 'function' ? escapeHtml(v) : String(v ?? ''));
  const $id = (id) => document.getElementById(id);

  // 1) En COMPRAS, desplegable Tienda con toda la tabla TIENDAS
  if(typeof renderMainSelectors === 'function'){
    const prevRenderMainSelectors = renderMainSelectors;
    renderMainSelectors = function(){
      prevRenderMainSelectors();
      const buyTienda = $id('buyTienda');
      if(buyTienda){
        const tiendas = (typeof tiendasGenerales === 'function' ? tiendasGenerales() : (state.tiendas || []))
          .slice()
          .sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
        buyTienda.innerHTML =
          '<option value="" selected>Busca tienda.....</option>' +
          tiendas.map(t => `<option value="${t.id}">${esc(t.nombre)}</option>`).join('');
      }
    };
  }

  function graphDataV143(){
    const collabs = (typeof collabsForEvent === 'function' ? collabsForEvent() : []);
    const compras = (typeof comprasForEvent === 'function' ? comprasForEvent() : []);

    const sum = (arr, fn) => arr.reduce((a,b) => a + Number(fn(b) || 0), 0);

    const incomes = {
      socioBanco: sum(collabs, r => r.persona?.rango === 'SOCIO' && r.situacion === 'Banco' ? r.total : 0),
      socioBizum: sum(collabs, r => r.persona?.rango === 'SOCIO' && r.situacion === 'Bizum' ? r.total : 0),
      socioEfectivo: sum(collabs, r => r.persona?.rango === 'SOCIO' && r.situacion === 'Efectivo' ? r.total : 0),
      noSocioBanco: sum(collabs, r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Banco' ? r.total : 0),
      noSocioBizum: sum(collabs, r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Bizum' ? r.total : 0),
      noSocioEfectivo: sum(collabs, r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Efectivo' ? r.total : 0),
      pendiente: sum(collabs, r => r.situacion === 'Pendiente' ? r.total : 0),
    };
    incomes.total =
      incomes.socioBanco + incomes.socioBizum + incomes.socioEfectivo +
      incomes.noSocioBanco + incomes.noSocioBizum + incomes.noSocioEfectivo +
      incomes.pendiente;
    incomes.realizado =
      incomes.socioBanco + incomes.socioBizum + incomes.socioEfectivo +
      incomes.noSocioBanco + incomes.noSocioBizum + incomes.noSocioEfectivo;

    const donations = {
      socios: sum(compras, r => r.ticketDonacion === 'DONADO SOCIO' ? r.valor : 0),
      noSocios: sum(compras, r => r.ticketDonacion === 'DONADO OTROS' ? r.valor : 0),
      tiendas: sum(compras, r => r.ticketDonacion === 'DONADO TIENDA' ? r.valor : 0),
    };
    donations.total = donations.socios + donations.noSocios + donations.tiendas;

    const expenses = {
      tk: sum(compras, r => !isDonationTicket(r.ticketDonacion) && !isCurrentExpenseTicket(r.ticketDonacion) && String(r.ticketDonacion || '').trim() !== '' ? r.valor : 0),
      corrientes: sum(compras, r => isCurrentExpenseTicket(r.ticketDonacion) ? r.valor : 0),
      pendiente: sum(compras, r => !isDonationTicket(r.ticketDonacion) && String(r.ticketDonacion || '').trim() === '' ? r.valor : 0),
    };
    expenses.total = expenses.tk + expenses.corrientes + expenses.pendiente;
    expenses.realizado = expenses.tk + expenses.corrientes;

    const saldo = {
      total: incomes.total - expenses.total,
      realizado: incomes.realizado - expenses.realizado
    };

    return { incomes, donations, expenses, saldo };
  }

  graphData = graphDataV143;

  function buildLegendHtml(items){
    return `<div class="chart-note" style="display:flex;flex-wrap:wrap;gap:10px 16px;margin-top:8px">` +
      items.filter(x => Number(x.value || 0) !== 0).map(x =>
        `<span><span class="legend-dot" style="background:${x.color}"></span>${esc(x.label)}: ${esc(moneyFmt(x.value))}</span>`
      ).join('') +
      `</div>`;
  }

  renderGraphOnly = function(){
    const wrap = $id('eventChartWrap');
    if(!wrap) return;
    const g = graphDataV143();
    const maxVal = Math.max(
      1,
      g.incomes.total,
      g.donations.total,
      g.expenses.total,
      Math.abs(g.saldo.realizado)
    );
    const seg = (value, color, title) => {
      const w = (Math.max(0, Number(value || 0)) / maxVal) * 100;
      return `<div class="chart-seg" title="${esc(title)}" style="width:${w}%;background:${color};"></div>`;
    };

    const incomeItems = [
      {label:'Socios Banco', value:g.incomes.socioBanco, color:'#2563eb'},
      {label:'Socios Bizum', value:g.incomes.socioBizum, color:'#16a34a'},
      {label:'Socios Efectivo', value:g.incomes.socioEfectivo, color:'#84cc16'},
      {label:'No socios Banco', value:g.incomes.noSocioBanco, color:'#60a5fa'},
      {label:'No socios Bizum', value:g.incomes.noSocioBizum, color:'#34d399'},
      {label:'No socios Efectivo', value:g.incomes.noSocioEfectivo, color:'#bef264'},
      {label:'Pendiente de ingresar', value:g.incomes.pendiente, color:'#f59e0b'}
    ];
    const donationItems = [
      {label:'Donado por socios', value:g.donations.socios, color:'#f59e0b'},
      {label:'Donado por no socios', value:g.donations.noSocios, color:'#b45309'},
      {label:'Donado por tiendas', value:g.donations.tiendas, color:'#fcd34d'}
    ];
    const expenseItems = [
      {label:'Gastado en TKxx', value:g.expenses.tk, color:'#dc2626'},
      {label:'Gastos corrientes', value:g.expenses.corrientes, color:'#ef4444'},
      {label:'Pendiente de comprar', value:g.expenses.pendiente, color:'#fb7185'}
    ];
    const saldoItems = [
      {label:'Saldo realizado', value:Math.abs(g.saldo.realizado), color:g.saldo.realizado >= 0 ? '#0f766e' : '#b91c1c'}
    ];

    wrap.innerHTML = `
      <div class="chart-shell">
        <div class="chart-bars">
          <div class="chart-row">
            <div class="chart-label">INGRESOS EN DINERO: ${esc(moneyFmt(g.incomes.total))}</div>
            <div>
              <div class="chart-track">
                ${incomeItems.map(x => seg(x.value, x.color, x.label + ': ' + moneyFmt(x.value))).join('')}
              </div>
              ${buildLegendHtml(incomeItems)}
            </div>
          </div>
          <div class="chart-row">
            <div class="chart-label">DONACIÓN DE PRODUCTO: ${esc(moneyFmt(g.donations.total))}</div>
            <div>
              <div class="chart-track">
                ${donationItems.map(x => seg(x.value, x.color, x.label + ': ' + moneyFmt(x.value))).join('')}
              </div>
              ${buildLegendHtml(donationItems)}
            </div>
          </div>
          <div class="chart-row">
            <div class="chart-label">GASTOS: ${esc(moneyFmt(g.expenses.total))}</div>
            <div>
              <div class="chart-track">
                ${expenseItems.map(x => seg(x.value, x.color, x.label + ': ' + moneyFmt(x.value))).join('')}
              </div>
              ${buildLegendHtml(expenseItems)}
            </div>
          </div>
          <div class="chart-row">
            <div class="chart-label">SALDO OPERATIVO: ${esc(moneyFmt(g.saldo.total))}</div>
            <div>
              <div class="chart-track">
                ${saldoItems.map(x => seg(x.value, x.color, x.label + ': ' + moneyFmt(g.saldo.realizado))).join('')}
              </div>
              ${buildLegendHtml([{label:'Saldo realizado (ingresos realizados – gastos realizados)', value:g.saldo.realizado, color:saldoItems[0].color}])}
            </div>
          </div>
        </div>
      </div>`;
  };

  makeChartImageDataUrl = async function(){
    const canvas = document.createElement('canvas');
    canvas.width = 1180;
    canvas.height = 760;
    const ctx = canvas.getContext('2d');
    const g = graphDataV143();
    const maxVal = Math.max(1, g.incomes.total, g.donations.total, g.expenses.total, Math.abs(g.saldo.realizado));
    const fmt = v => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0));

    const rows = [
      {
        label:`INGRESOS EN DINERO: ${fmt(g.incomes.total)}`,
        items:[
          {label:'Socios Banco', value:g.incomes.socioBanco, color:'#2563eb'},
          {label:'Socios Bizum', value:g.incomes.socioBizum, color:'#16a34a'},
          {label:'Socios Efectivo', value:g.incomes.socioEfectivo, color:'#84cc16'},
          {label:'No socios Banco', value:g.incomes.noSocioBanco, color:'#60a5fa'},
          {label:'No socios Bizum', value:g.incomes.noSocioBizum, color:'#34d399'},
          {label:'No socios Efectivo', value:g.incomes.noSocioEfectivo, color:'#bef264'},
          {label:'Pendiente de ingresar', value:g.incomes.pendiente, color:'#f59e0b'}
        ]
      },
      {
        label:`DONACIÓN DE PRODUCTO: ${fmt(g.donations.total)}`,
        items:[
          {label:'Donado por socios', value:g.donations.socios, color:'#f59e0b'},
          {label:'Donado por no socios', value:g.donations.noSocios, color:'#b45309'},
          {label:'Donado por tiendas', value:g.donations.tiendas, color:'#fcd34d'}
        ]
      },
      {
        label:`GASTOS: ${fmt(g.expenses.total)}`,
        items:[
          {label:'Gastado en TKxx', value:g.expenses.tk, color:'#dc2626'},
          {label:'Gastos corrientes', value:g.expenses.corrientes, color:'#ef4444'},
          {label:'Pendiente de comprar', value:g.expenses.pendiente, color:'#fb7185'}
        ]
      },
      {
        label:`SALDO OPERATIVO: ${fmt(g.saldo.total)}`,
        items:[
          {label:'Saldo realizado (ingresos realizados – gastos realizados)', value:Math.abs(g.saldo.realizado), color:g.saldo.realizado >= 0 ? '#0f766e' : '#b91c1c'}
        ]
      }
    ];

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

    function drawLegendItems(items, startX, startY, maxWidth){
      ctx.font = '15px Arial';
      let x = startX, y = startY, rowH = 22;
      items.filter(it => Number(it.value || 0) !== 0).forEach(it => {
        const text = `${it.label}: ${fmt(it.value)}`;
        const textW = ctx.measureText(text).width;
        const itemW = 18 + textW + 18;
        if(x + itemW > startX + maxWidth){
          x = startX;
          y += rowH;
        }
        ctx.fillStyle = it.color;
        ctx.fillRect(x, y-11, 12, 12);
        ctx.fillStyle = '#334155';
        ctx.fillText(text, x + 18, y);
        x += itemW;
      });
      return y;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 28px Arial';
    ctx.fillText('GRÁFICAS DEL EVENTO', 40, 42);

    let y = 84;
    rows.forEach(row => {
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 20px Arial';
      ctx.fillText(row.label, 40, y + 20);

      rr(320, y, 800, 40, 20, '#f3f4f6');
      let x = 320;
      row.items.forEach(it => {
        const w = (Math.max(0, Number(it.value || 0)) / maxVal) * 800;
        if(w <= 0) return;
        rr(x, y, w, 40, 20, it.color);
        x += w;
      });

      y = drawLegendItems(row.items, 320, y + 66, 800) + 34;
    });

    return canvas.toDataURL('image/png');
  };

  // Refresca la gráfica con la nueva estructura
  if(typeof renderGraficas === 'function'){
    renderGraficas = function(){ renderGraphOnly(); };
  }
})();
