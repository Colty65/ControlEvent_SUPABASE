const fs=require('fs');const assert=require('assert');
const read=p=>fs.readFileSync(p,'utf8');
const donation=read('public/app/features/v17-fix23-performance-dom-event-scope.js');
const bank=read('public/app/features/v24-cuadre-banco.js');
const css=read('public/app/styles/cuadre-banco.css');
const html=read('public/index.html');
const checks=[
  ['Donación compacta muestra estado de entrega',donation.includes('Situación entrega: <b>${deliveryStatus}</b>')],
  ['Conserva estados Supuesta, Comprometida, Entregada', ['Supuesta','Comprometida','Entregada'].every(x=>donation.includes(x))],
  ['Prioridad a la propiedad persistida',donation.includes('r.donacionSituacion ?? r.donacion_situacion')],
  ['Visor de histórico se abre en el histórico',bank.includes('if(store.bankHistoryOpen && history?.isConnected) return history;')],
  ['ESC cierra foto antes que histórico',bank.indexOf("if($('ceBankTicketPhoto')){event.preventDefault()")<bank.indexOf('if(store.bankHistoryOpen){event.preventDefault();closeBankHistory();return;}')],
  ['Refresco se aplaza mientras hay visor',bank.includes('store.bankHistoryPendingRender=true;')],
  ['Scroll se preserva al actualizar miniaturas',bank.includes("view.querySelector('.ce-bank-history-list').scrollTop=previousScroll")],
  ['Miniaturas ingreso diferidas',bank.includes('data-ce-history-lazy-src')],
  ['Miniaturas TKxx por IntersectionObserver',bank.includes('observer.observe(button)')],
  ['No blur histórico costoso',css.includes('.ce-bank-history-overlay{backdrop-filter:none!important')],
  ['No repintar filas fuera de pantalla',css.includes('content-visibility:auto')],
  ['Cache bust de ambos JS y CSS',html.includes('20261125-HISTORY-RETURN-PERF3')&&html.includes('20261125-DONATION-STATUS3')&&html.includes('20261125-HISTORY-SCROLL3')],
];
for(const [name,passed] of checks){assert(passed,`FALLO: ${name}`);console.log('OK:',name)}
console.log(`TOTAL ${checks.length}/${checks.length} comprobaciones OK`);
