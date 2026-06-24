import { compareText, listOrEmpty, money, number, ticketCode } from './_common.js';
import { compareDonationByDonorProduct, comprasForEvent, donationLine, donorName, isDonationTicket, purchaseValue, productName, unitPrice } from './compras-calculos.js';

export function donationRows(app, ticket){
  const code = ticketCode(ticket);
  return comprasForEvent(app).filter(row => ticketCode(row.ticketDonacion) === code);
}

export function groupedNoSociosDonationLines(app){
  const groups = new Map();
  donationRows(app, 'DONADO OTROS').forEach(row => {
    const donor = donorName(app, row) || 'Sin donante';
    if(!groups.has(donor)) groups.set(donor, {donor, total: 0, rows: []});
    const group = groups.get(donor);
    group.total += purchaseValue(app, row);
    group.rows.push(row);
  });
  return Array.from(groups.values())
    .sort((a, b) => compareText(a.donor, b.donor))
    .flatMap(group => {
      const details = group.rows
        .slice()
        .sort((a, b) => compareDonationByDonorProduct(app, a, b))
        .map(row => `· ${productName(app, row)} — ${number(row.unidades)} uds x ${money(unitPrice(app, row))} = ${money(purchaseValue(app, row))}`);
      return [`${group.donor} — TOTAL ${money(group.total)}`, ...details];
    });
}

export function donationSummary(app){
  const tiendas = donationRows(app, 'DONADO TIENDA');
  const socios = donationRows(app, 'DONADO SOCIO');
  const otros = donationRows(app, 'DONADO OTROS');
  const sum = rows => rows.reduce((total, row) => total + purchaseValue(app, row), 0);
  const result = {
    donadoTienda: sum(tiendas),
    donadoSocio: sum(socios),
    donadoOtros: sum(otros),
    listTiendas: listOrEmpty(tiendas.slice().sort((a, b) => compareDonationByDonorProduct(app, a, b)).map(row => donationLine(app, row))),
    listSocios: listOrEmpty(socios.slice().sort((a, b) => compareDonationByDonorProduct(app, a, b)).map(row => donationLine(app, row))),
    listNoSocios: listOrEmpty(groupedNoSociosDonationLines(app))
  };
  result.valorDonado = result.donadoTienda + result.donadoSocio + result.donadoOtros;
  return result;
}

export function donationRowsAll(app){
  return comprasForEvent(app).filter(row => isDonationTicket(row.ticketDonacion));
}
