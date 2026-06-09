/* ControlEvent v8.5_prod - Documentos del evento (fase 1: menú, gestión y foto DOCXX).
   - Nueva pantalla "Documentos" con fecha, descripción y foto.
   - RW/GD pueden mantener en eventos En curso; RO visualiza y puede ampliar foto.
   - Las imágenes se codifican como EVENTO_ID|DOCXX, empezando en DOC01 por evento.
   - No toca todavía BACKUP ni INFOEVENTO. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v8.5_prod';
  const VERSION_FILE = 'ControlEvent_v8_5_prod';
  const INSTALLED = '__ceV85EventDocuments';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const TAB = 'documentos';
  const BUTTON_ID = 'tabDocumentosBtn';
  const PANEL_ID = 'tabDocumentos';
  const PANELS = ['tabIngresos','tabDonaciones','tabCompras','tabMapaProductos','tabPlanificacionInicial','tabResumen','tabGraficas','maintenanceWrapper','tabDocumentos'];
  const BUTTONS = ['tabIngresosBtn','tabDonacionesBtn','tabComprasBtn','tabMapaBtn','tabDocumentosBtn','tabResumenBtn','tabGraficasBtn'];

  const $ = id => document.getElementById(id);
  const safe = (fn, fallback) => { try{ const out = fn(); return out === undefined ? fallback : out; }catch(_){ return fallback; } };
  const getLexical = name => safe(() => Function('return (typeof '+name+' !== "undefined") ? '+name+' : undefined;')(), undefined);
  const setLexical = (name, value) => safe(() => Function('value', name + ' = value;')(value), undefined);
  const app = () => window.ControlEventApp || window.ControlEventRuntime?.app || null;
  const st = () => getLexical('state') || app()?.state || window.state || {};
  const auth = () => getLexical('authUser') || window.authUser || app()?.authUser || null;
  const arr = key => Array.isArray(st()[key]) ? st()[key] : [];
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  const norm = value => String(value ?? '').normalize('NFC').replace(/\s+/g,' ').trim();
  const cssEscape = value => (window.CSS && typeof window.CSS.escape === 'function') ? window.CSS.escape(String(value)) : String(value).replace(/[^a-zA-Z0-9_-]/g, ch => '\\' + ch);
  const role = () => String(auth()?.nivel || '').toUpperCase();
  const canSee = () => ['RO','RW','GD'].includes(role());
  const canWrite = () => ['RW','GD'].includes(role());
  const selectedEventId = () => String(st().selectedEventId || $('selectedEvent')?.value || '');
  const selectedEvent = () => arr('eventos').find(e => String(e?.id || '') === selectedEventId()) || null;
  const isFinalized = () => String(selectedEvent()?.situacion || 'En curso').toLowerCase() === 'finalizado';
  const canMaintainDocs = () => canWrite() && !!selectedEvent() && !isFinalized();
  const currentTab = () => String(getLexical('currentMainTab') || app()?.navigation?.currentMainTab || 'ingresos');
  const docKey = (eventId, code) => `${String(eventId || '').trim()}|${String(code || '').trim().toUpperCase()}`;
  const docCode = value => {
    const m = String(value || '').toUpperCase().match(/DOC\s*(\d+)/);
    return m ? 'DOC' + String(Number(m[1])).padStart(2,'0') : '';
  };

  function ensureStateShape(){
    const s = st();
    if(!Array.isArray(s.eventDocuments)) s.eventDocuments = [];
    if(!s.ticketImages || typeof s.ticketImages !== 'object') s.ticketImages = {};
    return s;
  }

  function docsForEvent(eventId = selectedEventId()){
    const s = ensureStateShape();
    const id = String(eventId || '');
    const docs = s.eventDocuments
      .filter(doc => String(doc?.eventId || '') === id)
      .map(doc => ({...doc, codigo: docCode(doc.codigo || doc.imageKey) || String(doc.codigo || doc.imageKey || '').toUpperCase()}));
    const seen = new Set(docs.map(doc => doc.codigo));
    Object.keys(s.ticketImages || {}).forEach(key => {
      if(!key.startsWith(id + '|')) return;
      const code = docCode(key.split('|').slice(1).join('|'));
      if(!code || seen.has(code)) return;
      seen.add(code);
      docs.push({
        id: `${id}|${code}`,
        eventId: id,
        codigo: code,
        fecha: '',
        descripcion: 'Documento recuperado desde fotos del evento',
        imageKey: code,
        imageUrl: s.ticketImages[key] || '',
        recovered: true
      });
    });
    return docs.sort((a,b) => {
      const na = Number(String(a.codigo || '').replace(/\D/g,'')) || 0;
      const nb = Number(String(b.codigo || '').replace(/\D/g,'')) || 0;
      if(na !== nb) return na - nb;
      return String(a.fecha || '').localeCompare(String(b.fecha || ''));
    });
  }

  function nextDocCode(eventId = selectedEventId()){
    let max = 0;
    docsForEvent(eventId).forEach(doc => {
      const n = Number(String(doc.codigo || '').replace(/\D/g,'')) || 0;
      if(n > max) max = n;
    });
    return 'DOC' + String(max + 1).padStart(2, '0');
  }

  function findDoc(docId){
    const s = ensureStateShape();
    return s.eventDocuments.find(doc => String(doc.id || '') === String(docId || '')) || null;
  }

  function imageFor(doc){
    const s = ensureStateShape();
    const key = docKey(doc.eventId, doc.codigo || doc.imageKey);
    return s.ticketImages[key] || doc.imageUrl || '';
  }

  function todayIso(){
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function formatDate(value){
    const raw = String(value || '').trim();
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(m) return `${m[3]}/${m[2]}/${m[1]}`;
    return raw || 'Sin fecha';
  }

  function status(message, kind = ''){
    const box = $('eventDocsStatus');
    if(!box) return;
    box.textContent = message || '';
    box.className = 'ce-docs-status' + (kind ? ' ' + kind : '') + (message ? '' : ' hidden');
    if(message) window.setTimeout(() => { if(box.textContent === message){ box.textContent=''; box.className='ce-docs-status hidden'; } }, 4200);
  }

  function saveNow(){
    const s = ensureStateShape();
    safe(() => localStorage.setItem(getLexical('STORAGE_KEY') || 'controlevent_v6_4', JSON.stringify(s)), null);
    const fn = getLexical('saveState') || window.saveState || app()?.actions?.saveState;
    if(typeof fn === 'function') safe(() => fn(), null);
  }

  function renderVisibility(){
    const panel = $(PANEL_ID);
    const active = currentTab() === TAB;
    const hasEvent = !!selectedEvent();
    if(panel){
      panel.classList.toggle('hidden', !active || !hasEvent || !canSee());
      panel.setAttribute('aria-hidden', (!active || !hasEvent || !canSee()) ? 'true' : 'false');
    }
    if(active){
      BUTTONS.forEach(id => {
        const otherBtn = $(id);
        if(otherBtn) otherBtn.classList.toggle('active', id === BUTTON_ID);
      });
    } else {
      const docBtn = $(BUTTON_ID);
      if(docBtn) docBtn.classList.remove('active');
    }
    const btn = $(BUTTON_ID);
    if(btn){
      const visible = canSee();
      btn.classList.toggle('hidden-by-role-v85', !visible);
      btn.style.display = visible ? '' : 'none';
      btn.setAttribute('aria-hidden', visible ? 'false' : 'true');
      btn.disabled = !visible;
    }
    document.querySelectorAll('.mobile-menu-action[data-target="tabDocumentosBtn"]').forEach(el => {
      const visible = canSee();
      el.classList.toggle('primary', !!active);
      el.style.display = visible ? '' : 'none';
      el.disabled = !visible;
      el.setAttribute('aria-hidden', visible ? 'false' : 'true');
    });
    if(active && hasEvent && canSee()) renderEventDocuments();
  }

  function applyVersion(){
    safe(() => { document.title = VERSION; }, null);
    safe(() => { window.__ceVersion = VERSION; window.VERSION = VERSION; window.VERSION_FILE = VERSION_FILE; window.ControlEventVersion = {version: VERSION, versionFile: VERSION_FILE}; }, null);
    document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => {
      if(/ControlEvent\s+v[0-9][0-9A-Za-z._\/-]*/i.test(el.textContent || '')) el.textContent = VERSION;
    });
  }

  function renderWritePanel(){
    const wrap = $('eventDocsWritePanel');
    if(!wrap) return;
    const ev = selectedEvent();
    if(!ev){ wrap.innerHTML = ''; return; }
    if(role() === 'RO'){
      wrap.innerHTML = '<div class="ce-docs-note">Modo consulta: puedes visualizar y ampliar los documentos, pero no añadir, modificar ni eliminar.</div>';
      return;
    }
    if(!canWrite()){
      wrap.innerHTML = '<div class="ce-docs-note warn">Sin permisos de mantenimiento para documentos.</div>';
      return;
    }
    if(isFinalized()){
      wrap.innerHTML = '<div class="ce-docs-note warn">Evento Finalizado: los documentos quedan en modo consulta. Para modificar, cambia primero la situación del evento si procede.</div>';
      return;
    }
    wrap.innerHTML = `
      <div class="ce-docs-form entry-zone">
        <div class="field"><label>Fecha</label><input id="eventDocNewFecha" type="date" value="${esc(todayIso())}" /></div>
        <div class="field ce-docs-form-desc"><label>Texto descriptivo</label><textarea id="eventDocNewDescripcion" rows="2" placeholder="Ej. Solicitud presentada al Ayuntamiento, permiso de ocupación, seguro, autorización..."></textarea></div>
        <div class="field"><label>Foto/documento</label><input id="eventDocNewFile" type="file" accept="image/*" /></div>
        <div class="field"><label>&nbsp;</label><button type="button" id="btnAddEventDoc">Añadir DOC</button></div>
      </div>`;
  }

  function renderEventDocuments(){
    ensureStateShape();
    applyVersion();
    renderWritePanel();
    const list = $('eventDocsList');
    if(!list) return;
    const eventId = selectedEventId();
    if(!eventId || !selectedEvent()){
      list.innerHTML = '<div class="empty">Selecciona un evento para consultar sus documentos.</div>';
      return;
    }
    const docs = docsForEvent(eventId);
    if(!docs.length){
      list.innerHTML = '<div class="empty">Todavía no hay documentos para este evento.</div>';
      return;
    }
    const editable = canMaintainDocs();
    list.innerHTML = docs.map(doc => {
      const img = imageFor(doc);
      const disabled = editable && !doc.recovered ? '' : 'disabled';
      const readonlyText = editable && !doc.recovered ? '' : 'readonly';
      const code = esc(doc.codigo || 'DOC');
      const id = esc(doc.id || `${doc.eventId}|${doc.codigo}`);
      const thumb = img
        ? `<button type="button" class="ce-doc-thumb-btn" data-doc-open="${id}" title="Ampliar ${code}"><img class="ce-doc-thumb" src="${esc(img)}" alt="${code}" loading="lazy" /></button>`
        : '<div class="ce-doc-noimage">Sin foto</div>';
      const actions = editable && !doc.recovered ? `
          <button type="button" class="outline small" data-doc-replace="${id}">📎 Reemplazar foto</button>
          ${img ? `<button type="button" class="outline small" data-doc-remove-image="${id}">🗑️ Eliminar foto</button>` : ''}
          <button type="button" class="modify small" data-doc-save="${id}">Modificar</button>
          <button type="button" class="danger small" data-doc-delete="${id}">Eliminar DOC</button>
          <input class="ce-doc-file-input" type="file" accept="image/*" data-doc-upload-input="${id}" />`
        : (doc.recovered ? '<span class="readonly-note">Recuperado desde foto; añade metadatos creando de nuevo si necesitas editarlo.</span>' : '<span class="readonly-note">Solo lectura</span>');
      return `
        <div class="itemcard ce-doc-item" data-doc-id="${id}">
          <div class="ce-doc-item-grid">
            <div class="ce-doc-media">${thumb}</div>
            <div class="ce-doc-data">
              <div class="ce-doc-head"><span class="ce-doc-code">${code}</span><span class="ce-doc-date-label">${esc(formatDate(doc.fecha))}</span></div>
              <div class="ce-doc-fields">
                <div class="field"><label>Fecha</label><input type="date" value="${esc(doc.fecha || '')}" data-doc-field="fecha" data-doc-id="${id}" ${disabled} /></div>
                <div class="field ce-doc-desc-field"><label>Texto descriptivo</label><textarea rows="2" data-doc-field="descripcion" data-doc-id="${id}" ${readonlyText} ${disabled}>${esc(doc.descripcion || '')}</textarea></div>
              </div>
              <div class="ce-doc-actions">${actions}</div>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  function setCurrentTab(value){
    setLexical('currentMainTab', value);
    safe(() => { if(app()?.navigation) app().navigation.currentMainTab = value; }, null);
    window.__ceCurrentMainTab = value;
  }

  function openDocuments(){
    if(!canSee()) return;
    setCurrentTab(TAB);
    PANELS.forEach(id => {
      const el = $(id);
      if(!el) return;
      const shouldShow = id === PANEL_ID && !!selectedEvent();
      el.classList.toggle('hidden', !shouldShow);
      if(shouldShow) el.removeAttribute('aria-hidden');
    });
    BUTTONS.forEach(id => $(id)?.classList.toggle('active', id === BUTTON_ID));
    document.querySelectorAll('.mobile-menu-action[data-target]').forEach(el => el.classList.toggle('primary', el.dataset.target === BUTTON_ID));
    renderEventDocuments();
    safe(() => document.body.classList.remove('mobile-drawer-open'), null);
  }

  function closeDocumentsIfOtherTab(){
    if(currentTab() !== TAB){
      const panel = $(PANEL_ID);
      if(panel) panel.classList.add('hidden');
      $(BUTTON_ID)?.classList.remove('active');
      document.querySelectorAll('.mobile-menu-action[data-target="tabDocumentosBtn"]').forEach(el => el.classList.remove('primary'));
    }
  }

  async function fileToCompressedDataUrl(file){
    if(!file) throw new Error('Selecciona una imagen.');
    if(!/^image\//i.test(file.type || '')) throw new Error('El archivo debe ser una imagen.');
    const original = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(String(e.target.result || ''));
      reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      reader.readAsDataURL(file);
    });
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('No se pudo procesar la imagen.'));
      image.src = original;
    });
    const maxSide = 1500;
    let width = img.width || maxSide;
    let height = img.height || maxSide;
    const ratio = Math.min(maxSide / width, maxSide / height, 1);
    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0,width,height);
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.84);
  }

  async function uploadDocumentImage(eventId, code, dataUrl){
    const payload = {eventId, key: code, dataUrl};
    const res = await fetch('/api/ticket-images', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if(!res.ok){
      const text = await res.text().catch(() => '');
      throw new Error(text || ('HTTP ' + res.status + ' subiendo imagen'));
    }
    const json = await res.json().catch(() => ({}));
    return json?.image || json || {};
  }

  async function deleteDocumentImage(eventId, code){
    const res = await fetch('/api/ticket-images', {
      method: 'DELETE',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({eventId, key: code})
    });
    if(!res.ok){
      const text = await res.text().catch(() => '');
      throw new Error(text || ('HTTP ' + res.status + ' eliminando imagen'));
    }
    return res.json().catch(() => ({ok:true}));
  }

  async function addDocument(){
    if(!canMaintainDocs()){
      alert(isFinalized() ? 'Evento Finalizado: los documentos están en modo consulta.' : 'No tienes permisos para añadir documentos.');
      return;
    }
    const eventId = selectedEventId();
    const fecha = $('eventDocNewFecha')?.value || todayIso();
    const descripcion = norm($('eventDocNewDescripcion')?.value || '');
    const file = $('eventDocNewFile')?.files?.[0] || null;
    if(!descripcion){ alert('Introduce un texto descriptivo.'); return; }
    if(!file){ alert('Adjunta una foto del documento.'); return; }
    const code = nextDocCode(eventId);
    status('Preparando ' + code + '...', 'working');
    let dataUrl = await fileToCompressedDataUrl(file);
    let imageUrl = dataUrl;
    try{
      const uploaded = await uploadDocumentImage(eventId, code, dataUrl);
      imageUrl = uploaded.url || uploaded.public_url || uploaded.pathname || uploaded.path || dataUrl;
      dataUrl = imageUrl;
    }catch(error){
      console.warn('[ControlEvent v8.5_prod] No se pudo subir DOC ahora, queda en estado local/protegido:', error?.message || error);
      status('No se pudo subir al servidor ahora. Queda guardado localmente y se intentará sincronizar al guardar.', 'warn');
    }
    const s = ensureStateShape();
    const id = `${eventId}|${code}`;
    s.ticketImages[docKey(eventId, code)] = dataUrl;
    s.eventDocuments.push({
      id,
      eventId,
      codigo: code,
      imageKey: code,
      imageUrl,
      fecha,
      descripcion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    saveNow();
    renderEventDocuments();
    status(code + ' añadido correctamente.', 'ok');
  }

  async function replaceImage(docId, file){
    const doc = findDoc(docId);
    if(!doc || !canMaintainDocs()) return;
    if(!file) return;
    const code = docCode(doc.codigo || doc.imageKey);
    status('Actualizando foto de ' + code + '...', 'working');
    let dataUrl = await fileToCompressedDataUrl(file);
    let imageUrl = dataUrl;
    try{
      const uploaded = await uploadDocumentImage(doc.eventId, code, dataUrl);
      imageUrl = uploaded.url || uploaded.public_url || uploaded.pathname || uploaded.path || dataUrl;
      dataUrl = imageUrl;
    }catch(error){
      console.warn('[ControlEvent v8.5_prod] No se pudo subir DOC ahora, queda local:', error?.message || error);
      status('No se pudo subir al servidor ahora. Queda guardado localmente y se intentará sincronizar al guardar.', 'warn');
    }
    const s = ensureStateShape();
    s.ticketImages[docKey(doc.eventId, code)] = dataUrl;
    doc.imageUrl = imageUrl;
    doc.imageKey = code;
    doc.updatedAt = new Date().toISOString();
    saveNow();
    renderEventDocuments();
    status('Foto de ' + code + ' actualizada.', 'ok');
  }

  async function removeImage(docId){
    const doc = findDoc(docId);
    if(!doc || !canMaintainDocs()) return;
    const code = docCode(doc.codigo || doc.imageKey);
    if(!confirm('¿Eliminar solo la foto de ' + code + '? Se mantiene la ficha del documento.')) return;
    status('Eliminando foto de ' + code + '...', 'working');
    await deleteDocumentImage(doc.eventId, code).catch(error => {
      console.warn('[ControlEvent v8.5_prod] No se pudo eliminar imagen en servidor:', error?.message || error);
      throw error;
    });
    const s = ensureStateShape();
    delete s.ticketImages[docKey(doc.eventId, code)];
    doc.imageUrl = '';
    doc.updatedAt = new Date().toISOString();
    saveNow();
    renderEventDocuments();
    status('Foto de ' + code + ' eliminada.', 'ok');
  }

  async function deleteDoc(docId){
    const doc = findDoc(docId);
    if(!doc || !canMaintainDocs()) return;
    const code = docCode(doc.codigo || doc.imageKey);
    if(!confirm('¿Eliminar definitivamente ' + code + ' y su foto?')) return;
    status('Eliminando ' + code + '...', 'working');
    if(imageFor(doc)){
      await deleteDocumentImage(doc.eventId, code).catch(error => {
        console.warn('[ControlEvent v8.5_prod] No se pudo eliminar imagen en servidor:', error?.message || error);
        throw error;
      });
    }
    const s = ensureStateShape();
    delete s.ticketImages[docKey(doc.eventId, code)];
    s.eventDocuments = s.eventDocuments.filter(item => String(item.id || '') !== String(docId));
    saveNow();
    renderEventDocuments();
    status(code + ' eliminado.', 'ok');
  }

  function saveDoc(docId){
    const doc = findDoc(docId);
    if(!doc || !canMaintainDocs()) return;
    const fields = document.querySelectorAll(`[data-doc-id="${cssEscape(docId)}"][data-doc-field]`);
    fields.forEach(el => {
      const field = el.dataset.docField;
      if(field === 'fecha') doc.fecha = el.value || '';
      if(field === 'descripcion') doc.descripcion = norm(el.value || '');
    });
    if(!doc.descripcion){ alert('El texto descriptivo no puede quedar vacío.'); return; }
    doc.updatedAt = new Date().toISOString();
    saveNow();
    renderEventDocuments();
    status((doc.codigo || 'DOC') + ' modificado.', 'ok');
  }

  function ensureModal(){
    let modal = $('ceDocModalV85');
    if(modal) return modal;
    modal = document.createElement('div');
    modal.id = 'ceDocModalV85';
    modal.className = 'ce-doc-modal-v85';
    modal.innerHTML = `
      <div class="ce-doc-modal-box-v85">
        <button type="button" class="ce-doc-modal-close-v85" aria-label="Cerrar">×</button>
        <div class="ce-doc-modal-info-v85"></div>
        <div class="ce-doc-modal-imgwrap-v85"><img alt="Documento del evento" /></div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', event => { if(event.target === modal || event.target.closest('.ce-doc-modal-close-v85')) closeModal(); });
    document.addEventListener('keydown', event => { if(event.key === 'Escape') closeModal(); });
    return modal;
  }

  function openModal(docId){
    const doc = findDoc(docId) || docsForEvent().find(item => String(item.id || '') === String(docId));
    if(!doc) return;
    const src = imageFor(doc);
    if(!src) return;
    const modal = ensureModal();
    modal.querySelector('img').src = src;
    modal.querySelector('.ce-doc-modal-info-v85').innerHTML = `<strong>${esc(doc.codigo || 'DOC')}</strong><span>${esc(formatDate(doc.fecha))}</span><p>${esc(doc.descripcion || '')}</p>`;
    modal.classList.add('visible');
    document.body.classList.add('ce-doc-modal-open-v85');
  }

  function closeModal(){
    const modal = $('ceDocModalV85');
    if(!modal) return;
    modal.classList.remove('visible');
    const img = modal.querySelector('img');
    if(img) img.removeAttribute('src');
    document.body.classList.remove('ce-doc-modal-open-v85');
  }

  function ensureMobileButton(){
    const drawer = $('ceMobileDrawer');
    if(!drawer) return;
    if(drawer.querySelector('.mobile-menu-action[data-target="tabDocumentosBtn"]')) return;
    const grid = drawer.querySelector('.mobile-menu-section .mobile-menu-grid');
    if(!grid) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mobile-menu-action';
    btn.dataset.target = BUTTON_ID;
    btn.innerHTML = '<span class="mi">📁</span>Documentos';
    const resumen = grid.querySelector('.mobile-menu-action[data-target="tabResumenBtn"]');
    if(resumen) grid.insertBefore(btn, resumen); else grid.appendChild(btn);
  }

  function patchRenderTabVisibility(){
    const old = getLexical('renderTabVisibility') || window.renderTabVisibility;
    if(typeof old !== 'function' || old.__ceV85DocsWrapped) return;
    const wrapped = function(){
      const ret = old.apply(this, arguments);
      safe(() => {
        const active = currentTab() === TAB;
        const panel = $(PANEL_ID);
        if(panel) panel.classList.toggle('hidden', !active || !selectedEvent() || !canSee());
        $(BUTTON_ID)?.classList.toggle('active', active);
      }, null);
      return ret;
    };
    wrapped.__ceV85DocsWrapped = true;
    setLexical('renderTabVisibility', wrapped);
    window.renderTabVisibility = wrapped;
  }

  function patchRender(){
    const old = getLexical('render') || window.render;
    if(typeof old !== 'function' || old.__ceV85DocsWrapped) return;
    const wrapped = function(){
      const ret = old.apply(this, arguments);
      [0,80,240].forEach(ms => setTimeout(() => { ensureMobileButton(); renderVisibility(); applyVersion(); }, ms));
      return ret;
    };
    wrapped.__ceV85DocsWrapped = true;
    setLexical('render', wrapped);
    window.render = wrapped;
  }

  function patchRoleStyles(){
    document.body?.classList.toggle('ce-docs-role-ro-v85', role() === 'RO');
    document.body?.classList.toggle('ce-docs-role-rw-v85', role() === 'RW');
    document.body?.classList.toggle('ce-docs-role-gd-v85', role() === 'GD');
  }

  function handleClick(event){
    const target = event.target;
    if(!target?.closest) return;
    if(target.closest('#tabDocumentosBtn,.mobile-menu-action[data-target="tabDocumentosBtn"]')){
      event.preventDefault(); event.stopPropagation(); if(event.stopImmediatePropagation) event.stopImmediatePropagation();
      openDocuments();
      return false;
    }
    if(target.closest('#btnAddEventDoc')){
      event.preventDefault(); event.stopPropagation(); if(event.stopImmediatePropagation) event.stopImmediatePropagation();
      addDocument().catch(error => { console.error(error); alert('No se pudo añadir el documento: ' + (error?.message || error)); status('Error añadiendo documento.', 'bad'); });
      return false;
    }
    const open = target.closest('[data-doc-open]');
    if(open){ event.preventDefault(); openModal(open.dataset.docOpen); return false; }
    const repl = target.closest('[data-doc-replace]');
    if(repl){ event.preventDefault(); const input = document.querySelector(`input[data-doc-upload-input="${cssEscape(repl.dataset.docReplace)}"]`); input?.click(); return false; }
    const remImg = target.closest('[data-doc-remove-image]');
    if(remImg){ event.preventDefault(); event.stopPropagation(); removeImage(remImg.dataset.docRemoveImage).catch(error => { alert('No se pudo eliminar la foto: ' + (error?.message || error)); status('Error eliminando foto.', 'bad'); }); return false; }
    const save = target.closest('[data-doc-save]');
    if(save){ event.preventDefault(); event.stopPropagation(); saveDoc(save.dataset.docSave); return false; }
    const del = target.closest('[data-doc-delete]');
    if(del){ event.preventDefault(); event.stopPropagation(); deleteDoc(del.dataset.docDelete).catch(error => { alert('No se pudo eliminar el documento: ' + (error?.message || error)); status('Error eliminando documento.', 'bad'); }); return false; }
    if(target.closest('#tabIngresosBtn,#tabDonacionesBtn,#tabComprasBtn,#tabMapaBtn,#tabResumenBtn,#tabGraficasBtn,.mobile-menu-action[data-target="tabIngresosBtn"],.mobile-menu-action[data-target="tabDonacionesBtn"],.mobile-menu-action[data-target="tabComprasBtn"],.mobile-menu-action[data-target="tabMapaBtn"],.mobile-menu-action[data-target="tabResumenBtn"],.mobile-menu-action[data-target="tabGraficasBtn"]')){
      setTimeout(closeDocumentsIfOtherTab, 0);
      setTimeout(renderVisibility, 120);
    }
  }

  function handleChange(event){
    const target = event.target;
    if(!target) return;
    if(target.matches?.('input[data-doc-upload-input]')){
      const id = target.dataset.docUploadInput;
      const file = target.files?.[0] || null;
      replaceImage(id, file).catch(error => { alert('No se pudo reemplazar la foto: ' + (error?.message || error)); status('Error actualizando foto.', 'bad'); });
      return;
    }
    if(target.id === 'selectedEvent'){
      [60,220,700].forEach(ms => setTimeout(() => { if(currentTab() === TAB) renderEventDocuments(); else renderVisibility(); }, ms));
    }
  }

  function injectStyle(){
    if($('ceDocsStyleV85')) return;
    const style = document.createElement('style');
    style.id = 'ceDocsStyleV85';
    style.textContent = `
      #mainTabs.tabs{grid-template-columns:repeat(auto-fit,minmax(64px,1fr))!important;}
      #tabDocumentosBtn .tabicon{font-size:44px;line-height:1}
      .ce-docs-card{background:linear-gradient(180deg,#ffffff 0%,#f8fafc 100%)}
      .ce-docs-form{display:grid;grid-template-columns:minmax(140px,.6fr) minmax(240px,1.6fr) minmax(190px,1fr) auto;gap:10px;align-items:end}
      .ce-docs-form-desc textarea{min-height:58px;resize:vertical}
      .ce-docs-status{margin:0 0 12px 0;padding:10px 12px;border-radius:14px;background:#f8fafc;border:1px solid var(--border);font-weight:800;font-size:13px;color:#334155;white-space:pre-wrap}
      .ce-docs-status.ok{background:#ecfdf5;border-color:#bbf7d0;color:#047857}.ce-docs-status.bad{background:#fef2f2;border-color:#fecaca;color:#b91c1c}.ce-docs-status.warn{background:#fffbeb;border-color:#fde68a;color:#92400e}.ce-docs-status.working{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}
      .ce-docs-note{padding:10px 12px;border-radius:14px;background:#f8fafc;border:1px solid var(--border);font-size:13px;font-weight:800;color:#334155}.ce-docs-note.warn{background:#fffbeb;border-color:#fde68a;color:#92400e}
      .ce-docs-list{display:grid;gap:12px}.ce-doc-item{border:1px solid #dbe8f5;background:#fff}.ce-doc-item-grid{display:grid;grid-template-columns:150px 1fr;gap:14px;align-items:start}
      .ce-doc-media{display:flex;align-items:center;justify-content:center;min-height:112px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:18px;overflow:hidden}.ce-doc-thumb-btn{border:0;background:transparent;padding:0;cursor:zoom-in}.ce-doc-thumb{display:block;width:138px;height:104px;object-fit:cover;border-radius:14px;border:1px solid #dbe2ea;box-shadow:0 6px 20px rgba(15,23,42,.12)}.ce-doc-noimage{font-size:12px;color:#64748b;font-weight:900}
      .ce-doc-head{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:8px}.ce-doc-code{display:inline-flex;align-items:center;justify-content:center;min-width:68px;border-radius:999px;background:#111827;color:#fff;padding:6px 10px;font-weight:950;letter-spacing:.04em}.ce-doc-date-label{font-size:12px;color:#64748b;font-weight:900;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:999px;padding:5px 9px}
      .ce-doc-fields{display:grid;grid-template-columns:minmax(130px,.55fr) minmax(260px,1.8fr);gap:10px}.ce-doc-desc-field textarea{min-height:58px;resize:vertical}.ce-doc-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;align-items:center}.ce-doc-file-input{display:none!important}
      .ce-doc-modal-v85{position:fixed;inset:0;z-index:5600;background:rgba(15,23,42,.68);display:none;align-items:center;justify-content:center;padding:18px}.ce-doc-modal-v85.visible{display:flex}.ce-doc-modal-box-v85{position:relative;width:min(1180px,96vw);max-height:94vh;background:#fff;border-radius:22px;border:1px solid rgba(15,23,42,.18);box-shadow:0 24px 80px rgba(0,0,0,.36);padding:16px;display:grid;grid-template-columns:minmax(230px,.55fr) minmax(320px,1.45fr);gap:16px;align-items:start}.ce-doc-modal-close-v85{position:absolute;right:10px;top:8px;background:#111827!important;color:#fff!important;border-radius:999px!important;width:38px;height:38px;padding:0!important;font-size:24px;line-height:1}.ce-doc-modal-info-v85{background:#f8fafc;border:1px solid #dbe2ea;border-radius:16px;padding:12px;max-height:84vh;overflow:auto}.ce-doc-modal-info-v85 strong{display:block;font-size:20px;margin-bottom:4px}.ce-doc-modal-info-v85 span{display:inline-block;margin-bottom:10px;color:#64748b;font-weight:900}.ce-doc-modal-info-v85 p{white-space:pre-wrap;line-height:1.35;margin:0}.ce-doc-modal-imgwrap-v85{max-height:86vh;overflow:auto;display:flex;align-items:flex-start;justify-content:center}.ce-doc-modal-imgwrap-v85 img{max-width:100%;height:auto;border-radius:14px;border:1px solid #dbe2ea;box-shadow:0 10px 34px rgba(15,23,42,.18)}
      body.ce-docs-role-ro-v85 #mainTabs.tabs,body.ce-role-ro-v505 #mainTabs.tabs,body.ce-role-ro-v507 #mainTabs.tabs,body.ce-role-ro-v508 #mainTabs.tabs{grid-template-columns:repeat(4,48px)!important;justify-content:center!important;justify-items:center!important;gap:10px!important;}
      body.ce-docs-role-ro-v85 #tabResumenBtn,body.ce-role-ro-v505 #tabResumenBtn,body.ce-role-ro-v507 #tabResumenBtn,body.ce-role-ro-v508 #tabResumenBtn{order:1!important}body.ce-docs-role-ro-v85 #tabMapaBtn,body.ce-role-ro-v505 #tabMapaBtn,body.ce-role-ro-v507 #tabMapaBtn,body.ce-role-ro-v508 #tabMapaBtn{order:2!important}body.ce-docs-role-ro-v85 #tabDocumentosBtn,body.ce-role-ro-v505 #tabDocumentosBtn,body.ce-role-ro-v507 #tabDocumentosBtn,body.ce-role-ro-v508 #tabDocumentosBtn{order:3!important;display:inline-flex!important;visibility:visible!important;pointer-events:auto!important}body.ce-docs-role-ro-v85 #tabGraficasBtn,body.ce-role-ro-v505 #tabGraficasBtn,body.ce-role-ro-v507 #tabGraficasBtn,body.ce-role-ro-v508 #tabGraficasBtn{order:4!important}
      @media(max-width:900px){.ce-docs-form,.ce-doc-fields,.ce-doc-item-grid{grid-template-columns:1fr!important}.ce-doc-media{justify-content:flex-start;padding:8px}.ce-doc-thumb{width:150px;height:112px}.ce-doc-modal-v85{padding:8px}.ce-doc-modal-box-v85{grid-template-columns:1fr;width:98vw;max-height:94vh;overflow:auto;padding:12px}.ce-doc-modal-info-v85,.ce-doc-modal-imgwrap-v85{max-height:none}.ce-doc-modal-imgwrap-v85 img{width:100%;}body.ce-docs-role-ro-v85 #mainTabs.tabs,body.ce-role-ro-v505 #mainTabs.tabs,body.ce-role-ro-v507 #mainTabs.tabs,body.ce-role-ro-v508 #mainTabs.tabs{grid-template-columns:repeat(4,42px)!important;gap:8px!important}}
    `;
    document.head.appendChild(style);
  }

  function install(){
    injectStyle();
    ensureStateShape();
    ensureMobileButton();
    patchRenderTabVisibility();
    patchRender();
    patchRoleStyles();
    applyVersion();
    renderVisibility();
  }

  document.addEventListener('click', handleClick, true);
  document.addEventListener('change', handleChange, true);
  ['controlevent:app-ready','controlevent:runtime-ready','controlevent:modules-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 80)));
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true}); else install();
  [160,700,1600].forEach(ms => setTimeout(install, ms));

  window.ControlEventDocumentsV85 = {
    version: VERSION,
    versionFile: VERSION_FILE,
    install,
    render: renderEventDocuments,
    open: openDocuments,
    list: docsForEvent,
    nextCode: nextDocCode,
    openModal,
    closeModal
  };
})();
