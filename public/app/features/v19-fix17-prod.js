// ControlEvent v22_prod · FIX17 mínimo
// Solo Vista aérea: activo único, ancho de tabla, sin Limpiar; Zuzu: sin badge flotante y texto normal.
(function(){
  'use strict';
  if(window.__CE_V19_FIX17_APPLIED__) return;
  window.__CE_V19_FIX17_APPLIED__ = true;
  const $ = id => document.getElementById(id);
  const trim = v => String(v == null ? '' : v).trim();

  function injectCss(){
    if($('ce-v19-fix17-style')) return;
    const css = `
      /* FIX17: la Vista aérea no debe mostrar el botón Limpiar del panel de registros. */
      #ceMapaGlobalOverlay .ce-v19-detail-clear{display:none!important;}

      /* FIX17: Producto Disponible debe caber dentro de la ficha sin barra horizontal. */
      #ceMapaGlobalOverlay .ce-v19-products-table.compact{overflow-x:hidden!important;width:100%!important;}
      #ceMapaGlobalOverlay .ce-v19-products-head.compact,
      #ceMapaGlobalOverlay .ce-v19-product-line.compact{
        width:100%!important;
        min-width:0!important;
        grid-template-columns:minmax(160px,1.30fr) minmax(82px,.58fr) minmax(76px,.54fr) minmax(90px,.64fr) minmax(92px,.62fr) minmax(86px,.58fr) minmax(96px,.64fr) minmax(64px,.44fr) minmax(82px,.54fr) minmax(54px,.36fr)!important;
        gap:4px!important;
      }
      #ceMapaGlobalOverlay .ce-v19-products-head.compact>*:nth-child(2),
      #ceMapaGlobalOverlay .ce-v19-product-line.compact>*:nth-child(2){padding-left:0!important;transform:none!important;}
      #ceMapaGlobalOverlay .ce-v19-products-head.compact>* ,
      #ceMapaGlobalOverlay .ce-v19-product-line.compact>*{min-width:0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;}

      /* FIX17: estado activo único. Solo se ilumina Ver todo INGRESOS, Ver todo PRODUCTO o la ficha SEG/DEST pulsada. */
      #ceMapaGlobalOverlay .ce-v19-income-all:not(.ce-fix17-active),
      #ceMapaGlobalOverlay .ce-v19-clear-filter:not(.ce-fix17-active){
        background:#fff!important;border-color:#d7e0ea!important;color:#0f172a!important;box-shadow:none!important;outline:0!important;
      }
      #ceMapaGlobalOverlay .ce-v19-income-all.ce-fix17-active,
      #ceMapaGlobalOverlay .ce-v19-clear-filter.ce-fix17-active{
        border-color:#2563eb!important;box-shadow:0 0 0 3px rgba(37,99,235,.26)!important;background:#eff6ff!important;color:#1d4ed8!important;
      }
      #ceMapaGlobalOverlay .ce-v19-resource-bar.ce-fix17-active{
        background:#dbeafe!important;border-color:#2563eb!important;box-shadow:0 0 0 3px rgba(37,99,235,.24),0 10px 22px rgba(37,99,235,.14)!important;
      }
      #ceMapaGlobalOverlay .ce-v19-resource-bar.ce-fix17-active .ce-v19-bar-top strong{color:#1d4ed8!important;}

      /* FIX17: quitar versión flotante dentro de la ventana de Zuzu. */
      #ceGeminiLibreOverlay .ce-ai-version-badge{display:none!important;}

      /* FIX17: texto de respuesta Zuzu normal, no en negrilla. */
      #ceGeminiLibreOverlay .ce-ai-answer{font-weight:400!important;}
      #ceGeminiLibreOverlay .ce-ai-card{font-weight:400!important;}
    `;
    const style=document.createElement('style');
    style.id='ce-v19-fix17-style';
    style.textContent=css;
    document.head.appendChild(style);
  }

  function root(){ return $('ceMapaGlobalOverlay'); }
  function clearActive(r){
    if(!r) return;
    r.querySelectorAll('.ce-v19-income-all,.ce-v19-clear-filter,.ce-v19-resource-bar').forEach(el=>{
      el.classList.remove('is-active','is-selected','ce-fix13-active','ce-fix15-active','ce-fix16-active','ce-fix17-active');
    });
  }
  function setActive(kind, el){
    const r=root(); if(!r) return;
    clearActive(r);
    const active={kind,t:Date.now()};
    if(kind==='income'){
      r.querySelector('.ce-v19-income-all')?.classList.add('ce-fix17-active');
    }else if(kind==='products'){
      r.querySelector('.ce-v19-clear-filter')?.classList.add('ce-fix17-active');
    }else if(kind==='bar' && el){
      active.filterKind=trim(el.getAttribute('data-v19-filter-kind'));
      active.filterKey=trim(el.getAttribute('data-v19-filter-key'));
      el.classList.add('ce-fix17-active','is-selected');
    }
    window.__ceV19Fix17VistaActive=active;
    // Alinea el recordatorio del FIX16 para que no reencienda botones antiguos.
    if(kind==='income') window.__ceV19Fix16VistaActive={kind:'income',t:Date.now(),key:''};
    else if(kind==='products') window.__ceV19Fix16VistaActive={kind:'products',t:Date.now(),key:''};
    else if(kind==='bar' && el) window.__ceV19Fix16VistaActive={kind:'bar',t:Date.now(),key:trim(el.textContent||'')};
  }
  function reapplyActive(){
    const r=root(); if(!r) return;
    const a=window.__ceV19Fix17VistaActive;
    if(!a || Date.now()-Number(a.t||0)>30000) return;
    if(a.kind==='income') return setActive('income');
    if(a.kind==='products') return setActive('products');
    if(a.kind==='bar'){
      const bars=Array.from(r.querySelectorAll('.ce-v19-resource-bar[data-v19-filter-kind]'));
      const found=bars.find(b=>trim(b.getAttribute('data-v19-filter-kind'))===trim(a.filterKind) && trim(b.getAttribute('data-v19-filter-key'))===trim(a.filterKey));
      if(found) setActive('bar', found);
      else clearActive(r);
    }
  }
  function installActiveHandlers(){
    document.addEventListener('click', ev=>{
      const income=ev.target?.closest?.('#ceMapaGlobalOverlay [data-v19-income-all],#ceMapaGlobalOverlay .ce-v19-income-all');
      if(income){ [0,80,220,420].forEach(ms=>setTimeout(()=>setActive('income'),ms)); return; }
      const products=ev.target?.closest?.('#ceMapaGlobalOverlay [data-v19-clear-filter],#ceMapaGlobalOverlay .ce-v19-clear-filter');
      if(products){ [0,80,220,420].forEach(ms=>setTimeout(()=>setActive('products'),ms)); return; }
      const bar=ev.target?.closest?.('#ceMapaGlobalOverlay .ce-v19-resource-bar[data-v19-filter-kind]');
      if(bar){ [0,80,220,420,700].forEach(ms=>setTimeout(()=>setActive('bar',bar),ms)); return; }
    }, true);
    try{ new MutationObserver(()=>setTimeout(reapplyActive,60)).observe(document.body,{childList:true,subtree:true}); }catch(_){ }
  }

  function install(){ injectCss(); installActiveHandlers(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
  window.ControlEventV19Fix17={version:'v22_prod_FIX17'};
})();
