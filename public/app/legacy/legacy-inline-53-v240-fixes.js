/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #53. */
/* ==== v24.0: tienda/ticket pendiente, graficas limpias, orden ingresos y fotos INFOEVENTO ==== */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v26.6';
  const VERSION_FILE = 'ControlEvent_v26_6';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ');
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function parseNum(v){
    if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = String(v ?? '').trim();
    if(!s) return 0;
    s = s.replace(/[^0-9,.-]/g,'');
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',', '.');
    else if(s.includes(',')) s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  const money = v => parseNum(v).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
  const numText = v => parseNum(v).toLocaleString('es-ES',{minimumFractionDigits:0,maximumFractionDigits:2});
  const cmp = (a,b) => up(a).localeCompare(up(b),'es');
  function st(){ try{ return (typeof state !== 'undefined' && state) || window.state || {}; }catch(_){ return window.state || {}; } }
  function arr(k){ const s = st(); return Array.isArray(s[k]) ? s[k] : []; }
  function byId(k,id){ return arr(k).find(x => String(x.id) === String(id)) || {}; }
  function currentEvent(){
    try{ if(typeof selectedEvent === 'function'){ const e = selectedEvent(); if(e) return e; } }catch(_){ }
    return byId('eventos', st().selectedEventId);
  }
  function eventId(){ const e = currentEvent(); return String(e.id || st().selectedEventId || ''); }
  function persona(id){ try{ return (typeof personaById === 'function' ? personaById(id) : null) || byId('personas',id); }catch(_){ return byId('personas',id); } }
  function producto(id){ try{ return (typeof productoById === 'function' ? productoById(id) : null) || byId('productos',id); }catch(_){ return byId('productos',id); } }
  function tienda(id){ try{ return (typeof tiendaById === 'function' ? tiendaById(id) : null) || byId('tiendas',id); }catch(_){ return byId('tiendas',id); } }
  function compras(){
    try{ const rows = typeof comprasForEvent === 'function' ? comprasForEvent() : null; if(Array.isArray(rows)) return rows; }catch(_){ }
    const id = eventId();
    return arr('compras').filter(c => String(c.eventId || '') === id).map(c => ({...c, producto: producto(c.productoId), tienda: tienda(c.tiendaId), responsable: persona(c.responsableId)}));
  }
  function colaboradores(){
    try{ const rows = typeof collabsForEvent === 'function' ? collabsForEvent() : null; if(Array.isArray(rows)) return rows; }catch(_){ }
    const id = eventId();
    return arr('colaboradores').filter(c => String(c.eventId || '') === id).map(c => ({...c, persona: persona(c.personaId)}));
  }
  function productName(c){ return norm(c?.producto?.nombre || producto(c?.productoId).nombre || c?.productoNombre || 'Producto'); }
  function storeName(c){
    const p = producto(c?.productoId);
    const id = c?.tiendaId || p.tiendaId || p.defaultTiendaId || '';
    const name = norm(c?.tienda?.nombre || tienda(id).nombre || '');
    return name || 'Sin tienda asignada';
  }
  function donorName(c){
    try{ if(typeof donorLabel === 'function' && c?.donorRef){ const d = donorLabel(c.donorRef); if(norm(d)) return norm(d); } }catch(_){ }
    const raw = norm(c?.donorRef || c?.donante || c?.donanteNombre || '');
    if(raw.startsWith('P:')) return persona(raw.slice(2)).nombre || 'Sin donante';
    if(raw.startsWith('T:')) return tienda(raw.slice(2)).nombre || 'Sin donante';
    return raw || c?.donorLabel || c?.responsable?.nombre || storeName(c) || 'Sin donante';
  }
  function ticket(c){ return norm(c?.ticketDonacion || c?.ticket || ''); }
  function isDonation(v){ try{ return typeof isDonationTicket === 'function' ? isDonationTicket(v) : up(v).startsWith('DONADO'); }catch(_){ return up(v).startsWith('DONADO'); } }
  function isCurrent(v){ try{ return typeof isCurrentExpenseTicket === 'function' ? isCurrentExpenseTicket(v) : up(v) === 'GASTOS CORRIENTES'; }catch(_){ return up(v) === 'GASTOS CORRIENTES'; } }
  function units(c){ return parseNum(c?.unidades ?? c?.uds ?? 0); }
  function price(c){ const p = producto(c?.productoId); return parseNum(c?.precio ?? c?.precioCalc ?? p.defaultPrecio ?? p.precio ?? 0); }
  function value(c){ return parseNum(c?.valor ?? c?.importe) || units(c) * price(c); }
  function ticketImageKey(label, id = eventId()){
    try{ if(typeof ticketImageStateKey === 'function') return ticketImageStateKey(label, id); }catch(_){ }
    return `${id}|${label}`;
  }
  function cleanLabel(label){ return norm(label).split('·')[0].split('·')[0].trim(); }
  function ticketToken(label){
    const m = up(label).match(/\b(?:TK|TICKET)\s*[-_]*\s*[A-Z0-9]+\b/);
    return m ? m[0].replace(/\s+/g,'') : '';
  }
  function imageValue(ref){
    if(!ref) return '';
    if(typeof ref === 'string') return norm(ref);
    if(typeof ref === 'object') return norm(ref.dataUrl || ref.base64 || ref.url || ref.public_url || ref.publicUrl || ref.pathname || ref.path || ref.href || '');
    return '';
  }
  function imageCandidates(label){
    const id = eventId();
    const base = norm(label);
    const clean = cleanLabel(base);
    const out = [];
    const add = v => { v = norm(v); if(v && !out.includes(v)) out.push(v); };
    [base, clean, ticketImageKey(base,id), ticketImageKey(clean,id), `${id}|${base}`, `${id}|${clean}`].forEach(add);
    const parts = clean.split('|').map(x => norm(x)).filter(Boolean);
    if(parts.length >= 2){
      const a = parts[0], b = parts[1];
      [`${a}|${b}`, `${a} | ${b}`, `${b}|${a}`, `${b} | ${a}`, b].forEach(x => { add(x); add(ticketImageKey(x,id)); });
    }
    const tk = ticketToken(base);
    if(tk){ add(tk); add(ticketImageKey(tk,id)); add(`${id}|${tk}`); }
    return out;
  }
  function imageRefFor(label){
    const s = st();
    const stores = [s.ticketImages || {}, s.ticketImageRefs || {}];
    for(const key of imageCandidates(label)){
      for(const bag of stores){ const found = imageValue(bag[key]); if(found) return found; }
    }
    const tk = ticketToken(label);
    const parts = cleanLabel(label).split('|').map(x=>up(x)).filter(Boolean);
    const wantStore = parts[0] || '';
    const id = eventId();
    for(const bag of stores){
      for(const [k,v] of Object.entries(bag)){
        const ks = String(k);
        if(id && ks.includes('|') && !ks.startsWith(id + '|')) continue;
        const rest = up(ks.replace(id + '|',''));
        if(tk && rest.includes(tk) && (!wantStore || rest.includes(wantStore))){
          const found = imageValue(v);
          if(found) return found;
        }
      }
    }
    return '';
  }
  function setTip(el, text, bg = '#fff', layout = 'default'){
    if(!el || !norm(text)) return;
    el.setAttribute('data-ce-tip-v21', text);
    el.setAttribute('data-tip-bg-v21', bg || '#fff');
    el.setAttribute('data-ce-tip-layout-v21', layout || 'default');
    el.dataset.v24Tip = '1';
    ['title','data-tip','data-ce-tip','data-v181-tip','data-ce-tip-v196','data-ce-tip-v1952'].forEach(a => el.removeAttribute(a));
  }
  function clearTip(el){
    if(!el) return;
    ['title','data-tip','data-ce-tip','data-v181-tip','data-ce-tip-v196','data-ce-tip-v1952','data-ce-tip-v21','data-tip-bg-v21','data-ce-tip-layout-v21'].forEach(a => el.removeAttribute(a));
    if(el.dataset) delete el.dataset.v24Tip;
  }
  function lineForPurchase(c, first){
    return `${first} | ${storeName(c)} | ${productName(c)} | ${numText(units(c))} | ${money(price(c))} | ${money(value(c))}`;
  }
  function summaryByTiendaTicketV240(){
    const filled = new Map();
    const pending = new Map();
    compras().forEach(c => {
      const tk = ticket(c);
      const v = value(c);
      const donated = isDonation(tk);
      if(!donated && (!tk || isCurrent(tk))){
        const key = `${storeName(c)} | Pte. Compra u otros gastos`;
        if(!pending.has(key)) pending.set(key, {k:key,label:key,v:0,rawTicket:'',pending:true,donated:false,attachable:false,lines:[],products:[]});
        const rec = pending.get(key);
        rec.v += v;
        rec.lines.push(lineForPurchase(c, tk || 'PTE.COMPRA'));
        rec.products.push(productName(c));
        return;
      }
      const holder = donated ? donorName(c) : storeName(c);
      const key = `${holder} | ${tk || 'Pte. Compra u otros gastos'}`;
      if(!filled.has(key)) filled.set(key, {k:key,label:key,v:0,rawTicket:tk,pending:false,donated,attachable:!donated,lines:[],products:[]});
      const rec = filled.get(key);
      rec.v += v;
      rec.donated = rec.donated || donated;
      rec.attachable = rec.attachable && !donated && !isCurrent(tk);
      rec.products.push(productName(c));
      rec.lines.push(donated
        ? `${donorName(c)} | ${productName(c)} | ${numText(units(c))} | ${money(price(c))} | ${money(v)}`
        : lineForPurchase(c, tk || 'PTE.COMPRA'));
    });
    const rows = [...filled.values(), ...pending.values()].map(r => {
      const products = Array.from(new Set((r.products || []).filter(Boolean)));
      const label = r.donated && products.length ? `${r.k} · ${products.join(' · ')}` : r.k;
      return {...r, label, image: r.attachable ? imageRefFor(r.k) : ''};
    });
    const sortMode = st().summaryTiendaSort || 'tienda';
    rows.sort((a,b) => {
      const [ta='',tka=''] = String(a.k||'').split(' | ');
      const [tb='',tkb=''] = String(b.k||'').split(' | ');
      if(sortMode === 'ticket') return cmp(tka,tkb) || cmp(ta,tb);
      return cmp(ta,tb) || cmp(tka,tkb);
    });
    return rows;
  }
  function ticketTip(row){
    const title = row.pending ? 'CALCULOS POR AGRUPACION / POR TIENDA Y TICKET / PTE. COMPRA U OTROS GASTOS' : (row.donated ? 'CALCULOS POR AGRUPACION / POR DONANTE Y DONACION' : 'CALCULOS POR AGRUPACION / POR TIENDA Y TICKET');
    const header = row.donated ? 'Donante | Producto | Uds | Precio estimado | Valor estimado' : 'Ticket/Otros gastos | Tienda | Producto | Uds | Precio | Total';
    const totalLabel = row.donated ? 'TOTAL ESTIMADO' : 'TOTAL';
    const lines = (row.lines || []).filter(Boolean);
    return `${title}\n${row.k || row.label || ''}\n${totalLabel}: ${money(row.v)}\n\n${header}\n${lines.length ? lines.join('\n') : 'Sin productos'}`;
  }
  function renderTiendaTicketV240(targetId, rows){
    const wrap = $(targetId);
    if(!wrap) return;
    rows = Array.isArray(rows) ? rows : summaryByTiendaTicketV240();
    wrap.innerHTML = '';
    const tools = document.createElement('div');
    tools.className = 'hint ce-v24-sortbar';
    const mode = st().summaryTiendaSort || 'tienda';
    tools.innerHTML = `<span>Ordenar por:</span><button type="button" class="outline small ${mode==='tienda'?'active':''}" data-v24-summary-sort="tienda">Tienda</button><button type="button" class="outline small ${mode==='ticket'?'active':''}" data-v24-summary-sort="ticket">Ticket/Donacion/Otros gastos</button>`;
    wrap.appendChild(tools);
    if(!rows.length){
      const empty = document.createElement('div');
      empty.className = 'hint';
      empty.textContent = 'Sin datos.';
      wrap.appendChild(empty);
      return;
    }
    let total = 0;
    rows.forEach(r => {
      total += parseNum(r.v);
      const div = document.createElement('div');
      div.className = 'summary-item' + (r.pending ? ' red-row' : '');
      const amountStyle = r.pending ? ' style="background:#fef2f2;color:#b91c1c"' : (r.donated ? ' style="text-decoration:line-through"' : '');
      const encoded = encodeURIComponent(r.k || r.label || '');
      const img = r.attachable ? imageRefFor(r.k || r.label || '') : '';
      const preview = img ? `<img class="ticket-thumb" src="${esc(img)}" alt="ticket" />` : '<span class="hint">Sin imagen</span>';
      const actions = r.attachable && !r.pending
        ? `<span class="ticket-actions"><button type="button" class="outline small" title="Insertar foto" onclick="uploadTicketImage('${encoded}'); return false;">Adjuntar</button>${preview}${img ? `<button type="button" class="outline small" title="Eliminar foto" onclick="removeTicketImage('${encoded}'); return false;">Eliminar</button>` : ''}</span>`
        : '';
      div.innerHTML = `<span>${esc(r.label || r.k || '')}</span><span style="display:flex;align-items:center;gap:8px;justify-content:flex-end;"><span class="pill"${amountStyle}>${esc(money(r.v))}</span>${actions}</span>`;
      const tip = ticketTip(r);
      setTip(div, tip, '#fff', r.pending ? 'ticketpendingv240' : (r.donated ? 'ticketdonationv240' : 'ticketpurchasev240'));
      div.querySelectorAll(':scope > span').forEach(el => setTip(el, tip, '#fff', r.pending ? 'ticketpendingv240' : (r.donated ? 'ticketdonationv240' : 'ticketpurchasev240')));
      wrap.appendChild(div);
    });
    const totalDiv = document.createElement('div');
    totalDiv.className = 'summary-item';
    totalDiv.style.fontWeight = '800';
    totalDiv.innerHTML = `<span>TOTAL</span><span class="pill">${esc(money(total))}</span>`;
    wrap.appendChild(totalDiv);
  }
  function groupingKeys(kind){
    try{
      const base = kind === 'segmento' ? SEGMENT_OPTIONS : DESTINO_OPTIONS;
      if(Array.isArray(base) && base.length) return base.slice();
    }catch(_){ }
    const set = new Set();
    compras().forEach(c => {
      const p = producto(c.productoId);
      const val = kind === 'segmento' ? (c.producto?.segmento || p.segmento || '') : (c.producto?.destino || p.destino || '');
      if(norm(val)) set.add(norm(val));
    });
    return Array.from(set).sort(cmp);
  }
  function groupRowsV240(kind){
    const all = compras();
    return groupingKeys(kind).map(label => {
      const rows = all.filter(c => {
        const p = producto(c.productoId);
        const val = kind === 'segmento' ? (c.producto?.segmento || p.segmento || '') : (c.producto?.destino || p.destino || '');
        return String(val) === String(label);
      });
      const comprados = rows.filter(c => !isDonation(ticket(c)) && ticket(c) && !isCurrent(ticket(c)));
      const donados = rows.filter(c => isDonation(ticket(c)));
      const pendientes = rows.filter(c => !isDonation(ticket(c)) && (!ticket(c) || isCurrent(ticket(c))));
      const sum = list => list.reduce((a,c)=>a+value(c),0);
      return {
        label,
        comprado: sum(comprados),
        donado: sum(donados),
        pendiente: sum(pendientes),
        total: sum(comprados) + sum(donados) + sum(pendientes),
        listComprado: comprados.map(c => lineForPurchase(c, ticket(c))).sort(cmp),
        listDonado: donados.map(c => `${donorName(c)} | ${productName(c)} | ${numText(units(c))} | ${money(price(c))} | ${money(value(c))}`).sort(cmp),
        listPendiente: pendientes.map(c => lineForPurchase(c, ticket(c) || 'PTE.COMPRA')).sort(cmp)
      };
    });
  }
  function groupTip(title, row, spec){
    const lines = (row[spec.list] || []).filter(Boolean);
    const header = spec.key === 'donado' ? 'Donante | Producto | Uds | Precio estimado | Valor estimado' : 'Ticket/Otros gastos | Tienda | Producto | Uds | Precio | Total';
    return `${title}\n${row.label}\n${spec.label}\n${spec.totalLabel}: ${money(row[spec.key])}\n\n${header}\n${lines.length ? lines.join('\n') : 'Sin productos'}`;
  }
  function renderGroupingBarsV240(targetId, rows){
    const wrap = $(targetId);
    if(!wrap) return;
    rows = Array.isArray(rows) ? rows : (targetId === 'summarySegmento' ? groupRowsV240('segmento') : groupRowsV240('destino'));
    const title = targetId === 'summarySegmento' ? 'Por segmento' : 'Por destino';
    const pageTitle = targetId === 'summarySegmento' ? 'CALCULOS POR AGRUPACION / POR SEGMENTO' : 'CALCULOS POR AGRUPACION / POR DESTINO';
    const specs = [
      {label:'Comprado', key:'comprado', list:'listComprado', color:'#dc2626', layout:'groupingv240buy', totalLabel:'TOTAL'},
      {label:'Donado', key:'donado', list:'listDonado', color:'#f59e0b', layout:'groupingv240don', totalLabel:'TOTAL ESTIMADO'},
      {label:'Pte. Compra u otros gastos', key:'pendiente', list:'listPendiente', color:'#fb7185', layout:'groupingv240pending', totalLabel:'TOTAL'}
    ];
    const visibleRows = rows.filter(r => specs.some(s => parseNum(r[s.key]) !== 0));
    const maxVal = Math.max(1, ...visibleRows.flatMap(r => specs.map(s => Math.abs(parseNum(r[s.key])))).filter(v => v > 0));
    const totals = Object.fromEntries(specs.map(s => [s.key, rows.reduce((a,r)=>a+parseNum(r[s.key]),0)]));
    const totalGeneral = rows.reduce((a,r)=>a+parseNum(r.total),0);
    wrap.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'vbars-wrap';
    const legend = specs.filter(s => parseNum(totals[s.key]) !== 0).map(s => `<span><span class="legend-dot" style="background:${s.color}"></span>${esc(s.label)}</span>`).join(' ');
    head.innerHTML = `<div class="vbars-total">${esc(title)} - TOTAL GENERAL: ${esc(money(totalGeneral))}</div>${legend ? `<div class="chart-note">${legend}</div>` : ''}`;
    wrap.appendChild(head);
    if(!visibleRows.length){
      const empty = document.createElement('div');
      empty.className = 'hint';
      empty.textContent = 'Sin datos para presentar graficas.';
      wrap.appendChild(empty);
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'vbars-grid';
    visibleRows.forEach(r => {
      const cols = specs.map(s => {
        if(parseNum(r[s.key]) === 0){
          const tip = groupTip(pageTitle, r, s);
          return `<div class="vbar-col ce-v24-zero-col" data-v24-kind="${s.key}" data-v24-tip="1" data-ce-tip-v21="${esc(tip)}" data-tip-bg-v21="#fff" data-ce-tip-layout-v21="${s.layout}" style="display:none"></div>`;
        }
        const h = Math.max(8, (Math.abs(parseNum(r[s.key])) / maxVal) * 170);
        const tip = groupTip(pageTitle, r, s);
        return `<div class="vbar-col" data-v24-kind="${s.key}" data-v24-tip="1" data-ce-tip-v21="${esc(tip)}" data-tip-bg-v21="#fff" data-ce-tip-layout-v21="${s.layout}"><div class="vbar-value">${esc(money(r[s.key]))}</div><div class="vbar-stick" data-v24-kind="${s.key}" data-v24-tip="1" data-ce-tip-v21="${esc(tip)}" data-tip-bg-v21="#fff" data-ce-tip-layout-v21="${s.layout}" style="height:${h}px;background:${s.color}"></div><div class="vbar-label">${esc(s.label)}</div></div>`;
      }).join('');
      const card = document.createElement('div');
      card.className = 'vbars-card';
      card.innerHTML = `<div class="vbars-title">${esc(r.label)} · ${esc(money(r.total))}</div><div class="vbars-chart ce-v24-vbars-chart">${cols}</div>`;
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
  }
  function applyCollabSortToolbar(){
    const wrap = $('collabList');
    if(!wrap || wrap.querySelector('.empty')) return;
    let bar = wrap.querySelector(':scope > .ce-v24-sortbar');
    if(!bar){
      bar = document.createElement('div');
      bar.className = 'ce-v24-sortbar';
      bar.innerHTML = '<span>Ordenar por:</span><button type="button" class="outline small" data-v24-collab-sort="colaborador">Colaborador/a</button><button type="button" class="outline small" data-v24-collab-sort="ingreso">Ingreso</button>';
      wrap.insertBefore(bar, wrap.firstChild);
    }
    const mode = st().collabsSort || 'colaborador';
    bar.querySelectorAll('[data-v24-collab-sort]').forEach(btn => btn.classList.toggle('active', btn.dataset.v24CollabSort === mode));
    const cards = Array.from(wrap.querySelectorAll(':scope > .itemcard'));
    const person = card => norm(card.querySelector('select[data-action="edit-collab-persona"] option:checked')?.textContent || card.textContent || '');
    const ingreso = card => norm(card.querySelector('select[data-action="edit-collab-situacion"]')?.value || '');
    cards.sort((a,b) => mode === 'ingreso' ? (cmp(ingreso(a), ingreso(b)) || cmp(person(a), person(b))) : cmp(person(a), person(b)));
    cards.forEach(card => wrap.appendChild(card));
  }
  function stripSaldoGraphTips(){
    const wrap = $('eventChartWrap');
    if(!wrap) return;
    wrap.querySelectorAll('.chart-row').forEach(row => {
      const label = up(row.querySelector('.chart-label')?.textContent || '');
      if(label.includes('SALDO ACTUAL') || label.includes('SALDO OPERATIVO')){
        row.dataset.v24NoTip = '1';
        row.querySelectorAll('.chart-seg,.chart-track,[data-ce-tip-v21],[data-ce-tip-v196],[data-tip],[title]').forEach(clearTip);
      }
    });
  }
  function refreshVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span,.appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION;
    });
    try{
      window.emittedByTextV171 = function(date = new Date()){
        const p = n => String(n).padStart(2,'0');
        return `Emitido por "(c)oltyLAB '26_${VERSION_FILE}_${p(date.getDate())}${p(date.getMonth()+1)}${date.getFullYear()}_${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}"`;
      };
      emittedByTextV171 = window.emittedByTextV171;
    }catch(_){ }
    try{
      window.makeInfoEventoFilename = window.xlsxFilename = function(ev){
        const d = new Date();
        const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
        const title = norm(ev?.titulo || currentEvent().titulo || 'evento').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'').replace(/_+/g,'_') || 'evento';
        return `${VERSION_FILE}_INFOEVENTO-${title}_${y}${m}${day}.xlsx`;
      };
    }catch(_){ }
    try{
      const proto = HTMLAnchorElement.prototype;
      if(!proto.click.__v240Wrapped){
        const prev = proto.click;
        const wrapped = function(){
          try{
            if(this.download) this.download = String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE).replace(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/ig, VERSION);
          }catch(_){ }
          return prev.apply(this, arguments);
        };
        wrapped.__v240Wrapped = true;
        proto.click = wrapped;
      }
    }catch(_){ }
  }
  function isDataUrl(v){ return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(String(v || '')); }
  function isPlainBase64(v){ const s = String(v || '').replace(/\s+/g,''); return s.length > 200 && /^[A-Za-z0-9+/=]+$/.test(s); }
  function blobToDataUrl(blob){
    return new Promise((resolve,reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error('No se pudo leer la imagen'));
      reader.onload = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(blob);
    });
  }
  async function sourceToDataUrl(src){
    src = imageValue(src);
    if(!src) return '';
    if(isDataUrl(src)) return src;
    if(isPlainBase64(src)) return 'data:image/jpeg;base64,' + src.replace(/\s+/g,'');
    let url = src;
    if(url.startsWith('//')) url = location.protocol + url;
    if(!/^https?:\/\//i.test(url) && !url.startsWith('/')) return '';
    const res = await fetch(url, {cache:'no-store'});
    if(!res.ok) throw new Error('No se pudo descargar la imagen del ticket');
    const blob = await res.blob();
    if(!/^image\//i.test(blob.type || 'image/jpeg')) return '';
    return await blobToDataUrl(blob);
  }
  async function hydrateServerImages(){
    try{
      const res = await fetch(`/api/ticket-images?eventId=${encodeURIComponent(eventId())}`, {cache:'no-store'});
      const data = await res.json();
      if(!res.ok || !data || !data.images) return;
      const s = st();
      if(!s.ticketImages) s.ticketImages = {};
      if(!s.ticketImageRefs) s.ticketImageRefs = {};
      Object.entries(data.images).forEach(([k,v]) => {
        const ref = imageValue(v) || imageValue(v?.pathname) || imageValue(v?.url);
        if(ref && !s.ticketImages[k]) s.ticketImages[k] = ref;
        if(v && typeof v === 'object') s.ticketImageRefs[k] = v;
      });
    }catch(_){ }
  }
  async function prepareTicketImagesForExcelV240(){
    await hydrateServerImages();
    const labels = new Set();
    try{ summaryByTiendaTicketV240().forEach(r => { if(r.attachable){ labels.add(r.k); labels.add(cleanLabel(r.label)); if(r.rawTicket) labels.add(r.rawTicket); } }); }catch(_){ }
    compras().forEach(c => {
      const tk = ticket(c);
      if(!tk || isDonation(tk) || isCurrent(tk)) return;
      labels.add(`${storeName(c)} | ${tk}`);
      labels.add(tk);
    });
    const s = st();
    if(!s.ticketImages) s.ticketImages = {};
    for(const label of Array.from(labels).filter(Boolean)){
      const ref = imageRefFor(label);
      if(!ref) continue;
      let dataUrl = '';
      try{ dataUrl = await sourceToDataUrl(ref); }catch(err){ console.warn('[v24.0] No se pudo preparar foto para Excel', label, err); }
      if(!dataUrl) continue;
      imageCandidates(label).forEach(k => { s.ticketImages[k] = dataUrl; });
    }
  }
  function wrapExport(){
    const prev = (typeof exportExcel === 'function') ? exportExcel : window.exportExcel;
    if(!prev || prev.__v240Wrapped) return;
    const wrapped = async function(){
      await prepareTicketImagesForExcelV240();
      return await prev.apply(this, arguments);
    };
    wrapped.__v240Wrapped = true;
    try{ exportExcel = wrapped; }catch(_){ }
    window.exportExcel = wrapped;
  }
  function wrapGraph(){
    const prev = (typeof renderGraficas === 'function') ? renderGraficas : window.renderGraficas;
    if(!prev || prev.__v240Wrapped) return;
    const wrapped = function(){
      const ret = prev.apply(this, arguments);
      setTimeout(stripSaldoGraphTips, 0);
      setTimeout(stripSaldoGraphTips, 80);
      return ret;
    };
    wrapped.__v240Wrapped = true;
    try{ renderGraficas = wrapped; }catch(_){ }
    window.renderGraficas = wrapped;
  }
  function wrapCollabs(){
    const prev = (typeof renderColabs === 'function') ? renderColabs : window.renderColabs;
    if(!prev || prev.__v240Wrapped) return;
    const wrapped = function(){
      const ret = prev.apply(this, arguments);
      applyCollabSortToolbar();
      return ret;
    };
    wrapped.__v240Wrapped = true;
    try{ renderColabs = wrapped; }catch(_){ }
    window.renderColabs = wrapped;
  }
  function installSummaryOverrides(){
    try{ summaryByTiendaTicket = summaryByTiendaTicketV240; }catch(_){ }
    window.summaryByTiendaTicket = summaryByTiendaTicketV240;
    try{ summaryBySegmento = function(){ return groupRowsV240('segmento'); }; window.summaryBySegmento = summaryBySegmento; }catch(_){ window.summaryBySegmento = function(){ return groupRowsV240('segmento'); }; }
    try{ summaryByDestino = function(){ return groupRowsV240('destino'); }; window.summaryByDestino = summaryByDestino; }catch(_){ window.summaryByDestino = function(){ return groupRowsV240('destino'); }; }
    const prev = (typeof renderSummaryList === 'function') ? renderSummaryList : window.renderSummaryList;
    if(prev && !prev.__v240Wrapped){
      const wrapped = function(targetId, rows){
        if(targetId === 'summarySegmento' || targetId === 'summaryDestino') return renderGroupingBarsV240(targetId, rows || []);
        if(targetId === 'summaryTiendaTicket') return renderTiendaTicketV240(targetId, rows || summaryByTiendaTicketV240());
        return prev.apply(this, arguments);
      };
      wrapped.__v240Wrapped = true;
      try{ renderSummaryList = wrapped; }catch(_){ }
      window.renderSummaryList = wrapped;
    }
  }
  function applyV240(){
    refreshVersion();
    installSummaryOverrides();
    wrapGraph();
    wrapCollabs();
    wrapExport();
    try{
      if($('summarySegmento')) renderGroupingBarsV240('summarySegmento', groupRowsV240('segmento'));
      if($('summaryDestino')) renderGroupingBarsV240('summaryDestino', groupRowsV240('destino'));
      if($('summaryTiendaTicket')) renderTiendaTicketV240('summaryTiendaTicket', summaryByTiendaTicketV240());
    }catch(_){ }
    stripSaldoGraphTips();
    applyCollabSortToolbar();
  }
  document.addEventListener('click', ev => {
    const sortSummary = ev.target?.closest?.('[data-v24-summary-sort]');
    if(sortSummary){
      ev.preventDefault(); ev.stopPropagation();
      st().summaryTiendaSort = sortSummary.dataset.v24SummarySort || 'tienda';
      try{ if(typeof renderBudget === 'function') renderBudget(); }catch(_){ try{ renderSummaryList('summaryTiendaTicket', summaryByTiendaTicketV240()); }catch(__){ } }
      return false;
    }
    const sortCollab = ev.target?.closest?.('[data-v24-collab-sort]');
    if(sortCollab){
      ev.preventDefault(); ev.stopPropagation();
      st().collabsSort = sortCollab.dataset.v24CollabSort || 'colaborador';
      try{ if(typeof renderColabs === 'function') renderColabs(); }catch(_){ applyCollabSortToolbar(); }
      return false;
    }
  }, true);
  const oldRender = (typeof render === 'function') ? render : null;
  if(oldRender && !oldRender.__v240Wrapped){
    const wrapped = function(){
      const ret = oldRender.apply(this, arguments);
      [60, 220, 700, 1500, 2600].forEach(ms => setTimeout(applyV240, ms));
      return ret;
    };
    wrapped.__v240Wrapped = true;
    try{ render = wrapped; }catch(_){ }
    window.render = wrapped;
  }
  applyV240();
  [120, 400, 1100, 2100, 3200].forEach(ms => setTimeout(applyV240, ms));
  window.__ceV240 = {summaryByTiendaTicket: summaryByTiendaTicketV240, prepareTicketImagesForExcel: prepareTicketImagesForExcelV240};
})();
