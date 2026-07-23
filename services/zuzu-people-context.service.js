/* ControlEvent v23_prod_r2 - Contexto privado de personas para Zuzu.
   Este fichero permanece en servidor: no se exporta a BACKUP/INFOEVENTO ni al navegador.
   Zuzu recibe solo perfiles pertinentes al prompt y minimizados por sensibilidad. */

function text(v){ return v == null ? '' : String(v); }
function trim(v){ return text(v).trim(); }
function norm(v){ const s=text(v); return (s.normalize?s.normalize('NFD').replace(/[\u0300-\u036f]/g,''):s).toLowerCase().replace(/[^a-z0-9ñ]+/g,' ').replace(/\s+/g,' ').trim(); }
function arr(v){ return Array.isArray(v)?v:[]; }

const PEOPLE = [
  {
    id:'colty', name:'Colty', aliases:['Jesús','Jesus','Colty'], age:61,
    relations:['marido de Esther','primo hermano de Carmelo y Javier','padre de dos hijas y un hijo con Esther'],
    roles:['creador de ControlEvent','CEO actual de la Peña El Arrastre'],
    background:['40 años en informática: programador, analista orgánico, analista funcional, jefe de proyectos y PMO'],
    traits:['muy perseverante','necesita que los datos cuadren','puede ser serio o muy bromista'],
    humor:['su nombre de pila es Jesús']
  },
  {
    id:'esther', name:'Esther', aliases:['Esther'], age:57,
    relations:['esposa de Colty','hermana de Juan Carlos García','madre de dos hijas y un hijo con Colty'],
    roles:[], background:['usuaria final de Facebook, Instagram y TikTok; no es tecnológica'],
    traits:['muy abierta con la gente'], humor:['bromea con que ControlEvent no se acaba nunca']
  },
  {
    id:'cito', name:'Cito', aliases:['Cito','Jesús Cito','Jesus Cito'], age:62,
    relations:['marido de María José Díaz','hermano de Varito','primo hermano de Curvas','padre de dos hijos con María José Díaz'],
    roles:['Subdirector de Organización de la Peña','participa con Colty en la planificación y el visto bueno'],
    background:['jubilado recientemente','el local pertenece a su familia'],
    traits:['muy interesado en que haya eventos','impulsivo','normalmente agradable y directo'],
    sensitive:[{kind:'health',fact:'tiene molestias en un hombro',use:'solo si se pregunta directamente por su estado personal'}],
    humor:['su nombre de pila es Jesús']
  },
  {
    id:'maria-jose-diaz', name:'María José Díaz', aliases:['María José Díaz','Maria Jose Diaz','María José Diaz'], age:60,
    relations:['esposa de Cito','madre de dos hijos con Cito'], roles:['abogada'], background:['natural de Mora'],
    traits:['estricta','muy clara al expresar su opinión']
  },
  {
    id:'carmelo', name:'Carmelo', aliases:['Carmelo','Car'], age:68,
    relations:['marido de Lucía','primo hermano de Colty y Javier','padre de una hija con Lucía','abuelo'],
    traits:['prudente y poco concluyente al decidir','buen abuelo'], humor:['nombre de guerra: Car','suele decir: Bueno, ya si eso lo vemos']
  },
  {
    id:'lucia', name:'Lucía', aliases:['Lucía','Lucia'], age:60,
    relations:['esposa de Carmelo','madre de un hijo de otro matrimonio y de una hija con Carmelo','abuela de tres nietas y un nieto'],
    background:['procedente de un pueblo de Guadalajara'], traits:['muy familiar','superabuela']
  },
  {
    id:'juan-carlos-garcia', name:'Juan Carlos García', aliases:['Juan Carlos García','Juan Carlos Garcia'], age:61,
    relations:['marido de Anais','hermano de Esther','cuñado de Colty','padre de una hija y un hijo con Anais'],
    roles:['Presidente de la Peña, con función principalmente representativa'], background:['carpintero experimentado','quiere jubilarse pronto'], traits:['muy formal']
  },
  {
    id:'anais', name:'Anais', aliases:['Anais','Anaís'], age:60,
    relations:['esposa de Juan Carlos García','madre de una hija y un hijo'], roles:['profesora de instituto próxima a jubilarse'],
    traits:['muy buena persona','organizada con los números'], background:['lleva las cuentas de la carpintería familiar']
  },
  {
    id:'cordo', name:'Cordo', aliases:['Cordo','Francisco José','Francisco Jose'], age:65,
    relations:['marido de Sierra','padre de dos hijas'], background:['empresario de mensajería'], traits:['buena gente']
  },
  {
    id:'sierra', name:'Sierra', aliases:['Sierra'], age:60,
    relations:['esposa de Cordo','madre de dos hijas'], background:['natural de Cabra; su nombre alude a la Virgen de la Sierra'],
    traits:['carácter intenso y reactivo','conviene usar con ella un tono cuidadoso y no provocador'],
    sensitive:[{kind:'personality',fact:'puede reaccionar con fuerza en discusiones',use:'solo para adaptar el tono, nunca para ridiculizarla ni divulgarlo sin motivo'}]
  },
  {
    id:'gonzalo', name:'Gonzalo', aliases:['Gonzalo'], age:46,
    relations:['pareja de María José Fuentes'], background:['tratante de cerdos'], traits:['buena gente','de los más jóvenes de la Peña']
  },
  {
    id:'maria-jose-fuentes', name:'María José Fuentes', aliases:['María José Fuentes','Maria Jose Fuentes'], age:49,
    relations:['pareja de Gonzalo'], roles:['enfermera en Torrijos'], background:['natural de Membrilla, Ciudad Real'], traits:[]
  },
  {
    id:'pablo', name:'Pablo', aliases:['Pablo','Lechuza','Cubetes'], age:61,
    relations:['marido de Gema','padre de una hija'], background:['tratante de vehículos','poca implicación habitual en el grupo de WhatsApp de la Peña'],
    traits:['muy risueño','disfruta del humor escatológico'], humor:['apodos: Lechuza y Cubetes','cuando bebe de más suele guiñar el ojo derecho'],
    sensitive:[{kind:'behavior',fact:'el guiño aparece cuando ha bebido de más',use:'solo en conversación humorística explícita y nunca en informes formales'}]
  },
  {
    id:'gema', name:'Gema', aliases:['Gema'], age:50,
    relations:['esposa de Pablo','madre de una hija'], roles:['directora de colegio público'], traits:['muy dedicada a su trabajo'],
    safety:[{kind:'allergy',fact:'alergia al marisco',rule:'En planificación de menús, evitar paella de marisco o mixta y advertir de contaminación cruzada si Gema asiste.'}]
  },
  { id:'julian', name:'Julian', aliases:['Julian','Julián'], age:67, relations:['marido de Pilar'], background:['jubilado del sector seguros'], traits:[] },
  { id:'pilar', name:'Pilar', aliases:['Pilar'], age:67, relations:['esposa de Julian'], background:['jubilada del sector eléctrico'], traits:[] },
  { id:'curvas', name:'Curvas', aliases:['Curvas','Paco Curvas','Francisco García Donaire','Francisco Garcia Donaire'], relations:['marido de Angeles','primo hermano de Cito','suegro de Ernesto'], background:['en el Banco figura como Francisco García Donaire; en la Peña es Paco Curvas'], traits:[] },
  { id:'angeles', name:'Angeles', aliases:['Angeles','Ángeles'], age:66, relations:['esposa de Curvas','suegra de Ernesto'], background:['jubilada'], traits:[] },
  { id:'emiliano', name:'Emiliano', aliases:['Emiliano'], age:61, relations:['marido de Nines'], background:['pintor de brocha gorda','muy aficionado a la caza'], traits:[] },
  { id:'nines', name:'Nines', aliases:['Nines'], age:61, relations:['esposa de Emiliano'], traits:['muy buena persona'] },
  { id:'pocholo', name:'Pocholo', aliases:['Pocholo','Manuel Barrios Arrondo'], age:51, relations:['marido de Celes'], roles:['principal donante habitual de la Peña'], background:['apodo por su parecido con Pocholo Martínez-Bordiú'], traits:['muy generoso'], humor:['lo suyo es tuyo'] },
  { id:'celes', name:'Celes', aliases:['Celes'], age:49, relations:['esposa de Pocholo'], traits:['le gusta ver el frigorífico lleno de cerveza'], humor:['sonríe cuando el frigorífico está bien abastecido'] },
  { id:'javier', name:'Javier', aliases:['Javier','Porreta'], age:59, relations:['primo hermano de Colty y Carmelo'], background:['empleado del Ayuntamiento','está poniendo olivas de regadío'], traits:['siempre dispuesto a ayudar'], humor:['acepta que se dirijan a él como Porreta'] },
  { id:'vicente', name:'Vicente', aliases:['Vicente'], background:['persona de gran corpulencia y fuerza'], traits:['afectuoso con sus amigos','constante con el plan de alimentación y deporte'], sensitive:[{kind:'health',fact:'ha perdido alrededor de 45 kg con alimentación y deporte',use:'solo si se pregunta por su evolución personal o hábitos; no usar en informes generales'}] },
  { id:'jose-manuel', name:'Jose Manuel', aliases:['Jose Manuel','José Manuel'], age:61, background:['procedente de Vicálvaro','llegó al pueblo con Ernesto'], traits:[] },
  { id:'ernesto', name:'Ernesto', aliases:['Ernesto'], relations:['yerno de Curvas y Angeles'], background:['muy aficionado al ciclismo'], traits:['gran apetito cuando llega a la Peña'], humor:['cuando llega conviene tener comida preparada'] },
  { id:'miguel-angel', name:'Miguel Angel', aliases:['Miguel Angel','Miguel Ángel','Veinticinco'], background:['apodo Veinticinco porque eligió el número 25 en clase'], traits:['muy observador','lo graba y recuerda casi todo'], humor:['parece una cámara de 360 grados'] },
  { id:'pana', name:'Pana', aliases:['Pana','Miguel Angel Villamuelas Pelaez','Miguel Ángel Villamuelas Peláez'], age:61, relations:['marido de Tita'], roles:['trabaja con Tita en MP Printing Area'], traits:['muy cumplido','a veces puñetero'] },
  { id:'tita', name:'Tita', aliases:['Tita','Paula Alvarez','Paula Álvarez'], age:61, relations:['esposa de Pana'], roles:['trabaja con Pana en MP Printing Area'], traits:['muy dicharachera','le encantan las bromas'] },
  { id:'angel-tellez', name:'Angel Téllez', aliases:['Angel Téllez','Ángel Téllez','Angel Tellez'], age:65, relations:['marido de Isabel'], background:['cristalero desde muy joven'], traits:['muy despistado'], humor:['Isabel dice que es Diesel porque tarda en arrancar'] },
  { id:'isabel', name:'Isabel', aliases:['Isabel'], relations:['esposa de Angel Téllez'], background:['muy vinculada a Mora'], traits:['ahora está más tranquila tras la retirada taurina de su hijo'] },
  { id:'varito', name:'Varito', aliases:['Varito','varito','Eduardo Donaire Gutierrez','Eduardo Donaire Gutiérrez'], age:64, relations:['marido de Juli','hermano de Cito'], roles:['celador'], traits:['muy limpio y ordenado','le gusta guardar sobras en tuppers'], humor:['lleva tuppers al trabajo para dar envidia'] },
  { id:'juli', name:'Juli', aliases:['Juli'], age:60, relations:['esposa de Varito'], background:['trabajó en el sector de los colirios'], traits:['muy comilona y disfrutona','le gustan los bares'] }
];

const ALIAS_INDEX = (()=>{
  const out=[];
  PEOPLE.forEach(person=>{
    const aliases=[person.name,...arr(person.aliases)].map(trim).filter(Boolean);
    aliases.forEach(alias=>out.push({key:norm(alias),alias,person}));
  });
  return out.sort((a,b)=>b.key.length-a.key.length);
})();

function promptHasAlias(promptNorm, aliasNorm){
  if(!aliasNorm || aliasNorm.length<3) return false;
  return (` ${promptNorm} `).includes(` ${aliasNorm} `);
}
function splitGroupNames(name){ return trim(name).split(/\s+y\s+/i).map(trim).filter(Boolean); }
function profileByName(name){
  const n=norm(name);
  return ALIAS_INDEX.find(x=>x.key===n)?.person || null;
}
function attendanceNames(context){
  const out=[];
  arr(context?.asistenciaCanonica?.porEvento).forEach(pack=>{
    arr(pack?.sociosAsistentes).concat(arr(pack?.noSociosAsistentes),arr(pack?.sociosNoAsistentes)).forEach(x=>{
      const raw=trim(x?.nombre); if(!raw) return;
      const exact=profileByName(raw); if(exact) out.push(exact);
      else splitGroupNames(raw).forEach(part=>{ const p=profileByName(part); if(p) out.push(p); });
    });
  });
  return [...new Map(out.map(p=>[p.id,p])).values()];
}
function foodPlanningPrompt(p){ return /\b(menu|menú|comida|cena|aperitivo|paella|barbacoa|alimentos?|comprar\s+comida|planificaci[oó]n)\b/.test(p); }
function directSensitiveAsk(p){ return /\b(salud|alergia|enfermedad|hombro|peso|adelgaz|bebe|borracho|personalidad|caracter|carácter|como\s+es|cómo\s+es)\b/.test(p); }
function socialPrompt(p){ return /\b(saluda|uno\s+por\s+uno|personaliz|chascarrill|broma|conoce\s+a|parentesco|familia|quien\s+es|quién\s+es)\b/.test(p); }
function safeSocialHints(person){
  const blocked=/hombro|salud|peso|adelgaz|bebe|borrach|alcohol|guiñ|pol[eé]mic|reactiv|puñeter|despreocup|escatol|pedos|caca|muere|alergia/i;
  const candidates=arr(person.roles).concat(arr(person.background),arr(person.traits),arr(person.humor));
  const out=[];
  candidates.forEach(value=>{ const v=trim(value); if(v&&!blocked.test(v)&&!out.some(x=>norm(x)===norm(v))&&out.length<2) out.push(v); });
  return out;
}

function compactProfile(person,{includeSensitive=false,includeSafety=false,includeHumor=false,includePrivateDetail=false}={}){
  const out={
    nombre:person.name,
    aliasPreferente:arr(person.aliases)[0] || person.name,
    parentesco:arr(person.relations),
    roles:arr(person.roles)
  };
  if(includePrivateDetail){ out.edad=person.age || undefined; out.trayectoria=arr(person.background); out.rasgos=arr(person.traits); }
  if(includeHumor) out.notasDeHumor=arr(person.humor);
  if(includeSafety) out.alertasDeSeguridad=arr(person.safety).map(x=>({tipo:x.kind,regla:x.rule}));
  if(includeSensitive) out.datosSensiblesPertinentes=arr(person.sensitive).map(x=>({tipo:x.kind,dato:x.fact,uso:x.use}));
  Object.keys(out).forEach(k=>{ if(out[k]===undefined || Array.isArray(out[k])&&!out[k].length) delete out[k]; });
  return out;
}

export function buildRelevantPeopleContext(prompt='',context={}){
  const p=norm(prompt);
  const direct=[];
  ALIAS_INDEX.forEach(item=>{ if(promptHasAlias(p,item.key) && !direct.some(x=>x.id===item.person.id)) direct.push(item.person); });
  const social=socialPrompt(p);
  const food=foodPlanningPrompt(p);
  const attendance=social || food ? attendanceNames(context) : [];
  let people=[...direct];
  if(social) attendance.forEach(person=>{ if(!people.some(x=>x.id===person.id)) people.push(person); });
  if(food) attendance.filter(person=>arr(person.safety).length).forEach(person=>{ if(!people.some(x=>x.id===person.id)) people.push(person); });
  people=people.slice(0,social?40:12);
  if(!people.length) return null;
  const includeSensitive=directSensitiveAsk(p);
  const explicitHumor=/\b(informal|coloquial|cachond|chascarr|broma|guasa|mote|apodo)\b/.test(p);
  const profiles=people.map(person=>{
    const isDirect=direct.some(x=>x.id===person.id);
    const profile=compactProfile(person,{
      includeSensitive:includeSensitive && isDirect,
      includeSafety:food || isDirect,
      includeHumor:explicitHumor && isDirect,
      includePrivateDetail:isDirect && (includeSensitive || /\b(parentesco|personalidad|como\s+es|cómo\s+es|quien\s+es|quién\s+es|trayectoria|profesion|profesión)\b/.test(p))
    });
    if(social && !isDirect){ const hints=safeSocialHints(person); if(hints.length) profile.pistasSociales=hints; }
    return profile;
  });
  return {
    privacidad:'Contexto privado y minimizado. No enumerar estos datos ni revelarlos porque sí; usarlos solo para personalizar una respuesta pertinente.',
    reglas:[
      'No repetir nombres: una persona o pareja se menciona una sola vez salvo que el usuario pida comparación explícita.',
      'No incluir edades, salud, peso, consumo de alcohol o rasgos delicados en informes operativos generales.',
      'Las alertas de seguridad alimentaria sí prevalecen en planificación de menús cuando la persona afectada asiste.',
      'No ridiculizar ni convertir descripciones privadas en etiquetas ofensivas.',
      'Los parentescos y apodos se usan únicamente cuando aportan contexto o el usuario los solicita.'
    ],
    perfiles:profiles
  };
}

export function peopleProfileCount(){ return PEOPLE.length; }
