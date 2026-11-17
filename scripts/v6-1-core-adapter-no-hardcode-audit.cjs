const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const core=fs.readFileSync(path.join(root,'services/zuzu-v6-core.service.js'),'utf8');
const ai=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8');
const start=ai.indexOf('// ControlEvent v6_1-exp · CLEAN CANONICAL COGNITIVE COMPILER');
const end=ai.indexOf('function vnextP125ExtractDialogueJson',start);
const active=ai.slice(start,end>start?end:undefined);
const forbiddenCore=[
  /\bSySA\b/i,/FUNCION\s+2026/i,/Pocholo/i,/Carmelo/i,/Juan Carlos/i,
  /eventos?\s+finalizados?/i,/compras?\s+pendientes?/i,/\bal\s+rev[eé]s\b/i,
  /si\s+(?:el\s+usuario\s+)?dice\s+[«"']/i,/si\s+pregunta\s+por/i
];
const forbiddenRuntimePhrases=[/\bal\s+rev[eé]s\b/i,/Pocholo/i,/Carmelo/i,/Juan Carlos/i,/FUNCION\s+2026/i,/SySA\s+2026/i];
let fails=[];
for(const r of forbiddenCore) if(r.test(core)) fails.push(`CORE contiene patrón de dominio/lingüístico: ${r}`);
for(const r of forbiddenRuntimePhrases) if(r.test(active)) fails.push(`Ruta v6 activa contiene frase/caso concreto: ${r}`);
if(!/buildV6GenericSystemPrompt\(CONTROL_EVENT_V6_DOMAIN_MANIFEST\)/.test(active)) fails.push('La ruta activa no usa el core genérico + manifest.');
if(!/domain_manifest:v6Ontology\(\)/.test(active)) fails.push('El Context Packet no expone domain_manifest.');
if(!/buildV6DecisionSchema\(CONTROL_EVENT_V6_DOMAIN_MANIFEST\)/.test(active)) fails.push('El contrato no se genera desde el manifest.');
if(fails.length){console.error('NO-HARDCODE AUDIT: KO');fails.forEach(x=>console.error(' - '+x));process.exit(1);} 
console.log('NO-HARDCODE AUDIT: OK');
console.log(' - Core genérico sin nombres/casos de ControlEvent.');
console.log(' - Ontología/capacidades llegan por domain manifest.');
console.log(' - Sin frases concretas en la ruta v6 activa.');
