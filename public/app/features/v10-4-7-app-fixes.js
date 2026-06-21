/* ControlEvent v11_3_3_prod - Rescate afinado: descargas, búsquedas, carga COMPRAS y mapa iPad.
   No usa intervalos ni refrescos en bucle. Solo actúa por eventos o cambios reales del DOM. */
(function(){
  'use strict';
  if(window.__ceV1047RescueFixes) return; window.__ceV1047RescueFixes=true;
  var VERSION='v11_3_3_prod';
  function text(v){ return v==null?'':String(v); }
  function trim(v){ return text(v).trim(); }
  function $(id){ return document.getElementById(id); }
  function safe(fn,fb){ try{ var v=fn(); return v===undefined?fb:v; }catch(_){ return fb; } }
  function stateObj(){ return safe(function(){return (typeof state!=='undefined'&&state)||window.state||{};}, window.state||{}); }
  function arr(name){ var s=stateObj(); return Array.isArray(s[name]) ? s[name] : []; }
  function selectedEventId(){ var s=stateObj(); return trim(s.selectedEventId || (($('selectedEvent')||{}).value||'')); }
  function fold(v){ var s=text(v); return (s.normalize?s.normalize('NFD').replace(/[\u0300-\u036f]/g,''):s).toUpperCase(); }
  function stop(ev){ if(ev){ ev.preventDefault&&ev.preventDefault(); ev.stopPropagation&&ev.stopPropagation(); ev.stopImmediatePropagation&&ev.stopImmediatePropagation(); } return false; }
  function safeFile(base){ return trim(base||'foto').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,'_').slice(0,90)||'foto'; }
  function srcOfImg(img){ return trim(img && (img.currentSrc || img.src || img.getAttribute('src') || '')); }
  function looksPhoto(src,img){
    src=trim(src); if(!src) return false;
    if(/^data:image\//i.test(src) || /^blob:/i.test(src)) return true;
    if(/ticket-images|justificante|document|documento|receipt|storage|supabase|image\//i.test(src)) return true;
    var cls=fold((img&&img.className)||'');
    return /THUMB|RECEIPT|DOC/.test(cls);
  }
  function downloadSrc(src, name){
    src=trim(src); if(!src) return false;
    var fname=safeFile(name)+'.jpg';
    function fire(url){ var a=document.createElement('a'); a.href=url; a.download=fname; a.rel='noopener'; a.style.display='none'; document.body.appendChild(a); a.click(); setTimeout(function(){ try{a.remove();}catch(_){ } },500); }
    if(/^data:|^blob:/i.test(src)){ fire(src); return false; }
    fetch(src,{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.blob(); }).then(function(b){ var u=URL.createObjectURL(b); fire(u); setTimeout(function(){URL.revokeObjectURL(u);},3000); }).catch(function(){ fire(src); });
    return false;
  }
  function injectStyle(){
    if($('ceV1047RescueStyle')) return;
    var st=document.createElement('style'); st.id='ceV1047RescueStyle';
    st.textContent='\n'+
      '.ce-v1047-download{width:32px!important;height:30px!important;min-width:32px!important;min-height:30px!important;padding:1px!important;border-radius:8px!important;font-size:16px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;margin-left:5px!important;vertical-align:middle!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important}\n'+
      '.ce-v1047-download[data-ce-download-bound="1"]{background:#fff!important;color:#0f172a!important}\n'+
      '#tabDocumentos img.ce-doc-thumb,#tabDocumentos .ce-doc-thumb-link-v85 img,#tabDocumentos .ce-doc-media img,#tabDocumentos img[src^="data:image/"]{display:inline-block!important;visibility:visible!important;opacity:1!important;width:58px!important;height:42px!important;max-width:58px!important;max-height:42px!important;object-fit:cover!important;border-radius:8px!important}\n'+
      '@media (min-width:768px) and (max-width:1180px){#mapaResponsablesFilter summary,#mapaResponsablesFilterV309 summary{font-size:11px!important;padding:4px 6px!important;min-height:0!important}#mapaResponsablesFilter .mapa-filter-option,#mapaResponsablesFilterV309 .mapa-filter-option,.mapa-filter-option{font-size:10px!important;line-height:1.05!important;padding:3px 4px!important;min-height:0!important;border-radius:7px!important}#mapaResponsablesFilter input[type="checkbox"],#mapaResponsablesFilterV309 input[type="checkbox"],.mapa-filter-option input[type="checkbox"]{width:13px!important;height:13px!important;min-width:13px!important;min-height:13px!important;margin:0 3px 0 0!important;transform:none!important}}\n'+
      '@media (max-width:900px){#mapaResponsablesFilter summary,#mapaResponsablesFilterV309 summary{font-size:11px!important;padding:4px 6px!important;min-height:0!important}#mapaResponsablesFilter .mapa-filter-option,#mapaResponsablesFilterV309 .mapa-filter-option,.mapa-filter-option{font-size:10px!important;line-height:1.05!important;padding:3px 4px!important;min-height:0!important}.mapa-filter-option input[type="checkbox"]{width:13px!important;height:13px!important;min-width:13px!important;min-height:13px!important;transform:none!important}}\n';
    document.head.appendChild(st);
  }
  function applyVersion(){
    try{ document.title='ControlEvent '+VERSION; }catch(_){ }
    var mini=document.querySelector('.ce-v104-brand-mini,.ce-v1045-brand-mini,.ce-v1047-brand-mini');
    if(mini){ mini.className='ce-v104-brand-mini ce-v1047-brand-mini'; mini.innerHTML='<img src="./assets/icons/controlevent-welcome-v44.png" alt="CE"><span>'+VERSION+'</span>'; }
    document.querySelectorAll('.appname-stack span,.appname span').forEach(function(el){ if(el && /v\d+\.\d+(?:\.\d+)?_prod/i.test(el.textContent||'')) el.textContent=(el.textContent||'').replace(/v\d+\.\d+(?:\.\d+)?_prod/ig, VERSION); });
  }
  function isDownloadButton(btn){
    if(!btn || btn.tagName!=='BUTTON') return false;
    var t=fold((btn.textContent||'')+' '+(btn.title||'')+' '+(btn.getAttribute('aria-label')||'')+' '+(btn.className||''));
    return /DESCARG|⬇|CE-V104|CE-V103|CE-TICKET-DOWNLOAD|DOWNLOAD/.test(t);
  }
  function cardOf(img, root){ return (img.closest && img.closest('.ce-doc-item,.ce-doc-media,.ce-v509-receipt-field,.ce-v504-receipt-strip,.ce-v502-receipt-strip,.ce-v465-receipt-strip,.itemcard,.rowline,.card')) || img.parentElement || root; }
  function photoImgs(root, mode){
    if(!root) return [];
    var q = mode==='doc' ? 'img.ce-doc-thumb,.ce-doc-thumb-link-v85 img,.ce-doc-media img,img[src^="data:image/"],img[src^="blob:"],img[src*="ticket-images"],img[src*="storage"]' : '.ce-v509-receipt-thumb img,.ce-v504-receipt-thumb img,.ce-v502-receipt-thumb img,.ce-v465-receipt-thumb img,img[src^="data:image/"],img[src^="blob:"],img[src*="ticket-images"],img[src*="storage"]';
    return Array.prototype.slice.call(root.querySelectorAll(q)).filter(function(img){
      if(img.closest && img.closest('#ceAiTicketPanel,#tabResumen,#tabGraficas,#tabCompras,#tabDonaciones,#tabMapa,#tabMapaProductos,.footer')) return false;
      var src=srcOfImg(img); return looksPhoto(src,img);
    });
  }
  function makeDownloadButton(cls, img, name){
    var btn=document.createElement('button'); btn.type='button'; btn.className='outline small ce-v1047-download '+cls; btn.textContent='⬇️'; btn.title='Descargar foto'; btn.setAttribute('aria-label','Descargar foto'); btn.setAttribute('data-ce-download-bound','1');
    function go(ev){ stop(ev); var now=Date.now(); if(btn.__last && now-btn.__last<800) return false; btn.__last=now; return downloadSrc(srcOfImg(img), name); }
    ['pointerdown','touchstart','touchend','click'].forEach(function(evname){ btn.addEventListener(evname, go, {capture:true,passive:false}); });
    return btn;
  }
  function hydrateDownloadsIn(root, mode){
    if(!root) return;
    // Quita todas las flechas antiguas dentro de la ventana afectada y reconstruye una sola por ficha con foto.
    Array.prototype.slice.call(root.querySelectorAll('button')).forEach(function(b){ if(isDownloadButton(b)) { try{ b.remove(); }catch(_){ b.style.display='none'; } } });
    var done=[];
    photoImgs(root, mode).forEach(function(img, idx){
      var card=cardOf(img, root); if(!card || done.indexOf(card)>=0) return; done.push(card);
      var btn=makeDownloadButton(mode==='doc'?'ce-v1047-doc-download':'ce-v1047-ingreso-download', img, (mode==='doc'?'documento_evento_':'justificante_ingreso_')+(idx+1));
      var target=(mode==='doc' && (card.querySelector('.ce-doc-actions') || card.querySelector('.ce-doc-media'))) || img.parentElement || card;
      try{ target.appendChild(btn); }catch(_){ card.appendChild(btn); }
    });
  }
  var dlTimer=0, hydratingDownloads=false;
  function hydrateDownloads(){ clearTimeout(dlTimer); dlTimer=setTimeout(function(){ hydratingDownloads=true; try{ injectStyle(); hydrateDownloadsIn($('tabDocumentos'),'doc'); hydrateDownloadsIn($('tabIngresos')||$('collabList'),'ing'); } finally { setTimeout(function(){ hydratingDownloads=false; },30); } },80); }
  var observed=new WeakSet();
  function observeRoots(){ ['tabDocumentos','tabIngresos','collabList'].forEach(function(id){ var r=$(id); if(!r || observed.has(r)) return; observed.add(r); try{ new MutationObserver(function(){ if(!hydratingDownloads) hydrateDownloads(); }).observe(r,{childList:true,subtree:true}); }catch(_){ } }); }
  var loadStamp={};
  function visible(el){ return !!(el && !el.classList.contains('hidden') && el.offsetParent!==null); }
  function rowsForEvent(name, ev){ return arr(name).filter(function(r){ return trim(r.eventId||r.event_id)===ev; }); }
  function mergeState(data){
    if(!data || typeof data!=='object') return;
    var s=stateObj(); ['compras','colaboradores','donaciones','productos','personas','tiendas','ticketImages','ticketImageRefs'].forEach(function(k){ if(data[k]!==undefined) s[k]=data[k]; });
    if(data.state && typeof data.state==='object') ['compras','colaboradores','donaciones','productos','personas','tiendas','ticketImages','ticketImageRefs'].forEach(function(k){ if(data.state[k]!==undefined) s[k]=data.state[k]; });
  }
  function renderActiveList(name){ try{ if(name==='compras' && typeof window.renderCompras==='function') window.renderCompras(); if(name==='donaciones' && typeof window.renderDonaciones==='function') window.renderDonaciones(); }catch(_){ } }
  function ensureModuleDataOnce(name){
    var ev=selectedEventId(); if(!ev) return;
    var root=name==='compras' ? $('comprasList') : $('donacionesList');
    var tab=name==='compras' ? $('tabCompras') : $('tabDonaciones');
    if(!visible(tab)) return;
    var cards=root ? root.querySelectorAll('.itemcard,.rowline').length : 0;
    var rows=rowsForEvent(name,ev);
    if(cards>0) return;
    if(rows.length){ renderActiveList(name); return; }
    var key=ev+'|'+name, now=Date.now();
    if(loadStamp[key] && now-loadStamp[key]<8000) return;
    loadStamp[key]=now;
    fetch('/api/state?eventId='+encodeURIComponent(ev)+'&_='+now,{cache:'no-store',headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}})
      .then(function(r){ return r.json().catch(function(){return {};}).then(function(d){ if(!r.ok) throw new Error(d.error||r.status); return d; }); })
      .then(function(d){ mergeState(d); renderActiveList(name); })
      .catch(function(err){ console.warn('[CE v10.4.7] No se pudo rehidratar '+name+' del evento', err&&err.message||err); });
  }
  function scheduleDataCheck(){ setTimeout(function(){ ensureModuleDataOnce('compras'); ensureModuleDataOnce('donaciones'); },650); }

  function collabCardId(card){
    if(!card) return '';
    var el=card.querySelector('button[data-action="save-collab"][data-id],button[data-action="delete-collab"][data-id],select[data-action="edit-collab-persona"][data-id],input[data-action="edit-collab-numero"][data-id],[data-action="edit-collab-situacion"][data-id],[data-id]');
    return trim(el && (el.dataset && el.dataset.id || el.getAttribute('data-id')));
  }
  function ingresoReceiptKeys(id){
    var ev=selectedEventId(), sid=trim(id);
    return [ev+'|INGRESO:'+sid, ev+'|INGRESO|'+sid, 'INGRESO:'+ev+'|'+sid];
  }
  function valueToSrc(v){
    if(!v) return '';
    if(typeof v==='string') return trim(v);
    if(typeof v==='object') return trim(v.url||v.public_url||v.publicUrl||v.pathname||v.storage_path||v.path||v.dataUrl||v.base64||v.src||'');
    return trim(v);
  }
  function ingresoReceiptData(id){
    var imgs=stateObj().ticketImages||{}, refs=stateObj().ticketImageRefs||{};
    var keys=ingresoReceiptKeys(id);
    for(var i=0;i<keys.length;i++){
      var src=valueToSrc(imgs[keys[i]]) || valueToSrc(refs[keys[i]]);
      if(src) return src;
    }
    return '';
  }
  function hydrateIngresoDownloads(){
    var root=$('collabList') || $('tabIngresos'); if(!root) return;
    Array.prototype.slice.call(root.querySelectorAll('.ce-v1047-ingreso-download,.ce-v1046-ingreso-download,.ce-v1045-ingreso-download')).forEach(function(b){ try{ b.remove(); }catch(_){ } });
    var cards=Array.prototype.slice.call(root.querySelectorAll('.itemcard,.rowline,.card'));
    cards.forEach(function(card,idx){
      var id=collabCardId(card); if(!id) return;
      var src=ingresoReceiptData(id); if(!src) return;
      if(card.querySelector('.ce-v1047-ingreso-download')) return;
      var img=card.querySelector('img.ce-v1047-ingreso-thumb,img[src^="data:image/"],img[src^="blob:"],img[src*="ticket-images"],img[src*="storage"]');
      if(!img){
        img=document.createElement('img'); img.className='ce-v1047-ingreso-thumb'; img.alt='Justificante'; img.src=src;
        img.style.cssText='width:42px;height:34px;object-fit:cover;border-radius:8px;border:1px solid #cbd5e1;margin-left:6px;vertical-align:middle;';
        var action=card.querySelector('button[data-action="save-collab"]') || card.querySelector('button');
        try{ (action && action.parentElement || card).appendChild(img); }catch(_){ card.appendChild(img); }
      }
      var btn=makeDownloadButton('ce-v1047-ingreso-download', img, 'justificante_ingreso_'+(idx+1));
      try{ img.insertAdjacentElement('afterend', btn); }catch(_){ card.appendChild(btn); }
    });
  }
  function cleanSearchText(v){ return fold(v).replace(/\s+/g,' ').trim(); }
  function cardSearchText(card){
    var parts=[card.textContent||''];
    Array.prototype.slice.call(card.querySelectorAll('input,select,textarea')).forEach(function(el){
      if(el.tagName==='SELECT'){
        try{ parts.push(el.options[el.selectedIndex] ? el.options[el.selectedIndex].textContent : ''); }catch(_){ }
      }
      parts.push(el.value||'');
    });
    return cleanSearchText(parts.join(' '));
  }
  function getSearchInput(tab, source){
    var active=document.activeElement;
    if(active && tab.contains(active) && /INPUT|TEXTAREA/.test(active.tagName) && trim(active.value)) return active;
    var box=source && source.closest && source.closest('.itemcard,.rowline,.card,section,div');
    if(box){
      var inp=Array.prototype.slice.call(box.querySelectorAll('input,textarea')).find(function(x){ return trim(x.value); });
      if(inp) return inp;
    }
    return Array.prototype.slice.call(tab.querySelectorAll('input,textarea')).find(function(x){ return trim(x.value) && !x.closest('#comprasList,#donacionesList'); }) || null;
  }
  function buscarFicha(kind, source){
    var tab=kind==='compras' ? $('tabCompras') : $('tabDonaciones');
    var list=kind==='compras' ? $('comprasList') : $('donacionesList');
    if(!tab || !list) return false;
    var inp=getSearchInput(tab, source||document.activeElement);
    var q=cleanSearchText(inp && inp.value); if(!q) return false;
    Array.prototype.slice.call(list.querySelectorAll('.ce-v1047-found')).forEach(function(el){ el.classList.remove('ce-v1047-found'); });
    var cards=Array.prototype.slice.call(list.querySelectorAll('.itemcard,.rowline,.card'));
    var found=cards.find(function(card){ return cardSearchText(card).indexOf(q)>=0; });
    if(found){
      found.classList.add('ce-v1047-found');
      try{ found.scrollIntoView({behavior:'smooth',block:'center'}); }catch(_){ found.scrollIntoView(); }
      return true;
    }
    if(inp){ inp.style.borderColor='#ef4444'; setTimeout(function(){ try{ inp.style.borderColor=''; }catch(_){ } },1200); }
    return false;
  }
  function installSearchFix(){
    if(window.__ceV1047SearchFix) return; window.__ceV1047SearchFix=true;
    var st=document.getElementById('ceV1047SearchStyle') || document.createElement('style'); st.id='ceV1047SearchStyle';
    st.textContent='.ce-v1047-found{outline:4px solid #ef4444!important;box-shadow:0 0 0 6px rgba(239,68,68,.18)!important;border-color:#ef4444!important;font-weight:900!important}';
    if(!st.parentNode) document.head.appendChild(st);
    document.addEventListener('click',function(ev){
      var b=ev.target && ev.target.closest && ev.target.closest('button'); if(!b) return;
      var t=cleanSearchText(b.textContent||b.title||b.getAttribute('aria-label')||'');
      if(t!=='BUSCAR') return;
      if(b.closest('#tabCompras')){ stop(ev); buscarFicha('compras', b); }
      else if(b.closest('#tabDonaciones')){ stop(ev); buscarFicha('donaciones', b); }
    },true);
    document.addEventListener('keydown',function(ev){
      if(ev.key!=='Enter') return;
      var el=ev.target; if(!el || !/INPUT|TEXTAREA/.test(el.tagName)) return;
      if(el.closest('#tabCompras')){ stop(ev); buscarFicha('compras', el); }
      else if(el.closest('#tabDonaciones')){ stop(ev); buscarFicha('donaciones', el); }
    },true);
  }

  function run(){ injectStyle(); applyVersion(); observeRoots(); hydrateDownloads(); hydrateIngresoDownloads(); installSearchFix(); scheduleDataCheck(); }
  document.addEventListener('click',function(ev){
    if(ev.target && ev.target.closest && ev.target.closest('#tabDocumentosBtn,#tabIngresosBtn,#btnIngresos,#btnDocumentos,#tabComprasBtn,#tabDonacionesBtn,.main-tab,.mobile-menu-action')){ setTimeout(run,120); }
  },true);
  document.addEventListener('change',function(ev){ if(ev.target && ev.target.id==='selectedEvent'){ setTimeout(function(){ ensureModuleDataOnce('compras'); ensureModuleDataOnce('donaciones'); },850); } },true);
  ['DOMContentLoaded','load','controlevent:app-ready','controlevent:runtime-ready','controlevent:module-mounted','controlevent:event-loaded','controlevent:ticket-image-changed'].forEach(function(n){ window.addEventListener(n,function(){ setTimeout(run,120); }); });
  window.ControlEventV1047={version:VERSION, hydrateDownloads:hydrateDownloads, ensureModuleDataOnce:ensureModuleDataOnce, buscarFicha:buscarFicha};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
})();
