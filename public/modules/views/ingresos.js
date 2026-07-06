import { createLegacyView } from './_view-runtime.js';

const view = createLegacyView({
  name: 'ingresos',
  render: ['renderIngresosSummary', 'renderColabs']
});

export const meta = view.meta;
export const mount = context => view.mount(context);
export const activate = context => view.activate(context);
export const refresh = activate;
