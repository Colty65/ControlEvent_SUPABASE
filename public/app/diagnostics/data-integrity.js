/* ControlEvent v28.0.1 - Diagnostico de integridad de datos sin tocar operativa */
const VERSION = 'v28.0.1';

function app(){ return window.ControlEventApp || null; }
function state(){ return app()?.state || window.state || {}; }
function arr(name){ const value = state()?.[name]; return Array.isArray(value) ? value : []; }
function norm(value){ return String(value ?? '').trim(); }
function key(value){ return norm(value).toLocaleLowerCase('es-ES'); }
function money(value){ const n = Number(value ?? 0); return Number.isFinite(n) ? n : 0; }
function selectedEventId(){ return state()?.selectedEventId || app()?.navigation?.selectedEventId || ''; }
function selectedEvent(){ const id = selectedEventId(); return arr('eventos').find(ev => ev.id === id) || null; }
function byId(listName){ return new Map(arr(listName).filter(x => x && x.id).map(x => [x.id, x])); }
function ticketIsDonation(row){
  const raw = String(row?.ticketDonacion ?? row?.donacion ?? row?.tipo ?? '').toLocaleLowerCase('es-ES');
  return raw.includes('don') || raw === 'true' || raw === '1';
}

function getProductPrice(product){
  return money(product?.precio ?? product?.defaultPrecio ?? product?.precioReferencia ?? product?.productoPrecioReferencia);
}

function collectionCounts(){
  const s = state();
  return {
    eventos: arr('eventos').length,
    personas: arr('personas').length,
    tiendas: arr('tiendas').length,
    productos: arr('productos').length,
    ingresos: arr('colaboradores').length,
    compras: arr('compras').filter(row => !ticketIsDonation(row)).length,
    donaciones: arr('compras').filter(row => ticketIsDonation(row)).length,
    tickets: s?.ticketImages && typeof s.ticketImages === 'object' ? Object.keys(s.ticketImages).length : 0,
    selectedEventId: selectedEventId() || null,
    selectedEventTitle: selectedEvent()?.titulo || null
  };
}

function productPriceReport(){
  const productos = arr('productos');
  const rows = productos.map(p => ({
    id: p.id || '',
    nombre: p.nombre || '',
    segmento: p.segmento || '',
    destino: p.destino || '',
    precio: getProductPrice(p),
    hasPrecio: getProductPrice(p) > 0,
    rawPrecio: p.precio,
    rawDefaultPrecio: p.defaultPrecio
  }));
  const withPrice = rows.filter(row => row.hasPrecio);
  const zeroPrice = rows.filter(row => !row.hasPrecio);
  return {
    total: rows.length,
    conPrecioReferencia: withPrice.length,
    sinPrecioReferencia: zeroPrice.length,
    sumaPrecioReferencia: withPrice.reduce((sum, row) => sum + row.precio, 0),
    rows
  };
}

function duplicateProducts(){
  const groups = new Map();
  arr('productos').forEach(p => {
    const k = [p.nombre, p.segmento, p.destino].map(key).join('|');
    if(!groups.has(k)) groups.set(k, []);
    groups.get(k).push({id:p.id, nombre:p.nombre || '', segmento:p.segmento || '', destino:p.destino || '', precio:getProductPrice(p)});
  });
  return Array.from(groups.values()).filter(group => group.length > 1);
}

function orphanReport(){
  const eventIds = byId('eventos');
  const personaIds = byId('personas');
  const tiendaIds = byId('tiendas');
  const productoIds = byId('productos');
  const orphanIngresos = arr('colaboradores').filter(row => row.eventId && !eventIds.has(row.eventId) || row.personaId && !personaIds.has(row.personaId));
  const orphanCompras = arr('compras').filter(row => {
    if(row.eventId && !eventIds.has(row.eventId)) return true;
    if(row.productoId && !productoIds.has(row.productoId)) return true;
    if(row.tiendaId && !tiendaIds.has(row.tiendaId)) return true;
    return false;
  });
  const orphanProductos = arr('productos').filter(row => {
    const tienda = row.tiendaId || row.defaultTiendaId;
    return tienda && !tiendaIds.has(tienda);
  });
  return {
    ingresos: orphanIngresos.map(row => ({id:row.id, eventId:row.eventId, personaId:row.personaId})),
    compras: orphanCompras.map(row => ({id:row.id, eventId:row.eventId, productoId:row.productoId, tiendaId:row.tiendaId, ticketDonacion:row.ticketDonacion})),
    productos: orphanProductos.map(row => ({id:row.id, nombre:row.nombre, tiendaId:row.tiendaId || row.defaultTiendaId})),
    total: orphanIngresos.length + orphanCompras.length + orphanProductos.length
  };
}

function backupReadiness(){
  const counts = collectionCounts();
  const prices = productPriceReport();
  const orphans = orphanReport();
  const warnings = [];
  if(!counts.eventos) warnings.push('No hay eventos cargados.');
  if(!counts.productos) warnings.push('No hay productos cargados.');
  if(prices.total && !prices.conPrecioReferencia) warnings.push('Hay productos, pero ninguno conserva precio referencia.');
  if(orphans.total) warnings.push(`Hay ${orphans.total} referencias huérfanas.`);
  return {
    ok: warnings.length === 0,
    warnings,
    counts,
    preciosProducto: {
      total: prices.total,
      conPrecioReferencia: prices.conPrecioReferencia,
      sinPrecioReferencia: prices.sinPrecioReferencia,
      sumaPrecioReferencia: prices.sumaPrecioReferencia
    },
    orphans: {total: orphans.total}
  };
}

function inspect(){
  const counts = collectionCounts();
  const prices = productPriceReport();
  const duplicates = duplicateProducts();
  const orphans = orphanReport();
  const readiness = backupReadiness();
  return {
    version: VERSION,
    generatedAt: new Date().toISOString(),
    counts,
    backupReadiness: readiness,
    productPrices: {
      total: prices.total,
      conPrecioReferencia: prices.conPrecioReferencia,
      sinPrecioReferencia: prices.sinPrecioReferencia,
      sumaPrecioReferencia: prices.sumaPrecioReferencia
    },
    duplicateProducts: {
      totalGroups: duplicates.length,
      groups: duplicates.slice(0, 50)
    },
    orphans
  };
}

function print(){
  const report = inspect();
  console.group(`ControlEventDataIntegrity ${VERSION}`);
  console.log('Resumen', report.backupReadiness);
  console.table(productPriceReport().rows.map(row => ({producto: row.nombre, segmento: row.segmento, destino: row.destino, precio: row.precio})));
  if(report.duplicateProducts.totalGroups) console.warn('Productos duplicados', report.duplicateProducts.groups);
  if(report.orphans.total) console.warn('Referencias huerfanas', report.orphans);
  console.groupEnd();
  return report;
}

function findProduct(text){
  const q = key(text);
  return productPriceReport().rows.filter(row => key(row.nombre).includes(q));
}

function installDataIntegrity(){
  const api = {
    version: VERSION,
    inspect,
    print,
    counts: collectionCounts,
    productPrices: productPriceReport,
    duplicateProducts,
    orphans: orphanReport,
    backupReadiness,
    findProduct
  };
  window.ControlEventDataIntegrity = api;
  window.__ceV275DataIntegrity = api;
  return api;
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', installDataIntegrity, {once:true});
}else{
  installDataIntegrity();
}

export { installDataIntegrity };
