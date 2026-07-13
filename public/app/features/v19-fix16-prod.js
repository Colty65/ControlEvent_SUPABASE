// ControlEvent v19_prod · FIX16
// Objetivo: quitar torpeza introducida por FIX13-15, estabilizar INGRESOS visual y nombres TK.
(function(){
  'use strict';
  if(window.__CE_V19_FIX16_APPLIED__) return;
  window.__CE_V19_FIX16_APPLIED__ = true;
  const $ = id => document.getElementById(id);
  const trim = v => String(v == null ? '' : v).trim();
  const arr = v => Array.isArray(v) ? v : [];
  const state = () => window.state || window.ControlEventApp?.state || window.ControlEventState || window.AppState || {};
  const selectedEventId = () => trim(state().selectedEventId || $('selectedEvent')?.value || '');
  function safeFile(v){ return trim(v || 'sin dato').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim().slice(0,170) || 'sin dato'; }
  function selectedEventTitle(){
    const st=state(), id=selectedEventId();
    const ev=arr(st.eventos).find(e=>trim(e?.id)===id) || {};
    const sel=$('selectedEvent');
    return trim(ev.titulo || ev.nombre || ev.Evento || ev.title || (sel && sel.selectedIndex>=0 && sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].textContent : '') || 'Evento');
  }

  function injectCss(){
    if($('ce-v19-fix16-style')) return;
    const css = `
      /* Vista aérea: producto y segmento separados. El producto no invade la columna SEGMENTO. */
      #ceMapaGlobalOverlay .ce-v19-products-head.compact,
      #ceMapaGlobalOverlay .ce-v19-product-line.compact{
        grid-template-columns:minmax(245px,1.58fr) minmax(128px,.78fr) minmax(100px,.64fr) minmax(108px,.72fr) minmax(128px,.80fr) minmax(102px,.66fr) minmax(138px,.84fr) minmax(86px,.54fr) minmax(108px,.68fr) minmax(74px,.46fr)!important;
        min-width:1220px!important;
      }
      #ceMapaGlobalOverlay .ce-v19-products-head.compact>*:first-child,
      #ceMapaGlobalOverlay .ce-v19-product-line.compact>*:first-child{overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;min-width:0!important;}
      #ceMapaGlobalOverlay .ce-v19-products-head.compact>*:nth-child(2),
      #ceMapaGlobalOverlay .ce-v19-product-line.compact>*:nth-child(2){transform:none!important;width:auto!important;padding-left:6ch!important;box-sizing:border-box!important;white-space:nowrap!important;}
      #ceMapaGlobalOverlay .ce-v19-products-head.compact{font-size:13.5px!important;background:#c9d3df!important;color:#0f172a!important;}
      #ceMapaGlobalOverlay .ce-v19-product-line.compact{font-size:12px!important;line-height:1.16!important;}
      #ceMapaGlobalOverlay .ce-v19-income-head{font-size:13.5px!important;background:#c9d3df!important;color:#0f172a!important;}
      #ceMapaGlobalOverlay .ce-v19-income-row.compact{font-size:12.3px!important;}

      /* Estado activo único en Vista aérea */
      #ceMapaGlobalOverlay .ce-v19-income-all,
      #ceMapaGlobalOverlay .ce-v19-clear-filter{background:#fff!important;border-color:#d7e0ea!important;color:#0f172a!important;box-shadow:none!important;}
      #ceMapaGlobalOverlay .ce-v19-income-all.ce-fix16-active,
      #ceMapaGlobalOverlay .ce-v19-clear-filter.ce-fix16-active{border-color:#2563eb!important;box-shadow:0 0 0 3px rgba(37,99,235,.28)!important;background:#eff6ff!important;color:#1d4ed8!important;}
      #ceMapaGlobalOverlay .ce-v19-resource-bar.ce-fix16-active{background:#dbeafe!important;border-color:#2563eb!important;box-shadow:0 0 0 3px rgba(37,99,235,.24),0 10px 22px rgba(37,99,235,.14)!important;}
      #ceMapaGlobalOverlay .ce-v19-resource-bar.ce-fix16-active .ce-v19-bar-top strong{color:#1d4ed8!important;}
      .ce-fix16-recent-collab{background:#fff7ed!important;border-color:#fb923c!important;box-shadow:0 0 0 3px rgba(249,115,22,.26)!important;}
    `;
    const st=document.createElement('style'); st.id='ce-v19-fix16-style'; st.textContent=css; document.head.appendChild(st);
  }

  function vistaRoot(){ return $('ceMapaGlobalOverlay'); }
  function clearVistaActive(root){
    if(!root) return;
    root.querySelectorAll('.ce-v19-income-all,.ce-v19-clear-filter,.ce-v19-resource-bar').forEach(el=>{
      el.classList.remove('is-active','is-selected','ce-fix13-active','ce-fix15-active','ce-fix16-active');
    });
  }
  function setVistaActive(kind, el){
    const root=vistaRoot(); if(!root) return;
    clearVistaActive(root);
    window.__ceV19Fix16VistaActive = {kind, t:Date.now(), key: trim(el?.textContent || '')};
    if(kind==='income') root.querySelector('.ce-v19-income-all')?.classList.add('ce-fix16-active');
    else if(kind==='products') root.querySelector('.ce-v19-clear-filter')?.classList.add('ce-fix16-active');
    else if(kind==='bar' && el) el.classList.add('ce-fix16-active','is-selected');
  }
  function preserveVistaActive(){
    const root=vistaRoot(); if(!root) return;
    const a=window.__ceV19Fix16VistaActive;
    if(!a || Date.now()-a.t>20000) return;
    if(a.kind==='income') setVistaActive('income');
    else if(a.kind==='products') setVistaActive('products');
    else if(a.kind==='bar'){
      const bars=Array.from(root.querySelectorAll('.ce-v19-resource-bar[data-v19-filter-kind]'));
      const found=bars.find(b=>trim(b.textContent||'')===a.key) || bars.find(b=>trim(b.textContent||'').includes(a.key.slice(0,18)));
      if(found) setVistaActive('bar', found);
    }
  }
  function installVistaActiveFix(){
    document.addEventListener('click', ev=>{
      const income=ev.target?.closest?.('#ceMapaGlobalOverlay [data-v19-income-all],#ceMapaGlobalOverlay .ce-v19-income-all');
      if(income){ [0,60,180].forEach(ms=>setTimeout(()=>setVistaActive('income'),ms)); return; }
      const products=ev.target?.closest?.('#ceMapaGlobalOverlay [data-v19-clear-filter],#ceMapaGlobalOverlay .ce-v19-clear-filter');
      if(products){ [0,60,180].forEach(ms=>setTimeout(()=>setVistaActive('products'),ms)); return; }
      const bar=ev.target?.closest?.('#ceMapaGlobalOverlay .ce-v19-resource-bar[data-v19-filter-kind]');
      if(bar){ [0,60,180,320].forEach(ms=>setTimeout(()=>setVistaActive('bar',bar),ms)); return; }
    }, true);
    try{ new MutationObserver(()=>setTimeout(preserveVistaActive,40)).observe(document.body,{childList:true,subtree:true}); }catch(_){ }
  }

  function normalizeTicketNameFromContext(el, oldName){
    const ctx=el?.closest?.('.itemcard,.rowline,tr,.summary-item,.chart-row,#ceTooltipV21,#ceBudgetLiteTooltipV307,#summaryTiendaTicket,#tabResumen') || el || document.body;
    const raw=trim(ctx?.innerText || ctx?.textContent || '');
    const low=trim(oldName).toLowerCase();
    if(!/(ticket|tk\s*\d+|ticketfoto|foto)/i.test(raw+' '+low)) return oldName;
    const m=(raw+' '+oldName).match(/\bTK\s*0*([0-9]{1,3})\b/i);
    const tk=m ? ('TK'+String(m[1]).padStart(2,'0')) : ((oldName.match(/ticket[_-]?tk\s*0*([0-9]{1,3})/i)||[])[1] ? 'TK'+String((oldName.match(/ticket[_-]?tk\s*0*([0-9]{1,3})/i)||[])[1]).padStart(2,'0') : 'TKxx');
    let tienda='Tienda';
    const mm=raw.match(/([^\n|]{2,90})\s*\|\s*TK\s*0*[0-9]{1,3}\b/i);
    if(mm) tienda=trim(mm[1]);
    return safeFile(tk)+'-'+safeFile(selectedEventTitle())+'-'+safeFile(tienda)+'.jpg';
  }
  function installDownloadFix(){
    document.addEventListener('pointerdown', ev=>{ window.__ceFix16DownloadEl = ev.target?.closest?.('button,a,img,[role="button"]') || null; }, true);
    document.addEventListener('click', ev=>{ window.__ceFix16DownloadEl = ev.target?.closest?.('button,a,img,[role="button"]') || window.__ceFix16DownloadEl || null; }, true);
    try{
      const proto=HTMLAnchorElement.prototype;
      if(!proto.click.__ceFix16TicketName){
        const prev=proto.click;
        const w=function(){
          try{
            if(this.download && /ticket[_-]?tk|ticket_|tk\d+/i.test(this.download)) this.download=normalizeTicketNameFromContext(window.__ceFix16DownloadEl || this, this.download);
          }catch(_){ }
          return prev.apply(this, arguments);
        };
        w.__ceFix16TicketName=true;
        proto.click=w;
      }
    }catch(_){ }
  }

  function installStateGuard(){
    if(!window.fetch || window.fetch.__ceFix16StateGuard) return;
    const prev=window.fetch;
    const w=function(input, init){
      const url=String(typeof input==='string' ? input : (input && input.url) || '');
      const method=String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      return prev.apply(this, arguments).then(resp=>{
        try{
          if(method==='GET' && /\/api\/state(?:\?|$)/i.test(url)){
            const pending=window.__ceFix13PendingCollab || window.__ceFix11PendingCollabSave || window.__ceFix15LastCollabWrite;
            if(pending && pending.row && Date.now()<Number(pending.until||0)){
              return resp.clone().json().then(data=>{
                if(Array.isArray(data.colaboradores)) data.colaboradores=data.colaboradores.map(r=>trim(r?.id)===trim(pending.row.id)?Object.assign({},r,pending.row):r);
                if(Array.isArray(data.ingresos)) data.ingresos=data.ingresos.map(r=>trim(r?.id)===trim(pending.row.id)?Object.assign({},r,pending.row):r);
                const headers=new Headers(resp.headers); headers.set('content-type','application/json;charset=utf-8');
                return new Response(JSON.stringify(data),{status:resp.status,statusText:resp.statusText,headers});
              }).catch(()=>resp);
            }
          }
        }catch(_){ }
        return resp;
      });
    };
    w.__ceFix16StateGuard=true;
    window.fetch=w;
  }

  function installLoginLightener(){
    // FIX16: al quitar el FIX14, dejamos un aviso interno para que otros parches no lancen boot repetido.
    window.__ceV19DisableRepeatedBoot = true;
  }

  function install(){ injectCss(); installVistaActiveFix(); installDownloadFix(); installStateGuard(); installLoginLightener(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
  window.ControlEventV19Fix16={version:'v19_prod_FIX16'};
})();
