/* ControlEvent v4_0_exp BANK3 · informes por responsable en Compras/Donaciones. */
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
  const person=id=>byId('personas',id);
  const product=id=>byId('productos',id);
  const store=id=>byId('tiendas',id);
  const event=()=>byId('eventos',activeEventId())||rows('events').find(x=>txt(x?.id)===activeEventId())||{};
  const eventTitle=()=>txt(event()?.titulo||event()?.descripcion||event()?.nombre||'Evento seleccionado');
  const isDonation=v=>/^DONADO\s+(TIENDA|SOCIO|OTROS)$/i.test(txt(v));
  function donorName(ref){
    const raw=txt(ref);if(!raw)return '';
    const m=raw.match(/^([PT])\s*[:\-]\s*(.+)$/i);if(!m)return raw;
    return m[1].toUpperCase()==='P'?txt(person(m[2])?.nombre)||raw:txt(store(m[2])?.nombre)||raw;
  }
  function sourceRows(kind){
    const ev=activeEventId();let all=[];
    try{if(typeof root.comprasForEvent==='function')all=root.comprasForEvent().slice();}catch(_){all=[];}
    if(!all.length)all=rows('compras').filter(r=>txt(r.eventId||r.event_id)===ev);
    return all.filter(r=>kind==='donacion'?isDonation(r.ticketDonacion||r.ticket_donacion):!isDonation(r.ticketDonacion||r.ticket_donacion));
  }
  function enrich(row,kind){
    const p=product(row.productoId||row.producto_id)||row.producto||{};
    const s=store(row.tiendaId||row.tienda_id||p.tiendaId||p.tienda_id)||row.tienda||{};
    const resp=person(row.responsableId||row.responsable_id)||row.responsable||{};
    const units=num(row.unidades);const price=num(row.precio??row.precioCalc??p.precio);const amount=num(row.valor??row.importe??units*price);
    const donor=donorName(row.donorRef||row.donor_ref||row.donante||'');
    return {responsable:txt(resp.nombre)||'Sin responsable',tienda:kind==='donacion'?(donor||txt(s.nombre)||'Sin origen'):txt(s.nombre)||'Sin tienda',producto:txt(p.nombre)||txt(row.producto)||'Producto',unidades:units,precio:price,importe:amount,ticket:txt(row.ticketDonacion||row.ticket_donacion)};
  }
  function grouped(kind){
    const map=new Map();
    for(const raw of sourceRows(kind)){
      const r=enrich(raw,kind);if(!map.has(r.responsable))map.set(r.responsable,[]);map.get(r.responsable).push(r);
    }
    return [...map.entries()].map(([name,list])=>({name,rows:list.sort((a,b)=>a.tienda.localeCompare(b.tienda,'es')||a.producto.localeCompare(b.producto,'es')),total:list.reduce((s,r)=>s+r.importe,0)})).sort((a,b)=>a.name.localeCompare(b.name,'es'));
  }
  function ensureStyle(){
    if($('ceRespReportStyle'))return;const st=document.createElement('style');st.id='ceRespReportStyle';st.textContent=`
    .ce-resp-report-overlay{position:fixed;inset:0;z-index:10070;background:rgba(5,20,34,.62);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:10px}.ce-resp-report-card{width:min(1480px,98vw);height:min(930px,96dvh);display:flex;flex-direction:column;background:#f7fbfd;border:1px solid rgba(255,255,255,.72);border-radius:24px;box-shadow:0 30px 90px rgba(3,18,32,.38);overflow:hidden}.ce-resp-report-card>header{display:flex;align-items:center;gap:14px;padding:15px 18px;background:linear-gradient(105deg,#0b293f,#125477);color:#fff}.ce-resp-report-card>header .ico{width:48px;height:48px;display:grid;place-items:center;border-radius:14px;background:rgba(255,255,255,.12);font-size:25px}.ce-resp-report-card>header .copy{min-width:0;flex:1}.ce-resp-report-card>header .copy span{display:block;color:#82e1c2;font-size:9px;font-weight:950;letter-spacing:.13em}.ce-resp-report-card>header h3{margin:3px 0 0;font-size:20px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ce-resp-report-card>header p{margin:3px 0 0;color:#d5e7f0;font-size:11px}.ce-resp-report-card>header button{border:1px solid rgba(255,255,255,.34);border-radius:12px;background:rgba(255,255,255,.1);color:#fff;font-weight:900;cursor:pointer}.ce-resp-report-card>header .pdf-all{padding:10px 14px;font-size:11px}.ce-resp-report-card>header .close{width:42px;height:42px;font-size:25px}.ce-resp-report-body{flex:1;min-height:0;overflow:auto;padding:12px}.ce-resp-group{margin:0 0 10px;border:1px solid #d8e6ed;border-radius:17px;background:#fff;overflow:hidden}.ce-resp-group-head{display:flex;align-items:center;gap:10px;padding:10px 12px;background:#edf6fa}.ce-resp-group-head strong{flex:1;color:#173a63;font-size:14px;font-weight:950}.ce-resp-group-head b{color:#0e7656;font-size:15px}.ce-resp-group-head button{border:1px solid #b8d3e2;border-radius:999px;background:#fff;color:#1c5576;padding:5px 10px;font-size:9px;font-weight:950;cursor:pointer}.ce-resp-table{width:100%;border-collapse:collapse}.ce-resp-table th{padding:6px 8px;background:#f8fbfd;color:#718596;font-size:8px;font-weight:950;text-transform:uppercase;letter-spacing:.07em;text-align:left;border-bottom:1px solid #e2ebf0}.ce-resp-table td{padding:7px 8px;color:#344b5c;font-size:11px;border-bottom:1px solid #eef3f6}.ce-resp-table tr:last-child td{border-bottom:0}.ce-resp-table .num{text-align:right;white-space:nowrap}.ce-resp-empty{padding:50px;text-align:center;color:#607789;font-weight:850}.ce-resp-launch{margin-left:auto!important;white-space:nowrap!important}.ce-resp-launch span{margin-right:5px}@media(max-width:760px){.ce-resp-report-overlay{padding:0}.ce-resp-report-card{width:100vw;height:100dvh;border-radius:0}.ce-resp-report-card>header{padding:10px}.ce-resp-report-card>header .pdf-all{display:none}.ce-resp-group{overflow:auto}.ce-resp-table{min-width:720px}.ce-resp-launch{font-size:0!important;padding:8px!important}.ce-resp-launch span{font-size:16px!important;margin:0!important}}`;
    document.head.appendChild(st);
  }
  function tableHtml(group,kind){
    const label=kind==='donacion'?'Origen / tienda':'Tienda';
    return `<table class="ce-resp-table"><thead><tr><th>${label}</th><th>Producto</th><th class="num">Uds.</th><th class="num">Precio</th><th class="num">${kind==='donacion'?'Valor estimado':'Importe'}</th></tr></thead><tbody>${group.rows.map(r=>`<tr><td>${esc(r.tienda)}</td><td>${esc(r.producto)}</td><td class="num">${esc(r.unidades.toLocaleString('es-ES'))}</td><td class="num">${esc(money(r.precio))}</td><td class="num">${esc(money(r.importe))}</td></tr>`).join('')}</tbody></table>`;
  }
  function openReport(kind){
    closeReport();ensureStyle();const groups=grouped(kind),modal=document.createElement('div');modal.id='ceRespReportOverlay';modal.className='ce-resp-report-overlay';
    const title=kind==='donacion'?'Donaciones por responsable':'Compras por responsable';
    const body=groups.length?groups.map((g,i)=>`<section class="ce-resp-group"><div class="ce-resp-group-head"><strong>${esc(g.name)}</strong><b>${esc(money(g.total))}</b><button type="button" data-ce-resp-pdf="${i}">PDF</button></div>${tableHtml(g,kind)}</section>`).join(''):`<div class="ce-resp-empty">No hay ${kind==='donacion'?'donaciones':'compras'} para este evento.</div>`;
    modal.innerHTML=`<section class="ce-resp-report-card" role="dialog" aria-modal="true"><header><div class="ico">${kind==='donacion'?'🎁':'🛒'}</div><div class="copy"><span>CONTROL EVENT · ${kind==='donacion'?'VALORACIÓN ESTIMADA':'DETALLE DE COMPRAS'}</span><h3>${esc(title)} · ${esc(eventTitle())}</h3><p>${groups.length} responsable${groups.length===1?'':'s'} · ${groups.reduce((s,g)=>s+g.rows.length,0)} línea${groups.reduce((s,g)=>s+g.rows.length,0)===1?'':'s'}</p></div><button type="button" class="pdf-all" data-ce-resp-pdf-all>🖨 PDF todos</button><button type="button" class="close" data-ce-resp-close>×</button></header><div class="ce-resp-report-body">${body}</div></section>`;
    document.body.appendChild(modal);modal.__ceKind=kind;modal.__ceGroups=groups;
  }
  function closeReport(){const m=$('ceRespReportOverlay');if(m)m.remove();}
  function printable(groups,kind){
    const label=kind==='donacion'?'Valor estimado':'Importe';
    return groups.map(g=>`<section class="group"><h2>${esc(g.name)} <span>${esc(money(g.total))}</span></h2><table><thead><tr><th>${kind==='donacion'?'Origen / tienda':'Tienda'}</th><th>Producto</th><th>Uds.</th><th>Precio</th><th>${label}</th></tr></thead><tbody>${g.rows.map(r=>`<tr><td>${esc(r.tienda)}</td><td>${esc(r.producto)}</td><td class="num">${esc(r.unidades.toLocaleString('es-ES'))}</td><td class="num">${esc(money(r.precio))}</td><td class="num">${esc(money(r.importe))}</td></tr>`).join('')}</tbody></table></section>`).join('');
  }
  function printGroups(groups,kind){
    if(!groups.length)return;const win=root.open('','_blank');if(!win)return alert('El navegador ha bloqueado la ventana de impresión.');try{win.opener=null;}catch(_){ }
    const title=`ControlEvent_v4_0_exp-${kind==='donacion'?'Donaciones':'Compras'}-${eventTitle()}`.replace(/[\\/:*?"<>|]+/g,'-');
    const note=kind==='donacion'?'<p class="note">Los importes mostrados corresponden a valoración estimada de las donaciones.</p>':'';
    win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(title)}</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#243847;margin:0}header{border-bottom:3px solid #0f766e;padding:0 0 10px;margin-bottom:12px}h1{font-size:20px;margin:0;color:#173a63}header p,.note{font-size:10px;color:#607789}.group{break-inside:avoid;margin:0 0 14px}.group h2{display:flex;justify-content:space-between;margin:0;padding:7px 9px;background:#edf6fa;color:#173a63;font-size:13px}.group h2 span{color:#0f766e}table{width:100%;border-collapse:collapse;font-size:9px}th,td{padding:5px 6px;border-bottom:1px solid #dfe8ee;text-align:left}th{background:#f8fafc;text-transform:uppercase;font-size:8px;color:#64748b}.num{text-align:right;white-space:nowrap}</style></head><body><header><h1>${esc(kind==='donacion'?'Donaciones por responsable':'Compras por responsable')} · ${esc(eventTitle())}</h1><p>ControlEvent v4_0_exp · ${new Date().toLocaleString('es-ES')}</p>${note}</header>${printable(groups,kind)}<script>window.onload=function(){setTimeout(function(){window.focus();window.print()},220)}<\/script></body></html>`);win.document.close();
  }
  function bind(){
    document.addEventListener('click',ev=>{
      const c=ev.target?.closest?.('[data-ce-resp-close]');if(c){ev.preventDefault();closeReport();return;}
      if(ev.target?.id==='ceRespReportOverlay'){closeReport();return;}
      if(ev.target?.closest?.('#btnComprasResponsables')){ev.preventDefault();openReport('compra');return;}
      if(ev.target?.closest?.('#btnDonacionesResponsables')){ev.preventDefault();openReport('donacion');return;}
      const all=ev.target?.closest?.('[data-ce-resp-pdf-all]');if(all){const m=$('ceRespReportOverlay');printGroups(m?.__ceGroups||[],m?.__ceKind||'compra');return;}
      const one=ev.target?.closest?.('[data-ce-resp-pdf]');if(one){const m=$('ceRespReportOverlay'),g=m?.__ceGroups?.[Number(one.dataset.ceRespPdf)];if(g)printGroups([g],m.__ceKind||'compra');return;}
    },true);
    document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&$('ceRespReportOverlay'))closeReport();});
  }
  ensureStyle();bind();
})(window);
