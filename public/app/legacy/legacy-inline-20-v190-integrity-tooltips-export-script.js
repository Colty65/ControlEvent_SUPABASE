/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #20. */
/* ==== V19.0: globos con scroll, nombres de Excel/backup, precio € en backup e integridad al eliminar ==== */
(function(){
  const VERSION = 'ControlEvent v26.6';
  const VERSION_FILE = 'ControlEvent_v26_6';
  const DELETE_BLOCK_MSG = 'No se pueden eliminar datos sin previamente eliminar sus dependencia';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const normalize = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc = v => (typeof escapeHtml === 'function') ? escapeHtml(v) : String(v ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch] || ch));
  const moneyF = v => (typeof money === 'function') ? money(Number(v || 0)) : new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0));
  const numberF = v => new Intl.NumberFormat('es-ES',{minimumFractionDigits:0, maximumFractionDigits:2}).format(Number(v || 0));
  const pad = n => String(n).padStart(2,'0');
  const ymd = (d=new Date()) => `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
  const timeUnderscore = (d=new Date()) => `${pad(d.getHours())}_${pad(d.getMinutes())}_${pad(d.getSeconds())}`;
  const cleanPart = v => normalize(v).replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').replace(/_+/g,'_') || 'EVENTO';

  function refreshVersionV190(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span, .appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+/i.test(el.textContent || '')) el.textContent = VERSION;
    });
  }

  function removeTipAttrs(el){
    if(!el) return;
    ['title','data-tip','data-v181-tip','data-ce-tip','data-tip-bg'].forEach(a => el.removeAttribute(a));
  }
  function stripRequestedTooltips(){
    ['tabIngresosBtn','tabDonacionesBtn','tabComprasBtn','tabResumenBtn','tabGraficasBtn','btnExportExcel','btnOpenImport','btnExportSeed'].forEach(id => removeTipAttrs($(id)));
    document.querySelectorAll('#tabCompras [title],#tabCompras [data-tip],#tabCompras [data-v181-tip],#tabDonaciones [title],#tabDonaciones [data-tip],#tabDonaciones [data-v181-tip],#tabGraficas [title],#tabGraficas [data-tip],#tabGraficas [data-v181-tip],#collabList [title],#collabList [data-tip],#collabList [data-v181-tip],#budgetLayout [title],#budgetLayout [data-tip],#budgetLayout [data-v181-tip],#summarySegmento [title],#summarySegmento [data-tip],#summarySegmento [data-v181-tip],#summaryDestino [title],#summaryDestino [data-tip],#summaryDestino [data-v181-tip]').forEach(removeTipAttrs);
    const maint = $('btnToggleMaintenance');
    if(maint && !maint.getAttribute('data-ce-tip')) maint.setAttribute('title', 'Mantenimiento de tablas generales');
  }

  function ensureTip(){
    let tip = $('ceTooltipV190');
    if(!tip){ tip = document.createElement('div'); tip.id = 'ceTooltipV190'; tip.className = 'ce-tooltip-v190'; document.body.appendChild(tip); }
    return tip;
  }
  function textColorFor(bg){
    const m = String(bg||'').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if(!m) return '#fff';
    const r=Number(m[1]), g=Number(m[2]), b=Number(m[3]);
    const lum = (0.299*r + 0.587*g + 0.114*b);
    return lum > 175 ? '#111827' : '#fff';
  }
  function getTipText(el){
    if(!el) return '';
    return el.getAttribute('data-ce-tip') || el.getAttribute('data-v181-tip') || el.getAttribute('data-tip') || el.getAttribute('title') || '';
  }
  function bgForElement(el){
    const explicit = el?.getAttribute?.('data-tip-bg');
    if(explicit) return explicit;
    const candidates = [el, el?.closest?.('.metric'), el?.closest?.('.summary-item'), el?.closest?.('.vbar-stick'), el?.closest?.('.chart-seg'), el?.closest?.('.budget-panel'), el?.closest?.('.summary-card')].filter(Boolean);
    for(const c of candidates){
      const bg = getComputedStyle(c).backgroundColor;
      if(bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
    }
    return '#111827';
  }
  let activeEl = null;
  let hideTimer = null;
  function placeTip(tip, x, y){
    const margin = 12;
    const text = tip.textContent || '';
    const full = text.length > 1700 || text.split('\n').length > 30;
    tip.classList.toggle('long', text.length > 600 || text.split('\n').length > 14);
    tip.classList.toggle('full', full);
    tip.style.display = 'block';
    tip.style.left = '0px'; tip.style.top = '0px';
    if(full) return;
    const rect = tip.getBoundingClientRect();
    let left = x + 16, top = y + 16;
    if(left + rect.width > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - rect.width - margin);
    if(top + rect.height > window.innerHeight - margin) top = Math.max(margin, window.innerHeight - rect.height - margin);
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }
  function showTip(el, x, y){
    const txt = getTipText(el);
    if(!txt) return;
    clearTimeout(hideTimer);
    activeEl = el;
    const tip = ensureTip();
    tip.textContent = txt;
    const bg = bgForElement(el);
    tip.style.background = bg;
    tip.style.color = textColorFor(bg);
    tip.style.borderColor = textColorFor(bg) === '#111827' ? 'rgba(15,23,42,.18)' : 'rgba(255,255,255,.22)';
    placeTip(tip, x || 24, y || 24);
  }
  function hideTipSoon(){
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      const tip = $('ceTooltipV190');
      if(tip && tip.matches(':hover')) return;
      activeEl = null;
      if(tip) tip.style.display = 'none';
    }, 140);
  }
  document.addEventListener('mouseover', e => {
    const el = e.target.closest?.('[data-ce-tip],[data-v181-tip],[data-tip],[title]');
    if(!el || el.id === 'ceTooltipV181' || el.id === 'ceTooltipV190') return;
    const txt = getTipText(el);
    if(!txt) return;
    if(el.hasAttribute('title')){ el.setAttribute('data-ce-tip', txt); el.removeAttribute('title'); }
    showTip(el, e.clientX, e.clientY);
  }, true);
  document.addEventListener('mousemove', e => {
    const tip = $('ceTooltipV190');
    if(!activeEl || !tip || tip.matches(':hover')) return;
    if(tip.style.display !== 'none') placeTip(tip, e.clientX || 24, e.clientY || 24);
  }, true);
  document.addEventListener('mouseout', e => {
    const tip = $('ceTooltipV190');
    if(tip && (e.relatedTarget === tip || tip.contains(e.relatedTarget))) return;
    hideTipSoon();
  }, true);
  document.addEventListener('focusin', e => {
    const el = e.target.closest?.('[data-ce-tip],[data-v181-tip],[data-tip],[title]');
    if(el && getTipText(el)) showTip(el, 24, 24);
  }, true);
  document.addEventListener('focusout', hideTipSoon, true);
  document.addEventListener('keydown', e => { if(e.key === 'Escape'){ const tip = $('ceTooltipV190'); if(tip) tip.style.display = 'none'; activeEl=null; }}, true);

  function collabRows(){ return (typeof collabsForEvent === 'function') ? (collabsForEvent() || []) : []; }
  function incomeLine(r){
    const persona = r.persona || (state?.personas || []).find(p => String(p.id) === String(r.personaId)) || {};
    const total = Number(r.total ?? ((Number(r.numero||0) * Number((typeof selectedEvent === 'function' ? selectedEvent()?.precio : 0) || 0)) + Number(r.importe||0)));
    return `• ${persona.nombre || 'Sin nombre'} — ${moneyF(total)}`;
  }
  function applyIncomeTooltips(){
    const grid = $('ingresosSummaryGrid');
    if(!grid) return;
    const rows = collabRows();
    Array.from(grid.children).forEach(card => {
      const labelRaw = card.querySelector('.label')?.textContent || '';
      const label = normalize(labelRaw);
      let filter = null;
      let titulo = labelRaw.trim();
      if(label === 'EFECTIVO') filter = r => normalize(r.situacion) === 'EFECTIVO';
      else if(label === 'BANCO') filter = r => normalize(r.situacion) === 'BANCO';
      else if(label === 'BIZUM') filter = r => normalize(r.situacion) === 'BIZUM';
      else if(label === 'PENDIENTE' || label === 'BIZUM PENDIENTE') filter = r => normalize(r.situacion) === 'PENDIENTE';
      else if(label === 'TOTAL INGRESOS') filter = () => true;
      if(!filter) return;
      const selected = rows.filter(filter);
      const total = selected.reduce((a,b)=> a + Number(b.total ?? 0), 0);
      const lines = selected.map(incomeLine).sort((a,b)=>a.localeCompare(b,'es'));
      card.setAttribute('data-ce-tip', `${titulo}\nTOTAL: ${moneyF(total)}\nREGISTROS: ${selected.length}\n\n${lines.length ? lines.join('\n') : 'Sin registros'}`);
      card.setAttribute('data-tip-bg', getComputedStyle(card).backgroundColor || '#ecfdf5');
      card.removeAttribute('title'); card.removeAttribute('data-v181-tip'); card.removeAttribute('data-tip');
      const value = card.querySelector('.value');
      if(value){
        const parts = String(value.textContent || '').split('·');
        if(parts.length >= 2){
          const persons = parts[0].trim();
          value.textContent = `${persons} · ${moneyF(total)}`;
        }
      }
    });
  }
  const previousRenderIngresosSummaryV190 = typeof renderIngresosSummary === 'function' ? renderIngresosSummary : null;
  if(previousRenderIngresosSummaryV190){
    renderIngresosSummary = function(){ previousRenderIngresosSummaryV190(); applyIncomeTooltips(); stripRequestedTooltips(); };
    window.renderIngresosSummary = renderIngresosSummary;
  }

  function personById(id){ return (state?.personas || []).find(p => String(p.id) === String(id)) || {}; }
  function storeById(id){ return (state?.tiendas || []).find(t => String(t.id) === String(id)) || {}; }
  function productById(id){ return (state?.productos || []).find(p => String(p.id) === String(id)) || {}; }
  function isDonation(v){ return (typeof isDonationTicket === 'function') ? isDonationTicket(v) : /^DONADO/i.test(norm(v)); }
  function donorName(c){
    const dr = String(c?.donorRef || '');
    if(dr.startsWith('P:')) return personById(dr.slice(2)).nombre || 'Sin donante';
    if(dr.startsWith('T:')) return storeById(dr.slice(2)).nombre || 'Sin tienda';
    return c?.donanteNombre || c?.donorName || 'Sin donante';
  }
  function productName(c){ return c?.producto?.nombre || productById(c?.productoId).nombre || 'Producto'; }
  function donationDetailMap(){
    const map = new Map();
    const rows = (typeof comprasForEvent === 'function' ? comprasForEvent() : (state?.compras || [])).filter(c => isDonation(c.ticketDonacion));
    rows.forEach(c => {
      const ticket = norm(c.ticketDonacion) || 'DONADO';
      const donor = donorName(c);
      const key = `${donor} | ${ticket}`;
      const qty = Number(c.unidades || 0);
      const price = Number(c.precio ?? productById(c.productoId).defaultPrecio ?? productById(c.productoId).precio ?? 0);
      const val = qty * price;
      if(!map.has(key)) map.set(key, {donor, ticket, total:0, lines:[]});
      const rec = map.get(key);
      rec.total += val;
      rec.lines.push(`• ${productName(c)} — Cantidad: ${numberF(qty)} — Precio estimado: ${moneyF(price)} — Valor estimado: ${moneyF(val)}`);
    });
    map.forEach(rec => rec.lines.sort((a,b)=>a.localeCompare(b,'es')));
    return map;
  }
  function applyTiendaTicketDonationTips(){
    const wrap = $('summaryTiendaTicket');
    if(!wrap) return;
    const details = donationDetailMap();
    if(!details.size) return;
    wrap.querySelectorAll('.summary-item').forEach(item => {
      const label = item.querySelector('span')?.textContent || '';
      for(const [key, rec] of details.entries()){
        if(label.startsWith(key)){
          item.setAttribute('data-ce-tip', `DONACIÓN\nDONANTE: ${rec.donor}\nTIPO: ${rec.ticket}\nTOTAL ESTIMADO: ${moneyF(rec.total)}\n\n${rec.lines.join('\n')}`);
          item.setAttribute('data-tip-bg', '#fff7ed');
          item.removeAttribute('title'); item.removeAttribute('data-v181-tip'); item.removeAttribute('data-tip');
          break;
        }
      }
    });
  }
  const previousRenderSummaryListV190 = typeof renderSummaryList === 'function' ? renderSummaryList : null;
  if(previousRenderSummaryListV190){
    renderSummaryList = function(targetId, rows){
      const ret = previousRenderSummaryListV190(targetId, rows);
      stripRequestedTooltips();
      if(targetId === 'summaryTiendaTicket') applyTiendaTicketDonationTips();
      return ret;
    };
    window.renderSummaryList = renderSummaryList;
  }

  function hasDependency(action, id){
    const sid = String(id || '');
    const st = window.state || {};
    if(!sid) return false;
    if(action === 'delete-persona'){
      return (st.colaboradores || []).some(c => String(c.personaId) === sid)
        || (st.compras || []).some(c => String(c.responsableId) === sid || String(c.donorRef || '') === `P:${sid}`);
    }
    if(action === 'delete-producto'){
      return (st.compras || []).some(c => String(c.productoId) === sid);
    }
    if(action === 'delete-tienda'){
      return (st.compras || []).some(c => String(c.tiendaId) === sid || String(c.donorRef || '') === `T:${sid}`);
    }
    if(action === 'delete-evento'){
      return (st.colaboradores || []).some(c => String(c.eventId) === sid)
        || (st.compras || []).some(c => String(c.eventId) === sid)
        || Object.keys(st.ticketImages || {}).some(k => String(k).startsWith(`${sid}|`));
    }
    return false;
  }
  document.addEventListener('click', function(e){
    const btn = e.target.closest?.('button[data-action]');
    if(!btn) return;
    const action = btn.dataset.action || '';
    if(!/^delete-(persona|producto|tienda|evento)$/.test(action)) return;
    if(hasDependency(action, btn.dataset.id)){
      e.preventDefault();
      e.stopImmediatePropagation();
      alert(DELETE_BLOCK_MSG);
    }
  }, true);

  function normalizeDownloadName(name){
    let n = String(name || '');
    const now = new Date();
    n = n.replace(/^ControlEvent_v\d+_\d+-([^_]+(?:_[^_]+)*)_(\d{2})(\d{2})(\d{4})\.xlsx$/i, (_m,title,dd,mm,yyyy) => `${VERSION_FILE}_INFOEVENTO-${title}_${yyyy}${mm}${dd}.xlsx`);
    n = n.replace(/^ControlEvent_v\d+_\d+_BACKUP_(.+?)_(\d{2})(\d{2})(\d{4})-(\d{2})[:_](\d{2})[:_](\d{2})\.xlsx$/i, (_m,scope,dd,mm,yyyy,hh,mi,ss) => `${VERSION_FILE}_BACKUP_${scope}_${yyyy}${mm}${dd}-${hh}_${mi}_${ss}.xlsx`);
    n = n.replace(/^ControlEvent_v\d+_\d+_BACKUP_(.+?)_(\d{4})(\d{2})(\d{2})-(\d{2})[:_](\d{2})[:_](\d{2})\.xlsx$/i, (_m,scope,yyyy,mm,dd,hh,mi,ss) => `${VERSION_FILE}_BACKUP_${scope}_${yyyy}${mm}${dd}-${hh}_${mi}_${ss}.xlsx`);
    if(/^ControlEvent_v\d+_\d+_descarga_datos\.xlsx$/i.test(n)) n = `${VERSION_FILE}_BACKUP_TODOS_${ymd(now)}-${timeUnderscore(now)}.xlsx`;
    return n;
  }
  const originalAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function(){
    try{ if(this.download) this.download = normalizeDownloadName(this.download); }catch(_){ }
    return originalAnchorClick.apply(this, arguments);
  };

  function wireExcelButton(){
    const btn = $('btnExportExcel');
    if(!btn || btn.dataset.v190ExcelWired === '1') return;
    btn.dataset.v190ExcelWired = '1';
    btn.onclick = function(ev){
      ev.preventDefault(); ev.stopPropagation();
      try{
        if(typeof exportExcel === 'function') exportExcel();
        else if(typeof window.exportExcel === 'function') window.exportExcel();
        else alert('No se encontró la función de exportación a Excel.');
      }catch(err){
        console.error(err);
        alert('No se pudo generar el Excel. Revisa la consola para ver el detalle del error.');
      }
      return false;
    };
  }

  function afterRenderV190(){
    refreshVersionV190();
    stripRequestedTooltips();
    applyIncomeTooltips();
    applyTiendaTicketDonationTips();
    wireExcelButton();
  }
  const previousRenderV190 = typeof render === 'function' ? render : null;
  if(previousRenderV190){
    render = function(){ const ret = previousRenderV190.apply(this, arguments); setTimeout(afterRenderV190, 0); return ret; };
    window.render = render;
  }
  document.addEventListener('DOMContentLoaded', afterRenderV190);
  window.addEventListener('load', () => { afterRenderV190(); setTimeout(afterRenderV190, 250); });
  afterRenderV190();
})();
