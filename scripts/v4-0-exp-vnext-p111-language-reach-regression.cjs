const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const lab=read('services/zuzu-test-lab.service.js');
const ui=read('public/app/features/zuzu-test-console-gd.js');
const routes=read('routes/zuzu-tests.routes.js');
const ai=read('services/event-ai.service.js');
const index=read('public/index.html');
let ko=0;function ok(cond,msg){if(cond)console.log('OK ',msg);else{console.error('KO ',msg);ko++;}}
ok(/BASIC:\{id:'BASIC',label:'BÁSICA',count:50/.test(lab),'Batería BÁSICA = 50');
ok(/MEDIUM:\{id:'MEDIUM',label:'MEDIA',count:60/.test(lab),'Batería MEDIA = 60');
ok(/HARD:\{id:'HARD',label:'DIFÍCIL',count:70/.test(lab),'Batería DIFÍCIL = 70');
ok(/EXTREME:\{id:'EXTREME',label:'EXTREMA',count:80/.test(lab),'Batería EXTREMA = 80');
ok(lab.includes('20 bloques de 3 turnos')&&lab.includes('14 bloques de 5 turnos')&&lab.includes('16 bloques de 5 turnos'),'Tamaños conversacionales 60/70/80 explícitos');
ok(lab.includes('export async function previewZuzuLanguageBattery'),'Servicio ITV expone preview de alcance');
ok(routes.includes("router.get('/zuzu-tests/language-battery'"),'Ruta GD para baterías de lenguaje');
for(const [level,count] of [['BASIC',50],['MEDIUM',60],['HARD',70],['EXTREME',80]])ok(ui.includes(`data-level="${level}"`)&&ui.includes(`${count}`),`ITV ofrece ${level} ${count}`);
ok(ui.includes("'/api/zuzu-tests/run-custom-case'")&&ui.includes("['excel','language']"),'Baterías de lenguaje recorren la misma tubería FULL-CERT');
ok(ui.includes('COBERTURA OK')&&ui.includes('expectedBand'),'ITV muestra cobertura y referencia de dificultad');
ok(ui.includes("$('ztMaxCases').value=String(count||100)")&&ui.includes('hardCapSuggested'),'ITV ajusta automáticamente nº de casos y presupuesto sugerido');
ok(index.includes('LANG260')&&index.includes('controlevent-itv-language-build'),'Cache-bust de ITV actualizado');
// NHC: el catálogo de frases de prueba NO puede contaminar el intérprete de producción.
ok(!ai.includes('LANGUAGE_REACH_PROFILES')&&!ai.includes('P111-LANGUAGE-REACH-260-NHC'),'NHC: ninguna regla de estas baterías entra en event-ai runtime');
ok(lab.includes('Estas baterías son DATOS DE PRUEBA, no reglas del runtime'),'NHC documentado junto al generador');
if(ko){console.error(`P1.11 LANGUAGE REACH: ${ko} KO`);process.exit(1);}console.log('P1.11 LANGUAGE REACH: OK · 4 baterías · 260 preguntas · NHC');
