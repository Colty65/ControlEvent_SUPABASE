const fs=require('fs');const s=fs.readFileSync('public/app/features/zuzu-test-console-gd.js','utf8');const html=fs.readFileSync('public/index.html','utf8');let n=0,f=0;function t(name,ok){n++;if(!ok){f++;console.error('KO',name)}else console.log('OK',name)}
t('epoch de carga existe',/batteryLoadEpoch=0/.test(s));
t('selección de lenguaje invalida cargas previas',/const lvl=trim\(level\)\.toUpperCase\(\),epoch=\+\+batteryLoadEpoch;requestedLanguageLevel=lvl/.test(s));
t('preview autogenerado invalida carga previa',/const epoch=\+\+batteryLoadEpoch;requestedLanguageLevel='';/.test(s));
t('respuesta preview obsoleta no pisa selección',/if\(epoch!==batteryLoadEpoch\|\|requestedLanguageLevel\)return;preview=data/.test(s));
t('respuesta language obsoleta no pisa selección',/if\(epoch!==batteryLoadEpoch\|\|requestedLanguageLevel!==lvl\)return;/.test(s));
t('preflight exige source language',/preview\?\.source==='language'&&batterySource==='language'/.test(s));
t('preflight exige 100% casos VNEXT',/langCases\.every\(c=>trim\(c\?\.engine\)\.toUpperCase\(\)==='VNEXT'\)/.test(s));
t('preflight bloquea en vez de caer a 78 legacy',/SEGURIDAD ITV: la batería de lenguaje no está íntegra/.test(s));
t('cache-bust P1.13 impide servir JS anterior',/zuzu-test-console-gd\.js\?v=20260830-VNEXT-P113-ITV-LANGUAGE-RACE-GUARD-LANG260/.test(html));
console.log(`${n-f}/${n} OK`);process.exit(f?1:0);
