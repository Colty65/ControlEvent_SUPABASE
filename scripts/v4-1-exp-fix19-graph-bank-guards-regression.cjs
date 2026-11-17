const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const ai=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8');
const bank=fs.readFileSync(path.join(root,'services/bank-reconciliation.service.js'),'utf8');
const itv=fs.readFileSync(path.join(root,'services/zuzu-test-lab.service.js'),'utf8');
let ok=0,ko=0;function c(n,v){if(v){ok++;console.log('OK ',n)}else{ko++;console.log('KO ',n)}}
c('semántica reconoce asistentes flexionados',/asistent\\w\*/.test(ai));
c('semántica reconoce compras flexionadas',/compr\\w\*/.test(ai));
c('semántica reconoce responsables flexionados',/responsabl\\w\*/.test(ai));
c('guardia pagos asistentes fuerza event_income_status',/Pago de asistentes → event_income_status/.test(ai));
c('guardia comprado pendiente fuerza realized y pending',/purchase_status:'realized'/.test(ai)&&/purchase_status:'pending'/.test(ai));
c('Brain-Lite materializa gráfica weather',/v73WeatherChartFromResult\(x\.result\)/.test(ai)&&/charts:finalCharts/.test(ai));
c('Cuadre Banco se cierra por cargos bancarios, no por catálogo TKxx',/ticketsCompleteForLifecycle=ticketSummary\.allMovementsJustified===true/.test(bank));
c('TKxx pendiente efectivo queda solo como evidencia',/cashOnlyPendingTickets/.test(bank)&&/cashPendingTicketAmount/.test(bank));
c('voz convierte barras visuales en pausas',/replace\(\/\\s\*\\\\\|/.test(ai)||/replace\(\/\\s\*\\\|/.test(ai));
c('ITV pagos exige solo income_status',/pagos de asistentes deben usar solo event_income_status/.test(itv));
c('ITV final exige explicación de peor',/valoración final no explica por qué/.test(itv));
console.log(`FIX19: ${ok} OK · ${ko} KO`);process.exitCode=ko?1:0;
