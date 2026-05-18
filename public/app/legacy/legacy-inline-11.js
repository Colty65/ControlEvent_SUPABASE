/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #11. */
/* ==== V15.2 EXCEL GRAFICAS + NOMBRE FICHERO ==== */
(function(){
  function filenameV152(ev){
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

    if(typeof ensureProductRefPrices === 'function') ensureProductRefPrices();

    const collabs = typeof collabsForEvent === 'function' ? collabsForEvent() : [];
    const compras = typeof comprasForEvent === 'function' ? comprasForEvent() : [];
    const comprasSolo = compras.filter(x => !(typeof isDonationTicket === 'function' && isDonationTicket(x.ticketDonacion)));
    const donacionesSolo = compras.filter(x => (typeof isDonationTicket === 'function' && isDonationTicket(x.ticketDonacion)));
    const budget = typeof budgetSummary === 'function' ? budgetSummary() : {};
    const segRows = typeof summaryBySegmento === 'function' ? summaryBySegmento() : [];
    const destRows = typeof summaryByDestino === 'function' ? summaryByDestino() : [];
    const tiendaRows = typeof summaryByTiendaTicket === 'function' ? summaryByTiendaTicket() : [];

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
    function addImageToSheet(ws, dataUrl, row, col, width=1050, height=620){
      if(!dataUrl) return;
      const m = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
      if(!m) return;
      const mime = m[1];
      const ext = mime.includes('png') ? 'png' : 'jpeg';
      const id = wb.addImage({base64:dataUrl, extension:ext});
      ws.addImage(id, { tl: {col: col-1 + 0.05, row: row-1 + 0.05}, ext: {width, height} });
      ws.getRow(row).height = Math.ceil(height * 0.75 / 20) * 20;
    }

    // RESUMEN
    const wsRes = baseSheet('RESUMEN', [32,18,18,18,18]);
    mergeTitle(wsRes, 1, 'RESUMEN DEL EVENTO', 5);
    putText(wsRes, 2, 1, 'Título del evento'); putText(wsRes, 2, 2, ev.titulo || '');
    putText(wsRes, 3, 1, 'Descripción del evento'); wsRes.mergeCells(3,2,3,5); putText(wsRes, 3, 2, ev.descripcion || '');
    putText(wsRes, 4, 1, 'Fecha inicio'); putText(wsRes, 4, 2, ev.fechaIni || '');
    putText(wsRes, 4, 3, 'Fecha fin'); putText(wsRes, 4, 4, ev.fechaFin || '');
    putText(wsRes, 5, 1, 'Precio evento'); putMoney(wsRes, 5, 2, ev.precio || 0);
    putText(wsRes, 7, 1, 'Ingreso dinero'); putMoney(wsRes, 7, 2, budget.ingresosDinero?.totalIngresado || 0);
    putText(wsRes, 8, 1, 'Ingreso comprometido'); putMoney(wsRes, 8, 2, budget.ingresosDinero?.totalComprometido || 0);
    putText(wsRes, 9, 1, 'Donación de producto'); putMoney(wsRes, 9, 2, budget.donacionProducto?.valorDonado || 0);
    putText(wsRes, 10, 1, 'Gasto por compras'); putMoney(wsRes, 10, 2, budget.operativa?.gastoCompras || 0);
    putText(wsRes, 11, 1, 'Gastos de organización'); putMoney(wsRes, 11, 2, budget.operativa?.gastosOrganizacion || 0);
    putText(wsRes, 12, 1, 'Pendiente de compra'); putMoney(wsRes, 12, 2, budget.operativa?.pendiente || 0);
    putText(wsRes, 13, 1, 'Saldo operativo'); putMoney(wsRes, 13, 2, budget.operativa?.saldoOperativo || 0);

    // INGRESOS
    const wsIng = baseSheet('INGRESOS', [28,10,16,16,16,16]);
    mergeTitle(wsIng, 1, 'INGRESOS', 6);
    titleRow(wsIng, 3, ['Colaborador/a','Número','Tipo ingreso','Importe SOCIO','Importe NO SOCIO','TOTAL']);
    let r = 4;
    collabs.forEach(item => {
      putText(wsIng, r, 1, item.persona?.nombre || '');
      putNum(wsIng, r, 2, item.numero || 0);
      putText(wsIng, r, 3, item.situacion || '');
      putMoney(wsIng, r, 4, item.base || 0);
      putMoney(wsIng, r, 5, item.donation || item.importe || 0);
      putMoney(wsIng, r, 6, item.total || 0, item.situacion === 'Pendiente' ? 'warn' : 'white');
      r += 1;
    });

    // COMPRAS Y OTROS GASTOS
    const wsCom = baseSheet('COMPRAS Y OTROS GASTOS', [30,12,16,16,26,28,28]);
    mergeTitle(wsCom, 1, 'COMPRAS Y OTROS GASTOS', 7);
    titleRow(wsCom, 3, ['Producto','Unidades','Precio','Importe','Ticket u Otros gastos','Tienda','Responsable']);
    r = 4;
    comprasSolo.forEach(item => {
      putText(wsCom, r, 1, item.producto?.nombre || '');
      putNum(wsCom, r, 2, item.unidades || 0);
      putMoney(wsCom, r, 3, item.precioCalc != null ? item.precioCalc : (item.producto?.precio || 0));
      putMoney(wsCom, r, 4, item.valor || 0, String(item.ticketDonacion||'').trim()==='' ? 'warn' : 'white');
      putText(wsCom, r, 5, item.ticketDonacion || '');
      putText(wsCom, r, 6, item.tienda?.nombre || '');
      putText(wsCom, r, 7, item.responsable?.nombre || '');
      r += 1;
    });

    // DONACIONES
    const wsDon = baseSheet('DONACIONES DE PRODUCTO', [26,10,14,14,20,24,24]);
    mergeTitle(wsDon, 1, 'DONACIONES DE PRODUCTO', 7);
    titleRow(wsDon, 3, ['Producto','Unidades','Precio','Valor','Tipo de donación','Donante','Responsable']);
    r = 4;
    donacionesSolo.forEach(item => {
      putText(wsDon, r, 1, item.producto?.nombre || '');
      putNum(wsDon, r, 2, item.unidades || 0);
      putMoney(wsDon, r, 3, item.precioCalc != null ? item.precioCalc : (item.producto?.precio || 0));
      putMoney(wsDon, r, 4, item.valor || 0, item.valor === 0 ? 'warn' : 'white');
      putText(wsDon, r, 5, item.ticketDonacion || '');
      putText(wsDon, r, 6, item.donorLabel || item.tienda?.nombre || '');
      putText(wsDon, r, 7, item.responsable?.nombre || '');
      r += 1;
    });

    // CALCULOS
    const wsSeg = baseSheet('CALCULOS_SEGMENTO', [42,18]);
    mergeTitle(wsSeg, 1, 'CÁLCULOS POR AGRUPACIÓN - SEGMENTO', 2);
    titleRow(wsSeg, 3, ['Concepto','Importe']);
    r = 4;
    segRows.forEach(it => {
      putText(wsSeg, r, 1, it.label || it.k || '', it.pending ? 'warn' : 'white');
      putMoney(wsSeg, r, 2, it.v, it.pending ? 'warn' : 'white');
      r += 1;
    });

    const wsDest = baseSheet('CALCULOS_DESTINO', [42,18]);
    mergeTitle(wsDest, 1, 'CÁLCULOS POR AGRUPACIÓN - DESTINO', 2);
    titleRow(wsDest, 3, ['Concepto','Importe']);
    r = 4;
    destRows.forEach(it => {
      putText(wsDest, r, 1, it.label || it.k || '', it.pending ? 'warn' : 'white');
      putMoney(wsDest, r, 2, it.v, it.pending ? 'warn' : 'white');
      r += 1;
    });

    const wsTienda = baseSheet('CALCULOS_TIENDA_TICKET', [48,18]);
    mergeTitle(wsTienda, 1, 'CÁLCULOS POR AGRUPACIÓN - TIENDA Y TICKET', 2);
    titleRow(wsTienda, 3, ['Concepto','Importe']);
    r = 4;
    tiendaRows.forEach(it => {
      putText(wsTienda, r, 1, it.label || it.k || '', it.pending ? 'warn' : 'white');
      putMoney(wsTienda, r, 2, it.v, it.pending ? 'warn' : 'white');
      r += 1;
    });

    // GRAFICAS: EXACTAMENTE como pantalla (imagen con leyenda/desglose)
    const wsGraf = baseSheet('GRAFICAS', [24,24,24,24]);
    mergeTitle(wsGraf, 1, 'GRÁFICAS DEL EVENTO', 4);
    const chartDataUrl = (typeof makeChartImageDataUrl === 'function')
      ? await makeChartImageDataUrl()
      : ((typeof makeChartDataUrl === 'function') ? await makeChartDataUrl() : null);
    addImageToSheet(wsGraf, chartDataUrl, 3, 1, 1050, 620);

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filenameV152(ev);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  window.xlsxFilename = filenameV152;
})();
