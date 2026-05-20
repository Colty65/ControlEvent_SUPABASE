/* ControlEvent v29.1 - LowResourceBoot
   Arranca antes del legacy para saber si el modo ligero esta activo en iPad/Android
   y para reducir tareas repetitivas que penalizan dispositivos tactiles. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v29.1';
  const params = new URLSearchParams(location.search || '');
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const maxTouchPoints = Number(navigator.maxTouchPoints || 0);
  const isAndroid = /Android/i.test(ua);
  const isIPad = /iPad/i.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);
  const isIPhone = /iPhone|iPod/i.test(ua) && !isIPad;
  const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  const memory = Number(navigator.deviceMemory || 0);
  const cores = Number(navigator.hardwareConcurrency || 0);
  const forcedOn = /^(1|true|on|si|sí)$/i.test(params.get('ceLite') || '');
  const forcedOff = /^(0|false|off|no)$/i.test(params.get('ceLite') || '');
  const likelyLowResource = (memory && memory <= 4) || (cores && cores <= 4);
  const detected = isAndroid || isIPad || (coarse && likelyLowResource && !isIPhone);
  const enabled = forcedOn || (!forcedOff && detected);
  const reason = forcedOn ? 'forzado-ceLite=1' : forcedOff ? 'desactivado-ceLite=0' : isAndroid ? 'Android' : isIPad ? 'iPad' : (coarse && likelyLowResource ? 'tactil-recursos-limitados' : 'equipo-normal');
  const stats = {
    version: VERSION,
    enabled,
    reason,
    ua,
    platform,
    maxTouchPoints,
    coarse,
    memory: memory || null,
    cores: cores || null,
    intervalsAdjusted: 0,
    suppressedListeners: {},
    createdAt: new Date().toISOString(),
    lastPanelOpen: null
  };
  function interval(ms){
    const value = Number(ms || 0);
    if(!enabled || !value) return value;
    if(value >= 25000) return value;
    stats.intervalsAdjusted += 1;
    if(value <= 1000) return Math.max(2500, value * 3);
    return Math.max(4000, Math.round(value * 4));
  }
  const noisyEvents = new Set(['mousemove','mouseover','mouseenter','pointermove']);
  const nativeAdd = EventTarget.prototype.addEventListener;
  if(enabled && nativeAdd && !nativeAdd.__ceLowResourceWrapped){
    EventTarget.prototype.addEventListener = function(type, listener, options){
      try{
        const targetIsGlobal = this === document || this === window || this === document.body || this === document.documentElement;
        if(targetIsGlobal && noisyEvents.has(String(type))){
          stats.suppressedListeners[type] = Number(stats.suppressedListeners[type] || 0) + 1;
          return;
        }
      }catch(_){ }
      return nativeAdd.call(this, type, listener, options);
    };
    EventTarget.prototype.addEventListener.__ceLowResourceWrapped = true;
  }
  function esc(value){
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function short(value, max=80){
    const text = String(value ?? '');
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
  }
  function getLite(){
    try{return window.ControlEventMobileLite?.inspect?.() || null;}catch(_){return null;}
  }
  function getHotpath(){
    try{return window.ControlEventHotpath?.inspect?.() || null;}catch(_){return null;}
  }
  function getScreenLazy(){
    try{return window.ControlEventScreenLazy?.info?.() || null;}catch(_){return null;}
  }
  function totals(object){
    return Object.values(object || {}).reduce((sum, n) => sum + Number(n || 0), 0);
  }
  function inspect(){
    return {
      ...stats,
      mobileLite: getLite(),
      hotpath: getHotpath(),
      screenLazy: getScreenLazy(),
      commands: [
        'ControlEventLowResource.print()',
        'ControlEventMobileLite.print()',
        'ControlEventRuntime.inspect()'
      ]
    };
  }
  function panelHtml(){
    const lite = getLite();
    const hot = getHotpath();
    const lazy = getScreenLazy();
    const wrapped = lite?.wrapped?.length || 0;
    const skipped = totals(lite?.skipped);
    const executed = totals(lite?.executed);
    const suppressed = Object.entries(stats.suppressedListeners || {}).map(([k,v]) => `${esc(k)}: ${esc(v)}`).join(' · ') || '0';
    const hotRows = Array.isArray(hot?.rows) ? hot.rows.slice(0, 6) : [];
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px">
        <strong>Diagnóstico móvil ${esc(VERSION)}</strong>
        <button type="button" data-ce-lite-close style="border:0;border-radius:10px;padding:6px 9px;background:#111827;color:white">Cerrar</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">
        <div><b>LowResource</b><br>${enabled ? 'ACTIVO' : 'NO activo'}<br><small>${esc(reason)}</small></div>
        <div><b>MobileLite</b><br>${lite?.installed ? 'INSTALADO' : 'No instalado'} / ${lite?.enabled ? 'ON' : 'OFF'}<br><small>envueltas: ${wrapped}</small></div>
        <div><b>Render visible-only</b><br>ejecutados: ${executed}<br>saltados ocultos: ${skipped}</div>
        <div><b>Tab actual</b><br>${esc(lite?.currentTab || lazy?.current || 'sin dato')}<br><small>pantallas cargadas: ${esc((lazy?.loadedScreens || []).join(', ') || '—')}</small></div>
        <div><b>Intervalos lentificados</b><br>${esc(stats.intervalsAdjusted)}</div>
        <div><b>Eventos mouse anulados</b><br>${suppressed}</div>
      </div>
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(15,23,42,.18)">
        <b>Última acción MobileLite</b><br><small>${esc(short(JSON.stringify(lite?.last || null), 240))}</small>
      </div>
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(15,23,42,.18)">
        <b>Cache Hotpath</b><br><small>${hot ? `cache: ${esc(hot.cacheSize)} · funciones: ${esc((hot.cachedFunctions||[]).length)} · invalidaciones: ${esc((hot.invalidations||[]).length)}` : 'sin dato'}</small>
        ${hotRows.length ? `<table style="width:100%;font-size:12px;margin-top:6px;border-collapse:collapse"><tr><th style="text-align:left">Función</th><th>Hits</th><th>Ms</th></tr>${hotRows.map(row => `<tr><td style="border-top:1px solid #e5e7eb">${esc(row.name)}</td><td style="text-align:center;border-top:1px solid #e5e7eb">${esc(row.hits)}</td><td style="text-align:center;border-top:1px solid #e5e7eb">${esc(row.totalMs)}</td></tr>`).join('')}</table>` : ''}
      </div>
      <div style="margin-top:10px;font-size:12px;color:#4b5563">Para forzar pruebas: añade <b>?ceLite=1</b>. Para desactivarlo: <b>?ceLite=0</b>.</div>
    `;
  }
  function ensureUi(){
    if(document.getElementById('ceLowResourceBadge')) return;
    const badge = document.createElement('button');
    badge.type = 'button';
    badge.id = 'ceLowResourceBadge';
    badge.textContent = enabled ? '⚡ LITE ON' : '⚡ LITE OFF';
    badge.title = 'Ver diagnóstico de rendimiento móvil';
    badge.style.cssText = 'position:fixed;right:10px;bottom:72px;z-index:3000;border:0;border-radius:999px;padding:8px 11px;font:700 12px system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 8px 22px rgba(15,23,42,.25);background:' + (enabled ? '#16a34a' : '#6b7280') + ';color:white;opacity:.92';
    badge.addEventListener('click', () => openPanel(), true);
    document.body.appendChild(badge);
  }
  function openPanel(){
    stats.lastPanelOpen = new Date().toISOString();
    let panel = document.getElementById('ceLowResourcePanel');
    if(!panel){
      panel = document.createElement('div');
      panel.id = 'ceLowResourcePanel';
      panel.style.cssText = 'position:fixed;left:10px;right:10px;bottom:118px;z-index:3001;max-height:68vh;overflow:auto;background:white;color:#111827;border:1px solid rgba(15,23,42,.18);border-radius:18px;padding:14px;box-shadow:0 22px 60px rgba(15,23,42,.32);font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.35';
      panel.addEventListener('click', ev => { if(ev.target?.closest?.('[data-ce-lite-close]')) closePanel(); }, true);
      document.body.appendChild(panel);
    }
    panel.innerHTML = panelHtml();
    panel.style.display = 'block';
  }
  function closePanel(){
    const panel = document.getElementById('ceLowResourcePanel');
    if(panel) panel.style.display = 'none';
  }
  function refreshUi(){
    const badge = document.getElementById('ceLowResourceBadge');
    if(badge){
      const lite = getLite();
      const skipped = totals(lite?.skipped);
      badge.textContent = enabled ? `⚡ LITE ON${skipped ? ' · '+skipped : ''}` : '⚡ LITE OFF';
    }
    const panel = document.getElementById('ceLowResourcePanel');
    if(panel && panel.style.display !== 'none') panel.innerHTML = panelHtml();
  }
  function print(){
    const report = inspect();
    console.group(`[ControlEventLowResource/${VERSION}]`);
    console.info(report);
    console.groupEnd();
    return report;
  }
  window.ControlEventLowResource = {version:VERSION, enabled, isLite:enabled, reason, stats, interval, inspect, print, ensureUi, openPanel, closePanel, refreshUi};
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { ensureUi(); setInterval(refreshUi, 2500); }, {once:true});
  else { ensureUi(); setInterval(refreshUi, 2500); }
})();
