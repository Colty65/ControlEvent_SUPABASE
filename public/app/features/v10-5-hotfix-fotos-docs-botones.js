/* ControlEvent v11.1_prod - HOTFIX mínimo: documentos con título evento, descarga ticket en resumen y botones sin heredar rojo. */
(function(){
  'use strict';
  if(window.__ceV105HotfixFotosDocsBotones) return;
  window.__ceV105HotfixFotosDocsBotones = true;

  function text(v){ return v == null ? '' : String(v); }
  function trim(v){ return text(v).trim(); }
  function $(id){ return document.getElementById(id); }
  function safe(fn, fb){ try{ var v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } }
  function stateObj(){ return safe(function(){ return (typeof state !== 'undefined' && state) || window.state || {}; }, window.state || {}); }
  function arr(name){ var s = stateObj(); return Array.isArray(s[name]) ? s[name] : []; }
  function selectedEventId(){ var s = stateObj(); return trim(s.selectedEventId || (($('selectedEvent')||{}).value || '')); }
  function selectedEvent(){
    var id = selectedEventId();
    var ev = arr('eventos').find(function(e){ return trim(e && e.id) === id; });
    if(ev) return ev;
    var sel = $('selectedEvent');
    return sel ? { titulo: trim(sel.options && sel.selectedIndex >= 0 && sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].textContent : sel.value), situacion: '' } : null;
  }
  function isFinal(ev){ return /FINAL/i.test(trim((ev && (ev.situacion || ev.estado || ev.status)) || document.body.className || '')); }
  function fold(v){ var s = text(v); return (s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g,'') : s).toUpperCase(); }
  function stop(ev){ if(ev){ ev.preventDefault&&ev.preventDefault(); ev.stopPropagation&&ev.stopPropagation(); ev.stopImmediatePropagation&&ev.stopImmediatePropagation(); } return false; }
  function esc(v){ return text(v).replace(/[&<>"']/g,function(ch){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]; }); }
  function safeFile(base){ return trim(base || 'foto_ticket').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,'_').slice(0,90) || 'foto_ticket'; }
  function imgSrc(img){ return trim((img && (img.currentSrc || img.src || img.getAttribute('src'))) || ''); }
  function downloadSrc(src, name){
    src = trim(src); if(!src) return false;
    var fname = safeFile(name) + '.jpg';
    function fire(url){ var a = document.createElement('a'); a.href = url; a.download = fname; a.rel='noopener'; a.style.display='none'; document.body.appendChild(a); a.click(); setTimeout(function(){ try{ a.remove(); }catch(_){ } },500); }
    if(/^data:|^blob:/i.test(src)){ fire(src); return false; }
    fetch(src,{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.blob(); }).then(function(b){ var u = URL.createObjectURL(b); fire(u); setTimeout(function(){ try{URL.revokeObjectURL(u);}catch(_){ } },3000); }).catch(function(){ fire(src); });
    return false;
  }

  function injectStyle(){
    if($('ceV105HotfixFotosDocsBotonesStyle')) return;
    var st = document.createElement('style'); st.id = 'ceV105HotfixFotosDocsBotonesStyle';
    st.textContent = '\n'+
      '.ce-v105-doc-event-title{display:block!important;font-size:20px!important;margin-bottom:5px!important;font-weight:950!important;line-height:1.15!important}.ce-v105-doc-event-title.ce-final{color:#b91c1c!important}.ce-v105-doc-event-title.ce-open{color:#15803d!important}\n'+
      '.ce-v105-ticket-save{width:34px!important;height:34px!important;min-width:34px!important;min-height:34px!important;padding:0!important;border-radius:10px!important;font-size:17px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;margin-left:6px!important;vertical-align:middle!important;background:#fff!important;color:#0f172a!important;-webkit-text-fill-color:#0f172a!important;border:1px solid #cbd5e1!important;box-shadow:0 1px 3px rgba(15,23,42,.14)!important;pointer-events:auto!important;visibility:visible!important;opacity:1!important}\n'+
      '#tabCompras button.modify,#tabCompras button.danger,#comprasList button.modify,#comprasList button.danger,#tabCompras .modify.small,#tabCompras .danger.small,#comprasList .modify.small,#comprasList .danger.small{color:#fff!important;-webkit-text-fill-color:#fff!important;font-weight:900!important}\n'+
      '#tabResumen button[title="Adjuntar foto"],#summaryTiendaTicket button[title="Adjuntar foto"],#tabResumen button[aria-label="Adjuntar foto"],#summaryTiendaTicket button[aria-label="Adjuntar foto"],#tabResumen button[title="Eliminar foto"],#summaryTiendaTicket button[title="Eliminar foto"],#tabResumen button[aria-label="Eliminar foto"],#summaryTiendaTicket button[aria-label="Eliminar foto"]{font-size:0!important}\n'+
      '#tabResumen button[title="Adjuntar foto"]::before,#summaryTiendaTicket button[title="Adjuntar foto"]::before,#tabResumen button[aria-label="Adjuntar foto"]::before,#summaryTiendaTicket button[aria-label="Adjuntar foto"]::before{content:"📎";font-size:17px!important}\n'+
      '#tabResumen button[title="Eliminar foto"]::before,#summaryTiendaTicket button[title="Eliminar foto"]::before,#tabResumen button[aria-label="Eliminar foto"]::before,#summaryTiendaTicket button[aria-label="Eliminar foto"]::before{content:"🗑️";font-size:17px!important}\n';
    document.head.appendChild(st);
  }

  function patchDocumentModalTitles(){
    var ev = selectedEvent();
    var title = trim(ev && ev.titulo) || 'Evento seleccionado';
    var final = isFinal(ev);
    document.querySelectorAll('.ce-doc-target-info-v85').forEach(function(info){
      var strong = info.querySelector('strong');
      if(!strong) return;
      strong.classList.add('ce-v105-doc-event-title');
      strong.classList.toggle('ce-final', !!final);
      strong.classList.toggle('ce-open', !final);
      strong.textContent = title;
    });
  }

  function isTicketSummaryArea(el){ return !!(el && el.closest && el.closest('#tabResumen,#summaryTiendaTicket,#ceBudgetLiteTooltipV307,#ceTooltipV21')); }
  function isTicketImage(img){
    if(!img || !isTicketSummaryArea(img)) return false;
    var src = imgSrc(img); if(!src) return false;
    var ctx = fold((img.className||'')+' '+(img.alt||'')+' '+(img.title||'')+' '+(img.closest('button,a,td,div,span') && (img.closest('button,a,td,div,span').textContent||'')));
    if(/JUSTIFICANTE\s+DE\s+INGRESO|DOCUMENTO/.test(ctx)) return false;
    return /TICKET|TK\s*0*\d|CE-V465-TIP-THUMB|TICKET-THUMB/.test(ctx) || /ticket-images|storage|data:image|blob:/.test(src);
  }
  function guessTicketName(img, idx){
    var box = img.closest('.itemcard,.rowline,tr,.summary-item,.chart-row,#ceTooltipV21,#ceBudgetLiteTooltipV307,#summaryTiendaTicket') || img.parentElement;
    var txt = fold((box && box.innerText) || '');
    var m = txt.match(/TK\s*0*([0-9]{1,3})/i);
    return m ? ('ticket_TK'+String(m[1]).padStart(2,'0')) : ('ticket_'+(idx+1));
  }
  function makeTicketSaveButton(img, idx){
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'outline small ce-v105-ticket-save';
    b.textContent = '💾';
    b.title = 'Guardar foto del ticket';
    b.setAttribute('aria-label','Guardar foto del ticket');
    function go(ev){ stop(ev); return downloadSrc(imgSrc(img), guessTicketName(img,idx)); }
    ['pointerdown','touchstart','touchend','click'].forEach(function(n){ b.addEventListener(n, go, {capture:true, passive:false}); });
    return b;
  }
  function patchSummaryTicketDownloads(){
    var roots = ['tabResumen','summaryTiendaTicket','ceBudgetLiteTooltipV307','ceTooltipV21'].map($).filter(Boolean);
    roots.forEach(function(root){
      var imgs = Array.prototype.slice.call(root.querySelectorAll('img'));
      imgs.forEach(function(img,idx){
        if(!isTicketImage(img)) return;
        var host = img.closest('button,a') || img.parentElement || root;
        var parent = host.parentElement || root;
        var existing = parent.querySelector(':scope > .ce-v105-ticket-save');
        if(existing) return;
        try{ parent.insertBefore(makeTicketSaveButton(img, idx), host.nextSibling); }catch(_){ parent.appendChild(makeTicketSaveButton(img, idx)); }
      });
    });
  }

  function patchSummaryActionLabels(){
    ['tabResumen','summaryTiendaTicket','ceBudgetLiteTooltipV307','ceTooltipV21'].forEach(function(id){
      var root=$(id); if(!root) return;
      Array.prototype.slice.call(root.querySelectorAll('button')).forEach(function(b){
        if(b.classList && b.classList.contains('ce-v105-ticket-save')) return;
        var lab = fold((b.textContent||'')+' '+(b.title||'')+' '+(b.getAttribute('aria-label')||''));
        if(/ADJUNTAR|INSERTAR FOTO|SUBIR FOTO|CAMBIAR FOTO/.test(lab) && !/JUSTIFICANTE/.test(lab)){ b.textContent='📎'; b.title='Adjuntar foto'; b.setAttribute('aria-label','Adjuntar foto'); }
        if(/ELIMINAR FOTO/.test(lab) || (/^\s*ELIMINAR\s*$/.test(fold(b.textContent||'')) && /FOTO|TICKET/.test(lab))){ b.textContent='🗑️'; b.title='Eliminar foto'; b.setAttribute('aria-label','Eliminar foto'); }
      });
    });
  }

  function run(){ injectStyle(); patchDocumentModalTitles(); patchSummaryActionLabels(); patchSummaryTicketDownloads(); }
  var timer=0;
  function schedule(){ clearTimeout(timer); timer=setTimeout(run,120); }
  ['DOMContentLoaded','load','controlevent:app-ready','controlevent:runtime-ready','controlevent:module-mounted','controlevent:event-loaded','controlevent:ticket-image-changed','hashchange'].forEach(function(n){ window.addEventListener(n, schedule); });
  document.addEventListener('click',function(ev){
    if(ev.target && ev.target.closest && ev.target.closest('#tabResumenBtn,#tabDocumentosBtn,.mobile-menu-action,[href^="#ceDocViewV85_"],.ce-doc-thumb-link-v85,img,button')) schedule();
  }, true);
  document.addEventListener('change',function(ev){ if(ev.target && ev.target.id === 'selectedEvent') setTimeout(schedule,250); }, true);
  try{
    new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  }catch(_){ }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, {once:true}); else run();
  window.ControlEventV105HotfixFotosDocsBotones = { run: run };
})();
