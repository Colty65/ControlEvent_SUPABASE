// ControlEvent v20_prod · FIX26: login ligero + selector estable post-login + asistencia parcial de parejas delegada a avance.
(function(){
  'use strict';
  if(window.__CE_V20_FIX26__) return;
  window.__CE_V20_FIX26__ = true;
  const $ = id => document.getElementById(id);
  const txt = v => String(v == null ? '' : v).trim();
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const up = v => txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const state = () => { try{return window.state || window.ControlEventApp?.state || window.AppState || window.ControlEventState || {}; }catch(_){return {};} };

  function injectCss(){
    if($('ceV20Fix26Style')) return;
    const st=document.createElement('style'); st.id='ceV20Fix26Style';
    st.textContent=`
      #selectedEvent option.ce-event-curso{color:#16a34a!important;-webkit-text-fill-color:#16a34a!important;font-weight:950!important;background:#fff!important;}
      #selectedEvent option.ce-event-finalizado{color:#b91c1c!important;-webkit-text-fill-color:#b91c1c!important;font-weight:950!important;background:#fff!important;}
      #selectedEvent option.ce-event-neutro{color:#0f172a!important;-webkit-text-fill-color:#0f172a!important;font-weight:700!important;background:#fff!important;}
    `;
    document.head.appendChild(st);
  }
  function loginVisible(){
    try{
      const ov=$('authOverlay')||document.querySelector('.auth-overlay,.login-overlay,[data-auth-overlay]');
      if(ov && getComputedStyle(ov).display!=='none' && getComputedStyle(ov).visibility!=='hidden' && !ov.classList.contains('hidden')) return true;
    }catch(_){ }
    return false;
  }
  function isLogged(){
    const userTxt = txt(document.querySelector('.user-name,.user-label,#userName,#loggedUser')?.textContent || '');
    if(/^Sin acceso$/i.test(userTxt)) return false;
    const s=state();
    return !loginVisible() && !!(s.authUser||s.user||window.authUser||window.currentUser||window.__CONTROL_EVENT_USER__||window.__CONTROL_EVENT_LOGIN_USER__||userTxt);
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
    const raw=up(t); const months={ENE:1,FEB:2,MAR:3,ABR:4,APR:4,MAY:5,JUN:6,JUL:7,AGO:8,AUG:8,SEP:9,SET:9,OCT:10,NOV:11,DIC:12,DEC:12};
    let m=raw.match(/\b(\d{1,2})\s*(ENE|FEB|MAR|ABR|APR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC|DEC)\s*(\d{2,4})\b/);
    if(m){let y=Number(m[3]); if(y<100)y+=2000; return Number(String(y)+String(months[m[2]]).padStart(2,'0')+String(Number(m[1])).padStart(2,'0'));}
    m=raw.match(/\b(ENE|FEB|MAR|ABR|APR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC|DEC)\s*[-_ ]?\s*(\d{2,4})\b/);
    if(m){let y=Number(m[2]); if(y<100)y+=2000; return Number(String(y)+String(months[m[1]]).padStart(2,'0')+'01');}
    m=raw.match(/\b(20\d{2})\b/);
    if(m){const y=Number(m[1]); if(/CUOTAS.*CORRIENTES/.test(raw)) return y*10000+101; if(/INGRESOS.*GASTOS.*EXTRA/.test(raw)) return y*10000+102; if(/SEMANA\s+SANTA/.test(raw)) return y*10000+330; if(/SYSA/.test(raw)) return y*10000+724; if(/FUNCION/.test(raw)) return y*10000+1015; return y*10000+700;}
    return 99999999;
  }
  function idOf(e){return txt(e?.id||e?.ID||e?.eventoId||e?.evento_id||'');}
  function titleOf(e){return txt(e?.titulo||e?.nombre||e?.title||e?.Evento||e?.label||e?.id||'Evento');}
  function dateOf(e){
    const fields=['fechaIni','fecha_ini','fechaInicio','fecha_inicio','fechaInicioEvento','fecha_desde','fechaDesde','desde','inicio','startDate','start','EVENTO_FECHAINI','FECHAINI','FECHA_INI','FechaInicio','FechaInicioEvento','fecha'];
    for(const k of fields){ const dk=parseDateKey(e?.[k]); if(dk!==99999999) return dk; }
    const od=Number(e?.__ceFix26OrderKey||0); if(od>0) return od;
    return dateFromTitle(titleOf(e));
  }
  function statusOf(e, opt){
    const direct=up(e?.situacion||e?.estado||e?.status||e?.Situacion||e?.Estado||'');
    if(direct) return direct;
    const cls=String(opt?.className||'')+' '+String(opt?.getAttribute?.('style')||'');
    if(/curso|16a34a|green/i.test(cls)) return 'EN CURSO';
    if(/final|b91c1c|red/i.test(cls)) return 'FINALIZADO';
    return '';
  }
  function cacheOptionOrder(sel){
    if(!sel || sel.options.length<3) return;
    const map={}; let i=1;
    [...sel.options].forEach(o=>{const id=txt(o.value); if(id) map[id]=i++;});
    try{ sessionStorage.setItem('CE_V20_EVENT_ORDER_FIX26', JSON.stringify(map)); }catch(_){ }
  }
  function getCachedOrder(){ try{return JSON.parse(sessionStorage.getItem('CE_V20_EVENT_ORDER_FIX26')||'{}')||{};}catch(_){return{};} }
  let lastSig='';
  function normalizeSelector(reason){
    if(!isLogged()) return;
    injectCss();
    const sel=$('selectedEvent'); if(!sel || sel.options.length<2) return;
    const current=txt(sel.value || state().selectedEventId || '');
    const cached=getCachedOrder();
    const by=new Map();
    const optById=new Map();
    [...sel.options].forEach((o,idx)=>{const id=txt(o.value); if(!id) return; optById.set(id,o); by.set(id,{id,titulo:txt(o.textContent),__ceFix26OrderKey:cached[id]||idx});});
    const s=state();
    [s.eventos,s.events,window.__CE_EVENTS_CATALOG__,window.ceEventosCatalog,window.__ceEventosCatalog].forEach(list=>{
      if(Array.isArray(list)) list.forEach(e=>{const id=idOf(e); if(!id) return; by.set(id,Object.assign({},by.get(id)||{},e,{id,titulo:titleOf(e)}));});
    });
    const rows=[...by.values()].filter(e=>idOf(e)); if(!rows.length) return;
    const ordered=rows.slice().sort((a,b)=>{
      const da=dateOf(a), db=dateOf(b);
      if(da!==db) return da-db;
      const ca=cached[idOf(a)]||9999, cb=cached[idOf(b)]||9999;
      if(ca!==cb) return ca-cb;
      return titleOf(a).localeCompare(titleOf(b),'es',{sensitivity:'base',numeric:true});
    });
    const sig=ordered.map(e=>`${idOf(e)}:${dateOf(e)}:${statusOf(e,optById.get(idOf(e)))}`).join('|')+'|'+current;
    if(sig===lastSig && sel.dataset.ceV20Fix26==='ok') return;
    sel.innerHTML='<option value="">Selecciona evento...</option>'+ordered.map(e=>{
      const id=idOf(e); const st=statusOf(e,optById.get(id));
      const fin=/FINAL/.test(st); const curso=/CURSO/.test(st) || (!fin && st==='EN CURSO');
      const cls=curso?'ce-event-curso':(fin?'ce-event-finalizado':'ce-event-neutro');
      const style=curso?'color:#16a34a;font-weight:950;':(fin?'color:#b91c1c;font-weight:950;':'color:#0f172a;font-weight:700;');
      return `<option value="${esc(id)}" class="${cls}" style="${style}" ${id===current?'selected':''}>${esc(titleOf(e))}</option>`;
    }).join('');
    if(current) sel.value=current;
    sel.dataset.ceV20Fix26='ok'; lastSig=sig; cacheOptionOrder(sel);
  }
  function beforeUserOpens(){ const sel=$('selectedEvent'); if(sel && sel.options.length>2 && !sessionStorage.getItem('CE_V20_EVENT_ORDER_FIX26')) cacheOptionOrder(sel); normalizeSelector('open'); }
  document.addEventListener('pointerdown',ev=>{ if(ev.target?.id==='selectedEvent') beforeUserOpens(); },true);
  document.addEventListener('mousedown',ev=>{ if(ev.target?.id==='selectedEvent') beforeUserOpens(); },true);
  document.addEventListener('focusin',ev=>{ if(ev.target?.id==='selectedEvent') beforeUserOpens(); },true);
  document.addEventListener('change',ev=>{ if(ev.target?.id==='selectedEvent'){ cacheOptionOrder(ev.target); setTimeout(()=>normalizeSelector('change'),40); setTimeout(()=>normalizeSelector('change-late'),260); } },true);
  window.addEventListener('controlevent:event-ready',()=>setTimeout(()=>normalizeSelector('event-ready'),80));
  window.addEventListener('controlevent:event-loaded',()=>setTimeout(()=>normalizeSelector('event-loaded'),80));
  window.addEventListener('controlevent:login-ok',()=>setTimeout(()=>normalizeSelector('login-ok'),150));
})();
