/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #1. */
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
    './vendor/exceljs.min.js',
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
      nextState.productos.push({
        id,
        eventId: eventMap[eventCode],
        nombre,
        segmento: String(pick(row, ['PRODUCTO_SEGMENTO','SEGMENTO'], 'COMIDA')).trim().toUpperCase(),
        destino: String(pick(row, ['PRODUCTO_DESTINO','DESTINO'], 'COMIDA')).trim().toUpperCase(),
        precio: parseEuroInput(pick(row, ['PRODUCTO_PRECIO','PRECIO'], 0)),
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
    productos: (parsed.productos || defaults.productos).map(p => ({
      id: p.id || uid(),
      nombre: p.nombre || '',
      segmento: p.segmento || '',
      destino: p.destino || ''
    })),
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
  wb.creator = 'ControlEvent v26.6 - ©oltyLAB ’26';
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
  a.download = 'ControlEvent_v26_6_descarga_datos.xlsx';
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
  wb.creator = 'ControlEvent v26.6 - ©oltyLAB ’26';
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
  putText(wsRes,r,1,'Generado por'); putText(wsRes,r++,2,'ControlEvent v26.6 - ©oltyLAB ’26');
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
  link.download = `${(ev.titulo || 'evento').replace(/\s+/g,'_')}_ControlEvent_v26_6.xlsx`;
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
        baseState.productos.push({
          id,
          nombre,
          segmento: String(pick(row, ['PRODUCTO_SEGMENTO','SEGMENTO'], 'COMIDA')).trim().toUpperCase(),
          destino: String(pick(row, ['PRODUCTO_DESTINO','DESTINO'], 'COMIDA')).trim().toUpperCase()
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
    wb.creator = 'ControlEvent v26.6 - ©oltyLAB ’26';
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
    a.download = 'ControlEvent_v26_6_descarga_datos.xlsx';
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
