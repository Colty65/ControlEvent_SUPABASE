// ControlEvent v20_prod · FIX22 mínimo: orden selector por fecha, color En curso y refuerzo avance.
(function(){
  'use strict';
  if(window.__CE_V20_FIX22_APPLIED__) return;
  window.__CE_V20_FIX22_APPLIED__ = true;
  const $=id=>document.getElementById(id);
  const txt=v=>String(v==null?'':v).trim();
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const up=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const state=()=>{try{return (typeof window.state!=='undefined'&&window.state)||window.ControlEventApp?.state||window.AppState||{};}catch(_){return {};}};
  const arr=v=>Array.isArray(v)?v:[];
  function parseDateKey(v){
    const raw=txt(v); if(!raw) return 99999999;
    let m=raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if(m){let y=Number(m[3]); if(y<100)y+=(y>=70?1900:2000); return Number(String(y).padStart(4,'0')+String(Number(m[2])).padStart(2,'0')+String(Number(m[1])).padStart(2,'0'))||99999999;}
    m=raw.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
    if(m) return Number(m[1]+String(Number(m[2])).padStart(2,'0')+String(Number(m[3])).padStart(2,'0'))||99999999;
    const d=new Date(raw); return Number.isNaN(d.getTime())?99999999:Number(String(d.getFullYear())+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0'));
  }
  function evTitle(e){return txt(e?.titulo||e?.nombre||e?.title||e?.Evento||e?.id||'Evento');}
  function evDate(e){return parseDateKey(e?.fechaIni||e?.fecha_ini||e?.fechaInicio||e?.startDate||e?.EVENTO_FECHAINI||e?.FECHAINI||e?.FECHA_INI||'');}
  function isCurso(e){return /CURSO/.test(up(e?.situacion||e?.estado||e?.status||''));}
  function isFinal(e){return /FINAL/.test(up(e?.situacion||e?.estado||e?.status||''));}
  function injectCss(){
    if($('ceV20Fix22Style')) return;
    const st=document.createElement('style'); st.id='ceV20Fix22Style';
    st.textContent=`
      .ce-v104-brand-mini span{font-size:0!important}.ce-v104-brand-mini span:after{content:'v20_prod'!important;font-size:14px!important;}
      #selectedEvent option.ce-event-curso{color:#16a34a!important;-webkit-text-fill-color:#16a34a!important;font-weight:900!important;background:#fff!important;}
      #selectedEvent option.ce-event-finalizado{color:#b91c1c!important;-webkit-text-fill-color:#b91c1c!important;font-weight:900!important;background:#fff!important;}
      #ceHf48AvanceLayer .ce-hf48-row b:before{content:''!important;}
      #ceHf48AvanceLayer .ce-hf48-row:nth-child(7){background:#f8fafc!important;border-color:#64748b!important;}
      #ceHf48AvanceLayer .ce-hf48-row:nth-child(7) .ce-hf48-bar i{background:#64748b!important;}
    `;
    document.head.appendChild(st);
  }
  function sortAndColorSelect(){
    const sel=$('selectedEvent'); const eventos=arr(state().eventos);
    if(!sel || !eventos.length) return;
    const current=txt(sel.value||state().selectedEventId||'');
    const ordered=eventos.slice().sort((a,b)=>{
      const da=evDate(a), db=evDate(b); if(da!==db) return da-db;
      const ca=isCurso(a)?0:(isFinal(a)?2:1), cb=isCurso(b)?0:(isFinal(b)?2:1); if(ca!==cb) return ca-cb;
      return evTitle(a).localeCompare(evTitle(b),'es',{sensitivity:'base',numeric:true});
    });
    const sig=ordered.map(e=>`${txt(e.id)}:${evDate(e)}:${txt(e.situacion||e.estado||'')}`).join('|')+'|'+current;
    if(sel.dataset.ceV20Fix22Sig===sig) return;
    sel.innerHTML='<option value="">Selecciona evento...</option>'+ordered.map(e=>{
      const cls=isCurso(e)?'ce-event-curso':(isFinal(e)?'ce-event-finalizado':'');
      const style=isCurso(e)?'color:#16a34a;font-weight:900;':(isFinal(e)?'color:#b91c1c;font-weight:900;':'');
      return `<option value="${esc(e.id)}" class="${cls}" style="${style}" ${txt(e.id)===current?'selected':''}>${esc(evTitle(e))}</option>`;
    }).join('');
    if(current) sel.value=current;
    sel.dataset.ceV20Fix22Sig=sig;
  }
  function patchVisibleVersion(){
    try{document.querySelectorAll('.ce-v104-brand-mini span,[class*=version],[id*=version]').forEach(el=>{if(/v20_prod/.test(el.textContent||'')) el.textContent=String(el.textContent).replace(/v20_prod/g,'v20_prod');});}catch(_){ }
  }
  function run(){injectCss(); sortAndColorSelect(); patchVisibleVersion();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
  window.addEventListener('controlevent:event-loaded',()=>setTimeout(run,80));
  window.addEventListener('controlevent:event-ready',()=>setTimeout(run,80));
  document.addEventListener('focusin',ev=>{if(ev.target?.id==='selectedEvent') setTimeout(sortAndColorSelect,0);},true);
  document.addEventListener('mousedown',ev=>{if(ev.target?.id==='selectedEvent') setTimeout(sortAndColorSelect,0);},true);
  document.addEventListener('change',ev=>{if(ev.target?.id==='selectedEvent') setTimeout(sortAndColorSelect,80);},true);
  [150,500,1200].forEach(ms=>setTimeout(run,ms));
})();
