export function mount({root} = {}){
  if(root) root.dataset.ceModule = 'graficas';
  if(typeof window.renderGraficas === 'function') window.renderGraficas();
  if(window.__ceV253 && typeof window.__ceV253.apply === 'function'){
    window.__ceV253.apply();
  }
}
