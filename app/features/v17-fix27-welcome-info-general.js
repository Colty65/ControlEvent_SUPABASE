/* ControlEvent v17_prod FIX31_PLANIFICACION_BRIEF_GEMINI
   - Mantiene FIX26: solo móviles tipo teléfono con doble pulsación rápida para globos de RESUMEN PRESUPUESTARIO (en budget-tooltips-lite.js).
   - Bienvenida sin evento en cualquier dispositivo: ColtyLAB muestra ficha informativa en vez de avance vacío. */
(function(){
  'use strict';
  if(window.__ceV17Fix27WelcomeInfoGeneral) return;
  window.__ceV17Fix27WelcomeInfoGeneral = true;

  const STYLE_ID = 'ceV17Fix26WelcomeInfoStyle';
  const LAYER_ID = 'ceV17Fix26WelcomeInfoLayer';
  const VERSION_LABEL = 'v17_prod_FIX31_PLANIFICACION_BRIEF_GEMINI';
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
    return !!String((sel && sel.value) || '').trim();
  }
  function welcomeActive(){
    // FIX27: la ficha informativa ColtyLAB debe funcionar también en PC e iPad.
    // La restricción "solo móvil" queda únicamente para el doble toque de globos del Resumen.
    if(loginVisible()) return false;
    if(hasSelectedEvent()) return false;
    return document.body.classList.contains('ce-v17-fix25-welcome-ready') || visible($('noEventMessage'));
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
      #${LAYER_ID} .ce-v17fix26-card{position:relative!important;width:min(620px,94vw)!important;max-height:min(78vh,640px)!important;overflow:auto!important;background:#fff!important;border:2px solid #0f172a!important;border-radius:22px!important;box-shadow:0 24px 70px rgba(15,23,42,.30)!important;padding:18px 16px 14px!important;color:#0f172a!important;font-family:inherit!important;}
      #${LAYER_ID} .ce-v17fix26-close{position:absolute!important;right:10px!important;top:8px!important;width:34px!important;height:34px!important;border-radius:999px!important;border:1px solid #cbd5e1!important;background:#fff!important;font-size:22px!important;font-weight:950!important;line-height:28px!important;cursor:pointer!important;color:#0f172a!important;}
      #${LAYER_ID} .ce-v17fix26-title{text-align:center!important;margin:12px 36px 26px!important;font-size:clamp(24px,7vw,34px)!important;line-height:1.05!important;font-weight:950!important;color:#f97316!important;-webkit-text-stroke:.45px #111827!important;text-shadow:0 0 0 #111827!important;letter-spacing:.01em!important;}
      #${LAYER_ID} .ce-v17fix26-body{font-size:15px!important;line-height:1.42!important;font-weight:600!important;color:#111827!important;display:grid!important;gap:3px!important;}
      #${LAYER_ID} .ce-v17fix26-indent{padding-left:22px!important;}
      #${LAYER_ID} .ce-v17fix26-foot{text-align:right!important;margin-top:22px!important;font-weight:950!important;color:#111827!important;font-size:14px!important;}
      @media(max-width:420px){#${LAYER_ID} .ce-v17fix26-card{border-radius:18px!important;padding:16px 13px 12px!important;}#${LAYER_ID} .ce-v17fix26-title{margin-top:14px!important;margin-bottom:22px!important;}#${LAYER_ID} .ce-v17fix26-body{font-size:14px!important;}}
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
      <div class="ce-v17fix26-title">Control_Event_App</div>
      <div class="ce-v17fix26-body">
        <div>- Creada para la fabricacion y control de eventos,</div>
        <div>sirviendo en cada momento la informacion que se le pueda ocurrir saber al usuario,</div>
        <div>Plug &amp; Play, lo quiero, lo tengo.</div>
        <div style="height:8px"></div>
        <div>- Asistida por IA (Gemini-Zuzu) en:</div>
        <div class="ce-v17fix26-indent">- Automatizacion tickets de compra.</div>
        <div class="ce-v17fix26-indent">- Informacion detallada y gráfica (a demanda) sobre los eventos.</div>
        <div class="ce-v17fix26-indent">- y como ayudante para la planificacion inicial de un nuevo evento.</div>
      </div>
      <div class="ce-v17fix26-foot">** (c)oltyLAB '26 - ${VERSION_LABEL} **</div>
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
