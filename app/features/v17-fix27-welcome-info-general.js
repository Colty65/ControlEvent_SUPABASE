/* ControlEvent v22_prod
   - Mantiene FIX26: solo móviles tipo teléfono con doble pulsación rápida para globos de RESUMEN PRESUPUESTARIO (en budget-tooltips-lite.js).
   - Bienvenida sin evento en cualquier dispositivo: ColtyLAB muestra ficha informativa en vez de avance vacío. */
(function(){
  'use strict';
  if(window.__ceV17Fix27WelcomeInfoGeneral) return;
  window.__ceV17Fix27WelcomeInfoGeneral = true;

  const STYLE_ID = 'ceV17Fix26WelcomeInfoStyle';
  const LAYER_ID = 'ceV17Fix26WelcomeInfoLayer';
  const VERSION_LABEL = 'v22_prod';
  const $ = id => document.getElementById(id);

  function isPhoneOnly(){
    try{
      const nav = window.navigator || {};
      const ua = String(nav.userAgent || '');
      const touch = Number(nav.maxTouchPoints || 0) > 0 || ('ontouchstart' in window);
      const coarse = window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : touch;
      const sw = Math.min(Number(window.screen?.width || window.innerWidth || 9999), Number(window.screen?.height || window.innerHeight || 9999));
      const ipadLike = /iPad/i.test(ua) || (/Macintosh/i.test(ua) && Number(nav.maxTouchPoints || 0) > 1);
      const androidTablet = /Android/i.test(ua) && !/Mobile/i.test(ua) && sw >= 600;
      return !!(touch && coarse && !ipadLike && !androidTablet && sw < 768);
    }catch(_){ return false; }
  }
  function visible(el){
    if(!el) return false;
    try{
      const cs = getComputedStyle(el);
      if(cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity || 1) === 0) return false;
      if(el.classList.contains('hidden')) return false;
      return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    }catch(_){ return false; }
  }
  function loginVisible(){
    const overlay = $('authOverlay');
    return !!(overlay && !overlay.classList.contains('hidden') && visible(overlay));
  }
  function hasSelectedEvent(){
    const sel = $('selectedEvent');
    if(!sel) return false;
    const value = String(sel.value || '').trim();
    const label = String(sel.selectedOptions?.[0]?.textContent || sel.options?.[sel.selectedIndex]?.textContent || '').trim();
    // Si el selector muestra el placeholder, no hay evento real aunque quede un id arrastrado en memoria.
    if(!value) return false;
    if(/selecciona\s+evento/i.test(label)) return false;
    if(/^-{1,}|—|–/.test(label)) return false;
    return true;
  }
  function welcomeActive(){
    // FIX23 PARTE 1: si NO hay evento elegido en el selector, ColtyLAB siempre abre
    // la ficha informativa/version. No dependemos de clases de bienvenida ni de
    // selectedEventId arrastrado en memoria, porque eso reabría el AVANCE viejo vacío.
    if(loginVisible()) return false;
    return !hasSelectedEvent();
  }
  function isColtyLogo(target){
    return !!target?.closest?.('img.ce-brand-logo-safe,img.brand-logo-large,img[alt*="Colty"],.brand-logo-large');
  }
  function stopEvent(ev){
    try{ ev.preventDefault?.(); ev.stopPropagation?.(); ev.stopImmediatePropagation?.(); }catch(_){ }
  }
  function injectStyle(){
    if($(STYLE_ID)) return;
    const st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = `
      #${LAYER_ID}{position:fixed!important;inset:0!important;z-index:2147483300!important;display:none!important;align-items:center!important;justify-content:center!important;background:rgba(15,23,42,.16)!important;padding:10px!important;}
      #${LAYER_ID}.visible{display:flex!important;}
      #${LAYER_ID} .ce-v17fix26-card{position:relative!important;width:min(720px,94vw)!important;max-height:min(82vh,680px)!important;overflow:auto!important;background:#fff!important;border:2px solid #0f172a!important;border-radius:22px!important;box-shadow:0 24px 70px rgba(15,23,42,.30)!important;padding:18px 16px 14px!important;color:#0f172a!important;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,sans-serif!important;}
      #${LAYER_ID} .ce-v17fix26-close{position:absolute!important;right:10px!important;top:8px!important;width:34px!important;height:34px!important;border-radius:999px!important;border:1px solid #cbd5e1!important;background:#fff!important;font-size:22px!important;font-weight:950!important;line-height:28px!important;cursor:pointer!important;color:#0f172a!important;}
      #${LAYER_ID} .modal-container{font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,sans-serif!important;padding:20px!important;color:#333333!important;max-width:650px!important;margin:0 auto!important;}
      #${LAYER_ID} .modal-title{color:#e65c00!important;font-size:24px!important;font-weight:800!important;text-align:center!important;margin:0 0 5px 0!important;letter-spacing:.5px!important;}
      #${LAYER_ID} .modal-subtitle{font-size:11px!important;color:#666666!important;text-align:center!important;line-height:1.4!important;margin:0 0 20px 0!important;}
      #${LAYER_ID} .modal-grid{display:flex!important;gap:15px!important;justify-content:space-between!important;margin-bottom:20px!important;}
      #${LAYER_ID} .modal-col{flex:1!important;background:#f8f9fa!important;padding:10px!important;border-radius:6px!important;min-width:0!important;}
      #${LAYER_ID} .ia-col{background:#f0f4f8!important;border:1px dashed #d0d7de!important;}
      #${LAYER_ID} .modal-col h2{font-size:12px!important;font-weight:700!important;color:#222222!important;margin:0 0 8px 0!important;border-bottom:1px solid #e1e4e6!important;padding-bottom:4px!important;}
      #${LAYER_ID} .modal-col ul{list-style-type:none!important;padding:0!important;margin:0!important;}
      #${LAYER_ID} .modal-col li{font-size:11px!important;line-height:1.35!important;color:#444444!important;margin-bottom:6px!important;position:relative!important;padding-left:10px!important;}
      #${LAYER_ID} .modal-col li::before{content:"•"!important;color:#e65c00!important;font-weight:bold!important;position:absolute!important;left:0!important;}
      #${LAYER_ID} .modal-footer{text-align:right!important;font-size:10px!important;font-weight:bold!important;color:#000000!important;margin-top:10px!important;}
      @media(max-width:620px){#${LAYER_ID} .modal-grid{display:grid!important;grid-template-columns:1fr!important;}#${LAYER_ID} .modal-container{padding:18px 8px!important;}}
    `;
    document.head.appendChild(st);
  }
  function closeInfo(){
    const layer = $(LAYER_ID);
    if(layer) layer.classList.remove('visible');
  }
  function showInfo(){
    injectStyle();
    try{ $('ceV16Hf5AvanceLayer')?.classList?.remove('visible'); }catch(_){ }
    let layer = $(LAYER_ID);
    if(!layer){
      layer = document.createElement('div');
      layer.id = LAYER_ID;
      document.body.appendChild(layer);
    }
    layer.innerHTML = `<div class="ce-v17fix26-card" role="dialog" aria-live="polite" aria-label="Control Event App">
      <button type="button" class="ce-v17fix26-close" aria-label="Cerrar">×</button>
      <div class="modal-container">
        <h1 class="modal-title">Control_Event_App</h1>
        <p class="modal-subtitle">Fabricación, control y consulta inteligente de eventos · Plug &amp; Play: lo quiero, lo tengo.</p>
        <div class="modal-grid">
          <section class="modal-col">
            <h2>Control del evento</h2>
            <ul>
              <li>Ingresos, colaboradores y justificantes.</li>
              <li>Compras, tickets y gastos pendientes.</li>
              <li>Donaciones de producto y valoración.</li>
              <li>Documentos, tiendas, productos y personas.</li>
            </ul>
          </section>
          <section class="modal-col ia-col">
            <h2>IA · Zuzu</h2>
            <ul>
              <li>Automatización de tickets de compra.</li>
              <li>Información detallada y gráfica a demanda.</li>
              <li>Comparativas y consultas sobre eventos.</li>
              <li>Ayuda para planificación inicial.</li>
            </ul>
          </section>
          <section class="modal-col">
            <h2>Operativa</h2>
            <ul>
              <li>Resumen presupuestario y saldos.</li>
              <li>Mapa de recursos y vista aérea.</li>
              <li>INFOEVENTO, BACKUP y archivos de control.</li>
              <li>Roles GD, RW y RO con permisos.</li>
            </ul>
          </section>
        </div>
        <div class="modal-footer">** (c)oltyLAB '26 - ${VERSION_LABEL} **</div>
      </div>
    </div>`;
    layer.classList.add('visible');
    layer.querySelector('.ce-v17fix26-close')?.addEventListener('click', ev => { stopEvent(ev); closeInfo(); }, {once:true});
    layer.querySelector('.ce-v17fix26-card')?.addEventListener('click', ev => ev.stopPropagation());
  }

  let lastLogoAction = 0;
  function handleLogo(ev){
    if(!welcomeActive()) return false;
    if(!isColtyLogo(ev.target)) return false;
    const hasPointerEvents = !!window.PointerEvent;
    if(hasPointerEvents && ev.type !== 'pointerup'){
      stopEvent(ev);
      return true;
    }
    if(!hasPointerEvents && ev.type === 'click'){
      stopEvent(ev);
      return true;
    }
    stopEvent(ev);
    const t = Date.now();
    if(t - lastLogoAction < 260) return true;
    lastLogoAction = t;
    const layer = $(LAYER_ID);
    if(layer?.classList?.contains('visible')) closeInfo(); else showInfo();
    return true;
  }

  ['pointerup','touchend','click'].forEach(type => {
    document.addEventListener(type, ev => { try{ handleLogo(ev); }catch(_){ } }, {capture:true, passive:false});
  });
  document.addEventListener('keydown', ev => { if(ev.key === 'Escape') closeInfo(); }, true);

  window.ControlEventV17Fix27WelcomeInfoGeneral = {version:VERSION_LABEL, showInfo, closeInfo, isPhoneOnly, welcomeActive};
})();
