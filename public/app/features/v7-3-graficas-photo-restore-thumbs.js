/* ControlEvent v25_prod FIX9 · GRAFICAS: globo efímero y retorno tras abrir justificantes. */
(function(root){
  'use strict';
  const FLAG='__ceV25StableGraphTipFix6';
  if(root[FLAG]) return; root[FLAG]=true;
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let activeOwner=null, suppressGraphClickUntil=0, closeTimer=0, suspendedTip=null, suspendedAt=0, viewerSeen=false;

  function graphOwner(target){
    const owner=target?.closest?.('#tabGraficas [data-ce-tip-v21],#eventChartWrap [data-ce-tip-v21]');
    return owner&&owner.getAttribute('data-ce-tip-v21')?.trim()?owner:null;
  }
  function photoViewerOpen(){
    return !!document.querySelector('#ceV25GraphReceiptViewer,.ce-v468-modal,.ce-v465-modal,#ceV310PhotoViewer:not(.hidden),#ceV401PcPhotoModal:not(.hidden),[role="dialog"].ce-photo-viewer');
  }
  function closeTip(){
    clearTimeout(closeTimer);
    const tip=$('ceTooltipV21');
    if(tip?.dataset.ceStableFix6==='1') tip.remove();
    document.body.classList.remove('ce-v25-graph-tip-open');
    activeOwner=null;
    suspendedTip=null; viewerSeen=false;
  }
  function scheduleTipClose(delay=220){
    clearTimeout(closeTimer);
    closeTimer=setTimeout(()=>{
      const tip=$('ceTooltipV21');
      if(!tip||suspendedTip||photoViewerOpen()) return;
      if(tip.matches(':hover')||tip.contains(document.activeElement)) return;
      closeTip();
    },delay);
  }
  function suspendTipForPhoto(){
    const tip=$('ceTooltipV21');
    if(!tip||tip.dataset.ceStableFix6!=='1') return;
    suspendedTip={tip,owner:activeOwner,scrollTop:tip.scrollTop};
    suspendedAt=Date.now(); viewerSeen=false;
    tip.style.setProperty('visibility','hidden','important');
    tip.style.setProperty('pointer-events','none','important');
    document.body.classList.remove('ce-v25-graph-tip-open');
  }
  function resumeTipAfterPhoto(){
    if(!suspendedTip) return;
    const saved=suspendedTip; suspendedTip=null; viewerSeen=false;
    if(saved.tip?.isConnected){
      saved.tip.style.removeProperty('visibility');
      saved.tip.style.removeProperty('pointer-events');
      saved.tip.scrollTop=saved.scrollTop||0;
      activeOwner=saved.owner;
      document.body.classList.add('ce-v25-graph-tip-open');
      saved.tip.focus?.({preventScroll:true});
    }else if(saved.owner?.isConnected){
      openTip(saved.owner,saved.scrollTop||0);
    }
  }
  function renderText(raw){
    const lines=String(raw||'').replace(/\r/g,'').split('\n');
    const html=[]; let rows=[];
    const flush=()=>{
      if(!rows.length) return;
      html.push('<div class="ce-v25-stable-table-wrap"><table class="ce-v21-table"><tbody>'+rows.map((cells,index)=>'<tr class="'+(index===0?'head':'')+'">'+cells.map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>');
      rows=[];
    };
    lines.forEach((line,index)=>{
      const clean=String(line||'').trim();
      if(!clean){flush();return;}
      if(clean.includes('|')){rows.push(clean.split('|').map(v=>v.trim()));return;}
      flush();
      const value=esc(clean).replace(/(\d{1,3}(?:\.\d{3})*,\d{2}\s*€|\d+(?:,\d{2})?\s*€)/g,'<strong>$1</strong>');
      if(/^TOTAL\b/i.test(clean)) html.push('<div class="ce-v21-title ce-v21-total">'+value+'</div>');
      else if(index===0||/^(INGRESOS|DONACI|COMPRADO|DONADO|PENDIENTE|PTE\.?|GAST|POR |SOCIOS|NO SOCIOS|PERSONAS|PRODUCTOS|TIENDA|TICKET)/i.test(clean)) html.push('<div class="ce-v21-title">'+value+'</div>');
      else html.push('<div class="ce-v21-text">'+value+'</div>');
    });
    flush(); return html.join('');
  }
  function addStyle(){
    if($('ce-v25-stable-graph-tip-style')) return;
    const style=document.createElement('style'); style.id='ce-v25-stable-graph-tip-style';
    style.textContent=`
      #ceTooltipV21[data-ce-stable-fix6="1"]{position:fixed!important;left:50%!important;top:50%!important;right:auto!important;bottom:auto!important;transform:translate(-50%,-50%)!important;width:min(680px,calc(100vw - 32px))!important;max-width:min(680px,calc(100vw - 32px))!important;max-height:min(76vh,720px)!important;display:block!important;visibility:visible!important;opacity:1!important;overflow:auto!important;pointer-events:auto!important;z-index:2147483644!important;padding:48px 18px 18px!important;border:1px solid rgba(15,23,42,.22)!important;border-radius:18px!important;background:#fff!important;color:#172033!important;box-shadow:0 28px 90px rgba(2,8,23,.42)!important;animation:none!important;transition:none!important;contain:layout paint!important}
      #ceTooltipV21[data-ce-stable-fix6="1"] .ce-v21-tip-close{position:absolute!important;right:12px!important;top:10px!important;width:32px!important;height:32px!important;display:grid!important;place-items:center!important;border:1px solid #cbd5e1!important;border-radius:999px!important;background:#fff!important;color:#172033!important;font:900 22px/1 system-ui,sans-serif!important;cursor:pointer!important;z-index:4!important}
      #ceTooltipV21[data-ce-stable-fix6="1"] .ce-v21-title{margin:0 0 9px!important;font:900 15px/1.25 system-ui,sans-serif!important;color:#0f172a!important}
      #ceTooltipV21[data-ce-stable-fix6="1"] .ce-v21-text{margin:5px 0!important;font:700 13px/1.35 system-ui,sans-serif!important}
      #ceTooltipV21[data-ce-stable-fix6="1"] .ce-v21-total{margin-top:14px!important;padding-top:11px!important;border-top:2px solid #cbd5e1!important;font-size:16px!important}
      #ceTooltipV21[data-ce-stable-fix6="1"] .ce-v25-stable-table-wrap{overflow:auto!important;margin:8px 0 12px!important;border:1px solid #dbe3ec!important;border-radius:11px!important}
      #ceTooltipV21[data-ce-stable-fix6="1"] table{width:100%!important;border-collapse:collapse!important;font:700 12px/1.3 system-ui,sans-serif!important}
      #ceTooltipV21[data-ce-stable-fix6="1"] td{padding:7px 8px!important;border-bottom:1px solid #e5eaf0!important;vertical-align:middle!important}
      #ceTooltipV21[data-ce-stable-fix6="1"] tr.head td{position:sticky!important;top:0!important;background:#edf3f8!important;font-weight:950!important}
      #ceTooltipV21[data-ce-stable-fix6="1"] .ce-v465-tip-thumb{width:46px!important;height:46px!important;min-width:46px!important;animation:none!important;transform:none!important}
      body.ce-v25-graph-tip-open:before{content:"";position:fixed;inset:0;background:rgba(2,8,23,.34);z-index:2147483643;pointer-events:none}
      .ce-v25-graph-receipt-viewer{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:16px;background:rgba(2,8,23,.82)}
      .ce-v25-graph-receipt-viewer>div{position:relative;width:min(900px,96vw);max-height:94vh;display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:18px;background:#fff;box-shadow:0 28px 90px rgba(0,0,0,.45)}
      .ce-v25-graph-receipt-viewer button{position:absolute;right:10px;top:8px;width:38px;height:38px;border:1px solid #cbd5e1;border-radius:999px;background:#fff;font:900 25px/1 system-ui;cursor:pointer}
      .ce-v25-graph-receipt-viewer header{display:flex;flex-direction:column;padding-right:44px}.ce-v25-graph-receipt-viewer header span{font:900 11px/1.2 system-ui;letter-spacing:.12em;color:#64748b}.ce-v25-graph-receipt-viewer header strong{font:900 20px/1.2 system-ui;color:#0f172a}.ce-v25-graph-receipt-viewer header small{font:800 13px/1.3 system-ui;color:#475569}
      .ce-v25-graph-receipt-viewer img{max-width:100%;max-height:calc(94vh - 110px);object-fit:contain;border-radius:12px;background:#f8fafc}
      @media(max-width:700px){#ceTooltipV21[data-ce-stable-fix6="1"]{width:calc(100vw - 18px)!important;max-width:calc(100vw - 18px)!important;max-height:82vh!important;padding:44px 10px 12px!important}#ceTooltipV21[data-ce-stable-fix6="1"] td{padding:6px 5px!important;font-size:11px!important}}
    `;
    document.head.appendChild(style);
  }

  const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const number=value=>{let raw=String(value??'').replace(/[^0-9,.-]/g,'');if(raw.includes(',')&&raw.includes('.'))raw=raw.replace(/\./g,'').replace(',','.');else if(raw.includes(','))raw=raw.replace(',','.');const n=Number(raw);return Number.isFinite(n)?n:0;};
  const lexicalState=()=>{try{return Function('return (typeof state!=="undefined"&&state)?state:null')();}catch(_){return null;}};
  const appState=()=>lexicalState()||root.state||root.ControlEventApp?.state||root.appState||root.__CONTROL_EVENT_STATE__||{};
  const selectedEventId=()=>String(document.getElementById('selectedEvent')?.value||appState().selectedEventId||'').trim();
  const list=name=>{const value=appState()?.[name];if(Array.isArray(value))return value;if(value&&typeof value==='object')return Object.values(value);return [];};
  const imageSrc=value=>typeof value==='string'?value:String(value?.url||value?.public_url||value?.publicUrl||value?.pathname||value?.storage_path||value?.dataUrl||value?.src||'');
  function personName(personId){const row=list('personas').find(item=>String(item?.id||'')===String(personId||''));return String(row?.nombre||personId||'').trim();}
  function incomeRows(){
    const eventId=selectedEventId();
    const event=list('eventos').find(item=>String(item?.id||'')===eventId)||{};
    const price=number(event?.precio);
    return list('colaboradores').filter(row=>String(row?.eventId||row?.event_id||'')===eventId).map(row=>{
      const pid=row?.personaId||row?.persona_id;
      const person=list('personas').find(item=>String(item?.id||'')===String(pid||''))||{};
      const member=normalize(person?.rango)==='SOCIO';
      const amount=row?.total!=null?number(row.total):((member?number(row?.numero)*price:0)+number(row?.importe??row?.importeVoluntario??row?.voluntario??row?.base));
      return {id:String(row?.id||row?.colaborador_id||''),name:String(person?.nombre||row?.nombre||personName(pid)||'').trim(),method:String(row?.situacion||row?.formaPago||row?.forma_pago||row?.ingreso||'').trim(),amount};
    }).filter(row=>row.id&&row.name);
  }
  function receiptForIncome(incomeId){
    const eventId=selectedEventId();
    const store=appState().ticketImages||{};
    const patterns=[`${eventId}|INGRESO:${incomeId}`,`${eventId}|INGRESO|${incomeId}`,`INGRESO:${eventId}|${incomeId}`,`INGRESO:${incomeId}`].map(normalize);
    let best={score:-1,src:''};
    Object.entries(store).forEach(([key,value])=>{
      const src=imageSrc(value);if(!src)return;
      const nk=normalize(key);let score=-1;
      patterns.forEach((pattern,index)=>{if(nk===pattern)score=Math.max(score,1000-index);});
      if(score<0&&nk.includes(normalize(`INGRESO ${incomeId}`)))score=700;
      if(score>best.score)best={score,src};
    });
    return best.src;
  }
  async function hydrateReceiptStore(){
    const eventId=selectedEventId();if(!eventId)return;
    try{
      const response=await fetch(`/api/ticket-images?eventId=${encodeURIComponent(eventId)}&_=${Date.now()}`,{cache:'no-store'});
      const payload=await response.json().catch(()=>({}));if(!response.ok||!payload?.images)return;
      const state=appState();state.ticketImages=state.ticketImages||{};
      Object.entries(payload.images).forEach(([key,value])=>{if(/INGRESO[:|]/i.test(key))state.ticketImages[key]=imageSrc(value)||value;});
    }catch(_){ }
  }
  function directReceiptThumbs(tip){
    const incomes=incomeRows();
    tip?.querySelectorAll?.('table.ce-v21-table').forEach(table=>{
      const rows=Array.from(table.querySelectorAll('tr'));if(!rows.length)return;
      rows.forEach(row=>Array.from(row.children).filter(cell=>cell.classList?.contains('ce-v25-direct-thumb')).forEach(cell=>cell.remove()));
      const headerCells=Array.from(rows[0].children);
      const headers=headerCells.map(cell=>normalize(cell.textContent));
      const nameIndex=headers.indexOf('NOMBRE');
      const methodIndex=headers.indexOf('INGRESO');
      const amountIndex=headers.indexOf('IMPORTE');
      if(nameIndex<0||methodIndex<0||amountIndex<0)return;
      const head=document.createElement('td');head.className='ce-v465-thumb-cell ce-v25-direct-thumb';head.textContent='Just.';rows[0].appendChild(head);
      rows.slice(1).forEach(row=>{
        const cells=Array.from(row.children);
        // Algunas tablas incluyen una celda de título solo en la cabecera. En el detalle
        // se usan las tres primeras columnas: Nombre, Ingreso e Importe.
        const detailOffset=cells.length===headers.length-1&&nameIndex>0?nameIndex-1:nameIndex;
        const detailMethod=cells.length===headers.length-1&&methodIndex>0?methodIndex-1:methodIndex;
        const detailAmount=cells.length===headers.length-1&&amountIndex>0?amountIndex-1:amountIndex;
        if(cells.length<=Math.max(detailOffset,detailMethod,detailAmount))return;
        const name=normalize(cells[detailOffset].textContent),method=normalize(cells[detailMethod].textContent),amount=number(cells[detailAmount].textContent);
        let match=incomes.find(item=>normalize(item.name)===name&&Math.abs(item.amount-amount)<.02&&(!method||normalize(item.method)===method));
        if(!match)match=incomes.find(item=>normalize(item.name)===name&&Math.abs(item.amount-amount)<.02);
        if(!match)match=incomes.find(item=>normalize(item.name)===name);
        const src=match?receiptForIncome(match.id):'';
        const cell=document.createElement('td');cell.className='ce-v465-thumb-cell ce-v25-direct-thumb';
        cell.innerHTML=src&&match?`<button type="button" class="ce-v465-tip-thumb" title="Ver justificante de ${esc(match.name)}" data-action="ingreso-receipt-view-v465" data-id="${esc(match.id)}" data-image-src="${esc(src)}" data-person-name="${esc(match.name)}" data-income-method="${esc(match.method)}" data-income-amount="${esc(match.amount)}"><img alt="Justificante de ${esc(match.name)}" src="${esc(src)}"></button>`:'<span class="ce-v465-tip-empty" title="Sin justificante"></span>';
        row.appendChild(cell);
      });
      table.dataset.ceV465Receipts='1';table.dataset.ceV468Receipts='1';
    });
  }
  function closeDirectReceiptViewer(restoreTip=true){document.getElementById('ceV25GraphReceiptViewer')?.remove();if(restoreTip)setTimeout(resumeTipAfterPhoto,40);}
  function openDirectReceiptViewer(button){
    const src=String(button?.dataset?.imageSrc||button?.querySelector?.('img')?.src||'').trim();if(!src)return false;
    // Al sustituir un visor no se restaura todavía el globo: debe permanecer oculto
    // mientras la fotografía ampliada esté abierta.
    closeDirectReceiptViewer(false);
    const person=String(button?.dataset?.personName||'Ingreso');
    const method=String(button?.dataset?.incomeMethod||'Banco');
    const amount=number(button?.dataset?.incomeAmount);
    const viewer=document.createElement('div');viewer.id='ceV25GraphReceiptViewer';viewer.className='ce-v25-graph-receipt-viewer';
    viewer.innerHTML=`<div role="dialog" aria-modal="true" aria-label="Justificante de ingreso"><button type="button" data-ce-v25-close-receipt aria-label="Cerrar">×</button><header><span>JUSTIFICANTE DE INGRESO</span><strong>${esc(person)}</strong><small>${esc(method)} · ${amount.toLocaleString('es-ES',{style:'currency',currency:'EUR'})}</small></header><img src="${esc(src)}" alt="Justificante de ${esc(person)}"></div>`;
    document.body.appendChild(viewer);return true;
  }


  async function refreshReceiptThumbs(tip){
    if(!tip||!tip.isConnected||photoViewerOpen()) return;
    try{
      tip.querySelectorAll('table.ce-v21-table').forEach(table=>{
        table.removeAttribute('data-ce-v468-receipts');
        table.removeAttribute('data-ce-v465-receipts');
        const rows=Array.from(table.querySelectorAll('tr'));
        rows.forEach(row=>Array.from(row.children).forEach(cell=>{
          if(cell.classList?.contains('ce-v465-thumb-cell')||/^\s*JUST\.?\s*$/i.test(String(cell.textContent||''))) cell.remove();
        }));
      });
      await root.ControlEventV469?.hydrateEventReceipts?.(false);
      if(!tip.isConnected||photoViewerOpen()) return;
      root.ControlEventV469?.enrichOpenTooltips?.();
      root.ControlEventV467?.enrichOpenTooltips?.();
      await hydrateReceiptStore();
      if(tip.isConnected&&!photoViewerOpen()) directReceiptThumbs(tip);
    }catch(_){ try{directReceiptThumbs(tip);}catch(__){ } }
  }
  function openTip(owner,restoreScroll=0){
    const raw=owner?.getAttribute?.('data-ce-tip-v21'); if(!raw?.trim()) return;
    closeTip(); addStyle(); activeOwner=owner;
    const tip=document.createElement('div'); tip.id='ceTooltipV21'; tip.dataset.ceStableFix6='1'; tip.tabIndex=-1;
    tip.innerHTML='<button type="button" class="ce-v21-tip-close" aria-label="Cerrar información">×</button><div class="ce-v21-tip-content">'+renderText(raw)+'</div>';
    tip.addEventListener('mouseenter',()=>clearTimeout(closeTimer));
    tip.addEventListener('mouseleave',()=>scheduleTipClose(260));
    tip.addEventListener('focusout',event=>{if(!tip.contains(event.relatedTarget)&&!photoViewerOpen())scheduleTipClose(100);});
    document.body.appendChild(tip); document.body.classList.add('ce-v25-graph-tip-open');
    requestAnimationFrame(()=>{tip.scrollTop=restoreScroll||0;});
    // La hidratación de justificantes es asíncrona. Se fuerza una actualización limpia
    // después de cargar las imágenes para que la columna «Just.» no quede marcada vacía.
    [0,120,520].forEach(ms=>setTimeout(()=>{
      if(!$('ceTooltipV21')||$('ceTooltipV21')!==tip||photoViewerOpen()) return;
      refreshReceiptThumbs(tip);
    },ms));
  }
  function removeBackdropIfClosed(){if(!$('ceTooltipV21')?.dataset?.ceStableFix6)document.body.classList.remove('ce-v25-graph-tip-open');}

  // pointerdown/window se ejecuta antes que todos los gestores antiguos del documento.
  root.addEventListener('pointerdown',event=>{
    const owner=graphOwner(event.target);
    if(!owner) return;
    suppressGraphClickUntil=Date.now()+600;
    event.preventDefault(); event.stopImmediatePropagation(); openTip(owner);
  },true);
  // click cubre activación por teclado y anula el clic posterior al pointerdown.
  root.addEventListener('click',event=>{
    const directClose=event.target?.closest?.('[data-ce-v25-close-receipt]');
    if(directClose||event.target?.id==='ceV25GraphReceiptViewer'){event.preventDefault();event.stopImmediatePropagation();closeDirectReceiptViewer();return;}
    const close=event.target?.closest?.('#ceTooltipV21[data-ce-stable-fix6="1"] .ce-v21-tip-close');
    if(close){event.preventDefault();event.stopImmediatePropagation();closeTip();document.body.classList.remove('ce-v25-graph-tip-open');return;}
    const photo=event.target?.closest?.('#ceTooltipV21[data-ce-stable-fix6="1"] .ce-v465-tip-thumb,#ceTooltipV21[data-ce-stable-fix6="1"] [data-action="ingreso-receipt-view-v465"],#ceTooltipV21[data-ce-stable-fix6="1"] [data-ce-v512-budget-photo]');
    if(photo){
      // Se oculta temporalmente el globo para que el visor quede siempre delante,
      // también en eventos Finalizados. Al cerrar la foto se recuperan globo y scroll.
      suspendTipForPhoto();
      setTimeout(()=>{if(!photoViewerOpen())openDirectReceiptViewer(photo);},160);
      return;
    }
    const owner=graphOwner(event.target);
    if(owner){
      event.preventDefault(); event.stopImmediatePropagation();
      if(Date.now()>suppressGraphClickUntil) openTip(owner);
      return;
    }
    // Un clic fuera del globo retira la información.
    const tip=$('ceTooltipV21');
    if(tip?.dataset?.ceStableFix6==='1'&&!tip.contains(event.target)&&!suspendedTip) closeTip();
  },true);
  root.addEventListener('resize',()=>{if($('ceTooltipV21')&&!suspendedTip)closeTip();},true);
  root.addEventListener('scroll',event=>{if($('ceTooltipV21')&&!suspendedTip&&!event.target?.closest?.('#ceTooltipV21'))scheduleTipClose(80);},true);
  document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;if(document.getElementById('ceV25GraphReceiptViewer')){event.preventDefault();closeDirectReceiptViewer();return;}if(suspendedTip&&photoViewerOpen())return;if($('ceTooltipV21')?.dataset?.ceStableFix6==='1'){event.preventDefault();closeTip();}},true);
  document.addEventListener('change',event=>{if(event.target?.id==='selectedEvent'){closeTip();document.body.classList.remove('ce-v25-graph-tip-open');}},true);
  root.addEventListener('pagehide',()=>{closeTip();document.body.classList.remove('ce-v25-graph-tip-open');});
  const viewerObserver=new MutationObserver(()=>{
    if(!suspendedTip) return;
    if(photoViewerOpen()){viewerSeen=true;return;}
    if(viewerSeen&&Date.now()-suspendedAt>220)setTimeout(resumeTipAfterPhoto,50);
  });
  viewerObserver.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
  setInterval(()=>{removeBackdropIfClosed();if(suspendedTip&&viewerSeen&&!photoViewerOpen())resumeTipAfterPhoto();},900);
  root.ControlEventStableGraphTipFix6={open:openTip,close:closeTip};
})(window);
