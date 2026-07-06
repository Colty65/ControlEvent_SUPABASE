(function(){
  'use strict';
  if(window.__ceV15Hotfix14MapaIconoResponsables) return;
  window.__ceV15Hotfix14MapaIconoResponsables = true;

  const $ = id => document.getElementById(id);
  const st = () => { try{ return window.ControlEventApp?.state || window.state || {}; }catch(_){ return {}; } };
  const arr = k => Array.isArray(st()[k]) ? st()[k] : [];
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const evId = () => String(st().selectedEventId || $('selectedEvent')?.value || '');
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function money(v){ try{ if(typeof window.money === 'function') return window.money(Number(v||0)); }catch(_){} return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0)); }
  function num(v){ try{return new Intl.NumberFormat('es-ES',{maximumFractionDigits:2}).format(Number(v||0));}catch(_){return String(v||0);} }
  function byId(list,id){ return arr(list).find(x=>String(x?.id||'')===String(id||'')) || {}; }
  function isDonationTicket(v){ return /^DONADO/i.test(norm(v)); }
  function isAssignedPurchase(v){ const t=up(v); return /^TK\d+/.test(t)||t.includes('GASTOS CORRIENTES'); }
  function srcOf(v){ if(!v) return ''; if(typeof v==='string') return v; if(typeof v==='object') return v.url||v.public_url||v.publicUrl||v.pathname||v.path||v.storage_path||v.dataUrl||v.base64||''; return ''; }
  function imageExists(keys){ const s=st(); const stores=[s.ticketImages||{},s.ticketImageRefs||{},s.images||{}]; return keys.some(k=>stores.some(store=>!!srcOf(store[k]))); }
  function ingresoTotal(r){
    const ev=arr('eventos').find(e=>String(e.id)===evId())||{};
    const per=byId('personas',r?.personaId)||{};
    const socio=up(per.rango||r?.rango)==='SOCIO';
    const numero=Number(r?.numero||0);
    const oblig=socio?numero*Number(ev?.precio||0):0;
    const vol=Number(r?.importeVoluntario??r?.voluntario??r?.importe??0);
    return Number(r?.total??(oblig+vol));
  }
  function computeAvance(){
    const id=evId();
    const ingresos=arr('colaboradores').filter(r=>String(r?.eventId||'')===id);
    const compras=arr('compras').filter(r=>String(r?.eventId||'')===id);
    const docs=arr('eventDocuments').filter(r=>String(r?.eventId||'')===id);
    const totalIng=ingresos.reduce((a,r)=>a+ingresoTotal(r),0);
    const doneIngRows=ingresos.filter(r=>up(r?.situacion||'Pendiente')!=='PENDIENTE');
    const doneIng=doneIngRows.reduce((a,r)=>a+ingresoTotal(r),0);
    const ingPhotos=doneIngRows.filter(r=>imageExists([`${id}|INGRESO:${r.id}`,`${id}|INGRESO|${r.id}`,`INGRESO:${id}|${r.id}`,`INGRESO:${r.id}`,`${id}|ING:${r.id}`])).length;
    const don=compras.filter(r=>isDonationTicket(r?.ticketDonacion));
    const buy=compras.filter(r=>!isDonationTicket(r?.ticketDonacion));
    const assigned=buy.filter(r=>isAssignedPurchase(r?.ticketDonacion));
    const tickets=[...new Set(compras.map(r=>norm(r?.ticketDonacion)).filter(t=>/^TK\d+/i.test(t)))];
    const ticketPhotos=tickets.filter(t=>imageExists([`${id}|${t}`,`${id}|TICKET:${t}`,t])).length;
    return {totalIng,doneIng,doneIngRows,ingPhotos,don,buy,assigned,docs,tickets,ticketPhotos};
  }
  function avRow(numLabel,label,pct,color,detail,warn){
    const p=Math.max(0,Math.min(100,Number(pct||0)));
    return `<div class="ce-hf14-av-row"><div class="ce-hf14-av-head"><span><b>${numLabel}</b>${esc(label)}</span><strong>${esc(num(p))}%</strong></div><div class="ce-hf14-av-track"><i style="width:${p}%;background:${esc(color)}"></i></div><small>${esc(detail||'')}</small>${warn?`<em>${esc(warn)}</em>`:''}</div>`;
  }
  function avanceHtml(){
    const p=computeAvance();
    return `<div class="ce-hf14-av-box">
      <div class="ce-hf14-av-title"><span>AVANCE</span><strong>del evento</strong></div>
      ${avRow(1,'INGRESOS',p.totalIng>0?p.doneIng*100/p.totalIng:0,'#2563eb',`${money(p.doneIng)} de ${money(p.totalIng)} ingresados`)}
      ${avRow(2,'Fotos ingresos',p.doneIngRows.length?p.ingPhotos*100/p.doneIngRows.length:0,'#16a34a',`${num(p.ingPhotos)} de ${num(p.doneIngRows.length)} ingresos realizados con justificante`)}
      ${avRow(3,'DONACIONES',p.don.length?100:0,'#f59e0b',p.don.length?`Donaciones registradas: ${num(p.don.length)}`:'Aún no hay donaciones registradas')}
      ${avRow(4,'COMPRAS',p.buy.length?p.assigned.length*100/p.buy.length:0,'#ef4444',`${num(p.assigned.length)} de ${num(p.buy.length)} líneas asignadas a TKxx o gastos corrientes`)}
      ${avRow(5,'DOCUMENTOS',p.docs.length?100:0,p.docs.length?'#16a34a':'#f97316',p.docs.length?`${num(p.docs.length)} documento(s) adjunto(s)`:'0 documentos adjuntos',p.docs.length?'':'Este evento no tiene documentos adjuntos. ¿Es correcto?')}
      ${avRow(6,'Fotos tickets',p.tickets.length?p.ticketPhotos*100/p.tickets.length:0,'#8b5cf6',`${num(p.ticketPhotos)} de ${num(p.tickets.length)} tickets contables con foto adjunta`,p.tickets.length?'':'Todavía no hay TKxx registrados')}
    </div>`;
  }
  function removeOld(){
    document.querySelectorAll('#budgetLayout .ce-v15hf6-avance-box,#budgetLayout .ce-v15hf7-avance-box,#budgetLayout .ce-hf9-av-box,#ceHf13AvanceBtn,.ce-hf13-mapa-actions').forEach(el=>el.remove());
  }
  function ensureButton(){
    if(window.__ceV15Hotfix16AvanceDonacionesPrompt){
      document.querySelectorAll('#ceHf13AvanceBtn,#ceHf14AvanceBtn,#ceHf15AvanceBtn,.ce-hf13-mapa-actions,.ce-hf14-mapa-actions,.ce-hf15-mapa-actions,#ceHf13MapaAvancePanel,#ceHf14MapaAvancePanel,#ceHf15MapaAvancePanel').forEach(el=>el.remove());
      return;
    }
    removeOld();
    const tab=$('tabMapaProductos'); if(!tab) return;
    const title=tab.querySelector('.mapa-productos-card > .section-title'); if(!title) return;
    let btn=$('ceHf14AvanceBtn');
    if(!btn){
      const actions=document.createElement('div');
      actions.className='ce-hf14-mapa-actions';
      actions.innerHTML='<button type="button" id="ceHf14AvanceBtn" class="ce-hf14-av-btn" title="Mostrar/ocultar avance del evento" aria-label="Mostrar/ocultar avance del evento"><img src="./hitos-evento.jpg" alt=""></button>';
      title.appendChild(actions);
    }
  }
  function togglePanel(){
    const tab=$('tabMapaProductos'); if(!tab) return;
    const existing=$('ceHf14MapaAvancePanel');
    if(existing){ existing.remove(); return; }
    const card=tab.querySelector('.mapa-productos-card');
    const summary=$('mapaProductosSummary');
    if(!card || !summary) return;
    const panel=document.createElement('div');
    panel.id='ceHf14MapaAvancePanel';
    panel.innerHTML=avanceHtml();
    card.insertBefore(panel, summary);
  }
  function refreshPanel(){
    const p=$('ceHf14MapaAvancePanel');
    if(p) p.innerHTML=avanceHtml();
  }
  function injectStyle(){
    if($('ceHf14Style')) return;
    const css=`
      #budgetLayout .ce-v15hf6-avance-box,#budgetLayout .ce-v15hf7-avance-box,#budgetLayout .ce-hf9-av-box{display:none!important}
      .mapa-productos-card>.section-title{display:flex!important;align-items:flex-start!important;gap:12px!important}
      .ce-hf14-mapa-actions{margin-left:auto!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;padding-top:2px!important}
      .ce-hf14-av-btn{width:38px!important;height:38px!important;border:1px solid #cbd5e1!important;background:#fff!important;border-radius:10px!important;padding:2px!important;cursor:pointer!important;box-shadow:0 4px 12px rgba(15,23,42,.14)!important;display:inline-flex!important;align-items:center!important;justify-content:center!important}
      .ce-hf14-av-btn:hover{border-color:#217346!important;box-shadow:0 0 0 3px rgba(33,115,70,.13)!important}
      .ce-hf14-av-btn img{width:32px!important;height:32px!important;object-fit:cover!important;border-radius:8px!important;display:block!important}
      #ceHf14MapaAvancePanel{margin:8px 0 10px!important}
      .ce-hf14-av-box{padding:9px!important;border:3px solid #0f172a!important;border-radius:18px!important;background:linear-gradient(180deg,#fff,#f8fafc)!important;box-shadow:0 8px 22px rgba(15,23,42,.12)!important;font-size:11px!important;line-height:1.12!important;max-width:640px!important;margin-left:auto!important}
      .ce-hf14-av-title{display:flex!important;justify-content:space-between!important;align-items:center!important;margin-bottom:5px!important;padding-bottom:5px!important;border-bottom:2px solid #e2e8f0!important}.ce-hf14-av-title span{font-size:12px!important;font-weight:950!important;letter-spacing:.08em!important}.ce-hf14-av-title strong{font-size:10px!important;text-transform:uppercase!important;color:#475569!important}
      .ce-hf14-av-row{display:grid!important;grid-template-columns:minmax(150px,1.25fr) 52px minmax(120px,1fr)!important;gap:5px!important;align-items:center!important;margin:4px 0!important;padding:5px 6px!important;border:1px solid #dbe4ee!important;border-radius:12px!important;background:#fff!important}.ce-hf14-av-head{display:contents!important}.ce-hf14-av-head span{font-size:9.5px!important;font-weight:900!important;text-transform:uppercase!important}.ce-hf14-av-head b{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:16px!important;height:16px!important;margin-right:4px!important;border-radius:999px!important;background:#0f172a!important;color:#fff!important;font-size:9px!important}.ce-hf14-av-head strong{font-size:12px!important;text-align:right!important}.ce-hf14-av-track{height:8px!important;background:#e5e7eb!important;border-radius:999px!important;overflow:hidden!important}.ce-hf14-av-track i{display:block!important;height:100%!important;border-radius:999px!important}.ce-hf14-av-row small{grid-column:1/4!important;font-size:9.5px!important;font-weight:750!important;color:#334155!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.ce-hf14-av-row em{grid-column:1/4!important;font-size:9.5px!important;padding:3px 5px!important;border:1px solid #fdba74!important;border-radius:9px!important;background:#fff7ed!important;color:#9a3412!important;font-style:normal!important;font-weight:850!important}
      .plan-info-field{grid-column:2 / -1!important}.plan-desc-field{grid-column:1 / span 1!important}.plan-info-field textarea#planInfo{width:100%!important;min-height:340px!important;font-size:15px!important;line-height:1.35!important;resize:vertical!important}.plan-desc-field textarea#planDescripcion{width:100%!important;min-height:130px!important}
      .mapa-order-actions button{font-weight:900!important;color:#000!important;background:#fff!important;border-color:#cbd5e1!important}.mapa-order-actions button.ce-mapa-sort-active,.mapa-order-actions button.active{background:#217346!important;color:#fff!important;border-color:#217346!important;box-shadow:0 0 0 3px rgba(33,115,70,.18)!important}
      @media(max-width:900px){.plan-info-field,.plan-desc-field{grid-column:1 / -1!important}.ce-hf14-av-box{max-width:none!important;margin-left:0!important}.ce-hf14-av-row{grid-template-columns:1fr 48px!important}.ce-hf14-av-track{grid-column:1/3!important}.ce-hf14-av-row small,.ce-hf14-av-row em{grid-column:1/3!important;white-space:normal!important}}
    `;
    const style=document.createElement('style'); style.id='ceHf14Style'; style.textContent=css; document.head.appendChild(style);
  }
  function apply(){ injectStyle(); ensureButton(); refreshPanel(); }
  let timer=0; function schedule(d){ clearTimeout(timer); timer=setTimeout(apply,d||60); }

  document.addEventListener('click',ev=>{
    const btn=ev.target?.closest?.('#ceHf14AvanceBtn');
    if(btn){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation?.(); togglePanel(); return false; }
  }, true);

  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:data-loaded','controlevent:event-changed'].forEach(ev=>window.addEventListener(ev,()=>schedule(ev==='controlevent:event-changed'?160:60),true));
  document.addEventListener('click',ev=>{ if(ev.target?.closest?.('#tabMapaBtn,#selectedEvent,#refreshBtn')) schedule(180); },true);
  [0,200,800,1600].forEach(ms=>setTimeout(apply,ms));
})();
