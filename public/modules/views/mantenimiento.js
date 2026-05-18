import { createLegacyView } from './_view-runtime.js';
import { installMaintenanceModules, refreshCurrentMaintenance } from '../maintenance/index.js';

const view = createLegacyView({
  name: 'mantenimiento',
  render: ['renderMaintenance'],
  afterActivate(){
    installMaintenanceModules();
    refreshCurrentMaintenance({reason:'mantenimiento-view-activate'});
  }
});

export const meta = {...view.meta, maintenance:'v26.8'};
export const mount = context => view.mount(context);
export const activate = context => view.activate(context);
export const refresh = activate;
