import { createLegacyView, callWindow } from './_view-runtime.js';

const view = createLegacyView({
  name: 'mapa',
  render: ['renderMapaProductos'],
  afterActivate(){
    callWindow('renderMapaProductos');
  }
});

export const meta = { ...view.meta, title: 'Mapa de productos', version: 'v30.5' };
export const mount = context => view.mount(context);
export const activate = context => view.activate(context);
export const refresh = activate;
