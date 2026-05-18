/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #23. */
/* ==== V19.3: globos por clic, orden alfabético y negrita controlada ==== */
(function(){
  const VERSION = 'ControlEvent v26.6';
  const VERSION_FILE = 'ControlEvent_v26_6';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const normUp = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const moneyF = v => {
    try{ return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0)); }
    catch(_){ return `${Number(v || 0).toFixed(2)} €`; }
  };
  const numF = v => {
    try{ return new Intl.NumberFormat('es-ES',{minimumFractionDigits:0, maximumFractionDigits:2}).format(Number(v || 0)); }
    catch(_){ return String(v ?? ''); }
  };

  function getState(){
    try{ if(typeof state !== 'undefined' && state) return state; }catch(_){ }
    return window.state || {};
  }
  function getSelectedEventId(){
    const st = getState();
    try{ const ev = (typeof selectedEvent === 'function') ? selectedEvent() : null; if(ev && ev.id) return String(ev.id); }catch(_){ }
    return String(st.selectedEventId || '');
  }
  function rowsForEvent(){
    try{ if(typeof comprasForEvent === 'function') return comprasForEvent() || []; }catch(_){ }
    const st = getState(); const evId = getSelectedEventId();
    return (st.compras || []).filter(c => String(c.eventId || '') === evId);
  }
  function findById(listName, id){
    const st = getState();
    return (st[listName] || []).find(x => String(x.id) === String(id)) || {};
  }
  function personaName(id){
    try{ const p = (typeof personaById === 'function') ? personaById(id) : null; if(p && p.nombre) return p.nombre; }catch(_){ }
    return findById('personas', id).nombre || '';
  }
  function tiendaName(id){
    try{ const t = (typeof tiendaById === 'function') ? tiendaById(id) : null; if(t && t.nombre) return t.nombre; }catch(_){ }
    return findById('tiendas', id).nombre || '';
  }
  function productoObj(id){
    try{ const p = (typeof productoById === 'function') ? productoById(id) : null; if(p) return p; }catch(_){ }
    return findById('productos', id);
  }
  function productoName(c){
    try{ if(typeof productNameV171 === 'function') return productNameV171(c); }catch(_){ }
    try{ if(typeof productNameV164 === 'function') return productNameV164(c); }catch(_){ }
    return c?.producto?.nombre || productoObj(c?.productoId).nombre || 'Producto';
  }
  function productoPrice(c){
    const p = productoObj(c?.productoId);
    return Number(c?.precio != null ? c.precio : (c?.precioCalc != null ? c.precioCalc : (p.defaultPrecio ?? p.precio ?? 0)));
  }
  function productoValue(c){
    try{ if(typeof valueCompraV171 === 'function') return Number(valueCompraV171(c) || 0); }catch(_){ }
    try{ if(typeof valueCompraV164 === 'function') return Number(valueCompraV164(c) || 0); }catch(_){ }
    return Number(c?.valor != null ? c.valor : productoPrice(c) * Number(c?.unidades || 0));
  }
  function storeName(c){
    try{ if(typeof storeNameV171 === 'function'){ const v = storeNameV171(c); if(norm(v)) return v; } }catch(_){ }
    try{ if(typeof storeNameV164 === 'function'){ const v = storeNameV164(c); if(norm(v)) return v; } }catch(_){ }
    return c?.tienda?.nombre || tiendaName(c?.tiendaId) || 'Sin tienda';
  }
  function donorName(c){
    try{ if(typeof resolveDonorNameV171 === 'function'){ const v = resolveDonorNameV171(c); if(norm(v) && normUp(v) !== 'SIN TIENDA') return v; } }catch(_){ }
    try{ if(typeof resolveDonorNameV164 === 'function'){ const v = resolveDonorNameV164(c); if(norm(v) && normUp(v) !== 'SIN TIENDA') return v; } }catch(_){ }
    const raw = norm(c?.donorRef || c?.donante || c?.donanteNombre || '');
    if(raw.startsWith('P:')) return personaName(raw.slice(2)) || 'Sin donante';
    if(raw.startsWith('T:')) return tiendaName(raw.slice(2)) || 'Sin donante';
    return raw || 'Sin donante';
  }
  function isDon(v){
    try{ if(typeof isDonationTicket === 'function') return isDonationTicket(v); }catch(_){ }
    return normUp(v).startsWith('DONADO');
  }
  function ticket(c){ return norm(c?.ticketDonacion); }
  function compareText(a,b){ return normUp(a).localeCompare(normUp(b),'es'); }
  function getRawTip(el){
    if(!el) return '';
    return el.getAttribute('data-ce-tip') || el.getAttribute('data-v181-tip') || el.getAttribute('data-tip') || el.getAttribute('title') || '';
  }

  function sortKey(line){
    let s = String(line || '').replace(/^\s*•\s*/, '').trim();
    s = s.replace(/^(DONANTE|SOCIO|NO SOCIO|PERSONA|PRODUCTO|TIENDA)\s*:\s*/i,'');
    s = s.split(/\s+[—-]\s+|\s*\|\s*|\s*:\s*/)[0] || s;
    return normUp(s);
  }
  function sortConsecutiveBullets(lines){
    const out = [];
    for(let i=0; i<lines.length;){
      if(/^\s*•\s*/.test(lines[i] || '')){
        const block = [];
        while(i < lines.length && /^\s*•\s*/.test(lines[i] || '')) block.push(lines[i++]);
        block.sort((a,b)=>sortKey(a).localeCompare(sortKey(b),'es'));
        out.push(...block);
      }else{
        out.push(lines[i++]);
      }
    }
    return out;
  }
  function sortTipText(raw){
    const lines = String(raw || '').replace(/\r\n/g,'\n').split('\n');
    return sortConsecutiveBullets(lines).join('\n');
  }
  function normalizeAllTipTexts(){
    document.querySelectorAll('[data-ce-tip],[data-v181-tip],[data-tip],[title]').forEach(el => {
      if(el.closest?.('button,input,select,textarea')) return;
      const raw = getRawTip(el);
      if(!norm(raw)) return;
      el.setAttribute('data-ce-tip', sortTipText(raw));
      el.removeAttribute('title');
      el.removeAttribute('data-v181-tip');
      el.removeAttribute('data-tip');
    });
  }

  function setTip(el, text, bg='#ffffff', forceBlack=true){
    if(!el || !norm(text)) return;
    el.setAttribute('data-ce-tip', sortTipText(text));
    el.setAttribute('data-tip-bg', bg || '#ffffff');
    if(forceBlack) el.setAttribute('data-ce-tip-black','1');
    el.removeAttribute('title');
    el.removeAttribute('data-tip');
    el.removeAttribute('data-v181-tip');
  }

  function buildTicketMaps(){
    const donationMap = new Map();
    const purchaseMap = new Map();
    rowsForEvent().forEach(c => {
      const t = ticket(c);
      if(!t) return;
      const qty = Number(c.unidades || 0);
      const price = productoPrice(c);
      const val = productoValue(c);
      const prod = productoName(c);
      const line = `• ${prod} — Cantidad: ${numF(qty)} — Precio estimado: ${moneyF(price)} — Valor estimado: ${moneyF(val)}`;
      if(isDon(t)){
        const donor = donorName(c);
        const key = `${donor} | ${t}`;
        if(!donationMap.has(key)) donationMap.set(key, {key, donor, ticket:t, total:0, lines:[]});
        const rec = donationMap.get(key); rec.total += val; rec.lines.push(line);
      }else{
        const store = storeName(c);
        const key = `${store} | ${t}`;
        if(!purchaseMap.has(key)) purchaseMap.set(key, {key, store, ticket:t, total:0, lines:[]});
        const rec = purchaseMap.get(key); rec.total += val; rec.lines.push(line.replace('Precio estimado:', 'Precio:').replace('Valor estimado:', 'Importe:'));
      }
    });
    donationMap.forEach(r => r.lines.sort((a,b)=>sortKey(a).localeCompare(sortKey(b),'es')));
    purchaseMap.forEach(r => r.lines.sort((a,b)=>sortKey(a).localeCompare(sortKey(b),'es')));
    return {donationMap, purchaseMap};
  }

  function applyTiendaTicketStable(){
    const wrap = $('summaryTiendaTicket');
    if(!wrap) return;
    const {donationMap, purchaseMap} = buildTicketMaps();
    wrap.querySelectorAll('.summary-item').forEach(item => {
      const labelEl = item.querySelector('span');
      const valueEl = item.querySelector('strong, b, .money-text') || item.lastElementChild;
      let label = norm(labelEl?.textContent || '');
      if(!label || normUp(label) === 'TOTAL') return;
      for(const [, rec] of donationMap){
        if(label === rec.key || label.startsWith(rec.key + ' ·') || label.startsWith(rec.key + ' -')){
          // El registro visible queda limpio: Donante | DONADO xxxxx, sin detalle.
          if(labelEl) labelEl.textContent = rec.key;
          const tip = `DONACIÓN\n${rec.key}\nTOTAL ESTIMADO: ${moneyF(rec.total)}\n\n${rec.lines.join('\n')}`;
          setTip(item, tip, '#ffffff', true);
          setTip(labelEl, tip, '#ffffff', true);
          if(valueEl) setTip(valueEl, tip, '#ffffff', true);
          return;
        }
      }
      for(const [, rec] of purchaseMap){
        if(label === rec.key || label.startsWith(rec.key + ' ·') || label.startsWith(rec.key + ' -')){
          const tip = `TIENDA | TICKET\n${rec.key}\nTOTAL: ${moneyF(rec.total)}\n\n${rec.lines.join('\n')}`;
          setTip(item, tip, '#ffffff', true);
          setTip(labelEl, tip, '#ffffff', true);
          if(valueEl) setTip(valueEl, tip, '#ffffff', true);
          return;
        }
      }
    });
  }

  function applySortedGroupingTips(){
    const ids = ['summarySegmento','summaryDestino','eventChartWrap','budgetLayout','ingresosSummaryGrid'];
    ids.forEach(id => {
      const root = $(id);
      if(!root) return;
      root.querySelectorAll('[data-ce-tip],[data-v181-tip],[data-tip],[title]').forEach(el => {
        const raw = getRawTip(el);
        if(norm(raw)) setTip(el, raw, el.getAttribute('data-tip-bg') || getComputedStyle(el).backgroundColor || '#ffffff', el.getAttribute('data-ce-tip-black') === '1' || true);
      });
    });
  }

  const moneyRe = /(?:\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)(?:\s|&nbsp;|\u00a0)*(?:€|EUR)|(?:€|EUR)(?:\s|&nbsp;|\u00a0)*(?:\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)/gi;
  function boldLastMoney(html){
    let matches = [...html.matchAll(moneyRe)];
    if(!matches.length) return html;
    const m = matches[matches.length-1];
    return html.slice(0,m.index) + '<strong>' + m[0] + '</strong>' + html.slice(m.index + m[0].length);
  }
  function boldOnlySemantic(lineHtml){
    let h = lineHtml;
    h = h.replace(/^(\s*•\s*)([^—\|:]+)(\s*(?:—|\||:)\s*)/i, '$1<strong>$2</strong>$3');
    h = h.replace(/^([^—\|:]+)(\s*\|\s*(?:DONADO|TICKET)\b.*)$/i, '<strong>$1</strong>$2');
    h = h.replace(/\b(DONANTE|SOCIO|NO SOCIO|PERSONA|NOMBRE|PRODUCTO|TIENDA)\s*:\s*([^—\n\|:]+)/gi, '$1: <strong>$2</strong>');
    return boldLastMoney(h);
  }
  function tipHtml(raw){
    return sortTipText(raw).split('\n').map(line => {
      if(!line.trim()) return '<div class="ce-tip-line ce-tip-blank"></div>';
      return '<div class="ce-tip-line">' + boldOnlySemantic(esc(line)) + '</div>';
    }).join('');
  }
  function ensureTip(){
    let tip = $('ceTooltipV190');
    if(!tip){ tip = document.createElement('div'); tip.id = 'ceTooltipV190'; tip.className = 'ce-tooltip-v190'; document.body.appendChild(tip); }
    return tip;
  }
  function placeTip(tip, x, y){
    const margin = 12;
    tip.classList.add('ce-click-open');
    tip.classList.remove('full');
    tip.style.display = 'block';
    tip.style.width = 'max-content';
    tip.style.maxWidth = 'min(860px, calc(100vw - 32px))';
    tip.style.maxHeight = '75vh';
    tip.style.overflow = 'auto';
    tip.style.left = '0px';
    tip.style.top = '0px';
    const rect = tip.getBoundingClientRect();
    let left = (Number.isFinite(x) ? x : 24) + 14;
    let top = (Number.isFinite(y) ? y : 24) + 14;
    if(left + rect.width > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - rect.width - margin);
    if(top + rect.height > window.innerHeight - margin) top = Math.max(margin, window.innerHeight - rect.height - margin);
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }
  function openTipFor(el, x, y){
    const raw = getRawTip(el);
    if(!norm(raw)) return false;
    const tip = ensureTip();
    const html = tipHtml(raw);
    tip.innerHTML = html;
    tip.dataset.v193Html = html;
    const bg = el.getAttribute('data-tip-bg') || '#ffffff';
    tip.style.background = bg;
    tip.style.color = el.getAttribute('data-ce-tip-black') === '1' ? '#111827' : (bg === '#ffffff' ? '#111827' : '#111827');
    tip.style.borderColor = 'rgba(15,23,42,.18)';
    tip.scrollTop = 0;
    placeTip(tip, x, y);
    return true;
  }
  function closeTip(){
    const tip = $('ceTooltipV190');
    if(tip){ tip.classList.remove('ce-click-open'); tip.style.display = 'none'; }
  }

  // Anula los globos por hover de parches anteriores. Con CSS quedan ocultos; esto evita residuos internos.
  ['mouseover','mousemove','mouseenter','focusin'].forEach(evt => {
    document.addEventListener(evt, () => {
      const tip = $('ceTooltipV190');
      if(tip && !tip.classList.contains('ce-click-open')) tip.style.display = 'none';
    }, true);
  });

  document.addEventListener('click', e => {
    const tip = $('ceTooltipV190');
    if(tip && (e.target === tip || tip.contains(e.target))) return;
    const interactive = e.target.closest?.('button,input,select,textarea,a');
    const el = e.target.closest?.('[data-ce-tip],[data-v181-tip],[data-tip]');
    if(!el || interactive){ closeTip(); return; }
    const ok = openTipFor(el, e.clientX, e.clientY);
    if(ok){ e.preventDefault(); e.stopPropagation(); }
    else closeTip();
  }, true);
  document.addEventListener('keydown', e => { if(e.key === 'Escape') closeTip(); }, true);
  window.addEventListener('scroll', closeTip, true);
  window.addEventListener('resize', closeTip);

  function refreshVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span, .appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION;
    });
  }
  function normalizeDownloadName(name){
    let n = String(name || '');
    n = n.replace(/^ControlEvent_v\d+_\d+(?:_\d+)?/i, VERSION_FILE);
    return n;
  }
  const currentClick = HTMLAnchorElement.prototype.click;
  if(!HTMLAnchorElement.prototype.click.__v193Wrapped){
    const wrapped = function(){
      try{ if(this.download) this.download = normalizeDownloadName(this.download); }catch(_){ }
      return currentClick.apply(this, arguments);
    };
    wrapped.__v193Wrapped = true;
    HTMLAnchorElement.prototype.click = wrapped;
  }

  function afterRenderV193(){
    refreshVersion();
    applyTiendaTicketStable();
    applySortedGroupingTips();
    normalizeAllTipTexts();
  }
  const prevRender = typeof render === 'function' ? render : null;
  if(prevRender && !prevRender.__v193Wrapped){
    const wrappedRender = function(){
      const ret = prevRender.apply(this, arguments);
      setTimeout(afterRenderV193, 20);
      setTimeout(afterRenderV193, 160);
      return ret;
    };
    wrappedRender.__v193Wrapped = true;
    render = wrappedRender;
    window.render = render;
  }
  ['DOMContentLoaded','load'].forEach(evt => window.addEventListener(evt, () => { afterRenderV193(); setTimeout(afterRenderV193, 350); }));
  afterRenderV193();
  setTimeout(afterRenderV193, 350);
  setTimeout(afterRenderV193, 1200);
})();
