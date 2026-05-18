/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #22. */
/* ==== V19.2: tamaño de globos y negritas en productos, donantes/personas e importes totales ==== */
(function(){
  const VERSION = 'ControlEvent v26.6';
  const VERSION_FILE = 'ControlEvent_v26_6';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const getRawTip = el => {
    if(!el) return '';
    return el.getAttribute('data-ce-tip') || el.getAttribute('data-v181-tip') || el.getAttribute('data-tip') || el.getAttribute('title') || '';
  };
  function boldAmounts(html){
    // Formatos típicos: 1.234,56 €, 123 €, € 1.234,56, con espacio normal o NBSP.
    html = html.replace(/(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)(?:\s|&nbsp;|\u00a0)*(€|EUR)/gi, '<strong>$1 $2</strong>');
    html = html.replace(/(€|EUR)(?:\s|&nbsp;|\u00a0)*(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)/gi, '<strong>$1 $2</strong>');
    return html;
  }
  function boldSemanticParts(lineHtml){
    let h = lineHtml;
    // Líneas de totales completas en negrita para que el importe total destaque.
    if(/^\s*(TOTAL|VALOR PRODUCTO DONADO|TOTAL INGRESADO|TOTAL COMPROMETIDO|PENDIENTE|SALDO|IMPORTE TOTAL|TOTAL ESTIMADO)/i.test(h.replace(/<[^>]+>/g,''))){
      h = '<strong>' + h + '</strong>';
      return boldAmounts(h);
    }
    // Producto al inicio de líneas de detalle: "• Producto — Cantidad...".
    h = h.replace(/^((?:\s*•\s*)?)([^—\-\|:]+)(\s+[—-]\s+(?:Cantidad|Precio|Importe|Unidades|Estado|Ticket)\b)/i, '$1<strong>$2</strong>$3');
    // Donantes/personas tras etiqueta explícita.
    h = h.replace(/\b(DONANTE|SOCIO|NO SOCIO|PERSONA|NOMBRE):\s*([^\n—\|]+)/gi, '$1: <strong>$2</strong>');
    // Formato de Por tienda y ticket: "Donante | DONADO..." o "Tienda | TICKET...".
    h = h.replace(/^([^\|\n]+)(\s*\|\s*(?:DONADO|TICKET)\b)/i, '<strong>$1</strong>$2');
    // Viñetas de personas/donantes en listados: "• Nombre — 123 €".
    h = h.replace(/^(\s*•\s*)([^—\n]+)(\s+—\s+)/, '$1<strong>$2</strong>$3');
    return boldAmounts(h);
  }
  function tipHtml(raw){
    return String(raw || '').split('\n').map(line => {
      if(!line.trim()) return '<div class="ce-tip-line ce-tip-blank"></div>';
      return '<div class="ce-tip-line">' + boldSemanticParts(esc(line)) + '</div>';
    }).join('');
  }
  function positionTip(tip, x, y){
    if(!tip) return;
    tip.classList.remove('full');
    tip.style.width = 'max-content';
    tip.style.minWidth = 'min(220px, calc(100vw - 32px))';
    tip.style.maxWidth = 'min(920px, calc(100vw - 32px))';
    tip.style.maxHeight = '75vh';
    tip.style.overflow = 'auto';
    tip.style.whiteSpace = 'normal';
    tip.style.display = 'block';
    const margin = 12;
    const rect = tip.getBoundingClientRect();
    let left = (Number.isFinite(x) ? x : 24) + 16;
    let top = (Number.isFinite(y) ? y : 24) + 16;
    if(left + rect.width > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - rect.width - margin);
    if(top + rect.height > window.innerHeight - margin) top = Math.max(margin, window.innerHeight - rect.height - margin);
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }
  let lastTarget = null;
  let lastRaw = '';
  function restyleFromTarget(target, x, y){
    const tip = $('ceTooltipV190');
    if(!tip || tip.style.display === 'none') return;
    const holder = target?.closest?.('[data-ce-tip],[data-v181-tip],[data-tip],[title]') || lastTarget;
    const raw = getRawTip(holder) || lastRaw || tip.textContent || '';
    if(!raw) return;
    lastTarget = holder || lastTarget;
    lastRaw = raw;
    const html = tipHtml(raw);
    if(tip.dataset.v192Html !== html){
      tip.innerHTML = html;
      tip.dataset.v192Html = html;
    }
    if(holder?.getAttribute?.('data-ce-tip-black') === '1'){
      tip.style.color = '#111827';
      tip.style.borderColor = 'rgba(15,23,42,.18)';
    }
    positionTip(tip, x, y);
  }
  document.addEventListener('mouseover', e => setTimeout(() => restyleFromTarget(e.target, e.clientX, e.clientY), 0), true);
  document.addEventListener('mousemove', e => setTimeout(() => restyleFromTarget(e.target, e.clientX, e.clientY), 0), true);
  document.addEventListener('focusin', e => setTimeout(() => restyleFromTarget(e.target, 24, 24), 0), true);
  document.addEventListener('mouseout', e => {
    const tip = $('ceTooltipV190');
    if(!tip || !tip.matches(':hover')){ lastTarget = null; lastRaw = ''; }
  }, true);

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
  const oldAnchorClick = HTMLAnchorElement.prototype.click;
  if(!HTMLAnchorElement.prototype.click.__v192Wrapped){
    const wrapped = function(){
      try{ if(this.download) this.download = normalizeDownloadName(this.download); }catch(_){ }
      return oldAnchorClick.apply(this, arguments);
    };
    wrapped.__v192Wrapped = true;
    HTMLAnchorElement.prototype.click = wrapped;
  }
  document.addEventListener('DOMContentLoaded', refreshVersion);
  window.addEventListener('load', refreshVersion);
  refreshVersion();
})();
