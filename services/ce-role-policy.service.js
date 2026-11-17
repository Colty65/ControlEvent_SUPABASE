// Política de acceso vigente de ControlEvent, expresada como operaciones simples
// para que la app y los adaptadores externos puedan consultar la misma regla.

export const CE_ROLE_POLICY_VERSION = 'CE_ROLE_V1';

const RULES = Object.freeze({
  READ: Object.freeze(['GD', 'RW', 'RO']),
  WRITE: Object.freeze(['GD', 'RW']),
  ADMIN: Object.freeze(['GD'])
});

export function normalizeCeLevel(value) {
  return String(value ?? '').trim().toUpperCase();
}

export function normalizeCeOperation(value) {
  const op = String(value ?? '').trim().toUpperCase();
  if (['READ', 'QUERY', 'VIEW', 'CONSULT'].includes(op)) return 'READ';
  if (['WRITE', 'CREATE', 'UPDATE', 'DELETE', 'MUTATE', 'MAINTENANCE'].includes(op)) return 'WRITE';
  if (['ADMIN', 'ADMINISTER'].includes(op)) return 'ADMIN';
  return op;
}

export function ceRoleCan(level, operation) {
  const role = normalizeCeLevel(level);
  const op = normalizeCeOperation(operation);
  return Array.isArray(RULES[op]) && RULES[op].includes(role);
}

export function ceRolePolicyContract() {
  return {
    version: CE_ROLE_POLICY_VERSION,
    operations: {
      READ: [...RULES.READ],
      WRITE: [...RULES.WRITE],
      ADMIN: [...RULES.ADMIN]
    }
  };
}
