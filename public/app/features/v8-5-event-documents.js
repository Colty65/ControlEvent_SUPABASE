/* ControlEvent v9.4_prod - Documentos del evento (fase 1: menú, gestión y foto DOCXX).
   - Nueva pantalla "Documentos" con fecha, descripción y foto.
   - RW/GD pueden mantener en eventos En curso; RO visualiza y puede ampliar foto.
   - Las imágenes se codifican como EVENTO_ID|DOCXX, empezando en DOC01 por evento.
   - No toca todavía BACKUP ni INFOEVENTO. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v9.4_prod';
  const VERSION_FILE = 'ControlEvent_v9_4_prod';
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
  const safeDomId = value => String(value || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const role = () => String(auth()?.nivel || '').toUpperCase();
  const canSee = () => ['RO','RW','GD'].includes(role());
  const canWrite = () => ['RW','GD'].includes(role());
  const selectedEventId = () => String(st().selectedEventId || $('selectedEvent')?.value || '');
  const selectedEvent = () => arr('eventos').find(e => String(e?.id || '') === selectedEventId()) || null;
  const isFinalized = () => String(selectedEvent()?.situacion || 'En curso').toLowerCase() === 'finalizado';
  const canMaintainDocs = () => canWrite() && !!selectedEvent() && !isFinalized();
  const currentTab = () => {
    // v8.5.3: DOCUMENTOS queda bloqueado como pestaña activa hasta que el usuario pulse otra pestaña.
    // Varios parches legacy repintan INGRESOS/RESUMEN y pisan currentMainTab sin ser una acción real del usuario.
    if(window.__ceDocsForceActiveV85 === true) return TAB;
    const memorized = String(safe(() => window.__ceCurrentMainTab || '', '') || '');
    const appTab = String(safe(() => app()?.navigation?.currentMainTab || '', '') || '');
    const lexical = String(getLexical('currentMainTab') || '');
    if(memorized === TAB || appTab === TAB || lexical === TAB) return TAB;
    return lexical || appTab || memorized || 'ingresos';
  };
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
    const dmy = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
    if(dmy){
      const year = dmy[3].length === 2 ? '20' + dmy[3] : dmy[3];
      return `${String(Number(dmy[1])).padStart(2,'0')}/${String(Number(dmy[2])).padStart(2,'0')}/${year}`;
    }
    return raw || 'Sin fecha';
  }

  function parseDateForStorage(value){
    const raw = String(value || '').trim();
    if(!raw) return '';
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(iso) return raw;
    const dmy = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
    if(dmy){
      const year = dmy[3].length === 2 ? '20' + dmy[3] : dmy[3];
      const month = String(Number(dmy[2])).padStart(2,'0');
      const day = String(Number(dmy[1])).padStart(2,'0');
      if(Number(month) >= 1 && Number(month) <= 12 && Number(day) >= 1 && Number(day) <= 31) return `${year}-${month}-${day}`;
    }
    return raw;
  }

  function todayDisplay(){ return formatDate(todayIso()); }

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

  function ensureDocumentPanelPlacement(){
    const panel = $(PANEL_ID);
    const main = document.querySelector('.app .main') || $('mainTabs')?.parentElement || null;
    if(!panel || !main) return;
    const noEvent = $('noEventMessage');
    const tabs = $('mainTabs');
    const anchor = noEvent || tabs;
    if(anchor && anchor.parentElement === main && anchor.nextElementSibling !== panel){
      try{ anchor.insertAdjacentElement('afterend', panel); }catch(_){ }
    }
  }

  function releaseDocumentsLock(){
    window.__ceDocsForceActiveV85 = false;
    if(window.__ceDocsWatchdogV85){ clearInterval(window.__ceDocsWatchdogV85); window.__ceDocsWatchdogV85 = null; }
    setDocumentsExclusive(false);
  }

  function hideForeignMainChildren(on){
    const main = document.querySelector('.app .main') || $('mainTabs')?.parentElement || null;
    if(!main) return;
    Array.from(main.children || []).forEach(el => {
      if(!el || !el.id) return;
      const keep = el.id === 'mainTabs' || el.id === PANEL_ID;
      if(on){
        if(keep){
          if(el.id === PANEL_ID){
            el.removeAttribute('data-ce-docs-main-hidden-v85');
            el.style.removeProperty('display');
            el.style.removeProperty('visibility');
            el.style.removeProperty('pointer-events');
          }
          return;
        }
        el.setAttribute('data-ce-docs-main-hidden-v85','1');
        el.style.setProperty('display','none','important');
        el.style.setProperty('visibility','hidden','important');
        el.style.setProperty('pointer-events','none','important');
      }else if(el.getAttribute('data-ce-docs-main-hidden-v85') === '1'){
        el.removeAttribute('data-ce-docs-main-hidden-v85');
        el.style.removeProperty('display');
        el.style.removeProperty('visibility');
        el.style.removeProperty('pointer-events');
      }
    });
  }

  function hideForeignPhotoArtifacts(on){
    const selectors = [
      '#ceTooltipV21','#ceTooltipV181','#ceTooltipV190','#ceBudgetLiteTooltipV307',
      '#summaryTiendaTicket .ticket-actions','#summaryTiendaTicket img.ticket-thumb',
      '#collabList .ce-v509-receipt-field','#collabList .ce-v509-receipt-strip','#collabList .ce-v509-receipt-thumb',
      '#collabList .ce-v465-receipt-strip','#collabList .ce-v465-receipt-thumb',
      '.ce-v465-tip-thumb','.ce-v509-receipt-thumb','.ce-v465-receipt-thumb',
      '.ce-v401-pc-ticket-thumb','img.ticket-thumb'
    ];
    const nodes = new Set();
    selectors.forEach(sel => safe(() => document.querySelectorAll(sel).forEach(el => nodes.add(el)), null));
    nodes.forEach(el => {
      if(!el || el.closest?.('#' + PANEL_ID) || el.closest?.('#ceDocModalV85')) return;
      if(on){
        el.setAttribute('data-ce-docs-artifact-hidden-v85','1');
        el.style.setProperty('display','none','important');
        el.style.setProperty('visibility','hidden','important');
        el.style.setProperty('pointer-events','none','important');
        el.style.setProperty('opacity','0','important');
      }else if(el.getAttribute('data-ce-docs-artifact-hidden-v85') === '1'){
        el.removeAttribute('data-ce-docs-artifact-hidden-v85');
        el.style.removeProperty('display');
        el.style.removeProperty('visibility');
        el.style.removeProperty('pointer-events');
        el.style.removeProperty('opacity');
      }
    });
  }

  function enableDocumentViewControls(){
    document.querySelectorAll('#' + PANEL_ID + ' .ce-doc-thumb-btn,#' + PANEL_ID + ' [data-doc-open],#ceDocModalV85 button,#ceDocModalV85 .ce-doc-modal-close-v85').forEach(el => {
      try{
        el.disabled = false;
        el.removeAttribute('disabled');
        el.removeAttribute('aria-disabled');
        el.classList.remove('locked','ce-v225-ro-disabled');
        el.style.setProperty('pointer-events','auto','important');
        el.style.setProperty('opacity','1','important');
        el.style.setProperty('filter','none','important');
      }catch(_){ }
    });
  }

  function startDocumentsWatchdog(){
    if(window.__ceDocsWatchdogV85) return;
    window.__ceDocsWatchdogV85 = setInterval(() => {
      if(window.__ceDocsForceActiveV85 === true) setDocumentsExclusive(true);
    }, window.ControlEventLowResource?.interval?.(420) || 420);
  }

  function setDocumentsExclusive(active){
    ensureDocumentPanelPlacement();
    const on = !!active && currentTab() === TAB;
    safe(() => document.body.classList.toggle('ce-docs-active-v85', on), null);
    hideForeignMainChildren(on);
    hideForeignPhotoArtifacts(on);
    if(on){ enableDocumentViewControls(); ensureMobileActionsV85(); }
    PANELS.forEach(id => {
      const el = $(id);
      if(!el) return;
      if(on){
        const shouldShow = id === PANEL_ID && !!selectedEvent() && canSee();
        el.classList.toggle('hidden', !shouldShow);
        el.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
        if(shouldShow){
          el.removeAttribute('data-ce-docs-hidden-v85');
          el.style.removeProperty('display');
          el.style.removeProperty('visibility');
          el.style.removeProperty('pointer-events');
        }else{
          el.setAttribute('data-ce-docs-hidden-v85', '1');
          el.style.setProperty('display', 'none', 'important');
          el.style.setProperty('visibility', 'hidden', 'important');
          el.style.setProperty('pointer-events', 'none', 'important');
        }
      }else if(el.getAttribute('data-ce-docs-hidden-v85') === '1'){
        el.removeAttribute('data-ce-docs-hidden-v85');
        el.style.removeProperty('display');
        el.style.removeProperty('visibility');
        el.style.removeProperty('pointer-events');
      }
    });
  }

  function renderVisibility(){
    const panel = $(PANEL_ID);
    const active = currentTab() === TAB;
    const hasEvent = !!selectedEvent();
    if(active){
      // v8.5.1: blindaje real contra repintados legacy que levantaban RESUMEN DE INGRESOS.
      setDocumentsExclusive(true);
    }else{
      setDocumentsExclusive(false);
      if(panel){
        panel.classList.add('hidden');
        panel.setAttribute('aria-hidden', 'true');
      }
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
    ensureMobileActionsV85();
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
        <div class="field ce-doc-date-new"><label>Fecha</label><input id="eventDocNewFecha" type="text" inputmode="numeric" placeholder="dd/mm/aaaa" value="${esc(todayDisplay())}" /></div>
        <div class="field ce-docs-form-desc"><label>&nbsp;</label><textarea id="eventDocNewDescripcion" rows="2" placeholder="Descripción del documento: solicitud, permiso, seguro, autorización..."></textarea></div>
        <div class="field"><label>Foto/documento</label><input id="eventDocNewFile" type="file" accept="image/*" /></div>
        <div class="field ce-doc-add-action"><label>&nbsp;</label><button type="button" id="btnAddEventDoc">Añadir documento</button></div>
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
      const targetId = 'ceDocViewV85_' + safeDomId(`${doc.eventId}_${doc.codigo || doc.imageKey || doc.id}`);
      const thumb = img
        ? `<a class="ce-doc-thumb-btn ce-doc-thumb-link-v85" href="#${esc(targetId)}" title="Ampliar documento" aria-label="Ampliar documento"><img class="ce-doc-thumb" src="${esc(img)}" alt="Documento" loading="lazy" /></a>`
        : '<div class="ce-doc-noimage">Sin foto</div>';
      const modal = img ? `
        <div id="${esc(targetId)}" class="ce-doc-target-modal-v85" role="dialog" aria-modal="true">
          <div class="ce-doc-target-box-v85" role="document">
            <a class="ce-doc-target-close-v85" href="#tabDocumentos" aria-label="Cerrar documento">×</a>
            <div class="ce-doc-target-info-v85"><strong>Documento del evento</strong><span>${esc(formatDate(doc.fecha))}</span><p>${esc(doc.descripcion || '')}</p></div>
            <div class="ce-doc-target-imgwrap-v85"><img src="${esc(img)}" alt="Documento del evento" loading="lazy" /></div>
          </div>
        </div>` : '';
      const actions = editable && !doc.recovered ? `
          <button type="button" class="outline small" data-doc-replace="${id}">📎 Reemplazar foto</button>
          ${img ? `<button type="button" class="outline small" data-doc-remove-image="${id}">🗑️ Eliminar foto</button>` : ''}
          <button type="button" class="modify small" data-doc-save="${id}">Modificar</button>
          <button type="button" class="danger small" data-doc-delete="${id}">Eliminar</button>
          <input class="ce-doc-file-input" type="file" accept="image/*" data-doc-upload-input="${id}" />`
        : (doc.recovered ? '<span class="readonly-note">Recuperado desde foto.</span>' : '');
      const dateHtml = editable && !doc.recovered
        ? `<input class="ce-doc-date-input" type="text" inputmode="numeric" placeholder="dd/mm/aaaa" value="${esc(formatDate(doc.fecha || ''))}" data-doc-field="fecha" data-doc-id="${id}" />`
        : `<div class="ce-doc-date-view">${esc(formatDate(doc.fecha || ''))}</div>`;
      const descHtml = editable && !doc.recovered
        ? `<textarea class="ce-doc-desc-input" rows="2" data-doc-field="descripcion" data-doc-id="${id}">${esc(doc.descripcion || '')}</textarea>`
        : `<div class="ce-doc-desc-view">${esc(doc.descripcion || '')}</div>`;
      return `
        <div class="itemcard ce-doc-item" data-doc-id="${id}">
          <div class="ce-doc-item-grid">
            <div class="ce-doc-media">${thumb}</div>
            <div class="ce-doc-date-slot">${dateHtml}</div>
            <div class="ce-doc-desc-slot">${descHtml}</div>
            ${actions ? `<div class="ce-doc-actions">${actions}</div>` : ''}
          </div>
          ${modal}
        </div>`;    }).join('');
    enableDocumentViewControls();
  }

  function setCurrentTab(value){
    if(value === TAB){
      window.__ceDocsForceActiveV85 = true;
      window.__ceDocsLastOpenAtV85 = Date.now();
      startDocumentsWatchdog();
    }
    setLexical('currentMainTab', value);
    safe(() => { if(app()?.navigation) app().navigation.currentMainTab = value; }, null);
    window.__ceCurrentMainTab = value;
  }

  function openDocuments(){
    if(!canSee()) return;
    setCurrentTab(TAB);
    ensureDocumentPanelPlacement();
    startDocumentsWatchdog();
    setDocumentsExclusive(true);
    BUTTONS.forEach(id => $(id)?.classList.toggle('active', id === BUTTON_ID));
    document.querySelectorAll('.mobile-menu-action[data-target]').forEach(el => el.classList.toggle('primary', el.dataset.target === BUTTON_ID));
    renderEventDocuments();
    // v8.5.2: varios parches legacy repintan la pestaña inicial unos segundos despues.
    // Mientras Documentos siga siendo la pestaña activa, reaseguramos que no aparezca RESUMEN/INGRESOS encima.
    [0,80,240,700,1500,3000,6000,9000].forEach(ms => setTimeout(() => { if(currentTab() === TAB) renderVisibility(); }, ms));
    safe(() => document.body.classList.remove('mobile-drawer-open'), null);
  }

  function closeDocumentsIfOtherTab(){
    if(currentTab() !== TAB){
      setDocumentsExclusive(false);
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
    const fecha = parseDateForStorage($('eventDocNewFecha')?.value || todayDisplay()) || todayIso();
    const descripcion = norm($('eventDocNewDescripcion')?.value || '');
    const file = $('eventDocNewFile')?.files?.[0] || null;
    if(!descripcion){ alert('Introduce un texto descriptivo.'); return; }
    if(!file){ alert('Adjunta una foto del documento.'); return; }
    const code = nextDocCode(eventId);
    status('Preparando documento...', 'working');
    let dataUrl = await fileToCompressedDataUrl(file);
    let imageUrl = dataUrl;
    try{
      const uploaded = await uploadDocumentImage(eventId, code, dataUrl);
      imageUrl = uploaded.url || uploaded.public_url || uploaded.pathname || uploaded.path || dataUrl;
      dataUrl = imageUrl;
    }catch(error){
      console.warn('[ControlEvent v9.4_prod] No se pudo subir DOC ahora, queda en estado local/protegido:', error?.message || error);
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
    status('Documento añadido correctamente.', 'ok');
  }

  async function replaceImage(docId, file){
    const doc = findDoc(docId);
    if(!doc || !canMaintainDocs()) return;
    if(!file) return;
    const code = docCode(doc.codigo || doc.imageKey);
    status('Actualizando foto del documento...', 'working');
    let dataUrl = await fileToCompressedDataUrl(file);
    let imageUrl = dataUrl;
    try{
      const uploaded = await uploadDocumentImage(doc.eventId, code, dataUrl);
      imageUrl = uploaded.url || uploaded.public_url || uploaded.pathname || uploaded.path || dataUrl;
      dataUrl = imageUrl;
    }catch(error){
      console.warn('[ControlEvent v9.4_prod] No se pudo subir DOC ahora, queda local:', error?.message || error);
      status('No se pudo subir al servidor ahora. Queda guardado localmente y se intentará sincronizar al guardar.', 'warn');
    }
    const s = ensureStateShape();
    s.ticketImages[docKey(doc.eventId, code)] = dataUrl;
    doc.imageUrl = imageUrl;
    doc.imageKey = code;
    doc.updatedAt = new Date().toISOString();
    saveNow();
    renderEventDocuments();
    status('Foto del documento actualizada.', 'ok');
  }

  async function removeImage(docId){
    const doc = findDoc(docId);
    if(!doc || !canMaintainDocs()) return;
    const code = docCode(doc.codigo || doc.imageKey);
    if(!confirm('¿Eliminar solo la foto? Se mantiene la ficha del documento.')) return;
    status('Eliminando foto del documento...', 'working');
    await deleteDocumentImage(doc.eventId, code).catch(error => {
      console.warn('[ControlEvent v9.4_prod] No se pudo eliminar imagen en servidor:', error?.message || error);
      throw error;
    });
    const s = ensureStateShape();
    delete s.ticketImages[docKey(doc.eventId, code)];
    doc.imageUrl = '';
    doc.updatedAt = new Date().toISOString();
    saveNow();
    renderEventDocuments();
    status('Foto del documento eliminada.', 'ok');
  }

  async function deleteDoc(docId){
    const doc = findDoc(docId);
    if(!doc || !canMaintainDocs()) return;
    const code = docCode(doc.codigo || doc.imageKey);
    if(!confirm('¿Eliminar definitivamente este documento y su foto?')) return;
    status('Eliminando documento...', 'working');
    if(imageFor(doc)){
      await deleteDocumentImage(doc.eventId, code).catch(error => {
        console.warn('[ControlEvent v9.4_prod] No se pudo eliminar imagen en servidor:', error?.message || error);
        throw error;
      });
    }
    const s = ensureStateShape();
    delete s.ticketImages[docKey(doc.eventId, code)];
    s.eventDocuments = s.eventDocuments.filter(item => String(item.id || '') !== String(docId));
    saveNow();
    renderEventDocuments();
    status('Documento eliminado.', 'ok');
  }

  function saveDoc(docId){
    const doc = findDoc(docId);
    if(!doc || !canMaintainDocs()) return;
    const fields = document.querySelectorAll(`[data-doc-id="${cssEscape(docId)}"][data-doc-field]`);
    fields.forEach(el => {
      const field = el.dataset.docField;
      if(field === 'fecha') doc.fecha = parseDateForStorage(el.value || '');
      if(field === 'descripcion') doc.descripcion = norm(el.value || '');
    });
    if(!doc.descripcion){ alert('El texto descriptivo no puede quedar vacío.'); return; }
    doc.updatedAt = new Date().toISOString();
    saveNow();
    renderEventDocuments();
    status('Documento modificado.', 'ok');
  }

  function removeAllDocModalsV85(){
    document.querySelectorAll('#ceDocModalV85,.ce-doc-modal-v85').forEach(node => {
      try{ node.remove(); }catch(_){ }
    });
    document.body?.classList.remove('ce-doc-modal-open-v85');
    window.__ceDocModalOpenV85 = false;
  }

  function openModal(docId){
    const doc = findDoc(docId) || docsForEvent().find(item => String(item.id || '') === String(docId));
    if(!doc) return;
    const src = imageFor(doc);
    if(!src) return;
    // v8.5 FIX5: visor propio, limpio en cada apertura. Evita que iOS/Android/Finalizado
    // acumulen capas o listeners y bloqueen la quinta apertura.
    removeAllDocModalsV85();
    const modal = document.createElement('div');
    modal.id = 'ceDocModalV85';
    modal.className = 'ce-doc-modal-v85 visible';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.innerHTML = `
      <div class="ce-doc-modal-box-v85" role="document">
        <button type="button" class="ce-doc-modal-close-v85" aria-label="Cerrar documento">×</button>
        <div class="ce-doc-modal-info-v85"><strong>Documento del evento</strong><span>${esc(formatDate(doc.fecha))}</span><p>${esc(doc.descripcion || '')}</p></div>
        <div class="ce-doc-modal-imgwrap-v85"><img alt="Documento del evento" /></div>
      </div>`;
    const img = modal.querySelector('img');
    if(img) img.src = src;
    const closeFromEvent = ev => { try{ ev?.preventDefault?.(); ev?.stopPropagation?.(); ev?.stopImmediatePropagation?.(); }catch(_){ } closeModal(); return false; };
    const stopInside = ev => { try{ ev?.stopPropagation?.(); }catch(_){ } };
    ['click','pointerup','touchend'].forEach(type => {
      modal.addEventListener(type, ev => {
        if(ev.target === modal || ev.target?.closest?.('.ce-doc-modal-close-v85')) return closeFromEvent(ev);
      }, {capture:true, passive:false});
      modal.querySelector('.ce-doc-modal-box-v85')?.addEventListener(type, stopInside, {capture:false, passive:false});
    });
    document.body.appendChild(modal);
    document.body.classList.add('ce-doc-modal-open-v85');
    window.__ceDocModalOpenV85 = true;
    setTimeout(() => { try{ modal.querySelector('.ce-doc-modal-close-v85')?.focus?.({preventScroll:true}); }catch(_){ } }, 40);
  }

  function closeModal(){
    const modal = $('ceDocModalV85');
    if(modal){
      const img = modal.querySelector('img');
      if(img) img.removeAttribute('src');
      modal.classList.remove('visible');
      try{ modal.remove(); }catch(_){ modal.style.setProperty('display','none','important'); }
    }
    document.body?.classList.remove('ce-doc-modal-open-v85');
    window.__ceDocModalOpenV85 = false;
    // Después de cerrar, reactivar la pestaña para que los botones vuelvan a aceptar toque.
    setTimeout(() => { if(currentTab() === TAB){ setDocumentsExclusive(true); enableDocumentViewControls(); } }, 30);
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
        if(active){
          setDocumentsExclusive(true);
        }else{
          setDocumentsExclusive(false);
          const panel = $(PANEL_ID);
          if(panel) panel.classList.add('hidden');
        }
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

  let lastDocOpenV85 = {id:'', at:0};
  function openDocFromEvent(event){
    const open = event?.target?.closest?.('[data-doc-open]');
    if(!open) return false;
    const id = String(open.dataset.docOpen || '');
    if(!id) return false;
    try{ event.preventDefault?.(); event.stopPropagation?.(); event.stopImmediatePropagation?.(); }catch(_){ }
    const now = Date.now();
    if(lastDocOpenV85.id === id && now - lastDocOpenV85.at < 120 && window.__ceDocModalOpenV85) return true;
    lastDocOpenV85 = {id, at: now};
    openModal(id);
    return true;
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
    if(openDocFromEvent(event)) return false;
    const repl = target.closest('[data-doc-replace]');
    if(repl){ event.preventDefault(); const input = document.querySelector(`input[data-doc-upload-input="${cssEscape(repl.dataset.docReplace)}"]`); input?.click(); return false; }
    const remImg = target.closest('[data-doc-remove-image]');
    if(remImg){ event.preventDefault(); event.stopPropagation(); removeImage(remImg.dataset.docRemoveImage).catch(error => { alert('No se pudo eliminar la foto: ' + (error?.message || error)); status('Error eliminando foto.', 'bad'); }); return false; }
    const save = target.closest('[data-doc-save]');
    if(save){ event.preventDefault(); event.stopPropagation(); saveDoc(save.dataset.docSave); return false; }
    const del = target.closest('[data-doc-delete]');
    if(del){ event.preventDefault(); event.stopPropagation(); deleteDoc(del.dataset.docDelete).catch(error => { alert('No se pudo eliminar el documento: ' + (error?.message || error)); status('Error eliminando documento.', 'bad'); }); return false; }
    const otherTab = target.closest('#tabIngresosBtn,#tabDonacionesBtn,#tabComprasBtn,#tabMapaBtn,#tabResumenBtn,#tabGraficasBtn,.mobile-menu-action[data-target="tabIngresosBtn"],.mobile-menu-action[data-target="tabDonacionesBtn"],.mobile-menu-action[data-target="tabComprasBtn"],.mobile-menu-action[data-target="tabMapaBtn"],.mobile-menu-action[data-target="tabResumenBtn"],.mobile-menu-action[data-target="tabGraficasBtn"]');
    if(otherTab){
      window.__ceDocsForceActiveV85 = false;
      const rawId = otherTab.id || otherTab.dataset?.target || '';
      const map = {tabIngresosBtn:'ingresos',tabDonacionesBtn:'donaciones',tabComprasBtn:'compras',tabMapaBtn:'mapa',tabResumenBtn:'resumen',tabGraficasBtn:'graficas'};
      const next = map[rawId] || '';
      if(next) setCurrentTab(next);
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
      body.ce-docs-active-v85 .main > :not(#mainTabs):not(#tabDocumentos){display:none!important;visibility:hidden!important;pointer-events:none!important;}
      body.ce-docs-active-v85 #tabIngresos,body.ce-docs-active-v85 #tabDonaciones,body.ce-docs-active-v85 #tabCompras,body.ce-docs-active-v85 #tabMapaProductos,body.ce-docs-active-v85 #tabPlanificacionInicial,body.ce-docs-active-v85 #tabResumen,body.ce-docs-active-v85 #tabGraficas,body.ce-docs-active-v85 #maintenanceWrapper,body.ce-docs-active-v85 #collabList,body.ce-docs-active-v85 #summaryTiendaTicket,body.ce-docs-active-v85 #ceBudgetLiteTooltipV307,body.ce-docs-active-v85 #ceTooltipV21,body.ce-docs-active-v85 #ceTooltipV181,body.ce-docs-active-v85 #ceTooltipV190{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      body.ce-docs-active-v85 .ce-v509-receipt-thumb,body.ce-docs-active-v85 .ce-v465-receipt-thumb,body.ce-docs-active-v85 .ce-v465-tip-thumb,body.ce-docs-active-v85 img.ticket-thumb{display:none!important;visibility:hidden!important;pointer-events:none!important;opacity:0!important;}
      body.ce-docs-active-v85 #tabDocumentos{display:block!important;visibility:visible!important;pointer-events:auto!important;}
      body.ce-docs-active-v85 #tabDocumentos .ce-doc-thumb-btn,body.ce-docs-active-v85 #tabDocumentos [data-doc-open],body.ce-docs-active-v85 #ceDocModalV85 .ce-doc-modal-close-v85{pointer-events:auto!important;opacity:1!important;filter:none!important;}
      .ce-docs-card{background:linear-gradient(180deg,#ffffff 0%,#f8fafc 100%)}
      .ce-docs-form{display:grid;grid-template-columns:minmax(120px,.45fr) minmax(380px,2.8fr) minmax(190px,.8fr) auto;gap:10px;align-items:end}
      .ce-docs-form-desc textarea{min-height:42px;resize:vertical}
      .ce-docs-status{margin:0 0 12px 0;padding:10px 12px;border-radius:14px;background:#f8fafc;border:1px solid var(--border);font-weight:800;font-size:13px;color:#334155;white-space:pre-wrap}
      .ce-docs-status.ok{background:#ecfdf5;border-color:#bbf7d0;color:#047857}.ce-docs-status.bad{background:#fef2f2;border-color:#fecaca;color:#b91c1c}.ce-docs-status.warn{background:#fffbeb;border-color:#fde68a;color:#92400e}.ce-docs-status.working{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}
      .ce-docs-note{padding:10px 12px;border-radius:14px;background:#f8fafc;border:1px solid var(--border);font-size:13px;font-weight:800;color:#334155}.ce-docs-note.warn{background:#fffbeb;border-color:#fde68a;color:#92400e}
      .ce-docs-list{display:grid;gap:8px}.ce-doc-item{border:1px solid #dbe8f5;background:#fff}.ce-doc-item:nth-child(odd){background:#eef7ff}.ce-doc-item:nth-child(even){background:#fff}.ce-doc-item-grid{display:grid;grid-template-columns:58px 1fr;gap:10px;align-items:start}
      .ce-doc-media{display:flex;align-items:center;justify-content:center;min-height:52px;background:rgba(248,250,252,.72);border:1px dashed #cbd5e1;border-radius:12px;overflow:hidden}.ce-doc-thumb-btn{display:inline-flex;border:0;background:transparent;padding:0;cursor:zoom-in;touch-action:manipulation}.ce-doc-thumb{display:block;width:44px;height:44px;max-width:44px;max-height:44px;object-fit:cover;border-radius:8px;border:1px solid #cbd5e1;box-shadow:0 2px 8px rgba(15,23,42,.10)}.ce-doc-noimage{font-size:11px;color:#64748b;font-weight:900;text-align:center}
      .ce-doc-head,.ce-doc-code,.ce-doc-date-label{display:none!important}
      .ce-doc-fields{display:grid;grid-template-columns:minmax(130px,.30fr) minmax(420px,1.70fr);gap:10px}.ce-doc-desc-field textarea{min-height:40px;resize:vertical}.ce-doc-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;align-items:center}.ce-doc-file-input{display:none!important}
      .ce-doc-modal-v85{position:fixed;inset:0;z-index:5600;background:rgba(15,23,42,.68);display:none;align-items:center;justify-content:center;padding:18px}.ce-doc-modal-v85.visible{display:flex}.ce-doc-modal-box-v85{position:relative;width:min(1180px,96vw);max-height:94vh;background:#fff;border-radius:22px;border:1px solid rgba(15,23,42,.18);box-shadow:0 24px 80px rgba(0,0,0,.36);padding:16px;display:grid;grid-template-columns:minmax(230px,.55fr) minmax(320px,1.45fr);gap:16px;align-items:start}.ce-doc-modal-close-v85{position:absolute;right:10px;top:8px;background:#111827!important;color:#fff!important;border-radius:999px!important;width:38px;height:38px;padding:0!important;font-size:24px;line-height:38px;text-align:center;cursor:pointer;touch-action:manipulation;user-select:none}.ce-doc-modal-info-v85{background:#f8fafc;border:1px solid #dbe2ea;border-radius:16px;padding:12px;max-height:84vh;overflow:auto}.ce-doc-modal-info-v85 strong{display:block;font-size:20px;margin-bottom:4px}.ce-doc-modal-info-v85 span{display:inline-block;margin-bottom:10px;color:#64748b;font-weight:900}.ce-doc-modal-info-v85 p{white-space:pre-wrap;line-height:1.35;margin:0}.ce-doc-modal-imgwrap-v85{max-height:86vh;overflow:auto;display:flex;align-items:flex-start;justify-content:center}.ce-doc-modal-imgwrap-v85 img{max-width:100%;height:auto;border-radius:14px;border:1px solid #dbe2ea;box-shadow:0 10px 34px rgba(15,23,42,.18)}
      body.ce-docs-role-ro-v85 #mainTabs.tabs,body.ce-role-ro-v505 #mainTabs.tabs,body.ce-role-ro-v507 #mainTabs.tabs,body.ce-role-ro-v508 #mainTabs.tabs{grid-template-columns:repeat(4,48px)!important;justify-content:center!important;justify-items:center!important;gap:10px!important;}
      body.ce-docs-role-ro-v85 #tabResumenBtn,body.ce-role-ro-v505 #tabResumenBtn,body.ce-role-ro-v507 #tabResumenBtn,body.ce-role-ro-v508 #tabResumenBtn{order:1!important}body.ce-docs-role-ro-v85 #tabMapaBtn,body.ce-role-ro-v505 #tabMapaBtn,body.ce-role-ro-v507 #tabMapaBtn,body.ce-role-ro-v508 #tabMapaBtn{order:2!important}body.ce-docs-role-ro-v85 #tabDocumentosBtn,body.ce-role-ro-v505 #tabDocumentosBtn,body.ce-role-ro-v507 #tabDocumentosBtn,body.ce-role-ro-v508 #tabDocumentosBtn{order:3!important;display:inline-flex!important;visibility:visible!important;pointer-events:auto!important}body.ce-docs-role-ro-v85 #tabGraficasBtn,body.ce-role-ro-v505 #tabGraficasBtn,body.ce-role-ro-v507 #tabGraficasBtn,body.ce-role-ro-v508 #tabGraficasBtn{order:4!important}

      /* v8.5 FIX5: ajustes responsive y visor limpio */
      #tabDocumentos .ce-doc-item{overflow:hidden!important;}
      #tabDocumentos .ce-doc-item textarea,#tabDocumentos .ce-doc-item input{font-weight:900!important;color:#0f172a!important;opacity:1!important;-webkit-text-fill-color:#0f172a!important;background:rgba(255,255,255,.72)!important;}
      #tabDocumentos .ce-doc-desc-field textarea{font-weight:950!important;line-height:1.22!important;}
      #tabDocumentos .ce-doc-date-field input{font-weight:950!important;text-align:center!important;letter-spacing:-.02em!important;}
      #tabDocumentos .ce-doc-fields .field{min-width:0!important;}
      #tabDocumentos .ce-doc-fields input,#tabDocumentos .ce-doc-fields textarea{width:100%!important;box-sizing:border-box!important;min-width:0!important;}
      .ce-doc-modal-v85{position:fixed!important;inset:0!important;z-index:950000!important;background:rgba(15,23,42,.72)!important;display:none!important;align-items:center!important;justify-content:center!important;padding:18px!important;touch-action:manipulation!important;overscroll-behavior:contain!important;}
      .ce-doc-modal-v85.visible{display:flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;}
      .ce-doc-modal-close-v85{appearance:none!important;-webkit-appearance:none!important;border:0!important;position:absolute!important;right:10px!important;top:8px!important;background:#111827!important;color:#fff!important;border-radius:999px!important;width:42px!important;height:42px!important;padding:0!important;font-size:26px!important;line-height:42px!important;text-align:center!important;cursor:pointer!important;touch-action:manipulation!important;user-select:none!important;z-index:950002!important;}
      @media(min-width:901px){#tabDocumentos .ce-doc-item-grid{grid-template-columns:62px minmax(0,1fr)!important;}#tabDocumentos .ce-doc-fields{grid-template-columns:116px minmax(0,1fr)!important;}#tabDocumentos .ce-doc-thumb{width:52px!important;height:52px!important;max-width:52px!important;max-height:52px!important;}#tabDocumentos .ce-doc-media{min-height:60px!important}.ce-doc-modal-info-v85 p{font-weight:850!important;}}
      @media(max-width:900px){#tabDocumentos{overflow-x:hidden!important;}#tabDocumentos .card{padding-left:10px!important;padding-right:10px!important;}#tabDocumentos .ce-doc-item{padding:8px!important;}#tabDocumentos .ce-doc-item-grid{grid-template-columns:54px minmax(0,1fr)!important;gap:7px!important;}#tabDocumentos .ce-doc-fields{grid-template-columns:86px minmax(0,1fr)!important;gap:6px!important;}#tabDocumentos .ce-doc-date-field input{font-size:11px!important;padding-left:3px!important;padding-right:3px!important;}#tabDocumentos .ce-doc-desc-field textarea{font-size:12px!important;min-height:38px!important;}#tabDocumentos .ce-doc-actions{font-size:11px!important;gap:5px!important;}#tabDocumentos .ce-doc-actions button{font-size:11px!important;padding:7px 8px!important;}#tabDocumentos .ce-doc-thumb{width:44px!important;height:44px!important;max-width:44px!important;max-height:44px!important}.ce-doc-modal-v85{padding:6px!important}.ce-doc-modal-box-v85{width:98vw!important;max-height:94vh!important;overflow:auto!important;border-radius:16px!important;padding:10px!important}.ce-doc-modal-info-v85 strong{font-size:17px!important}.ce-doc-modal-info-v85 p{font-size:14px!important;font-weight:850!important}.ce-doc-modal-close-v85{width:44px!important;height:44px!important;line-height:44px!important;font-size:28px!important;}}
      @media(max-width:900px){body.ce-v5019-authenticated #ceMobileActionDockV518,body.ce-docs-active-v85 #ceMobileActionDockV518{display:flex!important;visibility:visible!important;opacity:.78!important;z-index:190500!important;pointer-events:none!important}body.ce-v5019-authenticated #ceMobileActionDockV518 button,body.ce-docs-active-v85 #ceMobileActionDockV518 button{pointer-events:auto!important;touch-action:manipulation!important;opacity:1!important}.ce-docs-form{grid-template-columns:1fr!important}.ce-doc-fields{grid-template-columns:minmax(108px,.34fr) minmax(210px,1.66fr)!important}.ce-doc-item-grid{grid-template-columns:58px 1fr!important}.ce-doc-media{justify-content:center;padding:4px}.ce-doc-thumb{width:44px!important;height:44px!important}.ce-doc-modal-v85{padding:8px}.ce-doc-modal-box-v85{grid-template-columns:1fr;width:98vw;max-height:94vh;overflow:auto;padding:12px}.ce-doc-modal-info-v85,.ce-doc-modal-imgwrap-v85{max-height:none}.ce-doc-modal-imgwrap-v85 img{width:100%;}body.ce-docs-role-ro-v85 #mainTabs.tabs,body.ce-role-ro-v505 #mainTabs.tabs,body.ce-role-ro-v507 #mainTabs.tabs,body.ce-role-ro-v508 #mainTabs.tabs{grid-template-columns:repeat(4,42px)!important;gap:8px!important}}


      /* v8.5 FIX6: visor por CSS :target, sin listeners acumulados, y nueva disposición de registros */
      #tabDocumentos .ce-doc-item:nth-child(odd){background:#fff!important;}
      #tabDocumentos .ce-doc-item:nth-child(even){background:#dbeeff!important;}
      #tabDocumentos .ce-doc-item-grid{display:grid!important;grid-template-columns:64px 118px minmax(0,1fr)!important;gap:10px!important;align-items:center!important;}
      #tabDocumentos .ce-doc-media{min-height:48px!important;background:rgba(255,255,255,.60)!important;}
      #tabDocumentos .ce-doc-thumb{width:58px!important;height:42px!important;max-width:58px!important;max-height:42px!important;object-fit:cover!important;border-radius:8px!important;}
      #tabDocumentos .ce-doc-thumb-link-v85{display:inline-flex!important;align-items:center!important;justify-content:center!important;cursor:zoom-in!important;touch-action:manipulation!important;pointer-events:auto!important;-webkit-tap-highlight-color:rgba(37,99,235,.18)!important;}
      #tabDocumentos .ce-doc-date-slot,#tabDocumentos .ce-doc-desc-slot{min-width:0!important;}
      #tabDocumentos .ce-doc-date-input,#tabDocumentos .ce-doc-date-view{width:100%!important;box-sizing:border-box!important;text-align:center!important;font-weight:950!important;color:#0f172a!important;font-size:14px!important;line-height:1.15!important;background:rgba(255,255,255,.76)!important;border:1px solid #cbd5e1!important;border-radius:10px!important;padding:9px 6px!important;white-space:nowrap!important;}
      #tabDocumentos .ce-doc-desc-input,#tabDocumentos .ce-doc-desc-view{width:100%!important;box-sizing:border-box!important;font-weight:950!important;color:#0f172a!important;font-size:14px!important;line-height:1.22!important;background:rgba(255,255,255,.76)!important;border:1px solid #cbd5e1!important;border-radius:12px!important;padding:9px 10px!important;min-height:42px!important;white-space:pre-wrap!important;overflow-wrap:anywhere!important;}
      #tabDocumentos .ce-doc-actions{grid-column:2 / 4!important;display:flex!important;flex-wrap:nowrap!important;gap:8px!important;align-items:center!important;margin-top:0!important;overflow-x:auto!important;padding:2px 0 1px!important;}
      #tabDocumentos .ce-doc-actions button{white-space:nowrap!important;flex:0 0 auto!important;}
      #tabDocumentos .ce-docs-form-desc textarea{font-weight:850!important;}
      @media(min-width:901px){#tabDocumentos .ce-docs-form{grid-template-columns:120px minmax(680px,4.2fr) minmax(190px,.75fr) auto!important;}#tabDocumentos .ce-docs-form-desc textarea{min-height:72px!important;font-size:15px!important;}#tabDocumentos .ce-doc-item-grid{grid-template-columns:66px 120px minmax(0,1fr)!important;}#tabDocumentos .ce-doc-desc-input,#tabDocumentos .ce-doc-desc-view{min-height:44px!important;}}
      @media(max-width:900px){#tabDocumentos .ce-doc-item-grid{grid-template-columns:58px 78px minmax(0,1fr)!important;gap:6px!important;}#tabDocumentos .ce-doc-media{min-height:44px!important;padding:3px!important;}#tabDocumentos .ce-doc-thumb{width:52px!important;height:38px!important;max-width:52px!important;max-height:38px!important;}#tabDocumentos .ce-doc-date-input,#tabDocumentos .ce-doc-date-view{font-size:11px!important;padding:8px 3px!important;letter-spacing:-.03em!important;}#tabDocumentos .ce-doc-desc-input,#tabDocumentos .ce-doc-desc-view{font-size:12px!important;min-height:38px!important;padding:8px 7px!important;line-height:1.18!important;}#tabDocumentos .ce-doc-actions{grid-column:1 / 4!important;gap:5px!important;}#tabDocumentos .ce-doc-actions button{font-size:10.5px!important;padding:7px 7px!important;}#tabDocumentos .ce-docs-form-desc textarea{min-height:42px!important;}}
      .ce-doc-target-modal-v85{position:fixed!important;inset:0!important;z-index:980000!important;background:rgba(15,23,42,.74)!important;display:none!important;align-items:center!important;justify-content:center!important;padding:18px!important;overscroll-behavior:contain!important;}
      .ce-doc-target-modal-v85:target{display:flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;}
      .ce-doc-target-box-v85{position:relative!important;width:min(1180px,96vw)!important;max-height:94vh!important;background:#fff!important;border-radius:22px!important;border:1px solid rgba(15,23,42,.18)!important;box-shadow:0 24px 80px rgba(0,0,0,.36)!important;padding:16px!important;display:grid!important;grid-template-columns:minmax(230px,.55fr) minmax(320px,1.45fr)!important;gap:16px!important;align-items:start!important;overflow:auto!important;}
      .ce-doc-target-close-v85{position:absolute!important;right:10px!important;top:8px!important;z-index:980002!important;display:flex!important;align-items:center!important;justify-content:center!important;text-decoration:none!important;background:#111827!important;color:#fff!important;border-radius:999px!important;width:44px!important;height:44px!important;font-size:30px!important;line-height:1!important;font-weight:950!important;touch-action:manipulation!important;}
      .ce-doc-target-info-v85{background:#f8fafc!important;border:1px solid #dbe2ea!important;border-radius:16px!important;padding:12px!important;max-height:84vh!important;overflow:auto!important;}
      .ce-doc-target-info-v85 strong{display:block!important;font-size:20px!important;margin-bottom:4px!important;}
      .ce-doc-target-info-v85 span{display:inline-block!important;margin-bottom:10px!important;color:#64748b!important;font-weight:950!important;}
      .ce-doc-target-info-v85 p{white-space:pre-wrap!important;line-height:1.35!important;margin:0!important;font-weight:900!important;color:#0f172a!important;}
      .ce-doc-target-imgwrap-v85{max-height:86vh!important;overflow:auto!important;display:flex!important;align-items:flex-start!important;justify-content:center!important;}
      .ce-doc-target-imgwrap-v85 img{max-width:100%!important;height:auto!important;border-radius:14px!important;border:1px solid #dbe2ea!important;box-shadow:0 10px 34px rgba(15,23,42,.18)!important;}
      @media(max-width:900px){.ce-doc-target-modal-v85{padding:8px!important;}.ce-doc-target-box-v85{grid-template-columns:1fr!important;width:98vw!important;max-height:94vh!important;border-radius:16px!important;padding:12px!important;}.ce-doc-target-info-v85,.ce-doc-target-imgwrap-v85{max-height:none!important;}.ce-doc-target-imgwrap-v85 img{width:100%!important;}.ce-doc-target-info-v85 strong{font-size:17px!important;}.ce-doc-target-info-v85 p{font-size:14px!important;}}
      #ceBtnRefresV518.ce-refreshing,#btnSoftRefresh.ce-refreshing{background:#dcfce7!important;border-color:#22c55e!important;color:#14532d!important;}
      #ceBtnRefresV518.ce-refresh-ok,#btnSoftRefresh.ce-refresh-ok{background:#22c55e!important;border-color:#16a34a!important;color:#fff!important;}

      /* v8.5 FIX7: retoque estetico Documentos + formulario dentro de marco en iPad */
      #tabDocumentos .ce-docs-form.entry-zone{background:#e2f0d9!important;border:1px solid #a9d18e!important;border-radius:16px!important;padding:12px!important;box-shadow:0 3px 12px rgba(22,101,52,.08)!important;box-sizing:border-box!important;max-width:100%!important;overflow:hidden!important;}
      #tabDocumentos .ce-docs-form.entry-zone .field{min-width:0!important;}
      #tabDocumentos .ce-docs-form.entry-zone input,#tabDocumentos .ce-docs-form.entry-zone textarea{max-width:100%!important;box-sizing:border-box!important;}
      #tabDocumentos .ce-doc-add-action{justify-self:start!important;align-self:end!important;min-width:0!important;}
      #btnAddEventDoc{font-size:12px!important;padding:9px 12px!important;border-radius:12px!important;line-height:1.08!important;white-space:normal!important;min-width:0!important;max-width:145px!important;box-shadow:none!important;}
      #tabDocumentos .ce-docs-list > .ce-doc-item:nth-child(odd){background:#eaf6ff!important;border-color:#c7dff4!important;}
      #tabDocumentos .ce-docs-list > .ce-doc-item:nth-child(even){background:#cfe6ff!important;border-color:#afd3f2!important;}
      #tabDocumentos .ce-docs-list > .ce-doc-item .ce-doc-media{background:rgba(255,255,255,.66)!important;}
      @media(min-width:901px){#tabDocumentos .ce-docs-form{grid-template-columns:110px minmax(720px,1fr) minmax(180px,.55fr) minmax(128px,auto)!important;}#tabDocumentos .ce-docs-form-desc textarea{min-height:86px!important;font-size:15px!important;}}
      @media(min-width:901px) and (max-width:1180px){#tabDocumentos .ce-docs-form{grid-template-columns:105px minmax(360px,1fr) minmax(160px,.45fr) 122px!important;gap:8px!important;}#btnAddEventDoc{width:116px!important;max-width:116px!important;font-size:11.5px!important;padding:8px 9px!important;}#tabDocumentos .ce-docs-form-desc textarea{min-height:78px!important;}}
      @media(max-width:900px){#tabDocumentos .ce-docs-form.entry-zone{padding:10px!important;}#btnAddEventDoc{max-width:160px!important;font-size:12px!important;padding:9px 12px!important;}#tabDocumentos .ce-doc-add-action{justify-self:start!important;}}

    `;
    document.head.appendChild(style);
  }


  function installExclusiveObserver(){
    if(window.__ceV85DocsExclusiveObserver) return;
    window.__ceV85DocsExclusiveObserver = true;
    let pending = false;
    const enforce = () => {
      pending = false;
      if(currentTab() !== TAB) return;
      setDocumentsExclusive(true);
      const panel = $(PANEL_ID);
      if(panel && selectedEvent() && canSee()){
        panel.classList.remove('hidden');
        panel.setAttribute('aria-hidden','false');
      }
    };
    const schedule = () => {
      if(currentTab() !== TAB || pending) return;
      pending = true;
      if(typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(enforce);
      else setTimeout(enforce, 0);
    };
    try{
      const obs = new MutationObserver(schedule);
      PANELS.forEach(id => {
        const el = $(id);
        if(el) obs.observe(el, {attributes:true, attributeFilter:['class','style','aria-hidden']});
      });
      const main = document.querySelector('.app .main');
      if(main) obs.observe(main, {childList:true, subtree:true, attributes:true, attributeFilter:['class','style','aria-hidden','disabled']});
      window.__ceV85DocsExclusiveObserverInstance = obs;
    }catch(_){ }
    ['controlevent:event-ready','controlevent:module-mounted','controlevent:modules-ready','controlevent:runtime-ready'].forEach(evt => {
      window.addEventListener(evt, () => setTimeout(schedule, 0));
    });
  }

  function isMobileLikeV85(){
    return safe(() => window.matchMedia('(max-width: 900px)').matches, window.innerWidth <= 900) || /iPad|iPhone|Android/i.test(navigator.userAgent || '');
  }

  function ensureMobileActionsV85(){
    if(!isMobileLikeV85() || !auth()) return;
    safe(() => window.ControlEventV5019?.ensureMobileDock?.(), null);
    const dock = $('ceMobileActionDockV518');
    if(!dock) return;
    try{
      dock.style.setProperty('display','flex','important');
      dock.style.setProperty('visibility','visible','important');
      dock.style.setProperty('opacity','.78','important');
      dock.style.setProperty('z-index','190500','important');
      dock.style.setProperty('pointer-events','none','important');
      dock.querySelectorAll('button').forEach(btn => {
        btn.disabled = false;
        btn.removeAttribute('disabled');
        btn.style.setProperty('pointer-events','auto','important');
        btn.style.setProperty('touch-action','manipulation','important');
        btn.style.setProperty('opacity','1','important');
      });
    }catch(_){ }
  }

  function patchRefreshButtonsForDocumentsV85(){
    // La lógica de Refrescar vive en parches anteriores; aquí solo reforzamos que,
    // si la ventana activa es DOCUMENTOS, tras refrescar se vuelve a pintar con datos actuales.
    const after = () => {
      if(currentTab() !== TAB) return;
      try{ renderEventDocuments(); setDocumentsExclusive(true); ensureMobileActionsV85(); }catch(_){ }
    };
    ['btnSoftRefresh','ceBtnRefresV518'].forEach(id => {
      const btn = $(id);
      if(!btn || btn.__ceV85DocsRefreshAfter) return;
      btn.__ceV85DocsRefreshAfter = true;
      btn.addEventListener('click', () => [300,900,1800,3200].forEach(ms => setTimeout(after, ms)), false);
      btn.addEventListener('touchend', () => [300,900,1800,3200].forEach(ms => setTimeout(after, ms)), false);
      btn.addEventListener('pointerup', () => [300,900,1800,3200].forEach(ms => setTimeout(after, ms)), false);
    });
  }

  function install(){
    injectStyle();
    installExclusiveObserver();
    ensureDocumentPanelPlacement();
    ensureStateShape();
    ensureMobileButton();
    ensureMobileActionsV85();
    patchRefreshButtonsForDocumentsV85();
    patchRenderTabVisibility();
    patchRender();
    patchRoleStyles();
    applyVersion();
    renderVisibility();
  }

  ['pointerup','touchend'].forEach(type => document.addEventListener(type, event => { if(currentTab() === TAB) openDocFromEvent(event); }, {capture:true, passive:false}));

  if(!window.__ceDocModalEscV85){
    window.__ceDocModalEscV85 = true;
    document.addEventListener('keydown', event => {
      if(event.key === 'Escape' && $('ceDocModalV85')){ event.preventDefault(); closeModal(); return; }
      if(event.key === 'Escape' && String(location.hash || '').indexOf('#ceDocViewV85_') === 0){
        event.preventDefault();
        try{ location.hash = 'tabDocumentos'; }catch(_){ }
      }
    }, true);
  }
  document.addEventListener('click', event => {
    const modal = event.target?.closest?.('.ce-doc-target-modal-v85');
    if(modal && event.target === modal){
      event.preventDefault();
      try{ location.hash = 'tabDocumentos'; }catch(_){ }
      return false;
    }
  }, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('change', handleChange, true);
  ['controlevent:app-ready','controlevent:runtime-ready','controlevent:modules-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 80)));
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true}); else install();
  [160,700,1600].forEach(ms => setTimeout(install, ms));
  [900,2200,5000].forEach(ms => setTimeout(ensureMobileActionsV85, ms));

  window.ControlEventDocumentsV85 = {
    version: VERSION,
    versionFile: VERSION_FILE,
    install,
    render: renderEventDocuments,
    open: openDocuments,
    list: docsForEvent,
    nextCode: nextDocCode,
    openModal,
    closeModal,
    releaseExclusive: () => setDocumentsExclusive(false)
  };
})();
