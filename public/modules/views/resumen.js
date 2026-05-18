export function mount({root, app} = {}){
  if(root) root.dataset.ceModule = 'resumen';
  const actions = app?.actions || window;
  if(typeof actions.renderBudget === 'function') actions.renderBudget();
  if(window.__ceV251 && typeof window.__ceV251.applyZoomColors === 'function'){
    window.__ceV251.applyZoomColors();
  }
  if(window.__ceV252 && typeof window.__ceV252.apply === 'function'){
    window.__ceV252.apply();
  }
  if(window.__ceV253 && typeof window.__ceV253.apply === 'function'){
    window.__ceV253.apply();
  }
}
