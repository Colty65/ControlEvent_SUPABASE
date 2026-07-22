import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { analyzeZuzuReportRequest, ZUZU_REPORT_CORE_MODULES } from '../services/zuzu-report-policy.service.js';
import { buildCanonicalAttendance, canonicalAttendanceFromContext } from '../services/zuzu-attendance.service.js';
import { buildRelevantPeopleContext, peopleProfileCount } from '../services/zuzu-people-context.service.js';
import { __zuzuStructuralTesting } from '../services/event-ai.service.js';

function testPolicy(){
  const detailed=analyzeZuzuReportRequest('Curra un poquito Zuzu, dame detalles de todo tipo de este evento y el tiempo del viernes al domingo');
  ZUZU_REPORT_CORE_MODULES.forEach(m=>assert.ok(detailed.modules.includes(m),`Falta ${m} en detalles generales`));
  assert.ok(detailed.modules.includes('METEO'));
  assert.equal(detailed.detailLevel,'detailed');
  const executive=analyzeZuzuReportRequest('dame un informe ejecutivo de 1 pag con semáforos y el tiempo');
  ZUZU_REPORT_CORE_MODULES.forEach(m=>assert.ok(executive.modules.includes(m),`Falta ${m} en ejecutivo`));
  assert.equal(executive.onePage,true);
  const narrow=analyzeZuzuReportRequest('solo ingresos del evento activo');
  assert.ok(narrow.modules.includes('INGRESOS'));
  assert.equal(narrow.includeAllCore,false);
  assert.equal(narrow.modules.includes('DOCUMENTOS'),false);
}

function testAttendance(){
  const eventId='E1';
  const people=[]; const collaborators=[];
  const add=(id,nombre,rango='SOCIO')=>people.push({id,nombre,rango});
  const income=(personaId,numero,situacion='BANCO')=>collaborators.push({eventId,personaId,numero,situacion});
  // 9 parejas confirmadas = 18 socios.
  for(let i=1;i<=9;i++){ const id=`P${i}`; add(id,`Socio${i}A y Socio${i}B`); income(id,2); }
  // 3 socios individuales confirmados = 3. Total socios asistentes = 21.
  for(let i=1;i<=3;i++){ const id=`S${i}`; add(id,`Individual ${i}`); income(id,1); }
  // Esta pareja existe pero numero=0 y PENDIENTE: no asiste.
  add('PEND','Pocholo y Celes'); income('PEND',0,'PENDIENTE');
  // 2 no socios asistentes.
  add('N1','Invitado Uno','NO SOCIO'); income('N1',1);
  add('N2','Invitado Dos','NO SOCIO'); income('N2',1);
  const state={eventos:[{id:eventId,titulo:'Prueba'}],personas:people,colaboradores:collaborators};
  const result=buildCanonicalAttendance(state,[eventId]);
  const row=result.porEvento[0];
  assert.equal(row.sociosAsistentesPersonas,21);
  assert.equal(row.noSociosAsistentesPersonas,2);
  assert.equal(row.totalAsistentesPersonas,23);
  assert.equal(row.sociosNoAsistentesPersonas,2);
  assert.ok(row.sociosNoAsistentes.some(x=>x.nombre==='Pocholo y Celes'));
  const compact=canonicalAttendanceFromContext({asistenciaCanonica:result})[0];
  assert.equal(compact.totalAsistentesPersonas,23);
}



function testFrontendCanonicalAttendance(){
  const code=fs.readFileSync(new URL('../public/app/features/v23-canonical-attendance.js',import.meta.url),'utf8');
  const sandbox={window:{}}; vm.createContext(sandbox); vm.runInContext(code,sandbox);
  const eventId='E1',personas=[],colaboradores=[];
  const add=(id,nombre,rango='SOCIO')=>personas.push({id,nombre,rango});
  const income=(personaId,numero,situacion='BANCO')=>colaboradores.push({eventId,personaId,numero,situacion});
  for(let i=1;i<=9;i++){add(`P${i}`,`Socio${i}A y Socio${i}B`);income(`P${i}`,2);}
  for(let i=1;i<=3;i++){add(`S${i}`,`Individual ${i}`);income(`S${i}`,1);}
  add('PEND','Pocholo y Celes');income('PEND',0,'PENDIENTE');
  add('N1','Invitado Uno','NO SOCIO');income('N1',1);
  add('N2','Invitado Dos','NO SOCIO');income('N2',1);
  const row=sandbox.window.ControlEventCanonicalAttendance.calculate({personas,colaboradores},eventId);
  assert.equal(row.totalAs,21);assert.equal(row.totalNoSocios,2);assert.equal(row.totalAsistentes,23);assert.equal(row.totalNo,2);
}

function structuralContext(){
  return {
    promptUsuario:'',
    eventosObjetivo:[{'Titulo del evento':'Evento Prueba','fecha ini':'2026-07-24','fecha fin':'2026-07-26',Estado:'En curso','Descripción':'Aperitivo, comida y actividades de convivencia.'}],
    modulosExtraidos:{
      EVENTOS:[{'Titulo del evento':'Evento Prueba','fecha ini':'2026-07-24','fecha fin':'2026-07-26',Estado:'En curso','Descripción':'Aperitivo, comida y actividades de convivencia.'}],
      INGRESOS:[{Evento:'Evento Prueba',Nombre:'Pareja Uno',Rango:'SOCIO',Numero:2,'Importe obligatorio':200,'Importe voluntario':0,Ingreso:'BANCO','Just.ing.':'SI'},{Evento:'Evento Prueba',Nombre:'Invitado',Rango:'NO SOCIO',Numero:1,'Importe obligatorio':100,'Importe voluntario':0,Ingreso:'EFECTIVO','Just.ing.':'SI'}],
      COMPRAS:[{Evento:'Evento Prueba',Producto:'Pan',Segmento:'COMIDA',Destino:'CENA',Unidades:10,Importe:20,'Ticket u otros gastos':'TK01',Tienda:'Tienda A',Responsable:'Responsable A'}],
      DONACIONES:[{Evento:'Evento Prueba',Producto:'Agua',Unidades:12,Valor:18,Donante:'Donante A','Tipo de donación':'DONADO SOCIO',Responsable:'Responsable B'}],
      TICKETS:[{Evento:'Evento Prueba',TKxx:'TK01',Tienda:'Tienda A',Responsable:'Responsable A','Total ticket':20,'Nº líneas':1,'Ticket SI/NO':'SI'}],
      DOCUMENTOS:[{Evento:'Evento Prueba',DOCxxx:'DOC01',Fecha:'2026-07-20',Descripcion:'Autorización municipal','Tiene imagen':'SI'}],
      PRODUCTOS:[],TIENDAS:[],PERSONAS:[]
    },
    metricasCanonicas:{porEvento:[{Evento:'Evento Prueba',Estado:'En curso','Ingresos total':300,'Compras realizadas':20,'Compras pendientes':0,'Donaciones valor':18,'Tickets numero':1,'Documentos numero':1}]},
    asistenciaCanonica:{regla:'fuente única',porEvento:[{Evento:'Evento Prueba',eventId:'E1',registrosIngreso:2,sociosCensoPersonas:3,sociosAsistentesPersonas:2,noSociosAsistentesPersonas:1,totalAsistentesPersonas:3,sociosNoAsistentesPersonas:1,sociosAsistentes:[{nombre:'Pareja Uno',personas:2}],noSociosAsistentes:[{nombre:'Invitado',personas:1}],sociosNoAsistentes:[{nombre:'Ausente',personas:1}]}]},
    infoIndirecta:{meteorologia:{ok:true,localidad:'Villanueva de Bogas, Toledo',filas:[
      {Evento:'Evento Prueba',Día:'Viernes',Fecha:'2026-07-24',Cielo:'Despejado','Temp. máx':35,'Temp. mín':20,'Prob. lluvia %':0,'Viento km/h':10,Localidad:'Villanueva de Bogas, Toledo'},
      {Evento:'Evento Prueba',Día:'Sábado',Fecha:'2026-07-25',Cielo:'Poco nuboso','Temp. máx':32,'Temp. mín':18,'Prob. lluvia %':0,'Viento km/h':9,Localidad:'Villanueva de Bogas, Toledo'},
      {Evento:'Evento Prueba',Día:'Domingo',Fecha:'2026-07-26',Cielo:'Despejado','Temp. máx':31,'Temp. mín':17,'Prob. lluvia %':0,'Viento km/h':8,Localidad:'Villanueva de Bogas, Toledo'}
    ]}}
  };
}

function testStructuralReports(){
  const ctx=structuralContext();
  const detailed=__zuzuStructuralTesting.buildLocalEventReport('Dame detalles de todo tipo de este evento y el tiempo del viernes al domingo',ctx);
  assert.ok(detailed);
  const titles=detailed.tables.map(t=>t.title);
  ['Ficha y descripción','Resumen financiero','Participación y documentación','Ingresos por tipo','Compras por clasificación','Tickets y facturas','Donaciones resumidas','Documentos'].forEach(title=>assert.ok(titles.includes(title),`Falta tabla estructural ${title}`));
  detailed.tables.forEach(t=>assert.equal(t.columns.includes('Evento'),false,'En evento único no debe repetirse la columna Evento'));
  assert.equal(detailed.charts.length,0,'Sin petición gráfica no deben añadirse gráficas redundantes');
  assert.equal(detailed.title,'Informe operativo');

  const executive=__zuzuStructuralTesting.buildLocalEventReport('Dame un informe ejecutivo de 1 pag con semáforos y el tiempo',ctx);
  assert.ok(executive.compactOnePage);
  assert.equal(executive.tables.length,1);
  assert.equal(executive.charts.length,0);
  assert.equal(executive.title,'Informe ejecutivo');
  const areas=executive.tables[0].rows.map(r=>r[0]);
  ['Cobros','Compras','Donaciones','Saldo previsto','Asistencia','Tickets y documentos','Meteorología · Viernes','Meteorología · Sábado','Meteorología · Domingo'].forEach(area=>assert.ok(areas.includes(area),`Falta ${area} en una página`));
  const executiveFinal=__zuzuStructuralTesting.finalizeResult(executive,ctx,'Dame un informe ejecutivo de 1 pag con semáforos y el tiempo',[]);
  assert.equal(executiveFinal.tables.length,1,'Una página no debe añadir una segunda tabla meteorológica');
  assert.equal(executiveFinal.title,'Informe ejecutivo');

  const detailedWithModelText={...detailed,title:'Informe del Evento Evento Prueba',answer:'Evento Prueba está en curso. La asistencia es de 3 personas. Las compras, donaciones, tickets y documentos están resumidos.'};
  const detailedFinal=__zuzuStructuralTesting.finalizeResult(detailedWithModelText,ctx,'Dame detalles de todo tipo de este evento',[]);
  assert.equal(detailedFinal.title,'Informe operativo');
  assert.equal((detailedFinal.answer.match(/Evento Prueba/g)||[]).length,1);
  assert.equal((detailedFinal.answer.match(/asistencia es de 3 personas/gi)||[]).length,0,'La asistencia no se repite en narrativa cuando ya está estructurada');

  const tidy=__zuzuStructuralTesting.finalizeNarrativeText('Evento Prueba va bien. Evento Prueba tiene datos. Pareja Uno viene. Pareja Uno participa.',ctx,'Dame un informe');
  assert.equal((tidy.match(/Evento Prueba/g)||[]).length,1);
  assert.equal((tidy.match(/Pareja Uno/g)||[]).length,1);
}

function testPrivatePeopleContext(){
  assert.ok(peopleProfileCount()>=30);
  const generic=buildRelevantPeopleContext('Dame un informe operativo completo',{});
  assert.equal(generic,null,'Un informe general no debe volcar perfiles privados');
  const context={asistenciaCanonica:{porEvento:[{sociosAsistentes:[{nombre:'Pablo y Gema'}],noSociosAsistentes:[],sociosNoAsistentes:[]}]}};
  const food=buildRelevantPeopleContext('Planifica la paella y la comida del evento',context);
  assert.ok(food);
  const gema=food.perfiles.find(p=>p.nombre==='Gema');
  assert.ok(gema?.alertasDeSeguridad?.some(a=>/marisco/i.test(a.regla)),'La alerta alimentaria de Gema debe prevalecer');
  assert.equal(gema.edad,undefined,'En planificación general no se expone la edad');
  const social=buildRelevantPeopleContext('Saluda uno por uno a los socios asistentes',context);
  assert.ok(social?.perfiles?.every(p=>p.edad===undefined),'Los saludos colectivos no exponen edades');
  assert.ok(social?.perfiles?.some(p=>Array.isArray(p.pistasSociales)&&p.pistasSociales.length),'Los saludos pueden usar pistas sociales seguras y mínimas');
  const direct=buildRelevantPeopleContext('¿Quién es Colty y cuál ha sido su trayectoria?',{});
  assert.ok(direct?.perfiles?.some(p=>p.nombre==='Colty'&&Array.isArray(p.trayectoria)));
}

testPolicy();
testAttendance();
testFrontendCanonicalAttendance();
testPrivatePeopleContext();
testStructuralReports();
console.log('OK v23_prod_r1: política de informes, asistencia 21+2=23 y contexto privado selectivo.');
