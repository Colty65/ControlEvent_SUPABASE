import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'..');
const ui=fs.readFileSync(path.join(root,'public/app/features/zuzu-test-console-gd.js'),'utf8');
const index=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const svc=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8');
const tests=[];function c(n,v){tests.push([n,!!v]);console.log(`${v?'OK':'KO'} ${n}`);}
c('Excel conserva oracle estructural en cases',/mode:'FULL-CERT',oracle:x\.oracle/.test(ui));
c('Replay contract Excel v4',/replayContractVersion:ITV_CONTRACT_VERSION/.test(ui)&&/const ITV_CONTRACT_VERSION=4;/.test(ui));
c('Nombre ITV usa prefijo runtime normalizado',/a\.download=`\$\{itvFilePrefix\(\)\}_ITV_Zuzu_/.test(ui));
c('Normalizador colapsa _exp repetidos',/replace\(\/\(\?:_exp\)\{2,\}\/ig,'_exp'\)/.test(ui));
c('JSON exportado firma contrato y build ITV',/itvContractVersion:ITV_CONTRACT_VERSION,itvBuild:ITV_BUILD/.test(ui));
c('Index fuerza carga de la build ITV4 actual',/zuzu-test-console-gd\.js\?v=20260823-ITV4-CERT1/.test(index)&&/controlevent-itv-build\" content=\"20260823-ITV4-CERT1/.test(index));
c('Gemini recibe regla contexto candidatos no filtros',/CONTEXTO = CANDIDATOS, NO FILTROS/.test(svc));
c('Gemini recibe regla respuesta por forma interrogativa',/TIPO DE RESPUESTA: la forma interrogativa manda/.test(svc));
c('Compare person tiene ejecutor tipado',/function v73ExecuteResolvedQuery[\s\S]*comparison[\s\S]*Comparativa de personas/.test(svc));
c('Comparison capability contiene Persona y Aportación vinculada',/comparison:\{roles:\{person:\['Persona'\]/.test(svc)&&/Aportación vinculada/.test(svc));
const ko=tests.filter(([,v])=>!v);if(ko.length){console.error(`ZUZU ITV CONTRACT: ${ko.length} KO`);process.exit(1);}console.log('ZUZU ITV CONTRACT: OK');
