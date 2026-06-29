(function(){
  'use strict';
  if(window.__ceV15Hotfix10ResumenPlanSuavizado) return;
  window.__ceV15Hotfix10ResumenPlanSuavizado = true;
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function st(){ try{return window.ControlEventApp?.state || window.state || {};}catch(_){return{};} }
  function arr(k){ const v=st()[k]; return Array.isArray(v)?v:[]; }
  function evId(){ return String(st().selectedEventId || $('selectedEvent')?.value || ''); }
  function money(v){ try{ if(typeof window.money==='function') return window.money(Number(v||0)); }catch(_){} return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0)); }
  function num(v){ try{return new Intl.NumberFormat('es-ES',{maximumFractionDigits:2}).format(Number(v||0));}catch(_){return String(v||0);} }
  function byId(list,id){ return arr(list).find(x=>String(x?.id||'')===String(id||'')) || {}; }
  function isDon(t){ return /^DONADO/i.test(norm(t)); }
  function isCurr(t){ const u=up(t); return u==='GASTOS CORRIENTES' || u.includes('GASTOS CORRIENTES'); }
  function productName(c){ return c?.producto?.nombre || byId('productos',c?.productoId)?.nombre || c?.productName || 'Producto'; }
  function storeName(c){ return c?.tienda?.nombre || byId('tiendas',c?.tiendaId)?.nombre || 'Sin tienda'; }
  function personName(id){ return byId('personas',id)?.nombre || ''; }
  function donorName(c){ const ref=norm(c?.donorRef); if(ref.startsWith('P:')) return personName(ref.slice(2)) || 'Sin donante'; if(ref.startsWith('T:')) return byId('tiendas',ref.slice(2))?.nombre || 'Sin donante'; return ref || 'Sin donante'; }
  function units(c){ return Number(c?.unidades ?? c?.uds ?? 0); }
  function price(c){ return Number(c?.precio ?? c?.precioUnitario ?? byId('productos',c?.productoId)?.defaultPrecio ?? 0); }
  function value(c){ return units(c)*price(c); }
  function imageValue(v){ if(!v) return ''; if(typeof v==='string') return v; if(typeof v==='object') return v.url||v.public_url||v.publicUrl||v.path||v.pathname||v.storage_path||v.dataUrl||v.base64||''; return ''; }
  function ticketToken(label){ const s=up(label); const m=s.match(/\bTK\d{1,2}\b/); return m?m[0]:''; }
  function imageRefFor(label){
    const id=evId(); const tk=ticketToken(label); if(!tk) return '';
    const bags=[st().ticketImages||{}, st().ticketImageRefs||{}, st().ticketImagesByKey||{}];
    for(const bag of bags){ for(const [k,v] of Object.entries(bag||{})){ const ks=String(k); if(id && ks.includes('|') && !ks.startsWith(id+'|')) continue; const u=up(ks); if(u.includes(tk)){ const img=imageValue(v); if(img) return img; } } }
    return '';
  }
  function linePurchase(c, first){ return [first, storeName(c), productName(c), num(units(c)), money(price(c)), money(value(c))]; }
  function sortSummaryDetailLines(lines, donated){
    return (Array.isArray(lines)?lines.slice():[]).filter(line=>!/^TOTAL\b/i.test(norm(Array.isArray(line)?line[0]:line))).sort((a,b)=>{
      const aa=Array.isArray(a)?a:String(a||'').split('|').map(x=>norm(x));
      const bb=Array.isArray(b)?b:String(b||'').split('|').map(x=>norm(x));
      if(donated) return up(aa[0]||'').localeCompare(up(bb[0]||''),'es') || up(aa[1]||'').localeCompare(up(bb[1]||''),'es');
      return up(aa[0]||'').localeCompare(up(bb[0]||''),'es') || up(aa[2]||'').localeCompare(up(bb[2]||''),'es') || up(aa[1]||'').localeCompare(up(bb[1]||''),'es');
    });
  }
  function summaryTotalLine(row,cols){
    const out=new Array(Math.max(1,Number(cols||0))).fill('');
    const parts=String(row?.key||'').split('|').map(x=>norm(x)).filter(Boolean);
    const group=row?.donated?(parts[0]||'DONANTE'):(parts[1]||'Pte. Compra');
    out[0]='TOTAL '+group; out[out.length-1]=money(row?.v||0); return out;
  }
  function lineDonation(c){ return [donorName(c), productName(c), num(units(c)), money(price(c)), money(value(c))]; }
  function rowsForSummary(){
    const filled=new Map(), pending=new Map();
    arr('compras').filter(c=>String(c?.eventId||'')===evId()).forEach(c=>{
      const tk=norm(c.ticketDonacion); const donated=isDon(tk); const v=value(c);
      if(!donated && (!tk || isCurr(tk))){
        const key=`${storeName(c)} | Pte. Compra u otros gastos`;
        if(!pending.has(key)) pending.set(key,{key,label:key,v:0,pending:true,donated:false,attachable:false,lines:[],headers:['Ticket/Otros gastos','Tienda','Producto','Uds','Precio','Total']});
        const r=pending.get(key); r.v+=v; r.lines.push(linePurchase(c,tk||'PTE.COMPRA')); return;
      }
      const holder=donated?donorName(c):storeName(c);
      const key=`${holder} | ${tk || 'Pte. Compra u otros gastos'}`;
      if(!filled.has(key)) filled.set(key,{key,label:key,v:0,pending:false,donated,attachable:!donated && !isCurr(tk),rawTicket:tk,lines:[],headers: donated?['Donante','Producto','Uds','Precio estimado','Valor estimado']:['Ticket/Otros gastos','Tienda','Producto','Uds','Precio','Total']});
      const r=filled.get(key); r.v+=v; r.lines.push(donated?lineDonation(c):linePurchase(c,tk||'PTE.COMPRA'));
    });
    const rows=[...filled.values(),...pending.values()];
    const mode=st().summaryTiendaSort||'tienda';
    rows.sort((a,b)=>{ const [a1='',a2='']=String(a.key).split(' | '); const [b1='',b2='']=String(b.key).split(' | '); return mode==='ticket' ? (a2.localeCompare(b2,'es')||a1.localeCompare(b1,'es')) : (a1.localeCompare(b1,'es')||a2.localeCompare(b2,'es')); });
    return rows.map(r=>({...r,lines:sortSummaryDetailLines(r.lines,r.donated),image:r.attachable?imageRefFor(r.key):''}));
  }

  function tipForRow(row){
    const heads = row.headers || [];
    const lines = Array.isArray(row.lines) ? row.lines : [];
    const out = [];
    out.push(row.donated ? 'CÁLCULOS POR DONANTE Y DONACIÓN' : (row.pending ? 'PENDIENTE DE COMPRA U OTROS GASTOS' : 'CÁLCULOS POR TIENDA Y TICKET'));
    out.push(row.key || '');
    out.push('TOTAL | ' + money(row.v || 0));
    out.push('');
    if(heads.length) out.push(heads.join(' | '));
    lines.forEach(line => out.push((line || []).join(' | ')));
    return out.join('\n');
  }
  function showTable(row){
    document.querySelectorAll('.ce-hf10-modal').forEach(x=>x.remove());
    const title=row.donated?'CÁLCULOS POR DONANTE Y DONACIÓN':(row.pending?'PENDIENTE DE COMPRA U OTROS GASTOS':'CÁLCULOS POR TIENDA Y TICKET');
    const heads=row.headers||[];
    const sortedLines=sortSummaryDetailLines(row.lines,row.donated);
    const tableLines=sortedLines.length?sortedLines.concat([summaryTotalLine(row,heads.length)]):[];
    const htmlRows=tableLines.map(line=>`<tr>${line.map(x=>`<td>${esc(x)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${heads.length||1}">Sin detalle</td></tr>`;
    const modal=document.createElement('div'); modal.className='ce-hf10-modal';
    modal.innerHTML=`<div class="ce-hf10-card" role="dialog" aria-modal="true"><div class="ce-hf10-head"><div><h3>${esc(title)}</h3><p>${esc(row.key)}</p></div><button type="button" class="ce-hf10-close" data-ce-hf10-close="1" aria-label="Cerrar">×</button></div><div class="ce-hf10-total"><span>${esc(row.donated?'TOTAL ESTIMADO':'TOTAL')}</span><strong>${esc(money(row.v))}</strong></div><div class="ce-hf10-table-wrap"><table class="ce-hf10-table"><thead><tr>${heads.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${htmlRows}</tbody></table></div></div>`;
    modal.addEventListener('click',e=>{ if(e.target===modal || e.target.closest('[data-ce-hf10-close],.ce-hf10-close')){ e.preventDefault(); e.stopPropagation(); modal.remove(); } }, true);
    document.body.appendChild(modal);
  }
  function renderSummaryTiendaTicket(){
    const root=$('summaryTiendaTicket'); if(!root) return;
    const rows=rowsForSummary();
    const sig=JSON.stringify(rows.map(r=>[r.key,Math.round(r.v*100),r.lines.length,r.image]).concat([[st().summaryTiendaSort||'tienda',evId()]]));
    if(root.dataset.ceHf10Sig===sig && root.querySelector('.ce-hf10-sortbar')) return;
    root.dataset.ceHf10Sig=sig;
    const mode=st().summaryTiendaSort||'tienda';
    root.innerHTML=`<div class="hint ce-hf10-sortbar"><span>Ordenar por:</span><button type="button" class="outline small ${mode==='tienda'?'active':''}" data-hf10-sort="tienda">Tienda</button><button type="button" class="outline small ${mode==='ticket'?'active':''}" data-hf10-sort="ticket">Ticket/Donación/Otros gastos</button></div>`;
    if(!rows.length){ root.insertAdjacentHTML('beforeend','<div class="hint">Sin datos.</div>'); root.classList.add('ce-hf10-ready'); return; }
    let total=0;
    rows.forEach(r=>{ total+=Number(r.v||0); const div=document.createElement('div'); div.className='summary-item ce-hf10-row'+(r.pending?' red-row':'')+(r.donated?' ce-hf10-donation':'');
      const amountStyle=r.pending?' style="background:#fef2f2;color:#b91c1c"':(r.donated?' style="text-decoration:line-through"':'');
      const encoded=encodeURIComponent(r.key||'');
      const rowTip=tipForRow(r);
      div.setAttribute('data-ce-tip-v21', rowTip);
      div.setAttribute('data-ce-tip', rowTip);
      const actions=r.attachable?`<span class="ticket-actions"><button type="button" class="outline small" title="Insertar foto" onclick="uploadTicketImage('${encoded}'); return false;">📎</button>${r.image?`<img class="ticket-thumb" src="${esc(r.image)}" alt="ticket" data-ce-hf12-tk="${esc(r.rawTicket||'')}" data-ce-tip-v21="${esc(rowTip)}" />`:'<span class="hint">Sin imagen</span>'}${r.image?`<button type="button" class="outline small" title="Eliminar foto" onclick="removeTicketImage('${encoded}'); return false;">🗑️</button>`:''}</span>`:'';
      div.innerHTML=`<span class="ce-hf10-label">${esc(r.key)} <i>ⓘ</i></span><span style="display:flex;align-items:center;gap:8px;justify-content:flex-end;"><span class="pill"${amountStyle}>${esc(money(r.v))}</span>${actions}</span>`;
      div.dataset.ceHf12Tk = r.rawTicket || ''; div.addEventListener('click',ev=>{ if(ev.target.closest('button,input,select,a,img')) return; showTable(r); });
      root.appendChild(div);
    });
    root.insertAdjacentHTML('beforeend',`<div class="summary-item" style="font-weight:800"><span>TOTAL EVENTO</span><span class="pill">${esc(money(total))}</span></div>`); root.classList.add('ce-hf10-ready');
    root.querySelectorAll('[data-hf10-sort]').forEach(btn=>btn.addEventListener('click',()=>{ st().summaryTiendaSort=btn.dataset.hf10Sort; root.dataset.ceHf10Sig=''; renderSummaryTiendaTicket(); }));
  }
  function patchGlobals(){
    if(window.__ceHf10PatchedGlobals) return; window.__ceHf10PatchedGlobals=true;
    const prevRender=window.renderSummaryList;
    const wrapped=function(targetId, rows){ if(targetId==='summaryTiendaTicket'){ renderSummaryTiendaTicket(); return; } return typeof prevRender==='function'?prevRender.apply(this,arguments):undefined; };
    try{ window.renderSummaryList=wrapped; renderSummaryList=wrapped; }catch(_){ window.renderSummaryList=wrapped; }
    try{ window.summaryByTiendaTicket=rowsForSummary; summaryByTiendaTicket=rowsForSummary; }catch(_){ window.summaryByTiendaTicket=rowsForSummary; }
  }
  function injectStyle(){
    if($('ceV15Hotfix10Style')) return;
    const css=`
      #summaryTiendaTicket:not(.ce-hf10-ready){visibility:hidden!important;min-height:220px!important}#summaryTiendaTicket .summary-item.ce-hf9-collapsed>span:first-child:after{content:''!important}
      #summaryTiendaTicket .ce-hf10-row{cursor:pointer;min-height:44px!important;transition:none!important}
      #summaryTiendaTicket .ce-hf10-label{display:block;max-width:calc(100% - 130px);white-space:nowrap!important;overflow:hidden;text-overflow:ellipsis;text-align:left!important}
      #summaryTiendaTicket .ce-hf10-label i{font-style:normal;color:#2563eb;font-weight:950;margin-left:5px}
      #summaryTiendaTicket .ce-hf10-sortbar button.active{background:#0f172a!important;color:#fff!important;border-color:#0f172a!important;box-shadow:0 0 0 3px rgba(15,23,42,.14)!important}
      .ce-hf10-modal{position:fixed;inset:0;background:rgba(15,23,42,.38);z-index:7000;display:flex;align-items:center;justify-content:center;padding:14px}.ce-hf10-card{width:min(980px,94vw);max-height:78vh;overflow:auto;background:#fff;border-radius:18px;border:2px solid #0f172a;box-shadow:0 24px 80px rgba(15,23,42,.35);padding:14px}.ce-hf10-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:8px}.ce-hf10-head h3{margin:0;font-size:18px;font-weight:950}.ce-hf10-head p{margin:4px 0 0;font-weight:850;color:#334155}.ce-hf10-head button{border:0;background:#0f172a;color:#fff;border-radius:999px;width:46px;height:46px;font-size:30px;font-weight:950;line-height:1;cursor:pointer;pointer-events:auto!important;z-index:5}.ce-hf10-total{display:flex;justify-content:space-between;gap:12px;align-items:center;background:#e0f2fe;border-radius:12px;padding:8px 10px;margin-bottom:8px;font-weight:950}.ce-hf10-table-wrap{overflow:auto;border:1px solid #dbe4ee;border-radius:12px}.ce-hf10-table{border-collapse:separate;border-spacing:0;width:100%;min-width:680px;font-size:13px}.ce-hf10-table th,.ce-hf10-table td{padding:7px 9px;border-bottom:1px solid #e2e8f0;border-right:1px solid #eef2f7;text-align:left;white-space:nowrap}.ce-hf10-table th{position:sticky;top:0;background:#f1f5f9;font-weight:950;z-index:1}.ce-hf10-table td:nth-last-child(-n+3),.ce-hf10-table th:nth-last-child(-n+3){text-align:right}.ce-hf10-table td:first-child{font-weight:850}
      #budgetLayout .budget-panel.donantes .ce-hf9-av-box{margin-top:8px!important;padding:8px!important;border-width:3px!important;border-radius:16px!important;font-size:10.5px!important;line-height:1.05!important}.ce-hf9-av-title{margin-bottom:4px!important;padding-bottom:4px!important}.ce-hf9-av-title span{font-size:11px!important}.ce-hf9-av-title strong{font-size:10px!important}.ce-hf9-av-row{margin:4px 0!important;padding:5px 6px!important;border-radius:11px!important;display:grid!important;grid-template-columns:minmax(150px,1.2fr) 48px minmax(110px,1fr)!important;gap:5px!important;align-items:center!important}.ce-hf9-av-head{display:contents!important}.ce-hf9-av-head span{font-size:9.5px!important}.ce-hf9-av-head b{width:16px!important;height:16px!important;font-size:9px!important;margin-right:4px!important}.ce-hf9-av-head strong{font-size:12px!important;text-align:right!important}.ce-hf9-av-track{height:8px!important;margin:0!important;grid-column:3!important;grid-row:1!important}.ce-hf9-av-row small{grid-column:1/4!important;font-size:9.5px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ce-hf9-av-row em{grid-column:1/4!important;font-size:9.5px!important;padding:3px 5px!important;margin-top:2px!important}.plan-resource-order-actions button.active,.plan-resource-order-actions button.plan-order-active,.plan-resource-order-actions button.ce-hf10-order-on{background:#0f172a!important;color:#fff!important;border-color:#0f172a!important;box-shadow:0 0 0 3px rgba(15,23,42,.16)!important}
      .mapa-order-actions button{font-weight:900!important;color:#000!important;background:#fff!important;border-color:#cbd5e1!important}.mapa-order-actions button.ce-mapa-sort-active,.mapa-order-actions button.active{background:#217346!important;color:#fff!important;border-color:#217346!important;box-shadow:0 0 0 3px rgba(33,115,70,.18)!important}
      @media(max-width:760px){.ce-hf9-av-row{grid-template-columns:1fr 44px!important}.ce-hf9-av-track{grid-column:1/3!important;grid-row:auto!important}.ce-hf9-av-row small{white-space:normal}.ce-hf10-table{font-size:11px;min-width:620px}}
    `;
    const stl=document.createElement('style'); stl.id='ceV15Hotfix10Style'; stl.textContent=css; document.head.appendChild(stl);
  }
  let orderMode='PRODUCTO';
  function updateOrderButtons(){
    const map={PRODUCTO:'btnPlanOrdenProducto',SEGMENTO_DESTINO:'btnPlanOrdenSegmentoDestino',TIENDA:'btnPlanOrdenTienda'};
    Object.entries(map).forEach(([mode,id])=>{ const b=$(id); if(b) b.classList.toggle('ce-hf10-order-on', mode===orderMode || b.classList.contains('active')); });
  }
  document.addEventListener('click',e=>{ const b=e.target.closest?.('#btnPlanOrdenProducto,#btnPlanOrdenSegmentoDestino,#btnPlanOrdenTienda'); if(b){ orderMode=b.id==='btnPlanOrdenSegmentoDestino'?'SEGMENTO_DESTINO':(b.id==='btnPlanOrdenTienda'?'TIENDA':'PRODUCTO'); setTimeout(updateOrderButtons,30); } },true);
  document.addEventListener('mousedown',e=>{ const sum=e.target.closest?.('.plan-advanced-lines > summary'); if(sum) sum.parentElement.dataset.allowCloseUntil=String(Date.now()+700); },true);
  document.addEventListener('toggle',e=>{ const d=e.target; if(!d?.matches?.('.plan-advanced-lines')) return; if(d.open) return; const until=Number(d.dataset.allowCloseUntil||0); if(Date.now()>until) setTimeout(()=>{ try{ d.open=true; }catch(_){} },0); },true);

  document.addEventListener('click', function(ev){
    const close = ev.target?.closest?.('[data-ce-hf10-close],.ce-hf10-close');
    if(close){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation?.(); document.querySelectorAll('.ce-hf10-modal').forEach(m=>m.remove()); return false; }
    const modal = ev.target?.closest?.('.ce-hf10-modal');
    if(modal && ev.target === modal){ ev.preventDefault(); ev.stopPropagation(); document.querySelectorAll('.ce-hf10-modal').forEach(m=>m.remove()); return false; }
    const img = ev.target?.closest?.('#summaryTiendaTicket img.ticket-thumb');
    if(img){
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation?.();
      const tk = (img.dataset.ceHf12Tk || img.closest('.ce-hf10-row')?.dataset.ceHf12Tk || '').toUpperCase();
      try{ if(tk && window.ControlEventV104?.openTicketDetail) return window.ControlEventV104.openTicketDetail(tk, img.currentSrc||img.src||''); }catch(_){}
      try{ if(tk && window.ControlEventV103?.openTicketDetail) return window.ControlEventV103.openTicketDetail(tk, img.currentSrc||img.src||''); }catch(_){}
      try{ if(tk && window.ControlEventV102?.openTicketDetail) return window.ControlEventV102.openTicketDetail(tk, img.currentSrc||img.src||''); }catch(_){}
      try{ if(window.ControlEventV40ProdPhotos?.openTicket) return window.ControlEventV40ProdPhotos.openTicket(img, ev); }catch(_){}
      return false;
    }
  }, true);
  document.addEventListener('keydown', function(ev){ if(ev.key === 'Escape') document.querySelectorAll('.ce-hf10-modal').forEach(m=>m.remove()); }, true);
  let ceHf10ApplyTimer=0;
  function apply(){ injectStyle(); patchGlobals(); renderSummaryTiendaTicket(); updateOrderButtons(); }
  function scheduleApply(delay){ clearTimeout(ceHf10ApplyTimer); ceHf10ApplyTimer=setTimeout(apply, delay||80); }
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:data-loaded','controlevent:event-changed'].forEach(ev=>window.addEventListener(ev,()=>scheduleApply(ev==='controlevent:event-changed'?180:80),true));
  [0,220,900].forEach(ms=>setTimeout(apply,ms));

  function ceHf12CloseModals(ev){
    const target = ev && ev.target;
    const close = target?.closest?.('[data-ce-hf10-close],.ce-hf10-close,.ce-hf9-modal-head button,.ce-hf10-head button');
    if(close || (target?.classList?.contains?.('ce-hf10-modal'))){
      try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation?.(); }catch(_){}
      document.querySelectorAll('.ce-hf10-modal,.ce-hf9-modal').forEach(m=>m.remove());
      return false;
    }
    return undefined;
  }
  ['pointerdown','mousedown','touchstart','click'].forEach(type=>window.addEventListener(type, ceHf12CloseModals, {capture:true, passive:false}));
  window.addEventListener('keydown', ev=>{ if(ev.key==='Escape') document.querySelectorAll('.ce-hf10-modal,.ce-hf9-modal').forEach(m=>m.remove()); }, true);
  window.addEventListener('controlevent:event-changed',()=>{ try{ const r=$('summaryTiendaTicket'); if(r) r.classList.remove('ce-hf10-ready'); }catch(_){} }, true);
})();
