// ControlEvent v20_prod · FIX25: selector de eventos ligero, ordenado por fecha y sin trabajo en login.
(function(){
  'use strict';
  if(window.__CE_V20_FIX25_SELECTOR__) return;
  window.__CE_V20_FIX25_SELECTOR__ = true;
  const $=id=>document.getElementById(id);
  const txt=v=>String(v==null?'':v).trim();
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const up=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const state=()=>{try{return (typeof window.state!=='undefined'&&window.state)||window.ControlEventApp?.state||window.AppState||{};}catch(_){return {};}};
  function injectCss(){
    if($('ceV20Fix25SelectorStyle')) return;
    const st=document.createElement('style'); st.id='ceV20Fix25SelectorStyle';
    st.textContent=`#selectedEvent option.ce-event-curso{color:#16a34a!important;-webkit-text-fill-color:#16a34a!important;font-weight:950!important;background:#fff!important;}#selectedEvent option.ce-event-finalizado{color:#b91c1c!important;-webkit-text-fill-color:#b91c1c!important;font-weight:950!important;background:#fff!important;}#selectedEvent option.ce-event-neutro{color:#0f172a!important;-webkit-text-fill-color:#0f172a!important;font-weight:700!important;background:#fff!important;}`;
    document.head.appendChild(st);
  }
  function parseDateKey(v){
    const raw=txt(v); if(!raw) return 99999999;
    let m=raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
    if(m){let y=Number(m[3]); if(y<100)y+=(y>=70?1900:2000); return Number(String(y).padStart(4,'0')+String(Number(m[2])).padStart(2,'0')+String(Number(m[1])).padStart(2,'0'))||99999999;}
    m=raw.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
    if(m) return Number(m[1]+String(Number(m[2])).padStart(2,'0')+String(Number(m[3])).padStart(2,'0'))||99999999;
    const d=new Date(raw); return Number.isNaN(d.getTime())?99999999:Number(String(d.getFullYear())+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0'));
  }
  function dateFromTitle(t){
    const raw=up(t);
    const months={ENE:1,FEB:2,MAR:3,ABR:4,APR:4,MAY:5,JUN:6,JUL:7,AGO:8,AUG:8,SEP:9,SET:9,OCT:10,NOV:11,DIC:12,DEC:12};
    let m=raw.match(/\b(\d{1,2})\s*(ENE|FEB|MAR|ABR|APR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC|DEC)\s*(\d{2,4})\b/);
    if(m){let y=Number(m[3]); if(y<100)y+=2000; return Number(String(y)+String(months[m[2]]).padStart(2,'0')+String(Number(m[1])).padStart(2,'0'));}
    m=raw.match(/\b(ENE|FEB|MAR|ABR|APR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC|DEC)\s*[-_ ]?\s*(\d{2,4})\b/);
    if(m){let y=Number(m[2]); if(y<100)y+=2000; return Number(String(y)+String(months[m[1]]).padStart(2,'0')+'01');}
    m=raw.match(/\b(20\d{2})\b/);
    if(m){const y=Number(m[1]); if(/CUOTAS.*CORRIENTES/.test(raw)) return y*10000+101; if(/INGRESOS.*GASTOS.*EXTRA/.test(raw)) return y*10000+102; if(/SEMANA\s+SANTA/.test(raw)) return y*10000+330; if(/SYSA/.test(raw)) return y*10000+724; if(/FUNCION/.test(raw)) return y*10000+1015; return y*10000+700;}
    return 99999999;
  }
  function evId(e){return txt(e?.id||e?.ID||e?.eventoId||e?.evento_id||'');}
  function evTitle(e){return txt(e?.titulo||e?.nombre||e?.title||e?.Evento||e?.label||e?.id||'Evento');}
  function evDate(e){
    const fields=['fechaIni','fecha_ini','fechaInicio','fecha_inicio','fechaInicioEvento','fecha_desde','fechaDesde','desde','inicio','startDate','start','EVENTO_FECHAINI','FECHAINI','FECHA_INI','FechaInicio','FechaInicioEvento','fecha'];
    for(const k of fields){ const dk=parseDateKey(e?.[k]); if(dk!==99999999) return dk; }
    return dateFromTitle(evTitle(e));
  }
  function headerEstado(){
    const candidates=[...document.querySelectorAll('span,div,b,strong')].slice(0,250).map(el=>txt(el.textContent)).filter(Boolean);
    if(candidates.some(t=>/^En curso$/i.test(t))) return 'EN CURSO';
    if(candidates.some(t=>/^Finalizado$/i.test(t))) return 'FINALIZADO';
    return '';
  }
  function status(e,current){
    let s=up(e?.situacion||e?.estado||e?.status||e?.Situacion||e?.Estado||'');
    if(!s && current && evId(e)===current) s=headerEstado();
    return s;
  }
  function isCurso(e,current){return /CURSO/.test(status(e,current));}
  function isFinal(e,current){return /FINAL/.test(status(e,current));}
  function collectEvents(){
    const sel=$('selectedEvent'); const current=txt(sel?.value||state().selectedEventId||'');
    const by=new Map();
    const add=e=>{const id=evId(e); if(!id) return; by.set(id,Object.assign({},by.get(id)||{},e,{id,titulo:evTitle(e)}));};
    const s=state(); [s.eventos,s.events,window.__CE_EVENTS_CATALOG__,window.ceEventosCatalog,window.__ceEventosCatalog].forEach(list=>Array.isArray(list)&&list.forEach(add));
    if(sel) [...sel.options].forEach(o=>{const id=txt(o.value); if(!id) return; const existing=by.get(id)||{}; by.set(id,Object.assign({id,titulo:txt(o.textContent),__optionDate:dateFromTitle(o.textContent)},existing));});
    return {current, eventos:[...by.values()].filter(e=>evId(e))};
  }
  let lastSig='';
  function normalizeSelector(){
    const sel=$('selectedEvent'); if(!sel) return;
    const {current,eventos}=collectEvents(); if(!eventos.length) return;
    const ordered=eventos.slice().sort((a,b)=>{const da=evDate(a), db=evDate(b); if(da!==db) return da-db; return evTitle(a).localeCompare(evTitle(b),'es',{sensitivity:'base',numeric:true});});
    const sig=ordered.map(e=>`${evId(e)}:${evDate(e)}:${status(e,current)}`).join('|')+'|'+current;
    if(sig===lastSig && sel.dataset.ceV20Fix25==='ok') return;
    sel.innerHTML='<option value="">Selecciona evento...</option>'+ordered.map(e=>{const curso=isCurso(e,current), final=isFinal(e,current); const cls=curso?'ce-event-curso':(final?'ce-event-finalizado':'ce-event-neutro'); const style=curso?'color:#16a34a;font-weight:950;':(final?'color:#b91c1c;font-weight:950;':'color:#0f172a;font-weight:700;'); return `<option value="${esc(evId(e))}" class="${cls}" style="${style}" ${evId(e)===current?'selected':''}>${esc(evTitle(e))}</option>`;}).join('');
    if(current) sel.value=current;
    sel.dataset.ceV20Fix25='ok'; lastSig=sig;
  }
  function run(){injectCss(); normalizeSelector();}
  // Sin timers ni trabajo antes de login: solo actúa cuando el usuario usa el selector o cuando la app avisa de evento cargado.
  document.addEventListener('pointerdown',ev=>{if(ev.target?.id==='selectedEvent') run();},true);
  document.addEventListener('mousedown',ev=>{if(ev.target?.id==='selectedEvent') run();},true);
  document.addEventListener('focusin',ev=>{if(ev.target?.id==='selectedEvent') run();},true);
  document.addEventListener('change',ev=>{if(ev.target?.id==='selectedEvent') setTimeout(run,60);},true);
  window.addEventListener('controlevent:event-loaded',()=>setTimeout(run,60));
  window.addEventListener('controlevent:event-ready',()=>setTimeout(run,60));
})();
