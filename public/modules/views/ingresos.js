export function mount({root, app} = {}){
  if(root) root.dataset.ceModule = 'ingresos';
  const actions = app?.actions || window;
  if(typeof actions.renderIngresosSummary === 'function') actions.renderIngresosSummary();
  if(typeof actions.renderColabs === 'function') actions.renderColabs();
}
