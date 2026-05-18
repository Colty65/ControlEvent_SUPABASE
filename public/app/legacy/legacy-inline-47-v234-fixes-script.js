/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #47. */
/* ==== v23.4: claves, gráfico/Excel, globos encolumnados, foto ampliada, RW EVENTOS, estado color ==== */
(function(){
  'use strict';
  const VERSION='ControlEvent v26.6';
  const VERSION_FILE='ControlEvent_v26_6';
  const $=id=>document.getElementById(id);
  const norm=v=>String(v??'').trim();
  const up=v=>norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const cmp=(a,b)=>up(a).localeCompare(up(b),'es');
  function parseNum(v){
    if(typeof v==='number') return Number.isFinite(v)?v:0;
    let s=String(v??'').trim(); if(!s)return 0;
    s=s.replace(/[^0-9,.-]/g,'');
    if(s.includes(',') && s.includes('.')) s=s.replace(/\./g,'').replace(',', '.');
    else if(s.includes(',')) s=s.replace(',', '.');
    const n=Number(s); return Number.isFinite(n)?n:0;
  }
  const money=v=>parseNum(v).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
  const num=v=>parseNum(v).toLocaleString('es-ES',{minimumFractionDigits:0,maximumFractionDigits:2});
  function st(){try{return (typeof state!=='undefined'&&state)||window.state||{};}catch(_){return window.state||{};}}
  function arr(n){const s=st();return Array.isArray(s[n])?s[n]:[];}
  function role(){try{return up((typeof authUser!=='undefined'&&authUser&&authUser.nivel)||window.authUser?.nivel||'');}catch(_){return '';}}
  const isRW=()=>role()==='RW'; const isGD=()=>role()==='GD';
  function byId(list,id){return arr(list).find(x=>String(x.id)===String(id))||{};}
  function ev(){try{return (typeof selectedEvent==='function'?selectedEvent():null)||byId('eventos',st().selectedEventId)||{};}catch(_){return byId('eventos',st().selectedEventId)||{};}}
  function evId(){return String(ev().id||st().selectedEventId||'');}
  function persona(id){try{return (typeof personaById==='function'?personaById(id):null)||byId('personas',id);}catch(_){return byId('personas',id);}}
  function producto(id){try{return (typeof productoById==='function'?productoById(id):null)||byId('productos',id);}catch(_){return byId('productos',id);}}
  function tienda(id){try{return (typeof tiendaById==='function'?tiendaById(id):null)||byId('tiendas',id);}catch(_){return byId('tiendas',id);}}
  function compras(){try{const r=(typeof comprasForEvent==='function'?comprasForEvent():null);if(Array.isArray(r))return r;}catch(_){} return arr('compras').filter(c=>String(c.eventId||'')===evId());}
  function collabs(){try{const r=(typeof collabsForEvent==='function'?collabsForEvent():null);if(Array.isArray(r))return r;}catch(_){} return arr('colaboradores').filter(c=>String(c.eventId||'')===evId()).map(c=>({...c,persona:persona(c.personaId)}));}
  function eventPrice(){return parseNum(ev().precio);}
  function rango(r){return up(r?.persona?.rango||persona(r?.personaId).rango||'');}
  function forma(r){return up(r?.situacion||'');}
  function personName(r){return norm(r?.persona?.nombre||persona(r?.personaId).nombre||'Sin nombre');}
  function socioAmount(r){return parseNum(r?.numero)*eventPrice();}
  function rowTotal(r){return rango(r)==='SOCIO'?socioAmount(r):(parseNum(r?.total)||parseNum(r?.donation)||parseNum(r?.importe));}
  function prodName(c){return norm(c?.producto?.nombre||producto(c?.productoId).nombre||'Producto');}
  function tiendaName(c){const p=producto(c?.productoId);return norm(c?.tienda?.nombre||tienda(c?.tiendaId||p.tiendaId||p.defaultTiendaId).nombre||'Sin tienda');}
  function ticket(c){return norm(c?.ticketDonacion||c?.ticket||'');}
  function isDon(v){try{return typeof isDonationTicket==='function'?isDonationTicket(v):up(v).startsWith('DONADO');}catch(_){return up(v).startsWith('DONADO');}}
  function isCurrent(v){try{return typeof isCurrentExpenseTicket==='function'?isCurrentExpenseTicket(v):up(v)==='GASTOS CORRIENTES';}catch(_){return up(v)==='GASTOS CORRIENTES';}}
  function units(c){return parseNum(c?.unidades??c?.uds??0);}
  function price(c){const p=producto(c?.productoId);return parseNum(c?.precio??c?.precioCalc??p.defaultPrecio??p.precio??0);}
  function value(c){return parseNum(c?.valor) || (units(c)*price(c));}
  function donorName(c){try{if(typeof donorLabel==='function'&&c?.donorRef){const d=donorLabel(c.donorRef);if(norm(d))return d;}}catch(_){} const raw=norm(c?.donorRef||c?.donante||c?.donanteNombre||''); if(raw.startsWith('P:'))return persona(raw.slice(2)).nombre||'Sin donante'; if(raw.startsWith('T:'))return tienda(raw.slice(2)).nombre||'Sin donante'; return raw||c?.donorLabel||c?.responsable?.nombre||tiendaName(c)||'Sin donante';}
  function setTip(el,text,bg='#fff',layout='default'){if(!el||!norm(text))return; el.setAttribute('data-ce-tip-v21',text); el.setAttribute('data-tip-bg-v21',bg||'#fff'); el.setAttribute('data-ce-tip-layout-v21',layout||'default'); ['data-ce-tip-v196','data-ce-tip-v1952','data-ce-tip','data-v181-tip','data-tip','title'].forEach(a=>el.removeAttribute(a));}
  function table(title,header,lines,totalLabel,total){return [title,'',header].concat(lines.length?lines:['Sin registros'],'',`${totalLabel}: ${money(total||0)}`).join('\n');}
  function totalize(data,keyFn,valFn,label){const out=[];let prev=null,sub=0;data.forEach((r,i)=>{const k=keyFn(r)||'Sin grupo'; if(prev!==null&&k!==prev){out.push(`${label} ${prev} | | | | ${money(sub)}`);out.push('');sub=0;} prev=k; out.push(r.__line); sub+=valFn(r); if(i===data.length-1)out.push(`${label} ${k} | | | | ${money(sub)}`);});return out;}

  function refreshVersion(){try{document.title=VERSION;}catch(_){} document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||''))el.textContent=VERSION;}); try{const proto=HTMLAnchorElement.prototype;if(!proto.__ce_v234_click){const old=proto.click;proto.click=function(){try{if(this.download)this.download=String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/g,VERSION_FILE);}catch(_){}return old.apply(this,arguments);};proto.__ce_v234_click=true;}}catch(_){} }

  // Claves: deja un solo botón estable por campo y elimina el primero/duplicados anteriores.
  function ensureOneToggle(input){
    if(!input)return; input.disabled=false; input.readOnly=false; input.style.pointerEvents='auto'; input.style.userSelect='text';
    const field=input.closest('.field')||input.parentElement; if(!field)return;
    field.querySelectorAll('button').forEach(b=>{const txt=up(b.textContent); if(txt==='VER'||txt==='OCULTAR'||/eye|toggle|pass|clave/i.test(b.className||'')) b.remove();});
    let row=input.closest('.ce-pass-row-v234');
    if(!row){row=document.createElement('div');row.className='ce-pass-row-v234';input.parentElement.insertBefore(row,input);row.appendChild(input);}    
    const btn=document.createElement('button');btn.type='button';btn.className='outline small ce-pass-toggle-v234';btn.textContent=input.type==='text'?'Ocultar':'Ver';
    btn.addEventListener('click',evnt=>{evnt.preventDefault();evnt.stopPropagation();evnt.stopImmediatePropagation();const show=input.type==='password';input.type=show?'text':'password';btn.textContent=show?'Ocultar':'Ver';try{input.focus({preventScroll:true});}catch(_){} return false;},true);
    row.appendChild(btn);
  }
  function normalizePasswordButtons(){['loginClave','changeNewPassword1','changeNewPassword2'].forEach(id=>ensureOneToggle($(id)));}

  // Gráficas: origen único y corregido para pantalla y Excel GRAFICAS.
  function graphPartsV234(){
    const rows=collabs();
    const comprasRows=compras();
    const sum=a=>a.reduce((s,x)=>s+parseNum(x),0);
    const incomeLine=r=>`${personName(r)} | ${num(r.numero||0)} | ${money(rango(r)==='SOCIO'?socioAmount(r):0)} | ${money(rango(r)==='SOCIO'?0:rowTotal(r))} | ${money(rowTotal(r))}`;
    const mkIncome=(label,filter,color)=>{const list=rows.filter(filter);return {label,value:sum(list.map(rowTotal)),color,lines:list.slice().sort((a,b)=>cmp(personName(a),personName(b))).map(incomeLine)};};
    const byTicket=code=>comprasRows.filter(c=>ticket(c)===code);
    const donationItem=(label,code,color)=>{const list=byTicket(code).slice().sort((a,b)=>cmp(donorName(a),donorName(b))||cmp(prodName(a),prodName(b)));return {label,value:sum(list.map(value)),color,lines:list.map(c=>`${donorName(c)} | ${prodName(c)} | ${num(units(c))} | ${money(price(c))} | ${money(value(c))}`)};};
    const expenseList=kind=>{let data=comprasRows.filter(c=>!isDon(ticket(c))); if(kind==='ticket')data=data.filter(c=>ticket(c)&&!isCurrent(ticket(c))); if(kind==='current')data=data.filter(c=>isCurrent(ticket(c))); if(kind==='pending')data=data.filter(c=>!ticket(c)); return data.slice().sort((a,b)=>cmp(ticket(a)||'PTE.COMPRA',ticket(b)||'PTE.COMPRA')||cmp(tiendaName(a),tiendaName(b))||cmp(prodName(a),prodName(b)));};
    const expenseItem=(label,kind,color)=>{const list=expenseList(kind);return {label,value:sum(list.map(value)),color,lines:list.map(c=>`${ticket(c)||'PTE.COMPRA'} | ${tiendaName(c)} | ${prodName(c)} | ${num(units(c))} | ${money(price(c))} | ${money(value(c))}`)};};
    const incomeItems=[
      mkIncome('Socios Banco',r=>rango(r)==='SOCIO'&&forma(r)==='BANCO','#2563eb'),
      mkIncome('Socios Bizum',r=>rango(r)==='SOCIO'&&forma(r)==='BIZUM','#16a34a'),
      mkIncome('Socios Efectivo',r=>rango(r)==='SOCIO'&&forma(r)==='EFECTIVO','#84cc16'),
      mkIncome('No socios Banco',r=>rango(r)!=='SOCIO'&&forma(r)==='BANCO','#60a5fa'),
      mkIncome('No socios Bizum',r=>rango(r)!=='SOCIO'&&forma(r)==='BIZUM','#34d399'),
      mkIncome('No socios Efectivo',r=>rango(r)!=='SOCIO'&&forma(r)==='EFECTIVO','#bef264'),
      mkIncome('Pendiente de ingresar',r=>forma(r)==='PENDIENTE','#f59e0b')
    ];
    const donationItems=[donationItem('Donado por tiendas','DONADO TIENDA','#fcd34d'),donationItem('Donado por socios','DONADO SOCIO','#f59e0b'),donationItem('Donado por no socios','DONADO OTROS','#b45309')];
    const expenseItems=[expenseItem('Gastado por ticket','ticket','#dc2626'),expenseItem('Gastos corrientes','current','#ef4444'),expenseItem('Pendiente de compra','pending','#fb7185')];
    const totalIncomeRaw=sum(incomeItems.map(i=>i.value)), totalDon=sum(donationItems.map(i=>i.value)), totalExp=sum(expenseItems.map(i=>i.value));
    const saldoOperativo=totalIncomeRaw-totalExp;
    return {incomeItems,donationItems,expenseItems,saldoItems:[{label:'Saldo operativo',value:Math.abs(saldoOperativo),displayValue:saldoOperativo,color:saldoOperativo>=0?'#155e75':'#7f1d1d',lines:[]}],totalIncome:totalIncomeRaw,totalIncomeRaw,totalDon,totalExp,saldoActual:saldoOperativo,saldoOperativo};
  }
  try{window.graphPartsV171=graphPartsV171=graphPartsV234;window.graphPartsV164=graphPartsV234;}catch(_){window.graphPartsV171=graphPartsV234;window.graphPartsV164=graphPartsV234;}

  function applyGraphTips(){
    const wrap=$('eventChartWrap'); if(!wrap)return; let g; try{g=graphPartsV234();}catch(_){return;} const rows=wrap.querySelectorAll('.chart-row');
    const donationSegs=rows[1]?.querySelectorAll?.('.chart-seg')||[];
    g.donationItems.forEach((it,i)=>{const seg=donationSegs[i]; if(!seg)return; const data=it.lines.map(x=>x.split('|').map(s=>s.trim())).map(a=>({donor:a[0],prod:a[1],uds:a[2],precio:a[3],total:a[4]})); const objs=data.map(o=>{o.__line=`${o.donor} | ${o.prod} | ${o.uds} | ${o.precio} | ${o.total}`; return o;}); const lines=totalize(objs,o=>o.donor,o=>parseNum(o.total),'Total donante'); setTip(seg,table('GRÁFICAS / DONACIÓN DE PRODUCTO / '+it.label,'Donante | Producto | Uds | Precio estimado | Valor estimado',lines,'TOTAL ESTIMADO',it.value),it.color||getComputedStyle(seg).backgroundColor,'graphdonationv234');});
    const expenseSegs=rows[2]?.querySelectorAll?.('.chart-seg')||[];
    g.expenseItems.forEach((it,i)=>{const seg=expenseSegs[i]; if(!seg)return; const objs=it.lines.map(x=>x.split('|').map(s=>s.trim())).map(a=>({tk:a[0],tienda:a[1],prod:a[2],uds:a[3],precio:a[4],total:a[5],__line:`${a[0]} | ${a[1]} | ${a[2]} | ${a[3]} | ${a[4]} | ${a[5]}`})); const lines=totalize(objs,o=>o.tk,o=>parseNum(o.total),'Total'); setTip(seg,table('GRÁFICAS / GASTOS / '+it.label,'Ticket | Tienda | Producto | Uds | Precio | Total',lines,'TOTAL',it.value),it.color||getComputedStyle(seg).backgroundColor,'graphexpensev234');});
  }

  function applyStatusColor(){const el=$('eventStatus'); if(!el)return; const fin=up(ev().situacion)==='FINALIZADO'; el.classList.toggle('ce-v234-finalizado',fin); el.classList.toggle('ce-v234-curso',!fin); el.classList.toggle('status-finalizado',fin); el.classList.toggle('status-curso',!fin);}
  function applyEventRW(){if(!(isRW()||isGD()))return; document.querySelectorAll('#mtEventos input,#mtEventos select,#mtEventos textarea,#mtEventos button,[data-action^="edit-evento"],button[data-action="save-evento"],button[data-action="delete-evento"],#btnAddEvento,#mtEventosBtn').forEach(el=>{el.disabled=false;el.readOnly=false;el.classList.remove('locked','ce-v225-ro-disabled');el.style.pointerEvents='auto';el.style.opacity='1';el.removeAttribute('aria-disabled');});}

  function renderInfoHtml(text){const lines=String(text||'').split('\n'); let rows=[]; const html=[]; const flush=()=>{if(!rows.length)return; html.push('<table><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table>'); rows=[];}; lines.forEach(line=>{if(!line.trim()){flush();html.push('<div style="height:8px"></div>');return;} if(line.includes('|'))rows.push(line.split('|').map(s=>s.trim())); else{flush();html.push('<div style="font-weight:800;margin:4px 0 8px">'+esc(line)+'</div>');}}); flush(); return html.join('');}
  function ensurePhotoModal(){let m=$('ceTicketModalV234'); if(m)return m; m=document.createElement('div'); m.id='ceTicketModalV234'; m.className='ce-ticket-modal-v234'; m.innerHTML='<div class="ce-ticket-modal-v234-box"><button type="button" class="ce-ticket-modal-v234-close">×</button><div class="ce-ticket-modal-v234-info"></div><div class="ce-ticket-modal-v234-imgwrap"><img alt="Ticket ampliado"></div></div>'; m.addEventListener('click',evnt=>{if(evnt.target===m||evnt.target.closest('.ce-ticket-modal-v234-close'))m.classList.remove('visible');},true); document.body.appendChild(m); return m;}
  function ticketInfoForThumb(img){let el=img.closest('[data-ce-tip-v21]')||img.closest('.summary-item,.budget-row,.itemcard,.chart-row')?.querySelector?.('[data-ce-tip-v21]'); let text=el?.getAttribute('data-ce-tip-v21')||''; if(!text){const row=img.closest('.summary-item,.budget-row,.itemcard'); text=row?.innerText||'Sin detalle asociado';} return text;}
  window.addEventListener('click',function(evnt){const img=evnt.target?.closest?.('img.ticket-thumb'); if(!img)return; evnt.preventDefault();evnt.stopPropagation();evnt.stopImmediatePropagation(); try{$('ceTicketImageModalV225')?.classList.remove('visible');}catch(_){} const m=ensurePhotoModal(); m.querySelector('img').src=img.src; m.querySelector('.ce-ticket-modal-v234-info').innerHTML=renderInfoHtml(ticketInfoForThumb(img)); m.classList.add('visible'); return false;},true);
  document.addEventListener('keydown',evnt=>{if(evnt.key==='Escape')$('ceTicketModalV234')?.classList.remove('visible');},true);

  function applyAll(){refreshVersion(); normalizePasswordButtons(); applyStatusColor(); applyEventRW(); applyGraphTips();}
  const oldRender=typeof render==='function'?render:null; if(oldRender&&!oldRender.__ce_v234){const w=function(){const r=oldRender.apply(this,arguments); setTimeout(applyAll,60); return r;}; w.__ce_v234=true; try{render=w;window.render=w;}catch(_){} }
  const oldRenderGraf=typeof renderGraficas==='function'?renderGraficas:null; if(oldRenderGraf&&!oldRenderGraf.__ce_v234){const w=function(){const r=oldRenderGraf.apply(this,arguments); setTimeout(applyGraphTips,40); return r;}; w.__ce_v234=true; try{renderGraficas=w;window.renderGraficas=w;}catch(_){} }
  ['DOMContentLoaded','load'].forEach(evt=>window.addEventListener(evt,()=>{setTimeout(applyAll,120);setTimeout(applyAll,700);},false));
  document.addEventListener('click',()=>setTimeout(applyAll,80),false);
  applyAll(); setTimeout(applyAll,700);
})();
