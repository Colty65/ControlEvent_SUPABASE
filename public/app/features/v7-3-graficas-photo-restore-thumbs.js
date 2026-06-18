/* ControlEvent v10.1_prod - GRAFICAS: miniaturas y retorno al globo sin bucles.
   Alcance: Android restaura el globo al cerrar foto; todos los dispositivos hidratan miniaturas del globo activo bajo demanda. */
(function(){
  'use strict';
  const INSTALLED = '__ceV73GraficasPhotoRestoreThumbs';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const VERSION = 'ControlEvent v10.1_prod';
  const VERSION_FILE = 'ControlEvent_v10_1_prod';
  let lastGraphTipSnapshot = null;
  let hydrateTimer = 0;
  const observed = new WeakSet();

  const $ = id => document.getElementById(id);
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const norm = v => String(v ?? '').trim();
  function isAndroid(){ return /Android/i.test(navigator.userAgent || ''); }
  function st(){ return safe(() => (typeof state !== 'undefined' && state) ? state : null, null) || window.state || window.ControlEventApp?.state || {}; }
  function currentEventId(){ return norm(st().selectedEventId || $('selectedEvent')?.value || ''); }
  function jsonGet(key){ try{ return JSON.parse(localStorage.getItem(key) || '{}') || {}; }catch(_){ return {}; } }
  function valueToSrc(value){
    if(!value) return '';
    if(typeof value === 'string') return value.trim();
    if(typeof value === 'object') return norm(value.url || value.public_url || value.publicUrl || value.pathname || value.path || value.storage_path || value.dataUrl || value.dataURL || value.base64 || '');
    return '';
  }
  function receiptKeys(id){
    const ev = currentEventId();
    const sid = norm(id);
    return [`${ev}|INGRESO:${sid}`,`${ev}|INGRESO|${sid}`,`INGRESO:${ev}|${sid}`,`INGRESO:${sid}`,`INGRESO|${sid}`,sid];
  }
  function receiptSrc(id){
    const s = st();
    const bags = [s.ticketImages || {}, s.ticketImageRefs || {}, jsonGet('ControlEvent_ingreso_receipts_v502'), jsonGet('ControlEvent_ingreso_receipts_v468')];
    const keys = receiptKeys(id);
    for(const bag of bags){ for(const key of keys){ const src = valueToSrc(bag && bag[key]); if(src) return src; } }
    return '';
  }
  function visible(el){
    if(!el) return false;
    const cs = safe(() => getComputedStyle(el), null);
    if(!cs || cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = safe(() => el.getBoundingClientRect(), null);
    return !!r && r.width > 0 && r.height > 0;
  }
  function graphTipFrom(target){
    const tip = target?.closest?.('#ceTooltipV21');
    if(tip && visible(tip)) return tip;
    const globalTip = $('ceTooltipV21');
    return visible(globalTip) ? globalTip : null;
  }
  function captureGraphTip(target){
    const tip = graphTipFrom(target);
    if(!tip) return null;
    const rect = safe(() => tip.getBoundingClientRect(), null);
    lastGraphTipSnapshot = {
      id: tip.id || 'ceTooltipV21',
      html: tip.outerHTML || '',
      scrollTop: tip.scrollTop || 0,
      scrollLeft: tip.scrollLeft || 0,
      left: tip.style.left || '', top: tip.style.top || '', right: tip.style.right || '', bottom: tip.style.bottom || '',
      display: tip.style.display || '', visibility: tip.style.visibility || '', pointerEvents: tip.style.pointerEvents || '',
      className: tip.className || '',
      rectLeft: rect ? rect.left : null,
      rectTop: rect ? rect.top : null
    };
    return lastGraphTipSnapshot;
  }
  function restoreGraphTip(){
    const s = lastGraphTipSnapshot;
    if(!s || !s.html) return;
    let el = $(s.id);
    if(visible(el)){ hydrateTooltipThumbs(el); return; }
    try{ if(el) el.remove(); }catch(_){ }
    const holder = document.createElement('div');
    holder.innerHTML = s.html;
    el = holder.firstElementChild;
    if(!el) return;
    el.id = s.id || 'ceTooltipV21';
    el.className = s.className || el.className || '';
    el.classList.add('open','ce-v462-tip-open');
    el.setAttribute('data-ce-v73-restored-graph-tip','1');
    el.removeAttribute('aria-hidden');
    el.style.removeProperty('display');
    el.style.removeProperty('visibility');
    el.style.removeProperty('pointer-events');
    el.style.display = (s.display && s.display !== 'none') ? s.display : 'block';
    el.style.visibility = (s.visibility && s.visibility !== 'hidden') ? s.visibility : 'visible';
    el.style.pointerEvents = s.pointerEvents || 'auto';
    if(s.left) el.style.left = s.left;
    if(s.top) el.style.top = s.top;
    if(s.right) el.style.right = s.right;
    if(s.bottom) el.style.bottom = s.bottom;
    el.style.setProperty('z-index','600000','important');
    document.body.appendChild(el);
    try{ el.scrollTop = s.scrollTop || 0; el.scrollLeft = s.scrollLeft || 0; }catch(_){ }
    hydrateTooltipThumbs(el);
  }
  function scheduleRestore(){ [30,110,260].forEach(ms => setTimeout(restoreGraphTip, ms)); }

  function hydrateTooltipThumbs(root){
    const roots = root ? [root] : ['ceTooltipV21','ceBudgetLiteTooltipV307'].map($).filter(visible);
    roots.forEach(tip => {
      tip.querySelectorAll?.('.ce-v465-tip-thumb,[data-action="ingreso-receipt-view-v465"],[data-ce-v512-budget-photo]').forEach(btn => {
        const id = norm(btn.dataset?.id || btn.getAttribute?.('data-id') || btn.closest?.('[data-id]')?.dataset?.id || '');
        let img = btn.matches?.('img') ? btn : btn.querySelector?.('img');
        let src = norm(img?.currentSrc || img?.src || '');
        if(!src && id) src = receiptSrc(id);
        if(!src) return;
        if(!img){
          img = document.createElement('img');
          img.alt = 'Justificante';
          btn.textContent = '';
          btn.appendChild(img);
        }
        if(img.src !== src) img.src = src;
        try{ img.loading = 'eager'; img.decoding = 'async'; img.removeAttribute('fetchpriority'); }catch(_){ }
        try{
          btn.style.setProperty('visibility','visible','important');
          btn.style.setProperty('opacity','1','important');
          btn.style.setProperty('pointer-events','auto','important');
          img.style.setProperty('display','block','important');
          img.style.setProperty('visibility','visible','important');
          img.style.setProperty('opacity','1','important');
        }catch(_){ }
      });
    });
  }
  function requestHydrate(reason){
    if(hydrateTimer) clearTimeout(hydrateTimer);
    hydrateTimer = setTimeout(() => {
      hydrateTimer = 0;
      safe(() => window.ControlEventV469?.enrichOpenTooltips?.(), null);
      safe(() => window.ControlEventV467?.enrichOpenTooltips?.(), null);
      safe(() => window.ControlEventBudgetLiteTips?.sanitize?.(), null);
      hydrateTooltipThumbs();
    }, 55);
  }
  function installTipObservers(){
    ['ceTooltipV21','ceBudgetLiteTooltipV307'].map($).filter(Boolean).forEach(tip => {
      if(observed.has(tip)) return;
      observed.add(tip);
      try{
        const mo = new MutationObserver(() => requestHydrate('tip-mutation'));
        mo.observe(tip, {childList:true, subtree:true});
      }catch(_){ }
    });
  }

  function shouldCaptureOpen(ev){
    if(!isAndroid()) return false;
    const t = ev.target;
    return !!t?.closest?.('#ceTooltipV21 .ce-v465-tip-thumb,#ceTooltipV21 [data-action="ingreso-receipt-view-v465"],#ceTooltipV21 [data-ce-v512-budget-photo]');
  }
  function isPhotoClose(ev){
    const t = ev.target;
    if(!t) return false;
    return !!(
      t.closest?.('#ceV310PhotoViewer .ce-v310-photo-close,#ceV310PhotoViewer [data-close],.ce-v468-modal [data-close],.ce-v465-modal [data-close],#ceV401PcPhotoModal [data-close]') ||
      t === $('ceV310PhotoViewer') || t.closest?.('.ce-v468-modal') === t || t.closest?.('.ce-v465-modal') === t
    );
  }
  function pointerHandler(ev){
    if(shouldCaptureOpen(ev)) captureGraphTip(ev.target);
    requestHydrate('pointer');
    if(isAndroid() && isPhotoClose(ev)) scheduleRestore();
  }
  ['pointerdown','touchstart','click','pointerup','touchend'].forEach(type => window.addEventListener(type, pointerHandler, {capture:true, passive:true}));
  ['pointerover','mouseover','touchstart','click'].forEach(type => document.addEventListener(type, ev => {
    if(ev.target?.closest?.('#tabGraficas,#eventChartWrap,#ceTooltipV21,#ceBudgetLiteTooltipV307')) requestHydrate(type);
  }, {capture:true, passive:true}));
  document.addEventListener('keydown', ev => { if(isAndroid() && ev.key === 'Escape') scheduleRestore(); }, true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready','controlevent:module-mounted','controlevent:event-loaded'].forEach(evt => window.addEventListener(evt, () => setTimeout(() => { requestHydrate(evt) }, 80)));
  document.addEventListener('change', ev => { if(ev.target?.id === 'selectedEvent') setTimeout(() => { lastGraphTipSnapshot = null; requestHydrate('event-change'); }, 120); }, true);
  [160,900].forEach(ms => setTimeout(() => { requestHydrate('boot') }, ms));

  window.ControlEventV73GraficasPhotoRestoreThumbs = {version:VERSION, versionFile:VERSION_FILE, hydrate:hydrateTooltipThumbs, restore:restoreGraphTip};
})();
