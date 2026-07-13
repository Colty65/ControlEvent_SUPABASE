// ControlEvent v20_prod · FIX27: selector ligero post-login + sin bloqueo de logon.
(function(){
  'use strict';
  if(window.__CE_V20_FIX27__) return;
  window.__CE_V20_FIX27__ = true;
  const $ = id => document.getElementById(id);
  const txt = v => String(v == null ? '' : v).trim();
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const up = v => txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const st = () => { try { return window.state || window.ControlEventApp?.state || window.AppState || {}; } catch(_) { return {}; } };
  function authVisible(){
    try{
      const o=$('authOverlay')||document.querySelector('.auth-overlay,.login-overlay,[data-auth-overlay]');
      if(!o) return false;
      const cs=getComputedStyle(o);
      return cs.display!=='none' && cs.visibility!=='hidden' && !o.classList.contains('hidden');
    }catch(_){ return false; }
  }
  function logged(){
    if(authVisible()) return false;
    const u=txt(document.querySelector('.user-name,.user-label,#userName,#loggedUser')?.textContent || '');
    if(!u || /^Sin acceso$/i.test(u)) return false;
    return true;
  }
  function injectCss(){
    if($('ceV20Fix27Style')) return;
    const s=document.createElement('style'); s.id='ceV20Fix27Style';
    s.textContent=`
      #selectedEvent option.ce-v20-curso{color:#16a34a!important;-webkit-text-fill-color:#16a34a!important;font-weight:950!important;background:#fff!important;}
      #selectedEvent option.ce-v20-finalizado{color:#b91c1c!important;-webkit-text-fill-color:#b91c1c!important;font-weight:950!important;background:#fff!important;}
      #selectedEvent option.ce-v20-neutro{color:#0f172a!important;-webkit-text-fill-color:#0f172a!important;font-weight:700!important;background:#fff!important;}
    `;
    document.head.appendChild(s);
  }
  function parseDateKey(v){
    const raw=txt(v); if(!raw) return 99999999;
    let m=raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
    if(m){let y=Number(m[3]); if(y<100)y+=(y>=70?1900:2000); return Number(String(y).padStart(4,'0')+String(Number(m[2])).padStart(2,'0')+String(Number(m[1])).padStart(2,'0'))||99999999;}
    m=raw.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
    if(m) return Number(m[1]+String(Number(m[2])).padStart(2,'0')+String(Number(m[3])).padStart(2,'0'))||99999999;
    const d=new Date(raw); return Number.isNaN(d.getTime())?99999999:Number(String(d.getFullYear())+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0'));
  }
  function titleDate(t){
    const raw=up(t); const months={ENE:1,FEB:2,MAR:3,ABR:4,APR:4,MAY:5,JUN:6,JUL:7,AGO:8,AUG:8,SEP:9,SET:9,OCT:10,NOV:11,DIC:12,DEC:12};
    let m=raw.match(/\b(\d{1,2})\s*(ENE|FEB|MAR|ABR|APR|MAY|JUN|JUL|AGO|AUG|SEP|SET|OCT|NOV|DIC|DEC)\s*(\d{2,4})\b/);
    if(m){let y=Number(m[3]); if(y<100)y+=2000; return Number(String(y)+String(months[m[2]]).padStart(2,'0')+String(Number(m[1])).padStart(2,'0'));}
    m=raw.match(/\b(ENE|FEB|MAR|ABR|APR|MAY|JUN|JUL|AGO|AUG|SEP|SET|OCT|NOV|DIC|DEC)\s*[-_ ]?\s*(\d{2,4})\b/);
    if(m){let y=Number(m[2]); if(y<100)y+=2000; return Number(String(y)+String(months[m[1]]).padStart(2,'0')+'01');}
    m=raw.match(/\b(20\d{2})\b/);
    if(m){const y=Number(m[1]); if(/CUOTAS.*CORRIENTES/.test(raw)) return y*10000+101; if(/INGRESOS.*GASTOS.*EXTRA/.test(raw)) return y*10000+102; if(/SEMANA\s+SANTA/.test(raw)) return y*10000+330; if(/SYSA/.test(raw)) return y*10000+724; if(/FUNCION/.test(raw)) return y*10000+1015; return y*10000+700;}
    return 99999999;
  }
  function idOf(e){ return txt(e?.id||e?.ID||e?.eventoId||e?.evento_id||''); }
  function titleOf(e){ return txt(e?.titulo||e?.nombre||e?.title||e?.label||e?.Evento||e?.id||'Evento'); }
  function dateOf(e){
    const fields=['fechaIni','fecha_ini','fechaInicio','fecha_inicio','fechaInicioEvento','fecha_desde','fechaDesde','desde','inicio','startDate','start','EVENTO_FECHAINI','FECHAINI','FECHA_INI','FechaInicio','FechaInicioEvento','fecha'];
    for(const k of fields){ const dk=parseDateKey(e?.[k]); if(dk!==99999999) return dk; }
    return titleDate(titleOf(e));
  }
  function statusOf(e,opt){
    const d=up(e?.situacion||e?.estado||e?.status||e?.Situacion||e?.Estado||'');
    if(d) return d;
    const cls=String(opt?.className||'')+' '+String(opt?.getAttribute?.('style')||'');
    if(/curso|16a34a|green|verde/i.test(cls)) return 'EN CURSO';
    if(/final|b91c1c|red|rojo/i.test(cls)) return 'FINALIZADO';
    return '';
  }
  let cachedOrder=null;
  function captureInitialOrder(sel){
    if(cachedOrder) return cachedOrder;
    cachedOrder={}; let i=1;
    [...(sel?.options||[])].forEach(o=>{const id=txt(o.value); if(id) cachedOrder[id]=i++;});
    return cachedOrder;
  }
  let lastSig='';
  function normalize(){
    if(!logged()) return;
    const sel=$('selectedEvent'); if(!sel || sel.options.length<2) return;
    injectCss();
    const current=txt(sel.value || st().selectedEventId || '');
    const optById=new Map(); [...sel.options].forEach(o=>{const id=txt(o.value); if(id) optById.set(id,o);});
    const base=captureInitialOrder(sel);
    const map=new Map();
    [...sel.options].forEach((o,idx)=>{const id=txt(o.value); if(id) map.set(id,{id,titulo:txt(o.textContent),__base:base[id]||idx});});
    [st().eventos,st().events,window.__CE_EVENTS_CATALOG__,window.__ceEventosCatalog,window.ceEventosCatalog].forEach(list=>{
      if(Array.isArray(list)) list.forEach(e=>{const id=idOf(e); if(!id) return; map.set(id,Object.assign({},map.get(id)||{},e,{id,titulo:titleOf(e)||map.get(id)?.titulo}));});
    });
    const rows=[...map.values()].filter(x=>idOf(x)); if(!rows.length) return;
    rows.sort((a,b)=>{ const da=dateOf(a), db=dateOf(b); if(da!==db) return da-db; const ba=base[idOf(a)]||999999, bb=base[idOf(b)]||999999; if(ba!==bb) return ba-bb; return titleOf(a).localeCompare(titleOf(b),'es',{sensitivity:'base',numeric:true}); });
    const sig=rows.map(e=>`${idOf(e)}:${dateOf(e)}:${statusOf(e,optById.get(idOf(e)))}`).join('|')+'|'+current;
    if(sig===lastSig && sel.dataset.ceV20Fix27==='ok') return;
    sel.innerHTML='<option value="">Selecciona evento...</option>'+rows.map(e=>{
      const id=idOf(e), stat=statusOf(e,optById.get(id));
      const curso=/CURSO/.test(stat), fin=/FINAL/.test(stat);
      const cls=curso?'ce-v20-curso':(fin?'ce-v20-finalizado':'ce-v20-neutro');
      const style=curso?'color:#16a34a;font-weight:950;':(fin?'color:#b91c1c;font-weight:950;':'color:#0f172a;font-weight:700;');
      return `<option value="${esc(id)}" class="${cls}" style="${style}" ${id===current?'selected':''}>${esc(titleOf(e))}</option>`;
    }).join('');
    if(current) sel.value=current;
    sel.dataset.ceV20Fix27='ok'; lastSig=sig;
  }
  function deferred(){ setTimeout(normalize, 40); }
  document.addEventListener('pointerdown',e=>{ if(e.target?.id==='selectedEvent') deferred(); },true);
  document.addEventListener('mousedown',e=>{ if(e.target?.id==='selectedEvent') deferred(); },true);
  document.addEventListener('focusin',e=>{ if(e.target?.id==='selectedEvent') deferred(); },true);
  document.addEventListener('change',e=>{ if(e.target?.id==='selectedEvent') setTimeout(normalize,120); },true);
  window.addEventListener('controlevent:event-ready',()=>setTimeout(normalize,120));
  window.addEventListener('controlevent:event-loaded',()=>setTimeout(normalize,120));
})();
