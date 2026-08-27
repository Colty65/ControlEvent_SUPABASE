const fs=require('fs');
const service=fs.readFileSync('services/bank-reconciliation.service.js','utf8');
const ui=fs.readFileSync('public/app/features/v24-cuadre-banco.js','utf8');
const sql=fs.readFileSync('sql/ce_bank_ticket_links_multi_v4.sql','utf8');
const routes=fs.readFileSync('routes/bank-reconciliation.routes.js','utf8');
let ok=0,total=0;function t(n,c){total++;if(c){ok++;console.log('OK · '+n);}else{console.error('KO · '+n);process.exitCode=1;}}

t('backend ya no bloquea suma TKxx > movimiento',!/BANK_TICKETS_EXCEED_MOVEMENT/.test(service)&&/NO se impide asociar justificantes/.test(service));
t('un movimiento mantiene varios links y suma global',/select\('\*'\)\.eq\('movement_id',id\)/.test(service)&&/globalBefore/.test(service)&&/attempted/.test(service));
t('el TKxx sigue siendo único por evento y código',/linked&&ticket\.linkedMovementId!==id/.test(service));
t('evento finalizado sigue bloqueado para nuevas imputaciones',/BANK_EVENT_FINALIZED/.test(service));
t('selector sigue limitado a eventos En curso',/scope:'in_progress_events_only'/.test(service)&&/amount_desc/.test(service));
t('UI usa clave eventId + ticketCode',/key:`\$\{text\(item\.eventId\)\}\|\$\{text\(item\.ticketCode\)\}`/.test(ui));
t('UI no bloquea guardar por exceso',!/Los TKxx seleccionados suman/.test(ui)&&/una diferencia en cualquiera de los dos sentidos NO impide guardar/.test(ui));
t('UI muestra diferencia provisional en ambos sentidos',/TKxx superan banco en/.test(ui)&&/Faltan \$\{money\(diff\)\}/.test(ui));
t('aceptar diferencia funciona si justificantes superan banco',/Math\.abs\(num\(row\.globalDifference\)\)>\.01/.test(ui)&&/Los TKxx asociados superan el movimiento bancario/.test(ui));
t('backend acepta diferencia absoluta',/absoluteDifference=cents\(Math\.abs\(difference\)\)/.test(service)&&/accepted_difference:absoluteDifference/.test(service));
t('estado exacto se decide antes que diferencia aceptada',/Math\.abs\(difference\)<=\.01\) status=shared\?'CUADRADO_COMPARTIDO':'CUADRADO'/.test(service));
t('SQL elimina UNIQUE restrictivo movement/event',/DROP CONSTRAINT/.test(sql)&&/movement_id','event_id/.test(sql));
t('SQL conserva unicidad correcta event+ticket',/uq_ce_bank_ticket_links_event_ticket/.test(sql)&&/\(event_id, ticket_code\)/.test(sql));
t('SQL añade índice de movimiento no único',/idx_ce_bank_ticket_links_movement/.test(sql));
t('23505 de esquema antiguo da diagnóstico SQL',/BANK_TICKET_LINK_SCHEMA_RESTRICTIVE/.test(service)&&/ce_bank_ticket_links_multi_v4\.sql/.test(service));
t('ruta POST de tickets sigue activa',/movements\/:id\/tickets/.test(routes));

function status(bank,tickets,accepted=false){
  const target=Math.abs(bank),justified=Math.round(tickets.reduce((a,b)=>a+b,0)*100)/100;
  const diff=Math.round((target-justified)*100)/100;
  const abs=Math.abs(diff);
  return {target,justified,diff,abs,closed:abs<=.01||(accepted&&abs>.01)};
}
let x=status(-135.68,[130.68,5]);
t('caso captura: TK01 130,68 + TK15 5 = 135,68 exacto',x.justified===135.68&&x.diff===0&&x.closed);
x=status(-135,[130.68,5]);
t('si banco es 135, los dos TK se conservan y queda diferencia 0,68',x.justified===135.68&&x.diff===-0.68&&!x.closed);
x=status(-135,[130.68,5],true);
t('diferencia inversa 0,68 puede cerrarse explícitamente',x.closed&&x.abs===0.68);
x=status(-120,[89,5]);
t('caso multievento previo 94/120 sigue pendiente',x.diff===26&&!x.closed);
x=status(-120,[89,5,26]);
t('caso multievento previo 94+26 sigue cerrando exacto',x.diff===0&&x.closed);

console.log(`\nv4.0_exp BANK2 · ${ok}/${total} comprobaciones OK`);if(ok!==total)process.exit(1);
