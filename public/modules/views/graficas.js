import { createLegacyView, callWindow } from './_view-runtime.js';

const view = createLegacyView({
  name: 'graficas',
  // v44.5: no llamar al renderGraficas legacy capturado por app.actions,
  // porque puede pintar primero las barras antiguas. Se fuerza el motor estable.
  render: [],
  patches: true,
  afterActivate(){
    const stable = window.ControlEventV445?.renderStableGraficas || window.ControlEventV443?.renderStableGraficas || window.ControlEventV434?.renderGraficas;
    if(typeof stable === 'function') stable({force:false, reason:'module-v44.5'});
    else callWindow('renderGraficas');
  }
});

export const meta = view.meta;
export const mount = context => view.mount(context);
export const activate = context => view.activate(context);
export const refresh = activate;
