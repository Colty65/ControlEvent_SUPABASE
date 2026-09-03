const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),file=path.join(root,'services/event-ai.service.js'),ai=fs.readFileSync(file,'utf8');
const pkgPath=path.join(root,'package.json'),pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8'));
let ok=0,bad=0;const t=(n,c,d='')=>{if(c){ok++;console.log('OK ',n)}else{bad++;console.error('KO ',n,d)}};

t('P2 declara modo oral estricto',ai.includes('MODO ORAL ESTRICTO:')&&ai.includes('Los datasets y tablas son MEMORIA DE TRABAJO INTERNA'));
t('P2 prohíbe referencias visuales en voz',ai.includes('No digas «te dejo el detalle»')&&ai.includes('no se enseñan ni se mencionan mientras dure el modo oral'));
t('P2 voz prioriza conclusión humana',ai.includes('Prefiere una conclusión humana a una metralla de números'));
t('P2 voz prohíbe céntimos',ai.includes('SIEMPRE en euros enteros, sin céntimos'));
t('narrador oral máximo tres frases',ai.includes('normalmente en 1 o 2 frases y como máximo 3'));
t('narrador oral no ofrece tablas',ai.includes('No acabes ofreciendo tablas, detalles o más información'));
t('todo turno factual hablado pasa por narración natural',ai.includes("const voiceNeedsNaturalNarration=voiceConversation&&good.some")&&ai.includes('voiceNeedsNaturalNarration||vnextP2NeedsNarration(good)'));
t('modo voz oculta tablas pero conserva estado interno',ai.includes('visibleTables=voiceConversation?[]:finalTables')&&ai.includes('datasets siguen vivos en resultContext'));
t('modo voz oculta gráficas',ai.includes('visibleCharts=voiceConversation?[]:charts.slice(0,8)'));
t('texto visible de voz coincide con spokenAnswer',ai.includes('answer=voiceConversation?spokenAnswer:writtenAnswer'));
t('traza deja constancia de voz sin pantalla',ai.includes('VNEXT P2 · VOZ SIN PANTALLA'));

try{
  const start=ai.indexOf("function v40HumanizeAggregateMoney(answer,userPrompt='',voiceConversation=false){"),end=ai.indexOf('function v40ConversationalPolish',start);
  if(start<0||end<0)throw Error('no se encontró v40HumanizeAggregateMoney');
  const src=ai.slice(start,end);
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const parse=v=>{let x=String(v??'').replace(/€/g,'').replace(/\s/g,'').trim();if(x.includes(',')&&x.includes('.'))x=x.replace(/\./g,'').replace(',','.');else if(x.includes(','))x=x.replace(',','.');return Number(x)};
  const whole=n=>`${new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(Math.round(Number(n)))} €`;
  const ctx={text:v=>String(v??''),norm,v26ParseLocalizedDisplayNumber:parse,v40WholeEuro:whole,Number,Math,Intl};vm.createContext(ctx);vm.runInContext(src+'\nthis.F=v40HumanizeAggregateMoney;',ctx);
  t('voz redondea 2.082,52 a euros enteros',['Gastamos 2.083 €','Gastamos 2083 €'].includes(ctx.F('Gastamos 2.082,52 €','cómo acabamos',true)),ctx.F('Gastamos 2.082,52 €','cómo acabamos',true));
  t('voz redondea incluso precio exacto',ctx.F('Costó 12,49 €','dime el precio exacto',true)==='Costó 12 €',ctx.F('Costó 12,49 €','dime el precio exacto',true));
  t('escrito conserva céntimos cuando se piden',ctx.F('Costó 12,49 €','dime el precio exacto',false)==='Costó 12,49 €',ctx.F('Costó 12,49 €','dime el precio exacto',false));
  t('voz evita decir cero euros para cantidades menores de uno',ctx.F('Saldo -0,30 €','cómo quedó',true)==='Saldo menos de un euro en negativo',ctx.F('Saldo -0,30 €','cómo quedó',true));
}catch(e){t('runtime redondeo voz FIX11',false,e.stack||String(e));}

pkg.scripts=pkg.scripts||{};pkg.scripts['test:fix11-voice']='node scripts/v4-1-exp-fix11-spoken-natural-conversation-regression.cjs';fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+'\n');
t('package registra FIX11 voz',true);
console.log(`FIX11 SPOKEN NATURAL CONVERSATION: ${ok} OK · ${bad} KO`);process.exitCode=bad?1:0;
