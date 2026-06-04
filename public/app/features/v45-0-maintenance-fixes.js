/* ControlEvent v8.4.1_prod - mantenimiento seguro de tablas generales y baja controlada de EVENTOS.
   No toca el flujo de cambio de evento de v44.7.x. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v8.4.1_prod';
  const VERSION_FILE = 'ControlEvent_v8_4_1_prod';
  const BLOCK_MSG = 'No es posible, tiene dependencias.';
  const EVENT_GD_MSG = 'Solo GD puede eliminar eventos.';
  const OK_MSG = 'Se puede eliminar. No hay dependencias.';
  const INSTALLED = '__ceV450MaintenanceFixes';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  function st(){
    try{ if(window.state) return window.state; }catch(_){ }
    try{ if(window.ControlEventRuntime?.app?.state) return window.ControlEventRuntime.app.state; }catch(_){ }
    try{ if(window.ControlEventApp?.state) return window.ControlEventApp.state; }catch(_){ }
    return {};
  }
  function role(){
    try{ return up((typeof authUser !== 'undefined' && authUser && authUser.nivel) || window.authUser?.nivel || window.ControlEventRuntime?.app?.authUser?.nivel || ''); }catch(_){ return up(window.authUser?.nivel || ''); }
  }
  const isGD = () => role() === 'GD';
  const isRW = () => role() === 'RW';
  const canMaintain = () => isGD() || isRW();
  const arr = name => Array.isArray(st()[name]) ? st()[name] : [];
  const same = (a,b) => String(a ?? '') === String(b ?? '');
  const rowId = row => String(row?.id ?? row?.record_id ?? '');

  function cssEscape(value){
    const s = String(value ?? '');
    try{ if(window.CSS && typeof CSS.escape === 'function') return CSS.escape(s); }catch(_){ }
    return s.replace(/[^a-zA-Z0-9_\-]/g, ch => `\\${ch}`);
  }

  function parseEuro(value){
    if(typeof value === 'number') return Number.isFinite(value) ? value : 0;
    let s = String(value ?? '').trim();
    if(!s) return 0;
    s = s.replace(/\s/g,'').replace(/€/g,'');
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',', '.');
    else if(s.includes(',')) s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  function value(action,id){
    const el = document.querySelector(`[data-action="${cssEscape(action)}"][data-id="${cssEscape(String(id))}"]`);
    return el ? el.value : '';
  }
  function save(){
    try{ if(typeof window.saveState === 'function'){ window.saveState(); return; } }catch(_){ }
    try{ if(typeof saveState === 'function') saveState(); }catch(_){ }
  }
  function redraw(){
    try{ if(typeof window.render === 'function'){ window.render(); return; } }catch(_){ }
    try{ if(typeof render === 'function') render(); }catch(_){ }
  }
  function setVersion(){
    try{ document.title = VERSION; }catch(_){ }
    try{ document.body.dataset.ceVersion = VERSION; window.__ceVersion = VERSION; }catch(_){ }
    try{
      document.querySelectorAll('.appname span,.appname-stack span').forEach(el => {
        if(/ControlEvent\s+v[0-9][0-9A-Za-z._\/-]*/i.test(el.textContent || '')) el.textContent = VERSION;
      });
    }catch(_){ }
    try{
      const proto = HTMLAnchorElement.prototype;
      if(!proto.click.__ceV450Version){
        const old = proto.click;
        const wrapped = function(){
          try{ if(this.download) this.download = String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }catch(_){ }
          return old.apply(this, arguments);
        };
        wrapped.__ceV450Version = true;
        proto.click = wrapped;
      }
    }catch(_){ }
  }

  function eventById(id){ return arr('eventos').find(e => same(e.id, id)) || null; }
  function productById(id){ return arr('productos').find(p => same(p.id, id)) || null; }
  function personById(id){ return arr('personas').find(p => same(p.id, id)) || null; }
  function storeById(id){ return arr('tiendas').find(t => same(t.id, id)) || null; }

  function dependencies(action,id){
    const sid = String(id ?? '');
    const deps = [];
    if(!sid) return deps;
    const cols = arr('colaboradores');
    const buys = arr('compras');
    const products = arr('productos');
    if(action === 'delete-persona'){
      const ingresos = cols.filter(c => same(c.personaId, sid));
      const compras = buys.filter(c => same(c.responsableId, sid) || same(c.personaId, sid) || same(c.donanteId, sid) || String(c.donorRef || '') === `P:${sid}`);
      if(ingresos.length) deps.push(`ingresos: ${ingresos.length}`);
      if(compras.length) deps.push(`compras/donaciones: ${compras.length}`);
    }else if(action === 'delete-producto'){
      const compras = buys.filter(c => same(c.productoId, sid));
      if(compras.length) deps.push(`compras/donaciones: ${compras.length}`);
    }else if(action === 'delete-tienda'){
      const productos = products.filter(p => same(p.tiendaId, sid) || same(p.defaultTiendaId, sid));
      const compras = buys.filter(c => same(c.tiendaId, sid) || same(c.storeId, sid) || String(c.donorRef || '') === `T:${sid}`);
      if(productos.length) deps.push(`productos: ${productos.length}`);
      if(compras.length) deps.push(`compras/donaciones: ${compras.length}`);
    }else if(action === 'delete-evento'){
      const ingresos = cols.filter(c => same(c.eventId, sid));
      const compras = buys.filter(c => same(c.eventId, sid));
      const imgs = Object.keys(st().ticketImages || {}).filter(k => String(k).startsWith(`${sid}|`));
      if(ingresos.length) deps.push(`ingresos: ${ingresos.length}`);
      if(compras.length) deps.push(`compras/donaciones: ${compras.length}`);
      if(imgs.length) deps.push(`imágenes: ${imgs.length}`);
    }
    return deps;
  }
  function hasDeps(action,id){ return dependencies(action,id).length > 0; }

  function ensureStyle(){
    if($('ceV450MaintenanceStyle')) return;
    const style = document.createElement('style');
    style.id = 'ceV450MaintenanceStyle';
    style.textContent = `
      #ceV450DependencyTip{position:fixed;z-index:9999;display:none;max-width:min(420px,calc(100vw - 24px));background:#fef2f2;color:#7f1d1d;border:1px solid rgba(220,38,38,.35);box-shadow:0 16px 42px rgba(15,23,42,.22);border-radius:14px;padding:10px 12px;font-size:13px;font-weight:800;line-height:1.25;pointer-events:none;white-space:pre-line;}
      button.ce-v450-delete-blocked{background:#fee2e2!important;color:#991b1b!important;border-color:#fecaca!important;}
      button.ce-v450-delete-ok{box-shadow:0 0 0 1px rgba(22,163,74,.20) inset;}
      body.ce-role-gd #mtProductos input, body.ce-role-gd #mtProductos select, body.ce-role-gd #mtProductos button,
      body.ce-role-rw #mtProductos input, body.ce-role-rw #mtProductos select, body.ce-role-rw #mtProductos button,
      body.ce-role-gd #newProductoPrecio, body.ce-role-rw #newProductoPrecio{pointer-events:auto!important;opacity:1!important;filter:none!important;}
      body.ce-role-gd #mtProductos .ce-v225-ro-disabled, body.ce-role-rw #mtProductos .ce-v225-ro-disabled{pointer-events:auto!important;opacity:1!important;filter:none!important;}
    `;
    document.head.appendChild(style);
  }
  function tipEl(){
    let tip = $('ceV450DependencyTip');
    if(!tip){ tip = document.createElement('div'); tip.id = 'ceV450DependencyTip'; document.body.appendChild(tip); }
    return tip;
  }
  function placeTip(tip,el){
    const r = el.getBoundingClientRect();
    tip.style.display = 'block';
    tip.style.visibility = 'hidden';
    const tr = tip.getBoundingClientRect();
    let left = Math.min(Math.max(8, r.left), Math.max(8, window.innerWidth - tr.width - 8));
    let top = r.top - tr.height - 8;
    if(top < 8) top = r.bottom + 8;
    tip.style.left = `${Math.round(left)}px`;
    tip.style.top = `${Math.round(top)}px`;
    tip.style.visibility = 'visible';
  }
  function showTipFor(btn){
    if(!btn) return;
    const action = btn.dataset.action || '';
    let msg = '';
    if(action === 'delete-evento'){
      msg = isGD() ? 'Eliminar evento y sus datos dependientes. Se pedirá confirmación.' : EVENT_GD_MSG;
    }else if(/^delete-(persona|producto|tienda)$/.test(action)){
      const deps = dependencies(action, btn.dataset.id);
      msg = deps.length ? BLOCK_MSG : OK_MSG;
    }
    if(!msg) return;
    const tip = tipEl();
    tip.textContent = msg;
    const blocked = msg === BLOCK_MSG || msg === EVENT_GD_MSG;
    tip.style.background = blocked ? '#fef2f2' : '#ecfdf5';
    tip.style.color = blocked ? '#7f1d1d' : '#14532d';
    tip.style.borderColor = blocked ? 'rgba(220,38,38,.35)' : 'rgba(22,163,74,.35)';
    placeTip(tip, btn);
  }
  function hideTip(){ const tip = $('ceV450DependencyTip'); if(tip) tip.style.display = 'none'; }

  function applyProductPermissions(){
    const editable = canMaintain();
    try{ document.body.classList.toggle('ce-role-gd', isGD()); document.body.classList.toggle('ce-role-rw', isRW()); }catch(_){ }
    if(!editable) return;
    document.querySelectorAll('#mtProductos input,#mtProductos select,#mtProductos button,#newProductoPrecio').forEach(el => {
      el.disabled = false;
      el.readOnly = false;
      el.classList.remove('locked','ce-v225-ro-disabled');
      el.style.pointerEvents = 'auto';
      el.style.opacity = '1';
      el.style.filter = 'none';
      el.removeAttribute('aria-disabled');
    });
  }

  function markDeleteButtons(){
    ensureStyle();
    applyProductPermissions();
    document.querySelectorAll('button[data-action^="delete-"]').forEach(btn => {
      const action = btn.dataset.action || '';
      btn.classList.remove('ce-v450-delete-blocked','ce-v450-delete-ok');
      if(action === 'delete-evento'){
        const msg = isGD() ? 'Eliminar evento y sus datos dependientes. Se pedirá confirmación.' : EVENT_GD_MSG;
        btn.title = msg;
        btn.setAttribute('aria-label', msg);
        btn.classList.toggle('ce-v450-delete-blocked', !isGD());
        return;
      }
      if(!/^delete-(persona|producto|tienda)$/.test(action)) return;
      const blocked = hasDeps(action, btn.dataset.id);
      btn.classList.toggle('ce-v450-delete-blocked', blocked);
      btn.classList.toggle('ce-v450-delete-ok', !blocked);
      btn.title = blocked ? BLOCK_MSG : OK_MSG;
      btn.setAttribute('aria-label', blocked ? BLOCK_MSG : OK_MSG);
      if(canMaintain()){
        btn.disabled = false;
        btn.style.pointerEvents = 'auto';
        btn.style.opacity = '1';
      }
    });
  }
  let markTimer = null;
  function scheduleMark(){
    clearTimeout(markTimer);
    markTimer = setTimeout(markDeleteButtons, 60);
  }

  function blockEvent(ev,msg){
    try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ }
    if(msg) alert(msg);
    return false;
  }

  function saveProducto(btn, ev){
    if(!canMaintain()) return blockEvent(ev, 'No autorizado para modificar PRODUCTOS.');
    const id = btn.dataset.id;
    const p = productById(id);
    if(!p) return blockEvent(ev, 'No se encuentra el producto.');
    const nombre = norm(value('edit-producto-nombre', id));
    if(!nombre) return blockEvent(ev, 'El nombre del producto no puede estar vacío.');
    p.nombre = nombre;
    const seg = value('edit-producto-segmento', id); if(seg !== '') p.segmento = seg;
    const dest = value('edit-producto-destino', id); if(dest !== '') p.destino = dest;
    const priceVal = value('edit-producto-precio', id);
    if(priceVal !== ''){ const precio = parseEuro(priceVal); p.precio = precio; p.defaultPrecio = precio; }
    const tiendaVal = value('edit-producto-tienda', id);
    if(tiendaVal !== '') p.tiendaId = tiendaVal || '';
    try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ }
    save(); redraw(); scheduleMark();
    return false;
  }

  function deleteGeneral(kind, id){
    const s = st();
    if(kind === 'producto') s.productos = arr('productos').filter(p => !same(p.id, id));
    if(kind === 'persona') s.personas = arr('personas').filter(p => !same(p.id, id));
    if(kind === 'tienda') s.tiendas = arr('tiendas').filter(t => !same(t.id, id));
  }

  function deleteEvento(btn, ev){
    if(!isGD()) return blockEvent(ev, EVENT_GD_MSG);
    const eventId = btn.dataset.id || '';
    const event = eventById(eventId);
    if(!event) return blockEvent(ev, 'No se encuentra el evento.');
    const s = st();
    const ingresos = arr('colaboradores').filter(x => same(x.eventId, eventId));
    const compras = arr('compras').filter(x => same(x.eventId, eventId));
    const donaciones = compras.filter(x => /^DONADO/i.test(norm(x.ticketDonacion)));
    const comprasNoDon = compras.length - donaciones.length;
    const imgs = Object.keys(s.ticketImages || {}).filter(k => String(k).startsWith(`${eventId}|`));
    try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ }
    const msg = [
      'ATENCIÓN: baja definitiva de EVENTO.',
      '',
      `Evento: ${event.titulo || 'sin título'}`,
      '',
      'Se eliminará:',
      `• El propio evento.`,
      `• Ingresos/colaboradores del evento: ${ingresos.length}`,
      `• Compras/gastos del evento: ${comprasNoDon}`,
      `• Donaciones de producto del evento: ${donaciones.length}`,
      `• Imágenes de tickets del evento: ${imgs.length}`,
      '',
      'No se eliminarán PERSONAS, PRODUCTOS ni TIENDAS de las tablas generales.',
      '',
      'Esta operación no se puede deshacer salvo restaurando un BACKUP.',
      '',
      '¿Quieres continuar?'
    ].join('\n');
    if(!confirm(msg)) return false;
    if(!confirm(`Confirmación final: ¿eliminar definitivamente el evento "${event.titulo || ''}" y sus datos dependientes?`)) return false;
    s.eventos = arr('eventos').filter(e => !same(e.id, eventId));
    s.colaboradores = arr('colaboradores').filter(c => !same(c.eventId, eventId));
    s.compras = arr('compras').filter(c => !same(c.eventId, eventId));
    if(s.ticketImages) imgs.forEach(k => { delete s.ticketImages[k]; });
    if(s.selectedEventId && same(s.selectedEventId, eventId)) s.selectedEventId = s.eventos?.[0]?.id || '';
    save(); redraw(); scheduleMark();
    return false;
  }

  function handleDelete(btn, ev){
    const action = btn.dataset.action || '';
    const id = btn.dataset.id || '';
    if(action === 'delete-evento') return deleteEvento(btn, ev);
    const match = action.match(/^delete-(persona|producto|tienda)$/);
    if(!match) return;
    if(!canMaintain()) return blockEvent(ev, 'No autorizado para eliminar registros de mantenimiento.');
    if(hasDeps(action,id)) return blockEvent(ev, BLOCK_MSG);
    try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ }
    deleteGeneral(match[1], id);
    save(); redraw(); scheduleMark();
    return false;
  }

  window.addEventListener('click', function(ev){
    const btn = ev.target?.closest?.('button[data-action]');
    if(!btn) return;
    const action = btn.dataset.action || '';
    if(action === 'save-producto') return saveProducto(btn, ev);
    if(/^delete-(persona|producto|tienda|evento)$/.test(action)) return handleDelete(btn, ev);
  }, true);

  window.addEventListener('mouseover', ev => {
    const btn = ev.target?.closest?.('button[data-action^="delete-"]');
    if(btn) showTipFor(btn);
  }, true);
  window.addEventListener('mousemove', ev => {
    const btn = ev.target?.closest?.('button[data-action^="delete-"]');
    const tip = $('ceV450DependencyTip');
    if(btn && tip && tip.style.display !== 'none') placeTip(tip, btn);
  }, true);
  window.addEventListener('mouseout', ev => {
    const btn = ev.target?.closest?.('button[data-action^="delete-"]');
    if(btn && (!ev.relatedTarget || !btn.contains(ev.relatedTarget))) hideTip();
  }, true);
  window.addEventListener('focusin', ev => {
    const btn = ev.target?.closest?.('button[data-action^="delete-"]');
    if(btn) showTipFor(btn);
  }, true);
  window.addEventListener('focusout', ev => {
    const btn = ev.target?.closest?.('button[data-action^="delete-"]');
    if(btn) hideTip();
  }, true);

  function installRenderHooks(){
    try{
      const oldRender = typeof render === 'function' ? render : window.render;
      if(typeof oldRender === 'function' && !oldRender.__ceV450Maint){
        const wrapped = function(){
          const ret = oldRender.apply(this, arguments);
          scheduleMark(); setVersion();
          return ret;
        };
        wrapped.__ceV450Maint = true;
        try{ render = wrapped; }catch(_){ }
        window.render = wrapped;
      }
    }catch(_){ }
    try{
      const oldRenderProductos = typeof renderProductos === 'function' ? renderProductos : window.renderProductos;
      if(typeof oldRenderProductos === 'function' && !oldRenderProductos.__ceV450Maint){
        const wrapped = function(){
          const ret = oldRenderProductos.apply(this, arguments);
          scheduleMark();
          return ret;
        };
        wrapped.__ceV450Maint = true;
        try{ renderProductos = wrapped; }catch(_){ }
        window.renderProductos = wrapped;
      }
    }catch(_){ }
  }

  ensureStyle();
  installRenderHooks();
  setVersion();
  scheduleMark();
  ['DOMContentLoaded','load'].forEach(evt => window.addEventListener(evt, () => { setVersion(); scheduleMark(); setTimeout(scheduleMark, 500); }, false));
  document.addEventListener('click', () => setTimeout(scheduleMark, 120), false);
  try{
    const obs = new MutationObserver(() => scheduleMark());
    obs.observe(document.body || document.documentElement, {childList:true, subtree:true});
  }catch(_){ }
})();
