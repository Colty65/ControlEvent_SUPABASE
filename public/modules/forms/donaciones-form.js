import { FORMS_VERSION, addDataWarning, buttonInfo, currentEventId, detectProblems, formFieldInfo, parseEuro, printReport, requiredActions, toNumber, valueOf } from './_forms-runtime.js';

const FIELD_IDS = ['donProducto','donUnidades','donPrecio','donImporte','donTicket','donDonante','donResponsable'];
const ACTIONS = ['addDonation','renderDonaciones','renderBudget'];

export function read(){
  const record = {
    eventId: currentEventId(),
    productoId: valueOf('donProducto'),
    unidades: toNumber(valueOf('donUnidades'), 0),
    precio: parseEuro(valueOf('donPrecio')),
    importe: parseEuro(valueOf('donImporte')),
    ticketDonacion: valueOf('donTicket'),
    donanteId: valueOf('donDonante'),
    responsableId: valueOf('donResponsable')
  };
  const report = {
    name: 'donaciones',
    version: FORMS_VERSION,
    record,
    eventId: record.eventId,
    requiredActions: requiredActions(ACTIONS),
    requiredButtons: [buttonInfo('btnAddDonacion')],
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
  if(record.precio < 0) addDataWarning(report, 'Precio/valor estimado no válido.');
  return report;
}

export function print(){
  return printReport('Formulario DONACIONES', validate());
}

export const meta = {name:'donaciones-form', version: FORMS_VERSION, mode:'diagnostic-only'};
