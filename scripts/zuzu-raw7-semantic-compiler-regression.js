import fs from 'node:fs';
const src=fs.readFileSync('services/event-ai.service.js','utf8');
const tests=[
 ['Top-K tipado compacto 3/tipo',/function v74EntityCandidatePacket[\s\S]*PERSON:v74TypedCandidateList\([^\n]*,3\)[\s\S]*EVENT:v74TypedCandidateList\([^\n]*,3\)[\s\S]*STORE:v74TypedCandidateList\([^\n]*,3\)[\s\S]*PRODUCT:v74TypedCandidateList\([^\n]*,3\)/],
 ['candidatos llevan tipo/id/nombre/evidencia',/out\.push\(\{id:trim\(x\?\.id\),canonical_name:canonical,matched_text:matched,match_type:kind,score\}\)[\s\S]*flat\.push\(\{type,\.\.\.x\}\)/],
 ['WEAK no se reinyecta',/filter\(x=>\['exact','strong','fuzzy'\]\.includes/],
 ['evidencia por tipo',/function v74TypedCandidateEvidence[\s\S]*exact_mentions[\s\S]*strong_mentions[\s\S]*fuzzy_mentions/],
 ['tipo antes que candidato',/Decide primero PERSON\/EVENT\/STORE\/PRODUCT\/TICKET según significado/],
 ['candidatos son ayuda no activadores',/Los candidatos son ayuda, no activadores/],
 ['multientidad usa plurales en un comando',/Varias entidades homogéneas van en arrays plurales dentro del MISMO comando/],
 ['usuario conocido es PERSONA',/usuario logado[\s\S]*es PERSONA/],
 ['aclaración solo mismo tipo',/dos o más alternativas DEL MISMO TIPO/],
 ['input incluye CURRENT_CONTEXT y candidatos',/CURRENT_CONTEXT:\\n[\s\S]*CANDIDATES:\\n/],
 ['ledger usa packet tipado',/const entityCandidates=v74EntityCandidatePacket\(state,userPrompt\)/],
 ['traza candidatos tipados RAW11',/CANDIDATOS TIPADOS RAW11/],
 ['arquitectura RAW11',/RAW11 · CONTRATO GEMINI↔CE CERRADO/]
];
let ko=0;for(const [n,re] of tests){if(re.test(src))console.log('OK · '+n);else{ko++;console.error('KO · '+n)}}if(ko){console.error(`SEMANTIC COMPILER REGRESSION: ${ko} KO`);process.exit(1)}console.log('SEMANTIC COMPILER REGRESSION: OK');
