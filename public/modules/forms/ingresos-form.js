import { FORMS_VERSION, buttonInfo, currentEventId, detectProblems, formFieldInfo, parseEuro, printReport, requiredActions, toNumber, valueOf } from './_forms-runtime.js';

const FIELD_IDS = ['collabPersona','collabNum','collabObligatorio','collabVoluntario','collabPago'];
const ACTIONS = ['addColab','renderColabs','renderIngresosSummary'];

export function read(){
  const record = {
    eventId: currentEventId(),
    personaId: valueOf('collabPersona'),
    numero: toNumber(valueOf('collabNum'), 0),
    importeObligatorio: parseEuro(valueOf('collabObligatorio')),
    importeVoluntario: parseEuro(valueOf('collabVoluntario')),
    pago: valueOf('collabPago')
  };
  const report = {
    name: 'ingresos',
    version: FORMS_VERSION,
    record,
    eventId: record.eventId,
    requiredActions: requiredActions(ACTIONS),
    requiredButtons: [buttonInfo('btnAddColab')],
    requiredFields: formFieldInfo(FIELD_IDS)
  };
  report.problems = detectProblems(report);
  return report;
}

export function validate(){
  const report = read();
  const {record} = report;
  if(!record.personaId) report.problems.push('No hay persona seleccionada.');
  if(!record.numero || record.numero < 0) report.problems.push('Número de asistentes no válido.');
  return report;
}

export function print(){
  return printReport('Formulario INGRESOS', validate());
}

export const meta = {name:'ingresos-form', version: FORMS_VERSION, mode:'diagnostic-only'};
