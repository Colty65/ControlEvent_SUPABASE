/* ControlEvent v11_3_prod - Rescate Documentos/Ingresos/Mapa móvil
   - No hace render() ni recargas automáticas.
   - Restituye miniaturas y una única flecha de descarga en Documentos e Ingresos.
   - Reduce el filtro de responsables del Mapa en iPad/móvil.
*/
(function(){
  'use strict';
  if(window.__ceV1045RescueFixes) return;
  window.__ceV1045RescueFixes = true;
  var VERSION='v11_3_prod';
  function $(id){ return document.getElementById(id); }
  function trim(v){ return v == null ? '' : String(v).trim(); }
  function stop(ev){ if(ev){ ev.preventDefault&&ev.preventDefault(); ev.stopPropagation&&ev.stopPropagation(); ev.stopImmediatePropagation&&ev.stopImmediatePropagation(); } return false; }
  function safeName(base){ return trim(base||'foto').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,'_').slice(0,90) || 'foto'; }
  function isImageSource(src){ src=trim(src); return !!(src && (/^data:image\//i.test(src) || /^blob:/i.test(src) || /ticket-images|ingresos|justificante|document|receipt|storage|supabase/i.test(src))); }
  function imgSrc(img){ return trim(img && (img.currentSrc || img.src || img.getAttribute('src'))); }
  function downloadSrc(src,name){
    src=trim(src); if(!src) return false;
    var fname=safeName(name)+'.jpg';
    function fire(url){ var a=document.createElement('a'); a.href=url; a.download=fname; a.rel='noopener'; a.style.display='none'; document.body.appendChild(a); a.click(); setTimeout(function(){ try{a.remove();}catch(_){ } }, 600); }
    if(/^data:|^blob:/i.test(src)){ fire(src); return false; }
    fetch(src,{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.blob(); }).then(function(b){ var u=URL.createObjectURL(b); fire(u); setTimeout(function(){ URL.revokeObjectURL(u); }, 3000); }).catch(function(){ fire(src); });
    return false;
  }
  function injectStyle(){
    if($('ceV1045RescueStyle')) return;
    var st=document.createElement('style'); st.id='ceV1045RescueStyle';
    st.textContent = '\n'+
      '.ce-v1045-brand-mini{display:inline-flex!important;align-items:center!important;gap:6px!important;font-weight:950!important}.ce-v1045-brand-mini img{width:28px!important;height:28px!important;object-fit:contain!important}\n'+
      '#tabDocumentos .ce-v1045-download,#tabIngresos .ce-v1045-download,#collabList .ce-v1045-download{width:32px!important;height:30px!important;min-width:32px!important;min-height:30px!important;padding:1px!important;border-radius:8px!important;font-size:16px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;margin-left:5px!important;vertical-align:middle!important}\n'+
      '#tabDocumentos .ce-v1045-doc-download,#tabIngresos .ce-v1045-ingreso-download,#collabList .ce-v1045-ingreso-download{visibility:visible!important;opacity:1!important;pointer-events:auto!important}\n'+
      '#tabDocumentos .ce-doc-thumb,#tabDocumentos img.ce-doc-thumb,#tabDocumentos .ce-doc-thumb-link-v85 img,#tabDocumentos .ce-doc-media img{display:inline-block!important;visibility:visible!important;opacity:1!important;width:58px!important;height:42px!important;max-width:58px!important;max-height:42px!important;object-fit:cover!important;border-radius:8px!important}\n'+
      '#tabDocumentos .ce-doc-thumb-link-v85,#tabDocumentos .ce-doc-thumb-btn{display:inline-flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}\n'+
      '.ce-doc-target-modal-v85:target,.ce-doc-modal-v85.visible{display:flex!important;align-items:center!important;justify-content:center!important}\n'+
      '.ce-doc-target-box-v85,.ce-doc-modal-box-v85{width:min(1180px,96vw)!important;max-height:94vh!important;overflow:auto!important}\n'+
      '.ce-doc-target-imgwrap-v85 img,.ce-doc-modal-imgwrap-v85 img{max-width:100%!important;height:auto!important;min-width:min(520px,80vw)!important}\n'+
      '@media(max-width:900px){#mapaResponsablesFilter summary{font-size:12px!important;padding:6px 8px!important;min-height:0!important}#mapaResponsablesFilter summary strong,#mapaResponsablesFilter summary span,#mapaResponsablesFilter summary em{font-size:12px!important;line-height:1.1!important}#mapaResponsablesFilter .mapa-filter-body{gap:4px!important;padding:5px!important}#mapaResponsablesFilter .mapa-filter-option{font-size:11px!important;line-height:1.1!important;padding:4px 5px!important;min-height:0!important;border-radius:8px!important}#mapaResponsablesFilter .mapa-filter-option input[type="checkbox"]{width:14px!important;height:14px!important;min-width:14px!important;min-height:14px!important;margin:0 4px 0 0!important;transform:none!important}#mapaResponsablesFilter .mapa-filter-help{font-size:10px!important;margin-top:3px!important}.mapa-filter-option input[type="checkbox"]{width:14px!important;height:14px!important;min-width:14px!important;min-height:14px!important;transform:none!important}.mapa-filter-option{font-size:11px!important;line-height:1.1!important;padding:4px 5px!important}}\n';
    document.head.appendChild(st);
  }
  function applyVersion(){
    try{ document.title='ControlEvent '+VERSION; }catch(_){ }
    var mini=document.querySelector('.ce-v104-brand-mini,.ce-v1041-brand-mini,.ce-v1042-brand-mini,.ce-v1043-brand-mini,.ce-v1044-brand-mini,.ce-v1045-brand-mini');
    if(mini){ mini.className='ce-v1045-brand-mini ce-v104-brand-mini'; mini.innerHTML='<img src="./assets/icons/controlevent-welcome-v44.png" alt="CE"><span>'+VERSION+'</span>'; }
    document.querySelectorAll('.appname-stack span span,.appname span,.appname-stack span').forEach(function(el){
      if(el && /v\d+\.\d+(?:\.\d+)?_prod/i.test(el.textContent||'')) el.textContent=(el.textContent||'').replace(/v\d+\.\d+(?:\.\d+)?_prod/ig, VERSION);
    });
  }
  function oldDownloadSelector(){ return '.ce-ticket-download-v95,.ce-v103-download-btn,.ce-v104-download-btn,.ce-v104-doc-download,.ce-v104-ingreso-download,.ce-v1041-ingreso-download,.ce-v1042-ingreso-download,.ce-v1043-download,.ce-v1043-doc-download,.ce-v1043-ingreso-download,.ce-v1044-download,.ce-v1044-doc-download,.ce-v1044-ingreso-download,.ce-v1045-download'; }
  function removeOldDownloads(root){
    if(!root) return;
    Array.prototype.slice.call(root.querySelectorAll(oldDownloadSelector())).forEach(function(b){ try{ b.remove(); }catch(_){ b.style.display='none'; } });
  }
  function closestCard(el, root){
    return (el && el.closest && el.closest('.ce-doc-item,.ce-doc-media,.ce-v509-receipt-field,.ce-v504-receipt-strip,.ce-v502-receipt-strip,.ce-v465-receipt-strip,.itemcard,.rowline,.card')) || (el && el.parentElement) || root;
  }
  function makeBtn(cls, title, getSrc, name){
    var btn=document.createElement('button'); btn.type='button'; btn.textContent='⬇️'; btn.title=title; btn.setAttribute('aria-label',title); btn.className='outline small ce-v1045-download '+cls;
    btn.addEventListener('click',function(ev){ stop(ev); return downloadSrc(getSrc(), name); }, true);
    btn.addEventListener('pointerdown',function(ev){ ev.stopPropagation&&ev.stopPropagation(); }, true);
    btn.addEventListener('touchstart',function(ev){ ev.stopPropagation&&ev.stopPropagation(); }, {capture:true,passive:false});
    return btn;
  }
  function hydrateDocumentDownloads(){
    var root=$('tabDocumentos'); if(!root) return;
    removeOldDownloads(root);
    var imgs=Array.prototype.slice.call(root.querySelectorAll('img.ce-doc-thumb,.ce-doc-thumb-link-v85 img,.ce-doc-media img')).filter(function(img){ return isImageSource(imgSrc(img)); });
    var cards=[];
    imgs.forEach(function(img,idx){
      var card=closestCard(img, root); if(!card || cards.indexOf(card)>=0) return; cards.push(card);
      var btn=makeBtn('ce-v1045-doc-download','Descargar documento',function(){return imgSrc(img);},'documento_evento_'+(idx+1));
      var actions=card.querySelector('.ce-doc-actions') || card.querySelector('.ce-doc-media') || img.parentElement || card;
      try{ actions.appendChild(btn); }catch(_){ card.appendChild(btn); }
    });
  }
  function hydrateIngresoDownloads(){
    var root=$('tabIngresos') || $('collabList'); if(!root) return;
    removeOldDownloads(root);
    var imgs=Array.prototype.slice.call(root.querySelectorAll('.ce-v509-receipt-thumb img,.ce-v504-receipt-thumb img,.ce-v502-receipt-thumb img,.ce-v465-receipt-thumb img,#collabList img')).filter(function(img){
      if(img.closest && img.closest('#ceAiTicketPanel,#tabDocumentos,#tabResumen,#tabGraficas,#tabCompras,#tabDonaciones,#tabMapa,#tabMapaProductos')) return false;
      return isImageSource(imgSrc(img));
    });
    var cards=[];
    imgs.forEach(function(img,idx){
      var card=closestCard(img, root); if(!card || cards.indexOf(card)>=0) return; cards.push(card);
      var btn=makeBtn('ce-v1045-ingreso-download','Descargar justificante',function(){return imgSrc(img);},'justificante_ingreso_'+(idx+1));
      var box=card.querySelector('.ce-v509-receipt-strip,.ce-v504-receipt-strip,.ce-v502-receipt-strip,.ce-v465-receipt-strip') || img.parentElement || card;
      try{ box.appendChild(btn); }catch(_){ card.appendChild(btn); }
    });
  }
  var timer=0;
  function run(){ injectStyle(); applyVersion(); hydrateDocumentDownloads(); hydrateIngresoDownloads(); }
  function schedule(delay){ clearTimeout(timer); timer=setTimeout(run, delay||140); }
  document.addEventListener('click',function(ev){
    if(ev.target && ev.target.closest && ev.target.closest('.ce-v1045-download')){ ev.stopPropagation(); }
    if(ev.target && ev.target.closest && ev.target.closest('#tabDocumentosBtn,#tabIngresosBtn,.mobile-menu-action')) schedule(220);
  }, true);
  ['DOMContentLoaded','load','controlevent:app-ready','controlevent:runtime-ready','controlevent:module-mounted','controlevent:event-loaded','controlevent:ticket-image-changed'].forEach(function(name){ window.addEventListener(name,function(){ schedule(160); }); });
  [300,900,1800].forEach(function(ms){ setTimeout(run,ms); });
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
  window.ControlEventV1045Rescue={version:VERSION,run:run,docs:hydrateDocumentDownloads,ingresos:hydrateIngresoDownloads};
})();
