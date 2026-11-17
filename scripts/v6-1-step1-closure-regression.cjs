const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8');
const tests=[
 ['synthesis schema exists',/function v61SynthesisContractSchema\(\)/],
 ['synthesis only NO_ACTION_REQUIRED',/v61SynthesisContractSchema[\s\S]{0,2500}enum:\['NO_ACTION_REQUIRED'\]/],
 ['synthesis reply mandatory string',/v61SynthesisContractSchema[\s\S]{0,3000}reply:\{type:'string'\}/],
 ['synthesis provenance mandatory',/v61SynthesisContractSchema[\s\S]{0,3000}provenance_evidence_ids/],
 ['mode selects synthesis schema',/isSynthesis\?v61SynthesisContractSchema\(\):v61OutputContractSchema\(\)/],
 ['mode propagated to strict output',/v61CallStrictStructuredOutput\(\{packet,flowTrace,model,externalSignal,stage,mode\}\)/],
 ['synthesis phase instruction closes now',/FASE DE SÍNTESIS CERTIFICADA:[\s\S]{0,500}Debes cerrar AHORA con NO_ACTION_REQUIRED/],
 ['unsupported capability closes NO_ACTION',/capacidad que NO está disponible[\s\S]{0,300}NO_ACTION_REQUIRED/],
 ['unsupported no approximation',/No intentes aproximar la operación/],
 ['only four primitives in step 1',/SOLO están disponibles FETCH, FILTER, SORT_LIMIT y VISUALIZE/],
 ['JOIN explicitly unavailable',/NO existen todavía JOIN, AGGREGATE, DERIVE/],
 ['qualitative conclusion criterion required',/Una conclusión cualitativa solo puede afirmarse si el Context Packet contiene explícitamente el criterio necesario/],
 ['positive balance not enough for success',/Un saldo positivo[\s\S]{0,250}NO autorizan a afirmar «éxito»/],
 ['native structured output stays active',/responseJsonSchema:schema/],
 ['no function calling active',/Function calling está deshabilitado en v6_1-exp/]
];
let ok=0;
for(const [name,re] of tests){const pass=re.test(src); console.log(`${pass?'OK':'KO'} ${name}`); if(pass)ok++;}
console.log(`TOTAL ${ok}/${tests.length}`);
process.exit(ok===tests.length?0:1);
