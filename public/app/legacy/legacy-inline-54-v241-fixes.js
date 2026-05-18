/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #54. */
(function(){
  const VERSION = 'ControlEvent v26.6';
  const VERSION_FILE = 'ControlEvent_v26_6';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();

  function auth(){
    try{
      if(typeof authUser !== 'undefined' && authUser) return authUser;
    }catch(_){ }
    return window.authUser || window.__CONTROL_EVENT_USER__ || null;
  }
  function role(){
    return up(auth()?.nivel || '');
  }
  function isGD(){
    return role() === 'GD';
  }
  function setBodyRole(){
    const r = role();
    document.body.classList.toggle('ce-v241-gd', r === 'GD');
    document.body.classList.toggle('ce-v241-rw', r === 'RW');
    document.body.classList.toggle('ce-v241-ro', r === 'RO');
  }
  function expose(el){
    if(!el) return;
    el.hidden = false;
    el.disabled = false;
    el.classList.remove('hidden','hidden-by-role','hidden-by-role-v228');
    el.style.removeProperty('display');
    el.style.removeProperty('visibility');
    el.style.removeProperty('opacity');
    el.style.removeProperty('pointer-events');
    el.removeAttribute('aria-disabled');
  }
  function conceal(el){
    if(!el) return;
    el.classList.add('hidden');
    el.style.setProperty('display','none','important');
    el.disabled = true;
    el.setAttribute('aria-disabled','true');
  }
  function accessList(){
    try{
      if(Array.isArray(accessUsers)) return accessUsers;
    }catch(_){ }
    return Array.isArray(window.accessUsers) ? window.accessUsers : [];
  }
  function setAccessList(list){
    const clean = Array.isArray(list) ? list : [];
    try{ accessUsers = clean; }catch(_){ }
    window.accessUsers = clean;
  }
  function fieldByAction(action, id){
    return Array.from(document.querySelectorAll(`[data-action="${action}"]`)).find(el => String(el.dataset.id || '') === String(id));
  }
  function passInputById(id){
    return Array.from(document.querySelectorAll('[data-v241-pass-id]')).find(el => String(el.dataset.v241PassId || '') === String(id));
  }
  function plainPassword(u){
    for(const k of ['clave','password','pass','claveClara','clave_plana','plainPassword','clearPassword']){
      const raw = u && u[k];
      if(raw == null) continue;
      const value = String(raw);
      if(value.trim() && !/^(?:\*|\u2022)+$/.test(value.trim())) return value;
    }
    return '';
  }
  function safeId(v){
    return String(v || 'acceso').replace(/[^A-Za-z0-9_-]/g,'_') || 'acceso';
  }
  async function loadAccessUsersV241(){
    if(!isGD()) return [];
    try{
      const res = await fetch('/api/access-users', {cache:'no-store'});
      const data = await res.json().catch(() => ({}));
      if(!res.ok || !data.ok || !Array.isArray(data.items)){
        throw new Error(data.error || 'No se pudo leer ACCESO.');
      }
      setAccessList(data.items);
      return data.items;
    }catch(err){
      console.warn('[v24.1] No se pudo recargar ACCESO', err);
      return accessList();
    }
  }
  function renderAccesosV241(){
    const wrap = $('accesoList');
    if(!wrap) return;
    if(!isGD()){
      wrap.innerHTML = '<div class="empty">Solo un usuario GD puede consultar esta tabla.</div>';
      return;
    }
    const list = accessList().slice().sort((a,b) => {
      const an = norm(a.nombre || a.identificacion);
      const bn = norm(b.nombre || b.identificacion);
      return an.localeCompare(bn, 'es') || norm(a.identificacion).localeCompare(norm(b.identificacion), 'es');
    });
    if(!list.length){
      wrap.innerHTML = '<div class="empty">No hay usuarios en ACCESO.</div>';
      return;
    }
    const currentId = norm(auth()?.identificacion);
    wrap.innerHTML = '';
    list.forEach((u, idx) => {
      const id = norm(u.identificacion || u.id);
      const level = up(u.nivel || 'RO') || 'RO';
      const inputId = `accClave_v241_${safeId(id)}_${idx}`;
      const row = document.createElement('div');
      row.className = 'itemcard maint-soft';
      row.innerHTML = `
        <div class="rowline persona ce-v241-access-row">
          <div class="field"><label>Identificacion</label><input value="${esc(id)}" data-action="edit-acceso-identificacion" data-id="${esc(id)}" /></div>
          <div class="field"><label>Nombre</label><input value="${esc(u.nombre || '')}" data-action="edit-acceso-nombre" data-id="${esc(id)}" /></div>
          <div class="field"><label>Clave</label><div class="ce-v241-pass-row"><input id="${esc(inputId)}" type="password" value="${esc(plainPassword(u))}" placeholder="Nueva clave (opcional)" autocomplete="new-password" data-action="edit-acceso-clave" data-id="${esc(id)}" data-v241-pass-id="${esc(id)}" /><button type="button" class="outline small" data-v241-pass-toggle="${esc(inputId)}">Ver</button></div><div class="ce-v241-access-note">Dejala en blanco para no cambiar la clave.</div></div>
          <div class="field"><label>Nivel</label><select data-action="edit-acceso-nivel" data-id="${esc(id)}">${['RO','RW','GD'].map(v => `<option value="${v}" ${v === level ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          <button type="button" class="modify small" data-action="save-acceso" data-id="${esc(id)}">Modificar</button>
          <button type="button" class="danger small" data-action="delete-acceso" data-id="${esc(id)}" ${id === currentId ? 'disabled' : ''}>Eliminar</button>
        </div>`;
      wrap.appendChild(row);
    });
  }
  function fixAccessVisibilityV241(){
    setBodyRole();
    const btn = $('mtAccesoBtn');
    if(isGD()){
      expose(btn);
      document.querySelectorAll('.mobile-menu-action[data-target="mtAccesoBtn"]').forEach(expose);
    }else{
      conceal(btn);
      document.querySelectorAll('.mobile-menu-action[data-target="mtAccesoBtn"]').forEach(conceal);
    }
    let isAccess = false;
    try{ isAccess = typeof currentMaintTab !== 'undefined' && currentMaintTab === 'acceso'; }catch(_){ }
    const card = $('mtAcceso');
    if(!isAccess || !isGD()){
      if(card) card.classList.remove('ce-v241-open');
    }
    if(isGD() && isAccess){
      const wrap = $('maintenanceWrapper');
      expose(wrap);
      if(wrap) wrap.classList.remove('ce-import-only-v212');
      document.querySelectorAll('#maintenanceWrapper > .card').forEach(card => card.classList.add('hidden'));
      expose(card);
      if(card) card.classList.add('ce-v241-open');
      document.querySelectorAll('.maintenance-tabs .tab').forEach(tab => tab.classList.remove('active'));
      if(btn) btn.classList.add('active');
    }
  }
  async function openAccessV241(){
    if(!isGD()){
      alert('Solo un usuario GD puede mantener ACCESO.');
      return false;
    }
    try{ currentMaintTab = 'acceso'; }catch(_){ }
    fixAccessVisibilityV241();
    await loadAccessUsersV241();
    renderAccesosV241();
    fixAccessVisibilityV241();
    [60, 220, 700].forEach(ms => setTimeout(fixAccessVisibilityV241, ms));
    return false;
  }
  async function saveAccessUserV241(existingId = ''){
    if(!isGD()){
      alert('Solo un usuario GD puede mantener ACCESO.');
      return false;
    }
    const oldId = norm(existingId);
    const identificacion = oldId ? norm(fieldByAction('edit-acceso-identificacion', oldId)?.value || oldId) : norm($('newAccesoIdentificacion')?.value);
    const nombre = oldId ? norm(fieldByAction('edit-acceso-nombre', oldId)?.value) : norm($('newAccesoNombre')?.value);
    const nivel = up(oldId ? fieldByAction('edit-acceso-nivel', oldId)?.value : $('newAccesoNivel')?.value) || 'RO';
    const clave = oldId ? String(passInputById(oldId)?.value || '') : String($('newAccesoClave')?.value || '');
    if(!identificacion || !nombre || (!oldId && !clave)){
      alert('Identificacion, nombre y clave son obligatorios al dar de alta.');
      return false;
    }
    const payload = {identificacion, nombre, nivel, existingId: oldId};
    if(clave || !oldId) payload.clave = clave;
    try{
      const res = await fetch('/api/access-users', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if(!res.ok || !data.ok) throw new Error(data.error || 'No se pudo guardar el usuario de acceso.');
      if(!oldId){
        ['newAccesoIdentificacion','newAccesoNombre','newAccesoClave'].forEach(id => { const el = $(id); if(el) el.value = ''; });
        const level = $('newAccesoNivel');
        if(level) level.value = 'RO';
      }
      await loadAccessUsersV241();
      renderAccesosV241();
      fixAccessVisibilityV241();
      return false;
    }catch(err){
      alert(err.message || 'No se pudo guardar el usuario de acceso.');
      return false;
    }
  }
  async function deleteAccessUserV241(id){
    if(!isGD() || !id) return false;
    if(norm(auth()?.identificacion) === norm(id)){
      alert('No puedes eliminar el acceso con el que estas logado.');
      return false;
    }
    if(!confirm('Eliminar este usuario de acceso?')) return false;
    try{
      const res = await fetch('/api/access-users/' + encodeURIComponent(id), {method:'DELETE'});
      const data = await res.json().catch(() => ({}));
      if(!res.ok || !data.ok) throw new Error(data.error || 'No se pudo eliminar el usuario de acceso.');
      await loadAccessUsersV241();
      renderAccesosV241();
      fixAccessVisibilityV241();
      return false;
    }catch(err){
      alert(err.message || 'No se pudo eliminar el usuario de acceso.');
      return false;
    }
  }
  function applyVersionV241(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span,.appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION;
    });
    try{
      window.emittedByTextV171 = function(date = new Date()){
        const p = n => String(n).padStart(2,'0');
        return `Emitido por "(c)oltyLAB '26_${VERSION_FILE}_${p(date.getDate())}${p(date.getMonth()+1)}${date.getFullYear()}_${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}"`;
      };
      emittedByTextV171 = window.emittedByTextV171;
    }catch(_){ }
    try{
      window.makeInfoEventoFilename = window.xlsxFilename = function(ev){
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth()+1).padStart(2,'0');
        const day = String(d.getDate()).padStart(2,'0');
        const titleSource = ev?.titulo || (typeof currentEvent === 'function' ? currentEvent().titulo : '') || (typeof selectedEvent === 'function' ? selectedEvent()?.titulo : '') || 'evento';
        const title = norm(titleSource).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'').replace(/_+/g,'_') || 'evento';
        return `${VERSION_FILE}_INFOEVENTO-${title}_${y}${m}${day}.xlsx`;
      };
    }catch(_){ }
    try{
      const proto = HTMLAnchorElement.prototype;
      if(!proto.click.__v241Wrapped){
        const prev = proto.click;
        const wrapped = function(){
          try{
            if(this.download){
              this.download = String(this.download)
                .replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE)
                .replace(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/ig, VERSION);
            }
          }catch(_){ }
          return prev.apply(this, arguments);
        };
        wrapped.__v241Wrapped = true;
        proto.click = wrapped;
      }
    }catch(_){ }
  }
  function installV241(){
    try{ window.openAccessMaintenance = openAccessV241; openAccessMaintenance = openAccessV241; }catch(_){ window.openAccessMaintenance = openAccessV241; }
    try{ window.renderAcceso = renderAccesosV241; renderAcceso = renderAccesosV241; }catch(_){ window.renderAcceso = renderAccesosV241; }
    try{ window.saveAccessUser = saveAccessUserV241; saveAccessUser = saveAccessUserV241; }catch(_){ window.saveAccessUser = saveAccessUserV241; }
    try{ window.deleteAccessUser = deleteAccessUserV241; deleteAccessUser = deleteAccessUserV241; }catch(_){ window.deleteAccessUser = deleteAccessUserV241; }
    const prevTabs = (typeof renderMaintenanceTabs === 'function') ? renderMaintenanceTabs : window.renderMaintenanceTabs;
    if(prevTabs && !prevTabs.__v241Wrapped){
      const wrapped = function(){
        const ret = prevTabs.apply(this, arguments);
        fixAccessVisibilityV241();
        return ret;
      };
      wrapped.__v241Wrapped = true;
      try{ renderMaintenanceTabs = wrapped; }catch(_){ }
      window.renderMaintenanceTabs = wrapped;
    }
  }

  document.addEventListener('click', function(ev){
    const t = ev.target;
    const open = t.closest?.('#mtAccesoBtn,.mobile-menu-action[data-target="mtAccesoBtn"],[data-action="open-acceso"]');
    if(open){
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      openAccessV241();
      return false;
    }
    const add = t.closest?.('#btnAddAcceso');
    if(add){
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      saveAccessUserV241('');
      return false;
    }
    const save = t.closest?.('button[data-action="save-acceso"]');
    if(save){
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      saveAccessUserV241(save.dataset.id || '');
      return false;
    }
    const del = t.closest?.('button[data-action="delete-acceso"]');
    if(del){
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      deleteAccessUserV241(del.dataset.id || '');
      return false;
    }
    const pass = t.closest?.('[data-v241-pass-toggle]');
    if(pass){
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      const input = $(pass.dataset.v241PassToggle);
      if(input){
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        pass.textContent = show ? 'Ocultar' : 'Ver';
        input.focus({preventScroll:true});
      }
      return false;
    }
  }, true);

  const oldRender = (typeof render === 'function') ? render : null;
  if(oldRender && !oldRender.__v241Wrapped){
    const wrapped = function(){
      const ret = oldRender.apply(this, arguments);
      [40, 180, 600].forEach(ms => setTimeout(() => { applyVersionV241(); fixAccessVisibilityV241(); }, ms));
      return ret;
    };
    wrapped.__v241Wrapped = true;
    try{ render = wrapped; }catch(_){ }
    window.render = wrapped;
  }

  installV241();
  applyVersionV241();
  fixAccessVisibilityV241();
  [100, 400, 1200, 2500].forEach(ms => setTimeout(() => { installV241(); applyVersionV241(); fixAccessVisibilityV241(); }, ms));
  setInterval(() => { applyVersionV241(); fixAccessVisibilityV241(); }, 1500);
  window.__ceV241 = {openAccessMaintenance: openAccessV241, renderAcceso: renderAccesosV241, loadAccessUsers: loadAccessUsersV241};
})();
