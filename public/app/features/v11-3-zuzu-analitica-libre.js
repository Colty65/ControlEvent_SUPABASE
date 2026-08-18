/* ControlEvent v2.0_exp - Zuzu / Analítica libre de explotación del evento.
   Solo lectura. Disponible para GD/RW/RO y eventos En curso/Finalizado. */
(function(){
  'use strict';
  if(window.__ceV113ZuzuAnalitica) return; window.__ceV113ZuzuAnalitica=true;
  var VERSION='v2.0_exp';
  function $(id){ return document.getElementById(id); }
  function text(v){ return v==null?'':String(v); }
  function trim(v){ return text(v).trim(); }
  function withoutGeminiLabel(v){ return text(v).replace(/gemini(?:[-_. ]?2\.5[-_. ]?flash)?/gi,'IA'); }
  function esc(v){ return text(v).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];}); }
  function safe(fn,fb){ try{ var v=fn(); return v===undefined?fb:v; }catch(_){ return fb; } }
  function st(){ return safe(function(){ return (typeof state!=='undefined'&&state)||window.state||{}; }, window.state||{}); }
  function arr(k){ var s=st(); return Array.isArray(s[k])?s[k]:[]; }
  function selectedEventId(){ return trim((st().selectedEventId)||(($('selectedEvent')||{}).value)||''); }
  function currentEvent(){ var id=selectedEventId(); return arr('eventos').find(function(e){ return trim(e.id)===id; }) || null; }
  function loggedUserPayload(){
    var u=window.authUser || window.__CONTROL_EVENT_USER__ || (window.ControlEventApp&&window.ControlEventApp.authUser) || {};
    var identificacion=trim(u.identificacion||u.Identificacion||u.usuario||u.user||'');
    var nombre=trim(u.nombre||u.Nombre||u.name||identificacion||'');
    var nivel=trim(u.nivel||u.Nivel||'').toUpperCase();
    return (identificacion||nombre)?{identificacion:identificacion,nombre:nombre,nivel:nivel}:null;
  }
  function loggedUserDisplayName(){ var u=loggedUserPayload()||{}; return trim(u.identificacion||u.nombre||'usuario')||'usuario'; }
  function stripZuzuCssLeak(value){
    var src=String(value||'');
    src=src.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'');
    src=src.replace(/```(?:css)?\s*[\s\S]*?```/gi,function(block){ return /\.gemini-response|font-family|font-size|margin-(?:top|bottom)/i.test(block)?'':block; });
    if(/\.gemini-response\s*\{/i.test(src)){
      src=src.replace(/(?:\.gemini-response(?:\s+[.#a-z0-9_-]+|\s*:[a-z-]+)?\s*\{[^}]*\}\s*)+/gi,'');
    }
    return src.replace(/^[\s;]+/,'').trim();
  }
  function ensureZuzuUserPreface(value){
    var src=stripZuzuCssLeak(value); if(!src) return src;
    // v2.0_exp: la respuesta empieza directamente. Eliminamos también el saludo
    // si llega de una conversación antigua o el modelo lo genera por inercia.
    return src.replace(/^(?:Te|Le)\s+comento\s*,\s*[^.:\n]{1,120}[.:]\s*/i,'').replace(/^(?:Respuesta|Contestaci[oó]n|Informe)\s+(?:de\s+)?Zuzu\s*[:.\-–—]*\s*/i,'').replace(/^Zuzu\s+(?:responde|contesta)\s*[:.\-–—]*\s*/i,'').trim();
  }
  function mdTableCells(line){
    var raw=String(line||'').trim();
    if(raw.indexOf('|')<0)return null;
    if(raw.charAt(0)==='|')raw=raw.slice(1);
    if(raw.charAt(raw.length-1)==='|')raw=raw.slice(0,-1);
    return raw.split('|').map(function(cell){return cell.trim();});
  }
  function isMdTableSeparator(line){
    var cells=mdTableCells(line);
    return !!(cells&&cells.length>=2&&cells.every(function(cell){return /^:?-{3,}:?$/.test(String(cell||'').replace(/\s+/g,''));}));
  }
  function answerDisplayHtml(value){
    // Gemini debe usar show_tables, pero si alguna respuesta conversacional trae una tabla
    // Markdown, la presentamos como tabla real en pantalla/PDF en vez de enseñar las barras |.
    var lines=String(value||'').replace(/\r\n?/g,'\n').split('\n'),out=[],i=0;
    while(i<lines.length){
      var head=mdTableCells(lines[i]);
      if(head&&head.length>=2&&i+1<lines.length&&isMdTableSeparator(lines[i+1])){
        var rows=[];i+=2;
        while(i<lines.length){
          var row=mdTableCells(lines[i]);
          if(!row||row.length<2||String(lines[i]).indexOf('|')<0)break;
          rows.push(row);i++;
        }
        var cols=head.length;
        var th=head.map(function(cell){return '<th>'+esc(cell)+'</th>';}).join('');
        var tb=rows.map(function(row){
          var cells=[];for(var c=0;c<cols;c++)cells.push('<td>'+esc(row[c]||'')+'</td>');
          return '<tr>'+cells.join('')+'</tr>';
        }).join('');
        out.push('<div class="ce-ai-inline-table-wrap"><table class="ce-ai-table ce-ai-inline-md-table"><thead><tr>'+th+'</tr></thead><tbody>'+tb+'</tbody></table></div>');
        continue;
      }
      out.push(esc(lines[i]));i++;
    }
    return out.join('\n');
  }
  function isFinalized(ev){ return /^finalizado$/i.test(trim(ev&&ev.situacion)); }
  function eventTitleHtml(){
    var ev=currentEvent();
    if(!ev) return '<span class="ce-ai-event-warn">Selecciona un evento</span>';
    var cls=isFinalized(ev)?'ce-ai-event-final':'ce-ai-event-open';
    return '<span class="'+cls+'">'+esc(trim(ev.titulo)||'Evento')+'</span><span class="ce-ai-event-state">'+esc(trim(ev.situacion||'En curso'))+'</span>';
  }
  function fileSafe(v){ return trim(v||'resultado').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,'_').slice(0,90)||'resultado'; }
  function dateStamp(d){
    d=d||new Date();
    function z(n){ return String(n).padStart(2,'0'); }
    return d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+'-'+z(d.getHours())+z(d.getMinutes())+z(d.getSeconds());
  }
  function prettyDateTime(d){ return (d||new Date()).toLocaleString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}); }
  function cleanSubject(v){ return fileSafe(v||'consulta').replace(/^_+|_+$/g,'').slice(0,80)||'consulta'; }
  function questionSubject60(v){
    var q=trim(v||'consulta').replace(/[\\/:*?"<>|#\x00-\x1f]+/g,' ').replace(/\s+/g,' ').trim();
    q=Array.from(q).slice(0,60).join('').trim();
    return (q||'consulta').replace(/\s+/g,'_');
  }
  function responseMetaLabel(data){
    data=data||{}; var m=data.meta||{};
    if(m.eventHeader){
      return String(m.eventHeader).replace(/^Consulta\s+restringida/i,'Comparativa').replace(/^Consulta\s+global/i,'Varios eventos');
    }
    if((m.scopeKind==='multi-event' || m.scopeKind==='multi-event-restricted') && m.eventCount) return 'Varios eventos · '+m.eventCount+' eventos';
    if(m.scopeKind==='single-event' && m.eventHeader) return m.eventHeader;
    return '';
  }
  function explicitTechnicalView(prompt){
    var p=trim(prompt||'');
    return /\b(sql|select|consulta\s+sql|resultado\s+crudo|sentencia|query\s+t[eé]cnica)\b/i.test(p)
      && /\b(muestra|enseña|ensena|ver|detalle|literal|crudo|t[eé]cnic|audita|auditor[ií]a)\b/i.test(p);
  }
  function isTechnicalHeading(value){
    return /\b(select|sql|rpc|trazabilidad|recorrido\s+t[eé]cnico|tokens?|modelo\s+gemini)\b/i.test(trim(value||''));
  }
  function userFacingTitle(data, prompt){
    data=data||{};
    var raw=trim(data.title||'');
    var p=trim(prompt||data.__prompt||'');
    var genericZuzu=/^(?:respuesta|contestaci[oó]n|informe)\s+(?:de\s+)?zuzu\b|^zuzu\s+(?:responde|contesta)\b/i.test(raw);
    if(raw && !isTechnicalHeading(raw) && !genericZuzu) return raw;
    if(genericZuzu) return '';
    var comparison=/\b(compara|comparativa|comparar|frente\s+a|versus|\bvs\b)\b/i.test(p);
    var weather=/\b(meteorol[oó]g\w*|metereol[oó]g\w*|meteo\w*|tiempo|clima|lluvia|temperatura|viento|previsi[oó]n)\b/i.test(p);
    if(comparison && weather) return 'Comparativa de eventos y meteorología';
    if(comparison) return 'Comparativa de eventos';
    if(weather) return 'Informe del evento y meteorología';
    return 'Informe de ControlEvent';
  }
  function userFacingWarnings(values, allowTechnical){
    var list=Array.isArray(values)?values:[];
    if(allowTechnical) return list;
    return list.filter(function(value){
      return !/\b(select|sql|rpc|tokens?|gemini|modelo|trazabilidad|t[eé]cnic\w*|m[oó]dulos?\s+extra[ií]dos|provider)\b/i.test(trim(value||''));
    });
  }
  function responsePdfTitle(data, prompt){
    data=data||{};
    var subject=questionSubject60(prompt || data.__prompt || 'consulta');
    var stamp=dateStamp(new Date());
    return 'ControlEvent_v2.0_exp-responde_Zuzu_a_'+subject+'-'+stamp+'.pdf';
  }
  function responseScopeTitleHtml(data){
    var label=responseMetaLabel(data);
    if(!label) return eventTitleHtml();
    var parts=String(label).split(' · ');
    var title=parts.shift()||label;
    var state=parts.join(' · ');
    var cls=/finalizado/i.test(state)?'ce-ai-event-final':(/en curso/i.test(state)?'ce-ai-event-open':'ce-ai-event-warn');
    return '<span class="'+cls+'">'+esc(title)+'</span>'+(state?'<span class="ce-ai-event-state">'+esc(state)+'</span>':'');
  }
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
      '#ceGeminiLibreOverlay .ce-ai-head h2{margin:0;color:#7c2d12;font-size:24px;flex:0 0 auto}#ceGeminiLibreOverlay .ce-ai-version-badge{font-size:12px;font-weight:950;color:#075985;background:#e0f2fe;border:1px solid #7dd3fc;border-radius:999px;padding:3px 9px;white-space:nowrap}#ceAiEventTitle{flex:1;text-align:center}#ceGeminiLibreOverlay .ce-ai-head .spacer{display:none}#ceGeminiLibreOverlay .ce-ai-close{border-radius:14px!important;background:#fff!important;color:#0f172a!important;border:1px solid #cbd5e1!important;padding:10px 18px!important;font-weight:900!important;flex:0 0 auto}\n'+
      '#ceGeminiLibreOverlay .ce-ai-event-open{color:#15803d;font-weight:900;font-size:18px}#ceGeminiLibreOverlay .ce-ai-event-final{color:#dc2626;font-weight:900;font-size:18px}#ceGeminiLibreOverlay .ce-ai-event-warn{color:#b45309;font-weight:900}#ceGeminiLibreOverlay .ce-ai-event-state{display:inline-block;margin-left:18px;font-size:15px;color:#475569;font-weight:900;background:#f1f5f9;border-radius:999px;padding:3px 12px}\n'+
      '#ceGeminiLibreOverlay .ce-ai-prompt{padding:10px 14px;border-bottom:1px solid #e5e7eb;background:#fff}#ceGeminiLibreOverlay .ce-ai-prompt textarea{width:100%;height:82px;min-height:82px;max-height:118px;resize:vertical;border:1px solid #fb923c;border-radius:13px;padding:10px 11px;font-size:15px;line-height:1.35;box-sizing:border-box}#ceGeminiLibreOverlay .ce-ai-toolbar{display:flex;align-items:center;gap:5px;margin-top:7px;flex-wrap:wrap}#ceGeminiLibreOverlay .ce-ai-run{background:#f97316!important;color:#fff!important;border:0!important;border-radius:11px!important;padding:8px 12px!important;font-size:12px!important;min-height:32px!important;font-weight:900!important;transform-origin:center;will-change:transform,box-shadow}#ceGeminiLibreOverlay .ce-ai-run.is-thinking{animation:ceZuzuHeartbeat 1.08s cubic-bezier(.4,0,.2,1) infinite!important;box-shadow:0 0 0 0 rgba(249,115,22,.34)}@keyframes ceZuzuHeartbeat{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(249,115,22,.16)}14%{transform:scale(1.12);box-shadow:0 0 0 7px rgba(249,115,22,.13)}28%{transform:scale(.985);box-shadow:0 0 0 2px rgba(249,115,22,.08)}43%{transform:scale(1.075);box-shadow:0 0 0 5px rgba(249,115,22,.10)}62%{transform:scale(1);box-shadow:0 0 0 0 rgba(249,115,22,0)}}@media (prefers-reduced-motion:reduce){#ceGeminiLibreOverlay .ce-ai-run.is-thinking{animation-duration:1.65s!important}}#ceGeminiLibreOverlay .ce-ai-secondary{background:#fff!important;color:#0f172a!important;border:1px solid #cbd5e1!important;border-radius:10px!important;padding:7px 9px!important;font-size:11px!important;min-height:32px!important;font-weight:900!important}#ceGeminiLibreOverlay .ce-ai-status{font-weight:850;font-size:10px;margin-left:3px;flex:0 1 auto;white-space:nowrap}#ceGeminiLibreOverlay .ce-ai-status.ok{color:#15803d}#ceGeminiLibreOverlay .ce-ai-status.err{color:#b91c1c}\n'+
      '#ceGeminiLibreOverlay .ce-ai-result{flex:1;overflow:auto;background:#f8fafc;padding:11px 14px}#ceGeminiLibreOverlay .ce-ai-card{background:#fff;border:1px solid #dbeafe;border-radius:16px;padding:14px;margin:0 0 14px 0;box-shadow:0 2px 10px rgba(15,23,42,.06)}#ceGeminiLibreOverlay .ce-ai-card h3{margin:0 0 10px;color:#075985}#ceGeminiLibreOverlay .ce-ai-answer{white-space:pre-wrap;line-height:1.45;font-weight:400;color:#0f172a}#ceGeminiLibreOverlay .ce-ai-answer .ce-ai-inline-table-wrap{white-space:normal;overflow:auto;margin:10px 0 8px}#ceGeminiLibreOverlay .ce-ai-answer .ce-ai-inline-md-table{min-width:620px}#ceGeminiLibreOverlay .ce-ai-warning{background:#fff7ed;border-color:#fed7aa;color:#9a3412}#ceGeminiLibreOverlay .ce-ai-rejected{background:#fef2f2;border-color:#fecaca;color:#991b1b}\n'+
      '#ceGeminiLibreOverlay .ce-ai-table-wrap{overflow:auto}#ceGeminiLibreOverlay .ce-ai-table{border-collapse:collapse;width:100%;font-size:14px}#ceGeminiLibreOverlay .ce-ai-table th,#ceGeminiLibreOverlay .ce-ai-table td{border:1px solid #dbeafe;padding:7px 8px;text-align:left}#ceGeminiLibreOverlay .ce-ai-table th{background:#eff6ff;color:#075985}#ceGeminiLibreOverlay .ce-ai-bars{display:grid;gap:10px}#ceGeminiLibreOverlay .ce-ai-bar-row{display:grid;grid-template-columns:minmax(150px,300px) 1fr minmax(74px,auto);align-items:center;gap:12px}#ceGeminiLibreOverlay .ce-ai-bar-label{font-weight:650;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:normal;line-height:1.16;font-size:13px}#ceGeminiLibreOverlay .ce-ai-bar-track{height:18px;background:#e8eef6;border-radius:999px;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(15,23,42,.04)}#ceGeminiLibreOverlay .ce-ai-bar-fill{height:100%;background:#38bdf8;border-radius:999px;box-shadow:0 1px 4px rgba(15,23,42,.10)}#ceGeminiLibreOverlay .ce-ai-bar-value{font-weight:650;color:#075985;min-width:74px;text-align:right;font-size:13px}#ceGeminiLibreOverlay .ce-ai-loading{background:#fff7ed;border-color:#fed7aa}#ceGeminiLibreOverlay .ce-ai-thinking{display:flex;align-items:center;gap:16px;padding:10px 4px}#ceGeminiLibreOverlay .ce-ai-thinking-orb{width:54px;height:54px;border-radius:50%;position:relative;background:radial-gradient(circle at 35% 30%,#fff 0 14%,#fdba74 15% 42%,#fb923c 43% 66%,#7c2d12 67% 100%);box-shadow:0 0 0 0 rgba(249,115,22,.45);animation:ceZuzuOrb 1.05s infinite ease-in-out}#ceGeminiLibreOverlay .ce-ai-thinking-orb:before,#ceGeminiLibreOverlay .ce-ai-thinking-orb:after{content:"";position:absolute;inset:-8px;border-radius:50%;border:3px solid rgba(249,115,22,.35);animation:ceZuzuRing 1.3s infinite ease-out}#ceGeminiLibreOverlay .ce-ai-thinking-orb:after{animation-delay:.35s}#ceGeminiLibreOverlay .ce-ai-thinking-lines{font-weight:900;color:#7c2d12}#ceGeminiLibreOverlay .ce-ai-thinking-lines small{display:block;color:#9a3412;margin-top:5px;font-weight:800}#ceGeminiLibreOverlay .ce-ai-step-title{display:block;font-weight:950;color:#7c2d12}#ceGeminiLibreOverlay .ce-ai-step-counter{color:#475569!important;font-size:12px!important;margin-top:7px!important}#ceGeminiLibreOverlay .ce-ai-progress{height:9px;background:#fed7aa;border-radius:999px;overflow:hidden;margin-top:10px;box-shadow:inset 0 0 0 1px rgba(124,45,18,.08)}#ceGeminiLibreOverlay .ce-ai-progress-fill{height:100%;width:0;background:linear-gradient(90deg,#f97316,#fb923c,#22c55e);border-radius:999px;transition:width .12s ease}#ceGeminiLibreOverlay .ce-ai-thinking-lines.is-live{min-height:58px}#ceGeminiLibreOverlay .ce-ai-spinner{display:inline-block;animation:ceZuzuPulse 1s infinite ease-in-out}@keyframes ceZuzuPulse{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.25);opacity:1}}@keyframes ceZuzuOrb{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-4px) scale(1.06)}}@keyframes ceZuzuRing{0%{transform:scale(.75);opacity:.65}100%{transform:scale(1.45);opacity:0}}#ceGeminiLibreOverlay .ce-ai-files{display:flex;gap:8px;flex-wrap:wrap}#ceGeminiLibreOverlay .ce-ai-file-btn{background:#e0f2fe!important;color:#075985!important;border:1px solid #7dd3fc!important;border-radius:12px!important;padding:8px 12px!important;font-weight:900!important}#ceGeminiLibreOverlay .ce-ai-preview{margin-top:10px;background:#0f172a;color:#e2e8f0;border-radius:14px;padding:12px;max-height:240px;overflow:auto;white-space:pre-wrap}\n'+
      '#ceGeminiLibreOverlay .ce-ai-vbars{height:330px;display:flex;align-items:flex-end;gap:18px;border:1px solid #e0f2fe;border-radius:16px;background:linear-gradient(180deg,#fff,#f8fafc);padding:42px 18px 70px;overflow:auto}#ceGeminiLibreOverlay .ce-ai-vbar{height:100%;min-width:82px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;position:relative}#ceGeminiLibreOverlay .ce-ai-vbar-col{width:26px;border-radius:10px 10px 0 0;box-shadow:0 5px 14px rgba(15,23,42,.10)}#ceGeminiLibreOverlay .ce-ai-vbar-value{position:absolute;bottom:calc(100% + 10px);font-size:11px;font-weight:650;color:#075985;white-space:nowrap;transform:none;transform-origin:center}#ceGeminiLibreOverlay .ce-ai-vbar-label{position:absolute;bottom:-58px;max-width:118px;text-align:center;font-size:11px;font-weight:650;color:#334155;white-space:normal;line-height:1.16;overflow-wrap:anywhere}\n'+
      '#ceGeminiLibreOverlay .ce-ai-pie-wrap{display:flex;align-items:center;gap:22px;flex-wrap:wrap}#ceGeminiLibreOverlay .ce-ai-pie{width:220px;height:220px;border-radius:50%;box-shadow:inset 0 0 0 42px rgba(255,255,255,.82),0 10px 24px rgba(15,23,42,.12)}#ceGeminiLibreOverlay .ce-ai-pie.donut{box-shadow:inset 0 0 0 64px rgba(255,255,255,.88),0 10px 24px rgba(15,23,42,.12)}#ceGeminiLibreOverlay .ce-ai-pie-list{display:grid;gap:8px;min-width:220px}#ceGeminiLibreOverlay .ce-ai-pie-legend{font-weight:850;color:#0f172a}#ceGeminiLibreOverlay .ce-ai-pie-legend span{display:inline-block;width:13px;height:13px;border-radius:999px;margin-right:8px;vertical-align:middle}\n'+
      '#ceGeminiLibreOverlay .ce-ai-line-svg{width:100%;height:320px;border:1px solid #e0f2fe;border-radius:16px;background:linear-gradient(180deg,#fff,#f8fafc)}#ceGeminiLibreOverlay .ce-ai-stacked-wrap{display:grid;gap:14px}#ceGeminiLibreOverlay .ce-ai-stack-row{display:grid;grid-template-columns:minmax(160px,280px) 1fr;gap:12px;align-items:center}#ceGeminiLibreOverlay .ce-ai-stack-label{font-weight:650;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:normal;line-height:1.15;font-size:13px}#ceGeminiLibreOverlay .ce-ai-stack-body{min-width:0}#ceGeminiLibreOverlay .ce-ai-stack-track{height:24px;background:#e8eef6;border-radius:999px;display:flex;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(15,23,42,.04)}#ceGeminiLibreOverlay .ce-ai-stack-part{height:100%;display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:650;min-width:4px;text-shadow:0 1px 1px rgba(15,23,42,.18)}#ceGeminiLibreOverlay .ce-ai-stack-values{display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:5px;font-size:11px;font-weight:750;color:#334155}#ceGeminiLibreOverlay .ce-ai-stack-values span{white-space:nowrap}#ceGeminiLibreOverlay .ce-ai-stack-legend{display:flex;gap:12px;flex-wrap:wrap;margin-top:10px;font-weight:650;color:#334155;font-size:13px}#ceGeminiLibreOverlay .ce-ai-stack-legend span i{display:inline-block;width:10px;height:10px;border-radius:999px;margin-right:6px}\n'+
      '@media(max-width:760px){#ceGeminiLibreOverlay .ce-ai-modal{width:98vw;height:96vh}#ceGeminiLibreOverlay .ce-ai-head h2{font-size:18px}.ce-ai-free-btn{height:42px;min-width:46px;font-size:21px}#ceGeminiLibreOverlay .ce-ai-prompt textarea{min-height:96px}#ceGeminiLibreOverlay .ce-ai-bar-row{grid-template-columns:1fr}#ceGeminiLibreOverlay .ce-ai-bar-value{text-align:left}}\n'+
      '#ceGeminiLibreOverlay #ceAiPrompt{touch-action:manipulation!important;-webkit-user-select:text!important;user-select:text!important;contain:layout style!important;}\n'+
      '#ceGeminiLibreOverlay .ce-ai-loading,#ceGeminiLibreOverlay .ce-ai-thinking,#ceGeminiLibreOverlay .ce-ai-progress,#ceGeminiLibreOverlay .ce-ai-wait-signal,#ceGeminiLibreOverlay .ce-ai-wait-copy{display:none!important}#ceGeminiLibreOverlay .ce-ai-conversation-rail-head{display:flex;align-items:center;gap:8px}#ceGeminiLibreOverlay .ce-ai-conversation-rail-head>span:first-child{white-space:nowrap}#ceGeminiLibreOverlay .ce-ai-conversation-rail-count{margin-left:auto}#ceAiDownloadResult{pointer-events:auto!important;opacity:1!important;cursor:pointer!important}\n'+
      '#ceAiPdfPicker{position:fixed;inset:0;z-index:100080;background:rgba(15,23,42,.58);display:flex;align-items:center;justify-content:center;padding:18px}#ceAiPdfPicker .ce-ai-pdf-picker-card{width:min(920px,96vw);max-height:min(780px,92vh);background:#fff;border:2px solid #f59e0b;border-radius:20px;box-shadow:0 26px 80px rgba(15,23,42,.38);display:flex;flex-direction:column;overflow:hidden}#ceAiPdfPicker .ce-ai-pdf-picker-head{padding:14px 16px;background:linear-gradient(90deg,#fff7ed,#fff);border-bottom:1px solid #fed7aa}#ceAiPdfPicker .ce-ai-pdf-picker-head h3{margin:0 0 5px;color:#7c2d12}#ceAiPdfPicker .ce-ai-pdf-picker-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:9px 12px;border-bottom:1px solid #e2e8f0;background:#f8fafc}#ceAiPdfPicker button{border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#0f172a;padding:7px 10px;font-weight:850;cursor:pointer}#ceAiPdfPicker .ce-ai-pdf-picker-list{flex:1;min-height:160px;overflow:auto;padding:8px 12px}#ceAiPdfPicker .ce-ai-pdf-turn{display:grid;grid-template-columns:auto 1fr;gap:9px;align-items:flex-start;padding:9px 4px;border-bottom:1px solid #e2e8f0;cursor:pointer}#ceAiPdfPicker .ce-ai-pdf-turn-title{font-weight:950;color:#7c2d12;margin-bottom:3px}#ceAiPdfPicker .ce-ai-pdf-turn-line{font-size:12px;line-height:1.3;color:#334155;margin-top:2px}#ceAiPdfPicker .ce-ai-pdf-turn-badges{display:flex;gap:5px;flex-wrap:wrap;margin-top:5px}#ceAiPdfPicker .ce-ai-pdf-badge{font-size:10px;font-weight:850;padding:2px 6px;border-radius:999px;background:#eff6ff;color:#075985;border:1px solid #bae6fd}#ceAiPdfPicker .ce-ai-pdf-picker-foot{display:flex;justify-content:flex-end;gap:8px;padding:11px 12px;border-top:1px solid #e2e8f0;background:#fff}#ceAiPdfPicker .ce-ai-pdf-primary{background:#f97316!important;color:#fff!important;border-color:#f97316!important}\n';
    css.textContent += '#ceGeminiLibreOverlay .ce-ai-trace{background:#f0f9ff;border-color:#bae6fd}#ceGeminiLibreOverlay .ce-ai-trace details{font-size:13px}#ceGeminiLibreOverlay .ce-ai-trace summary{cursor:pointer;font-weight:950;color:#075985}#ceGeminiLibreOverlay .ce-ai-trace-item{display:grid;grid-template-columns:70px 190px 1fr;gap:8px;padding:6px 0;border-top:1px dashed #bae6fd}#ceGeminiLibreOverlay .ce-ai-trace-status{font-weight:950}.ce-ai-trace-status.OK{color:#15803d}.ce-ai-trace-status.KO{color:#b91c1c}.ce-ai-trace-status.RUN{color:#b45309}.ce-ai-trace-status.RETRY{color:#a16207}.ce-ai-trace-status.WARN{color:#c2410c}.ce-ai-trace-status.INFO{color:#475569}.ce-ai-trace-detail{white-space:pre-wrap;color:#334155}#ceGeminiLibreOverlay .ce-ai-bank-justified{margin-top:14px;border-top:1px solid #dbeafe;padding-top:10px}#ceGeminiLibreOverlay .ce-ai-bank-justified h4{margin:0 0 8px;color:#075985}#ceGeminiLibreOverlay .ce-ai-bank-move{border:1px solid #dbeafe;border-left:6px solid #64748b;border-radius:10px;padding:9px 10px;margin:7px 0;background:#fff}#ceGeminiLibreOverlay .ce-ai-bank-move.INGRESO{border-left-color:#22c55e;background:#f0fdf4}#ceGeminiLibreOverlay .ce-ai-bank-move.CARGO{border-left-color:#e11d48;background:#fff1f2}#ceGeminiLibreOverlay .ce-ai-bank-move-head{display:flex;gap:10px;flex-wrap:wrap;align-items:center;font-weight:850}.ce-ai-bank-move-amount{font-weight:950}.ce-ai-bank-move.INGRESO .ce-ai-bank-move-amount{color:#15803d}.ce-ai-bank-move.CARGO .ce-ai-bank-move-amount{color:#be123c}.ce-ai-bank-move-concept{font-weight:800;margin-top:4px}.ce-ai-bank-move-why{margin-top:3px;color:#334155}.ce-ai-bank-move-balance{color:#475569}';
    css.textContent += '\n'+
      '#ceGeminiLibreOverlay .ce-ai-mode-strip{display:flex;align-items:center;gap:12px;padding:9px 18px;border-bottom:1px solid #e2e8f0;font-weight:900;flex-wrap:wrap}#ceGeminiLibreOverlay .ce-ai-mode-strip.is-new{background:#eff6ff;color:#1d4ed8}#ceGeminiLibreOverlay .ce-ai-mode-strip.is-conversation{background:#f0fdf4;color:#166534}#ceGeminiLibreOverlay .ce-ai-mode-pill{display:inline-flex;align-items:center;gap:7px;border-radius:999px;padding:5px 11px;background:#fff;border:1px solid currentColor;font-size:13px;letter-spacing:.02em}#ceGeminiLibreOverlay .ce-ai-mode-help{font-size:12px;font-weight:800;color:#475569;flex:1;min-width:260px}#ceGeminiLibreOverlay .ce-ai-conversation-card{border-color:#a7f3d0;background:linear-gradient(180deg,#f0fdf4,#fff)}#ceGeminiLibreOverlay .ce-ai-conversation-turn{border-top:1px dashed #bbf7d0;padding:8px 0}#ceGeminiLibreOverlay .ce-ai-conversation-turn:first-child{border-top:0;padding-top:0}#ceGeminiLibreOverlay .ce-ai-conversation-user{font-weight:900;color:#14532d}#ceGeminiLibreOverlay .ce-ai-conversation-zuzu{margin:5px 0 0 14px;color:#475569;white-space:pre-wrap;line-height:1.35}#ceGeminiLibreOverlay .ce-ai-resume-note{font-size:12px;color:#475569;font-weight:800;margin-bottom:9px}\n'+
      '#ceGeminiLibreOverlay .ce-ai-prompt-grid{display:grid;grid-template-columns:minmax(0,13fr) minmax(290px,7fr);gap:12px;align-items:stretch}#ceGeminiLibreOverlay .ce-ai-prompt-main{min-width:0;display:flex;flex-direction:column}#ceGeminiLibreOverlay .ce-ai-conversation-rail{min-width:0;min-height:121px;max-height:145px;border:1px solid #86efac;border-radius:13px;background:linear-gradient(180deg,#f0fdf4,#ffffff);display:flex;flex-direction:column;overflow:hidden}#ceGeminiLibreOverlay .ce-ai-conversation-rail-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-bottom:1px solid #bbf7d0;color:#166534;font-size:12px;font-weight:950;background:rgba(240,253,244,.92)}#ceGeminiLibreOverlay .ce-ai-conversation-rail-count{display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:24px;border-radius:999px;background:#fff;border:1px solid #86efac;color:#166534;font-size:11px}#ceGeminiLibreOverlay .ce-ai-conversation-rail-body{flex:1;overflow:auto;padding:6px 9px;scrollbar-width:thin}#ceGeminiLibreOverlay .ce-ai-conversation-rail-empty{padding:16px 8px;text-align:center;color:#64748b;font-size:11px;font-weight:800;line-height:1.35}#ceGeminiLibreOverlay .ce-ai-conversation-rail-turn{padding:7px 0;border-top:1px dashed #bbf7d0;font-size:11px;line-height:1.25;color:#334155}#ceGeminiLibreOverlay .ce-ai-conversation-rail-turn:first-child{border-top:0;padding-top:2px}#ceGeminiLibreOverlay .ce-ai-conversation-rail-turnno{font-weight:950;color:#166534;margin-bottom:3px}#ceGeminiLibreOverlay .ce-ai-conversation-rail-line{margin-top:2px;overflow-wrap:anywhere}#ceGeminiLibreOverlay .ce-ai-conversation-rail-line b{color:#14532d}\n'+
      '@media(max-width:760px){#ceGeminiLibreOverlay .ce-ai-mode-strip{padding:8px 12px;gap:7px}#ceGeminiLibreOverlay .ce-ai-mode-help{min-width:100%;font-size:11px}#ceGeminiLibreOverlay .ce-ai-prompt-grid{grid-template-columns:1fr}#ceGeminiLibreOverlay .ce-ai-conversation-rail{min-height:118px;max-height:160px}}';
    document.head.appendChild(css);
  }

  var lastOpenTap=0;
  function openFromButton(ev){
    if(ev){
      try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ }
    }
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
        '<div class="ce-ai-head"><h2>✨ Soy Zuzu, pregúntame lo que quieras...</h2><span class="ce-ai-version-badge">v2.0_exp</span><div id="ceAiEventTitle">'+eventTitleHtml()+'</div><div class="spacer"></div><button type="button" class="ce-ai-close" id="ceAiClose">Cerrar</button></div>'+
        '<div class="ce-ai-mode-strip is-new" id="ceAiConversationMode"></div>'+
        '<div class="ce-ai-prompt">'+
          '<div class="ce-ai-prompt-grid">'+
            '<div class="ce-ai-prompt-main">'+
              '<textarea id="ceAiPrompt" placeholder="Ejemplos: Sácame una gráfica de barras por artículos más utilizados y separa comprado/donado.\nCompara la III Jornada Solidaria vs ELA con la IV Jornada Solidaria vs ELA en compras, donaciones, ingresos y valoración.\nHazme un CSV con productos más consumidos por coste."></textarea>'+
              '<div class="ce-ai-toolbar"><button type="button" class="ce-ai-run" id="ceAiRun">🧡 Zuzu</button><button type="button" class="ce-ai-secondary" id="ceAiClear">🧹</button><button type="button" class="ce-ai-secondary" id="ceAiDownloadResult" title="Imprimir / guardar en PDF">🖨️ PDF</button><span class="ce-ai-status" id="ceAiStatus"></span></div>'+
            '</div>'+
            '<aside class="ce-ai-conversation-rail" aria-label="Rastro de la conversación">'+
              '<div class="ce-ai-conversation-rail-head"><span>💬 Rastro de conversación</span><span class="ce-ai-conversation-rail-count" id="ceAiConversationRailCount">0</span></div>'+
              '<div class="ce-ai-conversation-rail-body" id="ceAiConversationRailBody"></div>'+
            '</aside>'+
          '</div>'+
        '</div>'+
        '<div class="ce-ai-result" id="ceAiResult"></div>'+ 
      '</div></div>';
  }

  function zuzuPrintableCss(){
    return '<style>'+
      '@page{size:A4;margin:12mm}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;background:#fff;margin:0}.ce-print-wrap{padding:0}.ce-print-head{border:2px solid #f59e0b;border-radius:18px;padding:12px 16px;margin:0 0 14px;background:linear-gradient(90deg,#fff7ed,#fff)}.ce-print-top{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.ce-print-head h1{font-size:22px;margin:0 0 8px;color:#7c2d12}.ce-print-datetime{font-size:13px;font-weight:950;color:#0f172a;white-space:nowrap;text-align:right}.ce-print-meta{font-size:13px;font-weight:800;color:#475569}.ce-print-prompt{white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px;margin-top:10px}.ce-ai-card{break-inside:avoid;page-break-inside:avoid;background:#fff;border:1px solid #dbeafe;border-radius:14px;padding:12px;margin:0 0 12px;box-shadow:none}.ce-ai-card h3{margin:0 0 10px;color:#075985}.ce-ai-answer-card{break-inside:auto!important;page-break-inside:auto!important}.ce-ai-answer{white-space:pre-wrap;line-height:1.45;font-weight:400}.ce-ai-warning{background:#fff7ed;border-color:#fed7aa;color:#9a3412}.ce-ai-rejected{background:#fef2f2;border-color:#fecaca;color:#991b1b}.ce-ai-trace{background:#f0f9ff;border-color:#bae6fd}.ce-ai-trace-item{display:block;border-top:1px dashed #bae6fd;padding:4px 0;font-size:11px}.ce-ai-table-wrap{overflow:visible}.ce-ai-table{border-collapse:collapse;width:100%;font-size:11px;table-layout:fixed}.ce-ai-table th,.ce-ai-table td{border:1px solid #dbeafe;padding:5px;text-align:left;vertical-align:top;overflow-wrap:anywhere;word-break:break-word}.ce-ai-table.ce-ai-table-wide{font-size:9px}.ce-ai-table th{background:#eff6ff;color:#075985}.ce-ai-bars{display:grid;gap:7px}.ce-ai-bar-row{display:grid;grid-template-columns:190px 1fr 82px;align-items:center;gap:8px}.ce-ai-bar-label{font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:normal;line-height:1.12}.ce-ai-bar-track{height:17px;background:#e2e8f0;border-radius:999px;overflow:hidden}.ce-ai-bar-fill{height:100%;border-radius:999px}.ce-ai-bar-value{font-weight:650;color:#075985;text-align:right}.ce-ai-vbars{height:260px;display:flex;align-items:flex-end;gap:10px;border:1px solid #e0f2fe;border-radius:14px;background:linear-gradient(180deg,#fff,#f8fafc);padding:30px 10px 48px;overflow:visible}.ce-ai-vbar{height:100%;min-width:48px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;position:relative;flex:1}.ce-ai-vbar-col{width:26px;border-radius:10px 10px 0 0}.ce-ai-vbar-value{position:absolute;bottom:calc(100% + 6px);font-size:9px;font-weight:650;color:#075985;white-space:nowrap;transform:none;transform-origin:center}.ce-ai-vbar-label{position:absolute;bottom:-42px;max-width:95px;text-align:center;font-size:9px;font-weight:650;color:#334155;line-height:1.1;overflow-wrap:anywhere}.ce-ai-pie-wrap{display:flex;align-items:center;gap:18px;flex-wrap:wrap}.ce-ai-pie{width:190px;height:190px;border-radius:50%;box-shadow:inset 0 0 0 36px rgba(255,255,255,.82),0 6px 14px rgba(15,23,42,.10)}.ce-ai-pie.donut{box-shadow:inset 0 0 0 56px rgba(255,255,255,.88),0 6px 14px rgba(15,23,42,.10)}.ce-ai-pie-list{display:grid;gap:7px;min-width:220px}.ce-ai-pie-legend{font-weight:850}.ce-ai-pie-legend span{display:inline-block;width:13px;height:13px;border-radius:999px;margin-right:8px;vertical-align:middle}.ce-ai-line-svg{width:100%;height:260px;border:1px solid #e0f2fe;border-radius:14px;background:linear-gradient(180deg,#fff,#f8fafc)}.ce-ai-stacked-wrap{display:grid;gap:10px}.ce-ai-stack-row{display:grid;grid-template-columns:180px 1fr;gap:8px;align-items:center}.ce-ai-stack-label{font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:normal;line-height:1.12}.ce-ai-stack-track{height:22px;background:#e2e8f0;border-radius:999px;display:flex;overflow:hidden}.ce-ai-stack-part{height:100%;display:flex;align-items:center;justify-content:center;color:white;font-size:9px;font-weight:650;min-width:4px;text-shadow:0 1px 1px rgba(15,23,42,.16)}.ce-ai-stack-legend{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;font-weight:650;color:#334155}.ce-ai-stack-legend span i{display:inline-block;width:12px;height:12px;border-radius:999px;margin-right:6px}.ce-ai-files,.ce-ai-file-btn,.ce-ai-preview,.ce-ai-files-card{display:none!important}.ce-ai-trace details{display:block!important}.ce-ai-trace details:not([open])>*:not(summary){display:block!important}.ce-ai-trace summary{font-weight:800;margin-bottom:6px}.ce-ai-bank-justified{margin-top:10px;border-top:1px solid #dbeafe;padding-top:8px}.ce-ai-bank-justified h4{margin:0 0 6px;color:#075985}.ce-ai-bank-move{border:1px solid #dbeafe;border-left:5px solid #64748b;border-radius:8px;padding:6px 8px;margin:5px 0;break-inside:avoid;page-break-inside:avoid}.ce-ai-bank-move.INGRESO{border-left-color:#22c55e;background:#f0fdf4}.ce-ai-bank-move.CARGO{border-left-color:#e11d48;background:#fff1f2}.ce-ai-bank-move-head{display:flex;gap:8px;flex-wrap:wrap;font-size:10px;font-weight:800}.ce-ai-bank-move-concept{font-size:10px;font-weight:800;margin-top:2px}.ce-ai-bank-move-why,.ce-ai-bank-move-balance{font-size:9px;color:#334155;margin-top:2px}.ce-ai-bank-chart-card{break-inside:auto!important;page-break-inside:auto!important}.ce-ai-bank-chart-card .ce-ai-line-svg{break-inside:avoid;page-break-inside:avoid}.ce-ai-bank-justified{break-inside:auto;page-break-inside:auto}.ce-print-turn{margin:0 0 18px}.ce-print-turn-head{border:1px solid #fed7aa;border-left:5px solid #f59e0b;border-radius:12px;padding:8px 10px;margin:0 0 10px;background:#fff7ed}.ce-print-turn-head strong{color:#7c2d12}.ce-print-turn-q{white-space:pre-wrap;margin-top:4px;font-size:13px}.ce-print-turn+.ce-print-turn{padding-top:5px;border-top:2px solid #f1f5f9}.ce-print-onepage{font-size:10px}.ce-print-onepage .ce-print-head{padding:6px 9px;margin-bottom:7px;border-radius:12px}.ce-print-onepage .ce-print-head h1{font-size:16px;margin-bottom:2px}.ce-print-onepage .ce-print-datetime,.ce-print-onepage .ce-print-meta{font-size:9px}.ce-print-onepage .ce-print-prompt{display:none!important}.ce-print-onepage .ce-ai-card{padding:6px 8px;margin-bottom:6px;border-radius:9px;break-inside:auto;page-break-inside:auto}.ce-print-onepage .ce-ai-card h3{font-size:14px;margin-bottom:4px}.ce-print-onepage .ce-ai-answer{font-size:10px;line-height:1.18}.ce-print-onepage .ce-ai-table{font-size:8.6px}.ce-print-onepage .ce-ai-table th,.ce-print-onepage .ce-ai-table td{padding:3px 4px;line-height:1.12}@media print{button{display:none!important}.ce-ai-card{box-shadow:none!important}body.ce-print-onepage{zoom:.92}}'+
      '</style>';
  }
  function wantsTraceInReport(prompt){
    var p=String(prompt||'');
    return /\b(traza|trazabilidad|recorrido\s+t[eé]cnico|c[oó]mo\s+(?:has|he)\s+(?:llegado|hecho|resuelto)|incluye\s+(?:la\s+)?traza)\b/i.test(p);
  }
  function contextDependentUserPrompt(value){
    var p=String(value||'').trim(); if(!p) return false;
    var n=p.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if(n.length<=190 && /^(?:si|sí|vale|ok|de acuerdo|adelante|hazlo|perfecto|correcto)\b/.test(n)) return true;
    return /\b(ese|esa|eso|estos|estas|lo anterior|esa misma|ese mismo|de esa|de ese|hazlo|consultalo|revisalo|detallalo|y ahora|tambien|también)\b/.test(n);
  }
  function proposalTail(answer){
    var text=String(answer||'').trim(); if(!text) return '';
    var n=text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    var cues=['si quieres','si deseas','te gustaria','puedo consultar','puedo revisar','puedo mostrar','puedo detallar','puedo generar','quieres que','deseas que'];
    var idx=-1; cues.forEach(function(c){ var i=n.lastIndexOf(c); if(i>idx)idx=i; });
    if(idx<0 && !/\?\s*$/.test(text)) return '';
    if(idx<0) idx=Math.max(0,text.lastIndexOf('\n',Math.max(0,text.length-700)));
    else { var prior=text.lastIndexOf('\n',idx); if(prior>=0)idx=prior+1; else idx=Math.max(0,idx-180); }
    var tail=text.slice(idx).trim(); return tail.length>850?'…'+tail.slice(-850):tail;
  }
  function conversationAssistantExcerpt(turn){
    turn=turn||{};
    var head=withoutGeminiLabel(String(turn.assistant||'').trim()),tail=withoutGeminiLabel(String(turn.assistantTail||'').trim());
    var raw=head;
    if(tail && tail!==head){ raw=head?head.slice(0,520)+' … '+tail.slice(-520):tail; }
    if(!raw) return '';
    var proposal=proposalTail(raw); if(proposal) return proposal;
    return raw.length>980?raw.slice(0,470)+' … '+raw.slice(-470):raw;
  }
  function conversationTrailExcerpt(value){
    var cleanText=String(value||'').replace(/\s+/g,' ').trim();
    return cleanText.length>100?cleanText.slice(0,100)+'…':cleanText;
  }
  function conversationTrailBodyHtml(){
    var all=loadZuzuConversation(),hist=all.slice(-8),base=Math.max(0,all.length-hist.length);
    if(!hist.length) return '<div class="ce-ai-conversation-rail-empty">Sin conversación todavía.<br>La primera respuesta abrirá el hilo.</div>';
    return hist.map(function(turn,idx){
      var q=conversationTrailExcerpt(turn&&turn.user||'');
      var a=withoutGeminiLabel(conversationTrailExcerpt(turn&&turn.assistant||''));
      return '<div class="ce-ai-conversation-rail-turn"><div class="ce-ai-conversation-rail-turnno">Turno '+(base+idx+1)+'</div><div class="ce-ai-conversation-rail-line"><b>P:</b> '+esc(q||'—')+'</div><div class="ce-ai-conversation-rail-line"><b>R:</b> '+esc(a||'—')+'</div></div>';
    }).join('');
  }
  function updateConversationTrail(){
    var body=$('ceAiConversationRailBody'),count=$('ceAiConversationRailCount');
    var all=loadZuzuConversation();
    if(count) count.textContent=String(all.length);
    if(body){ body.innerHTML=conversationTrailBodyHtml(); body.scrollTop=body.scrollHeight; }
  }
  function activeConversationModel(currentPrompt){
    var hist=loadZuzuConversation().slice(-8);
    if(!hist.length) return {turns:[],isConversation:false,currentIndex:-1};
    var current=hist.length-1,needle=String(currentPrompt||'').trim();
    if(needle){ for(var i=hist.length-1;i>=0;i--){ if(String(hist[i].user||'').trim()===needle){ current=i; break; } } }
    var selected=hist.slice(0,current+1);
    return {turns:selected,isConversation:selected.length>1,currentIndex:current};
  }
  function reportConversationContextHtml(currentPrompt){
    var model=activeConversationModel(currentPrompt),selected=model.turns;
    if(!selected.length) return currentPrompt?'<div class="ce-print-prompt"><strong>Pregunta:</strong> '+esc(currentPrompt)+'</div>':'';
    if(selected.length<=1) return '<div class="ce-print-prompt"><strong>Pregunta:</strong> '+esc(String(selected[0].user||currentPrompt||''))+'</div>';
    var parts=['<div class="ce-print-prompt"><strong>Conversación activa · '+selected.length+' turnos</strong>'];
    selected.forEach(function(turn,idx){
      parts.push('<div style="margin-top:7px"><strong>Usuario:</strong> '+esc(String(turn.user||''))+'</div>');
      if(idx<selected.length-1){ var excerpt=conversationAssistantExcerpt(turn); if(excerpt) parts.push('<div style="margin:5px 0 0 14px;color:#475569"><strong>Zuzu:</strong> '+esc(excerpt)+'</div>'); }
    });
    parts.push('</div>'); return parts.join('');
  }
  function screenConversationContextHtml(currentPrompt){
    var model=activeConversationModel(currentPrompt),selected=model.turns;
    if(selected.length<=1) return '';
    var html='<div class="ce-ai-card ce-ai-conversation-card ce-ai-conversation-screen-only"><h3>💬 Conversación activa · '+selected.length+' turnos</h3><div class="ce-ai-resume-note">Este hilo sigue abierto porque no has pulsado la escobita. La pregunta actual continúa el mismo contexto.</div>';
    selected.forEach(function(turn,idx){
      html+='<div class="ce-ai-conversation-turn"><div class="ce-ai-conversation-user">Usuario: '+esc(String(turn.user||''))+'</div>';
      if(idx<selected.length-1){ var excerpt=conversationAssistantExcerpt(turn); if(excerpt) html+='<div class="ce-ai-conversation-zuzu"><strong>Zuzu:</strong> '+esc(excerpt)+'</div>'; }
      html+='</div>';
    });
    return html+'</div>';
  }
  function conversationResumeHtml(){
    var hist=loadZuzuConversation().slice(-8);
    if(!hist.length) return '<div class="ce-ai-card"><h3>Zuzu está listo</h3><div class="ce-ai-answer">Escribe una pregunta sobre los eventos y pulsa Zuzu.</div></div>';
    return '<div class="ce-ai-card ce-ai-conversation-card ce-ai-conversation-screen-only"><h3>💬 Conversación abierta · '+hist.length+' turnos guardados</h3><div class="ce-ai-answer">El rastro resumido del hilo está visible a la derecha del prompt. Puedes continuar preguntando o pulsar 🧹 para empezar de cero.</div></div>';
  }
  function updateConversationMode(){
    var node=$('ceAiConversationMode'); if(!node) return;
    var turns=loadZuzuConversation().length;
    if(!turns){
      node.className='ce-ai-mode-strip is-new';
      node.innerHTML='<span class="ce-ai-mode-pill">🔵 CONSULTA NUEVA</span>';
    }else{
      node.className='ce-ai-mode-strip is-conversation';
      node.innerHTML='<span class="ce-ai-mode-pill">🟢 CONVERSACIÓN / TURNO '+turns+'</span><span class="ce-ai-mode-help"><strong>Pulsa 🧹 para empezar de cero.</strong></span>';
    }
  }
  function restoreConversationScreen(){
    updateConversationMode();
    updateConversationTrail();
    var r=$('ceAiResult'); if(r){ r.innerHTML=conversationResumeHtml(); r.setAttribute('data-ce-resume-only','1'); }
    window.__ceLastZuzuResult=null;
  }


  function archivedTurnHtml(turn){
    turn=turn||{};
    if(trim(turn.archiveHtml||'')) return withoutGeminiLabel(String(turn.archiveHtml));
    var answer=withoutGeminiLabel(String(turn.assistant||'').trim());
    return '<div class="ce-ai-card ce-ai-answer-card"><div class="ce-ai-answer">'+answerDisplayHtml(answer||'Sin respuesta archivada para este turno.')+'</div></div>';
  }
  function archivedTraceHtml(turn){ return withoutGeminiLabel(trim(turn&&turn.archiveTraceHtml||'')||''); }
  // En pantalla la traza sigue plegada. Al imprimirla se abren sus <details> para que
  // el PDF capture realmente pasos, consultas, selector/router y diagnóstico.
  function printableArchivedTraceHtml(turn){
    var html=archivedTraceHtml(turn);
    if(!html) return '';
    try{
      var holder=document.createElement('div');
      holder.innerHTML=html;
      [].slice.call(holder.querySelectorAll('details')).forEach(function(node){node.setAttribute('open','open');});
      return holder.innerHTML;
    }catch(_){
      // Respaldo para trazas antiguas ya archivadas como HTML.
      return String(html).replace(/<details(?![^>]*\bopen\b)/ig,'<details open');
    }
  }
  function closeZuzuPdfPicker(){ var p=$('ceAiPdfPicker'); if(p)p.remove(); }
  function pdfPickerTurnBadges(turn){
    var m=(turn&&turn.archiveMeta)||{},out=[];
    if(Number(m.charts||0))out.push('<span class="ce-ai-pdf-badge">'+Number(m.charts)+' gráfica'+(Number(m.charts)===1?'':'s')+'</span>');
    if(Number(m.tables||0))out.push('<span class="ce-ai-pdf-badge">'+Number(m.tables)+' tabla'+(Number(m.tables)===1?'':'s')+'</span>');
    return out.join('');
  }
  function printSelectedZuzuTurns(selectedIndexes,includeTrace){
    var hist=loadZuzuConversation(),selected=(selectedIndexes||[]).map(function(i){return {idx:Number(i),turn:hist[Number(i)]};}).filter(function(x){return x.turn;});
    if(!selected.length){ setStatus('Selecciona al menos una pregunta/respuesta para el PDF.','err'); return; }
    var now=new Date(),win=null;
    try{win=window.open('','_blank');}catch(_){win=null;}
    if(!win){setStatus('El navegador ha bloqueado la ventana de impresión.','err');return;}
    var title=selected.length===1?responsePdfTitle({__prompt:selected[0].turn.user},selected[0].turn.user):('ControlEvent_v2.0_exp-conversacion_Zuzu-'+dateStamp(now)+'.pdf');
    var userName=loggedUserDisplayName();
    var body=selected.map(function(item){
      var turn=item.turn||{},n=item.idx+1;
      return '<section class="ce-print-turn"><div class="ce-print-turn-head"><strong>Turno '+n+' · Pregunta</strong><div class="ce-print-turn-q">'+esc(turn.user||'')+'</div></div>'+archivedTurnHtml(turn)+(includeTrace?printableArchivedTraceHtml(turn):'')+'</section>';
    }).join('');
    win.document.open();
    win.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>'+esc(title)+'</title>'+zuzuPrintableCss()+'</head><body><main class="ce-print-wrap"><header class="ce-print-head"><div class="ce-print-top"><div><h1>✨ Conversación Zuzu · '+selected.length+' respuesta'+(selected.length===1?'':'s')+' seleccionada'+(selected.length===1?'':'s')+'</h1><div class="ce-print-meta">Usuario: '+esc(userName)+'</div></div><div class="ce-print-datetime">'+esc(prettyDateTime(now))+'</div></div></header>'+body+'</main><script>window.onload=function(){setTimeout(function(){try{document.querySelectorAll(".ce-ai-trace details").forEach(function(d){d.open=true;d.setAttribute("open","open");});document.title='+JSON.stringify(title)+';window.focus();window.print();}catch(e){}},250)}<\/script></body></html>');
    win.document.close();
    closeZuzuPdfPicker();
    setStatus('Abierta impresión con '+selected.length+' respuesta'+(selected.length===1?'':'s')+' seleccionada'+(selected.length===1?'':'s')+'.','ok');
  }
  function openZuzuPdfPicker(){
    closeZuzuPdfPicker();
    var hist=loadZuzuConversation();
    if(!hist.length){setStatus('Haz una consulta para generar un PDF de respuesta.','err');return;}
    var rows=hist.map(function(turn,idx){
      var q=conversationTrailExcerpt(turn&&turn.user||''),a=conversationTrailExcerpt(turn&&turn.assistant||'');
      return '<label class="ce-ai-pdf-turn"><input type="checkbox" class="ce-ai-pdf-turn-check" value="'+idx+'" checked><span><div class="ce-ai-pdf-turn-title">Turno '+(idx+1)+'</div><div class="ce-ai-pdf-turn-line"><b>P:</b> '+esc(q||'—')+'</div><div class="ce-ai-pdf-turn-line"><b>R:</b> '+esc(a||'—')+'</div><div class="ce-ai-pdf-turn-badges">'+pdfPickerTurnBadges(turn)+'</div></span></label>';
    }).join('');
    document.body.insertAdjacentHTML('beforeend','<div id="ceAiPdfPicker"><div class="ce-ai-pdf-picker-card"><div class="ce-ai-pdf-picker-head"><h3>🖨️ Preparar PDF de la conversación</h3><div>Están marcadas todas las preguntas/respuestas. Desmarca únicamente lo que no quieras conservar.</div></div><div class="ce-ai-pdf-picker-tools"><button type="button" id="ceAiPdfAll">Marcar todo</button><button type="button" id="ceAiPdfNone">Desmarcar todo</button><label class="ce-ai-pdf-trace-label"><input type="checkbox" id="ceAiPdfTrace" checked> Incluir traza técnica</label><span style="margin-left:auto;font-size:11px;color:#64748b">Se conservan texto, tablas y gráficas de cada turno.</span></div><div class="ce-ai-pdf-picker-list">'+rows+'</div><div class="ce-ai-pdf-picker-foot"><button type="button" id="ceAiPdfCancel">Cancelar</button><button type="button" class="ce-ai-pdf-primary" id="ceAiPdfPrint">Imprimir / Guardar PDF</button></div></div></div>');
    $('ceAiPdfAll').onclick=function(){document.querySelectorAll('#ceAiPdfPicker .ce-ai-pdf-turn-check').forEach(function(x){x.checked=true;});};
    $('ceAiPdfNone').onclick=function(){document.querySelectorAll('#ceAiPdfPicker .ce-ai-pdf-turn-check').forEach(function(x){x.checked=false;});};
    $('ceAiPdfCancel').onclick=closeZuzuPdfPicker;
    $('ceAiPdfPicker').addEventListener('click',function(ev){if(ev.target&&ev.target.id==='ceAiPdfPicker')closeZuzuPdfPicker();});
    $('ceAiPdfPrint').onclick=function(){var selected=[].slice.call(document.querySelectorAll('#ceAiPdfPicker .ce-ai-pdf-turn-check:checked')).map(function(x){return Number(x.value);});printSelectedZuzuTurns(selected,!!($('ceAiPdfTrace')&&$('ceAiPdfTrace').checked));};
  }
  function printZuzuPdf(){ openZuzuPdfPicker(); }


  function clearZuzu(ev){
    closeZuzuPdfPicker();
    if(ev){ try{ ev.preventDefault(); ev.stopPropagation(); }catch(_){ } }
    var p=$('ceAiPrompt'); if(p){ p.value=''; p.textContent=''; }
    window.__ceZuzuConversationV26=[];
    window.__ceZuzuConversationContextV26=null;
    window.__ceZuzuUsageTotalV285=emptyZuzuUsageTotal();
    window.__ceLastZuzuResult=null;
    window.__ceZuzuResetNonce=(Number(window.__ceZuzuResetNonce||0)+1);
    saveZuzuInteractionId('');
    try{ ['ControlEvent_v2.0_exp','ControlEvent_'+'v30'+'_prod','ControlEvent_v29_prod','ControlEvent_v28.3_prod','ControlEvent_v28.2_prod','ControlEvent_v28.1_prod','ControlEvent_v27_prod_1.0','ControlEvent_v26_prod_1.1','ControlEvent_v26_prod_1.0'].forEach(function(v){ sessionStorage.removeItem(v+'_zuzu_conversation'); sessionStorage.removeItem(v+'_zuzu_context'); sessionStorage.removeItem(v+'_zuzu_interaction_id'); sessionStorage.removeItem(v+'_zuzu_usage_total'); }); }catch(_){ }
    var r=$('ceAiResult'); if(r){ r.removeAttribute('data-ce-resume-only'); r.innerHTML='<div class="ce-ai-card"><h3>Zuzu está listo</h3><div class="ce-ai-answer">Escribe una pregunta sobre los eventos y pulsa Zuzu.</div></div>'; }
    updateConversationMode();
    updateConversationTrail();
    var titleNode=$('ceAiEventTitle'); if(titleNode) titleNode.innerHTML=eventTitleHtml();
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
  function closeGraphInfoBubble(){
    try{
      if(window.ControlEventGraphFix92 && typeof window.ControlEventGraphFix92.close==='function') window.ControlEventGraphFix92.close();
      var tip=$('ceV26GraphTip'); if(tip) tip.remove();
      document.body.classList.remove('ce-g92-tip-open');
    }catch(_){ }
  }
  function openModal(){
    closeGraphInfoBubble();
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
    var pdfBtn=$('ceAiDownloadResult');
    if(pdfBtn){
      pdfBtn.disabled=false;
      pdfBtn.removeAttribute('disabled');
      pdfBtn.setAttribute('aria-disabled','false');
      pdfBtn.onclick=function(ev){ if(ev){ev.preventDefault();ev.stopPropagation();} printZuzuPdf(); };
    }
    restoreConversationScreen();
    setTimeout(function(){ try{$('ceAiPrompt').focus();}catch(_){ } },80);
  }
  function closeModal(){ closeZuzuPdfPicker(); clearZuzuThinkingTimer(); var o=$('ceGeminiLibreOverlay'); if(o) o.remove(); }
  function setStatus(msg, kind){ var el=$('ceAiStatus'); if(!el) return; el.className='ce-ai-status '+(kind||''); el.textContent=msg||''; }
  function zuzuPromptFlags(prompt){
    var p=String(prompt||'').toLowerCase();
    return {
      charts:/\b(graf|gr[aá]fic|chart|queso|tarta|pastel|pie|donut|dispersion|dispersi[oó]n|tendencia|linea|l[ií]nea|evoluci[oó]n)\b/i.test(p),
      allEvents:/\b(todos\s+los\s+eventos|eventos\s+registrados|a[nñ]o\s+\d{4}|celebraciones|\b\d+\s+eventos\b)\b/i.test(p),
      products:/\b(producto|productos|art[ií]culo|art[ií]culos|consumo|consumidos|comprados|donados)\b/i.test(p),
      tickets:/\b(ticket|tickets|tk\s*\d+)\b/i.test(p),
      incomes:/\b(ingreso|ingresos|recaudaci[oó]n|asistentes|socios)\b/i.test(p),
      docs:/\b(documentos?|doc\s*\d+|adjuntos?)\b/i.test(p),
      compare:/\b(compara|comparativa|frente|versus| vs |tendencia)\b/i.test(p)
    };
  }
  function clearZuzuThinkingTimer(){ if(window.__ceZuzuThinkingTimer){clearInterval(window.__ceZuzuThinkingTimer);window.__ceZuzuThinkingTimer=null;} }
  function setZuzuButtonHeartbeat(on){ var el=$('ceAiRun'); if(!el)return; var active=!!on; el.classList.toggle('is-thinking',active); el.setAttribute('aria-busy',active?'true':'false'); }
  function startZuzuThinking(){ clearZuzuThinkingTimer(); setZuzuButtonHeartbeat(true); }
  function finishZuzuThinkingFast(){ setZuzuButtonHeartbeat(false); return Promise.resolve(); }
  function stopZuzuThinking(){ clearZuzuThinkingTimer(); setZuzuButtonHeartbeat(false); window.__ceZuzuThinkingState=null; }
  function zuzuStoragePrefix(){ var v=String(window.__ceVersionLabel||'v2.0_exp').trim(); return 'ControlEvent_'+v+'_zuzu_'; }
  function zuzuStorageKey(suffix){ return zuzuStoragePrefix()+suffix; }
  function zuzuMigratedStorageValue(suffix){
    var key=zuzuStorageKey(suffix),raw='';
    try{ raw=sessionStorage.getItem(key)||''; if(raw) return raw; }catch(_){ return ''; }
    try{
      var ending='_zuzu_'+suffix,candidate='';
      for(var i=0;i<sessionStorage.length;i+=1){ var k=sessionStorage.key(i); if(k&&k!==key&&k.endsWith(ending)){ var value=sessionStorage.getItem(k); if(value)candidate=value; } }
      if(candidate){ sessionStorage.setItem(key,candidate); return candidate; }
    }catch(_){ }
    return '';
  }
  function zuzuConversationKey(){ return zuzuStorageKey('conversation'); }
  function loadZuzuConversation(){
    if(Array.isArray(window.__ceZuzuConversationV26)) return window.__ceZuzuConversationV26;
    try{ var raw=zuzuMigratedStorageValue('conversation'); var parsed=raw?JSON.parse(raw):[]; window.__ceZuzuConversationV26=Array.isArray(parsed)?parsed.slice(-50):[]; }catch(_){ window.__ceZuzuConversationV26=[]; }
    return window.__ceZuzuConversationV26;
  }
  function saveZuzuConversation(){ try{ sessionStorage.setItem(zuzuConversationKey(),JSON.stringify((window.__ceZuzuConversationV26||[]).slice(-100))); }catch(_){ } }
  function zuzuContextKey(){ return zuzuStorageKey('context'); }
  function loadZuzuConversationContext(){
    if(window.__ceZuzuConversationContextV26 && typeof window.__ceZuzuConversationContextV26==='object') return window.__ceZuzuConversationContextV26;
    try{ var raw=zuzuMigratedStorageValue('context'); var parsed=raw?JSON.parse(raw):null; window.__ceZuzuConversationContextV26=(parsed&&typeof parsed==='object')?parsed:null; }catch(_){ window.__ceZuzuConversationContextV26=null; }
    return window.__ceZuzuConversationContextV26;
  }
  function saveZuzuConversationContext(){ try{ var c=window.__ceZuzuConversationContextV26; if(c&&typeof c==='object')sessionStorage.setItem(zuzuContextKey(),JSON.stringify(c)); else sessionStorage.removeItem(zuzuContextKey()); }catch(_){ } }
  function zuzuUsageTotalKey(){ return zuzuStorageKey('usage_total'); }
  function emptyZuzuUsageTotal(){ return {turns:0,calls:0,totalTokens:0,promptTokens:0,outputTokens:0,hiddenOutputTokens:0,costEurApprox:0,costUsdApprox:0}; }
  function loadZuzuUsageTotal(){
    if(window.__ceZuzuUsageTotalV285 && typeof window.__ceZuzuUsageTotalV285==='object') return window.__ceZuzuUsageTotalV285;
    try{ var raw=zuzuMigratedStorageValue('usage_total'); var parsed=raw?JSON.parse(raw):null; window.__ceZuzuUsageTotalV285=(parsed&&typeof parsed==='object')?Object.assign(emptyZuzuUsageTotal(),parsed):emptyZuzuUsageTotal(); }catch(_){ window.__ceZuzuUsageTotalV285=emptyZuzuUsageTotal(); }
    return window.__ceZuzuUsageTotalV285;
  }
  function saveZuzuUsageTotal(){ try{ sessionStorage.setItem(zuzuUsageTotalKey(),JSON.stringify(loadZuzuUsageTotal())); }catch(_){ } }
  function recordZuzuUsage(data){
    var usage=(data&&data.meta&&data.meta.geminiUsageEstimate)||data&&data.geminiUsageEstimate||null;
    var total=loadZuzuUsageTotal();
    total.turns=Number(total.turns||0)+1;
    if(usage){
      ['calls','totalTokens','promptTokens','outputTokens','hiddenOutputTokens','costEurApprox','costUsdApprox'].forEach(function(k){ total[k]=Number(total[k]||0)+Number(usage[k]||0); });
    }
    window.__ceZuzuUsageTotalV285=total; saveZuzuUsageTotal();
    if(!data.meta||typeof data.meta!=='object')data.meta={}; data.meta.geminiConversationTotal=Object.assign({},total);
    return total;
  }
  function zuzuInteractionKey(){ return zuzuStorageKey('interaction_id'); }
  function loadZuzuInteractionId(){
    if(typeof window.__ceZuzuInteractionIdV261==='string' && window.__ceZuzuInteractionIdV261) return window.__ceZuzuInteractionIdV261;
    try{ window.__ceZuzuInteractionIdV261=String(zuzuMigratedStorageValue('interaction_id')||'').trim(); }catch(_){ window.__ceZuzuInteractionIdV261=''; }
    return window.__ceZuzuInteractionIdV261||'';
  }
  function saveZuzuInteractionId(value){
    window.__ceZuzuInteractionIdV261=String(value||'').trim();
    try{ if(window.__ceZuzuInteractionIdV261) sessionStorage.setItem(zuzuInteractionKey(),window.__ceZuzuInteractionIdV261); else sessionStorage.removeItem(zuzuInteractionKey()); }catch(_){ }
  }
  function mergeZuzuUsage(base,extra){
    base=base&&typeof base==='object'?base:{}; extra=extra&&typeof extra==='object'?extra:{};
    var out=Object.assign({},base);
    ['calls','totalTokens','promptTokens','candidateTokens','outputTokens','hiddenOutputTokens','costEurApprox','costUsd','costUsdApprox'].forEach(function(k){ out[k]=Number(base[k]||0)+Number(extra[k]||0); });
    return out;
  }
  function recordZuzuShadowUsage(data,shadow){
    if(!data || !shadow || !shadow.usage || data.__routerShadowUsageRecorded) return;
    data.__routerShadowUsageRecorded=true;
    var usage=shadow.usage||{};
    if(!data.meta||typeof data.meta!=='object') data.meta={};
    data.meta.geminiUsageEstimate=mergeZuzuUsage(data.meta.geminiUsageEstimate||data.geminiUsageEstimate||{},usage);
    if(Number(usage.calls||0)>0){
      var total=loadZuzuUsageTotal();
      ['calls','totalTokens','promptTokens','outputTokens','hiddenOutputTokens','costEurApprox','costUsdApprox'].forEach(function(k){ var source=k==='costUsdApprox'?'costUsd':k; total[k]=Number(total[k]||0)+Number(usage[source]||0); });
      window.__ceZuzuUsageTotalV285=total; saveZuzuUsageTotal(); data.meta.geminiConversationTotal=Object.assign({},total);
    }
  }
  function conversationHistoryForApi(){
    return loadZuzuConversation().slice(-8).map(function(turn){
      return {turnId:String(turn&&turn.turnId||''),user:String(turn&&turn.user||'').slice(0,700),assistant:String(turn&&turn.assistant||'').slice(0,1200),assistantTail:String(turn&&turn.assistantTail||'').slice(-1000),title:String(turn&&turn.title||'').slice(0,160),provider:String(turn&&turn.provider||'').slice(0,80),intent:String(turn&&turn.intent||'').slice(0,120),tools:Array.isArray(turn&&turn.tools)?turn.tools.slice(0,6):[],selectedEventId:String(turn&&turn.selectedEventId||'').slice(0,120),conversationContext:(turn&&turn.conversationContext&&typeof turn.conversationContext==='object')?turn.conversationContext:null,pendingAction:(turn&&turn.pendingAction&&typeof turn.pendingAction==='object')?turn.pendingAction:null,resultContext:(turn&&turn.resultContext&&typeof turn.resultContext==='object')?turn.resultContext:null,routerShadow:(turn&&turn.routerShadow&&typeof turn.routerShadow==='object')?turn.routerShadow:null};
    });
  }
  function conversationDigestForApi(){
    var hist=loadZuzuConversation().slice(-40);
    return hist.map(function(turn,idx){
      var u=trim(turn&&turn.user||'').replace(/\s+/g,' ').slice(0,220);
      var a=trim(turn&&turn.assistant||'').replace(/\s+/g,' ').slice(0,300);
      var t=trim(turn&&turn.title||'').replace(/\s+/g,' ').slice(0,100);
      return 'T'+(idx+1)+' · U: '+u+(t?' · '+t:'')+(a?' · Z: '+a:'');
    }).join('\n').slice(-14000);
  }
  function archiveMetaForData(data){ return {charts:Array.isArray(data&&data.charts)?data.charts.length:0,tables:Array.isArray(data&&data.tables)?data.tables.length:0,files:Array.isArray(data&&data.files)?data.files.length:0}; }
  function resultCoreHtml(data,options){
    data=data||{};options=options||{};
    var promptText=trim(data.__prompt||''); var allowTechnical=explicitTechnicalView(promptText),html='',cls=data.rejected?' ce-ai-rejected':'';
    var mainTitle=userFacingTitle(data,promptText);
    html+='<div class="ce-ai-card ce-ai-answer-card'+cls+'">'+(mainTitle?'<h3>'+esc(mainTitle)+'</h3>':'')+'<div class="ce-ai-answer">'+answerDisplayHtml(data.answer||'')+'</div></div>';
    var visibleWarnings=userFacingWarnings(data.warnings,allowTechnical);
    if((data.rejected||data.showWarnings===true||data.provider==='gemini-rest-json-fallback')&&visibleWarnings.length)html+='<div class="ce-ai-card ce-ai-warning"><h3>Avisos</h3><ul>'+visibleWarnings.map(function(w){return '<li>'+esc(w)+'</li>';}).join('')+'</ul></div>';
    (data.charts||[]).forEach(function(ch){if(allowTechnical||!isTechnicalHeading(ch&&ch.title))html+=chartHtml(ch);});
    (data.tables||[]).forEach(function(tb){if(allowTechnical||!isTechnicalHeading(tb&&tb.title))html+=tableHtml(tb);});
    if(options.includeFiles&&Array.isArray(data.files)&&data.files.length){html+='<div class="ce-ai-card ce-ai-files-card"><h3>Archivos generados</h3><div class="ce-ai-files">';data.files.forEach(function(f,i){html+='<button type="button" class="ce-ai-file-btn" data-file-index="'+i+'">⬇️ '+esc(f.filename||('archivo_'+(i+1)))+'</button><button type="button" class="ce-ai-file-btn" data-file-preview="'+i+'">👁️ Ver</button>';});html+='</div><div id="ceAiFilePreview" class="ce-ai-preview" style="display:none"></div></div>';}
    if(options.includeTrace)html+=traceHtml(data);
    return html;
  }
  function updateArchivedTrace(turnId,data){ var hist=loadZuzuConversation(); for(var i=hist.length-1;i>=0;i--){if(String(hist[i].turnId||'')===String(turnId||'')){hist[i].archiveTraceHtml=traceHtml(data);break;}} saveZuzuConversation(); }
  function compactRouterShadowForHistory(shadow){
    if(!shadow||typeof shadow!=='object') return null;
    return {ok:shadow.ok===true,model:String(shadow.model||'').slice(0,80),decision:(shadow.decision&&typeof shadow.decision==='object')?shadow.decision:null,rawDecision:(shadow.rawDecision&&typeof shadow.rawDecision==='object')?shadow.rawDecision:null,guardrailApplied:shadow.guardrailApplied===true,error:String(shadow.error||'').slice(0,220)};
  }
  function saveRouterShadowInHistory(prompt,shadow,turnId){
    var hist=loadZuzuConversation(),needle=String(prompt||'').trim(),wanted=String(turnId||'').trim();
    for(var i=hist.length-1;i>=0;i--){
      if((wanted && String(hist[i].turnId||'')===wanted) || (!wanted && String(hist[i].user||'').trim()===needle)){ hist[i].routerShadow=compactRouterShadowForHistory(shadow); break; }
    }
    saveZuzuConversation();
  }
  function refreshTraceCard(data){
    var result=$('ceAiResult'); if(!result) return;
    var old=result.querySelector('.ce-ai-trace'); if(!old) return;
    var wasOpen=!!old.querySelector('details[open]');
    var holder=document.createElement('div'); holder.innerHTML=traceHtml(data); var fresh=holder.firstElementChild; if(!fresh) return;
    if(wasOpen){ var d=fresh.querySelector('details'); if(d)d.setAttribute('open','open'); }
    old.replaceWith(fresh);
  }
  async function runZuzuRouterShadowProbe(args){
    args=args||{}; var data=args.data||{};
    var nonce=Number(args.resetNonce||0);
    try{
      var res=await fetch('/api/event-ai/router-shadow',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:args.prompt,selectedEventId:args.selectedEventId,selectedEventTitle:args.selectedEventTitle,usuarioLogado:args.usuarioLogado,conversationHistory:args.history||[],conversationContext:args.conversationContext||null})});
      var raw=await res.text(),shadow={};
      try{shadow=raw?JSON.parse(raw):{};}catch(_){shadow={ok:false,error:raw||('HTTP '+res.status)};}
      if(!res.ok&&shadow.ok!==false)shadow={ok:false,error:shadow.error||('HTTP '+res.status)};
      if(Number(window.__ceZuzuResetNonce||0)!==nonce) return;
      if(!data.meta||typeof data.meta!=='object')data.meta={}; data.meta.routerShadowPending=false; data.meta.routerShadow=shadow;
      recordZuzuShadowUsage(data,shadow); saveRouterShadowInHistory(args.prompt,shadow,args.turnId); updateArchivedTrace(args.turnId,data);
      if(window.__ceLastZuzuResult===data) refreshTraceCard(data);
    }catch(error){
      if(Number(window.__ceZuzuResetNonce||0)!==nonce) return;
      var shadow={ok:false,error:String(error&&error.message||error||'Error Router sombra'),usage:{calls:0,totalTokens:0,promptTokens:0,outputTokens:0,hiddenOutputTokens:0,costEurApprox:0,costUsd:0}};
      if(!data.meta||typeof data.meta!=='object')data.meta={}; data.meta.routerShadowPending=false; data.meta.routerShadow=shadow;
      saveRouterShadowInHistory(args.prompt,shadow,args.turnId); updateArchivedTrace(args.turnId,data); if(window.__ceLastZuzuResult===data) refreshTraceCard(data);
    }
  }
  async function runAi(){
    var prompt=trim(($('ceAiPrompt')||{}).value||'');
    if(!prompt){ setStatus('Escribe primero la petición.', 'err'); return; }
    if(window.__ceZuzuRunBusy){setStatus('Zuzu todavía está cerrando la consulta anterior.','');return;}
    window.__ceZuzuRunBusy=true;var requestController=null,requestWatchdog=null;
    // v2.0_exp: la conversación nativa de Gemini es el hilo principal. El evento de pantalla
    // sigue siendo contexto ambiental y ControlEvent aporta herramientas/hechos canónicos.
    setStatus('', '');
    var resEl=$('ceAiResult');
    var voiceConversation=!!(window.ControlEventV22Voz4&&typeof window.ControlEventV22Voz4.isConversationalMode==='function'&&window.ControlEventV22Voz4.isConversationalMode());
    var conversationTurnNumber=loadZuzuConversation().length+1;
    try{document.dispatchEvent(new CustomEvent('ce:zuzu-request-started',{detail:{prompt:prompt,voiceConversation:voiceConversation,turnNumber:conversationTurnNumber}}));}catch(_){ }
    startZuzuThinking(prompt);
    try{
      var history=conversationHistoryForApi();
      var previousInteractionId=loadZuzuInteractionId();
      var conversationContext=loadZuzuConversationContext();
      var now=new Date(); var tz=''; var localNow=''; try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||'';}catch(_){} try{localNow=new Intl.DateTimeFormat('es-ES',{dateStyle:'full',timeStyle:'medium'}).format(now);}catch(_){localNow=now.toString();}
      requestController=typeof AbortController!=='undefined'?new AbortController():null;
      if(requestController)requestWatchdog=setTimeout(function(){try{requestController.abort();}catch(_){}},75000);
      var res=await fetch('/api/event-ai/analyze',{method:'POST',headers:{'Content-Type':'application/json'},signal:requestController?requestController.signal:undefined,body:JSON.stringify({prompt:prompt,selectedEventId:selectedEventId(),usuarioLogado:loggedUserPayload(),previousInteractionId:previousInteractionId,conversationHistory:history,conversationDigest:conversationDigestForApi(),conversationTurnNumber:conversationTurnNumber,voiceConversation:voiceConversation,conversationContext:conversationContext,clientNowIso:now.toISOString(),clientLocalDateTime:localNow,clientTimeZone:tz})});
      var raw=await res.text();
      var data={};
      try{ data=raw?JSON.parse(raw):{}; }catch(parseError){ data={ok:false,title:'Respuesta no legible de Zuzu',answer:raw||'',warnings:['La API respondió HTTP '+res.status+' pero no devolvió JSON válido.']}; }
      if(!res.ok) throw new Error(data.error || data.answer || raw || ('HTTP '+res.status));
      if(data.ok===false){
        if(data.title || data.answer || data.debugTrace || (data.meta&&data.meta.debugTrace)){
          data.rejected = data.rejected !== false;
          data.warnings = Array.isArray(data.warnings)?data.warnings:[];
          data.warnings.unshift(data.error || 'La API marcó ok=false, pero se muestra la respuesta y la traza para diagnóstico.');
        } else {
          throw new Error(data.error || 'Zuzu respondió ok=false sin detalle técnico. HTTP '+res.status);
        }
      }
      data.__prompt = prompt;
      data.answer=withoutGeminiLabel(ensureZuzuUserPreface(data.answer||''));
      if(data.title) data.title=withoutGeminiLabel(data.title);
      if(Array.isArray(data.warnings)) data.warnings=data.warnings.map(withoutGeminiLabel);
      if(!voiceConversation&&(!Array.isArray(data.charts)||!data.charts.length)&&wantsChart(prompt))data.charts=autoChartsFromTables(data.tables||[]);
      if(voiceConversation){data.charts=[];data.tables=[];data.files=[];}
      var returnedInteractionId=String((data.meta&&data.meta.interactionId)||data.interactionId||'').trim();
      var serverConversationReset=!!(data.meta&&data.meta.resetConversation===true);
      if(serverConversationReset){
        window.__ceZuzuConversationV26=[];
        window.__ceZuzuConversationContextV26=null;
        window.__ceZuzuUsageTotalV285=emptyZuzuUsageTotal();
        window.__ceLastZuzuResult=null;
        window.__ceZuzuResetNonce=(Number(window.__ceZuzuResetNonce||0)+1);
        saveZuzuInteractionId('');
        try{ sessionStorage.removeItem(zuzuConversationKey()); sessionStorage.removeItem(zuzuContextKey()); sessionStorage.removeItem(zuzuInteractionKey()); sessionStorage.removeItem(zuzuUsageTotalKey()); }catch(_){ }
      }
      if(data.meta&&data.meta.resetInteractionId===true) saveZuzuInteractionId('');
      if(returnedInteractionId) saveZuzuInteractionId(returnedInteractionId);
      var returnedContext=(data.meta&&data.meta.conversationContext)||data.conversationContext||null;
      if(returnedContext&&typeof returnedContext==='object'){ window.__ceZuzuConversationContextV26=returnedContext; saveZuzuConversationContext(); }
      if(!Array.isArray(window.__ceZuzuConversationV26)) window.__ceZuzuConversationV26=[];
      var pendingAction=(data.meta&&data.meta.pendingAction&&typeof data.meta.pendingAction==='object')?data.meta.pendingAction:null;
      var turnId='zuzu-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
      if(!data.meta||typeof data.meta!=='object')data.meta={}; // Arquitectura nueva activa: el Router SOMBRA ya no se ejecuta automáticamente.
      recordZuzuUsage(data);
      var fullAnswer=String(data.answer||'');
      var archiveHtml=resultCoreHtml(data,{includeFiles:false,includeTrace:false});
      var archiveTraceHtml=traceHtml(data);
      if(!(data.meta&&data.meta.doNotArchiveTurn===true)){
        window.__ceZuzuConversationV26.push({turnId:turnId,user:prompt,assistant:fullAnswer.slice(0,1200),assistantTail:fullAnswer.slice(-1000),title:String(data.title||'').slice(0,160),provider:String(data.provider||'').slice(0,80),intent:String(data.meta&&data.meta.intent||'').slice(0,120),tools:Array.isArray(data.meta&&data.meta.tools)?data.meta.tools.slice(0,6):[],selectedEventId:selectedEventId(),conversationContext:returnedContext,pendingAction:pendingAction,resultContext:(data.meta&&data.meta.resultContext&&typeof data.meta.resultContext==='object')?data.meta.resultContext:null,routerShadow:null,archiveHtml:archiveHtml,archiveTraceHtml:archiveTraceHtml,archiveMeta:archiveMetaForData(data)});
        if(window.__ceZuzuConversationV26.length>100)window.__ceZuzuConversationV26=window.__ceZuzuConversationV26.slice(-100);
        saveZuzuConversation();
      }
      updateConversationMode();
      updateConversationTrail();
      await finishZuzuThinkingFast();
      stopZuzuThinking();
      renderResult(data);
      setStatus(data.rejected?'Petición rechazada por ámbito.':'', data.rejected?'err':'');
      try{
        document.dispatchEvent(new CustomEvent('ce:zuzu-response-rendered',{detail:{turnId:turnId,voiceConversation:voiceConversation,answer:String(data.answer||''),title:String(data.title||'')}}));
        if(window.ControlEventV22Voz4&&typeof window.ControlEventV22Voz4.maybeAutoRead==='function'){
          setTimeout(function(){ try{window.ControlEventV22Voz4.maybeAutoRead();}catch(_){ } },80);
        }
      }catch(_){ }
      // Router sombra conservado como herramienta de diagnóstico/regresión, pero fuera del flujo normal de producción.
    }catch(err){
      stopZuzuThinking();
      var timedOut=err&&err.name==='AbortError',message=timedOut?'La consulta ha superado 75 segundos. He liberado la conversación para que puedas seguir hablando sin recargar ControlEvent.':String(err&&err.message||err||'Error');
      resEl.innerHTML='<div class="ce-ai-card ce-ai-rejected"><h3>No se pudo consultar Zuzu</h3><div class="ce-ai-answer">'+esc(message)+'</div></div>';
      setStatus(timedOut?'Consulta liberada':'Error', 'err');
      try{document.dispatchEvent(new CustomEvent('ce:zuzu-request-error',{detail:{message:message}}));}catch(_){ }
    }finally{
      if(requestWatchdog)clearTimeout(requestWatchdog);window.__ceZuzuRunBusy=false;
    }
  }
  function usageHtml(data){
    var usage=(data&&data.meta&&data.meta.geminiUsageEstimate)||data&&data.geminiUsageEstimate||null;
    if(!usage || !(Number(usage.calls||0)>0)) return '';
    var tokens=formatNumber(usage.totalTokens||0);
    var cost=formatCost(usage.costEurApprox||0);
    return '<div class="ce-ai-card ce-ai-usage"><h3>💶 Consumo IA</h3><div class="ce-ai-answer">'+esc(String(usage.calls||0))+' '+(Number(usage.calls||0)===1?'llamada':'llamadas')+' · '+esc(tokens)+' tokens · <strong>coste estimado '+esc(cost)+' €</strong><br><small>Estimación ControlEvent según tokens facturables y tarifa contractual configurada.</small></div></div>';
  }
  function traceHtml(data){
    // v2.0_exp: la traza está SIEMPRE disponible en pantalla, plegada por defecto.
    // Los totales Gemini forman parte de la traza: no aparecen fuera de ella.
    var trace=(data && (data.debugTrace || (data.meta&&data.meta.debugTrace))) || [];
    if(!Array.isArray(trace)) trace=[];
    var ok=trace.filter(function(x){return String(x.status||'').toUpperCase()==='OK';}).length;
    var retry=trace.filter(function(x){return String(x.status||'').toUpperCase()==='RETRY';}).length;
    var warn=trace.filter(function(x){return String(x.status||'').toUpperCase()==='WARN';}).length;
    var ko=trace.filter(function(x){return String(x.status||'').toUpperCase()==='KO';}).length;
    var usage=(data&&data.meta&&data.meta.geminiUsageEstimate)||data&&data.geminiUsageEstimate||null;
    var usageBlock='';
    if(usage){
      var calls=Number(usage.calls||0), tokens=Number(usage.totalTokens||0), cost=Number(usage.costEurApprox||0);
      usageBlock='<div class="ce-ai-trace-item"><div class="ce-ai-trace-status '+(calls?'OK':'INFO')+'">'+(calls?'OK':'INFO')+'</div><div><strong>Consumo IA</strong></div><div class="ce-ai-trace-detail">'+
        esc(String(calls))+' '+(calls===1?'llamada':'llamadas')+' · '+esc(formatNumber(tokens))+' tokens · coste estimado '+esc(formatCost(cost))+' €.'+
        (calls?'':' Sin consumo IA en este turno.')+
      '</div></div>';
    }
    var grand=(data&&data.meta&&data.meta.geminiConversationTotal)||loadZuzuUsageTotal();
    var grandBlock='';
    if(grand){
      grandBlock='<div class="ce-ai-trace-item"><div class="ce-ai-trace-status INFO">TOTAL</div><div><strong>Total general de la conversación Zuzu</strong></div><div class="ce-ai-trace-detail">'+
        esc(String(Number(grand.turns||0)))+' turnos · '+esc(String(Number(grand.calls||0)))+' '+(Number(grand.calls||0)===1?'llamada':'llamadas')+' IA · '+esc(formatNumber(Number(grand.totalTokens||0)))+' tokens · <strong>coste estimado '+esc(formatCost(Number(grand.costEurApprox||0)))+' €</strong>.</div></div>';
    }
    var shadow=(data&&data.meta&&data.meta.routerShadow)||null,shadowPending=!!(data&&data.meta&&data.meta.routerShadowPending),shadowBlock='';
    if(shadowPending){
      shadowBlock='<div class="ce-ai-trace-item"><div class="ce-ai-trace-status INFO">DIAG</div><div><strong>Router IA · diagnóstico en sombra</strong></div><div class="ce-ai-trace-detail">Clasificación diagnóstica pendiente. El Router SOMBRA no forma parte del flujo de producción; la arquitectura activa es IA → herramientas ControlEvent → IA.</div></div>';
    }else if(shadow){
      if(shadow.ok&&shadow.decision){
        var d=shadow.decision||{},subject=d.subject&&d.subject.value?(' · sujeto='+d.subject.value):'',event=d.event&&d.event.value?(' · evento='+d.event.value):'',conf=Number(d.confidence||0),guard='';
        if(shadow.guardrailApplied&&shadow.rawDecision){ var rd=shadow.rawDecision||{},rsubject=rd.subject&&rd.subject.value?(' · sujeto='+rd.subject.value):'',revent=rd.event&&rd.event.value?(' · evento='+rd.event.value):''; guard='<div class="ce-ai-trace-detail" style="margin-top:4px;color:#9a3412"><strong>🛡️ Guardrail CE:</strong> IA propuso '+esc(rd.route||'UNKNOWN')+esc(rsubject)+esc(revent)+' · '+esc(rd.operation||'OTHER')+' → CE valida '+esc(d.route||'UNKNOWN')+esc(subject)+esc(event)+' · '+esc(d.operation||'OTHER')+'.</div>'; }
        shadowBlock='<div class="ce-ai-trace-item"><div class="ce-ai-trace-status OK">DIAG</div><div><strong>Router IA · diagnóstico '+esc(d.mode||'')+'</strong></div><div class="ce-ai-trace-detail">TUBERÍA='+esc(d.route||'UNKNOWN')+esc(subject)+esc(event)+' · operación='+esc(d.operation||'OTHER')+' · confianza='+esc((conf*100).toFixed(0))+'%. '+esc(withoutGeminiLabel(d.reason||''))+' <strong>Solo auditoría histórica: no manda en la respuesta. La arquitectura activa es IA → herramientas CE → IA.</strong></div>'+guard+'</div>';
      }else{
        shadowBlock='<div class="ce-ai-trace-item"><div class="ce-ai-trace-status WARN">DIAG</div><div><strong>Router IA · diagnóstico no disponible</strong></div><div class="ce-ai-trace-detail">'+esc(withoutGeminiLabel(shadow.error||'No se pudo clasificar este turno.'))+' La arquitectura activa de Zuzu no se ha visto afectada.</div></div>';
      }
    }
    var items=trace.map(function(x){
      var st=String(x.status||'INFO').toUpperCase();
      var extra='';
      if(x.model) extra+=' Modelo: '+withoutGeminiLabel(x.model)+'.';
      if(x.usage && (x.usage.totalTokens||x.usage.promptTokens)){
        extra+=' Tokens: '+(x.usage.totalTokens||'?')+' total';
        if(x.usage.promptTokens) extra+=' ('+x.usage.promptTokens+' in';
        if(x.usage.outputTokens||x.usage.candidateTokens) extra+=', '+(x.usage.outputTokens||x.usage.candidateTokens)+' out fact.';
        if(x.usage.hiddenOutputTokens) extra+=', '+x.usage.hiddenOutputTokens+' ocultos';
        if(x.usage.promptTokens) extra+=')';
        if(x.usage.costEurApprox!==undefined) extra+=' · coste aprox. '+formatCost(x.usage.costEurApprox)+' €';
        extra+='.';
      }
      return '<div class="ce-ai-trace-item"><div class="ce-ai-trace-status '+esc(st)+'">'+esc(st)+'</div><div><strong>'+esc(withoutGeminiLabel(x.step||'Paso'))+'</strong></div><div class="ce-ai-trace-detail">'+esc(withoutGeminiLabel((x.detail||'')+extra))+'</div></div>';
    }).join('');
    var statusBits=[ok+' OK']; if(retry)statusBits.push(retry+' reintento'+(retry===1?'':'s')); if(warn)statusBits.push(warn+' aviso'+(warn===1?'':'s')); statusBits.push(ko+' KO');
    var overview='<div class="ce-ai-trace-item"><div class="ce-ai-trace-status INFO">INFO</div><div><strong>Resumen técnico</strong></div><div class="ce-ai-trace-detail">'+esc(statusBits.join(' / '))+'</div></div>';
    return '<div class="ce-ai-card ce-ai-trace"><h3>🧭 Traza de resolución</h3><details><summary>Ver traza de resolución</summary>'+overview+usageBlock+grandBlock+shadowBlock+items+'</details></div>';
  }
  function renderResult(data){
    data=data||{}; window.__ceLastZuzuResult=data;
    var titleNode=$('ceAiEventTitle');if(titleNode)titleNode.innerHTML=responseScopeTitleHtml(data);
    if((!Array.isArray(data.charts)||!data.charts.length)&&wantsChart(data.__prompt||''))data.charts=autoChartsFromTables(data.tables||[]);
    var el=$('ceAiResult');el.removeAttribute('data-ce-resume-only');el.innerHTML=resultCoreHtml(data,{includeFiles:true,includeTrace:true});
    el.querySelectorAll('[data-file-index]').forEach(function(btn){btn.onclick=function(){var f=data.files[Number(btn.dataset.fileIndex)];downloadText(f.content||'',f.filename||'archivo.txt',f.mime||'text/plain;charset=utf-8');};});
    el.querySelectorAll('[data-file-preview]').forEach(function(btn){btn.onclick=function(){var f=data.files[Number(btn.dataset.filePreview)];var p=$('ceAiFilePreview');if(!p)return;p.style.display='block';p.textContent=f.content||'';};});
  }
  function wantsChart(p){ var t=String(p||''); return /\b(graf|gr[aá]fic|chart|barras|tarta|queso|pastel|pie|donut|comparativ|curva|visualiz)/i.test(t) || /\b(?:linea|línea)s?\b[^.]{0,50}\b(?:graf|chart|evoluci[oó]n)\b|\b(?:graf|chart|evoluci[oó]n)\b[^.]{0,50}\b(?:linea|línea)s?\b/i.test(t); }
  function autoChartsFromTables(tables){
    var out=[]; (tables||[]).some(function(tb){
      var cols=tb.columns||[], rows=tb.rows||[]; if(!cols.length || !rows.length) return false;
      var title=String(tb.title||'');
      function cn(x){return String(x||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
      var titleN=cn(title);
      var metricCols=/total|unidades|importe|valor|coste|saldo|registros|personas|cantidad|suma|media|promedio/.test(cols.map(cn).join(' '));
      if(/^Resultado SELECT Zuzu/i.test(title) && !metricCols) return false;
      if(/documentos|tickets|public url|image key|descripcion/.test(titleN+' '+cols.map(cn).join(' '))) return false;
      var labelIdx=-1, numIdx=-1;
      for(var l=0;l<cols.length;l++){ if(/producto|articulo|evento|tienda|donante|responsable|colaborador|persona|nombre|label/i.test(cols[l])){ labelIdx=l; break; } }
      if(labelIdx<0) labelIdx=0;
      for(var c=cols.length-1;c>=0;c--){
        if(c===labelIdx) continue;
        var cnm=cn(cols[c]);
        if(!/total|unidades|importe|valor|coste|saldo|registros|personas|cantidad|suma|media|promedio|precio/.test(cnm)) continue;
        if(rows.some(function(r){ var v=String(r[c]||'').replace(',','.').replace(/[^0-9.-]/g,''); return v!=='' && !isNaN(Number(v)); })){ numIdx=c; break; }
      }
      if(numIdx<0 || numIdx===labelIdx) return false;
      var labels=rows.slice(0,20).map(function(r){return String(r[labelIdx]||'');});
      var values=rows.slice(0,20).map(function(r){return Number(String(r[numIdx]||'0').replace(',','.').replace(/[^0-9.-]/g,''))||0;});
      if(!values.some(function(v){return v!==0;})) return false;
      out.push({title:'Gráfica generada desde '+(tb.title||'tabla'),type:'horizontalBar',labels:labels,values:values,unit:/€|importe|valor|precio|coste|saldo/i.test(cols[numIdx]||'')?'€':(/unidad|cantidad/i.test(cols[numIdx]||'')?'uds':'')});
      return true;
    }); return out;
  }
  function chartHtml(ch){
    var labels=(ch.labels||[]).map(String), values=(ch.values||[]).map(Number); var max=Math.max.apply(null, values.map(function(v){return Math.abs(v||0);}).concat([1]));
    var type=String(ch.type||'bar').toLowerCase();
    if(type==='weather') return weatherChartHtml(ch);
    if(type==='pie' || type==='donut') return pieChartHtml(ch, labels, values, type==='donut');
    if(type==='line') return labels.length<2 ? singleMetricChartHtml(ch, labels, values) : lineChartHtml(ch, labels, values);
    if(type==='stackedbar' || (Array.isArray(ch.series) && ch.series.length)) return stackedChartHtml(ch);
    if(type==='bar' || type==='verticalbar') return verticalChartHtml(ch, labels, values);
    var kinds=Array.isArray(ch.pointKinds)?ch.pointKinds:[]; var rich=labels.some(function(x){return x.length>72;});
    var rows=labels.map(function(l,i){ var v=Number(values[i]||0); var raw=(Math.abs(v)/max)*100; var pct=Math.max(v?4.5:2.8, Math.min(100, raw)); var kind=String(kinds[i]||'').toUpperCase(); var color=kind==='INGRESO'?'#22c55e':(kind==='CARGO'?'#e11d48':chartColor(i)); return '<div class="ce-ai-bar-row"'+(rich?' style="grid-template-columns:minmax(260px,42%) 1fr 82px"':'')+'><div class="ce-ai-bar-label" title="'+esc(l)+'">'+esc(l)+'</div><div class="ce-ai-bar-track"><div class="ce-ai-bar-fill" style="width:'+pct.toFixed(1)+'%;background:'+color+'"></div></div><div class="ce-ai-bar-value">'+esc(formatNumber(v,ch.unit))+' '+esc(ch.unit||'')+'</div></div>'; }).join('');
    return '<div class="ce-ai-card"><h3>'+esc(ch.title||'Gráfica')+'</h3><div class="ce-ai-bars">'+rows+'</div></div>';
  }
  function formatNumber(v,unit){ var n=Number(v||0),isMoney=/^(?:€|EUR)$/i.test(String(unit||'').trim()); if(isMoney){var neg=n<0?'-':'',p=Math.abs(n).toFixed(2).split('.');return neg+p[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.')+','+p[1];} return n.toLocaleString('es-ES',{maximumFractionDigits:2}); }
  function formatCost(v){ return Number(v||0).toLocaleString('es-ES',{minimumFractionDigits:5, maximumFractionDigits:6}); }
  function chartColor(i){ return ['#38bdf8','#fb923c','#22c55e','#e11d48','#8b5cf6','#14b8a6','#facc15','#64748b'][i%8]; }
  function chartItemColor(ch,i){
    var colors=Array.isArray(ch&&ch.colors)?ch.colors:[];
    var c=String(colors[i]||'').trim();
    return /^#[0-9a-f]{3,8}$/i.test(c)?c:chartColor(i);
  }

  function weatherIcon(cielo){
    var c=String(cielo||'').toLowerCase();
    if(/tormenta/.test(c)) return '⛈️';
    if(/lluvia|llovizna/.test(c)) return '🌧️';
    if(/nieve/.test(c)) return '❄️';
    if(/niebla/.test(c)) return '🌫️';
    if(/cubierto|nuboso/.test(c)) return '☁️';
    if(/despejado|soleado/.test(c)) return '☀️';
    return '🌤️';
  }
  function weatherChartHtml(ch){
    var rows=Array.isArray(ch.weatherRows)?ch.weatherRows:[];
    if(!rows.length) return '<div class="ce-ai-card"><h3>'+esc(ch.title||'Meteorología')+'</h3><div class="ce-ai-answer">Sin datos meteorológicos disponibles.</div></div>';
    var cards=rows.map(function(r){
      var fecha=esc(r.fechaLabel||((r.dia?String(r.dia)+' ':'')+(r.fecha||''))), cielo=esc(r.cielo||''), loc=esc(r.localidad||'');
      return '<div style="border:1px solid #dbeafe;border-radius:16px;padding:14px;background:linear-gradient(180deg,#ffffff,#f8fafc);box-shadow:0 3px 10px rgba(15,23,42,.06);min-width:210px;flex:1">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px"><div style="font-weight:900;color:#075985">'+fecha+'</div><div style="font-size:30px">'+weatherIcon(r.cielo)+'</div></div>'
        +'<div style="font-weight:850;color:#0f172a;margin-bottom:6px">'+cielo+'</div>'
        +(loc?'<div style="font-size:12px;color:#64748b;margin-bottom:10px">'+loc+'</div>':'')
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
        +'<div style="background:#eff6ff;border-radius:12px;padding:8px"><b style="color:#075985">Máx.</b><br><span style="font-size:20px;font-weight:950">'+esc(formatNumber(r.tmax))+' ºC</span></div>'
        +'<div style="background:#f0f9ff;border-radius:12px;padding:8px"><b style="color:#075985">Mín.</b><br><span style="font-size:20px;font-weight:950">'+esc(formatNumber(r.tmin))+' ºC</span></div>'
        +'<div style="background:#f7fee7;border-radius:12px;padding:8px"><b style="color:#3f6212">Lluvia</b><br><span style="font-size:20px;font-weight:950">'+esc(formatNumber(r.lluvia))+' %</span></div>'
        +'<div style="background:#fff7ed;border-radius:12px;padding:8px"><b style="color:#9a3412">Viento</b><br><span style="font-size:20px;font-weight:950">'+esc(formatNumber(r.viento))+' km/h</span></div>'
        +'</div></div>';
    }).join('');
    return '<div class="ce-ai-card"><h3>'+esc(ch.title||'Meteorología')+'</h3><div style="display:flex;gap:12px;flex-wrap:wrap">'+cards+'</div></div>';
  }
  function singleMetricChartHtml(ch, labels, values){
    var l=labels[0]||''; var v=Number(values[0]||0);
    return '<div class="ce-ai-card"><h3>'+esc(ch.title||'Dato')+'</h3><div style="border:1px solid #dbeafe;border-radius:16px;background:linear-gradient(180deg,#ffffff,#f8fafc);padding:18px;text-align:center"><div style="font-weight:850;color:#475569;margin-bottom:8px">'+esc(l)+'</div><div style="font-size:34px;font-weight:950;color:#075985">'+esc(formatNumber(v,ch.unit))+' '+esc(ch.unit||'')+'</div></div></div>';
  }

  function pieChartHtml(ch, labels, values, donut){
    var total=values.reduce(function(a,b){return a+Number(b||0);},0)||1; var acc=0;
    var stops=values.map(function(v,i){ var start=acc; acc += (Number(v||0)/total)*100; return chartItemColor(ch,i)+' '+start.toFixed(2)+'% '+acc.toFixed(2)+'%'; }).join(',');
    var legend=labels.map(function(l,i){ return '<div class="ce-ai-pie-legend"><span style="background:'+chartItemColor(ch,i)+'"></span>'+esc(l)+' · '+esc(formatNumber(values[i],ch.unit))+' '+esc(ch.unit||'')+'</div>'; }).join('');
    return '<div class="ce-ai-card"><h3>'+esc(ch.title||'Gráfica')+'</h3><div class="ce-ai-pie-wrap"><div class="ce-ai-pie '+(donut?'donut':'')+'" style="background:conic-gradient('+stops+')"></div><div class="ce-ai-pie-list">'+legend+'</div></div></div>';
  }
  function detailedLineChartHtml(ch, labels, values){
    var pointKinds=Array.isArray(ch.pointKinds)?ch.pointKinds:[];
    var pointLabels=Array.isArray(ch.pointLabels)?ch.pointLabels:[];
    var pointTooltips=Array.isArray(ch.pointTooltips)?ch.pointTooltips:[];
    var all=values.map(Number).filter(Number.isFinite);
    if(!all.length) return '<div class="ce-ai-card"><h3>'+esc(ch.title||'Gráfica')+'</h3><div class="ce-ai-answer">Sin valores numéricos para representar.</div></div>';
    var globalMin=Math.min.apply(null,all),globalMax=Math.max.apply(null,all);
    if(globalMin===globalMax){globalMin-=1;globalMax+=1;}else{var gm=(globalMax-globalMin)*0.12;globalMin-=gm;globalMax+=gm;}
    // v2.0_exp: globos completos y legibles. Se reparte la serie solo cuando hace falta,
    // equilibrando los tramos para no dejar una última gráfica con uno o dos movimientos.
    var maxPerSegment=8,segmentCount=Math.max(1,Math.ceil(labels.length/maxPerSegment)),segmentSize=Math.ceil(labels.length/segmentCount),segments=[];
    for(var start=0;start<labels.length;start+=segmentSize){segments.push({start:start,end:Math.min(labels.length,start+segmentSize)});}
    function pointColor(kind){var k=String(kind||'').toUpperCase();if(k==='INGRESO')return '#16a34a';if(k==='CARGO')return '#dc2626';return '#0284c7';}
    function paleFill(kind){var k=String(kind||'').toUpperCase();if(k==='INGRESO')return '#f0fdf4';if(k==='CARGO')return '#fef2f2';return '#f0f9ff';}
    var parts=segments.map(function(seg,segIndex){
      var labs=labels.slice(seg.start,seg.end),vals=values.slice(seg.start,seg.end).map(Number),kinds=pointKinds.slice(seg.start,seg.end),plabs=pointLabels.slice(seg.start,seg.end),tips=pointTooltips.slice(seg.start,seg.end);
      var w=940,h=520,left=76,right=28,top=178,bottom=78,plotW=w-left-right,plotH=h-top-bottom;
      function xFor(i){return left+(labs.length<=1?plotW/2:i*plotW/(labs.length-1));}
      function yFor(v){return top+(globalMax-Number(v))*plotH/(globalMax-globalMin);}
      var grid='';
      for(var g=0;g<=4;g++){var val=globalMax-(globalMax-globalMin)*g/4,y=top+plotH*g/4;grid+='<line x1="'+left+'" y1="'+y.toFixed(1)+'" x2="'+(w-right)+'" y2="'+y.toFixed(1)+'" stroke="#e2e8f0" stroke-width="1"/><text x="'+(left-10)+'" y="'+(y+5).toFixed(1)+'" text-anchor="end" font-size="13" fill="#475569">'+esc(formatNumber(val,ch.unit))+'</text>';}
      var pts=vals.map(function(v,i){return [xFor(i),yFor(v)];});
      var path=pts.map(function(pt,i){return(i?'L':'M')+pt[0].toFixed(1)+','+pt[1].toFixed(1);}).join(' ');
      var dots=pts.map(function(pt,i){
        var pc=pointColor(kinds[i]),fill=paleFill(kinds[i]),lines=String(plabs[i]||'').split('\n').filter(Boolean).slice(0,4),bandY=18+(i%2)*76;
        var bubbleW=126,bubbleH=Math.max(31,12+lines.length*13),bubbleX=Math.max(6,Math.min(w-bubbleW-6,pt[0]-bubbleW/2));
        var textX=bubbleX+bubbleW/2,textY=bandY+14,connectorY=bandY+bubbleH;
        var label=lines.map(function(line,li){return '<tspan x="'+textX.toFixed(1)+'" dy="'+(li===0?'0':'13')+'">'+esc(line)+'</tspan>';}).join('');
        var tip=String(tips[i]||plabs[i]||'');
        return '<line x1="'+textX.toFixed(1)+'" y1="'+connectorY.toFixed(1)+'" x2="'+pt[0].toFixed(1)+'" y2="'+(pt[1]-7).toFixed(1)+'" stroke="'+pc+'" stroke-width="1.1" stroke-dasharray="3 3" opacity=".58"/>'+
          '<rect x="'+bubbleX.toFixed(1)+'" y="'+bandY.toFixed(1)+'" width="'+bubbleW+'" height="'+bubbleH.toFixed(1)+'" rx="8" ry="8" fill="'+fill+'" stroke="'+pc+'" stroke-width="1.2" opacity=".98"/>'+
          '<text x="'+textX.toFixed(1)+'" y="'+textY.toFixed(1)+'" text-anchor="middle" font-size="9.4" font-weight="800" fill="'+pc+'">'+label+'</text>'+
          '<circle cx="'+pt[0].toFixed(1)+'" cy="'+pt[1].toFixed(1)+'" r="5" fill="'+pc+'" stroke="#fff" stroke-width="1.5"><title>'+esc(tip)+'</title></circle>';
      }).join('');
      var xLabels=labs.map(function(label,i){var x=xFor(i);return '<text x="'+x.toFixed(1)+'" y="'+(h-44)+'" text-anchor="middle" font-size="10.5" font-weight="700" fill="#334155">'+esc(label)+'</text>';}).join('');
      var title=segments.length>1?'<div style="font-weight:850;color:#475569;margin:10px 0 2px">Movimientos '+(seg.start+1)+'–'+seg.end+' de '+labels.length+'</div>':'';
      return title+'<div style="overflow-x:auto"><svg class="ce-ai-line-svg ce-ai-bank-detailed-svg" style="height:330px" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+esc((ch.title||'Gráfica de líneas')+(segments.length>1?' · tramo '+(segIndex+1):''))+'">'+grid+'<line x1="'+left+'" y1="'+top+'" x2="'+left+'" y2="'+(h-bottom)+'" stroke="#64748b"/><line x1="'+left+'" y1="'+(h-bottom)+'" x2="'+(w-right)+'" y2="'+(h-bottom)+'" stroke="#64748b"/><path d="'+path+'" fill="none" stroke="#38bdf8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>'+dots+xLabels+'<text x="18" y="'+(top+plotH/2)+'" transform="rotate(-90 18 '+(top+plotH/2)+')" text-anchor="middle" font-size="13" font-weight="800" fill="#334155">'+esc(ch.unit||'Valor')+'</text></svg></div>';
    }).join('');
    var legend='<span style="display:inline-flex;align-items:center;gap:6px;margin-right:14px;font-weight:850"><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#16a34a"></i>Abono / ingreso</span><span style="display:inline-flex;align-items:center;gap:6px;font-weight:850"><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#dc2626"></i>Cargo</span>';
    return '<div class="ce-ai-card ce-ai-bank-chart-card"><h3>'+esc(ch.title||'Gráfica')+'</h3><div class="ce-ai-answer" style="font-size:12px;color:#64748b;margin-bottom:4px">Cada globo muestra concepto, importe, saldo resultante y justificación. Los abonos van en verde y los cargos en rojo.</div>'+parts+'<div style="margin-top:4px">'+legend+'</div>'+bankJustificationHtml(ch)+'</div>';
  }
  function bankJustificationHtml(ch){
    var rows=Array.isArray(ch&&ch.justifiedMovements)?ch.justifiedMovements:[];
    if(!rows.length) return '';
    var html=rows.map(function(r){
      var kind=String(r.type||'').toUpperCase(); if(kind!=='INGRESO'&&kind!=='CARGO') kind='NEUTRO';
      var n=Number(r.movement||0),amount=(n>0?'+':'')+formatNumber(n,'€')+' €';
      return '<div class="ce-ai-bank-move '+esc(kind)+'"><div class="ce-ai-bank-move-head"><span>'+esc(r.moment||'')+'</span><span class="ce-ai-bank-move-amount">'+esc(amount)+'</span><span class="ce-ai-bank-move-balance">Saldo '+esc(formatNumber(Number(r.balance||0),'€'))+' €</span></div><div class="ce-ai-bank-move-concept">'+esc(r.concept||'Sin concepto')+'</div><div class="ce-ai-bank-move-why"><strong>Justificación:</strong> '+esc(r.justification||'Sin vínculo justificativo registrado')+'</div></div>';
    }).join('');
    return '<div class="ce-ai-bank-justified"><h4>Movimientos y justificación de la conciliación</h4>'+html+'</div>';
  }

  function lineChartHtml(ch, labels, values){
    var pointLabels=Array.isArray(ch.pointLabels)?ch.pointLabels:[];
    if(ch&&ch.staticPointLabels===true&&pointLabels.length===labels.length&&labels.length>=2) return detailedLineChartHtml(ch,labels,values);
    var series=Array.isArray(ch.series)&&ch.series.length?ch.series:[{name:ch.title||'Serie',values:values}];
    var all=[]; series.forEach(function(sr){(sr.values||[]).forEach(function(v){var n=Number(v);if(Number.isFinite(n)) all.push(n);});});
    if(!all.length) return '<div class="ce-ai-card"><h3>'+esc(ch.title||'Gráfica')+'</h3><div class="ce-ai-answer">Sin valores numéricos para representar.</div></div>';
    var w=940,h=390,left=76,right=28,top=36,bottom=82;
    var min=Math.min.apply(null,all),max=Math.max.apply(null,all);
    if(min===max){min-=1;max+=1;} else {var margin=(max-min)*0.12;min-=margin;max+=margin;}
    var plotW=w-left-right,plotH=h-top-bottom;
    function xFor(i){return left+(labels.length<=1?plotW/2:i*plotW/(labels.length-1));}
    function yFor(v){return top+(max-Number(v))*plotH/(max-min);}
    var grid='';
    for(var g=0;g<=4;g++){
      var val=max-(max-min)*g/4,y=top+plotH*g/4;
      grid+='<line x1="'+left+'" y1="'+y.toFixed(1)+'" x2="'+(w-right)+'" y2="'+y.toFixed(1)+'" stroke="#e2e8f0" stroke-width="1"/>';
      grid+='<text x="'+(left-10)+'" y="'+(y+5).toFixed(1)+'" text-anchor="end" font-size="13" fill="#475569">'+esc(formatNumber(val,ch.unit))+'</text>';
    }
    var labelStep=Math.max(1,Math.ceil(labels.length/9));
    var xLabels=labels.map(function(label,i){if(i!==0&&i!==labels.length-1&&i%labelStep!==0)return '';var x=xFor(i);return '<text x="'+x.toFixed(1)+'" y="'+(h-46)+'" text-anchor="middle" font-size="12" font-weight="700" fill="#334155">'+esc(label)+'</text>';}).join('');
    var paths='',dots='',legend='';
    var pointKinds=Array.isArray(ch.pointKinds)?ch.pointKinds:[];
    var pointTooltips=Array.isArray(ch.pointTooltips)?ch.pointTooltips:[];
    function pointColor(kind,fallback){var k=String(kind||'').toUpperCase();if(k==='INGRESO')return '#22c55e';if(k==='CARGO')return '#e11d48';return fallback;}
    series.forEach(function(sr,si){
      var vals=(sr.values||[]).map(Number),color=chartColor(si);
      var pts=vals.map(function(v,i){return [xFor(i),yFor(v)];});
      var path=pts.map(function(pt,i){return (i?'L':'M')+pt[0].toFixed(1)+','+pt[1].toFixed(1);}).join(' ');
      paths+='<path d="'+path+'" fill="none" stroke="'+color+'" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>';
      var showValueLabels=pts.length<=24;
      var radius=pts.length>120?2.6:(pts.length>50?3.2:5);
      dots+=pts.map(function(pt,i){var v=vals[i],pc=pointKinds.length===pts.length?pointColor(pointKinds[i],color):color;var tip=pointTooltips[i]||((sr.name||'Serie')+' · '+labels[i]+': '+formatNumber(v,ch.unit)+' '+(ch.unit||'')+(pointKinds[i]?' · '+pointKinds[i]:''));return '<circle cx="'+pt[0].toFixed(1)+'" cy="'+pt[1].toFixed(1)+'" r="'+radius+'" fill="'+pc+'" stroke="#fff" stroke-width="1.5"><title>'+esc(tip)+'</title></circle>'+(showValueLabels?'<text x="'+pt[0].toFixed(1)+'" y="'+(pt[1]-10).toFixed(1)+'" text-anchor="middle" font-size="13" font-weight="900" fill="'+pc+'">'+esc(formatNumber(v,ch.unit))+'</text>':'');}).join('');
      legend+='<span style="display:inline-flex;align-items:center;gap:6px;margin-right:18px;font-weight:850"><i style="display:inline-block;width:22px;height:4px;border-radius:4px;background:'+color+'"></i>'+esc(sr.name||('Serie '+(si+1)))+'</span>';
    });
    if(pointKinds.some(function(k){return String(k).toUpperCase()==='INGRESO';})||pointKinds.some(function(k){return String(k).toUpperCase()==='CARGO';})){
      legend+='<span style="display:inline-flex;align-items:center;gap:6px;margin-right:14px;font-weight:850"><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#22c55e"></i>Ingreso</span>'+ '<span style="display:inline-flex;align-items:center;gap:6px;font-weight:850"><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#e11d48"></i>Cargo</span>';
    }
    return '<div class="ce-ai-card'+((Array.isArray(ch&&ch.justifiedMovements)&&ch.justifiedMovements.length)?' ce-ai-bank-chart-card':'')+'"><h3>'+esc(ch.title||'Gráfica')+'</h3><div style="overflow-x:auto"><svg class="ce-ai-line-svg" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+esc(ch.title||'Gráfica de líneas')+'">'+grid+'<line x1="'+left+'" y1="'+top+'" x2="'+left+'" y2="'+(h-bottom)+'" stroke="#64748b"/><line x1="'+left+'" y1="'+(h-bottom)+'" x2="'+(w-right)+'" y2="'+(h-bottom)+'" stroke="#64748b"/>'+paths+dots+xLabels+'<text x="18" y="'+(top+plotH/2)+'" transform="rotate(-90 18 '+(top+plotH/2)+')" text-anchor="middle" font-size="13" font-weight="800" fill="#334155">'+esc(ch.unit||'Valor')+'</text></svg></div><div style="margin-top:4px">'+legend+'</div>'+bankJustificationHtml(ch)+'</div>';
  }
  function stackedChartHtml(ch){
    var labels=(ch.labels||[]).map(String); var series=(ch.series||[]);
    if(!series.length) return chartHtml({title:ch.title,type:'horizontalBar',labels:labels,values:(ch.values||[]),unit:ch.unit});
    var totals=labels.map(function(_,i){return series.reduce(function(a,s){return a+(Number((s.values||[])[i])||0);},0);}); var max=Math.max.apply(null, totals.concat([1]));
    var rows=labels.map(function(l,i){ var valuesLine=[]; var parts=series.map(function(s,si){ var v=Number((s.values||[])[i]||0); var raw=(v/max)*100; var pct=Math.max(v?4.5:2.0, raw); var show=v && pct>=9.5; if(v){ valuesLine.push('<span><b>'+esc(s.name||('Serie '+(si+1)))+':</b> '+esc(formatNumber(v,ch.unit))+' '+esc(ch.unit||'')+'</span>'); } return '<div class="ce-ai-stack-part" title="'+esc((s.name||'Serie')+': '+formatNumber(v,ch.unit)+' '+(ch.unit||''))+'" style="width:'+pct.toFixed(1)+'%;background:'+chartColor(si)+'">'+(show?esc(formatNumber(v,ch.unit)):'')+'</div>'; }).join(''); return '<div class="ce-ai-stack-row"><div class="ce-ai-stack-label" title="'+esc(l)+'">'+esc(l)+'</div><div class="ce-ai-stack-body"><div class="ce-ai-stack-track">'+parts+'</div><div class="ce-ai-stack-values">'+valuesLine.join('')+'</div></div></div>'; }).join('');
    var leg=series.map(function(s,i){return '<span><i style="background:'+chartColor(i)+'"></i>'+esc(s.name||('Serie '+(i+1)))+'</span>';}).join('');
    return '<div class="ce-ai-card"><h3>'+esc(ch.title||'Gráfica')+'</h3><div class="ce-ai-stacked-wrap">'+rows+'</div><div class="ce-ai-stack-legend">'+leg+'</div></div>';
  }
  function verticalChartHtml(ch, labels, values){
    var max=Math.max.apply(null, values.concat([1]));
    var bars=labels.map(function(l,i){ var v=Number(values[i]||0); var h=Math.max(v?7:4.5, Math.min(100,(v/max)*100)); return '<div class="ce-ai-vbar"><div class="ce-ai-vbar-value">'+esc(formatNumber(v,ch.unit))+' '+esc(ch.unit||'')+'</div><div class="ce-ai-vbar-col" style="height:'+h.toFixed(1)+'%;background:'+chartColor(i)+'"></div><div class="ce-ai-vbar-label" title="'+esc(l)+'">'+esc(l)+'</div></div>'; }).join('');
    return '<div class="ce-ai-card"><h3>'+esc(ch.title||'Gráfica')+'</h3><div class="ce-ai-vbars">'+bars+'</div></div>';
  }
  function tableHtml(tb){
    var cols=tb.columns||[];
    var head=cols.map(function(c){return '<th>'+esc(c)+'</th>';}).join('');
    var rows=(tb.rows||[]).map(function(r){ return '<tr>'+r.map(function(c){return '<td>'+esc(c)+'</td>';}).join('')+'</tr>'; }).join('');
    var wide=cols.length>10?' ce-ai-table-wide':'';
    return '<div class="ce-ai-card"><h3>'+esc(tb.title||'Tabla')+'</h3><div class="ce-ai-table-wrap"><table class="ce-ai-table'+wide+'"><thead><tr>'+head+'</tr></thead><tbody>'+rows+'</tbody></table></div></div>';
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
  window.ControlEventV113ZuzuAnalitica={open:openModal,close:closeModal,install:tick,submitVoicePrompt:function(text){openModal();setTimeout(function(){var p=$('ceAiPrompt');if(p){p.value=String(text||'').trim();p.dispatchEvent(new Event('input',{bubbles:true}));}var b=$('ceAiRun');if(b)b.click();},90);}};
})();
