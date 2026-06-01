/* ControlEvent v6.0_prod - guarda quirúrgica de visores de foto.
   Alcance: evita pulsaciones fantasma sobre Salir y restaura el globo de GRAFICAS al cerrar una foto.
   Sin bucles periódicos, sin tocar datos/Supabase/render. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v6.0_prod';
  const INSTALLED = '__ceV60PhotoGuard';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const TOOLTIP_SELECTOR = '#ceTooltipV21,#ceV462Tooltip,.ce-v21-tooltip,.ce-tooltip';
  const PHOTO_TRIGGER_SELECTOR = [
    '[data-ce-v401-pc-receipt]', '[data-ce-v401-pc-ticket]', '[data-ce-v509-receipt="view"]',
    '.ce-v401-pc-thumb', '.ce-v401-pc-ticket-thumb', '.ce-v509-receipt-thumb', '.ce-v504-receipt-thumb',
    '.ce-v502-receipt-thumb', '.ce-v465-receipt-thumb', '.ce-v465-tip-thumb', '.ce-v5017-budget-thumb',
    'img.ticket-thumb', 'button', '[role=button]', 'img[src]'
  ].join(',');
  const MODAL_SELECTOR = [
    '#ceV401PcPhotoModal','#ceV40TicketPhotoModal','#ceV310PhotoViewer','#ceV509ReceiptModal',
    '#ceV504ReceiptModal','#ceV502ReceiptModal','#ceV468ReceiptModal','#ceV465ReceiptModal',
    '#ceTicketModalV234','#ceTicketImageModalV225','#ceV512BudgetPhotoModal',
    '.ce-v5017-budget-modal','.ce-v512-budget-photo-modal','.ce-v504-modal','.ce-v505-photo-modal',
    '.ce-v506-photo-modal','.ce-v508-photo-modal','.ce-v465-modal','.ce-v468-modal','.ce-receipt-modal-v463',
    '[role="dialog"][aria-modal="true"]'
  ].join(',');
  const CLOSE_SELECTOR = [
    '[data-close]','[data-ce-v512-budget-photo-close]','.ce-v401-pc-modal-close','.ce-v40-modal-close',
    '.ce-v310-photo-close','.ce-v506-photo-close','.ce-v505-photo-close','.ce-v504-photo-close',
    '.ce-v468-modal-head button','.ce-v465-modal-head button'
  ].join(',');

  let saved = null;
  let lastRememberAt = 0;

  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const stop = ev => { try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ } return false; };
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function isVisible(el){
    if(!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 2 && r.height > 2 && cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity || 1) !== 0;
  }
  function isGraphTooltip(tip){
    if(!tip || tip.id === 'ceBudgetLiteTooltipV307') return false;
    // Los globos de Resumen Presupuestario tienen su propio flujo estable; aquí sólo protegemos GRAFICAS.
    if(tip.closest?.('#tabResumen,#budgetLayout')) return false;
    return true;
  }
  function rememberTooltipFrom(target){
    const trigger = target?.closest?.(PHOTO_TRIGGER_SELECTOR);
    if(!trigger) return;
    const tip = trigger.closest?.(TOOLTIP_SELECTOR);
    if(!isGraphTooltip(tip) || !isVisible(tip)) return;
    const now = Date.now();
    if(saved?.element === tip && now - lastRememberAt < 300) return;
    lastRememberAt = now;
    const rect = tip.getBoundingClientRect();
    saved = {
      element: tip,
      parent: tip.parentNode,
      next: tip.nextSibling,
      clone: safe(() => tip.cloneNode(true), null),
      id: tip.id || '',
      className: tip.className || '',
      cssText: tip.style.cssText || '',
      scrollTop: tip.scrollTop || 0,
      scrollLeft: tip.scrollLeft || 0,
      rect: {left:rect.left, top:rect.top, width:rect.width, height:rect.height}
    };
    safe(() => {
      tip.setAttribute('data-ce-preserve-tooltip','1');
      tip.setAttribute('data-ce-v60-graph-tooltip','1');
    }, null);
  }
  function restoreTooltip(){
    if(!saved) return;
    let tip = (saved.element && saved.element.isConnected) ? saved.element : null;
    if(!tip && saved.id) tip = document.getElementById(saved.id);
    if(!tip && saved.clone){
      tip = saved.clone;
      const parent = saved.parent && saved.parent.isConnected ? saved.parent : document.body;
      try{ parent.insertBefore(tip, saved.next && saved.next.parentNode === parent ? saved.next : null); }
      catch(_){ document.body.appendChild(tip); }
      saved.element = tip;
    }
    if(!tip) return;
    const maxW = Math.max(280, window.innerWidth - 16);
    const maxH = Math.max(180, window.innerHeight - 16);
    const w = Math.min(Math.max(saved.rect.width || 360, 260), maxW);
    const h = Math.min(Math.max(saved.rect.height || 180, 120), maxH);
    const left = clamp(saved.rect.left || 8, 8, Math.max(8, window.innerWidth - w - 8));
    const top = clamp(saved.rect.top || 8, 8, Math.max(8, window.innerHeight - h - 8));
    safe(() => {
      tip.className = saved.className || tip.className;
      tip.classList.add('open','show','visible','ce-v60-restored-tooltip');
      tip.setAttribute('aria-hidden','false');
      tip.setAttribute('data-ce-preserve-tooltip','1');
      tip.setAttribute('data-ce-v60-graph-tooltip','1');
      tip.style.cssText = saved.cssText || tip.style.cssText || '';
      tip.style.setProperty('display','block','important');
      tip.style.setProperty('visibility','visible','important');
      tip.style.setProperty('opacity','1','important');
      tip.style.setProperty('pointer-events','auto','important');
      tip.style.setProperty('z-index','4100','important');
      tip.style.setProperty('position','fixed','important');
      tip.style.setProperty('left', left + 'px', 'important');
      tip.style.setProperty('top', top + 'px', 'important');
      tip.style.setProperty('max-width', 'calc(100vw - 16px)', 'important');
      tip.style.setProperty('max-height', 'calc(100vh - 16px)', 'important');
      tip.style.setProperty('overflow','auto','important');
      tip.scrollTop = saved.scrollTop || 0;
      tip.scrollLeft = saved.scrollLeft || 0;
    }, null);
  }
  function shieldHeaderGhostClick(){
    let shield = document.getElementById('ceV60CloseShield');
    if(shield) shield.remove();
    shield = document.createElement('div');
    shield.id = 'ceV60CloseShield';
    shield.setAttribute('aria-hidden','true');
    shield.style.cssText = 'position:fixed;inset:0;z-index:10000120;background:transparent;pointer-events:auto;touch-action:none;';
    document.body.appendChild(shield);
    setTimeout(() => { try{ shield.remove(); }catch(_){ } }, 420);
  }
  function closeModal(modal){
    if(!modal) return;
    safe(() => modal.remove(), null);
    restoreTooltip();
    shieldHeaderGhostClick();
  }
  function modalCloseButton(target, modal){
    if(!target || !modal) return null;
    const close = target.closest?.(CLOSE_SELECTOR);
    if(close && modal.contains(close)) return close;
    const btn = target.closest?.('button');
    if(btn && modal.contains(btn) && /^(×|✕|x|cerrar|✕\s*cerrar)$/i.test(String(btn.textContent || '').trim())) return btn;
    return null;
  }
  function handlePointer(ev){
    const target = ev.target;
    if(!target) return;
    rememberTooltipFrom(target);
    const modal = target.closest?.(MODAL_SELECTOR);
    if(!modal) return;
    const close = modalCloseButton(target, modal);
    if(close || target === modal){
      closeModal(modal);
      return stop(ev);
    }
  }
  function handleKey(ev){
    if(ev.key !== 'Escape') return;
    const modal = document.querySelector(MODAL_SELECTOR);
    if(!modal) return;
    closeModal(modal);
    return stop(ev);
  }
  function injectStyle(){
    if(document.getElementById('ceV60PhotoGuardStyle')) return;
    const style = document.createElement('style');
    style.id = 'ceV60PhotoGuardStyle';
    style.textContent = `
      .ce-v60-restored-tooltip{box-shadow:0 18px 70px rgba(15,23,42,.28)!important;}
      [data-ce-v60-graph-tooltip="1"]{overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important;}
    `;
    document.head.appendChild(style);
  }

  ['pointerdown','touchstart','mousedown','click'].forEach(type => window.addEventListener(type, handlePointer, {capture:true, passive:false}));
  window.addEventListener('keydown', handleKey, {capture:true, passive:false});
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectStyle, {once:true}); else injectStyle();

  window.ControlEventV60PhotoGuard = {version:VERSION, remember:rememberTooltipFrom, restore:restoreTooltip};
})();
