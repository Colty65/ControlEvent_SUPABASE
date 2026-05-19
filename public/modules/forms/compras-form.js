import { FORMS_VERSION, addDataWarning, buttonInfo, currentEventId, detectProblems, formFieldInfo, parseEuro, printReport, requiredActions, toNumber, valueOf } from './_forms-runtime.js';

const FIELD_IDS = ['buyProducto','buyUnidades','buyPrecio','buyTicket','buyTienda','buyResponsable'];
const ACTIONS = ['addCompra','renderCompras','renderBudget'];

export function read(){
  const record = {
    eventId: currentEventId(),
    productoId: valueOf('buyProducto'),
    unidades: toNumber(valueOf('buyUnidades'), 0),
    precio: parseEuro(valueOf('buyPrecio')),
    ticketDonacion: valueOf('buyTicket'),
    tiendaId: valueOf('buyTienda'),
    responsableId: valueOf('buyResponsable')
  };
  const report = {
    name: 'compras',
    version: FORMS_VERSION,
    record,
    eventId: record.eventId,
    requiredActions: requiredActions(ACTIONS),
    requiredButtons: [buttonInfo('btnAddCompra')],
    requiredFields: formFieldInfo(FIELD_IDS)
  };
  report.problems = detectProblems(report);
  return report;
}

export function validate(){
  const report = read();
  const {record} = report;
  if(!record.productoId) addDataWarning(report, 'No hay producto seleccionado.');
  if(record.unidades < 0) addDataWarning(report, 'Unidades no válidas.');
  if(record.precio < 0) addDataWarning(report, 'Precio no válido.');
  return report;
}

export function print(){
  return printReport('Formulario COMPRAS', validate());
}

export const meta = {name:'compras-form', version: FORMS_VERSION, mode:'diagnostic-only'};
