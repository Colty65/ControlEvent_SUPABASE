/* ControlEvent v10_5_prod - RESCATE ESTABLE
   - Sin ocultación prelogin ni bienvenida experimental.
   - Sin intervalos ni renders automáticos.
   - Limpia duplicados de descarga en Documentos/Ingresos sin tocar miniaturas.
   - Mantiene visible la app tras login y evita clases residuales de hotfix anteriores. */
(function(){
  'use strict';
  if(window.__ceV1044RescueFixes) return;
  window.__ceV1044RescueFixes = true;
  var VERSION = 'v10_5_prod';
  function $(id){ return document.getElementById(id); }
  function trim(v){ return v == null ? '' : String(v).trim(); }
  function stop(ev){ if(ev){ ev.preventDefault&&ev.preventDefault(); ev.stopPropagation&&ev.stopPropagation(); ev.stopImmediatePropagation&&ev.stopImmediatePropagation(); } return false; }
  function isImgSrc(img){ var s=trim(img && (img.currentSrc || img.src)); return !!(s && (/^data:image\//i.test(s) || /ticket-images|ingresos|justificante|receipt|supabase|storage/i.test(s))); }
  function safeName(base){ return trim(base||'foto').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,'_').slice(0,90) || 'foto'; }
  function downloadSrc(src,name){
    src=trim(src); if(!src) return false;
    var fname=safeName(name)+'.jpg';
    function fire(url){ var a=document.createElement('a'); a.href=url; a.download=fname; a.rel='noopener'; a.style.display='none'; document.body.appendChild(a); a.click(); setTimeout(function(){ a.remove(); }, 500); }
    if(/^data:|^blob:/i.test(src)){ fire(src); return false; }
    fetch(src,{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.blob(); }).then(function(b){ var u=URL.createObjectURL(b); fire(u); setTimeout(function(){ URL.revokeObjectURL(u); },3000); }).catch(function(){ fire(src); });
    return false;
  }
  function injectStyle(){
    if($('ceV1044RescueStyle')) return;
    var st=document.createElement('style'); st.id='ceV1044RescueStyle';
    st.textContent = '\n'+
      'html.ce-prelogin-clean body .header,html.ce-prelogin-clean body>.app,html.ce-prelogin-blank body .header,html.ce-prelogin-blank body>.app{visibility:visible!important;display:block!important}\n'+
      '.ce-v1042-welcome,.ce-v1042-party,.ce-prelogin-splash,.ce-login-splash,.ce-boot-logo{display:none!important;visibility:hidden!important;pointer-events:none!important}\n'+
      '.ce-v1044-brand-mini{display:inline-flex!important;align-items:center!important;gap:6px!important;font-weight:950!important}.ce-v1044-brand-mini img{width:28px!important;height:28px!important;object-fit:contain!important}\n'+
      '#tabIngresos .ce-ticket-download-v95,#tabIngresos .ce-v104-download-btn,#tabIngresos .ce-v1043-download,#tabIngresos .ce-v1042-ingreso-download,#tabIngresos .ce-v1041-ingreso-download,#tabIngresos .ce-v104-ingreso-download,#tabDocumentos .ce-ticket-download-v95,#tabDocumentos .ce-v104-download-btn,#tabDocumentos .ce-v1043-download,#tabDocumentos .ce-v104-doc-download,#tabDocumentos .ce-v1042-doc-download{display:none!important;visibility:hidden!important;width:0!important;min-width:0!important;height:0!important;min-height:0!important;padding:0!important;margin:0!important;border:0!important;overflow:hidden!important}\n'+
      '.ce-v1044-download{width:32px!important;height:30px!important;min-width:32px!important;min-height:30px!important;padding:1px!important;border-radius:8px!important;font-size:16px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;margin-left:4px!important}\n'+
      '.ce-doc-thumb,img.ce-doc-thumb,.ce-doc-target-imgwrap-v85 img,#tabDocumentos img{visibility:visible!important;display:inline-block!important;opacity:1!important;max-width:82px!important;max-height:82px!important;object-fit:cover!important}\n';
    document.head.appendChild(st);
  }
  function removeBadClasses(){
    try{ document.documentElement.classList.remove('ce-prelogin-clean','ce-prelogin-blank'); }catch(_){ }
    try{ document.body.classList.remove('ce-prelogin-clean','ce-prelogin-blank'); }catch(_){ }
    ['cePreloginSplash','ceLoginSplash','cePreloginBlank','ceBootLogo'].forEach(function(id){ var el=$(id); if(el) el.remove(); });
  }
  function applyVersion(){
    try{ document.title='ControlEvent '+VERSION; }catch(_){ }
    var mini=document.querySelector('.ce-v104-brand-mini,.ce-v1041-brand-mini,.ce-v1042-brand-mini,.ce-v1044-brand-mini');
    if(mini){ mini.className='ce-v1044-brand-mini ce-v104-brand-mini'; mini.innerHTML='<img src="./assets/icons/controlevent-welcome-v44.png" alt="CE"><span>'+VERSION+'</span>'; }
    document.querySelectorAll('.appname-stack span span,.appname span,.appname-stack span').forEach(function(el){
      if(el && /v\d+\.\d+(?:\.\d+)?_prod/i.test(el.textContent||'')) el.textContent=(el.textContent||'').replace(/v\d+\.\d+(?:\.\d+)?_prod/ig, VERSION);
    });
  }
  function knownDownloadSelector(){
    return '.ce-ticket-download-v95,.ce-v104-download-btn,.ce-v104-doc-download,.ce-v104-ingreso-download,.ce-v1041-ingreso-download,.ce-v1042-ingreso-download,.ce-v1043-download,.ce-v1043-doc-download,.ce-v1043-ingreso-download,.ce-v1044-download';
  }
  function findRecordContainer(img, root){
    var el=img;
    for(var i=0;i<8 && el && el!==root;i++,el=el.parentElement){
      if(!el.parentElement || el.parentElement===root) return el;
      var txt=trim(el.textContent||'');
      var cls=String(el.className||'');
      if(/itemcard|rowline|card|ce-doc-item|ce-doc-media|receipt-field|receipt-strip/i.test(cls)) return el;
      if(/Modificar|Eliminar|Justificante|Colaborador\/a|Texto descriptivo|Situaci/i.test(txt)) return el;
    }
    return img.parentElement || root;
  }
  function addOneDownload(rootSelector, btnClass, namePrefix){
    var root=document.querySelector(rootSelector); if(!root) return;
    Array.prototype.slice.call(root.querySelectorAll(knownDownloadSelector())).forEach(function(b){ if(!b.classList.contains(btnClass)) b.remove(); });
    Array.prototype.slice.call(root.querySelectorAll('.'+btnClass)).forEach(function(b){ b.remove(); });
    var seen=[];
    var imgs=Array.prototype.slice.call(root.querySelectorAll('img')).filter(isImgSrc);
    imgs.forEach(function(img,idx){
      var card=findRecordContainer(img, root);
      if(seen.indexOf(card)>=0) return;
      seen.push(card);
      var btn=document.createElement('button');
      btn.type='button'; btn.textContent='⬇️'; btn.title='Descargar foto'; btn.setAttribute('aria-label','Descargar foto');
      btn.className='outline small '+btnClass+' ce-v1044-download';
      btn.onclick=function(ev){ stop(ev); return downloadSrc(img.currentSrc||img.src, namePrefix+'_'+(idx+1)); };
      try{ img.insertAdjacentElement('afterend', btn); }catch(_){ try{ card.appendChild(btn); }catch(__){} }
    });
  }
  function tidyDownloads(){
    addOneDownload('#tabDocumentos','ce-v1044-doc-download','documento_evento');
    addOneDownload('#tabIngresos,#collabList','ce-v1044-ingreso-download','justificante_ingreso');
  }
  var scheduled=0;
  function schedule(){ clearTimeout(scheduled); scheduled=setTimeout(run, 180); }
  function run(){ injectStyle(); removeBadClasses(); applyVersion(); tidyDownloads(); }
  document.addEventListener('click', function(ev){
    if(ev.target && ev.target.closest && ev.target.closest('.ce-v1044-download')){
      // onclick del botón hará la descarga; este listener solo blinda que no se abra el visor detrás.
      ev.stopPropagation();
    }
  }, true);
  ['DOMContentLoaded','load','controlevent:app-ready','controlevent:runtime-ready','controlevent:module-mounted','controlevent:event-loaded','controlevent:ticket-image-changed'].forEach(function(name){ window.addEventListener(name, schedule); });
  document.addEventListener('click', function(ev){ if(ev.target && ev.target.closest && ev.target.closest('#tabDocumentosBtn,#tabIngresosBtn,.mobile-menu-action')) schedule(); }, true);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', run, {once:true}); else run();
  window.ControlEventV1044Rescue = {version: VERSION, run: run, tidyDownloads: tidyDownloads};
})();
