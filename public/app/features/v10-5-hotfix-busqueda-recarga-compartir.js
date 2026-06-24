/* ControlEvent v15_prod - HOTFIX mínimo: búsqueda finalizados, recarga puntual COMPRAS/DONACIONES y ayuda compartir pantalla. */
(function(){
  'use strict';
  if(window.__ceV105HotfixBusquedaRecargaCompartir) return;
  window.__ceV105HotfixBusquedaRecargaCompartir = true;

  function text(v){ return v == null ? '' : String(v); }
  function trim(v){ return text(v).trim(); }
  function $(id){ return document.getElementById(id); }
  function safe(fn, fb){ try{ var v=fn(); return v===undefined?fb:v; }catch(_){ return fb; } }
  function stateObj(){ return safe(function(){ return (typeof state !== 'undefined' && state) || window.state || {}; }, window.state || {}); }
  function arr(name){ var s=stateObj(); return Array.isArray(s[name]) ? s[name] : []; }
  function selectedEventId(){ var s=stateObj(); return trim(s.selectedEventId || (($('selectedEvent')||{}).value || '')); }
  function fold(v){ var s=text(v); return (s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g,'') : s).toUpperCase(); }
  function stop(ev){ if(ev){ ev.preventDefault&&ev.preventDefault(); ev.stopPropagation&&ev.stopPropagation(); ev.stopImmediatePropagation&&ev.stopImmediatePropagation(); } return false; }
  function visible(el){ return !!(el && el.getClientRects && el.getClientRects().length); }
  function selectedText(sel){ try{ return (sel.options[sel.selectedIndex] && sel.options[sel.selectedIndex].textContent) || sel.value || ''; }catch(_){ return (sel && sel.value) || ''; } }
  function nameById(list, id){ id=trim(id); if(!id) return ''; var r=arr(list).find(function(x){ return trim(x && x.id)===id; }); return r ? trim(r.nombre || r.titulo || r.label || r.id) : ''; }
  function productName(id){ return nameById('productos', id); }
  function personaName(id){ return nameById('personas', id); }
  function tiendaName(id){ return nameById('tiendas', id); }
  function isDonationTicket(v){ return /^DONADO/i.test(trim(v)); }

  function injectStyle(){
    if($('ceV105HotfixSearchStyle')) return;
    var st=document.createElement('style'); st.id='ceV105HotfixSearchStyle';
    st.textContent='\n'+
      '#tabCompras,#tabDonaciones,#comprasList,#donacionesList,#tabCompras .maint-search,#tabDonaciones .maint-search,#tabCompras .ce-v434-search,#tabDonaciones .ce-v434-search,#tabCompras .ce-v413-search,#tabDonaciones .ce-v413-search{pointer-events:auto!important}\n'+
      '#comprasSearchInput,#donacionesSearchInput,#comprasSearchInputBtn,#donacionesSearchInputBtn{pointer-events:auto!important;opacity:1!important;filter:none!important;background:#fff!important;color:#0f172a!important;visibility:visible!important}\n'+
      'body[class*="final"], body.ce-finalizado-consulta{ }\n'+
      '.ce-search-found-v105hf{outline:5px solid #dc2626!important;box-shadow:0 0 0 8px rgba(220,38,38,.20)!important;border-color:#dc2626!important;font-weight:950!important;scroll-margin:140px!important}.ce-search-found-v105hf *{font-weight:inherit!important}\n'+
      '#ceShareScreenPanel .ce-share-warning{margin-top:8px!important;padding:10px!important;border-radius:10px!important;background:#fff7ed!important;border:1px solid #fed7aa!important;color:#7c2d12!important;font-weight:800!important;line-height:1.35!important}\n';
    document.head.appendChild(st);
  }

  function searchContainerFromTarget(t){
    if(!t || !t.closest) return null;
    var c=t.closest('#comprasList,#donacionesList,#tabCompras,#tabDonaciones,.maint-search,.ce-v434-search,.ce-v413-search');
    if(t.closest('#tabCompras') || t.closest('#comprasList') || t.id==='comprasSearchInput' || t.id==='comprasSearchInputBtn') return {kind:'compras', list:$('comprasList'), input:$('comprasSearchInput')};
    if(t.closest('#tabDonaciones') || t.closest('#donacionesList') || t.id==='donacionesSearchInput' || t.id==='donacionesSearchInputBtn') return {kind:'donaciones', list:$('donacionesList'), input:$('donacionesSearchInput')};
    if(c){
      var inp=c.querySelector && c.querySelector('input[type="search"],input[id*="SearchInput"]');
      if(inp && /donaciones/i.test(inp.id||'')) return {kind:'donaciones', list:$('donacionesList'), input:inp};
      if(inp && /compras/i.test(inp.id||'')) return {kind:'compras', list:$('comprasList'), input:inp};
    }
    return null;
  }
  function isBuscarButton(t){
    if(!t || !t.closest) return false;
    var b=t.closest('button,input[type="button"],input[type="submit"]');
    if(!b) return false;
    if(b.id==='comprasSearchInputBtn' || b.id==='donacionesSearchInputBtn') return true;
    var lab=fold((b.textContent||'')+' '+(b.value||'')+' '+(b.title||'')+' '+(b.getAttribute('aria-label')||''));
    return /BUSCAR/.test(lab) && !!searchContainerFromTarget(b);
  }
  function cleanCloneText(card){
    var clone=card.cloneNode(true);
    Array.prototype.slice.call(clone.querySelectorAll('.maint-search,.ce-v434-search,.ce-v413-search,#comprasSearchInput,#donacionesSearchInput,#comprasSearchInputBtn,#donacionesSearchInputBtn,button')).forEach(function(x){ try{x.remove();}catch(_){ } });
    return clone.innerText || clone.textContent || '';
  }
  function rowIdFromCard(card){
    return safe(function(){
      return trim(card.dataset.id || card.getAttribute('data-id') || (card.querySelector('[data-id]') && card.querySelector('[data-id]').getAttribute('data-id')) || '');
    }, '');
  }
  function rowText(card, kind){
    var parts=[cleanCloneText(card)];
    safe(function(){ card.querySelectorAll('select').forEach(function(s){ parts.push(selectedText(s), s.value); }); });
    safe(function(){ card.querySelectorAll('input,textarea').forEach(function(i){ if(!i.closest('.maint-search,.ce-v434-search,.ce-v413-search')) parts.push(i.value); }); });
    var rid=rowIdFromCard(card);
    if(rid){
      arr('compras').filter(function(r){ return trim(r.id)===rid; }).forEach(function(r){
        parts.push(r.id, r.ticketDonacion, r.ticket_donacion, r.ticket, r.unidades, r.precio, r.importe, r.valor,
          productName(r.productoId || r.producto_id), tiendaName(r.tiendaId || r.tienda_id), personaName(r.responsableId || r.responsable_id), personaName(r.donanteId || r.personaId || r.persona_id), r.donorRef);
      });
    }
    return fold(parts.join(' '));
  }
  function cardsIn(list, kind){
    if(!list) return [];
    var nodes=Array.prototype.slice.call(list.querySelectorAll('.itemcard'));
    if(!nodes.length) nodes=Array.prototype.slice.call(list.querySelectorAll('.rowline.compra,.rowline,.card'));
    return nodes.filter(function(c){
      if(!c || c.closest('.maint-search,.ce-v434-search,.ce-v413-search')) return false;
      if(c.querySelector && c.querySelector('#comprasSearchInput,#donacionesSearchInput,#comprasSearchInputBtn,#donacionesSearchInputBtn')) return false;
      var t=rowText(c, kind);
      if(!t || /^\s*BUSCAR\s+(COMPRA|DONACION)/.test(t)) return false;
      return true;
    });
  }
  function tokensOf(q){ return fold(q).split(/\s+/).map(function(t){ return t.replace(/[^A-Z0-9]+/g,''); }).filter(function(t){ return t.length>0; }); }
  function matches(hay, toks){ return toks.every(function(t){ return hay.indexOf(t)>=0; }); }
  function highlight(card){
    document.querySelectorAll('.ce-search-found-v104,.ce-search-found-v105hf').forEach(function(x){ x.classList.remove('ce-search-found-v104','ce-search-found-v105hf'); });
    card.classList.add('ce-search-found-v105hf');
    try{ card.scrollIntoView({behavior:'smooth',block:'center'}); }catch(_){ try{card.scrollIntoView();}catch(__){} }
    setTimeout(function(){ try{ card.classList.remove('ce-search-found-v105hf'); }catch(_){ } }, 9000);
  }
  function rowHaystackFromState(r){
    return fold([
      r && r.id, r && r.ticketDonacion, r && r.ticket_donacion, r && r.ticket,
      r && r.unidades, r && r.precio, r && r.importe, r && r.valor, r && r.total,
      productName((r&&r.productoId)||(r&&r.producto_id)),
      tiendaName((r&&r.tiendaId)||(r&&r.tienda_id)),
      personaName((r&&r.responsableId)||(r&&r.responsable_id)),
      personaName((r&&r.donanteId)||(r&&r.personaId)||(r&&r.persona_id)),
      donorLabelFromRow(r), r && r.donorRef, r && r.observaciones, r && r.notas, r && r.fecha
    ].join(' '));
  }
  function donorLabelFromRow(r){
    var ref=trim(r && (r.donorRef || r.donor_ref));
    if(!ref) return '';
    if(/^P:/i.test(ref)) return personaName(ref.slice(2));
    if(/^T:/i.test(ref)) return tiendaName(ref.slice(2));
    return ref;
  }
  function stateRowsForKind(kind){
    var ev=selectedEventId();
    return arr('compras').filter(function(r){
      if(ev && trim(r.eventId || r.event_id)!==ev) return false;
      var don=isDonationTicket(r.ticketDonacion || r.ticket_donacion || r.ticket || '');
      return kind==='donaciones' ? don : !don;
    });
  }
  function findCardForRow(kind, row){
    var list=$(kind==='donaciones'?'donacionesList':'comprasList');
    var id=trim(row && row.id);
    var cards=cardsIn(list, kind);
    if(id){
      var direct=cards.find(function(c){ return rowIdFromCard(c)===id; });
      if(direct) return direct;
      var safe=(window.CSS&&CSS.escape)?CSS.escape(id):id.replace(/"/g,'\\"');
      var sel=document.querySelector((kind==='donaciones'?'#donacionesList':'#comprasList') + ' [data-id="'+safe+'"]');
      if(sel && sel.closest) return sel.closest('.itemcard,.rowline,.card');
      var byDomId=$(kind==='donaciones' ? 'donacionRow_'+id : 'compraRow_'+id);
      if(byDomId) return byDomId.closest?.('.itemcard,.rowline,.card') || byDomId;
    }
    var rowHay=rowHaystackFromState(row);
    var pname=fold(productName(row && (row.productoId || row.producto_id)));
    return cards.find(function(c){
      var txt=rowText(c, kind);
      return (id && txt.indexOf(fold(id))>=0) || (pname && txt.indexOf(pname)>=0 && matches(rowHay, tokensOf(txt).slice(0,3)));
    }) || null;
  }
  function showSearchNotice(message, silent){
    if(silent) return;
    try{ alert(message); }catch(_){ }
  }
  function highlightStateHit(kind, row, silent){
    var card=findCardForRow(kind, row);
    if(card){ highlight(card); return true; }
    renderKind(kind);
    setTimeout(function(){
      var late=findCardForRow(kind, row);
      if(late) highlight(late);
      else showSearchNotice('Se ha encontrado el registro en los datos, pero no se ha podido localizar su ficha visible. Cambia de pestaña y vuelve a entrar.', silent);
    }, 140);
    return true;
  }
  function runSearch(kind, opts){
    opts = opts || {};
    kind = kind || 'compras';
    var input=$(kind==='donaciones'?'donacionesSearchInput':'comprasSearchInput');
    var list=$(kind==='donaciones'?'donacionesList':'comprasList');
    if(!input || !list) return false;
    var toks=tokensOf(input.value || '');
    if(!toks.length) return false;

    // Corrección móvil/iPad: la búsqueda se decide SIEMPRE contra el array real de datos,
    // nunca contra la primera ficha visible del DOM. El DOM solo se usa después para saltar al ID estable.
    var rows=stateRowsForKind(kind);
    var stateHit=rows.find(function(r){ return matches(rowHaystackFromState(r), toks); });
    if(stateHit){ highlightStateHit(kind, stateHit, !!opts.silent); try{ input.focus(); }catch(_){ } return false; }

    // Último recurso visual: solo si no hay coincidencia en el estado local.
    var cards=cardsIn(list, kind);
    var found=cards.find(function(c){ return matches(rowText(c, kind), toks); });
    if(found){ highlight(found); try{ input.focus(); }catch(_){ } return false; }

    showSearchNotice('No se ha encontrado ningún registro con ese texto.', !!opts.silent);
    try{ input.focus(); }catch(_){ }
    return false;
  }
  function handleSearch(ev){
    var t=ev.target;
    if(isBuscarButton(t)){
      var ctx=searchContainerFromTarget(t); if(!ctx) return;
      stop(ev); runSearch(ctx.kind); return false;
    }
    if(ev.type==='keydown'){
      var inp=t && t.closest && t.closest('#comprasSearchInput,#donacionesSearchInput,#tabCompras input[type="search"],#tabDonaciones input[type="search"]');
      if(inp && ev.key==='Enter'){
        var ctx2=searchContainerFromTarget(inp); if(!ctx2) return;
        stop(ev); runSearch(ctx2.kind); return false;
      }
    }
  }
  function enableSearch(){
    ['comprasSearchInput','donacionesSearchInput','comprasSearchInputBtn','donacionesSearchInputBtn'].forEach(function(id){
      var el=$(id); if(!el) return;
      el.disabled=false; el.readOnly=false; el.removeAttribute('disabled'); el.removeAttribute('readonly'); el.removeAttribute('aria-disabled');
      el.classList.add('ce-mapa-readonly-allowed','mobile-menu-action');
      el.style.setProperty('pointer-events','auto','important'); el.style.setProperty('opacity','1','important'); el.style.setProperty('visibility','visible','important');
      if(!el.__ceV105hfInputSearchBound){
        el.__ceV105hfInputSearchBound=true;
        el.addEventListener('input', function(){
          var kind = id==='donacionesSearchInput' ? 'donaciones' : 'compras';
          clearTimeout(el.__ceV105hfSearchTimer);
          el.__ceV105hfSearchTimer=setTimeout(function(){
            if(tokensOf(el.value||'').join('').length >= 3) runSearch(kind, {silent:true, fromInput:true});
          }, 420);
        }, {passive:true});
      }
    });
    ['comprasList','donacionesList','tabCompras','tabDonaciones'].forEach(function(id){
      var root=$(id); if(!root) return;
      root.style.setProperty('pointer-events','auto','important');
      Array.prototype.slice.call(root.querySelectorAll('.maint-search,.ce-v434-search,.ce-v413-search')).forEach(function(box){
        box.style.setProperty('pointer-events','auto','important');
        box.style.setProperty('opacity','1','important');
        Array.prototype.slice.call(box.querySelectorAll('input,button')).forEach(function(el){
          el.disabled=false; el.readOnly=false; el.removeAttribute('disabled'); el.removeAttribute('readonly'); el.removeAttribute('aria-disabled');
          el.style.setProperty('pointer-events','auto','important'); el.style.setProperty('opacity','1','important'); el.style.setProperty('visibility','visible','important');
        });
      });
    });
  }

  var hydrateRunning={};
  var hydrateRecent={};
  function currentTabKind(){
    if($('tabCompras') && !$('tabCompras').classList.contains('hidden')) return 'compras';
    if($('tabDonaciones') && !$('tabDonaciones').classList.contains('hidden')) return 'donaciones';
    return '';
  }
  function listLooksEmpty(kind){
    var list=$(kind==='donaciones'?'donacionesList':'comprasList');
    if(!list) return false;
    if(list.querySelector('.itemcard,.rowline.compra')) return false;
    var t=fold(list.innerText || list.textContent || '');
    return !t || /TODAVIA NO HAY|NO HAY|SIN DATOS/.test(t);
  }
  function renderKind(kind){
    try{
      if(kind==='compras' && typeof window.renderCompras==='function') window.renderCompras();
      else if(kind==='donaciones' && typeof window.renderDonaciones==='function') window.renderDonaciones();
      else if(typeof window.render==='function') window.render();
    }catch(_){ }
    setTimeout(enableSearch,40);
  }
  function ensureTabData(kind, reason){
    var ev=selectedEventId(); if(!ev || !kind) return;
    var key=ev+'|'+kind;
    if(hydrateRunning[key]) return;
    var now=Date.now();
    if(hydrateRecent[key] && now-hydrateRecent[key] < 12000) return;
    if(!listLooksEmpty(kind)) return;
    if(typeof window.__ceLoadSelectedEventStateFix48 !== 'function') return;
    hydrateRunning[key]=true; hydrateRecent[key]=now;
    Promise.resolve(window.__ceLoadSelectedEventStateFix48(ev)).then(function(){ renderKind(kind); }).catch(function(err){ console.warn('[CE v10_5 hotfix] No se pudo recargar '+kind+' una sola vez:', reason, err); }).finally(function(){ hydrateRunning[key]=false; });
  }
  function scheduleEnsure(kind, delay, reason){ setTimeout(function(){ enableSearch(); ensureTabData(kind || currentTabKind(), reason); }, delay||250); }

  function patchSharePanelText(){
    var p=$('ceShareScreenPanel'); if(!p) return;
    var help=p.querySelector('.ce-share-help');
    if(help && !help.__ceV105hfShareText){
      help.__ceV105hfShareText=true;
      help.innerHTML='<b>Para duplicar en una TV/proyector sin HDMI:</b><br>'+ 
        '<b>Windows/PC:</b> 1) En la TV activa “Duplicar pantalla / Screen Share / Miracast” si existe. 2) Pulsa aquí “Pantalla completa”. 3) Pulsa <b>Win+K</b> y elige la TV. Si la lista sale vacía, Windows no está encontrando ninguna pantalla inalámbrica compatible; la app no puede forzar que aparezca.<br>'+ 
        '<b>iPad/iPhone:</b> Centro de control → <b>Duplicar pantalla / AirPlay</b> → elige Apple TV o TV compatible.<br>'+ 
        '<b>Android:</b> Ajustes rápidos → <b>Enviar pantalla / Smart View / Cast</b>.';
    }
    var box=p.querySelector('.box');
    if(box && !p.querySelector('.ce-share-warning')){
      var div=document.createElement('div'); div.className='ce-share-warning';
      div.textContent='Si al pulsar Win+K aparece la ventana “Transmitir” sin pantallas disponibles, no es fallo de ControlEvent: el PC no ve ninguna TV compatible en la red o la TV no tiene activado el modo de recepción inalámbrica.';
      var status=p.querySelector('#ceShareStatus');
      if(status) status.parentNode.insertBefore(div, status.nextSibling); else box.appendChild(div);
    }
  }

  function tick(){ injectStyle(); enableSearch(); patchSharePanelText(); }
  ['pointerdown','mousedown','touchstart','click'].forEach(function(evt){ window.addEventListener(evt, handleSearch, {capture:true, passive:false}); document.addEventListener(evt, handleSearch, {capture:true, passive:false}); });
  window.addEventListener('keydown', handleSearch, true); document.addEventListener('keydown', handleSearch, true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted','controlevent:event-ready','controlevent:event-loaded'].forEach(function(evt){ window.addEventListener(evt,function(){ setTimeout(tick,80); scheduleEnsure(currentTabKind(),450,evt); }); });
  document.addEventListener('click',function(ev){
    var t=ev.target && ev.target.closest && ev.target.closest('#tabComprasBtn,#tabDonacionesBtn,.mobile-menu-action[data-target="tabComprasBtn"],.mobile-menu-action[data-target="tabDonacionesBtn"],#ceShareScreenBtn,[data-ce-share-full]');
    if(!t) return;
    if((t.id==='tabComprasBtn') || (t.dataset && t.dataset.target==='tabComprasBtn')) scheduleEnsure('compras',500,'tabCompras');
    if((t.id==='tabDonacionesBtn') || (t.dataset && t.dataset.target==='tabDonacionesBtn')) scheduleEnsure('donaciones',500,'tabDonaciones');
    setTimeout(patchSharePanelText,150);
  }, true);
  document.addEventListener('change',function(ev){ if(ev.target && ev.target.id==='selectedEvent'){ setTimeout(function(){ hydrateRecent={}; scheduleEnsure(currentTabKind(),800,'selectedEvent'); },900); } }, true);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',tick,{once:true}); else tick();

  window.ControlEventV105Hotfix={runSearch:runSearch, ensureTabData:ensureTabData, patchSharePanelText:patchSharePanelText};
})();
