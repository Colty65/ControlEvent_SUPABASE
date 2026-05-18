/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #13. */
/* ==== V16.0 PATCH FINAL ==== */
(function(){
  const $ = id => document.getElementById(id);
  const esc = v => (typeof escapeHtml === 'function' ? escapeHtml(v) : String(v ?? ''));
  const moneyF = v => (typeof money === 'function' ? money(Number(v || 0)) : new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0)));
  const euroF = v => (typeof euroInputValue === 'function' ? euroInputValue(Number(v || 0)) : moneyF(v));
  const parseEuro = v => (typeof parseEuroInput === 'function' ? parseEuroInput(v) : Number(v || 0));

  function allPersons(){ return (typeof personasGenerales === 'function' ? personasGenerales() : (state.personas || [])).slice(); }
  function allTiendas(){ return (typeof tiendasGenerales === 'function' ? tiendasGenerales() : (state.tiendas || [])).slice(); }
  function allSocios(){ return allPersons().filter(p => String(p.rango || '').trim().toUpperCase() === 'SOCIO'); }

  function donorName(c){
    try{
      if(c?.donorLabel && String(c.donorLabel).trim()) return String(c.donorLabel).trim();
      if(c?.donorRef && String(c.donorRef).trim()){
        const raw = String(c.donorRef).trim();
        if(!raw.startsWith('P:') && !raw.startsWith('T:')) return raw;
        if(typeof donorLabel === 'function'){
          const d = donorLabel(raw);
          if(d && String(d).trim()) return String(d).trim();
        }
      }
      if(c?.tiendaId && typeof tiendaById === 'function'){
        const t = tiendaById(c.tiendaId);
        if(t?.nombre && String(t.nombre).trim()) return String(t.nombre).trim();
      }
      if(c?.tienda?.nombre && String(c.tienda.nombre).trim()) return String(c.tienda.nombre).trim();
    }catch(_){}
    return '';
  }

  function listTitle(items, emptyText='Sin elementos'){
    const arr = (items || []).filter(Boolean);
    return arr.length ? arr.join('\n') : emptyText;
  }

  function collabItemsFor(filterFn){
    return (typeof collabsForEvent === 'function' ? collabsForEvent() : [])
      .filter(filterFn)
      .map(r => `${r.persona?.nombre || 'Sin nombre'} — ${moneyF(r.total || 0)}`);
  }

  function donationItemsFor(ticketCode){
    return (typeof comprasForEvent === 'function' ? comprasForEvent() : [])
      .filter(r => String(r.ticketDonacion || '').trim() === ticketCode)
      .map(r => `${donorName(r) || 'Sin tienda'} — ${r.producto?.nombre || 'Producto'} — ${moneyF(r.valor || 0)}`);
  }

  function graphDataV160(){
    const rows = (typeof collabsForEvent === 'function' ? collabsForEvent() : []);
    const compras = (typeof comprasForEvent === 'function' ? comprasForEvent() : []);
    const sum = arr => arr.reduce((a,b) => a + Number(b || 0), 0);

    const incomes = {
      socioBanco: sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Banco').map(r => r.total)),
      socioBizum: sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Bizum').map(r => r.total)),
      socioEfectivo: sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Efectivo').map(r => r.total)),
      noSocioBanco: sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Banco').map(r => r.total)),
      noSocioBizum: sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Bizum').map(r => r.total)),
      noSocioEfectivo: sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Efectivo').map(r => r.total)),
      pendiente: sum(rows.filter(r => r.situacion === 'Pendiente').map(r => r.total)),
    };
    incomes.total = incomes.socioBanco + incomes.socioBizum + incomes.socioEfectivo + incomes.noSocioBanco + incomes.noSocioBizum + incomes.noSocioEfectivo + incomes.pendiente;
    incomes.realizado = incomes.total - incomes.pendiente;

    const donations = {
      tiendas: sum(compras.filter(r => String(r.ticketDonacion || '').trim() === 'DONADO TIENDA').map(r => r.valor)),
      socios: sum(compras.filter(r => String(r.ticketDonacion || '').trim() === 'DONADO SOCIO').map(r => r.valor)),
      noSocios: sum(compras.filter(r => String(r.ticketDonacion || '').trim() === 'DONADO OTROS').map(r => r.valor)),
    };
    donations.total = donations.tiendas + donations.socios + donations.noSocios;

    const expenses = {
      tk: sum(compras.filter(r => !isDonationTicket(r.ticketDonacion) && !isCurrentExpenseTicket(r.ticketDonacion) && String(r.ticketDonacion || '').trim() !== '').map(r => r.valor)),
      corrientes: sum(compras.filter(r => isCurrentExpenseTicket(r.ticketDonacion)).map(r => r.valor)),
      pendiente: sum(compras.filter(r => !isDonationTicket(r.ticketDonacion) && String(r.ticketDonacion || '').trim() === '').map(r => r.valor)),
    };
    expenses.total = expenses.tk + expenses.corrientes + expenses.pendiente;
    expenses.realizado = expenses.tk + expenses.corrientes;

    const saldoActual = incomes.realizado - expenses.realizado;
    const saldoOperativo = incomes.total - expenses.total;

    return { incomes, donations, expenses, saldoActual, saldoOperativo };
  }
  window.graphDataV160 = graphDataV160;

  budgetSummary = function(){
    const rows = (typeof collabsForEvent === 'function' ? collabsForEvent() : []);
    const compras = (typeof comprasForEvent === 'function' ? comprasForEvent() : []);
    const sociosRows = rows.filter(r => r.persona?.rango === 'SOCIO');
    const noSociosRows = rows.filter(r => r.persona?.rango !== 'SOCIO');

    const sumNum = arr => arr.reduce((a,b) => a + Number(b.numero || 0), 0);
    const sumTotal = arr => arr.reduce((a,b) => a + Number(b.total || 0), 0);
    const paidTotal = arr => arr.filter(r => r.situacion !== 'Pendiente').reduce((a,b) => a + Number(b.total || 0), 0);
    const pendingTotal = arr => arr.filter(r => r.situacion === 'Pendiente').reduce((a,b) => a + Number(b.total || 0), 0);

    const socios = {
      count: sumNum(sociosRows),
      importe: sumTotal(sociosRows),
      ingresado: paidTotal(sociosRows),
      pendiente: pendingTotal(sociosRows),
      listImporte: collabItemsFor(r => r.persona?.rango === 'SOCIO'),
      listIngresado: collabItemsFor(r => r.persona?.rango === 'SOCIO' && r.situacion !== 'Pendiente'),
      listPendiente: collabItemsFor(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Pendiente'),
    };
    const noSocios = {
      count: sumNum(noSociosRows),
      importe: sumTotal(noSociosRows),
      ingresado: paidTotal(noSociosRows),
      pendiente: pendingTotal(noSociosRows),
      listImporte: collabItemsFor(r => r.persona?.rango !== 'SOCIO'),
      listIngresado: collabItemsFor(r => r.persona?.rango !== 'SOCIO' && r.situacion !== 'Pendiente'),
      listPendiente: collabItemsFor(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Pendiente'),
    };

    const gastoCompras = compras.filter(c => !isDonationTicket(c.ticketDonacion) && !isCurrentExpenseTicket(c.ticketDonacion) && String(c.ticketDonacion || '').trim() !== '').reduce((a,b)=>a+Number(b.valor||0),0);
    const gastosOrganizacion = compras.filter(c => isCurrentExpenseTicket(c.ticketDonacion)).reduce((a,b)=>a+Number(b.valor||0),0);
    const pendiente = compras.filter(c => !isDonationTicket(c.ticketDonacion) && String(c.ticketDonacion || '').trim() === '').reduce((a,b)=>a+Number(b.valor||0),0);

    const donacionProducto = {
      donadoTienda: compras.filter(c => String(c.ticketDonacion || '').trim() === 'DONADO TIENDA').reduce((a,b)=>a+Number(b.valor||0),0),
      donadoSocio: compras.filter(c => String(c.ticketDonacion || '').trim() === 'DONADO SOCIO').reduce((a,b)=>a+Number(b.valor||0),0),
      donadoOtros: compras.filter(c => String(c.ticketDonacion || '').trim() === 'DONADO OTROS').reduce((a,b)=>a+Number(b.valor||0),0),
      listTiendas: donationItemsFor('DONADO TIENDA'),
      listSocios: donationItemsFor('DONADO SOCIO'),
      listNoSocios: donationItemsFor('DONADO OTROS'),
    };
    donacionProducto.valorDonado = donacionProducto.donadoTienda + donacionProducto.donadoSocio + donacionProducto.donadoOtros;

    const ingresosTotal = socios.importe + noSocios.importe;
    const ingresosRealizados = socios.ingresado + noSocios.ingresado;
    const gastosTotal = gastoCompras + gastosOrganizacion + pendiente;
    const gastosRealizados = gastoCompras + gastosOrganizacion;

    return {
      ingresosDinero: { socios, noSocios, donantes:noSocios, totalIngresado: ingresosRealizados, totalComprometido: ingresosTotal, pendiente: socios.pendiente + noSocios.pendiente },
      donacionProducto,
      operativa: {
        ingresos: ingresosTotal,
        ingresoDinero: ingresosRealizados,
        gastoCompras,
        gastosOrganizacion,
        pendiente,
        saldoActual: ingresosRealizados - gastosRealizados,
        saldoOperativo: ingresosTotal - gastosTotal
      }
    };
  };

  function buildLegendHtml(items){
    return `<div class="chart-note" style="display:flex;flex-wrap:wrap;gap:10px 16px;margin-top:8px">` +
      items.filter(x => Number(x.value || 0) !== 0).map(x => `<span><span class="legend-dot" style="background:${x.color}"></span>${esc(x.label)}: ${esc(moneyF(x.value))}</span>`).join('') +
      `</div>`;
  }

  function renderGraphOnlyV160(){
    const wrap = $('eventChartWrap');
    if(!wrap) return;
    const g = graphDataV160();
    const maxVal = Math.max(1, g.incomes.total, g.donations.total, g.expenses.total, Math.abs(g.saldoActual), Math.abs(g.saldoOperativo));
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
      {label:'Donado por tiendas', value:g.donations.tiendas, color:'#fcd34d'},
      {label:'Donado por socios', value:g.donations.socios, color:'#f59e0b'},
      {label:'Donado por no socios', value:g.donations.noSocios, color:'#b45309'}
    ];
    const expenseItems = [
      {label:'Gastado en TKxx', value:g.expenses.tk, color:'#dc2626'},
      {label:'Gastos corrientes', value:g.expenses.corrientes, color:'#ef4444'},
      {label:'Pte. Compra u otros gastos', value:g.expenses.pendiente, color:'#fb7185'}
    ];
    const saldoActualItems = [{label:'Saldo actual (ingresos realizados – gastos realizados)', value:Math.abs(g.saldoActual), color:g.saldoActual >= 0 ? '#0f766e' : '#b91c1c'}];
    const saldoOperativoItems = [{label:'Saldo operativo (ingresos – gastos)', value:Math.abs(g.saldoOperativo), color:g.saldoOperativo >= 0 ? '#155e75' : '#7f1d1d'}];

    wrap.innerHTML = `
      <div class="chart-shell">
        <div class="chart-bars">
          <div class="chart-row">
            <div class="chart-label">INGRESOS: ${esc(moneyF(g.incomes.total))}</div>
            <div><div class="chart-track">${incomeItems.map(x => seg(x.value, x.color, x.label + ': ' + moneyF(x.value))).join('')}</div>${buildLegendHtml(incomeItems)}</div>
          </div>
          <div class="chart-row">
            <div class="chart-label">DONACIÓN DE PRODUCTO: ${esc(moneyF(g.donations.total))}</div>
            <div><div class="chart-track">${donationItems.map(x => seg(x.value, x.color, x.label + ': ' + moneyF(x.value))).join('')}</div>${buildLegendHtml(donationItems)}</div>
          </div>
          <div class="chart-row">
            <div class="chart-label">GASTOS: ${esc(moneyF(g.expenses.total))}</div>
            <div><div class="chart-track">${expenseItems.map(x => seg(x.value, x.color, x.label + ': ' + moneyF(x.value))).join('')}</div>${buildLegendHtml(expenseItems)}</div>
          </div>
          <div class="chart-row">
            <div class="chart-label">SALDO ACTUAL: ${esc(moneyF(g.saldoActual))}</div>
            <div><div class="chart-track">${saldoActualItems.map(x => seg(x.value, x.color, x.label + ': ' + moneyF(g.saldoActual))).join('')}</div>${buildLegendHtml([{label:'Saldo actual', value:g.saldoActual, color:saldoActualItems[0].color}])}</div>
          </div>
          <div class="chart-row">
            <div class="chart-label">SALDO OPERATIVO: ${esc(moneyF(g.saldoOperativo))}</div>
            <div><div class="chart-track">${saldoOperativoItems.map(x => seg(x.value, x.color, x.label + ': ' + moneyF(g.saldoOperativo))).join('')}</div>${buildLegendHtml([{label:'Saldo operativo', value:g.saldoOperativo, color:saldoOperativoItems[0].color}])}</div>
          </div>
        </div>
      </div>`;
  }
  renderGraficas = function(){ renderGraphOnlyV160(); };

  function groupedBreakdown(kind){
    const compras = (typeof comprasForEvent === 'function' ? comprasForEvent() : []);
    const keys = kind === 'segmento' ? (typeof SEGMENT_OPTIONS !== 'undefined' ? SEGMENT_OPTIONS : []) : (typeof DESTINO_OPTIONS !== 'undefined' ? DESTINO_OPTIONS : []);
    return keys.map(k => {
      const match = c => String(kind === 'segmento' ? (c.producto?.segmento || '') : (c.producto?.destino || '')) === k;
      const comprado = compras.filter(c => match(c) && !isDonationTicket(c.ticketDonacion) && String(c.ticketDonacion || '').trim() !== '').reduce((a,b)=>a+Number(b.valor||0),0);
      const donado = compras.filter(c => match(c) && isDonationTicket(c.ticketDonacion)).reduce((a,b)=>a+Number(b.valor||0),0);
      const pendiente = compras.filter(c => match(c) && !isDonationTicket(c.ticketDonacion) && String(c.ticketDonacion || '').trim() === '').reduce((a,b)=>a+Number(b.valor||0),0);
      return {label:k, comprado, donado, pendiente, total: comprado + donado + pendiente};
    });
  }
  summaryBySegmento = function(){ return groupedBreakdown('segmento'); };
  summaryByDestino = function(){ return groupedBreakdown('destino'); };

  renderSummaryList = function(targetId, rows){
    const wrap = $(targetId);
    if(!wrap) return;
    wrap.innerHTML = '';

    if(targetId === 'summarySegmento' || targetId === 'summaryDestino'){
      const maxVal = Math.max(1, ...rows.flatMap(r => [Number(r.comprado||0), Number(r.donado||0), Number(r.pendiente||0)]));
      const totalGeneral = rows.reduce((a,b)=>a+Number(b.total||0),0);

      const title = targetId === 'summarySegmento' ? 'Por segmento' : 'Por destino';
      const head = document.createElement('div');
      head.className = 'vbars-wrap';
      head.innerHTML = `
        <div class="vbars-total">${title} · TOTAL GENERAL: ${esc(moneyF(totalGeneral))}</div>
        <div class="chart-note"><span><span class="legend-dot" style="background:#dc2626"></span>Comprado</span> <span><span class="legend-dot" style="background:#f59e0b"></span>Donado</span> <span><span class="legend-dot" style="background:#fb7185"></span>Pte. Compra u otros gastos</span></div>
      `;
      wrap.appendChild(head);

      const grid = document.createElement('div');
      grid.className = 'vbars-grid';
      rows.forEach(r => {
        const card = document.createElement('div');
        card.className = 'vbars-card';
        const h1 = Math.max(8, (Number(r.comprado||0) / maxVal) * 170);
        const h2 = Math.max(8, (Number(r.donado||0) / maxVal) * 170);
        const h3 = Math.max(8, (Number(r.pendiente||0) / maxVal) * 170);
        card.innerHTML = `
          <div class="vbars-title">${esc(r.label)} · ${esc(moneyF(r.total))}</div>
          <div class="vbars-chart">
            <div class="vbar-col" title="Comprado: ${esc(moneyF(r.comprado))}">
              <div class="vbar-value">${esc(moneyF(r.comprado))}</div>
              <div class="vbar-stick" style="height:${h1}px;background:#dc2626"></div>
              <div class="vbar-label">Comprado</div>
            </div>
            <div class="vbar-col" title="Donado: ${esc(moneyF(r.donado))}">
              <div class="vbar-value">${esc(moneyF(r.donado))}</div>
              <div class="vbar-stick" style="height:${h2}px;background:#f59e0b"></div>
              <div class="vbar-label">Donado</div>
            </div>
            <div class="vbar-col" title="Pte. Compra u otros gastos: ${esc(moneyF(r.pendiente))}">
              <div class="vbar-value">${esc(moneyF(r.pendiente))}</div>
              <div class="vbar-stick" style="height:${h3}px;background:#fb7185"></div>
              <div class="vbar-label">Pte. Compra u otros gastos</div>
            </div>
          </div>
        `;
        grid.appendChild(card);
      });
      wrap.appendChild(grid);
      return;
    }

    if(targetId === 'summaryTiendaTicket'){
      const tools = document.createElement('div');
      tools.className = 'hint';
      tools.innerHTML = 'Ordenar por: <a href="#" onclick="state.summaryTiendaSort=\'tienda\'; renderBudget(); return false;">Tienda</a> · <a href="#" onclick="state.summaryTiendaSort=\'ticket\'; renderBudget(); return false;">Ticket</a>';
      wrap.appendChild(tools);
    }

    if(!rows.length){
      const empty = document.createElement('div');
      empty.className = 'hint';
      empty.textContent = 'Sin datos.';
      wrap.appendChild(empty);
      return;
    }

    let total = 0;
    rows.forEach((r, idx) => {
      total += Number(r.v || 0);
      const div = document.createElement('div');
      div.className = 'summary-item';
      if(r.pending) div.classList.add('red-row');
      const amountHtml = `<span class="pill"${r.pending ? ' style="background:#fef2f2;color:#b91c1c"' : (r.donated ? ' style="text-decoration:line-through"' : '')}>${moneyF(r.v)}</span>`;
      const textLabel = r.label || r.k;

      if(targetId === 'summaryTiendaTicket' && !r.pending && r.attachable){
        const inputId = `ticketUpload_${idx}`;
        const encodedKey = encodeURIComponent(r.k);
        const preview = r.image ? `<img class="ticket-thumb" src="${r.image}" alt="ticket" />` : '';
        div.innerHTML = `<span>${esc(textLabel)}</span><span style="display:flex;align-items:center;gap:8px;">${amountHtml}<span class="ticket-actions"><button type="button" class="outline small" onclick="document.getElementById('${inputId}').click()">📎</button><input id="${inputId}" class="ticket-file-input" type="file" accept="image/*" onchange="uploadTicketImage(event, '${encodedKey}')">${preview}${r.image ? `<button type="button" class="outline small" onclick="removeTicketImage('${encodedKey}')">🗑️</button>` : ''}</span></span>`;
      } else {
        div.innerHTML = `<span>${esc(textLabel)}</span>${amountHtml}`;
      }
      wrap.appendChild(div);
    });

    const totalDiv = document.createElement('div');
    totalDiv.className = 'summary-item';
    totalDiv.style.fontWeight = '800';
    totalDiv.innerHTML = `<span>TOTAL</span><span class="pill">${moneyF(total)}</span>`;
    wrap.appendChild(totalDiv);
  };

  renderBudget = function(){
    const wrap = $('budgetLayout');
    const b = budgetSummary();
    if(wrap){
      wrap.innerHTML = `
        <div class="budget-panel socios">
          <h3>INGRESOS</h3>
          <div class="budget-rows">
            <div class="budget-row budget-subgroup"><strong>SOCIOS</strong><span>${esc(moneyF(b.ingresosDinero.socios.ingresado))}</span></div>
            <div class="budget-subrows">
              <div class="budget-subrow"><span>Personas</span><span>${esc(String(b.ingresosDinero.socios.count))}</span></div>
              <div class="budget-subrow"><span class="summary-tip" title="${esc(listTitle(b.ingresosDinero.socios.listImporte))}">Importe socios</span><span>${esc(moneyF(b.ingresosDinero.socios.importe))}</span></div>
              <div class="budget-subrow"><span class="summary-tip" title="${esc(listTitle(b.ingresosDinero.socios.listIngresado))}">Ingresado socios</span><span>${esc(moneyF(b.ingresosDinero.socios.ingresado))}</span></div>
              <div class="budget-subrow"><span class="summary-tip" title="${esc(listTitle(b.ingresosDinero.socios.listPendiente))}">Pendiente socios</span><span>${esc(moneyF(b.ingresosDinero.socios.pendiente))}</span></div>
            </div>
            <div class="budget-row budget-subgroup"><strong>NO SOCIOS</strong><span>${esc(moneyF(b.ingresosDinero.noSocios.ingresado))}</span></div>
            <div class="budget-subrows">
              <div class="budget-subrow"><span>Personas</span><span>${esc(String(b.ingresosDinero.noSocios.count))}</span></div>
              <div class="budget-subrow"><span class="summary-tip" title="${esc(listTitle(b.ingresosDinero.noSocios.listImporte))}">Importe no socios</span><span>${esc(moneyF(b.ingresosDinero.noSocios.importe))}</span></div>
              <div class="budget-subrow"><span class="summary-tip" title="${esc(listTitle(b.ingresosDinero.noSocios.listIngresado))}">Ingresado no socios</span><span>${esc(moneyF(b.ingresosDinero.noSocios.ingresado))}</span></div>
              <div class="budget-subrow"><span class="summary-tip" title="${esc(listTitle(b.ingresosDinero.noSocios.listPendiente))}">Pendiente no socios</span><span>${esc(moneyF(b.ingresosDinero.noSocios.pendiente))}</span></div>
            </div>
          </div>
        </div>
        <div class="budget-panel donantes">
          <h3>DONACIÓN DE PRODUCTO</h3>
          <div class="budget-rows">
            <div class="budget-subrows">
              <div class="budget-subrow"><span class="summary-tip" title="${esc(listTitle(b.donacionProducto.listTiendas))}">Donación de producto tiendas</span><span>${esc(moneyF(b.donacionProducto.donadoTienda))}</span></div>
              <div class="budget-subrow"><span class="summary-tip" title="${esc(listTitle(b.donacionProducto.listSocios))}">Donación de producto socios</span><span>${esc(moneyF(b.donacionProducto.donadoSocio))}</span></div>
              <div class="budget-subrow"><span class="summary-tip" title="${esc(listTitle(b.donacionProducto.listNoSocios))}">Donación de producto no socios</span><span>${esc(moneyF(b.donacionProducto.donadoOtros))}</span></div>
            </div>
            <div class="budget-row budget-subgroup"><strong>Valor producto donado</strong><span>${esc(moneyF(b.donacionProducto.valorDonado))}</span></div>
          </div>
        </div>
        <div class="budget-panel operativo">
          <h3>OPERATIVA</h3>
          <div class="budget-rows">
            <div class="budget-row"><strong>INGRESOS</strong><span>${esc(moneyF(b.operativa.ingresos))}</span></div>
            <div class="budget-row"><strong>GASTOS</strong><span>${esc(moneyF(Number(b.operativa.gastoCompras || 0) + Number(b.operativa.gastosOrganizacion || 0) + Number(b.operativa.pendiente || 0)))}</span></div>
            <div class="budget-row"><strong>PTE. COMPRA U OTROS GASTOS</strong><span style="color:#c2410c">${esc(moneyF(b.operativa.pendiente))}</span></div>
            <div class="budget-row"><strong>SALDO ACTUAL</strong><span style="color:${Number(b.operativa.saldoActual || 0) >= 0 ? '#047857' : '#b91c1c'}">${esc(moneyF(b.operativa.saldoActual))}</span></div>
            <div class="budget-row"><strong>SALDO OPERATIVO</strong><span style="color:${Number(b.operativa.saldoOperativo || 0) >= 0 ? '#155e75' : '#7f1d1d'}">${esc(moneyF(b.operativa.saldoOperativo))}</span></div>
          </div>
        </div>`;
    }
    renderSummaryList('summarySegmento', summaryBySegmento());
    renderSummaryList('summaryDestino', summaryByDestino());
    renderSummaryList('summaryTiendaTicket', typeof summaryByTiendaTicket === 'function' ? summaryByTiendaTicket() : []);
    renderGraficas();
  };

  // Make purchase price field easy to edit
  updateBuyPreview = function(forceReference=false){
    const producto = typeof productoById === 'function' ? productoById($('buyProducto')?.value || '') : null;
    const unidades = Number($('buyUnidades')?.value || 0);
    const precioEl = $('buyPrecio');
    const ref = Number((producto && (producto.defaultPrecio ?? producto.precio)) || 0);
    const raw = precioEl?.value || ref;
    const precio = forceReference ? ref : parseEuro(raw);
    if(precioEl && (forceReference || document.activeElement !== precioEl)) precioEl.value = euroF(precio);
    if($('buyImporte')) $('buyImporte').value = moneyF(precio * unidades);
  };

  document.addEventListener('focusin', function(e){
    const t = e.target;
    if(t && (t.id === 'buyPrecio' || t.dataset.action === 'edit-compra-precio')){
      try{ t.select(); }catch(_){}
    }
  });

  document.addEventListener('blur', function(e){
    const t = e.target;
    if(t && t.id === 'buyPrecio'){
      t.value = euroF(parseEuro(t.value));
      updateBuyPreview(false);
    }
    if(t && t.dataset && t.dataset.action === 'edit-compra-precio'){
      t.value = euroF(parseEuro(t.value));
    }
  }, true);

  function sortComprasRows(rows){
    const byTicket = (a,b)=> String(a.ticketDonacion||'').localeCompare(String(b.ticketDonacion||''),'es') || (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es');
    const byProd = (a,b)=> (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es') || String(a.ticketDonacion||'').localeCompare(String(b.ticketDonacion||''),'es');
    const byResp = (a,b)=> (a.responsable?.nombre||'').localeCompare((b.responsable?.nombre||''),'es') || byTicket(a,b);
    const sort = state.comprasSort === 'ticket' ? byTicket : (state.comprasSort === 'responsable' ? byResp : byProd);
    return rows.sort(sort);
  }

  renderCompras = function(){
    const wrap = $('comprasList');
    if(!wrap) return;
    let rows = (typeof comprasForEvent === 'function' ? comprasForEvent() : []).filter(r => !(typeof isDonationTicket === 'function' && isDonationTicket(r.ticketDonacion))).slice();
    rows = sortComprasRows(rows);
    if(!rows.length){
      wrap.innerHTML = '<div class="empty">Todavía no hay compras u otros gastos para este evento.</div>';
      return;
    }
    const productos = (typeof productosGenerales === 'function' ? productosGenerales() : (state.productos || [])).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
    const tiendas = allTiendas().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
    const socios = allSocios().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));

    wrap.innerHTML = '<div class="hint">Ordenar por: <a href="#" onclick="state.comprasSort=\'producto\'; renderCompras(); return false;">Producto</a> · <a href="#" onclick="state.comprasSort=\'ticket\'; renderCompras(); return false;">Ticket u otros gastos</a> · <a href="#" onclick="state.comprasSort=\'responsable\'; renderCompras(); return false;">Responsable</a></div>';

    rows.forEach(r => {
      const pending = String(r.ticketDonacion || '').trim() === '';
      const precioVal = Number(r.precio != null ? r.precio : (r.precioCalc != null ? r.precioCalc : (r.producto?.precio || 0)));
      const importeVal = precioVal * Number(r.unidades || 0);
      const row = document.createElement('div');
      row.className = 'itemcard' + (pending ? ' red-row' : '');
      row.innerHTML = `
        <div class="rowline compra">
          <div class="field"><label>Producto</label><select data-action="edit-compra-producto" data-id="${r.id}">${productos.map(p => `<option value="${p.id}" ${p.id===r.productoId?'selected':''}>${esc(p.nombre)}</option>`).join('')}</select></div>
          <div class="field"><label>Unidades</label><input type="number" min="0" step="0.01" value="${Number(r.unidades||0)}" data-action="edit-compra-unidades" data-id="${r.id}" /></div>
          <div class="field"><label>Precio</label><input class="money-text" type="text" value="${euroF(precioVal)}" data-action="edit-compra-precio" data-id="${r.id}" /></div>
          <div class="field"><label>Importe</label><input class="soft-readonly" readonly value="${moneyF(importeVal)}" /></div>
          <div class="field"><label>Ticket u Otros gastos</label><select data-action="edit-compra-ticket" data-id="${r.id}">${PURCHASE_TICKET_OPTIONS.map(v => `<option value="${v}" ${v===r.ticketDonacion?'selected':''}>${v === '' ? '-- Pte.Compra u otros gastos --' : esc(v)}</option>`).join('')}</select></div>
          <div class="field"><label>Tienda</label><select data-action="edit-compra-tienda" data-id="${r.id}"><option value="" ${!r.tiendaId?'selected':''}>-- elige tienda --</option>${tiendas.map(t => `<option value="${t.id}" ${t.id===r.tiendaId?'selected':''}>${esc(t.nombre)}</option>`).join('')}</select></div>
          <div class="field"><label>Responsable</label><select data-action="edit-compra-responsable" data-id="${r.id}"><option value="" ${!r.responsableId?'selected':''}>-- sin responsable --</option>${socios.map(p => `<option value="${p.id}" ${p.id===r.responsableId?'selected':''}>${esc(p.nombre)}</option>`).join('')}</select></div>
          <div style="display:flex;gap:8px;align-items:end"><button type="button" class="modify small" data-action="save-compra" data-id="${r.id}">Modificar</button><button type="button" class="danger small" data-action="delete-compra" data-id="${r.id}">Eliminar</button></div>
        </div>`;
      wrap.appendChild(row);
    });
  };

  function fileNameV160(ev){
    const title = String(ev?.titulo || 'evento')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'').replace(/_+/g,'_') || 'evento';
    const now = new Date();
    const dd = String(now.getDate()).padStart(2,'0');
    const mm = String(now.getMonth()+1).padStart(2,'0');
    const yyyy = String(now.getFullYear());
    return `ControlEvent_v26_6_INFOEVENTO-${title}_${yyyy}${mm}${dd}.xlsx`;
  }
  window.xlsxFilename = fileNameV160;

  async function makeChartImageDataUrlV160(){
    const canvas = document.createElement('canvas');
    canvas.width = 1900;
    canvas.height = 960;
    const ctx = canvas.getContext('2d');
    const g = graphDataV160();

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
      {label:'Donado por tiendas', value:g.donations.tiendas, color:'#fcd34d'},
      {label:'Donado por socios', value:g.donations.socios, color:'#f59e0b'},
      {label:'Donado por no socios', value:g.donations.noSocios, color:'#b45309'}
    ];
    const expenseItems = [
      {label:'Gastado en TKxx', value:g.expenses.tk, color:'#dc2626'},
      {label:'Gastos corrientes', value:g.expenses.corrientes, color:'#ef4444'},
      {label:'Pte. Compra u otros gastos', value:g.expenses.pendiente, color:'#fb7185'}
    ];
    const saldoActualItems = [{label:'Saldo actual', value:Math.abs(g.saldoActual), color:g.saldoActual >= 0 ? '#0f766e' : '#b91c1c'}];
    const saldoOperativoItems = [{label:'Saldo operativo', value:Math.abs(g.saldoOperativo), color:g.saldoOperativo >= 0 ? '#155e75' : '#7f1d1d'}];

    const maxVal = Math.max(1, g.incomes.total, g.donations.total, g.expenses.total, Math.abs(g.saldoActual), Math.abs(g.saldoOperativo));
    const fmt = v => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0));
    const barX = 1120, barW = 620, barH = 42;

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
      ctx.font = '16px Arial';
      let x = startX, y = startY, rowH = 26;
      items.filter(it => Number(it.value || 0) !== 0).forEach(it => {
        const text = `${it.label}: ${fmt(it.value)}`;
        const textW = ctx.measureText(text).width;
        const itemW = 22 + textW + 28;
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
      ctx.font = 'bold 22px Arial';
      ctx.fillText(`${label}: ${fmt(total)}`, 40, y + 24);

      rr(barX, y, barW, barH, 20, '#f3f4f6');
      let x = barX;
      items.forEach(it => {
        const w = (Math.max(0, Number(it.value || 0)) / maxVal) * barW;
        if(w <= 0) return;
        rr(x, y, w, barH, 20, it.color);
        x += w;
      });

      return drawLegend(items, barX, y + 70, barW) + 40;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 30px Arial';
    ctx.fillText('GRÁFICAS DEL EVENTO', 40, 46);

    let y = 90;
    y = drawRow(y, 'INGRESOS', g.incomes.total, incomeItems);
    y = drawRow(y, 'DONACIÓN DE PRODUCTO', g.donations.total, donationItems);
    y = drawRow(y, 'GASTOS', g.expenses.total, expenseItems);
    y = drawRow(y, 'SALDO ACTUAL', g.saldoActual, saldoActualItems);
    y = drawRow(y, 'SALDO OPERATIVO', g.saldoOperativo, saldoOperativoItems);

    return canvas.toDataURL('image/png');
  }
  window.makeChartImageDataUrl = makeChartImageDataUrlV160;

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

    for(const ws of wb.worksheets){
      try{
        await ws.protect('open_excel_arrastre', {selectLockedCells:true, selectUnlockedCells:true, formatCells:false, formatColumns:false, formatRows:false, insertColumns:false, insertRows:false, insertHyperlinks:false, deleteColumns:false, deleteRows:false, sort:false, autoFilter:false, pivotTables:false});
      }catch(_){}
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ControlEvent_v26_6_descarga_datos.xlsx';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  exportExcel = async function(){
    if(typeof isLocked === 'function' && isLocked() && typeof isGodRole === 'function' && !isGodRole()) return;
    const ev = typeof selectedEvent === 'function' ? selectedEvent() : null;
    if(!ev) return;

    try{
      await ensureExcelJS();
    }catch(err){
      alert('No se pudo cargar el motor de Excel. Coloca exceljs.min.js en la carpeta vendor o usa conexión a internet.');
      return;
    }

    const collabs = (typeof collabsForEvent === 'function' ? collabsForEvent() : []);
    const compras = (typeof comprasForEvent === 'function' ? comprasForEvent() : []);
    const comprasSolo = compras.filter(x => !isDonationTicket(x.ticketDonacion)).slice().sort((a,b)=> String(a.ticketDonacion||'').localeCompare(String(b.ticketDonacion||''),'es') || (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es'));
    const donacionesSolo = compras.filter(x => isDonationTicket(x.ticketDonacion));
    const budget = budgetSummary();
    const segRows = summaryBySegmento();
    const destRows = summaryByDestino();
    const tiendaRows = (typeof summaryByTiendaTicket === 'function' ? summaryByTiendaTicket() : []).slice().sort((a,b)=>{
      const [ta='',tk=''] = String(a.k||'').split(' | ');
      const [tb='',tl=''] = String(b.k||'').split(' | ');
      const s = tk.localeCompare(tl,'es');
      return s !== 0 ? s : ta.localeCompare(tb,'es');
    });

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
    function putText(ws, r, c, v, fill='white'){ const cell = ws.getCell(r,c); cell.value = v == null ? '' : String(v); paint(cell, fill); return cell; }
    function putNum(ws, r, c, v, fill='white'){ const cell = ws.getCell(r,c); const wasBold = !!cell.font?.bold; cell.value = Number(v || 0); cell.numFmt = numFmt; paint(cell, fill); cell.font = {bold:wasBold, color:{argb:'FF111827'}}; return cell; }
    function putMoney(ws, r, c, v, fill='white'){ const cell = ws.getCell(r,c); const wasBold = !!cell.font?.bold; cell.value = Number(v || 0); cell.numFmt = moneyFmt; paint(cell, fill); cell.font = {bold:wasBold, color:{argb:'FF111827'}}; return cell; }
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
    function addImageToSheet(ws, dataUrl, row, col, width=1450, height=760){
      if(!dataUrl) return;
      const m = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
      if(!m) return;
      const ext = m[1].includes('png') ? 'png' : 'jpeg';
      const id = wb.addImage({base64:dataUrl, extension:ext});
      ws.addImage(id, { tl: {col: col-1 + 0.05, row: row-1 + 0.05}, ext: {width, height} });
      ws.getRow(row).height = 580;
    }

    const wsRes = baseSheet('RESUMEN', [36,34,18,18,18]);
    mergeTitle(wsRes, 1, 'RESUMEN DEL EVENTO', 5);
    putText(wsRes, 2, 1, 'Título del evento'); wsRes.mergeCells(2,2,2,5); putText(wsRes, 2, 2, ev.titulo || '');
    putText(wsRes, 3, 1, 'Descripción del evento'); wsRes.mergeCells(3,2,4,5); putText(wsRes, 3, 2, ev.descripcion || '');
    wsRes.getCell(3,2).alignment = {vertical:'top', wrapText:true};
    wsRes.getRow(3).height = 95; wsRes.getRow(4).height = 35;
    putText(wsRes, 5, 1, 'Situación del evento'); putText(wsRes, 5, 2, ev.situacion || '');
    putText(wsRes, 6, 1, 'Fecha inicio'); putText(wsRes, 6, 2, ev.fechaIni || '');
    putText(wsRes, 7, 1, 'Fecha fin'); putText(wsRes, 7, 2, ev.fechaFin || '');
    putText(wsRes, 8, 1, 'Precio evento'); putMoney(wsRes, 8, 2, ev.precio || 0);
    putText(wsRes, 10, 1, 'Ingresos'); putMoney(wsRes, 10, 2, budget.operativa.ingresos || 0);
    putText(wsRes, 11, 1, 'Donación de producto'); putMoney(wsRes, 11, 2, budget.donacionProducto.valorDonado || 0);
    putText(wsRes, 12, 1, 'Gastos'); putMoney(wsRes, 12, 2, Number(budget.operativa.gastoCompras || 0) + Number(budget.operativa.gastosOrganizacion || 0) + Number(budget.operativa.pendiente || 0));
    putText(wsRes, 13, 1, 'Saldo actual'); putMoney(wsRes, 13, 2, budget.operativa.saldoActual || 0);
    putText(wsRes, 14, 1, 'Saldo operativo'); putMoney(wsRes, 14, 2, budget.operativa.saldoOperativo || 0);

    const wsIng = baseSheet('INGRESOS', [34,12,18,18,18,18]);
    mergeTitle(wsIng, 1, 'INGRESOS', 6);
    titleRow(wsIng, 3, ['Colaborador/a','Número','Tipo ingreso','Importe socio','Importe no socio','TOTAL']);
    let r = 4;
    let tNum = 0, tSoc = 0, tNoSoc = 0, tTot = 0;
    collabs.forEach(item => {
      const impSoc = item.persona?.rango === 'SOCIO' ? Number(item.base || 0) : 0;
      const impNo = item.persona?.rango === 'SOCIO' ? Number(item.donation || 0) : Number(item.total || 0);
      putText(wsIng, r, 1, item.persona?.nombre || '');
      putNum(wsIng, r, 2, item.numero || 0);
      putText(wsIng, r, 3, item.situacion || '');
      putMoney(wsIng, r, 4, impSoc);
      putMoney(wsIng, r, 5, impNo);
      putMoney(wsIng, r, 6, item.total || 0, item.situacion === 'Pendiente' ? 'warn' : 'white');
      tNum += Number(item.numero || 0); tSoc += impSoc; tNoSoc += impNo; tTot += Number(item.total || 0);
      r += 1;
    });
    titleRow(wsIng, r, ['TOTAL', '', '', '', '', '']);
    putNum(wsIng, r, 2, tNum);
    putMoney(wsIng, r, 4, tSoc);
    putMoney(wsIng, r, 5, tNoSoc);
    putMoney(wsIng, r, 6, tTot);

    const wsCom = baseSheet('COMPRAS Y OTROS GASTOS', [30,12,16,16,26,28,28]);
    mergeTitle(wsCom, 1, 'COMPRAS Y OTROS GASTOS', 7);
    titleRow(wsCom, 3, ['Producto','Unidades','Precio','Importe','Ticket u otros gastos','Tienda','Responsable']);
    r = 4;
    let totalImporteCom = 0, totalPendCom = 0;
    comprasSolo.forEach(item => {
      const importe = Number(item.valor || 0);
      const pending = String(item.ticketDonacion || '').trim() === '';
      putText(wsCom, r, 1, item.producto?.nombre || '');
      putNum(wsCom, r, 2, item.unidades || 0);
      putMoney(wsCom, r, 3, item.precio != null ? item.precio : (item.precioCalc != null ? item.precioCalc : (item.producto?.precio || 0)));
      putMoney(wsCom, r, 4, importe, pending ? 'warn' : 'white');
      putText(wsCom, r, 5, item.ticketDonacion || '');
      putText(wsCom, r, 6, item.tienda?.nombre || '');
      putText(wsCom, r, 7, item.responsable?.nombre || '');
      totalImporteCom += importe;
      if(pending) totalPendCom += importe;
      r += 1;
    });
    titleRow(wsCom, r, ['TOTAL IMPORTE', '', '', '', '', '', '']);
    putMoney(wsCom, r, 4, totalImporteCom);
    r += 1;
    titleRow(wsCom, r, ['TOTAL PTE. COMPRA U OTROS GASTOS', '', '', '', '', '', '']);
    putMoney(wsCom, r, 4, totalPendCom);

    const wsDon = baseSheet('DONACIONES DE PRODUCTO', [30,12,16,18,22,28,28]);
    mergeTitle(wsDon, 1, 'DONACIONES DE PRODUCTO', 7);
    titleRow(wsDon, 3, ['Producto','Unidades','Precio','Valor estimado','Tipo de donación','Donante','Responsable']);
    r = 4;
    let totalValDon = 0;
    donacionesSolo.forEach(item => {
      const donor = (typeof resolveDonorNameV163 === 'function' ? resolveDonorNameV163(item) : '') || donorName(item) || item.donorLabel || item.tienda?.nombre || item.donorRef || '';
      putText(wsDon, r, 1, item.producto?.nombre || '');
      putNum(wsDon, r, 2, item.unidades || 0);
      putMoney(wsDon, r, 3, item.precio != null ? item.precio : (item.precioCalc != null ? item.precioCalc : (item.producto?.precio || 0)));
      putMoney(wsDon, r, 4, item.valor || 0, item.valor === 0 ? 'warn' : 'white');
      putText(wsDon, r, 5, item.ticketDonacion || '');
      putText(wsDon, r, 6, donor);
      putText(wsDon, r, 7, item.responsable?.nombre || '');
      totalValDon += Number(item.valor || 0);
      r += 1;
    });
    titleRow(wsDon, r, ['TOTAL VALOR ESTIMADO', '', '', '', '', '', '']);
    putMoney(wsDon, r, 4, totalValDon);

    const wsSeg = baseSheet('CALCULOS_SEGMENTO', [32,16,16,22,16]);
    mergeTitle(wsSeg, 1, 'CÁLCULOS SEGMENTO', 5);
    titleRow(wsSeg, 3, ['Segmento','Comprado','Donado','Pte. Compra u otros gastos','TOTAL']);
    r = 4;
    let sgC=0, sgD=0, sgP=0, sgT=0;
    segRows.forEach(it => {
      putText(wsSeg, r, 1, it.label || '');
      putMoney(wsSeg, r, 2, it.comprado || 0);
      putMoney(wsSeg, r, 3, it.donado || 0);
      putMoney(wsSeg, r, 4, it.pendiente || 0, (it.pendiente || 0) ? 'warn' : 'white');
      putMoney(wsSeg, r, 5, it.total || 0);
      sgC += Number(it.comprado||0); sgD += Number(it.donado||0); sgP += Number(it.pendiente||0); sgT += Number(it.total||0);
      r += 1;
    });
    titleRow(wsSeg, r, ['TOTAL', '', '', '', '']);
    putMoney(wsSeg, r, 2, sgC); putMoney(wsSeg, r, 3, sgD); putMoney(wsSeg, r, 4, sgP); putMoney(wsSeg, r, 5, sgT);

    const wsDest = baseSheet('CALCULOS_DESTINO', [32,16,16,22,16]);
    mergeTitle(wsDest, 1, 'CÁLCULOS DESTINO', 5);
    titleRow(wsDest, 3, ['Destino','Comprado','Donado','Pte. Compra u otros gastos','TOTAL']);
    r = 4;
    let dsC=0, dsD=0, dsP=0, dsT=0;
    destRows.forEach(it => {
      putText(wsDest, r, 1, it.label || '');
      putMoney(wsDest, r, 2, it.comprado || 0);
      putMoney(wsDest, r, 3, it.donado || 0);
      putMoney(wsDest, r, 4, it.pendiente || 0, (it.pendiente || 0) ? 'warn' : 'white');
      putMoney(wsDest, r, 5, it.total || 0);
      dsC += Number(it.comprado||0); dsD += Number(it.donado||0); dsP += Number(it.pendiente||0); dsT += Number(it.total||0);
      r += 1;
    });
    titleRow(wsDest, r, ['TOTAL', '', '', '', '']);
    putMoney(wsDest, r, 2, dsC); putMoney(wsDest, r, 3, dsD); putMoney(wsDest, r, 4, dsP); putMoney(wsDest, r, 5, dsT);

    const wsTienda = baseSheet('CALCULO_TIENDA_TICKET', [58,20]);
    mergeTitle(wsTienda, 1, 'CÁLCULO TIENDA TICKET', 2);
    titleRow(wsTienda, 3, ['Concepto','Importe']);
    r = 4;
    let tt = 0;
    tiendaRows.forEach(it => {
      putText(wsTienda, r, 1, it.label || it.k || '', it.pending ? 'warn' : 'white');
      putMoney(wsTienda, r, 2, it.v, it.pending ? 'warn' : 'white');
      tt += Number(it.v || 0);
      r += 1;
    });
    titleRow(wsTienda, r, ['TOTAL', '']);
    putMoney(wsTienda, r, 2, tt);

    const wsGraf = baseSheet('GRAFICAS', [24,24,24,24]);
    mergeTitle(wsGraf, 1, 'GRÁFICAS DEL EVENTO', 4);
    const dataUrl = await makeChartImageDataUrlV160();
    addImageToSheet(wsGraf, dataUrl, 3, 1, 1450, 760);

    for(const ws of wb.worksheets){
      try{
        await ws.protect('open_excel_arrastre', {selectLockedCells:true, selectUnlockedCells:true, formatCells:false, formatColumns:false, formatRows:false, insertColumns:false, insertRows:false, insertHyperlinks:false, deleteColumns:false, deleteRows:false, sort:false, autoFilter:false, pivotTables:false});
      }catch(_){}
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileNameV160(ev);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  window.addEventListener('load', () => {
    try{ if(typeof render === 'function') render(); }catch(_){}
  });
})();
