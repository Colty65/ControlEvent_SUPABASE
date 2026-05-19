/* ControlEvent v28.8 - Modo visual ligero para iPad/Android.
   Se aplica temprano y sólo reduce efectos visuales costosos. */
(function(){
  const VERSION = 'ControlEvent v28.8';
  const KEY = 'controlevent:mobileLite';
  const root = document.documentElement;
  function detect(){
    const ua = navigator.userAgent || '';
    const isAndroid = /Android/i.test(ua);
    const isIPad = /iPad/i.test(ua) || (/Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1);
    const isIPhone = /iPhone|iPod/i.test(ua);
    const memory = Number(navigator.deviceMemory || 0);
    const cores = Number(navigator.hardwareConcurrency || 0);
    const lowMem = memory > 0 && memory <= 4;
    const lowCpu = cores > 0 && cores <= 4;
    // iPhone 12 mini probado fluido; no forzamos lite sólo por ser iPhone.
    return isAndroid || isIPad || (!isIPhone && (lowMem || lowCpu));
  }
  function wanted(){
    const stored = localStorage.getItem(KEY);
    if(stored === '1') return true;
    if(stored === '0') return false;
    return detect();
  }
  function apply(flag){
    root.classList.toggle('ce-mobile-lite', !!flag);
    document.body?.classList?.toggle('ce-mobile-lite-body', !!flag);
    return status();
  }
  function enable(){ localStorage.setItem(KEY,'1'); return apply(true); }
  function disable(){ localStorage.setItem(KEY,'0'); return apply(false); }
  function auto(){ localStorage.removeItem(KEY); return apply(detect()); }
  function status(){
    return {
      version: VERSION,
      enabled: root.classList.contains('ce-mobile-lite'),
      stored: localStorage.getItem(KEY),
      autoDetected: detect(),
      userAgent: navigator.userAgent,
      deviceMemory: navigator.deviceMemory || null,
      hardwareConcurrency: navigator.hardwareConcurrency || null
    };
  }
  apply(wanted());
  window.ControlEventMobileLite = {version:VERSION, status, print(){ const s=status(); console.log('[ControlEventMobileLite/'+VERSION+']', s); return s; }, enable, disable, auto};
  if(status().enabled) console.log('[ControlEventMobileLite/'+VERSION+'] Modo visual ligero activo.');
})();
