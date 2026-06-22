export function numberEs(value){
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

export function money(value){
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(Number(value || 0));
}

export function euroInputValue(value){
  return numberEs(Number(value || 0)) + ' €';
}

export function parseEuroInput(value){
  if(typeof value === 'number') return Number.isFinite(value) ? value : 0;
  let text = String(value ?? '').replace(/€/g, '').replace(/\s/g, '').trim();
  if(!text) return 0;
  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  if(lastComma !== -1 && lastDot !== -1){
    text = lastComma > lastDot ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '');
  }else if(lastComma !== -1){
    text = text.replace(',', '.');
  }
  const number = Number(text);
  return Number.isFinite(number) ? number : 0;
}

export function normalizeText(value){
  return String(value ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

export function escapeHtml(value){
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

