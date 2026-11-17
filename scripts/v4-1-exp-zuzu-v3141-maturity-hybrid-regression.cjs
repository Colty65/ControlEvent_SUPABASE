const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const svc=fs.readFileSync(path.join(root,'services/zuzu-test-lab.service.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'public/app/features/zuzu-test-console-gd.js'),'utf8');
let ok=0,ko=0;
function t(name,cond){if(cond){ok++;console.log('OK ',name)}else{ko++;console.log('KO ',name)}}

t('perfil MADUREZ 24 híbrido',/MATURITY:\{id:'MATURITY',label:'MADUREZ · 24',count:24/.test(svc));
t('14 dirigidos + 10 exploratorios declarados',/directedTurns:maturity\?14:0,exploratoryTurns:maturity\?10:0/.test(svc));
t('constructor híbrido existe',/function buildMaturityHybridCases\(/.test(svc));
t('selección dirigida de 14 turnos',/const picked=\[0,1,2,3,4,5,7,8,9,12,13,14,22,23\]/.test(svc));
t('exploración contiene 10 turnos',/for\(let i=1;i<=10;i\+\+\)exploratory\.push/.test(svc));
t('exploración no usa checklist',/No tienes una lista de pruebas que completar ni un orden de temas/.test(svc));
t('exploración se deja llevar por respuesta',/déjate llevar EXCLUSIVAMENTE por lo que Zuzu vaya respondiendo y mostrando/.test(svc));
t('pregunta 2+ no está prefijada',/mensaje NO prefijado: lo genera el usuario sintético leyendo la respuesta anterior/.test(svc));
t('MATURITY usa semilla variable',/normalizedSeed=\['GOLDEN','GOLDEN_DIALOGUE','STRESS'\]\.includes\(normalizedLevel\)/.test(svc)&&!/\['GOLDEN','GOLDEN_DIALOGUE','STRESS','MATURITY'\]/.test(svc));
t('casos MADUREZ pasan por VOZ',/scenario:'ITV MADUREZ CONVERSACION LIBRE'.*voice:true/s.test(svc));
t('manifest conserva flag voice',/engine:trim\(c\?\.engine\).*voice:c\?\.voice===true/s.test(svc));
t('replay conserva flag voice',/engine:trim\(raw\?\.engine\).*voice:raw\?\.voice===true/s.test(svc));
t('adaptativo ejecuta usuario sintético posterior',/if\(adaptive&&turnNo>1\).*generateZuzuItvDialogueUserTurn/s.test(svc));
t('evaluación libre vigila voz',/p314MaturityVoiceReasons\(result,c\.prompt\)/.test(svc));
t('nota 0-30 suma exactamente 30',/weights=\{reliability:7,context:6,depth:5,recovery:4,voice:4,exploration:4\}/.test(ui));
t('UI muestra MADUREZ 0-30',/MADUREZ \$\{maturity\.score\.toFixed\(1\)\}\/30/.test(ui));
t('UI muestra desglose de dimensiones',/Fiabilidad .* contexto .* detalle .* recuperación .* voz .* conversación libre/.test(ui));
t('JSON LIGHT guarda maturityScore',/maturityScore:maturityScore\(c\.rows\)/.test(ui));
t('JSON FULL guarda maturityScore',/maturityScore:maturityScore\(modeCache\[mode\]\.rows\|\|\[\]\)/.test(ui));
t('botón MADUREZ visible',/data-level="MATURITY"><b>MADUREZ · 24<\/b>/.test(ui));
t('botón explica 14+10',/14 controles \+ 10 turnos libres generados según lo que Zuzu vaya respondiendo/.test(ui));

console.log(`\nMADUREZ HÍBRIDA V3.14.1: ${ok} OK · ${ko} KO`);
process.exit(ko?1:0);
