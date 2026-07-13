/* ControlEvent v19_prod FIX41
   - Traduce en pantalla P-id... y T-id... a nombres humanos en Compras/Donaciones.
   - Solo visual: no toca datos ni BD. */
(function(){
  'use strict';
  if(window.__ceFix41HumanLabels) return;
  window.__ceFix41HumanLabels = true;
  function app(){ return window.ControlEventApp || window.ControlEventRuntime?.app || null; }
  function st(){ return app()?.state || window.state || {}; }
  function arr(name){ const v = st()[name]; return Array.isArray(v) ? v : []; }
  function byId(list, id){ const sid = String(id || ''); return arr(list).find(x => String(x?.id || '') === sid) || null; }
  function nameFor(prefix, id){
    if(!id) return '';
    const clean = String(id).replace(/^[:\-]+/, '');
    if(prefix === 'P') return byId('personas', clean)?.nombre || '';
    if(prefix === 'T') return byId('tiendas', clean)?.nombre || '';
    return '';
  }
  function humanizeText(txt){
    return String(txt || '').replace(/\b([PT])\s*[-:]\s*(id[-A-Za-z0-9_]+)\b/g, function(full, prefix, id){
      const label = nameFor(prefix, id);
      return label || full;
    }).replace(/\b([PT]):(id[-A-Za-z0-9_]+)\b/g, function(full, prefix, id){
      const label = nameFor(prefix, id);
      return label || full;
    });
  }
  function walk(root){
    if(!root || root.__ceFix41Walking) return;
    root.__ceFix41Walking = true;
    try{
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node){
          const v = node.nodeValue || '';
          return /\b[PT]\s*[-:]\s*id[-A-Za-z0-9_]+\b/.test(v) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      });
      const nodes=[]; let n;
      while((n = walker.nextNode())) nodes.push(n);
      nodes.forEach(node => {
        const next = humanizeText(node.nodeValue || '');
        if(next !== node.nodeValue) node.nodeValue = next;
      });
    }catch(_){ }
    finally{ root.__ceFix41Walking = false; }
  }
  function run(){
    ['tabDonaciones','tabCompras','tabPlanificacionInicial','planificacionResultado'].forEach(id => {
      const el = document.getElementById(id);
      if(el) walk(el);
    });
  }
  let timer = null;
  function schedule(){ clearTimeout(timer); timer = setTimeout(run, 80); }
  try{
    new MutationObserver(schedule).observe(document.body, {childList:true, subtree:true, characterData:true});
  }catch(_){ }
  document.addEventListener('click', schedule, true);
  document.addEventListener('change', schedule, true);
  setInterval(run, 1500);
  schedule();
})();
