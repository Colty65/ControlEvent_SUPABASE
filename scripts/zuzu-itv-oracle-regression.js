import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const src=fs.readFileSync(path.join(root,'services/zuzu-test-lab.service.js'),'utf8');
function extract(name){
  const start=src.indexOf(`function ${name}(`);if(start<0)throw new Error(`No se encuentra ${name}`);
  const paren=src.indexOf('(',start);let pd=0,quote='',esc=false,close=-1;
  for(let i=paren;i<src.length;i++){const c=src[i];if(quote){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===quote)quote='';continue;}if(c==='"'||c==="'"||c==='`'){quote=c;continue;}if(c==='(')pd++;else if(c===')'&&--pd===0){close=i;break;}}
  if(close<0)throw new Error(`Firma incompleta ${name}`);const brace=src.indexOf('{',close);let depth=0;quote='';esc=false;
  for(let i=brace;i<src.length;i++){
    const c=src[i];if(quote){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===quote)quote='';continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}if(c==='{')depth++;else if(c==='}'&&--depth===0)return src.slice(start,i+1);
  }throw new Error(`Función incompleta ${name}`);
}
const names=['vItvLedgerPlan','vItvLedgerDataset','vItvLedgerView','vItvPlanEntityValues','vItvPlanOperations','validateLedgerStructural','vItvGenericHealth','validatePaidCase'];
const body=`
const arr=v=>Array.isArray(v)?v:[];
const text=v=>v==null?'':String(v);
const trim=v=>text(v).trim();
const norm=v=>trim(v).normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\\s+/g,' ').trim();
const validateOracle=()=>({ok:true,reasons:[]});
${names.map(extract).join('\n')}
return {validatePaidCase};`;
const {validatePaidCase:validate}=Function(body)();
const ledger=(plan={},dataset=null,view=null)=>({ok:true,title:'Respuesta',answer:'Correcto',warnings:[],charts:[],meta:{ledgerAudit:{action:plan.action,normalizedPlan:plan},resultContext:{ledger:{dataset,view}}}});
const cases=[
  ['OK estructural',{oracle:{kind:'ledger-structural',action:'query',domain:'purchases',entity:'PAN',rows:34}},ledger({action:'query',query:{domain:'purchases',product:{text:'PAN',match:'family'}}},{domain:'purchases',row_count:34},{displayed_fields:['Evento','Producto']}),'OK'],
  ['KO semántico',{oracle:{kind:'ledger-structural',action:'query',domain:'purchases',entity:'Vicente',rows:1}},ledger({action:'query',query:{domain:'purchases',product:{text:'PAN',match:'family'}}},{domain:'purchases',row_count:923},{displayed_fields:['Evento','Producto']}),'KO'],
  ['WARN aclaración',{}, {ok:true,title:'Necesito una precisión',answer:'¿A qué persona te refieres?',warnings:[],meta:{}},'WARN'],
  ['KO ejecución',{}, {ok:true,title:'Zuzu',answer:'ControlEvent no pudo ejecutar este registro.',warnings:[],meta:{}},'KO'],
  ['WARN total vacío',{}, {ok:true,title:'Detalle',answer:'He preparado 34 registros, por .',warnings:[],meta:{}},'WARN'],
  ['OK alternativas',{oracle:{kind:'ledger-structural',action:'reference|query',domain:'purchases'}},ledger({action:'reference',reference:{target_ref:'T1',action:'reexecute_plan'}},{domain:'purchases',row_count:34},{displayed_fields:['Producto']}),'OK']
];
let ko=0;for(const [name,def,result,expected] of cases){const got=validate(def,result);const ok=got.status===expected;console.log(`${ok?'OK':'KO'} ${name} · ${got.status} · ${got.reasons.join(' | ')||'sin incidencias'}`);if(!ok)ko++;}
if(ko){console.error(`ITV ORACLE REGRESSION: ${ko} KO`);process.exit(1);}console.log('ITV ORACLE REGRESSION: OK');
