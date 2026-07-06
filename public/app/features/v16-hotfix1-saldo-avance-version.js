/* ControlEvent v18.11.3_prod - HOTFIX1: cierre/colores avance + versión v16 visible. */
(function(){
  'use strict';
  const INSTALLED='__ceV16Hotfix1SaldoAvanceVersion';
  if(window[INSTALLED]) return; window[INSTALLED]=true;
  const VERSION='ControlEvent v18.11.3_prod';
  const VERSION_FILE='ControlEvent_v18_11_3_prod';
  const $=id=>document.getElementById(id);
  const isLayerVisible=layer=>!!(layer && layer.classList.contains('visible'));
  const num=value=>{
    if(typeof value==='number') return Number.isFinite(value)?value:0;
    let s=String(value??'').replace(/[^0-9,.-]/g,'');
    if(s.includes(',') && s.includes('.')) s=s.replace(/\./g,'').replace(',','.');
    else if(s.includes(',')) s=s.replace(',','.');
    const n=Number(s); return Number.isFinite(n)?n:0;
  };
  const money=value=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(num(value)||0));
  const safe=(fn,fb)=>{try{const v=fn(); return v===undefined?fb:v;}catch(_){return fb;}};
  function getBudgetSummary(){
    const app=window.ControlEventApp || window.__CONTROL_EVENT_APP__ || window;
    const candidates=[
      ()=>app?.calculations?.budgetSummary?.(),
      ()=>window.ControlEventDomain?.api?.budgetSummary?.(),
      ()=>window.budgetSummary?.()
    ];
    for(const fn of candidates){
      const v=safe(fn,null);
      if(v && typeof v==='object') return v;
    }
    return null;
  }
  function getBudgetIncomeFromSummary(){
    const b=getBudgetSummary();
    if(b){
      const id=b.ingresosDinero || {};
      const op=b.operativa || {};
      const socios=id.socios || {};
      const noSocios=id.noSocios || id.donantes || {};
      let previsto=num(id.totalComprometido ?? op.ingresos);
      if(!previsto) previsto=num(socios.importe)+num(noSocios.importe);
      let ingresado=num(id.totalIngresado ?? op.ingresoDinero);
      if(!ingresado && (socios.ingresado!=null || noSocios.ingresado!=null)) ingresado=num(socios.ingresado)+num(noSocios.ingresado);
      // Si el resumen no devuelve totalIngresado pero todo está ingresado, usa el total comprometido.
      if(!ingresado && previsto && num(id.pendiente ?? 0)===0) ingresado=previsto;
      if(previsto || ingresado) return {ingresado, previsto:previsto || ingresado};
    }
    return null;
  }
  function getBudgetIncomeFromDom(){
    const roots=[document.getElementById('budgetLayout'), document.getElementById('tabResumen'), document.body].filter(Boolean);
    for(const root of roots){
      const nodes=Array.from(root.querySelectorAll('div,span,strong,b,td,th')).filter(el=>/INGRESO\s+TOTAL/i.test(el.textContent||''));
      for(const el of nodes){
        const parent=el.parentElement;
        const area=(parent?.textContent || el.textContent || '');
        const m=area.match(/INGRESO\s+TOTAL[^0-9-]*([0-9.]+,[0-9]{2})/i);
        if(m){ const v=num(m[1]); if(v>0) return {ingresado:v, previsto:v}; }
        const next=parent?.querySelectorAll?.('strong,b,span,div') || [];
        for(const n of next){
          const v=num(n.textContent||'');
          if(v>0 && /€/.test(n.textContent||'')) return {ingresado:v, previsto:v};
        }
      }
    }
    return null;
  }
  function patchAvanceIncome(){
    const income=getBudgetIncomeFromSummary() || getBudgetIncomeFromDom();
    if(!income || !income.previsto) return;
    const update=(row)=>{
      if(!row) return;
      const pct=Math.max(0, Math.min(100, income.previsto ? income.ingresado / income.previsto * 100 : 0));
      const small=row.querySelector('small');
      if(small) small.textContent=`${money(income.ingresado)} de ${money(income.previsto)} ingresados`;
      const pctNode=row.querySelector(':scope > strong') || Array.from(row.querySelectorAll('strong')).find(el=>/%/.test(el.textContent||''));
      if(pctNode) pctNode.textContent=pct.toLocaleString('es-ES',{maximumFractionDigits:2})+'%';
      const bar=row.querySelector('.ce-hf48-bar i,.ce-hf47-bar i');
      if(bar) bar.style.setProperty('width', pct+'%', 'important');
    };
    const layer48=document.getElementById('ceHf48AvanceLayer');
    update(layer48?.querySelector?.('.ce-hf48-row'));
    const layer47=document.getElementById('ceHf47AvanceBubbleLayer');
    update(layer47?.querySelector?.('.ce-hf47-bubble-row'));
  }

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
        if(/v\d+_prod/i.test(txt) || /ControlEvent\s+v\d+_prod/i.test(txt)) el.textContent=txt.replace(/ControlEvent\s+v\d+_prod/ig,VERSION).replace(/v\d+_prod/ig,'v18.11.3_prod');
      }catch(_){ }
    });
  }

  function colorAvanceBars(){
    patchAvanceIncome();
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
      [0,50,180,500].forEach(ms=>setTimeout(()=>{patchAvanceIncome(); colorAvanceBars();},ms));
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
