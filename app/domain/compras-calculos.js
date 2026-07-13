import { compareText, eventRows, isCurrentExpenseTicket, isDonationTicket, money, number, personaById, productoById, text, ticketCode, tiendaById, up } from './_common.js';

export { isCurrentExpenseTicket, isDonationTicket };

export function productForPurchase(app, row){
  return row?.producto || productoById(app, row?.productoId) || null;
}

export function normalStoreForPurchase(app, row){
  const product = productForPurchase(app, row);
  return row?.tienda || tiendaById(app, row?.tiendaId || product?.tiendaId || '') || null;
}

export function donorName(app, row){
  if(row?.donorLabel) return text(row.donorLabel);
  if(row?.donante) return text(row.donante);
  const donorRef = text(row?.donorRef);
  if(donorRef){
    if(donorRef.startsWith('P:')) return text(personaById(app, donorRef.slice(2))?.nombre) || donorRef;
    if(donorRef.startsWith('T:')) return text(tiendaById(app, donorRef.slice(2))?.nombre) || donorRef;
    return donorRef;
  }
  return text(normalStoreForPurchase(app, row)?.nombre) || 'Sin donante';
}

export function storeForPurchase(app, row){
  if(isDonationTicket(row?.ticketDonacion)){
    const name = donorName(app, row);
    return {id: row?.donorRef || row?.tiendaId || '', nombre: name};
  }
  return normalStoreForPurchase(app, row) || {id: '', nombre: ''};
}

export function productName(app, row){
  const product = productForPurchase(app, row);
  return text(product?.nombre || row?.productoNombre || row?.nombre) || 'Producto';
}

export function productSegment(app, row){
  const product = productForPurchase(app, row);
  return text(row?.segmento || product?.segmento || '');
}

export function productDestino(app, row){
  const product = productForPurchase(app, row);
  return text(row?.destino || product?.destino || '');
}

export function storeName(app, row){
  return text(storeForPurchase(app, row)?.nombre) || 'Sin tienda';
}

export function unitPrice(app, row){
  const product = productForPurchase(app, row) || {};
  if(row?.precio !== undefined && row?.precio !== null && text(row.precio) !== '') return number(row.precio);
  if(row?.precioCalc !== undefined && row?.precioCalc !== null && text(row.precioCalc) !== '') return number(row.precioCalc);
  return number(product.defaultPrecio ?? product.precio ?? 0);
}

export function purchaseValue(app, row){
  const directKeys = ['valor','importe','total','importeCompra','importeTotal','descuento','importeDescuento','discount','amount'];
  for(const key of directKeys){
    if(row?.[key] !== undefined && row?.[key] !== null && text(row[key]) !== ''){
      const value = number(row[key]);
      if(Number.isFinite(value) && value !== 0) return value;
    }
  }
  return unitPrice(app, row) * number(row?.unidades || 1);
}

export function ticketLabel(row){
  return text(row?.ticketDonacion) || 'Pte.Compra u otros gastos';
}

export function enrichPurchaseRow(app, row){
  const product = productForPurchase(app, row);
  const precioCalc = unitPrice(app, row);
  const valor = purchaseValue(app, {...row, precioCalc});
  const donation = isDonationTicket(row?.ticketDonacion);
  const tienda = storeForPurchase(app, row);
  return {
    ...row,
    producto: product,
    tienda,
    precioCalc,
    valor,
    importe: donation ? 0 : valor,
    responsable: row?.responsable || personaById(app, row?.responsableId || '') || null,
    donorLabel: donation ? donorName(app, row) : row?.donorLabel
  };
}

export function comprasForEvent(app){
  return eventRows(app, 'compras')
    .map(row => enrichPurchaseRow(app, row))
    .sort((a, b) => compareText(storeName(app, a), storeName(app, b)) || compareText(ticketLabel(a), ticketLabel(b)) || compareText(productName(app, a), productName(app, b)));
}

export function purchaseLine(app, row){
  const units = number(row?.unidades);
  const price = unitPrice(app, row);
  const value = purchaseValue(app, row);
  const responsable = text(row?.responsable?.nombre || personaById(app, row?.responsableId || '')?.nombre);
  return `${ticketLabel(row)} — ${productName(app, row)} — ${storeName(app, row)} — ${units} uds x ${money(price)} = ${money(value)}${responsable ? ' — Resp.: ' + responsable : ''}`;
}

export function donationLine(app, row){
  const units = number(row?.unidades);
  const price = unitPrice(app, row);
  const value = purchaseValue(app, row);
  const responsable = text(row?.responsable?.nombre || personaById(app, row?.responsableId || '')?.nombre);
  return `${donorName(app, row)} — ${productName(app, row)} — ${ticketCode(row?.ticketDonacion)} — ${units} uds x ${money(price)} = ${money(value)}${responsable ? ' — Resp.: ' + responsable : ''}`;
}

export function comparePurchaseByTicketProduct(app, a, b){
  return compareText(ticketLabel(a), ticketLabel(b)) || compareText(productName(app, a), productName(app, b)) || compareText(storeName(app, a), storeName(app, b));
}

export function compareDonationByDonorProduct(app, a, b){
  return compareText(donorName(app, a), donorName(app, b)) || compareText(productName(app, a), productName(app, b));
}
