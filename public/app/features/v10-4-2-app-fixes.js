/* ControlEvent v11.2_prod - estabilización: menos refrescos, arranque limpio, bienvenida festiva y duplicar pantalla claro. */
(function(){
  'use strict';
  if(window.__ceV1042AppFixes) return; window.__ceV1042AppFixes=true;
  var VERSION='v11.2_prod';
  function text(v){ return v==null?'':String(v); }
  function trim(v){ return text(v).trim(); }
  function $(id){ return document.getElementById(id); }
  function safe(fn,fb){ try{ var v=fn(); return v===undefined?fb:v; }catch(_){ return fb; } }
  function stateObj(){ return safe(function(){return (typeof state!=='undefined'&&state)||window.state||{};}, window.state||{}); }
  function authObj(){ return safe(function(){ return (typeof authUser!=='undefined'&&authUser)||window.authUser||null; }, window.authUser||null); }
  function isLogged(){ var u=authObj(); return !!(u && (u.identificacion || u.nombre || u.nivel)); }
  function selectedEventId(){ var s=stateObj(); var id=trim(s.selectedEventId); if(id) return id; var sel=$('selectedEvent'); return sel?trim(sel.value):''; }
  function stop(ev){ if(ev){ ev.preventDefault&&ev.preventDefault(); ev.stopPropagation&&ev.stopPropagation(); ev.stopImmediatePropagation&&ev.stopImmediatePropagation(); } return false; }
  function injectStyle(){
    if($('ceV1042Style')) return;
    var st=document.createElement('style'); st.id='ceV1042Style';
    st.textContent='\n'+
      '.ce-v1042-brand-mini{display:inline-flex!important;align-items:center!important;gap:6px!important;font-weight:950!important}.ce-v1042-brand-mini img{width:28px!important;height:28px!important;object-fit:contain!important}\n'+
      '.ce-v1042-welcome{min-height:56vh!important;display:flex!important;align-items:center!important;justify-content:center!important;text-align:center!important;position:relative!important;overflow:hidden!important;background:radial-gradient(circle at center,#ffffff 0%,#f8fafc 58%,#eef6ff 100%)!important;border:0!important;box-shadow:none!important}.ce-v1042-welcome-inner{position:relative!important;z-index:2!important;display:flex!important;flex-direction:column!important;align-items:center!important;gap:12px!important}.ce-v1042-welcome-logo{width:min(34vw,280px)!important;height:min(34vw,280px)!important;object-fit:contain!important;animation:ceLogoParty1042 3s ease-out forwards!important;filter:drop-shadow(0 18px 32px rgba(14,165,233,.23))}.ce-v1042-welcome h2{font-size:clamp(22px,3vw,36px)!important;margin:0!important;color:#0f172a!important;font-weight:950!important}.ce-v1042-welcome p{margin:0!important;color:#475569!important;font-weight:800!important}.ce-v1042-party{position:absolute!important;inset:0!important;pointer-events:none!important;z-index:1!important}.ce-v1042-party span{position:absolute!important;font-size:clamp(18px,3vw,34px)!important;animation:cePartyFloat1042 3.8s ease-in-out infinite alternate!important;opacity:.92!important}.ce-v1042-party span:nth-child(1){left:12%;top:18%;animation-delay:.1s}.ce-v1042-party span:nth-child(2){left:78%;top:20%;animation-delay:.5s}.ce-v1042-party span:nth-child(3){left:20%;top:72%;animation-delay:.9s}.ce-v1042-party span:nth-child(4){left:70%;top:68%;animation-delay:.2s}.ce-v1042-party span:nth-child(5){left:46%;top:14%;animation-delay:.7s}.ce-v1042-party span:nth-child(6){left:88%;top:48%;animation-delay:1.1s}.ce-v1042-party span:nth-child(7){left:7%;top:49%;animation-delay:1.3s}@keyframes ceLogoParty1042{0%{transform:scale(.34) rotate(-2deg);opacity:.65}60%{transform:scale(1.08) rotate(1deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}@keyframes cePartyFloat1042{0%{transform:translateY(0) rotate(-8deg) scale(.9)}100%{transform:translateY(-18px) rotate(12deg) scale(1.15)}}\n'+
      '#ceShareScreenBtn1041,#ceShareScreenBtn,#ceShareScreenPanel1041,#ceShareScreenPanel{display:none!important;visibility:hidden!important;pointer-events:none!important}\n'+
      '#ceShareScreenBtn1042{font-size:16px!important;width:32px!important;height:30px!important;min-width:32px!important;min-height:30px!important;padding:2px!important;border-radius:9px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;touch-action:manipulation!important}\n'+
      '#ceShareScreenPanel1042{position:fixed!important;inset:0!important;z-index:10000090!important;background:rgba(15,23,42,.72)!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:12px!important}#ceShareScreenPanel1042 .box{background:#fff!important;border:2px solid #0ea5e9!important;border-radius:16px!important;max-width:690px!important;width:96vw!important;padding:16px!important;box-shadow:0 24px 80px rgba(0,0,0,.35)!important}#ceShareScreenPanel1042 .head{display:flex!important;justify-content:space-between!important;align-items:center!important;gap:10px!important;margin-bottom:10px!important;font-weight:950!important;color:#075985!important}.ce-share1042-help{font-size:14px!important;line-height:1.45!important;color:#334155!important;background:#f8fafc!important;border:1px solid #e2e8f0!important;border-radius:12px!important;padding:12px!important}.ce-share1042-help b{color:#0f172a!important}.ce-share1042-actions{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;margin:12px 0!important}.ce-share1042-actions button{min-height:44px!important;font-weight:950!important}.ce-share1042-status{margin-top:10px!important;border:1px solid #bae6fd!important;background:#f0f9ff!important;color:#075985!important;border-radius:10px!important;padding:8px!important;font-weight:850!important}@media(max-width:680px){.ce-share1042-actions{grid-template-columns:1fr!important}}\n'+
      '.ce-v1042-ingreso-download{width:32px!important;height:30px!important;min-width:32px!important;min-height:30px!important;padding:1px!important;border-radius:8px!important;font-size:16px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;margin-left:4px!important}\n'+
      '.ce-ai-pending-row.ce-ai-pending-candidate{background:transparent!important;border:0!important;box-shadow:none!important;padding-left:0!important;padding-right:0!important}.ce-ai-pending-row.ce-ai-pending-candidate-same strong,.ce-ai-pending-row.ce-ai-pending-candidate-same span,.ce-ai-row-match-same td,.ce-ai-row-match-same input,.ce-ai-row-match-same select{color:#b91c1c!important;font-weight:950!important}.ce-ai-pending-row.ce-ai-pending-candidate-other strong,.ce-ai-pending-row.ce-ai-pending-candidate-other span,.ce-ai-row-match-other td,.ce-ai-row-match-other input,.ce-ai-row-match-other select{color:#c2410c!important;font-weight:950!important}.ce-ai-pending-row.ce-ai-pending-candidate::after{display:none!important;content:""!important}\n';
    document.head.appendChild(st);
  }
  function applyVersion(){
    try{ document.title='ControlEvent '+VERSION; }catch(_){ }
    var mini=document.querySelector('.ce-v104-brand-mini,.ce-v1041-brand-mini,.ce-v1042-brand-mini');
    if(mini){ mini.className='ce-v1042-brand-mini ce-v104-brand-mini'; mini.innerHTML='<img src="./assets/icons/controlevent-welcome-v44.png" alt="CE"><span>'+VERSION+'</span>'; }
    document.querySelectorAll('.appname-stack span span,.appname span,.appname-stack span').forEach(function(el){
      if(el && /v\d+\.\d+(?:\.\d+)?_prod/i.test(el.textContent||'')) el.textContent=(el.textContent||'').replace(/v\d+\.\d+(?:\.\d+)?_prod/ig, VERSION);
    });
  }
  function updatePrelogin(){
    // HOTFIX LOGIN 2: no usar una clase global para ocultar la app.
    // El bloqueo anterior podía quedarse activo si authUser tardaba en hidratarse tras /api/login.
    try{ document.documentElement.classList.remove('ce-prelogin-clean'); }catch(_){}
  }
  function ensureWelcome(){
    updatePrelogin();
    if(!isLogged() || selectedEventId()) return;
    var msg=$('noEventMessage'); if(!msg) return;
    msg.classList.remove('hidden');
    if(!msg.querySelector('.ce-v1042-welcome')){
      msg.innerHTML='<div class="ce-v1042-welcome"><div class="ce-v1042-party"><span>✨</span><span>🚀</span><span>⭐</span><span>🎉</span><span>💫</span><span>🎊</span><span>🚀</span></div><div class="ce-v1042-welcome-inner"><img class="ce-v1042-welcome-logo" src="./assets/icons/controlevent-welcome-v44.png" alt="ControlEvent"><h2>Selecciona un evento para trabajar</h2><p>La fiesta empieza al elegir el evento.</p></div></div>';
    }
  }
  function safeDownloadName(base){ return trim(base||'foto').replace(/[\/:*?"<>|]+/g,' ').replace(/\s+/g,'_').slice(0,90)||'foto'; }
  function downloadSrc(src,name){
    src=trim(src); if(!src) return false; var fname=safeDownloadName(name)+'.jpg';
    function fire(url){ var a=document.createElement('a'); a.href=url; a.download=fname; a.rel='noopener'; a.style.display='none'; document.body.appendChild(a); a.click(); setTimeout(function(){a.remove();},500); }
    if(/^data:|^blob:/i.test(src)){ fire(src); return false; }
    fetch(src,{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.blob(); }).then(function(b){ var u=URL.createObjectURL(b); fire(u); setTimeout(function(){URL.revokeObjectURL(u);},3000); }).catch(function(){ fire(src); });
    return false;
  }
  function ingresoRoot(){ return $('tabIngresos') || $('collabList') || document; }
  function isLikelyReceiptImg(img){ var src=trim(img.currentSrc||img.src||''); return !!(src && (/^data:image\//i.test(src) || /ticket-images|ingresos|justificante|receipt|supabase/i.test(src))); }
  function tidyIngresoDownloads(){
    var root=ingresoRoot(); if(!root) return;
    var cards=Array.prototype.slice.call(root.querySelectorAll('.itemcard,.rowline,.card,.ce-v509-receipt-field,.ce-v504-receipt-strip,.ce-v502-receipt-strip,.ce-v465-receipt-strip'));
    cards.forEach(function(card,idx){
      var imgs=Array.prototype.slice.call(card.querySelectorAll('img')).filter(isLikelyReceiptImg); if(!imgs.length) return;
      var buttons=Array.prototype.slice.call(card.querySelectorAll('.ce-v104-ingreso-download,.ce-v1041-ingreso-download,.ce-v1042-ingreso-download,.ce-ticket-download-v95'));
      var first=buttons[0]; buttons.slice(1).forEach(function(b){ b.remove(); });
      if(!first){ first=document.createElement('button'); first.type='button'; first.className='outline small ce-v1042-ingreso-download'; first.title='Descargar justificante'; first.setAttribute('aria-label','Descargar justificante'); first.textContent='⬇️'; imgs[0].insertAdjacentElement('afterend', first); }
      first.classList.add('ce-v1042-ingreso-download');
      first.onclick=function(ev){ stop(ev); return downloadSrc(imgs[0].currentSrc||imgs[0].src,'justificante_ingreso_'+(idx+1)); };
    });
  }
  function ensureShareButton(){
    var actions=document.querySelector('.appname-stack .user-actions')||document.querySelector('.appname-stack'); if(!actions) return;
    var old=$('ceShareScreenBtn1041'); if(old) old.remove(); var old0=$('ceShareScreenBtn'); if(old0) old0.remove();
    var btn=$('ceShareScreenBtn1042');
    if(!btn){ btn=document.createElement('button'); btn.type='button'; btn.id='ceShareScreenBtn1042'; btn.className='outline small'; btn.title='Duplicar pantalla en TV/proyector'; btn.setAttribute('aria-label','Duplicar pantalla en TV/proyector'); btn.textContent='📺'; actions.insertBefore(btn, actions.firstChild||null); }
  }
  function openSharePanel(){
    var old=$('ceShareScreenPanel1042'); if(old) old.remove();
    var html='<div id="ceShareScreenPanel1042"><div class="box"><div class="head"><div>📺 Duplicar pantalla en TV / proyector</div><button type="button" class="outline small" data-ce-share1042-close>Cerrar</button></div>'+ 
      '<div class="ce-share1042-help"><b>ControlEvent no puede elegir directamente una TV desde la web.</b> La app solo puede ponerse a pantalla completa; la conexión con la TV la hace el sistema operativo.<br><br><b>Windows/PC:</b> pulsa primero <b>Pantalla completa</b> y después <b>Win + K</b>. En el panel de Windows elige la TV/proyector. Si no aparece, revisa que la TV acepte Miracast/Proyección inalámbrica y esté en la misma red.<br><b>iPad/iPhone:</b> abre el Centro de control → <b>Duplicar pantalla</b> → elige Apple TV/AirPlay.<br><b>Android:</b> ajustes rápidos → <b>Enviar pantalla / Smart View / Cast</b>.</div>'+ 
      '<div class="ce-share1042-actions"><button type="button" class="modify small" data-ce-share1042-full>⛶ Pantalla completa</button><button type="button" class="outline small" data-ce-share1042-url>🔗 Copiar enlace de la app</button></div>'+ 
      '<div id="ceShareStatus1042" class="ce-share1042-status">Después de Pantalla completa usa Win+K / AirPlay / Cast desde el dispositivo.</div></div></div>';
    document.body.insertAdjacentHTML('beforeend',html);
  }
  function shareStatus(msg){ var el=$('ceShareStatus1042'); if(el) el.textContent=msg||''; }
  function handleShare(ev){
    var t=ev.target; if(!t||!t.closest) return;
    if(t.closest('#ceShareScreenBtn1042')){ stop(ev); openSharePanel(); return false; }
    if(t.closest('[data-ce-share1042-close]')){ stop(ev); var p=$('ceShareScreenPanel1042'); if(p) p.remove(); return false; }
    if(t.closest('[data-ce-share1042-full]')){ stop(ev); var de=document.documentElement; if(de.requestFullscreen) de.requestFullscreen().then(function(){shareStatus('Pantalla completa activada. Ahora usa Win+K / AirPlay / Cast.');}).catch(function(e){shareStatus('No se pudo activar pantalla completa: '+(e&&e.message?e.message:'navegador no compatible'));}); else shareStatus('Este navegador no permite pantalla completa desde la app.'); return false; }
    if(t.closest('[data-ce-share1042-url]')){ stop(ev); var u=location.href; if(navigator.clipboard) navigator.clipboard.writeText(u).then(function(){shareStatus('Enlace copiado. Puedes abrir la misma app en otro dispositivo.');}).catch(function(){prompt('Copia esta URL:',u);}); else prompt('Copia esta URL:',u); return false; }
  }

  // HOTFIX LOGIN 2: proteger los campos de login frente a repintados rápidos de parches legacy.
  var loginDraft={ident:'', clave:''};
  function loginOverlayVisible(){ var o=$('authOverlay'); return !!(o && !o.classList.contains('hidden')); }
  function captureLoginDraft(){
    var ident=$('loginIdentificacion'), clave=$('loginClave');
    if(ident && trim(ident.value)) loginDraft.ident=ident.value;
    if(clave && text(clave.value)) loginDraft.clave=clave.value;
  }
  function restoreLoginDraft(){
    if(!loginOverlayVisible()) return;
    var ident=$('loginIdentificacion'), clave=$('loginClave');
    if(ident && !trim(ident.value) && loginDraft.ident) ident.value=loginDraft.ident;
    if(clave && !text(clave.value) && loginDraft.clave) clave.value=loginDraft.clave;
  }
  document.addEventListener('input',function(ev){ var t=ev.target; if(t && (t.id==='loginIdentificacion' || t.id==='loginClave')) captureLoginDraft(); },true);
  document.addEventListener('change',function(ev){ var t=ev.target; if(t && (t.id==='loginIdentificacion' || t.id==='loginClave')) { captureLoginDraft(); setTimeout(restoreLoginDraft,60); } },true);
  document.addEventListener('focusin',function(ev){ var t=ev.target; if(t && (t.id==='loginIdentificacion' || t.id==='loginClave')) { captureLoginDraft(); setTimeout(restoreLoginDraft,80); } },true);
  var loginGuardUntil=Date.now()+12000;
  var loginGuardTimer=setInterval(function(){
    try{ document.documentElement.classList.remove('ce-prelogin-clean'); restoreLoginDraft(); }catch(_){}
    if(Date.now()>loginGuardUntil && !loginOverlayVisible()) clearInterval(loginGuardTimer);
  },180);
  var queued=false, lastRun=0;
  function runSoon(delay){ if(queued) return; queued=true; var now=Date.now(); var wait=Math.max(delay||80, (now-lastRun<450)?450-(now-lastRun):0); setTimeout(function(){ queued=false; lastRun=Date.now(); run(); }, wait); }
  function run(){ injectStyle(); applyVersion(); updatePrelogin(); ensureWelcome(); ensureShareButton(); tidyIngresoDownloads(); }
  document.addEventListener('click', function(ev){ handleShare(ev); var t=ev.target; if(t&&t.closest&&t.closest('#tabIngresosBtn,#btnLogin,#selectedEvent,.tab,.mobile-menu-action')) runSoon(250); }, true);
  document.addEventListener('change', function(ev){ var t=ev.target; if(t&&t.closest&&t.closest('#selectedEvent')) setTimeout(function(){ updatePrelogin(); }, 80); }, true);
  document.addEventListener('keydown',function(ev){ if(ev.key==='Escape'){ var p=$('ceShareScreenPanel1042'); if(p){ p.remove(); stop(ev); return false; } } },true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:event-ready','controlevent:event-loaded','controlevent:event-changed'].forEach(function(e){ window.addEventListener(e,function(){ runSoon(220); }); });
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
  setTimeout(run,500); setTimeout(run,1500);
  window.ControlEventV1042={version:VERSION, run:run, openSharePanel:openSharePanel, tidyIngresoDownloads:tidyIngresoDownloads};
})();
