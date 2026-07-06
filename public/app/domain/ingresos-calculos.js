import { PAYMENT_OPTIONS, compareText, eventRows, firstNumber, money, number, personaById, selectedEvent, up } from './_common.js';

const PAYMENT_ORDER = {'PENDIENTE': 0, 'EFECTIVO': 1, 'BIZUM': 2, 'BANCO': 3};

export function personaForIncome(app, row){
  return row?.persona || personaById(app, row?.personaId) || null;
}

export function incomeRango(app, row){
  const persona = personaForIncome(app, row);
  return up(persona?.rango || row?.rango || row?.personaRango || '');
}

export function isSocioIncome(app, row){
  return incomeRango(app, row) === 'SOCIO';
}

export function incomePayment(row){
  return String(row?.situacion || row?.formaPago || 'Pendiente').trim() || 'Pendiente';
}

export function incomePersonName(app, row){
  const persona = personaForIncome(app, row);
  return String(persona?.nombre || row?.nombre || 'Sin nombre').trim();
}

export function incomeParts(app, row){
  const event = selectedEvent(app) || {};
  const numero = number(row?.numero);
  const obligatorio = isSocioIncome(app, row) ? numero * number(event.precio) : 0;
  const voluntario = firstNumber(row, [
    'importeVoluntario',
    'voluntario',
    'donation',
    'importe',
    'importeDonacion',
    'aportacionVoluntaria'
  ], 0);
  return {numero, obligatorio, voluntario, total: obligatorio + voluntario};
}

export function enrichIncomeRow(app, row){
  const persona = personaForIncome(app, row);
  const parts = incomeParts(app, row);
  return {
    ...row,
    persona,
    base: parts.obligatorio,
    donation: parts.voluntario,
    total: parts.total,
    __ceV259Parts: parts
  };
}

export function collabsForEvent(app){
  return eventRows(app, 'colaboradores')
    .map(row => enrichIncomeRow(app, row))
    .sort((a, b) => {
      const orderA = PAYMENT_ORDER[up(incomePayment(a))] ?? 9;
      const orderB = PAYMENT_ORDER[up(incomePayment(b))] ?? 9;
      return orderA - orderB || compareText(incomePersonName(app, a), incomePersonName(app, b));
    });
}

export function incomeLine(app, row){
  const parts = incomeParts(app, row);
  return `${incomePersonName(app, row)} — Nº ${parts.numero} — Importe socio: ${money(parts.obligatorio)} — Voluntario: ${money(parts.voluntario)} — Total: ${money(parts.total)} — ${incomePayment(row)}`;
}

export function ingresoSummary(app){
  const rows = collabsForEvent(app);
  const summary = PAYMENT_OPTIONS.map(tipo => {
    const subset = rows.filter(row => incomePayment(row) === tipo);
    return {
      tipo,
      personas: subset.reduce((total, row) => total + number(row.numero), 0),
      importe: subset.reduce((total, row) => total + number(row.total), 0)
    };
  });
  summary.push({
    tipo: 'TOTAL INGRESOS',
    personas: summary.reduce((total, row) => total + number(row.personas), 0),
    importe: summary.reduce((total, row) => total + number(row.importe), 0)
  });
  return summary;
}
