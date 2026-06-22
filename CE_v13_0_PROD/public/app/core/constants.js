export const PERSONA_RANGOS = ['SOCIO', 'DONANTE', 'NO SOCIO'];
export const PAYMENT_OPTIONS = ['Efectivo', 'Banco', 'Bizum', 'Pendiente'];
export const SEGMENT_OPTIONS = ['COMIDA', 'BEBIDA', 'INFRAESTRUCTURA'];
export const DESTINO_OPTIONS = ['APERITIVO', 'COMIDA', 'CENA', 'CUBATAS', 'INFRAESTRUCTURA'];
export const EVENT_SITUATIONS = ['En curso', 'Finalizado'];
export const ALL_TICKET_OPTIONS = [
  '',
  'DONADO TIENDA',
  'DONADO SOCIO',
  'DONADO OTROS',
  'GASTOS CORRIENTES',
  ...Array.from({length:30}, (_, i) => 'TK' + String(i + 1).padStart(2, '0'))
];
export const PURCHASE_TICKET_OPTIONS = [
  '',
  'GASTOS CORRIENTES',
  ...Array.from({length:30}, (_, i) => 'TK' + String(i + 1).padStart(2, '0'))
];
export const DONATION_TICKET_OPTIONS = ['DONADO TIENDA', 'DONADO SOCIO', 'DONADO OTROS'];

