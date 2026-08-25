const fs=require('fs'),vm=require('vm');
const svc=fs.readFileSync('services/event-ai.service.js','utf8');
let pass=0,fail=0;function t(name,ok){if(ok){console.log('OK · '+name);pass++;}else{console.error('KO · '+name);fail++;}}
const trim=v=>String(v==null?'':v).trim(),arr=v=>Array.isArray(v)?v:[],norm=v=>trim(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

t('ce_query expone people_mode compacto',/product_text:str,product_match:str,people_mode:str,people:list/.test(svc));
t('people_mode admite cinco significados estructurales',/attendance_full','attendees','non_attending_members','canonical_members','income/.test(svc));
t('contrato rechaza QUERY people sin people_mode',/QUERY people sin people_mode válido/.test(svc));
t('prompt separa asistencia canónica de filas administrativas',/ASISTENCIA CANÓNICA:[\s\S]{0,900}NO agrupes las filas administrativas/.test(svc));
t('asistentes + no asistentes caben en una sola query',/attendance_full[\s\S]{0,900}jamás emitas dos comandos/.test(svc));
t('socio canónico obliga a consultar criterio CE',/SOCIO CANÓNICO EN CONTROLEVENT:[\s\S]{0,500}canonical_members/.test(svc));
t('presentador prioriza personas físicas sobre row_count',/total_attendees_people[\s\S]{0,500}PERSONAS físicas/.test(svc));
t('facts de asistencia sobreviven a VIEW agrupada',/contextKeys=\[[^\]]*'total_attendees_people'[^\]]*'nonattending_members_people'/.test(svc));

// Ejecuta físicamente el nuevo materializador de asistencia con un fixture canónico.
const start=svc.indexOf('function v73ExpandCanonicalAttendanceList');
const end=svc.indexOf('async function v73ExecuteResolvedQuery',start);
let full=null,abs=null;
if(start>=0&&end>start){
  const code=svc.slice(start,end);
  const box={arr,trim,norm,Number,Date,
    v61Hash:x=>'h',
    v26TextSchema:()=>({}),v26CountSchema:()=>({}),v26Table:(key,title,rows)=>({key,title,rows}),
    zuzuTracePush:()=>{},
    v26ToolCanonicalSocios:async()=>({ok:true,name:'canonical_socios',facts:{canonical_records:20,people_count:33},tables:[{key:'socios',rows:[{'Socio canónico':'A y B'}]}]}),
    v73FrameFromQuery:q=>({domain:'people',scope:q.scope,filters:{}}),
    v70ResolveScope:()=>({kind:'named_event',eventNames:['FUNCION 2026']}),
    buildCanonicalAttendance:()=>({porEvento:[{
      sociosCensoPersonas:33,sociosAsistentesPersonas:3,noSociosAsistentesPersonas:1,totalAsistentesPersonas:4,sociosNoAsistentesPersonas:2,
      sociosAsistentes:[{nombre:'Colty y Esther',personas:2},{nombre:'Cito',personas:1}],
      noSociosAsistentes:[{nombre:'Invitado',personas:1}],sociosNoAsistentes:[{nombre:'Pocholo y Celes',personas:2}],criterio:'fixture'
    }]})
  };
  box.state={eventos:[{id:'e1',titulo:'FUNCION 2026'}]};
  vm.createContext(box);vm.runInContext(code+'\nthis.fn=v73CanonicalPeopleResult;',box);
  Promise.resolve().then(async()=>{
    full=await box.fn({people_mode:'attendance_full',scope:{kind:'named_event',event:'FUNCION 2026'}},box.state,'e1',[]);
    abs=await box.fn({people_mode:'non_attending_members',scope:{kind:'named_event',event:'FUNCION 2026'}},box.state,'e1',[]);
    const rows=full?.result?.tables?.find(x=>x.key==='attendance')?.rows||[];
    const arows=abs?.result?.tables?.find(x=>x.key==='attendance')?.rows||[];
    t('CE conserva total físico de asistentes = 4, no número de filas administrativas',full?.result?.facts?.total_attendees_people===4);
    t('pareja asistente se desglosa en personas cuando es seguro',rows.some(r=>r.Persona==='Colty'&&r.Personas===1)&&rows.some(r=>r.Persona==='Esther'&&r.Personas===1));
    t('attendance_full incorpora también socios no asistentes',rows.some(r=>r.Grupo==='SOCIO no asistente'&&r.Persona==='Pocholo')&&rows.some(r=>r.Persona==='Celes'));
    t('non_attending_members devuelve solo ausencias canónicas',arows.length===2&&arows.every(r=>r.Grupo==='SOCIO no asistente'));
    console.log(`\nRAW14I · ${pass}/${pass+fail} comprobaciones OK`);process.exit(fail?1:0);
  }).catch(e=>{console.error(e);process.exit(1);});
} else {console.error('KO · no se localizó bloque RAW14I');process.exit(1);}
