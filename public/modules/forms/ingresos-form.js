import { FORMS_VERSION, addDataWarning, buttonInfo, currentEventId, detectProblems, formFieldInfo, parseEuro, printReport, requiredActions, toNumber, valueOf } from './_forms-runtime.js';

const FIELD_IDS = ['collabPersona','collabNumero','collabSituacion','collabImporte'];
const ACTIONS = ['addColab','renderColabs','renderIngresosSummary'];

export function read(){
  const record = {
    eventId: currentEventId(),
    personaId: valueOf('collabPersona'),
    numero: toNumber(valueOf('collabNumero'), 0),
    situacion: valueOf('collabSituacion'),
    importe: parseEuro(valueOf('collabImporte'))
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
  if(!record.personaId) addDataWarning(report, 'No hay persona seleccionada.');
  if(record.numero < 0) addDataWarning(report, 'Número de asistentes no válido.');
  if(record.importe < 0) addDataWarning(report, 'Importe voluntario no válido.');
  return report;
}

export function print(){
  return printReport('Formulario INGRESOS', validate());
}

export const meta = {name:'ingresos-form', version: FORMS_VERSION, mode:'diagnostic-only'};
