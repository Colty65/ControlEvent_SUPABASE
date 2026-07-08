/* ControlEvent v19_prod - Zuzu / Analítica libre de explotación del evento.
   Solo lectura. Disponible para GD/RW/RO y eventos En curso/Finalizado. */
(function(){
  'use strict';
  if(window.__ceV112ZuzuAnalitica) return; window.__ceV112ZuzuAnalitica=true;
  var VERSION='v19_prod';
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
      '#ceGeminiLibreOverlay .ce-ai-table-wrap{overflow:auto}#ceGeminiLibreOverlay .ce-ai-table{border-collapse:collapse;width:100%;font-size:14px}#ceGeminiLibreOverlay .ce-ai-table th,#ceGeminiLibreOverlay .ce-ai-table td{border:1px solid #dbeafe;padding:7px 8px;text-align:left}#ceGeminiLibreOverlay .ce-ai-table th{background:#eff6ff;color:#075985}#ceGeminiLibreOverlay .ce-ai-bars{display:grid;gap:8px}#ceGeminiLibreOverlay .ce-ai-bar-row{display:grid;grid-template-columns:minmax(120px,260px) 1fr auto;align-items:center;gap:10px}#ceGeminiLibreOverlay .ce-ai-bar-label{font-weight:800;color:#0f172a;overflow:hidden;text-overflow:ellipsis}#ceGeminiLibreOverlay .ce-ai-bar-track{height:22px;background:#e2e8f0;border-radius:999px;overflow:hidden}#ceGeminiLibreOverlay .ce-ai-bar-fill{height:100%;background:#38bdf8;border-radius:999px}#ceGeminiLibreOverlay .ce-ai-bar-value{font-weight:900;color:#075985;min-width:78px;text-align:right}#ceGeminiLibreOverlay .ce-ai-loading{background:#fff7ed;border-color:#fed7aa}#ceGeminiLibreOverlay .ce-ai-spinner{display:inline-block;animation:ceZuzuPulse 1s infinite ease-in-out}@keyframes ceZuzuPulse{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.25);opacity:1}}#ceGeminiLibreOverlay .ce-ai-files{display:flex;gap:8px;flex-wrap:wrap}#ceGeminiLibreOverlay .ce-ai-file-btn{background:#e0f2fe!important;color:#075985!important;border:1px solid #7dd3fc!important;border-radius:12px!important;padding:8px 12px!important;font-weight:900!important}#ceGeminiLibreOverlay .ce-ai-preview{margin-top:10px;background:#0f172a;color:#e2e8f0;border-radius:14px;padding:12px;max-height:240px;overflow:auto;white-space:pre-wrap}\n'+
      '@media(max-width:760px){#ceGeminiLibreOverlay .ce-ai-modal{width:98vw;height:96vh}#ceGeminiLibreOverlay .ce-ai-head h2{font-size:18px}.ce-ai-free-btn{height:42px;min-width:46px;font-size:21px}#ceGeminiLibreOverlay .ce-ai-prompt textarea{min-height:96px}#ceGeminiLibreOverlay .ce-ai-bar-row{grid-template-columns:1fr}#ceGeminiLibreOverlay .ce-ai-bar-value{text-align:left}}\n';
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
          '<div class="ce-ai-toolbar"><button type="button" class="ce-ai-run" id="ceAiRun">🧡 Zuzu</button><button type="button" class="ce-ai-secondary" id="ceAiClear">🧹</button><button type="button" class="ce-ai-secondary" id="ceAiDownloadResult">⬇️</button><span class="ce-ai-status" id="ceAiStatus"></span></div>'+
        '</div>'+
        '<div class="ce-ai-result" id="ceAiResult"><div class="ce-ai-card"><h3>Primera versión</h3><div class="ce-ai-answer">Soy Zuzu. Pregúntame sobre ingresos, compras, donaciones, tickets, responsables, tiendas, documentos, productos, valoración o comparativas entre eventos. Si la petición es demasiado amplia, te pediré que la concretes para no darte una respuesta sesgada.</div></div></div>'+ 
      '</div></div>';
  }
  function openModal(){
    injectStyle();
    var old=$('ceGeminiLibreOverlay'); if(old) old.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml());
    var closeBtn=$('ceAiClose');
    if(closeBtn){ closeBtn.addEventListener('click',function(ev){ ev.preventDefault(); ev.stopPropagation(); closeModal(); }, true); }
    $('ceGeminiLibreOverlay').addEventListener('click',function(ev){ if(ev.target.id==='ceGeminiLibreOverlay') closeModal(); });
    document.addEventListener('keydown',function escClose(ev){ if(ev.key==='Escape' && $('ceGeminiLibreOverlay')){ closeModal(); document.removeEventListener('keydown', escClose, true); } }, true);
    $('ceAiRun').onclick=runAi;
    $('ceAiClear').onclick=function(){ $('ceAiPrompt').value=''; $('ceAiResult').innerHTML=''; setStatus('', ''); };
    $('ceAiDownloadResult').onclick=function(){ downloadText(($('ceAiResult')||{}).innerText||'', 'ControlEvent_Analitica_libre_'+Date.now()+'.txt', 'text/plain;charset=utf-8'); };
    setTimeout(function(){ try{$('ceAiPrompt').focus();}catch(_){ } },80);
  }
  function closeModal(){ var o=$('ceGeminiLibreOverlay'); if(o) o.remove(); }
  function setStatus(msg, kind){ var el=$('ceAiStatus'); if(!el) return; el.className='ce-ai-status '+(kind||''); el.textContent=msg||''; }
  async function runAi(){
    var ev=currentEvent();
    if(!ev){ setStatus('Selecciona un evento antes de consultar.', 'err'); return; }
    var prompt=trim(($('ceAiPrompt')||{}).value||'');
    if(!prompt){ setStatus('Escribe primero la petición.', 'err'); return; }
    setStatus('Zuzu está preparando los datos…', 'ok');
    var resEl=$('ceAiResult');
    resEl.innerHTML='<div class="ce-ai-card ce-ai-loading"><h3>🧡 Zuzu está trabajando</h3><div class="ce-ai-answer"><span class="ce-ai-spinner">⏳</span> Preparando contexto seguro, extrayendo datos completos y consultando Gemini...</div></div>';
    try{
      var res=await fetch('/api/event-ai/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:prompt,selectedEventId:selectedEventId()})});
      var data=await res.json().catch(function(){ return {}; });
      if(!res.ok || data.ok===false) throw new Error(data.error || ('HTTP '+res.status));
      renderResult(data);
      setStatus(data.rejected?'Petición rechazada por ámbito.':'Respuesta generada.', data.rejected?'err':'ok');
    }catch(err){
      resEl.innerHTML='<div class="ce-ai-card ce-ai-rejected"><h3>No se pudo consultar Gemini</h3><div class="ce-ai-answer">'+esc(err&&err.message||err)+'</div></div>';
      setStatus('Error', 'err');
    }
  }
  function renderResult(data){
    var html='';
    var cls=data.rejected?' ce-ai-rejected':'';
    html+='<div class="ce-ai-card'+cls+'"><h3>'+esc(data.title||'Resultado')+'</h3><div class="ce-ai-answer">'+esc(data.answer||'')+'</div>'+(data.provider?'<p style="color:#64748b;font-weight:800;margin:10px 0 0">IA: '+esc(data.provider)+' '+esc(data.model||'')+'</p>':'')+'</div>';
    if(Array.isArray(data.warnings) && data.warnings.length){ html+='<div class="ce-ai-card ce-ai-warning"><h3>Avisos</h3><ul>'+data.warnings.map(function(w){return '<li>'+esc(w)+'</li>';}).join('')+'</ul></div>'; }
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
  function chartHtml(ch){
    var labels=(ch.labels||[]).map(String), values=(ch.values||[]).map(Number); var max=Math.max.apply(null, values.concat([1]));
    var rows=labels.map(function(l,i){ var v=Number(values[i]||0); var pct=Math.max(2, Math.min(100, (v/max)*100)); return '<div class="ce-ai-bar-row"><div class="ce-ai-bar-label" title="'+esc(l)+'">'+esc(l)+'</div><div class="ce-ai-bar-track"><div class="ce-ai-bar-fill" style="width:'+pct.toFixed(1)+'%"></div></div><div class="ce-ai-bar-value">'+esc(formatNumber(v))+' '+esc(ch.unit||'')+'</div></div>'; }).join('');
    return '<div class="ce-ai-card"><h3>'+esc(ch.title||'Gráfica')+'</h3><div class="ce-ai-bars">'+rows+'</div></div>';
  }
  function formatNumber(v){ return Number(v||0).toLocaleString('es-ES',{maximumFractionDigits:2}); }
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
  window.ControlEventV112ZuzuAnalitica={open:openModal, install:tick};
})();
