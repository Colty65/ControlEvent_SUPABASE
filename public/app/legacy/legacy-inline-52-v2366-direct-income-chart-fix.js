/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #52. */
/* ==== v23.6.6 local: cálculo directo y único de INGRESOS por TOTAL real ==== */
(function(){
  'use strict';
  const VERSION='ControlEvent v26.6';
  const VERSION_FILE='ControlEvent_v26_6';
  const norm=v=>String(v??'').trim();
  const up=v=>norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const $=id=>document.getElementById(id);
  function num(v){
    if(typeof v==='number') return Number.isFinite(v)?v:0;
    let s=String(v??'').trim(); if(!s) return 0;
    s=s.replace(/[^0-9,.-]/g,'');
    if(s.includes(',')&&s.includes('.')) s=s.replace(/\./g,'').replace(',', '.');
    else if(s.includes(',')) s=s.replace(',', '.');
    const n=Number(s); return Number.isFinite(n)?n:0;
  }
  function money(v){ return num(v).toLocaleString('es-ES',{style:'currency',currency:'EUR'}); }
  function nfmt(v){ return num(v).toLocaleString('es-ES',{minimumFractionDigits:0,maximumFractionDigits:2}); }
  function st(){ try{return (typeof state!=='undefined'&&state)||window.state||{};}catch(_){return window.state||{};} }
  function arr(k){ const s=st(); return Array.isArray(s[k])?s[k]:[]; }
  function currentEvent(){
    try{ if(typeof selectedEvent==='function'){ const e=selectedEvent(); if(e) return e; } }catch(_){ }
    const s=st(); return arr('eventos').find(e=>String(e.id)===String(s.selectedEventId))||{};
  }
  function eventId(){ const e=currentEvent(); return String(e.id||st().selectedEventId||''); }
  function person(id){ try{ if(typeof personaById==='function'){ const p=personaById(id); if(p) return p; } }catch(_){ } return arr('personas').find(p=>String(p.id)===String(id))||{}; }
  function product(id){ try{ if(typeof productoById==='function'){ const p=productoById(id); if(p) return p; } }catch(_){ } return arr('productos').find(p=>String(p.id)===String(id))||{}; }
  function tienda(id){ try{ if(typeof tiendaById==='function'){ const t=tiendaById(id); if(t) return t; } }catch(_){ } return arr('tiendas').find(t=>String(t.id)===String(id))||{}; }
  function personName(r){ const p=r.persona||person(r.personaId); return norm(p.nombre||r.nombre||'Sin nombre'); }
  function rango(r){ const p=r.persona||person(r.personaId); return up(p.rango||r.rango||''); }
  function forma(r){ return up(r.situacion||r.formaPago||''); }
  function eventPrice(){ return num(currentEvent().precio); }
  function voluntaryRaw(r){
    // En el state real de INGRESOS el importe voluntario viene como "importe".
    // No se usa r.total ni r.base porque pueden estar precalculados mal por versiones anteriores.
    const keys=['importeVoluntario','voluntario','importe','aportacionVoluntaria','importeDonacion'];
    for(const k of keys){ if(r && r[k]!==undefined && r[k]!==null && String(r[k]).trim()!=='') return num(r[k]); }
    return 0;
  }
  function incomeParts(r){
    const socio=rango(r)==='SOCIO';
    const numero=num(r.numero);
    const obligatorio=socio ? numero*eventPrice() : 0;
    const voluntario=voluntaryRaw(r);
    return {numero, obligatorio, voluntario, total: obligatorio + voluntario};
  }
  function incomeRowsRaw(){ return arr('colaboradores').filter(r=>String(r.eventId||'')===eventId()).map(r=>Object.assign({},r,{persona:person(r.personaId)})); }
  function sum(a,fn){ return a.reduce((s,x)=>s+num(fn(x)),0); }
  function incomeItems(){
    const rows=incomeRowsRaw();
    const mk=(label,filter,color)=>{ const list=rows.filter(filter).slice().sort((a,b)=>personName(a).localeCompare(personName(b),'es')); return {label,color,value:sum(list,r=>incomeParts(r).total),rows:list,lines:list.map(r=>{const p=incomeParts(r);return `${personName(r)} | ${nfmt(p.numero)} | ${money(p.obligatorio)} | ${money(p.voluntario)} | ${money(p.total)}`;})}; };
    return [
      mk('Socios Banco',r=>rango(r)==='SOCIO'&&forma(r)==='BANCO','#2563eb'),
      mk('Socios Bizum',r=>rango(r)==='SOCIO'&&forma(r)==='BIZUM','#16a34a'),
      mk('Socios Efectivo',r=>rango(r)==='SOCIO'&&forma(r)==='EFECTIVO','#84cc16'),
      mk('No socios Banco',r=>rango(r)!=='SOCIO'&&forma(r)==='BANCO','#60a5fa'),
      mk('No socios Bizum',r=>rango(r)!=='SOCIO'&&forma(r)==='BIZUM','#34d399'),
      mk('No socios Efectivo',r=>rango(r)!=='SOCIO'&&forma(r)==='EFECTIVO','#bef264'),
      mk('Pendiente de ingresar',r=>forma(r)==='PENDIENTE','#f59e0b')
    ];
  }
  function purchases(){
    try{ if(typeof comprasForEvent==='function') return comprasForEvent()||[]; }catch(_){ }
    return arr('compras').filter(c=>String(c.eventId||'')===eventId()).map(c=>{const p=product(c.productoId);return Object.assign({},c,{producto:p,tienda:tienda(c.tiendaId||p.tiendaId)});});
  }
  function isDon(t){ try{ return typeof isDonationTicket==='function' ? isDonationTicket(t) : ['DONADO SOCIO','DONADO TIENDA','DONADO OTROS'].includes(norm(t)); }catch(_){ return ['DONADO SOCIO','DONADO TIENDA','DONADO OTROS'].includes(norm(t)); } }
  function isCurr(t){ try{ return typeof isCurrentExpenseTicket==='function' ? isCurrentExpenseTicket(t) : up(t)==='GASTOS CORRIENTES'; }catch(_){ return up(t)==='GASTOS CORRIENTES'; } }
  function cVal(c){ return num(c.valor)||(num(c.unidades)*num(c.precioCalc??c.precio??c.producto?.precio??c.producto?.defaultPrecio)); }
  function graphDataFixed(){
    const items=incomeItems();
    const incomes={socioBanco:items[0].value,socioBizum:items[1].value,socioEfectivo:items[2].value,noSocioBanco:items[3].value,noSocioBizum:items[4].value,noSocioEfectivo:items[5].value,pendiente:items[6].value};
    incomes.total=items.reduce((a,b)=>a+b.value,0); incomes.realizado=incomes.total-incomes.pendiente;
    const cs=purchases();
    const donations={tiendas:sum(cs.filter(c=>norm(c.ticketDonacion)==='DONADO TIENDA'),cVal),socios:sum(cs.filter(c=>norm(c.ticketDonacion)==='DONADO SOCIO'),cVal),noSocios:sum(cs.filter(c=>norm(c.ticketDonacion)==='DONADO OTROS'),cVal)}; donations.total=donations.tiendas+donations.socios+donations.noSocios;
    const expenses={tk:sum(cs.filter(c=>!isDon(c.ticketDonacion)&&!isCurr(c.ticketDonacion)&&norm(c.ticketDonacion)),cVal),corrientes:sum(cs.filter(c=>isCurr(c.ticketDonacion)),cVal),pendiente:sum(cs.filter(c=>!isDon(c.ticketDonacion)&&!norm(c.ticketDonacion)),cVal)}; expenses.total=expenses.tk+expenses.corrientes+expenses.pendiente; expenses.realizado=expenses.tk+expenses.corrientes;
    return {incomes,donations,expenses,saldoActual:incomes.realizado-expenses.realizado,saldoOperativo:incomes.total-expenses.total,incomeItems:items};
  }
  function legend(items){ return `<div class="chart-note" style="display:flex;flex-wrap:wrap;gap:10px 16px;margin-top:8px">`+items.filter(x=>num(x.value)!==0).map(x=>`<span><span class="legend-dot" style="background:${x.color}"></span>${String(x.label).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}: ${money(x.value)}</span>`).join('')+`</div>`; }
  function esc(s){ return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function seg(value,color,title,max){ const w=(Math.max(0,num(value))/Math.max(1,max))*100; return `<div class="chart-seg" title="${esc(title)}" style="width:${w}%;background:${color};"></div>`; }
  function renderGraphFixed(){
    const wrap=$('eventChartWrap'); if(!wrap) return;
    const g=graphDataFixed(); const max=Math.max(1,g.incomes.total,g.donations.total,g.expenses.total,Math.abs(g.saldoActual),Math.abs(g.saldoOperativo));
    const inc=[{label:'Socios Banco',value:g.incomes.socioBanco,color:'#2563eb'},{label:'Socios Bizum',value:g.incomes.socioBizum,color:'#16a34a'},{label:'Socios Efectivo',value:g.incomes.socioEfectivo,color:'#84cc16'},{label:'No socios Banco',value:g.incomes.noSocioBanco,color:'#60a5fa'},{label:'No socios Bizum',value:g.incomes.noSocioBizum,color:'#34d399'},{label:'No socios Efectivo',value:g.incomes.noSocioEfectivo,color:'#bef264'},{label:'Pendiente de ingresar',value:g.incomes.pendiente,color:'#f59e0b'}];
    const don=[{label:'Donado por tiendas',value:g.donations.tiendas,color:'#fcd34d'},{label:'Donado por socios',value:g.donations.socios,color:'#f59e0b'},{label:'Donado por no socios',value:g.donations.noSocios,color:'#b45309'}];
    const exp=[{label:'Gastado por ticket',value:g.expenses.tk,color:'#dc2626'},{label:'Gastos corrientes',value:g.expenses.corrientes,color:'#ef4444'},{label:'Pte. Compra u otros gastos',value:g.expenses.pendiente,color:'#fb7185'}];
    const sal1=[{label:'Saldo actual',value:Math.abs(g.saldoActual),color:g.saldoActual>=0?'#0f766e':'#b91c1c'}];
    const sal2=[{label:'Saldo operativo',value:Math.abs(g.saldoOperativo),color:g.saldoOperativo>=0?'#155e75':'#7f1d1d'}];
    wrap.innerHTML=`<div class="chart-shell"><div class="chart-bars">
      <div class="chart-row"><div class="chart-label">INGRESOS: ${money(g.incomes.total)}</div><div><div class="chart-track">${inc.map(x=>seg(x.value,x.color,x.label+': '+money(x.value),max)).join('')}</div>${legend(inc)}</div></div>
      <div class="chart-row"><div class="chart-label">DONACIÓN DE PRODUCTO: ${money(g.donations.total)}</div><div><div class="chart-track">${don.map(x=>seg(x.value,x.color,x.label+': '+money(x.value),max)).join('')}</div>${legend(don)}</div></div>
      <div class="chart-row"><div class="chart-label">GASTOS: ${money(g.expenses.total)}</div><div><div class="chart-track">${exp.map(x=>seg(x.value,x.color,x.label+': '+money(x.value),max)).join('')}</div>${legend(exp)}</div></div>
      <div class="chart-row"><div class="chart-label">SALDO ACTUAL: ${money(g.saldoActual)}</div><div><div class="chart-track">${sal1.map(x=>seg(x.value,x.color,x.label+': '+money(g.saldoActual),max)).join('')}</div>${legend([{label:'Saldo actual',value:g.saldoActual,color:sal1[0].color}])}</div></div>
      <div class="chart-row"><div class="chart-label">SALDO OPERATIVO: ${money(g.saldoOperativo)}</div><div><div class="chart-track">${sal2.map(x=>seg(x.value,x.color,x.label+': '+money(g.saldoOperativo),max)).join('')}</div>${legend([{label:'Saldo operativo',value:g.saldoOperativo,color:sal2[0].color}])}</div></div>
      </div></div>`;
  }
  async function chartImageFixed(){
    const canvas=document.createElement('canvas'); canvas.width=1180; canvas.height=760; const ctx=canvas.getContext('2d'); const g=graphDataFixed();
    const max=Math.max(1,g.incomes.total,g.donations.total,g.expenses.total,Math.abs(g.saldoOperativo));
    const rows=[
      {label:`INGRESOS: ${money(g.incomes.total)}`,items:[{label:'Socios Banco',value:g.incomes.socioBanco,color:'#2563eb'},{label:'Socios Bizum',value:g.incomes.socioBizum,color:'#16a34a'},{label:'Socios Efectivo',value:g.incomes.socioEfectivo,color:'#84cc16'},{label:'No socios Banco',value:g.incomes.noSocioBanco,color:'#60a5fa'},{label:'No socios Bizum',value:g.incomes.noSocioBizum,color:'#34d399'},{label:'No socios Efectivo',value:g.incomes.noSocioEfectivo,color:'#bef264'},{label:'Pendiente',value:g.incomes.pendiente,color:'#f59e0b'}]},
      {label:`DONACIÓN DE PRODUCTO: ${money(g.donations.total)}`,items:[{label:'Donado tiendas',value:g.donations.tiendas,color:'#fcd34d'},{label:'Donado socios',value:g.donations.socios,color:'#f59e0b'},{label:'Donado no socios',value:g.donations.noSocios,color:'#b45309'}]},
      {label:`GASTOS: ${money(g.expenses.total)}`,items:[{label:'TKxx',value:g.expenses.tk,color:'#dc2626'},{label:'Gastos corrientes',value:g.expenses.corrientes,color:'#ef4444'},{label:'Pte. compra',value:g.expenses.pendiente,color:'#fb7185'}]},
      {label:`SALDO OPERATIVO: ${money(g.saldoOperativo)}`,items:[{label:'Saldo operativo',value:Math.abs(g.saldoOperativo),color:g.saldoOperativo>=0?'#155e75':'#7f1d1d'}]}
    ];
    ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.font='bold 24px Arial'; ctx.fillStyle='#111827'; ctx.fillText('ControlEvent - Gráficas del evento',40,45);
    let y=95; rows.forEach(row=>{ctx.font='bold 20px Arial';ctx.fillStyle='#111827';ctx.fillText(row.label,40,y); let x0=330,barW=790,h=34,x=x0; ctx.fillStyle='#f3f4f6';ctx.fillRect(x0,y-25,barW,h); row.items.forEach(it=>{const w=(Math.max(0,num(it.value))/max)*barW; if(w>0){ctx.fillStyle=it.color;ctx.fillRect(x,y-25,w,h); x+=w;}}); let lx=x0,ly=y+35; ctx.font='15px Arial'; row.items.filter(it=>num(it.value)!==0).forEach(it=>{const t=`${it.label}: ${money(it.value)}`; const tw=ctx.measureText(t).width+32; if(lx+tw>1120){lx=x0;ly+=24;} ctx.fillStyle=it.color;ctx.fillRect(lx,ly-12,12,12); ctx.fillStyle='#334155';ctx.fillText(t,lx+18,ly); lx+=tw;}); y+=150;});
    return canvas.toDataURL('image/png');
  }
  function patch(){
    try{ document.title=VERSION; }catch(_){ }
    try{ document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{ if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||'')) el.textContent=VERSION; }); }catch(_){ }
    try{ window.graphDataV160=graphDataFixed; graphDataV160=graphDataFixed; }catch(_){ window.graphDataV160=graphDataFixed; }
    try{ window.graphDataV143=graphDataFixed; graphDataV143=graphDataFixed; }catch(_){ window.graphDataV143=graphDataFixed; }
    try{ window.graphData=graphDataFixed; graphData=graphDataFixed; }catch(_){ window.graphData=graphDataFixed; }
    try{ window.renderGraficas=renderGraphFixed; renderGraficas=renderGraphFixed; }catch(_){ window.renderGraficas=renderGraphFixed; }
    try{ window.makeChartImageDataUrl=chartImageFixed; window.makeChartImageDataUrlV160=chartImageFixed; window.makeChartImageDataUrlV164=chartImageFixed; window.makeChartImageDataUrlV171=chartImageFixed; makeChartImageDataUrl=chartImageFixed; makeChartImageDataUrlV160=chartImageFixed; makeChartImageDataUrlV164=chartImageFixed; makeChartImageDataUrlV171=chartImageFixed; }catch(_){ window.makeChartImageDataUrl=chartImageFixed; }
    try{ window.emittedByTextV171=function(date=new Date()){const p=n=>String(n).padStart(2,'0');return `Emitido por “©oltyLAB ’26_${VERSION_FILE}_${p(date.getDate())}${p(date.getMonth()+1)}${date.getFullYear()}_${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}”`;}; emittedByTextV171=window.emittedByTextV171; }catch(_){ }
  }
  const oldRender=typeof render==='function'?render:null;
  if(oldRender&&!oldRender.__ce_v2366){ const w=function(){const r=oldRender.apply(this,arguments); setTimeout(()=>{patch(); try{ if((typeof currentMainTab!=='undefined'&&currentMainTab==='graficas')||!$('tabGraficas')?.classList.contains('hidden')) renderGraphFixed(); }catch(_){ }},40); return r;}; w.__ce_v2366=true; try{render=w;window.render=w;}catch(_){ } }
  window.__ceIncomeCheckV2366=function(){ const rows=incomeRowsRaw().map(r=>({nombre:personName(r),rango:rango(r),situacion:forma(r),...incomeParts(r)})); console.table(rows); console.log('Socios Banco', incomeItems()[0].value); console.log('Total ingresos', incomeItems().reduce((a,b)=>a+b.value,0)); return rows; };
  patch(); setTimeout(patch,50); setTimeout(()=>{try{renderGraphFixed();}catch(_){}},250); setTimeout(()=>{try{renderGraphFixed();}catch(_){}},1000);
})();
