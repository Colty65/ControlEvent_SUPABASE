/* ControlEvent v17_prod - logo inicial fijo por CSS, sin ficha/texto ni cambios de tamaño. */
(function(){
  'use strict';
  const INSTALLED='__ceV17LogoFijoUnaVezFinal';
  if(window[INSTALLED]) return;
  window[INSTALLED]=true;
  const STYLE_ID='ceV17LogoFijoUnaVezStyle';
  const $=id=>document.getElementById(id);
  const norm=v=>String(v??'').trim();
  const safe=(fn,fb)=>{try{const out=fn();return out===undefined?fb:out;}catch(_){return fb;}};
  const getLexical=name=>safe(()=>Function('return (typeof '+name+'!=="undefined")?'+name+':undefined')(),undefined);
  const setLexical=(name,value)=>safe(()=>Function('value',name+'=value;')(value),undefined);
  function injectStyle(){
    if($(STYLE_ID)) return;
    const st=document.createElement('style'); st.id=STYLE_ID;
    st.textContent=`
      #noEventMessage{background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important;margin:0!important;min-height:44vh!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important;transition:none!important;animation:none!important;}
      #noEventMessage.hidden,body.ce-v17-has-event #noEventMessage,body.ce-v17-event-switching #noEventMessage{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;max-height:0!important;min-height:0!important;overflow:hidden!important;}
      #noEventMessage>*{display:none!important;visibility:hidden!important;opacity:0!important;max-height:0!important;overflow:hidden!important;}
      #noEventMessage::before{content:""!important;display:block!important;width:150px!important;height:150px!important;max-width:36vw!important;max-height:36vw!important;background:url('./assets/icons/controlevent-welcome-v44.png') center/contain no-repeat!important;border-radius:24px!important;filter:drop-shadow(0 12px 22px rgba(15,23,42,.20))!important;transform:none!important;transition:none!important;animation:none!important;}
    `;
    document.head.appendChild(st);
  }
  function stateObjects(){const out=[];const add=o=>{if(o&&typeof o==='object'&&!out.includes(o))out.push(o);};add(getLexical('state'));add(window.state);add(window.ControlEventApp?.state);add(window.ControlEventRuntime?.app?.state);return out;}
  function eventId(){for(const s of stateObjects()){if(norm(s?.selectedEventId))return norm(s.selectedEventId);}return norm($('selectedEvent')?.value||'');}
  function events(){for(const s of stateObjects()){if(Array.isArray(s?.eventos))return s.eventos;}return [];}
  function validEvent(id=eventId()){id=norm(id);return !!id&&events().some(e=>String(e?.id||'')===id);}
  function setGraficas(){setLexical('currentMainTab','graficas');try{window.currentMainTab='graficas';}catch(_){ }try{window.__ceCurrentMainTab='graficas';}catch(_){ }}
  function hideLogo(){document.body.classList.add('ce-v17-event-switching','ce-v17-has-event');const msg=$('noEventMessage');if(msg){msg.classList.add('hidden');msg.setAttribute('aria-hidden','true');msg.style.setProperty('display','none','important');}}
  function showLogoIfNoEvent(){injectStyle(); if(validEvent()){hideLogo();return;} document.body.classList.remove('ce-v17-event-switching','ce-v17-has-event'); const msg=$('noEventMessage'); if(msg){msg.classList.remove('hidden');msg.removeAttribute('aria-hidden');msg.style.removeProperty('display');}}
  function wrapChange(){
    const fn=getLexical('changeSelectedEvent')||window.changeSelectedEvent;
    if(typeof fn!=='function'||fn.__ceV17LogoFinal) return;
    const wrapped=function(value){if(norm(value)){setGraficas();hideLogo();} const ret=fn.apply(this,arguments); Promise.resolve(ret).finally(()=>setTimeout(()=>{document.body.classList.remove('ce-v17-event-switching'); if(validEvent())hideLogo();},40)); return ret;};
    wrapped.__ceV17LogoFinal=true; try{window.changeSelectedEvent=wrapped;setLexical('changeSelectedEvent',wrapped);}catch(_){window.changeSelectedEvent=wrapped;}
  }
  function install(){injectStyle();wrapChange();showLogoIfNoEvent();}
  document.addEventListener('change',ev=>{if(ev.target&&ev.target.id==='selectedEvent'&&norm(ev.target.value)){setGraficas();hideLogo();}},true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:data-loaded','controlevent:event-loaded'].forEach(evt=>window.addEventListener(evt,()=>setTimeout(install,20),true));
  [0,200,900].forEach(ms=>setTimeout(install,ms));
  window.ControlEventV17LogoFijo={install,hideLogo,showLogoIfNoEvent,version:'v17_prod_logo_fijo_una_vez'};
})();
