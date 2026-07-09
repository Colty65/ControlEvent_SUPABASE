// ControlEvent v19_prod · FIX15
// Suaviza INGRESOS, corrige selección visual Vista aérea y ajuste columna SEGMENTO.
(function(){
  'use strict';
  if(window.__CE_V19_FIX15_APPLIED__) return;
  window.__CE_V19_FIX15_APPLIED__ = true;
  function $(id){return document.getElementById(id);}
  function injectCss(){
    if($('ce-v19-fix15-style')) return;
    var css=`
      .ce-fix15-recent-collab{background:#fff7ed!important;border-color:#fb923c!important;box-shadow:0 0 0 3px rgba(249,115,22,.28)!important;transition:background .25s ease,box-shadow .25s ease!important;}
      #ceMapaGlobalOverlay .ce-v19-products-head.compact>*:nth-child(2),
      #ceMapaGlobalOverlay .ce-v19-product-line.compact>*:nth-child(2){transform:translateX(6ch)!important;width:calc(100% - 6ch)!important;}
      #ceMapaGlobalOverlay .ce-v19-products-head.compact{font-size:13.4px!important;background:#cfd8e3!important;color:#0f172a!important;}
      #ceMapaGlobalOverlay .ce-v19-product-line.compact{font-size:11.8px!important;line-height:1.18!important;}
      #ceMapaGlobalOverlay .ce-v19-income-head{background:#cfd8e3!important;font-size:13.4px!important;}
      #ceMapaGlobalOverlay .ce-v19-income-row.compact{font-size:12.3px!important;}
      #ceMapaGlobalOverlay .ce-v19-income-all:not(.ce-fix15-active),
      #ceMapaGlobalOverlay .ce-v19-clear-filter:not(.ce-fix15-active){box-shadow:none!important;background:#fff!important;border-color:#d7e0ea!important;color:#0f172a!important;}
      #ceMapaGlobalOverlay .ce-v19-income-all.ce-fix15-active,
      #ceMapaGlobalOverlay .ce-v19-clear-filter.ce-fix15-active{border-color:#2563eb!important;box-shadow:0 0 0 3px rgba(37,99,235,.24)!important;background:#eff6ff!important;color:#1d4ed8!important;}
      #ceMapaGlobalOverlay .ce-v19-resource-bar.ce-fix15-active{background:#dbeafe!important;border-color:#2563eb!important;box-shadow:0 0 0 3px rgba(37,99,235,.22)!important;}
    `;
    var st=document.createElement('style'); st.id='ce-v19-fix15-style'; st.textContent=css; document.head.appendChild(st);
  }
  function clearVistaActive(root){
    root.querySelectorAll('.ce-v19-income-all,.ce-v19-clear-filter,.ce-v19-resource-bar').forEach(function(el){ el.classList.remove('ce-fix15-active','ce-fix13-active','is-active','is-selected'); });
  }
  function setVistaActive(kind, el){
    var root=$('ceMapaGlobalOverlay'); if(!root) return;
    clearVistaActive(root);
    if(kind==='income') root.querySelector('.ce-v19-income-all')?.classList.add('ce-fix15-active');
    else if(kind==='products') root.querySelector('.ce-v19-clear-filter')?.classList.add('ce-fix15-active');
    else if(kind==='bar' && el) el.classList.add('ce-fix15-active');
  }
  document.addEventListener('click', function(ev){
    var income=ev.target?.closest?.('#ceMapaGlobalOverlay [data-v19-income-all],#ceMapaGlobalOverlay .ce-v19-income-all');
    if(income){ setTimeout(function(){setVistaActive('income');}, 50); return; }
    var products=ev.target?.closest?.('#ceMapaGlobalOverlay [data-v19-clear-filter],#ceMapaGlobalOverlay .ce-v19-clear-filter');
    if(products){ setTimeout(function(){setVistaActive('products');}, 50); return; }
    var bar=ev.target?.closest?.('#ceMapaGlobalOverlay .ce-v19-resource-bar[data-v19-filter-kind]');
    if(bar){ setTimeout(function(){setVistaActive('bar', bar);}, 50); return; }
  }, true);
  var pending=false;
  function inferActive(){
    if(pending) return; pending=true;
    setTimeout(function(){
      pending=false;
      var root=$('ceMapaGlobalOverlay'); if(!root) return;
      var h=(root.querySelector('.ce-v19-detail-head h3')?.textContent||'').toLowerCase();
      if(h.includes('todos los productos')) setVistaActive('products');
      else if(h.includes('ingresos')) setVistaActive('income');
      else if(!root.querySelector('.ce-fix15-active')) clearVistaActive(root);
    },80);
  }
  try{ new MutationObserver(inferActive).observe(document.body,{childList:true,subtree:true,characterData:true}); }catch(_){ }
  injectCss();
})();
