export function mount({root, app} = {}){
  if(root) root.dataset.ceModule = 'graficas';
  const actions = app?.actions || window;
  if(typeof actions.renderGraficas === 'function') actions.renderGraficas();
  if(window.__ceV253 && typeof window.__ceV253.apply === 'function'){
    window.__ceV253.apply();
  }
}
