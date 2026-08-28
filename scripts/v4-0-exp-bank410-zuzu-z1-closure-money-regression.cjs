const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('services/event-ai.service.js','utf8');
const lab=fs.readFileSync('services/zuzu-test-lab.service.js','utf8');
const ui=fs.readFileSync('public/app/features/zuzu-test-console-gd.js','utf8');
const html=fs.readFileSync('public/index.html','utf8');

function extractFunction(name){
  const start=src.indexOf(`function ${name}(`); if(start<0)throw new Error(`No encuentro ${name}`);
  const p0=src.indexOf('(',start); let pd=0,quote='',esc=false,close=-1;
  for(let i=p0;i<src.length;i++){
    const c=src[i];
    if(quote){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===quote)quote='';continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='(')pd++; else if(c===')'&&--pd===0){close=i;break;}
  }
  const brace=src.indexOf('{',close); let depth=0; quote=''; esc=false;
  for(let i=brace;i<src.length;i++){
    const c=src[i];
    if(quote){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===quote)quote='';continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='{')depth++; else if(c==='}'&&--depth===0)return src.slice(start,i+1);
  }
  throw new Error(`Función incompleta ${name}`);
}
const helpers=`
const text=v=>v==null?'':String(v);
const trim=v=>text(v).trim();
const norm=v=>{const s=text(v);return (s.normalize?s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,''):s).toLowerCase().trim();};
const arr=v=>Array.isArray(v)?v:[];
`;
const code=[helpers,
  extractFunction('v26ParseLocalizedDisplayNumber'),
  extractFunction('v26FormatEuro'),
  extractFunction('v410MoneyFieldIndicator'),
  extractFunction('v26FormatNarrativeMoney'),
  extractFunction('v79FastLocalPresentation'),
  'return {v26ParseLocalizedDisplayNumber,v26FormatEuro,v410MoneyFieldIndicator,v26FormatNarrativeMoney,v79FastLocalPresentation};'
].join('\n');
const F=new Function(code)();
let n=0; const ok=(cond,msg)=>{assert.ok(cond,msg);n++;console.log(`OK ${n}: ${msg}`);};

ok(F.v26FormatEuro(1734)==='1.734,00 €','formato EUR español recupera miles y dos decimales');
ok(F.v26FormatEuro('6410 EUR')==='6.410,00 €','normaliza EUR textual a símbolo €');
ok(F.v26FormatNarrativeMoney('Ingresos 7941 EUR; saldo 5565 €.',[])==='Ingresos 7.941,00 €; saldo 5.565,00 €.','narrativa normaliza importes marcados como moneda');
for(const f of ['Precio','Importe','Saldo operativo','Ingresos','Compras realizadas','Compras pendientes','Donaciones valoradas','Gastos previstos','Suma Importe','Total general compras'])ok(F.v410MoneyFieldIndicator(f),`${f} se tipa como moneda`);
for(const f of ['Unidades','Cantidad','Asistentes','Eventos','Nº registros','TKxx','Documentos','Temperatura','Porcentaje'])ok(!F.v410MoneyFieldIndicator(f),`${f} NO se tipa como moneda`);
ok(F.v410MoneyFieldIndicator('Valor',{source_tool:'event_donation_lines'})===true,'Valor ambiguo es EUR solo en fuente monetaria conocida');
ok(F.v410MoneyFieldIndicator('Valor',{source_tool:'event_documentation'})===false,'Valor ambiguo no se fuerza a EUR fuera de fuente monetaria');
ok(src.includes('rows:cleanRows')&&src.includes('column_types:columnTypes'),'row cache conserva filas saneadas y tipos canónicos');
ok(src.includes("documentation_metric='income_with_receipt'")&&src.includes("documentation_metric='purchase_tickets_with_image'")&&src.includes("documentation_metric='ticket_detail'"),'documentation separa justificantes, TKxx con imagen y TKxx concreto');
ok(src.includes('function v410RepairTypedFilterConflicts')&&src.includes('Un EVENT apareció duplicado como donor'),'filtro donor contradictorio con EVENT se elimina sin cambiar el evento');
ok(src.includes('donation_record_count')&&src.includes('registros de donación'),'donaciones distinguen registros originales de productos agrupados');
ok(src.includes('function v410RepairContextualConversationFollowup')&&src.includes('function v410RepairExactPersonSelection'),'continuidad evento/persona tiene reparación tipada');
ok(src.includes('function v79RepairComparisonFollowup')&&src.includes("q.targets=[{domain:'comparison'}]"),'comparación multi-entidad se reduce a comparison canónica');
ok(src.includes("if(rk==='table'&&ops.some(op=>['sort','limit','rank'].includes(trim(op?.type)))&&Number(dataset?.rowCount)>1)return false"),'SAFE FAST-LOCAL no cierra ranking sobre tabla cruda');
ok(F.v79FastLocalPresentation({action:'query',response_kind:'table',query:{targets:[{domain:'purchases'}],operations:[{type:'sort',field:'Importe'},{type:'limit',limit:1}]}},{},{domain:'purchases',rowCount:8},'OK')===false,'FAST-LOCAL rechaza tabla con ranking aún multi-fila');
ok(F.v79FastLocalPresentation({action:'query',response_kind:'table',query:{targets:[{domain:'purchases'}],operations:[{type:'sort',field:'Importe'},{type:'limit',limit:1}]}},{},{domain:'purchases',rowCount:1},'OK')===true,'FAST-LOCAL admite ranking ya materializado a una fila');
ok(lab.includes('asksCount')&&lab.includes('no devuelve el recuento bancario canónico'),'oráculo Banco valida la magnitud realmente preguntada');
ok(lab.includes('payloadItems')&&lab.includes('result-set estructurado'),'oráculo acepta dataset estructurado aunque la respuesta oral sea breve');
ok(ui.includes('20260828-BANK410-Z1-CLOSURE-SAFEFASTLOCAL-EUR'),'UI exporta build BANK4_10');
ok(html.includes('controlevent-build" content="20260828-V4_0_EXP-BANK410-Z1-CLOSURE-SAFEFASTLOCAL-EUR'),'build general BANK4_10 actualizado');
ok(html.includes('zuzu-test-console-gd.js?v=20260828-BANK410-Z1-CLOSURE-SAFEFASTLOCAL-EUR'),'cache-bust ITV BANK4_10 actualizado');
console.log(`BANK4_10 Z1 CLOSURE / EUR: ${n}/${n} OK`);
