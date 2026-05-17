export function mount({root} = {}){
  if(root) root.dataset.ceModule = 'mantenimiento';
  if(typeof window.renderMaintenance === 'function') window.renderMaintenance();
}
