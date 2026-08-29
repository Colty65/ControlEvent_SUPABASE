const fs=require('fs');
const path=require('path');
const {pathToFileURL}=require('url');
const ROOT=process.cwd();
let ok=0,ko=0;
function check(cond,msg){if(cond){ok++;console.log('OK ',msg);}else{ko++;console.error('KO ',msg);}}
(async()=>{
  const mod=await import(pathToFileURL(path.join(ROOT,'services/zuzu-human-language.service.js')).href+'?x='+Date.now());
  const state={
    personas:[
      {id:'angeles',nombre:'Angeles',nombreAmigo:'la rubia',aliases:[]},
      {id:'gema',nombre:'Gema',nombreAmigo:'Gemita',aliases:[]},
      {id:'pocholo',nombre:'Pocholo',nombreAmigo:'Pocholo',aliases:['Manolo']},
      {id:'esther',nombre:'Esther',nombreAmigo:'La Estercita',aliases:[]},
      {id:'miguel',nombre:'Miguel Angel',nombreAmigo:'Veinticinco',aliases:[]},
      {id:'cordo',nombre:'Cordo',nombreAmigo:'Cordo',aliases:['Paco']},
      {id:'curvas',nombre:'Curvas',nombreAmigo:'Curvas',aliases:['Paco']}
    ],
    personAliases:[
      {personaId:'angeles',alias:'la rubia',prioridad:10,preferido:true,activo:true},
      {personaId:'gema',alias:'Gemita',prioridad:10,preferido:true,activo:true},
      {personaId:'pocholo',alias:'Pocholo',prioridad:10,preferido:true,activo:true},
      {personaId:'pocholo',alias:'Manolo',prioridad:40,preferido:false,activo:true},
      {personaId:'esther',alias:'La Estercita',prioridad:10,preferido:true,activo:true},
      {personaId:'miguel',alias:'Veinticinco',prioridad:10,preferido:true,activo:true},
      {personaId:'cordo',alias:'Paco',prioridad:50,preferido:false,activo:true},
      {personaId:'curvas',alias:'Paco',prioridad:50,preferido:false,activo:true}
    ]
  };
  for(const [alias,canon] of [['la rubia','Angeles'],['Gemita','Gema'],['Manolo','Pocholo'],['La Estercita','Esther'],['Veinticinco','Miguel Angel']]){
    const r=mod.resolveFamiliarPersonAlias(state,alias);check(r.ok&&r.nombre===canon,`BBDD ${alias} -> ${canon}`);
    const cs=mod.familiarPersonAliasCandidates(state,`Háblame de ${alias}`);check(cs.some(x=>x.name===canon),`candidato social ${alias}`);
  }
  const paco=mod.resolveFamiliarPersonAlias(state,'Paco');check(!paco.ok&&paco.ambiguous&&paco.candidates.length===2,'Paco sigue ambiguo entre dos PERSONAS');
  check(mod.humanLanguageProfile().version==='BANK4_20','perfil BANK4_20');

  const db=fs.readFileSync(path.join(ROOT,'lib/supabase-normalized.js'),'utf8');
  check(/ce_persona_aliases/.test(db)&&/nombre_amigo/.test(db),'backend carga y persiste identidad social');
  check(/replacePersonAliasesCrud/.test(db),'CRUD sincroniza aliases de persona');
  const sql=fs.readFileSync(path.join(ROOT,'sql/ControlEvent_SQL_BANK4_20_PERSONAS_SOCIALES.sql'),'utf8');
  check(/add column if not exists nombre_amigo/i.test(sql),'SQL añade nombre_amigo');
  check(/create table if not exists public\.ce_persona_aliases/i.test(sql),'SQL crea tabla de aliases');
  check(/Veinticinco/.test(sql)&&/la rubia/.test(sql)&&/La Estercita/.test(sql),'SQL siembra sobrenombres confirmados');

  const html=fs.readFileSync(path.join(ROOT,'public/index.html'),'utf8');
  check(/newPersonaNombreAmigo/.test(html)&&/newPersonaAliases/.test(html),'mantenimiento PERSONAS permite nombre amigo y otros motes');
  check(/BANK420-Z1H-VOICE-V53/.test(html),'cache bust BANK420 VOICE-V53');
  const crud=fs.readFileSync(path.join(ROOT,'public/app/features/v8-5-crud-root-fix28.js'),'utf8');
  check(/edit-persona-nombreamigo/.test(crud)&&/edit-persona-aliases/.test(crud),'CRUD raíz guarda campos sociales');

  const voice=fs.readFileSync(path.join(ROOT,'public/app/features/v22-voz3-zuzu.js'),'utf8');
  check(/BANK4_20-Z1H-VOICE-V53/.test(voice),'build VOICE-V53');
  check(/uuuummmmmmmmmm/.test(voice),'murmullo Ummm usa token fonético alargado');
  check(/0\.42/.test(voice),'murmullo Ummm tiene velocidad lenta propia');
  check(/part\.rate>0/.test(voice),'cada segmento de entretenimiento controla su velocidad');
  check((voice.match(/display:'/g)||[]).length>=20,'mazo conserva al menos 20 frases');
  check(/besitos muá/.test(voice),'frase Calla completa conservada');
  check(/entertainment_deck_v50/.test(voice),'mazo nuevo evita cache anterior');

  const exp=fs.readFileSync(path.join(ROOT,'routes/export.routes.js'),'utf8');
  check(/PERSONAS_ALIAS/.test(exp)&&/PERSONA_NOMBRE_AMIGO/.test(exp),'BACKUP exporta identidad social');
  const rest=fs.readFileSync(path.join(ROOT,'public/app/features/v26-prod-fix1-conciliacion-backup.js'),'utf8');
  check(/PERSONAS_ALIAS/.test(rest)&&/PERSONA_NOMBRE_AMIGO/.test(rest),'BACKUP restaura identidad social');

  console.log(`\nTOTAL ${ok} OK / ${ko} KO`);process.exitCode=ko?1:0;
})().catch(e=>{console.error(e);process.exit(1)});
