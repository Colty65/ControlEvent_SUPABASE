import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'..');
const svc=fs.readFileSync(path.join(root,'services','event-ai.service.js'),'utf8');
const voice=fs.readFileSync(path.join(root,'public','app','features','v22-voz3-zuzu.js'),'utf8');
let n=0;function t(name,c){if(!c){console.error('KO · '+name);process.exitCode=1;return;}n++;console.log('OK · '+name);}
const toolBlock=(svc.match(/function v73CommandTools\(\)\{[\s\S]*?\n\}/)||[''])[0];
const queryProps=(toolBlock.match(/make\('ce_query'[\s\S]*?\},\['targets','scope_kind'\]\)/)||[''])[0];
t('ce_query vuelve al schema ligero RAW13',queryProps.includes('operations_json:str')&&!queryProps.includes('group_field:str')&&!queryProps.includes('group_role:str')&&!queryProps.includes('aggregation:str'));
t('agregaciones se expresan por operations_json',svc.includes('toda agregación viaja por operations_json'));
t('fallo visible de compilación habla de Zuzu',svc.includes("title:'Zuzu no pudo interpretar el turno'")&&svc.includes('Zuzu no llegó a emitir un registro ejecutable'));
t('trazas activas hablan de Zuzu',svc.includes('Zuzu elige comando CE')&&svc.includes('COMANDO ZUZU')&&svc.includes('RESPUESTA ZUZU'));
t('fase final identifica a Zuzu como masculino',svc.includes('Zuzu es MASCULINO')&&svc.includes('directo, rudo en el buen sentido')&&svc.includes('grave y potente'));
t('voz navegador forzada a masculino',voice.includes("function selectedMode(){return 'male';}")&&voice.includes('Zuzu · Masculina'));
t('voz más grave y potente',voice.includes('u.pitch=0.82;u.volume=1'));
t('prueba de voz está en masculino',voice.includes('Estoy listo. Vamos al lío.'));
t('espera entretenimiento conserva 500 ms',voice.includes('Math.max(0,500-(Date.now()-(state.entertainmentFinishedAt||0)))'));
if(!process.exitCode)console.log(`\nRAW14A · ${n}/${n} comprobaciones OK`);
