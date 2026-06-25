(function(){
  'use strict';
  const INSTALLED='__ceV15Hotfix9RescateDonacionesAvance';
  if(window[INSTALLED]) return;
  window[INSTALLED]=true;
  const $=id=>document.getElementById(id);
  const norm=v=>String(v??'').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const up=v=>norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  function appState(){ try{return window.ControlEventApp?.state||window.state||{};}catch(_){return{};} }
  function arr(k){ const v=appState()[k]; return Array.isArray(v)?v:[]; }
  function evId(){ return String(appState().selectedEventId || $('selectedEvent')?.value || ''); }
  function byId(list,id){ return arr(list).find(x=>String(x?.id||'')===String(id||''))||{}; }
  function money(v){ try{ if(typeof window.money==='function') return window.money(Number(v||0)); }catch(_){} return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0)); }
  function nfmt(v){ try{return new Intl.NumberFormat('es-ES',{maximumFractionDigits:2}).format(Number(v||0));}catch(_){return String(v||0);} }
  function isDonationTicket(v){ return up(v).startsWith('DONADO'); }
  function isAssignedPurchase(v){ const t=up(v); return /^TK\d+/.test(t)||t.includes('GASTOS CORRIENTES'); }
  function srcOf(v){ if(!v) return ''; if(typeof v==='string') return v; if(typeof v==='object') return v.url||v.public_url||v.publicUrl||v.pathname||v.path||v.storage_path||v.dataUrl||v.base64||''; return ''; }
  function imageExists(keys){ const st=appState(); const stores=[st.ticketImages||{},st.ticketImageRefs||{},st.images||{}]; return keys.some(k=>stores.some(store=>!!srcOf(store[k]))); }
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
  function bar(num,label,pct,color,detail,warn){
    const p=Math.max(0,Math.min(100,Number(pct||0)));
    return `<div class="ce-hf9-av-row"><div class="ce-hf9-av-head"><span><b>${num}</b>${esc(label)}</span><strong>${esc(nfmt(p))}%</strong></div><div class="ce-hf9-av-track"><i style="width:${p}%;background:${esc(color)}"></i></div><small>${esc(detail||'')}</small>${warn?`<em>${esc(warn)}</em>`:''}</div>`;
  }
  function renderAvanceHtml(){
    const p=computeAvance();
    return `<div class="ce-hf9-av-title"><span>AVANCE</span><strong>del evento</strong></div>
      ${bar(1,'INGRESOS',p.totalIng>0?p.doneIng*100/p.totalIng:0,'#2563eb',`${money(p.doneIng)} de ${money(p.totalIng)} ingresados`)}
      ${bar(2,'Fotos justificantes ingresos',p.doneIngRows.length?p.ingPhotos*100/p.doneIngRows.length:0,'#16a34a',`${nfmt(p.ingPhotos)} de ${nfmt(p.doneIngRows.length)} ingresos realizados con justificante`)}
      ${bar(3,'DONACIONES',p.don.length?100:0,'#f59e0b',p.don.length?`Donaciones registradas: ${nfmt(p.don.length)}`:'Aún no hay donaciones registradas')}
      ${bar(4,'COMPRAS',p.buy.length?p.assigned.length*100/p.buy.length:0,'#ef4444',`${nfmt(p.assigned.length)} de ${nfmt(p.buy.length)} líneas asignadas a TKxx o gastos corrientes`)}
      ${bar(5,'DOCUMENTOS DEL EVENTO',p.docs.length?100:0,p.docs.length?'#16a34a':'#f97316',p.docs.length?`${nfmt(p.docs.length)} documento(s) adjunto(s)`:'0 documentos adjuntos',p.docs.length?'':'Este evento no tiene documentos adjuntos. ¿Es correcto?')}
      ${bar(6,'Fotos de tickets contables',p.tickets.length?p.ticketPhotos*100/p.tickets.length:0,'#8b5cf6',`${nfmt(p.ticketPhotos)} de ${nfmt(p.tickets.length)} tickets contables con foto adjunta`,p.tickets.length?'':'Todavía no hay TKxx registrados')}`;
  }
  function injectStyle(){
    if($('ceV15Hotfix9Style')) return;
    const st=document.createElement('style'); st.id='ceV15Hotfix9Style';
    st.textContent=`#budgetLayout .budget-panel.donantes .ce-v15hf6-avance-box,#budgetLayout .budget-panel.donantes .ce-v15hf7-avance-box{display:none!important}.ce-hf9-av-box{margin-top:14px;padding:12px;border:3px solid #0f172a;border-radius:18px;background:linear-gradient(180deg,#fff 0%,#f8fafc 100%);box-shadow:0 12px 28px rgba(15,23,42,.14);font-size:12px;line-height:1.25}.ce-hf9-av-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #e2e8f0}.ce-hf9-av-title span{font-size:13px;font-weight:950;letter-spacing:.08em;color:#0f172a}.ce-hf9-av-title strong{font-size:12px;text-transform:uppercase;color:#475569}.ce-hf9-av-row{margin:6px 0;padding:7px 8px;border:1px solid #dbe4ee;border-radius:14px;background:#fff}.ce-hf9-av-head{display:flex;justify-content:space-between;gap:10px;align-items:center}.ce-hf9-av-head span{font-size:11px;font-weight:950;text-transform:uppercase;color:#0f172a}.ce-hf9-av-head b{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;margin-right:6px;border-radius:999px;background:#0f172a;color:#fff;font-size:10px}.ce-hf9-av-head strong{font-size:14px;color:#0f172a}.ce-hf9-av-track{height:9px;margin:5px 0;background:#e5e7eb;border-radius:999px;overflow:hidden}.ce-hf9-av-track i{display:block;height:100%;border-radius:999px}.ce-hf9-av-row small{display:block;font-size:11px;font-weight:750;color:#334155}.ce-hf9-av-row em{display:block;margin-top:5px;padding:5px 7px;border:1px solid #fdba74;border-radius:10px;background:#fff7ed;color:#9a3412;font-size:11px;font-style:normal;font-weight:850}#summaryTiendaTicket .summary-item.ce-hf9-collapsed{cursor:pointer;min-height:46px;align-items:center}#summaryTiendaTicket .summary-item.ce-hf9-collapsed>span:first-child{display:block;max-width:calc(100% - 120px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#summaryTiendaTicket .summary-item.ce-hf9-collapsed>span:first-child:after{content:'  ⓘ';font-weight:950;color:#2563eb}.ce-hf9-modal{position:fixed;inset:0;background:rgba(15,23,42,.38);z-index:5000;display:flex;align-items:center;justify-content:center;padding:16px}.ce-hf9-modal-card{width:min(720px,94vw);max-height:78vh;overflow:auto;background:#fff;border-radius:20px;border:2px solid #0f172a;box-shadow:0 24px 80px rgba(15,23,42,.35);padding:16px}.ce-hf9-modal-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-bottom:1px solid #e2e8f0;padding-bottom:10px;margin-bottom:10px}.ce-hf9-modal-head strong{font-size:18px;color:#0f172a}.ce-hf9-modal-head button{border:0;background:#0f172a;color:#fff;border-radius:999px;width:34px;height:34px;font-weight:950}.ce-hf9-modal-list{display:flex;flex-wrap:wrap;gap:7px}.ce-hf9-modal-list span{padding:6px 9px;border-radius:999px;background:#e0f2fe;color:#0f172a;font-size:13px;font-weight:750}.ce-hf9-modal-amount{margin-top:12px;text-align:right;font-size:18px;font-weight:950}`;
    document.head.appendChild(st);
  }
  function findDonacionPanel(){
    return document.querySelector('#budgetLayout .budget-panel.donantes') || Array.from(document.querySelectorAll('#budgetLayout .budget-panel')).find(p=>/DONACI[OÓ]N\s+DE\s+PRODUCTO/i.test(p.querySelector('h3')?.textContent||''));
  }
  function applyAvance(){
    const panel=findDonacionPanel(); if(!panel) return;
    panel.querySelectorAll('.ce-v15hf6-avance-box,.ce-v15hf7-avance-box').forEach(el=>{ el.style.display='none'; });
    let box=panel.querySelector('.ce-hf9-av-box');
    if(!box){ box=document.createElement('div'); box.className='ce-hf9-av-box'; panel.appendChild(box); }
    box.innerHTML=renderAvanceHtml();
  }
  function cleanTipAttrs(el){
    if(!el) return;
    ['title','data-tip','data-ce-tip','data-v181-tip','data-ce-tip-v196','data-ce-tip-v1952','data-ce-tip-v21','data-tip-bg-v21','data-ce-tip-layout-v21','data-ce-tip-bg','data-ce-tip-layout','data-tip-bg'].forEach(a=>el.removeAttribute(a));
  }
  function showModal(title,detail,amount){
    document.querySelectorAll('.ce-hf9-modal').forEach(x=>x.remove());
    const parts=String(detail||'').split(' · ').map(x=>x.trim()).filter(Boolean);
    const modal=document.createElement('div'); modal.className='ce-hf9-modal';
    modal.innerHTML=`<div class="ce-hf9-modal-card" role="dialog" aria-modal="true"><div class="ce-hf9-modal-head"><strong>${esc(title||'Detalle')}</strong><button type="button" aria-label="Cerrar">×</button></div><div class="ce-hf9-modal-list">${parts.map(x=>`<span>${esc(x)}</span>`).join('')||'<span>Sin detalle</span>'}</div>${amount?`<div class="ce-hf9-modal-amount">${esc(amount)}</div>`:''}</div>`;
    modal.addEventListener('click',ev=>{ if(ev.target===modal || ev.target.closest('button')) modal.remove(); });
    document.body.appendChild(modal);
  }
  function collapseTiendaTicket(){
    const root=$('summaryTiendaTicket'); if(!root) return;
    Array.from(root.querySelectorAll('.summary-item')).forEach(row=>{
      const amount=row.querySelector('.pill')?.textContent || row.querySelector('span:last-child')?.textContent || '';
      const label=row.querySelector(':scope > span:first-child') || row.querySelector('span');
      if(!label) return;
      let full=row.dataset.ceHf9Full || row.getAttribute('data-ce-tip') || row.getAttribute('data-ce-tip-v21') || label.textContent || '';
      full=norm(full).replace(/\n+/g,' · ');
      if(!full || /^TOTAL(\s+EVENTO)?$/i.test(full)) return;
      if(!full.includes(' · ') && !full.includes('|')) return;
      const parts=full.split(' · ').map(norm).filter(Boolean);
      const head=parts.shift() || full.split('|').slice(0,2).join(' | ').trim() || full;
      const detail=parts.join(' · ') || full;
      row.dataset.ceHf9Full=full; row.dataset.ceHf9Head=head; row.dataset.ceHf9Detail=detail; row.dataset.ceHf9Amount=amount;
      cleanTipAttrs(row); cleanTipAttrs(label);
      label.textContent=head;
      row.classList.add('ce-hf9-collapsed');
      if(!row.__ceHf9Click){
        row.__ceHf9Click=true;
        row.addEventListener('click',ev=>{ if(ev.target.closest('button,input,select,a,img')) return; showModal(row.dataset.ceHf9Head,row.dataset.ceHf9Detail,row.dataset.ceHf9Amount); },true);
      }
    });
  }
  function apply(){ injectStyle(); applyAvance(); collapseTiendaTicket(); }
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:data-loaded','controlevent:event-changed'].forEach(e=>window.addEventListener(e,()=>setTimeout(apply,80),true));
  [0,250,800,1600,3200].forEach(ms=>setTimeout(apply,ms));
  setInterval(apply,2500);
})();
