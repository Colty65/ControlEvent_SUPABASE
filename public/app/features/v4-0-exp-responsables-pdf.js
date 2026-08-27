/* ControlEvent v4_0_exp BANK4.2 · informes por responsable con situación real de compras y donaciones. */
(function(root){
  'use strict';
  if(root.__ceV4ResponsablesPdf) return; root.__ceV4ResponsablesPdf=true;
  const $=id=>document.getElementById(id),txt=v=>String(v==null?'':v).trim();
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0;};
  const money=v=>num(v).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
  const state=()=>root.ControlEventApp?.state||root.state||root.appState||root.__CONTROL_EVENT_STATE__||{};
  const rows=name=>Array.isArray(state()?.[name])?state()[name]:[];
  const activeEventId=()=>txt($('selectedEvent')?.value||state().selectedEventId||state().eventoSeleccionadoId);
  const byId=(name,id)=>rows(name).find(x=>txt(x?.id||x?.ID)===txt(id))||null;
  const person=id=>byId('personas',id),product=id=>byId('productos',id),store=id=>byId('tiendas',id);
  const event=()=>byId('eventos',activeEventId())||rows('events').find(x=>txt(x?.id)===activeEventId())||{};
  const eventTitle=()=>txt(event()?.titulo||event()?.descripcion||event()?.nombre||'Evento seleccionado');
  const ticketOf=row=>txt(row?.ticketDonacion||row?.ticket_donacion||row?.ticket||'');
  const isDonation=v=>/^DONADO\s+(TIENDA|SOCIO|OTROS)$/i.test(txt(v));
  const isPendingPurchase=v=>!txt(v) || /PTE\.?\s*COMPRA|PENDIENTE/i.test(txt(v));
  const isCurrentExpense=v=>/^GASTOS?\s+CORRIENTES?$/i.test(txt(v));
  function donationStatus(row){
    const raw=txt(row?.donacionSituacion||row?.donacion_situacion).toLowerCase();
    if(raw==='supuesta')return 'Supuesta';
    if(raw==='entregada')return 'Entregada';
    if(raw==='comprometida')return 'Comprometida';
    if(row&&(row.donacionEntregada||row.entregadoDonacion||row.entregado===true||/^s[ií]$/i.test(txt(row.entregado))))return 'Entregada';
    return 'Comprometida';
  }
  function purchaseStatus(row){
    const tk=ticketOf(row);
    if(isPendingPurchase(tk))return 'Pte.Compra u otros gastos';
    if(isCurrentExpense(tk))return 'Comprado · GASTOS CORRIENTES';
    return `Comprado · ${tk}`;
  }
  function donorName(ref){
    const raw=txt(ref);if(!raw)return '';
    const m=raw.match(/^([PT])\s*[:\-]\s*(.+)$/i);if(!m)return raw;
    return m[1].toUpperCase()==='P'?txt(person(m[2])?.nombre)||raw:txt(store(m[2])?.nombre)||raw;
  }
  function allPurchaseRows(){
    const ev=activeEventId();let all=[];
    try{if(typeof root.comprasForEvent==='function')all=root.comprasForEvent().slice();}catch(_){all=[];}
    if(!all.length)all=rows('compras').filter(r=>txt(r.eventId||r.event_id)===ev);
    return all;
  }
  function sourceRows(kind){
    return allPurchaseRows().filter(r=>kind==='donacion'?isDonation(ticketOf(r)):!isDonation(ticketOf(r)));
  }
  function rowAmount(row){
    const p=product(row.productoId||row.producto_id)||row.producto||{};
    const units=num(row.unidades);
    const price=num(row.precio??row.precioCalc??row.precio_calc??p.precio??p.defaultPrecio);
    return {units,price,amount:units*price};
  }
  function enrich(row,kind){
    const p=product(row.productoId||row.producto_id)||row.producto||{};
    const s=store(row.tiendaId||row.tienda_id||p.tiendaId||p.tienda_id)||row.tienda||{};
    const resp=person(row.responsableId||row.responsable_id)||row.responsable||{};
    const {units,price,amount}=rowAmount(row);
    const donor=donorName(row.donorRef||row.donor_ref||row.donante||'');
    return {
      id:txt(row.id),
      responsable:txt(resp.nombre)||'Sin responsable',
      tienda:kind==='donacion'?(donor||txt(s.nombre)||'Sin origen'):txt(s.nombre)||'Sin tienda',
      producto:txt(p.nombre)||txt(row.producto)||'Producto',
      unidades:units,precio:price,importe:amount,ticket:ticketOf(row),
      situacion:kind==='donacion'?donationStatus(row):purchaseStatus(row)
    };
  }
  const donationOrder=s=>s==='Comprometida'?0:s==='Supuesta'?1:2;
  const purchaseOrder=s=>/^Pte\./i.test(s)?0:1;
  function sortLines(list,kind){
    return list.sort((a,b)=>{
      if(kind==='donacion'){
        return donationOrder(a.situacion)-donationOrder(b.situacion)
          ||a.producto.localeCompare(b.producto,'es',{sensitivity:'base'})
          ||a.tienda.localeCompare(b.tienda,'es',{sensitivity:'base'});
      }
      return a.tienda.localeCompare(b.tienda,'es',{sensitivity:'base'})
        ||purchaseOrder(a.situacion)-purchaseOrder(b.situacion)
        ||a.ticket.localeCompare(b.ticket,'es',{numeric:true,sensitivity:'base'})
        ||a.producto.localeCompare(b.producto,'es',{sensitivity:'base'});
    });
  }
  function grouped(kind){
    const map=new Map();
    for(const raw of sourceRows(kind)){
      const r=enrich(raw,kind);if(!map.has(r.responsable))map.set(r.responsable,[]);map.get(r.responsable).push(r);
    }
    return [...map.entries()].map(([name,list])=>({name,rows:sortLines(list,kind),total:list.reduce((s,r)=>s+r.importe,0)})).sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'}));
  }
  function combinedGroups(){
    const purchases=grouped('compra'),donations=grouped('donacion'),map=new Map();
    const take=name=>{if(!map.has(name))map.set(name,{name,purchases:[],donations:[],purchaseTotal:0,donationTotal:0});return map.get(name);};
    purchases.forEach(g=>{const x=take(g.name);x.purchases=g.rows;x.purchaseTotal=g.total;});
    donations.forEach(g=>{const x=take(g.name);x.donations=g.rows;x.donationTotal=g.total;});
    return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'}));
  }
  function globalSummary(){
    const purchases=sourceRows('compra'),donations=sourceRows('donacion');
    const purchaseAmount=r=>rowAmount(r).amount;
    const realised=purchases.filter(r=>!isPendingPurchase(ticketOf(r)));
    const pending=purchases.filter(r=>isPendingPurchase(ticketOf(r)));
    const d={Supuesta:0,Comprometida:0,Entregada:0};
    donations.forEach(r=>{d[donationStatus(r)]+=rowAmount(r).amount;});
    return {
      purchaseRealised:realised.reduce((s,r)=>s+purchaseAmount(r),0),
      purchasePending:pending.reduce((s,r)=>s+purchaseAmount(r),0),
      purchaseTotal:purchases.reduce((s,r)=>s+purchaseAmount(r),0),
      donationSupposed:d.Supuesta,donationCommitted:d.Comprometida,donationDelivered:d.Entregada,
      donationTotal:d.Supuesta+d.Comprometida+d.Entregada
    };
  }
  function summaryHtml(kind){
    const s=globalSummary();
    const purchase=`<div class="ce-resp-summary-block"><div><span>Compras realizadas</span><b>${esc(money(s.purchaseRealised))}</b></div><div><span>Compras pendientes</span><b>${esc(money(s.purchasePending))}</b></div><div class="total"><span>TOTAL GENERAL COMPRAS</span><b>${esc(money(s.purchaseTotal))}</b></div></div>`;
    const donation=`<div class="ce-resp-summary-block donation"><div><span>Donaciones Supuestas</span><b>${esc(money(s.donationSupposed))}</b></div><div><span>Donaciones Comprometidas</span><b>${esc(money(s.donationCommitted))}</b></div><div><span>Donaciones Entregadas</span><b>${esc(money(s.donationDelivered))}</b></div><div class="total"><span>TOTAL GENERAL DONACIONES</span><b>${esc(money(s.donationTotal))}</b></div></div>`;
    return `<div class="ce-resp-header-summary">${kind==='compra'?purchase:kind==='donacion'?donation:purchase+donation}</div>`;
  }
  function printableSummary(kind){
    const s=globalSummary();
    const p=`<div class="sumblock"><p><span>Compras realizadas</span><b>${esc(money(s.purchaseRealised))}</b></p><p><span>Compras pendientes</span><b>${esc(money(s.purchasePending))}</b></p><p class="tot"><span>TOTAL GENERAL COMPRAS</span><b>${esc(money(s.purchaseTotal))}</b></p></div>`;
    const d=`<div class="sumblock don"><p><span>Donaciones Supuestas</span><b>${esc(money(s.donationSupposed))}</b></p><p><span>Donaciones Comprometidas</span><b>${esc(money(s.donationCommitted))}</b></p><p><span>Donaciones Entregadas</span><b>${esc(money(s.donationDelivered))}</b></p><p class="tot"><span>TOTAL GENERAL DONACIONES</span><b>${esc(money(s.donationTotal))}</b></p></div>`;
    return `<div class="print-summary">${kind==='compra'?p:kind==='donacion'?d:p+d}</div>`;
  }
  function ensureStyle(){
    if($('ceRespReportStyle'))return;const st=document.createElement('style');st.id='ceRespReportStyle';st.textContent=`
    .ce-resp-report-overlay{position:fixed;inset:0;z-index:1000100;background:rgba(5,20,34,.62);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:10px}.ce-resp-report-card{width:min(1580px,99vw);height:min(940px,97dvh);display:flex;flex-direction:column;background:#f7fbfd;border:1px solid rgba(255,255,255,.72);border-radius:24px;box-shadow:0 30px 90px rgba(3,18,32,.38);overflow:hidden}.ce-resp-report-card>header{display:flex;align-items:center;gap:12px;padding:12px 15px;background:linear-gradient(105deg,#0b293f,#125477);color:#fff}.ce-resp-report-card>header .ico{width:46px;height:46px;display:grid;place-items:center;border-radius:14px;background:rgba(255,255,255,.12);font-size:24px;flex:none}.ce-resp-report-card>header .copy{min-width:220px;flex:1}.ce-resp-report-card>header .copy span{display:block;color:#82e1c2;font-size:8px;font-weight:950;letter-spacing:.13em}.ce-resp-report-card>header h3{margin:3px 0 0;font-size:18px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ce-resp-report-card>header p{margin:3px 0 0;color:#d5e7f0;font-size:10px}.ce-resp-header-summary{display:flex;align-items:stretch;justify-content:flex-end;gap:9px;flex:2}.ce-resp-summary-block{min-width:255px;padding:7px 9px;border:1px solid rgba(255,255,255,.18);border-radius:11px;background:rgba(255,255,255,.07)}.ce-resp-summary-block>div{display:flex;gap:12px;align-items:center;justify-content:space-between;font-size:9px;line-height:1.4}.ce-resp-summary-block span{color:#dcecf4;font-weight:800}.ce-resp-summary-block b{white-space:nowrap;color:#fff;font-size:10px}.ce-resp-summary-block .total{margin-top:3px;padding-top:3px;border-top:1px solid rgba(255,255,255,.2)}.ce-resp-summary-block .total span,.ce-resp-summary-block .total b{color:#83e6c3;font-weight:1000}.ce-resp-summary-block.donation .total span,.ce-resp-summary-block.donation .total b{color:#ffd18a}.ce-resp-report-card>header button{border:1px solid rgba(255,255,255,.34);border-radius:12px;background:rgba(255,255,255,.1);color:#fff;font-weight:900;cursor:pointer;flex:none}.ce-resp-report-card>header .pdf-all{padding:10px 12px;font-size:10px}.ce-resp-report-card>header .close{width:40px;height:40px;font-size:24px}.ce-resp-report-body{flex:1;min-height:0;overflow:auto;padding:12px}.ce-resp-group{margin:0 0 10px;border:1px solid #d8e6ed;border-radius:17px;background:#fff;overflow:hidden}.ce-resp-group-head{display:flex;align-items:center;gap:10px;padding:10px 12px;background:#edf6fa}.ce-resp-group-head strong{flex:1;color:#173a63;font-size:14px;font-weight:950}.ce-resp-group-head b{color:#0e7656;font-size:15px}.ce-resp-group-head .totals{display:flex;gap:12px;align-items:center;color:#496b7f;font-size:10px;font-weight:900}.ce-resp-group-head .totals b{font-size:12px}.ce-resp-group-head button{border:1px solid #b8d3e2;border-radius:999px;background:#fff;color:#1c5576;padding:5px 10px;font-size:9px;font-weight:950;cursor:pointer}.ce-resp-subhead{display:flex;align-items:center;justify-content:space-between;padding:7px 10px 5px;color:#173a63;font-size:10px;font-weight:1000;letter-spacing:.04em;text-transform:uppercase}.ce-resp-subhead.donation{color:#9a5d0c}.ce-resp-combined-gap{height:14px;background:#f7fbfd;border-top:1px solid #e4edf2;border-bottom:1px solid #e4edf2}.ce-resp-table{width:100%;border-collapse:collapse}.ce-resp-table th{padding:6px 8px;background:#f8fbfd;color:#718596;font-size:8px;font-weight:950;text-transform:uppercase;letter-spacing:.07em;text-align:left;border-bottom:1px solid #e2ebf0}.ce-resp-table td{padding:7px 8px;color:#344b5c;font-size:11px;border-bottom:1px solid #eef3f6}.ce-resp-table tr:last-child td{border-bottom:0}.ce-resp-table .num{text-align:right;white-space:nowrap}.ce-resp-status{white-space:nowrap;font-weight:950}.ce-resp-status.pending{color:#b16a00}.ce-resp-status.done{color:#087f5b}.ce-resp-status.supposed{color:#6d5b93}.ce-resp-status.committed{color:#b16a00}.ce-resp-status.delivered{color:#087f5b}.ce-resp-empty,.ce-resp-subempty{padding:50px;text-align:center;color:#607789;font-weight:850}.ce-resp-subempty{padding:10px;font-size:10px;background:#fafcfd}.ce-resp-launch{margin-left:auto!important;white-space:nowrap!important}.ce-resp-launch span{margin-right:5px}.ce-resp-map-launch,.ce-v19-resp-report{border:1px solid #bfd5df!important;border-radius:999px!important;background:#fff!important;color:#1b5875!important;padding:8px 12px!important;font-size:10px!important;font-weight:950!important;cursor:pointer!important;white-space:nowrap!important;pointer-events:auto!important;opacity:1!important}.ce-v19-resp-report{margin-left:auto!important}.ce-resp-map-launch{margin-left:0!important}
    @media(max-width:1050px){.ce-resp-report-card>header{flex-wrap:wrap}.ce-resp-header-summary{order:4;width:100%;flex-basis:100%}.ce-resp-summary-block{flex:1}.ce-resp-report-card>header .copy{flex:1}.ce-resp-report-card>header .pdf-all{margin-left:auto}}
    @media(max-width:760px){.ce-resp-report-overlay{padding:0}.ce-resp-report-card{width:100vw;height:100dvh;border-radius:0}.ce-resp-report-card>header{padding:9px}.ce-resp-report-card>header .pdf-all{display:none}.ce-resp-summary-block{min-width:0}.ce-resp-header-summary{overflow:auto}.ce-resp-group{overflow:auto}.ce-resp-table{min-width:850px}.ce-resp-launch{font-size:0!important;padding:8px!important}.ce-resp-launch span{font-size:16px!important;margin:0!important}.ce-resp-map-launch,.ce-v19-resp-report{font-size:0!important;padding:8px!important}.ce-resp-map-launch span,.ce-v19-resp-report span{font-size:16px!important}}`;
    document.head.appendChild(st);
  }
  function statusClass(r,kind){
    if(kind==='compra')return purchaseOrder(r.situacion)===0?'pending':'done';
    return r.situacion==='Supuesta'?'supposed':r.situacion==='Entregada'?'delivered':'committed';
  }
  function tableHtmlRows(list,kind){
    const label=kind==='donacion'?'Origen / donante':'Tienda';
    if(!list.length)return `<div class="ce-resp-subempty">Sin ${kind==='donacion'?'donaciones':'compras'} asignadas.</div>`;
    return `<table class="ce-resp-table"><thead><tr><th>${label}</th><th>Producto</th><th>Situación</th><th class="num">Uds.</th><th class="num">Precio</th><th class="num">${kind==='donacion'?'Valor estimado':'Importe'}</th></tr></thead><tbody>${list.map(r=>`<tr><td>${esc(r.tienda)}</td><td>${esc(r.producto)}</td><td class="ce-resp-status ${statusClass(r,kind)}">${esc(r.situacion)}</td><td class="num">${esc(r.unidades.toLocaleString('es-ES'))}</td><td class="num">${esc(money(r.precio))}</td><td class="num">${esc(money(r.importe))}</td></tr>`).join('')}</tbody></table>`;
  }
  function tableHtml(group,kind){return tableHtmlRows(group.rows,kind);}
  function combinedHtml(group){
    return `<div class="ce-resp-subhead"><span>Compras · Tienda + Producto · Situación</span><b>${esc(money(group.purchaseTotal))}</b></div>${tableHtmlRows(group.purchases,'compra')}<div class="ce-resp-combined-gap"></div><div class="ce-resp-subhead donation"><span>Donaciones · Producto · Situación</span><b>${esc(money(group.donationTotal))}</b></div>${tableHtmlRows(group.donations,'donacion')}`;
  }
  function openReport(kind){
    closeReport();ensureStyle();const combined=kind==='combinado';const groups=combined?combinedGroups():grouped(kind),modal=document.createElement('div');modal.id='ceRespReportOverlay';modal.className='ce-resp-report-overlay';
    const title=combined?'Compras + Donaciones por responsable':kind==='donacion'?'Donaciones por responsable':'Compras por responsable';
    const count=combined?groups.reduce((s,g)=>s+g.purchases.length+g.donations.length,0):groups.reduce((s,g)=>s+g.rows.length,0);
    const body=groups.length?groups.map((g,i)=>`<section class="ce-resp-group"><div class="ce-resp-group-head"><strong>${esc(g.name)}</strong>${combined?`<span class="totals">Compras <b>${esc(money(g.purchaseTotal))}</b> · Donaciones <b>${esc(money(g.donationTotal))}</b></span>`:`<b>${esc(money(g.total))}</b>`}<button type="button" data-ce-resp-pdf="${i}">PDF</button></div>${combined?combinedHtml(g):tableHtml(g,kind)}</section>`).join(''):`<div class="ce-resp-empty">No hay datos para este evento.</div>`;
    modal.innerHTML=`<section class="ce-resp-report-card" role="dialog" aria-modal="true"><header><div class="ico">${combined?'🧭':kind==='donacion'?'🎁':'🛒'}</div><div class="copy"><span>CONTROL EVENT · ${combined?'RECURSOS POR RESPONSABLE':kind==='donacion'?'DONACIONES Y ENTREGA':'COMPRAS Y SITUACIÓN'}</span><h3>${esc(title)} · ${esc(eventTitle())}</h3><p>${groups.length} responsable${groups.length===1?'':'s'} · ${count} línea${count===1?'':'s'} · todos los registros del evento</p></div>${summaryHtml(kind)}<button type="button" class="pdf-all" data-ce-resp-pdf-all>🖨 PDF todos</button><button type="button" class="close" data-ce-resp-close>×</button></header><div class="ce-resp-report-body">${body}</div></section>`;
    document.body.appendChild(modal);modal.__ceKind=kind;modal.__ceGroups=groups;
  }
  function closeReport(){const m=$('ceRespReportOverlay');if(m)m.remove();}
  function printableRows(list,kind){
    if(!list.length)return `<p class="empty">Sin ${kind==='donacion'?'donaciones':'compras'} asignadas.</p>`;
    return `<table><thead><tr><th>${kind==='donacion'?'Origen / donante':'Tienda'}</th><th>Producto</th><th>Situación</th><th>Uds.</th><th>Precio</th><th>${kind==='donacion'?'Valor estimado':'Importe'}</th></tr></thead><tbody>${list.map(r=>`<tr><td>${esc(r.tienda)}</td><td>${esc(r.producto)}</td><td><b>${esc(r.situacion)}</b></td><td class="num">${esc(r.unidades.toLocaleString('es-ES'))}</td><td class="num">${esc(money(r.precio))}</td><td class="num">${esc(money(r.importe))}</td></tr>`).join('')}</tbody></table>`;
  }
  function printable(groups,kind){
    if(kind==='combinado')return groups.map(g=>`<section class="group"><h2>${esc(g.name)} <span>Compras ${esc(money(g.purchaseTotal))} · Donaciones ${esc(money(g.donationTotal))}</span></h2><h3>Compras · tienda + situación + producto</h3>${printableRows(g.purchases,'compra')}<div class="gap"></div><h3 class="don">Donaciones · Producto · Situación · valor estimado</h3>${printableRows(g.donations,'donacion')}</section>`).join('');
    return groups.map(g=>`<section class="group"><h2>${esc(g.name)} <span>${esc(money(g.total))}</span></h2>${printableRows(g.rows,kind)}</section>`).join('');
  }
  function printGroups(groups,kind){
    if(!groups.length)return;const win=root.open('','_blank');if(!win)return alert('El navegador ha bloqueado la ventana de impresión.');try{win.opener=null;}catch(_){ }
    const label=kind==='combinado'?'Recursos':kind==='donacion'?'Donaciones':'Compras';
    const title=`ControlEvent_v4_0_exp-${label}-${eventTitle()}`.replace(/[\\/:*?"<>|]+/g,'-');
    const note=kind==='donacion'||kind==='combinado'?'<p class="note">Los importes de Donaciones corresponden a valoración estimada. Entregada significa género ya recibido en los almacenes de la peña.</p>':'';
    const h1=kind==='combinado'?'Compras + Donaciones por responsable':kind==='donacion'?'Donaciones por responsable':'Compras por responsable';
    win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(title)}</title><style>@page{size:A4 landscape;margin:8mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#243847;margin:0}header{border-bottom:3px solid #0f766e;padding:0 0 8px;margin-bottom:10px}.headrow{display:flex;gap:14px;align-items:flex-start}.headcopy{flex:1}h1{font-size:18px;margin:0;color:#173a63}header p,.note{font-size:9px;color:#607789;margin:4px 0}.print-summary{display:flex;gap:8px;justify-content:flex-end}.sumblock{min-width:220px;border:1px solid #ccdce5;border-radius:7px;padding:5px 7px}.sumblock p{display:flex;justify-content:space-between;gap:10px;margin:0;font-size:8px;line-height:1.5}.sumblock .tot{border-top:1px solid #dce7ed;margin-top:2px;padding-top:2px;color:#0f766e}.sumblock.don .tot{color:#9a5d0c}.group{break-inside:avoid;margin:0 0 12px}.group h2{display:flex;justify-content:space-between;margin:0;padding:6px 8px;background:#edf6fa;color:#173a63;font-size:12px}.group h2 span{color:#0f766e}.group h3{margin:6px 0 3px;font-size:9px;color:#173a63;text-transform:uppercase}.group h3.don{color:#9a5d0c}.gap{height:8px}table{width:100%;border-collapse:collapse;font-size:8px}th,td{padding:4px 5px;border-bottom:1px solid #dfe8ee;text-align:left}th{background:#f8fafc;text-transform:uppercase;font-size:7px;color:#64748b}.num{text-align:right;white-space:nowrap}.empty{font-size:8px;color:#7a8b97}</style></head><body><header><div class="headrow"><div class="headcopy"><h1>${esc(h1)} · ${esc(eventTitle())}</h1><p>ControlEvent v4_0_exp · ${new Date().toLocaleString('es-ES')}</p>${note}</div>${printableSummary(kind)}</div></header>${printable(groups,kind)}<script>window.onload=function(){setTimeout(function(){window.focus();window.print()},220)}<\/script></body></html>`);win.document.close();
  }
  function buttonKind(btn){
    if(!btn)return null;
    if(btn.id==='btnComprasResponsables')return 'compra';
    if(btn.id==='btnDonacionesResponsables')return 'donacion';
    if(btn.id==='btnMapaResponsables'||btn.id==='btnVistaAereaResponsables')return 'combinado';
    return null;
  }
  function hardEnable(btn){
    if(!btn)return;
    btn.disabled=false;btn.removeAttribute('disabled');btn.removeAttribute('aria-disabled');btn.style.setProperty('pointer-events','auto','important');btn.style.setProperty('opacity','1','important');
    const kind=buttonKind(btn);if(!kind||btn.__ceRespDirectBound)return;btn.__ceRespDirectBound=true;
    let lastRun=0;
    const run=ev=>{try{ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();}catch(_){ }const now=Date.now();if(now-lastRun<350)return false;lastRun=now;openReport(kind);return false;};
    btn.addEventListener('click',run,true);btn.addEventListener('pointerup',run,true);btn.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){run(ev);}},true);btn.onclick=run;
  }
  function ensureEntryButtons(){
    ensureStyle();
    const mapHead=document.querySelector('#tabMapaProductos .section-title');
    if(mapHead&&!$('btnMapaResponsables')){
      const btn=document.createElement('button');btn.type='button';btn.id='btnMapaResponsables';btn.className='ce-resp-map-launch';btn.title='Compras y donaciones agrupadas por responsable';btn.innerHTML='<span>👥</span> Responsables / PDF';
      const spacer=mapHead.querySelector('.ce-v19-map-head-spacer');if(spacer)mapHead.insertBefore(btn,spacer);else mapHead.appendChild(btn);
    }
    document.querySelectorAll('#btnComprasResponsables,#btnDonacionesResponsables,#btnMapaResponsables,#btnVistaAereaResponsables').forEach(hardEnable);
  }
  function bind(){
    document.addEventListener('click',ev=>{
      const c=ev.target?.closest?.('[data-ce-resp-close]');if(c){ev.preventDefault();closeReport();return;}
      if(ev.target?.id==='ceRespReportOverlay'){closeReport();return;}
      const all=ev.target?.closest?.('[data-ce-resp-pdf-all]');if(all){const m=$('ceRespReportOverlay');printGroups(m?.__ceGroups||[],m?.__ceKind||'compra');return;}
      const one=ev.target?.closest?.('[data-ce-resp-pdf]');if(one){const m=$('ceRespReportOverlay'),g=m?.__ceGroups?.[Number(one.dataset.ceRespPdf)];if(g)printGroups([g],m.__ceKind||'compra');return;}
    },true);
    document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&$('ceRespReportOverlay'))closeReport();});
    let timer=0;const obs=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(ensureEntryButtons,40);});obs.observe(document.documentElement,{childList:true,subtree:true});
    ['controlevent:runtime-ready','controlevent:app-ready','controlevent:event-ready','controlevent:event-loaded','controlevent:module-mounted'].forEach(n=>root.addEventListener(n,ensureEntryButtons));
    [0,120,500,1200,2500].forEach(ms=>setTimeout(ensureEntryButtons,ms));
  }
  root.ceOpenResponsablesReport=openReport;
  root.ControlEventResponsablesReport={open:openReport,summary:globalSummary,version:'v4_0_exp-BANK4.2'};
  ensureStyle();bind();
})(window);
