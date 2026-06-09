export const menuModules = [
  {
    name: 'ingresos',
    buttonId: 'tabIngresosBtn',
    viewId: 'tabIngresos',
    module: './views/ingresos.js'
  },
  {
    name: 'donaciones',
    buttonId: 'tabDonacionesBtn',
    viewId: 'tabDonaciones',
    module: './views/donaciones.js'
  },
  {
    name: 'compras',
    buttonId: 'tabComprasBtn',
    viewId: 'tabCompras',
    module: './views/compras.js'
  },
  {
    name: 'mapa',
    buttonId: 'tabMapaBtn',
    viewId: 'tabMapaProductos',
    module: './views/mapa-productos.js'
  },
  {
    name: 'documentos',
    buttonId: 'tabDocumentosBtn',
    viewId: 'tabDocumentos',
    module: './views/documentos.js'
  },
  {
    name: 'resumen',
    buttonId: 'tabResumenBtn',
    viewId: 'tabResumen',
    module: './views/resumen.js'
  },
  {
    name: 'graficas',
    buttonId: 'tabGraficasBtn',
    viewId: 'tabGraficas',
    module: './views/graficas.js'
  },
  {
    name: 'mantenimiento',
    buttonId: 'btnToggleMaintenance',
    viewId: 'maintenanceWrapper',
    module: './views/mantenimiento.js'
  }
];

export function findMenuModule(name){
  return menuModules.find(item => item.name === name) || null;
}

export function findMenuModuleByButton(buttonId){
  return menuModules.find(item => item.buttonId === buttonId) || null;
}
