export function mount({root} = {}){
  if(root) root.dataset.ceModule = 'donaciones';
  if(typeof window.renderDonaciones === 'function') window.renderDonaciones();
}
