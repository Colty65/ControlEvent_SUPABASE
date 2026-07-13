// ControlEvent v20_prod · FIX24: selector estable por fecha también después de cambiar evento.
(function(){
  'use strict';
  if(window.__CE_V20_FIX24_SELECTOR_APPLIED__) return;
  window.__CE_V20_FIX24_SELECTOR_APPLIED__ = true;
  const $=id=>document.getElementById(id);
  const txt=v=>String(v==null?'':v).trim();
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const up=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const appState=()=>{try{return (typeof window.state!=='undefined'&&window.state)||window.ControlEventApp?.state||window.AppState||{};}catch(_){return {};}};
  const eventById=new Map();
  const baselineOrder=[];
  const baselineSeen=new Set();

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
    let m=raw.match(/\b(ENE|FEB|MAR|ABR|APR|MAY|JUN|JUL|AGO|AUG|SEP|SET|OCT|NOV|DIC|DEC)\s*[-_ ]?\s*(\d{2,4})\b/);
    if(m){let y=Number(m[2]); if(y<100)y+=2000; return Number(String(y)+String(months[m[1]]).padStart(2,'0')+'01');}
    m=raw.match(/\b(20\d{2})\b/);
    if(m){
      const y=Number(m[1]);
      if(/CUOTAS.*CORRIENTES/.test(raw)) return y*10000+101;
      if(/INGRESOS.*GASTOS.*EXTRA/.test(raw)) return y*10000+102;
      if(/SEMANA\s+SANTA/.test(raw)) return y*10000+330;
      if(/SYSA/.test(raw)) return y*10000+724;
      if(/FUNCION/.test(raw)) return y*10000+1015;
      return y*10000+700;
    }
    return 99999999;
  }
  function evId(e){return txt(e?.id||e?.ID||e?.eventoId||e?.evento_id||'');}
  function evTitle(e){return txt(e?.titulo||e?.nombre||e?.title||e?.Evento||e?.label||e?.id||'Evento');}
  function evDate(e){
    const fields=['fechaIni','fecha_ini','fechaInicio','fecha_inicio','fechaInicioEvento','fecha_desde','fechaDesde','desde','inicio','startDate','start','EVENTO_FECHAINI','FECHAINI','FECHA_INI','FechaInicio','FechaInicioEvento','fecha'];
    for(const k of fields){ const val=e?.[k]; const dk=parseDateKey(val); if(dk!==99999999) return dk; }
    return dateFromTitle(evTitle(e));
  }
  function isCurso(e){return /CURSO/.test(up(e?.situacion||e?.estado||e?.status||e?.Situacion||e?.Estado||''));}
  function isFinal(e){return /FINAL/.test(up(e?.situacion||e?.estado||e?.status||e?.Situacion||e?.Estado||''));}
  function mergeEvent(e){
    const id=evId(e); if(!id) return;
    const old=eventById.get(id)||{};
    eventById.set(id, Object.assign({}, old, e, {id, titulo: evTitle(e)||old.titulo}));
  }
  function rememberEvents(list){ if(!Array.isArray(list)) return; list.forEach(mergeEvent); }
  function captureSelectorOptions(){
    const sel=$('selectedEvent'); if(!sel) return;
    const opts=[...sel.options].filter(o=>txt(o.value));
    if(!opts.length) return;
    opts.forEach((o,idx)=>{
      const id=txt(o.value); const title=txt(o.textContent);
      if(!eventById.has(id)) eventById.set(id,{id,titulo:title,__optionDate:dateFromTitle(title)});
      if(!baselineSeen.has(id)){
        baselineSeen.add(id); baselineOrder.push(id);
      }
      const ev=eventById.get(id)||{};
      if(!ev.titulo) ev.titulo=title;
      // Conserva una situación si la opción o el estilo original ya la traía pintada.
      const cls=String(o.className||''); const st=String(o.getAttribute('style')||'').toLowerCase();
      if(!ev.situacion && (/curso/i.test(cls)||/16a34a|green|verde/i.test(st))) ev.situacion='En curso';
      if(!ev.situacion && (/final/i.test(cls)||/b91c1c|dc2626|red|rojo/i.test(st))) ev.situacion='Finalizado';
      eventById.set(id,ev);
    });
  }
  function eventCatalog(){
    const s=appState();
    [window.__CE_EVENTS_CATALOG__, window.__ceEventosCatalog, window.ceEventosCatalog, s.eventos, s.events].forEach(rememberEvents);
    captureSelectorOptions();
    return [...eventById.values()].filter(e=>evId(e));
  }
  function injectCss(){
    if($('ceV20Fix24Style')) return;
    const st=document.createElement('style'); st.id='ceV20Fix24Style';
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
    const orderMap=new Map(baselineOrder.map((id,i)=>[id,i]));
    const ordered=eventos.slice().filter(e=>evId(e)).sort((a,b)=>{
      const oa=orderMap.has(evId(a))?orderMap.get(evId(a)):999999;
      const ob=orderMap.has(evId(b))?orderMap.get(evId(b)):999999;
      // Si hay un orden base capturado al entrar, manda siempre. Es el que el usuario ve bien tras login.
      if(oa!==ob) return oa-ob;
      const da=evDate(a), db=evDate(b); if(da!==db) return da-db;
      return evTitle(a).localeCompare(evTitle(b),'es',{sensitivity:'base',numeric:true});
    });
    const sig=ordered.map(e=>`${evId(e)}:${evDate(e)}:${up(e?.situacion||e?.estado||'')}`).join('|')+'|sel='+current;
    if(sig===lastSig && sel.dataset.ceV20Fix24==='ok') return;
    const oldTop=sel.scrollTop||0;
    sel.innerHTML='<option value="">Selecciona evento...</option>'+ordered.map(e=>{
      const curso=isCurso(e), final=isFinal(e);
      const cls=curso?'ce-v20-curso':(final?'ce-v20-finalizado':'ce-v20-neutro');
      const style=curso?'color:#16a34a;font-weight:950;':(final?'color:#b91c1c;font-weight:950;':'color:#0f172a;font-weight:700;');
      return `<option value="${esc(evId(e))}" class="${cls}" style="${style}" ${evId(e)===current?'selected':''}>${esc(evTitle(e))}</option>`;
    }).join('');
    if(current) sel.value=current;
    try{sel.scrollTop=oldTop;}catch(_){ }
    sel.dataset.ceV20Fix24='ok'; lastSig=sig;
  }
  function run(){injectCss(); normalizeSelector();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
  window.addEventListener('load',run,{once:true});
  window.addEventListener('controlevent:event-ready',()=>setTimeout(run,40));
  window.addEventListener('controlevent:event-loaded',()=>{setTimeout(run,60); setTimeout(run,240);});
  document.addEventListener('pointerdown',ev=>{if(ev.target?.id==='selectedEvent') normalizeSelector();},true);
  document.addEventListener('mousedown',ev=>{if(ev.target?.id==='selectedEvent') normalizeSelector();},true);
  document.addEventListener('focusin',ev=>{if(ev.target?.id==='selectedEvent') normalizeSelector();},true);
  document.addEventListener('click',ev=>{if(ev.target?.id==='selectedEvent') normalizeSelector();},true);
  document.addEventListener('change',ev=>{if(ev.target?.id==='selectedEvent'){setTimeout(run,80); setTimeout(run,260);}},true);
  [120,600,1600].forEach(ms=>setTimeout(run,ms));
})();
