import {
  CE_ROLE_POLICY_VERSION,
  ceRoleCan,
  ceRolePolicyContract,
  normalizeCeOperation
} from '../services/ce-role-policy.service.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const contract = ceRolePolicyContract();
assert(CE_ROLE_POLICY_VERSION === 'CE_ROLE_V1', 'Versión de política inesperada');
assert(contract.operations.READ.join(',') === 'GD,RW,RO', 'READ debe permitir GD/RW/RO');
assert(contract.operations.WRITE.join(',') === 'GD,RW', 'WRITE debe permitir GD/RW');
assert(contract.operations.ADMIN.join(',') === 'GD', 'ADMIN debe permitir solo GD');
assert(ceRoleCan('RO', 'READ') === true, 'RO debe poder consultar');
assert(ceRoleCan('RO', 'WRITE') === false, 'RO no debe poder escribir');
assert(ceRoleCan('RW', 'WRITE') === true, 'RW debe poder escribir');
assert(ceRoleCan('RW', 'ADMIN') === false, 'RW no debe administrar');
assert(ceRoleCan('GD', 'ADMIN') === true, 'GD debe administrar');
assert(normalizeCeOperation('view') === 'READ', 'VIEW debe normalizar a READ');
assert(normalizeCeOperation('delete') === 'WRITE', 'DELETE debe normalizar a WRITE');
console.log('ZIS authorization policy regression OK');
