export function mount({root, app} = {}){
  if(root) root.dataset.ceModule = 'donaciones';
  const actions = app?.actions || window;
  if(typeof actions.renderDonaciones === 'function') actions.renderDonaciones();
  if(window.__ceV253 && typeof window.__ceV253.apply === 'function'){
    window.__ceV253.apply();
  }
}
