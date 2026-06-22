import { DESTINO_OPTIONS, DONATION_TICKET_OPTIONS, PAYMENT_OPTIONS, SEGMENT_OPTIONS } from '../core/constants.js';
import { money, normalizeText, parseEuroInput } from '../utils/format.js';

export { DESTINO_OPTIONS, DONATION_TICKET_OPTIONS, PAYMENT_OPTIONS, SEGMENT_OPTIONS, money };

export function getApp(app){
  if(app) return app;
  if(typeof window !== 'undefined') return window.ControlEventApp || null;
  return null;
}

export function getState(app){
  const ce = getApp(app);
  return ce?.state || (typeof window !== 'undefined' ? window.state : {}) || {};
}

export function asArray(value){
  return Array.isArray(value) ? value : [];
}

export function rows(app, collection){
  return asArray(getState(app)[collection]);
}

export function text(value){
  return String(value ?? '').trim();
}

export function up(value){
  return normalizeText(value);
}

export function number(value){
  if(typeof value === 'number') return Number.isFinite(value) ? value : 0;
  return parseEuroInput(value);
}

export function compareText(a, b){
  return up(a).localeCompare(up(b), 'es');
}

export function byId(app, collection, id){
  const key = String(id ?? '');
  if(!key) return null;
  return rows(app, collection).find(item => String(item?.id ?? '') === key) || null;
}

export function selectedEvent(app){
  const ce = getApp(app);
  try{
    const selected = ce?.selectors?.selectedEvent?.();
    if(selected) return selected;
  }catch(_){ }
  const state = getState(app);
  return byId(app, 'eventos', state.selectedEventId) || null;
}

export function selectedEventId(app){
  const event = selectedEvent(app);
  return String(event?.id || getState(app).selectedEventId || '');
}

export function eventRows(app, collection){
  const eventId = selectedEventId(app);
  return rows(app, collection).filter(row => !row?.eventId || String(row.eventId) === eventId);
}

export function personaById(app, id){
  const ce = getApp(app);
  try{
    const persona = ce?.selectors?.personaById?.(id);
    if(persona) return persona;
  }catch(_){ }
  return byId(app, 'personas', id) || null;
}

export function productoById(app, id){
  const ce = getApp(app);
  try{
    const producto = ce?.selectors?.productoById?.(id);
    if(producto) return producto;
  }catch(_){ }
  return byId(app, 'productos', id) || null;
}

export function tiendaById(app, id){
  const ce = getApp(app);
  try{
    const tienda = ce?.selectors?.tiendaById?.(id);
    if(tienda) return tienda;
  }catch(_){ }
  return byId(app, 'tiendas', id) || null;
}

export function ticketCode(value){
  return text(value).toUpperCase();
}

export function isDonationTicket(value){
  const code = ticketCode(value);
  return DONATION_TICKET_OPTIONS.includes(code) || code.startsWith('DONADO');
}

export function isCurrentExpenseTicket(value){
  return ticketCode(value) === 'GASTOS CORRIENTES';
}

export function firstNumber(row, keys, fallback = 0){
  for(const key of keys){
    const value = row?.[key];
    if(value !== undefined && value !== null && text(value) !== '') return number(value);
  }
  return number(fallback);
}

export function listOrEmpty(list, empty = 'Sin elementos'){
  const clean = asArray(list).filter(Boolean);
  return clean.length ? clean : [empty];
}

export function ticketImage(app, key){
  const state = getState(app);
  const images = state.ticketImages || {};
  const eventId = selectedEventId(app);
  const rawKey = String(key || '').trim();
  if(!rawKey) return '';
  const scopedKey = rawKey.startsWith(`${eventId}|`) ? rawKey : `${eventId}|${rawKey}`;
  if(images[scopedKey]) return images[scopedKey];
  // Los justificantes de INGRESOS conservan fallback legacy por id único.
  // Las fotos TKxx no deben buscarse nunca por clave global (TK01/Tienda|TK01),
  // porque esa clave se repite entre eventos.
  if(/^INGRESO[:|]/i.test(rawKey) && images[rawKey]) return images[rawKey];
  return '';
}
