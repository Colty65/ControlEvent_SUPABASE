/* ControlEvent v9.5.2_prod - Entrada asistida de COMPRAS mediante foto de ticket e IA.
   Disponible solo para GD. No sustituye a COMPRAS: prepara filas, usuario revisa y confirma. */
(function(){
  'use strict';
  var TAG='__ceV90TicketIaCompras';
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
  function euro(v){ var n=money(v); return n.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'; }
  function apiJson(url, init){
    return fetch(url, Object.assign({cache:'no-store'}, init||{})).then(function(res){
      return res.json().catch(function(){return {};}).then(function(data){
        if(!res.ok || data.ok===false) throw new Error(data.error || data.message || ('HTTP '+res.status+' '+url));
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
    if($('ceV90TicketAiStyle')) return;
    var st=document.createElement('style'); st.id='ceV90TicketAiStyle';
    st.textContent='\n'+
      '.ce-ai-ticket-btn{font-weight:900;font-size:18px;min-width:54px;background:#fff7ed;border:2px solid #fb923c;color:#9a3412}\n'+
      '.ce-ai-overlay{position:fixed;inset:0;background:rgba(15,23,42,.42);z-index:9998;display:none;align-items:center;justify-content:center;padding:14px}\n'+
      '.ce-ai-overlay.open{display:flex}\n'+
      '.ce-ai-modal{width:min(1180px,98vw);max-height:94vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.35);border:2px solid #fb923c;padding:14px}\n'+
      '.ce-ai-head{display:flex;gap:10px;align-items:center;justify-content:space-between;margin-bottom:10px}\n'+
      '.ce-ai-title{font-size:20px;font-weight:900;color:#7c2d12}.ce-ai-sub{font-size:13px;color:#475569;margin-top:3px}\n'+
      '.ce-ai-grid{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:10px;margin:10px 0}.ce-ai-field label{font-weight:800;font-size:12px;color:#334155;display:block;margin-bottom:3px}.ce-ai-field input,.ce-ai-field select{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:8px;background:#fff}\n'+
      '.ce-ai-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0}.ce-ai-actions button{border-radius:10px;padding:8px 12px;font-weight:800}.ce-ai-primary{background:#f97316;color:#fff;border:1px solid #ea580c}.ce-ai-secondary{background:#f8fafc;color:#0f172a;border:1px solid #cbd5e1}.ce-ai-danger{background:#fff1f2;color:#9f1239;border:1px solid #fda4af}\n'+
      '.ce-ai-preview{max-width:160px;max-height:120px;border-radius:10px;border:1px solid #e2e8f0;object-fit:contain;background:#f8fafc}\n'+
      '.ce-ai-table-wrap{overflow:auto;border:1px solid #e2e8f0;border-radius:12px}.ce-ai-table{width:100%;border-collapse:collapse;font-size:13px}.ce-ai-table th{background:#ffedd5;color:#7c2d12;text-align:left;padding:7px;position:sticky;top:0}.ce-ai-table td{padding:6px;border-top:1px solid #e2e8f0;vertical-align:middle}.ce-ai-table input,.ce-ai-table select{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:8px;padding:6px}.ce-ai-table .num{max-width:90px}.ce-ai-row-low{background:#fff7ed}.ce-ai-row-ok{background:#f8fafc}\n'+
      '.ce-ai-status{padding:8px 10px;border-radius:10px;margin:8px 0;font-weight:800}.ce-ai-status.ok{background:#dcfce7;color:#166534}.ce-ai-status.err{background:#fee2e2;color:#991b1b}.ce-ai-status.info{background:#dbeafe;color:#1e3a8a}.ce-ai-status.warn{background:#fef3c7;color:#92400e}\n'+
      '@media(max-width:760px){.ce-ai-grid{grid-template-columns:1fr}.ce-ai-modal{padding:10px}.ce-ai-title{font-size:17px}.ce-ai-table{font-size:12px}.ce-ai-preview{max-width:100%;max-height:150px}}\n';
    document.head.appendChild(st);
  }
  function htmlEscape(v){ return text(v).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function options(list, selected, labelFn){
    var out='<option value=""></option>';
    for(var i=0;i<list.length;i++){
      var id=trim(list[i].id); var lab=labelFn ? labelFn(list[i]) : (list[i].nombre || id);
      out+='<option value="'+htmlEscape(id)+'"'+(id===trim(selected)?' selected':'')+'>'+htmlEscape(lab)+'</option>';
    }
    return out;
  }
  function ticketOptions(){
    var out='';
    for(var i=1;i<=50;i++){ var tk='TK'+String(i).padStart(2,'0'); out+='<option value="'+tk+'">'+tk+'</option>'; }
    return out;
  }
  function ensureUi(){
    css();
    if(!$('btnReceiptAiCompras')){
      var btn=document.createElement('button');
      btn.type='button'; btn.id='btnReceiptAiCompras'; btn.className='iconbtn outline app-lockable ce-ai-ticket-btn';
      btn.setAttribute('data-ce-ai-ticket-open','1');
      btn.setAttribute('aria-label','Abrir IA Ticket');
      btn.title='Abrir IA Ticket: alta asistida de COMPRAS por foto'; btn.textContent='🧾IA';
      var footer=document.querySelector('.footer-inner');
      if(footer) footer.appendChild(btn);
      btn.addEventListener('click',function(ev){ if(ev){ ev.preventDefault(); ev.stopPropagation(); } openPanel(); });
    }
    if(!$('btnReceiptAiComprasHeader')){
      var hbtn=document.createElement('button');
      hbtn.type='button'; hbtn.id='btnReceiptAiComprasHeader'; hbtn.className='outline small ce-ai-ticket-header-btn';
      hbtn.setAttribute('data-ce-ai-ticket-open','1');
      hbtn.setAttribute('aria-label','Abrir IA Ticket');
      hbtn.title='Abrir IA Ticket: alta asistida de COMPRAS por foto'; hbtn.textContent='🧾 IA';
      var actions=document.querySelector('.user-actions') || document.querySelector('.appname-stack') || document.querySelector('.header-inner');
      if(actions) actions.insertBefore(hbtn, actions.firstChild || null);
      hbtn.addEventListener('click',function(ev){ if(ev){ ev.preventDefault(); ev.stopPropagation(); } openPanel(); });
    }
    if(!$('ceAiTicketPanel')){
      var div=document.createElement('div'); div.id='ceAiTicketPanel'; div.className='ce-ai-overlay';
      div.innerHTML='<div class="ce-ai-modal">'+
        '<div class="ce-ai-head"><div><div class="ce-ai-title">🧾 IA Ticket - Alta asistida de COMPRAS</div><div class="ce-ai-sub">Disponible solo para GD. La IA propone líneas; el usuario revisa, corrige y confirma antes de grabar.</div></div><button type="button" id="ceAiClose" class="ce-ai-secondary">Cerrar</button></div>'+
        '<div id="ceAiStatus" class="ce-ai-status info">Selecciona o captura una foto de ticket.</div>'+ 
        '<div class="ce-ai-grid">'+
          '<div class="ce-ai-field"><label>Foto del ticket</label><input id="ceAiFile" type="file" accept="image/*" capture="environment"></div>'+ 
          '<div class="ce-ai-field"><label>TKxx</label><input id="ceAiTicket" list="ceAiTkList" placeholder="TK01"><datalist id="ceAiTkList">'+ticketOptions()+'</datalist></div>'+ 
          '<div class="ce-ai-field"><label>Tienda</label><select id="ceAiTienda"></select></div>'+ 
          '<div class="ce-ai-field"><label>Responsable</label><select id="ceAiResponsable"></select></div>'+ 
        '</div>'+ 
        '<div class="ce-ai-actions"><img id="ceAiPreview" class="ce-ai-preview" alt="Vista previa" style="display:none"><button type="button" id="ceAiAnalyze" class="ce-ai-primary">Analizar foto con IA</button><button type="button" id="ceAiAddRow" class="ce-ai-secondary">Añadir fila manual</button><button type="button" id="ceAiClear" class="ce-ai-danger">Limpiar</button></div>'+ 
        '<datalist id="ceAiProducts"></datalist>'+ 
        '<div class="ce-ai-table-wrap"><table class="ce-ai-table"><thead><tr><th>OK</th><th>Producto</th><th>Unid.</th><th>Precio</th><th>Importe</th><th>Conf.</th><th></th></tr></thead><tbody id="ceAiRows"><tr><td colspan="7">Sin líneas todavía.</td></tr></tbody></table></div>'+ 
        '<div class="ce-ai-actions"><button type="button" id="ceAiProcess" class="ce-ai-primary">Procesar y llevar a COMPRAS</button><button type="button" id="ceAiReloadEvent" class="ce-ai-secondary">Recargar evento</button></div>'+ 
      '</div>';
      document.body.appendChild(div);
      $('ceAiClose').addEventListener('click',closePanel);
      $('ceAiFile').addEventListener('change',fileChanged);
      $('ceAiAnalyze').addEventListener('click',analyze);
      $('ceAiAddRow').addEventListener('click',function(){ addRow({descripcion:'',unidades:1,precio:0,importe:0,confianza:0,requiereRevision:true}); });
      $('ceAiClear').addEventListener('click',clearRows);
      $('ceAiProcess').addEventListener('click',processRows);
      $('ceAiReloadEvent').addEventListener('click',reloadEvent);
    }
    refreshRole();
  }
  function refreshRole(){ var show=isGD()?'':'none'; var btn=$('btnReceiptAiCompras'); if(btn) btn.style.display=show; var hbtn=$('btnReceiptAiComprasHeader'); if(hbtn) hbtn.style.display=show; }
  function setStatus(msg,type){ var el=$('ceAiStatus'); if(el){ el.className='ce-ai-status '+(type||'info'); el.textContent=msg; } }
  function fillSelects(){
    var tienda=$('ceAiTienda'), resp=$('ceAiResponsable');
    if(tienda) tienda.innerHTML=options(arr('tiendas'), '', function(t){return t.nombre || t.id;});
    if(resp) resp.innerHTML=options(arr('personas'), '', function(p){return p.nombre || p.id;});
    var dl=$('ceAiProducts'); if(dl){
      var ps=arr('productos').slice().sort(function(a,b){return trim(a.nombre).localeCompare(trim(b.nombre),'es');});
      dl.innerHTML=ps.map(function(p){return '<option value="'+htmlEscape(p.nombre||'')+'"></option>';}).join('');
    }
    var used={}; arr('compras').forEach(function(c){ var tk=trim(c.ticketDonacion).toUpperCase(); if(/^TK\d+/.test(tk)) used[tk]=true; });
    var next='TK01'; for(var i=1;i<=50;i++){ var tk='TK'+String(i).padStart(2,'0'); if(!used[tk]){ next=tk; break; } }
    if($('ceAiTicket') && !$('ceAiTicket').value) $('ceAiTicket').value=next;
  }
  function openPanel(){
    if(!isGD()){ alert('Esta función solo está disponible para GD.'); return; }
    if(!selectedEventId()){ alert('Selecciona primero un evento.'); return; }
    if(isFinalizado()){ alert('Evento Finalizado: para procesar tickets debe estar En curso.'); return; }
    ensureUi(); fillSelects(); $('ceAiTicketPanel').classList.add('open');
  }
  function closePanel(){ var p=$('ceAiTicketPanel'); if(p) p.classList.remove('open'); }
  function fileChanged(){
    var f=$('ceAiFile').files && $('ceAiFile').files[0];
    if(!f) return;
    readFileAsDataUrl(f).then(function(dataUrl){ window.__ceAiTicketImage=dataUrl; var img=$('ceAiPreview'); if(img){ img.src=dataUrl; img.style.display=''; } setStatus('Foto cargada. Pulsa Analizar con IA o añade filas manuales.','info'); }).catch(function(e){ setStatus(e.message||String(e),'err'); });
  }
  function clearRows(){ window.__ceAiTicketLines=[]; window.__ceAiTicketImage=''; if($('ceAiFile')) $('ceAiFile').value=''; if($('ceAiPreview')){$('ceAiPreview').src=''; $('ceAiPreview').style.display='none';} renderRows(); setStatus('Panel limpio.','info'); }
  function renderRows(){
    var body=$('ceAiRows'); if(!body) return;
    var rows=window.__ceAiTicketLines || [];
    if(!rows.length){ body.innerHTML='<tr><td colspan="7">Sin líneas todavía.</td></tr>'; return; }
    body.innerHTML=rows.map(function(r,i){
      var cls=(Number(r.confianza||0)<0.65 || !trim(r.descripcion))?'ce-ai-row-low':'ce-ai-row-ok';
      return '<tr class="'+cls+'" data-ce-ai-row="'+i+'">'+
        '<td><input type="checkbox" data-ce-ai-field="ok" '+(r.ok!==false?'checked':'')+'></td>'+ 
        '<td><input list="ceAiProducts" data-ce-ai-field="descripcion" value="'+htmlEscape(r.descripcion||'')+'" placeholder="Nombre producto"></td>'+ 
        '<td><input class="num" data-ce-ai-field="unidades" value="'+htmlEscape(r.unidades||1)+'"></td>'+ 
        '<td><input class="num" data-ce-ai-field="precio" value="'+htmlEscape(r.precio||0)+'"></td>'+ 
        '<td><input class="num" data-ce-ai-field="importe" value="'+htmlEscape(r.importe||0)+'"></td>'+ 
        '<td>'+Math.round(Number(r.confianza||0)*100)+'%</td>'+ 
        '<td><button type="button" class="ce-ai-danger" data-ce-ai-del="'+i+'">Quitar</button></td>'+ 
      '</tr>';
    }).join('');
    body.querySelectorAll('[data-ce-ai-field]').forEach(function(input){ input.addEventListener('change',collectRows); input.addEventListener('input',collectRows); });
    body.querySelectorAll('[data-ce-ai-del]').forEach(function(btn){ btn.addEventListener('click',function(){ collectRows(); var idx=Number(btn.getAttribute('data-ce-ai-del')); (window.__ceAiTicketLines||[]).splice(idx,1); renderRows(); }); });
  }
  function collectRows(){
    var out=[];
    document.querySelectorAll('#ceAiRows tr[data-ce-ai-row]').forEach(function(tr){
      var obj={};
      tr.querySelectorAll('[data-ce-ai-field]').forEach(function(inp){
        var k=inp.getAttribute('data-ce-ai-field'); obj[k]= inp.type==='checkbox' ? inp.checked : inp.value;
      });
      obj.descripcion=trim(obj.descripcion); obj.unidades=money(obj.unidades)||1; obj.precio=money(obj.precio); obj.importe=money(obj.importe)||obj.unidades*obj.precio; obj.confianza=0; out.push(obj);
    });
    window.__ceAiTicketLines=out;
    return out;
  }
  function addRow(row){ if(!window.__ceAiTicketLines) window.__ceAiTicketLines=[]; window.__ceAiTicketLines.push(Object.assign({ok:true,unidades:1,precio:0,importe:0,confianza:0}, row||{})); renderRows(); }
  function analyze(){
    var dataUrl=window.__ceAiTicketImage || '';
    if(!dataUrl){ var f=$('ceAiFile').files && $('ceAiFile').files[0]; if(!f){ setStatus('Selecciona primero una foto de ticket.','warn'); return; } }
    setStatus('Analizando ticket con IA...','info');
    Promise.resolve(dataUrl || readFileAsDataUrl($('ceAiFile').files[0])).then(function(src){
      window.__ceAiTicketImage=src;
      return apiJson('/api/receipt-ai/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dataUrl:src})});
    }).then(function(data){
      var rows=Array.isArray(data.productos)?data.productos:[];
      window.__ceAiTicketLines=rows.map(function(r){ return Object.assign({ok:true},r); });
      renderRows();
      var msg='IA terminada: '+rows.length+' líneas detectadas.';
      if(data.total) msg+=' Total leído: '+euro(data.total)+'.';
      if(data.advertencias && data.advertencias.length) msg+=' Revisa advertencias.';
      setStatus(msg, rows.length?'ok':'warn');
    }).catch(function(err){
      setStatus('No se pudo analizar con IA: '+(err.message||String(err))+'. Puedes añadir filas manualmente.', 'err');
    });
  }
  function findProductByName(name){ var n=normalizeName(name); var ps=arr('productos'); for(var i=0;i<ps.length;i++){ if(normalizeName(ps[i].nombre)===n) return ps[i]; } return null; }
  function crudHeaders(){ return {'Content-Type':'application/json','X-ControlEvent-Write-Scope':WRITE_SCOPE,'X-ControlEvent-Row-Only':'1'}; }
  function imageHeaders(){ return {'Content-Type':'application/json','X-ControlEvent-Write-Scope':IMAGE_SCOPE}; }
  function upsertProductByName(name, price, tiendaId, warnings){
    var existing=findProductByName(name);
    var payload=existing ? Object.assign({}, existing) : {id:uid(), nombre:name, segmento:'', destino:''};
    payload.defaultPrecio=money(price); if(tiendaId) payload.defaultTiendaId=tiendaId;
    var url='/api/crud/productos'+(existing ? '/'+encodeURIComponent(existing.id) : '');
    var method=existing ? 'PUT' : 'POST';
    return apiJson(url,{method:method,headers:crudHeaders(),body:JSON.stringify(Object.assign({},payload,{__crudRowOnly:true}))})
      .then(function(data){
        var item=data.item || payload;
        var s=stateObj(); if(!Array.isArray(s.productos)) s.productos=[];
        var idx=s.productos.findIndex(function(p){ return trim(p.id)===trim(item.id); });
        if(idx>=0) s.productos[idx]=Object.assign({},s.productos[idx],item); else s.productos.push(item);
        return item;
      })
      .catch(function(err){
        if(existing){ warnings.push('No se actualizó precio de PRODUCTOS para "'+name+'": '+(err.message||err)+'. La compra se grabará con el precio del ticket.'); return existing; }
        throw err;
      });
  }
  function postCompra(row, product, ticket, tiendaId, responsableId){
    var payload={
      id:uid(),
      eventId:selectedEventId(),
      productoId:product.id,
      unidades:money(row.unidades)||1,
      precio:money(row.precio) || (money(row.importe)/(money(row.unidades)||1)),
      ticketDonacion:ticket,
      donorRef:'',
      tiendaId:tiendaId || product.defaultTiendaId || '',
      responsableId:responsableId || ''
    };
    return apiJson('/api/crud/compras',{method:'POST',headers:crudHeaders(),body:JSON.stringify(Object.assign({},payload,{__crudRowOnly:true}))}).then(function(data){
      var item=data.item || payload;
      var s=stateObj(); if(!Array.isArray(s.compras)) s.compras=[]; s.compras.push(item);
      return item;
    });
  }
  function uploadTicketImage(ticket){
    var img=window.__ceAiTicketImage||''; if(!img) return Promise.resolve(null);
    return apiJson('/api/ticket-images',{method:'POST',headers:imageHeaders(),body:JSON.stringify({eventId:selectedEventId(),key:ticket,dataUrl:img,eventSnapshot:selectedEvent()||{}})}).then(function(data){
      var image=data.image || {}; var s=stateObj(); if(!s.ticketImages) s.ticketImages={}; if(image.key) s.ticketImages[image.key]=image.url||image.pathname||''; return image;
    });
  }
  function processRows(){
    if(!isGD()){ alert('Solo GD.'); return; }
    if(isFinalizado()){ setStatus('Evento Finalizado: no se puede procesar ticket.','err'); return; }
    var ticket=trim($('ceAiTicket').value).toUpperCase();
    if(!ticket){ setStatus('Indica TKxx.','warn'); return; }
    var tiendaId=trim($('ceAiTienda').value), responsableId=trim($('ceAiResponsable').value);
    var rows=collectRows().filter(function(r){ return r.ok!==false; });
    rows=rows.filter(function(r){ return trim(r.descripcion); });
    if(!rows.length){ setStatus('No hay filas con producto para procesar.','warn'); return; }
    setStatus('Procesando '+rows.length+' líneas hacia PRODUCTOS y COMPRAS...','info');
    var warnings=[]; var created=0; var chain=Promise.resolve();
    rows.forEach(function(row){
      chain=chain.then(function(){ return upsertProductByName(row.descripcion, row.precio || row.importe, tiendaId, warnings); })
        .then(function(product){ return postCompra(row, product, ticket, tiendaId, responsableId); })
        .then(function(){ created++; });
    });
    chain.then(function(){ return uploadTicketImage(ticket); })
      .then(function(){ return reloadEvent(true); })
      .then(function(){
        var msg='Procesado: '+created+' compras grabadas en '+ticket+'. Foto adjuntada al ticket si había imagen.';
        if(warnings.length) msg+=' Avisos: '+warnings.length+'.';
        setStatus(msg, warnings.length?'warn':'ok');
        if(warnings.length) console.warn('[CE v9.0 IA Ticket]', warnings);
      })
      .catch(function(err){ setStatus('Error procesando ticket: '+(err.message||String(err)), 'err'); });
  }
  function reloadEvent(silent){
    var ev=selectedEventId();
    if(window.__ceLoadSelectedEventStateFix48 && ev){
      return window.__ceLoadSelectedEventStateFix48(ev).then(function(){ try{ if(typeof render==='function') render(); }catch(_){} if(!silent) setStatus('Evento recargado.','ok'); });
    }
    if(!silent) setStatus('Recarga parcial no disponible; cambia de evento y vuelve.','warn');
    return Promise.resolve();
  }
  function delegatedOpen(ev){
    var t=ev && ev.target;
    var opener=t && t.closest && t.closest('#btnReceiptAiCompras,#btnReceiptAiComprasHeader,[data-ce-ai-ticket-open]');
    if(!opener) return;
    ev.preventDefault(); ev.stopPropagation();
    if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    openPanel();
    return false;
  }
  function tick(){ ensureUi(); refreshRole(); }
  window.__ceOpenTicketIaComprasV90=openPanel;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',tick,{once:true}); else tick();
  window.addEventListener('controlevent:runtime-ready',tick,false);
  document.addEventListener('click',delegatedOpen,true);
  document.addEventListener('click',function(ev){ var t=ev.target; if(t && (t.id==='btnLogin' || (t.closest&&t.closest('#btnLogin')))) setTimeout(tick,700); },true);
  setInterval(refreshRole,2000);
  console.info('[CE v9.0 Ticket IA] instalado: botón superior/inferior solo GD. Prueba: window.__ceOpenTicketIaComprasV90()');
})();
