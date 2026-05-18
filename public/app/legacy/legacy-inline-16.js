/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #16. */
/* ==== V16.3 FIX DONANTE + SALDO OPERATIVO ==== */
(function(){
  const esc = v => typeof escapeHtml === 'function' ? escapeHtml(v) : String(v ?? '');
  const moneyF = v => typeof money === 'function'
    ? money(Number(v || 0))
    : new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0));

  const isDon = t => typeof isDonationTicket === 'function' && isDonationTicket(t);
  const isCurrent = t => typeof isCurrentExpenseTicket === 'function' && isCurrentExpenseTicket(t);
  const norm = v => String(v ?? '').trim();

  function findById(list, id){
    const sid = norm(id);
    if(!sid) return null;
    return (list || []).find(x => norm(x.id) === sid || norm(x.codigo) === sid || norm(x.nombre) === sid) || null;
  }

  function personName(id){
    try{
      const p = typeof personaById === 'function' ? personaById(id) : findById(state?.personas || [], id);
      return norm(p?.nombre);
    }catch(_){ return ''; }
  }

  function storeName(id){
    try{
      const t = typeof tiendaById === 'function' ? tiendaById(id) : findById(state?.tiendas || [], id);
      return norm(t?.nombre);
    }catch(_){ return ''; }
  }

  function resolveDonorNameV163(c){
    try{
      if(c?.donorLabel && norm(c.donorLabel)) return norm(c.donorLabel);
      const raw = norm(c?.donorRef);
      if(raw){
        if(typeof donorLabel === 'function'){
          const dl = norm(donorLabel(raw));
          if(dl) return dl;
        }
        const parts = raw.split(':');
        if(parts.length >= 2){
          const kind = norm(parts[0]).toUpperCase();
          const id = parts.slice(1).join(':');
          if(kind === 'P' || kind === 'PERSONA' || kind === 'PERSONAS'){
            const n = personName(id);
            if(n) return n;
          }
          if(kind === 'T' || kind === 'TIENDA' || kind === 'TIENDAS'){
            const n = storeName(id);
            if(n) return n;
          }
        }
        // Si por algún motivo se guardó sólo el id o el nombre, intentarlo igualmente.
        const byPerson = personName(raw);
        if(byPerson) return byPerson;
        const byStore = storeName(raw);
        if(byStore) return byStore;
        // Último recurso: evitar celda vacía si el valor guardado era un texto útil.
        if(!/^[PT]:/i.test(raw)) return raw;
      }
      const byTiendaId = storeName(c?.tiendaId);
      if(byTiendaId) return byTiendaId;
      if(c?.tienda?.nombre && norm(c.tienda.nombre)) return norm(c.tienda.nombre);
    }catch(_){ }
    return '';
  }
  window.resolveDonorNameV163 = resolveDonorNameV163;

  // Rehidrata compras/donaciones desde state para que pantalla, globos y Excel usen el mismo donante correcto.
  const previousComprasForEventV163 = typeof comprasForEvent === 'function' ? comprasForEvent : null;
  comprasForEvent = function(){
    try{
      const eventId = state?.selectedEventId;
      const rawRows = (state?.compras || []).filter(c => c.eventId === eventId);
      return rawRows.map(c => {
        const productoBase = (typeof productoById === 'function' ? productoById(c.productoId) : findById(state?.productos || [], c.productoId)) || {};
        const precio = Number(c.precio != null && c.precio !== '' ? c.precio : ((productoBase.defaultPrecio ?? productoBase.precio) || 0));
        const unidades = Number(c.unidades || 0);
        const valor = precio * unidades;
        const donation = isDon(c.ticketDonacion);
        const donor = donation ? resolveDonorNameV163(c) : '';
        const tiendaObj = donation
          ? {id: c.donorRef || c.tiendaId || '', nombre: donor}
          : ((typeof tiendaById === 'function' ? tiendaById(c.tiendaId || '') : findById(state?.tiendas || [], c.tiendaId)) || {id:'', nombre:''});
        return {
          ...c,
          producto: {...productoBase, precio},
          precioCalc: precio,
          valor,
          importe: donation ? 0 : valor,
          tienda: tiendaObj,
          responsable: (typeof personaById === 'function' ? personaById(c.responsableId || '') : findById(state?.personas || [], c.responsableId)) || null,
          donorLabel: donor
        };
      });
    }catch(err){
      return previousComprasForEventV163 ? previousComprasForEventV163() : [];
    }
  };

  function listTitleV163(items, emptyText='Sin elementos'){
    const arr = (items || []).filter(Boolean);
    return arr.length ? arr.join('\n') : emptyText;
  }

  function collabItemsV163(filterFn){
    return (typeof collabsForEvent === 'function' ? collabsForEvent() : [])
      .filter(filterFn)
      .map(r => `${r.persona?.nombre || 'Sin nombre'} — ${moneyF(r.total || 0)}`);
  }

  function donationItemsV163(ticketCode){
    return comprasForEvent()
      .filter(r => norm(r.ticketDonacion) === ticketCode)
      .map(r => `${resolveDonorNameV163(r) || 'Sin donante'} — ${r.producto?.nombre || 'Producto'} — ${moneyF(r.valor || 0)}`);
  }

  budgetSummary = function(){
    const rows = typeof collabsForEvent === 'function' ? collabsForEvent() : [];
    const compras = comprasForEvent();
    const sociosRows = rows.filter(r => r.persona?.rango === 'SOCIO');
    const noSociosRows = rows.filter(r => r.persona?.rango !== 'SOCIO');
    const sumNum = arr => arr.reduce((a,b)=>a+Number(b.numero||0),0);
    const sumTotal = arr => arr.reduce((a,b)=>a+Number(b.total||0),0);
    const paidTotal = arr => arr.filter(r => r.situacion !== 'Pendiente').reduce((a,b)=>a+Number(b.total||0),0);
    const pendingTotal = arr => arr.filter(r => r.situacion === 'Pendiente').reduce((a,b)=>a+Number(b.total||0),0);

    const socios = {
      count: sumNum(sociosRows), importe: sumTotal(sociosRows), ingresado: paidTotal(sociosRows), pendiente: pendingTotal(sociosRows),
      listImporte: collabItemsV163(r => r.persona?.rango === 'SOCIO'),
      listIngresado: collabItemsV163(r => r.persona?.rango === 'SOCIO' && r.situacion !== 'Pendiente'),
      listPendiente: collabItemsV163(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Pendiente')
    };
    const noSocios = {
      count: sumNum(noSociosRows), importe: sumTotal(noSociosRows), ingresado: paidTotal(noSociosRows), pendiente: pendingTotal(noSociosRows),
      listImporte: collabItemsV163(r => r.persona?.rango !== 'SOCIO'),
      listIngresado: collabItemsV163(r => r.persona?.rango !== 'SOCIO' && r.situacion !== 'Pendiente'),
      listPendiente: collabItemsV163(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Pendiente')
    };

    const gastoCompras = compras.filter(c => !isDon(c.ticketDonacion) && !isCurrent(c.ticketDonacion) && norm(c.ticketDonacion) !== '').reduce((a,b)=>a+Number(b.valor||0),0);
    const gastosOrganizacion = compras.filter(c => isCurrent(c.ticketDonacion)).reduce((a,b)=>a+Number(b.valor||0),0);
    const pendiente = compras.filter(c => !isDon(c.ticketDonacion) && norm(c.ticketDonacion) === '').reduce((a,b)=>a+Number(b.valor||0),0);
    const donacionProducto = {
      donadoTienda: compras.filter(c => norm(c.ticketDonacion) === 'DONADO TIENDA').reduce((a,b)=>a+Number(b.valor||0),0),
      donadoSocio: compras.filter(c => norm(c.ticketDonacion) === 'DONADO SOCIO').reduce((a,b)=>a+Number(b.valor||0),0),
      donadoOtros: compras.filter(c => norm(c.ticketDonacion) === 'DONADO OTROS').reduce((a,b)=>a+Number(b.valor||0),0),
      listTiendas: donationItemsV163('DONADO TIENDA'),
      listSocios: donationItemsV163('DONADO SOCIO'),
      listNoSocios: donationItemsV163('DONADO OTROS')
    };
    donacionProducto.valorDonado = donacionProducto.donadoTienda + donacionProducto.donadoSocio + donacionProducto.donadoOtros;
    const ingresosTotal = socios.importe + noSocios.importe;
    const ingresosRealizados = socios.ingresado + noSocios.ingresado;
    const gastosTotal = gastoCompras + gastosOrganizacion + pendiente;
    const gastosRealizados = gastoCompras + gastosOrganizacion;
    return {
      ingresosDinero:{socios, noSocios, donantes:noSocios, totalIngresado:ingresosRealizados, totalComprometido:ingresosTotal, pendiente:socios.pendiente + noSocios.pendiente},
      donacionProducto,
      operativa:{ingresos:ingresosTotal, ingresoDinero:ingresosRealizados, gastoCompras, gastosOrganizacion, pendiente, saldoActual:ingresosRealizados - gastosRealizados, saldoOperativo:ingresosTotal - gastosTotal}
    };
  };

  function graphLinesIncomeV163(fn){
    return (typeof collabsForEvent === 'function' ? collabsForEvent() : []).filter(fn).map(r => `${r.persona?.nombre || 'Sin nombre'} — ${moneyF(r.total || 0)}`);
  }
  function graphLinesDonationV163(ticket){
    return comprasForEvent().filter(r => norm(r.ticketDonacion) === ticket).map(r => `${resolveDonorNameV163(r) || 'Sin donante'} — ${r.producto?.nombre || 'Producto'} — ${moneyF(r.valor || 0)}`);
  }
  function graphLinesExpenseV163(fn){
    return comprasForEvent().filter(fn).map(r => `${r.tienda?.nombre || 'Sin tienda'} — ${r.ticketDonacion || 'Pte.Compra u otros gastos'} — ${r.producto?.nombre || 'Producto'} — ${moneyF(r.valor || 0)}`);
  }

  function graphPartsV163(){
    const rows = typeof collabsForEvent === 'function' ? collabsForEvent() : [];
    const compras = comprasForEvent();
    const sum = arr => arr.reduce((a,b)=>a+Number(b||0),0);
    const incomeItems = [
      {label:'Socios Banco', value:sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Banco').map(r => r.total)), color:'#2563eb', lines:graphLinesIncomeV163(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Banco')},
      {label:'Socios Bizum', value:sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Bizum').map(r => r.total)), color:'#16a34a', lines:graphLinesIncomeV163(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Bizum')},
      {label:'Socios Efectivo', value:sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Efectivo').map(r => r.total)), color:'#84cc16', lines:graphLinesIncomeV163(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Efectivo')},
      {label:'No socios Banco', value:sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Banco').map(r => r.total)), color:'#60a5fa', lines:graphLinesIncomeV163(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Banco')},
      {label:'No socios Bizum', value:sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Bizum').map(r => r.total)), color:'#34d399', lines:graphLinesIncomeV163(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Bizum')},
      {label:'No socios Efectivo', value:sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Efectivo').map(r => r.total)), color:'#bef264', lines:graphLinesIncomeV163(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Efectivo')},
      {label:'Pendiente de ingresar', value:sum(rows.filter(r => r.situacion === 'Pendiente').map(r => r.total)), color:'#f59e0b', lines:graphLinesIncomeV163(r => r.situacion === 'Pendiente')}
    ];
    const donationItems = [
      {label:'Donado por tiendas', value:sum(compras.filter(r => norm(r.ticketDonacion) === 'DONADO TIENDA').map(r=>r.valor)), color:'#fcd34d', lines:graphLinesDonationV163('DONADO TIENDA')},
      {label:'Donado por socios', value:sum(compras.filter(r => norm(r.ticketDonacion) === 'DONADO SOCIO').map(r=>r.valor)), color:'#f59e0b', lines:graphLinesDonationV163('DONADO SOCIO')},
      {label:'Donado por no socios', value:sum(compras.filter(r => norm(r.ticketDonacion) === 'DONADO OTROS').map(r=>r.valor)), color:'#b45309', lines:graphLinesDonationV163('DONADO OTROS')}
    ];
    const expenseItems = [
      {label:'Gastado por ticket', value:sum(compras.filter(r => !isDon(r.ticketDonacion) && !isCurrent(r.ticketDonacion) && norm(r.ticketDonacion) !== '').map(r=>r.valor)), color:'#dc2626', lines:graphLinesExpenseV163(r => !isDon(r.ticketDonacion) && !isCurrent(r.ticketDonacion) && norm(r.ticketDonacion) !== '')},
      {label:'Gastos corrientes', value:sum(compras.filter(r => isCurrent(r.ticketDonacion)).map(r=>r.valor)), color:'#ef4444', lines:graphLinesExpenseV163(r => isCurrent(r.ticketDonacion))},
      {label:'Pendiente de compra', value:sum(compras.filter(r => !isDon(r.ticketDonacion) && norm(r.ticketDonacion) === '').map(r=>r.valor)), color:'#fb7185', lines:graphLinesExpenseV163(r => !isDon(r.ticketDonacion) && norm(r.ticketDonacion) === '')}
    ];
    const totalIncome = incomeItems.reduce((a,b)=>a+Number(b.value||0),0);
    const totalDon = donationItems.reduce((a,b)=>a+Number(b.value||0),0);
    const totalExp = expenseItems.reduce((a,b)=>a+Number(b.value||0),0);
    const saldoOperativo = totalIncome - totalExp;
    const saldoItems = [{label:'Saldo operativo', value:Math.abs(saldoOperativo), displayValue:saldoOperativo, color:saldoOperativo >= 0 ? '#155e75' : '#7f1d1d', lines:[`Saldo operativo: ${moneyF(saldoOperativo)}`]}];
    return {incomeItems, donationItems, expenseItems, saldoItems, totalIncome, totalDon, totalExp, saldoOperativo};
  }

  function segHtmlV163(value, maxVal, color, title){
    const w = (Math.max(0, Number(value || 0)) / maxVal) * 100;
    return `<div class="chart-seg" title="${esc(title)}" style="width:${w}%;background:${color};"></div>`;
  }
  function legendHtmlV163(items){
    return `<div class="chart-note" style="display:flex;flex-wrap:wrap;gap:10px 16px;margin-top:8px">${items.filter(x => Number(x.value||0) !== 0).map(x => `<span><span class="legend-dot" style="background:${x.color}"></span>${esc(x.label)}: ${esc(moneyF(x.displayValue ?? x.value))}</span>`).join('')}</div>`;
  }

  renderGraficas = function(){
    const wrap = document.getElementById('eventChartWrap');
    if(!wrap) return;
    const g = graphPartsV163();
    const maxVal = Math.max(1, g.totalIncome, g.totalDon, g.totalExp, Math.abs(g.saldoOperativo));
    function row(label, total, items){
      const segs = items.map(it => {
        const amountForTitle = it.displayValue ?? it.value;
        const detail = (it.lines && it.lines.length ? it.lines : ['Sin registros']).join('\n');
        const title = it.lines ? `${it.label}: ${moneyF(amountForTitle)}\n${detail}` : `${it.label}: ${moneyF(amountForTitle)}`;
        return segHtmlV163(it.value, maxVal, it.color, title);
      }).join('');
      return `<div class="chart-row"><div class="chart-label">${esc(label)}: ${esc(moneyF(total))}</div><div><div class="chart-track">${segs}</div>${legendHtmlV163(items)}</div></div>`;
    }
    wrap.innerHTML = `<div class="chart-shell"><div class="chart-bars">${row('INGRESOS', g.totalIncome, g.incomeItems)}${row('DONACIÓN DE PRODUCTO', g.totalDon, g.donationItems)}${row('GASTOS', g.totalExp, g.expenseItems)}${row('SALDO OPERATIVO', g.saldoOperativo, g.saldoItems)}</div></div>`;
  };

  window.makeChartImageDataUrlV160 = async function(){
    const g = graphPartsV163();
    const canvas = document.createElement('canvas');
    canvas.width = 1500;
    canvas.height = 820;
    const ctx = canvas.getContext('2d');
    const maxVal = Math.max(1, g.totalIncome, g.totalDon, g.totalExp, Math.abs(g.saldoOperativo));
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#111827'; ctx.font = 'bold 30px Arial'; ctx.fillText('GRÁFICAS DEL EVENTO', 40, 48);
    function drawRow(y, label, total, items){
      ctx.fillStyle = '#111827'; ctx.font = 'bold 22px Arial'; ctx.fillText(`${label}: ${moneyF(total)}`, 40, y);
      const x = 360, w = 1010, h = 36;
      ctx.fillStyle = '#f3f4f6'; ctx.fillRect(x, y-28, w, h);
      let cx = x;
      items.forEach(it => {
        const segW = Math.max(0, Math.abs(Number(it.value || 0)) / maxVal * w);
        if(segW > 0){ ctx.fillStyle = it.color; ctx.fillRect(cx, y-28, segW, h); cx += segW; }
      });
      let lx = x, ly = y + 30;
      ctx.font = '16px Arial';
      items.filter(it => Number(it.value || 0) !== 0).forEach(it => {
        ctx.fillStyle = it.color; ctx.fillRect(lx, ly-13, 13, 13);
        ctx.fillStyle = '#374151';
        const txt = `${it.label}: ${moneyF(it.displayValue ?? it.value)}`;
        ctx.fillText(txt, lx + 18, ly);
        lx += Math.min(340, Math.max(180, ctx.measureText(txt).width + 45));
        if(lx > 1260){ lx = x; ly += 24; }
      });
      return y + 132;
    }
    let y = 110;
    y = drawRow(y, 'INGRESOS', g.totalIncome, g.incomeItems);
    y = drawRow(y, 'DONACIÓN DE PRODUCTO', g.totalDon, g.donationItems);
    y = drawRow(y, 'GASTOS', g.totalExp, g.expenseItems);
    drawRow(y, 'SALDO OPERATIVO', g.saldoOperativo, g.saldoItems);
    return canvas.toDataURL('image/png');
  };

  window.addEventListener('load', () => {
    try{ if(typeof render === 'function') render(); }catch(_){ }
  });
})();
