/* ControlEvent v3_0_exp · GRAFICAS / globos exhaustivos por destino.
   Comportamiento restaurado de la versión estable anterior a petición del usuario.
   Reconstruye las filas desde state.compras del evento activo para que el detalle del globo
   no dependa de listas intermedias. Sin datos de negocio hardcodeados. */
(function(root){
  'use strict';
  const FLAG='__ceV280RestoredGraphDetails'; if(root[FLAG])return; root[FLAG]=true;
  const trim=v=>String(v??'').trim();
  const norm=v=>trim(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const num=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;let s=trim(v).replace(/\s/g,'').replace(/€/g,'');if(!s)return 0;if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');else if(s.includes(','))s=s.replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0;};
  const money=v=>{try{return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(num(v));}catch(_){return num(v).toFixed(2)+' €';}};
  const qty=v=>{try{return new Intl.NumberFormat('es-ES',{maximumFractionDigits:3}).format(num(v));}catch(_){return String(num(v));}};
  function st(){try{if(typeof state!=='undefined'&&state)return state;}catch(_){ }return root.state||root.ControlEventApp?.state||{};}
  function list(name){const v=st()?.[name];return Array.isArray(v)?v:[];}
  function selectedEventId(){try{const e=typeof selectedEvent==='function'?selectedEvent():null;if(e?.id)return trim(e.id);}catch(_){ }return trim(st()?.selectedEventId||root.ControlEventApp?.state?.selectedEventId||document.getElementById('selectedEvent')?.value);}
  function mapById(rows){const m=new Map();rows.forEach(r=>m.set(trim(r?.id),r));return m;}
  function ticket(r){return trim(r?.ticketDonacion??r?.ticket_donacion??r?.ticket??r?.otrosGastos??r?.otros_gastos);}
  function isDonation(t){try{if(typeof isDonationTicket==='function')return !!isDonationTicket(t);}catch(_){ }return /^DONADO\b/.test(norm(t));}
  function isPending(t){const x=norm(t);return !x||/^PTE(?:\.|\s|$)/.test(x)||x.includes('PENDIENTE');}
  function kind(r){const t=ticket(r);if(isDonation(t))return'donado';if(isPending(t))return'pendiente';return'comprado';}
  function rowId(r,...keys){for(const k of keys){const v=trim(r?.[k]);if(v)return v;}return'';}
  function units(r){return num(r?.unidades??r?.cantidad??r?.qty);}
  function price(r,p){return num(r?.precio??r?.precioCalc??r?.precio_calc??r?.precioUnitario??r?.precio_unitario??p?.defaultPrecio??p?.default_precio??p?.precio);}
  function total(r,p){const d=r?.importe??r?.valor??r?.total;if(d!==undefined&&d!==null&&trim(d)!==''){const n=num(d);if(n!==0)return n;}return units(r)*price(r,p);}
  function donor(r,people,stores){const label=trim(r?.donorLabel??r?.donanteNombre);if(label)return label;const ref=trim(r?.donorRef??r?.donor_ref??r?.donante);if(!ref)return'Sin donante';const m=ref.match(/^([PT]):(.+)$/i);if(m)return trim((m[1].toUpperCase()==='P'?people:stores).get(m[2])?.nombre)||ref;return trim(people.get(ref)?.nombre||stores.get(ref)?.nombre)||ref;}
  function rowsForEvent(){
    const ev=selectedEventId();if(!ev)return[];const products=mapById(list('productos')),stores=mapById(list('tiendas')),people=mapById(list('personas'));
    return list('compras').filter(r=>trim(r?.eventId??r?.event_id)===ev).map(raw=>{const p=products.get(rowId(raw,'productoId','producto_id','productId','product_id'))||raw?.producto||{},t=stores.get(rowId(raw,'tiendaId','tienda_id','storeId','store_id'))||raw?.tienda||{};return{raw,people,stores,kind:kind(raw),destino:trim(p?.destino??raw?.destino)||'Sin destino',producto:trim(p?.nombre??raw?.productoNombre??raw?.producto)||'Producto',tienda:trim(t?.nombre??raw?.tiendaNombre)||'Sin tienda',ticket:ticket(raw)||'Pte.Compra',unidades:units(raw),precio:price(raw,p),total:total(raw,p)};});
  }
  function expenseLines(rows){const a=rows.slice().sort((x,y)=>x.tienda.localeCompare(y.tienda,'es',{sensitivity:'base'})||x.ticket.localeCompare(y.ticket,'es',{sensitivity:'base',numeric:true})||x.producto.localeCompare(y.producto,'es',{sensitivity:'base'})),out=[];let i=0;while(i<a.length){const store=a[i].tienda,sk=norm(store);let stotal=0;while(i<a.length&&norm(a[i].tienda)===sk){const tk=a[i].ticket,tkkey=norm(tk),g=[];while(i<a.length&&norm(a[i].tienda)===sk&&norm(a[i].ticket)===tkkey){g.push(a[i]);i++;}const gt=g.reduce((s,r)=>s+r.total,0);stotal+=gt;g.forEach(r=>out.push(`${r.tienda} | ${r.ticket} | ${r.producto} | ${qty(r.unidades)} | ${money(r.precio)} | ${money(r.total)}`));out.push(`Total ${store}, ${tk} |  |  |  |  | ${money(gt)}`);out.push('');}out.push(`Total ${store} |  |  |  |  | ${money(stotal)}`);out.push('');}while(out.length&&out.at(-1)==='')out.pop();return out;}
  function donationLines(rows){const a=rows.map(r=>({...r,donante:donor(r.raw,r.people,r.stores)})).sort((x,y)=>x.donante.localeCompare(y.donante,'es',{sensitivity:'base'})||x.producto.localeCompare(y.producto,'es',{sensitivity:'base'})),out=[];let i=0;while(i<a.length){const d=a[i].donante,k=norm(d),g=[];while(i<a.length&&norm(a[i].donante)===k){g.push(a[i]);i++;}g.forEach(r=>out.push(`${r.donante} | ${r.producto} | ${qty(r.unidades)} | ${money(r.precio)} | ${money(r.total)}`));out.push(`Total ${d} |  |  |  | ${money(g.reduce((s,r)=>s+r.total,0))}`);out.push('');}while(out.length&&out.at(-1)==='')out.pop();return out;}
  function refresh(){const wrap=document.getElementById('eventChartWrap');if(!wrap)return;const all=rowsForEvent();if(!all.length)return;wrap.querySelectorAll('.ce-v434-destino-card').forEach(card=>{const destination=trim(card.querySelector('.ce-v434-destino-title span')?.textContent);if(!destination)return;card.querySelectorAll('.ce-v434-mini-col').forEach(bar=>{const lab=norm(bar.querySelector('.ce-v434-mini-label')?.textContent);const k=lab.includes('DONADO')?'donado':(lab.includes('PTE')||lab.includes('PENDIENTE'))?'pendiente':lab.includes('COMPRADO')?'comprado':'';if(!k)return;const subset=all.filter(r=>norm(r.destino)===norm(destination)&&r.kind===k);if(!subset.length)return;const sum=subset.reduce((s,r)=>s+r.total,0),shown=k==='comprado'?'Comprado':k==='donado'?'Donado':'Pte.Compra',header=k==='donado'?'Donante | Producto | Cant. | Precio | Total':'Tienda | Ticket | Producto | Cant. | Precio | Total',body=k==='donado'?donationLines(subset):expenseLines(subset);bar.setAttribute('data-ce-tip-v21',[`${destination} - ${shown}: ${money(sum)}`,shown.toUpperCase(),header,...body].join('\n'));bar.dataset.ceV275FullRows=String(subset.length);bar.dataset.ceV275DetailTotal=String(sum);});});}
  let timer=0;const schedule=()=>{clearTimeout(timer);timer=setTimeout(refresh,30);};const observer=new MutationObserver(schedule);
  function install(){const wrap=document.getElementById('eventChartWrap');if(!wrap)return;observer.disconnect();observer.observe(wrap,{childList:true,subtree:true});refresh();}
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:event-ready','controlevent:event-loaded','controlevent:module-mounted'].forEach(evt=>root.addEventListener(evt,()=>setTimeout(install,80)));
  document.addEventListener('change',e=>{if(e.target?.id==='selectedEvent')setTimeout(install,150);},true);document.addEventListener('click',e=>{if(e.target?.closest?.('#tabGraficasBtn'))setTimeout(install,120);},true);
  if(document.readyState!=='loading')setTimeout(install,50);root.ControlEventV280RestoredGraphDetails={refresh};
})(window);
