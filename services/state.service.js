import * as stateRepository from '../repositories/supabase-state.repository.js';

export function getState(options = {}) {
  return stateRepository.readState(options || {});
}

export function saveState(payload) {
  return stateRepository.writeState(payload || {});
}

export function getDiagnostics() {
  return stateRepository.diagnostics();
}
