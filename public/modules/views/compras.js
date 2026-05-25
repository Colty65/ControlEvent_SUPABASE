import { createLegacyView } from './_view-runtime.js';

const view = createLegacyView({
  name: 'compras',
  // v44.5: COMPRAS no debe recalcular RESUMEN al activarse.
  // El resumen se renderiza solo cuando la pestaña RESUMEN está activa.
  render: ['renderCompras']
});

export const meta = view.meta;
export const mount = context => view.mount(context);
export const activate = context => view.activate(context);
export const refresh = activate;
