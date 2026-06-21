/* ControlEvent v11_3_3_prod - ajustes finos: candidatos Ticket IA, descargas INGRESOS, recarga estable y duplicar pantalla claro. */
(function(){
  'use strict';
  if(window.__ceV1041AppFixes) return; window.__ceV1041AppFixes=true;
  var VERSION='v11_3_3_prod';
  function text(v){ return v==null?'':String(v); }
  function trim(v){ return text(v).trim(); }
  function $(id){ return document.getElementById(id); }
  function safe(fn,fb){ try{ var v=fn(); return v===undefined?fb:v; }catch(_){ return fb; } }
  function stateObj(){ return safe(function(){return (typeof state!=='undefined'&&state)||window.state||{};}, window.state||{}); }
  function arr(name){ var s=stateObj(); return Array.isArray(s[name]) ? s[name] : []; }
  function fold(v){ var s=text(v); try{ s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,''); }catch(_){} return s.toUpperCase(); }
  function norm(v){ return fold(v).replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim(); }
  function compact(v){ return norm(v).replace(/\s+/g,''); }
  function money(v){
    if(typeof v==='number') return isFinite(v)?v:0;
    var s=text(v).replace(/€/g,'').replace(/\s/g,'').trim(); if(!s) return 0;
    var c=s.lastIndexOf(','), d=s.lastIndexOf('.');
    if(c!==-1 && d!==-1) s=c>d ? s.replace(/\./g,'').replace(',','.') : s.replace(/,/g,'');
    else if(c!==-1) s=s.replace(/\./g,'').replace(',','.');
    else s=s.replace(/,/g,'');
    var n=Number(s); return isFinite(n)?n:0;
  }
  function selectedEventId(){ var s=stateObj(); return trim(s.selectedEventId || (($('selectedEvent')||{}).value||'')); }
  function stop(ev){ if(ev){ ev.preventDefault&&ev.preventDefault(); ev.stopPropagation&&ev.stopPropagation(); ev.stopImmediatePropagation&&ev.stopImmediatePropagation(); } return false; }

  function injectStyle(){
    if($('ceV1041Style')) return;
    var st=document.createElement('style'); st.id='ceV1041Style';
    st.textContent='\n'+
      '.ce-ai-pending-row.ce-ai-pending-candidate,.ce-ai-pending-row.ce-ai-pending-candidate-v1041{background:#fff1f2!important;border:2px solid #dc2626!important;border-radius:8px!important;padding-left:4px!important;padding-right:4px!important}.ce-ai-pending-row.ce-ai-pending-candidate strong,.ce-ai-pending-row.ce-ai-pending-candidate-v1041 strong{color:#b91c1c!important;font-weight:950!important}.ce-ai-pending-row.ce-ai-pending-candidate-v1041::after{content:"posible";font-weight:950;color:#b91c1c;font-size:10px;text-transform:uppercase}\n'+
      '#collabList .ce-ticket-download-v95,#tabIngresos .ce-ticket-download-v95{display:none!important}\n'+
      '.ce-v1041-ingreso-download{width:32px!important;height:30px!important;min-width:32px!important;min-height:30px!important;padding:1px!important;border-radius:8px!important;font-size:16px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;margin-left:4px!important}\n'+
      '#ceShareScreenBtn{display:none!important;visibility:hidden!important;pointer-events:none!important}\n'+
      '#ceShareScreenBtn1041{font-size:16px!important;width:32px!important;height:30px!important;min-width:32px!important;min-height:30px!important;padding:2px!important;border-radius:9px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;touch-action:manipulation!important}\n'+
      '#ceShareScreenPanel1041{position:fixed!important;inset:0!important;z-index:10000080!important;background:rgba(15,23,42,.72)!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:12px!important}#ceShareScreenPanel1041 .box{background:#fff!important;border:2px solid #0ea5e9!important;border-radius:16px!important;max-width:720px!important;width:96vw!important;padding:16px!important;box-shadow:0 24px 80px rgba(0,0,0,.35)!important}#ceShareScreenPanel1041 .head{display:flex!important;justify-content:space-between!important;align-items:center!important;gap:10px!important;margin-bottom:10px!important;font-weight:950!important;color:#075985!important}.ce-share1041-help{font-size:14px!important;line-height:1.42!important;color:#334155!important;background:#f8fafc!important;border:1px solid #e2e8f0!important;border-radius:12px!important;padding:12px!important}.ce-share1041-help b{color:#0f172a!important}.ce-share1041-actions{display:grid!important;grid-template-columns:1fr 1fr 1fr!important;gap:8px!important;margin:12px 0!important}.ce-share1041-actions button{min-height:44px!important;font-weight:950!important}.ce-share1041-status{margin-top:10px!important;border:1px solid #bae6fd!important;background:#f0f9ff!important;color:#075985!important;border-radius:10px!important;padding:8px!important;font-weight:850!important}@media(max-width:680px){.ce-share1041-actions{grid-template-columns:1fr!important}}\n';
    document.head.appendChild(st);
  }

  function applyVersion(){
    try{ document.title='ControlEvent '+VERSION; }catch(_){}
    var stack=document.querySelector('.appname-stack');
    if(stack){
      var first=stack.querySelector(':scope > span,.ce-v104-brand-mini,.ce-v1041-brand-mini');
      if(first){ first.className='ce-v1041-brand-mini ce-v104-brand-mini'; first.innerHTML='<img src="./assets/icons/controlevent-welcome-v44.png" alt="CE"><span>'+VERSION+'</span>'; }
    }
  }

  // --- Ticket IA: marcar candidatos por similitud real, no solo igualdad literal ---
  var STOP_TOKENS={DE:1,DEL:1,LA:1,EL:1,LOS:1,LAS:1,UN:1,UNA:1,UD:1,UDS:1,KG:1,KGS:1,GR:1,G:1,ML:1,L:1,LITRO:1,LITROS:1,BOLSA:1,BOTE:1,PACK:1,PAQ:1,PK:1,CAJA:1,DOCE:1,DOCENA:1,MEDIA:1,MEDIO:1,PARA:1,CON:1,SIN:1};
  function tokens(v){ return norm(v).split(/\s+/).filter(function(t){ return t.length>=4 && !STOP_TOKENS[t] && !/^\d+$/.test(t); }); }
  function levenshtein(a,b){ a=compact(a); b=compact(b); if(!a||!b) return 99; var m=a.length,n=b.length,dp=[],i,j; for(i=0;i<=m;i++){ dp[i]=[i]; } for(j=1;j<=n;j++) dp[0][j]=j; for(i=1;i<=m;i++){ for(j=1;j<=n;j++){ var c=a.charAt(i-1)===b.charAt(j-1)?0:1; dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+c); } } return dp[m][n]; }
  function nameScore(a,b){
    var na=norm(a), nb=norm(b), ca=compact(a), cb=compact(b); if(!na||!nb) return 0; if(na===nb||ca===cb) return 100;
    if(ca.length>=4 && cb.indexOf(ca)>=0) return 92; if(cb.length>=4 && ca.indexOf(cb)>=0) return 90;
    var ta=tokens(a), tb=tokens(b), common=0;
    ta.forEach(function(x){ if(tb.some(function(y){ return x===y || x.indexOf(y)===0 || y.indexOf(x)===0; })) common++; });
    var tokenScore=ta.length?Math.round((common/ta.length)*88):0;
    var d=levenshtein(a,b), mx=Math.max(ca.length,cb.length)||1;
    return Math.max(tokenScore, Math.round((1-(d/mx))*100));
  }
  function closeMoney(a,b){ a=money(a); b=money(b); return a>0 && b>0 && Math.abs(a-b)<=0.08; }
  function aiRowsFromDom(){
    var out=[];
    document.querySelectorAll('#ceAiRows tr').forEach(function(tr){
      var prod=trim((tr.querySelector('[data-ce-ai-field="descripcion"]')||tr.querySelector('input[list="ceAiProducts"]')||{}).value || '');
      var units=money((tr.querySelector('[data-ce-ai-field="unidades"]')||{}).value || 1) || 1;
      var price=money((tr.querySelector('[data-ce-ai-field="precio"]')||{}).value || 0);
      var imp=money((tr.querySelector('[data-ce-ai-field="importe"]')||{}).value || 0);
      if(prod) out.push({prod:prod,units:units,price:price,total:imp || price*units});
    });
    return out;
  }
  function pendingInfoFromRow(row){
    var prod=trim((row.querySelector('strong')||{}).textContent||'');
    var txt=text(row.textContent||'');
    var unit=0,total=0,m;
    m=txt.match(/x\s*([0-9]+(?:[\.,][0-9]{1,3})?)/i); if(m) unit=money(m[1]);
    var nums=txt.match(/[0-9]+(?:[\.,][0-9]{1,3})?\s*€/g); if(nums&&nums.length) total=money(nums[nums.length-1]);
    return {prod:prod,unit:unit,total:total};
  }
  function pendingCandidate(p, ai){
    for(var i=0;i<ai.length;i++){
      var a=ai[i], sc=nameScore(p.prod,a.prod);
      if(sc>=72) return true;
      var common=tokens(p.prod).some(function(x){ return tokens(a.prod).some(function(y){ return x===y || x.indexOf(y)===0 || y.indexOf(x)===0; }); });
      if(common && (closeMoney(p.unit,a.price) || closeMoney(p.total,a.total) || closeMoney(p.total,a.price))) return true;
    }
    return false;
  }
  function markPendingCandidates(){
    var box=$('ceAiPendingList'); if(!box) return;
    var ai=aiRowsFromDom();
    box.querySelectorAll('.ce-ai-pending-row').forEach(function(row){
      var p=pendingInfoFromRow(row), cand=pendingCandidate(p,ai);
      row.classList.toggle('ce-ai-pending-candidate-v1041', !!cand);
      if(cand) row.title='Posible compra ya realizada en este ticket. Márcala solo si quieres eliminarla.';
    });
  }

  // --- INGRESOS: evitar botones de descarga duplicados y dejar solo uno por justificante ---
  function safeDownloadName(base){ return trim(base||'foto').replace(/[\/:*?"<>|]+/g,' ').replace(/\s+/g,'_').slice(0,90)||'foto'; }
  function downloadSrc(src,name){
    src=trim(src); if(!src) return false;
    var fname=safeDownloadName(name)+'.jpg';
    function fire(url){ var a=document.createElement('a'); a.href=url; a.download=fname; a.rel='noopener'; a.style.display='none'; document.body.appendChild(a); a.click(); setTimeout(function(){a.remove();},500); }
    if(/^data:|^blob:/i.test(src)){ fire(src); return false; }
    fetch(src,{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.blob(); }).then(function(b){ var u=URL.createObjectURL(b); fire(u); setTimeout(function(){URL.revokeObjectURL(u);},3000); }).catch(function(){ fire(src); });
    return false;
  }
  function isIngresoImg(img){ var src=trim(img.currentSrc||img.src||''); return !!(src && (/^data:image\//i.test(src) || /ticket-images|ingresos|justificante|receipt/i.test(src) || img.className)); }
  function hydrateIngresoDownloads1041(){
    var root=$('tabIngresos')||$('collabList'); if(!root) return;
    root.querySelectorAll('.ce-ticket-download-v95').forEach(function(b){ b.remove(); });
    var cards=root.querySelectorAll('.itemcard,.rowline,.card,.ce-v509-receipt-field,.ce-v504-receipt-strip,.ce-v502-receipt-strip,.ce-v465-receipt-strip');
    cards.forEach(function(card,idx){
      var imgs=Array.prototype.slice.call(card.querySelectorAll('img')).filter(isIngresoImg);
      var buttons=Array.prototype.slice.call(card.querySelectorAll('.ce-v104-ingreso-download,.ce-v1041-ingreso-download'));
      if(!imgs.length){ buttons.forEach(function(b){ b.remove(); }); return; }
      var first=buttons[0]; buttons.slice(1).forEach(function(b){ b.remove(); });
      if(!first){
        first=document.createElement('button'); first.type='button'; first.className='outline small ce-v1041-ingreso-download'; first.title='Descargar justificante'; first.setAttribute('aria-label','Descargar justificante'); first.textContent='⬇️';
        var anchor=imgs[0]; if(anchor.parentNode) anchor.parentNode.insertBefore(first, anchor.nextSibling); else card.appendChild(first);
      }else{
        first.classList.add('ce-v1041-ingreso-download');
      }
      first.onclick=function(ev){ stop(ev); var img=imgs[0]; return downloadSrc(img && (img.currentSrc||img.src), 'justificante_ingreso_'+(idx+1)); };
    });
    // Limpia cadenas de botones insertadas justo después de una miniatura: deja solo el primero.
    root.querySelectorAll('.ce-v104-ingreso-download,.ce-v1041-ingreso-download').forEach(function(btn){
      var prev=btn.previousElementSibling;
      if(prev && prev.matches && prev.matches('button,.ce-v104-ingreso-download,.ce-v1041-ingreso-download,.ce-ticket-download-v95')) btn.remove();
    });
  }
  function handleIngresoDownload(ev){ var btn=ev.target&&ev.target.closest&&ev.target.closest('.ce-v1041-ingreso-download'); if(!btn) return; stop(ev); var card=btn.closest('.itemcard,.rowline,.card,.ce-v509-receipt-field,.ce-v504-receipt-strip,.ce-v502-receipt-strip,.ce-v465-receipt-strip')||btn.parentElement; var img=card&&Array.prototype.slice.call(card.querySelectorAll('img')).filter(isIngresoImg)[0]; if(img) downloadSrc(img.currentSrc||img.src,'justificante_ingreso'); return false; }

  // --- Carga estable por evento: caché por evento y recarga tras cambios de opción ---
  var lastGoodByEvent=Object.create(null), loadingEvent='';
  function snapshotGood(){
    var ev=selectedEventId(); if(!ev) return;
    var s=stateObj(), snap=lastGoodByEvent[ev] || (lastGoodByEvent[ev]={});
    ['compras','colaboradores','eventDocuments'].forEach(function(k){ if(Array.isArray(s[k]) && s[k].length) snap[k]=s[k].slice(); });
    ['ticketImages','ticketImageRefs'].forEach(function(k){ if(s[k] && typeof s[k]==='object' && Object.keys(s[k]).some(function(x){return x.indexOf(ev+'|')===0;})) snap[k]=Object.assign({},s[k]); });
  }
  function restoreIfBlank(){
    var ev=selectedEventId(); if(!ev) return false;
    var s=stateObj(), snap=lastGoodByEvent[ev]; if(!snap) return false;
    var restored=false;
    ['compras','colaboradores','eventDocuments'].forEach(function(k){ if((!Array.isArray(s[k]) || !s[k].length) && Array.isArray(snap[k]) && snap[k].length){ s[k]=snap[k].slice(); restored=true; } });
    ['ticketImages','ticketImageRefs'].forEach(function(k){ if((!s[k] || !Object.keys(s[k]).length) && snap[k]){ s[k]=Object.assign({},snap[k]); restored=true; } });
    if(restored){ try{ window.state=s; }catch(_){} try{ if(typeof render==='function') render(); }catch(_){} }
    return restored;
  }
  function forceLoadEventSoon(delay){
    setTimeout(function(){
      var ev=selectedEventId(); if(!ev || loadingEvent===ev) return;
      snapshotGood(); restoreIfBlank();
      if(typeof window.__ceLoadSelectedEventStateFix48!=='function') return;
      loadingEvent=ev;
      window.__ceLoadSelectedEventStateFix48(ev).then(function(){ snapshotGood(); try{ if(typeof render==='function') render(); }catch(_){} }).catch(function(){ restoreIfBlank(); }).finally(function(){ loadingEvent=''; });
    }, delay||160);
  }

  // --- Compartir pantalla: panel claro, sin botones que abren el diálogo equivocado de Chrome ---
  function ensureShareButton1041(){
    var stack=document.querySelector('.appname-stack'); if(!stack) return;
    var actions=stack.querySelector('.user-actions')||stack;
    var old=$('ceShareScreenBtn'); if(old) old.style.display='none';
    var btn=$('ceShareScreenBtn1041');
    if(!btn){ btn=document.createElement('button'); btn.type='button'; btn.id='ceShareScreenBtn1041'; btn.className='outline small'; btn.title='Duplicar pantalla en TV/proyector'; btn.setAttribute('aria-label','Duplicar pantalla en TV/proyector'); btn.textContent='📺'; actions.insertBefore(btn, actions.firstChild||null); }
  }
  function openSharePanel1041(){
    var old=$('ceShareScreenPanel1041'); if(old) old.remove(); var old2=$('ceShareScreenPanel'); if(old2) old2.remove();
    var html='<div id="ceShareScreenPanel1041"><div class="box"><div class="head"><div>📺 Duplicar esta app en TV / proyector</div><button type="button" class="outline small" data-ce-share1041-close>Cerrar</button></div>'+ 
      '<div class="ce-share1041-help"><b>La app no puede elegir directamente una TV cercana:</b> por seguridad lo hace Windows, iPad/iPhone o Android. Lo correcto es duplicar la pantalla del dispositivo, no “presentar dispositivo” desde Chrome si ese cuadro aparece vacío.<br><br><b>Windows/PC:</b> deja esta app en pantalla completa y pulsa <b>Win + K</b>. Elige la TV/proyector en el panel lateral de Windows.<br><b>iPad/iPhone:</b> Centro de control → <b>Duplicar pantalla</b> → Apple TV/AirPlay compatible.<br><b>Android:</b> ajustes rápidos → <b>Enviar pantalla / Cast</b>.</div>'+ 
      '<div class="ce-share1041-actions"><button type="button" class="modify small" data-ce-share1041-full>⛶ Pantalla completa</button><button type="button" class="outline small" data-ce-share1041-win>🪟 Abrir Proyectar Windows</button><button type="button" class="outline small" data-ce-share1041-url>🔗 Copiar enlace</button></div>'+ 
      '<div id="ceShareStatus1041" class="ce-share1041-status">Pulsa Pantalla completa y luego usa Win+K / AirPlay / Cast desde el sistema.</div></div></div>';
    document.body.insertAdjacentHTML('beforeend',html);
  }
  function shareStatus(msg){ var el=$('ceShareStatus1041'); if(el) el.textContent=msg||''; }
  function handleShare1041(ev){
    var t=ev.target; if(!t||!t.closest) return;
    if(t.closest('#ceShareScreenBtn1041')){ stop(ev); openSharePanel1041(); return false; }
    if(t.closest('[data-ce-share1041-close]')){ stop(ev); var p=$('ceShareScreenPanel1041'); if(p) p.remove(); return false; }
    if(t.closest('[data-ce-share1041-full]')){ stop(ev); var de=document.documentElement; if(de.requestFullscreen) de.requestFullscreen().then(function(){shareStatus('Pantalla completa activada. Ahora pulsa Win+K o usa AirPlay/Cast.');}).catch(function(e){shareStatus('No se pudo activar pantalla completa: '+(e&&e.message?e.message:'navegador no compatible'));}); else shareStatus('Este navegador no permite pantalla completa desde la app.'); return false; }
    if(t.closest('[data-ce-share1041-win]')){ stop(ev); shareStatus('Intento abrir la configuración de Proyectar de Windows. Si no se abre, pulsa Win+K manualmente.'); try{ window.location.href='ms-settings:project'; }catch(_){} return false; }
    if(t.closest('[data-ce-share1041-url]')){ stop(ev); var u=location.href; if(navigator.clipboard) navigator.clipboard.writeText(u).then(function(){shareStatus('Enlace copiado. Puedes abrir la misma app en otro dispositivo.');}).catch(function(){prompt('Copia esta URL:',u);}); else prompt('Copia esta URL:',u); return false; }
  }

  function tick(){ injectStyle(); applyVersion(); markPendingCandidates(); hydrateIngresoDownloads1041(); snapshotGood(); restoreIfBlank(); ensureShareButton1041(); }
  document.addEventListener('pointerdown',function(ev){ handleIngresoDownload(ev); handleShare1041(ev); },true);
  document.addEventListener('click',function(ev){ handleIngresoDownload(ev); handleShare1041(ev); },true);
  document.addEventListener('keydown',function(ev){ if(ev.key==='Escape'){ var p=$('ceShareScreenPanel1041'); if(p){ p.remove(); stop(ev); return false; } } },true);
  document.addEventListener('click',function(ev){ var t=ev.target; if(t && t.closest && t.closest('button.tab,[data-tab],[data-view],.main-tabs button,.app-menu button,.ce-menu button')) forceLoadEventSoon(180); },true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted','controlevent:event-ready','controlevent:event-loaded','controlevent:state-loaded','controlevent:event-changed'].forEach(function(e){ window.addEventListener(e,function(){ setTimeout(tick,40); setTimeout(function(){ tick(); forceLoadEventSoon(0); },260); }); });
  try{ new MutationObserver(function(){ if(tick._t) clearTimeout(tick._t); tick._t=setTimeout(tick,90); }).observe(document.body,{childList:true,subtree:true,attributes:false}); }catch(_){ }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',tick,{once:true}); else tick();
  setInterval(tick,800);
  window.ControlEventV1041={version:VERSION, markPendingCandidates:markPendingCandidates, hydrateIngresoDownloads:hydrateIngresoDownloads1041, openSharePanel:openSharePanel1041, forceLoadEvent:forceLoadEventSoon};
})();
