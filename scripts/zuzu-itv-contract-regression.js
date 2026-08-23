import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'..');
const ui=fs.readFileSync(path.join(root,'public/app/features/zuzu-test-console-gd.js'),'utf8');
const svc=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8');
const tests=[];function c(n,v){tests.push([n,!!v]);console.log(`${v?'OK':'KO'} ${n}`);}
c('Excel conserva oracle estructural en cases',/mode:'FULL-CERT',oracle:x\.oracle/.test(ui));
c('Replay contract Excel v4',/replayContractVersion:4/.test(ui));
c('Nombre ITV usa prefijo runtime normalizado',/a\.download=`\$\{itvFilePrefix\(\)\}_ITV_Zuzu_/.test(ui));
c('Normalizador colapsa _exp repetidos',/replace\(\/\(\?:_exp\)\{2,\}\/ig,'_exp'\)/.test(ui));
c('Gemini recibe regla contexto candidatos no filtros',/CONTEXTO = CANDIDATOS, NO FILTROS/.test(svc));
c('Gemini recibe regla respuesta por forma interrogativa',/TIPO DE RESPUESTA: la forma interrogativa manda/.test(svc));
c('Compare person tiene ejecutor tipado',/function v73ExecuteResolvedQuery[\s\S]*comparison[\s\S]*Comparativa de personas/.test(svc));
c('Comparison capability contiene Persona y Aportación vinculada',/comparison:\{roles:\{person:\['Persona'\]/.test(svc)&&/Aportación vinculada/.test(svc));
const ko=tests.filter(([,v])=>!v);if(ko.length){console.error(`ZUZU ITV CONTRACT: ${ko.length} KO`);process.exit(1);}console.log('ZUZU ITV CONTRACT: OK');
