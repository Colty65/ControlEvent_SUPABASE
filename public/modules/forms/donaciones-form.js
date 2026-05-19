import { FORMS_VERSION, buttonInfo, currentEventId, detectProblems, formFieldInfo, parseEuro, printReport, requiredActions, toNumber, valueOf } from './_forms-runtime.js';

const FIELD_IDS = ['donProducto','donUnidades','donValor','donTipo','donDonante','donResponsable'];
const ACTIONS = ['addDonation','renderDonaciones','renderBudget'];

export function read(){
  const record = {
    eventId: currentEventId(),
    productoId: valueOf('donProducto'),
    unidades: toNumber(valueOf('donUnidades'), 0),
    valor: parseEuro(valueOf('donValor')),
    tipo: valueOf('donTipo'),
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
  if(!record.productoId) report.problems.push('No hay producto seleccionado.');
  if(!record.unidades || record.unidades < 0) report.problems.push('Unidades no válidas.');
  if(record.valor < 0) report.problems.push('Valor estimado no válido.');
  return report;
}

export function print(){
  return printReport('Formulario DONACIONES', validate());
}

export const meta = {name:'donaciones-form', version: FORMS_VERSION, mode:'diagnostic-only'};
