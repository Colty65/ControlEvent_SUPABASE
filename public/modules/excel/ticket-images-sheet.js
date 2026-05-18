import { registerExcelModule } from './_excel-runtime.js';

export const meta = {
  name: 'ticket-images-sheet',
  version: 'v26.4',
  mode: 'sheet-boundary',
  description: 'Frontera modular para la hoja CALCULOS_TIENDA_TICKET y sus imagenes.'
};

export async function sourceToDataUrl(source){
  if(!source) return '';
  if(/^data:image\//i.test(String(source))) return String(source);
  if(typeof window.sourceToDataUrl === 'function') return window.sourceToDataUrl(source);
  try{
    const res = await fetch(source, {cache:'no-store'});
    if(!res.ok) return '';
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }catch(_){
    return '';
  }
}

registerExcelModule('ticket-images-sheet', {meta, sourceToDataUrl});
