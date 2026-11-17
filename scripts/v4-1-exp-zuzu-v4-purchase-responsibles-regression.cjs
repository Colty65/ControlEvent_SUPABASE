const fs=require('fs');
const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','services','event-ai.service.js'),'utf8');
const checks=[
 ['planner documents responsible breakdown', src.includes('RESPONSABLE DE COMPRA') && src.includes('purchase_responsibles')],
 ['implicit breakdown recognizes responsible', /breakdown:\/\\b\([^\n]*responsable\|responsables/.test(src)],
 ['guardrail forces event_breakdowns for responsible', src.includes('valor disponible|plan total|responsable|responsables|encargado|encargados')],
 ['aggregates realized and pending in same map', src.includes("byResponsible=new Map()") && src.includes("g.Comprado+=amount") && src.includes("g['Pte.Compra']+=amount")],
 ['canonical responsible humanization', src.includes("people.get(rid)?.nombre")],
 ['table keeps zeros and both money columns', src.includes("v26Table('purchase_responsibles'") && src.includes("'Pte.Compra':v26MoneySchema")],
 ['direct spoken answer per responsible', src.includes("comprado y ${v26FormatEuro(r['Pte.Compra'])} pendiente")],
 ['table only forced when explicitly requested', src.includes("out.showTables=intent.explicitList?[{tool_id:breakdown.id,table_key:'purchase_responsibles'}]:[]")]
];
let ok=0;for(const [name,pass] of checks){console.log(`${pass?'OK':'KO'} · ${name}`);if(pass)ok++;}
console.log(`PURCHASE RESPONSIBLES: ${ok}/${checks.length} OK`);process.exit(ok===checks.length?0:1);
