import { getApp, callAction } from '../../app/app-context.js';

const registry = new Map();
let installed = false;
let lastOperation = null;

export function resolveApp(){
  return getApp() || window.ControlEventApp || window;
}

export function selectedEventId(){
  const app = resolveApp();
  return String(app?.state?.selectedEventId || window.state?.selectedEventId || '');
}

export function normalizeLabel(value){
  try{
    return String(value || '').normalize('NFC').replace(/\s+/g,' ').trim();
  }catch(_){
    return String(value || '').trim();
  }
}

export function stateKey(label, eventId = selectedEventId()){
  const clean = normalizeLabel(label);
  try{
    if(typeof window.ticketImageStateKey === 'function') return window.ticketImageStateKey(clean, eventId);
  }catch(_){ }
  return `${eventId}|${clean}`;
}

export function getImage(label, eventId = selectedEventId()){
  const app = resolveApp();
  const images = app?.state?.ticketImages || window.state?.ticketImages || {};
  const clean = normalizeLabel(label);
  const key = stateKey(clean, eventId);
  return images[key] || images[clean] || images[`${eventId}|${clean}`] || '';
}

export function setImage(label, dataUrl, eventId = selectedEventId()){
  const app = resolveApp();
  const state = app?.state || window.state;
  if(!state) throw new Error('No se ha encontrado el estado de ControlEvent.');
  if(!state.ticketImages) state.ticketImages = {};
  const key = stateKey(label, eventId);
  state.ticketImages[key] = dataUrl;
  lastOperation = {type:'set', label:normalizeLabel(label), key, at:Date.now()};
  window.dispatchEvent(new CustomEvent('controlevent:ticket-image-changed', {detail:lastOperation}));
  return key;
}

export function removeImage(label, eventId = selectedEventId()){
  const app = resolveApp();
  const state = app?.state || window.state;
  if(!state?.ticketImages) return false;
  const key = stateKey(label, eventId);
  delete state.ticketImages[key];
  delete state.ticketImages[normalizeLabel(label)];
  lastOperation = {type:'remove', label:normalizeLabel(label), key, at:Date.now()};
  window.dispatchEvent(new CustomEvent('controlevent:ticket-image-changed', {detail:lastOperation}));
  return true;
}

export function upload(label){
  const clean = normalizeLabel(label);
  const encoded = encodeURIComponent(clean);
  const fn = window.uploadTicketImage || window.uploadTicketImageV202 || window.uploadTicketImageV164;
  if(typeof fn === 'function') return fn(encoded);
  const viaApp = callAction('uploadTicketImage', encoded);
  if(viaApp !== undefined) return viaApp;
  throw new Error('No se ha encontrado uploadTicketImage.');
}

export function remove(label){
  const clean = normalizeLabel(label);
  const encoded = encodeURIComponent(clean);
  const fn = window.removeTicketImage || window.removeTicketImageV202 || window.removeTicketImageV164;
  if(typeof fn === 'function') return fn(encoded);
  return removeImage(clean);
}

export function registerTicketModule(name, module){
  if(!name || !module) return module;
  registry.set(name, module);
  return module;
}

export function getInfo(){
  return {
    version: 'v26.6',
    modules: Array.from(registry.keys()),
    selectedEventId: selectedEventId(),
    images: Object.keys(resolveApp()?.state?.ticketImages || window.state?.ticketImages || {}).length,
    lastOperation
  };
}

export function installTicketRuntime(){
  if(installed) return window.ControlEventTickets;
  installed = true;
  window.ControlEventTickets = {
    version: 'v26.6',
    mode: 'legacy-bridge',
    register: registerTicketModule,
    key: stateKey,
    getImage,
    setImage,
    removeImage,
    upload,
    remove,
    normalizeLabel,
    info: getInfo
  };
  window.__ceV262Tickets = window.ControlEventTickets;
  window.__ceV264Tickets = window.ControlEventTickets;
  return window.ControlEventTickets;
}
