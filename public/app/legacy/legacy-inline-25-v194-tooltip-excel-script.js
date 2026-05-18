/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #25. */
/* ==== V19.4: los globos no cambian al mover el cursor y el botón Excel queda cableado de forma directa ==== */
(function(){
  const VERSION = 'ControlEvent v26.6';
  const VERSION_FILE = 'ControlEvent_v26_6';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const normUp = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const moneyRe = /(?:\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)(?:\s|&nbsp;|\u00a0)*(?:€|EUR)|(?:€|EUR)(?:\s|&nbsp;|\u00a0)*(?:\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)/gi;

  let activeTarget = null;
  let activeRaw = '';
  let activeHtml = '';
  let activeBg = '#ffffff';
  let activeX = 24;
  let activeY = 24;
  let keepOpenUntil = 0;

  function getRawTip(el){
    if(!el) return '';
    return el.getAttribute('data-ce-tip') || el.getAttribute('data-v181-tip') || el.getAttribute('data-tip') || el.getAttribute('title') || '';
  }
  function sortKey(line){
    let s = String(line || '').replace(/^\s*•\s*/, '').trim();
    s = s.replace(/^(DONANTE|SOCIO|NO SOCIO|PERSONA|NOMBRE|PRODUCTO|TIENDA)\s*:\s*/i,'');
    s = s.split(/\s+[—-]\s+|\s*\|\s*|\s*:\s*/)[0] || s;
    return normUp(s);
  }
  function sortConsecutiveBullets(lines){
    const out = [];
    for(let i=0;i<lines.length;){
      if(/^\s*•\s*/.test(lines[i] || '')){
        const block = [];
        while(i<lines.length && /^\s*•\s*/.test(lines[i] || '')) block.push(lines[i++]);
        block.sort((a,b)=>sortKey(a).localeCompare(sortKey(b),'es'));
        out.push(...block);
      }else{
        out.push(lines[i++]);
      }
    }
    return out;
  }
  function sortTipText(raw){
    return sortConsecutiveBullets(String(raw || '').replace(/\r\n/g,'\n').split('\n')).join('\n');
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
    let tip = $('ceTooltipV190');
    if(!tip){
      tip = document.createElement('div');
      tip.id = 'ceTooltipV190';
      tip.className = 'ce-tooltip-v190';
      document.body.appendChild(tip);
    }
    return tip;
  }
  function placeTip(tip){
    const margin = 12;
    tip.classList.remove('full');
    tip.classList.add('ce-click-open');
    tip.style.display = 'block';
    tip.style.width = 'max-content';
    tip.style.minWidth = 'min(220px, calc(100vw - 32px))';
    tip.style.maxWidth = 'min(860px, calc(100vw - 32px))';
    tip.style.maxHeight = '75vh';
    tip.style.overflow = 'auto';
    tip.style.pointerEvents = 'auto';
    tip.style.left = '0px';
    tip.style.top = '0px';
    const rect = tip.getBoundingClientRect();
    let left = activeX + 14;
    let top = activeY + 14;
    if(left + rect.width > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - rect.width - margin);
    if(top + rect.height > window.innerHeight - margin) top = Math.max(margin, window.innerHeight - rect.height - margin);
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }
  function enforceActiveTip(){
    const tip = $('ceTooltipV190');
    if(!activeTarget || !activeRaw || !tip) return;
    tip.innerHTML = activeHtml;
    tip.dataset.v194Html = activeHtml;
    tip.style.background = activeBg || '#ffffff';
    tip.style.color = '#111827';
    tip.style.borderColor = 'rgba(15,23,42,.18)';
    placeTip(tip);
  }
  function openTip(el, x, y){
    const raw = getRawTip(el);
    if(!norm(raw)) return false;
    activeTarget = el;
    activeRaw = sortTipText(raw);
    activeHtml = tipHtml(activeRaw);
    activeBg = el.getAttribute('data-tip-bg') || '#ffffff';
    activeX = Number.isFinite(x) ? x : 24;
    activeY = Number.isFinite(y) ? y : 24;
    const tip = ensureTip();
    tip.scrollTop = 0;
    enforceActiveTip();
    return true;
  }
  function closeTip(){
    activeTarget = null;
    activeRaw = '';
    activeHtml = '';
    const tip = $('ceTooltipV190');
    if(tip){
      tip.classList.remove('ce-click-open');
      tip.style.display = 'none';
    }
  }
  function hideHoverResidue(){
    const tip = $('ceTooltipV190');
    if(tip && !activeTarget){
      tip.classList.remove('ce-click-open');
      tip.style.display = 'none';
    }
  }

  // Los parches anteriores tenían escuchas de mousemove que reescribían el globo.
  // Esta rutina vuelve a fijar el contenido activo después de cada movimiento.
  ['mouseover','mousemove','mouseenter','focusin'].forEach(evt => {
    document.addEventListener(evt, ev => {
      if(activeTarget){
        keepOpenUntil = Date.now() + 250;
        setTimeout(enforceActiveTip, 0);
        setTimeout(enforceActiveTip, 20);
      }else{
        setTimeout(hideHoverResidue, 0);
      }
    }, true);
  });

  document.addEventListener('click', ev => {
    const tip = $('ceTooltipV190');
    if(tip && (ev.target === tip || tip.contains(ev.target))){
      keepOpenUntil = Date.now() + 1200;
      return;
    }
    const interactive = ev.target.closest?.('button,input,select,textarea,a');
    if(interactive){ closeTip(); return; }
    const el = ev.target.closest?.('[data-ce-tip],[data-v181-tip],[data-tip]');
    if(!el){ closeTip(); return; }
    const ok = openTip(el, ev.clientX, ev.clientY);
    if(ok){
      ev.preventDefault();
      ev.stopImmediatePropagation();
    }else{
      closeTip();
    }
  }, true);

  function protectTipInteraction(){
    const tip = $('ceTooltipV190');
    if(!tip || tip.dataset.v194Protected === '1') return;
    tip.dataset.v194Protected = '1';
    ['mouseenter','mousemove','wheel','scroll','pointerdown','touchstart'].forEach(evt => {
      tip.addEventListener(evt, () => {
        keepOpenUntil = Date.now() + 1500;
        setTimeout(enforceActiveTip, 0);
      }, {passive:true});
    });
  }
  document.addEventListener('wheel', ev => {
    const tip = $('ceTooltipV190');
    if(tip && (ev.target === tip || tip.contains(ev.target))){
      keepOpenUntil = Date.now() + 1500;
      setTimeout(enforceActiveTip, 0);
      setTimeout(protectTipInteraction, 0);
    }
  }, true);
  window.addEventListener('scroll', ev => {
    const tip = $('ceTooltipV190');
    const insideTip = tip && (ev.target === tip || (ev.target && tip.contains && tip.contains(ev.target)));
    if(activeTarget && (insideTip || Date.now() < keepOpenUntil)){
      setTimeout(enforceActiveTip, 0);
      setTimeout(enforceActiveTip, 30);
    }else if(!activeTarget){
      setTimeout(hideHoverResidue, 0);
    }
  }, true);
  window.addEventListener('resize', () => { if(activeTarget) setTimeout(enforceActiveTip,0); }, true);
  document.addEventListener('keydown', ev => { if(ev.key === 'Escape') closeTip(); }, true);

  function normalizeDownloadName(name){
    let n = String(name || '');
    n = n.replace(/^ControlEvent_v\d+_\d+(?:_\d+)?/i, VERSION_FILE);
    n = n.replace(/ControlEvent_v26_6/ig, VERSION_FILE);
    return n;
  }
  const currentAnchorClick = HTMLAnchorElement.prototype.click;
  if(!HTMLAnchorElement.prototype.click.__v194Wrapped){
    const wrapped = function(){
      try{ if(this.download) this.download = normalizeDownloadName(this.download); }catch(_){ }
      return currentAnchorClick.apply(this, arguments);
    };
    wrapped.__v194Wrapped = true;
    HTMLAnchorElement.prototype.click = wrapped;
  }

  async function runExcelExport(){
    try{
      const fn = (typeof exportExcel === 'function') ? exportExcel : (typeof window.exportExcel === 'function' ? window.exportExcel : null);
      if(!fn){ alert('No se encontró la función de exportación a Excel.'); return; }
      const ret = fn.call(window);
      if(ret && typeof ret.then === 'function') await ret;
    }catch(err){
      console.error('Error exportando INFOEVENTO', err);
      alert('No se pudo descargar la INFOEVENTO. Revisa la consola para ver el detalle.');
    }
  }
  function wireExcelButton(){
    const btn = $('btnExportExcel');
    if(!btn) return;
    btn.disabled = false;
    btn.removeAttribute('disabled');
    btn.classList.remove('locked');
    btn.style.pointerEvents = 'auto';
    btn.style.opacity = '1';
    btn.setAttribute('aria-disabled','false');
    if(btn.dataset.v194ExcelWired === '1') return;
    btn.dataset.v194ExcelWired = '1';
    btn.addEventListener('click', ev => {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      closeTip();
      runExcelExport();
    }, true);
  }
  function refreshVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span, .appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION;
    });
  }
  function afterRenderV194(){
    refreshVersion();
    wireExcelButton();
    protectTipInteraction();
    if(activeTarget) setTimeout(enforceActiveTip, 0); else hideHoverResidue();
  }
  const prevRender = typeof render === 'function' ? render : null;
  if(prevRender && !prevRender.__v194Wrapped){
    const wrappedRender = function(){
      const ret = prevRender.apply(this, arguments);
      setTimeout(afterRenderV194, 20);
      setTimeout(afterRenderV194, 180);
      return ret;
    };
    wrappedRender.__v194Wrapped = true;
    render = wrappedRender;
    window.render = render;
  }
  ['DOMContentLoaded','load'].forEach(evt => window.addEventListener(evt, () => { afterRenderV194(); setTimeout(afterRenderV194, 350); }));
  afterRenderV194();
  setTimeout(afterRenderV194, 350);
  setTimeout(afterRenderV194, 1200);
})();
