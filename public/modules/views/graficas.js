export function mount({root} = {}){
  if(root) root.dataset.ceModule = 'graficas';
  if(typeof window.renderGraficas === 'function') window.renderGraficas();
}
