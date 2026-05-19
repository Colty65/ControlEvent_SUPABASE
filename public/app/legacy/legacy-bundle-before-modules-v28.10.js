/* ControlEvent v28.10 - Bundle legacy generado desde scripts legacy-inline extraídos. */
/* Mantiene el orden original de ejecución para compatibilidad. */

;/* ===== BEGIN legacy-inline-01.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #1. */
const STORAGE_KEY = 'controlevent_v6_4';
const PERSONA_RANGOS = ['SOCIO','DONANTE','NO SOCIO'];
const PAYMENT_OPTIONS = ['Efectivo','Banco','Bizum','Pendiente'];
const SEGMENT_OPTIONS = ['COMIDA','BEBIDA','INFRAESTRUCTURA'];
const DESTINO_OPTIONS = ['APERITIVO','COMIDA','CENA','CUBATAS','INFRAESTRUCTURA'];
const EVENT_SITUATIONS = ['En curso','Finalizado'];
const ALL_TICKET_OPTIONS = ['','DONADO TIENDA','DONADO SOCIO','DONADO OTROS','GASTOS CORRIENTES', ...Array.from({length:30}, (_,i)=>'TK'+String(i+1).padStart(2,'0'))];
const PURCHASE_TICKET_OPTIONS = ['','GASTOS CORRIENTES', ...Array.from({length:30}, (_,i)=>'TK'+String(i+1).padStart(2,'0'))];
const DONATION_TICKET_OPTIONS = ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'];

let currentMainTab = 'ingresos';
let currentMaintTab = 'personas';
let currentProductSort = 'nombre';
let showEventDesc = false;
let showComprasEvent = true;
let authUser = (typeof window !== 'undefined' && typeof window.__CONTROL_EVENT_USER__ !== 'undefined') ? window.__CONTROL_EVENT_USER__ : null;
let accessUsers = [];
let authBusy = false;
function isDonationTicket(v){ return ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'].includes(String(v||'')); }
function isCurrentExpenseTicket(v){ return String(v||'').trim() === 'GASTOS CORRIENTES'; }

const state = loadState();
(state.colaboradores||[]).forEach(c=>{ if(c.situacion==='Banco') c.situacion='Banco'; });
if(!state.comprasSort) state.comprasSort = 'producto';
if(!state.summaryTiendaSort) state.summaryTiendaSort = 'tienda';

function uid(){ return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36); }
function money(n){ return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(n||0)); }
function numberEs(n){ return new Intl.NumberFormat('es-ES',{minimumFractionDigits:2, maximumFractionDigits:2}).format(Number(n||0)); }
function euroInputValue(n){ return numberEs(Number(n||0)) + ' €'; }
function parseEuroInput(v){
  if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = String(v ?? '').replace(/€/g,'').replace(/\s/g,'').trim();
  if(!s) return 0;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');

  if(lastComma !== -1 && lastDot !== -1){
    if(lastComma > lastDot){
      s = s.replace(/\./g,'').replace(',', '.');
    } else {
      s = s.replace(/,/g,'');
    }
  } else if(lastComma !== -1){
    s = s.replace(/\./g,'').replace(',', '.');
  } else {
    s = s.replace(/,/g,'');
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
function escapeHtml(s){ return String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }

function normalizeHeader(v){
  return String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^A-Za-z0-9]+/g,'_')
    .replace(/^_+|_+$/g,'')
    .toUpperCase();
}
function setImportStatus(msg, type=''){
  const box = document.getElementById('importStatus');
  if(!box) return;
  box.textContent = msg;
  box.className = 'import-status' + (type ? ' ' + type : '');
  box.classList.remove('hidden');
}
async function loadScriptWithFallback(urls){
  let lastError = null;
  for(const url of urls){
    try{
      await new Promise((resolve, reject) => {
        const already = Array.from(document.scripts).find(s => s.src && s.src.includes(url));
        if(already){ resolve(); return; }
        const s = document.createElement('script');
        s.src = url;
        s.async = true;
        s.onload = resolve;
        s.onerror = () => reject(new Error('No se pudo cargar ' + url));
        document.head.appendChild(s);
      });
      return url;
    }catch(err){
      lastError = err;
    }
  }
  throw lastError || new Error('No se pudo cargar ninguna librería externa.');
}

async function ensureSheetJS(){
  if(window.XLSX) return;
  await loadScriptWithFallback([
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
  ]);
}

async function ensureExcelJS(){
  if(window.ExcelJS) return;
  await loadScriptWithFallback([
    '/vendor/exceljs.min.js',
    'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js'
  ]);
}
function readSheetRows(workbook, wantedName){
  const name = workbook.SheetNames.find(n => normalizeHeader(n) === normalizeHeader(wantedName));
  if(!name) return [];
  const rows = window.XLSX.utils.sheet_to_json(workbook.Sheets[name], {header:1, defval:''});
  if(!rows.length) return [];
  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1)
    .filter(r => r.some(v => String(v ?? '').trim() !== ''))
    .map(r => {
      const obj = {};
      headers.forEach((h,i) => obj[h] = r[i]);
      return obj;
    });
}
function pick(obj, keys, fallback=''){
  for(const key of keys){
    if(Object.prototype.hasOwnProperty.call(obj, key) && String(obj[key] ?? '').trim() !== '') return obj[key];
  }
  return fallback;
}
function fileToDataURL(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo ' + file.name));
    reader.readAsDataURL(file);
  });
}
function personasForSelectedEvent(){
  return state.personas.filter(p => p.eventId === state.selectedEventId);
}
function tiendasForSelectedEvent(){
  return state.tiendas.filter(t => t.eventId === state.selectedEventId);
}
function productosForSelectedEvent(){
  return state.productos.filter(p => p.eventId === state.selectedEventId);
}

function renderAcceso(){
  const wrap = document.getElementById('accesoList');
  if(!wrap) return;
  if(!isGodRole()){
    wrap.innerHTML = '<div class="empty">Solo un usuario GD puede consultar esta tabla.</div>';
    return;
  }
  const list = accessUsers.slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
  if(!list.length){
    wrap.innerHTML = '<div class="empty">No hay usuarios en ACCESO.</div>';
    return;
  }
  wrap.innerHTML = '';
  list.forEach(u => {
    const row = document.createElement('div');
    row.className = 'itemcard maint-soft';
    row.innerHTML = `
      <div class="rowline persona">
        <div class="field"><label>Identificación</label><input value="${escapeHtml(u.identificacion)}" data-action="edit-acceso-identificacion" data-id="${escapeHtml(u.identificacion)}" /></div>
        <div class="field"><label>Nombre</label><input value="${escapeHtml(u.nombre)}" data-action="edit-acceso-nombre" data-id="${escapeHtml(u.identificacion)}" /></div>
        <div class="field"><label>Clave</label><input type="password" placeholder="••••••" data-action="edit-acceso-clave" data-id="${escapeHtml(u.identificacion)}" /></div>
        <div class="field"><label>Nivel</label><select data-action="edit-acceso-nivel" data-id="${escapeHtml(u.identificacion)}">${['RO','RW','GD'].map(v => `<option value="${v}" ${v===u.nivel?'selected':''}>${v}</option>`).join('')}</select></div>
        <button type="button" class="modify small" data-action="save-acceso" data-id="${escapeHtml(u.identificacion)}" onclick="saveAccessUser('${escapeHtml(u.identificacion)}'); return false;">Modificar</button>
        <button type="button" class="danger small" data-action="delete-acceso" data-id="${escapeHtml(u.identificacion)}" onclick="deleteAccessUser('${escapeHtml(u.identificacion)}'); return false;" ${authUser && u.identificacion===authUser.identificacion ? 'disabled' : ''}>Eliminar</button>
      </div>
    `;
    wrap.appendChild(row);
  });
}

async function importInitialWorkbook(){
  if(isLocked()) return;

  const input = document.getElementById('importWorkbookFile');
  const file = input?.files?.[0];
  if(!file){
    setImportStatus('Selecciona primero un archivo Excel.', 'bad');
    return;
  }
  try{
    await ensureSheetJS();
    const buffer = await file.arrayBuffer();
    const workbook = window.XLSX.read(buffer, {type:'array'});
    const personasRows = readSheetRows(workbook, 'PERSONAS');
    const eventosRows = readSheetRows(workbook, 'EVENTOS');
    const tiendasRows = readSheetRows(workbook, 'TIENDAS');
    const productosRows = readSheetRows(workbook, 'PRODUCTOS');
    const ingresosRows = readSheetRows(workbook, 'INGRESOS');
    const comprasRows = readSheetRows(workbook, 'COMPRAS');
    const ticketsRows = readSheetRows(workbook, 'TICKETS');

    const missing = [];
    ['PERSONAS','EVENTOS','TIENDAS','PRODUCTOS','INGRESOS','COMPRAS'].forEach(name => {
      if(!workbook.SheetNames.find(n => normalizeHeader(n)===name)) missing.push(name);
    });
    if(missing.length){
      setImportStatus('Faltan hojas obligatorias: ' + missing.join(', '), 'bad');
      return;
    }

    const personMap = {};
    const eventMap = {};
    const storeMap = {};
    const storeNameByCode = {};
    const productMap = {};

    const nextState = {
      personas: [],
      eventos: [],
      tiendas: [],
      productos: [],
      colaboradores: [],
      compras: [],
      ticketImages: {},
      selectedEventId: ''
    };

    eventosRows.forEach(row => {
      const code = String(pick(row, ['EVENTO_CODIGO','CODIGO','ID'])).trim();
      const titulo = String(pick(row, ['EVENTO_TITULO','TITULO'])).trim();
      if(!code || !titulo) return;
      const id = uid();
      eventMap[code] = id;
      nextState.eventos.push({
        id,
        titulo,
        precio: parseEuroInput(pick(row, ['EVENTO_PRECIO','PRECIO'], 0)),
        fechaIni: String(pick(row, ['EVENTO_FECHAINI','FECHAINI','FECHA_INI'])).trim(),
        fechaFin: String(pick(row, ['EVENTO_FECHAFIN','FECHAFIN','FECHA_FIN'])).trim(),
        situacion: String(pick(row, ['EVENTO_SITUACION','SITUACION'], 'En curso')).trim() === 'Finalizado' ? 'Finalizado' : 'En curso',
        descripcion: String(pick(row, ['EVENTO_DESCRIPCION','DESCRIPCION'])).trim()
      });
    });

    personasRows.forEach(row => {
      const eventCode = String(pick(row, ['EVENTO_CODIGO'])).trim();
      const code = String(pick(row, ['PERSONA_CODIGO','CODIGO','ID'])).trim();
      const nombre = String(pick(row, ['PERSONA_NOMBRE','NOMBRE'])).trim();
      if(!eventMap[eventCode] || !code || !nombre) return;
      const id = uid();
      personMap[`${eventCode}|${code}`] = id;
      nextState.personas.push({
        id,
        eventId: eventMap[eventCode],
        nombre,
        rango: String(pick(row, ['PERSONA_RANGO','RANGO'], 'SOCIO')).trim().toUpperCase() === 'DONANTE' ? 'DONANTE' : 'SOCIO'
      });
    });

    tiendasRows.forEach(row => {
      const eventCode = String(pick(row, ['EVENTO_CODIGO'])).trim();
      const code = String(pick(row, ['TIENDA_CODIGO','CODIGO','ID'])).trim();
      const nombre = String(pick(row, ['TIENDA_NOMBRE','NOMBRE'])).trim();
      if(!eventMap[eventCode] || !code || !nombre) return;
      const id = uid();
      storeMap[`${eventCode}|${code}`] = id;
      storeNameByCode[`${eventCode}|${code}`] = nombre;
      nextState.tiendas.push({id, eventId:eventMap[eventCode], nombre});
    });

    productosRows.forEach(row => {
      const eventCode = String(pick(row, ['EVENTO_CODIGO'])).trim();
      const code = String(pick(row, ['PRODUCTO_CODIGO','CODIGO','ID'])).trim();
      const nombre = String(pick(row, ['PRODUCTO_NOMBRE','NOMBRE'])).trim();
      if(!eventMap[eventCode] || !code || !nombre) return;
      const id = uid();
      productMap[`${eventCode}|${code}`] = id;
      const tiendaCode = String(pick(row, ['TIENDA_CODIGO'], '')).trim();
      const precioReferencia = parseEuroInput(pick(row, [
        'PRODUCTO_PRECIO_REFERENCIA',
        'PRODUCTO_PRECIO',
        'PRECIO_REFERENCIA',
        'PRECIO_REF',
        'PRECIO',
        'PVP',
        'IMPORTE_REFERENCIA'
      ], 0));
      nextState.productos.push({
        id,
        eventId: eventMap[eventCode],
        nombre,
        segmento: String(pick(row, ['PRODUCTO_SEGMENTO','SEGMENTO'], 'COMIDA')).trim().toUpperCase(),
        destino: String(pick(row, ['PRODUCTO_DESTINO','DESTINO'], 'COMIDA')).trim().toUpperCase(),
        precio: precioReferencia,
        defaultPrecio: precioReferencia,
        tiendaId: storeMap[`${eventCode}|${tiendaCode}`] || ''
      });
    });

    ingresosRows.forEach(row => {
      const eventCode = String(pick(row, ['EVENTO_CODIGO'])).trim();
      const personCode = String(pick(row, ['PERSONA_CODIGO'])).trim();
      if(!eventMap[eventCode] || !personMap[`${eventCode}|${personCode}`]) return;
      nextState.colaboradores.push({
        id: uid(),
        eventId: eventMap[eventCode],
        personaId: personMap[`${eventCode}|${personCode}`],
        numero: Number(pick(row, ['NUMERO'], 0)) || 0,
        situacion: String(pick(row, ['INGRESO','SITUACION'], 'Pendiente')).trim().replace('ING. RURAL','Banco'),
        importe: parseEuroInput(pick(row, ['IMPORTE_VOLUNTARIO','IMPORTE'], 0))
      });
    });

    comprasRows.forEach(row => {
      const eventCode = String(pick(row, ['EVENTO_CODIGO'])).trim();
      const productCode = String(pick(row, ['PRODUCTO_CODIGO'])).trim();
      if(!eventMap[eventCode] || !productMap[`${eventCode}|${productCode}`]) return;
      const respCode = String(pick(row, ['RESPONSABLE_PERSONA_CODIGO','RESPONSABLE_CODIGO'], '')).trim();
      nextState.compras.push({
        id: uid(),
        eventId: eventMap[eventCode],
        productoId: productMap[`${eventCode}|${productCode}`],
        unidades: Number(pick(row, ['UNIDADES','UD'], 0)) || 0,
        ticketDonacion: String(pick(row, ['TICKET_U_OTROS_GASTOS','TICKET_DONACION','TIPO_DE_DONACION','TICKET'], '')).trim(),
        responsableId: personMap[`${eventCode}|${respCode}`] || ''
      });
    });

    const imageInput = document.getElementById('importTicketFiles');
    const imageFiles = Array.from(imageInput?.files || []);
    const imageMap = {};
    for(const fileItem of imageFiles){
      imageMap[fileItem.name.toLowerCase()] = await fileToDataURL(fileItem);
    }
    ticketsRows.forEach(row => {
      const eventCode = String(pick(row, ['EVENTO_CODIGO'])).trim();
      const tiendaCode = String(pick(row, ['TIENDA_CODIGO'])).trim();
      const ticket = String(pick(row, ['TICKET_U_OTROS_GASTOS','TICKET_DONACION','TIPO_DE_DONACION','TICKET'], '')).trim();
      const filename = String(pick(row, ['ARCHIVO_IMAGEN','ARCHIVO','FOTO'], '')).trim();
      const base64Image = String(pick(row, ['IMAGEN_BASE64'], '')).trim();
      if(!eventMap[eventCode] || !storeNameByCode[`${eventCode}|${tiendaCode}`] || !ticket) return;
      let dataUrl = '';
      if(base64Image){
        dataUrl = base64Image;
      } else if(filename){
        dataUrl = imageMap[filename.toLowerCase()] || '';
      }
      if(!dataUrl) return;
      const key = `${storeNameByCode[`${eventCode}|${tiendaCode}`]} | ${ticket}`;
      nextState.ticketImages[ticketImageStateKey(key, eventMap[eventCode])] = dataUrl;
    });

    nextState.selectedEventId = nextState.eventos[0]?.id || '';
    Object.assign(state, nextState);
    document.getElementById('maintenanceWrapper').classList.add('hidden');
    render();
    setImportStatus(
      'Importación completada.\n' +
      `EVENTOS: ${nextState.eventos.length}\n` +
      `PERSONAS: ${nextState.personas.length}\n` +
      `TIENDAS: ${nextState.tiendas.length}\n` +
      `PRODUCTOS: ${nextState.productos.length}\n` +
      `INGRESOS: ${nextState.colaboradores.length}\n` +
      `COMPRAS: ${nextState.compras.length}\n` +
      `TICKETS CON FOTO: ${Object.keys(nextState.ticketImages).length}`,
      'ok'
    );
  }catch(err){
    setImportStatus('Error en la importación: ' + (err?.message || err), 'bad');
  }
}

function defaultState(){
  const defaults = {
    personas: [
      {id:uid(), nombre:'Jesús y acompañante', rango:'SOCIO'},
      {id:uid(), nombre:'Ana', rango:'SOCIO'},
      {id:uid(), nombre:'Fundación amiga', rango:'DONANTE'}
    ],
    eventos: [
      {id:uid(), titulo:'Comida Primavera', precio:15, fechaIni:'01/05/25', fechaFin:'02/05/25', situacion:'En curso', descripcion:'Evento de ejemplo para organizar compras y colaboración económica.'},
      {id:uid(), titulo:'Cena Verano', precio:20, fechaIni:'15/08/25', fechaFin:'16/08/25', situacion:'En curso', descripcion:'Segundo evento de ejemplo.'}
    ],
    tiendas: [
      {id:uid(), nombre:'Leroy Merlin'},
      {id:uid(), nombre:'Mercadona'}
    ],
    productos: [],
    colaboradores: [],
    compras: [],
    ticketImages: {},
    comprasSort: 'producto',
    summaryTiendaSort: 'tienda',
    selectedEventId: ''
  };
  defaults.selectedEventId = defaults.eventos[0].id;
  defaults.productos = [
    {id:uid(), nombre:'Refresco', segmento:'BEBIDA', destino:'APERITIVO'},
    {id:uid(), nombre:'Carbón', segmento:'INFRAESTRUCTURA', destino:'INFRAESTRUCTURA'}
  ];
  return defaults;
}

function mergeLoadedState(parsed, defaults){
  parsed = parsed || {};
  return {
    ...defaults,
    ...parsed,
    personas: (parsed.personas || defaults.personas).map(p => ({
      id: p.id || uid(),
      nombre: p.nombre || '',
      rango: p.rango || 'SOCIO'
    })),
    eventos: (parsed.eventos || defaults.eventos).map(e => ({
      id: e.id || uid(),
      titulo: e.titulo || '',
      precio: Number(e.precio || 0),
      fechaIni: e.fechaIni || '',
      fechaFin: e.fechaFin || '',
      situacion: e.situacion || 'En curso',
      descripcion: e.descripcion || ''
    })),
    tiendas: (parsed.tiendas || defaults.tiendas).map(t => ({
      id: t.id || uid(),
      nombre: t.nombre || ''
    })),
    productos: (parsed.productos || defaults.productos).map(p => {
      const precioReferencia = Number(p.defaultPrecio ?? p.precio ?? 0) || 0;
      return {
        ...p,
        id: p.id || uid(),
        eventId: p.eventId || '',
        nombre: p.nombre || '',
        segmento: p.segmento || '',
        destino: p.destino || '',
        precio: Number(p.precio ?? precioReferencia) || 0,
        defaultPrecio: precioReferencia,
        tiendaId: p.tiendaId || '',
        defaultTiendaId: p.defaultTiendaId || p.tiendaId || ''
      };
    }),
    colaboradores: (parsed.colaboradores || []).map(c => ({
      ...c,
      id: c.id || uid(),
      eventId: c.eventId || '',
      personaId: c.personaId || '',
      numero: Number(c.numero || 0),
      situacion: c.situacion || 'Pendiente',
      importe: Number(c.importe || 0)
    })),
    compras: (parsed.compras || []).map(c => ({
      ...c,
      id: c.id || uid(),
      eventId: c.eventId || '',
      productoId: c.productoId || '',
      unidades: Number(c.unidades || 0),
      ticketDonacion: c.ticketDonacion || '',
      responsableId: c.responsableId || '',
      precio: Number(c.precio || 0),
      tiendaId: c.tiendaId || '',
      donorRef: c.donorRef || ''
    })),
    ticketImages: parsed.ticketImages || {},
    comprasSort: parsed.comprasSort || defaults.comprasSort,
    summaryTiendaSort: parsed.summaryTiendaSort || defaults.summaryTiendaSort,
    selectedEventId: parsed.selectedEventId || defaults.selectedEventId
  };
}

function loadState(){
  const defaults = defaultState();

  try{
    if(window.__CONTROL_EVENT_STATE__ && typeof window.__CONTROL_EVENT_STATE__ === 'object'){
      return mergeLoadedState(window.__CONTROL_EVENT_STATE__, defaults);
    }
  }catch(_){}

  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw){
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(raw);
    return mergeLoadedState(parsed, defaults);
  } catch(e){
    return defaults;
  }
}

let __remoteSaveTimer = null;
let __remoteSaveInFlight = false;
let __remoteSaveQueued = false;

async function pushStateToServer(){
  if(__remoteSaveInFlight){
    __remoteSaveQueued = true;
    return;
  }
  __remoteSaveInFlight = true;
  try{
    const res = await fetch('/api/state', {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(state)
    });
    if(!res.ok){
      const txt = await res.text();
      throw new Error('Error guardando en servidor: ' + txt);
    }
  }catch(err){
    console.error(err);
  }finally{
    __remoteSaveInFlight = false;
    if(__remoteSaveQueued){
      __remoteSaveQueued = false;
      setTimeout(pushStateToServer, 50);
    }
  }
}

function saveState(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }catch(_){}

  if(!authUser || !canWriteRole()) return;

  clearTimeout(__remoteSaveTimer);
  __remoteSaveTimer = setTimeout(() => {
    pushStateToServer();
  }, 150);
}
function selectedEvent(){ return state.eventos.find(e => e.id === state.selectedEventId) || null; }
function personaById(id){ return state.personas.find(p => p.id === id) || null; }
function productoById(id){ return state.productos.find(p => p.id === id) || null; }
function tiendaById(id){ return state.tiendas.find(t => t.id === id) || null; }
function isLocked(){ return ((selectedEvent()?.situacion || 'En curso') === 'Finalizado'); }
function canUnlockFinalizedEvent(){ return isGodRole() && isLocked(); }

function collabsForEvent(){
  return state.colaboradores
    .filter(c => c.eventId === state.selectedEventId)
    .map(c => {
      const persona = personaById(c.personaId);
      const base = persona?.rango === 'SOCIO' ? Number(c.numero || 0) * Number(selectedEvent()?.precio || 0) : 0;
      const donation = Number(c.importe || 0);
      const total = base + donation;
      return {...c, persona, base, donation, total};
    })
    .sort((a,b) => {
      const order = {'Pendiente':0,'Efectivo':1,'Bizum':2,'Banco':3};
      const oa = order[a.situacion] ?? 9, ob = order[b.situacion] ?? 9;
      if(oa !== ob) return oa - ob;
      return (a.persona?.nombre || '').localeCompare((b.persona?.nombre || ''), 'es');
    });
}

function comprasForEvent(){
  return state.compras
    .filter(c => c.eventId === state.selectedEventId)
    .map(c => {
      const producto = productoById(c.productoId);
      const tienda = tiendaById(producto?.tiendaId || '');
      const valor = Number(producto?.precio || 0) * Number(c.unidades || 0);
      const importe = isDonationTicket(c.ticketDonacion) ? 0 : valor;
      return {
        ...c,
        producto,
        tienda,
        valor,
        importe,
        responsable: personaById(c.responsableId || '')
      };
    })
    .sort((a,b) => {
      const ta = (a.tienda?.nombre || '').localeCompare((b.tienda?.nombre || ''), 'es');
      if(ta !== 0) return ta;
      return String(a.ticketDonacion || '').localeCompare(String(b.ticketDonacion || ''), 'es');
    });
}

function ingresoSummary(){
  const rows = collabsForEvent();
  const base = PAYMENT_OPTIONS.map(tipo => {
    const subset = rows.filter(r => r.situacion === tipo);
    return {
      tipo,
      personas: subset.reduce((a,b)=>a+Number(b.numero||0),0),
      importe: subset.reduce((a,b) => a + b.total, 0)
    };
  });
  base.push({
    tipo:'TOTAL INGRESOS',
    personas: base.reduce((a,b)=>a+b.personas,0),
    importe: base.reduce((a,b)=>a+b.importe,0)
  });
  return base;
}

function budgetSummary(){
  const rows = collabsForEvent();
  const compras = comprasForEvent();

  const sociosRows = rows.filter(r => r.persona?.rango === 'SOCIO');
  const donantesRows = rows.filter(r => r.persona?.rango === 'DONANTE');

  const sociosCount = sociosRows.reduce((a,b) => a + Number(b.numero || 0), 0);
  const donantesCount = donantesRows.reduce((a,b) => a + Number(b.numero || 0), 0);

  const sociosImporte = sociosRows.reduce((a,b) => a + b.total, 0);
  const sociosIngresado = sociosRows.filter(r => r.situacion !== 'Pendiente').reduce((a,b) => a + b.total, 0);
  const sociosPendiente = sociosRows.filter(r => r.situacion === 'Pendiente').reduce((a,b) => a + b.total, 0);

  const donantesImporte = donantesRows.reduce((a,b) => a + b.total, 0);
  const donantesIngresado = donantesRows.filter(r => r.situacion !== 'Pendiente').reduce((a,b) => a + b.total, 0);
  const donantesPendiente = donantesRows.filter(r => r.situacion === 'Pendiente').reduce((a,b) => a + b.total, 0);

  const dineroIngresado = sociosIngresado + donantesIngresado;

  const comprasValorTotal = compras.reduce((a,b) => a + b.valor, 0);
  const comprasResueltas = compras.filter(c => {
    const tk = String(c.ticketDonacion || '').trim();
    return tk !== '' && tk !== 'GASTOS CORRIENTES' && !isDonationTicket(tk);
  }).reduce((a,b) => a + b.valor, 0);

  const comprasPendientes = compras.filter(c => String(c.ticketDonacion || '').trim() === '').reduce((a,b) => a + b.valor, 0);
  const donadoTienda = compras.filter(c => String(c.ticketDonacion || '').trim() === 'DONADO TIENDA').reduce((a,b) => a + b.valor, 0);
  const donadoSocio = compras.filter(c => String(c.ticketDonacion || '').trim() === 'DONADO SOCIO').reduce((a,b) => a + b.valor, 0);
  const donadoOtros = compras.filter(c => String(c.ticketDonacion || '').trim() === 'DONADO OTROS').reduce((a,b) => a + b.valor, 0);
  const valorDonado = donadoTienda + donadoSocio + donadoOtros;

  const gastosOrganizacion = compras.filter(c => String(c.ticketDonacion || '').trim() === 'GASTOS CORRIENTES').reduce((a,b) => a + b.valor, 0);
  const saldoOperativo = dineroIngresado - comprasResueltas - gastosOrganizacion;

  return {
    ingresosDinero: {
      socios: {count:sociosCount, importe:sociosImporte, ingresado:sociosIngresado, pendiente:sociosPendiente},
      donantes: {count:donantesCount, importe:donantesImporte, ingresado:donantesIngresado, pendiente:donantesPendiente},
      totalIngresado: dineroIngresado
    },
    donacionProducto: {donadoTienda, donadoSocio, donadoOtros, valorDonado},
    operativa: {
      ingresoDinero: dineroIngresado,
      gastoCompras: comprasResueltas,
      gastosOrganizacion,
      pendiente: comprasPendientes,
      saldoOperativo
    },
    compras: {
      total: comprasValorTotal,
      resueltas: comprasResueltas,
      pendientes: comprasPendientes,
      valorDonado,
      gastosCorrientes: gastosOrganizacion,
      saldoReal: saldoOperativo
    }
  };
}

function summaryBySegmento(){
  const compras = comprasForEvent();
  return SEGMENT_OPTIONS.flatMap(seg => {
    const comprado = compras.filter(c => (c.producto?.segmento || '') === seg && String(c.ticketDonacion || '').trim() !== '').reduce((a,b) => a + b.valor, 0);
    const pdte = compras.filter(c => (c.producto?.segmento || '') === seg && String(c.ticketDonacion || '').trim() === '').reduce((a,b) => a + b.valor, 0);
    return [
      {k: `${seg} Comprado o donado`, v: comprado, pending:false, donated:false},
      {k: `${seg} Pte.Compra u otros gastos`, v: pdte, pending:true, donated:false},
    ];
  });
}

function summaryByDestino(){
  const compras = comprasForEvent();
  return DESTINO_OPTIONS.flatMap(dest => {
    const comprado = compras.filter(c => (c.producto?.destino || '') === dest && String(c.ticketDonacion || '').trim() !== '').reduce((a,b) => a + b.valor, 0);
    const pdte = compras.filter(c => (c.producto?.destino || '') === dest && String(c.ticketDonacion || '').trim() === '').reduce((a,b) => a + b.valor, 0);
    return [
      {k: `${dest} Comprado o donado`, v: comprado, pending:false, donated:false},
      {k: `${dest} Pte.Compra u otros gastos`, v: pdte, pending:true, donated:false},
    ];
  });
}

function ticketImageStateKey(key, eventId=''){ return `${eventId || state.selectedEventId}|${key}`; }

function summaryByTiendaTicket(){
  const filled = {};
  const pending = {};
  comprasForEvent().forEach(c => {
    const tienda = c.tienda?.nombre || 'Sin tienda';
    const rawTicket = String(c.ticketDonacion || '').trim();
    const productName = String(c.producto?.nombre || '').trim();

    if(rawTicket === ''){
      const key = `${tienda} | Pte.Compra u otros gastos`;
      pending[key] = (pending[key] || 0) + c.valor;
      return;
    }

    const donated = isDonationTicket(rawTicket);
    const ticketLabel = donated ? rawTicket : rawTicket;
    const key = `${tienda} | ${ticketLabel}`;

    if(!filled[key]){
      filled[key] = {
        v: 0,
        donated,
        rawTicket,
        products: []
      };
    }

    filled[key].v += c.valor;
    filled[key].donated = filled[key].donated || donated;
    if(donated && productName && !filled[key].products.includes(productName)){
      filled[key].products.push(productName);
    }
  });

  const rows = Object.entries(filled).map(([k,obj]) => {
    const label = obj.donated && obj.products.length
      ? `${k} · ${obj.products.join(' · ')}`
      : k;
    return {
      k,
      label,
      v: obj.v,
      pending: false,
      donated: obj.donated,
      attachable: !obj.donated && obj.rawTicket !== 'GASTOS CORRIENTES',
      image: (!obj.donated && obj.rawTicket !== 'GASTOS CORRIENTES' && obj.v > 0 && state.ticketImages?.[ticketImageStateKey(k)]) ? state.ticketImages[ticketImageStateKey(k)] : ''
    };
  }).concat(
    Object.entries(pending).map(([k,v]) => ({
      k,
      label: k,
      v,
      pending: true,
      donated: false,
      attachable: false,
      image: ''
    }))
  );

  const sortMode = state.summaryTiendaSort || 'tienda';
  rows.sort((a,b)=>{
    const [ta='',tk=''] = a.k.split(' | ');
    const [tb='',tl=''] = b.k.split(' | ');
    if(sortMode === 'ticket'){
      const s1 = tk.localeCompare(tl,'es');
      if(s1 !== 0) return s1;
      return ta.localeCompare(tb,'es');
    }
    const s1 = ta.localeCompare(tb,'es');
    if(s1 !== 0) return s1;
    return tk.localeCompare(tl,'es');
  });
  return rows;
}

function renderSummaryList(targetId, rows){
  const wrap = document.getElementById(targetId);
  wrap.innerHTML = '';

  if(targetId === 'summaryTiendaTicket'){
    const tools = document.createElement('div');
    tools.className = 'hint';
    tools.innerHTML = 'Ordenar por: <a href="#" onclick="state.summaryTiendaSort=\'tienda\'; renderBudget(); return false;">Tienda</a> · <a href="#" onclick="state.summaryTiendaSort=\'ticket\'; renderBudget(); return false;">Ticket/Donación/Otros Gastos</a>';
    wrap.appendChild(tools);
  }

  if(!rows.length){
    const empty = document.createElement('div');
    empty.className = 'hint';
    empty.textContent = 'Sin datos.';
    wrap.appendChild(empty);
    return;
  }

  let total = 0;
  rows.forEach((r, idx) => {
    total += Number(r.v || 0);
    const div = document.createElement('div');
    div.className = 'summary-item';
    if(r.pending) div.classList.add('red-row');
    const amountHtml = `<span class="pill"${r.pending ? ' style="background:#fef2f2;color:#b91c1c"' : (r.donated ? ' style="text-decoration:line-through"' : '')}>${money(r.v)}</span>`;
    const textLabel = r.label || r.k;

    if(targetId === 'summaryTiendaTicket' && !r.pending && r.attachable){
      const inputId = `ticketUpload_${idx}`;
      const encodedKey = encodeURIComponent(r.k);
      const preview = r.image ? `<img class="ticket-thumb" src="${r.image}" alt="ticket" />` : '';
      div.innerHTML = `<span>${escapeHtml(textLabel)}</span><span style="display:flex;align-items:center;gap:8px;">${amountHtml}<span class="ticket-actions"><button type="button" class="outline small" onclick="document.getElementById('${inputId}').click()">📎</button><input id="${inputId}" class="ticket-file-input" type="file" accept="image/*" onchange="uploadTicketImage(event, '${encodedKey}')">${preview}${r.image ? `<button type="button" class="outline small" onclick="removeTicketImage('${encodedKey}')">🗑️</button>` : ''}</span></span>`;
    } else {
      div.innerHTML = `<span>${escapeHtml(textLabel)}</span>${amountHtml}`;
    }
    wrap.appendChild(div);
    if((targetId === 'summarySegmento' || targetId === 'summaryDestino') && idx % 2 === 1 && idx < rows.length - 1){
      const sep = document.createElement('div');
      sep.className = 'separator';
      sep.style.margin = '8px 0';
      wrap.appendChild(sep);
    }
  });

  const totalDiv = document.createElement('div');
  totalDiv.className = 'summary-item';
  totalDiv.style.fontWeight = '800';
  totalDiv.innerHTML = `<span>TOTAL</span><span class="pill">${money(total)}</span>`;
  wrap.appendChild(totalDiv);
}

function uploadTicketImage(event, encodedKey){
  const file = event.target.files && event.target.files[0];
  if(!file) return;
  const key = decodeURIComponent(encodedKey);
  const reader = new FileReader();
  reader.onload = function(loadEvent){
    const img = new Image();
    img.onload = function(){
      const maxW = 700, maxH = 700;
      let {width, height} = img;
      const ratio = Math.min(maxW / width, maxH / height, 1);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      if(!state.ticketImages) state.ticketImages = {};
      state.ticketImages[ticketImageStateKey(key)] = dataUrl;
      render();
    };
    img.src = loadEvent.target.result;
  };
  reader.readAsDataURL(file);
}
function removeTicketImage(encodedKey){
  const key = decodeURIComponent(encodedKey);
  if(state.ticketImages) delete state.ticketImages[ticketImageStateKey(key)];
  render();
}


function renderEnvironmentBanner(){
  let box = document.getElementById('envBanner');
  if(!box){
    box = document.createElement('div');
    box.id = 'envBanner';
    box.style.cssText = 'display:none;position:sticky;top:0;z-index:60;padding:10px 14px;background:#fff7ed;color:#9a3412;border-bottom:1px solid #fed7aa;font-size:13px;font-weight:700';
    document.body.prepend(box);
  }
  if(location.protocol === 'file:'){
    box.style.display = 'block';
    box.textContent = 'Abre la app desde http://127.0.0.1:8080 y no directamente con doble clic, para evitar problemas de carga.';
  }else{
    box.style.display = 'none';
  }
}

function render(){
  renderEnvironmentBanner();
  renderAuthUI();
  if(!authUser) return;
  saveState();
  renderHeader();
  renderTabVisibility();
  renderMainSelectors();
  renderIngresosSummary();
  renderColabs();
  renderBudget();
  renderCompras();
  renderDonaciones();
  renderMaintenance();
  renderPermissions();
  renderLockState();
}


function hasAuth(){ return !!authUser; }
function canWriteRole(){ return !!authUser && ['RW','GD'].includes(String(authUser.nivel||'')); }
function isGodRole(){ return !!authUser && String(authUser.nivel||'') === 'GD'; }

function renderAuthUI(){
  const overlay = document.getElementById('authOverlay');
  const logout = document.getElementById('btnLogout');
  const nameBox = document.getElementById('brandCurrentUserName');
  const levelBox = document.getElementById('brandCurrentUserMeta');

  document.body.classList.toggle('auth-locked', !authUser);
  if(overlay) overlay.classList.toggle('hidden', !!authUser);
  if(logout) logout.classList.toggle('hidden', !authUser);
  if(nameBox) nameBox.textContent = authUser ? authUser.nombre : 'Sin acceso';
  if(levelBox) levelBox.textContent = authUser ? `${authUser.identificacion} (${authUser.nivel})` : '';
}

async function doLogin(){
  if(authBusy) return;
  const ident = (document.getElementById('loginIdentificacion')?.value || '').trim();
  const clave = document.getElementById('loginClave')?.value || '';
  const error = document.getElementById('authError');
  if(error) error.textContent = '';
  if(!ident || !clave){
    if(error) error.textContent = 'Introduce identificación y clave.';
    return;
  }
  authBusy = true;
  try{
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({identificacion: ident, clave})
    });
    const data = await res.json();
    if(!res.ok || !data.ok) throw new Error(data.error || 'Acceso no válido');
    authUser = data.user;
    const fresh = await fetch('/api/state', {cache:'no-store'});
    const serverState = await fresh.json();
    Object.keys(state).forEach(k => { delete state[k]; });
    Object.assign(state, mergeLoadedState(serverState, defaultState()));
    if(isGodRole()) await fetchAccessUsers();
    if(document.getElementById('loginClave')) document.getElementById('loginClave').value = '';
    render();
  }catch(err){
    if(error) error.textContent = err?.message || String(err);
  }finally{
    authBusy = false;
  }
}

function toggleEventDescription(){
  showEventDesc = !showEventDesc;
  renderHeader();
}

function toggleChangePasswordPanel(){
  const panel = document.getElementById('changePasswordPanel');
  const error = document.getElementById('authError');
  if(error) error.textContent = '';
  if(panel) panel.classList.toggle('hidden');
}

async function doChangePassword(){
  if(authBusy) return;
  const ident = (document.getElementById('loginIdentificacion')?.value || '').trim();
  const actual = document.getElementById('loginClave')?.value || '';
  const nueva1 = document.getElementById('changeNewPassword1')?.value || '';
  const nueva2 = document.getElementById('changeNewPassword2')?.value || '';
  const error = document.getElementById('authError');
  if(error) error.textContent = '';

  if(!ident || !actual){
    if(error) error.textContent = 'Introduce identificación y clave actual.';
    return;
  }
  if(!nueva1 || !nueva2){
    if(error) error.textContent = 'Introduce la nueva clave dos veces.';
    return;
  }
  if(nueva1 !== nueva2){
    if(error) error.textContent = 'Las nuevas claves no coinciden.';
    return;
  }

  authBusy = true;
  try{
    const res = await fetch('/api/change-password', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({identificacion: ident, claveActual: actual, claveNueva: nueva1})
    });
    const data = await res.json();
    if(!res.ok || !data.ok) throw new Error(data.error || 'No se pudo cambiar la clave.');
    if(error) error.textContent = 'Clave cambiada correctamente.';
    const p1 = document.getElementById('changeNewPassword1');
    const p2 = document.getElementById('changeNewPassword2');
    const panel = document.getElementById('changePasswordPanel');
    if(p1) p1.value = '';
    if(p2) p2.value = '';
    if(panel) panel.classList.add('hidden');
  }catch(err){
    if(error) error.textContent = err?.message || String(err);
  }finally{
    authBusy = false;
  }
}

async function doLogout(){
  try{ await fetch('/api/logout', {method:'POST'}); }catch(_){}
  authUser = null;
  accessUsers = [];
  const ident = document.getElementById('loginIdentificacion');
  const clave = document.getElementById('loginClave');
  const nueva1 = document.getElementById('changeNewPassword1');
  const nueva2 = document.getElementById('changeNewPassword2');
  const panel = document.getElementById('changePasswordPanel');
  const error = document.getElementById('authError');
  if(ident) ident.value = '';
  if(clave) clave.value = '';
  if(nueva1) nueva1.value = '';
  if(nueva2) nueva2.value = '';
  if(panel) panel.classList.add('hidden');
  if(error) error.textContent = '';
  renderAuthUI();
}

async function fetchAccessUsers(){
  if(!isGodRole()) return;
  try{
    const res = await fetch('/api/access-users', {cache:'no-store'});
    const data = await res.json();
    if(res.ok && data.ok) accessUsers = data.items || [];
  }catch(_){}
}

function renderPermissions(){
  const ro = authUser?.nivel === 'RO';
  const gd = authUser?.nivel === 'GD';
  const accessBtn = document.getElementById('mtAccesoBtn');
  const accessCard = document.getElementById('mtAcceso');
  if(accessBtn) accessBtn.classList.toggle('hidden', !gd);
  if(accessCard) accessCard.classList.toggle('hidden-by-role', !gd);

  const writeSelectors = [
    '#btnAddPersona','#btnAddTienda','#btnAddProducto','#btnAddColab','#btnAddCompra','#btnAddDonacion',
    '#btnStartImport','#btnTogglePower',
    '#newPersonaNombre','#newPersonaRango',
    '#newTiendaNombre','#newProductoNombre','#newProductoSegmento','#newProductoDestino',
    '#collabPersona','#collabNumero','#collabSituacion','#collabImporte',
    '#buyProducto','#buyUnidades','#buyPrecio','#buyTienda','#buyTicket','#buyResponsable',
    '#donProducto','#donUnidades','#donPrecio','#donTicket','#donDonante','#donResponsable'
  ];
  writeSelectors.forEach(sel => document.querySelectorAll(sel).forEach(el => { el.disabled = ro; }));

  const eventSelectors = ['#btnAddEvento','#newEventoTitulo','#newEventoPrecio','#newEventoFechaIni','#newEventoFechaFin','#newEventoSituacion','#newEventoDescripcion'];
  eventSelectors.forEach(sel => document.querySelectorAll(sel).forEach(el => { el.disabled = !gd; }));

  document.querySelectorAll('[data-action^="edit-"], [data-action^="save-"], [data-action^="delete-"]').forEach(el => {
    const action = el.getAttribute('data-action') || '';
    const isAccess = action.includes('acceso');
    const isEvent = action.includes('evento');
    const disable = isAccess ? !gd : (isEvent ? !gd : ro);
    el.disabled = disable;
  });
  ['#newAccesoIdentificacion','#newAccesoNombre','#newAccesoClave','#newAccesoNivel','#btnAddAcceso'].forEach(sel => {
    document.querySelectorAll(sel).forEach(el => { el.disabled = !gd; });
  });
}

function renderHeader(){
  const ev = selectedEvent();
  document.getElementById('selectedEvent').innerHTML = state.eventos
    .slice()
    .sort((a,b)=>(a.titulo||'').localeCompare((b.titulo||''),'es'))
    .map(e => `<option value="${e.id}" ${e.id===state.selectedEventId?'selected':''}>${escapeHtml(e.titulo)}</option>`)
    .join('');
  document.getElementById('eventDates').textContent = `(del ${ev?.fechaIni || '--/--/--'} al ${ev?.fechaFin || '--/--/--'})`;
  const st = document.getElementById('eventStatus');
  const fin = isLocked();
  st.textContent = ev?.situacion || 'En curso';
  st.className = 'status-pill ' + (fin ? 'status-finalizado' : 'status-curso');
  const bubble = document.getElementById('eventDescBubble');
  if(bubble){
    bubble.textContent = ev?.descripcion || 'Sin descripción del evento.';
    bubble.classList.toggle('hidden', !showEventDesc);
  }
  const p = document.getElementById('btnTogglePower');
  if(p) p.className = 'powerbtn ' + (fin ? 'off' : 'on');
  const dt = document.getElementById('headerDateTime');
  if(dt) dt.textContent = new Date().toLocaleString('es-ES');
}

function renderTabVisibility(){
  const hasEvent = !!selectedEvent();
  document.getElementById('noEventMessage').classList.toggle('hidden', hasEvent);
  document.getElementById('tabIngresos').classList.toggle('hidden', currentMainTab !== 'ingresos' || !hasEvent);
  document.getElementById('tabCompras').classList.toggle('hidden', currentMainTab !== 'compras' || !hasEvent);
  document.getElementById('tabDonaciones').classList.toggle('hidden', currentMainTab !== 'donaciones' || !hasEvent);
  document.getElementById('tabResumen').classList.toggle('hidden', currentMainTab !== 'resumen' || !hasEvent);
  document.getElementById('tabGraficas').classList.toggle('hidden', currentMainTab !== 'graficas' || !hasEvent);
  document.getElementById('tabIngresosBtn').classList.toggle('active', currentMainTab === 'ingresos');
  document.getElementById('tabComprasBtn').classList.toggle('active', currentMainTab === 'compras');
  document.getElementById('tabDonacionesBtn').classList.toggle('active', currentMainTab === 'donaciones');
  document.getElementById('tabResumenBtn').classList.toggle('active', currentMainTab === 'resumen');
  document.getElementById('tabGraficasBtn').classList.toggle('active', currentMainTab === 'graficas');
  const comprasBody = document.getElementById('comprasEventBody');
  if(comprasBody) comprasBody.classList.toggle('hidden', !showComprasEvent);
}

function renderMainSelectors(){
  const personas = personasForSelectedEvent().slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
  const productos = productosForSelectedEvent().slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));

  document.getElementById('collabPersona').innerHTML =
    '<option value="" selected>Busca colaborador/a.....</option>' +
    personas.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)} (${escapeHtml(p.rango)})</option>`).join('');

  document.getElementById('collabSituacion').innerHTML = PAYMENT_OPTIONS.map(v => `<option value="${v}">${v}</option>`).join('');

  document.getElementById('buyProducto').innerHTML =
    '<option value="" selected>Busca un producto....</option>' +
    productos.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`).join('');
  document.getElementById('buyTicket').innerHTML = PURCHASE_TICKET_OPTIONS.map(v => `<option value="${v}">${v === '' ? '-- Pte.Compra u otros gastos --' : escapeHtml(v)}</option>`).join('');
  document.getElementById('buyResponsable').innerHTML = '<option value="">-- sin responsable --</option>' + socioResponsableOptions().map(p => `<option value="${p.value}">${escapeHtml(p.label)}</option>`).join('');

  document.getElementById('donProducto').innerHTML =
    '<option value="" selected>Busca un producto....</option>' +
    productos.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`).join('');
  document.getElementById('donTicket').innerHTML = DONATION_TICKET_OPTIONS.map(v => `<option value="${v}">${escapeHtml(v)}</option>`).join('');
  document.getElementById('donDonante').innerHTML =
    '<option value="" selected>Busca donante.....</option>' +
    donorOptions().map(d => `<option value="${d.value}">${escapeHtml(d.label)}</option>`).join('');
  document.getElementById('donResponsable').innerHTML = '<option value="">-- sin responsable --</option>' + socioResponsableOptions().map(p => `<option value="${p.value}">${escapeHtml(p.label)}</option>`).join('');

  updateBuyPreview();
  updateDonationPreview();
}

function renderIngresosSummary(){
  const grid = document.getElementById('ingresosSummaryGrid');
  grid.innerHTML = '';
  ingresoSummary().forEach(item => {
    const div = document.createElement('div');
    const cls = item.tipo === 'Pendiente' ? 'warn' : (item.tipo === 'TOTAL INGRESOS' ? 'ok' : 'ok');
    div.className = 'metric ' + cls;
    div.innerHTML = `<div class="label">${escapeHtml(item.tipo)}</div><div class="value">${item.personas} · ${money(item.importe)}</div>`;
    grid.appendChild(div);
  });
}

function renderColabs(){
  const wrap = document.getElementById('collabList');
  const rows = collabsForEvent();
  if(!rows.length){
    wrap.innerHTML = '<div class="empty">Todavía no hay personas colaboradoras para este evento.</div>';
    return;
  }
  wrap.innerHTML = '';
  rows.forEach(r => {
    const row = document.createElement('div');
    row.className = 'itemcard';
    if(r.situacion === 'Pendiente') row.classList.add('red-row');
    row.innerHTML = `
      <div class="rowline collab">
        <div class="field">
          <label>Colaborador/a</label>
          <select data-action="edit-collab-persona" data-id="${r.id}">
            ${personasForSelectedEvent().slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es')).map(p => `<option value="${p.id}" ${p.id===r.personaId?'selected':''}>${escapeHtml(p.nombre)} (${escapeHtml(p.rango)})</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Número</label>
          <input type="number" min="0" step="1" value="${Number(r.numero||0)}" data-action="edit-collab-numero" data-id="${r.id}" />
        </div>
        <div class="field">
          <label>Ingreso</label>
          <select data-action="edit-collab-situacion" data-id="${r.id}">
            ${PAYMENT_OPTIONS.map(v => `<option value="${v}" ${v===r.situacion?'selected':''}>${v}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Importe obligatorio</label>
          <input class="soft-readonly" readonly value="${money(r.base)}" />
        </div>
        <div class="field">
          <label>Importe voluntario</label><input class="money-text" type="text" value="${euroInputValue(r.importe||0)}" data-action="edit-collab-importe" data-id="${r.id}" /></div><div style="display:flex;gap:8px;align-items:end"><button type="button" class="modify small" data-action="save-collab" data-id="${r.id}">Modificar</button><button type="button" class="danger small" data-action="delete-collab" data-id="${r.id}">Eliminar</button></div>
      </div>
    `;
    wrap.appendChild(row);
  });
}

function renderBudget(){
  const wrap = document.getElementById('budgetLayout');
  const b = budgetSummary();
  if(wrap){
    wrap.innerHTML = `
      <div class="budget-panel socios">
        <h3>INGRESOS EN DINERO</h3>
        <div class="budget-rows">
          <div class="budget-row budget-subgroup"><strong>SOCIOS</strong><span>${escapeHtml(money(b.ingresosDinero.socios.ingresado))}</span></div>
          <div class="budget-subrows">
            <div class="budget-subrow"><span>Personas</span><span>${escapeHtml(String(b.ingresosDinero.socios.count))}</span></div>
            <div class="budget-subrow"><span>Importe socios</span><span>${escapeHtml(money(b.ingresosDinero.socios.importe))}</span></div>
            <div class="budget-subrow"><span>Ingresado socios</span><span>${escapeHtml(money(b.ingresosDinero.socios.ingresado))}</span></div>
            <div class="budget-subrow"><span>Pendiente socios</span><span>${escapeHtml(money(b.ingresosDinero.socios.pendiente))}</span></div>
          </div>
          <div class="budget-row budget-subgroup"><strong>NO SOCIOS</strong><span>${escapeHtml(money(b.ingresosDinero.donantes.ingresado))}</span></div>
          <div class="budget-subrows">
            <div class="budget-subrow"><span>Personas</span><span>${escapeHtml(String(b.ingresosDinero.donantes.count))}</span></div>
            <div class="budget-subrow"><span>Importe donantes</span><span>${escapeHtml(money(b.ingresosDinero.donantes.importe))}</span></div>
            <div class="budget-subrow"><span>Ingresado donantes</span><span>${escapeHtml(money(b.ingresosDinero.donantes.ingresado))}</span></div>
            <div class="budget-subrow"><span>Pendiente donantes</span><span>${escapeHtml(money(b.ingresosDinero.donantes.pendiente))}</span></div>
          </div>
        </div>
      </div>
      <div class="budget-panel donantes">
        <h3>DONACIÓN DE PRODUCTO</h3>
        <div class="budget-rows">
          <div class="budget-subrows">
            <div class="budget-subrow"><span>Donación de producto tiendas</span><span>${escapeHtml(money(b.donacionProducto.donadoTienda))}</span></div>
            <div class="budget-subrow"><span>Donación de producto socios</span><span>${escapeHtml(money(b.donacionProducto.donadoSocio))}</span></div>
            <div class="budget-subrow"><span>Donación de producto no socios</span><span>${escapeHtml(money(b.donacionProducto.donadoOtros))}</span></div>
          </div>
          <div class="budget-row budget-subgroup"><strong>Valor producto donado</strong><span>${escapeHtml(money(b.donacionProducto.valorDonado))}</span></div>
        </div>
      </div>
      <div class="budget-panel operativo">
        <h3>OPERATIVA</h3>
        <div class="budget-rows">
          <div class="budget-row"><strong>INGRESO DINERO</strong><span>${escapeHtml(money(b.operativa.ingresoDinero))}</span></div>
          <div class="budget-row"><strong>GASTO POR COMPRAS</strong><span>${escapeHtml(money(b.operativa.gastoCompras))}</span></div>
          <div class="budget-row"><strong>GASTOS DE ORGANIZACIÓN</strong><span>${escapeHtml(money(b.operativa.gastosOrganizacion))}</span></div>
          <div class="budget-row"><strong>PTE. DE COMPRAS Y/O GASTOS DE ORGANIZACIÓN</strong><span style="color:#c2410c">${escapeHtml(money(b.operativa.pendiente))}</span></div>
          <div class="budget-row"><strong>SALDO OPERATIVO</strong><span style="color:${b.operativa.saldoOperativo>=0 ? '#047857' : '#b91c1c'}">${escapeHtml(money(b.operativa.saldoOperativo))}</span></div>
        </div>
      </div>`;
  }
  renderSummaryList('summarySegmento', summaryBySegmento());
  renderSummaryList('summaryDestino', summaryByDestino());
  renderSummaryList('summaryTiendaTicket', summaryByTiendaTicket());
  renderGraficas();
}

function renderCompras(){
  const wrap = document.getElementById('comprasList');
  let rows = comprasForEvent().filter(r => !isDonationTicket(r.ticketDonacion)).slice();

  if(state.comprasSort === 'ticket'){
    rows.sort((a,b)=>{
      const ta = String(a.ticketDonacion || '').localeCompare(String(b.ticketDonacion || ''), 'es');
      if(ta !== 0) return ta;
      return (a.producto?.nombre || '').localeCompare((b.producto?.nombre || ''), 'es');
    });
  } else if(state.comprasSort === 'responsable'){
    rows.sort((a,b)=>{
      const ra = (a.responsable?.nombre || '').localeCompare((b.responsable?.nombre || ''), 'es');
      if(ra !== 0) return ra;
      return (a.producto?.nombre || '').localeCompare((b.producto?.nombre || ''), 'es');
    });
  } else {
    rows.sort((a,b)=>{
      const pa = (a.producto?.nombre || '').localeCompare((b.producto?.nombre || ''), 'es');
      if(pa !== 0) return pa;
      return String(a.ticketDonacion || '').localeCompare(String(b.ticketDonacion || ''), 'es');
    });
  }

  if(!rows.length){
    wrap.innerHTML = '<div class="empty">Todavía no hay compras u otros gastos para este evento.</div>';
    return;
  }

  wrap.innerHTML = '<div class="hint">Ordenar por: <a href="#" onclick="state.comprasSort=\'producto\'; renderCompras(); return false;">Producto</a> · <a href="#" onclick="state.comprasSort=\'ticket\'; renderCompras(); return false;">Ticket</a> · <a href="#" onclick="state.comprasSort=\'responsable\'; renderCompras(); return false;">Responsable</a></div>';

  rows.forEach(r => {
    const pending = String(r.ticketDonacion || '').trim() === '';
    const row = document.createElement('div');
    row.className = 'itemcard' + (pending ? ' red-row' : '');
    row.innerHTML = `
      <div class="rowline compra">
        <div class="field">
          <label>Producto</label>
          <select data-action="edit-compra-producto" data-id="${r.id}">
            ${state.productos.slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es')).map(p => `<option value="${p.id}" ${p.id===r.productoId?'selected':''}>${escapeHtml(p.nombre)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Unidades</label>
          <input type="number" min="0" step="0.01" value="${Number(r.unidades||0)}" data-action="edit-compra-unidades" data-id="${r.id}" />
        </div>
        <div class="field">
          <label>Precio</label>
          <input class="soft-readonly" readonly value="${money(r.producto?.precio || 0)}" />
        </div>
        <div class="field">
          <label>Importe</label>
          <input class="soft-readonly" readonly value="${money(r.importe)}" />
        </div>
        <div class="field">
          <label>Ticket u Otros gastos</label>
          <select data-action="edit-compra-ticket" data-id="${r.id}">
            ${PURCHASE_TICKET_OPTIONS.map(v => `<option value="${v}" ${v===r.ticketDonacion?'selected':''}>${v === '' ? '-- Pte.Compra u otros gastos --' : escapeHtml(v)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Donante</label>
          <select data-action="edit-compra-donante" data-id="${r.id}">
            <option value="" ${!(r.donorRef||'')?'selected':''}>-- sin donante --</option>
            ${donorOptions().map(d => `<option value="${d.value}" ${d.value===(r.donorRef||'')?'selected':''}>${escapeHtml(d.label)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Responsable</label>
          <select data-action="edit-compra-responsable" data-id="${r.id}">
            <option value="" ${!r.responsableId?'selected':''}>-- sin responsable --</option>
            ${socioResponsableOptions().map(p => `<option value="${p.value}" ${p.value===r.responsableId?'selected':''}>${escapeHtml(p.label)}</option>`).join('')}
          </select>
        </div>
        <div style="display:flex;gap:8px;align-items:end">
          <button type="button" class="modify small" data-action="save-compra" data-id="${r.id}">Modificar</button>
          <button type="button" class="danger small" data-action="delete-compra" data-id="${r.id}">Eliminar</button>
        </div>
      </div>
    `;
    wrap.appendChild(row);
  });
}

function renderMaintenance(){
  renderMaintenanceTabs();
  renderPersonas();
  renderEventos();
  renderTiendas();
  renderProductos();
  renderAcceso();
}

function renderMaintenanceTabs(){
  document.getElementById('mtPersonas').classList.toggle('hidden', currentMaintTab !== 'personas');
  document.getElementById('mtEventos').classList.toggle('hidden', currentMaintTab !== 'eventos');
  document.getElementById('mtTiendas').classList.toggle('hidden', currentMaintTab !== 'tiendas');
  document.getElementById('mtProductos').classList.toggle('hidden', currentMaintTab !== 'productos');
  document.getElementById('mtImportar').classList.toggle('hidden', currentMaintTab !== 'importar');
  const accesoCard = document.getElementById('mtAcceso');
  if(accesoCard) accesoCard.classList.toggle('hidden', currentMaintTab !== 'acceso' || !isGodRole());
  document.getElementById('mtPersonasBtn').classList.toggle('active', currentMaintTab === 'personas');
  document.getElementById('mtEventosBtn').classList.toggle('active', currentMaintTab === 'eventos');
  document.getElementById('mtTiendasBtn').classList.toggle('active', currentMaintTab === 'tiendas');
  document.getElementById('mtProductosBtn').classList.toggle('active', currentMaintTab === 'productos');
  document.getElementById('btnOpenImport').classList.toggle('active', currentMaintTab === 'importar');
  const accesoBtn = document.getElementById('mtAccesoBtn');
  if(accesoBtn) accesoBtn.classList.toggle('active', currentMaintTab === 'acceso');
}

function renderPersonas(){
  document.getElementById('newPersonaRango').innerHTML = PERSONA_RANGOS.map(v => `<option value="${v}">${v}</option>`).join('');
  const wrap = document.getElementById('personasList');
  const list = personasForSelectedEvent().slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
  if(!list.length){
    wrap.innerHTML = '<div class="empty">No hay personas.</div>';
    return;
  }
  wrap.innerHTML = '';
  list.forEach(p => {
    const row = document.createElement('div');
    row.className = 'itemcard maint-soft';
    row.innerHTML = `
      <div class="rowline persona">
        <div class="field"><label>Nombre</label><input value="${escapeHtml(p.nombre)}" data-action="edit-persona-nombre" data-id="${p.id}" /></div>
        <div class="field"><label>Rango</label><select data-action="edit-persona-rango" data-id="${p.id}">${PERSONA_RANGOS.map(v => `<option value="${v}" ${v===p.rango?'selected':''}>${v}</option>`).join('')}</select></div>
        <button type="button" class="modify small" data-action="save-persona" data-id="${p.id}">Modificar</button>
        <button type="button" class="danger small" data-action="delete-persona" data-id="${p.id}">Eliminar</button>
      </div>
    `;
    wrap.appendChild(row);
  });
}

function renderEventos(){
  document.getElementById('newEventoSituacion').innerHTML = EVENT_SITUATIONS.map(v => `<option value="${v}">${v}</option>`).join('');
  const wrap = document.getElementById('eventosList');
  const list = state.eventos.slice().sort((a,b)=>(a.titulo||'').localeCompare((b.titulo||''),'es'));
  if(!list.length){
    wrap.innerHTML = '<div class="empty">No hay eventos.</div>';
    return;
  }
  wrap.innerHTML = '';
  list.forEach(e => {
    const cls = e.situacion === 'Finalizado' ? 'status-finalizado' : 'status-curso';
    const row = document.createElement('div');
    row.className = 'itemcard maint-soft';
    row.innerHTML = `
      ${e.id===state.selectedEventId ? '<div class="badge-active">Activo</div>' : ''}
      <div class="rowline evento">
        <div class="field"><label>Título</label><input value="${escapeHtml(e.titulo)}" data-action="edit-evento-titulo" data-id="${e.id}" /></div>
        <div class="field"><label>Precio</label><input type="number" min="0" step="0.01" value="${Number(e.precio||0)}" data-action="edit-evento-precio" data-id="${e.id}" /></div>
        <div class="field"><label>Fecha ini</label><input value="${escapeHtml(e.fechaIni||'')}" data-action="edit-evento-fechaini" data-id="${e.id}" /></div>
        <div class="field"><label>Fecha fin</label><input value="${escapeHtml(e.fechaFin||'')}" data-action="edit-evento-fechafin" data-id="${e.id}" /></div>
        <div class="field"><label>Descripción</label><input value="${escapeHtml(e.descripcion||'')}" data-action="edit-evento-descripcion" data-id="${e.id}" /></div>
        <div class="field"><label>Situación</label><select data-action="edit-evento-situacion" data-id="${e.id}">${EVENT_SITUATIONS.map(v => `<option value="${v}" ${v===e.situacion?'selected':''}>${v}</option>`).join('')}</select></div>
        <button type="button" class="modify small" data-action="save-evento" data-id="${e.id}" onclick="saveEventRecord(\'${e.id}\'); return false;">Modificar</button>
        <button type="button" class="danger small" data-action="delete-evento" data-id="${e.id}">Eliminar</button>
      </div>
      <div class="hint"><span class="status-pill ${cls}">${escapeHtml(e.situacion)}</span></div>
    `;
    wrap.appendChild(row);
  });
}

function renderTiendas(){
  const wrap = document.getElementById('tiendasList');
  const list = tiendasForSelectedEvent().slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
  if(!list.length){
    wrap.innerHTML = '<div class="empty">No hay tiendas.</div>';
    return;
  }
  wrap.innerHTML = '';
  list.forEach(t => {
    const row = document.createElement('div');
    row.className = 'itemcard maint-soft';
    row.innerHTML = `
      <div class="rowline tienda">
        <div class="field"><label>Nombre</label><input value="${escapeHtml(t.nombre)}" data-action="edit-tienda-nombre" data-id="${t.id}" /></div>
        <button type="button" class="modify small" data-action="save-tienda" data-id="${t.id}">Modificar</button>
        <button type="button" class="danger small" data-action="delete-tienda" data-id="${t.id}">Eliminar</button>
      </div>
    `;
    wrap.appendChild(row);
  });
}

function renderProductos(){
  document.getElementById('newProductoSegmento').innerHTML = SEGMENT_OPTIONS.map(v => `<option value="${v}">${v}</option>`).join('');
  document.getElementById('newProductoDestino').innerHTML = DESTINO_OPTIONS.map(v => `<option value="${v}">${v}</option>`).join('');
  document.getElementById('newProductoTienda').innerHTML = '<option value="">-- sin decidir --</option>' + tiendasForSelectedEvent().slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es')).map(t => `<option value="${t.id}">${escapeHtml(t.nombre)}</option>`).join('');
  const wrap = document.getElementById('productosList');
  const getters = {
    nombre: p => p.nombre || '',
    segmento: p => p.segmento || '',
    destino: p => p.destino || '',
    tienda: p => tiendaById(p.tiendaId)?.nombre || ''
  };
  const list = productosForSelectedEvent().slice().sort((a,b)=>getters[currentProductSort](a).localeCompare(getters[currentProductSort](b),'es'));
  if(!list.length){
    wrap.innerHTML = '<div class="empty">No hay productos.</div>';
    return;
  }
  wrap.innerHTML = '';
  const hdr = document.createElement('div');
  hdr.className = 'hint';
  hdr.innerHTML = 'Ordenar por: <a href="#" class="link-sort" data-sort-producto="nombre">Nombre</a> · <a href="#" class="link-sort" data-sort-producto="segmento">Segmento</a> · <a href="#" class="link-sort" data-sort-producto="destino">Destino</a> · <a href="#" class="link-sort" data-sort-producto="tienda">Tienda</a>';
  wrap.appendChild(hdr);
  list.forEach(p => {
    const row = document.createElement('div');
    row.className = 'itemcard';
    row.innerHTML = `
      <div class="rowline producto">
        <div class="field"><label>Nombre</label><input value="${escapeHtml(p.nombre)}" data-action="edit-producto-nombre" data-id="${p.id}" /></div>
        <div class="field"><label>Segmento</label><select data-action="edit-producto-segmento" data-id="${p.id}">${SEGMENT_OPTIONS.map(v => `<option value="${v}" ${v===p.segmento?'selected':''}>${v}</option>`).join('')}</select></div>
        <div class="field"><label>Destino</label><select data-action="edit-producto-destino" data-id="${p.id}">${DESTINO_OPTIONS.map(v => `<option value="${v}" ${v===p.destino?'selected':''}>${v}</option>`).join('')}</select></div>
        <div class="field"><label>Precio</label><input class="money-text" type="text" value="${euroInputValue(p.precio||0)}" data-action="edit-producto-precio" data-id="${p.id}" /></div>
        <div class="field"><label>Tienda</label><select data-action="edit-producto-tienda" data-id="${p.id}"><option value="" ${!p.tiendaId?'selected':''}>-- sin decidir --</option>${tiendasForSelectedEvent().slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es')).map(t => `<option value="${t.id}" ${t.id===p.tiendaId?'selected':''}>${escapeHtml(t.nombre)}</option>`).join('')}</select></div>
        <button type="button" class="modify small" data-action="save-producto" data-id="${p.id}">Modificar</button>
        <button type="button" class="danger small" data-action="delete-producto" data-id="${p.id}">Eliminar</button>
      </div>
    `;
    wrap.appendChild(row);
  });
}

function setElementEnabled(el, enabled){
  if(!el) return;
  el.disabled = !enabled;
  el.style.pointerEvents = enabled ? 'auto' : '';
  el.style.opacity = enabled ? '1' : '';
  el.classList.toggle('locked', !enabled);
}

function renderLockState(){
  const locked = isLocked();
  document.querySelectorAll('.app-lockable').forEach(el => {
    el.classList.toggle('locked', locked);
    if(el.matches('button,select,input')) el.disabled = locked;
  });

  setElementEnabled(document.getElementById('selectedEvent'), !locked || isGodRole());
  setElementEnabled(document.getElementById('btnLogout'), true);
  setElementEnabled(document.getElementById('btnExportExcel'), !locked || isGodRole());

  if(canUnlockFinalizedEvent()){
    setElementEnabled(document.getElementById('btnToggleMaintenance'), true);
    setElementEnabled(document.getElementById('mtEventosBtn'), true);

    const eventosCard = document.getElementById('mtEventos');
    if(eventosCard){
      eventosCard.classList.remove('locked');
      eventosCard.style.pointerEvents = 'auto';
      eventosCard.style.opacity = '1';
    }

    document.querySelectorAll('[data-action^="edit-evento-"], [data-action="save-evento"]').forEach(el => {
      const action = el.getAttribute('data-action') || '';
      const allow = action === 'edit-evento-situacion' || action === 'save-evento';
      setElementEnabled(el, allow);
      if(allow){
        el.removeAttribute('disabled');
        el.style.pointerEvents = 'auto';
        el.style.opacity = '1';
      }
    });
    document.querySelectorAll('[data-action="delete-evento"]').forEach(el => setElementEnabled(el, false));

    ['newEventoTitulo','newEventoPrecio','newEventoFechaIni','newEventoFechaFin','newEventoSituacion','newEventoDescripcion','btnAddEvento'].forEach(id => {
      setElementEnabled(document.getElementById(id), false);
    });
  }

  const m = document.getElementById('btnToggleMaintenance');
  if(m){
    const wrap = document.getElementById('maintenanceWrapper');
    const open = wrap ? !wrap.classList.contains('hidden') : false;
    m.classList.toggle('maint-btn-open', open);
    m.classList.toggle('maint-btn-closed', !open);
  }
}

function addPersona(){
  const nombre = document.getElementById('newPersonaNombre').value.trim();
  const rango = document.getElementById('newPersonaRango').value;
  if(!nombre) return;
  state.personas.push({id:uid(), nombre, rango, eventId: state.selectedEventId});
  document.getElementById('newPersonaNombre').value = '';
  render();
}

function addEvento(){
  if(!isGodRole()) return;
  const titulo = document.getElementById('newEventoTitulo').value.trim();
  if(!titulo) return;
  state.eventos.push({
    id:uid(),
    titulo,
    precio:Number(document.getElementById('newEventoPrecio').value || 0),
    fechaIni:document.getElementById('newEventoFechaIni').value.trim(),
    fechaFin:document.getElementById('newEventoFechaFin').value.trim(),
    situacion:document.getElementById('newEventoSituacion').value,
    descripcion:document.getElementById('newEventoDescripcion').value.trim()
  });
  if(!state.selectedEventId) state.selectedEventId = state.eventos[state.eventos.length-1].id;
  document.getElementById('newEventoTitulo').value = '';
  document.getElementById('newEventoPrecio').value = '0.00';
  document.getElementById('newEventoFechaIni').value = '';
  document.getElementById('newEventoFechaFin').value = '';
  document.getElementById('newEventoDescripcion').value = '';
  render();
}

function addTienda(){
  const nombre = document.getElementById('newTiendaNombre').value.trim();
  if(!nombre) return;
  state.tiendas.push({id:uid(), nombre, eventId: state.selectedEventId});
  document.getElementById('newTiendaNombre').value = '';
  render();
}

function addProducto(){
  const nombre = document.getElementById('newProductoNombre').value.trim();
  if(!nombre) return;
  state.productos.push({
    id:uid(),
    nombre,
    segmento:document.getElementById('newProductoSegmento').value,
    destino:document.getElementById('newProductoDestino').value,
    precio:parseEuroInput(document.getElementById('newProductoPrecio').value || 0),
    tiendaId:document.getElementById('newProductoTienda').value || '',
    eventId: state.selectedEventId
  });
  document.getElementById('newProductoNombre').value = '';
  document.getElementById('newProductoPrecio').value = '0,00 €';
  render();
}

function addColab(){
  if(!selectedEvent()) return;
  const personaId = document.getElementById('collabPersona').value;
  if(!personaId) return;
  state.colaboradores.push({
    id:uid(),
    eventId:state.selectedEventId,
    personaId,
    numero:Number(document.getElementById('collabNumero').value || 0),
    situacion:document.getElementById('collabSituacion').value,
    importe:parseEuroInput(document.getElementById('collabImporte').value || 0)
  });
  document.getElementById('collabPersona').value = '';
  document.getElementById('collabNumero').value = '1';
  document.getElementById('collabSituacion').value = 'Pendiente';
  document.getElementById('collabImporte').value = '0,00 €';
  render();
}


function renderDonaciones(){
  const wrap = document.getElementById('donacionesList');
  let rows = comprasForEvent().filter(r => isDonationTicket(r.ticketDonacion)).slice();

  if(state.comprasSort === 'ticket'){
    rows.sort((a,b)=>{
      const ta = String(a.ticketDonacion || '').localeCompare(String(b.ticketDonacion || ''), 'es');
      if(ta !== 0) return ta;
      return (a.producto?.nombre || '').localeCompare((b.producto?.nombre || ''), 'es');
    });
  } else if(state.comprasSort === 'responsable'){
    rows.sort((a,b)=>{
      const ra = (a.responsable?.nombre || '').localeCompare((b.responsable?.nombre || ''), 'es');
      if(ra !== 0) return ra;
      return (a.producto?.nombre || '').localeCompare((b.producto?.nombre || ''), 'es');
    });
  } else {
    rows.sort((a,b)=>{
      const pa = (a.producto?.nombre || '').localeCompare((b.producto?.nombre || ''), 'es');
      if(pa !== 0) return pa;
      return String(a.ticketDonacion || '').localeCompare(String(b.ticketDonacion || ''), 'es');
    });
  }

  if(!rows.length){
    wrap.innerHTML = '<div class="empty">Todavía no hay donaciones de producto para este evento.</div>';
    return;
  }

  wrap.innerHTML = '<div class="hint">Ordenar por: <a href="#" onclick="state.comprasSort=\'producto\'; renderDonaciones(); return false;">Producto</a> · <a href="#" onclick="state.comprasSort=\'ticket\'; renderDonaciones(); return false;">Ticket</a> · <a href="#" onclick="state.comprasSort=\'responsable\'; renderDonaciones(); return false;">Responsable</a></div>';

  rows.forEach(r => {
    const row = document.createElement('div');
    row.className = 'itemcard';
    row.innerHTML = `
      <div class="rowline compra">
        <div class="field">
          <label>Producto</label>
          <select data-action="edit-compra-producto" data-id="${r.id}">
            ${state.productos.slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es')).map(p => `<option value="${p.id}" ${p.id===r.productoId?'selected':''}>${escapeHtml(p.nombre)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Unidades</label>
          <input type="number" min="0" step="0.01" value="${Number(r.unidades||0)}" data-action="edit-compra-unidades" data-id="${r.id}" />
        </div>
        <div class="field">
          <label>Precio</label>
          <input class="soft-readonly" readonly value="${money(r.producto?.precio || 0)}" />
        </div>
        <div class="field">
          <label>Valor</label>
          <input class="soft-readonly" readonly value="${money(r.valor)}" />
        </div>
        <div class="field">
          <label>Tipo de donación</label>
          <select data-action="edit-compra-ticket" data-id="${r.id}">
            ${DONATION_TICKET_OPTIONS.map(v => `<option value="${v}" ${v===r.ticketDonacion?'selected':''}>${escapeHtml(v)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Donante</label>
          <select data-action="edit-compra-donante" data-id="${r.id}">
            <option value="" ${!(r.donorRef||'')?'selected':''}>-- sin donante --</option>
            ${donorOptions().map(d => `<option value="${d.value}" ${d.value===(r.donorRef||'')?'selected':''}>${escapeHtml(d.label)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Responsable</label>
          <select data-action="edit-compra-responsable" data-id="${r.id}">
            <option value="" ${!r.responsableId?'selected':''}>-- sin responsable --</option>
            ${socioResponsableOptions().map(p => `<option value="${p.value}" ${p.value===r.responsableId?'selected':''}>${escapeHtml(p.label)}</option>`).join('')}
          </select>
        </div>
        <div style="display:flex;gap:8px;align-items:end">
          <button type="button" class="modify small" data-action="save-compra" data-id="${r.id}">Modificar</button>
          <button type="button" class="danger small" data-action="delete-compra" data-id="${r.id}">Eliminar</button>
        </div>
      </div>
    `;
    wrap.appendChild(row);
  });
}

function addDonation(){
  if(!selectedEvent()) return;
  const productoId = document.getElementById('donProducto').value;
  if(!productoId) return;
  state.compras.push({
    id:uid(),
    eventId:state.selectedEventId,
    productoId,
    unidades:Number(document.getElementById('donUnidades').value || 0),
    ticketDonacion:document.getElementById('donTicket').value,
    donorRef:document.getElementById('donDonante').value || '',
    responsableId:document.getElementById('donResponsable').value || ''
  });
  document.getElementById('donProducto').value = '';
  document.getElementById('donUnidades').value = '1.00';
  document.getElementById('donTicket').value = DONATION_TICKET_OPTIONS[0];
  document.getElementById('donDonante').value = '';
  document.getElementById('donResponsable').value = '';
  render();
}

function updateDonationPreview(){
  const producto = productoById(document.getElementById('donProducto')?.value || '');
  const unidades = Number(document.getElementById('donUnidades')?.value || 0);
  const precio = Number(producto?.precio || 0);
  const valor = precio * unidades;
  const tienda = tiendaById(producto?.tiendaId || '');
  const precioEl = document.getElementById('donPrecio');
  const importeEl = document.getElementById('donImporte');
  const tiendaEl = document.getElementById('donTienda');
  if(precioEl) precioEl.value = money(precio);
  if(importeEl) importeEl.value = money(valor);
  if(tiendaEl) tiendaEl.value = tienda?.nombre || '';
}

function renderGraficas(){
  const wrap = document.getElementById('eventChartWrap');
  if(!wrap) return;
  const b = budgetSummary();

  const socioMoney = Number(b.ingresosDinero.socios.ingresado || 0);
  const donanteMoney = Number(b.ingresosDinero.donantes.ingresado || 0);
  const compraMoney = Number(b.operativa.gastoCompras || 0);
  const orgMoney = Number(b.operativa.gastosOrganizacion || 0);
  const saldo = Number(b.operativa.saldoOperativo || 0);
  const donacionProducto = Number(b.donacionProducto.valorDonado || 0);

  const ingresoTotal = socioMoney + donanteMoney;
  const gastoTotal = compraMoney + orgMoney;
  const maxVal = Math.max(1, ingresoTotal, gastoTotal, Math.abs(saldo), donacionProducto);

  const ingresoSocPct = (socioMoney / maxVal) * 100;
  const ingresoDonPct = (donanteMoney / maxVal) * 100;
  const gastoCompPct = (compraMoney / maxVal) * 100;
  const gastoOrgPct = (orgMoney / maxVal) * 100;
  const saldoPct = (Math.abs(saldo) / maxVal) * 100;
  const donProdPct = (donacionProducto / maxVal) * 100;

  wrap.innerHTML = `
    <div class="chart-shell">
      <div class="chart-grid">
        <div class="chart-stat"><div class="k">Ingreso dinero</div><div class="v">${escapeHtml(money(ingresoTotal))}</div></div>
        <div class="chart-stat"><div class="k">Donación de producto</div><div class="v">${escapeHtml(money(donacionProducto))}</div></div>
        <div class="chart-stat"><div class="k">Gasto total</div><div class="v">${escapeHtml(money(gastoTotal))}</div></div>
        <div class="chart-stat"><div class="k">Saldo operativo</div><div class="v">${escapeHtml(money(saldo))}</div></div>
      </div>
      <div class="chart-bars">
        <div class="chart-row">
          <div class="chart-label">INGRESOS EN DINERO</div>
          <div class="chart-track" data-tip="Ingreso total: ${escapeHtml(money(ingresoTotal))}" title="Ingreso total: ${escapeHtml(money(ingresoTotal))}">
            <div class="chart-seg" data-tip="Socios: ${escapeHtml(money(socioMoney))}" title="Socios: ${escapeHtml(money(socioMoney))}" style="width:${ingresoSocPct}%;background:#86efac;"></div><div class="chart-seg" data-tip="Donantes: ${escapeHtml(money(donanteMoney))}" title="Donantes: ${escapeHtml(money(donanteMoney))}" style="width:${ingresoDonPct}%;background:#16a34a;"></div>
            <div class="chart-center-value">${escapeHtml(money(ingresoTotal))}</div>
          </div>
        </div>
        <div class="chart-row">
          <div class="chart-label">DONACIÓN DE PRODUCTO</div>
          <div class="chart-track" data-tip="Valor producto donado: ${escapeHtml(money(donacionProducto))}" title="Valor producto donado: ${escapeHtml(money(donacionProducto))}">
            <div class="chart-seg" data-tip="Tiendas: ${escapeHtml(money(b.donacionProducto.donadoTienda))}" title="Tiendas: ${escapeHtml(money(b.donacionProducto.donadoTienda))}" style="width:${(Number(b.donacionProducto.donadoTienda||0)/maxVal)*100}%;background:#fcd34d;"></div><div class="chart-seg" data-tip="Socios: ${escapeHtml(money(b.donacionProducto.donadoSocio))}" title="Socios: ${escapeHtml(money(b.donacionProducto.donadoSocio))}" style="width:${(Number(b.donacionProducto.donadoSocio||0)/maxVal)*100}%;background:#f59e0b;"></div><div class="chart-seg" data-tip="Otros: ${escapeHtml(money(b.donacionProducto.donadoOtros))}" title="Otros: ${escapeHtml(money(b.donacionProducto.donadoOtros))}" style="width:${(Number(b.donacionProducto.donadoOtros||0)/maxVal)*100}%;background:#b45309;"></div>
            <div class="chart-center-value">${escapeHtml(money(donacionProducto))}</div>
          </div>
        </div>
        <div class="chart-row">
          <div class="chart-label">GASTOS</div>
          <div class="chart-track" data-tip="Gasto total: ${escapeHtml(money(gastoTotal))}" title="Gasto total: ${escapeHtml(money(gastoTotal))}">
            <div class="chart-seg" data-tip="Gasto por compras: ${escapeHtml(money(compraMoney))}" title="Gasto por compras: ${escapeHtml(money(compraMoney))}" style="width:${gastoCompPct}%;background:#fca5a5;"></div><div class="chart-seg" data-tip="Gastos de organización: ${escapeHtml(money(orgMoney))}" title="Gastos de organización: ${escapeHtml(money(orgMoney))}" style="width:${gastoOrgPct}%;background:#dc2626;"></div>
            <div class="chart-center-value">${escapeHtml(money(gastoTotal))}</div>
          </div>
        </div>
        <div class="chart-row">
          <div class="chart-label">SALDO OPERATIVO</div>
          <div class="chart-track chart-saldo" data-tip="Saldo operativo: ${escapeHtml(money(saldo))}" title="Saldo operativo: ${escapeHtml(money(saldo))}">
            <div class="chart-seg" style="width:${saldoPct}%;background:${saldo >= 0 ? '#0f766e' : '#b91c1c'};"></div>
            <div class="chart-center-value">${escapeHtml(money(saldo))}</div>
          </div>
        </div>
      </div>
      <div class="chart-note">Pasa el cursor por cada tramo para ver el detalle de la cifra correspondiente.</div>
    </div>`;
}

function addCompra(){
  if(!selectedEvent()) return;
  const productoId = document.getElementById('buyProducto').value;
  if(!productoId) return;
  state.compras.push({
    id:uid(),
    eventId:state.selectedEventId,
    productoId,
    unidades:Number(document.getElementById('buyUnidades').value || 0),
    ticketDonacion:document.getElementById('buyTicket').value,
    responsableId:document.getElementById('buyResponsable').value || ''
  });
  document.getElementById('buyProducto').value = '';
  document.getElementById('buyUnidades').value = '1.00';
  document.getElementById('buyTicket').value = '';
  document.getElementById('buyResponsable').value = '';
  render();
}

function updateBuyPreview(){
  const producto = productoById(document.getElementById('buyProducto')?.value || '');
  const unidades = Number(document.getElementById('buyUnidades')?.value || 0);
  const ticket = document.getElementById('buyTicket')?.value || '';
  const precio = Number(producto?.precio || 0);
  const valor = precio * unidades;
  const importe = isDonationTicket(ticket) ? 0 : valor;
  const tienda = tiendaById(producto?.tiendaId || '');
  const precioEl = document.getElementById('buyPrecio');
  const importeEl = document.getElementById('buyImporte');
  const tiendaEl = document.getElementById('buyTienda');
  if(precioEl) precioEl.value = money(precio);
  if(importeEl) importeEl.value = money(importe);
  if(tiendaEl) tiendaEl.value = tienda?.nombre || '';
}

function saveEventRecord(id){
  if(!isGodRole()) return;
  const ev = state.eventos.find(x => x.id === id);
  if(!ev) return;
  if(isLocked()){
    ev.situacion = currentValuesByAction('edit-evento-situacion', id);
  }else{
    ev.titulo = currentValuesByAction('edit-evento-titulo', id).trim();
    ev.precio = Number(currentValuesByAction('edit-evento-precio', id) || 0);
    ev.fechaIni = currentValuesByAction('edit-evento-fechaini', id).trim();
    ev.fechaFin = currentValuesByAction('edit-evento-fechafin', id).trim();
    ev.descripcion = currentValuesByAction('edit-evento-descripcion', id).trim();
    ev.situacion = currentValuesByAction('edit-evento-situacion', id);
  }
  render();
}

function currentValuesByAction(action, id){
  const selector = `[data-action="${action}"][data-id="${id}"]`;
  const el = document.querySelector(selector);
  return el ? el.value : '';
}

function handleClick(e){
  const btn = e.target.closest('button');
  if(!btn) return;
  const action = btn.dataset.action || btn.id;

  const writeActions = new Set(['btnAddPersona','btnAddEvento','btnAddTienda','btnAddProducto','btnAddColab','btnAddCompra','btnAddDonacion','btnStartImport','btnTogglePower','btnAddAcceso']);
  const godOnly = action === 'mtAccesoBtn' || action === 'btnAddAcceso' || action.startsWith('save-acceso') || action.startsWith('delete-acceso') || action === 'btnAddEvento' || action.startsWith('save-evento') || action.startsWith('delete-evento');

  if(!authUser && !['btnLogin','btnToggleChangePassword','btnChangePassword'].includes(action)) return;
  if(godOnly && !isGodRole()) return;
  if((writeActions.has(action) || action.startsWith('save-') || action.startsWith('delete-')) && !canWriteRole() && !godOnly) return;
  if(isLocked() && !['btnToggleMaintenance','mtEventosBtn','btnLogout','toggleEventDesc','save-evento','btnExportExcel'].includes(action)) return;

  switch(action){
    case 'tabIngresosBtn': currentMainTab = 'ingresos'; render(); break;
    case 'tabComprasBtn': currentMainTab = 'compras'; render(); break;
    case 'tabDonacionesBtn': currentMainTab = 'donaciones'; render(); break;
    case 'tabResumenBtn': currentMainTab = 'resumen'; render(); break;
    case 'tabGraficasBtn': currentMainTab = 'graficas'; render(); break;
    case 'btnLogin': doLogin(); break;
    case 'btnToggleChangePassword': toggleChangePasswordPanel(); break;
    case 'btnChangePassword': doChangePassword(); break;
    case 'btnLogout': doLogout(); break;
    case 'btnToggleMaintenance':
      if(isLocked()){
        if(!canUnlockFinalizedEvent()) break;
        currentMaintTab = 'eventos';
        document.getElementById('maintenanceWrapper').classList.remove('hidden');
        render();
      }else{
        document.getElementById('maintenanceWrapper').classList.toggle('hidden');
        renderLockState();
      }
      break;
    case 'btnOpenImport':
      currentMaintTab = 'importar';
      document.getElementById('maintenanceWrapper').classList.remove('hidden');
      render();
      break;
    case 'mtPersonasBtn': currentMaintTab = 'personas'; render(); break;
    case 'mtEventosBtn': currentMaintTab = 'eventos'; render(); break;
    case 'mtTiendasBtn': currentMaintTab = 'tiendas'; render(); break;
    case 'mtProductosBtn': currentMaintTab = 'productos'; render(); break;
    case 'mtAccesoBtn': openAccessMaintenance(); break;
    case 'mtImportBtn': currentMaintTab = 'importar'; render(); break;
    case 'btnAddPersona': addPersona(); break;
    case 'btnAddEvento': addEvento(); break;
    case 'btnAddTienda': addTienda(); break;
    case 'btnAddProducto': addProducto(); break;
    case 'btnAddColab': addColab(); break;
    case 'btnAddCompra': addCompra(); break;
    case 'btnAddDonacion': addDonation(); break;
    case 'btnAddAcceso': saveAccessUser(); break;
    case 'btnStartImport': importInitialWorkbook(); break;
    case 'btnClearImportStatus': document.getElementById('importStatus').classList.add('hidden'); document.getElementById('importStatus').textContent=''; break;
    case 'btnTogglePower':
      if(!selectedEvent()) return;
      selectedEvent().situacion = isLocked() ? 'En curso' : 'Finalizado';
      render();
      break;
    case 'toggleEventDesc':
      toggleEventDescription();
      break;
    case 'toggleIngresosSummary':
      document.getElementById('ingresosSummaryBody').classList.toggle('hidden');
      break;
    case 'toggleComprasSummary':
      document.getElementById('comprasSummaryBody').classList.toggle('hidden');
      break;
    case 'toggleComprasEvent':
      showComprasEvent = !showComprasEvent;
      renderTabVisibility();
      break;
    case 'save-persona': {
      const id = btn.dataset.id;
      const p = personaById(id);
      if(p){
        p.nombre = currentValuesByAction('edit-persona-nombre', id).trim();
        p.rango = currentValuesByAction('edit-persona-rango', id);
        render();
      }
      break;
    }
    case 'delete-persona':
      state.personas = state.personas.filter(p => p.id !== btn.dataset.id);
      state.colaboradores = state.colaboradores.filter(c => c.personaId !== btn.dataset.id);
      state.compras = state.compras.map(c => c.responsableId === btn.dataset.id ? ({...c, responsableId:''}) : c);
      render();
      break;
    case 'save-evento': {
      if(!isGodRole()) break;
      const id = btn.dataset.id;
      const ev = state.eventos.find(x => x.id === id);
      if(ev){
        if(isLocked()){
          ev.situacion = currentValuesByAction('edit-evento-situacion', id);
        }else{
          ev.titulo = currentValuesByAction('edit-evento-titulo', id).trim();
          ev.precio = Number(currentValuesByAction('edit-evento-precio', id) || 0);
          ev.fechaIni = currentValuesByAction('edit-evento-fechaini', id).trim();
          ev.fechaFin = currentValuesByAction('edit-evento-fechafin', id).trim();
          ev.descripcion = currentValuesByAction('edit-evento-descripcion', id).trim();
          ev.situacion = currentValuesByAction('edit-evento-situacion', id);
        }
        render();
      }
      break;
    }
    case 'delete-evento':
      if(!isGodRole()) break;
      state.eventos = state.eventos.filter(e => e.id !== btn.dataset.id);
      state.personas = state.personas.filter(p => p.eventId !== btn.dataset.id);
      state.tiendas = state.tiendas.filter(t => t.eventId !== btn.dataset.id);
      state.productos = state.productos.filter(p => p.eventId !== btn.dataset.id);
      state.colaboradores = state.colaboradores.filter(c => c.eventId !== btn.dataset.id);
      state.compras = state.compras.filter(c => c.eventId !== btn.dataset.id);
      if(state.ticketImages){ Object.keys(state.ticketImages).forEach(k => { if(k.startsWith(btn.dataset.id + '|')) delete state.ticketImages[k]; }); }
      state.selectedEventId = state.eventos[0]?.id || '';
      render();
      break;
    case 'save-tienda': {
      const id = btn.dataset.id;
      const t = tiendaById(id);
      if(t){
        t.nombre = currentValuesByAction('edit-tienda-nombre', id).trim();
        render();
      }
      break;
    }
    case 'delete-tienda':
      state.tiendas = state.tiendas.filter(t => t.id !== btn.dataset.id);
      state.productos = state.productos.map(p => p.tiendaId === btn.dataset.id ? ({...p, tiendaId:''}) : p);
      render();
      break;
    case 'save-producto': {
      const id = btn.dataset.id;
      const p = productoById(id);
      if(p){
        p.nombre = currentValuesByAction('edit-producto-nombre', id).trim();
        p.segmento = currentValuesByAction('edit-producto-segmento', id);
        p.destino = currentValuesByAction('edit-producto-destino', id);
        p.precio = parseEuroInput(currentValuesByAction('edit-producto-precio', id) || 0);
        p.tiendaId = currentValuesByAction('edit-producto-tienda', id);
        render();
      }
      break;
    }
    case 'delete-producto':
      state.productos = state.productos.filter(p => p.id !== btn.dataset.id);
      state.compras = state.compras.filter(c => c.productoId !== btn.dataset.id);
      render();
      break;
    case 'save-collab': {
      const id = btn.dataset.id;
      const c = state.colaboradores.find(x => x.id === id);
      if(c){
        c.personaId = currentValuesByAction('edit-collab-persona', id);
        c.numero = Number(currentValuesByAction('edit-collab-numero', id) || 0);
        c.situacion = currentValuesByAction('edit-collab-situacion', id);
        c.importe = parseEuroInput(currentValuesByAction('edit-collab-importe', id) || 0);
        render();
      }
      break;
    }
    case 'delete-collab':
      state.colaboradores = state.colaboradores.filter(c => c.id !== btn.dataset.id);
      render();
      break;
    case 'save-compra': {
      const id = btn.dataset.id;
      const c = state.compras.find(x => x.id === id);
      if(c){
        c.productoId = currentValuesByAction('edit-compra-producto', id);
        c.unidades = Number(currentValuesByAction('edit-compra-unidades', id) || 0);
        c.ticketDonacion = currentValuesByAction('edit-compra-ticket', id);
        c.donorRef = currentValuesByAction('edit-compra-donante', id);
        c.responsableId = currentValuesByAction('edit-compra-responsable', id);
        render();
      }
      break;
    }
    case 'delete-compra':
      state.compras = state.compras.filter(c => c.id !== btn.dataset.id);
      render();
      break;
    case 'save-acceso': saveAccessUser(btn.dataset.id); break;
    case 'delete-acceso': deleteAccessUser(btn.dataset.id); break;
    case 'btnExportExcel': exportExcel(); break;
    case 'btnExportSeed': exportSeedWorkbook(); break;
  }
}

function handleChange(e){
  if(e.target.id === 'selectedEvent'){
    changeSelectedEvent(e.target.value);
    return;
  }
  if(['buyProducto','buyUnidades','buyTicket'].includes(e.target.id)){
    if(isLocked()) return;
    updateBuyPreview();
  }
  if(['donProducto','donUnidades','donTicket'].includes(e.target.id)){
    if(isLocked()) return;
    updateDonationPreview();
  }
}


async function exportSeedWorkbook(){
  if(isLocked()) return;

  try{
    await ensureExcelJS();
  }catch(err){
    alert('No se pudo cargar el motor de Excel. Coloca exceljs.min.js en la carpeta vendor o usa conexión a internet.');
    return;
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'ControlEvent v28.10 - ©oltyLAB ’26';
  wb.created = new Date();

  const border = {top:{style:'thin', color:{argb:'FFDDE2EA'}},left:{style:'thin', color:{argb:'FFDDE2EA'}},bottom:{style:'thin', color:{argb:'FFDDE2EA'}},right:{style:'thin', color:{argb:'FFDDE2EA'}}};
  const headFill = {type:'pattern', pattern:'solid', fgColor:{argb:'FF111827'}};

  function makeSheet(name, headers, rows){
    const ws = wb.addWorksheet(name);
    ws.columns = headers.map(h => ({width: Math.max(14, String(h).length + 2)}));
    headers.forEach((h, i) => {
      const c = ws.getCell(1, i+1);
      c.value = h;
      c.font = {bold:true, color:{argb:'FFFFFFFF'}};
      c.fill = headFill;
      c.border = border;
      c.alignment = {horizontal:'center', vertical:'middle'};
    });
    let r = 2;
    rows.forEach(row => {
      row.forEach((v, i) => {
        const c = ws.getCell(r, i+1);
        c.value = v;
        c.border = border;
        c.alignment = {vertical:'middle'};
      });
      r += 1;
    });
    return ws;
  }

  const eventCode = {};
  state.eventos.forEach((e,i)=> eventCode[e.id] = 'EV' + String(i+1).padStart(3,'0'));
  const personCode = {};
  state.personas.forEach((p,i)=> personCode[p.id] = 'PE' + String(i+1).padStart(4,'0'));
  const storeCode = {};
  state.tiendas.forEach((t,i)=> storeCode[t.id] = 'TI' + String(i+1).padStart(4,'0'));
  const productCode = {};
  state.productos.forEach((p,i)=> productCode[p.id] = 'PR' + String(i+1).padStart(4,'0'));

  makeSheet('EVENTOS',
    ['EVENTO_CODIGO','EVENTO_TITULO','EVENTO_PRECIO','EVENTO_FECHAINI','EVENTO_FECHAFIN','EVENTO_SITUACION','EVENTO_DESCRIPCION'],
    state.eventos.map(e => [eventCode[e.id], e.titulo || '', Number(e.precio || 0), e.fechaIni || '', e.fechaFin || '', e.situacion || 'En curso', e.descripcion || ''])
  );
  makeSheet('PERSONAS',
    ['PERSONA_CODIGO','PERSONA_NOMBRE','PERSONA_RANGO'],
    state.personas.map(p => [personCode[p.id], p.nombre || '', p.rango || 'SOCIO'])
  );
  makeSheet('TIENDAS',
    ['TIENDA_CODIGO','TIENDA_NOMBRE'],
    state.tiendas.map(t => [storeCode[t.id], t.nombre || ''])
  );
  makeSheet('PRODUCTOS',
    ['PRODUCTO_CODIGO','PRODUCTO_NOMBRE','PRODUCTO_SEGMENTO','PRODUCTO_DESTINO','PRODUCTO_PRECIO','TIENDA_CODIGO'],
    state.productos.map(p => [productCode[p.id], p.nombre || '', p.segmento || '', p.destino || '', Number(p.precio || 0), storeCode[p.tiendaId] || ''])
  );
  makeSheet('INGRESOS',
    ['EVENTO_CODIGO','PERSONA_CODIGO','NUMERO','INGRESO','IMPORTE_VOLUNTARIO'],
    state.colaboradores.map(c => [eventCode[c.eventId] || '', personCode[c.personaId] || '', Number(c.numero || 0), c.situacion || 'Pendiente', Number(c.importe || 0)])
  );
  makeSheet('COMPRAS',
    ['EVENTO_CODIGO','PRODUCTO_CODIGO','UNIDADES','TICKET_U_OTROS_GASTOS','RESPONSABLE_PERSONA_CODIGO'],
    state.compras.map(c => [eventCode[c.eventId] || '', productCode[c.productoId] || '', Number(c.unidades || 0), c.ticketDonacion || '', personCode[c.responsableId] || ''])
  );

  const ticketRows = [];
  Object.entries(state.ticketImages || {}).forEach(([fullKey, image]) => {
    const parts = String(fullKey).split('|');
    const evId = parts.shift();
    const rest = parts.join('|').trim();
    const two = rest.split(' | ');
    if(two.length < 2) return;
    const tiendaNombre = two[0].trim();
    const ticket = two.slice(1).join(' | ').trim();
    const tienda = state.tiendas.find(t => t.nombre === tiendaNombre && (!t.eventId || t.eventId === evId));
    let fileName = '';
    const tkMatch = ticket.match(/^TK0*(\d+)$/i);
    if(tkMatch){
      fileName = `ticket_${Number(tkMatch[1])}.jpg`;
    }else{
      fileName = `ticket_${ticketRows.length + 1}.jpg`;
    }
    ticketRows.push([eventCode[evId] || '', storeCode[tienda?.id] || '', ticket, fileName, image || '']);
  });
  makeSheet('TICKETS',
    ['EVENTO_CODIGO','TIENDA_CODIGO','TICKET_DONACION','ARCHIVO_IMAGEN','IMAGEN_BASE64'],
    ticketRows
  );

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ControlEvent_v28_10_descarga_datos.xlsx';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function exportExcel(){
  if(isLocked() && !isGodRole()) return;

  const ev = selectedEvent();
  if(!ev) return;

  try{
    await ensureExcelJS();
  }catch(err){
    alert('No se pudo cargar el motor de Excel. Coloca exceljs.min.js en la carpeta vendor o usa conexión a internet.');
    return;
  }

  const collabs = collabsForEvent();
  const compras = comprasForEvent();
  const comprasSolo = compras.filter(x => !isDonationTicket(x.ticketDonacion));
  const donacionesSolo = compras.filter(x => isDonationTicket(x.ticketDonacion));
  const budget = budgetSummary();
  const segRows = summaryBySegmento();
  const destRows = summaryByDestino();
  const tiendaRows = summaryByTiendaTicket();

  const wb = new ExcelJS.Workbook();
  wb.creator = 'ControlEvent v28.10 - ©oltyLAB ’26';
  wb.created = new Date();

  const border = {top:{style:'thin', color:{argb:'FFDDE2EA'}},left:{style:'thin', color:{argb:'FFDDE2EA'}},bottom:{style:'thin', color:{argb:'FFDDE2EA'}},right:{style:'thin', color:{argb:'FFDDE2EA'}}};
  const fills = { title:'FF111827', ok:'FFECFDF5', bad:'FFFEF2F2', warn:'FFFFF7ED', white:'FFFFFFFF' };
  const moneyFmt = '#,##0.00 [$€-C0A]';
  const numFmt = '0.00';

  function baseSheet(name, widths){
    const ws = wb.addWorksheet(name);
    ws.properties.defaultRowHeight = 20;
    ws.columns = widths.map(w => ({width:w}));
    return ws;
  }
  function paint(cell, fill='white'){
    cell.border = border;
    cell.alignment = {vertical:'middle', wrapText:true};
    if(fill && fills[fill]){
      cell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:fills[fill]}};
    }
  }
  function titleRow(ws, rowNum, headers){
    headers.forEach((h, i) => {
      const c = ws.getCell(rowNum, i+1);
      c.value = h;
      c.font = {bold:true, color:{argb:'FFFFFFFF'}};
      c.fill = {type:'pattern', pattern:'solid', fgColor:{argb:fills.title}};
      c.border = border;
      c.alignment = {vertical:'middle', horizontal:'center'};
    });
    ws.getRow(rowNum).height = 20;
  }
  function putText(ws, r, c, v, fill='white'){
    const cell = ws.getCell(r,c);
    cell.value = v == null ? '' : String(v);
    paint(cell, fill);
    return cell;
  }
  function putNum(ws, r, c, v, fill='white'){
    const cell = ws.getCell(r,c);
    cell.value = Number(v || 0);
    cell.numFmt = numFmt;
    paint(cell, fill);
    return cell;
  }
  function putMoney(ws, r, c, v, fill='white'){
    const cell = ws.getCell(r,c);
    cell.value = Number(v || 0);
    cell.numFmt = moneyFmt;
    paint(cell, fill);
    return cell;
  }
  function mergeTitle(ws, row, text, cols){
    ws.mergeCells(row,1,row,cols);
    const cell = ws.getCell(row,1);
    cell.value = text;
    cell.font = {bold:true, color:{argb:'FFFFFFFF'}};
    cell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:fills.title}};
    cell.border = border;
    cell.alignment = {vertical:'middle', horizontal:'center'};
    ws.getRow(row).height = 20;
  }
  function addTotalRow(ws, rowNum, labelCol, valueCol, total){
    putText(ws, rowNum, labelCol, 'TOTAL', 'ok');
    putMoney(ws, rowNum, valueCol, total, 'ok');
  }
  function addImageToCell(ws, dataUrl, row, col){
    if(!dataUrl) return;
    const m = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
    if(!m) return;
    const mime = m[1];
    const ext = mime.includes('png') ? 'png' : (mime.includes('gif') ? 'gif' : 'jpeg');
    const id = wb.addImage({base64:dataUrl, extension:ext});
    ws.getRow(row).height = 60;
    paint(ws.getCell(row,col), 'white');
    ws.addImage(id, { tl: {col: col-1 + 0.08, row: row-1 + 0.08}, ext: {width: 115, height: 72} });
  }
  function makeChartDataUrl(){
    const canvas = document.createElement('canvas');
    canvas.width = 1180; canvas.height = 760;
    const ctx = canvas.getContext('2d');
    const budget = budgetSummary();
    const ev = selectedEvent() || {};

    const socioMoney = Number(budget.ingresosDinero.socios.ingresado || 0);
    const donanteMoney = Number(budget.ingresosDinero.donantes.ingresado || 0);
    const compraMoney = Number(budget.operativa.gastoCompras || 0);
    const orgMoney = Number(budget.operativa.gastosOrganizacion || 0);
    const saldo = Number(budget.operativa.saldoOperativo || 0);
    const donProd = Number(budget.donacionProducto.valorDonado || 0);
    const maxVal = Math.max(1, socioMoney + donanteMoney, compraMoney + orgMoney, Math.abs(saldo), donProd);

    function fmt(v){ return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(v); }
    function drawRoundRect(x,y,w,h,r,color){ ctx.fillStyle=color; ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); ctx.fill(); }
    function drawTrack(y, label, segments, totalLabel){
      ctx.fillStyle = '#111827'; ctx.font = 'bold 20px Arial'; ctx.fillText(label, 40, y + 26);
      drawRoundRect(310, y, 800, 42, 21, '#f3f4f6');
      let x = 310;
      segments.forEach(seg => {
        const w = Math.max(0, (Math.abs(seg.value) / maxVal) * 800);
        if(w <= 0) return;
        drawRoundRect(x, y, w, 42, 21, seg.color);
        x += w;
      });
      ctx.fillStyle = '#111827'; ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center'; ctx.fillText(totalLabel, 710, y + 28); ctx.textAlign = 'left';
    }
    function wrapText(text, x, y, maxWidth, lineHeight){
      const words = String(text || '').split(/\s+/).filter(Boolean);
      const lines = [];
      let line = '';
      words.forEach(word => {
        const test = line ? line + ' ' + word : word;
        if(ctx.measureText(test).width > maxWidth && line){
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      });
      if(line) lines.push(line);
      lines.forEach((ln, i) => ctx.fillText(ln, x, y + i * lineHeight));
      return lines.length;
    }

    ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#111827'; ctx.font = 'bold 28px Arial'; ctx.fillText('RESUMEN VISUAL DEL EVENTO', 40, 40);

    let cardsY = 70;
    const desc = String(ev.descripcion || '').trim();
    const titleTxt = String(ev.titulo || '').trim();
    if(desc){
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('Descripción del evento:', 40, 74);
      ctx.fillStyle = '#334155';
      ctx.font = '15px Arial';
      const lines = wrapText(desc, 240, 74, 900, 22);
      cardsY = 70 + Math.max(0, (lines - 1)) * 22 + 38;
    }
    if(titleTxt){
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('Título del evento:', 40, cardsY);
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 18px Arial';
      const titleLines = wrapText(titleTxt, 200, cardsY, 940, 24);
      cardsY = cardsY + Math.max(1, titleLines) * 24 + 26;
    }

    const cards = [
      ['Ingreso dinero', fmt(socioMoney + donanteMoney)],
      ['Donación de producto', fmt(donProd)],
      ['Gasto total', fmt(compraMoney + orgMoney)],
      ['Saldo operativo', fmt(saldo)]
    ];
    cards.forEach((c,i)=>{
      const x = 40 + i*280; const y = cardsY;
      drawRoundRect(x,y,250,92,18,'#ffffff');
      ctx.strokeStyle = '#dbe2ea'; ctx.lineWidth = 1; ctx.strokeRect(x,y,250,92);
      ctx.fillStyle='#64748b'; ctx.font='bold 16px Arial'; ctx.fillText(c[0], x+16, y+28);
      ctx.fillStyle='#111827'; ctx.font='bold 26px Arial'; ctx.fillText(c[1], x+16, y+62);
    });

    let yBase = cardsY + 130;
    drawTrack(yBase, 'INGRESOS EN DINERO', [
      {value:socioMoney, color:'#86efac'},
      {value:donanteMoney, color:'#16a34a'}
    ], fmt(socioMoney + donanteMoney));
    ctx.fillStyle = '#475569'; ctx.font = '15px Arial'; ctx.fillText('Socios: ' + fmt(socioMoney), 310, yBase + 55); ctx.fillText('Donantes: ' + fmt(donanteMoney), 580, yBase + 55);

    yBase += 100;
    drawTrack(yBase, 'DONACIÓN DE PRODUCTO', [
      {value:Number(budget.donacionProducto.donadoTienda||0), color:'#fcd34d'},
      {value:Number(budget.donacionProducto.donadoSocio||0), color:'#f59e0b'},
      {value:Number(budget.donacionProducto.donadoOtros||0), color:'#b45309'}
    ], fmt(donProd));
    ctx.fillStyle = '#475569'; ctx.fillText('Tiendas: ' + fmt(Number(budget.donacionProducto.donadoTienda||0)), 310, yBase + 55); ctx.fillText('Socios: ' + fmt(Number(budget.donacionProducto.donadoSocio||0)), 580, yBase + 55); ctx.fillText('Otros: ' + fmt(Number(budget.donacionProducto.donadoOtros||0)), 830, yBase + 55);

    yBase += 100;
    drawTrack(yBase, 'GASTOS', [
      {value:compraMoney, color:'#fca5a5'},
      {value:orgMoney, color:'#dc2626'}
    ], fmt(compraMoney + orgMoney));
    ctx.fillStyle = '#475569'; ctx.fillText('Compras: ' + fmt(compraMoney), 310, yBase + 55); ctx.fillText('Organización: ' + fmt(orgMoney), 620, yBase + 55);

    yBase += 100;
    drawTrack(yBase, 'SALDO OPERATIVO', [
      {value:Math.abs(saldo), color: saldo >= 0 ? '#0f766e' : '#b91c1c'}
    ], fmt(saldo));

    return canvas.toDataURL('image/png');
  }

  // RESUMEN
  const wsRes = baseSheet('RESUMEN', [34, 26, 16, 16, 16, 16, 16, 16, 16]);
  let r = 1;
  mergeTitle(wsRes, r++, 'RESUMEN DEL EVENTO', 4);
  putText(wsRes,r,1,'Generado por'); putText(wsRes,r++,2,'ControlEvent v28.10 - ©oltyLAB ’26');
  putText(wsRes,r,1,'Evento'); putText(wsRes,r++,2,ev.titulo);
  putText(wsRes,r,1,'Fechas'); putText(wsRes,r++,2,`(del ${ev.fechaIni || ''} al ${ev.fechaFin || ''})`);
  wsRes.mergeCells(r,2,r,6); putText(wsRes,r,1,'Descripción del evento'); putText(wsRes,r,2,ev.descripcion || ''); wsRes.getCell(r,2).alignment = {vertical:'middle', wrapText:true}; wsRes.getRow(r).height = Math.max(22, Math.min(120, 20 + Math.ceil(String(ev.descripcion||'').length / 55) * 16)); r++;
  putText(wsRes,r,1,'Situación'); putText(wsRes,r++,2,ev.situacion || 'En curso', (ev.situacion === 'Finalizado' ? 'bad' : 'ok'));
  putText(wsRes,r,1,'Precio evento'); putMoney(wsRes,r++,2,ev.precio);
  putText(wsRes,r,1,'Ingreso dinero'); putMoney(wsRes,r++,2,budget.ingresosDinero.totalIngresado);
  putText(wsRes,r,1,'Gasto por compras'); putMoney(wsRes,r++,2,budget.operativa.gastoCompras);
  putText(wsRes,r,1,'Gastos de organización'); putMoney(wsRes,r++,2,budget.operativa.gastosOrganizacion);
  putText(wsRes,r,1,'Valor producto donado'); putMoney(wsRes,r++,2,budget.donacionProducto.valorDonado);
  putText(wsRes,r,1,'Donación de producto tiendas'); putMoney(wsRes,r++,2,budget.donacionProducto.donadoTienda);
  putText(wsRes,r,1,'Donación de producto socios'); putMoney(wsRes,r++,2,budget.donacionProducto.donadoSocio);
  putText(wsRes,r,1,'Donación de productos otros'); putMoney(wsRes,r++,2,budget.donacionProducto.donadoOtros);
  putText(wsRes,r,1,'Saldo operativo'); putMoney(wsRes,r++,2,budget.operativa.saldoOperativo, budget.operativa.saldoOperativo >= 0 ? 'ok' : 'bad');
  putText(wsRes,r,1,'Fecha y hora emisión'); putText(wsRes,r++,2,new Date().toLocaleString('es-ES'));

  // INGRESOS
  const wsIng = baseSheet('INGRESOS', [34, 9, 16, 18, 18, 18]);
  r = 1;
  mergeTitle(wsIng, r++, 'INGRESOS DE SOCIOS Y DONANTES', 6);
  titleRow(wsIng, r++, ['Colaborador/a','Número','Ingreso','Importe obligatorio','Importe voluntario','Total compromiso']);
  collabs.forEach(item => {
    putText(wsIng,r,1,`${item.persona?.nombre || ''} (${item.persona?.rango || ''})`);
    putNum(wsIng,r,2,item.numero);
    putText(wsIng,r,3,item.situacion);
    putMoney(wsIng,r,4,item.base);
    putMoney(wsIng,r,5,item.donation);
    putMoney(wsIng,r,6,item.total);
    if(item.situacion === 'Pendiente') for(let c=1;c<=6;c++) paint(wsIng.getCell(r,c),'bad');
    r++;
  });
  addTotalRow(wsIng, r, 5, 6, collabs.reduce((a,b)=>a+Number(b.total||0),0));

  // COMPRAS Y OTROS GASTOS
  const wsCom = baseSheet('COMPRAS Y OTROS GASTOS', [28, 16, 16, 10, 14, 14, 20, 24, 22]);
  r = 1;
  mergeTitle(wsCom, r++, 'COMPRAS Y OTROS GASTOS', 9);
  titleRow(wsCom, r++, ['Producto','Segmento','Destino','ud','Precio','Importe','Tienda','Ticket u Otros gastos','Responsable']);
  comprasSolo.forEach(item => {
    putText(wsCom,r,1,item.producto?.nombre || '');
    putText(wsCom,r,2,item.producto?.segmento || '');
    putText(wsCom,r,3,item.producto?.destino || '');
    putNum(wsCom,r,4,item.unidades);
    putMoney(wsCom,r,5,item.producto?.precio || 0);
    putMoney(wsCom,r,6,item.importe);
    putText(wsCom,r,7,item.tienda?.nombre || '');
    putText(wsCom,r,8,item.ticketDonacion || 'Pte.Compra u otros gastos');
    putText(wsCom,r,9,item.responsable?.nombre || '');
    if(String(item.ticketDonacion || '').trim() === '') for(let c=1;c<=9;c++) paint(wsCom.getCell(r,c),'bad');
    r++;
  });
  addTotalRow(wsCom, r, 5, 6, comprasSolo.reduce((a,b)=>a+Number(b.importe||0),0));

  // DONACIONES DE PRODUCTO
  const wsDon = baseSheet('DONACIONES DE PRODUCTO', [28, 16, 16, 10, 14, 14, 20, 24, 22]);
  r = 1;
  mergeTitle(wsDon, r++, 'DONACIONES DE PRODUCTO', 9);
  titleRow(wsDon, r++, ['Producto','Segmento','Destino','ud','Precio','Valor','Tienda o Donante','Tipo de donación','Responsable']);
  donacionesSolo.forEach(item => {
    putText(wsDon,r,1,item.producto?.nombre || '');
    putText(wsDon,r,2,item.producto?.segmento || '');
    putText(wsDon,r,3,item.producto?.destino || '');
    putNum(wsDon,r,4,item.unidades);
    putMoney(wsDon,r,5,item.producto?.precio || 0);
    putMoney(wsDon,r,6,item.valor);
    putText(wsDon,r,7,item.tienda?.nombre || '');
    putText(wsDon,r,8,item.ticketDonacion || '');
    putText(wsDon,r,9,item.responsable?.nombre || '');
    r++;
  });
  addTotalRow(wsDon, r, 5, 6, donacionesSolo.reduce((a,b)=>a+Number(b.valor||0),0));

  // AGR. SEGMENTO
  const wsSeg = baseSheet('AGR. SEGMENTO', [40, 18]);
  r = 1;
  mergeTitle(wsSeg, r++, 'CÁLCULOS POR AGRUPACIÓN - SEGMENTO', 2);
  titleRow(wsSeg, r++, ['Segmento','Importe']);
  segRows.forEach(item => {
    putText(wsSeg,r,1,item.k);
    putMoney(wsSeg,r,2,item.v);
    if(item.pending){ paint(wsSeg.getCell(r,1),'bad'); paint(wsSeg.getCell(r,2),'bad'); }
    r++;
  });
  addTotalRow(wsSeg, r, 1, 2, segRows.reduce((a,b)=>a+Number(b.v||0),0));

  // AGR. DESTINO
  const wsDest = baseSheet('AGR. DESTINO', [40, 18]);
  r = 1;
  mergeTitle(wsDest, r++, 'CÁLCULOS POR AGRUPACIÓN - DESTINO', 2);
  titleRow(wsDest, r++, ['Destino','Importe']);
  destRows.forEach(item => {
    putText(wsDest,r,1,item.k);
    putMoney(wsDest,r,2,item.v);
    if(item.pending){ paint(wsDest.getCell(r,1),'bad'); paint(wsDest.getCell(r,2),'bad'); }
    r++;
  });
  addTotalRow(wsDest, r, 1, 2, destRows.reduce((a,b)=>a+Number(b.v||0),0));

  // AGR. TIENDA-TICKET
  const wsTT = baseSheet('AGR.TIENDA-TICKET', [44, 18, 20]);
  r = 1;
  mergeTitle(wsTT, r++, 'CÁLCULOS POR AGRUPACIÓN - TIENDA Y TICKET/DONACIÓN/OTROS GASTOS', 3);
  titleRow(wsTT, r++, ['Tienda y Ticket u Otros gastos','Importe','Ticket']);
  tiendaRows.forEach(item => {
    putText(wsTT,r,1,item.k);
    putMoney(wsTT,r,2,item.v);
    putText(wsTT,r,3,'N/A');
    if(item.donated) wsTT.getCell(r,2).font = {strike:true};
    if(item.pending){
      for(let c=1;c<=3;c++) paint(wsTT.getCell(r,c),'bad');
    } else if(!item.donated && item.image){
      putText(wsTT,r,3,'');
      addImageToCell(wsTT, item.image || '', r, 3);
    }
    r++;
  });
  addTotalRow(wsTT, r, 1, 2, tiendaRows.reduce((a,b)=>a+Number(b.v||0),0));

  // GRAFICAS
  const wsGraf = baseSheet('GRAFICAS', [24,24,24,24]);
  mergeTitle(wsGraf, 1, 'GRÁFICAS DEL EVENTO', 4);
  putText(wsGraf, 2, 1, 'Descripción del evento');
  wsGraf.mergeCells(2,2,2,4);
  putText(wsGraf, 2, 2, ev.descripcion || '');
  wsGraf.getCell(2,2).alignment = {vertical:'middle', wrapText:true};
  wsGraf.getRow(2).height = Math.max(22, Math.min(120, 20 + Math.ceil(String(ev.descripcion||'').length / 40) * 16));
  putText(wsGraf, 4, 1, 'Ingreso dinero'); putMoney(wsGraf, 4, 2, budget.ingresosDinero.totalIngresado);
  putText(wsGraf, 5, 1, 'Donación de producto valorada'); putMoney(wsGraf, 5, 2, budget.donacionProducto.valorDonado);
  putText(wsGraf, 6, 1, 'Gasto por compras'); putMoney(wsGraf, 6, 2, budget.operativa.gastoCompras);
  putText(wsGraf, 7, 1, 'Gastos de organización'); putMoney(wsGraf, 7, 2, budget.operativa.gastosOrganizacion);
  addImageToCell(wsGraf, makeChartDataUrl(), 9, 1);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${(ev.titulo || 'evento').replace(/\s+/g,'_')}_ControlEvent_v28_10.xlsx`;
  link.click();
  URL.revokeObjectURL(link.href);
}




/* ==== PATCH V9.2 ==== */
(function(){
  function opt(id){ return document.getElementById(id); }
  function ensureV92Ui(){
    const donList = document.querySelector('#tabDonaciones .section-title p');
    if(donList) donList.textContent = 'Mantén las donaciones DONADO TIENDA, DONADO SOCIO y DONADO OTROS.';
    const buyTitle = document.querySelector('#tabCompras .section-title h2');
    if(buyTitle) buyTitle.textContent = 'Compras y otros gastos del evento';
    const importBtn = document.getElementById('btnOpenImport');
    if(importBtn) importBtn.classList.remove('app-lockable');
  }

  state.donacionesSort = state.donacionesSort || 'producto';
  state.comprasSort = state.comprasSort || 'producto';

  function migrateStateV92(){
    (state.personas||[]).forEach(p => { if(!p.rango) p.rango = 'SOCIO'; delete p.eventId; });
    (state.tiendas||[]).forEach(t => { delete t.eventId; });
    (state.productos||[]).forEach(p => { delete p.eventId; if(p.precio != null && p.defaultPrecio == null) p.defaultPrecio = Number(p.precio||0); if(p.tiendaId && !p.defaultTiendaId) p.defaultTiendaId = p.tiendaId; delete p.precio; delete p.tiendaId; });
    (state.compras||[]).forEach(c => {
      c.unidades = Number(c.unidades||0);
      if(c.precio == null){
        const prod = state.productos.find(p => p.id === c.productoId);
        c.precio = Number(prod?.defaultPrecio || 0);
      }
      if(isDonationTicket(c.ticketDonacion)){
        if(!c.donorRef){
          if(c.tiendaId) c.donorRef = 'T:' + c.tiendaId;
          else {
            const prod = state.productos.find(p => p.id === c.productoId);
            if(prod?.defaultTiendaId) c.donorRef = 'T:' + prod.defaultTiendaId;
          }
        }
      } else {
        if(!c.tiendaId){
          const prod = state.productos.find(p => p.id === c.productoId);
          if(prod?.defaultTiendaId) c.tiendaId = prod.defaultTiendaId;
        }
      }
      c.responsableId = c.responsableId || '';
    });
  }
  migrateStateV92();

  function moneyText(v){ return money(Number(v||0)); }
  function personasGenerales(){ return (state.personas||[]).slice(); }
  function tiendasGenerales(){ return (state.tiendas||[]).slice(); }
  function productosGenerales(){ return (state.productos||[]).slice(); }
  function sociosOnly(){ return personasGenerales().filter(p => p.rango === 'SOCIO'); }
  function donorsPeople(){ return personasGenerales().filter(p => p.rango === 'DONANTE'); }
  function socioResponsableOptions(){
  const unique = [];
  const seen = new Set();
  personasForSelectedEvent()
    .filter(p => String(p.rango || '').trim().toUpperCase() === 'SOCIO')
    .forEach(p => {
      const label = String(p.nombre || '').trim();
      if(!label) return;
      const key = label.toLowerCase();
      if(seen.has(key)) return;
      seen.add(key);
      unique.push({value:p.id, label});
    });
  return unique.sort((a,b)=>a.label.localeCompare(b.label,'es'));
}

function normalizedOptionLabel(value){
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function socioResponsableOptions(){
  const unique = [];
  const seen = new Set();
  personasForSelectedEvent()
    .filter(p => String(p.rango || '').trim().toUpperCase() === 'SOCIO')
    .forEach(p => {
      const label = String(p.nombre || '').trim();
      if(!label) return;
      const key = normalizedOptionLabel(label);
      if(seen.has(key)) return;
      seen.add(key);
      unique.push({value:p.id, label});
    });
  return unique.sort((a,b)=>a.label.localeCompare(b.label,'es'));
}

async function changeSelectedEvent(value){
  const wasLocked = isLocked();
  const wasGod = isGodRole();

  if(wasLocked && !wasGod) return;

  state.selectedEventId = value || '';
  render();

  if(wasLocked && wasGod){
    try{
      try{
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }catch(_){}

      await pushStateToServer();

      const fresh = await fetch('/api/state', {cache:'no-store'});
      if(fresh.ok){
        const serverState = await fresh.json();
        Object.keys(state).forEach(k => { delete state[k]; });
        Object.assign(state, mergeLoadedState(serverState, defaultState()));
        render();
      }
    }catch(err){
      console.error(err);
    }
  }
}

function donorOptions(){
    const unique = [];
    const seen = new Set();

    personasGenerales().forEach(p => {
      const label = String(p.nombre || '').trim();
      if(!label) return;
      const key = normalizedOptionLabel(label);
      if(seen.has(key)) return;
      seen.add(key);
      unique.push({value:'P:'+p.id, label, kind:'persona'});
    });

    tiendasGenerales().forEach(t => {
      const label = String(t.nombre || '').trim();
      if(!label) return;
      const key = normalizedOptionLabel(label);
      if(seen.has(key)) return;
      seen.add(key);
      unique.push({value:'T:'+t.id, label, kind:'tienda'});
    });

    return unique.sort((a,b)=>a.label.localeCompare(b.label,'es'));
  }
  function donorLabel(ref){
    if(!ref) return '';
    const [kind,id] = String(ref).split(':');
    if(kind === 'P') return personaById(id)?.nombre || '';
    if(kind === 'T') return tiendaById(id)?.nombre || '';
    return '';
  }

  personasForSelectedEvent = function(){ return personasGenerales(); };
  tiendasForSelectedEvent = function(){ return tiendasGenerales(); };
  productosForSelectedEvent = function(){ return productosGenerales(); };

  collabsForEvent = function(){
    return state.colaboradores
      .filter(c => c.eventId === state.selectedEventId)
      .map(c => {
        const persona = personaById(c.personaId);
        const base = persona?.rango === 'SOCIO' ? Number(c.numero || 0) * Number(selectedEvent()?.precio || 0) : 0;
        const donation = Number(c.importe || 0);
        const total = base + donation;
        return {...c, persona, base, donation, total};
      })
      .sort((a,b) => {
        const order = {'Pendiente':0,'Efectivo':1,'Banco':2,'Bizum':3};
        const oa = order[a.situacion] ?? 9, ob = order[b.situacion] ?? 9;
        if(oa !== ob) return oa - ob;
        return (a.persona?.nombre || '').localeCompare((b.persona?.nombre || ''), 'es');
      });
  };

  comprasForEvent = function(){
    return state.compras
      .filter(c => c.eventId === state.selectedEventId)
      .map(c => {
        const productoBase = productoById(c.productoId) || {};
        const precio = Number(c.precio != null ? c.precio : (productoBase.defaultPrecio || 0));
        const unidades = Number(c.unidades || 0);
        const valor = precio * unidades;
        const donation = isDonationTicket(c.ticketDonacion);
        const importe = donation ? 0 : valor;
        const tienda = donation
          ? {id: c.donorRef || '', nombre: donorLabel(c.donorRef)}
          : tiendaById(c.tiendaId || '') || {id:'', nombre:''};
        const producto = {...productoBase, precio};
        return {
          ...c,
          producto,
          tienda,
          valor,
          importe,
          responsable: personaById(c.responsableId || ''),
          donorLabel: donorLabel(c.donorRef || '')
        };
      });
  };

  budgetSummary = function(){
    const rows = collabsForEvent();
    const compras = comprasForEvent();
    const sociosRows = rows.filter(r => r.persona?.rango === 'SOCIO');
    const donantesRows = rows.filter(r => r.persona?.rango !== 'SOCIO');

    const sumNum = arr => arr.reduce((a,b) => a + Number(b.numero || 0), 0);
    const sumTotal = arr => arr.reduce((a,b) => a + Number(b.total || 0), 0);
    const paidTotal = arr => arr.filter(r => r.situacion !== 'Pendiente').reduce((a,b) => a + Number(b.total || 0), 0);
    const pendingTotal = arr => arr.filter(r => r.situacion === 'Pendiente').reduce((a,b) => a + Number(b.total || 0), 0);

    const sociosCount = sumNum(sociosRows);
    const donantesCount = sumNum(donantesRows);
    const sociosImporte = sumTotal(sociosRows);
    const sociosIngresado = paidTotal(sociosRows);
    const sociosPendiente = pendingTotal(sociosRows);
    const donantesImporte = sumTotal(donantesRows);
    const donantesIngresado = paidTotal(donantesRows);
    const donantesPendiente = pendingTotal(donantesRows);
    const dineroIngresado = sociosIngresado + donantesIngresado;

    const gastoCompras = compras.filter(c => !isDonationTicket(c.ticketDonacion) && !isCurrentExpenseTicket(c.ticketDonacion) && String(c.ticketDonacion||'').trim() !== '').reduce((a,b) => a + b.valor, 0);
    const gastosOrganizacion = compras.filter(c => isCurrentExpenseTicket(c.ticketDonacion)).reduce((a,b) => a + b.valor, 0);
    const pendiente = compras.filter(c => !isDonationTicket(c.ticketDonacion) && String(c.ticketDonacion||'').trim() === '').reduce((a,b)=>a+b.valor,0);
    const donadoTienda = compras.filter(c => c.ticketDonacion === 'DONADO TIENDA').reduce((a,b)=>a+b.valor,0);
    const donadoSocio = compras.filter(c => c.ticketDonacion === 'DONADO SOCIO').reduce((a,b)=>a+b.valor,0);
    const donadoOtros = compras.filter(c => c.ticketDonacion === 'DONADO OTROS').reduce((a,b)=>a+b.valor,0);
    const valorDonado = donadoTienda + donadoSocio + donadoOtros;
    const saldoOperativo = dineroIngresado - gastoCompras - gastosOrganizacion;

    return {
      ingresosDinero: {
        socios: {count:sociosCount, importe:sociosImporte, ingresado:sociosIngresado, pendiente:sociosPendiente},
        donantes: {count:donantesCount, importe:donantesImporte, ingresado:donantesIngresado, pendiente:donantesPendiente},
        totalIngresado: dineroIngresado
      },
      donacionProducto: {donadoTienda, donadoSocio, donadoOtros, valorDonado},
      operativa: {ingresoDinero: dineroIngresado, gastoCompras, gastosOrganizacion, pendiente, saldoOperativo},
      compras: {total: gastoCompras + gastosOrganizacion + valorDonado, resueltas: gastoCompras, pendientes: pendiente, valorDonado, gastosCorrientes: gastosOrganizacion, saldoReal: saldoOperativo}
    };
  };

  summaryBySegmento = function(){
    const compras = comprasForEvent();
    return SEGMENT_OPTIONS.flatMap(seg => {
      const comprado = compras.filter(c => (c.producto?.segmento || '') === seg && String(c.ticketDonacion || '').trim() !== '').reduce((a,b) => a + b.valor, 0);
      const pdte = compras.filter(c => (c.producto?.segmento || '') === seg && String(c.ticketDonacion || '').trim() === '').reduce((a,b) => a + b.valor, 0);
      return [
        {k: `${seg} Comprado o donado`, v: comprado, pending:false, donated:false},
        {k: `${seg} Pte.Compra u otros gastos`, v: pdte, pending:true, donated:false},
      ];
    });
  };

  summaryByDestino = function(){
    const compras = comprasForEvent();
    return DESTINO_OPTIONS.flatMap(dest => {
      const comprado = compras.filter(c => (c.producto?.destino || '') === dest && String(c.ticketDonacion || '').trim() !== '').reduce((a,b) => a + b.valor, 0);
      const pdte = compras.filter(c => (c.producto?.destino || '') === dest && String(c.ticketDonacion || '').trim() === '').reduce((a,b) => a + b.valor, 0);
      return [
        {k: `${dest} Comprado o donado`, v: comprado, pending:false, donated:false},
        {k: `${dest} Pte.Compra u otros gastos`, v: pdte, pending:true, donated:false},
      ];
    });
  };

  summaryByTiendaTicket = function(){
    const filled = {};
    const pending = {};
    comprasForEvent().forEach(c => {
      const holder = c.tienda?.nombre || 'Sin tienda';
      const rawTicket = String(c.ticketDonacion || '').trim();
      const productName = String(c.producto?.nombre || '').trim();
      const displayTicket = (c.valor === 0 && productName) ? productName : (rawTicket || 'Pte.Compra u otros gastos');
      const key = `${holder} | ${displayTicket}`;
      if(rawTicket === ''){
        pending[key] = (pending[key] || 0) + c.valor;
      } else {
        const donated = isDonationTicket(c.ticketDonacion);
        if(!filled[key]) filled[key] = {v:0, donated, rawTicket, holder};
        filled[key].v += c.valor;
        filled[key].donated = filled[key].donated || donated;
      }
    });
    const rows = Object.entries(filled).map(([k,obj])=>({
      k, v:obj.v, pending:false, donated:obj.donated,
      image:(!obj.donated && obj.v>0 && state.ticketImages?.[ticketImageStateKey(k)]) ? state.ticketImages[ticketImageStateKey(k)] : ''
    })).concat(Object.entries(pending).map(([k,v])=>({k,v,pending:true,donated:false,image:''})));
    const sortMode = state.summaryTiendaSort || 'tienda';
    rows.sort((a,b)=>{
      const [ta='',tk=''] = a.k.split(' | ');
      const [tb='',tl=''] = b.k.split(' | ');
      if(sortMode === 'ticket'){
        const s1 = tk.localeCompare(tl,'es');
        if(s1 !== 0) return s1;
        return ta.localeCompare(tb,'es');
      }
      const s1 = ta.localeCompare(tb,'es');
      if(s1 !== 0) return s1;
      return tk.localeCompare(tl,'es');
    });
    return rows;
  };

  renderMainSelectors = function(){
    const personas = personasGenerales().slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
    const productos = productosGenerales().slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
    const tiendas = tiendasGenerales().slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
    const socios = sociosOnly().slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
    const donors = donorOptions();

    opt('collabPersona').innerHTML = '<option value="" selected>Busca colaborador/a.....</option>' + personas.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)} (${escapeHtml(p.rango)})</option>`).join('');
    opt('collabSituacion').innerHTML = PAYMENT_OPTIONS.map(v => `<option value="${v}">${v}</option>`).join('');

    opt('buyProducto').innerHTML = '<option value="" selected>Busca un producto....</option>' + productos.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`).join('');
    opt('buyTicket').innerHTML = PURCHASE_TICKET_OPTIONS.map(v => `<option value="${v}">${v === '' ? '-- Pte.Compra u otros gastos --' : escapeHtml(v)}</option>`).join('');
    opt('buyResponsable').innerHTML = '<option value="">-- sin responsable --</option>' + socios.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`).join('');
    opt('buyTienda').innerHTML = '<option value="">-- elige tienda --</option>' + tiendas.map(t => `<option value="${t.id}">${escapeHtml(t.nombre)}</option>`).join('');

    opt('donProducto').innerHTML = '<option value="" selected>Busca un producto....</option>' + productos.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`).join('');
    opt('donTicket').innerHTML = DONATION_TICKET_OPTIONS.map(v => `<option value="${v}">${escapeHtml(v)}</option>`).join('');
    opt('donResponsable').innerHTML = '<option value="">-- sin responsable --</option>' + socios.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`).join('');
    opt('donDonante').innerHTML = '<option value="">-- elige donante --</option>' + donors.map(d => `<option value="${d.value}">${escapeHtml(d.label)}</option>`).join('');

    updateBuyPreview();
    updateDonationPreview();
  };

  renderTabVisibility = function(){
    const hasEvent = !!selectedEvent();
    opt('noEventMessage').classList.toggle('hidden', hasEvent);
    opt('tabIngresos').classList.toggle('hidden', currentMainTab !== 'ingresos' || !hasEvent);
    opt('tabDonaciones').classList.toggle('hidden', currentMainTab !== 'donaciones' || !hasEvent);
    opt('tabCompras').classList.toggle('hidden', currentMainTab !== 'compras' || !hasEvent);
    opt('tabResumen').classList.toggle('hidden', currentMainTab !== 'resumen' || !hasEvent);
    opt('tabGraficas').classList.toggle('hidden', currentMainTab !== 'graficas' || !hasEvent);
    opt('tabIngresosBtn').classList.toggle('active', currentMainTab === 'ingresos');
    opt('tabDonacionesBtn').classList.toggle('active', currentMainTab === 'donaciones');
    opt('tabComprasBtn').classList.toggle('active', currentMainTab === 'compras');
    opt('tabResumenBtn').classList.toggle('active', currentMainTab === 'resumen');
    opt('tabGraficasBtn').classList.toggle('active', currentMainTab === 'graficas');
    const comprasBody = opt('comprasEventBody');
    if(comprasBody) comprasBody.classList.toggle('hidden', !showComprasEvent);
  };

  renderMaintenanceTabs = function(){
    const map = {
      personas:['mtPersonas','mtPersonasBtn'],
      eventos:['mtEventos','mtEventosBtn'],
      tiendas:['mtTiendas','mtTiendasBtn'],
      productos:['mtProductos','mtProductosBtn'],
      acceso:['mtAcceso','mtAccesoBtn'],
      importar:['mtImportar','mtImportBtn']
    };
    Object.entries(map).forEach(([k,[cid,bid]])=>{
      const c = opt(cid); if(c) c.classList.toggle('hidden', currentMaintTab !== k || (k === 'acceso' && !isGodRole()));
      const b = opt(bid); if(b) b.classList.toggle('active', currentMaintTab === k);
    });
  };

  renderPersonas = function(){
    opt('newPersonaRango').innerHTML = PERSONA_RANGOS.map(v => `<option value="${v}">${v}</option>`).join('');
    const wrap = opt('personasList');
    const list = personasGenerales().slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
    if(!list.length){ wrap.innerHTML = '<div class="empty">No hay personas.</div>'; return; }
    wrap.innerHTML = '';
    list.forEach(p => {
      const row = document.createElement('div');
      row.className = 'itemcard maint-soft';
      row.innerHTML = `
        <div class="rowline persona">
          <div class="field"><label>Nombre</label><input value="${escapeHtml(p.nombre)}" data-action="edit-persona-nombre" data-id="${p.id}" /></div>
          <div class="field"><label>Rango</label><select data-action="edit-persona-rango" data-id="${p.id}">${PERSONA_RANGOS.map(v => `<option value="${v}" ${v===p.rango?'selected':''}>${v}</option>`).join('')}</select></div>
          <button type="button" class="modify small" data-action="save-persona" data-id="${p.id}">Modificar</button>
          <button type="button" class="danger small" data-action="delete-persona" data-id="${p.id}">Eliminar</button>
        </div>`;
      wrap.appendChild(row);
    });
  };

  renderTiendas = function(){
    const wrap = opt('tiendasList');
    const list = tiendasGenerales().slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
    if(!list.length){ wrap.innerHTML = '<div class="empty">No hay tiendas.</div>'; return; }
    wrap.innerHTML = '';
    list.forEach(t => {
      const row = document.createElement('div');
      row.className = 'itemcard maint-soft';
      row.innerHTML = `
        <div class="rowline tienda">
          <div class="field"><label>Nombre</label><input value="${escapeHtml(t.nombre)}" data-action="edit-tienda-nombre" data-id="${t.id}" /></div>
          <button type="button" class="modify small" data-action="save-tienda" data-id="${t.id}">Modificar</button>
          <button type="button" class="danger small" data-action="delete-tienda" data-id="${t.id}">Eliminar</button>
        </div>`;
      wrap.appendChild(row);
    });
  };

  renderProductos = function(){
    opt('newProductoSegmento').innerHTML = SEGMENT_OPTIONS.map(v => `<option value="${v}">${v}</option>`).join('');
    opt('newProductoDestino').innerHTML = DESTINO_OPTIONS.map(v => `<option value="${v}">${v}</option>`).join('');
    const wrap = opt('productosList');
    const getters = { nombre:p=>p.nombre||'', segmento:p=>p.segmento||'', destino:p=>p.destino||'' };
    const list = productosGenerales().slice().sort((a,b)=>getters[currentProductSort](a).localeCompare(getters[currentProductSort](b),'es'));
    if(!list.length){ wrap.innerHTML = '<div class="empty">No hay productos.</div>'; return; }
    wrap.innerHTML = '';
    const hdr = document.createElement('div');
    hdr.className = 'hint';
    hdr.innerHTML = 'Ordenar por: <a href="#" class="link-sort" data-sort-producto="nombre">Nombre</a> · <a href="#" class="link-sort" data-sort-producto="segmento">Segmento</a> · <a href="#" class="link-sort" data-sort-producto="destino">Destino</a>';
    wrap.appendChild(hdr);
    list.forEach(p => {
      const row = document.createElement('div');
      row.className = 'itemcard maint-soft';
      row.innerHTML = `
        <div class="rowline producto">
          <div class="field"><label>Nombre</label><input value="${escapeHtml(p.nombre)}" data-action="edit-producto-nombre" data-id="${p.id}" /></div>
          <div class="field"><label>Segmento</label><select data-action="edit-producto-segmento" data-id="${p.id}">${SEGMENT_OPTIONS.map(v => `<option value="${v}" ${v===p.segmento?'selected':''}>${v}</option>`).join('')}</select></div>
          <div class="field"><label>Destino</label><select data-action="edit-producto-destino" data-id="${p.id}">${DESTINO_OPTIONS.map(v => `<option value="${v}" ${v===p.destino?'selected':''}>${v}</option>`).join('')}</select></div>
          <button type="button" class="modify small" data-action="save-producto" data-id="${p.id}">Modificar</button>
          <button type="button" class="danger small" data-action="delete-producto" data-id="${p.id}">Eliminar</button>
        </div>`;
      wrap.appendChild(row);
    });
  };

  renderLockState = function(){
    const locked = isLocked();
    document.querySelectorAll('.app-lockable').forEach(el => {
      el.classList.toggle('locked', locked);
      if(el.matches('button,select,input')) el.disabled = locked;
    });

    setElementEnabled(opt('selectedEvent'), !locked || isGodRole());
    setElementEnabled(opt('btnLogout'), true);
    setElementEnabled(opt('btnExportExcel'), !locked || isGodRole());

    if(canUnlockFinalizedEvent()){
      setElementEnabled(opt('btnToggleMaintenance'), true);
      setElementEnabled(opt('mtEventosBtn'), true);

      const eventosCard = opt('mtEventos');
      if(eventosCard){
        eventosCard.classList.remove('locked');
        eventosCard.style.pointerEvents = 'auto';
        eventosCard.style.opacity = '1';
      }

      document.querySelectorAll('[data-action^="edit-evento-"], [data-action="save-evento"]').forEach(el => {
        const action = el.getAttribute('data-action') || '';
        const allow = action === 'edit-evento-situacion' || action === 'save-evento';
        setElementEnabled(el, allow);
      });
      document.querySelectorAll('[data-action="delete-evento"]').forEach(el => setElementEnabled(el, false));

      ['newEventoTitulo','newEventoPrecio','newEventoFechaIni','newEventoFechaFin','newEventoSituacion','newEventoDescripcion','btnAddEvento'].forEach(id => {
        setElementEnabled(opt(id), false);
      });
    }

    const m = opt('btnToggleMaintenance');
    if(m){
      const wrap = opt('maintenanceWrapper');
      const open = wrap ? !wrap.classList.contains('hidden') : false;
      m.classList.toggle('maint-btn-open', open);
      m.classList.toggle('maint-btn-closed', !open);
    }
  };

  addPersona = function(){
    const nombre = (opt('newPersonaNombre').value || '').trim();
    const rango = opt('newPersonaRango').value;
    if(!nombre) return;
    state.personas.push({id:uid(), nombre, rango});
    opt('newPersonaNombre').value = '';
    render();
  };

  addTienda = function(){
    const nombre = (opt('newTiendaNombre').value || '').trim();
    if(!nombre) return;
    state.tiendas.push({id:uid(), nombre});
    opt('newTiendaNombre').value = '';
    render();
  };

  addProducto = function(){
    const nombre = (opt('newProductoNombre').value || '').trim();
    if(!nombre) return;
    state.productos.push({id:uid(), nombre, segmento:opt('newProductoSegmento').value, destino:opt('newProductoDestino').value});
    opt('newProductoNombre').value = '';
    render();
  };

  addColab = function(){
    if(!selectedEvent()) return;
    const personaId = opt('collabPersona').value;
    if(!personaId) return;
    state.colaboradores.push({
      id:uid(),
      eventId:state.selectedEventId,
      personaId,
      numero:Number(opt('collabNumero').value || 0),
      situacion:opt('collabSituacion').value,
      importe:parseEuroInput(opt('collabImporte').value || 0)
    });
    opt('collabPersona').value = '';
    opt('collabNumero').value = '1';
    opt('collabSituacion').value = 'Pendiente';
    opt('collabImporte').value = '0,00 €';
    render();
  };

  addCompra = function(){
    if(!selectedEvent()) return;
    const productoId = opt('buyProducto').value;
    if(!productoId) return;
    state.compras.push({
      id:uid(),
      eventId:state.selectedEventId,
      productoId,
      unidades:Number(opt('buyUnidades').value || 0),
      precio:parseEuroInput(opt('buyPrecio').value || 0),
      ticketDonacion:opt('buyTicket').value,
      tiendaId:opt('buyTienda').value || '',
      responsableId:opt('buyResponsable').value || ''
    });
    opt('buyProducto').value = '';
    opt('buyUnidades').value = '1.00';
    opt('buyPrecio').value = '0,00 €';
    opt('buyTicket').value = '';
    opt('buyTienda').value = '';
    opt('buyResponsable').value = '';
    render();
  };

  addDonation = function(){
    if(!selectedEvent()) return;
    const productoId = opt('donProducto').value;
    if(!productoId) return;
    state.compras.push({
      id:uid(),
      eventId:state.selectedEventId,
      productoId,
      unidades:Number(opt('donUnidades').value || 0),
      precio:parseEuroInput(opt('donPrecio').value || 0),
      ticketDonacion:opt('donTicket').value,
      donorRef:opt('donDonante').value || '',
      responsableId:opt('donResponsable').value || ''
    });
    opt('donProducto').value = '';
    opt('donUnidades').value = '1.00';
    opt('donPrecio').value = '0,00 €';
    opt('donTicket').value = DONATION_TICKET_OPTIONS[0];
    opt('donDonante').value = '';
    opt('donResponsable').value = '';
    render();
  };

  updateBuyPreview = function(){
    const unidades = Number(opt('buyUnidades')?.value || 0);
    const precio = parseEuroInput(opt('buyPrecio')?.value || 0);
    const importe = precio * unidades;
    if(opt('buyImporte')) opt('buyImporte').value = moneyText(importe);
  };

  updateDonationPreview = function(){
    const unidades = Number(opt('donUnidades')?.value || 0);
    const precio = parseEuroInput(opt('donPrecio')?.value || 0);
    const valor = precio * unidades;
    if(opt('donImporte')) opt('donImporte').value = moneyText(valor);
  };

  renderCompras = function(){
    const wrap = opt('comprasList');
    let rows = comprasForEvent().filter(r => !isDonationTicket(r.ticketDonacion)).slice();
    const sorts = {
      producto:(a,b)=> (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es') || String(a.ticketDonacion||'').localeCompare(String(b.ticketDonacion||''),'es'),
      ticket:(a,b)=> String(a.ticketDonacion||'').localeCompare(String(b.ticketDonacion||''),'es') || (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es'),
      tienda:(a,b)=> (a.tienda?.nombre||'').localeCompare((b.tienda?.nombre||''),'es') || (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es'),
      responsable:(a,b)=> (a.responsable?.nombre||'').localeCompare((b.responsable?.nombre||''),'es') || (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es'),
    };
    rows.sort(sorts[state.comprasSort] || sorts.producto);
    if(!rows.length){ wrap.innerHTML = '<div class="empty">Todavía no hay compras u otros gastos para este evento.</div>'; return; }
    const socios = sociosOnly().slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
    const tiendas = tiendasGenerales().slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
    wrap.innerHTML = '<div class="hint">Ordenar por: <a href="#" onclick="state.comprasSort=\'producto\'; renderCompras(); return false;">Producto</a> · <a href="#" onclick="state.comprasSort=\'ticket\'; renderCompras(); return false;">Ticket</a> · <a href="#" onclick="state.comprasSort=\'tienda\'; renderCompras(); return false;">Tienda</a> · <a href="#" onclick="state.comprasSort=\'responsable\'; renderCompras(); return false;">Responsable</a></div>';
    rows.forEach(r => {
      const pending = String(r.ticketDonacion || '').trim() === '';
      const row = document.createElement('div');
      row.className = 'itemcard' + (pending ? ' red-row' : '');
      row.innerHTML = `
        <div class="rowline compra">
          <div class="field"><label>Producto</label><select data-action="edit-compra-producto" data-id="${r.id}">${productosGenerales().slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es')).map(p => `<option value="${p.id}" ${p.id===r.productoId?'selected':''}>${escapeHtml(p.nombre)}</option>`).join('')}</select></div>
          <div class="field"><label>Unidades</label><input type="number" min="0" step="0.01" value="${Number(r.unidades||0)}" data-action="edit-compra-unidades" data-id="${r.id}" /></div>
          <div class="field"><label>Precio</label><input class="money-text" type="text" value="${euroInputValue(r.producto?.precio||0)}" data-action="edit-compra-precio" data-id="${r.id}" /></div>
          <div class="field"><label>Importe</label><input class="soft-readonly" readonly value="${moneyText(r.importe)}" /></div>
          <div class="field"><label>Ticket u Otros gastos</label><select data-action="edit-compra-ticket" data-id="${r.id}">${PURCHASE_TICKET_OPTIONS.map(v => `<option value="${v}" ${v===r.ticketDonacion?'selected':''}>${v === '' ? '-- Pte.Compra u otros gastos --' : escapeHtml(v)}</option>`).join('')}</select></div>
          <div class="field"><label>Tienda</label><select data-action="edit-compra-tienda" data-id="${r.id}"><option value="" ${!r.tiendaId?'selected':''}>-- elige tienda --</option>${tiendas.map(t => `<option value="${t.id}" ${t.id===r.tiendaId?'selected':''}>${escapeHtml(t.nombre)}</option>`).join('')}</select></div>
          <div class="field"><label>Responsable</label><select data-action="edit-compra-responsable" data-id="${r.id}"><option value="" ${!r.responsableId?'selected':''}>-- sin responsable --</option>${socios.map(p => `<option value="${p.id}" ${p.id===r.responsableId?'selected':''}>${escapeHtml(p.nombre)}</option>`).join('')}</select></div>
          <div style="display:flex;gap:8px;align-items:end"><button type="button" class="modify small" data-action="save-compra" data-id="${r.id}">Modificar</button><button type="button" class="danger small" data-action="delete-compra" data-id="${r.id}">Eliminar</button></div>
        </div>`;
      wrap.appendChild(row);
    });
  };

  renderDonaciones = function(){
    const wrap = opt('donacionesList');
    let rows = comprasForEvent().filter(r => isDonationTicket(r.ticketDonacion)).slice();
    const sorts = {
      producto:(a,b)=> (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es'),
      ticket:(a,b)=> String(a.ticketDonacion||'').localeCompare(String(b.ticketDonacion||''),'es'),
      donante:(a,b)=> (a.donorLabel||'').localeCompare((b.donorLabel||''),'es'),
      responsable:(a,b)=> (a.responsable?.nombre||'').localeCompare((b.responsable?.nombre||''),'es')
    };
    rows.sort((a,b)=>{
      const order = sorts[state.donacionesSort] || sorts.producto;
      const primary = order(a,b);
      if(primary !== 0) return primary;
      return (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es');
    });
    if(!rows.length){ wrap.innerHTML = '<div class="empty">Todavía no hay donaciones de producto para este evento.</div>'; return; }
    const socios = sociosOnly().slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
    const donors = donorOptions();
    wrap.innerHTML = '<div class="hint">Ordenar por: <a href="#" onclick="state.donacionesSort=\'producto\'; renderDonaciones(); return false;">Producto</a> · <a href="#" onclick="state.donacionesSort=\'ticket\'; renderDonaciones(); return false;">Tipo de donación</a> · <a href="#" onclick="state.donacionesSort=\'donante\'; renderDonaciones(); return false;">Donante</a> · <a href="#" onclick="state.donacionesSort=\'responsable\'; renderDonaciones(); return false;">Responsable</a></div>';
    rows.forEach(r => {
      const row = document.createElement('div');
      row.className = 'itemcard';
      row.innerHTML = `
        <div class="rowline compra">
          <div class="field"><label>Producto</label><select data-action="edit-donacion-producto" data-id="${r.id}">${productosGenerales().slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es')).map(p => `<option value="${p.id}" ${p.id===r.productoId?'selected':''}>${escapeHtml(p.nombre)}</option>`).join('')}</select></div>
          <div class="field"><label>Unidades</label><input type="number" min="0" step="0.01" value="${Number(r.unidades||0)}" data-action="edit-donacion-unidades" data-id="${r.id}" /></div>
          <div class="field"><label>Precio</label><input class="money-text" type="text" value="${euroInputValue(r.producto?.precio||0)}" data-action="edit-donacion-precio" data-id="${r.id}" /></div>
          <div class="field"><label>Valor</label><input class="soft-readonly" readonly value="${moneyText(r.valor)}" /></div>
          <div class="field"><label>Tipo de donación</label><select data-action="edit-donacion-ticket" data-id="${r.id}">${DONATION_TICKET_OPTIONS.map(v => `<option value="${v}" ${v===r.ticketDonacion?'selected':''}>${escapeHtml(v)}</option>`).join('')}</select></div>
          <div class="field"><label>Donante</label><select data-action="edit-donacion-donante" data-id="${r.id}"><option value="" ${!r.donorRef?'selected':''}>-- elige donante --</option>${donors.map(d => `<option value="${d.value}" ${d.value===r.donorRef?'selected':''}>${escapeHtml(d.label)}</option>`).join('')}</select></div>
          <div class="field"><label>Responsable</label><select data-action="edit-donacion-responsable" data-id="${r.id}"><option value="" ${!r.responsableId?'selected':''}>-- sin responsable --</option>${socios.map(p => `<option value="${p.id}" ${p.id===r.responsableId?'selected':''}>${escapeHtml(p.nombre)}</option>`).join('')}</select></div>
          <div style="display:flex;gap:8px;align-items:end"><button type="button" class="modify small" data-action="save-donacion" data-id="${r.id}">Modificar</button><button type="button" class="danger small" data-action="delete-donacion" data-id="${r.id}">Eliminar</button></div>
        </div>`;
      wrap.appendChild(row);
    });
  };

  async function importV92Workbook(){
    const input = opt('importWorkbookFile');
    const file = input?.files?.[0];
    if(!file){
      setImportStatus('Selecciona primero un archivo Excel.', 'bad');
      return;
    }
    try{
      await ensureSheetJS();
      const buffer = await file.arrayBuffer();
      const workbook = window.XLSX.read(buffer, {type:'array'});
      const mode = (opt('importMode')?.value || 'REPLACE').toUpperCase();
      const personasRows = readSheetRows(workbook, 'PERSONAS');
      const eventosRows = readSheetRows(workbook, 'EVENTOS');
      const tiendasRows = readSheetRows(workbook, 'TIENDAS');
      const productosRows = readSheetRows(workbook, 'PRODUCTOS');
      const ingresosRows = readSheetRows(workbook, 'INGRESOS');
      const comprasRows = readSheetRows(workbook, 'COMPRAS');
      const donacionesRows = readSheetRows(workbook, 'DONACIONES');
      const ticketsRows = readSheetRows(workbook, 'TICKETS');

      const missing = [];
      ['PERSONAS','EVENTOS','TIENDAS','PRODUCTOS','INGRESOS','COMPRAS','DONACIONES'].forEach(name => {
        if(!workbook.SheetNames.find(n => normalizeHeader(n)===name)) missing.push(name);
      });
      if(missing.length){
        setImportStatus('Faltan hojas obligatorias: ' + missing.join(', '), 'bad');
        return;
      }

      const baseState = mode === 'RESUME' ? {
        personas:[...(state.personas||[])],
        eventos:[...(state.eventos||[])],
        tiendas:[...(state.tiendas||[])],
        productos:[...(state.productos||[])],
        colaboradores:[...(state.colaboradores||[])],
        compras:[...(state.compras||[])],
        ticketImages:{...(state.ticketImages||{})},
        selectedEventId: state.selectedEventId || ''
      } : {
        personas:[], eventos:[], tiendas:[], productos:[], colaboradores:[], compras:[], ticketImages:{}, selectedEventId:''
      };

      const personMap = {};
      const eventMap = {};
      const storeMap = {};
      const productMap = {};

      eventosRows.forEach(row => {
        const code = String(pick(row, ['EVENTO_CODIGO','CODIGO','ID'])).trim();
        const titulo = String(pick(row, ['EVENTO_TITULO','TITULO'])).trim();
        if(!code || !titulo) return;
        const id = uid();
        eventMap[code] = id;
        baseState.eventos.push({
          id,
          titulo,
          precio: parseEuroInput(pick(row, ['EVENTO_PRECIO','PRECIO'], 0)),
          fechaIni: String(pick(row, ['EVENTO_FECHAINI','FECHAINI','FECHA_INI'])).trim(),
          fechaFin: String(pick(row, ['EVENTO_FECHAFIN','FECHAFIN','FECHA_FIN'])).trim(),
          situacion: String(pick(row, ['EVENTO_SITUACION','SITUACION'], 'En curso')).trim() === 'Finalizado' ? 'Finalizado' : 'En curso',
          descripcion: String(pick(row, ['EVENTO_DESCRIPCION','DESCRIPCION'])).trim()
        });
      });

      personasRows.forEach(row => {
        const code = String(pick(row, ['PERSONA_CODIGO','CODIGO','ID'])).trim();
        const nombre = String(pick(row, ['PERSONA_NOMBRE','NOMBRE'])).trim();
        if(!code || !nombre) return;
        const id = uid();
        personMap[code] = id;
        const rangoRaw = String(pick(row, ['PERSONA_RANGO','RANGO'], 'SOCIO')).trim().toUpperCase();
        baseState.personas.push({id, nombre, rango: PERSONA_RANGOS.includes(rangoRaw) ? rangoRaw : 'SOCIO'});
      });

      tiendasRows.forEach(row => {
        const code = String(pick(row, ['TIENDA_CODIGO','CODIGO','ID'])).trim();
        const nombre = String(pick(row, ['TIENDA_NOMBRE','NOMBRE'])).trim();
        if(!code || !nombre) return;
        const id = uid();
        storeMap[code] = id;
        baseState.tiendas.push({id, nombre});
      });

      productosRows.forEach(row => {
        const code = String(pick(row, ['PRODUCTO_CODIGO','CODIGO','ID'])).trim();
        const nombre = String(pick(row, ['PRODUCTO_NOMBRE','NOMBRE'])).trim();
        if(!code || !nombre) return;
        const id = uid();
        productMap[code] = id;
        const precioReferencia = parseEuroInput(pick(row, [
          'PRODUCTO_PRECIO_REFERENCIA',
          'PRODUCTO_PRECIO',
          'PRECIO_REFERENCIA',
          'PRECIO_REF',
          'PRECIO',
          'PVP',
          'IMPORTE_REFERENCIA'
        ], 0));
        baseState.productos.push({
          id,
          nombre,
          segmento: String(pick(row, ['PRODUCTO_SEGMENTO','SEGMENTO'], 'COMIDA')).trim().toUpperCase(),
          destino: String(pick(row, ['PRODUCTO_DESTINO','DESTINO'], 'COMIDA')).trim().toUpperCase(),
          precio: precioReferencia,
          defaultPrecio: precioReferencia
        });
      });

      ingresosRows.forEach(row => {
        const eventCode = String(pick(row, ['EVENTO_CODIGO'])).trim();
        const personCode = String(pick(row, ['PERSONA_CODIGO'])).trim();
        if(!eventMap[eventCode] || !personMap[personCode]) return;
        baseState.colaboradores.push({
          id: uid(),
          eventId: eventMap[eventCode],
          personaId: personMap[personCode],
          numero: Number(pick(row, ['NUMERO'], 0)) || 0,
          situacion: String(pick(row, ['INGRESO','SITUACION'], 'Pendiente')).trim() || 'Pendiente',
          importe: parseEuroInput(pick(row, ['IMPORTE_VOLUNTARIO','IMPORTE'], 0))
        });
      });

      comprasRows.forEach(row => {
        const eventCode = String(pick(row, ['EVENTO_CODIGO'])).trim();
        const productCode = String(pick(row, ['PRODUCTO_CODIGO'])).trim();
        if(!eventMap[eventCode] || !productMap[productCode]) return;
        const respCode = String(pick(row, ['RESPONSABLE_PERSONA_CODIGO','RESPONSABLE_CODIGO'], '')).trim();
        const storeCodeRaw = String(pick(row, ['TIENDA_CODIGO','TIENDA_O_DONANTE_CODIGO'], '')).trim();
        baseState.compras.push({
          id: uid(),
          eventId: eventMap[eventCode],
          productoId: productMap[productCode],
          unidades: Number(pick(row, ['UNIDADES','UD'], 0)) || 0,
          precio: parseEuroInput(pick(row, ['PRECIO'], 0)),
          ticketDonacion: String(pick(row, ['TICKET_U_OTROS_GASTOS','TICKET_DONACION','TICKET'], '')).trim(),
          tiendaId: storeMap[storeCodeRaw] || '',
          responsableId: personMap[respCode] || ''
        });
      });

      donacionesRows.forEach(row => {
        const eventCode = String(pick(row, ['EVENTO_CODIGO'])).trim();
        const productCode = String(pick(row, ['PRODUCTO_CODIGO'])).trim();
        if(!eventMap[eventCode] || !productMap[productCode]) return;
        const respCode = String(pick(row, ['RESPONSABLE_PERSONA_CODIGO','RESPONSABLE_CODIGO'], '')).trim();
        const donorType = String(pick(row, ['DONANTE_TIPO'], '')).trim().toUpperCase();
        const donorCode = String(pick(row, ['DONANTE_CODIGO','TIENDA_O_DONANTE_CODIGO'], '')).trim();
        let donorRef = '';
        if(donorType === 'PERSONA' && personMap[donorCode]) donorRef = 'P:' + personMap[donorCode];
        else if(donorType === 'TIENDA' && storeMap[donorCode]) donorRef = 'T:' + storeMap[donorCode];
        else if(personMap[donorCode]) donorRef = 'P:' + personMap[donorCode];
        else if(storeMap[donorCode]) donorRef = 'T:' + storeMap[donorCode];
        baseState.compras.push({
          id: uid(),
          eventId: eventMap[eventCode],
          productoId: productMap[productCode],
          unidades: Number(pick(row, ['UNIDADES','UD'], 0)) || 0,
          precio: parseEuroInput(pick(row, ['PRECIO'], 0)),
          ticketDonacion: String(pick(row, ['TIPO_DONACION','TICKET_DONACION'], 'DONADO OTROS')).trim(),
          donorRef,
          responsableId: personMap[respCode] || ''
        });
      });

      const selectedFiles = Array.from(opt('importTicketFiles')?.files || []);
      ticketsRows.forEach(row => {
        const evCode = String(pick(row, ['EVENTO_CODIGO'])).trim();
        const key = String(pick(row, ['CLAVE_RESUMEN','CLAVE_INTERNA'], '')).trim();
        const fileName = String(pick(row, ['ARCHIVO_IMAGEN'], '')).trim();
        const img64 = String(pick(row, ['IMAGEN_BASE64'], '')).trim();
        if(!eventMap[evCode] || !key) return;
        if(img64){
          baseState.ticketImages[ticketImageStateKey(key, eventMap[evCode])] = img64;
        }else if(fileName){
          const file = selectedFiles.find(f => f.name === fileName);
          if(file){
            const reader = new FileReader();
            reader.onload = () => {
              baseState.ticketImages[ticketImageStateKey(key, eventMap[evCode])] = String(reader.result || '');
              saveState();
            };
            reader.readAsDataURL(file);
          }
        }
      });

      baseState.productos = (baseState.productos || []).map(p => {
        const precioReferencia = Number(p.defaultPrecio ?? p.precio ?? 0) || 0;
        return {...p, precio: Number(p.precio ?? precioReferencia) || 0, defaultPrecio: precioReferencia};
      });

      state.personas = baseState.personas;
      state.eventos = baseState.eventos;
      state.tiendas = baseState.tiendas;
      state.productos = baseState.productos;
      state.colaboradores = baseState.colaboradores;
      state.compras = baseState.compras;
      state.ticketImages = baseState.ticketImages;
      state.selectedEventId = baseState.selectedEventId || baseState.eventos[0]?.id || '';

      render();
      setImportStatus(
        `Importación completada (${mode}).\nPERSONAS: ${state.personas.length}\nEVENTOS: ${state.eventos.length}\nTIENDAS: ${state.tiendas.length}\nPRODUCTOS: ${state.productos.length}\nINGRESOS: ${state.colaboradores.length}\nCOMPRAS: ${state.compras.filter(x => !isDonationTicket(x.ticketDonacion)).length}\nDONACIONES: ${state.compras.filter(x => isDonationTicket(x.ticketDonacion)).length}`,
        'ok'
      );
    }catch(err){
      setImportStatus('Error en la importación: ' + (err?.message || err), 'bad');
    }
  }

  importInitialWorkbook = importV92Workbook;

  exportSeedWorkbook = async function(){
    try{
      await ensureExcelJS();
    }catch(err){
      alert('No se pudo cargar el motor de Excel. Coloca exceljs.min.js en la carpeta vendor o usa conexión a internet.');
      return;
    }
    const wb = new ExcelJS.Workbook();
    wb.creator = 'ControlEvent v28.10 - ©oltyLAB ’26';
    wb.created = new Date();
    const border = {top:{style:'thin', color:{argb:'FFDDE2EA'}},left:{style:'thin', color:{argb:'FFDDE2EA'}},bottom:{style:'thin', color:{argb:'FFDDE2EA'}},right:{style:'thin', color:{argb:'FFDDE2EA'}}};
    const headFill = {type:'pattern', pattern:'solid', fgColor:{argb:'FF111827'}};
    function makeSheet(name, headers, rows){
      const ws = wb.addWorksheet(name);
      ws.columns = headers.map(h => ({width: Math.max(16, String(h).length + 2)}));
      headers.forEach((h, i) => {
        const c = ws.getCell(1, i+1);
        c.value = h; c.font = {bold:true, color:{argb:'FFFFFFFF'}}; c.fill = headFill; c.border = border; c.alignment = {horizontal:'center', vertical:'middle'};
      });
      let r=2;
      rows.forEach(row=>{
        row.forEach((v,i)=>{ const c=ws.getCell(r,i+1); c.value=v; c.border=border; c.alignment={vertical:'middle'}; });
        r++;
      });
    }
    const eventCode = {}; state.eventos.forEach((e,i)=> eventCode[e.id]='EV'+String(i+1).padStart(3,'0'));
    const personCode = {}; state.personas.forEach((p,i)=> personCode[p.id]='PE'+String(i+1).padStart(4,'0'));
    const storeCode = {}; state.tiendas.forEach((t,i)=> storeCode[t.id]='TI'+String(i+1).padStart(4,'0'));
    const productCode = {}; state.productos.forEach((p,i)=> productCode[p.id]='PR'+String(i+1).padStart(4,'0'));

    makeSheet('EVENTOS', ['EVENTO_CODIGO','EVENTO_TITULO','EVENTO_PRECIO','EVENTO_FECHAINI','EVENTO_FECHAFIN','EVENTO_SITUACION','EVENTO_DESCRIPCION'],
      state.eventos.map(e => [eventCode[e.id], e.titulo || '', Number(e.precio || 0), e.fechaIni || '', e.fechaFin || '', e.situacion || 'En curso', e.descripcion || '']));
    makeSheet('PERSONAS', ['PERSONA_CODIGO','PERSONA_NOMBRE','PERSONA_RANGO'],
      state.personas.map(p => [personCode[p.id], p.nombre || '', p.rango || 'SOCIO']));
    makeSheet('TIENDAS', ['TIENDA_CODIGO','TIENDA_NOMBRE'],
      state.tiendas.map(t => [storeCode[t.id], t.nombre || '']));
    makeSheet('PRODUCTOS', ['PRODUCTO_CODIGO','PRODUCTO_NOMBRE','PRODUCTO_SEGMENTO','PRODUCTO_DESTINO'],
      state.productos.map(p => [productCode[p.id], p.nombre || '', p.segmento || '', p.destino || '']));
    makeSheet('INGRESOS', ['EVENTO_CODIGO','PERSONA_CODIGO','NUMERO','INGRESO','IMPORTE_VOLUNTARIO'],
      state.colaboradores.map(c => [eventCode[c.eventId] || '', personCode[c.personaId] || '', Number(c.numero || 0), c.situacion || 'Pendiente', Number(c.importe || 0)]));
    makeSheet('COMPRAS', ['EVENTO_CODIGO','PRODUCTO_CODIGO','UNIDADES','PRECIO','TICKET_U_OTROS_GASTOS','TIENDA_CODIGO','RESPONSABLE_PERSONA_CODIGO'],
      state.compras.filter(c => !isDonationTicket(c.ticketDonacion)).map(c => [eventCode[c.eventId] || '', productCode[c.productoId] || '', Number(c.unidades || 0), Number(c.precio || 0), c.ticketDonacion || '', storeCode[c.tiendaId] || '', personCode[c.responsableId] || '']));
    makeSheet('DONACIONES', ['EVENTO_CODIGO','PRODUCTO_CODIGO','UNIDADES','PRECIO','TIPO_DONACION','DONANTE_TIPO','DONANTE_CODIGO','RESPONSABLE_PERSONA_CODIGO'],
      state.compras.filter(c => isDonationTicket(c.ticketDonacion)).map(c => {
        const [kind,id] = String(c.donorRef || '').split(':');
        return [eventCode[c.eventId] || '', productCode[c.productoId] || '', Number(c.unidades || 0), Number(c.precio || 0), c.ticketDonacion || '', kind==='P'?'PERSONA':(kind==='T'?'TIENDA':''), kind==='P' ? (personCode[id] || '') : (kind==='T' ? (storeCode[id] || '') : ''), personCode[c.responsableId] || ''];
      }));
    const ticketRows = [];
    Object.entries(state.ticketImages || {}).forEach(([fullKey,image]) => {
      const [evId, ...rest] = String(fullKey).split('|');
      ticketRows.push([eventCode[evId] || '', rest.join('|').trim(), '', image || '']);
    });
    makeSheet('TICKETS', ['EVENTO_CODIGO','CLAVE_RESUMEN','ARCHIVO_IMAGEN','IMAGEN_BASE64'], ticketRows);

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ControlEvent_v28_10_descarga_datos.xlsx';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  handleChange = function(e){
    if(e.target.id === 'selectedEvent'){
      changeSelectedEvent(e.target.value);
      return;
    }
    if(['buyProducto','buyUnidades','buyTicket','buyPrecio','buyTienda'].includes(e.target.id)){
      if(isLocked()) return;
      updateBuyPreview();
      return;
    }
    if(['donProducto','donUnidades','donTicket','donPrecio','donDonante'].includes(e.target.id)){
      if(isLocked()) return;
      updateDonationPreview();
      return;
    }
  };

  handleClick = function(e){
    const btn = e.target.closest('button');
    if(!btn) return;
    const action = btn.dataset.action || btn.id;

    const godOnly = action === 'mtAccesoBtn' || action === 'btnAddAcceso' || action.startsWith('save-acceso') || action.startsWith('delete-acceso');
    if(godOnly && !isGodRole()) return;

    if(!['btnTogglePower','btnExportExcel','btnOpenImport','btnExportSeed','btnToggleMaintenance','mtEventosBtn','btnAddEvento','mtAccesoBtn'].includes(action) && isLocked()) return;

    switch(action){
      case 'tabIngresosBtn': currentMainTab = 'ingresos'; render(); break;
      case 'tabDonacionesBtn': currentMainTab = 'donaciones'; render(); break;
      case 'tabComprasBtn': currentMainTab = 'compras'; render(); break;
      case 'tabResumenBtn': currentMainTab = 'resumen'; render(); break;
      case 'tabGraficasBtn': currentMainTab = 'graficas'; render(); break;
      case 'btnToggleMaintenance':
        opt('maintenanceWrapper').classList.toggle('hidden');
        renderLockState();
        break;
      case 'btnOpenImport':
        currentMaintTab = 'importar';
        opt('maintenanceWrapper').classList.remove('hidden');
        render();
        break;
      case 'mtPersonasBtn': currentMaintTab = 'personas'; render(); break;
      case 'mtEventosBtn': currentMaintTab = 'eventos'; render(); break;
      case 'mtTiendasBtn': currentMaintTab = 'tiendas'; render(); break;
      case 'mtProductosBtn': currentMaintTab = 'productos'; render(); break;
      case 'mtAccesoBtn': openAccessMaintenance(); break;
      case 'btnAddPersona': addPersona(); break;
      case 'btnAddEvento': addEvento(); break;
      case 'btnAddTienda': addTienda(); break;
      case 'btnAddProducto': addProducto(); break;
      case 'btnAddColab': addColab(); break;
      case 'btnAddCompra': addCompra(); break;
      case 'btnAddDonacion': addDonation(); break;
      case 'btnStartImport': importInitialWorkbook(); break;
      case 'btnClearImportStatus': opt('importStatus').classList.add('hidden'); opt('importStatus').textContent=''; break;
      case 'btnTogglePower':
        if(!selectedEvent()) return;
        selectedEvent().situacion = isLocked() ? 'En curso' : 'Finalizado';
        render();
        break;
      case 'toggleEventDesc': showEventDesc = !showEventDesc; renderHeader(); break;
      case 'toggleIngresosSummary': opt('ingresosSummaryBody').classList.toggle('hidden'); break;
      case 'toggleComprasSummary': opt('comprasSummaryBody').classList.toggle('hidden'); break;
      case 'toggleComprasEvent': showComprasEvent = !showComprasEvent; renderTabVisibility(); break;
      case 'save-persona': {
        const id = btn.dataset.id, p = personaById(id);
        if(p){ p.nombre = currentValuesByAction('edit-persona-nombre', id).trim(); p.rango = currentValuesByAction('edit-persona-rango', id); render(); }
        break;
      }
      case 'delete-persona':
        state.personas = state.personas.filter(p => p.id !== btn.dataset.id);
        state.colaboradores = state.colaboradores.filter(c => c.personaId !== btn.dataset.id);
        state.compras = state.compras.map(c => {
          const x = {...c};
          if(x.responsableId === btn.dataset.id) x.responsableId = '';
          if(x.donorRef === 'P:' + btn.dataset.id) x.donorRef = '';
          return x;
        });
        render();
        break;
      case 'save-evento': {
        const id = btn.dataset.id, ev = state.eventos.find(x => x.id === id);
        if(ev){
          ev.titulo = currentValuesByAction('edit-evento-titulo', id).trim();
          ev.precio = Number(currentValuesByAction('edit-evento-precio', id) || 0);
          ev.fechaIni = currentValuesByAction('edit-evento-fechaini', id).trim();
          ev.fechaFin = currentValuesByAction('edit-evento-fechafin', id).trim();
          ev.descripcion = currentValuesByAction('edit-evento-descripcion', id).trim();
          ev.situacion = currentValuesByAction('edit-evento-situacion', id);
          render();
        }
        break;
      }
      case 'delete-evento':
        state.eventos = state.eventos.filter(e => e.id !== btn.dataset.id);
        state.colaboradores = state.colaboradores.filter(c => c.eventId !== btn.dataset.id);
        state.compras = state.compras.filter(c => c.eventId !== btn.dataset.id);
        if(state.ticketImages) Object.keys(state.ticketImages).forEach(k => { if(k.startsWith(btn.dataset.id + '|')) delete state.ticketImages[k]; });
        state.selectedEventId = state.eventos[0]?.id || '';
        render();
        break;
      case 'save-tienda': {
        const id = btn.dataset.id, t = tiendaById(id);
        if(t){ t.nombre = currentValuesByAction('edit-tienda-nombre', id).trim(); render(); }
        break;
      }
      case 'delete-tienda':
        state.tiendas = state.tiendas.filter(t => t.id !== btn.dataset.id);
        state.compras = state.compras.map(c => {
          const x = {...c};
          if(x.tiendaId === btn.dataset.id) x.tiendaId = '';
          if(x.donorRef === 'T:' + btn.dataset.id) x.donorRef = '';
          return x;
        });
        render();
        break;
      case 'save-producto': {
        const id = btn.dataset.id, p = productoById(id);
        if(p){
          p.nombre = currentValuesByAction('edit-producto-nombre', id).trim();
          p.segmento = currentValuesByAction('edit-producto-segmento', id);
          p.destino = currentValuesByAction('edit-producto-destino', id);
          render();
        }
        break;
      }
      case 'delete-producto':
        state.productos = state.productos.filter(p => p.id !== btn.dataset.id);
        state.compras = state.compras.filter(c => c.productoId !== btn.dataset.id);
        render();
        break;
      case 'save-collab': {
        const id = btn.dataset.id, c = state.colaboradores.find(x => x.id === id);
        if(c){
          c.personaId = currentValuesByAction('edit-collab-persona', id);
          c.numero = Number(currentValuesByAction('edit-collab-numero', id) || 0);
          c.situacion = currentValuesByAction('edit-collab-situacion', id);
          c.importe = parseEuroInput(currentValuesByAction('edit-collab-importe', id) || 0);
          render();
        }
        break;
      }
      case 'delete-collab':
        state.colaboradores = state.colaboradores.filter(c => c.id !== btn.dataset.id);
        render();
        break;
      case 'save-compra': {
        const id = btn.dataset.id, c = state.compras.find(x => x.id === id);
        if(c){
          c.productoId = currentValuesByAction('edit-compra-producto', id);
          c.unidades = Number(currentValuesByAction('edit-compra-unidades', id) || 0);
          c.precio = parseEuroInput(currentValuesByAction('edit-compra-precio', id) || 0);
          c.ticketDonacion = currentValuesByAction('edit-compra-ticket', id);
          c.tiendaId = currentValuesByAction('edit-compra-tienda', id);
          c.responsableId = currentValuesByAction('edit-compra-responsable', id);
          render();
        }
        break;
      }
      case 'save-donacion': {
        const id = btn.dataset.id, c = state.compras.find(x => x.id === id);
        if(c){
          c.productoId = currentValuesByAction('edit-donacion-producto', id);
          c.unidades = Number(currentValuesByAction('edit-donacion-unidades', id) || 0);
          c.precio = parseEuroInput(currentValuesByAction('edit-donacion-precio', id) || 0);
          c.ticketDonacion = currentValuesByAction('edit-donacion-ticket', id);
          c.donorRef = currentValuesByAction('edit-donacion-donante', id);
          c.responsableId = currentValuesByAction('edit-donacion-responsable', id);
          render();
        }
        break;
      }
      case 'delete-compra':
      case 'delete-donacion':
        state.compras = state.compras.filter(c => c.id !== btn.dataset.id);
        render();
        break;
      case 'btnExportExcel': exportExcel(); break;
      case 'btnExportSeed': exportSeedWorkbook(); break;
    }
  };

  ensureV92Ui();
})();


async function openAccessMaintenance(){
  if(!isGodRole() || isLocked()) return;
  currentMaintTab = 'acceso';
  const wrapper = document.getElementById('maintenanceWrapper');
  if(wrapper) wrapper.classList.remove('hidden');
  await fetchAccessUsers();
  renderPermissions();
  renderMaintenanceTabs();
  renderAcceso();
}
window.openAccessMaintenance = openAccessMaintenance;

async function saveAccessUser(existingId=''){
  if(!isGodRole()) return;
  const identificacion = existingId
    ? String(currentValuesByAction('edit-acceso-identificacion', existingId) || existingId).trim()
    : (document.getElementById('newAccesoIdentificacion')?.value || '').trim();
  const nombre = existingId
    ? String(currentValuesByAction('edit-acceso-nombre', existingId) || '').trim()
    : (document.getElementById('newAccesoNombre')?.value || '').trim();
  const clave = existingId
    ? String(currentValuesByAction('edit-acceso-clave', existingId) || '')
    : (document.getElementById('newAccesoClave')?.value || '');
  const nivel = existingId
    ? String(currentValuesByAction('edit-acceso-nivel', existingId) || 'RO')
    : (document.getElementById('newAccesoNivel')?.value || 'RO');

  if(!identificacion || !nombre || (!existingId && !clave)){
    alert('Identificación, nombre y clave son obligatorios al dar de alta.');
    return;
  }

  const res = await fetch('/api/access-users', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({identificacion, nombre, clave, nivel, existingId})
  });
  const data = await res.json();
  if(!res.ok || !data.ok){
    alert(data.error || 'No se pudo guardar el usuario de acceso.');
    return;
  }

  if(!existingId){
    ['newAccesoIdentificacion','newAccesoNombre','newAccesoClave'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
    const level = document.getElementById('newAccesoNivel'); if(level) level.value='RO';
  }
  await fetchAccessUsers();
  renderPermissions();
  renderMaintenanceTabs();
  renderAcceso();
}

async function deleteAccessUser(identificacion){
  if(!isGodRole() || !identificacion) return;
  if(authUser && identificacion === authUser.identificacion){
    alert('No puedes eliminar el acceso con el que estás logado.');
    return;
  }
  if(!confirm('¿Eliminar este usuario de acceso?')) return;
  const res = await fetch('/api/access-users/' + encodeURIComponent(identificacion), {method:'DELETE'});
  const data = await res.json();
  if(!res.ok || !data.ok){
    alert(data.error || 'No se pudo eliminar el usuario de acceso.');
    return;
  }
  await fetchAccessUsers();
  renderPermissions();
  renderMaintenanceTabs();
  renderAcceso();
}

document.addEventListener('keydown', e => {
  if(e.key !== 'Enter' || authUser) return;
  const id = e.target?.id || '';
  if(['loginIdentificacion','loginClave'].includes(id)){
    e.preventDefault();
    doLogin();
    return;
  }
  if(['changeNewPassword1','changeNewPassword2'].includes(id)){
    e.preventDefault();
    doChangePassword();
  }
});

document.addEventListener('click', async function(e){
  const btn = e.target.closest('button');
  if(!btn) return;
  const action = btn.dataset.action || btn.id;

  if(action === 'btnLogin'){
    e.preventDefault();
    e.stopImmediatePropagation();
    await doLogin();
    return;
  }

  if(action === 'btnLogout'){
    e.preventDefault();
    e.stopImmediatePropagation();
    await doLogout();
    return;
  }

  if(action === 'btnToggleChangePassword'){
    e.preventDefault();
    e.stopImmediatePropagation();
    toggleChangePasswordPanel();
    return;
  }

  if(action === 'btnChangePassword'){
    e.preventDefault();
    e.stopImmediatePropagation();
    await doChangePassword();
    return;
  }

  if(action === 'mtAccesoBtn'){
    e.preventDefault();
    e.stopImmediatePropagation();
    if(!isGodRole() || isLocked()) return;
    currentMaintTab = 'acceso';
    const wrapper = document.getElementById('maintenanceWrapper');
    if(wrapper) wrapper.classList.remove('hidden');
    await fetchAccessUsers();
    renderPermissions();
    renderMaintenanceTabs();
    renderAcceso();
    return;
  }

  if(action === 'btnAddAcceso'){
    e.preventDefault();
    e.stopImmediatePropagation();
    if(!isGodRole() || isLocked()) return;
    await saveAccessUser();
    return;
  }

  if(action === 'save-acceso'){
    e.preventDefault();
    e.stopImmediatePropagation();
    if(!isGodRole() || isLocked()) return;
    await saveAccessUser(btn.dataset.id || '');
    return;
  }

  if(action === 'delete-acceso'){
    e.preventDefault();
    e.stopImmediatePropagation();
    if(!isGodRole() || isLocked()) return;
    await deleteAccessUser(btn.dataset.id || '');
    return;
  }

  if(action === 'save-evento'){
    e.preventDefault();
    e.stopImmediatePropagation();
    if(!isGodRole()) return;
    saveEventRecord(btn.dataset.id || '');
    return;
  }

  if(action === 'toggleEventDesc'){
    e.preventDefault();
    e.stopImmediatePropagation();
    toggleEventDescription();
    return;
  }
}, true);

document.addEventListener('click', handleClick);
document.addEventListener('change', handleChange);

if(authUser && authUser.nivel === 'GD'){ fetchAccessUsers().finally(() => render()); } else { render(); }
setInterval(() => { const dt=document.getElementById('headerDateTime'); if(dt) dt.textContent = new Date().toLocaleString('es-ES'); }, 30000);

;/* ===== END legacy-inline-01.js ===== */


;/* ===== BEGIN legacy-inline-02.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #2. */
(function(){
  const $ = id => document.getElementById(id);

  function productRefPrice(p){
    return Number((p && (p.defaultPrecio ?? p.precio)) || 0);
  }
  function ensureProductRefPrices(){
    (state.productos || []).forEach(p => {
      if(p.defaultPrecio == null) p.defaultPrecio = Number(p.precio || 0);
    });
  }
  function moneyTextV(v){
    return typeof moneyText === 'function' ? moneyText(v) : money(v);
  }
  function euroText(v){
    return typeof euroInputValue === 'function' ? euroInputValue(v) : moneyTextV(v);
  }
  function cleanFilePart(v){
    return String(v || 'evento')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^A-Za-z0-9]+/g,'_')
      .replace(/^_+|_+$/g,'')
      .replace(/_+/g,'_') || 'evento';
  }
  function excelFileName(ev){
    const d = new Date();
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yyyy = String(d.getFullYear());
    return `ControlEvent_v28_10-${cleanFilePart(ev?.titulo || 'evento')}_${dd}${mm}${yyyy}.xlsx`;
  }
  function graphData(){
    const b = budgetSummary();
    const byType = b.ingresosDinero.porTipo || {};
    const banco = Number(byType.Banco || 0);
    const bizum = Number(byType.Bizum || 0);
    const efectivo = Number(byType.Efectivo || 0);
    const pendienteIngreso = Number(byType.Pendiente || 0);
    const donado = Number(b.donacionProducto.valorDonado || 0);
    const pendienteDonar = Number(b.donacionProducto.pendienteDonar || 0);
    const gastado = Number(b.operativa.gastoCompras || 0) + Number(b.operativa.gastosOrganizacion || 0);
    const pendienteCompra = Number(b.operativa.pendiente || 0);
    const saldoReal = Number(b.operativa.saldoOperativo || 0);
    const saldoConPendienteIngreso = saldoReal + pendienteIngreso;
    return {
      banco,bizum,efectivo,pendienteIngreso,
      donado,pendienteDonar,
      gastado,pendienteCompra,
      saldoReal,saldoConPendienteIngreso
    };
  }
  function renderGraphOnly(){
    const wrap = $('eventChartWrap');
    if(!wrap) return;
    const g = graphData();
    const maxVal = Math.max(
      1,
      g.banco + g.bizum + g.efectivo + g.pendienteIngreso,
      g.donado + g.pendienteDonar,
      g.gastado + g.pendienteCompra,
      Math.abs(g.saldoReal) + Math.abs(g.pendienteIngreso),
      Math.abs(g.saldoConPendienteIngreso)
    );
    const seg = (value, color, title) => {
      const w = (Math.max(0, Number(value || 0)) / maxVal) * 100;
      return `<div class="chart-seg" title="${escapeHtml(title)}" style="width:${w}%;background:${color};"></div>`;
    };
    wrap.innerHTML = `
      <div class="chart-shell">
        <div class="chart-bars">
          <div class="chart-row">
            <div class="chart-label">INGRESOS EN DINERO</div>
            <div class="chart-track">
              ${seg(g.banco,'#2563eb','Banco: ' + moneyTextV(g.banco))}
              ${seg(g.bizum,'#16a34a','Bizum: ' + moneyTextV(g.bizum))}
              ${seg(g.efectivo,'#84cc16','Efectivo: ' + moneyTextV(g.efectivo))}
              ${seg(g.pendienteIngreso,'#f59e0b','Pendiente de ingreso: ' + moneyTextV(g.pendienteIngreso))}
              <div class="chart-center-value">${escapeHtml(moneyTextV(g.banco + g.bizum + g.efectivo + g.pendienteIngreso))}</div>
            </div>
          </div>
          <div class="chart-row">
            <div class="chart-label">DONACIÓN DE PRODUCTO</div>
            <div class="chart-track">
              ${seg(g.donado,'#f59e0b','Donado: ' + moneyTextV(g.donado))}
              ${seg(g.pendienteDonar,'#9ca3af','Pendiente de donar: ' + moneyTextV(g.pendienteDonar))}
              <div class="chart-center-value">${escapeHtml(moneyTextV(g.donado + g.pendienteDonar))}</div>
            </div>
          </div>
          <div class="chart-row">
            <div class="chart-label">GASTOS</div>
            <div class="chart-track">
              ${seg(g.gastado,'#dc2626','Comprado / gastado: ' + moneyTextV(g.gastado))}
              ${seg(g.pendienteCompra,'#fb7185','Pendiente de comprar: ' + moneyTextV(g.pendienteCompra))}
              <div class="chart-center-value">${escapeHtml(moneyTextV(g.gastado + g.pendienteCompra))}</div>
            </div>
          </div>
          <div class="chart-row">
            <div class="chart-label">SALDO OPERATIVO</div>
            <div class="chart-track">
              ${seg(Math.abs(g.saldoReal), g.saldoReal >= 0 ? '#0f766e' : '#b91c1c', 'Saldo operativo actual: ' + moneyTextV(g.saldoReal))}
              ${seg(g.pendienteIngreso,'#f59e0b','Pendiente de ingreso incorporado: ' + moneyTextV(g.pendienteIngreso))}
              <div class="chart-center-value">${escapeHtml(moneyTextV(g.saldoConPendienteIngreso))}</div>
            </div>
          </div>
        </div>
      </div>`;
  }

  async function makeChartImageDataUrl(){
    const canvas = document.createElement('canvas');
    canvas.width = 1180;
    canvas.height = 520;
    const ctx = canvas.getContext('2d');
    const g = graphData();
    const maxVal = Math.max(
      1,
      g.banco + g.bizum + g.efectivo + g.pendienteIngreso,
      g.donado + g.pendienteDonar,
      g.gastado + g.pendienteCompra,
      Math.abs(g.saldoReal) + Math.abs(g.pendienteIngreso),
      Math.abs(g.saldoConPendienteIngreso)
    );
    const fmt = v => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(v);
    function rr(x,y,w,h,r,color){
      ctx.fillStyle=color;
      ctx.beginPath();
      ctx.moveTo(x+r,y);
      ctx.arcTo(x+w,y,x+w,y+h,r);
      ctx.arcTo(x+w,y+h,x,y+h,r);
      ctx.arcTo(x,y+h,x,y,r);
      ctx.arcTo(x,y,x+w,y,r);
      ctx.closePath();
      ctx.fill();
    }
    function drawBar(y,label,segments,total){
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 20px Arial';
      ctx.fillText(label, 40, y + 25);
      rr(320,y,800,40,20,'#f3f4f6');
      let x = 320;
      segments.forEach(s => {
        const w = (Math.max(0, Number(s.value || 0)) / maxVal) * 800;
        if(w <= 0) return;
        rr(x,y,w,40,20,s.color);
        x += w;
      });
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(total, 720, y + 26);
      ctx.textAlign = 'left';
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 28px Arial';
    ctx.fillText('GRÁFICAS DEL EVENTO', 40, 42);

    let y = 80;
    drawBar(y,'INGRESOS EN DINERO',[
      {value:g.banco, color:'#2563eb'},
      {value:g.bizum, color:'#16a34a'},
      {value:g.efectivo, color:'#84cc16'},
      {value:g.pendienteIngreso, color:'#f59e0b'}
    ], fmt(g.banco + g.bizum + g.efectivo + g.pendienteIngreso));
    y += 100;
    drawBar(y,'DONACIÓN DE PRODUCTO',[
      {value:g.donado, color:'#f59e0b'},
      {value:g.pendienteDonar, color:'#9ca3af'}
    ], fmt(g.donado + g.pendienteDonar));
    y += 100;
    drawBar(y,'GASTOS',[
      {value:g.gastado, color:'#dc2626'},
      {value:g.pendienteCompra, color:'#fb7185'}
    ], fmt(g.gastado + g.pendienteCompra));
    y += 100;
    drawBar(y,'SALDO OPERATIVO',[
      {value:Math.abs(g.saldoReal), color:g.saldoReal >= 0 ? '#0f766e' : '#b91c1c'},
      {value:g.pendienteIngreso, color:'#f59e0b'}
    ], fmt(g.saldoConPendienteIngreso));

    return canvas.toDataURL('image/png');
  }

  ensureProductRefPrices();

  // Override helpers to support reference price
  window.comprasForEvent = function(){
    ensureProductRefPrices();
    return state.compras
      .filter(c => c.eventId === state.selectedEventId)
      .map(c => {
        const productoBase = productoById(c.productoId) || {};
        const precio = Number(c.precio != null ? c.precio : productRefPrice(productoBase));
        const unidades = Number(c.unidades || 0);
        const valor = precio * unidades;
        const donation = isDonationTicket(c.ticketDonacion);
        const importe = donation ? 0 : valor;
        const tienda = donation
          ? {id: c.donorRef || '', nombre: (typeof donorLabel === 'function' ? donorLabel(c.donorRef) : '')}
          : tiendaById(c.tiendaId || '') || {id:'', nombre:''};
        const producto = {...productoBase, precio, defaultPrecio: productRefPrice(productoBase)};
        return {
          ...c,
          producto,
          precioCalc: precio,
          tienda,
          valor,
          importe,
          responsable: personaById(c.responsableId || ''),
          donorLabel: typeof donorLabel === 'function' ? donorLabel(c.donorRef || '') : ''
        };
      });
  };

  window.budgetSummary = function(){
    const rows = collabsForEvent();
    const compras = comprasForEvent();

    const sociosRows = rows.filter(r => r.persona?.rango === 'SOCIO');
    const noSociosRows = rows.filter(r => r.persona?.rango !== 'SOCIO');

    const sumNum = arr => arr.reduce((a,b) => a + Number(b.numero || 0), 0);
    const sumTotal = arr => arr.reduce((a,b) => a + Number(b.total || 0), 0);
    const paidTotal = arr => arr.filter(r => r.situacion !== 'Pendiente').reduce((a,b) => a + Number(b.total || 0), 0);
    const pendingTotal = arr => arr.filter(r => r.situacion === 'Pendiente').reduce((a,b) => a + Number(b.total || 0), 0);

    const sociosCount = sumNum(sociosRows);
    const noSociosCount = sumNum(noSociosRows);
    const sociosImporte = sumTotal(sociosRows);
    const sociosIngresado = paidTotal(sociosRows);
    const sociosPendiente = pendingTotal(sociosRows);
    const noSociosImporte = sumTotal(noSociosRows);
    const noSociosIngresado = paidTotal(noSociosRows);
    const noSociosPendiente = pendingTotal(noSociosRows);

    const porTipo = PAYMENT_OPTIONS.reduce((acc, tipo) => {
      acc[tipo] = rows.filter(r => r.situacion === tipo).reduce((a,b) => a + Number(b.total || 0), 0);
      return acc;
    }, {});

    const dineroIngresado = sociosIngresado + noSociosIngresado;
    const dineroPendiente = sociosPendiente + noSociosPendiente;
    const dineroComprometido = dineroIngresado + dineroPendiente;

    const gastadoCompras = compras.filter(c => !isDonationTicket(c.ticketDonacion) && !isCurrentExpenseTicket(c.ticketDonacion) && String(c.ticketDonacion || '').trim() !== '').reduce((a,b)=>a+b.valor,0);
    const gastosOrganizacion = compras.filter(c => isCurrentExpenseTicket(c.ticketDonacion)).reduce((a,b)=>a+b.valor,0);
    const pendienteCompra = compras.filter(c => !isDonationTicket(c.ticketDonacion) && String(c.ticketDonacion || '').trim() === '').reduce((a,b)=>a+b.valor,0);

    const donadoTienda = compras.filter(c => c.ticketDonacion === 'DONADO TIENDA').reduce((a,b)=>a+b.valor,0);
    const donadoSocio = compras.filter(c => c.ticketDonacion === 'DONADO SOCIO').reduce((a,b)=>a+b.valor,0);
    const donadoOtros = compras.filter(c => c.ticketDonacion === 'DONADO OTROS').reduce((a,b)=>a+b.valor,0);
    const valorDonado = donadoTienda + donadoSocio + donadoOtros;
    const pendienteDonar = 0;

    const saldoOperativo = dineroIngresado - gastadoCompras - gastosOrganizacion;
    const saldoOperativoConPendienteIngreso = saldoOperativo + dineroPendiente;

    return {
      ingresosDinero: {
        socios: {count:sociosCount, importe:sociosImporte, ingresado:sociosIngresado, pendiente:sociosPendiente},
        noSocios: {count:noSociosCount, importe:noSociosImporte, ingresado:noSociosIngresado, pendiente:noSociosPendiente},
        donantes: {count:noSociosCount, importe:noSociosImporte, ingresado:noSociosIngresado, pendiente:noSociosPendiente},
        totalIngresado: dineroIngresado,
        totalComprometido: dineroComprometido,
        pendiente: dineroPendiente,
        porTipo
      },
      donacionProducto: {
        donado: valorDonado,
        donadoTienda,
        donadoSocio,
        donadoOtros,
        valorDonado,
        pendienteDonar
      },
      operativa: {
        ingresoDinero: dineroIngresado,
        ingresoComprometido: dineroComprometido,
        gastoCompras: gastadoCompras,
        gastosOrganizacion,
        pendiente: pendienteCompra,
        saldoOperativo,
        saldoOperativoConPendienteIngreso
      },
      compras: {
        total: gastadoCompras + gastosOrganizacion + valorDonado + pendienteCompra,
        resueltas: gastadoCompras + gastosOrganizacion,
        pendientes: pendienteCompra,
        valorDonado,
        gastosCorrientes: gastosOrganizacion,
        saldoReal: saldoOperativo
      }
    };
  };

  window.renderBudget = function(){
    const wrap = $('budgetLayout');
    const b = budgetSummary();
    if(wrap){
      wrap.innerHTML = `
        <div class="budget-panel socios">
          <h3>INGRESOS EN DINERO</h3>
          <div class="budget-rows">
            <div class="budget-row budget-subgroup"><strong>SOCIOS</strong><span>${escapeHtml(money(b.ingresosDinero.socios.ingresado))}</span></div>
            <div class="budget-subrows">
              <div class="budget-subrow"><span>Personas</span><span>${escapeHtml(String(b.ingresosDinero.socios.count))}</span></div>
              <div class="budget-subrow"><span>Importe socios</span><span>${escapeHtml(money(b.ingresosDinero.socios.importe))}</span></div>
              <div class="budget-subrow"><span>Ingresado socios</span><span>${escapeHtml(money(b.ingresosDinero.socios.ingresado))}</span></div>
              <div class="budget-subrow"><span>Pendiente socios</span><span>${escapeHtml(money(b.ingresosDinero.socios.pendiente))}</span></div>
            </div>
            <div class="budget-row budget-subgroup"><strong>NO SOCIOS</strong><span>${escapeHtml(money(b.ingresosDinero.noSocios.ingresado))}</span></div>
            <div class="budget-subrows">
              <div class="budget-subrow"><span>Personas</span><span>${escapeHtml(String(b.ingresosDinero.noSocios.count))}</span></div>
              <div class="budget-subrow"><span>Importe no socios</span><span>${escapeHtml(money(b.ingresosDinero.noSocios.importe))}</span></div>
              <div class="budget-subrow"><span>Ingresado no socios</span><span>${escapeHtml(money(b.ingresosDinero.noSocios.ingresado))}</span></div>
              <div class="budget-subrow"><span>Pendiente no socios</span><span>${escapeHtml(money(b.ingresosDinero.noSocios.pendiente))}</span></div>
            </div>
          </div>
        </div>
        <div class="budget-panel donantes">
          <h3>DONACIÓN DE PRODUCTO</h3>
          <div class="budget-rows">
            <div class="budget-subrows">
              <div class="budget-subrow"><span>Donación de producto tiendas</span><span>${escapeHtml(money(b.donacionProducto.donadoTienda))}</span></div>
              <div class="budget-subrow"><span>Donación de producto socios</span><span>${escapeHtml(money(b.donacionProducto.donadoSocio))}</span></div>
              <div class="budget-subrow"><span>Donación de producto no socios</span><span>${escapeHtml(money(b.donacionProducto.donadoOtros))}</span></div>
            </div>
            <div class="budget-row budget-subgroup"><strong>Valor producto donado</strong><span>${escapeHtml(money(b.donacionProducto.valorDonado))}</span></div>
          </div>
        </div>
        <div class="budget-panel operativo">
          <h3>OPERATIVA</h3>
          <div class="budget-rows">
            <div class="budget-row"><strong>INGRESO DINERO</strong><span>${escapeHtml(money(b.operativa.ingresoDinero))}</span></div>
            <div class="budget-row"><strong>GASTO POR COMPRAS</strong><span>${escapeHtml(money(b.operativa.gastoCompras))}</span></div>
            <div class="budget-row"><strong>GASTOS DE ORGANIZACIÓN</strong><span>${escapeHtml(money(b.operativa.gastosOrganizacion))}</span></div>
            <div class="budget-row"><strong>PTE. DE COMPRAS Y/O GASTOS DE ORGANIZACIÓN</strong><span style="color:#c2410c">${escapeHtml(money(b.operativa.pendiente))}</span></div>
            <div class="budget-row"><strong>SALDO OPERATIVO</strong><span style="color:${b.operativa.saldoOperativo >= 0 ? '#047857' : '#b91c1c'}">${escapeHtml(money(b.operativa.saldoOperativo))}</span></div>
          </div>
        </div>`;
    }
    renderSummaryList('summarySegmento', summaryBySegmento());
    renderSummaryList('summaryDestino', summaryByDestino());
    renderSummaryList('summaryTiendaTicket', summaryByTiendaTicket());
    renderGraficas();
  };

  window.renderGraficas = function(){ renderGraphOnly(); };

  window.renderProductos = function(){
    ensureProductRefPrices();
    $('newProductoSegmento').innerHTML = SEGMENT_OPTIONS.map(v => `<option value="${v}">${v}</option>`).join('');
    $('newProductoDestino').innerHTML = DESTINO_OPTIONS.map(v => `<option value="${v}">${v}</option>`).join('');
    if($('newProductoPrecio') && !$('newProductoPrecio').value) $('newProductoPrecio').value = '0,00 €';
    const wrap = $('productosList');
    const list = (state.productos || []).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
    if(!list.length){ wrap.innerHTML = '<div class="empty">No hay productos.</div>'; return; }
    wrap.innerHTML = '<div class="hint">Ordenar por: <a href="#" onclick="currentProductSort=\'nombre\'; renderProductos(); return false;">Nombre</a> · <a href="#" onclick="currentProductSort=\'segmento\'; renderProductos(); return false;">Segmento</a> · <a href="#" onclick="currentProductSort=\'destino\'; renderProductos(); return false;">Destino</a> · <a href="#" onclick="currentProductSort=\'precio\'; renderProductos(); return false;">Precio referencia</a></div>';
    const sorted = list.sort((a,b)=>{
      const sort = currentProductSort || 'nombre';
      if(sort === 'precio') return productRefPrice(a) - productRefPrice(b) || (a.nombre||'').localeCompare((b.nombre||''),'es');
      return String(a[sort] || '').localeCompare(String(b[sort] || ''),'es');
    });
    sorted.forEach(p => {
      const row = document.createElement('div');
      row.className = 'itemcard maint-soft';
      row.innerHTML = `
        <div class="rowline producto">
          <div class="field"><label>Nombre</label><input value="${escapeHtml(p.nombre)}" data-action="edit-producto-nombre" data-id="${p.id}" /></div>
          <div class="field"><label>Segmento</label><select data-action="edit-producto-segmento" data-id="${p.id}">${SEGMENT_OPTIONS.map(v => `<option value="${v}" ${v===p.segmento?'selected':''}>${v}</option>`).join('')}</select></div>
          <div class="field"><label>Destino</label><select data-action="edit-producto-destino" data-id="${p.id}">${DESTINO_OPTIONS.map(v => `<option value="${v}" ${v===p.destino?'selected':''}>${v}</option>`).join('')}</select></div>
          <div class="field"><label>Precio referencia</label><input class="money-text" type="text" value="${euroText(productRefPrice(p))}" data-action="edit-producto-precio" data-id="${p.id}" /></div>
          <button type="button" class="modify small" data-action="save-producto" data-id="${p.id}">Modificar</button>
          <button type="button" class="danger small" data-action="delete-producto" data-id="${p.id}">Eliminar</button>
        </div>`;
      wrap.appendChild(row);
    });
  };

  window.addProducto = function(){
    const nombre = ($('newProductoNombre').value || '').trim();
    if(!nombre) return;
    const precioRef = parseEuroInput($('newProductoPrecio')?.value || 0);
    state.productos.push({
      id: uid(),
      nombre,
      segmento: $('newProductoSegmento').value,
      destino: $('newProductoDestino').value,
      defaultPrecio: precioRef
    });
    $('newProductoNombre').value = '';
    if($('newProductoPrecio')) $('newProductoPrecio').value = '0,00 €';
    render();
  };

  window.renderMainSelectors = function(){
    ensureProductRefPrices();
    const personas = (typeof personasGenerales === 'function' ? personasGenerales() : (state.personas||[])).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
    const productos = (typeof productosGenerales === 'function' ? productosGenerales() : (state.productos||[])).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
    const tiendas = (typeof tiendasGenerales === 'function' ? tiendasGenerales() : (state.tiendas||[])).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
    const socios = (typeof socioResponsableOptions === 'function' ? socioResponsableOptions() : []).slice();
    const donors = (typeof donorOptions === 'function' ? donorOptions() : []).slice();

    $('collabPersona').innerHTML = '<option value="" selected>Busca colaborador/a.....</option>' + personas.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)} (${escapeHtml(p.rango)})</option>`).join('');
    $('collabSituacion').innerHTML = PAYMENT_OPTIONS.map(v => `<option value="${v}">${v}</option>`).join('');

    $('buyProducto').innerHTML = '<option value="" selected>Busca un producto....</option>' + productos.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`).join('');
    $('buyTicket').innerHTML = PURCHASE_TICKET_OPTIONS.map(v => `<option value="${v}">${v === '' ? '-- Pte.Compra u otros gastos --' : escapeHtml(v)}</option>`).join('');
    $('buyResponsable').innerHTML = '<option value="">-- sin responsable --</option>' + socios.map(p => `<option value="${p.value}">${escapeHtml(p.label)}</option>`).join('');
    $('buyTienda').innerHTML = '<option value="">-- elige tienda --</option>' + tiendas.map(t => `<option value="${t.id}">${escapeHtml(t.nombre)}</option>`).join('');

    $('donProducto').innerHTML = '<option value="" selected>Busca un producto....</option>' + productos.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`).join('');
    $('donTicket').innerHTML = DONATION_TICKET_OPTIONS.map(v => `<option value="${v}">${escapeHtml(v)}</option>`).join('');
    $('donResponsable').innerHTML = '<option value="">-- sin responsable --</option>' + socios.map(p => `<option value="${p.value}">${escapeHtml(p.label)}</option>`).join('');
    $('donDonante').innerHTML = '<option value="">-- elige donante --</option>' + donors.map(d => `<option value="${d.value}">${escapeHtml(d.label)}</option>`).join('');

    updateBuyPreview(true);
    updateDonationPreview(true);
  };

  window.updateBuyPreview = function(forceReference=false){
    ensureProductRefPrices();
    const productId = $('buyProducto')?.value || '';
    const producto = productoById(productId);
    const precioEl = $('buyPrecio');
    const ref = productRefPrice(producto);
    const last = precioEl?.dataset?.lastProductId || '';
    let precio = parseEuroInput(precioEl?.value || 0);
    if(forceReference || productId !== last){
      precio = ref;
      if(precioEl){
        precioEl.value = euroText(ref);
        precioEl.dataset.lastProductId = productId;
      }
    }
    const unidades = Number($('buyUnidades')?.value || 0);
    const importe = precio * unidades;
    if($('buyImporte')) $('buyImporte').value = moneyTextV(importe);
  };

  window.updateDonationPreview = function(forceReference=false){
    ensureProductRefPrices();
    const productId = $('donProducto')?.value || '';
    const producto = productoById(productId);
    const precioEl = $('donPrecio');
    const ref = productRefPrice(producto);
    const last = precioEl?.dataset?.lastProductId || '';
    let precio = parseEuroInput(precioEl?.value || 0);
    if(forceReference || productId !== last){
      precio = ref;
      if(precioEl){
        precioEl.value = euroText(ref);
        precioEl.dataset.lastProductId = productId;
      }
    }
    const unidades = Number($('donUnidades')?.value || 0);
    const valor = precio * unidades;
    if($('donImporte')) $('donImporte').value = moneyTextV(valor);
  };

  window.addCompra = function(){
    if(!selectedEvent()) return;
    const productoId = $('buyProducto').value;
    if(!productoId) return;
    const precio = parseEuroInput($('buyPrecio').value || 0);
    state.compras.push({
      id: uid(),
      eventId: state.selectedEventId,
      productoId,
      unidades: Number($('buyUnidades').value || 0),
      precio,
      ticketDonacion: $('buyTicket').value,
      tiendaId: $('buyTienda').value || '',
      responsableId: $('buyResponsable').value || ''
    });
    const p = productoById(productoId);
    if(p) p.defaultPrecio = precio;
    $('buyProducto').value = '';
    $('buyUnidades').value = '1.00';
    $('buyPrecio').value = '0,00 €';
    $('buyTicket').value = '';
    $('buyTienda').value = '';
    $('buyResponsable').value = '';
    render();
  };

  window.addDonation = function(){
    if(!selectedEvent()) return;
    const productoId = $('donProducto').value;
    if(!productoId) return;
    const precio = parseEuroInput($('donPrecio').value || 0);
    state.compras.push({
      id: uid(),
      eventId: state.selectedEventId,
      productoId,
      unidades: Number($('donUnidades').value || 0),
      precio,
      ticketDonacion: $('donTicket').value,
      donorRef: $('donDonante').value || '',
      responsableId: $('donResponsable').value || ''
    });
    $('donProducto').value = '';
    $('donUnidades').value = '1.00';
    $('donPrecio').value = '0,00 €';
    $('donTicket').value = DONATION_TICKET_OPTIONS[0];
    $('donDonante').value = '';
    $('donResponsable').value = '';
    render();
  };

  window.renderCompras = function(){
    const wrap = $('comprasList');
    let rows = comprasForEvent().filter(r => !isDonationTicket(r.ticketDonacion)).slice();
    const sorts = {
      producto:(a,b)=> (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es') || String(a.ticketDonacion||'').localeCompare(String(b.ticketDonacion||''),'es'),
      ticket:(a,b)=> String(a.ticketDonacion||'').localeCompare(String(b.ticketDonacion||''),'es') || (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es'),
      tienda:(a,b)=> (a.tienda?.nombre||'').localeCompare((b.tienda?.nombre||''),'es') || (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es'),
      responsable:(a,b)=> (a.responsable?.nombre||'').localeCompare((b.responsable?.nombre||''),'es') || (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es'),
    };
    rows.sort(sorts[state.comprasSort] || sorts.producto);
    if(!rows.length){ wrap.innerHTML = '<div class="empty">Todavía no hay compras u otros gastos para este evento.</div>'; return; }
    const socios = (typeof socioResponsableOptions === 'function' ? socioResponsableOptions() : []).slice();
    const tiendas = (typeof tiendasGenerales === 'function' ? tiendasGenerales() : []).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
    wrap.innerHTML = '<div class="hint">Ordenar por: <a href="#" onclick="state.comprasSort=\'producto\'; renderCompras(); return false;">Producto</a> · <a href="#" onclick="state.comprasSort=\'ticket\'; renderCompras(); return false;">Ticket</a> · <a href="#" onclick="state.comprasSort=\'tienda\'; renderCompras(); return false;">Tienda</a> · <a href="#" onclick="state.comprasSort=\'responsable\'; renderCompras(); return false;">Responsable</a></div>';
    rows.forEach(r => {
      const pending = String(r.ticketDonacion || '').trim() === '';
      const row = document.createElement('div');
      row.className = 'itemcard' + (pending ? ' red-row' : '');
      row.innerHTML = `
        <div class="rowline compra">
          <div class="field"><label>Producto</label><select data-action="edit-compra-producto" data-id="${r.id}">${(state.productos||[]).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es')).map(p => `<option value="${p.id}" ${p.id===r.productoId?'selected':''}>${escapeHtml(p.nombre)}</option>`).join('')}</select></div>
          <div class="field"><label>Unidades</label><input type="number" min="0" step="0.01" value="${Number(r.unidades||0)}" data-action="edit-compra-unidades" data-id="${r.id}" /></div>
          <div class="field"><label>Precio</label><input class="money-text" type="text" value="${euroText(r.precioCalc || 0)}" data-action="edit-compra-precio" data-id="${r.id}" /></div>
          <div class="field"><label>Importe</label><input class="soft-readonly" readonly value="${moneyTextV(r.importe)}" /></div>
          <div class="field"><label>Ticket u Otros gastos</label><select data-action="edit-compra-ticket" data-id="${r.id}">${PURCHASE_TICKET_OPTIONS.map(v => `<option value="${v}" ${v===r.ticketDonacion?'selected':''}>${v === '' ? '-- Pte.Compra u otros gastos --' : escapeHtml(v)}</option>`).join('')}</select></div>
          <div class="field"><label>Tienda</label><select data-action="edit-compra-tienda" data-id="${r.id}"><option value="" ${!r.tiendaId?'selected':''}>-- elige tienda --</option>${tiendas.map(t => `<option value="${t.id}" ${t.id===r.tiendaId?'selected':''}>${escapeHtml(t.nombre)}</option>`).join('')}</select></div>
          <div class="field"><label>Responsable</label><select data-action="edit-compra-responsable" data-id="${r.id}"><option value="" ${!r.responsableId?'selected':''}>-- sin responsable --</option>${socios.map(p => `<option value="${p.value}" ${p.value===r.responsableId?'selected':''}>${escapeHtml(p.label)}</option>`).join('')}</select></div>
          <div style="display:flex;gap:8px;align-items:end"><button type="button" class="modify small" data-action="save-compra" data-id="${r.id}">Modificar</button><button type="button" class="danger small" data-action="delete-compra" data-id="${r.id}">Eliminar</button></div>
        </div>`;
      wrap.appendChild(row);
    });
  };

  window.renderDonaciones = function(){
    const wrap = $('donacionesList');
    let rows = comprasForEvent().filter(r => isDonationTicket(r.ticketDonacion)).slice();
    const sorts = {
      producto:(a,b)=> (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es'),
      ticket:(a,b)=> String(a.ticketDonacion||'').localeCompare(String(b.ticketDonacion||''),'es'),
      donante:(a,b)=> (a.donorLabel||'').localeCompare((b.donorLabel||''),'es'),
      responsable:(a,b)=> (a.responsable?.nombre||'').localeCompare((b.responsable?.nombre||''),'es')
    };
    rows.sort((a,b)=>{
      const order = sorts[state.donacionesSort] || sorts.producto;
      const p = order(a,b);
      if(p !== 0) return p;
      return (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es');
    });
    if(!rows.length){ wrap.innerHTML = '<div class="empty">Todavía no hay donaciones de producto para este evento.</div>'; return; }
    const socios = (typeof socioResponsableOptions === 'function' ? socioResponsableOptions() : []).slice();
    const donors = (typeof donorOptions === 'function' ? donorOptions() : []).slice();
    wrap.innerHTML = '<div class="hint">Ordenar por: <a href="#" onclick="state.donacionesSort=\'producto\'; renderDonaciones(); return false;">Producto</a> · <a href="#" onclick="state.donacionesSort=\'ticket\'; renderDonaciones(); return false;">Tipo de donación</a> · <a href="#" onclick="state.donacionesSort=\'donante\'; renderDonaciones(); return false;">Donante</a> · <a href="#" onclick="state.donacionesSort=\'responsable\'; renderDonaciones(); return false;">Responsable</a></div>';
    rows.forEach(r => {
      const row = document.createElement('div');
      row.className = 'itemcard';
      row.innerHTML = `
        <div class="rowline compra">
          <div class="field"><label>Producto</label><select data-action="edit-donacion-producto" data-id="${r.id}">${(state.productos||[]).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es')).map(p => `<option value="${p.id}" ${p.id===r.productoId?'selected':''}>${escapeHtml(p.nombre)}</option>`).join('')}</select></div>
          <div class="field"><label>Unidades</label><input type="number" min="0" step="0.01" value="${Number(r.unidades||0)}" data-action="edit-donacion-unidades" data-id="${r.id}" /></div>
          <div class="field"><label>Precio</label><input class="money-text" type="text" value="${euroText(r.precioCalc || 0)}" data-action="edit-donacion-precio" data-id="${r.id}" /></div>
          <div class="field"><label>Valor</label><input class="soft-readonly" readonly value="${moneyTextV(r.valor)}" /></div>
          <div class="field"><label>Tipo de donación</label><select data-action="edit-donacion-ticket" data-id="${r.id}">${DONATION_TICKET_OPTIONS.map(v => `<option value="${v}" ${v===r.ticketDonacion?'selected':''}>${escapeHtml(v)}</option>`).join('')}</select></div>
          <div class="field"><label>Donante</label><select data-action="edit-donacion-donante" data-id="${r.id}"><option value="" ${!r.donorRef?'selected':''}>-- elige donante --</option>${donors.map(d => `<option value="${d.value}" ${d.value===r.donorRef?'selected':''}>${escapeHtml(d.label)}</option>`).join('')}</select></div>
          <div class="field"><label>Responsable</label><select data-action="edit-donacion-responsable" data-id="${r.id}"><option value="" ${!r.responsableId?'selected':''}>-- sin responsable --</option>${socios.map(p => `<option value="${p.value}" ${p.value===r.responsableId?'selected':''}>${escapeHtml(p.label)}</option>`).join('')}</select></div>
          <div style="display:flex;gap:8px;align-items:end"><button type="button" class="modify small" data-action="save-donacion" data-id="${r.id}">Modificar</button><button type="button" class="danger small" data-action="delete-donacion" data-id="${r.id}">Eliminar</button></div>
        </div>`;
      wrap.appendChild(row);
    });
  };

  window.exportExcel = async function(){
    if(isLocked() && !isGodRole()) return;
    const ev = selectedEvent();
    if(!ev) return;

    try{
      await ensureExcelJS();
    }catch(err){
      alert('No se pudo cargar el motor de Excel. Coloca exceljs.min.js en la carpeta vendor o usa conexión a internet.');
      return;
    }

    ensureProductRefPrices();

    const collabs = collabsForEvent();
    const compras = comprasForEvent();
    const comprasSolo = compras.filter(x => !isDonationTicket(x.ticketDonacion));
    const donacionesSolo = compras.filter(x => isDonationTicket(x.ticketDonacion));
    const budget = budgetSummary();
    const segRows = summaryBySegmento();
    const destRows = summaryByDestino();
    const tiendaRows = summaryByTiendaTicket();

    const wb = new ExcelJS.Workbook();
    wb.creator = 'ControlEvent v28.10 - ©oltyLAB ’26';
    wb.created = new Date();

    const border = {top:{style:'thin', color:{argb:'FFDDE2EA'}},left:{style:'thin', color:{argb:'FFDDE2EA'}},bottom:{style:'thin', color:{argb:'FFDDE2EA'}},right:{style:'thin', color:{argb:'FFDDE2EA'}}};
    const fills = { title:'FF111827', ok:'FFECFDF5', bad:'FFFEF2F2', warn:'FFFFF7ED', white:'FFFFFFFF' };
    const moneyFmt = '#,##0.00 [$€-C0A]';
    const numFmt = '0.00';

    function baseSheet(name, widths){
      const ws = wb.addWorksheet(name);
      ws.properties.defaultRowHeight = 20;
      ws.columns = widths.map(w => ({width:w}));
      return ws;
    }
    function paint(cell, fill='white'){
      cell.border = border;
      cell.alignment = {vertical:'middle', wrapText:true};
      if(fill && fills[fill]){
        cell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:fills[fill]}};
      }
    }
    function titleRow(ws, rowNum, headers){
      headers.forEach((h, i) => {
        const c = ws.getCell(rowNum, i+1);
        c.value = h;
        c.font = {bold:true, color:{argb:'FFFFFFFF'}};
        c.fill = {type:'pattern', pattern:'solid', fgColor:{argb:fills.title}};
        c.border = border;
        c.alignment = {vertical:'middle', horizontal:'center'};
      });
      ws.getRow(rowNum).height = 20;
    }
    function putText(ws, r, c, v, fill='white'){
      const cell = ws.getCell(r,c);
      cell.value = v == null ? '' : String(v);
      paint(cell, fill);
      return cell;
    }
    function putNum(ws, r, c, v, fill='white'){
      const cell = ws.getCell(r,c);
      cell.value = Number(v || 0);
      cell.numFmt = numFmt;
      paint(cell, fill);
      return cell;
    }
    function putMoney(ws, r, c, v, fill='white'){
      const cell = ws.getCell(r,c);
      cell.value = Number(v || 0);
      cell.numFmt = moneyFmt;
      paint(cell, fill);
      return cell;
    }
    function addTotalRow(ws, rowNum, labelCol, valueCol, total){
      putText(ws, rowNum, labelCol, 'TOTAL', 'ok');
      putMoney(ws, rowNum, valueCol, total, 'ok');
    }
    function mergeTitle(ws, row, text, cols){
      ws.mergeCells(row,1,row,cols);
      const cell = ws.getCell(row,1);
      cell.value = text;
      cell.font = {bold:true, color:{argb:'FFFFFFFF'}};
      cell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:fills.title}};
      cell.border = border;
      cell.alignment = {vertical:'middle', horizontal:'center'};
      ws.getRow(row).height = 20;
    }
    function addImageToCell(ws, dataUrl, row, col){
      if(!dataUrl) return;
      const m = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
      if(!m) return;
      const ext = m[1].includes('png') ? 'png' : 'jpeg';
      const id = wb.addImage({base64:dataUrl, extension:ext});
      ws.getRow(row).height = 320;
      paint(ws.getCell(row,col), 'white');
      ws.addImage(id, { tl: {col: col-1 + 0.05, row: row-1 + 0.05}, ext: {width: 1040, height: 420} });
    }

    // RESUMEN
    const wsRes = baseSheet('RESUMEN', [34, 26, 16, 16, 16, 16, 16, 16, 16]);
    let r = 1;
    mergeTitle(wsRes, r++, 'RESUMEN DEL EVENTO', 4);
    putText(wsRes,r,1,'Generado por'); putText(wsRes,r++,2,'ControlEvent v28.10 - ©oltyLAB ’26');
    putText(wsRes,r,1,'Evento'); putText(wsRes,r++,2,ev.titulo);
    putText(wsRes,r,1,'Fechas'); putText(wsRes,r++,2,`(del ${ev.fechaIni || ''} al ${ev.fechaFin || ''})`);
    wsRes.mergeCells(r,2,r,6); putText(wsRes,r,1,'Descripción del evento'); putText(wsRes,r,2,ev.descripcion || ''); wsRes.getCell(r,2).alignment = {vertical:'middle', wrapText:true}; wsRes.getRow(r).height = Math.max(22, Math.min(120, 20 + Math.ceil(String(ev.descripcion||'').length / 55) * 16)); r++;
    putText(wsRes,r,1,'Situación'); putText(wsRes,r++,2,ev.situacion || 'En curso', (ev.situacion === 'Finalizado' ? 'bad' : 'ok'));
    putText(wsRes,r,1,'Precio evento'); putMoney(wsRes,r++,2,ev.precio);
    putText(wsRes,r,1,'Ingreso dinero'); putMoney(wsRes,r++,2,budget.ingresosDinero.totalIngresado);
    putText(wsRes,r,1,'Gasto por compras'); putMoney(wsRes,r++,2,budget.operativa.gastoCompras);
    putText(wsRes,r,1,'Gastos de organización'); putMoney(wsRes,r++,2,budget.operativa.gastosOrganizacion);
    putText(wsRes,r,1,'Valor producto donado'); putMoney(wsRes,r++,2,budget.donacionProducto.valorDonado);
    putText(wsRes,r,1,'Donación de producto tiendas'); putMoney(wsRes,r++,2,budget.donacionProducto.donadoTienda);
    putText(wsRes,r,1,'Donación de producto socios'); putMoney(wsRes,r++,2,budget.donacionProducto.donadoSocio);
    putText(wsRes,r,1,'Donación de producto no socios'); putMoney(wsRes,r++,2,budget.donacionProducto.donadoOtros);
    putText(wsRes,r,1,'Saldo operativo'); putMoney(wsRes,r++,2,budget.operativa.saldoOperativo, budget.operativa.saldoOperativo >= 0 ? 'ok' : 'bad');
    putText(wsRes,r,1,'Fecha y hora emisión'); putText(wsRes,r++,2,new Date().toLocaleString('es-ES'));

    // INGRESOS
    const wsIng = baseSheet('INGRESOS', [34, 9, 16, 18, 18, 18]);
    r = 1;
    mergeTitle(wsIng, r++, 'INGRESOS', 6);
    titleRow(wsIng, r++, ['Colaborador/a','Número','Tipo ingreso','Importe SOCIO','Importe NO SOCIO','TOTAL']);
    collabs.forEach(item => {
      putText(wsIng,r,1,`${item.persona?.nombre || ''} (${item.persona?.rango || ''})`);
      putNum(wsIng,r,2,item.numero);
      putText(wsIng,r,3,item.situacion);
      putMoney(wsIng,r,4,item.base);
      putMoney(wsIng,r,5,item.donation);
      putMoney(wsIng,r,6,item.total);
      if(item.situacion === 'Pendiente') for(let c=1;c<=6;c++) paint(wsIng.getCell(r,c),'bad');
      r++;
    });
    addTotalRow(wsIng, r, 5, 6, collabs.reduce((a,b)=>a+Number(b.total||0),0));

    // COMPRAS Y OTROS GASTOS
    const wsCom = baseSheet('COMPRAS Y OTROS GASTOS', [28, 16, 16, 10, 14, 14, 20, 24, 22]);
    r = 1;
    mergeTitle(wsCom, r++, 'COMPRAS Y OTROS GASTOS', 9);
    titleRow(wsCom, r++, ['Producto','Segmento','Destino','ud','Precio','Importe','Tienda','Ticket u Otros gastos','Responsable']);
    comprasSolo.forEach(item => {
      putText(wsCom,r,1,item.producto?.nombre || '');
      putText(wsCom,r,2,item.producto?.segmento || '');
      putText(wsCom,r,3,item.producto?.destino || '');
      putNum(wsCom,r,4,item.unidades);
      putMoney(wsCom,r,5,item.precioCalc || item.precio || 0);
      putMoney(wsCom,r,6,item.importe);
      putText(wsCom,r,7,item.tienda?.nombre || '');
      putText(wsCom,r,8,item.ticketDonacion || 'Pte.Compra u otros gastos');
      putText(wsCom,r,9,item.responsable?.nombre || '');
      if(String(item.ticketDonacion || '').trim() === '') for(let c=1;c<=9;c++) paint(wsCom.getCell(r,c),'bad');
      r++;
    });
    addTotalRow(wsCom, r, 5, 6, comprasSolo.reduce((a,b)=>a+Number(b.importe||0),0));

    // DONACIONES DE PRODUCTO
    const wsDon = baseSheet('DONACIONES DE PRODUCTO', [28, 16, 16, 10, 14, 14, 20, 24, 22]);
    r = 1;
    mergeTitle(wsDon, r++, 'DONACIONES DE PRODUCTO', 9);
    titleRow(wsDon, r++, ['Producto','Segmento','Destino','ud','Precio','Valor','Donante','Tipo de donación','Responsable']);
    donacionesSolo.forEach(item => {
      putText(wsDon,r,1,item.producto?.nombre || '');
      putText(wsDon,r,2,item.producto?.segmento || '');
      putText(wsDon,r,3,item.producto?.destino || '');
      putNum(wsDon,r,4,item.unidades);
      putMoney(wsDon,r,5,item.precioCalc || item.precio || 0);
      putMoney(wsDon,r,6,item.valor);
      putText(wsDon,r,7,item.donorLabel || item.tienda?.nombre || '');
      putText(wsDon,r,8,item.ticketDonacion || '');
      putText(wsDon,r,9,item.responsable?.nombre || '');
      r++;
    });
    addTotalRow(wsDon, r, 5, 6, donacionesSolo.reduce((a,b)=>a+Number(b.valor||0),0));

    // AGR. SEGMENTO
    const wsSeg = baseSheet('AGR. SEGMENTO', [40, 18]);
    r = 1;
    mergeTitle(wsSeg, r++, 'CÁLCULOS POR AGRUPACIÓN - SEGMENTO', 2);
    titleRow(wsSeg, r++, ['Segmento','Importe']);
    segRows.forEach(item => {
      putText(wsSeg,r,1,item.k);
      putMoney(wsSeg,r,2,item.v);
      if(item.pending){ paint(wsSeg.getCell(r,1),'bad'); paint(wsSeg.getCell(r,2),'bad'); }
      r++;
    });
    addTotalRow(wsSeg, r, 1, 2, segRows.reduce((a,b)=>a+Number(b.v||0),0));

    // AGR. DESTINO
    const wsDest = baseSheet('AGR. DESTINO', [40, 18]);
    r = 1;
    mergeTitle(wsDest, r++, 'CÁLCULOS POR AGRUPACIÓN - DESTINO', 2);
    titleRow(wsDest, r++, ['Destino','Importe']);
    destRows.forEach(item => {
      putText(wsDest,r,1,item.k);
      putMoney(wsDest,r,2,item.v);
      if(item.pending){ paint(wsDest.getCell(r,1),'bad'); paint(wsDest.getCell(r,2),'bad'); }
      r++;
    });
    addTotalRow(wsDest, r, 1, 2, destRows.reduce((a,b)=>a+Number(b.v||0),0));

    // AGR. TIENDA-TICKET
    const wsTT = baseSheet('AGR.TIENDA-TICKET', [44, 18, 20]);
    r = 1;
    mergeTitle(wsTT, r++, 'CÁLCULOS POR AGRUPACIÓN - TIENDA Y TICKET/DONACIÓN/OTROS GASTOS', 3);
    titleRow(wsTT, r++, ['Tienda y Ticket u Otros gastos','Importe','Ticket']);
    tiendaRows.forEach(item => {
      putText(wsTT,r,1,item.k);
      putMoney(wsTT,r,2,item.v);
      putText(wsTT,r,3,'N/A');
      if(item.pending){
        for(let c=1;c<=3;c++) paint(wsTT.getCell(r,c),'bad');
      } else if(!item.donated && item.image){
        putText(wsTT,r,3,'');
        addImageToCell(wsTT, item.image || '', r, 3);
      }
      r++;
    });
    addTotalRow(wsTT, r, 1, 2, tiendaRows.reduce((a,b)=>a+Number(b.v||0),0));

    // GRAFICAS
    const wsGraf = baseSheet('GRAFICAS', [24,24,24,24]);
    mergeTitle(wsGraf, 1, 'GRÁFICAS DEL EVENTO', 4);
    addImageToCell(wsGraf, await makeChartImageDataUrl(), 3, 1);

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = excelFileName(ev);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Intercept saves that old click-handler hardcodes
  document.addEventListener('click', function(e){
    const btn = e.target.closest('button');
    if(!btn) return;
    const action = btn.dataset.action || btn.id;

    if(action === 'save-producto'){
      e.preventDefault();
      e.stopImmediatePropagation();
      const id = btn.dataset.id;
      const p = productoById(id);
      if(p){
        p.nombre = currentValuesByAction('edit-producto-nombre', id).trim();
        p.segmento = currentValuesByAction('edit-producto-segmento', id);
        p.destino = currentValuesByAction('edit-producto-destino', id);
        p.defaultPrecio = parseEuroInput(currentValuesByAction('edit-producto-precio', id) || 0);
        render();
      }
      return;
    }

    if(action === 'save-compra'){
      e.preventDefault();
      e.stopImmediatePropagation();
      const id = btn.dataset.id;
      const c = state.compras.find(x => x.id === id);
      if(c){
        c.productoId = currentValuesByAction('edit-compra-producto', id);
        c.unidades = Number(currentValuesByAction('edit-compra-unidades', id) || 0);
        c.precio = parseEuroInput(currentValuesByAction('edit-compra-precio', id) || 0);
        c.ticketDonacion = currentValuesByAction('edit-compra-ticket', id);
        c.tiendaId = currentValuesByAction('edit-compra-tienda', id);
        c.responsableId = currentValuesByAction('edit-compra-responsable', id);
        const p = productoById(c.productoId);
        if(p) p.defaultPrecio = c.precio;
        render();
      }
      return;
    }

    if(action === 'save-donacion'){
      e.preventDefault();
      e.stopImmediatePropagation();
      const id = btn.dataset.id;
      const c = state.compras.find(x => x.id === id);
      if(c){
        c.productoId = currentValuesByAction('edit-donacion-producto', id);
        c.unidades = Number(currentValuesByAction('edit-donacion-unidades', id) || 0);
        c.precio = parseEuroInput(currentValuesByAction('edit-donacion-precio', id) || 0);
        c.ticketDonacion = currentValuesByAction('edit-donacion-ticket', id);
        c.donorRef = currentValuesByAction('edit-donacion-donante', id);
        c.responsableId = currentValuesByAction('edit-donacion-responsable', id);
        render();
      }
      return;
    }
  }, true);

  // Live recalculation on add forms
  document.addEventListener('change', function(e){
    const id = e.target && e.target.id;
    if(['buyProducto','buyUnidades','buyTicket','buyPrecio'].includes(id)){
      if(isLocked()) return;
      updateBuyPreview(id === 'buyProducto');
    }
    if(['donProducto','donUnidades','donTicket','donPrecio'].includes(id)){
      if(isLocked()) return;
      updateDonationPreview(id === 'donProducto');
    }
  }, true);
  document.addEventListener('input', function(e){
    const id = e.target && e.target.id;
    if(['buyUnidades','buyPrecio'].includes(id)){
      if(isLocked()) return;
      updateBuyPreview(false);
    }
    if(['donUnidades','donPrecio'].includes(id)){
      if(isLocked()) return;
      updateDonationPreview(false);
    }
  }, true);

  ensureProductRefPrices();
  if(typeof render === 'function') render();
})();

/* ==== PATCH V14.3 ==== */
(function(){
  const $ = id => document.getElementById(id);
  const fmtMoney = v => (typeof money === 'function' ? money(Number(v||0)) : new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0)));
  const esc = v => (typeof escapeHtml === 'function' ? escapeHtml(v) : String(v??''));

  window.excelFileName = function(ev){
    const title = String(ev?.titulo || 'evento')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'').replace(/_+/g,'_') || 'evento';
    const d = new Date();
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yyyy = String(d.getFullYear());
    return `ControlEvent_v28_10_INFOEVENTO-${title}_${yyyy}${mm}${dd}.xlsx`;
  };

  window.socioResponsableOptions = function(){
    return (typeof personasGenerales === 'function' ? personasGenerales() : (state.personas||[]))
      .filter(p => String(p.rango||'').trim().toUpperCase() === 'SOCIO')
      .slice()
      .sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'))
      .map(p => ({value:p.id, label:p.nombre || ''}));
  };

  window.donorOptions = function(){
    const people = (typeof personasGenerales === 'function' ? personasGenerales() : (state.personas||[]))
      .slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'))
      .map(p => ({value:'P:'+p.id, label:p.nombre || '', kind:'persona'}));
    const stores = (typeof tiendasGenerales === 'function' ? tiendasGenerales() : (state.tiendas||[]))
      .slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'))
      .map(t => ({value:'T:'+t.id, label:t.nombre || '', kind:'tienda'}));
    return people.concat(stores);
  };

  function graphBreakdown(){
    const rows = typeof collabsForEvent === 'function' ? collabsForEvent() : [];
    const compras = typeof comprasForEvent === 'function' ? comprasForEvent() : [];
    const sum = arr => arr.reduce((a,b)=>a+Number(b||0),0);
    const incomeRows = rows.filter(r => ['Banco','Bizum','Efectivo','Pendiente'].includes(String(r.situacion||'')));
    const byGroupType = (group, type) => incomeRows
      .filter(r => (group === 'SOCIO' ? String(r.persona?.rango||'').toUpperCase()==='SOCIO' : String(r.persona?.rango||'').toUpperCase()!=='SOCIO') && String(r.situacion||'')===type)
      .reduce((a,b)=>a+Number(b.total||0),0);

    const ingSocBanco = byGroupType('SOCIO','Banco');
    const ingSocBizum = byGroupType('SOCIO','Bizum');
    const ingSocEfectivo = byGroupType('SOCIO','Efectivo');
    const ingNoSocBanco = byGroupType('NOSOCIO','Banco');
    const ingNoSocBizum = byGroupType('NOSOCIO','Bizum');
    const ingNoSocEfectivo = byGroupType('NOSOCIO','Efectivo');
    const ingPendiente = incomeRows.filter(r => String(r.situacion||'')==='Pendiente').reduce((a,b)=>a+Number(b.total||0),0);
    const ingRealizados = ingSocBanco + ingSocBizum + ingSocEfectivo + ingNoSocBanco + ingNoSocBizum + ingNoSocEfectivo;
    const ingTotal = ingRealizados + ingPendiente;

    const donSocios = compras.filter(c => String(c.ticketDonacion||'') === 'DONADO SOCIO').reduce((a,b)=>a+Number(b.valor||0),0);
    const donNoSocios = compras.filter(c => String(c.ticketDonacion||'') === 'DONADO OTROS').reduce((a,b)=>a+Number(b.valor||0),0);
    const donTiendas = compras.filter(c => String(c.ticketDonacion||'') === 'DONADO TIENDA').reduce((a,b)=>a+Number(b.valor||0),0);
    const donTotal = donSocios + donNoSocios + donTiendas;

    const gastosTk = compras.filter(c => !isDonationTicket(c.ticketDonacion) && !isCurrentExpenseTicket(c.ticketDonacion) && String(c.ticketDonacion||'').trim() !== '').reduce((a,b)=>a+Number(b.valor||0),0);
    const gastosCorr = compras.filter(c => isCurrentExpenseTicket(c.ticketDonacion)).reduce((a,b)=>a+Number(b.valor||0),0);
    const gastosPend = compras.filter(c => !isDonationTicket(c.ticketDonacion) && String(c.ticketDonacion||'').trim() === '').reduce((a,b)=>a+Number(b.valor||0),0);
    const gastosReal = gastosTk + gastosCorr;
    const gastosTotal = gastosReal + gastosPend;

    const saldoTotal = ingTotal - gastosTotal;
    const saldoReal = ingRealizados - gastosReal;

    return {
      ingresos:{
        total: ingTotal,
        realizados: ingRealizados,
        pendiente: ingPendiente,
        segs:[
          {key:'soc_banco', label:'Ingresado SOCIOS - Banco', value:ingSocBanco, color:'#2563eb'},
          {key:'soc_bizum', label:'Ingresado SOCIOS - Bizum', value:ingSocBizum, color:'#60a5fa'},
          {key:'soc_efectivo', label:'Ingresado SOCIOS - Efectivo', value:ingSocEfectivo, color:'#93c5fd'},
          {key:'nosoc_banco', label:'Ingresado NO SOCIOS - Banco', value:ingNoSocBanco, color:'#16a34a'},
          {key:'nosoc_bizum', label:'Ingresado NO SOCIOS - Bizum', value:ingNoSocBizum, color:'#4ade80'},
          {key:'nosoc_efectivo', label:'Ingresado NO SOCIOS - Efectivo', value:ingNoSocEfectivo, color:'#86efac'},
          {key:'pendiente', label:'Pendiente de ingresar', value:ingPendiente, color:'#f59e0b'}
        ]
      },
      donaciones:{
        total: donTotal,
        segs:[
          {key:'socios', label:'Donado por SOCIOS', value:donSocios, color:'#f59e0b'},
          {key:'nosocios', label:'Donado por NO SOCIOS', value:donNoSocios, color:'#fbbf24'},
          {key:'tiendas', label:'Donado por TIENDAS', value:donTiendas, color:'#fcd34d'}
        ]
      },
      gastos:{
        total: gastosTotal,
        realizados: gastosReal,
        pendiente: gastosPend,
        segs:[
          {key:'tk', label:'Gastado en TKxx', value:gastosTk, color:'#dc2626'},
          {key:'corr', label:'GASTOS CORRIENTES', value:gastosCorr, color:'#f87171'},
          {key:'pend', label:'Pendiente de comprar', value:gastosPend, color:'#fb7185'}
        ]
      },
      saldo:{
        total: saldoTotal,
        realizado: saldoReal,
        segs:[
          {key:'saldo_real', label:'Saldo realizado (ingresos realizados - gastos realizados)', value:Math.abs(saldoReal), color:saldoReal>=0 ? '#0f766e' : '#7f1d1d'}
        ]
      }
    };
  }

  function graphMax(g){
    return Math.max(1,
      g.ingresos.total,
      g.donaciones.total,
      g.gastos.total,
      Math.abs(g.saldo.total),
      Math.abs(g.saldo.realizado)
    );
  }

  function labelHtml(text, total){
    return `<div class="chart-label" style="display:flex;justify-content:space-between;gap:10px;align-items:center"><span>${esc(text)}</span><strong>${esc(fmtMoney(total))}</strong></div>`;
  }

  window.renderGraficas = function(){
    const wrap = $('eventChartWrap');
    if(!wrap) return;
    const g = graphBreakdown();
    const maxVal = graphMax(g);
    const seg = (item) => {
      const w = (Math.max(0, Number(item.value || 0)) / maxVal) * 100;
      return `<div class="chart-seg" title="${esc(item.label + ': ' + fmtMoney(item.value))}" style="width:${w}%;background:${item.color};"></div>`;
    };
    const row = (title, total, segs, center) => `
      <div class="chart-row">
        ${labelHtml(title,total)}
        <div class="chart-track">
          ${segs.filter(s => Number(s.value||0) > 0).map(seg).join('')}
          <div class="chart-center-value">${esc(fmtMoney(center))}</div>
        </div>
      </div>`;
    wrap.innerHTML = `<div class="chart-shell"><div class="chart-bars">
      ${row('INGRESOS EN DINERO', g.ingresos.total, g.ingresos.segs, g.ingresos.total)}
      ${row('DONACIÓN DE PRODUCTO', g.donaciones.total, g.donaciones.segs, g.donaciones.total)}
      ${row('GASTOS', g.gastos.total, g.gastos.segs, g.gastos.total)}
      ${row('SALDO OPERATIVO', g.saldo.total, g.saldo.segs, g.saldo.realizado)}
    </div></div>`;
  };

  window.makeChartImageDataUrl = async function(){
    const g = graphBreakdown();
    const maxVal = graphMax(g);
    const canvas = document.createElement('canvas');
    canvas.width = 1220; canvas.height = 560;
    const ctx = canvas.getContext('2d');
    const fmt = v => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0));
    const rr = (x,y,w,h,r,color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x+r,y);
      ctx.arcTo(x+w,y,x+w,y+h,r);
      ctx.arcTo(x+w,y+h,x,y+h,r);
      ctx.arcTo(x,y+h,x,y,r);
      ctx.arcTo(x,y,x+w,y,r);
      ctx.closePath();
      ctx.fill();
    };
    const drawRow = (y,title,total,segs,center) => {
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 20px Arial';
      ctx.fillText(title, 40, y+24);
      ctx.textAlign = 'right';
      ctx.fillText(fmt(total), 335, y+24);
      ctx.textAlign = 'left';
      rr(360,y,820,38,19,'#f3f4f6');
      let x = 360;
      segs.filter(s => Number(s.value||0) > 0).forEach(s => {
        const w = (Math.max(0, Number(s.value||0)) / maxVal) * 820;
        if(w <= 0) return;
        rr(x,y,w,38,19,s.color);
        x += w;
      });
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 17px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(fmt(center), 770, y+25);
      ctx.textAlign = 'left';
    };
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 28px Arial';
    ctx.fillText('GRÁFICAS DEL EVENTO', 40, 42);
    let y = 92;
    drawRow(y,'INGRESOS EN DINERO',g.ingresos.total,g.ingresos.segs,g.ingresos.total); y += 108;
    drawRow(y,'DONACIÓN DE PRODUCTO',g.donaciones.total,g.donaciones.segs,g.donaciones.total); y += 108;
    drawRow(y,'GASTOS',g.gastos.total,g.gastos.segs,g.gastos.total); y += 108;
    drawRow(y,'SALDO OPERATIVO',g.saldo.total,g.saldo.segs,g.saldo.realizado);
    return canvas.toDataURL('image/png');
  };

  document.addEventListener('click', function(e){
    const btn = e.target.closest('button');
    if(!btn) return;
    const action = btn.dataset.action || btn.id;
    if(action === 'save-compra'){
      const id = btn.dataset.id, c = (state.compras||[]).find(x => x.id === id);
      if(c){
        c.productoId = currentValuesByAction('edit-compra-producto', id);
        c.unidades = Number(currentValuesByAction('edit-compra-unidades', id) || 0);
        c.precio = parseEuroInput(currentValuesByAction('edit-compra-precio', id) || 0);
        c.ticketDonacion = currentValuesByAction('edit-compra-ticket', id);
        c.tiendaId = currentValuesByAction('edit-compra-tienda', id);
        c.responsableId = currentValuesByAction('edit-compra-responsable', id);
        const p = typeof productoById === 'function' ? productoById(c.productoId) : null;
        if(p) p.defaultPrecio = c.precio;
        if(typeof render === 'function') render();
      }
    }
  }, true);

  if(typeof render === 'function') render();
})();


/* ==== PATCH V14.3 CORREGIDA ==== */
(function(){
  const moneyFmt = (v) => (typeof moneyTextV === 'function' ? moneyTextV(v) : (typeof money === 'function' ? money(v) : String(v)));
  const esc = (v) => (typeof escapeHtml === 'function' ? escapeHtml(v) : String(v ?? ''));
  const $id = (id) => document.getElementById(id);

  // 1) En COMPRAS, desplegable Tienda con toda la tabla TIENDAS
  if(typeof renderMainSelectors === 'function'){
    const prevRenderMainSelectors = renderMainSelectors;
    renderMainSelectors = function(){
      prevRenderMainSelectors();
      const buyTienda = $id('buyTienda');
      if(buyTienda){
        const tiendas = (typeof tiendasGenerales === 'function' ? tiendasGenerales() : (state.tiendas || []))
          .slice()
          .sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
        buyTienda.innerHTML =
          '<option value="" selected>Busca tienda.....</option>' +
          tiendas.map(t => `<option value="${t.id}">${esc(t.nombre)}</option>`).join('');
      }
    };
  }

  function graphDataV143(){
    const collabs = (typeof collabsForEvent === 'function' ? collabsForEvent() : []);
    const compras = (typeof comprasForEvent === 'function' ? comprasForEvent() : []);

    const sum = (arr, fn) => arr.reduce((a,b) => a + Number(fn(b) || 0), 0);

    const incomes = {
      socioBanco: sum(collabs, r => r.persona?.rango === 'SOCIO' && r.situacion === 'Banco' ? r.total : 0),
      socioBizum: sum(collabs, r => r.persona?.rango === 'SOCIO' && r.situacion === 'Bizum' ? r.total : 0),
      socioEfectivo: sum(collabs, r => r.persona?.rango === 'SOCIO' && r.situacion === 'Efectivo' ? r.total : 0),
      noSocioBanco: sum(collabs, r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Banco' ? r.total : 0),
      noSocioBizum: sum(collabs, r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Bizum' ? r.total : 0),
      noSocioEfectivo: sum(collabs, r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Efectivo' ? r.total : 0),
      pendiente: sum(collabs, r => r.situacion === 'Pendiente' ? r.total : 0),
    };
    incomes.total =
      incomes.socioBanco + incomes.socioBizum + incomes.socioEfectivo +
      incomes.noSocioBanco + incomes.noSocioBizum + incomes.noSocioEfectivo +
      incomes.pendiente;
    incomes.realizado =
      incomes.socioBanco + incomes.socioBizum + incomes.socioEfectivo +
      incomes.noSocioBanco + incomes.noSocioBizum + incomes.noSocioEfectivo;

    const donations = {
      socios: sum(compras, r => r.ticketDonacion === 'DONADO SOCIO' ? r.valor : 0),
      noSocios: sum(compras, r => r.ticketDonacion === 'DONADO OTROS' ? r.valor : 0),
      tiendas: sum(compras, r => r.ticketDonacion === 'DONADO TIENDA' ? r.valor : 0),
    };
    donations.total = donations.socios + donations.noSocios + donations.tiendas;

    const expenses = {
      tk: sum(compras, r => !isDonationTicket(r.ticketDonacion) && !isCurrentExpenseTicket(r.ticketDonacion) && String(r.ticketDonacion || '').trim() !== '' ? r.valor : 0),
      corrientes: sum(compras, r => isCurrentExpenseTicket(r.ticketDonacion) ? r.valor : 0),
      pendiente: sum(compras, r => !isDonationTicket(r.ticketDonacion) && String(r.ticketDonacion || '').trim() === '' ? r.valor : 0),
    };
    expenses.total = expenses.tk + expenses.corrientes + expenses.pendiente;
    expenses.realizado = expenses.tk + expenses.corrientes;

    const saldo = {
      total: incomes.total - expenses.total,
      realizado: incomes.realizado - expenses.realizado
    };

    return { incomes, donations, expenses, saldo };
  }

  graphData = graphDataV143;

  function buildLegendHtml(items){
    return `<div class="chart-note" style="display:flex;flex-wrap:wrap;gap:10px 16px;margin-top:8px">` +
      items.filter(x => Number(x.value || 0) !== 0).map(x =>
        `<span><span class="legend-dot" style="background:${x.color}"></span>${esc(x.label)}: ${esc(moneyFmt(x.value))}</span>`
      ).join('') +
      `</div>`;
  }

  renderGraphOnly = function(){
    const wrap = $id('eventChartWrap');
    if(!wrap) return;
    const g = graphDataV143();
    const maxVal = Math.max(
      1,
      g.incomes.total,
      g.donations.total,
      g.expenses.total,
      Math.abs(g.saldo.realizado)
    );
    const seg = (value, color, title) => {
      const w = (Math.max(0, Number(value || 0)) / maxVal) * 100;
      return `<div class="chart-seg" title="${esc(title)}" style="width:${w}%;background:${color};"></div>`;
    };

    const incomeItems = [
      {label:'Socios Banco', value:g.incomes.socioBanco, color:'#2563eb'},
      {label:'Socios Bizum', value:g.incomes.socioBizum, color:'#16a34a'},
      {label:'Socios Efectivo', value:g.incomes.socioEfectivo, color:'#84cc16'},
      {label:'No socios Banco', value:g.incomes.noSocioBanco, color:'#60a5fa'},
      {label:'No socios Bizum', value:g.incomes.noSocioBizum, color:'#34d399'},
      {label:'No socios Efectivo', value:g.incomes.noSocioEfectivo, color:'#bef264'},
      {label:'Pendiente de ingresar', value:g.incomes.pendiente, color:'#f59e0b'}
    ];
    const donationItems = [
      {label:'Donado por socios', value:g.donations.socios, color:'#f59e0b'},
      {label:'Donado por no socios', value:g.donations.noSocios, color:'#b45309'},
      {label:'Donado por tiendas', value:g.donations.tiendas, color:'#fcd34d'}
    ];
    const expenseItems = [
      {label:'Gastado en TKxx', value:g.expenses.tk, color:'#dc2626'},
      {label:'Gastos corrientes', value:g.expenses.corrientes, color:'#ef4444'},
      {label:'Pendiente de comprar', value:g.expenses.pendiente, color:'#fb7185'}
    ];
    const saldoItems = [
      {label:'Saldo realizado', value:Math.abs(g.saldo.realizado), color:g.saldo.realizado >= 0 ? '#0f766e' : '#b91c1c'}
    ];

    wrap.innerHTML = `
      <div class="chart-shell">
        <div class="chart-bars">
          <div class="chart-row">
            <div class="chart-label">INGRESOS EN DINERO: ${esc(moneyFmt(g.incomes.total))}</div>
            <div>
              <div class="chart-track">
                ${incomeItems.map(x => seg(x.value, x.color, x.label + ': ' + moneyFmt(x.value))).join('')}
              </div>
              ${buildLegendHtml(incomeItems)}
            </div>
          </div>
          <div class="chart-row">
            <div class="chart-label">DONACIÓN DE PRODUCTO: ${esc(moneyFmt(g.donations.total))}</div>
            <div>
              <div class="chart-track">
                ${donationItems.map(x => seg(x.value, x.color, x.label + ': ' + moneyFmt(x.value))).join('')}
              </div>
              ${buildLegendHtml(donationItems)}
            </div>
          </div>
          <div class="chart-row">
            <div class="chart-label">GASTOS: ${esc(moneyFmt(g.expenses.total))}</div>
            <div>
              <div class="chart-track">
                ${expenseItems.map(x => seg(x.value, x.color, x.label + ': ' + moneyFmt(x.value))).join('')}
              </div>
              ${buildLegendHtml(expenseItems)}
            </div>
          </div>
          <div class="chart-row">
            <div class="chart-label">SALDO OPERATIVO: ${esc(moneyFmt(g.saldo.total))}</div>
            <div>
              <div class="chart-track">
                ${saldoItems.map(x => seg(x.value, x.color, x.label + ': ' + moneyFmt(g.saldo.realizado))).join('')}
              </div>
              ${buildLegendHtml([{label:'Saldo realizado (ingresos realizados – gastos realizados)', value:g.saldo.realizado, color:saldoItems[0].color}])}
            </div>
          </div>
        </div>
      </div>`;
  };

  makeChartImageDataUrl = async function(){
    const canvas = document.createElement('canvas');
    canvas.width = 1180;
    canvas.height = 760;
    const ctx = canvas.getContext('2d');
    const g = graphDataV143();
    const maxVal = Math.max(1, g.incomes.total, g.donations.total, g.expenses.total, Math.abs(g.saldo.realizado));
    const fmt = v => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0));

    const rows = [
      {
        label:`INGRESOS EN DINERO: ${fmt(g.incomes.total)}`,
        items:[
          {label:'Socios Banco', value:g.incomes.socioBanco, color:'#2563eb'},
          {label:'Socios Bizum', value:g.incomes.socioBizum, color:'#16a34a'},
          {label:'Socios Efectivo', value:g.incomes.socioEfectivo, color:'#84cc16'},
          {label:'No socios Banco', value:g.incomes.noSocioBanco, color:'#60a5fa'},
          {label:'No socios Bizum', value:g.incomes.noSocioBizum, color:'#34d399'},
          {label:'No socios Efectivo', value:g.incomes.noSocioEfectivo, color:'#bef264'},
          {label:'Pendiente de ingresar', value:g.incomes.pendiente, color:'#f59e0b'}
        ]
      },
      {
        label:`DONACIÓN DE PRODUCTO: ${fmt(g.donations.total)}`,
        items:[
          {label:'Donado por socios', value:g.donations.socios, color:'#f59e0b'},
          {label:'Donado por no socios', value:g.donations.noSocios, color:'#b45309'},
          {label:'Donado por tiendas', value:g.donations.tiendas, color:'#fcd34d'}
        ]
      },
      {
        label:`GASTOS: ${fmt(g.expenses.total)}`,
        items:[
          {label:'Gastado en TKxx', value:g.expenses.tk, color:'#dc2626'},
          {label:'Gastos corrientes', value:g.expenses.corrientes, color:'#ef4444'},
          {label:'Pendiente de comprar', value:g.expenses.pendiente, color:'#fb7185'}
        ]
      },
      {
        label:`SALDO OPERATIVO: ${fmt(g.saldo.total)}`,
        items:[
          {label:'Saldo realizado (ingresos realizados – gastos realizados)', value:Math.abs(g.saldo.realizado), color:g.saldo.realizado >= 0 ? '#0f766e' : '#b91c1c'}
        ]
      }
    ];

    function rr(x,y,w,h,r,color){
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x+r,y);
      ctx.arcTo(x+w,y,x+w,y+h,r);
      ctx.arcTo(x+w,y+h,x,y+h,r);
      ctx.arcTo(x,y+h,x,y,r);
      ctx.arcTo(x,y,x+w,y,r);
      ctx.closePath();
      ctx.fill();
    }

    function drawLegendItems(items, startX, startY, maxWidth){
      ctx.font = '15px Arial';
      let x = startX, y = startY, rowH = 22;
      items.filter(it => Number(it.value || 0) !== 0).forEach(it => {
        const text = `${it.label}: ${fmt(it.value)}`;
        const textW = ctx.measureText(text).width;
        const itemW = 18 + textW + 18;
        if(x + itemW > startX + maxWidth){
          x = startX;
          y += rowH;
        }
        ctx.fillStyle = it.color;
        ctx.fillRect(x, y-11, 12, 12);
        ctx.fillStyle = '#334155';
        ctx.fillText(text, x + 18, y);
        x += itemW;
      });
      return y;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 28px Arial';
    ctx.fillText('GRÁFICAS DEL EVENTO', 40, 42);

    let y = 84;
    rows.forEach(row => {
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 20px Arial';
      ctx.fillText(row.label, 40, y + 20);

      rr(320, y, 800, 40, 20, '#f3f4f6');
      let x = 320;
      row.items.forEach(it => {
        const w = (Math.max(0, Number(it.value || 0)) / maxVal) * 800;
        if(w <= 0) return;
        rr(x, y, w, 40, 20, it.color);
        x += w;
      });

      y = drawLegendItems(row.items, 320, y + 66, 800) + 34;
    });

    return canvas.toDataURL('image/png');
  };

  // Refresca la gráfica con la nueva estructura
  if(typeof renderGraficas === 'function'){
    renderGraficas = function(){ renderGraphOnly(); };
  }
})();

;/* ===== END legacy-inline-02.js ===== */


;/* ===== BEGIN legacy-inline-03.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #3. */
/* ==== FIX FINAL V14.3 TIENDA EN COMPRAS ==== */
(function(){
  const byId = (id) => document.getElementById(id);
  const esc = (v) => typeof escapeHtml === 'function' ? escapeHtml(v) : String(v ?? '');
  const euro = (v) => typeof euroInputValue === 'function' ? euroInputValue(v) : String(v ?? 0);
  const moneyV = (v) => typeof moneyText === 'function' ? moneyText(v) : (typeof money === 'function' ? money(v) : String(v ?? 0));
  const allTiendas = () => (typeof tiendasGenerales === 'function' ? tiendasGenerales() : (state.tiendas || [])).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
  const allProductos = () => (typeof productosGenerales === 'function' ? productosGenerales() : (state.productos || [])).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
  const allSocios = () => (typeof sociosOnly === 'function' ? sociosOnly() : (state.personas || []).filter(p => p.rango === 'SOCIO')).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));

  renderMainSelectors = function(){
    const productos = allProductos();
    const tiendas = allTiendas();
    const socios = allSocios();

    if(byId('buyProducto')) byId('buyProducto').innerHTML =
      '<option value="" selected>Busca un producto....</option>' +
      productos.map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('');

    if(byId('buyTicket')) byId('buyTicket').innerHTML =
      PURCHASE_TICKET_OPTIONS.map(v => `<option value="${v}">${v === '' ? '-- Pte.Compra u otros gastos --' : esc(v)}</option>`).join('');

    if(byId('buyTienda')) byId('buyTienda').innerHTML =
      '<option value="" selected>Busca tienda.....</option>' +
      tiendas.map(t => `<option value="${t.id}">${esc(t.nombre)}</option>`).join('');

    if(byId('buyResponsable')) byId('buyResponsable').innerHTML =
      '<option value="">-- sin responsable --</option>' +
      socios.map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('');

    if(byId('donProducto')) byId('donProducto').innerHTML =
      '<option value="" selected>Busca un producto....</option>' +
      productos.map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('');

    if(byId('donTicket')) byId('donTicket').innerHTML =
      (typeof DONATION_TICKET_OPTIONS !== 'undefined' ? DONATION_TICKET_OPTIONS : []).map(v => `<option value="${v}">${esc(v)}</option>`).join('');

    if(byId('donDonante') && typeof donorOptions === 'function') byId('donDonante').innerHTML =
      '<option value="" selected>Busca donante.....</option>' +
      donorOptions().map(d => `<option value="${d.value}">${esc(d.label)}</option>`).join('');

    if(byId('donResponsable')) byId('donResponsable').innerHTML =
      '<option value="">-- sin responsable --</option>' +
      socios.map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('');
  };

  updateBuyPreview = function(forceReference=false){
    const producto = typeof productoById === 'function' ? productoById(byId('buyProducto')?.value || '') : null;
    const unidades = Number(byId('buyUnidades')?.value || 0);
    const precioEl = byId('buyPrecio');
    const ref = Number((producto && (producto.defaultPrecio ?? producto.precio)) || 0);
    const precio = forceReference ? ref : (typeof parseEuroInput === 'function' ? parseEuroInput(precioEl?.value || ref) : ref);
    const importe = precio * unidades;
    if(precioEl) precioEl.value = euro(precio);
    if(byId('buyImporte')) byId('buyImporte').value = moneyV(importe);
  };

  addCompra = function(){
    if(typeof selectedEvent === 'function' && !selectedEvent()) return;
    const productoId = byId('buyProducto')?.value || '';
    if(!productoId) return;
    const precio = typeof parseEuroInput === 'function' ? parseEuroInput(byId('buyPrecio')?.value || 0) : Number(byId('buyPrecio')?.value || 0);
    state.compras.push({
      id: typeof uid === 'function' ? uid() : String(Date.now()),
      eventId: state.selectedEventId,
      productoId,
      unidades: Number(byId('buyUnidades')?.value || 0),
      precio,
      ticketDonacion: byId('buyTicket')?.value || '',
      tiendaId: byId('buyTienda')?.value || '',
      responsableId: byId('buyResponsable')?.value || ''
    });
    if(byId('buyProducto')) byId('buyProducto').value = '';
    if(byId('buyUnidades')) byId('buyUnidades').value = '1.00';
    if(byId('buyPrecio')) byId('buyPrecio').value = '0,00 €';
    if(byId('buyImporte')) byId('buyImporte').value = '';
    if(byId('buyTicket')) byId('buyTicket').value = '';
    if(byId('buyTienda')) byId('buyTienda').value = '';
    if(byId('buyResponsable')) byId('buyResponsable').value = '';
    if(typeof render === 'function') render();
  };

  renderCompras = function(){
    const wrap = byId('comprasList');
    if(!wrap) return;
    let rows = (typeof comprasForEvent === 'function' ? comprasForEvent() : []).filter(r => !(typeof isDonationTicket === 'function' && isDonationTicket(r.ticketDonacion))).slice();
    const sorts = {
      producto:(a,b)=> (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es') || String(a.ticketDonacion||'').localeCompare(String(b.ticketDonacion||''),'es'),
      ticket:(a,b)=> String(a.ticketDonacion||'').localeCompare(String(b.ticketDonacion||''),'es') || (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es'),
      tienda:(a,b)=> ((a.tienda?.nombre || '')).localeCompare((b.tienda?.nombre || ''),'es') || (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es'),
      responsable:(a,b)=> ((a.responsable?.nombre || '')).localeCompare((b.responsable?.nombre || ''),'es') || (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es'),
    };
    rows.sort(sorts[state.comprasSort] || sorts.producto);
    if(!rows.length){
      wrap.innerHTML = '<div class="empty">Todavía no hay compras u otros gastos para este evento.</div>';
      return;
    }
    const socios = allSocios();
    const tiendas = allTiendas();
    const productos = allProductos();
    wrap.innerHTML = '<div class="hint">Ordenar por: <a href="#" onclick="state.comprasSort=\'producto\'; renderCompras(); return false;">Producto</a> · <a href="#" onclick="state.comprasSort=\'ticket\'; renderCompras(); return false;">Ticket</a> · <a href="#" onclick="state.comprasSort=\'tienda\'; renderCompras(); return false;">Tienda</a> · <a href="#" onclick="state.comprasSort=\'responsable\'; renderCompras(); return false;">Responsable</a></div>';

    rows.forEach(r => {
      const pending = String(r.ticketDonacion || '').trim() === '';
      const row = document.createElement('div');
      row.className = 'itemcard' + (pending ? ' red-row' : '');
      row.innerHTML = `
        <div class="rowline compra">
          <div class="field"><label>Producto</label><select data-action="edit-compra-producto" data-id="${r.id}">${productos.map(p => `<option value="${p.id}" ${p.id===r.productoId?'selected':''}>${esc(p.nombre)}</option>`).join('')}</select></div>
          <div class="field"><label>Unidades</label><input type="number" min="0" step="0.01" value="${Number(r.unidades||0)}" data-action="edit-compra-unidades" data-id="${r.id}" /></div>
          <div class="field"><label>Precio</label><input class="money-text" type="text" value="${euro(r.precioCalc != null ? r.precioCalc : (r.producto?.precio || 0))}" data-action="edit-compra-precio" data-id="${r.id}" /></div>
          <div class="field"><label>Importe</label><input class="soft-readonly" readonly value="${moneyV(r.importe || 0)}" /></div>
          <div class="field"><label>Ticket u Otros gastos</label><select data-action="edit-compra-ticket" data-id="${r.id}">${PURCHASE_TICKET_OPTIONS.map(v => `<option value="${v}" ${v===r.ticketDonacion?'selected':''}>${v === '' ? '-- Pte.Compra u otros gastos --' : esc(v)}</option>`).join('')}</select></div>
          <div class="field"><label>Tienda</label><select data-action="edit-compra-tienda" data-id="${r.id}"><option value="" ${!r.tiendaId?'selected':''}>-- elige tienda --</option>${tiendas.map(t => `<option value="${t.id}" ${t.id===r.tiendaId?'selected':''}>${esc(t.nombre)}</option>`).join('')}</select></div>
          <div class="field"><label>Responsable</label><select data-action="edit-compra-responsable" data-id="${r.id}"><option value="" ${!r.responsableId?'selected':''}>-- sin responsable --</option>${socios.map(p => `<option value="${p.id}" ${p.id===r.responsableId?'selected':''}>${esc(p.nombre)}</option>`).join('')}</select></div>
          <div style="display:flex;gap:8px;align-items:end"><button type="button" class="modify small" data-action="save-compra" data-id="${r.id}">Modificar</button><button type="button" class="danger small" data-action="delete-compra" data-id="${r.id}">Eliminar</button></div>
        </div>`;
      wrap.appendChild(row);
    });
  };

  // Refresca visualmente cuando se abra la pestaña de compras o tras cargar
  const rerenderComprasIfVisible = () => {
    try{
      if(byId('tabCompras') && !byId('tabCompras').classList.contains('hidden')) renderCompras();
    }catch(_){}
  };
  document.addEventListener('click', function(e){
    const btn = e.target.closest('button');
    if(!btn) return;
    const action = btn.dataset.action || btn.id;
    if(action === 'tabComprasBtn' || action === 'btnAddCompra' || action === 'save-compra' || action === 'delete-compra'){
      setTimeout(rerenderComprasIfVisible, 0);
    }
  }, true);
  window.addEventListener('load', function(){
    try{ renderMainSelectors(); }catch(_){}
    setTimeout(rerenderComprasIfVisible, 0);
  });
})();

;/* ===== END legacy-inline-03.js ===== */


;/* ===== BEGIN legacy-inline-04.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #4. */
/* ==== FIX V14.3 DONACIONES EN POR TIENDA/TICKET ==== */
(function(){
  const donorNameFromRow = (c) => {
    try{
      const byDonorRef = (typeof donorLabel === 'function') ? donorLabel(c?.donorRef || '') : '';
      if(byDonorRef) return byDonorRef;
    }catch(_){}
    try{
      const byStore = (typeof tiendaById === 'function') ? (tiendaById(c?.tiendaId || '')?.nombre || '') : '';
      if(byStore) return byStore;
    }catch(_){}
    try{
      if(c?.tienda?.nombre) return c.tienda.nombre;
    }catch(_){}
    return '';
  };

  // 1) ComprasForEvent: para donaciones, si donorRef no existe pero hay tiendaId legado, usarlo.
  const prevComprasForEvent = (typeof comprasForEvent === 'function') ? comprasForEvent : null;
  if(prevComprasForEvent){
    comprasForEvent = function(){
      return state.compras
        .filter(c => c.eventId === state.selectedEventId)
        .map(c => {
          const productoBase = typeof productoById === 'function' ? (productoById(c.productoId) || {}) : {};
          const precio = Number(c.precio != null ? c.precio : ((productoBase.defaultPrecio ?? productoBase.precio) || 0));
          const unidades = Number(c.unidades || 0);
          const valor = precio * unidades;
          const donation = (typeof isDonationTicket === 'function') ? isDonationTicket(c.ticketDonacion) : false;
          const importe = donation ? 0 : valor;

          let tiendaObj;
          if(donation){
            const donorName = donorNameFromRow(c);
            tiendaObj = { id: c.donorRef || c.tiendaId || '', nombre: donorName };
          }else{
            tiendaObj = (typeof tiendaById === 'function' ? tiendaById(c.tiendaId || '') : null) || {id:'', nombre:''};
          }

          return {
            ...c,
            producto: {...productoBase, precio},
            tienda: tiendaObj,
            valor,
            importe,
            responsable: typeof personaById === 'function' ? personaById(c.responsableId || '') : null,
            donorLabel: donorNameFromRow(c)
          };
        });
    };
  }

  // 2) Resumen "Por tienda y Ticket": usar donante/tienda real en donaciones.
  summaryByTiendaTicket = function(){
    const filled = {};
    const pending = {};
    comprasForEvent().forEach(c => {
      const rawTicket = String(c.ticketDonacion || '').trim();
      const productName = String(c.producto?.nombre || '').trim();
      const donation = (typeof isDonationTicket === 'function') ? isDonationTicket(rawTicket) : false;

      let fuente = '';
      if(donation){
        fuente = c.donorLabel || donorNameFromRow(c);
      }else{
        fuente = c.tienda?.nombre || '';
      }
      const tienda = fuente || 'Sin Tienda';

      if(rawTicket === ''){
        const key = `${tienda} | Pte.Compra u otros gastos`;
        pending[key] = (pending[key] || 0) + Number(c.valor || 0);
        return;
      }

      const ticketLabel = rawTicket;
      const key = `${tienda} | ${ticketLabel}`;

      if(!filled[key]){
        filled[key] = {
          v: 0,
          donated: donation,
          rawTicket,
          products: []
        };
      }

      filled[key].v += Number(c.valor || 0);
      filled[key].donated = filled[key].donated || donation;
      if(donation && productName && !filled[key].products.includes(productName)){
        filled[key].products.push(productName);
      }
    });

    const rows = Object.entries(filled).map(([k,obj]) => {
      const label = obj.donated && obj.products.length
        ? `${k} · ${obj.products.join(' · ')}`
        : k;
      return {
        k,
        label,
        v: obj.v,
        pending: false,
        donated: obj.donated,
        attachable: !obj.donated && obj.rawTicket !== 'GASTOS CORRIENTES',
        image: (!obj.donated && obj.rawTicket !== 'GASTOS CORRIENTES' && obj.v > 0 && state.ticketImages?.[ticketImageStateKey(k)]) ? state.ticketImages[ticketImageStateKey(k)] : ''
      };
    }).concat(
      Object.entries(pending).map(([k,v]) => ({
        k,
        label: k,
        v,
        pending: true,
        donated: false,
        attachable: false,
        image: ''
      }))
    );

    const sortMode = state.summaryTiendaSort || 'tienda';
    rows.sort((a,b)=>{
      const [ta='',tk=''] = a.k.split(' | ');
      const [tb='',tl=''] = b.k.split(' | ');
      if(sortMode === 'ticket'){
        const c1 = tk.localeCompare(tl, 'es');
        return c1 !== 0 ? c1 : ta.localeCompare(tb, 'es');
      }
      const c2 = ta.localeCompare(tb, 'es');
      return c2 !== 0 ? c2 : tk.localeCompare(tl, 'es');
    });
    return rows;
  };

  // refresco inmediato si el resumen está visible
  const rerenderResumen = () => {
    try{
      if(typeof renderBudget === 'function') renderBudget();
    }catch(_){}
  };
  window.addEventListener('load', () => setTimeout(rerenderResumen, 0));
})();

;/* ===== END legacy-inline-04.js ===== */


;/* ===== BEGIN legacy-inline-05.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #5. */
/* ==== FIX V14.3 RESUMEN DONACIONES POR DONANTE ==== */
(function(){
  const donorNameFromAny = (c) => {
    try{
      if (c?.donorLabel) return c.donorLabel;
      if (typeof donorLabel === 'function' && c?.donorRef) {
        const d = donorLabel(c.donorRef);
        if (d) return d;
      }
      if (typeof tiendaById === 'function' && c?.tiendaId) {
        const t = tiendaById(c.tiendaId);
        if (t?.nombre) return t.nombre;
      }
      if (c?.tienda?.nombre) return c.tienda.nombre;
    }catch(_){}
    return '';
  };

  summaryByTiendaTicket = function(){
    const rows = [];
    const pendingMap = {};
    const normalMap = {};

    comprasForEvent().forEach(c => {
      const rawTicket = String(c.ticketDonacion || '').trim();
      const productName = String(c.producto?.nombre || '').trim() || 'Producto';
      const donation = (typeof isDonationTicket === 'function') ? isDonationTicket(rawTicket) : false;

      let fuente = '';
      if(donation){
        fuente = donorNameFromAny(c);
      }else{
        fuente = c.tienda?.nombre || '';
      }
      const tienda = fuente || 'Sin Tienda';

      if(rawTicket === ''){
        const key = `${tienda} | Pte.Compra u otros gastos`;
        pendingMap[key] = (pendingMap[key] || 0) + Number(c.valor || 0);
        return;
      }

      if(donation){
        // Una línea por donación realizada, evitando la megacadena de productos.
        const key = `${tienda} | ${rawTicket} | ${productName} | ${c.id}`;
        rows.push({
          k: key,
          label: `${tienda} | ${rawTicket} | ${productName}`,
          v: Number(c.valor || 0),
          pending: false,
          donated: true,
          attachable: false,
          image: ''
        });
        return;
      }

      // Compras / gastos corrientes agrupados por tienda + ticket
      const key = `${tienda} | ${rawTicket}`;
      if(!normalMap[key]){
        normalMap[key] = {
          k: key,
          label: key,
          v: 0,
          pending: false,
          donated: false,
          rawTicket,
          attachable: rawTicket !== 'GASTOS CORRIENTES',
          image: ''
        };
      }
      normalMap[key].v += Number(c.valor || 0);
      if(normalMap[key].attachable && state.ticketImages?.[ticketImageStateKey(key)]){
        normalMap[key].image = state.ticketImages[ticketImageStateKey(key)];
      }
    });

    const merged = rows
      .concat(Object.values(normalMap))
      .concat(Object.entries(pendingMap).map(([k,v]) => ({
        k,
        label: k,
        v,
        pending: true,
        donated: false,
        attachable: false,
        image: ''
      })));

    const sortMode = state.summaryTiendaSort || 'tienda';
    merged.sort((a,b)=>{
      const pa = String(a.label || a.k).split(' | ');
      const pb = String(b.label || b.k).split(' | ');
      const ta = pa[0] || '';
      const tb = pb[0] || '';
      const ka = pa[1] || '';
      const kb = pb[1] || '';
      if(sortMode === 'ticket'){
        const c1 = ka.localeCompare(kb, 'es');
        return c1 !== 0 ? c1 : ta.localeCompare(tb, 'es');
      }
      const c2 = ta.localeCompare(tb, 'es');
      return c2 !== 0 ? c2 : ka.localeCompare(kb, 'es');
    });

    return merged;
  };

  window.addEventListener('load', () => {
    try{
      if(typeof renderBudget === 'function') renderBudget();
    }catch(_){}
  });
})();

;/* ===== END legacy-inline-05.js ===== */


;/* ===== BEGIN legacy-inline-06.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #6. */
/* ==== V14.4 FIX AGRUPACIÓN TIENDA/TICKET/DONACIÓN ==== */
(function(){
  function donorGroupingName(c){
    try{
      if(c?.donorLabel) return c.donorLabel;
      if(typeof donorLabel === 'function' && c?.donorRef){
        const d = donorLabel(c.donorRef);
        if(d) return d;
      }
      if(typeof tiendaById === 'function' && c?.tiendaId){
        const t = tiendaById(c.tiendaId);
        if(t?.nombre) return t.nombre;
      }
      if(c?.tienda?.nombre) return c.tienda.nombre;
    }catch(_){}
    return '';
  }

  summaryByTiendaTicket = function(){
    const filled = {};
    const pending = {};

    comprasForEvent().forEach(c => {
      const donated = isDonationTicket(c.ticketDonacion);
      const holder = donated
        ? (donorGroupingName(c) || 'Sin Tienda')
        : (c.tienda?.nombre || 'Sin Tienda');

      const rawTicket = String(c.ticketDonacion || '').trim();
      const productName = String(c.producto?.nombre || '').trim();
      const key = `${holder} | ${rawTicket || 'Pte.Compra u otros gastos'}`;

      if(rawTicket === ''){
        pending[key] = (pending[key] || 0) + Number(c.valor || 0);
        return;
      }

      if(!filled[key]){
        filled[key] = {
          v: 0,
          donated,
          rawTicket,
          holder,
          products: []
        };
      }

      filled[key].v += Number(c.valor || 0);
      filled[key].donated = filled[key].donated || donated;

      if(donated && productName && !filled[key].products.includes(productName)){
        filled[key].products.push(productName);
      }
    });

    const rows = Object.entries(filled).map(([k,obj]) => {
      const label = obj.donated && obj.products.length
        ? `${k} · ${obj.products.join(' · ')}`
        : k;

      return {
        k,
        label,
        v: obj.v,
        pending: false,
        donated: obj.donated,
        attachable: !obj.donated && obj.rawTicket !== 'GASTOS CORRIENTES',
        image: (!obj.donated && obj.rawTicket !== 'GASTOS CORRIENTES' && obj.v > 0 && state.ticketImages?.[ticketImageStateKey(k)])
          ? state.ticketImages[ticketImageStateKey(k)]
          : ''
      };
    }).concat(
      Object.entries(pending).map(([k,v]) => ({
        k,
        label: k,
        v,
        pending: true,
        donated: false,
        attachable: false,
        image: ''
      }))
    );

    const sortMode = state.summaryTiendaSort || 'tienda';
    rows.sort((a,b)=>{
      const [ta='',tk=''] = a.k.split(' | ');
      const [tb='',tl=''] = b.k.split(' | ');

      if(sortMode === 'ticket'){
        const s1 = tk.localeCompare(tl,'es');
        if(s1 !== 0) return s1;
        return ta.localeCompare(tb,'es');
      }

      const s1 = ta.localeCompare(tb,'es');
      if(s1 !== 0) return s1;
      return tk.localeCompare(tl,'es');
    });

    return rows;
  };

  window.addEventListener('load', () => {
    try{
      if(typeof renderBudget === 'function') renderBudget();
    }catch(_){}
  });
})();

;/* ===== END legacy-inline-06.js ===== */


;/* ===== BEGIN legacy-inline-07.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #7. */
/* ==== V14.4 CORRECCIÓN FINAL AGRUPACIÓN TIENDA/TICKET ==== */
(function(){
  function holderNameForRow(c){
    try{
      const donated = (typeof isDonationTicket === 'function') ? isDonationTicket(c.ticketDonacion) : false;
      if(donated){
        if(c?.donorLabel) return c.donorLabel;
        if(typeof donorLabel === 'function' && c?.donorRef){
          const d = donorLabel(c.donorRef);
          if(d) return d;
        }
      }
      if(typeof tiendaById === 'function' && c?.tiendaId){
        const t = tiendaById(c.tiendaId);
        if(t?.nombre) return t.nombre;
      }
      if(c?.tienda?.nombre) return c.tienda.nombre;
    }catch(_){}
    return '';
  }

  // Restaurar la lógica buena de v13.2 y solo cambiar "holder" para donaciones
  summaryByTiendaTicket = function(){
    const filled = {};
    const pending = {};

    comprasForEvent().forEach(c => {
      const holder = holderNameForRow(c) || 'Sin tienda';
      const rawTicket = String(c.ticketDonacion || '').trim();
      const productName = String(c.producto?.nombre || '').trim();
      const displayTicket = (Number(c.valor || 0) === 0 && productName)
        ? productName
        : (rawTicket || 'Pte.Compra u otros gastos');
      const key = `${holder} | ${displayTicket}`;

      if(rawTicket === ''){
        pending[key] = (pending[key] || 0) + Number(c.valor || 0);
      } else {
        const donated = (typeof isDonationTicket === 'function') ? isDonationTicket(c.ticketDonacion) : false;
        if(!filled[key]) filled[key] = {v:0, donated, rawTicket, holder};
        filled[key].v += Number(c.valor || 0);
        filled[key].donated = filled[key].donated || donated;
      }
    });

    const rows = Object.entries(filled).map(([k,obj])=>({
      k,
      v:obj.v,
      pending:false,
      donated:obj.donated,
      image:(!obj.donated && obj.v>0 && state.ticketImages?.[ticketImageStateKey(k)])
        ? state.ticketImages[ticketImageStateKey(k)]
        : ''
    })).concat(
      Object.entries(pending).map(([k,v])=>({
        k, v, pending:true, donated:false, image:''
      }))
    );

    const sortMode = state.summaryTiendaSort || 'tienda';
    rows.sort((a,b)=>{
      const [ta='',tk=''] = a.k.split(' | ');
      const [tb='',tl=''] = b.k.split(' | ');
      if(sortMode === 'ticket'){
        const s1 = tk.localeCompare(tl,'es');
        if(s1 !== 0) return s1;
        return ta.localeCompare(tb,'es');
      }
      const s1 = ta.localeCompare(tb,'es');
      if(s1 !== 0) return s1;
      return tk.localeCompare(tl,'es');
    });
    return rows;
  };

  window.addEventListener('load', () => {
    try{
      if(typeof renderBudget === 'function') renderBudget();
    }catch(_){}
  });
})();

;/* ===== END legacy-inline-07.js ===== */


;/* ===== BEGIN legacy-inline-08.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #8. */
/* ==== V14.4 CORRECCIÓN 2 DONANTE REAL EN AGRUPACIÓN ==== */
(function(){
  function holderNameForRowV2(c){
    try{
      const donated = (typeof isDonationTicket === 'function') ? isDonationTicket(c.ticketDonacion) : false;

      if(donated){
        if(c?.donorLabel && String(c.donorLabel).trim()) return String(c.donorLabel).trim();

        if(c?.donorRef && String(c.donorRef).trim()){
          const raw = String(c.donorRef).trim();

          // Si viene ya grabado como texto libre, usarlo tal cual
          if(!raw.startsWith('P:') && !raw.startsWith('T:')) return raw;

          if(typeof donorLabel === 'function'){
            const resolved = donorLabel(raw);
            if(resolved && String(resolved).trim()) return String(resolved).trim();
          }
        }

        // Compatibilidad con datos antiguos donde el donante quedó en tiendaId
        if(c?.tiendaId && typeof tiendaById === 'function'){
          const t = tiendaById(c.tiendaId);
          if(t?.nombre && String(t.nombre).trim()) return String(t.nombre).trim();
        }
      }

      if(c?.tienda?.nombre && String(c.tienda.nombre).trim()) return String(c.tienda.nombre).trim();

      if(c?.tiendaId && typeof tiendaById === 'function'){
        const t = tiendaById(c.tiendaId);
        if(t?.nombre && String(t.nombre).trim()) return String(t.nombre).trim();
      }
    }catch(_){}
    return '';
  }

  summaryByTiendaTicket = function(){
    const filled = {};
    const pending = {};

    comprasForEvent().forEach(c => {
      const holder = holderNameForRowV2(c) || 'Sin tienda';
      const rawTicket = String(c.ticketDonacion || '').trim();
      const productName = String(c.producto?.nombre || '').trim();
      const displayTicket = (Number(c.valor || 0) === 0 && productName)
        ? productName
        : (rawTicket || 'Pte.Compra u otros gastos');
      const key = `${holder} | ${displayTicket}`;

      if(rawTicket === ''){
        pending[key] = (pending[key] || 0) + Number(c.valor || 0);
      } else {
        const donated = (typeof isDonationTicket === 'function') ? isDonationTicket(c.ticketDonacion) : false;
        if(!filled[key]) filled[key] = {v:0, donated, rawTicket, holder};
        filled[key].v += Number(c.valor || 0);
        filled[key].donated = filled[key].donated || donated;
      }
    });

    const rows = Object.entries(filled).map(([k,obj])=>({
      k, v:obj.v, pending:false, donated:obj.donated,
      image:(!obj.donated && obj.v>0 && state.ticketImages?.[ticketImageStateKey(k)]) ? state.ticketImages[ticketImageStateKey(k)] : ''
    })).concat(
      Object.entries(pending).map(([k,v])=>({k,v,pending:true,donated:false,image:''}))
    );

    const sortMode = state.summaryTiendaSort || 'tienda';
    rows.sort((a,b)=>{
      const [ta='',tk=''] = a.k.split(' | ');
      const [tb='',tl=''] = b.k.split(' | ');
      if(sortMode === 'ticket'){
        const s1 = tk.localeCompare(tl,'es');
        if(s1 !== 0) return s1;
        return ta.localeCompare(tb,'es');
      }
      const s1 = ta.localeCompare(tb,'es');
      if(s1 !== 0) return s1;
      return tk.localeCompare(tl,'es');
    });
    return rows;
  };

  window.addEventListener('load', () => {
    try{
      if(typeof renderBudget === 'function') renderBudget();
    }catch(_){}
  });
})();

;/* ===== END legacy-inline-08.js ===== */


;/* ===== BEGIN legacy-inline-09.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #9. */
/* ==== V15.0 FILTRO TKxx EN AGR.TIENDA-TICKET ==== */
(function(){
  const prevSummaryByTiendaTicket = typeof summaryByTiendaTicket === 'function' ? summaryByTiendaTicket : null;

  function isTKTicketLabel(label){
    return /^TK\d+/i.test(String(label || '').trim());
  }

  summaryByTiendaTicket = function(){
    const rows = prevSummaryByTiendaTicket ? prevSummaryByTiendaTicket() : [];
    return rows.filter(r => {
      const parts = String(r.k || '').split(' | ');
      const ticket = (parts[1] || '').trim();
      return isTKTicketLabel(ticket);
    });
  };

  window.addEventListener('load', () => {
    try{
      if(typeof renderBudget === 'function') renderBudget();
    }catch(_){}
  });
})();

;/* ===== END legacy-inline-09.js ===== */


;/* ===== BEGIN legacy-inline-10.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #10. */
/* ==== V15.1 AJUSTES ==== */
(function(){
  function allPersonasSorted(){
    return (typeof personasGenerales === 'function' ? personasGenerales() : (state.personas || []))
      .slice()
      .sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
  }

  const prevRenderMainSelectors = typeof renderMainSelectors === 'function' ? renderMainSelectors : null;
  renderMainSelectors = function(){
    if(prevRenderMainSelectors) prevRenderMainSelectors();

    const personas = allPersonasSorted();

    const collabPersona = document.getElementById('collabPersona');
    if(collabPersona){
      collabPersona.innerHTML =
        '<option value="" selected>Busca colaborador/a.....</option>' +
        personas.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)} (${escapeHtml(p.rango)})</option>`).join('');
    }
  };

  renderColabs = function(){
    const wrap = document.getElementById('collabList');
    const rows = collabsForEvent();
    const personas = allPersonasSorted();

    if(!rows.length){
      wrap.innerHTML = '<div class="empty">Todavía no hay personas colaboradoras para este evento.</div>';
      return;
    }

    wrap.innerHTML = '';
    rows.forEach(r => {
      const row = document.createElement('div');
      row.className = 'itemcard';
      if(r.situacion === 'Pendiente') row.classList.add('red-row');
      row.innerHTML = `
        <div class="rowline collab">
          <div class="field">
            <label>Colaborador/a</label>
            <select data-action="edit-collab-persona" data-id="${r.id}">
              ${personas.map(p => `<option value="${p.id}" ${p.id===r.personaId?'selected':''}>${escapeHtml(p.nombre)} (${escapeHtml(p.rango)})</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Número</label>
            <input type="number" min="0" step="1" value="${Number(r.numero||0)}" data-action="edit-collab-numero" data-id="${r.id}" />
          </div>
          <div class="field">
            <label>Ingreso</label>
            <select data-action="edit-collab-situacion" data-id="${r.id}">
              ${PAYMENT_OPTIONS.map(v => `<option value="${v}" ${v===r.situacion?'selected':''}>${v}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Importe obligatorio</label>
            <input class="soft-readonly" readonly value="${money(r.base)}" />
          </div>
          <div class="field">
            <label>Importe voluntario</label>
            <input class="money-text" type="text" value="${euroInputValue(r.importe||0)}" data-action="edit-collab-importe" data-id="${r.id}" />
          </div>
          <div style="display:flex;gap:8px;align-items:end">
            <button type="button" class="modify small" data-action="save-collab" data-id="${r.id}">Modificar</button>
            <button type="button" class="danger small" data-action="delete-collab" data-id="${r.id}">Eliminar</button>
          </div>
        </div>
      `;
      wrap.appendChild(row);
    });
  };

  renderSummaryList = function(targetId, rows){
    const wrap = document.getElementById(targetId);
    wrap.innerHTML = '';

    if(targetId === 'summaryTiendaTicket'){
      const tools = document.createElement('div');
      tools.className = 'hint';
      tools.innerHTML = 'Ordenar por: <a href="#" onclick="state.summaryTiendaSort=\'tienda\'; renderBudget(); return false;">Tienda</a> · <a href="#" onclick="state.summaryTiendaSort=\'ticket\'; renderBudget(); return false;">Ticket</a>';
      wrap.appendChild(tools);
    }

    if(!rows.length){
      const empty = document.createElement('div');
      empty.className = 'hint';
      empty.textContent = 'Sin datos.';
      wrap.appendChild(empty);
      return;
    }

    let total = 0;
    rows.forEach((r, idx) => {
      total += Number(r.v || 0);
      const div = document.createElement('div');
      div.className = 'summary-item';
      if(r.pending) div.classList.add('red-row');

      const amountHtml = `<span class="pill"${r.pending ? ' style="background:#fef2f2;color:#b91c1c"' : (r.donated ? ' style="text-decoration:line-through"' : '')}>${money(r.v)}</span>`;
      const textLabel = r.label || r.k;

      if(targetId === 'summaryTiendaTicket' && !r.pending && r.attachable){
        const inputId = `ticketUpload_${idx}`;
        const encodedKey = encodeURIComponent(r.k);
        const preview = r.image ? `<img class="ticket-thumb" src="${r.image}" alt="ticket" />` : '';
        div.innerHTML = `<span>${escapeHtml(textLabel)}</span><span style="display:flex;align-items:center;gap:8px;">${amountHtml}<span class="ticket-actions"><button type="button" class="outline small" onclick="document.getElementById('${inputId}').click()">📎</button><input id="${inputId}" class="ticket-file-input" type="file" accept="image/*" onchange="uploadTicketImage(event, '${encodedKey}')">${preview}${r.image ? `<button type="button" class="outline small" onclick="removeTicketImage('${encodedKey}')">🗑️</button>` : ''}</span></span>`;
      } else {
        div.innerHTML = `<span>${escapeHtml(textLabel)}</span>${amountHtml}`;
      }
      wrap.appendChild(div);

      if((targetId === 'summarySegmento' || targetId === 'summaryDestino') && idx % 2 === 1 && idx < rows.length - 1){
        const sep = document.createElement('div');
        sep.className = 'separator';
        sep.style.margin = '8px 0';
        wrap.appendChild(sep);
      }
    });

    const totalDiv = document.createElement('div');
    totalDiv.className = 'summary-item';
    totalDiv.style.fontWeight = '800';
    totalDiv.innerHTML = `<span>TOTAL</span><span class="pill">${money(total)}</span>`;
    wrap.appendChild(totalDiv);
  };

  window.addEventListener('load', () => {
    try{ render(); }catch(_){}
  });
})();

;/* ===== END legacy-inline-10.js ===== */


;/* ===== BEGIN legacy-inline-11.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #11. */
/* ==== V15.2 EXCEL GRAFICAS + NOMBRE FICHERO ==== */
(function(){
  function filenameV152(ev){
    const title = String(ev?.titulo || 'evento')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/[^A-Za-z0-9]+/g,'_')
      .replace(/^_+|_+$/g,'')
      .replace(/_+/g,'_') || 'evento';
    const now = new Date();
    const dd = String(now.getDate()).padStart(2,'0');
    const mm = String(now.getMonth()+1).padStart(2,'0');
    const yyyy = String(now.getFullYear());
    return `ControlEvent_v28_10_INFOEVENTO-${title}_${yyyy}${mm}${dd}.xlsx`;
  }

  exportExcel = async function(){
    if(typeof isLocked === 'function' && isLocked() && typeof isGodRole === 'function' && !isGodRole()) return;
    const ev = typeof selectedEvent === 'function' ? selectedEvent() : null;
    if(!ev) return;

    try{
      await ensureExcelJS();
    }catch(err){
      alert('No se pudo cargar el motor de Excel. Coloca exceljs.min.js en la carpeta vendor o usa conexión a internet.');
      return;
    }

    if(typeof ensureProductRefPrices === 'function') ensureProductRefPrices();

    const collabs = typeof collabsForEvent === 'function' ? collabsForEvent() : [];
    const compras = typeof comprasForEvent === 'function' ? comprasForEvent() : [];
    const comprasSolo = compras.filter(x => !(typeof isDonationTicket === 'function' && isDonationTicket(x.ticketDonacion)));
    const donacionesSolo = compras.filter(x => (typeof isDonationTicket === 'function' && isDonationTicket(x.ticketDonacion)));
    const budget = typeof budgetSummary === 'function' ? budgetSummary() : {};
    const segRows = typeof summaryBySegmento === 'function' ? summaryBySegmento() : [];
    const destRows = typeof summaryByDestino === 'function' ? summaryByDestino() : [];
    const tiendaRows = typeof summaryByTiendaTicket === 'function' ? summaryByTiendaTicket() : [];

    const wb = new ExcelJS.Workbook();
    wb.creator = 'ControlEvent v28.10 - ©oltyLAB ’26';
    wb.created = new Date();

    const border = {top:{style:'thin', color:{argb:'FFDDE2EA'}},left:{style:'thin', color:{argb:'FFDDE2EA'}},bottom:{style:'thin', color:{argb:'FFDDE2EA'}},right:{style:'thin', color:{argb:'FFDDE2EA'}}};
    const fills = { title:'FF111827', ok:'FFECFDF5', bad:'FFFEF2F2', warn:'FFFFF7ED', white:'FFFFFFFF' };
    const moneyFmt = '#,##0.00 [$€-C0A]';
    const numFmt = '0.00';

    function baseSheet(name, widths){
      const ws = wb.addWorksheet(name);
      ws.properties.defaultRowHeight = 20;
      ws.columns = widths.map(w => ({width:w}));
      return ws;
    }
    function paint(cell, fill='white'){
      cell.border = border;
      cell.alignment = {vertical:'middle', wrapText:true};
      if(fill && fills[fill]){
        cell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:fills[fill]}};
      }
    }
    function titleRow(ws, rowNum, headers){
      headers.forEach((h, i) => {
        const c = ws.getCell(rowNum, i+1);
        c.value = h;
        c.font = {bold:true, color:{argb:'FFFFFFFF'}};
        c.fill = {type:'pattern', pattern:'solid', fgColor:{argb:fills.title}};
        c.border = border;
        c.alignment = {vertical:'middle', horizontal:'center'};
      });
      ws.getRow(rowNum).height = 20;
    }
    function putText(ws, r, c, v, fill='white'){
      const cell = ws.getCell(r,c);
      cell.value = v == null ? '' : String(v);
      paint(cell, fill);
      return cell;
    }
    function putNum(ws, r, c, v, fill='white'){
      const cell = ws.getCell(r,c);
      cell.value = Number(v || 0);
      cell.numFmt = numFmt;
      paint(cell, fill);
      return cell;
    }
    function putMoney(ws, r, c, v, fill='white'){
      const cell = ws.getCell(r,c);
      cell.value = Number(v || 0);
      cell.numFmt = moneyFmt;
      paint(cell, fill);
      return cell;
    }
    function mergeTitle(ws, row, text, cols){
      ws.mergeCells(row,1,row,cols);
      const cell = ws.getCell(row,1);
      cell.value = text;
      cell.font = {bold:true, color:{argb:'FFFFFFFF'}};
      cell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:fills.title}};
      cell.border = border;
      cell.alignment = {vertical:'middle', horizontal:'center'};
      ws.getRow(row).height = 20;
    }
    function addImageToSheet(ws, dataUrl, row, col, width=1050, height=620){
      if(!dataUrl) return;
      const m = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
      if(!m) return;
      const mime = m[1];
      const ext = mime.includes('png') ? 'png' : 'jpeg';
      const id = wb.addImage({base64:dataUrl, extension:ext});
      ws.addImage(id, { tl: {col: col-1 + 0.05, row: row-1 + 0.05}, ext: {width, height} });
      ws.getRow(row).height = Math.ceil(height * 0.75 / 20) * 20;
    }

    // RESUMEN
    const wsRes = baseSheet('RESUMEN', [32,18,18,18,18]);
    mergeTitle(wsRes, 1, 'RESUMEN DEL EVENTO', 5);
    putText(wsRes, 2, 1, 'Título del evento'); putText(wsRes, 2, 2, ev.titulo || '');
    putText(wsRes, 3, 1, 'Descripción del evento'); wsRes.mergeCells(3,2,3,5); putText(wsRes, 3, 2, ev.descripcion || '');
    putText(wsRes, 4, 1, 'Fecha inicio'); putText(wsRes, 4, 2, ev.fechaIni || '');
    putText(wsRes, 4, 3, 'Fecha fin'); putText(wsRes, 4, 4, ev.fechaFin || '');
    putText(wsRes, 5, 1, 'Precio evento'); putMoney(wsRes, 5, 2, ev.precio || 0);
    putText(wsRes, 7, 1, 'Ingreso dinero'); putMoney(wsRes, 7, 2, budget.ingresosDinero?.totalIngresado || 0);
    putText(wsRes, 8, 1, 'Ingreso comprometido'); putMoney(wsRes, 8, 2, budget.ingresosDinero?.totalComprometido || 0);
    putText(wsRes, 9, 1, 'Donación de producto'); putMoney(wsRes, 9, 2, budget.donacionProducto?.valorDonado || 0);
    putText(wsRes, 10, 1, 'Gasto por compras'); putMoney(wsRes, 10, 2, budget.operativa?.gastoCompras || 0);
    putText(wsRes, 11, 1, 'Gastos de organización'); putMoney(wsRes, 11, 2, budget.operativa?.gastosOrganizacion || 0);
    putText(wsRes, 12, 1, 'Pendiente de compra'); putMoney(wsRes, 12, 2, budget.operativa?.pendiente || 0);
    putText(wsRes, 13, 1, 'Saldo operativo'); putMoney(wsRes, 13, 2, budget.operativa?.saldoOperativo || 0);

    // INGRESOS
    const wsIng = baseSheet('INGRESOS', [28,10,16,16,16,16]);
    mergeTitle(wsIng, 1, 'INGRESOS', 6);
    titleRow(wsIng, 3, ['Colaborador/a','Número','Tipo ingreso','Importe SOCIO','Importe NO SOCIO','TOTAL']);
    let r = 4;
    collabs.forEach(item => {
      putText(wsIng, r, 1, item.persona?.nombre || '');
      putNum(wsIng, r, 2, item.numero || 0);
      putText(wsIng, r, 3, item.situacion || '');
      putMoney(wsIng, r, 4, item.base || 0);
      putMoney(wsIng, r, 5, item.donation || item.importe || 0);
      putMoney(wsIng, r, 6, item.total || 0, item.situacion === 'Pendiente' ? 'warn' : 'white');
      r += 1;
    });

    // COMPRAS Y OTROS GASTOS
    const wsCom = baseSheet('COMPRAS Y OTROS GASTOS', [30,12,16,16,26,28,28]);
    mergeTitle(wsCom, 1, 'COMPRAS Y OTROS GASTOS', 7);
    titleRow(wsCom, 3, ['Producto','Unidades','Precio','Importe','Ticket u Otros gastos','Tienda','Responsable']);
    r = 4;
    comprasSolo.forEach(item => {
      putText(wsCom, r, 1, item.producto?.nombre || '');
      putNum(wsCom, r, 2, item.unidades || 0);
      putMoney(wsCom, r, 3, item.precioCalc != null ? item.precioCalc : (item.producto?.precio || 0));
      putMoney(wsCom, r, 4, item.valor || 0, String(item.ticketDonacion||'').trim()==='' ? 'warn' : 'white');
      putText(wsCom, r, 5, item.ticketDonacion || '');
      putText(wsCom, r, 6, item.tienda?.nombre || '');
      putText(wsCom, r, 7, item.responsable?.nombre || '');
      r += 1;
    });

    // DONACIONES
    const wsDon = baseSheet('DONACIONES DE PRODUCTO', [26,10,14,14,20,24,24]);
    mergeTitle(wsDon, 1, 'DONACIONES DE PRODUCTO', 7);
    titleRow(wsDon, 3, ['Producto','Unidades','Precio','Valor','Tipo de donación','Donante','Responsable']);
    r = 4;
    donacionesSolo.forEach(item => {
      putText(wsDon, r, 1, item.producto?.nombre || '');
      putNum(wsDon, r, 2, item.unidades || 0);
      putMoney(wsDon, r, 3, item.precioCalc != null ? item.precioCalc : (item.producto?.precio || 0));
      putMoney(wsDon, r, 4, item.valor || 0, item.valor === 0 ? 'warn' : 'white');
      putText(wsDon, r, 5, item.ticketDonacion || '');
      putText(wsDon, r, 6, item.donorLabel || item.tienda?.nombre || '');
      putText(wsDon, r, 7, item.responsable?.nombre || '');
      r += 1;
    });

    // CALCULOS
    const wsSeg = baseSheet('CALCULOS_SEGMENTO', [42,18]);
    mergeTitle(wsSeg, 1, 'CÁLCULOS POR AGRUPACIÓN - SEGMENTO', 2);
    titleRow(wsSeg, 3, ['Concepto','Importe']);
    r = 4;
    segRows.forEach(it => {
      putText(wsSeg, r, 1, it.label || it.k || '', it.pending ? 'warn' : 'white');
      putMoney(wsSeg, r, 2, it.v, it.pending ? 'warn' : 'white');
      r += 1;
    });

    const wsDest = baseSheet('CALCULOS_DESTINO', [42,18]);
    mergeTitle(wsDest, 1, 'CÁLCULOS POR AGRUPACIÓN - DESTINO', 2);
    titleRow(wsDest, 3, ['Concepto','Importe']);
    r = 4;
    destRows.forEach(it => {
      putText(wsDest, r, 1, it.label || it.k || '', it.pending ? 'warn' : 'white');
      putMoney(wsDest, r, 2, it.v, it.pending ? 'warn' : 'white');
      r += 1;
    });

    const wsTienda = baseSheet('CALCULOS_TIENDA_TICKET', [48,18]);
    mergeTitle(wsTienda, 1, 'CÁLCULOS POR AGRUPACIÓN - TIENDA Y TICKET', 2);
    titleRow(wsTienda, 3, ['Concepto','Importe']);
    r = 4;
    tiendaRows.forEach(it => {
      putText(wsTienda, r, 1, it.label || it.k || '', it.pending ? 'warn' : 'white');
      putMoney(wsTienda, r, 2, it.v, it.pending ? 'warn' : 'white');
      r += 1;
    });

    // GRAFICAS: EXACTAMENTE como pantalla (imagen con leyenda/desglose)
    const wsGraf = baseSheet('GRAFICAS', [24,24,24,24]);
    mergeTitle(wsGraf, 1, 'GRÁFICAS DEL EVENTO', 4);
    const chartDataUrl = (typeof makeChartImageDataUrl === 'function')
      ? await makeChartImageDataUrl()
      : ((typeof makeChartDataUrl === 'function') ? await makeChartDataUrl() : null);
    addImageToSheet(wsGraf, chartDataUrl, 3, 1, 1050, 620);

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filenameV152(ev);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  window.xlsxFilename = filenameV152;
})();

;/* ===== END legacy-inline-11.js ===== */


;/* ===== BEGIN legacy-inline-12.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #12. */
/* ==== V15.3: GRAFICAS EXCEL + NOMBRE DESCARGA + PRECIO COMPRAS ==== */
(function(){
  const $ = (id) => document.getElementById(id);
  const esc = (v) => typeof escapeHtml === 'function' ? escapeHtml(v) : String(v ?? '');
  const moneyTxt = (v) => typeof moneyText === 'function' ? moneyText(v) : (typeof moneyTextV === 'function' ? moneyTextV(v) : (typeof money === 'function' ? money(v) : String(v)));
  const euroTxt = (v) => typeof euroInputValue === 'function' ? euroInputValue(v) : moneyTxt(v);
  const parseEuro = (v) => typeof parseEuroInput === 'function' ? parseEuroInput(v) : Number(v || 0);

  function filenameV153(ev){
    const title = String(ev?.titulo || 'evento')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/[^A-Za-z0-9]+/g,'_')
      .replace(/^_+|_+$/g,'')
      .replace(/_+/g,'_') || 'evento';
    const now = new Date();
    const dd = String(now.getDate()).padStart(2,'0');
    const mm = String(now.getMonth()+1).padStart(2,'0');
    const yyyy = String(now.getFullYear());
    return `ControlEvent_v28_10_INFOEVENTO-${title}_${yyyy}${mm}${dd}.xlsx`;
  }
  window.xlsxFilename = filenameV153;

  // Nombre del archivo de descarga de datos con versión correcta
  const prevExportSeedWorkbook = typeof exportSeedWorkbook === 'function' ? exportSeedWorkbook : null;
  if(prevExportSeedWorkbook){
    exportSeedWorkbook = async function(){
      if(typeof isLocked === 'function' && isLocked()) return;
      try{
        await ensureExcelJS();
      }catch(err){
        alert('No se pudo cargar el motor de Excel. Coloca exceljs.min.js en la carpeta vendor o usa conexión a internet.');
        return;
      }
      const wb = new ExcelJS.Workbook();
      wb.creator = 'ControlEvent v28.10 - ©oltyLAB ’26';
      wb.created = new Date();

      const border = {top:{style:'thin', color:{argb:'FFDDE2EA'}},left:{style:'thin', color:{argb:'FFDDE2EA'}},bottom:{style:'thin', color:{argb:'FFDDE2EA'}},right:{style:'thin', color:{argb:'FFDDE2EA'}}};
      const headFill = {type:'pattern', pattern:'solid', fgColor:{argb:'FF111827'}};

      function makeSheet(name, headers, rows){
        const ws = wb.addWorksheet(name);
        ws.columns = headers.map(h => ({width: Math.max(14, String(h).length + 2)}));
        headers.forEach((h, i) => {
          const c = ws.getCell(1, i+1);
          c.value = h;
          c.font = {bold:true, color:{argb:'FFFFFFFF'}};
          c.fill = headFill;
          c.border = border;
          c.alignment = {horizontal:'center', vertical:'middle'};
        });
        let r = 2;
        rows.forEach(row => {
          row.forEach((v, i) => {
            const c = ws.getCell(r, i+1);
            c.value = v == null ? '' : v;
            c.border = border;
          });
          r += 1;
        });
      }

      const personasRows = (state.personas || []).map(p => [p.id, p.nombre || '', p.rango || '']);
      const eventosRows = (state.eventos || []).map(e => [e.id, e.titulo || '', e.precio || 0, e.fechaIni || '', e.fechaFin || '', e.descripcion || '', e.situacion || '']);
      const tiendasRows = (state.tiendas || []).map(t => [t.id, t.nombre || '']);
      const productosRows = (state.productos || []).map(p => [p.id, p.nombre || '', p.segmento || '', p.destino || '', Number((p.defaultPrecio ?? p.precio) || 0)]);
      const ingresosRows = (state.colaboradores || []).map(c => [c.id, c.eventId || '', c.personaId || '', c.numero || 0, c.situacion || '', c.importe || 0]);
      const comprasRows = (state.compras || []).filter(c => !(typeof isDonationTicket === 'function' && isDonationTicket(c.ticketDonacion))).map(c => [c.id, c.eventId || '', c.productoId || '', c.unidades || 0, c.precio || 0, c.ticketDonacion || '', c.tiendaId || '', c.responsableId || '']);
      const donacionesRows = (state.compras || []).filter(c => (typeof isDonationTicket === 'function' && isDonationTicket(c.ticketDonacion))).map(c => [c.id, c.eventId || '', c.productoId || '', c.unidades || 0, c.precio || 0, c.ticketDonacion || '', c.donorRef || '', c.responsableId || '']);
      const ticketRows = Object.entries(state.ticketImages || {}).map(([k,v]) => [k, v]);

      makeSheet('PERSONAS', ['ID','NOMBRE','RANGO'], personasRows);
      makeSheet('EVENTOS', ['ID','TITULO','PRECIO','FECHA_INI','FECHA_FIN','DESCRIPCION','SITUACION'], eventosRows);
      makeSheet('TIENDAS', ['ID','NOMBRE'], tiendasRows);
      makeSheet('PRODUCTOS', ['ID','NOMBRE','SEGMENTO','DESTINO','PRECIO_REFERENCIA'], productosRows);
      makeSheet('INGRESOS', ['ID','EVENTO_ID','PERSONA_ID','NUMERO','TIPO_INGRESO','IMPORTE_VOLUNTARIO'], ingresosRows);
      makeSheet('COMPRAS', ['ID','EVENTO_ID','PRODUCTO_ID','UNIDADES','PRECIO','TICKET','TIENDA_ID','RESPONSABLE_ID'], comprasRows);
      makeSheet('DONACIONES', ['ID','EVENTO_ID','PRODUCTO_ID','UNIDADES','PRECIO','TIPO_DONACION','DONANTE','RESPONSABLE_ID'], donacionesRows);
      makeSheet('TICKET_IMAGES', ['KEY','DATA_URL'], ticketRows);

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'ControlEvent_v28_10_descarga_datos.xlsx';
      a.click();
      URL.revokeObjectURL(a.href);
    };
  }

  // Permitir poner el precio correctamente en Compras y otros gastos
  function allTiendas(){
    return (typeof tiendasGenerales === 'function' ? tiendasGenerales() : (state.tiendas || []))
      .slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
  }
  function allProductos(){
    return (typeof productosGenerales === 'function' ? productosGenerales() : (state.productos || []))
      .slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
  }
  function allSocios(){
    return (typeof sociosOnly === 'function' ? sociosOnly() : (state.personas || []).filter(p => String(p.rango||'').toUpperCase() === 'SOCIO'))
      .slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
  }

  updateBuyPreview = function(forceReference=false){
    const producto = typeof productoById === 'function' ? productoById($('buyProducto')?.value || '') : null;
    const unidades = Number($('buyUnidades')?.value || 0);
    const precioEl = $('buyPrecio');
    const ref = Number((producto && (producto.defaultPrecio ?? producto.precio)) || 0);
    const precio = forceReference ? ref : parseEuro(precioEl?.value || ref);
    const importe = precio * unidades;
    if(precioEl) precioEl.value = euroTxt(precio);
    if($('buyImporte')) $('buyImporte').value = moneyTxt(importe);
  };

  addCompra = function(){
    if(typeof selectedEvent === 'function' && !selectedEvent()) return;
    const productoId = $('buyProducto')?.value || '';
    if(!productoId) return;
    const precio = parseEuro($('buyPrecio')?.value || 0);
    state.compras.push({
      id: typeof uid === 'function' ? uid() : String(Date.now()),
      eventId: state.selectedEventId,
      productoId,
      unidades: Number($('buyUnidades')?.value || 0),
      precio,
      ticketDonacion: $('buyTicket')?.value || '',
      tiendaId: $('buyTienda')?.value || '',
      responsableId: $('buyResponsable')?.value || ''
    });
    const prod = typeof productoById === 'function' ? productoById(productoId) : null;
    if(prod){
      prod.defaultPrecio = precio;
      prod.precio = precio;
    }
    if($('buyProducto')) $('buyProducto').value = '';
    if($('buyUnidades')) $('buyUnidades').value = '1.00';
    if($('buyPrecio')) $('buyPrecio').value = '0,00 €';
    if($('buyImporte')) $('buyImporte').value = '';
    if($('buyTicket')) $('buyTicket').value = '';
    if($('buyTienda')) $('buyTienda').value = '';
    if($('buyResponsable')) $('buyResponsable').value = '';
    if(typeof render === 'function') render();
  };

  renderCompras = function(){
    const wrap = $('comprasList');
    if(!wrap) return;
    let rows = (typeof comprasForEvent === 'function' ? comprasForEvent() : []).filter(r => !(typeof isDonationTicket === 'function' && isDonationTicket(r.ticketDonacion))).slice();

    const sorts = {
      producto:(a,b)=> (a.producto?.nombre || '').localeCompare((b.producto?.nombre || ''), 'es') || String(a.ticketDonacion || '').localeCompare(String(b.ticketDonacion || ''), 'es'),
      ticket:(a,b)=> String(a.ticketDonacion || '').localeCompare(String(b.ticketDonacion || ''), 'es') || (a.producto?.nombre || '').localeCompare((b.producto?.nombre || ''), 'es'),
      responsable:(a,b)=> ((a.responsable?.nombre || '')).localeCompare((b.responsable?.nombre || ''),'es') || (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es')
    };
    rows.sort(sorts[state.comprasSort] || sorts.producto);

    if(!rows.length){
      wrap.innerHTML = '<div class="empty">Todavía no hay compras u otros gastos para este evento.</div>';
      return;
    }

    const productos = allProductos();
    const tiendas = allTiendas();
    const socios = allSocios();

    wrap.innerHTML = '<div class="hint">Ordenar por: <a href="#" onclick="state.comprasSort=\'producto\'; renderCompras(); return false;">Producto</a> · <a href="#" onclick="state.comprasSort=\'ticket\'; renderCompras(); return false;">Ticket</a> · <a href="#" onclick="state.comprasSort=\'responsable\'; renderCompras(); return false;">Responsable</a></div>';

    rows.forEach(r => {
      const pending = String(r.ticketDonacion || '').trim() === '';
      const row = document.createElement('div');
      row.className = 'itemcard' + (pending ? ' red-row' : '');
      row.innerHTML = `
        <div class="rowline compra">
          <div class="field"><label>Producto</label><select data-action="edit-compra-producto" data-id="${r.id}">${productos.map(p => `<option value="${p.id}" ${p.id===r.productoId?'selected':''}>${esc(p.nombre)}</option>`).join('')}</select></div>
          <div class="field"><label>Unidades</label><input type="number" min="0" step="0.01" value="${Number(r.unidades||0)}" data-action="edit-compra-unidades" data-id="${r.id}" /></div>
          <div class="field"><label>Precio</label><input class="money-text" type="text" value="${euroTxt(r.precio != null ? r.precio : (r.precioCalc != null ? r.precioCalc : (r.producto?.precio || 0)))}" data-action="edit-compra-precio" data-id="${r.id}" /></div>
          <div class="field"><label>Importe</label><input class="soft-readonly" readonly value="${moneyTxt((Number(r.precio != null ? r.precio : (r.precioCalc || r.producto?.precio || 0)) * Number(r.unidades||0)))}" /></div>
          <div class="field"><label>Ticket u Otros gastos</label><select data-action="edit-compra-ticket" data-id="${r.id}">${PURCHASE_TICKET_OPTIONS.map(v => `<option value="${v}" ${v===r.ticketDonacion?'selected':''}>${v === '' ? '-- Pte.Compra u otros gastos --' : esc(v)}</option>`).join('')}</select></div>
          <div class="field"><label>Tienda</label><select data-action="edit-compra-tienda" data-id="${r.id}"><option value="" ${!r.tiendaId?'selected':''}>-- elige tienda --</option>${tiendas.map(t => `<option value="${t.id}" ${t.id===r.tiendaId?'selected':''}>${esc(t.nombre)}</option>`).join('')}</select></div>
          <div class="field"><label>Responsable</label><select data-action="edit-compra-responsable" data-id="${r.id}"><option value="" ${!r.responsableId?'selected':''}>-- sin responsable --</option>${socios.map(p => `<option value="${p.id}" ${p.id===r.responsableId?'selected':''}>${esc(p.nombre)}</option>`).join('')}</select></div>
          <div style="display:flex;gap:8px;align-items:end"><button type="button" class="modify small" data-action="save-compra" data-id="${r.id}">Modificar</button><button type="button" class="danger small" data-action="delete-compra" data-id="${r.id}">Eliminar</button></div>
        </div>`;
      wrap.appendChild(row);
    });
  };

  document.addEventListener('click', function(e){
    const btn = e.target.closest('button');
    if(!btn) return;
    const action = btn.dataset.action || btn.id;

    if(action === 'save-compra'){
      e.preventDefault();
      e.stopImmediatePropagation();
      const id = btn.dataset.id;
      const c = (state.compras || []).find(x => x.id === id);
      if(c){
        c.productoId = currentValuesByAction('edit-compra-producto', id);
        c.unidades = Number(currentValuesByAction('edit-compra-unidades', id) || 0);
        c.precio = parseEuro(currentValuesByAction('edit-compra-precio', id) || 0);
        c.ticketDonacion = currentValuesByAction('edit-compra-ticket', id);
        c.tiendaId = currentValuesByAction('edit-compra-tienda', id);
        c.responsableId = currentValuesByAction('edit-compra-responsable', id);
        const prod = typeof productoById === 'function' ? productoById(c.productoId) : null;
        if(prod){
          prod.defaultPrecio = c.precio;
          prod.precio = c.precio;
        }
        if(typeof render === 'function') render();
      }
      return;
    }
  }, true);

  document.addEventListener('change', function(e){
    const id = e.target?.id || '';
    if(['buyProducto','buyUnidades','buyTicket','buyPrecio'].includes(id)){
      e.stopImmediatePropagation();
      updateBuyPreview(id === 'buyProducto');
    }
  }, true);

  // Hoja GRAFICAS exactamente como pantalla y barras más a la derecha
  makeChartImageDataUrl = async function(){
    const canvas = document.createElement('canvas');
    canvas.width = 1500;
    canvas.height = 860;
    const ctx = canvas.getContext('2d');

    const g = (typeof graphDataV143 === 'function')
      ? graphDataV143()
      : (typeof graphData === 'function' ? graphData() : {incomes:{total:0},donations:{total:0},expenses:{total:0},saldo:{total:0,realizado:0}});

    const incomeItems = [
      {label:'Socios Banco', value:g.incomes?.socioBanco || 0, color:'#2563eb'},
      {label:'Socios Bizum', value:g.incomes?.socioBizum || 0, color:'#16a34a'},
      {label:'Socios Efectivo', value:g.incomes?.socioEfectivo || 0, color:'#84cc16'},
      {label:'No socios Banco', value:g.incomes?.noSocioBanco || 0, color:'#60a5fa'},
      {label:'No socios Bizum', value:g.incomes?.noSocioBizum || 0, color:'#34d399'},
      {label:'No socios Efectivo', value:g.incomes?.noSocioEfectivo || 0, color:'#bef264'},
      {label:'Pendiente de ingresar', value:g.incomes?.pendiente || 0, color:'#f59e0b'}
    ];
    const donationItems = [
      {label:'Donado por socios', value:g.donations?.socios || 0, color:'#f59e0b'},
      {label:'Donado por no socios', value:g.donations?.noSocios || 0, color:'#b45309'},
      {label:'Donado por tiendas', value:g.donations?.tiendas || 0, color:'#fcd34d'}
    ];
    const expenseItems = [
      {label:'Gastado en TKxx', value:g.expenses?.tk || 0, color:'#dc2626'},
      {label:'Gastos corrientes', value:g.expenses?.corrientes || 0, color:'#ef4444'},
      {label:'Pendiente de comprar', value:g.expenses?.pendiente || 0, color:'#fb7185'}
    ];
    const saldoItems = [
      {label:'Saldo realizado (ingresos realizados – gastos realizados)', value:Math.abs(g.saldo?.realizado || 0), color:(g.saldo?.realizado || 0) >= 0 ? '#0f766e' : '#b91c1c'}
    ];

    const maxVal = Math.max(
      1,
      Number(g.incomes?.total || 0),
      Number(g.donations?.total || 0),
      Number(g.expenses?.total || 0),
      Math.abs(Number(g.saldo?.realizado || 0))
    );

    const fmt = v => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0));
    const barX = 700, barW = 720, barH = 40;

    function rr(x,y,w,h,r,color){
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x+r,y);
      ctx.arcTo(x+w,y,x+w,y+h,r);
      ctx.arcTo(x+w,y+h,x,y+h,r);
      ctx.arcTo(x,y+h,x,y,r);
      ctx.arcTo(x,y,x+w,y,r);
      ctx.closePath();
      ctx.fill();
    }

    function drawLegend(items, startX, startY, maxWidth){
      ctx.font = '15px Arial';
      let x = startX, y = startY, rowH = 24;
      items.filter(it => Number(it.value || 0) !== 0).forEach(it => {
        const text = `${it.label}: ${fmt(it.value)}`;
        const textW = ctx.measureText(text).width;
        const itemW = 20 + textW + 26;
        if(x + itemW > startX + maxWidth){
          x = startX;
          y += rowH;
        }
        ctx.fillStyle = it.color;
        ctx.fillRect(x, y-11, 12, 12);
        ctx.fillStyle = '#334155';
        ctx.fillText(text, x + 20, y);
        x += itemW;
      });
      return y;
    }

    function drawRow(y, label, total, items){
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 20px Arial';
      ctx.fillText(`${label}: ${fmt(total)}`, 40, y + 24);

      rr(barX, y, barW, barH, 20, '#f3f4f6');
      let x = barX;
      items.forEach(it => {
        const w = (Math.max(0, Number(it.value || 0)) / maxVal) * barW;
        if(w <= 0) return;
        rr(x, y, w, barH, 20, it.color);
        x += w;
      });

      return drawLegend(items, barX, y + 66, barW) + 36;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 28px Arial';
    ctx.fillText('GRÁFICAS DEL EVENTO', 40, 44);

    let y = 88;
    y = drawRow(y, 'INGRESOS EN DINERO', Number(g.incomes?.total || 0), incomeItems);
    y = drawRow(y, 'DONACIÓN DE PRODUCTO', Number(g.donations?.total || 0), donationItems);
    y = drawRow(y, 'GASTOS', Number(g.expenses?.total || 0), expenseItems);
    y = drawRow(y, 'SALDO OPERATIVO', Number(g.saldo?.total || 0), saldoItems);

    return canvas.toDataURL('image/png');
  };
})();

;/* ===== END legacy-inline-12.js ===== */


;/* ===== BEGIN legacy-inline-13.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #13. */
/* ==== V16.0 PATCH FINAL ==== */
(function(){
  const $ = id => document.getElementById(id);
  const esc = v => (typeof escapeHtml === 'function' ? escapeHtml(v) : String(v ?? ''));
  const moneyF = v => (typeof money === 'function' ? money(Number(v || 0)) : new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0)));
  const euroF = v => (typeof euroInputValue === 'function' ? euroInputValue(Number(v || 0)) : moneyF(v));
  const parseEuro = v => (typeof parseEuroInput === 'function' ? parseEuroInput(v) : Number(v || 0));

  function allPersons(){ return (typeof personasGenerales === 'function' ? personasGenerales() : (state.personas || [])).slice(); }
  function allTiendas(){ return (typeof tiendasGenerales === 'function' ? tiendasGenerales() : (state.tiendas || [])).slice(); }
  function allSocios(){ return allPersons().filter(p => String(p.rango || '').trim().toUpperCase() === 'SOCIO'); }

  function donorName(c){
    try{
      if(c?.donorLabel && String(c.donorLabel).trim()) return String(c.donorLabel).trim();
      if(c?.donorRef && String(c.donorRef).trim()){
        const raw = String(c.donorRef).trim();
        if(!raw.startsWith('P:') && !raw.startsWith('T:')) return raw;
        if(typeof donorLabel === 'function'){
          const d = donorLabel(raw);
          if(d && String(d).trim()) return String(d).trim();
        }
      }
      if(c?.tiendaId && typeof tiendaById === 'function'){
        const t = tiendaById(c.tiendaId);
        if(t?.nombre && String(t.nombre).trim()) return String(t.nombre).trim();
      }
      if(c?.tienda?.nombre && String(c.tienda.nombre).trim()) return String(c.tienda.nombre).trim();
    }catch(_){}
    return '';
  }

  function listTitle(items, emptyText='Sin elementos'){
    const arr = (items || []).filter(Boolean);
    return arr.length ? arr.join('\n') : emptyText;
  }

  function collabItemsFor(filterFn){
    return (typeof collabsForEvent === 'function' ? collabsForEvent() : [])
      .filter(filterFn)
      .map(r => `${r.persona?.nombre || 'Sin nombre'} — ${moneyF(r.total || 0)}`);
  }

  function donationItemsFor(ticketCode){
    return (typeof comprasForEvent === 'function' ? comprasForEvent() : [])
      .filter(r => String(r.ticketDonacion || '').trim() === ticketCode)
      .map(r => `${donorName(r) || 'Sin tienda'} — ${r.producto?.nombre || 'Producto'} — ${moneyF(r.valor || 0)}`);
  }

  function graphDataV160(){
    const rows = (typeof collabsForEvent === 'function' ? collabsForEvent() : []);
    const compras = (typeof comprasForEvent === 'function' ? comprasForEvent() : []);
    const sum = arr => arr.reduce((a,b) => a + Number(b || 0), 0);

    const incomes = {
      socioBanco: sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Banco').map(r => r.total)),
      socioBizum: sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Bizum').map(r => r.total)),
      socioEfectivo: sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Efectivo').map(r => r.total)),
      noSocioBanco: sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Banco').map(r => r.total)),
      noSocioBizum: sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Bizum').map(r => r.total)),
      noSocioEfectivo: sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Efectivo').map(r => r.total)),
      pendiente: sum(rows.filter(r => r.situacion === 'Pendiente').map(r => r.total)),
    };
    incomes.total = incomes.socioBanco + incomes.socioBizum + incomes.socioEfectivo + incomes.noSocioBanco + incomes.noSocioBizum + incomes.noSocioEfectivo + incomes.pendiente;
    incomes.realizado = incomes.total - incomes.pendiente;

    const donations = {
      tiendas: sum(compras.filter(r => String(r.ticketDonacion || '').trim() === 'DONADO TIENDA').map(r => r.valor)),
      socios: sum(compras.filter(r => String(r.ticketDonacion || '').trim() === 'DONADO SOCIO').map(r => r.valor)),
      noSocios: sum(compras.filter(r => String(r.ticketDonacion || '').trim() === 'DONADO OTROS').map(r => r.valor)),
    };
    donations.total = donations.tiendas + donations.socios + donations.noSocios;

    const expenses = {
      tk: sum(compras.filter(r => !isDonationTicket(r.ticketDonacion) && !isCurrentExpenseTicket(r.ticketDonacion) && String(r.ticketDonacion || '').trim() !== '').map(r => r.valor)),
      corrientes: sum(compras.filter(r => isCurrentExpenseTicket(r.ticketDonacion)).map(r => r.valor)),
      pendiente: sum(compras.filter(r => !isDonationTicket(r.ticketDonacion) && String(r.ticketDonacion || '').trim() === '').map(r => r.valor)),
    };
    expenses.total = expenses.tk + expenses.corrientes + expenses.pendiente;
    expenses.realizado = expenses.tk + expenses.corrientes;

    const saldoActual = incomes.realizado - expenses.realizado;
    const saldoOperativo = incomes.total - expenses.total;

    return { incomes, donations, expenses, saldoActual, saldoOperativo };
  }
  window.graphDataV160 = graphDataV160;

  budgetSummary = function(){
    const rows = (typeof collabsForEvent === 'function' ? collabsForEvent() : []);
    const compras = (typeof comprasForEvent === 'function' ? comprasForEvent() : []);
    const sociosRows = rows.filter(r => r.persona?.rango === 'SOCIO');
    const noSociosRows = rows.filter(r => r.persona?.rango !== 'SOCIO');

    const sumNum = arr => arr.reduce((a,b) => a + Number(b.numero || 0), 0);
    const sumTotal = arr => arr.reduce((a,b) => a + Number(b.total || 0), 0);
    const paidTotal = arr => arr.filter(r => r.situacion !== 'Pendiente').reduce((a,b) => a + Number(b.total || 0), 0);
    const pendingTotal = arr => arr.filter(r => r.situacion === 'Pendiente').reduce((a,b) => a + Number(b.total || 0), 0);

    const socios = {
      count: sumNum(sociosRows),
      importe: sumTotal(sociosRows),
      ingresado: paidTotal(sociosRows),
      pendiente: pendingTotal(sociosRows),
      listImporte: collabItemsFor(r => r.persona?.rango === 'SOCIO'),
      listIngresado: collabItemsFor(r => r.persona?.rango === 'SOCIO' && r.situacion !== 'Pendiente'),
      listPendiente: collabItemsFor(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Pendiente'),
    };
    const noSocios = {
      count: sumNum(noSociosRows),
      importe: sumTotal(noSociosRows),
      ingresado: paidTotal(noSociosRows),
      pendiente: pendingTotal(noSociosRows),
      listImporte: collabItemsFor(r => r.persona?.rango !== 'SOCIO'),
      listIngresado: collabItemsFor(r => r.persona?.rango !== 'SOCIO' && r.situacion !== 'Pendiente'),
      listPendiente: collabItemsFor(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Pendiente'),
    };

    const gastoCompras = compras.filter(c => !isDonationTicket(c.ticketDonacion) && !isCurrentExpenseTicket(c.ticketDonacion) && String(c.ticketDonacion || '').trim() !== '').reduce((a,b)=>a+Number(b.valor||0),0);
    const gastosOrganizacion = compras.filter(c => isCurrentExpenseTicket(c.ticketDonacion)).reduce((a,b)=>a+Number(b.valor||0),0);
    const pendiente = compras.filter(c => !isDonationTicket(c.ticketDonacion) && String(c.ticketDonacion || '').trim() === '').reduce((a,b)=>a+Number(b.valor||0),0);

    const donacionProducto = {
      donadoTienda: compras.filter(c => String(c.ticketDonacion || '').trim() === 'DONADO TIENDA').reduce((a,b)=>a+Number(b.valor||0),0),
      donadoSocio: compras.filter(c => String(c.ticketDonacion || '').trim() === 'DONADO SOCIO').reduce((a,b)=>a+Number(b.valor||0),0),
      donadoOtros: compras.filter(c => String(c.ticketDonacion || '').trim() === 'DONADO OTROS').reduce((a,b)=>a+Number(b.valor||0),0),
      listTiendas: donationItemsFor('DONADO TIENDA'),
      listSocios: donationItemsFor('DONADO SOCIO'),
      listNoSocios: donationItemsFor('DONADO OTROS'),
    };
    donacionProducto.valorDonado = donacionProducto.donadoTienda + donacionProducto.donadoSocio + donacionProducto.donadoOtros;

    const ingresosTotal = socios.importe + noSocios.importe;
    const ingresosRealizados = socios.ingresado + noSocios.ingresado;
    const gastosTotal = gastoCompras + gastosOrganizacion + pendiente;
    const gastosRealizados = gastoCompras + gastosOrganizacion;

    return {
      ingresosDinero: { socios, noSocios, donantes:noSocios, totalIngresado: ingresosRealizados, totalComprometido: ingresosTotal, pendiente: socios.pendiente + noSocios.pendiente },
      donacionProducto,
      operativa: {
        ingresos: ingresosTotal,
        ingresoDinero: ingresosRealizados,
        gastoCompras,
        gastosOrganizacion,
        pendiente,
        saldoActual: ingresosRealizados - gastosRealizados,
        saldoOperativo: ingresosTotal - gastosTotal
      }
    };
  };

  function buildLegendHtml(items){
    return `<div class="chart-note" style="display:flex;flex-wrap:wrap;gap:10px 16px;margin-top:8px">` +
      items.filter(x => Number(x.value || 0) !== 0).map(x => `<span><span class="legend-dot" style="background:${x.color}"></span>${esc(x.label)}: ${esc(moneyF(x.value))}</span>`).join('') +
      `</div>`;
  }

  function renderGraphOnlyV160(){
    const wrap = $('eventChartWrap');
    if(!wrap) return;
    const g = graphDataV160();
    const maxVal = Math.max(1, g.incomes.total, g.donations.total, g.expenses.total, Math.abs(g.saldoActual), Math.abs(g.saldoOperativo));
    const seg = (value, color, title) => {
      const w = (Math.max(0, Number(value || 0)) / maxVal) * 100;
      return `<div class="chart-seg" title="${esc(title)}" style="width:${w}%;background:${color};"></div>`;
    };

    const incomeItems = [
      {label:'Socios Banco', value:g.incomes.socioBanco, color:'#2563eb'},
      {label:'Socios Bizum', value:g.incomes.socioBizum, color:'#16a34a'},
      {label:'Socios Efectivo', value:g.incomes.socioEfectivo, color:'#84cc16'},
      {label:'No socios Banco', value:g.incomes.noSocioBanco, color:'#60a5fa'},
      {label:'No socios Bizum', value:g.incomes.noSocioBizum, color:'#34d399'},
      {label:'No socios Efectivo', value:g.incomes.noSocioEfectivo, color:'#bef264'},
      {label:'Pendiente de ingresar', value:g.incomes.pendiente, color:'#f59e0b'}
    ];
    const donationItems = [
      {label:'Donado por tiendas', value:g.donations.tiendas, color:'#fcd34d'},
      {label:'Donado por socios', value:g.donations.socios, color:'#f59e0b'},
      {label:'Donado por no socios', value:g.donations.noSocios, color:'#b45309'}
    ];
    const expenseItems = [
      {label:'Gastado en TKxx', value:g.expenses.tk, color:'#dc2626'},
      {label:'Gastos corrientes', value:g.expenses.corrientes, color:'#ef4444'},
      {label:'Pte. Compra u otros gastos', value:g.expenses.pendiente, color:'#fb7185'}
    ];
    const saldoActualItems = [{label:'Saldo actual (ingresos realizados – gastos realizados)', value:Math.abs(g.saldoActual), color:g.saldoActual >= 0 ? '#0f766e' : '#b91c1c'}];
    const saldoOperativoItems = [{label:'Saldo operativo (ingresos – gastos)', value:Math.abs(g.saldoOperativo), color:g.saldoOperativo >= 0 ? '#155e75' : '#7f1d1d'}];

    wrap.innerHTML = `
      <div class="chart-shell">
        <div class="chart-bars">
          <div class="chart-row">
            <div class="chart-label">INGRESOS: ${esc(moneyF(g.incomes.total))}</div>
            <div><div class="chart-track">${incomeItems.map(x => seg(x.value, x.color, x.label + ': ' + moneyF(x.value))).join('')}</div>${buildLegendHtml(incomeItems)}</div>
          </div>
          <div class="chart-row">
            <div class="chart-label">DONACIÓN DE PRODUCTO: ${esc(moneyF(g.donations.total))}</div>
            <div><div class="chart-track">${donationItems.map(x => seg(x.value, x.color, x.label + ': ' + moneyF(x.value))).join('')}</div>${buildLegendHtml(donationItems)}</div>
          </div>
          <div class="chart-row">
            <div class="chart-label">GASTOS: ${esc(moneyF(g.expenses.total))}</div>
            <div><div class="chart-track">${expenseItems.map(x => seg(x.value, x.color, x.label + ': ' + moneyF(x.value))).join('')}</div>${buildLegendHtml(expenseItems)}</div>
          </div>
          <div class="chart-row">
            <div class="chart-label">SALDO ACTUAL: ${esc(moneyF(g.saldoActual))}</div>
            <div><div class="chart-track">${saldoActualItems.map(x => seg(x.value, x.color, x.label + ': ' + moneyF(g.saldoActual))).join('')}</div>${buildLegendHtml([{label:'Saldo actual', value:g.saldoActual, color:saldoActualItems[0].color}])}</div>
          </div>
          <div class="chart-row">
            <div class="chart-label">SALDO OPERATIVO: ${esc(moneyF(g.saldoOperativo))}</div>
            <div><div class="chart-track">${saldoOperativoItems.map(x => seg(x.value, x.color, x.label + ': ' + moneyF(g.saldoOperativo))).join('')}</div>${buildLegendHtml([{label:'Saldo operativo', value:g.saldoOperativo, color:saldoOperativoItems[0].color}])}</div>
          </div>
        </div>
      </div>`;
  }
  renderGraficas = function(){ renderGraphOnlyV160(); };

  function groupedBreakdown(kind){
    const compras = (typeof comprasForEvent === 'function' ? comprasForEvent() : []);
    const keys = kind === 'segmento' ? (typeof SEGMENT_OPTIONS !== 'undefined' ? SEGMENT_OPTIONS : []) : (typeof DESTINO_OPTIONS !== 'undefined' ? DESTINO_OPTIONS : []);
    return keys.map(k => {
      const match = c => String(kind === 'segmento' ? (c.producto?.segmento || '') : (c.producto?.destino || '')) === k;
      const comprado = compras.filter(c => match(c) && !isDonationTicket(c.ticketDonacion) && String(c.ticketDonacion || '').trim() !== '').reduce((a,b)=>a+Number(b.valor||0),0);
      const donado = compras.filter(c => match(c) && isDonationTicket(c.ticketDonacion)).reduce((a,b)=>a+Number(b.valor||0),0);
      const pendiente = compras.filter(c => match(c) && !isDonationTicket(c.ticketDonacion) && String(c.ticketDonacion || '').trim() === '').reduce((a,b)=>a+Number(b.valor||0),0);
      return {label:k, comprado, donado, pendiente, total: comprado + donado + pendiente};
    });
  }
  summaryBySegmento = function(){ return groupedBreakdown('segmento'); };
  summaryByDestino = function(){ return groupedBreakdown('destino'); };

  renderSummaryList = function(targetId, rows){
    const wrap = $(targetId);
    if(!wrap) return;
    wrap.innerHTML = '';

    if(targetId === 'summarySegmento' || targetId === 'summaryDestino'){
      const maxVal = Math.max(1, ...rows.flatMap(r => [Number(r.comprado||0), Number(r.donado||0), Number(r.pendiente||0)]));
      const totalGeneral = rows.reduce((a,b)=>a+Number(b.total||0),0);

      const title = targetId === 'summarySegmento' ? 'Por segmento' : 'Por destino';
      const head = document.createElement('div');
      head.className = 'vbars-wrap';
      head.innerHTML = `
        <div class="vbars-total">${title} · TOTAL GENERAL: ${esc(moneyF(totalGeneral))}</div>
        <div class="chart-note"><span><span class="legend-dot" style="background:#dc2626"></span>Comprado</span> <span><span class="legend-dot" style="background:#f59e0b"></span>Donado</span> <span><span class="legend-dot" style="background:#fb7185"></span>Pte. Compra u otros gastos</span></div>
      `;
      wrap.appendChild(head);

      const grid = document.createElement('div');
      grid.className = 'vbars-grid';
      rows.forEach(r => {
        const card = document.createElement('div');
        card.className = 'vbars-card';
        const h1 = Math.max(8, (Number(r.comprado||0) / maxVal) * 170);
        const h2 = Math.max(8, (Number(r.donado||0) / maxVal) * 170);
        const h3 = Math.max(8, (Number(r.pendiente||0) / maxVal) * 170);
        card.innerHTML = `
          <div class="vbars-title">${esc(r.label)} · ${esc(moneyF(r.total))}</div>
          <div class="vbars-chart">
            <div class="vbar-col" title="Comprado: ${esc(moneyF(r.comprado))}">
              <div class="vbar-value">${esc(moneyF(r.comprado))}</div>
              <div class="vbar-stick" style="height:${h1}px;background:#dc2626"></div>
              <div class="vbar-label">Comprado</div>
            </div>
            <div class="vbar-col" title="Donado: ${esc(moneyF(r.donado))}">
              <div class="vbar-value">${esc(moneyF(r.donado))}</div>
              <div class="vbar-stick" style="height:${h2}px;background:#f59e0b"></div>
              <div class="vbar-label">Donado</div>
            </div>
            <div class="vbar-col" title="Pte. Compra u otros gastos: ${esc(moneyF(r.pendiente))}">
              <div class="vbar-value">${esc(moneyF(r.pendiente))}</div>
              <div class="vbar-stick" style="height:${h3}px;background:#fb7185"></div>
              <div class="vbar-label">Pte. Compra u otros gastos</div>
            </div>
          </div>
        `;
        grid.appendChild(card);
      });
      wrap.appendChild(grid);
      return;
    }

    if(targetId === 'summaryTiendaTicket'){
      const tools = document.createElement('div');
      tools.className = 'hint';
      tools.innerHTML = 'Ordenar por: <a href="#" onclick="state.summaryTiendaSort=\'tienda\'; renderBudget(); return false;">Tienda</a> · <a href="#" onclick="state.summaryTiendaSort=\'ticket\'; renderBudget(); return false;">Ticket</a>';
      wrap.appendChild(tools);
    }

    if(!rows.length){
      const empty = document.createElement('div');
      empty.className = 'hint';
      empty.textContent = 'Sin datos.';
      wrap.appendChild(empty);
      return;
    }

    let total = 0;
    rows.forEach((r, idx) => {
      total += Number(r.v || 0);
      const div = document.createElement('div');
      div.className = 'summary-item';
      if(r.pending) div.classList.add('red-row');
      const amountHtml = `<span class="pill"${r.pending ? ' style="background:#fef2f2;color:#b91c1c"' : (r.donated ? ' style="text-decoration:line-through"' : '')}>${moneyF(r.v)}</span>`;
      const textLabel = r.label || r.k;

      if(targetId === 'summaryTiendaTicket' && !r.pending && r.attachable){
        const inputId = `ticketUpload_${idx}`;
        const encodedKey = encodeURIComponent(r.k);
        const preview = r.image ? `<img class="ticket-thumb" src="${r.image}" alt="ticket" />` : '';
        div.innerHTML = `<span>${esc(textLabel)}</span><span style="display:flex;align-items:center;gap:8px;">${amountHtml}<span class="ticket-actions"><button type="button" class="outline small" onclick="document.getElementById('${inputId}').click()">📎</button><input id="${inputId}" class="ticket-file-input" type="file" accept="image/*" onchange="uploadTicketImage(event, '${encodedKey}')">${preview}${r.image ? `<button type="button" class="outline small" onclick="removeTicketImage('${encodedKey}')">🗑️</button>` : ''}</span></span>`;
      } else {
        div.innerHTML = `<span>${esc(textLabel)}</span>${amountHtml}`;
      }
      wrap.appendChild(div);
    });

    const totalDiv = document.createElement('div');
    totalDiv.className = 'summary-item';
    totalDiv.style.fontWeight = '800';
    totalDiv.innerHTML = `<span>TOTAL</span><span class="pill">${moneyF(total)}</span>`;
    wrap.appendChild(totalDiv);
  };

  renderBudget = function(){
    const wrap = $('budgetLayout');
    const b = budgetSummary();
    if(wrap){
      wrap.innerHTML = `
        <div class="budget-panel socios">
          <h3>INGRESOS</h3>
          <div class="budget-rows">
            <div class="budget-row budget-subgroup"><strong>SOCIOS</strong><span>${esc(moneyF(b.ingresosDinero.socios.ingresado))}</span></div>
            <div class="budget-subrows">
              <div class="budget-subrow"><span>Personas</span><span>${esc(String(b.ingresosDinero.socios.count))}</span></div>
              <div class="budget-subrow"><span class="summary-tip" title="${esc(listTitle(b.ingresosDinero.socios.listImporte))}">Importe socios</span><span>${esc(moneyF(b.ingresosDinero.socios.importe))}</span></div>
              <div class="budget-subrow"><span class="summary-tip" title="${esc(listTitle(b.ingresosDinero.socios.listIngresado))}">Ingresado socios</span><span>${esc(moneyF(b.ingresosDinero.socios.ingresado))}</span></div>
              <div class="budget-subrow"><span class="summary-tip" title="${esc(listTitle(b.ingresosDinero.socios.listPendiente))}">Pendiente socios</span><span>${esc(moneyF(b.ingresosDinero.socios.pendiente))}</span></div>
            </div>
            <div class="budget-row budget-subgroup"><strong>NO SOCIOS</strong><span>${esc(moneyF(b.ingresosDinero.noSocios.ingresado))}</span></div>
            <div class="budget-subrows">
              <div class="budget-subrow"><span>Personas</span><span>${esc(String(b.ingresosDinero.noSocios.count))}</span></div>
              <div class="budget-subrow"><span class="summary-tip" title="${esc(listTitle(b.ingresosDinero.noSocios.listImporte))}">Importe no socios</span><span>${esc(moneyF(b.ingresosDinero.noSocios.importe))}</span></div>
              <div class="budget-subrow"><span class="summary-tip" title="${esc(listTitle(b.ingresosDinero.noSocios.listIngresado))}">Ingresado no socios</span><span>${esc(moneyF(b.ingresosDinero.noSocios.ingresado))}</span></div>
              <div class="budget-subrow"><span class="summary-tip" title="${esc(listTitle(b.ingresosDinero.noSocios.listPendiente))}">Pendiente no socios</span><span>${esc(moneyF(b.ingresosDinero.noSocios.pendiente))}</span></div>
            </div>
          </div>
        </div>
        <div class="budget-panel donantes">
          <h3>DONACIÓN DE PRODUCTO</h3>
          <div class="budget-rows">
            <div class="budget-subrows">
              <div class="budget-subrow"><span class="summary-tip" title="${esc(listTitle(b.donacionProducto.listTiendas))}">Donación de producto tiendas</span><span>${esc(moneyF(b.donacionProducto.donadoTienda))}</span></div>
              <div class="budget-subrow"><span class="summary-tip" title="${esc(listTitle(b.donacionProducto.listSocios))}">Donación de producto socios</span><span>${esc(moneyF(b.donacionProducto.donadoSocio))}</span></div>
              <div class="budget-subrow"><span class="summary-tip" title="${esc(listTitle(b.donacionProducto.listNoSocios))}">Donación de producto no socios</span><span>${esc(moneyF(b.donacionProducto.donadoOtros))}</span></div>
            </div>
            <div class="budget-row budget-subgroup"><strong>Valor producto donado</strong><span>${esc(moneyF(b.donacionProducto.valorDonado))}</span></div>
          </div>
        </div>
        <div class="budget-panel operativo">
          <h3>OPERATIVA</h3>
          <div class="budget-rows">
            <div class="budget-row"><strong>INGRESOS</strong><span>${esc(moneyF(b.operativa.ingresos))}</span></div>
            <div class="budget-row"><strong>GASTOS</strong><span>${esc(moneyF(Number(b.operativa.gastoCompras || 0) + Number(b.operativa.gastosOrganizacion || 0) + Number(b.operativa.pendiente || 0)))}</span></div>
            <div class="budget-row"><strong>PTE. COMPRA U OTROS GASTOS</strong><span style="color:#c2410c">${esc(moneyF(b.operativa.pendiente))}</span></div>
            <div class="budget-row"><strong>SALDO ACTUAL</strong><span style="color:${Number(b.operativa.saldoActual || 0) >= 0 ? '#047857' : '#b91c1c'}">${esc(moneyF(b.operativa.saldoActual))}</span></div>
            <div class="budget-row"><strong>SALDO OPERATIVO</strong><span style="color:${Number(b.operativa.saldoOperativo || 0) >= 0 ? '#155e75' : '#7f1d1d'}">${esc(moneyF(b.operativa.saldoOperativo))}</span></div>
          </div>
        </div>`;
    }
    renderSummaryList('summarySegmento', summaryBySegmento());
    renderSummaryList('summaryDestino', summaryByDestino());
    renderSummaryList('summaryTiendaTicket', typeof summaryByTiendaTicket === 'function' ? summaryByTiendaTicket() : []);
    renderGraficas();
  };

  // Make purchase price field easy to edit
  updateBuyPreview = function(forceReference=false){
    const producto = typeof productoById === 'function' ? productoById($('buyProducto')?.value || '') : null;
    const unidades = Number($('buyUnidades')?.value || 0);
    const precioEl = $('buyPrecio');
    const ref = Number((producto && (producto.defaultPrecio ?? producto.precio)) || 0);
    const raw = precioEl?.value || ref;
    const precio = forceReference ? ref : parseEuro(raw);
    if(precioEl && (forceReference || document.activeElement !== precioEl)) precioEl.value = euroF(precio);
    if($('buyImporte')) $('buyImporte').value = moneyF(precio * unidades);
  };

  document.addEventListener('focusin', function(e){
    const t = e.target;
    if(t && (t.id === 'buyPrecio' || t.dataset.action === 'edit-compra-precio')){
      try{ t.select(); }catch(_){}
    }
  });

  document.addEventListener('blur', function(e){
    const t = e.target;
    if(t && t.id === 'buyPrecio'){
      t.value = euroF(parseEuro(t.value));
      updateBuyPreview(false);
    }
    if(t && t.dataset && t.dataset.action === 'edit-compra-precio'){
      t.value = euroF(parseEuro(t.value));
    }
  }, true);

  function sortComprasRows(rows){
    const byTicket = (a,b)=> String(a.ticketDonacion||'').localeCompare(String(b.ticketDonacion||''),'es') || (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es');
    const byProd = (a,b)=> (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es') || String(a.ticketDonacion||'').localeCompare(String(b.ticketDonacion||''),'es');
    const byResp = (a,b)=> (a.responsable?.nombre||'').localeCompare((b.responsable?.nombre||''),'es') || byTicket(a,b);
    const sort = state.comprasSort === 'ticket' ? byTicket : (state.comprasSort === 'responsable' ? byResp : byProd);
    return rows.sort(sort);
  }

  renderCompras = function(){
    const wrap = $('comprasList');
    if(!wrap) return;
    let rows = (typeof comprasForEvent === 'function' ? comprasForEvent() : []).filter(r => !(typeof isDonationTicket === 'function' && isDonationTicket(r.ticketDonacion))).slice();
    rows = sortComprasRows(rows);
    if(!rows.length){
      wrap.innerHTML = '<div class="empty">Todavía no hay compras u otros gastos para este evento.</div>';
      return;
    }
    const productos = (typeof productosGenerales === 'function' ? productosGenerales() : (state.productos || [])).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
    const tiendas = allTiendas().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
    const socios = allSocios().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));

    wrap.innerHTML = '<div class="hint">Ordenar por: <a href="#" onclick="state.comprasSort=\'producto\'; renderCompras(); return false;">Producto</a> · <a href="#" onclick="state.comprasSort=\'ticket\'; renderCompras(); return false;">Ticket u otros gastos</a> · <a href="#" onclick="state.comprasSort=\'responsable\'; renderCompras(); return false;">Responsable</a></div>';

    rows.forEach(r => {
      const pending = String(r.ticketDonacion || '').trim() === '';
      const precioVal = Number(r.precio != null ? r.precio : (r.precioCalc != null ? r.precioCalc : (r.producto?.precio || 0)));
      const importeVal = precioVal * Number(r.unidades || 0);
      const row = document.createElement('div');
      row.className = 'itemcard' + (pending ? ' red-row' : '');
      row.innerHTML = `
        <div class="rowline compra">
          <div class="field"><label>Producto</label><select data-action="edit-compra-producto" data-id="${r.id}">${productos.map(p => `<option value="${p.id}" ${p.id===r.productoId?'selected':''}>${esc(p.nombre)}</option>`).join('')}</select></div>
          <div class="field"><label>Unidades</label><input type="number" min="0" step="0.01" value="${Number(r.unidades||0)}" data-action="edit-compra-unidades" data-id="${r.id}" /></div>
          <div class="field"><label>Precio</label><input class="money-text" type="text" value="${euroF(precioVal)}" data-action="edit-compra-precio" data-id="${r.id}" /></div>
          <div class="field"><label>Importe</label><input class="soft-readonly" readonly value="${moneyF(importeVal)}" /></div>
          <div class="field"><label>Ticket u Otros gastos</label><select data-action="edit-compra-ticket" data-id="${r.id}">${PURCHASE_TICKET_OPTIONS.map(v => `<option value="${v}" ${v===r.ticketDonacion?'selected':''}>${v === '' ? '-- Pte.Compra u otros gastos --' : esc(v)}</option>`).join('')}</select></div>
          <div class="field"><label>Tienda</label><select data-action="edit-compra-tienda" data-id="${r.id}"><option value="" ${!r.tiendaId?'selected':''}>-- elige tienda --</option>${tiendas.map(t => `<option value="${t.id}" ${t.id===r.tiendaId?'selected':''}>${esc(t.nombre)}</option>`).join('')}</select></div>
          <div class="field"><label>Responsable</label><select data-action="edit-compra-responsable" data-id="${r.id}"><option value="" ${!r.responsableId?'selected':''}>-- sin responsable --</option>${socios.map(p => `<option value="${p.id}" ${p.id===r.responsableId?'selected':''}>${esc(p.nombre)}</option>`).join('')}</select></div>
          <div style="display:flex;gap:8px;align-items:end"><button type="button" class="modify small" data-action="save-compra" data-id="${r.id}">Modificar</button><button type="button" class="danger small" data-action="delete-compra" data-id="${r.id}">Eliminar</button></div>
        </div>`;
      wrap.appendChild(row);
    });
  };

  function fileNameV160(ev){
    const title = String(ev?.titulo || 'evento')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'').replace(/_+/g,'_') || 'evento';
    const now = new Date();
    const dd = String(now.getDate()).padStart(2,'0');
    const mm = String(now.getMonth()+1).padStart(2,'0');
    const yyyy = String(now.getFullYear());
    return `ControlEvent_v28_10_INFOEVENTO-${title}_${yyyy}${mm}${dd}.xlsx`;
  }
  window.xlsxFilename = fileNameV160;

  async function makeChartImageDataUrlV160(){
    const canvas = document.createElement('canvas');
    canvas.width = 1900;
    canvas.height = 960;
    const ctx = canvas.getContext('2d');
    const g = graphDataV160();

    const incomeItems = [
      {label:'Socios Banco', value:g.incomes.socioBanco, color:'#2563eb'},
      {label:'Socios Bizum', value:g.incomes.socioBizum, color:'#16a34a'},
      {label:'Socios Efectivo', value:g.incomes.socioEfectivo, color:'#84cc16'},
      {label:'No socios Banco', value:g.incomes.noSocioBanco, color:'#60a5fa'},
      {label:'No socios Bizum', value:g.incomes.noSocioBizum, color:'#34d399'},
      {label:'No socios Efectivo', value:g.incomes.noSocioEfectivo, color:'#bef264'},
      {label:'Pendiente de ingresar', value:g.incomes.pendiente, color:'#f59e0b'}
    ];
    const donationItems = [
      {label:'Donado por tiendas', value:g.donations.tiendas, color:'#fcd34d'},
      {label:'Donado por socios', value:g.donations.socios, color:'#f59e0b'},
      {label:'Donado por no socios', value:g.donations.noSocios, color:'#b45309'}
    ];
    const expenseItems = [
      {label:'Gastado en TKxx', value:g.expenses.tk, color:'#dc2626'},
      {label:'Gastos corrientes', value:g.expenses.corrientes, color:'#ef4444'},
      {label:'Pte. Compra u otros gastos', value:g.expenses.pendiente, color:'#fb7185'}
    ];
    const saldoActualItems = [{label:'Saldo actual', value:Math.abs(g.saldoActual), color:g.saldoActual >= 0 ? '#0f766e' : '#b91c1c'}];
    const saldoOperativoItems = [{label:'Saldo operativo', value:Math.abs(g.saldoOperativo), color:g.saldoOperativo >= 0 ? '#155e75' : '#7f1d1d'}];

    const maxVal = Math.max(1, g.incomes.total, g.donations.total, g.expenses.total, Math.abs(g.saldoActual), Math.abs(g.saldoOperativo));
    const fmt = v => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0));
    const barX = 1120, barW = 620, barH = 42;

    function rr(x,y,w,h,r,color){
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x+r,y);
      ctx.arcTo(x+w,y,x+w,y+h,r);
      ctx.arcTo(x+w,y+h,x,y+h,r);
      ctx.arcTo(x,y+h,x,y,r);
      ctx.arcTo(x,y,x+w,y,r);
      ctx.closePath();
      ctx.fill();
    }
    function drawLegend(items, startX, startY, maxWidth){
      ctx.font = '16px Arial';
      let x = startX, y = startY, rowH = 26;
      items.filter(it => Number(it.value || 0) !== 0).forEach(it => {
        const text = `${it.label}: ${fmt(it.value)}`;
        const textW = ctx.measureText(text).width;
        const itemW = 22 + textW + 28;
        if(x + itemW > startX + maxWidth){
          x = startX;
          y += rowH;
        }
        ctx.fillStyle = it.color;
        ctx.fillRect(x, y-11, 12, 12);
        ctx.fillStyle = '#334155';
        ctx.fillText(text, x + 20, y);
        x += itemW;
      });
      return y;
    }
    function drawRow(y, label, total, items){
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 22px Arial';
      ctx.fillText(`${label}: ${fmt(total)}`, 40, y + 24);

      rr(barX, y, barW, barH, 20, '#f3f4f6');
      let x = barX;
      items.forEach(it => {
        const w = (Math.max(0, Number(it.value || 0)) / maxVal) * barW;
        if(w <= 0) return;
        rr(x, y, w, barH, 20, it.color);
        x += w;
      });

      return drawLegend(items, barX, y + 70, barW) + 40;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 30px Arial';
    ctx.fillText('GRÁFICAS DEL EVENTO', 40, 46);

    let y = 90;
    y = drawRow(y, 'INGRESOS', g.incomes.total, incomeItems);
    y = drawRow(y, 'DONACIÓN DE PRODUCTO', g.donations.total, donationItems);
    y = drawRow(y, 'GASTOS', g.expenses.total, expenseItems);
    y = drawRow(y, 'SALDO ACTUAL', g.saldoActual, saldoActualItems);
    y = drawRow(y, 'SALDO OPERATIVO', g.saldoOperativo, saldoOperativoItems);

    return canvas.toDataURL('image/png');
  }
  window.makeChartImageDataUrl = makeChartImageDataUrlV160;

  exportSeedWorkbook = async function(){
    if(typeof isLocked === 'function' && isLocked()) return;
    try{
      await ensureExcelJS();
    }catch(err){
      alert('No se pudo cargar el motor de Excel. Coloca exceljs.min.js en la carpeta vendor o usa conexión a internet.');
      return;
    }
    const wb = new ExcelJS.Workbook();
    wb.creator = 'ControlEvent v28.10 - ©oltyLAB ’26';
    wb.created = new Date();

    const border = {top:{style:'thin', color:{argb:'FFDDE2EA'}},left:{style:'thin', color:{argb:'FFDDE2EA'}},bottom:{style:'thin', color:{argb:'FFDDE2EA'}},right:{style:'thin', color:{argb:'FFDDE2EA'}}};
    const headFill = {type:'pattern', pattern:'solid', fgColor:{argb:'FF111827'}};
    function makeSheet(name, headers, rows){
      const ws = wb.addWorksheet(name);
      ws.columns = headers.map(h => ({width: Math.max(14, String(h).length + 2)}));
      headers.forEach((h, i) => {
        const c = ws.getCell(1, i+1);
        c.value = h;
        c.font = {bold:true, color:{argb:'FFFFFFFF'}};
        c.fill = headFill;
        c.border = border;
        c.alignment = {horizontal:'center', vertical:'middle'};
      });
      let r = 2;
      rows.forEach(row => {
        row.forEach((v, i) => {
          const c = ws.getCell(r, i+1);
          c.value = v == null ? '' : v;
          c.border = border;
        });
        r += 1;
      });
    }

    const personasRows = (state.personas || []).map(p => [p.id, p.nombre || '', p.rango || '']);
    const eventosRows = (state.eventos || []).map(e => [e.id, e.titulo || '', e.precio || 0, e.fechaIni || '', e.fechaFin || '', e.descripcion || '', e.situacion || '']);
    const tiendasRows = (state.tiendas || []).map(t => [t.id, t.nombre || '']);
    const productosRows = (state.productos || []).map(p => [p.id, p.nombre || '', p.segmento || '', p.destino || '', Number((p.defaultPrecio ?? p.precio) || 0)]);
    const ingresosRows = (state.colaboradores || []).map(c => [c.id, c.eventId || '', c.personaId || '', c.numero || 0, c.situacion || '', c.importe || 0]);
    const comprasRows = (state.compras || []).filter(c => !(typeof isDonationTicket === 'function' && isDonationTicket(c.ticketDonacion))).map(c => [c.id, c.eventId || '', c.productoId || '', c.unidades || 0, c.precio || 0, c.ticketDonacion || '', c.tiendaId || '', c.responsableId || '']);
    const donacionesRows = (state.compras || []).filter(c => (typeof isDonationTicket === 'function' && isDonationTicket(c.ticketDonacion))).map(c => [c.id, c.eventId || '', c.productoId || '', c.unidades || 0, c.precio || 0, c.ticketDonacion || '', c.donorRef || '', c.responsableId || '']);
    const ticketRows = Object.entries(state.ticketImages || {}).map(([k,v]) => [k, v]);

    makeSheet('PERSONAS', ['ID','NOMBRE','RANGO'], personasRows);
    makeSheet('EVENTOS', ['ID','TITULO','PRECIO','FECHA_INI','FECHA_FIN','DESCRIPCION','SITUACION'], eventosRows);
    makeSheet('TIENDAS', ['ID','NOMBRE'], tiendasRows);
    makeSheet('PRODUCTOS', ['ID','NOMBRE','SEGMENTO','DESTINO','PRECIO_REFERENCIA'], productosRows);
    makeSheet('INGRESOS', ['ID','EVENTO_ID','PERSONA_ID','NUMERO','TIPO_INGRESO','IMPORTE_VOLUNTARIO'], ingresosRows);
    makeSheet('COMPRAS', ['ID','EVENTO_ID','PRODUCTO_ID','UNIDADES','PRECIO','TICKET','TIENDA_ID','RESPONSABLE_ID'], comprasRows);
    makeSheet('DONACIONES', ['ID','EVENTO_ID','PRODUCTO_ID','UNIDADES','PRECIO','TIPO_DONACION','DONANTE','RESPONSABLE_ID'], donacionesRows);
    makeSheet('TICKET_IMAGES', ['KEY','DATA_URL'], ticketRows);

    for(const ws of wb.worksheets){
      try{
        await ws.protect('open_excel_arrastre', {selectLockedCells:true, selectUnlockedCells:true, formatCells:false, formatColumns:false, formatRows:false, insertColumns:false, insertRows:false, insertHyperlinks:false, deleteColumns:false, deleteRows:false, sort:false, autoFilter:false, pivotTables:false});
      }catch(_){}
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ControlEvent_v28_10_descarga_datos.xlsx';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  exportExcel = async function(){
    if(typeof isLocked === 'function' && isLocked() && typeof isGodRole === 'function' && !isGodRole()) return;
    const ev = typeof selectedEvent === 'function' ? selectedEvent() : null;
    if(!ev) return;

    try{
      await ensureExcelJS();
    }catch(err){
      alert('No se pudo cargar el motor de Excel. Coloca exceljs.min.js en la carpeta vendor o usa conexión a internet.');
      return;
    }

    const collabs = (typeof collabsForEvent === 'function' ? collabsForEvent() : []);
    const compras = (typeof comprasForEvent === 'function' ? comprasForEvent() : []);
    const comprasSolo = compras.filter(x => !isDonationTicket(x.ticketDonacion)).slice().sort((a,b)=> String(a.ticketDonacion||'').localeCompare(String(b.ticketDonacion||''),'es') || (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es'));
    const donacionesSolo = compras.filter(x => isDonationTicket(x.ticketDonacion));
    const budget = budgetSummary();
    const segRows = summaryBySegmento();
    const destRows = summaryByDestino();
    const tiendaRows = (typeof summaryByTiendaTicket === 'function' ? summaryByTiendaTicket() : []).slice().sort((a,b)=>{
      const [ta='',tk=''] = String(a.k||'').split(' | ');
      const [tb='',tl=''] = String(b.k||'').split(' | ');
      const s = tk.localeCompare(tl,'es');
      return s !== 0 ? s : ta.localeCompare(tb,'es');
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'ControlEvent v28.10 - ©oltyLAB ’26';
    wb.created = new Date();

    const border = {top:{style:'thin', color:{argb:'FFDDE2EA'}},left:{style:'thin', color:{argb:'FFDDE2EA'}},bottom:{style:'thin', color:{argb:'FFDDE2EA'}},right:{style:'thin', color:{argb:'FFDDE2EA'}}};
    const fills = { title:'FF111827', ok:'FFECFDF5', bad:'FFFEF2F2', warn:'FFFFF7ED', white:'FFFFFFFF' };
    const moneyFmt = '#,##0.00 [$€-C0A]';
    const numFmt = '0.00';
    function baseSheet(name, widths){
      const ws = wb.addWorksheet(name);
      ws.properties.defaultRowHeight = 20;
      ws.columns = widths.map(w => ({width:w}));
      return ws;
    }
    function paint(cell, fill='white'){
      cell.border = border;
      cell.alignment = {vertical:'middle', wrapText:true};
      if(fill && fills[fill]){
        cell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:fills[fill]}};
      }
    }
    function titleRow(ws, rowNum, headers){
      headers.forEach((h, i) => {
        const c = ws.getCell(rowNum, i+1);
        c.value = h;
        c.font = {bold:true, color:{argb:'FFFFFFFF'}};
        c.fill = {type:'pattern', pattern:'solid', fgColor:{argb:fills.title}};
        c.border = border;
        c.alignment = {vertical:'middle', horizontal:'center'};
      });
      ws.getRow(rowNum).height = 20;
    }
    function putText(ws, r, c, v, fill='white'){ const cell = ws.getCell(r,c); cell.value = v == null ? '' : String(v); paint(cell, fill); return cell; }
    function putNum(ws, r, c, v, fill='white'){ const cell = ws.getCell(r,c); const wasBold = !!cell.font?.bold; cell.value = Number(v || 0); cell.numFmt = numFmt; paint(cell, fill); cell.font = {bold:wasBold, color:{argb:'FF111827'}}; return cell; }
    function putMoney(ws, r, c, v, fill='white'){ const cell = ws.getCell(r,c); const wasBold = !!cell.font?.bold; cell.value = Number(v || 0); cell.numFmt = moneyFmt; paint(cell, fill); cell.font = {bold:wasBold, color:{argb:'FF111827'}}; return cell; }
    function mergeTitle(ws, row, text, cols){
      ws.mergeCells(row,1,row,cols);
      const cell = ws.getCell(row,1);
      cell.value = text;
      cell.font = {bold:true, color:{argb:'FFFFFFFF'}};
      cell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:fills.title}};
      cell.border = border;
      cell.alignment = {vertical:'middle', horizontal:'center'};
      ws.getRow(row).height = 20;
    }
    function addImageToSheet(ws, dataUrl, row, col, width=1450, height=760){
      if(!dataUrl) return;
      const m = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
      if(!m) return;
      const ext = m[1].includes('png') ? 'png' : 'jpeg';
      const id = wb.addImage({base64:dataUrl, extension:ext});
      ws.addImage(id, { tl: {col: col-1 + 0.05, row: row-1 + 0.05}, ext: {width, height} });
      ws.getRow(row).height = 580;
    }

    const wsRes = baseSheet('RESUMEN', [36,34,18,18,18]);
    mergeTitle(wsRes, 1, 'RESUMEN DEL EVENTO', 5);
    putText(wsRes, 2, 1, 'Título del evento'); wsRes.mergeCells(2,2,2,5); putText(wsRes, 2, 2, ev.titulo || '');
    putText(wsRes, 3, 1, 'Descripción del evento'); wsRes.mergeCells(3,2,4,5); putText(wsRes, 3, 2, ev.descripcion || '');
    wsRes.getCell(3,2).alignment = {vertical:'top', wrapText:true};
    wsRes.getRow(3).height = 95; wsRes.getRow(4).height = 35;
    putText(wsRes, 5, 1, 'Situación del evento'); putText(wsRes, 5, 2, ev.situacion || '');
    putText(wsRes, 6, 1, 'Fecha inicio'); putText(wsRes, 6, 2, ev.fechaIni || '');
    putText(wsRes, 7, 1, 'Fecha fin'); putText(wsRes, 7, 2, ev.fechaFin || '');
    putText(wsRes, 8, 1, 'Precio evento'); putMoney(wsRes, 8, 2, ev.precio || 0);
    putText(wsRes, 10, 1, 'Ingresos'); putMoney(wsRes, 10, 2, budget.operativa.ingresos || 0);
    putText(wsRes, 11, 1, 'Donación de producto'); putMoney(wsRes, 11, 2, budget.donacionProducto.valorDonado || 0);
    putText(wsRes, 12, 1, 'Gastos'); putMoney(wsRes, 12, 2, Number(budget.operativa.gastoCompras || 0) + Number(budget.operativa.gastosOrganizacion || 0) + Number(budget.operativa.pendiente || 0));
    putText(wsRes, 13, 1, 'Saldo actual'); putMoney(wsRes, 13, 2, budget.operativa.saldoActual || 0);
    putText(wsRes, 14, 1, 'Saldo operativo'); putMoney(wsRes, 14, 2, budget.operativa.saldoOperativo || 0);

    const wsIng = baseSheet('INGRESOS', [34,12,18,18,18,18]);
    mergeTitle(wsIng, 1, 'INGRESOS', 6);
    titleRow(wsIng, 3, ['Colaborador/a','Número','Tipo ingreso','Importe socio','Importe no socio','TOTAL']);
    let r = 4;
    let tNum = 0, tSoc = 0, tNoSoc = 0, tTot = 0;
    collabs.forEach(item => {
      const impSoc = item.persona?.rango === 'SOCIO' ? Number(item.base || 0) : 0;
      const impNo = item.persona?.rango === 'SOCIO' ? Number(item.donation || 0) : Number(item.total || 0);
      putText(wsIng, r, 1, item.persona?.nombre || '');
      putNum(wsIng, r, 2, item.numero || 0);
      putText(wsIng, r, 3, item.situacion || '');
      putMoney(wsIng, r, 4, impSoc);
      putMoney(wsIng, r, 5, impNo);
      putMoney(wsIng, r, 6, item.total || 0, item.situacion === 'Pendiente' ? 'warn' : 'white');
      tNum += Number(item.numero || 0); tSoc += impSoc; tNoSoc += impNo; tTot += Number(item.total || 0);
      r += 1;
    });
    titleRow(wsIng, r, ['TOTAL', '', '', '', '', '']);
    putNum(wsIng, r, 2, tNum);
    putMoney(wsIng, r, 4, tSoc);
    putMoney(wsIng, r, 5, tNoSoc);
    putMoney(wsIng, r, 6, tTot);

    const wsCom = baseSheet('COMPRAS Y OTROS GASTOS', [30,12,16,16,26,28,28]);
    mergeTitle(wsCom, 1, 'COMPRAS Y OTROS GASTOS', 7);
    titleRow(wsCom, 3, ['Producto','Unidades','Precio','Importe','Ticket u otros gastos','Tienda','Responsable']);
    r = 4;
    let totalImporteCom = 0, totalPendCom = 0;
    comprasSolo.forEach(item => {
      const importe = Number(item.valor || 0);
      const pending = String(item.ticketDonacion || '').trim() === '';
      putText(wsCom, r, 1, item.producto?.nombre || '');
      putNum(wsCom, r, 2, item.unidades || 0);
      putMoney(wsCom, r, 3, item.precio != null ? item.precio : (item.precioCalc != null ? item.precioCalc : (item.producto?.precio || 0)));
      putMoney(wsCom, r, 4, importe, pending ? 'warn' : 'white');
      putText(wsCom, r, 5, item.ticketDonacion || '');
      putText(wsCom, r, 6, item.tienda?.nombre || '');
      putText(wsCom, r, 7, item.responsable?.nombre || '');
      totalImporteCom += importe;
      if(pending) totalPendCom += importe;
      r += 1;
    });
    titleRow(wsCom, r, ['TOTAL IMPORTE', '', '', '', '', '', '']);
    putMoney(wsCom, r, 4, totalImporteCom);
    r += 1;
    titleRow(wsCom, r, ['TOTAL PTE. COMPRA U OTROS GASTOS', '', '', '', '', '', '']);
    putMoney(wsCom, r, 4, totalPendCom);

    const wsDon = baseSheet('DONACIONES DE PRODUCTO', [30,12,16,18,22,28,28]);
    mergeTitle(wsDon, 1, 'DONACIONES DE PRODUCTO', 7);
    titleRow(wsDon, 3, ['Producto','Unidades','Precio','Valor estimado','Tipo de donación','Donante','Responsable']);
    r = 4;
    let totalValDon = 0;
    donacionesSolo.forEach(item => {
      const donor = (typeof resolveDonorNameV163 === 'function' ? resolveDonorNameV163(item) : '') || donorName(item) || item.donorLabel || item.tienda?.nombre || item.donorRef || '';
      putText(wsDon, r, 1, item.producto?.nombre || '');
      putNum(wsDon, r, 2, item.unidades || 0);
      putMoney(wsDon, r, 3, item.precio != null ? item.precio : (item.precioCalc != null ? item.precioCalc : (item.producto?.precio || 0)));
      putMoney(wsDon, r, 4, item.valor || 0, item.valor === 0 ? 'warn' : 'white');
      putText(wsDon, r, 5, item.ticketDonacion || '');
      putText(wsDon, r, 6, donor);
      putText(wsDon, r, 7, item.responsable?.nombre || '');
      totalValDon += Number(item.valor || 0);
      r += 1;
    });
    titleRow(wsDon, r, ['TOTAL VALOR ESTIMADO', '', '', '', '', '', '']);
    putMoney(wsDon, r, 4, totalValDon);

    const wsSeg = baseSheet('CALCULOS_SEGMENTO', [32,16,16,22,16]);
    mergeTitle(wsSeg, 1, 'CÁLCULOS SEGMENTO', 5);
    titleRow(wsSeg, 3, ['Segmento','Comprado','Donado','Pte. Compra u otros gastos','TOTAL']);
    r = 4;
    let sgC=0, sgD=0, sgP=0, sgT=0;
    segRows.forEach(it => {
      putText(wsSeg, r, 1, it.label || '');
      putMoney(wsSeg, r, 2, it.comprado || 0);
      putMoney(wsSeg, r, 3, it.donado || 0);
      putMoney(wsSeg, r, 4, it.pendiente || 0, (it.pendiente || 0) ? 'warn' : 'white');
      putMoney(wsSeg, r, 5, it.total || 0);
      sgC += Number(it.comprado||0); sgD += Number(it.donado||0); sgP += Number(it.pendiente||0); sgT += Number(it.total||0);
      r += 1;
    });
    titleRow(wsSeg, r, ['TOTAL', '', '', '', '']);
    putMoney(wsSeg, r, 2, sgC); putMoney(wsSeg, r, 3, sgD); putMoney(wsSeg, r, 4, sgP); putMoney(wsSeg, r, 5, sgT);

    const wsDest = baseSheet('CALCULOS_DESTINO', [32,16,16,22,16]);
    mergeTitle(wsDest, 1, 'CÁLCULOS DESTINO', 5);
    titleRow(wsDest, 3, ['Destino','Comprado','Donado','Pte. Compra u otros gastos','TOTAL']);
    r = 4;
    let dsC=0, dsD=0, dsP=0, dsT=0;
    destRows.forEach(it => {
      putText(wsDest, r, 1, it.label || '');
      putMoney(wsDest, r, 2, it.comprado || 0);
      putMoney(wsDest, r, 3, it.donado || 0);
      putMoney(wsDest, r, 4, it.pendiente || 0, (it.pendiente || 0) ? 'warn' : 'white');
      putMoney(wsDest, r, 5, it.total || 0);
      dsC += Number(it.comprado||0); dsD += Number(it.donado||0); dsP += Number(it.pendiente||0); dsT += Number(it.total||0);
      r += 1;
    });
    titleRow(wsDest, r, ['TOTAL', '', '', '', '']);
    putMoney(wsDest, r, 2, dsC); putMoney(wsDest, r, 3, dsD); putMoney(wsDest, r, 4, dsP); putMoney(wsDest, r, 5, dsT);

    const wsTienda = baseSheet('CALCULO_TIENDA_TICKET', [58,20]);
    mergeTitle(wsTienda, 1, 'CÁLCULO TIENDA TICKET', 2);
    titleRow(wsTienda, 3, ['Concepto','Importe']);
    r = 4;
    let tt = 0;
    tiendaRows.forEach(it => {
      putText(wsTienda, r, 1, it.label || it.k || '', it.pending ? 'warn' : 'white');
      putMoney(wsTienda, r, 2, it.v, it.pending ? 'warn' : 'white');
      tt += Number(it.v || 0);
      r += 1;
    });
    titleRow(wsTienda, r, ['TOTAL', '']);
    putMoney(wsTienda, r, 2, tt);

    const wsGraf = baseSheet('GRAFICAS', [24,24,24,24]);
    mergeTitle(wsGraf, 1, 'GRÁFICAS DEL EVENTO', 4);
    const dataUrl = await makeChartImageDataUrlV160();
    addImageToSheet(wsGraf, dataUrl, 3, 1, 1450, 760);

    for(const ws of wb.worksheets){
      try{
        await ws.protect('open_excel_arrastre', {selectLockedCells:true, selectUnlockedCells:true, formatCells:false, formatColumns:false, formatRows:false, insertColumns:false, insertRows:false, insertHyperlinks:false, deleteColumns:false, deleteRows:false, sort:false, autoFilter:false, pivotTables:false});
      }catch(_){}
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileNameV160(ev);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  window.addEventListener('load', () => {
    try{ if(typeof render === 'function') render(); }catch(_){}
  });
})();

;/* ===== END legacy-inline-13.js ===== */


;/* ===== BEGIN legacy-inline-14.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #14. */
/* ==== V16.2 REWORK ==== */
(function(){
  const $ = id => document.getElementById(id);
  const esc = v => typeof escapeHtml === 'function' ? escapeHtml(v) : String(v ?? '');
  const moneyF = v => typeof money === 'function' ? money(Number(v || 0)) : new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0));
  const parseEuro = v => typeof parseEuroInput === 'function' ? parseEuroInput(v) : Number(v || 0);

  function setFound(el){
    if(!el) return;
    document.querySelectorAll('.found-target').forEach(x => x.classList.remove('found-target'));
    el.classList.add('found-target');
    try{ el.scrollIntoView({behavior:'smooth', block:'center'}); }catch(_){}
    setTimeout(() => el.classList.remove('found-target'), 2400);
  }

  function donorDisplayName(c){
    try{
      if(c?.donorLabel && String(c.donorLabel).trim()) return String(c.donorLabel).trim();
      if(c?.donorRef && String(c.donorRef).trim()){
        const raw = String(c.donorRef).trim();
        if(!raw.startsWith('P:') && !raw.startsWith('T:')) return raw;
        if(typeof donorLabel === 'function'){
          const d = donorLabel(raw);
          if(d && String(d).trim()) return String(d).trim();
        }
      }
      if(c?.tiendaId && typeof tiendaById === 'function'){
        const t = tiendaById(c.tiendaId);
        if(t?.nombre && String(t.nombre).trim()) return String(t.nombre).trim();
      }
      if(c?.tienda?.nombre && String(c.tienda.nombre).trim()) return String(c.tienda.nombre).trim();
    }catch(_){}
    return '';
  }

  function allPersons(){ return (typeof personasGenerales === 'function' ? personasGenerales() : (state.personas || [])).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es')); }
  function allProducts(){ return (typeof productosGenerales === 'function' ? productosGenerales() : (state.productos || [])).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es')); }
  function allStores(){ return (typeof tiendasGenerales === 'function' ? tiendasGenerales() : (state.tiendas || [])).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es')); }

  function injectSearch(listId, searchId, selector, getText){
    const wrap = $(listId);
    if(!wrap || wrap.querySelector('.maint-search')) return;
    const search = document.createElement('div');
    search.className = 'maint-search';
    search.innerHTML = `<div class="field"><label>Buscar por nombre</label><input id="${searchId}" placeholder="Escribe para buscar..." /></div><button type="button" class="outline small" id="${searchId}Btn">Buscar</button>`;
    wrap.prepend(search);
    const doSearch = () => {
      const q = String($(searchId)?.value || '').trim().toLowerCase();
      if(!q) return;
      const nodes = Array.from(wrap.querySelectorAll(selector));
      const found = nodes.find(n => String(getText(n) || '').toLowerCase().includes(q));
      if(found) setFound(found.closest('.itemcard') || found);
    };
    $(searchId + 'Btn')?.addEventListener('click', doSearch);
    $(searchId)?.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); doSearch(); } });
  }

  const _renderPersonas = typeof renderPersonas === 'function' ? renderPersonas : null;
  renderPersonas = function(){
    if(_renderPersonas) _renderPersonas();
    injectSearch('personasList', 'personaSearchInput', 'input[data-action="edit-persona-nombre"]', n => n.value);
  };

  const _renderTiendas = typeof renderTiendas === 'function' ? renderTiendas : null;
  renderTiendas = function(){
    if(_renderTiendas) _renderTiendas();
    injectSearch('tiendasList', 'tiendaSearchInput', 'input[data-action="edit-tienda-nombre"]', n => n.value);
  };

  const _renderProductos = typeof renderProductos === 'function' ? renderProductos : null;
  renderProductos = function(){
    if(_renderProductos) _renderProductos();
    injectSearch('productosList', 'productoSearchInput', 'input[data-action="edit-producto-nombre"]', n => n.value);
  };

  const _renderEventos = typeof renderEventos === 'function' ? renderEventos : null;
  renderEventos = function(){
    if(_renderEventos) _renderEventos();
    const newDesc = $('newEventoDescripcion');
    if(newDesc && newDesc.tagName === 'INPUT'){
      const ta = document.createElement('textarea');
      ta.id = 'newEventoDescripcion';
      ta.value = newDesc.value || '';
      ta.placeholder = newDesc.placeholder || '';
      newDesc.replaceWith(ta);
    }
    document.querySelectorAll('#eventosList input[data-action="edit-evento-descripcion"]').forEach(inp => {
      const ta = document.createElement('textarea');
      ta.dataset.action = inp.dataset.action;
      ta.dataset.id = inp.dataset.id;
      ta.value = inp.value || '';
      inp.replaceWith(ta);
    });
  };

  function annotateRows(){
    document.querySelectorAll('#comprasList .itemcard').forEach(card => {
      const sel = card.querySelector('select[data-action="edit-compra-producto"]');
      if(sel){ card.id = 'compraRow_' + sel.dataset.id; card.dataset.productoId = sel.value; }
    });
    document.querySelectorAll('#donacionesList .itemcard').forEach(card => {
      const sel = card.querySelector('select[data-action="edit-donacion-producto"]');
      if(sel){ card.id = 'donacionRow_' + sel.dataset.id; card.dataset.productoId = sel.value; }
    });
  }

  const _renderCompras = typeof renderCompras === 'function' ? renderCompras : null;
  renderCompras = function(){ if(_renderCompras) _renderCompras(); annotateRows(); };

  const _renderDonaciones = typeof renderDonaciones === 'function' ? renderDonaciones : null;
  renderDonaciones = function(){ if(_renderDonaciones) _renderDonaciones(); annotateRows(); };

  function jumpToExisting(section, productoId){
    if(!productoId) return false;
    const compras = typeof comprasForEvent === 'function' ? comprasForEvent() : [];
    if(section === 'compras'){
      const found = compras.find(r => !isDonationTicket(r.ticketDonacion) && r.productoId === productoId);
      if(!found) return false;
      currentMainTab = 'compras';
      showComprasEvent = true;
      render();
      setTimeout(() => setFound($('compraRow_' + found.id)), 80);
      return true;
    }
    if(section === 'donaciones'){
      const found = compras.find(r => isDonationTicket(r.ticketDonacion) && r.productoId === productoId);
      if(!found) return false;
      currentMainTab = 'donaciones';
      showComprasEvent = false;
      render();
      setTimeout(() => setFound($('donacionRow_' + found.id)), 80);
      return true;
    }
    return false;
  }

  document.addEventListener('change', function(e){
    const t = e.target;
    if(!t) return;
    if(false && t.id === 'buyProducto'){
      if(jumpToExisting('compras', t.value)){
        t.value = '';
        e.stopImmediatePropagation();
        return;
      }
    }
    if(t.id === 'donProducto'){
      if(jumpToExisting('donaciones', t.value)){
        t.value = '';
        e.stopImmediatePropagation();
        return;
      }
    }
  }, true);

  function incomeLines(filterFn){
    const rows = typeof collabsForEvent === 'function' ? collabsForEvent() : [];
    return rows.filter(filterFn).map(r => `${r.persona?.nombre || 'Sin nombre'} — ${moneyF(r.total || 0)}`);
  }

  const _renderIngresosSummary = typeof renderIngresosSummary === 'function' ? renderIngresosSummary : null;
  renderIngresosSummary = function(){
    if(_renderIngresosSummary) _renderIngresosSummary();
    const grid = $('ingresosSummaryGrid');
    if(!grid) return;
    Array.from(grid.children).forEach(div => {
      const label = div.querySelector('.label')?.textContent?.trim() || '';
      let lines = [];
      if(label === 'EFECTIVO') lines = incomeLines(r => r.situacion === 'Efectivo');
      else if(label === 'BANCO') lines = incomeLines(r => r.situacion === 'Banco');
      else if(label === 'BIZUM') lines = incomeLines(r => r.situacion === 'Bizum');
      else if(label === 'Pendiente') lines = incomeLines(r => r.situacion === 'Pendiente');
      else if(label === 'TOTAL INGRESOS') lines = incomeLines(() => true);
      div.title = lines.length ? lines.join('\n') : 'Sin registros';
    });
  };

  function groupBreakdownDetailed(kind){
    const compras = typeof comprasForEvent === 'function' ? comprasForEvent() : [];
    const keys = kind === 'segmento' ? (typeof SEGMENT_OPTIONS !== 'undefined' ? SEGMENT_OPTIONS : []) : (typeof DESTINO_OPTIONS !== 'undefined' ? DESTINO_OPTIONS : []);
    return keys.map(k => {
      const match = c => String(kind === 'segmento' ? (c.producto?.segmento || '') : (c.producto?.destino || '')) === k;
      const comprados = compras.filter(c => match(c) && !isDonationTicket(c.ticketDonacion) && String(c.ticketDonacion || '').trim() !== '');
      const donados = compras.filter(c => match(c) && isDonationTicket(c.ticketDonacion));
      const pendientes = compras.filter(c => match(c) && !isDonationTicket(c.ticketDonacion) && String(c.ticketDonacion || '').trim() === '');
      return {
        label:k,
        comprado: comprados.reduce((a,b)=>a+Number(b.valor||0),0),
        donado: donados.reduce((a,b)=>a+Number(b.valor||0),0),
        pendiente: pendientes.reduce((a,b)=>a+Number(b.valor||0),0),
        total: 0,
        listComprado: comprados.map(c => `${c.producto?.nombre || 'Producto'} — ${moneyF(c.valor || 0)}`),
        listDonado: donados.map(c => `${c.producto?.nombre || 'Producto'} — ${moneyF(c.valor || 0)}`),
        listPendiente: pendientes.map(c => `${c.producto?.nombre || 'Producto'} — ${moneyF(c.valor || 0)}`)
      };
    }).map(r => ({...r, total: r.comprado + r.donado + r.pendiente}));
  }
  summaryBySegmento = function(){ return groupBreakdownDetailed('segmento'); };
  summaryByDestino = function(){ return groupBreakdownDetailed('destino'); };

  const _renderSummaryList = typeof renderSummaryList === 'function' ? renderSummaryList : null;
  renderSummaryList = function(targetId, rows){
    if(targetId === 'summarySegmento'){
      const wrap = $(targetId);
      if(!wrap) return;
      wrap.innerHTML = '';
      const maxVal = Math.max(1, ...rows.flatMap(r => [Number(r.comprado||0), Number(r.donado||0), Number(r.pendiente||0)]));
      const totalGeneral = rows.reduce((a,b)=>a+Number(b.total||0),0);
      const head = document.createElement('div');
      head.className = 'vbars-wrap';
      head.innerHTML = `
        <div class="vbars-total">Por segmento – TOTAL GENERAL: ${esc(moneyF(totalGeneral))}</div>
        <div class="chart-note"><span><span class="legend-dot" style="background:#dc2626"></span>Comprado</span> <span><span class="legend-dot" style="background:#f59e0b"></span>Donado</span> <span><span class="legend-dot" style="background:#fb7185"></span>Pte. Compra u otros gastos</span></div>
      `;
      wrap.appendChild(head);
      const grid = document.createElement('div');
      grid.className = 'vbars-grid';
      rows.forEach(r => {
        const h1 = Math.max(8, (Number(r.comprado||0) / maxVal) * 170);
        const h2 = Math.max(8, (Number(r.donado||0) / maxVal) * 170);
        const h3 = Math.max(8, (Number(r.pendiente||0) / maxVal) * 170);
        const card = document.createElement('div');
        card.className = 'vbars-card';
        card.innerHTML = `
          <div class="vbars-title">${esc(r.label)} · ${esc(moneyF(r.total))}</div>
          <div class="vbars-chart">
            <div class="vbar-col" title="${esc((r.listComprado.length ? r.listComprado.join('\n') : 'Sin productos'))}">
              <div class="vbar-value">${esc(moneyF(r.comprado))}</div>
              <div class="vbar-stick" style="height:${h1}px;background:#dc2626"></div>
              <div class="vbar-label">Comprado</div>
            </div>
            <div class="vbar-col" title="${esc((r.listDonado.length ? r.listDonado.join('\n') : 'Sin productos'))}">
              <div class="vbar-value">${esc(moneyF(r.donado))}</div>
              <div class="vbar-stick" style="height:${h2}px;background:#f59e0b"></div>
              <div class="vbar-label">Donado</div>
            </div>
            <div class="vbar-col" title="${esc((r.listPendiente.length ? r.listPendiente.join('\n') : 'Sin productos'))}">
              <div class="vbar-value">${esc(moneyF(r.pendiente))}</div>
              <div class="vbar-stick" style="height:${h3}px;background:#fb7185"></div>
              <div class="vbar-label">Pte. Compra u otros gastos</div>
            </div>
          </div>
        `;
        grid.appendChild(card);
      });
      wrap.appendChild(grid);
      const destinoCard = $('summaryDestino')?.closest('.summary-card');
      if(destinoCard) destinoCard.style.display = 'none';
      return;
    }
    if(targetId === 'summaryDestino'){
      const wrap = $(targetId);
      if(wrap) wrap.innerHTML = '';
      const destinoCard = wrap?.closest('.summary-card');
      if(destinoCard) destinoCard.style.display = 'none';
      return;
    }
    if(_renderSummaryList) return _renderSummaryList(targetId, rows);
  };

  const _renderGraficas = typeof renderGraficas === 'function' ? renderGraficas : null;
  renderGraficas = function(){
    if(_renderGraficas) _renderGraficas();
    const wrap = $('eventChartWrap');
    if(!wrap) return;
    const g = typeof graphDataV160 === 'function' ? graphDataV160() : null;
    if(!g) return;
    const tracks = wrap.querySelectorAll('.chart-track');
    const incomeDetails = {
      'Socios Banco': incomeLines(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Banco'),
      'Socios Bizum': incomeLines(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Bizum'),
      'Socios Efectivo': incomeLines(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Efectivo'),
      'No socios Banco': incomeLines(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Banco'),
      'No socios Bizum': incomeLines(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Bizum'),
      'No socios Efectivo': incomeLines(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Efectivo'),
      'Pendiente de ingresar': incomeLines(r => r.situacion === 'Pendiente')
    };
    const donationDetails = {
      'Donado por tiendas': donationLines('DONADO TIENDA'),
      'Donado por socios': donationLines('DONADO SOCIO'),
      'Donado por no socios': donationLines('DONADO OTROS')
    };
    const expenseDetails = {
      'Gastado en TKxx': (typeof comprasForEvent === 'function' ? comprasForEvent() : []).filter(r => !isDonationTicket(r.ticketDonacion) && !isCurrentExpenseTicket(r.ticketDonacion) && String(r.ticketDonacion || '').trim() !== '').map(r => `${r.producto?.nombre || 'Producto'} — ${r.ticketDonacion} — ${moneyF(r.valor || 0)}`),
      'Gastos corrientes': (typeof comprasForEvent === 'function' ? comprasForEvent() : []).filter(r => isCurrentExpenseTicket(r.ticketDonacion)).map(r => `${r.producto?.nombre || 'Producto'} — ${moneyF(r.valor || 0)}`),
      'Pte. Compra u otros gastos': (typeof comprasForEvent === 'function' ? comprasForEvent() : []).filter(r => !isDonationTicket(r.ticketDonacion) && String(r.ticketDonacion || '').trim() === '').map(r => `${r.producto?.nombre || 'Producto'} — ${moneyF(r.valor || 0)}`)
    };
    if(tracks[0]){
      const titles = ['Socios Banco','Socios Bizum','Socios Efectivo','No socios Banco','No socios Bizum','No socios Efectivo','Pendiente de ingresar'];
      Array.from(tracks[0].children).filter(n => n.classList?.contains('chart-seg')).forEach((seg, i) => {
        const key = titles[i];
        seg.title = `${key}: ${seg.title.split(': ').slice(-1)[0]}\n${(incomeDetails[key]||['Sin registros']).join('\n')}`;
      });
    }
    if(tracks[1]){
      const titles = ['Donado por tiendas','Donado por socios','Donado por no socios'];
      Array.from(tracks[1].children).filter(n => n.classList?.contains('chart-seg')).forEach((seg, i) => {
        const key = titles[i];
        seg.title = `${key}: ${seg.title.split(': ').slice(-1)[0]}\n${(donationDetails[key]||['Sin registros']).join('\n')}`;
      });
    }
    if(tracks[2]){
      const titles = ['Gastado en TKxx','Gastos corrientes','Pte. Compra u otros gastos'];
      Array.from(tracks[2].children).filter(n => n.classList?.contains('chart-seg')).forEach((seg, i) => {
        const key = titles[i];
        seg.title = `${key}: ${seg.title.split(': ').slice(-1)[0]}\n${(expenseDetails[key]||['Sin registros']).join('\n')}`;
      });
    }
  };

  window.addEventListener('load', () => {
    try{ if(typeof render === 'function') render(); }catch(_){}
  });
})();

;/* ===== END legacy-inline-14.js ===== */


;/* ===== BEGIN legacy-inline-15.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #15. */
/* ==== V16.2 FIXES ==== */
(function(){
  const $ = id => document.getElementById(id);
  const esc = v => typeof escapeHtml === 'function' ? escapeHtml(v) : String(v ?? '');
  const moneyF = v => typeof money === 'function' ? money(Number(v || 0)) : new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0));
  const euroF = v => typeof euroInputValue === 'function' ? euroInputValue(Number(v || 0)) : moneyF(v);
  const parseEuro = v => typeof parseEuroInput === 'function' ? parseEuroInput(v) : Number(v || 0);

  function setFoundV162(el){
    if(!el) return;
    document.querySelectorAll('.found-target').forEach(x => x.classList.remove('found-target'));
    el.classList.add('found-target');
    try{ el.scrollIntoView({behavior:'smooth', block:'center'}); }catch(_){ try{ el.scrollIntoView(); }catch(__){} }
    setTimeout(() => el.classList.remove('found-target'), 2800);
  }

  function allPeopleV162(){ return (typeof personasGenerales === 'function' ? personasGenerales() : (state.personas || [])).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es')); }
  function allProductsV162(){ return (typeof productosGenerales === 'function' ? productosGenerales() : (state.productos || [])).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es')); }
  function allStoresV162(){ return (typeof tiendasGenerales === 'function' ? tiendasGenerales() : (state.tiendas || [])).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es')); }
  function allSociosV162(){ return allPeopleV162().filter(p => String(p.rango || '').trim().toUpperCase() === 'SOCIO'); }
  function priceRefV162(p){ return Number((p && (p.defaultPrecio ?? p.precio)) || 0); }

  function donorNameV162(c){
    try{
      if(c?.donorLabel && String(c.donorLabel).trim()) return String(c.donorLabel).trim();
      if(c?.donorRef && String(c.donorRef).trim()){
        const raw = String(c.donorRef).trim();
        if(!raw.startsWith('P:') && !raw.startsWith('T:')) return raw;
        const [kind, id] = raw.split(':');
        if(kind === 'P') return (typeof personaById === 'function' ? personaById(id)?.nombre : '') || '';
        if(kind === 'T') return (typeof tiendaById === 'function' ? tiendaById(id)?.nombre : '') || '';
      }
      if(c?.tiendaId && typeof tiendaById === 'function'){
        const t = tiendaById(c.tiendaId);
        if(t?.nombre) return t.nombre;
      }
      if(c?.tienda?.nombre) return c.tienda.nombre;
    }catch(_){ }
    return '';
  }

  function annotateRowsV162(){
    document.querySelectorAll('#collabList .itemcard').forEach(card => {
      const sel = card.querySelector('select[data-action="edit-collab-persona"]');
      if(sel){ card.id = 'collabRow_' + sel.dataset.id; card.dataset.personaId = sel.value; }
    });
    document.querySelectorAll('#comprasList .itemcard').forEach(card => {
      const sel = card.querySelector('select[data-action="edit-compra-producto"]');
      if(sel){ card.id = 'compraRow_' + sel.dataset.id; card.dataset.productoId = sel.value; }
    });
    document.querySelectorAll('#donacionesList .itemcard').forEach(card => {
      const sel = card.querySelector('select[data-action="edit-donacion-producto"]');
      if(sel){ card.id = 'donacionRow_' + sel.dataset.id; card.dataset.productoId = sel.value; }
    });
  }

  const _renderColabsV162 = typeof renderColabs === 'function' ? renderColabs : null;
  renderColabs = function(){ if(_renderColabsV162) _renderColabsV162(); annotateRowsV162(); };

  const _renderComprasV162 = typeof renderCompras === 'function' ? renderCompras : null;
  renderCompras = function(){ if(_renderComprasV162) _renderComprasV162(); annotateRowsV162(); };

  renderDonaciones = function(){
    const wrap = $('donacionesList');
    if(!wrap) return;
    let rows = (typeof comprasForEvent === 'function' ? comprasForEvent() : []).filter(r => typeof isDonationTicket === 'function' && isDonationTicket(r.ticketDonacion)).slice();
    const sorts = {
      producto:(a,b)=> (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es'),
      ticket:(a,b)=> String(a.ticketDonacion||'').localeCompare(String(b.ticketDonacion||''),'es'),
      donante:(a,b)=> donorNameV162(a).localeCompare(donorNameV162(b),'es'),
      responsable:(a,b)=> (a.responsable?.nombre||'').localeCompare((b.responsable?.nombre||''),'es')
    };
    rows.sort((a,b)=>{
      const fn = sorts[state.donacionesSort] || sorts.producto;
      const v = fn(a,b);
      return v !== 0 ? v : (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es');
    });
    if(!rows.length){ wrap.innerHTML = '<div class="empty">Todavía no hay donaciones de producto para este evento.</div>'; return; }

    const productos = allProductsV162();
    const socios = allSociosV162();
    const donors = (typeof donorOptions === 'function' ? donorOptions() : []).slice().sort((a,b)=>(a.label||'').localeCompare((b.label||''),'es'));
    wrap.innerHTML = '<div class="hint">Ordenar por: <a href="#" onclick="state.donacionesSort=\'producto\'; renderDonaciones(); return false;">Producto</a> · <a href="#" onclick="state.donacionesSort=\'ticket\'; renderDonaciones(); return false;">Tipo de donación</a> · <a href="#" onclick="state.donacionesSort=\'donante\'; renderDonaciones(); return false;">Donante</a> · <a href="#" onclick="state.donacionesSort=\'responsable\'; renderDonaciones(); return false;">Responsable</a></div>';
    rows.forEach(r => {
      const precioVal = Number(r.precio != null ? r.precio : (r.precioCalc != null ? r.precioCalc : priceRefV162(r.producto)));
      const valorVal = precioVal * Number(r.unidades || 0);
      const row = document.createElement('div');
      row.className = 'itemcard';
      row.id = 'donacionRow_' + r.id;
      row.dataset.productoId = r.productoId || '';
      row.innerHTML = `
        <div class="rowline compra">
          <div class="field"><label>Producto</label><select data-action="edit-donacion-producto" data-id="${r.id}">${productos.map(p => `<option value="${p.id}" ${p.id===r.productoId?'selected':''}>${esc(p.nombre)}</option>`).join('')}</select></div>
          <div class="field"><label>Unidades</label><input type="number" min="0" step="0.01" value="${Number(r.unidades||0)}" data-action="edit-donacion-unidades" data-id="${r.id}" /></div>
          <div class="field"><label>Precio</label><input class="money-text" type="text" value="${euroF(precioVal)}" data-action="edit-donacion-precio" data-id="${r.id}" /></div>
          <div class="field"><label>Valor</label><input class="soft-readonly" readonly value="${moneyF(valorVal)}" /></div>
          <div class="field"><label>Tipo de donación</label><select data-action="edit-donacion-ticket" data-id="${r.id}">${DONATION_TICKET_OPTIONS.map(v => `<option value="${v}" ${v===r.ticketDonacion?'selected':''}>${esc(v)}</option>`).join('')}</select></div>
          <div class="field"><label>Donante</label><select data-action="edit-donacion-donante" data-id="${r.id}"><option value="" ${!r.donorRef?'selected':''}>-- elige donante --</option>${donors.map(d => `<option value="${d.value}" ${d.value===r.donorRef?'selected':''}>${esc(d.label)}</option>`).join('')}</select></div>
          <div class="field"><label>Responsable</label><select data-action="edit-donacion-responsable" data-id="${r.id}"><option value="" ${!r.responsableId?'selected':''}>-- sin responsable --</option>${socios.map(p => `<option value="${p.id}" ${p.id===r.responsableId?'selected':''}>${esc(p.nombre)}</option>`).join('')}</select></div>
          <div style="display:flex;gap:8px;align-items:end"><button type="button" class="modify small" data-action="save-donacion" data-id="${r.id}">Modificar</button><button type="button" class="danger small" data-action="delete-donacion" data-id="${r.id}">Eliminar</button></div>
        </div>`;
      wrap.appendChild(row);
    });
    annotateRowsV162();
  };

  function jumpToExistingV162(section, id){
    if(!id) return false;
    if(section === 'ingresos'){
      const found = (typeof collabsForEvent === 'function' ? collabsForEvent() : []).find(r => r.personaId === id);
      if(!found) return false;
      currentMainTab = 'ingresos';
      render();
      setTimeout(() => setFoundV162($('collabRow_' + found.id)), 80);
      return true;
    }
    const rows = typeof comprasForEvent === 'function' ? comprasForEvent() : [];
    if(section === 'compras'){
      const found = rows.find(r => !(typeof isDonationTicket === 'function' && isDonationTicket(r.ticketDonacion)) && r.productoId === id);
      if(!found) return false;
      currentMainTab = 'compras';
      showComprasEvent = true;
      render();
      setTimeout(() => setFoundV162($('compraRow_' + found.id)), 80);
      return true;
    }
    if(section === 'donaciones'){
      const found = rows.find(r => typeof isDonationTicket === 'function' && isDonationTicket(r.ticketDonacion) && r.productoId === id);
      if(!found) return false;
      currentMainTab = 'donaciones';
      render();
      setTimeout(() => setFoundV162($('donacionRow_' + found.id)), 80);
      return true;
    }
    return false;
  }

  document.addEventListener('change', function(e){
    const t = e.target;
    if(!t || (typeof isLocked === 'function' && isLocked())) return;
    if(t.id === 'collabPersona' && jumpToExistingV162('ingresos', t.value)){ t.value = ''; e.preventDefault(); e.stopImmediatePropagation(); return; }
    if(false && t.id === 'buyProducto' && jumpToExistingV162('compras', t.value)){ t.value = ''; e.preventDefault(); e.stopImmediatePropagation(); return; }
    if(false && t.id === 'donProducto' && jumpToExistingV162('donaciones', t.value)){ t.value = ''; e.preventDefault(); e.stopImmediatePropagation(); return; }
  }, true);

  const _addDonationV162 = typeof addDonation === 'function' ? addDonation : null;
  addDonation = function(){
    if(!selectedEvent()) return;
    const productId = $('donProducto')?.value || '';
    if(!productId) return;
    if(false && jumpToExistingV162('donaciones', productId)) return;
    if(_addDonationV162) _addDonationV162();
    currentMainTab = 'donaciones';
    render();
  };

  const _addCompraV162 = typeof addCompra === 'function' ? addCompra : null;
  addCompra = function(){
    if(!selectedEvent()) return;
    const productId = $('buyProducto')?.value || '';
    if(!productId) return;
    if(false && jumpToExistingV162('compras', productId)) return;
    if(_addCompraV162) _addCompraV162();
    currentMainTab = 'compras';
    showComprasEvent = true;
    render();
  };

  const _addColabV162 = typeof addColab === 'function' ? addColab : null;
  addColab = function(){
    if(!selectedEvent()) return;
    const personaId = $('collabPersona')?.value || '';
    if(!personaId) return;
    if(jumpToExistingV162('ingresos', personaId)) return;
    if(_addColabV162) _addColabV162();
    currentMainTab = 'ingresos';
    render();
  };

  renderMaintenanceTabs = function(){
    const tabs = [
      ['personas','mtPersonas','mtPersonasBtn'],
      ['eventos','mtEventos','mtEventosBtn'],
      ['tiendas','mtTiendas','mtTiendasBtn'],
      ['productos','mtProductos','mtProductosBtn'],
      ['importar','mtImportar','btnOpenImport'],
      ['acceso','mtAcceso','mtAccesoBtn']
    ];
    tabs.forEach(([key, cardId, btnId]) => {
      const card = $(cardId), btn = $(btnId);
      if(card) card.classList.toggle('hidden', currentMaintTab !== key || (key === 'acceso' && !(typeof isGodRole === 'function' && isGodRole())));
      if(btn) btn.classList.toggle('active', currentMaintTab === key);
    });
  };

  document.addEventListener('click', function(e){
    const btn = e.target.closest('button');
    if(!btn) return;
    const map = {mtPersonasBtn:'personas', mtEventosBtn:'eventos', mtTiendasBtn:'tiendas', mtProductosBtn:'productos', btnOpenImport:'importar'};
    const tab = map[btn.id];
    if(!tab) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    currentMaintTab = tab;
    const wrapper = $('maintenanceWrapper');
    if(wrapper) wrapper.classList.remove('hidden');
    try{ renderMaintenance(); }catch(_){ try{ renderMaintenanceTabs(); }catch(__){} }
    try{ renderPermissions(); renderLockState(); }catch(_){ }
  }, true);

  function groupBreakdownV162(kind){
    const compras = typeof comprasForEvent === 'function' ? comprasForEvent() : [];
    const keys = kind === 'segmento' ? (typeof SEGMENT_OPTIONS !== 'undefined' ? SEGMENT_OPTIONS : []) : (typeof DESTINO_OPTIONS !== 'undefined' ? DESTINO_OPTIONS : []);
    return keys.map(k => {
      const match = c => String(kind === 'segmento' ? (c.producto?.segmento || '') : (c.producto?.destino || '')) === k;
      const comprados = compras.filter(c => match(c) && !(typeof isDonationTicket === 'function' && isDonationTicket(c.ticketDonacion)) && !(typeof isCurrentExpenseTicket === 'function' && isCurrentExpenseTicket(c.ticketDonacion)) && String(c.ticketDonacion || '').trim() !== '');
      const donados = compras.filter(c => match(c) && typeof isDonationTicket === 'function' && isDonationTicket(c.ticketDonacion));
      const pendientes = compras.filter(c => match(c) && !(typeof isDonationTicket === 'function' && isDonationTicket(c.ticketDonacion)) && String(c.ticketDonacion || '').trim() === '');
      const comprado = comprados.reduce((a,b)=>a+Number(b.valor||0),0);
      const donado = donados.reduce((a,b)=>a+Number(b.valor||0),0);
      const pendiente = pendientes.reduce((a,b)=>a+Number(b.valor||0),0);
      return {
        label:k,
        comprado,
        donado,
        pendiente,
        total: comprado + donado + pendiente,
        listComprado: comprados.map(c => `${c.producto?.nombre || 'Producto'} — ${c.tienda?.nombre || ''} — ${c.ticketDonacion || ''} — ${moneyF(c.valor || 0)}`),
        listDonado: donados.map(c => `${donorNameV162(c) || 'Sin donante'} — ${c.producto?.nombre || 'Producto'} — ${moneyF(c.valor || 0)}`),
        listPendiente: pendientes.map(c => `${c.producto?.nombre || 'Producto'} — ${moneyF(c.valor || 0)}`)
      };
    });
  }
  summaryBySegmento = function(){ return groupBreakdownV162('segmento'); };
  summaryByDestino = function(){ return groupBreakdownV162('destino'); };

  const _renderSummaryListV162 = typeof renderSummaryList === 'function' ? renderSummaryList : null;
  renderSummaryList = function(targetId, rows){
    if(targetId === 'summarySegmento' || targetId === 'summaryDestino'){
      const wrap = $(targetId);
      if(!wrap) return;
      const card = wrap.closest('.summary-card');
      if(card) card.style.display = '';
      wrap.innerHTML = '';
      const maxVal = Math.max(1, ...rows.flatMap(r => [Number(r.comprado||0), Number(r.donado||0), Number(r.pendiente||0)]));
      const totalGeneral = rows.reduce((a,b)=>a+Number(b.total||0),0);
      const title = targetId === 'summarySegmento' ? 'Por segmento' : 'Por destino';
      const head = document.createElement('div');
      head.className = 'vbars-wrap';
      head.innerHTML = `<div class="vbars-total">${title} – TOTAL GENERAL: ${esc(moneyF(totalGeneral))}</div><div class="chart-note"><span><span class="legend-dot" style="background:#dc2626"></span>Comprado</span> <span><span class="legend-dot" style="background:#f59e0b"></span>Donado</span> <span><span class="legend-dot" style="background:#fb7185"></span>Pte. Compra u otros gastos</span></div>`;
      wrap.appendChild(head);
      const grid = document.createElement('div');
      grid.className = 'vbars-grid';
      rows.forEach(r => {
        const h1 = Math.max(8, (Number(r.comprado||0) / maxVal) * 170);
        const h2 = Math.max(8, (Number(r.donado||0) / maxVal) * 170);
        const h3 = Math.max(8, (Number(r.pendiente||0) / maxVal) * 170);
        const cardDiv = document.createElement('div');
        cardDiv.className = 'vbars-card';
        cardDiv.innerHTML = `
          <div class="vbars-title">${esc(r.label)} · ${esc(moneyF(r.total))}</div>
          <div class="vbars-chart">
            <div class="vbar-col" title="${esc((r.listComprado?.length ? r.listComprado.join('\n') : 'Sin productos'))}"><div class="vbar-value">${esc(moneyF(r.comprado))}</div><div class="vbar-stick" style="height:${h1}px;background:#dc2626"></div><div class="vbar-label">Comprado</div></div>
            <div class="vbar-col" title="${esc((r.listDonado?.length ? r.listDonado.join('\n') : 'Sin productos'))}"><div class="vbar-value">${esc(moneyF(r.donado))}</div><div class="vbar-stick" style="height:${h2}px;background:#f59e0b"></div><div class="vbar-label">Donado</div></div>
            <div class="vbar-col" title="${esc((r.listPendiente?.length ? r.listPendiente.join('\n') : 'Sin productos'))}"><div class="vbar-value">${esc(moneyF(r.pendiente))}</div><div class="vbar-stick" style="height:${h3}px;background:#fb7185"></div><div class="vbar-label">Pte. Compra u otros gastos</div></div>
          </div>`;
        grid.appendChild(cardDiv);
      });
      wrap.appendChild(grid);
      return;
    }
    if(_renderSummaryListV162) return _renderSummaryListV162(targetId, rows);
  };

  function linesIncomeV162(fn){ return (typeof collabsForEvent === 'function' ? collabsForEvent() : []).filter(fn).map(r => `${r.persona?.nombre || 'Sin nombre'} — ${moneyF(r.total || 0)}`); }
  function linesDonationV162(ticket){ return (typeof comprasForEvent === 'function' ? comprasForEvent() : []).filter(r => String(r.ticketDonacion || '').trim() === ticket).map(r => `${donorNameV162(r) || 'Sin donante'} — ${r.producto?.nombre || 'Producto'} — ${moneyF(r.valor || 0)}`); }
  function linesExpenseV162(fn){ return (typeof comprasForEvent === 'function' ? comprasForEvent() : []).filter(fn).map(r => `${r.tienda?.nombre || 'Sin tienda'} — ${r.ticketDonacion || 'Pte.Compra u otros gastos'} — ${r.producto?.nombre || 'Producto'} — ${moneyF(r.valor || 0)}`); }
  function segHtmlV162(value, maxVal, color, title){
    const w = (Math.max(0, Number(value || 0)) / maxVal) * 100;
    return `<div class="chart-seg" title="${esc(title)}" style="width:${w}%;background:${color};"></div>`;
  }
  function legendHtmlV162(items){
    return `<div class="chart-note" style="display:flex;flex-wrap:wrap;gap:10px 16px;margin-top:8px">${items.filter(x => Number(x.value||0) !== 0).map(x => `<span><span class="legend-dot" style="background:${x.color}"></span>${esc(x.label)}: ${esc(moneyF(x.value))}</span>`).join('')}</div>`;
  }

  renderGraficas = function(){
    const wrap = $('eventChartWrap');
    if(!wrap) return;
    const rows = typeof collabsForEvent === 'function' ? collabsForEvent() : [];
    const compras = typeof comprasForEvent === 'function' ? comprasForEvent() : [];
    const sum = arr => arr.reduce((a,b)=>a+Number(b||0),0);
    const incomeItems = [
      {label:'Socios Banco', value:sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Banco').map(r => r.total)), color:'#2563eb', lines:linesIncomeV162(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Banco')},
      {label:'Socios Bizum', value:sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Bizum').map(r => r.total)), color:'#16a34a', lines:linesIncomeV162(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Bizum')},
      {label:'Socios Efectivo', value:sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Efectivo').map(r => r.total)), color:'#84cc16', lines:linesIncomeV162(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Efectivo')},
      {label:'No socios Banco', value:sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Banco').map(r => r.total)), color:'#60a5fa', lines:linesIncomeV162(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Banco')},
      {label:'No socios Bizum', value:sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Bizum').map(r => r.total)), color:'#34d399', lines:linesIncomeV162(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Bizum')},
      {label:'No socios Efectivo', value:sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Efectivo').map(r => r.total)), color:'#bef264', lines:linesIncomeV162(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Efectivo')},
      {label:'Pendiente de ingresar', value:sum(rows.filter(r => r.situacion === 'Pendiente').map(r => r.total)), color:'#f59e0b', lines:linesIncomeV162(r => r.situacion === 'Pendiente')}
    ];
    const donationItems = [
      {label:'Donado por tiendas', value:sum(compras.filter(r => String(r.ticketDonacion||'').trim()==='DONADO TIENDA').map(r=>r.valor)), color:'#fcd34d', lines:linesDonationV162('DONADO TIENDA')},
      {label:'Donado por socios', value:sum(compras.filter(r => String(r.ticketDonacion||'').trim()==='DONADO SOCIO').map(r=>r.valor)), color:'#f59e0b', lines:linesDonationV162('DONADO SOCIO')},
      {label:'Donado por no socios', value:sum(compras.filter(r => String(r.ticketDonacion||'').trim()==='DONADO OTROS').map(r=>r.valor)), color:'#b45309', lines:linesDonationV162('DONADO OTROS')}
    ];
    const expenseItems = [
      {label:'Gastado por ticket', value:sum(compras.filter(r => !(typeof isDonationTicket === 'function' && isDonationTicket(r.ticketDonacion)) && !(typeof isCurrentExpenseTicket === 'function' && isCurrentExpenseTicket(r.ticketDonacion)) && String(r.ticketDonacion || '').trim() !== '').map(r=>r.valor)), color:'#dc2626', lines:linesExpenseV162(r => !(typeof isDonationTicket === 'function' && isDonationTicket(r.ticketDonacion)) && !(typeof isCurrentExpenseTicket === 'function' && isCurrentExpenseTicket(r.ticketDonacion)) && String(r.ticketDonacion || '').trim() !== '')},
      {label:'Gastos corrientes', value:sum(compras.filter(r => typeof isCurrentExpenseTicket === 'function' && isCurrentExpenseTicket(r.ticketDonacion)).map(r=>r.valor)), color:'#ef4444', lines:linesExpenseV162(r => typeof isCurrentExpenseTicket === 'function' && isCurrentExpenseTicket(r.ticketDonacion))},
      {label:'Pendiente de compra', value:sum(compras.filter(r => !(typeof isDonationTicket === 'function' && isDonationTicket(r.ticketDonacion)) && String(r.ticketDonacion || '').trim() === '').map(r=>r.valor)), color:'#fb7185', lines:linesExpenseV162(r => !(typeof isDonationTicket === 'function' && isDonationTicket(r.ticketDonacion)) && String(r.ticketDonacion || '').trim() === '')}
    ];
    const totalIncome = incomeItems.reduce((a,b)=>a+Number(b.value||0),0);
    const totalDon = donationItems.reduce((a,b)=>a+Number(b.value||0),0);
    const totalExp = expenseItems.reduce((a,b)=>a+Number(b.value||0),0);
    const saldoActual = totalIncome - expenseItems.slice(0,2).reduce((a,b)=>a+Number(b.value||0),0);
    const saldoOperativo = totalIncome - totalExp;
    const saldoItems = [{label:'Saldo operativo', value:Math.abs(saldoOperativo), color:saldoOperativo >= 0 ? '#155e75' : '#7f1d1d', lines:[`Saldo operativo: ${moneyF(saldoOperativo)}`]}];
    const maxVal = Math.max(1, totalIncome, totalDon, totalExp, Math.abs(saldoActual), Math.abs(saldoOperativo));
    function row(label, total, items){
      return `<div class="chart-row"><div class="chart-label">${esc(label)}: ${esc(moneyF(total))}</div><div><div class="chart-track">${items.map(it => segHtmlV162(it.value, maxVal, it.color, `${it.label}: ${moneyF(it.value)}\n${(it.lines && it.lines.length ? it.lines : ['Sin registros']).join('\n')}`)).join('')}</div>${legendHtmlV162(items)}</div></div>`;
    }
    wrap.innerHTML = `<div class="chart-shell"><div class="chart-bars">${row('INGRESOS', totalIncome, incomeItems)}${row('DONACIÓN DE PRODUCTO', totalDon, donationItems)}${row('GASTOS', totalExp, expenseItems)}${row('SALDO OPERATIVO', saldoOperativo, saldoItems)}</div></div>`;
  };

  const _renderBudgetV162 = typeof renderBudget === 'function' ? renderBudget : null;
  renderBudget = function(){ if(_renderBudgetV162) _renderBudgetV162(); };

  window.addEventListener('load', () => { try{ if(typeof render === 'function') render(); }catch(_){} });
})();

;/* ===== END legacy-inline-15.js ===== */


;/* ===== BEGIN legacy-inline-16.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #16. */
/* ==== V16.3 FIX DONANTE + SALDO OPERATIVO ==== */
(function(){
  const esc = v => typeof escapeHtml === 'function' ? escapeHtml(v) : String(v ?? '');
  const moneyF = v => typeof money === 'function'
    ? money(Number(v || 0))
    : new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0));

  const isDon = t => typeof isDonationTicket === 'function' && isDonationTicket(t);
  const isCurrent = t => typeof isCurrentExpenseTicket === 'function' && isCurrentExpenseTicket(t);
  const norm = v => String(v ?? '').trim();

  function findById(list, id){
    const sid = norm(id);
    if(!sid) return null;
    return (list || []).find(x => norm(x.id) === sid || norm(x.codigo) === sid || norm(x.nombre) === sid) || null;
  }

  function personName(id){
    try{
      const p = typeof personaById === 'function' ? personaById(id) : findById(state?.personas || [], id);
      return norm(p?.nombre);
    }catch(_){ return ''; }
  }

  function storeName(id){
    try{
      const t = typeof tiendaById === 'function' ? tiendaById(id) : findById(state?.tiendas || [], id);
      return norm(t?.nombre);
    }catch(_){ return ''; }
  }

  function resolveDonorNameV163(c){
    try{
      if(c?.donorLabel && norm(c.donorLabel)) return norm(c.donorLabel);
      const raw = norm(c?.donorRef);
      if(raw){
        if(typeof donorLabel === 'function'){
          const dl = norm(donorLabel(raw));
          if(dl) return dl;
        }
        const parts = raw.split(':');
        if(parts.length >= 2){
          const kind = norm(parts[0]).toUpperCase();
          const id = parts.slice(1).join(':');
          if(kind === 'P' || kind === 'PERSONA' || kind === 'PERSONAS'){
            const n = personName(id);
            if(n) return n;
          }
          if(kind === 'T' || kind === 'TIENDA' || kind === 'TIENDAS'){
            const n = storeName(id);
            if(n) return n;
          }
        }
        // Si por algún motivo se guardó sólo el id o el nombre, intentarlo igualmente.
        const byPerson = personName(raw);
        if(byPerson) return byPerson;
        const byStore = storeName(raw);
        if(byStore) return byStore;
        // Último recurso: evitar celda vacía si el valor guardado era un texto útil.
        if(!/^[PT]:/i.test(raw)) return raw;
      }
      const byTiendaId = storeName(c?.tiendaId);
      if(byTiendaId) return byTiendaId;
      if(c?.tienda?.nombre && norm(c.tienda.nombre)) return norm(c.tienda.nombre);
    }catch(_){ }
    return '';
  }
  window.resolveDonorNameV163 = resolveDonorNameV163;

  // Rehidrata compras/donaciones desde state para que pantalla, globos y Excel usen el mismo donante correcto.
  const previousComprasForEventV163 = typeof comprasForEvent === 'function' ? comprasForEvent : null;
  comprasForEvent = function(){
    try{
      const eventId = state?.selectedEventId;
      const rawRows = (state?.compras || []).filter(c => c.eventId === eventId);
      return rawRows.map(c => {
        const productoBase = (typeof productoById === 'function' ? productoById(c.productoId) : findById(state?.productos || [], c.productoId)) || {};
        const precio = Number(c.precio != null && c.precio !== '' ? c.precio : ((productoBase.defaultPrecio ?? productoBase.precio) || 0));
        const unidades = Number(c.unidades || 0);
        const valor = precio * unidades;
        const donation = isDon(c.ticketDonacion);
        const donor = donation ? resolveDonorNameV163(c) : '';
        const tiendaObj = donation
          ? {id: c.donorRef || c.tiendaId || '', nombre: donor}
          : ((typeof tiendaById === 'function' ? tiendaById(c.tiendaId || '') : findById(state?.tiendas || [], c.tiendaId)) || {id:'', nombre:''});
        return {
          ...c,
          producto: {...productoBase, precio},
          precioCalc: precio,
          valor,
          importe: donation ? 0 : valor,
          tienda: tiendaObj,
          responsable: (typeof personaById === 'function' ? personaById(c.responsableId || '') : findById(state?.personas || [], c.responsableId)) || null,
          donorLabel: donor
        };
      });
    }catch(err){
      return previousComprasForEventV163 ? previousComprasForEventV163() : [];
    }
  };

  function listTitleV163(items, emptyText='Sin elementos'){
    const arr = (items || []).filter(Boolean);
    return arr.length ? arr.join('\n') : emptyText;
  }

  function collabItemsV163(filterFn){
    return (typeof collabsForEvent === 'function' ? collabsForEvent() : [])
      .filter(filterFn)
      .map(r => `${r.persona?.nombre || 'Sin nombre'} — ${moneyF(r.total || 0)}`);
  }

  function donationItemsV163(ticketCode){
    return comprasForEvent()
      .filter(r => norm(r.ticketDonacion) === ticketCode)
      .map(r => `${resolveDonorNameV163(r) || 'Sin donante'} — ${r.producto?.nombre || 'Producto'} — ${moneyF(r.valor || 0)}`);
  }

  budgetSummary = function(){
    const rows = typeof collabsForEvent === 'function' ? collabsForEvent() : [];
    const compras = comprasForEvent();
    const sociosRows = rows.filter(r => r.persona?.rango === 'SOCIO');
    const noSociosRows = rows.filter(r => r.persona?.rango !== 'SOCIO');
    const sumNum = arr => arr.reduce((a,b)=>a+Number(b.numero||0),0);
    const sumTotal = arr => arr.reduce((a,b)=>a+Number(b.total||0),0);
    const paidTotal = arr => arr.filter(r => r.situacion !== 'Pendiente').reduce((a,b)=>a+Number(b.total||0),0);
    const pendingTotal = arr => arr.filter(r => r.situacion === 'Pendiente').reduce((a,b)=>a+Number(b.total||0),0);

    const socios = {
      count: sumNum(sociosRows), importe: sumTotal(sociosRows), ingresado: paidTotal(sociosRows), pendiente: pendingTotal(sociosRows),
      listImporte: collabItemsV163(r => r.persona?.rango === 'SOCIO'),
      listIngresado: collabItemsV163(r => r.persona?.rango === 'SOCIO' && r.situacion !== 'Pendiente'),
      listPendiente: collabItemsV163(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Pendiente')
    };
    const noSocios = {
      count: sumNum(noSociosRows), importe: sumTotal(noSociosRows), ingresado: paidTotal(noSociosRows), pendiente: pendingTotal(noSociosRows),
      listImporte: collabItemsV163(r => r.persona?.rango !== 'SOCIO'),
      listIngresado: collabItemsV163(r => r.persona?.rango !== 'SOCIO' && r.situacion !== 'Pendiente'),
      listPendiente: collabItemsV163(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Pendiente')
    };

    const gastoCompras = compras.filter(c => !isDon(c.ticketDonacion) && !isCurrent(c.ticketDonacion) && norm(c.ticketDonacion) !== '').reduce((a,b)=>a+Number(b.valor||0),0);
    const gastosOrganizacion = compras.filter(c => isCurrent(c.ticketDonacion)).reduce((a,b)=>a+Number(b.valor||0),0);
    const pendiente = compras.filter(c => !isDon(c.ticketDonacion) && norm(c.ticketDonacion) === '').reduce((a,b)=>a+Number(b.valor||0),0);
    const donacionProducto = {
      donadoTienda: compras.filter(c => norm(c.ticketDonacion) === 'DONADO TIENDA').reduce((a,b)=>a+Number(b.valor||0),0),
      donadoSocio: compras.filter(c => norm(c.ticketDonacion) === 'DONADO SOCIO').reduce((a,b)=>a+Number(b.valor||0),0),
      donadoOtros: compras.filter(c => norm(c.ticketDonacion) === 'DONADO OTROS').reduce((a,b)=>a+Number(b.valor||0),0),
      listTiendas: donationItemsV163('DONADO TIENDA'),
      listSocios: donationItemsV163('DONADO SOCIO'),
      listNoSocios: donationItemsV163('DONADO OTROS')
    };
    donacionProducto.valorDonado = donacionProducto.donadoTienda + donacionProducto.donadoSocio + donacionProducto.donadoOtros;
    const ingresosTotal = socios.importe + noSocios.importe;
    const ingresosRealizados = socios.ingresado + noSocios.ingresado;
    const gastosTotal = gastoCompras + gastosOrganizacion + pendiente;
    const gastosRealizados = gastoCompras + gastosOrganizacion;
    return {
      ingresosDinero:{socios, noSocios, donantes:noSocios, totalIngresado:ingresosRealizados, totalComprometido:ingresosTotal, pendiente:socios.pendiente + noSocios.pendiente},
      donacionProducto,
      operativa:{ingresos:ingresosTotal, ingresoDinero:ingresosRealizados, gastoCompras, gastosOrganizacion, pendiente, saldoActual:ingresosRealizados - gastosRealizados, saldoOperativo:ingresosTotal - gastosTotal}
    };
  };

  function graphLinesIncomeV163(fn){
    return (typeof collabsForEvent === 'function' ? collabsForEvent() : []).filter(fn).map(r => `${r.persona?.nombre || 'Sin nombre'} — ${moneyF(r.total || 0)}`);
  }
  function graphLinesDonationV163(ticket){
    return comprasForEvent().filter(r => norm(r.ticketDonacion) === ticket).map(r => `${resolveDonorNameV163(r) || 'Sin donante'} — ${r.producto?.nombre || 'Producto'} — ${moneyF(r.valor || 0)}`);
  }
  function graphLinesExpenseV163(fn){
    return comprasForEvent().filter(fn).map(r => `${r.tienda?.nombre || 'Sin tienda'} — ${r.ticketDonacion || 'Pte.Compra u otros gastos'} — ${r.producto?.nombre || 'Producto'} — ${moneyF(r.valor || 0)}`);
  }

  function graphPartsV163(){
    const rows = typeof collabsForEvent === 'function' ? collabsForEvent() : [];
    const compras = comprasForEvent();
    const sum = arr => arr.reduce((a,b)=>a+Number(b||0),0);
    const incomeItems = [
      {label:'Socios Banco', value:sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Banco').map(r => r.total)), color:'#2563eb', lines:graphLinesIncomeV163(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Banco')},
      {label:'Socios Bizum', value:sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Bizum').map(r => r.total)), color:'#16a34a', lines:graphLinesIncomeV163(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Bizum')},
      {label:'Socios Efectivo', value:sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Efectivo').map(r => r.total)), color:'#84cc16', lines:graphLinesIncomeV163(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Efectivo')},
      {label:'No socios Banco', value:sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Banco').map(r => r.total)), color:'#60a5fa', lines:graphLinesIncomeV163(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Banco')},
      {label:'No socios Bizum', value:sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Bizum').map(r => r.total)), color:'#34d399', lines:graphLinesIncomeV163(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Bizum')},
      {label:'No socios Efectivo', value:sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Efectivo').map(r => r.total)), color:'#bef264', lines:graphLinesIncomeV163(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Efectivo')},
      {label:'Pendiente de ingresar', value:sum(rows.filter(r => r.situacion === 'Pendiente').map(r => r.total)), color:'#f59e0b', lines:graphLinesIncomeV163(r => r.situacion === 'Pendiente')}
    ];
    const donationItems = [
      {label:'Donado por tiendas', value:sum(compras.filter(r => norm(r.ticketDonacion) === 'DONADO TIENDA').map(r=>r.valor)), color:'#fcd34d', lines:graphLinesDonationV163('DONADO TIENDA')},
      {label:'Donado por socios', value:sum(compras.filter(r => norm(r.ticketDonacion) === 'DONADO SOCIO').map(r=>r.valor)), color:'#f59e0b', lines:graphLinesDonationV163('DONADO SOCIO')},
      {label:'Donado por no socios', value:sum(compras.filter(r => norm(r.ticketDonacion) === 'DONADO OTROS').map(r=>r.valor)), color:'#b45309', lines:graphLinesDonationV163('DONADO OTROS')}
    ];
    const expenseItems = [
      {label:'Gastado por ticket', value:sum(compras.filter(r => !isDon(r.ticketDonacion) && !isCurrent(r.ticketDonacion) && norm(r.ticketDonacion) !== '').map(r=>r.valor)), color:'#dc2626', lines:graphLinesExpenseV163(r => !isDon(r.ticketDonacion) && !isCurrent(r.ticketDonacion) && norm(r.ticketDonacion) !== '')},
      {label:'Gastos corrientes', value:sum(compras.filter(r => isCurrent(r.ticketDonacion)).map(r=>r.valor)), color:'#ef4444', lines:graphLinesExpenseV163(r => isCurrent(r.ticketDonacion))},
      {label:'Pendiente de compra', value:sum(compras.filter(r => !isDon(r.ticketDonacion) && norm(r.ticketDonacion) === '').map(r=>r.valor)), color:'#fb7185', lines:graphLinesExpenseV163(r => !isDon(r.ticketDonacion) && norm(r.ticketDonacion) === '')}
    ];
    const totalIncome = incomeItems.reduce((a,b)=>a+Number(b.value||0),0);
    const totalDon = donationItems.reduce((a,b)=>a+Number(b.value||0),0);
    const totalExp = expenseItems.reduce((a,b)=>a+Number(b.value||0),0);
    const saldoOperativo = totalIncome - totalExp;
    const saldoItems = [{label:'Saldo operativo', value:Math.abs(saldoOperativo), displayValue:saldoOperativo, color:saldoOperativo >= 0 ? '#155e75' : '#7f1d1d', lines:[`Saldo operativo: ${moneyF(saldoOperativo)}`]}];
    return {incomeItems, donationItems, expenseItems, saldoItems, totalIncome, totalDon, totalExp, saldoOperativo};
  }

  function segHtmlV163(value, maxVal, color, title){
    const w = (Math.max(0, Number(value || 0)) / maxVal) * 100;
    return `<div class="chart-seg" title="${esc(title)}" style="width:${w}%;background:${color};"></div>`;
  }
  function legendHtmlV163(items){
    return `<div class="chart-note" style="display:flex;flex-wrap:wrap;gap:10px 16px;margin-top:8px">${items.filter(x => Number(x.value||0) !== 0).map(x => `<span><span class="legend-dot" style="background:${x.color}"></span>${esc(x.label)}: ${esc(moneyF(x.displayValue ?? x.value))}</span>`).join('')}</div>`;
  }

  renderGraficas = function(){
    const wrap = document.getElementById('eventChartWrap');
    if(!wrap) return;
    const g = graphPartsV163();
    const maxVal = Math.max(1, g.totalIncome, g.totalDon, g.totalExp, Math.abs(g.saldoOperativo));
    function row(label, total, items){
      const segs = items.map(it => {
        const amountForTitle = it.displayValue ?? it.value;
        const detail = (it.lines && it.lines.length ? it.lines : ['Sin registros']).join('\n');
        const title = it.lines ? `${it.label}: ${moneyF(amountForTitle)}\n${detail}` : `${it.label}: ${moneyF(amountForTitle)}`;
        return segHtmlV163(it.value, maxVal, it.color, title);
      }).join('');
      return `<div class="chart-row"><div class="chart-label">${esc(label)}: ${esc(moneyF(total))}</div><div><div class="chart-track">${segs}</div>${legendHtmlV163(items)}</div></div>`;
    }
    wrap.innerHTML = `<div class="chart-shell"><div class="chart-bars">${row('INGRESOS', g.totalIncome, g.incomeItems)}${row('DONACIÓN DE PRODUCTO', g.totalDon, g.donationItems)}${row('GASTOS', g.totalExp, g.expenseItems)}${row('SALDO OPERATIVO', g.saldoOperativo, g.saldoItems)}</div></div>`;
  };

  window.makeChartImageDataUrlV160 = async function(){
    const g = graphPartsV163();
    const canvas = document.createElement('canvas');
    canvas.width = 1500;
    canvas.height = 820;
    const ctx = canvas.getContext('2d');
    const maxVal = Math.max(1, g.totalIncome, g.totalDon, g.totalExp, Math.abs(g.saldoOperativo));
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#111827'; ctx.font = 'bold 30px Arial'; ctx.fillText('GRÁFICAS DEL EVENTO', 40, 48);
    function drawRow(y, label, total, items){
      ctx.fillStyle = '#111827'; ctx.font = 'bold 22px Arial'; ctx.fillText(`${label}: ${moneyF(total)}`, 40, y);
      const x = 360, w = 1010, h = 36;
      ctx.fillStyle = '#f3f4f6'; ctx.fillRect(x, y-28, w, h);
      let cx = x;
      items.forEach(it => {
        const segW = Math.max(0, Math.abs(Number(it.value || 0)) / maxVal * w);
        if(segW > 0){ ctx.fillStyle = it.color; ctx.fillRect(cx, y-28, segW, h); cx += segW; }
      });
      let lx = x, ly = y + 30;
      ctx.font = '16px Arial';
      items.filter(it => Number(it.value || 0) !== 0).forEach(it => {
        ctx.fillStyle = it.color; ctx.fillRect(lx, ly-13, 13, 13);
        ctx.fillStyle = '#374151';
        const txt = `${it.label}: ${moneyF(it.displayValue ?? it.value)}`;
        ctx.fillText(txt, lx + 18, ly);
        lx += Math.min(340, Math.max(180, ctx.measureText(txt).width + 45));
        if(lx > 1260){ lx = x; ly += 24; }
      });
      return y + 132;
    }
    let y = 110;
    y = drawRow(y, 'INGRESOS', g.totalIncome, g.incomeItems);
    y = drawRow(y, 'DONACIÓN DE PRODUCTO', g.totalDon, g.donationItems);
    y = drawRow(y, 'GASTOS', g.totalExp, g.expenseItems);
    drawRow(y, 'SALDO OPERATIVO', g.saldoOperativo, g.saldoItems);
    return canvas.toDataURL('image/png');
  };

  window.addEventListener('load', () => {
    try{ if(typeof render === 'function') render(); }catch(_){ }
  });
})();

;/* ===== END legacy-inline-16.js ===== */


;/* ===== BEGIN legacy-inline-17.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #17. */
/* ==== V16.4 FIXES: EXCEL, GRAFICAS, COMPRAS, AGRUPACION, TICKETS ==== */
(function(){
  const VERSION = 'ControlEvent v28.10';
  const $v164 = id => document.getElementById(id);
  const escV164 = v => (typeof escapeHtml === 'function') ? escapeHtml(v) : String(v ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  const fmtMoneyV164 = v => {
    try{ return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0)); }
    catch(_){ return `${Number(v || 0).toFixed(2)} €`; }
  };
  const normV164 = v => String(v ?? '').trim();
  const isDonV164 = v => (typeof isDonationTicket === 'function') ? isDonationTicket(v) : /^DONADO/i.test(normV164(v));
  const isCurrentV164 = v => (typeof isCurrentExpenseTicket === 'function') ? isCurrentExpenseTicket(v) : normV164(v) === 'GASTOS CORRIENTES';
  const getEventV164 = () => (typeof selectedEvent === 'function' ? selectedEvent() : (state.eventos || []).find(e => e.id === state.selectedEventId));
  const collabsV164 = () => (typeof collabsForEvent === 'function' ? collabsForEvent() : []);
  const comprasV164 = () => (typeof comprasForEvent === 'function' ? comprasForEvent() : []);

  function byIdV164(list, id){ return (list || []).find(x => String(x.id) === String(id)); }
  function productByIdV164(id){ return (typeof productoById === 'function' ? productoById(id) : null) || byIdV164(state.productos || [], id) || {}; }
  function personByIdV164(id){ return (typeof personaById === 'function' ? personaById(id) : null) || byIdV164(state.personas || [], id) || {}; }
  function storeByIdV164(id){ return (typeof tiendaById === 'function' ? tiendaById(id) : null) || byIdV164(state.tiendas || [], id) || {}; }
  function valueCompraV164(c){
    const p = productByIdV164(c.productoId);
    const precio = Number(c.precio != null ? c.precio : (c.precioCalc != null ? c.precioCalc : (p.defaultPrecio ?? p.precio ?? 0)));
    return Number(c.valor != null ? c.valor : precio * Number(c.unidades || 0));
  }
  function productNameV164(c){ return c?.producto?.nombre || productByIdV164(c?.productoId).nombre || 'Producto'; }
  function storeNameV164(c){ return c?.tienda?.nombre || storeByIdV164(c?.tiendaId).nombre || ''; }
  function personNameV164(c){ return c?.persona?.nombre || personByIdV164(c?.personaId).nombre || 'Sin nombre'; }

  function resolveDonorNameV164(c){
    try{
      if(c?.donorLabel && normV164(c.donorLabel)) return normV164(c.donorLabel);
      if(c?.donorRef && normV164(c.donorRef)){
        const raw = normV164(c.donorRef);
        if(typeof donorLabel === 'function'){
          const d = donorLabel(raw);
          if(d && normV164(d)) return normV164(d);
        }
        if(raw.startsWith('P:')){
          const name = personByIdV164(raw.slice(2)).nombre;
          if(name) return name;
        }
        if(raw.startsWith('T:')){
          const name = storeByIdV164(raw.slice(2)).nombre;
          if(name) return name;
        }
        return raw;
      }
      if(c?.donante && normV164(c.donante)) return normV164(c.donante);
      const tienda = storeNameV164(c);
      if(tienda) return tienda;
    }catch(_){ }
    return '';
  }
  window.resolveDonorNameV164 = resolveDonorNameV164;

  function ticketKeyV164(key, eventId){
    const evId = eventId || state.selectedEventId || (getEventV164()?.id || '');
    return (typeof ticketImageStateKey === 'function') ? ticketImageStateKey(key, evId) : `${evId}|${key}`;
  }
  function getTicketImageV164(key){ return (state.ticketImages || {})[ticketKeyV164(key)] || ''; }

  function setFoundV164(el){
    if(!el) return;
    document.querySelectorAll('.found-target').forEach(x => x.classList.remove('found-target'));
    el.classList.add('found-target');
    try{ el.scrollIntoView({behavior:'smooth', block:'center'}); }catch(_){ try{ el.scrollIntoView(); }catch(__){} }
    setTimeout(() => el.classList.remove('found-target'), 3000);
  }

  function annotateCompraRowsV164(){
    document.querySelectorAll('#comprasList .itemcard').forEach(card => {
      const sel = card.querySelector('select[data-action="edit-compra-producto"]');
      if(sel){ card.id = 'compraRow_' + sel.dataset.id; card.dataset.productoId = sel.value; }
    });
  }
  const _renderComprasV164 = typeof renderCompras === 'function' ? renderCompras : null;
  renderCompras = function(){ if(_renderComprasV164) _renderComprasV164(); annotateCompraRowsV164(); };

  function jumpToCompraProductV164(productId){
    if(!productId) return false;
    const found = comprasV164().find(r => !isDonV164(r.ticketDonacion) && String(r.productoId) === String(productId));
    if(!found) return false;
    try{ currentMainTab = 'compras'; showComprasEvent = true; }catch(_){ }
    if(typeof render === 'function') render();
    setTimeout(() => setFoundV164($v164('compraRow_' + found.id)), 90);
    return true;
  }

  // Compra: al elegir producto del desplegable, saltar al registro existente sin pulsar Añadir.
  document.addEventListener('change', function(e){
    const t = e.target;
    if(!t || t.id !== 'buyProducto' || (typeof isLocked === 'function' && isLocked())) return;
    if(false && jumpToCompraProductV164(t.value)){
      t.value = '';
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  const _addCompraV164 = typeof addCompra === 'function' ? addCompra : null;
  addCompra = function(){
    const productId = $v164('buyProducto')?.value || '';
    if(false && productId && jumpToCompraProductV164(productId)) return;
    if(_addCompraV164) return _addCompraV164.apply(this, arguments);
  };

  function groupingRowsV164(kind){
    const compras = comprasV164();
    const keys = kind === 'segmento'
      ? (typeof SEGMENT_OPTIONS !== 'undefined' ? SEGMENT_OPTIONS : Array.from(new Set(compras.map(c => productByIdV164(c.productoId).segmento || c.producto?.segmento || '').filter(Boolean))))
      : (typeof DESTINO_OPTIONS !== 'undefined' ? DESTINO_OPTIONS : Array.from(new Set(compras.map(c => productByIdV164(c.productoId).destino || c.producto?.destino || '').filter(Boolean))));
    return keys.map(k => {
      const match = c => String(kind === 'segmento' ? (c.producto?.segmento || productByIdV164(c.productoId).segmento || '') : (c.producto?.destino || productByIdV164(c.productoId).destino || '')) === String(k);
      const comprados = compras.filter(c => match(c) && !isDonV164(c.ticketDonacion) && !isCurrentV164(c.ticketDonacion) && normV164(c.ticketDonacion) !== '');
      const donados = compras.filter(c => match(c) && isDonV164(c.ticketDonacion));
      const pendientes = compras.filter(c => match(c) && !isDonV164(c.ticketDonacion) && normV164(c.ticketDonacion) === '');
      const comprado = comprados.reduce((a,b)=>a+valueCompraV164(b),0);
      const donado = donados.reduce((a,b)=>a+valueCompraV164(b),0);
      const pendiente = pendientes.reduce((a,b)=>a+valueCompraV164(b),0);
      return {
        label:k,
        comprado, donado, pendiente,
        total: comprado + donado + pendiente,
        listComprado: comprados.map(c => `${productNameV164(c)} — ${storeNameV164(c) || 'Sin tienda'} — ${normV164(c.ticketDonacion)} — ${fmtMoneyV164(valueCompraV164(c))}`),
        listDonado: donados.map(c => `${resolveDonorNameV164(c) || 'Sin donante'} — ${productNameV164(c)} — ${fmtMoneyV164(valueCompraV164(c))}`),
        listPendiente: pendientes.map(c => `${productNameV164(c)} — ${fmtMoneyV164(valueCompraV164(c))}`)
      };
    });
  }
  summaryBySegmento = function(){ return groupingRowsV164('segmento'); };
  summaryByDestino = function(){ return groupingRowsV164('destino'); };

  function renderGroupingBarsV164(targetId, rows){
    const wrap = $v164(targetId);
    if(!wrap) return;
    const card = wrap.closest('.summary-card');
    if(card) card.style.display = '';
    wrap.innerHTML = '';
    const maxVal = Math.max(1, ...rows.flatMap(r => [Number(r.comprado||0), Number(r.donado||0), Number(r.pendiente||0)]));
    const totalGeneral = rows.reduce((a,b)=>a+Number(b.total||0),0);
    const title = targetId === 'summarySegmento' ? 'Por segmento' : 'Por destino';
    const head = document.createElement('div');
    head.className = 'vbars-wrap';
    head.innerHTML = `<div class="vbars-total">${title} – TOTAL GENERAL: ${escV164(fmtMoneyV164(totalGeneral))}</div><div class="chart-note"><span><span class="legend-dot" style="background:#dc2626"></span>Comprado</span> <span><span class="legend-dot" style="background:#f59e0b"></span>Donado</span> <span><span class="legend-dot" style="background:#fb7185"></span>Pte. Compra u otros gastos</span></div>`;
    wrap.appendChild(head);
    const grid = document.createElement('div');
    grid.className = 'vbars-grid';
    rows.forEach(r => {
      const h1 = Math.max(8, (Number(r.comprado||0) / maxVal) * 170);
      const h2 = Math.max(8, (Number(r.donado||0) / maxVal) * 170);
      const h3 = Math.max(8, (Number(r.pendiente||0) / maxVal) * 170);
      const cardDiv = document.createElement('div');
      cardDiv.className = 'vbars-card';
      cardDiv.innerHTML = `<div class="vbars-title">${escV164(r.label)} · ${escV164(fmtMoneyV164(r.total))}</div><div class="vbars-chart"><div class="vbar-col" title="${escV164((r.listComprado?.length ? r.listComprado.join('\n') : 'Sin productos'))}"><div class="vbar-value">${escV164(fmtMoneyV164(r.comprado))}</div><div class="vbar-stick" style="height:${h1}px;background:#dc2626"></div><div class="vbar-label">Comprado</div></div><div class="vbar-col" title="${escV164((r.listDonado?.length ? r.listDonado.join('\n') : 'Sin productos'))}"><div class="vbar-value">${escV164(fmtMoneyV164(r.donado))}</div><div class="vbar-stick" style="height:${h2}px;background:#f59e0b"></div><div class="vbar-label">Donado</div></div><div class="vbar-col" title="${escV164((r.listPendiente?.length ? r.listPendiente.join('\n') : 'Sin productos'))}"><div class="vbar-value">${escV164(fmtMoneyV164(r.pendiente))}</div><div class="vbar-stick" style="height:${h3}px;background:#fb7185"></div><div class="vbar-label">Pte. Compra u otros gastos</div></div></div>`;
      grid.appendChild(cardDiv);
    });
    wrap.appendChild(grid);
  }
  const _renderSummaryListV164 = typeof renderSummaryList === 'function' ? renderSummaryList : null;
  renderSummaryList = function(targetId, rows){
    if(targetId === 'summarySegmento' || targetId === 'summaryDestino') return renderGroupingBarsV164(targetId, rows || []);
    if(targetId === 'summaryTiendaTicket') return renderTiendaTicketV164(targetId, rows || []);
    if(_renderSummaryListV164) return _renderSummaryListV164(targetId, rows);
  };

  function summaryByTiendaTicketV164(){
    const filled = {};
    const pending = {};
    comprasV164().forEach(c => {
      const rawTicket = normV164(c.ticketDonacion);
      const val = valueCompraV164(c);
      const donated = isDonV164(rawTicket);
      const baseName = donated ? (resolveDonorNameV164(c) || 'Sin donante') : (storeNameV164(c) || 'Sin tienda');
      if(rawTicket === ''){
        const key = `${baseName} | Pte.Compra u otros gastos`;
        pending[key] = (pending[key] || 0) + val;
        return;
      }
      const key = `${baseName} | ${rawTicket}`;
      if(!filled[key]) filled[key] = {k:key, v:0, rawTicket, donated, products:[], attachable: !donated};
      filled[key].v += val;
      filled[key].donated = filled[key].donated || donated;
      filled[key].attachable = filled[key].attachable && !donated;
      const pn = productNameV164(c);
      if(pn && !filled[key].products.includes(pn)) filled[key].products.push(pn);
    });
    const rows = Object.values(filled).map(obj => {
      const label = obj.donated && obj.products.length ? `${obj.k} · ${obj.products.join(' · ')}` : obj.k;
      return {...obj, label, pending:false, image:getTicketImageV164(obj.k)};
    }).concat(Object.entries(pending).map(([k,v]) => ({k, label:k, v, rawTicket:'', pending:true, donated:false, attachable:false, image:''})));
    const sortMode = state.summaryTiendaSort || 'tienda';
    rows.sort((a,b)=>{
      const [ta='',tka=''] = String(a.k||'').split(' | ');
      const [tb='',tkb=''] = String(b.k||'').split(' | ');
      if(sortMode === 'ticket'){
        const s = tka.localeCompare(tkb,'es');
        return s || ta.localeCompare(tb,'es');
      }
      const s = ta.localeCompare(tb,'es');
      return s || tka.localeCompare(tkb,'es');
    });
    return rows;
  }
  summaryByTiendaTicket = summaryByTiendaTicketV164;

  function uploadTicketImageV164(encodedKey){
    const key = decodeURIComponent(encodedKey);
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.onchange = ev => {
      const file = ev.target.files && ev.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = loadEvent => {
        const img = new Image();
        img.onload = function(){
          const maxW = 900, maxH = 900;
          let w = img.width, h = img.height;
          const ratio = Math.min(maxW / w, maxH / h, 1);
          w = Math.round(w * ratio); h = Math.round(h * ratio);
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img,0,0,w,h);
          if(!state.ticketImages) state.ticketImages = {};
          state.ticketImages[ticketKeyV164(key)] = canvas.toDataURL('image/jpeg', 0.84);
          if(typeof render === 'function') render();
        };
        img.src = loadEvent.target.result;
      };
      reader.readAsDataURL(file);
    };
    inp.click();
  }
  function removeTicketImageV164(encodedKey){
    const key = decodeURIComponent(encodedKey);
    if(state.ticketImages) delete state.ticketImages[ticketKeyV164(key)];
    if(typeof render === 'function') render();
  }
  window.uploadTicketImageV164 = uploadTicketImageV164;
  window.removeTicketImageV164 = removeTicketImageV164;

  function renderTiendaTicketV164(targetId, rows){
    const wrap = $v164(targetId);
    if(!wrap) return;
    wrap.innerHTML = '';
    const tools = document.createElement('div');
    tools.className = 'hint';
    tools.innerHTML = 'Ordenar por: <a href="#" onclick="state.summaryTiendaSort=\'tienda\'; renderBudget(); return false;">Tienda</a> · <a href="#" onclick="state.summaryTiendaSort=\'ticket\'; renderBudget(); return false;">Ticket/Donación/Otros Gastos</a>';
    wrap.appendChild(tools);
    if(!rows.length){
      const empty = document.createElement('div');
      empty.className = 'hint';
      empty.textContent = 'Sin datos.';
      wrap.appendChild(empty);
      return;
    }
    let total = 0;
    rows.forEach((r, idx) => {
      total += Number(r.v || 0);
      const div = document.createElement('div');
      div.className = 'summary-item';
      if(r.pending) div.classList.add('red-row');
      const amountHtml = `<span class="pill"${r.pending ? ' style="background:#fef2f2;color:#b91c1c"' : (r.donated ? ' style="text-decoration:line-through"' : '')}>${escV164(fmtMoneyV164(r.v))}</span>`;
      const encoded = encodeURIComponent(r.k || '');
      let actions = '';
      if(r.attachable && !r.pending){
        const preview = r.image ? `<img class="ticket-thumb" src="${r.image}" alt="ticket" />` : '<span class="hint">Sin imagen</span>';
        const del = r.image ? `<button type="button" class="outline small" title="Eliminar foto" onclick="removeTicketImageV164('${encoded}')">🗑️</button>` : '';
        actions = `<span class="ticket-actions"><button type="button" class="outline small" title="Insertar foto" onclick="uploadTicketImageV164('${encoded}')">📎</button>${preview}${del}</span>`;
      }
      div.innerHTML = `<span>${escV164(r.label || r.k)}</span><span style="display:flex;align-items:center;gap:8px;justify-content:flex-end;">${amountHtml}${actions}</span>`;
      wrap.appendChild(div);
    });
    const totalDiv = document.createElement('div');
    totalDiv.className = 'summary-item';
    totalDiv.style.fontWeight = '800';
    totalDiv.innerHTML = `<span>TOTAL</span><span class="pill">${escV164(fmtMoneyV164(total))}</span>`;
    wrap.appendChild(totalDiv);
  }

  function graphPartsV164(){
    const rows = collabsV164();
    const compras = comprasV164();
    const sum = arr => arr.reduce((a,b)=>a+Number(b||0),0);
    const incomeLine = fn => rows.filter(fn).map(r => `${personNameV164(r)} — ${fmtMoneyV164(Number(r.total || (Number(r.numero||1) * Number(r.importe||0))))}`);
    const donationLine = ticket => compras.filter(r => normV164(r.ticketDonacion) === ticket).map(r => `${resolveDonorNameV164(r) || 'Sin donante'} — ${productNameV164(r)} — ${fmtMoneyV164(valueCompraV164(r))}`);
    const expenseLine = fn => compras.filter(fn).map(r => `${storeNameV164(r) || 'Sin tienda'} — ${normV164(r.ticketDonacion) || 'Pte.Compra u otros gastos'} — ${productNameV164(r)} — ${fmtMoneyV164(valueCompraV164(r))}`);
    const incomeItems = [
      {label:'Socios Banco', value:sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Banco').map(r => r.total)), color:'#2563eb', lines:incomeLine(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Banco')},
      {label:'Socios Bizum', value:sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Bizum').map(r => r.total)), color:'#16a34a', lines:incomeLine(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Bizum')},
      {label:'Socios Efectivo', value:sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Efectivo').map(r => r.total)), color:'#84cc16', lines:incomeLine(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Efectivo')},
      {label:'No socios Banco', value:sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Banco').map(r => r.total)), color:'#60a5fa', lines:incomeLine(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Banco')},
      {label:'No socios Bizum', value:sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Bizum').map(r => r.total)), color:'#34d399', lines:incomeLine(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Bizum')},
      {label:'No socios Efectivo', value:sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Efectivo').map(r => r.total)), color:'#bef264', lines:incomeLine(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Efectivo')},
      {label:'Pendiente de ingresar', value:sum(rows.filter(r => r.situacion === 'Pendiente').map(r => r.total)), color:'#f59e0b', lines:incomeLine(r => r.situacion === 'Pendiente')}
    ];
    const donationItems = [
      {label:'Donado por tiendas', value:sum(compras.filter(r => normV164(r.ticketDonacion) === 'DONADO TIENDA').map(valueCompraV164)), color:'#fcd34d', lines:donationLine('DONADO TIENDA')},
      {label:'Donado por socios', value:sum(compras.filter(r => normV164(r.ticketDonacion) === 'DONADO SOCIO').map(valueCompraV164)), color:'#f59e0b', lines:donationLine('DONADO SOCIO')},
      {label:'Donado por no socios', value:sum(compras.filter(r => normV164(r.ticketDonacion) === 'DONADO OTROS').map(valueCompraV164)), color:'#b45309', lines:donationLine('DONADO OTROS')}
    ];
    const expenseItems = [
      {label:'Gastado por ticket', value:sum(compras.filter(r => !isDonV164(r.ticketDonacion) && !isCurrentV164(r.ticketDonacion) && normV164(r.ticketDonacion) !== '').map(valueCompraV164)), color:'#dc2626', lines:expenseLine(r => !isDonV164(r.ticketDonacion) && !isCurrentV164(r.ticketDonacion) && normV164(r.ticketDonacion) !== '')},
      {label:'Gastos corrientes', value:sum(compras.filter(r => isCurrentV164(r.ticketDonacion)).map(valueCompraV164)), color:'#ef4444', lines:expenseLine(r => isCurrentV164(r.ticketDonacion))},
      {label:'Pendiente de compra', value:sum(compras.filter(r => !isDonV164(r.ticketDonacion) && normV164(r.ticketDonacion) === '').map(valueCompraV164)), color:'#fb7185', lines:expenseLine(r => !isDonV164(r.ticketDonacion) && normV164(r.ticketDonacion) === '')}
    ];
    const totalIncome = incomeItems.reduce((a,b)=>a+Number(b.value||0),0);
    const totalDon = donationItems.reduce((a,b)=>a+Number(b.value||0),0);
    const totalExp = expenseItems.reduce((a,b)=>a+Number(b.value||0),0);
    const saldoOperativo = totalIncome - totalExp;
    const saldoItems = [{label:'Saldo operativo', value:Math.abs(saldoOperativo), displayValue:saldoOperativo, color:saldoOperativo >= 0 ? '#155e75' : '#7f1d1d', lines:[]}];
    return {incomeItems, donationItems, expenseItems, saldoItems, totalIncome, totalDon, totalExp, saldoOperativo};
  }
  window.graphPartsV164 = graphPartsV164;

  function legendV164(items){
    return `<div class="chart-note" style="display:flex;flex-wrap:wrap;gap:10px 16px;margin-top:8px">${items.filter(x => Number(x.value||0) !== 0).map(x => `<span><span class="legend-dot" style="background:${x.color}"></span>${escV164(x.label)}: ${escV164(fmtMoneyV164(x.displayValue ?? x.value))}</span>`).join('')}</div>`;
  }
  function segV164(value, max, color, title){
    const w = Math.max(0, Number(value || 0)) / max * 100;
    return `<div class="chart-seg" title="${escV164(title)}" style="width:${w}%;background:${color};"></div>`;
  }
  renderGraficas = function(){
    const wrap = $v164('eventChartWrap');
    if(!wrap) return;
    const g = graphPartsV164();
    const maxVal = Math.max(1, g.totalIncome, g.totalDon, g.totalExp, Math.abs(g.saldoOperativo));
    function row(label, total, items){
      const segs = items.map(it => {
        const amount = it.displayValue ?? it.value;
        const detail = (it.lines && it.lines.length) ? ('\n' + it.lines.join('\n')) : '';
        return segV164(it.value, maxVal, it.color, `${it.label}: ${fmtMoneyV164(amount)}${detail}`);
      }).join('');
      return `<div class="chart-row"><div class="chart-label">${escV164(label)}: ${escV164(fmtMoneyV164(total))}</div><div><div class="chart-track">${segs}</div>${legendV164(items)}</div></div>`;
    }
    wrap.innerHTML = `<div class="chart-shell"><div class="chart-bars">${row('INGRESOS', g.totalIncome, g.incomeItems)}${row('DONACIÓN DE PRODUCTO', g.totalDon, g.donationItems)}${row('GASTOS', g.totalExp, g.expenseItems)}${row('SALDO OPERATIVO', g.saldoOperativo, g.saldoItems)}</div></div>`;
  };

  async function makeChartImageDataUrlV164(){
    const g = graphPartsV164();
    const canvas = document.createElement('canvas');
    canvas.width = 1650; canvas.height = 760;
    const ctx = canvas.getContext('2d');
    const maxVal = Math.max(1, g.totalIncome, g.totalDon, g.totalExp, Math.abs(g.saldoOperativo));
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#111827'; ctx.font = 'bold 32px Arial'; ctx.fillText('GRÁFICAS DEL EVENTO', 40, 52);
    function drawRow(y, label, total, items){
      ctx.fillStyle = '#111827'; ctx.font = 'bold 22px Arial'; ctx.fillText(`${label}: ${fmtMoneyV164(total)}`, 40, y);
      const x = 390, w = 1120, h = 38;
      ctx.fillStyle = '#f3f4f6'; ctx.fillRect(x, y-29, w, h);
      let cx = x;
      items.forEach(it => {
        const segW = Math.max(0, Number(it.value || 0)) / maxVal * w;
        if(segW > 0){ ctx.fillStyle = it.color; ctx.fillRect(cx, y-29, segW, h); cx += segW; }
      });
      ctx.font = '16px Arial';
      let lx = x, ly = y + 32;
      items.filter(it => Number(it.value || 0) !== 0).forEach(it => {
        const txt = `${it.label}: ${fmtMoneyV164(it.displayValue ?? it.value)}`;
        const tw = ctx.measureText(txt).width;
        if(lx + tw + 42 > x + w){ lx = x; ly += 24; }
        ctx.fillStyle = it.color; ctx.fillRect(lx, ly-13, 13, 13);
        ctx.fillStyle = '#374151'; ctx.fillText(txt, lx + 18, ly);
        lx += tw + 52;
      });
      return y + 135;
    }
    let y = 112;
    y = drawRow(y, 'INGRESOS', g.totalIncome, g.incomeItems);
    y = drawRow(y, 'DONACIÓN DE PRODUCTO', g.totalDon, g.donationItems);
    y = drawRow(y, 'GASTOS', g.totalExp, g.expenseItems);
    drawRow(y, 'SALDO OPERATIVO', g.saldoOperativo, g.saldoItems);
    return canvas.toDataURL('image/png');
  }
  window.makeChartImageDataUrlV164 = makeChartImageDataUrlV164;
  window.makeChartImageDataUrlV160 = makeChartImageDataUrlV164;
  window.makeChartImageDataUrl = makeChartImageDataUrlV164;

  async function makeGroupingChartImageV164(kind){
    const rows = kind === 'segmento' ? summaryBySegmento() : summaryByDestino();
    const canvas = document.createElement('canvas');
    const height = Math.max(520, 115 + rows.length * 96);
    canvas.width = 1500; canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    const title = kind === 'segmento' ? 'POR SEGMENTO' : 'POR DESTINO';
    const totalGeneral = rows.reduce((a,b)=>a+Number(b.total||0),0);
    ctx.fillStyle = '#111827'; ctx.font = 'bold 30px Arial'; ctx.fillText(`${title} – TOTAL GENERAL: ${fmtMoneyV164(totalGeneral)}`, 35, 48);
    ctx.font = '16px Arial';
    const legends = [['#dc2626','Comprado'],['#f59e0b','Donado'],['#fb7185','Pte. Compra u otros gastos']];
    let lx = 35;
    legends.forEach(([color,label]) => { ctx.fillStyle = color; ctx.fillRect(lx,75,14,14); ctx.fillStyle = '#374151'; ctx.fillText(label,lx+20,88); lx += ctx.measureText(label).width + 70; });
    const maxVal = Math.max(1, ...rows.flatMap(r => [Number(r.comprado||0), Number(r.donado||0), Number(r.pendiente||0)]));
    let y = 126;
    rows.forEach(r => {
      ctx.fillStyle = '#111827'; ctx.font = 'bold 18px Arial'; ctx.fillText(`${r.label} · ${fmtMoneyV164(r.total)}`, 35, y);
      const x = 360, w = 930, h = 16;
      const vals = [[r.comprado,'#dc2626','Comprado'],[r.donado,'#f59e0b','Donado'],[r.pendiente,'#fb7185','Pte. Compra u otros gastos']];
      vals.forEach((v, i) => {
        const yy = y - 4 + i*24;
        ctx.fillStyle = '#64748b'; ctx.font = '14px Arial'; ctx.fillText(v[2], 190, yy + 13);
        ctx.fillStyle = '#f3f4f6'; ctx.fillRect(x, yy, w, h);
        ctx.fillStyle = v[1]; ctx.fillRect(x, yy, Math.max(2, Number(v[0]||0)/maxVal*w), h);
        ctx.fillStyle = '#111827'; ctx.font = '14px Arial'; ctx.fillText(fmtMoneyV164(v[0]), x + w + 18, yy + 13);
      });
      y += 92;
    });
    return canvas.toDataURL('image/png');
  }
  window.makeGroupingChartImageV164 = makeGroupingChartImageV164;

  function autoFitSheetV164(ws, min=10, max=58){
    ws.columns.forEach((col, idx) => {
      let width = col.width || min;
      col.eachCell({includeEmpty:true}, cell => {
        let text = '';
        if(cell.value == null) text = '';
        else if(typeof cell.value === 'object' && cell.value.text) text = String(cell.value.text);
        else if(typeof cell.value === 'object' && cell.value.richText) text = cell.value.richText.map(x=>x.text).join('');
        else text = String(cell.value);
        width = Math.max(width, Math.min(max, text.length + 3));
      });
      col.width = Math.max(min, Math.min(max, width));
    });
  }
  async function protectSheetV164(ws){
    try{
      await ws.protect('open_excel_arrastre', {
        selectLockedCells:false, selectUnlockedCells:false,
        formatCells:false, formatColumns:false, formatRows:false,
        insertColumns:false, insertRows:false, insertHyperlinks:false,
        deleteColumns:false, deleteRows:false, sort:false, autoFilter:false, pivotTables:false,
        objects:false, scenarios:false
      });
      if(ws.model && ws.model.sheetProtection){ ws.model.sheetProtection.objects = true; ws.model.sheetProtection.scenarios = true; }
    }catch(_){ }
  }

  function fileNameV164(ev){
    const title = String(ev?.titulo || 'evento').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'').replace(/_+/g,'_') || 'evento';
    const now = new Date();
    const dd = String(now.getDate()).padStart(2,'0');
    const mm = String(now.getMonth()+1).padStart(2,'0');
    const yyyy = String(now.getFullYear());
    return `ControlEvent_v28_10_INFOEVENTO-${title}_${yyyy}${mm}${dd}.xlsx`;
  }
  window.xlsxFilename = fileNameV164;

  exportSeedWorkbook = async function(){
    if(typeof isLocked === 'function' && isLocked()) return;
    try{ await ensureExcelJS(); }catch(err){ alert('No se pudo cargar el motor de Excel.'); return; }
    const wb = new ExcelJS.Workbook();
    wb.creator = `${VERSION} - ©oltyLAB ’26`; wb.created = new Date();
    const headFill = {type:'pattern', pattern:'solid', fgColor:{argb:'FF111827'}};
    const border = {top:{style:'thin', color:{argb:'FFDDE2EA'}},left:{style:'thin', color:{argb:'FFDDE2EA'}},bottom:{style:'thin', color:{argb:'FFDDE2EA'}},right:{style:'thin', color:{argb:'FFDDE2EA'}}};
    function sheet(name, headers, rows){
      const ws = wb.addWorksheet(name);
      ws.columns = headers.map(h => ({header:h, key:h, width:Math.max(12,String(h).length+2)}));
      headers.forEach((h,i)=>{ const c=ws.getCell(1,i+1); c.value=h; c.font={bold:true,color:{argb:'FFFFFFFF'}}; c.fill=headFill; c.border=border; c.alignment={horizontal:'center', vertical:'middle', wrapText:true}; });
      rows.forEach(row => ws.addRow(row.map(v => v == null ? '' : v)));
      ws.eachRow(r => r.eachCell(c => { c.border=border; c.alignment={vertical:'middle', wrapText:true}; }));
      autoFitSheetV164(ws, 12, 70);
      return ws;
    }
    sheet('PERSONAS', ['ID','NOMBRE','RANGO'], (state.personas||[]).map(p=>[p.id,p.nombre||'',p.rango||'']));
    sheet('EVENTOS', ['ID','TITULO','PRECIO','FECHA_INI','FECHA_FIN','DESCRIPCION','SITUACION'], (state.eventos||[]).map(e=>[e.id,e.titulo||'',Number(e.precio||0),e.fechaIni||'',e.fechaFin||'',e.descripcion||'',e.situacion||'']));
    sheet('TIENDAS', ['ID','NOMBRE'], (state.tiendas||[]).map(t=>[t.id,t.nombre||'']));
    sheet('PRODUCTOS', ['ID','NOMBRE','SEGMENTO','DESTINO','PRECIO_REFERENCIA'], (state.productos||[]).map(p=>[p.id,p.nombre||'',p.segmento||'',p.destino||'',Number((p.defaultPrecio??p.precio)||0)]));
    sheet('INGRESOS', ['ID','EVENTO_ID','PERSONA_ID','NUMERO','TIPO_INGRESO','IMPORTE_VOLUNTARIO'], (state.colaboradores||[]).map(c=>[c.id,c.eventId||'',c.personaId||'',Number(c.numero||0),c.situacion||'',Number(c.importe||0)]));
    sheet('COMPRAS', ['ID','EVENTO_ID','PRODUCTO_ID','UNIDADES','PRECIO','TICKET','TIENDA_ID','RESPONSABLE_ID'], (state.compras||[]).filter(c=>!isDonV164(c.ticketDonacion)).map(c=>[c.id,c.eventId||'',c.productoId||'',Number(c.unidades||0),Number(c.precio||0),c.ticketDonacion||'',c.tiendaId||'',c.responsableId||'']));
    sheet('DONACIONES', ['ID','EVENTO_ID','PRODUCTO_ID','UNIDADES','PRECIO','TIPO_DONACION','DONANTE','RESPONSABLE_ID'], (state.compras||[]).filter(c=>isDonV164(c.ticketDonacion)).map(c=>[c.id,c.eventId||'',c.productoId||'',Number(c.unidades||0),Number(c.precio||0),c.ticketDonacion||'',resolveDonorNameV164(c),c.responsableId||'']));
    sheet('TICKET_IMAGES', ['KEY','DATA_URL'], Object.entries(state.ticketImages||{}).map(([k,v])=>[k,v]));
    for(const ws of wb.worksheets) await protectSheetV164(ws);
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ControlEvent_v28_10_descarga_datos.xlsx';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  exportExcel = async function(){
    if(typeof isLocked === 'function' && isLocked() && typeof isGodRole === 'function' && !isGodRole()) return;
    const ev = getEventV164();
    if(!ev) return;
    try{ await ensureExcelJS(); }catch(err){ alert('No se pudo cargar el motor de Excel.'); return; }
    const wb = new ExcelJS.Workbook();
    wb.creator = `${VERSION} - ©oltyLAB ’26`; wb.created = new Date();
    const border = {top:{style:'thin', color:{argb:'FFDDE2EA'}},left:{style:'thin', color:{argb:'FFDDE2EA'}},bottom:{style:'thin', color:{argb:'FFDDE2EA'}},right:{style:'thin', color:{argb:'FFDDE2EA'}}};
    const fills = {title:'FF111827', ok:'FFECFDF5', bad:'FFFEF2F2', warn:'FFFFF7ED', refund:'FFFFF4F4', greenSoft:'FFEFFFF4', white:'FFFFFFFF', soft:'FFF8FAFC'};
    const moneyFmt = '#,##0.00 [$€-C0A]';
    function baseSheet(name, widths){ const ws = wb.addWorksheet(name); ws.properties.defaultRowHeight = 22; ws.columns = widths.map(w=>({width:w})); return ws; }
    function paint(cell, fill='white'){ cell.border=border; cell.alignment={vertical:'middle', wrapText:true}; if(fills[fill]) cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:fills[fill]}}; }
    function titleRow(ws,r,headers){ headers.forEach((h,i)=>{ const c=ws.getCell(r,i+1); c.value=h; c.font={bold:true,color:{argb:'FFFFFFFF'}}; c.fill={type:'pattern',pattern:'solid',fgColor:{argb:fills.title}}; c.border=border; c.alignment={vertical:'middle',horizontal:'center',wrapText:true}; }); ws.getRow(r).height=24; }
    function mergeTitle(ws,r,text,cols){ ws.mergeCells(r,1,r,cols); const c=ws.getCell(r,1); c.value=text; c.font={bold:true,color:{argb:'FFFFFFFF'},size:13}; c.fill={type:'pattern',pattern:'solid',fgColor:{argb:fills.title}}; c.border=border; c.alignment={vertical:'middle',horizontal:'center',wrapText:true}; ws.getRow(r).height=26; }
    function putText(ws,r,c,v,fill='white'){ const cell=ws.getCell(r,c); cell.value=v==null?'':String(v); paint(cell,fill); return cell; }
    function putMoney(ws,r,c,v,fill='white',bold=false){ const cell=ws.getCell(r,c); cell.value=Number(v||0); cell.numFmt=moneyFmt; paint(cell,fill); cell.font={bold:!!bold,color:{argb:'FF111827'}}; return cell; }
    function putNum(ws,r,c,v,fill='white'){ const cell=ws.getCell(r,c); cell.value=Number(v||0); paint(cell,fill); cell.font={color:{argb:'FF111827'}}; return cell; }
    function addCellNote(cell, text){
      if(!cell || !text) return;
      const noteText = String(text).replace(/\s*\n\s*/g, '\n');
      try{
        cell.note = {
          texts: [{text: noteText}],
          margins: {insetmode:'custom', inset:[0.20,0.20,0.60,0.60]},
          protection: {locked:true, lockText:true},
          editAs: 'twoCells',
          width: 820,
          height: 420
        };
      }catch(_){ cell.note = noteText; }
    }
    function addImage(ws, dataUrl, r, c, width, height){
      if(!dataUrl) return false;
      const m = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
      if(!m) return false;
      const ext = m[1].includes('png') ? 'png' : 'jpeg';
      const id = wb.addImage({base64:dataUrl, extension:ext});
      ws.addImage(id, {tl:{col:c-1+0.08,row:r-1+0.08}, ext:{width,height}, editAs:'oneCell'});
      return true;
    }

    const collabs = collabsV164();
    const compras = comprasV164();
    const comprasSolo = compras.filter(x => !isDonV164(x.ticketDonacion)).slice().sort((a,b)=> normV164(a.ticketDonacion).localeCompare(normV164(b.ticketDonacion),'es') || productNameV164(a).localeCompare(productNameV164(b),'es'));
    const donacionesSolo = compras.filter(x => isDonV164(x.ticketDonacion));
    const budget = (typeof budgetSummary === 'function') ? budgetSummary() : {operativa:{saldoOperativo:0,saldoActual:0}};
    const segRows = summaryBySegmento();
    const destRows = summaryByDestino();
    const tiendaRows = summaryByTiendaTicketV164();

    const wsRes = baseSheet('RESUMEN', [34,52,18,18,18,18,18]);
    let r = 1;
    mergeTitle(wsRes, r++, 'RESUMEN DEL EVENTO', 7);
    putText(wsRes,r,1,'Evento'); putText(wsRes,r++,2,ev.titulo||'');
    putText(wsRes,r,1,'Fechas'); putText(wsRes,r++,2,`${ev.fechaIni||''}${ev.fechaFin ? ' - ' + ev.fechaFin : ''}`);
    putText(wsRes,r,1,'Descripción'); wsRes.mergeCells(r,2,r+3,7); const dc=wsRes.getCell(r,2); dc.value=ev.descripcion||''; paint(dc,'soft'); dc.alignment={vertical:'top',wrapText:true}; for(let rr=r; rr<=r+3; rr++) wsRes.getRow(rr).height=32; r += 4;
    putText(wsRes,r,1,'Precio'); putMoney(wsRes,r++,2,Number(ev.precio||0));
    putText(wsRes,r,1,'Ingresado'); putMoney(wsRes,r++,2,budget?.ingresosDinero?.totalIngresado || 0,'white',true);
    putText(wsRes,r,1,'Pendiente'); putMoney(wsRes,r++,2,budget?.ingresosDinero?.pendiente || 0,'warn',true);
    putText(wsRes,r,1,'Saldo operativo'); putMoney(wsRes,r++,2,budget?.operativa?.saldoOperativo || graphPartsV164().saldoOperativo,(budget?.operativa?.saldoOperativo || graphPartsV164().saldoOperativo) >= 0 ? 'ok':'bad',true);
    putText(wsRes,r,1,'Generado por'); putText(wsRes,r++,2,`${VERSION} - ©oltyLAB ’26`);
    r += 2;
    mergeTitle(wsRes, r++, 'GRÁFICAS DE CÁLCULOS POR AGRUPACIÓN', 7);
    putText(wsRes, r, 1, 'Por segmento'); wsRes.getCell(r,1).font = {bold:true,color:{argb:'FF111827'}}; r += 1;
    addImage(wsRes, await makeGroupingChartImageV164('segmento'), r, 1, 1180, 480); wsRes.getRow(r).height = 360; r += 19;
    putText(wsRes, r, 1, 'Por destino'); wsRes.getCell(r,1).font = {bold:true,color:{argb:'FF111827'}}; r += 1;
    addImage(wsRes, await makeGroupingChartImageV164('destino'), r, 1, 1180, 480); wsRes.getRow(r).height = 360;

    const wsIng = baseSheet('INGRESOS', [30,12,18,18,18,18,18]);
    mergeTitle(wsIng,1,'INGRESOS',7); titleRow(wsIng,3,['Nombre','Número','Situación','Rango','Importe socio','Total','Pendiente']);
    r=4; let totalIng=0, totalPend=0;
    collabs.forEach(it=>{ const persona=it.persona||personByIdV164(it.personaId); const total=Number(it.total || (Number(it.numero||1)*Number(it.importe||ev.precio||0))); const pendiente=it.situacion==='Pendiente'?total:0; putText(wsIng,r,1,persona.nombre||''); putNum(wsIng,r,2,it.numero||1); putText(wsIng,r,3,it.situacion||''); putText(wsIng,r,4,persona.rango||''); putMoney(wsIng,r,5,it.importe || ev.precio || 0); putMoney(wsIng,r,6,total); putMoney(wsIng,r,7,pendiente,pendiente?'warn':'white'); totalIng += total; totalPend += pendiente; r++; });
    titleRow(wsIng,r,['TOTAL','','','','','', '']); putMoney(wsIng,r,6,totalIng,'white',true); putMoney(wsIng,r,7,totalPend,'warn',true);

    const wsCom = baseSheet('COMPRAS Y OTROS GASTOS', [32,12,16,16,22,24,22,18]);
    mergeTitle(wsCom,1,'COMPRAS Y OTROS GASTOS',8); titleRow(wsCom,3,['Producto','Unidades','Precio','Importe','Ticket/Otros gastos','Tienda','Responsable','Estado']);
    r=4; let totalCom=0;
    comprasSolo.forEach(it=>{ const val=valueCompraV164(it); const pending=normV164(it.ticketDonacion)===''; putText(wsCom,r,1,productNameV164(it),pending?'warn':'white'); putNum(wsCom,r,2,it.unidades||0,pending?'warn':'white'); putMoney(wsCom,r,3,it.precio ?? productByIdV164(it.productoId).precio ?? 0,pending?'warn':'white'); putMoney(wsCom,r,4,val,pending?'warn':'white'); putText(wsCom,r,5,normV164(it.ticketDonacion)||'Pte.Compra u otros gastos',pending?'warn':'white'); putText(wsCom,r,6,storeNameV164(it)||'Sin tienda',pending?'warn':'white'); putText(wsCom,r,7,personByIdV164(it.responsableId).nombre||'',pending?'warn':'white'); putText(wsCom,r,8,pending?'PENDIENTE':'OK',pending?'warn':'white'); totalCom += val; r++; });
    titleRow(wsCom,r,['TOTAL','','','','','','','']); putMoney(wsCom,r,4,totalCom,'white',true);

    const wsDon = baseSheet('DONACIONES DE PRODUCTO', [32,12,16,16,22,28,24,18]);
    mergeTitle(wsDon,1,'DONACIONES DE PRODUCTO',8); titleRow(wsDon,3,['Producto','Unidades','Precio','Importe','Tipo donación','Donante','Responsable','Origen']);
    r=4; let totalDon=0;
    donacionesSolo.forEach(it=>{ const val=valueCompraV164(it); const donor=resolveDonorNameV164(it)||'Sin donante'; putText(wsDon,r,1,productNameV164(it)); putNum(wsDon,r,2,it.unidades||0); putMoney(wsDon,r,3,it.precio ?? productByIdV164(it.productoId).precio ?? 0); putMoney(wsDon,r,4,val); putText(wsDon,r,5,it.ticketDonacion||''); putText(wsDon,r,6,donor); putText(wsDon,r,7,personByIdV164(it.responsableId).nombre||''); putText(wsDon,r,8,it.donorRef||it.tiendaId||''); totalDon += val; r++; });
    titleRow(wsDon,r,['TOTAL','','','','','','','']); putMoney(wsDon,r,4,totalDon,'white',true);

    function writeGroupingSheet(name, title, rows){
      const ws = baseSheet(name, [34,18,18,26,18]);
      mergeTitle(ws,1,title,5); titleRow(ws,3,[title.includes('DESTINO')?'Destino':'Segmento','Comprado','Donado','Pte. Compra u otros gastos','TOTAL']);
      let rr=4, c=0,d=0,p=0,t=0;
      rows.forEach(it=>{ putText(ws,rr,1,it.label||''); putMoney(ws,rr,2,it.comprado||0); putMoney(ws,rr,3,it.donado||0); putMoney(ws,rr,4,it.pendiente||0, it.pendiente?'warn':'white'); putMoney(ws,rr,5,it.total||0); c+=Number(it.comprado||0); d+=Number(it.donado||0); p+=Number(it.pendiente||0); t+=Number(it.total||0); rr++; });
      titleRow(ws,rr,['TOTAL GENERAL','','','','']); putMoney(ws,rr,2,c,'white',true); putMoney(ws,rr,3,d,'white',true); putMoney(ws,rr,4,p,p?'warn':'white',true); putMoney(ws,rr,5,t,'white',true);
      return ws;
    }
    const wsSeg = writeGroupingSheet('CALCULOS_SEGMENTO','CÁLCULOS SEGMENTO',segRows);
    const wsDest = writeGroupingSheet('CALCULOS_DESTINO','CÁLCULOS DESTINO',destRows);

    const wsTT = baseSheet('CALCULOS_TIENDA_TICKET', [56,16,42]);
    mergeTitle(wsTT,1,'CÁLCULOS TIENDA Y TICKET',3); titleRow(wsTT,3,['Concepto','Importe','Imagen']);
    r=4; let tt=0;
    tiendaRows.forEach(it=>{
      putText(wsTT,r,1,it.label||it.k||'',it.pending?'warn':'white');
      putMoney(wsTT,r,2,it.v,it.pending?'warn':'white');
      if(it.image){ putText(wsTT,r,3,''); addImage(wsTT,it.image,r,3,210,122); wsTT.getRow(r).height=100; }
      else { putText(wsTT,r,3,'Sin imagen',it.pending?'warn':'white'); }
      tt += Number(it.v||0); r++;
    });
    titleRow(wsTT,r,['TOTAL','','']); putMoney(wsTT,r,2,tt,'white',true); putText(wsTT,r,3,'');

    const wsGraf = baseSheet('GRAFICAS', [28,28,28,28,28]);
    mergeTitle(wsGraf,1,'GRÁFICAS DEL EVENTO',5);
    addImage(wsGraf, await makeChartImageDataUrlV164(), 3, 1, 1350, 625);
    wsGraf.getRow(3).height = 470;

    for(const ws of wb.worksheets){
      autoFitSheetV164(ws, 11, 72);
    }
    wsRes.getColumn(2).width = Math.max(wsRes.getColumn(2).width, 52);
    wsTT.getColumn(3).width = 28;
    wsGraf.columns.forEach(c => c.width = 28);
    for(const ws of wb.worksheets) await protectSheetV164(ws);

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileNameV164(ev);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  window.addEventListener('load', () => {
    try{ if(typeof render === 'function') render(); }catch(_){ }
  });
})();


/* ==== V17.2 FIXES: EXCEL RESUMEN, ORDENACIONES Y DONACIONES ==== */
(function(){
  const VERSION = 'ControlEvent v28.10';
  const $v171 = id => document.getElementById(id);
  const normV171 = v => String(v ?? '').trim();
  const escV171 = v => (typeof escapeHtml === 'function') ? escapeHtml(v) : String(v ?? '').replace(/[&<>\"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch] || ch));
  const moneyV171 = v => {
    try{ return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0)); }
    catch(_){ return `${Number(v || 0).toFixed(2)} €`; }
  };
  const isDonV171 = v => (typeof isDonationTicket === 'function') ? isDonationTicket(v) : /^DONADO/i.test(normV171(v));
  const isCurrentV171 = v => (typeof isCurrentExpenseTicket === 'function') ? isCurrentExpenseTicket(v) : normV171(v) === 'GASTOS CORRIENTES';
  const getEventV171 = () => (typeof selectedEvent === 'function' ? selectedEvent() : (state.eventos || []).find(e => e.id === state.selectedEventId));
  const collabsV171 = () => (typeof collabsForEvent === 'function' ? collabsForEvent() : (state.colaboradores || []).filter(c => String(c.eventId) === String(state.selectedEventId)));
  const comprasV171 = () => (typeof comprasForEvent === 'function' ? comprasForEvent() : (state.compras || []).filter(c => String(c.eventId) === String(state.selectedEventId)));

  function byIdV171(list, id){ return (list || []).find(x => String(x.id) === String(id)); }
  function productByIdV171(id){ return (typeof productoById === 'function' ? productoById(id) : null) || byIdV171(state.productos || [], id) || {}; }
  function personByIdV171(id){ return (typeof personaById === 'function' ? personaById(id) : null) || byIdV171(state.personas || [], id) || {}; }
  function storeByIdV171(id){ return (typeof tiendaById === 'function' ? tiendaById(id) : null) || byIdV171(state.tiendas || [], id) || {}; }
  function productNameV171(c){ return c?.producto?.nombre || productByIdV171(c?.productoId).nombre || 'Producto'; }
  function storeNameV171(c){ return c?.tienda?.nombre || storeByIdV171(c?.tiendaId).nombre || ''; }
  function personNameV171(c){ return c?.persona?.nombre || personByIdV171(c?.personaId).nombre || 'Sin nombre'; }
  function valueCompraV171(c){
    const p = productByIdV171(c?.productoId);
    const precio = Number(c?.precio != null ? c.precio : (c?.precioCalc != null ? c.precioCalc : (p.defaultPrecio ?? p.precio ?? 0)));
    return Number(c?.valor != null ? c.valor : precio * Number(c?.unidades || 0));
  }
  function resolveDonorNameV171(c){
    try{
      if(typeof resolveDonorNameV164 === 'function'){
        const v = resolveDonorNameV164(c);
        if(normV171(v) && normV171(v) !== 'Sin tienda') return normV171(v);
      }
      if(c?.donorLabel && normV171(c.donorLabel)) return normV171(c.donorLabel);
      if(c?.donorRef && normV171(c.donorRef)){
        const raw = normV171(c.donorRef);
        if(typeof donorLabel === 'function'){
          const d = donorLabel(raw);
          if(normV171(d)) return normV171(d);
        }
        if(raw.startsWith('P:')){ const p = personByIdV171(raw.slice(2)); if(p.nombre) return p.nombre; }
        if(raw.startsWith('T:')){ const t = storeByIdV171(raw.slice(2)); if(t.nombre) return t.nombre; }
        return raw;
      }
      if(c?.donante && normV171(c.donante)) return normV171(c.donante);
      const t = storeNameV171(c);
      if(t) return t;
    }catch(_){ }
    return 'Sin donante';
  }
  window.resolveDonorNameV171 = resolveDonorNameV171;

  function graphPartsV171(){
    const rows = collabsV171();
    const compras = comprasV171();
    const budget = (typeof budgetSummary === 'function') ? budgetSummary() : null;
    const sum = arr => arr.reduce((a,b)=>a+Number(b||0),0);
    const eventPrice = () => Number(getEventV171()?.precio || 0);
    const unitPrice = r => {
      const p = productByIdV171(r?.productoId);
      return Number(r?.precio != null ? r.precio : (r?.precioCalc != null ? r.precioCalc : (p.defaultPrecio ?? p.precio ?? 0)));
    };
    const totalCol = r => {
      const rg = String(r?.persona?.rango || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
      const parseLocal = v => {
        if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
        let t = String(v ?? '').trim();
        if(!t) return 0;
        t = t.replace(/[^0-9,.-]/g,'');
        if(t.includes(',') && t.includes('.')) t = t.replace(/\./g,'').replace(',', '.');
        else if(t.includes(',')) t = t.replace(',', '.');
        const n = Number(t);
        return Number.isFinite(n) ? n : 0;
      };
      if(rg === 'SOCIO'){
        const obligatorio = parseLocal(r.numero) * parseLocal(eventPrice());
        const voluntario = parseLocal(r.importeVoluntario ?? r.voluntario ?? r.donation ?? r.importe ?? 0);
        return obligatorio + voluntario;
      }
      return parseLocal(r.total ?? r.donation ?? r.importeVoluntario ?? r.voluntario ?? r.importe ?? 0);
    };
    const incomeLine = fn => rows.filter(fn).map(r => {
      const n = Number(r.numero || 0);
      const importeSocio = Number(r.base != null ? r.base : (n * eventPrice()));
      const voluntario = Number(r.donation != null ? r.donation : (r.importe || 0));
      return `${personNameV171(r)} — Nº ${n} — Socio: ${moneyV171(importeSocio)} — Voluntario: ${moneyV171(voluntario)} — Total: ${moneyV171(totalCol(r))} — ${r.situacion || ''}`;
    });
    const donationLine = ticket => compras.filter(r => normV171(r.ticketDonacion) === ticket).slice().sort((a,b)=> resolveDonorNameV171(a).localeCompare(resolveDonorNameV171(b),'es') || productNameV171(a).localeCompare(productNameV171(b),'es')).map(r => {
      const u = Number(r.unidades || 0), pr = unitPrice(r), val = valueCompraV171(r);
      return `${resolveDonorNameV171(r)} — ${productNameV171(r)} — ${u} uds x ${moneyV171(pr)} = ${moneyV171(val)} — ${normV171(r.ticketDonacion)}`;
    });
    const expenseLine = fn => compras.filter(fn).slice().sort((a,b)=> (normV171(a.ticketDonacion)||'Pte.Compra u otros gastos').localeCompare(normV171(b.ticketDonacion)||'Pte.Compra u otros gastos','es') || productNameV171(a).localeCompare(productNameV171(b),'es')).map(r => {
      const u = Number(r.unidades || 0), pr = unitPrice(r), val = valueCompraV171(r);
      return `${normV171(r.ticketDonacion) || 'Pte.Compra u otros gastos'} — ${productNameV171(r)} — ${storeNameV171(r) || 'Sin tienda'} — ${u} uds x ${moneyV171(pr)} = ${moneyV171(val)}`;
    });
    const incomeItems = [
      {label:'Socios Banco', value:sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Banco').map(totalCol)), color:'#2563eb', lines:incomeLine(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Banco')},
      {label:'Socios Bizum', value:sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Bizum').map(totalCol)), color:'#16a34a', lines:incomeLine(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Bizum')},
      {label:'Socios Efectivo', value:sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Efectivo').map(totalCol)), color:'#84cc16', lines:incomeLine(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Efectivo')},
      {label:'No socios Banco', value:sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Banco').map(totalCol)), color:'#60a5fa', lines:incomeLine(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Banco')},
      {label:'No socios Bizum', value:sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Bizum').map(totalCol)), color:'#34d399', lines:incomeLine(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Bizum')},
      {label:'No socios Efectivo', value:sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Efectivo').map(totalCol)), color:'#bef264', lines:incomeLine(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Efectivo')},
      {label:'Pendiente de ingresar', value:sum(rows.filter(r => r.situacion === 'Pendiente').map(totalCol)), color:'#f59e0b', lines:incomeLine(r => r.situacion === 'Pendiente')}
    ];
    const donationItems = [
      {label:'Donado por tiendas', value:sum(compras.filter(r => normV171(r.ticketDonacion) === 'DONADO TIENDA').map(valueCompraV171)), color:'#fcd34d', lines:donationLine('DONADO TIENDA')},
      {label:'Donado por socios', value:sum(compras.filter(r => normV171(r.ticketDonacion) === 'DONADO SOCIO').map(valueCompraV171)), color:'#f59e0b', lines:donationLine('DONADO SOCIO')},
      {label:'Donado por no socios', value:sum(compras.filter(r => normV171(r.ticketDonacion) === 'DONADO OTROS').map(valueCompraV171)), color:'#b45309', lines:donationLine('DONADO OTROS')}
    ];
    const expenseItems = [
      {label:'Gastado por ticket', value:sum(compras.filter(r => !isDonV171(r.ticketDonacion) && !isCurrentV171(r.ticketDonacion) && normV171(r.ticketDonacion) !== '').map(valueCompraV171)), color:'#dc2626', lines:expenseLine(r => !isDonV171(r.ticketDonacion) && !isCurrentV171(r.ticketDonacion) && normV171(r.ticketDonacion) !== '')},
      {label:'Gastos corrientes', value:sum(compras.filter(r => isCurrentV171(r.ticketDonacion)).map(valueCompraV171)), color:'#ef4444', lines:expenseLine(r => isCurrentV171(r.ticketDonacion))},
      {label:'Pendiente de compra', value:sum(compras.filter(r => !isDonV171(r.ticketDonacion) && normV171(r.ticketDonacion) === '').map(valueCompraV171)), color:'#fb7185', lines:expenseLine(r => !isDonV171(r.ticketDonacion) && normV171(r.ticketDonacion) === '')}
    ];
    const totalIncomeRaw = incomeItems.reduce((a,b)=>a+Number(b.value||0),0);
    const totalIncome = Number.isFinite(Number(budget?.ingresosDinero?.totalIngresado)) ? Number(budget.ingresosDinero.totalIngresado) : totalIncomeRaw;
    const totalDon = donationItems.reduce((a,b)=>a+Number(b.value||0),0);
    const totalExp = expenseItems.reduce((a,b)=>a+Number(b.value||0),0);
    const saldoActual = Number.isFinite(Number(budget?.operativa?.saldoActual)) ? Number(budget.operativa.saldoActual) : (totalIncome - totalExp);
    const saldoOperativo = Number.isFinite(Number(budget?.operativa?.saldoOperativo)) ? Number(budget.operativa.saldoOperativo) : (totalIncome - totalExp);
    const saldoItems = [{label:'Saldo operativo', value:Math.abs(saldoOperativo), displayValue:saldoOperativo, color:saldoOperativo >= 0 ? '#155e75' : '#7f1d1d', lines:[]}];
    return {incomeItems, donationItems, expenseItems, saldoItems, totalIncome, totalIncomeRaw, totalDon, totalExp, saldoActual, saldoOperativo};
  }
  window.graphPartsV171 = graphPartsV171;
  window.graphPartsV164 = graphPartsV171;

  function legendV171(items){
    const html = items.filter(x => Number(x.value || 0) !== 0).map(x => `<span><span class="legend-dot" style="background:${x.color}"></span>${escV171(x.label)}: ${escV171(moneyV171(x.displayValue ?? x.value))}</span>`).join('');
    return `<div class="chart-note" style="display:flex;flex-wrap:wrap;gap:10px 16px;margin-top:8px">${html}</div>`;
  }
  function segV171(value, max, color, title){
    const w = Math.max(0, Number(value || 0)) / max * 100;
    return `<div class="chart-seg" title="${escV171(title)}" style="width:${w}%;background:${color};"></div>`;
  }
  renderGraficas = function(){
    const wrap = $v171('eventChartWrap');
    if(!wrap) return;
    const g = graphPartsV171();
    const maxVal = Math.max(1, g.totalIncomeRaw || g.totalIncome, g.totalDon, g.totalExp, Math.abs(g.saldoOperativo));
    function row(label, total, items){
      const segs = items.map(it => {
        const amount = it.displayValue ?? it.value;
        const detail = (it.lines && it.lines.length) ? ('\n' + it.lines.join('\n')) : '';
        return segV171(it.value, maxVal, it.color, `${it.label}: ${moneyV171(amount)}${detail}`);
      }).join('');
      return `<div class="chart-row"><div class="chart-label">${escV171(label)}: ${escV171(moneyV171(total))}</div><div><div class="chart-track">${segs}</div>${legendV171(items)}</div></div>`;
    }
    wrap.innerHTML = `<div class="chart-shell"><div class="chart-bars">${row('INGRESOS', g.totalIncome, g.incomeItems)}${row('DONACIÓN DE PRODUCTO', g.totalDon, g.donationItems)}${row('GASTOS', g.totalExp, g.expenseItems)}${row('SALDO OPERATIVO', g.saldoOperativo, g.saldoItems)}</div></div>`;
  };

  async function makeChartImageDataUrlV171(){
    const g = graphPartsV171();
    const canvas = document.createElement('canvas');
    canvas.width = 1800; canvas.height = 790;
    const ctx = canvas.getContext('2d');
    const maxVal = Math.max(1, g.totalIncomeRaw || g.totalIncome, g.totalDon, g.totalExp, Math.abs(g.saldoOperativo));
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#111827'; ctx.font = 'bold 34px Arial'; ctx.fillText('GRÁFICAS DEL EVENTO', 42, 54);
    function drawRow(y, label, total, items){
      ctx.fillStyle = '#111827'; ctx.font = 'bold 22px Arial';
      ctx.fillText(`${label}: ${moneyV171(total)}`, 42, y);
      // Barras más desplazadas a la derecha para que la etiqueta de DONACIÓN DE PRODUCTO no se monte.
      const x = 560, w = 1080, h = 38;
      ctx.fillStyle = '#f3f4f6'; ctx.fillRect(x, y-29, w, h);
      let cx = x;
      items.forEach(it => {
        const segW = Math.max(0, Number(it.value || 0)) / maxVal * w;
        if(segW > 0){ ctx.fillStyle = it.color; ctx.fillRect(cx, y-29, segW, h); cx += segW; }
      });
      ctx.font = '16px Arial';
      let lx = x, ly = y + 34;
      items.filter(it => Number(it.value || 0) !== 0).forEach(it => {
        const txt = `${it.label}: ${moneyV171(it.displayValue ?? it.value)}`;
        const tw = ctx.measureText(txt).width;
        if(lx + tw + 42 > x + w){ lx = x; ly += 24; }
        ctx.fillStyle = it.color; ctx.fillRect(lx, ly-13, 13, 13);
        ctx.fillStyle = '#374151'; ctx.fillText(txt, lx + 18, ly);
        lx += tw + 52;
      });
      return y + 142;
    }
    let y = 116;
    y = drawRow(y, 'INGRESOS', g.totalIncome, g.incomeItems);
    y = drawRow(y, 'DONACIÓN DE PRODUCTO', g.totalDon, g.donationItems);
    y = drawRow(y, 'GASTOS', g.totalExp, g.expenseItems);
    drawRow(y, 'SALDO OPERATIVO', g.saldoOperativo, g.saldoItems);
    return canvas.toDataURL('image/png');
  }
  window.makeChartImageDataUrlV171 = makeChartImageDataUrlV171;
  window.makeChartImageDataUrlV164 = makeChartImageDataUrlV171;
  window.makeChartImageDataUrl = makeChartImageDataUrlV171;

  function groupingRowsV171(kind){
    if(kind === 'segmento' && typeof summaryBySegmento === 'function') return summaryBySegmento();
    if(kind === 'destino' && typeof summaryByDestino === 'function') return summaryByDestino();
    return [];
  }
  async function makeGroupingChartImageV171(kind){
    const rows = groupingRowsV171(kind);
    if(typeof makeGroupingChartImageV164 === 'function') return makeGroupingChartImageV164(kind);
    const canvas = document.createElement('canvas');
    const height = Math.max(520, 115 + rows.length * 96);
    canvas.width = 1500; canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    const title = kind === 'segmento' ? 'POR SEGMENTO' : 'POR DESTINO';
    const totalGeneral = rows.reduce((a,b)=>a+Number(b.total||0),0);
    ctx.fillStyle = '#111827'; ctx.font = 'bold 30px Arial'; ctx.fillText(`${title} – TOTAL GENERAL: ${moneyV171(totalGeneral)}`, 35, 48);
    ctx.font = '16px Arial';
    const legends = [['#dc2626','Comprado'],['#f59e0b','Donado'],['#fb7185','Pte. Compra u otros gastos']];
    let lx = 35;
    legends.forEach(([color,label]) => { ctx.fillStyle = color; ctx.fillRect(lx,75,14,14); ctx.fillStyle = '#374151'; ctx.fillText(label,lx+20,88); lx += ctx.measureText(label).width + 70; });
    const maxVal = Math.max(1, ...rows.flatMap(r => [Number(r.comprado||0), Number(r.donado||0), Number(r.pendiente||0)]));
    let y = 126;
    rows.forEach(r => {
      ctx.fillStyle = '#111827'; ctx.font = 'bold 18px Arial'; ctx.fillText(`${r.label} · ${moneyV171(r.total)}`, 35, y);
      const x = 360, w = 930, h = 16;
      [[r.comprado,'#dc2626','Comprado'],[r.donado,'#f59e0b','Donado'],[r.pendiente,'#fb7185','Pte. Compra u otros gastos']].forEach((v, i) => {
        const yy = y - 4 + i*24;
        ctx.fillStyle = '#64748b'; ctx.font = '14px Arial'; ctx.fillText(v[2], 190, yy + 13);
        ctx.fillStyle = '#f3f4f6'; ctx.fillRect(x, yy, w, h);
        ctx.fillStyle = v[1]; ctx.fillRect(x, yy, Math.max(2, Number(v[0]||0)/maxVal*w), h);
        ctx.fillStyle = '#111827'; ctx.font = '14px Arial'; ctx.fillText(moneyV171(v[0]), x + w + 18, yy + 13);
      });
      y += 92;
    });
    return canvas.toDataURL('image/png');
  }
  window.makeGroupingChartImageV171 = makeGroupingChartImageV171;

  function fileNameV171(ev){
    const title = String(ev?.titulo || 'evento').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'').replace(/_+/g,'_') || 'evento';
    const now = new Date();
    const dd = String(now.getDate()).padStart(2,'0');
    const mm = String(now.getMonth()+1).padStart(2,'0');
    const yyyy = String(now.getFullYear());
    return `ControlEvent_v28_10_INFOEVENTO-${title}_${yyyy}${mm}${dd}.xlsx`;
  }
  window.xlsxFilename = fileNameV171;

  async function ensureJSZipV171(){
    if(window.JSZip) return true;
    try{
      if(typeof loadScriptWithFallback === 'function'){
        await loadScriptWithFallback(['./vendor/jszip.min.js','https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js']);
        return !!window.JSZip;
      }
    }catch(_){ }
    return false;
  }
  async function hardenWorkbookBufferV171(buffer){
    try{
      if(!(await ensureJSZipV171())) return buffer;
      const zip = await window.JSZip.loadAsync(buffer);
      const wbFile = zip.file('xl/workbook.xml');
      if(wbFile){
        let xml = await wbFile.async('string');
        if(!/<workbookProtection\b/.test(xml)) xml = xml.replace(/(<bookViews\b)/, '<workbookProtection lockStructure="1" lockWindows="1" workbookPassword="D184"/>$1');
        zip.file('xl/workbook.xml', xml);
      }
      const sheetFiles = Object.keys(zip.files).filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n));
      for(const name of sheetFiles){
        const f = zip.file(name); if(!f) continue;
        let xml = await f.async('string');
        if(/<sheetProtection\b/.test(xml)){
          xml = xml.replace(/<sheetProtection\b([^>]*)\/>/, (m, attrs) => {
            let a = attrs;
            const setAttr = (key, val) => { a = new RegExp('\\s'+key+'="[^"]*"').test(a) ? a.replace(new RegExp('\\s'+key+'="[^"]*"'), ` ${key}="${val}"`) : a + ` ${key}="${val}"`; };
            setAttr('sheet','1'); setAttr('objects','1'); setAttr('scenarios','1'); setAttr('selectLockedCells','0'); setAttr('selectUnlockedCells','0'); setAttr('formatCells','0'); setAttr('formatColumns','0'); setAttr('formatRows','0');
            return `<sheetProtection${a}/>`;
          });
        }
        zip.file(name, xml);
      }
      const drawingFiles = Object.keys(zip.files).filter(n => /^xl\/drawings\/drawing\d+\.xml$/.test(n));
      for(const name of drawingFiles){
        const f = zip.file(name); if(!f) continue;
        let xml = await f.async('string');
        xml = xml.replace(/<a:picLocks\b([^>]*)\/>/g, (m, attrs) => {
          let a = attrs;
          const setAttr = (key, val) => { a = new RegExp('\\s'+key+'="[^"]*"').test(a) ? a.replace(new RegExp('\\s'+key+'="[^"]*"'), ` ${key}="${val}"`) : a + ` ${key}="${val}"`; };
          setAttr('noSelect','1'); setAttr('noMove','1'); setAttr('noResize','1'); setAttr('noChangeAspect','1'); setAttr('noChangeArrowheads','1'); setAttr('noGrp','1');
          return `<a:picLocks${a}/>`;
        });
        xml = xml.replace(/<xdr:cNvPicPr>\s*<\/xdr:cNvPicPr>/g, '<xdr:cNvPicPr><a:picLocks noSelect="1" noMove="1" noResize="1" noChangeAspect="1" noChangeArrowheads="1" noGrp="1"/></xdr:cNvPicPr>');
        xml = xml.replace(/<xdr:clientData\s*\/>/g, '<xdr:clientData fLocksWithSheet="1" fPrintsWithSheet="1"/>');
        xml = xml.replace(/<xdr:clientData\b([^>]*)>/g, (m, attrs) => {
          let a = attrs;
          const setAttr = (key, val) => { a = new RegExp('\\s'+key+'="[^"]*"').test(a) ? a.replace(new RegExp('\\s'+key+'="[^"]*"'), ` ${key}="${val}"`) : a + ` ${key}="${val}"`; };
          setAttr('fLocksWithSheet','1'); setAttr('fPrintsWithSheet','1');
          return `<xdr:clientData${a}>`;
        });
        zip.file(name, xml);
      }
      return await zip.generateAsync({type:'arraybuffer'});
    }catch(err){
      console.warn('No se pudo reforzar internamente la protección XLSX:', err);
      return buffer;
    }
  }

  async function protectSheetV171(ws){
    try{
      await ws.protect('open_excel_arrastre', {
        selectLockedCells:false, selectUnlockedCells:false,
        formatCells:false, formatColumns:false, formatRows:false,
        insertColumns:false, insertRows:false, insertHyperlinks:false,
        deleteColumns:false, deleteRows:false, sort:false, autoFilter:false, pivotTables:false,
        objects:false, scenarios:false
      });
      if(ws.model && ws.model.sheetProtection){
        ws.model.sheetProtection.objects = true;
        ws.model.sheetProtection.scenarios = true;
        ws.model.sheetProtection.selectLockedCells = false;
        ws.model.sheetProtection.selectUnlockedCells = false;
      }
    }catch(_){ }
  }

  function autoFitSheetV171(ws, min=10, max=72){
    ws.columns.forEach(col => {
      let width = col.width || min;
      col.eachCell({includeEmpty:true}, cell => {
        let text = '';
        if(cell.value == null) text = '';
        else if(typeof cell.value === 'object' && cell.value.text) text = String(cell.value.text);
        else if(typeof cell.value === 'object' && cell.value.richText) text = cell.value.richText.map(x=>x.text).join('');
        else text = String(cell.value);
        width = Math.max(width, Math.min(max, text.length + 3));
      });
      col.width = Math.max(min, Math.min(max, width));
    });
  }

  function summaryByTiendaTicketRowsV171(){
    if(typeof summaryByTiendaTicket === 'function'){
      try{ return summaryByTiendaTicket() || []; }catch(_){ }
    }
    return [];
  }

  function productSegmentV171(item){
    try{
      const p = productByIdV171(item?.productoId) || {};
      return normV171(item?.segmento || item?.producto?.segmento || p.segmento || '');
    }catch(_){ return ''; }
  }
  function normalizeSortV171(value){
    return normV171(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  }
  function categoryRankV171(value){
    const s = normalizeSortV171(value);
    const order = ['COMIDA','BEBIDA','INFRAESTRUCTURA'];
    const pos = order.indexOf(s);
    return pos >= 0 ? pos : 99;
  }
  function compareSegmentProductV171(a,b, fixedCategoryOrder=false){
    const sa = productSegmentV171(a);
    const sb = productSegmentV171(b);
    if(fixedCategoryOrder){
      const ra = categoryRankV171(sa), rb = categoryRankV171(sb);
      if(ra !== rb) return ra - rb;
    }
    const segCmp = normalizeSortV171(sa).localeCompare(normalizeSortV171(sb), 'es');
    if(segCmp) return segCmp;
    return normalizeSortV171(productNameV171(a)).localeCompare(normalizeSortV171(productNameV171(b)), 'es');
  }
  function emittedByTextV171(date=new Date()){
    const pad = n => String(n).padStart(2,'0');
    const dd = pad(date.getDate());
    const mm = pad(date.getMonth()+1);
    const yyyy = date.getFullYear();
    const hh = pad(date.getHours());
    const mi = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `Emitido por “©oltyLAB ’26_ControlEvent_v28_10_${dd}${mm}${yyyy}_${hh}:${mi}:${ss}”`;
  }

  async function exportExcelV171(){
    if(typeof isLocked === 'function' && isLocked() && typeof isGodRole === 'function' && !isGodRole()) return;
    const ev = getEventV171();
    if(!ev) return;
    try{ await ensureExcelJS(); }catch(err){ alert('No se pudo cargar el motor de Excel.'); return; }
    const wb = new ExcelJS.Workbook();
    wb.creator = `${VERSION} - ©oltyLAB ’26`; wb.created = new Date();
    const border = {top:{style:'thin', color:{argb:'FFDDE2EA'}},left:{style:'thin', color:{argb:'FFDDE2EA'}},bottom:{style:'thin', color:{argb:'FFDDE2EA'}},right:{style:'thin', color:{argb:'FFDDE2EA'}}};
    const fills = {title:'FF111827', ok:'FFECFDF5', bad:'FFFEF2F2', warn:'FFFFF7ED', refund:'33FF0000', white:'FFFFFFFF', soft:'FFF8FAFC'};
    const moneyFmt = '#,##0.00 [$€-C0A]';
    function baseSheet(name, widths){ const ws = wb.addWorksheet(name); ws.properties.defaultRowHeight = 22; ws.columns = widths.map(w=>({width:w})); return ws; }
    function paint(cell, fill='white'){ cell.border=border; cell.alignment={vertical:'middle', wrapText:true}; if(fills[fill]) cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:fills[fill]}}; }
    function titleRow(ws,r,headers){ headers.forEach((h,i)=>{ const c=ws.getCell(r,i+1); c.value=h; c.font={bold:true,color:{argb:'FFFFFFFF'}}; c.fill={type:'pattern',pattern:'solid',fgColor:{argb:fills.title}}; c.border=border; c.alignment={vertical:'middle',horizontal:'center',wrapText:true}; }); ws.getRow(r).height=24; }
    function mergeTitle(ws,r,text,cols){ ws.mergeCells(r,1,r,cols); const c=ws.getCell(r,1); c.value=text; c.font={bold:true,color:{argb:'FFFFFFFF'},size:13}; c.fill={type:'pattern',pattern:'solid',fgColor:{argb:fills.title}}; c.border=border; c.alignment={vertical:'middle',horizontal:'center',wrapText:true}; ws.getRow(r).height=26; }
    function putText(ws,r,c,v,fill='white',bold=false){ const cell=ws.getCell(r,c); cell.value=v==null?'':String(v); paint(cell,fill); cell.font={bold:!!bold,color:{argb:'FF111827'}}; return cell; }
    function putMoney(ws,r,c,v,fill='white',bold=false){ const cell=ws.getCell(r,c); cell.value=Number(v||0); cell.numFmt=moneyFmt; paint(cell,fill); cell.font={bold:!!bold,color:{argb:'FF111827'}}; return cell; }
    function putNum(ws,r,c,v,fill='white'){ const cell=ws.getCell(r,c); cell.value=Number(v||0); paint(cell,fill); cell.font={color:{argb:'FF111827'}}; return cell; }
    function addImage(ws, dataUrl, r, c, width, height){
      if(!dataUrl) return false;
      const m = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
      if(!m) return false;
      const ext = m[1].includes('png') ? 'png' : 'jpeg';
      const id = wb.addImage({base64:dataUrl, extension:ext});
      ws.addImage(id, {tl:{col:c-1+0.08,row:r-1+0.08}, ext:{width,height}, editAs:'oneCell'});
      return true;
    }
    function reserveImageRows(ws, startRow, heightPx, blankRows=2){
      const rows = Math.ceil(heightPx / 28);
      for(let rr=startRow; rr<startRow+rows; rr++) ws.getRow(rr).height = 21;
      return startRow + rows + blankRows;
    }

    const collabs = collabsV171();
    const compras = comprasV171();
    const comprasSolo = compras.filter(x => !isDonV171(x.ticketDonacion)).slice().sort((a,b)=> compareSegmentProductV171(a,b,true));
    const donacionesSolo = compras.filter(x => isDonV171(x.ticketDonacion)).slice().sort((a,b)=> compareSegmentProductV171(a,b,true));
    const budget = (typeof budgetSummary === 'function') ? budgetSummary() : {};
    const g = graphPartsV171();
    const segRows = groupingRowsV171('segmento');
    const destRows = groupingRowsV171('destino');
    const tiendaRows = (function(rows){
      // v21.5.1: Refuerzo real para que CALCULOS_TIENDA_TICKET lleve las fotos.
      // No dependemos solo de row.image; buscamos en state.ticketImages por todas las claves usadas
      // históricamente: eventId|Tienda | TKxx, eventId|Tienda|TKxx, eventId|TKxx, etc.
      const evId = String(ev.id || (state && state.selectedEventId) || '');
      const imgs = (state && state.ticketImages) ? state.ticketImages : {};
      const clean = v => String(v ?? '').trim();
      const up = v => clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ');
      const compact = v => up(v).replace(/\s*\|\s*/g,'|');
      const makeKey = k => {
        try{ if(typeof ticketImageStateKey === 'function') return ticketImageStateKey(k, evId); }catch(_){ }
        return `${evId}|${k}`;
      };
      const findImage = row => {
        if(!row || row.pending || row.donated === true || row.attachable === false) return row?.image || '';
        const candidates = [];
        const add = v => { v = clean(v); if(v && !candidates.includes(v)) candidates.push(v); };
        add(row.k); add(row.label); add(row.key); add(row.clave); add(row.concepto);
        const src = clean(row.k || row.label || '');
        const parts = src.split('|').map(x=>clean(x)).filter(Boolean);
        if(parts.length >= 2){
          const tienda = parts[0];
          const tk = parts[1].split('·')[0].trim();
          add(`${tienda} | ${tk}`); add(`${tienda}|${tk}`); add(`${tk} | ${tienda}`); add(`${tk}|${tienda}`); add(tk);
        }
        if(clean(row.rawTicket)){
          add(row.rawTicket);
          if(parts[0]){ add(`${parts[0]} | ${row.rawTicket}`); add(`${parts[0]}|${row.rawTicket}`); }
        }
        for(const c of candidates){
          const keys = [c, makeKey(c), `${evId}|${c}`];
          for(const k of keys){ if(imgs[k]) return imgs[k]; }
        }
        // Búsqueda flexible por contenido, dentro del evento activo.
        const srcUp = compact(src);
        const ticketPart = compact((parts[1] || row.rawTicket || '').split('·')[0]);
        const tiendaPart = compact(parts[0] || '');
        for(const [k,v] of Object.entries(imgs)){
          const ks = String(k);
          if(evId && !ks.startsWith(`${evId}|`)) continue;
          const rest = compact(ks.slice(evId ? evId.length + 1 : 0));
          if(srcUp && rest === srcUp) return v;
          if(ticketPart && rest.includes(ticketPart) && (!tiendaPart || rest.includes(tiendaPart))) return v;
        }
        return row.image || '';
      };
      return (rows || []).map(row => {
        const nr = Object.assign({}, row);
        const img = findImage(nr);
        if(img) nr.image = img;
        return nr;
      });
    })(summaryByTiendaTicketRowsV171());

    const wsRes = baseSheet('RESUMEN', [30,42,18,18,18,18,18]);
    let r = 1;
    wsRes.mergeCells(r,1,r,7);
    putText(wsRes, r++, 1, emittedByTextV171(new Date()), 'soft', true);
    mergeTitle(wsRes, r++, 'RESUMEN DEL EVENTO', 7);
    putText(wsRes,r,1,'Título del evento'); wsRes.mergeCells(r,2,r,7); putText(wsRes,r++,2,ev.titulo||'', 'white', true);
    const descText = normV171(ev.descripcion || '');
    const explicitLines = descText ? descText.split(/\r?\n/).length : 1;
    const descRows = Math.max(3, Math.min(40, Math.ceil(descText.length / 72) + explicitLines - 1));
    putText(wsRes,r,1,'Descripción del evento');
    wsRes.mergeCells(r,2,r+descRows-1,5);
    const dc=wsRes.getCell(r,2);
    dc.value=descText;
    paint(dc,'soft');
    dc.font={color:{argb:'FF111827'}};
    dc.alignment={vertical:'top',horizontal:'left',wrapText:true,shrinkToFit:false};
    for(let rr=r; rr<r+descRows; rr++) wsRes.getRow(rr).height=24;
    r += descRows;
    r += 1;
    putText(wsRes,r,1,'Situación del evento'); putText(wsRes,r++,2,ev.situacion || ev.estado || 'En curso');
    putText(wsRes,r,1,'Fecha inicio'); putText(wsRes,r++,2,ev.fechaIni || '');
    putText(wsRes,r,1,'Fecha fin'); putText(wsRes,r++,2,ev.fechaFin || '');
    putText(wsRes,r,1,'Precio evento'); putMoney(wsRes,r++,2,Number(ev.precio||0));
    r += 1;
    const ingresosResumen = Number.isFinite(Number(budget?.ingresosDinero?.totalIngresado)) ? Number(budget.ingresosDinero.totalIngresado) : g.totalIncome;
    const donacionResumen = g.totalDon;
    const gastosResumen = g.totalExp;
    const saldoActualResumen = Number.isFinite(Number(budget?.operativa?.saldoActual)) ? Number(budget.operativa.saldoActual) : g.saldoActual;
    const saldoOperativoResumen = Number.isFinite(Number(budget?.operativa?.saldoOperativo)) ? Number(budget.operativa.saldoOperativo) : g.saldoOperativo;
    putText(wsRes,r,1,'Ingresos'); putMoney(wsRes,r++,2,ingresosResumen,'white',true);
    putText(wsRes,r,1,'Donación de producto'); putMoney(wsRes,r++,2,donacionResumen,'white',true);
    putText(wsRes,r,1,'Gastos'); putMoney(wsRes,r++,2,gastosResumen,'white',true);
    putText(wsRes,r,1,'Saldo actual'); putMoney(wsRes,r++,2,saldoActualResumen,saldoActualResumen>=0?'ok':'bad',true);
    putText(wsRes,r,1,'Saldo operativo'); putMoney(wsRes,r++,2,saldoOperativoResumen,saldoOperativoResumen>=0?'ok':'bad',true);
    r += 7;
    mergeTitle(wsRes, r++, 'GRÁFICAS DE CÁLCULOS POR AGRUPACIÓN', 7);
    r += 2;
    putText(wsRes, r, 1, 'Por segmento', 'white', true); r += 1;
    const segImgHeight = 430;
    addImage(wsRes, await makeGroupingChartImageV171('segmento'), r, 1, 1180, segImgHeight);
    r = reserveImageRows(wsRes, r, segImgHeight, 4);
    putText(wsRes, r, 1, 'Por destino', 'white', true); r += 1;
    const destImgHeight = 430;
    addImage(wsRes, await makeGroupingChartImageV171('destino'), r, 1, 1180, destImgHeight);
    reserveImageRows(wsRes, r, destImgHeight, 0);

    const wsIng = baseSheet('INGRESOS', [28,10,16,14,15,17,15,15]);
    mergeTitle(wsIng,1,'INGRESOS',8); titleRow(wsIng,3,['Nombre','Número','Situación','Rango','Importe socio','Importe voluntario','Total','Pendiente']);
    r=4; let totalSocioIng=0, totalVolIng=0, totalIng=0, totalPend=0;
    collabs.forEach(it=>{
      const persona=it.persona||personByIdV171(it.personaId);
      const numero=Number(it.numero||0);
      const nombrePersona = persona.nombre || '';
      const rangoPersona = String(persona.rango || '').trim().toUpperCase();
      const importeSocio = rangoPersona === 'SOCIO' ? numero * Number(ev.precio || 0) : 0;
      const importeVoluntario=Number(it.importe||0);
      const total=importeSocio+importeVoluntario;
      const pendiente=it.situacion==='Pendiente'?total:0;
      const normNombre = String(nombrePersona).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
      const isDevIngresos = normNombre === 'Z_DEV_INGRESOS' || normNombre === 'DEVOLUCIONES';
      const isPenaArrastre = normNombre === 'PENA EL ARRASTRE' || normNombre.includes('PENA EL ARRASTRE');
      const specialFill = isDevIngresos ? 'refund' : (isPenaArrastre ? 'greenSoft' : 'white');
      const nameCell = putText(wsIng,r,1,nombrePersona, specialFill);
      if(isDevIngresos){
        addCellNote(nameCell, 'Este importe se corresponde con el dinero devuelto a personas\nque pagan el evento pero se les exime del pago.\nSe meten primero como que pagan\ny después se les devuelve.');
      }
      if(isPenaArrastre){
        addCellNote(nameCell, 'Dinero que se saca de la cuenta de la peña\npara contribuir al pago de este evento.\nFijarte en el importe de la celda Total:\nal ser PERSONA SOCIO, parte aparece como importe socio\ny el resto como Importe voluntario.');
      }
      putNum(wsIng,r,2,numero, specialFill); putText(wsIng,r,3,it.situacion||'', specialFill); putText(wsIng,r,4,persona.rango||'', specialFill);
      putMoney(wsIng,r,5,importeSocio, specialFill); putMoney(wsIng,r,6,importeVoluntario, specialFill); putMoney(wsIng,r,7,total, specialFill); putMoney(wsIng,r,8,pendiente, isDevIngresos ? 'refund' : (pendiente?'warn':'white'));
      totalSocioIng += importeSocio; totalVolIng += importeVoluntario; totalIng += total; totalPend += pendiente; r++;
    });
    titleRow(wsIng,r,['TOTAL','','','','','','','']); putMoney(wsIng,r,5,totalSocioIng,'white',true); putMoney(wsIng,r,6,totalVolIng,'white',true); putMoney(wsIng,r,7,totalIng,'white',true); putMoney(wsIng,r,8,totalPend,'warn',true);

    const wsCom = baseSheet('COMPRAS Y OTROS GASTOS', [14,24,9,11,12,16,18,18,12]);
    mergeTitle(wsCom,1,'COMPRAS Y OTROS GASTOS',9); titleRow(wsCom,3,['Segmento','Producto','Unidades','Precio','Importe','Ticket/Otros gastos','Tienda','Responsable','Estado']);
    r=4; let totalCom=0;
    comprasSolo.forEach(it=>{ const val=valueCompraV171(it); const pending=normV171(it.ticketDonacion)===''; putText(wsCom,r,1,productSegmentV171(it),pending?'warn':'white'); putText(wsCom,r,2,productNameV171(it),pending?'warn':'white'); putNum(wsCom,r,3,it.unidades||0,pending?'warn':'white'); putMoney(wsCom,r,4,it.precio ?? productByIdV171(it.productoId).precio ?? 0,pending?'warn':'white'); putMoney(wsCom,r,5,val,pending?'warn':'white'); putText(wsCom,r,6,normV171(it.ticketDonacion)||'Pte.Compra u otros gastos',pending?'warn':'white'); putText(wsCom,r,7,storeNameV171(it)||'Sin tienda',pending?'warn':'white'); putText(wsCom,r,8,personByIdV171(it.responsableId).nombre||'',pending?'warn':'white'); putText(wsCom,r,9,pending?'PENDIENTE':'OK',pending?'warn':'white'); totalCom += val; r++; });
    titleRow(wsCom,r,['TOTAL','','','','','','','','']); putMoney(wsCom,r,5,totalCom,'white',true);

    const wsDon = baseSheet('DONACIONES DE PRODUCTO', [14,24,9,11,12,16,20,18]);
    mergeTitle(wsDon,1,'DONACIONES DE PRODUCTO',8); titleRow(wsDon,3,['Segmento','Producto','Unidades','Precio','Importe','Tipo donación','Donante','Responsable']);
    r=4; let totalDon=0;
    donacionesSolo.forEach(it=>{ const val=valueCompraV171(it); const donor=resolveDonorNameV171(it)||'Sin donante'; putText(wsDon,r,1,productSegmentV171(it)); putText(wsDon,r,2,productNameV171(it)); putNum(wsDon,r,3,it.unidades||0); putMoney(wsDon,r,4,it.precio ?? productByIdV171(it.productoId).precio ?? 0); putMoney(wsDon,r,5,val); putText(wsDon,r,6,it.ticketDonacion||''); putText(wsDon,r,7,donor); putText(wsDon,r,8,personByIdV171(it.responsableId).nombre||''); totalDon += val; r++; });
    titleRow(wsDon,r,['TOTAL','','','','','','','']); putMoney(wsDon,r,5,totalDon,'white',true);

    function writeGroupingSheet(name, title, rows){
      const ws = baseSheet(name, [34,18,18,26,18]);
      mergeTitle(ws,1,title,5); titleRow(ws,3,[title.includes('DESTINO')?'Destino':'Segmento','Comprado','Donado','Pte. Compra u otros gastos','TOTAL']);
      let rr=4, c=0,d=0,p=0,t=0;
      rows.forEach(it=>{ putText(ws,rr,1,it.label||''); putMoney(ws,rr,2,it.comprado||0); putMoney(ws,rr,3,it.donado||0); putMoney(ws,rr,4,it.pendiente||0, it.pendiente?'warn':'white'); putMoney(ws,rr,5,it.total||0); c+=Number(it.comprado||0); d+=Number(it.donado||0); p+=Number(it.pendiente||0); t+=Number(it.total||0); rr++; });
      titleRow(ws,rr,['TOTAL GENERAL','','','','']); putMoney(ws,rr,2,c,'white',true); putMoney(ws,rr,3,d,'white',true); putMoney(ws,rr,4,p,p?'warn':'white',true); putMoney(ws,rr,5,t,'white',true);
      return ws;
    }
    writeGroupingSheet('CALCULOS_SEGMENTO','CÁLCULOS SEGMENTO',segRows);
    writeGroupingSheet('CALCULOS_DESTINO','CÁLCULOS DESTINO',destRows);

    const wsTT = baseSheet('CALCULOS_TIENDA_TICKET', [56,16,42]);
    mergeTitle(wsTT,1,'CÁLCULOS TIENDA Y TICKET',3); titleRow(wsTT,3,['Concepto','Importe','Imagen']);
    r=4; let tt=0;
    tiendaRows.forEach(it=>{
      putText(wsTT,r,1,it.label||it.k||'',it.pending?'warn':'white');
      putMoney(wsTT,r,2,it.v,it.pending?'warn':'white');
      if(it.image){ putText(wsTT,r,3,''); addImage(wsTT,it.image,r,3,210,122); wsTT.getRow(r).height=100; }
      else { putText(wsTT,r,3,'Sin imagen',it.pending?'warn':'white'); }
      tt += Number(it.v||0); r++;
    });
    titleRow(wsTT,r,['TOTAL','','']); putMoney(wsTT,r,2,tt,'white',true); putText(wsTT,r,3,'');

    const wsGraf = baseSheet('GRAFICAS', [30,30,30,30,30,30]);
    mergeTitle(wsGraf,1,'GRÁFICAS DEL EVENTO',6);
    addImage(wsGraf, await makeChartImageDataUrlV171(), 3, 1, 1420, 625);
    wsGraf.getRow(3).height = 470;

    for(const ws of wb.worksheets){ autoFitSheetV171(ws, 11, 78); }
    const forceWidthsV180 = (ws, widths) => widths.forEach((w, idx) => { ws.getColumn(idx + 1).width = w; });
    forceWidthsV180(wsIng, [28,10,16,14,15,17,15,15]);
    forceWidthsV180(wsCom, [14,24,9,11,12,16,18,18,12]);
    forceWidthsV180(wsDon, [14,24,9,11,12,16,20,18]);
    forceWidthsV180(wsTT, [56,16,42]);
    wsRes.getColumn(1).width = 30;
    wsRes.getColumn(2).width = 42;
    wsRes.getColumn(3).width = 18;
    wsRes.getColumn(4).width = 18;
    wsRes.getColumn(5).width = 18;
    for(let cc=6; cc<=7; cc++) wsRes.getColumn(cc).width = Math.max(wsRes.getColumn(cc).width, 18);
    wsGraf.columns.forEach(c => c.width = 30);
    for(const ws of wb.worksheets) await protectSheetV171(ws);

    const buffer = await wb.xlsx.writeBuffer();
    const finalBuffer = await hardenWorkbookBufferV171(buffer);
    const blob = new Blob([finalBuffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileNameV171(ev);
    link.click();
    URL.revokeObjectURL(link.href);
  }

  window.exportExcel = exportExcel = exportExcelV171;

  function refreshVersionV171(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span, .appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+/i.test(el.textContent || '')) el.textContent = VERSION;
    });
  }
  refreshVersionV171();
  window.addEventListener('load', () => {
    refreshVersionV171();
    try{ if(typeof render === 'function') render(); }catch(_){ }
  });
})();

;/* ===== END legacy-inline-17.js ===== */


;/* ===== BEGIN legacy-inline-18-v180-tooltips-and-grouping-script.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #18. */
/* ==== V18.0 FIXES: GLOBOS AMPLIADOS, ORDENACIÓN Y AGRUPACIÓN DE DONACIONES ==== */
(function(){
  const VERSION = 'ControlEvent v28.10';
  const norm = v => String(v ?? '').trim();
  const fmt = v => {
    try{ return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0)); }
    catch(_){ return `${Number(v || 0).toFixed(2)} €`; }
  };
  const esc = v => (typeof escapeHtml === 'function') ? escapeHtml(v) : String(v ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch] || ch));
  const byId = (list, id) => (list || []).find(x => String(x.id) === String(id)) || null;
  const event = () => (typeof selectedEvent === 'function' ? selectedEvent() : byId(state?.eventos || [], state?.selectedEventId)) || {};
  const persona = id => (typeof personaById === 'function' ? personaById(id) : byId(state?.personas || [], id)) || {};
  const producto = id => (typeof productoById === 'function' ? productoById(id) : byId(state?.productos || [], id)) || {};
  const tienda = id => (typeof tiendaById === 'function' ? tiendaById(id) : byId(state?.tiendas || [], id)) || {};
  const isDon = v => (typeof isDonationTicket === 'function') ? isDonationTicket(v) : /^DONADO/i.test(norm(v));
  const isCurrent = v => (typeof isCurrentExpenseTicket === 'function') ? isCurrentExpenseTicket(v) : norm(v) === 'GASTOS CORRIENTES';
  const compras = () => (typeof comprasForEvent === 'function' ? comprasForEvent() : (state?.compras || []).filter(c => String(c.eventId) === String(state?.selectedEventId)));
  const collabs = () => (typeof collabsForEvent === 'function' ? collabsForEvent() : (state?.colaboradores || []).filter(c => String(c.eventId) === String(state?.selectedEventId)));

  function productName(c){ return c?.producto?.nombre || producto(c?.productoId).nombre || 'Producto'; }
  function productSegment(c){ return norm(c?.segmento || c?.producto?.segmento || producto(c?.productoId).segmento || ''); }
  function productDestino(c){ return norm(c?.destino || c?.producto?.destino || producto(c?.productoId).destino || ''); }
  function storeName(c){ return c?.tienda?.nombre || tienda(c?.tiendaId).nombre || ''; }
  function personNameFromRow(r){ return r?.persona?.nombre || persona(r?.personaId).nombre || 'Sin nombre'; }
  function unitPrice(c){ const p=producto(c?.productoId); return Number(c?.precio != null ? c.precio : (c?.precioCalc != null ? c.precioCalc : (p.defaultPrecio ?? p.precio ?? 0))); }
  function value(c){ return Number(c?.valor != null ? c.valor : unitPrice(c) * Number(c?.unidades || 0)); }
  function donorName(c){
    try{
      if(typeof resolveDonorNameV171 === 'function'){
        const v = resolveDonorNameV171(c);
        if(norm(v) && norm(v) !== 'Sin tienda') return norm(v);
      }
      if(typeof resolveDonorNameV164 === 'function'){
        const v = resolveDonorNameV164(c);
        if(norm(v) && norm(v) !== 'Sin tienda') return norm(v);
      }
      if(c?.donorLabel && norm(c.donorLabel)) return norm(c.donorLabel);
      if(c?.donorRef && norm(c.donorRef)){
        const raw = norm(c.donorRef);
        if(typeof donorLabel === 'function'){
          const d = donorLabel(raw);
          if(norm(d)) return norm(d);
        }
        if(raw.startsWith('P:')) return persona(raw.slice(2)).nombre || raw;
        if(raw.startsWith('T:')) return tienda(raw.slice(2)).nombre || raw;
        return raw;
      }
      if(c?.donante && norm(c.donante)) return norm(c.donante);
      return storeName(c) || 'Sin donante';
    }catch(_){ return 'Sin donante'; }
  }
  function ticketLabel(c){ return norm(c?.ticketDonacion) || 'Pte.Compra u otros gastos'; }
  function normalizeSort(v){ return norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase(); }
  function cmpText(a,b){ return normalizeSort(a).localeCompare(normalizeSort(b),'es'); }
  function cmpTicketProduct(a,b){ return cmpText(ticketLabel(a), ticketLabel(b)) || cmpText(productName(a), productName(b)) || cmpText(storeName(a), storeName(b)); }
  function cmpDonorProduct(a,b){ return cmpText(donorName(a), donorName(b)) || cmpText(productName(a), productName(b)); }
  function lineExpense(c){
    const u = Number(c?.unidades || 0), pr = unitPrice(c), val = value(c);
    const resp = persona(c?.responsableId).nombre || c?.responsable?.nombre || '';
    return `${ticketLabel(c)} — ${productName(c)} — ${storeName(c) || 'Sin tienda'} — ${u} uds x ${fmt(pr)} = ${fmt(val)}${resp ? ' — Resp.: ' + resp : ''}`;
  }
  function lineDonation(c){
    const u = Number(c?.unidades || 0), pr = unitPrice(c), val = value(c);
    const resp = persona(c?.responsableId).nombre || c?.responsable?.nombre || '';
    return `${donorName(c)} — ${productName(c)} — ${ticketLabel(c)} — ${u} uds x ${fmt(pr)} = ${fmt(val)}${resp ? ' — Resp.: ' + resp : ''}`;
  }
  function listOrEmpty(arr, empty='Sin elementos'){ return arr && arr.length ? arr : [empty]; }
  function incomeLine(r){
    const n = Number(r?.numero || 0);
    const base = Number(r?.base != null ? r.base : (n * Number(event().precio || 0)));
    const vol = Number(r?.donation != null ? r.donation : (r?.importe || 0));
    const total = Number(r?.total != null ? r.total : (base + vol));
    return `${personNameFromRow(r)} — Nº ${n} — Importe socio: ${fmt(base)} — Voluntario: ${fmt(vol)} — Total: ${fmt(total)} — ${r?.situacion || ''}`;
  }

  function donationRows(ticketCode){ return compras().filter(c => norm(c.ticketDonacion) === ticketCode); }
  function groupedNoSociosLines(){
    const map = new Map();
    donationRows('DONADO OTROS').forEach(c => {
      const d = donorName(c);
      if(!map.has(d)) map.set(d, {donor:d, total:0, rows:[]});
      const g = map.get(d);
      g.total += value(c); g.rows.push(c);
    });
    return Array.from(map.values()).sort((a,b)=>cmpText(a.donor,b.donor)).flatMap(g => {
      const details = g.rows.slice().sort(cmpDonorProduct).map(c => `· ${productName(c)} — ${Number(c.unidades || 0)} uds x ${fmt(unitPrice(c))} = ${fmt(value(c))}`);
      return [`${g.donor} — TOTAL ${fmt(g.total)}`, ...details];
    });
  }

  window.budgetSummary = budgetSummary = function(){
    const rows = collabs();
    const cRows = compras();
    const sociosRows = rows.filter(r => r.persona?.rango === 'SOCIO');
    const noSociosRows = rows.filter(r => r.persona?.rango !== 'SOCIO');
    const sumNum = arr => arr.reduce((a,b)=>a+Number(b.numero||0),0);
    const totalRow = r => Number(r.total != null ? r.total : (Number(r.base || 0) + Number(r.donation != null ? r.donation : r.importe || 0)));
    const sumTotal = arr => arr.reduce((a,b)=>a+totalRow(b),0);
    const paidTotal = arr => arr.filter(r => r.situacion !== 'Pendiente').reduce((a,b)=>a+totalRow(b),0);
    const pendingTotal = arr => arr.filter(r => r.situacion === 'Pendiente').reduce((a,b)=>a+totalRow(b),0);
    const collabItems = fn => rows.filter(fn).slice().sort((a,b)=>cmpText(personNameFromRow(a), personNameFromRow(b))).map(incomeLine);
    const socios = {
      count: sumNum(sociosRows), importe: sumTotal(sociosRows), ingresado: paidTotal(sociosRows), pendiente: pendingTotal(sociosRows),
      listImporte: listOrEmpty(collabItems(r => r.persona?.rango === 'SOCIO')),
      listIngresado: listOrEmpty(collabItems(r => r.persona?.rango === 'SOCIO' && r.situacion !== 'Pendiente')),
      listPendiente: listOrEmpty(collabItems(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Pendiente'))
    };
    const noSocios = {
      count: sumNum(noSociosRows), importe: sumTotal(noSociosRows), ingresado: paidTotal(noSociosRows), pendiente: pendingTotal(noSociosRows),
      listImporte: listOrEmpty(collabItems(r => r.persona?.rango !== 'SOCIO')),
      listIngresado: listOrEmpty(collabItems(r => r.persona?.rango !== 'SOCIO' && r.situacion !== 'Pendiente')),
      listPendiente: listOrEmpty(collabItems(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Pendiente'))
    };
    const gastoCompras = cRows.filter(c => !isDon(c.ticketDonacion) && !isCurrent(c.ticketDonacion) && norm(c.ticketDonacion) !== '').reduce((a,b)=>a+value(b),0);
    const gastosOrganizacion = cRows.filter(c => isCurrent(c.ticketDonacion)).reduce((a,b)=>a+value(b),0);
    const pendiente = cRows.filter(c => !isDon(c.ticketDonacion) && norm(c.ticketDonacion) === '').reduce((a,b)=>a+value(b),0);
    const donacionProducto = {
      donadoTienda: donationRows('DONADO TIENDA').reduce((a,b)=>a+value(b),0),
      donadoSocio: donationRows('DONADO SOCIO').reduce((a,b)=>a+value(b),0),
      donadoOtros: donationRows('DONADO OTROS').reduce((a,b)=>a+value(b),0),
      listTiendas: listOrEmpty(donationRows('DONADO TIENDA').slice().sort(cmpDonorProduct).map(lineDonation)),
      listSocios: listOrEmpty(donationRows('DONADO SOCIO').slice().sort(cmpDonorProduct).map(lineDonation)),
      listNoSocios: listOrEmpty(groupedNoSociosLines())
    };
    donacionProducto.valorDonado = donacionProducto.donadoTienda + donacionProducto.donadoSocio + donacionProducto.donadoOtros;
    const ingresosTotal = socios.importe + noSocios.importe;
    const ingresosRealizados = socios.ingresado + noSocios.ingresado;
    const gastosTotal = gastoCompras + gastosOrganizacion + pendiente;
    const gastosRealizados = gastoCompras + gastosOrganizacion;
    return {
      ingresosDinero:{socios, noSocios, donantes:noSocios, totalIngresado:ingresosRealizados, totalComprometido:ingresosTotal, pendiente:socios.pendiente + noSocios.pendiente},
      donacionProducto,
      operativa:{ingresos:ingresosTotal, ingresoDinero:ingresosRealizados, gastoCompras, gastosOrganizacion, pendiente, saldoActual:ingresosRealizados - gastosRealizados, saldoOperativo:ingresosTotal - gastosTotal}
    };
  };

  function groupingRows(kind){
    const rows = compras();
    const baseKeys = kind === 'segmento'
      ? (typeof SEGMENT_OPTIONS !== 'undefined' ? SEGMENT_OPTIONS.slice() : [])
      : (typeof DESTINO_OPTIONS !== 'undefined' ? DESTINO_OPTIONS.slice() : []);
    const seen = new Set(baseKeys.map(String));
    rows.forEach(c => {
      const k = kind === 'segmento' ? productSegment(c) : productDestino(c);
      if(k && !seen.has(String(k))){ seen.add(String(k)); baseKeys.push(k); }
    });
    return baseKeys.map(k => {
      const match = c => String(kind === 'segmento' ? productSegment(c) : productDestino(c)) === String(k);
      const comprados = rows.filter(c => match(c) && !isDon(c.ticketDonacion) && !isCurrent(c.ticketDonacion) && norm(c.ticketDonacion) !== '').sort(cmpTicketProduct);
      const donados = rows.filter(c => match(c) && isDon(c.ticketDonacion)).sort(cmpDonorProduct);
      const pendientes = rows.filter(c => match(c) && !isDon(c.ticketDonacion) && norm(c.ticketDonacion) === '').sort(cmpTicketProduct);
      const comprado = comprados.reduce((a,b)=>a+value(b),0);
      const donado = donados.reduce((a,b)=>a+value(b),0);
      const pendiente = pendientes.reduce((a,b)=>a+value(b),0);
      return {
        label:k,
        comprado, donado, pendiente,
        total: comprado + donado + pendiente,
        listComprado: listOrEmpty(comprados.map(lineExpense), 'Sin productos comprados'),
        listDonado: listOrEmpty(donados.map(lineDonation), 'Sin productos donados'),
        listPendiente: listOrEmpty(pendientes.map(lineExpense), 'Sin productos pendientes')
      };
    });
  }
  window.summaryBySegmento = summaryBySegmento = function(){ return groupingRows('segmento'); };
  window.summaryByDestino = summaryByDestino = function(){ return groupingRows('destino'); };

  function refreshVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span, .appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+/i.test(el.textContent || '')) el.textContent = VERSION;
    });
  }
  refreshVersion();
  window.addEventListener('load', () => { refreshVersion(); try{ if(typeof render === 'function') render(); }catch(_){} });
})();

;/* ===== END legacy-inline-18-v180-tooltips-and-grouping-script.js ===== */


;/* ===== BEGIN legacy-inline-19-v181-backup-tooltip-excel-script.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #19. */
/* ==== V18.1: tooltips redondeados, backup por evento y Excel INGRESOS ==== */
(function(){
  const VERSION = 'ControlEvent v28.10';
  const VERSION_FILE = 'ControlEvent_v28_10';
  const norm = v => String(v ?? '').trim();
  const normalize = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc = v => (typeof escapeHtml === 'function') ? escapeHtml(v) : String(v ?? '').replace(/[&<>\"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch] || ch));
  const byId = (arr,id) => (arr || []).find(x => String(x.id) === String(id)) || null;
  const isDonation = v => (typeof isDonationTicket === 'function') ? isDonationTicket(v) : /^DONADO/i.test(norm(v));
  const pad = n => String(n).padStart(2,'0');
  const nowStamp = () => { const d = new Date(); return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}_${pad(d.getMinutes())}_${pad(d.getSeconds())}`; };
  const cleanPart = v => normalize(v).replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').replace(/_+/g,'_') || 'SIN_CODIGO';

  function refreshVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span, .appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+/i.test(el.textContent || '')) el.textContent = VERSION;
    });
  }

  function ensureTooltip(){
    let tip = document.getElementById('ceTooltipV181');
    if(!tip){ tip = document.createElement('div'); tip.id = 'ceTooltipV181'; tip.className = 'ce-tooltip-v181'; document.body.appendChild(tip); }
    return tip;
  }
  function getTipText(el){
    if(!el) return '';
    let txt = el.getAttribute('data-v181-tip') || el.getAttribute('data-tip') || el.getAttribute('title') || '';
    if(txt && el.hasAttribute('title')){ el.setAttribute('data-v181-tip', txt); el.removeAttribute('title'); }
    return txt;
  }
  function placeTooltip(tip, x, y){
    const margin = 12;
    const long = (tip.textContent || '').length > 600 || (tip.textContent || '').split('\n').length > 14;
    tip.classList.toggle('long', long);
    tip.classList.toggle('full', (tip.textContent || '').length > 1600 || (tip.textContent || '').split('\n').length > 30);
    tip.style.display = 'block';
    tip.style.left = '0px'; tip.style.top = '0px';
    const rect = tip.getBoundingClientRect();
    let left = x + 16;
    let top = y + 16;
    if(left + rect.width > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - rect.width - margin);
    if(top + rect.height > window.innerHeight - margin) top = Math.max(margin, window.innerHeight - rect.height - margin);
    if(!tip.classList.contains('full')){ tip.style.left = left + 'px'; tip.style.top = top + 'px'; }
  }
  let activeTipEl = null;
  function showTipFromEvent(e){
    const el = e.target.closest('[title],[data-tip],[data-v181-tip]');
    if(!el) return;
    const txt = getTipText(el);
    if(!txt) return;
    activeTipEl = el;
    const tip = ensureTooltip();
    tip.textContent = txt;
    placeTooltip(tip, e.clientX || 24, e.clientY || 24);
  }
  function moveTip(e){ if(activeTipEl){ const tip = ensureTooltip(); if(tip.style.display !== 'none') placeTooltip(tip, e.clientX || 24, e.clientY || 24); } }
  function hideTip(){ activeTipEl = null; const tip = document.getElementById('ceTooltipV181'); if(tip) tip.style.display = 'none'; }
  document.addEventListener('mouseover', showTipFromEvent, true);
  document.addEventListener('focusin', showTipFromEvent, true);
  document.addEventListener('mousemove', moveTip, true);
  document.addEventListener('mouseout', e => { if(activeTipEl && !e.relatedTarget?.closest?.('[title],[data-tip],[data-v181-tip]')) hideTip(); }, true);
  document.addEventListener('focusout', hideTip, true);
  document.addEventListener('scroll', hideTip, true);
  document.addEventListener('keydown', e => { if(e.key === 'Escape') hideTip(); }, true);

  function eventList(){ return Array.isArray(state?.eventos) ? state.eventos : []; }
  function makeCodesFor(items, prefix){ const out = {}; (items || []).forEach((x,i)=> out[x.id] = prefix + String(i+1).padStart(prefix === 'EV' ? 3 : 4, '0')); return out; }
  function ticketEventId(fullKey){ const parts = String(fullKey).split('|'); return parts[0] || ''; }
  function ticketInnerKey(fullKey){ const parts = String(fullKey).split('|'); return parts.slice(1).join('|').trim(); }

  function askBackupScope(){
    return new Promise(resolve => {
      const events = eventList();
      const overlay = document.createElement('div');
      overlay.className = 'ce-backup-overlay-v181';
      overlay.innerHTML = `<div class="ce-backup-modal-v181"><h3>Descarga de datos</h3><p>Elige si quieres descargar todos los datos o solo los datos vinculados a un evento concreto.</p><div class="field"><label>Evento a descargar</label><select id="ceBackupScopeV181"><option value="TODOS">TODOS los eventos</option>${events.map(e => `<option value="${esc(e.id)}" ${String(e.id)===String(state?.selectedEventId||'')?'selected':''}>${esc(e.titulo || e.id)}</option>`).join('')}</select></div><div class="ce-backup-actions-v181"><button type="button" class="outline" id="ceBackupCancelV181">Cancelar</button><button type="button" id="ceBackupOkV181">Descargar</button></div></div>`;
      document.body.appendChild(overlay);
      const cleanup = val => { overlay.remove(); resolve(val); };
      overlay.querySelector('#ceBackupCancelV181').addEventListener('click', () => cleanup(null));
      overlay.querySelector('#ceBackupOkV181').addEventListener('click', () => cleanup(overlay.querySelector('#ceBackupScopeV181').value || 'TODOS'));
      overlay.addEventListener('click', e => { if(e.target === overlay) cleanup(null); });
    });
  }

  function scopedState(scope){
    const all = scope === 'TODOS';
    const eventos = all ? [...(state.eventos || [])] : (state.eventos || []).filter(e => String(e.id) === String(scope));
    const eventIds = new Set(eventos.map(e => String(e.id)));
    const colaboradores = (state.colaboradores || []).filter(c => all || eventIds.has(String(c.eventId)));
    const compras = (state.compras || []).filter(c => all || eventIds.has(String(c.eventId)));
    const personIds = new Set();
    colaboradores.forEach(c => { if(c.personaId) personIds.add(String(c.personaId)); });
    compras.forEach(c => { if(c.responsableId) personIds.add(String(c.responsableId)); const dr=String(c.donorRef||''); if(dr.startsWith('P:')) personIds.add(dr.slice(2)); });
    const storeIds = new Set();
    compras.forEach(c => { if(c.tiendaId) storeIds.add(String(c.tiendaId)); const dr=String(c.donorRef||''); if(dr.startsWith('T:')) storeIds.add(dr.slice(2)); });
    const productIds = new Set(compras.map(c => String(c.productoId)).filter(Boolean));
    const personas = all ? [...(state.personas || [])] : (state.personas || []).filter(p => personIds.has(String(p.id)));
    const tiendas = all ? [...(state.tiendas || [])] : (state.tiendas || []).filter(t => storeIds.has(String(t.id)));
    const productos = all ? [...(state.productos || [])] : (state.productos || []).filter(p => productIds.has(String(p.id)));
    const ticketImages = {};
    Object.entries(state.ticketImages || {}).forEach(([k,v]) => { if(all || eventIds.has(String(ticketEventId(k)))) ticketImages[k] = v; });
    return {eventos, personas, tiendas, productos, colaboradores, compras, ticketImages};
  }

  function backupFileName(scope, eventTitle){
    const title = scope === 'TODOS' ? 'TODOS' : cleanPart(eventTitle || 'EVENTO');
    return `${VERSION_FILE}_BACKUP_${title}_${nowStamp()}.xlsx`;
  }

  function splitLongText(s, size=30000){
    const txt = String(s || '');
    const out = [];
    for(let i=0; i<txt.length; i += size) out.push(txt.slice(i, i+size));
    return out.length ? out : [''];
  }

  exportSeedWorkbook = async function(){
    if(typeof isLocked === 'function' && isLocked()) return;
    const scope = await askBackupScope();
    if(!scope) return;
    try{ await ensureExcelJS(); }catch(err){ alert('No se pudo cargar el motor de Excel.'); return; }
    const scoped = scopedState(scope);
    const eventCode = makeCodesFor(scoped.eventos, 'EV');
    const personCode = makeCodesFor(scoped.personas, 'PE');
    const storeCode = makeCodesFor(scoped.tiendas, 'TI');
    const productCode = makeCodesFor(scoped.productos, 'PR');
    const selectedEvent = scope === 'TODOS' ? null : (scoped.eventos || []).find(e => String(e.id) === String(scope));
    const selectedCode = scope === 'TODOS' ? 'TODOS' : (eventCode[scope] || 'EV001');
    const selectedTitle = scope === 'TODOS' ? 'TODOS' : (selectedEvent?.titulo || selectedCode || 'EVENTO');
    const wb = new ExcelJS.Workbook();
    wb.creator = `${VERSION} - ©oltyLAB ’26`; wb.created = new Date();
    const border = {top:{style:'thin', color:{argb:'FFDDE2EA'}},left:{style:'thin', color:{argb:'FFDDE2EA'}},bottom:{style:'thin', color:{argb:'FFDDE2EA'}},right:{style:'thin', color:{argb:'FFDDE2EA'}}};
    const headFill = {type:'pattern', pattern:'solid', fgColor:{argb:'FF111827'}};
    function makeSheet(name, headers, rows){
      const ws = wb.addWorksheet(name);
      ws.columns = headers.map(h => ({width: Math.max(14, Math.min(42, String(h).length + 4))}));
      headers.forEach((h,i)=>{ const c=ws.getCell(1,i+1); c.value=h; c.font={bold:true,color:{argb:'FFFFFFFF'}}; c.fill=headFill; c.border=border; c.alignment={horizontal:'center',vertical:'middle',wrapText:true}; });
      rows.forEach(row => ws.addRow(row.map(v => v == null ? '' : v)));
      ws.eachRow(r => r.eachCell(c => { c.border=border; c.alignment={vertical:'middle',wrapText:true}; }));
      ws.columns.forEach((col,idx)=>{ let w=col.width||14; col.eachCell({includeEmpty:true}, cell => { w = Math.max(w, Math.min(70, String(cell.value ?? '').length + 3)); }); col.width = idx === headers.indexOf('IMAGEN_BASE64_PARTE') ? 72 : Math.min(70,w); });
      return ws;
    }
    makeSheet('METADATOS', ['CAMPO','VALOR'], [['VERSION', VERSION], ['ALCANCE', scope === 'TODOS' ? 'TODOS' : selectedTitle], ['EVENTO_CODIGO', scope === 'TODOS' ? 'TODOS' : selectedCode], ['FECHA_DESCARGA', nowStamp()], ['PROTECCION', 'Hojas protegidas para evitar cambios accidentales en la descarga.'], ['NOTA', 'Las imágenes grandes de tickets se dividen en TICKETS_PARTES para evitar ficheros Excel corruptos.']]);
    makeSheet('EVENTOS', ['EVENTO_CODIGO','EVENTO_ID','EVENTO_TITULO','EVENTO_PRECIO','EVENTO_FECHAINI','EVENTO_FECHAFIN','EVENTO_SITUACION','EVENTO_DESCRIPCION'], scoped.eventos.map(e => [eventCode[e.id], e.id, e.titulo||'', Number(e.precio||0), e.fechaIni||'', e.fechaFin||'', e.situacion||'En curso', e.descripcion||'']));
    makeSheet('PERSONAS', ['PERSONA_CODIGO','PERSONA_ID','PERSONA_NOMBRE','PERSONA_RANGO'], scoped.personas.map(p => [personCode[p.id], p.id, p.nombre||'', p.rango||'SOCIO']));
    makeSheet('TIENDAS', ['TIENDA_CODIGO','TIENDA_ID','TIENDA_NOMBRE'], scoped.tiendas.map(t => [storeCode[t.id], t.id, t.nombre||'']));
    const wsProductosBackupV190 = makeSheet('PRODUCTOS', ['PRODUCTO_CODIGO','PRODUCTO_ID','PRODUCTO_NOMBRE','PRODUCTO_SEGMENTO','PRODUCTO_DESTINO','PRODUCTO_PRECIO'], scoped.productos.map(p => [productCode[p.id], p.id, p.nombre||'', p.segmento||'', p.destino||'', Number((p.defaultPrecio ?? p.precio) || 0)]));
    try{ wsProductosBackupV190.getColumn(6).numFmt = '#,##0.00 [$€-C0A]'; }catch(_){ }
    makeSheet('INGRESOS', ['EVENTO_CODIGO','PERSONA_CODIGO','NUMERO','INGRESO','IMPORTE_VOLUNTARIO'], scoped.colaboradores.map(c => [eventCode[c.eventId]||'', personCode[c.personaId]||'', Number(c.numero||0), c.situacion||'Pendiente', Number(c.importe||0)]));
    makeSheet('COMPRAS', ['EVENTO_CODIGO','PRODUCTO_CODIGO','UNIDADES','PRECIO','TICKET_U_OTROS_GASTOS','TIENDA_CODIGO','RESPONSABLE_PERSONA_CODIGO'], scoped.compras.filter(c => !isDonation(c.ticketDonacion)).map(c => [eventCode[c.eventId]||'', productCode[c.productoId]||'', Number(c.unidades||0), Number(c.precio||0), c.ticketDonacion||'', storeCode[c.tiendaId]||'', personCode[c.responsableId]||'']));
    makeSheet('DONACIONES', ['EVENTO_CODIGO','PRODUCTO_CODIGO','UNIDADES','PRECIO','TIPO_DONACION','DONANTE_TIPO','DONANTE_CODIGO','RESPONSABLE_PERSONA_CODIGO'], scoped.compras.filter(c => isDonation(c.ticketDonacion)).map(c => { const [kind,id] = String(c.donorRef||'').split(':'); return [eventCode[c.eventId]||'', productCode[c.productoId]||'', Number(c.unidades||0), Number(c.precio||0), c.ticketDonacion||'', kind==='P'?'PERSONA':(kind==='T'?'TIENDA':''), kind==='P' ? (personCode[id]||'') : (kind==='T' ? (storeCode[id]||'') : ''), personCode[c.responsableId]||'']; }));
    const ticketRows = [], partRows = [];
    Object.entries(scoped.ticketImages || {}).forEach(([fullKey,img]) => {
      const evCode = eventCode[ticketEventId(fullKey)] || '';
      const key = ticketInnerKey(fullKey);
      const image = String(img || '');
      const parts = splitLongText(image, 30000);
      ticketRows.push([evCode, key, '', image.length <= 30000 ? image : '', image.length > 30000 ? 'DIVIDIDA_EN_TICKETS_PARTES' : '']);
      parts.forEach((part,idx) => partRows.push([evCode, key, idx + 1, parts.length, part]));
    });
    makeSheet('TICKETS', ['EVENTO_CODIGO','CLAVE_RESUMEN','ARCHIVO_IMAGEN','IMAGEN_BASE64','OBSERVACIONES'], ticketRows);
    makeSheet('TICKETS_PARTES', ['EVENTO_CODIGO','CLAVE_RESUMEN','PARTE','TOTAL_PARTES','IMAGEN_BASE64_PARTE'], partRows);
    for(const ws of wb.worksheets){
      try{
        ws.views = [{state:'frozen', ySplit:1}];
        ws.eachRow(row => row.eachCell(cell => { cell.protection = {locked:true}; }));
        await ws.protect('open_excel_arrastre', {
          selectLockedCells:true, selectUnlockedCells:true,
          formatCells:false, formatColumns:false, formatRows:false,
          insertColumns:false, insertRows:false, deleteColumns:false, deleteRows:false,
          sort:false, autoFilter:false, pivotTables:false, objects:false, scenarios:false
        });
      }catch(_){ }
    }
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = backupFileName(scope, selectedTitle);
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  if(typeof readSheetRows === 'function'){
    const previousReadSheetRowsV181 = readSheetRows;
    readSheetRows = function(workbook, wantedName){
      const rows = previousReadSheetRowsV181(workbook, wantedName);
      if((typeof normalizeHeader === 'function' ? normalizeHeader(wantedName) : normalize(wantedName)) !== 'TICKETS') return rows;
      const parts = previousReadSheetRowsV181(workbook, 'TICKETS_PARTES');
      if(!parts || !parts.length) return rows;
      const map = new Map();
      parts.forEach(p => {
        const ev = String(p.EVENTO_CODIGO || '').trim();
        const key = String(p.CLAVE_RESUMEN || '').trim();
        const seq = Number(p.PARTE || 0) || 0;
        const val = String(p.IMAGEN_BASE64_PARTE || '');
        const id = ev + '|' + key;
        if(!map.has(id)) map.set(id, {ev, key, chunks:[]});
        map.get(id).chunks[seq - 1] = val;
      });
      const rowMap = new Map(rows.map(r => [String(r.EVENTO_CODIGO || '').trim() + '|' + String(r.CLAVE_RESUMEN || '').trim(), r]));
      map.forEach((rec,id) => {
        const img = rec.chunks.join('');
        let row = rowMap.get(id);
        if(!row){ row = {EVENTO_CODIGO:rec.ev, CLAVE_RESUMEN:rec.key, ARCHIVO_IMAGEN:'', IMAGEN_BASE64:''}; rowMap.set(id,row); }
        if(img && (!String(row.IMAGEN_BASE64 || '').trim() || String(row.OBSERVACIONES || '').includes('DIVIDIDA'))) row.IMAGEN_BASE64 = img;
      });
      return Array.from(rowMap.values());
    };
  }

  refreshVersion();
  window.addEventListener('load', () => { refreshVersion(); try{ if(typeof render === 'function') render(); }catch(_){} });
})();

;/* ===== END legacy-inline-19-v181-backup-tooltip-excel-script.js ===== */


;/* ===== BEGIN legacy-inline-20-v190-integrity-tooltips-export-script.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #20. */
/* ==== V19.0: globos con scroll, nombres de Excel/backup, precio € en backup e integridad al eliminar ==== */
(function(){
  const VERSION = 'ControlEvent v28.10';
  const VERSION_FILE = 'ControlEvent_v28_10';
  const DELETE_BLOCK_MSG = 'No se pueden eliminar datos sin previamente eliminar sus dependencia';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const normalize = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc = v => (typeof escapeHtml === 'function') ? escapeHtml(v) : String(v ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch] || ch));
  const moneyF = v => (typeof money === 'function') ? money(Number(v || 0)) : new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0));
  const numberF = v => new Intl.NumberFormat('es-ES',{minimumFractionDigits:0, maximumFractionDigits:2}).format(Number(v || 0));
  const pad = n => String(n).padStart(2,'0');
  const ymd = (d=new Date()) => `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
  const timeUnderscore = (d=new Date()) => `${pad(d.getHours())}_${pad(d.getMinutes())}_${pad(d.getSeconds())}`;
  const cleanPart = v => normalize(v).replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').replace(/_+/g,'_') || 'EVENTO';

  function refreshVersionV190(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span, .appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+/i.test(el.textContent || '')) el.textContent = VERSION;
    });
  }

  function removeTipAttrs(el){
    if(!el) return;
    ['title','data-tip','data-v181-tip','data-ce-tip','data-tip-bg'].forEach(a => el.removeAttribute(a));
  }
  function stripRequestedTooltips(){
    ['tabIngresosBtn','tabDonacionesBtn','tabComprasBtn','tabResumenBtn','tabGraficasBtn','btnExportExcel','btnOpenImport','btnExportSeed'].forEach(id => removeTipAttrs($(id)));
    document.querySelectorAll('#tabCompras [title],#tabCompras [data-tip],#tabCompras [data-v181-tip],#tabDonaciones [title],#tabDonaciones [data-tip],#tabDonaciones [data-v181-tip],#tabGraficas [title],#tabGraficas [data-tip],#tabGraficas [data-v181-tip],#collabList [title],#collabList [data-tip],#collabList [data-v181-tip],#budgetLayout [title],#budgetLayout [data-tip],#budgetLayout [data-v181-tip],#summarySegmento [title],#summarySegmento [data-tip],#summarySegmento [data-v181-tip],#summaryDestino [title],#summaryDestino [data-tip],#summaryDestino [data-v181-tip]').forEach(removeTipAttrs);
    const maint = $('btnToggleMaintenance');
    if(maint && !maint.getAttribute('data-ce-tip')) maint.setAttribute('title', 'Mantenimiento de tablas generales');
  }

  function ensureTip(){
    let tip = $('ceTooltipV190');
    if(!tip){ tip = document.createElement('div'); tip.id = 'ceTooltipV190'; tip.className = 'ce-tooltip-v190'; document.body.appendChild(tip); }
    return tip;
  }
  function textColorFor(bg){
    const m = String(bg||'').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if(!m) return '#fff';
    const r=Number(m[1]), g=Number(m[2]), b=Number(m[3]);
    const lum = (0.299*r + 0.587*g + 0.114*b);
    return lum > 175 ? '#111827' : '#fff';
  }
  function getTipText(el){
    if(!el) return '';
    return el.getAttribute('data-ce-tip') || el.getAttribute('data-v181-tip') || el.getAttribute('data-tip') || el.getAttribute('title') || '';
  }
  function bgForElement(el){
    const explicit = el?.getAttribute?.('data-tip-bg');
    if(explicit) return explicit;
    const candidates = [el, el?.closest?.('.metric'), el?.closest?.('.summary-item'), el?.closest?.('.vbar-stick'), el?.closest?.('.chart-seg'), el?.closest?.('.budget-panel'), el?.closest?.('.summary-card')].filter(Boolean);
    for(const c of candidates){
      const bg = getComputedStyle(c).backgroundColor;
      if(bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
    }
    return '#111827';
  }
  let activeEl = null;
  let hideTimer = null;
  function placeTip(tip, x, y){
    const margin = 12;
    const text = tip.textContent || '';
    const full = text.length > 1700 || text.split('\n').length > 30;
    tip.classList.toggle('long', text.length > 600 || text.split('\n').length > 14);
    tip.classList.toggle('full', full);
    tip.style.display = 'block';
    tip.style.left = '0px'; tip.style.top = '0px';
    if(full) return;
    const rect = tip.getBoundingClientRect();
    let left = x + 16, top = y + 16;
    if(left + rect.width > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - rect.width - margin);
    if(top + rect.height > window.innerHeight - margin) top = Math.max(margin, window.innerHeight - rect.height - margin);
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }
  function showTip(el, x, y){
    const txt = getTipText(el);
    if(!txt) return;
    clearTimeout(hideTimer);
    activeEl = el;
    const tip = ensureTip();
    tip.textContent = txt;
    const bg = bgForElement(el);
    tip.style.background = bg;
    tip.style.color = textColorFor(bg);
    tip.style.borderColor = textColorFor(bg) === '#111827' ? 'rgba(15,23,42,.18)' : 'rgba(255,255,255,.22)';
    placeTip(tip, x || 24, y || 24);
  }
  function hideTipSoon(){
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      const tip = $('ceTooltipV190');
      if(tip && tip.matches(':hover')) return;
      activeEl = null;
      if(tip) tip.style.display = 'none';
    }, 140);
  }
  document.addEventListener('mouseover', e => {
    const el = e.target.closest?.('[data-ce-tip],[data-v181-tip],[data-tip],[title]');
    if(!el || el.id === 'ceTooltipV181' || el.id === 'ceTooltipV190') return;
    const txt = getTipText(el);
    if(!txt) return;
    if(el.hasAttribute('title')){ el.setAttribute('data-ce-tip', txt); el.removeAttribute('title'); }
    showTip(el, e.clientX, e.clientY);
  }, true);
  document.addEventListener('mousemove', e => {
    const tip = $('ceTooltipV190');
    if(!activeEl || !tip || tip.matches(':hover')) return;
    if(tip.style.display !== 'none') placeTip(tip, e.clientX || 24, e.clientY || 24);
  }, true);
  document.addEventListener('mouseout', e => {
    const tip = $('ceTooltipV190');
    if(tip && (e.relatedTarget === tip || tip.contains(e.relatedTarget))) return;
    hideTipSoon();
  }, true);
  document.addEventListener('focusin', e => {
    const el = e.target.closest?.('[data-ce-tip],[data-v181-tip],[data-tip],[title]');
    if(el && getTipText(el)) showTip(el, 24, 24);
  }, true);
  document.addEventListener('focusout', hideTipSoon, true);
  document.addEventListener('keydown', e => { if(e.key === 'Escape'){ const tip = $('ceTooltipV190'); if(tip) tip.style.display = 'none'; activeEl=null; }}, true);

  function collabRows(){ return (typeof collabsForEvent === 'function') ? (collabsForEvent() || []) : []; }
  function incomeLine(r){
    const persona = r.persona || (state?.personas || []).find(p => String(p.id) === String(r.personaId)) || {};
    const total = Number(r.total ?? ((Number(r.numero||0) * Number((typeof selectedEvent === 'function' ? selectedEvent()?.precio : 0) || 0)) + Number(r.importe||0)));
    return `• ${persona.nombre || 'Sin nombre'} — ${moneyF(total)}`;
  }
  function applyIncomeTooltips(){
    const grid = $('ingresosSummaryGrid');
    if(!grid) return;
    const rows = collabRows();
    Array.from(grid.children).forEach(card => {
      const labelRaw = card.querySelector('.label')?.textContent || '';
      const label = normalize(labelRaw);
      let filter = null;
      let titulo = labelRaw.trim();
      if(label === 'EFECTIVO') filter = r => normalize(r.situacion) === 'EFECTIVO';
      else if(label === 'BANCO') filter = r => normalize(r.situacion) === 'BANCO';
      else if(label === 'BIZUM') filter = r => normalize(r.situacion) === 'BIZUM';
      else if(label === 'PENDIENTE' || label === 'BIZUM PENDIENTE') filter = r => normalize(r.situacion) === 'PENDIENTE';
      else if(label === 'TOTAL INGRESOS') filter = () => true;
      if(!filter) return;
      const selected = rows.filter(filter);
      const total = selected.reduce((a,b)=> a + Number(b.total ?? 0), 0);
      const lines = selected.map(incomeLine).sort((a,b)=>a.localeCompare(b,'es'));
      card.setAttribute('data-ce-tip', `${titulo}\nTOTAL: ${moneyF(total)}\nREGISTROS: ${selected.length}\n\n${lines.length ? lines.join('\n') : 'Sin registros'}`);
      card.setAttribute('data-tip-bg', getComputedStyle(card).backgroundColor || '#ecfdf5');
      card.removeAttribute('title'); card.removeAttribute('data-v181-tip'); card.removeAttribute('data-tip');
      const value = card.querySelector('.value');
      if(value){
        const parts = String(value.textContent || '').split('·');
        if(parts.length >= 2){
          const persons = parts[0].trim();
          value.textContent = `${persons} · ${moneyF(total)}`;
        }
      }
    });
  }
  const previousRenderIngresosSummaryV190 = typeof renderIngresosSummary === 'function' ? renderIngresosSummary : null;
  if(previousRenderIngresosSummaryV190){
    renderIngresosSummary = function(){ previousRenderIngresosSummaryV190(); applyIncomeTooltips(); stripRequestedTooltips(); };
    window.renderIngresosSummary = renderIngresosSummary;
  }

  function personById(id){ return (state?.personas || []).find(p => String(p.id) === String(id)) || {}; }
  function storeById(id){ return (state?.tiendas || []).find(t => String(t.id) === String(id)) || {}; }
  function productById(id){ return (state?.productos || []).find(p => String(p.id) === String(id)) || {}; }
  function isDonation(v){ return (typeof isDonationTicket === 'function') ? isDonationTicket(v) : /^DONADO/i.test(norm(v)); }
  function donorName(c){
    const dr = String(c?.donorRef || '');
    if(dr.startsWith('P:')) return personById(dr.slice(2)).nombre || 'Sin donante';
    if(dr.startsWith('T:')) return storeById(dr.slice(2)).nombre || 'Sin tienda';
    return c?.donanteNombre || c?.donorName || 'Sin donante';
  }
  function productName(c){ return c?.producto?.nombre || productById(c?.productoId).nombre || 'Producto'; }
  function donationDetailMap(){
    const map = new Map();
    const rows = (typeof comprasForEvent === 'function' ? comprasForEvent() : (state?.compras || [])).filter(c => isDonation(c.ticketDonacion));
    rows.forEach(c => {
      const ticket = norm(c.ticketDonacion) || 'DONADO';
      const donor = donorName(c);
      const key = `${donor} | ${ticket}`;
      const qty = Number(c.unidades || 0);
      const price = Number(c.precio ?? productById(c.productoId).defaultPrecio ?? productById(c.productoId).precio ?? 0);
      const val = qty * price;
      if(!map.has(key)) map.set(key, {donor, ticket, total:0, lines:[]});
      const rec = map.get(key);
      rec.total += val;
      rec.lines.push(`• ${productName(c)} — Cantidad: ${numberF(qty)} — Precio estimado: ${moneyF(price)} — Valor estimado: ${moneyF(val)}`);
    });
    map.forEach(rec => rec.lines.sort((a,b)=>a.localeCompare(b,'es')));
    return map;
  }
  function applyTiendaTicketDonationTips(){
    const wrap = $('summaryTiendaTicket');
    if(!wrap) return;
    const details = donationDetailMap();
    if(!details.size) return;
    wrap.querySelectorAll('.summary-item').forEach(item => {
      const label = item.querySelector('span')?.textContent || '';
      for(const [key, rec] of details.entries()){
        if(label.startsWith(key)){
          item.setAttribute('data-ce-tip', `DONACIÓN\nDONANTE: ${rec.donor}\nTIPO: ${rec.ticket}\nTOTAL ESTIMADO: ${moneyF(rec.total)}\n\n${rec.lines.join('\n')}`);
          item.setAttribute('data-tip-bg', '#fff7ed');
          item.removeAttribute('title'); item.removeAttribute('data-v181-tip'); item.removeAttribute('data-tip');
          break;
        }
      }
    });
  }
  const previousRenderSummaryListV190 = typeof renderSummaryList === 'function' ? renderSummaryList : null;
  if(previousRenderSummaryListV190){
    renderSummaryList = function(targetId, rows){
      const ret = previousRenderSummaryListV190(targetId, rows);
      stripRequestedTooltips();
      if(targetId === 'summaryTiendaTicket') applyTiendaTicketDonationTips();
      return ret;
    };
    window.renderSummaryList = renderSummaryList;
  }

  function hasDependency(action, id){
    const sid = String(id || '');
    const st = window.state || {};
    if(!sid) return false;
    if(action === 'delete-persona'){
      return (st.colaboradores || []).some(c => String(c.personaId) === sid)
        || (st.compras || []).some(c => String(c.responsableId) === sid || String(c.donorRef || '') === `P:${sid}`);
    }
    if(action === 'delete-producto'){
      return (st.compras || []).some(c => String(c.productoId) === sid);
    }
    if(action === 'delete-tienda'){
      return (st.compras || []).some(c => String(c.tiendaId) === sid || String(c.donorRef || '') === `T:${sid}`);
    }
    if(action === 'delete-evento'){
      return (st.colaboradores || []).some(c => String(c.eventId) === sid)
        || (st.compras || []).some(c => String(c.eventId) === sid)
        || Object.keys(st.ticketImages || {}).some(k => String(k).startsWith(`${sid}|`));
    }
    return false;
  }
  document.addEventListener('click', function(e){
    const btn = e.target.closest?.('button[data-action]');
    if(!btn) return;
    const action = btn.dataset.action || '';
    if(!/^delete-(persona|producto|tienda|evento)$/.test(action)) return;
    if(hasDependency(action, btn.dataset.id)){
      e.preventDefault();
      e.stopImmediatePropagation();
      alert(DELETE_BLOCK_MSG);
    }
  }, true);

  function normalizeDownloadName(name){
    let n = String(name || '');
    const now = new Date();
    n = n.replace(/^ControlEvent_v\d+_\d+-([^_]+(?:_[^_]+)*)_(\d{2})(\d{2})(\d{4})\.xlsx$/i, (_m,title,dd,mm,yyyy) => `${VERSION_FILE}_INFOEVENTO-${title}_${yyyy}${mm}${dd}.xlsx`);
    n = n.replace(/^ControlEvent_v\d+_\d+_BACKUP_(.+?)_(\d{2})(\d{2})(\d{4})-(\d{2})[:_](\d{2})[:_](\d{2})\.xlsx$/i, (_m,scope,dd,mm,yyyy,hh,mi,ss) => `${VERSION_FILE}_BACKUP_${scope}_${yyyy}${mm}${dd}-${hh}_${mi}_${ss}.xlsx`);
    n = n.replace(/^ControlEvent_v\d+_\d+_BACKUP_(.+?)_(\d{4})(\d{2})(\d{2})-(\d{2})[:_](\d{2})[:_](\d{2})\.xlsx$/i, (_m,scope,yyyy,mm,dd,hh,mi,ss) => `${VERSION_FILE}_BACKUP_${scope}_${yyyy}${mm}${dd}-${hh}_${mi}_${ss}.xlsx`);
    if(/^ControlEvent_v\d+_\d+_descarga_datos\.xlsx$/i.test(n)) n = `${VERSION_FILE}_BACKUP_TODOS_${ymd(now)}-${timeUnderscore(now)}.xlsx`;
    return n;
  }
  const originalAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function(){
    try{ if(this.download) this.download = normalizeDownloadName(this.download); }catch(_){ }
    return originalAnchorClick.apply(this, arguments);
  };

  function wireExcelButton(){
    const btn = $('btnExportExcel');
    if(!btn || btn.dataset.v190ExcelWired === '1') return;
    btn.dataset.v190ExcelWired = '1';
    btn.onclick = function(ev){
      ev.preventDefault(); ev.stopPropagation();
      try{
        if(typeof exportExcel === 'function') exportExcel();
        else if(typeof window.exportExcel === 'function') window.exportExcel();
        else alert('No se encontró la función de exportación a Excel.');
      }catch(err){
        console.error(err);
        alert('No se pudo generar el Excel. Revisa la consola para ver el detalle del error.');
      }
      return false;
    };
  }

  function afterRenderV190(){
    refreshVersionV190();
    stripRequestedTooltips();
    applyIncomeTooltips();
    applyTiendaTicketDonationTips();
    wireExcelButton();
  }
  const previousRenderV190 = typeof render === 'function' ? render : null;
  if(previousRenderV190){
    render = function(){ const ret = previousRenderV190.apply(this, arguments); setTimeout(afterRenderV190, 0); return ret; };
    window.render = render;
  }
  document.addEventListener('DOMContentLoaded', afterRenderV190);
  window.addEventListener('load', () => { afterRenderV190(); setTimeout(afterRenderV190, 250); });
  afterRenderV190();
})();

;/* ===== END legacy-inline-20-v190-integrity-tooltips-export-script.js ===== */


;/* ===== BEGIN legacy-inline-21-v1911-integrity-tooltips-script.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #21. */
/* ==== V19.1.1: parte de v19.0; bloqueo real de dependencias y globos restaurados ==== */
(function(){
  const VERSION = 'ControlEvent v28.10';
  const VERSION_FILE = 'ControlEvent_v28_10';
  const DELETE_BLOCK_MSG = 'No se pueden eliminar datos sin previamente eliminar sus dependencia';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const normUp = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc = v => (typeof escapeHtml === 'function') ? escapeHtml(v) : String(v ?? '').replace(/[&<>\"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch] || ch));
  const moneyF = v => {
    try{ return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0)); }
    catch(_){ return `${Number(v || 0).toFixed(2)} €`; }
  };
  const numF = v => {
    try{ return new Intl.NumberFormat('es-ES',{minimumFractionDigits:0, maximumFractionDigits:2}).format(Number(v || 0)); }
    catch(_){ return String(v ?? ''); }
  };
  function getState(){
    try{ if(typeof state !== 'undefined' && state) return state; }catch(_){ }
    return window.state || {};
  }
  function getSelectedEventId(){
    const st = getState();
    try{ const ev = (typeof selectedEvent === 'function') ? selectedEvent() : null; if(ev && ev.id) return String(ev.id); }catch(_){ }
    return String(st.selectedEventId || '');
  }
  function rowsForEvent(){
    try{ if(typeof comprasForEvent === 'function') return comprasForEvent() || []; }catch(_){ }
    const st = getState(); const evId = getSelectedEventId();
    return (st.compras || []).filter(c => String(c.eventId || '') === evId);
  }
  function collabsForCurrentEvent(){
    try{ if(typeof collabsForEvent === 'function') return collabsForEvent() || []; }catch(_){ }
    const st = getState(); const evId = getSelectedEventId();
    return (st.colaboradores || []).filter(c => String(c.eventId || '') === evId);
  }
  function findById(listName, id){
    const st = getState();
    return (st[listName] || []).find(x => String(x.id) === String(id)) || {};
  }
  function personaName(id){
    try{ const p = (typeof personaById === 'function') ? personaById(id) : null; if(p && p.nombre) return p.nombre; }catch(_){ }
    return findById('personas', id).nombre || '';
  }
  function tiendaName(id){
    try{ const t = (typeof tiendaById === 'function') ? tiendaById(id) : null; if(t && t.nombre) return t.nombre; }catch(_){ }
    return findById('tiendas', id).nombre || '';
  }
  function productoObj(id){
    try{ const p = (typeof productoById === 'function') ? productoById(id) : null; if(p) return p; }catch(_){ }
    return findById('productos', id);
  }
  function productoName(c){
    try{ if(typeof productNameV171 === 'function') return productNameV171(c); }catch(_){ }
    try{ if(typeof productNameV164 === 'function') return productNameV164(c); }catch(_){ }
    return c?.producto?.nombre || productoObj(c?.productoId).nombre || 'Producto';
  }
  function productoPrice(c){
    const p = productoObj(c?.productoId);
    return Number(c?.precio != null ? c.precio : (c?.precioCalc != null ? c.precioCalc : (p.defaultPrecio ?? p.precio ?? 0)));
  }
  function productoValue(c){
    try{ if(typeof valueCompraV171 === 'function') return Number(valueCompraV171(c) || 0); }catch(_){ }
    try{ if(typeof valueCompraV164 === 'function') return Number(valueCompraV164(c) || 0); }catch(_){ }
    return Number(c?.valor != null ? c.valor : productoPrice(c) * Number(c?.unidades || 0));
  }
  function storeName(c){
    try{ if(typeof storeNameV171 === 'function'){ const v = storeNameV171(c); if(norm(v)) return v; } }catch(_){ }
    try{ if(typeof storeNameV164 === 'function'){ const v = storeNameV164(c); if(norm(v)) return v; } }catch(_){ }
    return c?.tienda?.nombre || tiendaName(c?.tiendaId) || 'Sin tienda';
  }
  function donorName(c){
    try{ if(typeof resolveDonorNameV171 === 'function'){ const v = resolveDonorNameV171(c); if(norm(v) && normUp(v) !== 'SIN TIENDA') return v; } }catch(_){ }
    try{ if(typeof resolveDonorNameV164 === 'function'){ const v = resolveDonorNameV164(c); if(norm(v) && normUp(v) !== 'SIN TIENDA') return v; } }catch(_){ }
    const raw = norm(c?.donorRef || c?.donante || c?.donanteNombre || '');
    if(raw.startsWith('P:')) return personaName(raw.slice(2)) || 'Sin donante';
    if(raw.startsWith('T:')) return tiendaName(raw.slice(2)) || 'Sin donante';
    return raw || 'Sin donante';
  }
  function isDon(v){
    try{ if(typeof isDonationTicket === 'function') return isDonationTicket(v); }catch(_){ }
    return normUp(v).startsWith('DONADO');
  }
  function ticket(c){ return norm(c?.ticketDonacion) || ''; }
  function compareText(a,b){ return normUp(a).localeCompare(normUp(b),'es'); }
  function setTip(el, text, bg, forceBlack=true){
    if(!el || !norm(text)) return;
    el.setAttribute('data-ce-tip', text);
    el.setAttribute('data-tip-bg', bg || '#ffffff');
    if(forceBlack) el.setAttribute('data-ce-tip-black', '1');
    el.removeAttribute('title');
    el.removeAttribute('data-tip');
    el.removeAttribute('data-v181-tip');
  }
  function forceBlackTooltipFromTarget(target){
    const el = target?.closest?.('[data-ce-tip-black="1"]');
    if(!el) return;
    setTimeout(() => {
      const tip = $('ceTooltipV190');
      if(tip && tip.style.display !== 'none'){
        tip.style.color = '#111827';
        tip.style.borderColor = 'rgba(15,23,42,.18)';
      }
    }, 0);
  }
  document.addEventListener('mouseover', e => forceBlackTooltipFromTarget(e.target), true);
  document.addEventListener('focusin', e => forceBlackTooltipFromTarget(e.target), true);

  function hasDependency(action, id){
    const st = getState();
    const sid = String(id || '');
    if(!sid) return false;
    const cols = st.colaboradores || [];
    const buys = st.compras || [];
    const persons = st.personas || [];
    const stores = st.tiendas || [];
    const products = st.productos || [];
    if(action === 'delete-persona'){
      return cols.some(c => String(c.personaId || '') === sid)
        || buys.some(c => String(c.responsableId || '') === sid || String(c.personaId || '') === sid || String(c.donorRef || '') === `P:${sid}` || String(c.donanteId || '') === sid);
    }
    if(action === 'delete-producto'){
      return buys.some(c => String(c.productoId || '') === sid);
    }
    if(action === 'delete-tienda'){
      return products.some(p => String(p.tiendaId || '') === sid || String(p.defaultTiendaId || '') === sid)
        || buys.some(c => String(c.tiendaId || '') === sid || String(c.storeId || '') === sid || String(c.donorRef || '') === `T:${sid}`);
    }
    if(action === 'delete-evento'){
      return cols.some(c => String(c.eventId || '') === sid)
        || buys.some(c => String(c.eventId || '') === sid)
        || persons.some(p => String(p.eventId || '') === sid)
        || stores.some(t => String(t.eventId || '') === sid)
        || products.some(p => String(p.eventId || '') === sid)
        || Object.keys(st.ticketImages || {}).some(k => String(k).startsWith(`${sid}|`));
    }
    return false;
  }
  function blockDeleteIfNeeded(e){
    const btn = e.target.closest?.('button[data-action]');
    if(!btn) return;
    const action = btn.dataset.action || '';
    if(!/^delete-(persona|producto|tienda|evento)$/.test(action)) return;
    if(hasDependency(action, btn.dataset.id)){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      alert(DELETE_BLOCK_MSG);
      return false;
    }
  }
  document.addEventListener('click', blockDeleteIfNeeded, true);
  function markDependentDeleteButtons(){
    document.querySelectorAll('button[data-action^="delete-"]').forEach(btn => {
      const action = btn.dataset.action || '';
      const blocked = /^delete-(persona|producto|tienda|evento)$/.test(action) && hasDependency(action, btn.dataset.id);
      btn.classList.toggle('ce-delete-blocked-v1911', blocked);
      if(blocked){
        btn.setAttribute('data-ce-tip', DELETE_BLOCK_MSG);
        btn.setAttribute('data-tip-bg', '#ffffff');
        btn.setAttribute('data-ce-tip-black', '1');
      }else if(btn.getAttribute('data-ce-tip') === DELETE_BLOCK_MSG){
        btn.removeAttribute('data-ce-tip');
        btn.removeAttribute('data-tip-bg');
        btn.removeAttribute('data-ce-tip-black');
      }
    });
  }

  function incomeDetail(r){
    const n = Number(r?.numero || 0);
    const ev = (() => { try{ return typeof selectedEvent === 'function' ? selectedEvent() : null; }catch(_){ return null; } })() || {};
    const base = Number(r?.base != null ? r.base : (n * Number(ev.precio || 0)));
    const vol = Number(r?.donation != null ? r.donation : (r?.importe || 0));
    const total = Number(r?.total != null ? r.total : base + vol);
    const name = r?.persona?.nombre || personaName(r?.personaId) || 'Sin nombre';
    return `${name} — Nº ${numF(n)} — Importe socio: ${moneyF(base)} — Voluntario: ${moneyF(vol)} — Total: ${moneyF(total)} — ${r?.situacion || ''}`;
  }
  function applyBudgetTooltips(){
    const wrap = $('budgetLayout');
    if(!wrap || typeof budgetSummary !== 'function') return;
    let b; try{ b = budgetSummary(); }catch(_){ return; }
    const socios = b.ingresosDinero?.socios || {};
    const noSocios = b.ingresosDinero?.noSocios || b.ingresosDinero?.donantes || {};
    const d = b.donacionProducto || {};
    const ingresoText = [
      'INGRESOS',
      `TOTAL INGRESADO: ${moneyF(b.ingresosDinero?.totalIngresado || 0)}`,
      `TOTAL COMPROMETIDO: ${moneyF(b.ingresosDinero?.totalComprometido || 0)}`,
      `PENDIENTE: ${moneyF(b.ingresosDinero?.pendiente || 0)}`,
      '',
      `SOCIOS: ${moneyF(socios.ingresado || socios.importe || 0)}`,
      ...((socios.listImporte || []).map(x => `• ${x}`)),
      '',
      `NO SOCIOS: ${moneyF(noSocios.ingresado || noSocios.importe || 0)}`,
      ...((noSocios.listImporte || []).map(x => `• ${x}`))
    ].join('\n');
    const donText = [
      'DONACIÓN DE PRODUCTO',
      `VALOR PRODUCTO DONADO: ${moneyF(d.valorDonado || 0)}`,
      '',
      `TIENDAS: ${moneyF(d.donadoTienda || 0)}`,
      ...((d.listTiendas || []).map(x => `• ${x}`)),
      '',
      `SOCIOS: ${moneyF(d.donadoSocio || 0)}`,
      ...((d.listSocios || []).map(x => `• ${x}`)),
      '',
      `NO SOCIOS: ${moneyF(d.donadoOtros || 0)}`,
      ...((d.listNoSocios || []).map(x => `• ${x}`))
    ].join('\n');
    const panels = wrap.querySelectorAll('.budget-panel');
    const pIng = Array.from(panels).find(p => normUp(p.querySelector('h3')?.textContent || '').includes('INGRES'));
    const pDon = Array.from(panels).find(p => normUp(p.querySelector('h3')?.textContent || '').includes('DONACION') || normUp(p.querySelector('h3')?.textContent || '').includes('DONACIÓN'));
    setTip(pIng, ingresoText, '#ffffff', true);
    pIng?.querySelectorAll('.budget-row,.budget-subrow').forEach(el => setTip(el, ingresoText, '#ffffff', true));
    setTip(pDon, donText, '#ffffff', true);
    pDon?.querySelectorAll('.budget-row,.budget-subrow').forEach(el => setTip(el, donText, '#ffffff', true));
  }

  function detailTextForGraphItem(groupLabel, it){
    const amount = it?.displayValue ?? it?.value ?? 0;
    const lines = Array.isArray(it?.lines) ? it.lines : [];
    return `${groupLabel}\n${it?.label || ''}: ${moneyF(amount)}${lines.length ? '\n\n' + lines.map(x => `• ${x}`).join('\n') : ''}`;
  }
  function applyGraphTooltips(){
    const wrap = $('eventChartWrap');
    if(!wrap) return;
    let g = null;
    try{ if(typeof graphPartsV171 === 'function') g = graphPartsV171(); }catch(_){ }
    if(!g){ try{ if(typeof graphPartsV164 === 'function') g = graphPartsV164(); }catch(_){ } }
    if(!g) return;
    const groups = [
      ['INGRESOS', g.incomeItems || []],
      ['DONACIÓN DE PRODUCTO', g.donationItems || []],
      ['GASTOS', g.expenseItems || []],
      ['SALDO OPERATIVO', g.saldoItems || []]
    ];
    const rows = wrap.querySelectorAll('.chart-row');
    rows.forEach((row, idx) => {
      const group = groups[idx];
      if(!group) return;
      row.querySelectorAll('.chart-seg').forEach((seg, j) => {
        const it = group[1][j];
        if(!it) return;
        const bg = it.color || getComputedStyle(seg).backgroundColor || '#ffffff';
        setTip(seg, detailTextForGraphItem(group[0], it), bg, true);
      });
    });
  }

  function applyGroupingTooltips(){
    const configs = [
      ['summarySegmento', 'Por segmento', (() => { try{ return typeof summaryBySegmento === 'function' ? summaryBySegmento() : []; }catch(_){ return []; } })()],
      ['summaryDestino', 'Por destino', (() => { try{ return typeof summaryByDestino === 'function' ? summaryByDestino() : []; }catch(_){ return []; } })()]
    ];
    const specs = [
      ['Comprado', 'comprado', 'listComprado', '#dc2626'],
      ['Donado', 'donado', 'listDonado', '#f59e0b'],
      ['Pte. Compra u otros gastos', 'pendiente', 'listPendiente', '#fb7185']
    ];
    configs.forEach(([id, title, rows]) => {
      const wrap = $(id); if(!wrap) return;
      const cards = wrap.querySelectorAll('.vbars-card');
      cards.forEach((card, i) => {
        const r = rows[i] || {};
        const cols = card.querySelectorAll('.vbar-col');
        specs.forEach(([label, valKey, listKey, color], j) => {
          const list = Array.isArray(r[listKey]) ? r[listKey] : [];
          const text = `${title}\n${r.label || ''}\n${label}: ${moneyF(r[valKey] || 0)}\n\n${list.length ? list.map(x => `• ${x}`).join('\n') : 'Sin productos'}`;
          const col = cols[j];
          if(col){ setTip(col, text, color, true); }
          const stick = col?.querySelector?.('.vbar-stick');
          if(stick){ setTip(stick, text, color, true); }
        });
      });
    });
  }

  function buildTicketMaps(){
    const donationMap = new Map();
    const purchaseMap = new Map();
    rowsForEvent().forEach(c => {
      const t = ticket(c);
      if(!t) return;
      const qty = Number(c.unidades || 0);
      const price = productoPrice(c);
      const val = productoValue(c);
      const line = `• ${productoName(c)} — Cantidad: ${numF(qty)} — Precio: ${moneyF(price)} — Importe: ${moneyF(val)}`;
      if(isDon(t)){
        const donor = donorName(c);
        const key = `${donor} | ${t}`;
        if(!donationMap.has(key)) donationMap.set(key, {key, donor, ticket:t, total:0, lines:[]});
        const rec = donationMap.get(key); rec.total += val; rec.lines.push(line);
      }else{
        const store = storeName(c);
        const key = `${store} | ${t}`;
        if(!purchaseMap.has(key)) purchaseMap.set(key, {key, store, ticket:t, total:0, lines:[]});
        const rec = purchaseMap.get(key); rec.total += val; rec.lines.push(line);
      }
    });
    donationMap.forEach(r => r.lines.sort((a,b)=>compareText(a,b)));
    purchaseMap.forEach(r => r.lines.sort((a,b)=>compareText(a,b)));
    return {donationMap, purchaseMap};
  }
  function applyTiendaTicketTooltips(){
    const wrap = $('summaryTiendaTicket');
    if(!wrap) return;
    const {donationMap, purchaseMap} = buildTicketMaps();
    wrap.querySelectorAll('.summary-item').forEach(item => {
      const labelEl = item.querySelector('span');
      const label = norm(labelEl?.textContent || '');
      if(!label || normUp(label) === 'TOTAL') return;
      for(const [key, rec] of donationMap.entries()){
        if(label === key || label.startsWith(key + ' ·') || label.startsWith(key + ' -')){
          if(labelEl) labelEl.textContent = key;
          setTip(item, `DONACIÓN\n${key}\nTOTAL ESTIMADO: ${moneyF(rec.total)}\n\n${rec.lines.join('\n')}`, '#ffffff', true);
          setTip(labelEl, `DONACIÓN\n${key}\nTOTAL ESTIMADO: ${moneyF(rec.total)}\n\n${rec.lines.join('\n')}`, '#ffffff', true);
          return;
        }
      }
      for(const [key, rec] of purchaseMap.entries()){
        if(label === key || label.startsWith(key + ' ·') || label.startsWith(key + ' -')){
          setTip(item, `TIENDA | TICKET\n${key}\nTOTAL: ${moneyF(rec.total)}\n\n${rec.lines.join('\n')}`, '#ffffff', true);
          setTip(labelEl, `TIENDA | TICKET\n${key}\nTOTAL: ${moneyF(rec.total)}\n\n${rec.lines.join('\n')}`, '#ffffff', true);
          return;
        }
      }
    });
  }

  function refreshVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span, .appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION;
    });
  }
  function afterRender(){
    refreshVersion();
    markDependentDeleteButtons();
    applyBudgetTooltips();
    applyGraphTooltips();
    applyGroupingTooltips();
    applyTiendaTicketTooltips();
  }
  const prevRender = typeof render === 'function' ? render : null;
  if(prevRender){
    render = function(){
      const ret = prevRender.apply(this, arguments);
      setTimeout(afterRender, 0);
      setTimeout(afterRender, 60);
      return ret;
    };
    window.render = render;
  }
  const prevRenderBudget = typeof renderBudget === 'function' ? renderBudget : null;
  if(prevRenderBudget){
    renderBudget = function(){
      const ret = prevRenderBudget.apply(this, arguments);
      setTimeout(afterRender, 0);
      setTimeout(afterRender, 60);
      return ret;
    };
    window.renderBudget = renderBudget;
  }
  const prevRenderGraficas = typeof renderGraficas === 'function' ? renderGraficas : null;
  if(prevRenderGraficas){
    renderGraficas = function(){
      const ret = prevRenderGraficas.apply(this, arguments);
      setTimeout(applyGraphTooltips, 0);
      setTimeout(applyGraphTooltips, 60);
      return ret;
    };
    window.renderGraficas = renderGraficas;
  }
  function normalizeDownloadNameV1911(name){
    let n = String(name || '');
    n = n.replace(/^ControlEvent_v\d+_\d+(?:_\d+)?/i, VERSION_FILE);
    return n;
  }
  const oldAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function(){
    try{ if(this.download) this.download = normalizeDownloadNameV1911(this.download); }catch(_){ }
    return oldAnchorClick.apply(this, arguments);
  };
  document.addEventListener('DOMContentLoaded', () => { afterRender(); setTimeout(afterRender, 250); });
  window.addEventListener('load', () => { afterRender(); setTimeout(afterRender, 250); setTimeout(afterRender, 900); });
  afterRender();
  setTimeout(afterRender, 250);
})();

;/* ===== END legacy-inline-21-v1911-integrity-tooltips-script.js ===== */


;/* ===== BEGIN legacy-inline-22-v192-tooltip-size-bold-script.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #22. */
/* ==== V19.2: tamaño de globos y negritas en productos, donantes/personas e importes totales ==== */
(function(){
  const VERSION = 'ControlEvent v28.10';
  const VERSION_FILE = 'ControlEvent_v28_10';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const getRawTip = el => {
    if(!el) return '';
    return el.getAttribute('data-ce-tip') || el.getAttribute('data-v181-tip') || el.getAttribute('data-tip') || el.getAttribute('title') || '';
  };
  function boldAmounts(html){
    // Formatos típicos: 1.234,56 €, 123 €, € 1.234,56, con espacio normal o NBSP.
    html = html.replace(/(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)(?:\s|&nbsp;|\u00a0)*(€|EUR)/gi, '<strong>$1 $2</strong>');
    html = html.replace(/(€|EUR)(?:\s|&nbsp;|\u00a0)*(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)/gi, '<strong>$1 $2</strong>');
    return html;
  }
  function boldSemanticParts(lineHtml){
    let h = lineHtml;
    // Líneas de totales completas en negrita para que el importe total destaque.
    if(/^\s*(TOTAL|VALOR PRODUCTO DONADO|TOTAL INGRESADO|TOTAL COMPROMETIDO|PENDIENTE|SALDO|IMPORTE TOTAL|TOTAL ESTIMADO)/i.test(h.replace(/<[^>]+>/g,''))){
      h = '<strong>' + h + '</strong>';
      return boldAmounts(h);
    }
    // Producto al inicio de líneas de detalle: "• Producto — Cantidad...".
    h = h.replace(/^((?:\s*•\s*)?)([^—\-\|:]+)(\s+[—-]\s+(?:Cantidad|Precio|Importe|Unidades|Estado|Ticket)\b)/i, '$1<strong>$2</strong>$3');
    // Donantes/personas tras etiqueta explícita.
    h = h.replace(/\b(DONANTE|SOCIO|NO SOCIO|PERSONA|NOMBRE):\s*([^\n—\|]+)/gi, '$1: <strong>$2</strong>');
    // Formato de Por tienda y ticket: "Donante | DONADO..." o "Tienda | TICKET...".
    h = h.replace(/^([^\|\n]+)(\s*\|\s*(?:DONADO|TICKET)\b)/i, '<strong>$1</strong>$2');
    // Viñetas de personas/donantes en listados: "• Nombre — 123 €".
    h = h.replace(/^(\s*•\s*)([^—\n]+)(\s+—\s+)/, '$1<strong>$2</strong>$3');
    return boldAmounts(h);
  }
  function tipHtml(raw){
    return String(raw || '').split('\n').map(line => {
      if(!line.trim()) return '<div class="ce-tip-line ce-tip-blank"></div>';
      return '<div class="ce-tip-line">' + boldSemanticParts(esc(line)) + '</div>';
    }).join('');
  }
  function positionTip(tip, x, y){
    if(!tip) return;
    tip.classList.remove('full');
    tip.style.width = 'max-content';
    tip.style.minWidth = 'min(220px, calc(100vw - 32px))';
    tip.style.maxWidth = 'min(920px, calc(100vw - 32px))';
    tip.style.maxHeight = '75vh';
    tip.style.overflow = 'auto';
    tip.style.whiteSpace = 'normal';
    tip.style.display = 'block';
    const margin = 12;
    const rect = tip.getBoundingClientRect();
    let left = (Number.isFinite(x) ? x : 24) + 16;
    let top = (Number.isFinite(y) ? y : 24) + 16;
    if(left + rect.width > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - rect.width - margin);
    if(top + rect.height > window.innerHeight - margin) top = Math.max(margin, window.innerHeight - rect.height - margin);
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }
  let lastTarget = null;
  let lastRaw = '';
  function restyleFromTarget(target, x, y){
    const tip = $('ceTooltipV190');
    if(!tip || tip.style.display === 'none') return;
    const holder = target?.closest?.('[data-ce-tip],[data-v181-tip],[data-tip],[title]') || lastTarget;
    const raw = getRawTip(holder) || lastRaw || tip.textContent || '';
    if(!raw) return;
    lastTarget = holder || lastTarget;
    lastRaw = raw;
    const html = tipHtml(raw);
    if(tip.dataset.v192Html !== html){
      tip.innerHTML = html;
      tip.dataset.v192Html = html;
    }
    if(holder?.getAttribute?.('data-ce-tip-black') === '1'){
      tip.style.color = '#111827';
      tip.style.borderColor = 'rgba(15,23,42,.18)';
    }
    positionTip(tip, x, y);
  }
  document.addEventListener('mouseover', e => setTimeout(() => restyleFromTarget(e.target, e.clientX, e.clientY), 0), true);
  document.addEventListener('mousemove', e => setTimeout(() => restyleFromTarget(e.target, e.clientX, e.clientY), 0), true);
  document.addEventListener('focusin', e => setTimeout(() => restyleFromTarget(e.target, 24, 24), 0), true);
  document.addEventListener('mouseout', e => {
    const tip = $('ceTooltipV190');
    if(!tip || !tip.matches(':hover')){ lastTarget = null; lastRaw = ''; }
  }, true);

  function refreshVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span, .appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION;
    });
  }
  function normalizeDownloadName(name){
    let n = String(name || '');
    n = n.replace(/^ControlEvent_v\d+_\d+(?:_\d+)?/i, VERSION_FILE);
    return n;
  }
  const oldAnchorClick = HTMLAnchorElement.prototype.click;
  if(!HTMLAnchorElement.prototype.click.__v192Wrapped){
    const wrapped = function(){
      try{ if(this.download) this.download = normalizeDownloadName(this.download); }catch(_){ }
      return oldAnchorClick.apply(this, arguments);
    };
    wrapped.__v192Wrapped = true;
    HTMLAnchorElement.prototype.click = wrapped;
  }
  document.addEventListener('DOMContentLoaded', refreshVersion);
  window.addEventListener('load', refreshVersion);
  refreshVersion();
})();

;/* ===== END legacy-inline-22-v192-tooltip-size-bold-script.js ===== */


;/* ===== BEGIN legacy-inline-23-v193-tooltip-click-sort-script.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #23. */
/* ==== V19.3: globos por clic, orden alfabético y negrita controlada ==== */
(function(){
  const VERSION = 'ControlEvent v28.10';
  const VERSION_FILE = 'ControlEvent_v28_10';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const normUp = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const moneyF = v => {
    try{ return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0)); }
    catch(_){ return `${Number(v || 0).toFixed(2)} €`; }
  };
  const numF = v => {
    try{ return new Intl.NumberFormat('es-ES',{minimumFractionDigits:0, maximumFractionDigits:2}).format(Number(v || 0)); }
    catch(_){ return String(v ?? ''); }
  };

  function getState(){
    try{ if(typeof state !== 'undefined' && state) return state; }catch(_){ }
    return window.state || {};
  }
  function getSelectedEventId(){
    const st = getState();
    try{ const ev = (typeof selectedEvent === 'function') ? selectedEvent() : null; if(ev && ev.id) return String(ev.id); }catch(_){ }
    return String(st.selectedEventId || '');
  }
  function rowsForEvent(){
    try{ if(typeof comprasForEvent === 'function') return comprasForEvent() || []; }catch(_){ }
    const st = getState(); const evId = getSelectedEventId();
    return (st.compras || []).filter(c => String(c.eventId || '') === evId);
  }
  function findById(listName, id){
    const st = getState();
    return (st[listName] || []).find(x => String(x.id) === String(id)) || {};
  }
  function personaName(id){
    try{ const p = (typeof personaById === 'function') ? personaById(id) : null; if(p && p.nombre) return p.nombre; }catch(_){ }
    return findById('personas', id).nombre || '';
  }
  function tiendaName(id){
    try{ const t = (typeof tiendaById === 'function') ? tiendaById(id) : null; if(t && t.nombre) return t.nombre; }catch(_){ }
    return findById('tiendas', id).nombre || '';
  }
  function productoObj(id){
    try{ const p = (typeof productoById === 'function') ? productoById(id) : null; if(p) return p; }catch(_){ }
    return findById('productos', id);
  }
  function productoName(c){
    try{ if(typeof productNameV171 === 'function') return productNameV171(c); }catch(_){ }
    try{ if(typeof productNameV164 === 'function') return productNameV164(c); }catch(_){ }
    return c?.producto?.nombre || productoObj(c?.productoId).nombre || 'Producto';
  }
  function productoPrice(c){
    const p = productoObj(c?.productoId);
    return Number(c?.precio != null ? c.precio : (c?.precioCalc != null ? c.precioCalc : (p.defaultPrecio ?? p.precio ?? 0)));
  }
  function productoValue(c){
    try{ if(typeof valueCompraV171 === 'function') return Number(valueCompraV171(c) || 0); }catch(_){ }
    try{ if(typeof valueCompraV164 === 'function') return Number(valueCompraV164(c) || 0); }catch(_){ }
    return Number(c?.valor != null ? c.valor : productoPrice(c) * Number(c?.unidades || 0));
  }
  function storeName(c){
    try{ if(typeof storeNameV171 === 'function'){ const v = storeNameV171(c); if(norm(v)) return v; } }catch(_){ }
    try{ if(typeof storeNameV164 === 'function'){ const v = storeNameV164(c); if(norm(v)) return v; } }catch(_){ }
    return c?.tienda?.nombre || tiendaName(c?.tiendaId) || 'Sin tienda';
  }
  function donorName(c){
    try{ if(typeof resolveDonorNameV171 === 'function'){ const v = resolveDonorNameV171(c); if(norm(v) && normUp(v) !== 'SIN TIENDA') return v; } }catch(_){ }
    try{ if(typeof resolveDonorNameV164 === 'function'){ const v = resolveDonorNameV164(c); if(norm(v) && normUp(v) !== 'SIN TIENDA') return v; } }catch(_){ }
    const raw = norm(c?.donorRef || c?.donante || c?.donanteNombre || '');
    if(raw.startsWith('P:')) return personaName(raw.slice(2)) || 'Sin donante';
    if(raw.startsWith('T:')) return tiendaName(raw.slice(2)) || 'Sin donante';
    return raw || 'Sin donante';
  }
  function isDon(v){
    try{ if(typeof isDonationTicket === 'function') return isDonationTicket(v); }catch(_){ }
    return normUp(v).startsWith('DONADO');
  }
  function ticket(c){ return norm(c?.ticketDonacion); }
  function compareText(a,b){ return normUp(a).localeCompare(normUp(b),'es'); }
  function getRawTip(el){
    if(!el) return '';
    return el.getAttribute('data-ce-tip') || el.getAttribute('data-v181-tip') || el.getAttribute('data-tip') || el.getAttribute('title') || '';
  }

  function sortKey(line){
    let s = String(line || '').replace(/^\s*•\s*/, '').trim();
    s = s.replace(/^(DONANTE|SOCIO|NO SOCIO|PERSONA|PRODUCTO|TIENDA)\s*:\s*/i,'');
    s = s.split(/\s+[—-]\s+|\s*\|\s*|\s*:\s*/)[0] || s;
    return normUp(s);
  }
  function sortConsecutiveBullets(lines){
    const out = [];
    for(let i=0; i<lines.length;){
      if(/^\s*•\s*/.test(lines[i] || '')){
        const block = [];
        while(i < lines.length && /^\s*•\s*/.test(lines[i] || '')) block.push(lines[i++]);
        block.sort((a,b)=>sortKey(a).localeCompare(sortKey(b),'es'));
        out.push(...block);
      }else{
        out.push(lines[i++]);
      }
    }
    return out;
  }
  function sortTipText(raw){
    const lines = String(raw || '').replace(/\r\n/g,'\n').split('\n');
    return sortConsecutiveBullets(lines).join('\n');
  }
  function normalizeAllTipTexts(){
    document.querySelectorAll('[data-ce-tip],[data-v181-tip],[data-tip],[title]').forEach(el => {
      if(el.closest?.('button,input,select,textarea')) return;
      const raw = getRawTip(el);
      if(!norm(raw)) return;
      el.setAttribute('data-ce-tip', sortTipText(raw));
      el.removeAttribute('title');
      el.removeAttribute('data-v181-tip');
      el.removeAttribute('data-tip');
    });
  }

  function setTip(el, text, bg='#ffffff', forceBlack=true){
    if(!el || !norm(text)) return;
    el.setAttribute('data-ce-tip', sortTipText(text));
    el.setAttribute('data-tip-bg', bg || '#ffffff');
    if(forceBlack) el.setAttribute('data-ce-tip-black','1');
    el.removeAttribute('title');
    el.removeAttribute('data-tip');
    el.removeAttribute('data-v181-tip');
  }

  function buildTicketMaps(){
    const donationMap = new Map();
    const purchaseMap = new Map();
    rowsForEvent().forEach(c => {
      const t = ticket(c);
      if(!t) return;
      const qty = Number(c.unidades || 0);
      const price = productoPrice(c);
      const val = productoValue(c);
      const prod = productoName(c);
      const line = `• ${prod} — Cantidad: ${numF(qty)} — Precio estimado: ${moneyF(price)} — Valor estimado: ${moneyF(val)}`;
      if(isDon(t)){
        const donor = donorName(c);
        const key = `${donor} | ${t}`;
        if(!donationMap.has(key)) donationMap.set(key, {key, donor, ticket:t, total:0, lines:[]});
        const rec = donationMap.get(key); rec.total += val; rec.lines.push(line);
      }else{
        const store = storeName(c);
        const key = `${store} | ${t}`;
        if(!purchaseMap.has(key)) purchaseMap.set(key, {key, store, ticket:t, total:0, lines:[]});
        const rec = purchaseMap.get(key); rec.total += val; rec.lines.push(line.replace('Precio estimado:', 'Precio:').replace('Valor estimado:', 'Importe:'));
      }
    });
    donationMap.forEach(r => r.lines.sort((a,b)=>sortKey(a).localeCompare(sortKey(b),'es')));
    purchaseMap.forEach(r => r.lines.sort((a,b)=>sortKey(a).localeCompare(sortKey(b),'es')));
    return {donationMap, purchaseMap};
  }

  function applyTiendaTicketStable(){
    const wrap = $('summaryTiendaTicket');
    if(!wrap) return;
    const {donationMap, purchaseMap} = buildTicketMaps();
    wrap.querySelectorAll('.summary-item').forEach(item => {
      const labelEl = item.querySelector('span');
      const valueEl = item.querySelector('strong, b, .money-text') || item.lastElementChild;
      let label = norm(labelEl?.textContent || '');
      if(!label || normUp(label) === 'TOTAL') return;
      for(const [, rec] of donationMap){
        if(label === rec.key || label.startsWith(rec.key + ' ·') || label.startsWith(rec.key + ' -')){
          // El registro visible queda limpio: Donante | DONADO xxxxx, sin detalle.
          if(labelEl) labelEl.textContent = rec.key;
          const tip = `DONACIÓN\n${rec.key}\nTOTAL ESTIMADO: ${moneyF(rec.total)}\n\n${rec.lines.join('\n')}`;
          setTip(item, tip, '#ffffff', true);
          setTip(labelEl, tip, '#ffffff', true);
          if(valueEl) setTip(valueEl, tip, '#ffffff', true);
          return;
        }
      }
      for(const [, rec] of purchaseMap){
        if(label === rec.key || label.startsWith(rec.key + ' ·') || label.startsWith(rec.key + ' -')){
          const tip = `TIENDA | TICKET\n${rec.key}\nTOTAL: ${moneyF(rec.total)}\n\n${rec.lines.join('\n')}`;
          setTip(item, tip, '#ffffff', true);
          setTip(labelEl, tip, '#ffffff', true);
          if(valueEl) setTip(valueEl, tip, '#ffffff', true);
          return;
        }
      }
    });
  }

  function applySortedGroupingTips(){
    const ids = ['summarySegmento','summaryDestino','eventChartWrap','budgetLayout','ingresosSummaryGrid'];
    ids.forEach(id => {
      const root = $(id);
      if(!root) return;
      root.querySelectorAll('[data-ce-tip],[data-v181-tip],[data-tip],[title]').forEach(el => {
        const raw = getRawTip(el);
        if(norm(raw)) setTip(el, raw, el.getAttribute('data-tip-bg') || getComputedStyle(el).backgroundColor || '#ffffff', el.getAttribute('data-ce-tip-black') === '1' || true);
      });
    });
  }

  const moneyRe = /(?:\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)(?:\s|&nbsp;|\u00a0)*(?:€|EUR)|(?:€|EUR)(?:\s|&nbsp;|\u00a0)*(?:\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)/gi;
  function boldLastMoney(html){
    let matches = [...html.matchAll(moneyRe)];
    if(!matches.length) return html;
    const m = matches[matches.length-1];
    return html.slice(0,m.index) + '<strong>' + m[0] + '</strong>' + html.slice(m.index + m[0].length);
  }
  function boldOnlySemantic(lineHtml){
    let h = lineHtml;
    h = h.replace(/^(\s*•\s*)([^—\|:]+)(\s*(?:—|\||:)\s*)/i, '$1<strong>$2</strong>$3');
    h = h.replace(/^([^—\|:]+)(\s*\|\s*(?:DONADO|TICKET)\b.*)$/i, '<strong>$1</strong>$2');
    h = h.replace(/\b(DONANTE|SOCIO|NO SOCIO|PERSONA|NOMBRE|PRODUCTO|TIENDA)\s*:\s*([^—\n\|:]+)/gi, '$1: <strong>$2</strong>');
    return boldLastMoney(h);
  }
  function tipHtml(raw){
    return sortTipText(raw).split('\n').map(line => {
      if(!line.trim()) return '<div class="ce-tip-line ce-tip-blank"></div>';
      return '<div class="ce-tip-line">' + boldOnlySemantic(esc(line)) + '</div>';
    }).join('');
  }
  function ensureTip(){
    let tip = $('ceTooltipV190');
    if(!tip){ tip = document.createElement('div'); tip.id = 'ceTooltipV190'; tip.className = 'ce-tooltip-v190'; document.body.appendChild(tip); }
    return tip;
  }
  function placeTip(tip, x, y){
    const margin = 12;
    tip.classList.add('ce-click-open');
    tip.classList.remove('full');
    tip.style.display = 'block';
    tip.style.width = 'max-content';
    tip.style.maxWidth = 'min(860px, calc(100vw - 32px))';
    tip.style.maxHeight = '75vh';
    tip.style.overflow = 'auto';
    tip.style.left = '0px';
    tip.style.top = '0px';
    const rect = tip.getBoundingClientRect();
    let left = (Number.isFinite(x) ? x : 24) + 14;
    let top = (Number.isFinite(y) ? y : 24) + 14;
    if(left + rect.width > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - rect.width - margin);
    if(top + rect.height > window.innerHeight - margin) top = Math.max(margin, window.innerHeight - rect.height - margin);
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }
  function openTipFor(el, x, y){
    const raw = getRawTip(el);
    if(!norm(raw)) return false;
    const tip = ensureTip();
    const html = tipHtml(raw);
    tip.innerHTML = html;
    tip.dataset.v193Html = html;
    const bg = el.getAttribute('data-tip-bg') || '#ffffff';
    tip.style.background = bg;
    tip.style.color = el.getAttribute('data-ce-tip-black') === '1' ? '#111827' : (bg === '#ffffff' ? '#111827' : '#111827');
    tip.style.borderColor = 'rgba(15,23,42,.18)';
    tip.scrollTop = 0;
    placeTip(tip, x, y);
    return true;
  }
  function closeTip(){
    const tip = $('ceTooltipV190');
    if(tip){ tip.classList.remove('ce-click-open'); tip.style.display = 'none'; }
  }

  // Anula los globos por hover de parches anteriores. Con CSS quedan ocultos; esto evita residuos internos.
  ['mouseover','mousemove','mouseenter','focusin'].forEach(evt => {
    document.addEventListener(evt, () => {
      const tip = $('ceTooltipV190');
      if(tip && !tip.classList.contains('ce-click-open')) tip.style.display = 'none';
    }, true);
  });

  document.addEventListener('click', e => {
    const tip = $('ceTooltipV190');
    if(tip && (e.target === tip || tip.contains(e.target))) return;
    const interactive = e.target.closest?.('button,input,select,textarea,a');
    const el = e.target.closest?.('[data-ce-tip],[data-v181-tip],[data-tip]');
    if(!el || interactive){ closeTip(); return; }
    const ok = openTipFor(el, e.clientX, e.clientY);
    if(ok){ e.preventDefault(); e.stopPropagation(); }
    else closeTip();
  }, true);
  document.addEventListener('keydown', e => { if(e.key === 'Escape') closeTip(); }, true);
  window.addEventListener('scroll', closeTip, true);
  window.addEventListener('resize', closeTip);

  function refreshVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span, .appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION;
    });
  }
  function normalizeDownloadName(name){
    let n = String(name || '');
    n = n.replace(/^ControlEvent_v\d+_\d+(?:_\d+)?/i, VERSION_FILE);
    return n;
  }
  const currentClick = HTMLAnchorElement.prototype.click;
  if(!HTMLAnchorElement.prototype.click.__v193Wrapped){
    const wrapped = function(){
      try{ if(this.download) this.download = normalizeDownloadName(this.download); }catch(_){ }
      return currentClick.apply(this, arguments);
    };
    wrapped.__v193Wrapped = true;
    HTMLAnchorElement.prototype.click = wrapped;
  }

  function afterRenderV193(){
    refreshVersion();
    applyTiendaTicketStable();
    applySortedGroupingTips();
    normalizeAllTipTexts();
  }
  const prevRender = typeof render === 'function' ? render : null;
  if(prevRender && !prevRender.__v193Wrapped){
    const wrappedRender = function(){
      const ret = prevRender.apply(this, arguments);
      setTimeout(afterRenderV193, 20);
      setTimeout(afterRenderV193, 160);
      return ret;
    };
    wrappedRender.__v193Wrapped = true;
    render = wrappedRender;
    window.render = render;
  }
  ['DOMContentLoaded','load'].forEach(evt => window.addEventListener(evt, () => { afterRenderV193(); setTimeout(afterRenderV193, 350); }));
  afterRenderV193();
  setTimeout(afterRenderV193, 350);
  setTimeout(afterRenderV193, 1200);
})();

;/* ===== END legacy-inline-23-v193-tooltip-click-sort-script.js ===== */


;/* ===== BEGIN legacy-inline-24-v171-pwa-script.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #24. */
(function(){
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const canUseSW = () => 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1');

  if(canUseSW()){
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(err => console.warn('ControlEvent PWA: no se pudo registrar sw.js', err));
    });
  }

  let deferredPrompt = null;
  function ensureInstallButton(){
    if(isStandalone() || document.getElementById('pwaInstallBtn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'pwaInstallBtn';
    btn.className = 'pwa-install-btn';
    btn.innerHTML = '📲 Instalar app';
    btn.addEventListener('click', async () => {
      if(deferredPrompt){
        deferredPrompt.prompt();
        try{ await deferredPrompt.userChoice; }catch(_){ }
        deferredPrompt = null;
        btn.classList.remove('visible');
        return;
      }
      if(isIOS()){
        alert('Para instalar ControlEvent en iPhone: abre esta página en Safari, pulsa Compartir y elige “Añadir a pantalla de inicio”. Después se abrirá como app, sin barra de navegador.');
      }else{
        alert('Para instalar ControlEvent: abre el menú del navegador y elige “Instalar app” o “Añadir a pantalla de inicio”.');
      }
    });
    document.body.appendChild(btn);
    if(deferredPrompt || isIOS()) btn.classList.add('visible');
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    ensureInstallButton();
    const btn = document.getElementById('pwaInstallBtn');
    if(btn) btn.classList.add('visible');
  });

  window.addEventListener('appinstalled', () => {
    const btn = document.getElementById('pwaInstallBtn');
    if(btn) btn.classList.remove('visible');
  });

  window.addEventListener('load', () => {
    if(!isStandalone() && isIOS()) ensureInstallButton();
  });
})();

;/* ===== END legacy-inline-24-v171-pwa-script.js ===== */


;/* ===== BEGIN legacy-inline-25-v194-tooltip-excel-script.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #25. */
/* ==== V19.4: los globos no cambian al mover el cursor y el botón Excel queda cableado de forma directa ==== */
(function(){
  const VERSION = 'ControlEvent v28.10';
  const VERSION_FILE = 'ControlEvent_v28_10';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const normUp = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const moneyRe = /(?:\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)(?:\s|&nbsp;|\u00a0)*(?:€|EUR)|(?:€|EUR)(?:\s|&nbsp;|\u00a0)*(?:\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)/gi;

  let activeTarget = null;
  let activeRaw = '';
  let activeHtml = '';
  let activeBg = '#ffffff';
  let activeX = 24;
  let activeY = 24;
  let keepOpenUntil = 0;

  function getRawTip(el){
    if(!el) return '';
    return el.getAttribute('data-ce-tip') || el.getAttribute('data-v181-tip') || el.getAttribute('data-tip') || el.getAttribute('title') || '';
  }
  function sortKey(line){
    let s = String(line || '').replace(/^\s*•\s*/, '').trim();
    s = s.replace(/^(DONANTE|SOCIO|NO SOCIO|PERSONA|NOMBRE|PRODUCTO|TIENDA)\s*:\s*/i,'');
    s = s.split(/\s+[—-]\s+|\s*\|\s*|\s*:\s*/)[0] || s;
    return normUp(s);
  }
  function sortConsecutiveBullets(lines){
    const out = [];
    for(let i=0;i<lines.length;){
      if(/^\s*•\s*/.test(lines[i] || '')){
        const block = [];
        while(i<lines.length && /^\s*•\s*/.test(lines[i] || '')) block.push(lines[i++]);
        block.sort((a,b)=>sortKey(a).localeCompare(sortKey(b),'es'));
        out.push(...block);
      }else{
        out.push(lines[i++]);
      }
    }
    return out;
  }
  function sortTipText(raw){
    return sortConsecutiveBullets(String(raw || '').replace(/\r\n/g,'\n').split('\n')).join('\n');
  }
  function boldLastMoney(html){
    const matches = [...html.matchAll(moneyRe)];
    if(!matches.length) return html;
    const m = matches[matches.length - 1];
    return html.slice(0,m.index) + '<strong>' + m[0] + '</strong>' + html.slice(m.index + m[0].length);
  }
  function boldOnlySemantic(lineHtml){
    let h = lineHtml;
    h = h.replace(/^(\s*•\s*)([^—\|:]+)(\s*(?:—|\||:)\s*)/i, '$1<strong>$2</strong>$3');
    h = h.replace(/^([^—\|:]+)(\s*\|\s*(?:DONADO|TICKET)\b.*)$/i, '<strong>$1</strong>$2');
    h = h.replace(/\b(DONANTE|SOCIO|NO SOCIO|PERSONA|NOMBRE|PRODUCTO|TIENDA)\s*:\s*([^—\n\|:]+)/gi, '$1: <strong>$2</strong>');
    return boldLastMoney(h);
  }
  function tipHtml(raw){
    return sortTipText(raw).split('\n').map(line => {
      if(!line.trim()) return '<div class="ce-tip-line ce-tip-blank"></div>';
      return '<div class="ce-tip-line">' + boldOnlySemantic(esc(line)) + '</div>';
    }).join('');
  }
  function ensureTip(){
    let tip = $('ceTooltipV190');
    if(!tip){
      tip = document.createElement('div');
      tip.id = 'ceTooltipV190';
      tip.className = 'ce-tooltip-v190';
      document.body.appendChild(tip);
    }
    return tip;
  }
  function placeTip(tip){
    const margin = 12;
    tip.classList.remove('full');
    tip.classList.add('ce-click-open');
    tip.style.display = 'block';
    tip.style.width = 'max-content';
    tip.style.minWidth = 'min(220px, calc(100vw - 32px))';
    tip.style.maxWidth = 'min(860px, calc(100vw - 32px))';
    tip.style.maxHeight = '75vh';
    tip.style.overflow = 'auto';
    tip.style.pointerEvents = 'auto';
    tip.style.left = '0px';
    tip.style.top = '0px';
    const rect = tip.getBoundingClientRect();
    let left = activeX + 14;
    let top = activeY + 14;
    if(left + rect.width > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - rect.width - margin);
    if(top + rect.height > window.innerHeight - margin) top = Math.max(margin, window.innerHeight - rect.height - margin);
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }
  function enforceActiveTip(){
    const tip = $('ceTooltipV190');
    if(!activeTarget || !activeRaw || !tip) return;
    tip.innerHTML = activeHtml;
    tip.dataset.v194Html = activeHtml;
    tip.style.background = activeBg || '#ffffff';
    tip.style.color = '#111827';
    tip.style.borderColor = 'rgba(15,23,42,.18)';
    placeTip(tip);
  }
  function openTip(el, x, y){
    const raw = getRawTip(el);
    if(!norm(raw)) return false;
    activeTarget = el;
    activeRaw = sortTipText(raw);
    activeHtml = tipHtml(activeRaw);
    activeBg = el.getAttribute('data-tip-bg') || '#ffffff';
    activeX = Number.isFinite(x) ? x : 24;
    activeY = Number.isFinite(y) ? y : 24;
    const tip = ensureTip();
    tip.scrollTop = 0;
    enforceActiveTip();
    return true;
  }
  function closeTip(){
    activeTarget = null;
    activeRaw = '';
    activeHtml = '';
    const tip = $('ceTooltipV190');
    if(tip){
      tip.classList.remove('ce-click-open');
      tip.style.display = 'none';
    }
  }
  function hideHoverResidue(){
    const tip = $('ceTooltipV190');
    if(tip && !activeTarget){
      tip.classList.remove('ce-click-open');
      tip.style.display = 'none';
    }
  }

  // Los parches anteriores tenían escuchas de mousemove que reescribían el globo.
  // Esta rutina vuelve a fijar el contenido activo después de cada movimiento.
  ['mouseover','mousemove','mouseenter','focusin'].forEach(evt => {
    document.addEventListener(evt, ev => {
      if(activeTarget){
        keepOpenUntil = Date.now() + 250;
        setTimeout(enforceActiveTip, 0);
        setTimeout(enforceActiveTip, 20);
      }else{
        setTimeout(hideHoverResidue, 0);
      }
    }, true);
  });

  document.addEventListener('click', ev => {
    const tip = $('ceTooltipV190');
    if(tip && (ev.target === tip || tip.contains(ev.target))){
      keepOpenUntil = Date.now() + 1200;
      return;
    }
    const interactive = ev.target.closest?.('button,input,select,textarea,a');
    if(interactive){ closeTip(); return; }
    const el = ev.target.closest?.('[data-ce-tip],[data-v181-tip],[data-tip]');
    if(!el){ closeTip(); return; }
    const ok = openTip(el, ev.clientX, ev.clientY);
    if(ok){
      ev.preventDefault();
      ev.stopImmediatePropagation();
    }else{
      closeTip();
    }
  }, true);

  function protectTipInteraction(){
    const tip = $('ceTooltipV190');
    if(!tip || tip.dataset.v194Protected === '1') return;
    tip.dataset.v194Protected = '1';
    ['mouseenter','mousemove','wheel','scroll','pointerdown','touchstart'].forEach(evt => {
      tip.addEventListener(evt, () => {
        keepOpenUntil = Date.now() + 1500;
        setTimeout(enforceActiveTip, 0);
      }, {passive:true});
    });
  }
  document.addEventListener('wheel', ev => {
    const tip = $('ceTooltipV190');
    if(tip && (ev.target === tip || tip.contains(ev.target))){
      keepOpenUntil = Date.now() + 1500;
      setTimeout(enforceActiveTip, 0);
      setTimeout(protectTipInteraction, 0);
    }
  }, true);
  window.addEventListener('scroll', ev => {
    const tip = $('ceTooltipV190');
    const insideTip = tip && (ev.target === tip || (ev.target && tip.contains && tip.contains(ev.target)));
    if(activeTarget && (insideTip || Date.now() < keepOpenUntil)){
      setTimeout(enforceActiveTip, 0);
      setTimeout(enforceActiveTip, 30);
    }else if(!activeTarget){
      setTimeout(hideHoverResidue, 0);
    }
  }, true);
  window.addEventListener('resize', () => { if(activeTarget) setTimeout(enforceActiveTip,0); }, true);
  document.addEventListener('keydown', ev => { if(ev.key === 'Escape') closeTip(); }, true);

  function normalizeDownloadName(name){
    let n = String(name || '');
    n = n.replace(/^ControlEvent_v\d+_\d+(?:_\d+)?/i, VERSION_FILE);
    n = n.replace(/ControlEvent_v28_10/ig, VERSION_FILE);
    return n;
  }
  const currentAnchorClick = HTMLAnchorElement.prototype.click;
  if(!HTMLAnchorElement.prototype.click.__v194Wrapped){
    const wrapped = function(){
      try{ if(this.download) this.download = normalizeDownloadName(this.download); }catch(_){ }
      return currentAnchorClick.apply(this, arguments);
    };
    wrapped.__v194Wrapped = true;
    HTMLAnchorElement.prototype.click = wrapped;
  }

  async function runExcelExport(){
    try{
      const fn = (typeof exportExcel === 'function') ? exportExcel : (typeof window.exportExcel === 'function' ? window.exportExcel : null);
      if(!fn){ alert('No se encontró la función de exportación a Excel.'); return; }
      const ret = fn.call(window);
      if(ret && typeof ret.then === 'function') await ret;
    }catch(err){
      console.error('Error exportando INFOEVENTO', err);
      alert('No se pudo descargar la INFOEVENTO. Revisa la consola para ver el detalle.');
    }
  }
  function wireExcelButton(){
    const btn = $('btnExportExcel');
    if(!btn) return;
    btn.disabled = false;
    btn.removeAttribute('disabled');
    btn.classList.remove('locked');
    btn.style.pointerEvents = 'auto';
    btn.style.opacity = '1';
    btn.setAttribute('aria-disabled','false');
    if(btn.dataset.v194ExcelWired === '1') return;
    btn.dataset.v194ExcelWired = '1';
    btn.addEventListener('click', ev => {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      closeTip();
      runExcelExport();
    }, true);
  }
  function refreshVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span, .appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION;
    });
  }
  function afterRenderV194(){
    refreshVersion();
    wireExcelButton();
    protectTipInteraction();
    if(activeTarget) setTimeout(enforceActiveTip, 0); else hideHoverResidue();
  }
  const prevRender = typeof render === 'function' ? render : null;
  if(prevRender && !prevRender.__v194Wrapped){
    const wrappedRender = function(){
      const ret = prevRender.apply(this, arguments);
      setTimeout(afterRenderV194, 20);
      setTimeout(afterRenderV194, 180);
      return ret;
    };
    wrappedRender.__v194Wrapped = true;
    render = wrappedRender;
    window.render = render;
  }
  ['DOMContentLoaded','load'].forEach(evt => window.addEventListener(evt, () => { afterRenderV194(); setTimeout(afterRenderV194, 350); }));
  afterRenderV194();
  setTimeout(afterRenderV194, 350);
  setTimeout(afterRenderV194, 1200);
})();

;/* ===== END legacy-inline-25-v194-tooltip-excel-script.js ===== */


;/* ===== BEGIN legacy-inline-26-v1952-tooltip-excel-fix-script.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #26. */
/* ==== V19.5.2: recupera globos y Excel desde v19.4, evitando interferencias de parches antiguos ==== */
(function(){
  const VERSION = 'ControlEvent v28.10';
  const VERSION_FILE = 'ControlEvent_v28_10';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const normUp = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const moneyRe = /(?:\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)(?:\s|&nbsp;|\u00a0)*(?:€|EUR)|(?:€|EUR)(?:\s|&nbsp;|\u00a0)*(?:\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)/gi;

  let activeOwner = null;
  let closeTimer = null;
  let excelWired = false;

  function moneyF(v){
    try{ return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0)); }
    catch(_){ return `${Number(v || 0).toFixed(2)} €`; }
  }
  function numF(v){
    try{ return new Intl.NumberFormat('es-ES',{minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(v || 0)); }
    catch(_){ return String(v ?? ''); }
  }
  function getState(){
    try{ if(typeof state !== 'undefined' && state) return state; }catch(_){ }
    return window.state || {};
  }
  function getRawLegacyTip(el){
    if(!el) return '';
    return el.getAttribute('data-ce-tip-v1952') || el.getAttribute('data-ce-tip') || el.getAttribute('data-v181-tip') || el.getAttribute('data-tip') || el.getAttribute('title') || '';
  }
  function sortKey(line){
    let s = String(line || '').replace(/^\s*•\s*/, '').trim();
    s = s.replace(/^(DONANTE|SOCIO|NO SOCIO|PERSONA|NOMBRE|PRODUCTO|TIENDA)\s*:\s*/i,'');
    s = s.split(/\s+[—-]\s+|\s*\|\s*|\s*:\s*/)[0] || s;
    return normUp(s);
  }
  function sortRecordBlock(lines){
    return lines.sort((a,b)=>sortKey(a).localeCompare(sortKey(b),'es'));
  }
  function isRecordLine(line){
    const s = String(line || '').trim();
    return /^•\s*/.test(s) || /\s[—-]\s/.test(s) || /\|/.test(s);
  }
  function sortTipText(raw){
    const lines = String(raw || '').replace(/\r\n/g,'\n').split('\n');
    const out = [];
    for(let i=0;i<lines.length;){
      if(isRecordLine(lines[i])){
        const block = [];
        while(i<lines.length && isRecordLine(lines[i])) block.push(lines[i++]);
        out.push(...sortRecordBlock(block));
      }else{
        out.push(lines[i++]);
      }
    }
    return out.join('\n');
  }
  function boldLastMoney(html){
    const matches = [...html.matchAll(moneyRe)];
    if(!matches.length) return html;
    const m = matches[matches.length - 1];
    return html.slice(0,m.index) + '<strong>' + m[0] + '</strong>' + html.slice(m.index + m[0].length);
  }
  function boldOnlySemantic(lineHtml){
    let h = lineHtml;
    h = h.replace(/^(\s*•\s*)([^—\|:]+)(\s*(?:—|\||:)\s*)/i, '$1<strong>$2</strong>$3');
    h = h.replace(/^([^—\|:]+)(\s*\|\s*(?:DONADO|TICKET)\b.*)$/i, '<strong>$1</strong>$2');
    h = h.replace(/\b(DONANTE|SOCIO|NO SOCIO|PERSONA|NOMBRE|PRODUCTO|TIENDA)\s*:\s*([^—\n\|:]+)/gi, '$1: <strong>$2</strong>');
    return boldLastMoney(h);
  }
  function tipHtml(raw){
    return sortTipText(raw).split('\n').map(line => {
      if(!line.trim()) return '<div class="ce-tip-line ce-tip-blank"></div>';
      return '<div class="ce-tip-line">' + boldOnlySemantic(esc(line)) + '</div>';
    }).join('');
  }
  function ensureTip(){
    let tip = $('ceTooltipV1952');
    if(!tip){
      tip = document.createElement('div');
      tip.id = 'ceTooltipV1952';
      document.body.appendChild(tip);
      ['mouseenter','mousemove','pointermove','wheel','scroll','pointerdown','touchstart','click'].forEach(evt => {
        tip.addEventListener(evt, ev => {
          if(closeTimer){ clearTimeout(closeTimer); closeTimer = null; }
          ev.stopPropagation();
        }, {capture:true, passive: evt === 'wheel' ? false : true});
      });
    }
    return tip;
  }
  function getOwner(el){
    return el?.closest?.('.metric,.summary-card,.summary-item,.budget-row,.budget-subrow,.chart-track,.chart-seg,.vbars-card,.vbar-col,.chart-stat,.itemcard,.budget-panel') || el;
  }
  function clearOwnerLeave(){
    if(activeOwner && activeOwner.__ceLeave1952){
      activeOwner.removeEventListener('mouseleave', activeOwner.__ceLeave1952, true);
      activeOwner.__ceLeave1952 = null;
    }
  }
  function closeTip(){
    if(closeTimer){ clearTimeout(closeTimer); closeTimer = null; }
    clearOwnerLeave();
    activeOwner = null;
    const tip = $('ceTooltipV1952');
    if(tip) tip.style.display = 'none';
  }
  function scheduleClose(delay=120){
    if(closeTimer) clearTimeout(closeTimer);
    closeTimer = setTimeout(() => closeTip(), delay);
  }
  function placeTip(tip, el){
    const margin = 12;
    tip.style.display = 'block';
    tip.style.left = '0px';
    tip.style.top = '0px';
    tip.style.width = 'max-content';
    tip.style.maxWidth = 'min(860px, calc(100vw - 32px))';
    tip.style.maxHeight = '75vh';
    tip.style.overflow = 'auto';
    const r = el.getBoundingClientRect ? el.getBoundingClientRect() : {left:20,bottom:20,width:0,height:0,top:20};
    const tr = tip.getBoundingClientRect();
    let left = r.left;
    let top = r.bottom + 8;
    if(left + tr.width > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - tr.width - margin);
    if(top + tr.height > window.innerHeight - margin) top = Math.max(margin, r.top - tr.height - 8);
    if(top < margin) top = margin;
    tip.style.left = Math.round(left) + 'px';
    tip.style.top = Math.round(top) + 'px';
  }
  function openTip(el){
    const raw = getRawLegacyTip(el);
    if(!norm(raw)) return false;
    const tip = ensureTip();
    tip.innerHTML = tipHtml(raw);
    tip.style.background = el.getAttribute('data-tip-bg-v1952') || el.getAttribute('data-tip-bg') || '#ffffff';
    tip.style.color = '#111827';
    tip.scrollTop = 0;
    clearOwnerLeave();
    activeOwner = getOwner(el);
    if(activeOwner){
      activeOwner.__ceLeave1952 = ev => {
        const t = $('ceTooltipV1952');
        if(t && ev.relatedTarget && (ev.relatedTarget === t || t.contains(ev.relatedTarget))) return;
        scheduleClose(140);
      };
      activeOwner.addEventListener('mouseleave', activeOwner.__ceLeave1952, true);
    }
    placeTip(tip, el);
    return true;
  }

  function setNewTip(el, text, bg){
    if(!el || !norm(text)) return;
    el.setAttribute('data-ce-tip-v1952', sortTipText(text));
    el.setAttribute('data-tip-bg-v1952', bg || '#ffffff');
    el.removeAttribute('data-ce-tip');
    el.removeAttribute('data-v181-tip');
    el.removeAttribute('data-tip');
    el.removeAttribute('title');
  }
  function freezeLegacyTips(){
    document.querySelectorAll('[data-ce-tip],[data-v181-tip],[data-tip],[title]').forEach(el => {
      if(el.closest?.('#authOverlay')) return;
      if(el.id === 'btnExportExcel') return;
      const raw = getRawLegacyTip(el);
      if(!norm(raw)) return;
      const bg = el.getAttribute('data-tip-bg') || (el.classList?.contains('chart-seg') ? getComputedStyle(el).backgroundColor : '#ffffff');
      setNewTip(el, raw, bg);
    });
  }

  function personaNombre(id){
    try{ const p = (typeof personaById === 'function') ? personaById(id) : null; if(p?.nombre) return p.nombre; }catch(_){ }
    const st = getState(); return (st.personas || []).find(p => String(p.id) === String(id))?.nombre || 'Sin nombre';
  }
  function productoNombre(id){
    try{ const p = (typeof productoById === 'function') ? productoById(id) : null; if(p?.nombre) return p.nombre; }catch(_){ }
    const st = getState(); return (st.productos || []).find(p => String(p.id) === String(id))?.nombre || 'Producto';
  }
  function productoPrecio(id){
    try{ const p = (typeof productoById === 'function') ? productoById(id) : null; if(p) return Number(p.precio ?? p.defaultPrecio ?? 0); }catch(_){ }
    const st = getState(); const p = (st.productos || []).find(x => String(x.id) === String(id));
    return Number(p?.precio ?? p?.defaultPrecio ?? 0);
  }
  function donorName(c){
    try{ if(typeof resolveDonorNameV171 === 'function'){ const v = resolveDonorNameV171(c); if(norm(v) && normUp(v) !== 'SIN TIENDA') return v; } }catch(_){ }
    try{ if(typeof resolveDonorNameV164 === 'function'){ const v = resolveDonorNameV164(c); if(norm(v) && normUp(v) !== 'SIN TIENDA') return v; } }catch(_){ }
    const raw = norm(c?.donorRef || c?.donante || c?.donanteNombre || '');
    if(raw.startsWith('P:')) return personaNombre(raw.slice(2));
    return raw || 'Sin donante';
  }
  function productLine(c, donation=false){
    const prod = c?.producto?.nombre || productoNombre(c?.productoId);
    const qty = Number(c?.unidades || 0);
    const price = Number(c?.precio ?? c?.precioCalc ?? productoPrecio(c?.productoId));
    const val = Number(c?.valor ?? (qty * price));
    return donation
      ? `• ${prod} — Cantidad: ${numF(qty)} — Precio estimado: ${moneyF(price)} — Valor estimado: ${moneyF(val)}`
      : `• ${prod} — Cantidad: ${numF(qty)} — Precio: ${moneyF(price)} — Importe: ${moneyF(val)}`;
  }
  function applyBudgetSpecificTips(){
    const b = (typeof budgetSummary === 'function') ? budgetSummary() : null;
    const rows = (typeof collabsForEvent === 'function') ? collabsForEvent() : [];
    const compras = (typeof comprasForEvent === 'function') ? comprasForEvent() : [];
    const socioRows = rows.filter(r => r.persona?.rango === 'SOCIO');
    const noSocioRows = rows.filter(r => r.persona?.rango !== 'SOCIO');
    const linesCollab = arr => arr.map(r => `• ${r.persona?.nombre || personaNombre(r.personaId)} — Nº: ${numF(r.numero || 0)} — Total: ${moneyF(r.total ?? r.importe ?? 0)}`).sort((a,b)=>sortKey(a).localeCompare(sortKey(b),'es'));
    const donationLines = ticket => compras.filter(c => norm(c.ticketDonacion) === ticket).map(c => `• ${donorName(c)} — ${productLine(c,true).replace(/^•\s*/, '')}`).sort((a,b)=>sortKey(a).localeCompare(sortKey(b),'es'));
    document.querySelectorAll('#budgetLayout .budget-subrow').forEach(row => {
      const label = norm(row.querySelector('span')?.textContent || '');
      let text = '';
      if(label === 'Personas'){
        const isNoSocio = !!row.closest('.budget-subrows')?.previousElementSibling?.textContent?.toUpperCase?.().includes('NO SOCIOS');
        const arr = isNoSocio ? noSocioRows : socioRows;
        text = `${isNoSocio ? 'NO SOCIOS' : 'SOCIOS'} / PERSONAS\n${linesCollab(arr).join('\n') || 'Sin registros'}`;
      }else if(/Importe socios/i.test(label)) text = `SOCIOS / IMPORTE SOCIOS\n${(b?.ingresosDinero?.socios?.listImporte || linesCollab(socioRows)).join('\n') || 'Sin registros'}`;
      else if(/Ingresado socios/i.test(label)) text = `SOCIOS / INGRESADO SOCIOS\n${(b?.ingresosDinero?.socios?.listIngresado || linesCollab(socioRows.filter(r=>r.situacion!=='Pendiente'))).join('\n') || 'Sin registros'}`;
      else if(/Pendiente socios/i.test(label)) text = `SOCIOS / PENDIENTE SOCIOS\n${(b?.ingresosDinero?.socios?.listPendiente || linesCollab(socioRows.filter(r=>r.situacion==='Pendiente'))).join('\n') || 'Sin registros'}`;
      else if(/Importe no socios|Importe donantes/i.test(label)) text = `NO SOCIOS / IMPORTE NO SOCIOS\n${(b?.ingresosDinero?.noSocios?.listImporte || b?.ingresosDinero?.donantes?.listImporte || linesCollab(noSocioRows)).join('\n') || 'Sin registros'}`;
      else if(/Ingresado no socios|Ingresado donantes/i.test(label)) text = `NO SOCIOS / INGRESADO NO SOCIOS\n${(b?.ingresosDinero?.noSocios?.listIngresado || b?.ingresosDinero?.donantes?.listIngresado || linesCollab(noSocioRows.filter(r=>r.situacion!=='Pendiente'))).join('\n') || 'Sin registros'}`;
      else if(/Pendiente no socios|Pendiente donantes/i.test(label)) text = `NO SOCIOS / PENDIENTE NO SOCIOS\n${(b?.ingresosDinero?.noSocios?.listPendiente || b?.ingresosDinero?.donantes?.listPendiente || linesCollab(noSocioRows.filter(r=>r.situacion==='Pendiente'))).join('\n') || 'Sin registros'}`;
      else if(/Donación de producto tiendas/i.test(label)) text = `DONACIÓN DE PRODUCTO / TIENDAS\n${(b?.donacionProducto?.listTiendas || donationLines('DONADO TIENDA')).join('\n') || 'Sin registros'}`;
      else if(/Donación de producto socios/i.test(label)) text = `DONACIÓN DE PRODUCTO / SOCIOS\n${(b?.donacionProducto?.listSocios || donationLines('DONADO SOCIO')).join('\n') || 'Sin registros'}`;
      else if(/Donación de producto no socios/i.test(label)) text = `DONACIÓN DE PRODUCTO / NO SOCIOS\n${(b?.donacionProducto?.listNoSocios || donationLines('DONADO OTROS')).join('\n') || 'Sin registros'}`;
      if(text){
        setNewTip(row, text, '#ffffff');
        const first = row.querySelector('span'); if(first) setNewTip(first, text, '#ffffff');
        const last = row.querySelector('span:last-child'); if(last) setNewTip(last, text, '#ffffff');
      }
    });
  }

  function normalizeDownloadName(name){
    let n = String(name || '');
    n = n.replace(/^ControlEvent_v\d+_\d+(?:_\d+)?/i, VERSION_FILE);
    n = n.replace(/ControlEvent_v19_\d(?:_\d+)?/ig, VERSION_FILE);
    return n;
  }
  if(!HTMLAnchorElement.prototype.click.__v1952Wrapped){
    const prev = HTMLAnchorElement.prototype.click;
    const wrapped = function(){
      try{ if(this.download) this.download = normalizeDownloadName(this.download); }catch(_){ }
      return prev.apply(this, arguments);
    };
    wrapped.__v1952Wrapped = true;
    HTMLAnchorElement.prototype.click = wrapped;
  }
  async function runExcelExportV1952(){
    try{
      const fn = (typeof exportExcel === 'function') ? exportExcel : (typeof window.exportExcel === 'function' ? window.exportExcel : null);
      if(!fn){ alert('No se encontró la función de exportación a Excel.'); return; }
      const ret = fn.call(window);
      if(ret && typeof ret.then === 'function') await ret;
    }catch(err){
      console.error('Error exportando INFOEVENTO v19.5.2', err);
      alert('No se pudo descargar la INFOEVENTO. Revisa la consola para ver el detalle.');
    }
  }
  function wireExcelButtonV1952(){
    let btn = $('btnExportExcel');
    if(!btn) return;
    if(btn.dataset.v1952Clean !== '1'){
      const clone = btn.cloneNode(true);
      clone.dataset.v1952Clean = '1';
      clone.id = 'btnExportExcel';
      btn.parentNode.replaceChild(clone, btn);
      btn = clone;
    }
    btn.disabled = false;
    btn.removeAttribute('disabled');
    btn.classList.remove('locked');
    btn.style.pointerEvents = 'auto';
    btn.style.opacity = '1';
    btn.setAttribute('aria-disabled','false');
    if(excelWired) return;
    excelWired = true;
    btn.addEventListener('click', ev => {
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      closeTip();
      runExcelExportV1952();
    }, true);
  }
  function refreshVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span, .appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION;
    });
  }
  function afterRenderV1952(){
    refreshVersion();
    applyBudgetSpecificTips();
    freezeLegacyTips();
    wireExcelButtonV1952();
    const oldTip = $('ceTooltipV190'); if(oldTip) oldTip.style.display = 'none';
    const oldTip2 = $('ceTooltipV181'); if(oldTip2) oldTip2.style.display = 'none';
  }

  document.addEventListener('click', ev => {
    const tip = $('ceTooltipV1952');
    if(tip && (ev.target === tip || tip.contains(ev.target))) return;
    const el = ev.target.closest?.('[data-ce-tip-v1952]');
    if(!el){ closeTip(); return; }
    const ok = openTip(el);
    if(ok){
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
    }
  }, true);
  document.addEventListener('keydown', ev => { if(ev.key === 'Escape') closeTip(); }, true);
  window.addEventListener('scroll', () => closeTip(), true);
  window.addEventListener('resize', () => closeTip(), true);

  const prevRender = typeof render === 'function' ? render : null;
  if(prevRender && !prevRender.__v1952Wrapped){
    const wrappedRender = function(){
      const ret = prevRender.apply(this, arguments);
      setTimeout(afterRenderV1952, 40);
      setTimeout(afterRenderV1952, 260);
      setTimeout(afterRenderV1952, 620);
      return ret;
    };
    wrappedRender.__v1952Wrapped = true;
    render = wrappedRender;
    window.render = render;
  }
  ['DOMContentLoaded','load'].forEach(evt => window.addEventListener(evt, () => {
    setTimeout(afterRenderV1952, 40);
    setTimeout(afterRenderV1952, 260);
    setTimeout(afterRenderV1952, 850);
  }));
  afterRenderV1952();
  setTimeout(afterRenderV1952, 350);
  setTimeout(afterRenderV1952, 1200);
})();

;/* ===== END legacy-inline-26-v1952-tooltip-excel-fix-script.js ===== */


;/* ===== BEGIN legacy-inline-27-v196-tooltip-behavior-script.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #27. */
/* ==== V19.6: comportamiento de Por tienda y Ticket aplicado a todos los globos ==== */
(function(){
  const VERSION = 'ControlEvent v28.10';
  const VERSION_FILE = 'ControlEvent_v28_10';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const normUp = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const moneyRe = /(?:\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)(?:\s|&nbsp;|\u00a0)*(?:€|EUR)|(?:€|EUR)(?:\s|&nbsp;|\u00a0)*(?:\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)/i;
  let activeOwner = null;
  let insideTip = false;
  let closeTimer = null;

  function sortKey(line){
    let s = String(line || '').replace(/^\s*•\s*/, '').trim();
    s = s.replace(/^(DONANTE|SOCIO|NO SOCIO|PERSONA|NOMBRE|PRODUCTO|TIENDA)\s*:\s*/i,'');
    s = s.split(/\s+[—-]\s+|\s*\|\s*|\s*:\s*/)[0] || s;
    return normUp(s);
  }
  function isRecordLine(line){
    const s = String(line || '').trim();
    return /^•\s*/.test(s) || /\s[—-]\s/.test(s) || /\|/.test(s);
  }
  function sortTipText(raw){
    const lines = String(raw || '').replace(/\r\n/g,'\n').split('\n');
    const out = [];
    for(let i=0;i<lines.length;){
      if(isRecordLine(lines[i])){
        const block = [];
        while(i<lines.length && isRecordLine(lines[i])) block.push(lines[i++]);
        block.sort((a,b)=>sortKey(a).localeCompare(sortKey(b),'es'));
        out.push(...block);
      }else{
        out.push(lines[i++]);
      }
    }
    return out.join('\n');
  }
  function rawTip(el){
    if(!el) return '';
    return el.getAttribute('data-ce-tip-v196') || el.getAttribute('data-ce-tip-v1952') || el.getAttribute('data-ce-tip') || el.getAttribute('data-v181-tip') || el.getAttribute('data-tip') || el.getAttribute('title') || '';
  }
  function splitRecord(line){
    return String(line || '').replace(/^\s*•\s*/,'').split(/\s+[—-]\s+|\s*\|\s*/).map(x=>x.trim()).filter(Boolean);
  }
  function boldFinalMoney(html){
    if(!moneyRe.test(html)) return html;
    moneyRe.lastIndex = 0;
    const matches = [...String(html).matchAll(moneyRe)];
    if(!matches.length) return html;
    const last = matches[matches.length - 1];
    const start = last.index;
    const end = start + last[0].length;
    return html.slice(0,start) + '<strong>' + html.slice(start,end) + '</strong>' + html.slice(end);
  }
  function cellHtml(text, idx, total){
    let h = esc(text);
    if(idx === 0) return '<strong>' + h + '</strong>';
    if(idx === total - 1 && moneyRe.test(text)) return boldFinalMoney(h);
    moneyRe.lastIndex = 0;
    if(/\b(TOTAL|IMPORTE FINAL|VALOR TOTAL|SALDO FINAL)\b/i.test(text) && moneyRe.test(text)) return boldFinalMoney(h);
    return h;
  }
  function renderRecordTable(lines){
    const rows = lines.map(line => splitRecord(line));
    const max = Math.max(1, ...rows.map(r => r.length));
    return '<table class="ce-tip-table"><tbody>' + rows.map(cells => {
      const padded = [...cells];
      while(padded.length < max) padded.push('');
      return '<tr>' + padded.map((c,idx)=>'<td>' + cellHtml(c, idx, cells.length) + '</td>').join('') + '</tr>';
    }).join('') + '</tbody></table>';
  }
  function tipHtml(raw){
    const lines = sortTipText(raw).split('\n');
    const parts = [];
    for(let i=0;i<lines.length;){
      const line = lines[i];
      if(!line.trim()){ parts.push('<div class="ce-tip-blank"></div>'); i++; continue; }
      if(isRecordLine(line)){
        const block = [];
        while(i<lines.length && isRecordLine(lines[i])) block.push(lines[i++]);
        parts.push(renderRecordTable(block));
        continue;
      }
      const h = esc(line);
      if(/\b(TOTAL|SOCIOS|NO SOCIOS|DONACI[ÓO]N|INGRESOS|COMPRADO|PENDIENTE|DONADO|TICKET|PERSONAS|PRODUCTOS)\b/i.test(line)) parts.push('<div class="ce-tip-title">' + boldFinalMoney(h) + '</div>');
      else parts.push('<div class="ce-tip-text">' + boldFinalMoney(h) + '</div>');
      i++;
    }
    return parts.join('');
  }
  function ensureTip(){
    let tip = $('ceTooltipV196');
    if(!tip){
      tip = document.createElement('div');
      tip.id = 'ceTooltipV196';
      document.body.appendChild(tip);
      tip.addEventListener('mouseenter', () => { insideTip = true; cancelClose(); }, true);
      tip.addEventListener('mouseleave', ev => {
        insideTip = false;
        if(activeOwner && ev.relatedTarget && activeOwner.contains && activeOwner.contains(ev.relatedTarget)) return;
        scheduleClose(170);
      }, true);
      ['pointerdown','click','mousemove','pointermove','wheel','touchstart'].forEach(evt => {
        tip.addEventListener(evt, ev => {
          insideTip = true;
          cancelClose();
          ev.stopPropagation();
        }, {capture:true, passive:true});
      });
    }
    return tip;
  }
  function cancelClose(){
    if(closeTimer){ clearTimeout(closeTimer); closeTimer = null; }
  }
  function closeTip(){
    cancelClose();
    detachOwner();
    insideTip = false;
    activeOwner = null;
    const tip = $('ceTooltipV196');
    if(tip) tip.style.display = 'none';
  }
  function scheduleClose(delay=260){
    cancelClose();
    closeTimer = setTimeout(() => {
      const tip = $('ceTooltipV196');
      if(insideTip || (tip && tip.matches(':hover')) || (activeOwner && activeOwner.matches && activeOwner.matches(':hover'))) return;
      closeTip();
    }, delay);
  }
  function ownerOf(el){
    return el?.closest?.('.metric,.summary-card,.summary-item,.budget-row,.budget-subrow,.chart-track,.chart-seg,.vbars-card,.vbar-col,.chart-stat,.itemcard,.budget-panel,.ticket-row,.ticket-line') || el;
  }
  function detachOwner(){
    if(activeOwner && activeOwner.__ceLeave196){
      activeOwner.removeEventListener('mouseleave', activeOwner.__ceLeave196, true);
      activeOwner.__ceLeave196 = null;
    }
  }
  function attachOwner(owner){
    detachOwner();
    activeOwner = owner;
    if(!owner) return;
    owner.__ceLeave196 = ev => {
      const tip = $('ceTooltipV196');
      if(tip && ev.relatedTarget && (ev.relatedTarget === tip || tip.contains(ev.relatedTarget))) return;
      scheduleClose(360);
    };
    owner.addEventListener('mouseleave', owner.__ceLeave196, true);
  }
  function place(tip, el){
    const margin = 12;
    tip.style.display = 'block';
    tip.style.left = '0px';
    tip.style.top = '0px';
    tip.style.width = 'max-content';
    tip.style.maxWidth = 'min(920px, calc(100vw - 32px))';
    tip.style.maxHeight = '75vh';
    tip.style.overflow = 'auto';
    const r = el.getBoundingClientRect ? el.getBoundingClientRect() : {left:20,top:20,bottom:40,width:0,height:0};
    const tr = tip.getBoundingClientRect();
    let left = r.left;
    let top = r.bottom + 8;
    if(left + tr.width > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - tr.width - margin);
    if(top + tr.height > window.innerHeight - margin) top = Math.max(margin, r.top - tr.height - 8);
    if(top < margin) top = margin;
    tip.style.left = Math.round(left) + 'px';
    tip.style.top = Math.round(top) + 'px';
  }
  function openTip(el){
    const raw = rawTip(el);
    if(!norm(raw)) return false;
    const tip = ensureTip();
    tip.innerHTML = tipHtml(raw);
    tip.style.background = el.getAttribute('data-tip-bg-v196') || el.getAttribute('data-tip-bg-v1952') || el.getAttribute('data-tip-bg') || '#ffffff';
    tip.style.color = '#111827';
    tip.scrollTop = 0;
    attachOwner(ownerOf(el));
    insideTip = false;
    place(tip, el);
    return true;
  }
  function setTip(el, text, bg){
    if(!el || !norm(text)) return;
    el.setAttribute('data-ce-tip-v196', sortTipText(text));
    el.setAttribute('data-tip-bg-v196', bg || el.getAttribute('data-tip-bg-v1952') || el.getAttribute('data-tip-bg') || '#ffffff');
    el.removeAttribute('data-ce-tip-v1952');
    el.removeAttribute('data-ce-tip');
    el.removeAttribute('data-v181-tip');
    el.removeAttribute('data-tip');
    el.removeAttribute('title');
  }
  function adoptTips(){
    document.querySelectorAll('[data-ce-tip-v196],[data-ce-tip-v1952],[data-ce-tip],[data-v181-tip],[data-tip],[title]').forEach(el => {
      if(el.closest?.('#authOverlay')) return;
      if(el.id === 'btnExportExcel') return;
      const raw = rawTip(el);
      if(!norm(raw)) return;
      const bg = el.getAttribute('data-tip-bg-v196') || el.getAttribute('data-tip-bg-v1952') || el.getAttribute('data-tip-bg') || (el.classList?.contains('chart-seg') || el.classList?.contains('vbar-stick') ? getComputedStyle(el).backgroundColor : '#ffffff');
      setTip(el, raw, bg);
    });
    const old1 = $('ceTooltipV1952'); if(old1) old1.style.display = 'none';
    const old2 = $('ceTooltipV190'); if(old2) old2.style.display = 'none';
    const old3 = $('ceTooltipV181'); if(old3) old3.style.display = 'none';
  }
  function refreshVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span, .appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION;
    });
  }
  function normalizeDownloadName(name){
    return String(name || '').replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE);
  }
  if(!HTMLAnchorElement.prototype.click.__v196Wrapped){
    const prev = HTMLAnchorElement.prototype.click;
    const wrapped = function(){
      try{ if(this.download) this.download = normalizeDownloadName(this.download); }catch(_){ }
      return prev.apply(this, arguments);
    };
    wrapped.__v196Wrapped = true;
    HTMLAnchorElement.prototype.click = wrapped;
  }
  function afterRender(){
    refreshVersion();
    setTimeout(adoptTips, 0);
    setTimeout(adoptTips, 180);
    setTimeout(adoptTips, 520);
  }
  document.addEventListener('click', ev => {
    const tip = $('ceTooltipV196');
    if(tip && (ev.target === tip || tip.contains(ev.target))) return;
    if(ev.target.closest?.('.ticket-actions, .ce-photo-btn-v202')) return;
    const el = ev.target.closest?.('[data-ce-tip-v196]');
    if(!el){ closeTip(); return; }
    if(openTip(el)){
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
    }
  }, true);
  document.addEventListener('keydown', ev => { if(ev.key === 'Escape') closeTip(); }, true);
  window.addEventListener('resize', () => closeTip(), true);
  window.addEventListener('scroll', ev => {
    const tip = $('ceTooltipV196');
    if(tip && ev.target && (ev.target === tip || tip.contains(ev.target))) return;
    closeTip();
  }, true);
  const prevRender = typeof render === 'function' ? render : null;
  if(prevRender && !prevRender.__v196Wrapped){
    const wrappedRender = function(){
      const ret = prevRender.apply(this, arguments);
      setTimeout(afterRender, 60);
      setTimeout(afterRender, 300);
      setTimeout(afterRender, 800);
      return ret;
    };
    wrappedRender.__v196Wrapped = true;
    render = wrappedRender;
    window.render = render;
  }
  ['DOMContentLoaded','load'].forEach(evt => window.addEventListener(evt, () => {
    setTimeout(afterRender, 60);
    setTimeout(afterRender, 320);
    setTimeout(afterRender, 900);
  }));
  afterRender();
  setTimeout(afterRender, 450);
  setTimeout(afterRender, 1400);
})();

;/* ===== END legacy-inline-27-v196-tooltip-behavior-script.js ===== */


;/* ===== BEGIN legacy-inline-28-v200-tooltip-format-delete-maint-script.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #28. */
/* ==== V20.0: formato de globos, mantenimiento robusto y avisos en eliminar ==== */
(function(){
  const VERSION = 'ControlEvent v28.10';
  const VERSION_FILE = 'ControlEvent_v28_10';
  const BLOCK_MSG = 'No autorizado. Tiene dependencias';
  const OK_MSG = 'Se puede eliminar. No hay dependencias';
  const DELETE_BLOCK_MSG = 'No se pueden eliminar datos sin previamente eliminar sus dependencia';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const normUp = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const fmtMoney = v => {
    try{ return (typeof money === 'function') ? money(Number(v||0)) : new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0)); }
    catch(_){ return String(v ?? ''); }
  };
  const fmtNum = v => {
    try{ return new Intl.NumberFormat('es-ES',{minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(v||0)); }
    catch(_){ return String(v ?? ''); }
  };
  function st(){ try{ if(typeof state !== 'undefined') return state; }catch(_){ } return window.state || {}; }
  function selectedId(){ try{ return String((typeof selectedEvent === 'function' ? selectedEvent()?.id : '') || st().selectedEventId || ''); }catch(_){ return String(st().selectedEventId || ''); } }
  function compras(){
    try{ if(typeof comprasForEvent === 'function') return comprasForEvent() || []; }catch(_){ }
    const eid = selectedId(); return (st().compras || []).filter(c => String(c.eventId || '') === eid);
  }
  function byId(list, id){ return (st()[list] || []).find(x => String(x.id) === String(id)) || {}; }
  function productObj(id){ try{ const p = (typeof productoById === 'function') ? productoById(id) : null; if(p) return p; }catch(_){ } return byId('productos', id); }
  function storeObj(id){ try{ const t = (typeof tiendaById === 'function') ? tiendaById(id) : null; if(t) return t; }catch(_){ } return byId('tiendas', id); }
  function personObj(id){ try{ const p = (typeof personaById === 'function') ? personaById(id) : null; if(p) return p; }catch(_){ } return byId('personas', id); }
  function prodName(c){ return c?.producto?.nombre || productObj(c?.productoId).nombre || 'Producto'; }
  function storeName(c){
    const p = productObj(c?.productoId);
    return c?.tienda?.nombre || storeObj(c?.tiendaId || p.tiendaId || p.defaultTiendaId).nombre || 'Sin tienda';
  }
  function donorName(c){
    try{ if(typeof donorLabel === 'function' && c?.donorRef){ const d = donorLabel(c.donorRef); if(norm(d)) return d; } }catch(_){ }
    const raw = norm(c?.donorRef || c?.donante || c?.donanteNombre || '');
    if(raw.startsWith('P:')) return personObj(raw.slice(2)).nombre || 'Sin donante';
    if(raw.startsWith('T:')) return storeObj(raw.slice(2)).nombre || 'Sin donante';
    return raw || c?.donorLabel || c?.tienda?.nombre || 'Sin donante';
  }
  function isDon(v){ try{ if(typeof isDonationTicket === 'function') return isDonationTicket(v); }catch(_){ } return normUp(v).startsWith('DONADO'); }
  function isCurrent(v){ try{ if(typeof isCurrentExpenseTicket === 'function') return isCurrentExpenseTicket(v); }catch(_){ } return normUp(v) === 'GASTOS CORRIENTES'; }
  function ticket(c){ return norm(c?.ticketDonacion || ''); }
  function unitPrice(c){
    const p = productObj(c?.productoId);
    return Number(c?.precio != null ? c.precio : (c?.precioCalc != null ? c.precioCalc : (p.defaultPrecio ?? p.precio ?? 0)));
  }
  function value(c){ return Number(c?.valor != null ? c.valor : (unitPrice(c) * Number(c?.unidades || 0))); }
  function cmp(a,b){ return normUp(a).localeCompare(normUp(b),'es'); }
  function qtyPriceTotal(c){ return `${fmtNum(c?.unidades || 0)} uds x ${fmtMoney(unitPrice(c))} = ${fmtMoney(value(c))}`; }
  function donationLine(c){ return `${donorName(c)} | ${prodName(c)} | ${qtyPriceTotal(c)}`; }
  function expenseLine(c){ return `${ticket(c) || 'PTE.COMPRA'} | ${storeName(c)} | ${prodName(c)} | ${qtyPriceTotal(c)}`; }
  function donationRows(code){
    return compras().filter(c => ticket(c) === code).slice().sort((a,b)=>cmp(donorName(a),donorName(b)) || cmp(prodName(a),prodName(b))).map(donationLine);
  }
  function expenseRows(kind){
    let filter;
    if(kind === 'ticket') filter = c => !isDon(ticket(c)) && !isCurrent(ticket(c)) && ticket(c) !== '';
    else if(kind === 'current') filter = c => isCurrent(ticket(c));
    else filter = c => !isDon(ticket(c)) && ticket(c) === '';
    return compras().filter(filter).slice().sort((a,b)=>cmp(ticket(a)||'PTE.COMPRA',ticket(b)||'PTE.COMPRA') || cmp(storeName(a),storeName(b)) || cmp(prodName(a),prodName(b))).map(expenseLine);
  }
  function rowsTotalByTicket(code){ return compras().filter(c => ticket(c) === code).reduce((a,b)=>a+value(b),0); }
  function rowsTotal(linesCode){ return rowsTotalByTicket(linesCode); }
  function setTip(el, text, bg='#ffffff', layout='default'){
    if(!el || !norm(text)) return;
    el.setAttribute('data-ce-tip-v196', text);
    el.setAttribute('data-tip-bg-v196', bg || '#ffffff');
    el.setAttribute('data-ce-tip-layout-v20', layout || 'default');
    ['data-ce-tip-v1952','data-ce-tip','data-v181-tip','data-tip','title'].forEach(a => el.removeAttribute(a));
  }
  function titleText(title,total,lines,empty='Sin registros'){
    return `${title}\nTOTAL: ${fmtMoney(total)}\n\n${lines && lines.length ? lines.join('\n') : empty}`;
  }
  let pendingLayout = 'default';
  document.addEventListener('pointerdown', ev => {
    const el = ev.target.closest?.('[data-ce-tip-layout-v20]');
    if(el) pendingLayout = el.getAttribute('data-ce-tip-layout-v20') || 'default';
  }, true);
  function applyTooltipLayout(){
    const tip = $('ceTooltipV196'); if(!tip) return;
    Array.from(tip.classList).forEach(c => { if(c.startsWith('ce-v20-layout-')) tip.classList.remove(c); });
    tip.classList.add('ce-v20-layout-' + (pendingLayout || 'default'));
    const layout = pendingLayout || 'default';
    tip.querySelectorAll('.ce-tip-table tr').forEach(tr => {
      const cells = Array.from(tr.children);
      cells.forEach(td => td.style.fontWeight = '');
      if(layout === 'expense' || layout === 'ticketpurchase'){
        if(cells[2]) cells[2].style.fontWeight = '900';
      }else if(layout === 'donation' || layout === 'budgetdonation'){
        if(cells[0]) cells[0].style.fontWeight = '900';
        if(cells[1]) cells[1].style.fontWeight = '900';
      }else if(layout === 'grouping'){
        if(cells[0]) cells[0].style.fontWeight = '900';
        if(cells[1]) cells[1].style.fontWeight = '900';
      }
      const last = cells[cells.length-1];
      if(last && /€/.test(last.textContent || '')) last.style.fontWeight = '900';
    });
  }
  const obs = new MutationObserver(() => setTimeout(applyTooltipLayout,0));
  function watchTip(){ const tip = $('ceTooltipV196'); if(tip && !tip.__v200Observed){ obs.observe(tip,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']}); tip.__v200Observed = true; } }

  function applyGraphTooltips(){
    const wrap = $('eventChartWrap'); if(!wrap) return;
    let g = null; try{ if(typeof graphPartsV171 === 'function') g = graphPartsV171(); }catch(_){ }
    if(!g) return;
    const rows = wrap.querySelectorAll('.chart-row');
    // DONACIÓN DE PRODUCTO: quitar columna de tipo DONADO y poner total destacado.
    const donationSegs = rows[1]?.querySelectorAll?.('.chart-seg') || [];
    const donationSpecs = [
      ['DONADO TIENDAS', 'DONADO TIENDA', g.donationItems?.[0]],
      ['DONADO SOCIOS', 'DONADO SOCIO', g.donationItems?.[1]],
      ['DONADO NO SOCIOS', 'DONADO OTROS', g.donationItems?.[2]]
    ];
    donationSegs.forEach((seg,i)=>{
      const [title,code,item] = donationSpecs[i] || [];
      if(!item) return;
      const lines = donationRows(code);
      setTip(seg, titleText(title, item.value || rowsTotal(code), lines), item.color || getComputedStyle(seg).backgroundColor || '#fff', 'donation');
    });
    // GASTOS: TKXX | tienda | Producto | uds x Precio = total, con tienda más ancha por CSS.
    const expenseSegs = rows[2]?.querySelectorAll?.('.chart-seg') || [];
    const expenseSpecs = [
      ['GASTADO POR TICKET', 'ticket', g.expenseItems?.[0]],
      ['GASTOS CORRIENTES', 'current', g.expenseItems?.[1]],
      ['PENDIENTE DE COMPRA', 'pending', g.expenseItems?.[2]]
    ];
    expenseSegs.forEach((seg,i)=>{
      const [title,kind,item] = expenseSpecs[i] || [];
      if(!item) return;
      const lines = expenseRows(kind);
      setTip(seg, titleText(title, item.value || 0, lines), item.color || getComputedStyle(seg).backgroundColor || '#fff', 'expense');
    });
  }

  function applyBudgetDonationTips(){
    document.querySelectorAll('#budgetLayout .budget-subrow').forEach(row => {
      const label = norm(row.querySelector('span')?.textContent || '');
      let code='', title='';
      if(/Donación de producto tiendas/i.test(label)){ code='DONADO TIENDA'; title='DONACIÓN DE PRODUCTO / TIENDAS'; }
      else if(/Donación de producto socios/i.test(label)){ code='DONADO SOCIO'; title='DONACIÓN DE PRODUCTO / SOCIOS'; }
      else if(/Donación de producto no socios/i.test(label)){ code='DONADO OTROS'; title='DONACIÓN DE PRODUCTO / NO SOCIOS'; }
      if(!code) return;
      const lines = donationRows(code);
      const total = compras().filter(c => ticket(c) === code).reduce((a,b)=>a+value(b),0);
      const text = titleText(title,total,lines);
      setTip(row,text,'#ffffff','budgetdonation');
      row.querySelectorAll('span').forEach(s => setTip(s,text,'#ffffff','budgetdonation'));
    });
  }

  function applyGroupingTips(){
    const configs = [
      ['summarySegmento', 'Por segmento', (()=>{ try{ return typeof summaryBySegmento === 'function' ? summaryBySegmento() : []; }catch(_){ return []; } })()],
      ['summaryDestino', 'Por destino', (()=>{ try{ return typeof summaryByDestino === 'function' ? summaryByDestino() : []; }catch(_){ return []; } })()]
    ];
    const specs = [
      ['Comprado', 'comprado', 'listComprado', '#dc2626'],
      ['Donado', 'donado', 'listDonado', '#f59e0b'],
      ['Pte. Compra u otros gastos', 'pendiente', 'listPendiente', '#fb7185']
    ];
    configs.forEach(([id,title,rows]) => {
      const wrap = $(id); if(!wrap) return;
      wrap.querySelectorAll('.vbars-card').forEach((card,i)=>{
        const r = rows[i] || {};
        const cols = card.querySelectorAll('.vbar-col');
        specs.forEach(([label,valKey,listKey,color],j)=>{
          const rawLines = Array.isArray(r[listKey]) ? r[listKey] : [];
          const lines = rawLines.filter(x => norm(x) && normUp(x) !== 'SIN PRODUCTOS' && !/^Sin productos/i.test(x)).map(x => String(x).replace(/\s+[—-]\s+/g,' | '));
          const total = Number(r[valKey] || 0);
          const text = `${title}\n${r.label || ''}\nTOTAL: ${fmtMoney(total)}\n\n${lines.length ? lines.join('\n') : 'Sin productos'}`;
          const col = cols[j];
          if(col) setTip(col,text,color,'grouping');
          const stick = col?.querySelector?.('.vbar-stick');
          if(stick) setTip(stick,text,color,'grouping');
        });
      });
    });
  }

  function applyTicketTips(){
    const wrap = $('summaryTiendaTicket'); if(!wrap) return;
    const purchases = new Map(), donations = new Map();
    compras().forEach(c => {
      const tk = ticket(c); if(!tk) return;
      if(isDon(tk)){
        const key = `${donorName(c)} | ${tk}`;
        if(!donations.has(key)) donations.set(key,{total:0,lines:[]});
        const rec = donations.get(key); rec.total += value(c); rec.lines.push(donationLine(c));
      }else{
        const key = `${storeName(c)} | ${tk}`;
        if(!purchases.has(key)) purchases.set(key,{total:0,lines:[]});
        const rec = purchases.get(key); rec.total += value(c); rec.lines.push(expenseLine(c));
      }
    });
    purchases.forEach(r => r.lines.sort((a,b)=>cmp(a,b)));
    donations.forEach(r => r.lines.sort((a,b)=>cmp(a,b)));
    wrap.querySelectorAll('.summary-item').forEach(item => {
      const labelEl = item.querySelector('span'); const label = norm(labelEl?.textContent || '');
      if(!label || normUp(label) === 'TOTAL') return;
      for(const [key,rec] of donations.entries()){
        if(label === key || label.startsWith(key + ' ·') || label.startsWith(key + ' -')){
          if(labelEl) labelEl.textContent = key;
          const text = titleText('DONACIÓN', rec.total, rec.lines, 'Sin productos donados');
          setTip(item,text,'#ffffff','donation'); if(labelEl) setTip(labelEl,text,'#ffffff','donation'); return;
        }
      }
      for(const [key,rec] of purchases.entries()){
        if(label === key || label.startsWith(key + ' ·') || label.startsWith(key + ' -')){
          const text = `${key}\nTOTAL: ${fmtMoney(rec.total)}\n\n${rec.lines.length ? rec.lines.join('\n') : 'Sin productos comprados'}`;
          setTip(item,text,'#ffffff','ticketpurchase'); if(labelEl) setTip(labelEl,text,'#ffffff','ticketpurchase'); return;
        }
      }
    });
  }

  function hasDependency(action,id){
    const sid = String(id || ''); if(!sid) return false;
    const s = st(); const cols = s.colaboradores || [], buys = s.compras || [], persons = s.personas || [], stores = s.tiendas || [], products = s.productos || [];
    if(action === 'delete-persona') return cols.some(c => String(c.personaId || '') === sid) || buys.some(c => String(c.responsableId || '') === sid || String(c.personaId || '') === sid || String(c.donorRef || '') === `P:${sid}` || String(c.donanteId || '') === sid);
    if(action === 'delete-producto') return buys.some(c => String(c.productoId || '') === sid);
    if(action === 'delete-tienda') return products.some(p => String(p.tiendaId || '') === sid || String(p.defaultTiendaId || '') === sid) || buys.some(c => String(c.tiendaId || '') === sid || String(c.storeId || '') === sid || String(c.donorRef || '') === `T:${sid}`);
    if(action === 'delete-evento') return cols.some(c => String(c.eventId || '') === sid) || buys.some(c => String(c.eventId || '') === sid) || persons.some(p => String(p.eventId || '') === sid) || stores.some(t => String(t.eventId || '') === sid) || products.some(p => String(p.eventId || '') === sid) || Object.keys(s.ticketImages || {}).some(k => String(k).startsWith(`${sid}|`));
    return false;
  }
  function deleteCan(action,id){ return !/^delete-(persona|producto|tienda|evento)$/.test(action) || !hasDependency(action,id); }
  function ensureDeleteTip(){ let tip = $('ceDeleteTipV200'); if(!tip){ tip = document.createElement('div'); tip.id = 'ceDeleteTipV200'; document.body.appendChild(tip); } return tip; }
  function placeDeleteTip(tip,el){
    const r = el.getBoundingClientRect(); tip.style.display='block';
    const tr = tip.getBoundingClientRect();
    let left = r.left, top = r.top - tr.height - 8;
    if(top < 8) top = r.bottom + 8;
    if(left + tr.width > innerWidth - 8) left = Math.max(8, innerWidth - tr.width - 8);
    tip.style.left = Math.round(left) + 'px'; tip.style.top = Math.round(top) + 'px';
  }
  function showDeleteTip(btn){
    const action = btn.dataset.action || ''; const ok = deleteCan(action, btn.dataset.id);
    const tip = ensureDeleteTip(); tip.textContent = ok ? OK_MSG : BLOCK_MSG;
    tip.style.borderColor = ok ? 'rgba(22,163,74,.35)' : 'rgba(220,38,38,.35)';
    tip.style.background = ok ? '#ecfdf5' : '#fef2f2';
    placeDeleteTip(tip,btn);
  }
  function hideDeleteTip(){ const tip = $('ceDeleteTipV200'); if(tip) tip.style.display='none'; }
  function markDeleteButtons(){
    document.querySelectorAll('button[data-action^="delete-"]').forEach(btn => {
      const action = btn.dataset.action || ''; const ok = deleteCan(action, btn.dataset.id);
      btn.classList.toggle('ce-delete-ok-v200', ok);
      btn.classList.toggle('ce-delete-blocked-v200', !ok);
      btn.removeAttribute('data-ce-tip-v196'); btn.removeAttribute('data-ce-tip'); btn.removeAttribute('title');
    });
  }
  document.addEventListener('mouseover', ev => { const btn = ev.target.closest?.('button[data-action^="delete-"]'); if(btn) showDeleteTip(btn); }, true);
  document.addEventListener('mousemove', ev => { const btn = ev.target.closest?.('button[data-action^="delete-"]'); if(btn){ const tip = ensureDeleteTip(); if(tip.style.display !== 'none') placeDeleteTip(tip,btn); } }, true);
  document.addEventListener('mouseout', ev => { const btn = ev.target.closest?.('button[data-action^="delete-"]'); if(btn && (!ev.relatedTarget || !btn.contains(ev.relatedTarget))) hideDeleteTip(); }, true);
  document.addEventListener('click', ev => {
    const btn = ev.target.closest?.('button[data-action^="delete-"]'); if(!btn) return;
    const action = btn.dataset.action || '';
    if(!deleteCan(action, btn.dataset.id)){
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); showDeleteTip(btn); return false;
    }
  }, true);

  function fixMaintenanceButton(){
    const btn = $('btnToggleMaintenance'); const wrap = $('maintenanceWrapper'); if(!btn || !wrap || btn.__v200MaintFixed) return;
    btn.__v200MaintFixed = true;
    btn.addEventListener('click', ev => {
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      try{
        if(typeof isLocked === 'function' && isLocked()){
          if(typeof canUnlockFinalizedEvent === 'function' && !canUnlockFinalizedEvent()) return;
          try{ currentMaintTab = 'eventos'; }catch(_){ }
          wrap.classList.remove('hidden');
          if(typeof render === 'function') render();
        }else{
          wrap.classList.toggle('hidden');
          if(typeof renderLockState === 'function') renderLockState();
        }
      }catch(err){ console.error('Error abriendo mantenimiento', err); }
    }, true);
  }

  function refreshVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span, .appname-stack span').forEach(el => { if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION; });
  }
  function normalizeDownloadName(name){ return String(name || '').replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }
  if(!HTMLAnchorElement.prototype.click.__v200Wrapped){
    const prev = HTMLAnchorElement.prototype.click;
    const wrapped = function(){ try{ if(this.download) this.download = normalizeDownloadName(this.download); }catch(_){ } return prev.apply(this, arguments); };
    wrapped.__v200Wrapped = true; HTMLAnchorElement.prototype.click = wrapped;
  }
  function wireExcel(){
    const btn = $('btnExportExcel'); if(!btn || btn.__v200ExcelFixed) return;
    btn.__v200ExcelFixed = true;
    btn.addEventListener('click', async ev => {
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      try{ const fn = (typeof exportExcel === 'function') ? exportExcel : window.exportExcel; if(!fn) throw new Error('No se encontró exportExcel'); await fn(); }
      catch(err){ console.error('Error exportando INFOEVENTO v20.0', err); alert('No se pudo descargar la INFOEVENTO. Revisa la consola.'); }
    }, true);
  }
  function applyAll(){
    refreshVersion(); watchTip(); wireExcel(); fixMaintenanceButton();
    applyGraphTooltips(); applyBudgetDonationTips(); applyGroupingTips(); applyTicketTips(); markDeleteButtons();
  }
  const prevRender = typeof render === 'function' ? render : null;
  if(prevRender && !prevRender.__v200Wrapped){
    const wrapped = function(){ const ret = prevRender.apply(this, arguments); setTimeout(applyAll,0); setTimeout(applyAll,80); setTimeout(applyAll,350); return ret; };
    wrapped.__v200Wrapped = true; render = wrapped; window.render = render;
  }
  ['DOMContentLoaded','load'].forEach(evt => window.addEventListener(evt, () => { setTimeout(applyAll,60); setTimeout(applyAll,400); setTimeout(applyAll,1000); }));
  applyAll(); setTimeout(applyAll,250); setTimeout(applyAll,900); setTimeout(applyAll,1800);
})();

;/* ===== END legacy-inline-28-v200-tooltip-format-delete-maint-script.js ===== */


;/* ===== BEGIN legacy-inline-29-v201-final-fixes-script.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #29. */
/* ==== V20.1: formato fino de globos y botones mantenimiento/carga ==== */
(function(){
  const VERSION = 'ControlEvent v28.10';
  const VERSION_FILE = 'ControlEvent_v28_10';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const normUp = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const fmtMoney = v => {
    try{ return (typeof money === 'function') ? money(Number(v||0)) : new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0)); }
    catch(_){ return String(v ?? ''); }
  };
  const fmtNum = v => {
    try{ return new Intl.NumberFormat('es-ES',{minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(v||0)); }
    catch(_){ return String(v ?? ''); }
  };
  function st(){ try{ if(typeof state !== 'undefined') return state; }catch(_){ } return window.state || {}; }
  function selectedEv(){ try{ if(typeof selectedEvent === 'function') return selectedEvent() || {}; }catch(_){ } const s=st(); return (s.eventos||[]).find(e=>String(e.id)===String(s.selectedEventId)) || {}; }
  function selectedId(){ const ev=selectedEv(); return String(ev.id || st().selectedEventId || ''); }
  function rowsForEvent(listName){ const eid=selectedId(); return (st()[listName] || []).filter(x => String(x.eventId || '') === eid); }
  function compras(){ try{ if(typeof comprasForEvent === 'function') return comprasForEvent() || []; }catch(_){ } return rowsForEvent('compras'); }
  function ingresos(){ return rowsForEvent('colaboradores'); }
  function byId(list, id){ return (st()[list] || []).find(x => String(x.id) === String(id)) || {}; }
  function personObj(id){ try{ if(typeof personaById === 'function'){ const p=personaById(id); if(p) return p; } }catch(_){ } return byId('personas', id); }
  function productObj(id){ try{ if(typeof productoById === 'function'){ const p=productoById(id); if(p) return p; } }catch(_){ } return byId('productos', id); }
  function storeObj(id){ try{ if(typeof tiendaById === 'function'){ const t=tiendaById(id); if(t) return t; } }catch(_){ } return byId('tiendas', id); }
  function personName(r){ return r?.persona?.nombre || personObj(r?.personaId).nombre || r?.nombre || 'Sin nombre'; }
  function personRange(r){ return r?.persona?.rango || personObj(r?.personaId).rango || ''; }
  function prodName(c){ return c?.producto?.nombre || productObj(c?.productoId).nombre || 'Producto'; }
  function storeName(c){ const p=productObj(c?.productoId); return c?.tienda?.nombre || storeObj(c?.tiendaId || p.tiendaId || p.defaultTiendaId).nombre || 'Sin tienda'; }
  function donorName(c){
    try{ if(typeof donorLabel === 'function' && c?.donorRef){ const d=donorLabel(c.donorRef); if(norm(d)) return d; } }catch(_){ }
    const raw = norm(c?.donorRef || c?.donante || c?.donanteNombre || '');
    if(raw.startsWith('P:')) return personObj(raw.slice(2)).nombre || 'Sin donante';
    if(raw.startsWith('T:')) return storeObj(raw.slice(2)).nombre || 'Sin donante';
    return raw || c?.donorLabel || c?.tienda?.nombre || 'Sin donante';
  }
  function ticket(c){ return norm(c?.ticketDonacion || ''); }
  function isDon(v){ try{ if(typeof isDonationTicket === 'function') return isDonationTicket(v); }catch(_){ } return normUp(v).startsWith('DONADO'); }
  function isCurrent(v){ try{ if(typeof isCurrentExpenseTicket === 'function') return isCurrentExpenseTicket(v); }catch(_){ } return normUp(v) === 'GASTOS CORRIENTES'; }
  function unitPrice(c){ const p=productObj(c?.productoId); return Number(c?.precio != null ? c.precio : (c?.precioCalc != null ? c.precioCalc : (p.defaultPrecio ?? p.precio ?? 0))); }
  function value(c){ return Number(c?.valor != null ? c.valor : (unitPrice(c) * Number(c?.unidades || 0))); }
  function cmp(a,b){ return normUp(a).localeCompare(normUp(b),'es'); }
  function qtyPriceTotal(c){ return `${fmtNum(c?.unidades || 0)} uds x ${fmtMoney(unitPrice(c))} = ${fmtMoney(value(c))}`; }
  function donationLine(c){ return `${donorName(c)} | ${prodName(c)} | ${qtyPriceTotal(c)}`; }
  function expenseLine(c){ return `${ticket(c) || 'PTE.COMPRA'} | ${storeName(c)} | ${prodName(c)} | ${qtyPriceTotal(c)}`; }
  function setTip(el, text, bg='#ffffff', layout='default'){
    if(!el || !norm(text)) return;
    el.setAttribute('data-ce-tip-v196', text);
    el.setAttribute('data-tip-bg-v196', bg || '#ffffff');
    el.setAttribute('data-ce-tip-layout-v20', layout || 'default');
    ['data-ce-tip-v1952','data-ce-tip','data-v181-tip','data-tip','title'].forEach(a => el.removeAttribute(a));
  }
  function titleText(title,total,lines,empty='Sin registros'){
    return `${title}\nTOTAL: ${fmtMoney(total)}\n\n${lines && lines.length ? lines.join('\n') : empty}`;
  }
  function donationRows(code){
    return compras().filter(c => ticket(c) === code).slice().sort((a,b)=>cmp(donorName(a),donorName(b)) || cmp(prodName(a),prodName(b))).map(donationLine);
  }
  function expenseRows(kind){
    let filter;
    if(kind === 'ticket') filter = c => !isDon(ticket(c)) && !isCurrent(ticket(c)) && ticket(c) !== '';
    else if(kind === 'current') filter = c => isCurrent(ticket(c));
    else filter = c => !isDon(ticket(c)) && ticket(c) === '';
    return compras().filter(filter).slice().sort((a,b)=>cmp(ticket(a)||'PTE.COMPRA',ticket(b)||'PTE.COMPRA') || cmp(storeName(a),storeName(b)) || cmp(prodName(a),prodName(b))).map(expenseLine);
  }
  function eventPrice(){ return Number(selectedEv()?.precio || 0); }
  function incomeTotal(r){ return Number(r.total || (Number(r.numero || 0) * eventPrice() + Number(r.importe || 0)) || 0); }
  function incomeLine(r){
    const n = Number(r.numero || 0);
    const socio = normUp(personRange(r)) === 'SOCIO' ? Number(r.base != null ? r.base : (n * eventPrice())) : 0;
    const voluntario = Number(r.donation != null ? r.donation : (r.importe || 0));
    return `${personName(r)} | Nº ${fmtNum(n)} | Socio ${fmtMoney(socio)} | Voluntario ${fmtMoney(voluntario)} | Total ${fmtMoney(incomeTotal(r))}`;
  }
  function incomeRowsFor(label){
    const l = normUp(label);
    const socio = l.includes('SOCIOS') && !l.includes('NO SOCIOS');
    const noSocio = l.includes('NO SOCIOS');
    const pending = l.includes('PENDIENTE');
    let method = '';
    if(l.includes('BANCO')) method='BANCO'; else if(l.includes('BIZUM')) method='BIZUM'; else if(l.includes('EFECTIVO')) method='EFECTIVO';
    return ingresos().filter(r => {
      const rango = normUp(personRange(r));
      const sit = normUp(r.situacion || '');
      if(pending) return sit === 'PENDIENTE';
      if(method && sit !== method) return false;
      if(socio) return rango === 'SOCIO';
      if(noSocio) return rango !== 'SOCIO';
      return true;
    }).slice().sort((a,b)=>cmp(personName(a),personName(b))).map(incomeLine);
  }
  function applyGraphTipsV201(){
    const wrap = $('eventChartWrap'); if(!wrap) return;
    let g = null; try{ if(typeof graphPartsV171 === 'function') g = graphPartsV171(); }catch(_){ }
    if(!g) return;
    const rows = wrap.querySelectorAll('.chart-row');
    const incomeSegs = rows[0]?.querySelectorAll?.('.chart-seg') || [];
    incomeSegs.forEach((seg,i)=>{
      const item = g.incomeItems?.[i]; if(!item) return;
      const lines = incomeRowsFor(item.label || '');
      setTip(seg, titleText(item.label || 'INGRESOS', item.value || 0, lines), item.color || getComputedStyle(seg).backgroundColor || '#fff', 'incomev201');
    });
    const donationSegs = rows[1]?.querySelectorAll?.('.chart-seg') || [];
    const donationSpecs = [
      ['Donado por tiendas', 'DONADO TIENDA', g.donationItems?.[0]],
      ['Donado por socios', 'DONADO SOCIO', g.donationItems?.[1]],
      ['Donado por no socios', 'DONADO OTROS', g.donationItems?.[2]]
    ];
    donationSegs.forEach((seg,i)=>{
      const [title,code,item] = donationSpecs[i] || []; if(!item) return;
      const lines = donationRows(code);
      const total = compras().filter(c => ticket(c) === code).reduce((a,b)=>a+value(b),0);
      setTip(seg, titleText(title, item.value || total, lines), item.color || getComputedStyle(seg).backgroundColor || '#fff', 'donationv201');
    });
    const expenseSegs = rows[2]?.querySelectorAll?.('.chart-seg') || [];
    const expenseSpecs = [
      ['Gastado por ticket', 'ticket', g.expenseItems?.[0]],
      ['Gastos corrientes', 'current', g.expenseItems?.[1]],
      ['Pendiente de compra', 'pending', g.expenseItems?.[2]]
    ];
    expenseSegs.forEach((seg,i)=>{
      const [title,kind,item] = expenseSpecs[i] || []; if(!item) return;
      setTip(seg, titleText(title, item.value || 0, expenseRows(kind)), item.color || getComputedStyle(seg).backgroundColor || '#fff', 'expensev201');
    });
  }
  function applyBudgetDonationTipsV201(){
    document.querySelectorAll('#budgetLayout .budget-subrow').forEach(row => {
      const label = norm(row.querySelector('span')?.textContent || '');
      let code='', title='';
      if(/Donación de producto tiendas/i.test(label)){ code='DONADO TIENDA'; title='DONACIÓN DE PRODUCTO / TIENDAS'; }
      else if(/Donación de producto socios/i.test(label)){ code='DONADO SOCIO'; title='DONACIÓN DE PRODUCTO / SOCIOS'; }
      else if(/Donación de producto no socios/i.test(label)){ code='DONADO OTROS'; title='DONACIÓN DE PRODUCTO / NO SOCIOS'; }
      if(!code) return;
      const lines = donationRows(code);
      const total = compras().filter(c => ticket(c) === code).reduce((a,b)=>a+value(b),0);
      const text = titleText(title,total,lines);
      setTip(row,text,'#ffffff','budgetdonationv201');
      row.querySelectorAll('span').forEach(s => setTip(s,text,'#ffffff','budgetdonationv201'));
    });
  }
  function applyGroupingTipsV201(){
    const configs = [
      ['summarySegmento', 'Por segmento', (() => { try{ return typeof summaryBySegmento === 'function' ? summaryBySegmento() : []; }catch(_){ return []; } })()],
      ['summaryDestino', 'Por destino', (() => { try{ return typeof summaryByDestino === 'function' ? summaryByDestino() : []; }catch(_){ return []; } })()]
    ];
    const specs = [
      ['Comprado', 'comprado', 'listComprado', '#dc2626'],
      ['Donado', 'donado', 'listDonado', '#f59e0b'],
      ['Pte. Compra u otros gastos', 'pendiente', 'listPendiente', '#fb7185']
    ];
    configs.forEach(([id,title,rows]) => {
      const wrap = $(id); if(!wrap) return;
      wrap.querySelectorAll('.vbars-card').forEach((card,i)=>{
        const r = rows[i] || {};
        const cols = card.querySelectorAll('.vbar-col');
        specs.forEach(([label,valKey,listKey,color],j)=>{
          const lines = (Array.isArray(r[listKey]) ? r[listKey] : []).filter(x => norm(x) && !/^Sin productos/i.test(x)).map(x => String(x).replace(/\s+[—-]\s+/g,' | '));
          const total = Number(r[valKey] || 0);
          const text = `${title}\n${r.label || ''}\n${label}\nTOTAL: ${fmtMoney(total)}\n\n${lines.length ? lines.join('\n') : 'Sin productos'}`;
          const col = cols[j];
          if(col) setTip(col,text,color,'groupingv201');
          const stick = col?.querySelector?.('.vbar-stick');
          if(stick) setTip(stick,text,color,'groupingv201');
        });
      });
    });
  }
  function applyTicketTipsV201(){
    const wrap = $('summaryTiendaTicket'); if(!wrap) return;
    const purchases = new Map(), donations = new Map();
    compras().forEach(c => {
      const tk = ticket(c); if(!tk) return;
      if(isDon(tk)){
        const key = `${donorName(c)} | ${tk}`;
        if(!donations.has(key)) donations.set(key,{total:0,lines:[]});
        const rec = donations.get(key); rec.total += value(c); rec.lines.push(donationLine(c));
      }else{
        const key = `${storeName(c)} | ${tk}`;
        if(!purchases.has(key)) purchases.set(key,{total:0,lines:[]});
        const rec = purchases.get(key); rec.total += value(c); rec.lines.push(expenseLine(c));
      }
    });
    purchases.forEach(r => r.lines.sort((a,b)=>cmp(a,b)));
    donations.forEach(r => r.lines.sort((a,b)=>cmp(a,b)));
    wrap.querySelectorAll('.summary-item').forEach(item => {
      const labelEl = item.querySelector('span'); const label = norm(labelEl?.textContent || '');
      if(!label || normUp(label) === 'TOTAL') return;
      for(const [key,rec] of donations.entries()){
        if(label === key || label.startsWith(key + ' ·') || label.startsWith(key + ' -')){
          if(labelEl) labelEl.textContent = key;
          const text = titleText('DONACIÓN', rec.total, rec.lines, 'Sin productos donados');
          setTip(item,text,'#ffffff','donationv201'); if(labelEl) setTip(labelEl,text,'#ffffff','donationv201'); return;
        }
      }
      for(const [key,rec] of purchases.entries()){
        if(label === key || label.startsWith(key + ' ·') || label.startsWith(key + ' -')){
          const text = `${key}\nTOTAL: ${fmtMoney(rec.total)}\n\n${rec.lines.length ? rec.lines.join('\n') : 'Sin productos comprados'}`;
          setTip(item,text,'#ffffff','ticketpurchasev201'); if(labelEl) setTip(labelEl,text,'#ffffff','ticketpurchasev201'); return;
        }
      }
    });
  }
  function refreshVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span, .appname-stack span').forEach(el => { if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION; });
  }
  function normalizeDownloadNames(){
    const prev = HTMLAnchorElement.prototype.click;
    if(prev.__v201Wrapped) return;
    const wrapped = function(){ try{ if(this.download) this.download = String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }catch(_){ } return prev.apply(this, arguments); };
    wrapped.__v201Wrapped = true;
    HTMLAnchorElement.prototype.click = wrapped;
  }
  function openMaintenanceGeneral(){
    const wrap = $('maintenanceWrapper');
    if(!wrap) return;
    const isVisible = !wrap.classList.contains('hidden');
    const isGeneral = String(typeof currentMaintTab !== 'undefined' ? currentMaintTab : '') !== 'importar';
    if(isVisible && isGeneral){
      wrap.classList.add('hidden');
      const btn = $('btnToggleMaintenance');
      if(btn){ btn.classList.remove('maint-btn-open'); btn.classList.add('maint-btn-closed'); }
      try{ renderLockState(); }catch(_){ }
      return;
    }
    try{ currentMaintTab = 'personas'; }catch(_){ }
    wrap.classList.remove('hidden');
    try{ renderMaintenance(); }catch(_){ }
    try{ renderMaintenanceTabs(); }catch(_){ }
    try{ renderLockState(); }catch(_){ }
    const btn = $('btnToggleMaintenance');
    if(btn){ btn.classList.add('maint-btn-open'); btn.classList.remove('maint-btn-closed'); }
  }
  function openImportAndChooseFile(){
    try{ currentMaintTab = 'importar'; }catch(_){ }
    const wrap = $('maintenanceWrapper'); if(wrap) wrap.classList.remove('hidden');
    try{ renderMaintenance(); }catch(_){ }
    try{ renderMaintenanceTabs(); }catch(_){ }
    try{ renderLockState(); }catch(_){ }
    const btn = $('btnToggleMaintenance');
    if(btn){ btn.classList.add('maint-btn-open'); btn.classList.remove('maint-btn-closed'); }
    // v21.0: NO abrir automáticamente el selector de archivo.
    // El usuario debe pulsar manualmente en el input Archivo Excel tras elegir REPLACE/RESUME.
  }
  window.addEventListener('click', ev => {
    const btn = ev.target && ev.target.closest ? ev.target.closest('button') : null;
    if(!btn) return;
    if(btn.id === 'btnToggleMaintenance'){
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      openMaintenanceGeneral(); return false;
    }
    if(btn.id === 'btnOpenImport'){
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      openImportAndChooseFile(); return false;
    }
  }, true);
  function applyAllV201(){
    refreshVersion(); normalizeDownloadNames();
    applyGraphTipsV201(); applyBudgetDonationTipsV201(); applyGroupingTipsV201(); applyTicketTipsV201();
  }
  const prevRender = typeof render === 'function' ? render : null;
  if(prevRender && !prevRender.__v201Wrapped){
    const wrapped = function(){ const ret = prevRender.apply(this, arguments); setTimeout(applyAllV201,120); setTimeout(applyAllV201,520); return ret; };
    wrapped.__v201Wrapped = true; render = wrapped; window.render = render;
  }
  ['DOMContentLoaded','load'].forEach(evt => window.addEventListener(evt, () => { setTimeout(applyAllV201,180); setTimeout(applyAllV201,700); setTimeout(applyAllV201,1400); }));
  applyAllV201(); setTimeout(applyAllV201,300); setTimeout(applyAllV201,900); setTimeout(applyAllV201,1800);
})();

;/* ===== END legacy-inline-29-v201-final-fixes-script.js ===== */


;/* ===== BEGIN legacy-inline-30-v202-final-fixes-script.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #30. */
/* ==== V20.2: toggle mantenimiento, carga sin selector automático, globos y fotos ==== */
(function(){
  const VERSION = 'ControlEvent v28.10';
  const VERSION_FILE = 'ControlEvent_v28_10';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const normUp = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc = v => (typeof escapeHtml === 'function') ? escapeHtml(v) : String(v ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  const moneyFmt = v => { try{ return (typeof money === 'function') ? money(Number(v||0)) : new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0)); }catch(_){ return Number(v||0).toFixed(2)+' €'; } };
  const numFmt = v => { try{ return new Intl.NumberFormat('es-ES',{minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(v||0)); }catch(_){ return String(v ?? ''); } };
  function st(){ try{ if(typeof state !== 'undefined') return state; }catch(_){ } return window.state || {}; }
  function evId(){ try{ const ev = (typeof selectedEvent === 'function') ? selectedEvent() : null; return String(ev?.id || st().selectedEventId || ''); }catch(_){ return String(st().selectedEventId || ''); } }
  function compras(){ try{ if(typeof comprasForEvent === 'function') return comprasForEvent() || []; }catch(_){ } const id=evId(); return (st().compras||[]).filter(c => String(c.eventId||'')===id); }
  function byId(list,id){ return (st()[list]||[]).find(x => String(x.id)===String(id)) || {}; }
  function product(id){ try{ const p = (typeof productoById === 'function') ? productoById(id) : null; if(p) return p; }catch(_){ } return byId('productos', id); }
  function tienda(id){ try{ const t = (typeof tiendaById === 'function') ? tiendaById(id) : null; if(t) return t; }catch(_){ } return byId('tiendas', id); }
  function persona(id){ try{ const p = (typeof personaById === 'function') ? personaById(id) : null; if(p) return p; }catch(_){ } return byId('personas', id); }
  function pName(c){ return c?.producto?.nombre || product(c?.productoId).nombre || 'Producto'; }
  function tName(c){ const p=product(c?.productoId); return c?.tienda?.nombre || tienda(c?.tiendaId || p.tiendaId || p.defaultTiendaId).nombre || 'Sin tienda'; }
  function donor(c){
    try{ if(typeof donorLabel === 'function' && c?.donorRef){ const d=donorLabel(c.donorRef); if(norm(d)) return d; } }catch(_){ }
    const raw = norm(c?.donorRef || c?.donante || c?.donanteNombre || '');
    if(raw.startsWith('P:')) return persona(raw.slice(2)).nombre || 'Sin donante';
    if(raw.startsWith('T:')) return tienda(raw.slice(2)).nombre || 'Sin donante';
    return raw || c?.donorLabel || c?.tienda?.nombre || 'Sin donante';
  }
  function ticket(c){ return norm(c?.ticketDonacion || ''); }
  function isDon(v){ try{ if(typeof isDonationTicket === 'function') return isDonationTicket(v); }catch(_){ } return normUp(v).startsWith('DONADO'); }
  function isCurrent(v){ try{ if(typeof isCurrentExpenseTicket === 'function') return isCurrentExpenseTicket(v); }catch(_){ } return normUp(v)==='GASTOS CORRIENTES'; }
  function price(c){ const p=product(c?.productoId); return Number(c?.precio != null ? c.precio : (c?.precioCalc != null ? c.precioCalc : (p.defaultPrecio ?? p.precio ?? 0))); }
  function value(c){ return Number(c?.valor != null ? c.valor : price(c)*Number(c?.unidades || 0)); }
  function cmp(a,b){ return normUp(a).localeCompare(normUp(b),'es'); }
  function setTip(el,text,bg='#fff',layout='default'){
    if(!el || !norm(text)) return;
    el.setAttribute('data-ce-tip-v196', text);
    el.setAttribute('data-tip-bg-v196', bg || '#fff');
    el.setAttribute('data-ce-tip-layout-v20', layout || 'default');
    ['data-ce-tip-v1952','data-ce-tip','data-v181-tip','data-tip','title'].forEach(a=>el.removeAttribute(a));
  }
  function refreshVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{ if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||'')) el.textContent = VERSION; });
  }
  function normalizeDownloads(){
    const proto = HTMLAnchorElement.prototype;
    if(proto.click.__v202Wrapped) return;
    const prev = proto.click;
    const wrapped = function(){ try{ if(this.download) this.download = String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }catch(_){ } return prev.apply(this, arguments); };
    wrapped.__v202Wrapped = true; proto.click = wrapped;
  }
  function showMaintToggle(){
    const wrap = $('maintenanceWrapper'); if(!wrap) return;
    const visible = !wrap.classList.contains('hidden');
    const tab = (()=>{ try{ return String(currentMaintTab || ''); }catch(_){ return ''; } })();
    if(visible && tab !== 'importar'){
      wrap.classList.add('hidden');
      const btn=$('btnToggleMaintenance'); if(btn){ btn.classList.remove('maint-btn-open'); btn.classList.add('maint-btn-closed'); }
      try{ renderLockState(); }catch(_){ }
      return;
    }
    try{ currentMaintTab = 'personas'; }catch(_){ }
    wrap.classList.remove('hidden');
    try{ renderMaintenance(); }catch(_){ }
    try{ renderMaintenanceTabs(); }catch(_){ }
    try{ renderLockState(); }catch(_){ }
    const btn=$('btnToggleMaintenance'); if(btn){ btn.classList.add('maint-btn-open'); btn.classList.remove('maint-btn-closed'); }
  }
  function showImportOnly(){
    try{ currentMaintTab = 'importar'; }catch(_){ }
    const wrap=$('maintenanceWrapper'); if(wrap) wrap.classList.remove('hidden');
    try{ renderMaintenance(); }catch(_){ }
    try{ renderMaintenanceTabs(); }catch(_){ }
    try{ renderLockState(); }catch(_){ }
    const btn=$('btnToggleMaintenance'); if(btn){ btn.classList.add('maint-btn-open'); btn.classList.remove('maint-btn-closed'); }
  }
  // Último interceptor: separa mantenimiento y carga, sin abrir el selector de archivo automáticamente.
  window.addEventListener('click', ev => {
    const btn = ev.target?.closest?.('button'); if(!btn) return;
    if(btn.id === 'btnToggleMaintenance'){
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); showMaintToggle(); return false;
    }
    if(btn.id === 'btnOpenImport'){
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); showImportOnly(); return false;
    }
  }, true);
  function groupingLines(label, kind){
    const key = norm(label);
    const match = c => {
      const p = product(c.productoId);
      const v = kind === 'segmento' ? (c.producto?.segmento || p.segmento || '') : (c.producto?.destino || p.destino || '');
      return String(v) === key;
    };
    const rows = compras().filter(match);
    const buy = rows.filter(c => !isDon(ticket(c)) && !isCurrent(ticket(c)) && ticket(c) !== '').sort((a,b)=>cmp(ticket(a),ticket(b))||cmp(pName(a),pName(b))).map(c => `${ticket(c)} | ${pName(c)} | ${moneyFmt(value(c))}`);
    const pending = rows.filter(c => !isDon(ticket(c)) && (ticket(c) === '' || isCurrent(ticket(c)))).sort((a,b)=>cmp(ticket(a)||'PTE.COMPRA',ticket(b)||'PTE.COMPRA')||cmp(pName(a),pName(b))).map(c => `${ticket(c) || 'PTE.COMPRA'} | ${pName(c)} | ${moneyFmt(value(c))}`);
    const donatedMap = new Map();
    rows.filter(c => isDon(ticket(c))).forEach(c => { const k=pName(c); donatedMap.set(k, (donatedMap.get(k)||0)+value(c)); });
    const donated = Array.from(donatedMap.entries()).sort((a,b)=>cmp(a[0],b[0])).map(([p,v]) => `${p} | ${moneyFmt(v)}`);
    return {buy,pending,donated, totalBuy:rows.filter(c=>!isDon(ticket(c))&&!isCurrent(ticket(c))&&ticket(c)!=='').reduce((a,b)=>a+value(b),0), totalPending:rows.filter(c=>!isDon(ticket(c))&&(ticket(c)===''||isCurrent(ticket(c)))).reduce((a,b)=>a+value(b),0), totalDonated:Array.from(donatedMap.values()).reduce((a,b)=>a+b,0)};
  }
  function applyGroupingTipsV202(){
    [['summarySegmento','Por segmento','segmento'],['summaryDestino','Por destino','destino']].forEach(([id,title,kind])=>{
      const wrap=$(id); if(!wrap) return;
      wrap.querySelectorAll('.vbars-card').forEach(card=>{
        const label = norm((card.querySelector('.vbars-title')?.textContent || '').split('·')[0]);
        const data = groupingLines(label, kind);
        const cols = card.querySelectorAll('.vbar-col');
        const specs = [
          [0,'Compra',data.buy,data.totalBuy,'#dc2626','groupingv202buy'],
          [1,'Donado',data.donated,data.totalDonated,'#f59e0b','groupingv202don'],
          [2,'Pte.Compra u otros gastos',data.pending,data.totalPending,'#fb7185','groupingv202pending']
        ];
        specs.forEach(([idx,name,lines,total,color,layout])=>{
          const text = `${title}\n${label}\n${name}\nTOTAL: ${moneyFmt(total)}\n\n${lines.length ? lines.join('\n') : 'Sin productos'}`;
          const col = cols[idx];
          if(col) setTip(col,text,color,layout);
          const stick = col?.querySelector?.('.vbar-stick'); if(stick) setTip(stick,text,color,layout);
        });
      });
    });
  }
  function imgKey(key){ const id=evId(); try{ return (typeof ticketImageStateKey === 'function') ? ticketImageStateKey(key,id) : `${id}|${key}`; }catch(_){ return `${id}|${key}`; } }
  window.uploadTicketImageV202 = function(encodedKey){
    const key = decodeURIComponent(encodedKey || '');
    const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*';
    inp.onchange = e => {
      const file = e.target.files && e.target.files[0]; if(!file) return;
      const reader = new FileReader();
      reader.onload = le => {
        const img = new Image();
        img.onload = function(){
          const maxW=1200, maxH=1200; let w=img.width, h=img.height; const ratio=Math.min(maxW/w,maxH/h,1); w=Math.round(w*ratio); h=Math.round(h*ratio);
          const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h; canvas.getContext('2d').drawImage(img,0,0,w,h);
          if(!st().ticketImages) st().ticketImages = {};
          st().ticketImages[imgKey(key)] = canvas.toDataURL('image/jpeg',0.84);
          try{ save(); }catch(_){ }
          try{ render(); }catch(_){ }
        };
        img.src = le.target.result;
      };
      reader.readAsDataURL(file);
    };
    inp.click();
  };
  window.removeTicketImageV202 = function(encodedKey){
    const key = decodeURIComponent(encodedKey || '');
    if(st().ticketImages) delete st().ticketImages[imgKey(key)];
    try{ save(); }catch(_){ }
    try{ render(); }catch(_){ }
  };
  function decoratePhotos(){
    const wrap = $('summaryTiendaTicket'); if(!wrap) return;
    wrap.querySelectorAll('.summary-item').forEach(item=>{
      const label = norm(item.querySelector('span')?.textContent || '');
      if(!label || normUp(label)==='TOTAL') return;
      let right = item.children[item.children.length-1]; if(!right) return;
      let actions = right.querySelector('.ticket-actions');
      const encoded = encodeURIComponent(label);
      const img = st().ticketImages?.[imgKey(label)] || '';
      const preview = img ? `<img class="ticket-thumb" src="${img}" alt="foto" />` : '<span class="hint">Sin imagen</span>';
      const del = img ? `<button type="button" class="outline small ce-photo-btn-v202" title="Eliminar foto" onclick="removeTicketImageV202('${encoded}'); return false;">🗑️</button>` : '';
      const html = `<span class="ticket-actions"><button type="button" class="outline small ce-photo-btn-v202" title="Insertar foto" onclick="uploadTicketImageV202('${encoded}'); return false;">📎</button>${preview}${del}</span>`;
      if(actions) actions.outerHTML = html; else right.insertAdjacentHTML('beforeend', html);
    });
  }
  function formatGraphTips(){
    // Fuerza que INGRESOS y DONACIÓN usen el layout de primera columna + total, sin poner en negrita el precio intermedio.
    document.querySelectorAll('#eventChartWrap .chart-seg[data-ce-tip-v196]').forEach(seg=>{
      const raw = seg.getAttribute('data-ce-tip-v196') || '';
      if(/DONADO|DONACI/i.test(raw)) seg.setAttribute('data-ce-tip-layout-v20','donationv201');
      if(/INGRESOS|EFECTIVO|BANCO|BIZUM|PENDIENTE/i.test(raw)) seg.setAttribute('data-ce-tip-layout-v20','incomev201');
    });
  }
  function applyAllV202(){ refreshVersion(); normalizeDownloads(); applyGroupingTipsV202(); decoratePhotos(); formatGraphTips(); }
  const prevRender = typeof render === 'function' ? render : null;
  if(prevRender && !prevRender.__v202Wrapped){
    const wrapped = function(){ const ret = prevRender.apply(this, arguments); setTimeout(applyAllV202,120); setTimeout(applyAllV202,520); return ret; };
    wrapped.__v202Wrapped = true; render = wrapped; window.render = render;
  }
  ['DOMContentLoaded','load'].forEach(evt=>window.addEventListener(evt,()=>{ setTimeout(applyAllV202,180); setTimeout(applyAllV202,700); setTimeout(applyAllV202,1400); }));
  applyAllV202(); setTimeout(applyAllV202,400); setTimeout(applyAllV202,1200);
})();

;/* ===== END legacy-inline-30-v202-final-fixes-script.js ===== */


;/* ===== BEGIN legacy-inline-31-v210-patch-script.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #31. */
/* ==== V21.0: producto duplicado permitido si cambia la tienda + globos estables ==== */
(function(){
  const VERSION='ControlEvent v28.10'; const VERSION_FILE='ControlEvent_v28_10';
  const $=id=>document.getElementById(id); const norm=v=>String(v??'').trim();
  const normUp=v=>norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function st(){try{if(typeof state!=='undefined')return state;}catch(_){} return window.state||{};}
  function selectedId(){try{return String((typeof selectedEvent==='function'?selectedEvent()?.id:'')||st().selectedEventId||'');}catch(_){return String(st().selectedEventId||'');}}
  function isDon(v){try{if(typeof isDonationTicket==='function')return isDonationTicket(v);}catch(_){} return normUp(v).startsWith('DONADO');}
  function comprasRaw(){const s=st(); const ev=selectedId(); return (s.compras||[]).filter(c=>String(c.eventId||'')===ev);}
  function findCompraSameProductStore(productId, tiendaId){const p=String(productId||''), t=String(tiendaId||''); if(!p)return null; return comprasRaw().find(c=>!isDon(c.ticketDonacion)&&String(c.productoId||'')===p&&String(c.tiendaId||'')===t)||null;}
  function setFound(el){if(!el)return; document.querySelectorAll('.found-target').forEach(x=>x.classList.remove('found-target')); el.classList.add('found-target'); try{el.scrollIntoView({behavior:'smooth',block:'center'});}catch(_){try{el.scrollIntoView();}catch(__){}} setTimeout(()=>el.classList.remove('found-target'),2600);}
  function locateCompraRow(id){let el=$('compraRow_'+id); if(el)return el; const safe=(window.CSS&&CSS.escape)?CSS.escape(String(id)):String(id).replace(/"/g,'\\"'); const sel=document.querySelector(`#comprasList select[data-action="edit-compra-producto"][data-id="${safe}"]`); return sel?.closest?.('.itemcard')||null;}
  function jumpToCompra(row){if(!row)return false; try{currentMainTab='compras'; showComprasEvent=true;}catch(_){} try{if(typeof render==='function')render();}catch(_){} setTimeout(()=>setFound(locateCompraRow(row.id)),120); return true;}
  function maybeJumpFromInputs(){const productId=$('buyProducto')?.value||''; const tiendaId=$('buyTienda')?.value||''; if(!productId)return false; const found=findCompraSameProductStore(productId,tiendaId); if(!found)return false; jumpToCompra(found); return true;}
  document.addEventListener('change',function(ev){const t=ev.target; if(!t||!['buyProducto','buyTienda'].includes(t.id))return; if(typeof isLocked==='function'&&isLocked())return; try{if(typeof updateBuyPreview==='function')updateBuyPreview();}catch(_){} if(maybeJumpFromInputs()){ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();}},true);
  window.addCompra = addCompra = function(){try{if(!selectedEvent())return;}catch(_){if(!selectedId())return;} const productId=$('buyProducto')?.value||''; if(!productId)return; const tiendaId=$('buyTienda')?.value||''; const found=findCompraSameProductStore(productId,tiendaId); if(found){jumpToCompra(found); return;} const rec={id:(typeof uid==='function'?uid():(Date.now()+'_'+Math.random().toString(36).slice(2))),eventId:selectedId(),productoId:productId,unidades:Number($('buyUnidades')?.value||0),precio:(typeof parseEuroInput==='function'?parseEuroInput($('buyPrecio')?.value||0):Number($('buyPrecio')?.value||0)),ticketDonacion:$('buyTicket')?.value||'',tiendaId:tiendaId,responsableId:$('buyResponsable')?.value||''}; if(!Array.isArray(st().compras))st().compras=[]; st().compras.push(rec); ['buyProducto','buyTienda','buyResponsable'].forEach(id=>{const el=$(id); if(el)el.value='';}); if($('buyUnidades'))$('buyUnidades').value='1.00'; if($('buyPrecio'))$('buyPrecio').value='0,00 €'; if($('buyTicket'))$('buyTicket').value=''; try{currentMainTab='compras'; showComprasEvent=true;}catch(_){} try{if(typeof render==='function')render();}catch(_){} setTimeout(()=>setFound(locateCompraRow(rec.id)),150);};
  function refreshVersion(){try{document.title=VERSION;}catch(_){} document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||''))el.textContent=VERSION;});}
  function normalizeDownloadName(){const proto=HTMLAnchorElement.prototype; if(proto.click.__v210Wrapped)return; const prev=proto.click; const wrapped=function(){try{if(this.download)this.download=String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig,VERSION_FILE);}catch(_){} return prev.apply(this,arguments);}; wrapped.__v210Wrapped=true; proto.click=wrapped;}
  function getTipSource(el){for(const a of ['data-ce-tip-v196','data-ce-tip-v1952','data-ce-tip','data-v181-tip','data-tip','title']){const v=el.getAttribute?.(a); if(norm(v))return v;} return '';}
  function adoptTips(){document.querySelectorAll('[data-ce-tip-v196],[data-ce-tip-v1952],[data-ce-tip],[data-v181-tip],[data-tip],[title]').forEach(el=>{if(el.closest?.('button[data-action^="delete-"]'))return; const raw=getTipSource(el); if(!norm(raw))return; const layout=el.getAttribute('data-ce-tip-layout-v20')||el.getAttribute('data-ce-tip-layout-v21')||'default'; const bg=el.getAttribute('data-tip-bg-v196')||el.getAttribute('data-tip-bg-v1952')||el.getAttribute('data-tip-bg')||getComputedStyle(el).backgroundColor||'#fff'; el.setAttribute('data-ce-tip-v21',raw); el.setAttribute('data-ce-tip-layout-v21',layout); el.setAttribute('data-tip-bg-v21',bg); ['data-ce-tip-v196','data-ce-tip-v1952','data-ce-tip','data-v181-tip','data-tip','title'].forEach(a=>el.removeAttribute(a));}); ['ceTooltipV190','ceTooltipV1952','ceTooltipV196'].forEach(id=>{const t=$(id); if(t)t.style.display='none';});}
  let activeOwner=null, closeTimer=null; function getTip(){let tip=$('ceTooltipV21'); if(!tip){tip=document.createElement('div');tip.id='ceTooltipV21';document.body.appendChild(tip);} return tip;}
  function sortTipText(text){const lines=String(text||'').split('\n'); const out=[],block=[]; const flush=()=>{if(block.length){block.sort((a,b)=>normUp(a).localeCompare(normUp(b),'es')); out.push(...block.splice(0));}}; lines.forEach(line=>{if(!line.trim()||/^(TOTAL|INGRESOS|DONACI|COMPRADO|DONADO|PENDIENTE|PTE|GAST|POR |SOCIOS|NO SOCIOS|PERSONAS|PRODUCTOS|TK|TICKET)/i.test(line.trim())){flush(); out.push(line);}else block.push(line);}); flush(); return out.join('\n');}
  function renderTipHtml(text){const lines=sortTipText(text).split('\n'); const parts=[]; let table=[]; const flushTable=()=>{if(!table.length)return; parts.push('<table class="ce-v21-table"><tbody>'+table.map(cells=>'<tr>'+cells.map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table>'); table=[];}; lines.forEach(line=>{if(!line.trim()){flushTable(); parts.push('<div class="ce-v21-blank"></div>'); return;} if(line.includes('|')){table.push(line.split('|').map(s=>s.trim())); return;} flushTable(); const html=esc(line).replace(/(\d{1,3}(?:\.\d{3})*,\d{2}\s*€|\d+(?:,\d{2})?\s*€)/g,'<strong>$1</strong>'); if(/^(TOTAL|INGRESOS|DONACI|COMPRADO|DONADO|PENDIENTE|PTE|GAST|POR |SOCIOS|NO SOCIOS|PERSONAS|PRODUCTOS)/i.test(line.trim()))parts.push('<div class="ce-v21-title">'+html+'</div>'); else parts.push('<div class="ce-v21-text">'+html+'</div>');}); flushTable(); return parts.join('');}
  function placeTip(tip,owner){const r=owner.getBoundingClientRect(); tip.style.display='block'; tip.style.left='0px'; tip.style.top='0px'; const tr=tip.getBoundingClientRect(); let left=Math.min(Math.max(8,r.left),innerWidth-tr.width-8); let top=r.bottom+8; if(top+tr.height>innerHeight-8)top=Math.max(8,r.top-tr.height-8); tip.style.left=Math.round(Math.max(8,left))+'px'; tip.style.top=Math.round(Math.max(8,top))+'px';}
  function openTip(owner){const text=owner.getAttribute('data-ce-tip-v21'); if(!norm(text))return false; const tip=getTip(); activeOwner=owner; clearTimeout(closeTimer); tip.innerHTML=renderTipHtml(text); tip.style.background=owner.getAttribute('data-tip-bg-v21')||'#fff'; tip.style.color='#111827'; Array.from(tip.classList).forEach(c=>{if(c.startsWith('ce-v21-layout-'))tip.classList.remove(c);}); tip.classList.add('ce-v21-layout-'+(owner.getAttribute('data-ce-tip-layout-v21')||'default')); placeTip(tip,owner); return true;}
  function closeTip(){const tip=$('ceTooltipV21'); if(tip)tip.style.display='none'; activeOwner=null;} function scheduleClose(){clearTimeout(closeTimer); closeTimer=setTimeout(()=>{const tip=$('ceTooltipV21'); if(!tip)return; if(!tip.matches(':hover')&&!(activeOwner&&activeOwner.matches(':hover')))closeTip();},180);}
  document.addEventListener('click',function(ev){const tip=$('ceTooltipV21'); if(tip&&(ev.target===tip||tip.contains(ev.target)))return; if(ev.target.closest?.('.ticket-actions,.ce-photo-btn-v202,button[data-action^="delete-"]'))return; const el=ev.target.closest?.('[data-ce-tip-v21]'); if(!el){closeTip();return;} if(openTip(el)){ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();}},true);
  document.addEventListener('mouseover',ev=>{const el=ev.target.closest?.('[data-ce-tip-v21]'); if(el&&activeOwner===el)clearTimeout(closeTimer);},true); document.addEventListener('mouseout',ev=>{const el=ev.target.closest?.('[data-ce-tip-v21]'); if(el&&activeOwner===el)scheduleClose();},true); document.addEventListener('keydown',ev=>{if(ev.key==='Escape')closeTip();},true); window.addEventListener('resize',closeTip,true); window.addEventListener('scroll',ev=>{const tip=$('ceTooltipV21'); if(tip&&ev.target&&(ev.target===tip||tip.contains(ev.target)))return; closeTip();},true);
  function afterRender(){refreshVersion(); normalizeDownloadName(); setTimeout(adoptTips,80); setTimeout(adoptTips,340); setTimeout(adoptTips,900);} const prevRender=typeof render==='function'?render:null; if(prevRender&&!prevRender.__v210Wrapped){const wrapped=function(){const ret=prevRender.apply(this,arguments); afterRender(); return ret;}; wrapped.__v210Wrapped=true; render=wrapped; window.render=render;} ['DOMContentLoaded','load'].forEach(evt=>window.addEventListener(evt,()=>{afterRender(); setTimeout(afterRender,1200);})); afterRender(); setTimeout(afterRender,1200);
})();

;/* ===== END legacy-inline-31-v210-patch-script.js ===== */


;/* ===== BEGIN legacy-inline-32-v211-tooltip-final-script.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #32. */
/* ==== V21.1: globos finales ==== */
(function(){
  const VERSION='ControlEvent v28.10'; const VERSION_FILE='ControlEvent_v28_10';
  const $=id=>document.getElementById(id); const norm=v=>String(v??'').trim();
  const normUp=v=>norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const money=v=>{try{return (typeof window.money==='function'?window.money(Number(v||0)):new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0)));}catch(_){return Number(v||0).toFixed(2).replace('.',',')+' €';}};
  const num=v=>{try{return new Intl.NumberFormat('es-ES',{minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(v||0));}catch(_){return String(v??'');}};
  function st(){try{if(typeof state!=='undefined')return state;}catch(_){} return window.state||{};}
  function ev(){try{return (typeof selectedEvent==='function'?selectedEvent():null)||{};}catch(_){return{};}}
  function evId(){return String(ev().id||st().selectedEventId||'');}
  function arr(name){const s=st();return Array.isArray(s[name])?s[name]:[];}
  function byId(list,id){return arr(list).find(x=>String(x.id)===String(id))||{};}
  function persona(id){try{const p=typeof personaById==='function'?personaById(id):null;if(p)return p;}catch(_){} return byId('personas',id);}
  function producto(id){try{const p=typeof productoById==='function'?productoById(id):null;if(p)return p;}catch(_){} return byId('productos',id);}
  function tienda(id){try{const t=typeof tiendaById==='function'?tiendaById(id):null;if(t)return t;}catch(_){} return byId('tiendas',id);}
  function ingresos(){try{if(typeof collabsForEvent==='function')return collabsForEvent()||[];}catch(_){} const id=evId();return arr('colaboradores').filter(r=>String(r.eventId||'')===id);}
  function compras(){try{if(typeof comprasForEvent==='function')return comprasForEvent()||[];}catch(_){} const id=evId();return arr('compras').filter(r=>String(r.eventId||'')===id);}
  function pName(c){return c?.producto?.nombre||producto(c?.productoId).nombre||'Producto';}
  function tName(c){const p=producto(c?.productoId);return c?.tienda?.nombre||tienda(c?.tiendaId||p.tiendaId||p.defaultTiendaId).nombre||'Sin tienda';}
  function donor(c){try{if(typeof donorLabel==='function'&&c?.donorRef){const d=donorLabel(c.donorRef);if(norm(d))return d;}}catch(_){} const raw=norm(c?.donorRef||c?.donante||c?.donanteNombre||''); if(raw.startsWith('P:'))return persona(raw.slice(2)).nombre||'Sin donante'; if(raw.startsWith('T:'))return tienda(raw.slice(2)).nombre||'Sin donante'; return raw||c?.donorLabel||c?.tienda?.nombre||'Sin donante';}
  function ticket(c){return norm(c?.ticketDonacion||'');}
  function isDon(v){try{if(typeof isDonationTicket==='function')return isDonationTicket(v);}catch(_){} return normUp(v).startsWith('DONADO');}
  function isCurrent(v){try{if(typeof isCurrentExpenseTicket==='function')return isCurrentExpenseTicket(v);}catch(_){} return normUp(v)==='GASTOS CORRIENTES';}
  function price(c){const p=producto(c?.productoId);return Number(c?.precio!=null?c.precio:(c?.precioCalc!=null?c.precioCalc:(p.defaultPrecio??p.precio??0)));}
  function val(c){return Number(c?.valor!=null?c.valor:price(c)*Number(c?.unidades||0));}
  function cmp(a,b){return normUp(a).localeCompare(normUp(b),'es');}
  function setTip(el,text,bg='#fff',layout='default'){if(!el||!norm(text))return; el.setAttribute('data-ce-tip-v21',text); el.setAttribute('data-tip-bg-v21',bg||'#fff'); el.setAttribute('data-ce-tip-layout-v21',layout||'default'); ['data-ce-tip-v196','data-ce-tip-v1952','data-ce-tip','data-v181-tip','data-tip','title'].forEach(a=>el.removeAttribute(a));}
  function totalIngreso(r){const precio=Number(ev().precio||0); const n=Number(r.numero||0); const socio=normUp(r.persona?.rango||persona(r.personaId).rango)==='SOCIO'?Number(r.base!=null?r.base:n*precio):0; const vol=Number(r.donation!=null?r.donation:(r.importe||0)); return Number(r.total!=null?r.total:socio+vol);}
  function lineIngreso(r){const per=r.persona||persona(r.personaId)||{}; const nombre=per.nombre||r.nombre||'Sin nombre'; const precio=Number(ev().precio||0); const n=Number(r.numero||0); const esSocio=normUp(per.rango||'')==='SOCIO'; const socio=esSocio?Number(r.base!=null?r.base:n*precio):0; const vol=Number(r.donation!=null?r.donation:(r.importe||0)); const ing=normUp(r.situacion||'')==='PENDIENTE'?0:totalIngreso(r); const pte=normUp(r.situacion||'')==='PENDIENTE'?totalIngreso(r):0; return `${nombre} | ${num(n)} | ${money(socio)} | ${money(vol)} | ${money(ing)} | ${money(pte)} | ${money(totalIngreso(r))}`;}
  function applyBudgetIncomeTips(){
    const rows=ingresos(); const socios=rows.filter(r=>normUp((r.persona||persona(r.personaId)).rango||'')==='SOCIO'); const nosocios=rows.filter(r=>normUp((r.persona||persona(r.personaId)).rango||'')!=='SOCIO');
    const make=(title,baseRows,mode)=>{let list=baseRows; if(mode==='ing')list=baseRows.filter(r=>normUp(r.situacion||'')!=='PENDIENTE'); if(mode==='pte')list=baseRows.filter(r=>normUp(r.situacion||'')==='PENDIENTE'); list=list.slice().sort((a,b)=>cmp((a.persona||persona(a.personaId)).nombre,(b.persona||persona(b.personaId)).nombre)); const total=list.reduce((a,b)=>a+totalIngreso(b),0); return `${title}\nNombre | Nº | Importe socio | Importe voluntario | Ingresado | Pendiente | Total\nTOTAL: ${money(total)}\n\n${list.length?list.map(lineIngreso).join('\n'):'Sin registros'}`;};
    document.querySelectorAll('#budgetLayout .budget-subrow').forEach(row=>{const label=norm(row.querySelector('span')?.textContent||''); if(!label)return; const prev=row.closest('.budget-subrows')?.previousElementSibling?.textContent||''; const isNo=/NO\s+SOCIOS/i.test(prev); let text=''; if(label==='Personas')text=make(`${isNo?'NO SOCIOS':'SOCIOS'} / PERSONAS`,isNo?nosocios:socios,'all'); else if(/Importe socios/i.test(label))text=make('SOCIOS / IMPORTE SOCIO',socios,'all'); else if(/Ingresado socios/i.test(label))text=make('SOCIOS / INGRESADO SOCIO',socios,'ing'); else if(/Pendiente socios/i.test(label))text=make('SOCIOS / PENDIENTE SOCIO',socios,'pte'); else if(/Importe no socios|Importe donantes/i.test(label))text=make('NO SOCIOS / IMPORTE NO SOCIO',nosocios,'all'); else if(/Ingresado no socios|Ingresado donantes/i.test(label))text=make('NO SOCIOS / INGRESADO NO SOCIO',nosocios,'ing'); else if(/Pendiente no socios|Pendiente donantes/i.test(label))text=make('NO SOCIOS / PENDIENTE NO SOCIO',nosocios,'pte'); if(text){setTip(row,text,'#fff','incomev211'); row.querySelectorAll('span,strong').forEach(x=>setTip(x,text,'#fff','incomev211'));}});
  }
  function groupingData(label,kind){const rows=compras().filter(c=>{const p=producto(c.productoId); const v=kind==='segmento'?(c.producto?.segmento||p.segmento||''):(c.producto?.destino||p.destino||''); return String(v)===String(label);}); const buy=rows.filter(c=>!isDon(ticket(c))&&!isCurrent(ticket(c))&&ticket(c)!=='').sort((a,b)=>cmp(ticket(a),ticket(b))||cmp(tName(a),tName(b))||cmp(pName(a),pName(b))).map(c=>`${ticket(c)} | ${tName(c)} | ${pName(c)} | ${money(val(c))}`); const pending=rows.filter(c=>!isDon(ticket(c))&&(ticket(c)===''||isCurrent(ticket(c)))).sort((a,b)=>cmp(ticket(a)||'PTE.COMPRA',ticket(b)||'PTE.COMPRA')||cmp(tName(a),tName(b))||cmp(pName(a),pName(b))).map(c=>`${ticket(c)||'PTE.COMPRA'} | ${tName(c)} | ${pName(c)} | ${money(val(c))}`); const donated=rows.filter(c=>isDon(ticket(c))).sort((a,b)=>cmp(donor(a),donor(b))||cmp(pName(a),pName(b))).map(c=>`${donor(c)} | ${pName(c)} | ${money(val(c))}`); return {buy,pending,donated,totalBuy:rows.filter(c=>!isDon(ticket(c))&&!isCurrent(ticket(c))&&ticket(c)!=='').reduce((a,b)=>a+val(b),0),totalPending:rows.filter(c=>!isDon(ticket(c))&&(ticket(c)===''||isCurrent(ticket(c)))).reduce((a,b)=>a+val(b),0),totalDonated:rows.filter(c=>isDon(ticket(c))).reduce((a,b)=>a+val(b),0)};}
  function applyGroupingTips(){[['summarySegmento','Por segmento','segmento'],['summaryDestino','Por destino','destino']].forEach(([id,title,kind])=>{const wrap=$(id); if(!wrap)return; wrap.querySelectorAll('.vbars-card').forEach(card=>{const label=norm((card.querySelector('.vbars-title')?.textContent||'').split('·')[0]); if(!label)return; const d=groupingData(label,kind); const cols=card.querySelectorAll('.vbar-col'); [[0,'Compra',d.buy,d.totalBuy,'#dc2626','groupingv211buy'],[1,'Donado',d.donated,d.totalDonated,'#f59e0b','groupingv211don'],[2,'Pte.Compra u otros gastos',d.pending,d.totalPending,'#fb7185','groupingv211pending']].forEach(([idx,name,lines,total,bg,layout])=>{const text=`${title}\n${label}\n${name}\nTOTAL: ${money(total)}\n\n${lines.length?lines.join('\n'):'Sin productos'}`; const col=cols[idx]; if(col)setTip(col,text,bg,layout); const stick=col?.querySelector?.('.vbar-stick'); if(stick)setTip(stick,text,bg,layout);});});});}
  function closeTip(){const tip=$('ceTooltipV21'); if(tip)tip.style.display='none';}
  let hoverTimer=null; function wireCloseOnBlur(){const tip=$('ceTooltipV21'); const check=()=>{clearTimeout(hoverTimer); hoverTimer=setTimeout(()=>{const tip=$('ceTooltipV21'); if(!tip||tip.style.display==='none')return; const insideTip=tip.matches(':hover'); const insideOwner=!!document.querySelector('[data-ce-tip-v21]:hover'); if(!insideTip&&!insideOwner)closeTip();},160);}; document.addEventListener('mousemove',check,true); document.addEventListener('focusin',ev=>{const tip=$('ceTooltipV21'); if(tip&&tip.style.display!=='none'&&!tip.contains(ev.target)&&!ev.target.closest?.('[data-ce-tip-v21]'))closeTip();},true); document.addEventListener('click',ev=>{const tip=$('ceTooltipV21'); if(tip&&tip.style.display!=='none'&&!tip.contains(ev.target)&&!ev.target.closest?.('[data-ce-tip-v21]'))closeTip();},false);}
  function refreshVersion(){try{document.title=VERSION;}catch(_){} document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||''))el.textContent=VERSION;}); const proto=HTMLAnchorElement.prototype; if(!proto.click.__v211Wrapped){const prev=proto.click; const wrapped=function(){try{if(this.download)this.download=String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig,VERSION_FILE);}catch(_){} return prev.apply(this,arguments);}; wrapped.__v211Wrapped=true; proto.click=wrapped;}}
  function applyAll(){refreshVersion(); applyBudgetIncomeTips(); applyGroupingTips();}
  const prevRender=typeof render==='function'?render:null; if(prevRender&&!prevRender.__v211Wrapped){const wrapped=function(){const ret=prevRender.apply(this,arguments); setTimeout(applyAll,160); setTimeout(applyAll,520); return ret;}; wrapped.__v211Wrapped=true; render=wrapped; window.render=render;}
  ['DOMContentLoaded','load'].forEach(evt=>window.addEventListener(evt,()=>{setTimeout(applyAll,220); setTimeout(applyAll,900); setTimeout(applyAll,1600);}));
  wireCloseOnBlur(); applyAll(); setTimeout(applyAll,400); setTimeout(applyAll,1300);
})();

;/* ===== END legacy-inline-32-v211-tooltip-final-script.js ===== */


;/* ===== BEGIN legacy-inline-33-v212-final-script.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #33. */
/* ==== V21.2: separación CARGA/MANTENIMIENTO, backup y globos finales ==== */
(function(){
  const VERSION='ControlEvent v28.10';
  const VERSION_FILE='ControlEvent_v28_10';
  const $=id=>document.getElementById(id);
  const norm=v=>String(v??'').trim();
  const up=v=>norm(v).toUpperCase();
  const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const money=v=>{try{ if(typeof formatEuro==='function') return formatEuro(Number(v||0)); }catch(_){} try{ if(typeof money==='function') return money(Number(v||0)); }catch(_){} return Number(v||0).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';};
  const num=v=>Number(v||0).toLocaleString('es-ES');
  const cmp=(a,b)=>up(a).localeCompare(up(b),'es');
  function st(){try{return state||{};}catch(_){return window.state||{};}}
  function ev(){try{if(typeof currentEvent==='function') return currentEvent()||{};}catch(_){} const s=st(); return (s.eventos||[]).find(e=>String(e.id)===String(s.selectedEventId))||{};}
  function evId(){return String(ev().id||st().selectedEventId||'');}
  function arr(n){const s=st();return Array.isArray(s[n])?s[n]:[];}
  function byId(list,id){return arr(list).find(x=>String(x.id)===String(id))||{};}
  function persona(id){try{const x=typeof personaById==='function'?personaById(id):null; if(x)return x;}catch(_){} return byId('personas',id);}
  function producto(id){try{const x=typeof productoById==='function'?productoById(id):null; if(x)return x;}catch(_){} return byId('productos',id);}
  function tienda(id){try{const x=typeof tiendaById==='function'?tiendaById(id):null; if(x)return x;}catch(_){} return byId('tiendas',id);}
  function ingresos(){try{if(typeof collabsForEvent==='function')return collabsForEvent()||[];}catch(_){} const id=evId(); return arr('colaboradores').filter(r=>String(r.eventId||'')===id);}
  function compras(){try{if(typeof comprasForEvent==='function')return comprasForEvent()||[];}catch(_){} const id=evId(); return arr('compras').filter(r=>String(r.eventId||'')===id);}
  function pName(c){return c?.producto?.nombre||producto(c?.productoId).nombre||'Producto';}
  function tName(c){const p=producto(c?.productoId);return c?.tienda?.nombre||tienda(c?.tiendaId||p.tiendaId||p.defaultTiendaId).nombre||'Sin tienda';}
  function donor(c){try{if(typeof resolveDonorNameV171==='function')return resolveDonorNameV171(c)||'Sin donante';}catch(_){} try{if(typeof donorLabel==='function'&&c?.donorRef)return donorLabel(c.donorRef)||'Sin donante';}catch(_){} const raw=norm(c?.donorRef||c?.donante||c?.donanteNombre||''); if(raw.startsWith('P:'))return persona(raw.slice(2)).nombre||'Sin donante'; if(raw.startsWith('T:'))return tienda(raw.slice(2)).nombre||'Sin donante'; return raw||c?.donorLabel||'Sin donante';}
  function ticket(c){return norm(c?.ticketDonacion||'');}
  function isDon(v){try{if(typeof isDonationTicket==='function')return isDonationTicket(v);}catch(_){} return up(v).startsWith('DONADO');}
  function isCurrent(v){try{if(typeof isCurrentExpenseTicket==='function')return isCurrentExpenseTicket(v);}catch(_){} return up(v)==='GASTOS CORRIENTES';}
  function price(c){const p=producto(c?.productoId);return Number(c?.precio!=null?c.precio:(c?.precioCalc!=null?c.precioCalc:(p.defaultPrecio??p.precio??0)));}
  function val(c){return Number(c?.valor!=null?c.valor:price(c)*Number(c?.unidades||0));}
  function totalIngreso(r){const per=r.persona||persona(r.personaId)||{}; const precio=Number(ev().precio||0); const n=Number(r.numero||0); const esSocio=up(per.rango)==='SOCIO'; const socio=esSocio?Number(r.base!=null?r.base:n*precio):0; const vol=Number(r.donation!=null?r.donation:(r.importe||0)); return Number(r.total!=null?r.total:socio+vol);}
  function ingresoVals(r){const per=r.persona||persona(r.personaId)||{}; const precio=Number(ev().precio||0); const n=Number(r.numero||0); const esSocio=up(per.rango)==='SOCIO'; const socio=esSocio?Number(r.base!=null?r.base:n*precio):0; const vol=Number(r.donation!=null?r.donation:(r.importe||0)); const total=Number(r.total!=null?r.total:socio+vol); const pend=up(r.situacion)==='PENDIENTE'; return {nombre:per.nombre||r.nombre||'Sin nombre',n,socio,vol,ing:pend?0:total,pte:pend?total:0,total};}
  function setTip(el,text,bg='#fff',layout='default'){if(!el||!norm(text))return; el.setAttribute('data-ce-tip-v21',text); el.setAttribute('data-tip-bg-v21',bg||'#fff'); el.setAttribute('data-ce-tip-layout-v21',layout||'default'); ['data-ce-tip-v196','data-ce-tip-v1952','data-ce-tip','data-v181-tip','data-tip','title'].forEach(a=>el.removeAttribute(a));}

  function refreshVersion(){
    try{document.title=VERSION;}catch(_){}
    document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||''))el.textContent=VERSION;});
    const proto=HTMLAnchorElement.prototype;
    if(!proto.click.__v212Wrapped){
      const prev=proto.click;
      const wrapped=function(){try{if(this.download)this.download=normalizeDownloadName(this.download);}catch(_){} return prev.apply(this,arguments);};
      wrapped.__v212Wrapped=true; proto.click=wrapped;
    }
  }
  function sanitizeTitle(t){return norm(t||'EVENTO').replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,'_').replace(/_+/g,'_').slice(0,90)||'EVENTO';}
  function ymd(d){return d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');}
  function hms(d){return String(d.getHours()).padStart(2,'0')+'_'+String(d.getMinutes()).padStart(2,'0')+'_'+String(d.getSeconds()).padStart(2,'0');}
  function normalizeDownloadName(name){
    let n=String(name||''); const now=new Date();
    n=n.replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig,VERSION_FILE);
    n=n.replace(/^(ControlEvent_v\d+_\d+(?:_\d+)?)_BACKUP_(.+?)_(\d{2})(\d{2})(\d{4})[-_](\d{2})[:_](\d{2})[:_](\d{2})\.xlsx$/i,(_m,v,scope,dd,mm,yyyy,hh,mi,ss)=>`${VERSION_FILE}_BACKUP_${sanitizeTitle(scope)}_${yyyy}${mm}${dd}_${hh}_${mi}_${ss}.xlsx`);
    n=n.replace(/^(ControlEvent_v\d+_\d+(?:_\d+)?)_BACKUP_(.+?)_(\d{4})(\d{2})(\d{2})[-_](\d{2})[:_](\d{2})[:_](\d{2})\.xlsx$/i,(_m,v,scope,yyyy,mm,dd,hh,mi,ss)=>`${VERSION_FILE}_BACKUP_${sanitizeTitle(scope)}_${yyyy}${mm}${dd}_${hh}_${mi}_${ss}.xlsx`);
    if(/^ControlEvent_v\d+_\d+(?:_\d+)?_descarga_datos\.xlsx$/i.test(n)) n=`${VERSION_FILE}_BACKUP_TODOS_${ymd(now)}_${hms(now)}.xlsx`;
    return n;
  }
  // Como exportSeedWorkbook usa una función de nombre cerrada en otro parche, normalizamos también el título del evento del backup en el momento del click del enlace.
  function currentBackupTitleFromUI(){const sel=$('ceBackupScopeV181'); if(!sel) return ''; if(sel.value==='TODOS')return 'TODOS'; const opt=sel.options[sel.selectedIndex]; return opt?opt.textContent:'';}
  document.addEventListener('click',function(ev){const ok=ev.target?.closest?.('#ceBackupOkV181'); if(ok){const title=currentBackupTitleFromUI(); if(title) window.__ceLastBackupTitleV212=sanitizeTitle(title);}},true);
  const proto=HTMLAnchorElement.prototype;
  if(!proto.click.__v212BackupTitleWrapped){
    const prev=proto.click;
    const wrapped=function(){try{if(this.download&&/_BACKUP_/i.test(this.download)&&window.__ceLastBackupTitleV212){this.download=this.download.replace(/(_BACKUP_)(.+?)(_[0-9]{8}[-_][0-9]{2}[:_][0-9]{2}[:_][0-9]{2}\.xlsx)$/i, `$1${window.__ceLastBackupTitleV212}$3`); this.download=normalizeDownloadName(this.download);}}catch(_){} return prev.apply(this,arguments);};
    wrapped.__v212BackupTitleWrapped=true; proto.click=wrapped;
  }

  function forceImportOnly(){
    const wrap=$('maintenanceWrapper'); if(!wrap)return;
    try{currentMaintTab='importar';}catch(_){}
    wrap.classList.remove('hidden'); wrap.classList.add('ce-import-only-v212');
    ['mtPersonas','mtEventos','mtTiendas','mtProductos','mtAcceso'].forEach(id=>{const el=$(id); if(el)el.classList.add('hidden');});
    const imp=$('mtImportar'); if(imp)imp.classList.remove('hidden');
    const btn=$('btnToggleMaintenance'); if(btn){btn.classList.remove('maint-btn-open'); btn.classList.add('maint-btn-closed');}
  }
  function forceMaintenanceToggle(){
    const wrap=$('maintenanceWrapper'); if(!wrap)return;
    const visible=!wrap.classList.contains('hidden')&&!wrap.classList.contains('ce-import-only-v212');
    if(visible){wrap.classList.add('hidden'); wrap.classList.remove('ce-import-only-v212'); const b=$('btnToggleMaintenance'); if(b){b.classList.remove('maint-btn-open'); b.classList.add('maint-btn-closed');} return;}
    wrap.classList.remove('hidden','ce-import-only-v212'); try{currentMaintTab='personas';}catch(_){}
    try{renderMaintenance();}catch(_){} try{renderMaintenanceTabs();}catch(_){}
    ['mtPersonas','mtEventos','mtTiendas','mtProductos'].forEach((id,i)=>{const el=$(id); if(el)el.classList.toggle('hidden',i!==0);});
    const imp=$('mtImportar'); if(imp)imp.classList.add('hidden');
    const b=$('btnToggleMaintenance'); if(b){b.classList.add('maint-btn-open'); b.classList.remove('maint-btn-closed');}
  }
  window.addEventListener('click',function(ev){
    const btn=ev.target?.closest?.('button'); if(!btn)return;
    if(btn.id==='btnOpenImport'){ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); forceImportOnly(); return false;}
    if(btn.id==='btnToggleMaintenance'){ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); forceMaintenanceToggle(); return false;}
  },true);

  function applyBudgetIncomeTips(){
    const rows=ingresos();
    const socios=rows.filter(r=>up((r.persona||persona(r.personaId)||{}).rango)==='SOCIO');
    const nosocios=rows.filter(r=>up((r.persona||persona(r.personaId)||{}).rango)!=='SOCIO');
    const make=(title,baseRows,mode)=>{
      let list=baseRows.slice(); if(mode==='ing')list=list.filter(r=>up(r.situacion)!=='PENDIENTE'); if(mode==='pte')list=list.filter(r=>up(r.situacion)==='PENDIENTE');
      list.sort((a,b)=>cmp((a.persona||persona(a.personaId)||{}).nombre,(b.persona||persona(b.personaId)||{}).nombre));
      const total=list.reduce((a,b)=>a+totalIngreso(b),0);
      const body=list.map(r=>{const v=ingresoVals(r); return `${v.nombre} | ${num(v.n)} | ${money(v.socio)} | ${money(v.vol)} | ${money(v.ing)} | ${money(v.pte)} | ${money(v.total)}`;}).join('\n')||'Sin registros';
      return `${title}\nTOTAL: ${money(total)}\n\nNombre | Nº | Importe socio | Importe voluntario | Ingresado | Pendiente | Total\n${body}`;
    };
    document.querySelectorAll('#budgetLayout .budget-subrow').forEach(row=>{
      const label=norm(row.querySelector('span')?.textContent||''); if(!label)return; const prev=row.closest('.budget-subrows')?.previousElementSibling?.textContent||''; const isNo=/NO\s+SOCIOS/i.test(prev); let text='';
      if(label==='Personas')text=make(`${isNo?'NO SOCIOS':'SOCIOS'} / PERSONAS`,isNo?nosocios:socios,'all');
      else if(/Importe socios/i.test(label))text=make('SOCIOS / IMPORTE SOCIO',socios,'all');
      else if(/Ingresado socios/i.test(label))text=make('SOCIOS / INGRESADO SOCIO',socios,'ing');
      else if(/Pendiente socios/i.test(label))text=make('SOCIOS / PENDIENTE SOCIO',socios,'pte');
      else if(/Importe no socios|Importe donantes/i.test(label))text=make('NO SOCIOS / IMPORTE NO SOCIO',nosocios,'all');
      else if(/Ingresado no socios|Ingresado donantes/i.test(label))text=make('NO SOCIOS / INGRESADO NO SOCIO',nosocios,'ing');
      else if(/Pendiente no socios|Pendiente donantes/i.test(label))text=make('NO SOCIOS / PENDIENTE NO SOCIO',nosocios,'pte');
      if(text){setTip(row,text,'#fff','incomev212'); row.querySelectorAll('span,strong').forEach(x=>setTip(x,text,'#fff','incomev212'));}
    });
  }

  function incomeRowsFor(label){
    const l=up(label); const socio=l.includes('SOCIOS')&&!l.includes('NO SOCIOS'); const noSocio=l.includes('NO SOCIOS'); const pending=l.includes('PENDIENTE'); let method=''; if(l.includes('BANCO'))method='BANCO'; else if(l.includes('BIZUM'))method='BIZUM'; else if(l.includes('EFECTIVO'))method='EFECTIVO';
    const rows=ingresos().filter(r=>{const rango=up((r.persona||persona(r.personaId)||{}).rango); const sit=up(r.situacion||''); if(pending)return sit==='PENDIENTE'; if(method&&sit!==method)return false; if(socio)return rango==='SOCIO'; if(noSocio)return rango!=='SOCIO'; return true;}).sort((a,b)=>cmp((a.persona||persona(a.personaId)||{}).nombre,(b.persona||persona(b.personaId)||{}).nombre));
    return rows.map(r=>{const v=ingresoVals(r); return `${v.nombre} | ${num(v.n)} | ${money(v.socio)} | ${money(v.vol)} | ${money(v.total)}`;});
  }
  function donationRowsGrouped(code){
    const rows=compras().filter(c=>ticket(c)===code).sort((a,b)=>cmp(donor(a),donor(b))||cmp(pName(a),pName(b))); const out=[]; let cur=null,total=0;
    rows.forEach((c,idx)=>{const d=donor(c); if(cur!==null&&d!==cur){out.push(`TOTAL DONANTE ${cur} | | | ${money(total)}`); out.push(''); total=0;} cur=d; const u=Number(c.unidades||0), pr=price(c), v=val(c); total+=v; out.push(`${d} | ${pName(c)} | ${num(u)} uds x ${money(pr)} | ${money(v)}`); if(idx===rows.length-1){out.push(`TOTAL DONANTE ${d} | | | ${money(total)}`);}});
    return out;
  }
  function expenseRowsGrouped(kind){
    const rows=compras().filter(c=>{const tk=ticket(c); if(kind==='ticket')return !isDon(tk)&&!isCurrent(tk)&&tk!==''; if(kind==='current')return isCurrent(tk); return !isDon(tk)&&tk==='';}).sort((a,b)=>cmp(ticket(a)||'PTE.COMPRA',ticket(b)||'PTE.COMPRA')||cmp(tName(a),tName(b))||cmp(pName(a),pName(b)));
    const out=[]; let cur=null,total=0;
    rows.forEach((c,idx)=>{const tk=kind==='current'?'GASTOS CORRIENTES':(ticket(c)||'PTE.COMPRA'); if(cur!==null&&tk!==cur){out.push(`TOTAL ${cur} | | | | ${money(total)}`); out.push(''); total=0;} cur=tk; const u=Number(c.unidades||0), pr=price(c), v=val(c); total+=v; out.push(`${tk} | ${tName(c)} | ${pName(c)} | ${num(u)} uds x ${money(pr)} | ${money(v)}`); if(idx===rows.length-1){out.push(`TOTAL ${tk} | | | | ${money(total)}`);}});
    return out;
  }
  function tipTitle(title,total,lines,header){return `${title}\nTOTAL: ${money(total)}\n\n${header}\n${lines.length?lines.join('\n'):'Sin registros'}`;}
  function applyGraphTips(){
    const wrap=$('eventChartWrap'); if(!wrap)return; let g=null; try{g=typeof graphPartsV171==='function'?graphPartsV171():null;}catch(_){} if(!g)return; const rows=wrap.querySelectorAll('.chart-row');
    const incomeSegs=rows[0]?.querySelectorAll?.('.chart-seg')||[];
    incomeSegs.forEach((seg,i)=>{const item=g.incomeItems?.[i]; if(!item)return; const lines=incomeRowsFor(item.label||''); setTip(seg,tipTitle(item.label||'INGRESOS',item.value||0,lines,'Nombre | Nº | Importe socio | Importe voluntario | Total'),item.color||getComputedStyle(seg).backgroundColor||'#fff','graphincomev212');});
    const donSegs=rows[1]?.querySelectorAll?.('.chart-seg')||[]; const donSpecs=[['Donado por tiendas','DONADO TIENDA',g.donationItems?.[0]],['Donado por socios','DONADO SOCIO',g.donationItems?.[1]],['Donado por no socios','DONADO OTROS',g.donationItems?.[2]]];
    donSegs.forEach((seg,i)=>{const [title,code,item]=donSpecs[i]||[]; if(!item)return; const lines=donationRowsGrouped(code); setTip(seg,tipTitle(title,item.value||0,lines,'Donante | Producto | Uds x precio | Total'),item.color||getComputedStyle(seg).backgroundColor||'#fff','graphdonationv212');});
    const expSegs=rows[2]?.querySelectorAll?.('.chart-seg')||[]; const expSpecs=[['Gastado por ticket','ticket',g.expenseItems?.[0]],['Gastos corrientes','current',g.expenseItems?.[1]],['Pendiente de compra','pending',g.expenseItems?.[2]]];
    expSegs.forEach((seg,i)=>{const [title,kind,item]=expSpecs[i]||[]; if(!item)return; const lines=expenseRowsGrouped(kind); setTip(seg,tipTitle(title,item.value||0,lines,'Ticket | Tienda | Producto | Uds x precio | Total'),item.color||getComputedStyle(seg).backgroundColor||'#fff','graphexpensev212');});
  }
  function applyAll(){refreshVersion(); applyBudgetIncomeTips(); applyGraphTips();}
  const prevRender=typeof render==='function'?render:null;
  if(prevRender&&!prevRender.__v212Wrapped){const wrapped=function(){const ret=prevRender.apply(this,arguments); setTimeout(applyAll,180); setTimeout(applyAll,620); return ret;}; wrapped.__v212Wrapped=true; render=wrapped; window.render=render;}
  ['DOMContentLoaded','load'].forEach(evt=>window.addEventListener(evt,()=>{setTimeout(applyAll,240); setTimeout(applyAll,900); setTimeout(applyAll,1600);}));
  applyAll(); setTimeout(applyAll,450); setTimeout(applyAll,1300);
})();

;/* ===== END legacy-inline-33-v212-final-script.js ===== */


;/* ===== BEGIN legacy-inline-34-v213-final-script.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #34. */
/* ==== V21.3.1: cabeceras primero, globos reencolumnados e INFOEVENTO sin fallback; muestra error real ==== */
(function(){
  const VERSION='ControlEvent v28.10';
  const VERSION_FILE='ControlEvent_v28_10';
  const $=id=>document.getElementById(id);
  const norm=v=>String(v??'').trim();
  const up=v=>norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const clean=v=>String(v||'evento').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'').replace(/_+/g,'_')||'evento';
  const money=v=>{try{return (typeof window.money==='function'?window.money(Number(v||0)):new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0)));}catch(_){return Number(v||0).toFixed(2).replace('.',',')+' €';}};
  const num=v=>{try{return new Intl.NumberFormat('es-ES',{minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(v||0));}catch(_){return String(v??'');}};
  const cmp=(a,b)=>up(a).localeCompare(up(b),'es');
  function st(){try{if(typeof state!=='undefined')return state;}catch(_){} return window.state||{};}
  function arr(n){const s=st();return Array.isArray(s[n])?s[n]:[];}
  function ev(){try{return (typeof selectedEvent==='function'?selectedEvent():null)||{};}catch(_){return{};}}
  function evId(){return String(ev().id||st().selectedEventId||'');}
  function byId(list,id){return arr(list).find(x=>String(x.id)===String(id))||{};}
  function persona(id){try{const p=typeof personaById==='function'?personaById(id):null;if(p)return p;}catch(_){} return byId('personas',id);}
  function producto(id){try{const p=typeof productoById==='function'?productoById(id):null;if(p)return p;}catch(_){} return byId('productos',id);}
  function tienda(id){try{const t=typeof tiendaById==='function'?tiendaById(id):null;if(t)return t;}catch(_){} return byId('tiendas',id);}
  function ingresos(){try{if(typeof collabsForEvent==='function')return collabsForEvent()||[];}catch(_){} const id=evId();return arr('colaboradores').filter(r=>String(r.eventId||'')===id);}
  function compras(){try{if(typeof comprasForEvent==='function')return comprasForEvent()||[];}catch(_){} const id=evId();return arr('compras').filter(r=>String(r.eventId||'')===id);}
  function productName(c){return c?.producto?.nombre||producto(c?.productoId).nombre||'Producto';}
  function storeName(c){const p=producto(c?.productoId);return c?.tienda?.nombre||tienda(c?.tiendaId||p.tiendaId||p.defaultTiendaId).nombre||'Sin tienda';}
  function donorName(c){try{if(typeof donorLabel==='function'&&c?.donorRef){const d=donorLabel(c.donorRef);if(norm(d))return d;}}catch(_){} const raw=norm(c?.donorRef||c?.donante||c?.donanteNombre||''); if(raw.startsWith('P:'))return persona(raw.slice(2)).nombre||'Sin donante'; if(raw.startsWith('T:'))return tienda(raw.slice(2)).nombre||'Sin donante'; return raw||c?.donorLabel||c?.tienda?.nombre||'Sin donante';}
  function ticket(c){return norm(c?.ticketDonacion||'');}
  function isDon(v){try{if(typeof isDonationTicket==='function')return isDonationTicket(v);}catch(_){} return up(v).startsWith('DONADO');}
  function isCurrent(v){try{if(typeof isCurrentExpenseTicket==='function')return isCurrentExpenseTicket(v);}catch(_){} return up(v)==='GASTOS CORRIENTES';}
  function price(c){const p=producto(c?.productoId);return Number(c?.precio!=null?c.precio:(c?.precioCalc!=null?c.precioCalc:(p.defaultPrecio??p.precio??0)));}
  function value(c){return Number(c?.valor!=null?c.valor:price(c)*Number(c?.unidades||0));}
  function setTip(el,text,bg='#fff',layout='default'){
    if(!el||!norm(text))return;
    el.setAttribute('data-ce-tip-v21',text);
    el.setAttribute('data-tip-bg-v21',bg||'#fff');
    el.setAttribute('data-ce-tip-layout-v21',layout||'default');
    ['data-ce-tip-v196','data-ce-tip-v1952','data-ce-tip','data-v181-tip','data-tip','title'].forEach(a=>el.removeAttribute(a));
  }
  function totalIngreso(r){const per=r.persona||persona(r.personaId)||{}; const n=Number(r.numero||0); const socio=up(per.rango)==='SOCIO'?Number(r.base!=null?r.base:n*Number(ev().precio||0)):0; const vol=Number(r.donation!=null?r.donation:(r.importe||0)); return Number(r.total!=null?r.total:socio+vol);}
  function ingresoVals(r){const per=r.persona||persona(r.personaId)||{}; const nombre=per.nombre||r.nombre||'Sin nombre'; const n=Number(r.numero||0); const socio=up(per.rango)==='SOCIO'?Number(r.base!=null?r.base:n*Number(ev().precio||0)):0; const vol=Number(r.donation!=null?r.donation:(r.importe||0)); const total=totalIngreso(r); const pending=up(r.situacion)==='PENDIENTE'; return {nombre,n,rango:per.rango||'',socio,vol,total,ing:pending?0:total,pte:pending?total:0,situacion:r.situacion||''};}
  function ingresoLine(r,full=true){const v=ingresoVals(r); return full?`${v.nombre} | ${num(v.n)} | ${v.rango||''} | ${money(v.socio)} | ${money(v.vol)} | ${money(v.ing)} | ${money(v.pte)} | ${money(v.total)}`:`${v.nombre} | ${num(v.n)} | ${v.rango||''} | ${money(v.socio)} | ${money(v.vol)} | ${money(v.total)}`;}
  function titleWithLines(title,total,header,lines){return `${title}\n\n${header}\n${lines.length?lines.join('\n'):'Sin registros'}\n\nTOTAL: ${money(total)}`;}
  function setOnSelfAndChildren(el,text,bg,layout){if(!el)return; setTip(el,text,bg,layout); el.querySelectorAll('span,strong,.label,.value').forEach(x=>setTip(x,text,bg,layout));}
  function applySummaryIncomeTips(){
    const grid=$('ingresosSummaryGrid'); if(!grid)return;
    const base=ingresos();
    const make=(title,fn)=>{const rows=base.filter(fn).sort((a,b)=>cmp(ingresoVals(a).nombre,ingresoVals(b).nombre)); const total=rows.reduce((a,b)=>a+totalIngreso(b),0); return titleWithLines(title,total,'PERSONAS | Nº | Rango | Importe socio | Importe voluntario | Total',rows.map(r=>ingresoLine(r,false)));};
    Array.from(grid.children||[]).forEach(card=>{
      const label=up(card.querySelector('.label')?.textContent||card.textContent||''); let text='';
      if(label.includes('EFECTIVO')) text=make('RESUMEN DE INGRESOS / EFECTIVO',r=>up(r.situacion)==='EFECTIVO');
      else if(label.includes('BANCO')) text=make('RESUMEN DE INGRESOS / BANCO',r=>up(r.situacion)==='BANCO');
      else if(label.includes('BIZUM')) text=make('RESUMEN DE INGRESOS / BIZUM',r=>up(r.situacion)==='BIZUM');
      else if(label.includes('PENDIENTE')) text=make('RESUMEN DE INGRESOS / PENDIENTE',r=>up(r.situacion)==='PENDIENTE');
      else if(label.includes('TOTAL')) text=make('RESUMEN DE INGRESOS / TOTAL INGRESOS',()=>true);
      if(text) setOnSelfAndChildren(card,text,getComputedStyle(card).backgroundColor||'#fff','summaryincomev213');
    });
  }
  function applyBudgetIncomeTips(){
    const rows=ingresos(); const socios=rows.filter(r=>up((r.persona||persona(r.personaId)).rango)==='SOCIO'); const nosocios=rows.filter(r=>up((r.persona||persona(r.personaId)).rango)!=='SOCIO');
    const make=(title,baseRows,mode)=>{let list=baseRows.slice(); if(mode==='ing')list=list.filter(r=>up(r.situacion)!=='PENDIENTE'); if(mode==='pte')list=list.filter(r=>up(r.situacion)==='PENDIENTE'); list.sort((a,b)=>cmp(ingresoVals(a).nombre,ingresoVals(b).nombre)); const total=list.reduce((a,b)=>a+totalIngreso(b),0); return titleWithLines(title,total,'PERSONAS | Nº | Rango | Importe socio | Importe voluntario | Ingresado | Pendiente | Total',list.map(r=>ingresoLine(r,true)));};
    document.querySelectorAll('#budgetLayout .budget-subrow').forEach(row=>{const label=norm(row.querySelector('span')?.textContent||''); if(!label)return; const prev=row.closest('.budget-subrows')?.previousElementSibling?.textContent||''; const isNo=/NO\s+SOCIOS/i.test(prev); let text='';
      if(label==='Personas')text=make(`${isNo?'NO SOCIOS':'SOCIOS'} / PERSONAS`,isNo?nosocios:socios,'all');
      else if(/Importe socios/i.test(label))text=make('SOCIOS / IMPORTE SOCIO',socios,'all');
      else if(/Ingresado socios/i.test(label))text=make('SOCIOS / INGRESADO SOCIO',socios,'ing');
      else if(/Pendiente socios/i.test(label))text=make('SOCIOS / PENDIENTE SOCIO',socios,'pte');
      else if(/Importe no socios|Importe donantes/i.test(label))text=make('NO SOCIOS / IMPORTE NO SOCIO',nosocios,'all');
      else if(/Ingresado no socios|Ingresado donantes/i.test(label))text=make('NO SOCIOS / INGRESADO NO SOCIO',nosocios,'ing');
      else if(/Pendiente no socios|Pendiente donantes/i.test(label))text=make('NO SOCIOS / PENDIENTE NO SOCIO',nosocios,'pte');
      if(text)setOnSelfAndChildren(row,text,'#fff','budgetincomev213');
    });
  }
  function donationRows(code){return compras().filter(c=>!code||ticket(c)===code).sort((a,b)=>cmp(donorName(a),donorName(b))||cmp(productName(a),productName(b))).map(c=>`${donorName(c)} | ${productName(c)} | ${num(Number(c.unidades||0))} | ${money(price(c))} | ${money(value(c))}`);}
  function donationRowsGrouped(code){const rows=compras().filter(c=>!code||ticket(c)===code).sort((a,b)=>cmp(donorName(a),donorName(b))||cmp(productName(a),productName(b))); const out=[]; let cur=null,total=0; rows.forEach((c,i)=>{const d=donorName(c); if(cur!==null&&d!==cur){out.push(`TOTAL DONANTE ${cur} | | | | ${money(total)}`); out.push(''); total=0;} cur=d; total+=value(c); out.push(`${d} | ${productName(c)} | ${num(Number(c.unidades||0))} | ${money(price(c))} | ${money(value(c))}`); if(i===rows.length-1)out.push(`TOTAL DONANTE ${d} | | | | ${money(total)}`);}); return out;}
  function applyBudgetDonationCombinedTip(){
    const codes=['DONADO TIENDA','DONADO SOCIO','DONADO OTROS']; const rows=codes.flatMap(code=>donationRows(code)); const total=codes.reduce((a,code)=>a+compras().filter(c=>ticket(c)===code).reduce((s,c)=>s+value(c),0),0);
    const text=titleWithLines('DONACIÓN DE PRODUCTO / VALOR PRODUCTO DONADO',total,'DONANTE | Producto | Uds | Precio estimado | Valor estimado',rows);
    document.querySelectorAll('#budgetLayout .budget-row,#budgetLayout .budget-subgroup').forEach(row=>{const label=up(row.querySelector('strong')?.textContent||row.textContent||''); if(label.includes('VALOR PRODUCTO DONADO'))setOnSelfAndChildren(row,text,'#fff','budgetdonationcombinedv213');});
  }
  function applyGraphTips(){
    const wrap=$('eventChartWrap'); if(!wrap)return; let g=null; try{g=typeof graphPartsV171==='function'?graphPartsV171():(typeof graphData==='function'?graphData():null);}catch(_){} if(!g)return; const rows=wrap.querySelectorAll('.chart-row');
    const incomeSegs=rows[0]?.querySelectorAll?.('.chart-seg')||[];
    const incomeSpecs=[['Socios Banco',r=>up((r.persona||persona(r.personaId)).rango)==='SOCIO'&&up(r.situacion)==='BANCO'],['Socios Bizum',r=>up((r.persona||persona(r.personaId)).rango)==='SOCIO'&&up(r.situacion)==='BIZUM'],['Socios Efectivo',r=>up((r.persona||persona(r.personaId)).rango)==='SOCIO'&&up(r.situacion)==='EFECTIVO'],['No socios Banco',r=>up((r.persona||persona(r.personaId)).rango)!=='SOCIO'&&up(r.situacion)==='BANCO'],['No socios Bizum',r=>up((r.persona||persona(r.personaId)).rango)!=='SOCIO'&&up(r.situacion)==='BIZUM'],['No socios Efectivo',r=>up((r.persona||persona(r.personaId)).rango)!=='SOCIO'&&up(r.situacion)==='EFECTIVO'],['Pendiente de ingresar',r=>up(r.situacion)==='PENDIENTE']];
    const incomeItems=g.incomeItems||[]; incomeSegs.forEach((seg,i)=>{const [title,fn]=incomeSpecs[i]||[]; if(!title)return; const regs=ingresos().filter(fn).sort((a,b)=>cmp(ingresoVals(a).nombre,ingresoVals(b).nombre)); const total=regs.reduce((a,b)=>a+totalIngreso(b),0); const text=titleWithLines(title,total,'PERSONAS | Nº | Rango | Importe socio | Importe voluntario | Total',regs.map(r=>ingresoLine(r,false))); setTip(seg,text,incomeItems[i]?.color||getComputedStyle(seg).backgroundColor||'#fff','graphincomev213');});
    const donSegs=rows[1]?.querySelectorAll?.('.chart-seg')||[]; const donSpecs=[['Donado por tiendas','DONADO TIENDA'],['Donado por socios','DONADO SOCIO'],['Donado por no socios','DONADO OTROS']]; const donItems=g.donationItems||[];
    donSegs.forEach((seg,i)=>{const [title,code]=donSpecs[i]||[]; if(!code)return; const total=compras().filter(c=>ticket(c)===code).reduce((a,b)=>a+value(b),0); const text=titleWithLines(title,total,'DONANTE | Producto | Uds | Precio estimado | Valor estimado',donationRowsGrouped(code)); setTip(seg,text,donItems[i]?.color||getComputedStyle(seg).backgroundColor||'#fff','graphdonationv213');});
    const expSegs=rows[2]?.querySelectorAll?.('.chart-seg')||[]; const expItems=g.expenseItems||[]; const specs=[['Gastado por ticket','ticket'],['Gastos corrientes','current'],['Pte. Compra u otros gastos','pending']];
    expSegs.forEach((seg,i)=>{const [title,kind]=specs[i]||[]; if(!kind)return; const lines=expenseRowsGrouped(kind); const total=lines.total; const text=titleWithLines(title,total,'Ticket | Tienda | Producto | Uds x precio | Total',lines.rows); setTip(seg,text,expItems[i]?.color||getComputedStyle(seg).backgroundColor||'#fff','graphexpensev213');});
  }
  function expenseRowsGrouped(kind){
    const filt=c=>{const tk=ticket(c); if(kind==='ticket')return !isDon(tk)&&!isCurrent(tk)&&tk!==''; if(kind==='current')return isCurrent(tk); return !isDon(tk)&&tk==='';};
    const rows=compras().filter(filt).sort((a,b)=>cmp(ticket(a)||'PTE.COMPRA',ticket(b)||'PTE.COMPRA')||cmp(storeName(a),storeName(b))||cmp(productName(a),productName(b)));
    const out=[]; let cur=null,total=0,grand=0; rows.forEach((c,i)=>{const tk=kind==='current'?'GASTOS CORRIENTES':(ticket(c)||'PTE.COMPRA'); if(cur!==null&&tk!==cur){out.push(`TOTAL ${cur} | | | | ${money(total)}`); out.push(''); total=0;} cur=tk; const v=value(c); total+=v; grand+=v; out.push(`${tk} | ${storeName(c)} | ${productName(c)} | ${num(Number(c.unidades||0))} uds x ${money(price(c))} | ${money(v)}`); if(i===rows.length-1)out.push(`TOTAL ${tk} | | | | ${money(total)}`);}); return {rows:out,total:grand};
  }
  function normalizeDownloads(){const proto=HTMLAnchorElement.prototype; if(proto.click.__v213Wrapped)return; const prev=proto.click; const wrapped=function(){try{if(this.download){this.download=String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig,VERSION_FILE).replace(/[\\/:*?"<>|]+/g,'_').replace(/_+\.xlsx$/,'.xlsx');}}catch(_){} return prev.apply(this,arguments);}; wrapped.__v213Wrapped=true; proto.click=wrapped;}
  function refreshVersion(){try{document.title=VERSION;}catch(_){} document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||''))el.textContent=VERSION;}); normalizeDownloads();}
  async function safeInfoEventoExport(){
    await (typeof ensureExcelJS==='function'?ensureExcelJS():Promise.resolve());
    const wb=new ExcelJS.Workbook(); wb.creator=VERSION+' - ©oltyLAB ’26'; wb.created=new Date();
    const border={top:{style:'thin',color:{argb:'FFDDE2EA'}},left:{style:'thin',color:{argb:'FFDDE2EA'}},bottom:{style:'thin',color:{argb:'FFDDE2EA'}},right:{style:'thin',color:{argb:'FFDDE2EA'}}};
    const moneyFmt='#,##0.00 [$€-C0A]';
    function ws(name,widths){const s=wb.addWorksheet(String(name).slice(0,31)); s.columns=widths.map(w=>({width:w})); return s;}
    function cell(s,r,c,v,bold=false,isMoney=false){const x=s.getCell(r,c); x.value=isMoney?Number(v||0):(v==null?'':v); if(isMoney)x.numFmt=moneyFmt; x.border=border; x.alignment={vertical:'middle',wrapText:true}; x.font={bold:!!bold,color:{argb:'FF111827'}}; return x;}
    function header(s,r,vals){vals.forEach((v,i)=>{const c=cell(s,r,i+1,v,true); c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF111827'}}; c.font={bold:true,color:{argb:'FFFFFFFF'}};});}
    const e=ev(); let r=1; const s1=ws('RESUMEN',[24,60,18]); header(s1,r++,['Campo','Valor','Importe']); cell(s1,r,1,'Evento',true); cell(s1,r++,2,e.titulo||''); cell(s1,r,1,'Fechas',true); cell(s1,r++,2,`${e.fechaIni||''}${e.fechaFin?' - '+e.fechaFin:''}`); cell(s1,r,1,'Precio evento',true); cell(s1,r++,3,Number(e.precio||0),true,true); cell(s1,r,1,'Descripción',true); cell(s1,r++,2,String(e.descripcion||'').slice(0,32000));
    const si=ws('INGRESOS',[32,9,14,16,16,16,16]); header(si,1,['Nombre','Número','Rango','Importe socio','Importe voluntario','Total','Situación']); r=2; ingresos().forEach(x=>{const v=ingresoVals(x); cell(si,r,1,v.nombre); cell(si,r,2,v.n); cell(si,r,3,v.rango); cell(si,r,4,v.socio,false,true); cell(si,r,5,v.vol,false,true); cell(si,r,6,v.total,false,true); cell(si,r,7,v.situacion); r++;});
    const sc=ws('COMPRAS_GASTOS',[18,28,10,14,14,18,26]); header(sc,1,['Ticket','Producto','Uds','Precio','Importe','Tienda','Responsable']); r=2; compras().filter(c=>!isDon(ticket(c))).forEach(c=>{cell(sc,r,1,ticket(c)||'PTE.COMPRA'); cell(sc,r,2,productName(c)); cell(sc,r,3,Number(c.unidades||0)); cell(sc,r,4,price(c),false,true); cell(sc,r,5,value(c),false,true); cell(sc,r,6,storeName(c)); cell(sc,r,7,persona(c.responsableId).nombre||''); r++;});
    const sd=ws('DONACIONES',[24,28,10,14,14,28]); header(sd,1,['Donante','Producto','Uds','Precio estimado','Valor estimado','Tipo']); r=2; compras().filter(c=>isDon(ticket(c))).forEach(c=>{cell(sd,r,1,donorName(c)); cell(sd,r,2,productName(c)); cell(sd,r,3,Number(c.unidades||0)); cell(sd,r,4,price(c),false,true); cell(sd,r,5,value(c),false,true); cell(sd,r,6,ticket(c)); r++;});
    const buf=await wb.xlsx.writeBuffer(); const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}); const a=document.createElement('a'); const d=new Date(); const y=String(d.getFullYear()),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0'); a.href=URL.createObjectURL(blob); a.download=`${VERSION_FILE}_INFOEVENTO-${clean(e.titulo||'evento')}_${y}${m}${day}.xlsx`; a.click(); URL.revokeObjectURL(a.href);
  }
  const previousExport=(typeof exportExcel==='function'?exportExcel:(typeof window.exportExcel==='function'?window.exportExcel:null));
  function describeInfoEventoError(err){
    try{
      const name=err&&err.name?String(err.name):'Error';
      const msg=err&&err.message?String(err.message):String(err||'Error desconocido');
      return `${name}: ${msg}`;
    }catch(_){return 'Error desconocido';}
  }
  window.exportExcel=exportExcel=async function(){
    try{
      if(!previousExport){
        throw new Error('No se ha encontrado la función principal original de exportación INFOEVENTO.');
      }
      return await previousExport.apply(this,arguments);
    }catch(err){
      window.__ultimoErrorInfoEvento=err;
      console.group('ERROR INFOEVENTO - ControlEvent v28.10');
      console.error('No se ha generado INFOEVENTO reducido. Se muestra el error real para poder corregir datos o código.', err);
      try{console.error('Stack:', err&&err.stack?err.stack:'Sin stack disponible');}catch(_){}
      try{console.log('Evento activo:', ev());}catch(_){}
      try{console.log('Ingresos del evento:', ingresos());}catch(_){}
      try{console.log('Compras/donaciones/gastos del evento:', compras());}catch(_){}
      console.groupEnd();
      alert('No se pudo descargar INFOEVENTO completo.\n\n' + describeInfoEventoError(err) + '\n\nAbre la consola para ver el detalle. No se ha generado ningún Excel reducido.');
      throw err;
    }
  };
  function wireExcel(){const btn=$('btnExportExcel'); if(!btn||btn.dataset.v213Excel==='1')return; btn.dataset.v213Excel='1'; btn.disabled=false; btn.removeAttribute('disabled'); btn.addEventListener('click',function(ev){ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); window.exportExcel();},true);}
  function applyAll(){refreshVersion(); applySummaryIncomeTips(); applyBudgetIncomeTips(); applyBudgetDonationCombinedTip(); applyGraphTips(); wireExcel();}
  const prevRender=typeof render==='function'?render:null; if(prevRender&&!prevRender.__v213Wrapped){const wrapped=function(){const ret=prevRender.apply(this,arguments); setTimeout(applyAll,260); setTimeout(applyAll,760); setTimeout(applyAll,1400); return ret;}; wrapped.__v213Wrapped=true; render=wrapped; window.render=render;}
  ['DOMContentLoaded','load'].forEach(evt=>window.addEventListener(evt,()=>{setTimeout(applyAll,280); setTimeout(applyAll,900); setTimeout(applyAll,1700); setTimeout(applyAll,2600);}));
  applyAll(); setTimeout(applyAll,500); setTimeout(applyAll,1500); setTimeout(applyAll,3000);
})();

;/* ===== END legacy-inline-34-v213-final-script.js ===== */


;/* ===== BEGIN legacy-inline-35.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #35. */
/* ==== V21.3.2: helper global para comentarios Excel INFOEVENTO completo ==== */
var addCellNote = window.addCellNote || function(cell, text){
  if(!cell || !text) return;
  var noteText = String(text).replace(/\s*\n\s*/g, '\n');
  try{
    cell.note = {
      texts: [{ text: noteText }],
      margins: { insetmode: 'custom', inset: [0.20, 0.20, 0.60, 0.60] },
      protection: { locked: true, lockText: true },
      editAs: 'twoCells',
      width: 520,
      height: 220
    };
  }catch(_){
    try{ cell.note = noteText; }catch(__){}
  }
};
window.addCellNote = addCellNote;
(function(){
  const VERSION = 'ControlEvent v28.10';
  const VERSION_FILE = 'ControlEvent_v28_10';
  function refreshVersionV2132(){
    try{ document.title = VERSION; }catch(_){ }
    try{
      document.querySelectorAll('.appname span,.appname-stack span').forEach(function(el){
        if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION;
      });
    }catch(_){ }
  }
  function normalizeDownloadNamesV2132(){
    try{
      const proto = HTMLAnchorElement.prototype;
      if(proto.click.__v2132Wrapped) return;
      const prev = proto.click;
      const wrapped = function(){
        try{
          if(this.download){
            this.download = String(this.download)
              .replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE)
              .replace(/[\\/:*?"<>|]+/g, '_')
              .replace(/_+\.xlsx$/i, '.xlsx');
          }
        }catch(_){ }
        return prev.apply(this, arguments);
      };
      wrapped.__v2132Wrapped = true;
      proto.click = wrapped;
    }catch(_){ }
  }
  function applyV2132(){ refreshVersionV2132(); normalizeDownloadNamesV2132(); }
  ['DOMContentLoaded','load'].forEach(function(evt){ window.addEventListener(evt, function(){ setTimeout(applyV2132, 100); setTimeout(applyV2132, 900); }); });
  applyV2132();
})();

;/* ===== END legacy-inline-35.js ===== */


;/* ===== BEGIN legacy-inline-36-v214-donaciones-grafica-fix.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #36. */
/* ==== V21.4: donaciones duplicadas por Producto+Donante y corrección gráfico ingresos socio ==== */
(function(){
  const VERSION = 'ControlEvent v28.10';
  const VERSION_FILE = 'ControlEvent_v28_10';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function st(){ try{ if(typeof state !== 'undefined') return state; }catch(_){ } return window.state || {}; }
  function selectedEv(){ try{ if(typeof selectedEvent === 'function') return selectedEvent() || {}; }catch(_){ } const s=st(); return (s.eventos||[]).find(e => String(e.id) === String(s.selectedEventId)) || {}; }
  function selectedId(){ const ev=selectedEv(); return String(ev.id || st().selectedEventId || ''); }
  function rowsCompras(){ try{ if(typeof comprasForEvent === 'function') return comprasForEvent() || []; }catch(_){ } const id=selectedId(); return (st().compras||[]).filter(c => String(c.eventId||'') === id); }
  function rowsIngresos(){ try{ if(typeof collabsForEvent === 'function') return collabsForEvent() || []; }catch(_){ } const id=selectedId(); return (st().colaboradores||[]).filter(c => String(c.eventId||'') === id); }
  function persona(id){ try{ if(typeof personaById === 'function') return personaById(id) || {}; }catch(_){ } return (st().personas||[]).find(p => String(p.id) === String(id)) || {}; }
  function product(id){ try{ if(typeof productoById === 'function') return productoById(id) || {}; }catch(_){ } return (st().productos||[]).find(p => String(p.id) === String(id)) || {}; }
  function tienda(id){ try{ if(typeof tiendaById === 'function') return tiendaById(id) || {}; }catch(_){ } return (st().tiendas||[]).find(t => String(t.id) === String(id)) || {}; }
  function isDon(v){ try{ if(typeof isDonationTicket === 'function') return isDonationTicket(v); }catch(_){ } return up(v).startsWith('DONADO'); }
  function isCurrent(v){ try{ if(typeof isCurrentExpenseTicket === 'function') return isCurrentExpenseTicket(v); }catch(_){ } return up(v) === 'GASTOS CORRIENTES'; }
  function money(v){ try{ if(typeof formatEuro === 'function') return formatEuro(Number(v||0)); }catch(_){} try{ if(typeof window.money === 'function') return window.money(Number(v||0)); }catch(_){} return Number(v||0).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' €'; }
  function donorLabelFromRef(ref){
    const raw = norm(ref);
    if(!raw) return '';
    if(raw.startsWith('P:')) return persona(raw.slice(2)).nombre || raw;
    if(raw.startsWith('T:')) return tienda(raw.slice(2)).nombre || raw;
    try{ if(typeof donorLabel === 'function'){ const d=donorLabel(raw); if(norm(d)) return d; } }catch(_){ }
    return raw;
  }
  function findDonationSameProductDonor(productId, donorRef){
    const p = String(productId || '');
    const d = String(donorRef || '');
    if(!p) return null;
    return rowsCompras().find(c => isDon(c.ticketDonacion) && String(c.productoId || '') === p && String(c.donorRef || '') === d) || null;
  }
  function locateDonationRow(id){
    let el = $('donacionRow_' + id);
    if(el) return el;
    const safe = (window.CSS && CSS.escape) ? CSS.escape(String(id)) : String(id).replace(/"/g,'\\"');
    const sel = document.querySelector(`#donacionesList select[data-action="edit-donacion-producto"][data-id="${safe}"]`);
    return sel?.closest?.('.itemcard') || null;
  }
  function setFound(el){
    if(!el) return;
    document.querySelectorAll('.found-target').forEach(x => x.classList.remove('found-target'));
    el.classList.add('found-target');
    try{ el.scrollIntoView({behavior:'smooth',block:'center'}); }catch(_){ try{ el.scrollIntoView(); }catch(__){} }
    setTimeout(() => el.classList.remove('found-target'), 2800);
  }
  function jumpToDonation(row){
    if(!row) return false;
    try{ currentMainTab = 'donaciones'; }catch(_){ }
    try{ if(typeof render === 'function') render(); }catch(_){ }
    setTimeout(() => setFound(locateDonationRow(row.id)), 120);
    return true;
  }
  function resetDonationInputs(){
    ['donProducto','donDonante','donResponsable'].forEach(id => { const el=$(id); if(el) el.value=''; });
    if($('donUnidades')) $('donUnidades').value = '1.00';
    if($('donPrecio')) $('donPrecio').value = '0,00 €';
    if($('donImporte')) $('donImporte').value = '';
    try{ if($('donTicket') && typeof DONATION_TICKET_OPTIONS !== 'undefined') $('donTicket').value = DONATION_TICKET_OPTIONS[0]; }catch(_){ }
  }
  // Refuerzo extra: seleccionar producto en Donaciones solo actualiza la previsualización; nunca salta al registro.
  document.addEventListener('change', function(ev){
    const t = ev.target;
    if(!t || t.id !== 'donProducto') return;
    try{ if(typeof updateDonationPreview === 'function') updateDonationPreview(); }catch(_){ }
  }, true);
  // Añadir donación: duplicidad únicamente por Producto + Donante.
  window.addDonation = addDonation = function(){
    try{ if(typeof selectedEvent === 'function' && !selectedEvent()) return; }catch(_){ if(!selectedId()) return; }
    const productId = $('donProducto')?.value || '';
    if(!productId) return;
    const donorRef = $('donDonante')?.value || '';
    const found = findDonationSameProductDonor(productId, donorRef);
    if(found){ jumpToDonation(found); return; }
    const p = product(productId);
    const rawPrecio = $('donPrecio')?.value || p.precio || p.defaultPrecio || 0;
    const precio = (typeof parseEuroInput === 'function') ? parseEuroInput(rawPrecio) : Number(rawPrecio || 0);
    const rec = {
      id: (typeof uid === 'function' ? uid() : (Date.now() + '_' + Math.random().toString(36).slice(2))),
      eventId: selectedId(),
      productoId: productId,
      unidades: Number($('donUnidades')?.value || 0),
      precio: precio,
      ticketDonacion: $('donTicket')?.value || 'DONADO TIENDA',
      donorRef: donorRef,
      responsableId: $('donResponsable')?.value || ''
    };
    if(!Array.isArray(st().compras)) st().compras = [];
    st().compras.push(rec);
    resetDonationInputs();
    try{ currentMainTab = 'donaciones'; }catch(_){ }
    try{ if(typeof render === 'function') render(); }catch(_){ }
    setTimeout(() => setFound(locateDonationRow(rec.id)), 150);
  };
  function personName(r){ return r?.persona?.nombre || persona(r?.personaId).nombre || r?.nombre || 'Sin nombre'; }
  function rango(r){ return up(r?.persona?.rango || persona(r?.personaId).rango || ''); }
  function forma(r){ return up(r?.situacion || ''); }
  function eventPrice(){ return Number(selectedEv().precio || 0); }
  function socioAmount(r){
    // En la gráfica de INGRESOS, la parte de SOCIOS debe coincidir con Resumen presupuestario:
    // Importe socio = Número x Precio evento. No usar r.total, r.base ni r.importeSocio porque
    // en algunos eventos antiguos pueden contener aportación voluntaria u otro importe acumulado.
    const n = Number(r?.numero || 0);
    return n * eventPrice();
  }
  function rowTotal(r){
    if(rango(r) === 'SOCIO') return socioAmount(r);
    if(r?.total != null && Number.isFinite(Number(r.total))) return Number(r.total || 0);
    if(r?.donation != null && Number.isFinite(Number(r.donation))) return Number(r.donation || 0);
    if(r?.importe != null && Number.isFinite(Number(r.importe))) return Number(r.importe || 0);
    return 0;
  }
  function incomeLine(r){
    const n = Number(r?.numero || 0);
    const socio = rango(r) === 'SOCIO' ? socioAmount(r) : 0;
    const vol = rango(r) === 'SOCIO' ? 0 : rowTotal(r);
    const total = rowTotal(r);
    return `${personName(r)} — Nº ${n} — Importe socio: ${money(socio)} — Importe voluntario: ${money(vol)} — Total: ${money(total)} — ${r?.situacion || ''}`;
  }
  // Corregimos el origen de la barra INGRESOS para que SOCIOS compute como el resumen: número x precio evento, no total con voluntario.
  const oldGraphParts = typeof window.graphPartsV171 === 'function' ? window.graphPartsV171 : null;
  function graphPartsFixed(){
    const g = oldGraphParts ? oldGraphParts() : {incomeItems:[],donationItems:[],expenseItems:[],saldoItems:[],totalDon:0,totalExp:0,saldoOperativo:0};
    const rows = rowsIngresos();
    const sum = arr => arr.reduce((a,b) => a + Number(b || 0), 0);
    const mk = (label, filter, color) => {
      const list = rows.filter(filter);
      return { label, value: sum(list.map(rowTotal)), color, lines: list.slice().sort((a,b)=>personName(a).localeCompare(personName(b),'es')).map(incomeLine) };
    };
    const fixedIncome = [
      mk('Socios Banco', r => rango(r)==='SOCIO' && forma(r)==='BANCO', '#2563eb'),
      mk('Socios Bizum', r => rango(r)==='SOCIO' && forma(r)==='BIZUM', '#16a34a'),
      mk('Socios Efectivo', r => rango(r)==='SOCIO' && forma(r)==='EFECTIVO', '#84cc16'),
      mk('No socios Banco', r => rango(r)!=='SOCIO' && forma(r)==='BANCO', '#60a5fa'),
      mk('No socios Bizum', r => rango(r)!=='SOCIO' && forma(r)==='BIZUM', '#34d399'),
      mk('No socios Efectivo', r => rango(r)!=='SOCIO' && forma(r)==='EFECTIVO', '#bef264'),
      mk('Pendiente de ingresar', r => forma(r)==='PENDIENTE', '#f59e0b')
    ];
    g.incomeItems = fixedIncome;
    g.totalIncomeRaw = fixedIncome.reduce((a,b)=>a+Number(b.value||0),0);
    try{
      const b = typeof budgetSummary === 'function' ? budgetSummary() : null;
      const budgetTotal = Number(b?.ingresosDinero?.totalIngresado);
      g.totalIncome = Number.isFinite(budgetTotal) ? budgetTotal : g.totalIncomeRaw;
    }catch(_){ g.totalIncome = g.totalIncomeRaw; }
    // Si por datos antiguos el resumen no coincidiera, priorizamos que la leyenda y la barra sumen igual.
    if(Math.abs(Number(g.totalIncome || 0) - Number(g.totalIncomeRaw || 0)) > 0.005) g.totalIncome = g.totalIncomeRaw;
    return g;
  }
  window.graphPartsV171 = graphPartsV171 = graphPartsFixed;
  window.graphPartsV164 = graphPartsFixed;
  function refreshVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span,.appname-stack span').forEach(el => { if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION; });
    try{
      const proto = HTMLAnchorElement.prototype;
      if(!proto.click.__v214Wrapped){
        const prev = proto.click;
        const wrapped = function(){ try{ if(this.download) this.download = String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }catch(_){} return prev.apply(this, arguments); };
        wrapped.__v214Wrapped = true; proto.click = wrapped;
      }
    }catch(_){ }
  }
  function apply(){ refreshVersion(); try{ if(typeof renderGraficas === 'function') renderGraficas(); }catch(_){ } }
  ['DOMContentLoaded','load'].forEach(evt => window.addEventListener(evt, () => { setTimeout(apply,250); setTimeout(apply,1000); }));
  refreshVersion(); setTimeout(apply,400); setTimeout(apply,1400);
})();

;/* ===== END legacy-inline-36-v214-donaciones-grafica-fix.js ===== */


;/* ===== BEGIN legacy-inline-37-v2141-graph-income-socio-strict-fix.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #37. */
/* ==== V21.4.1: corrección estricta Socios Banco/Bizum/Efectivo = Número x Precio evento ==== */
(function(){
  const VERSION='ControlEvent v28.10';
  function refreshVersion(){
    try{document.title=VERSION;}catch(_){}
    try{document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||'')) el.textContent=VERSION;});}catch(_){}
  }
  function run(){
    refreshVersion();
    try{ if(typeof renderGraficas === 'function') renderGraficas(); }catch(e){ console.warn('No se pudo refrescar Gráficas tras fix v21.5', e); }
  }
  window.addEventListener('DOMContentLoaded',()=>setTimeout(run,350));
  window.addEventListener('load',()=>setTimeout(run,900));
  setTimeout(run,500);
  setTimeout(run,1600);
})();

;/* ===== END legacy-inline-37-v2141-graph-income-socio-strict-fix.js ===== */


;/* ===== BEGIN legacy-inline-38-v215-minimal-fix-donaciones-excel-fotos.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #38. */
/* ==== V21.5: solo corrige fotos INFOEVENTO y duplicidad Donaciones Producto+Donante ==== */
(function(){
  const VERSION = 'ControlEvent v28.10';
  const VERSION_FILE = 'ControlEvent_v28_10';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  function st(){ try{ if(typeof state !== 'undefined') return state; }catch(_){ } return window.state || {}; }
  function ev(){ try{ if(typeof selectedEvent === 'function') return selectedEvent() || {}; }catch(_){ } const s=st(); return (s.eventos||[]).find(e => String(e.id) === String(s.selectedEventId)) || {}; }
  function evId(){ const e=ev(); return String(e.id || st().selectedEventId || ''); }
  function compras(){ try{ if(typeof comprasForEvent === 'function') return comprasForEvent() || []; }catch(_){ } const id=evId(); return (st().compras||[]).filter(c => String(c.eventId||'') === id); }
  function product(id){ try{ if(typeof productoById === 'function') return productoById(id) || {}; }catch(_){ } return (st().productos||[]).find(p => String(p.id) === String(id)) || {}; }
  function isDon(v){ try{ if(typeof isDonationTicket === 'function') return isDonationTicket(v); }catch(_){ } return up(v).startsWith('DONADO'); }
  function parseEuro(v){ try{ if(typeof parseEuroInput === 'function') return parseEuroInput(v); }catch(_){ } const n=String(v??'').replace(/[^0-9,.-]/g,'').replace(/\./g,'').replace(',', '.'); return Number(n||0); }
  function uidSafe(){ try{ if(typeof uid === 'function') return uid(); }catch(_){ } return Date.now() + '_' + Math.random().toString(36).slice(2); }
  function findDonationSameProductDonor(productId, donorRef){
    const p=String(productId||'');
    const d=String(donorRef||'');
    if(!p) return null;
    return compras().find(c => isDon(c.ticketDonacion) && String(c.productoId||'') === p && String(c.donorRef||'') === d) || null;
  }
  function locateDonationRow(id){
    let el = $('donacionRow_' + id);
    if(el) return el;
    const safe = (window.CSS && CSS.escape) ? CSS.escape(String(id)) : String(id).replace(/"/g,'\\"');
    return document.querySelector(`#donacionesList select[data-action="edit-donacion-producto"][data-id="${safe}"]`)?.closest?.('.itemcard') || null;
  }
  function setFound(el){
    if(!el) return;
    document.querySelectorAll('.found-target').forEach(x => x.classList.remove('found-target'));
    el.classList.add('found-target');
    try{ el.scrollIntoView({behavior:'smooth', block:'center'}); }catch(_){ try{ el.scrollIntoView(); }catch(__){} }
    setTimeout(() => el.classList.remove('found-target'), 2800);
  }
  function jumpToDonation(row){
    if(!row) return false;
    try{ currentMainTab = 'donaciones'; }catch(_){ }
    try{ if(typeof render === 'function') render(); }catch(_){ }
    setTimeout(() => setFound(locateDonationRow(row.id)), 120);
    return true;
  }
  function resetDonationInputs(){
    ['donProducto','donDonante','donResponsable'].forEach(id => { const el=$(id); if(el) el.value=''; });
    if($('donUnidades')) $('donUnidades').value = '1.00';
    if($('donPrecio')) $('donPrecio').value = '0,00 €';
    if($('donImporte')) $('donImporte').value = '';
    try{ if($('donTicket') && typeof DONATION_TICKET_OPTIONS !== 'undefined') $('donTicket').value = DONATION_TICKET_OPTIONS[0]; }catch(_){ }
  }

  // BLOQUEO DEFINITIVO DEL SALTO AL ELEGIR PRODUCTO EN DONACIONES.
  // Se captura en window, antes de los listeners antiguos de document que buscaban por producto.
  window.addEventListener('change', function(e){
    const t = e.target;
    if(!t || t.id !== 'donProducto') return;
    try{ if(typeof updateDonationPreview === 'function') updateDonationPreview(true); }catch(_){ }
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
  }, true);

  // AÑADIR DONACIÓN: solo aquí se comprueba duplicidad, y por Producto + Donante.
  window.addDonation = addDonation = function(){
    try{ if(typeof selectedEvent === 'function' && !selectedEvent()) return; }catch(_){ if(!evId()) return; }
    const productId = $('donProducto')?.value || '';
    if(!productId) return;
    const donorRef = $('donDonante')?.value || '';
    const found = findDonationSameProductDonor(productId, donorRef);
    if(found){ jumpToDonation(found); return; }
    const p = product(productId);
    const precio = parseEuro($('donPrecio')?.value || p.defaultPrecio || p.precio || 0);
    const rec = {
      id: uidSafe(),
      eventId: evId(),
      productoId: productId,
      unidades: Number($('donUnidades')?.value || 0),
      precio: precio,
      ticketDonacion: $('donTicket')?.value || 'DONADO TIENDA',
      donorRef: donorRef,
      responsableId: $('donResponsable')?.value || ''
    };
    if(!Array.isArray(st().compras)) st().compras = [];
    st().compras.push(rec);
    try{ if(typeof save === 'function') save(); }catch(_){ }
    resetDonationInputs();
    try{ currentMainTab = 'donaciones'; }catch(_){ }
    try{ if(typeof render === 'function') render(); }catch(_){ }
    setTimeout(() => setFound(locateDonationRow(rec.id)), 150);
  };

  // FOTOS EN INFOEVENTO: se enriquecen las filas de Por tienda y Ticket con imagen aunque la clave
  // se hubiera guardado con una variante antigua o visible del texto.
  function ticketImageKeyFor(candidate){
    const id=evId();
    try{ if(typeof ticketImageStateKey === 'function') return ticketImageStateKey(candidate, id); }catch(_){ }
    return `${id}|${candidate}`;
  }
  function imageByCandidate(candidate){
    const s=st(); const imgs=s.ticketImages || {}; const c=norm(candidate); if(!c) return '';
    const directKeys = [c, ticketImageKeyFor(c), `${evId()}|${c}`];
    for(const k of directKeys){ if(imgs[k]) return imgs[k]; }
    return '';
  }
  function splitKeyLike(value){
    const v=norm(value).split('·')[0].trim();
    const parts=v.split('|').map(x=>norm(x)).filter(Boolean);
    return parts;
  }
  function resolveTicketImage(row){
    if(!row || row.pending || row.donated === true || row.attachable === false) return row?.image || '';
    const candidates=[];
    [row.k,row.label,row.key,row.clave,row.concepto].forEach(v=>{ if(norm(v)) candidates.push(norm(v)); });
    // Variantes tienda|ticket y ticket|tienda.
    [row.k,row.label].forEach(v=>{
      const p=splitKeyLike(v);
      if(p.length>=2){
        candidates.push(`${p[0]} | ${p[1]}`);
        candidates.push(`${p[1]} | ${p[0]}`);
        candidates.push(`${p[0]}|${p[1]}`);
        candidates.push(`${p[1]}|${p[0]}`);
      }
    });
    // Si hay rawTicket, buscar combinaciones con la tienda del k.
    if(norm(row.rawTicket)){
      const p=splitKeyLike(row.k || row.label);
      if(p[0]){
        candidates.push(`${p[0]} | ${row.rawTicket}`);
        candidates.push(`${row.rawTicket} | ${p[0]}`);
      }
      candidates.push(norm(row.rawTicket));
    }
    for(const c of Array.from(new Set(candidates))){ const img=imageByCandidate(c); if(img) return img; }

    // Búsqueda flexible dentro de las imágenes del evento activo: coinciden ticket y tienda.
    const imgs=st().ticketImages || {}; const prefix=`${evId()}|`;
    const parts=splitKeyLike(row.k || row.label);
    const a=up(parts[0]||''), b=up(parts[1]||row.rawTicket||'');
    for(const [k,v] of Object.entries(imgs)){
      const kk=String(k);
      if(prefix && !kk.startsWith(prefix)) continue;
      const rest=up(kk.slice(prefix.length));
      if((!a || rest.includes(a)) && (!b || rest.includes(b))) return v;
    }
    return row.image || '';
  }
  const prevSummary = typeof summaryByTiendaTicket === 'function' ? summaryByTiendaTicket : null;
  if(prevSummary && !prevSummary.__v215ImageWrapped){
    const wrapped = function(){
      const rows = (prevSummary.apply(this, arguments) || []).map(r => {
        const nr = Object.assign({}, r);
        const img = resolveTicketImage(nr);
        if(img) nr.image = img;
        return nr;
      });
      return rows;
    };
    wrapped.__v215ImageWrapped = true;
    summaryByTiendaTicket = wrapped;
    window.summaryByTiendaTicket = wrapped;
  }

  function refreshVersion(){
    try{ document.title = VERSION; }catch(_){ }
    try{ document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{ if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||'')) el.textContent = VERSION; }); }catch(_){ }
    try{
      const proto = HTMLAnchorElement.prototype;
      if(!proto.click.__v215Wrapped){
        const prev = proto.click;
        const w = function(){ try{ if(this.download) this.download = String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }catch(_){ } return prev.apply(this, arguments); };
        w.__v215Wrapped = true; proto.click = w;
      }
    }catch(_){ }
  }
  function apply(){ refreshVersion(); try{ if(typeof renderBudget === 'function') renderBudget(); }catch(_){ } }
  ['DOMContentLoaded','load'].forEach(evt => window.addEventListener(evt, () => { setTimeout(apply,220); setTimeout(apply,900); }));
  refreshVersion(); setTimeout(apply,400); setTimeout(apply,1300);
})();

;/* ===== END legacy-inline-38-v215-minimal-fix-donaciones-excel-fotos.js ===== */


;/* ===== BEGIN legacy-inline-39-v216-excel-ticket-images-protection-script.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #39. */
/* ==== V21.6: fotos tickets en CALCULOS_TIENDA_TICKET y protección reforzada ==== */
(function(){
  const VERSION = 'ControlEvent v28.10';
  const VERSION_FILE = 'ControlEvent_v28_10';
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ');
  function st(){ try{ if(typeof state !== 'undefined') return state; }catch(_){ } return window.state || {}; }
  function ev(){ try{ if(typeof selectedEvent === 'function') return selectedEvent() || {}; }catch(_){ } const s=st(); return (s.eventos||[]).find(e => String(e.id)===String(s.selectedEventId)) || {}; }
  function evId(){ const e=ev(); return String(e.id || st().selectedEventId || ''); }
  function compras(){ try{ if(typeof comprasForEvent === 'function') return comprasForEvent() || []; }catch(_){ } const id=evId(); return (st().compras||[]).filter(c => String(c.eventId||'')===id); }
  function product(id){ try{ if(typeof productoById === 'function') return productoById(id) || {}; }catch(_){ } return (st().productos||[]).find(p=>String(p.id)===String(id)) || {}; }
  function store(id){ try{ if(typeof tiendaById === 'function') return tiendaById(id) || {}; }catch(_){ } return (st().tiendas||[]).find(t=>String(t.id)===String(id)) || {}; }
  function storeName(c){ const p=product(c?.productoId); return norm(c?.tienda?.nombre || store(c?.tiendaId || p.tiendaId || p.defaultTiendaId).nombre || 'Sin tienda'); }
  function ticket(c){ return norm(c?.ticketDonacion || ''); }
  function isDonation(v){ try{ if(typeof isDonationTicket === 'function') return isDonationTicket(v); }catch(_){ } return up(v).startsWith('DONADO'); }
  function isCurrent(v){ try{ if(typeof isCurrentExpenseTicket === 'function') return isCurrentExpenseTicket(v); }catch(_){ } return up(v)==='GASTOS CORRIENTES'; }
  function imageKey(k){ const id=evId(); try{ if(typeof ticketImageStateKey === 'function') return ticketImageStateKey(k,id); }catch(_){ } return `${id}|${k}`; }
  function stripEventPrefix(k){ const id=evId(); k=String(k||''); return id && k.startsWith(id+'|') ? k.slice(id.length+1) : k; }
  function compact(v){
    return up(v)
      .replace(/·.*$/,'')
      .replace(/\b(TIENDA|TICKET|FOTO|IMAGEN)\b/g,'')
      .replace(/\s*\|\s*/g,'|')
      .replace(/\s+/g,' ')
      .trim();
  }
  function ticketToken(v){
    const s=up(v);
    const m=s.match(/\bTK\s*[-_]*\s*[A-Z0-9]+\b/) || s.match(/\bTICKET\s*[-_]*\s*[A-Z0-9]+\b/);
    return m ? m[0].replace(/\s+/g,'') : '';
  }
  function dataUrlOk(v){ return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(String(v||'')); }
  function findImageForConcept(concept){
    const s=st(); const imgs=s.ticketImages || {}; const c=norm(concept); if(!c) return '';
    const id=evId();
    const direct=[c,imageKey(c),`${id}|${c}`];
    const parts=c.split('|').map(x=>norm(x)).filter(Boolean);
    if(parts.length>=2){
      const a=parts[0], b=parts[1].split('·')[0].trim();
      direct.push(`${a}|${b}`, `${a} | ${b}`, `${b}|${a}`, `${b} | ${a}`, imageKey(`${a}|${b}`), imageKey(`${a} | ${b}`), imageKey(`${b}|${a}`), imageKey(`${b} | ${a}`), imageKey(b), `${id}|${b}`);
    }
    for(const k of Array.from(new Set(direct))){ if(dataUrlOk(imgs[k])) return imgs[k]; }
    const cc=compact(c); const tok=ticketToken(c); const tienda=compact(parts[0]||'');
    let ticketMatches=[];
    for(const [k,v] of Object.entries(imgs)){
      if(!dataUrlOk(v)) continue;
      const kk=String(k);
      if(id && kk.includes('|') && !kk.startsWith(id+'|')) continue;
      const rest=stripEventPrefix(kk);
      const rr=compact(rest);
      if(cc && (rr===cc || rr.includes(cc) || cc.includes(rr))) return v;
      const kt=ticketToken(rest);
      if(tok && kt && kt===tok){
        if(!tienda || rr.includes(tienda) || tienda.includes(rr.split('|')[0]||'')) return v;
        ticketMatches.push(v);
      }
    }
    if(ticketMatches.length===1) return ticketMatches[0];
    return '';
  }
  function prepareTicketImagesForExcelV216(){
    const s=st(); if(!s.ticketImages) s.ticketImages={};
    const rows = (typeof summaryByTiendaTicket === 'function') ? (summaryByTiendaTicket() || []) : [];
    rows.forEach(row=>{
      if(!row || row.pending || row.donated || row.attachable===false) return;
      const concept=norm(row.k || row.label || '');
      const img = dataUrlOk(row.image) ? row.image : findImageForConcept(concept);
      if(img && concept){
        s.ticketImages[imageKey(concept)] = img;
        const cleanLabel = norm(row.label || '').split('·')[0].trim();
        if(cleanLabel) s.ticketImages[imageKey(cleanLabel)] = img;
      }
    });
    // También se crean claves canónicas a partir de las compras reales: Tienda | TKxx.
    compras().forEach(c=>{
      const tk=ticket(c); if(!tk || isDonation(tk) || isCurrent(tk)) return;
      const canonical=`${storeName(c)} | ${tk}`;
      const img = findImageForConcept(canonical) || findImageForConcept(tk);
      if(img) s.ticketImages[imageKey(canonical)] = img;
    });
  }
  // Refuerzo de summaryByTiendaTicket: cada fila exportable lleva image si existe en cualquier clave vieja/nueva.
  const prevSummary = typeof summaryByTiendaTicket === 'function' ? summaryByTiendaTicket : null;
  if(prevSummary && !prevSummary.__v216ImageWrapped){
    const wrapped=function(){
      const rows=(prevSummary.apply(this,arguments)||[]).map(r=>{
        const nr=Object.assign({},r);
        if(!nr.pending && !nr.donated && nr.attachable!==false){
          const img = dataUrlOk(nr.image) ? nr.image : findImageForConcept(nr.k || nr.label || '');
          if(img) nr.image=img;
        }
        return nr;
      });
      return rows;
    };
    wrapped.__v216ImageWrapped=true;
    try{ summaryByTiendaTicket=wrapped; }catch(_){ }
    window.summaryByTiendaTicket=wrapped;
  }
  // En exportExcel se normalizan claves justo antes de construir el XLSX completo.
  const prevExport = typeof exportExcel === 'function' ? exportExcel : window.exportExcel;
  if(prevExport && !prevExport.__v216Wrapped){
    const wrappedExport = async function(){
      prepareTicketImagesForExcelV216();
      return await prevExport.apply(this, arguments);
    };
    wrappedExport.__v216Wrapped=true;
    try{ exportExcel=wrappedExport; }catch(_){ }
    window.exportExcel=wrappedExport;
  }
  function refreshVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{ if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||'')) el.textContent=VERSION; });
    try{
      const proto=HTMLAnchorElement.prototype;
      if(!proto.click.__v216Wrapped){
        const prev=proto.click;
        const w=function(){ try{ if(this.download) this.download=String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }catch(_){ } return prev.apply(this,arguments); };
        w.__v216Wrapped=true; proto.click=w;
      }
    }catch(_){ }
  }
  function apply(){ refreshVersion(); try{ prepareTicketImagesForExcelV216(); }catch(_){ } }
  window.addEventListener('DOMContentLoaded',()=>setTimeout(apply,400));
  window.addEventListener('load',()=>setTimeout(apply,900));
  setTimeout(apply,600); setTimeout(apply,1600);
})();

;/* ===== END legacy-inline-39-v216-excel-ticket-images-protection-script.js ===== */


;/* ===== BEGIN legacy-inline-40-v217-final-ticket-images-book-protection-script.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #40. */
/* ==== V21.7: fotos tickets en CALCULOS_TIENDA_TICKET + protección open_excel_arrastre ==== */
(function(){
  const VERSION = 'ControlEvent v28.10';
  const VERSION_FILE = 'ControlEvent_v28_10';
  const EXCEL_PASSWORD = 'open_excel_arrastre';
  const WORKBOOK_PASSWORD_HASH = 'D184';
  const norm = v => String(v ?? '').trim();
  const stripAccents = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const up = v => stripAccents(v).toUpperCase().replace(/\s+/g,' ').trim();
  function st(){ try{ if(typeof state !== 'undefined') return state; }catch(_){ } return window.state || {}; }
  function currentEvent(){ try{ if(typeof selectedEvent === 'function') return selectedEvent() || {}; }catch(_){ } const s=st(); return (s.eventos||[]).find(e=>String(e.id)===String(s.selectedEventId)) || {}; }
  function evId(){ const e=currentEvent(); return String(e.id || st().selectedEventId || ''); }
  function product(id){ try{ if(typeof productoById === 'function') return productoById(id)||{}; }catch(_){ } return (st().productos||[]).find(p=>String(p.id)===String(id)) || {}; }
  function store(id){ try{ if(typeof tiendaById === 'function') return tiendaById(id)||{}; }catch(_){ } return (st().tiendas||[]).find(t=>String(t.id)===String(id)) || {}; }
  function compras(){ try{ if(typeof comprasForEvent === 'function') return comprasForEvent() || []; }catch(_){ } const id=evId(); return (st().compras||[]).filter(c=>String(c.eventId||'')===id); }
  function pName(c){ const p=product(c && c.productoId); return norm(c?.producto?.nombre || p.nombre || c?.productoNombre || ''); }
  function tName(c){ const p=product(c && c.productoId); return norm(c?.tienda?.nombre || store(c?.tiendaId || p.tiendaId || p.defaultTiendaId).nombre || 'Sin tienda'); }
  function ticket(c){ return norm(c?.ticketDonacion || ''); }
  function isDonation(v){ try{ if(typeof isDonationTicket === 'function') return isDonationTicket(v); }catch(_){ } return up(v).startsWith('DONADO'); }
  function isCurrent(v){ try{ if(typeof isCurrentExpenseTicket === 'function') return isCurrentExpenseTicket(v); }catch(_){ } return up(v)==='GASTOS CORRIENTES'; }
  function imageKey(k){ const id=evId(); try{ if(typeof ticketImageStateKey === 'function') return ticketImageStateKey(k, id); }catch(_){ } return `${id}|${k}`; }
  function stripEventPrefix(k){ const id=evId(); k=String(k||''); return id && k.startsWith(id+'|') ? k.slice(id.length+1) : k; }
  function normalLabel(v){
    return up(v)
      .replace(/^\s*[^|]+\|\s*TICKET\s*/i,'')
      .replace(/\b(TIENDA\s*\|\s*TICKET|TIENDA|TICKET|IMAGEN|FOTO)\b/g,'')
      .replace(/·.*$/,'')
      .replace(/\s*\|\s*/g,'|')
      .replace(/\s+/g,' ')
      .trim();
  }
  function ticketToken(v){
    const s=up(v);
    const m=s.match(/\bTK\s*[-_]*\s*[A-Z0-9]+\b/) || s.match(/\bTICKET\s*[-_]*\s*[A-Z0-9]+\b/);
    return m ? m[0].replace(/\s+/g,'') : '';
  }
  function storeToken(v){
    const s=normalLabel(v);
    const parts=s.split('|').map(x=>x.trim()).filter(Boolean);
    if(parts.length>=2 && /^(TK|TICKET)/.test(parts[1])) return parts[0];
    if(parts.length>=2 && /^(TK|TICKET)/.test(parts[0])) return parts[1];
    return parts[0] || '';
  }
  function normalizeImageValue(v){
    const s=String(v||'').trim();
    if(/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(s)) return s;
    // Recupera valores antiguos guardados solo como BASE64 sin cabecera data:image.
    if(/^[A-Za-z0-9+/=\r\n]+$/.test(s) && s.replace(/\s+/g,'').length > 200) return 'data:image/jpeg;base64,' + s.replace(/\s+/g,'');
    return '';
  }
  function imageEntries(){
    const imgs=st().ticketImages || {};
    return Object.entries(imgs).map(([k,v])=>[String(k), normalizeImageValue(v)]).filter(([,v])=>!!v);
  }
  function addCandidate(arr, v){ v=norm(v); if(v && !arr.includes(v)) arr.push(v); }
  function candidatesFromRow(row){
    const out=[];
    [row?.k,row?.label,row?.key,row?.clave,row?.concepto].forEach(v=>addCandidate(out,v));
    const src=norm(row?.k || row?.label || '');
    const srcClean=src.split('·')[0].trim();
    addCandidate(out, srcClean);
    const parts=srcClean.split('|').map(x=>norm(x)).filter(Boolean);
    const raw=norm(row?.rawTicket || '');
    if(parts.length>=2){
      const a=parts[0], b=parts[1].split('·')[0].trim();
      [ `${a} | ${b}`, `${a}|${b}`, `${b} | ${a}`, `${b}|${a}`, b ].forEach(v=>addCandidate(out,v));
    }
    if(raw){
      addCandidate(out, raw);
      if(parts[0]) [ `${parts[0]} | ${raw}`, `${parts[0]}|${raw}`, `${raw} | ${parts[0]}`, `${raw}|${parts[0]}` ].forEach(v=>addCandidate(out,v));
    }
    return out;
  }
  function findImageForRow(row){
    if(!row || row.pending || row.donated === true || row.attachable === false) return normalizeImageValue(row?.image) || '';
    const imgs=st().ticketImages || {};
    const id=evId();
    for(const c of candidatesFromRow(row)){
      const keys=[c, imageKey(c), `${id}|${c}`];
      for(const k of keys){ const img=normalizeImageValue(imgs[k]); if(img) return img; }
    }
    const cands=candidatesFromRow(row);
    const tokens=cands.map(ticketToken).filter(Boolean);
    const stores=cands.map(storeToken).filter(Boolean);
    const sourceNorms=cands.map(normalLabel).filter(Boolean);
    let ticketOnly=[];
    for(const [k,img] of imageEntries()){
      const keyNoEvent=stripEventPrefix(k);
      const nk=normalLabel(keyNoEvent);
      if(sourceNorms.some(s=>s && (nk===s || nk.includes(s) || s.includes(nk)))) return img;
      const kt=ticketToken(keyNoEvent);
      if(tokens.length && kt && tokens.includes(kt)){
        const ks=storeToken(keyNoEvent);
        if(!stores.length || stores.some(s=>s && (ks.includes(s) || s.includes(ks) || nk.includes(s)))) return img;
        ticketOnly.push(img);
      }
    }
    if(ticketOnly.length===1) return ticketOnly[0];
    return normalizeImageValue(row.image) || '';
  }
  function canonicalRowsFromCompras(){
    const map=new Map();
    compras().forEach(c=>{
      const tk=ticket(c); if(!tk || isDonation(tk) || isCurrent(tk)) return;
      const label=`${tName(c)} | ${tk}`;
      if(!map.has(label)) map.set(label, {k:label,label:label,rawTicket:tk,pending:false,donated:false,attachable:true,image:''});
    });
    return Array.from(map.values());
  }
  function enrichRows(rows){
    return (rows||[]).map(r=>{
      const nr=Object.assign({},r);
      const img=findImageForRow(nr);
      if(img) nr.image=img;
      return nr;
    });
  }
  function normalizeTicketImagesForExcelV217(){
    const s=st(); if(!s.ticketImages) s.ticketImages={};
    const currentRows=[];
    try{ if(typeof summaryByTiendaTicket === 'function') currentRows.push(...(summaryByTiendaTicket()||[])); }catch(_){ }
    currentRows.push(...canonicalRowsFromCompras());
    enrichRows(currentRows).forEach(r=>{
      if(!r.image || r.pending || r.donated || r.attachable===false) return;
      const label=norm(r.k || r.label || ''); if(!label) return;
      s.ticketImages[imageKey(label)] = normalizeImageValue(r.image);
      const clean=label.split('·')[0].trim(); if(clean) s.ticketImages[imageKey(clean)] = normalizeImageValue(r.image);
      const tk=ticketToken(label); if(tk) s.ticketImages[imageKey(tk)] = normalizeImageValue(r.image);
    });
  }

  // Refuerza summaryByTiendaTicket para pantalla y para INFOEVENTO.
  const prevSummary = typeof summaryByTiendaTicket === 'function' ? summaryByTiendaTicket : null;
  if(prevSummary && !prevSummary.__v217ImageWrapped){
    const wrapped=function(){ return enrichRows(prevSummary.apply(this, arguments) || []); };
    wrapped.__v217ImageWrapped=true;
    try{ summaryByTiendaTicket=wrapped; }catch(_){ }
    window.summaryByTiendaTicket=wrapped;
  }

  // Último refuerzo antes de generar INFOEVENTO: normaliza claves y permite base64 puro.
  const prevExport = typeof exportExcel === 'function' ? exportExcel : window.exportExcel;
  if(prevExport && !prevExport.__v217Wrapped){
    const wrappedExport = async function(){
      normalizeTicketImagesForExcelV217();
      // Durante la exportación, summaryByTiendaTicket devuelve siempre filas enriquecidas con image.
      return await prevExport.apply(this, arguments);
    };
    wrappedExport.__v217Wrapped=true;
    try{ exportExcel=wrappedExport; }catch(_){ }
    window.exportExcel=wrappedExport;
  }

  // ExcelJS: acepta imágenes antiguas guardadas como base64 sin cabecera.
  function patchExcelJSAddImage(){
    try{
      if(!window.ExcelJS || !ExcelJS.Workbook || ExcelJS.Workbook.prototype.addImage.__v217Patched) return;
      const prev=ExcelJS.Workbook.prototype.addImage;
      const w=function(opts){
        try{
          if(opts && opts.base64){
            const fixed=normalizeImageValue(opts.base64);
            if(fixed) opts=Object.assign({}, opts, {base64: fixed});
          }
        }catch(_){ }
        return prev.call(this, opts);
      };
      w.__v217Patched=true;
      ExcelJS.Workbook.prototype.addImage=w;
    }catch(_){ }
  }

  // Contraseña única para hojas y estructura del libro, incluso cuando otros parches usen otra.
  function patchProtectionAndDownloads(){
    try{
      if(window.ExcelJS && ExcelJS.Worksheet && ExcelJS.Worksheet.prototype.protect && !ExcelJS.Worksheet.prototype.protect.__v217Patched){
        const prev=ExcelJS.Worksheet.prototype.protect;
        const w=function(password, options){ return prev.call(this, EXCEL_PASSWORD, options); };
        w.__v217Patched=true;
        ExcelJS.Worksheet.prototype.protect=w;
      }
    }catch(_){ }
    try{
      if(window.JSZip && !window.__ceV217ZipPatched){
        window.__ceV217ZipPatched=true;
      }
    }catch(_){ }
    try{
      const proto=HTMLAnchorElement.prototype;
      if(!proto.click.__v217Wrapped){
        const prev=proto.click;
        const w=function(){
          try{ if(this.download) this.download=String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }catch(_){ }
          return prev.apply(this, arguments);
        };
        w.__v217Wrapped=true;
        proto.click=w;
      }
    }catch(_){ }
  }

  // Reescribe internamente el XLSX para asegurar estructura protegida con open_excel_arrastre.
  const prevURLCreate = URL.createObjectURL;
  if(prevURLCreate && !URL.createObjectURL.__v217Patched){
    const w=function(obj){ return prevURLCreate.apply(this, arguments); };
    w.__v217Patched=true;
    URL.createObjectURL=w;
  }

  function refreshVersion(){
    try{ document.title=VERSION; }catch(_){ }
    document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{ if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||'')) el.textContent=VERSION; });
  }
  function apply(){ refreshVersion(); patchExcelJSAddImage(); patchProtectionAndDownloads(); try{ normalizeTicketImagesForExcelV217(); }catch(_){ } }
  window.addEventListener('DOMContentLoaded',()=>{ setTimeout(apply,250); setTimeout(apply,1000); });
  window.addEventListener('load',()=>{ setTimeout(apply,500); setTimeout(apply,1600); });
  setInterval(()=>{ try{ patchExcelJSAddImage(); patchProtectionAndDownloads(); }catch(_){ } }, 1200);
  apply(); setTimeout(apply,800); setTimeout(apply,1800);
})();

;/* ===== END legacy-inline-40-v217-final-ticket-images-book-protection-script.js ===== */


;/* ===== BEGIN legacy-inline-41-v225-clean-script.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #41. */
/* ==== V22.5: corrección limpia de fotos de tickets y claves ACCESOS ==== */
(function(){
  const VERSION='ControlEvent v28.10';
  const VERSION_FILE='ControlEvent_v28_10';
  const EXCEL_PASSWORD='open_excel_arrastre';
  const DB_NAME='controlevent_ticket_images_v225';
  const DB_STORE='images';
  const $=id=>document.getElementById(id);
  const norm=v=>String(v??'').trim();
  const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
  const masked=v=>/^[•*●·]+$/.test(String(v||''));
  const stateRef=()=>{ try{ if(typeof state!=='undefined') return state; }catch(_){ } return window.state||{}; };
  const currentEventId=()=>String(stateRef().selectedEventId||'');
  function role(){ try{return String(authUser?.nivel||'').toUpperCase();}catch(_){return '';} }
  function isRO(){return role()==='RO';} function isRW(){return role()==='RW';} function isGD(){return role()==='GD';} function canEvents(){return isRW()||isGD();}

  function updateVersion(){
    try{document.title=VERSION;}catch(_){ }
    try{document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||''))el.textContent=VERSION;});}catch(_){ }
  }
  window.emittedByTextV171=function(date=new Date()){
    const pad=n=>String(n).padStart(2,'0');
    const dd=pad(date.getDate()), mm=pad(date.getMonth()+1), yyyy=date.getFullYear();
    const hh=pad(date.getHours()), mi=pad(date.getMinutes()), ss=pad(date.getSeconds());
    return `Emitido por “©oltyLAB ’26_${VERSION_FILE}_${dd}${mm}${yyyy}_${hh}:${mi}:${ss}”`;
  };
  try{emittedByTextV171=window.emittedByTextV171;}catch(_){ }

  window.addCellNote=function(cell,text){
    if(!cell||!text)return;
    let t=String(text||'').replace(/\s*\n\s*/g,' ').replace(/\s+/g,' ').trim();
    const low=t.toLowerCase();
    if(low.includes('peña')||low.includes('arrastre')) t='Dinero de la cuenta de la peña que se utiliza para colaborar en este evento.';
    if(low.includes('z_dev_ingresos')||low.includes('devolucion')||low.includes('devolución')) t='Este importe se corresponde con la/s devolucion/es realizadas en este evento.';
    const width=Math.max(360,Math.min(760,140+t.length*5.2));
    const height=Math.max(95,Math.min(220,70+Math.ceil(t.length/62)*34));
    try{cell.note={texts:[{text:t}],margins:{insetmode:'custom',inset:[0.20,0.20,0.45,0.45]},protection:{locked:true,lockText:true},editAs:'twoCells',width,height};}
    catch(_){try{cell.note=t;}catch(__){ }}
  };
  try{addCellNote=window.addCellNote;}catch(_){ }

  function patchExcelProtection(){
    try{
      if(window.ExcelJS && ExcelJS.Worksheet && ExcelJS.Worksheet.prototype.protect && !ExcelJS.Worksheet.prototype.protect.__v225Patched){
        const prev=ExcelJS.Worksheet.prototype.protect;
        const w=function(password,options){return prev.call(this,EXCEL_PASSWORD,options);};
        w.__v225Patched=true; ExcelJS.Worksheet.prototype.protect=w;
      }
    }catch(_){ }
  }

  // ---------- Fotos de tickets: almacenamiento bien hecho en IndexedDB + estado en memoria ----------
  let dbPromise=null;
  function openTicketDb(){
    if(dbPromise) return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      if(!('indexedDB' in window)){resolve(null);return;}
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{try{req.result.createObjectStore(DB_STORE);}catch(_){ }};
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||new Error('No se pudo abrir IndexedDB de tickets'));
    });
    return dbPromise;
  }
  async function idbPut(key,value){
    const db=await openTicketDb(); if(!db||!key||!value)return;
    await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put(value,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
  }
  async function idbDelete(key){
    const db=await openTicketDb(); if(!db||!key)return;
    await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).delete(key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
  }
  async function idbAll(){
    const db=await openTicketDb(); if(!db)return {};
    return await new Promise((resolve,reject)=>{
      const out={}; const tx=db.transaction(DB_STORE,'readonly'); const store=tx.objectStore(DB_STORE); const req=store.openCursor();
      req.onsuccess=()=>{const cur=req.result;if(cur){out[cur.key]=cur.value;cur.continue();}else resolve(out);};
      req.onerror=()=>reject(req.error); tx.onerror=()=>reject(tx.error);
    });
  }
  function isImage(v){const s=String(v||'');return s.length>80&&(/^data:image\//.test(s)||/^[A-Za-z0-9+/=\r\n]+$/.test(s.slice(0,140)));}
  function normalizeImage(v){let s=String(v||'').trim(); if(!s)return ''; if(/^data:image\//.test(s))return s; if(/^[A-Za-z0-9+/=\r\n]+$/.test(s)&&s.length>80)return 'data:image/jpeg;base64,'+s.replace(/\s+/g,''); return s;}
  function ticketToken(label){const m=String(label||'').match(/\bTK\s*\d+[A-Z0-9_-]*\b/i); return m?m[0].replace(/\s+/g,'').toUpperCase():'';}
  function ticketImageKey(label,eventId=currentEventId()){return `${eventId}|${String(label||'').trim()}`;}
  function candidateKeys(label,eventId=currentEventId()){
    const s=String(label||'').trim(); const arr=[]; const add=x=>{x=String(x||'').trim(); if(x&&!arr.includes(x))arr.push(x);};
    add(ticketImageKey(s,eventId)); add(`${eventId}|${s}`); add(s);
    const tk=ticketToken(s); if(tk){add(`${eventId}|${tk}`); add(tk);}
    const clean=s.split('·')[0].trim(); if(clean&&clean!==s){add(`${eventId}|${clean}`); add(clean); const tk2=ticketToken(clean); if(tk2){add(`${eventId}|${tk2}`); add(tk2);}}
    return arr;
  }
  function ensureTicketImages(){const s=stateRef(); if(!s.ticketImages||typeof s.ticketImages!=='object')s.ticketImages={}; return s.ticketImages;}
  function findTicketImage(label,eventId=currentEventId()){
    const imgs=ensureTicketImages();
    for(const k of candidateKeys(label,eventId)){const img=normalizeImage(imgs[k]); if(isImage(img))return img;}
    const tk=ticketToken(label); if(tk){
      const prefix=`${eventId}|`;
      for(const [k,v] of Object.entries(imgs)){if(String(k).startsWith(prefix)&&String(k).toUpperCase().includes(tk)){const img=normalizeImage(v); if(isImage(img))return img;}}
    }
    return '';
  }
  async function storeTicketImage(label,img,eventId=currentEventId()){
    img=normalizeImage(img); if(!isImage(img))return;
    const imgs=ensureTicketImages();
    for(const k of candidateKeys(label,eventId)){imgs[k]=img; await idbPut(k,img).catch(()=>{});}
  }
  async function deleteTicketImage(label,eventId=currentEventId()){
    const imgs=ensureTicketImages();
    const keys=candidateKeys(label,eventId);
    keys.forEach(k=>delete imgs[k]);
    await Promise.all(keys.map(k=>idbDelete(k).catch(()=>{})));
  }
  async function hydrateTicketImages(){
    const imgs=ensureTicketImages();
    for(const [k,v] of Object.entries(imgs)){const img=normalizeImage(v); if(isImage(img)){imgs[k]=img; await idbPut(k,img).catch(()=>{});}}
    const fromDb=await idbAll().catch(()=>({}));
    let changed=false;
    for(const [k,v] of Object.entries(fromDb)){const img=normalizeImage(v); if(isImage(img)&&!isImage(imgs[k])){imgs[k]=img; changed=true;}}
    return changed;
  }
  function resizeImageFile(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(new Error('No se pudo leer la foto'));
      reader.onload=e=>{
        const img=new Image();
        img.onerror=()=>reject(new Error('No se pudo procesar la foto'));
        img.onload=()=>{
          const maxW=1400,maxH=1400; let w=img.width,h=img.height; const ratio=Math.min(maxW/w,maxH/h,1); w=Math.round(w*ratio); h=Math.round(h*ratio);
          const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h; canvas.getContext('2d').drawImage(img,0,0,w,h);
          resolve(canvas.toDataURL('image/jpeg',0.86));
        };
        img.src=e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }
  async function persistNow(){try{if(typeof saveState==='function')saveState();}catch(_){ }}
  async function uploadTicketImageClean(encodedKey){
    const label=decodeURIComponent(encodedKey||''); if(!label)return;
    const input=document.createElement('input'); input.type='file'; input.accept='image/*';
    input.onchange=async ev=>{
      const file=ev.target.files&&ev.target.files[0]; if(!file)return;
      try{const dataUrl=await resizeImageFile(file); await storeTicketImage(label,dataUrl); await persistNow(); try{if(typeof render==='function')render();}catch(_){ }}
      catch(err){console.error(err); alert('No se pudo insertar la foto del ticket: '+(err.message||err));}
    };
    input.click();
  }
  async function removeTicketImageClean(encodedKey){
    const label=decodeURIComponent(encodedKey||''); if(!label)return;
    if(!confirm('¿Eliminar la foto asociada a este ticket/donación/gasto?'))return;
    await deleteTicketImage(label); await persistNow(); try{if(typeof render==='function')render();}catch(_){ }
  }
  window.uploadTicketImageV164=uploadTicketImageClean; window.removeTicketImageV164=removeTicketImageClean;
  window.uploadTicketImage=function(evOrEncoded,maybeEncoded){
    const encoded=typeof evOrEncoded==='string'?evOrEncoded:maybeEncoded;
    return uploadTicketImageClean(encoded);
  };
  window.removeTicketImage=removeTicketImageClean;
  try{uploadTicketImageV164=window.uploadTicketImageV164; removeTicketImageV164=window.removeTicketImageV164; uploadTicketImage=window.uploadTicketImage; removeTicketImage=window.removeTicketImage;}catch(_){ }
  window.__ceFindTicketImageV225=findTicketImage;

  const oldSaveState=(typeof saveState==='function')?saveState:null;
  if(oldSaveState&&!oldSaveState.__v225Clean){
    const wrapped=function(){
      hydrateTicketImages().catch(()=>{});
      const s=stateRef(); const full=s.ticketImages;
      try{
        // Evita que localStorage pierda datos por cuota al meter muchas fotos. Las fotos quedan en IndexedDB y, en memoria, para Excel.
        s.ticketImages={};
        if(typeof STORAGE_KEY!=='undefined')localStorage.setItem(STORAGE_KEY,JSON.stringify(s));
      }catch(_){ }
      finally{s.ticketImages=full;}
      try{
        if(authUser && (typeof canWriteRole!=='function'||canWriteRole()) && typeof pushStateToServer==='function'){
          clearTimeout(window.__ceV225RemoteTimer); window.__ceV225RemoteTimer=setTimeout(()=>{try{pushStateToServer();}catch(_){ }},150);
        }
      }catch(_){ }
    };
    wrapped.__v225Clean=true; try{saveState=wrapped;}catch(_){ } window.saveState=wrapped;
  }

  // Si cualquier render reconstruye la lista, asegura que las miniaturas usen las fotos de IndexedDB/estado.
  function fixTicketThumbs(){
    try{
      document.querySelectorAll('#summaryTiendaTicket .summary-item').forEach(row=>{
        const btn=row.querySelector('button[onclick*="uploadTicketImageV164"],button[onclick*="uploadTicketImage"]');
        if(!btn)return;
        const m=String(btn.getAttribute('onclick')||'').match(/'([^']+)'/); if(!m)return;
        const label=decodeURIComponent(m[1]); const img=findTicketImage(label); if(!img)return;
        let thumb=row.querySelector('img.ticket-thumb');
        const actions=row.querySelector('.ticket-actions'); if(!actions)return;
        if(!thumb){thumb=document.createElement('img');thumb.className='ticket-thumb';thumb.alt='ticket';actions.appendChild(thumb);} thumb.src=img;
        if(!actions.querySelector('button[data-ce-delete-img="1"],button[onclick*="removeTicketImage"]')){
          const del=document.createElement('button'); del.type='button'; del.className='outline small'; del.title='Eliminar foto'; del.dataset.ceDeleteImg='1'; del.textContent='🗑️'; del.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();removeTicketImageClean(encodeURIComponent(label));},true); actions.appendChild(del);
        }
      });
    }catch(_){ }
  }
  const prevRender=(typeof render==='function')?render:null;
  if(prevRender&&!prevRender.__v225Clean){
    const w=function(){const ret=prevRender.apply(this,arguments); setTimeout(fixTicketThumbs,40); return ret;};
    w.__v225Clean=true; try{render=w;}catch(_){ } window.render=w;
  }
  const prevExport=(typeof exportExcel==='function')?exportExcel:null;
  if(prevExport&&!prevExport.__v225Clean){
    const w=async function(){await hydrateTicketImages().catch(()=>{}); return await prevExport.apply(this,arguments);};
    w.__v225Clean=true; try{exportExcel=w;}catch(_){ } window.exportExcel=w;
  }

  function ensureTicketModal(){
    let modal=$('ceTicketImageModalV225'); if(modal)return modal;
    modal=document.createElement('div'); modal.id='ceTicketImageModalV225'; modal.className='ce-ticket-modal-v225';
    modal.innerHTML='<div class="ce-ticket-modal-v225-box"><button type="button" class="ce-ticket-modal-v225-close" title="Cerrar">×</button><img alt="Ticket ampliado"><div class="ce-ticket-modal-v225-hint">Pulsa fuera o ESC para cerrar</div></div>';
    modal.addEventListener('click',ev=>{if(ev.target===modal||ev.target.closest('.ce-ticket-modal-v225-close'))modal.classList.remove('visible');});
    document.body.appendChild(modal); return modal;
  }
  document.addEventListener('click',ev=>{const img=ev.target?.closest?.('img.ticket-thumb'); if(!img)return; ev.preventDefault(); ev.stopPropagation(); const modal=ensureTicketModal(); modal.querySelector('img').src=img.src; modal.classList.add('visible');},true);
  document.addEventListener('keydown',ev=>{if(ev.key==='Escape')$('ceTicketImageModalV225')?.classList.remove('visible');},true);

  // ---------- Claves: un solo botón estable, sin intervalos ni mensajes falsos ----------
  function unwrapPassword(input){
    if(!input)return null;
    let row=input.closest('.ce-v225-pass-row'); if(row)return row;
    const old=input.closest('.ce-v220-pass-wrap,.ce-v221-pass-wrap,.ce-v222-pass-wrap,.ce-v223-pass-wrap,.ce-v224-pass-row,.ce-v2242-pass-row,.ce-v2243-pass-row');
    if(old){old.className='ce-v225-pass-row'; old.querySelectorAll('button').forEach(b=>b.remove()); return old;}
    const parent=input.parentElement; if(!parent)return null;
    row=document.createElement('div'); row.className='ce-v225-pass-row'; parent.insertBefore(row,input); row.appendChild(input); return row;
  }
  function ensurePasswordButton(input){
    if(!input)return;
    const row=unwrapPassword(input); if(!row)return;
    row.querySelectorAll('button').forEach(b=>b.remove());
    const btn=document.createElement('button'); btn.type='button'; btn.className='ce-v225-eye'; btn.textContent=input.type==='text'?'Ocultar':'Ver'; btn.title='Ver/Ocultar clave';
    btn.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();
      const show=input.type==='password';
      if(show){
        // En ACCESOS, si el backend no entrega la clave, solo se podrá ver la nueva clave que se escriba.
        if(masked(input.value)||input.value==='Clave no disponible') input.value='';
        try{input.type='text';input.setAttribute('type','text');}catch(_){ } btn.textContent='Ocultar';
      }else{try{input.type='password';input.setAttribute('type','password');}catch(_){ } btn.textContent='Ver';}
      try{input.focus({preventScroll:true});}catch(_){ } return false;
    },true);
    row.appendChild(btn);
  }
  function cleanAccessPasswordFields(){
    try{
      document.querySelectorAll('#mtAcceso input[data-action="edit-acceso-clave"]').forEach(input=>{
        if(masked(input.value)||input.value==='Clave no disponible') input.value='';
        input.placeholder='Nueva clave (opcional)'; input.autocomplete='new-password';
        try{input.type='password';input.setAttribute('type','password');}catch(_){ }
        ensurePasswordButton(input);
      });
      const add=$('newAccesoClave'); if(add){add.placeholder='Clave'; ensurePasswordButton(add);}
    }catch(_){ }
  }
  function setupLoginPasswordButtons(){
    ensurePasswordButton($('loginClave')); ensurePasswordButton($('changeNewPassword1')); ensurePasswordButton($('changeNewPassword2'));
    const panel=$('changePasswordPanel'); if(panel){
      let actions=panel.querySelector('.auth-subactions'); if(!actions){actions=document.createElement('div');actions.className='auth-subactions';panel.appendChild(actions);}
      if(!$('btnCancelChangePassword')){const b=document.createElement('button'); b.type='button'; b.id='btnCancelChangePassword'; b.className='outline ce-v225-cancel'; b.textContent='Cancelar'; b.addEventListener('click',ev=>{ev.preventDefault(); panel.classList.add('hidden'); ['changeNewPassword1','changeNewPassword2'].forEach(id=>{const el=$(id); if(el)el.value='';}); const er=$('authError'); if(er)er.textContent='';},true); actions.insertBefore(b,actions.firstChild);}
    }
  }
  const prevRenderAcc=(typeof renderAcceso==='function')?renderAcceso:null;
  if(prevRenderAcc&&!prevRenderAcc.__v225Clean){
    const w=function(){const ret=prevRenderAcc.apply(this,arguments); setTimeout(cleanAccessPasswordFields,20); return ret;};
    w.__v225Clean=true; try{renderAcceso=w;}catch(_){ } window.renderAcceso=w;
  }
  const prevFetchAcc=(typeof fetchAccessUsers==='function')?fetchAccessUsers:null;
  if(prevFetchAcc&&!prevFetchAcc.__v225Clean){
    const w=async function(){const ret=await prevFetchAcc.apply(this,arguments); setTimeout(cleanAccessPasswordFields,30); return ret;};
    w.__v225Clean=true; try{fetchAccessUsers=w;}catch(_){ } window.fetchAccessUsers=w;
  }

  // ---------- Permisos RO/RW básicos sin tocar otras zonas ----------
  function setDisabled(el,disabled){if(!el)return; el.disabled=!!disabled; el.classList.toggle('ce-v225-ro-disabled',!!disabled); if(disabled)el.setAttribute('aria-disabled','true'); else el.removeAttribute('aria-disabled');}
  function applyPermissions(){
    updateVersion();
    const ro=isRO();
    ['btnOpenImport','btnExportSeed'].forEach(id=>{const el=$(id); if(el){el.classList.toggle('ce-v225-hidden',ro); setDisabled(el,ro); if(ro)el.title='No disponible para usuarios RO';}});
    ['btnStartImport','importWorkbookFile','importTicketFiles','importMode','btnClearImportStatus'].forEach(id=>setDisabled($(id),ro));
    if(ro){$('mtImportar')?.classList.add('hidden');}
    const excel=$('btnExportExcel'); if(excel){excel.classList.remove('ce-v225-hidden','ce-v225-ro-disabled','locked'); excel.disabled=false; excel.removeAttribute('aria-disabled');}
    const allow=canEvents();
    ['mtEventosBtn','btnAddEvento','newEventoTitulo','newEventoPrecio','newEventoFechaIni','newEventoFechaFin','newEventoSituacion','newEventoDescripcion'].forEach(id=>setDisabled($(id),!allow));
    document.querySelectorAll('[data-action^="edit-evento"],button[data-action="save-evento"],button[data-action="delete-evento"]').forEach(el=>setDisabled(el,!allow));
  }
  document.addEventListener('click',ev=>{const blocked=ev.target?.closest?.('#btnOpenImport,#btnExportSeed,#btnStartImport,#importWorkbookFile,#importTicketFiles,#ceBackupOkV181'); if(blocked&&isRO()){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();alert('Usuario RO: no autorizado para cargas ni descargas de datos. Sí puede descargar INFOEVENTO.'); return false;}},true);
  document.addEventListener('click',ev=>{if(!canEvents())return; const btn=ev.target?.closest?.('button'); if(!btn)return; const action=btn.dataset.action||btn.id||''; if(action==='btnAddEvento'&&typeof addEvento==='function'){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();addEvento();return false;} if(action==='save-evento'&&typeof saveEventRecord==='function'){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();saveEventRecord(btn.dataset.id);return false;}},true);

  async function init(){
    updateVersion(); patchExcelProtection(); setupLoginPasswordButtons(); cleanAccessPasswordFields(); applyPermissions();
    await hydrateTicketImages().catch(()=>{}); fixTicketThumbs();
    try{if(typeof render==='function')render();}catch(_){ }
  }
  document.addEventListener('DOMContentLoaded',()=>{setTimeout(init,30);});
  window.addEventListener('load',()=>{setTimeout(init,80);});
  init();
})();

;/* ===== END legacy-inline-41-v225-clean-script.js ===== */


;/* ===== BEGIN legacy-inline-42-v226-mobile-responsive-script.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #42. */
/* ==== v22.8: menú móvil y navegación responsive ==== */
(function(){
  const VERSION='ControlEvent v28.10';
  const VERSION_FILE='ControlEvent_v28_10';
  function $(id){return document.getElementById(id)}
  function clickId(id){const el=$(id); if(el){el.click(); closeDrawer();}}
  function ensureMobileMenu(){
    if($('ceMobileMenuBtn')) return;
    const btn=document.createElement('button');
    btn.type='button'; btn.id='ceMobileMenuBtn'; btn.className='mobile-menu-btn'; btn.innerHTML='<span>☰</span><span>Menú</span>';
    const backdrop=document.createElement('div'); backdrop.id='ceMobileDrawerBackdrop'; backdrop.className='mobile-drawer-backdrop';
    const drawer=document.createElement('aside'); drawer.id='ceMobileDrawer'; drawer.className='mobile-drawer'; drawer.setAttribute('aria-label','Menú móvil ControlEvent');
    drawer.innerHTML=`
      <div class="mobile-drawer-head"><div><div class="mobile-drawer-title">ControlEvent</div><div class="hint">Modo móvil</div></div><button type="button" class="mobile-drawer-close" id="ceMobileDrawerClose">Cerrar</button></div>
      <div class="mobile-menu-section"><h3>Evento</h3><div class="mobile-menu-grid">
        <button type="button" class="mobile-menu-action primary" data-target="tabIngresosBtn"><span class="mi">🤝</span>Ingresos</button>
        <button type="button" class="mobile-menu-action" data-target="tabDonacionesBtn"><span class="mi">🎁</span>Donaciones</button>
        <button type="button" class="mobile-menu-action" data-target="tabComprasBtn"><span class="mi">🛒</span>Compras y gastos</button>
        <button type="button" class="mobile-menu-action" data-target="tabResumenBtn"><span class="mi">🧾</span>Resumen</button>
        <button type="button" class="mobile-menu-action" data-target="tabGraficasBtn"><span class="mi">📊</span>Gráficas</button>
      </div></div>
      <div class="mobile-menu-section"><h3>Herramientas</h3><div class="mobile-menu-grid">
        <button type="button" class="mobile-menu-action" data-target="btnExportExcel"><span class="mi">📗</span>Excel INFOEVENTO</button>
        <button type="button" class="mobile-menu-action" data-target="btnToggleMaintenance"><span class="mi">🧩</span>Mantenimiento</button>
        <button type="button" class="mobile-menu-action" data-target="btnOpenImport"><span class="mi">📥</span>Carga inicial</button>
        <button type="button" class="mobile-menu-action" data-target="btnExportSeed"><span class="mi">💾</span>Backup / descarga</button>
      </div></div>
      <div class="mobile-menu-section"><h3>Vista</h3><div class="mobile-menu-grid">
        <button type="button" class="mobile-menu-action" data-target="toggleEventDesc"><span class="mi">ⓘ</span>Descripción del evento</button>
        <button type="button" class="mobile-menu-action" data-target="toggleIngresosSummary"><span class="mi">💰</span>Resumen de ingresos</button>
        <button type="button" class="mobile-menu-action" data-target="toggleComprasEvent"><span class="mi">🧰</span>Compras del evento</button>
        <button type="button" class="mobile-menu-action" data-target="toggleComprasSummary"><span class="mi">📈</span>Cálculos / resumen</button>
      </div></div>`;
    document.body.appendChild(btn); document.body.appendChild(backdrop); document.body.appendChild(drawer);
    btn.addEventListener('click',openDrawer);
    backdrop.addEventListener('click',closeDrawer);
    $('ceMobileDrawerClose')?.addEventListener('click',closeDrawer);
    drawer.addEventListener('click',function(ev){const b=ev.target.closest('[data-target]'); if(!b) return; ev.preventDefault(); clickId(b.getAttribute('data-target'));});
    document.addEventListener('keydown',function(ev){if(ev.key==='Escape') closeDrawer();});
  }
  function openDrawer(){document.body.classList.add('mobile-drawer-open')}
  function closeDrawer(){document.body.classList.remove('mobile-drawer-open')}
  function refreshVersion(){
    try{document.title=VERSION;}catch(_){ }
    try{document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||'')) el.textContent=VERSION;});}catch(_){ }
    try{const proto=HTMLAnchorElement.prototype; if(!proto.click.__v226Wrapped){const prev=proto.click; const w=function(){try{if(this.download)this.download=String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig,VERSION_FILE);}catch(_){ } return prev.apply(this,arguments);}; w.__v226Wrapped=true; proto.click=w;}}catch(_){ }
  }
  function applyMobileHelpers(){
    ensureMobileMenu(); refreshVersion();
    try{document.querySelectorAll('.itemcard').forEach(card=>{ if(!card.dataset.mobileCardReady) card.dataset.mobileCardReady='1'; });}catch(_){ }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',applyMobileHelpers); else applyMobileHelpers();
  const prevRender=typeof render==='function'?render:null;
  if(prevRender && !prevRender.__v226Wrapped){
    const wrapped=function(){const r=prevRender.apply(this,arguments); setTimeout(applyMobileHelpers,80); setTimeout(applyMobileHelpers,500); return r;};
    wrapped.__v226Wrapped=true; render=wrapped; window.render=render;
  }
  setTimeout(applyMobileHelpers,500); setTimeout(applyMobileHelpers,1600);
})();

;/* ===== END legacy-inline-42-v226-mobile-responsive-script.js ===== */


;/* ===== BEGIN legacy-inline-43-v227-fixes-script.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #43. */
(function(){
  'use strict';
  const VERSION='v22.8';
  const $=id=>document.getElementById(id);
  const st=()=>window.state||state;
  const esc=s=>String(s??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  const canEventsV227=()=>!!window.authUser && ['RW','GD'].includes(String(window.authUser.nivel||''));

  // 1) Cambio de evento: no refrescar desde servidor justo después ni volver al anterior.
  window.changeSelectedEvent = async function(value){
    const s=st();
    const id=String(value||'');
    if(!id) return;
    s.selectedEventId=id;
    try{ localStorage.setItem(typeof STORAGE_KEY!=='undefined'?STORAGE_KEY:'controlevent_v6_4', JSON.stringify(s)); }catch(_){ }
    try{ if(typeof saveState==='function') saveState(); }catch(_){ }
    try{ if(typeof render==='function') render(); }catch(_){ }
    const sel=$('selectedEvent'); if(sel) sel.value=id;
    try{
      if(window.authUser && ['RW','GD'].includes(String(window.authUser.nivel||'')) && typeof pushStateToServer==='function'){
        clearTimeout(window.__ceV227EventSaveTimer);
        window.__ceV227EventSaveTimer=setTimeout(()=>{try{pushStateToServer();}catch(_){}},120);
      }
    }catch(_){ }
  };
  document.addEventListener('change',function(ev){
    if(ev.target && ev.target.id==='selectedEvent'){
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      window.changeSelectedEvent(ev.target.value);
      return false;
    }
  },true);

  // 2) EVENTOS: RW/GD puede modificar; se guarda siempre la situación del registro editado.
  window.saveEventRecord = function(id){
    if(!canEventsV227()) return;
    const s=st();
    const ev=(s.eventos||[]).find(x=>String(x.id)===String(id));
    if(!ev) return;
    const val=(action, fallback='')=>{
      const el=document.querySelector(`[data-action="${action}"][data-id="${CSS.escape(String(id))}"]`);
      return el ? el.value : fallback;
    };
    ev.titulo=String(val('edit-evento-titulo',ev.titulo||'')).trim();
    ev.precio=Number(val('edit-evento-precio',ev.precio||0)||0);
    ev.fechaIni=String(val('edit-evento-fechaini',ev.fechaIni||'')).trim();
    ev.fechaFin=String(val('edit-evento-fechafin',ev.fechaFin||'')).trim();
    ev.descripcion=String(val('edit-evento-descripcion',ev.descripcion||'')).trim();
    ev.situacion=String(val('edit-evento-situacion',ev.situacion||'En curso')||'En curso');
    try{ localStorage.setItem(typeof STORAGE_KEY!=='undefined'?STORAGE_KEY:'controlevent_v6_4', JSON.stringify(s)); }catch(_){ }
    try{ if(typeof saveState==='function') saveState(); }catch(_){ }
    try{ if(typeof render==='function') render(); }catch(_){ }
    try{ if(typeof pushStateToServer==='function'){ clearTimeout(window.__ceV227EventSaveTimer); window.__ceV227EventSaveTimer=setTimeout(()=>pushStateToServer(),120); } }catch(_){ }
  };
  document.addEventListener('click',function(ev){
    const btn=ev.target.closest?.('button[data-action="save-evento"]');
    if(!btn) return;
    ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
    window.saveEventRecord(btn.dataset.id);
    return false;
  },true);

  function ensureSelectedEnabled(){
    const sel=$('selectedEvent');
    if(sel){sel.disabled=false;sel.classList.remove('locked');sel.style.pointerEvents='auto';sel.style.opacity='1';}
    if(canEventsV227()){
      document.querySelectorAll('[data-action^="edit-evento-"],button[data-action="save-evento"],#mtEventosBtn').forEach(el=>{
        el.disabled=false; el.classList.remove('locked'); el.style.pointerEvents='auto'; el.style.opacity='1';
      });
    }
  }
  const prevRenderLock=typeof renderLockState==='function'?renderLockState:null;
  if(prevRenderLock&&!prevRenderLock.__v227){
    const w=function(){const ret=prevRenderLock.apply(this,arguments); ensureSelectedEnabled(); return ret;};
    w.__v227=true; try{renderLockState=w;}catch(_){} window.renderLockState=w;
  }

  // 3) Menú móvil: botón Cerrar al final y cierre por delegación robusta.
  function patchMobileMenu(){
    const drawer=$('ceMobileDrawer');
    if(!drawer) return;
    drawer.querySelector('#ceMobileDrawerClose')?.remove();
    let grid=drawer.querySelector('#ceMobileCloseGridV227');
    if(!grid){
      const sec=document.createElement('div');
      sec.className='mobile-menu-section';
      sec.innerHTML='<h3>Salir</h3><div class="mobile-menu-grid" id="ceMobileCloseGridV227"><button type="button" class="mobile-menu-action close-v227" data-mobile-close-v227="1"><span class="mi">×</span>Cerrar menú</button></div>';
      drawer.appendChild(sec);
    }
  }
  function closeMobile(){document.body.classList.remove('mobile-drawer-open');}
  document.addEventListener('click',function(ev){
    if(ev.target.closest?.('[data-mobile-close-v227],#ceMobileDrawerBackdrop')){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();closeMobile();return false;}
  },true);
  const prevInitMobile=window.__ceInitMobileResponsive;
  window.__cePatchMobileV227=patchMobileMenu;
  setTimeout(patchMobileMenu,200);
  setTimeout(patchMobileMenu,1000);

  // 4) ACCESOS: render limpio, sin parches antiguos ni campos temblando. La clave existente solo se ve si backend la entrega.
  function realClave(u){
    for(const k of ['clave','password','pass','claveClara','clave_plana','plainPassword']){
      const v=u&&u[k];
      if(v!=null && String(v).trim() && !/^•+$/.test(String(v).trim())) return String(v);
    }
    return '';
  }
  function passRowHTML(id,value,placeholder='Nueva clave (opcional)'){
    const has=value!=='';
    return `<div class="ce-v227-pass-row"><input type="password" value="${esc(value)}" placeholder="${esc(placeholder)}" autocomplete="new-password" data-ce-acceso-clave-v227="${esc(id)}" /><button type="button" class="ce-v227-eye" data-ce-eye-v227="${esc(id)}">Ver</button></div>${has?'':'<div class="ce-v227-access-note">La clave guardada no está disponible en claro. Escribe una nueva clave solo si quieres cambiarla.</div>'}`;
  }
  window.renderAcceso = function(){
    const wrap=$('accesoList'); if(!wrap) return;
    if(typeof isGodRole==='function' && !isGodRole()){wrap.innerHTML='<div class="empty">Solo un usuario GD puede consultar esta tabla.</div>';return;}
    const list=(window.accessUsers||accessUsers||[]).slice().sort((a,b)=>String(a.nombre||'').localeCompare(String(b.nombre||''),'es'));
    if(!list.length){wrap.innerHTML='<div class="empty">No hay usuarios en ACCESO.</div>';return;}
    wrap.innerHTML='';
    list.forEach(u=>{
      const id=String(u.identificacion||'');
      const row=document.createElement('div'); row.className='itemcard maint-soft';
      row.innerHTML=`<div class="rowline persona">
        <div class="field"><label>Identificación</label><input value="${esc(id)}" data-action="edit-acceso-identificacion" data-id="${esc(id)}" /></div>
        <div class="field"><label>Nombre</label><input value="${esc(u.nombre||'')}" data-action="edit-acceso-nombre" data-id="${esc(id)}" /></div>
        <div class="field"><label>Clave</label>${passRowHTML(id,realClave(u))}</div>
        <div class="field"><label>Nivel</label><select data-action="edit-acceso-nivel" data-id="${esc(id)}">${['RO','RW','GD'].map(v=>`<option value="${v}" ${v===u.nivel?'selected':''}>${v}</option>`).join('')}</select></div>
        <button type="button" class="modify small" data-action="save-acceso" data-id="${esc(id)}">Modificar</button>
        <button type="button" class="danger small" data-action="delete-acceso" data-id="${esc(id)}" ${window.authUser&&id===window.authUser.identificacion?'disabled':''}>Eliminar</button>
      </div>`;
      wrap.appendChild(row);
    });
  };
  window.saveAccessUser = async function(existingId=''){
    if(typeof isGodRole==='function' && !isGodRole()) return;
    const id=String(existingId||'');
    const get=(action,fallback='')=>{const el=document.querySelector(`[data-action="${action}"][data-id="${CSS.escape(id)}"]`); return el?el.value:fallback;};
    const identificacion=id?String(get('edit-acceso-identificacion',id)).trim():String($('newAccesoIdentificacion')?.value||'').trim();
    const nombre=id?String(get('edit-acceso-nombre','')).trim():String($('newAccesoNombre')?.value||'').trim();
    const clave=id?String(document.querySelector(`[data-ce-acceso-clave-v227="${CSS.escape(id)}"]`)?.value||''):String($('newAccesoClave')?.value||'');
    const nivel=id?String(get('edit-acceso-nivel','RO')):String($('newAccesoNivel')?.value||'RO');
    if(!identificacion||!nombre||(!id&&!clave)){alert('Identificación, nombre y clave son obligatorios al dar de alta.');return;}
    const payload={identificacion,nombre,nivel,existingId:id};
    if(clave) payload.clave=clave;
    const res=await fetch('/api/access-users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data.ok){alert(data.error||'No se pudo guardar el usuario de acceso.');return;}
    if(!id){['newAccesoIdentificacion','newAccesoNombre','newAccesoClave'].forEach(x=>{const el=$(x); if(el)el.value='';}); const lv=$('newAccesoNivel'); if(lv)lv.value='RO';}
    if(typeof fetchAccessUsers==='function') await fetchAccessUsers();
    try{renderAcceso();renderPermissions?.();renderMaintenanceTabs?.();}catch(_){ }
  };
  document.addEventListener('click',function(ev){
    const eye=ev.target.closest?.('[data-ce-eye-v227]');
    if(eye){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation(); const id=eye.getAttribute('data-ce-eye-v227'); const input=document.querySelector(`[data-ce-acceso-clave-v227="${CSS.escape(id)}"]`); if(!input)return false; const show=input.type==='password'; input.type=show?'text':'password'; eye.textContent=show?'Ocultar':'Ver'; input.focus({preventScroll:true}); return false;}
    const save=ev.target.closest?.('button[data-action="save-acceso"]');
    if(save){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation(); window.saveAccessUser(save.dataset.id||''); return false;}
  },true);

  const prevRender=typeof render==='function'?render:null;
  if(prevRender&&!prevRender.__v227){
    const w=function(){const ret=prevRender.apply(this,arguments); setTimeout(()=>{ensureSelectedEnabled();patchMobileMenu();},30); return ret;};
    w.__v227=true; try{render=w;}catch(_){} window.render=w;
  }
  document.addEventListener('DOMContentLoaded',()=>{ensureSelectedEnabled();patchMobileMenu();},true);
  setTimeout(()=>{ensureSelectedEnabled();patchMobileMenu();},500);
})();

;/* ===== END legacy-inline-43-v227-fixes-script.js ===== */


;/* ===== BEGIN legacy-inline-44-v228-role-permissions-script.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #44. */
/* ==== v22.8: criterios de opciones y permisos por nivel GD/RW/RO ==== */
(function(){
  const VERSION='ControlEvent v28.10';
  const VERSION_FILE='ControlEvent_v28_10';
  function $(id){return document.getElementById(id)}
  function role(){try{return String((typeof authUser!=='undefined'&&authUser&&authUser.nivel)||'').toUpperCase();}catch(_){return '';}}
  function isGD(){return role()==='GD'}
  function isRW(){return role()==='RW'}
  function isRO(){return role()==='RO'}
  function ev(){try{return (typeof selectedEvent==='function'&&selectedEvent()) || (typeof state!=='undefined' && state.eventos||[]).find(e=>String(e.id)===String(state.selectedEventId)) || null;}catch(_){return null;}}
  function isFinalized(){return String(ev()?.situacion||'').toUpperCase()==='FINALIZADO';}
  function show(el,yes){if(!el)return; el.classList.toggle('hidden-by-role-v228',!yes); if(yes){el.style.removeProperty('display');}else{el.style.setProperty('display','none','important');}}
  function setDisabled(el,yes){if(!el)return; el.disabled=!!yes; if(yes)el.setAttribute('aria-disabled','true'); else el.removeAttribute('aria-disabled');}
  function setBodyRole(){
    document.body.classList.toggle('ce-role-gd',isGD());
    document.body.classList.toggle('ce-role-rw',isRW());
    document.body.classList.toggle('ce-role-ro',isRO());
    document.body.classList.toggle('ce-event-finalized',isFinalized());
    document.body.classList.toggle('ce-event-not-finalized',!isFinalized());
  }
  function hideMobileTarget(target,visible){document.querySelectorAll(`.mobile-menu-action[data-target="${target}"]`).forEach(el=>show(el,visible));}
  function ensureRoInfo(){
    const body=$('comprasSummaryBody'); if(!body)return;
    let box=$('ceRoInfoV228');
    if(isRO()){
      if(!box){box=document.createElement('div'); box.id='ceRoInfoV228'; box.className='ce-ro-info-v228'; box.textContent='Modo consulta: este usuario puede consultar Resumen, Cálculos por agrupación y Gráficas. No puede añadir, modificar ni eliminar datos ni fotos.'; body.insertBefore(box,body.firstChild);} 
    }else if(box){box.remove();}
  }
  function switchToAllowedForRO(){
    if(!isRO())return;
    try{
      const resumen=$('tabResumen'), graficas=$('tabGraficas');
      const currentResumen=resumen&&!resumen.classList.contains('hidden');
      const currentGraficas=graficas&&!graficas.classList.contains('hidden');
      if(!currentResumen && !currentGraficas){
        if(typeof currentMainTab!=='undefined') currentMainTab='resumen';
        if(typeof render==='function') render();
      }
      const body=$('comprasSummaryBody'); if(body) body.classList.remove('hidden');
      const btn=$('toggleComprasSummary'); if(btn) btn.setAttribute('aria-expanded','true');
    }catch(_){ }
  }
  function applyRoleVisibility(){
    setBodyRole();
    const ro=isRO(), rw=isRW(), gd=isGD();
    // Menú principal de pestañas
    show($('tabIngresosBtn'), !ro);
    show($('tabDonacionesBtn'), !ro);
    show($('tabComprasBtn'), !ro);
    show($('tabResumenBtn'), gd||rw||ro);
    show($('tabGraficasBtn'), gd||rw||ro);
    // Pestañas/contenedores si un render antiguo los deja visibles
    if(ro){ show($('tabIngresos'),false); show($('tabDonaciones'),false); show($('tabCompras'),false); }
    // Herramientas del pie
    show($('btnExportExcel'), (gd||rw||ro) && (!ro || isFinalized()));
    setDisabled($('btnExportExcel'), ro && !isFinalized());
    show($('btnOpenImport'), gd);
    show($('btnExportSeed'), gd);
    show($('btnToggleMaintenance'), gd||rw);
    // Mantenimiento ACCESOS solo GD. RW mantiene el resto de tablas, incluido EVENTOS.
    show($('mtAccesoBtn'), gd);
    if(!gd){ show($('mtAccesos'),false); show($('mtAcceso'),false); }
    // Menú móvil
    ['tabIngresosBtn','tabDonacionesBtn','tabComprasBtn'].forEach(t=>hideMobileTarget(t,!ro));
    hideMobileTarget('tabResumenBtn',gd||rw||ro);
    hideMobileTarget('tabGraficasBtn',gd||rw||ro);
    hideMobileTarget('btnExportExcel',(gd||rw||ro) && (!ro || isFinalized()));
    hideMobileTarget('btnToggleMaintenance',gd||rw);
    hideMobileTarget('btnOpenImport',gd);
    hideMobileTarget('btnExportSeed',gd);
    // RO: resumen/graficas solo consulta. Oculta botones de foto, aunque por si aparecen hay bloqueo por captura.
    if(ro){
      document.querySelectorAll('#summaryTiendaTicket .ticket-actions button,#summaryTiendaTicket input[type="file"],#summaryTiendaTicket .ce-photo-btn-v202,#summaryTiendaTicket [data-ce-delete-img]').forEach(el=>{el.style.setProperty('display','none','important');});
    }
    ensureRoInfo();
    switchToAllowedForRO();
  }
  function block(msg,ev){try{ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();}catch(_){ } if(msg) alert(msg); return false;}
  document.addEventListener('click',function(evnt){
    const t=evnt.target; if(!t||!t.closest)return;
    const blockedRWorRO=t.closest('#btnOpenImport,#btnExportSeed,#btnStartImport,#importWorkbookFile,#importTicketFiles,#ceBackupOkV181,.mobile-menu-action[data-target="btnOpenImport"],.mobile-menu-action[data-target="btnExportSeed"]');
    if(blockedRWorRO && (isRO()||isRW())) return block((isRO()?'Usuario RO':'Usuario RW')+': no autorizado para carga ni descarga de datos.',evnt);
    const access=t.closest('#mtAccesoBtn,.mobile-menu-action[data-target="mtAccesoBtn"],[data-action="open-acceso"],[data-action="save-acceso"],[data-action="delete-acceso"],#btnAddAcceso,#newAccesoIdentificacion,#newAccesoClave,#newAccesoNivel');
    if(access && !isGD()) return block('No autorizado: el mantenimiento de ACCESOS solo está disponible para usuarios GD.',evnt);
    if(isRO()){
      const deniedTab=t.closest('#tabIngresosBtn,#tabDonacionesBtn,#tabComprasBtn,#btnToggleMaintenance,.mobile-menu-action[data-target="tabIngresosBtn"],.mobile-menu-action[data-target="tabDonacionesBtn"],.mobile-menu-action[data-target="tabComprasBtn"],.mobile-menu-action[data-target="btnToggleMaintenance"]');
      if(deniedTab) return block('Usuario RO: solo consulta de Resumen, Cálculos por agrupación, Gráficas y Excel INFOEVENTO si el evento está finalizado.',evnt);
      const excel=t.closest('#btnExportExcel,.mobile-menu-action[data-target="btnExportExcel"]');
      if(excel && !isFinalized()) return block('Usuario RO: solo puede descargar INFOEVENTO cuando el evento está Finalizado.',evnt);
      const photo=t.closest('#summaryTiendaTicket .ticket-actions button,#summaryTiendaTicket input[type="file"],#summaryTiendaTicket .ce-photo-btn-v202,#summaryTiendaTicket [data-ce-delete-img],button[onclick*="uploadTicketImage"],button[onclick*="removeTicketImage"]');
      if(photo) return block('Usuario RO: modo consulta. No puede añadir ni eliminar fotos.',evnt);
    }
  },true);
  document.addEventListener('change',function(evnt){
    const t=evnt.target; if(!t||!t.closest)return;
    if((isRO()||isRW()) && t.closest('#importWorkbookFile,#importTicketFiles')) return block((isRO()?'Usuario RO':'Usuario RW')+': no autorizado para carga de datos.',evnt);
    if(isRO() && t.closest('#summaryTiendaTicket input[type="file"],input.ticket-file-input')) return block('Usuario RO: modo consulta. No puede añadir fotos.',evnt);
  },true);
  function guardPhotoFns(){
    ['uploadTicketImage','removeTicketImage','uploadTicketImageV164','removeTicketImageV164','uploadTicketImageV202','removeTicketImageV202'].forEach(name=>{
      try{const fn=window[name]; if(typeof fn==='function' && !fn.__v228Guard){const wrapped=function(){if(isRO()){alert('Usuario RO: modo consulta. No puede añadir ni eliminar fotos.'); return false;} return fn.apply(this,arguments);}; wrapped.__v228Guard=true; window[name]=wrapped;}}catch(_){ }
    });
  }
  function refreshVersion(){
    try{document.title=VERSION;}catch(_){ }
    try{document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||'')) el.textContent=VERSION;});}catch(_){ }
    try{const proto=HTMLAnchorElement.prototype; if(!proto.click.__v228Wrapped){const prev=proto.click; const w=function(){try{if(this.download)this.download=String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig,VERSION_FILE);}catch(_){ } return prev.apply(this,arguments);}; w.__v228Wrapped=true; proto.click=w;}}catch(_){ }
  }
  function applyAll(){refreshVersion(); guardPhotoFns(); applyRoleVisibility();}
  const oldRender=typeof render==='function'?render:null;
  if(oldRender && !oldRender.__v228RoleWrapped){
    const wrapped=function(){const r=oldRender.apply(this,arguments); setTimeout(applyAll,30); setTimeout(applyAll,300); return r;};
    wrapped.__v228RoleWrapped=true; render=wrapped; window.render=render;
  }
  ['DOMContentLoaded','load'].forEach(evt=>window.addEventListener(evt,()=>{setTimeout(applyAll,50);setTimeout(applyAll,500);},false));
  setInterval(applyAll,1800);
  applyAll();
})();

;/* ===== END legacy-inline-44-v228-role-permissions-script.js ===== */


;/* ===== BEGIN legacy-inline-45-v229-event-access-fixes-script.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #45. */
/* ==== v22.9: correcciones de evento finalizado y claves ACCESOS ==== */
(function(){
  'use strict';
  const VERSION='ControlEvent v28.10';
  const VERSION_FILE='ControlEvent_v28_10';
  const SELECT_KEY='controlevent_v229_selected_event_id';
  const ACCESS_CACHE_KEY='controlevent_v229_access_clear_cache';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function st(){try{return (typeof state!=='undefined'&&state)||window.state||{};}catch(_){return window.state||{};}}
  function role(){try{return String((typeof authUser!=='undefined'&&authUser&&authUser.nivel)||'').toUpperCase();}catch(_){return '';}}
  function isGD(){return role()==='GD';}
  function isRW(){return role()==='RW';}
  function evById(id){const s=st();return (s.eventos||[]).find(e=>String(e.id)===String(id))||null;}
  function currentEv(){const s=st();return evById(s.selectedEventId)||null;}
  function isFinalized(){return String(currentEv()?.situacion||'').toUpperCase()==='FINALIZADO';}
  function storageKey(){try{return typeof STORAGE_KEY!=='undefined'?STORAGE_KEY:'controlevent_v6_4';}catch(_){return 'controlevent_v6_4';}}
  function validEventId(id){return !!id && !!evById(id);}
  function rememberEvent(id){if(!validEventId(id))return; try{sessionStorage.setItem(SELECT_KEY,String(id));}catch(_){} try{localStorage.setItem(SELECT_KEY,String(id));}catch(_){} }
  function rememberedEvent(){let id=''; try{id=sessionStorage.getItem(SELECT_KEY)||'';}catch(_){} if(!id){try{id=localStorage.getItem(SELECT_KEY)||'';}catch(_){}} return validEventId(id)?String(id):'';}
  function persistStateLocal(){try{localStorage.setItem(storageKey(),JSON.stringify(st()));}catch(_){}}
  function enforceSelectedEvent(){
    const s=st(); if(!s||!Array.isArray(s.eventos)||!s.eventos.length)return;
    const id=rememberedEvent();
    if(id && String(s.selectedEventId)!==id){s.selectedEventId=id; persistStateLocal();}
    const sel=$('selectedEvent');
    if(sel){ sel.disabled=false; sel.classList.remove('locked'); sel.style.pointerEvents='auto'; sel.style.opacity='1'; if(id && sel.value!==id) sel.value=id; }
  }
  window.changeSelectedEvent = async function(value){
    const s=st(); const id=String(value||''); if(!validEventId(id))return;
    s.selectedEventId=id; rememberEvent(id); persistStateLocal();
    try{ if(typeof render==='function') render(); }catch(_){ }
    const sel=$('selectedEvent'); if(sel) sel.value=id;
    try{ if((isGD()||isRW()) && typeof pushStateToServer==='function'){ clearTimeout(window.__ceV229SelectedPush); window.__ceV229SelectedPush=setTimeout(()=>{try{pushStateToServer();}catch(_e){}},250); } }catch(_){ }
  };
  document.addEventListener('change',function(e){
    if(e.target&&e.target.id==='selectedEvent'){
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      window.changeSelectedEvent(e.target.value); return false;
    }
  },true);
  try{
    if(typeof mergeLoadedState==='function' && !mergeLoadedState.__v229){
      const old=mergeLoadedState;
      const w=function(serverState,defaults){const merged=old.apply(this,arguments); try{const id=rememberedEvent(); if(id&&(merged.eventos||[]).some(e=>String(e.id)===id)) merged.selectedEventId=id;}catch(_){} return merged;};
      w.__v229=true; mergeLoadedState=w; window.mergeLoadedState=w;
    }
  }catch(_){ }

  function isAllowedInFinalized(el){
    const id=el.id||''; const action=el.getAttribute?.('data-action')||'';
    if(['selectedEvent','btnExportExcel','btnLogout','toggleEventDesc','toggleIngresosSummary','toggleComprasSummary','toggleComprasEvent','ceMobileMenuBtn','ceMobileDrawerClose','btnToggleMaintenance','mtEventosBtn','tabIngresosBtn','tabComprasBtn','tabDonacionesBtn','tabResumenBtn','tabGraficasBtn'].includes(id)) return true;
    if(el.classList?.contains('tab')) return true;
    if(el.classList?.contains('mobile-menu-action')) return true;
    if((isGD()||isRW()) && (action==='save-evento' || action.startsWith('edit-evento-'))) return true;
    if(isGD() && id==='btnTogglePower') return true;
    return false;
  }
  function applyFinalizedConsulta(){
    const fin=isFinalized(); document.body.classList.toggle('ce-finalizado-consulta',fin);
    if(!fin) return;
    document.querySelectorAll('.app-lockable.locked,.locked').forEach(el=>{el.classList.remove('locked'); el.style.pointerEvents='auto'; el.style.opacity='1';});
    document.querySelectorAll('#mainTabs,#tabIngresos,#tabCompras,#tabDonaciones,#tabResumen,#tabGraficas,#maintenanceWrapper').forEach(el=>{if(el){el.style.pointerEvents='auto';el.style.opacity='1';}});
    document.querySelectorAll('button,input,select,textarea').forEach(el=>{
      if(isAllowedInFinalized(el)){el.disabled=false;el.removeAttribute('aria-disabled');return;}
      const action=el.getAttribute?.('data-action')||'';
      const mutable = el.matches('input,select,textarea,button') && !el.closest('.auth-card') && !el.closest('#authOverlay');
      if(mutable || /^save-|^delete-|^edit-/.test(action)){el.disabled=true;el.setAttribute('aria-disabled','true');}
    });
  }
  const oldRenderLock=typeof renderLockState==='function'?renderLockState:null;
  if(oldRenderLock && !oldRenderLock.__v229){
    const w=function(){const r=oldRenderLock.apply(this,arguments); enforceSelectedEvent(); applyFinalizedConsulta(); return r;};
    w.__v229=true; renderLockState=w; window.renderLockState=w;
  }

  // Guardar EVENTOS con RW/GD, incluido pasar Finalizado -> En curso.
  window.saveEventRecord = function(id){
    if(!(isGD()||isRW())) return;
    const s=st(); const ev=(s.eventos||[]).find(x=>String(x.id)===String(id)); if(!ev)return;
    const val=(action,fallback='')=>{const el=document.querySelector(`[data-action="${action}"][data-id="${CSS.escape(String(id))}"]`);return el?el.value:fallback;};
    ev.titulo=String(val('edit-evento-titulo',ev.titulo||'')).trim();
    ev.precio=Number(val('edit-evento-precio',ev.precio||0)||0);
    ev.fechaIni=String(val('edit-evento-fechaini',ev.fechaIni||'')).trim();
    ev.fechaFin=String(val('edit-evento-fechafin',ev.fechaFin||'')).trim();
    ev.descripcion=String(val('edit-evento-descripcion',ev.descripcion||'')).trim();
    ev.situacion=String(val('edit-evento-situacion',ev.situacion||'En curso')||'En curso');
    persistStateLocal(); try{if(typeof saveState==='function')saveState();}catch(_){}
    try{if(typeof render==='function')render();}catch(_){}
    try{if(typeof pushStateToServer==='function'){clearTimeout(window.__ceV229EventPush);window.__ceV229EventPush=setTimeout(()=>pushStateToServer(),250);}}catch(_){}
  };
  document.addEventListener('click',function(e){
    const btn=e.target.closest?.('button[data-action="save-evento"]'); if(!btn)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation(); window.saveEventRecord(btn.dataset.id); return false;
  },true);

  // ACCESOS: un único botón estable y cache local de claves escritas/modificadas.
  function getAccessCache(){try{return JSON.parse(localStorage.getItem(ACCESS_CACHE_KEY)||'{}')||{};}catch(_){return {};}}
  function setAccessCache(id,clave){if(!id||!clave)return; const c=getAccessCache(); c[String(id)]=String(clave); try{localStorage.setItem(ACCESS_CACHE_KEY,JSON.stringify(c));}catch(_){} }
  function realClave(u){const id=String(u?.identificacion||''); const c=getAccessCache(); const raw=(u&&(u.clave||u.password||u.pass||u.clearPassword||u.claveClaro))||c[id]||''; if(/^•+$|^\*+$/.test(String(raw)))return c[id]||''; return String(raw||'');}
  function passRowHTML(id,value){
    const v=String(value||'');
    return `<div class="ce-v229-pass-row"><input type="password" value="${esc(v)}" placeholder="Nueva clave (opcional)" autocomplete="new-password" data-ce-acceso-clave-v229="${esc(id)}" /><button type="button" class="ce-v229-eye" data-ce-eye-v229="${esc(id)}">Ver</button></div>${v?'':'<div class="ce-v229-access-note">La clave anterior no está disponible en claro. Escribe una nueva clave solo si quieres cambiarla.</div>'}`;
  }
  window.renderAcceso = function(){
    const wrap=$('accesoList'); if(!wrap)return;
    if(!isGD()){wrap.innerHTML='<div class="empty">Solo un usuario GD puede consultar esta tabla.</div>';return;}
    const list=((typeof accessUsers!=='undefined'&&accessUsers)||window.accessUsers||[]).slice().sort((a,b)=>String(a.nombre||'').localeCompare(String(b.nombre||''),'es'));
    if(!list.length){wrap.innerHTML='<div class="empty">No hay usuarios en ACCESO.</div>';return;}
    wrap.innerHTML='';
    list.forEach(u=>{const id=String(u.identificacion||''); const row=document.createElement('div'); row.className='itemcard maint-soft';
      row.innerHTML=`<div class="rowline persona">
        <div class="field"><label>Identificación</label><input value="${esc(id)}" data-action="edit-acceso-identificacion" data-id="${esc(id)}" /></div>
        <div class="field"><label>Nombre</label><input value="${esc(u.nombre||'')}" data-action="edit-acceso-nombre" data-id="${esc(id)}" /></div>
        <div class="field"><label>Clave</label>${passRowHTML(id,realClave(u))}</div>
        <div class="field"><label>Nivel</label><select data-action="edit-acceso-nivel" data-id="${esc(id)}">${['RO','RW','GD'].map(v=>`<option value="${v}" ${v===u.nivel?'selected':''}>${v}</option>`).join('')}</select></div>
        <button type="button" class="modify small" data-action="save-acceso" data-id="${esc(id)}">Modificar</button>
        <button type="button" class="danger small" data-action="delete-acceso" data-id="${esc(id)}" ${window.authUser&&id===window.authUser.identificacion?'disabled':''}>Eliminar</button>
      </div>`; wrap.appendChild(row); });
  };
  window.saveAccessUser = async function(existingId=''){
    if(!isGD()) return;
    const id=String(existingId||'');
    const get=(action,fallback='')=>{const el=document.querySelector(`[data-action="${action}"][data-id="${CSS.escape(id)}"]`);return el?el.value:fallback;};
    const identificacion=id?String(get('edit-acceso-identificacion',id)).trim():String($('newAccesoIdentificacion')?.value||'').trim();
    const nombre=id?String(get('edit-acceso-nombre','')).trim():String($('newAccesoNombre')?.value||'').trim();
    const clave=id?String(document.querySelector(`[data-ce-acceso-clave-v229="${CSS.escape(id)}"]`)?.value||''):String($('newAccesoClave')?.value||'');
    const nivel=id?String(get('edit-acceso-nivel','RO')):String($('newAccesoNivel')?.value||'RO');
    if(!identificacion||!nombre||(!id&&!clave)){alert('Identificación, nombre y clave son obligatorios al dar de alta.');return;}
    const payload={identificacion,nombre,nivel,existingId:id}; if(clave) payload.clave=clave;
    const res=await fetch('/api/access-users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data.ok){alert(data.error||'No se pudo guardar el usuario de acceso.');return;}
    if(clave) setAccessCache(identificacion,clave);
    if(!id){['newAccesoIdentificacion','newAccesoNombre','newAccesoClave'].forEach(x=>{const el=$(x); if(el)el.value='';}); const lv=$('newAccesoNivel'); if(lv)lv.value='RO';}
    try{if(typeof fetchAccessUsers==='function') await fetchAccessUsers();}catch(_){}
    try{renderAcceso(); if(typeof renderPermissions==='function')renderPermissions(); if(typeof renderMaintenanceTabs==='function')renderMaintenanceTabs();}catch(_){}
  };
  document.addEventListener('click',function(e){
    const eye=e.target.closest?.('[data-ce-eye-v229]');
    if(eye){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation(); const id=eye.getAttribute('data-ce-eye-v229'); const inp=document.querySelector(`[data-ce-acceso-clave-v229="${CSS.escape(id)}"]`); if(!inp)return false; const show=inp.type==='password'; inp.type=show?'text':'password'; eye.textContent=show?'Ocultar':'Ver'; inp.focus({preventScroll:true}); return false;}
    const save=e.target.closest?.('button[data-action="save-acceso"]');
    if(save){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation(); window.saveAccessUser(save.dataset.id||''); return false;}
  },true);

  function refreshVersion(){
    try{document.title=VERSION;}catch(_){ }
    try{document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||''))el.textContent=VERSION;});}catch(_){ }
    try{const proto=HTMLAnchorElement.prototype; if(!proto.click.__v229){const prev=proto.click; const w=function(){try{if(this.download)this.download=String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig,VERSION_FILE);}catch(_){} return prev.apply(this,arguments);}; w.__v229=true; proto.click=w;}}catch(_){ }
  }
  function applyAll(){refreshVersion(); enforceSelectedEvent(); applyFinalizedConsulta();}
  const oldRender=typeof render==='function'?render:null;
  if(oldRender && !oldRender.__v229){const w=function(){enforceSelectedEvent(); const r=oldRender.apply(this,arguments); setTimeout(applyAll,20); setTimeout(applyAll,250); return r;}; w.__v229=true; render=w; window.render=w;}
  ['DOMContentLoaded','load'].forEach(evt=>window.addEventListener(evt,()=>{setTimeout(applyAll,40);setTimeout(applyAll,500);},false));
  setInterval(applyAll,900);
  applyAll();
})();

;/* ===== END legacy-inline-45-v229-event-access-fixes-script.js ===== */


;/* ===== BEGIN legacy-inline-46-v233-estabilizacion-script.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #46. */
/* ==== v23.3 ESTABILIZACIÓN: login limpio, accesos, finalizado consultable, globos y rendimiento ==== */
(function(){
  'use strict';
  const VERSION='ControlEvent v28.10';
  const VERSION_FILE='ControlEvent_v28_10';
  const $=id=>document.getElementById(id);
  const norm=v=>String(v??'').trim();
  const up=v=>norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=v=>Number(v||0).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
  const num=v=>Number(v||0).toLocaleString('es-ES',{minimumFractionDigits:0,maximumFractionDigits:2});
  const cmp=(a,b)=>up(a).localeCompare(up(b),'es');
  function st(){try{return (typeof state!=='undefined' && state) || window.state || {};}catch(_){return window.state||{};}}
  function arr(n){const s=st(); return Array.isArray(s[n])?s[n]:[];}
  function role(){try{return up((typeof authUser!=='undefined' && authUser && authUser.nivel) || window.authUser?.nivel || '');}catch(_){return '';}}
  const isGD=()=>role()==='GD'; const isRW=()=>role()==='RW'; const isRO=()=>role()==='RO';
  function byId(list,id){return arr(list).find(x=>String(x.id)===String(id))||{};}
  function currentEvent(){try{return (typeof selectedEvent==='function'?selectedEvent():null)||byId('eventos',st().selectedEventId)||{};}catch(_){return byId('eventos',st().selectedEventId)||{};}}
  function eventId(){return String(currentEvent().id||st().selectedEventId||'');}
  function isFinalized(){return up(currentEvent().situacion)==='FINALIZADO';}
  function persona(id){try{return (typeof personaById==='function'?personaById(id):null)||byId('personas',id);}catch(_){return byId('personas',id);}}
  function producto(id){try{return (typeof productoById==='function'?productoById(id):null)||byId('productos',id);}catch(_){return byId('productos',id);}}
  function tienda(id){try{return (typeof tiendaById==='function'?tiendaById(id):null)||byId('tiendas',id);}catch(_){return byId('tiendas',id);}}
  function compras(){try{const r=(typeof comprasForEvent==='function'?comprasForEvent():null); if(Array.isArray(r))return r;}catch(_){} return arr('compras').filter(c=>String(c.eventId||'')===eventId());}
  function prodName(c){return norm(c?.producto?.nombre||producto(c?.productoId).nombre||'Producto');}
  function tiendaName(c){const p=producto(c?.productoId); return norm(c?.tienda?.nombre||tienda(c?.tiendaId||p.tiendaId||p.defaultTiendaId).nombre||'Sin tienda');}
  function donorName(c){try{if(typeof donorLabel==='function'&&c?.donorRef){const d=donorLabel(c.donorRef); if(norm(d))return d;}}catch(_){} const raw=norm(c?.donorRef||c?.donante||c?.donanteNombre||''); if(raw.startsWith('P:'))return persona(raw.slice(2)).nombre||'Sin donante'; if(raw.startsWith('T:'))return tienda(raw.slice(2)).nombre||'Sin donante'; return raw||c?.donorLabel||c?.responsable?.nombre||tiendaName(c)||'Sin donante';}
  function ticket(c){return norm(c?.ticketDonacion||c?.ticket||'');}
  function isDonation(v){try{return typeof isDonationTicket==='function'?isDonationTicket(v):up(v).startsWith('DONADO');}catch(_){return up(v).startsWith('DONADO');}}
  function isCurrent(v){try{return typeof isCurrentExpenseTicket==='function'?isCurrentExpenseTicket(v):up(v)==='GASTOS CORRIENTES';}catch(_){return up(v)==='GASTOS CORRIENTES';}}
  function units(c){return Number(c?.unidades??c?.uds??0);}
  function price(c){const p=producto(c?.productoId); return Number(c?.precio??c?.precioCalc??p.defaultPrecio??p.precio??0);}
  function value(c){return Number(c?.valor??(price(c)*units(c)));}
  function setTip(el,text,bg='#fff',layout='default'){if(!el||!norm(text))return; el.setAttribute('data-ce-tip-v21',text); el.setAttribute('data-tip-bg-v21',bg||'#fff'); el.setAttribute('data-ce-tip-layout-v21',layout||'default'); ['data-ce-tip-v196','data-ce-tip-v1952','data-ce-tip','data-v181-tip','data-tip','title'].forEach(a=>el.removeAttribute(a));}
  function table(title, header, lines, totalLabel, total){return [title,'',header].concat(lines.length?lines:['Sin registros'],'',`${totalLabel}: ${money(total||0)}`).join('\n');}

  // 1) Versión visible y descargas.
  function refreshVersion(){
    try{document.title=VERSION;}catch(_){}
    document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{ if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||'')) el.textContent=VERSION; });
    const proto=HTMLAnchorElement.prototype;
    if(!proto.__ce_v233_click){const old=proto.click; proto.click=function(){try{if(this.download)this.download=String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/g,VERSION_FILE);}catch(_){} return old.apply(this,arguments);}; proto.__ce_v233_click=true;}
  }

  // 2) Login: reconstrucción limpia del formulario de acceso para eliminar botones duplicados y campos bloqueados.
  function rebuildLogin(){
    const card=document.querySelector('#authOverlay .auth-card'); if(!card) return;
    if(card.dataset.ceV233Built==='1'){
      ['loginIdentificacion','loginClave','changeNewPassword1','changeNewPassword2'].forEach(id=>{const i=$(id); if(i){i.disabled=false;i.readOnly=false;i.style.pointerEvents='auto';}});
      return;
    }
    const oldIdent=$('loginIdentificacion')?.value||'';
    const oldClave=$('loginClave')?.value||'';
    card.dataset.ceV233Built='1';
    card.innerHTML=`
      <h2>Acceso a ControlEvent</h2>
      <div class="auth-grid">
        <div class="field"><label>Identificación</label><input id="loginIdentificacion" autocomplete="username" /></div>
        <div class="field"><label>Clave</label><div class="ce-pass-row-v233"><input id="loginClave" type="password" autocomplete="current-password" /><button type="button" class="outline small ce-pass-toggle-v233" data-target="loginClave">Ver</button></div></div>
      </div>
      <div id="authError" class="auth-error"></div>
      <div class="auth-actions">
        <button type="button" id="btnLogin">Entrar</button>
        <button type="button" class="outline" id="btnToggleChangePassword">Cambiar clave</button>
      </div>
      <div id="changePasswordPanel" class="auth-change-panel hidden">
        <div class="auth-grid">
          <div class="field"><label>Nueva clave</label><div class="ce-pass-row-v233"><input id="changeNewPassword1" type="password" autocomplete="new-password" /><button type="button" class="outline small ce-pass-toggle-v233" data-target="changeNewPassword1">Ver</button></div></div>
          <div class="field"><label>Repetir nueva clave</label><div class="ce-pass-row-v233"><input id="changeNewPassword2" type="password" autocomplete="new-password" /><button type="button" class="outline small ce-pass-toggle-v233" data-target="changeNewPassword2">Ver</button></div></div>
        </div>
        <div class="auth-subactions">
          <button type="button" id="btnChangePassword">Guardar nueva clave</button>
          <button type="button" class="outline" id="btnCancelChangePassword">Cancelar</button>
        </div>
      </div>`;
    $('loginIdentificacion').value=oldIdent; $('loginClave').value=oldClave;
  }
  document.addEventListener('click',function(e){
    const t=e.target.closest?.('.ce-pass-toggle-v233');
    if(t){e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); const input=$(t.dataset.target); if(input){input.type=input.type==='password'?'text':'password'; t.textContent=input.type==='password'?'Ver':'Ocultar'; input.focus({preventScroll:true});} return false;}
    const id=e.target.closest?.('button')?.id;
    if(id==='btnLogin'){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation(); try{doLogin();}catch(err){console.error(err); const er=$('authError'); if(er)er.textContent='Error en logon. Revisa consola.';} return false;}
    if(id==='btnToggleChangePassword'){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation(); $('authError')&&( $('authError').textContent='' ); $('changePasswordPanel')?.classList.toggle('hidden'); return false;}
    if(id==='btnCancelChangePassword'){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation(); $('changePasswordPanel')?.classList.add('hidden'); ['changeNewPassword1','changeNewPassword2'].forEach(x=>{const i=$(x); if(i)i.value='';}); $('authError')&&($('authError').textContent=''); return false;}
    if(id==='btnChangePassword'){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation(); try{doChangePassword();}catch(err){console.error(err); const er=$('authError'); if(er)er.textContent='Error al cambiar clave. Revisa consola.';} return false;}
  },true);

  // 3) ACCESOS limpio: solo GD, acceso por botón, campo estable con Ver/Ocultar.
  function accessUsersList(){try{return Array.isArray(accessUsers)?accessUsers:(Array.isArray(window.accessUsers)?window.accessUsers:[]);}catch(_){return Array.isArray(window.accessUsers)?window.accessUsers:[];}}
  function clearPwd(u){const c=norm(u?.clave||u?.password||u?.plainClave||u?.clearPassword||''); return /^[•*]+$/.test(c)?'':c;}
  function renderAccesosV233(){
    const wrap=$('accesoList'); if(!wrap)return;
    if(!isGD()){wrap.innerHTML='<div class="empty">Solo un usuario GD puede mantener ACCESOS.</div>'; return;}
    const list=accessUsersList().slice().sort((a,b)=>cmp(a.identificacion||a.nombre,b.identificacion||b.nombre));
    wrap.innerHTML='';
    if(!list.length){wrap.innerHTML='<div class="empty">No hay usuarios en ACCESOS.</div>';return;}
    list.forEach(u=>{const id=norm(u.identificacion||u.id||''); const clave=clearPwd(u); const safeId=id.replace(/[^a-zA-Z0-9_-]/g,'_'); const row=document.createElement('div'); row.className='itemcard maint-soft'; row.innerHTML=`
      <div class="rowline persona">
        <div class="field"><label>Identificación</label><input value="${esc(id)}" data-action="edit-acceso-identificacion" data-id="${esc(id)}" /></div>
        <div class="field"><label>Nombre</label><input value="${esc(u.nombre||'')}" data-action="edit-acceso-nombre" data-id="${esc(id)}" /></div>
        <div class="field"><label>Clave</label><div class="ce-pass-row-v233"><input id="accClave_${safeId}" type="password" value="${esc(clave)}" placeholder="Nueva clave (opcional)" data-action="edit-acceso-clave" data-id="${esc(id)}" autocomplete="new-password" /><button type="button" class="outline small ce-pass-toggle-v233" data-target="accClave_${safeId}">Ver</button></div></div>
        <div class="field"><label>Nivel</label><select data-action="edit-acceso-nivel" data-id="${esc(id)}">${['RO','RW','GD'].map(v=>`<option value="${v}" ${v===u.nivel?'selected':''}>${v}</option>`).join('')}</select></div>
        <button type="button" class="modify small" data-action="save-acceso" data-id="${esc(id)}">Modificar</button>
        <button type="button" class="danger small" data-action="delete-acceso" data-id="${esc(id)}" ${(typeof authUser!=='undefined'&&authUser&&id===authUser.identificacion)?'disabled':''}>Eliminar</button>
      </div>`; wrap.appendChild(row);});
  }
  async function openAccessV233(){
    if(!isGD()){alert('Solo un usuario GD puede mantener ACCESOS.'); return false;}
    const wrapper=$('maintenanceWrapper'); if(wrapper){wrapper.classList.remove('hidden');wrapper.classList.remove('ce-import-only-v212');}
    ['mtPersonas','mtEventos','mtTiendas','mtProductos','mtImportar','importPanel'].forEach(id=>$(id)?.classList.add('hidden'));
    $('mtAcceso')?.classList.remove('hidden'); $('mtAccesoBtn')?.classList.remove('hidden');
    try{if(typeof fetchAccessUsers==='function') await fetchAccessUsers(); else if(typeof fetchAccessIfNeeded==='function') await fetchAccessIfNeeded();}catch(err){console.warn('No se pudo recargar ACCESOS',err);}
    renderAccesosV233(); return false;
  }
  window.openAccessMaintenance=openAccessV233; try{renderAcceso=renderAccesosV233;}catch(_){} window.renderAcceso=renderAccesosV233;
  document.addEventListener('click',function(e){const btn=e.target.closest?.('#mtAccesoBtn,[data-target="mtAccesoBtn"],[data-action="open-acceso"]'); if(btn){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openAccessV233();return false;}},true);
  document.addEventListener('click',function(e){const b=e.target.closest?.('[data-action="save-acceso"],[data-action="delete-acceso"]'); if(!b)return; if(!isGD()){e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); alert('Solo GD puede mantener ACCESOS.'); return false;}},true);

  // 4) Evento finalizado: navegación consultable. Bloquea cambios fuera de EVENTOS.
  try{window.isLocked=function(){return false;}; if(typeof isLocked!=='undefined') isLocked=function(){return false;};}catch(_){}
  function isMutatingAction(action,id){
    if(!action&&!id)return false;
    if(/^tab|toggle|open|mt|btnExportExcel|btnLogout|selectedEvent|ceMobile|toggleIngresos|toggleCompras/.test(action||id||''))return false;
    return /add|save|delete|remove|upload|insert|modify|edit-|btnAdd|btnChange|btnStartImport|btnExportSeed|btnOpenImport|toggleEventPower|btnTogglePower/i.test(action||id||'');
  }
  document.addEventListener('click',function(e){
    if(!isFinalized())return;
    const el=e.target.closest?.('button,input,select,textarea'); if(!el||el.closest('#authOverlay'))return;
    const id=el.id||''; const action=el.getAttribute('data-action')||'';
    const inEventos=!!el.closest?.('#mtEventos');
    const inProductos=!!el.closest?.('#mtProductos');
    if(isMutatingAction(action,id) && !inEventos && !(isGD() && inProductos)){ e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); return false; }
  },true);
  function applyFinalizedUI(){
    document.body.classList.toggle('ce-v233-final-consulta',isFinalized());
    document.querySelectorAll('.locked,.app-lockable.locked').forEach(el=>{el.classList.remove('locked');el.style.pointerEvents='auto';el.style.opacity='1';el.style.filter='none';});
    if($('mtAccesoBtn')){$('mtAccesoBtn').classList.toggle('hidden',!isGD()); $('mtAccesoBtn').disabled=!isGD();}
  }

  // 5) Globos: cabecera primera, datos encolumnados, unidades y precio, TOTAL ESTIMADO en donaciones.
  function totalize(lines,keyFn,valFn,label){const out=[];let prev=null,sub=0;lines.forEach((r,i)=>{const k=keyFn(r); if(prev!==null&&k!==prev){out.push(`${label} ${prev} | | | | | ${money(sub)}`);out.push('');sub=0;} prev=k; out.push(r.__line); sub+=valFn(r); if(i===lines.length-1)out.push(`${label} ${k} | | | | | ${money(sub)}`);}); return out;}
  function graphDonationTips(){
    const wrap=$('eventChartWrap'); if(!wrap)return; const rows=wrap.querySelectorAll('.chart-row'); const segs=rows[1]?.querySelectorAll?.('.chart-seg')||[];
    [['DONADO TIENDA','Donado tiendas'],['DONADO SOCIO','Donado socios'],['DONADO OTROS','Donado no socios']].forEach(([code,title],i)=>{const seg=segs[i]; if(!seg)return; const data=compras().filter(c=>ticket(c)===code).map(c=>{c.__line=`${donorName(c)} | ${prodName(c)} | ${num(units(c))} | ${money(price(c))} | ${money(value(c))}`;return c;}).sort((a,b)=>cmp(donorName(a),donorName(b))||cmp(prodName(a),prodName(b))); const lines=totalize(data,donorName,value,'Total donante'); const total=data.reduce((s,c)=>s+value(c),0); setTip(seg,table('GRÁFICAS / DONACIÓN DE PRODUCTO / '+title,'Donante | Producto | Uds | Precio estimado | Valor estimado',lines,'TOTAL ESTIMADO',total),'#fff','graphdonationv233');});
  }
  function graphExpenseTips(){
    const wrap=$('eventChartWrap'); if(!wrap)return; const rows=wrap.querySelectorAll('.chart-row'); const segs=rows[2]?.querySelectorAll?.('.chart-seg')||[];
    [['ticket','Gastado por ticket'],['current','Gastos corrientes'],['pending','Pte. Compra u otros gastos']].forEach(([kind,title],i)=>{const seg=segs[i]; if(!seg)return; let data=compras().filter(c=>!isDonation(ticket(c))); if(kind==='ticket')data=data.filter(c=>ticket(c)&&!isCurrent(ticket(c))); if(kind==='current')data=data.filter(c=>isCurrent(ticket(c))); if(kind==='pending')data=data.filter(c=>!ticket(c)); data=data.map(c=>{c.__key=ticket(c)||'PTE.COMPRA'; c.__line=`${c.__key} | ${tiendaName(c)} | ${prodName(c)} | ${num(units(c))} | ${money(price(c))} | ${money(value(c))}`; return c;}).sort((a,b)=>cmp(a.__key,b.__key)||cmp(tiendaName(a),tiendaName(b))||cmp(prodName(a),prodName(b))); const lines=totalize(data,c=>c.__key,value,'Total'); const total=data.reduce((s,c)=>s+value(c),0); setTip(seg,table('GRÁFICAS / GASTOS / '+title,'Ticket | Tienda | Producto | Uds | Precio | Total',lines,'TOTAL',total),'#fff','graphexpensev233');});
  }
  function groupingTips(){
    [['summarySegmento','segmento','CÁLCULOS POR AGRUPACIÓN / POR SEGMENTO'],['summaryDestino','destino','CÁLCULOS POR AGRUPACIÓN / POR DESTINO']].forEach(([id,field,title])=>{const wrap=$(id); if(!wrap)return; wrap.querySelectorAll('.vbars-card').forEach(card=>{const label=norm((card.querySelector('.vbars-title')?.textContent||'').split('·')[0]); if(!label)return; const cols=card.querySelectorAll('.vbar-col'); const base=compras().filter(c=>norm(producto(c.productoId)[field]||c.producto?.[field]||'Sin '+field)===label); const specs=[['Comprado',c=>!isDonation(ticket(c))&&ticket(c)&&!isCurrent(ticket(c)),'#dc2626','groupingv233buy'],['Donado',c=>isDonation(ticket(c)),'#f59e0b','groupingv233don'],['Pte. Compra u otros gastos',c=>!isDonation(ticket(c))&&(!ticket(c)||isCurrent(ticket(c))),'#fb7185','groupingv233pending']]; specs.forEach(([name,filter,bg,layout],idx)=>{const data=base.filter(filter).map(c=>`${name==='Donado'?donorName(c):(ticket(c)||'PTE.COMPRA')} | ${tiendaName(c)} | ${prodName(c)} | ${num(units(c))} | ${money(price(c))} | ${money(value(c))}`).sort((a,b)=>cmp(a,b)); const total=base.filter(filter).reduce((s,c)=>s+value(c),0); const text=table(`${title} / ${label} / ${name}`,'Ticket/Donante | Tienda | Producto | Uds | Precio | Total',data,name==='Donado'?'TOTAL ESTIMADO':'TOTAL',total); const col=cols[idx]; if(col)setTip(col,text,bg,layout); const stick=col?.querySelector?.('.vbar-stick'); if(stick)setTip(stick,text,bg,layout);});});});
    const tt=$('summaryTiendaTicket'); if(tt)tt.querySelectorAll('[data-ce-tip-v21]').forEach(el=>{let t=el.getAttribute('data-ce-tip-v21')||''; if(/DONADO|Donado/i.test(t))el.setAttribute('data-ce-tip-v21',t.replace(/\bTOTAL\s*:/ig,'TOTAL ESTIMADO:'));});
  }

  // 6) RO: INFOEVENTO si evento finalizado.
  document.addEventListener('click',function(e){const b=e.target.closest?.('#btnExportExcel'); if(!b)return; if(isRO()&&!isFinalized()){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();alert('Usuario RO: solo puede sacar INFOEVENTO si el evento está Finalizado.');return false;}},true);

  let pending=false;
  function applyAll(){pending=false; refreshVersion(); rebuildLogin(); applyFinalizedUI(); graphDonationTips(); graphExpenseTips(); groupingTips();}
  function schedule(){if(pending)return; pending=true; (window.requestIdleCallback||window.requestAnimationFrame||setTimeout)(applyAll,{timeout:500});}
  const oldRender=typeof render==='function'?render:null;
  if(oldRender&&!oldRender.__ce_v233){const wrapped=function(){const r=oldRender.apply(this,arguments); schedule(); return r;}; wrapped.__ce_v233=true; try{render=wrapped; window.render=wrapped;}catch(_){} }
  document.addEventListener('DOMContentLoaded',()=>{applyAll();setTimeout(applyAll,500);},false);
  window.addEventListener('load',()=>{applyAll();setTimeout(applyAll,800);},false);
  document.addEventListener('click',()=>setTimeout(schedule,0),false);
  applyAll(); setTimeout(applyAll,600);
})();

;/* ===== END legacy-inline-46-v233-estabilizacion-script.js ===== */


;/* ===== BEGIN legacy-inline-47-v234-fixes-script.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #47. */
/* ==== v23.4: claves, gráfico/Excel, globos encolumnados, foto ampliada, RW EVENTOS, estado color ==== */
(function(){
  'use strict';
  const VERSION='ControlEvent v28.10';
  const VERSION_FILE='ControlEvent_v28_10';
  const $=id=>document.getElementById(id);
  const norm=v=>String(v??'').trim();
  const up=v=>norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const cmp=(a,b)=>up(a).localeCompare(up(b),'es');
  function parseNum(v){
    if(typeof v==='number') return Number.isFinite(v)?v:0;
    let s=String(v??'').trim(); if(!s)return 0;
    s=s.replace(/[^0-9,.-]/g,'');
    if(s.includes(',') && s.includes('.')) s=s.replace(/\./g,'').replace(',', '.');
    else if(s.includes(',')) s=s.replace(',', '.');
    const n=Number(s); return Number.isFinite(n)?n:0;
  }
  const money=v=>parseNum(v).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
  const num=v=>parseNum(v).toLocaleString('es-ES',{minimumFractionDigits:0,maximumFractionDigits:2});
  function st(){try{return (typeof state!=='undefined'&&state)||window.state||{};}catch(_){return window.state||{};}}
  function arr(n){const s=st();return Array.isArray(s[n])?s[n]:[];}
  function role(){try{return up((typeof authUser!=='undefined'&&authUser&&authUser.nivel)||window.authUser?.nivel||'');}catch(_){return '';}}
  const isRW=()=>role()==='RW'; const isGD=()=>role()==='GD';
  function byId(list,id){return arr(list).find(x=>String(x.id)===String(id))||{};}
  function ev(){try{return (typeof selectedEvent==='function'?selectedEvent():null)||byId('eventos',st().selectedEventId)||{};}catch(_){return byId('eventos',st().selectedEventId)||{};}}
  function evId(){return String(ev().id||st().selectedEventId||'');}
  function persona(id){try{return (typeof personaById==='function'?personaById(id):null)||byId('personas',id);}catch(_){return byId('personas',id);}}
  function producto(id){try{return (typeof productoById==='function'?productoById(id):null)||byId('productos',id);}catch(_){return byId('productos',id);}}
  function tienda(id){try{return (typeof tiendaById==='function'?tiendaById(id):null)||byId('tiendas',id);}catch(_){return byId('tiendas',id);}}
  function compras(){try{const r=(typeof comprasForEvent==='function'?comprasForEvent():null);if(Array.isArray(r))return r;}catch(_){} return arr('compras').filter(c=>String(c.eventId||'')===evId());}
  function collabs(){try{const r=(typeof collabsForEvent==='function'?collabsForEvent():null);if(Array.isArray(r))return r;}catch(_){} return arr('colaboradores').filter(c=>String(c.eventId||'')===evId()).map(c=>({...c,persona:persona(c.personaId)}));}
  function eventPrice(){return parseNum(ev().precio);}
  function rango(r){return up(r?.persona?.rango||persona(r?.personaId).rango||'');}
  function forma(r){return up(r?.situacion||'');}
  function personName(r){return norm(r?.persona?.nombre||persona(r?.personaId).nombre||'Sin nombre');}
  function socioAmount(r){return parseNum(r?.numero)*eventPrice();}
  function rowTotal(r){return rango(r)==='SOCIO'?socioAmount(r):(parseNum(r?.total)||parseNum(r?.donation)||parseNum(r?.importe));}
  function prodName(c){return norm(c?.producto?.nombre||producto(c?.productoId).nombre||'Producto');}
  function tiendaName(c){const p=producto(c?.productoId);return norm(c?.tienda?.nombre||tienda(c?.tiendaId||p.tiendaId||p.defaultTiendaId).nombre||'Sin tienda');}
  function ticket(c){return norm(c?.ticketDonacion||c?.ticket||'');}
  function isDon(v){try{return typeof isDonationTicket==='function'?isDonationTicket(v):up(v).startsWith('DONADO');}catch(_){return up(v).startsWith('DONADO');}}
  function isCurrent(v){try{return typeof isCurrentExpenseTicket==='function'?isCurrentExpenseTicket(v):up(v)==='GASTOS CORRIENTES';}catch(_){return up(v)==='GASTOS CORRIENTES';}}
  function units(c){return parseNum(c?.unidades??c?.uds??0);}
  function price(c){const p=producto(c?.productoId);return parseNum(c?.precio??c?.precioCalc??p.defaultPrecio??p.precio??0);}
  function value(c){return parseNum(c?.valor) || (units(c)*price(c));}
  function donorName(c){try{if(typeof donorLabel==='function'&&c?.donorRef){const d=donorLabel(c.donorRef);if(norm(d))return d;}}catch(_){} const raw=norm(c?.donorRef||c?.donante||c?.donanteNombre||''); if(raw.startsWith('P:'))return persona(raw.slice(2)).nombre||'Sin donante'; if(raw.startsWith('T:'))return tienda(raw.slice(2)).nombre||'Sin donante'; return raw||c?.donorLabel||c?.responsable?.nombre||tiendaName(c)||'Sin donante';}
  function setTip(el,text,bg='#fff',layout='default'){if(!el||!norm(text))return; el.setAttribute('data-ce-tip-v21',text); el.setAttribute('data-tip-bg-v21',bg||'#fff'); el.setAttribute('data-ce-tip-layout-v21',layout||'default'); ['data-ce-tip-v196','data-ce-tip-v1952','data-ce-tip','data-v181-tip','data-tip','title'].forEach(a=>el.removeAttribute(a));}
  function table(title,header,lines,totalLabel,total){return [title,'',header].concat(lines.length?lines:['Sin registros'],'',`${totalLabel}: ${money(total||0)}`).join('\n');}
  function totalize(data,keyFn,valFn,label){const out=[];let prev=null,sub=0;data.forEach((r,i)=>{const k=keyFn(r)||'Sin grupo'; if(prev!==null&&k!==prev){out.push(`${label} ${prev} | | | | ${money(sub)}`);out.push('');sub=0;} prev=k; out.push(r.__line); sub+=valFn(r); if(i===data.length-1)out.push(`${label} ${k} | | | | ${money(sub)}`);});return out;}

  function refreshVersion(){try{document.title=VERSION;}catch(_){} document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||''))el.textContent=VERSION;}); try{const proto=HTMLAnchorElement.prototype;if(!proto.__ce_v234_click){const old=proto.click;proto.click=function(){try{if(this.download)this.download=String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/g,VERSION_FILE);}catch(_){}return old.apply(this,arguments);};proto.__ce_v234_click=true;}}catch(_){} }

  // Claves: deja un solo botón estable por campo y elimina el primero/duplicados anteriores.
  function ensureOneToggle(input){
    if(!input)return; input.disabled=false; input.readOnly=false; input.style.pointerEvents='auto'; input.style.userSelect='text';
    const field=input.closest('.field')||input.parentElement; if(!field)return;
    field.querySelectorAll('button').forEach(b=>{const txt=up(b.textContent); if(txt==='VER'||txt==='OCULTAR'||/eye|toggle|pass|clave/i.test(b.className||'')) b.remove();});
    let row=input.closest('.ce-pass-row-v234');
    if(!row){row=document.createElement('div');row.className='ce-pass-row-v234';input.parentElement.insertBefore(row,input);row.appendChild(input);}    
    const btn=document.createElement('button');btn.type='button';btn.className='outline small ce-pass-toggle-v234';btn.textContent=input.type==='text'?'Ocultar':'Ver';
    btn.addEventListener('click',evnt=>{evnt.preventDefault();evnt.stopPropagation();evnt.stopImmediatePropagation();const show=input.type==='password';input.type=show?'text':'password';btn.textContent=show?'Ocultar':'Ver';try{input.focus({preventScroll:true});}catch(_){} return false;},true);
    row.appendChild(btn);
  }
  function normalizePasswordButtons(){['loginClave','changeNewPassword1','changeNewPassword2'].forEach(id=>ensureOneToggle($(id)));}

  // Gráficas: origen único y corregido para pantalla y Excel GRAFICAS.
  function graphPartsV234(){
    const rows=collabs();
    const comprasRows=compras();
    const sum=a=>a.reduce((s,x)=>s+parseNum(x),0);
    const incomeLine=r=>`${personName(r)} | ${num(r.numero||0)} | ${money(rango(r)==='SOCIO'?socioAmount(r):0)} | ${money(rango(r)==='SOCIO'?0:rowTotal(r))} | ${money(rowTotal(r))}`;
    const mkIncome=(label,filter,color)=>{const list=rows.filter(filter);return {label,value:sum(list.map(rowTotal)),color,lines:list.slice().sort((a,b)=>cmp(personName(a),personName(b))).map(incomeLine)};};
    const byTicket=code=>comprasRows.filter(c=>ticket(c)===code);
    const donationItem=(label,code,color)=>{const list=byTicket(code).slice().sort((a,b)=>cmp(donorName(a),donorName(b))||cmp(prodName(a),prodName(b)));return {label,value:sum(list.map(value)),color,lines:list.map(c=>`${donorName(c)} | ${prodName(c)} | ${num(units(c))} | ${money(price(c))} | ${money(value(c))}`)};};
    const expenseList=kind=>{let data=comprasRows.filter(c=>!isDon(ticket(c))); if(kind==='ticket')data=data.filter(c=>ticket(c)&&!isCurrent(ticket(c))); if(kind==='current')data=data.filter(c=>isCurrent(ticket(c))); if(kind==='pending')data=data.filter(c=>!ticket(c)); return data.slice().sort((a,b)=>cmp(ticket(a)||'PTE.COMPRA',ticket(b)||'PTE.COMPRA')||cmp(tiendaName(a),tiendaName(b))||cmp(prodName(a),prodName(b)));};
    const expenseItem=(label,kind,color)=>{const list=expenseList(kind);return {label,value:sum(list.map(value)),color,lines:list.map(c=>`${ticket(c)||'PTE.COMPRA'} | ${tiendaName(c)} | ${prodName(c)} | ${num(units(c))} | ${money(price(c))} | ${money(value(c))}`)};};
    const incomeItems=[
      mkIncome('Socios Banco',r=>rango(r)==='SOCIO'&&forma(r)==='BANCO','#2563eb'),
      mkIncome('Socios Bizum',r=>rango(r)==='SOCIO'&&forma(r)==='BIZUM','#16a34a'),
      mkIncome('Socios Efectivo',r=>rango(r)==='SOCIO'&&forma(r)==='EFECTIVO','#84cc16'),
      mkIncome('No socios Banco',r=>rango(r)!=='SOCIO'&&forma(r)==='BANCO','#60a5fa'),
      mkIncome('No socios Bizum',r=>rango(r)!=='SOCIO'&&forma(r)==='BIZUM','#34d399'),
      mkIncome('No socios Efectivo',r=>rango(r)!=='SOCIO'&&forma(r)==='EFECTIVO','#bef264'),
      mkIncome('Pendiente de ingresar',r=>forma(r)==='PENDIENTE','#f59e0b')
    ];
    const donationItems=[donationItem('Donado por tiendas','DONADO TIENDA','#fcd34d'),donationItem('Donado por socios','DONADO SOCIO','#f59e0b'),donationItem('Donado por no socios','DONADO OTROS','#b45309')];
    const expenseItems=[expenseItem('Gastado por ticket','ticket','#dc2626'),expenseItem('Gastos corrientes','current','#ef4444'),expenseItem('Pendiente de compra','pending','#fb7185')];
    const totalIncomeRaw=sum(incomeItems.map(i=>i.value)), totalDon=sum(donationItems.map(i=>i.value)), totalExp=sum(expenseItems.map(i=>i.value));
    const saldoOperativo=totalIncomeRaw-totalExp;
    return {incomeItems,donationItems,expenseItems,saldoItems:[{label:'Saldo operativo',value:Math.abs(saldoOperativo),displayValue:saldoOperativo,color:saldoOperativo>=0?'#155e75':'#7f1d1d',lines:[]}],totalIncome:totalIncomeRaw,totalIncomeRaw,totalDon,totalExp,saldoActual:saldoOperativo,saldoOperativo};
  }
  try{window.graphPartsV171=graphPartsV171=graphPartsV234;window.graphPartsV164=graphPartsV234;}catch(_){window.graphPartsV171=graphPartsV234;window.graphPartsV164=graphPartsV234;}

  function applyGraphTips(){
    const wrap=$('eventChartWrap'); if(!wrap)return; let g; try{g=graphPartsV234();}catch(_){return;} const rows=wrap.querySelectorAll('.chart-row');
    const donationSegs=rows[1]?.querySelectorAll?.('.chart-seg')||[];
    g.donationItems.forEach((it,i)=>{const seg=donationSegs[i]; if(!seg)return; const data=it.lines.map(x=>x.split('|').map(s=>s.trim())).map(a=>({donor:a[0],prod:a[1],uds:a[2],precio:a[3],total:a[4]})); const objs=data.map(o=>{o.__line=`${o.donor} | ${o.prod} | ${o.uds} | ${o.precio} | ${o.total}`; return o;}); const lines=totalize(objs,o=>o.donor,o=>parseNum(o.total),'Total donante'); setTip(seg,table('GRÁFICAS / DONACIÓN DE PRODUCTO / '+it.label,'Donante | Producto | Uds | Precio estimado | Valor estimado',lines,'TOTAL ESTIMADO',it.value),it.color||getComputedStyle(seg).backgroundColor,'graphdonationv234');});
    const expenseSegs=rows[2]?.querySelectorAll?.('.chart-seg')||[];
    g.expenseItems.forEach((it,i)=>{const seg=expenseSegs[i]; if(!seg)return; const objs=it.lines.map(x=>x.split('|').map(s=>s.trim())).map(a=>({tk:a[0],tienda:a[1],prod:a[2],uds:a[3],precio:a[4],total:a[5],__line:`${a[0]} | ${a[1]} | ${a[2]} | ${a[3]} | ${a[4]} | ${a[5]}`})); const lines=totalize(objs,o=>o.tk,o=>parseNum(o.total),'Total'); setTip(seg,table('GRÁFICAS / GASTOS / '+it.label,'Ticket | Tienda | Producto | Uds | Precio | Total',lines,'TOTAL',it.value),it.color||getComputedStyle(seg).backgroundColor,'graphexpensev234');});
  }

  function applyStatusColor(){const el=$('eventStatus'); if(!el)return; const fin=up(ev().situacion)==='FINALIZADO'; el.classList.toggle('ce-v234-finalizado',fin); el.classList.toggle('ce-v234-curso',!fin); el.classList.toggle('status-finalizado',fin); el.classList.toggle('status-curso',!fin);}
  function applyEventRW(){if(!(isRW()||isGD()))return; document.querySelectorAll('#mtEventos input,#mtEventos select,#mtEventos textarea,#mtEventos button,[data-action^="edit-evento"],button[data-action="save-evento"],button[data-action="delete-evento"],#btnAddEvento,#mtEventosBtn').forEach(el=>{el.disabled=false;el.readOnly=false;el.classList.remove('locked','ce-v225-ro-disabled');el.style.pointerEvents='auto';el.style.opacity='1';el.removeAttribute('aria-disabled');});}

  function renderInfoHtml(text){const lines=String(text||'').split('\n'); let rows=[]; const html=[]; const flush=()=>{if(!rows.length)return; html.push('<table><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table>'); rows=[];}; lines.forEach(line=>{if(!line.trim()){flush();html.push('<div style="height:8px"></div>');return;} if(line.includes('|'))rows.push(line.split('|').map(s=>s.trim())); else{flush();html.push('<div style="font-weight:800;margin:4px 0 8px">'+esc(line)+'</div>');}}); flush(); return html.join('');}
  function ensurePhotoModal(){let m=$('ceTicketModalV234'); if(m)return m; m=document.createElement('div'); m.id='ceTicketModalV234'; m.className='ce-ticket-modal-v234'; m.innerHTML='<div class="ce-ticket-modal-v234-box"><button type="button" class="ce-ticket-modal-v234-close">×</button><div class="ce-ticket-modal-v234-info"></div><div class="ce-ticket-modal-v234-imgwrap"><img alt="Ticket ampliado"></div></div>'; m.addEventListener('click',evnt=>{if(evnt.target===m||evnt.target.closest('.ce-ticket-modal-v234-close'))m.classList.remove('visible');},true); document.body.appendChild(m); return m;}
  function ticketInfoForThumb(img){let el=img.closest('[data-ce-tip-v21]')||img.closest('.summary-item,.budget-row,.itemcard,.chart-row')?.querySelector?.('[data-ce-tip-v21]'); let text=el?.getAttribute('data-ce-tip-v21')||''; if(!text){const row=img.closest('.summary-item,.budget-row,.itemcard'); text=row?.innerText||'Sin detalle asociado';} return text;}
  window.addEventListener('click',function(evnt){const img=evnt.target?.closest?.('img.ticket-thumb'); if(!img)return; evnt.preventDefault();evnt.stopPropagation();evnt.stopImmediatePropagation(); try{$('ceTicketImageModalV225')?.classList.remove('visible');}catch(_){} const m=ensurePhotoModal(); m.querySelector('img').src=img.src; m.querySelector('.ce-ticket-modal-v234-info').innerHTML=renderInfoHtml(ticketInfoForThumb(img)); m.classList.add('visible'); return false;},true);
  document.addEventListener('keydown',evnt=>{if(evnt.key==='Escape')$('ceTicketModalV234')?.classList.remove('visible');},true);

  function applyAll(){refreshVersion(); normalizePasswordButtons(); applyStatusColor(); applyEventRW(); applyGraphTips();}
  const oldRender=typeof render==='function'?render:null; if(oldRender&&!oldRender.__ce_v234){const w=function(){const r=oldRender.apply(this,arguments); setTimeout(applyAll,60); return r;}; w.__ce_v234=true; try{render=w;window.render=w;}catch(_){} }
  const oldRenderGraf=typeof renderGraficas==='function'?renderGraficas:null; if(oldRenderGraf&&!oldRenderGraf.__ce_v234){const w=function(){const r=oldRenderGraf.apply(this,arguments); setTimeout(applyGraphTips,40); return r;}; w.__ce_v234=true; try{renderGraficas=w;window.renderGraficas=w;}catch(_){} }
  ['DOMContentLoaded','load'].forEach(evt=>window.addEventListener(evt,()=>{setTimeout(applyAll,120);setTimeout(applyAll,700);},false));
  document.addEventListener('click',()=>setTimeout(applyAll,80),false);
  applyAll(); setTimeout(applyAll,700);
})();

;/* ===== END legacy-inline-47-v234-fixes-script.js ===== */


;/* ===== BEGIN legacy-inline-48-v235-final-fixes-script.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #48. */
/* ==== v23.6.4: permisos GD/RW/RO, evento finalizado consultable, fotos solo visuales y TOTAL ESTIMADO ==== */
(function(){
  'use strict';
  const VERSION='ControlEvent v28.10';
  const VERSION_FILE='ControlEvent_v28_10';
  const $=id=>document.getElementById(id);
  const norm=v=>String(v??'').trim();
  const up=v=>norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  function st(){try{return (typeof state!=='undefined'&&state)||window.state||{};}catch(_){return window.state||{};}}
  function role(){try{return up((typeof authUser!=='undefined'&&authUser&&authUser.nivel)||window.authUser?.nivel||'');}catch(_){return '';}}
  const isGD=()=>role()==='GD', isRW=()=>role()==='RW', isRO=()=>role()==='RO';
  function arr(n){const s=st();return Array.isArray(s[n])?s[n]:[];}
  function currentEvent(){try{return (typeof selectedEvent==='function'?selectedEvent():null)||arr('eventos').find(e=>String(e.id)===String(st().selectedEventId))||{};}catch(_){return arr('eventos').find(e=>String(e.id)===String(st().selectedEventId))||{};}}
  function isFinalized(){return up(currentEvent().situacion)==='FINALIZADO';}
  function setEnabled(el,on=true){if(!el)return;el.disabled=!on;el.readOnly=!on;el.classList.toggle('locked',!on);el.classList.toggle('ce-v225-ro-disabled',!on);el.style.pointerEvents=on?'auto':'none';el.style.opacity=on?'1':'';if(on){el.removeAttribute('aria-disabled');}else{el.setAttribute('aria-disabled','true');}}
  function show(el,on=true){if(!el)return;el.classList.toggle('hidden',!on);el.style.display=on?'':'none';el.style.visibility=on?'visible':'hidden';el.disabled=!on;el.style.pointerEvents=on?'auto':'none';el.style.opacity=on?'1':'';}
  function updateVersion(){try{document.title=VERSION;}catch(_){} document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||''))el.textContent=VERSION;});}

  function applyRoleAndFinalized(){
    const r=role();
    document.body.classList.toggle('ce-v235-gd',r==='GD');
    document.body.classList.toggle('ce-v235-rw',r==='RW');
    document.body.classList.toggle('ce-v235-ro',r==='RO');
    document.body.classList.toggle('ce-v235-finalizado',isFinalized());
    // ACCESOS solo GD.
    show($('mtAccesoBtn'),isGD());
    // Carga y descarga de datos solo GD, incluso si el evento está finalizado.
    ['btnOpenImport','btnExportSeed'].forEach(id=>show($(id),isGD()));
    document.querySelectorAll('.mobile-menu-action[data-target="btnOpenImport"],.mobile-menu-action[data-target="btnExportSeed"]').forEach(el=>show(el,isGD()));
    document.querySelectorAll('.mobile-menu-action[data-target="mtAccesoBtn"]').forEach(el=>show(el,isGD()));
    // EVENTOS editable para GD y RW.
    const canEvents=isGD()||isRW();
    ['mtEventosBtn','btnAddEvento','newEventoTitulo','newEventoPrecio','newEventoFechaIni','newEventoFechaFin','newEventoSituacion','newEventoDescripcion'].forEach(id=>setEnabled($(id),canEvents));
    document.querySelectorAll('#mtEventos input,#mtEventos select,#mtEventos textarea,#mtEventos button,[data-action^="edit-evento"],button[data-action="save-evento"],button[data-action="delete-evento"]').forEach(el=>setEnabled(el,canEvents));
    // Evento finalizado: navegar/visualizar sí, cambios de fotos no.
    if(isFinalized()){
      document.querySelectorAll('.locked,.app-lockable.locked').forEach(el=>{el.classList.remove('locked');el.style.pointerEvents='auto';el.style.opacity='1';el.style.filter='none';});
      document.querySelectorAll('#summaryTiendaTicket .ticket-actions button,#summaryTiendaTicket .ticket-actions input[type="file"],#summaryTiendaTicket .ce-photo-btn-v202,#summaryTiendaTicket [data-ce-delete-img="1"]').forEach(el=>{el.style.display='none';el.disabled=true;el.style.pointerEvents='none';});
      document.querySelectorAll('#summaryTiendaTicket img.ticket-thumb,img.ticket-thumb').forEach(img=>{img.style.display='inline-block';img.style.visibility='visible';img.style.pointerEvents='auto';img.style.opacity='1';});
    }
    if(isRO()){
      // RO en curso: no modificar fotos, pero sí ver miniaturas y abrirlas.
      document.querySelectorAll('#summaryTiendaTicket .ticket-actions button,#summaryTiendaTicket .ticket-actions input[type="file"],#summaryTiendaTicket .ce-photo-btn-v202,#summaryTiendaTicket [data-ce-delete-img="1"]').forEach(el=>{el.style.display='none';el.disabled=true;el.style.pointerEvents='none';});
      document.querySelectorAll('#summaryTiendaTicket img.ticket-thumb,img.ticket-thumb').forEach(img=>{img.style.display='inline-block';img.style.visibility='visible';img.style.pointerEvents='auto';img.style.opacity='1';});
    }
  }

  async function openAccessV235(){
    if(!isGD()){alert('Solo un usuario GD puede mantener ACCESOS.');return false;}
    const wrap=$('maintenanceWrapper'); if(wrap)wrap.classList.remove('hidden');
    document.querySelectorAll('#maintenanceWrapper > .card').forEach(c=>c.classList.add('hidden'));
    $('mtAcceso')?.classList.remove('hidden');
    $('mtAccesoBtn')?.classList.remove('hidden');
    document.querySelectorAll('.maintenance-tabs .tab').forEach(b=>b.classList.remove('active'));
    $('mtAccesoBtn')?.classList.add('active');
    try{if(typeof currentMaintTab!=='undefined')currentMaintTab='acceso';}catch(_){}
    try{if(typeof fetchAccessUsers==='function')await fetchAccessUsers();else if(typeof fetchAccessIfNeeded==='function')await fetchAccessIfNeeded();}catch(err){console.warn('No se pudo recargar ACCESOS',err);}
    try{if(typeof renderAcceso==='function')renderAcceso();}catch(err){console.error('Error renderizando ACCESOS',err);}
    applyRoleAndFinalized();
    return false;
  }
  try{window.openAccessMaintenance=openAccessV235; if(typeof openAccessMaintenance!=='undefined')openAccessMaintenance=openAccessV235;}catch(_){window.openAccessMaintenance=openAccessV235;}

  function openImportOnlyV235(){
    if(!isGD()){alert('Solo GD puede realizar carga inicial de datos.');return false;}
    const wrap=$('maintenanceWrapper'); if(wrap)wrap.classList.remove('hidden');
    document.querySelectorAll('#maintenanceWrapper > .card').forEach(c=>c.classList.add('hidden'));
    $('mtImportar')?.classList.remove('hidden');
    document.querySelectorAll('.maintenance-tabs .tab').forEach(b=>b.classList.remove('active'));
    return false;
  }

  function normalizeEstimatedTotals(){
    const root=$('summaryTiendaTicket'); if(!root)return;
    root.querySelectorAll('*').forEach(el=>{
      const txt=(el.textContent||'');
      const isDonation=/DONADO\s+(SOCIO|TIENDA|OTROS|NO\s*SOCIO)/i.test(txt) || /DONADO\s+(SOCIO|TIENDA|OTROS|NO\s*SOCIO)/i.test(el.getAttribute('data-ce-tip-v21')||'');
      if(!isDonation)return;
      ['data-ce-tip-v21','data-ce-tip','data-tip','title'].forEach(a=>{const v=el.getAttribute(a); if(v)el.setAttribute(a,v.replace(/\bTOTAL\b(?!\s+ESTIMADO)/gi,'TOTAL ESTIMADO'));});
      for(const n of Array.from(el.childNodes)){if(n.nodeType===3 && /\bTOTAL\b(?!\s+ESTIMADO)/i.test(n.nodeValue||''))n.nodeValue=n.nodeValue.replace(/\bTOTAL\b(?!\s+ESTIMADO)/gi,'TOTAL ESTIMADO');}
    });
  }

  // Interceptores mínimos de alta prioridad: no rompen la navegación, solo fuerzan permisos solicitados.
  document.addEventListener('click',function(ev){
    const t=ev.target;
    const acceso=t.closest?.('#mtAccesoBtn,.mobile-menu-action[data-target="mtAccesoBtn"],[data-action="open-acceso"]');
    if(acceso){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();openAccessV235();return false;}
    const imp=t.closest?.('#btnOpenImport,.mobile-menu-action[data-target="btnOpenImport"]');
    if(imp){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();openImportOnlyV235();return false;}
    const back=t.closest?.('#btnExportSeed,.mobile-menu-action[data-target="btnExportSeed"]');
    if(back){
      if(!isGD()){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();alert('Solo GD puede realizar descarga de datos.');return false;}
      // En GD no bloqueamos por evento finalizado: dejamos que la rutina original de backup se ejecute.
      return true;
    }
    const photo=t.closest?.('#summaryTiendaTicket .ticket-actions button,#summaryTiendaTicket input[type="file"],#summaryTiendaTicket .ce-photo-btn-v202,#summaryTiendaTicket [data-ce-delete-img="1"],button[onclick*="uploadTicketImage"],button[onclick*="removeTicketImage"],input.ticket-file-input');
    if(photo && (isFinalized()||isRO())){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();alert(isFinalized()?'Evento finalizado: solo se permite visualizar fotos.':'Usuario RO: solo puede visualizar fotos.');return false;}
  },true);
  document.addEventListener('change',function(ev){const t=ev.target;if(t&&t.matches?.('#summaryTiendaTicket input[type="file"],input.ticket-file-input')&&(isFinalized()||isRO())){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();t.value='';return false;}},true);

  ['uploadTicketImage','removeTicketImage','uploadTicketImageV164','removeTicketImageV164','uploadTicketImageV202','removeTicketImageV202'].forEach(name=>{
    try{const old=window[name]||(typeof eval(name)==='function'?eval(name):null); if(typeof old==='function'&&!old.__ce_v235){const w=function(){if(isFinalized()||isRO()){alert(isFinalized()?'Evento finalizado: solo se permite visualizar fotos.':'Usuario RO: solo puede visualizar fotos.');return false;} return old.apply(this,arguments);}; w.__ce_v235=true; window[name]=w; try{eval(name+'=window["'+name+'"]');}catch(_){}}}catch(_){ }
  });

  function applyAll(){updateVersion();applyRoleAndFinalized();normalizeEstimatedTotals();}
  const oldRender=typeof render==='function'?render:null;
  if(oldRender&&!oldRender.__ce_v235){const w=function(){const r=oldRender.apply(this,arguments);setTimeout(applyAll,80);return r;};w.__ce_v235=true;try{render=w;window.render=w;}catch(_){}}
  const oldSummary=typeof renderResumen==='function'?renderResumen:null;
  if(oldSummary&&!oldSummary.__ce_v235){const w=function(){const r=oldSummary.apply(this,arguments);setTimeout(applyAll,80);return r;};w.__ce_v235=true;try{renderResumen=w;window.renderResumen=w;}catch(_){}}
  ['DOMContentLoaded','load'].forEach(evt=>window.addEventListener(evt,()=>{setTimeout(applyAll,150);setTimeout(applyAll,800);},false));
  document.addEventListener('click',()=>setTimeout(applyAll,120),false);
  applyAll(); setTimeout(applyAll,800);
})();

;/* ===== END legacy-inline-48-v235-final-fixes-script.js ===== */


;/* ===== BEGIN legacy-inline-49-v2364-local-stability-script.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #49. */
/* ==== v23.6.4 local: no precargar state pesado, no localStorage pesado, fotos como archivos ==== */
(function(){
  'use strict';
  const VERSION='ControlEvent v28.10';
  const SESSION_KEY='ControlEvent_v26_9_session';
  const $=id=>document.getElementById(id);
  const stateRef=()=>{ try{return state;}catch(_){return window.state||{};} };
  const eventId=()=>String(stateRef().selectedEventId||'');
  const imgKey=(label)=>{ try{return ticketImageStateKey(String(label||''), eventId());}catch(_){return `${eventId()}|${String(label||'')}`;} };
  function setVersion(){
    try{ document.title=VERSION; }catch(_){ }
    document.querySelectorAll('.appname-stack span').forEach(el=>{ if(/ControlEvent/i.test(el.textContent||'')) el.textContent=VERSION; });
  }
  function sessionSave(user){ try{ localStorage.setItem(SESSION_KEY, JSON.stringify(user||null)); }catch(_){ } }
  function sessionLoad(){ try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}catch(_){return null;} }
  function sessionClear(){ try{localStorage.removeItem(SESSION_KEY);}catch(_){ } }

  // Evita que la app vuelva a guardar/cargar todo el estado en localStorage.
  let saveTimer=null, saveBusy=false, saveQueued=false;
  function normalizeCollectionForServer(rows, collection){
    if(!Array.isArray(rows)) return [];
    const out=[];
    const seen=new Map();
    rows.forEach((row,index)=>{
      if(!row || typeof row!=='object') return;
      const clean={...row};
      let key=String(clean.id||'').trim();
      if(!key){ key=`${collection}-${index}`; clean.id=key; }
      if(seen.has(key)){
        out[seen.get(key)]=clean; // conserva el ultimo registro con la misma clave
      } else {
        seen.set(key,out.length); out.push(clean);
      }
    });
    return out;
  }
  function shallowCloneForServer(){
    const src=stateRef();
    const out={...src};
    ['eventos','personas','tiendas','productos','colaboradores','compras'].forEach(key=>{
      if(Object.prototype.hasOwnProperty.call(out,key)) out[key]=normalizeCollectionForServer(out[key], key);
    });
    const imgs={};
    Object.entries(src.ticketImages||{}).forEach(([k,v])=>{
      if(!v) return;
      if(typeof v==='string' && /^data:image\//.test(v)) return; // nunca enviar base64 al estado general
      if(typeof v==='string') imgs[k]=v;
      else if(v && typeof v==='object') imgs[k]=v.pathname||v.url||'';
    });
    out.ticketImages=imgs;
    delete out.__photoCache; delete out.ticketImagesBackup; delete out.ticketImagesLocal;
    return out;
  }
  async function pushState(){
    if(saveBusy){ saveQueued=true; return; }
    saveBusy=true;
    try{
      const res=await fetch('/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(shallowCloneForServer())});
      if(!res.ok) throw new Error(await res.text());
    }catch(e){ console.error('[v23.6.4] Error guardando estado:',e); }
    finally{ saveBusy=false; if(saveQueued){ saveQueued=false; setTimeout(pushState,300); } }
  }
  try{
    saveState=function(){
      if(!authUser || !(typeof canWriteRole==='function' && canWriteRole())) return;
      clearTimeout(saveTimer); saveTimer=setTimeout(pushState,550);
    };
    window.saveState=saveState;
  }catch(_){ }

  async function loadFreshState(){
    const res=await fetch('/api/state',{cache:'no-store'});
    if(!res.ok) throw new Error('No se pudo cargar /api/state');
    const serverState=await res.json();
    const s=stateRef();
    Object.keys(s).forEach(k=>delete s[k]);
    if(typeof mergeLoadedState==='function' && typeof defaultState==='function') Object.assign(s, mergeLoadedState(serverState, defaultState()));
    else Object.assign(s, serverState||{});
  }

  // Login conservador: no reconstruye pantalla, solo garantiza que entra y carga estado después.
  const oldDoLogin=typeof doLogin==='function'?doLogin:null;
  async function loginV2363(){
    const ident=String($('loginIdentificacion')?.value||'').trim();
    const clave=String($('loginClave')?.value||'');
    const err=$('authError'); if(err) err.textContent='';
    if(!ident||!clave){ if(err) err.textContent='Introduce identificación y clave.'; return false; }
    try{
      const res=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identificacion:ident,clave})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data.ok||!data.user) throw new Error(data.error||'Acceso no válido');
      await loadFreshState();
      authUser=data.user; window.authUser=data.user; sessionSave(data.user);
      try{ if(String(authUser.nivel||'')==='GD' && typeof fetchAccessUsers==='function') await fetchAccessUsers(); }catch(e){console.warn(e);}
      const c=$('loginClave'); if(c) c.value='';
      render();
      return false;
    }catch(e){ console.error('[v23.6.4] login',e); if(err) err.textContent=e.message||String(e); return false; }
  }
  try{ doLogin=loginV2363; window.doLogin=loginV2363; }catch(_){ window.doLogin=loginV2363; }
  document.addEventListener('click',function(ev){
    const t=ev.target;
    if(t && t.id==='btnLogin'){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); loginV2363(); return false; }
  },true);
  ['loginIdentificacion','loginClave'].forEach(id=>setTimeout(()=>{const el=$(id); if(el&&!el.__v2363){el.__v2363=true; el.disabled=false; el.readOnly=false; el.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault(); loginV2363();}});}},300));

  // Logout limpia sesión local ligera.
  const oldLogout=typeof logout==='function'?logout:null;
  if(oldLogout){ try{ logout=function(){ sessionClear(); return oldLogout.apply(this,arguments); }; window.logout=logout; }catch(_){ } }

  function fileToCompressedDataUrl(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(reader.error||new Error('No se pudo leer la foto'));
      reader.onload=()=>{
        const img=new Image();
        img.onerror=()=>reject(new Error('Imagen no válida'));
        img.onload=()=>{
          const max=1100; let w=img.width,h=img.height; const r=Math.min(max/w,max/h,1); w=Math.round(w*r); h=Math.round(h*r);
          const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h; canvas.getContext('2d').drawImage(img,0,0,w,h);
          resolve(canvas.toDataURL('image/jpeg',0.78));
        };
        img.src=reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  async function uploadPhoto(label,file){
    if(!file) return;
    const key=imgKey(label);
    const dataUrl=await fileToCompressedDataUrl(file);
    const res=await fetch('/api/ticket-images',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId:eventId(),key,dataUrl})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data.ok||!data.image) throw new Error(data.error||'No se pudo guardar la foto en servidor');
    const s=stateRef(); if(!s.ticketImages) s.ticketImages={};
    s.ticketImages[key]=data.image.pathname||data.image.url;
    saveState(); render();
  }
  function pickPhotoFor(label){
    const input=document.createElement('input'); input.type='file'; input.accept='image/*';
    input.onchange=()=>uploadPhoto(label,input.files&&input.files[0]).catch(e=>{alert(e.message||String(e)); console.error(e);});
    input.click();
  }
  async function removePhoto(label){
    const key=imgKey(label);
    try{ await fetch(`/api/ticket-images?eventId=${encodeURIComponent(eventId())}&key=${encodeURIComponent(key)}`,{method:'DELETE'}); }catch(e){console.warn(e);}
    const s=stateRef(); if(s.ticketImages) delete s.ticketImages[key];
    saveState(); render();
  }
  try{
    uploadTicketImage=function(evOrEncoded, maybeEncoded){
      // Compatible con onclick="uploadTicketImage(event,'...')" y con uploadTicketImage('...')
      if(evOrEncoded && evOrEncoded.target && evOrEncoded.target.files){
        const enc=maybeEncoded||''; const label=decodeURIComponent(enc); return uploadPhoto(label, evOrEncoded.target.files[0]).catch(e=>alert(e.message||String(e)));
      }
      const label=decodeURIComponent(String(evOrEncoded||'')); pickPhotoFor(label); return false;
    };
    window.uploadTicketImage=uploadTicketImage;
    window.uploadTicketImageV202=function(encoded){ pickPhotoFor(decodeURIComponent(String(encoded||''))); return false; };
    removeTicketImage=function(encoded){ removePhoto(decodeURIComponent(String(encoded||''))); return false; };
    window.removeTicketImage=removeTicketImage; window.removeTicketImageV202=removeTicketImage;
  }catch(_){ }

  // Diagnóstico sencillo en consola.
  window.__ceLocalDiag=async function(){
    const s=stateRef();
    const local={eventos:s.eventos?.length||0, ingresos:s.colaboradores?.length||0, compras:s.compras?.length||0, fotos:Object.keys(s.ticketImages||{}).length};
    let server={}; try{ server=await (await fetch('/api/diagnostics',{cache:'no-store'})).json(); }catch(e){server.error=String(e);}
    console.table(local); console.log(server); return {local,server};
  };

  // Reanudar sesión solo con usuario ligero; el estado se carga después.
  async function tryResume(){
    if(authUser) return;
    const u=sessionLoad(); if(!u) return;
    try{ await loadFreshState(); authUser=u; window.authUser=u; render(); }catch(e){ console.warn('[v23.6.4] No se pudo reanudar sesión',e); }
  }
  ['DOMContentLoaded','load'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(()=>{setVersion(); tryResume();},250),false));
  setTimeout(()=>{setVersion();},300);
})();

;/* ===== END legacy-inline-49-v2364-local-stability-script.js ===== */


;/* ===== BEGIN legacy-inline-50-v2364-income-total-and-version-fix.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #50. */
/* ==== v23.6.4 local: INGRESOS siempre por TOTAL real + versión Excel correcta ==== */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v28.10';
  const VERSION_FILE = 'ControlEvent_v28_10';
  const up = v => String(v ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const num = v => Number(v || 0) || 0;
  function getState(){ try{return state;}catch(_){return window.state||{};} }
  function currentEvent(){ try{return (typeof selectedEvent==='function' ? selectedEvent() : null) || {};}catch(_){return {};} }
  function persona(id){
    try{ if(typeof personaById==='function'){ const p=personaById(id); if(p) return p; } }catch(_){ }
    const st=getState(); return (Array.isArray(st.personas)?st.personas:[]).find(p=>String(p.id)===String(id)) || {};
  }
  function eventPrice(){ return num(currentEvent().precio); }
  function incomeParts(row){
    const p = row.persona || persona(row.personaId);
    const isSocio = up(p.rango || row.rango || '') === 'SOCIO';
    const n = num(row.numero);
    // No usar row.total/base antiguos para gráficos: pueden venir de versiones previas y estar desfasados.
    const obligatorio = isSocio ? n * eventPrice() : 0;
    const voluntario = row.importe != null ? num(row.importe) : (row.donation != null ? num(row.donation) : 0);
    return {persona:p, obligatorio, voluntario, total: obligatorio + voluntario};
  }
  function incomeTotal(row){ return incomeParts(row).total; }
  function isSocio(row){ const p=row.persona || persona(row.personaId); return up(p.rango || row.rango || '') === 'SOCIO'; }
  function situ(row){ return String(row.situacion || '').trim(); }
  function baseRows(){
    try{ if(typeof collabsForEvent==='function') return (collabsForEvent()||[]); }catch(_){ }
    const st=getState(); const evId=String(st.selectedEventId||currentEvent().id||'');
    return (Array.isArray(st.colaboradores)?st.colaboradores:[]).filter(r=>String(r.eventId||'')===evId);
  }
  function freshIncomeRows(){
    return baseRows().map(r=>{
      const parts=incomeParts(r);
      return Object.assign({}, r, {persona: parts.persona, base: parts.obligatorio, donation: parts.voluntario, total: parts.total});
    });
  }
  function sum(rows, fn){ return rows.reduce((a,r)=>a+num(fn(r)),0); }
  function fixedIncomes(){
    const rows = freshIncomeRows();
    const incomes = {
      socioBanco: sum(rows, r => isSocio(r) && situ(r)==='Banco' ? incomeTotal(r) : 0),
      socioBizum: sum(rows, r => isSocio(r) && situ(r)==='Bizum' ? incomeTotal(r) : 0),
      socioEfectivo: sum(rows, r => isSocio(r) && situ(r)==='Efectivo' ? incomeTotal(r) : 0),
      noSocioBanco: sum(rows, r => !isSocio(r) && situ(r)==='Banco' ? incomeTotal(r) : 0),
      noSocioBizum: sum(rows, r => !isSocio(r) && situ(r)==='Bizum' ? incomeTotal(r) : 0),
      noSocioEfectivo: sum(rows, r => !isSocio(r) && situ(r)==='Efectivo' ? incomeTotal(r) : 0),
      pendiente: sum(rows, r => situ(r)==='Pendiente' ? incomeTotal(r) : 0)
    };
    incomes.total = incomes.socioBanco + incomes.socioBizum + incomes.socioEfectivo + incomes.noSocioBanco + incomes.noSocioBizum + incomes.noSocioEfectivo + incomes.pendiente;
    incomes.realizado = incomes.total - incomes.pendiente;
    return incomes;
  }

  // Enriquecer siempre colaboradores con TOTAL real calculado desde número/precio/voluntario.
  try{
    const oldCollabs = typeof collabsForEvent==='function' ? collabsForEvent : null;
    if(oldCollabs && !oldCollabs.__ce_v2364_total){
      const wrapped=function(){
        const rows=(oldCollabs.apply(this,arguments)||[]).map(r=>{const parts=incomeParts(r); return Object.assign({}, r, {persona:parts.persona, base:parts.obligatorio, donation:parts.voluntario, total:parts.total});});
        return rows;
      };
      wrapped.__ce_v2364_total=true;
      collabsForEvent=wrapped; window.collabsForEvent=wrapped;
    }
  }catch(_){ }

  function patchGraphFunction(name){
    try{
      const old = window[name] || (typeof eval(name)==='function' ? eval(name) : null);
      if(typeof old==='function' && !old.__ce_v2364_total){
        const wrapped=function(){
          const g = old.apply(this, arguments) || {};
          const incomes = fixedIncomes();
          g.incomes = incomes;
          if(g.saldo){
            const expTotal = num(g.expenses && g.expenses.total);
            const expReal = num(g.expenses && (g.expenses.realizado != null ? g.expenses.realizado : g.expenses.tk + g.expenses.corrientes));
            g.saldo.total = incomes.total - expTotal;
            g.saldo.realizado = incomes.realizado - expReal;
          }
          if('saldoActual' in g || 'saldoOperativo' in g){
            const expTotal = num(g.expenses && g.expenses.total);
            const expReal = num(g.expenses && (g.expenses.realizado != null ? g.expenses.realizado : g.expenses.tk + g.expenses.corrientes));
            g.saldoActual = incomes.realizado - expReal;
            g.saldoOperativo = incomes.total - expTotal;
          }
          return g;
        };
        wrapped.__ce_v2364_total=true;
        window[name]=wrapped;
        try{ eval(name + '=window["' + name + '"]'); }catch(_){ }
      }
    }catch(_){ }
  }
  patchGraphFunction('graphData');
  patchGraphFunction('graphDataV160');

  // Refuerzo de versión visible y nombres INFOEVENTO/Emitido por.
  function setVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname-stack span').forEach(el=>{ if(/ControlEvent/i.test(el.textContent||'')) el.textContent = VERSION; });
  }
  try{
    window.makeInfoEventoFilename = function(title){
      const d=new Date(); const yyyy=d.getFullYear(); const mm=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0');
      const clean=String(title||'evento').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,80)||'evento';
      return `${VERSION_FILE}_INFOEVENTO-${clean}_${yyyy}${mm}${dd}.xlsx`;
    };
  }catch(_){ }
  window.__ceIncomeTotalV2364 = incomeTotal;
  ['DOMContentLoaded','load'].forEach(evt=>window.addEventListener(evt,()=>setTimeout(setVersion,50),false));
  const oldRender = typeof render==='function' ? render : null;
  if(oldRender && !oldRender.__ce_v2364_version){
    const wrapped=function(){ const r=oldRender.apply(this,arguments); setTimeout(setVersion,20); return r; };
    wrapped.__ce_v2364_version=true; try{render=wrapped;window.render=wrapped;}catch(_){ }
  }
  setVersion();
})();

;/* ===== END legacy-inline-50-v2364-income-total-and-version-fix.js ===== */


;/* ===== BEGIN legacy-inline-51-v2365-income-total-and-issuedby-final-fix.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #51. */
/* ==== v23.6.5 local: corrección final INGRESOS por TOTAL real + Emitido por v23.6.5 ==== */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v28.10';
  const VERSION_FILE = 'ControlEvent_v28_10';
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  function parseNum(v){
    if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = String(v ?? '').trim();
    if(!s) return 0;
    s = s.replace(/[^0-9,.-]/g,'');
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',', '.');
    else if(s.includes(',')) s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  const money = v => parseNum(v).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
  const numTxt = v => parseNum(v).toLocaleString('es-ES',{minimumFractionDigits:0,maximumFractionDigits:2});
  function st(){ try{ if(typeof state !== 'undefined') return state || {}; }catch(_){ } return window.state || {}; }
  function arr(k){ const s = st(); return Array.isArray(s[k]) ? s[k] : []; }
  function byId(k,id){ return arr(k).find(x => String(x.id) === String(id)) || {}; }
  function ev(){ try{ return (typeof selectedEvent === 'function' ? selectedEvent() : null) || byId('eventos', st().selectedEventId); }catch(_){ return byId('eventos', st().selectedEventId); } }
  function evId(){ const e = ev() || {}; return String(e.id || st().selectedEventId || ''); }
  function persona(id){ try{ if(typeof personaById === 'function'){ const p = personaById(id); if(p) return p; } }catch(_){ } return byId('personas', id); }
  function eventPrice(){ return parseNum((ev() || {}).precio); }
  function rango(r){ const p = r?.persona || persona(r?.personaId); return up(p.rango || r?.rango || r?.personaRango || ''); }
  function isSocio(r){ return rango(r) === 'SOCIO'; }
  function personName(r){ const p = r?.persona || persona(r?.personaId); return norm(p.nombre || r?.nombre || 'Sin nombre'); }
  function situ(r){ return up(r?.situacion || r?.formaPago || ''); }
  function collabRowsRaw(){
    try{ if(typeof collabsForEvent === 'function'){ const rows = collabsForEvent() || []; if(Array.isArray(rows)) return rows; } }catch(_){ }
    return arr('colaboradores').filter(r => String(r.eventId || '') === evId());
  }
  function voluntaryAmount(r, obligatorio){
    const fields = ['importeVoluntario','voluntario','donation','importe','importeDonacion','aportacionVoluntaria'];
    for(const f of fields){ if(r && r[f] != null && String(r[f]).trim() !== '') return parseNum(r[f]); }
    // En datos antiguos puede existir total ya calculado. Si no hay campo voluntario explícito, para socio se recupera como total-obligatorio.
    if(r && r.total != null && String(r.total).trim() !== '') return Math.max(0, parseNum(r.total) - parseNum(obligatorio));
    return 0;
  }
  function incomeParts(r){
    const socio = isSocio(r);
    const n = parseNum(r?.numero);
    const obligatorio = socio ? n * eventPrice() : 0;
    const voluntario = socio ? voluntaryAmount(r, obligatorio) : (function(){
      const fields = ['importeVoluntario','voluntario','donation','importe','importeDonacion','aportacionVoluntaria','total'];
      for(const f of fields){ if(r && r[f] != null && String(r[f]).trim() !== '') return parseNum(r[f]); }
      return 0;
    })();
    return { numero:n, obligatorio, voluntario, total: obligatorio + voluntario };
  }
  function enrichIncome(r){ const p = incomeParts(r); return Object.assign({}, r, { persona: r?.persona || persona(r?.personaId), base:p.obligatorio, donation:p.voluntario, importe:p.voluntario, total:p.total, __ceTotalReal:p.total, __ceVolReal:p.voluntario, __ceSocioReal:p.obligatorio }); }
  function incomeRows(){ return collabRowsRaw().map(enrichIncome); }
  function sum(list, fn){ return list.reduce((a,x)=>a + parseNum(fn(x)), 0); }
  function incomeLine(r){ const p = incomeParts(r); return `${personName(r)} | ${numTxt(p.numero)} | ${money(p.obligatorio)} | ${money(p.voluntario)} | ${money(p.total)}`; }
  function makeIncomeItems(rows){
    const mk = (label, filter, color) => {
      const list = rows.filter(filter).slice().sort((a,b)=>personName(a).localeCompare(personName(b),'es'));
      return { label, value: sum(list, r => incomeParts(r).total), color, lines: list.map(incomeLine) };
    };
    return [
      mk('Socios Banco', r => isSocio(r) && situ(r) === 'BANCO', '#2563eb'),
      mk('Socios Bizum', r => isSocio(r) && situ(r) === 'BIZUM', '#16a34a'),
      mk('Socios Efectivo', r => isSocio(r) && situ(r) === 'EFECTIVO', '#84cc16'),
      mk('No socios Banco', r => !isSocio(r) && situ(r) === 'BANCO', '#60a5fa'),
      mk('No socios Bizum', r => !isSocio(r) && situ(r) === 'BIZUM', '#34d399'),
      mk('No socios Efectivo', r => !isSocio(r) && situ(r) === 'EFECTIVO', '#bef264'),
      mk('Pendiente de ingresar', r => situ(r) === 'PENDIENTE', '#f59e0b')
    ];
  }
  function patchGraphParts(){
    const previous = (typeof window.graphPartsV171 === 'function') ? window.graphPartsV171 : (typeof graphPartsV171 === 'function' ? graphPartsV171 : null);
    const fixed = function(){
      const rows = incomeRows();
      let g = {};
      try{ g = previous ? previous() : {}; }catch(_){ g = {}; }
      const incomeItems = makeIncomeItems(rows);
      const totalIncomeRaw = sum(incomeItems, it => it.value);
      const oldExpenseTotal = parseNum(g.totalExp != null ? g.totalExp : (g.expenses && g.expenses.total));
      const oldExpenseReal = parseNum(g.expenses && (g.expenses.realizado != null ? g.expenses.realizado : (parseNum(g.expenses.tk)+parseNum(g.expenses.corrientes))));
      g.incomeItems = incomeItems;
      g.totalIncomeRaw = totalIncomeRaw;
      g.totalIncome = totalIncomeRaw;
      if(g.incomes){
        g.incomes.socioBanco = incomeItems[0].value; g.incomes.socioBizum = incomeItems[1].value; g.incomes.socioEfectivo = incomeItems[2].value;
        g.incomes.noSocioBanco = incomeItems[3].value; g.incomes.noSocioBizum = incomeItems[4].value; g.incomes.noSocioEfectivo = incomeItems[5].value;
        g.incomes.pendiente = incomeItems[6].value; g.incomes.total = totalIncomeRaw; g.incomes.realizado = totalIncomeRaw - incomeItems[6].value;
      }
      if(g.saldo){ g.saldo.total = totalIncomeRaw - oldExpenseTotal; g.saldo.realizado = (totalIncomeRaw - incomeItems[6].value) - oldExpenseReal; }
      if('saldoOperativo' in g || 'saldoActual' in g){ g.saldoOperativo = totalIncomeRaw - oldExpenseTotal; g.saldoActual = (totalIncomeRaw - incomeItems[6].value) - oldExpenseReal; }
      return g;
    };
    fixed.__ce_v2365_total = true;
    try{ window.graphPartsV171 = fixed; window.graphPartsV164 = fixed; graphPartsV171 = fixed; graphPartsV164 = fixed; }catch(_){ window.graphPartsV171 = fixed; window.graphPartsV164 = fixed; }
  }
  function patchGraphData(){
    const names = ['graphData','graphDataV143','graphDataV160'];
    names.forEach(name => {
      let old = null;
      try{ old = window[name] || eval(name); }catch(_){ old = window[name]; }
      if(typeof old !== 'function' || old.__ce_v2365_total) return;
      const wrapped = function(){
        const g = old.apply(this, arguments) || {};
        const items = makeIncomeItems(incomeRows());
        const incomes = {
          socioBanco:items[0].value, socioBizum:items[1].value, socioEfectivo:items[2].value,
          noSocioBanco:items[3].value, noSocioBizum:items[4].value, noSocioEfectivo:items[5].value,
          pendiente:items[6].value
        };
        incomes.total = items.reduce((a,b)=>a+parseNum(b.value),0);
        incomes.realizado = incomes.total - incomes.pendiente;
        g.incomes = incomes;
        if(g.saldo){
          const expTotal = parseNum(g.expenses && g.expenses.total);
          const expReal = parseNum(g.expenses && (g.expenses.realizado != null ? g.expenses.realizado : (parseNum(g.expenses.tk)+parseNum(g.expenses.corrientes))));
          g.saldo.total = incomes.total - expTotal; g.saldo.realizado = incomes.realizado - expReal;
        }
        return g;
      };
      wrapped.__ce_v2365_total = true;
      window[name] = wrapped;
      try{ eval(name + '=window["' + name + '"]'); }catch(_){ }
    });
  }
  function patchCollabs(){
    try{
      const old = (typeof collabsForEvent === 'function') ? collabsForEvent : null;
      if(old && !old.__ce_v2365_total){
        const wrapped = function(){ return (old.apply(this,arguments)||[]).map(enrichIncome); };
        wrapped.__ce_v2365_total = true; collabsForEvent = wrapped; window.collabsForEvent = wrapped;
      }
    }catch(_){ }
  }
  function patchBudgetSummary(){
    try{
      const old = (typeof budgetSummary === 'function') ? budgetSummary : null;
      if(old && !old.__ce_v2365_total){
        const wrapped = function(){
          const b = old.apply(this,arguments) || {};
          const rows = incomeRows();
          const socios = rows.filter(isSocio), noSocios = rows.filter(r=>!isSocio(r));
          const total = list => sum(list, r => incomeParts(r).total);
          const paid = list => total(list.filter(r => situ(r) !== 'PENDIENTE'));
          const pend = list => total(list.filter(r => situ(r) === 'PENDIENTE'));
          b.ingresosDinero = b.ingresosDinero || {};
          b.ingresosDinero.socios = Object.assign({}, b.ingresosDinero.socios || {}, {importe:total(socios), ingresado:paid(socios), pendiente:pend(socios)});
          b.ingresosDinero.noSocios = Object.assign({}, b.ingresosDinero.noSocios || b.ingresosDinero.donantes || {}, {importe:total(noSocios), ingresado:paid(noSocios), pendiente:pend(noSocios)});
          b.ingresosDinero.donantes = b.ingresosDinero.noSocios;
          b.ingresosDinero.totalIngresado = paid(rows);
          b.ingresosDinero.totalComprometido = total(rows);
          return b;
        };
        wrapped.__ce_v2365_total = true; budgetSummary = wrapped; window.budgetSummary = wrapped;
      }
    }catch(_){ }
  }
  function emittedBy(date = new Date()){
    const pad = n => String(n).padStart(2,'0');
    const dd = pad(date.getDate()), mm = pad(date.getMonth()+1), yyyy = date.getFullYear();
    const hh = pad(date.getHours()), mi = pad(date.getMinutes()), ss = pad(date.getSeconds());
    return `Emitido por “©oltyLAB ’26_${VERSION_FILE}_${dd}${mm}${yyyy}_${hh}:${mi}:${ss}”`;
  }
  function patchVersion(){
    try{ document.title = VERSION; }catch(_){ }
    try{ document.querySelectorAll('.appname span,.appname-stack span').forEach(el => { if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION; }); }catch(_){ }
    try{ window.emittedByTextV171 = emittedBy; emittedByTextV171 = emittedBy; }catch(_){ window.emittedByTextV171 = emittedBy; }
    try{
      const oldFile = typeof window.xlsxFilename === 'function' ? window.xlsxFilename : null;
      window.xlsxFilename = function(ev){
        const title = String(ev?.titulo || 'evento').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'').replace(/_+/g,'_') || 'evento';
        const now = new Date(); const yyyy = now.getFullYear(); const mm = String(now.getMonth()+1).padStart(2,'0'); const dd = String(now.getDate()).padStart(2,'0');
        return `${VERSION_FILE}_INFOEVENTO-${title}_${yyyy}${mm}${dd}.xlsx`;
      };
    }catch(_){ }
  }
  function apply(){
    patchCollabs(); patchBudgetSummary(); patchGraphParts(); patchGraphData(); patchVersion();
    try{ if(typeof renderGraficas === 'function') renderGraficas(); }catch(_){ }
  }
  const oldRender = (typeof render === 'function') ? render : null;
  if(oldRender && !oldRender.__ce_v2365_total){
    const wrapped = function(){ const r = oldRender.apply(this,arguments); setTimeout(apply,30); return r; };
    wrapped.__ce_v2365_total = true; try{ render = wrapped; window.render = wrapped; }catch(_){ }
  }
  ['DOMContentLoaded','load'].forEach(evt => window.addEventListener(evt, () => { setTimeout(apply,80); setTimeout(apply,700); }, false));
  window.__ceIncomeTotalV2365 = function(){ return incomeRows().map(r => ({nombre:personName(r), situacion:situ(r), rango:rango(r), partes:incomeParts(r)})); };
  apply(); setTimeout(apply,250); setTimeout(apply,1200);
})();

;/* ===== END legacy-inline-51-v2365-income-total-and-issuedby-final-fix.js ===== */


;/* ===== BEGIN legacy-inline-52-v2366-direct-income-chart-fix.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #52. */
/* ==== v23.6.6 local: cálculo directo y único de INGRESOS por TOTAL real ==== */
(function(){
  'use strict';
  const VERSION='ControlEvent v28.10';
  const VERSION_FILE='ControlEvent_v28_10';
  const norm=v=>String(v??'').trim();
  const up=v=>norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const $=id=>document.getElementById(id);
  function num(v){
    if(typeof v==='number') return Number.isFinite(v)?v:0;
    let s=String(v??'').trim(); if(!s) return 0;
    s=s.replace(/[^0-9,.-]/g,'');
    if(s.includes(',')&&s.includes('.')) s=s.replace(/\./g,'').replace(',', '.');
    else if(s.includes(',')) s=s.replace(',', '.');
    const n=Number(s); return Number.isFinite(n)?n:0;
  }
  function money(v){ return num(v).toLocaleString('es-ES',{style:'currency',currency:'EUR'}); }
  function nfmt(v){ return num(v).toLocaleString('es-ES',{minimumFractionDigits:0,maximumFractionDigits:2}); }
  function st(){ try{return (typeof state!=='undefined'&&state)||window.state||{};}catch(_){return window.state||{};} }
  function arr(k){ const s=st(); return Array.isArray(s[k])?s[k]:[]; }
  function currentEvent(){
    try{ if(typeof selectedEvent==='function'){ const e=selectedEvent(); if(e) return e; } }catch(_){ }
    const s=st(); return arr('eventos').find(e=>String(e.id)===String(s.selectedEventId))||{};
  }
  function eventId(){ const e=currentEvent(); return String(e.id||st().selectedEventId||''); }
  function person(id){ try{ if(typeof personaById==='function'){ const p=personaById(id); if(p) return p; } }catch(_){ } return arr('personas').find(p=>String(p.id)===String(id))||{}; }
  function product(id){ try{ if(typeof productoById==='function'){ const p=productoById(id); if(p) return p; } }catch(_){ } return arr('productos').find(p=>String(p.id)===String(id))||{}; }
  function tienda(id){ try{ if(typeof tiendaById==='function'){ const t=tiendaById(id); if(t) return t; } }catch(_){ } return arr('tiendas').find(t=>String(t.id)===String(id))||{}; }
  function personName(r){ const p=r.persona||person(r.personaId); return norm(p.nombre||r.nombre||'Sin nombre'); }
  function rango(r){ const p=r.persona||person(r.personaId); return up(p.rango||r.rango||''); }
  function forma(r){ return up(r.situacion||r.formaPago||''); }
  function eventPrice(){ return num(currentEvent().precio); }
  function voluntaryRaw(r){
    // En el state real de INGRESOS el importe voluntario viene como "importe".
    // No se usa r.total ni r.base porque pueden estar precalculados mal por versiones anteriores.
    const keys=['importeVoluntario','voluntario','importe','aportacionVoluntaria','importeDonacion'];
    for(const k of keys){ if(r && r[k]!==undefined && r[k]!==null && String(r[k]).trim()!=='') return num(r[k]); }
    return 0;
  }
  function incomeParts(r){
    const socio=rango(r)==='SOCIO';
    const numero=num(r.numero);
    const obligatorio=socio ? numero*eventPrice() : 0;
    const voluntario=voluntaryRaw(r);
    return {numero, obligatorio, voluntario, total: obligatorio + voluntario};
  }
  function incomeRowsRaw(){ return arr('colaboradores').filter(r=>String(r.eventId||'')===eventId()).map(r=>Object.assign({},r,{persona:person(r.personaId)})); }
  function sum(a,fn){ return a.reduce((s,x)=>s+num(fn(x)),0); }
  function incomeItems(){
    const rows=incomeRowsRaw();
    const mk=(label,filter,color)=>{ const list=rows.filter(filter).slice().sort((a,b)=>personName(a).localeCompare(personName(b),'es')); return {label,color,value:sum(list,r=>incomeParts(r).total),rows:list,lines:list.map(r=>{const p=incomeParts(r);return `${personName(r)} | ${nfmt(p.numero)} | ${money(p.obligatorio)} | ${money(p.voluntario)} | ${money(p.total)}`;})}; };
    return [
      mk('Socios Banco',r=>rango(r)==='SOCIO'&&forma(r)==='BANCO','#2563eb'),
      mk('Socios Bizum',r=>rango(r)==='SOCIO'&&forma(r)==='BIZUM','#16a34a'),
      mk('Socios Efectivo',r=>rango(r)==='SOCIO'&&forma(r)==='EFECTIVO','#84cc16'),
      mk('No socios Banco',r=>rango(r)!=='SOCIO'&&forma(r)==='BANCO','#60a5fa'),
      mk('No socios Bizum',r=>rango(r)!=='SOCIO'&&forma(r)==='BIZUM','#34d399'),
      mk('No socios Efectivo',r=>rango(r)!=='SOCIO'&&forma(r)==='EFECTIVO','#bef264'),
      mk('Pendiente de ingresar',r=>forma(r)==='PENDIENTE','#f59e0b')
    ];
  }
  function purchases(){
    try{ if(typeof comprasForEvent==='function') return comprasForEvent()||[]; }catch(_){ }
    return arr('compras').filter(c=>String(c.eventId||'')===eventId()).map(c=>{const p=product(c.productoId);return Object.assign({},c,{producto:p,tienda:tienda(c.tiendaId||p.tiendaId)});});
  }
  function isDon(t){ try{ return typeof isDonationTicket==='function' ? isDonationTicket(t) : ['DONADO SOCIO','DONADO TIENDA','DONADO OTROS'].includes(norm(t)); }catch(_){ return ['DONADO SOCIO','DONADO TIENDA','DONADO OTROS'].includes(norm(t)); } }
  function isCurr(t){ try{ return typeof isCurrentExpenseTicket==='function' ? isCurrentExpenseTicket(t) : up(t)==='GASTOS CORRIENTES'; }catch(_){ return up(t)==='GASTOS CORRIENTES'; } }
  function cVal(c){ return num(c.valor)||(num(c.unidades)*num(c.precioCalc??c.precio??c.producto?.precio??c.producto?.defaultPrecio)); }
  function graphDataFixed(){
    const items=incomeItems();
    const incomes={socioBanco:items[0].value,socioBizum:items[1].value,socioEfectivo:items[2].value,noSocioBanco:items[3].value,noSocioBizum:items[4].value,noSocioEfectivo:items[5].value,pendiente:items[6].value};
    incomes.total=items.reduce((a,b)=>a+b.value,0); incomes.realizado=incomes.total-incomes.pendiente;
    const cs=purchases();
    const donations={tiendas:sum(cs.filter(c=>norm(c.ticketDonacion)==='DONADO TIENDA'),cVal),socios:sum(cs.filter(c=>norm(c.ticketDonacion)==='DONADO SOCIO'),cVal),noSocios:sum(cs.filter(c=>norm(c.ticketDonacion)==='DONADO OTROS'),cVal)}; donations.total=donations.tiendas+donations.socios+donations.noSocios;
    const expenses={tk:sum(cs.filter(c=>!isDon(c.ticketDonacion)&&!isCurr(c.ticketDonacion)&&norm(c.ticketDonacion)),cVal),corrientes:sum(cs.filter(c=>isCurr(c.ticketDonacion)),cVal),pendiente:sum(cs.filter(c=>!isDon(c.ticketDonacion)&&!norm(c.ticketDonacion)),cVal)}; expenses.total=expenses.tk+expenses.corrientes+expenses.pendiente; expenses.realizado=expenses.tk+expenses.corrientes;
    return {incomes,donations,expenses,saldoActual:incomes.realizado-expenses.realizado,saldoOperativo:incomes.total-expenses.total,incomeItems:items};
  }
  function legend(items){ return `<div class="chart-note" style="display:flex;flex-wrap:wrap;gap:10px 16px;margin-top:8px">`+items.filter(x=>num(x.value)!==0).map(x=>`<span><span class="legend-dot" style="background:${x.color}"></span>${String(x.label).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}: ${money(x.value)}</span>`).join('')+`</div>`; }
  function esc(s){ return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function seg(value,color,title,max){ const w=(Math.max(0,num(value))/Math.max(1,max))*100; return `<div class="chart-seg" title="${esc(title)}" style="width:${w}%;background:${color};"></div>`; }
  function renderGraphFixed(){
    const wrap=$('eventChartWrap'); if(!wrap) return;
    const g=graphDataFixed(); const max=Math.max(1,g.incomes.total,g.donations.total,g.expenses.total,Math.abs(g.saldoActual),Math.abs(g.saldoOperativo));
    const inc=[{label:'Socios Banco',value:g.incomes.socioBanco,color:'#2563eb'},{label:'Socios Bizum',value:g.incomes.socioBizum,color:'#16a34a'},{label:'Socios Efectivo',value:g.incomes.socioEfectivo,color:'#84cc16'},{label:'No socios Banco',value:g.incomes.noSocioBanco,color:'#60a5fa'},{label:'No socios Bizum',value:g.incomes.noSocioBizum,color:'#34d399'},{label:'No socios Efectivo',value:g.incomes.noSocioEfectivo,color:'#bef264'},{label:'Pendiente de ingresar',value:g.incomes.pendiente,color:'#f59e0b'}];
    const don=[{label:'Donado por tiendas',value:g.donations.tiendas,color:'#fcd34d'},{label:'Donado por socios',value:g.donations.socios,color:'#f59e0b'},{label:'Donado por no socios',value:g.donations.noSocios,color:'#b45309'}];
    const exp=[{label:'Gastado por ticket',value:g.expenses.tk,color:'#dc2626'},{label:'Gastos corrientes',value:g.expenses.corrientes,color:'#ef4444'},{label:'Pte. Compra u otros gastos',value:g.expenses.pendiente,color:'#fb7185'}];
    const sal1=[{label:'Saldo actual',value:Math.abs(g.saldoActual),color:g.saldoActual>=0?'#0f766e':'#b91c1c'}];
    const sal2=[{label:'Saldo operativo',value:Math.abs(g.saldoOperativo),color:g.saldoOperativo>=0?'#155e75':'#7f1d1d'}];
    wrap.innerHTML=`<div class="chart-shell"><div class="chart-bars">
      <div class="chart-row"><div class="chart-label">INGRESOS: ${money(g.incomes.total)}</div><div><div class="chart-track">${inc.map(x=>seg(x.value,x.color,x.label+': '+money(x.value),max)).join('')}</div>${legend(inc)}</div></div>
      <div class="chart-row"><div class="chart-label">DONACIÓN DE PRODUCTO: ${money(g.donations.total)}</div><div><div class="chart-track">${don.map(x=>seg(x.value,x.color,x.label+': '+money(x.value),max)).join('')}</div>${legend(don)}</div></div>
      <div class="chart-row"><div class="chart-label">GASTOS: ${money(g.expenses.total)}</div><div><div class="chart-track">${exp.map(x=>seg(x.value,x.color,x.label+': '+money(x.value),max)).join('')}</div>${legend(exp)}</div></div>
      <div class="chart-row"><div class="chart-label">SALDO ACTUAL: ${money(g.saldoActual)}</div><div><div class="chart-track">${sal1.map(x=>seg(x.value,x.color,x.label+': '+money(g.saldoActual),max)).join('')}</div>${legend([{label:'Saldo actual',value:g.saldoActual,color:sal1[0].color}])}</div></div>
      <div class="chart-row"><div class="chart-label">SALDO OPERATIVO: ${money(g.saldoOperativo)}</div><div><div class="chart-track">${sal2.map(x=>seg(x.value,x.color,x.label+': '+money(g.saldoOperativo),max)).join('')}</div>${legend([{label:'Saldo operativo',value:g.saldoOperativo,color:sal2[0].color}])}</div></div>
      </div></div>`;
  }
  async function chartImageFixed(){
    const canvas=document.createElement('canvas'); canvas.width=1180; canvas.height=760; const ctx=canvas.getContext('2d'); const g=graphDataFixed();
    const max=Math.max(1,g.incomes.total,g.donations.total,g.expenses.total,Math.abs(g.saldoOperativo));
    const rows=[
      {label:`INGRESOS: ${money(g.incomes.total)}`,items:[{label:'Socios Banco',value:g.incomes.socioBanco,color:'#2563eb'},{label:'Socios Bizum',value:g.incomes.socioBizum,color:'#16a34a'},{label:'Socios Efectivo',value:g.incomes.socioEfectivo,color:'#84cc16'},{label:'No socios Banco',value:g.incomes.noSocioBanco,color:'#60a5fa'},{label:'No socios Bizum',value:g.incomes.noSocioBizum,color:'#34d399'},{label:'No socios Efectivo',value:g.incomes.noSocioEfectivo,color:'#bef264'},{label:'Pendiente',value:g.incomes.pendiente,color:'#f59e0b'}]},
      {label:`DONACIÓN DE PRODUCTO: ${money(g.donations.total)}`,items:[{label:'Donado tiendas',value:g.donations.tiendas,color:'#fcd34d'},{label:'Donado socios',value:g.donations.socios,color:'#f59e0b'},{label:'Donado no socios',value:g.donations.noSocios,color:'#b45309'}]},
      {label:`GASTOS: ${money(g.expenses.total)}`,items:[{label:'TKxx',value:g.expenses.tk,color:'#dc2626'},{label:'Gastos corrientes',value:g.expenses.corrientes,color:'#ef4444'},{label:'Pte. compra',value:g.expenses.pendiente,color:'#fb7185'}]},
      {label:`SALDO OPERATIVO: ${money(g.saldoOperativo)}`,items:[{label:'Saldo operativo',value:Math.abs(g.saldoOperativo),color:g.saldoOperativo>=0?'#155e75':'#7f1d1d'}]}
    ];
    ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.font='bold 24px Arial'; ctx.fillStyle='#111827'; ctx.fillText('ControlEvent - Gráficas del evento',40,45);
    let y=95; rows.forEach(row=>{ctx.font='bold 20px Arial';ctx.fillStyle='#111827';ctx.fillText(row.label,40,y); let x0=330,barW=790,h=34,x=x0; ctx.fillStyle='#f3f4f6';ctx.fillRect(x0,y-25,barW,h); row.items.forEach(it=>{const w=(Math.max(0,num(it.value))/max)*barW; if(w>0){ctx.fillStyle=it.color;ctx.fillRect(x,y-25,w,h); x+=w;}}); let lx=x0,ly=y+35; ctx.font='15px Arial'; row.items.filter(it=>num(it.value)!==0).forEach(it=>{const t=`${it.label}: ${money(it.value)}`; const tw=ctx.measureText(t).width+32; if(lx+tw>1120){lx=x0;ly+=24;} ctx.fillStyle=it.color;ctx.fillRect(lx,ly-12,12,12); ctx.fillStyle='#334155';ctx.fillText(t,lx+18,ly); lx+=tw;}); y+=150;});
    return canvas.toDataURL('image/png');
  }
  function patch(){
    try{ document.title=VERSION; }catch(_){ }
    try{ document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{ if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||'')) el.textContent=VERSION; }); }catch(_){ }
    try{ window.graphDataV160=graphDataFixed; graphDataV160=graphDataFixed; }catch(_){ window.graphDataV160=graphDataFixed; }
    try{ window.graphDataV143=graphDataFixed; graphDataV143=graphDataFixed; }catch(_){ window.graphDataV143=graphDataFixed; }
    try{ window.graphData=graphDataFixed; graphData=graphDataFixed; }catch(_){ window.graphData=graphDataFixed; }
    try{ window.renderGraficas=renderGraphFixed; renderGraficas=renderGraphFixed; }catch(_){ window.renderGraficas=renderGraphFixed; }
    try{ window.makeChartImageDataUrl=chartImageFixed; window.makeChartImageDataUrlV160=chartImageFixed; window.makeChartImageDataUrlV164=chartImageFixed; window.makeChartImageDataUrlV171=chartImageFixed; makeChartImageDataUrl=chartImageFixed; makeChartImageDataUrlV160=chartImageFixed; makeChartImageDataUrlV164=chartImageFixed; makeChartImageDataUrlV171=chartImageFixed; }catch(_){ window.makeChartImageDataUrl=chartImageFixed; }
    try{ window.emittedByTextV171=function(date=new Date()){const p=n=>String(n).padStart(2,'0');return `Emitido por “©oltyLAB ’26_${VERSION_FILE}_${p(date.getDate())}${p(date.getMonth()+1)}${date.getFullYear()}_${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}”`;}; emittedByTextV171=window.emittedByTextV171; }catch(_){ }
  }
  const oldRender=typeof render==='function'?render:null;
  if(oldRender&&!oldRender.__ce_v2366){ const w=function(){const r=oldRender.apply(this,arguments); setTimeout(()=>{patch(); try{ if((typeof currentMainTab!=='undefined'&&currentMainTab==='graficas')||!$('tabGraficas')?.classList.contains('hidden')) renderGraphFixed(); }catch(_){ }},40); return r;}; w.__ce_v2366=true; try{render=w;window.render=w;}catch(_){ } }
  window.__ceIncomeCheckV2366=function(){ const rows=incomeRowsRaw().map(r=>({nombre:personName(r),rango:rango(r),situacion:forma(r),...incomeParts(r)})); console.table(rows); console.log('Socios Banco', incomeItems()[0].value); console.log('Total ingresos', incomeItems().reduce((a,b)=>a+b.value,0)); return rows; };
  patch(); setTimeout(patch,50); setTimeout(()=>{try{renderGraphFixed();}catch(_){}},250); setTimeout(()=>{try{renderGraphFixed();}catch(_){}},1000);
})();

;/* ===== END legacy-inline-52-v2366-direct-income-chart-fix.js ===== */


;/* ===== BEGIN legacy-inline-53-v240-fixes.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #53. */
/* ==== v24.0: tienda/ticket pendiente, graficas limpias, orden ingresos y fotos INFOEVENTO ==== */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v28.10';
  const VERSION_FILE = 'ControlEvent_v28_10';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ');
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function parseNum(v){
    if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = String(v ?? '').trim();
    if(!s) return 0;
    s = s.replace(/[^0-9,.-]/g,'');
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',', '.');
    else if(s.includes(',')) s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  const money = v => parseNum(v).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
  const numText = v => parseNum(v).toLocaleString('es-ES',{minimumFractionDigits:0,maximumFractionDigits:2});
  const cmp = (a,b) => up(a).localeCompare(up(b),'es');
  function st(){ try{ return (typeof state !== 'undefined' && state) || window.state || {}; }catch(_){ return window.state || {}; } }
  function arr(k){ const s = st(); return Array.isArray(s[k]) ? s[k] : []; }
  function byId(k,id){ return arr(k).find(x => String(x.id) === String(id)) || {}; }
  function currentEvent(){
    try{ if(typeof selectedEvent === 'function'){ const e = selectedEvent(); if(e) return e; } }catch(_){ }
    return byId('eventos', st().selectedEventId);
  }
  function eventId(){ const e = currentEvent(); return String(e.id || st().selectedEventId || ''); }
  function persona(id){ try{ return (typeof personaById === 'function' ? personaById(id) : null) || byId('personas',id); }catch(_){ return byId('personas',id); } }
  function producto(id){ try{ return (typeof productoById === 'function' ? productoById(id) : null) || byId('productos',id); }catch(_){ return byId('productos',id); } }
  function tienda(id){ try{ return (typeof tiendaById === 'function' ? tiendaById(id) : null) || byId('tiendas',id); }catch(_){ return byId('tiendas',id); } }
  function compras(){
    try{ const rows = typeof comprasForEvent === 'function' ? comprasForEvent() : null; if(Array.isArray(rows)) return rows; }catch(_){ }
    const id = eventId();
    return arr('compras').filter(c => String(c.eventId || '') === id).map(c => ({...c, producto: producto(c.productoId), tienda: tienda(c.tiendaId), responsable: persona(c.responsableId)}));
  }
  function colaboradores(){
    try{ const rows = typeof collabsForEvent === 'function' ? collabsForEvent() : null; if(Array.isArray(rows)) return rows; }catch(_){ }
    const id = eventId();
    return arr('colaboradores').filter(c => String(c.eventId || '') === id).map(c => ({...c, persona: persona(c.personaId)}));
  }
  function productName(c){ return norm(c?.producto?.nombre || producto(c?.productoId).nombre || c?.productoNombre || 'Producto'); }
  function storeName(c){
    const p = producto(c?.productoId);
    const id = c?.tiendaId || p.tiendaId || p.defaultTiendaId || '';
    const name = norm(c?.tienda?.nombre || tienda(id).nombre || '');
    return name || 'Sin tienda asignada';
  }
  function donorName(c){
    try{ if(typeof donorLabel === 'function' && c?.donorRef){ const d = donorLabel(c.donorRef); if(norm(d)) return norm(d); } }catch(_){ }
    const raw = norm(c?.donorRef || c?.donante || c?.donanteNombre || '');
    if(raw.startsWith('P:')) return persona(raw.slice(2)).nombre || 'Sin donante';
    if(raw.startsWith('T:')) return tienda(raw.slice(2)).nombre || 'Sin donante';
    return raw || c?.donorLabel || c?.responsable?.nombre || storeName(c) || 'Sin donante';
  }
  function ticket(c){ return norm(c?.ticketDonacion || c?.ticket || ''); }
  function isDonation(v){ try{ return typeof isDonationTicket === 'function' ? isDonationTicket(v) : up(v).startsWith('DONADO'); }catch(_){ return up(v).startsWith('DONADO'); } }
  function isCurrent(v){ try{ return typeof isCurrentExpenseTicket === 'function' ? isCurrentExpenseTicket(v) : up(v) === 'GASTOS CORRIENTES'; }catch(_){ return up(v) === 'GASTOS CORRIENTES'; } }
  function units(c){ return parseNum(c?.unidades ?? c?.uds ?? 0); }
  function price(c){ const p = producto(c?.productoId); return parseNum(c?.precio ?? c?.precioCalc ?? p.defaultPrecio ?? p.precio ?? 0); }
  function value(c){ return parseNum(c?.valor ?? c?.importe) || units(c) * price(c); }
  function ticketImageKey(label, id = eventId()){
    try{ if(typeof ticketImageStateKey === 'function') return ticketImageStateKey(label, id); }catch(_){ }
    return `${id}|${label}`;
  }
  function cleanLabel(label){ return norm(label).split('·')[0].split('·')[0].trim(); }
  function ticketToken(label){
    const m = up(label).match(/\b(?:TK|TICKET)\s*[-_]*\s*[A-Z0-9]+\b/);
    return m ? m[0].replace(/\s+/g,'') : '';
  }
  function imageValue(ref){
    if(!ref) return '';
    if(typeof ref === 'string') return norm(ref);
    if(typeof ref === 'object') return norm(ref.dataUrl || ref.base64 || ref.url || ref.public_url || ref.publicUrl || ref.pathname || ref.path || ref.href || '');
    return '';
  }
  function imageCandidates(label){
    const id = eventId();
    const base = norm(label);
    const clean = cleanLabel(base);
    const out = [];
    const add = v => { v = norm(v); if(v && !out.includes(v)) out.push(v); };
    [base, clean, ticketImageKey(base,id), ticketImageKey(clean,id), `${id}|${base}`, `${id}|${clean}`].forEach(add);
    const parts = clean.split('|').map(x => norm(x)).filter(Boolean);
    if(parts.length >= 2){
      const a = parts[0], b = parts[1];
      [`${a}|${b}`, `${a} | ${b}`, `${b}|${a}`, `${b} | ${a}`, b].forEach(x => { add(x); add(ticketImageKey(x,id)); });
    }
    const tk = ticketToken(base);
    if(tk){ add(tk); add(ticketImageKey(tk,id)); add(`${id}|${tk}`); }
    return out;
  }
  function imageRefFor(label){
    const s = st();
    const stores = [s.ticketImages || {}, s.ticketImageRefs || {}];
    for(const key of imageCandidates(label)){
      for(const bag of stores){ const found = imageValue(bag[key]); if(found) return found; }
    }
    const tk = ticketToken(label);
    const parts = cleanLabel(label).split('|').map(x=>up(x)).filter(Boolean);
    const wantStore = parts[0] || '';
    const id = eventId();
    for(const bag of stores){
      for(const [k,v] of Object.entries(bag)){
        const ks = String(k);
        if(id && ks.includes('|') && !ks.startsWith(id + '|')) continue;
        const rest = up(ks.replace(id + '|',''));
        if(tk && rest.includes(tk) && (!wantStore || rest.includes(wantStore))){
          const found = imageValue(v);
          if(found) return found;
        }
      }
    }
    return '';
  }
  function setTip(el, text, bg = '#fff', layout = 'default'){
    if(!el || !norm(text)) return;
    el.setAttribute('data-ce-tip-v21', text);
    el.setAttribute('data-tip-bg-v21', bg || '#fff');
    el.setAttribute('data-ce-tip-layout-v21', layout || 'default');
    el.dataset.v24Tip = '1';
    ['title','data-tip','data-ce-tip','data-v181-tip','data-ce-tip-v196','data-ce-tip-v1952'].forEach(a => el.removeAttribute(a));
  }
  function clearTip(el){
    if(!el) return;
    ['title','data-tip','data-ce-tip','data-v181-tip','data-ce-tip-v196','data-ce-tip-v1952','data-ce-tip-v21','data-tip-bg-v21','data-ce-tip-layout-v21'].forEach(a => el.removeAttribute(a));
    if(el.dataset) delete el.dataset.v24Tip;
  }
  function lineForPurchase(c, first){
    return `${first} | ${storeName(c)} | ${productName(c)} | ${numText(units(c))} | ${money(price(c))} | ${money(value(c))}`;
  }
  function summaryByTiendaTicketV240(){
    const filled = new Map();
    const pending = new Map();
    compras().forEach(c => {
      const tk = ticket(c);
      const v = value(c);
      const donated = isDonation(tk);
      if(!donated && (!tk || isCurrent(tk))){
        const key = `${storeName(c)} | Pte. Compra u otros gastos`;
        if(!pending.has(key)) pending.set(key, {k:key,label:key,v:0,rawTicket:'',pending:true,donated:false,attachable:false,lines:[],products:[]});
        const rec = pending.get(key);
        rec.v += v;
        rec.lines.push(lineForPurchase(c, tk || 'PTE.COMPRA'));
        rec.products.push(productName(c));
        return;
      }
      const holder = donated ? donorName(c) : storeName(c);
      const key = `${holder} | ${tk || 'Pte. Compra u otros gastos'}`;
      if(!filled.has(key)) filled.set(key, {k:key,label:key,v:0,rawTicket:tk,pending:false,donated,attachable:!donated,lines:[],products:[]});
      const rec = filled.get(key);
      rec.v += v;
      rec.donated = rec.donated || donated;
      rec.attachable = rec.attachable && !donated && !isCurrent(tk);
      rec.products.push(productName(c));
      rec.lines.push(donated
        ? `${donorName(c)} | ${productName(c)} | ${numText(units(c))} | ${money(price(c))} | ${money(v)}`
        : lineForPurchase(c, tk || 'PTE.COMPRA'));
    });
    const rows = [...filled.values(), ...pending.values()].map(r => {
      const products = Array.from(new Set((r.products || []).filter(Boolean)));
      const label = r.donated && products.length ? `${r.k} · ${products.join(' · ')}` : r.k;
      return {...r, label, image: r.attachable ? imageRefFor(r.k) : ''};
    });
    const sortMode = st().summaryTiendaSort || 'tienda';
    rows.sort((a,b) => {
      const [ta='',tka=''] = String(a.k||'').split(' | ');
      const [tb='',tkb=''] = String(b.k||'').split(' | ');
      if(sortMode === 'ticket') return cmp(tka,tkb) || cmp(ta,tb);
      return cmp(ta,tb) || cmp(tka,tkb);
    });
    return rows;
  }
  function ticketTip(row){
    const title = row.pending ? 'CALCULOS POR AGRUPACION / POR TIENDA Y TICKET / PTE. COMPRA U OTROS GASTOS' : (row.donated ? 'CALCULOS POR AGRUPACION / POR DONANTE Y DONACION' : 'CALCULOS POR AGRUPACION / POR TIENDA Y TICKET');
    const header = row.donated ? 'Donante | Producto | Uds | Precio estimado | Valor estimado' : 'Ticket/Otros gastos | Tienda | Producto | Uds | Precio | Total';
    const totalLabel = row.donated ? 'TOTAL ESTIMADO' : 'TOTAL';
    const lines = (row.lines || []).filter(Boolean);
    return `${title}\n${row.k || row.label || ''}\n${totalLabel}: ${money(row.v)}\n\n${header}\n${lines.length ? lines.join('\n') : 'Sin productos'}`;
  }
  function renderTiendaTicketV240(targetId, rows){
    const wrap = $(targetId);
    if(!wrap) return;
    rows = Array.isArray(rows) ? rows : summaryByTiendaTicketV240();
    wrap.innerHTML = '';
    const tools = document.createElement('div');
    tools.className = 'hint ce-v24-sortbar';
    const mode = st().summaryTiendaSort || 'tienda';
    tools.innerHTML = `<span>Ordenar por:</span><button type="button" class="outline small ${mode==='tienda'?'active':''}" data-v24-summary-sort="tienda">Tienda</button><button type="button" class="outline small ${mode==='ticket'?'active':''}" data-v24-summary-sort="ticket">Ticket/Donacion/Otros gastos</button>`;
    wrap.appendChild(tools);
    if(!rows.length){
      const empty = document.createElement('div');
      empty.className = 'hint';
      empty.textContent = 'Sin datos.';
      wrap.appendChild(empty);
      return;
    }
    let total = 0;
    rows.forEach(r => {
      total += parseNum(r.v);
      const div = document.createElement('div');
      div.className = 'summary-item' + (r.pending ? ' red-row' : '');
      const amountStyle = r.pending ? ' style="background:#fef2f2;color:#b91c1c"' : (r.donated ? ' style="text-decoration:line-through"' : '');
      const encoded = encodeURIComponent(r.k || r.label || '');
      const img = r.attachable ? imageRefFor(r.k || r.label || '') : '';
      const preview = img ? `<img class="ticket-thumb" src="${esc(img)}" alt="ticket" />` : '<span class="hint">Sin imagen</span>';
      const actions = r.attachable && !r.pending
        ? `<span class="ticket-actions"><button type="button" class="outline small" title="Insertar foto" onclick="uploadTicketImage('${encoded}'); return false;">Adjuntar</button>${preview}${img ? `<button type="button" class="outline small" title="Eliminar foto" onclick="removeTicketImage('${encoded}'); return false;">Eliminar</button>` : ''}</span>`
        : '';
      div.innerHTML = `<span>${esc(r.label || r.k || '')}</span><span style="display:flex;align-items:center;gap:8px;justify-content:flex-end;"><span class="pill"${amountStyle}>${esc(money(r.v))}</span>${actions}</span>`;
      const tip = ticketTip(r);
      setTip(div, tip, '#fff', r.pending ? 'ticketpendingv240' : (r.donated ? 'ticketdonationv240' : 'ticketpurchasev240'));
      div.querySelectorAll(':scope > span').forEach(el => setTip(el, tip, '#fff', r.pending ? 'ticketpendingv240' : (r.donated ? 'ticketdonationv240' : 'ticketpurchasev240')));
      wrap.appendChild(div);
    });
    const totalDiv = document.createElement('div');
    totalDiv.className = 'summary-item';
    totalDiv.style.fontWeight = '800';
    totalDiv.innerHTML = `<span>TOTAL</span><span class="pill">${esc(money(total))}</span>`;
    wrap.appendChild(totalDiv);
  }
  function groupingKeys(kind){
    try{
      const base = kind === 'segmento' ? SEGMENT_OPTIONS : DESTINO_OPTIONS;
      if(Array.isArray(base) && base.length) return base.slice();
    }catch(_){ }
    const set = new Set();
    compras().forEach(c => {
      const p = producto(c.productoId);
      const val = kind === 'segmento' ? (c.producto?.segmento || p.segmento || '') : (c.producto?.destino || p.destino || '');
      if(norm(val)) set.add(norm(val));
    });
    return Array.from(set).sort(cmp);
  }
  function groupRowsV240(kind){
    const all = compras();
    return groupingKeys(kind).map(label => {
      const rows = all.filter(c => {
        const p = producto(c.productoId);
        const val = kind === 'segmento' ? (c.producto?.segmento || p.segmento || '') : (c.producto?.destino || p.destino || '');
        return String(val) === String(label);
      });
      const comprados = rows.filter(c => !isDonation(ticket(c)) && ticket(c) && !isCurrent(ticket(c)));
      const donados = rows.filter(c => isDonation(ticket(c)));
      const pendientes = rows.filter(c => !isDonation(ticket(c)) && (!ticket(c) || isCurrent(ticket(c))));
      const sum = list => list.reduce((a,c)=>a+value(c),0);
      return {
        label,
        comprado: sum(comprados),
        donado: sum(donados),
        pendiente: sum(pendientes),
        total: sum(comprados) + sum(donados) + sum(pendientes),
        listComprado: comprados.map(c => lineForPurchase(c, ticket(c))).sort(cmp),
        listDonado: donados.map(c => `${donorName(c)} | ${productName(c)} | ${numText(units(c))} | ${money(price(c))} | ${money(value(c))}`).sort(cmp),
        listPendiente: pendientes.map(c => lineForPurchase(c, ticket(c) || 'PTE.COMPRA')).sort(cmp)
      };
    });
  }
  function groupTip(title, row, spec){
    const lines = (row[spec.list] || []).filter(Boolean);
    const header = spec.key === 'donado' ? 'Donante | Producto | Uds | Precio estimado | Valor estimado' : 'Ticket/Otros gastos | Tienda | Producto | Uds | Precio | Total';
    return `${title}\n${row.label}\n${spec.label}\n${spec.totalLabel}: ${money(row[spec.key])}\n\n${header}\n${lines.length ? lines.join('\n') : 'Sin productos'}`;
  }
  function renderGroupingBarsV240(targetId, rows){
    const wrap = $(targetId);
    if(!wrap) return;
    rows = Array.isArray(rows) ? rows : (targetId === 'summarySegmento' ? groupRowsV240('segmento') : groupRowsV240('destino'));
    const title = targetId === 'summarySegmento' ? 'Por segmento' : 'Por destino';
    const pageTitle = targetId === 'summarySegmento' ? 'CALCULOS POR AGRUPACION / POR SEGMENTO' : 'CALCULOS POR AGRUPACION / POR DESTINO';
    const specs = [
      {label:'Comprado', key:'comprado', list:'listComprado', color:'#dc2626', layout:'groupingv240buy', totalLabel:'TOTAL'},
      {label:'Donado', key:'donado', list:'listDonado', color:'#f59e0b', layout:'groupingv240don', totalLabel:'TOTAL ESTIMADO'},
      {label:'Pte. Compra u otros gastos', key:'pendiente', list:'listPendiente', color:'#fb7185', layout:'groupingv240pending', totalLabel:'TOTAL'}
    ];
    const visibleRows = rows.filter(r => specs.some(s => parseNum(r[s.key]) !== 0));
    const maxVal = Math.max(1, ...visibleRows.flatMap(r => specs.map(s => Math.abs(parseNum(r[s.key])))).filter(v => v > 0));
    const totals = Object.fromEntries(specs.map(s => [s.key, rows.reduce((a,r)=>a+parseNum(r[s.key]),0)]));
    const totalGeneral = rows.reduce((a,r)=>a+parseNum(r.total),0);
    wrap.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'vbars-wrap';
    const legend = specs.filter(s => parseNum(totals[s.key]) !== 0).map(s => `<span><span class="legend-dot" style="background:${s.color}"></span>${esc(s.label)}</span>`).join(' ');
    head.innerHTML = `<div class="vbars-total">${esc(title)} - TOTAL GENERAL: ${esc(money(totalGeneral))}</div>${legend ? `<div class="chart-note">${legend}</div>` : ''}`;
    wrap.appendChild(head);
    if(!visibleRows.length){
      const empty = document.createElement('div');
      empty.className = 'hint';
      empty.textContent = 'Sin datos para presentar graficas.';
      wrap.appendChild(empty);
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'vbars-grid';
    visibleRows.forEach(r => {
      const cols = specs.map(s => {
        if(parseNum(r[s.key]) === 0){
          const tip = groupTip(pageTitle, r, s);
          return `<div class="vbar-col ce-v24-zero-col" data-v24-kind="${s.key}" data-v24-tip="1" data-ce-tip-v21="${esc(tip)}" data-tip-bg-v21="#fff" data-ce-tip-layout-v21="${s.layout}" style="display:none"></div>`;
        }
        const h = Math.max(8, (Math.abs(parseNum(r[s.key])) / maxVal) * 170);
        const tip = groupTip(pageTitle, r, s);
        return `<div class="vbar-col" data-v24-kind="${s.key}" data-v24-tip="1" data-ce-tip-v21="${esc(tip)}" data-tip-bg-v21="#fff" data-ce-tip-layout-v21="${s.layout}"><div class="vbar-value">${esc(money(r[s.key]))}</div><div class="vbar-stick" data-v24-kind="${s.key}" data-v24-tip="1" data-ce-tip-v21="${esc(tip)}" data-tip-bg-v21="#fff" data-ce-tip-layout-v21="${s.layout}" style="height:${h}px;background:${s.color}"></div><div class="vbar-label">${esc(s.label)}</div></div>`;
      }).join('');
      const card = document.createElement('div');
      card.className = 'vbars-card';
      card.innerHTML = `<div class="vbars-title">${esc(r.label)} · ${esc(money(r.total))}</div><div class="vbars-chart ce-v24-vbars-chart">${cols}</div>`;
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
  }
  function applyCollabSortToolbar(){
    const wrap = $('collabList');
    if(!wrap || wrap.querySelector('.empty')) return;
    let bar = wrap.querySelector(':scope > .ce-v24-sortbar');
    if(!bar){
      bar = document.createElement('div');
      bar.className = 'ce-v24-sortbar';
      bar.innerHTML = '<span>Ordenar por:</span><button type="button" class="outline small" data-v24-collab-sort="colaborador">Colaborador/a</button><button type="button" class="outline small" data-v24-collab-sort="ingreso">Ingreso</button>';
      wrap.insertBefore(bar, wrap.firstChild);
    }
    const mode = st().collabsSort || 'colaborador';
    bar.querySelectorAll('[data-v24-collab-sort]').forEach(btn => btn.classList.toggle('active', btn.dataset.v24CollabSort === mode));
    const cards = Array.from(wrap.querySelectorAll(':scope > .itemcard'));
    const person = card => norm(card.querySelector('select[data-action="edit-collab-persona"] option:checked')?.textContent || card.textContent || '');
    const ingreso = card => norm(card.querySelector('select[data-action="edit-collab-situacion"]')?.value || '');
    cards.sort((a,b) => mode === 'ingreso' ? (cmp(ingreso(a), ingreso(b)) || cmp(person(a), person(b))) : cmp(person(a), person(b)));
    cards.forEach(card => wrap.appendChild(card));
  }
  function stripSaldoGraphTips(){
    const wrap = $('eventChartWrap');
    if(!wrap) return;
    wrap.querySelectorAll('.chart-row').forEach(row => {
      const label = up(row.querySelector('.chart-label')?.textContent || '');
      if(label.includes('SALDO ACTUAL') || label.includes('SALDO OPERATIVO')){
        row.dataset.v24NoTip = '1';
        row.querySelectorAll('.chart-seg,.chart-track,[data-ce-tip-v21],[data-ce-tip-v196],[data-tip],[title]').forEach(clearTip);
      }
    });
  }
  function refreshVersion(){
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
        const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
        const title = norm(ev?.titulo || currentEvent().titulo || 'evento').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'').replace(/_+/g,'_') || 'evento';
        return `${VERSION_FILE}_INFOEVENTO-${title}_${y}${m}${day}.xlsx`;
      };
    }catch(_){ }
    try{
      const proto = HTMLAnchorElement.prototype;
      if(!proto.click.__v240Wrapped){
        const prev = proto.click;
        const wrapped = function(){
          try{
            if(this.download) this.download = String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE).replace(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/ig, VERSION);
          }catch(_){ }
          return prev.apply(this, arguments);
        };
        wrapped.__v240Wrapped = true;
        proto.click = wrapped;
      }
    }catch(_){ }
  }
  function isDataUrl(v){ return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(String(v || '')); }
  function isPlainBase64(v){ const s = String(v || '').replace(/\s+/g,''); return s.length > 200 && /^[A-Za-z0-9+/=]+$/.test(s); }
  function blobToDataUrl(blob){
    return new Promise((resolve,reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error('No se pudo leer la imagen'));
      reader.onload = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(blob);
    });
  }
  async function sourceToDataUrl(src){
    src = imageValue(src);
    if(!src) return '';
    if(isDataUrl(src)) return src;
    if(isPlainBase64(src)) return 'data:image/jpeg;base64,' + src.replace(/\s+/g,'');
    let url = src;
    if(url.startsWith('//')) url = location.protocol + url;
    if(!/^https?:\/\//i.test(url) && !url.startsWith('/')) return '';
    const res = await fetch(url, {cache:'no-store'});
    if(!res.ok) throw new Error('No se pudo descargar la imagen del ticket');
    const blob = await res.blob();
    if(!/^image\//i.test(blob.type || 'image/jpeg')) return '';
    return await blobToDataUrl(blob);
  }
  async function hydrateServerImages(){
    try{
      const res = await fetch(`/api/ticket-images?eventId=${encodeURIComponent(eventId())}`, {cache:'no-store'});
      const data = await res.json();
      if(!res.ok || !data || !data.images) return;
      const s = st();
      if(!s.ticketImages) s.ticketImages = {};
      if(!s.ticketImageRefs) s.ticketImageRefs = {};
      Object.entries(data.images).forEach(([k,v]) => {
        const ref = imageValue(v) || imageValue(v?.pathname) || imageValue(v?.url);
        if(ref && !s.ticketImages[k]) s.ticketImages[k] = ref;
        if(v && typeof v === 'object') s.ticketImageRefs[k] = v;
      });
    }catch(_){ }
  }
  async function prepareTicketImagesForExcelV240(){
    await hydrateServerImages();
    const labels = new Set();
    try{ summaryByTiendaTicketV240().forEach(r => { if(r.attachable){ labels.add(r.k); labels.add(cleanLabel(r.label)); if(r.rawTicket) labels.add(r.rawTicket); } }); }catch(_){ }
    compras().forEach(c => {
      const tk = ticket(c);
      if(!tk || isDonation(tk) || isCurrent(tk)) return;
      labels.add(`${storeName(c)} | ${tk}`);
      labels.add(tk);
    });
    const s = st();
    if(!s.ticketImages) s.ticketImages = {};
    for(const label of Array.from(labels).filter(Boolean)){
      const ref = imageRefFor(label);
      if(!ref) continue;
      let dataUrl = '';
      try{ dataUrl = await sourceToDataUrl(ref); }catch(err){ console.warn('[v24.0] No se pudo preparar foto para Excel', label, err); }
      if(!dataUrl) continue;
      imageCandidates(label).forEach(k => { s.ticketImages[k] = dataUrl; });
    }
  }
  function wrapExport(){
    const prev = (typeof exportExcel === 'function') ? exportExcel : window.exportExcel;
    if(!prev || prev.__v240Wrapped) return;
    const wrapped = async function(){
      await prepareTicketImagesForExcelV240();
      return await prev.apply(this, arguments);
    };
    wrapped.__v240Wrapped = true;
    try{ exportExcel = wrapped; }catch(_){ }
    window.exportExcel = wrapped;
  }
  function wrapGraph(){
    const prev = (typeof renderGraficas === 'function') ? renderGraficas : window.renderGraficas;
    if(!prev || prev.__v240Wrapped) return;
    const wrapped = function(){
      const ret = prev.apply(this, arguments);
      setTimeout(stripSaldoGraphTips, 0);
      setTimeout(stripSaldoGraphTips, 80);
      return ret;
    };
    wrapped.__v240Wrapped = true;
    try{ renderGraficas = wrapped; }catch(_){ }
    window.renderGraficas = wrapped;
  }
  function wrapCollabs(){
    const prev = (typeof renderColabs === 'function') ? renderColabs : window.renderColabs;
    if(!prev || prev.__v240Wrapped) return;
    const wrapped = function(){
      const ret = prev.apply(this, arguments);
      applyCollabSortToolbar();
      return ret;
    };
    wrapped.__v240Wrapped = true;
    try{ renderColabs = wrapped; }catch(_){ }
    window.renderColabs = wrapped;
  }
  function installSummaryOverrides(){
    try{ summaryByTiendaTicket = summaryByTiendaTicketV240; }catch(_){ }
    window.summaryByTiendaTicket = summaryByTiendaTicketV240;
    try{ summaryBySegmento = function(){ return groupRowsV240('segmento'); }; window.summaryBySegmento = summaryBySegmento; }catch(_){ window.summaryBySegmento = function(){ return groupRowsV240('segmento'); }; }
    try{ summaryByDestino = function(){ return groupRowsV240('destino'); }; window.summaryByDestino = summaryByDestino; }catch(_){ window.summaryByDestino = function(){ return groupRowsV240('destino'); }; }
    const prev = (typeof renderSummaryList === 'function') ? renderSummaryList : window.renderSummaryList;
    if(prev && !prev.__v240Wrapped){
      const wrapped = function(targetId, rows){
        if(targetId === 'summarySegmento' || targetId === 'summaryDestino') return renderGroupingBarsV240(targetId, rows || []);
        if(targetId === 'summaryTiendaTicket') return renderTiendaTicketV240(targetId, rows || summaryByTiendaTicketV240());
        return prev.apply(this, arguments);
      };
      wrapped.__v240Wrapped = true;
      try{ renderSummaryList = wrapped; }catch(_){ }
      window.renderSummaryList = wrapped;
    }
  }
  function applyV240(){
    refreshVersion();
    installSummaryOverrides();
    wrapGraph();
    wrapCollabs();
    wrapExport();
    try{
      if($('summarySegmento')) renderGroupingBarsV240('summarySegmento', groupRowsV240('segmento'));
      if($('summaryDestino')) renderGroupingBarsV240('summaryDestino', groupRowsV240('destino'));
      if($('summaryTiendaTicket')) renderTiendaTicketV240('summaryTiendaTicket', summaryByTiendaTicketV240());
    }catch(_){ }
    stripSaldoGraphTips();
    applyCollabSortToolbar();
  }
  document.addEventListener('click', ev => {
    const sortSummary = ev.target?.closest?.('[data-v24-summary-sort]');
    if(sortSummary){
      ev.preventDefault(); ev.stopPropagation();
      st().summaryTiendaSort = sortSummary.dataset.v24SummarySort || 'tienda';
      try{ if(typeof renderBudget === 'function') renderBudget(); }catch(_){ try{ renderSummaryList('summaryTiendaTicket', summaryByTiendaTicketV240()); }catch(__){ } }
      return false;
    }
    const sortCollab = ev.target?.closest?.('[data-v24-collab-sort]');
    if(sortCollab){
      ev.preventDefault(); ev.stopPropagation();
      st().collabsSort = sortCollab.dataset.v24CollabSort || 'colaborador';
      try{ if(typeof renderColabs === 'function') renderColabs(); }catch(_){ applyCollabSortToolbar(); }
      return false;
    }
  }, true);
  const oldRender = (typeof render === 'function') ? render : null;
  if(oldRender && !oldRender.__v240Wrapped){
    const wrapped = function(){
      const ret = oldRender.apply(this, arguments);
      [60, 220, 700, 1500, 2600].forEach(ms => setTimeout(applyV240, ms));
      return ret;
    };
    wrapped.__v240Wrapped = true;
    try{ render = wrapped; }catch(_){ }
    window.render = wrapped;
  }
  applyV240();
  [120, 400, 1100, 2100, 3200].forEach(ms => setTimeout(applyV240, ms));
  window.__ceV240 = {summaryByTiendaTicket: summaryByTiendaTicketV240, prepareTicketImagesForExcel: prepareTicketImagesForExcelV240};
})();

;/* ===== END legacy-inline-53-v240-fixes.js ===== */


;/* ===== BEGIN legacy-inline-54-v241-fixes.js ===== */

/* ControlEvent v28.10 - JS legacy extraido de public/index.html. Bloque inline #54. */
(function(){
  const VERSION = 'ControlEvent v28.10';
  const VERSION_FILE = 'ControlEvent_v28_10';
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

;/* ===== END legacy-inline-54-v241-fixes.js ===== */

