/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #26. */
/* ==== V19.5.2: recupera globos y Excel desde v19.4, evitando interferencias de parches antiguos ==== */
(function(){
  const VERSION = 'ControlEvent v26.6';
  const VERSION_FILE = 'ControlEvent_v26_6';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const normUp = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const moneyRe = /(?:\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)(?:\s|&nbsp;|\u00a0)*(?:€|EUR)|(?:€|EUR)(?:\s|&nbsp;|\u00a0)*(?:\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)/gi;

  let activeOwner = null;
  let closeTimer = null;
  let excelWired = false;

  function moneyF(v){
    try{ return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0)); }
    catch(_){ return `${Number(v || 0).toFixed(2)} €`; }
  }
  function numF(v){
    try{ return new Intl.NumberFormat('es-ES',{minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(v || 0)); }
    catch(_){ return String(v ?? ''); }
  }
  function getState(){
    try{ if(typeof state !== 'undefined' && state) return state; }catch(_){ }
    return window.state || {};
  }
  function getRawLegacyTip(el){
    if(!el) return '';
    return el.getAttribute('data-ce-tip-v1952') || el.getAttribute('data-ce-tip') || el.getAttribute('data-v181-tip') || el.getAttribute('data-tip') || el.getAttribute('title') || '';
  }
  function sortKey(line){
    let s = String(line || '').replace(/^\s*•\s*/, '').trim();
    s = s.replace(/^(DONANTE|SOCIO|NO SOCIO|PERSONA|NOMBRE|PRODUCTO|TIENDA)\s*:\s*/i,'');
    s = s.split(/\s+[—-]\s+|\s*\|\s*|\s*:\s*/)[0] || s;
    return normUp(s);
  }
  function sortRecordBlock(lines){
    return lines.sort((a,b)=>sortKey(a).localeCompare(sortKey(b),'es'));
  }
  function isRecordLine(line){
    const s = String(line || '').trim();
    return /^•\s*/.test(s) || /\s[—-]\s/.test(s) || /\|/.test(s);
  }
  function sortTipText(raw){
    const lines = String(raw || '').replace(/\r\n/g,'\n').split('\n');
    const out = [];
    for(let i=0;i<lines.length;){
      if(isRecordLine(lines[i])){
        const block = [];
        while(i<lines.length && isRecordLine(lines[i])) block.push(lines[i++]);
        out.push(...sortRecordBlock(block));
      }else{
        out.push(lines[i++]);
      }
    }
    return out.join('\n');
  }
  function boldLastMoney(html){
    const matches = [...html.matchAll(moneyRe)];
    if(!matches.length) return html;
    const m = matches[matches.length - 1];
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
    let tip = $('ceTooltipV1952');
    if(!tip){
      tip = document.createElement('div');
      tip.id = 'ceTooltipV1952';
      document.body.appendChild(tip);
      ['mouseenter','mousemove','pointermove','wheel','scroll','pointerdown','touchstart','click'].forEach(evt => {
        tip.addEventListener(evt, ev => {
          if(closeTimer){ clearTimeout(closeTimer); closeTimer = null; }
          ev.stopPropagation();
        }, {capture:true, passive: evt === 'wheel' ? false : true});
      });
    }
    return tip;
  }
  function getOwner(el){
    return el?.closest?.('.metric,.summary-card,.summary-item,.budget-row,.budget-subrow,.chart-track,.chart-seg,.vbars-card,.vbar-col,.chart-stat,.itemcard,.budget-panel') || el;
  }
  function clearOwnerLeave(){
    if(activeOwner && activeOwner.__ceLeave1952){
      activeOwner.removeEventListener('mouseleave', activeOwner.__ceLeave1952, true);
      activeOwner.__ceLeave1952 = null;
    }
  }
  function closeTip(){
    if(closeTimer){ clearTimeout(closeTimer); closeTimer = null; }
    clearOwnerLeave();
    activeOwner = null;
    const tip = $('ceTooltipV1952');
    if(tip) tip.style.display = 'none';
  }
  function scheduleClose(delay=120){
    if(closeTimer) clearTimeout(closeTimer);
    closeTimer = setTimeout(() => closeTip(), delay);
  }
  function placeTip(tip, el){
    const margin = 12;
    tip.style.display = 'block';
    tip.style.left = '0px';
    tip.style.top = '0px';
    tip.style.width = 'max-content';
    tip.style.maxWidth = 'min(860px, calc(100vw - 32px))';
    tip.style.maxHeight = '75vh';
    tip.style.overflow = 'auto';
    const r = el.getBoundingClientRect ? el.getBoundingClientRect() : {left:20,bottom:20,width:0,height:0,top:20};
    const tr = tip.getBoundingClientRect();
    let left = r.left;
    let top = r.bottom + 8;
    if(left + tr.width > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - tr.width - margin);
    if(top + tr.height > window.innerHeight - margin) top = Math.max(margin, r.top - tr.height - 8);
    if(top < margin) top = margin;
    tip.style.left = Math.round(left) + 'px';
    tip.style.top = Math.round(top) + 'px';
  }
  function openTip(el){
    const raw = getRawLegacyTip(el);
    if(!norm(raw)) return false;
    const tip = ensureTip();
    tip.innerHTML = tipHtml(raw);
    tip.style.background = el.getAttribute('data-tip-bg-v1952') || el.getAttribute('data-tip-bg') || '#ffffff';
    tip.style.color = '#111827';
    tip.scrollTop = 0;
    clearOwnerLeave();
    activeOwner = getOwner(el);
    if(activeOwner){
      activeOwner.__ceLeave1952 = ev => {
        const t = $('ceTooltipV1952');
        if(t && ev.relatedTarget && (ev.relatedTarget === t || t.contains(ev.relatedTarget))) return;
        scheduleClose(140);
      };
      activeOwner.addEventListener('mouseleave', activeOwner.__ceLeave1952, true);
    }
    placeTip(tip, el);
    return true;
  }

  function setNewTip(el, text, bg){
    if(!el || !norm(text)) return;
    el.setAttribute('data-ce-tip-v1952', sortTipText(text));
    el.setAttribute('data-tip-bg-v1952', bg || '#ffffff');
    el.removeAttribute('data-ce-tip');
    el.removeAttribute('data-v181-tip');
    el.removeAttribute('data-tip');
    el.removeAttribute('title');
  }
  function freezeLegacyTips(){
    document.querySelectorAll('[data-ce-tip],[data-v181-tip],[data-tip],[title]').forEach(el => {
      if(el.closest?.('#authOverlay')) return;
      if(el.id === 'btnExportExcel') return;
      const raw = getRawLegacyTip(el);
      if(!norm(raw)) return;
      const bg = el.getAttribute('data-tip-bg') || (el.classList?.contains('chart-seg') ? getComputedStyle(el).backgroundColor : '#ffffff');
      setNewTip(el, raw, bg);
    });
  }

  function personaNombre(id){
    try{ const p = (typeof personaById === 'function') ? personaById(id) : null; if(p?.nombre) return p.nombre; }catch(_){ }
    const st = getState(); return (st.personas || []).find(p => String(p.id) === String(id))?.nombre || 'Sin nombre';
  }
  function productoNombre(id){
    try{ const p = (typeof productoById === 'function') ? productoById(id) : null; if(p?.nombre) return p.nombre; }catch(_){ }
    const st = getState(); return (st.productos || []).find(p => String(p.id) === String(id))?.nombre || 'Producto';
  }
  function productoPrecio(id){
    try{ const p = (typeof productoById === 'function') ? productoById(id) : null; if(p) return Number(p.precio ?? p.defaultPrecio ?? 0); }catch(_){ }
    const st = getState(); const p = (st.productos || []).find(x => String(x.id) === String(id));
    return Number(p?.precio ?? p?.defaultPrecio ?? 0);
  }
  function donorName(c){
    try{ if(typeof resolveDonorNameV171 === 'function'){ const v = resolveDonorNameV171(c); if(norm(v) && normUp(v) !== 'SIN TIENDA') return v; } }catch(_){ }
    try{ if(typeof resolveDonorNameV164 === 'function'){ const v = resolveDonorNameV164(c); if(norm(v) && normUp(v) !== 'SIN TIENDA') return v; } }catch(_){ }
    const raw = norm(c?.donorRef || c?.donante || c?.donanteNombre || '');
    if(raw.startsWith('P:')) return personaNombre(raw.slice(2));
    return raw || 'Sin donante';
  }
  function productLine(c, donation=false){
    const prod = c?.producto?.nombre || productoNombre(c?.productoId);
    const qty = Number(c?.unidades || 0);
    const price = Number(c?.precio ?? c?.precioCalc ?? productoPrecio(c?.productoId));
    const val = Number(c?.valor ?? (qty * price));
    return donation
      ? `• ${prod} — Cantidad: ${numF(qty)} — Precio estimado: ${moneyF(price)} — Valor estimado: ${moneyF(val)}`
      : `• ${prod} — Cantidad: ${numF(qty)} — Precio: ${moneyF(price)} — Importe: ${moneyF(val)}`;
  }
  function applyBudgetSpecificTips(){
    const b = (typeof budgetSummary === 'function') ? budgetSummary() : null;
    const rows = (typeof collabsForEvent === 'function') ? collabsForEvent() : [];
    const compras = (typeof comprasForEvent === 'function') ? comprasForEvent() : [];
    const socioRows = rows.filter(r => r.persona?.rango === 'SOCIO');
    const noSocioRows = rows.filter(r => r.persona?.rango !== 'SOCIO');
    const linesCollab = arr => arr.map(r => `• ${r.persona?.nombre || personaNombre(r.personaId)} — Nº: ${numF(r.numero || 0)} — Total: ${moneyF(r.total ?? r.importe ?? 0)}`).sort((a,b)=>sortKey(a).localeCompare(sortKey(b),'es'));
    const donationLines = ticket => compras.filter(c => norm(c.ticketDonacion) === ticket).map(c => `• ${donorName(c)} — ${productLine(c,true).replace(/^•\s*/, '')}`).sort((a,b)=>sortKey(a).localeCompare(sortKey(b),'es'));
    document.querySelectorAll('#budgetLayout .budget-subrow').forEach(row => {
      const label = norm(row.querySelector('span')?.textContent || '');
      let text = '';
      if(label === 'Personas'){
        const isNoSocio = !!row.closest('.budget-subrows')?.previousElementSibling?.textContent?.toUpperCase?.().includes('NO SOCIOS');
        const arr = isNoSocio ? noSocioRows : socioRows;
        text = `${isNoSocio ? 'NO SOCIOS' : 'SOCIOS'} / PERSONAS\n${linesCollab(arr).join('\n') || 'Sin registros'}`;
      }else if(/Importe socios/i.test(label)) text = `SOCIOS / IMPORTE SOCIOS\n${(b?.ingresosDinero?.socios?.listImporte || linesCollab(socioRows)).join('\n') || 'Sin registros'}`;
      else if(/Ingresado socios/i.test(label)) text = `SOCIOS / INGRESADO SOCIOS\n${(b?.ingresosDinero?.socios?.listIngresado || linesCollab(socioRows.filter(r=>r.situacion!=='Pendiente'))).join('\n') || 'Sin registros'}`;
      else if(/Pendiente socios/i.test(label)) text = `SOCIOS / PENDIENTE SOCIOS\n${(b?.ingresosDinero?.socios?.listPendiente || linesCollab(socioRows.filter(r=>r.situacion==='Pendiente'))).join('\n') || 'Sin registros'}`;
      else if(/Importe no socios|Importe donantes/i.test(label)) text = `NO SOCIOS / IMPORTE NO SOCIOS\n${(b?.ingresosDinero?.noSocios?.listImporte || b?.ingresosDinero?.donantes?.listImporte || linesCollab(noSocioRows)).join('\n') || 'Sin registros'}`;
      else if(/Ingresado no socios|Ingresado donantes/i.test(label)) text = `NO SOCIOS / INGRESADO NO SOCIOS\n${(b?.ingresosDinero?.noSocios?.listIngresado || b?.ingresosDinero?.donantes?.listIngresado || linesCollab(noSocioRows.filter(r=>r.situacion!=='Pendiente'))).join('\n') || 'Sin registros'}`;
      else if(/Pendiente no socios|Pendiente donantes/i.test(label)) text = `NO SOCIOS / PENDIENTE NO SOCIOS\n${(b?.ingresosDinero?.noSocios?.listPendiente || b?.ingresosDinero?.donantes?.listPendiente || linesCollab(noSocioRows.filter(r=>r.situacion==='Pendiente'))).join('\n') || 'Sin registros'}`;
      else if(/Donación de producto tiendas/i.test(label)) text = `DONACIÓN DE PRODUCTO / TIENDAS\n${(b?.donacionProducto?.listTiendas || donationLines('DONADO TIENDA')).join('\n') || 'Sin registros'}`;
      else if(/Donación de producto socios/i.test(label)) text = `DONACIÓN DE PRODUCTO / SOCIOS\n${(b?.donacionProducto?.listSocios || donationLines('DONADO SOCIO')).join('\n') || 'Sin registros'}`;
      else if(/Donación de producto no socios/i.test(label)) text = `DONACIÓN DE PRODUCTO / NO SOCIOS\n${(b?.donacionProducto?.listNoSocios || donationLines('DONADO OTROS')).join('\n') || 'Sin registros'}`;
      if(text){
        setNewTip(row, text, '#ffffff');
        const first = row.querySelector('span'); if(first) setNewTip(first, text, '#ffffff');
        const last = row.querySelector('span:last-child'); if(last) setNewTip(last, text, '#ffffff');
      }
    });
  }

  function normalizeDownloadName(name){
    let n = String(name || '');
    n = n.replace(/^ControlEvent_v\d+_\d+(?:_\d+)?/i, VERSION_FILE);
    n = n.replace(/ControlEvent_v19_\d(?:_\d+)?/ig, VERSION_FILE);
    return n;
  }
  if(!HTMLAnchorElement.prototype.click.__v1952Wrapped){
    const prev = HTMLAnchorElement.prototype.click;
    const wrapped = function(){
      try{ if(this.download) this.download = normalizeDownloadName(this.download); }catch(_){ }
      return prev.apply(this, arguments);
    };
    wrapped.__v1952Wrapped = true;
    HTMLAnchorElement.prototype.click = wrapped;
  }
  async function runExcelExportV1952(){
    try{
      const fn = (typeof exportExcel === 'function') ? exportExcel : (typeof window.exportExcel === 'function' ? window.exportExcel : null);
      if(!fn){ alert('No se encontró la función de exportación a Excel.'); return; }
      const ret = fn.call(window);
      if(ret && typeof ret.then === 'function') await ret;
    }catch(err){
      console.error('Error exportando INFOEVENTO v19.5.2', err);
      alert('No se pudo descargar la INFOEVENTO. Revisa la consola para ver el detalle.');
    }
  }
  function wireExcelButtonV1952(){
    let btn = $('btnExportExcel');
    if(!btn) return;
    if(btn.dataset.v1952Clean !== '1'){
      const clone = btn.cloneNode(true);
      clone.dataset.v1952Clean = '1';
      clone.id = 'btnExportExcel';
      btn.parentNode.replaceChild(clone, btn);
      btn = clone;
    }
    btn.disabled = false;
    btn.removeAttribute('disabled');
    btn.classList.remove('locked');
    btn.style.pointerEvents = 'auto';
    btn.style.opacity = '1';
    btn.setAttribute('aria-disabled','false');
    if(excelWired) return;
    excelWired = true;
    btn.addEventListener('click', ev => {
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      closeTip();
      runExcelExportV1952();
    }, true);
  }
  function refreshVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span, .appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION;
    });
  }
  function afterRenderV1952(){
    refreshVersion();
    applyBudgetSpecificTips();
    freezeLegacyTips();
    wireExcelButtonV1952();
    const oldTip = $('ceTooltipV190'); if(oldTip) oldTip.style.display = 'none';
    const oldTip2 = $('ceTooltipV181'); if(oldTip2) oldTip2.style.display = 'none';
  }

  document.addEventListener('click', ev => {
    const tip = $('ceTooltipV1952');
    if(tip && (ev.target === tip || tip.contains(ev.target))) return;
    const el = ev.target.closest?.('[data-ce-tip-v1952]');
    if(!el){ closeTip(); return; }
    const ok = openTip(el);
    if(ok){
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
    }
  }, true);
  document.addEventListener('keydown', ev => { if(ev.key === 'Escape') closeTip(); }, true);
  window.addEventListener('scroll', () => closeTip(), true);
  window.addEventListener('resize', () => closeTip(), true);

  const prevRender = typeof render === 'function' ? render : null;
  if(prevRender && !prevRender.__v1952Wrapped){
    const wrappedRender = function(){
      const ret = prevRender.apply(this, arguments);
      setTimeout(afterRenderV1952, 40);
      setTimeout(afterRenderV1952, 260);
      setTimeout(afterRenderV1952, 620);
      return ret;
    };
    wrappedRender.__v1952Wrapped = true;
    render = wrappedRender;
    window.render = render;
  }
  ['DOMContentLoaded','load'].forEach(evt => window.addEventListener(evt, () => {
    setTimeout(afterRenderV1952, 40);
    setTimeout(afterRenderV1952, 260);
    setTimeout(afterRenderV1952, 850);
  }));
  afterRenderV1952();
  setTimeout(afterRenderV1952, 350);
  setTimeout(afterRenderV1952, 1200);
})();
