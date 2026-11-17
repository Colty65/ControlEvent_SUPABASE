const fs=require('fs');
const files=[
 'public/app/features/v11-3-zuzu-analitica-libre.js',
 'public/app/legacy/legacy-bundle-before-modules-v30.7.js',
 'public/modules/excel/backup.js',
 'public/index.html',
 'services/event-ai.service.js',
 'package.json'
];
let ok=0,ko=0;
for(const f of files){const s=fs.readFileSync(f,'utf8'); const bad=/ControlEvent_v5\.1_exp|ControlEvent v5\.1_exp/.test(s) && !/\.css$/.test(f); if(bad){console.log('KO',f,'contiene prefijo externo v5.1');ko++;}else{console.log('OK',f);ok++;}}
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
if(pkg.version==='6.0.10-exp.0'){console.log('OK package 6.0.10');ok++;}else{console.log('KO package',pkg.version);ko++;}
const svc=fs.readFileSync('services/event-ai.service.js','utf8');
for(const [n,re] of [['meta 6.0.10',/version:'v6\.0\.10_exp'/],['provider conversation',/zuzu-v6\.0\.10-conversation-first/]]){if(re.test(svc)){console.log('OK',n);ok++;}else{console.log('KO',n);ko++;}}
console.log(`RESULT ${ok} OK · ${ko} KO`);process.exit(ko?1:0);
