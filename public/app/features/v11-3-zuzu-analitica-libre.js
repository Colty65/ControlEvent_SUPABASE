/* ControlEvent v18.2_prod - Zuzu / Analítica libre de explotación del evento.
   Solo lectura. Disponible para GD/RW/RO y eventos En curso/Finalizado. */
(function(){
  'use strict';
  if(window.__ceV113ZuzuAnalitica) return; window.__ceV113ZuzuAnalitica=true;
  var VERSION='v18.2_prod';
  function $(id){ return document.getElementById(id); }
  function text(v){ return v==null?'':String(v); }
  function trim(v){ return text(v).trim(); }
  function esc(v){ return text(v).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];}); }
  function safe(fn,fb){ try{ var v=fn(); return v===undefined?fb:v; }catch(_){ return fb; } }
  function st(){ return safe(function(){ return (typeof state!=='undefined'&&state)||window.state||{}; }, window.state||{}); }
  function arr(k){ var s=st(); return Array.isArray(s[k])?s[k]:[]; }
  function selectedEventId(){ return trim((st().selectedEventId)||(($('selectedEvent')||{}).value)||''); }
  function currentEvent(){ var id=selectedEventId(); return arr('eventos').find(function(e){ return trim(e.id)===id; }) || null; }
  function isFinalized(ev){ return /^finalizado$/i.test(trim(ev&&ev.situacion)); }
  function eventTitleHtml(){
    var ev=currentEvent();
    if(!ev) return '<span class="ce-ai-event-warn">Selecciona un evento</span>';
    var cls=isFinalized(ev)?'ce-ai-event-final':'ce-ai-event-open';
    return '<span class="'+cls+'">'+esc(trim(ev.titulo)||'Evento')+'</span><span class="ce-ai-event-state">'+esc(trim(ev.situacion||'En curso'))+'</span>';
  }
  function fileSafe(v){ return trim(v||'resultado').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,'_').slice(0,90)||'resultado'; }
  function downloadText(content, filename, mime){
    var blob=new Blob([text(content)],{type:mime||'text/plain;charset=utf-8'});
    var url=URL.createObjectURL(blob); var a=document.createElement('a'); a.href=url; a.download=fileSafe(filename||'resultado.txt'); a.style.display='none'; document.body.appendChild(a); a.click();
    setTimeout(function(){ try{a.remove(); URL.revokeObjectURL(url);}catch(_){ } },1500);
  }
  function injectStyle(){
    if($('ceV110GeminiLibreStyle')) return;
    var css=document.createElement('style'); css.id='ceV110GeminiLibreStyle';
    css.textContent='\n'+
      '.ce-ai-free-btn{margin-left:auto!important;border:1px solid #f59e0b!important;background:#fff7ed!important;color:#7c2d12!important;border-radius:18px!important;min-width:54px!important;height:48px!important;font-size:24px!important;box-shadow:0 8px 20px rgba(251,146,60,.22)!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;cursor:pointer!important}\n'+
      '.ce-ai-free-btn:hover{transform:translateY(-1px);box-shadow:0 10px 24px rgba(251,146,60,.30)!important}\n'+

      '#ceAiTicketPanel.ce-ai-overlay:not(.open){display:none!important;visibility:hidden!important;pointer-events:none!important}#ceAiTicketPanel.ce-ai-overlay.open{display:flex!important;visibility:visible!important;pointer-events:auto!important}\n'+
      '#ceGeminiLibreOverlay{position:fixed;inset:0;z-index:99995;background:rgba(15,23,42,.50);display:flex;align-items:center;justify-content:center;padding:16px}\n'+
      '#ceGeminiLibreOverlay .ce-ai-modal{width:min(1180px,96vw);height:min(860px,94vh);background:#fff;border:2px solid #f59e0b;border-radius:22px;box-shadow:0 24px 70px rgba(15,23,42,.34);display:flex;flex-direction:column;overflow:hidden}\n'+
      '#ceGeminiLibreOverlay .ce-ai-head{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid #fed7aa;background:linear-gradient(90deg,#fff7ed,#fff)}\n'+
      '#ceGeminiLibreOverlay .ce-ai-head h2{margin:0;color:#7c2d12;font-size:24px;flex:0 0 auto}#ceAiEventTitle{flex:1;text-align:center}#ceGeminiLibreOverlay .ce-ai-head .spacer{display:none}#ceGeminiLibreOverlay .ce-ai-close{border-radius:14px!important;background:#fff!important;color:#0f172a!important;border:1px solid #cbd5e1!important;padding:10px 18px!important;font-weight:900!important;flex:0 0 auto}\n'+
      '#ceGeminiLibreOverlay .ce-ai-event-open{color:#15803d;font-weight:900;font-size:18px}#ceGeminiLibreOverlay .ce-ai-event-final{color:#dc2626;font-weight:900;font-size:18px}#ceGeminiLibreOverlay .ce-ai-event-warn{color:#b45309;font-weight:900}#ceGeminiLibreOverlay .ce-ai-event-state{display:inline-block;margin-left:18px;font-size:15px;color:#475569;font-weight:900;background:#f1f5f9;border-radius:999px;padding:3px 12px}\n'+
      '#ceGeminiLibreOverlay .ce-ai-prompt{padding:14px 18px;border-bottom:1px solid #e5e7eb;background:#fff}#ceGeminiLibreOverlay .ce-ai-prompt textarea{width:100%;min-height:112px;resize:vertical;border:1px solid #fb923c;border-radius:14px;padding:12px;font-size:16px;box-sizing:border-box}#ceGeminiLibreOverlay .ce-ai-toolbar{display:flex;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap}#ceGeminiLibreOverlay .ce-ai-run{background:#f97316!important;color:#fff!important;border:0!important;border-radius:14px!important;padding:12px 18px!important;font-weight:900!important}#ceGeminiLibreOverlay .ce-ai-secondary{background:#fff!important;color:#0f172a!important;border:1px solid #cbd5e1!important;border-radius:14px!important;padding:10px 14px!important;font-weight:900!important}#ceGeminiLibreOverlay .ce-ai-status{font-weight:900;margin-left:auto}#ceGeminiLibreOverlay .ce-ai-status.ok{color:#15803d}#ceGeminiLibreOverlay .ce-ai-status.err{color:#b91c1c}\n'+
      '#ceGeminiLibreOverlay .ce-ai-result{flex:1;overflow:auto;background:#f8fafc;padding:16px 18px}#ceGeminiLibreOverlay .ce-ai-card{background:#fff;border:1px solid #dbeafe;border-radius:16px;padding:14px;margin:0 0 14px 0;box-shadow:0 2px 10px rgba(15,23,42,.06)}#ceGeminiLibreOverlay .ce-ai-card h3{margin:0 0 10px;color:#075985}#ceGeminiLibreOverlay .ce-ai-answer{white-space:pre-wrap;line-height:1.45;font-weight:650;color:#0f172a}#ceGeminiLibreOverlay .ce-ai-warning{background:#fff7ed;border-color:#fed7aa;color:#9a3412}#ceGeminiLibreOverlay .ce-ai-rejected{background:#fef2f2;border-color:#fecaca;color:#991b1b}\n'+
      '#ceGeminiLibreOverlay .ce-ai-table-wrap{overflow:auto}#ceGeminiLibreOverlay .ce-ai-table{border-collapse:collapse;width:100%;font-size:14px}#ceGeminiLibreOverlay .ce-ai-table th,#ceGeminiLibreOverlay .ce-ai-table td{border:1px solid #dbeafe;padding:7px 8px;text-align:left}#ceGeminiLibreOverlay .ce-ai-table th{background:#eff6ff;color:#075985}#ceGeminiLibreOverlay .ce-ai-bars{display:grid;gap:8px}#ceGeminiLibreOverlay .ce-ai-bar-row{display:grid;grid-template-columns:minmax(120px,260px) 1fr auto;align-items:center;gap:10px}#ceGeminiLibreOverlay .ce-ai-bar-label{font-weight:800;color:#0f172a;overflow:hidden;text-overflow:ellipsis}#ceGeminiLibreOverlay .ce-ai-bar-track{height:22px;background:#e2e8f0;border-radius:999px;overflow:hidden}#ceGeminiLibreOverlay .ce-ai-bar-fill{height:100%;background:#38bdf8;border-radius:999px}#ceGeminiLibreOverlay .ce-ai-bar-value{font-weight:900;color:#075985;min-width:78px;text-align:right}#ceGeminiLibreOverlay .ce-ai-loading{background:#fff7ed;border-color:#fed7aa}#ceGeminiLibreOverlay .ce-ai-thinking{display:flex;align-items:center;gap:16px;padding:10px 4px}#ceGeminiLibreOverlay .ce-ai-thinking-orb{width:54px;height:54px;border-radius:50%;position:relative;background:radial-gradient(circle at 35% 30%,#fff 0 14%,#fdba74 15% 42%,#fb923c 43% 66%,#7c2d12 67% 100%);box-shadow:0 0 0 0 rgba(249,115,22,.45);animation:ceZuzuOrb 1.05s infinite ease-in-out}#ceGeminiLibreOverlay .ce-ai-thinking-orb:before,#ceGeminiLibreOverlay .ce-ai-thinking-orb:after{content:"";position:absolute;inset:-8px;border-radius:50%;border:3px solid rgba(249,115,22,.35);animation:ceZuzuRing 1.3s infinite ease-out}#ceGeminiLibreOverlay .ce-ai-thinking-orb:after{animation-delay:.35s}#ceGeminiLibreOverlay .ce-ai-thinking-lines{font-weight:900;color:#7c2d12}#ceGeminiLibreOverlay .ce-ai-thinking-lines small{display:block;color:#9a3412;margin-top:5px;font-weight:800}#ceGeminiLibreOverlay .ce-ai-step-title{display:block;font-weight:950;color:#7c2d12}#ceGeminiLibreOverlay .ce-ai-step-counter{color:#475569!important;font-size:12px!important;margin-top:7px!important}#ceGeminiLibreOverlay .ce-ai-thinking-lines.is-live{min-height:58px}#ceGeminiLibreOverlay .ce-ai-spinner{display:inline-block;animation:ceZuzuPulse 1s infinite ease-in-out}@keyframes ceZuzuPulse{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.25);opacity:1}}@keyframes ceZuzuOrb{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-4px) scale(1.06)}}@keyframes ceZuzuRing{0%{transform:scale(.75);opacity:.65}100%{transform:scale(1.45);opacity:0}}#ceGeminiLibreOverlay .ce-ai-files{display:flex;gap:8px;flex-wrap:wrap}#ceGeminiLibreOverlay .ce-ai-file-btn{background:#e0f2fe!important;color:#075985!important;border:1px solid #7dd3fc!important;border-radius:12px!important;padding:8px 12px!important;font-weight:900!important}#ceGeminiLibreOverlay .ce-ai-preview{margin-top:10px;background:#0f172a;color:#e2e8f0;border-radius:14px;padding:12px;max-height:240px;overflow:auto;white-space:pre-wrap}\n'+
      '#ceGeminiLibreOverlay .ce-ai-vbars{height:320px;display:flex;align-items:flex-end;gap:14px;border:1px solid #e0f2fe;border-radius:16px;background:linear-gradient(180deg,#fff,#f8fafc);padding:34px 14px 58px;overflow:auto}#ceGeminiLibreOverlay .ce-ai-vbar{height:100%;min-width:74px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;position:relative}#ceGeminiLibreOverlay .ce-ai-vbar-col{width:48px;border-radius:12px 12px 0 0;box-shadow:0 8px 20px rgba(15,23,42,.12)}#ceGeminiLibreOverlay .ce-ai-vbar-value{position:absolute;bottom:calc(100% + 8px);font-size:12px;font-weight:900;color:#075985;white-space:nowrap;transform:rotate(-90deg);transform-origin:center}#ceGeminiLibreOverlay .ce-ai-vbar-label{position:absolute;bottom:-42px;max-width:110px;text-align:center;font-size:12px;font-weight:900;color:#334155;white-space:normal;line-height:1.15}\n'+
      '#ceGeminiLibreOverlay .ce-ai-pie-wrap{display:flex;align-items:center;gap:22px;flex-wrap:wrap}#ceGeminiLibreOverlay .ce-ai-pie{width:220px;height:220px;border-radius:50%;box-shadow:inset 0 0 0 42px rgba(255,255,255,.82),0 10px 24px rgba(15,23,42,.12)}#ceGeminiLibreOverlay .ce-ai-pie.donut{box-shadow:inset 0 0 0 64px rgba(255,255,255,.88),0 10px 24px rgba(15,23,42,.12)}#ceGeminiLibreOverlay .ce-ai-pie-list{display:grid;gap:8px;min-width:220px}#ceGeminiLibreOverlay .ce-ai-pie-legend{font-weight:850;color:#0f172a}#ceGeminiLibreOverlay .ce-ai-pie-legend span{display:inline-block;width:13px;height:13px;border-radius:999px;margin-right:8px;vertical-align:middle}\n'+
      '#ceGeminiLibreOverlay .ce-ai-line-svg{width:100%;height:320px;border:1px solid #e0f2fe;border-radius:16px;background:linear-gradient(180deg,#fff,#f8fafc)}#ceGeminiLibreOverlay .ce-ai-stacked-wrap{display:grid;gap:12px}#ceGeminiLibreOverlay .ce-ai-stack-row{display:grid;grid-template-columns:minmax(130px,240px) 1fr;gap:10px;align-items:center}#ceGeminiLibreOverlay .ce-ai-stack-label{font-weight:900;color:#0f172a;overflow:hidden;text-overflow:ellipsis}#ceGeminiLibreOverlay .ce-ai-stack-track{height:30px;background:#e2e8f0;border-radius:999px;display:flex;overflow:hidden}#ceGeminiLibreOverlay .ce-ai-stack-part{height:100%;display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:900;min-width:3px}#ceGeminiLibreOverlay .ce-ai-stack-legend{display:flex;gap:12px;flex-wrap:wrap;margin-top:10px;font-weight:900;color:#334155}#ceGeminiLibreOverlay .ce-ai-stack-legend span i{display:inline-block;width:12px;height:12px;border-radius:999px;margin-right:6px}\n'+
      '@media(max-width:760px){#ceGeminiLibreOverlay .ce-ai-modal{width:98vw;height:96vh}#ceGeminiLibreOverlay .ce-ai-head h2{font-size:18px}.ce-ai-free-btn{height:42px;min-width:46px;font-size:21px}#ceGeminiLibreOverlay .ce-ai-prompt textarea{min-height:96px}#ceGeminiLibreOverlay .ce-ai-bar-row{grid-template-columns:1fr}#ceGeminiLibreOverlay .ce-ai-bar-value{text-align:left}}\n'+
      '#ceGeminiLibreOverlay #ceAiPrompt{touch-action:manipulation!important;-webkit-user-select:text!important;user-select:text!important;contain:layout style!important;}\n'+
      '@media(pointer:coarse){#ceGeminiLibreOverlay .ce-ai-thinking-orb,#ceGeminiLibreOverlay .ce-ai-thinking-orb:before,#ceGeminiLibreOverlay .ce-ai-thinking-orb:after,#ceGeminiLibreOverlay .ce-ai-spinner{animation:none!important}}\n';
    document.head.appendChild(css);
  }

  var lastOpenTap=0;
  function openFromButton(ev){
    if(ev){ ev.preventDefault(); ev.stopPropagation(); }
    var now=Date.now(); if(now-lastOpenTap<650) return; lastOpenTap=now;
    openModal();
  }
  function bindOpenButton(btn){
    if(!btn || btn.__ceAnaliticaLibreBound) return; btn.__ceAnaliticaLibreBound=true;
    ['click','touchend','pointerup'].forEach(function(evt){
      btn.addEventListener(evt, openFromButton, { passive:false, capture:true });
    });
  }
  function injectButton(){
    var tab=$('tabGraficas'); if(!tab) return;
    var section=tab.querySelector('.section-title'); if(!section || $('ceGeminiLibreBtn')) return;
    var btn=document.createElement('button'); btn.type='button'; btn.id='ceGeminiLibreBtn'; btn.className='ce-ai-free-btn'; btn.title='Soy Zuzu, pregúntame lo que quieras'; btn.setAttribute('aria-label','Soy Zuzu, pregúntame lo que quieras'); btn.textContent='✨📊';
    bindOpenButton(btn);
    section.appendChild(btn);
  }
  function modalHtml(){
    return '<div class="ce-ai-overlay" id="ceGeminiLibreOverlay" role="dialog" aria-modal="true">'+
      '<div class="ce-ai-modal">'+
        '<div class="ce-ai-head"><h2>✨ Soy Zuzu, pregúntame lo que quieras...</h2><div id="ceAiEventTitle">'+eventTitleHtml()+'</div><div class="spacer"></div><button type="button" class="ce-ai-close" id="ceAiClose">Cerrar</button></div>'+
        '<div class="ce-ai-prompt">'+
          '<textarea id="ceAiPrompt" placeholder="Ejemplos: Sácame una gráfica de barras por artículos más utilizados y separa comprado/donado.\nCompara la III Jornada Solidaria vs ELA con la IV Jornada Solidaria vs ELA en compras, donaciones, ingresos y valoración.\nHazme un CSV con productos más consumidos por coste."></textarea>'+
          '<div class="ce-ai-toolbar"><button type="button" class="ce-ai-run" id="ceAiRun">🧡 Zuzu</button><button type="button" class="ce-ai-secondary" id="ceAiClear">🧹</button><button type="button" class="ce-ai-secondary" id="ceAiDownloadResult" title="Imprimir / guardar en PDF">🖨️ PDF</button><span class="ce-ai-status" id="ceAiStatus"></span></div>'+
        '</div>'+
        '<div class="ce-ai-result" id="ceAiResult"></div>'+ 
      '</div></div>';
  }

  function zuzuPrintableCss(){
    return '<style>'+
      '@page{size:A4;margin:12mm}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;background:#fff;margin:0}.ce-print-wrap{padding:0}.ce-print-head{border:2px solid #f59e0b;border-radius:18px;padding:12px 16px;margin:0 0 14px;background:linear-gradient(90deg,#fff7ed,#fff)}.ce-print-head h1{font-size:22px;margin:0 0 8px;color:#7c2d12}.ce-print-meta{font-size:13px;font-weight:800;color:#475569}.ce-print-prompt{white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px;margin-top:10px}.ce-ai-card{break-inside:avoid;page-break-inside:avoid;background:#fff;border:1px solid #dbeafe;border-radius:14px;padding:12px;margin:0 0 12px;box-shadow:none}.ce-ai-card h3{margin:0 0 10px;color:#075985}.ce-ai-answer{white-space:pre-wrap;line-height:1.45;font-weight:650}.ce-ai-warning{background:#fff7ed;border-color:#fed7aa;color:#9a3412}.ce-ai-rejected{background:#fef2f2;border-color:#fecaca;color:#991b1b}.ce-ai-table-wrap{overflow:visible}.ce-ai-table{border-collapse:collapse;width:100%;font-size:12px}.ce-ai-table th,.ce-ai-table td{border:1px solid #dbeafe;padding:6px;text-align:left;vertical-align:top}.ce-ai-table th{background:#eff6ff;color:#075985}.ce-ai-bars{display:grid;gap:7px}.ce-ai-bar-row{display:grid;grid-template-columns:190px 1fr 82px;align-items:center;gap:8px}.ce-ai-bar-label{font-weight:800;overflow:hidden;text-overflow:ellipsis}.ce-ai-bar-track{height:20px;background:#e2e8f0;border-radius:999px;overflow:hidden}.ce-ai-bar-fill{height:100%;border-radius:999px}.ce-ai-bar-value{font-weight:900;color:#075985;text-align:right}.ce-ai-vbars{height:260px;display:flex;align-items:flex-end;gap:10px;border:1px solid #e0f2fe;border-radius:14px;background:linear-gradient(180deg,#fff,#f8fafc);padding:30px 10px 48px;overflow:visible}.ce-ai-vbar{height:100%;min-width:48px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;position:relative;flex:1}.ce-ai-vbar-col{width:34px;border-radius:10px 10px 0 0}.ce-ai-vbar-value{position:absolute;bottom:calc(100% + 6px);font-size:10px;font-weight:900;color:#075985;white-space:nowrap;transform:rotate(-90deg);transform-origin:center}.ce-ai-vbar-label{position:absolute;bottom:-38px;max-width:90px;text-align:center;font-size:10px;font-weight:900;color:#334155;line-height:1.1}.ce-ai-pie-wrap{display:flex;align-items:center;gap:18px;flex-wrap:wrap}.ce-ai-pie{width:190px;height:190px;border-radius:50%;box-shadow:inset 0 0 0 36px rgba(255,255,255,.82),0 6px 14px rgba(15,23,42,.10)}.ce-ai-pie.donut{box-shadow:inset 0 0 0 56px rgba(255,255,255,.88),0 6px 14px rgba(15,23,42,.10)}.ce-ai-pie-list{display:grid;gap:7px;min-width:220px}.ce-ai-pie-legend{font-weight:850}.ce-ai-pie-legend span{display:inline-block;width:13px;height:13px;border-radius:999px;margin-right:8px;vertical-align:middle}.ce-ai-line-svg{width:100%;height:260px;border:1px solid #e0f2fe;border-radius:14px;background:linear-gradient(180deg,#fff,#f8fafc)}.ce-ai-stacked-wrap{display:grid;gap:10px}.ce-ai-stack-row{display:grid;grid-template-columns:180px 1fr;gap:8px;align-items:center}.ce-ai-stack-label{font-weight:900;overflow:hidden;text-overflow:ellipsis}.ce-ai-stack-track{height:28px;background:#e2e8f0;border-radius:999px;display:flex;overflow:hidden}.ce-ai-stack-part{height:100%;display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:900;min-width:3px}.ce-ai-stack-legend{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;font-weight:900;color:#334155}.ce-ai-stack-legend span i{display:inline-block;width:12px;height:12px;border-radius:999px;margin-right:6px}.ce-ai-files,.ce-ai-file-btn,.ce-ai-preview{display:none!important}@media print{button{display:none!important}.ce-ai-card{box-shadow:none!important}}'+
      '</style>';
  }
  function printZuzuPdf(){
    var result=$('ceAiResult');
    if(!result || !trim(result.innerText||'')){
      setStatus('No hay respuesta para imprimir.', 'err');
      return;
    }
    var ev=currentEvent();
    var prompt=trim(($('ceAiPrompt')||{}).value||'');
    var title='ControlEvent - Respuesta de Zuzu';
    var win=null;
    try{ win=window.open('', '_blank'); }catch(_){ win=null; }
    if(!win){
      setStatus('El navegador ha bloqueado la ventana de impresión.', 'err');
      return;
    }
    var meta=[trim(ev&&ev.titulo)||'Evento', trim(ev&&ev.situacion)||'', new Date().toLocaleString('es-ES')].filter(Boolean).join(' · ');
    win.document.open();
    win.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>'+esc(title)+'</title>'+zuzuPrintableCss()+'</head><body><main class="ce-print-wrap"><header class="ce-print-head"><h1>✨ Soy Zuzu, respuesta completa</h1><div class="ce-print-meta">'+esc(meta)+'</div>'+(prompt?'<div class="ce-print-prompt"><strong>Pregunta:</strong> '+esc(prompt)+'</div>':'')+'</header>'+result.innerHTML+'</main><script>window.onload=function(){setTimeout(function(){try{window.focus();window.print();}catch(e){}},250)}<\/script></body></html>');
    win.document.close();
    setStatus('Abierta impresión: elige Guardar como PDF.', 'ok');
  }

  function clearZuzu(ev){
    if(ev){ try{ ev.preventDefault(); ev.stopPropagation(); }catch(_){ } }
    var p=$('ceAiPrompt'); if(p){ p.value=''; p.textContent=''; }
    var r=$('ceAiResult'); if(r){ r.innerHTML='<div class="ce-ai-card"><h3>Zuzu lista</h3><div class="ce-ai-answer">Escribe una pregunta sobre los eventos y pulsa Zuzu.</div></div>'; }
    setStatus('', '');
    try{ if(p) p.focus(); }catch(_){ }
  }
  function installPromptEventShield(){
    if(window.__ceZuzuPromptShieldV18) return;
    window.__ceZuzuPromptShieldV18 = true;
    var block = function(ev){
      var t = ev && ev.target;
      if(!t || !t.closest || !t.closest('#ceGeminiLibreOverlay #ceAiPrompt')) return;
      if(ev.type === 'keydown' && ev.key === 'Escape'){ closeModal(); try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ } return false; }
      try{ ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ }
      return undefined;
    };
    ['keydown','keyup','keypress','beforeinput','input','paste','compositionstart','compositionupdate','compositionend'].forEach(function(type){
      window.addEventListener(type, block, {capture:true, passive:false});
    });
  }
  function openModal(){
    injectStyle();
    installPromptEventShield();
    var old=$('ceGeminiLibreOverlay'); if(old) old.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml());
    var closeBtn=$('ceAiClose');
    if(closeBtn){ closeBtn.addEventListener('click',function(ev){ ev.preventDefault(); ev.stopPropagation(); closeModal(); }, true); }
    $('ceGeminiLibreOverlay').addEventListener('click',function(ev){ if(ev.target.id==='ceGeminiLibreOverlay') closeModal(); });
    document.addEventListener('keydown',function escClose(ev){ if(ev.key==='Escape' && $('ceGeminiLibreOverlay')){ closeModal(); document.removeEventListener('keydown', escClose, true); } }, true);
    $('ceAiRun').onclick=runAi;
    $('ceAiClear').onclick=function(ev){ clearZuzu(ev); };
    $('ceAiDownloadResult').onclick=printZuzuPdf;
    setTimeout(function(){ try{$('ceAiPrompt').focus();}catch(_){ } },80);
  }
  function closeModal(){ clearZuzuThinkingTimer(); var o=$('ceGeminiLibreOverlay'); if(o) o.remove(); }
  function setStatus(msg, kind){ var el=$('ceAiStatus'); if(!el) return; el.className='ce-ai-status '+(kind||''); el.textContent=msg||''; }
  function zuzuPromptFlags(prompt){
    var p=String(prompt||'').toLowerCase();
    return {
      charts:/\b(graf|gr[aá]fic|chart|dispersion|dispersi[oó]n|tendencia|linea|l[ií]nea|evoluci[oó]n)\b/i.test(p),
      allEvents:/\b(todos\s+los\s+eventos|eventos\s+registrados|a[nñ]o\s+\d{4}|celebraciones|\b\d+\s+eventos\b)\b/i.test(p),
      products:/\b(producto|productos|art[ií]culo|art[ií]culos|consumo|consumidos|comprados|donados)\b/i.test(p),
      tickets:/\b(ticket|tickets|tk\s*\d+)\b/i.test(p),
      incomes:/\b(ingreso|ingresos|recaudaci[oó]n|asistentes|socios)\b/i.test(p),
      docs:/\b(documentos?|doc\s*\d+|adjuntos?)\b/i.test(p),
      compare:/\b(compara|comparativa|frente|versus| vs |tendencia)\b/i.test(p)
    };
  }
  function buildZuzuThinkingSteps(prompt){
    var f=zuzuPromptFlags(prompt);
    var steps=[];
    steps.push({title:'Fase 1 · Leo tu petición literal', detail:'Identifico si pides eventos concretos, año completo, productos, compras, donaciones, ingresos, tickets, documentos o gráficas.'});
    steps.push({title:'Fase 2 · Zuzu decide módulos y filtros', detail:'Zuzu devuelve los módulos y filtros de datos que necesita; ControlEvent no manda todo, extrae solo lo necesario.'});
    if(f.allEvents) steps.push({title:'Fase 3 · Localizo eventos objetivo', detail:'Busco eventos por año, título, fechas y expresión “todos/celebraciones/eventos registrados”.'});
    else steps.push({title:'Fase 3 · Localizo el evento objetivo', detail:'Uso el evento activo y las referencias del texto para no mezclar eventos que no has pedido.'});
    var mods=[];
    if(f.incomes) mods.push('INGRESOS');
    if(f.products || f.charts || f.compare) mods.push('COMPRAS/DONACIONES/PRODUCTOS');
    if(f.tickets) mods.push('TICKETS');
    if(f.docs) mods.push('DOCUMENTOS');
    if(!mods.length) mods.push('EVENTOS y módulos relacionados');
    steps.push({title:'Fase 4 · Extraigo datos oficiales de ControlEvent', detail:'Módulos previstos: '+mods.join(' · ')+'. Se entregan nombres humanos, no códigos internos.'});
    if(f.charts) steps.push({title:'Fase 5 · Preparo datos para gráficas', detail:'Agrupo valores, fechas y productos para que Zuzu pueda devolver charts, tablas y CSV de detalle.'});
    else steps.push({title:'Fase 5 · Preparo tablas y métricas', detail:'Calculo totales oficiales, rankings y registros completos antes de entregar el contexto a Zuzu.'});
    steps.push({title:'Fase 6 · Zuzu cocina la respuesta', detail:'Zuzu recibe el prompt original más los módulos filtrados; ControlEvent no debe cambiar la conclusión por su cuenta.'});
    steps.push({title:'Fase 7 · Reviso formato y preparo salida', detail:'Valido JSON, gráficas, tablas y ficheros. Si falta información, Zuzu debe indicarlo claramente.'});
    return steps;
  }
  function clearZuzuThinkingTimer(){
    try{ if(window.__ceZuzuThinkingTimer){ clearInterval(window.__ceZuzuThinkingTimer); window.__ceZuzuThinkingTimer=null; } }catch(_){ }
  }
  function startZuzuThinking(prompt){
    clearZuzuThinkingTimer();
    var resEl=$('ceAiResult');
    if(!resEl) return;
    var steps=buildZuzuThinkingSteps(prompt);
    var idx=0;
    resEl.innerHTML='<div class="ce-ai-card ce-ai-loading" id="ceAiThinkingCard"><h3>🧡 Zuzu está pensando...</h3><div class="ce-ai-thinking"><div class="ce-ai-thinking-orb" aria-hidden="true"></div><div class="ce-ai-thinking-lines is-live"><span class="ce-ai-step-title" id="ceAiThinkingTitle"></span><small id="ceAiThinkingDetail"></small><small class="ce-ai-step-counter" id="ceAiThinkingCounter"></small></div></div></div>';
    function paint(){
      var step=steps[idx % steps.length] || steps[0];
      var t=$('ceAiThinkingTitle'), d=$('ceAiThinkingDetail'), c=$('ceAiThinkingCounter');
      if(t) t.textContent=step.title;
      if(d) d.textContent=step.detail;
      if(c) c.textContent='Avance visual rápido · '+(idx+1)+'/'+steps.length;
      setStatus(step.title.replace(/^Fase\s*\d+\s*·\s*/,'Zuzu: '), 'ok');
      idx += 1;
    }
    paint();
    window.__ceZuzuThinkingTimer=setInterval(paint,650);
  }
  function stopZuzuThinking(){ clearZuzuThinkingTimer(); }
  async function runAi(){
    var ev=currentEvent();
    if(!ev){ setStatus('Selecciona un evento antes de consultar.', 'err'); return; }
    var prompt=trim(($('ceAiPrompt')||{}).value||'');
    if(!prompt){ setStatus('Escribe primero la petición.', 'err'); return; }
    setStatus('Zuzu está preparando el plan...', 'ok');
    var resEl=$('ceAiResult');
    startZuzuThinking(prompt);
    try{
      var res=await fetch('/api/event-ai/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:prompt,selectedEventId:selectedEventId()})});
      var data=await res.json().catch(function(){ return {}; });
      if(!res.ok || data.ok===false) throw new Error(data.error || ('HTTP '+res.status));
      data.__prompt = prompt;
      stopZuzuThinking();
      renderResult(data);
      setStatus(data.rejected?'Petición rechazada por ámbito.':'Respuesta generada.', data.rejected?'err':'ok');
    }catch(err){
      stopZuzuThinking();
      resEl.innerHTML='<div class="ce-ai-card ce-ai-rejected"><h3>No se pudo consultar Zuzu</h3><div class="ce-ai-answer">'+esc(err&&err.message||err)+'</div></div>';
      setStatus('Error', 'err');
    }
  }
  function renderResult(data){
    data = data || {};
    if((!Array.isArray(data.charts) || !data.charts.length) && wantsChart(data.__prompt || '')) data.charts = autoChartsFromTables(data.tables || []);
    var html='';
    var cls=data.rejected?' ce-ai-rejected':'';
    html+='<div class="ce-ai-card'+cls+'"><h3>'+esc(data.title||'Resultado')+'</h3><div class="ce-ai-answer">'+esc(data.answer||'')+'</div></div>';
    if((data.rejected || data.showWarnings === true || data.provider === 'gemini-rest-json-fallback') && Array.isArray(data.warnings) && data.warnings.length){ html+='<div class="ce-ai-card ce-ai-warning"><h3>Avisos</h3><ul>'+data.warnings.map(function(w){return '<li>'+esc(w)+'</li>';}).join('')+'</ul></div>'; }
    (data.charts||[]).forEach(function(ch){ html+=chartHtml(ch); });
    (data.tables||[]).forEach(function(tb){ html+=tableHtml(tb); });
    if(Array.isArray(data.files) && data.files.length){
      html+='<div class="ce-ai-card"><h3>Archivos generados</h3><div class="ce-ai-files">';
      data.files.forEach(function(f,i){ html+='<button type="button" class="ce-ai-file-btn" data-file-index="'+i+'">⬇️ '+esc(f.filename||('archivo_'+(i+1)))+'</button><button type="button" class="ce-ai-file-btn" data-file-preview="'+i+'">👁️ Ver</button>'; });
      html+='</div><div id="ceAiFilePreview" class="ce-ai-preview" style="display:none"></div></div>';
    }
    var el=$('ceAiResult'); el.innerHTML=html;
    el.querySelectorAll('[data-file-index]').forEach(function(btn){ btn.onclick=function(){ var f=data.files[Number(btn.dataset.fileIndex)]; downloadText(f.content||'', f.filename||'archivo.txt', f.mime||'text/plain;charset=utf-8'); }; });
    el.querySelectorAll('[data-file-preview]').forEach(function(btn){ btn.onclick=function(){ var f=data.files[Number(btn.dataset.filePreview)]; var p=$('ceAiFilePreview'); if(!p) return; p.style.display='block'; p.textContent=f.content||''; }; });
  }
  function wantsChart(p){ return /\b(graf|gr[aá]fic|chart|barras|tarta|pastel|donut|linea|línea|comparativ)/i.test(String(p||'')); }
  function autoChartsFromTables(tables){
    var out=[]; (tables||[]).some(function(tb){
      var cols=tb.columns||[], rows=tb.rows||[]; if(!cols.length || !rows.length) return false;
      var labelIdx=0, numIdx=-1;
      for(var c=cols.length-1;c>=0;c--){ if(rows.some(function(r){ return !isNaN(Number(String(r[c]||'').replace(',','.').replace(/[^0-9.-]/g,''))); })){ numIdx=c; break; } }
      if(numIdx<=0) return false;
      var labels=rows.slice(0,20).map(function(r){return String(r[labelIdx]||'');});
      var values=rows.slice(0,20).map(function(r){return Number(String(r[numIdx]||'0').replace(',','.').replace(/[^0-9.-]/g,''))||0;});
      out.push({title:'Gráfica generada desde '+(tb.title||'tabla'),type:'horizontalBar',labels:labels,values:values,unit:/€|importe|valor|precio|total/i.test(cols[numIdx]||'')?'€':''});
      return true;
    }); return out;
  }
  function chartHtml(ch){
    var labels=(ch.labels||[]).map(String), values=(ch.values||[]).map(Number); var max=Math.max.apply(null, values.concat([1]));
    var type=String(ch.type||'bar').toLowerCase();
    if(type==='pie' || type==='donut') return pieChartHtml(ch, labels, values, type==='donut');
    if(type==='line') return lineChartHtml(ch, labels, values);
    if(type==='stackedbar' || (Array.isArray(ch.series) && ch.series.length)) return stackedChartHtml(ch);
    if(type==='bar' || type==='verticalbar') return verticalChartHtml(ch, labels, values);
    var rows=labels.map(function(l,i){ var v=Number(values[i]||0); var pct=Math.max(2, Math.min(100, (v/max)*100)); return '<div class="ce-ai-bar-row"><div class="ce-ai-bar-label" title="'+esc(l)+'">'+esc(l)+'</div><div class="ce-ai-bar-track"><div class="ce-ai-bar-fill" style="width:'+pct.toFixed(1)+'%;background:'+chartColor(i)+'"></div></div><div class="ce-ai-bar-value">'+esc(formatNumber(v))+' '+esc(ch.unit||'')+'</div></div>'; }).join('');
    return '<div class="ce-ai-card"><h3>'+esc(ch.title||'Gráfica')+'</h3><div class="ce-ai-bars">'+rows+'</div></div>';
  }
  function formatNumber(v){ return Number(v||0).toLocaleString('es-ES',{maximumFractionDigits:2}); }
  function chartColor(i){ return ['#38bdf8','#f97316','#22c55e','#e11d48','#8b5cf6','#14b8a6','#facc15','#64748b'][i%8]; }
  function pieChartHtml(ch, labels, values, donut){
    var total=values.reduce(function(a,b){return a+Number(b||0);},0)||1; var acc=0;
    var stops=values.map(function(v,i){ var start=acc; acc += (Number(v||0)/total)*100; return chartColor(i)+' '+start.toFixed(2)+'% '+acc.toFixed(2)+'%'; }).join(',');
    var legend=labels.map(function(l,i){ return '<div class="ce-ai-pie-legend"><span style="background:'+chartColor(i)+'"></span>'+esc(l)+' · '+esc(formatNumber(values[i]))+' '+esc(ch.unit||'')+'</div>'; }).join('');
    return '<div class="ce-ai-card"><h3>'+esc(ch.title||'Gráfica')+'</h3><div class="ce-ai-pie-wrap"><div class="ce-ai-pie '+(donut?'donut':'')+'" style="background:conic-gradient('+stops+')"></div><div class="ce-ai-pie-list">'+legend+'</div></div></div>';
  }
  function lineChartHtml(ch, labels, values){
    var w=900,h=300,pad=34,max=Math.max.apply(null, values.concat([1])), min=Math.min.apply(null, values.concat([0]));
    var pts=values.map(function(v,i){ var x=pad + (labels.length<=1?0:(i*(w-pad*2)/(labels.length-1))); var y=h-pad-((Number(v)-min)/(max-min||1))*(h-pad*2); return [x,y]; });
    var path=pts.map(function(pt,i){return (i?'L':'M')+pt[0].toFixed(1)+','+pt[1].toFixed(1);}).join(' ');
    var dots=pts.map(function(pt,i){return '<circle cx="'+pt[0].toFixed(1)+'" cy="'+pt[1].toFixed(1)+'" r="4" fill="'+chartColor(i)+'"><title>'+esc(labels[i]+' '+formatNumber(values[i])+' '+(ch.unit||''))+'</title></circle>';}).join('');
    return '<div class="ce-ai-card"><h3>'+esc(ch.title||'Gráfica')+'</h3><svg class="ce-ai-line-svg" viewBox="0 0 '+w+' '+h+'"><path d="'+path+'" fill="none" stroke="#0ea5e9" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>'+dots+'</svg></div>';
  }
  function stackedChartHtml(ch){
    var labels=(ch.labels||[]).map(String); var series=(ch.series||[]);
    if(!series.length) return chartHtml({title:ch.title,type:'horizontalBar',labels:labels,values:(ch.values||[]),unit:ch.unit});
    var totals=labels.map(function(_,i){return series.reduce(function(a,s){return a+(Number((s.values||[])[i])||0);},0);}); var max=Math.max.apply(null, totals.concat([1]));
    var rows=labels.map(function(l,i){ var parts=series.map(function(s,si){ var v=Number((s.values||[])[i]||0); var pct=Math.max(v?3:0,(v/max)*100); return '<div class="ce-ai-stack-part" title="'+esc((s.name||'Serie')+': '+formatNumber(v)+' '+(ch.unit||''))+'" style="width:'+pct.toFixed(1)+'%;background:'+chartColor(si)+'">'+(v?esc(formatNumber(v)):'')+'</div>'; }).join(''); return '<div class="ce-ai-stack-row"><div class="ce-ai-stack-label" title="'+esc(l)+'">'+esc(l)+'</div><div class="ce-ai-stack-track">'+parts+'</div></div>'; }).join('');
    var leg=series.map(function(s,i){return '<span><i style="background:'+chartColor(i)+'"></i>'+esc(s.name||('Serie '+(i+1)))+'</span>';}).join('');
    return '<div class="ce-ai-card"><h3>'+esc(ch.title||'Gráfica')+'</h3><div class="ce-ai-stacked-wrap">'+rows+'</div><div class="ce-ai-stack-legend">'+leg+'</div></div>';
  }
  function verticalChartHtml(ch, labels, values){
    var max=Math.max.apply(null, values.concat([1]));
    var bars=labels.map(function(l,i){ var v=Number(values[i]||0); var h=Math.max(4, Math.min(100,(v/max)*100)); return '<div class="ce-ai-vbar"><div class="ce-ai-vbar-value">'+esc(formatNumber(v))+' '+esc(ch.unit||'')+'</div><div class="ce-ai-vbar-col" style="height:'+h.toFixed(1)+'%;background:'+chartColor(i)+'"></div><div class="ce-ai-vbar-label" title="'+esc(l)+'">'+esc(l)+'</div></div>'; }).join('');
    return '<div class="ce-ai-card"><h3>'+esc(ch.title||'Gráfica')+'</h3><div class="ce-ai-vbars">'+bars+'</div></div>';
  }
  function tableHtml(tb){
    var head=(tb.columns||[]).map(function(c){return '<th>'+esc(c)+'</th>';}).join('');
    var rows=(tb.rows||[]).map(function(r){ return '<tr>'+r.map(function(c){return '<td>'+esc(c)+'</td>';}).join('')+'</tr>'; }).join('');
    return '<div class="ce-ai-card"><h3>'+esc(tb.title||'Tabla')+'</h3><div class="ce-ai-table-wrap"><table class="ce-ai-table"><thead><tr>'+head+'</tr></thead><tbody>'+rows+'</tbody></table></div></div>';
  }
  function tick(){ injectStyle(); injectButton(); bindOpenButton($('ceGeminiLibreBtn')); var title=$('ceAiEventTitle'); if(title) title.innerHTML=eventTitleHtml(); }
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted','controlevent:event-ready','controlevent:event-loaded'].forEach(function(evt){ window.addEventListener(evt,function(){ setTimeout(tick,80); }); });
  document.addEventListener('click',function(ev){ if(ev.target && ev.target.closest && ev.target.closest('#tabGraficasBtn')) setTimeout(tick,180); }, true);
  document.addEventListener('change',function(ev){ if(ev.target && ev.target.id==='selectedEvent') setTimeout(tick,250); }, true);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',tick,{once:true}); else tick();
  document.addEventListener('click',function(ev){ var t=ev.target; if(t && t.closest && t.closest('#ceGeminiLibreOverlay .ce-ai-close')){ ev.preventDefault(); ev.stopPropagation(); closeModal(); } }, true);
  document.addEventListener('touchend',function(ev){ var b=ev.target&&ev.target.closest&&ev.target.closest('#ceGeminiLibreBtn'); if(b) openFromButton(ev); }, { passive:false, capture:true });
  document.addEventListener('click',function(ev){ var b=ev.target&&ev.target.closest&&ev.target.closest('#ceGeminiLibreBtn'); if(b) openFromButton(ev); }, true);
  document.addEventListener('click',function(ev){ var b=ev.target&&ev.target.closest&&ev.target.closest('#ceAiClear'); if(b){ clearZuzu(ev); } }, true);
  window.ControlEventV113ZuzuAnalitica={open:openModal, install:tick};
})();
