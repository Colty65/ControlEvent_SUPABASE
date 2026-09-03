/* ControlEvent v4_1_exp · Donaciones pendientes: situación Supuesta / Comprometida / Entregada. */
(function(root){
  'use strict';
  if(root.__ceV4DonationSituationUi) return; root.__ceV4DonationSituationUi=true;
  const VALUES=['Supuesta','Comprometida','Entregada'];
  const $=id=>document.getElementById(id), text=v=>String(v==null?'':v).trim();
  function state(){return root.ControlEventApp?.state||root.state||root.appState||root.__CONTROL_EVENT_STATE__||{};}
  function rows(){return Array.isArray(state().compras)?state().compras:[];}
  function rowById(id){return rows().find(r=>text(r?.id)===text(id))||null;}
  function normalize(v){const n=text(v).toLowerCase();if(n==='supuesta')return'Supuesta';if(n==='entregada')return'Entregada';return'Comprometida';}
  function isDonation(r){return /^DONADO\s+(TIENDA|SOCIO|OTROS)$/i.test(text(r?.ticketDonacion||r?.ticket_donacion));}
  function ensureStyle(){
    if($('ceDonationSituationStyle'))return;
    const st=document.createElement('style');st.id='ceDonationSituationStyle';st.textContent=`
      #tabDonaciones .ce-donation-status-field select{font-weight:900!important}
      #tabDonaciones .itemcard[data-ce-donation-status="Supuesta"]{border-left:5px solid #94a3b8!important}
      #tabDonaciones .itemcard[data-ce-donation-status="Comprometida"]{border-left:5px solid #f59e0b!important}
      #tabDonaciones .itemcard[data-ce-donation-status="Entregada"]{border-left:5px solid #10b981!important}
      #tabDonaciones .ce-donation-status-field small{display:block;margin-top:3px;font-size:9px;font-weight:800;color:#64748b}
      .ce-resp-launch,#btnMapaResponsables,#btnVistaAereaResponsables{pointer-events:auto!important;opacity:1!important;filter:none!important}
    `;document.head.appendChild(st);
  }
  function options(value){return VALUES.map(v=>`<option value="${v}" ${v===value?'selected':''}>${v}</option>`).join('');}
  function injectRow(card){
    const save=card?.querySelector?.('button[data-action="save-donacion"]');if(!save)return;
    const id=save.getAttribute('data-id')||'';if(!id)return;
    const r=rowById(id), value=normalize(r?.donacionSituacion||r?.donacion_situacion);
    card.dataset.ceDonationStatus=value;
    let sel=card.querySelector(`select[data-action="edit-donacion-situacion"][data-id="${CSS.escape(id)}"]`);
    if(sel){if(document.activeElement!==sel&&sel.value!==value)sel.value=value;return;}
    const line=save.closest('.rowline')||card.querySelector('.rowline');if(!line)return;
    const donor=line.querySelector('select[data-action="edit-donacion-donante"]')?.closest('.field');
    const ticket=line.querySelector('select[data-action="edit-donacion-ticket"]')?.closest('.field');
    const field=document.createElement('div');field.className='field ce-donation-status-field';
    field.innerHTML=`<label>Situación entrega</label><select data-action="edit-donacion-situacion" data-id="${id}">${options(value)}</select><small>Supuesta · Comprometida · Entregada</small>`;
    if(donor)line.insertBefore(field,donor);else if(ticket?.nextSibling)line.insertBefore(field,ticket.nextSibling);else line.appendChild(field);
    sel=field.querySelector('select');sel?.addEventListener('change',()=>{card.dataset.ceDonationStatus=normalize(sel.value);});
  }
  function ensureRows(){
    ensureStyle();
    const top=$('donSituacion');if(top&&!VALUES.includes(top.value))top.value='Comprometida';
    document.querySelectorAll('#donacionesList .itemcard').forEach(injectRow);
    document.querySelectorAll('#btnComprasResponsables,#btnDonacionesResponsables,#btnMapaResponsables,#btnVistaAereaResponsables').forEach(btn=>{
      try{btn.disabled=false;btn.removeAttribute('disabled');btn.removeAttribute('aria-disabled');btn.style.setProperty('pointer-events','auto','important');btn.style.setProperty('opacity','1','important');}catch(_){ }
    });
  }
  function donationTotals(){
    const ev=text($('selectedEvent')?.value||state().selectedEventId);const totals={Supuesta:0,Comprometida:0,Entregada:0,total:0,rows:0};
    rows().filter(r=>text(r.eventId||r.event_id)===ev&&isDonation(r)).forEach(r=>{const v=Number(r.precio||0)*Number(r.unidades||0),k=normalize(r.donacionSituacion||r.donacion_situacion);totals[k]+=v;totals.total+=v;totals.rows++;});return totals;
  }
  const obs=new MutationObserver(()=>ensureRows());
  function install(){ensureRows();const host=$('tabDonaciones')||document.body;if(host&&!host.__ceDonationSituationObs){host.__ceDonationSituationObs=true;obs.observe(host,{childList:true,subtree:true});}}
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:event-loaded','controlevent:module-mounted'].forEach(n=>root.addEventListener(n,()=>setTimeout(install,20)));
  document.addEventListener('click',()=>setTimeout(ensureRows,40),true);document.addEventListener('change',e=>{if(e.target?.id==='selectedEvent')setTimeout(ensureRows,80);},true);
  [0,120,500,1200].forEach(ms=>setTimeout(install,ms));
  root.ControlEventDonationStatus={values:VALUES,normalize,totals:donationTotals,refresh:ensureRows};
})(window);
