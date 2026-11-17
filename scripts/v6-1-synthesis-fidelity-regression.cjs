const fs=require('fs');
const p='/mnt/data/v61final/services/event-ai.service.js';
const s=fs.readFileSync(p,'utf8');
const checks=[
 ['CERTIFIED_DATASET wrapper',/status:'CERTIFIED_DATASET'/],
 ['exact scalar fidelity metadata',/scalar_fidelity:'EXACT'/],
 ['exact row sequence metadata',/row_sequence_fidelity:'EXACT'/],
 ['synthesis immutable rows instruction',/sus rows son INMUTABLES/],
 ['no date reformat instruction',/21\/08\/2026 debe seguir siendo 21\/08\/2026/],
 ['sort remains available',/NONE\/FETCH\/FILTER\/SORT_LIMIT\/VISUALIZE => supported=true/],
 ['unsupported remain blocked',/JOIN\/AGGREGATE\/DERIVE => supported=false y NO_ACTION_REQUIRED/],
 ['synthesis output budget unchanged',/maxOutputTokens:isSynthesis\?1000:1200/],
];
let ok=0;
for(const [n,r] of checks){const pass=r.test(s); console.log(`${pass?'OK':'KO'} ${n}`); if(pass)ok++;}
console.log(`TOTAL ${ok}/${checks.length}`); process.exit(ok===checks.length?0:1);
