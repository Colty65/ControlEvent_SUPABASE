/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #33. */
/* ==== V21.2: separación CARGA/MANTENIMIENTO, backup y globos finales ==== */
(function(){
  const VERSION='ControlEvent v26.6';
  const VERSION_FILE='ControlEvent_v26_6';
  const $=id=>document.getElementById(id);
  const norm=v=>String(v??'').trim();
  const up=v=>norm(v).toUpperCase();
  const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const money=v=>{try{ if(typeof formatEuro==='function') return formatEuro(Number(v||0)); }catch(_){} try{ if(typeof money==='function') return money(Number(v||0)); }catch(_){} return Number(v||0).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';};
  const num=v=>Number(v||0).toLocaleString('es-ES');
  const cmp=(a,b)=>up(a).localeCompare(up(b),'es');
  function st(){try{return state||{};}catch(_){return window.state||{};}}
  function ev(){try{if(typeof currentEvent==='function') return currentEvent()||{};}catch(_){} const s=st(); return (s.eventos||[]).find(e=>String(e.id)===String(s.selectedEventId))||{};}
  function evId(){return String(ev().id||st().selectedEventId||'');}
  function arr(n){const s=st();return Array.isArray(s[n])?s[n]:[];}
  function byId(list,id){return arr(list).find(x=>String(x.id)===String(id))||{};}
  function persona(id){try{const x=typeof personaById==='function'?personaById(id):null; if(x)return x;}catch(_){} return byId('personas',id);}
  function producto(id){try{const x=typeof productoById==='function'?productoById(id):null; if(x)return x;}catch(_){} return byId('productos',id);}
  function tienda(id){try{const x=typeof tiendaById==='function'?tiendaById(id):null; if(x)return x;}catch(_){} return byId('tiendas',id);}
  function ingresos(){try{if(typeof collabsForEvent==='function')return collabsForEvent()||[];}catch(_){} const id=evId(); return arr('colaboradores').filter(r=>String(r.eventId||'')===id);}
  function compras(){try{if(typeof comprasForEvent==='function')return comprasForEvent()||[];}catch(_){} const id=evId(); return arr('compras').filter(r=>String(r.eventId||'')===id);}
  function pName(c){return c?.producto?.nombre||producto(c?.productoId).nombre||'Producto';}
  function tName(c){const p=producto(c?.productoId);return c?.tienda?.nombre||tienda(c?.tiendaId||p.tiendaId||p.defaultTiendaId).nombre||'Sin tienda';}
  function donor(c){try{if(typeof resolveDonorNameV171==='function')return resolveDonorNameV171(c)||'Sin donante';}catch(_){} try{if(typeof donorLabel==='function'&&c?.donorRef)return donorLabel(c.donorRef)||'Sin donante';}catch(_){} const raw=norm(c?.donorRef||c?.donante||c?.donanteNombre||''); if(raw.startsWith('P:'))return persona(raw.slice(2)).nombre||'Sin donante'; if(raw.startsWith('T:'))return tienda(raw.slice(2)).nombre||'Sin donante'; return raw||c?.donorLabel||'Sin donante';}
  function ticket(c){return norm(c?.ticketDonacion||'');}
  function isDon(v){try{if(typeof isDonationTicket==='function')return isDonationTicket(v);}catch(_){} return up(v).startsWith('DONADO');}
  function isCurrent(v){try{if(typeof isCurrentExpenseTicket==='function')return isCurrentExpenseTicket(v);}catch(_){} return up(v)==='GASTOS CORRIENTES';}
  function price(c){const p=producto(c?.productoId);return Number(c?.precio!=null?c.precio:(c?.precioCalc!=null?c.precioCalc:(p.defaultPrecio??p.precio??0)));}
  function val(c){return Number(c?.valor!=null?c.valor:price(c)*Number(c?.unidades||0));}
  function totalIngreso(r){const per=r.persona||persona(r.personaId)||{}; const precio=Number(ev().precio||0); const n=Number(r.numero||0); const esSocio=up(per.rango)==='SOCIO'; const socio=esSocio?Number(r.base!=null?r.base:n*precio):0; const vol=Number(r.donation!=null?r.donation:(r.importe||0)); return Number(r.total!=null?r.total:socio+vol);}
  function ingresoVals(r){const per=r.persona||persona(r.personaId)||{}; const precio=Number(ev().precio||0); const n=Number(r.numero||0); const esSocio=up(per.rango)==='SOCIO'; const socio=esSocio?Number(r.base!=null?r.base:n*precio):0; const vol=Number(r.donation!=null?r.donation:(r.importe||0)); const total=Number(r.total!=null?r.total:socio+vol); const pend=up(r.situacion)==='PENDIENTE'; return {nombre:per.nombre||r.nombre||'Sin nombre',n,socio,vol,ing:pend?0:total,pte:pend?total:0,total};}
  function setTip(el,text,bg='#fff',layout='default'){if(!el||!norm(text))return; el.setAttribute('data-ce-tip-v21',text); el.setAttribute('data-tip-bg-v21',bg||'#fff'); el.setAttribute('data-ce-tip-layout-v21',layout||'default'); ['data-ce-tip-v196','data-ce-tip-v1952','data-ce-tip','data-v181-tip','data-tip','title'].forEach(a=>el.removeAttribute(a));}

  function refreshVersion(){
    try{document.title=VERSION;}catch(_){}
    document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||''))el.textContent=VERSION;});
    const proto=HTMLAnchorElement.prototype;
    if(!proto.click.__v212Wrapped){
      const prev=proto.click;
      const wrapped=function(){try{if(this.download)this.download=normalizeDownloadName(this.download);}catch(_){} return prev.apply(this,arguments);};
      wrapped.__v212Wrapped=true; proto.click=wrapped;
    }
  }
  function sanitizeTitle(t){return norm(t||'EVENTO').replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,'_').replace(/_+/g,'_').slice(0,90)||'EVENTO';}
  function ymd(d){return d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');}
  function hms(d){return String(d.getHours()).padStart(2,'0')+'_'+String(d.getMinutes()).padStart(2,'0')+'_'+String(d.getSeconds()).padStart(2,'0');}
  function normalizeDownloadName(name){
    let n=String(name||''); const now=new Date();
    n=n.replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig,VERSION_FILE);
    n=n.replace(/^(ControlEvent_v\d+_\d+(?:_\d+)?)_BACKUP_(.+?)_(\d{2})(\d{2})(\d{4})[-_](\d{2})[:_](\d{2})[:_](\d{2})\.xlsx$/i,(_m,v,scope,dd,mm,yyyy,hh,mi,ss)=>`${VERSION_FILE}_BACKUP_${sanitizeTitle(scope)}_${yyyy}${mm}${dd}_${hh}_${mi}_${ss}.xlsx`);
    n=n.replace(/^(ControlEvent_v\d+_\d+(?:_\d+)?)_BACKUP_(.+?)_(\d{4})(\d{2})(\d{2})[-_](\d{2})[:_](\d{2})[:_](\d{2})\.xlsx$/i,(_m,v,scope,yyyy,mm,dd,hh,mi,ss)=>`${VERSION_FILE}_BACKUP_${sanitizeTitle(scope)}_${yyyy}${mm}${dd}_${hh}_${mi}_${ss}.xlsx`);
    if(/^ControlEvent_v\d+_\d+(?:_\d+)?_descarga_datos\.xlsx$/i.test(n)) n=`${VERSION_FILE}_BACKUP_TODOS_${ymd(now)}_${hms(now)}.xlsx`;
    return n;
  }
  // Como exportSeedWorkbook usa una función de nombre cerrada en otro parche, normalizamos también el título del evento del backup en el momento del click del enlace.
  function currentBackupTitleFromUI(){const sel=$('ceBackupScopeV181'); if(!sel) return ''; if(sel.value==='TODOS')return 'TODOS'; const opt=sel.options[sel.selectedIndex]; return opt?opt.textContent:'';}
  document.addEventListener('click',function(ev){const ok=ev.target?.closest?.('#ceBackupOkV181'); if(ok){const title=currentBackupTitleFromUI(); if(title) window.__ceLastBackupTitleV212=sanitizeTitle(title);}},true);
  const proto=HTMLAnchorElement.prototype;
  if(!proto.click.__v212BackupTitleWrapped){
    const prev=proto.click;
    const wrapped=function(){try{if(this.download&&/_BACKUP_/i.test(this.download)&&window.__ceLastBackupTitleV212){this.download=this.download.replace(/(_BACKUP_)(.+?)(_[0-9]{8}[-_][0-9]{2}[:_][0-9]{2}[:_][0-9]{2}\.xlsx)$/i, `$1${window.__ceLastBackupTitleV212}$3`); this.download=normalizeDownloadName(this.download);}}catch(_){} return prev.apply(this,arguments);};
    wrapped.__v212BackupTitleWrapped=true; proto.click=wrapped;
  }

  function forceImportOnly(){
    const wrap=$('maintenanceWrapper'); if(!wrap)return;
    try{currentMaintTab='importar';}catch(_){}
    wrap.classList.remove('hidden'); wrap.classList.add('ce-import-only-v212');
    ['mtPersonas','mtEventos','mtTiendas','mtProductos','mtAcceso'].forEach(id=>{const el=$(id); if(el)el.classList.add('hidden');});
    const imp=$('mtImportar'); if(imp)imp.classList.remove('hidden');
    const btn=$('btnToggleMaintenance'); if(btn){btn.classList.remove('maint-btn-open'); btn.classList.add('maint-btn-closed');}
  }
  function forceMaintenanceToggle(){
    const wrap=$('maintenanceWrapper'); if(!wrap)return;
    const visible=!wrap.classList.contains('hidden')&&!wrap.classList.contains('ce-import-only-v212');
    if(visible){wrap.classList.add('hidden'); wrap.classList.remove('ce-import-only-v212'); const b=$('btnToggleMaintenance'); if(b){b.classList.remove('maint-btn-open'); b.classList.add('maint-btn-closed');} return;}
    wrap.classList.remove('hidden','ce-import-only-v212'); try{currentMaintTab='personas';}catch(_){}
    try{renderMaintenance();}catch(_){} try{renderMaintenanceTabs();}catch(_){}
    ['mtPersonas','mtEventos','mtTiendas','mtProductos'].forEach((id,i)=>{const el=$(id); if(el)el.classList.toggle('hidden',i!==0);});
    const imp=$('mtImportar'); if(imp)imp.classList.add('hidden');
    const b=$('btnToggleMaintenance'); if(b){b.classList.add('maint-btn-open'); b.classList.remove('maint-btn-closed');}
  }
  window.addEventListener('click',function(ev){
    const btn=ev.target?.closest?.('button'); if(!btn)return;
    if(btn.id==='btnOpenImport'){ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); forceImportOnly(); return false;}
    if(btn.id==='btnToggleMaintenance'){ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); forceMaintenanceToggle(); return false;}
  },true);

  function applyBudgetIncomeTips(){
    const rows=ingresos();
    const socios=rows.filter(r=>up((r.persona||persona(r.personaId)||{}).rango)==='SOCIO');
    const nosocios=rows.filter(r=>up((r.persona||persona(r.personaId)||{}).rango)!=='SOCIO');
    const make=(title,baseRows,mode)=>{
      let list=baseRows.slice(); if(mode==='ing')list=list.filter(r=>up(r.situacion)!=='PENDIENTE'); if(mode==='pte')list=list.filter(r=>up(r.situacion)==='PENDIENTE');
      list.sort((a,b)=>cmp((a.persona||persona(a.personaId)||{}).nombre,(b.persona||persona(b.personaId)||{}).nombre));
      const total=list.reduce((a,b)=>a+totalIngreso(b),0);
      const body=list.map(r=>{const v=ingresoVals(r); return `${v.nombre} | ${num(v.n)} | ${money(v.socio)} | ${money(v.vol)} | ${money(v.ing)} | ${money(v.pte)} | ${money(v.total)}`;}).join('\n')||'Sin registros';
      return `${title}\nTOTAL: ${money(total)}\n\nNombre | Nº | Importe socio | Importe voluntario | Ingresado | Pendiente | Total\n${body}`;
    };
    document.querySelectorAll('#budgetLayout .budget-subrow').forEach(row=>{
      const label=norm(row.querySelector('span')?.textContent||''); if(!label)return; const prev=row.closest('.budget-subrows')?.previousElementSibling?.textContent||''; const isNo=/NO\s+SOCIOS/i.test(prev); let text='';
      if(label==='Personas')text=make(`${isNo?'NO SOCIOS':'SOCIOS'} / PERSONAS`,isNo?nosocios:socios,'all');
      else if(/Importe socios/i.test(label))text=make('SOCIOS / IMPORTE SOCIO',socios,'all');
      else if(/Ingresado socios/i.test(label))text=make('SOCIOS / INGRESADO SOCIO',socios,'ing');
      else if(/Pendiente socios/i.test(label))text=make('SOCIOS / PENDIENTE SOCIO',socios,'pte');
      else if(/Importe no socios|Importe donantes/i.test(label))text=make('NO SOCIOS / IMPORTE NO SOCIO',nosocios,'all');
      else if(/Ingresado no socios|Ingresado donantes/i.test(label))text=make('NO SOCIOS / INGRESADO NO SOCIO',nosocios,'ing');
      else if(/Pendiente no socios|Pendiente donantes/i.test(label))text=make('NO SOCIOS / PENDIENTE NO SOCIO',nosocios,'pte');
      if(text){setTip(row,text,'#fff','incomev212'); row.querySelectorAll('span,strong').forEach(x=>setTip(x,text,'#fff','incomev212'));}
    });
  }

  function incomeRowsFor(label){
    const l=up(label); const socio=l.includes('SOCIOS')&&!l.includes('NO SOCIOS'); const noSocio=l.includes('NO SOCIOS'); const pending=l.includes('PENDIENTE'); let method=''; if(l.includes('BANCO'))method='BANCO'; else if(l.includes('BIZUM'))method='BIZUM'; else if(l.includes('EFECTIVO'))method='EFECTIVO';
    const rows=ingresos().filter(r=>{const rango=up((r.persona||persona(r.personaId)||{}).rango); const sit=up(r.situacion||''); if(pending)return sit==='PENDIENTE'; if(method&&sit!==method)return false; if(socio)return rango==='SOCIO'; if(noSocio)return rango!=='SOCIO'; return true;}).sort((a,b)=>cmp((a.persona||persona(a.personaId)||{}).nombre,(b.persona||persona(b.personaId)||{}).nombre));
    return rows.map(r=>{const v=ingresoVals(r); return `${v.nombre} | ${num(v.n)} | ${money(v.socio)} | ${money(v.vol)} | ${money(v.total)}`;});
  }
  function donationRowsGrouped(code){
    const rows=compras().filter(c=>ticket(c)===code).sort((a,b)=>cmp(donor(a),donor(b))||cmp(pName(a),pName(b))); const out=[]; let cur=null,total=0;
    rows.forEach((c,idx)=>{const d=donor(c); if(cur!==null&&d!==cur){out.push(`TOTAL DONANTE ${cur} | | | ${money(total)}`); out.push(''); total=0;} cur=d; const u=Number(c.unidades||0), pr=price(c), v=val(c); total+=v; out.push(`${d} | ${pName(c)} | ${num(u)} uds x ${money(pr)} | ${money(v)}`); if(idx===rows.length-1){out.push(`TOTAL DONANTE ${d} | | | ${money(total)}`);}});
    return out;
  }
  function expenseRowsGrouped(kind){
    const rows=compras().filter(c=>{const tk=ticket(c); if(kind==='ticket')return !isDon(tk)&&!isCurrent(tk)&&tk!==''; if(kind==='current')return isCurrent(tk); return !isDon(tk)&&tk==='';}).sort((a,b)=>cmp(ticket(a)||'PTE.COMPRA',ticket(b)||'PTE.COMPRA')||cmp(tName(a),tName(b))||cmp(pName(a),pName(b)));
    const out=[]; let cur=null,total=0;
    rows.forEach((c,idx)=>{const tk=kind==='current'?'GASTOS CORRIENTES':(ticket(c)||'PTE.COMPRA'); if(cur!==null&&tk!==cur){out.push(`TOTAL ${cur} | | | | ${money(total)}`); out.push(''); total=0;} cur=tk; const u=Number(c.unidades||0), pr=price(c), v=val(c); total+=v; out.push(`${tk} | ${tName(c)} | ${pName(c)} | ${num(u)} uds x ${money(pr)} | ${money(v)}`); if(idx===rows.length-1){out.push(`TOTAL ${tk} | | | | ${money(total)}`);}});
    return out;
  }
  function tipTitle(title,total,lines,header){return `${title}\nTOTAL: ${money(total)}\n\n${header}\n${lines.length?lines.join('\n'):'Sin registros'}`;}
  function applyGraphTips(){
    const wrap=$('eventChartWrap'); if(!wrap)return; let g=null; try{g=typeof graphPartsV171==='function'?graphPartsV171():null;}catch(_){} if(!g)return; const rows=wrap.querySelectorAll('.chart-row');
    const incomeSegs=rows[0]?.querySelectorAll?.('.chart-seg')||[];
    incomeSegs.forEach((seg,i)=>{const item=g.incomeItems?.[i]; if(!item)return; const lines=incomeRowsFor(item.label||''); setTip(seg,tipTitle(item.label||'INGRESOS',item.value||0,lines,'Nombre | Nº | Importe socio | Importe voluntario | Total'),item.color||getComputedStyle(seg).backgroundColor||'#fff','graphincomev212');});
    const donSegs=rows[1]?.querySelectorAll?.('.chart-seg')||[]; const donSpecs=[['Donado por tiendas','DONADO TIENDA',g.donationItems?.[0]],['Donado por socios','DONADO SOCIO',g.donationItems?.[1]],['Donado por no socios','DONADO OTROS',g.donationItems?.[2]]];
    donSegs.forEach((seg,i)=>{const [title,code,item]=donSpecs[i]||[]; if(!item)return; const lines=donationRowsGrouped(code); setTip(seg,tipTitle(title,item.value||0,lines,'Donante | Producto | Uds x precio | Total'),item.color||getComputedStyle(seg).backgroundColor||'#fff','graphdonationv212');});
    const expSegs=rows[2]?.querySelectorAll?.('.chart-seg')||[]; const expSpecs=[['Gastado por ticket','ticket',g.expenseItems?.[0]],['Gastos corrientes','current',g.expenseItems?.[1]],['Pendiente de compra','pending',g.expenseItems?.[2]]];
    expSegs.forEach((seg,i)=>{const [title,kind,item]=expSpecs[i]||[]; if(!item)return; const lines=expenseRowsGrouped(kind); setTip(seg,tipTitle(title,item.value||0,lines,'Ticket | Tienda | Producto | Uds x precio | Total'),item.color||getComputedStyle(seg).backgroundColor||'#fff','graphexpensev212');});
  }
  function applyAll(){refreshVersion(); applyBudgetIncomeTips(); applyGraphTips();}
  const prevRender=typeof render==='function'?render:null;
  if(prevRender&&!prevRender.__v212Wrapped){const wrapped=function(){const ret=prevRender.apply(this,arguments); setTimeout(applyAll,180); setTimeout(applyAll,620); return ret;}; wrapped.__v212Wrapped=true; render=wrapped; window.render=render;}
  ['DOMContentLoaded','load'].forEach(evt=>window.addEventListener(evt,()=>{setTimeout(applyAll,240); setTimeout(applyAll,900); setTimeout(applyAll,1600);}));
  applyAll(); setTimeout(applyAll,450); setTimeout(applyAll,1300);
})();
