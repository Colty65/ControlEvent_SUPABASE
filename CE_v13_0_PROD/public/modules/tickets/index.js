import { installTicketRuntime } from './_ticket-runtime.js';
import './ticket-storage.js';
import './ticket-images.js';
import './ticket-modal.js';

export function installTicketModules(){
  return installTicketRuntime();
}

if(typeof window !== 'undefined'){
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', installTicketModules, {once:true});
  }else{
    installTicketModules();
  }
}
