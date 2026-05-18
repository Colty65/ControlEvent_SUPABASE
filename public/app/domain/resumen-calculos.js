import { isCurrentExpenseTicket, isDonationTicket, listOrEmpty, number, text } from './_common.js';
import { collabsForEvent, incomeLine, incomePersonName, isSocioIncome } from './ingresos-calculos.js';
import { comprasForEvent, compareDonationByDonorProduct, comparePurchaseByTicketProduct, donationLine, purchaseLine, purchaseValue } from './compras-calculos.js';
import { donationRows, donationSummary, groupedNoSociosDonationLines } from './donaciones-calculos.js';

function incomeTotal(row){
  return number(row.total != null ? row.total : number(row.base) + number(row.donation != null ? row.donation : row.importe));
}

function incomeBucket(app, rows, filter){
  return rows.filter(filter).slice().sort((a, b) => incomePersonName(app, a).localeCompare(incomePersonName(app, b), 'es'));
}

function incomePanel(app, rows, filter){
  const bucket = incomeBucket(app, rows, filter);
  const paid = bucket.filter(row => row.situacion !== 'Pendiente');
  const pending = bucket.filter(row => row.situacion === 'Pendiente');
  return {
    count: bucket.reduce((total, row) => total + number(row.numero), 0),
    importe: bucket.reduce((total, row) => total + incomeTotal(row), 0),
    ingresado: paid.reduce((total, row) => total + incomeTotal(row), 0),
    pendiente: pending.reduce((total, row) => total + incomeTotal(row), 0),
    listImporte: listOrEmpty(bucket.map(row => incomeLine(app, row))),
    listIngresado: listOrEmpty(paid.map(row => incomeLine(app, row))),
    listPendiente: listOrEmpty(pending.map(row => incomeLine(app, row)))
  };
}

export function budgetSummary(app){
  const incomeRows = collabsForEvent(app);
  const purchaseRows = comprasForEvent(app);
  const socios = incomePanel(app, incomeRows, row => isSocioIncome(app, row));
  const noSocios = incomePanel(app, incomeRows, row => !isSocioIncome(app, row));

  const gastoComprasRows = purchaseRows.filter(row => !isDonationTicket(row.ticketDonacion) && !isCurrentExpenseTicket(row.ticketDonacion) && text(row.ticketDonacion) !== '').sort((a, b) => comparePurchaseByTicketProduct(app, a, b));
  const gastosOrganizacionRows = purchaseRows.filter(row => isCurrentExpenseTicket(row.ticketDonacion)).sort((a, b) => comparePurchaseByTicketProduct(app, a, b));
  const pendienteRows = purchaseRows.filter(row => !isDonationTicket(row.ticketDonacion) && text(row.ticketDonacion) === '').sort((a, b) => comparePurchaseByTicketProduct(app, a, b));
  const sumPurchase = rows => rows.reduce((total, row) => total + purchaseValue(app, row), 0);

  const donacionProducto = donationSummary(app);
  const gastoCompras = sumPurchase(gastoComprasRows);
  const gastosOrganizacion = sumPurchase(gastosOrganizacionRows);
  const pendiente = sumPurchase(pendienteRows);
  const ingresosTotal = socios.importe + noSocios.importe;
  const ingresosRealizados = socios.ingresado + noSocios.ingresado;
  const gastosTotal = gastoCompras + gastosOrganizacion + pendiente;
  const gastosRealizados = gastoCompras + gastosOrganizacion;

  return {
    ingresosDinero: {
      socios,
      noSocios,
      donantes: noSocios,
      totalIngresado: ingresosRealizados,
      totalComprometido: ingresosTotal,
      pendiente: socios.pendiente + noSocios.pendiente
    },
    donacionProducto,
    operativa: {
      ingresos: ingresosTotal,
      ingresoDinero: ingresosRealizados,
      gastoCompras,
      gastosOrganizacion,
      pendiente,
      gastosPrevistos: gastosTotal,
      gastosRealizados,
      saldoActual: ingresosRealizados - gastosRealizados,
      saldoOperativo: ingresosTotal - gastosTotal,
      valorDonado: donacionProducto.valorDonado,
      valoracionEvento: gastosTotal + donacionProducto.valorDonado
    },
    compras: {
      total: purchaseRows.reduce((total, row) => total + purchaseValue(app, row), 0),
      resueltas: gastoCompras,
      pendientes: pendiente,
      gastosCorrientes: gastosOrganizacion,
      valorDonado: donacionProducto.valorDonado,
      saldoReal: ingresosRealizados - gastosRealizados,
      listRealizadas: listOrEmpty(gastoComprasRows.map(row => purchaseLine(app, row))),
      listCorrientes: listOrEmpty(gastosOrganizacionRows.map(row => purchaseLine(app, row))),
      listPendientes: listOrEmpty(pendienteRows.map(row => purchaseLine(app, row)))
    }
  };
}
