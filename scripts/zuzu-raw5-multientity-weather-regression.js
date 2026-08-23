import fs from 'node:fs';
const src=fs.readFileSync('services/event-ai.service.js','utf8');
const tests=[
  ['contrato plural products',/products:productList/],
  ['contrato plural people',/people:stringList/],
  ['contrato plural responsibles',/responsibles:stringList/],
  ['contrato plural donors',/donors:stringList/],
  ['contrato plural stores',/stores:stringList/],
  ['contrato plural tickets',/tickets:stringList/],
  ['un solo registro multientidad',/MULTIENTIDAD NATIVA:[\s\S]*NO emitas varios zuzu_turn_record[\s\S]*DATASET conjunto/],
  ['filtro ANY-OF multientidad',/spec\.values\.some\(w=>/],
  ['dossier multi persona',/function v73ExecuteMultiPersonDossier[\s\S]*summary_by_person/],
  ['meteorología Open-Meteo declarada',/METEOROLOGÍA: ControlEvent dispone de Open-Meteo/],
  ['meteorología como suplemento compuesto',/query\.supplements=\[\{domain:'weather',scope:\.\.\.\}\]/],
  ['ejecutor suplemento weather',/function v73ExecuteSupplement[\s\S]*event_weather/],
  ['gráfica meteorológica de líneas',/function v73WeatherChartFromResult[\s\S]*type:'line'/],
  ['CURRENT máxima prioridad',/ANTECEDENTE INMEDIATO = MÁXIMA PRIORIDAD/],
  ['salida final estructurada',/name:'zuzu_final_presentation'/],
  ['presentación fuerza function call',/tools:\[finalTool\][\s\S]*zuzu_final_presentation/],
  ['RAW5 identificado',/RAW5 · MULTIENTIDAD \+ METEO \+ PRESENTACIÓN DUAL/]
];
let ko=0;
for(const [name,re] of tests){if(re.test(src)) console.log('OK · '+name); else {ko++; console.error('KO · '+name);}}
if(ko){console.error(`RAW5 REGRESSION: ${ko} KO`);process.exit(1);}console.log('RAW5 REGRESSION: OK');
