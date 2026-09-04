const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');const service=fs.readFileSync(path.join(root,'services/bank-reconciliation.service.js'),'utf8'),ui=fs.readFileSync(path.join(root,'public/app/features/v24-cuadre-banco.js'),'utf8');let ok=0,ko=0;function t(n,c){if(c){ok++;console.log('OK ',n)}else{ko++;console.error('KO ',n)}}
t('todo estado previo del evento queda protegido',/const protectedStateIds=new Set\(arr\(existingStateRows\)[\s\S]{0,180}movement_id/.test(service));
t('AUTO_INGRESO no sobrescribe estado protegido',/if\(!protectedStateIds\.has\(text\(movement\.id\)\)\)[\s\S]{0,180}stateRows\.push/.test(service));
t('regeneración AUTO no borra estados de movimiento',!/from\(EVENT_MOVEMENT_STATE_TABLE\)\.delete\(\)\.eq\('event_id',selectedEvent\)\.in\('movement_id',movementIds/.test((service.match(/async function persistAutomaticIncomeReconciliation[\s\S]*?export async function setBankEventPeriod/)||[''])[0]));
t('toggle manual queda auditado MANUAL',/updated_by:`MANUAL:\$\{actorName\}`/.test(service));
t('resultado declara estados preservados',/preservedStates:protectedStateIds\.size/.test(service));
t('checkbox En saldo escribe en change',/document\.addEventListener\('change'[\s\S]{0,380}data-ce-bank-included[\s\S]{0,200}toggleIncluded/.test(ui));
const clickBlock=(ui.match(/document\.addEventListener\('click'[\s\S]*?document\.addEventListener\('keydown'/)||[''])[0];
t('click ya no llama toggleIncluded',!/data-ce-bank-included|toggleIncluded/.test(clickBlock));
t('pointerdown protege switch sin preventDefault en bloque',/const stateSwitch=[\s\S]{0,420}stopImmediatePropagation[\s\S]{0,80}return;/.test(ui));
console.log(`BANK4.9-MANUAL-AUTHORITY ${ok} OK / ${ko} KO`);process.exitCode=ko?1:0;
