import { createLegacyView, callWindow } from './_view-runtime.js';

const view = createLegacyView({
  name: 'mapa',
  render: ['renderMapaProductos'],
  afterActivate(){
    callWindow('renderMapaProductos');
  }
});

export const meta = { ...view.meta, title: 'Mapa de recursos', version: 'v31.1' };
export const mount = context => view.mount(context);
export const activate = context => view.activate(context);
export const refresh = activate;
