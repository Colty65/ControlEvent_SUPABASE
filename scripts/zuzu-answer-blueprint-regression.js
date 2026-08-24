import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const src=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8');

function extractFunction(name){
  const re=new RegExp(`function\\s+${name}\\([^\\n]*\\)\\s*\\{`);
  const match=src.match(re);if(!match)throw new Error(`No encuentro ${name}`);
  const start=match.index;const brace=start+match[0].lastIndexOf('{');let depth=0,quote='',esc=false;
  for(let i=brace;i<src.length;i++){
    const c=src[i];
    if(quote){if(esc){esc=false;continue;}if(c==='\\'){esc=true;continue;}if(c===quote)quote='';continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='{')depth++; else if(c==='}'&&--depth===0)return src.slice(start,i+1);
  }
  throw new Error(`Función incompleta ${name}`);
}
const context={console,JSON,Object,Array,Set,Number,String,Math,RegExp,Date,Intl,
  V73_ANSWER_PLACEHOLDERS:Object.freeze(['amount','count','person','product','event','scope_text','people','items','events','subject','winner','winner_value','runner_up','runner_up_value','difference','metric','summary','detail']),
  trim:v=>String(v??'').trim(),arr:v=>Array.isArray(v)?v:(v==null?[]:[v]),norm:v=>String(v??'').trim().toLowerCase()};
vm.createContext(context);
for(const fn of ['v73NormalizeAnswerBlueprint','v73AssignReuseValue','v73NormalizeTargets','v73PrimaryTarget','v73PrimaryDomain','v73PrepareAnalyticPlan','v73DatasetSchemaColumns','v73RenderAnswerBlueprint']){
  vm.runInContext(`${extractFunction(fn)}; this.${fn}=${fn};`,context);
}
const {v73NormalizeAnswerBlueprint,v73AssignReuseValue,v73PrepareAnalyticPlan,v73DatasetSchemaColumns,v73RenderAnswerBlueprint}=context;

assert.equal(v73NormalizeAnswerBlueprint({lead:'Ya son 100 €.'},'amount'),undefined,'lead con cifras rechazado');
assert.equal(v73NormalizeAnswerBlueprint({lead:'Comprobando el dato...'},'amount'),undefined,'lead de proceso rechazado');
assert.equal(v73NormalizeAnswerBlueprint({lead:'Sobre este punto, esto es lo que consta.'},'amount').lead,'Sobre este punto, esto es lo que consta.');
assert.equal(v73RenderAnswerBlueprint({lead:'Te lo resumo de forma sencilla.'},{},'fallback'),'Te lo resumo de forma sencilla.');
assert.equal(v73RenderAnswerBlueprint({template:'{amount} se ha gastado.'},{amount:'100,00 €'},'fallback'),'','template antiguo no sustituye la verdad factual');

const q={person:'Vicente'};assert.equal(v73AssignReuseValue(q,'person','Pocholo').applied,false);assert.equal(q.person,'Vicente');
const q2={};assert.equal(v73AssignReuseValue(q2,'person','Vicente').applied,true);assert.equal(q2.person,'Vicente');
const semantic={action:'query',query:{targets:[{domain:'purchases'}],scope:{kind:'all_events'},operations:[{type:'rank',reference:'Vicente'}]}};
const exec=v73PrepareAnalyticPlan(semantic,{});assert.equal(semantic.query.operations[0].group_role,undefined);assert.equal(exec.query.operations[0].group_role,'responsible');
assert.ok(v73DatasetSchemaColumns('purchases').includes('Importe'));assert.ok(v73DatasetSchemaColumns('purchases').includes('Responsable'));

assert.match(src,/const factual=v73AnswerForKind[\s\S]*\[trim\(preamble\),trim\(lead\),trim\(factual\)\]/,'la respuesta factual siempre se añade después del lead');
assert.match(src,/normalizedPlan=compiled\.plan,plan=v73PrepareAnalyticPlan\(normalizedPlan,session\)/,'plan semántico preservado separado de interpretación física');
assert.match(src,/REUSE no sobrescribe literales actuales/,'autoridad del turno actual trazada');
console.log('ZUZU ANSWER BLUEPRINT / PAYLOAD / AUTHORITY: OK');
