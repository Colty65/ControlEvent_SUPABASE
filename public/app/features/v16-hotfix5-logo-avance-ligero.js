/* ControlEvent v18_prod - HOTFIX5: avance ColtyLAB ligero y sin bloqueo.
   - No cambia versión.
   - Evita los handlers antiguos del logo que disparaban observers pesados.
   - Muestra un globo propio, estable, sin autocierre ni cierre por scroll/fuera; se alterna con el logo. */
(function(){
  'use strict';
  if(window.__ceV16Hotfix5LogoAvanceLigero) return;
  window.__ceV16Hotfix5LogoAvanceLigero=true;

  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const txt=v=>String(v??'').trim();
  const up=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
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
  function finalizado(){ return up(selectedEvent().situacion||'')==='FINALIZADO'; }
  function imageKeyPresent(key){
    const s=st(); const raw=String(key||''); const compact=raw.replace(/\s+/g,'');
    return !!(s.ticketImages?.[raw]||s.ticketImageRefs?.[raw]||s.ticketImages?.[compact]||s.ticketImageRefs?.[compact]);
  }
  function docCode(value){ const m=String(value||'').toUpperCase().match(/DOC\s*(\d+)/); return m?'DOC'+String(Number(m[1])).padStart(2,'0'):''; }
  function isDonation(row){ const t=up(row?.ticketDonacion||row?.ticket||row?.donacion||''); return t.startsWith('DONADO') || t.includes('DONACION'); }

  function budgetIncome(){
    const app=window.ControlEventApp || window.__CONTROL_EVENT_APP__ || window;
    const candidates=[
      ()=>app?.calculations?.budgetSummary?.(),
      ()=>window.ControlEventDomain?.api?.budgetSummary?.(),
      ()=>window.budgetSummary?.()
    ];
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
    const col=arr('colaboradores').filter(c=>String(c.eventId||c.event_id||'')===id);
    let previsto=col.reduce((sum,c)=>sum+(num(c.obligatorio)||(num(c.numero)*precio))+num(c.importeVoluntario??c.voluntario??c.importe),0);
    let ingresado=col.filter(c=>up(c.situacion||c.formaPago||'Pendiente')!=='PENDIENTE')
      .reduce((sum,c)=>sum+(num(c.obligatorio)||(num(c.numero)*precio))+num(c.importeVoluntario??c.voluntario??c.importe),0);
    const bi=budgetIncome();
    if(bi && bi.previsto){ previsto=bi.previsto; ingresado=bi.ingresado; }

    const fotosIng=col.filter(c=>imageKeyPresent(`${id}|INGRESO:${c.id}`)||imageKeyPresent(`${id}|INGRESO|${c.id}`)).length;
    const compras=arr('compras').filter(c=>String(c.eventId||c.event_id||'')===id);
    const don=compras.filter(isDonation);
    const comp=compras.filter(c=>!isDonation(c));
    const docs=(Array.isArray(st().eventDocuments)?st().eventDocuments:[]).filter(d=>String(d.eventId||d.event_id||'')===id);
    const docKeys=new Set(docs.map(d=>`${id}|${docCode(d.codigo||d.imageKey||d.id)}`).filter(k=>!k.endsWith('|')));
    Object.keys(st().ticketImages||{}).forEach(k=>{ if(k.startsWith(id+'|') && /DOC\s*\d+/i.test(k)) docKeys.add(k); });
    const tickets=[...new Set(comp.map(c=>txt(c.ticket||c.ticketDonacion||c.ticket_donacion||'').toUpperCase()).filter(v=>/TK\d+/i.test(v)))];
    const ticketPhotos=tickets.filter(tk=>Object.keys(st().ticketImages||{}).some(k=>k.startsWith(id+'|')&&k.toUpperCase().includes(tk))).length;
    return [
      {n:1,t:'INGRESOS',color:'blue',p:previsto?Math.min(100,ingresado/previsto*100):0,d:`${eur(ingresado)} de ${eur(previsto)} ingresados`},
      {n:2,t:'FOTOS INGRESOS',color:'green',p:col.length?fotosIng/col.length*100:0,d:`${fotosIng} de ${col.length} ingresos realizados con justificante`},
      {n:3,t:'DONACIONES',color:'orange',p:don.length?100:0,d:`Donaciones registradas: ${don.length}`},
      {n:4,t:'COMPRAS',color:'red',p:comp.length?100:0,d:`${comp.length} líneas asignadas a TKxx o gastos corrientes`},
      {n:5,t:'DOCUMENTOS',color:'green',p:docKeys.size?100:0,d:`${docKeys.size} documento(s) adjunto(s)`},
      {n:6,t:'FOTOS TICKETS',color:'purple',p:tickets.length?ticketPhotos/tickets.length*100:0,d:`${ticketPhotos} de ${tickets.length} tickets contables con foto adjunta`}
    ];
  }

  function injectStyle(){
    if($('ceV16Hf5Style')) return;
    const s=document.createElement('style'); s.id='ceV16Hf5Style';
    s.textContent=`
      /* Neutraliza los globos antiguos que provocaban bucles de observers al abrir desde ColtyLAB. */
      #ceHf47AvanceBubbleLayer,#ceHf48AvanceLayer{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      .ce-brand-logo-safe{cursor:pointer!important;display:block!important;max-width:58px!important;max-height:58px!important;width:auto!important;height:auto!important;}
      #ceV16Hf5AvanceLayer{position:fixed!important;inset:0!important;z-index:2147483000!important;display:none!important;align-items:center!important;justify-content:center!important;background:rgba(15,23,42,.16)!important;padding:10px!important;}
      #ceV16Hf5AvanceLayer.visible{display:flex!important;}
      .ce-v16hf5-bubble{position:relative!important;width:min(620px,94vw)!important;max-height:min(74vh,620px)!important;overflow:auto!important;background:#fff!important;border:2px solid #0f172a!important;border-radius:22px!important;box-shadow:0 24px 70px rgba(15,23,42,.30)!important;padding:14px!important;}
      .ce-v16hf5-bubble.finalizado{border-color:#dc2626!important}.ce-v16hf5-bubble.curso{border-color:#16a34a!important}
      .ce-v16hf5-close{position:absolute!important;right:10px!important;top:8px!important;width:34px!important;height:34px!important;border-radius:999px!important;border:1px solid #cbd5e1!important;background:#fff!important;font-size:22px!important;font-weight:950!important;line-height:28px!important;cursor:pointer!important;}
      .ce-v16hf5-title{text-align:center!important;margin:3px 38px 12px!important;line-height:1.15!important}.ce-v16hf5-title span{display:block!important;font-size:12px!important;letter-spacing:.15em!important;color:#64748b!important;font-weight:950!important}.ce-v16hf5-title strong{display:block!important;font-size:clamp(18px,4vw,25px)!important;font-weight:950!important}.ce-v16hf5-bubble.finalizado .ce-v16hf5-title strong{color:#991b1b!important}.ce-v16hf5-bubble.curso .ce-v16hf5-title strong{color:#15803d!important}
      .ce-v16hf5-rows{display:grid!important;gap:7px!important}.ce-v16hf5-row{display:grid!important;grid-template-columns:1fr 62px minmax(96px,.85fr)!important;gap:8px!important;align-items:center!important;border:2px solid var(--ce-av-color)!important;background:var(--ce-av-bg)!important;border-radius:14px!important;padding:8px!important}.ce-v16hf5-row b{font-size:13px!important;font-weight:950!important}.ce-v16hf5-row small{display:block!important;font-size:11px!important;color:#475569!important;font-weight:750!important;margin-top:2px!important}.ce-v16hf5-row>strong{text-align:right!important;font-size:13px!important}.ce-v16hf5-bar{height:10px!important;background:#e5e7eb!important;border-radius:999px!important;overflow:hidden!important}.ce-v16hf5-bar i{display:block!important;height:100%!important;border-radius:999px!important;background:var(--ce-av-color)!important}
      @media(max-width:560px){.ce-v16hf5-bubble{border-radius:18px!important;padding:12px!important}.ce-v16hf5-row{grid-template-columns:1fr 52px!important}.ce-v16hf5-bar{grid-column:1/-1!important}}
    `;
    document.head.appendChild(s);
  }

  const palette={
    blue:['#2563eb','#eff6ff'], green:['#16a34a','#ecfdf5'], orange:['#f59e0b','#fff7ed'], red:['#ef4444','#fef2f2'], purple:['#8b5cf6','#faf5ff']
  };
  let timer=0;
  let lastToggle=0;
  function closeAvance(){
    const layer=$('ceV16Hf5AvanceLayer'); if(layer) layer.classList.remove('visible');
    clearTimeout(timer);
  }
  function toggleAvance(ev){
    if(ev){ ev.preventDefault?.(); ev.stopPropagation?.(); ev.stopImmediatePropagation?.(); }
    const now=Date.now();
    if(now-lastToggle<260) return false;
    lastToggle=now;
    const layer=$('ceV16Hf5AvanceLayer');
    if(layer?.classList?.contains('visible')) closeAvance(); else showAvance();
    return false;
  }
  function showAvance(){
    // Por si algún handler antiguo se ha disparado, limpiamos sus capas sin tocar el resto.
    try{ $('ceHf47AvanceBubbleLayer')?.remove(); $('ceHf48AvanceLayer')?.remove(); }catch(_){ }
    let layer=$('ceV16Hf5AvanceLayer');
    if(!layer){ layer=document.createElement('div'); layer.id='ceV16Hf5AvanceLayer'; document.body.appendChild(layer); }
    const rows=avanceRows(); const cls=finalizado()?'finalizado':'curso';
    layer.innerHTML=`<div class="ce-v16hf5-bubble ${cls}" role="dialog" aria-live="polite">
      <button type="button" class="ce-v16hf5-close" aria-label="Cerrar">×</button>
      <div class="ce-v16hf5-title"><span>AVANCE DEL EVENTO</span><strong>${esc(title())}</strong></div>
      <div class="ce-v16hf5-rows">${rows.map(r=>{const p=palette[r.color]||palette.blue; const pct=Math.max(0,Math.min(100,num(r.p))); return `<div class="ce-v16hf5-row" style="--ce-av-color:${p[0]};--ce-av-bg:${p[1]}"><div><b>${r.n} · ${esc(r.t)}</b><small>${esc(r.d)}</small></div><strong>${pct.toLocaleString('es-ES',{maximumFractionDigits:2})}%</strong><span class="ce-v16hf5-bar"><i style="width:${pct}%"></i></span></div>`;}).join('')}</div>
    </div>`;
    layer.classList.add('visible');
    layer.querySelector('.ce-v16hf5-close')?.addEventListener('click',ev=>{ev.preventDefault(); ev.stopPropagation(); closeAvance();},{once:true});
    const bubble=layer.querySelector('.ce-v16hf5-bubble');
    bubble?.addEventListener('click',ev=>ev.stopPropagation());
    clearTimeout(timer);
  }

  function rewireLogo(){
    injectStyle();
    const old=document.querySelector('img.brand-logo-large,img[alt="ColtyLAB"],img[alt*="Colty"]');
    if(old && !old.classList.contains('ce-brand-logo-safe')){
      const clone=old.cloneNode(true);
      clone.className='ce-brand-logo-safe';
      clone.alt='Logo';
      clone.title='Ver avance del evento';
      try{ clone.style.cssText=(old.getAttribute('style')||'')+';cursor:pointer;'; }catch(_){ }
      old.replaceWith(clone);
    }
    document.querySelectorAll('.ce-brand-logo-safe').forEach(logo=>{
      if(logo.__ceV16Hf5Bound) return;
      logo.__ceV16Hf5Bound=true;
      logo.addEventListener('click',toggleAvance, true);
      logo.addEventListener('pointerup',toggleAvance, true);
    });
  }

  function bindGlobalClose(){
    if(window.__ceV16Hf5GlobalClose) return;
    window.__ceV16Hf5GlobalClose=true;
    // FIX8: no cerrar por click fuera, scroll ni temporizador.
    // El globo permanece visible hasta volver a pulsar el logo ColtyLAB, cerrar con X o Escape.
    document.addEventListener('keydown',ev=>{ if(ev.key==='Escape') closeAvance(); }, true);
  }

  function run(){ rewireLogo(); bindGlobalClose(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
  window.addEventListener('load',run,{once:true});
  window.addEventListener('controlevent:event-ready',()=>setTimeout(run,80));
  window.addEventListener('controlevent:event-loaded',()=>setTimeout(run,80));
  [100,500,1500,3000].forEach(ms=>setTimeout(run,ms));

  window.ControlEventV16Hf5Avance={show:showAvance, close:closeAvance, rewireLogo};
})();
