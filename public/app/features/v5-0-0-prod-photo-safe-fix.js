/* ControlEvent v5.0.0_prod - cierre seguro fotos/version INFOEVENTO.
   - No cambia datos.
   - En PC evita restaurar globos ajenos.
   - En móvil refuerza apertura de justificantes en globos de ingresos finalizados.
*/
(function(){
  'use strict';
  const VERSION = 'ControlEvent v5.0.0_prod';
  const VERSION_FILE = 'ControlEvent_v5_0_0_prod';
  const INSTALLED = '__ceV500ProdPhotoSafeFix';
  if(window[INSTALLED]) return; window[INSTALLED] = true;
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const stop = ev => { try{ ev?.preventDefault?.(); ev?.stopPropagation?.(); ev?.stopImmediatePropagation?.(); }catch(_){ } return false; };
  function applyVersion(){
    safe(() => { document.title = VERSION; document.body.dataset.ceVersion = VERSION; window.__ceVersion = VERSION; window.VERSION = VERSION; window.VERSION_FILE = VERSION_FILE; window.ControlEventVersion = {version:VERSION, versionFile:VERSION_FILE}; }, null);
    safe(() => document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => { if(/ControlEvent\s+v[0-9][0-9A-Za-z._\/-]*/i.test(el.textContent || '')) el.textContent = VERSION; }), null);
  }
  function isPcLike(){
    const ua = navigator.userAgent || '';
    if(/Android|iPhone|iPad|iPod/i.test(ua)) return false;
    return safe(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches, false) === true;
  }
  function fallbackReceiptClick(ev){
    if(isPcLike()) return undefined;
    const btn = ev.target?.closest?.('#ceBudgetLiteTooltipV307 .ce-v465-tip-thumb,#ceTooltipV21 .ce-v465-tip-thumb,.ce-v21-tooltip .ce-v465-tip-thumb,.ce-budget-tooltip .ce-v465-tip-thumb,.ce-tooltip .ce-v465-tip-thumb');
    if(!btn) return undefined;
    const id = btn.dataset?.id || btn.getAttribute?.('data-id') || '';
    const api = window.ControlEventV469 || window.ControlEventV468 || window.ControlEventV467 || null;
    if(id && api && typeof api.showReceiptModal === 'function') return api.showReceiptModal(id, ev);
    const img = btn.querySelector?.('img') || btn;
    const src = img?.currentSrc || img?.src || '';
    if(!src) return undefined;
    stop(ev);
    document.querySelectorAll('.ce-v500-mobile-receipt-modal').forEach(x => { try{x.remove();}catch(_){ } });
    const ov = document.createElement('div');
    ov.className = 'ce-v500-mobile-receipt-modal';
    ov.style.cssText = 'position:fixed;inset:0;z-index:10000100;background:rgba(2,6,23,.86);display:flex;align-items:center;justify-content:center;padding:10px;';
    ov.innerHTML = '<div style="max-width:96vw;max-height:94vh;background:#fff;border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:8px;"><button type="button" data-close="1" style="align-self:flex-end;border:1px solid #cbd5e1;background:#fff;color:#111827;border-radius:9px;padding:8px 12px;font-weight:900;">✕ Cerrar</button><img alt="Justificante de ingreso" style="max-width:92vw;max-height:82vh;object-fit:contain;" src="'+String(src).replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'"></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if(e.target === ov || e.target?.closest?.('[data-close]')){ stop(e); ov.remove(); } }, true);
    return false;
  }
  window.addEventListener('touchend', fallbackReceiptClick, {capture:true, passive:false});
  window.addEventListener('click', fallbackReceiptClick, {capture:true, passive:false});
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready','controlevent:module-mounted','controlevent:event-loaded'].forEach(evt => window.addEventListener(evt, () => setTimeout(applyVersion, 30)));
  [0,120,500,1500,3500].forEach(ms => setTimeout(applyVersion, ms));
  setInterval(applyVersion, 900);
  window.ControlEventV500ProdPhotoSafeFix = {version:VERSION, versionFile:VERSION_FILE, applyVersion};
})();
