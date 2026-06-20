/* ControlEvent v11_3_1_prod - RESCATE ESTABLE
   - Sin ocultación prelogin ni bienvenida experimental.
   - Sin intervalos ni renders automáticos.
   - Limpia duplicados de descarga en Documentos/Ingresos sin tocar miniaturas.
   - Mantiene visible la app tras login y evita clases residuales de hotfix anteriores. */
(function(){
  'use strict';
  if(window.__ceV1043RescueFixes) return;
  window.__ceV1043RescueFixes = true;
  var VERSION = 'v11_3_1_prod';
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
    if($('ceV1043RescueStyle')) return;
    var st=document.createElement('style'); st.id='ceV1043RescueStyle';
    st.textContent = '\n'+
      'html.ce-prelogin-clean body .header,html.ce-prelogin-clean body>.app,html.ce-prelogin-blank body .header,html.ce-prelogin-blank body>.app{visibility:visible!important;display:block!important}\n'+
      '.ce-v1042-welcome,.ce-v1042-party,.ce-prelogin-splash,.ce-login-splash,.ce-boot-logo{display:none!important;visibility:hidden!important;pointer-events:none!important}\n'+
      '.ce-v1043-brand-mini{display:inline-flex!important;align-items:center!important;gap:6px!important;font-weight:950!important}.ce-v1043-brand-mini img{width:28px!important;height:28px!important;object-fit:contain!important}\n'+
      '.ce-v1043-download{width:32px!important;height:30px!important;min-width:32px!important;min-height:30px!important;padding:1px!important;border-radius:8px!important;font-size:16px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;margin-left:4px!important}\n'+
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
    var mini=document.querySelector('.ce-v104-brand-mini,.ce-v1041-brand-mini,.ce-v1042-brand-mini,.ce-v1043-brand-mini');
    if(mini){ mini.className='ce-v1043-brand-mini ce-v104-brand-mini'; mini.innerHTML='<img src="./assets/icons/controlevent-welcome-v44.png" alt="CE"><span>'+VERSION+'</span>'; }
    document.querySelectorAll('.appname-stack span span,.appname span,.appname-stack span').forEach(function(el){
      if(el && /v\d+\.\d+(?:\.\d+)?_prod/i.test(el.textContent||'')) el.textContent=(el.textContent||'').replace(/v\d+\.\d+(?:\.\d+)?_prod/ig, VERSION);
    });
  }
  function oneDownloadPerCard(rootSelector, btnClass, namePrefix){
    var root=document.querySelector(rootSelector); if(!root) return;
    var cards=Array.prototype.slice.call(root.querySelectorAll('.itemcard,.rowline,.card,.ce-doc-item,.ce-doc-target-imgwrap-v85,.ce-doc-media,.ce-v509-receipt-field,.ce-v504-receipt-strip,.ce-v502-receipt-strip,.ce-v465-receipt-strip'));
    cards.forEach(function(card,idx){
      var imgs=Array.prototype.slice.call(card.querySelectorAll('img')).filter(isImgSrc);
      var buttons=Array.prototype.slice.call(card.querySelectorAll('.'+btnClass+',.ce-v104-doc-download,.ce-v104-ingreso-download,.ce-v1041-ingreso-download,.ce-v1042-ingreso-download,.ce-ticket-download-v95'));
      if(!imgs.length){ buttons.forEach(function(b){ b.remove(); }); return; }
      var keep=buttons[0];
      buttons.slice(1).forEach(function(b){ b.remove(); });
      if(!keep){ keep=document.createElement('button'); keep.type='button'; keep.textContent='⬇️'; keep.title='Descargar foto'; keep.setAttribute('aria-label','Descargar foto'); keep.className='outline small '+btnClass+' ce-v1043-download'; imgs[0].insertAdjacentElement('afterend', keep); }
      keep.classList.add(btnClass,'ce-v1043-download');
      keep.onclick=function(ev){ stop(ev); return downloadSrc(imgs[0].currentSrc||imgs[0].src, namePrefix+'_'+(idx+1)); };
    });
  }
  function tidyDownloads(){
    oneDownloadPerCard('#tabDocumentos','ce-v1043-doc-download','documento_evento');
    oneDownloadPerCard('#tabIngresos,#collabList','ce-v1043-ingreso-download','justificante_ingreso');
  }
  var scheduled=0;
  function schedule(){ clearTimeout(scheduled); scheduled=setTimeout(run, 180); }
  function run(){ injectStyle(); removeBadClasses(); applyVersion(); tidyDownloads(); }
  document.addEventListener('click', function(ev){
    if(ev.target && ev.target.closest && ev.target.closest('.ce-v1043-download')){
      // onclick del botón hará la descarga; este listener solo blinda que no se abra el visor detrás.
      ev.stopPropagation();
    }
  }, true);
  ['DOMContentLoaded','load','controlevent:app-ready','controlevent:runtime-ready','controlevent:module-mounted','controlevent:event-loaded','controlevent:ticket-image-changed'].forEach(function(name){ window.addEventListener(name, schedule); });
  document.addEventListener('click', function(ev){ if(ev.target && ev.target.closest && ev.target.closest('#tabDocumentosBtn,#tabIngresosBtn,.mobile-menu-action')) schedule(); }, true);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', run, {once:true}); else run();
  window.ControlEventV1043Rescue = {version: VERSION, run: run, tidyDownloads: tidyDownloads};
})();
