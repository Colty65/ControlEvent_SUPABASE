// ControlEvent v19_prod · FIX19 anti-bloqueo login
// No toca login ni hace fetch. Solo activa ajustes visuales DESPUÉS de entrar.
(function(){
  'use strict';
  if(window.__CE_V19_FIX19_APPLIED__) return;
  window.__CE_V19_FIX19_APPLIED__ = true;

  const $ = id => document.getElementById(id);
  const trim = v => String(v == null ? '' : v).trim();
  const arr = v => Array.isArray(v) ? v : [];
  const up = v => trim(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state = () => window.state || window.ControlEventApp?.state || window.ControlEventRuntime?.app?.state || window.ControlEventState || window.AppState || {};

  function isAuthReady(){
    try{
      const auth = $('authOverlay') || document.querySelector('.auth-overlay,.login-overlay,[data-auth-overlay]');
      if(auth && !auth.classList.contains('hidden') && getComputedStyle(auth).display !== 'none') return false;
    }catch(_){ return false; }
    const s = state();
    return !!(s && (s.authUser || s.user || window.authUser || window.currentUser || window.__CONTROL_EVENT_USER__));
  }

  function parseDateKey(value){
    const raw = trim(value);
    if(!raw) return 99999999;
    let m = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if(m){ let y=Number(m[3]); if(y<100) y+=(y>=70?1900:2000); return Number(String(y).padStart(4,'0')+String(Number(m[2])).padStart(2,'0')+String(Number(m[1])).padStart(2,'0'))||99999999; }
    m = raw.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
    if(m) return Number(m[1]+String(Number(m[2])).padStart(2,'0')+String(Number(m[3])).padStart(2,'0'))||99999999;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? 99999999 : Number(String(d.getFullYear())+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0'));
  }
  function isFinal(ev){ return up(ev?.situacion || ev?.estado || '').includes('FINAL'); }
  function eventTitle(ev){ return trim(ev?.titulo || ev?.nombre || ev?.Evento || ev?.title || ev?.id || 'Evento'); }

  function injectCss(){
    if($('ce-v19-fix19-style')) return;
    const css = `
      .ce-v104-brand-mini{display:none!important;}
      #selectedEvent option.ce-event-finalizado,#selectedEvent option[data-finalizado="1"]{color:#b91c1c!important;font-weight:900!important;}
      #selectedEvent option.ce-event-curso,#selectedEvent option[data-curso="1"]{color:#16a34a!important;font-weight:900!important;}
      #ceMapaGlobalOverlay .ce-v19-detail-clear{display:none!important;}
      #ceMapaGlobalOverlay .ce-v19-income-all:not(.ce-fix19-active),
      #ceMapaGlobalOverlay .ce-v19-clear-filter:not(.ce-fix19-active){background:#fff!important;border-color:#d7e0ea!important;color:#0f172a!important;box-shadow:none!important;outline:0!important;}
      #ceMapaGlobalOverlay .ce-v19-income-all.ce-fix19-active,
      #ceMapaGlobalOverlay .ce-v19-clear-filter.ce-fix19-active{border-color:#2563eb!important;box-shadow:0 0 0 3px rgba(37,99,235,.26)!important;background:#eff6ff!important;color:#1d4ed8!important;}
      #ceMapaGlobalOverlay .ce-v19-resource-bar.ce-fix19-active{background:#dbeafe!important;border-color:#2563eb!important;box-shadow:0 0 0 3px rgba(37,99,235,.24),0 10px 22px rgba(37,99,235,.14)!important;}
      #ceMapaGlobalOverlay .ce-v19-resource-bar.ce-fix19-active .ce-v19-bar-top strong{color:#1d4ed8!important;}
      #ceMapaGlobalOverlay .ce-v19-products-table.compact{overflow-x:hidden!important;width:100%!important;max-width:100%!important;}
      #ceMapaGlobalOverlay .ce-v19-products-head.compact,
      #ceMapaGlobalOverlay .ce-v19-product-line.compact{
        width:100%!important;min-width:0!important;max-width:100%!important;
        grid-template-columns:minmax(122px,1.10fr) minmax(62px,.47fr) minmax(64px,.48fr) minmax(70px,.56fr) minmax(78px,.56fr) minmax(74px,.50fr) minmax(84px,.54fr) minmax(56px,.40fr) minmax(70px,.46fr) minmax(42px,.32fr)!important;
        gap:3px!important;
      }
      #ceMapaGlobalOverlay .ce-v19-products-head.compact>*,
      #ceMapaGlobalOverlay .ce-v19-product-line.compact>*{min-width:0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;}
      #ceGeminiLibreOverlay .ce-ai-answer,#ceGeminiLibreOverlay .ce-ai-card{font-weight:400!important;}
      #ceGeminiLibreOverlay .ce-ai-version-badge{display:none!important;}
    `;
    const style=document.createElement('style'); style.id='ce-v19-fix19-style'; style.textContent=css; document.head.appendChild(style);
  }

  function sortAndColorEventSelect(){
    const sel = $('selectedEvent');
    const eventos = arr(state().eventos);
    if(!sel || !eventos.length) return;
    const current = trim(sel.value || state().selectedEventId || '');
    const ordered = eventos.slice().sort((a,b)=>{
      const da=parseDateKey(a?.fechaIni || a?.fecha_ini || a?.fechaInicio || a?.startDate);
      const db=parseDateKey(b?.fechaIni || b?.fecha_ini || b?.fechaInicio || b?.startDate);
      if(da!==db) return da-db;
      return eventTitle(a).localeCompare(eventTitle(b),'es',{sensitivity:'base',numeric:true});
    });
    const signature = ordered.map(e=>`${trim(e.id)}:${parseDateKey(e?.fechaIni || e?.fecha_ini || '')}:${trim(e?.situacion || '')}`).join('|') + '|sel=' + current;
    if(sel.dataset.ceFix19Signature === signature) return;
    sel.innerHTML = '<option value="">Selecciona evento...</option>' + ordered.map(e=>{
      const finalizado = isFinal(e);
      const cls = finalizado ? 'ce-event-finalizado' : 'ce-event-curso';
      const style = finalizado ? 'color:#b91c1c;font-weight:900;' : 'color:#16a34a;font-weight:900;';
      return `<option value="${esc(e.id)}" class="${cls}" ${finalizado?'data-finalizado="1"':'data-curso="1"'} style="${style}" ${trim(e.id)===current?'selected':''}>${esc(eventTitle(e))}</option>`;
    }).join('');
    if(current) sel.value = current;
    sel.dataset.ceFix19Signature = signature;
  }

  function clearVistaActive(root){
    if(!root) return;
    root.querySelectorAll('.ce-v19-income-all,.ce-v19-clear-filter,.ce-v19-resource-bar').forEach(el=>{
      el.classList.remove('is-active','is-selected','ce-fix13-active','ce-fix15-active','ce-fix16-active','ce-fix17-active','ce-fix18-active','ce-fix19-active');
    });
  }
  function setVistaActive(kind, el){
    const root = $('ceMapaGlobalOverlay');
    if(!root) return;
    clearVistaActive(root);
    if(kind==='income') root.querySelector('.ce-v19-income-all')?.classList.add('ce-fix19-active');
    else if(kind==='products') root.querySelector('.ce-v19-clear-filter')?.classList.add('ce-fix19-active');
    else if(kind==='bar' && el) el.classList.add('ce-fix19-active','is-selected');
  }

  let installed = false;
  function installAfterLogin(){
    if(installed || !isAuthReady()) return;
    installed = true;
    injectCss();
    setTimeout(sortAndColorEventSelect,80);
    document.addEventListener('mousedown', ev=>{ if(ev.target && ev.target.id === 'selectedEvent') setTimeout(sortAndColorEventSelect,0); }, true);
    document.addEventListener('focusin', ev=>{ if(ev.target && ev.target.id === 'selectedEvent') setTimeout(sortAndColorEventSelect,0); }, true);
    document.addEventListener('click', ev=>{
      const income = ev.target?.closest?.('#ceMapaGlobalOverlay [data-v19-income-all],#ceMapaGlobalOverlay .ce-v19-income-all');
      if(income){ setTimeout(()=>setVistaActive('income'),0); setTimeout(()=>setVistaActive('income'),120); return; }
      const products = ev.target?.closest?.('#ceMapaGlobalOverlay [data-v19-clear-filter],#ceMapaGlobalOverlay .ce-v19-clear-filter');
      if(products){ setTimeout(()=>setVistaActive('products'),0); setTimeout(()=>setVistaActive('products'),120); return; }
      const bar = ev.target?.closest?.('#ceMapaGlobalOverlay .ce-v19-resource-bar[data-v19-filter-kind]');
      if(bar){ setTimeout(()=>setVistaActive('bar',bar),0); setTimeout(()=>setVistaActive('bar',bar),120); }
    }, true);
  }

  function scheduleInstall(){ setTimeout(installAfterLogin,0); setTimeout(installAfterLogin,500); setTimeout(installAfterLogin,1500); setTimeout(installAfterLogin,3000); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleInstall, {once:true}); else scheduleInstall();
  document.addEventListener('click', ev=>{ if(ev.target?.closest?.('#btnLogin')) setTimeout(scheduleInstall,700); }, true);
})();
