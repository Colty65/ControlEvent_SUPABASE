export function mount({root, app} = {}){
  if(root) root.dataset.ceModule = 'compras';
  const actions = app?.actions || window;
  if(typeof actions.renderBudget === 'function') actions.renderBudget();
  if(typeof actions.renderCompras === 'function') actions.renderCompras();
}
