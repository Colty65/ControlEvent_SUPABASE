import fs from 'node:fs';

function text(v){ return v == null ? '' : String(v); }
function trim(v){ return text(v).trim(); }
function norm(v){ const s=text(v); return (s.normalize?s.normalize('NFD').replace(/[\u0300-\u036f]/g,''):s).toLowerCase().trim(); }
function normPhrase(v){ return norm(v).replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim(); }
function containsPhrase(haystack='',needle=''){ const h=normPhrase(haystack),n=normPhrase(needle); return !!(h&&n&&(` ${h} `).includes(` ${n} `)); }
function arr(v){ return Array.isArray(v)?v:[]; }
function esc(v){ return text(v).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }

let profile={version:'BANK4_19',event_series:[],person_aliases:[],spoken_replacements:[]};
try{ profile=JSON.parse(fs.readFileSync(new URL('../config/zuzu-human-language.json',import.meta.url),'utf8')); }catch(_){ }

const MONTHS='ENE|JAN|FEB|MAR|ABR|APR|MAY|JUN|JUL|AGO|AUG|SEP|OCT|NOV|DIC|DEC';
const ORDINAL_FEM={1:'primera',2:'segunda',3:'tercera',4:'cuarta',5:'quinta',6:'sexta',7:'séptima',8:'octava',9:'novena',10:'décima'};

function hash32(value=''){
  let h=2166136261>>>0;for(const c of text(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h>>>0;
}
function aliasText(v){ return trim(typeof v==='string'?v:v?.value); }
function aliasWeight(entry={},alias=''){ const w=Number(entry?.alias_weights?.[alias]);return Number.isFinite(w)&&w>0?w:1; }
function spokenReplacementEntries(){ return arr(profile?.spoken_replacements).flatMap(e=>arr(e?.canonical).map(c=>({canonical:trim(c),spoken:trim(e?.spoken)}))).filter(x=>x.canonical&&x.spoken).sort((a,b)=>b.canonical.length-a.canonical.length); }
export function applySpokenReplacements(value=''){let out=text(value),changes=[];for(const r of spokenReplacementEntries()){const before=out;out=replaceWholeName(out,r.canonical,r.spoken);if(out!==before)changes.push(`${r.canonical}→${r.spoken}`);}return{text:out,changes:[...new Set(changes)]};}
function currentYear(value=''){
  const m=text(value).match(/\b((?:19|20)\d{2})\b/);if(m)return Number(m[1]);
  const d=new Date(value||Date.now());return Number.isFinite(d.getTime())?d.getFullYear():new Date().getFullYear();
}
function romanToInt(raw=''){
  const s=trim(raw).toUpperCase();if(!/^[IVXLCDM]+$/.test(s))return null;
  const map={I:1,V:5,X:10,L:50,C:100,D:500,M:1000};let total=0,prev=0;
  for(let i=s.length-1;i>=0;i--){const n=map[s[i]]||0;if(n<prev)total-=n;else{total+=n;prev=n;}}
  return total>0&&total<4000?total:null;
}
function relativeYearPhrase(year,nowYear){
  if(!Number.isFinite(year))return'';if(year===nowYear)return'de este año';if(year===nowYear-1)return'del año pasado';if(year===nowYear+1)return'del año que viene';return`de ${year}`;
}
export function stripVisualEventDateSuffix(name=''){
  return trim(name)
    .replace(new RegExp(`\\s*(?:[-–—]\\s*)?(?:${MONTHS})\\s*[-/]?\\s*\\d{2,4}\\s*$`,'i'),'')
    .replace(/\s+/g,' ')
    .trim();
}
export function humanizeEventName(name='',opts={}){
  const original=trim(name);if(!original)return original;const nowYear=currentYear(opts?.currentDate);
  let out=stripVisualEventDateSuffix(original);
  out=applySpokenReplacements(out).text;
  // Acrónimos sociales configurables: la lógica no contiene nombres de eventos concretos.
  for(const series of arr(profile?.event_series)){
    const prefix=trim(series?.prefix),spoken=trim(series?.spoken);if(!prefix||!spoken)continue;
    const re=new RegExp(`^${esc(prefix)}(?:\\s+((?:19|20)\\d{2}))?$`,'i'),m=out.match(re);
    if(m){out=spoken;if(series?.relative_year&&m[1])out+=` ${relativeYearPhrase(Number(m[1]),nowYear)}`;return out;}
  }
  // Sufijo de año completo: el nombre visual conserva 2026; la voz dice «de este año» cuando procede.
  out=out.replace(/\s+((?:19|20)\d{2})\s*$/,(all,y)=>` ${relativeYearPhrase(Number(y),nowYear)}`);
  // Formas visuales habituales que oralmente suenan mecánicas.
  out=out.replace(/\b4ºs\s+Final\b/gi,'cuartos de final');
  out=out.replace(/\bvs\.?\b/gi,'contra');
  out=out.replace(/\(\s*by\s+([^)]*)\)/gi,(m,x)=>` de ${trim(x)}`);
  out=out.replace(/\(\s*([^)]*?)\s*\)/g,(m,x)=>trim(x)?`, ${trim(x)}`:'').replace(/\s+,/g,',').replace(/,\s*,+/g,', ').replace(/\s+/g,' ').trim();
  // Numeral romano al principio ante «Jornada»/«Visita»: ordinal humano. El resto, cardinal.
  out=out.replace(/^([IVXLCDM]+)\s+(Jornada|Visita)\b/i,(m,r,noun)=>{const n=romanToInt(r);return n&&ORDINAL_FEM[n]?`${ORDINAL_FEM[n]} ${noun}`:n?`${n} ${noun}`:m;});
  out=out.replace(/\b([IVXLCDM]{2,})\b/g,(m,r)=>{const n=romanToInt(r);return n?String(n):m;});
  return out.replace(/\s+/g,' ').trim();
}
function personRows(state={}){return arr(state?.personas).map(x=>({id:trim(x?.id),name:trim(x?.nombre)})).filter(x=>x.id&&x.name);}
function canonicalEntryMatchesName(entry={},name=''){
  const n=normPhrase(name);return arr(entry?.canonical).some(c=>{const q=normPhrase(c);return q&&(n===q||(` ${n} `).includes(` ${q} `));});
}
function chooseAlias(entry={},seed='',canonical=''){
  const aliases=arr(entry?.aliases).map(aliasText).filter(Boolean);if(!aliases.length)return'';const pct=Math.max(0,Math.min(100,Number(entry?.use_percent)||0)),h=hash32(`${seed}|${canonical}`);if((h%100)>=pct)return'';const total=aliases.reduce((n,a)=>n+aliasWeight(entry,a),0),pick=(Math.floor(h/100)%Math.max(1,total));let acc=0;for(const a of aliases){acc+=aliasWeight(entry,a);if(pick<acc)return a;}return aliases[0]||'';
}
function replaceWholeName(value='',needle='',replacement=''){
  if(!needle||!replacement)return value;return text(value).replace(new RegExp(`(^|[^\\p{L}\\p{N}])(${esc(needle)})(?=$|[^\\p{L}\\p{N}])`,'giu'),(m,p)=>`${p}${replacement}`);
}
export function humanizePersonNames(value='',state={},opts={}){
  let out=text(value);const changes=[],seed=trim(opts?.seed)||'zuzu';
  const rows=personRows(state).sort((a,b)=>b.name.length-a.name.length);
  for(const row of rows){if(/\s+y\s+/i.test(row.name))continue;const entry=arr(profile?.person_aliases).find(e=>canonicalEntryMatchesName(e,row.name));if(!entry)continue;const alias=chooseAlias(entry,seed,row.name);if(!alias)continue;const before=out;out=replaceWholeName(out,row.name,alias);if(out!==before)changes.push(`${row.name}→${alias}`);}
  // También permite nombres abreviados presentes literalmente en la redacción (p. ej. «Cordo») aunque el catálogo tenga una entidad compuesta.
  for(const entry of arr(profile?.person_aliases)){
    for(const c of arr(entry?.canonical).sort((a,b)=>text(b).length-text(a).length)){
      const alias=chooseAlias(entry,seed,c);if(!alias)continue;const before=out;out=replaceWholeName(out,c,alias);if(out!==before)changes.push(`${c}→${alias}`);
    }
  }
  return{text:out,changes:[...new Set(changes)]};
}
export function humanizeSpokenEntities(value='',state={},opts={}){
  let out=text(value),eventChanges=[];const events=arr(state?.eventos).map(e=>trim(e?.titulo||e?.nombre)).filter(Boolean).sort((a,b)=>b.length-a.length);
  for(const canonical of events){const core=stripVisualEventDateSuffix(canonical),spoken=humanizeEventName(canonical,opts),variants=[canonical,core].filter(Boolean).sort((a,b)=>b.length-a.length);for(const variant of variants){const before=out;out=replaceWholeName(out,variant,spoken);if(out!==before){eventChanges.push(`${variant}→${spoken}`);break;}}}
  const people=humanizePersonNames(out,state,opts);out=people.text;
  const staticForms=applySpokenReplacements(out);out=staticForms.text;
  return{text:out,eventChanges:[...new Set(eventChanges)],personChanges:people.changes,formChanges:staticForms.changes,changed:eventChanges.length>0||people.changes.length>0||staticForms.changes.length>0,profileVersion:trim(profile?.version)||'unknown'};
}

export function familiarAliasCanonicalCandidates(value=''){
  const n=normPhrase(value);if(!n)return[];
  const out=[];for(const entry of arr(profile?.person_aliases)){
    if(!arr(entry?.aliases).some(a=>normPhrase(aliasText(a))===n))continue;
    for(const c of arr(entry?.canonical).map(aliasText).filter(Boolean))if(!out.some(x=>normPhrase(x)===normPhrase(c)))out.push(c);
  }
  return out;
}
export function resolveFamiliarPersonAlias(state={},value=''){
  const raw=trim(value),n=normPhrase(raw);if(!raw)return{ok:false,ambiguous:false,value:raw,candidates:[]};
  const entries=arr(profile?.person_aliases).filter(e=>arr(e?.aliases).some(a=>normPhrase(aliasText(a))===n));if(!entries.length)return{ok:false,ambiguous:false,value:raw,candidates:[]};
  const rows=personRows(state),matches=[];
  for(const entry of entries){
    for(const row of rows){
      if(!canonicalEntryMatchesName(entry,row.name))continue;
      if(!matches.some(x=>x.id===row.id))matches.push({id:row.id,nombre:row.name,score:1,resolution:'familiar_alias',alias:raw});
    }
  }
  if(matches.length===1)return{ok:true,...matches[0],type:'person',candidates:matches};
  return{ok:false,ambiguous:matches.length>1,value:raw,type:'person',candidates:matches,canonical_candidates:familiarAliasCanonicalCandidates(raw)};
}
export function familiarPersonAliasCandidates(state={},prompt=''){
  const out=[],seen=new Set();
  for(const entry of arr(profile?.person_aliases))for(const alias of arr(entry?.aliases).map(aliasText).filter(Boolean)){
    if(!containsPhrase(prompt,alias))continue;
    const r=resolveFamiliarPersonAlias(state,alias);
    const candidates=r.ok?[r]:r.ambiguous?arr(r.candidates):[];
    for(const c of candidates){const key=`${c.id}|${normPhrase(alias)}`;if(seen.has(key))continue;seen.add(key);out.push({id:c.id,name:c.nombre,score:r.ok?1:0.99,matched:alias,match_kind:r.ok?'exact':'ambiguous_alias',resolution:r.ok?'familiar_alias':'familiar_alias_ambiguous'});}
  }
  return out;
}
export function humanLanguageProfile(){return JSON.parse(JSON.stringify(profile));}
