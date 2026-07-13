// ControlEvent v20_prod · FIX23: selector estable por fecha + avance evento definitivo.
(function(){
  'use strict';
  if(window.__CE_V20_FIX23_APPLIED__) return;
  window.__CE_V20_FIX23_APPLIED__ = true;
  const $=id=>document.getElementById(id);
  const txt=v=>String(v==null?'':v).trim();
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const up=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const appState=()=>{try{return (typeof window.state!=='undefined'&&window.state)||window.ControlEventApp?.state||window.AppState||{};}catch(_){return {};}};
  const arr=v=>Array.isArray(v)?v:[];
  function parseDateKey(v){
    const raw=txt(v); if(!raw) return 99999999;
    let m=raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
    if(m){let y=Number(m[3]); if(y<100)y+=(y>=70?1900:2000); return Number(String(y).padStart(4,'0')+String(Number(m[2])).padStart(2,'0')+String(Number(m[1])).padStart(2,'0'))||99999999;}
    m=raw.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
    if(m) return Number(m[1]+String(Number(m[2])).padStart(2,'0')+String(Number(m[3])).padStart(2,'0'))||99999999;
    const d=new Date(raw); return Number.isNaN(d.getTime())?99999999:Number(String(d.getFullYear())+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0'));
  }
  function evId(e){return txt(e?.id||e?.ID||e?.eventoId||'');}
  function evTitle(e){return txt(e?.titulo||e?.nombre||e?.title||e?.Evento||e?.id||'Evento');}
  function evDate(e){return parseDateKey(e?.fechaIni||e?.fecha_ini||e?.fechaInicio||e?.startDate||e?.EVENTO_FECHAINI||e?.FECHAINI||e?.FECHA_INI||'');}
  function isCurso(e){return /CURSO/.test(up(e?.situacion||e?.estado||e?.status||''));}
  function isFinal(e){return /FINAL/.test(up(e?.situacion||e?.estado||e?.status||''));}
  function eventCatalog(){
    const s=appState();
    const candidates=[s.eventos, s.events, window.__CE_EVENTS_CATALOG__, window.__ceEventosCatalog, window.ceEventosCatalog];
    for(const c of candidates){ if(Array.isArray(c) && c.length) return c; }
    return [];
  }
  function injectCss(){
    if($('ceV20Fix23Style')) return;
    const st=document.createElement('style'); st.id='ceV20Fix23Style';
    st.textContent=`
      #selectedEvent option.ce-v20-curso{color:#16a34a!important;-webkit-text-fill-color:#16a34a!important;font-weight:950!important;background:#fff!important;}
      #selectedEvent option.ce-v20-finalizado{color:#b91c1c!important;-webkit-text-fill-color:#b91c1c!important;font-weight:950!important;background:#fff!important;}
      #selectedEvent option.ce-v20-neutro{color:#0f172a!important;-webkit-text-fill-color:#0f172a!important;font-weight:700!important;background:#fff!important;}
    `;
    document.head.appendChild(st);
  }
  let lastSig='';
  function normalizeSelector(){
    const sel=$('selectedEvent'); const eventos=eventCatalog();
    if(!sel || !eventos.length) return;
    const current=txt(sel.value||appState().selectedEventId||'');
    const ordered=eventos.slice().filter(e=>evId(e)).sort((a,b)=>{
      const da=evDate(a), db=evDate(b); if(da!==db) return da-db;
      return evTitle(a).localeCompare(evTitle(b),'es',{sensitivity:'base',numeric:true});
    });
    const sig=ordered.map(e=>`${evId(e)}:${evDate(e)}:${up(e?.situacion||e?.estado||'')}`).join('|')+'|sel='+current;
    if(sig===lastSig && sel.dataset.ceV20Fix23==='ok') return;
    const scrollTop=sel.scrollTop||0;
    sel.innerHTML='<option value="">Selecciona evento...</option>'+ordered.map(e=>{
      const curso=isCurso(e), final=isFinal(e);
      const cls=curso?'ce-v20-curso':(final?'ce-v20-finalizado':'ce-v20-neutro');
      const style=curso?'color:#16a34a;font-weight:950;':(final?'color:#b91c1c;font-weight:950;':'color:#0f172a;font-weight:700;');
      return `<option value="${esc(evId(e))}" class="${cls}" style="${style}" ${evId(e)===current?'selected':''}>${esc(evTitle(e))}</option>`;
    }).join('');
    if(current) sel.value=current;
    try{sel.scrollTop=scrollTop;}catch(_){ }
    sel.dataset.ceV20Fix23='ok'; lastSig=sig;
  }
  function run(){injectCss(); normalizeSelector();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
  window.addEventListener('load',run,{once:true});
  window.addEventListener('controlevent:event-ready',()=>setTimeout(run,30));
  window.addEventListener('controlevent:event-loaded',()=>{setTimeout(run,30); setTimeout(run,180); setTimeout(run,600);});
  document.addEventListener('pointerdown',ev=>{if(ev.target?.id==='selectedEvent') normalizeSelector();},true);
  document.addEventListener('mousedown',ev=>{if(ev.target?.id==='selectedEvent') normalizeSelector();},true);
  document.addEventListener('focusin',ev=>{if(ev.target?.id==='selectedEvent') normalizeSelector();},true);
  document.addEventListener('click',ev=>{if(ev.target?.id==='selectedEvent') normalizeSelector();},true);
  document.addEventListener('change',ev=>{if(ev.target?.id==='selectedEvent'){setTimeout(run,80);setTimeout(run,220);setTimeout(run,650);}},true);
  [120,500,1200,2500].forEach(ms=>setTimeout(run,ms));
})();
