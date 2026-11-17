const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..'); let ok=0,ko=0;
function t(n,c){if(c){console.log('OK ',n);ok++}else{console.error('KO ',n);ko++}}
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const zuzu=read('public/app/features/v11-3-zuzu-analitica-libre.js');
const resp=read('public/app/features/v4-1-exp-responsables-pdf.js');
const liq=read('public/app/features/v4-1-exp-liquidaciones-compras.js');
const appfix=read('public/app/features/v10-5-app-fixes.js');
const ver=read('public/app/version.js');
const pkg=JSON.parse(read('package.json'));
t('PDF Zuzu respuesta usa v6.0.9',zuzu.includes('ControlEvent_v6_1-exp-responde_Zuzu_a_'));
t('PDF Zuzu conversación usa v6.0.9',zuzu.includes('ControlEvent_v6_1-exp-conversacion_Zuzu-'));
t('PDF responsables usa v6.0.9',resp.includes('ControlEvent_v6_1-exp-')&&resp.includes('ControlEvent v6_1-exp ·'));
t('PDF liquidaciones visible v6.0.9',liq.includes('ControlEvent v6_1-exp ·'));
t('normalizador descargas activo v6.0.9',appfix.includes("VERSION_FILE='ControlEvent_v6_1-exp'"));
t('version central v6.0.9',ver.includes("VERSION = 'v6_1-exp'")&&ver.includes("VERSION_FILE = 'ControlEvent_v6_1-exp'"));
t('package 6.0.9',pkg.version==='6.0.10-exp.0');
for(const [name,src] of [['zuzu',zuzu],['responsables',resp],['liquidaciones',liq],['appfix',appfix]]) t(name+' sin prefijo externo v5.1',!/(?:download|filename|title|return|VERSION_FILE)[^\n]{0,160}ControlEvent_v5\.1_exp/i.test(src));
console.log(`\nEXTERNAL VERSION v6.0.9: ${ok} OK · ${ko} KO`);process.exitCode=ko?1:0;
