/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #34. */
/* ==== V21.3.1: cabeceras primero, globos reencolumnados e INFOEVENTO sin fallback; muestra error real ==== */
(function(){
  const VERSION='ControlEvent v26.6';
  const VERSION_FILE='ControlEvent_v26_6';
  const $=id=>document.getElementById(id);
  const norm=v=>String(v??'').trim();
  const up=v=>norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const clean=v=>String(v||'evento').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'').replace(/_+/g,'_')||'evento';
  const money=v=>{try{return (typeof window.money==='function'?window.money(Number(v||0)):new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0)));}catch(_){return Number(v||0).toFixed(2).replace('.',',')+' €';}};
  const num=v=>{try{return new Intl.NumberFormat('es-ES',{minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(v||0));}catch(_){return String(v??'');}};
  const cmp=(a,b)=>up(a).localeCompare(up(b),'es');
  function st(){try{if(typeof state!=='undefined')return state;}catch(_){} return window.state||{};}
  function arr(n){const s=st();return Array.isArray(s[n])?s[n]:[];}
  function ev(){try{return (typeof selectedEvent==='function'?selectedEvent():null)||{};}catch(_){return{};}}
  function evId(){return String(ev().id||st().selectedEventId||'');}
  function byId(list,id){return arr(list).find(x=>String(x.id)===String(id))||{};}
  function persona(id){try{const p=typeof personaById==='function'?personaById(id):null;if(p)return p;}catch(_){} return byId('personas',id);}
  function producto(id){try{const p=typeof productoById==='function'?productoById(id):null;if(p)return p;}catch(_){} return byId('productos',id);}
  function tienda(id){try{const t=typeof tiendaById==='function'?tiendaById(id):null;if(t)return t;}catch(_){} return byId('tiendas',id);}
  function ingresos(){try{if(typeof collabsForEvent==='function')return collabsForEvent()||[];}catch(_){} const id=evId();return arr('colaboradores').filter(r=>String(r.eventId||'')===id);}
  function compras(){try{if(typeof comprasForEvent==='function')return comprasForEvent()||[];}catch(_){} const id=evId();return arr('compras').filter(r=>String(r.eventId||'')===id);}
  function productName(c){return c?.producto?.nombre||producto(c?.productoId).nombre||'Producto';}
  function storeName(c){const p=producto(c?.productoId);return c?.tienda?.nombre||tienda(c?.tiendaId||p.tiendaId||p.defaultTiendaId).nombre||'Sin tienda';}
  function donorName(c){try{if(typeof donorLabel==='function'&&c?.donorRef){const d=donorLabel(c.donorRef);if(norm(d))return d;}}catch(_){} const raw=norm(c?.donorRef||c?.donante||c?.donanteNombre||''); if(raw.startsWith('P:'))return persona(raw.slice(2)).nombre||'Sin donante'; if(raw.startsWith('T:'))return tienda(raw.slice(2)).nombre||'Sin donante'; return raw||c?.donorLabel||c?.tienda?.nombre||'Sin donante';}
  function ticket(c){return norm(c?.ticketDonacion||'');}
  function isDon(v){try{if(typeof isDonationTicket==='function')return isDonationTicket(v);}catch(_){} return up(v).startsWith('DONADO');}
  function isCurrent(v){try{if(typeof isCurrentExpenseTicket==='function')return isCurrentExpenseTicket(v);}catch(_){} return up(v)==='GASTOS CORRIENTES';}
  function price(c){const p=producto(c?.productoId);return Number(c?.precio!=null?c.precio:(c?.precioCalc!=null?c.precioCalc:(p.defaultPrecio??p.precio??0)));}
  function value(c){return Number(c?.valor!=null?c.valor:price(c)*Number(c?.unidades||0));}
  function setTip(el,text,bg='#fff',layout='default'){
    if(!el||!norm(text))return;
    el.setAttribute('data-ce-tip-v21',text);
    el.setAttribute('data-tip-bg-v21',bg||'#fff');
    el.setAttribute('data-ce-tip-layout-v21',layout||'default');
    ['data-ce-tip-v196','data-ce-tip-v1952','data-ce-tip','data-v181-tip','data-tip','title'].forEach(a=>el.removeAttribute(a));
  }
  function totalIngreso(r){const per=r.persona||persona(r.personaId)||{}; const n=Number(r.numero||0); const socio=up(per.rango)==='SOCIO'?Number(r.base!=null?r.base:n*Number(ev().precio||0)):0; const vol=Number(r.donation!=null?r.donation:(r.importe||0)); return Number(r.total!=null?r.total:socio+vol);}
  function ingresoVals(r){const per=r.persona||persona(r.personaId)||{}; const nombre=per.nombre||r.nombre||'Sin nombre'; const n=Number(r.numero||0); const socio=up(per.rango)==='SOCIO'?Number(r.base!=null?r.base:n*Number(ev().precio||0)):0; const vol=Number(r.donation!=null?r.donation:(r.importe||0)); const total=totalIngreso(r); const pending=up(r.situacion)==='PENDIENTE'; return {nombre,n,rango:per.rango||'',socio,vol,total,ing:pending?0:total,pte:pending?total:0,situacion:r.situacion||''};}
  function ingresoLine(r,full=true){const v=ingresoVals(r); return full?`${v.nombre} | ${num(v.n)} | ${v.rango||''} | ${money(v.socio)} | ${money(v.vol)} | ${money(v.ing)} | ${money(v.pte)} | ${money(v.total)}`:`${v.nombre} | ${num(v.n)} | ${v.rango||''} | ${money(v.socio)} | ${money(v.vol)} | ${money(v.total)}`;}
  function titleWithLines(title,total,header,lines){return `${title}\n\n${header}\n${lines.length?lines.join('\n'):'Sin registros'}\n\nTOTAL: ${money(total)}`;}
  function setOnSelfAndChildren(el,text,bg,layout){if(!el)return; setTip(el,text,bg,layout); el.querySelectorAll('span,strong,.label,.value').forEach(x=>setTip(x,text,bg,layout));}
  function applySummaryIncomeTips(){
    const grid=$('ingresosSummaryGrid'); if(!grid)return;
    const base=ingresos();
    const make=(title,fn)=>{const rows=base.filter(fn).sort((a,b)=>cmp(ingresoVals(a).nombre,ingresoVals(b).nombre)); const total=rows.reduce((a,b)=>a+totalIngreso(b),0); return titleWithLines(title,total,'PERSONAS | Nº | Rango | Importe socio | Importe voluntario | Total',rows.map(r=>ingresoLine(r,false)));};
    Array.from(grid.children||[]).forEach(card=>{
      const label=up(card.querySelector('.label')?.textContent||card.textContent||''); let text='';
      if(label.includes('EFECTIVO')) text=make('RESUMEN DE INGRESOS / EFECTIVO',r=>up(r.situacion)==='EFECTIVO');
      else if(label.includes('BANCO')) text=make('RESUMEN DE INGRESOS / BANCO',r=>up(r.situacion)==='BANCO');
      else if(label.includes('BIZUM')) text=make('RESUMEN DE INGRESOS / BIZUM',r=>up(r.situacion)==='BIZUM');
      else if(label.includes('PENDIENTE')) text=make('RESUMEN DE INGRESOS / PENDIENTE',r=>up(r.situacion)==='PENDIENTE');
      else if(label.includes('TOTAL')) text=make('RESUMEN DE INGRESOS / TOTAL INGRESOS',()=>true);
      if(text) setOnSelfAndChildren(card,text,getComputedStyle(card).backgroundColor||'#fff','summaryincomev213');
    });
  }
  function applyBudgetIncomeTips(){
    const rows=ingresos(); const socios=rows.filter(r=>up((r.persona||persona(r.personaId)).rango)==='SOCIO'); const nosocios=rows.filter(r=>up((r.persona||persona(r.personaId)).rango)!=='SOCIO');
    const make=(title,baseRows,mode)=>{let list=baseRows.slice(); if(mode==='ing')list=list.filter(r=>up(r.situacion)!=='PENDIENTE'); if(mode==='pte')list=list.filter(r=>up(r.situacion)==='PENDIENTE'); list.sort((a,b)=>cmp(ingresoVals(a).nombre,ingresoVals(b).nombre)); const total=list.reduce((a,b)=>a+totalIngreso(b),0); return titleWithLines(title,total,'PERSONAS | Nº | Rango | Importe socio | Importe voluntario | Ingresado | Pendiente | Total',list.map(r=>ingresoLine(r,true)));};
    document.querySelectorAll('#budgetLayout .budget-subrow').forEach(row=>{const label=norm(row.querySelector('span')?.textContent||''); if(!label)return; const prev=row.closest('.budget-subrows')?.previousElementSibling?.textContent||''; const isNo=/NO\s+SOCIOS/i.test(prev); let text='';
      if(label==='Personas')text=make(`${isNo?'NO SOCIOS':'SOCIOS'} / PERSONAS`,isNo?nosocios:socios,'all');
      else if(/Importe socios/i.test(label))text=make('SOCIOS / IMPORTE SOCIO',socios,'all');
      else if(/Ingresado socios/i.test(label))text=make('SOCIOS / INGRESADO SOCIO',socios,'ing');
      else if(/Pendiente socios/i.test(label))text=make('SOCIOS / PENDIENTE SOCIO',socios,'pte');
      else if(/Importe no socios|Importe donantes/i.test(label))text=make('NO SOCIOS / IMPORTE NO SOCIO',nosocios,'all');
      else if(/Ingresado no socios|Ingresado donantes/i.test(label))text=make('NO SOCIOS / INGRESADO NO SOCIO',nosocios,'ing');
      else if(/Pendiente no socios|Pendiente donantes/i.test(label))text=make('NO SOCIOS / PENDIENTE NO SOCIO',nosocios,'pte');
      if(text)setOnSelfAndChildren(row,text,'#fff','budgetincomev213');
    });
  }
  function donationRows(code){return compras().filter(c=>!code||ticket(c)===code).sort((a,b)=>cmp(donorName(a),donorName(b))||cmp(productName(a),productName(b))).map(c=>`${donorName(c)} | ${productName(c)} | ${num(Number(c.unidades||0))} | ${money(price(c))} | ${money(value(c))}`);}
  function donationRowsGrouped(code){const rows=compras().filter(c=>!code||ticket(c)===code).sort((a,b)=>cmp(donorName(a),donorName(b))||cmp(productName(a),productName(b))); const out=[]; let cur=null,total=0; rows.forEach((c,i)=>{const d=donorName(c); if(cur!==null&&d!==cur){out.push(`TOTAL DONANTE ${cur} | | | | ${money(total)}`); out.push(''); total=0;} cur=d; total+=value(c); out.push(`${d} | ${productName(c)} | ${num(Number(c.unidades||0))} | ${money(price(c))} | ${money(value(c))}`); if(i===rows.length-1)out.push(`TOTAL DONANTE ${d} | | | | ${money(total)}`);}); return out;}
  function applyBudgetDonationCombinedTip(){
    const codes=['DONADO TIENDA','DONADO SOCIO','DONADO OTROS']; const rows=codes.flatMap(code=>donationRows(code)); const total=codes.reduce((a,code)=>a+compras().filter(c=>ticket(c)===code).reduce((s,c)=>s+value(c),0),0);
    const text=titleWithLines('DONACIÓN DE PRODUCTO / VALOR PRODUCTO DONADO',total,'DONANTE | Producto | Uds | Precio estimado | Valor estimado',rows);
    document.querySelectorAll('#budgetLayout .budget-row,#budgetLayout .budget-subgroup').forEach(row=>{const label=up(row.querySelector('strong')?.textContent||row.textContent||''); if(label.includes('VALOR PRODUCTO DONADO'))setOnSelfAndChildren(row,text,'#fff','budgetdonationcombinedv213');});
  }
  function applyGraphTips(){
    const wrap=$('eventChartWrap'); if(!wrap)return; let g=null; try{g=typeof graphPartsV171==='function'?graphPartsV171():(typeof graphData==='function'?graphData():null);}catch(_){} if(!g)return; const rows=wrap.querySelectorAll('.chart-row');
    const incomeSegs=rows[0]?.querySelectorAll?.('.chart-seg')||[];
    const incomeSpecs=[['Socios Banco',r=>up((r.persona||persona(r.personaId)).rango)==='SOCIO'&&up(r.situacion)==='BANCO'],['Socios Bizum',r=>up((r.persona||persona(r.personaId)).rango)==='SOCIO'&&up(r.situacion)==='BIZUM'],['Socios Efectivo',r=>up((r.persona||persona(r.personaId)).rango)==='SOCIO'&&up(r.situacion)==='EFECTIVO'],['No socios Banco',r=>up((r.persona||persona(r.personaId)).rango)!=='SOCIO'&&up(r.situacion)==='BANCO'],['No socios Bizum',r=>up((r.persona||persona(r.personaId)).rango)!=='SOCIO'&&up(r.situacion)==='BIZUM'],['No socios Efectivo',r=>up((r.persona||persona(r.personaId)).rango)!=='SOCIO'&&up(r.situacion)==='EFECTIVO'],['Pendiente de ingresar',r=>up(r.situacion)==='PENDIENTE']];
    const incomeItems=g.incomeItems||[]; incomeSegs.forEach((seg,i)=>{const [title,fn]=incomeSpecs[i]||[]; if(!title)return; const regs=ingresos().filter(fn).sort((a,b)=>cmp(ingresoVals(a).nombre,ingresoVals(b).nombre)); const total=regs.reduce((a,b)=>a+totalIngreso(b),0); const text=titleWithLines(title,total,'PERSONAS | Nº | Rango | Importe socio | Importe voluntario | Total',regs.map(r=>ingresoLine(r,false))); setTip(seg,text,incomeItems[i]?.color||getComputedStyle(seg).backgroundColor||'#fff','graphincomev213');});
    const donSegs=rows[1]?.querySelectorAll?.('.chart-seg')||[]; const donSpecs=[['Donado por tiendas','DONADO TIENDA'],['Donado por socios','DONADO SOCIO'],['Donado por no socios','DONADO OTROS']]; const donItems=g.donationItems||[];
    donSegs.forEach((seg,i)=>{const [title,code]=donSpecs[i]||[]; if(!code)return; const total=compras().filter(c=>ticket(c)===code).reduce((a,b)=>a+value(b),0); const text=titleWithLines(title,total,'DONANTE | Producto | Uds | Precio estimado | Valor estimado',donationRowsGrouped(code)); setTip(seg,text,donItems[i]?.color||getComputedStyle(seg).backgroundColor||'#fff','graphdonationv213');});
    const expSegs=rows[2]?.querySelectorAll?.('.chart-seg')||[]; const expItems=g.expenseItems||[]; const specs=[['Gastado por ticket','ticket'],['Gastos corrientes','current'],['Pte. Compra u otros gastos','pending']];
    expSegs.forEach((seg,i)=>{const [title,kind]=specs[i]||[]; if(!kind)return; const lines=expenseRowsGrouped(kind); const total=lines.total; const text=titleWithLines(title,total,'Ticket | Tienda | Producto | Uds x precio | Total',lines.rows); setTip(seg,text,expItems[i]?.color||getComputedStyle(seg).backgroundColor||'#fff','graphexpensev213');});
  }
  function expenseRowsGrouped(kind){
    const filt=c=>{const tk=ticket(c); if(kind==='ticket')return !isDon(tk)&&!isCurrent(tk)&&tk!==''; if(kind==='current')return isCurrent(tk); return !isDon(tk)&&tk==='';};
    const rows=compras().filter(filt).sort((a,b)=>cmp(ticket(a)||'PTE.COMPRA',ticket(b)||'PTE.COMPRA')||cmp(storeName(a),storeName(b))||cmp(productName(a),productName(b)));
    const out=[]; let cur=null,total=0,grand=0; rows.forEach((c,i)=>{const tk=kind==='current'?'GASTOS CORRIENTES':(ticket(c)||'PTE.COMPRA'); if(cur!==null&&tk!==cur){out.push(`TOTAL ${cur} | | | | ${money(total)}`); out.push(''); total=0;} cur=tk; const v=value(c); total+=v; grand+=v; out.push(`${tk} | ${storeName(c)} | ${productName(c)} | ${num(Number(c.unidades||0))} uds x ${money(price(c))} | ${money(v)}`); if(i===rows.length-1)out.push(`TOTAL ${tk} | | | | ${money(total)}`);}); return {rows:out,total:grand};
  }
  function normalizeDownloads(){const proto=HTMLAnchorElement.prototype; if(proto.click.__v213Wrapped)return; const prev=proto.click; const wrapped=function(){try{if(this.download){this.download=String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig,VERSION_FILE).replace(/[\\/:*?"<>|]+/g,'_').replace(/_+\.xlsx$/,'.xlsx');}}catch(_){} return prev.apply(this,arguments);}; wrapped.__v213Wrapped=true; proto.click=wrapped;}
  function refreshVersion(){try{document.title=VERSION;}catch(_){} document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||''))el.textContent=VERSION;}); normalizeDownloads();}
  async function safeInfoEventoExport(){
    await (typeof ensureExcelJS==='function'?ensureExcelJS():Promise.resolve());
    const wb=new ExcelJS.Workbook(); wb.creator=VERSION+' - ©oltyLAB ’26'; wb.created=new Date();
    const border={top:{style:'thin',color:{argb:'FFDDE2EA'}},left:{style:'thin',color:{argb:'FFDDE2EA'}},bottom:{style:'thin',color:{argb:'FFDDE2EA'}},right:{style:'thin',color:{argb:'FFDDE2EA'}}};
    const moneyFmt='#,##0.00 [$€-C0A]';
    function ws(name,widths){const s=wb.addWorksheet(String(name).slice(0,31)); s.columns=widths.map(w=>({width:w})); return s;}
    function cell(s,r,c,v,bold=false,isMoney=false){const x=s.getCell(r,c); x.value=isMoney?Number(v||0):(v==null?'':v); if(isMoney)x.numFmt=moneyFmt; x.border=border; x.alignment={vertical:'middle',wrapText:true}; x.font={bold:!!bold,color:{argb:'FF111827'}}; return x;}
    function header(s,r,vals){vals.forEach((v,i)=>{const c=cell(s,r,i+1,v,true); c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF111827'}}; c.font={bold:true,color:{argb:'FFFFFFFF'}};});}
    const e=ev(); let r=1; const s1=ws('RESUMEN',[24,60,18]); header(s1,r++,['Campo','Valor','Importe']); cell(s1,r,1,'Evento',true); cell(s1,r++,2,e.titulo||''); cell(s1,r,1,'Fechas',true); cell(s1,r++,2,`${e.fechaIni||''}${e.fechaFin?' - '+e.fechaFin:''}`); cell(s1,r,1,'Precio evento',true); cell(s1,r++,3,Number(e.precio||0),true,true); cell(s1,r,1,'Descripción',true); cell(s1,r++,2,String(e.descripcion||'').slice(0,32000));
    const si=ws('INGRESOS',[32,9,14,16,16,16,16]); header(si,1,['Nombre','Número','Rango','Importe socio','Importe voluntario','Total','Situación']); r=2; ingresos().forEach(x=>{const v=ingresoVals(x); cell(si,r,1,v.nombre); cell(si,r,2,v.n); cell(si,r,3,v.rango); cell(si,r,4,v.socio,false,true); cell(si,r,5,v.vol,false,true); cell(si,r,6,v.total,false,true); cell(si,r,7,v.situacion); r++;});
    const sc=ws('COMPRAS_GASTOS',[18,28,10,14,14,18,26]); header(sc,1,['Ticket','Producto','Uds','Precio','Importe','Tienda','Responsable']); r=2; compras().filter(c=>!isDon(ticket(c))).forEach(c=>{cell(sc,r,1,ticket(c)||'PTE.COMPRA'); cell(sc,r,2,productName(c)); cell(sc,r,3,Number(c.unidades||0)); cell(sc,r,4,price(c),false,true); cell(sc,r,5,value(c),false,true); cell(sc,r,6,storeName(c)); cell(sc,r,7,persona(c.responsableId).nombre||''); r++;});
    const sd=ws('DONACIONES',[24,28,10,14,14,28]); header(sd,1,['Donante','Producto','Uds','Precio estimado','Valor estimado','Tipo']); r=2; compras().filter(c=>isDon(ticket(c))).forEach(c=>{cell(sd,r,1,donorName(c)); cell(sd,r,2,productName(c)); cell(sd,r,3,Number(c.unidades||0)); cell(sd,r,4,price(c),false,true); cell(sd,r,5,value(c),false,true); cell(sd,r,6,ticket(c)); r++;});
    const buf=await wb.xlsx.writeBuffer(); const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}); const a=document.createElement('a'); const d=new Date(); const y=String(d.getFullYear()),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0'); a.href=URL.createObjectURL(blob); a.download=`${VERSION_FILE}_INFOEVENTO-${clean(e.titulo||'evento')}_${y}${m}${day}.xlsx`; a.click(); URL.revokeObjectURL(a.href);
  }
  const previousExport=(typeof exportExcel==='function'?exportExcel:(typeof window.exportExcel==='function'?window.exportExcel:null));
  function describeInfoEventoError(err){
    try{
      const name=err&&err.name?String(err.name):'Error';
      const msg=err&&err.message?String(err.message):String(err||'Error desconocido');
      return `${name}: ${msg}`;
    }catch(_){return 'Error desconocido';}
  }
  window.exportExcel=exportExcel=async function(){
    try{
      if(!previousExport){
        throw new Error('No se ha encontrado la función principal original de exportación INFOEVENTO.');
      }
      return await previousExport.apply(this,arguments);
    }catch(err){
      window.__ultimoErrorInfoEvento=err;
      console.group('ERROR INFOEVENTO - ControlEvent v26.6');
      console.error('No se ha generado INFOEVENTO reducido. Se muestra el error real para poder corregir datos o código.', err);
      try{console.error('Stack:', err&&err.stack?err.stack:'Sin stack disponible');}catch(_){}
      try{console.log('Evento activo:', ev());}catch(_){}
      try{console.log('Ingresos del evento:', ingresos());}catch(_){}
      try{console.log('Compras/donaciones/gastos del evento:', compras());}catch(_){}
      console.groupEnd();
      alert('No se pudo descargar INFOEVENTO completo.\n\n' + describeInfoEventoError(err) + '\n\nAbre la consola para ver el detalle. No se ha generado ningún Excel reducido.');
      throw err;
    }
  };
  function wireExcel(){const btn=$('btnExportExcel'); if(!btn||btn.dataset.v213Excel==='1')return; btn.dataset.v213Excel='1'; btn.disabled=false; btn.removeAttribute('disabled'); btn.addEventListener('click',function(ev){ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); window.exportExcel();},true);}
  function applyAll(){refreshVersion(); applySummaryIncomeTips(); applyBudgetIncomeTips(); applyBudgetDonationCombinedTip(); applyGraphTips(); wireExcel();}
  const prevRender=typeof render==='function'?render:null; if(prevRender&&!prevRender.__v213Wrapped){const wrapped=function(){const ret=prevRender.apply(this,arguments); setTimeout(applyAll,260); setTimeout(applyAll,760); setTimeout(applyAll,1400); return ret;}; wrapped.__v213Wrapped=true; render=wrapped; window.render=render;}
  ['DOMContentLoaded','load'].forEach(evt=>window.addEventListener(evt,()=>{setTimeout(applyAll,280); setTimeout(applyAll,900); setTimeout(applyAll,1700); setTimeout(applyAll,2600);}));
  applyAll(); setTimeout(applyAll,500); setTimeout(applyAll,1500); setTimeout(applyAll,3000);
})();
