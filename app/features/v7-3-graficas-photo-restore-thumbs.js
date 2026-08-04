/* ControlEvent v25_prod FIX9.3.13 · GRAFICAS con comprobación contable de TKxx: no eliminar ni ocultar globos de RESUMEN PRESUPUESTARIO. */
(function(root){
  'use strict';
  const FLAG='__ceV25GraphSanitationFix932';
  if(root[FLAG]) return; root[FLAG]=true;

  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const text=value=>String(value??'').trim();
  const normalize=value=>text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const number=value=>{let raw=text(value).replace(/[^0-9,.-]/g,'');if(raw.includes(',')&&raw.includes('.'))raw=raw.replace(/\./g,'').replace(',','.');else if(raw.includes(','))raw=raw.replace(',','.');const n=Number(raw);return Number.isFinite(n)?n:0;};
  const money=value=>number(value).toLocaleString('es-ES',{style:'currency',currency:'EUR'});

  let activeOwner=null;
  let activeTip=null;
  let closeTimer=0;
  let suspended=null;
  let suppressClickUntil=0;
  let suppressLegacyUntil=0;
  let outsideCloseAllowedAt=0;
  let lastGraphPointerAt=0;
  let lastGraphTarget=null;
  let tipWatchdog=0;
  const receiptCache=new Map();
  const legacyTipIds=['ceTooltipV21','ceTooltipV196','ceTooltipV1952','ceTooltipV190','ceTooltipV181'];
  const sourceAttrs=['data-ce-tip-v21','data-ce-tip-v196','data-ce-tip-v1952','data-ce-tip','data-v181-tip','data-tip','title'];

  function state(){
    try{return Function('return (typeof state!=="undefined"&&state)?state:null')()||root.state||root.ControlEventApp?.state||root.appState||root.__CONTROL_EVENT_STATE__||{};}catch(_){return root.state||root.ControlEventApp?.state||{};}
  }
  function list(name){const value=state()?.[name];return Array.isArray(value)?value:(value&&typeof value==='object'?Object.values(value):[]);}
  function selectedEventId(){return text($('selectedEvent')?.value||state().selectedEventId||state().eventoSeleccionadoId||'');}
  function currentEvent(){const id=selectedEventId();return list('eventos').find(row=>text(row?.id||row?.ID)===id)||{};}
  function eventTitle(){const row=currentEvent();return text(row.titulo||row.Titulo||row.descripcion||row.Descripcion||row.nombre||row.title||'Evento');}
  function eventStatus(){const row=currentEvent();const raw=normalize(row.situacion||row.estado||row.status||row.SITUACION||row.ESTADO);return raw==='FINALIZADO'?'Finalizado':'En curso';}
  function statusClass(){return eventStatus()==='Finalizado'?'finalized':'live';}
  function personName(id){const row=list('personas').find(item=>text(item?.id)===text(id))||{};return text(row.nombre||row.Nombre||id||'Colaborador');}
  function imageSrc(value){return typeof value==='string'?text(value):text(value?.url||value?.public_url||value?.publicUrl||value?.pathname||value?.path||value?.storage_path||value?.dataUrl||value?.src||value?.base64||'');}
  function safeFilePart(value,fallback='archivo'){return (text(value)||fallback).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,'_').replace(/^_+|_+$/g,'').slice(0,120)||fallback;}
  function incomeFilename(person){return `ING-${safeFilePart(eventTitle(),'Evento')}-${safeFilePart(person,'Colaborador')}.jpg`;}
  function ticketFilename(code,storeName){return `${safeFilePart(code||'TKxx','TKxx')}-${safeFilePart(eventTitle(),'Evento')}-${safeFilePart(storeName||'Tienda','Tienda')}.jpg`;}

  function insideGraph(node){ return !!node?.closest?.('#tabGraficas,#eventChartWrap'); }
  function insideZuzu(node){ return !!node?.closest?.('#ceGeminiLibreBtn,#ceGeminiLibreOverlay'); }
  function graphOwner(target,event){
    if(insideZuzu(target)) return null;
    const candidates=[];
    if(event?.composedPath){
      for(const node of event.composedPath()){ if(node instanceof Element)candidates.push(node); }
    }
    let node=target instanceof Element?target:null;
    while(node){ candidates.push(node); if(node.id==='tabGraficas'||node.id==='eventChartWrap')break; node=node.parentElement; }
    for(const item of candidates){
      if(insideZuzu(item))return null;
      if(!insideGraph(item))continue;
      if(tipSource(item))return item;
    }
    return null;
  }
  function tipSource(owner){
    if(!owner) return '';
    for(const attr of sourceAttrs){const value=owner.getAttribute?.(attr);if(text(value))return text(value);}
    return '';
  }
  function adoptOwner(owner){
    const raw=tipSource(owner);if(!owner||!raw)return '';
    owner.setAttribute('data-ce-tip-v21',raw);
    sourceAttrs.filter(attr=>attr!=='data-ce-tip-v21').forEach(attr=>owner.removeAttribute?.(attr));
    owner.setAttribute('data-ce-graph-tip-owner','1');
    owner.setAttribute('tabindex',owner.getAttribute('tabindex')||'0');
    return raw;
  }

  function scrubLegacyTips(){
    legacyTipIds.forEach(id=>{const node=$(id);if(node)node.remove();});
    document.querySelectorAll('.ce-v211-tooltip,.ce-v196-tooltip,.ce-v1952-tooltip').forEach(node=>node.remove());
  }
  function addStyle(){
    $('ce-v25-graph-fix92-style')?.remove();
    const style=document.createElement('style');style.id='ce-v25-graph-fix92-style';
    style.textContent=`
      #ceV25GraphTip{position:fixed!important;left:50%!important;top:50%!important;right:auto!important;bottom:auto!important;transform:translate(-50%,-50%)!important;width:min(780px,calc(100vw - 34px))!important;max-width:min(780px,calc(100vw - 34px))!important;max-height:min(78vh,760px)!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;z-index:2147483644!important;border:1px solid rgba(15,23,42,.2)!important;border-radius:20px!important;background:#fff!important;color:#172033!important;box-shadow:0 30px 92px rgba(2,8,23,.42)!important;animation:none!important;transition:none!important;contain:layout paint!important;outline:none!important}
      #ceV25GraphTip[hidden]{display:none!important}
      #ceV25GraphTip .ce-g92-head{position:sticky;top:0;z-index:4;display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:14px 14px 12px 18px;border-bottom:1px solid #dbe5ed;background:linear-gradient(110deg,#0d253d,#173a63);color:#fff}
      #ceV25GraphTip .ce-g92-head>div{min-width:0}.ce-g92-kicker{display:block;color:#8ed8ff;font:950 10px/1.2 system-ui,sans-serif;letter-spacing:.13em}.ce-g92-event{display:block;margin-top:3px;color:#fff;font:950 16px/1.25 system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ce-g92-status{display:inline-flex;margin-top:5px;padding:3px 8px;border-radius:999px;font:950 9px/1 system-ui,sans-serif;text-transform:uppercase;letter-spacing:.08em}.ce-g92-status.live{background:rgba(37,211,141,.2);color:#b9ffdf;border:1px solid rgba(37,211,141,.4)}.ce-g92-status.finalized{background:rgba(255,105,120,.18);color:#ffd0d5;border:1px solid rgba(255,105,120,.36)}
      #ceV25GraphTip .ce-g92-close{width:36px;height:36px;flex:0 0 36px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.3);border-radius:11px;background:rgba(255,255,255,.1);color:#fff;font:900 25px/1 system-ui,sans-serif;cursor:pointer}
      #ceV25GraphTip .ce-g92-content{overflow:auto;padding:16px 18px 18px;overscroll-behavior:contain}
      #ceV25GraphTip .ce-g92-title{margin:0 0 8px;color:#0f172a;font:950 17px/1.25 system-ui,sans-serif}
      #ceV25GraphTip .ce-g92-subtitle{margin:5px 0;color:#334155;font:800 13px/1.35 system-ui,sans-serif}
      #ceV25GraphTip .ce-g92-text{margin:5px 0;color:#334155;font:700 13px/1.4 system-ui,sans-serif}
      #ceV25GraphTip .ce-g92-table-wrap{overflow:auto;margin:10px 0 12px;border:1px solid #d9e4ec;border-radius:12px;background:#fff}
      #ceV25GraphTip table{width:100%;border-collapse:collapse;font:700 12px/1.35 system-ui,sans-serif}
      #ceV25GraphTip th,#ceV25GraphTip td{padding:8px 9px;border-bottom:1px solid #e5ebf0;vertical-align:middle;text-align:left;white-space:normal}
      #ceV25GraphTip th{position:sticky;top:0;z-index:2;background:#edf4f8;color:#173a63;font-weight:950}
      #ceV25GraphTip tr:last-child td{border-bottom:0}
      #ceV25GraphTip tr.ce-g92-subtotal td{background:#f8fafc;color:#173a63;font-weight:950}
      #ceV25GraphTip .ce-g92-total{margin-top:14px;padding:11px 12px;border:1px solid #cbd9e4;border-left:5px solid #173a63;border-radius:10px;background:#f3f7fa;color:#0f172a;font:950 16px/1.3 system-ui,sans-serif}
      #ceV25GraphTip .ce-g92-thumb-head,#ceV25GraphTip .ce-g92-thumb-cell{width:68px;min-width:68px;text-align:center}
      #ceV25GraphTip .ce-g92-thumb-cell-empty{width:68px;min-width:68px;padding:0!important;background:transparent!important}
      #ceV25GraphTip .ce-g92-thumb-slot{width:50px;height:50px;display:inline-grid;place-items:center;border:1px solid #d5e1ea;border-radius:9px;background:#f2f6f9;overflow:hidden}
      #ceV25GraphTip .ce-g92-thumb-slot.loading:after{content:"";width:17px;height:17px;border:2px solid #b7c7d4;border-top-color:#173a63;border-radius:50%;animation:ceG92Spin .7s linear infinite}
      #ceV25GraphTip .ce-g92-thumb-slot.empty:after{content:"—";color:#9aabb8;font-weight:900}
      #ceV25GraphTip .ce-g92-thumb{width:50px;height:50px;padding:0;border:0;background:transparent;cursor:pointer}
      #ceV25GraphTip .ce-g92-thumb img{display:block;width:100%;height:100%;object-fit:cover;animation:none!important;transition:none!important;transform:none!important}
      body.ce-g92-tip-open:before{content:"";position:fixed;inset:0;z-index:2147483643;background:rgba(2,8,23,.34);pointer-events:none}
      body.ce-g92-tip-open #ceTooltipV21,body.ce-g92-tip-open #ceTooltipV196,body.ce-g92-tip-open #ceTooltipV1952,body.ce-g92-tip-open #ceTooltipV190,body.ce-g92-tip-open #ceTooltipV181{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
      #ceV25GraphMedia{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:16px;background:rgba(2,8,23,.84);backdrop-filter:blur(5px)}
      #ceV25GraphMedia .ce-g92-viewer{position:relative;width:min(1040px,96vw);max-height:95vh;display:flex;flex-direction:column;overflow:hidden;border-radius:20px;background:#fff;box-shadow:0 30px 95px rgba(0,0,0,.5)}
      #ceV25GraphMedia .ce-g92-viewer-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:14px 14px 12px 18px;border-bottom:1px solid #dce6ed;background:linear-gradient(110deg,#0d253d,#173a63);color:#fff}
      #ceV25GraphMedia .ce-g92-viewer-head>div{min-width:0}.ce-g92-viewer-head span{display:block;color:#8ed8ff;font:950 10px/1.2 system-ui;letter-spacing:.12em}.ce-g92-viewer-head strong{display:block;margin-top:3px;font:950 20px/1.2 system-ui;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ce-g92-viewer-head small{display:block;margin-top:4px;color:#d4e4f0;font:800 12px/1.3 system-ui}.ce-g92-viewer-status{display:inline-flex;margin-top:5px;padding:3px 8px;border-radius:999px;font:950 9px/1 system-ui;text-transform:uppercase}.ce-g92-viewer-status.live{background:rgba(37,211,141,.2);color:#b9ffdf}.ce-g92-viewer-status.finalized{background:rgba(255,105,120,.2);color:#ffd0d5}
      #ceV25GraphMedia .ce-g92-viewer-actions{display:flex;gap:8px;flex:0 0 auto}.ce-g92-viewer-actions button{width:38px;height:38px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.3);border-radius:11px;background:rgba(255,255,255,.1);color:#fff;font:900 22px/1 system-ui;cursor:pointer}.ce-g92-viewer-actions .ce-g92-download{font-size:18px}
      #ceV25GraphMedia .ce-g92-viewer-body{display:grid;place-items:center;overflow:auto;padding:14px;background:#eef3f7}
      #ceV25GraphMedia img{display:block;max-width:100%;max-height:calc(95vh - 112px);object-fit:contain;border-radius:12px;background:#fff}
      @keyframes ceG92Spin{to{transform:rotate(360deg)}}
      @media(max-width:700px){#ceV25GraphTip{width:calc(100vw - 16px)!important;max-width:calc(100vw - 16px)!important;max-height:84vh!important;border-radius:15px!important}#ceV25GraphTip .ce-g92-content{padding:12px 10px 14px}#ceV25GraphTip th,#ceV25GraphTip td{padding:7px 6px;font-size:11px}#ceV25GraphMedia{padding:6px}#ceV25GraphMedia .ce-g92-viewer{width:100%;max-height:98vh;border-radius:14px}#ceV25GraphMedia img{max-height:calc(98vh - 112px)}}
    `;
    document.head.appendChild(style);
  }

  function tableToRaw(table){
    const lines=[];
    const head=Array.from(table.querySelectorAll('thead th')).map(cell=>text(cell.textContent));
    if(head.length)lines.push(head.join(' | '));
    table.querySelectorAll('tbody tr').forEach(row=>{
      const cells=Array.from(row.children).map(cell=>text(cell.textContent));
      if(cells.some(Boolean))lines.push(cells.join(' | '));
    });
    return lines;
  }
  function rawFromLegacyTip(node){
    if(!node)return '';
    const clone=node.cloneNode(true);
    clone.querySelectorAll('button,[aria-label="Cerrar"],.close,.tooltip-close').forEach(item=>item.remove());
    const lines=[];
    clone.querySelectorAll('table').forEach(table=>{
      const before=[];
      let prev=table.previousElementSibling;
      while(prev&&before.length<3){const value=text(prev.textContent);if(value)before.unshift(value);prev=prev.previousElementSibling;}
      before.forEach(value=>{if(!lines.includes(value))lines.push(value);});
      lines.push(...tableToRaw(table));
      table.remove();
    });
    const remaining=text(clone.innerText||clone.textContent).split(/\n+/).map(text).filter(Boolean);
    remaining.forEach(value=>{if(!lines.includes(value))lines.push(value);});
    return lines.join('\n');
  }
  function forceTipVisible(){
    if(!activeTip||suspended)return;
    if(!activeTip.isConnected)document.body.appendChild(activeTip);
    activeTip.hidden=false;
    activeTip.removeAttribute('aria-hidden');
    activeTip.style.setProperty('display','flex','important');
    activeTip.style.setProperty('visibility','visible','important');
    activeTip.style.setProperty('opacity','1','important');
    activeTip.style.setProperty('pointer-events','auto','important');
    document.body.classList.add('ce-g92-tip-open');
  }
  function startTipWatchdog(){
    clearInterval(tipWatchdog);
    tipWatchdog=setInterval(()=>{if(!activeTip||suspended){clearInterval(tipWatchdog);tipWatchdog=0;return;}forceTipVisible();scrubLegacyTips();},120);
  }

  function renderStructured(raw){
    const lines=String(raw||'').replace(/\r/g,'').split('\n').map(value=>text(value));
    const totals=[];const html=[];let table=[];let proseIndex=0;
    const flushTable=()=>{
      if(!table.length)return;
      const rows=table.map(line=>line.split('|').map(cell=>text(cell)));
      const head=rows.shift()||[];
      html.push(`<div class="ce-g92-table-wrap"><table><thead><tr>${head.map(cell=>`<th>${esc(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map(cells=>{const subtotal=/^TOTAL\b/i.test(cells[0]||'')||/^SUBTOTAL\b/i.test(cells[0]||'');return `<tr class="${subtotal?'ce-g92-subtotal':''}">${cells.map(cell=>`<td>${esc(cell)}</td>`).join('')}</tr>`;}).join('')}</tbody></table></div>`);
      table=[];
    };
    lines.forEach(line=>{
      if(!line){flushTable();return;}
      if(line.includes('|')){table.push(line);return;}
      flushTable();
      if(/^TOTAL\b/i.test(line)){totals.push(line);return;}
      const value=esc(line).replace(/(\d{1,3}(?:\.\d{3})*,\d{2}\s*€|\d+(?:,\d{2})?\s*€)/g,'<strong>$1</strong>');
      if(proseIndex===0)html.push(`<h2 class="ce-g92-title">${value}</h2>`);
      else if(proseIndex===1||/^(INGRESOS|DONACI|GAST|COMPRADO|DONADO|PENDIENTE|PTE\.?|SALDO|VALORACI|SOCIOS|NO SOCIOS|PERSONAS|PRODUCTOS|TIENDA|TICKET|POR )/i.test(line))html.push(`<div class="ce-g92-subtitle">${value}</div>`);
      else html.push(`<div class="ce-g92-text">${value}</div>`);
      proseIndex+=1;
    });
    flushTable();
    totals.forEach(line=>html.push(`<div class="ce-g92-total">${esc(line).replace(/(\d{1,3}(?:\.\d{3})*,\d{2}\s*€|\d+(?:,\d{2})?\s*€)/g,'<strong>$1</strong>')}</div>`));
    return html.join('')||'<div class="ce-g92-text">Sin información disponible.</div>';
  }

  function incomeRows(){
    const id=selectedEventId();const ev=currentEvent();const price=number(ev.precio||ev.price);
    return list('colaboradores').filter(row=>text(row.eventId||row.event_id||row.eventoId)===id).map(row=>{
      const personId=row.personaId||row.persona_id;
      const current=list('personas').find(item=>text(item.id)===text(personId))||{};
      const historical=window.ControlEventHistoricalPeople?.snapshotFor?.(id,personId,row)||{};
      const range=normalize(row.personaRangoSnapshot||row.persona_rango_snapshot||historical.rango||row.personaRango||row.rango||current.rango);
      const name=text(row.personaNombreSnapshot||row.persona_nombre_snapshot||historical.nombre||row.personaNombre||current.nombre||row.nombre||personName(personId));
      const member=range==='SOCIO';
      const amount=row.total!=null?number(row.total):((member?number(row.numero)*price:0)+number(row.importe??row.importeVoluntario??row.voluntario??row.base));
      return {id:text(row.id||row.colaborador_id),name,range,method:text(row.situacion||row.formaPago||row.forma_pago||row.ingreso||''),amount};
    }).filter(row=>row.id&&row.name);
  }
  function cacheForEvent(){
    const id=selectedEventId();if(!id)return Promise.resolve({});
    const cached=receiptCache.get(id);if(cached?.images)return Promise.resolve(cached.images);if(cached?.promise)return cached.promise;
    const promise=(async()=>{
      let images={...(state().ticketImages||{}),...(state().ticketImageRefs||{})};
      try{const response=await fetch(`/api/ticket-images?eventId=${encodeURIComponent(id)}&_=${Date.now()}`,{cache:'no-store'});const payload=await response.json().catch(()=>({}));if(response.ok&&payload?.images)images={...images,...payload.images};}catch(_){ }
      const normalized={};Object.entries(images).forEach(([key,value])=>{const src=imageSrc(value);if(src)normalized[key]=src;});
      receiptCache.set(id,{images:normalized});
      const st=state();st.ticketImages=st.ticketImages||{};Object.assign(st.ticketImages,normalized);
      return normalized;
    })();
    receiptCache.set(id,{promise});return promise;
  }
  function imageForIncome(images,income){
    const id=selectedEventId();const patterns=[`${id}|INGRESO:${income.id}`,`${id}|INGRESO|${income.id}`,`INGRESO:${id}|${income.id}`,`INGRESO:${income.id}`].map(normalize);
    let best={score:-1,src:''};
    Object.entries(images||{}).forEach(([key,src])=>{const nk=normalize(key);let score=-1;patterns.forEach((pattern,index)=>{if(nk===pattern)score=Math.max(score,1000-index);});if(score<0&&nk.includes(normalize(`INGRESO ${income.id}`)))score=700;if(score>best.score)best={score,src};});
    return best.src;
  }
  function imageForTicket(images,code,rowText){
    const id=selectedEventId();const token=normalize(code).replace(/\s+/g,'');const words=normalize(rowText);
    let best={score:-1,src:''};
    Object.entries(images||{}).forEach(([key,value])=>{
      const src=imageSrc(value);if(!src)return;
      const raw=String(key);const nk=normalize(raw);const compact=nk.replace(/\s+/g,'');const srcCompact=normalize(src).replace(/\s+/g,'');
      let score=-1;
      if(compact===token)score=1100;
      else if(id&&raw.startsWith(id+'|')&&compact.includes(token))score=1050;
      else if(compact.includes(token))score=850;
      else if(srcCompact.includes(token))score=700;
      if(score>0&&words){const rowTokens=words.split(' ').filter(word=>word.length>3);score+=rowTokens.filter(word=>nk.includes(word)).length*4;}
      if(score>best.score)best={score,src};
    });
    return best.src;
  }
  function addThumbHeader(table){
    const head=table.querySelector('thead tr');if(!head||head.querySelector('.ce-g92-thumb-head'))return;
    const th=document.createElement('th');th.className='ce-g92-thumb-head';th.textContent='Just.';head.appendChild(th);
  }
  function addThumbSlot(row,meta){
    let cell=row.querySelector('.ce-g92-thumb-cell');if(!cell){cell=document.createElement('td');cell.className='ce-g92-thumb-cell';cell.innerHTML='<span class="ce-g92-thumb-slot loading"></span>';row.appendChild(cell);}
    cell.dataset.ceG92Kind=meta.kind;cell.dataset.ceG92Id=meta.id||'';cell.dataset.ceG92Name=meta.name||'';cell.dataset.ceG92Code=meta.code||'';cell.dataset.ceG92Store=meta.store||'';cell.dataset.ceG92Amount=String(meta.amount||0);cell.dataset.ceG92Method=meta.method||'';
  }
  function addEmptyThumbCell(row){
    if(row.querySelector('.ce-g92-thumb-cell,.ce-g92-thumb-cell-empty'))return;
    const cell=document.createElement('td');cell.className='ce-g92-thumb-cell-empty';cell.setAttribute('aria-hidden','true');row.appendChild(cell);
  }
  function prepareThumbSlots(tip){
    const incomes=incomeRows();
    tip.querySelectorAll('table').forEach(table=>{
      const headers=Array.from(table.querySelectorAll('thead th')).map(cell=>normalize(cell.textContent));
      const nameIndex=headers.findIndex(value=>value==='NOMBRE'||value.includes('COLABORADOR'));
      const methodIndex=headers.findIndex(value=>value==='INGRESO'||value.includes('FORMA PAGO'));
      const amountIndex=headers.findIndex(value=>value==='IMPORTE'||value==='TOTAL'||value.includes('IMPORTE'));
      const ticketIndex=headers.findIndex(value=>value.includes('TICKET')||value.includes('TKXX')||value.includes('OTROS GASTOS'));
      const storeIndex=headers.findIndex(value=>value.includes('TIENDA')||value.includes('PROVEEDOR'));
      if(nameIndex>=0&&amountIndex>=0){
        addThumbHeader(table);
        table.querySelectorAll('tbody tr').forEach(row=>{
          const cells=Array.from(row.children);const name=normalize(cells[nameIndex]?.textContent);const method=normalize(cells[methodIndex]?.textContent);const amount=number(cells[amountIndex]?.textContent);
          let match=incomes.find(item=>normalize(item.name)===name&&Math.abs(item.amount-amount)<.02&&(!method||normalize(item.method)===method));
          if(!match)match=incomes.find(item=>normalize(item.name)===name&&Math.abs(item.amount-amount)<.02);
          if(!match)match=incomes.find(item=>normalize(item.name)===name);
          addThumbSlot(row,{kind:'income',id:match?.id||'',name:match?.name||text(cells[nameIndex]?.textContent),method:match?.method||text(cells[methodIndex]?.textContent),amount:match?.amount||amount});
        });
        return;
      }
      const rows=Array.from(table.querySelectorAll('tbody tr'));const hasTicket=ticketIndex>=0||rows.some(row=>/\bTK\s*0*\d+\b/i.test(row.textContent||''));
      if(hasTicket){
        addThumbHeader(table);
        const totalRows=rows.filter(row=>row.classList.contains('ce-g92-subtotal')||/^\s*(TOTAL|SUBTOTAL)\b/i.test(text(row.children[0]?.textContent)));
        rows.forEach(row=>{
          if(!totalRows.includes(row)){addEmptyThumbCell(row);return;}
          const raw=text(row.textContent);
          const first=text(row.children[0]?.textContent);
          const ticketText=text((ticketIndex>=0?row.children[ticketIndex]:null)?.textContent||first||raw);
          const match=ticketText.match(/\bTK\s*0*\d+\b/i)||first.match(/\bTK\s*0*\d+\b/i)||raw.match(/\bTK\s*0*\d+\b/i);
          const code=match?match[0].toUpperCase().replace(/\s+/g,''):'';
          const totalMatch=first.match(/^\s*TOTAL\s+(.+?),\s*(TK\s*0*\d+)\b/i);
          const store=totalMatch?text(totalMatch[1]):text((storeIndex>=0?row.children[storeIndex]:null)?.textContent||'Tienda');
          if(code)addThumbSlot(row,{kind:'ticket',code,store,name:`${first} ${raw}`});else addEmptyThumbCell(row);
        });
      }
    });
  }
  async function hydrateThumbs(tip){
    if(!tip?.isConnected)return;const images=await cacheForEvent();if(!tip.isConnected)return;
    tip.querySelectorAll('.ce-g92-thumb-cell').forEach(cell=>{
      const slot=cell.querySelector('.ce-g92-thumb-slot');if(!slot)return;
      const kind=cell.dataset.ceG92Kind;let src='';let filename='';let title='';
      if(kind==='income'){
        const item={id:cell.dataset.ceG92Id,name:cell.dataset.ceG92Name,method:cell.dataset.ceG92Method,amount:number(cell.dataset.ceG92Amount)};
        src=item.id?imageForIncome(images,item):'';filename=incomeFilename(item.name);title=`Justificante de ingreso · ${item.name}`;
      }else{
        const code=cell.dataset.ceG92Code;src=code?imageForTicket(images,code,cell.dataset.ceG92Name):'';filename=ticketFilename(code,cell.dataset.ceG92Store);title=`${code||'TKxx'} · ${cell.dataset.ceG92Store||'Tienda'}`;
      }
      slot.classList.remove('loading');
      if(!src){slot.classList.add('empty');return;}
      const ticketAttrs=kind==='ticket'?` data-ce-view-ticket-image="1" data-ticket-code="${esc(cell.dataset.ceG92Code)}" data-store-name="${esc(cell.dataset.ceG92Store)}" data-ce-v17-label="${esc(`${cell.dataset.ceG92Store||'Tienda'} | ${cell.dataset.ceG92Code||'TKxx'}`)}"`:'';
      slot.classList.remove('empty');slot.innerHTML=`<button type="button" class="ce-g92-thumb" data-ce-g92-photo="1"${ticketAttrs} data-image-src="${esc(src)}" data-photo-title="${esc(title)}" data-download-name="${esc(filename)}" aria-label="Ver ${esc(title)}"><img src="${esc(src)}" alt="${esc(title)}"></button>`;
    });
  }

  function closeTip(){
    clearTimeout(closeTimer);clearInterval(tipWatchdog);tipWatchdog=0;scrubLegacyTips();
    if(activeTip?.isConnected)activeTip.remove();
    activeTip=null;activeOwner=null;suspended=null;outsideCloseAllowedAt=0;document.body.classList.remove('ce-g92-tip-open');
  }
  function scheduleClose(){clearTimeout(closeTimer);}
  function openTipFromRaw(raw,owner=null,restore={}){
    raw=text(raw);if(!raw)return;
    closeTip();scrubLegacyTips();addStyle();activeOwner=owner;outsideCloseAllowedAt=Date.now()+900;
    const tip=document.createElement('section');tip.id='ceV25GraphTip';tip.tabIndex=-1;tip.setAttribute('role','dialog');tip.setAttribute('aria-modal','false');tip.setAttribute('aria-label','Información de gráficas');tip.setAttribute('data-ce-preserve-tooltip','1');tip.setAttribute('data-ce-g92-stable','1');
    tip.innerHTML=`<header class="ce-g92-head"><div><span class="ce-g92-kicker">GRÁFICAS DEL EVENTO</span><strong class="ce-g92-event">${esc(eventTitle())}</strong><span class="ce-g92-status ${statusClass()}">${esc(eventStatus())}</span></div><button type="button" class="ce-g92-close" data-ce-g92-close-tip aria-label="Cerrar información">×</button></header><div class="ce-g92-content">${renderStructured(raw)}</div>`;
    document.body.appendChild(tip);activeTip=tip;document.body.classList.add('ce-g92-tip-open');
    prepareThumbSlots(tip);hydrateThumbs(tip);startTipWatchdog();forceTipVisible();
    requestAnimationFrame(()=>{const content=tip.querySelector('.ce-g92-content');if(content){content.scrollTop=restore.scrollTop||0;content.scrollLeft=restore.scrollLeft||0;}});
  }
  function openTip(owner,restore={}){
    const raw=adoptOwner(owner);if(!raw)return;
    openTipFromRaw(raw,owner,restore);
  }
  function suspendTip(){
    if(!activeTip||suspended)return;
    const content=activeTip.querySelector('.ce-g92-content');
    suspended={tip:activeTip,owner:activeOwner,scrollTop:content?.scrollTop||0,scrollLeft:content?.scrollLeft||0};
    activeTip.hidden=true;document.body.classList.remove('ce-g92-tip-open');
  }
  function restoreTip(){
    if(!suspended)return;const saved=suspended;suspended=null;
    if(saved.tip?.isConnected){saved.tip.hidden=false;activeTip=saved.tip;activeOwner=saved.owner;const content=saved.tip.querySelector('.ce-g92-content');if(content){content.scrollTop=saved.scrollTop;content.scrollLeft=saved.scrollLeft;}document.body.classList.add('ce-g92-tip-open');}
    else if(saved.owner?.isConnected)openTip(saved.owner,{scrollTop:saved.scrollTop,scrollLeft:saved.scrollLeft});
  }

  function downloadImage(src,filename){
    const fire=url=>{const a=document.createElement('a');a.href=url;a.download=filename||'imagen.jpg';a.rel='noopener';a.style.display='none';document.body.appendChild(a);a.click();setTimeout(()=>a.remove(),500);};
    if(/^data:|^blob:/i.test(src)){fire(src);return;}
    fetch(src,{cache:'no-store'}).then(response=>{if(!response.ok)throw new Error();return response.blob();}).then(blob=>{const url=URL.createObjectURL(blob);fire(url);setTimeout(()=>URL.revokeObjectURL(url),3000);}).catch(()=>fire(src));
  }
  function closeViewer(restore=true){$('ceV25GraphMedia')?.remove();if(restore)setTimeout(restoreTip,30);}
  function openViewer(button){
    const src=text(button?.dataset.imageSrc||button?.querySelector('img')?.currentSrc||button?.querySelector('img')?.src);if(!src)return;
    suspendTip();closeViewer(false);
    const title=text(button.dataset.photoTitle||button.title||button.getAttribute('aria-label')||'Justificante');
    const filename=text(button.dataset.downloadName||incomeFilename(title));
    const viewer=document.createElement('div');viewer.id='ceV25GraphMedia';
    viewer.innerHTML=`<section class="ce-g92-viewer" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header class="ce-g92-viewer-head"><div><span>${esc(eventTitle())}</span><strong>${esc(title)}</strong><small>Justificante del evento</small><em class="ce-g92-viewer-status ${statusClass()}">${esc(eventStatus())}</em></div><div class="ce-g92-viewer-actions"><button type="button" class="ce-g92-download" data-ce-g92-download data-image-src="${esc(src)}" data-download-name="${esc(filename)}" title="Descargar" aria-label="Descargar">⬇</button><button type="button" data-ce-g92-close-viewer aria-label="Cerrar visor">×</button></div></header><div class="ce-g92-viewer-body"><img src="${esc(src)}" alt="${esc(title)}"></div></section>`;
    document.body.appendChild(viewer);
  }
  function genericPhotoMeta(button){
    const img=button?.querySelector?.('img')||button?.closest?.('button')?.querySelector?.('img')||button?.matches?.('img')&&button;
    const src=text(button?.dataset?.imageSrc||img?.currentSrc||img?.src);if(!src)return null;
    const person=text(button?.dataset?.personName||button?.dataset?.colaborador||img?.alt||'Justificante');
    const code=text(button?.dataset?.ticketCode||button?.dataset?.tk||'');
    const title=code?`${code} · ${person}`:`Justificante de ingreso · ${person}`;
    const filename=code?ticketFilename(code,button?.dataset?.storeName||'Tienda'):incomeFilename(person);
    return {src,title,filename};
  }

  function warmCache(){cacheForEvent();}
  function consume(event){try{event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();}catch(_){}}
  function directAction(event){
    const target=event.target;
    const close=target?.closest?.('[data-ce-g92-close-tip]');if(close){consume(event);closeTip();return true;}
    const viewerClose=target?.closest?.('[data-ce-g92-close-viewer]');if(viewerClose||target?.id==='ceV25GraphMedia'){consume(event);closeViewer(true);return true;}
    const download=target?.closest?.('[data-ce-g92-download]');if(download){consume(event);downloadImage(download.dataset.imageSrc,download.dataset.downloadName);return true;}
    const thumb=target?.closest?.('[data-ce-g92-photo="1"]');if(thumb){
      const accountingTicket=thumb.closest?.('#summaryTiendaTicket,#ceBudgetLiteTooltipV307');
      const graphTicket=thumb.closest?.('#ceV25GraphTip')&&text(thumb.dataset.ticketCode);
      if(accountingTicket||graphTicket){
        const opener=root.ControlEventV17Fix10?.openTicketViewerFromThumb;
        if(typeof opener==='function'){
          consume(event);
          opener(thumb,event);
          if(graphTicket)closeTip();
          return true;
        }
        return false;
      }
      consume(event);openViewer(thumb);return true;
    }
    return false;
  }
  function onGraphPointerDown(event){
    if(insideZuzu(event.target))return;
    if(directAction(event))return;
    if(activeTip&&activeTip.contains(event.target))return;
    const graphRoot=event.target?.closest?.('#tabGraficas,#eventChartWrap');
    if(graphRoot){lastGraphPointerAt=Date.now();lastGraphTarget=event.target;suppressLegacyUntil=Date.now()+1200;}
    const owner=graphOwner(event.target,event);if(!owner)return;
    suppressClickUntil=Date.now()+850;outsideCloseAllowedAt=Date.now()+1000;consume(event);openTip(owner);
  }
  function onGraphPointerUp(event){
    if(insideZuzu(event.target))return;
    if(activeTip&&!activeTip.contains(event.target)&&Date.now()<suppressClickUntil)consume(event);
  }
  function onGraphClick(event){
    if(insideZuzu(event.target))return;
    if(directAction(event))return;
    const legacyPhoto=event.target?.closest?.('#ceV25GraphTip .ce-v465-tip-thumb,#ceV25GraphTip [data-action="ingreso-receipt-view-v465"],#ceV25GraphTip [data-ce-v512-budget-photo],#ceV25GraphTip button:has(img)');
    if(legacyPhoto){const meta=genericPhotoMeta(legacyPhoto);if(meta){legacyPhoto.dataset.imageSrc=meta.src;legacyPhoto.dataset.photoTitle=meta.title;legacyPhoto.dataset.downloadName=meta.filename;consume(event);openViewer(legacyPhoto);}return;}
    const owner=graphOwner(event.target,event);
    if(owner){consume(event);if(!activeTip||activeOwner!==owner)openTip(owner);return;}
    if(activeTip&&!activeTip.contains(event.target)&&!suspended){
      consume(event);
      if(Date.now()>=Math.max(outsideCloseAllowedAt,suppressClickUntil))closeTip();
    }
  }
  function captureLegacyTip(node){
    if(!node||!(node instanceof Element))return;
    setTimeout(()=>{
      const recentGraphAction=Date.now()-lastGraphPointerAt<1600;
      if(!activeTip&&!recentGraphAction) return; // Nunca tocar globos creados por RESUMEN u otros módulos.
      if(!node.isConnected&&activeTip)return;
      const raw=rawFromLegacyTip(node);
      if(!activeTip&&raw&&recentGraphAction)openTipFromRaw(raw,lastGraphTarget?.closest?.('#tabGraficas,#eventChartWrap')||null);
      node.remove();
    },20);
  }

  addStyle();
  root.addEventListener('pointerdown',onGraphPointerDown,true);
  root.addEventListener('pointerup',onGraphPointerUp,true);
  root.addEventListener('click',onGraphClick,true);
  root.addEventListener('mouseover',event=>{if(graphOwner(event.target,event)){suppressLegacyUntil=Date.now()+650;event.stopImmediatePropagation();scrubLegacyTips();}},true);
  root.addEventListener('mouseout',event=>{if(graphOwner(event.target,event)){event.stopImmediatePropagation();}},true);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){
      if($('ceV25GraphMedia')){event.preventDefault();closeViewer(true);return;}
      if(activeTip){event.preventDefault();closeTip();return;}
    }
    if((event.key==='Enter'||event.key===' ')&&graphOwner(event.target,event)){event.preventDefault();openTip(graphOwner(event.target,event));}
  },true);
  document.addEventListener('change',event=>{if(event.target?.id==='selectedEvent'){closeViewer(false);closeTip();receiptCache.clear();setTimeout(warmCache,80);}},true);
  root.addEventListener('pagehide',()=>{closeViewer(false);closeTip();});

  const observer=new MutationObserver(mutations=>{
    let graphTouched=false;
    mutations.forEach(mutation=>{
      if(mutation.type==='attributes'&&mutation.target===activeTip){forceTipVisible();return;}
      mutation.addedNodes.forEach(node=>{
        if(!(node instanceof Element))return;
        const legacyNodes=[];
        if(legacyTipIds.includes(node.id)||node.matches?.('.ce-v211-tooltip,.ce-v196-tooltip,.ce-v1952-tooltip'))legacyNodes.push(node);
        node.querySelectorAll?.('#ceTooltipV21,#ceTooltipV196,#ceTooltipV1952,#ceTooltipV190,#ceTooltipV181,.ce-v211-tooltip,.ce-v196-tooltip,.ce-v1952-tooltip').forEach(item=>legacyNodes.push(item));
        legacyNodes.forEach(item=>{if(activeTip)item.remove();else captureLegacyTip(item);});
        if(node.matches?.('#tabGraficas,#eventChartWrap')||node.querySelector?.('#tabGraficas,#eventChartWrap'))graphTouched=true;
      });
    });
    if(activeTip&&!suspended)forceTipVisible();
    if(graphTouched)setTimeout(warmCache,60);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(warmCache,180);
  root.ControlEventGraphFix92={version:'FIX9.3.10',open:openTip,close:closeTip,warm:warmCache};
})(window);
