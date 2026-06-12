/* ControlEvent v8.5_prod FIX23 - WRITE LOCKDOWN RAIZ
   Regla absoluta:
   - navegar, login, refrescar, renderizar, cambiar evento, cambiar ventana, globos y fotos = SOLO LECTURA.
   - PUT /api/state queda prohibido salvo restauracion total de BACKUP con cabecera interna.
   - /api/crud-deltas queda prohibido.
   - /api/crud y /api/ticket-images solo pasan si van marcados con la nueva cabecera FIX23.
   - saveState/pushStateToServer quedan solo-local; nunca envian estado completo al servidor.
*/
(function(){
  'use strict';
  const TAG = '__ceV85WriteLockdownFix23';
  if (window[TAG]) return;
  window[TAG] = true;

  const WRITE_SCOPE = 'row-crud-v8-5-fix23';
  const IMAGE_SCOPE = 'ticket-image-v8-5-fix23';
  let imageWriteUntil = 0;
  function markImageWrite(ms){ imageWriteUntil = Math.max(imageWriteUntil, Date.now() + (ms || 8000)); }
  function hasImageGesture(){ return Date.now() <= imageWriteUntil; }
  function mergeHeader(init, name, value){
    const h = headersToObj(init && init.headers);
    h[name] = value;
    return Object.assign({}, init || {}, {headers: h});
  }

  function warn(msg, extra){ try{ console.warn('[FIX23 WRITE-LOCKDOWN] ' + msg, extra || ''); }catch(_){ } }
  function response(status, body){ return new Response(JSON.stringify(body || {}), {status, headers:{'Content-Type':'application/json'}}); }
  function getUrl(input){ return String(typeof input === 'string' ? input : (input && input.url) || ''); }
  function getMethod(input, init){ return String((init && init.method) || (input && input.method) || 'GET').toUpperCase(); }
  function parseBody(init){ try{ const b = init && init.body; return (b && typeof b === 'string') ? JSON.parse(b) : {}; }catch(_){ return {}; } }
  function headersToObj(headers){
    const out = {};
    if(!headers) return out;
    try{
      if(headers instanceof Headers){ headers.forEach((v,k)=>{ out[k]=v; }); return out; }
      if(Array.isArray(headers)){ headers.forEach(([k,v])=>{ out[k]=v; }); return out; }
      if(typeof headers === 'object') return {...headers};
    }catch(_){ }
    return out;
  }
  function header(init, name){
    const h = headersToObj(init && init.headers);
    const wanted = String(name).toLowerCase();
    for(const [k,v] of Object.entries(h)) if(String(k).toLowerCase() === wanted) return String(v || '');
    return '';
  }
  function isBackupRestore(init, payload){
    return payload && payload.__forceReplaceAll === true && header(init, 'X-ControlEvent-Backup-Restore') === '1';
  }
  function isFix23RowWrite(init){ return header(init, 'X-ControlEvent-Write-Scope') === WRITE_SCOPE; }
  function isFix23ImageWrite(init){ return header(init, 'X-ControlEvent-Write-Scope') === IMAGE_SCOPE; }

  // Solo una acción humana de foto abre una ventana corta para POST/DELETE /api/ticket-images.
  ['pointerdown','mousedown','touchstart','click','change'].forEach(evt => {
    try{
      document.addEventListener(evt, event => {
        const el = event.target && event.target.closest && event.target.closest('input[type="file"],button,[data-action],[data-doc-replace],[data-doc-remove-image],[data-doc-delete]');
        if(!el) return;
        const id = String(el.id || '');
        const action = String((el.dataset && el.dataset.action) || '');
        const accept = String(el.getAttribute && el.getAttribute('accept') || '');
        if(el.matches && el.matches('input[type="file"]') && /image/i.test(accept + ' ' + id + ' ' + action)) markImageWrite(12000);
        if(/foto|photo|image|justificante|doc/i.test(id + ' ' + action + ' ' + Object.keys(el.dataset || {}).join(' '))) markImageWrite(12000);
      }, true);
    }catch(_){ }
  });

  if(typeof window.fetch === 'function' && !window.fetch.__ceV85WriteLockdownFix23){
    const originalFetch = window.fetch.bind(window);
    const wrappedFetch = function(input, init){
      const url = getUrl(input);
      const method = getMethod(input, init || {});
      const isApi = /\/api\//i.test(url);
      const payload = parseBody(init || {});

      if(method === 'PUT' && /\/api\/state(?:$|\?)/i.test(url)){
        if(!isBackupRestore(init || {}, payload)){
          warn('BLOQUEADO PUT /api/state. Nunca se guarda estado completo.', {url});
          return Promise.resolve(response(409, {ok:false, blocked:true, fix:'FIX23', error:'PUT /api/state bloqueado: no se permite guardar estado completo'}));
        }
      }

      if(method === 'POST' && /\/api\/crud-deltas(?:$|\?)/i.test(url)){
        warn('BLOQUEADO /api/crud-deltas.', {url});
        return Promise.resolve(response(409, {ok:false, blocked:true, fix:'FIX23', error:'crud-deltas bloqueado'}));
      }

      if((method === 'POST' || method === 'PUT' || method === 'DELETE') && /\/api\/crud\//i.test(url)){
        if(!isFix23RowWrite(init || {})){
          warn('BLOQUEADO CRUD sin cabecera FIX23.', {method,url});
          return Promise.resolve(response(409, {ok:false, blocked:true, fix:'FIX23', error:'CRUD bloqueado: falta cabecera FIX23 de escritura fila-a-fila'}));
        }
      }

      if((method === 'POST' || method === 'DELETE') && /\/api\/ticket-images(?:$|\?)/i.test(url)){
        if(!isFix23ImageWrite(init || {})){
          if(hasImageGesture()){
            init = mergeHeader(init || {}, 'X-ControlEvent-Write-Scope', IMAGE_SCOPE);
          }else{
            warn('BLOQUEADA escritura de imagen sin gesto humano reciente.', {method,url});
            return Promise.resolve(response(409, {ok:false, blocked:true, fix:'FIX23', error:'imagen bloqueada: falta acción explícita reciente'}));
          }
        }
      }

      if(isApi && method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS'){
        // No bloquea login/change-password/access-users porque pasan por rutas de usuario/acceso.
        // El bloqueo duro de datos se hace por servidor y por las ramas anteriores.
      }
      return originalFetch(input, init);
    };
    wrappedFetch.__ceV85WriteLockdownFix23 = true;
    window.fetch = wrappedFetch;
  }

  function localOnlySave(){
    try{
      const st = (typeof state !== 'undefined' && state) ? state : (window.state || {});
      const key = (typeof STORAGE_KEY !== 'undefined') ? STORAGE_KEY : 'controlevent_v6_4';
      localStorage.setItem(key, JSON.stringify(st));
    }catch(_){ }
    warn('saveState/pushStateToServer neutralizado: solo local, sin BBDD.');
    return Promise.resolve({ok:true, localOnly:true, fix:'FIX23'});
  }
  function installLocalOnly(){
    try{ Function('fn','saveState = fn;')(localOnlySave); }catch(_){ }
    try{ Function('fn','pushStateToServer = fn;')(localOnlySave); }catch(_){ }
    try{ window.saveState = localOnlySave; window.pushStateToServer = localOnlySave; }catch(_){ }
  }
  installLocalOnly();
  [0,25,100,250,500,1000,2000,4000,8000].forEach(ms => setTimeout(installLocalOnly, ms));

  // Elimina caches antiguas para que no sobrevivan scripts de versiones anteriores.
  try{
    if('serviceWorker' in navigator){
      navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister().catch(()=>{}))).catch(()=>{});
    }
    if(window.caches && caches.keys){
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).catch(()=>{});
    }
  }catch(_){ }

  window.ControlEventWriteLockdownFix23 = {active:true, version:'v8.5_prod_fix23', rowScope:WRITE_SCOPE, imageScope:IMAGE_SCOPE};
  warn('ACTIVO desde HEAD. Cualquier escritura masiva queda bloqueada.');
})();
