import { createMaintenanceSection, callLegacy } from './_maintenance-runtime.js';

const section = createMaintenanceSection({
  name:'eventos',
  render:['renderMaintenanceTabs','renderEventos','renderLockState']
});

export const meta = section.meta;
export const mount = context => section.mount(context);
export const activate = context => section.activate(context);
export const refresh = activate;
export const add = () => callLegacy('addEvento');
export const save = id => callLegacy('saveEventRecord', id);
