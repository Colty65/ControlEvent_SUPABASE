/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #27. */
/* ==== V19.6: comportamiento de Por tienda y Ticket aplicado a todos los globos ==== */
(function(){
  const VERSION = 'ControlEvent v26.6';
  const VERSION_FILE = 'ControlEvent_v26_6';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const normUp = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const moneyRe = /(?:\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)(?:\s|&nbsp;|\u00a0)*(?:€|EUR)|(?:€|EUR)(?:\s|&nbsp;|\u00a0)*(?:\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)/i;
  let activeOwner = null;
  let insideTip = false;
  let closeTimer = null;

  function sortKey(line){
    let s = String(line || '').replace(/^\s*•\s*/, '').trim();
    s = s.replace(/^(DONANTE|SOCIO|NO SOCIO|PERSONA|NOMBRE|PRODUCTO|TIENDA)\s*:\s*/i,'');
    s = s.split(/\s+[—-]\s+|\s*\|\s*|\s*:\s*/)[0] || s;
    return normUp(s);
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
        block.sort((a,b)=>sortKey(a).localeCompare(sortKey(b),'es'));
        out.push(...block);
      }else{
        out.push(lines[i++]);
      }
    }
    return out.join('\n');
  }
  function rawTip(el){
    if(!el) return '';
    return el.getAttribute('data-ce-tip-v196') || el.getAttribute('data-ce-tip-v1952') || el.getAttribute('data-ce-tip') || el.getAttribute('data-v181-tip') || el.getAttribute('data-tip') || el.getAttribute('title') || '';
  }
  function splitRecord(line){
    return String(line || '').replace(/^\s*•\s*/,'').split(/\s+[—-]\s+|\s*\|\s*/).map(x=>x.trim()).filter(Boolean);
  }
  function boldFinalMoney(html){
    if(!moneyRe.test(html)) return html;
    moneyRe.lastIndex = 0;
    const matches = [...String(html).matchAll(moneyRe)];
    if(!matches.length) return html;
    const last = matches[matches.length - 1];
    const start = last.index;
    const end = start + last[0].length;
    return html.slice(0,start) + '<strong>' + html.slice(start,end) + '</strong>' + html.slice(end);
  }
  function cellHtml(text, idx, total){
    let h = esc(text);
    if(idx === 0) return '<strong>' + h + '</strong>';
    if(idx === total - 1 && moneyRe.test(text)) return boldFinalMoney(h);
    moneyRe.lastIndex = 0;
    if(/\b(TOTAL|IMPORTE FINAL|VALOR TOTAL|SALDO FINAL)\b/i.test(text) && moneyRe.test(text)) return boldFinalMoney(h);
    return h;
  }
  function renderRecordTable(lines){
    const rows = lines.map(line => splitRecord(line));
    const max = Math.max(1, ...rows.map(r => r.length));
    return '<table class="ce-tip-table"><tbody>' + rows.map(cells => {
      const padded = [...cells];
      while(padded.length < max) padded.push('');
      return '<tr>' + padded.map((c,idx)=>'<td>' + cellHtml(c, idx, cells.length) + '</td>').join('') + '</tr>';
    }).join('') + '</tbody></table>';
  }
  function tipHtml(raw){
    const lines = sortTipText(raw).split('\n');
    const parts = [];
    for(let i=0;i<lines.length;){
      const line = lines[i];
      if(!line.trim()){ parts.push('<div class="ce-tip-blank"></div>'); i++; continue; }
      if(isRecordLine(line)){
        const block = [];
        while(i<lines.length && isRecordLine(lines[i])) block.push(lines[i++]);
        parts.push(renderRecordTable(block));
        continue;
      }
      const h = esc(line);
      if(/\b(TOTAL|SOCIOS|NO SOCIOS|DONACI[ÓO]N|INGRESOS|COMPRADO|PENDIENTE|DONADO|TICKET|PERSONAS|PRODUCTOS)\b/i.test(line)) parts.push('<div class="ce-tip-title">' + boldFinalMoney(h) + '</div>');
      else parts.push('<div class="ce-tip-text">' + boldFinalMoney(h) + '</div>');
      i++;
    }
    return parts.join('');
  }
  function ensureTip(){
    let tip = $('ceTooltipV196');
    if(!tip){
      tip = document.createElement('div');
      tip.id = 'ceTooltipV196';
      document.body.appendChild(tip);
      tip.addEventListener('mouseenter', () => { insideTip = true; cancelClose(); }, true);
      tip.addEventListener('mouseleave', ev => {
        insideTip = false;
        if(activeOwner && ev.relatedTarget && activeOwner.contains && activeOwner.contains(ev.relatedTarget)) return;
        scheduleClose(170);
      }, true);
      ['pointerdown','click','mousemove','pointermove','wheel','touchstart'].forEach(evt => {
        tip.addEventListener(evt, ev => {
          insideTip = true;
          cancelClose();
          ev.stopPropagation();
        }, {capture:true, passive:true});
      });
    }
    return tip;
  }
  function cancelClose(){
    if(closeTimer){ clearTimeout(closeTimer); closeTimer = null; }
  }
  function closeTip(){
    cancelClose();
    detachOwner();
    insideTip = false;
    activeOwner = null;
    const tip = $('ceTooltipV196');
    if(tip) tip.style.display = 'none';
  }
  function scheduleClose(delay=260){
    cancelClose();
    closeTimer = setTimeout(() => {
      const tip = $('ceTooltipV196');
      if(insideTip || (tip && tip.matches(':hover')) || (activeOwner && activeOwner.matches && activeOwner.matches(':hover'))) return;
      closeTip();
    }, delay);
  }
  function ownerOf(el){
    return el?.closest?.('.metric,.summary-card,.summary-item,.budget-row,.budget-subrow,.chart-track,.chart-seg,.vbars-card,.vbar-col,.chart-stat,.itemcard,.budget-panel,.ticket-row,.ticket-line') || el;
  }
  function detachOwner(){
    if(activeOwner && activeOwner.__ceLeave196){
      activeOwner.removeEventListener('mouseleave', activeOwner.__ceLeave196, true);
      activeOwner.__ceLeave196 = null;
    }
  }
  function attachOwner(owner){
    detachOwner();
    activeOwner = owner;
    if(!owner) return;
    owner.__ceLeave196 = ev => {
      const tip = $('ceTooltipV196');
      if(tip && ev.relatedTarget && (ev.relatedTarget === tip || tip.contains(ev.relatedTarget))) return;
      scheduleClose(360);
    };
    owner.addEventListener('mouseleave', owner.__ceLeave196, true);
  }
  function place(tip, el){
    const margin = 12;
    tip.style.display = 'block';
    tip.style.left = '0px';
    tip.style.top = '0px';
    tip.style.width = 'max-content';
    tip.style.maxWidth = 'min(920px, calc(100vw - 32px))';
    tip.style.maxHeight = '75vh';
    tip.style.overflow = 'auto';
    const r = el.getBoundingClientRect ? el.getBoundingClientRect() : {left:20,top:20,bottom:40,width:0,height:0};
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
    const raw = rawTip(el);
    if(!norm(raw)) return false;
    const tip = ensureTip();
    tip.innerHTML = tipHtml(raw);
    tip.style.background = el.getAttribute('data-tip-bg-v196') || el.getAttribute('data-tip-bg-v1952') || el.getAttribute('data-tip-bg') || '#ffffff';
    tip.style.color = '#111827';
    tip.scrollTop = 0;
    attachOwner(ownerOf(el));
    insideTip = false;
    place(tip, el);
    return true;
  }
  function setTip(el, text, bg){
    if(!el || !norm(text)) return;
    el.setAttribute('data-ce-tip-v196', sortTipText(text));
    el.setAttribute('data-tip-bg-v196', bg || el.getAttribute('data-tip-bg-v1952') || el.getAttribute('data-tip-bg') || '#ffffff');
    el.removeAttribute('data-ce-tip-v1952');
    el.removeAttribute('data-ce-tip');
    el.removeAttribute('data-v181-tip');
    el.removeAttribute('data-tip');
    el.removeAttribute('title');
  }
  function adoptTips(){
    document.querySelectorAll('[data-ce-tip-v196],[data-ce-tip-v1952],[data-ce-tip],[data-v181-tip],[data-tip],[title]').forEach(el => {
      if(el.closest?.('#authOverlay')) return;
      if(el.id === 'btnExportExcel') return;
      const raw = rawTip(el);
      if(!norm(raw)) return;
      const bg = el.getAttribute('data-tip-bg-v196') || el.getAttribute('data-tip-bg-v1952') || el.getAttribute('data-tip-bg') || (el.classList?.contains('chart-seg') || el.classList?.contains('vbar-stick') ? getComputedStyle(el).backgroundColor : '#ffffff');
      setTip(el, raw, bg);
    });
    const old1 = $('ceTooltipV1952'); if(old1) old1.style.display = 'none';
    const old2 = $('ceTooltipV190'); if(old2) old2.style.display = 'none';
    const old3 = $('ceTooltipV181'); if(old3) old3.style.display = 'none';
  }
  function refreshVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span, .appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION;
    });
  }
  function normalizeDownloadName(name){
    return String(name || '').replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE);
  }
  if(!HTMLAnchorElement.prototype.click.__v196Wrapped){
    const prev = HTMLAnchorElement.prototype.click;
    const wrapped = function(){
      try{ if(this.download) this.download = normalizeDownloadName(this.download); }catch(_){ }
      return prev.apply(this, arguments);
    };
    wrapped.__v196Wrapped = true;
    HTMLAnchorElement.prototype.click = wrapped;
  }
  function afterRender(){
    refreshVersion();
    setTimeout(adoptTips, 0);
    setTimeout(adoptTips, 180);
    setTimeout(adoptTips, 520);
  }
  document.addEventListener('click', ev => {
    const tip = $('ceTooltipV196');
    if(tip && (ev.target === tip || tip.contains(ev.target))) return;
    if(ev.target.closest?.('.ticket-actions, .ce-photo-btn-v202')) return;
    const el = ev.target.closest?.('[data-ce-tip-v196]');
    if(!el){ closeTip(); return; }
    if(openTip(el)){
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
    }
  }, true);
  document.addEventListener('keydown', ev => { if(ev.key === 'Escape') closeTip(); }, true);
  window.addEventListener('resize', () => closeTip(), true);
  window.addEventListener('scroll', ev => {
    const tip = $('ceTooltipV196');
    if(tip && ev.target && (ev.target === tip || tip.contains(ev.target))) return;
    closeTip();
  }, true);
  const prevRender = typeof render === 'function' ? render : null;
  if(prevRender && !prevRender.__v196Wrapped){
    const wrappedRender = function(){
      const ret = prevRender.apply(this, arguments);
      setTimeout(afterRender, 60);
      setTimeout(afterRender, 300);
      setTimeout(afterRender, 800);
      return ret;
    };
    wrappedRender.__v196Wrapped = true;
    render = wrappedRender;
    window.render = render;
  }
  ['DOMContentLoaded','load'].forEach(evt => window.addEventListener(evt, () => {
    setTimeout(afterRender, 60);
    setTimeout(afterRender, 320);
    setTimeout(afterRender, 900);
  }));
  afterRender();
  setTimeout(afterRender, 450);
  setTimeout(afterRender, 1400);
})();
