const fs=require('fs');
const path=require('path');
const f=path.join(__dirname,'..','services','event-ai.service.js');
const s=fs.readFileSync(f,'utf8');
const a=s.indexOf("const V6_ONTOLOGY_VERSION='CE-ONTOLOGY-6_1-exp'");
const b=s.indexOf('export async function runZuzuVNextUserTurn',a);
if(a<0||b<0) throw new Error('No se pudo aislar el runtime v6_1 activo');
const active=s.slice(a,b+8000);
const banned=[
  ['frase concreta al revés','«al revés»'],
  ['lista de cálculos concretos','ROI, ratio, porcentaje, suma, diferencia'],
  ['branch frase exacta','si dice «'],
  ['regex semántica sobre prompt','userPrompt).test'],
];
let bad=[];
for(const [name,needle] of banned) if(active.includes(needle)) bad.push(name+': '+needle);
// El runtime v6 puede parsear fechas mecánicamente, pero no debe clasificar intención con regex sobre el prompt.
const semanticRegex=/\/\\b[^\n]{0,180}\/i?\.test\((?:userPrompt|prompt|p)\)/g;
const matches=[...active.matchAll(semanticRegex)].map(m=>m[0]);
if(matches.length) bad.push('regex semántica en runtime v6: '+matches.slice(0,3).join(' | '));
if(bad.length){console.error('KO NO-HARDCODE\n'+bad.join('\n'));process.exit(1);} 
console.log('OK NO-HARDCODE runtime v6_1 activo: sin frases concretas ni regex de intención.');
