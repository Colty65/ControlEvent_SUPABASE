/* ControlEvent v19_prod - HOTFIX52: estabilidad desplegable principal + avance efímero/colores. */
(function(){
  'use strict';
  const INSTALLED='__ceV15Hotfix26EstabilidadDropdownSaldoAvance52';
  if(window[INSTALLED]) return; window[INSTALLED]=true;
  const $=id=>document.getElementById(id);
  const safe=(fn,fb)=>{try{const v=fn();return v===undefined?fb:v;}catch(_){return fb;}};
  const state=()=>safe(()=> (typeof window.state!=='undefined'&&window.state)||window.ControlEventApp?.state||{}, {});
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function injectStyle(){
    if($('ceHf52Style')) return;
    const st=document.createElement('style'); st.id='ceHf52Style';
    st.textContent=`
      #selectedEvent,#selectedEvent option{color:#111827!important;background:#fff!important;-webkit-text-fill-color:#111827!important;}
      #selectedEvent{cursor:pointer!important;}
      #ceHf48AvanceLayer{pointer-events:auto!important;background:rgba(15,23,42,.14)!important;}
      #ceHf48AvanceLayer:not(.visible){pointer-events:none!important;}
      #ceHf48AvanceLayer .ce-hf48-bubble{pointer-events:auto!important;}
      #ceHf48AvanceLayer .ce-hf48-row{border-width:2px!important;}
      #ceHf48AvanceLayer .ce-hf48-row.ce-av-blue{background:#eff6ff!important;border-color:#2563eb!important;}
      #ceHf48AvanceLayer .ce-hf48-row.ce-av-green{background:#ecfdf5!important;border-color:#16a34a!important;}
      #ceHf48AvanceLayer .ce-hf48-row.ce-av-orange{background:#fff7ed!important;border-color:#f59e0b!important;}
      #ceHf48AvanceLayer .ce-hf48-row.ce-av-red{background:#fef2f2!important;border-color:#ef4444!important;}
      #ceHf48AvanceLayer .ce-hf48-row.ce-av-purple{background:#faf5ff!important;border-color:#8b5cf6!important;}
    `;
    document.head.appendChild(st);
  }

  function patchSelectedEventDropdown(){
    const sel=$('selectedEvent'); if(!sel || sel.__ceHf52SelectGuard) return;
    sel.__ceHf52SelectGuard=true;
    let savedHtml=sel.innerHTML;
    let savedValue=sel.value;
    let isOpening=false;
    const remember=()=>{ if(sel.options && sel.options.length){ savedHtml=sel.innerHTML; savedValue=sel.value; }};
    const restoreIfBlank=()=>{
      if((!sel.options || sel.options.length===0 || !String(sel.textContent||'').trim()) && savedHtml){
        const val=savedValue;
        sel.innerHTML=savedHtml;
        if(Array.from(sel.options||[]).some(o=>String(o.value)===String(val))) sel.value=val;
      }
      Array.from(sel.options||[]).forEach(o=>{ try{ o.style.color='#111827'; o.style.backgroundColor='#fff'; }catch(_){} });
    };
    ['pointerdown','mousedown','click','focus','touchstart'].forEach(ev=>{
      sel.addEventListener(ev, e=>{
        remember(); restoreIfBlank(); isOpening=true;
        try{ e.stopPropagation(); }catch(_){}
        setTimeout(()=>{isOpening=false; restoreIfBlank();}, 1400);
      }, true);
    });
    sel.addEventListener('change',()=>{ remember(); setTimeout(restoreIfBlank,80); }, true);
    try{ new MutationObserver(()=>{ if(isOpening) restoreIfBlank(); else remember(); }).observe(sel,{childList:true,subtree:true,characterData:true}); }catch(_){}
    setInterval(()=>{ if(document.activeElement===sel) restoreIfBlank(); else remember(); }, 1200);
  }

  function colorAvanceNow(){
    const layer=$('ceHf48AvanceLayer'); if(!layer) return;
    const rows=Array.from(layer.querySelectorAll('.ce-hf48-row'));
    const map=[
      ['ce-av-blue','#2563eb','#eff6ff'],
      ['ce-av-green','#16a34a','#ecfdf5'],
      ['ce-av-orange','#f59e0b','#fff7ed'],
      ['ce-av-red','#ef4444','#fef2f2'],
      ['ce-av-green','#16a34a','#ecfdf5'],
      ['ce-av-purple','#8b5cf6','#faf5ff']
    ];
    rows.forEach((row,i)=>{
      const [cls,color,bg]=map[i]||map[0];
      row.classList.remove('ce-av-blue','ce-av-green','ce-av-orange','ce-av-red','ce-av-purple');
      row.classList.add(cls);
      try{ row.style.setProperty('border-color',color,'important'); row.style.setProperty('background',bg,'important'); }catch(_){}
      const bar=row.querySelector('.ce-hf48-bar i');
      if(bar){ try{ bar.style.setProperty('background',color,'important'); bar.style.setProperty('background-color',color,'important'); }catch(_){} }
    });
  }

  function makeAvanceEasyToClose(){
    const layer=$('ceHf48AvanceLayer'); if(!layer || layer.__ceHf52EasyClose) return;
    layer.__ceHf52EasyClose=true;
    layer.addEventListener('click', ev=>{
      if(ev.target===layer || !ev.target.closest?.('.ce-hf48-bubble')){
        try{ layer.classList.remove('visible'); }catch(_){}
      }
    }, true);
  }

  function patchAvanceShow(){
    const api=window.ControlEventHf48;
    if(!api || !api.showAvance || api.__ceHf52ShowWrapped) return;
    const orig=api.showAvance;
    api.showAvance=function(){
      const out=orig.apply(this,arguments);
      setTimeout(()=>{ colorAvanceNow(); makeAvanceEasyToClose(); }, 0);
      setTimeout(()=>{ const layer=$('ceHf48AvanceLayer'); if(layer) layer.classList.remove('visible'); }, 5200);
      return out;
    };
    api.__ceHf52ShowWrapped=true;
  }

  function run(){ injectStyle(); patchSelectedEventDropdown(); patchAvanceShow(); colorAvanceNow(); makeAvanceEasyToClose(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
  window.addEventListener('load',run,{once:true});
  window.addEventListener('controlevent:event-loaded',()=>setTimeout(run,80));
  window.addEventListener('controlevent:event-ready',()=>setTimeout(run,80));
  document.addEventListener('click',()=>setTimeout(()=>{ colorAvanceNow(); makeAvanceEasyToClose(); patchSelectedEventDropdown(); },80),true);
  try{ new MutationObserver(muts=>{
    if((muts||[]).some(m=>Array.from(m.addedNodes||[]).some(n=>n && n.nodeType===1 && (n.id==='ceHf48AvanceLayer' || n.querySelector?.('#ceHf48AvanceLayer,.ce-hf48-row'))))){ setTimeout(run,30); }
  }).observe(document.body||document.documentElement,{childList:true,subtree:true}); }catch(_){}
  [100,400,1200].forEach(ms=>setTimeout(run,ms));
})();
