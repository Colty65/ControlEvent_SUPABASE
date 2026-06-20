/* ControlEvent v11_3_prod - Entrada asistida de COMPRAS mediante foto de ticket e IA.
   FIX Gemini SDK: foto grande izquierda, responsables SOCIO, aviso TK usado, precio automático de producto y orden visual del ticket. */
(function(){
  'use strict';
  var TAG='__ceV96TicketAutoComprasTotalCleanCompactFix';
  if(window[TAG]) return; window[TAG]=true;
  var WRITE_SCOPE='row-crud-v8-5-compras-directo';
  var IMAGE_SCOPE='ticket-image-v8-5-fix26';

  function text(v){ return v == null ? '' : String(v); }
  function trim(v){ return text(v).trim(); }
  function $(id){ return document.getElementById(id); }
  function stateObj(){ try{ return (typeof state !== 'undefined' && state) || window.state || {}; }catch(_){ return window.state || {}; } }
  function authObj(){ try{ return (typeof authUser !== 'undefined' && authUser) || window.authUser || null; }catch(_){ return window.authUser || null; } }
  function isGD(){ var u=authObj(); return !!u && trim(u.nivel).toUpperCase()==='GD'; }
  function arr(name){ var s=stateObj(); return Array.isArray(s[name]) ? s[name] : []; }
  function selectedEventId(){ var s=stateObj(); if(trim(s.selectedEventId)) return trim(s.selectedEventId); var el=$('selectedEvent'); return el ? trim(el.value) : ''; }
  function selectedEvent(){ var id=selectedEventId(); var evs=arr('eventos'); for(var i=0;i<evs.length;i++){ if(trim(evs[i].id)===id) return evs[i]; } return null; }
  function isFinalizado(){ return trim((selectedEvent()||{}).situacion).toLowerCase()==='finalizado'; }
  function uid(){ return 'id-'+Math.random().toString(36).slice(2)+Date.now().toString(36); }
  function normalizeName(v){ return trim(v).replace(/\s+/g,' ').toUpperCase(); }
  function money(v){
    if(typeof v==='number') return isFinite(v) ? v : 0;
    var s=text(v).replace(/€/g,'').replace(/\s/g,'').trim(); if(!s) return 0;
    var c=s.lastIndexOf(','), d=s.lastIndexOf('.');
    if(c!==-1 && d!==-1) s = c>d ? s.replace(/\./g,'').replace(',', '.') : s.replace(/,/g,'');
    else if(c!==-1) s = s.replace(/\./g,'').replace(',', '.');
    else s=s.replace(/,/g,'');
    var n=Number(s); return isFinite(n) ? n : 0;
  }
  function round2(v){ var n=money(v); return Math.round((n + Number.EPSILON) * 100) / 100; }
  function dec(v){ var n=round2(v); return n ? n.toFixed(2) : '0.00'; }
  function euro(v){ var n=money(v); return n.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'; }
  function htmlEscape(v){ return text(v).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function apiJson(url, init){
    return fetch(url, Object.assign({cache:'no-store'}, init||{})).then(function(res){
      return res.json().catch(function(){return {};}).then(function(data){
        if(!res.ok || data.ok===false){ var e=new Error(data.error || data.message || ('HTTP '+res.status+' '+url)); e.details=data; e.status=res.status; throw e; }
        return data;
      });
    });
  }
  function readFileAsDataUrl(file){
    return new Promise(function(resolve, reject){
      var r=new FileReader();
      r.onload=function(){ resolve(String(r.result||'')); };
      r.onerror=function(){ reject(r.error || new Error('No se pudo leer la imagen.')); };
      r.readAsDataURL(file);
    });
  }
  function css(){
    if($('ceV96TicketAiStyle')) return;
    var st=document.createElement('style'); st.id='ceV96TicketAiStyle';
    st.textContent='\n'+
      '.ce-ai-ticket-btn{font-weight:900;font-size:22px;width:46px;min-width:46px;height:40px;min-height:40px;padding:4px 7px;margin-left:auto;background:linear-gradient(135deg,#fff7ed,#fed7aa);border:2px solid #fb923c;color:#9a3412;display:inline-flex;align-items:center;justify-content:center;gap:0;box-shadow:0 4px 12px rgba(154,52,18,.18)}\n'+
      '.ce-ai-ticket-icon{display:inline-flex;align-items:center;justify-content:center;line-height:1}\n'+
      '.ce-ai-overlay{position:fixed;inset:0;background:rgba(15,23,42,.42);z-index:9998;display:none;align-items:center;justify-content:center;padding:8px}\n'+
      '.ce-ai-overlay.open{display:flex}\n'+
      '.ce-ai-modal{width:min(1540px,99vw);max-height:96vh;overflow:hidden;background:#fff;border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.35);border:2px solid #fb923c;padding:14px;display:flex;flex-direction:column}\n'+
      '.ce-ai-head{display:flex;gap:10px;align-items:center;justify-content:space-between;margin-bottom:8px;flex:0 0 auto}\n'+
      '.ce-ai-title{font-size:20px;font-weight:900;color:#7c2d12}.ce-ai-sub{display:none!important}\n'+
      '.ce-ai-status{padding:8px 10px;border-radius:10px;margin:6px 0 10px 0;font-weight:800;flex:0 0 auto}.ce-ai-status.ok{background:#dcfce7;color:#166534}.ce-ai-status.err{background:#fee2e2;color:#991b1b}.ce-ai-status.info{background:#dbeafe;color:#1e3a8a}.ce-ai-status.warn{background:#fef3c7;color:#92400e}\n'+
      '.ce-ai-work{display:grid;grid-template-columns:minmax(315px,36%) minmax(610px,1fr);gap:12px;min-height:0;overflow:hidden}.ce-ai-left,.ce-ai-right{min-height:0}.ce-ai-left{background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:8px;overflow:hidden}.ce-ai-right{display:flex;flex-direction:column;min-width:0;overflow:auto;padding-right:2px}\n'+
      '.ce-ai-photo-title{font-weight:900;color:#334155;font-size:13px}.ce-ai-photo-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.ce-ai-photo-tools input{max-width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:7px;background:#fff}.ce-ai-preview{width:100%;height:calc(96vh - 250px);min-height:360px;max-height:760px;border-radius:12px;border:1px solid #cbd5e1;object-fit:contain;background:#fff;cursor:zoom-in}.ce-ai-preview.empty{display:flex;align-items:center;justify-content:center;background:repeating-linear-gradient(45deg,#f8fafc,#f8fafc 12px,#eef2f7 12px,#eef2f7 24px)}\n'+
      '.ce-ai-grid{display:grid;grid-template-columns:repeat(3,minmax(150px,1fr));gap:10px;margin:0 0 10px 0}.ce-ai-field label{font-weight:800;font-size:12px;color:#334155;display:block;margin-bottom:3px}.ce-ai-field input,.ce-ai-field select{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:8px;background:#fff}\n'+
      '.ce-ai-ticket-used{background:#dcfce7!important;color:#166534!important;font-weight:900!important;border-color:#86efac!important}\n'+
      '.ce-ai-actions{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:6px 0}.ce-ai-actions button,.ce-ai-photo-tools button{border-radius:10px;padding:6px 9px;font-weight:800}.ce-ai-icon-btn{width:42px!important;min-width:42px!important;height:38px!important;min-height:38px!important;padding:4px!important;font-size:22px!important;line-height:1!important;display:inline-flex!important;align-items:center!important;justify-content:center!important}.ce-ai-icon-btn span{display:inline-block;line-height:1!important}.ce-ai-primary{background:#f97316;color:#fff;border:1px solid #ea580c}.ce-ai-secondary{background:#f8fafc;color:#0f172a;border:1px solid #cbd5e1}.ce-ai-danger{background:#fff1f2;color:#9f1239;border:1px solid #fda4af}\n'+
      '.ce-ai-totalbar{display:grid;grid-template-columns:repeat(3,minmax(130px,1fr));gap:8px;margin:8px 0}.ce-ai-totalbox{border:1px solid #e2e8f0;border-radius:12px;background:#fff7ed;padding:8px 10px}.ce-ai-totalbox strong{display:block;color:#7c2d12;font-size:12px}.ce-ai-totalbox span{font-size:18px;font-weight:900;color:#0f172a}.ce-ai-totalbox.diff-ok{background:#dcfce7}.ce-ai-totalbox.diff-warn{background:#fee2e2}\n'+
      '.ce-ai-table-wrap{overflow:auto;border:1px solid #e2e8f0;border-radius:12px;max-height:calc(96vh - 340px);min-height:130px}.ce-ai-table{width:100%;border-collapse:collapse;font-size:13px;table-layout:fixed}.ce-ai-table th{background:#ffedd5;color:#7c2d12;text-align:left;padding:7px;position:sticky;top:0;z-index:1}.ce-ai-table td{padding:6px;border-top:1px solid #e2e8f0;vertical-align:middle}.ce-ai-table input,.ce-ai-table select{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:8px;padding:6px}.ce-ai-table .col-ok{width:46px}.ce-ai-table .col-prod{width:auto}.ce-ai-table .col-attr{width:126px}.ce-ai-table .col-num{width:88px}.ce-ai-table .col-conf{width:62px}.ce-ai-table .col-del{width:46px}.ce-ai-table input[readonly]{background:#f1f5f9;color:#0f172a;font-weight:900}.ce-ai-row-low{background:#fff7ed}.ce-ai-row-ok{background:#f8fafc}.ce-ai-new-product [data-ce-ai-field=\"segmento\"],.ce-ai-new-product [data-ce-ai-field=\"destino\"]{border-color:#fb923c;background:#fff7ed}.ce-ai-existing-product [data-ce-ai-field=\"segmento\"],.ce-ai-existing-product [data-ce-ai-field=\"destino\"]{background:#f1f5f9;color:#475569}\n'+
      '.ce-ai-hintbox{border:1px solid #fed7aa;background:#fff7ed;border-radius:12px;padding:6px 9px;margin:0 0 6px 0}.ce-ai-hintbox label{display:block;font-weight:900;color:#7c2d12;font-size:12px;margin-bottom:3px}.ce-ai-hintbox textarea{width:100%;box-sizing:border-box;min-height:48px;resize:vertical;border:1px solid #fdba74;border-radius:10px;padding:7px;font-family:inherit}.ce-ai-muted{font-size:12px;color:#64748b;font-weight:700;margin-top:3px}\n'+
      '.ce-ai-pending-box{margin-top:10px;border:1px solid #bae6fd;background:#f0f9ff;border-radius:14px;padding:10px}.ce-ai-pending-title{display:flex;justify-content:space-between;gap:8px;align-items:center;font-weight:900;color:#075985}.ce-ai-pending-sub{font-size:12px;color:#0369a1;margin-top:3px}.ce-ai-pending-list{margin-top:8px;max-height:170px;overflow:auto}.ce-ai-pending-row{display:grid;grid-template-columns:42px 1fr 92px 98px;gap:8px;align-items:center;border-top:1px solid #bae6fd;padding:6px 0;font-size:12px}.ce-ai-pending-row:first-child{border-top:none}.ce-ai-pending-row strong{color:#0f172a}.ce-ai-download-btn{white-space:nowrap}\n'+
      '.ce-ai-zoom{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.82);z-index:10020;padding:16px}.ce-ai-zoom.open{display:flex}.ce-ai-zoom img{max-width:96vw;max-height:92vh;object-fit:contain;background:#fff;border-radius:10px}.ce-ai-zoom button{position:absolute;right:18px;top:18px;border-radius:10px;padding:9px 13px;font-weight:900;border:1px solid #cbd5e1;background:#fff;color:#0f172a}\n'+
      '@media(max-width:980px){.ce-ai-modal{overflow:auto}.ce-ai-work{grid-template-columns:1fr;overflow:visible}.ce-ai-right{overflow:visible}.ce-ai-grid{grid-template-columns:1fr}.ce-ai-preview{height:45vh;min-height:260px}.ce-ai-table-wrap{max-height:55vh}.ce-ai-totalbar{grid-template-columns:1fr}}\n'+
      '@media(max-width:760px){.ce-ai-modal{padding:10px}.ce-ai-title{font-size:17px}.ce-ai-table{font-size:12px}.ce-ai-table .col-num{width:74px}.ce-ai-table .col-attr{width:102px}.ce-ai-table .col-conf{width:52px}.ce-ai-table .col-del{width:70px}}\n';
    st.textContent += '\n'+
      '#ceFix46Toast,#ceFix39Toast,#ceFix38Toast{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}\n'+
      '.ce-ai-ticket-btn{margin-left:auto!important;width:46px!important;min-width:46px!important;height:40px!important;gap:0!important;border-color:#fb923c!important;background:linear-gradient(135deg,#fff7ed,#fed7aa)!important;color:#9a3412!important}\n'+
      '#tabCompras>.card>.toggle-row .ce-ai-ticket-btn{align-self:center;justify-self:flex-end}\n'+
      '.ce-ai-modal{width:min(1680px,99.5vw);padding:10px!important}\n'+
      '.ce-ai-head{margin-bottom:4px!important}.ce-ai-title{font-size:18px!important}.ce-ai-sub{display:none!important}\n'+
      '.ce-ai-status{padding:6px 9px!important;margin:4px 0 7px 0!important;font-size:12px!important}\n'+
      '.ce-ai-work{grid-template-columns:minmax(270px,32%) minmax(720px,1fr)!important;gap:10px!important}\n'+
      '.ce-ai-left{padding:8px!important;gap:6px!important}.ce-ai-preview{height:calc(96vh - 220px)!important;min-height:315px!important}\n'+
      '.ce-ai-grid{gap:6px!important;margin-bottom:6px!important}.ce-ai-field input,.ce-ai-field select{padding:5px 7px!important;border-radius:8px!important}\n'+
      '.ce-ai-hintbox{padding:6px 8px!important;margin-bottom:6px!important}.ce-ai-hintbox textarea{min-height:42px!important;padding:6px!important;font-size:12px!important}\n'+
      '.ce-ai-actions{gap:6px!important;margin:6px 0!important}.ce-ai-actions button,.ce-ai-photo-tools button{padding:6px 9px!important;border-radius:9px!important}\n'+
      '.ce-ai-totalbar{gap:6px!important;margin:6px 0!important}.ce-ai-totalbox{padding:6px 8px!important}.ce-ai-totalbox span{font-size:16px!important}.ce-ai-totalbox strong{font-size:11px!important}\n'+
      '.ce-ai-table-wrap{max-height:230px!important;min-height:92px!important}.ce-ai-table{font-size:12px!important}.ce-ai-table th{padding:4px 5px!important}.ce-ai-table td{padding:3px 5px!important}.ce-ai-table input,.ce-ai-table select{padding:4px 5px!important;border-radius:7px!important}\n'+
      '.ce-ai-table .col-ok{width:34px!important}.ce-ai-table .col-attr{width:112px!important}.ce-ai-table .col-num{width:68px!important}.ce-ai-table .col-conf{width:44px!important}.ce-ai-table .col-del{width:52px!important}\n'+
      '.ce-ai-table button.ce-ai-danger{padding:4px 6px!important;font-size:0!important;border-radius:10px!important}.ce-ai-table button.ce-ai-danger::after{content:"✖";font-size:13px!important;}\n'+
      '.ce-ai-pending-box{margin-top:7px!important;padding:8px!important}.ce-ai-pending-title{font-size:15px!important}.ce-ai-pending-tools{display:flex;align-items:center;gap:6px;margin-left:auto}.ce-ai-pending-tools label{font-size:11px;color:#0369a1;font-weight:900}.ce-ai-pending-tools select{border:1px solid #bae6fd;border-radius:8px;padding:5px;background:#fff;font-weight:800}\n'+
      '.ce-ai-pending-list{max-height:230px!important;margin-top:5px!important}.ce-ai-pending-row{grid-template-columns:30px minmax(120px,1fr) minmax(96px,150px) 96px 90px!important;gap:6px!important;padding:4px 0!important;font-size:12px!important}\n';
    st.textContent += "\n.ce-ai-head{display:flex!important;align-items:center!important;gap:10px!important;margin-bottom:4px!important}\n.ce-ai-title{flex:0 0 auto!important;white-space:nowrap!important;font-size:18px!important}\n.ce-ai-status{flex:1 1 auto!important;min-width:120px!important;margin:0 8px!important;padding:5px 8px!important;border-radius:9px!important;font-size:12px!important;line-height:1.15!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;border:1px solid #e2e8f0!important;background:#f8fafc!important;color:#475569!important}\n.ce-ai-status:empty{visibility:hidden!important}\n.ce-ai-hintbox{padding:0!important;border:0!important;background:transparent!important;margin:0 0 4px 0!important}\n.ce-ai-hintbox textarea{min-height:34px!important;height:38px!important;font-size:12px!important;padding:6px 8px!important}\n.ce-ai-actions-top{display:grid!important;grid-template-columns:1fr 1fr 1fr!important;align-items:center!important;margin:4px 0!important}\n.ce-ai-actions-top button{justify-self:center!important}.ce-ai-actions-top #ceAiAnalyze{justify-self:start!important}.ce-ai-actions-top #ceAiClear{justify-self:end!important}\n.ce-ai-actions-bottom{display:flex!important;justify-content:space-between!important;align-items:center!important;margin:5px 0 0 0!important}\n.ce-ai-icon-btn{width:32px!important;min-width:32px!important;height:30px!important;min-height:30px!important;font-size:16px!important;padding:1px!important;border-radius:8px!important;line-height:1!important}\n.ce-ai-totalbar{margin:4px 0!important}.ce-ai-totalbox{padding:5px 7px!important}.ce-ai-totalbox span{font-size:15px!important}.ce-ai-totalbox strong{font-size:11px!important}\n.ce-ai-table-wrap{max-height:238px!important;min-height:238px!important;flex:0 0 auto!important}.ce-ai-table{font-size:11px!important}.ce-ai-table th{padding:3px 4px!important}.ce-ai-table td{padding:2px 4px!important;height:29px!important}.ce-ai-table input,.ce-ai-table select{padding:3px 4px!important;font-size:11px!important}\n.ce-ai-table .col-ok{width:30px!important}.ce-ai-table .col-attr{width:100px!important}.ce-ai-table .col-num{width:62px!important}.ce-ai-table .col-conf{width:38px!important}.ce-ai-table .col-del{width:44px!important}.ce-ai-table button.ce-ai-danger{padding:3px 4px!important;font-size:10px!important}\n.ce-ai-right{overflow:hidden!important}.ce-ai-pending-box{flex:1 1 auto!important;min-height:120px!important;margin-top:6px!important;padding:7px!important;display:flex!important;flex-direction:column!important;overflow:hidden!important}.ce-ai-pending-title{font-size:13px!important;line-height:1.15!important}.ce-ai-pending-tools{display:flex!important;gap:5px!important;align-items:center!important}.ce-ai-pending-tools label{display:none!important}.ce-ai-pending-tools select{height:30px!important;font-size:11px!important;padding:2px 5px!important;border-radius:8px!important}\n.ce-ai-pending-list{flex:1 1 auto!important;max-height:none!important;overflow:auto!important;margin-top:5px!important}.ce-ai-pending-sub{display:none!important}.ce-ai-pending-row{grid-template-columns:28px 1fr 92px 90px 82px!important;gap:5px!important;padding:4px 0!important;font-size:11px!important}.ce-ai-pending-row input{width:16px!important;height:16px!important}\n";

    st.textContent += '\n.ce-ai-trash-btn{width:30px!important;min-width:30px!important;height:28px!important;min-height:28px!important;padding:0!important;border-radius:8px!important;font-size:16px!important;line-height:1!important;display:inline-flex!important;align-items:center!important;justify-content:center!important}\n.ce-ai-trash-btn::after{content:""!important;font-size:0!important}\n.ce-ai-table button.ce-ai-trash-btn{font-size:16px!important;padding:0!important}\n';

    st.textContent += '\n@media (max-width:767px){.ce-ai-overlay{align-items:flex-start!important;padding:4px!important}.ce-ai-modal{width:99vw!important;max-height:98vh!important;padding:8px!important;border-radius:12px!important;overflow:auto!important}.ce-ai-head{position:sticky!important;top:0!important;background:#fff!important;z-index:8!important;padding-bottom:4px!important}.ce-ai-title{font-size:15px!important}.ce-ai-work{display:flex!important;flex-direction:column!important;gap:6px!important;overflow:visible!important}.ce-ai-left,.ce-ai-right{width:100%!important;min-width:0!important;overflow:visible!important;padding:6px!important;box-sizing:border-box!important}.ce-ai-photo-title{display:none!important}.ce-ai-photo-tools{justify-content:center!important;gap:6px!important}.ce-ai-photo-tools input{max-width:100%!important;font-size:12px!important;padding:5px!important}.ce-ai-photo-tools #ceAiZoomBtn{font-size:12px!important;padding:5px 7px!important}.ce-ai-preview{height:160px!important;min-height:120px!important;max-height:210px!important}.ce-ai-grid{grid-template-columns:1fr!important;gap:5px!important;margin-bottom:4px!important}.ce-ai-field label{font-size:11px!important;margin-bottom:1px!important}.ce-ai-field select{padding:5px!important;font-size:12px!important}.ce-ai-hintbox textarea{height:32px!important;min-height:32px!important;font-size:11px!important}.ce-ai-totalbar{grid-template-columns:1fr 1fr 1fr!important;gap:4px!important}.ce-ai-totalbox{padding:4px!important}.ce-ai-totalbox strong{font-size:9px!important}.ce-ai-totalbox span{font-size:12px!important}.ce-ai-table-wrap{max-height:220px!important;min-height:190px!important;overflow:auto!important}.ce-ai-table{font-size:10px!important;min-width:720px!important}.ce-ai-pending-box{min-height:220px!important}.ce-ai-pending-title{font-size:12px!important;align-items:flex-start!important}.ce-ai-pending-row{grid-template-columns:25px 1fr 74px 72px 70px!important;font-size:10px!important}.ce-ai-actions-bottom{padding-bottom:4px!important}.ce-ai-download-btn{display:none!important}}\n#ceAiDownloadPhoto{display:none!important}\n';
    document.head.appendChild(st);
  }
  function sortedByName(list){
    return (list || []).slice().sort(function(a,b){
      return trim(a && (a.nombre || a.name || a.id)).localeCompare(trim(b && (b.nombre || b.name || b.id)), 'es', {sensitivity:'base'});
    });
  }
  function options(list, selected, labelFn){
    var out='<option value=""></option>';
    sortedByName(list).forEach(function(item){
      var id=trim(item.id); var lab=labelFn ? labelFn(item) : (item.nombre || id);
      out+='<option value="'+htmlEscape(id)+'"'+(id===trim(selected)?' selected':'')+'>'+htmlEscape(lab)+'</option>';
    });
    return out;
  }
  function normalizePlain(v){ return normalizeName(v).replace(/[ÁÀÄÂ]/g,'A').replace(/[ÉÈËÊ]/g,'E').replace(/[ÍÌÏÎ]/g,'I').replace(/[ÓÒÖÔ]/g,'O').replace(/[ÚÙÜÛ]/g,'U'); }
  function isDonationTicket(v){
    var n=normalizePlain(v);
    return /^DON/.test(n) || n.indexOf('DONACION')>=0 || n.indexOf('DONADO')>=0;
  }
  function isSocioPersona(p){
    var r=normalizePlain((p && (p.rango || p.tipo || p.categoria || p.clase)) || '');
    return r === 'SOCIO' || (r.indexOf('SOCIO') >= 0 && r.indexOf('NO SOCIO') < 0);
  }
  function usedTicketMap(){
    var used={}, ev=selectedEventId();
    arr('compras').forEach(function(c){
      if(ev && trim(c.eventId) && trim(c.eventId)!==ev) return;
      var tk=trim(c.ticketDonacion).toUpperCase();
      if(/^TK\d+/.test(tk) && !isDonationTicket(tk)) used[tk]=(used[tk]||0)+1;
    });
    return used;
  }
  function ticketOptions(selected, used){
    used = used || usedTicketMap(); selected = trim(selected).toUpperCase();
    var out='<option value=""></option>';
    for(var i=1;i<=50;i++){
      var tk='TK'+String(i).padStart(2,'0'); var usedCount=Number(used[tk]||0); var isUsed=usedCount>0;
      var attrs=(tk===selected?' selected':'') + (isUsed?' class="ce-ai-ticket-used" style="background:#dcfce7;color:#166534;font-weight:900" title="TKxx ya utilizado en este evento ('+usedCount+' líneas)"':'');
      out+='<option value="'+tk+'"'+attrs+'>'+tk+(isUsed?' ✓':'')+'</option>';
    }
    return out;
  }
  function markTicketSelect(){
    var sel=$('ceAiTicket'); if(!sel) return;
    var used=usedTicketMap(); var tk=trim(sel.value).toUpperCase(); var usedCount=Number(used[tk]||0); var isUsed=usedCount>0;
    sel.classList.toggle('ce-ai-ticket-used', isUsed);
    sel.title=isUsed ? ('Este TKxx ya está usado en COMPRAS para este evento ('+usedCount+' líneas).') : 'Selecciona el TKxx del ticket.';
  }
  function ticketFromText(v){
    var m=/\bTK\s*0*(\d{1,2})\b/i.exec(text(v||''));
    if(!m) return '';
    var n=Number(m[1]);
    return n>=1 && n<=50 ? ('TK'+String(n).padStart(2,'0')) : '';
  }
  function applyTicketFromAi(value, hint){
    var tk=ticketFromText(value) || ticketFromText(hint);
    var sel=$('ceAiTicket');
    if(tk && sel){ sel.value=tk; markTicketSelect(); return 'TK detectado: '+tk+'.'; }
    return '';
  }
  function sortLinesLikeTk(rows){
    // Mantener el orden visual del ticket/foto. La IA devuelve las líneas en ese orden y el usuario puede comprobarlas contra la imagen.
    return (rows || []).slice();
  }
  function ensureUi(){
    css();
    var btn=$('btnReceiptAiCompras');
    if(!btn){
      btn=document.createElement('button');
      btn.type='button'; btn.id='btnReceiptAiCompras';
      btn.addEventListener('click',function(ev){ if(ev){ ev.preventDefault(); ev.stopPropagation(); } openPanel(); });
    }
    btn.className='outline app-lockable ce-ai-ticket-btn';
    btn.setAttribute('data-ce-ai-ticket-open','1');
    btn.setAttribute('aria-label','Abrir Tickets IA');
    btn.title='Tickets IA: alta asistida de COMPRAS desde foto de ticket';
    btn.innerHTML='<span class="ce-ai-ticket-icon" aria-hidden="true">🧾✨</span>';
    btn.setAttribute('onclick','window.__ceOpenTicketAutoV96&&window.__ceOpenTicketAutoV96();return false;');
    var oldHeaderBtn=$('btnReceiptAiComprasHeader'); if(oldHeaderBtn && oldHeaderBtn.parentNode) oldHeaderBtn.parentNode.removeChild(oldHeaderBtn);
    var header=document.querySelector('#tabCompras > .card > .toggle-row');
    var toggle=$('toggleComprasEvent');
    if(header && btn.parentNode!==header){
      if(toggle && toggle.parentNode===header) header.insertBefore(btn, toggle);
      else header.appendChild(btn);
    } else if(!header && !btn.parentNode){
      var footer=document.querySelector('.footer-inner'); if(footer) footer.appendChild(btn);
    }
    if(!$('ceAiTicketPanel')){
      var div=document.createElement('div'); div.id='ceAiTicketPanel'; div.className='ce-ai-overlay';
      div.innerHTML='<div class="ce-ai-modal">'+
        '<div class="ce-ai-head"><div class="ce-ai-title">🧾✨ Alta asistida de COMPRAS</div><div id="ceAiStatus" class="ce-ai-status info"></div><button type="button" id="ceAiClose" class="ce-ai-secondary">Cerrar</button></div>'+ 
        '<div class="ce-ai-work">'+
          '<aside class="ce-ai-left">'+
            '<div class="ce-ai-photo-title">Foto del ticket</div>'+ 
            '<div class="ce-ai-photo-tools"><input id="ceAiFile" type="file" accept="image/*" capture="environment"><button type="button" id="ceAiZoomBtn" class="ce-ai-secondary">Ampliar foto</button></div>'+ 
            '<img id="ceAiPreview" class="ce-ai-preview" alt="Vista previa del ticket" style="display:none">'+
          '</aside>'+ 
          '<section class="ce-ai-right">'+
            '<div class="ce-ai-grid">'+
              '<div class="ce-ai-field"><label>TKxx</label><select id="ceAiTicket"></select></div>'+ 
              '<div class="ce-ai-field"><label>Tienda</label><select id="ceAiTienda"></select></div>'+ 
              '<div class="ce-ai-field"><label>Responsable</label><select id="ceAiResponsable"></select></div>'+ 
            '</div>'+ 
            '<div class="ce-ai-hintbox"><textarea id="ceAiGeminiHint" placeholder="Ej.: responsable Juan Pérez; añade PROPINAS 1 ud 73,05 €; aplica IVA general a las líneas si procede."></textarea></div>'+
            '<div class="ce-ai-actions ce-ai-actions-top"><button type="button" id="ceAiAnalyze" class="ce-ai-primary ce-ai-icon-btn" aria-label="Analizar foto con IA"><span aria-hidden="true">🤖</span></button><button type="button" id="ceAiAddRow" class="ce-ai-secondary ce-ai-icon-btn" aria-label="Añadir fila manual"><span aria-hidden="true">🤚＋</span></button><button type="button" id="ceAiClear" class="ce-ai-danger ce-ai-icon-btn" aria-label="Limpiar"><span aria-hidden="true">🧹</span></button></div>'+ 
            '<datalist id="ceAiProducts"></datalist><datalist id="ceAiSegmentos"></datalist><datalist id="ceAiDestinos"></datalist>'+ 
            '<div class="ce-ai-totalbar"><div class="ce-ai-totalbox"><strong>Total factura líneas OK</strong><span id="ceAiTotalLines">0,00 €</span></div><div class="ce-ai-totalbox"><strong>Total leído en foto por IA</strong><span id="ceAiTotalPhoto">—</span></div><div id="ceAiDiffBox" class="ce-ai-totalbox"><strong>Diferencia</strong><span id="ceAiTotalDiff">—</span></div></div>'+ 
            '<div class="ce-ai-table-wrap"><table class="ce-ai-table"><thead><tr><th class="col-ok">OK</th><th class="col-prod">Producto</th><th class="col-attr">Segmento</th><th class="col-attr">Destino</th><th class="col-num">Unid.</th><th class="col-num">Precio</th><th class="col-num">Importe</th><th class="col-conf">Conf.</th><th class="col-del"></th></tr></thead><tbody id="ceAiRows"><tr><td colspan="9">Sin líneas todavía.</td></tr></tbody></table></div>'+ 
            '<div id="ceAiPendingBox" class="ce-ai-pending-box"><div class="ce-ai-pending-title"><span>Compras previstas del evento. Marca para eliminar las ya compradas en este ticket</span><div class="ce-ai-pending-tools"><select id="ceAiPendingSort"><option value="tienda">por Tienda</option><option value="producto">por Producto</option></select><button type="button" id="ceAiPendingRefresh" class="ce-ai-secondary ce-ai-icon-btn" aria-label="Actualizar compras previstas">🔄</button></div></div><div id="ceAiPendingList" class="ce-ai-pending-list"></div></div>'+
            '<div class="ce-ai-actions ce-ai-actions-bottom"><button type="button" id="ceAiProcess" class="ce-ai-primary ce-ai-icon-btn" aria-label="Procesar y llevar a COMPRAS"><span aria-hidden="true">⚙️⚙️</span></button><button type="button" id="ceAiReloadEvent" class="ce-ai-secondary ce-ai-icon-btn" aria-label="Recargar evento"><span aria-hidden="true">🔋↻</span></button></div>'+ 
          '</section>'+ 
        '</div>'+ 
      '</div>'+
      '<div id="ceAiZoomPanel" class="ce-ai-zoom"><button type="button" id="ceAiZoomClose">Cerrar</button><img id="ceAiZoomImg" alt="Ticket ampliado"></div>';
      document.body.appendChild(div);
      $('ceAiClose').addEventListener('click',closePanel);
      $('ceAiFile').addEventListener('change',fileChanged);
      $('ceAiTicket').addEventListener('change',markTicketSelect);
      $('ceAiTienda').addEventListener('change',renderPendingPurchases);
      $('ceAiAnalyze').addEventListener('click',analyze);
      $('ceAiAddRow').addEventListener('click',function(){ addRow({descripcion:'',unidades:1,precio:0,importe:0,confianza:0,requiereRevision:true,manual:true}); });
      $('ceAiClear').addEventListener('click',clearRows);
      $('ceAiProcess').addEventListener('click',processRows);
      $('ceAiReloadEvent').addEventListener('click',function(){ reloadEvent(false); });
      $('ceAiZoomBtn').addEventListener('click',openZoom);
      if($('ceAiDownloadPhoto')) $('ceAiDownloadPhoto').addEventListener('click',function(){ downloadCurrentTicketPhoto(); });
      $('ceAiPendingRefresh').addEventListener('click',function(){ renderPendingPurchases(); setStatus('Compras previstas actualizadas.','ok'); });
      if($('ceAiPendingSort')) $('ceAiPendingSort').addEventListener('change',renderPendingPurchases);
      $('ceAiPreview').addEventListener('click',openZoom);
      $('ceAiZoomClose').addEventListener('click',closeZoom);
      $('ceAiZoomPanel').addEventListener('click',function(ev){ if(ev.target===$('ceAiZoomPanel')) closeZoom(); });
    }
    refreshRole(); updateTotals();
  }
  function refreshRole(){ var show=isGD()?'':'none'; var btn=$('btnReceiptAiCompras'); if(btn) btn.style.display=show; var hbtn=$('btnReceiptAiComprasHeader'); if(hbtn && hbtn.parentNode) hbtn.parentNode.removeChild(hbtn); }
  function setStatus(msg,type){ var el=$('ceAiStatus'); if(el){ el.className='ce-ai-status '+(type||'info'); el.textContent=msg||''; el.title=msg||''; } }
  function fillSelects(){
    var tienda=$('ceAiTienda'), resp=$('ceAiResponsable');
    var oldT=tienda ? trim(tienda.value) : ''; var oldR=resp ? trim(resp.value) : '';
    if(tienda) tienda.innerHTML=options(arr('tiendas'), oldT, function(t){return t.nombre || t.id;});
    if(resp) resp.innerHTML=options(arr('personas').filter(isSocioPersona), oldR, function(p){return p.nombre || p.id;});
    var dl=$('ceAiProducts'); if(dl){ var ps=sortedByName(arr('productos')); dl.innerHTML=ps.map(function(p){return '<option value="'+htmlEscape(p.nombre||'')+'"></option>';}).join(''); }
    var seg=$('ceAiSegmentos'); if(seg){ seg.innerHTML=uniqueProductValues('segmento').map(function(v){return '<option value="'+htmlEscape(v)+'"></option>';}).join(''); }
    var des=$('ceAiDestinos'); if(des){ des.innerHTML=uniqueProductValues('destino').map(function(v){return '<option value="'+htmlEscape(v)+'"></option>';}).join(''); }
    var used=usedTicketMap(); var sel=$('ceAiTicket');
    if(sel){ var current=trim(sel.value).toUpperCase(); var keep=current || ''; sel.innerHTML=ticketOptions(keep, used); sel.value=keep; markTicketSelect(); }
  }
  function openPanel(){
    if(!isGD()){ alert('Esta función solo está disponible para GD.'); return; }
    if(!selectedEventId()){ alert('Selecciona primero un evento.'); return; }
    if(isFinalizado()){ alert('Evento Finalizado: para procesar tickets debe estar En curso.'); return; }
    ensureUi(); fillSelects(); resetPanelState(true); $('ceAiTicketPanel').classList.add('open'); updateTotals(); installTicketImageDownloadButtons();
  }
  function closePanel(){ var p=$('ceAiTicketPanel'); if(p) p.classList.remove('open'); }
  function openZoom(){ var src=window.__ceAiTicketImage || (($('ceAiPreview')||{}).src || ''); if(!src){ setStatus('Carga primero una foto para ampliarla.','warn'); return; } var img=$('ceAiZoomImg'), p=$('ceAiZoomPanel'); if(img) img.src=src; if(p) p.classList.add('open'); }
  function closeZoom(){ var p=$('ceAiZoomPanel'); if(p) p.classList.remove('open'); }
  function fileChanged(){
    var f=$('ceAiFile').files && $('ceAiFile').files[0]; if(!f) return;
    readFileAsDataUrl(f).then(function(dataUrl){ window.__ceAiTicketImage=dataUrl; var img=$('ceAiPreview'); if(img){ img.src=dataUrl; img.style.display=''; } window.__ceAiDetectedTotal=0; updateTotals(); setStatus('Foto cargada.','ok'); }).catch(function(e){ setStatus(e.message||String(e),'err'); });
  }
  function resetPanelState(silent){
    window.__ceAiTicketLines=[]; window.__ceAiTicketImage=''; window.__ceAiDetectedTotal=0;
    if($('ceAiFile')) $('ceAiFile').value='';
    if($('ceAiPreview')){ $('ceAiPreview').src=''; $('ceAiPreview').style.display='none'; }
    if($('ceAiGeminiHint')) $('ceAiGeminiHint').value='';
    if($('ceAiTicket')) $('ceAiTicket').value='';
    if($('ceAiTienda')) $('ceAiTienda').value='';
    if($('ceAiResponsable')) $('ceAiResponsable').value='';
    if($('ceAiPendingSort')) $('ceAiPendingSort').value='tienda';
    if($('ceAiPendingList')) $('ceAiPendingList').innerHTML='';
    renderRows(); updateTotals(); markTicketSelect();
    setStatus(silent ? '' : 'Limpio.','ok');
  }
  function clearRows(){
    try{ fillSelects(); }catch(_){}
    resetPanelState(false);
  }
  function updateRowImport(tr){
    if(!tr) return 0;
    var u=money((tr.querySelector('[data-ce-ai-field="unidades"]')||{}).value)||1;
    var p=money((tr.querySelector('[data-ce-ai-field="precio"]')||{}).value);
    var total=round2(u*p);
    var imp=tr.querySelector('[data-ce-ai-field="importe"]'); if(imp) imp.value=dec(total);
    return total;
  }
  function collectRows(updateInputs){
    var out=[];
    document.querySelectorAll('#ceAiRows tr[data-ce-ai-row]').forEach(function(tr){
      if(updateInputs!==false) updateRowImport(tr);
      var obj={};
      tr.querySelectorAll('[data-ce-ai-field]').forEach(function(inp){ var k=inp.getAttribute('data-ce-ai-field'); obj[k]= inp.type==='checkbox' ? inp.checked : inp.value; });
      obj.descripcion=trim(obj.descripcion); obj.unidades=money(obj.unidades)||1; obj.precio=money(obj.precio); obj.importe=round2(obj.unidades*obj.precio); obj.confianza=Number(tr.getAttribute('data-ce-ai-conf')||0) || 0; out.push(obj);
    });
    window.__ceAiTicketLines=out; return out;
  }
  function updateTotals(){
    var rows=collectRows(false); var selected=0;
    rows.forEach(function(r){ if(r.ok!==false) selected += round2((money(r.unidades)||1)*money(r.precio)); });
    var tLines=$('ceAiTotalLines'); if(tLines) tLines.textContent=euro(selected);
    var detected=money(window.__ceAiDetectedTotal||0);
    var tPhoto=$('ceAiTotalPhoto'); if(tPhoto) tPhoto.textContent=detected ? euro(detected) : '—';
    var diffEl=$('ceAiTotalDiff'), box=$('ceAiDiffBox');
    if(diffEl){ diffEl.textContent=detected ? euro(selected-detected) : '—'; }
    if(box){ box.classList.remove('diff-ok','diff-warn'); if(detected){ box.classList.add(Math.abs(selected-detected)<0.02 ? 'diff-ok' : 'diff-warn'); } }
  }
  function renderRows(){
    var body=$('ceAiRows'); if(!body) return;
    var rows=sortLinesLikeTk((window.__ceAiTicketLines || []).map(enrichRowDefaults)); window.__ceAiTicketLines=rows;
    if(!rows.length){ body.innerHTML='<tr><td colspan="9">Sin líneas todavía.</td></tr>'; updateTotals(); return; }
    body.innerHTML=rows.map(function(r,i){
      var existing=productByExactName(r.descripcion);
      var cls=(Number(r.confianza||0)<0.65 || !trim(r.descripcion))?'ce-ai-row-low':'ce-ai-row-ok';
      cls += existing ? ' ce-ai-existing-product' : ' ce-ai-new-product';
      var unidades=money(r.unidades)||1; var precio=money(r.precio); var importe=round2(unidades*precio);
      var seg=existing ? (existing.segmento||'') : (r.segmento||guessSegment(r.descripcion));
      var des=existing ? (existing.destino||'') : (r.destino||guessDestino(r.descripcion));
      var attrTitle=existing ? 'Producto existente: se actualiza precio en PRODUCTOS y se conservan segmento/destino actuales.' : 'Producto nuevo: informa segmento y destino antes de confirmar.';
      return '<tr class="'+cls+'" data-ce-ai-row="'+i+'" data-ce-ai-conf="'+htmlEscape(r.confianza||0)+'" data-ce-ai-existing="'+(existing?'1':'0')+'">'+
        '<td><input type="checkbox" data-ce-ai-field="ok" '+(r.ok!==false?'checked':'')+'></td>'+ 
        '<td><input list="ceAiProducts" data-ce-ai-field="descripcion" value="'+htmlEscape(r.descripcion||'')+'" placeholder="Nombre producto"></td>'+ 
        '<td><select data-ce-ai-field="segmento" '+(existing?'disabled':'')+' title="'+htmlEscape(attrTitle)+'">'+selectOptionsFromValues(uniqueProductValues('segmento'), seg, 'Segmento')+'</select></td>'+ 
        '<td><select data-ce-ai-field="destino" '+(existing?'disabled':'')+' title="'+htmlEscape(attrTitle)+'">'+selectOptionsFromValues(uniqueProductValues('destino'), des, 'Destino')+'</select></td>'+ 
        '<td><input class="num" data-ce-ai-field="unidades" value="'+htmlEscape(unidades)+'"></td>'+ 
        '<td><input class="num" data-ce-ai-field="precio" value="'+htmlEscape(precio)+'"></td>'+ 
        '<td><input class="num" data-ce-ai-field="importe" value="'+htmlEscape(dec(importe))+'" readonly title="Calculado automáticamente: unidades x precio"></td>'+ 
        '<td>'+Math.round(Number(r.confianza||0)*100)+'%</td>'+ 
        '<td><button type="button" class="ce-ai-danger ce-ai-trash-btn" data-ce-ai-del="'+i+'" aria-label="Eliminar línea" title="Eliminar línea">🗑️</button></td>'+ 
      '</tr>';
    }).join('');
    body.querySelectorAll('[data-ce-ai-field="unidades"],[data-ce-ai-field="precio"]').forEach(function(input){ input.addEventListener('input',function(){ updateRowImport(input.closest('tr')); collectRows(false); updateTotals(); }); input.addEventListener('change',function(){ updateRowImport(input.closest('tr')); collectRows(false); updateTotals(); }); });
    body.querySelectorAll('[data-ce-ai-field="descripcion"]').forEach(function(input){ input.addEventListener('input',function(){ collectRows(false); updateTotals(); }); input.addEventListener('change',function(){ applyProductPriceFromName(input); collectRows(false); renderRows(); updateTotals(); }); });
    body.querySelectorAll('[data-ce-ai-field="segmento"],[data-ce-ai-field="destino"]').forEach(function(input){ input.addEventListener('input',function(){ collectRows(false); }); input.addEventListener('change',function(){ collectRows(false); }); });
    body.querySelectorAll('[data-ce-ai-field="ok"]').forEach(function(input){ input.addEventListener('input',function(){ collectRows(false); updateTotals(); }); input.addEventListener('change',function(){ collectRows(false); updateTotals(); }); });
    body.querySelectorAll('[data-ce-ai-del]').forEach(function(btn){ btn.addEventListener('click',function(){ collectRows(); var idx=Number(btn.getAttribute('data-ce-ai-del')); (window.__ceAiTicketLines||[]).splice(idx,1); renderRows(); }); });
    updateTotals();
  }
  function addRow(row){ if(!window.__ceAiTicketLines) window.__ceAiTicketLines=[]; window.__ceAiTicketLines.push(enrichRowDefaults(Object.assign({ok:true,unidades:1,precio:0,importe:0,confianza:0}, row||{}))); renderRows(); }
  function blockedSegment(value){ return normalizePlain(value)==='MATERIAL'; }
  function uniqueProductValues(field){
    var seen={}, out=[];
    arr('productos').forEach(function(p){
      var v=trim(p && p[field]);
      if(field==='segmento' && blockedSegment(v)) return;
      if(v && !seen[normalizePlain(v)]){ seen[normalizePlain(v)]=true; out.push(v); }
    });
    return out.sort(function(a,b){ return a.localeCompare(b,'es',{sensitivity:'base'}); });
  }
  function selectOptionsFromValues(values, selected, blankText){
    var sel=trim(selected);
    if(blockedSegment(sel)) sel='';
    var normSel=normalizePlain(sel);
    var seen={};
    var out='<option value="">'+htmlEscape(blankText||'')+'</option>';
    (values||[]).forEach(function(v){ var vv=trim(v); if(!vv) return; seen[normalizePlain(vv)]=true; out+='<option value="'+htmlEscape(vv)+'"'+(normalizePlain(vv)===normSel?' selected':'')+'>'+htmlEscape(vv)+'</option>'; });
    if(sel && !seen[normSel]) out+='<option value="'+htmlEscape(sel)+'" selected>'+htmlEscape(sel)+'</option>';
    return out;
  }
  function hasOptionValue(field, value){ var n=normalizePlain(value); if(!n) return false; return uniqueProductValues(field).some(function(v){ return normalizePlain(v)===n; }); }
  function guessSegment(name){
    var n=normalizePlain(name);
    if(/AGUA|REFRES|COCA|FANTA|AQUARIUS|NESTEA|CERVEZA|VINO|RON|GINEBRA|WHISKY|LICOR|ZUMO|BEBIDA|BATIDO/.test(n)) return hasOptionValue('segmento','BEBIDA') ? 'BEBIDA' : 'BEBIDA';
    if(/PAN|BARRA|PICOS|PATATA|ACEITUNA|QUESO|JAMON|CHORIZO|LOMO|SALCHICH|TORTILLA|APERITIVO|SNACK/.test(n)) return hasOptionValue('segmento','COMIDA') ? 'COMIDA' : 'COMIDA';
    if(/VASO|PLATO|SERVILLETA|BOLSA|HIELO|CARBON|LIMPIEZA|PAPEL|MANTEL|CUBIERTO/.test(n)) return hasOptionValue('segmento','INFRAESTRUCTURA') ? 'INFRAESTRUCTURA' : '';
    return '';
  }
  function guessDestino(name){
    var n=normalizePlain(name);
    if(/RON|GINEBRA|WHISKY|LICOR|COLA|COCA|FANTA|REFRES|TONICA|LIMON|NARANJA/.test(n)) return hasOptionValue('destino','CUBATAS') ? 'CUBATAS' : 'CUBATAS';
    if(/CERVEZA|VINO|AGUA|ZUMO|NESTEA|AQUARIUS/.test(n)) return hasOptionValue('destino','BARRA') ? 'BARRA' : '';
    if(/PAN|PICOS|PATATA|ACEITUNA|QUESO|JAMON|CHORIZO|LOMO|TORTILLA|SNACK/.test(n)) return hasOptionValue('destino','APERITIVO') ? 'APERITIVO' : 'APERITIVO';
    return '';
  }
  function enrichRowDefaults(row){
    var r=Object.assign({}, row||{});
    var p=productByExactName(r.descripcion);
    if(p){ r.segmento=p.segmento||''; r.destino=p.destino||''; }
    else { if(!trim(r.segmento)) r.segmento=guessSegment(r.descripcion); if(!trim(r.destino)) r.destino=guessDestino(r.descripcion); }
    return r;
  }
  function storeScore(needle, storeName){
    var a=normalizePlain(needle), b=normalizePlain(storeName); if(!a || !b) return 0;
    if(a===b) return 100;
    if(a.indexOf(b)>=0 || b.indexOf(a)>=0) return 80;
    var toks=a.split(/[^A-Z0-9]+/).filter(function(x){ return x.length>2; });
    var hit=0; toks.forEach(function(t){ if(b.indexOf(t)>=0) hit++; });
    return toks.length ? Math.round((hit/toks.length)*70) : 0;
  }
  function findStoreByName(name){
    var best=null, bestScore=0;
    arr('tiendas').forEach(function(t){ var sc=storeScore(name, t && t.nombre); if(sc>bestScore){ best=t; bestScore=sc; } });
    return bestScore>=55 ? best : null;
  }
  function applyStoreFromAi(name){
    var provider=trim(name); if(!provider) return '';
    var tienda=findStoreByName(provider);
    var sel=$('ceAiTienda');
    if(tienda && sel){ sel.value=tienda.id; renderPendingPurchases(); return 'Tienda detectada: '+(tienda.nombre||tienda.id)+'.'; }
    return 'Tienda leída por IA: '+provider+'; no se encontró en TIENDAS, selecciónala manualmente.';
  }
  function personScore(needle, personName){
    var a=normalizePlain(needle), b=normalizePlain(personName); if(!a || !b) return 0;
    if(a===b) return 100;
    if(a.indexOf(b)>=0 || b.indexOf(a)>=0) return 88;
    var toks=a.split(/[^A-Z0-9]+/).filter(function(x){ return x.length>2; });
    var hit=0; toks.forEach(function(t){ if(b.indexOf(t)>=0) hit++; });
    return toks.length ? Math.round((hit/toks.length)*78) : 0;
  }
  function findResponsibleByName(name){
    var best=null, bestScore=0;
    arr('personas').filter(isSocioPersona).forEach(function(p){ var sc=personScore(name, p && p.nombre); if(sc>bestScore){ best=p; bestScore=sc; } });
    return bestScore>=58 ? best : null;
  }
  function responsibleFromHint(hint){
    var h=trim(hint); if(!h) return '';
    var m=/(?:responsable|encargad[oa]|persona)\s*(?:=|:|es|ser[aá])\s*["\']?([^"\'.,;\n]+)/i.exec(h);
    if(m && trim(m[1])) return trim(m[1]);
    var people=arr('personas').filter(isSocioPersona);
    var best=null, bestScore=0;
    people.forEach(function(p){ var sc=personScore(h, p && p.nombre); if(sc>bestScore){ best=p; bestScore=sc; } });
    return bestScore>=88 && best ? (best.nombre||'') : '';
  }
  function applyResponsibleFromAi(name, hint){
    var proposed=trim(name) || responsibleFromHint(hint);
    if(!proposed) return '';
    var person=findResponsibleByName(proposed);
    var sel=$('ceAiResponsable');
    if(person && sel){ sel.value=person.id; return 'Responsable detectado: '+(person.nombre||person.id)+'.'; }
    return 'Responsable indicado: '+proposed+'; no se encontró como SOCIO en PERSONAS, selecciónalo manualmente.';
  }
  function productNameById(idv){ var id=trim(idv); var p=arr('productos').find(function(x){ return trim(x.id)===id; }); return p ? (p.nombre||p.id) : id; }
  function tiendaNameById(idv){ var id=trim(idv); var t=arr('tiendas').find(function(x){ return trim(x.id)===id; }); return t ? (t.nombre||t.id) : id; }
  function compraValue(c){ return round2((money(c && c.unidades)||0) * money(c && c.precio)); }
  function pendingPurchasesForEvent(){
    var ev=selectedEventId();
    if(!ev) return [];
    var sort=trim(($('ceAiPendingSort')||{}).value) || 'tienda';
    var rows=arr('compras').filter(function(c){
      if(trim(c.eventId)!==ev) return false;
      if(trim(c.ticketDonacion)) return false;
      return true;
    });
    rows.sort(function(a,b){
      var at=tiendaNameById(a.tiendaId), bt=tiendaNameById(b.tiendaId);
      var ap=productNameById(a.productoId), bp=productNameById(b.productoId);
      if(sort==='producto'){
        var cp=ap.localeCompare(bp,'es',{sensitivity:'base'}); if(cp) return cp;
        return at.localeCompare(bt,'es',{sensitivity:'base'});
      }
      var ct=at.localeCompare(bt,'es',{sensitivity:'base'}); if(ct) return ct;
      return ap.localeCompare(bp,'es',{sensitivity:'base'});
    });
    return rows;
  }
  function renderPendingPurchases(){
    var box=$('ceAiPendingList'); if(!box) return;
    var rows=pendingPurchasesForEvent();
    if(!rows.length){ box.innerHTML='<div class="ce-ai-muted">No hay compras previstas pendientes en este evento.</div>'; return; }
    box.innerHTML=rows.map(function(c){
      return '<label class="ce-ai-pending-row"><input type="checkbox" data-ce-ai-pending-delete="'+htmlEscape(c.id)+'"><strong>'+htmlEscape(productNameById(c.productoId))+'</strong><span>'+htmlEscape(tiendaNameById(c.tiendaId)||'Sin tienda')+'</span><span>'+htmlEscape((money(c.unidades)||0)+' ud x '+dec(c.precio))+'</span><span>'+htmlEscape(euro(compraValue(c)))+'</span></label>';
    }).join('');
  }
  function collectPendingDeleteIds(){
    var ids=[]; document.querySelectorAll('[data-ce-ai-pending-delete]:checked').forEach(function(el){ var id=trim(el.getAttribute('data-ce-ai-pending-delete')); if(id) ids.push(id); }); return ids;
  }
  function deletePendingPurchases(ids, warnings){
    var count=0, chain=Promise.resolve();
    (ids||[]).forEach(function(id){ chain=chain.then(function(){ return apiJson('/api/crud/compras/'+encodeURIComponent(id),{method:'DELETE',headers:crudHeaders(),body:JSON.stringify({__crudRowOnly:true})}); }).then(function(){ count++; var s=stateObj(); if(Array.isArray(s.compras)) s.compras=s.compras.filter(function(c){ return trim(c.id)!==trim(id); }); }).catch(function(err){ warnings.push('No se eliminó Pte.Compra '+id+': '+(err.message||err)); }); });
    return chain.then(function(){ return count; });
  }
  function validateRowsBeforeProcess(rows){
    var missing=[];
    rows.forEach(function(row,idx){
      if(!productByExactName(row.descripcion)){
        if(!trim(row.segmento) || !trim(row.destino)) missing.push('#'+(idx+1)+' '+(row.descripcion||'sin producto'));
      }
    });
    if(missing.length){ throw new Error('Hay productos nuevos sin SEGMENTO o DESTINO: '+missing.slice(0,8).join(', ')+'.'); }
  }
  function safeDownloadName(base){ return trim(base||'ticket').replace(/[\/:*?"<>|]+/g,' ').replace(/\s+/g,'_').slice(0,90) || 'ticket'; }
  function extensionFromSrc(src){ var m=/^data:image\/([a-z0-9.+-]+)/i.exec(src||''); if(m) return m[1].replace('jpeg','jpg'); var clean=String(src||'').split('?')[0].toLowerCase(); var mm=/\.([a-z0-9]{3,5})$/.exec(clean); return mm ? mm[1] : 'jpg'; }
  function downloadSrc(src, fileBase){
    src=trim(src); if(!src){ setStatus('No hay foto para descargar.','warn'); return; }
    var name=safeDownloadName(fileBase || (($('ceAiTicket')||{}).value || 'ticket'))+'.'+extensionFromSrc(src);
    function linkDownload(url){ var a=document.createElement('a'); a.href=url; a.download=name; a.rel='noopener'; document.body.appendChild(a); a.click(); setTimeout(function(){ a.remove(); },800); }
    if(/^data:/i.test(src) || /^blob:/i.test(src)){ linkDownload(src); return; }
    fetch(src,{cache:'no-store'}).then(function(res){ if(!res.ok) throw new Error('HTTP '+res.status); return res.blob(); }).then(function(blob){ var url=URL.createObjectURL(blob); linkDownload(url); setTimeout(function(){ URL.revokeObjectURL(url); },2500); }).catch(function(){ linkDownload(src); });
  }
  function downloadCurrentTicketPhoto(){ var src=window.__ceAiTicketImage || (($('ceAiPreview')||{}).src || ''); downloadSrc(src, ($('ceAiTicket')||{}).value || 'ticket_auto'); }
  function installTicketImageDownloadButtons(){
    if(window.__ceV95TicketDownloadObserver) return;
    window.__ceV95TicketDownloadObserver=true;
    function enhance(root){
      (root||document).querySelectorAll('#tabIngresos img.ticket-thumb,#tabIngresos img[src*="ticket-images"],#tabIngresos img[src^="data:image/"],#tabResumen img.ticket-thumb,#tabResumen img[src*="ticket-images"],#tabResumen img[src^="data:image/"],#summaryTiendaTicket img.ticket-thumb,#summaryTiendaTicket img[src*="ticket-images"]').forEach(function(img){
        if(!img || img.dataset.ceDownloadReady==='1') return;
        if(img.id==='ceAiPreview' || img.id==='ceAiZoomImg') return;
        if(img.closest && img.closest('#ceBudgetLiteTooltipV307,#tabGraficas,#tabCompras,#tabDonaciones,#tabMapa,#ceAiTicketPanel')) return;
        img.dataset.ceDownloadReady='1';
        var btn=document.createElement('button'); btn.type='button'; btn.className='outline small ce-ticket-download-v95'; btn.title='Descargar foto al ordenador'; btn.textContent='⬇️';
        btn.addEventListener('click',function(ev){ ev.preventDefault(); ev.stopPropagation(); downloadSrc(img.currentSrc || img.src, 'ControlEvent_'+(img.alt||'foto_ticket')); });
        if(img.parentNode) img.parentNode.insertBefore(btn, img.nextSibling);
      });
    }
    enhance(document);
    try{ new MutationObserver(function(muts){ muts.forEach(function(m){ if(m.addedNodes) Array.prototype.forEach.call(m.addedNodes,function(n){ if(n.nodeType===1) enhance(n); }); }); }).observe(document.body,{childList:true,subtree:true}); }catch(_){}
  }
  function productPriceValue(p){ return money(p && (p.defaultPrecio ?? p.precio ?? p.precioReferencia ?? p.productoPrecioReferencia ?? 0)); }
  function productByExactName(name){ var n=normalizeName(name); if(!n) return null; var ps=arr('productos'); for(var i=0;i<ps.length;i++){ if(normalizeName(ps[i].nombre)===n) return ps[i]; } return null; }
  function applyProductPriceFromName(input){
    var p=productByExactName(input && input.value); if(!p) return;
    var price=productPriceValue(p); if(!(price>0)) return;
    var tr=input.closest('tr'); if(!tr) return;
    var priceInput=tr.querySelector('[data-ce-ai-field="precio"]');
    if(priceInput){ priceInput.value=dec(price); updateRowImport(tr); }
  }
  function friendlyAiError(message, details){
    var m=text(message||'');
    var provider=text(details && (details.proveedorIa || details.provider || details.proveedor) || '').trim();
    var model=text(details && (details.modelo || details.model || details.modeloIntentado) || '').trim();
    var prefix=(provider||model) ? ('['+(provider||'IA')+(model?' '+model:'')+'] ') : '';
    if(/quota|insufficient_quota|billing|plan|RESOURCE_EXHAUSTED|429|rate.?limit|l[ií]mite/i.test(m)){
      return prefix+'el proveedor IA devuelve límite/cuota/saldo no disponible ahora. Detalle técnico: '+m.slice(0,260);
    }
    if(/api key|API key|401|403|invalid|permission|PERMISSION_DENIED/i.test(m)){
      return prefix+'la clave IA no es válida, no está habilitada o no tiene permisos. Para Gemini usa GEMINI_API_KEY; también se acepta OPENIA_API_KEY.';
    }
    if(/model|not found|404/i.test(m)){
      return prefix+'modelo IA no disponible. El servidor probará modelos Gemini alternativos si están configurados.';
    }
    return prefix+(m || 'Error desconocido al analizar con la IA.');
  }
  function analyze(){
    var dataUrl=window.__ceAiTicketImage || '';
    if(!dataUrl){ var f=$('ceAiFile').files && $('ceAiFile').files[0]; if(!f){ setStatus('Selecciona primero una foto de ticket.','warn'); return; } }
    setStatus('Analizando ticket con IA...','info');
    Promise.resolve(dataUrl || readFileAsDataUrl($('ceAiFile').files[0])).then(function(src){
      window.__ceAiTicketImage=src;
      var img=$('ceAiPreview'); if(img){ img.src=src; img.style.display=''; }
      return apiJson('/api/receipt-ai/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dataUrl:src, instrucciones:trim(($('ceAiGeminiHint')||{}).value), responsables:arr('personas').filter(isSocioPersona).map(function(p){return p.nombre||'';}).filter(Boolean), tiendas:arr('tiendas').map(function(t){return t.nombre||'';}).filter(Boolean)})});
    }).then(function(data){
      var rows=Array.isArray(data.productos)?data.productos:[];
      window.__ceAiDetectedTotal=money(data.total||0);
      window.__ceAiTicketLines=sortLinesLikeTk(rows.map(function(r){ return enrichRowDefaults(Object.assign({ok:true},r)); }));
      var hintText=trim(($('ceAiGeminiHint')||{}).value);
      var tiendaMsg=applyStoreFromAi(data.proveedor || data.tienda || data.comercio || '');
      var tkMsg=applyTicketFromAi(data.ticket || data.tk || data.ticketDonacion || data.codigoTicket || '', hintText);
      var respMsg=applyResponsibleFromAi(data.responsable || data.responsableNombre || data.encargado || '', hintText);
      renderRows();
      renderPendingPurchases();
      var msg='Análisis terminado: '+rows.length+' líneas detectadas.';
      if(tiendaMsg) msg+=' '+tiendaMsg;
      if(tkMsg) msg+=' '+tkMsg;
      if(respMsg) msg+=' '+respMsg;
      if(data.total) msg+=' Total leído: '+euro(data.total)+'.';
      if(data.proveedorIa || data.modelo) msg+=' IA: '+(data.proveedorIa||'')+(data.modelo?' '+data.modelo:'')+'.';
      if(data.advertencias && data.advertencias.length) msg+=' Revisa advertencias.';
      setStatus(msg, rows.length?'ok':'warn');
    }).catch(function(err){
      setStatus('No se pudo analizar con la IA: '+friendlyAiError(err.message||String(err), err.details)+'. Puedes añadir filas manualmente.', 'err');
    });
  }
  function findProductByName(name){ var n=normalizeName(name); var ps=arr('productos'); for(var i=0;i<ps.length;i++){ if(normalizeName(ps[i].nombre)===n) return ps[i]; } return null; }
  function crudHeaders(){ return {'Content-Type':'application/json','X-ControlEvent-Write-Scope':WRITE_SCOPE,'X-ControlEvent-Row-Only':'1'}; }
  function imageHeaders(){ return {'Content-Type':'application/json','X-ControlEvent-Write-Scope':IMAGE_SCOPE}; }
  function upsertProductByName(row, tiendaId, warnings){
    var name=trim(row && row.descripcion);
    var price=money(row && row.precio);
    if(!(price>0) && money(row && row.importe)) price=money(row.importe)/(money(row && row.unidades)||1);
    price=round2(price);
    var existing=findProductByName(name);
    var payload=existing ? Object.assign({}, existing) : {id:uid(), nombre:name, segmento:trim(row.segmento), destino:trim(row.destino)};
    if(!existing){ payload.segmento=trim(row.segmento); payload.destino=trim(row.destino); }
    payload.defaultPrecio=price; payload.precio=price;
    if(tiendaId){ payload.defaultTiendaId=tiendaId; payload.tiendaId=tiendaId; }
    var s=stateObj();
    function mergeLocal(item){
      item=item || payload;
      if(item && item.defaultPrecio !== undefined && item.precio === undefined) item.precio=item.defaultPrecio;
      if(!Array.isArray(s.productos)) s.productos=[];
      var idx=s.productos.findIndex(function(p){ return trim(p.id)===trim(item.id); });
      if(idx>=0) s.productos[idx]=Object.assign({},s.productos[idx],item,{defaultPrecio:price,precio:price});
      else s.productos.push(Object.assign({},item,{defaultPrecio:price,precio:price}));
      return idx>=0 ? s.productos[idx] : s.productos[s.productos.length-1];
    }
    if(existing){
      // v9.6: doble vía segura para refrescar PRODUCTOS cuando ya existe.
      // Primero usa la ruta específica y después fuerza el mismo cambio por el CRUD normal
      // con __priceRefreshOnly, para cubrir instalaciones donde la ruta dedicada no refrescaba la tabla visible.
      var body={__crudRowOnly:true,__priceRefreshOnly:true,defaultPrecio:price,precio:price,defaultTiendaId:tiendaId||existing.defaultTiendaId||'',tiendaId:tiendaId||existing.tiendaId||''};
      var full=Object.assign({}, existing, body, {nombre:existing.nombre||name, segmento:existing.segmento||'', destino:existing.destino||''});
      function genericUpdate(){
        return apiJson('/api/crud/productos/'+encodeURIComponent(existing.id),{method:'PUT',headers:crudHeaders(),body:JSON.stringify(full)})
          .then(function(data){ return mergeLocal(data.item || Object.assign({},existing,{defaultPrecio:price,precio:price,defaultTiendaId:tiendaId||existing.defaultTiendaId||''})); });
      }
      return apiJson('/api/crud/productos/'+encodeURIComponent(existing.id)+'/precio',{method:'PUT',headers:crudHeaders(),body:JSON.stringify(body)})
        .then(function(data){
          var item=data.item || Object.assign({},existing,{defaultPrecio:price,precio:price,defaultTiendaId:tiendaId||existing.defaultTiendaId||''});
          mergeLocal(item);
          return genericUpdate().catch(function(){ return mergeLocal(item); });
        })
        .catch(function(err1){
          return genericUpdate().catch(function(err2){
            warnings.push('No se actualizó precio de PRODUCTOS para "'+name+'": '+((err2&&err2.message)||(err1&&err1.message)||err2||err1)+'. La compra se grabará con el precio del ticket.');
            return mergeLocal(Object.assign({},existing,{defaultPrecio:price,precio:price,defaultTiendaId:tiendaId||existing.defaultTiendaId||''}));
          });
        });
    }
    return apiJson('/api/crud/productos',{method:'POST',headers:crudHeaders(),body:JSON.stringify(Object.assign({},payload,{__crudRowOnly:true}))})
      .then(function(data){ return mergeLocal(data.item || payload); });
  }
  function postCompra(row, product, ticket, tiendaId, responsableId){
    var payload={ id:uid(), eventId:selectedEventId(), productoId:product.id, unidades:money(row.unidades)||1, precio:money(row.precio) || (money(row.importe)/(money(row.unidades)||1)), ticketDonacion:ticket, donorRef:'', tiendaId:tiendaId || product.defaultTiendaId || '', responsableId:responsableId || '' };
    return apiJson('/api/crud/compras',{method:'POST',headers:crudHeaders(),body:JSON.stringify(Object.assign({},payload,{__crudRowOnly:true}))}).then(function(data){ var item=data.item || payload; var s=stateObj(); if(!Array.isArray(s.compras)) s.compras=[]; s.compras.push(item); return item; });
  }
  function uploadTicketImage(ticket){
    var img=window.__ceAiTicketImage||''; if(!img) return Promise.resolve(null);
    return apiJson('/api/ticket-images',{method:'POST',headers:imageHeaders(),body:JSON.stringify({eventId:selectedEventId(),key:ticket,dataUrl:img,eventSnapshot:selectedEvent()||{}})}).then(function(data){ var image=data.image || {}; var s=stateObj(); if(!s.ticketImages) s.ticketImages={}; if(image.key) s.ticketImages[image.key]=image.url||image.pathname||''; return image; });
  }
  function processRows(){
    if(!isGD()){ alert('Solo GD.'); return; }
    if(isFinalizado()){ setStatus('Evento Finalizado: no se puede procesar ticket.','err'); return; }
    var ticket=trim($('ceAiTicket').value).toUpperCase(); if(!ticket){ setStatus('Indica TKxx.','warn'); return; }
    var usedCount=Number((usedTicketMap()||{})[ticket]||0);
    if(usedCount>0){
      var ok=window.confirm('ATENCIÓN: '+ticket+' ya tiene '+usedCount+' línea(s) de COMPRAS en este evento.\n\nTiene pinta de equivocación por no haber elegido el ticket correcto.\n\n¿Quieres continuar de todos modos y añadir más líneas a '+ticket+'?');
      if(!ok){ setStatus('Operación cancelada: cambia el TKxx o revisa el ticket ya existente.','warn'); return; }
    }
    var tiendaId=trim($('ceAiTienda').value), responsableId=trim($('ceAiResponsable').value);
    var rows=sortLinesLikeTk(collectRows(true).filter(function(r){ return r.ok!==false; }).filter(function(r){ return trim(r.descripcion); }));
    if(!rows.length){ setStatus('No hay filas con producto para procesar.','warn'); return; }
    try{ validateRowsBeforeProcess(rows); }catch(e){ setStatus(e.message||String(e),'warn'); return; }
    var pendingIds=collectPendingDeleteIds();
    setStatus('Procesando '+rows.length+' líneas hacia PRODUCTOS y COMPRAS'+(pendingIds.length?' y eliminando '+pendingIds.length+' Pte.Compra marcados':'')+'...','info');
    var warnings=[]; var created=0; var deletedPending=0; var chain=Promise.resolve();
    rows.forEach(function(row){ chain=chain.then(function(){ return upsertProductByName(row, tiendaId, warnings); }).then(function(product){ return postCompra(row, product, ticket, tiendaId, responsableId); }).then(function(){ created++; }); });
    chain.then(function(){ return deletePendingPurchases(pendingIds, warnings).then(function(n){ deletedPending=n; }); })
      .then(function(){ return uploadTicketImage(ticket); })
      .then(function(){ return reloadEvent(true); })
      .then(function(){ try{ fillSelects(); }catch(_){} var msg='Procesado: '+created+' compras grabadas en '+ticket+'.'; if(deletedPending) msg+=' Eliminadas '+deletedPending+' Pte.Compra sustituidas.'; msg+=' Foto adjuntada al ticket si había imagen.'; if(warnings.length) msg+=' Avisos: '+warnings.length+'.'; setStatus(msg, warnings.length?'warn':'ok'); installTicketImageDownloadButtons(); if(warnings.length) console.warn('[CE v9.6 Alta IA]', warnings); })
      .catch(function(err){ setStatus('Error procesando ticket: '+(err.message||String(err)), 'err'); });
  }
  function reloadEvent(silent){
    var ev=selectedEventId();
    if(window.__ceLoadSelectedEventStateFix48 && ev){ return window.__ceLoadSelectedEventStateFix48(ev).then(function(){ try{ if(typeof render==='function') render(); }catch(_){} try{ fillSelects(); if(!silent) renderPendingPurchases(); }catch(_){} if(!silent) setStatus('Evento recargado.','ok'); }); }
    if(!silent) setStatus('Recarga parcial no disponible; cambia de evento y vuelve.','warn'); return Promise.resolve();
  }
  function delegatedOpen(ev){
    var t=ev && ev.target; var opener=t && t.closest && t.closest('#btnReceiptAiCompras,[data-ce-ai-ticket-open]'); if(!opener) return;
    ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); openPanel(); return false;
  }
  function tick(){ ensureUi(); refreshRole(); installTicketImageDownloadButtons(); }
  window.__ceOpenTicketAutoV96=openPanel; window.__ceOpenTicketAutoV952=openPanel; window.__ceOpenTicketAutoV95=openPanel; window.__ceOpenTicketAutoV94=openPanel; window.__ceOpenTicketAutoV93=openPanel; window.__ceOpenTicketAutoV92=openPanel; window.__ceOpenTicketAutoV91=openPanel; window.__ceOpenTicketIaComprasV90=openPanel;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',tick,{once:true}); else tick();
  window.addEventListener('controlevent:runtime-ready',tick,false);
  window.addEventListener('pointerdown',delegatedOpen,true); window.addEventListener('click',delegatedOpen,true);
  document.addEventListener('pointerdown',delegatedOpen,true); document.addEventListener('click',delegatedOpen,true);
  document.addEventListener('click',function(ev){ var t=ev.target; if(t && (t.id==='btnLogin' || (t.closest&&t.closest('#btnLogin')))) setTimeout(tick,700); },true);
  setInterval(refreshRole,2000);
  console.info('[CE v9.6 Alta IA] limpieza total + iconos compactos activos + ptes compra flex instalado. Prueba: window.__ceOpenTicketAutoV96()');
})();
