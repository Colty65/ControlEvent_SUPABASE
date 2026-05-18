import { getImage, setImage, removeImage, stateKey, registerTicketModule } from './_ticket-runtime.js';

export const meta = {name:'ticket-storage', version:'v26.5', mode:'legacy-state-controller'};

export { getImage, setImage, removeImage, stateKey };

registerTicketModule('ticket-storage', {meta, getImage, setImage, removeImage, stateKey});
