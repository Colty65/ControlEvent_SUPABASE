import { createLegacyView } from './_view-runtime.js';
import { installMaintenanceModules, refreshCurrentMaintenance } from '../maintenance/index.js';

const view = createLegacyView({
  name: 'mantenimiento',
  render: ['renderMaintenance'],
  afterActivate(){
    const maintenance = installMaintenanceModules();
    const scheduler = maintenance?.scheduleCurrent;
    if(typeof scheduler === 'function'){
      scheduler({reason:'mantenimiento-view-activate-lazy', delay:90});
    }else{
      refreshCurrentMaintenance({reason:'mantenimiento-view-activate'});
    }
  }
});

export const meta = {...view.meta, maintenance:'v27.0'};
export const mount = context => view.mount(context);
export const activate = context => view.activate(context);
export const refresh = activate;
