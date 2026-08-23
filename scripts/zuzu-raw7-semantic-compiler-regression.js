import fs from 'node:fs';
const src=fs.readFileSync('services/event-ai.service.js','utf8');
const tests=[
 ['Top-K tipado compacto',/function v74EntityCandidatePacket[\s\S]*PERSON:v74TypedCandidateList[\s\S]*EVENT:v74TypedCandidateList[\s\S]*STORE:v74TypedCandidateList[\s\S]*PRODUCT:v74TypedCandidateList/],
 ['candidatos sin IDs expuestos',/out\.push\(\{canonical,matched,match:trim\(x\?\.match_kind\)/],
 ['evidencia por tipo',/function v74TypedCandidateEvidence[\s\S]*exact_mentions[\s\S]*strong_mentions[\s\S]*fuzzy_mentions/],
 ['tipo antes que candidato',/Decide primero el TIPO\/ROL[\s\S]*Los candidatos NO deciden el tipo/],
 ['solo candidatos del tipo elegido',/mira SOLO los candidatos de ese tipo/],
 ['multientidad conserva todas',/conserva TODAS en el array plural correspondiente/],
 ['contexto no cambia tipos',/Nunca convierte una PERSON en EVENT, STORE o PRODUCT/],
 ['usuario conocido es persona',/KNOWN_IDENTITIES\.logged_user es siempre una identidad de tipo PERSON/],
 ['aclaración solo mismo tipo',/clarify únicamente[\s\S]*DEL MISMO TIPO/],
 ['candidate_refs solo historial',/candidate_refs se reserva para referencias T\/H\/P de historial/],
 ['input incluye identidad y evento ambiente',/const known=\{logged_user:[\s\S]*ambient_only:true[\s\S]*KNOWN_IDENTITIES:/],
 ['ledger usa packet RAW7',/const entityCandidates=v74EntityCandidatePacket\(state,userPrompt\)/],
 ['traza candidatos tipados',/CANDIDATOS TIPADOS RAW7/],
 ['arquitectura RAW7',/RAW7 · COMPILADOR SEMÁNTICO TIPADO/]
];
let ko=0;for(const [n,re] of tests){if(re.test(src))console.log('OK · '+n);else{ko++;console.error('KO · '+n)}}
if(ko){console.error(`RAW7 REGRESSION: ${ko} KO`);process.exit(1)}console.log('RAW7 REGRESSION: OK');
