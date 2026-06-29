/* ControlEvent v17_prod FIX15 - Orden final de globos: detalle + total inmediato por grupo.
   No toca fotos, miniaturas, permisos ni adjuntos. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v17_prod';
  const FIX = 'fix15_globos_totalizacion_final';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const cmp = (a,b) => up(a).localeCompare(up(b), 'es', {sensitivity:'base'});
  const $ = id => document.getElementById(id);
  const isMoneyText = v => /-?\d{1,3}(?:\.\d{3})*(?:,\d+)?\s*€|-?\d+(?:[.,]\d+)?\s*€/.test(String(v || ''));
  const num = v => {
    if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = String(v ?? '').replace(/[^0-9,.-]/g,'');
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',', '.');
    else if(s.includes(',')) s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const money = v => {
    try{ if(typeof window.money === 'function') return window.money(Number(v || 0)); }catch(_){ }
    return Number(v || 0).toLocaleString('es-ES', {style:'currency', currency:'EUR'});
  };
  const unitsText = v => Number(v || 0).toLocaleString('es-ES', {maximumFractionDigits:2});

  function stateRef(){ try{ return (typeof state !== 'undefined' && state) || window.state || {}; }catch(_){ return window.state || {}; } }
  function rows(name){ const s = stateRef(); return Array.isArray(s[name]) ? s[name] : []; }
  function currentEventId(){
    try{ const ev = typeof selectedEvent === 'function' ? selectedEvent() : null; if(ev?.id) return String(ev.id); }catch(_){ }
    return String(stateRef().selectedEventId || '');
  }
  function byId(name, id){ return rows(name).find(x => String(x.id || '') === String(id || '')) || {}; }
  function producto(id){ try{ return (typeof productoById === 'function' ? productoById(id) : null) || byId('productos', id); }catch(_){ return byId('productos', id); } }
  function tienda(id){ try{ return (typeof tiendaById === 'function' ? tiendaById(id) : null) || byId('tiendas', id); }catch(_){ return byId('tiendas', id); } }
  function persona(id){ try{ return (typeof personaById === 'function' ? personaById(id) : null) || byId('personas', id); }catch(_){ return byId('personas', id); } }
  function compras(){
    try{ const r = typeof comprasForEvent === 'function' ? comprasForEvent() : null; if(Array.isArray(r)) return r; }catch(_){ }
    const ev = currentEventId();
    return rows('compras').filter(c => String(c.eventId || '') === ev);
  }
  function ticket(c){ return norm(c?.ticketDonacion || c?.ticket || ''); }
  function isDonationTicketCE(v){
    try{ if(typeof isDonationTicket === 'function') return isDonationTicket(v); }catch(_){ }
    return ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'].includes(up(v));
  }
  function isCurrentExpenseTicketCE(v){
    try{ if(typeof isCurrentExpenseTicket === 'function') return isCurrentExpenseTicket(v); }catch(_){ }
    const t = up(v);
    return t === 'GASTOS CORRIENTES' || t === 'GASTOS DE ORGANIZACION' || t === 'GASTOS DE ORGANIZACIÓN';
  }
  function productName(c){ return norm(c?.producto?.nombre || producto(c?.productoId).nombre || c?.productoNombre || c?.producto || 'Producto'); }
  function storeName(c){
    const p = c?.producto || producto(c?.productoId);
    const id = c?.tiendaId || p.tiendaId || p.defaultTiendaId || '';
    return norm(c?.tienda?.nombre || tienda(id).nombre || c?.tiendaNombre || '') || 'Sin tienda';
  }
  function donorName(c){
    try{ if(typeof donorLabel === 'function' && c?.donorRef){ const v = donorLabel(c.donorRef); if(norm(v)) return norm(v); } }catch(_){ }
    const raw = norm(c?.donorRef || c?.donante || c?.donanteNombre || c?.donor || '');
    if(raw.startsWith('P:')) return norm(persona(raw.slice(2)).nombre) || 'Sin donante';
    if(raw.startsWith('T:')) return norm(tienda(raw.slice(2)).nombre) || 'Sin donante';
    return raw || norm(c?.responsable?.nombre || persona(c?.responsableId).nombre) || storeName(c) || 'Sin donante';
  }
  function units(c){ return num(c?.unidades ?? c?.uds ?? 0); }
  function price(c){ const p = c?.producto || producto(c?.productoId); return num(c?.precio ?? c?.precioCalc ?? p.defaultPrecio ?? p.precio ?? 0); }
  function value(c){ return num(c?.valor ?? c?.importe ?? c?.total) || units(c) * price(c); }
  function sum(list, fn){ return (list || []).reduce((a,x) => a + num(fn ? fn(x) : x), 0); }

  function groupDonationRows(list){
    const sorted = (Array.isArray(list) ? list.slice() : []).sort((a,b) => cmp(donorName(a), donorName(b)) || cmp(productName(a), productName(b)) || cmp(storeName(a), storeName(b)));
    const out = ['Donante | Producto | Uds | Precio estimado | Valor estimado'];
    let i = 0;
    while(i < sorted.length){
      const donor = donorName(sorted[i]) || 'Sin donante';
      const group = [];
      while(i < sorted.length && (donorName(sorted[i]) || 'Sin donante') === donor){ group.push(sorted[i]); i += 1; }
      group.sort((a,b) => cmp(productName(a), productName(b)) || cmp(storeName(a), storeName(b)));
      group.forEach(c => out.push(`${donorName(c) || 'Sin donante'} | ${productName(c)} | ${unitsText(units(c))} | ${money(price(c))} | ${money(value(c))}`));
      out.push(`TOTAL ${donor} |  |  |  | ${money(sum(group, value))}`);
    }
    if(out.length === 1) out.push('Sin registros');
    return out;
  }
  function expenseGroupKey(c){
    const tk = ticket(c) || 'Pte.Compra';
    const stn = storeName(c) || 'Sin tienda';
    return `${tk}|||${stn}`;
  }
  function groupExpenseRows(list){
    const sorted = (Array.isArray(list) ? list.slice() : []).sort((a,b) => {
      const [ta,sa] = expenseGroupKey(a).split('|||');
      const [tb,sb] = expenseGroupKey(b).split('|||');
      return cmp(ta,tb) || cmp(sa,sb) || cmp(productName(a), productName(b));
    });
    const out = ['Ticket | Tienda | Producto | Uds | Precio | Total'];
    let i = 0;
    while(i < sorted.length){
      const key = expenseGroupKey(sorted[i]);
      const [tk, stn] = key.split('|||');
      const group = [];
      while(i < sorted.length && expenseGroupKey(sorted[i]) === key){ group.push(sorted[i]); i += 1; }
      group.sort((a,b) => cmp(productName(a), productName(b)) || cmp(storeName(a), storeName(b)));
      group.forEach(c => out.push(`${ticket(c) || 'Pte.Compra'} | ${storeName(c)} | ${productName(c)} | ${unitsText(units(c))} | ${money(price(c))} | ${money(value(c))}`));
      out.push(`TOTAL ${tk}${stn ? ' / ' + stn : ''} |  |  |  |  | ${money(sum(group, value))}`);
    }
    if(out.length === 1) out.push('Sin registros');
    return out;
  }
  function donationTipFromState(title, code){
    const all = compras().filter(c => isDonationTicketCE(ticket(c)) && (!code || up(ticket(c)) === up(code)));
    const total = sum(all, value);
    return `DONACION DE PRODUCTO / ${title}\nTOTAL ESTIMADO: ${money(total)}\n\n${groupDonationRows(all).join('\n')}`;
  }
  function expenseTipFromState(title, list, totalLabel = 'TOTAL'){
    const total = sum(list, value);
    return `${title}\n${totalLabel}: ${money(total)}\n\n${groupExpenseRows(list).join('\n')}`;
  }

  function cellsOfLine(line){ return String(line || '').split('|').map(x => norm(x)); }
  function isTotalRow(cells){ return /^TOTAL\b/i.test(norm(cells[0] || '')) || /^Total\b/.test(norm(cells[0] || '')); }
  function isHeaderRow(cells){ const u = up(cells.join('|')); return /PRODUCTO/.test(u) && (/DONANTE|TICKET|TIENDA|PRECIO|CANT|UDS|TOTAL/.test(u)); }
  function looksDataRow(cells){ return cells && cells.length >= 4 && !isHeaderRow(cells) && !isTotalRow(cells) && !/^SIN\s+REGISTROS|^SIN\s+PRODUCTOS|^\.\.\./i.test(norm(cells[0] || '')); }
  function cleanCells(cells){
    const out = (cells || []).map(x => norm(x));
    if(out.length > 5 && /^(PRODUCTO|PRODUCTOS)$/i.test(out[0])) out.shift();
    return out;
  }
  function parseHeaderAndRows(block){
    const lines = block.map(x => String(x || ''));
    let header = null;
    const data = [];
    lines.forEach(line => {
      const cells = cleanCells(cellsOfLine(line));
      if(!header && isHeaderRow(cells)){ header = cells; return; }
      if(looksDataRow(cells)) data.push(cells);
    });
    return {header, data};
  }
  function inferTableType(header, data){
    const h = up((header || []).join('|'));
    if(/DONANTE/.test(h) && !/TICKET/.test(h)) return 'donation';
    if(/TICKET|TIENDA/.test(h) && /PRODUCTO/.test(h)) return 'expense';
    const first = data.find(x => x && x.length >= 4) || [];
    const c0 = up(first[0] || ''), c1 = up(first[1] || '');
    if(/^(TK\d+|PTE\.?\s*COMPRA|GASTOS\s+CORRIENTES)/.test(c0) || /^(TK\d+|PTE\.?\s*COMPRA|GASTOS\s+CORRIENTES)/.test(c1)) return 'expense';
    return 'donation';
  }
  function normalizeParsedDonation(header, data){
    const h = (header || []).map(up);
    const idxDonor = Math.max(0, h.findIndex(x => x.includes('DONANTE')));
    const idxProduct = h.findIndex(x => x.includes('PRODUCTO')) >= 0 ? h.findIndex(x => x.includes('PRODUCTO')) : 1;
    const idxQty = h.findIndex(x => x.includes('UDS') || x.includes('CANT')) >= 0 ? h.findIndex(x => x.includes('UDS') || x.includes('CANT')) : 2;
    const idxPrice = h.findIndex(x => x.includes('PRECIO')) >= 0 ? h.findIndex(x => x.includes('PRECIO')) : 3;
    const idxTotal = h.findIndex(x => x.includes('TOTAL') || x.includes('VALOR')) >= 0 ? h.findIndex(x => x.includes('TOTAL') || x.includes('VALOR')) : 4;
    const items = data.map(cells => ({
      donor: cells[idxDonor] || cells[0] || 'Sin donante',
      product: cells[idxProduct] || cells[1] || 'Producto',
      qty: cells[idxQty] || cells[2] || '',
      price: cells[idxPrice] || cells[3] || '',
      total: cells[idxTotal] || cells[cells.length - 1] || ''
    })).filter(x => norm(x.donor) && norm(x.product));
    if(!items.length) return null;
    items.sort((a,b) => cmp(a.donor,b.donor) || cmp(a.product,b.product));
    const out = ['Donante | Producto | Uds | Precio estimado | Valor estimado'];
    let i = 0;
    while(i < items.length){
      const donor = items[i].donor || 'Sin donante';
      const group = [];
      while(i < items.length && (items[i].donor || 'Sin donante') === donor){ group.push(items[i]); i += 1; }
      group.sort((a,b) => cmp(a.product,b.product));
      group.forEach(x => out.push(`${x.donor} | ${x.product} | ${x.qty} | ${x.price} | ${x.total}`));
      out.push(`TOTAL ${donor} |  |  |  | ${money(sum(group, x => num(x.total)))}`);
    }
    return out;
  }
  function normalizeParsedExpense(header, data){
    const h = (header || []).map(up);
    let idxTicket = h.findIndex(x => x.includes('TICKET'));
    let idxStore = h.findIndex(x => x.includes('TIENDA'));
    let idxProduct = h.findIndex(x => x.includes('PRODUCTO'));
    let idxQty = h.findIndex(x => x.includes('UDS') || x.includes('CANT'));
    let idxPrice = h.findIndex(x => x.includes('PRECIO'));
    let idxTotal = h.findIndex(x => x === 'TOTAL' || x.includes('TOTAL'));
    if(idxTicket < 0 || idxStore < 0 || idxProduct < 0){
      const first = data.find(x => x.length >= 5) || [];
      const c0 = up(first[0] || ''), c1 = up(first[1] || '');
      if(/^(TK\d+|PTE\.?\s*COMPRA|GASTOS\s+CORRIENTES)/.test(c0)){ idxTicket = 0; idxStore = 1; idxProduct = 2; }
      else if(/^(TK\d+|PTE\.?\s*COMPRA|GASTOS\s+CORRIENTES)/.test(c1)){ idxStore = 0; idxTicket = 1; idxProduct = 2; }
      else { idxTicket = 0; idxStore = 1; idxProduct = 2; }
    }
    if(idxQty < 0) idxQty = 3;
    if(idxPrice < 0) idxPrice = 4;
    if(idxTotal < 0) idxTotal = 5;
    const items = data.map(cells => ({
      ticket: cells[idxTicket] || 'Pte.Compra',
      store: cells[idxStore] || 'Sin tienda',
      product: cells[idxProduct] || 'Producto',
      qty: cells[idxQty] || '',
      price: cells[idxPrice] || '',
      total: cells[idxTotal] || cells[cells.length - 1] || ''
    })).filter(x => norm(x.product));
    if(!items.length) return null;
    items.sort((a,b) => cmp(a.ticket,b.ticket) || cmp(a.store,b.store) || cmp(a.product,b.product));
    const out = ['Ticket | Tienda | Producto | Uds | Precio | Total'];
    let i = 0;
    while(i < items.length){
      const tk = items[i].ticket || 'Pte.Compra';
      const stn = items[i].store || 'Sin tienda';
      const key = `${tk}|||${stn}`;
      const group = [];
      while(i < items.length && `${items[i].ticket || 'Pte.Compra'}|||${items[i].store || 'Sin tienda'}` === key){ group.push(items[i]); i += 1; }
      group.sort((a,b) => cmp(a.product,b.product));
      group.forEach(x => out.push(`${x.ticket} | ${x.store} | ${x.product} | ${x.qty} | ${x.price} | ${x.total}`));
      out.push(`TOTAL ${tk}${stn ? ' / ' + stn : ''} |  |  |  |  | ${money(sum(group, x => num(x.total)))}`);
    }
    return out;
  }
  function normalizeTableBlock(block){
    const parsed = parseHeaderAndRows(block);
    if(!parsed.data.length) return block;
    const hText = up((parsed.header || []).join('|'));
    const hasProduct = /PRODUCTO/.test(hText) || parsed.data.some(c => c.length >= 5 && (isMoneyText(c[c.length - 1]) || /^TK\d+/i.test(c[0] || '') || /^TK\d+/i.test(c[1] || '')));
    if(!hasProduct) return block;
    const type = inferTableType(parsed.header, parsed.data);
    return (type === 'expense' ? normalizeParsedExpense(parsed.header, parsed.data) : normalizeParsedDonation(parsed.header, parsed.data)) || block;
  }
  function normalizeTextTables(text){
    const original = String(text ?? '');
    if(!original.includes('|')) return original;
    const lines = original.split('\n');
    const out = [];
    let block = [];
    const flush = () => {
      if(!block.length) return;
      out.push(...normalizeTableBlock(block));
      block = [];
    };
    lines.forEach(line => {
      if(line.includes('|')) block.push(line);
      else { flush(); out.push(line); }
    });
    flush();
    let result = out.join('\n');
    // Limpia restos de truncado si el bloque ya ha sido regenerado desde lo que hay.
    result = result.replace(/^\.\.\.\s*\d+\s+registros\s+m[aá]s\s*$/gmi, '').replace(/\n{3,}/g, '\n\n');
    return result;
  }
  function inferDonationCodeFromText(text){
    const t = up(text);
    if(/NO\s+SOCIO/.test(t)) return ['NO SOCIOS','DONADO OTROS'];
    if(/TIENDA/.test(t)) return ['TIENDAS','DONADO TIENDA'];
    if(/SOCIO/.test(t)) return ['SOCIOS','DONADO SOCIO'];
    return ['TOTAL',''];
  }
  function normalizeTipText(text){
    let raw = String(text ?? '');
    const u = up(raw);
    const firstLineRaw = raw.split('\n').find(line => norm(line)) || '';
    const first = up(firstLineRaw);
    try{
      // Solo sustituye por datos de estado cuando el globo ES de donación.
      // No invade métricas como SALDO o VALORACION, que pueden contener una sección interna de donaciones.
      if((/DONACI[OÓ]N\s+DE\s+PRODUCTO/.test(first) || /^DONADO\b/.test(first)) && !/SALDO|VALORACION/.test(first)){
        const [title, code] = inferDonationCodeFromText(raw);
        const fromState = donationTipFromState(title, code);
        if((compras() || []).some(c => isDonationTicketCE(ticket(c)))) return fromState;
      }
      // Solo sustituye por datos de estado cuando el globo ES de gasto/operativa.
      // En SALDO/VALORACION se normalizan las tablas internas sin destruir la explicación.
      const isExpenseTitle = /^(OPERATIVA|GASTOS|GASTADO|PTE\.?\s*COMPRA|PENDIENTE\s+DE\s+COMPRA)/.test(first);
      if(isExpenseTitle && /PTE\.?\s*COMPRA|PENDIENTE\s+DE\s+COMPRA|GASTOS\s+REALIZADOS|GASTOS\s+PREVISTOS|GASTADO\s+POR\s+TICKET|GASTOS\s+CORRIENTES/.test(u)){
        const all = compras().filter(c => !isDonationTicketCE(ticket(c)));
        let list = all;
        let title = firstLineRaw || 'OPERATIVA / GASTOS';
        if(/PTE\.?\s*COMPRA|PENDIENTE\s+DE\s+COMPRA/.test(first)){ list = all.filter(c => !ticket(c)); title = title.includes('OPERATIVA') ? title : 'OPERATIVA / PTE. COMPRA U OTROS GASTOS'; }
        else if(/GASTOS\s+CORRIENTES/.test(first)){ list = all.filter(c => isCurrentExpenseTicketCE(ticket(c))); }
        else if(/GASTADO\s+POR\s+TICKET|GASTOS\s+REALIZADOS/.test(first)){ list = all.filter(c => ticket(c) && !isCurrentExpenseTicketCE(ticket(c))); }
        else if(/GASTOS\s+PREVISTOS/.test(first)){ list = all; }
        if(list.length) return expenseTipFromState(title, list, 'TOTAL');
      }
    }catch(_){ }
    return normalizeTextTables(raw);
  }

  // Normaliza cualquier atributo de globo que se cree a partir de ahora.
  function patchSetAttribute(){
    try{
      const proto = Element.prototype;
      if(proto.setAttribute.__ceFix15Globos) return;
      const native = proto.setAttribute;
      const wrapped = function(name, value){
        if(String(name || '') === 'data-ce-tip-v21'){
          try{ value = normalizeTipText(value); }catch(_){ }
        }
        return native.call(this, name, value);
      };
      wrapped.__ceFix15Globos = true;
      proto.setAttribute = wrapped;
    }catch(_){ }
  }
  function scanExistingTips(root){
    try{
      const nodes = [];
      if(root?.nodeType === 1 && root.hasAttribute?.('data-ce-tip-v21')) nodes.push(root);
      (root || document).querySelectorAll?.('[data-ce-tip-v21]')?.forEach(el => nodes.push(el));
      nodes.forEach(el => {
        const current = el.getAttribute('data-ce-tip-v21') || '';
        const next = normalizeTipText(current);
        if(next && next !== current){
          el.dataset.ceFix15Tip = '1';
          el.setAttribute('data-ce-tip-v21', next);
        }
      });
    }catch(_){ }
  }

  function setTipDeep(el, text, bg, layout){
    if(!el || !norm(text)) return;
    [el, ...el.querySelectorAll?.('*') || []].forEach(node => {
      try{
        node.setAttribute('data-ce-tip-v21', text);
        if(bg) node.setAttribute('data-tip-bg-v21', bg);
        if(layout) node.setAttribute('data-ce-tip-layout-v21', layout);
        node.removeAttribute('data-ce-tip-lazy-v250');
        node.removeAttribute('title');
      }catch(_){ }
    });
  }
  function rowsForGroup(kind, label, bucket){
    const lab = up(label);
    return compras().filter(c => {
      const p = c?.producto || producto(c?.productoId);
      const val = kind === 'segmento' ? (c?.producto?.segmento || p.segmento || '') : (c?.producto?.destino || p.destino || '');
      if(up(val) !== lab) return false;
      const tk = ticket(c);
      if(bucket === 'donado') return isDonationTicketCE(tk);
      if(bucket === 'pendiente') return !isDonationTicketCE(tk) && !tk;
      if(bucket === 'comprado') return !isDonationTicketCE(tk) && tk;
      return true;
    });
  }
  function applyGroupingTooltips(){
    [
      ['summarySegmento', 'segmento', 'CALCULOS POR AGRUPACION / POR SEGMENTO'],
      ['summaryDestino', 'destino', 'CALCULOS POR AGRUPACION / POR DESTINO']
    ].forEach(([id, kind, title]) => {
      const wrap = $(id);
      if(!wrap) return;
      wrap.querySelectorAll('.vbars-card').forEach(card => {
        const label = norm((card.querySelector('.vbars-title')?.textContent || '').split('·')[0]);
        if(!label) return;
        card.querySelectorAll('[data-v24-kind]').forEach(el => {
          const bucket = el.getAttribute('data-v24-kind');
          if(!bucket) return;
          const list = rowsForGroup(kind, label, bucket);
          let text = '';
          let bg = el.getAttribute('data-tip-bg-v21') || getComputedStyle(el).backgroundColor || '#fff';
          if(bucket === 'donado') text = `DONACION DE PRODUCTO / ${label}\nTOTAL ESTIMADO: ${money(sum(list, value))}\n\n${groupDonationRows(list).join('\n')}`;
          else text = `${title}\n${label}\n${bucket === 'pendiente' ? 'Pte. Compra u otros gastos' : 'Comprado'}\nTOTAL: ${money(sum(list, value))}\n\n${groupExpenseRows(list).join('\n')}`;
          setTipDeep(el, text, bg, bucket === 'pendiente' ? 'ticketpendingv251' : 'groupingfix15');
        });
      });
    });
  }
  function graphTipTargets(row){
    if(!row) return [];
    const segs = Array.from(row.querySelectorAll('.chart-seg'));
    if(segs.length) return segs;
    const hits = Array.from(row.querySelectorAll('.ce-v434-pie-hit'));
    if(hits.length) return hits;
    return Array.from(row.querySelectorAll('.ce-v434-pie-slice'));
  }
  function applyGraphTooltips(){
    const wrap = $('eventChartWrap');
    if(!wrap) return;
    const chartRows = Array.from(wrap.querySelectorAll('.chart-row'));
    const donationRow = chartRows.find(r => /DONACI/i.test(r.querySelector('.chart-label')?.textContent || ''));
    if(donationRow){
      const segs = graphTipTargets(donationRow);
      [
        ['TIENDAS','DONADO TIENDA', '#fcd34d'],
        ['SOCIOS','DONADO SOCIO', '#f59e0b'],
        ['NO SOCIOS','DONADO OTROS', '#b45309']
      ].forEach(([title, code, color], idx) => {
        const seg = segs[idx];
        if(seg) setTipDeep(seg, donationTipFromState(title, code), color, 'graphdonationfix15');
      });
    }
    const expenseRow = chartRows.find(r => /GASTOS/i.test(r.querySelector('.chart-label')?.textContent || ''));
    if(expenseRow){
      const all = compras().filter(c => !isDonationTicketCE(ticket(c)));
      const buckets = [
        ['Gastado por ticket', all.filter(c => ticket(c) && !isCurrentExpenseTicketCE(ticket(c))), '#dc2626'],
        ['Gastos corrientes', all.filter(c => isCurrentExpenseTicketCE(ticket(c))), '#ef4444'],
        ['Pendiente de compra', all.filter(c => !ticket(c)), '#fb7185']
      ];
      const segs = graphTipTargets(expenseRow);
      buckets.forEach(([title, list, color], idx) => {
        const seg = segs[idx];
        if(seg) setTipDeep(seg, expenseTipFromState(`GASTOS / ${title}`, list), color, title.includes('Pendiente') ? 'ticketpendingv251' : 'graphexpensefix15');
      });
    }
  }
  function applyBudgetRowTips(){
    const panel = $('budgetLayout');
    if(!panel) return;
    const donation = panel.querySelector('.budget-panel.donantes,.budget-panel.ce-v306-donantes-lite');
    if(donation){
      donation.querySelectorAll('.budget-subrow').forEach(row => {
        const label = up(row.textContent || '');
        let title = '', code = '';
        if(label.includes('TIENDA')){ title = 'TIENDAS'; code = 'DONADO TIENDA'; }
        else if(label.includes('NO SOCIO')){ title = 'NO SOCIOS'; code = 'DONADO OTROS'; }
        else if(label.includes('SOCIO')){ title = 'SOCIOS'; code = 'DONADO SOCIO'; }
        if(code) setTipDeep(row, donationTipFromState(title, code), '#f59e0b', 'budgetdonationfix15');
      });
      const totalRow = Array.from(donation.querySelectorAll('.budget-row')).find(row => /VALOR\s+PRODUCTO\s+DONADO/i.test(row.textContent || ''));
      if(totalRow) setTipDeep(totalRow, donationTipFromState('TOTAL', ''), '#f59e0b', 'budgetdonationfix15');
    }
    const op = panel.querySelector('.budget-panel.operativo');
    if(op){
      const all = compras().filter(c => !isDonationTicketCE(ticket(c)));
      op.querySelectorAll('.budget-row').forEach(row => {
        const t = up(row.textContent || '');
        let list = null, title = '';
        if(t.includes('PTE')){ list = all.filter(c => !ticket(c)); title = 'OPERATIVA / PTE. COMPRA U OTROS GASTOS'; }
        else if(t.includes('GASTOS REALIZADOS')){ list = all.filter(c => ticket(c)); title = 'OPERATIVA / GASTOS REALIZADOS'; }
        else if(t.includes('GASTOS PREVISTOS')){ list = all; title = 'OPERATIVA / GASTOS PREVISTOS'; }
        if(list) setTipDeep(row, expenseTipFromState(title, list), t.includes('PTE') ? '#fb7185' : '#fff', t.includes('PTE') ? 'ticketpendingv251' : 'budgetexpensefix15');
      });
    }
  }

  function fixBudgetLiteModal(){
    const box = $('ceBudgetLiteTooltipV307');
    if(!box || !box.classList.contains('open')) return;
    const table = box.querySelector('table.ce-budget-lite-table');
    if(!table || table.dataset.ceFix15Done === '1') return;
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => norm(th.textContent));
    const bodyRows = Array.from(table.querySelectorAll('tbody tr')).map(tr => Array.from(tr.children).map(td => norm(td.textContent)));
    const normalized = normalizeTableBlock([headers.join(' | '), ...bodyRows.map(r => r.join(' | '))]);
    if(!normalized || normalized.length <= 1) return;
    const newHeader = cellsOfLine(normalized[0]);
    const newRows = normalized.slice(1).map(cellsOfLine);
    const thead = table.querySelector('thead tr');
    if(thead) thead.innerHTML = newHeader.map(h => `<th>${esc(h)}</th>`).join('');
    const tbody = table.querySelector('tbody');
    if(tbody){
      tbody.innerHTML = newRows.map(cells => {
        const total = /^TOTAL\b/i.test(cells[0] || '');
        return `<tr${total ? ' class="ce-fix15-total-row"' : ''}>${cells.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`;
      }).join('');
    }
    table.dataset.ceFix15Done = '1';
  }
  function injectStyles(){
    if($('ceFix15GlobosStyle')) return;
    const stl = document.createElement('style');
    stl.id = 'ceFix15GlobosStyle';
    stl.textContent = `
      #ceBudgetLiteTooltipV307 .ce-fix15-total-row td{font-weight:900!important;background:rgba(255,255,255,.32)!important;}
      #ceTooltipV21 .ce-v21-table tr td:first-child{font-weight:800;}
    `;
    document.head.appendChild(stl);
  }
  function applyAll(reason){
    try{ injectStyles(); }catch(_){ }
    try{ scanExistingTips(document); }catch(_){ }
    try{ applyGraphTooltips(); }catch(_){ }
    try{ applyGroupingTooltips(); }catch(_){ }
    try{ applyBudgetRowTips(); }catch(_){ }
    try{ fixBudgetLiteModal(); }catch(_){ }
    try{ document.title = VERSION; }catch(_){ }
  }
  function patchRenderers(){
    ['render','renderGraficas','renderBudget'].forEach(name => {
      try{
        const fn = window[name] || (typeof globalThis[name] === 'function' ? globalThis[name] : null);
        if(!fn || fn.__ceFix15Wrapped) return;
        const wrapped = function(){
          const ret = fn.apply(this, arguments);
          setTimeout(() => applyAll(name), 20);
          setTimeout(() => applyAll(name), 180);
          return ret;
        };
        wrapped.__ceFix15Wrapped = true;
        window[name] = wrapped;
        try{ globalThis[name] = wrapped; }catch(_){ }
      }catch(_){ }
    });
  }
  function installObserver(){
    try{
      if(window.__ceFix15Observer) return;
      const obs = new MutationObserver(muts => {
        let need = false;
        muts.forEach(m => {
          if(m.type === 'attributes' && m.attributeName === 'data-ce-tip-v21') need = true;
          if(m.type === 'childList' && (m.addedNodes || []).length) need = true;
        });
        if(need){ clearTimeout(window.__ceFix15Timer); window.__ceFix15Timer = setTimeout(() => applyAll('mutation'), 60); }
      });
      obs.observe(document.documentElement, {subtree:true, childList:true, attributes:true, attributeFilter:['data-ce-tip-v21','class']});
      window.__ceFix15Observer = obs;
    }catch(_){ }
  }

  patchSetAttribute();
  patchRenderers();
  installObserver();
  applyAll('startup');
  [80, 250, 700, 1400, 2600].forEach(ms => setTimeout(() => { patchRenderers(); applyAll('timer'); }, ms));
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready','controlevent:module-mounted','controlevent:event-ready'].forEach(evt => {
    window.addEventListener(evt, () => setTimeout(() => { patchRenderers(); applyAll(evt); }, 80));
  });
  document.addEventListener('click', () => setTimeout(() => applyAll('click'), 30), true);
  window.ControlEventFix15Globos = {version: VERSION, fix: FIX, apply: applyAll, normalizeTipText};
})();
