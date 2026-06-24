(function(){
  'use strict';
  const INSTALLED = '__ceV15Hotfix7PlanAvanceDeficit';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  function state(){ try{ if(window.ControlEventApp?.state) return window.ControlEventApp.state; }catch(_){} try{ if(window.state) return window.state; }catch(_){} return {}; }
  const arr = k => Array.isArray(state()[k]) ? state()[k] : [];
  const evId = () => String(state().selectedEventId || $('selectedEvent')?.value || '');
  const money = v => { try{ return typeof window.money === 'function' ? window.money(Number(v||0)) : new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0)); }catch(_){ return `${Number(v||0).toFixed(2)} €`; } };
  const numFmt = v => { try{ return new Intl.NumberFormat('es-ES',{maximumFractionDigits:2}).format(Number(v||0)); }catch(_){ return String(v||0); } };
  function byId(list,id){ return arr(list).find(x => String(x?.id||'') === String(id||'')) || {}; }
  function isDonationTicket(v){ return up(v).startsWith('DONADO'); }
  function isCurrentExpenseTicket(v){ const t=up(v); return t === 'GASTOS CORRIENTES' || t.includes('GASTOS CORRIENTES'); }
  function srcOf(v){ if(!v) return ''; if(typeof v === 'string') return v; if(typeof v === 'object') return v.url || v.public_url || v.publicUrl || v.pathname || v.path || v.storage_path || v.dataUrl || v.base64 || ''; return ''; }
  function imageExists(keys){ const s=state(); const stores=[s.ticketImages||{}, s.ticketImageRefs||{}]; return keys.some(k => stores.some(store => !!srcOf(store[k]))); }
  function totalIngreso(r){ const ev=arr('eventos').find(e=>String(e.id)===evId())||{}; const persona=r?.persona || byId('personas', r?.personaId); const socio=up(persona?.rango||r?.rango)==='SOCIO'; const n=Number(r?.numero||0); const obligatorio=socio ? n*Number(ev?.precio||0) : 0; const voluntario=Number(r?.importeVoluntario ?? r?.voluntario ?? r?.importe ?? 0); return Number(r?.total ?? (obligatorio+voluntario)); }
  function rowBar(label,pct,color,text,warn){ const p=Math.max(0,Math.min(100,Number(pct||0))); return `<div class="ce-v15hf7-progress-row"><div class="ce-v15hf7-progress-head"><b>${esc(label)}</b><strong>${esc(numFmt(p))}%</strong></div><div class="ce-v15hf7-track"><i style="width:${p}%;background:${esc(color)}"></i></div><small>${esc(text||'')}</small>${warn?`<em>${esc(warn)}</em>`:''}</div>`; }
  function compute(){
    const id=evId();
    const ing=arr('colaboradores').filter(r=>String(r?.eventId||'')===id);
    const comps=arr('compras').filter(r=>String(r?.eventId||'')===id);
    const docs=(arr('eventDocuments').filter(r=>String(r?.eventId||'')===id));
    const totalIng=ing.reduce((a,r)=>a+totalIngreso(r),0);
    const doneIng=ing.filter(r=>up(r?.situacion||'Pendiente')!=='PENDIENTE').reduce((a,r)=>a+totalIngreso(r),0);
    const ingDoneRows=ing.filter(r=>up(r?.situacion||'Pendiente')!=='PENDIENTE');
    const ingPhotos=ingDoneRows.filter(r=>imageExists([`${id}|INGRESO:${r.id}`,`${id}|INGRESO|${r.id}`,`INGRESO:${id}|${r.id}`,`INGRESO:${r.id}`])).length;
    const don=comps.filter(r=>isDonationTicket(r?.ticketDonacion));
    const buy=comps.filter(r=>!isDonationTicket(r?.ticketDonacion));
    const assigned=buy.filter(r=>/^TK\d+/i.test(norm(r?.ticketDonacion)) || isCurrentExpenseTicket(r?.ticketDonacion));
    const tickets=[...new Set(comps.map(r=>norm(r?.ticketDonacion)).filter(t=>/^TK\d+/i.test(t)))];
    const ticketPhotos=tickets.filter(t=>imageExists([`${id}|${t}`,t])).length;
    return {totalIng,doneIng,ingDoneRows,ingPhotos,don,buy,assigned,docs,tickets,ticketPhotos};
  }
  function applyProgressFallback(){
    try{ window.ControlEventV15Hotfix6?.applyAll?.(); }catch(_){}
    const panel=document.querySelector('#budgetLayout .budget-panel.donantes');
    if(!panel) return;
    let box=panel.querySelector('.ce-v15hf6-avance-box,.ce-v15hf7-avance-box');
    if(box && box.children.length) return;
    const p=compute();
    box=document.createElement('div');
    box.className='ce-v15hf7-avance-box';
    box.innerHTML=`<div class="ce-v15hf7-title">AVANCE del evento</div>
      ${rowBar('1 · INGRESOS',p.totalIng>0?p.doneIng*100/p.totalIng:0,'#2563eb',`${money(p.doneIng)} de ${money(p.totalIng)} ingresados`)}
      ${rowBar('2 · Foto justificante de ingresos adjuntas',p.ingDoneRows.length?p.ingPhotos*100/p.ingDoneRows.length:0,'#16a34a',`${numFmt(p.ingPhotos)} de ${numFmt(p.ingDoneRows.length)} ingresos realizados con justificante`)}
      ${rowBar('3 · DONACIONES',p.don.length?100:0,'#f59e0b',p.don.length?`Donaciones registradas: ${numFmt(p.don.length)}`:'Aún no hay donaciones registradas')}
      ${rowBar('4 · COMPRAS',p.buy.length?p.assigned.length*100/p.buy.length:0,'#ef4444',`${numFmt(p.assigned.length)} de ${numFmt(p.buy.length)} líneas ya asignadas a TKxx o gastos corrientes`)}
      ${rowBar('5 · DOCUMENTOS DEL EVENTO',p.docs.length?100:0,p.docs.length?'#16a34a':'#f59e0b',p.docs.length?`${numFmt(p.docs.length)} documento(s) adjunto(s)`:'0 documentos adjuntos',p.docs.length?'':'Este evento no tiene documentos adjuntos. ¿Es correcto?')}
      ${rowBar('6 · Foto de tickets adjuntos a factura contable',p.tickets.length?p.ticketPhotos*100/p.tickets.length:0,'#8b5cf6',`${numFmt(p.ticketPhotos)} de ${numFmt(p.tickets.length)} tickets contables con foto adjunta`,p.tickets.length?'':'Todavía no hay TKxx registrados')}`;
    panel.appendChild(box);
  }
  function collapseSummaryRows(){ try{ window.ControlEventV15Hotfix6?.applyAll?.(); }catch(_){} }
  function injectStyle(){
    if($('ceV15Hotfix7Style')) return;
    const st=document.createElement('style'); st.id='ceV15Hotfix7Style';
    st.textContent=`#budgetLayout .budget-panel.donantes .ce-v15hf7-avance-box{margin-top:14px;padding:14px;border:3px solid #0f172a;border-radius:16px;background:#fff;box-shadow:0 10px 26px rgba(15,23,42,.12)}#budgetLayout .budget-panel.donantes .ce-v15hf7-title{font-size:18px;font-weight:950;margin-bottom:10px}.ce-v15hf7-progress-row{padding:7px 0;border-top:1px dashed rgba(15,23,42,.16);display:flex;flex-direction:column;gap:5px}.ce-v15hf7-progress-head{display:flex;justify-content:space-between;gap:10px}.ce-v15hf7-track{height:12px;background:#e5e7eb;border-radius:999px;overflow:hidden}.ce-v15hf7-track i{display:block;height:100%;border-radius:999px}.ce-v15hf7-progress-row small{font-weight:700;color:#334155}.ce-v15hf7-progress-row em{font-style:normal;color:#c2410c;background:#fff7ed;border:1px solid #fdba74;border-radius:10px;padding:6px 8px;font-weight:800}`;
    document.head.appendChild(st);
  }
  function apply(){ injectStyle(); applyProgressFallback(); collapseSummaryRows(); }
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:data-loaded','controlevent:event-changed'].forEach(e=>window.addEventListener(e,()=>setTimeout(apply,60),true));
  [0,200,700,1500,3000].forEach(ms=>setTimeout(apply,ms));
  setInterval(apply,10000);
})();
