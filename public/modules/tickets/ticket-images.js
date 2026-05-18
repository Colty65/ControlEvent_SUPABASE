import { upload, remove, getImage, registerTicketModule } from './_ticket-runtime.js';

export const meta = {name:'ticket-images', version:'v26.2', mode:'legacy-ui-controller'};

export function uploadTicketImage(label){
  return upload(label);
}

export function removeTicketImage(label){
  return remove(label);
}

export function preview(label){
  return getImage(label);
}

registerTicketModule('ticket-images', {meta, uploadTicketImage, removeTicketImage, preview});
