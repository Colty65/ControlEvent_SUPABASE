/* ControlEvent v26_prod_1.0 FIX5 · GRAFICAS: un único panel estable, sin restauraciones ni retemblores. */
(function(root){
  'use strict';
  const FLAG='__ceV25StableGraphTipFix5';
  if(root[FLAG]) return; root[FLAG]=true;
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let activeOwner=null;

  function graphOwner(target){
    const owner=target?.closest?.('#tabGraficas [data-ce-tip-v21],#eventChartWrap [data-ce-tip-v21]');
    return owner&&owner.getAttribute('data-ce-tip-v21')?.trim()?owner:null;
  }
  function photoViewerOpen(){
    return !!document.querySelector('.ce-v468-modal,.ce-v465-modal,#ceV310PhotoViewer:not(.hidden),#ceV401PcPhotoModal:not(.hidden),[role="dialog"].ce-photo-viewer');
  }
  function closeTip(){
    const tip=$('ceTooltipV21');
    if(tip?.dataset.ceStableFix5==='1') tip.remove();
    activeOwner=null;
  }
  function renderText(raw){
    const lines=String(raw||'').replace(/\r/g,'').split('\n');
    const html=[]; let rows=[];
    const flush=()=>{
      if(!rows.length) return;
      html.push('<div class="ce-v25-stable-table-wrap"><table class="ce-v21-table"><tbody>'+rows.map((cells,index)=>'<tr class="'+(index===0?'head':'')+'">'+cells.map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>');
      rows=[];
    };
    lines.forEach((line,index)=>{
      const clean=String(line||'').trim();
      if(!clean){flush();return;}
      if(clean.includes('|')){rows.push(clean.split('|').map(v=>v.trim()));return;}
      flush();
      const value=esc(clean).replace(/(\d{1,3}(?:\.\d{3})*,\d{2}\s*€|\d+(?:,\d{2})?\s*€)/g,'<strong>$1</strong>');
      if(/^TOTAL\b/i.test(clean)) html.push('<div class="ce-v21-title ce-v21-total">'+value+'</div>');
      else if(index===0||/^(INGRESOS|DONACI|COMPRADO|DONADO|PENDIENTE|PTE\.?|GAST|POR |SOCIOS|NO SOCIOS|PERSONAS|PRODUCTOS|TIENDA|TICKET)/i.test(clean)) html.push('<div class="ce-v21-title">'+value+'</div>');
      else html.push('<div class="ce-v21-text">'+value+'</div>');
    });
    flush(); return html.join('');
  }
  function addStyle(){
    if($('ce-v25-stable-graph-tip-style')) return;
    const style=document.createElement('style'); style.id='ce-v25-stable-graph-tip-style';
    style.textContent=`
      #ceTooltipV21[data-ce-stable-fix5="1"]{position:fixed!important;left:50%!important;top:50%!important;right:auto!important;bottom:auto!important;transform:translate(-50%,-50%)!important;width:min(680px,calc(100vw - 32px))!important;max-width:min(680px,calc(100vw - 32px))!important;max-height:min(76vh,720px)!important;display:block!important;visibility:visible!important;opacity:1!important;overflow:auto!important;pointer-events:auto!important;z-index:2147483644!important;padding:48px 18px 18px!important;border:1px solid rgba(15,23,42,.22)!important;border-radius:18px!important;background:#fff!important;color:#172033!important;box-shadow:0 28px 90px rgba(2,8,23,.42)!important;animation:none!important;transition:none!important;contain:layout paint!important}
      #ceTooltipV21[data-ce-stable-fix5="1"] .ce-v21-tip-close{position:absolute!important;right:12px!important;top:10px!important;width:32px!important;height:32px!important;display:grid!important;place-items:center!important;border:1px solid #cbd5e1!important;border-radius:999px!important;background:#fff!important;color:#172033!important;font:900 22px/1 system-ui,sans-serif!important;cursor:pointer!important;z-index:4!important}
      #ceTooltipV21[data-ce-stable-fix5="1"] .ce-v21-title{margin:0 0 9px!important;font:900 15px/1.25 system-ui,sans-serif!important;color:#0f172a!important}
      #ceTooltipV21[data-ce-stable-fix5="1"] .ce-v21-text{margin:5px 0!important;font:700 13px/1.35 system-ui,sans-serif!important}
      #ceTooltipV21[data-ce-stable-fix5="1"] .ce-v21-total{margin-top:14px!important;padding-top:11px!important;border-top:2px solid #cbd5e1!important;font-size:16px!important}
      #ceTooltipV21[data-ce-stable-fix5="1"] .ce-v25-stable-table-wrap{overflow:auto!important;margin:8px 0 12px!important;border:1px solid #dbe3ec!important;border-radius:11px!important}
      #ceTooltipV21[data-ce-stable-fix5="1"] table{width:100%!important;border-collapse:collapse!important;font:700 12px/1.3 system-ui,sans-serif!important}
      #ceTooltipV21[data-ce-stable-fix5="1"] td{padding:7px 8px!important;border-bottom:1px solid #e5eaf0!important;vertical-align:middle!important}
      #ceTooltipV21[data-ce-stable-fix5="1"] tr.head td{position:sticky!important;top:0!important;background:#edf3f8!important;font-weight:950!important}
      #ceTooltipV21[data-ce-stable-fix5="1"] .ce-v465-tip-thumb{width:38px!important;height:38px!important;min-width:38px!important;animation:none!important;transform:none!important}
      body.ce-v25-graph-tip-open:before{content:"";position:fixed;inset:0;background:rgba(2,8,23,.34);z-index:2147483643;pointer-events:none}
      @media(max-width:700px){#ceTooltipV21[data-ce-stable-fix5="1"]{width:calc(100vw - 18px)!important;max-width:calc(100vw - 18px)!important;max-height:82vh!important;padding:44px 10px 12px!important}#ceTooltipV21[data-ce-stable-fix5="1"] td{padding:6px 5px!important;font-size:11px!important}}
    `;
    document.head.appendChild(style);
  }
  function openTip(owner){
    const raw=owner?.getAttribute?.('data-ce-tip-v21'); if(!raw?.trim()) return;
    closeTip(); addStyle(); activeOwner=owner;
    const tip=document.createElement('div'); tip.id='ceTooltipV21'; tip.dataset.ceStableFix5='1'; tip.dataset.cePinned='1';
    tip.innerHTML='<button type="button" class="ce-v21-tip-close" aria-label="Cerrar información">×</button><div class="ce-v21-tip-content">'+renderText(raw)+'</div>';
    document.body.appendChild(tip); document.body.classList.add('ce-v25-graph-tip-open');
    // Añade justificantes una sola vez; no se observa ni se restaura el globo.
    [0,80].forEach(ms=>setTimeout(()=>{
      if(!$('ceTooltipV21')||$('ceTooltipV21')!==tip||photoViewerOpen()) return;
      try{root.ControlEventV469?.enrichOpenTooltips?.();}catch(_){ }
      try{root.ControlEventV467?.enrichOpenTooltips?.();}catch(_){ }
    },ms));
  }
  function removeBackdropIfClosed(){if(!$('ceTooltipV21')?.dataset?.ceStableFix5)document.body.classList.remove('ce-v25-graph-tip-open');}

  // window/capture se ejecuta antes que todos los gestores antiguos del documento.
  root.addEventListener('click',event=>{
    const close=event.target?.closest?.('#ceTooltipV21[data-ce-stable-fix5="1"] .ce-v21-tip-close');
    if(close){event.preventDefault();event.stopImmediatePropagation();closeTip();document.body.classList.remove('ce-v25-graph-tip-open');return;}
    const photo=event.target?.closest?.('#ceTooltipV21[data-ce-stable-fix5="1"] .ce-v465-tip-thumb,#ceTooltipV21[data-ce-stable-fix5="1"] [data-action="ingreso-receipt-view-v465"],#ceTooltipV21[data-ce-stable-fix5="1"] [data-ce-v512-budget-photo]');
    if(photo){
      // El visor de fotos recibe el clic; el globo se retira después y nunca se reconstruye.
      setTimeout(()=>{closeTip();document.body.classList.remove('ce-v25-graph-tip-open');},70);
      return;
    }
    const owner=graphOwner(event.target);
    if(owner){event.preventDefault();event.stopImmediatePropagation();openTip(owner);return;}
  },true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('ceTooltipV21')?.dataset?.ceStableFix5==='1'){event.preventDefault();closeTip();document.body.classList.remove('ce-v25-graph-tip-open');}},true);
  document.addEventListener('change',event=>{if(event.target?.id==='selectedEvent'){closeTip();document.body.classList.remove('ce-v25-graph-tip-open');}},true);
  root.addEventListener('pagehide',()=>{closeTip();document.body.classList.remove('ce-v25-graph-tip-open');});
  setInterval(removeBackdropIfClosed,1500);
  root.ControlEventStableGraphTipFix5={open:openTip,close:closeTip};
})(window);
