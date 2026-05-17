export function mount({root} = {}){
  if(root) root.dataset.ceModule = 'ingresos';
  if(typeof window.renderIngresosSummary === 'function') window.renderIngresosSummary();
  if(typeof window.renderColabs === 'function') window.renderColabs();
}
