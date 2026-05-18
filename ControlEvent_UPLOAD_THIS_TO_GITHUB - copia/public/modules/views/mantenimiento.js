export function mount({root, app} = {}){
  if(root) root.dataset.ceModule = 'mantenimiento';
  const actions = app?.actions || window;
  if(typeof actions.renderMaintenance === 'function') actions.renderMaintenance();
}
