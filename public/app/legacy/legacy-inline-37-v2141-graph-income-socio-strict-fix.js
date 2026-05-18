/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #37. */
/* ==== V21.4.1: corrección estricta Socios Banco/Bizum/Efectivo = Número x Precio evento ==== */
(function(){
  const VERSION='ControlEvent v26.6';
  function refreshVersion(){
    try{document.title=VERSION;}catch(_){}
    try{document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||'')) el.textContent=VERSION;});}catch(_){}
  }
  function run(){
    refreshVersion();
    try{ if(typeof renderGraficas === 'function') renderGraficas(); }catch(e){ console.warn('No se pudo refrescar Gráficas tras fix v21.5', e); }
  }
  window.addEventListener('DOMContentLoaded',()=>setTimeout(run,350));
  window.addEventListener('load',()=>setTimeout(run,900));
  setTimeout(run,500);
  setTimeout(run,1600);
})();
