import { DESTINO_OPTIONS, SEGMENT_OPTIONS, compareText, getState, isCurrentExpenseTicket, isDonationTicket, listOrEmpty, number, selectedEventId, text, ticketImage } from './_common.js';
import { compareDonationByDonorProduct, comparePurchaseByTicketProduct, comprasForEvent, donationLine, donorName, productDestino, productName, productSegment, purchaseLine, purchaseValue, storeName, ticketLabel } from './compras-calculos.js';

function baseKeysFor(app, kind, rows){
  const base = kind === 'segmento' ? SEGMENT_OPTIONS.slice() : DESTINO_OPTIONS.slice();
  const seen = new Set(base.map(String));
  rows.forEach(row => {
    const key = kind === 'segmento' ? productSegment(app, row) : productDestino(app, row);
    if(key && !seen.has(String(key))){
      seen.add(String(key));
      base.push(key);
    }
  });
  return base;
}

export function groupedBreakdown(app, kind){
  const rows = comprasForEvent(app);
  return baseKeysFor(app, kind, rows).map(key => {
    const matches = row => String(kind === 'segmento' ? productSegment(app, row) : productDestino(app, row)) === String(key);
    const comprados = rows.filter(row => matches(row) && !isDonationTicket(row.ticketDonacion) && text(row.ticketDonacion) !== '').sort((a, b) => comparePurchaseByTicketProduct(app, a, b));
    const donados = rows.filter(row => matches(row) && isDonationTicket(row.ticketDonacion)).sort((a, b) => compareDonationByDonorProduct(app, a, b));
    const pendientes = rows.filter(row => matches(row) && !isDonationTicket(row.ticketDonacion) && text(row.ticketDonacion) === '').sort((a, b) => comparePurchaseByTicketProduct(app, a, b));
    const comprado = comprados.reduce((total, row) => total + purchaseValue(app, row), 0);
    const donado = donados.reduce((total, row) => total + purchaseValue(app, row), 0);
    const pendiente = pendientes.reduce((total, row) => total + purchaseValue(app, row), 0);
    return {
      label: key,
      comprado,
      donado,
      pendiente,
      total: comprado + donado + pendiente,
      listComprado: listOrEmpty(comprados.map(row => purchaseLine(app, row)), 'Sin productos comprados'),
      listDonado: listOrEmpty(donados.map(row => donationLine(app, row)), 'Sin productos donados'),
      listPendiente: listOrEmpty(pendientes.map(row => purchaseLine(app, row)), 'Sin productos pendientes')
    };
  });
}

export function summaryBySegmento(app){
  return groupedBreakdown(app, 'segmento');
}

export function summaryByDestino(app){
  return groupedBreakdown(app, 'destino');
}

export function summaryByTiendaTicket(app){
  const filled = new Map();
  const pending = new Map();
  comprasForEvent(app).forEach(row => {
    const rawTicket = text(row.ticketDonacion);
    const donated = isDonationTicket(rawTicket);
    const baseName = donated ? (donorName(app, row) || 'Sin donante') : (storeName(app, row) || 'Sin tienda');
    const value = purchaseValue(app, row);
    if(!rawTicket){
      const key = `${baseName} | Pte.Compra u otros gastos`;
      pending.set(key, (pending.get(key) || 0) + value);
      return;
    }
    const key = `${baseName} | ${rawTicket}`;
    if(!filled.has(key)){
      filled.set(key, {k: key, label: key, v: 0, rawTicket, pending: false, donated, products: [], attachable: !donated});
    }
    const item = filled.get(key);
    item.v += value;
    item.donated = item.donated || donated;
    item.attachable = item.attachable && !donated;
    const name = productName(app, row);
    if(name && !item.products.includes(name)) item.products.push(name);
  });

  const result = Array.from(filled.values()).map(item => ({
    ...item,
    label: item.k,
    image: ticketImage(app, item.k)
  })).concat(Array.from(pending.entries()).map(([key, value]) => ({
    k: key,
    label: key,
    v: value,
    rawTicket: '',
    pending: true,
    donated: false,
    attachable: false,
    image: ''
  })));

  const sortMode = getState(app).summaryTiendaSort || 'tienda';
  result.sort((a, b) => {
    const [storeA = '', ticketA = ''] = String(a.k || '').split(' | ');
    const [storeB = '', ticketB = ''] = String(b.k || '').split(' | ');
    if(sortMode === 'ticket') return compareText(ticketA, ticketB) || compareText(storeA, storeB);
    return compareText(storeA, storeB) || compareText(ticketA, ticketB);
  });
  return result;
}
