import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),src=fs.readFileSync(path.join(root,'services/zuzu-conversation-ledger.service.js'),'utf8');
function extract(name){const start=src.indexOf(`function ${name}(`);if(start<0)throw new Error(`No se encuentra ${name}`);const paren=src.indexOf('(',start);let pd=0,q='',esc=false,close=-1;for(let i=paren;i<src.length;i++){const c=src[i];if(q){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===q)q='';continue;}if(c==='"'||c==="'"||c==='`'){q=c;continue;}if(c==='(')pd++;else if(c===')'&&--pd===0){close=i;break;}}const brace=src.indexOf('{',close);let d=0; q='';esc=false;for(let i=brace;i<src.length;i++){const c=src[i];if(q){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===q)q='';continue;}if(c==='"'||c==="'"||c==='`'){q=c;continue;}if(c==='{')d++;else if(c==='}'&&--d===0)return src.slice(start,i+1);}throw new Error(name);}
const stopStart=src.indexOf('const STOP=');const stopEnd=src.indexOf('\nfunction tokens',stopStart);const stopDecl=src.slice(stopStart,stopEnd);
const body=`const text=v=>v==null?'':String(v);const trim=v=>text(v).trim();const norm=v=>trim(v).normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\\s+/g,' ').trim();${stopDecl}\n${extract('tokens')}\n${extract('tokenHitScore')}\n${extract('historyScore')}\nreturn {historyScore};`;
const {historyScore}=Function(body)();
const explicitVicente={seq:3,userPrompt:'Y Vicente, ¿ha ido ya a comprar?',title:'Detalle de compras',actionType:'query',semanticTags:{action:'query',domain:'purchases',entities:[{role:'responsible',value:'Vicente'}]},focus:{person:'Vicente'}};
const derivedVicente={seq:7,userPrompt:'No me hagas una tesis, dime los dos o tres que más hayan comprado.',title:'Detalle de compras',actionType:'local',semanticTags:{action:'local',domain:'purchases'},focus:{person:'Vicente'}};
const pocholoStart={seq:1,userPrompt:'Dime si Pocholo ha donado ya algo',title:'Detalle de donaciones',actionType:'query',semanticTags:{action:'query',domain:'donations',entities:[{role:'donor',value:'Pocholo'}]}};
const pocholoLater={seq:8,userPrompt:'Volviendo a Pocholo, ¿ha puesto dinero o ha donado cosas?',title:'Detalle de compras',actionType:'query',semanticTags:{action:'query',domain:'purchases',entities:[{role:'person',value:'Pocholo'}]}};
const tests=[
 ['Vicente explícito gana a foco derivado',historyScore('Bueno, vuelve a Vicente.',explicitVicente)>historyScore('Bueno, vuelve a Vicente.',derivedVicente)],
 ['"al principio" favorece turno inicial',historyScore('Recuérdame lo del principio de Pocholo',pocholoStart)>historyScore('Recuérdame lo del principio de Pocholo',pocholoLater)],
 ['donación favorece recuerdo de donaciones',historyScore('lo de la donación de Pocholo',pocholoStart)>historyScore('lo de la donación de Pocholo',pocholoLater)]
];let ko=0;for(const [n,ok] of tests){console.log(`${ok?'OK':'KO'} ${n}`);if(!ok)ko++;}if(ko)process.exit(1);console.log('HISTORY RANKING REGRESSION: OK');
