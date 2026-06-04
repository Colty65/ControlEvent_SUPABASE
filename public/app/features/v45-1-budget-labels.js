/* ControlEvent v8.3.1_prod - Etiquetas definitivas de RESUMEN PRESUPUESTARIO.
   Parche ligero, cargado al final, sin tocar el flujo de cambio de evento v44.7.x/v45.0.
   Objetivo:
   - RESUMEN PRESUPUESTARIO / OPERATIVA: PRESUPUESTO => INGRESO TOTAL.
   - RESUMEN PRESUPUESTARIO / INGRESOS EN DINERO: INGRESOS EN DINERO / INGRESO DINERO => INGRESOS.
*/
(function(){
  'use strict';

  const VERSION = 'ControlEvent v8.3.1_prod';
  const VERSION_FILE = 'ControlEvent_v8_3_1_prod';
  const TARGET_SELECTOR = '#budgetLayout';
  let pending = false;

  function safe(fn, fallback){ try{ return fn(); }catch(_){ return fallback; } }

  function normalizeLabelText(value){
    if(value == null) return value;
    let text = String(value);
    text = text.replace(/INGRESOS\s+EN\s+DINERO/g, 'INGRESOS');
    text = text.replace(/INGRESO\s+DINERO/g, 'INGRESOS');
    text = text.replace(/PRESUPUESTO/g, 'INGRESO TOTAL');
    return text;
  }

  function patchAttributes(el){
    if(!el || !el.attributes) return;
    Array.prototype.slice.call(el.attributes).forEach(attr => {
      const next = normalizeLabelText(attr.value);
      if(next !== attr.value){
        try{ el.setAttribute(attr.name, next); }catch(_){ }
      }
    });
  }

  function patchBudgetLabels(){
    const root = document.querySelector(TARGET_SELECTOR);
    if(!root) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let node;
    while((node = walker.nextNode())){
      const next = normalizeLabelText(node.nodeValue);
      if(next !== node.nodeValue) node.nodeValue = next;
    }

    root.querySelectorAll('*').forEach(patchAttributes);
    patchAttributes(root);

    safe(() => {
      document.body.dataset.ceVersion = VERSION;
      window.__ceVersion = VERSION;
      window.VERSION = VERSION;
      window.VERSION_FILE = VERSION_FILE;
    }, null);
  }

  function schedulePatch(){
    if(pending) return;
    pending = true;
    const run = () => {
      pending = false;
      patchBudgetLabels();
    };
    if(typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else setTimeout(run, 0);
  }

  function wrapRender(name){
    const current = window[name] || safe(() => eval(name), null);
    if(typeof current !== 'function' || current.__ceV451BudgetLabelsWrapped) return;
    const wrapped = function(){
      const result = current.apply(this, arguments);
      schedulePatch();
      setTimeout(schedulePatch, 80);
      return result;
    };
    wrapped.__ceV451BudgetLabelsWrapped = true;
    try{ window[name] = wrapped; }catch(_){ }
    try{ eval(name + ' = wrapped'); }catch(_){ }
  }

  function install(){
    safe(() => {
      window.__ceVersion = VERSION;
      window.VERSION = VERSION;
      window.VERSION_FILE = VERSION_FILE;
    }, null);
    wrapRender('renderBudget');
    wrapRender('renderResumen');
    schedulePatch();

    safe(() => {
      const observer = new MutationObserver(mutations => {
        for(const mutation of mutations){
          const target = mutation.target;
          if(target && (target.id === 'budgetLayout' || target.closest?.(TARGET_SELECTOR))){
            schedulePatch();
            return;
          }
        }
      });
      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true
      });
    }, null);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();

  window.ControlEventV451 = {version:VERSION, versionFile:VERSION_FILE, patchBudgetLabels, install};
})();
