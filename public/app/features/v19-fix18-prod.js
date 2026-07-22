// ControlEvent v23_prod_r1 · FIX18 mínimo
// Solo: Vista aérea (saldo descuentos, activo único y ancho), selector eventos por fecha/color, descripción para Zuzu ya va en backend.
(function(){
  'use strict';
  if(window.__CE_V19_FIX18_APPLIED__) return;
  window.__CE_V19_FIX18_APPLIED__ = true;

  const $ = id => document.getElementById(id);
  const trim = v => String(v == null ? '' : v).trim();
  const arr = v => Array.isArray(v) ? v : [];
  const state = () => window.state || window.ControlEventApp?.state || window.ControlEventState || window.AppState || {};
  const up = v => trim(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function parseDateKey(value){
    const raw = trim(value);
    if(!raw) return 99999999;
    let m = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if(m){
      let y = Number(m[3]); if(y < 100) y += (y >= 70 ? 1900 : 2000);
      return Number(String(y).padStart(4,'0') + String(Number(m[2])).padStart(2,'0') + String(Number(m[1])).padStart(2,'0')) || 99999999;
    }
    m = raw.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
    if(m) return Number(m[1] + String(Number(m[2])).padStart(2,'0') + String(Number(m[3])).padStart(2,'0')) || 99999999;
    const d = new Date(raw);
    if(!Number.isNaN(d.getTime())) return Number(String(d.getFullYear()) + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0'));
    return 99999999;
  }
  function isFinal(ev){ return up(ev?.situacion || ev?.estado || '').includes('FINAL'); }
  function isCurso(ev){ return up(ev?.situacion || ev?.estado || '').includes('EN CURSO') || (!isFinal(ev) && !trim(ev?.situacion || ev?.estado || '')); }
  function eventTitle(ev){ return trim(ev?.titulo || ev?.nombre || ev?.Evento || ev?.title || ev?.id || 'Evento'); }

  function injectCss(){
    if($('ce-v19-fix18-style')) return;
    const css = `
      /* FIX18: quitar versión flotante/duplicada de cabecera, dejando la versión del título de ventana del navegador. */
      .ce-v104-brand-mini{display:none!important;}

      /* FIX18: desplegable ordenado y colores por estado. */
      #selectedEvent option.ce-event-finalizado,#selectedEvent option[data-finalizado="1"]{color:#b91c1c!important;font-weight:900!important;}
      #selectedEvent option.ce-event-curso,#selectedEvent option[data-curso="1"]{color:#16a34a!important;font-weight:900!important;}

      /* FIX18: Vista aérea, sin botón Limpiar y selección única real. */
      #ceMapaGlobalOverlay .ce-v19-detail-clear{display:none!important;}
      #ceMapaGlobalOverlay .ce-v19-income-all:not(.ce-fix18-active),
      #ceMapaGlobalOverlay .ce-v19-clear-filter:not(.ce-fix18-active){background:#fff!important;border-color:#d7e0ea!important;color:#0f172a!important;box-shadow:none!important;outline:0!important;}
      #ceMapaGlobalOverlay .ce-v19-income-all.ce-fix18-active,
      #ceMapaGlobalOverlay .ce-v19-clear-filter.ce-fix18-active{border-color:#2563eb!important;box-shadow:0 0 0 3px rgba(37,99,235,.26)!important;background:#eff6ff!important;color:#1d4ed8!important;}
      #ceMapaGlobalOverlay .ce-v19-resource-bar.ce-fix18-active{background:#dbeafe!important;border-color:#2563eb!important;box-shadow:0 0 0 3px rgba(37,99,235,.24),0 10px 22px rgba(37,99,235,.14)!important;}
      #ceMapaGlobalOverlay .ce-v19-resource-bar.ce-fix18-active .ce-v19-bar-top strong{color:#1d4ed8!important;}

      /* FIX18: estrechar Producto Disponible manteniendo tamaño de letra, para evitar barra horizontal. */
      #ceMapaGlobalOverlay .ce-v19-products-table.compact{overflow-x:hidden!important;width:100%!important;max-width:100%!important;}
      #ceMapaGlobalOverlay .ce-v19-products-head.compact,
      #ceMapaGlobalOverlay .ce-v19-product-line.compact{
        width:100%!important;min-width:0!important;max-width:100%!important;
        grid-template-columns:minmax(126px,1.14fr) minmax(66px,.50fr) minmax(66px,.50fr) minmax(72px,.58fr) minmax(80px,.58fr) minmax(76px,.52fr) minmax(86px,.56fr) minmax(58px,.42fr) minmax(72px,.48fr) minmax(42px,.32fr)!important;
        gap:3px!important;
      }
      #ceMapaGlobalOverlay .ce-v19-products-head.compact>*:nth-child(2),
      #ceMapaGlobalOverlay .ce-v19-product-line.compact>*:nth-child(2){padding-left:0!important;transform:none!important;}
      #ceMapaGlobalOverlay .ce-v19-products-head.compact>*,
      #ceMapaGlobalOverlay .ce-v19-product-line.compact>*{min-width:0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;}

      /* FIX18: texto Zuzu principal normal, no en negrilla. */
      #ceGeminiLibreOverlay .ce-ai-answer,#ceGeminiLibreOverlay .ce-ai-card{font-weight:400!important;}
      #ceGeminiLibreOverlay .ce-ai-version-badge{display:none!important;}
    `;
    const style=document.createElement('style'); style.id='ce-v19-fix18-style'; style.textContent=css; document.head.appendChild(style);
  }

  function optionDateKey(ev){
    return parseDateKey(ev?.fechaIni || ev?.fecha_ini || ev?.fechaInicio || ev?.startDate || ev?.fecha || '');
  }
  function sortAndColorEventSelect(){
    const sel = $('selectedEvent');
    const st = state();
    const eventos = arr(st.eventos);
    if(!sel || !eventos.length) return;
    const current = trim(sel.value || st.selectedEventId || '');
    const focused = document.activeElement === sel;
    const opened = focused || sel.matches?.(':focus');
    const ordered = eventos.slice().sort((a,b)=>{
      const da = optionDateKey(a);
      const db = optionDateKey(b);
      if(da !== db) return da - db;
      return eventTitle(a).localeCompare(eventTitle(b),'es',{sensitivity:'base',numeric:true});
    });
    const existingEmpty = Array.from(sel.options || []).find(o => !trim(o.value));
    const placeholderText = trim(existingEmpty?.textContent || 'Selecciona evento...');
    const signature = ordered.map(e => `${trim(e.id)}:${optionDateKey(e)}:${trim(e?.situacion || e?.estado || '')}:${eventTitle(e)}`).join('|') + '|sel=' + current + '|ph=' + placeholderText;
    if(sel.dataset.ceFix18Signature === signature) return;
    const rows = [];
    rows.push(`<option value="" ${current ? '' : 'selected'}>${esc(placeholderText || 'Selecciona evento...')}</option>`);
    rows.push(...ordered.map(e => {
      const finalizado = isFinal(e);
      const curso = isCurso(e);
      const cls = finalizado ? 'ce-event-finalizado' : (curso ? 'ce-event-curso' : '');
      const attrs = finalizado ? 'data-finalizado="1"' : (curso ? 'data-curso="1"' : '');
      const style = finalizado ? 'color:#b91c1c;font-weight:900;' : (curso ? 'color:#16a34a;font-weight:900;' : '');
      return `<option value="${esc(e.id)}" class="${cls}" ${attrs} style="${style}" ${trim(e.id)===current?'selected':''}>${esc(eventTitle(e))}</option>`;
    }));
    sel.innerHTML = rows.join('');
    if(current) sel.value = current;
    sel.dataset.ceFix18Signature = signature;
    if(opened || focused) try{ sel.focus({preventScroll:true}); }catch(_){ }
  }

  function clearVistaActive(root){
    if(!root) return;
    root.querySelectorAll('.ce-v19-income-all,.ce-v19-clear-filter,.ce-v19-resource-bar').forEach(el=>{
      el.classList.remove('is-active','is-selected','ce-fix13-active','ce-fix15-active','ce-fix16-active','ce-fix17-active','ce-fix18-active');
    });
  }
  function setVistaActive(kind, el){
    const root = $('ceMapaGlobalOverlay'); if(!root) return;
    clearVistaActive(root);
    const stamp = {kind,t:Date.now()};
    if(kind==='income') root.querySelector('.ce-v19-income-all')?.classList.add('ce-fix18-active');
    else if(kind==='products') root.querySelector('.ce-v19-clear-filter')?.classList.add('ce-fix18-active');
    else if(kind==='bar' && el){
      stamp.filterKind = trim(el.getAttribute('data-v19-filter-kind'));
      stamp.filterKey = trim(el.getAttribute('data-v19-filter-key'));
      el.classList.add('ce-fix18-active','is-selected');
    }
    window.__ceV19Fix18VistaActive = stamp;
    window.__ceV19Fix16VistaActive = stamp;
    window.__ceV19Fix17VistaActive = stamp;
  }
  function reapplyVistaActive(){
    const root = $('ceMapaGlobalOverlay'); if(!root) return;
    const a = window.__ceV19Fix18VistaActive;
    if(!a || Date.now() - Number(a.t || 0) > 45000) return;
    if(a.kind === 'income') return setVistaActive('income');
    if(a.kind === 'products') return setVistaActive('products');
    if(a.kind === 'bar'){
      const found = Array.from(root.querySelectorAll('.ce-v19-resource-bar[data-v19-filter-kind]')).find(b => trim(b.getAttribute('data-v19-filter-kind')) === trim(a.filterKind) && trim(b.getAttribute('data-v19-filter-key')) === trim(a.filterKey));
      if(found) setVistaActive('bar', found); else clearVistaActive(root);
    }
  }
  function installVistaHandlers(){
    document.addEventListener('click', ev=>{
      const income = ev.target?.closest?.('#ceMapaGlobalOverlay [data-v19-income-all],#ceMapaGlobalOverlay .ce-v19-income-all');
      if(income){ [0,50,120,260,520].forEach(ms=>setTimeout(()=>setVistaActive('income'),ms)); return; }
      const products = ev.target?.closest?.('#ceMapaGlobalOverlay [data-v19-clear-filter],#ceMapaGlobalOverlay .ce-v19-clear-filter');
      if(products){ [0,50,120,260,520].forEach(ms=>setTimeout(()=>setVistaActive('products'),ms)); return; }
      const bar = ev.target?.closest?.('#ceMapaGlobalOverlay .ce-v19-resource-bar[data-v19-filter-kind]');
      if(bar){ [0,50,120,260,520,900].forEach(ms=>setTimeout(()=>setVistaActive('bar',bar),ms)); return; }
    }, true);
    try{ new MutationObserver(()=>{ setTimeout(reapplyVistaActive,40); setTimeout(sortAndColorEventSelect,80); }).observe(document.body,{childList:true,subtree:true}); }catch(_){ }
  }

  function installRenderHook(){
    try{
      const prev = window.renderHeader;
      if(typeof prev === 'function' && !prev.__ceFix18Wrapped){
        const wrapped = function(){ const r = prev.apply(this, arguments); setTimeout(sortAndColorEventSelect,0); return r; };
        wrapped.__ceFix18Wrapped = true;
        window.renderHeader = wrapped;
      }
    }catch(_){ }
    ['DOMContentLoaded','load'].forEach(evt=>window.addEventListener(evt,()=>setTimeout(sortAndColorEventSelect,120),{once:true}));
    document.addEventListener('mousedown', ev=>{ if(ev.target && ev.target.id === 'selectedEvent') setTimeout(sortAndColorEventSelect,0); }, true);
    document.addEventListener('focusin', ev=>{ if(ev.target && ev.target.id === 'selectedEvent') setTimeout(sortAndColorEventSelect,0); }, true);
    setTimeout(sortAndColorEventSelect,250);
    setTimeout(sortAndColorEventSelect,1200);
  }

  function install(){ injectCss(); installVistaHandlers(); installRenderHook(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
  window.ControlEventV19Fix18={version:'v23_prod_FIX18'};
})();
