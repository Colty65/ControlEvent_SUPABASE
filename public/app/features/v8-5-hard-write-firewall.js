/* ControlEvent v8.5_prod FIX22 - HARD WRITE FIREWALL
   Corte real por seguridad:
   - PUT /api/state queda BLOQUEADO siempre, salvo restauracion total marcada por cabecera interna.
   - /api/crud-deltas queda BLOQUEADO.
   - DELETE /api/crud queda BLOQUEADO temporalmente: ninguna baja automatica puede borrar datos.
   - Login, refresco, cambio de evento, render, globos, fotos, menus = solo lectura.
*/
(function(){
  'use strict';
  const FLAG = '__ceV85HardWriteFirewallFix22';
  if (window[FLAG]) return;
  window[FLAG] = true;

  function json(status, body){
    return new Response(JSON.stringify(body || {}), {status, headers:{'Content-Type':'application/json'}});
  }
  function urlOf(input){ return String(typeof input === 'string' ? input : (input && input.url) || ''); }
  function methodOf(input, init){ return String((init && init.method) || (input && input.method) || 'GET').toUpperCase(); }
  function bodyOf(init){
    try{
      const body = init && init.body;
      if (!body || typeof body !== 'string') return {};
      return JSON.parse(body);
    }catch(_){ return {}; }
  }
  function headersObj(init){
    const h = init && init.headers;
    if (!h) return {};
    if (h instanceof Headers){
      const out = {};
      h.forEach((v,k)=>{ out[k] = v; });
      return out;
    }
    return h && typeof h === 'object' ? h : {};
  }
  function headerValue(init, name){
    const h = headersObj(init);
    const wanted = String(name).toLowerCase();
    for (const [k,v] of Object.entries(h)) if (String(k).toLowerCase() === wanted) return String(v || '');
    return '';
  }
  function isRestoreAllowed(init, payload){
    return payload && payload.__forceReplaceAll === true && headerValue(init, 'X-ControlEvent-Backup-Restore') === '1';
  }

  if (typeof window.fetch === 'function' && !window.fetch.__ceV85HardWriteFirewallFix22) {
    const original = window.fetch.bind(window);
    const wrapped = function(input, init){
      const url = urlOf(input);
      const method = methodOf(input, init || {});

      if (method === 'PUT' && /\/api\/state(?:$|\?)/i.test(url)) {
        const payload = bodyOf(init || {});
        if (!isRestoreAllowed(init || {}, payload)) {
          try { console.warn('[FIX22] PUT /api/state bloqueado por firewall. No se escribe nada.', {url}); } catch(_){ }
          return Promise.resolve(json(200, {ok:true, ignored:true, blocked:true, fix:'FIX22', reason:'state-put-blocked'}));
        }
        const headers = Object.assign({}, headersObj(init || {}), {
          'Content-Type':'application/json',
          'X-ControlEvent-Backup-Restore':'1'
        });
        return original(input, Object.assign({}, init || {}, {headers, body: JSON.stringify(payload), cache:'no-store'}));
      }

      if (method === 'POST' && /\/api\/crud-deltas(?:$|\?)/i.test(url)) {
        try { console.warn('[FIX22] /api/crud-deltas bloqueado por firewall.'); } catch(_){ }
        return Promise.resolve(json(409, {ok:false, blocked:true, fix:'FIX22', error:'crud-deltas bloqueado'}));
      }

      if (method === 'DELETE' && /\/api\/crud\//i.test(url)) {
        try { console.warn('[FIX22] DELETE /api/crud bloqueado por firewall.', {url}); } catch(_){ }
        return Promise.resolve(json(409, {ok:false, blocked:true, fix:'FIX22', error:'bajas CRUD bloqueadas temporalmente por seguridad'}));
      }

      return original(input, init);
    };
    wrapped.__ceV85HardWriteFirewallFix22 = true;
    window.fetch = wrapped;
  }

  // Neutraliza guardados legacy incluso si algun script redefine saveState después.
  function safeLocalOnlySave(){
    try{
      const st = (typeof state !== 'undefined' && state) ? state : (window.state || {});
      localStorage.setItem((typeof STORAGE_KEY !== 'undefined' ? STORAGE_KEY : 'controlevent_v6_4'), JSON.stringify(st));
    }catch(_){ }
    try { console.warn('[FIX22] saveState/pushStateToServer bloqueado en servidor. Solo local.'); } catch(_){ }
    return Promise.resolve({ok:true, ignored:true, fix:'FIX22', reason:'local-only-save'});
  }
  function install(){
    try { Function('fn', 'saveState = fn;')(safeLocalOnlySave); } catch(_){ }
    try { Function('fn', 'pushStateToServer = fn;')(safeLocalOnlySave); } catch(_){ }
    try { window.saveState = safeLocalOnlySave; window.pushStateToServer = safeLocalOnlySave; } catch(_){ }
  }
  install();
  [0,50,200,800,1500,3000].forEach(ms => setTimeout(install, ms));

  window.ControlEventHardWriteFirewallFix22 = { version:'v8.5_prod_fix22', active:true };
  try { console.warn('[FIX22] HARD WRITE FIREWALL activo desde arranque.'); } catch(_){ }
})();
