const fs=require('fs'),p=require('path');const root=p.resolve(__dirname,'..');
const lab=fs.readFileSync(p.join(root,'services/zuzu-test-lab.service.js'),'utf8');
const ui=fs.readFileSync(p.join(root,'public/app/features/zuzu-test-console-gd.js'),'utf8');
const ver=fs.readFileSync(p.join(root,'public/app/version.js'),'utf8');
let ok=0,ko=0;function t(n,c){if(c){console.log('OK ',n);ok++;}else{console.log('KO ',n);ko++;}}
t('version v6.0.4',/VERSION = 'v6\.0\.4_exp'/.test(ver));
t('semantic oracle metadata',lab.includes("semanticOracle:'SOVEREIGN30-V6-SEMANTIC-1'"));
t('reject empty continue',lab.includes('«continúa» fue aceptado verbalmente pero no continuó el contenido'));
t('reject forgotten thread',lab.includes('«vuelve a lo anterior» no recuperó el hilo previo'));
t('reject empty visual',lab.includes('gráfica materializada sin datos útiles'));
t('identity Zuzu',lab.includes('debe presentarse como Zuzu/ControlEvent'));
t('actor denial',lab.includes('negó identidad del actor'));
t('time from timestamp',lab.includes('no respondió la hora desde meta.timestamp'));
t('date from timestamp',lab.includes('no respondió la fecha desde meta.timestamp'));
t('summary must deliver',lab.includes('anunció un resumen pero no entregó un resumen ejecutivo'));
t('story must deliver',lab.includes('pidió un relato y recibió una introducción/promesa'));
t('itv contract v6',ui.includes('const ITV_CONTRACT_VERSION=6;'));
t('itv semantic build',ui.includes("20260911-V604-SEMANTIC-ORACLE-V1"));
console.log(`\nv6.0.4 semantic oracle: ${ok} OK · ${ko} KO`);process.exitCode=ko?1:0;
