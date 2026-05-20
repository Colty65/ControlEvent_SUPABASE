/* ControlEvent v30.9.1.1 - Diagnóstico no intrusivo de mantenimiento.
   No sustituye altas/modificaciones/borrados: sólo comprueba estructura, acciones y datos.
   v28.0 corrige falso aviso de IMPORTACIÓN: clearImportStatus es opcional/no expuesta en algunas rutas. */
const VERSION = 'v30.9.1';

const SECTIONS = [
  {
    name: 'personas', label: 'PERSONAS', rootId: 'mtPersonas', listId: 'personasList',
    fields: ['newPersonaNombre', 'newPersonaRango'], buttons: ['btnAddPersona'], actions: ['addPersona'], stateKey: 'personas'
  },
  {
    name: 'eventos', label: 'EVENTOS', rootId: 'mtEventos', listId: 'eventosList',
    fields: ['newEventoTitulo', 'newEventoPrecio', 'newEventoFechaIni', 'newEventoFechaFin', 'newEventoSituacion', 'newEventoDescripcion'],
    buttons: ['btnAddEvento'], actions: ['addEvento'], stateKey: 'eventos'
  },
  {
    name: 'tiendas', label: 'TIENDAS', rootId: 'mtTiendas', listId: 'tiendasList',
    fields: ['newTiendaNombre'], buttons: ['btnAddTienda'], actions: ['addTienda'], stateKey: 'tiendas'
  },
  {
    name: 'productos', label: 'PRODUCTOS', rootId: 'mtProductos', listId: 'productosList',
    fields: ['newProductoNombre', 'newProductoSegmento', 'newProductoDestino', 'newProductoPrecio'],
    buttons: ['btnAddProducto'], actions: ['addProducto'], stateKey: 'productos'
  },
  {
    name: 'importacion', label: 'IMPORTACIÓN', rootId: 'mtImportar', listId: 'importStatus',
    fields: ['importMode', 'importWorkbookFile', 'importTicketFiles'], buttons: ['btnStartImport', 'btnClearImportStatus'],
    actions: ['importInitialWorkbook'], optionalActions: ['clearImportStatus'], stateKey: null,
    notesIfOptionalMissing: {
      clearImportStatus: 'clearImportStatus no está expuesta como función global; no es problema si la carga/limpieza visual funciona.'
    }
  },
  {
    name: 'acceso', label: 'ACCESO', rootId: 'mtAcceso', listId: 'accesoList',
    fields: ['newAccesoIdentificacion', 'newAccesoNombre', 'newAccesoClave', 'newAccesoNivel'],
    buttons: ['btnAddAcceso'], actions: ['saveAccessUser'], stateKey: 'accessUsers', godOnly: true
  }
];

function app(){ return window.ControlEventApp || window.ControlEventRuntime?.app || window; }
function state(){ return app()?.state || window.state || {}; }
function byId(id){ return id ? document.getElementById(id) : null; }
function exists(id){ return !!byId(id); }
function isHidden(el){ return !!el?.classList?.contains('hidden') || !!el?.closest?.('.hidden'); }
function actionExists(name){ return typeof window[name] === 'function' || typeof app()?.actions?.[name] === 'function'; }
function valueOf(id){ const el = byId(id); return el?.value ?? ''; }
function collectionSize(key){
  if(!key) return null;
  const src = state()?.[key] ?? window[key];
  if(Array.isArray(src)) return src.length;
  if(src && typeof src === 'object') return Object.keys(src).length;
  return 0;
}
function currentUserLevel(){
  return app()?.auth?.currentUser?.nivel || window.authUser?.nivel || window.currentUser?.nivel || '';
}
function fieldInfo(id){
  const el = byId(id);
  return {id, exists: !!el, disabled: !!el?.disabled, readonly: !!el?.readOnly, value: el?.type === 'password' ? (el.value ? '***' : '') : (el?.value ?? ''), tag: el?.tagName || null};
}
function buttonInfo(id){
  const el = byId(id);
  return {id, exists: !!el, disabled: !!el?.disabled, hidden: isHidden(el), text: el?.textContent?.trim?.() || ''};
}
function sectionReport(section){
  const root = byId(section.rootId);
  const report = {
    version: VERSION,
    name: section.name,
    label: section.label,
    rootId: section.rootId,
    rootExists: !!root,
    rootHidden: isHidden(root),
    listId: section.listId,
    listExists: exists(section.listId),
    stateKey: section.stateKey,
    records: collectionSize(section.stateKey),
    fields: section.fields.map(fieldInfo),
    buttons: section.buttons.map(buttonInfo),
    actions: (section.actions || []).map(name => ({name, exists: actionExists(name), required: true})),
    optionalActions: (section.optionalActions || []).map(name => ({name, exists: actionExists(name), required: false})),
    userLevel: currentUserLevel(),
    structuralProblems: [],
    notes: []
  };
  if(!report.rootExists) report.structuralProblems.push(`No existe el contenedor ${section.rootId}.`);
  if(section.listId && !report.listExists) report.structuralProblems.push(`No existe el listado/estado ${section.listId}.`);
  report.fields.forEach(item => { if(!item.exists) report.structuralProblems.push(`No existe el campo ${item.id}.`); });
  report.buttons.forEach(item => { if(!item.exists) report.structuralProblems.push(`No existe el botón ${item.id}.`); });
  report.actions.forEach(item => { if(!item.exists) report.structuralProblems.push(`No existe la acción legacy ${item.name}.`); });
  report.optionalActions.forEach(item => {
    if(!item.exists){
      const note = section.notesIfOptionalMissing?.[item.name] || `Acción opcional no expuesta: ${item.name}.`;
      report.notes.push(note);
    }
  });
  if(section.godOnly && report.userLevel && report.userLevel !== 'GD') report.notes.push('Sección visible/usable sólo para nivel GD.');
  return report;
}
function inspect(){
  const sections = Object.fromEntries(SECTIONS.map(section => [section.name, sectionReport(section)]));
  const structuralProblems = Object.values(sections).flatMap(report => report.structuralProblems.map(msg => `${report.label}: ${msg}`));
  const counts = {
    eventos: collectionSize('eventos'),
    personas: collectionSize('personas'),
    tiendas: collectionSize('tiendas'),
    productos: collectionSize('productos'),
    accessUsers: collectionSize('accessUsers')
  };
  return {version: VERSION, ok: structuralProblems.length === 0, mode: 'diagnostic-only', counts, sections, structuralProblems};
}
function print(){
  const report = inspect();
  console.group(`[ControlEventMaintenanceDiagnostics/${VERSION}] Diagnóstico de mantenimiento`);
  Object.values(report.sections).forEach(section => {
    if(section.structuralProblems.length) console.warn(`[ControlEventMaintenanceDiagnostics/${VERSION}] ${section.label}: problemas estructurales`, section.structuralProblems, section);
    else console.info(`[ControlEventMaintenanceDiagnostics/${VERSION}] ${section.label}: OK`, {records: section.records, rootHidden: section.rootHidden, notes: section.notes});
  });
  console.info(`[ControlEventMaintenanceDiagnostics/${VERSION}] Conteos`, report.counts);
  console.groupEnd();
  return report;
}
function section(name){
  const found = SECTIONS.find(item => item.name === name || item.label.toLowerCase() === String(name || '').toLowerCase());
  return found ? sectionReport(found) : null;
}
function productPrices(){
  const productos = state()?.productos || [];
  const rows = (Array.isArray(productos) ? productos : Object.values(productos || {})).map(p => ({
    id: p?.id || '',
    nombre: p?.nombre || p?.producto || '',
    segmento: p?.segmento || '',
    destino: p?.destino || '',
    precio: Number(p?.precio ?? p?.defaultPrecio ?? 0) || 0,
    defaultPrecio: Number(p?.defaultPrecio ?? p?.precio ?? 0) || 0
  }));
  try{ console.table(rows); }catch(_){ }
  return rows;
}
function info(){
  return {version: VERSION, mode: 'diagnostic-only', sections: SECTIONS.map(s => s.name), note: 'No cambia mantenimiento; sólo diagnostica estructura y datos.'};
}
export function installMaintenanceDiagnostics(){
  if(typeof window === 'undefined') return null;
  const api = {version: VERSION, mode: 'diagnostic-only', info, inspect, print, section, productPrices, sections: SECTIONS};
  window.ControlEventMaintenanceDiagnostics = api;
  window.__ceV277MaintenanceDiagnostics = api;
  return api;
}
