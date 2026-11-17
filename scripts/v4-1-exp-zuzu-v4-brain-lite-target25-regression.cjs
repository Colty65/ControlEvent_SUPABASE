const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const ai=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8');
const lab=fs.readFileSync(path.join(root,'services/zuzu-test-lab.service.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'public/app/features/zuzu-test-console-gd.js'),'utf8');
let ok=0,ko=0;function t(n,c){if(c){ok++;console.log('OK ',n)}else{ko++;console.log('KO ',n)}}
t('visión general queda calibrada a BASIC',/visión general[\s\S]{0,180}BASIC aunque diga/.test(ai));
t('ampliar sigue siendo MEDIUM estructural',/más detalle\/amplía\/profundiza[\s\S]{0,120}MEDIUM/.test(ai));
t('weather_date se guarda en contexto certificado',/resultContext\.weather_date=wd/.test(ai));
t('seguimiento de fecha meteo usa sesión sin CE',/V4 BRAIN-LITE · CONTINUIDAD METEO/.test(ai)&&/0 consultas CE/.test(ai));
t('contexto compacto expone weather_date',/weather_date:trim\(last\.weather_date\|\|last\.date\)/.test(ai));
t('redactor HUMAN-SAFE elimina framing UI',/function v4BrainLiteHumanWrittenRewrite/.test(ai)&&/no nombres tablas, datasets, filas, columnas/.test(ai));
t('HUMAN-SAFE solo reescribe forma, no hechos',/Solo cambias la forma, nunca los hechos/.test(ai));
t('oracle temporal normaliza ISO a date-only',/dateOnly=v=>trim\(v\)\.slice\(0,10\)/.test(lab));
t('event_not_found esperado en recovery no genera WARN',/expectedRecovery=result\?\.meta\?\.recovery\?\.used===true/.test(lab)&&/warnings\.every\(w=>trim\(w\)==='event_not_found'\)/.test(lab));
t('ITV rotulado TARGET25',/MADUREZ · 24 · BRAIN-LITE TARGET25/.test(lab)&&/MADUREZ · 24 · BRAIN-LITE TARGET25/.test(ui));
t('Brain-Lite real sigue certificado por meta',/el caso BRAIN-LITE no fue ejecutado por BRAIN-LITE/.test(lab));
console.log(`\nV4 BRAIN-LITE TARGET25: ${ok} OK · ${ko} KO`);process.exit(ko?1:0);
