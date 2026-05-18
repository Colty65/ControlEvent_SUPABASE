import { registerTicketModule } from './_ticket-runtime.js';

export const meta = {name:'ticket-modal', version:'v26.8', mode:'legacy-modal-boundary'};

export function closeAll(){
  document.querySelectorAll('#ceTicketModalV234,#ceTicketImageModalV225,.ce-ticket-modal-v234,.ce-ticket-modal-v225').forEach(modal => {
    modal.classList.add('hidden');
    if(modal.parentElement && modal.id) modal.remove();
  });
}

registerTicketModule('ticket-modal', {meta, closeAll});
