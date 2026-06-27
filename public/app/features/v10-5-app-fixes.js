/* ControlEvent v16_prod - ajustes quirurgicos: version, INFOEVENTO/BACKUP, fotos ingresos/docs, resumen sin descarga. */
(function(){
  'use strict';
  if(window.__ceV105ProdFixes) return; window.__ceV105ProdFixes=true;
  var VERSION='v16_prod';
  var VERSION_TEXT='ControlEvent v16_prod';
  var VERSION_FILE='ControlEvent_v16_prod';
  function text(v){ return v==null?'':String(v); }
  function trim(v){ return text(v).trim(); }
  function $(id){ return document.getElementById(id); }
  function safe(fn,fb){ try{ var v=fn(); return v===undefined?fb:v; }catch(_){ return fb; } }
  function stateObj(){ return safe(function(){return (typeof state!=='undefined'&&state)||window.state||{};}, window.state||{}); }
  function arr(name){ var s=stateObj(); return Array.isArray(s[name]) ? s[name] : []; }
  function selectedEventId(){ var s=stateObj(); return trim(s.selectedEventId || (($('selectedEvent')||{}).value||'')); }
  function fold(v){ var s=text(v); return (s.normalize?s.normalize('NFD').replace(/[\u0300-\u036f]/g,''):s).toUpperCase(); }
  function esc(v){ return text(v).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];}); }
  function stop(ev){ if(ev){ ev.preventDefault&&ev.preventDefault(); ev.stopPropagation&&ev.stopPropagation(); ev.stopImmediatePropagation&&ev.stopImmediatePropagation(); } return false; }
  function safeFile(base){ return trim(base||'foto').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,'_').slice(0,90)||'foto'; }
  function srcOf(v){ if(!v) return ''; if(typeof v==='string') return trim(v); if(typeof v==='object') return trim(v.url||v.public_url||v.publicUrl||v.pathname||v.path||v.storage_path||v.dataUrl||v.base64||v.src||''); return trim(v); }
  function downloadSrc(src, name){
    src=trim(src); if(!src) return false;
    var fname=safeFile(name)+'.jpg';
    function fire(url){ var a=document.createElement('a'); a.href=url; a.download=fname; a.rel='noopener'; a.style.display='none'; document.body.appendChild(a); a.click(); setTimeout(function(){ try{a.remove();}catch(_){ } },500); }
    if(/^data:|^blob:/i.test(src)){ fire(src); return false; }
    fetch(src,{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.blob(); }).then(function(b){ var u=URL.createObjectURL(b); fire(u); setTimeout(function(){URL.revokeObjectURL(u);},3000); }).catch(function(){ fire(src); });
    return false;
  }
  function normalizeDownloadName(name){
    var n=text(name);
    n=n.replace(/ControlEvent_v10_4(?:_\d+)?_prod/ig, VERSION_FILE)
       .replace(/ControlEvent_v16_prod/ig, VERSION_FILE)
       .replace(/ControlEvent_v\d+(?:_\d+){1,4}_prod/ig, VERSION_FILE)
       .replace(/ControlEvent\s+v10\.4(?:\.\d+)?_prod/ig, VERSION_TEXT)
       .replace(/ControlEvent\s+v\d+(?:\.\d+){1,4}_prod/ig, VERSION_TEXT);
    return n;
  }
  function installDownloadNamePatch(){
    try{
      var proto=HTMLAnchorElement.prototype;
      if(proto.click && !proto.click.__ceV105NamePatch){
        var old=proto.click;
        var wrapped=function(){ try{ if(this.download) this.download=normalizeDownloadName(this.download); }catch(_){ } return old.apply(this, arguments); };
        wrapped.__ceV105NamePatch=true; proto.click=wrapped;
      }
    }catch(_){ }
  }
  function injectStyle(){
    if($('ceV105ProdStyle')) return;
    var st=document.createElement('style'); st.id='ceV105ProdStyle';
    st.textContent='\n'+
      '.ce-v105-download{width:34px!important;height:34px!important;min-width:34px!important;min-height:34px!important;padding:0!important;border-radius:10px!important;font-size:17px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;margin-left:5px!important;vertical-align:middle!important;background:#fff!important;color:#0f172a!important;border:1px solid #cbd5e1!important;box-shadow:0 1px 3px rgba(15,23,42,.12)!important;pointer-events:auto!important;visibility:visible!important;opacity:1!important}\n'+
      '#collabList .ce-v105-ingreso-download{background:#fff!important;color:#0f172a!important}\n'+
      '#eventDocsList .ce-v105-doc-download{background:#fff!important;color:#0f172a!important}\n'+
      '#tabResumen .ce-ticket-download-v95,#tabResumen .ce-v1047-download,#tabResumen .ce-v1046-download,#tabResumen .ce-v1045-download,#summaryTiendaTicket .ce-ticket-download-v95,#summaryTiendaTicket .ce-v1047-download{display:none!important}\n'+
      '@media (min-width:768px) and (max-width:1180px){#mapaResponsablesFilter summary,#mapaResponsablesFilterV309 summary{font-size:10px!important;padding:3px 5px!important;min-height:0!important}#mapaResponsablesFilter .mapa-filter-option,#mapaResponsablesFilterV309 .mapa-filter-option,.mapa-filter-option{font-size:9px!important;line-height:1!important;padding:2px 4px!important;min-height:0!important;border-radius:6px!important}#mapaResponsablesFilter input[type="checkbox"],#mapaResponsablesFilterV309 input[type="checkbox"],.mapa-filter-option input[type="checkbox"]{width:12px!important;height:12px!important;min-width:12px!important;min-height:12px!important;margin:0 3px 0 0!important;transform:none!important}}\n';
    document.head.appendChild(st);
  }
  function applyVersion(){
    try{ document.title=VERSION_TEXT; }catch(_){ }
    safe(function(){ window.__ceVersion=VERSION_TEXT; window.VERSION=VERSION_TEXT; window.VERSION_FILE=VERSION_FILE; window.ControlEventVersion={version:VERSION_TEXT,versionFile:VERSION_FILE}; });
    document.querySelectorAll('.ce-v104-brand-mini,.ce-v1045-brand-mini,.ce-v1047-brand-mini,[data-ce-version-label]').forEach(function(el){
      if(el.classList && /ce-v104/.test(el.className||'')) el.innerHTML='<img src="./assets/icons/controlevent-welcome-v44.png" alt="CE"><span>'+VERSION+'</span>';
      else if(/v\d+[._]\d+/i.test(el.textContent||'')) el.textContent=(el.textContent||'').replace(/v\d+(?:[._]\d+){1,4}_prod/ig, VERSION);
    });
    document.querySelectorAll('.appname-stack span,.appname span').forEach(function(el){ if(/v\d/i.test(el.textContent||'')) el.textContent=(el.textContent||'').replace(/v\d+(?:[._]\d+){1,4}_prod/ig, VERSION); });
  }
  function isDownloadButton(btn){
    if(!btn || btn.tagName!=='BUTTON') return false;
    var t=fold((btn.textContent||'')+' '+(btn.title||'')+' '+(btn.getAttribute('aria-label')||'')+' '+(btn.className||''));
    return /DESCARG|DOWNLOAD|⬇/.test(t) || /CE-V10(4|5).*DOWNLOAD|CE-TICKET-DOWNLOAD/.test(t);
  }
  function patchResumenActions(root){
    root=root || $('tabResumen') || document;
    ['#tabResumen','#summaryTiendaTicket','#ceBudgetLiteTooltipV307','#ceTooltipV21'].forEach(function(sel){
      var r=document.querySelector(sel); if(!r) return;
      Array.prototype.slice.call(r.querySelectorAll('button')).forEach(function(b){
        var t=fold((b.textContent||'')+' '+(b.title||'')+' '+(b.getAttribute('aria-label')||''));
        if(isDownloadButton(b)){ try{ b.remove(); }catch(_){ b.style.display='none'; } return; }
        if(/ADJUNTAR|INSERTAR FOTO|SUBIR FOTO|CAMBIAR FOTO/.test(t) && !/JUSTIFICANTE/.test(t)){ b.textContent='📎'; b.title='Adjuntar foto'; b.setAttribute('aria-label','Adjuntar foto'); }
        if(/ELIMINAR FOTO/.test(t) || (/^\s*ELIMINAR\s*$/.test(fold(b.textContent||'')) && /FOTO|TICKET/.test(t))){ b.textContent='🗑️'; b.title='Eliminar foto'; b.setAttribute('aria-label','Eliminar foto'); }
      });
    });
  }
  function clickBlockResumenDownload(ev){
    var b=ev.target && ev.target.closest && ev.target.closest('button,a'); if(!b) return;
    if(!(b.closest('#tabResumen') || b.closest('#summaryTiendaTicket') || b.closest('#ceBudgetLiteTooltipV307') || b.closest('#ceTooltipV21'))) return;
    if(isDownloadButton(b)){ stop(ev); try{ b.remove(); }catch(_){ b.style.display='none'; } return false; }
  }
  function makeDownloadButton(cls, srcFn, nameFn){
    var btn=document.createElement('button'); btn.type='button'; btn.className='outline small ce-v105-download '+cls; btn.textContent='⬇️'; btn.title='Descargar foto'; btn.setAttribute('aria-label','Descargar foto');
    function go(ev){ stop(ev); var src=typeof srcFn==='function'?srcFn():srcFn; return downloadSrc(src, typeof nameFn==='function'?nameFn():nameFn); }
    ['pointerdown','touchstart','touchend','click'].forEach(function(n){ btn.addEventListener(n, go, {capture:true,passive:false}); });
    return btn;
  }
  function hydrateIngresoServer(force){
    var ev=selectedEventId(); if(!ev) return Promise.resolve(false);
    var now=Date.now();
    if(!force && window.__ceV105LastIngresoHydrate && window.__ceV105LastIngresoHydrate.ev===ev && now-window.__ceV105LastIngresoHydrate.at<12000) return Promise.resolve(false);
    window.__ceV105LastIngresoHydrate={ev:ev,at:now};
    if(window.ControlEventV509 && typeof window.ControlEventV509.hydrateReceipts==='function'){
      return Promise.resolve(window.ControlEventV509.hydrateReceipts(!!force)).then(function(){ if(window.ControlEventV509.normalizeReceiptFields) window.ControlEventV509.normalizeReceiptFields(); return true; }).catch(function(){ return false; });
    }
    return Promise.resolve(false);
  }
  function patchIngresoDownloads(){
    var root=$('collabList') || $('tabIngresos'); if(!root) return;
    if(window.ControlEventV509 && typeof window.ControlEventV509.normalizeReceiptFields==='function') safe(function(){ window.ControlEventV509.normalizeReceiptFields(); });
    // Quitar duplicados de descargas antiguas, conservando solo la nuestra por strip.
    Array.prototype.slice.call(root.querySelectorAll('.ce-v1047-ingreso-download,.ce-v1046-ingreso-download,.ce-v1045-ingreso-download')).forEach(function(b){ try{ b.remove(); }catch(_){ } });
    Array.prototype.slice.call(root.querySelectorAll('.ce-v509-receipt-strip')).forEach(function(strip,idx){
      var own=Array.prototype.slice.call(strip.querySelectorAll(':scope > .ce-v105-ingreso-download'));
      own.slice(1).forEach(function(b){ try{ b.remove(); }catch(_){ } });
      if(own.length) return;
      var img=strip.querySelector('.ce-v509-receipt-thumb img,img[src^="data:image/"],img[src^="blob:"],img[src*="ticket-images"],img[src*="storage"]');
      if(!img) return;
      var src=function(){ return img.currentSrc || img.src || img.getAttribute('src') || ''; };
      var btn=makeDownloadButton('ce-v105-ingreso-download', src, 'justificante_ingreso_'+(idx+1));
      strip.appendChild(btn);
    });
  }
  function patchDocumentDownloads(){
    var root=$('eventDocsList') || $('tabDocumentos'); if(!root) return;
    // Quitar flechas pegadas a miniatura o duplicadas antiguas.
    Array.prototype.slice.call(root.querySelectorAll('.ce-v1047-doc-download,.ce-v1046-doc-download,.ce-v1045-doc-download')).forEach(function(b){ try{ b.remove(); }catch(_){ } });
    Array.prototype.slice.call(root.querySelectorAll('.ce-doc-item')).forEach(function(card,idx){
      var img=card.querySelector('.ce-doc-thumb-link-v85 img,.ce-doc-media img,img.ce-doc-thumb,img[src^="data:image/"],img[src^="blob:"],img[src*="ticket-images"],img[src*="storage"]');
      if(!img) return;
      var grid=card.querySelector('.ce-doc-item-grid') || card;
      var actions=card.querySelector('.ce-doc-actions');
      if(!actions){ actions=document.createElement('div'); actions.className='ce-doc-actions ce-doc-download-only-v105'; try{ grid.appendChild(actions); }catch(_){ card.appendChild(actions); } }
      var own=Array.prototype.slice.call(actions.querySelectorAll(':scope > .ce-v105-doc-download'));
      own.slice(1).forEach(function(b){ try{ b.remove(); }catch(_){ } });
      if(own.length) return;
      var btn=makeDownloadButton('ce-v105-doc-download', function(){ return img.currentSrc || img.src || img.getAttribute('src') || ''; }, 'documento_evento_'+(idx+1));
      actions.appendChild(btn);
    });
  }
  function patchAllPhotos(){ injectStyle(); patchResumenActions(); patchDocumentDownloads(); patchIngresoDownloads(); }
  var patchTimer=0, patchBusy=false;
  function schedulePatch(forceHydrate){
    clearTimeout(patchTimer); patchTimer=setTimeout(function(){
      if(patchBusy) return; patchBusy=true;
      hydrateIngresoServer(!!forceHydrate).then(function(){ patchAllPhotos(); }).finally(function(){ patchBusy=false; });
    },120);
  }
  function installObservers(){
    if(window.__ceV105Observers) return; window.__ceV105Observers=true;
    ['collabList','eventDocsList','tabResumen','summaryTiendaTicket'].forEach(function(id){ var r=$(id); if(!r) return; try{ new MutationObserver(function(){ schedulePatch(false); }).observe(r,{childList:true,subtree:true}); }catch(_){ } });
  }
  function run(force){ injectStyle(); installDownloadNamePatch(); applyVersion(); patchAllPhotos(); schedulePatch(!!force); installObservers(); }
  document.addEventListener('click',clickBlockResumenDownload,true);
  document.addEventListener('click',function(ev){
    if(ev.target && ev.target.closest && ev.target.closest('#tabIngresosBtn,#tabDocumentosBtn,#btnIngresos,#btnDocumentos,#tabResumenBtn,.main-tab,.mobile-menu-action')) setTimeout(function(){ run(true); },180);
  },true);
  document.addEventListener('change',function(ev){ if(ev.target && ev.target.id==='selectedEvent') setTimeout(function(){ run(true); },450); },true);
  ['DOMContentLoaded','load','controlevent:app-ready','controlevent:runtime-ready','controlevent:module-mounted','controlevent:event-loaded','controlevent:ticket-image-changed'].forEach(function(n){ window.addEventListener(n,function(){ setTimeout(function(){ run(n==='controlevent:event-loaded'); },160); }); });
  window.ControlEventV105={version:VERSION, versionFile:VERSION_FILE, run:run, patchAllPhotos:patchAllPhotos, normalizeDownloadName:normalizeDownloadName};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){ run(true); },{once:true}); else run(true);
})();
