import fs from 'node:fs';
const s=fs.readFileSync(new URL('../services/event-ai.service.js',import.meta.url),'utf8');
const tests=[
 ['EUR para importes',/importes monetarios[\s\S]*SIEMPRE en euros/.test(s)],
 ['Unidades no son euros',/Las cantidades físicas NO son euros[\s\S]*«unidades»/.test(s)],
 ['Voz dice euros',/al hablar di «mil novecientos veinticuatro euros»/.test(s)],
 ['No inventar unidad',/NO inventes una unidad/.test(s)],
 ['Contrato semántico al redactor',/measurement_semantics:\{currency:'EUR/.test(s)]
];
let bad=0; for(const [n,ok] of tests){console.log((ok?'OK':'KO')+' - '+n); if(!ok)bad++;}
if(bad)process.exit(1); console.log('ZUZU RAW8 MEASUREMENTS: OK');
