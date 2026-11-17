import assert from 'node:assert/strict';
import {buildV6DecisionSchema,buildV6SynthesisSchema,V6_CORE_VERSION} from '../services/zuzu-v6-core.service.js';

const small={id:'small',entities:{alpha:{fields:['id','name']}},capabilities:{supported:['FETCH','FILTER','SORT_LIMIT','VISUALIZE']}};
const huge={id:'huge',entities:Object.fromEntries(Array.from({length:500},(_,i)=>[`entity_${i}`,{fields:Array.from({length:40},(_,j)=>`field_${i}_${j}`)}])),capabilities:{supported:['FETCH','FILTER','SORT_LIMIT','VISUALIZE']}};
const ds=buildV6DecisionSchema(small), dh=buildV6DecisionSchema(huge), ss=buildV6SynthesisSchema(small), sh=buildV6SynthesisSchema(huge);
assert.deepEqual(ds,dh,'Decision schema must be domain-cardinality invariant');
assert.deepEqual(ss,sh,'Synthesis schema must be domain-cardinality invariant');
const db=Buffer.byteLength(JSON.stringify(ds)), sb=Buffer.byteLength(JSON.stringify(ss));
assert.ok(db<5000,`Decision schema too large: ${db}`);
assert.ok(sb<5000,`Synthesis schema too large: ${sb}`);
const raw=JSON.stringify(ds);
for(const forbidden of ['events','people','purchases','FUNCION','SySA','Pocholo','Carmelo'])assert.ok(!raw.includes(forbidden),`Domain identifier leaked into universal schema: ${forbidden}`);
console.log(`UNIVERSAL CONTRACT OK · core=${V6_CORE_VERSION} · decision=${db}B · synthesis=${sb}B · 500 entities invariant`);
