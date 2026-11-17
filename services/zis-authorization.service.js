import { listUsers } from './auth.service.js';
import {
  CE_ROLE_POLICY_VERSION,
  ceRoleCan,
  ceRolePolicyContract,
  normalizeCeLevel,
  normalizeCeOperation
} from './ce-role-policy.service.js';

function text(value) {
  return String(value ?? '').trim();
}

function normalizeIdent(value) {
  return text(value).normalize('NFKC').toUpperCase();
}

function actorIdentification(payload = {}) {
  const actor = payload.actor && typeof payload.actor === 'object' ? payload.actor : {};
  return text(
    actor.identificacion ?? actor.Identificacion ?? actor.id ?? actor.login ??
    payload.user_id ?? payload.userId ?? payload.identificacion ?? payload.Identificacion
  );
}

export function authorizationContract() {
  const policy = ceRolePolicyContract();
  return {
    ok: true,
    service: 'ControlEvent ZIS Authorization',
    policy_version: policy.version,
    decisions: ['ALLOW', 'DENY'],
    operations: policy.operations,
    identity_source: 'usuarios de acceso de ControlEvent',
    note: 'ZIS consulta; ControlEvent conserva la autoridad sobre GD/RW/RO.'
  };
}

export async function authorizeZis(payload = {}) {
  const identificacion = actorIdentification(payload);
  const operation = normalizeCeOperation(payload.operation || payload.action || '');
  const capability = text(payload.capability || payload.functionality || '');

  if (!identificacion) {
    return denied('ACTOR_REQUIRED', { operation, capability });
  }

  const users = await listUsers();
  const user = users.find(item => normalizeIdent(item.identificacion ?? item.Identificacion) === normalizeIdent(identificacion));
  if (!user) {
    return denied('USER_NOT_FOUND', { actor: { identificacion }, operation, capability });
  }

  const nivel = normalizeCeLevel(user.nivel ?? user.Nivel);
  const actor = { identificacion: user.identificacion, nombre: user.nombre, nivel };
  const allowed = ceRoleCan(nivel, operation);

  return {
    ok: true,
    decision: allowed ? 'ALLOW' : 'DENY',
    allowed,
    reason_code: allowed ? 'ROLE_ALLOWED' : (operation ? 'ROLE_NOT_ALLOWED' : 'OPERATION_REQUIRED'),
    policy_version: CE_ROLE_POLICY_VERSION,
    actor,
    operation,
    capability,
    resource: payload.resource && typeof payload.resource === 'object' ? payload.resource : null
  };
}

function denied(reason_code, extra = {}) {
  return {
    ok: true,
    decision: 'DENY',
    allowed: false,
    reason_code,
    policy_version: CE_ROLE_POLICY_VERSION,
    ...extra
  };
}
