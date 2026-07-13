/* ControlEvent v21_prod - HOTFIX5: avance ColtyLAB ligero y sin bloqueo.
   FIX5: Avance definitivo (sin numeración), compras/donaciones valoradas e INFO SOCIOS canónico. */
(function(){
  'use strict';
  if(window.__ceV16Hotfix5LogoAvanceLigero) return;
  window.__ceV16Hotfix5LogoAvanceLigero=true;

  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const txt=v=>String(v??'').trim();
  const up=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const norm=v=>up(v).replace(/[^A-Z0-9Ñ ]+/g,' ').replace(/\s+/g,' ').trim();
  const num=v=>{ if(typeof v==='number') return Number.isFinite(v)?v:0; let s=String(v??'').replace(/[^0-9,.-]/g,'').trim(); if(!s) return 0; if(s.includes('.')&&s.includes(',')) s=s.replace(/\./g,'').replace(',','.'); else if(s.includes(',')) s=s.replace(',','.'); const n=Number(s); return Number.isFinite(n)?n:0; };
  const eur=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(num(v));
  const safe=(fn,fb)=>{try{const v=fn(); return v===undefined?fb:v;}catch(_){return fb;}};
  const st=()=>safe(()=> (typeof state!=='undefined'&&state)||window.state||window.ControlEventApp?.state||{}, window.state||window.ControlEventApp?.state||{});
  const arr=name=>Array.isArray(st()[name])?st()[name]:[];
  const evId=()=>txt($('selectedEvent')?.value || st().selectedEventId || '');
  function selectedEvent(){
    const id=evId();
    return arr('eventos').find(e=>String(e?.id||'')===id) || safe(()=> typeof window.selectedEvent==='function'?window.selectedEvent():null,null) || {};
  }
  function title(){ return txt(selectedEvent().titulo || $('selectedEvent')?.selectedOptions?.[0]?.textContent || 'Evento'); }
  function finalizado(){ return up(selectedEvent().situacion||selectedEvent().estado||'')==='FINALIZADO'; }
  function imageKeyPresent(key){
    const s=st(); const raw=String(key||''); const compact=raw.replace(/\s+/g,'');
    return !!(s.ticketImages?.[raw]||s.ticketImageRefs?.[raw]||s.ticketImages?.[compact]||s.ticketImageRefs?.[compact]);
  }
  function docCode(value){ const m=String(value||'').toUpperCase().match(/DOC\s*(\d+)/); return m?'DOC'+String(Number(m[1])).padStart(2,'0'):''; }
  function rowEventId(row){return txt(row?.eventId||row?.event_id||row?.eventoId||row?.evento_id||row?.EVENTO_ID||'');}
  function rowPersonaId(row){return txt(row?.personaId||row?.persona_id||row?.persona||row?.persona_id_fk||row?.PERSONA_ID||'');}
  function rowName(row){
    const pid=rowPersonaId(row);
    const p=pid?arr('personas').find(x=>String(x?.id||'')===String(pid)):null;
    return txt(p?.nombre||row?.nombre||row?.personaNombre||row?.persona||row?.colaborador||row?.donante||row?.responsable||'');
  }
  function rowProducto(row){ const id=txt(row?.productoId||row?.producto_id||''); return id?arr('productos').find(p=>String(p?.id||'')===id):null; }
  function ticketText(row){return up([row?.ticketDonacion,row?.ticket,row?.ticket_donacion,row?.ticketOtrosGastos,row?.situacion,row?.estado,row?.tipo,row?.tipoCompra,row?.categoria].filter(Boolean).join(' '));}
  function isDonation(row){ const t=ticketText(row); return t.startsWith('DONADO') || t.includes('DONACION'); }
  function isTk(row){ return /\bTK\s*\d+/.test(ticketText(row)); }
  function isGastoCorriente(row){ const t=ticketText(row); return /GASTOS?\s+CORRIENTES?/.test(t) || (/GASTO/.test(t)&&/CORRIENTE/.test(t)); }
  function isPteCompra(row){
    const t=ticketText(row);
    if(isDonation(row) || isTk(row) || isGastoCorriente(row)) return false;
    if(/PTE|PENDIENTE|COMPRA/.test(t)) return true;
    return true;
  }
  function unitPrice(row){
    const p=rowProducto(row)||{};
    const vals=[row?.precio,row?.precioCalc,row?.precio_calc,row?.defaultPrecio,p?.defaultPrecio,p?.precio,p?.precioRfa,p?.precioReferencia];
    for(const v of vals){ if(v!==undefined && v!==null && txt(v)!==''){ const n=num(v); if(Number.isFinite(n) && n!==0) return n; } }
    return 0;
  }
  function rowValue(row){
    const keys=['importe','valor','total','importeCompra','importeTotal','descuento','importeDescuento','discount','amount'];
    for(const k of keys){
      if(row && row[k]!==undefined && row[k]!==null && txt(row[k])!==''){
        const n=num(row[k]);
        if(Number.isFinite(n) && n!==0) return n;
      }
    }
    return num(row?.unidades||1)*unitPrice(row);
  }

  function socioBasePermitido(p){
    const n=txt(p?.nombre||p?.Nombre||p?.NOMBRE||'');
    if(up(p?.rango||p?.Rango||p?.RANGO||'')!=='SOCIO') return false;
    if(/^z_DEV/i.test(n)) return false;
    if(/^Grupo/i.test(n)) return false;
    if(/^Peña/i.test(n)) return false;
    return !!n;
  }
  function isSocioGrupoY(p){ return /\s+y\s+/i.test(txt(p?.nombre||p?.Nombre||p?.NOMBRE||'')); }
  function partsGrupoY(name){ return norm(name).split(/\s+Y\s+/).map(x=>x.trim()).filter(Boolean); }
  function singleCoveredByGroup(single, groupName, parts){
    const s=norm(single); const g=norm(groupName);
    if(!s || s.length<3) return false;
    if(g.includes(s)) return true;
    return (parts||[]).some(part=>{
      const p=norm(part); if(!p || p.length<3) return false;
      if(p===s || p.includes(s) || s.includes(p)) return true;
      const pf=p.split(' ')[0]||'', sf=s.split(' ')[0]||'';
      return pf.length>=4 && sf.length>=4 && pf===sf;
    });
  }
  function sociosCanonicos(){
    const base=arr('personas').filter(socioBasePermitido);
    const grupos=base.filter(isSocioGrupoY).map(p=>({p, name:txt(p.nombre||p.Nombre||p.NOMBRE||''), parts:partsGrupoY(p.nombre||p.Nombre||p.NOMBRE||'')}));
    const out=[]; const seen=new Set();
    grupos.forEach(g=>{ const id=String(g.p.id||g.name); if(!seen.has(id)){ seen.add(id); out.push({...g.p,__ceSocioCanonicoNombre:g.name,__ceSocioCanonicoPartes:g.parts,__ceSocioCanonicoNumero:Math.max(2,g.parts.length||2)}); } });
    base.forEach(p=>{
      const name=txt(p.nombre||p.Nombre||p.NOMBRE||'');
      if(isSocioGrupoY(p)) return;
      if(grupos.some(g=>singleCoveredByGroup(name,g.name,g.parts))) return;
      const id=String(p.id||name); if(seen.has(id)) return;
      seen.add(id); out.push({...p,__ceSocioCanonicoNombre:name,__ceSocioCanonicoPartes:[norm(name)],__ceSocioCanonicoNumero:1});
    });
    return out.sort((a,b)=>txt(a.__ceSocioCanonicoNombre||a.nombre||'').localeCompare(txt(b.__ceSocioCanonicoNombre||b.nombre||''),'es',{sensitivity:'base'}));
  }
  function collabMatchesPart(c, part){
    const cn=norm(rowName(c)); const p=norm(part); if(!cn || !p) return false;
    return cn===p || cn.includes(p) || p.includes(cn) || (cn.split(' ')[0] && cn.split(' ')[0]===p.split(' ')[0] && cn.split(' ')[0].length>=4);
  }
  function asistenciaSocio(p, colaboradores){
    const pid=txt(p?.id||p?.ID||p?.personaId||'');
    const nombre=txt(p.__ceSocioCanonicoNombre||p.nombre||p.Nombre||p.NOMBRE||'');
    const size=Number(p.__ceSocioCanonicoNumero||1)||1;
    const parts=Array.isArray(p.__ceSocioCanonicoPartes)?p.__ceSocioCanonicoPartes:partsGrupoY(nombre);
    const direct=colaboradores.some(c=>{ const cid=rowPersonaId(c); return pid && cid && String(pid)===String(cid); }) || colaboradores.some(c=>norm(rowName(c))===norm(nombre));
    if(direct) return {nombre,size,count:size,partial:false};
    if(size>1){
      let count=0;
      parts.forEach(part=>{ if(colaboradores.some(c=>collabMatchesPart(c,part))) count+=1; });
      count=Math.min(size,count);
      return {nombre,size,count,partial:count>0 && count<size};
    }
    const count=colaboradores.some(c=>collabMatchesPart(c,nombre))?1:0;
    return {nombre,size,count,partial:false};
  }
  function infoSociosHtml(items){
    const asisten=items.filter(x=>x.count>0).sort((a,b)=>a.nombre.localeCompare(b.nombre,'es',{sensitivity:'base'}));
    const faltan=items.filter(x=>x.count<x.size).sort((a,b)=>a.nombre.localeCompare(b.nombre,'es',{sensitivity:'base'}));
    const chipAs=x=>`<span class="ce-v21-socio-chip asiste">${esc(x.nombre)}${x.size>1?` (${x.count}/${x.size})`:''}</span>`;
    const chipNo=x=>`<span class="ce-v21-socio-chip no-asiste">${esc(x.nombre)}${x.size>1?` (falta ${x.size-x.count}/${x.size})`:''}</span>`;
    return `<div class="ce-v21-socios-grid"><div><b>Asistentes</b><div class="ce-v21-socios-scroll">${asisten.map(chipAs).join('')||'<small>Sin asistentes</small>'}</div></div><div><b>No asistentes</b><div class="ce-v21-socios-scroll">${faltan.map(chipNo).join('')||'<small>Sin no asistentes</small>'}</div></div></div>`;
  }

  function budgetIncome(){
    const app=window.ControlEventApp || window.__CONTROL_EVENT_APP__ || window;
    const candidates=[()=>app?.calculations?.budgetSummary?.(),()=>window.ControlEventDomain?.api?.budgetSummary?.(),()=>window.budgetSummary?.()];
    for(const fn of candidates){
      const b=safe(fn,null);
      if(!b || typeof b!=='object') continue;
      const id=b.ingresosDinero||{}; const op=b.operativa||{};
      const socios=id.socios||{}; const noSocios=id.noSocios||id.donantes||{};
      let previsto=num(id.totalComprometido ?? op.ingresos);
      if(!previsto) previsto=num(socios.importe)+num(noSocios.importe);
      let ingresado=num(id.totalIngresado ?? op.ingresoDinero ?? op.ingresado);
      if(!ingresado && (socios.ingresado!=null || noSocios.ingresado!=null)) ingresado=num(socios.ingresado)+num(noSocios.ingresado);
      if(!ingresado && previsto && num(id.pendiente??0)===0) ingresado=previsto;
      if(previsto || ingresado) return {previsto:previsto||ingresado, ingresado};
    }
    return null;
  }

  function avanceRows(){
    const id=evId(); const ev=selectedEvent(); const precio=num(ev.precio||0);
    const col=arr('colaboradores').filter(c=>rowEventId(c)===id || String(c.eventId||c.event_id||'')===id);
    let previsto=col.reduce((sum,c)=>sum+(num(c.obligatorio)||(num(c.numero)*precio))+num(c.importeVoluntario??c.voluntario??c.importe),0);
    let ingresado=col.filter(c=>up(c.situacion||c.formaPago||c.ingreso||'Pendiente')!=='PENDIENTE')
      .reduce((sum,c)=>sum+(num(c.obligatorio)||(num(c.numero)*precio))+num(c.importeVoluntario??c.voluntario??c.importe),0);
    const bi=budgetIncome(); if(bi && bi.previsto){ previsto=bi.previsto; ingresado=bi.ingresado; }
    const fotosIng=col.filter(c=>imageKeyPresent(`${id}|INGRESO:${c.id}`)||imageKeyPresent(`${id}|INGRESO|${c.id}`)).length;
    const compras=arr('compras').filter(c=>rowEventId(c)===id || String(c.eventId||c.event_id||'')===id);
    const don=compras.filter(isDonation);
    const comp=compras.filter(c=>!isDonation(c));
    const tkGastos=comp.filter(c=>isTk(c)||isGastoCorriente(c));
    const ptes=comp.filter(isPteCompra);
    const totalDon=don.reduce((s,r)=>s+rowValue(r),0);
    const totalTk=tkGastos.reduce((s,r)=>s+rowValue(r),0);
    const totalPte=ptes.reduce((s,r)=>s+rowValue(r),0);
    const totalComp=comp.reduce((s,r)=>s+rowValue(r),0);
    const docs=(Array.isArray(st().eventDocuments)?st().eventDocuments:[]).filter(d=>rowEventId(d)===id || String(d.eventId||d.event_id||'')===id);
    const docKeys=new Set(docs.map(d=>`${id}|${docCode(d.codigo||d.imageKey||d.id)}`).filter(k=>!k.endsWith('|')));
    Object.keys(st().ticketImages||{}).forEach(k=>{ if(k.startsWith(id+'|') && /DOC\s*\d+/i.test(k)) docKeys.add(k); });
    const tickets=[...new Set(comp.map(c=>txt(c.ticket||c.ticketDonacion||c.ticket_donacion||'').toUpperCase()).filter(v=>/TK\s*\d+/i.test(v)))];
    const ticketPhotos=tickets.filter(tk=>Object.keys(st().ticketImages||{}).some(k=>k.startsWith(id+'|')&&k.toUpperCase().includes(tk))).length;
    const socios=sociosCanonicos();
    const info=socios.map(p=>asistenciaSocio(p,col));
    const totalSocios=info.reduce((s,x)=>s+x.size,0);
    const asistentes=info.reduce((s,x)=>s+x.count,0);
    const noAsistentes=Math.max(0,totalSocios-asistentes);
    return [
      {t:'INGRESOS',color:'blue',p:previsto?Math.min(100,ingresado/previsto*100):0,d:`${eur(ingresado)} de ${eur(previsto)} ingresados`},
      {t:'JUSTIFICANTES DE INGRESOS',color:'green',p:col.length?fotosIng/col.length*100:0,d:`${fotosIng} de ${col.length} ingresos con justificante`},
      {t:'DONACIONES',color:'orange',p:don.length?100:0,d:`Donaciones registradas: ${don.length} · Valor estimado: ${eur(totalDon)}`},
      {t:'COMPRAS',color:'red',p:comp.length?tkGastos.length/comp.length*100:0,d:`TKxx/gastos corrientes: ${tkGastos.length} · ${eur(totalTk)} · Pte. compra: ${ptes.length} · ${eur(totalPte)} · Total líneas: ${comp.length} · ${eur(totalComp)}`},
      {t:'JUSTIFICANTES DE COMPRA',color:'purple',p:tickets.length?ticketPhotos/tickets.length*100:0,d:`${ticketPhotos} de ${tickets.length} tickets contables con foto adjunta`},
      {t:'DOCUMENTOS',color:'green',p:docKeys.size?100:0,d:`${docKeys.size} documento(s) adjunto(s)`},
      {t:'INFO SOCIOS',color:'slate',p:totalSocios?asistentes/totalSocios*100:0,d:`Socios: ${totalSocios} · Asistentes: ${asistentes} · No asistentes: ${noAsistentes}`,html:infoSociosHtml(info)}
    ];
  }

  function injectStyle(){
    if($('ceV16Hf5Style')) return;
    const s=document.createElement('style'); s.id='ceV16Hf5Style';
    s.textContent=`
      #ceHf47AvanceBubbleLayer,#ceHf48AvanceLayer{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      .ce-brand-logo-safe{cursor:pointer!important;display:block!important;max-width:58px!important;max-height:58px!important;width:auto!important;height:auto!important;}
      #ceV16Hf5AvanceLayer{position:fixed!important;inset:0!important;z-index:2147483000!important;display:none!important;align-items:center!important;justify-content:center!important;background:rgba(15,23,42,.18)!important;padding:10px!important;}
      #ceV16Hf5AvanceLayer.visible{display:flex!important;}
      .ce-v16hf5-bubble{position:relative!important;width:min(920px,96vw)!important;max-height:min(86vh,760px)!important;overflow:auto!important;background:#fff!important;border:3px solid #0f172a!important;border-radius:24px!important;box-shadow:0 24px 74px rgba(15,23,42,.34)!important;padding:20px!important;}
      .ce-v16hf5-bubble.finalizado{border-color:#dc2626!important}.ce-v16hf5-bubble.curso{border-color:#16a34a!important}
      .ce-v16hf5-close{position:absolute!important;right:12px!important;top:10px!important;width:42px!important;height:42px!important;border-radius:999px!important;border:2px solid #0f172a!important;background:#fff!important;color:#0f172a!important;font-size:30px!important;font-weight:950!important;line-height:32px!important;cursor:pointer!important;z-index:5!important;box-shadow:0 3px 10px rgba(15,23,42,.18)!important;}
      .ce-v16hf5-title{text-align:center!important;margin:4px 48px 16px!important;line-height:1.15!important}.ce-v16hf5-title span{display:block!important;font-size:14px!important;letter-spacing:.15em!important;color:#64748b!important;font-weight:950!important}.ce-v16hf5-title strong{display:block!important;font-size:clamp(22px,4vw,31px)!important;font-weight:950!important}.ce-v16hf5-bubble.finalizado .ce-v16hf5-title strong{color:#991b1b!important}.ce-v16hf5-bubble.curso .ce-v16hf5-title strong{color:#15803d!important}
      .ce-v16hf5-rows{display:grid!important;gap:10px!important}.ce-v16hf5-row{display:grid!important;grid-template-columns:1fr 76px minmax(130px,.75fr)!important;gap:10px!important;align-items:center!important;border:2px solid var(--ce-av-color)!important;background:var(--ce-av-bg)!important;border-radius:16px!important;padding:11px!important}.ce-v16hf5-row b{font-size:16px!important;font-weight:950!important}.ce-v16hf5-row small{display:block!important;font-size:13px!important;color:#334155!important;font-weight:800!important;margin-top:3px!important}.ce-v16hf5-row>strong{text-align:right!important;font-size:15px!important}.ce-v16hf5-bar{height:12px!important;background:#e5e7eb!important;border-radius:999px!important;overflow:hidden!important}.ce-v16hf5-bar i{display:block!important;height:100%!important;border-radius:999px!important;background:var(--ce-av-color)!important}
      .ce-v21-socios-grid{grid-column:1/-1!important;display:grid!important;grid-template-columns:1fr 1fr!important;gap:10px!important;margin-top:6px!important}.ce-v21-socios-grid>div{background:rgba(255,255,255,.72)!important;border:1px solid #dbe4ef!important;border-radius:14px!important;padding:9px!important;min-width:0!important}.ce-v21-socios-grid b{display:block!important;font-size:14px!important;margin-bottom:6px!important}.ce-v21-socios-scroll{display:flex!important;flex-wrap:wrap!important;gap:5px 7px!important;max-height:150px!important;overflow:auto!important;padding-right:4px!important}.ce-v21-socio-chip{display:inline-flex!important;border-radius:999px!important;padding:3px 9px!important;font-size:12px!important;font-weight:900!important;border:1px solid currentColor!important;background:#fff!important}.ce-v21-socio-chip.asiste{color:#15803d!important;background:#ecfdf5!important}.ce-v21-socio-chip.no-asiste{color:#b91c1c!important;background:#fef2f2!important}
      @media(max-width:680px){.ce-v16hf5-bubble{border-radius:18px!important;padding:14px!important}.ce-v16hf5-row{grid-template-columns:1fr 58px!important}.ce-v16hf5-bar{grid-column:1/-1!important}.ce-v21-socios-grid{grid-template-columns:1fr!important}.ce-v21-socios-scroll{max-height:120px!important}}
    `;
    document.head.appendChild(s);
  }

  const palette={blue:['#2563eb','#eff6ff'],green:['#16a34a','#ecfdf5'],orange:['#f59e0b','#fff7ed'],red:['#ef4444','#fef2f2'],purple:['#8b5cf6','#faf5ff'],slate:['#64748b','#f8fafc']};
  let timer=0; let lastToggle=0;
  function closeAvance(){ const layer=$('ceV16Hf5AvanceLayer'); if(layer) layer.classList.remove('visible'); clearTimeout(timer); }
  function toggleAvance(ev){ if(ev){ ev.preventDefault?.(); ev.stopPropagation?.(); ev.stopImmediatePropagation?.(); } const now=Date.now(); if(now-lastToggle<260) return false; lastToggle=now; const layer=$('ceV16Hf5AvanceLayer'); if(layer?.classList?.contains('visible')) closeAvance(); else showAvance(); return false; }
  function showAvance(){
    try{ $('ceHf47AvanceBubbleLayer')?.remove(); $('ceHf48AvanceLayer')?.remove(); }catch(_){ }
    let layer=$('ceV16Hf5AvanceLayer'); if(!layer){ layer=document.createElement('div'); layer.id='ceV16Hf5AvanceLayer'; document.body.appendChild(layer); }
    const rows=avanceRows(); const cls=finalizado()?'finalizado':'curso';
    layer.innerHTML=`<div class="ce-v16hf5-bubble ${cls}" role="dialog" aria-live="polite">
      <button type="button" class="ce-v16hf5-close" aria-label="Cerrar">×</button>
      <div class="ce-v16hf5-title"><span>AVANCE DEL EVENTO</span><strong>${esc(title())}</strong></div>
      <div class="ce-v16hf5-rows">${rows.map(r=>{const p=palette[r.color]||palette.blue; const pct=Math.max(0,Math.min(100,num(r.p))); return `<div class="ce-v16hf5-row" style="--ce-av-color:${p[0]};--ce-av-bg:${p[1]}"><div><b>${esc(r.t)}</b><small>${esc(r.d)}</small></div><strong>${pct.toLocaleString('es-ES',{maximumFractionDigits:2})}%</strong><span class="ce-v16hf5-bar"><i style="width:${pct}%"></i></span>${r.html||''}</div>`;}).join('')}</div>
    </div>`;
    layer.classList.add('visible');
    layer.querySelector('.ce-v16hf5-close')?.addEventListener('click',ev=>{ev.preventDefault(); ev.stopPropagation(); closeAvance();},{once:true});
    layer.querySelector('.ce-v16hf5-bubble')?.addEventListener('click',ev=>ev.stopPropagation());
    clearTimeout(timer);
  }
  function rewireLogo(){
    injectStyle();
    const old=document.querySelector('img.brand-logo-large,img[alt="ColtyLAB"],img[alt*="Colty"]');
    if(old && !old.classList.contains('ce-brand-logo-safe')){ const clone=old.cloneNode(true); clone.className='ce-brand-logo-safe'; clone.alt='Logo'; clone.title='Ver avance del evento'; try{ clone.style.cssText=(old.getAttribute('style')||'')+';cursor:pointer;'; }catch(_){} old.replaceWith(clone); }
    document.querySelectorAll('.ce-brand-logo-safe').forEach(logo=>{ if(logo.__ceV16Hf5Bound) return; logo.__ceV16Hf5Bound=true; logo.addEventListener('click',toggleAvance,true); logo.addEventListener('pointerup',toggleAvance,true); });
  }
  function bindGlobalClose(){ if(window.__ceV16Hf5GlobalClose) return; window.__ceV16Hf5GlobalClose=true; document.addEventListener('keydown',ev=>{ if(ev.key==='Escape') closeAvance(); }, true); }
  function run(){ rewireLogo(); bindGlobalClose(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
  window.addEventListener('load',run,{once:true});
  window.addEventListener('controlevent:event-ready',()=>setTimeout(run,80));
  window.addEventListener('controlevent:event-loaded',()=>setTimeout(run,80));
  [100,500,1500,3000].forEach(ms=>setTimeout(run,ms));
  window.ControlEventV16Hf5Avance={show:showAvance, close:closeAvance, rewireLogo};
})();
