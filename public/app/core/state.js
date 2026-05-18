import { getApp } from '../app-context.js';

export function getState(){
  return getApp()?.state || {};
}

export function rows(name){
  const value = getState()[name];
  return Array.isArray(value) ? value : [];
}

export function selectedEvent(){
  const app = getApp();
  if(typeof app?.selectors?.selectedEvent === 'function') return app.selectors.selectedEvent();
  const state = getState();
  return rows('eventos').find(event => String(event.id) === String(state.selectedEventId)) || null;
}

export function selectedEventId(){
  return String(selectedEvent()?.id || getState().selectedEventId || '');
}

export function byId(collection, id){
  return rows(collection).find(item => String(item.id) === String(id)) || null;
}

export function currentRows(collection){
  const app = getApp();
  const selectorName = {
    personas:'personasForSelectedEvent',
    tiendas:'tiendasForSelectedEvent',
    productos:'productosForSelectedEvent',
    colaboradores:'collabsForEvent',
    compras:'comprasForEvent'
  }[collection];
  const selector = selectorName && app?.selectors?.[selectorName];
  if(typeof selector === 'function') return selector() || [];
  const eventId = selectedEventId();
  return rows(collection).filter(row => !row.eventId || String(row.eventId) === eventId);
}

export function save(){
  return getApp()?.actions?.saveState?.();
}

export function render(){
  return getApp()?.actions?.render?.();
}

