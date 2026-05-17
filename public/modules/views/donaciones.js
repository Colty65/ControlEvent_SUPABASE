export function mount({root} = {}){
  if(root) root.dataset.ceModule = 'donaciones';
  if(typeof window.renderDonaciones === 'function') window.renderDonaciones();
  if(window.__ceV253 && typeof window.__ceV253.apply === 'function'){
    window.__ceV253.apply();
  }
}
