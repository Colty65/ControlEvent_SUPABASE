/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #30. */
/* ==== V20.2: toggle mantenimiento, carga sin selector automático, globos y fotos ==== */
(function(){
  const VERSION = 'ControlEvent v26.6';
  const VERSION_FILE = 'ControlEvent_v26_6';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const normUp = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc = v => (typeof escapeHtml === 'function') ? escapeHtml(v) : String(v ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  const moneyFmt = v => { try{ return (typeof money === 'function') ? money(Number(v||0)) : new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0)); }catch(_){ return Number(v||0).toFixed(2)+' €'; } };
  const numFmt = v => { try{ return new Intl.NumberFormat('es-ES',{minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(v||0)); }catch(_){ return String(v ?? ''); } };
  function st(){ try{ if(typeof state !== 'undefined') return state; }catch(_){ } return window.state || {}; }
  function evId(){ try{ const ev = (typeof selectedEvent === 'function') ? selectedEvent() : null; return String(ev?.id || st().selectedEventId || ''); }catch(_){ return String(st().selectedEventId || ''); } }
  function compras(){ try{ if(typeof comprasForEvent === 'function') return comprasForEvent() || []; }catch(_){ } const id=evId(); return (st().compras||[]).filter(c => String(c.eventId||'')===id); }
  function byId(list,id){ return (st()[list]||[]).find(x => String(x.id)===String(id)) || {}; }
  function product(id){ try{ const p = (typeof productoById === 'function') ? productoById(id) : null; if(p) return p; }catch(_){ } return byId('productos', id); }
  function tienda(id){ try{ const t = (typeof tiendaById === 'function') ? tiendaById(id) : null; if(t) return t; }catch(_){ } return byId('tiendas', id); }
  function persona(id){ try{ const p = (typeof personaById === 'function') ? personaById(id) : null; if(p) return p; }catch(_){ } return byId('personas', id); }
  function pName(c){ return c?.producto?.nombre || product(c?.productoId).nombre || 'Producto'; }
  function tName(c){ const p=product(c?.productoId); return c?.tienda?.nombre || tienda(c?.tiendaId || p.tiendaId || p.defaultTiendaId).nombre || 'Sin tienda'; }
  function donor(c){
    try{ if(typeof donorLabel === 'function' && c?.donorRef){ const d=donorLabel(c.donorRef); if(norm(d)) return d; } }catch(_){ }
    const raw = norm(c?.donorRef || c?.donante || c?.donanteNombre || '');
    if(raw.startsWith('P:')) return persona(raw.slice(2)).nombre || 'Sin donante';
    if(raw.startsWith('T:')) return tienda(raw.slice(2)).nombre || 'Sin donante';
    return raw || c?.donorLabel || c?.tienda?.nombre || 'Sin donante';
  }
  function ticket(c){ return norm(c?.ticketDonacion || ''); }
  function isDon(v){ try{ if(typeof isDonationTicket === 'function') return isDonationTicket(v); }catch(_){ } return normUp(v).startsWith('DONADO'); }
  function isCurrent(v){ try{ if(typeof isCurrentExpenseTicket === 'function') return isCurrentExpenseTicket(v); }catch(_){ } return normUp(v)==='GASTOS CORRIENTES'; }
  function price(c){ const p=product(c?.productoId); return Number(c?.precio != null ? c.precio : (c?.precioCalc != null ? c.precioCalc : (p.defaultPrecio ?? p.precio ?? 0))); }
  function value(c){ return Number(c?.valor != null ? c.valor : price(c)*Number(c?.unidades || 0)); }
  function cmp(a,b){ return normUp(a).localeCompare(normUp(b),'es'); }
  function setTip(el,text,bg='#fff',layout='default'){
    if(!el || !norm(text)) return;
    el.setAttribute('data-ce-tip-v196', text);
    el.setAttribute('data-tip-bg-v196', bg || '#fff');
    el.setAttribute('data-ce-tip-layout-v20', layout || 'default');
    ['data-ce-tip-v1952','data-ce-tip','data-v181-tip','data-tip','title'].forEach(a=>el.removeAttribute(a));
  }
  function refreshVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{ if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||'')) el.textContent = VERSION; });
  }
  function normalizeDownloads(){
    const proto = HTMLAnchorElement.prototype;
    if(proto.click.__v202Wrapped) return;
    const prev = proto.click;
    const wrapped = function(){ try{ if(this.download) this.download = String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }catch(_){ } return prev.apply(this, arguments); };
    wrapped.__v202Wrapped = true; proto.click = wrapped;
  }
  function showMaintToggle(){
    const wrap = $('maintenanceWrapper'); if(!wrap) return;
    const visible = !wrap.classList.contains('hidden');
    const tab = (()=>{ try{ return String(currentMaintTab || ''); }catch(_){ return ''; } })();
    if(visible && tab !== 'importar'){
      wrap.classList.add('hidden');
      const btn=$('btnToggleMaintenance'); if(btn){ btn.classList.remove('maint-btn-open'); btn.classList.add('maint-btn-closed'); }
      try{ renderLockState(); }catch(_){ }
      return;
    }
    try{ currentMaintTab = 'personas'; }catch(_){ }
    wrap.classList.remove('hidden');
    try{ renderMaintenance(); }catch(_){ }
    try{ renderMaintenanceTabs(); }catch(_){ }
    try{ renderLockState(); }catch(_){ }
    const btn=$('btnToggleMaintenance'); if(btn){ btn.classList.add('maint-btn-open'); btn.classList.remove('maint-btn-closed'); }
  }
  function showImportOnly(){
    try{ currentMaintTab = 'importar'; }catch(_){ }
    const wrap=$('maintenanceWrapper'); if(wrap) wrap.classList.remove('hidden');
    try{ renderMaintenance(); }catch(_){ }
    try{ renderMaintenanceTabs(); }catch(_){ }
    try{ renderLockState(); }catch(_){ }
    const btn=$('btnToggleMaintenance'); if(btn){ btn.classList.add('maint-btn-open'); btn.classList.remove('maint-btn-closed'); }
  }
  // Último interceptor: separa mantenimiento y carga, sin abrir el selector de archivo automáticamente.
  window.addEventListener('click', ev => {
    const btn = ev.target?.closest?.('button'); if(!btn) return;
    if(btn.id === 'btnToggleMaintenance'){
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); showMaintToggle(); return false;
    }
    if(btn.id === 'btnOpenImport'){
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); showImportOnly(); return false;
    }
  }, true);
  function groupingLines(label, kind){
    const key = norm(label);
    const match = c => {
      const p = product(c.productoId);
      const v = kind === 'segmento' ? (c.producto?.segmento || p.segmento || '') : (c.producto?.destino || p.destino || '');
      return String(v) === key;
    };
    const rows = compras().filter(match);
    const buy = rows.filter(c => !isDon(ticket(c)) && !isCurrent(ticket(c)) && ticket(c) !== '').sort((a,b)=>cmp(ticket(a),ticket(b))||cmp(pName(a),pName(b))).map(c => `${ticket(c)} | ${pName(c)} | ${moneyFmt(value(c))}`);
    const pending = rows.filter(c => !isDon(ticket(c)) && (ticket(c) === '' || isCurrent(ticket(c)))).sort((a,b)=>cmp(ticket(a)||'PTE.COMPRA',ticket(b)||'PTE.COMPRA')||cmp(pName(a),pName(b))).map(c => `${ticket(c) || 'PTE.COMPRA'} | ${pName(c)} | ${moneyFmt(value(c))}`);
    const donatedMap = new Map();
    rows.filter(c => isDon(ticket(c))).forEach(c => { const k=pName(c); donatedMap.set(k, (donatedMap.get(k)||0)+value(c)); });
    const donated = Array.from(donatedMap.entries()).sort((a,b)=>cmp(a[0],b[0])).map(([p,v]) => `${p} | ${moneyFmt(v)}`);
    return {buy,pending,donated, totalBuy:rows.filter(c=>!isDon(ticket(c))&&!isCurrent(ticket(c))&&ticket(c)!=='').reduce((a,b)=>a+value(b),0), totalPending:rows.filter(c=>!isDon(ticket(c))&&(ticket(c)===''||isCurrent(ticket(c)))).reduce((a,b)=>a+value(b),0), totalDonated:Array.from(donatedMap.values()).reduce((a,b)=>a+b,0)};
  }
  function applyGroupingTipsV202(){
    [['summarySegmento','Por segmento','segmento'],['summaryDestino','Por destino','destino']].forEach(([id,title,kind])=>{
      const wrap=$(id); if(!wrap) return;
      wrap.querySelectorAll('.vbars-card').forEach(card=>{
        const label = norm((card.querySelector('.vbars-title')?.textContent || '').split('·')[0]);
        const data = groupingLines(label, kind);
        const cols = card.querySelectorAll('.vbar-col');
        const specs = [
          [0,'Compra',data.buy,data.totalBuy,'#dc2626','groupingv202buy'],
          [1,'Donado',data.donated,data.totalDonated,'#f59e0b','groupingv202don'],
          [2,'Pte.Compra u otros gastos',data.pending,data.totalPending,'#fb7185','groupingv202pending']
        ];
        specs.forEach(([idx,name,lines,total,color,layout])=>{
          const text = `${title}\n${label}\n${name}\nTOTAL: ${moneyFmt(total)}\n\n${lines.length ? lines.join('\n') : 'Sin productos'}`;
          const col = cols[idx];
          if(col) setTip(col,text,color,layout);
          const stick = col?.querySelector?.('.vbar-stick'); if(stick) setTip(stick,text,color,layout);
        });
      });
    });
  }
  function imgKey(key){ const id=evId(); try{ return (typeof ticketImageStateKey === 'function') ? ticketImageStateKey(key,id) : `${id}|${key}`; }catch(_){ return `${id}|${key}`; } }
  window.uploadTicketImageV202 = function(encodedKey){
    const key = decodeURIComponent(encodedKey || '');
    const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*';
    inp.onchange = e => {
      const file = e.target.files && e.target.files[0]; if(!file) return;
      const reader = new FileReader();
      reader.onload = le => {
        const img = new Image();
        img.onload = function(){
          const maxW=1200, maxH=1200; let w=img.width, h=img.height; const ratio=Math.min(maxW/w,maxH/h,1); w=Math.round(w*ratio); h=Math.round(h*ratio);
          const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h; canvas.getContext('2d').drawImage(img,0,0,w,h);
          if(!st().ticketImages) st().ticketImages = {};
          st().ticketImages[imgKey(key)] = canvas.toDataURL('image/jpeg',0.84);
          try{ save(); }catch(_){ }
          try{ render(); }catch(_){ }
        };
        img.src = le.target.result;
      };
      reader.readAsDataURL(file);
    };
    inp.click();
  };
  window.removeTicketImageV202 = function(encodedKey){
    const key = decodeURIComponent(encodedKey || '');
    if(st().ticketImages) delete st().ticketImages[imgKey(key)];
    try{ save(); }catch(_){ }
    try{ render(); }catch(_){ }
  };
  function decoratePhotos(){
    const wrap = $('summaryTiendaTicket'); if(!wrap) return;
    wrap.querySelectorAll('.summary-item').forEach(item=>{
      const label = norm(item.querySelector('span')?.textContent || '');
      if(!label || normUp(label)==='TOTAL') return;
      let right = item.children[item.children.length-1]; if(!right) return;
      let actions = right.querySelector('.ticket-actions');
      const encoded = encodeURIComponent(label);
      const img = st().ticketImages?.[imgKey(label)] || '';
      const preview = img ? `<img class="ticket-thumb" src="${img}" alt="foto" />` : '<span class="hint">Sin imagen</span>';
      const del = img ? `<button type="button" class="outline small ce-photo-btn-v202" title="Eliminar foto" onclick="removeTicketImageV202('${encoded}'); return false;">🗑️</button>` : '';
      const html = `<span class="ticket-actions"><button type="button" class="outline small ce-photo-btn-v202" title="Insertar foto" onclick="uploadTicketImageV202('${encoded}'); return false;">📎</button>${preview}${del}</span>`;
      if(actions) actions.outerHTML = html; else right.insertAdjacentHTML('beforeend', html);
    });
  }
  function formatGraphTips(){
    // Fuerza que INGRESOS y DONACIÓN usen el layout de primera columna + total, sin poner en negrita el precio intermedio.
    document.querySelectorAll('#eventChartWrap .chart-seg[data-ce-tip-v196]').forEach(seg=>{
      const raw = seg.getAttribute('data-ce-tip-v196') || '';
      if(/DONADO|DONACI/i.test(raw)) seg.setAttribute('data-ce-tip-layout-v20','donationv201');
      if(/INGRESOS|EFECTIVO|BANCO|BIZUM|PENDIENTE/i.test(raw)) seg.setAttribute('data-ce-tip-layout-v20','incomev201');
    });
  }
  function applyAllV202(){ refreshVersion(); normalizeDownloads(); applyGroupingTipsV202(); decoratePhotos(); formatGraphTips(); }
  const prevRender = typeof render === 'function' ? render : null;
  if(prevRender && !prevRender.__v202Wrapped){
    const wrapped = function(){ const ret = prevRender.apply(this, arguments); setTimeout(applyAllV202,120); setTimeout(applyAllV202,520); return ret; };
    wrapped.__v202Wrapped = true; render = wrapped; window.render = render;
  }
  ['DOMContentLoaded','load'].forEach(evt=>window.addEventListener(evt,()=>{ setTimeout(applyAllV202,180); setTimeout(applyAllV202,700); setTimeout(applyAllV202,1400); }));
  applyAllV202(); setTimeout(applyAllV202,400); setTimeout(applyAllV202,1200);
})();
