export const meta = {name: 'documentos', version: 'v8.5', mode: 'event-documents'};
export function mount(){ return activate(); }
export function activate(){
  if(window.ControlEventDocumentsV85?.open) return window.ControlEventDocumentsV85.open();
  if(window.ControlEventDocumentsV85?.render) return window.ControlEventDocumentsV85.render();
}
export const refresh = activate;
