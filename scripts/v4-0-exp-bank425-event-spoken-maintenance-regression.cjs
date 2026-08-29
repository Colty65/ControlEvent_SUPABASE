const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let okc=0, koc=0;
function check(name,cond){if(cond){okc++;console.log('OK ',name)}else{koc++;console.error('KO ',name)}}
const legacy=read('public/app/legacy/legacy-bundle-before-modules-v30.7.js');
const norm=read('lib/supabase-normalized.js');
const html=read('public/index.html');
check('DB -> estado normalizado conserva nombreHablado', /nombreHablado:\s*row\.nombre_hablado\s*\|\|\s*''/.test(norm));
check('mergeLoadedState conserva nombreHablado', /nombreHablado:\s*e\.nombreHablado\s*\|\|\s*e\.nombre_hablado/.test(legacy));
check('render EVENTOS pinta nombre hablado', /data-action="edit-evento-nombrehablado"/.test(legacy));
check('guardar EVENTOS recoge nombre hablado', /edit-evento-nombrehablado/.test(legacy) && /nombreHablado/.test(legacy));
check('alta EVENTOS conserva nombre hablado', /newEventoNombreHablado/.test(html));
check('cache bust BANK4_25 aplicado al bundle que contiene mergeLoadedState', /legacy-bundle-before-modules-v30\.7\.js\?v=20260829-BANK425-EVENT-SPOKEN-MAINT-PERSIST/.test(html));
console.log(`TOTAL ${okc+koc} · OK ${okc} · KO ${koc}`);
process.exitCode=koc?1:0;
