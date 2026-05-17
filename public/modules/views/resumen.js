export function mount({root} = {}){
  if(root) root.dataset.ceModule = 'resumen';
  if(typeof window.renderBudget === 'function') window.renderBudget();
  if(window.__ceV251 && typeof window.__ceV251.applyZoomColors === 'function'){
    window.__ceV251.applyZoomColors();
  }
}
