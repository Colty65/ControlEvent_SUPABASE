export function mount({root} = {}){
  if(root) root.dataset.ceModule = 'compras';
  if(typeof window.renderBudget === 'function') window.renderBudget();
  if(typeof window.renderCompras === 'function') window.renderCompras();
}
