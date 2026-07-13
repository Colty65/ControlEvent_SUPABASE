// ControlEvent v20_prod · FIX28: selector post-login + color/orden sin tocar logon.
(function(){
  'use strict';
  if(window.__CE_V20_FIX28_POSTLOGIN__) return;
  window.__CE_V20_FIX28_POSTLOGIN__ = true;
  const $=id=>document.getElementById(id);
  const txt=v=>String(v==null?'':v).trim();
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const up=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  function authVisible(){ const o=$('authOverlay'); if(!o) return false; const cs=getComputedStyle(o); return !o.classList.contains('hidden') && cs.display!=='none' && cs.visibility!=='hidden'; }
  function state(){ try{ return Function('return (typeof state!=="undefined")?state:null')() || window.state || window.ControlEventApp?.state || {}; }catch(_){ return window.state || window.ControlEventApp?.state || {}; } }
  function parseDate(v){
    const raw=txt(v); if(!raw) return 99999999; let m=raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
    if(m){let y=+m[3]; if(y<100)y+=2000; return +(String(y).padStart(4,'0')+String(+m[2]).padStart(2,'0')+String(+m[1]).padStart(2,'0'));}
    m=raw.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/); if(m) return +(m[1]+String(+m[2]).padStart(2,'0')+String(+m[3]).padStart(2,'0'));
    return 99999999;
  }
  function titleDate(t){
    const raw=up(t), months={ENE:1,FEB:2,MAR:3,ABR:4,APR:4,MAY:5,JUN:6,JUL:7,AGO:8,AUG:8,SEP:9,SET:9,OCT:10,NOV:11,DIC:12,DEC:12};
    let m=raw.match(/\b(\d{1,2})\s*(ENE|FEB|MAR|ABR|APR|MAY|JUN|JUL|AGO|AUG|SEP|SET|OCT|NOV|DIC|DEC)\s*(\d{2,4})\b/); if(m){let y=+m[3]; if(y<100)y+=2000; return +(String(y)+String(months[m[2]]).padStart(2,'0')+String(+m[1]).padStart(2,'0'));}
    m=raw.match(/\b(ENE|FEB|MAR|ABR|APR|MAY|JUN|JUL|AGO|AUG|SEP|SET|OCT|NOV|DIC|DEC)\s*[-_ ]?\s*(\d{2,4})\b/); if(m){let y=+m[2]; if(y<100)y+=2000; return +(String(y)+String(months[m[1]]).padStart(2,'0')+'01');}
    m=raw.match(/\b(20\d{2})\b/); if(m){const y=+m[1]; if(/CUOTAS.*CORRIENTES/.test(raw)) return y*10000+101; if(/INGRESOS.*GASTOS.*EXTRA/.test(raw)) return y*10000+102; if(/SEMANA\s+SANTA/.test(raw)) return y*10000+330; if(/SYSA/.test(raw)) return y*10000+724; if(/FUNCION/.test(raw)) return y*10000+1015; return y*10000+700;}
    return 99999999;
  }
  const idOf=e=>txt(e?.id||e?.ID||e?.eventoId||e?.evento_id||'');
  const titleOf=e=>txt(e?.titulo||e?.nombre||e?.title||e?.Evento||e?.label||'Evento');
  function dateOf(e){ for(const k of ['fechaIni','fecha_ini','fechaInicio','fecha_inicio','desde','inicio','startDate','FECHAINI','FECHA_INI','fecha']){const d=parseDate(e?.[k]); if(d!==99999999)return d;} return titleDate(titleOf(e)); }
  function statOf(e,opt){ let s=up(e?.situacion||e?.estado||e?.status||e?.Situacion||e?.Estado||''); if(s) return s; const st=String(opt?.getAttribute?.('style')||'')+String(opt?.className||''); if(/16a34a|green|verde|curso/i.test(st)) return 'EN CURSO'; if(/b91c1c|red|rojo|final/i.test(st)) return 'FINALIZADO'; return ''; }
  function css(){ if($('ceV20Fix28SelectorCss')) return; const s=document.createElement('style'); s.id='ceV20Fix28SelectorCss'; s.textContent='#selectedEvent option.ce-v20-curso{color:#16a34a!important;-webkit-text-fill-color:#16a34a!important;font-weight:950!important;background:#fff!important}#selectedEvent option.ce-v20-finalizado{color:#b91c1c!important;-webkit-text-fill-color:#b91c1c!important;font-weight:950!important;background:#fff!important}'; document.head.appendChild(s); }
  let last='';
  function normalize(){
    if(authVisible()) return;
    const sel=$('selectedEvent'); if(!sel || sel.options.length<2) return; css();
    const current=txt(sel.value||state().selectedEventId||'');
    const oldOptions=new Map([...sel.options].filter(o=>txt(o.value)).map(o=>[txt(o.value),o]));
    const rows=[]; const seen=new Set();
    const add=e=>{ const id=idOf(e); if(!id||seen.has(id))return; seen.add(id); rows.push(e); };
    (Array.isArray(state().eventos)?state().eventos:[]).forEach(add); (Array.isArray(state().events)?state().events:[]).forEach(add);
    [...oldOptions].forEach(([id,o])=>{ if(!seen.has(id)) rows.push({id,titulo:txt(o.textContent),situacion:statOf({},o),__fromOption:true}); });
    rows.sort((a,b)=>{ const da=dateOf(a),db=dateOf(b); if(da!==db)return da-db; return titleOf(a).localeCompare(titleOf(b),'es',{sensitivity:'base',numeric:true}); });
    const sig=rows.map(e=>idOf(e)+dateOf(e)+statOf(e,oldOptions.get(idOf(e)))).join('|')+'|'+current; if(sig===last) return; last=sig;
    sel.innerHTML='<option value="">Selecciona evento...</option>'+rows.map(e=>{ const id=idOf(e), st=statOf(e,oldOptions.get(id)); const curso=/CURSO/.test(st), fin=/FINAL/.test(st); return `<option value="${esc(id)}" class="${curso?'ce-v20-curso':fin?'ce-v20-finalizado':''}" style="${curso?'color:#16a34a;font-weight:950;':fin?'color:#b91c1c;font-weight:950;':''}" ${id===current?'selected':''}>${esc(titleOf(e))}</option>`; }).join('');
    if(current) sel.value=current;
  }
  function later(){ requestAnimationFrame(()=>normalize()); }
  function bind(){ const sel=$('selectedEvent'); if(!sel || sel.__ceFix28Bound) return; sel.__ceFix28Bound=true; ['pointerdown','mousedown','focus','click'].forEach(ev=>sel.addEventListener(ev,later,true)); sel.addEventListener('change',()=>setTimeout(normalize,60),true); }
  function post(){ if(authVisible()) return; bind(); normalize(); }
  window.addEventListener('controlevent:login-ready',()=>setTimeout(post,60));
  window.addEventListener('controlevent:event-ready',()=>setTimeout(post,60));
  window.addEventListener('controlevent:event-loaded',()=>setTimeout(post,60));
  document.addEventListener('focusin',e=>{ if(e.target?.id==='selectedEvent') post(); },true);
})();
