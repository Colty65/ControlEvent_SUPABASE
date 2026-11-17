const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const ui=fs.readFileSync(path.join(root,'public/app/features/v11-3-zuzu-analitica-libre.js'),'utf8');
const idx=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const checks=[
 ['button exists',/id="ceAiMemoryAudit"/.test(ui)],
 ['audit function exists',/async function runMemoryAudit\(\)/.test(ui)],
 ['button bound in openModal',/var memBtn=\$\('ceAiMemoryAudit'\);if\(memBtn\)memBtn\.onclick=function\(ev\).*runMemoryAudit\(\)/s.test(ui)],
 ['endpoint called',/fetch\('\/api\/event-ai\/memory\/audit'/.test(ui)],
 ['cache bust FIX43',/v11-3-zuzu-analitica-libre\.js\?v=20260911-FIX43-P19-MEM-BUTTON/.test(idx)]
];
let ok=0;for(const [name,pass] of checks){console.log((pass?'OK ':'KO ')+name);if(pass)ok++;}
console.log(`P19 MEM button: ${ok}/${checks.length} OK`);if(ok!==checks.length)process.exit(1);
