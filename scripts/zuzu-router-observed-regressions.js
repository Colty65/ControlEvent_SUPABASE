import {applyZuzuRouterGuardrails} from '../services/zuzu-router-shadow.service.js';

function decision(route,subject='',event='',operation='LIST',mode='CONVERSATION'){
  return {mode,route,subject:{type:subject?(subject.startsWith('SySA')?'EVENT':'PERSON'):'NONE',value:subject,source:subject?'INHERITED':'NONE'},event:{scope:event?'INHERITED':'UNRESOLVED',value:event,source:event?'INHERITED':'NONE'},operation,filters:{exact_subject:false,purchase_status:'NA',ticket:'',store:'',donor:''},inheritance:{subject:!!subject,event:!!event,route:true,topic:true},confidence:.9,reason:'test'};
}
function run(name,d,input,expect){
  const got=applyZuzuRouterGuardrails(structuredClone(d),input);
  const actual={route:got.route,subject:got.subject?.value||'',event:got.event?.value||'',operation:got.operation};
  const ok=Object.entries(expect).every(([k,v])=>actual[k]===v);
  console.log(`${ok?'OK':'KO'} ${name}:`,actual);
  if(!ok){console.error(' esperado:',expect);process.exitCode=1;}
}

run('Ahora solo SySA conserva Colty',decision('PERSON_PURCHASES','SySA','SySA 2026'),{message:'Ahora solo SySA',screen_event:{title:'SySA 2026'},prior_turns:[{user:'No, me refería a 2026',assistant_tail:'Compras de Colty en varios eventos de 2026',prior_subject:'Colty',prior_event:'',result_subject:'Colty',result_event:''},{user:'Pues solo este año',assistant_tail:'SySA 2026: compras de Colty',prior_subject:'Colty',prior_event:'SySA 2026',result_subject:'Colty',result_event:'SySA 2026'}]}, {route:'PERSON_PURCHASES',subject:'Colty',event:'SySA 2026',operation:'LIST'});

run('Año suelto hereda SySA 2026',decision('PERSON_PURCHASES','Colty','2026'),{message:'Dame solo los tickets de 2026',screen_event:{title:'SySA 2026'},prior_turns:[{user:'¿Y en SySA 2025?',assistant_tail:'Compras de Colty en SySA 2025',prior_subject:'Colty',prior_event:'SySA 2025',result_subject:'Colty',result_event:'SySA 2025'},{user:'Compara los dos años',assistant_tail:'SySA 2025 frente a SySA 2026',prior_subject:'Colty',prior_event:'SySA 2026',result_subject:'Colty',result_event:'SySA 2026'}]}, {route:'PERSON_PURCHASES',subject:'Colty',event:'SySA 2026',operation:'LIST'});

run('Evento imposible igual a persona se elimina',decision('PERSON_MANAGEMENT','Colty','Colty'),{message:'¿Qué tareas tiene pendientes?',screen_event:{title:'SySA 2026'},prior_turns:[{user:'Volvamos a Colty',assistant_tail:'Datos de Colty',prior_subject:'Colty',prior_event:'',result_subject:'Colty',result_event:''}]}, {route:'PERSON_MANAGEMENT',subject:'Colty',event:'',operation:'LIST'});

run('Comparación económica usa COMPARE_EVENTS',decision('EVENTS_ANALYSIS','', 'SySA 2025, SySA 2026','COMPARE'),{message:'Entonces, ¿cuál fue económicamente mejor?',screen_event:{title:'SySA 2026'},prior_turns:[]}, {route:'COMPARE_EVENTS',subject:'',event:'SySA 2025, SySA 2026',operation:'COMPARE'});

run('Ranking de tiendas usa EVENT_BREAKDOWN',{...decision('STORE_PURCHASES','', 'SySA 2026','RANKING','TRANSACTIONAL'),subject:{type:'NONE',value:'',source:'NONE'}},{message:'¿Qué tienda concentra más compras?',screen_event:{title:'SySA 2026'},prior_turns:[]}, {route:'EVENT_BREAKDOWN',subject:'',event:'SySA 2026',operation:'RANKING'});

run('Frase ajena al dominio corta herencia',decision('PERSON_PURCHASES','Colty','SySA 2025','LIST'),{message:'toma paloma pastillas de goma',screen_event:{title:'SySA 2026'},prior_turns:[{user:'Incluye también los compartidos',assistant_tail:'Actividad de Esther',prior_subject:'Esther',prior_event:'SySA 2025',result_subject:'Esther',result_event:''}]}, {route:'UNKNOWN',subject:'',event:'',operation:'OTHER'});

run('Filtro compartidos mantiene Esther',decision('PERSON_PURCHASES','Colty','SySA 2025','LIST'),{message:'Incluye también los compartidos',screen_event:{title:'SySA 2026'},prior_turns:[{user:'Solo los directos',assistant_tail:'Basándome en el dossier personal de Esther. Compras bajo responsabilidad directa: Esther es responsable de 268,17 €.',prior_subject:'Colty',prior_event:'SySA 2025',result_subject:'',result_event:''}]}, {route:'PERSON_PURCHASES',subject:'Esther',event:'SySA 2025',operation:'LIST'});
