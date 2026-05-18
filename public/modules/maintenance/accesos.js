import { createMaintenanceSection, callLegacy } from './_maintenance-runtime.js';

const section = createMaintenanceSection({
  name:'acceso',
  render:['renderMaintenanceTabs','renderAcceso','renderLockState']
});

export const meta = section.meta;
export const mount = context => section.mount(context);
export const activate = context => section.activate(context);
export const refresh = activate;
export const open = () => callLegacy('openAccessMaintenance');
export const save = id => callLegacy('saveAccessUser', id || '');
export const remove = id => callLegacy('deleteAccessUser', id || '');
