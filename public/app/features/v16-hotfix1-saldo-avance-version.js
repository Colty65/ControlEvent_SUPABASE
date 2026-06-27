/* ControlEvent v16_prod - HOTFIX1: cierre/colores avance + versión v16 visible. */
(function(){
  'use strict';
  const INSTALLED='__ceV16Hotfix1SaldoAvanceVersion';
  if(window[INSTALLED]) return; window[INSTALLED]=true;
  const VERSION='ControlEvent v16_prod';
  const VERSION_FILE='ControlEvent_v16_prod';
  const $=id=>document.getElementById(id);
  const isLayerVisible=layer=>!!(layer && layer.classList.contains('visible'));

  function injectStyle(){
    if($('ceV16Hotfix1Style')) return;
    const st=document.createElement('style'); st.id='ceV16Hotfix1Style';
    st.textContent=`
      #ceHf48AvanceLayer{pointer-events:auto!important;background:rgba(15,23,42,.18)!important;}
      #ceHf48AvanceLayer:not(.visible){display:none!important;pointer-events:none!important;}
      #ceHf48AvanceLayer.visible{display:flex!important;}
      #ceHf48AvanceLayer .ce-hf48-bubble{pointer-events:auto!important;}
      #ceHf48AvanceLayer .ce-hf48-row{border-width:2px!important;}
      #ceHf48AvanceLayer .ce-hf48-row:nth-child(1){background:#eff6ff!important;border-color:#2563eb!important;}
      #ceHf48AvanceLayer .ce-hf48-row:nth-child(1) .ce-hf48-bar i{background:#2563eb!important;background-color:#2563eb!important;}
      #ceHf48AvanceLayer .ce-hf48-row:nth-child(2){background:#ecfdf5!important;border-color:#16a34a!important;}
      #ceHf48AvanceLayer .ce-hf48-row:nth-child(2) .ce-hf48-bar i{background:#16a34a!important;background-color:#16a34a!important;}
      #ceHf48AvanceLayer .ce-hf48-row:nth-child(3){background:#fff7ed!important;border-color:#f59e0b!important;}
      #ceHf48AvanceLayer .ce-hf48-row:nth-child(3) .ce-hf48-bar i{background:#f59e0b!important;background-color:#f59e0b!important;}
      #ceHf48AvanceLayer .ce-hf48-row:nth-child(4){background:#fef2f2!important;border-color:#ef4444!important;}
      #ceHf48AvanceLayer .ce-hf48-row:nth-child(4) .ce-hf48-bar i{background:#ef4444!important;background-color:#ef4444!important;}
      #ceHf48AvanceLayer .ce-hf48-row:nth-child(5){background:#ecfdf5!important;border-color:#16a34a!important;}
      #ceHf48AvanceLayer .ce-hf48-row:nth-child(5) .ce-hf48-bar i{background:#16a34a!important;background-color:#16a34a!important;}
      #ceHf48AvanceLayer .ce-hf48-row:nth-child(6){background:#faf5ff!important;border-color:#8b5cf6!important;}
      #ceHf48AvanceLayer .ce-hf48-row:nth-child(6) .ce-hf48-bar i{background:#8b5cf6!important;background-color:#8b5cf6!important;}
    `;
    document.head.appendChild(st);
  }

  function applyVersion(){
    try{ document.title=VERSION; }catch(_){ }
    try{ document.body.dataset.ceVersion=VERSION; }catch(_){ }
    try{ window.__ceVersion=VERSION; window.VERSION=VERSION; window.VERSION_FILE=VERSION_FILE; window.ControlEventVersion={version:VERSION, versionFile:VERSION_FILE}; }catch(_){ }
    document.querySelectorAll('[data-ce-version-label],.ce-v104-brand-mini span,.appname span,.appname-stack span').forEach(el=>{
      try{
        const txt=el.textContent||'';
        if(/v\d+_prod/i.test(txt) || /ControlEvent\s+v\d+_prod/i.test(txt)) el.textContent=txt.replace(/ControlEvent\s+v\d+_prod/ig,VERSION).replace(/v\d+_prod/ig,'v16_prod');
      }catch(_){ }
    });
  }

  function colorAvanceBars(){
    const colors=['#2563eb','#16a34a','#f59e0b','#ef4444','#16a34a','#8b5cf6'];
    const bgs=['#eff6ff','#ecfdf5','#fff7ed','#fef2f2','#ecfdf5','#faf5ff'];
    const layer=$('ceHf48AvanceLayer'); if(!layer) return;
    Array.from(layer.querySelectorAll('.ce-hf48-row')).forEach((row,i)=>{
      const color=colors[i]||colors[0]; const bg=bgs[i]||bgs[0];
      try{ row.style.setProperty('border-color',color,'important'); row.style.setProperty('background',bg,'important'); }catch(_){ }
      const bar=row.querySelector('.ce-hf48-bar i');
      if(bar){ try{ bar.style.setProperty('background',color,'important'); bar.style.setProperty('background-color',color,'important'); }catch(_){ } }
    });
  }

  let closeTimer=0;
  function hardCloseAvance(){
    const layer=$('ceHf48AvanceLayer'); if(!layer) return;
    try{ layer.classList.remove('visible'); layer.setAttribute('aria-hidden','true'); }catch(_){ }
    clearTimeout(closeTimer);
  }
  function scheduleClose(ms){
    clearTimeout(closeTimer);
    closeTimer=setTimeout(hardCloseAvance, ms||4200);
  }
  function bindClose(){
    if(window.__ceV16AvanceCloseBound) return;
    window.__ceV16AvanceCloseBound=true;
    const closeEvents=['pointerdown','mousedown','touchstart','click'];
    closeEvents.forEach(evName=>{
      document.addEventListener(evName, ev=>{
        const layer=$('ceHf48AvanceLayer');
        if(!isLayerVisible(layer)) return;
        const target=ev.target;
        const insideBubble=!!target?.closest?.('.ce-hf48-bubble');
        const isLogo=!!target?.closest?.('.brand,img.brand-logo-large,img[alt*="Colty"],.brand-logo-large');
        const isClose=!!target?.closest?.('.ce-hf48-close');
        if(isClose || (!insideBubble && !isLogo)){
          try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ }
          hardCloseAvance();
        }
      }, true);
    });
    document.addEventListener('keydown', ev=>{ if(ev.key==='Escape') hardCloseAvance(); }, true);
    window.addEventListener('scroll', ()=>{ const layer=$('ceHf48AvanceLayer'); if(isLayerVisible(layer)) hardCloseAvance(); }, true);
  }
  function wrapShow(){
    const api=window.ControlEventHf48;
    if(!api || typeof api.showAvance!=='function' || api.__ceV16ShowWrapped) return;
    const orig=api.showAvance;
    api.showAvance=function(){
      const out=orig.apply(this, arguments);
      [0,50,180,500].forEach(ms=>setTimeout(colorAvanceBars,ms));
      setTimeout(()=>{
        const layer=$('ceHf48AvanceLayer');
        if(layer){ try{ layer.removeAttribute('aria-hidden'); }catch(_){ } }
        scheduleClose(4200);
      },40);
      return out;
    };
    api.__ceV16ShowWrapped=true;
  }
  function observeAvance(){
    if(window.__ceV16AvanceObserver) return;
    try{
      window.__ceV16AvanceObserver=new MutationObserver(()=>{ colorAvanceBars(); wrapShow(); });
      window.__ceV16AvanceObserver.observe(document.body||document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
    }catch(_){ }
  }
  function run(){ injectStyle(); applyVersion(); bindClose(); wrapShow(); colorAvanceBars(); observeAvance(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
  window.addEventListener('load',run,{once:true});
  window.addEventListener('controlevent:event-loaded',()=>setTimeout(run,80));
  window.addEventListener('controlevent:event-ready',()=>setTimeout(run,80));
  [100,500,1200,2500].forEach(ms=>setTimeout(run,ms));
})();
